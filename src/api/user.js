/**
 * User Management API
 */
import request from '@/utils/request'

// ==================== Admin APIs ====================

/**
 * Get user list (admin only)
 * @param {Object} params - { page, page_size, search }
 */
export function getUserList (params) {
  return request({
    url: '/api/users/list',
    method: 'get',
    params
  })
}

/**
 * Export user list (admin only)
 * @param {Object} params - { search }
 */
export function exportUsers (params) {
  return request({
    url: '/api/users/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

/**
 * Get user detail (admin only)
 * @param {Number} id - User ID
 */
export function getUserDetail (id) {
  return request({
    url: '/api/users/detail',
    method: 'get',
    params: { id }
  })
}

/**
 * Create new user (admin only)
 * @param {Object} data - { username, password, email, nickname, role }
 */
export function createUser (data) {
  return request({
    url: '/api/users/create',
    method: 'post',
    data
  })
}

/**
 * Update user (admin only)
 * @param {Number} id - User ID
 * @param {Object} data - { email, nickname, role, status }
 */
export function updateUser (id, data) {
  return request({
    url: '/api/users/update',
    method: 'put',
    params: { id },
    data
  })
}

/**
 * Delete user (admin only)
 * @param {Number} id - User ID
 */
export function deleteUser (id) {
  return request({
    url: '/api/users/delete',
    method: 'delete',
    params: { id }
  })
}

/**
 * Reset user password (admin only)
 * @param {Object} data - { user_id, new_password }
 */
export function resetUserPassword (data) {
  return request({
    url: '/api/users/reset-password',
    method: 'post',
    data
  })
}

/**
 * Get available roles
 */
export function getRoles () {
  return request({
    url: '/api/users/roles',
    method: 'get'
  })
}

// ==================== Self-Service APIs ====================

/**
 * Get current user profile
 */
export function getProfile () {
  return request({
    url: '/api/users/profile',
    method: 'get'
  })
}

/**
 * Update current user profile
 * @param {Object} data - { nickname, avatar, timezone }
 */
export function updateProfile (data) {
  return request({
    url: '/api/users/profile/update',
    method: 'put',
    data
  })
}

/**
 * Change current user password
 * @param {Object} data - { old_password, new_password }
 */
export function changePassword (data) {
  return request({
    url: '/api/users/change-password',
    method: 'post',
    data
  })
}

export function getMfaStatus () {
  return request({
    url: '/api/users/mfa/status',
    method: 'get'
  })
}

export function startMfaSetup () {
  return request({
    url: '/api/users/mfa/setup/start',
    method: 'post',
    data: {}
  })
}

export function confirmMfaSetup (data) {
  return request({
    url: '/api/users/mfa/setup/confirm',
    method: 'post',
    data
  })
}

export function disableMfa (data) {
  return request({
    url: '/api/users/mfa/disable',
    method: 'post',
    data
  })
}

/**
 * Get current user's notification settings
 */
export function getNotificationSettings () {
  return request({
    url: '/api/users/notification-settings',
    method: 'get'
  })
}

/**
 * Update current user's notification settings
 * @param {Object} data - { default_channels, telegram_chat_id, email, discord_webhook, webhook_url, phone }
 */
export function updateNotificationSettings (data) {
  return request({
    url: '/api/users/notification-settings',
    method: 'put',
    data
  })
}

/**
 * Send test notification using saved notification settings (call after PUT save).
 */
export function testNotificationSettings () {
  return request({
    url: '/api/users/notification-settings/test',
    method: 'post',
    data: {}
  })
}

export function getChartTemplates () {
  return request({
    url: '/api/users/chart-templates',
    method: 'get'
  })
}

export function saveChartTemplate (data) {
  return request({
    url: '/api/users/chart-templates',
    method: 'post',
    data
  })
}

export function deleteChartTemplate (templateId) {
  return request({
    url: '/api/users/chart-templates',
    method: 'delete',
    params: { template_id: templateId }
  })
}

/**
 * Get current user's login history (password / email code / OAuth)
 * @param {Object} params - { page, page_size }
 */
export function getLoginLogs (params) {
  return request({
    url: '/api/users/login-logs',
    method: 'get',
    params
  })
}

/**
 * Get current user's credits log
 * @param {Object} params - { page, page_size }
 */
export function getMyCreditsLog (params) {
  return request({
    url: '/api/users/my-credits-log',
    method: 'get',
    params
  })
}

/**
 * Get current user's referral list
 * @param {Object} params - { page, page_size }
 */
export function getMyReferrals (params) {
  return request({
    url: '/api/users/my-referrals',
    method: 'get',
    params
  })
}

// ==================== Billing Management (Admin) ====================

/**
 * Set user credits (admin only)
 * @param {Object} data - { user_id, credits, remark }
 */
export function setUserCredits (data) {
  return request({
    url: '/api/users/set-credits',
    method: 'post',
    data
  })
}

/**
 * Set user VIP status (admin only)
 * @param {Object} data - { user_id, vip_days, vip_expires_at, remark }
 */
export function setUserVip (data) {
  return request({
    url: '/api/users/set-vip',
    method: 'post',
    data
  })
}

/**
 * Get user credits log (admin only)
 * @param {Object} params - { user_id, page, page_size }
 */
export function getUserCreditsLog (params) {
  return request({
    url: '/api/users/credits-log',
    method: 'get',
    params
  })
}

/**
 * Get system-wide strategy overview (admin only)
 * @param {Object} params - { page, page_size, status, execution_mode, search, sort_by, sort_order }
 */
export function getSystemStrategies (params) {
  return request({
    url: '/api/users/system-strategies',
    method: 'get',
    params
  })
}

/**
 * Admin: start/stop any strategy (admin only)
 * @param {Number} strategyId
 * @param {String} action - optional: 'start' | 'stop' (omit to toggle)
 */
export function adminToggleStrategy (strategyId, action) {
  return request({
    url: '/api/users/system-strategies/toggle',
    method: 'post',
    params: { id: strategyId },
    data: action ? { action } : {}
  })
}

/**
 * Get all orders across the system (admin only)
 * @param {Object} params - { page, page_size, status, search }
 */
export function getAdminOrders (params) {
  return request({
    url: '/api/users/admin-orders',
    method: 'get',
    params
  })
}

/**
 * Admin-only: manually mark a USDT order as confirmed and grant the
 * membership when the on-chain reconciler missed the transaction.
 *
 * @param {Number} orderId
 * @param {Object} payload - { tx_hash: string, note?: string }
 */
export function manualConfirmOrder (orderId, payload) {
  return request({
    url: `/api/users/admin-orders/${orderId}/manual-confirm`,
    method: 'post',
    data: payload
  })
}

/**
 * Get AI analysis usage statistics (admin only)
 * @param {Object} params - { page, page_size, search }
 */
export function getAdminAiStats (params) {
  return request({
    url: '/api/users/admin-ai-stats',
    method: 'get',
    params
  })
}

/**
 * Get user-management dashboard stats (admin only).
 * Returns headline KPIs, 30-day growth, 14-day DAU, role pie,
 * country distribution, recent signups and expiring-VIPs.
 *
 * @param {Object} params - { geo: '0' | '1' } - pass '0' to skip geo lookup
 */
export function getUserAdminStats (params) {
  return request({
    url: '/api/users/admin/stats',
    method: 'get',
    params
  })
}
