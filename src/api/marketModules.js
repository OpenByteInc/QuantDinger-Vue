import request from '@/utils/request'

export function getMarketModules () {
  return request({
    url: '/api/market-modules',
    method: 'get'
  })
}

