import request from '@/utils/request'

export function getFactorCatalog (params = {}) {
  return request({ url: '/api/factors', method: 'get', params })
}

export function getFactorDetail (factorId) {
  return request({ url: `/api/factors/${factorId}`, method: 'get' })
}

export function runFactorResearch (data) {
  return request({ url: '/api/factors/research', method: 'post', data })
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
