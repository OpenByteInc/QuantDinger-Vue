import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { gridOrderAuditMessages } from '../../src/locales/lang/strategy-live-risk.js'

const source = fs.readFileSync(new URL('../../src/views/strategy-center/components/GridRestingOrders.vue', import.meta.url), 'utf8')
function component (getGridRestingOrders) {
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'result =')
  const scope = { getGridRestingOrders, setInterval, clearInterval }
  vm.runInNewContext(script, scope)
  const options = scope.result
  const page = { ...options.data(), strategyId: 3, $t: key => gridOrderAuditMessages['zh-CN'][key] || key }
  for (const [key, fn] of Object.entries(options.methods)) page[key] = fn.bind(page)
  return { page, options }
}

test('queued verification remains pending rather than claiming exchange success', async () => {
  const { page } = component(async () => ({ code: 1, data: {
    orders: [{ id: 1, exchange_status: 'unverified' }],
    summary: { sync_pending: true, sync_ok: false, verified_exchange_orders: 0 }
  } }))
  await page.load(true)
  assert.equal(page.summary.sync_pending, true)
  assert.equal(page.loading, false)
  assert.match(source, /v-if="summary.sync_pending"/)
  assert.match(source, /v-else-if="summary.sync_requested && !summary.sync_ok"/)
})

test('terminal labels and pending accounting are distinct in every supported locale', () => {
  assert.equal(Object.keys(gridOrderAuditMessages).length, 11)
  for (const messages of Object.values(gridOrderAuditMessages)) {
    for (const key of ['syncPending', 'reconciliationPending', 'exchangeStatus.filled', 'exchangeStatus.cancelled', 'errors.grid_exchange_reconciliation_pending', 'unverified']) {
      assert.ok(messages[`strategyCenter.gridOrders.${key}`]?.trim())
    }
  }
  const { page } = component(() => {})
  assert.equal(page.statusLabel('filled'), '已确认成交')
  assert.equal(page.statusLabel('cancelled'), '已确认撤销')
  assert.match(source, /row.reconciliation_pending/)
})

test('new audit labels override old generated locale entries in all loading paths', () => {
  const index = fs.readFileSync(new URL('../../src/locales/index.js', import.meta.url), 'utf8')
  assert.equal((index.match(/\.\.\.\(gridOrderAuditMessages\[/g) || []).length, 3)
  assert.match(index, /watchlistAssetMessages\[defaultLang\][\s\S]*?gridOrderAuditMessages\[defaultLang\]/)
})
