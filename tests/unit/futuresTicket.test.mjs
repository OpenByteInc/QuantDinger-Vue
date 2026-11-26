import test from 'node:test'
import assert from 'node:assert/strict'
import { validFuturesOrder } from '../../src/utils/forthright.js'

test('futures tickets validate integral lots and the exchange price increment', () => {
  const contract = { prodCode: 'MESZ26', price_tick: 0.25 }
  for (const price of [7250, 7250.25, '7250.50']) assert.equal(validFuturesOrder(contract, 1, 'limit', price), true)
  for (const price of [7250.1, 0, -1, Infinity, NaN, '']) assert.equal(validFuturesOrder(contract, 1, 'limit', price), false)
  for (const quantity of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1, '']) assert.equal(validFuturesOrder(contract, quantity, 'market', null), false)
  assert.equal(validFuturesOrder(null, 1, 'market', null), false)
  assert.equal(validFuturesOrder(contract, 1, 'market', null), true)
  assert.equal(validFuturesOrder(contract, 1, 'stop', 7250), false)
})
