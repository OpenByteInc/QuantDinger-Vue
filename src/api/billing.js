import request from '@/utils/request'

const billingApi = {
  Plans: '/api/billing/plans',
  UsdtChains: '/api/billing/usdt/chains',
  UsdtCreate: '/api/billing/usdt/create',
  UsdtOrder: (id) => `/api/billing/usdt/order/${id}`
}

export function getMembershipPlans () {
  return request({
    url: billingApi.Plans,
    method: 'get'
  })
}

// v3.0.6+ : list enabled USDT chains so the frontend can render the chain
// picker. Chains without a configured receiving address are hidden by the
// backend, so the response can be rendered verbatim.
export function listUsdtChains () {
  return request({
    url: billingApi.UsdtChains,
    method: 'get'
  })
}

export function createUsdtOrder (plan, chain) {
  const data = { plan }
  if (chain) data.chain = chain
  return request({
    url: billingApi.UsdtCreate,
    method: 'post',
    data
  })
}

export function getUsdtOrder (orderId, refresh = true) {
  return request({
    url: billingApi.UsdtOrder(orderId),
    method: 'get',
    params: { refresh: refresh ? 1 : 0 }
  })
}
