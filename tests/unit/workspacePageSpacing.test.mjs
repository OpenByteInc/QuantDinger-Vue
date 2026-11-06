import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

const framedWorkspaceViews = [
  'src/views/ai-analysis/index.vue',
  'src/views/strategy-center/index.vue',
  'src/views/indicator-community/index.vue',
  'src/views/strategy-ide/index.vue',
  'src/views/backtest-center/index.vue',
  'src/views/universe-manager/index.vue',
  'src/views/broker-accounts/index.vue',
  'src/views/billing/index.vue',
  'src/views/profile/index.vue',
  'src/views/user-manage/index.vue',
  'src/views/agent-tokens/index.vue',
  'src/views/ai-skills/index.vue',
  'src/views/settings/index.vue'
]

test('all routed desktop workspace pages use the shared page frame', () => {
  for (const path of framedWorkspaceViews) {
    const source = read(path)
    assert.match(source, /class="[^"]*qd-workspace-page[^"]*qd-page-frame[^"]*"/, path)
  }
})

test('workspace frame owns consistent desktop and compact gutters', () => {
  const source = read('src/styles/workspace-system.less')

  assert.match(source, /--qd-page-gutter: 16px;/)
  assert.match(source, /\.qd-workspace-page\.qd-page-frame\s*\{[\s\S]*?padding: var\(--qd-page-gutter\) !important;/)
  assert.match(source, /@media \(max-width: 768px\)[\s\S]*?--qd-page-gutter: 12px;/)
})

test('indicator IDE remains edge-to-edge outside the shared page frame', () => {
  const source = read('src/views/indicator-ide/index.vue')
  const root = source.match(/<template>[\s\S]*?<div[^>]+class="indicator-ide"[^>]*>/)?.[0]

  assert.ok(root)
  assert.doesNotMatch(root, /qd-page-frame/)
  assert.match(source, /\.indicator-ide\s*\{[\s\S]*?padding: 0;/)
})

test('strategy IDE presents the editor as one edge-to-edge workspace', () => {
  const page = read('src/views/strategy-ide/index.vue')
  const editor = read('src/views/strategy-ide/components/StrategyEditor.vue')

  assert.match(page, /\.strategy-ide-shell\.qd-page-frame\s*\{[\s\S]*?--qd-page-gutter: 0px;[\s\S]*?padding: 0 !important;/)
  assert.match(page, /\.script-panel\s*\{[\s\S]*?border: 0;[\s\S]*?border-radius: 0;/)
  assert.match(page, /\.strategy-ai-workspace\s*\{[\s\S]*?border: 0;[\s\S]*?border-radius: 0;/)
  assert.match(editor, /\.editor-layout--split\s*\{[\s\S]*?gap: 0;/)
  assert.match(editor, /\.side-tabs--split\s*\{[\s\S]*?border-right: 1px solid #e8e8e8;[\s\S]*?border-radius: 0;/)
  assert.match(editor, /\.editor-layout--split \.code-section\s*\{[\s\S]*?border-right: 1px solid #e8e8e8;[\s\S]*?border-radius: 0;/)
})

test('AI research does not add a second outer gutter inside the shared frame', () => {
  const source = read('src/views/ai-analysis/components/CopilotWorkbench.vue')
  const rootRules = [...source.matchAll(/\.copilot-workbench\s*\{([\s\S]*?)\}/g)]

  assert.ok(rootRules.length > 0)
  for (const [, declarations] of rootRules) {
    const padding = declarations.match(/(?:^|\n)\s*padding:\s*([^;]+);/)?.[1]
    if (padding) assert.match(padding.trim(), /^0(?:\s+!important)?$/)
  }
})
