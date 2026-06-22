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

/**
 * Get analysis history for a specific symbol
 * @param {Object} params - { market, symbol, days, limit }
 */
export function getAnalysisHistory (params) {
  return request({
    url: `${BASE_URL}/history`,
    method: 'get',
    params
  })
}

/**
 * Get all analysis history with pagination
 * @param {Object} params - { page, pagesize }
 */
export function getAllAnalysisHistory (params) {
  return request({
    url: `${BASE_URL}/history/all`,
    method: 'get',
    params
  })
}

/**
 * Delete analysis history record
 * @param {Number} memoryId - The memory ID to delete
 */
export function deleteAnalysisHistory (memoryId) {
  return request({
    url: `${BASE_URL}/history/${memoryId}`,
    method: 'delete'
  })
}

/**
 * Submit user feedback on analysis
 * @param {Object} params - { memory_id, feedback }
 */
export function submitFeedback (params) {
  return request({
    url: `${BASE_URL}/feedback`,
    method: 'post',
    data: params
  })
}

/**
 * Get AI performance stats
 * @param {Object} params - { market, symbol, days }
 */
export function getPerformanceStats (params) {
  return request({
    url: `${BASE_URL}/performance`,
    method: 'get',
    params
  })
}

/**
 * Get similar historical patterns
 * @param {Object} params - { market, symbol }
 */
export function getSimilarPatterns (params) {
  return request({
    url: `${BASE_URL}/similar-patterns`,
    method: 'get',
    params
  })
}
