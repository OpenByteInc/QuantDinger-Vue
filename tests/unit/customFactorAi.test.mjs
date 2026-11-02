import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import messages from '../../src/locales/lang/factor-library-custom.js'

const source = fs.readFileSync(new URL('../../src/views/strategy-ide/FactorLibraryModal.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'component =')
const sandbox = {}
vm.runInNewContext(script, sandbox)
const component = sandbox.component
const methods = component.methods

function state () {
  const state = { ...component.data(), $i18n: { locale: 'zh-TW' }, $t: key => key, $te: () => true, $message: { success () {} }, $root: { $emit () {} } }
  for (const [key, method] of Object.entries(methods)) state[key] = method.bind(state)
  return state
}

test('all supported locales cover the full custom-factor contract, UI and AI errors', () => {
  const locales = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'de-DE', 'fr-FR', 'ru-RU', 'ar-SA', 'th-TH', 'vi-VN']
  const keys = Object.keys(messages['en-US']).sort()
  for (const locale of locales) {
    assert.deepEqual(Object.keys(messages[locale]).sort(), keys, locale)
    for (const key of keys) {
      assert.ok(messages[locale][key].trim(), `${locale}: ${key}`)
      const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
      assert.deepEqual(placeholders(messages[locale][key]), placeholders(messages['en-US'][key]), `${locale}: ${key}`)
      if (!['en-US', 'zh-CN'].includes(locale) && key !== 'factorLibrary.custom.expressionPlaceholder') {
        assert.notEqual(messages[locale][key], messages['en-US'][key], `${locale}: untranslated ${key}`)
      }
    }
  }
  assert.notEqual(messages['zh-TW']['factorLibrary.custom.contractInput'], messages['zh-CN']['factorLibrary.custom.contractInput'])
})

test('pricing is the backend strategy code-generation price, not a fixed UI fee', async () => {
  const page = state()
  sandbox.getMembershipPlans = async () => ({ data: { billing: { billing_enabled: true, feature_costs: { ai_code_gen: 37 } } } })
  await page.loadCustomAiPricing()
  assert.equal(page.customAiCost, 37)
  sandbox.getMembershipPlans = async () => ({ data: { billing: { billing_enabled: false, feature_costs: { ai_code_gen: 37 } } } })
  await page.loadCustomAiPricing()
  assert.equal(page.customAiCost, 0)
  sandbox.getMembershipPlans = async () => { throw new Error('unavailable') }
  await page.loadCustomAiPricing()
  assert.equal(page.customAiCost, null)
})

test('duplicate generation clicks call API once and do not overwrite the editor', async () => {
  let resolveRequest
  let calls = 0
  let balance
  sandbox.generateCustomFactor = payload => {
    calls++
    assert.equal(payload.locale, 'zh-TW')
    return new Promise(resolve => { resolveRequest = resolve })
  }
  const page = state()
  page.customAiPrompt = 'idea'
  page.customAiCost = 30
  page.$root.$emit = (event, value) => { assert.equal(event, 'credits-updated'); balance = value }
  const before = JSON.stringify(page.customForm)
  const pending = page.generateCustomAiFactor()
  await page.generateCustomAiFactor()
  assert.equal(calls, 1)
  resolveRequest({ code: 1, data: { candidate: { name: 'candidate' }, billing: { remaining_credits: 455 } } })
  await pending
  assert.equal(balance, 455)
  assert.equal(page.customAiGenerating, false)
  assert.equal(page.customAiCandidate.name, 'candidate')
  assert.equal(JSON.stringify(page.customForm), before)
})

test('failed generation refreshes balance and preserves manual input', async () => {
  sandbox.generateCustomFactor = async () => {
    throw Object.assign(new Error('factor.aiInvalid'), { response: { data: { data: { billing: { remaining_credits: 425 } } } } })
  }
  const page = state()
  page.customAiPrompt = 'idea'
  page.customAiCost = 30
  let balance
  page.$root.$emit = (_, value) => { balance = value }
  const before = JSON.stringify(page.customForm)
  await page.generateCustomAiFactor()
  assert.equal(balance, 425)
  assert.equal(page.customAiError, 'factor.aiInvalid')
  assert.equal(page.customAiCandidate, null)
  assert.equal(JSON.stringify(page.customForm), before)
})

test('applying a draft is explicit and leaves saving and validation to existing flows', () => {
  const page = state()
  page.customValidation = { old: true }
  page.customAiCandidate = { name: 'Momentum', description: 'Idea', category: 'momentum', directionHint: 'neutral', expression: 'momentum(period=lookback)', defaultParams: { lookback: 20 } }
  page.applyCustomAiCandidate()
  assert.equal(page.customForm.name, 'Momentum')
  assert.equal(JSON.parse(page.customForm.paramsJson).lookback, 20)
  assert.equal(page.customValidation, null)
  assert.equal(page.customTab, 'editor')
  assert.equal(page.customSaving, false)
  assert.match(source, /:closable="!customAiGenerating"/)
  assert.match(source, /:disabled="customAiGenerating" @click="saveCustomFactor"/)
})

test('an empty request or unavailable pricing never starts a paid call', async () => {
  sandbox.generateCustomFactor = () => assert.fail('must not call API')
  const page = state()
  await page.generateCustomAiFactor()
  page.customAiPrompt = 'idea'
  await page.generateCustomAiFactor()
  assert.equal(page.customAiGenerating, false)
})

test('AI and the editor share one pane with concise pricing and no promotional introduction', () => {
  const editor = source.match(/<a-tab-pane key="editor"[\s\S]*?<\/a-tab-pane>/)[0]
  assert.match(editor, /v-model="customForm.expression"/)
  assert.match(editor, /v-model="customAiPrompt"/)
  assert.match(editor, /@click="applyCustomAiCandidate"/)
  assert.match(editor, /<a-tooltip :title="\$t\('factorLibrary.custom.ai.billingHint'\)"/)
  assert.doesNotMatch(source, /<a-tab-pane key="ai"/)
  assert.doesNotMatch(source, /class="custom-factor-intro"/)
  assert.doesNotMatch(editor, /customAiCandidate.explanation|factorLibrary.custom.ai.hint|factorLibrary.custom.ai.review/)
  assert.ok(editor.indexOf('class="custom-factor-form"') < editor.indexOf('class="custom-factor-ai"'))
})
