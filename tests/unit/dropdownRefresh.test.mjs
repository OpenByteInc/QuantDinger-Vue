import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('indicator picker opens from cache and refreshes stale data in the background', () => {
  const source = read('src/views/indicator-ide/index.vue')

  assert.match(source, /@dropdownVisibleChange="onWatchlistDropdownVisibleChange"/)
  assert.match(source, /onWatchlistDropdownVisibleChange \(visible\)[\s\S]*visible && !this\.loadingWatchlist[\s\S]*this\.loadWatchlist\(\)/)
  assert.match(source, /@visibleChange="onIndicatorDropdownVisibleChange"/)
  assert.match(source, /onIndicatorDropdownVisibleChange \(visible\)[\s\S]*!this\.indicators\.length[\s\S]*this\.loadIndicators\(\)/)
  assert.match(source, /Date\.now\(\) - Number\(this\.indicatorsLoadedAt \|\| 0\) > 30000[\s\S]*this\.loadIndicators\(\{ background: true \}\)/)
  assert.match(source, /if \(!background\) this\.applyIndicatorRouteSelection\(\)/)
  assert.match(source, /toggleCodeDrawer \(\)[\s\S]*this\.indicatorDropdownVisible = false/)
  assert.match(source, /v-for="w in toolbarWatchlistOptions"/)
  assert.match(source, /toolbarWatchlistOptions \(\)[\s\S]*const currentKey = marketContextKey\(current\)[\s\S]*return \[\{ \.\.\.sameSymbol, \.\.\.current \}, \.\.\.list\]/)
  assert.match(source, /handleCryptoExchangeChange \(value\)[\s\S]*this\.selectedWatchlistKey = marketContextKey/)
  assert.match(source, /handleCryptoMarketTypeChange \(value\)[\s\S]*this\.selectedWatchlistKey = marketContextKey/)
})

test('backtest strategy picker refreshes source options when opened', () => {
  const source = read('src/views/backtest-center/index.vue')

  assert.match(source, /data-testid="backtest-source-select"[\s\S]*@dropdownVisibleChange="onSourceDropdownVisibleChange"/)
  assert.match(source, /onSourceDropdownVisibleChange \(visible\)[\s\S]*!visible \|\| this\.sourcesLoading[\s\S]*this\.loadSources\(\)/)
})

test('strategy workspace picker refreshes scripts when opened', () => {
  const source = read('src/views/strategy-ide/index.vue')

  assert.match(source, /<a-dropdown[\s\S]*@visibleChange="onScriptDropdownVisibleChange"[\s\S]*class="script-select strategy-source-dropdown-trigger"/)
  assert.match(source, /onScriptDropdownVisibleChange \(visible\)[\s\S]*visible && !this\.loadingScripts[\s\S]*this\.loadSources\(\)/)
})

test('live strategy creation picker refreshes sources when opened', () => {
  const source = read('src/views/strategy-center/components/LiveStrategyEditor.vue')

  assert.match(source, /v-model="model\.scriptSourceId"[\s\S]*@dropdownVisibleChange="onSourceDropdownVisibleChange"/)
  assert.match(source, /onSourceDropdownVisibleChange \(visible\)[\s\S]*visible && !this\.loadingSources[\s\S]*this\.loadSources\(\)/)
})

test('robot symbol picker refreshes the full watchlist when opened', () => {
  const source = read('src/views/executor-strategies/index.vue')

  assert.match(source, /data-testid="robot-symbol-select"[\s\S]*@dropdownVisibleChange="onSymbolDropdownVisibleChange"/)
  assert.match(source, /onSymbolDropdownVisibleChange \(visible\)[\s\S]*!visible \|\| this\.loadingWatchlist[\s\S]*this\.loadWatchlist\(\)/)
  assert.match(source, /:dropdown-style="\{ maxHeight: '360px', overflowY: 'auto' \}"/)
})
