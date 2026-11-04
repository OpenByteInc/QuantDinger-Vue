import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import messages from '../../src/locales/settings-trading-overrides.js'

const settingsSource = readFileSync(
  new URL('../../src/views/settings/index.vue', import.meta.url),
  'utf8'
)

const supportedLocales = [
  'ar-SA', 'de-DE', 'en-US', 'fr-FR', 'ja-JP', 'ko-KR',
  'ru-RU', 'th-TH', 'vi-VN', 'zh-CN', 'zh-TW'
]

const requiredKeys = [
  'settings.trading.executionSection',
  'settings.trading.executionSectionDesc',
  'settings.trading.executionBadge',
  'settings.field.MAKER_WAIT_SEC',
  'settings.desc.MAKER_WAIT_SEC',
  'settings.field.MAKER_OFFSET_BPS',
  'settings.desc.MAKER_OFFSET_BPS'
]

test('live trading settings show only effective maker defaults without a disclosure', () => {
  assert.match(settingsSource, /tradingSectionDefinitions \(\)/)
  assert.match(settingsSource, /keys: \['MAKER_WAIT_SEC', 'MAKER_OFFSET_BPS'\]/)
  assert.match(settingsSource, /advancedKeys: \[\]/)
  assert.doesNotMatch(settingsSource, /ALLOW_LOCAL_DESKTOP_BROKERS/)
  assert.doesNotMatch(settingsSource, /ENABLE_PENDING_ORDER_WORKER/)
  assert.doesNotMatch(settingsSource, /DISABLE_RESTORE_RUNNING_STRATEGIES/)
})

test('live order default copy is complete for every supported locale', () => {
  assert.deepEqual(Object.keys(messages).sort(), supportedLocales)
  for (const locale of supportedLocales) {
    for (const key of requiredKeys) {
      assert.equal(typeof messages[locale][key], 'string', `${locale}.${key}`)
      assert.ok(messages[locale][key].trim(), `${locale}.${key} is empty`)
    }
  }
})
