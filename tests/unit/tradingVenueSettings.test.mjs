import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import tradingVenueMessages from '../../src/locales/lang/trading-venue-settings.js'
import {
  DEFAULT_TRADING_VENUE_IDS,
  normalizeEnabledTradingVenues
} from '../../src/utils/tradingVenueConfig.js'


test('trading venue settings include every supported broker and exchange', () => {
  assert.deepEqual(DEFAULT_TRADING_VENUE_IDS, [
    'alpaca', 'ibkr', 'tiger', 'webull',
    'binance', 'okx', 'bybit', 'bitget', 'gate', 'htx'
  ])
})


test('missing public config preserves every venue while an explicit empty list disables all', () => {
  assert.deepEqual(normalizeEnabledTradingVenues(undefined), [...DEFAULT_TRADING_VENUE_IDS])
  assert.deepEqual(normalizeEnabledTradingVenues([]), [])
  assert.deepEqual(normalizeEnabledTradingVenues(['Tiger', 'gate', 'unknown']), ['tiger', 'gate'])
})


test('venue settings copy is available in every supported locale', () => {
  const locales = Object.keys(tradingVenueMessages).sort()
  assert.deepEqual(locales, [
    'ar-SA', 'de-DE', 'en-US', 'fr-FR', 'ja-JP', 'ko-KR',
    'ru-RU', 'th-TH', 'vi-VN', 'zh-CN', 'zh-TW'
  ])
  for (const locale of locales) {
    assert.ok(tradingVenueMessages[locale]['settings.field.ENABLED_TRADING_VENUES'])
    assert.ok(tradingVenueMessages[locale]['settings.venues.description'])
    assert.ok(tradingVenueMessages[locale]['brokerAccounts.tradingVenueDisabled'])
  }
})


test('settings, broker workspace, and credential modal consume the venue policy', () => {
  const settings = readFileSync(new URL('../../src/views/settings/index.vue', import.meta.url), 'utf8')
  const brokers = readFileSync(new URL('../../src/views/broker-accounts/index.vue', import.meta.url), 'utf8')
  const modal = readFileSync(new URL('../../src/components/ExchangeAccountModal/ExchangeAccountModal.vue', import.meta.url), 'utf8')

  assert.match(settings, /venue_multiselect/)
  assert.match(settings, /tradingVenueGroups/)
  assert.match(settings, /market-settings-layout/)
  assert.match(settings, /trading-venue-notice/)
  assert.doesNotMatch(settings, /class="trading-venue-alert"/)
  assert.match(brokers, /enabledTradingVenues/)
  assert.match(modal, /normalizeEnabledTradingVenues/)
})


test('Tiger provider logo uses the official downloaded asset', () => {
  const source = readFileSync(new URL('../../src/constants/providerLogos.js', import.meta.url), 'utf8')
  assert.match(source, /tiger-official\.png/)
  assert.doesNotMatch(source, /provider-logos\/tiger\.svg/)
})
