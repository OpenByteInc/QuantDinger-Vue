import test from 'node:test'
import assert from 'node:assert/strict'
import { parseStrategyInstrumentIdentity, formatStrategyInstrumentIdentity } from '../../src/utils/strategyInstrument.js'

test('HK stock aliases use one strategy identity with an explicit market', () => {
  for (const symbol of ['700', '00700', '700.HK', 'HK00700', 'HK.00700', '00700.XHKG', '00700.HK']) {
    const parsed = parseStrategyInstrumentIdentity(symbol, { market: 'HKStock' })
    assert.equal(parsed.instrument, 'HKStock:00700.HK')
    assert.equal(parsed.symbol, '00700.HK')
    assert.equal(formatStrategyInstrumentIdentity({ market: 'HKStock', symbol }), 'HKStock:00700.HK')
    assert.equal(parseStrategyInstrumentIdentity('HKStock:' + symbol).instrument, 'HKStock:00700.HK')
  }
})

test('HK normalization preserves US share classes, futures and exchange products', () => {
  for (const instrument of ['USStock:BRK.B', 'USStock:BRK-B', 'USStock:HK07709', 'USStock:700',
    'Futures:HSIZ26', 'CNStock:600519.SH', 'Crypto:00700/HKD@gate:spot',
    'Crypto:HK0700/USDT@binance:swap']) {
    assert.equal(parseStrategyInstrumentIdentity(instrument).instrument, instrument)
  }
})
