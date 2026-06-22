import request from '@/utils/request'

function joinApiBase (path) {
  const base = (process.env.VUE_APP_API_BASE_URL || '').trim()
  const p = path.startsWith('/') ? path : `/${path}`
  if (!base) return p

  const b = base.replace(/\/+$/, '')
  // Avoid duplicate "/api/api/*" when base is "/api" or ends with "/api"
  if (b.endsWith('/api') && p.startsWith('/api/')) {
    return b + p.slice('/api'.length)
  }
  return b + p
}

/**
 * Get security configuration (Turnstile, OAuth settings)
 */
export function getSecurityConfig () {
  return request({
    url: '/api/auth/security-config',
    method: 'get'
  })
}

/**
 * User login
 * @param {Object} data - { username, password, turnstile_token }
 */
export function login (data) {
  return request({
    url: '/api/auth/login',
    method: 'post',
    data
  })
}

/**
 * Complete password login after MFA challenge.
 * @param {Object} data - { challenge_id, code }
 */
export function verifyLoginMfa (data) {
  return request({
    url: '/api/auth/mfa/verify-login',
    method: 'post',
    data
  })
}

/**
 * User logout
 */
export function logout () {
  return request({
    url: '/api/auth/logout',
    method: 'post'
  })
}

/**
 * Get current user info
 */
export function getUserInfo () {
  return request({
    url: '/api/auth/info',
    method: 'get'
  })
}

/**
 * Send verification code
 * @param {Object} data - { email, type, turnstile_token }
 * type: 'register' | 'login' | 'reset_password' | 'change_password' | 'change_email'
 */
export function sendVerificationCode (data) {
  return request({
    url: '/api/auth/send-code',
    method: 'post',
    data
  })
}

/**
 * Login with email verification code (quick login)
 * @param {Object} data - { email, code, turnstile_token }
 */
export function loginWithCode (data) {
  return request({
    url: '/api/auth/login-code',
    method: 'post',
    data
  })
}

/**
 * User registration
 * @param {Object} data - { email, code, username, password, turnstile_token }
 */
export function register (data) {
  return request({
    url: '/api/auth/register',
    method: 'post',
    data
  })
}

/**
 * Reset password
 * @param {Object} data - { email, code, new_password, turnstile_token }
 */
export function resetPassword (data) {
  return request({
    url: '/api/auth/reset-password',
    method: 'post',
    data
  })
}

/**
 * Change password (for logged-in users)
 * @param {Object} data - { code, new_password }
 */
export function changePassword (data) {
  return request({
    url: '/api/auth/change-password',
    method: 'post',
    data
  })
}

/**
 * Get Google OAuth URL
 */
export function getGoogleOAuthUrl () {
  return joinApiBase('/api/auth/oauth/google')
}

/**
 * Get GitHub OAuth URL
 */
export function getGitHubOAuthUrl () {
  return joinApiBase('/api/auth/oauth/github')
}
