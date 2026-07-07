import request from '@/utils/request'

const api = {
  // Local Python backend
  strategies: '/api/strategies',
  strategyDetail: '/api/strategies/detail',
  createStrategy: '/api/strategies/create',
  batchCreateStrategies: '/api/strategies/batch-create',
  updateStrategy: '/api/strategies/update',
  stopStrategy: '/api/strategies/stop',
  startStrategy: '/api/strategies/start',
  deleteStrategy: '/api/strategies/delete',
  batchStartStrategies: '/api/strategies/batch-start',
  batchStopStrategies: '/api/strategies/batch-stop',
  batchDeleteStrategies: '/api/strategies/batch-delete',
  testConnection: '/api/strategies/test-connection',
  trades: '/api/strategies/trades',
  positions: '/api/strategies/positions',
  accountPositions: '/api/account/positions',
  accountSnapshot: '/api/account/snapshot',
  equityCurve: '/api/strategies/equityCurve',
  dryRunDeviation: '/api/strategies/dry-run-deviation',
  notifications: '/api/strategies/notifications',
  unreadNotificationCount: '/api/strategies/notifications/unread-count',
  verifyCode: '/api/strategies/verify-code',
  aiGenerate: '/api/strategies/ai-generate',
  performance: '/api/strategies/performance',
  reviewReport: '/api/strategies/review-report',
  reviewReportHistory: '/api/strategies/review-report/history',
  logs: '/api/strategies/logs',
  gridRestingOrders: '/api/strategies/grid-resting-orders',
  backtest: '/api/strategies/backtest',
  backtestHistory: '/api/strategies/backtest/history',
  backtestGet: '/api/strategies/backtest/get',
  scriptSources: '/api/strategies/script-sources',
  scriptSourceDetail: '/api/strategies/script-sources/detail',
  createScriptSource: '/api/strategies/script-sources/create',
  updateScriptSource: '/api/strategies/script-sources/update',
  deleteScriptSource: '/api/strategies/script-sources/delete',
  publishScriptSource: '/api/strategies/script-sources/publish',
  scriptSourceVersions: '/api/strategies/script-sources/versions',
  restoreScriptSourceVersion: '/api/strategies/script-sources/versions/restore',
  publishTemplate: '/api/strategies/publish-template',
  publishBotPreset: '/api/strategies/publish-bot-preset'
}

export function getStrategyList (params = {}) {
  return request({
    url: api.strategies,
    method: 'get',
    params
  })
}

export function getStrategyDetail (id) {
  return request({
    url: api.strategyDetail,
    method: 'get',
    params: { id }
  })
}

export function createStrategy (data) {
  return request({
    url: api.createStrategy,
    method: 'post',
    data
  })
}

export function batchCreateStrategies (data) {
  return request({
    url: api.batchCreateStrategies,
    method: 'post',
    data
  })
}

export function updateStrategy (id, data) {
  return request({
    url: api.updateStrategy,
    method: 'put',
    params: { id },
    data
  })
}

export function stopStrategy (id) {
  return request({
    url: api.stopStrategy,
    method: 'post',
    params: { id }
  })
}

export function startStrategy (id) {
  return request({
    url: api.startStrategy,
    method: 'post',
    params: { id }
  })
}

export function deleteStrategy (id) {
  return request({
    url: api.deleteStrategy,
    method: 'delete',
    params: { id }
  })
}

export function batchStartStrategies (data) {
  return request({
    url: api.batchStartStrategies,
    method: 'post',
    data
  })
}

export function batchStopStrategies (data) {
  return request({
    url: api.batchStopStrategies,
    method: 'post',
    data
  })
}

export function batchDeleteStrategies (data) {
  return request({
    url: api.batchDeleteStrategies,
    method: 'delete',
    data
  })
}

export function testExchangeConnection (exchangeConfig) {
  return request({
    url: api.testConnection,
    method: 'post',
    data: { exchange_config: exchangeConfig }
  })
}

export function getStrategyTrades (id, lang) {
  const params = { id }
  if (lang) params.lang = lang
  return request({
    url: api.trades,
    method: 'get',
    params
  })
}

export function getStrategyPositions (id) {
  return request({
    url: api.positions,
    method: 'get',
    params: { id }
  })
}

export function getAccountPositions (params = {}) {
  return request({
    url: api.accountPositions,
    method: 'get',
    params
  })
}

export function getAccountSnapshot (params = {}) {
  return request({
    url: api.accountSnapshot,
    method: 'get',
    params
  })
}

export function getGridRestingOrders (id, opts = {}) {
  const params = { id }
  if (opts.status) params.status = opts.status
  if (opts.limit) params.limit = opts.limit
  if (opts.sync) params.sync = '1'
  return request({
    url: api.gridRestingOrders,
    method: 'get',
    params
  })
}

export function getStrategyEquityCurve (id) {
  return request({
    url: api.equityCurve,
    method: 'get',
    params: { id }
  })
}

export function getStrategyDryRunDeviation (id, limit = 200) {
  return request({
    url: api.dryRunDeviation,
    method: 'get',
    params: { id, limit }
  })
}

export function getStrategyNotifications (params = {}) {
  return request({
    url: api.notifications,
    method: 'get',
    params
  })
}

export function getUnreadNotificationCount () {
  return request({
    url: api.unreadNotificationCount,
    method: 'get'
  })
}

export function verifyStrategyCode (data) {
  return request({
    url: api.verifyCode,
    method: 'post',
    data
  })
}

export function aiGenerateStrategy (data) {
  return request({
    url: api.aiGenerate,
    method: 'post',
    data
  })
}

export function getStrategyPerformance (id) {
  return request({
    url: api.performance,
    method: 'get',
    params: { id }
  })
}

export function getStrategyReviewReport (id, data = {}) {
  return request({
    url: api.reviewReport,
    method: 'post',
    params: { id },
    data
  })
}

export function getStrategyReviewReportHistory (id, params = {}) {
  return request({
    url: api.reviewReportHistory,
    method: 'get',
    params: { id, ...params }
  })
}

export function getStrategyLogs (id, params = {}) {
  return request({
    url: api.logs,
    method: 'get',
    params: { id, ...params }
  })
}

export function runStrategyBacktest (data) {
  const payload = { ...(data || {}) }
  const timeout = payload.timeout
  delete payload.timeout
  return request({
    url: api.backtest,
    method: 'post',
    data: payload,
    timeout
  })
}

export function getStrategyBacktestHistory (params = {}) {
  return request({
    url: api.backtestHistory,
    method: 'get',
    params
  })
}

export function getStrategyBacktestRun (runId) {
  return request({
    url: api.backtestGet,
    method: 'get',
    params: { runId }
  })
}

export function getScriptSourceList (params = {}) {
  return request({
    url: api.scriptSources,
    method: 'get',
    params
  })
}

export function getScriptSourceDetail (id) {
  return request({
    url: api.scriptSourceDetail,
    method: 'get',
    params: { id }
  })
}

export function createScriptSource (data) {
  return request({
    url: api.createScriptSource,
    method: 'post',
    data
  })
}

export function updateScriptSource (id, data) {
  return request({
    url: api.updateScriptSource,
    method: 'put',
    params: { id },
    data
  })
}

export function deleteScriptSource (id) {
  return request({
    url: api.deleteScriptSource,
    method: 'delete',
    params: { id }
  })
}

export function publishScriptSource (data) {
  return request({
    url: api.publishScriptSource,
    method: 'post',
    data
  })
}

export function getScriptSourceVersions (sourceId) {
  return request({
    url: api.scriptSourceVersions,
    method: 'get',
    params: { sourceId }
  })
}

export function getScriptSourceVersion (versionId) {
  return request({
    url: `${api.scriptSourceVersions}/${versionId}`,
    method: 'get'
  })
}

export function restoreScriptSourceVersion (versionId) {
  return request({
    url: api.restoreScriptSourceVersion,
    method: 'post',
    data: { versionId }
  })
}

export function publishStrategyTemplate (data) {
  return request({
    url: api.publishTemplate,
    method: 'post',
    data
  })
}

export function publishBotPreset (data) {
  return request({
    url: api.publishBotPreset,
    method: 'post',
    data
  })
}
