import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

function deferred () {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

function store (getBrandConfig) {
  const script = readFileSync(new URL('../../src/store/modules/brand.js', import.meta.url), 'utf8')
    .replace(/^import .*$/m, '')
    .replace('export default brand', 'result = brand')
    .replace('export { DEFAULT_BRAND }', '')
  const persisted = []
  const scope = { getBrandConfig, console, window: { localStorage: {
    getItem: () => JSON.stringify({ app_name: 'Cached', advertisements: [] }),
    setItem: (_, value) => persisted.push(JSON.parse(value))
  } } }
  runInNewContext(script, scope)
  const module = scope.result
  const context = { state: module.state, commit: (name, data) => module.mutations[name](module.state, data) }
  return { state: module.state, persisted, load: opts => module.actions.LoadBrandConfig(context, opts) }
}

test('saving during initial loading fetches fresh config and discards the older response', async () => {
  const initial = deferred()
  const forced = deferred()
  let calls = 0
  const vm = store(() => ++calls === 1 ? initial.promise : forced.promise)
  const first = vm.load()
  const second = vm.load({ force: true })
  assert.equal(calls, 2)
  forced.resolve({ code: 1, data: { advertisements: [{ id: 'new' }] } })
  await second
  initial.resolve({ code: 1, data: { advertisements: [] } })
  await first
  assert.equal(vm.state.config.advertisements[0].id, 'new')
  assert.equal(vm.persisted.length, 1)
  assert.equal(vm.state.loading, false)
})

test('an old request finishing cannot clear the current request loading state', async () => {
  const initial = deferred()
  const forced = deferred()
  let calls = 0
  const vm = store(() => ++calls === 1 ? initial.promise : forced.promise)
  const first = vm.load()
  const second = vm.load({ force: true })
  initial.resolve({ code: 1, data: { advertisements: [] } })
  await first
  assert.equal(vm.state.loading, true)
  assert.equal(vm.persisted.length, 0)
  forced.resolve({ code: 1, data: { advertisements: [{ id: 'new' }] } })
  await second
  assert.equal(vm.state.loading, false)
  await vm.load()
  assert.equal(calls, 2)
})

test('browser startup revalidates cached empty ads and explicit removal replaces them', async () => {
  let calls = 0
  const vm = store(async () => ({ code: 1, data: { advertisements: ++calls === 1 ? [{ id: 'new' }] : [] } }))
  await vm.load()
  assert.equal(vm.state.config.advertisements.length, 1)
  await vm.load({ force: true })
  assert.equal(vm.state.config.advertisements.length, 0)
})
