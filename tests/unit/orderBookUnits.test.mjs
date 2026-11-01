import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeContractOrderBook,
  orderBookQuantityUnit,
  usesNativeContractQuantity
} from '../../src/utils/orderBookUnits.js'

test('native contract venues require quantity normalization only for derivatives', () => {
  assert.equal(usesNativeContractQuantity('okx', 'swap'), true)
  assert.equal(usesNativeContractQuantity('gate', 'futures'), true)
  assert.equal(usesNativeContractQuantity('htx', 'contract'), true)
  assert.equal(usesNativeContractQuantity('okx', 'spot'), false)
  assert.equal(usesNativeContractQuantity('binance', 'swap'), false)
})

test('all six exchanges expose an explicit derivative quantity unit', () => {
  const expected = {
    binance: 'base',
    okx: 'contracts',
    bitget: 'base',
    bybit: 'base',
    gate: 'contracts',
    htx: 'contracts'
  }
  Object.entries(expected).forEach(([exchange, unit]) => {
    assert.equal(orderBookQuantityUnit(exchange, 'swap'), unit)
    assert.equal(orderBookQuantityUnit(exchange, 'spot'), 'base')
  })
})

test('contract order book quantities convert to base asset units exactly once', () => {
  const snapshot = {
    bids: [{ price: 100, size: 2, notional: 200 }],
    asks: [{ price: 101, size: 3, notional: 303 }]
  }
  const normalized = normalizeContractOrderBook(snapshot, 0.01)
  assert.deepEqual(normalized.bids, [{ price: 100, size: 0.02, notional: 2 }])
  assert.deepEqual(normalized.asks, [{ price: 101, size: 0.03, notional: 3.03 }])
  assert.equal(normalized.quantity_unit, 'base')
  assert.equal(normalized.quantity_normalized, true)
  assert.strictEqual(normalizeContractOrderBook(normalized, 0.01), normalized)
})

test('missing contract metadata leaves native quantities untouched', () => {
  const snapshot = { bids: [{ price: 100, size: 2 }], asks: [{ price: 101, size: 3 }] }
  assert.strictEqual(normalizeContractOrderBook(snapshot, 0), snapshot)
})

test('base-quantity derivatives are never multiplied by contract metadata', () => {
  const snapshot = {
    quantity_unit: 'base',
    bids: [{ price: 100, size: 2, notional: 200 }],
    asks: [{ price: 101, size: 3, notional: 303 }]
  }
  assert.strictEqual(normalizeContractOrderBook(snapshot, 1000), snapshot)
})
