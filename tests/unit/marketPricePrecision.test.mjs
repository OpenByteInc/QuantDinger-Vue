import assert from 'node:assert/strict'
import test from 'node:test'

import { formatMarketPrice, inferMarketPricePrecision } from '../../src/utils/marketPricePrecision.mjs'

test('US equity float serialization noise does not become display precision', () => {
  const bars = [
    { open: 219.2400054932, high: 219.300003051, low: 219.1761016846, close: 219.2050018311 }
  ]
  assert.equal(inferMarketPricePrecision(bars, 'USStock'), 2)
})

test('sub-dollar US equities retain four display decimals', () => {
  const bars = [{ open: 0.1234567, high: 0.1245678, low: 0.12, close: 0.1234 }]
  assert.equal(inferMarketPricePrecision(bars, 'USStock'), 4)
})

test('non-US markets keep adaptive precision', () => {
  const bars = [{ open: 0.123456, high: 0.12349, low: 0.1234, close: 0.12345 }]
  assert.equal(inferMarketPricePrecision(bars, 'Crypto'), 7)
})

test('AUD futures quotes hide float32 tails and retain five decimal places', () => {
  for (const symbol of ['6AZ26', '6AZ6', '6AZ2026', '6AZ26.CME', '6A=F', '6A', ' 6az26 ']) {
    for (const price of [0.66549999, Math.fround(0.6655), '0.66549999', 0.6655]) {
      assert.equal(formatMarketPrice(price, 'Futures', symbol, 'en-US'), '0.66550')
    }
  }
  assert.equal(formatMarketPrice(Math.fround(0.66555), 'Futures', '6AZ26', 'en-US'), '0.66555')
  assert.equal(formatMarketPrice(Math.fround(0.6655), 'Futures', '6AZ26', 'de-DE'), '0,66550')
})

test('major FX futures retain their own quote precision across price magnitudes', () => {
  for (const [symbol, value, expected] of [
    ['6BZ26', 1.26789999, '1.2679'],
    ['6CZ26', Math.fround(0.71525), '0.71525'],
    ['6EZ26', Math.fround(1.05355), '1.05355'],
    ['6JZ26', Math.fround(0.0066555), '0.0066555'],
    ['6NZ26', Math.fround(0.58555), '0.58555'],
    ['6SZ26', Math.fround(1.13255), '1.13255']
  ]) {
    assert.equal(formatMarketPrice(value, 'Futures', symbol, 'en-US'), expected)
  }
})

test('micro index futures retain quarter-point quotes and consistent decimal places', () => {
  assert.equal(formatMarketPrice(26711.25, 'Futures', 'MNQZ26', 'en-US'), '26,711.25')
  assert.equal(formatMarketPrice(7314, 'Futures', 'MESZ26', 'en-US'), '7,314.00')
  assert.equal(formatMarketPrice(7314.5, 'Futures', 'MESZ26', 'en-US'), '7,314.50')
})

test('other markets and unknown contracts preserve existing display behavior', () => {
  for (const [market, symbol, price, expected] of [
    ['Crypto', 'BTC/USDT', 61453.5, '61,453.5'],
    ['Crypto', '6A/USDT', 0.66549999, '0.66549999'],
    ['Crypto', 'PEPE/USDT', 0.00001234, '0.00001234'],
    ['USStock', 'MSFT', 489.9300003, '489.93'],
    ['HKStock', '03690', 65.75, '65.75'],
    ['Futures', 'UNKNOWNZ26', 0.12345678, '0.12345678'],
    ['Futures', '6AZ26-6AH27', 0.000025, '0.000025'],
    ['Futures', '6AZ26.OTHER', 0.12345678, '0.12345678']
  ]) {
    assert.equal(formatMarketPrice(price, market, symbol, 'en-US'), expected)
  }
})

test('missing and unusable prices remain unavailable', () => {
  for (const value of [null, undefined, '', 0, -1, Number.NaN, Infinity, 'bad']) {
    assert.equal(formatMarketPrice(value, 'Futures', '6AZ26', 'en-US'), '--')
  }
})
