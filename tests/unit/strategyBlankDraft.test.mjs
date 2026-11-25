import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import onboardingMessages from '../../src/locales/strategy-onboarding-overrides.js'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('new strategy drafts start with a genuinely empty editor', () => {
  const workspace = read('src/views/strategy-ide/index.vue')
  const editor = read('src/views/strategy-ide/components/StrategyEditor.vue')

  assert.match(workspace, /const EMPTY_DRAFT_CODE = ''/)
  assert.match(workspace, /scriptCode: EMPTY_DRAFT_CODE/)
  assert.match(workspace, /createNewDraft[\s\S]*this\.scriptCode = EMPTY_DRAFT_CODE/)
  assert.match(workspace, /String\(source\.code \|\| ''\)/)

  assert.match(editor, /value: String\(this\.value \|\| ''\)/)
  assert.match(editor, /loadBlankTemplate[\s\S]*this\.setCode\(''\)/)
  assert.doesNotMatch(editor, /_getDefaultCode/)
  assert.doesNotMatch(editor, /My Custom Strategy/)
  assert.doesNotMatch(editor, /single_ma_regime/)
})

test('first-time strategy users get persistent creation choices and a compact template picker', () => {
  const workspace = read('src/views/strategy-ide/index.vue')
  const editor = read('src/views/strategy-ide/components/StrategyEditor.vue')

  assert.match(workspace, /:first-run-empty="showStrategyOnboarding"/)
  assert.match(workspace, /showStrategyOnboarding \(\)[\s\S]*this\.scriptOptions\.length === 0/)
  assert.match(workspace, /createNewDraft\(\{ openTemplate: false, showOnboarding: true \}\)/)
  assert.match(workspace, /@start-ai="handleStrategyStartAi"/)
  assert.match(workspace, /<a-button class="ide-icon-btn" @click="createNewDraft\(\{ openTemplate: true \}\)">\s*<a-icon type="plus"/)

  assert.match(editor, /class="strategy-first-run"/)
  assert.match(editor, /strategyIde\.onboarding\.templateTitle/)
  assert.match(editor, /strategyIde\.onboarding\.aiTitle/)
  assert.match(editor, /strategyIde\.onboarding\.blankTitle/)
  assert.match(editor, /class="template-card template-card--blank"/)
  assert.match(editor, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
  assert.doesNotMatch(editor, /:title="\$t\('trading-assistant\.editor\.templateTab'\)"/)

  for (const locale of ['en-US', 'zh-CN', 'zh-TW']) {
    assert.ok(onboardingMessages[locale]['strategyIde.onboarding.title'])
    assert.ok(onboardingMessages[locale]['strategyIde.onboarding.useBlank'])
  }
})
