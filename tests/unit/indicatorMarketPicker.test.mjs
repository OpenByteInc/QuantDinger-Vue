import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function harness (request, strategy = false) {
  const source = fs.readFileSync(new URL('../../src/views/indicator-ide/components/IndicatorMarketPicker.vue', import.meta.url), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'component =')
  const context = { request, loadEnabledMarketOptions: async () => [] }
  vm.runInNewContext(script, context)
  const options = context.component
  const errors = []
  const state = { ...options.data(), isStrategyMode: strategy, $refs: {}, $t: key => key, $nextTick: fn => fn(), $message: { error: text => errors.push(text) } }
  for (const [name, method] of Object.entries(options.methods)) state[name] = method.bind(state)
  return { state, options, errors }
}

test('indicator picker requests later pages and uses server totals beyond fifty', async () => {
  const calls = []
  const { state } = harness(async config => {
    calls.push(config.params)
    return { code: 1, data: { items: [{ id: 61, asset_type: 'indicator' }], total: 73 } }
  })
  await state.changePage(7)
  assert.equal(calls[0].page, 7)
  assert.equal(calls[0].page_size, 10)
  assert.equal(state.total, 73)
  assert.equal(state.items[0].id, 61)
})

test('filter and page-size changes reset the page and preserve submitted search on navigation', async () => {
  const calls = []
  const { state } = harness(async config => {
    calls.push(config.params)
    return { code: 1, data: { items: [], total: 120 } }
  })
  state.page = 6
  state.keyword = '  trend  '
  state.pricingType = 'vip_free'
  state.codeVisibility = 'hidden'
  await state.applyFilters()
  assert.equal(calls[0].page, 1)
  assert.equal(calls[0].keyword, 'trend')
  assert.equal(calls[0].vip_free, 1)
  assert.equal(calls[0].pricing_type, undefined)
  assert.equal(calls[0].code_visibility, 'hidden')
  state.keyword = 'unfinished search'
  await state.changePage(2)
  assert.equal(calls[1].keyword, 'trend')
  await state.changePageSize(2, 20)
  assert.equal(calls[2].page, 1)
  assert.equal(calls[2].page_size, 20)
})

test('strategy picker sends the market classification filters with pagination', async () => {
  let params
  const { state } = harness(async config => {
    params = config.params
    return { code: 1, data: { items: [{ id: 11, asset_type: 'script_template', strategy_type: 'portfolio' }], total: 80 } }
  }, true)
  Object.assign(state, { strategyType: 'portfolio', market: 'HKStock', bindingMode: 'universe', directionMode: 'long_only', pricingType: 'paid' })
  await state.applyFilters()
  assert.equal(params.asset_type, 'script_template')
  assert.equal(params.strategy_type, 'portfolio')
  assert.equal(params.market, 'HKStock')
  assert.equal(params.binding_mode, 'universe')
  assert.equal(params.direction_mode, 'long_only')
  assert.equal(params.pricing_type, 'paid')
  assert.equal(state.items.length, 1)
  assert.equal(state.total, 80)
})

test('late search responses cannot replace a newer filter result or clear its loading state', async () => {
  const responses = []
  const { state } = harness(() => new Promise(resolve => responses.push(resolve)))
  const first = state.applyFilters()
  state.keyword = 'new'
  const second = state.applyFilters()
  responses[0]({ code: 1, data: { items: [{ id: 1 }], total: 60 } })
  await first
  assert.equal(state.loading, true)
  assert.equal(state.items.length, 0)
  responses[1]({ code: 1, data: { items: [{ id: 2 }], total: 1 } })
  await second
  assert.equal(state.items[0].id, 2)
  assert.equal(state.total, 1)
  assert.equal(state.loading, false)
})

test('shrinking result sets reload the last valid page', async () => {
  const pages = []
  const { state } = harness(async config => {
    pages.push(config.params.page)
    return { code: 1, data: { items: [], total: 12 } }
  })
  await state.changePage(8)
  assert.deepEqual(pages, [8, 2])
  assert.equal(state.page, 2)
  assert.equal(state.loading, false)
})

test('closing the picker invalidates outstanding requests', async () => {
  let resolve
  const { state, options, errors } = harness(() => new Promise(done => { resolve = done }))
  const pending = state.loadItems()
  options.watch.visible.handler.call(state, false)
  resolve({ code: 0, msg: 'outdated failure' })
  await pending
  assert.equal(errors.length, 0)
  assert.equal(state.loading, false)
  assert.equal(state.items.length, 0)
})

test('both picker modes apply marketplace ranking on the server and preserve it across pages', async () => {
  for (const strategy of [false, true]) {
    const calls = []
    const { state, options } = harness(async config => {
      calls.push(config.params)
      return { code: 1, data: { items: [], total: 150 } }
    }, strategy)
    assert.equal(state.sortBy, 'recommended')
    for (const option of options.computed.sortOptions.call(state)) {
      state.page = 5
      state.sortBy = option.value
      await state.applyFilters()
      assert.equal(calls.at(-1).sort_by, option.value)
      assert.equal(calls.at(-1).page, 1)
      await state.changePage(2)
      assert.equal(calls.at(-1).sort_by, option.value)
      assert.equal(calls.at(-1).page, 2)
    }
  }
})
