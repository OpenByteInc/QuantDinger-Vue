import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import themeColor from '../../src/components/SettingDrawer/themeColor.js'

const componentPath = fileURLToPath(
  new URL('../../src/components/SettingDrawer/SettingDrawer.vue', import.meta.url)
)
const source = fs.readFileSync(componentPath, 'utf8')

async function themeRules (color) {
  const previousDocument = globalThis.document
  const style = { textContent: '' }
  globalThis.document = {
    documentElement: { style: { setProperty () {} } },
    getElementById: () => style
  }
  try {
    await themeColor.changeColor(color)
    return postcss.parse(style.textContent).nodes.filter(node => node.type === 'rule')
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
}

test('theme accent text never overrides the filled radio foreground in first, hover or focus states', async () => {
  for (const color of ['#52c41a', '#1890ff', '#ff4d4f']) {
    const rules = await themeRules(color)
    const accentSelectors = rules
      .filter(rule => rule.nodes.some(node => node.prop === 'color' && node.value === color))
      .flatMap(rule => rule.selectors)
      .filter(selector => selector.includes('.ant-radio-button-wrapper'))
    assert.deepEqual(accentSelectors, [
      '.ant-radio-button-wrapper:not(.ant-radio-button-wrapper-checked):not(.ant-radio-button-wrapper-disabled):hover'
    ])

    const filled = rules.find(rule => rule.selector === '.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)')
    assert.ok(filled, 'one shared checked rule covers first-child, hover and focus without raising specificity')
    for (const [property, value] of [['background-color', color], ['color', '#fff']]) {
      const declaration = filled.nodes.find(node => node.prop === property)
      assert.equal(declaration?.value, value)
      assert.equal(declaration?.important, true)
    }
  }
})

test('selected radio labels inherit their wrapper color for both solid and tinted controls', () => {
  const theme = fs.readFileSync(new URL('../../src/components/SettingDrawer/themeColor.js', import.meta.url), 'utf8')
  const editor = fs.readFileSync(new URL('../../src/views/strategy-center/components/LiveStrategyEditor.vue', import.meta.url), 'utf8')
  assert.match(theme, /\.ant-radio-button-wrapper-checked:not\(\.ant-radio-button-wrapper-disabled\) \{[\s\S]*?color: #fff !important;/)
  assert.match(theme, /\.ant-radio-button-wrapper-checked:not\(\.ant-radio-button-wrapper-disabled\) > span,[\s\S]*?:focus-within > span \{\s*color: inherit !important;/)
  assert.match(editor, /\.strategy-runtime-product \.ant-radio-button-wrapper-checked[^\{]*\{[^}]*color: var\(--primary-color, #52c41a\) !important;/)
})

test('dark setting drawer uses the app black surface from its own theme state', () => {
  assert.match(source, /:class="\{ 'setting-drawer--dark': isDarkDrawer \}"/)
  assert.match(source, /&\.setting-drawer--dark \{[\s\S]*?--setting-drawer-bg: #080808;/)
  assert.match(source, /background: var\(--setting-drawer-bg\) !important;/)
  assert.match(source, /--setting-drawer-bg: #080808;/)
  assert.match(source, /--setting-drawer-panel: #111111;/)
  assert.doesNotMatch(source, /--setting-drawer-bg: #11161c;/)
  assert.doesNotMatch(source, /background: #171717 !important;/)
})

test('setting drawer uses a responsive desktop width and keeps page style labels on one line', () => {
  assert.match(source, /:width="drawerWidth"/)
  assert.match(source, /drawerWidth \(\) \{\s*return this\.isMobile \? '100%' : 380\s*\}/)
  assert.match(source, /> span:not\(\.appearance-preview\) \{[\s\S]*?font-weight: 600;[\s\S]*?white-space: nowrap;/)
  assert.doesNotMatch(source, /> span:not\(\.appearance-preview\) \{[\s\S]*?text-overflow: ellipsis;/)
})
