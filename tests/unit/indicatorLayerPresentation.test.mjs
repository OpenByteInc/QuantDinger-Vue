import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../../src/views/indicator-analysis/components/KlineChart.vue', import.meta.url), 'utf8')
const helpers = source.slice(source.indexOf('const withAlpha ='), source.indexOf('const normalizeCompactBacktestMarkerText ='))
const start = source.lastIndexOf('    registerOverlay({', source.indexOf("name: 'qdIndicatorZone'"))
const definitions = source.slice(start, source.indexOf('    const getMeasureOverlayTheme =', start))
const renderer = source.slice(source.indexOf('    const normalizeLayerTimestamp ='), source.indexOf('    const renderIndicatorSignals ='))
const overlays = new Map()
const drawn = []
const context = vm.createContext({
  chartTheme: { value: 'dark' },
  registerOverlay: overlay => overlays.set(overlay.name, overlay),
  chartRef: { value: { createOverlay: config => { drawn.push(config); return String(drawn.length) } } },
  addedSignalOverlayIds: { value: [] }
})
vm.runInContext(`${helpers}\n${definitions}\n${renderer}\nthis.render = renderIndicatorLayers`, context)
const coordinates = [{ x: 20, y: 100 }, { x: 120, y: 100 }]
const figures = (name, data, points = coordinates) => overlays.get(name).createPointFigures({
  coordinates: points, overlay: { extendData: data }, bounding: { width: 600, height: 400 }
})

test('structure labels use the segment midpoint and explicit vertical spacing', () => {
  const text = figures('qdIndicatorLine', { text: 'BOS', textPosition: 'center', textOffsetY: -9, fontWeight: '400' })[1]
  assert.equal(text.attrs.x, 70)
  assert.equal(text.attrs.y, 91)
  assert.equal(text.attrs.align, 'center')
  assert.equal(text.styles.weight, '400')
})

test('existing line labels retain their endpoint placement', () => {
  const text = figures('qdIndicatorLine', { text: 'BOS' })[1]
  assert.equal(text.attrs.x, 126)
  assert.equal(text.attrs.y, 100)
  assert.equal(text.attrs.align, 'left')
})

test('projected level labels remain inside a narrow viewport', () => {
  const text = figures('qdIndicatorLine', { text: 'SH', keepTextVisible: true }, [{ x: 20, y: 100 }, { x: 800, y: 100 }])[1]
  assert.ok(text.attrs.x < 580)
  assert.ok(text.attrs.x >= 4)
})

test('order blocks extend to the pane edge only when explicitly requested', () => {
  const plain = figures('qdIndicatorZone', { color: '#3179f5', borderSize: 0 })[0]
  const extended = figures('qdIndicatorZone', { color: '#3179f5', extendRight: true, borderSize: 0 })[0]
  assert.equal(plain.attrs.width, 100)
  assert.equal(extended.attrs.width, 580)
  assert.equal(extended.styles.borderSize, 0)
})

test('projected levels use future bar positions without inventing a timestamp', () => {
  drawn.length = 0
  const bars = [{ timestamp: 1700000000000 }, { timestamp: 1700003600000 }]
  context.render([
    { type: 'line', startIndex: 0, endIndex: 1, price: 100, extendBars: 20, textPosition: 'center', textOffsetY: 8 },
    { type: 'line', startIndex: 0, endIndex: 1, price: 100 },
    { type: 'zone', startIndex: 0, endIndex: 1, top: 100, bottom: 90, extendRight: true, borderSize: 0 }
  ], bars)
  assert.equal(drawn.length, 3)
  assert.equal(drawn[0].points[1].dataIndex, 21)
  assert.equal(drawn[0].points[1].timestamp, undefined)
  assert.equal(drawn[0].extendData.textOffsetY, 8)
  assert.equal(drawn[1].points[1].timestamp, bars[1].timestamp)
  assert.equal(drawn[2].extendData.extendRight, true)
  assert.equal(drawn[2].extendData.borderSize, 0)
})

test('invalid and excessive projections cannot produce unbounded coordinates', () => {
  drawn.length = 0
  const bars = [{ timestamp: 1700000000000 }]
  for (const extendBars of [-10, 'bad', Infinity, 100000]) {
    context.render([{ type: 'line', price: 100, extendBars }], bars)
  }
  for (const item of drawn.slice(0, 3)) assert.equal(item.points[1].timestamp, bars[0].timestamp)
  assert.equal(drawn[3].points[1].dataIndex, 500)
})
