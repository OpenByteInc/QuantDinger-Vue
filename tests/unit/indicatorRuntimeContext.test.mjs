import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildIndicatorContextRequest,
  extractIndicatorDataRequests,
  normalizeIndicatorTimeframe
} from '../../src/utils/indicatorRuntimeContext.mjs'

test('indicator timeframe aliases normalize to the platform form', () => {
  assert.equal(normalizeIndicatorTimeframe('4h'), '4H')
  assert.equal(normalizeIndicatorTimeframe('1D'), '1D')
  assert.equal(normalizeIndicatorTimeframe('13m'), '')
})

test('literal series and lower timeframe requests are discovered once', () => {
  const code = `
indicator_timeframes = ['1D', '4H']
indicator_lower_timeframes = ('1m',)
daily = request_series('1D', field='close')
volume_rows = ctx.request_lower_tf('1m', fields='volume')
`
  assert.deepEqual(extractIndicatorDataRequests(code), [
    { timeframe: '1D', mode: 'series' },
    { timeframe: '4H', mode: 'series' },
    { timeframe: '1m', mode: 'lower_tf' }
  ])
})

test('context requests stay bounded and carry the active market identity', () => {
  const request = buildIndicatorContextRequest({
    code: "# @timeframe 1D\nrequest_series('1D')",
    market: 'Crypto',
    symbol: 'BTC/USDT',
    timeframe: '4h',
    exchangeId: 'gate',
    marketType: 'spot',
    instrumentId: 'BTC_USDT',
    baseCount: 5000
  })
  assert.equal(request.timeframe, '4H')
  assert.equal(request.base_count, 1000)
  assert.deepEqual(request.requests, [{ timeframe: '1D', mode: 'series' }])
  assert.equal(request.exchange_id, 'gate')
})

test('a bound timeframe parameter fetches only the selected lower timeframe', () => {
  const code = `
indicator_lower_timeframes = ['1m', '5m', '15m']
indicator_lower_timeframe_param = 'lower_timeframe'
lower_timeframe = params.get('lower_timeframe', '1m')
rows = request_lower_tf(lower_timeframe, fields=['open', 'close', 'volume'])
`
  assert.deepEqual(extractIndicatorDataRequests(code, { lower_timeframe: '15m' }), [
    { timeframe: '15m', mode: 'lower_tf' }
  ])
})
