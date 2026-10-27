import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const componentPath = fileURLToPath(
  new URL('../../src/views/backtest-center/index.vue', import.meta.url)
)
const source = fs.readFileSync(componentPath, 'utf8')
const portfolioResultPath = fileURLToPath(
  new URL('../../src/views/backtest-center/PortfolioResult.vue', import.meta.url)
)
const portfolioResultSource = fs.readFileSync(portfolioResultPath, 'utf8')
const klineChartPath = fileURLToPath(
  new URL('../../src/views/indicator-analysis/components/KlineChart.vue', import.meta.url)
)
const klineChartSource = fs.readFileSync(klineChartPath, 'utf8')
const backtestRangeLocalePath = fileURLToPath(
  new URL('../../src/locales/backtest-range-overrides.js', import.meta.url)
)
const backtestRangeLocaleSource = fs.readFileSync(backtestRangeLocalePath, 'utf8')

test('backtest center compiles a source manifest before accepting runtime controls', () => {
  assert.match(source, /compileScriptSource\(\{ sourceId \}\)/)
  assert.match(source, /this\.manifest = compiled\.data && compiled\.data\.manifest/)
  assert.match(source, /return Boolean\(this\.manifest && this\.manifest\.leverageAllowed\)/)
})

test('backtest center visual accents follow the configured system theme color', () => {
  assert.match(source, /class="theme-ready-tag"/)
  assert.doesNotMatch(source, /<a-tag v-if="manifest" color="green"/)
  assert.match(source, /primaryColor: state => state\.app\.color/)
  assert.match(source, /color: \[this\.primaryColor, '#94a3b8'\]/)
  for (const selector of ['\\.step-badge', '\\.empty-orbit', '\\.empty-preview-card > \\.anticon']) {
    assert.match(source, new RegExp(`${selector} \\{[^}]*var\\(--primary-color`))
  }
})

test('backtest center follows routed source ids after keep-alive activation', () => {
  assert.match(source, /'\$route\.query\.sourceId' \(\)/)
  assert.match(source, /activated \(\)[\s\S]*?forceReload: true, preserveParams: true/)
  assert.match(source, /this\.sources\.find\(item => Number\(item\.id\) === routeSourceId\)/)
  assert.match(source, /await this\.syncRouteSource\(\{ fallback: true \}\)/)
})

test('backtest source refresh discards stale params when the saved code hash changes', () => {
  assert.match(source, /previousCodeHash = String\(\(this\.manifest && this\.manifest\.codeHash\)/)
  assert.match(source, /previousCodeHash === nextCodeHash/)
  assert.match(source, /preserveParams && sameSourceVersion/)
  assert.match(source, /this\.result = previousResult/)
  assert.match(source, /:disabled="runDisabled"/)
  assert.match(source, /return this\.sourceContractLoading \|\| !this\.manifest/)
})

test('source loading is prioritized and detail compilation runs concurrently', () => {
  assert.match(source, /await this\.loadSources\(\)[\s\S]*?await this\.syncRouteSource/)
  assert.match(source, /const \[response, compiled\] = await Promise\.all\(\[/)
  assert.doesNotMatch(source, /await this\.refreshPage\(\)[\s\S]*?const routeSourceId/)
})

test('history loads only the active mode and opens the drawer immediately', () => {
  assert.match(source, /@click="openHistoryDrawer"/)
  assert.match(source, /openHistoryDrawer \(\) \{[\s\S]*?this\.historyVisible = true/)
  assert.match(source, /requestedMode === 'factor'[\s\S]*?getStrategyFactorResearchHistory[\s\S]*?: await getStrategyBacktestHistory/)
  assert.doesNotMatch(source, /const \[portfolioResponse, factorResponse\] = await Promise\.all/)
})

test('backtest center submits the Strategy API V2 contract as an asynchronous job', () => {
  assert.match(source, /startStrategyBacktestJob\(\{[\s\S]*?sourceId: this\.form\.sourceId[\s\S]*?startDate:[\s\S]*?endDate:[\s\S]*?params: this\.params/)
  assert.match(source, /getStrategyBacktestJob\(this\.activeJobId\)/)
  const runMethod = source.match(/async run \(\) \{([\s\S]*?)\n    \},\n    async runFactorResearch/)
  assert.ok(runMethod)
  assert.doesNotMatch(runMethod[1], /this\.result = null/)
  assert.doesNotMatch(source, /strategy_config|script_params|strict_mode|strategy_code/)
})

test('closed trades expose lifecycle, prices, wallet equity, and profit tone', () => {
  for (const field of ['entry_time', 'exit_time', 'entry_price', 'exit_price', 'balance']) {
    assert.match(source, new RegExp(`dataIndex: '${field}'`))
  }
  assert.match(source, /dataIndex: 'profit'[\s\S]*?profitTone\(value\)/)
  assert.match(source, /number > 0\) return 'positive'/)
  assert.match(source, /number < 0\) return 'negative'/)
})

test('backtest workbench keeps execution controls visible and moves history into a drawer', () => {
  assert.match(source, /class="run-action-bar"/)
  assert.match(source, /class="config-scroll"/)
  assert.match(source, /<a-drawer[\s\S]*?backtest-history-drawer/)
  assert.match(source, /v-for="item in history"/)
  assert.doesNotMatch(source, /class="panel history-panel"/)
})

test('backtest and factor workspaces open settings by default and align the shared research range label', () => {
  assert.match(source, /settingsVisible: true/)
  assert.match(source, /\.command-bar__range \.command-label \{ grid-column-start: 1; grid-column-end: 4; \}/)
  assert.doesNotMatch(source, /grid-column: 1 \/ -1/)
})

test('sticky research controls use an opaque surface and cover the seam while scrolling', () => {
  assert.match(source, /\.command-bar \{[^}]*background: #fff;/)
  assert.match(source, /box-shadow: 0 -10px 0 #f1f3f5/)
  assert.match(source, /\.theme-dark \.command-bar \{[^}]*background: #111111;/)
  assert.match(source, /box-shadow: 0 -10px 0 #080808/)
  assert.doesNotMatch(source, /\.command-bar \{[^}]*backdrop-filter:/)
})

test('saved backtest details expose an in-drawer loading state', () => {
  assert.match(source, /v-if="historyDetailLoading" class="drawer-detail-loading"/)
  assert.match(source, /this\.historyDetailLoading = true/)
  assert.match(source, /this\.historyVisible = false[\s\S]*?finally/)
  assert.match(source, /strategyV2\.backtest\.historyLoading/)
})

test('CTA source summary exposes the concrete instrument instead of only its count', () => {
  assert.match(source, /this\.manifest\.strategyType === 'cta' && instruments\.length/)
  assert.match(source, /instruments\.map\(this\.formatInstrument\)\.join\(', '\)/)
  assert.match(source, /marketContext\.\$\{marketType\}/)
})

test('backtest source selection makes CTA and portfolio strategies directly discoverable', () => {
  assert.match(source, /data-testid="backtest-source-category"/)
  assert.match(source, /value="portfolio_strategy"/)
  assert.match(source, /portfolioSources \(\)/)
  assert.match(source, /sourceCategory = routeSource\.asset_type === 'portfolio_strategy'/)
  assert.match(source, /fundamentalDependencies \(\)/)
  assert.match(source, /fundamentalDependencyHint/)
})

test('saved history switches the source category before showing a portfolio strategy', () => {
  assert.match(source, /run\.source_id[\s\S]*?this\.sourceCategory = this\.source && this\.source\.asset_type === 'portfolio_strategy'/)
})

test('portfolio results show contribution by symbol before single-symbol chart drill-down', () => {
  assert.match(portfolioResultSource, /isPortfolioStrategy \(\)/)
  assert.match(portfolioResultSource, /portfolioContributionRows \(\)/)
  assert.match(portfolioResultSource, /class="portfolio-contribution-panel"/)
  assert.match(portfolioResultSource, /@click="activeReviewSymbol = item\.symbol"/)
  assert.match(portfolioResultSource, /portfolioReviewHint/)
})

test('portfolio drawdown chart uses initial capital and backend drawdown points', () => {
  assert.match(portfolioResultSource, /const base = this\.initialCapital > 0/)
  assert.match(portfolioResultSource, /const savedDrawdown = Number\(item\.drawdown\)/)
  assert.match(portfolioResultSource, /item\.drawdown !== undefined/)
  assert.match(portfolioResultSource, /strategyV2\.backtest\.maxDrawdownHint/)
})

test('portfolio chart reserves separate vertical space for the legend and first plot', () => {
  assert.match(portfolioResultSource, /legend: \{[\s\S]*?top: 6,[\s\S]*?itemGap: 16/)
  assert.match(portfolioResultSource, /\{ left: 58, right: 56, top: 58, height: 184 \}/)
})

test('trade review centers the full entry-to-exit range and draws after data is ready', () => {
  assert.match(portfolioResultSource, /@load="renderReviewMarkers"/)
  assert.match(portfolioResultSource, /Math\.ceil\(tradeBars \* 1\.2\)/)
  assert.match(portfolioResultSource, /chart\.scrollByDistance\(-Math\.max/)
})

test('trade review prefers persisted bounded candles and skips a duplicate market request', () => {
  assert.match(portfolioResultSource, /:initial-rows="reviewRows"/)
  assert.match(portfolioResultSource, /this\.result\.reviewCandles/)
  assert.match(klineChartSource, /initialRows: \{/)
  assert.match(klineChartSource, /let formattedData = seededRows\.length \? formatKlineData\(seededRows\) : \[\]/)
  assert.match(klineChartSource, /if \(formattedData\.length\)[\s\S]*?hasMoreHistory\.value = false[\s\S]*?else \{[\s\S]*?\/api\/indicator\/kline/)
})

test('trade review falls back to the historical K-line endpoint when a saved snapshot is absent', () => {
  assert.match(portfolioResultSource, /v-if="canRenderTradeReview"/)
  assert.match(portfolioResultSource, /this\.reviewRows\.length > 0 \|\|/)
  assert.match(portfolioResultSource, /normalizeTradeReviewSymbol\(row && row\.symbol\)/)
})

test('persisted trade review candles retain aggregate entry and exit times for markers', () => {
  assert.match(portfolioResultSource, /const aggregateWindow = this\.reviewAggregate\.window/)
  assert.match(portfolioResultSource, /return \{ \.\.\.aggregateWindow, beforeTime: null, limit: this\.reviewRows\.length \}/)
  assert.match(portfolioResultSource, /const entryTime = this\.reviewWindow\.entryTime/)
  assert.match(portfolioResultSource, /const exitTime = this\.reviewWindow\.exitTime/)
})

test('execution history opens on the newest fills and benchmark curves stop at real coverage', () => {
  assert.match(portfolioResultSource, /executionRows \(\) \{[\s\S]*?timestampMillisecondsUtc\(right && right\.time\)/)
  assert.match(portfolioResultSource, /benchmarkCurveRows \(\) \{[\s\S]*?time <= coverageEnd/)
  assert.match(portfolioResultSource, /effectiveBenchmarkStatus === 'partial'/)
})

test('partial benchmark metrics stay visible and review-only chart hides inactive indicator controls', () => {
  assert.match(portfolioResultSource, /\['available', 'partial'\]\.includes\(this\.effectiveBenchmarkStatus\)/)
  assert.match(portfolioResultSource, /value: this\.hasBenchmarkMetrics \? this\.formatPercent\(this\.result\.benchmarkTotalReturn\) : '-'/)
  assert.match(portfolioResultSource, /:show-indicator-toolbar="false"/)
  assert.match(klineChartSource, /showIndicatorToolbar: \{[\s\S]*?default: true/)
  assert.match(klineChartSource, /v-if="showIndicatorToolbar && \(showIndicatorLibraryTrigger \|\| activePresetIndicators\.length\)"[\s\S]*?class="indicator-toolbar"/)
})

test('benchmark-relative metrics render independently from benchmark chart coverage', () => {
  assert.match(portfolioResultSource, /v-if="hasBenchmarkRelativeAnalysis" class="benchmark-analysis-card"/)
  assert.match(portfolioResultSource, /hasBenchmarkRelativeAnalysis \(\) \{\s*return Number\(this\.benchmarkRelativeMetrics\.observations \|\| 0\) > 0\s*\}/)
  assert.match(portfolioResultSource, /status \|\| \(this\.hasMetricValue\(value\) \? 'available' : 'unavailable'\)/)
})

test('downside risk and advanced benchmark metrics render with legacy-result guards', () => {
  assert.match(portfolioResultSource, /v-if="hasDownsideRiskAnalysis" class="benchmark-analysis-card risk-analysis-card"/)
  assert.match(portfolioResultSource, /hasDownsideRiskAnalysis \(\)[\s\S]*?'sortinoRatio'[\s\S]*?'maxDrawdownRecoveryDays'/)
  assert.match(portfolioResultSource, /v-if="hasAdvancedBenchmarkMetrics"/)
  assert.match(portfolioResultSource, /advancedBenchmarkMetricCards \(\)[\s\S]*?mSquaredAlpha[\s\S]*?outperformancePayoffRatio/)
  assert.match(portfolioResultSource, /var\(--primary-color, #1890ff\)/)
  assert.match(portfolioResultSource, /color-mix\(in srgb, var\(--analysis-accent\)/)
})

test('risk analysis defaults to compact previews and expands full diagnostics on demand', () => {
  assert.match(portfolioResultSource, /riskAnalysisExpanded: false/)
  assert.match(portfolioResultSource, /benchmarkAnalysisExpanded: false/)
  assert.match(portfolioResultSource, /v-if="!riskAnalysisExpanded" class="benchmark-analysis-preview"/)
  assert.match(portfolioResultSource, /riskMetricCards\.slice\(0, 3\)/)
  assert.match(portfolioResultSource, /<template v-if="riskAnalysisExpanded">/)
  assert.match(portfolioResultSource, /v-if="!benchmarkAnalysisExpanded" class="benchmark-analysis-preview"/)
  assert.match(portfolioResultSource, /benchmarkMetricCards\.slice\(0, 3\)/)
  assert.match(portfolioResultSource, /v-if="benchmarkAnalysisExpanded"/)
})

test('backtests default to the latest completed date and reject today in the picker', () => {
  assert.match(source, /const latestCompleteDate = moment\(\)\.subtract\(1, 'day'\)\.startOf\('day'\)/)
  assert.match(source, /endDate: latestCompleteDate/)
  assert.match(source, /current\.isAfter\(moment\(\)\.subtract\(1, 'day'\), 'day'\)/)
})

test('backtest quick ranges use calendar periods and respect the compiled runtime limit', () => {
  assert.ok(source.indexOf('data-testid="backtest-range-presets"') < source.indexOf('<div class="form-grid">'))
  for (const key of ['1m', '6m', '1y', '2y']) {
    assert.ok(source.includes(`key: '${key}'`), `missing backtest preset: ${key}`)
  }
  assert.match(source, /backtest-range-\$\{preset\.key\}/)
  assert.match(source, /endDate\.clone\(\)\.subtract\(preset\.amount, preset\.unit\)/)
  assert.match(source, /rangeDays > this\.backtestRangeLimitDays/)
  assert.match(source, /item\.rangeDays === this\.backtestRangeLimitDays/)
  assert.match(source, /key: 'max'[\s\S]*?amount: this\.backtestRangeLimitDays/)
  assert.match(source, /applyRangePreset \(preset\)[\s\S]*?if \(!preset \|\| preset\.disabled\) return[\s\S]*?preset\.startDate\.clone\(\)/)
})

test('backtest quick ranges explain disabled options and remain readable in dark and narrow layouts', () => {
  assert.match(source, /quickRange\.unavailable/)
  assert.match(source, /preset\.disabled/)
  assert.match(source, /\.theme-dark \.range-preset-wrap \/deep\/ \.ant-btn\[disabled\]/)
  assert.match(source, /@media \(max-width: 720px\)[\s\S]*?\.range-presets__buttons \{ width: 100%/)
  for (const text of ['1个月', '6个月', '1年', '2年', '{days} 天']) {
    assert.ok(backtestRangeLocaleSource.includes(text), `missing reviewed quick-range translation: ${text}`)
  }
})
