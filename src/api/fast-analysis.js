/**
 * Fast Analysis API
 */
import request from '@/utils/request'

const BASE_URL = '/api/fast-analysis'

/**
 * Run fast AI analysis
 * @param {Object} params - { market, symbol, language, timeframe }
 */
export function fastAnalyze (params) {
  return request({
    url: `${BASE_URL}/analyze`,
    method: 'post',
    data: params,
    timeout: 300000 // 300s (5 minutes) timeout for analysis
  })
}

export function getProfessionalReportDataSources () {
  return request({
    url: `${BASE_URL}/data-sources`,
    method: 'get'
  })
}
