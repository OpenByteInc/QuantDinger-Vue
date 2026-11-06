import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('membership plans use the compact account experience visual system', () => {
  const view = read('src/views/billing/index.vue')
  const polish = read('src/views/billing/billing-polish.less')

  assert.match(view, /@import '\.\/billing-polish\.less';/)
  assert.match(polish, /--billing-radius-panel: 8px;/)
  assert.match(polish, /\.billing-hero\s*\{[\s\S]*?min-height: 148px;/)
  assert.match(polish, /\.plan-card\s*\{[\s\S]*?min-height: 354px;[\s\S]*?box-shadow: none;/)
  assert.match(polish, /\.plan-action\s*\{[\s\S]*?height: 36px;/)
  assert.doesNotMatch(polish, /radial-gradient|linear-gradient/)
})

test('profile overview and settings share compact neutral controls', () => {
  const view = read('src/views/profile/index.vue')
  const polish = read('src/views/profile/profile-polish.less')

  assert.match(view, /@import '\.\/profile-polish\.less';/)
  assert.match(polish, /--profile-radius-panel: 8px;/)
  assert.match(polish, /\.profile-overview-grid\s*\{[\s\S]*?min-height: 184px;/)
  assert.match(polish, /\.ant-tabs-left-bar[\s\S]*?width: 184px;[\s\S]*?min-height: 398px;/)
  assert.match(polish, /\.edit-card \.mfa-card\s*\{[\s\S]*?background: var\(--profile-panel-raised\);[\s\S]*?box-shadow: none;/)
  assert.doesNotMatch(polish, /radial-gradient|linear-gradient/)
})
