import assert from 'node:assert/strict'
import test from 'node:test'

import navigationMessages from '../../src/locales/navigation-overrides.js'
import strategyRunMessages from '../../src/locales/strategy-run-overrides.js'
import zhTwProductMessages from '../../src/locales/zh-tw-product-overrides.js'

const supportedLocales = [
  'en-US',
  'ar-SA',
  'de-DE',
  'fr-FR',
  'ja-JP',
  'ko-KR',
  'ru-RU',
  'th-TH',
  'vi-VN',
  'zh-CN',
  'zh-TW'
]

const navigationKeys = [
  'menu.dashboard.aiAssetAnalysis',
  'menu.dashboard.community',
  'menu.dashboard.indicatorIde',
  'menu.dashboard.strategyIde',
  'menu.dashboard.backtestCenter',
  'menu.dashboard.strategyCenter',
  'menu.dashboard.brokerAccounts'
]

test('desktop navigation has concise reviewed labels in every supported locale', () => {
  for (const locale of supportedLocales) {
    assert.deepEqual(Object.keys(navigationMessages[locale]), navigationKeys, locale)
    for (const key of navigationKeys) {
      const value = navigationMessages[locale][key]
      assert.equal(typeof value, 'string', `${locale}.${key}`)
      assert.ok(value.trim(), `${locale}.${key}`)
      assert.ok(value.length <= 18, `${locale}.${key} should stay concise`)
    }
  }
})

test('Simplified Chinese strategy run menu uses the compact label', () => {
  assert.equal(strategyRunMessages['zh-CN']['menu.dashboard.strategyCenter'], '运行')
  assert.equal(strategyRunMessages['zh-CN']['strategyCenter.title'], '策略运行')
})

test('Traditional Chinese navigation uses the compact product terminology', () => {
  assert.deepEqual(Object.values(navigationMessages['zh-TW']), [
    'AI 投研',
    '市場',
    '指標',
    '策略',
    '回測',
    '實盤',
    '帳戶'
  ])
})

test('Traditional Chinese covers the newly added strategy workspace actions', () => {
  const messages = zhTwProductMessages['zh-TW']
  assert.equal(messages['strategyIde.saveScript'], '儲存')
  assert.equal(messages['strategyIde.robotTemplates'], '機器人模板')
  assert.equal(messages['strategyIde.factorLibrary'], '因子庫')
  assert.equal(messages['strategyIde.aiConvert'], 'AI 指標轉策略')
  assert.equal(messages['strategyIde.createLive'], '建立實盤')
})
