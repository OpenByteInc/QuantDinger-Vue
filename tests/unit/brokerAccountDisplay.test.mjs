import test from 'node:test'
import assert from 'node:assert/strict'
import { firstValue, brokerMoney, brokerQuantity, brokerTime } from '../../src/utils/brokerAccountDisplay.js'
import { brokerOrderCanCancel } from '../../src/utils/brokerOrderStatus.js'

test('zero, missing prices and fractional shares remain distinct', () => {
  assert.equal(firstValue(0, 100), 0)
  assert.equal(brokerMoney(firstValue(0, -14)), '$0.00')
  assert.equal(brokerMoney(null), '--')
  assert.equal(brokerMoney(undefined), '--')
  assert.equal(brokerMoney(-14), '-$14.00')
  assert.equal(brokerQuantity(0.000349125), '0.000349125')
  assert.equal(brokerQuantity(null), '--')
})

test('timestamps include date and timezone without inventing missing fills', () => {
  assert.equal(brokerTime(null), '--')
  assert.equal(brokerTime('invalid'), '--')
  assert.match(brokerTime('2026-09-11T14:00:01Z', 'en-US'), /2026/)
})

test('only known actionable order states expose cancellation', () => {
  for (const status of ['filled', 'canceled', 'cancelled', 'rejected', 'expired', 'replaced', 'done_for_day', 'pending_cancel', 'pending_replace', '', 'unknown']) {
    assert.equal(brokerOrderCanCancel({ id: '1', status }), false, status)
  }
  for (const status of ['new', 'accepted', 'partially_filled']) {
    assert.equal(brokerOrderCanCancel({ id: '1', status }), true, status)
  }
  assert.equal(brokerOrderCanCancel({ status: 'new' }), false)
  assert.equal(brokerOrderCanCancel({ id: '1', status: 'Submitted' }, 'ibkr'), true)
})


test('broker rows retain original currency independently of account display currency', async () => {
  const { brokerRowCurrency, brokerPrice } = await import('../../src/utils/brokerAccountDisplay.js')
  const row = { symbol: '00700.HK', currency: 'HKD' }
  assert.equal(brokerRowCurrency(row, 'forthright'), 'HKD')
  assert.match(brokerPrice(345.4, brokerRowCurrency(row, 'forthright')), /HK.*345.40/)
  assert.equal(brokerRowCurrency({ symbol: 'AAPL', market: 'USStock' }, 'forthright'), 'USD')
  assert.equal(brokerPrice(null, 'USD'), '--')
  assert.equal(brokerRowCurrency({ market: 'Futures' }, 'forthright'), null)
  assert.equal(brokerPrice(345.4, null), '--')
})
