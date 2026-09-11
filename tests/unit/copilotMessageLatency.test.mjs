import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const compiler = require('vue/compiler-sfc')
const source = fs.readFileSync(new URL('../../src/views/ai-analysis/components/CopilotWorkbench.vue', import.meta.url), 'utf8')
const descriptor = compiler.parse({ source })
const ast = compiler.compileScript(descriptor, { id: 'copilot-latency' }).scriptAst
const declaration = ast.find(node => node.type === 'ExportDefaultDeclaration').declaration
const methods = declaration.properties.find(node => node.key.name === 'methods').value.properties

function loadMethods (names, dependencies = {}) {
  const code = methods.filter(node => names.includes(node.key.name)).map(node => descriptor.script.content.slice(node.start, node.end)).join(',')
  return new Function(...Object.keys(dependencies), `let localId = 0; return ({${code}})`)(...Object.values(dependencies))
}

function deferred () {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

function workspace (classify = async () => ({ data: { intent: 'market_analysis', should_execute: false } })) {
  const calls = { resolve: 0, classify: 0, preflight: 0, stream: [] }
  const vm = {
    ...loadMethods(['sendMessage', 'classifyAgentPlan', 'handleBackendAgentIntent'], {
      classifyAgentIntent: (...args) => { calls.classify++; return classify(...args) }
    }),
    canSend: true, draft: 'Analyze SPCX trend, momentum and liquidity.', attachments: [], messages: [], context: {},
    thinkingText: 'thinking', text: { chatUnavailable: 'unavailable' }, $i18n: { locale: 'en-US' },
    recordCopilotEvent () {}, $nextTick () {}, scrollToBottom () {},
    async handlePendingStrategyAgentMessage () { return false },
    async loadAgentPreflight () { calls.preflight++; this.agentPreflight = { blockers: [] } },
    async resolveMessageSymbol () { calls.resolve++; return { market: 'USStock', symbol: 'SPCX' } },
    buildChatContext (message, symbol) { return { ...symbol } },
    normalizeSymbolOption (value) { return value }, symbolOptionValue (value) { return value.symbol },
    isMonitorIntent () { return false },
    async sendMessageStream (message, attachments, reply, context) {
      calls.stream.push(context); reply.content = 'answer'; reply.isThinking = false
    },
    replacePendingAssistant (pending, value) { Object.assign(pending, value); return pending },
    async persistCopilotMessage () {},
    buildPreflightGuide () { return { content: 'configuration required', actions: [] } }
  }
  return { vm, calls }
}

test('thinking is visible while routing is pending and routing runs once per message', async () => {
  const gate = deferred()
  const { vm, calls } = workspace(() => gate.promise)
  const sending = vm.sendMessage()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(vm.messages.length, 2)
  assert.equal(vm.messages[1].isThinking, true)
  assert.equal(calls.preflight, 1)
  assert.equal(calls.classify, 1)
  const plan = { intent: 'market_analysis', should_execute: false }
  gate.resolve({ data: plan })
  await sending
  assert.equal(calls.resolve, 1)
  assert.equal(calls.stream[0].agent_intent, plan)
  assert.equal(calls.stream[0].symbol, 'SPCX')
  assert.equal(vm.sending, false)
})

test('a locked target is preserved without symbol search', async () => {
  const { vm, calls } = workspace()
  vm.draftContextLock = { market: 'USStock', symbol: 'SPCX' }
  await vm.sendMessage()
  assert.equal(calls.resolve, 0)
  assert.equal(calls.stream[0].locked, true)
  assert.equal(calls.stream[0].symbol, 'SPCX')
})

test('router failure keeps the resolved symbol without a second search', async () => {
  const { vm, calls } = workspace(async () => { throw new Error('routing unavailable') })
  await vm.sendMessage()
  assert.equal(calls.resolve, 1)
  assert.equal(calls.classify, 1)
  assert.equal(calls.stream[0].symbol, 'SPCX')
  assert.equal(calls.stream[0].agent_intent, undefined)
})

test('strategy workflows remove the chat placeholder and do not also submit chat', async () => {
  const { vm, calls } = workspace(async () => ({ data: { intent: 'strategy_build', should_execute: true } }))
  Object.assign(vm, {
    agentTargetFromPlan: () => ({ market: 'USStock', symbol: 'SPCX' }),
    strategyTargetTypeFromPlan: () => 'script', buildExecutableStrategyPrompt: () => 'create strategy',
    clearPendingAgentTask () { this.pendingAgentTask = null },
    async generateStrategyV2Draft () { this.messages.push({ role: 'assistant', content: 'strategy generated' }) }
  })
  await vm.sendMessage()
  assert.equal(calls.stream.length, 0)
  assert.equal(vm.messages.length, 2)
  assert.equal(vm.messages[1].content, 'strategy generated')
  assert.equal(vm.sending, false)
})

test('preflight blockers replace the pending reply and prevent model submission', async () => {
  const { vm, calls } = workspace()
  vm.loadAgentPreflight = async () => { vm.agentPreflight = { blockers: ['missing_provider'] } }
  await vm.sendMessage()
  assert.equal(calls.stream.length, 0)
  assert.equal(vm.messages.length, 2)
  assert.equal(vm.messages[1].content, 'configuration required')
  assert.equal(vm.messages[1].isThinking, false)
})

test('SSE completion does not wait for billing refresh', async () => {
  const billing = deferred()
  let billingRefreshes = 0
  const data = new TextEncoder().encode('event: accepted\ndata: {}\n\nevent: delta\ndata: {"text":"answer"}\n\nevent: done\ndata: {}\n\n')
  const vm = {
    ...loadMethods(['sendMessageStream'], {
      window: { fetch: true, ReadableStream: true }, ACCESS_TOKEN: 'token',
      fetch: async () => ({ ok: true, body: { getReader: () => ({ read: async () => ({ value: data, done: false }), cancel: async () => {} }) } })
    }),
    $i18n: { locale: 'en-US' }, getAccessToken: () => '', buildChatContext: () => ({}),
    scrollToBottom () {}, loadSessions () {},
    loadBilling () { billingRefreshes++; return billing.promise },
    handleStreamEvent (raw, reply) {
      const event = raw.split('\n')[0].slice(7)
      if (event === 'delta') { reply.content = 'answer'; reply.isThinking = false }
      return event
    }
  }
  const finished = vm.sendMessageStream('question', [], { isThinking: true }).then(() => true)
  const completion = await Promise.race([finished, new Promise(resolve => setTimeout(() => resolve(false), 100))])
  billing.resolve()
  await finished
  assert.equal(completion, true)
  assert.equal(billingRefreshes, 1)
})
