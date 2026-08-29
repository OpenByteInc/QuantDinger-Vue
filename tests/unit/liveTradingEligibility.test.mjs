import test from 'node:test'
import assert from 'node:assert/strict'

import {
  supportsLiveExecutionMode,
  credentialMatchesLiveStrategy
} from '../../src/utils/liveTradingEligibility.js'

const CRYPTO_EXCHANGES = ['binance', 'bitget', 'bybit', 'okx', 'gate', 'htx']

test('crypto CTA strategy supports live', () => {
  assert.equal(supportsLiveExecutionMode({ strategyType: 'cta', markets: ['Crypto'] }), true)
})

test('crypto portfolio supports live (issue 225)', () => {
  assert.equal(
    supportsLiveExecutionMode({ strategyType: 'portfolio', markets: ['Crypto'] }),
    true
  )
})

test('USStock portfolio still supports live', () => {
  assert.equal(
    supportsLiveExecutionMode({ strategyType: 'portfolio', markets: ['USStock'] }),
    true
  )
})

test('mixed-market strategy does not support live', () => {
  assert.equal(
    supportsLiveExecutionMode({ strategyType: 'portfolio', markets: ['Crypto', 'USStock'] }),
    false
  )
})

test('unknown market does not support live', () => {
  assert.equal(supportsLiveExecutionMode({ strategyType: 'cta', markets: ['Forex'] }), false)
})

test('crypto portfolio accepts crypto exchange credentials', () => {
  for (const exchange of CRYPTO_EXCHANGES) {
    assert.equal(
      credentialMatchesLiveStrategy(
        { strategyType: 'portfolio', markets: ['Crypto'] },
        exchange
      ),
      true,
      `expected ${exchange} to be accepted for a crypto portfolio`
    )
  }
})

test('crypto portfolio rejects non-crypto credentials', () => {
  assert.equal(
    credentialMatchesLiveStrategy(
      { strategyType: 'portfolio', markets: ['Crypto'] },
      'alpaca'
    ),
    false
  )
})

test('USStock portfolio accepts alpaca and ibkr', () => {
  for (const exchange of ['alpaca', 'ibkr']) {
    assert.equal(
      credentialMatchesLiveStrategy(
        { strategyType: 'portfolio', markets: ['USStock'] },
        exchange
      ),
      true
    )
  }
})

test('USStock portfolio rejects crypto exchanges', () => {
  assert.equal(
    credentialMatchesLiveStrategy(
      { strategyType: 'portfolio', markets: ['USStock'] },
      'binance'
    ),
    false
  )
})

test('crypto CTA keeps existing crypto-exchange behaviour', () => {
  assert.equal(
    credentialMatchesLiveStrategy({ strategyType: 'cta', markets: ['Crypto'] }, 'binance'),
    true
  )
  assert.equal(
    credentialMatchesLiveStrategy({ strategyType: 'cta', markets: ['Crypto'] }, 'alpaca'),
    false
  )
})
