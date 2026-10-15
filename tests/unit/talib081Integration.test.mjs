import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import talibFactorMessages from '../../src/locales/lang/talib-factors.js'
import factorResearchMessages from '../../src/locales/lang/factor-research-factors.js'

const root = path.resolve(import.meta.dirname, '../..')
const indicatorIds = [
  'ac', 'adr', 'ao', 'cmf', 'cmou', 'coppock', 'cumsum', 'cvi',
  'donchian', 'dpo', 'efi', 'er', 'eri', 'fosc', 'fractal', 'ha', 'hma',
  'kc', 'kdj', 'marketfi', 'massi', 'nvi', 'percentile', 'percentrank', 'pvi',
  'pvo', 'pvt', 'qstick', 'rma', 'rvi', 'rvol', 'smi', 'supertrend', 'tsi',
  'vhf', 'vortex', 'vwap', 'vwma', 'wad', 'zlema'
]

test('every TA-Lib 0.8.1 indicator has name and description in every desktop locale', () => {
  const locales = [
    'en-US', 'ar-SA', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR',
    'ru-RU', 'th-TH', 'vi-VN', 'zh-CN', 'zh-TW'
  ]
  for (const locale of locales) {
    const messages = talibFactorMessages[locale]
    assert.ok(messages, `missing locale ${locale}`)
    assert.equal(messages['strategyV2.taLibBadge'], 'TA-Lib {version}')
    for (const factorId of indicatorIds) {
      assert.ok(messages[`factor.talib.${factorId}.name`], `${locale} ${factorId} name`)
      assert.ok(messages[`factor.talib.${factorId}.description`], `${locale} ${factorId} description`)
    }
  }
})

test('strategy template cards expose the backend TA-Lib version metadata', () => {
  const source = fs.readFileSync(path.join(root, 'src/views/strategy-ide/components/StrategyEditor.vue'), 'utf8')

  assert.match(source, /metadata\.taLibVersion \|\| metadata\.ta_lib_version/)
  assert.match(source, /\$t\('strategyV2\.taLibBadge', \{ version \}\)/)
  assert.ok((source.match(/templateTaLibLabel\(tpl\)/g) || []).length >= 2)
})

test('factor research loads the unified technical catalog and submits selected parameters', () => {
  const source = fs.readFileSync(path.join(root, 'src/views/backtest-center/index.vue'), 'utf8')

  assert.match(source, /getFactorCatalog\(\{ type: 'technical' \}\)/)
  assert.doesNotMatch(source, /getFactorCatalog\(\{ type: 'technical', provider: 'ta-lib' \}\)/)
  assert.match(source, /factorParams: \{ \.\.\.this\.factorParams \}/)
  assert.match(source, /researchFactorParameterEntries/)
})

test('distribution factors have localized research labels in every desktop locale', () => {
  const locales = [
    'en-US', 'ar-SA', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR',
    'ru-RU', 'th-TH', 'vi-VN', 'zh-CN', 'zh-TW'
  ]
  for (const locale of locales) {
    const messages = factorResearchMessages[locale]
    for (const factorId of ['skewness', 'kurtosis']) {
      assert.ok(messages[`factor.${factorId}.name`], `${locale} ${factorId} name`)
      assert.ok(messages[`factor.${factorId}.description`], `${locale} ${factorId} description`)
    }
  }
})

test('TA-Lib locale messages are merged into initial and lazy-loaded locales', () => {
  const source = fs.readFileSync(path.join(root, 'src/locales/index.js'), 'utf8')

  assert.match(source, /import talibFactorMessages from '\.\/lang\/talib-factors'/)
  assert.ok((source.match(/talibFactorMessages\[/g) || []).length >= 3)
  assert.match(source, /import factorResearchMessages from '\.\/lang\/factor-research-factors'/)
  assert.ok((source.match(/factorResearchMessages\[/g) || []).length >= 3)
})
