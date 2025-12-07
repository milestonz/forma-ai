const {
  getSupabaseAdmin,
  getSupabaseClientWithAuth,
  verifySupabaseToken,
  isSupabaseConfigured
} = require('./supabase')

// Service slug for this application
const SERVICE_SLUG = process.env.SERVICE_SLUG || 'forma-ai'

/**
 * SSO Middleware - Verifies Supabase JWT and attaches user to request
 * Use this middleware on routes that require Supabase authentication
 */
async function ssoAuthMiddleware(req, res, next) {
  if (!isSupabaseConfigured()) {
    // Skip SSO if not configured
    return next()
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.ssoUser = null
    return next()
  }

  const token = authHeader.split(' ')[1]

  try {
    const { user, error } = await verifySupabaseToken(token)

    if (error || !user) {
      req.ssoUser = null
      return next()
    }

    req.ssoUser = user
    req.ssoToken = token

    // Track service access in background (don't block the request)
    trackServiceAccess(token).catch(err => {
      console.error('Failed to track service access:', err)
    })

    next()
  } catch (err) {
    console.error('SSO auth error:', err)
    req.ssoUser = null
    next()
  }
}

/**
 * SSO Required Middleware - Returns 401 if not authenticated
 */
async function ssoRequiredMiddleware(req, res, next) {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      error: 'SSO not configured',
      message: 'Supabase SSO is not configured on this server'
    })
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No valid authentication token provided'
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    const { user, error } = await verifySupabaseToken(token)

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      })
    }

    req.ssoUser = user
    req.ssoToken = token

    // Track service access in background
    trackServiceAccess(token).catch(err => {
      console.error('Failed to track service access:', err)
    })

    next()
  } catch (err) {
    console.error('SSO auth error:', err)
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed'
    })
  }
}

/**
 * Track user's access to this service
 * @param {string} token - User's access token
 */
async function trackServiceAccess(token) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: null }
  }

  const client = getSupabaseClientWithAuth(token)
  if (!client) {
    return { data: null, error: new Error('Supabase client not available') }
  }

  const { data, error } = await client.rpc('track_service_access', {
    p_service_slug: SERVICE_SLUG,
    p_metadata: {
      accessed_via: 'api',
      accessed_at: new Date().toISOString()
    }
  })

  return { data, error }
}

/**
 * Get user's services
 * @param {string} token - User's access token
 */
async function getUserServices(token) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null }
  }

  const client = getSupabaseClientWithAuth(token)
  if (!client) {
    return { data: [], error: new Error('Supabase client not available') }
  }

  const { data, error } = await client.rpc('get_user_services')
  return { data: data || [], error }
}

/**
 * Get service statistics (admin only)
 * @param {string} serviceSlug - Service slug to get stats for
 */
async function getServiceStats(serviceSlug) {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return { data: null, error: new Error('Supabase admin not available') }
  }

  const { data, error } = await admin.rpc('get_service_stats', {
    p_service_slug: serviceSlug || SERVICE_SLUG
  })

  return { data: data?.[0] || null, error }
}

/**
 * Get all registered services
 */
async function getAllServices() {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return { data: [], error: new Error('Supabase admin not available') }
  }

  const { data, error } = await admin
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('display_name')

  return { data: data || [], error }
}

/**
 * Register a new service (admin only)
 * @param {object} service - Service details
 */
async function registerService({ slug, display_name, domain, description, logo_url }) {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return { data: null, error: new Error('Supabase admin not available') }
  }

  const { data, error } = await admin
    .from('services')
    .insert({
      slug,
      display_name,
      domain,
      description,
      logo_url
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Get users who registered from a specific service
 * @param {string} serviceSlug - Service slug
 */
async function getUsersByOriginService(serviceSlug) {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return { data: [], error: new Error('Supabase admin not available') }
  }

  const { data, error } = await admin
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      avatar_url,
      origin_service,
      created_at
    `)
    .eq('origin_service', serviceSlug)
    .order('created_at', { ascending: false })

  return { data: data || [], error }
}

module.exports = {
  ssoAuthMiddleware,
  ssoRequiredMiddleware,
  trackServiceAccess,
  getUserServices,
  getServiceStats,
  getAllServices,
  registerService,
  getUsersByOriginService,
  SERVICE_SLUG
}
