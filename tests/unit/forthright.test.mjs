import test from 'node:test'
import assert from 'node:assert/strict'
import { credentialMatchesLiveStrategy, supportsLiveExecutionMode } from '../../src/utils/exchangeCredential.js'
import messages from '../../src/locales/lang/forthright.js'
import { forthrightBuyingPower } from '../../src/utils/forthright.js'

test('Forthright uses total buying power, preserves zero and rejects wrong-currency snapshots', () => {
  assert.equal(forthrightBuyingPower({ currency: 'USD', buying_power: 1000, available_cash: 0 }, 'USD'), 1000)
  assert.equal(forthrightBuyingPower({ currency: 'HKD', buying_power: 0, cash: 1000 }, 'HKD'), 0)
  assert.equal(forthrightBuyingPower({ currency: 'USD', buying_power: -10 }, 'USD'), 0)
  for (const value of [undefined, null, '', 'invalid', Infinity]) {
    assert.equal(forthrightBuyingPower({ currency: 'USD', buying_power: value, cash: 1000 }, 'USD'), null)
  }
  assert.equal(forthrightBuyingPower({ currency: 'USD', buying_power: 1000 }, 'HKD'), null)
})

test('Forthright account types cannot cross securities and futures strategy routes', () => {
  for (const market of ['USStock', 'HKStock', 'Futures']) {
    const manifest = { markets: [market] }
    assert.equal(supportsLiveExecutionMode(manifest), market !== 'Futures')
    assert.equal(credentialMatchesLiveStrategy(manifest, 'forthright', 'futures'), false)
    assert.equal(credentialMatchesLiveStrategy(manifest, 'forthright', 'securities'), market !== 'Futures')
    assert.equal(credentialMatchesLiveStrategy(manifest, 'forthright'), false)
  }
  for (const market of ['Crypto', 'Options', 'Forex']) {
    assert.equal(credentialMatchesLiveStrategy({ markets: [market] }, 'forthright', 'futures'), false)
  }
  assert.equal(credentialMatchesLiveStrategy({ markets: ['USStock', 'Futures'] }, 'forthright', 'futures'), false)
})

test('Forthright account errors and form labels exist in every application locale', () => {
  const keys = Object.keys(messages['en-US']).sort()
  for (const locale of Object.keys(messages)) {
    assert.deepEqual(Object.keys(messages[locale]).sort(), keys)
    assert.ok(Object.values(messages[locale]).every(value => typeof value === 'string' && value.trim()))
    for (const key of ['settings.venues.name.forthright', 'settings.venues.desc.forthright', 'brokerAccounts.market.USStock', 'brokerAccounts.market.HKStock', 'brokerAccounts.market.Futures']) {
      assert.ok(messages[locale][key], `${locale}: ${key}`)
    }
    if (locale !== 'en-US') {
      for (const key of ['brokerAccounts.forthright.helpText', 'brokerAccounts.forthright.secondAuthRequired']) {
        assert.notEqual(messages[locale][key], messages['en-US'][key], `${locale}: untranslated ${key}`)
      }
    }
  }
})


test('Stock quantity precision and formatting follow the selected market', async () => {
  const { stockQuantityPrecision, compactQuantity } = await import('../../src/utils/forthright.js')
  assert.equal(stockQuantityPrecision('HKStock', 'forthright'), 0)
  assert.equal(stockQuantityPrecision('USStock', 'forthright'), 4)
  assert.equal(stockQuantityPrecision('Crypto', 'binance'), 8)
  assert.equal(compactQuantity('10.00000000'), '10')
  assert.equal(compactQuantity('1.2340'), '1.234')
  assert.equal(compactQuantity('0.0001'), '0.0001')
})

test('Broker diagnostics preserve both the uncertainty warning and upstream detail', async () => {
  const { forthrightErrorMessage } = await import('../../src/utils/forthright.js')
  const t = (key, values) => values ? `${key}:${values.code}:${values.message}` : key
  const text = forthrightErrorMessage({ error: 'executionUnknown', broker_details: { code: '10000', message: 'upstream reason', replacement_on_wire: true } }, t)
  assert.match(text, /executionUnknown/)
  assert.match(text, /10000:upstream reason/)
  assert.match(text, /encodingLost/)
})
