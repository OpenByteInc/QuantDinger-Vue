import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  groupWatchlistAssets,
  watchlistAssetKey,
  watchlistContextLabel,
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
    initialMarket: 'Crypto',
    $t: key => key,
    $message: { success () {}, error () {} },
    $emit: (...args) => events.push(args)
  }
  for (const [key, method] of Object.entries(definition.methods)) vm[key] = method.bind(vm)
  for (const [key, getter] of Object.entries(definition.computed)) {
    Object.defineProperty(vm, key, { get: () => getter.call(vm) })
  }
  vm.market = 'Crypto'
  return { vm, events }
}

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
  assert.equal(watchlistContextLabel(btc, t), 'spot · perpetual')
  assert.equal(watchlistContextLabel(stockPerpetual, t), 'stock perpetual · perpetual')
  assert.ok(!watchlistContextLabel(btc, t).includes('BINANCE'))
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
