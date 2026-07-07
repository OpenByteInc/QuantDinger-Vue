import request from '@/utils/request'

/**
 * Unified broker API client.
 *
 * Wraps `/api/ibkr/*` and `/api/alpaca/*` behind one shape:
 *
 *   broker.<id>.status()
 *   broker.<id>.connect(payload)
 *   broker.<id>.disconnect()
 *   broker.<id>.account()
 *   broker.<id>.positions()
 *   broker.<id>.orders()
 *   broker.<id>.placeOrder(payload)
 *   broker.<id>.cancelOrder(id)
 *   broker.<id>.quote(symbol, params)
 *
 * Per-user multi-tenancy is handled server-side via BrokerSessionRegistry,
 * so callers do not pass a user id — the auth token determines isolation.
 */

const ENDPOINTS = {
  ibkr: {
    status: '/api/ibkr/status',
    connect: '/api/ibkr/connect',
    disconnect: '/api/ibkr/disconnect',
    account: '/api/ibkr/account',
    positions: '/api/ibkr/positions',
    orders: '/api/ibkr/orders',
    order: '/api/ibkr/order',
    quote: '/api/ibkr/quote'
  },
  alpaca: {
    status: '/api/alpaca/status',
    connect: '/api/alpaca/connect',
    disconnect: '/api/alpaca/disconnect',
    account: '/api/alpaca/account',
    positions: '/api/alpaca/positions',
    orders: '/api/alpaca/orders',
    order: '/api/alpaca/order',
    quote: '/api/alpaca/quote'
  }
}

function makeBrokerClient (id) {
  const ep = ENDPOINTS[id]
  if (!ep) throw new Error(`Unknown broker: ${id}`)

  return {
    id,
    status () {
      return request({ url: ep.status, method: 'get' })
    },
    connect (data = {}) {
      return request({ url: ep.connect, method: 'post', data })
    },
    disconnect () {
      return request({ url: ep.disconnect, method: 'post' })
    },
    account () {
      return request({ url: ep.account, method: 'get' })
    },
    positions () {
      return request({ url: ep.positions, method: 'get' })
    },
    orders () {
      return request({ url: ep.orders, method: 'get' })
    },
    placeOrder (data = {}) {
      return request({ url: ep.order, method: 'post', data })
    },
    cancelOrder (orderId) {
      const url = id === 'alpaca'
        ? `${ep.order}/${encodeURIComponent(orderId)}`
        : `${ep.order}/${orderId}`
      return request({ url, method: 'delete' })
    },
    quote (symbol, params = {}) {
      if (id === 'alpaca') {
        return request({ url: `${ep.quote}/${encodeURIComponent(symbol)}`, method: 'get', params })
      }
      return request({ url: ep.quote, method: 'get', params: { ...params, symbol } })
    }
  }
}

export const broker = {
  ibkr: makeBrokerClient('ibkr'),
  alpaca: makeBrokerClient('alpaca')
}

export const BROKER_IDS = ['alpaca', 'ibkr']

/**
 * Static descriptor for each broker (logo color, market focus, connect form
 * schema). Keeps the page declarative and easy to extend with a 4th broker.
 */
export const BROKER_META = {
  alpaca: {
    id: 'alpaca',
    icon: 'thunderbolt',
    color: '#1890ff',
    accent: '#722ed1',
    markets: ['USStock', 'Crypto'],
    badges: ['zero_commission', 'rest_api'],
    cloudFriendly: true
  },
  ibkr: {
    id: 'ibkr',
    icon: 'global',
    color: '#fa8c16',
    accent: '#d4380d',
    markets: ['USStock', 'Forex', 'Futures'],
    badges: ['tws_required', 'pro_features'],
    cloudFriendly: false
  }
}
