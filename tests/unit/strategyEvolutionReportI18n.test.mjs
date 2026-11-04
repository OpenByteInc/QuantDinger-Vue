import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import messages from '../../src/locales/lang/strategy-evolution-report.js'

const locales = ['ar-SA', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', 'th-TH', 'vi-VN', 'zh-TW']
const keys = [
  'strategyEvolution.chart.monteCarlo',
  'strategyEvolution.chart.monteCarloHint',
  'strategyEvolution.chart.costStress',
  'strategyEvolution.chart.costStressHint',
  'strategyEvolution.topCandidates',
  'strategyEvolution.validationActivity',
  'strategyEvolution.validationInsufficient',
  'strategyEvolution.rankingReturn',
  'strategyEvolution.parameters',
  'strategyEvolution.profitableFolds',
  'strategyEvolution.segmentValidation',
  'strategyEvolution.segmentValidationHint',
  'strategyEvolution.fold',
  'strategyEvolution.trainingRange',
  'strategyEvolution.validationRange',
  'strategyEvolution.trainingReturn',
  'strategyEvolution.validationReturn',
  'strategyEvolution.monteCarlo',
  'strategyEvolution.monteCarloHint',
  'strategyEvolution.monteCarloDetail',
  'strategyEvolution.costStress',
  'strategyEvolution.costStressHint',
  'strategyEvolution.costStressDetail',
  'strategyEvolution.bestParams'
]

test('strategy evolution result panels are localized for every supported report language', () => {
  for (const locale of locales) {
    for (const key of keys) {
      assert.equal(typeof messages[locale][key], 'string', `${locale}: ${key}`)
      assert.notEqual(messages[locale][key].trim(), '', `${locale}: ${key}`)
    }
  }
})

test('Korean result copy matches the backtest-center panels', () => {
  assert.equal(messages['ko-KR']['strategyEvolution.chart.monteCarlo'], '몬테카를로 최종 수익률')
  assert.equal(messages['ko-KR']['strategyEvolution.segmentValidation'], '학습 및 검증 시계열 분할')
  assert.equal(messages['ko-KR']['strategyEvolution.validationInsufficient'], '이 검정에 필요한 유효 수익률 관측치가 부족합니다.')
  assert.equal(messages['ko-KR']['strategyEvolution.bestParams'], '검증된 최적 매개변수 조합')
})

test('strategy evolution result placeholders are preserved', () => {
  for (const locale of locales) {
    assert.match(messages[locale]['strategyEvolution.rankingScope'], /\{displayed\}/)
    assert.match(messages[locale]['strategyEvolution.rankingScope'], /\{shortlist\}/)
    assert.match(messages[locale]['strategyEvolution.rankingScope'], /\{searched\}/)
    assert.match(messages[locale]['strategyEvolution.validationTie'], /\{count\}/)
    assert.match(messages[locale]['strategyEvolution.monteCarloDetail'], /\{loss\}/)
    assert.match(messages[locale]['strategyEvolution.monteCarloDetail'], /\{paths\}/)
    assert.match(messages[locale]['strategyEvolution.monteCarloDetail'], /\{observations\}/)
    assert.match(messages[locale]['strategyEvolution.costStressDetail'], /\{multiplier\}/)
    assert.match(messages[locale]['strategyEvolution.costStressDetail'], /\{delta\}/)
  }
})

test('curated strategy evolution report copy is merged last', () => {
  const source = fs.readFileSync(new URL('../../src/locales/index.js', import.meta.url), 'utf8')
  assert.ok(source.lastIndexOf('strategyEvolutionReportMessages[lang]') > source.lastIndexOf('agentManagementMessages[lang]'))
})
