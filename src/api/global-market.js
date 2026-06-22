/**
 * Global Market Dashboard API
 */
import request from '@/utils/request'

const BASE_URL = '/api/global-market'

/**
 * Get global market overview (indices, forex, crypto, commodities)
 * Includes geo coordinates for world map display
 */
export function getMarketOverview () {
  return request({
    url: `${BASE_URL}/overview`,
    method: 'get'
  })
}

/**
 * Get market heatmap data (crypto, stock sectors, forex)
 */
export function getMarketHeatmap (params = {}) {
  return request({
    url: `${BASE_URL}/heatmap`,
    method: 'get',
    params,
    timeout: 90000
  })
}

/**
 * Get financial news - separated by language (cn/en)
 * @param {string} lang - Language filter: 'cn', 'en', or 'all' (default)
 */
export function getMarketNews (lang = 'all') {
  return request({
    url: `${BASE_URL}/news`,
    method: 'get',
    params: { lang }
  })
}

/**
 * Get economic calendar with impact indicators
 */
export function getEconomicCalendar (params = {}) {
  return request({
    url: `${BASE_URL}/calendar`,
    method: 'get',
    params
  })
}

/**
 * Get market sentiment (Fear & Greed Index, VIX)
 */
export function getMarketSentiment () {
  return request({
    url: `${BASE_URL}/sentiment`,
    method: 'get'
  })
}

/**
 * Get trading opportunities based on technical analysis
 */
export function getTradingOpportunities (params) {
  return request({
    url: `${BASE_URL}/opportunities`,
    method: 'get',
    params
  })
}

/**
 * Force refresh all market data (clears cache)
 */
export function refreshMarketData () {
  return request({
    url: `${BASE_URL}/refresh`,
    method: 'post'
  })
}
