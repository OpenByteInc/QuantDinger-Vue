import request from '@/utils/request'

/**
 * Agent Gateway admin API client.
 *
 * All endpoints under /api/agent/v1/admin/* require the human admin JWT
 * (handled automatically by `@/utils/request`). They are intentionally
 * separate from the agent-token surface; agents can never call them.
 *
 * See docs/agent/AI_INTEGRATION_DESIGN.md and docs/agent/AGENT_QUICKSTART.md.
 */

/**
 * Issue a new agent token. The full token is returned EXACTLY ONCE in the
 * response and must be copied immediately by the operator.
 */
export function issueAgentToken (data) {
  return request({
    url: '/api/agent/v1/admin/tokens',
    method: 'post',
    data
  })
}

/**
 * List existing tokens for the calling tenant. Token hashes are never returned.
 */
export function listAgentTokens () {
  return request({
    url: '/api/agent/v1/admin/tokens',
    method: 'get'
  })
}

/**
 * Revoke a token. Status flips to 'revoked'; subsequent agent calls return 401.
 */
export function revokeAgentToken (tokenId) {
  return request({
    url: `/api/agent/v1/admin/tokens/${tokenId}`,
    method: 'delete'
  })
}

/**
 * Recent agent calls (audit log).
 */
export function listAgentAudit (params) {
  return request({
    url: '/api/agent/v1/admin/audit',
    method: 'get',
    params
  })
}

/** Self-service token policy + risk disclosure (any logged-in user). */
export function getMyAgentTokenPolicy () {
  return request({
    url: '/api/agent/v1/me/tokens/policy',
    method: 'get'
  })
}

export function issueMyAgentToken (data) {
  return request({
    url: '/api/agent/v1/me/tokens',
    method: 'post',
    data
  })
}

export function listMyAgentTokens () {
  return request({
    url: '/api/agent/v1/me/tokens',
    method: 'get'
  })
}

export function revokeMyAgentToken (tokenId) {
  return request({
    url: `/api/agent/v1/me/tokens/${tokenId}`,
    method: 'delete'
  })
}

export function listMyAgentAudit (params) {
  return request({
    url: '/api/agent/v1/me/audit',
    method: 'get',
    params
  })
}

/**
 * Jobs submitted by agents (paged via limit only; newest first).
 * NOTE: this hits an agent-scoped endpoint, so it requires an agent token —
 * not a JWT. The admin UI does not call this; use the SSE stream instead.
 */
export function listAgentJobs (agentToken, params) {
  return request({
    url: '/api/agent/v1/jobs',
    method: 'get',
    params,
    headers: { Authorization: `Bearer ${agentToken}` }
  })
}
