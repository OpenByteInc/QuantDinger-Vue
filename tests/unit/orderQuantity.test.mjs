import test from 'node:test'
import assert from 'node:assert/strict'

test('board-lot budgets floor exact multiples without increasing allocation', () => {
  assert.equal(quantityFromAmount(1000, 90, 0, 100), 0)
  assert.equal(quantityFromAmount(10000, 90, 0, 100), 100)
  assert.equal(quantityFromAmount(27000, 90, 0, 100), 300)
  assert.equal(quantityFromAmount(10000, 90, 0, 500), 0)
  assert.equal(quantityFromAmount(0.29, 0.01, 0, 1), 29)
})
import { quantityFromAmount } from '../../src/utils/orderQuantity.mjs'

test('exact budget boundaries do not lose a whole or fractional share', () => {
  assert.equal(quantityFromAmount('0.29', '0.01', 0), 29)
  assert.equal(quantityFromAmount('.29', '+.01', 0), 29)
  assert.equal(quantityFromAmount('0.000029', '0.01', 4), 0.0029)
  assert.equal(quantityFromAmount('2.9e-7', '1e-2', 6), 0.000029)
})

test('conversion never rounds an undersized budget up', () => {
  assert.equal(quantityFromAmount('0.289999999999', '0.01', 0), 28)
  assert.equal(quantityFromAmount(100, 3, 4), 33.3333)
  assert.equal(quantityFromAmount('0.0000289999999', '0.01', 4), 0.0028)
  assert.equal(quantityFromAmount(1, 2, 0), 0)
})

test('invalid values and unsafe scaled quantities cannot produce an order', () => {
  for (const invalid of [0, -1, '', null, undefined, NaN, Infinity, '1e1000']) {
    assert.equal(quantityFromAmount(invalid, 1, 4), 0)
    assert.equal(quantityFromAmount(1, invalid, 4), 0)
  }
  assert.equal(quantityFromAmount(1e18, 1, 4), 0)
  assert.equal(quantityFromAmount(1, 1, -1), 0)
})
