import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const layoutPath = fileURLToPath(
  new URL('../../src/layouts/BasicLayout.vue', import.meta.url)
)
const source = fs.readFileSync(layoutPath, 'utf8')

test('setting drawer support content has stable groups for narrow layouts', () => {
  assert.match(source, /class="support-grid"/)
  assert.match(source, /class="support-block support-block--social"/)
  assert.match(source, /class="support-meta"/)
  assert.match(source, /\.support-grid \{\s*display: grid;\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
  assert.match(source, /\.support-title \{[\s\S]*?white-space: nowrap;/)
  assert.match(source, /@media \(max-width: 380px\) \{\s*\.support-grid \{\s*grid-template-columns: 1fr;/)
})

test('sidebar uses the full viewport when the custom footer is disabled', () => {
  assert.match(source, /var\(--menu-footer-height, 0px\)/)
  assert.match(source, /var\(--footer-height, 0px\)/)
  assert.doesNotMatch(source, /var\(--menu-footer-height, 220px\)/)
  assert.doesNotMatch(source, /var\(--footer-height, 280px\)/)
})
