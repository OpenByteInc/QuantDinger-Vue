import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  buildContextualFollowups,
  buildResearchStarterPrompts,
  rankPromptsByUsage,
  researchModes,
  researchResponseContract
} from '../../src/views/ai-analysis/components/copilotResearchPrompts.mjs'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('research starters adapt to the selected symbol and watchlist', () => {
  const prompts = buildResearchStarterPrompts({
    isZh: true,
    target: { market: 'USStock', symbol: 'MSFT' },
    watchlist: [{ symbol: 'AAPL' }, { symbol: 'NVDA' }]
  })

  assert.equal(prompts.length, 6)
  assert.ok(prompts.every(item => item.prompt && item.label))
  assert.match(prompts.find(item => item.key === 'diagnose').prompt, /MSFT/)
  assert.match(prompts.find(item => item.key === 'compare').prompt, /MSFT、AAPL、NVDA/)
  assert.ok(!prompts.some(item => /indicator|strategy_research/.test(item.key)))
})

test('research starters provide useful market-wide questions without a symbol', () => {
  const prompts = buildResearchStarterPrompts({ isZh: false, watchlist: [] })

  assert.equal(prompts[0].key, 'compare_benchmarks')
  assert.ok(prompts.some(item => item.key === 'macro'))
  assert.ok(prompts.some(item => item.key === 'opportunity_scan'))
})

test('mode and usage signals rank relevant prompts without removing diversity', () => {
  const prompts = buildResearchStarterPrompts({
    isZh: false,
    target: { market: 'Crypto', symbol: 'BTC/USDT' },
    activeMode: 'news'
  })
  const ranked = rankPromptsByUsage(prompts, { trade_plan: 20 })

  assert.equal(ranked[0].mode, 'news')
  assert.equal(new Set(ranked.map(item => item.mode)).size >= 3, true)
  assert.equal(researchModes(false).length, 6)
})

test('follow-up prompts adapt after reports and remain symbol-aware', () => {
  const prompts = buildContextualFollowups({
    isZh: true,
    target: { market: 'USStock', symbol: 'MSFT' },
    intent: 'professional_analysis',
    hasReport: true
  })

  assert.equal(prompts.length, 5)
  assert.ok(prompts.every(item => item.prompt.includes('MSFT')))
  assert.ok(prompts.some(item => item.key === 'followup_plan'))
})

test('copilot keeps research presets and visible utilities without a duplicate quick-tools modal', () => {
  const report = read('src/views/ai-analysis/components/CopilotWorkbench.vue')

  assert.match(report, /v-for="item in starterPrompts"/)
  assert.doesNotMatch(report, /v-for="item in researchQuickTasks"/)
  assert.doesNotMatch(report, /v-model="quickToolsVisible"/)
  assert.doesNotMatch(report, /text\.quickTools/)
  assert.match(report, /confirmProfessionalAnalysis/)
  assert.match(report, /onOk: \(\) => \{\s*this\.runProfessionalAnalysis\(\)\s*\}/)
  assert.doesNotMatch(report, /onOk: \(\) => this\.runProfessionalAnalysis\(\)/)
  assert.match(report, /openMemoryManager/)
  assert.match(report, /class="followup-suggestions"/)
  assert.match(report, /class="research-mode-bar"/)
  assert.match(report, /\{\{ messageActionLabel\(action\) \}\}/)
  assert.match(report, /type === 'export_report_pdf'[\s\S]*copilot\.exportPdf/)
  assert.match(report, /type === 'ask_about_report'[\s\S]*copilot\.askFollowup/)
})

test('copilot context is backend-owned and report follow-ups use a stable message reference', () => {
  const report = read('src/views/ai-analysis/components/CopilotWorkbench.vue')

  assert.doesNotMatch(report, /copilot_recent_messages:/)
  assert.doesNotMatch(report, /user_memories:\s*\(this\.userMemories/)
  assert.match(report, /referenced_report_id: referencedReportId/)
  assert.match(report, /draftReferencedReportId = msg && msg\.id/)
  assert.match(report, /getChatSessionMemory/)
})

test('professional reports render as compact expandable artifacts by default', () => {
  const report = read('src/views/ai-analysis/components/CopilotWorkbench.vue')

  assert.match(report, /class="report-artifact-summary"/)
  assert.match(report, /!isReportExpanded\(msg\)/)
  assert.match(report, /reportHasRrWarning\(msg\)/)
  assert.match(report, /riskRewardUnavailable/)
  assert.match(report, /class="report-expand-button"/)
})

test('indicator and strategy IDEs expose their AI workspaces without redundant toolbar entry points', () => {
  const indicatorIde = read('src/views/indicator-ide/index.vue')
  const strategyIde = read('src/views/strategy-ide/index.vue')

  assert.doesNotMatch(indicatorIde, /class="ide-ai-create-button"/)
  assert.doesNotMatch(indicatorIde, /openAiGenerator/)
  assert.match(indicatorIde, /ref="aiGeneratorPanel"/)
  assert.doesNotMatch(strategyIde, /class="ai-strategy-create-button"/)
  assert.match(strategyIde, /aria-controls="strategy-ai-dialog"/)
  assert.match(strategyIde, /v-show="aiPanelExpanded"[\s\S]*?id="strategy-ai-dialog"[\s\S]*?role="dialog"/)
  assert.match(strategyIde, /async sendStrategyAiTurn \(\)/)
  assert.match(strategyIde, /await runStrategyAiTurn\(/)
  assert.match(strategyIde, /previewStrategyAiCandidate/)
  assert.match(strategyIde, /applyStrategyAiCandidate/)
  assert.doesNotMatch(strategyIde, /v-model="showAiStrategyGenerator"/)
})

test('research modes carry structured response contracts and balanced trading guidance', () => {
  const planContract = researchResponseContract('plan', true)
  const newsContract = researchResponseContract('news', false)
  const diagnosisContract = researchResponseContract('diagnosis', false)

  assert.match(planContract, /风险收益比/)
  assert.match(planContract, /低于 1 时明确警告/)
  assert.match(planContract, /看多、看空和观望/)
  assert.match(newsContract, /confirmed facts/i)
  assert.match(newsContract, /source timing/i)
  assert.match(diagnosisContract, /data cutoff time and timezone/i)
  assert.match(diagnosisContract, /do not call funding rate or open interest a data gap for a US stock/i)
  assert.match(diagnosisContract, /Never claim a win rate/i)
})

test('phase two connects saved prompts, event ranking, and response contracts', () => {
  const report = read('src/views/ai-analysis/components/CopilotWorkbench.vue')
  const api = read('src/api/market.js')
  const layout = read('src/views/ai-analysis/components/copilot-workbench-layout.less')

  assert.match(report, /class="[^"]*saved-prompt-library[^"]*"/)
  assert.match(report, /savePromptForMessage\(msg\)/)
  assert.match(report, /recordCopilotEvent\('prompt_used'/)
  assert.match(report, /response_contract: this\.i18nText\(/)
  assert.match(report, /researchResponseContract\(this\.activeResearchMode, false\)/)
  assert.match(report, /if \(this\.sending \|\| !message \|\| message\.isThinking\) return \[\]/)
  assert.match(report, /<details v-if="agentUsageItems\(msg\)\.length" class="agent-usage">/)
  assert.match(report, /button\.research-prompt-pill/)
  assert.match(report, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(report, /height: 64px !important/)
  assert.match(report, /border-radius: 8px !important/)
  assert.match(report, /if \(!Number\.isFinite\(currentPrice\) \|\| currentPrice <= 0\) return '--'/)
  assert.match(report, /@import "\.\/copilot-workbench-layout.less"/)
  assert.match(layout, /grid-template-columns: var\(--research-tools-width\) minmax\(0, 1fr\) !important/)
  assert.match(layout, /@media \(max-width: 960px\)[\s\S]*?grid-template-columns: minmax\(0, 1fr\) !important/)
  assert.match(layout, /> \.research-tools-rail \{ display: flex !important; \}/)
  assert.match(api, /export function getSavedPrompts/)
  assert.match(api, /export function trackCopilotEvent/)
})
