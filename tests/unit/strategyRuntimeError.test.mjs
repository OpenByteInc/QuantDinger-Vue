import assert from 'node:assert/strict'
import test from 'node:test'
import messages from '../../src/locales/lang/strategy-live-risk.js'
import strategyMessages from '../../src/locales/lang/strategy-v2.js'
import brokerMessages from '../../src/locales/lang/forthright.js'
import { translateStrategyRuntimeError } from '../../src/utils/strategyRuntimeError.js'

for (const [locale, dictionary] of Object.entries(brokerMessages)) {
  test(`localizes broker deployment validation in ${locale}`, () => {
    const key = 'brokerAccounts.forthright.canonicalSymbolRequired'
    assert.ok(dictionary[key])
    assert.equal(translateStrategyRuntimeError(key, value => dictionary[value] || value), dictionary[key])
    assert.equal(
      translateStrategyRuntimeError(`${key}:HKStock:00700`, value => dictionary[value] || value),
      `${dictionary[key]} (HKStock:00700)`
    )
  })
}

for (const locale of ['en-US', 'zh-CN']) {
  test(`localizes the Binance one-way position-mode failure in ${locale}`, () => {
    const dictionary = messages[locale]
    const actual = translateStrategyRuntimeError(
      'strategyV2.dualDirectionHedgeModeRequired:binance_one_way_mode',
      key => dictionary[key] || key
    )

    assert.equal(
      actual,
      `${dictionary['strategyV2.dualDirectionHedgeModeRequired']} ${dictionary['strategyV2.positionModeDetail.binanceOneWay']}`
    )
    assert.doesNotMatch(actual, /strategyV2\.|binance_one_way_mode/)
  })

  test(`localizes a one-way strategy connected to a hedge-mode account in ${locale}`, () => {
    const dictionary = messages[locale]
    const actual = translateStrategyRuntimeError(
      'strategyV2.oneWayPositionModeRequired:binance_hedge_mode',
      key => dictionary[key] || key
    )

    assert.equal(
      actual,
      `${dictionary['strategyV2.oneWayPositionModeRequired']} ${dictionary['strategyV2.positionModeDetail.hedgeMode']}`
    )
    assert.doesNotMatch(actual, /strategyV2\.|binance_hedge_mode/)
  })
}

test('preserves unknown technical messages and localizes keys without details', () => {
  const translate = key => key === 'strategyRuntime.startFailed' ? 'localized start failure' : key

  assert.equal(translateStrategyRuntimeError('socket disconnected', translate), 'socket disconnected')
  assert.equal(translateStrategyRuntimeError('strategyRuntime.startFailed', translate), 'localized start failure')
})

test('keeps unknown details visible for diagnosis', () => {
  const actual = translateStrategyRuntimeError(
    'strategyV2.hedgeModeUnknown:exchange_probe_failed',
    key => key === 'strategyV2.hedgeModeUnknown' ? 'mode unavailable' : key
  )

  assert.equal(actual, 'mode unavailable (exchange_probe_failed)')
})

for (const locale of ['en-US', 'zh-CN']) {
  test(`localizes an unsubscribed history timeframe in ${locale}`, () => {
    const dictionary = strategyMessages[locale]
    const actual = translateStrategyRuntimeError(
      'strategyV2.frequencyNotSubscribed:1m',
      key => dictionary[key] || key
    )

    assert.match(actual, /1m/)
    assert.doesNotMatch(actual, /strategyV2\.frequencyNotSubscribed/)
  })
}
