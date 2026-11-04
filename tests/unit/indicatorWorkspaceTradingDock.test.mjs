import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import quickTradeRecords from '../../src/locales/quick-trade-records.js'
import quickTradeFloatingMessages from '../../src/locales/lang/quick-trade-floating.js'
import { calculatePositionMetrics } from '../../src/components/QuickTradePanel/positionMetrics.js'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('indicator workspace keeps account mode balances and records in the trading dock', () => {
  const source = read('src/components/QuickTradePanel/QuickTradePanel.vue')
  const workspace = read('src/views/indicator-ide/index.vue')

  assert.match(source, /v-if="embeddedDock && !floatingConsole" class="qt-dock-header"/)
  assert.match(workspace, /class="ide-quick-float__titlebar" @mousedown="startQuickTradeDrag"/)
  assert.match(workspace, /v-else[\s\S]*?class="ide-quick-float-launcher"[\s\S]*?@click="toggleQuickTradeDrawer"/)
  assert.match(workspace, /<quick-trade-panel[\s\S]*?embedded-dock[\s\S]*?side-dock[\s\S]*?floating-console/)
  assert.doesNotMatch(source, /@click="\$emit\('collapse'\)"/)
  assert.match(source, /class="qt-dock-segmented"/)
  assert.match(source, /quickTrade\.spotAvailable/)
  assert.match(source, /quickTrade\.swapAvailable/)
  assert.match(source, /activeDockTab === 'positions'/)
  assert.match(source, /quickTrade\.openOrders/)
  assert.match(source, /activeDockTab: 'positions'/)
  assert.match(source, /\{ key: 'tradeRecords', label: this\.\$t\('quickTrade\.floating\.records'\)/)
  assert.ok(source.indexOf("{ key: 'openOrders'") < source.indexOf("{ key: 'positions'"))
  assert.ok(source.indexOf("{ key: 'positions'") < source.indexOf("{ key: 'tradeRecords'"))
  assert.match(source, /import \{ parseUtcAwareInstant \} from '@\/utils\/utcInstant'/)
  assert.match(source, /trade && trade\.is_close/)
  assert.match(source, /trade\.close_side/)
  assert.match(source, /quickTrade\.action\.closeLong/)
  assert.match(source, /quickTrade\.realizedPnl/)
  assert.match(source, /qt-trade-metric--pnl/)
  assert.match(source, /\['openOrders', 'tradeRecords'\]\.includes\(activeDockTab\)/)
  assert.match(source, /dockTpslEnabled: false/)
  assert.match(source, /class="qt-dock-trade-settings"/)
  assert.match(source, /class="qt-dock-segmented qt-dock-margin-segmented"/)
  assert.match(source, /overlay-class-name="qt-leverage-popover"/)
  assert.match(source, /leveragePresets: \[1, 3, 5, 10, 20, 50, 100\]/)
  assert.match(source, /v-for="percent in \[10, 25, 50, 100\]"/)
  assert.match(source, /setQuickAmountByPercent\(percent, 'buy'\)/)
  assert.match(source, /v-if="!embeddedDock" class="qt-section-header"/)
  assert.match(source, /cancelQuickTradeOrder\(\{ trade_id: trade\.id \}\)/)
  assert.match(source, /\(this\.selectedStockBrokerClient \|\| broker\.alpaca\)\.cancelOrder\(trade\.id, \{ credential_id: this\.selectedCredentialId \}\)/)
  assert.match(source, /activeDockTab === 'openOrders' && canCancelTrade\(t\)/)
  assert.match(source, /class="qt-dock-header"[\s\S]*?class="qt-dock-trade-settings"[\s\S]*?class="qt-dock-balance"/)
  assert.match(source, /marketType \(\) \{[\s\S]*?syncTradeModeFromProps/)
  assert.match(source, /getQuickTradeHistory\(\{[\s\S]*?credential_id: credentialId,[\s\S]*?symbol,[\s\S]*?market_type: marketType/)
  assert.match(source, /this\.loadPosition\(\)[\s\S]*?this\.loadHistory\(\)/)
  assert.match(source, /grid-template-columns: minmax\(340px, 32%\) minmax\(0, 1fr\)/)
  assert.match(source, /v-model="dockTpslEnabled"/)
  assert.match(source, /v-if="embeddedDock && supportsNativeProtection"/)
  assert.match(source, /v-if="supportsNativeProtection" v-show="!embeddedDock \|\| dockTpslEnabled"/)
  assert.doesNotMatch(source, /v-if="supportsNativeProtection"\s+class="qt-risk-action-stack"/)
  assert.match(source, /class="qt-risk-action-stack"[\s\S]*?handleSubmit\('buy'\)[\s\S]*?handleSubmit\('sell'\)/)
  assert.match(source, /v-show="!embeddedDock \|\| dockTpslEnabled"/)
  assert.match(source, /'is-tpsl-open': embeddedDock && supportsNativeProtection && dockTpslEnabled/)
  assert.match(source, /tp_price: useTp \? \(this\.tpPrice \|\| 0\) : 0/)
  assert.match(source, /\.qt-risk-action-stack\s*\{[\s\S]*?position: sticky;[\s\S]*?bottom: 0;/)
  assert.match(source, /\.qt-risk-action-stack\.is-tpsl-open\s*\{[\s\S]*?position: relative;/)
  assert.match(source, /\.qt-risk-action-stack\.is-tpsl-open \.qt-tpsl-card\s*\{[\s\S]*?background: #f8fafc !important;/)
  assert.match(source, /body\.dark \.qt-leverage-popover/)
  assert.match(source, /background: var\(--primary-color, #52c41a\)/)
})

test('indicator workspace scopes crypto product identity away from stock data and orders', () => {
  const source = read('src/components/QuickTradePanel/QuickTradePanel.vue')
  const workspace = read('src/views/indicator-ide/index.vue')

  assert.match(workspace, /:exchange-id="market === 'Crypto' \? cryptoExchangeId : ''"/)
  assert.match(workspace, /:market-type="market === 'Crypto' \? cryptoMarketType : 'spot'"/)
  assert.match(workspace, /:instrument-id="market === 'Crypto' \? currentInstrumentId : ''"/)
  assert.match(workspace, /:product-type="market === 'Crypto' \? currentProductType : ''"/)
  assert.match(workspace, /:api-family="market === 'Crypto' \? currentApiFamily : ''"/)

  const stockOrder = source.slice(source.indexOf('async submitStockOrder (side)'), source.indexOf('friendlyOrderErrorMessage', source.indexOf('async submitStockOrder (side)')))
  assert.match(stockOrder, /\(this\.selectedStockBrokerClient \|\| broker\.alpaca\)\.placeOrder\(payload\)/)
  assert.doesNotMatch(stockOrder, /instrument_id|product_type|api_family|resolve_product/)
})

test('quick trade lifecycle and profit labels exist in every desktop locale', () => {
  const requiredKeys = [
    'quickTrade.entryExitPrice',
    'quickTrade.realizedPnl',
    'quickTrade.pnlPending',
    'quickTrade.action.openLong',
    'quickTrade.action.openShort',
    'quickTrade.action.closeLong',
    'quickTrade.action.closeShort'
  ]

  for (const [locale, messages] of Object.entries(quickTradeRecords)) {
    for (const key of requiredKeys) {
      assert.equal(typeof messages[key], 'string', `${locale} is missing ${key}`)
      assert.ok(messages[key].trim(), `${locale} has an empty ${key}`)
    }
  }
})

test('spot trading cannot submit a sell without a current holding', () => {
  const source = read('src/components/QuickTradePanel/QuickTradePanel.vue')

  assert.match(source, /:disabled="!canSubmitSell"/)
  assert.match(source, /requested > 0 && requested <= this\.spotSellAvailable/)
})

test('exchange position values are not overwritten by the chart price source', () => {
  const source = read('src/components/QuickTradePanel/QuickTradePanel.vue')
  const applyPrice = source.slice(source.indexOf('applyNewPrice (price)'), source.indexOf('handleAddAccountClick', source.indexOf('applyNewPrice (price)')))

  assert.doesNotMatch(applyPrice, /refreshPositionMarks/)
  assert.match(source, /market_value/)
})

test('position metrics distinguish invested margin from current exposure', () => {
  const swap = calculatePositionMetrics({
    size: 0.0061,
    entry_price: 81093,
    mark_price: 82828,
    notional_usdt: 505.25,
    initial_margin: 100,
    unrealized_pnl: 10.5841,
    leverage: 5
  }, true)

  assert.equal(swap.invested_amount, 100)
  assert.equal(swap.current_value, 505.25)
  assert.equal(swap.pnl_percent, 10.5841)
  assert.equal(swap.effective_leverage, 5)

  const inferredLeverage = calculatePositionMetrics({
    size: 0.0061,
    entry_price: 81093,
    mark_price: 82828,
    notional_usdt: 504.63,
    initial_margin: 101.3,
    unrealized_pnl: 9.99,
    leverage: 1
  }, true)
  assert.equal(inferredLeverage.effective_leverage, 5)

  const fallbackSwap = calculatePositionMetrics({
    size: 0.01,
    entry_price: 50000,
    mark_price: 51000,
    unrealized_pnl: 10,
    leverage: 5
  }, true)
  assert.equal(fallbackSwap.invested_amount, 100)
  assert.equal(fallbackSwap.current_value, 510)
  assert.equal(fallbackSwap.pnl_percent, 10)

  const spot = calculatePositionMetrics({
    size: 2,
    entry_price: 100,
    mark_price: 110,
    unrealized_pnl: 20,
    leverage: 1
  }, false)
  assert.equal(spot.invested_amount, 200)
  assert.equal(spot.current_value, 220)
  assert.equal(spot.pnl_percent, 10)
})

test('position investment labels exist in every desktop locale', () => {
  for (const [locale, messages] of Object.entries(quickTradeFloatingMessages)) {
    assert.ok(messages['quickTrade.investedAmount'], `${locale} is missing invested amount`)
    assert.ok(messages['quickTrade.currentValue'], `${locale} is missing current value`)
  }
})

test('volume pane is represented by a toolbar toggle', () => {
  const source = read('src/views/indicator-analysis/components/KlineChart.vue')

  assert.match(source, /id: 'vol',[\s\S]*shortName: 'VOL'/)
  assert.match(source, /if \(indicatorId === 'vol'\) return volumeVisible\.value/)
  assert.match(source, /if \(indicator\.id === 'vol'\)[\s\S]*toggleVolumePane\(\)/)
  assert.match(source, /removeIndicator\(volPaneId, 'VOL'\)/)
})
