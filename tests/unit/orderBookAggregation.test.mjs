import assert from 'node:assert/strict'
import test from 'node:test'

import { aggregateOrderBookRows, deriveOrderBookAggregationStep } from '../../src/utils/orderBookAggregation.js'

test('aggregation step expands five native ticks into one stable price group', () => {
  const bids = [{ price: 100, size: 1 }, { price: 99.9, size: 2 }, { price: 99.8, size: 3 }]
  const asks = [{ price: 100.1, size: 1 }, { price: 100.2, size: 2 }, { price: 100.3, size: 3 }]
  assert.equal(deriveOrderBookAggregationStep(bids, asks, 100.05), 0.5)
})

test('bid aggregation preserves the best actionable price and sums grouped liquidity', () => {
  const rows = [
    { price: 100, size: 1 },
    { price: 99.9, size: 2 },
    { price: 99.6, size: 3 },
    { price: 99.4, size: 4 }
  ]
  assert.deepEqual(aggregateOrderBookRows(rows, 'bid', 0.5), [
    { price: 100, size: 1, levelCount: 1 },
    { price: 99.9, size: 5, levelCount: 2 },
    { price: 99.4, size: 4, levelCount: 1 }
  ])
})

test('ask aggregation preserves the best actionable price and rejects invalid rows', () => {
  const rows = [
    { price: 100.1, size: 1 },
    { price: 100.4, size: 2 },
    { price: 100.6, size: 3 },
    { price: 0, size: 99 },
    { price: 100.7, size: -1 }
  ]
  assert.deepEqual(aggregateOrderBookRows(rows, 'ask', 0.5), [
    { price: 100.1, size: 3, levelCount: 2 },
    { price: 100.6, size: 3, levelCount: 1 }
  ])
})
