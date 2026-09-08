import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { resolveDecisionLabelKey } from '../../src/utils/fastAnalysisPresentation.js'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('professional analysis has one canonical page and no hidden legacy renderer', () => {
  const page = read('src/views/ai-analysis/index.vue')
  const assetPage = read('src/views/ai-asset-analysis/index.vue')
  const workbench = read('src/views/ai-analysis/components/CopilotWorkbench.vue')

  assert.doesNotMatch(page, /v-if="false"/)
  assert.doesNotMatch(page, /getEconomicCalendar|fastAnalyze|FastAnalysisReport/)
  assert.match(page, /<CopilotWorkbench/)
  assert.match(assetPage, /<AnalysisView/)
  assert.doesNotMatch(assetPage, /OpportunityRadar|showOpportunityRadar|QuickTrade/)
  assert.match(workbench, /<ProfessionalAnalysisReport/)
  assert.match(workbench, /ProfessionalAnalysisReport from '\.\/ProfessionalAnalysisReport\.vue'/)
  assert.doesNotMatch(workbench, /<FastAnalysisReport/)
})

test('professional report renders only the versioned evidence contract', () => {
  const report = read('src/views/ai-analysis/components/ProfessionalAnalysisReport.vue')

  assert.match(report, /professional_report_v1/)
  assert.match(report, /evidence_snapshot\?\.observations/)
  assert.match(report, /data_quality/)
  assert.match(report, /decision_profile/)
  assert.match(report, /risk_plan/)
  assert.match(report, /net_risk_reward/)
  assert.match(report, /scenarioTriggerLabel\(scenario\)/)
  assert.match(report, /claimKindLabel\(claim\.kind\)/)
  assert.match(report, /safeUrl\(item\.source_url\)/)
  assert.doesNotMatch(report, /trading_plan|detailed_analysis|crypto_factors|regime_performance/)
})

test('new requests explicitly negotiate the professional response contract', () => {
  const workbench = read('src/views/ai-analysis/components/CopilotWorkbench.vue')

  assert.match(workbench, /response_contract: 'professional_report_v1'/)
  assert.match(workbench, /fastAnalysis\.professionalResponseInvalid/)
  assert.match(workbench, /schema_version: 'professional_analysis_envelope_v1'/)
  assert.match(workbench, /professionalArtifact \(value\)/)
  assert.match(workbench, /value\.report \|\| value\.professional_report \|\| value/)
  assert.doesNotMatch(workbench, /msg\.report\.trading_plan|msg\.report\.market_data/)
})

test('hold reports do not present risk reward as actionable', () => {
  const workbench = read('src/views/ai-analysis/components/CopilotWorkbench.vue')

  assert.match(workbench, /reportRiskReward \(msg\)[\s\S]*?=== 'HOLD'\) return '--'/)
  assert.match(workbench, /reportHasRrWarning \(msg\)[\s\S]*?=== 'HOLD'\) return false/)
  assert.match(workbench, /plan\.net_risk_reward \?\? plan\.gross_risk_reward/)
})

test('symbol search is global and offers an inferred symbol when providers return no matches', () => {
  const workbench = read('src/views/ai-analysis/components/CopilotWorkbench.vue')
  const searchMethod = workbench.slice(
    workbench.indexOf('async doSymbolSearch (keyword)'),
    workbench.indexOf('handleSymbolChange (value)')
  )

  assert.doesNotMatch(searchMethod, /params\.market/)
  assert.match(searchMethod, /if \(!this\.symbolOptions\.length\)/)
  assert.match(searchMethod, /this\.inferSymbolFromText\(kw\)/)
  assert.match(workbench, /const plainTicker = value\.trim\(\)\.match/)
})

test('professional report formats prices using the instrument quote currency', () => {
  const report = read('src/views/ai-analysis/components/ProfessionalAnalysisReport.vue')

  assert.match(report, /instrument\.quote_currency \|\| 'USD'/)
  assert.match(report, /formatMoney \(value\)/)
  assert.doesNotMatch(report, /<div class="price-value">\$\{\{/)
})

test('professional report translations cover contract, dimensions and evidence columns', () => {
  const overrides = read('src/locales/professional-report-overrides.js')

  for (const key of [
    'professionalContractRequired', 'analysisDimensions', 'scenarioAnalysis',
    'riskPlan', 'evidenceMetric', 'evidenceValue', 'evidenceSource',
    'dimension.technical', 'dimension.fundamental', 'dimension.crypto_market_structure'
  ]) {
    assert.ok(overrides.includes(`fastAnalysis.${key}`), `missing translation: fastAnalysis.${key}`)
  }
})

test('professional report localizes backend metric paths, enum values and generated scenarios', () => {
  const report = read('src/views/ai-analysis/components/ProfessionalAnalysisReport.vue')
  const overrides = read('src/locales/professional-report-overrides.js')

  assert.match(report, /metricPartLabel \(value\)/)
  assert.match(report, /scalarEvidenceValue \(value\)/)
  assert.match(report, /evidenceUnit \(value, currency, metric\)/)
  assert.match(report, /isNumeric \? this\.evidenceUnit/)
  assert.match(report, /\(\^\|\\\.\)rsi/)
  assert.match(report, /price and evidence confirm the upside thesis\./)
  assert.match(report, /fastAnalysis\.scenarioTrigger/)

  for (const key of [
    'evidenceReferences', 'metricPart.signal_line', 'metricPart.operating_margin',
    'evidenceValueEnum.bearish_alignment', 'evidenceValueEnum.heuristic_estimate',
    'evidenceValueEnum.previous_20_bars', 'unit.count'
  ]) {
    assert.ok(overrides.includes(`fastAnalysis.${key}`), `missing translation: fastAnalysis.${key}`)
  }
})

test('compact professional report summary hides inline evidence ids', () => {
  const workbench = read('src/views/ai-analysis/components/CopilotWorkbench.vue')

  assert.match(workbench, /reportSummary \(msg\)[\s\S]*?replace\(\/\\s\*\\\[/)
})

test('professional evidence table inherits report theme colors in dark mode', () => {
  const report = read('src/views/ai-analysis/components/ProfessionalAnalysisReport.vue')

  assert.match(report, /\.evidence-collapse \/deep\/ \.ant-collapse-header[\s\S]*?color: var\(--report-text\)/)
  assert.match(report, /\.evidence-collapse \/deep\/ \.ant-collapse-content[\s\S]*?background: var\(--report-bg\)/)
  assert.match(report, /\.evidence-row strong, \.evidence-row > span \{ color: var\(--report-text\)/)
})

test('MACD alignment states remain localized', () => {
  const locales = ['ar-SA', 'de-DE', 'en-US', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', 'th-TH', 'vi-VN', 'zh-CN', 'zh-TW']

  for (const locale of locales) {
    const messages = read(`src/locales/lang/${locale}.js`)
    assert.match(messages, /"fastAnalysis\.trend\.bearish_alignment":/)
    assert.match(messages, /"fastAnalysis\.trend\.bullish_alignment":/)
  }
})

test('credit balance refreshes after billed AI actions and when the page becomes active', () => {
  const header = read('src/components/GlobalHeader/AvatarDropdown.vue')
  const workbench = read('src/views/ai-analysis/components/CopilotWorkbench.vue')

  assert.match(header, /'currentUser\.credits': \{[\s\S]*?immediate: true/)
  assert.match(header, /window\.addEventListener\('focus', this\.handleWindowFocus\)/)
  assert.match(header, /document\.addEventListener\('visibilitychange', this\.handleVisibilityChange\)/)
  assert.match(header, /window\.setInterval\(this\.refreshVisibleCredits, 60 \* 1000\)/)
  assert.match(workbench, /const credits = Number\(this\.billing\.credits\)[\s\S]*?\$emit\('credits-updated', credits\)/)
  assert.ok((workbench.match(/await this\.loadBilling\(\)/g) || []).length >= 5)
})

test('strategy logs render typed market-data failures with actionable reasons', () => {
  const logs = read('src/views/strategy-center/components/StrategyLogs.vue')

  assert.match(logs, /event_type === 'market_data_unavailable'/)
  assert.match(logs, /market_data_error/)
  assert.match(logs, /marketDataReasonLabel/)
  assert.match(logs, /marketDataAction/)
  assert.match(logs, /technical_detail/)
})

test('hold reports preserve mild directional bias instead of flattening to neutral', () => {
  assert.equal(resolveDecisionLabelKey({ decision: 'HOLD', score: 17.6 }), 'fastAnalysis.outlookMildBull')
  assert.equal(resolveDecisionLabelKey({ decision: 'HOLD', bias: 'MILD_BEARISH' }), 'fastAnalysis.outlookMildBear')
  assert.equal(resolveDecisionLabelKey({ decision: 'HOLD', score: 3 }), 'fastAnalysis.outlookNeutral')
  assert.equal(resolveDecisionLabelKey({ decision: 'BUY', score: -30 }), 'fastAnalysis.outlookBull')
})
