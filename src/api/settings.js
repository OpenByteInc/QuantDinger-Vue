import request from '@/utils/request'

export function getSettingsSchema () {
  return request({
    url: '/api/settings/schema',
    method: 'get'
  })
}

export function getSettingsValues () {
  return request({
    url: '/api/settings/values',
    method: 'get'
  })
}

export function getPublicSettingsConfig () {
  return request({
    url: '/api/settings/public-config',
    method: 'get'
  })
}

export function saveSettings (data) {
  return request({
    url: '/api/settings/save',
    method: 'post',
    data
  })
}

export function testConnection (service, params = {}) {
  return request({
    url: '/api/settings/test-connection',
    method: 'post',
    data: { service, ...params }
  })
}

export function getOpenRouterBalance () {
  return request({
    url: '/api/settings/openrouter-balance',
    method: 'get'
  })
}

export function getMarketCatalogOverview () {
  return request({
    url: '/api/settings/market-catalog',
    method: 'get'
  })
}

export function syncMarketCatalog () {
  return request({
    url: '/api/settings/market-catalog/sync',
    method: 'post'
  })
}

export function getInstrumentCatalog (params) {
  return request({ url: '/api/settings/instrument-catalog', method: 'get', params })
}
