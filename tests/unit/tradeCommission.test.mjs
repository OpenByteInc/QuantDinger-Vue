import assert from 'node:assert/strict'
import test from 'node:test'
import { formatTradeCommission } from '../../src/utils/tradeCommission.js'
import messages from '../../src/locales/lang/strategy-trade-records.js'

const t = key => messages['zh-CN'][key]

test('missing and unconfirmed fees do not display as free trades', () => {
  for (const row of [{}, { commission: 0 }, { commission_quote: 0, fee_status: 'pending' }]) {
    assert.equal(formatTradeCommission(row, t), '待确认')
  }
})

test('confirmed zero fee is displayed as zero', () => {
  assert.equal(formatTradeCommission({ commission: 0, fee_status: 'actual_zero' }, t), '$0.00')
})

test('quote fees preserve small amounts and override native fees', () => {
  assert.equal(formatTradeCommission({ commission_quote: 0.00001234, commission: 0.01 }, t), '$0.00001234')
})

test('unconverted BNB fee is not labelled in dollars or hidden behind zero quote', () => {
  assert.equal(formatTradeCommission({ commission_quote: 0, commission: 0.00003, commission_ccy: 'BNB' }, t), '0.00003 BNB')
})
