import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import compiler from 'vue-template-compiler'
import messages from '../../src/locales/lang/strategy-review.js'

const source = readFileSync(new URL('../../src/views/strategy-center/components/StrategyReviewReport.vue', import.meta.url), 'utf8')
const parsed = compiler.parseComponent(source)
const script = parsed.script.content.replace(/import \{[^}]+\} from '@\/api\/strategy'/, '').replace('export default', 'module.exports =')

function instance(api = {}) {
  const context = { module: { exports: {} }, getStrategyReviewReport: api.generate || (async () => ({ code: 1, data: {} })), getStrategyReviewReportHistory: api.history || (async () => ({ code: 1, data: [] })), Blob, URL, setTimeout, document: {} }
  vm.runInNewContext(script, context)
  const component = context.module.exports
  const instance = { ...component.data(), strategyId: 1, $i18n: { locale: 'en-US' }, $t: (key, values = {}) => {
    const message = messages['en-US'][key] || key
    return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), message)
  }, $message: { error () {} }, $root: { $emit () {} } }
  for (const [key, fn] of Object.entries(component.methods)) instance[key] = fn.bind(instance)
  for (const [key, fn] of Object.entries(component.computed)) Object.defineProperty(instance, key, { get: () => fn.call(instance) })
  return { instance, component }
}

test('review template compiles and does not expose grid assumptions or live mutations', () => {
  assert.deepEqual(compiler.compile(parsed.template.content).errors, [])
  assert.doesNotMatch(source, /gridPairs|grid_matched_pairs|v-html|updateStrategy|startStrategy|createStrategy/)
  assert.match(source, /schema_version === 2/)
  assert.match(source, /legacyHint/)
  assert.doesNotMatch(source, /downloadPlan|createObjectURL|experiment-plan|validation_plan|strategyReviewV2\.notRun/)
  assert.match(source, /strategyReviewV2\.reportConclusion/)
  assert.match(source, /strategyReviewV2\.optimizationDirections/)
})

test('Chinese and English review messages have identical keys', () => {
  assert.deepEqual(Object.keys(messages['en-US']).sort(), Object.keys(messages['zh-CN']).sort())
  for (const locale of Object.values(messages)) for (const value of Object.values(locale)) assert.ok(value && !value.includes('\uFFFD'))
})

test('unknown numbers are not rendered as zero and profit factor handles no losses', () => {
  const { instance: view } = instance()
  assert.equal(view.formatNumber(null), messages['en-US']['strategyReviewV2.notAvailable'])
  assert.equal(view.formatNumber(undefined), messages['en-US']['strategyReviewV2.notAvailable'])
  assert.equal(view.formatNumber(Infinity), messages['en-US']['strategyReviewV2.notAvailable'])
  view.report = { evidence: { facts: { profit_factor: null, profit_factor_state: 'no_losses' } } }
  assert.equal(view.profitFactorText, messages['en-US']['strategyReviewV2.noLosses'])
})

test('stale requests cannot replace another strategy report', async () => {
  let resolve
  const { instance: view, component } = instance({ generate: () => new Promise(done => { resolve = done }) })
  const pending = view.loadReport()
  view.strategyId = 2
  component.watch.strategyId.call(view)
  resolve({ code: 1, data: { strategy: { id: 1 }, ai: {} } })
  await pending
  assert.equal(view.report, null)
  assert.equal(view.loading, false)
})

test('AI fallback reports remain readable and history is not regenerated', async () => {
  let generations = 0
  const report = { schema_version: 2, evidence: { facts: {} }, ai: { status: 'fallback' }, lookback_days: 7 }
  const { instance: view } = instance({ generate: () => { generations++; throw new Error('unexpected') }, history: async () => ({ code: 1, data: report }) })
  await view.selectHistory(12)
  assert.equal(generations, 0)
  assert.equal(view.aiStatus, 'fallback')
  assert.equal(view.lookbackDays, 7)
})

test('successful AI review replaces the rule summary and renders grounded advice', () => {
  const { instance: view } = instance()
  view.report = {
    schema_version: 2,
    evidence: { facts: { window_net_pnl: -10, before_commission_pnl: -6, closed_fill_count: 3 } },
    ai: {
      status: 'ok',
      summary: 'AI-specific conclusion',
      issues: [{
        code: 'cost_check',
        interpretation: 'Costs are material but not the only cause.',
        proposed_change: 'Preserve the signal and retest with recorded costs.',
        tradeoff: 'Do not assume maker fills.'
      }]
    }
  }
  assert.equal(view.aiStatus, 'ready')
  assert.equal(view.reportSummary, 'AI-specific conclusion')
  assert.equal(view.optimizationDirections.length, 1)
  assert.equal(view.optimizationDirections[0].ai, true)
  assert.equal(view.optimizationDirections[0].proposedChange, 'Preserve the signal and retest with recorded costs.')
})

test('invalid AI payload is visibly downgraded and keeps evidence-based directions', () => {
  const { instance: view } = instance()
  view.report = { schema_version: 2, evidence: { facts: {} }, ai: { status: 'ok', summary: 'Incomplete response', issues: [] } }
  assert.equal(view.aiStatus, 'fallback')
  assert.equal(view.hasAiAdvice, false)
  assert.equal(view.optimizationDirections.length, 3)
  assert.ok(view.optimizationDirections.every(item => item.ai === false))
})

test('quote currency does not leak instrument product suffix', () => {
  const { instance: view } = instance()
  view.report = { strategy: { symbol: 'Crypto:BTC/USDT@swap' } }
  assert.equal(view.quoteCurrency, 'USDT')
})

test('setting checks supersede old investigations without breaking saved reports', () => {
  const { instance: view } = instance()
  const old = [{ code: 'negative_edge' }]
  view.report = { evidence: { issues: old } }
  assert.equal(view.issues, old)
  const checks = [{ code: 'risk_check', status: 'insufficient' }]
  view.report.evidence.checks = checks
  assert.equal(view.issues, checks)
})

test('setting diagnostics have labels and never format missing leverage as zero', () => {
  const { instance: view } = instance()
  view.report = { evidence: { facts: { configured_leverage: null, worst_close_initial_pct: 1.5 } } }
  assert.equal(view.factValue('configured_leverage'), messages['en-US']['strategyReviewV2.notAvailable'])
  assert.equal(view.factValue('worst_close_initial_pct'), '1.50%')
  assert.equal(view.factLabel('stop_loss_fills'), messages['en-US']['strategyReviewV2.fact.stop_loss_fills'])
  for (const key of ['cost_check', 'frequency_check', 'exits_check', 'risk_check']) {
    assert.ok(messages['zh-CN']['strategyReviewV2.issue.' + key + '.title'])
    assert.ok(messages['en-US']['strategyReviewV2.validation.' + key])
  }
})

test('review renders a compact embedded report without report-body actions', () => {
  const { instance: view } = instance()
  assert.match(source, /class="overview-metrics"/)
  assert.match(source, /class="report-grid"/)
  assert.match(source, /class="optimization-report report-panel"/)
  assert.doesNotMatch(source, /class="investigation-summary"|class="diagnosis-grid"|downloadPlan/)
  view.report = { schema_version: 2, evidence: { facts: { before_commission_pnl: -6, commission: 4, window_net_pnl: -10, closed_fill_count: 3, exit_reason_coverage_pct: 0 }, checks: [] } }
  assert.equal(view.costChart.code, 'cost')
  assert.equal(view.supportCharts.length, 0)
  assert.equal(view.diagnosticRows.length, 4)
  assert.equal(view.optimizationDirections.length, 3)
})

test('coverage distinguishes supplied evidence from actual gaps', () => {
  const { instance: view } = instance()
  view.report = { schema_version: 2, evidence: { facts: {}, coverage: {
    trade_rows_included: 58,
    trade_rows_total: 58,
    exit_reason_rows: 0,
    closed_rows_total: 58,
    log_rows_included: 20,
    log_rows_total: 20,
    current_position_rows: 1,
    source_available: true,
    gaps: ['exit_reason', 'historical_positions']
  } } }
  assert.equal(view.coverageRows.length, 5)
  assert.equal(view.coverageRows[0].value, '58 / 58')
  assert.equal(view.coverageRows[1].value, '0 / 58')
  assert.deepEqual(Array.from(view.coverageGaps), ['exit_reason', 'historical_positions'])

  view.report = { schema_version: 2, evidence: { facts: {}, coverage: { gaps: [] } } }
  assert.equal(view.coverageRows.length, 0)
})

test('charts preserve signed values, share a zero baseline and do not use selected trade samples', () => {
  const { instance: view } = instance()
  view.report = { evidence: { facts: { before_commission_pnl: 2, commission: 5, window_net_pnl: -3 },
    exit_groups: [{ code: 'stop_loss', count: 10, pnl_count: 10, net_pnl: -9 }, { code: 'take_profit', count: 2, pnl_count: 2, net_pnl: 6 }],
    trade_samples: [{ profit: 100000 }] } }
  const [cost, exits] = view.charts
  assert.equal(cost.min, -5)
  assert.equal(cost.max, 2)
  assert.equal(cost.rows[1].value, -5)
  assert.equal(exits.min, -9)
  assert.equal(exits.max, 6)
  assert.equal(view.chartX(exits, -9), 0)
  assert.equal(view.chartX(exits, 0), 600)
  assert.equal(view.chartX(exits, 6), 1000)
})

test('unknown values, empty cohorts and unreconciled amounts are not charted as zero', () => {
  const { instance: view } = instance()
  view.report = { evidence: { facts: {}, holding_groups: [{ code: 'under_5m', count: 1, pnl_count: 0, net_pnl: null }] } }
  assert.equal(view.charts.length, 0)
  view.report.evidence.holding_groups[0].net_pnl = 0
  assert.equal(view.charts.length, 1)
  assert.equal(view.chartX(view.charts[0], 0), 500)
  view.report.evidence.coverage = { cost_usable: false }
  assert.equal(view.charts.length, 0)
})
