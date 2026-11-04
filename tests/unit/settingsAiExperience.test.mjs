import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import messages from '../../src/locales/settings-ai-overrides.js'

const settingsSource = readFileSync(
  new URL('../../src/views/settings/index.vue', import.meta.url),
  'utf8'
)

const supportedLocales = [
  'ar-SA', 'de-DE', 'en-US', 'fr-FR', 'ja-JP', 'ko-KR',
  'ru-RU', 'th-TH', 'vi-VN', 'zh-CN', 'zh-TW'
]

const requiredKeys = [
  'settings.llm.currentProviderLabel',
  'settings.llm.currentProviderDesc',
  'settings.field.JEV_ENABLED',
  'settings.desc.JEV_ENABLED',
  'settings.llm.jevEnabledBadge',
  'settings.llm.jevDisabledBadge',
  'settings.llm.codeSection',
  'settings.llm.analysisSection',
  'settings.llm.runtimeSection',
  'settings.field.OPENROUTER_TEMPERATURE',
  'settings.field.AI_ANALYSIS_CONSENSUS_TIMEFRAMES'
]

test('AI provider guidance uses the compact status treatment', () => {
  assert.match(settingsSource, /class="ai-provider-status"/)
  assert.doesNotMatch(settingsSource, /class="ai-provider-alert"/)
})

test('AI settings group active parameters by their actual scope', () => {
  assert.match(settingsSource, /item\.key === 'JEV_ENABLED'/)
  assert.match(settingsSource, /item\.key === 'AI_DECISION_TIMEOUT_SECONDS'/)
  assert.match(settingsSource, /\['AI_CODE_GEN_MODEL', 'OPENROUTER_TEMPERATURE'\]/)
  assert.match(settingsSource, /item\.key === 'AI_ANALYSIS_CONSENSUS_TIMEFRAMES'/)
  assert.match(settingsSource, /item\.key === 'LLM_MAX_TOKENS'/)
  assert.doesNotMatch(settingsSource, /item\.key === 'SEC_EDGAR_USER_AGENT'/)
})

test('AI settings copy is complete for every supported locale', () => {
  assert.deepEqual(Object.keys(messages).sort(), supportedLocales)
  for (const locale of supportedLocales) {
    for (const key of requiredKeys) {
      assert.equal(typeof messages[locale][key], 'string', `${locale}.${key}`)
      assert.ok(messages[locale][key].trim(), `${locale}.${key} is empty`)
    }
  }
})
