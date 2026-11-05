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

test('strategy builder searches and persists one exact executable product', () => {
  const source = read('src/views/strategy-ide/index.vue')
  const editor = read('src/views/strategy-ide/components/StrategyEditor.vue')

  assert.match(source, /searchSymbols\(\{[\s\S]*?market: this\.runConfig\.market_category/)
  assert.match(source, /getSymbolCapabilities\(\{[\s\S]*?symbol: this\.runConfig\.symbol/)
  assert.match(source, /instrument_id: String\(cfg\.instrument_id/)
  assert.match(source, /product_type: String\(cfg\.product_type/)
  assert.match(source, /api_family: String\(cfg\.api_family/)
  assert.match(editor, /v-if="runtimeProductCanSwitch"/)
  assert.match(editor, /runtimeAvailableMarketTypes/)
})
