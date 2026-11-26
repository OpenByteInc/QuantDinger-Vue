import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const viewSource = fs.readFileSync(path.join(root, 'src/views/indicator-ide/index.vue'), 'utf8')
const layoutSource = fs.readFileSync(path.join(root, 'src/layouts/BasicLayout.less'), 'utf8')
const layoutViewSource = fs.readFileSync(path.join(root, 'src/layouts/BasicLayout.vue'), 'utf8')
const rightContentSource = fs.readFileSync(path.join(root, 'src/components/GlobalHeader/RightContent.vue'), 'utf8')
const noticeIconSource = fs.readFileSync(path.join(root, 'src/components/NoticeIcon/NoticeIcon.vue'), 'utf8')
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
  assert.match(viewSource, /\{ label: this\.\$t\('indicatorIde\.aiQuickExplain'\), mode: 'discussion', icon: 'file-search' \}/)
  assert.match(viewSource, /\{ label: this\.\$t\('indicatorIde\.aiQuickParameters'\), mode: 'modify', icon: 'sliders' \}/)

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
  assert.match(viewSource, /codeDrawerVisible: true/)
  assert.match(viewSource, /codePanelWidthStyle \(\)[\s\S]*?flexBasis: `\$\{this\.workspaceSplitRatio\}%`/)
  assert.match(viewSource, /\.ide-left\s*\{[\s\S]*?width: 38%;[\s\S]*?min-width: 320px;[\s\S]*?max-width: none;/)
  assert.match(viewSource, /class="ide-workspace-resizer"/)
  assert.match(viewSource, /\.ai-conversation\s*\{[\s\S]*?flex: 1 1 auto;[\s\S]*?resize: none;/)
  assert.match(viewSource, /class="ai-composer-toolbar"/)
  assert.match(viewSource, /\.ai-composer-toolbar\s*\{[\s\S]*?justify-content: space-between;/)
  assert.doesNotMatch(viewSource, /\.ai-composer-send\s*\{[^}]*?position: absolute;/)
  assert.match(viewSource, /min-width: 72px;/)
  assert.match(viewSource, /height: 28px;/)
  assert.match(viewSource, /\{\{ \$t\('indicatorIde\.aiSend'\) \}\}/)
  assert.match(viewSource, /class="ide-right ide-right--workspace"/)
})

test('empty AI workspace mirrors the strategy assistant hierarchy and anchors the composer at the bottom', () => {
  assert.match(viewSource, /:class="\{ 'is-empty': !aiWorkspaceLoading && !aiMessages\.length \}"/)
  assert.match(viewSource, /class="ai-conversation-empty__intro"[\s\S]*?<a-icon type="code" \/>/)
  assert.match(viewSource, /indicatorIde\.aiConversationEmptyTitle/)
  assert.doesNotMatch(viewSource, /indicatorIde\.aiConversationEmptyDesc/)
  assert.match(viewSource, /\.ai-quick-prompts\s*\{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
  assert.match(viewSource, /\.ai-quick-prompts button\s*\{[\s\S]*?border-radius: 999px;[\s\S]*?text-align: center;/)
  assert.doesNotMatch(viewSource, /&\.is-empty \.ai-conversation\s*\{[\s\S]*?flex: 0 0 auto;/)
  assert.match(viewSource, /\.ai-conversation-empty\s*\{[\s\S]*?justify-content: center;/)
  assert.match(viewSource, /\.ai-composer ::v-deep \.ai-prompt-input textarea\s*\{[\s\S]*?min-height: 80px;/)
  assert.doesNotMatch(viewSource, /class="ai-helper-tip"/)
})

test('indicator assistant floats independently without reserving editor height', () => {
  assert.match(viewSource, /ref="codePanelBody" class="code-panel-body"/)
  assert.doesNotMatch(viewSource, /class="code-ai-resizer"|codeAiSplitRatio|startCodeAiResize/)
  assert.match(viewSource, /\.code-editor-section\s*\{[\s\S]*?flex: 1 1 auto;[\s\S]*?max-height: none;/)
  assert.match(viewSource, /id="indicator-ai-dialog"[\s\S]*?role="dialog"/)
  assert.match(viewSource, /v-show="!aiPanelExpanded"[\s\S]*?ref="indicatorAiLauncher"/)
  assert.match(viewSource, /aiPanelExpanded: false/)
  assert.match(viewSource, /@keydown\.esc\.stop="closeIndicatorAiPanel"/)
  assert.match(viewSource, /\.indicator-ide \.indicator-ai-floating\s*\{[\s\S]*?position: fixed;/)
})

test('indicator assistant opening focuses input and closing retains conversation and draft', () => {
  const method = (name, next) => new Function(viewSource.split(`    ${name} () {`)[1].split(`\n    ${next} () {`)[0].replace(/},\s*$/, ''))
  let inputFocused = false
  let launcherFocused = false
  const context = {
    codeDrawerVisible: true,
    selectedIndicatorCodeHidden: false,
    aiPanelExpanded: false,
    aiPrompt: 'Keep the draft',
    aiMessages: [{ role: 'user', content: 'Existing message' }],
    aiGenerating: true,
    $nextTick (callback) { callback() },
    scrollAiConversationToBottom () {},
    $refs: {
      indicatorAiPrompt: { $el: { tagName: 'TEXTAREA', focus () { inputFocused = true } } },
      indicatorAiLauncher: { focus () { launcherFocused = true } }
    }
  }
  context.focusIndicatorAiPrompt = () => method('focusIndicatorAiPrompt', 'openIndicatorAiPanel').call(context)
  method('openIndicatorAiPanel', 'closeIndicatorAiPanel').call(context)
  assert.equal(context.aiPanelExpanded, true)
  assert.equal(inputFocused, true)
  method('closeIndicatorAiPanel', 'toggleCodeDrawer').call(context)
  assert.equal(context.aiPanelExpanded, false)
  assert.equal(launcherFocused, true)
  assert.equal(context.aiPrompt, 'Keep the draft')
  assert.equal(context.aiMessages.length, 1)
  assert.equal(context.aiGenerating, true)
  const response = viewSource.slice(viewSource.indexOf("const replyType = (workspaceMeta"), viewSource.indexOf('} catch (error)', viewSource.indexOf("const replyType = (workspaceMeta")))
  assert.doesNotMatch(response, /this\.aiPanelExpanded = true/)
})

test('code quality action and result live in the editor guide bar', () => {
  const guideStart = viewSource.indexOf('class="ide-guide-bar"')
  const guideBlock = viewSource.slice(guideStart, viewSource.indexOf('\n            </div>', guideStart))
  assert.ok(guideStart > viewSource.indexOf('class="code-editor-wrapper"'))
  assert.match(guideBlock, /placement="topRight"/)
  assert.match(guideBlock, /code-quality-top-status/)
  assert.match(guideBlock, /@click="runCodeQualityCheck"/)
  assert.match(guideBlock, /indicatorIde\.devGuide/)
  assert.match(guideBlock, /https:\/\/www\.quantdinger\.com\/doc\/trading\/INDICATOR_DEV_GUIDE\.html/)
  assert.doesNotMatch(guideBlock, /docs-zh\.html#strategy-overview/)
  assert.doesNotMatch(viewSource, /class="code-quality-panel"/)
})

test('multi-tab mode keeps every route inside the available viewport height', () => {
  assert.match(viewSource, /\.indicator-ide\s*\{[\s\S]*?height: var\(--ide-shell-height,[\s\S]*?max-height: var\(--ide-shell-height,[\s\S]*?overflow: hidden;/)
  assert.match(viewSource, /\.ide-main\s*\{[^}]*overflow: hidden;/)
  assert.match(viewSource, /\.ide-left\s*\{[\s\S]*?height: 100%;[\s\S]*?max-height: 100%;/)
  assert.match(layoutSource, /\.basic-layout-wrapper--multi-tab \.ant-layout-content,[\s\S]*?display: flex !important;[\s\S]*?height: calc\(100vh - 60px\) !important;/)
  assert.match(layoutSource, /\.basic-layout-wrapper--multi-tab \.ant-pro-grid-content\s*\{[\s\S]*?display: flex !important;[\s\S]*?height: 100% !important;/)
  assert.match(layoutSource, /\.basic-layout-wrapper--multi-tab \.basic-route-view-shell\s*\{[\s\S]*?flex: 1 1 0 !important;[\s\S]*?height: 0 !important;[\s\S]*?overflow: auto;/)
  assert.match(layoutSource, /\.basic-layout-wrapper--multi-tab \.indicator-ide,\s*\.basic-layout-wrapper--multi-tab \.strategy-ide-shell\s*\{[\s\S]*?--ide-shell-height: 100%;[\s\S]*?height: 100% !important;/)
  assert.doesNotMatch(layoutSource, /:has\(\.indicator-ide\)/)
})

test('top navigation uses a compact terminal-style hierarchy', () => {
  assert.match(layoutSource, /\.ant-menu-horizontal\s*\{[\s\S]*?display: flex !important;[\s\S]*?align-items: center !important;/)
  assert.match(layoutSource, /\.ant-menu-horizontal > \.ant-menu-item,[\s\S]*?align-self: center !important;[\s\S]*?height: @layout-header-height !important;[\s\S]*?margin: 0 !important;/)
  assert.match(layoutSource, /\.anticon \+ span,[\s\S]*?margin-left: 0 !important;/)
  assert.match(layoutSource, /\.ant-menu-item-selected::after,[\s\S]*?height: 3px !important;[\s\S]*?background: var\(--primary-color/)
  assert.match(layoutSource, /\.ant-menu-item-selected,[\s\S]*?background: transparent !important;/)
  assert.match(layoutSource, /font-size: 14px !important;[\s\S]*?font-weight: 500 !important;/)
  assert.match(layoutSource, /border-bottom: 0 !important;/)
})

test('collapsed header actions retain accessible names', () => {
  assert.match(layoutViewSource, /class="top-admin-shortcut"[\s\S]*?:aria-label="topAdminTitle"/)
  assert.match(rightContentSource, /<button[\s\S]*?:aria-label="\$t\('app\.setting\.tooltip'\)"[\s\S]*?@click="handleSettingClick"/)
})

test('notification bell uses one centered action box without nested header padding', () => {
  assert.match(rightContentSource, /<notice-icon class="header-notice-action" \/>/)
  assert.doesNotMatch(rightContentSource, /<notice-icon :class="prefixCls" \/>/)
  assert.match(noticeIconSource, /\.notice-icon-wrapper\s*\{[\s\S]*?width: 36px;[\s\S]*?height: 36px;/)
  assert.match(noticeIconSource, /\.header-notice-icon\s*\{[\s\S]*?padding: 0;/)
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

test('indicator quick trade opens as a compact draggable floating console', () => {
  assert.match(viewSource, /quickTradeDrawerVisible: false/)
  assert.match(viewSource, /ref="chartPanel" class="chart-panel"[\s\S]*?class="ide-quick-float"/)
  assert.doesNotMatch(viewSource, /class="chart-panel-qt-btn"/)
  assert.match(viewSource, /class="ide-quick-float__titlebar" @mousedown="startQuickTradeDrag"/)
  assert.match(viewSource, /:style="quickTradeFloatingStyle"/)
  assert.match(viewSource, /<quick-trade-panel[\s\S]*?embedded-dock[\s\S]*?side-dock[\s\S]*?floating-console/)
  assert.match(viewSource, /\.ide-chart-fs-row\s*\{[\s\S]*?flex-direction: row;/)
  assert.match(viewSource, /\.ide-quick-float\s*\{[\s\S]*?position: absolute;[\s\S]*?width: min\(760px, calc\(100% - 24px\)\);/)
  assert.match(viewSource, /\.ide-quick-float\s*\{[\s\S]*?&\.is-minimized\s*\{[\s\S]*?width: 244px;/)
  assert.match(viewSource, /snapFloatingPanelPosition/)
  assert.match(quickTradeSource, /embeddedDock: \{ type: Boolean, default: false \}/)
  assert.match(quickTradeSource, /sideDock: \{ type: Boolean, default: false \}/)
  assert.match(quickTradeSource, /floatingConsole: \{ type: Boolean, default: false \}/)
  assert.match(quickTradeSource, /<div v-if="!embeddedDock" class="qt-symbol-bar">/)
  assert.match(quickTradeSource, /@import "\.\/floating-console\.less"/)
  assert.match(quickTradeSource, /\.qt-side-account-control\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 32px;/)
  assert.match(quickTradeSource, /\.qt-embedded-split--cols\s*\{[\s\S]*?flex-direction: column;/)
  assert.match(quickTradeSource, /\.qt-position-card\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
})


test('indicator AI cannot open when the code panel or source is hidden', () => {
  const open = new Function(viewSource.split('    openIndicatorAiPanel () {')[1].split('\n    closeIndicatorAiPanel () {')[0].replace(/},\s*$/, ''))
  for (const state of [
    { codeDrawerVisible: false, selectedIndicatorCodeHidden: false },
    { codeDrawerVisible: true, selectedIndicatorCodeHidden: true }
  ]) {
    const context = { ...state, aiPanelExpanded: false }
    open.call(context)
    assert.equal(context.aiPanelExpanded, false)
  }
  assert.match(viewSource, /v-if="codeDrawerVisible && !selectedIndicatorCodeHidden"[\s\S]*?ref="indicatorAiLauncher"/)
  assert.match(viewSource, /v-show="codeDrawerVisible && !selectedIndicatorCodeHidden && aiPanelExpanded"/)
})

test('collapsing indicator code closes the assistant without discarding the draft', () => {
  const watch = new Function(viewSource.split('    codeDrawerVisible () {')[1].split('\n    quickTradeDrawerVisible () {')[0].replace(/},\s*$/, ''))
  const context = {
    codeDrawerVisible: false,
    aiPanelExpanded: true,
    aiPrompt: 'Keep my draft',
    schedulePersistIdeUiState () {},
    $nextTick () {}
  }
  watch.call(context)
  assert.equal(context.aiPanelExpanded, false)
  assert.equal(context.aiPrompt, 'Keep my draft')
})
