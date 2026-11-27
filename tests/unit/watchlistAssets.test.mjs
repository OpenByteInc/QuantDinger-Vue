import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  groupWatchlistAssets,
  watchlistAssetKey,
  watchlistContextLabel,
  watchlistDisplayName,
  watchlistPayload
} from '../../src/utils/watchlistAssets.js'
import messages from '../../src/locales/lang/watchlist-assets.js'

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
const btc = Object.freeze({
  asset_id: 11,
  market: 'Crypto',
  symbol: 'BTC/USDT',
  name: 'Bitcoin',
  product_type: 'crypto',
  market_types: ['spot', 'swap'],
  exchange_ids: ['binance', 'okx']
})
const stockPerpetual = Object.freeze({
  asset_id: 12,
  market: 'Crypto',
  symbol: 'QQQ/USDT',
  name: 'QQQ perpetual',
  product_type: 'stock_perpetual',
  underlying_market: 'USStock',
  underlying_symbol: 'QQQ',
  market_types: ['swap'],
  exchange_ids: ['bitget']
})
const modalSource = read('src/components/Watchlist/AddWatchlistModal.vue')

test('HK aliases share selection identity even when saved catalog IDs differ', () => {
  const current = { asset_id: 101, market: 'HKStock', symbol: '07709', product_type: 'hkstock' }
  const legacy = { ...current, asset_id: 202, symbol: 'HK07709' }
  assert.equal(watchlistAssetKey(current), watchlistAssetKey(legacy))
  assert.equal(groupWatchlistAssets([current, legacy]).length, 1)
  assert.deepEqual(watchlistPayload(legacy), { asset_id: 202 })
})

function modal (api = {}) {
  const script = modalSource
    .match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*\n/gm, '')
    .replace('export default', 'return')
  const definition = new Function(
    'addWatchlist',
    'getWatchlist',
    'searchAssets',
    'groupWatchlistAssets',
    'watchlistAssetKey',
    'watchlistContextLabel',
    'watchlistPayload',
    script
  )(
    api.add || (async () => ({ code: 1 })),
    api.get || (async () => ({ code: 1, data: [] })),
    api.search || (async () => ({ code: 1, data: [btc] })),
    groupWatchlistAssets,
    watchlistAssetKey,
    watchlistContextLabel,
    watchlistPayload
  )
  const events = []
  const vm = {
    ...definition.data(),
    visible: true,
    watchlist: [],
    markets: ['Crypto', 'USStock'],
    initialMarket: definition.props.initialMarket.default,
    $t: key => key,
    $message: { success () {}, error () {} },
    $emit: (...args) => events.push(args)
  }
  for (const [key, method] of Object.entries(definition.methods)) vm[key] = method.bind(vm)
  for (const [key, getter] of Object.entries(definition.computed)) {
    Object.defineProperty(vm, key, { get: () => getter.call(vm) })
  }
  vm.market = 'Crypto'
  return { vm, events, definition }
}

test('AI add-watchlist dialog does not inherit the current research market', () => {
  const source = read('src/views/ai-analysis/components/CopilotWorkbench.vue')
  const dialog = source.match(/<add-watchlist-modal\b[\s\S]*?\/>/)[0]
  assert.ok(!dialog.includes('initial-market'))
})

test('opening and reopening the add dialog defaults to Crypto after choosing Futures', async () => {
  const searches = []
  const { vm, definition } = modal({ search: async input => {
    searches.push(input.market)
    return { code: 1, data: [] }
  } })
  vm.markets = ['Futures', 'USStock', 'Crypto']
  vm.loadFuturesCatalog = async () => {}
  definition.watch.visible.call(vm, true)
  assert.equal(vm.market, 'Crypto')
  vm.changeMarket('Futures')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(vm.market, 'Futures')
  vm.visible = false
  definition.watch.visible.call(vm, false)
  vm.visible = true
  definition.watch.visible.call(vm, true)
  assert.equal(vm.market, 'Crypto')
  assert.deepEqual(searches, ['Crypto', 'Futures', 'Crypto'])
})

test('default market falls back to the first available tab if Crypto is unavailable', () => {
  const { vm, definition } = modal()
  vm.markets = ['Futures', 'USStock']
  definition.watch.visible.call(vm, true)
  assert.equal(vm.market, 'USStock')
})

test('one logical asset is independent from venue and spot or swap selection', () => {
  const alternateContext = { ...btc, exchange_id: 'gate', market_type: 'swap', instrument_id: 'BTC_USDT' }
  assert.equal(watchlistAssetKey(btc), 'asset:11')
  assert.equal(watchlistAssetKey(alternateContext), 'asset:11')
  assert.equal(groupWatchlistAssets([btc, alternateContext]).length, 1)
  assert.deepEqual(watchlistPayload(alternateContext), { asset_id: 11 })
})

test('exchange-listed equity products remain separate logical assets', () => {
  const tokenized = { ...stockPerpetual, asset_id: 13, product_type: 'tokenized_equity' }
  assert.notEqual(watchlistAssetKey(stockPerpetual), watchlistAssetKey(tokenized))
  assert.equal(groupWatchlistAssets([stockPerpetual, tokenized]).length, 2)
})

test('legacy fallback key separates product families without binding a venue', () => {
  const first = { ...stockPerpetual, asset_id: 0, exchange_id: 'bitget' }
  const second = { ...first, exchange_id: 'gate' }
  const tokenized = { ...first, product_type: 'tokenized_equity' }
  assert.equal(watchlistAssetKey(first), watchlistAssetKey(second))
  assert.notEqual(watchlistAssetKey(first), watchlistAssetKey(tokenized))
})

test('watchlist labels describe product availability without showing a bound venue', () => {
  const t = key => ({
    'marketContext.spot': 'spot',
    'marketContext.swap': 'perpetual',
    'marketContext.product.stock_perpetual': 'stock perpetual'
  })[key] || key
  assert.equal(watchlistContextLabel(btc, t), 'spot · perpetual · Bitcoin')
  assert.equal(watchlistContextLabel(stockPerpetual, t), 'stock perpetual · perpetual · QQQ perpetual')
  assert.ok(!watchlistContextLabel(btc, t).includes('BINANCE'))
})

test('watchlist context appends the supplied company name without repeating a ticker', () => {
  const t = key => messages['zh-CN'][key] || { 'marketContext.spot': '现货' }[key] || key
  const stock = { market: 'CNStock', product_type: 'cnstock', symbol: '600519', market_types: ['spot'], name: '贵州茅台' }
  assert.equal(watchlistContextLabel(stock, t), 'A股 · 现货 · 贵州茅台')
  const usStock = { ...stock, market: 'USStock', product_type: 'usstock', symbol: 'INTC', name: 'Intel' }
  assert.equal(watchlistContextLabel(usStock, t), '美股 · 现货 · Intel')
  assert.equal(watchlistContextLabel({ ...usStock, name: ' intc ' }, t), '美股 · 现货')
  assert.equal(watchlistContextLabel({ ...usStock, name: 'INTC', display_name: 'Intel' }, t), '美股 · 现货 · Intel')
  assert.equal(watchlistContextLabel({ ...usStock, name: '', company_name: 'Intel' }, t), '美股 · 现货 · Intel')
  assert.equal(watchlistContextLabel(stock, t, { includeName: false }), 'A股 · 现货')
  assert.equal(watchlistContextLabel({ symbol: 'UNKNOWN' }, t), 'UNKNOWN')
  assert.equal(watchlistContextLabel(null, t), '')
})

test('add dialog omits the explanatory line and does not duplicate its separate asset name', () => {
  assert.doesNotMatch(modalSource, /watchlistAssets\.hint|watchlist-help/)
  const { vm } = modal()
  assert.ok(!vm.contextLabel(btc).includes('Bitcoin'))
  for (const path of [
    'src/views/indicator-ide/index.vue',
    'src/views/strategy-ide/index.vue',
    'src/views/strategy-center/components/LiveStrategyEditor.vue',
    'src/views/ai-analysis/components/CopilotWorkbench.vue'
  ]) {
    assert.match(read(path), /<add-watchlist-modal/)
  }
})

test('watchlist names contain only supplied company or asset metadata', () => {
  assert.equal(watchlistDisplayName({ symbol: '600519', name: '贵州茅台', market_types: ['spot'] }), '贵州茅台')
  assert.equal(watchlistDisplayName({ symbol: 'INTC', name: 'INTC', display_name: 'Intel' }), 'Intel')
  assert.equal(watchlistDisplayName({ symbol: 'INTC', name: 'Intel', company_name: ' Intel Corporation ' }), 'Intel Corporation')
  assert.equal(watchlistDisplayName(btc), 'Bitcoin')
  assert.equal(watchlistDisplayName({ symbol: 'BTC/USDT', name: 'BTC' }), 'BTC')
  assert.equal(watchlistDisplayName({ symbol: 'INTC', name: ' intc ' }), '')
  assert.equal(watchlistDisplayName({ symbol: 'UNKNOWN', market_types: ['spot', 'swap'] }), '')
  assert.equal(watchlistDisplayName(null), '')
})

test('watchlist cards show a market tag before the ticker and a name-only subtitle', () => {
  const workbench = read('src/views/ai-analysis/components/CopilotWorkbench.vue')
  const card = workbench.slice(workbench.indexOf('class="watch-main"'), workbench.indexOf('<div class="watch-actions">'))
  assert.match(card, /class="watch-market-tag" :class="marketPillClass\(item.market\)"/)
  assert.ok(card.indexOf('watch-market-tag') < card.indexOf('{{ item.symbol }}'))
  assert.match(card, /class="watch-name" :title="watchlistDisplayName\(item\)"/)
  assert.doesNotMatch(card, /watchlistContextLabel|market_types|cryptoProductLabel/)
  assert.match(card, /:title="marketLabel\(item.market\)"[^>]*>\{\{ watchMarketLabel\(item.market\) \}\}/)
  assert.match(workbench, /grid-template-areas: 'identity quote' 'name quote';/)
  assert.match(workbench, /\.watch-heading \{\s*grid-area: identity;/)
  assert.match(workbench, /\.watch-main \.watch-name \{\s*grid-area: name;/)
  assert.match(workbench, /\.watch-market-data \{\s*grid-area: quote;/)
  assert.match(workbench, /\.watch-main \.watch-name \{[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/)
  const indicator = read('src/views/indicator-ide/index.vue')
  for (const market of ['crypto', 'usstock', 'cnstock', 'hkstock', 'forex', 'futures']) {
    const color = indicator.match(new RegExp(`\\.wl-mkt-${market} \\{ background: ([^;]+);`))[1]
    assert.ok(workbench.includes(`.watch-market-tag.market-${market} { background: ${color}; }`))
  }
})

test('compact market tags are localized without changing full market names', () => {
  const workbench = read('src/views/ai-analysis/components/CopilotWorkbench.vue')
  const body = workbench.match(/watchMarketLabel \(market\) \{([\s\S]*?)\n {4}\},/)[1]
  const label = new Function('market', body)
  for (const [locale, copy] of Object.entries(messages)) {
    const vm = { $t: key => copy[key] || key, marketLabel: market => `full:${market}` }
    for (const market of ['Crypto', 'USStock', 'HKStock', 'CNStock', 'Forex', 'Futures', 'FUTURES', 'MOEX']) {
      const key = `watchlistAssets.marketShort.${market.toLowerCase()}`
      assert.ok(copy[key], `${locale} is missing ${key}`)
      assert.equal(label.call(vm, market), copy[key])
    }
    assert.equal(label.call(vm, 'Unknown'), 'full:Unknown')
  }
  assert.equal(messages['en-US']['watchlistAssets.marketShort.crypto'], 'Crypto')
  assert.equal(messages['en-US']['watchlistAssets.marketShort.usstock'], 'US')
  assert.equal(messages['en-US']['watchlistAssets.marketShort.hkstock'], 'HK')
  assert.equal(messages['zh-CN']['watchlistAssets.marketShort.crypto'], '加密')
})

test('AI watchlist normalization retains company metadata when the primary name is only a ticker', () => {
  const workbench = read('src/views/ai-analysis/components/CopilotWorkbench.vue')
  const body = workbench.match(/normalizeSymbolOption \(item\) \{([\s\S]*?)\n {4}\},/)[1]
  const normalize = new Function('item', body).bind({ context: { market: 'USStock' } })
  const item = normalize({ symbol: 'INTC', name: 'INTC', company_name: 'Intel Corporation', product_type: 'usstock', market_types: ['spot'] })
  assert.equal(item.company_name, 'Intel Corporation')
  assert.ok(watchlistContextLabel(item, key => key).endsWith(' · Intel Corporation'))
})

test('standard market product labels are translated in every supported locale', () => {
  const productTypes = ['usstock', 'hkstock', 'cnstock', 'forex', 'futures', 'moex']
  for (const [locale, localeMessages] of Object.entries(messages)) {
    for (const productType of productTypes) {
      const key = `marketContext.product.${productType}`
      assert.ok(localeMessages[key], `${locale} is missing ${key}`)
      const label = watchlistContextLabel({
        market: 'USStock',
        symbol: 'QQQ',
        product_type: productType,
        market_types: []
      }, translationKey => localeMessages[translationKey] || translationKey)
      assert.ok(!label.includes('marketContext.'), `${locale} exposes ${key}`)
    }
  }
})

test('add dialog searches logical assets without venue or product-context filters', async () => {
  let params
  const { vm } = modal({ search: async input => { params = input; return { code: 1, data: [btc] } } })
  vm.keyword = 'BTC'
  await vm.search()
  assert.deepEqual(params, { market: 'Crypto', keyword: 'BTC', limit: 60 })
  assert.equal(vm.groups.length, 1)
  vm.selectGroup(vm.groups[0])
  assert.equal(vm.selected.asset_id, 11)
})

test('saving persists only the logical asset id', async () => {
  let payload
  const { vm, events } = modal({ add: async input => { payload = input; return { code: 1 } } })
  vm.selected = btc
  await vm.save()
  assert.deepEqual(payload, { asset_id: 11 })
  assert.deepEqual(events.map(event => event[0]), ['added', 'close'])
})

test('duplicate detection blocks the same asset from another chart context', async () => {
  let writes = 0
  const { vm } = modal({ add: async () => { writes += 1; return { code: 1 } } })
  vm.watchlist = [btc]
  vm.selected = { ...btc, exchange_id: 'okx', market_type: 'swap' }
  await vm.save()
  assert.equal(writes, 0)
  assert.equal(vm.alreadyAdded(vm.selected), true)
})

test('indicator and AI entry points share the same collection-only modal', () => {
  for (const path of ['src/views/indicator-ide/index.vue', 'src/views/ai-analysis/components/CopilotWorkbench.vue']) {
    const source = read(path)
    assert.ok(source.includes('<add-watchlist-modal'))
    assert.ok(source.includes('@added="reloadWatchlistOnly"'))
    assert.ok(!source.includes(':initial-exchange='))
    assert.ok(!source.includes(':initial-market-type='))
  }
})

test('watchlist prices are loaded from the persisted server-side watchlist', () => {
  const marketApi = read('src/api/market.js')
  const priceLoader = marketApi.match(/export function getWatchlistPrices[\s\S]*?\n}\n/)[0]
  assert.ok(priceLoader.includes('url: marketApi.GetWatchlistPrices'))
  assert.ok(!priceLoader.includes('parameter.watchlist'))
  assert.ok(!priceLoader.includes('JSON.stringify'))
})

test('chart context and live account routing remain separate from watchlist identity', () => {
  const indicator = read('src/views/indicator-ide/index.vue')
  const quickTrade = read('src/components/QuickTradePanel/QuickTradePanel.vue')
  const deployment = read('../quantdinger_backend/backend_api_python/app/services/strategy_v2/deployment.py')
  assert.ok(indicator.includes(':asset-id="currentAssetId"'))
  assert.ok(indicator.includes(':exchange-id="market === \'Crypto\' ? cryptoExchangeId : \'\'"'))
  assert.ok(quickTrade.includes('payload.asset_id = Number(vm.assetId)'))
  assert.ok(deployment.includes('exchange_id=exchange_id'))
  assert.ok(!deployment.includes('exchange_id=str(item.get("exchange_id")'))
})

test('all supported languages have complete nonempty watchlist copy', () => {
  const keys = Object.keys(messages['en-US']).sort()
  assert.equal(Object.keys(messages).length, 11)
  for (const locale of Object.values(messages)) {
    assert.deepEqual(Object.keys(locale).sort(), keys)
    assert.ok(Object.values(locale).every(value => typeof value === 'string' && value.trim()))
  }
})

test('dated futures labels do not inherit the internal spot routing convention', () => {
  const label = watchlistContextLabel({ market: 'Futures', symbol: 'MESZ26', product_type: 'futures', market_types: ['spot'] }, key => key)
  assert.equal(label, 'marketContext.product.futures')
})
