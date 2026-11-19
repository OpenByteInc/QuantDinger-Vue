import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import reportLocales from '../../src/locales/professional-report-overrides.js'

const supportedLocales = ['ar-SA', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', 'th-TH', 'vi-VN']

test('professional report core labels are localized outside English', () => {
  for (const locale of supportedLocales) {
    assert.notEqual(
      reportLocales[locale]['fastAnalysis.professionalReportTitle'],
      reportLocales['en-US']['fastAnalysis.professionalReportTitle'],
      locale
    )
    assert.notEqual(
      reportLocales[locale]['fastAnalysis.dimension.crypto_market_structure'],
      reportLocales['en-US']['fastAnalysis.dimension.crypto_market_structure'],
      locale
    )
    for (const key of [
      'fastAnalysis.dimension.market_specific',
      'fastAnalysis.capability.equity_deep_dive_v1',
      'fastAnalysis.capability.sample_bars',
      'fastAnalysis.capability.period_return_pct',
      'fastAnalysis.capability.realized_volatility_per_bar_pct',
      'fastAnalysis.capability.max_drawdown_pct',
      'fastAnalysis.capability.analyst_expectations',
      'fastAnalysis.capability.filings',
      'fastAnalysis.capability.financials',
      'fastAnalysis.capability.options_surface',
      'fastAnalysis.capability.ownership',
      'fastAnalysis.capability.price_history',
      'fastAnalysis.capability.short_interest',
      'fastAnalysis.warning.no_directional_position',
      'aiAssetAnalysis.copilot.collapseReport',
      'aiAssetAnalysis.copilot.shareReport',
      'aiAssetAnalysis.copilot.shareCopied',
      'aiAssetAnalysis.copilot.shareFailed',
      'aiAssetAnalysis.copilot.shareSaveFailed'
    ]) {
      assert.ok(reportLocales[locale][key], `${locale}: missing ${key}`)
      assert.notEqual(reportLocales[locale][key], reportLocales['en-US'][key], `${locale}: ${key}`)
    }
  }
})

test('crypto and macro summaries have localized structured-copy tokens', () => {
  for (const locale of Object.keys(reportLocales)) {
    assert.ok(reportLocales[locale]['fastAnalysis.cryptoSummary.volume.expanding'], locale)
    assert.ok(reportLocales[locale]['fastAnalysis.cryptoSummary.bias.neutral'], locale)
    assert.ok(reportLocales[locale]['fastAnalysis.cryptoSummary.crowding.low'], locale)
    assert.ok(reportLocales[locale]['fastAnalysis.macroSummary.available'], locale)
    assert.ok(reportLocales[locale]['fastAnalysis.macroSummary.unavailable'], locale)
  }
})

test('report dimensions render structured narrative codes through i18n', () => {
  const source = fs.readFileSync(
    new URL('../../src/views/ai-analysis/components/ProfessionalAnalysisReport.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /dimensionNarrative\(item\)/)
  assert.match(source, /legacyCryptoNarrativeCode/)
  assert.match(source, /fastAnalysis\.cryptoSummary/)
  assert.match(source, /fastAnalysis\.macroSummary/)
})

test('curated report translations override generated locale values', () => {
  const source = fs.readFileSync(
    new URL('../../src/locales/index.js', import.meta.url),
    'utf8'
  )

  assert.ok(
    source.lastIndexOf('professionalReportOverrides[lang]') > source.lastIndexOf('generatedLocaleOverrides[lang]')
  )
})

test('monitoring scenarios share localization and all research gaps are visible', () => {
  const source = fs.readFileSync(
    new URL('../../src/views/ai-analysis/components/ProfessionalAnalysisReport.vue', import.meta.url), 'utf8'
  )
  assert.match(source, /scenarioTriggerLabel\(\{ \.\.\.item, trigger: item.text \}\)/)
  assert.match(source, /missing_required_capabilities/)
  assert.match(source, /missing_optional_capabilities/)
  assert.match(source, /fastAnalysis\.qualityScopeNote/)
  assert.equal(Object.keys(reportLocales).length, 11)
  for (const locale of Object.keys(reportLocales)) {
    for (const key of ['cn_equity_deep_dive_v1', 'company_profile', 'company_name', 'company_news', 'exchange_disclosures', 'northbound_flow', 'margin_financing', 'financial_statements', 'cn_macro']) {
      const path = `fastAnalysis.capability.${key}`
      assert.ok(reportLocales[locale][path], `${locale}: ${key}`)
      if (locale !== 'en-US') assert.notEqual(reportLocales[locale][path], reportLocales['en-US'][path], `${locale}: ${key}`)
    }
    for (const key of ['qualityScope', 'qualityScopeNote', 'scenarioTrigger.bull', 'scenarioTrigger.base', 'scenarioTrigger.bear', 'readiness.decision_ready', 'readiness.conditional', 'readiness.insufficient']) {
      const path = `fastAnalysis.${key}`
      assert.ok(reportLocales[locale][path], `${locale}: ${key}`)
      if (locale !== 'en-US') assert.notEqual(reportLocales[locale][path], reportLocales['en-US'][path], `${locale}: ${key}`)
    }
  }
})

test('Japanese and Korean evidence labels do not inherit English report defaults', () => {
  for (const locale of ['ja-JP', 'ko-KR']) {
    for (const prefix of ['fastAnalysis.metricPart.', 'fastAnalysis.evidenceValueEnum.']) {
      for (const key of Object.keys(reportLocales[locale]).filter(key => key.startsWith(prefix))) {
        if (['rsi', 'macd', 'atr'].some(token => key === `${prefix}${token}`)) continue
        if (['quote', 'financial', 'profit_margin', 'roe', 'free_cash_flow', 'debt', 'currency', 'quarterly', 'annual', 'bearish', 'bullish'].some(token => key === `${prefix}${token}`)) {
          assert.notEqual(reportLocales[locale][key], reportLocales['en-US'][key], `${locale}: ${key}`)
        }
      }
    }
  }
})
