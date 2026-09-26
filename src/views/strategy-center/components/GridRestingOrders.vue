<template>
  <section class="grid-orders-panel" :class="{ 'theme-dark': isDark }">
    <header class="grid-orders-head">
      <div>
        <h3>{{ $t(isVirtual ? 'strategyCenter.gridOrders.virtualTitle' : 'strategyCenter.gridOrders.title') }}</h3>
        <p>{{ $t(isVirtual ? 'strategyCenter.gridOrders.virtualDescription' : 'strategyCenter.gridOrders.description') }}</p>
      </div>
      <a-button icon="sync" :loading="loading" @click="load(true)">{{ $t(isVirtual ? 'strategyCenter.gridOrders.refresh' : 'strategyCenter.gridOrders.reconcile') }}</a-button>
    </header>

    <a-alert
      v-if="summary.sync_requested && !summary.sync_ok"
      type="error"
      show-icon
      :message="$t('strategyCenter.gridOrders.syncFailed')"
      :description="syncErrorDescription"
    />
    <div v-if="isVirtual" class="grid-order-summary">
      <div><span>{{ $t('strategyCenter.gridOrders.open') }}</span><strong>{{ summary.total || orders.length }}</strong></div>
      <div><span>{{ $t('strategyCenter.gridOrders.source') }}</span><strong>{{ $t('strategyCenter.gridOrders.virtualAccount') }}</strong></div>
      <div><span>{{ $t('strategyCenter.gridOrders.matching') }}</span><strong>{{ $t('strategyCenter.gridOrders.priceTrigger') }}</strong></div>
      <div><span>{{ $t('strategyCenter.gridOrders.lastEvaluated') }}</span><strong>{{ formatTime(summary.last_reconciled_at) }}</strong></div>
    </div>
    <div v-else class="grid-order-summary">
      <div><span>{{ $t('strategyCenter.gridOrders.open') }}</span><strong>{{ summary.total || orders.length }}</strong></div>
      <div><span>{{ $t('strategyCenter.gridOrders.verified') }}</span><strong>{{ summary.exchange_audit_completed ? (summary.verified_exchange_orders || 0) : '-' }}</strong></div>
      <div :class="{ danger: Number(summary.unverified_orders || 0) > 0 }"><span>{{ $t('strategyCenter.gridOrders.unverified') }}</span><strong>{{ summary.unverified_orders || 0 }}</strong></div>
      <div><span>{{ $t('strategyCenter.gridOrders.lastSync') }}</span><strong>{{ formatTime(summary.last_reconciled_at) }}</strong></div>
    </div>

    <a-table
      :columns="columns"
      :data-source="orders"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="small"
      :scroll="{ x: 1050 }"
    >
      <template slot="side" slot-scope="value, row">
        <a-tag :color="String(row.side).toLowerCase() === 'buy' ? 'green' : 'red'">{{ row.side || '-' }}</a-tag>
      </template>
      <template slot="status" slot-scope="value">
        <a-tag :color="statusColor(value)">{{ statusLabel(value) }}</a-tag>
      </template>
      <template slot="number" slot-scope="value">{{ formatNumber(value) }}</template>
      <template slot="exchangeOrderId" slot-scope="value">
        <code :class="{ missing: !value }">{{ value || $t(isVirtual ? 'strategyCenter.gridOrders.notAvailable' : 'strategyCenter.gridOrders.notVerified') }}</code>
      </template>
      <template slot="updatedAt" slot-scope="value">{{ formatTime(value) }}</template>
      <template slot="emptyText">
        <div class="grid-orders-empty">
          <a-icon type="warning" />
          <strong>{{ $t(isVirtual ? 'strategyCenter.gridOrders.virtualEmpty' : 'strategyCenter.gridOrders.empty') }}</strong>
          <span>{{ $t(isVirtual ? 'strategyCenter.gridOrders.virtualEmptyHint' : 'strategyCenter.gridOrders.emptyHint') }}</span>
        </div>
      </template>
    </a-table>
  </section>
</template>

<script>
import { getGridRestingOrders } from '@/api/strategy'

export default {
  name: 'GridRestingOrders',
  props: {
    strategyId: { type: Number, required: true },
    isDark: { type: Boolean, default: false }
  },
  data () {
    return {
      orders: [],
      summary: {},
      loading: false,
      timer: null,
      requestId: 0
    }
  },
  computed: {
    isVirtual () {
      return Boolean(this.summary.virtual_mode)
    },
    syncErrorDescription () {
      const code = String(this.summary.sync_error || '')
      const known = ['grid_runner_not_available', 'grid_exchange_client_unavailable', 'grid_exchange_audit_rate_limited', 'grid_exchange_orders_unverified', 'grid_exchange_snapshot_failed']
      return known.includes(code) ? this.$t(`strategyCenter.gridOrders.errors.${code}`) : code
    },
    columns () {
      return [
        { title: this.$t('strategyCenter.gridOrders.cell'), dataIndex: 'cell_index', width: 72 },
        { title: this.$t('strategyCenter.gridOrders.purpose'), dataIndex: 'purpose_label', width: 130 },
        { title: this.$t('strategyCenter.gridOrders.side'), dataIndex: 'side', scopedSlots: { customRender: 'side' }, width: 80 },
        { title: this.$t('strategyCenter.gridOrders.price'), dataIndex: 'exchange_price', scopedSlots: { customRender: 'number' }, width: 120 },
        { title: this.$t('strategyCenter.gridOrders.quantity'), dataIndex: 'exchange_quantity', scopedSlots: { customRender: 'number' }, width: 130 },
        { title: this.$t('strategyCenter.gridOrders.filled'), dataIndex: 'exchange_filled_quantity', scopedSlots: { customRender: 'number' }, width: 120 },
        { title: this.$t('strategyCenter.gridOrders.status'), dataIndex: 'exchange_status', scopedSlots: { customRender: 'status' }, width: 140 },
        { title: this.$t(this.isVirtual ? 'strategyCenter.gridOrders.virtualOrderId' : 'strategyCenter.gridOrders.exchangeOrderId'), dataIndex: 'exchange_order_id', scopedSlots: { customRender: 'exchangeOrderId' }, width: 210 },
        { title: this.$t('strategyCenter.gridOrders.updatedAt'), dataIndex: 'updated_at', scopedSlots: { customRender: 'updatedAt' }, width: 170 }
      ]
    }
  },
  watch: {
    strategyId: {
      immediate: true,
      handler () {
        this.requestId++
        this.loading = false
        this.orders = []
        this.summary = {}
        this.load(true)
      }
    }
  },
  mounted () {
    this.timer = setInterval(() => this.load(true), 15000)
  },
  beforeDestroy () {
    if (this.timer) clearInterval(this.timer)
    this.requestId++
  },
  methods: {
    async load (sync) {
      if (!this.strategyId || this.loading) return
      const requestId = ++this.requestId
      const strategyId = this.strategyId
      this.loading = true
      try {
        const response = await getGridRestingOrders(strategyId, { status: '', limit: 500, sync })
        if (requestId !== this.requestId) return
        if (!response || response.code !== 1) throw new Error('grid_order_fetch_failed')
        const data = response && response.data || {}
        this.orders = data.orders || data.items || []
        this.summary = data.summary || {}
      } catch (error) {
        if (requestId !== this.requestId) return
        this.orders = this.orders.map(order => ({ ...order, exchange_status: 'unverified', exchange_price: null, exchange_quantity: null, exchange_filled_quantity: null }))
        this.summary = { total: this.orders.length, unverified_orders: this.orders.length, sync_requested: true, sync_ok: false, sync_error: 'grid_exchange_snapshot_failed' }
      } finally {
        if (requestId === this.requestId) this.loading = false
      }
    },
    statusColor (value) {
      const status = String(value || '').toLowerCase()
      if (status === 'filled') return 'green'
      if (status === 'partial') return 'orange'
      if (status === 'unverified') return 'orange'
      if (status === 'not_open') return 'red'
      if (['cancelled', 'rejected', 'failed'].includes(status)) return 'red'
      return 'blue'
    },
    statusLabel (value) {
      const status = String(value || 'unverified').toLowerCase()
      if (this.isVirtual && status === 'open') return this.$t('strategyCenter.gridOrders.virtualOpen')
      return this.$t(`strategyCenter.gridOrders.exchangeStatus.${status}`)
    },
    formatNumber (value) {
      if (value === null || value === undefined || value === '') return '-'
      const number = Number(value)
      return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 12 }) : '-'
    },
    formatTime (value) {
      if (!value) return '-'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
    }
  }
}
</script>

<style scoped>
.grid-orders-panel { padding: 18px; color: #273142; }
.grid-orders-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 14px; }
.grid-orders-head h3 { margin: 0; color: #202938; }
.grid-orders-head p { margin: 5px 0 0; color: #697586; }
.grid-order-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 14px 0; }
.grid-order-summary div { padding: 12px; border: 1px solid #e1e6ed; border-radius: 8px; background: #f7f9fb; }
.grid-order-summary span, .grid-order-summary strong { display: block; }
.grid-order-summary span { color: #7a8594; font-size: 12px; }
.grid-order-summary strong { margin-top: 4px; color: #202938; }
.grid-order-summary .danger strong, code.missing { color: #f5222d; }
code { color: #1677ff; word-break: break-all; }
.grid-orders-empty { padding: 36px; display: flex; flex-direction: column; align-items: center; gap: 7px; color: #7a8594; }
.grid-orders-empty strong { color: #202938; }
.grid-orders-panel ::v-deep .ant-table { color: #354052; background: #fff; }
.grid-orders-panel ::v-deep .ant-table-thead > tr > th { border-color: #e6eaf0; background: #f5f7fa; color: #4b5563; }
.grid-orders-panel ::v-deep .ant-table-tbody > tr > td { border-color: #edf0f4; background: #fff; }
.grid-orders-panel ::v-deep .ant-table-placeholder { border-color: #edf0f4; background: #fff; color: #7a8594; }
.grid-orders-panel.theme-dark { color: #e5e7eb; }
.grid-orders-panel.theme-dark .grid-orders-head h3 { color: #e5e7eb; }
.grid-orders-panel.theme-dark .grid-orders-head p { color: #8b949e; }
.grid-orders-panel.theme-dark .grid-order-summary div { border-color: #27313a; background: #101418; }
.grid-orders-panel.theme-dark .grid-order-summary span { color: #8b949e; }
.grid-orders-panel.theme-dark .grid-order-summary strong { color: #e5e7eb; }
.grid-orders-panel.theme-dark .grid-order-summary .danger strong,
.grid-orders-panel.theme-dark code.missing { color: #ff7875; }
.grid-orders-panel.theme-dark code { color: #91caff; }
.grid-orders-panel.theme-dark .grid-orders-empty { color: #8b949e; }
.grid-orders-panel.theme-dark .grid-orders-empty strong { color: #e5e7eb; }
.grid-orders-panel.theme-dark ::v-deep .ant-table { color: #d7dbe1; background: #121416; }
.grid-orders-panel.theme-dark ::v-deep .ant-table-thead > tr > th { border-color: #2d3239; background: #191c20; color: #aab1bc; }
.grid-orders-panel.theme-dark ::v-deep .ant-table-tbody > tr > td { border-color: #282d33; background: #121416; }
.grid-orders-panel.theme-dark ::v-deep .ant-table-placeholder { border-color: #282d33; background: #121416; color: #8b949e; }
@media (max-width: 900px) { .grid-order-summary { grid-template-columns: 1fr 1fr; } }
</style>
