import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import strategyV2Messages from '../../src/locales/lang/strategy-v2.js'

const componentPath = fileURLToPath(
  new URL('../../src/views/backtest-center/PortfolioResult.vue', import.meta.url)
)
const source = fs.readFileSync(componentPath, 'utf8')

test('legacy history uses the equity curve when holding snapshots are empty', () => {
  assert.match(source, /snapshots\.length \? snapshots : \(this\.result\.equityCurve \|\| \[\]\)/)
})

test('missing legacy attribution is recovered from saved executions', () => {
  assert.match(source, /executions\.reduce\(\(sum, item\) => sum \+ Number\(item\.commission \|\| 0\), 0\)/)
  assert.match(source, /this\.initialCapital > 0 \? totalCommission \/ this\.initialCapital : 0/)
  assert.match(source, /counts\[status\] \+= 1/)
})

test('restored legacy details are disclosed in the result trust bar', () => {
  assert.match(source, /v-if="legacyBackfilled"/)
  assert.match(source, /strategyV2\.backtest\.legacyBackfillHint/)
})

test('rebalance history distinguishes strategy batches from risk exits', () => {
  assert.match(source, /dataIndex: 'recordType'/)
  assert.match(source, /strategyV2\.backtest\.recordReason\./)
  assert.match(source, /_rowKey: `\$\{row\.time \|\| 'execution'\}:\$\{index\}`/)
  assert.match(source, /this\.result\.protectionEvents/)
  assert.match(source, /row\.recordType = 'protection'/)
})

test('completed-trade table uses the shared compact scrollbar treatment', () => {
  assert.match(source, /class="completed-trades-table"/)
  assert.match(source, /\.completed-trades-table \/deep\/ \.ant-table-body::\-webkit-scrollbar \{ width: 6px; height: 6px; \}/)
  assert.match(source, /scrollbar-color: var\(--qd-scrollbar-thumb/)
})

test('portfolio chart separates directional exposure and hides ledger cash by default', () => {
  assert.match(source, /const longExposure = curve\.map/)
  assert.match(source, /const shortExposure = curve\.map/)
  assert.match(source, /step: 'end'/)
  assert.match(source, /selected: \{ \[cashName\]: false \}/)
  assert.match(source, /formatPercentagePointValue\(this\.result\.excessReturn\)/)
})

test('portfolio contribution rows disclose open positions and use attributed profit', () => {
  assert.match(source, /v-if="item\.hasOpenPosition" class="open-position-tag"/)
  assert.match(source, /strategyV2\.backtest\.status\.open_position_only/)
  assert.match(source, /item\.hasOpenPosition && !item\.trades \? 'backtest-center\.quantity'/)
  assert.match(source, /item\.hasOpenPosition && !item\.trades \? 'strategyV2\.backtest\.unrealizedProfit'/)
  assert.match(source, /const hasOpenPosition = Math\.abs\(positionQuantity\) > 1e-12/)
  assert.match(source, /profit: hasAttribution \? attributedProfit : tradeProfit/)
  assert.match(source, /this\.isPortfolioStrategy && this\.activeContributionRow/)
})

test('tail-risk analytics expose sample quality and format loss fractions as percentages', () => {
  assert.match(source, /result\.tailRiskObservations/)
  assert.match(source, /result\.valueAtRisk95Status/)
  assert.match(source, /result\.valueAtRisk99Status/)
  assert.match(source, /format === 'rate' \? this\.formatMetricRate\(value, false\)/)
  assert.match(source, /strategyV2\.backtest\.riskMetrics\.tailNote/)

  for (const messages of Object.values(strategyV2Messages)) {
    assert.equal(typeof messages['strategyV2.backtest.riskMetrics.tailTitle'], 'string')
    assert.equal(typeof messages['strategyV2.backtest.riskMetrics.valueAtRisk95Hint'], 'string')
    assert.equal(typeof messages['strategyV2.backtest.riskMetrics.tailStatus.insufficient_history'], 'string')
  }
})

test('English Strategy V2 interface copy contains no Han text', () => {
  const leaks = Object.entries(strategyV2Messages['en-US'])
    .filter(([, value]) => typeof value === 'string' && /\p{Script=Han}/u.test(value))
    .map(([key]) => key)

  assert.deepEqual(leaks, [])
})
