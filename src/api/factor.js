import request from '@/utils/request'

export function getFactorCatalog (params = {}) {
  return request({ url: '/api/factors', method: 'get', params })
}

export function runFactorResearch (data) {
  return request({ url: '/api/factors/research', method: 'post', data })
}

export function validateCustomFactor (data) {
  return request({ url: '/api/factors/custom/validate', method: 'post', data })
}

export function createCustomFactor (data) {
  return request({ url: '/api/factors/custom', method: 'post', data })
}

export function archiveCustomFactor (id) {
  return request({ url: `/api/factors/custom/${id}`, method: 'delete' })
}

export function getUniverseFundamentals (id, params) {
  return request({ url: `/api/factors/fundamentals/universe/${id}`, method: 'get', params })
}

export function syncUniverseFundamentals (id, data) {
  return request({ url: `/api/factors/fundamentals/universe/${id}/sync`, method: 'post', data })
}

export function scheduleUniverseFundamentals (id, data) {
  return request({ url: `/api/factors/fundamentals/universe/${id}/schedule`, method: 'post', data })
}
