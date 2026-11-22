import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { mergeStrategyLogs } from '../../src/utils/strategyLogPage.js'

function component (name, mocks = {}) {
  let script = fs.readFileSync(new URL(`../../src/views/strategy-center/components/${name}.vue`, import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
  const scope = { console, AbortController, document: { hidden: false }, setTimeout, clearTimeout, setInterval, clearInterval, ...mocks }
  script = script.replace(/^import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]\s*$/gm, (_, names) => {
    for (const name of names.replace(/[{}]/g, '').split(',').map(value => value.trim())) {
      if (!(name in scope)) scope[name] = () => ({})
    }
    return ''
  })
  vm.runInNewContext(script.replace('export default', 'result ='), scope)
  const options = scope.result
  const page = { ...options.data(), strategyId: 7, $i18n: { locale: 'en-US' }, $refs: {}, $nextTick: fn => fn(), $message: { error: () => {} }, $t: key => key }
  for (const [name, method] of Object.entries(options.methods)) page[name] = method.bind(page)
  return { page, options }
}

function pending () {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

test('log merging deduplicates IDs, preserves descending order and bounds memory', () => {
  const current = Array.from({ length: 200 }, (_, id) => ({ id: id + 1 }))
  const result = mergeStrategyLogs(current, [{ id: 201 }, { id: 200, message: 'updated' }])
  assert.equal(result.length, 200)
  assert.equal(result[0].id, 201)
  assert.equal(result[1].message, 'updated')
  assert.equal(result.at(-1).id, 2)
  assert.equal(current[199].message, undefined)
})

test('trade pagination cancels old requests and ignores responses from a previous page', async () => {
  const calls = []
  const { page } = component('TradingRecords', {
    getStrategyTrades: (id, lang, options) => {
      const call = { id, lang, options, ...pending() }
      calls.push(call)
      return call.promise
    }
  })
  const first = page.loadRecords()
  page.recordsPage = 2
  const second = page.loadRecords()
  assert.equal(calls[0].options.signal.aborted, true)
  assert.equal(calls[1].options.page, 2)
  assert.equal(calls[1].options.page_size, 10)
  calls[1].resolve({ code: 1, data: { items: [{ id: 22 }], total: 100 } })
  await second
  calls[0].resolve({ code: 1, data: { items: [{ id: 11 }], total: 90 } })
  await first
  assert.equal(page.records[0].id, 22)
  assert.equal(page.recordsTotal, 100)
  assert.equal(page.recordsLoading, false)
})

test('deactivation cancels trade requests and pending report refreshes', async () => {
  const call = pending()
  const { page, options } = component('TradingRecords', { getStrategyTrades: () => call.promise })
  const work = page.loadRecords()
  const signal = page.recordsController.signal
  options.deactivated.call(page)
  assert.equal(signal.aborted, true)
  assert.equal(page.reportRefreshTimer, null)
  call.resolve({ code: 1, data: { items: [{ id: 1 }], total: 1 } })
  await work
  assert.equal(page.records.length, 0)
})

test('logs have one in-flight request and use the server cursor including filtered rows', async () => {
  const calls = []
  const { page } = component('StrategyLogs', {
    mergeStrategyLogs,
    request: options => {
      const call = { options, ...pending() }
      calls.push(call)
      return call.promise
    }
  })
  const first = page.loadLogs()
  await page.loadLogs()
  assert.equal(calls.length, 1)
  calls[0].resolve({ code: 1, data: [{ id: 10, message: 'ready' }], last_id: 12 })
  await first
  const next = page.loadLogs()
  assert.equal(calls[1].options.params.after_id, 12)
  calls[1].resolve({ code: 1, data: [{ id: 13, message: 'new' }], last_id: 13 })
  await next
  assert.deepEqual(Array.from(page.logs, row => row.id), [13, 10])
})

test('switching strategies cannot append a previous strategy log response', async () => {
  const call = pending()
  const { page } = component('StrategyLogs', { mergeStrategyLogs, request: () => call.promise })
  const work = page.loadLogs()
  const signal = page.logsController.signal
  page.cancelLogRequest()
  page.strategyId = 8
  call.resolve({ code: 1, data: [{ id: 100 }], last_id: 100 })
  await work
  assert.equal(signal.aborted, true)
  assert.equal(page.logs.length, 0)
  assert.equal(page.lastLogId, 0)
})

test('trade API forwards pagination and cancellation to axios', () => {
  const source = fs.readFileSync(new URL('../../src/api/strategy.js', import.meta.url), 'utf8')
  const code = source.match(/export function getStrategyTrades[\s\S]*?\n}/)[0].replace('export ', '')
  const request = options => options
  const scope = { request, api: { trades: '/trades' } }
  vm.runInNewContext(code, scope)
  const signal = new AbortController().signal
  const result = scope.getStrategyTrades(7, 'en', { page: 2, page_size: 10, signal })
  assert.equal(result.signal, signal)
  assert.equal(result.params.page, 2)
  assert.equal(result.params.page_size, 10)
})
