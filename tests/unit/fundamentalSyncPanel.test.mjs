import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import moment from 'moment'

function harness (fetch, sync = async () => ({ code: 1 })) {
  const source = fs.readFileSync(new URL('../../src/views/settings/FundamentalSyncPanel.vue', import.meta.url), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'component =')
  const context = { moment, getUniverseFundamentals: fetch, syncUniverseFundamentals: sync, clearTimeout, setTimeout }
  vm.runInNewContext(script, context)
  const options = context.component
  const state = { ...options.data(), $t: key => key, supportedUniverses: [], running: false }
  Object.entries(options.methods).forEach(([key, method]) => { state[key] = method.bind(state) })
  return state
}

test('changing the universe prevents a slow old response from replacing current coverage', async () => {
  const responses = []
  const state = harness(() => new Promise(resolve => responses.push(resolve)))
  state.universeId = 1
  const first = state.load()
  state.universeId = 2
  const second = state.load()
  responses[1]({ code: 1, data: { universe: 2 } })
  await second
  responses[0]({ code: 1, data: { universe: 1 } })
  await first
  assert.equal(state.result.universe, 2)
  assert.equal(state.loading, false)
})

test('clearing fields while a request runs clears the spinner and ignores that response', async () => {
  let resolve
  const state = harness(() => new Promise(done => { resolve = done }))
  state.universeId = 1
  const pending = state.load()
  state.fields = []
  state.selectionChanged()
  assert.equal(state.loading, false)
  resolve({ code: 1, data: { old: true } })
  await pending
  assert.equal(state.result, null)
})

test('non-US universes use the supported snapshot mode', () => {
  const state = harness(async () => ({ code: 1, data: {} }))
  state.universeId = 2
  state.supportedUniverses = [{ id: 2, market: 'HKStock' }]
  state.universeChanged()
  assert.equal(state.mode, 'current')
})

test('manual sync defaults to incremental and full refresh is explicit', async () => {
  const requests = []
  const state = harness(async () => ({ code: 1, data: {} }), async (_, data) => {
    requests.push(data)
    return { code: 1 }
  })
  state.universeId = 1
  await state.start(false)
  state.forceFull = true
  await state.start(false)
  assert.equal(requests[0].incremental, true)
  assert.equal(requests[1].incremental, false)
  state.universeChanged()
  assert.equal(state.forceFull, false)
})

test('all supported fields are acceptance defaults', () => {
  const state = harness(async () => ({ code: 1, data: {} }))
  assert.equal(state.fields.length, 14)
  assert.ok(state.fields.includes('market_cap'))
  assert.ok(state.fields.includes('net_income_ttm'))
  assert.ok(state.fields.includes('debt_to_equity'))
})

test('coverage requests preserve the selected synchronization mode', async () => {
  let params
  const state = harness(async (_id, values) => {
    params = values
    return { code: 1, data: {} }
  })
  state.universeId = 1
  state.mode = 'history'
  await state.load()
  assert.equal(params.mode, 'history')
})

test('coverage states distinguish no data, partial data, and stale reports', () => {
  const state = harness(async () => ({ code: 1, data: {} }))
  assert.equal(state.rowState({ ready: false }), 'no_data')
  assert.equal(state.rowState({ ready: false, period_end: '2026-06-30' }), 'partial')
  assert.equal(state.rowState({ ready: false, stale: true, period_end: '2026-01-01' }), 'stale')
})
