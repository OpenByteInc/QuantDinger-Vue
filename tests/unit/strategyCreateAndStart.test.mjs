import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import messages from '../../src/locales/lang/strategy-launch.js'

const source = readFileSync(new URL('../../src/views/strategy-center/components/LiveStrategyEditor.vue', import.meta.url), 'utf8')
const saveCode = source.slice(source.indexOf('    async save () {'), source.indexOf('    close () {'))
const validationCode = source.slice(source.indexOf('    validateFinal () {'), source.indexOf('    async save () {'))

function editor (overrides = {}) {
  const calls = []
  const notices = []
  const events = []
  const create = overrides.create || (async payload => {
    calls.push(['create', payload])
    return { code: 1, data: { id: 123 } }
  })
  const start = overrides.start || (async id => {
    calls.push(['start', id])
    return { code: 1, data: { id, status: 'starting' } }
  })
  const update = async (id, payload) => {
    calls.push(['update', id, payload])
    return { code: 1, data: { id } }
  }
  const methods = new Function('createStrategy', 'startStrategy', 'updateStrategy', 'notificationTargets',
    `return ({${validationCode}${saveCode}})`)(create, start, update, () => ({}))
  const vm = {
    saving: false,
    isEdit: false,
    strategyId: null,
    supportsStrategyV2Leverage: true,
    supportsAiDecisionFilter: true,
    requiresDirectionMode: false,
    compatibleCredentials: [{ id: 9 }],
    notificationSettings: {},
    model: {
      scriptSourceId: 42,
      name: 'Test',
      initialCapital: 1000,
      leverageEnabled: true,
      leverage: 2,
      executionMode: 'signal',
      credentialId: 9,
      disclaimer: false,
      notifyChannels: ['browser'],
      templateParams: { entry_period: 20 },
      equityStopLossEnabled: true,
      equityStopLossPct: 0.3,
      aiDecisionFilter: false
    },
    $t: (key, params) => params ? `${key}:${params.reason}` : key,
    $message: Object.fromEntries(['success', 'info', 'error', 'warning'].map(level => [level, text => notices.push([level, text])])),
    $emit: (...args) => events.push(args),
    ...methods,
    async validateDeployment () { return this.validateFinal() }
  }
  return { vm, calls, notices, events }
}

test('new signal and live deployments are created then started exactly once with the confirmed settings', async () => {
  for (const mode of ['signal', 'live']) {
    const { vm, calls, notices, events } = editor()
    vm.model.executionMode = mode
    vm.model.disclaimer = mode === 'live'
    await vm.save()
    assert.deepEqual(calls.map(call => call[0]), ['create', 'start'])
    assert.equal(calls[0][1].executionMode, mode)
    assert.equal(calls[0][1].credentialId, mode === 'live' ? 9 : undefined)
    assert.equal(calls[0][1].initialCapital, 1000)
    assert.equal(calls[0][1].equityStopLossPct, 0.3)
    assert.equal(calls[0][1].leverage, 2)
    assert.deepEqual(calls[1], ['start', 123])
    assert.deepEqual(notices, [['info', 'strategyCenter.launch.createdStarting']])
    assert.deepEqual(events, [['saved', { id: 123, mode: 'create' }]])
    assert.equal(vm.saving, false)
  }
})

test('edit saves never start a stopped strategy', async () => {
  const { vm, calls, notices, events } = editor()
  vm.isEdit = true
  vm.strategyId = 456
  await vm.save()
  assert.deepEqual(calls.map(call => call[0]), ['update'])
  assert.deepEqual(notices, [['success', 'trading-assistant.messages.updateSuccess']])
  assert.deepEqual(events, [['saved', { id: 456, mode: 'edit' }]])
})

test('live consent, account compatibility and risk validation remain mandatory', async () => {
  for (const invalidate of [
    vm => { vm.model.disclaimer = false },
    vm => { vm.model.credentialId = null },
    vm => { vm.compatibleCredentials = [] },
    vm => { vm.model.equityStopLossPct = 2 },
    vm => { vm.model.notifyChannels = [] }
  ]) {
    const { vm, calls, events } = editor()
    vm.model.executionMode = 'live'
    vm.model.disclaimer = true
    invalidate(vm)
    await vm.save()
    assert.deepEqual(calls, [])
    assert.deepEqual(events, [])
    assert.equal(vm.saving, false)
  }
})

test('double click is guarded even while asynchronous validation is pending', async () => {
  const { vm, calls } = editor()
  let complete
  vm.validateDeployment = () => new Promise(resolve => { complete = resolve })
  const saving = vm.save()
  await vm.save()
  assert.deepEqual(calls, [])
  complete(true)
  await saving
  assert.deepEqual(calls.map(call => call[0]), ['create', 'start'])
})

test('failed create or validation never reaches Start', async () => {
  for (const create of [
    async () => ({ code: 0, msg: 'strategyV2.invalidSource' }),
    async () => { throw new Error('NETWORK_ERROR') }
  ]) {
    const { vm, calls, events } = editor({ create })
    await vm.save()
    assert.deepEqual(calls, [])
    assert.deepEqual(events, [])
  }
})

test('start rejection or timeout retains the new strategy and never retries creation', async () => {
  for (const start of [
    async () => ({ code: 0, msg: 'strategyV2.strategyLimitExceeded' }),
    async () => { throw new Error('TIMEOUT') },
    async () => ({ code: 1, data: { status: 'stopped' } })
  ]) {
    const { vm, calls, notices, events } = editor({ start })
    await vm.save()
    assert.deepEqual(calls.map(call => call[0]), ['create'])
    assert.equal(notices[0][0], 'warning')
    assert.match(notices[0][1], /^strategyCenter.launch.createdStartUnconfirmed:/)
    assert.deepEqual(events, [['saved', { id: 123, mode: 'create' }]])
    assert.equal(vm.saving, false)
  }
})

test('confirmed running state receives success rather than the queued message', async () => {
  const { vm, notices } = editor({ start: async () => ({ code: 1, data: { status: 'running' } }) })
  await vm.save()
  assert.deepEqual(notices, [['success', 'strategyCenter.launch.createdStarted']])
})

test('create/start intent and all launch results are localized in every supported language', () => {
  assert.match(source, /strategyCenter\.launch\.createAndStart/)
  assert.equal(Object.keys(messages).length, 11)
  for (const locale of Object.values(messages)) {
    assert.deepEqual(Object.keys(locale), Object.keys(messages['en-US']))
    for (const value of Object.values(locale)) assert.ok(value)
    assert.match(locale['strategyCenter.launch.createdStartUnconfirmed'], /\{reason\}/)
  }
})
