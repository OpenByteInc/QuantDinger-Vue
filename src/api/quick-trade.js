import request from '@/utils/request'

/** Place a quick trade order */
export function placeQuickOrder (data) {
  return request({
    url: '/api/quick-trade/place-order',
    method: 'post',
    data
  })
}

/** Get available balance from exchange */
export function getQuickTradeBalance (params) {
  return request({
    url: '/api/quick-trade/balance',
    method: 'get',
    params
  })
}

/** Get a normalized public crypto order-book snapshot. */
export function getQuickTradeOrderBook (params, options = {}) {
  return request({
    url: '/api/quick-trade/order-book',
    method: 'get',
    params,
    signal: options.signal,
    timeout: 6000
  })
}

/** Get current position for a symbol */
export function getQuickTradePosition (params) {
  return request({
    url: '/api/quick-trade/position',
    method: 'get',
    params
  })
}

/** Get quick trade history */
export function getQuickTradeHistory (params) {
  return request({
    url: '/api/quick-trade/history',
    method: 'get',
    params
  })
}

/** Close an existing position */
export function closeQuickTradePosition (data) {
  return request({
    url: '/api/quick-trade/close-position',
    method: 'post',
    data
  })
}

/** Cancel an active quick trade order */
export function cancelQuickTradeOrder (data) {
  return request({
    url: '/api/quick-trade/cancel-order',
    method: 'post',
    data
  })
}

export function getQuickPositionHistory (params) {
  return request({ url: '/api/quick-trade/position-history', method: 'get', params })
}

export function getQuickPositionProtection (params) {
  return request({ url: '/api/quick-trade/position-protection', method: 'get', params })
}

export function updateQuickPositionProtection (data) {
  return request({ url: '/api/quick-trade/position-protection', method: 'post', data })
}
