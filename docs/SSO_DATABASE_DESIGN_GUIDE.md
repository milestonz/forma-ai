# Supabase SSO 데이터베이스 설계 가이드

## 개요

이 문서는 Milestonz의 중앙 인증 시스템(SSO)과 연동하는 신규 프로젝트를 위한 데이터베이스 설계 가이드입니다. 모든 신규 프로젝트는 이 가이드를 참고하여 SSO 호환 가능한 스키마를 설계해야 합니다.

---

## 핵심 원칙

1. **단일 Supabase 프로젝트**: 모든 서비스는 동일한 Supabase 프로젝트를 인증 허브로 사용
2. **사용자 출처 추적**: 사용자가 어느 서비스에서 최초 가입했는지 기록
3. **서비스 간 이동 추적**: 사용자가 어떤 서비스들을 사용하고 있는지 파악
4. **서비스별 데이터 격리**: 각 서비스의 비즈니스 데이터는 독립적으로 관리

---

## 중앙 SSO 스키마 (공통)

### ERD (Entity Relationship Diagram)

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   auth.users    │     │   public.profiles   │     │ public.services │
│   (Supabase)    │     │                     │     │                 │
├─────────────────┤     ├─────────────────────┤     ├─────────────────┤
│ id (PK)         │◄───┤│ id (PK, FK)         │     │ id (PK)         │
│ email           │     │ email               │     │ slug (UNIQUE)   │
│ created_at      │     │ full_name           │     │ display_name    │
│ raw_user_meta   │     │ avatar_url          │     │ domain          │
└─────────────────┘     │ origin_service (FK)─┼────►│ description     │
                        │ created_at          │     │ logo_url        │
                        │ updated_at          │     │ is_active       │
                        └─────────────────────┘     └─────────────────┘
                                                            │
                                                            │
                        ┌─────────────────────┐             │
                        │ public.user_services│             │
                        ├─────────────────────┤             │
                        │ id (PK)             │             │
                        │ user_id (FK)────────┼─► auth.users│
                        │ service_slug (FK)───┼─────────────┘
                        │ is_origin           │
                        │ first_access_at     │
                        │ last_access_at      │
                        │ access_count        │
                        │ metadata (JSONB)    │
                        └─────────────────────┘
```

### 1. `public.services` - 서비스 등록 테이블

등록된 모든 서비스/프로젝트 목록을 관리합니다.

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `id` | UUID | Primary Key | auto-generated |
| `slug` | TEXT | 고유 식별자 (UNIQUE) | `'forma-ai'`, `'coaching-app'` |
| `display_name` | TEXT | 사용자에게 표시되는 이름 | `'Forma.ai'`, `'코칭 앱'` |
| `domain` | TEXT | 서비스 도메인 | `'forma.ai'`, `'coach.milestonz.com'` |
| `description` | TEXT | 서비스 설명 | `'마크다운을 슬라이드로 변환'` |
| `logo_url` | TEXT | 로고 이미지 URL | `'https://...'` |
| `is_active` | BOOLEAN | 활성화 여부 | `true` |
| `created_at` | TIMESTAMPTZ | 생성 시각 | auto |
| `updated_at` | TIMESTAMPTZ | 수정 시각 | auto |

**신규 서비스 등록 예시:**
```sql
INSERT INTO public.services (slug, display_name, domain, description)
VALUES ('my-new-app', 'My New App', 'newapp.milestonz.com', '새로운 서비스 설명');
```

---

### 2. `public.profiles` - 사용자 프로필 확장 테이블

Supabase `auth.users` 테이블을 확장하여 추가 정보를 저장합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | auth.users.id 참조 (PK, FK) |
| `email` | TEXT | 이메일 |
| `full_name` | TEXT | 사용자 이름 |
| `avatar_url` | TEXT | 프로필 이미지 URL |
| `origin_service` | TEXT | **최초 가입 서비스** (services.slug FK) |
| `created_at` | TIMESTAMPTZ | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | 수정 시각 |

**중요**: `origin_service`는 사용자가 **처음 가입한 서비스**를 나타냅니다. 한 번 설정되면 변경되지 않습니다.

---

### 3. `public.user_services` - 서비스 이용 기록 테이블

사용자별로 어떤 서비스들을 이용했는지 추적합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | auth.users.id 참조 (FK) |
| `service_slug` | TEXT | services.slug 참조 (FK) |
| `is_origin` | BOOLEAN | 이 서비스에서 최초 가입했는지 |
| `first_access_at` | TIMESTAMPTZ | 첫 접속 시각 |
| `last_access_at` | TIMESTAMPTZ | 마지막 접속 시각 |
| `access_count` | INTEGER | 총 접속 횟수 |
| `metadata` | JSONB | 서비스별 추가 데이터 (역할, 권한 등) |
| `created_at` | TIMESTAMPTZ | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | 수정 시각 |

**UNIQUE 제약조건**: `(user_id, service_slug)` - 사용자당 서비스별 하나의 레코드만 존재

---

## 신규 프로젝트 설계 가이드

### Step 1: 서비스 등록

프로젝트 시작 시 `services` 테이블에 서비스를 등록합니다.

```sql
INSERT INTO public.services (slug, display_name, domain, description)
VALUES (
  'your-service-slug',    -- 고유한 slug (영문, 소문자, 하이픈만 사용)
  'Your Service Name',    -- 사용자에게 표시될 이름
  'your-service.com',     -- 도메인
  'Service description'   -- 설명
);
```

### Step 2: 환경변수 설정

```bash
# .env
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # 서버용
SERVICE_SLUG=your-service-slug  # Step 1에서 등록한 slug
```

### Step 3: 서비스 접근 기록

로그인/회원가입 시 `track_service_access` 함수를 호출합니다.

```javascript
// 클라이언트에서 로그인 후
const { data, error } = await supabase.rpc('track_service_access', {
  p_service_slug: 'your-service-slug',
  p_metadata: { role: 'user' }  // 선택적 메타데이터
});
```

### Step 4: 서비스별 비즈니스 테이블 설계

각 서비스의 비즈니스 데이터는 **별도 테이블**로 관리합니다.

```sql
-- 예시: 코칭 앱의 세션 테이블
CREATE TABLE public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책 (사용자는 자신의 세션만 접근)
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.coaching_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = coach_id);
```

---

## 제공되는 함수 (RPC)

### 1. `track_service_access(p_service_slug, p_metadata)`

서비스 접근을 기록합니다. 최초 접근 시 자동으로 `is_origin = true` 설정.

```javascript
await supabase.rpc('track_service_access', {
  p_service_slug: 'my-service',
  p_metadata: { source: 'mobile_app' }
});
```

### 2. `get_user_services()`

현재 사용자의 모든 서비스 이용 기록을 조회합니다.

```javascript
const { data } = await supabase.rpc('get_user_services');
// Returns: [{ service_slug, display_name, is_origin, first_access_at, ... }]
```

### 3. `get_service_stats(p_service_slug)`

서비스의 사용자 통계를 조회합니다 (관리자용).

```javascript
const { data } = await supabase.rpc('get_service_stats', {
  p_service_slug: 'my-service'
});
// Returns: { total_users, users_registered_here, active_last_7_days, active_last_30_days }
```

---

## Row Level Security (RLS) 정책

### 기본 정책

| 테이블 | 정책 |
|--------|------|
| `services` | 인증된 사용자 전체 읽기 가능 |
| `profiles` | 본인 프로필만 읽기/수정 가능 |
| `user_services` | 본인 기록만 읽기/수정 가능 |

### 서비스별 테이블 RLS 권장 패턴

```sql
-- 1. 사용자 본인 데이터만 접근
CREATE POLICY "user_own_data" ON your_table
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- 2. 서비스 관리자 접근 (metadata에 role 저장한 경우)
CREATE POLICY "service_admin" ON your_table
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_services
      WHERE user_id = auth.uid()
        AND service_slug = 'your-service'
        AND metadata->>'role' = 'admin'
    )
  );
```

---

## 자주 사용하는 쿼리

### 특정 서비스에서 가입한 사용자 목록

```sql
SELECT p.email, p.full_name, p.created_at
FROM public.profiles p
WHERE p.origin_service = 'your-service'
ORDER BY p.created_at DESC;
```

### 사용자가 이용 중인 모든 서비스

```sql
SELECT s.display_name, us.first_access_at, us.last_access_at, us.access_count
FROM public.user_services us
JOIN public.services s ON us.service_slug = s.slug
WHERE us.user_id = 'user-uuid-here';
```

### 서비스 간 사용자 이동 분석

```sql
-- A 서비스에서 가입 후 B 서비스도 이용하는 사용자
SELECT COUNT(DISTINCT us_b.user_id)
FROM public.user_services us_a
JOIN public.user_services us_b ON us_a.user_id = us_b.user_id
WHERE us_a.service_slug = 'service-a' AND us_a.is_origin = TRUE
  AND us_b.service_slug = 'service-b';
```

---

## 체크리스트

신규 프로젝트 시작 시 확인사항:

- [ ] `services` 테이블에 서비스 등록 완료
- [ ] 환경변수에 `SERVICE_SLUG` 설정
- [ ] 로그인/회원가입 시 `track_service_access` 호출 구현
- [ ] 서비스별 비즈니스 테이블에 RLS 정책 적용
- [ ] `user_id`는 항상 `auth.users(id)` 참조

---

## 연락처

SSO 관련 문의: [담당자 이메일]

문서 최종 수정일: 2025-12-07
