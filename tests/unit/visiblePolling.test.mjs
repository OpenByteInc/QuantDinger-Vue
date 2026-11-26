import test from 'node:test'
import assert from 'node:assert/strict'
import { startVisiblePolling } from '../../src/utils/visiblePolling.js'

test('polling pauses while hidden, resumes without overlap and cleans up on exit', async () => {
  let callback, listener, finish, calls = 0, enabled = true
  const page = {
    hidden: true,
    addEventListener: (_, fn) => { listener = fn },
    removeEventListener: (_, fn) => { assert.equal(fn, listener); listener = null }
  }
  const stop = startVisiblePolling(() => { calls++; return new Promise(resolve => { finish = resolve }) }, {
    page, enabled: () => enabled,
    schedule: fn => { callback = fn; return 1 }, cancel: () => { callback = null }
  })
  await callback()
  assert.equal(calls, 0)
  enabled = false; page.hidden = false
  await callback()
  assert.equal(calls, 0)
  enabled = true
  listener()
  assert.equal(calls, 1)
  listener()
  assert.equal(calls, 1)
  stop(); finish()
  await Promise.resolve(); await Promise.resolve()
  assert.equal(callback, null)
  assert.equal(listener, null)
})

test('a failed read schedules recovery instead of stopping polling', async () => {
  let callback, calls = 0
  const stop = startVisiblePolling(async () => { calls++; throw Error('offline') }, {
    page: { hidden: false, addEventListener () {}, removeEventListener () {} },
    schedule: fn => { callback = fn; return 1 }, cancel: () => {}
  })
  await callback(); await callback()
  assert.equal(calls, 2)
  stop()
})
