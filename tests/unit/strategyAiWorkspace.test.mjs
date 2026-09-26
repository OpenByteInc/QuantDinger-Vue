import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { renderSafeMarkdown } from '../../src/utils/safeMarkdown.js'
import strategyV2Messages from '../../src/locales/lang/strategy-v2.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

test('strategy AI collaboration is inline, candidate-first and available to both workspaces', () => {
  const page = read('src/views/strategy-ide/index.vue')
  assert.match(page, /<template #ai-workspace>/)
  assert.match(page, /currentAssetType === 'portfolio_strategy' \? aiWorkspaceText\.portfolioContract : aiWorkspaceText\.ctaContract/)
  assert.match(page, /runStrategyAiTurn/)
  assert.match(page, /previewStrategyAiCandidate/)
  assert.match(page, /applyStrategyAiCandidate/)
  assert.match(page, /discardStrategyAiCandidate/)
  assert.match(page, /:disabled="!aiCandidateValidationPassed"/)
  assert.match(page, /message_type: data\.reply_type === 'candidate'/)
  assert.doesNotMatch(page, /showAiStrategyGenerator/)
})

test('strategy AI refreshes the visible credit balance from billing metadata', () => {
  const page = read('src/views/strategy-ide/index.vue')
  assert.match(page, /\$emit\('credits-updated', remainingCredits\)/)
})

test('strategy AI workspace keeps memory source-bound and uses explicit candidate status APIs', () => {
  const api = read('src/api/strategy.js')
  const page = read('src/views/strategy-ide/index.vue')
  assert.match(api, /aiWorkspace: '\/api\/strategies\/ai-workspace'/)
  assert.match(api, /export function getStrategyAiWorkspace/)
  assert.match(api, /export function clearStrategyAiWorkspace/)
  assert.match(api, /export function setStrategyAiCandidateStatus/)
  assert.match(page, /sourceId: Number\(this\.currentSourceId \|\| 0\)/)
  assert.match(page, /candidate\.baseCodeMatchesCurrent === false/)
  assert.match(page, /currentAssetType \(\) \{[\s\S]*this\.aiStrategyPrompt = ''[\s\S]*this\.aiInteractionMode = 'auto'/)
})

test('hidden purchased strategies show a locked AI workspace and never load or send source context', () => {
  const page = read('src/views/strategy-ide/index.vue')
  assert.match(page, /v-if="scriptCodeHidden" class="strategy-ai-locked"/)
  assert.match(page, /aiWorkspaceText\.hiddenSourceUnavailable/)
  assert.match(page, /if \(!id \|\| this\.scriptCodeHidden\) \{[\s\S]*?this\.resetStrategyAiWorkspace\(\)/)
  assert.match(page, /if \(!prompt \|\| this\.aiStrategyGenerating \|\| this\.scriptCodeHidden\) return/)
  assert.match(page, /scriptCodeHidden \(hidden\) \{[\s\S]*?this\.resetStrategyAiWorkspace\(\)/)
})

test('indicator conversion declares machine-enforced source instrument and timeframe', () => {
  const page = read('src/views/strategy-ide/index.vue')
  assert.match(page, /generationMode: 'indicator_conversion'/)
  assert.match(page, /assetType: 'script'/)
  assert.match(page, /instrument: source\.instrument/)
  assert.match(page, /timeframe: source\.timeframe/)
  assert.match(page, /Never replace them with USStock:SPY/)
})

test('indicator conversion prompt agrees with CTA and native protection contracts', () => {
  const page = read('src/views/strategy-ide/index.vue')
  const body = page.split('    buildIndicatorConversionPrompt () {')[1].split('\n    async confirmIndicatorToStrategy')[0].replace(/},\s*$/, '')
  const prompt = new Function(body).call({
    indicatorConvertContext: { name: 'EMA', code: 'output = {}', params: {} },
    indicatorConvertInstruction: 'Add risk controls',
    resolveIndicatorConversionContext: () => ({ instrument: 'Crypto:SOL/USDT@spot', timeframe: '1d' }),
    text: {}
  })
  assert.match(prompt, /single-instrument CTA; do not use on_rebalance/)
  assert.doesNotMatch(prompt, /scheduled callbacks, or on_rebalance/)
  assert.match(prompt, /Ratios use decimals: 0.03 means 3%/)
  assert.match(prompt, /set_default_protection inside an executable handler/)
  assert.match(prompt, /server-provided Strategy API V2 system contract/)
  assert.match(prompt, /Source instrument: Crypto:SOL\/USDT@spot/)
})

test('left inspector hides configuration for blank code and verification stays in the editor header', () => {
  const editor = read('src/views/strategy-ide/components/StrategyEditor.vue')
  const page = read('src/views/strategy-ide/index.vue')
  assert.match(editor, /hasStrategyCode \(\)/)
  assert.match(editor, /v-if="hasRuntimeControls && assetType === 'script'"/)
  assert.match(editor, /hasStrategyConfiguration \(\)/)
  assert.match(editor, /v-if="hasStrategyCode && activeParamTemplate" class="params-toolbar"/)
  assert.doesNotMatch(editor, /slot name="strategy-contract"/)
  assert.doesNotMatch(page, /template #strategy-contract/)
  assert.doesNotMatch(editor, /slot name="strategy-checks"/)
  assert.match(editor, /class="params-toolbar"/)
  assert.match(editor, /\.side-tabs--split \{[\s\S]*\.param-list \{[\s\S]*flex-direction: column;/)
  assert.match(editor, /lastVerificationState/)
  assert.match(editor, /this\.\$emit\('verified', res\.data\)/)
})

test('strategy editor places the official development guide beside code verification', () => {
  const editor = read('src/views/strategy-ide/components/StrategyEditor.vue')
  const verifyButton = editor.indexOf("$t('trading-assistant.editor.verify')")
  const guideLink = editor.indexOf('https://www.quantdinger.com/doc/trading/STRATEGY_DEV_GUIDE.html')

  assert.ok(verifyButton > -1 && guideLink > verifyButton)
  assert.match(editor, /class="developer-guide-link"/)
  assert.match(editor, /target="_blank"/)
  assert.match(editor, /rel="noopener noreferrer"/)
  assert.match(editor, /\$t\('dashboard\.indicator\.editor\.guide'\)/)
  assert.match(editor, /\.developer-guide-link \{[\s\S]*font-size: 14px;[\s\S]*font-weight: 600;[\s\S]*line-height: 1\.5;/)
})

test('strategy toolbar typography keeps related actions in matching pairs', () => {
  const page = read('src/views/strategy-ide/index.vue')
  assert.match(page, /\.robot-template-button,\n\.factor-library-button,[\s\S]*font-weight: 700;/)
})

test('desktop strategy workspace uses full-height parameter, code, and AI columns', () => {
  const editor = read('src/views/strategy-ide/components/StrategyEditor.vue')
  const page = read('src/views/strategy-ide/index.vue')
  const aiColumn = editor.indexOf('strategy-ai-workspace-host--primary')
  const codeColumn = editor.indexOf('<div class="code-col">')
  const toolRow = editor.indexOf('class="side-col"')

  assert.ok(codeColumn > -1 && codeColumn < toolRow)
  assert.ok(toolRow > -1 && toolRow < aiColumn)
  assert.match(editor, /grid-template-columns: minmax\(280px, 18%\) minmax\(520px, 1fr\) minmax\(340px, 29%\)/)
  assert.match(editor, /\.strategy-ai-workspace-host--primary \{[\s\S]*grid-column-start: 3;[\s\S]*grid-row-end: 2/)
  assert.match(editor, /\.editor-layout--split \.code-col \{[\s\S]*grid-column-start: 2;/)
  assert.match(editor, /\.editor-layout--split \.side-col \{[\s\S]*grid-column-start: 1;[\s\S]*height: 100%;/)
  assert.match(editor, /editor-layout--split-no-params/)
  assert.match(editor, /v-if="!isSplitSideMode \|\| hasStrategyConfiguration" class="side-col"/)
  assert.match(page, /grid-template-columns: minmax\(280px, 18%\) minmax\(520px, 1fr\) minmax\(340px, 29%\)/)
  assert.match(page, /editor-layout--split\.editor-layout--split-no-params/)
})

test('missing optional AI history route does not show a raw 404 on page entry', () => {
  const page = read('src/views/strategy-ide/index.vue')
  assert.match(page, /if \(status === 404\)/)
  assert.match(page, /this\.aiMessages = \[\]/)
  assert.doesNotMatch(page, /status === 404[\s\S]{0,260}this\.\$message\.error/)
})

test('strategy and indicator conversations share safe markdown rendering', () => {
  const strategy = read('src/views/strategy-ide/index.vue')
  const indicator = read('src/views/indicator-ide/index.vue')
  assert.match(strategy, /v-html="renderStrategyAiMessage\(messageItem\)"/)
  assert.match(indicator, /v-html="renderAiMessage\(messageItem\)"/)
  assert.match(strategy, /renderSafeMarkdown/)
  assert.match(indicator, /renderSafeMarkdown/)

  const rendered = renderSafeMarkdown('### Summary\n\n- **Trend** is up\n1. Check `risk`\n\n<script>alert(1)</script>')
  assert.match(rendered, /<h5>Summary<\/h5>/)
  assert.match(rendered, /<ul><li><strong>Trend<\/strong> is up<\/li><\/ul>/)
  assert.match(rendered, /<ol><li>Check <code>risk<\/code><\/li><\/ol>/)
  assert.doesNotMatch(rendered, /<script>/)
  assert.match(rendered, /&lt;script&gt;/)
})

test('strategy candidate status messages are localized for current and historical conversations', () => {
  const page = read('src/views/strategy-ide/index.vue')

  assert.match(page, /messageKey === 'candidate_generated_validated'/)
  assert.match(page, /rawContent === legacyCandidateText/)
  assert.match(page, /this\.aiWorkspaceText\.candidateReady/)
  assert.match(page, /item\.change_status === 'applied'/)
  assert.match(page, /this\.\$set\(item, 'change_status', 'applied'\)/)
})

test('indicator candidate messages reflect automatic application immediately and after reload', () => {
  const page = read('src/views/indicator-ide/index.vue')

  assert.match(page, /renderAiMessage \(messageItem\)/)
  assert.match(page, /item\.change_status === 'applied'/)
  assert.match(page, /this\.\$set\(item, 'change_status', 'applied'\)/)
})

test('strategy AI generation failures surface and localize the nested validation error', () => {
  const page = read('src/views/strategy-ide/index.vue')

  assert.match(page, /localizeStrategyAiError \(error\)/)
  assert.match(page, /details\.error/)
  assert.match(page, /this\.\$t\(key\)/)
  assert.match(page, /const message = this\.localizeStrategyAiError\(e\)/)
  assert.match(page, /message_type: 'error'/)
  assert.match(page, /messageItem\.message_type === 'error' \? aiWorkspaceText\.errorBadge/)
  assert.match(page, /strategy-ai-message--error/)
  assert.equal(strategyV2Messages['en-US']['strategyV2.generationInvalid'], 'The generated strategy did not pass validation.')
  assert.equal(strategyV2Messages['zh-CN']['strategyV2.generationInvalid'], 'AI 生成的策略未通过校验。')
  assert.equal(strategyV2Messages['zh-CN']['strategyV2.aiDirectionModeMismatch'], '用户要求的交易方向与生成策略不一致。')
  assert.equal(strategyV2Messages['zh-CN']['strategyV2.aiBidirectionalOrderLegsRequired'], '多空双向策略必须同时实现多头腿和空头腿的下单逻辑。')
  assert.equal(strategyV2Messages['zh-CN']['strategyV2.aiProtectionImplementationRequired'], '用户要求的止损或止盈尚未通过可执行保护规则实现。')
  assert.equal(strategyV2Messages['zh-CN']['strategyV2.aiSupertrendNativeRequired'], '生成的 Supertrend 策略必须使用平台标准 Supertrend 指标。')
  assert.equal(strategyV2Messages['zh-CN']['strategyV2.aiRequestedFactorMissing'], '生成策略没有使用用户要求的全部技术指标。')
  assert.equal(strategyV2Messages['zh-CN']['strategyV2.aiBehaviorOpenLegMissing'], '运行时冒烟测试未能触发用户要求的全部入场方向。')
  for (const locale of Object.keys(strategyV2Messages)) {
    assert.ok(strategyV2Messages[locale]['strategyV2.aiRequestedFactorMissing'])
    assert.ok(strategyV2Messages[locale]['strategyV2.aiFactorParameterUnsupported'])
    assert.ok(strategyV2Messages[locale]['strategyV2.aiFactorParameterInvalid'])
  }
})

test('indicator conversion displays the underlying localized validation failure', async () => {
  const page = read('src/views/strategy-ide/index.vue')
  const localizeBody = page.split('    localizeStrategyAiError (error) {')[1].split('\n    toggleStrategyAiPanel')[0].replace(/},\s*$/, '')
  const convertBody = page.split('    async confirmIndicatorToStrategy () {')[1].split('\n    extractAiGeneratedCode')[0].replace(/},\s*$/, '')
  const failure = { response: { data: { msg: 'strategyV2.generationInvalid', data: { error: 'strategyV2.aiPersistentStateRequired' } } } }
  const vm = {
    indicatorConvertContext: { indicatorId: '1', code: 'indicator source' },
    indicatorConvertInstruction: 'Add a stop loss',
    resolveIndicatorConversionContext: () => ({ instrument: 'Crypto:SOL/USDT@spot', timeframe: '1d' }),
    buildIndicatorConversionPrompt: () => 'Conversion template',
    $t: key => strategyV2Messages['zh-CN'][key] || key,
    aiWorkspaceText: { sendFailed: 'fallback' },
    localizeStrategyAiError: new Function('error', localizeBody)
  }
  const convert = new Function('aiGenerateStrategy', `return async function () { ${convertBody} }`)(async payload => {
    assert.equal(payload.context.conversionRequest, 'Add a stop loss')
    throw failure
  })
  await convert.call(vm)
  assert.equal(vm.indicatorConvertError, strategyV2Messages['zh-CN']['strategyV2.aiPersistentStateRequired'])
  assert.ok(vm.indicatorConvertError)
  assert.equal(vm.indicatorConvertLoading, false)
})
