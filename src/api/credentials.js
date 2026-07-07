import request from '@/utils/request'

const api = {
  list: '/api/credentials/list',
  get: '/api/credentials/get',
  create: '/api/credentials/create',
  delete: '/api/credentials/delete',
  updateName: '/api/credentials/update-name',
  egressIp: '/api/credentials/egress-ip',
  desktopBrokersPolicy: '/api/credentials/desktop-brokers-policy'
}

export function listExchangeCredentials (params = {}) {
  return request({
    url: api.list,
    method: 'get',
    params
  })
}

export function getExchangeCredential (id, params = {}) {
  return request({
    url: api.get,
    method: 'get',
    params: { id, ...params }
  })
}

export function createExchangeCredential (data) {
  return request({
    url: api.create,
    method: 'post',
    data
  })
}

export function deleteExchangeCredential (id, params = {}) {
  return request({
    url: api.delete,
    method: 'delete',
    params: { id, ...params }
  })
}

/** Update display name only (API keys unchanged). */
export function updateExchangeCredentialName (data) {
  return request({
    url: api.updateName,
    method: 'put',
    data
  })
}

/** Server egress IP (for exchange API key IP whitelist). */
export function getCredentialsEgressIp () {
  return request({
    url: api.egressIp,
    method: 'get'
  })
}

/** IBKR allowed on this deployment (ALLOW_LOCAL_DESKTOP_BROKERS). */
export function getDesktopBrokersPolicy () {
  return request({
    url: api.desktopBrokersPolicy,
    method: 'get'
  })
}
