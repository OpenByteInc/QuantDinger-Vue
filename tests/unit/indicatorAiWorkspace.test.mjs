import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const viewSource = fs.readFileSync(path.join(root, 'src/views/indicator-ide/index.vue'), 'utf8')
const layoutSource = fs.readFileSync(path.join(root, 'src/layouts/BasicLayout.less'), 'utf8')
const quickTradeSource = fs.readFileSync(path.join(root, 'src/components/QuickTradePanel/QuickTradePanel.vue'), 'utf8')

test('indicator AI is indicator-scoped and does not overwrite the editor while streaming', () => {
  assert.match(viewSource, /\/api\/indicator\/aiWorkspace\/\$\{id\}/)
  assert.match(viewSource, /json\.workspace/)
  assert.match(viewSource, /aiCandidate/)
  assert.doesNotMatch(viewSource, /setValue\('# AI generating/)
  const streamingBlock = viewSource.slice(
    viewSource.indexOf('if (json.content)'),
    viewSource.indexOf('if (generatedCode)', viewSource.indexOf('if (json.content)'))
  )
  assert.doesNotMatch(streamingBlock, /cmInstance\.setValue/)
})

test('new indicators immediately bind a fresh AI workspace without a manual reselect', () => {
  const createBlock = viewSource.slice(
    viewSource.indexOf('async _createIndicatorInIde ()'),
    viewSource.indexOf('async handlePublishIndicator', viewSource.indexOf('async _createIndicatorInIde ()'))
  )
  assert.match(createBlock, /this\.selectedIndicatorId = targetId[\s\S]*?this\.onIndicatorChange\(targetId\)/)
  assert.match(createBlock, /this\.aiPanelExpanded = true/)
  assert.match(viewSource, /onIndicatorChange \(id\)[\s\S]*?this\.loadAiWorkspace\(id\)/)
})

test('new indicators open as an empty draft instead of injecting starter code', () => {
  const createBlock = viewSource.slice(
    viewSource.indexOf('async _createIndicatorInIde ()'),
    viewSource.indexOf('async handlePublishIndicator', viewSource.indexOf('async _createIndicatorInIde ()'))
  )
  assert.match(createBlock, /const code = ''/)
  assert.match(createBlock, /allowEmptyDraft: true/)
  assert.doesNotMatch(viewSource, /buildNewIndicatorStarterCode/)
})

test('hidden purchased indicators cannot open or call AI collaboration', () => {
  assert.match(viewSource, /v-if="!selectedIndicatorId \|\| selectedIndicatorCodeHidden"[\s\S]*?indicatorIde\.aiHiddenSourceUnavailable/)
  assert.match(viewSource, /v-if="!selectedIndicatorId \|\| selectedIndicatorCodeHidden"/)
  assert.match(viewSource, /handleAIGenerate \(\)[\s\S]*?if \(this\.selectedIndicatorCodeHidden\) \{[\s\S]*?indicatorIde\.saveBlockedHiddenCode[\s\S]*?return/)
  assert.match(viewSource, /selectedIndicatorCodeHidden \(hidden\) \{[\s\S]*?this\.resetAiWorkspaceState\(\)/)
})

test('indicator AI separates discussion from explicit code changes', () => {
  assert.match(viewSource, /interactionMode: requestMode/)
  assert.match(viewSource, /replyType === 'discussion'/)
  assert.match(viewSource, /message_type: 'discussion'/)
  assert.match(viewSource, /\{ label: this\.\$t\('indicatorIde\.aiQuickExplain'\), mode: 'discussion' \}/)
  assert.match(viewSource, /\{ label: this\.\$t\('indicatorIde\.aiQuickParameters'\), mode: 'modify' \}/)

  const discussionBlock = viewSource.slice(
    viewSource.indexOf("if (replyType === 'discussion')"),
    viewSource.indexOf('} else if (generatedCode)', viewSource.indexOf("if (replyType === 'discussion')"))
  )
  assert.doesNotMatch(discussionBlock, /this\.aiCandidate\s*=/)
  assert.doesNotMatch(discussionBlock, /cleanMarkdownCodeBlocks/)
})

test('candidate requires an explicit user action before entering the editor', () => {
  assert.match(viewSource, /previewAiCandidate/)
  assert.match(viewSource, /applyAiCandidateCode/)
  assert.match(viewSource, /discardAiCandidate/)
  assert.match(viewSource, /status: 'applied'/)
  assert.match(viewSource, /status: 'discarded'/)
  assert.match(viewSource, /baseCodeMatchesCurrent === false/)
  assert.match(viewSource, /isActiveAiCandidateMessage\(messageItem\)/)
  assert.match(viewSource, /class="ai-message-candidate"/)
  assert.doesNotMatch(viewSource, /class="ai-candidate-card"/)
})

test('desktop editor is wider while the chart remains the flexible workspace', () => {
  assert.match(viewSource, /\.ide-left\s*\{[\s\S]*?width: 38%;[\s\S]*?min-width: 420px;[\s\S]*?max-width: 600px;/)
  assert.match(viewSource, /\.ai-conversation\s*\{[\s\S]*?flex: 1 1 auto;[\s\S]*?resize: none;/)
  assert.match(viewSource, /class="ai-composer-toolbar"/)
  assert.match(viewSource, /\.ai-composer-toolbar\s*\{[\s\S]*?justify-content: space-between;/)
  assert.doesNotMatch(viewSource, /\.ai-composer-send\s*\{[\s\S]*?position: absolute;/)
  assert.match(viewSource, /min-width: 116px;/)
  assert.match(viewSource, /height: 40px;/)
  assert.match(viewSource, /\{\{ \$t\('indicatorIde\.aiSend'\) \}\}/)
  assert.match(viewSource, /class="ide-right ide-right--workspace"/)
})

test('code and AI areas share one accessible draggable vertical split', () => {
  assert.match(viewSource, /ref="codePanelBody"/)
  assert.match(viewSource, /class="code-editor-section" :style="\{ flexBasis: `\$\{codeAiSplitRatio\}%` \}"/)
  assert.match(viewSource, /class="code-ai-resizer"[\s\S]*?role="separator"[\s\S]*?@mousedown="startCodeAiResize"/)
  assert.match(viewSource, /startCodeAiResize \(event\)[\s\S]*?Math\.max\(28, Math\.min\(76, raw\)\)/)
  assert.match(viewSource, /@keydown\.up\.prevent="adjustCodeAiSplit\(-3\)"/)
  assert.match(viewSource, /@dblclick="resetCodeAiSplit"/)
})

test('code quality action and result live in the editor guide bar', () => {
  const guideBlock = viewSource.slice(viewSource.indexOf('class="ide-guide-bar"'), viewSource.indexOf('class="code-editor-wrapper"'))
  assert.match(guideBlock, /code-quality-top-status/)
  assert.match(guideBlock, /@click="runCodeQualityCheck"/)
  assert.match(guideBlock, /indicatorIde\.devGuide/)
  assert.doesNotMatch(viewSource, /class="code-quality-panel"/)
})

test('multi-tab mode keeps every route inside the available viewport height', () => {
  assert.match(viewSource, /\.indicator-ide\s*\{[\s\S]*?height: var\(--ide-shell-height,[\s\S]*?max-height: var\(--ide-shell-height,[\s\S]*?overflow: hidden;/)
  assert.match(viewSource, /\.ide-main\s*\{[^}]*overflow: hidden;/)
  assert.match(viewSource, /\.ide-left\s*\{[\s\S]*?height: 100%;[\s\S]*?max-height: 100%;/)
  assert.match(layoutSource, /\.basic-layout-wrapper--multi-tab \.ant-layout-content,[\s\S]*?display: flex !important;[\s\S]*?height: calc\(100vh - 64px\) !important;/)
  assert.match(layoutSource, /\.basic-layout-wrapper--multi-tab \.ant-pro-grid-content\s*\{[\s\S]*?display: flex !important;[\s\S]*?height: 100% !important;/)
  assert.match(layoutSource, /\.basic-layout-wrapper--multi-tab \.basic-route-view-shell\s*\{[\s\S]*?flex: 1 1 0 !important;[\s\S]*?height: 0 !important;[\s\S]*?overflow: auto;/)
  assert.match(layoutSource, /\.basic-layout-wrapper--multi-tab \.indicator-ide,\s*\.basic-layout-wrapper--multi-tab \.strategy-ide-shell\s*\{[\s\S]*?--ide-shell-height: 100%;[\s\S]*?height: 100% !important;/)
  assert.doesNotMatch(layoutSource, /:has\(\.indicator-ide\)/)
})

test('plain Enter sends while Ctrl or Command Enter keeps a newline', () => {
  const enterHandler = viewSource.slice(
    viewSource.indexOf('handleAIGenerateEnterKey (e)'),
    viewSource.indexOf('resetAiWorkspaceState', viewSource.indexOf('handleAIGenerateEnterKey (e)'))
  )
  assert.match(enterHandler, /if \(e\.ctrlKey \|\| e\.metaKey\) \{[\s\S]*?this\.aiPrompt = `\$\{prompt\.slice\(0, start\)\}\\n\$\{prompt\.slice\(end\)\}`/)
  assert.match(enterHandler, /e\.preventDefault\(\)/)
  assert.match(enterHandler, /this\.handleAIGenerate\(\)/)
})

test('indicator quick trade opens as a task-ordered dock below the K-line', () => {
  assert.match(viewSource, /quickTradeDrawerVisible: true/)
  assert.match(viewSource, /class="ide-chart-fs-row"[\s\S]*?class="chart-panel"[\s\S]*?class="ide-quick-bottom ide-quick-bottom--chart-fs"/)
  assert.doesNotMatch(viewSource, /class="chart-panel-qt-btn"/)
  assert.match(viewSource, /class="ide-quick-panel-head"[\s\S]*?:aria-expanded="quickTradeDrawerVisible \? 'true' : 'false'"[\s\S]*?@click="toggleQuickTradeDrawer"/)
  assert.match(viewSource, /\.ide-quick-bottom--collapsed\s*\{[\s\S]*?flex-basis: 40px;/)
  assert.match(viewSource, /<quick-trade-panel[\s\S]*?embedded-dock/)
  assert.match(viewSource, /\.ide-chart-fs-row\s*\{[\s\S]*?flex-direction: column;/)
  assert.match(viewSource, /\.ide-quick-bottom\s*\{[\s\S]*?flex: 0 0 clamp\(320px, 34vh, 430px\);/)
  assert.match(quickTradeSource, /embeddedDock: \{ type: Boolean, default: false \}/)
  assert.match(quickTradeSource, /<div v-if="!embeddedDock" class="qt-symbol-bar">/)
  assert.match(quickTradeSource, /\.quick-trade-embedded\.qt-embedded-ide\.qt-embedded-dock\s*\{[\s\S]*?grid-template-columns: minmax\(260px, 0\.9fr\) minmax\(300px, 1\.05fr\) minmax\(340px, 1\.25fr\);/)
  assert.match(quickTradeSource, /\.qt-account-section\s*\{[\s\S]*?grid-column-start: 1;[\s\S]*?grid-column-end: -1;/)
  assert.match(quickTradeSource, /class="qt-risk-action-stack"[\s\S]*?class="qt-section qt-card qt-tpsl-card"[\s\S]*?class="qt-submit-section qt-submit-section--embedded-left"/)
  assert.match(quickTradeSource, /\.qt-position-section,\s*\.qt-history-section\s*\{[\s\S]*?grid-column-start: 1;[\s\S]*?grid-column-end: -1;/)
  assert.match(quickTradeSource, /\.qt-position-card\s*\{[\s\S]*?grid-column-start: 1;[\s\S]*?grid-column-end: -1;[\s\S]*?grid-template-columns: repeat\(7, minmax\(96px, 1fr\)\) minmax\(112px, auto\);/)
  assert.match(quickTradeSource, /\.qt-position-card \.qt-position-close-btn\s*\{[\s\S]*?align-self: center;[\s\S]*?justify-self: center;[\s\S]*?width: 148px;/)
})
