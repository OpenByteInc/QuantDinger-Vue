import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync(new URL('../../src/views/settings/BillingPlanSheet.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
const component = vm.runInNewContext(script.replace('export default', 'result ='), { result: null })
const settings = readFileSync(new URL('../../src/views/settings/index.vue', import.meta.url), 'utf8')

test('sheet preserves all numerical constraints and boolean plan fields', () => {
  const { numberFields, flagFields } = component.data()
  assert.deepEqual(JSON.parse(JSON.stringify(numberFields.map(({ key, min, precision }) => ({ key, min, precision })))), [
    { key: 'price_usd', min: 0, precision: 2 },
    { key: 'duration_days', min: 0 },
    { key: 'credits_once', min: 0 },
    { key: 'credits_monthly', min: 0 },
    { key: 'strategy_limit', min: 1 }
  ])
  assert.equal(flagFields.map(field => field.key).join(','), 'is_active,is_lifetime,is_popular,referral_eligible')
  assert.match(source, /:disabled="!!plan.persisted"/)
  assert.match(source, /field.key === 'duration_days' && plan.is_lifetime/)
})

test('cell editing only emits a draft change and does not mutate or save plans', () => {
  const plan = Object.freeze({ code: 'monthly', price_usd: 19.9 })
  const calls = []
  component.methods.change.call({ $emit: (...args) => calls.push(args) }, plan, 'price_usd', 29.9)
  assert.deepEqual(calls, [['change', plan, 'price_usd', 29.9]])
  assert.equal(plan.price_usd, 19.9)
  assert.doesNotMatch(script, /fetch\(|axios|saveAdminMembershipPlans/)
  assert.match(settings, /@change="updateBillingPlanField"/)
  assert.match(settings, /this\.\$set\(plan, field, value\)/)
  assert.match(settings, /@click="saveBillingPlanCatalog"/)
  assert.match(settings, /deleteAdminMembershipPlan\(plan.code\)/)
})

test('new plan focus brings the code cell back into the visible scroll region', () => {
  let focused = false
  const scroll = { scrollTop: 160, scrollLeft: 800 }
  component.methods.focusCode.call({
    $refs: { 'code-new': [{ focus: () => { focused = true } }] },
    $el: { querySelector: () => scroll }
  }, 'new')
  assert.equal(focused, true)
  assert.deepEqual(scroll, { scrollTop: 0, scrollLeft: 0 })
  assert.match(settings, /billingPlanSheet.focusCode\(draft._key\)/)
})

test('sheet keeps semantic headers, labelled controls and an empty-state add action', () => {
  assert.match(source, /<table/)
  assert.match(source, /scope="col"/)
  assert.match(source, /role="region"/)
  assert.match(source, /:aria-label="fieldLabel/)
  assert.match(source, /v-if="!plans.length"/)
  assert.match(source, /\$emit\('add'\)/)
  assert.match(source, /\$emit\('remove', index\)/)
  assert.match(source, /\.billing-sheet-scroll\s*\{\s*position: relative;/)
  assert.match(source, /\.visually-hidden\s*\{ position: absolute; top: 0; left: 0;/)
  assert.equal(component.methods.fieldLabel.call({ $t: key => key }, { code: 'monthly' }, 'price'), 'price · monthly')
})
