import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { resolveIndicatorStrategyContext } from '../../src/utils/indicatorStrategyContext.js'
import { reactive, watch, nextTick } from 'vue'

const indicatorIdePath = fileURLToPath(
  new URL('../../src/views/indicator-ide/index.vue', import.meta.url)
)
const klineChartPath = fileURLToPath(
  new URL('../../src/views/indicator-analysis/components/KlineChart.vue', import.meta.url)
)
const strategyIdePath = fileURLToPath(
  new URL('../../src/views/strategy-ide/index.vue', import.meta.url)
)
const indicatorIdeSource = fs.readFileSync(indicatorIdePath, 'utf8')
const klineChartSource = fs.readFileSync(klineChartPath, 'utf8')
const strategyIdeSource = fs.readFileSync(strategyIdePath, 'utf8')

test('editor leading code icon is an accessible collapse button using the existing toggle', () => {
  const button = indicatorIdeSource.match(/<button\s+[^>]*class="code-panel-icon-toggle"[\s\S]*?<\/button>/)?.[0]
  assert.ok(button)
  assert.match(button, /type="button"/)
  assert.match(button, /:title="\$t\('indicatorIde.hideCode'\)"/)
  assert.match(button, /:aria-label="\$t\('indicatorIde.hideCode'\)"/)
  assert.match(button, /:aria-expanded="codeDrawerVisible"/)
  assert.match(button, /@click="toggleCodeDrawer"/)
  assert.match(button, /<a-icon type="code"/)
})

test('indicator workspace exposes a constrained and persistent horizontal resizer', () => {
  assert.match(indicatorIdeSource, /class="ide-workspace-resizer"/)
  assert.match(indicatorIdeSource, /@mousedown="startWorkspaceResize"/)
  assert.match(indicatorIdeSource, /@dblclick="resetWorkspaceSplit"/)
  assert.match(indicatorIdeSource, /workspaceSplitBounds \(\)/)
  assert.match(indicatorIdeSource, /const codeMin = Math\.min\(420/)
  assert.match(indicatorIdeSource, /const chartMin = Math\.min\(520/)
  assert.match(indicatorIdeSource, /workspaceSplitRatio: this\.workspaceSplitRatio/)
  assert.match(indicatorIdeSource, /<span>\{\{ \$t\('indicatorIde\.hideCode'\) \}\}<\/span>/)
})

test('indicator-to-strategy conversion has a parameter parser', () => {
  assert.match(
    indicatorIdeSource,
    /parseIndicatorParamRaw \(code\) \{[\s\S]*?this\.parseIndicatorParamSpecs\(code \|\| ''\)[\s\S]*?params\[spec\.name\] = spec\.defaultValue/
  )
  assert.match(
    indicatorIdeSource,
    /buildIndicatorToStrategyContext \(\)[\s\S]*?this\.parseIndicatorParamRaw\(code \|\| ''\)/
  )
})

test('indicator IDE no longer carries the retired execution-column conversion prompt', () => {
  assert.doesNotMatch(indicatorIdeSource, /buildIndicatorToStrategyPrompt \(\)/)
  assert.doesNotMatch(indicatorIdeSource, /open_long\/open_short/)
})

test('history loading uses native scroll direction at the clamped left edge', () => {
  assert.match(
    klineChartSource,
    /subscribeAction\('onScroll',[\s\S]*?Number\(event\.distance\) <= 0[\s\S]*?getVisibleRange\(\)[\s\S]*?range\.from > leftThreshold[\s\S]*?loadMoreHistoryDataForScroll/
  )
  assert.doesNotMatch(klineChartSource, /lastVisibleFrom > data\.from/)
  assert.doesNotMatch(
    klineChartSource,
    /formattedData\.length < visibleNeed[\s\S]*?loadMoreHistoryDataForScroll/
  )
})

test('derived live candles preserve a manually selected historical viewport', () => {
  assert.match(klineChartSource, /captureChartViewport\(chart\)/)
  assert.match(klineChartSource, /replaceChartData\(chartDisplayData\(\), \{ preserveViewport: true \}\)/)
  assert.doesNotMatch(klineChartSource, /mergedData\.length > 500 \? mergedData\.slice\(-500\)/)
})

test('derived live candles restore the viewport before the browser can paint a reset position', () => {
  const replaceStart = klineChartSource.indexOf('const replaceChartData = (rows, options = {}) => {')
  const replaceEnd = klineChartSource.indexOf('const flushRealtimeChartBar = (bar) => {', replaceStart)
  const replaceSource = klineChartSource.slice(replaceStart, replaceEnd)

  assert.ok(replaceStart >= 0 && replaceEnd > replaceStart)
  assert.match(replaceSource, /const afterApply = \(\) => \{[\s\S]*?restoreChartViewport\(chart, viewport\)/)
  assert.doesNotMatch(replaceSource, /requestAnimationFrame/)
})

test('live chart updates coalesce into one frame without replacing Vue state on every tick', () => {
  const flushStart = klineChartSource.indexOf('const flushWsTick = () => {')
  const flushEnd = klineChartSource.indexOf('const handleWsTick = (bar) => {', flushStart)
  const tickStart = flushEnd
  const tickEnd = klineChartSource.indexOf('const handleWsNewBar', tickStart)
  const flushSource = klineChartSource.slice(flushStart, flushEnd)
  const tickSource = klineChartSource.slice(tickStart, tickEnd)

  assert.ok(flushStart >= 0 && flushEnd > flushStart && tickEnd > tickStart)
  assert.match(flushSource, /flushRealtimeChartBar\(bar\)/)
  assert.doesNotMatch(flushSource, /scheduleRealtimeChartBarUpdate\(bar\)/)
  assert.doesNotMatch(tickSource, /klineData\.value = arr\.slice\(\)/)
})

test('chart resize and watermark guards avoid duplicate full-canvas work', () => {
  const resizeStart = klineChartSource.indexOf('chartResizeObserver = new ResizeObserver')
  const resizeEnd = klineChartSource.indexOf('chartResizeObserver.observe', resizeStart)
  const watermarkStart = klineChartSource.indexOf('const _paintWmCanvas = () => {')
  const watermarkEnd = klineChartSource.indexOf('const _startWmGuard = () => {', watermarkStart)
  const resizeSource = klineChartSource.slice(resizeStart, resizeEnd)
  const watermarkSource = klineChartSource.slice(watermarkStart, watermarkEnd)

  assert.ok(resizeStart >= 0 && resizeEnd > resizeStart)
  assert.match(resizeSource, /new ResizeObserver\(handleResize\)/)
  assert.doesNotMatch(resizeSource, /chartRef\.value\.resize\(\)[\s\S]*?scheduleSyncVolumePaneLayout\(\)/)
  assert.match(watermarkSource, /signature === _wmPaintSignature/)
  assert.match(watermarkSource, /if \(cvs\.style\.display !== 'block'\)/)
})

test('equivalent indicator objects and new callbacks do not clear the cached chart on activation', async () => {
  const start = klineChartSource.indexOf('const getIndicatorConfigSignature =')
  const end = klineChartSource.indexOf('const getIndicatorRenderSignature', start)
  assert.ok(start >= 0 && end > start)
  const props = reactive({ activeIndicators: [{ id: 'ide-py-1', name: 'Trend', type: 'python', code: 'trend', params: { length: 20 }, calculate: () => 1 }] })
  const signature = new Function('props', `${klineChartSource.slice(start, end)}; return getIndicatorConfigSignature`)(props)
  let redraws = 0
  const stop = watch(signature, () => { redraws += 1 })
  try {
    props.activeIndicators = props.activeIndicators.map(item => ({ ...item, calculate: () => 1 }))
    await nextTick()
    assert.equal(redraws, 0)
    props.activeIndicators[0].params.length = 30
    await nextTick()
    assert.equal(redraws, 1)
    props.activeIndicators[0].code = 'changed trend'
    await nextTick()
    assert.equal(redraws, 2)
    props.activeIndicators[0].name = 'Renamed trend'
    await nextTick()
    assert.equal(redraws, 3)
    props.activeIndicators = []
    await nextTick()
    assert.equal(redraws, 4)
  } finally {
    stop()
  }
  assert.match(klineChartSource, /watch\(getIndicatorConfigSignature, \(\) =>/)
  assert.doesNotMatch(klineChartSource, /watch\(\(\) => props\.activeIndicators,/)
})

test('cached chart resize skips detached or zero-size containers and still resizes with volume hidden', () => {
  const start = klineChartSource.indexOf('const canLayoutChart =')
  const end = klineChartSource.indexOf('const scheduleSyncVolumePaneLayout =', start)
  assert.ok(start >= 0 && end > start)
  const container = { isConnected: false, clientWidth: 800, clientHeight: 500 }
  let resized = 0
  let created = 0
  const chart = { resize: () => { resized += 1 }, createIndicator: () => { created += 1 } }
  const volume = { value: true }
  const sync = new Function('chartContainerRef', 'chartRef', 'volumeVisible', `let volPaneEnsured = false; let volPaneId; const VOL_PANE_OPTIONS = {}; ${klineChartSource.slice(start, end)}; return syncVolumePaneLayout`)(
    { value: container }, { value: chart }, volume
  )
  sync()
  assert.equal(resized, 0)
  container.isConnected = true
  container.clientWidth = 0
  sync()
  assert.equal(resized, 0)
  container.clientWidth = 800
  container.clientHeight = 0
  sync()
  assert.equal(resized, 0)
  container.clientHeight = 500
  sync()
  assert.equal(resized, 1)
  assert.equal(created, 1)
  volume.value = false
  sync()
  assert.equal(resized, 2)
  assert.equal(created, 1)
})

test('chart activation schedules layout without waiting for venue requests or rebuilding the chart', () => {
  const activation = indicatorIdeSource.match(/async activated \(\) \{([\s\S]*?)\n {2}\},/)[1]
  assert.ok(activation.indexOf('this.ensureChartReady()') < activation.indexOf('await this.loadTradingVenueConfig'))
  assert.match(klineChartSource, /onActivated\(\(\) => \{\s*nextTick\(handleResize\)/)
  const resize = klineChartSource.match(/const handleResize = \(\) => \{([\s\S]*?)\n {4}\}/)[1]
  assert.match(resize, /requestAnimationFrame/)
  assert.match(resize, /if \(!canLayoutChart\(\)\) return/)
  assert.match(resize, /if \(chartRef\.value\) \{\s*syncVolumePaneLayout\(\)/)
  assert.doesNotMatch(resize, /setTimeout|destroy|updateIndicators/)
})

test('multi-chart layout keeps each chart instance scoped to its own container and workspace state', () => {
  assert.doesNotMatch(klineChartSource, /id="kline-chart-container"/)
  assert.doesNotMatch(klineChartSource, /getElementById\('kline-chart-container'\)/)
  assert.match(klineChartSource, /ref="chartContainerRef"/)
  assert.match(indicatorIdeSource, /class="ide-chart-layout"/)
  assert.match(indicatorIdeSource, /v-for="\(pane, paneIndex\) in visibleChartPanes"/)
  assert.match(indicatorIdeSource, /chartLayoutMode: 1/)
  assert.match(indicatorIdeSource, /setChartLayoutMode \(mode\)/)
  assert.match(indicatorIdeSource, /chartPanes: this\.serializeChartPanes\(\)/)
  assert.match(indicatorIdeSource, /hydrateChartPaneIndicators/)
})

test('multi-chart layout uses one compact dropdown instead of three persistent toolbar buttons', () => {
  assert.match(indicatorIdeSource, /<a-button\s+size="small"\s+class="ide-chart-layout-trigger"/)
  assert.match(indicatorIdeSource, /class="ide-chart-layout-trigger"/)
  assert.match(indicatorIdeSource, /class="ide-chart-layout-menu-item"/)
  assert.match(indicatorIdeSource, /@click="onChartLayoutMenuClick"/)
  assert.match(indicatorIdeSource, /\.ide-chart-layout-trigger\s*\{[\s\S]*?height:\s*30px !important;/)
  assert.doesNotMatch(indicatorIdeSource, /class="ide-chart-layout-switch"/)
  assert.doesNotMatch(indicatorIdeSource, /class="ide-chart-layout-button"/)
})

test('indicator refreshes are deduplicated while chart-managed indicators advance incrementally', () => {
  assert.match(klineChartSource, /const getIndicatorRenderSignature = \(\)/)
  assert.match(klineChartSource, /signature === lastIndicatorRenderSignature\.value/)
  assert.match(klineChartSource, /chartManagedUpdate && lastIndicatorRenderSignature\.value && !hasPythonIndicators\(\)/)
  assert.match(klineChartSource, /const createAlignedPlotCalculator = \(sourceData, plotDataMap\)/)
  assert.match(klineChartSource, /if \(signature === cachedSignature\) \{[\s\S]*?return cachedRows/)
  assert.match(klineChartSource, /maybeUpdateIndicators\(\{ reason: 'realtime' \}\)/)
})

test('measure overlay separates bar count and duration without mojibake', () => {
  assert.match(klineChartSource, /metaText \+= ` · \$\{timeSpan\}`/)
  assert.doesNotMatch(klineChartSource, /鐠\?|锟斤拷|\uFFFD/u)
})

test('indicator conversion route opens before strategy route initialization can replace it', () => {
  assert.match(
    strategyIdeSource,
    /await this\.loadSources\(\)[\s\S]*?if \(this\.isIndicatorConvertRoute\(\)\) \{[\s\S]*?updateRoute: false[\s\S]*?await this\.applyIndicatorConvertRouteOnce\(\)[\s\S]*?return/
  )
  assert.match(
    strategyIdeSource,
    /indicatorId: String\(raw\.indicatorId \|\| raw\.id \|\| ''\)[\s\S]*?market: String\(raw\.market \|\| ''\)[\s\S]*?timeframe: String\(raw\.timeframe \|\| ''\)/
  )
})

test('indicator-to-strategy conversion preserves the source instrument and timeframe', () => {
  const start = strategyIdeSource.indexOf('resolveIndicatorConversionContext (ctx = {})')
  const end = strategyIdeSource.indexOf('async confirmIndicatorToStrategy ()', start)
  const conversionSource = strategyIdeSource.slice(start, end)

  assert.ok(start >= 0 && end > start)
  assert.match(conversionSource, /resolveIndicatorStrategyContext\(ctx, query, this\.runConfig \|\| \{\}\)/)
  assert.match(conversionSource, /Source instrument: \$\{source\.instrument\}/)
  assert.match(conversionSource, /Source timeframe: \$\{source\.timeframe\}/)
  assert.match(conversionSource, /Never replace them with USStock:SPY/)
  assert.match(conversionSource, /There is no get_current_data API/)
  assert.match(conversionSource, /it has no quantity or cost_basis/)
  assert.match(conversionSource, /never inside initialize\(context\)/)
})

test('indicator conversion resolves Crypto source context without falling back to SPY', () => {
  assert.deepEqual(
    resolveIndicatorStrategyContext({
      market: 'Crypto',
      symbol: 'SOL/USDT',
      exchange_id: 'binance',
      market_type: 'spot',
      timeframe: '1H'
    }),
    {
      market: 'Crypto',
      symbol: 'SOL/USDT',
      exchangeId: 'binance',
      marketType: 'spot',
      timeframe: '1H',
      instrument: 'Crypto:SOL/USDT@binance:spot'
    }
  )
})

test('indicator conversion normalizes decorated and previously duplicated Crypto identities', () => {
  assert.deepEqual(
    resolveIndicatorStrategyContext({
      market: 'Crypto',
      symbol: 'BTC/USDT@BINANCE:SPOT@spot',
      exchange_id: 'binance',
      market_type: 'spot',
      timeframe: '15m'
    }),
    {
      market: 'Crypto',
      symbol: 'BTC/USDT',
      exchangeId: 'binance',
      marketType: 'spot',
      timeframe: '15m',
      instrument: 'Crypto:BTC/USDT@binance:spot'
    }
  )
})

test('indicator conversion keeps an explicit source product ahead of stale fallback metadata', () => {
  const resolved = resolveIndicatorStrategyContext({
    market: 'Crypto',
    symbol: 'BTC/USDT@okx:swap',
    exchange_id: 'binance',
    market_type: 'spot',
    timeframe: '15m'
  })

  assert.equal(resolved.instrument, 'Crypto:BTC/USDT@okx:swap')
  assert.equal(resolved.symbol, 'BTC/USDT')
  assert.equal(resolved.exchangeId, 'okx')
  assert.equal(resolved.marketType, 'swap')
})

test('indicator conversion keeps the strategy identity separate from the venue native id', () => {
  const resolved = resolveIndicatorStrategyContext({
    market: 'Crypto',
    symbol: 'RAAPL/USDT',
    exchange_id: 'bitget',
    market_type: 'spot',
    instrument_id: 'rAAPLUSDT',
    timeframe: '1m'
  })

  assert.equal(resolved.instrument, 'Crypto:RAAPL/USDT@bitget:spot')
})

test('indicator conversion uses the current strategy context when indicator metadata is generic', () => {
  const resolved = resolveIndicatorStrategyContext({}, {}, {
    market_category: 'Crypto',
    symbol: 'ETH/USDT',
    exchange_id: 'okx',
    market_type: 'swap',
    timeframe: '4H'
  })

  assert.equal(resolved.instrument, 'Crypto:ETH/USDT@okx:swap')
  assert.equal(resolved.timeframe, '4H')
})

test('converted strategy metadata follows the resolved source market context', () => {
  assert.match(
    strategyIdeSource,
    /buildGeneratedMetadata \(ctx = \{\}\)[\s\S]*?const source = this\.resolveIndicatorConversionContext\(ctx\)[\s\S]*?source_indicator_instrument: source\.instrument[\s\S]*?last_run_config: lastRunConfig/
  )
})

test('indicator creation never falls back to an existing maximum id', () => {
  const start = indicatorIdeSource.indexOf('async _createIndicatorInIde ()')
  const end = indicatorIdeSource.indexOf('async handlePublishIndicator ()', start)
  const createSource = indicatorIdeSource.slice(start, end)

  assert.match(createSource, /const targetId = Number\(res\.data && res\.data\.id\)/)
  assert.match(createSource, /createdIndicator = Number\.isFinite\(targetId\)[\s\S]*?Number\(item\.id\) === targetId/)
  assert.doesNotMatch(createSource, /reduce\(\(maxId, item\) => Math\.max\(maxId, Number\(item\.id\)/)
})

test('saving an indicator preserves its marketplace publication settings', () => {
  assert.match(indicatorIdeSource, /async saveIndicator \(\)[\s\S]*?publishToCommunity: !!indicator\.publish_to_community/)
  assert.match(indicatorIdeSource, /pricingType: indicator\.pricing_type \|\| 'free'/)
  assert.match(indicatorIdeSource, /const saved = await this\.saveIndicator\(\)[\s\S]*?if \(!saved\) return/)
})
