<template>
  <div class="bp-table-wrapper" :class="{ 'theme-dark': isDarkTheme }">
    <div class="bp-table-toolbar">
      <a-button size="small" :loading="loading" @click="load">
        <a-icon type="reload" /> {{ $t('brokerAccounts.refresh') }}
      </a-button>
      <span class="bp-table-count">
        {{ $t('brokerAccounts.ordersCount', { count: rows.length }) }}
      </span>
    </div>
    <a-table
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :loading="loading"
      :row-key="rowKey"
      size="small"
      :scroll="{ x: 820 }"
    >
      <template slot="side" slot-scope="text, record">
        <a-tag :color="(record.side || record.action || '').toLowerCase() === 'buy' ? 'green' : 'red'">
          {{ String(record.side || record.action || '--').toUpperCase() }}
        </a-tag>
      </template>
      <template slot="status" slot-scope="text, record">
        <a-tag :color="statusColor(record.status)">{{ record.status || '--' }}</a-tag>
      </template>
      <template slot="qty" slot-scope="text, record">
        {{ Number(record.quantity || record.qty || record.size || 0).toLocaleString() }}
      </template>
      <template slot="price" slot-scope="text, record">
        {{ formatMoney(record.limit_price || record.limitPrice || record.price) }}
      </template>
      <template slot="action" slot-scope="text, record">
        <a-popconfirm
          :title="$t('brokerAccounts.confirmCancel')"
          :ok-text="$t('brokerAccounts.confirm')"
          :cancel-text="$t('brokerAccounts.cancel')"
          @confirm="onCancel(record)"
        >
          <a-button size="small" type="link" :disabled="!canCancel(record)">
            <a-icon type="close-circle" /> {{ $t('brokerAccounts.cancelOrder') }}
          </a-button>
        </a-popconfirm>
      </template>
    </a-table>
  </div>
</template>

<script>
import { broker } from '@/api/broker'

function money (v) {
  const n = Number(v)
  if (!isFinite(n) || n === 0) return '--'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const FINAL_STATUSES = new Set(['filled', 'canceled', 'cancelled', 'rejected', 'expired', 'done_for_day'])

export default {
  name: 'BrokerOrdersTable',
  props: {
    brokerId: { type: String, required: true },
    isDarkTheme: { type: Boolean, default: false }
  },
  data () {
    return {
      rows: [],
      loading: false
    }
  },
  computed: {
    columns () {
      return [
        { title: this.$t('brokerAccounts.col.orderId'), dataIndex: 'id', key: 'id', width: 200, ellipsis: true },
        { title: this.$t('brokerAccounts.col.symbol'), dataIndex: 'symbol', key: 'symbol', width: 110 },
        { title: this.$t('brokerAccounts.col.side'), key: 'side', width: 90, scopedSlots: { customRender: 'side' } },
        { title: this.$t('brokerAccounts.col.qty'), key: 'qty', width: 90, scopedSlots: { customRender: 'qty' }, align: 'right' },
        { title: this.$t('brokerAccounts.col.limitPrice'), key: 'price', width: 110, scopedSlots: { customRender: 'price' }, align: 'right' },
        { title: this.$t('brokerAccounts.col.status'), key: 'status', width: 110, scopedSlots: { customRender: 'status' } },
        { title: this.$t('brokerAccounts.col.action'), key: 'action', width: 140, scopedSlots: { customRender: 'action' }, fixed: 'right' }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    formatMoney: money,
    statusColor (s) {
      const v = String(s || '').toLowerCase()
      if (v === 'filled') return 'green'
      if (v === 'canceled' || v === 'cancelled' || v === 'rejected' || v === 'expired') return 'default'
      if (v === 'partially_filled' || v === 'pending_new' || v === 'accepted' || v === 'new') return 'blue'
      return 'orange'
    },
    canCancel (record) {
      const s = String(record.status || '').toLowerCase()
      return !!record.id && !FINAL_STATUSES.has(s)
    },
    rowKey (row) {
      return row.id || row.ticket || row.symbol || JSON.stringify(row).slice(0, 32)
    },
    async load () {
      this.loading = true
      try {
        const res = await broker[this.brokerId].orders()
        const payload = (res && (res.data || res)) || {}
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : (payload.orders || []))
        this.rows = list || []
      } catch (_) {
        this.rows = []
      } finally {
        this.loading = false
      }
    },
    onCancel (record) {
      this.$emit('cancel', record.id)
      this.load()
    }
  }
}
</script>

<style lang="less" scoped>
.bp-table-wrapper { display: flex; flex-direction: column; gap: 10px; }
.bp-table-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.bp-table-count { font-size: 12px; color: #8c8c8c; }

.bp-table-wrapper.theme-dark {
  .bp-table-count { color: rgba(255, 255, 255, 0.48); }

  ::v-deep .ant-table {
    color: rgba(255, 255, 255, 0.82);
    background: #181818;
  }

  ::v-deep .ant-table-thead > tr > th {
    background: #111214;
    color: rgba(255, 255, 255, 0.78);
    border-bottom-color: #303030;
  }

  ::v-deep .ant-table-tbody > tr > td {
    background: #181818;
    color: rgba(255, 255, 255, 0.82);
    border-bottom-color: #2a2a2a;
  }

  ::v-deep .ant-table-tbody > tr:hover > td {
    background: #1f2630 !important;
  }

  ::v-deep .ant-table-placeholder {
    color: rgba(255, 255, 255, 0.45);
    background: #181818;
    border-color: #303030;
  }

  ::v-deep .ant-btn-link[disabled] {
    color: rgba(255, 255, 255, 0.25);
  }
}
</style>
