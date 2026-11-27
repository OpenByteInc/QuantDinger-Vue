import assert from 'node:assert/strict'
import test from 'node:test'
import { formatTradeCommission } from '../../src/utils/tradeCommission.js'
import messages from '../../src/locales/lang/strategy-trade-records.js'

const t = key => messages['zh-CN'][key]

test('HK strategy fees retain HKD, including confirmed zero and pending fees', () => {
  assert.equal(formatTradeCommission({ commission: 65.48, commission_quote: 65.48, commission_ccy: 'HKD', fee_status: 'actual' }, t), '65.48 HKD')
  assert.equal(formatTradeCommission({ commission: 0, commission_ccy: 'HKD', fee_status: 'actual_zero' }, t), '0.00 HKD')
  assert.equal(formatTradeCommission({ commission: 0, commission_ccy: 'HKD', fee_status: 'pending' }, t), '待确认')
})

test('missing and unconfirmed fees do not display as free trades', () => {
  for (const row of [{}, { commission: 0 }, { commission_quote: 0, fee_status: 'pending' }]) {
    assert.equal(formatTradeCommission(row, t), '待确认')
  }
})

test('confirmed zero fee is displayed as zero', () => {
  assert.equal(formatTradeCommission({ commission: 0, fee_status: 'actual_zero' }, t), '$0.00')
  assert.equal(formatTradeCommission({ commission: 0, commission_quote: 0, fee_status: 'complete' }, t), '$0.00')
})

test('quote fees preserve small amounts and override native fees', () => {
  assert.equal(formatTradeCommission({ commission_quote: 0.00001234, commission: 0.01 }, t), '$0.00001234')
})

test('stablecoin fee is presented as a dollar value when quote conversion is absent', () => {
  assert.equal(formatTradeCommission({ commission_quote: 0, commission: 0.57, commission_ccy: 'USDT' }, t), '$0.57')
})

test('unconverted native-asset fee remains pending instead of showing a coin amount', () => {
  assert.equal(formatTradeCommission({ commission_quote: 0, commission: 0.00003, commission_ccy: 'BNB' }, t), '待确认')
})
