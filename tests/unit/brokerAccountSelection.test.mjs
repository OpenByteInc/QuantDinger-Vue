import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function options (file, mocks = {}) {
  let script = fs.readFileSync(new URL('../../src/' + file, import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
  const scope = { ...mocks, console, setTimeout, clearTimeout }
  script = script.replace(/^import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]\s*$/gm, (_, names) => {
    for (const item of names.replace(/[{}]/g, '').split(',')) {
      const name = item.trim().split(/\s+as\s+/).pop()
      if (!(name in scope)) scope[name] = () => ({})
    }
    return ''
  })
  vm.runInNewContext(script.replace('export default', 'result ='), scope)
  return scope.result
}

function page (broker) {
  const component = options('views/broker-accounts/index.vue', { broker })
  const state = { ...component.data(), $set: (object, key, value) => { object[key] = value } }
  for (const [name, method] of Object.entries(component.methods)) state[name] = method.bind(state)
  state.isBrokerBlocked = () => false
  return state
}

test('account status requests carry the selected credential and ignore late responses', async () => {
  const calls = []
  let resolveFirst
  const state = page({ alpaca: {
    accounts: async () => ({ data: [{ id: 11 }, { id: 22 }] }),
    status: params => {
      calls.push(params.credential_id)
      if (params.credential_id === 11) return new Promise(resolve => { resolveFirst = resolve })
      return Promise.resolve({ data: { connected: true, account_id: 'account-B' } })
    }
  } })
  state.brokerCredentialIds.alpaca = 11
  const first = state.loadOne('alpaca')
  await new Promise(resolve => setImmediate(resolve))
  state.brokerCredentialIds.alpaca = 22
  await state.loadOne('alpaca')
  resolveFirst({ data: { connected: true, account_id: 'account-A' } })
  await first
  assert.deepEqual(calls, [11, 22])
  assert.equal(state.connectionMap.alpaca.accountId, 'account-B')
})

test('quick trade balance uses selected credential and discards stale account data', async () => {
  let finish
  const calls = []
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', { broker: { alpaca: {
    account: params => {
      calls.push(params.credential_id)
      return new Promise(resolve => { finish = resolve })
    }
  } } })
  const state = { selectedCredentialId: 11, isStockMarket: true, balance: { total: 0 }, apiPayload: res => res.data }
  const pending = component.methods.loadBalance.call(state)
  state.selectedCredentialId = 22
  finish({ data: { equity: 10000, buying_power: 20000 } })
  await pending
  assert.deepEqual(calls, [11])
  assert.equal(state.balance.total, 0)
})

test('account overview shows true zero and unknown counts separately', () => {
  const component = options('views/broker-accounts/components/BrokerAccountCard.vue')
  const metrics = info => component.computed.metrics.call({ info, brokerId: 'alpaca', $t: key => key })
  assert.equal(metrics({ position_count: 0 }).find(item => item.key === 'positions').value, '0')
  assert.equal(metrics({ position_count: null }).find(item => item.key === 'positions').value, '--')
  assert.equal(metrics({ recent_filled_order_count: 0 }).find(item => item.key === 'fills').value, '0')
})


test('credential submission clears the retained form but preserves the in-flight payload', () => {
  const component = options('views/broker-accounts/components/BrokerPanel.vue')
  const form = { name: 'Account', privateKey: 'private-marker', tradePassword: 'password-marker', appSecret: 'app-marker' }
  let sent
  const state = { $refs: { connectForm: { form } }, $emit: (event, payload) => { sent = payload } }
  state.clearConnectionSecrets = component.methods.clearConnectionSecrets.bind(state)
  component.methods.submitConnection.call(state, { ...form })
  assert.equal(form.privateKey, '')
  assert.equal(form.tradePassword, '')
  assert.equal(form.appSecret, '')
  assert.equal(form.name, 'Account')
  assert.equal(sent.privateKey, 'private-marker')
  form.privateKey = 'later-marker'
  component.deactivated.call(state)
  assert.equal(form.privateKey, '')
})
