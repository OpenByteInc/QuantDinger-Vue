import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const darkOverrides = fs.readFileSync(
  new URL('../../src/qd-layout-dark-override.less', import.meta.url),
  'utf8'
)

test('portaled Ant modals have a low-specificity dark theme baseline', () => {
  for (const surface of ['ant-modal-content', 'ant-modal-header', 'ant-modal-body', 'ant-modal-footer']) {
    assert.match(darkOverrides, new RegExp(`body\\.dark :where\\(\\.ant-modal-wrap \\.${surface}\\)`))
  }
  assert.match(darkOverrides, /body\.dark :where\(\.ant-modal-wrap \.ant-form-item-label > label\)/)
  assert.match(darkOverrides, /body\.dark :where\(\.ant-modal-wrap \.ant-input\)/)
  assert.match(darkOverrides, /body\.dark :where\(\.ant-modal-wrap \.ant-card\)/)
})
