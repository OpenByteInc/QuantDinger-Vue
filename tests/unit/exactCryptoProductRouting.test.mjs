import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('indicator workspace only switches products exposed by the exact symbol capability', () => {
  const source = read('src/views/indicator-ide/index.vue')

  assert.match(source, /getSymbolCapabilities/)
  assert.match(source, /v-if="canSwitchCryptoMarketType"/)
  assert.match(source, /availableCryptoMarketTypes\.includes\('spot'\)[\s\S]*?availableCryptoMarketTypes\.includes\('swap'\)/)
  assert.match(source, /:available-market-types="availableCryptoMarketTypes"/)
  assert.match(source, /:instrument-id="market === 'Crypto' \? currentInstrumentId : ''"/)
  assert.match(source, /:product-type="market === 'Crypto' \? currentProductType : ''"/)
  assert.match(source, /:api-family="market === 'Crypto' \? currentApiFamily : ''"/)
})

test('quick trade protects product identity across reads and order submission', () => {
  const source = read('src/components/QuickTradePanel/QuickTradePanel.vue')

  assert.match(source, /if \(!this\.normalizedAvailableMarketTypes\.includes\(nextMode\)\) return/)
  assert.match(source, /STRICT_PRODUCT_IDENTITY_TYPES = new Set\(\['tokenized_equity', 'stock_perpetual', 'direct_equity'\]\)/)
  assert.match(source, /function appendStrictProductIdentity[\s\S]*?STRICT_PRODUCT_IDENTITY_TYPES\.has\(productType\)/)
  assert.match(source, /if \(vm\.instrumentId\) payload\.instrument_id = vm\.instrumentId/)
  assert.match(source, /appendStrictProductIdentity\(params, this\)[\s\S]*?getQuickTradePosition\(params\)/)
  assert.match(source, /appendStrictProductIdentity\(payload, this\)/)
  assert.match(source, /payload\.resolve_product = true/)
  assert.match(source, /const res = await closeQuickTradePosition\(payload\)/)
  const closePayloadStart = source.indexOf('const payload = {', source.indexOf('async handleClosePosition'))
  const closeSubmit = source.indexOf('closeQuickTradePosition(payload)', closePayloadStart)
  const closePayloadSource = source.slice(closePayloadStart, closeSubmit)
  assert.match(closePayloadSource, /appendStrictProductIdentity\(payload, this\)/)
  assert.match(closePayloadSource, /payload\.resolve_product = true/)
})

test('strategy builder selects a logical asset and previews its current chart product', () => {
  const source = read('src/views/strategy-ide/index.vue')
  const editor = read('src/views/strategy-ide/components/StrategyEditor.vue')

  assert.match(source, /const res = await getWatchlist\(\)/)
  assert.match(source, /groupWatchlistAssets/)
  assert.doesNotMatch(source, /searchStrategySymbols/)
  assert.match(source, /asset_id: selected\.asset_id/)
  assert.match(source, /const symbol = String\(this\.runConfig\.symbol\)[\s\S]*?getSymbolCapabilities\(\{[\s\S]*?symbol,/)
  assert.match(source, /const sourceOwnsExchange = Boolean\(this\.strategyRuntimeContract\.hasExchange\)/)
  assert.match(source, /const exchangeId = sourceOwnsExchange \? String\(this\.runConfig\.exchange_id[\s\S]*?exchange_id: exchangeId/)
  assert.match(source, /symbol !== String\(this\.runConfig\.symbol\)[\s\S]*?sourceOwnsExchange !== Boolean\(this\.strategyRuntimeContract\.hasExchange\)/)
  assert.match(editor, /v-if="runtimeProductCanSwitch"/)
  assert.match(editor, /runtimeAvailableMarketTypes/)
  assert.match(editor, /option-label-prop="label"/)
  assert.match(editor, /:filter-option="filterRuntimeSymbolOption"/)
})
