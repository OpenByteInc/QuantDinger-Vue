import assert from 'node:assert/strict'
import test from 'node:test'
import { strategyStopFeedback } from '../../src/utils/strategyStopFeedback.js'
import messages from '../../src/locales/lang/strategy-live-risk.js'

const zh = messages['zh-CN']
const t = key => zh[key] || key

test('queued pause is informational and does not claim completion', () => {
  const result = strategyStopFeedback({ code: 1, data: { status: 'stopping', close_requested: false } }, t)
  assert.equal(result.level, 'info')
  assert.equal(result.message, zh['strategyV2.stopQueued'])
})

test('queued closing does not claim positions have closed', () => {
  const result = strategyStopFeedback({ code: 1, data: { status: 'stopping', close_requested: true } }, t)
  assert.equal(result.level, 'info')
  assert.equal(result.message, zh['strategyV2.stopAndCloseQueued'])
})

test('only an actually paused strategy reports a partial close failure', () => {
  const result = strategyStopFeedback({ code: 0, data: {
    status: 'stopped', close_requested: true, close_errors: ['strategyV2.closeRunIdentityMissing']
  } }, t)
  assert.equal(result.level, 'warning')
  assert.ok(result.message.includes(zh['strategyV2.stopClosePartialFailure']))
  assert.ok(result.message.includes(zh['strategyV2.closeRunIdentityMissing']))
  assert.ok(!result.message.includes('strategyV2.'))
})

test('failed pause and network failure do not claim a close failure', () => {
  for (const response of [undefined, { code: 0, msg: 'strategyV2.stopClosePartialFailure', data: { status: 'running' } }]) {
    const result = strategyStopFeedback(response, t, true)
    assert.deepEqual(result, { level: 'error', message: zh['strategyV2.stopFailed'] })
  }
})

test('completed pause uses the confirmed action returned by the backend', () => {
  const result = strategyStopFeedback({ code: 1, data: { status: 'stopped', close_requested: false } }, t, true)
  assert.deepEqual(result, { level: 'success', message: zh['strategyV2.paused'] })
})
