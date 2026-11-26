import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const viewPath = path.join(root, 'src', 'views', 'user-manage', 'index.vue')
const apiPath = path.join(root, 'src', 'api', 'user.js')
const source = fs.readFileSync(viewPath, 'utf8')
const apiSource = fs.readFileSync(apiPath, 'utf8')

test('system overview is centered on Strategy API V2 contracts', () => {
  assert.doesNotMatch(source, /<section class="strategy-contract-banner"/)
  assert.match(source, /systemOverview\.v2Deployments/)
  assert.match(source, /class="summary-sub strategy-class-breakdown"/)
  assert.match(source, /v2_strategies/)
  assert.match(source, /cta_strategies/)
  assert.match(source, /portfolio_strategies/)
  assert.match(source, /robot_strategies/)
})

test('strategy class filter is sent to the admin API', () => {
  assert.match(source, /strategyClassFilter: 'all'/)
  assert.match(source, /strategy_class: this\.strategyClassFilter === 'all'/)
  assert.match(apiSource, /strategy_class/)
})

test('signal-only deployments expose a separate virtual ledger without mixing live totals', () => {
  assert.match(source, /strategySummary\.live_capital/)
  assert.match(source, /strategySummary\.live_pnl/)
  assert.match(source, /strategySummary\.signal_pnl/)
  assert.match(source, /record\.ledger_mode === 'virtual'/)
  assert.match(source, /systemOverview\.virtualLedger/)
  assert.doesNotMatch(source, /formatNumber\(strategySummary\.total_capital\)/)
})

test('admin table exposes source contract, universe, runtime ledger, and activity', () => {
  for (const slot of ['strategySourceInfo', 'strategyClassInfo', 'runtimeInfo', 'activityInfo']) {
    assert.match(source, new RegExp(`slot="${slot}"`))
  }
  assert.match(source, /formatStrategyUniverse/)
  assert.match(source, /formatStrategyMarket/)
})

test('new system overview copy exists in every main locale', () => {
  const localeNames = [
    'ar-SA.js', 'de-DE.js', 'en-US.js', 'fr-FR.js', 'ja-JP.js', 'ko-KR.js',
    'ru-RU.js', 'th-TH.js', 'vi-VN.js', 'zh-CN.js', 'zh-TW.js'
  ]
  for (const name of localeNames) {
    const locale = fs.readFileSync(path.join(root, 'src', 'locales', 'lang', name), 'utf8')
    assert.match(locale, /"systemOverview\.contractTitle"/)
    assert.match(locale, /"systemOverview\.colUniverse"/)
    assert.match(locale, /"systemOverview\.virtualAccount"/)
    assert.match(locale, /"systemOverview\.virtualLedger"/)
    assert.match(locale, /"systemOverview\.virtualPnl"/)
  }
})
