-- SSO Multi-Service Tracking Tables
-- Run this migration in your Supabase SQL Editor

-- ============================================
-- 1. Services Table - 등록된 서비스/프로젝트 목록
-- ============================================
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,              -- 고유 식별자: 'forma-ai', 'my-other-app'
  display_name TEXT NOT NULL,             -- 표시 이름: 'Forma.ai', 'My Other App'
  domain TEXT,                            -- 도메인: 'forma.ai', 'otherapp.com'
  description TEXT,                       -- 서비스 설명
  logo_url TEXT,                          -- 서비스 로고 URL
  is_active BOOLEAN DEFAULT TRUE,         -- 서비스 활성화 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 서비스 등록 (예시)
INSERT INTO public.services (slug, display_name, domain, description) VALUES
  ('forma-ai', 'Forma.ai', 'forma.ai', 'Markdown to Google Slides converter'),
  ('auth-hub', 'Auth Hub', 'auth.milestonz.com', 'Central authentication service')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. User Services Table - 사용자별 서비스 이용 기록
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_slug TEXT NOT NULL REFERENCES public.services(slug) ON DELETE CASCADE,
  is_origin BOOLEAN DEFAULT FALSE,        -- 이 서비스에서 최초 가입했는지
  first_access_at TIMESTAMPTZ DEFAULT NOW(),
  last_access_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,         -- 접속 횟수
  metadata JSONB DEFAULT '{}',            -- 추가 메타데이터 (역할, 권한 등)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_slug)
);

-- ============================================
-- 3. User Profiles Extension - 사용자 프로필 확장
-- ============================================
-- auth.users 테이블에 추가 정보를 저장하기 위한 profiles 테이블
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  origin_service TEXT REFERENCES public.services(slug),  -- 최초 가입 서비스
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_services_user_id ON public.user_services(user_id);
CREATE INDEX IF NOT EXISTS idx_user_services_service_slug ON public.user_services(service_slug);
CREATE INDEX IF NOT EXISTS idx_user_services_is_origin ON public.user_services(is_origin) WHERE is_origin = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_origin_service ON public.profiles(origin_service);

-- ============================================
-- 5. Row Level Security (RLS)
-- ============================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Services: 모든 인증된 사용자가 읽을 수 있음
CREATE POLICY "Services are viewable by authenticated users" ON public.services
  FOR SELECT TO authenticated USING (TRUE);

-- User Services: 사용자는 자신의 기록만 읽을 수 있음
CREATE POLICY "Users can view own service history" ON public.user_services
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own service access" ON public.user_services
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own service access" ON public.user_services
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Profiles: 사용자는 자신의 프로필만 읽고 수정할 수 있음
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================
-- 6. Functions
-- ============================================

-- 서비스 접근 기록 함수 (upsert)
CREATE OR REPLACE FUNCTION public.track_service_access(
  p_service_slug TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS public.user_services
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result public.user_services;
  v_is_new_user BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if this is the user's first service access ever
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_services WHERE user_id = v_user_id
  ) INTO v_is_new_user;

  -- Upsert user_services record
  INSERT INTO public.user_services (user_id, service_slug, is_origin, metadata)
  VALUES (v_user_id, p_service_slug, v_is_new_user, p_metadata)
  ON CONFLICT (user_id, service_slug) DO UPDATE SET
    last_access_at = NOW(),
    access_count = public.user_services.access_count + 1,
    metadata = COALESCE(public.user_services.metadata, '{}') || p_metadata,
    updated_at = NOW()
  RETURNING * INTO v_result;

  -- Update profile's origin_service if this is the first service
  IF v_is_new_user THEN
    INSERT INTO public.profiles (id, origin_service)
    VALUES (v_user_id, p_service_slug)
    ON CONFLICT (id) DO UPDATE SET
      origin_service = COALESCE(public.profiles.origin_service, p_service_slug),
      updated_at = NOW();
  END IF;

  RETURN v_result;
END;
$$;

-- 사용자의 모든 서비스 이용 정보 조회
CREATE OR REPLACE FUNCTION public.get_user_services()
RETURNS TABLE (
  service_slug TEXT,
  display_name TEXT,
  domain TEXT,
  is_origin BOOLEAN,
  first_access_at TIMESTAMPTZ,
  last_access_at TIMESTAMPTZ,
  access_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.service_slug,
    s.display_name,
    s.domain,
    us.is_origin,
    us.first_access_at,
    us.last_access_at,
    us.access_count
  FROM public.user_services us
  JOIN public.services s ON us.service_slug = s.slug
  WHERE us.user_id = auth.uid()
  ORDER BY us.first_access_at;
END;
$$;

-- 특정 서비스의 사용자 통계 (관리자용)
CREATE OR REPLACE FUNCTION public.get_service_stats(p_service_slug TEXT)
RETURNS TABLE (
  total_users BIGINT,
  users_registered_here BIGINT,
  active_last_7_days BIGINT,
  active_last_30_days BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT user_id)::BIGINT as total_users,
    COUNT(DISTINCT user_id) FILTER (WHERE is_origin = TRUE)::BIGINT as users_registered_here,
    COUNT(DISTINCT user_id) FILTER (WHERE last_access_at > NOW() - INTERVAL '7 days')::BIGINT as active_last_7_days,
    COUNT(DISTINCT user_id) FILTER (WHERE last_access_at > NOW() - INTERVAL '30 days')::BIGINT as active_last_30_days
  FROM public.user_services
  WHERE service_slug = p_service_slug;
END;
$$;

-- ============================================
-- 7. Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_services_updated ON public.services;
CREATE TRIGGER on_services_updated
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_user_services_updated ON public.user_services;
CREATE TRIGGER on_user_services_updated
  BEFORE UPDATE ON public.user_services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 8. Handle new user signup - Auto create profile
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
