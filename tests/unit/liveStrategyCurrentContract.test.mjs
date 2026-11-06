import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import strategyLiveRiskLocales from '../../src/locales/lang/strategy-live-risk.js'
import strategyV2Locales from '../../src/locales/lang/strategy-v2.js'

const editorPath = fileURLToPath(
  new URL('../../src/views/strategy-center/components/LiveStrategyEditor.vue', import.meta.url)
)
const source = fs.readFileSync(editorPath, 'utf8')
const operationsPath = fileURLToPath(
  new URL('../../src/views/strategy-center/components/LiveOperationsTable.vue', import.meta.url)
)
const operationsSource = fs.readFileSync(operationsPath, 'utf8')

const secondaryLocales = ['ar-SA', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', 'th-TH', 'vi-VN']

test('live strategy creation validates with the current compiler', () => {
  assert.match(source, /compileScriptSource/)
  assert.match(source, /compiledManifest/)
  assert.match(source, /hasCurrentContract/)
  assert.doesNotMatch(source, /strategyManifest\.apiVersion/)
  assert.doesNotMatch(source, /Number\(config\.api_version/)
})

test('live strategy direction is contract-driven with a legacy fallback', () => {
  assert.match(source, /manifestDirectionMode/)
  assert.match(source, /requiresDirectionFallback/)
  assert.match(source, /model\.executionMode === 'live' && requiresDirectionFallback/)
  assert.match(source, /directionMode: this\.requiresDirectionMode \? this\.effectiveDirectionMode/)
  assert.doesNotMatch(source, /v-model="model\.positionSide"/)
  assert.doesNotMatch(source, /directionModeDetectedHint/)
  assert.match(source, /value="one_way"/)
  assert.match(source, /new Set\(\['long_only', 'short_only', 'one_way', 'both', 'neutral'\]\)/)
})

test('live eligibility follows the manifest market instead of the strategy shape', () => {
  assert.match(source, /supportsLiveExecutionMode\(this\.strategyManifest\)/)
  assert.match(source, /credentialMatchesLiveStrategy\(this\.strategyManifest, credential\.exchange_id\)/)
  assert.doesNotMatch(source, /if \(this\.isPortfolioStrategy\) return exchange === 'alpaca'/)
})

test('source changes clear an incompatible saved credential before submission', () => {
  assert.match(source, /this\.compatibleCredentials\.some\(item => String\(item\.id\) === String\(this\.model\.credentialId\)\)/)
  assert.match(source, /this\.model\.credentialId = undefined/)
})

test('live capital exposes the source quote currency', () => {
  assert.match(source, /capitalCurrency \(\)/)
  assert.match(source, /strategyV2\.capitalCurrencyHint/)
  assert.match(source, /normalizedSymbol\.split\('\/'\)\.pop\(\)/)
  assert.match(source, /USStock: 'USD'/)
  assert.match(source, /HKStock: 'HKD'/)
  assert.match(source, /CNStock: 'CNY'/)
  assert.match(source, /AStock: 'CNY'/)
  assert.match(source, /paperCapitalCurrencyHint/)
  assert.match(source, /paperInitialMargin/)
  assert.match(source, /strategyCenter\.editor\.marginNotionalCapacity/)
  assert.doesNotMatch(source, /trading-assistant\.form\.marginNotionalCapacity/)
})

test('deployment setup edits only source-declared runtime fields and saves them back to source', () => {
  assert.match(source, /strategyV2\.deploymentContractTitle/)
  assert.match(source, /manifestInstruments \(\)/)
  assert.match(source, /manifestProductLabel \(\)/)
  assert.match(source, /manifestExchangeLabel \(\)/)
  assert.match(source, /item\.exchange_id/)
  assert.match(source, /extractStrategyRuntimeContractFromCode/)
  assert.match(source, /applyStrategyRuntimeConfigToCode/)
  assert.match(source, /sanitizeRuntimeConfigForSource/)
  assert.match(source, /updateScriptSource/)
  assert.match(source, /getWatchlist/)
  assert.match(source, /groupWatchlistAssets/)
  assert.doesNotMatch(source, /searchAssets/)
  assert.match(source, /asset_id: selected\.asset_id/)
  assert.doesNotMatch(source, /sourceRuntimeContract\.hasExchange && runtimeDraft\.market_category/)
  assert.match(source, /runtimeDirty/)
  assert.match(source, /await this\.applySourceRuntimeConfig/)
  assert.doesNotMatch(source, /v-model="model\.(symbol|marketType|exchangeId|timeframe)"/)
})

test('deployment symbol picker shares the logical watchlist and add flow', () => {
  assert.match(source, /option-label-prop="label"/)
  assert.match(source, /:filter-option="filterRuntimeSymbolOption"/)
  assert.match(source, /watchlist-select-dropdown/)
  assert.match(source, /value="__add__"/)
  assert.match(source, /<add-watchlist-modal/)
  assert.match(source, /@added="handleRuntimeWatchlistAdded"/)
  assert.match(source, /loadEnabledMarketOptions/)
  assert.doesNotMatch(source, /searchRuntimeSymbols|loadRuntimeSymbols|runtimeSymbolSearchTimer/)
})

test('deployment parameters stay instance-specific unless explicitly applied to source', () => {
  assert.match(source, /params: \{ \.\.\.this\.model\.templateParams \}/)
  assert.match(source, /sourceParametersDirty \(\)/)
  assert.match(source, /applySourceDefinitionChanges \(\)/)
  assert.match(source, /buildScriptCodeWithParamValues/)
  assert.match(source, /strategyCenter\.editor\.deploymentParametersHint/)
  assert.match(source, /strategyCenter\.editor\.applySourceChanges/)
  assert.match(source, /template_params: \{ \.\.\.templateParams \}/)
  assert.match(source, /script_template_params: \{ \.\.\.templateParams \}/)
  assert.doesNotMatch(source, /@click="applyTemplateParamsToSource"/)
  assert.doesNotMatch(source, /class="strategy-runtime-editor__footer"/)
})

test('deployment setup exposes account creation and removes the advanced-settings fold', () => {
  assert.match(source, /strategyCenter\.editor\.addAccount/)
  assert.match(source, /@click\.stop="openBrokerAccounts"/)
  assert.match(source, /class="deployment-options"/)
  assert.doesNotMatch(source, /deploy-collapse--advanced/)
  assert.match(source, /strategyCenter\.editor\.signalExecutionModeDesc/)
})

test('deployment editor additions are localized in every supported language', () => {
  const editorKeys = [
    'strategyCenter.editor.sourceChangesHint',
    'strategyCenter.editor.applySourceChanges',
    'strategyCenter.editor.addAccount',
    'strategyCenter.editor.paperInitialMargin',
    'strategyCenter.editor.marginNotionalCapacity',
    'strategyCenter.editor.signalExecutionModeDesc'
  ]
  const riskKeys = [
    'trading-assistant.liveDisclaimer.view',
    'strategyCenter.editor.leverageAutoTitle',
    'strategyCenter.editor.leverageAutoHint'
  ]

  for (const localeKey of secondaryLocales) {
    for (const key of editorKeys) {
      assert.ok(strategyV2Locales[localeKey][key], `${localeKey} is missing ${key}`)
      assert.notEqual(strategyV2Locales[localeKey][key], strategyV2Locales['en-US'][key])
    }
    for (const key of riskKeys) {
      assert.ok(strategyLiveRiskLocales[localeKey][key], `${localeKey} is missing ${key}`)
      assert.notEqual(strategyLiveRiskLocales[localeKey][key], strategyLiveRiskLocales['en-US'][key])
    }
  }
})

test('strategy center command buttons center icons and labels', () => {
  assert.match(operationsSource, /\.master-actions ::v-deep \.ant-btn \{ display: inline-flex; align-items: center; justify-content: center;/)
  assert.match(operationsSource, /\.detail-actions ::v-deep \.ant-btn \{ display: inline-flex; align-items: center; justify-content: center;/)
})

test('strategy startup is presented as a neutral state instead of an incident', () => {
  assert.match(operationsSource, /this\.healthState\(strategy\) === 'starting'/)
  assert.match(operationsSource, /status-pill\.starting/)
  assert.match(operationsSource, /health-starting/)
  Object.entries(strategyLiveRiskLocales).forEach(([localeKey, messages]) => {
    assert.ok(messages['liveMonitor.starting'], `${localeKey} is missing liveMonitor.starting`)
  })
})

test('strategy status ignores stale incidents after a strategy is stopped and explains active incidents', () => {
  assert.match(operationsSource, /if \(!this\.isRunning\(strategy\)\) return 'inactive'/)
  assert.match(operationsSource, /if \(!this\.isRunning\(strategy\)\) return false/)
  assert.match(operationsSource, /attention_reasons/)
  assert.match(operationsSource, /strategyCenter\.console\.healthReason/)
  Object.entries(strategyLiveRiskLocales).forEach(([localeKey, messages]) => {
    assert.ok(messages['strategyCenter.console.healthReason.positionDrift'], `${localeKey} is missing the position drift reason`)
    assert.ok(messages['strategyCenter.console.healthReason.runtimeOffline'], `${localeKey} is missing the offline reason`)
    assert.ok(messages['strategyCenter.console.healthReason.generic'], `${localeKey} is missing the fallback health reason`)
  })
})

test('new deployments prefer live execution when enabled and show it first', () => {
  assert.match(source, /executionMode: this\.liveTradingEnabled \? 'live' : 'signal'/)
  assert.match(source, /value="live"[\s\S]*value="signal"/)
})

test('perpetual leverage is automatic without shared-account risk controls', () => {
  assert.match(source, /this\.model\.leverageEnabled = true/)
  assert.doesNotMatch(source, /v-model="model\.leverageEnabled"/)
  assert.match(source, /leverageAutoTitle/)
  assert.match(source, /const PLATFORM_MAX_LEVERAGE = 100/)
  assert.match(source, /:max="platformMaxLeverage"/)
  assert.doesNotMatch(source, /accountRisk/)
})

test('deployment setup keeps execution choices prominent and consent lightweight', () => {
  assert.match(source, /class="execution-mode-grid"/)
  assert.match(source, /class="execution-mode-card"/)
  assert.match(source, /class="live-connection-grid"/)
  assert.match(source, /class="deployment-consent-row"/)
  assert.match(source, /<template #footer>[\s\S]*class="deployment-consent-row"[\s\S]*class="deployment-modal-footer__actions"/)
  assert.match(source, /trading-assistant\.liveDisclaimer\.view/)
  assert.match(source, /deployment-disclaimer-popover/)
  assert.match(source, /class="notification-card"/)
  assert.match(source, /notificationIcon \(channel\)/)
  assert.match(source, /openBrokerAccounts \(\)/)
  assert.match(source, /this\.\$router\.push\(\{ name: 'BrokerAccounts' \}\)/)
  assert.doesNotMatch(source, /class="live-risk-card"/)
  assert.doesNotMatch(source, /class="editor-steps"/)
  assert.match(source, /\.execution-mode-card[\s\S]*white-space: normal/)
  assert.match(source, /\.notification-card[\s\S]*white-space: normal/)
  assert.doesNotMatch(source, /<router-link :to="\{ path: '\/broker-accounts' \}">/)
  assert.doesNotMatch(source, /class="disclaimer-check"/)
})

test('deployment setup exposes strategy-level profit and loss limits', () => {
  assert.match(source, /strategyCenter\.editor\.strategyEquityRiskTitle/)
  assert.match(source, /v-model="model\.equityStopLossEnabled"/)
  assert.match(source, /v-model="model\.equityTakeProfitEnabled"/)
  assert.match(source, /equityStopLossPct: this\.model\.equityStopLossEnabled/)
  assert.match(source, /equityTakeProfitPct: this\.model\.equityTakeProfitEnabled/)
  assert.match(source, /deploymentRisk\.equity_stop_loss_pct/)
  assert.match(source, /deploymentRisk\.equity_take_profit_pct/)
})

test('new robot deployments inherit source equity defaults before saving an override', () => {
  assert.match(source, /const sourceRuntime = this\.sourceRuntimeContract\.config \|\| \{\}/)
  assert.match(source, /this\.model\.equityStopLossEnabled = sourceStopLoss > 0/)
  assert.match(source, /this\.model\.equityTakeProfitEnabled = sourceTakeProfit > 0/)
})
