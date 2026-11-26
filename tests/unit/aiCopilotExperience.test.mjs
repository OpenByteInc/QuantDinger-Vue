import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const read = relativePath => fs.readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  'utf8'
)

const copilot = read('../../src/views/ai-analysis/components/CopilotWorkbench.vue')
const selectLang = read('../../src/components/SelectLang/index.jsx')
const zh = read('../../src/locales/lang/zh-CN.js')
const en = read('../../src/locales/lang/en-US.js')
const copilotOverrides = read('../../src/locales/copilot-overrides.js')

test('stream completion cancels the reader and releases the sending state', () => {
  assert.match(copilot, /const eventName = this\.handleStreamEvent\(part, assistantMsg\)[\s\S]*eventName === 'done'/)
  assert.match(copilot, /eventName === 'replace'[\s\S]*assistantMsg\.content = payload\.text/)
  assert.match(copilot, /if \(!streamComplete\) throw new Error\(this\.text\.streamIncomplete\)/)
  assert.match(copilot, /streamError\.streamAccepted \|\| streamError\.streamHasContent[\s\S]*streamWarning/)
  assert.match(copilot, /eventName === 'warning'[\s\S]*outputLimit/)
  assert.match(copilot, /await reader\.cancel\(\)/)
  assert.match(copilot, /await this\.sendMessageStream[\s\S]*?this\.sending = false/)
})

test('strategy generation reads artifact code from the API data envelope', () => {
  assert.match(copilot, /const code = this\.extractStrategyCode\(res\)/)
  assert.match(copilot, /\[data\.code, data\.source, data\.strategy_code, res\.code\]/)
  assert.match(copilot, /typeof value === 'string' && value\.trim\(\)/)
  assert.doesNotMatch(copilot, /sessionStorage\.setItem\('qd_strategy_source', res\.code\)/)
})

test('switching conversations clears workflow and composer state', () => {
  assert.match(copilot, /async loadHistory \(sessionId\) \{\s*this\.resetComposerDraft\(\)/)
  assert.match(copilot, /newSession \(\) \{\s*this\.resetComposerDraft\(\)/)
  for (const field of ['draft', 'attachments', 'draftContextLock', 'pendingAgentTask', 'monitorSetupDraft']) {
    assert.match(copilot, new RegExp(`this\\.${field} =`))
  }
})

test('language selector is click and keyboard accessible', () => {
  assert.match(selectLang, /trigger=\{\['click'\]\}/)
  assert.match(selectLang, /role="button" tabIndex="0" onKeydown=\{handleKeydown\}/)
  assert.match(selectLang, /event\.key === 'Enter' \|\| event\.key === ' '/)
})

test('copilot action and event labels exist in both primary locales', () => {
  const keys = [
    'eventMetaSeparator',
    'impactHigh',
    'impactMedium',
    'impactLow',
    'usedThisTurn',
    'rememberPreference'
  ]
  for (const key of keys) {
    const token = `"aiAssetAnalysis.copilot.${key}"`
    assert.ok(zh.includes(token), `missing zh-CN key: ${key}`)
    assert.ok(en.includes(token), `missing en-US key: ${key}`)
  }
})

test('trading script editor actions are localized for every supported language', () => {
  const localeNames = [
    'en-US.js',
    'zh-CN.js',
    'zh-TW.js',
    'ja-JP.js',
    'ko-KR.js',
    'de-DE.js',
    'fr-FR.js',
    'ru-RU.js',
    'vi-VN.js',
    'th-TH.js',
    'ar-SA.js'
  ]
  const keys = ['openStrategyV2Ide', 'scriptStrategyReady']

  for (const localeName of localeNames) {
    const locale = read(`../../src/locales/lang/${localeName}`)
    for (const key of keys) {
      assert.ok(locale.includes(`"aiAssetAnalysis.copilot.${key}"`), `missing ${localeName} key: ${key}`)
    }
  }
  assert.doesNotMatch(copilot, /i18nText\('aiAssetAnalysis\.copilot\.openStrategyV2Ide',\s*'Open Trading Script editor'/)
})

test('desktop breakpoint keeps history, chat, and watchlist in one row', () => {
  assert.match(
    copilot,
    /@media \(max-width: 1360px\)[\s\S]*?grid-template-columns: minmax\(210px, 240px\) minmax\(460px, 1fr\) minmax\(230px, 260px\)/
  )
})

test('saved prompt dialog keeps compact rows instead of stretched grid cards', () => {
  assert.match(copilot, /\.saved-prompts-dialog \.saved-prompt-library__list \{[\s\S]*?grid-auto-rows: min-content;[\s\S]*?align-content: start;/)
  assert.match(copilot, /\.saved-prompts-dialog \.saved-prompt-library__item \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 28px;/)
  assert.match(copilot, /\.saved-prompts-dialog \.saved-prompt-card \{\s*padding: 9px 10px;/)
})

test('analysis quick action is localized for every selectable language', () => {
  const localeCount = (copilotOverrides.match(/^ {2}"[a-z]{2}-[A-Z]{2}": \{/gm) || []).length
  const promptCount = (copilotOverrides.match(/"aiAssetAnalysis\.copilot\.analysisPromptTemplate"/g) || []).length

  assert.equal(localeCount, 11)
  assert.equal(promptCount, localeCount)
  assert.match(copilot, /i18nText\('aiAssetAnalysis\.copilot\.analysisPromptTemplate'/)
  assert.match(copilot, /'\$i18n\.locale' \(\) \{\s*this\.refreshLocalizedDraft\(\)/)
  assert.match(copilot, /localizedDraft: \{ type: 'analysis', target: analysisTarget \}/)
  for (const key of [
    'focusSymbol',
    'quickTasks.indicator_research.label',
    'quickTasks.strategy_research.label',
    'quickTasks.trade_plan.label',
    'quickTasks.macro_economic_data.label'
  ]) {
    const matches = copilotOverrides.match(new RegExp(`"aiAssetAnalysis\\.copilot\\.${key.replaceAll('.', '\\.')}"`, 'g')) || []
    assert.equal(matches.length, 9, `missing non-English overrides for ${key}`)
  }
  assert.match(copilot, /uploadImageLabel \(\) \{\s*return this\.text\.uploadChart/)
})
