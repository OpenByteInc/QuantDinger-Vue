import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import settingsResearchOverrides from '../../src/locales/settings-research-overrides.js'

const locales = Object.keys(settingsResearchOverrides)

const canonicalLabels = {
  'settings.option.LLM_PROVIDER.atlascloud': 'AtlasCloud',
  'settings.option.LLM_PROVIDER.deepseek': 'DeepSeek',
  'settings.option.LLM_PROVIDER.grok': 'xAI Grok',
  'settings.option.LLM_PROVIDER.minimax': 'MiniMax',
  'settings.option.SEARCH_PROVIDER.tavily': 'Tavily',
  'settings.option.SEARCH_PROVIDER.searxng': 'SearXNG',
  'settings.option.SEARCH_PROVIDER.duckduckgo': 'DuckDuckGo',
  'settings.field.OPENROUTER_API_URL': 'OpenRouter API URL',
  'settings.field.GROK_BASE_URL': 'xAI Grok Base URL',
  'settings.field.TWELVE_DATA_API_KEY': 'Twelve Data API Key',
  'settings.field.COINGLASS_API_KEY': 'CoinGlass API Key',
  'settings.field.CRYPTOQUANT_API_KEY': 'CryptoQuant API Key',
  'settings.field.TRADING_ECONOMICS_KEY': 'Trading Economics API Key',
  'settings.field.GOOGLE_CLIENT_ID': 'Google OAuth Client ID',
  'settings.field.TURNSTILE_SITE_KEY': 'Cloudflare Turnstile Site Key'
}

test('provider and API brands keep canonical names in every locale', () => {
  for (const locale of locales) {
    const messages = settingsResearchOverrides[locale]
    for (const [key, expected] of Object.entries(canonicalLabels)) {
      assert.equal(messages[key], expected, `${locale}.${key}`)
    }
  }
})

test('research settings are grouped and advanced controls start collapsed', () => {
  const source = readFileSync(
    new URL('../../src/views/settings/index.vue', import.meta.url),
    'utf8'
  )
  assert.match(source, /dataSourceSectionDefinitions \(\)/)
  assert.match(source, /searchSectionDefinitions \(\)/)
  assert.match(source, /settings\.research\.section\.community/)
  assert.match(source, /settings\.research\.section\.professional/)
  assert.match(source, /advancedExpanded: \{\}/)
  assert.match(source, /settings\.research\.zeroConfigTitle/)
})

test('professional report runtime controls are represented in the settings UI', () => {
  const source = readFileSync(
    new URL('../../src/views/settings/index.vue', import.meta.url),
    'utf8'
  )
  for (const key of [
    'PROFESSIONAL_REPORT_DATA_TIER',
    'PROFESSIONAL_REPORT_RISK_BUDGET_PCT'
  ]) {
    assert.match(source, new RegExp(key))
  }

  for (const locale of locales) {
    assert.ok(
      settingsResearchOverrides[locale]['settings.field.FAST_ANALYSIS_INCLUDE_GLOBAL_NEWS'],
      `${locale} exposes the global-news control returned by the backend schema`
    )
  }
})
