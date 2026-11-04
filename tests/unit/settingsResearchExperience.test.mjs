import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import settingsResearchOverrides from '../../src/locales/settings-research-overrides.js'

const locales = Object.keys(settingsResearchOverrides)

const researchExperienceKeys = [
  'settings.research.zeroConfigTitle',
  'settings.research.zeroConfigDesc',
  'settings.research.market.shared',
  'settings.research.market.sharedDesc',
  'settings.research.market.macro',
  'settings.research.market.macroDesc',
  'settings.research.market.us',
  'settings.research.market.usDesc',
  'settings.research.market.hk',
  'settings.research.market.hkDesc',
  'settings.research.market.crypto',
  'settings.research.market.cryptoDesc',
  'settings.research.market.futures',
  'settings.research.market.futuresDesc',
  'settings.research.market.forex',
  'settings.research.market.forexDesc',
  'settings.research.market.cn',
  'settings.research.market.cross',
  'settings.research.market.crossDesc',
  'settings.research.status.title',
  'settings.research.status.description',
  'settings.research.status.autoTier',
  'settings.research.status.community',
  'settings.research.status.communityHint',
  'settings.research.status.professional',
  'settings.research.status.professionalHint',
  'settings.group.macro_tools',
  'settings.group.market_intelligence',
  'settings.macroTools.tradingEconomicsTitle',
  'settings.macroTools.tradingEconomicsDesc',
  'settings.macroTools.blsTitle',
  'settings.macroTools.blsDesc',
  'settings.research.badge.recommended',
  'settings.research.badge.optional',
  'settings.research.badge.keyOptional',
  'settings.research.badge.publicReady',
  'settings.research.badge.noSetup',
  'settings.research.section.community',
  'settings.search.section.primary',
  'settings.search.section.primaryDesc',
  'settings.search.section.optional',
  'settings.search.section.optionalDesc',
  'settings.search.section.routing',
  'settings.search.section.routingDesc',
  'settings.search.badge.fallbackChain',
  'settings.search.badge.disabled',
  'settings.search.badge.primary',
  'settings.search.badge.fallback',
  'settings.search.badge.keyless',
  'settings.search.badge.linked',
  'settings.search.badge.legacy',
  'settings.search.badge.inactive',
  'settings.search.provider.tavilyDesc',
  'settings.search.provider.searxngDesc',
  'settings.search.provider.gdeltDesc',
  'settings.search.provider.serpapiDesc',
  'settings.search.provider.alphaVantageDesc',
  'settings.search.provider.googleDesc',
  'settings.search.provider.duckduckgoDesc',
  'settings.agent.section.validation',
  'settings.agent.section.validationDesc',
  'settings.agent.section.quality',
  'settings.agent.section.qualityDesc',
  'settings.agent.section.calibration',
  'settings.agent.section.calibrationDesc',
  'settings.agent.badge.shared',
  'settings.agent.badge.needsSamples',
  'settings.trading.agentPermissionSection',
  'settings.trading.agentPermissionSectionDesc',
  'settings.trading.agentPermissionBadge',
  'settings.marketCatalog.lastCompleted',
  'settings.marketCatalog.sourcesHealthy',
  'settings.marketCatalog.sourcesFailed',
  'settings.marketCatalog.recordsWritten',
  'settings.marketCatalog.catalogCoverageTitle',
  'settings.marketCatalog.failureTitle',
  'settings.marketCatalog.marketOverviewDesc',
  'settings.advanced.show',
  'settings.advanced.hide',
  'settings.advanced.description',
  'settings.desc.ALPHA_VANTAGE_API_KEY'
]

const canonicalLabels = {
  'settings.option.LLM_PROVIDER.atlascloud': 'AtlasCloud',
  'settings.option.LLM_PROVIDER.deepseek': 'DeepSeek',
  'settings.option.LLM_PROVIDER.grok': 'xAI Grok',
  'settings.option.LLM_PROVIDER.minimax': 'MiniMax',
  'settings.option.SEARCH_PROVIDER.tavily': 'Tavily',
  'settings.option.SEARCH_PROVIDER.searxng': 'SearXNG',
  'settings.option.SEARCH_PROVIDER.duckduckgo': 'DuckDuckGo',
  'settings.option.ADANOS_SENTIMENT_SOURCE.reddit': 'Reddit',
  'settings.option.ADANOS_SENTIMENT_SOURCE.x': 'X (Twitter)',
  'settings.option.ADANOS_SENTIMENT_SOURCE.news': 'News',
  'settings.option.ADANOS_SENTIMENT_SOURCE.polymarket': 'Polymarket',
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

test('research settings have complete copy in every supported locale', () => {
  assert.deepEqual(locales.sort(), [
    'ar-SA', 'de-DE', 'en-US', 'fr-FR', 'ja-JP', 'ko-KR',
    'ru-RU', 'th-TH', 'vi-VN', 'zh-CN', 'zh-TW'
  ])
  for (const locale of locales) {
    const messages = settingsResearchOverrides[locale]
    for (const key of researchExperienceKeys) {
      assert.equal(typeof messages[key], 'string', `${locale}.${key}`)
      assert.ok(messages[key].trim(), `${locale}.${key} is not empty`)
    }
  }
})

test('research settings are grouped by market and advanced controls start collapsed', () => {
  const source = readFileSync(
    new URL('../../src/views/settings/index.vue', import.meta.url),
    'utf8'
  )
  assert.match(source, /dataSourceSectionDefinitions \(\)/)
  assert.match(source, /searchSectionDefinitions \(\)/)
  assert.match(source, /agentSectionDefinitions \(\)/)
  for (const market of ['shared', 'macro', 'us', 'cross', 'crypto', 'futures', 'forex']) {
    assert.match(source, new RegExp(`settings\\.research\\.market\\.${market}`))
  }
  assert.match(source, /advancedKeys/)
  assert.match(source, /advancedExpanded: \{\}/)
  assert.doesNotMatch(source, /researchSettingsIntro/)
  assert.doesNotMatch(source, /research-market-map/)
  assert.match(source, /activeGroupKey === 'market_intelligence'/)
  assert.match(source, /macroToolSectionDefinitions \(\)/)
  assert.match(source, /'TRADING_ECONOMICS_BASE_URL', 'TRADING_ECONOMICS_TIMEOUT'/)
  assert.match(source, /'BLS_BASE_URL', 'BLS_TIMEOUT'/)
})

test('data status and sync is system infrastructure under core settings', () => {
  const source = readFileSync(
    new URL('../../src/views/settings/index.vue', import.meta.url),
    'utf8'
  )
  const coreStart = source.indexOf("key: 'core'")
  const researchStart = source.indexOf("key: 'research'")
  const operationsStart = source.indexOf("key: 'operations'")
  const coreBlock = source.slice(coreStart, researchStart)
  const researchBlock = source.slice(researchStart, operationsStart)

  assert.match(coreBlock, /market_catalog/)
  assert.doesNotMatch(researchBlock, /market_catalog/)
  assert.match(source, /catalog-health-card/)
  assert.match(source, /catalog-failure-panel/)
  assert.doesNotMatch(source, /<a-collapse v-if="catalogFailures\.length"/)
})

test('agent-related settings follow their runtime ownership', () => {
  const source = readFileSync(
    new URL('../../src/views/settings/index.vue', import.meta.url),
    'utf8'
  )
  const agentStart = source.indexOf('agentSectionDefinitions ()')
  const tradingStart = source.indexOf('tradingSectionDefinitions ()')
  const agentBlock = source.slice(agentStart, tradingStart)
  const tradingBlock = source.slice(tradingStart, source.indexOf('buildCategorizedEntries', tradingStart))

  assert.doesNotMatch(agentBlock, /QUANTDINGER_DEPLOYMENT_MODE/)
  assert.doesNotMatch(agentBlock, /AGENT_LIVE_TRADING_ENABLED/)
  assert.doesNotMatch(agentBlock, /ENABLE_AI_ENSEMBLE/)
  assert.match(agentBlock, /ENABLE_REFLECTION_WORKER/)
  assert.match(agentBlock, /ENABLE_CONFIDENCE_CALIBRATION/)
  assert.match(tradingBlock, /AGENT_LIVE_TRADING_ENABLED/)
  assert.match(source, /key: 'ensemble'/)
  assert.match(source, /ensembleEnabled/)
})

test('market-specific credentials appear only in their intended research sections', () => {
  const source = readFileSync(
    new URL('../../src/views/settings/index.vue', import.meta.url),
    'utf8'
  )
  for (const key of [
    'FINNHUB_API_KEY',
    'ALPHA_VANTAGE_API_KEY',
    'TWELVE_DATA_API_KEY',
    'COINGLASS_API_KEY',
    'CRYPTOQUANT_API_KEY',
    'TIINGO_API_KEY'
  ]) {
    assert.match(source, new RegExp(key))
  }
  assert.match(source, /CFTC positioning and public contract data are built in/)
  assert.match(source, /'FINNHUB_FREE_ONLY',\s*'ALPHA_VANTAGE_API_KEY'/)
  assert.match(source, /'ALPHA_VANTAGE_BASE_URL',\s*'ALPHA_VANTAGE_TIMEOUT',\s*'ALPHA_VANTAGE_NEWS_LIMIT'/)
})

test('professional report runtime controls are represented in the settings UI', () => {
  const source = readFileSync(
    new URL('../../src/views/settings/index.vue', import.meta.url),
    'utf8'
  )
  assert.doesNotMatch(source, /PROFESSIONAL_REPORT_DATA_TIER/)
  assert.match(source, /PROFESSIONAL_REPORT_RISK_BUDGET_PCT/)
  assert.match(source, /getProfessionalReportDataSources/)
  assert.match(source, /reportDataSourceSummary/)
  assert.doesNotMatch(source, /BEA_API_KEY/)

  for (const locale of locales) {
    assert.ok(
      settingsResearchOverrides[locale]['settings.field.FAST_ANALYSIS_INCLUDE_GLOBAL_NEWS'],
      `${locale} exposes the global-news control returned by the backend schema`
    )
  }
})

test('search settings mirror the implemented failover providers and react to the primary selection', () => {
  const source = readFileSync(
    new URL('../../src/views/settings/index.vue', import.meta.url),
    'utf8'
  )
  for (const key of [
    'SEARCH_PROVIDER',
    'SEARCH_MAX_RESULTS',
    'TAVILY_API_KEYS',
    'SEARCH_SEARXNG_BASE_URL',
    'GDELT_BASE_URL',
    'GDELT_MAX_RESULTS',
    'SERPAPI_KEYS',
    'SEARCH_GOOGLE_API_KEY',
    'SEARCH_GOOGLE_CX'
  ]) {
    assert.match(source, new RegExp(key))
  }
  assert.match(source, /selectedSearchProvider/)
  assert.match(source, /item\.key === 'SEARCH_PROVIDER'/)
  assert.doesNotMatch(source, /SEARCH_TIMEOUT/)
  assert.doesNotMatch(source, /SEARCH_DDG_BASE_URL/)
  assert.doesNotMatch(source, /SEARCH_GDELT_BASE_URL/)
  assert.doesNotMatch(source, /SEARCH_BING_API_KEY/)
})
