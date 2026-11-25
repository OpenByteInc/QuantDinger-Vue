import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const componentPath = fileURLToPath(
  new URL('../../src/views/backtest-center/index.vue', import.meta.url)
)
const source = fs.readFileSync(componentPath, 'utf8')
const polishPath = fileURLToPath(
  new URL('../../src/views/backtest-center/backtest-polish.less', import.meta.url)
)
const polishSource = fs.readFileSync(polishPath, 'utf8')
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

test('backtest leverage is clamped and checked against the source manifest', () => {
  assert.match(source, /@change="handleLeverageChange"/)
  assert.match(source, /Math\.min\(limit, Math\.max\(1,/)
  assert.match(source, /Number\(this\.form\.leverage\) > this\.maxLeverage/)
  assert.match(source, /strategyV2\.leverageExceedsStrategyLimit/)
})

test('risk and benchmark headings keep metadata compact and visible', () => {
  assert.match(portfolioResultSource, /\.portfolio-result \{[^}]*container-type: inline-size;/)
  assert.match(portfolioResultSource, /\.benchmark-analysis-heading \{[^}]*display: grid;[^}]*min-height: 40px;/)
  assert.match(portfolioResultSource, /\.analysis-summary-column \.benchmark-analysis-heading \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;[^}]*min-height: 0;/)
  assert.match(portfolioResultSource, /\.analysis-summary-column \.benchmark-analysis-meta \{[^}]*grid-row: 1;[^}]*grid-column: 2;[^}]*flex-wrap: nowrap;/)
  assert.match(portfolioResultSource, /@container \(max-width: 860px\)/)
})

test('backtest source parameters can be compiled and saved as a new strategy version', () => {
  assert.match(source, /strategyV2\.backtest\.saveParamDefaults/)
  assert.match(source, /sourceParamChangedDefinitions/)
  assert.match(source, /buildScriptCodeWithParamValues\(code, this\.paramDefinitions, this\.params\)/)
  assert.match(source, /compileScriptSource\(\{ code: nextCode \}\)/)
  assert.match(source, /updateScriptSource\(sourceId, \{/)
  assert.match(source, /source\.status === 'running'/)
  assert.match(source, /!String\(this\.source\.code \|\| ''\)\.trim\(\)/)
})

test('backtest center visual accents follow the configured system theme color', () => {
  assert.match(source, /class="[^"]*theme-ready-tag[^"]*"/)
  assert.doesNotMatch(source, /<a-tag v-if="manifest" color="green"/)
  assert.match(source, /primaryColor: state => state\.app\.color/)
  assert.match(source, /color: \[this\.primaryColor, '#94a3b8'\]/)
  for (const selector of ['\\.step-badge', '\\.empty-orbit', '\\.empty-preview-card > \\.anticon']) {
    assert.match(source, new RegExp(`${selector} \\{[^}]*var\\(--primary-color`))
  }
})

test('backtest workspaces and reports share one compact visual system', () => {
  assert.match(source, /@import '\.\/backtest-polish\.less';/)
  assert.match(polishSource, /--backtest-radius-panel: 8px;/)
  assert.match(polishSource, /--backtest-radius-control: 6px;/)
  assert.match(polishSource, /--backtest-radius-tag: 4px;/)
  assert.match(polishSource, /\.factor-result \.factor-detail-tabs/)
  assert.match(polishSource, /\.factor-benchmark \.ranking-table th/)
  assert.match(polishSource, /\.portfolio-result \.result-tabs \.ant-tabs-tab/)
  assert.match(polishSource, /\.evolution-shell \.candidate-card/)
  assert.match(polishSource, /background-image: none;/)
  assert.match(polishSource, /\.run-card\.active \{[\s\S]*?transform: none;/)
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
  assert.match(source, /requestedMode === 'factor'[\s\S]*?getStrategyFactorResearchHistory[\s\S]*?getStrategyFactorBenchmarkHistory[\s\S]*?else \{[\s\S]*?getStrategyBacktestHistory/)
  assert.doesNotMatch(source, /const \[portfolioResponse, factorResponse\] = await Promise\.all/)
})

test('backtest center submits the Strategy API V2 contract as an asynchronous job', () => {
  assert.match(source, /startStrategyBacktestJob\(\{[\s\S]*?sourceId: this\.form\.sourceId[\s\S]*?startDate:[\s\S]*?endDate:[\s\S]*?params: this\.params/)
  assert.match(source, /getStrategyBacktestJob\(this\.activeJobId\)/)
  const runMethod = source.match(/async run \(\) \{([\s\S]*?)\n {4}\},\n {4}async runFactorResearch/)
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

test('factor history drawer separates filtering, context and refresh actions', () => {
  assert.match(source, /class="drawer-history-toolbar"/)
  assert.match(source, /class="drawer-refresh-button"/)
  assert.match(source, /<span v-if="mode !== 'factor'">/)
  assert.match(source, /width="460"/)
})

test('backtest and factor workspaces open settings by default and align the research date fields', () => {
  assert.match(source, /settingsVisible: true/)
  assert.match(source, /\.date-range-fields \{ display: grid; grid-template-columns: minmax\(0, 1fr\) 18px minmax\(0, 1fr\);/)
  assert.match(source, /class="date-range-arrow"/)
})

test('backtest configuration steps share one heading system without squeezing factor titles', () => {
  assert.equal((source.match(/class="panel-heading config-section__heading config-step-heading"/g) || []).length, 4)
  assert.match(source, /class="toolbar-icon-button"[\s\S]*?icon="control"/)
  assert.match(source, /\.toolbar-icon-button \{[^}]*align-items: center;[^}]*justify-content: center;/)
  assert.match(source, /\.config-step-heading h2 \{[^}]*white-space: normal;/)
  assert.doesNotMatch(source, /<div class="subheading config-section__heading">/)
  assert.doesNotMatch(source, /<span>\{\{ \$t\('strategyV2\.factorResearch\.universeMode'\) \}\}<\/span>/)
})

test('sticky research controls use an opaque surface and cover the seam while scrolling', () => {
  assert.match(source, /\.run-action-bar \{[^}]*background: #fff;/)
  assert.match(source, /box-shadow: 0 -8px 20px rgba\(15, 35, 60, 0\.05\)/)
  assert.match(source, /\.theme-dark \.run-action-bar \{[^}]*background: #111111;/)
  assert.match(source, /box-shadow: 0 -10px 24px rgba\(0, 0, 0, 0\.28\)/)
  assert.doesNotMatch(source, /\.run-action-bar \{[^}]*backdrop-filter:/)
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
  assert.match(portfolioResultSource, /legend: \[[\s\S]*?data: \[strategyName, benchmarkName\],[\s\S]*?top: 4,[\s\S]*?itemGap: 14/)
  assert.match(portfolioResultSource, /\{ show: true, left: 54, right: 64, top: '11%', height: '39%'/)
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

test('risk and benchmark diagnostics stay expanded without disclosure controls', () => {
  assert.doesNotMatch(portfolioResultSource, /riskAnalysisExpanded/)
  assert.doesNotMatch(portfolioResultSource, /benchmarkAnalysisExpanded/)
  assert.doesNotMatch(portfolioResultSource, /class="benchmark-analysis-toggle"/)
  assert.match(portfolioResultSource, /v-for="item in riskMetricCards"/)
  assert.match(portfolioResultSource, /v-for="item in tailRiskMetricCards"/)
  assert.match(portfolioResultSource, /v-for="item in benchmarkMetricCards"/)
  assert.match(portfolioResultSource, /v-for="item in advancedBenchmarkMetricCards"/)
})

test('portfolio diagnostics share the workspace with the chart without changing metric data', () => {
  assert.match(portfolioResultSource, /<div class="analysis-workspace">\s*<div class="analysis-summary-column">/)
  assert.match(portfolioResultSource, /<section class="chart-card">[\s\S]*?<div ref="chart" class="portfolio-chart" role="img" \/>/)
  assert.match(portfolioResultSource, /\.analysis-workspace \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(portfolioResultSource, /\.analysis-summary-column \{ order: 2;/)
  assert.match(portfolioResultSource, /\.analysis-workspace \.chart-card \{ order: 1;/)
  assert.match(portfolioResultSource, /\.analysis-summary-column \.benchmark-analysis-grid \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/)
  assert.match(portfolioResultSource, /\.analysis-summary-column \.benchmark-analysis-metric \{[^}]*align-items: center;[^}]*min-height: 38px;[^}]*padding: 0 8px/)
  assert.doesNotMatch(portfolioResultSource, /<small>\{\{ item\.detail \}\}<\/small>/)
  assert.match(portfolioResultSource, /@container \(max-width: 920px\) \{\s*\.analysis-workspace \{ grid-template-columns: 1fr; \}/)
  assert.match(portfolioResultSource, /\.analysis-workspace \.portfolio-chart \{[^}]*min-height: 440px/)
  assert.match(portfolioResultSource, /data: \[strategyName, benchmarkName\]/)
  assert.match(portfolioResultSource, /data: \[grossExposureName, netExposureName, cashAllocationName\]/)
  assert.match(portfolioResultSource, /const benchmarkColor = this\.isDark \? '#94a3b8' : '#7b8798'/)
  assert.match(portfolioResultSource, /smooth: 0\.08,[\s\S]*?lineStyle: \{ width: 2\.4, color: strategyColor \}/)
})

test('portfolio chart uses a restrained research-terminal hierarchy', () => {
  assert.match(portfolioResultSource, /const panel = this\.isDark \? '#121212' : '#fbfcfd'/)
  assert.match(portfolioResultSource, /splitNumber: 4,[\s\S]*?type: 'dashed'/)
  assert.match(portfolioResultSource, /endLabel: \{ show: true,[\s\S]*?moveOverlap: 'shiftY'/)
  assert.match(portfolioResultSource, /data: \[\{ yAxis: 100 \}\]/)
  assert.match(portfolioResultSource, /showDataShadow: false, brushSelect: false/)
  assert.match(portfolioResultSource, /\.benchmark-analysis-heading h3::before, \.chart-heading h3::before, \.trade-review-heading h3::before \{[^}]*background: var\(--section-accent\)/)
})

test('portfolio chart distributes plots across the available card height', () => {
  assert.match(portfolioResultSource, /top: '11%', height: '39%'/)
  assert.match(portfolioResultSource, /top: '55%', height: '14%'/)
  assert.match(portfolioResultSource, /top: '75%', height: '16%'/)
  assert.match(portfolioResultSource, /data: \[grossExposureName, netExposureName, cashAllocationName\][\s\S]*?top: '71\.5%'/)
  assert.match(portfolioResultSource, /equity > 0 \? cash \/ equity \* 100 : null/)
  assert.match(portfolioResultSource, /name: grossExposureName[\s\S]*?yAxisIndex: 2/)
  assert.match(portfolioResultSource, /name: netExposureName[\s\S]*?yAxisIndex: 2/)
  assert.match(portfolioResultSource, /name: cashAllocationName[\s\S]*?yAxisIndex: 2/)
  assert.doesNotMatch(portfolioResultSource, /position: 'right'/)
})

test('portfolio chart offers a guarded linear or logarithmic equity scale', () => {
  assert.match(portfolioResultSource, /value="log" :disabled="!logScaleAvailable"/)
  assert.match(portfolioResultSource, /const equityAxisType = this\.equityScale === 'log' && this\.logScaleAvailable \? 'log' : 'value'/)
  assert.match(portfolioResultSource, /const equityAxisValues = \[\.\.\.normalized, \.\.\.benchmark\]/)
  assert.match(portfolioResultSource, /const equityAxisBounds = equityAxisType === 'log'/)
  assert.match(portfolioResultSource, /type: equityAxisType, \.\.\.equityAxisBounds, logBase: 10/)
  assert.match(portfolioResultSource, /formatter: value => equityAxisType === 'log' \? Number\(value\)\.toFixed\(2\) : value/)
  assert.match(portfolioResultSource, /rows\.every\(item => \{[\s\S]*?Number\.isFinite\(value\) && value > 0/)
  assert.match(portfolioResultSource, /\.chart-scale-toggle \{[^}]*border: 1px solid #d9e0e8;[^}]*border-radius: 7px;/)
  assert.match(portfolioResultSource, /\.chart-scale-toggle \/deep\/ \.ant-radio-button-wrapper::before \{[^}]*display: none !important;/)
  assert.match(portfolioResultSource, /\.chart-scale-toggle \/deep\/ \.ant-radio-button-wrapper-checked:not\(\.ant-radio-button-wrapper-disabled\) \{[^}]*background: var\(--section-accent\);/)
})

test('portfolio chart formats time-axis labels with the active interface locale', () => {
  assert.match(portfolioResultSource, /formatChartAxisTick \(value, rangeMilliseconds\)/)
  assert.match(portfolioResultSource, /new Intl\.DateTimeFormat\(activeLocale, \{ \.\.\.options, timeZone: 'UTC' \}\)/)
  assert.match(portfolioResultSource, /formatter: value => this\.formatChartAxisTick\(value, chartRangeMilliseconds\)/)
  assert.doesNotMatch(portfolioResultSource, /axisLabel: \{ show: index === 2,[^}]*formatter: '\{MM\}月'/)
})

test('historical results show the frozen backtest contract instead of the current edited source', () => {
  assert.match(source, /resultManifest \(\) \{/)
  assert.match(source, /summaryManifest \(\) \{\s*return this\.resultManifest \|\| this\.manifest/)
  assert.match(source, /resultManifest \? \$t\('strategyV2\.backtest\.resultContractTitle'\)/)
  assert.match(source, /summaryStrategyTypeLabel/)
  assert.match(source, /summaryManifestFrequency/)
  assert.match(source, /summaryMarketLabel/)
  assert.match(source, /summaryUniverseLabel/)
})

test('portfolio report section headings use one title treatment', () => {
  assert.match(portfolioResultSource, /--section-accent: var\(--primary-color, #1890ff\);/)
  assert.match(portfolioResultSource, /\.benchmark-analysis-heading h3, \.chart-heading h3, \.trade-review-heading h3 \{[^}]*font-size: var\(--type-title\);[^}]*font-weight: 600;/)
  assert.match(portfolioResultSource, /class="section-help-icon"[\s\S]*?type="exclamation-circle"[\s\S]*?tabindex="0"/)
})

test('portfolio diagnostic cards vertically center labels and values', () => {
  assert.match(portfolioResultSource, /\.analysis-summary-column \.benchmark-analysis-metric > span \{[^}]*align-self: center;[^}]*line-height: 1\.2;/)
  assert.match(portfolioResultSource, /\.analysis-summary-column \.benchmark-analysis-metric strong \{[^}]*align-self: center;[^}]*line-height: 1\.2;/)
})

test('explanatory section copy lives in accessible title tooltips', () => {
  assert.match(portfolioResultSource, /joinHelpText \(\.\.\.items\)/)
  assert.match(portfolioResultSource, /joinHelpText\(benchmarkCaption, \$t\('strategyV2\.backtest\.chartInteractionHint'\)\)/)
  assert.match(portfolioResultSource, /strategyV2\.backtest\.riskMetrics\.tailNote'[\s\S]*?class="section-help-icon"/)
  assert.doesNotMatch(portfolioResultSource, /<p class="benchmark-analysis-note">/)
  assert.doesNotMatch(portfolioResultSource, /class="chart-legend-note"/)
  assert.match(source, /class="config-title-help-icon"[\s\S]*?type="exclamation-circle"[\s\S]*?tabindex="0"/)
  assert.doesNotMatch(source, /class="section-hint config-section__hint"/)
  assert.doesNotMatch(source, /class="section-hint source-param-contract-hint"/)
})

test('portfolio result typography uses one deliberate scale', () => {
  assert.match(portfolioResultSource, /--type-caption: 10px; --type-body: 11px; --type-metric: 12px; --type-title: 14px; --type-hero: 20px;/)
  assert.match(portfolioResultSource, /font-variant-numeric: tabular-nums;/)
  assert.match(portfolioResultSource, /\.portfolio-result h3, \.portfolio-result h4, \.portfolio-result strong \{ font-weight: 600; \}/)
  assert.doesNotMatch(portfolioResultSource, /font-size: (?:8|9|15|18)px/)
  assert.doesNotMatch(portfolioResultSource, /fontSize: 9/)
  assert.doesNotMatch(portfolioResultSource, /font-weight: 700/)
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
