import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../../src/views/indicator-analysis/components/KlineChart.vue', import.meta.url), 'utf8')
const functionSource = source.slice(source.indexOf('    const updateKlineRealtime ='), source.indexOf('    const runRestRealtimeUpdate ='))
const candle = (timestamp, close = 100) => ({ timestamp, open: 100, high: Math.max(100, close), low: Math.min(100, close), close, volume: 1 })

function runtime (rows) {
  let respond
  const replacements = []; const ticks = []; const appended = []; const indicators = []; const cancelled = []
  const context = vm.createContext({
    props: { symbol: 'BTC/USDT' }, klineData: { value: rows }, realtimeFetchInFlight: { value: false },
    loadGeneration: 1, request: () => new Promise(resolve => { respond = resolve }), marketRequestParams: x => x,
    formatKlineData: x => x, normalizeKlineSequence: x => x.sort((a, b) => a.timestamp - b.timestamp),
    klineBarSnapshotKey: x => JSON.stringify(x), isRealtimeAppendGapSuspicious: () => false,
    scheduleRealtimeKlineResync: () => {}, convertToInternalFormat: x => x, updatePricePanel: () => {},
    chartRef: { value: { updateData () {} } }, chartDisplayData: () => context.klineData.value,
    replaceChartData: (data, options) => { replacements.push(data); assert.equal(options.preserveViewport, true); options.onComplete() },
    appendRealtimeBarsToChart: data => appended.push(data), scheduleRealtimeChartBarUpdate: data => ticks.push(data),
    maybeUpdateIndicators: options => indicators.push(options), cancelAnimationFrame: id => cancelled.push(id),
    realtimeChartRafId: 7, wsTickRafId: 8, pendingWsBar: rows.at(-1), klineCorrectionRevision: 0
  })
  vm.runInContext(`${functionSource}\nthis.update = updateKlineRealtime`, context)
  return { context, replacements, ticks, appended, indicators, cancelled, reply: data => respond({ code: 1, data }) }
}

test('REST correction redraws closed candles even when the latest candle is unchanged', async () => {
  const run = runtime([candle(60000), candle(120000)])
  const pending = run.context.update()
  run.reply([candle(60000, 110), candle(120000)])
  await pending
  assert.equal(run.replacements.length, 1)
  assert.equal(run.replacements[0][0].close, 110)
  assert.equal(run.context.klineCorrectionRevision, 1)
  assert.equal(run.indicators[0].force, true)
  assert.deepEqual(run.cancelled, [7, 8])
  assert.equal(run.context.pendingWsBar, null)
})

test('REST append also repairs the preceding unfinished candle instead of leaving it flat', async () => {
  const run = runtime([candle(60000), candle(120000)])
  const pending = run.context.update()
  run.reply([candle(120000, 115), candle(180000, 116)])
  await pending
  assert.equal(run.replacements.length, 1)
  assert.equal(run.replacements[0][1].close, 115)
  assert.equal(run.replacements[0][2].close, 116)
  assert.equal(run.appended.length, 0)
})

test('in-flight REST response cannot roll back a newer WebSocket price', async () => {
  const run = runtime([candle(60000), candle(120000)])
  const pending = run.context.update()
  run.context.klineData.value[1] = candle(120000, 120)
  run.reply([candle(60000, 110), candle(120000, 105)])
  await pending
  assert.equal(run.replacements[0][0].close, 110)
  assert.equal(run.replacements[0][1].close, 120)
})

test('a response from the previous chart cannot alter the new chart or release its request lock', async () => {
  const run = runtime([candle(60000)])
  const pending = run.context.update()
  run.context.loadGeneration += 1
  run.context.klineData.value = [candle(60000, 200)]
  run.reply([candle(60000, 105)])
  await pending
  assert.equal(run.context.klineData.value[0].close, 200)
  assert.equal(run.context.realtimeFetchInFlight.value, true)
  assert.equal(run.replacements.length + run.ticks.length, 0)
})

test('current-candle-only updates remain incremental and do not rebuild indicators', async () => {
  const run = runtime([candle(60000)])
  const pending = run.context.update()
  run.reply([candle(60000, 105)])
  await pending
  assert.equal(run.replacements.length, 0)
  assert.equal(run.ticks[0].close, 105)
  assert.equal(run.context.klineCorrectionRevision, 0)
  assert.equal(run.indicators[0].force, undefined)
})

test('one missing crypto candle triggers repair while equity session gaps remain allowed', () => {
  const start = source.indexOf('    const isRealtimeAppendGapSuspicious =')
  const end = source.indexOf('    const scheduleRealtimeKlineResync =', start)
  const context = vm.createContext({ getTimeframeMs: () => 60000, isCryptoMarket: () => true })
  vm.runInContext(`${source.slice(start, end)}\nthis.gap = isRealtimeAppendGapSuspicious`, context)
  assert.equal(context.gap(60000, 120000), false)
  assert.equal(context.gap(60000, 180000), true)
  context.isCryptoMarket = () => false
  assert.equal(context.gap(60000, 180000), false)
})
