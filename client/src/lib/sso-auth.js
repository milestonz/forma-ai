import { supabase, isSupabaseConfigured } from './supabase'

// Service ID for this application (set in environment variable)
const SERVICE_SLUG = import.meta.env.VITE_SERVICE_SLUG || 'forma-ai'

/**
 * SSO Authentication Utilities
 * Handles authentication across multiple services using Supabase as the auth hub
 */

/**
 * Sign up a new user with service origin tracking
 * @param {string} email
 * @param {string} password
 * @param {object} metadata - Additional user metadata
 * @returns {Promise<{data, error}>}
 */
export async function signUp(email, password, metadata = {}) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        ...metadata,
        registered_from: SERVICE_SLUG
      }
    }
  })

  if (data?.user && !error) {
    // Track this service as the origin
    await trackServiceAccess({ is_signup: true })
  }

  return { data, error }
}

/**
 * Sign in an existing user and track service access
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{data, error}>}
 */
export async function signIn(email, password) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (data?.user && !error) {
    // Track service access
    await trackServiceAccess()
  }

  return { data, error }
}

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 * @param {string} provider - 'google', 'github', 'azure', etc.
 * @param {object} options - Additional options
 * @returns {Promise<{data, error}>}
 */
export async function signInWithOAuth(provider, options = {}) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      ...options
    }
  })

  return { data, error }
}

/**
 * Sign out the current user
 * @returns {Promise<{error}>}
 */
export async function signOut() {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') }
  }

  return await supabase.auth.signOut()
}

/**
 * Get the current user session
 * @returns {Promise<{data: {session}, error}>}
 */
export async function getSession() {
  if (!isSupabaseConfigured()) {
    return { data: { session: null }, error: null }
  }

  return await supabase.auth.getSession()
}

/**
 * Get the current user
 * @returns {Promise<{data: {user}, error}>}
 */
export async function getUser() {
  if (!isSupabaseConfigured()) {
    return { data: { user: null }, error: null }
  }

  return await supabase.auth.getUser()
}

/**
 * Track user's access to this service
 * Called automatically on sign in/sign up
 * @param {object} metadata - Additional metadata to store
 * @returns {Promise<{data, error}>}
 */
export async function trackServiceAccess(metadata = {}) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: null }
  }

  try {
    const { data, error } = await supabase.rpc('track_service_access', {
      p_service_slug: SERVICE_SLUG,
      p_metadata: {
        ...metadata,
        user_agent: navigator.userAgent,
        accessed_at: new Date().toISOString()
      }
    })

    if (error) {
      console.error('Failed to track service access:', error)
    }

    return { data, error }
  } catch (err) {
    console.error('Error tracking service access:', err)
    return { data: null, error: err }
  }
}

/**
 * Get all services the current user has accessed
 * @returns {Promise<{data: Array, error}>}
 */
export async function getUserServices() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null }
  }

  try {
    const { data, error } = await supabase.rpc('get_user_services')
    return { data: data || [], error }
  } catch (err) {
    console.error('Error getting user services:', err)
    return { data: [], error: err }
  }
}

/**
 * Get the user's origin service (where they first signed up)
 * @returns {Promise<{data: {service_slug, display_name}, error}>}
 */
export async function getUserOriginService() {
  if (!isSupabaseConfigured()) {
    return { data: null, error: null }
  }

  try {
    const { data: services, error } = await supabase.rpc('get_user_services')

    if (error) {
      return { data: null, error }
    }

    const originService = services?.find(s => s.is_origin)
    return { data: originService || null, error: null }
  } catch (err) {
    console.error('Error getting origin service:', err)
    return { data: null, error: err }
  }
}

/**
 * Listen for auth state changes
 * @param {function} callback - Called with (event, session) on auth changes
 * @returns {function} - Unsubscribe function
 */
export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured()) {
    return () => {}
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    // Track service access on sign in
    if (event === 'SIGNED_IN' && session?.user) {
      await trackServiceAccess()
    }

    callback(event, session)
  })

  return () => subscription.unsubscribe()
}

/**
 * Get user's profile including origin service info
 * @returns {Promise<{data, error}>}
 */
export async function getUserProfile() {
  if (!isSupabaseConfigured()) {
    return { data: null, error: null }
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: null, error: userError }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      *,
      origin_service_info:services!profiles_origin_service_fkey(
        slug,
        display_name,
        domain,
        logo_url
      )
    `)
    .eq('id', user.id)
    .single()

  return {
    data: profile ? { ...user, profile } : user,
    error: profileError
  }
}

/**
 * Update user's profile
 * @param {object} updates - Profile fields to update
 * @returns {Promise<{data, error}>}
 */
export async function updateUserProfile(updates) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: null, error: userError || new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  return { data, error }
}

// Export service slug for reference
export const currentServiceSlug = SERVICE_SLUG
