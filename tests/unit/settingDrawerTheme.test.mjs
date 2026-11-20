import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const componentPath = fileURLToPath(
  new URL('../../src/components/SettingDrawer/SettingDrawer.vue', import.meta.url)
)
const source = fs.readFileSync(componentPath, 'utf8')

test('selected radio labels inherit their wrapper color for both solid and tinted controls', () => {
  const theme = fs.readFileSync(new URL('../../src/components/SettingDrawer/themeColor.js', import.meta.url), 'utf8')
  const editor = fs.readFileSync(new URL('../../src/views/strategy-center/components/LiveStrategyEditor.vue', import.meta.url), 'utf8')
  assert.match(theme, /\.ant-radio-button-wrapper-checked:not\(\.ant-radio-button-wrapper-disabled\) \{[\s\S]*?color: #fff !important;/)
  assert.match(theme, /\.ant-radio-button-wrapper-checked:not\(\.ant-radio-button-wrapper-disabled\) > span,[\s\S]*?:focus-within > span \{\s*color: inherit !important;/)
  assert.match(editor, /\.strategy-runtime-product \.ant-radio-button-wrapper-checked[^\{]*\{[^}]*color: var\(--primary-color, #52c41a\) !important;/)
})

test('dark setting drawer uses the app black surface from its own theme state', () => {
  assert.match(source, /:class="\{ 'setting-drawer--dark': isDarkDrawer \}"/)
  assert.match(source, /&\.setting-drawer--dark \{[\s\S]*?background: #080808 !important;/)
  assert.match(source, /--setting-drawer-bg: #080808;/)
  assert.match(source, /--setting-drawer-panel: #111111;/)
  assert.doesNotMatch(source, /--setting-drawer-bg: #11161c;/)
  assert.doesNotMatch(source, /background: #171717 !important;/)
})

test('setting drawer uses a responsive desktop width and keeps page style labels on one line', () => {
  assert.match(source, /:width="drawerWidth"/)
  assert.match(source, /drawerWidth \(\) \{\s*return this\.isMobile \? '100%' : 420\s*\}/)
  assert.match(source, /> span \{[\s\S]*?font-weight: 600;[\s\S]*?white-space: nowrap;/)
  assert.doesNotMatch(source, /> span \{[\s\S]*?text-overflow: ellipsis;/)
})
