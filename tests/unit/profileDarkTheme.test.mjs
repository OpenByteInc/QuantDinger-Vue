import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const profile = fs.readFileSync(path.join(root, 'src/views/profile/index.vue'), 'utf8')

test('profile role badges use explicit dark-theme colors', () => {
  assert.match(profile, /class="profile-role-tag" :color="getRoleColor\(profile\.role\)"/)
  assert.match(profile, /&\.theme-dark[\s\S]*?\.profile-role-tag\.ant-tag-red[\s\S]*?background: rgba\(255, 77, 79, 0\.14\) !important;/)
  assert.match(profile, /&\.theme-dark[\s\S]*?\.profile-role-tag\.ant-tag-blue[\s\S]*?color: var\(--primary-color-hover, #69b1ff\) !important;/)
  assert.match(profile, /&\.theme-dark[\s\S]*?\.profile-role-tag\.ant-tag-default[\s\S]*?color: var\(--profile-text-secondary\) !important;/)
})
