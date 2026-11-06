import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { clampFloatingPanelPosition, snapFloatingPanelPosition } from '../../src/utils/floatingPanel.mjs'

test('floating panel position stays inside the chart at every edge', () => {
  const dimensions = {
    containerWidth: 1200,
    containerHeight: 800,
    panelWidth: 520,
    panelHeight: 720,
    inset: 10
  }
  assert.deepEqual(clampFloatingPanelPosition({ ...dimensions, x: -200, y: -100 }), { x: 10, y: 10 })
  assert.deepEqual(clampFloatingPanelPosition({ ...dimensions, x: 2000, y: 900 }), { x: 670, y: 70 })
})

test('floating panel snaps only when it is close to a chart edge', () => {
  const dimensions = {
    containerWidth: 1200,
    containerHeight: 800,
    panelWidth: 520,
    panelHeight: 720,
    inset: 10
  }
  assert.deepEqual(snapFloatingPanelPosition({ x: 658, y: 22 }, dimensions), { x: 670, y: 10 })
  assert.deepEqual(snapFloatingPanelPosition({ x: 420, y: 70 }, dimensions), { x: 420, y: 70 })
})

test('indicator IDE keeps every required quick-trade capability in the floating console', async () => {
  const panel = await readFile(new URL('../../src/components/QuickTradePanel/QuickTradePanel.vue', import.meta.url), 'utf8')
  const ide = await readFile(new URL('../../src/views/indicator-ide/index.vue', import.meta.url), 'utf8')
  for (const contract of [
    'floating-console',
    'selectedCredentialId',
    'orderType',
    'limitPrice',
    'spotBuyInputMode',
    'spotSellInputMode',
    'marginMode',
    'leverage',
    'dockTpslEnabled',
    "handleSubmit('buy')",
    "handleSubmit('sell')",
    'dockTabItems'
  ]) assert.match(panel, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

  for (const contract of [
    'startQuickTradeDrag',
    'startQuickTradeResize',
    'moveQuickTradeResize',
    'stopQuickTradeResize',
    'toggleQuickTradePin',
    'quickTradeMinimized',
    'quickTradeFloatingStyle',
    'quickTradeSize: this.quickTradeSize'
  ]) assert.match(ide, new RegExp(contract))

  assert.doesNotMatch(ide, /quickTradeAiDecisionFilter/)
  assert.doesNotMatch(ide, /ai-decision-filter-enabled/)
  assert.match(panel, /v-for="percent in \[10, 25, 50, 100\]"/)
  assert.match(panel, /class="qtc-order-type"/)
  assert.match(panel, /class="qtc-settings"/)
  assert.match(panel, /take_profit_price: useTp \? Number\(this\.tpPrice \|\| 0\) : 0/)
  assert.match(panel, /stop_loss_price: useSl \? Number\(this\.slPrice \|\| 0\) : 0/)
  assert.match(ide, /@price-change="payload => handlePanePriceChange\(pane\.id, payload\)"/)
  assert.match(ide, /handlePanePriceChange \(paneId, payload\)/)
  assert.match(ide, /handleChartPriceChange \(payload\)/)
  assert.match(ide, /:exchange-id="market === 'Crypto' \? cryptoExchangeId : ''"/)
  assert.match(ide, /@exchange-change="handleQuickTradeExchangeChange"/)
  assert.match(ide, /handleQuickTradeExchangeChange \(context\)/)
  assert.match(panel, /this\.\$emit\('exchange-change', \{/)
  assert.match(panel, /syncCredentialToExchange \(exchangeId\)/)
  assert.match(panel, /String\(selected\.exchange_id \|\| ''\).*=== normalizedExchangeId/)
  assert.match(panel, /if \(this\.balanceLoading \|\| this\.balanceErrorMessage\) return false/)
  assert.doesNotMatch(ide, /this\.qtPrice = 0\s*\n\s*this\.quickTradeMinimized/)
  assert.doesNotMatch(panel, /ai_decision_filter/)
  assert.doesNotMatch(panel, /eventRadar/)
  assert.match(panel, /emitPositionOverlayChange \(\)/)
  assert.match(panel, /this\.\$emit\('position-overlay-change'/)
  assert.match(panel, /entryTimestamp: this\.positionEntryTimestamp\(position\)/)
  assert.match(ide, /:quick-trade-positions="pane\.id === activeChartPaneId \? quickTradeChartPositions : \[\]"/)
  assert.match(ide, /@position-overlay-change="handleQuickTradePositionOverlayChange"/)
  assert.match(ide, /\['Crypto', 'USStock', 'HKStock'\]\.includes\(this\.market\)/)
})

test('quick-trade positions render a removable cost line and entry marker on the chart', async () => {
  const chart = await readFile(new URL('../../src/views/indicator-analysis/components/KlineChart.vue', import.meta.url), 'utf8')

  assert.match(chart, /quickTradePositions:/)
  assert.match(chart, /const addedQuickTradeOverlayIds = ref\(\[\]\)/)
  assert.match(chart, /name: 'quickTradeCostLine'[\s\S]*?dashedValue: \[7, 5\]/)
  assert.match(chart, /endX = Math\.max\(startX, bounding\.width\)/)
  assert.match(chart, /createYAxisFigures:[\s\S]*?text: label[\s\S]*?text: price/)
  assert.match(chart, /tagY \+ 11[\s\S]*?tagY \+ 27/)
  assert.match(chart, /name: 'signalTag'[\s\S]*?source: 'quick-trade'/)
  assert.match(chart, /clearQuickTradePositionOverlays\(\)/)
  assert.match(chart, /watch\(\(\) => props\.quickTradePositions/)
})
