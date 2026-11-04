import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('deployment capabilities control navigation and monetization surfaces', () => {
  const routes = read('src/config/router.config.js')
  const routeFilter = read('src/router/generator-routers.js')
  const accountHeader = read('src/components/GlobalHeader/AvatarDropdown.vue')
  const profile = read('src/views/profile/index.vue')
  const indicatorIde = read('src/views/indicator-ide/index.vue')
  const strategyIde = read('src/views/strategy-ide/index.vue')
  const userManage = read('src/views/user-manage/index.vue')
  const featureStore = read('src/store/modules/features.js')
  const liveEditor = read('src/views/strategy-center/components/LiveStrategyEditor.vue')

  assert.match(routes, /capability: 'marketplace_enabled'/)
  assert.match(routes, /capability: 'billing_enabled'/)
  assert.match(routes, /capability: 'broker_accounts_enabled'/)
  assert.match(routes, /capability: 'agent_gateway_enabled'/)
  assert.match(routeFilter, /capabilities\[requiredCapability\] === false/)
  assert.match(accountHeader, /v-if="billingEnabled"/)
  assert.match(profile, /v-if="billingEnabled" key="credits"/)
  assert.match(profile, /v-if="billingEnabled" key="referrals"/)
  assert.match(indicatorIde, /<button v-if="marketplaceEnabled" type="button" class="ide-indicator-market-entry"/)
  assert.match(indicatorIde, /\.ide-indicator-market-entry[\s\S]*?var\(--primary-color/)
  assert.match(strategyIde, /currentSourceId && marketplaceEnabled/)
  assert.match(userManage, /v-if="billingEnabled" key="orders"/)
  assert.match(userManage, /v-if="billingEnabled" key="rewardWithdrawals"/)
  assert.match(featureStore, /billing_enabled: false/)
  assert.match(featureStore, /marketplace_enabled: false/)
  assert.match(featureStore, /broker_accounts_enabled: true/)
  assert.match(featureStore, /live_trading_enabled: true/)
  assert.match(featureStore, /agent_gateway_enabled: true/)
  assert.match(liveEditor, /v-if="liveTradingEnabled"[\s\S]*?value="live"/)
  assert.match(liveEditor, /executionMode: this\.liveTradingEnabled \? 'live' : 'signal'/)
  assert.match(indicatorIde, /v-if="liveTradingEnabled && quickTradeDrawerVisible"/)
  assert.match(indicatorIde, /v-else-if="liveTradingEnabled"[\s\S]*?class="ide-quick-float-launcher"/)
  assert.match(indicatorIde, /if \(!this\.liveTradingEnabled\) \{[\s\S]*?this\.closeQuickTradeFloat\(\)[\s\S]*?strategyV2\.liveTradingDisabled[\s\S]*?return/)
  assert.match(indicatorIde, /liveTradingEnabled \(enabled\) \{[\s\S]*?if \(!enabled && this\.quickTradeDrawerVisible\)[\s\S]*?this\.closeQuickTradeFloat\(\)/)
  assert.match(indicatorIde, /this\.quickTradeDrawerVisible = this\.liveTradingEnabled && s\.quickTradeDrawerVisible/)
  assert.match(profile, /v-if="agentGatewayEnabled" key="agentTokens"/)
  assert.match(profile, /if \(this\.agentGatewayEnabled\) allowed\.push\('agentTokens'\)/)
})

test('settings feature switch copy is available in every supported locale', () => {
  const source = read('src/locales/settings-feature-overrides.js')
  const strategyRuns = read('src/locales/strategy-run-overrides.js')
  const agentManagement = read('src/locales/agent-management-overrides.js')
  for (const locale of ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'de-DE', 'fr-FR', 'ru-RU', 'th-TH', 'vi-VN', 'ar-SA']) {
    assert.match(source, new RegExp(`'${locale}'`))
    assert.match(strategyRuns, new RegExp(`'${locale}'`))
    assert.match(agentManagement, new RegExp(`'${locale}'`))
  }
})
