import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('broker accounts use the compact workspace polish layer', () => {
  const page = read('src/views/broker-accounts/index.vue')
  const polish = read('src/views/broker-accounts/broker-accounts-polish.less')

  assert.match(page, /@import '\.\/broker-accounts-polish\.less'/)
  assert.match(page, /ba-health-state" :class="\{ 'is-healthy': connectedCount > 0 \}"/)
  assert.match(polish, /--ba-radius-sm: 4px;/)
  assert.match(polish, /--ba-radius-md: 6px;/)
  assert.match(polish, /--ba-radius-lg: 8px;/)
  assert.match(polish, /\.ba-workbench \{[\s\S]*?grid-template-columns: 284px minmax\(0, 1fr\);[\s\S]*?box-shadow: none;/)
  assert.match(polish, /\.ba-provider-row,[\s\S]*?min-height: 50px;/)
  assert.match(polish, /\.ba-provider-row[\s\S]*?&\.active[\s\S]*?box-shadow: inset 2px 0 0/)
  assert.match(polish, /\.crypto-grid \{[\s\S]*?minmax\(320px, 420px\)/)
  assert.match(polish, /\.crypto-item \{[\s\S]*?border-radius: var\(--ba-radius-lg\);[\s\S]*?box-shadow: none;/)
  assert.match(polish, /\.account-grid \{[\s\S]*?minmax\(140px, 1fr\)/)
  assert.match(polish, /\.metric-card \{[\s\S]*?min-height: 92px;[\s\S]*?border-radius: var\(--ba-radius-md\)/)
  assert.match(polish, /\.ant-table-tbody > tr > td \{[\s\S]*?height: 44px;[\s\S]*?padding: 7px 9px;/)
  assert.match(polish, /\.broker-accounts\.theme-dark \{[\s\S]*?--ba-surface: #111315;/)
})
