import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assignIndicatorSignalLanes,
  isIndicatorLampPlot,
  normalizeIndicatorCloudPointValue,
  normalizeIndicatorLabelAnchor,
  normalizeIndicatorLabelFontSize,
  resolveIndicatorPlotTitle,
  resolveIndicatorLabelTextColor,
  normalizeIndicatorOutput
} from '../../src/utils/indicatorOutputProtocol.mjs'

const bars = [
  { open: 10, high: 12, low: 9, close: 11 },
  { open: 11, high: 13, low: 10, close: 12 }
]

test('host candle and background colors become renderable protocol plots', () => {
  const output = normalizeIndicatorOutput({
    schema_version: 2,
    bar_colors: ['#22c55e', null],
    background_colors: [null, '#ef4444']
  }, bars)

  assert.equal(output.version, 2)
  assert.equal(output.plots[0].type, 'background')
  assert.equal(output.plots[1].type, 'candlestick')
  assert.equal(output.plots[1].skipNullColor, true)
  assert.equal(output.plots[1].data[0].wickColor, '#22c55e')
  assert.equal(output.plots[1].data[1].color, null)
})

test('fixed tables normalize scalar and styled cells', () => {
  const output = normalizeIndicatorOutput({
    tables: [{
      id: 'status',
      position: 'top_right',
      columns: ['Metric', 'Value'],
      rows: [['Trend', { text: 'Bullish', color: '#22c55e' }]]
    }]
  })

  assert.equal(output.tables[0].position, 'top-right')
  assert.equal(output.tables[0].columns[0].text, 'Metric')
  assert.equal(output.tables[0].rows[0][1].color, '#22c55e')
})

test('cloud gaps stay null instead of collapsing the price scale to zero', () => {
  assert.equal(normalizeIndicatorCloudPointValue(null, 'upper'), null)
  assert.equal(normalizeIndicatorCloudPointValue({}, 'upper'), null)
  assert.equal(normalizeIndicatorCloudPointValue({ upper: null, lower: null }, 'upper'), null)
  assert.equal(normalizeIndicatorCloudPointValue({ upper: null, lower: null }, 'lower'), null)
  assert.equal(normalizeIndicatorCloudPointValue({ upper: 0, lower: '0' }, 'upper'), 0)
  assert.equal(normalizeIndicatorCloudPointValue({ upper: 0, lower: '0' }, 'lower'), 0)
})

test('lamp detection does not turn price markers and cloud zones into zero-based lanes', () => {
  assert.equal(isIndicatorLampPlot({
    name: 'FRD Armed',
    type: 'circle',
    data: [null, 64186.2, 65500.1]
  }), false)
  assert.equal(isIndicatorLampPlot({
    name: 'FRD Sell Zone',
    type: 'cloud',
    data: [null, { upper: 65100, lower: 64400 }]
  }), false)
  assert.equal(isIndicatorLampPlot({
    name: 'Trend Signal',
    type: 'circle',
    data: [0, 1, 0, -1]
  }), true)
  assert.equal(isIndicatorLampPlot({
    name: 'Momentum Lights',
    type: 'lamp',
    data: []
  }), true)
})

test('indicator labels use readable typography and TradingView-compatible anchors', () => {
  assert.equal(normalizeIndicatorLabelFontSize(8), 11)
  assert.equal(normalizeIndicatorLabelFontSize(22), 16)
  assert.equal(normalizeIndicatorLabelAnchor('down'), 'above')
  assert.equal(normalizeIndicatorLabelAnchor('up'), 'below')
  assert.equal(normalizeIndicatorLabelAnchor('center'), 'center')
  assert.equal(resolveIndicatorLabelTextColor('#000000', true), '#f1f5f9')
  assert.equal(resolveIndicatorLabelTextColor('#ffffff', false), '#0f172a')
  assert.equal(resolveIndicatorLabelTextColor('#22c55e', true), '#22c55e')
})

test('hidden plot titles stay non-string so KLineCharts omits their tooltip values', () => {
  assert.equal(resolveIndicatorPlotTitle({ name: 'Visible Line' }), 'Visible Line')
  assert.equal(resolveIndicatorPlotTitle({ name: 'Boolean Visible Line', title: true }), 'Boolean Visible Line')
  assert.equal(resolveIndicatorPlotTitle({ name: 'Named Line', title: 'Custom Caption' }), 'Custom Caption')
  assert.equal(resolveIndicatorPlotTitle({ name: 'Hidden Fill', title: false }), undefined)
  assert.equal(resolveIndicatorPlotTitle({ name: 'Lamp State' }, 'Fallback', true), undefined)
})

test('nearby indicator signals receive separate visual lanes per side', () => {
  const points = assignIndicatorSignalLanes([
    { dataIndex: 10, side: 'sell' },
    { dataIndex: 12, side: 'sell' },
    { dataIndex: 13, side: 'buy' },
    { dataIndex: 18, side: 'sell' }
  ])

  assert.deepEqual(points.map(point => point.lane), [0, 1, 0, 2])
})
