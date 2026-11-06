import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('dark account and live controls keep labels and icons readable', () => {
  const brokerPanel = read('src/views/broker-accounts/components/BrokerPanel.vue')
  const multiTab = read('src/components/MultiTab/index.less')
  const operations = read('src/views/strategy-center/components/LiveOperationsTable.vue')

  assert.match(brokerPanel, /theme-dark \.bp-account-selector > label/)
  assert.match(multiTab, /body\.realdark \.@\{multi-tab-prefix-cls\}[^{]+\.ant-tabs-close-x/)
  assert.match(operations, /master-search ::v-deep \.ant-input-search-icon/)
  assert.match(operations, /:overlay-class-name="popconfirmClass"/)
  assert.match(operations, /live-operation-popconfirm--dark[\s\S]*?ant-popover-message-title \{ color: #f2f4f7; \}/)
})

test('saving a live strategy forces a fresh list and selects the saved instance', () => {
  const center = read('src/views/strategy-center/index.vue')
  const editor = read('src/views/strategy-center/components/LiveStrategyEditor.vue')

  assert.match(editor, /this\.\$emit\('saved', \{[\s\S]*?id:/)
  assert.match(center, /async loadStrategies \(\{ force = false \} = \{\}\)/)
  assert.match(center, /await this\.loadStrategies\(\{ force: true \}\)/)
  assert.match(center, /operationsTable\.selectStrategy\(savedStrategy\)/)
})

test('live strategy status refreshes promptly and when the page becomes visible', () => {
  const center = read('src/views/strategy-center/index.vue')

  assert.match(center, /document\.addEventListener\('visibilitychange', this\.handleVisibilityChange\)/)
  assert.match(center, /document\.removeEventListener\('visibilitychange', this\.handleVisibilityChange\)/)
  assert.match(center, /window\.setInterval\([\s\S]*?this\.loadStrategies\(\)[\s\S]*?5000\)/)
  assert.match(center, /handleVisibilityChange \(\)[\s\S]*?this\.loadStrategies\(\{ force: true \}\)/)
})

test('live operations keep daily detail pnl separate from lifetime list pnl', () => {
  const operations = read('src/views/strategy-center/components/LiveOperationsTable.vue')

  assert.match(operations, /strategyPnl \(strategy\)[\s\S]*?strategy\.today_pnl/)
  assert.match(operations, /strategyTotalPnl \(strategy\)[\s\S]*?strategy\.total_pnl/)
  assert.match(operations, /strategyPnl\(selectedStrategy\)/)
  assert.match(operations, /strategyTotalPnl\(strategy\)/)
})

test('grid resting orders are visible for live and virtual grid strategies', () => {
  const operations = read('src/views/strategy-center/components/LiveOperationsTable.vue')
  const restingOrders = read('src/views/strategy-center/components/GridRestingOrders.vue')

  assert.match(operations, /type === 'grid'/)
  assert.match(operations, /hasGridParameters/)
  assert.match(operations, /template\.includes\('robot_v2_grid'\)/)
  assert.match(operations, /triggerMode === 'exchange_resting_orders'/)
  assert.match(operations, /strategyCenter\.gridOrders\.tabVirtual/)
  assert.match(restingOrders, /summary\.virtual_mode/)
  assert.match(restingOrders, /strategyCenter\.gridOrders\.virtualTitle/)
  assert.match(restingOrders, /displayUnits/)
  assert.match(restingOrders, /formatPrice/)
  assert.match(restingOrders, /formatQuantity/)
  assert.match(restingOrders, /maximumFractionDigits: 8/)
  assert.match(operations, /strategyCenter\.console\.pendingSignals/)
})

test('position ownership guidance stays compact and theme aware', () => {
  const positions = read('src/views/strategy-center/components/PositionRecords.vue')

  assert.match(positions, /class="ownership-guidance" :class="\{ 'is-dark': isDark \}"/)
  assert.match(positions, /ownership-guidance__main/)
  assert.match(positions, /ownership-guidance__note/)
  assert.match(positions, /color-mix\(in srgb, var\(--primary-color, #1890ff\) 30%, transparent\)/)
  assert.doesNotMatch(positions, /fade\(@primary-color/)
  assert.match(positions, /ownership-warning-alert position-reconciliation-alert/)
  assert.match(positions, /ownership-warning-alert ownership-shortfall-alert/)
  assert.match(positions, /background: linear-gradient\(135deg, rgba\(217, 169, 40, 0\.1\) 0%, #1b1d20 72%\)/)
  assert.match(positions, /&\.is-dark/)
  assert.doesNotMatch(positions, /class="ownership-risk-alert"/)
})

test('live status filters and signal position guidance use compact theme-aware layouts', () => {
  const operations = read('src/views/strategy-center/components/LiveOperationsTable.vue')
  const positions = read('src/views/strategy-center/components/PositionRecords.vue')
  const liveRiskLocale = read('src/locales/lang/strategy-live-risk.js')

  assert.match(operations, /class="master-tab__label"/)
  assert.match(operations, /class="master-tab__count"/)
  assert.match(operations, /min-height: 54px/)
  assert.match(positions, /class="virtual-account-note" role="note"/)
  assert.match(positions, /virtual-account-note__icon/)
  assert.match(positions, /margin: 10px 0 12px/)
  assert.match(positions, /&\.theme-dark \.virtual-account-note/)
  assert.doesNotMatch(positions, /class="virtual-account-alert"/)
  assert.match(liveRiskLocale, /'strategyCenter\.console\.strategyTotalPnl': 'Total P&L'/)
})
