import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('user management tabs share the compact operations visual system', () => {
  const view = read('src/views/user-manage/index.vue')
  const polish = read('src/views/user-manage/user-manage-polish.less')

  assert.match(view, /@import '\.\/user-manage-polish\.less';/)
  assert.match(polish, /--admin-radius-panel: 8px;/)
  assert.match(polish, /\.summary-cards\.user-kpi-cards\s*\{[\s\S]*?repeat\(6, minmax\(0, 1fr\)\)/)
  assert.match(polish, /\.charts-grid\.charts-grid-2col\s*\{[\s\S]*?1\.35fr[\s\S]*?\.85fr/)
  assert.match(polish, /\.user-table-card\s*\{[\s\S]*?box-shadow: none;/)
  assert.match(polish, /\.status-dot[\s\S]*?animation: none;/)
  assert.doesNotMatch(polish, /radial-gradient|linear-gradient|animation: pulse/)
})
