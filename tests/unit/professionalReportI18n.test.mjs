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
