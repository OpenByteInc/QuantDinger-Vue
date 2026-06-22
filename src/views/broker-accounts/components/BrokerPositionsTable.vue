<template>
  <div class="bp-table-wrapper" :class="{ 'theme-dark': isDarkTheme }">
    <div class="bp-table-toolbar">
      <a-button size="small" :loading="loading" @click="load">
        <a-icon type="reload" /> {{ $t('brokerAccounts.refresh') }}
      </a-button>
      <span class="bp-table-count">
        {{ $t('brokerAccounts.positionsCount', { count: rows.length }) }}
      </span>
    </div>
    <a-table
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :loading="loading"
      :row-key="rowKey"
      size="small"
      :scroll="{ x: 720 }"
    >
      <template slot="pnl" slot-scope="text, record">
        <span :class="pnlClass(record)">{{ formatMoney(record.unrealized_pnl || record.unrealizedPnl || record.profit) }}</span>
      </template>
      <template slot="qty" slot-scope="text, record">
        {{ Number(record.quantity || record.qty || record.position || 0).toLocaleString() }}
      </template>
      <template slot="value" slot-scope="text, record">
        {{ formatMoney(record.market_value || record.marketValue || record.value) }}
      </template>
      <template slot="avg" slot-scope="text, record">
        {{ formatMoney(record.avg_entry_price || record.avgPrice || record.avg_price) }}
      </template>
    </a-table>
  </div>
</template>

<script>
import { broker } from '@/api/broker'

function money (v) {
  const n = Number(v)
  if (!isFinite(n)) return '--'
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default {
  name: 'BrokerPositionsTable',
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
        { title: this.$t('brokerAccounts.col.symbol'), dataIndex: 'symbol', key: 'symbol', width: 120 },
        { title: this.$t('brokerAccounts.col.side'), dataIndex: 'side', key: 'side', width: 80 },
        { title: this.$t('brokerAccounts.col.qty'), key: 'qty', width: 100, scopedSlots: { customRender: 'qty' }, align: 'right' },
        { title: this.$t('brokerAccounts.col.avgPrice'), key: 'avg', width: 110, scopedSlots: { customRender: 'avg' }, align: 'right' },
        { title: this.$t('brokerAccounts.col.marketValue'), key: 'value', width: 130, scopedSlots: { customRender: 'value' }, align: 'right' },
        { title: this.$t('brokerAccounts.col.pnl'), key: 'pnl', width: 130, scopedSlots: { customRender: 'pnl' }, align: 'right' }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    formatMoney: money,
    pnlClass (record) {
      const v = Number(record.unrealized_pnl || record.unrealizedPnl || record.profit || 0)
      if (v > 0) return 'pnl-positive'
      if (v < 0) return 'pnl-negative'
      return ''
    },
    rowKey (row) {
      return row.id || row.symbol || row.ticket || JSON.stringify(row).slice(0, 32)
    },
    async load () {
      this.loading = true
      try {
        const res = await broker[this.brokerId].positions()
        const payload = (res && (res.data || res)) || {}
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : (payload.positions || []))
        this.rows = list || []
      } catch (_) {
        this.rows = []
      } finally {
        this.loading = false
      }
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
.pnl-positive { color: #389e0d; font-weight: 600; font-variant-numeric: tabular-nums; }
.pnl-negative { color: #cf1322; font-weight: 600; font-variant-numeric: tabular-nums; }

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
}
</style>
