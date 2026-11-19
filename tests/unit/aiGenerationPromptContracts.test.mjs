import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const read = relativePath => fs.readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  'utf8'
)

const strategyIde = read('../../src/views/strategy-ide/index.vue')
const copilot = read('../../src/views/ai-analysis/components/CopilotWorkbench.vue')
const overrides = read('../../src/locales/copilot-overrides.js')

test('indicator conversion prompt protects direction, edge, execution, and risk semantics', () => {
  assert.match(strategyIde, /classify every marker as long entry, long exit, short entry, short exit/)
  assert.match(strategyIde, /For edge\(A \| B\), compare the complete previous composite/)
  assert.match(strategyIde, /The strategy source owns its universe, markets, subscriptions, frequency/)
  assert.match(strategyIde, /market orders from handle_data become eligible at the next available bar open/)
  assert.match(strategyIde, /attach native Protection V2 using stop_loss_pct/)
  assert.match(strategyIde, /stop_loss_pct or stop_loss_price/)
  assert.match(strategyIde, /trailing_stop_pct or trailing_stop_points/)
  assert.match(strategyIde, /Use exit_fraction for a shared partial-exit ratio/)
  assert.match(strategyIde, /take_profit_exit_fraction/)
})

test('copilot builds workflow-specific artifact rules instead of mixing indicator and strategy rules', () => {
  assert.match(copilot, /const artifactRules = isIndicatorWorkflow/)
  assert.match(copilot, /\.\.\.artifactRules/)
  assert.match(copilot, /Choose one conservative source-owned default and encode exactly one context\.subscribe/)
  assert.match(copilot, /Array\.isArray\(entities\.timeframes\)/)
  assert.match(copilot, /Preserve every one with a separate context\.subscribe/)
  assert.match(copilot, /the fastest timeframe drives execution and higher-timeframe reads use completed bars only/)
  assert.match(copilot, /only timeframe unless the original request explicitly names additional confirmation timeframes/)
  assert.match(copilot, /Do not invent multi-timeframe confirmation/)
  assert.doesNotMatch(copilot, /Timeframe remains owned by the run panel/)
  assert.match(copilot, /The strategy source owns its canonical instrument/)
  assert.match(copilot, /never use get_current_data, quantity\/cost_basis, or context\.run_daily/)
  assert.match(copilot, /Never read context\.params in initialize\(context\)/)
  assert.match(copilot, /Crypto:\$\{symbol\}@\$\{exchangeId/)
  assert.match(copilot, /exchange_id: entities\.exchange_id \|\| \(fallbackTarget && fallbackTarget\.exchange_id\)/)
  assert.match(copilot, /market_type: entities\.market_type \|\| \(fallbackTarget && fallbackTarget\.market_type\)/)
  assert.doesNotMatch(copilot, /item\.market \|\| item\.market_type \|\| item\.category/)
})

test('English prompt overrides identify the indicator workflow as chart-only', () => {
  assert.match(
    overrides,
    /"aiAssetAnalysis\.copilot\.nativeStrategyPrompt\.workflowIndicator": "QuantDinger Chart Indicator"/
  )
  assert.doesNotMatch(
    overrides,
    /"aiAssetAnalysis\.copilot\.nativeStrategyPrompt\.workflowIndicator": "QuantDinger Python Strategy API V2"/
  )
})
