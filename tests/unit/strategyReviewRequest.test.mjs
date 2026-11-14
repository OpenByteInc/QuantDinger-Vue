import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import http from 'node:http'
import test from 'node:test'
import vm from 'node:vm'
import axios from 'axios'
import { translateStrategyRuntimeError } from '../../src/utils/strategyRuntimeError.js'

function reviewApi () {
  const context = vm.createContext({
    axios,
    storage: { get: () => null },
    notification: { error () {} },
    i18n: { t: key => key },
    ACCESS_TOKEN: 'token',
    USER_INFO: 'user',
    USER_ROLES: 'roles',
    VueAxios: {},
    translateStrategyRuntimeError,
    document: { cookie: '' }
  })
  const requestSource = readFileSync(new URL('../../src/utils/request.js', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/export const /g, 'const ')
    .replace('export default request', '')
    .replace(/export \{[^}]+\}/g, '')
  vm.runInContext(requestSource, context)
  const apiSource = readFileSync(new URL('../../src/api/strategy.js', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/export function /g, 'function ')
  vm.runInContext(apiSource + '\nglobalThis.api = { getStrategyReviewReport, getStrategyReviewReportHistory, request }', context)
  return context.api
}

test('review generation uses the AI timeout and preserves its request contract', async () => {
  const api = reviewApi()
  const calls = []
  api.request.defaults.adapter = async config => {
    calls.push(config)
    return { data: { code: 1 }, status: 200, headers: {}, config }
  }
  const data = { lookback_days: 30, include_ai: true, language: 'en-US' }
  await api.getStrategyReviewReport(42, data)
  assert.equal(calls[0].url, '/api/strategies/review-report')
  assert.equal(calls[0].method, 'post')
  assert.equal(calls[0].params.id, 42)
  assert.deepEqual(JSON.parse(calls[0].data), data)
  assert.equal(calls[0].timeout, 180000)

  const configured = { ...data, timeout: 240000 }
  await api.getStrategyReviewReport(42, configured)
  assert.equal(calls[1].timeout, 240000)
  assert.deepEqual(JSON.parse(calls[1].data), data)
  assert.equal(configured.timeout, 240000)

  for (const timeout of [0, -1, 'bad', Infinity]) {
    await api.getStrategyReviewReport(42, { ...data, timeout })
    assert.equal(calls.at(-1).timeout, 180000)
  }

  await api.getStrategyReviewReportHistory(42, { limit: 5 })
  const history = calls.at(-1)
  assert.equal(history.url, '/api/strategies/review-report/history')
  assert.equal(history.method, 'get')
  assert.equal(history.params.id, 42)
  assert.equal(history.params.limit, 5)
  assert.equal(history.timeout, 30000)
})

test('a real review response beyond 30 seconds succeeds and errors are never retried', { timeout: 45000 }, async () => {
  const api = reviewApi()
  let calls = 0
  let timer
  let mode = 'slow'
  const server = http.createServer((req, res) => {
    calls++
    req.resume()
    if (mode === 'error') {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ msg: 'review failed' }))
      return
    }
    timer = setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ code: 1, data: { history_id: 7 } }))
    }, mode === 'slow' ? 31000 : 500)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  api.request.defaults.baseURL = `http://127.0.0.1:${server.address().port}`
  api.request.defaults.proxy = false
  try {
    const report = await api.getStrategyReviewReport(42, { include_ai: true })
    assert.equal(report.data.history_id, 7)
    assert.equal(calls, 1)

    mode = 'timeout'
    await assert.rejects(api.getStrategyReviewReport(42, { timeout: 50 }), error => error.code === 'ECONNABORTED')
    clearTimeout(timer)
    assert.equal(calls, 2)

    mode = 'error'
    await assert.rejects(api.getStrategyReviewReport(42), /review failed/)
    assert.equal(calls, 3)
  } finally {
    clearTimeout(timer)
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
})
