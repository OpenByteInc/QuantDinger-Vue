import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import messages from '../../src/locales/lang/factor-library-custom.js'

const source = fs.readFileSync(new URL('../../src/views/strategy-ide/FactorLibraryModal.vue', import.meta.url), 'utf8')
const backendContract = fs.readFileSync(new URL('../../../quantdinger_backend/backend_api_python/app/services/custom_factors.py', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'component =')
const sandbox = {}
vm.runInNewContext(script, sandbox)
const component = sandbox.component

test('validation errors show localized contract guidance instead of backend keys', () => {
  const state = { $te: key => Boolean(messages['zh-CN'][key]), $t: key => messages['zh-CN'][key] }
  assert.equal(component.methods.customFactorErrorMessage.call(state, new Error('factor.customArgumentCount'), 'factorLibrary.custom.validationFailed'), messages['zh-CN']['factor.customArgumentCount'])
  assert.equal(component.methods.customFactorErrorMessage.call(state, new Error('factor.untranslated'), 'factorLibrary.custom.validationFailed'), messages['zh-CN']['factorLibrary.custom.validationFailed'])
})

test('contract remains complete in a dedicated rules tab without displacing the editor', () => {
  for (const key of ['contractMetadata', 'contractInput', 'contractSyntax', 'contractParams', 'contractOutput', 'contractLimits', 'contractValidation', 'contractUsage']) {
    assert.ok(messages['en-US'][`factorLibrary.custom.${key}`])
    assert.ok(messages['zh-CN'][`factorLibrary.custom.${key}`])
    assert.ok(source.includes(`factorLibrary.custom.${key}`))
  }
  assert.equal(component.computed.customRules().length, 8)
  assert.match(source, /customTab: 'editor'/)
  assert.match(source, /<a-tab-pane key="rules"/)
  assert.match(source, /<a-tab-pane key="examples"/)
  assert.match(source, /slot="footer" class="custom-factor-footer"/)
  assert.doesNotMatch(source, /<details[^>]+ open>/)
})

test('written rules cover the backend expression contract', () => {
  const rules = [messages['en-US'], messages['zh-CN']]
    .flatMap(locale => Object.entries(locale)
      .filter(([key]) => key.startsWith('factorLibrary.custom.contract'))
      .map(([, value]) => value))
    .join('\n')
  for (const token of ['open', 'high', 'low', 'close', 'volume', 'amount', 'market_cap', 'log1p', 'clip', 'factor(', '2000', '120', 'custom:<id>', '120 characters']) {
    assert.ok(rules.includes(token), token)
  }
  for (const token of ['_RAW_FIELDS', '_SAFE_FUNCTIONS', '_SAFE_BINARY', '_SAFE_COMPARE', 'factor.customNestedDependencyUnsupported']) {
    assert.ok(backendContract.includes(token), token)
  }
})

test('data readiness is distinct from runtime compatibility', () => {
  assert.match(source, /factorLibrary.scope.compatible/)
  assert.match(source, /factorLibrary.runtimeOnlyNotice/)
  const required = component.computed.extraDataFields.call({ selectedFactor: { required_fields: ['close', 'vwap', 'periods'] } })
  assert.deepEqual(Array.from(required), ['vwap', 'periods'])
})

test('examples apply both formula and defaults and invalidate old validation', () => {
  const examples = component.computed.customExamples()
  assert.equal(examples.length, 3)
  for (const example of examples) {
    const state = { customForm: {}, customValidation: { warmupBars: 1 } }
    component.methods.useCustomExample.call(state, example)
    assert.equal(state.customForm.expression, example.expression)
    assert.equal(state.customValidation, null)
    assert.equal(state.customTab, 'editor')
    assert.doesNotThrow(() => JSON.parse(state.customForm.paramsJson))
  }
  const state = { customValidation: {} }
  component.watch.customForm.handler.call(state)
  assert.equal(state.customValidation, null)
})

test('validation response is ignored if the user changed the form while waiting', async () => {
  let resolveRequest
  sandbox.validateCustomFactor = () => new Promise(resolve => { resolveRequest = resolve })
  const state = {
    payload: { expression: 'close' },
    customFactorPayload () { return this.payload },
    $t: key => key,
    $message: { success () { assert.fail('Stale response must not be shown as success') }, error () {} }
  }
  const pending = component.methods.validateCustomFactorForm.call(state)
  state.payload = { expression: 'high' }
  resolveRequest({ code: 1, data: { warmupBars: 1 } })
  assert.equal(await pending, false)
  assert.equal(state.customValidation, undefined)
  assert.equal(state.customValidating, false)
})
