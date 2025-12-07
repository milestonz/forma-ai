const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

let supabaseAdmin = null
let supabaseClient = null

/**
 * Get Supabase admin client (uses service role key)
 * Use this for server-side operations that need elevated permissions
 */
function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase admin credentials not configured')
    return null
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  return supabaseAdmin
}

/**
 * Get Supabase client (uses anon key)
 * Use this for operations on behalf of users
 */
function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase client credentials not configured')
    return null
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }

  return supabaseClient
}

/**
 * Create a Supabase client authenticated with a user's JWT token
 * @param {string} accessToken - The user's access token from the Authorization header
 */
function getSupabaseClientWithAuth(accessToken) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })
}

/**
 * Verify a Supabase JWT and get the user
 * @param {string} token - JWT access token
 */
async function verifySupabaseToken(token) {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return { user: null, error: new Error('Supabase not configured') }
  }

  const { data: { user }, error } = await admin.auth.getUser(token)
  return { user, error }
}

/**
 * Check if Supabase is configured
 */
function isSupabaseConfigured() {
  return !!(supabaseUrl && (supabaseServiceKey || supabaseAnonKey))
}

module.exports = {
  getSupabaseAdmin,
  getSupabaseClient,
  getSupabaseClientWithAuth,
  verifySupabaseToken,
  isSupabaseConfigured
}
