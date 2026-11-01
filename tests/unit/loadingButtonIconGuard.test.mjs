import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const globalStyles = readFileSync(new URL('../../src/global.less', import.meta.url), 'utf8')

test('loading buttons hide their regular icon while the Ant Design spinner is visible', () => {
  assert.match(
    globalStyles,
    /\.ant-btn-loading\s*>\s*\.anticon:not\(\.anticon-loading\)\s*\{[^}]*display:\s*none;/s
  )
})
