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
})

test('saving a live strategy forces a fresh list and selects the saved instance', () => {
  const center = read('src/views/strategy-center/index.vue')
  const editor = read('src/views/strategy-center/components/LiveStrategyEditor.vue')

  assert.match(editor, /this\.\$emit\('saved', \{[\s\S]*?id:/)
  assert.match(center, /async loadStrategies \(\{ force = false \} = \{\}\)/)
  assert.match(center, /await this\.loadStrategies\(\{ force: true \}\)/)
  assert.match(center, /operationsTable\.selectStrategy\(savedStrategy\)/)
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
