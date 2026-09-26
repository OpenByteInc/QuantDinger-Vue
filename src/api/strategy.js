import request, { AI_GENERATE_TIMEOUT, BACKTEST_TIMEOUT } from '@/utils/request'

const api = {
  // Local Python backend
  strategies: '/api/strategies',
  testConnection: '/api/strategies/exchange/test',
  trades: '/api/strategies/trades',
  positions: '/api/strategies/positions',
  accountPositions: '/api/account/positions',
  accountSnapshot: '/api/account/snapshot',
  positionOwnership: '/api/strategies/position-ownership',
  positionOwnershipRepair: '/api/strategies/position-ownership/repair',
  equityCurve: '/api/strategies/equityCurve',
  notifications: '/api/strategies/notifications',
  unreadNotificationCount: '/api/strategies/notifications/unread-count',
  verifyCode: '/api/strategies/verify',
  aiGenerate: '/api/strategies/generate',
  aiWorkspace: '/api/strategies/ai-workspace',
  scriptTemplates: '/api/strategies/script-templates',
  reviewReport: '/api/strategies/review-report',
  reviewReportHistory: '/api/strategies/review-report/history',
  logs: '/api/strategies/logs',
  aiDecisions: '/api/strategies/ai-decisions',
  gridRestingOrders: '/api/strategies/grid-resting-orders',
  executorTemplates: '/api/strategies/executors/templates',
  executorPreview: '/api/strategies/executors/preview',
  executorGenerate: '/api/strategies/executors/generate',
  executorCreate: '/api/strategies/executors/create',
  strategyAssets: '/api/strategy-assets',
  strategyBacktestRun: '/api/backtest/run',
  strategyFactorResearch: '/api/backtest/factor-research',
  strategyFactorResearchHistory: '/api/backtest/factor-research/history',
  strategyFactorResearchGet: '/api/backtest/factor-research/get',
  strategyBacktestHistory: '/api/backtest/history',
  strategyBacktestGet: '/api/backtest/get',
  strategyEvolutionRun: '/api/strategy-evolution/run',
  strategyEvolutionEstimate: '/api/strategy-evolution/estimate',
  strategyEvolutionParameterSpace: '/api/strategy-evolution/parameter-space',
  strategyEvolutionJobs: '/api/strategy-evolution/jobs',
  scriptSources: '/api/strategies/script-sources',
  scriptSourceDetail: '/api/strategies/script-sources/detail',
  createScriptSource: '/api/strategies/script-sources/create',
  updateScriptSource: '/api/strategies/script-sources/update',
  deleteScriptSource: '/api/strategies/script-sources/delete',
  publishScriptSource: '/api/strategies/script-sources/publish',
  scriptSourcePublishReadiness: '/api/strategies/script-sources/publish-readiness',
  scriptSourceVersions: '/api/strategies/script-sources/versions',
  restoreScriptSourceVersion: '/api/strategies/script-sources/versions/restore',
  compileScriptSource: '/api/strategies/script-sources/compile',
  indicators: '/api/indicator/getIndicators'
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
    url: `${api.strategies}/${id}`,
    method: 'get'
  })
}

export function createStrategy (data) {
  return request({
    url: api.strategies,
    method: 'post',
    data
  })
}

export function updateStrategy (id, data) {
  return request({
    url: `${api.strategies}/${id}`,
    method: 'put',
    data
  })
}

export function stopStrategy (id, closePositions = false) {
  return request({
    url: `${api.strategies}/${id}/stop`,
    method: 'post',
    data: { close_positions: Boolean(closePositions) }
  })
}

export function startStrategy (id) {
  return request({
    url: `${api.strategies}/${id}/start`,
    method: 'post'
  })
}

export function deleteStrategy (id) {
  return request({
    url: `${api.strategies}/${id}`,
    method: 'delete'
  })
}

export function testExchangeConnection (exchangeConfig) {
  return request({
    url: api.testConnection,
    method: 'post',
    data: exchangeConfig
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

export function getStrategyAiDecisions (id, limit = 100) {
  return request({
    url: api.aiDecisions,
    method: 'get',
    params: { id, limit }
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

export function getExecutorTemplates () {
  return request({
    url: api.executorTemplates,
    method: 'get'
  })
}

export function previewExecutorStrategy (data) {
  return request({
    url: api.executorPreview,
    method: 'post',
    data
  })
}

export function generateExecutorStrategy (data) {
  return request({
    url: api.executorGenerate,
    method: 'post',
    data
  })
}

export function createExecutorStrategy (data) {
  return request({
    url: api.executorCreate,
    method: 'post',
    data
  })
}

export function getStrategyEquityCurve (id) {
  return request({
    url: api.equityCurve,
    method: 'get',
    params: { id }
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
    data,
    timeout: AI_GENERATE_TIMEOUT
  })
}

export function getStrategyAiWorkspace (sourceId, params = {}) {
  return request({
    url: `${api.aiWorkspace}/${sourceId}`,
    method: 'get',
    params
  })
}

export function clearStrategyAiWorkspace (sourceId, params = {}) {
  return request({
    url: `${api.aiWorkspace}/${sourceId}`,
    method: 'delete',
    params
  })
}

export function runStrategyAiTurn (data) {
  return request({
    url: `${api.aiWorkspace}/turn`,
    method: 'post',
    data,
    timeout: AI_GENERATE_TIMEOUT
  })
}

export function setStrategyAiCandidateStatus (changeId, status) {
  return request({
    url: `${api.aiWorkspace}/changes/${changeId}/status`,
    method: 'post',
    data: { status }
  })
}

export function getScriptTemplateList (params = {}) {
  return request({
    url: api.scriptTemplates,
    method: 'get',
    params
  })
}

export function getIndicatorListForStrategy (params = {}) {
  return request({
    url: api.indicators,
    method: 'get',
    params
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

export function getStrategyPositionOwnership (id) {
  return request({
    url: api.positionOwnership,
    method: 'get',
    params: { id }
  })
}

export function repairStrategyPositionOwnership (data) {
  return request({
    url: api.positionOwnershipRepair,
    method: 'post',
    data
  })
}

export function getStrategyAssetList (params = {}) {
  return request({
    url: api.strategyAssets,
    method: 'get',
    params
  })
}

export function runStrategyBacktest (data) {
  const payload = { ...(data || {}) }
  const timeout = Number(payload.timeout) > 0 ? Number(payload.timeout) : BACKTEST_TIMEOUT
  delete payload.timeout
  return request({
    url: api.strategyBacktestRun,
    method: 'post',
    data: payload,
    timeout
  })
}

export function runStrategyFactorResearch (data) {
  const payload = { ...(data || {}) }
  const timeout = Number(payload.timeout) > 0 ? Number(payload.timeout) : BACKTEST_TIMEOUT
  delete payload.timeout
  return request({
    url: api.strategyFactorResearch,
    method: 'post',
    data: payload,
    timeout
  })
}

export function getStrategyFactorResearchHistory (params = {}) {
  return request({
    url: api.strategyFactorResearchHistory,
    method: 'get',
    params
  })
}

export function getStrategyFactorResearchRun (runId) {
  return request({
    url: api.strategyFactorResearchGet,
    method: 'get',
    params: { runId }
  })
}

export function getStrategyBacktestHistory (params = {}) {
  return request({
    url: api.strategyBacktestHistory,
    method: 'get',
    params
  })
}

export function getStrategyBacktestRun (runId) {
  return request({
    url: api.strategyBacktestGet,
    method: 'get',
    params: { runId }
  })
}

export function runStrategyEvolution (data) {
  return request({
    url: api.strategyEvolutionRun,
    method: 'post',
    data,
    timeout: 1800000
  })
}

export function estimateStrategyEvolution (data) {
  return request({
    url: api.strategyEvolutionEstimate,
    method: 'post',
    data
  })
}

export function getStrategyEvolutionParameterSpace (sourceId) {
  return request({
    url: api.strategyEvolutionParameterSpace,
    method: 'get',
    params: { sourceId }
  })
}

export function getStrategyEvolutionJob (jobId) {
  return request({
    url: `${api.strategyEvolutionJobs}/${jobId}`,
    method: 'get'
  })
}

export function getStrategyEvolutionJobs (params = {}) {
  return request({
    url: api.strategyEvolutionJobs,
    method: 'get',
    params
  })
}

export function cancelStrategyEvolutionJob (jobId) {
  return request({
    url: `${api.strategyEvolutionJobs}/${jobId}/cancel`,
    method: 'post'
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

export function getScriptSourcePublishReadiness (sourceId) {
  return request({
    url: api.scriptSourcePublishReadiness,
    method: 'get',
    params: { id: sourceId }
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

export function compileScriptSource (data) {
  return request({
    url: api.compileScriptSource,
    method: 'post',
    data
  })
}
