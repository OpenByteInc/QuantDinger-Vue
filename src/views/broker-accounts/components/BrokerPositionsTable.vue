<template>
  <div class="bp-table-wrapper" :class="{ 'theme-dark': isDarkTheme }">
    <div class="bp-table-toolbar">
      <a-button v-if="!hideRefresh" size="small" :loading="loading" @click="load">
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
      :scroll="{ x: compact ? 500 : 820 }"
    >
      <template slot="action" slot-scope="text, record"><a-button v-if="brokerId === 'forthright' && record.market === 'Futures' && record.quantity" size="small" type="link" :disabled="closing || loading" @click="closePosition(record)">{{ $t('brokerAccounts.forthright.closePosition') }}</a-button></template>
      <template slot="pnl" slot-scope="text, record">
        <span :class="pnlClass(record)">{{ formatMoney(firstValue(record.unrealized_pnl, record.unrealizedPnl, record.unrealizedPnL, record.profit), rowCurrency(record)) }}</span>
      </template>
      <template slot="qty" slot-scope="text, record">
        {{ formatQuantity(firstValue(record.quantity, record.qty, record.position)) }}
      </template>
      <template slot="value" slot-scope="text, record">
        {{ formatMoney(firstValue(record.market_value, record.marketValue, record.value), rowCurrency(record)) }}
      </template>
      <template slot="avg" slot-scope="text, record">
        {{ quotePrice(firstValue(record.avg_entry_price, record.avgPrice, record.avg_price, record.avgCost), record) }}
      </template>
      <template slot="current" slot-scope="text, record">{{ quotePrice(firstValue(record.current_price, record.currentPrice, record.marketPrice), record) }}</template>
    </a-table>
  </div>
</template>

<script>
import { forthrightErrorMessage } from '@/utils/forthright'
import { broker } from '@/api/broker'
import { firstValue, brokerMoney, brokerPrice, brokerQuantity, brokerRowCurrency } from '@/utils/brokerAccountDisplay'

export default {
  name: 'BrokerPositionsTable',
  props: {
    brokerId: { type: String, required: true },
    credentialId: { type: Number, default: null },
    compact: Boolean,
    hideRefresh: Boolean,
    isDarkTheme: { type: Boolean, default: false }
  },
  data () {
    return {
      rows: [],
      closing: false,
      loading: false
    }
  },
  computed: {
    columns () {
      return [
        { title: this.$t('brokerAccounts.col.symbol'), dataIndex: 'symbol', key: 'symbol', width: 120 },
        { title: this.$t('brokerAccounts.col.side'), dataIndex: 'side', key: 'side', width: 80 },
        { title: this.$t('brokerAccounts.col.qty'), key: 'qty', width: 100, scopedSlots: { customRender: 'qty' }, align: 'right' },
        { title: this.$t('brokerAccounts.col.entryPrice'), key: 'avg', width: 110, scopedSlots: { customRender: 'avg' }, align: 'right' },
        { title: this.$t('brokerAccounts.col.currentPrice'), key: 'current', width: 110, scopedSlots: { customRender: 'current' }, align: 'right' },
        { title: this.$t('brokerAccounts.col.marketValue'), key: 'value', width: 130, scopedSlots: { customRender: 'value' }, align: 'right' },
        { title: this.$t('brokerAccounts.col.pnl'), key: 'pnl', width: 130, scopedSlots: { customRender: 'pnl' }, align: 'right' },
        ...(this.brokerId === 'forthright' ? [{ title: this.$t('brokerAccounts.col.action'), key: 'action', width: 100, scopedSlots: { customRender: 'action' } }] : [])
      ].filter(column => !this.compact || !['current', 'value', 'pnl'].includes(column.key))
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    async closePosition (row) {
      if (this.closing || this.loading) return
      this.closing = true
      const payload = { credential_id: this.credentialId, symbol: row.symbol, expected_quantity: row.quantity }
      try {
        const accepted = await new Promise(resolve => this.$confirm({ title: this.$t('brokerAccounts.forthright.closePosition'), content: this.$t('brokerAccounts.forthright.closeConfirm', { symbol: row.symbol, quantity: Math.abs(row.quantity) }), onOk: () => resolve(true), onCancel: () => resolve(false) }))
        if (!accepted || payload.credential_id !== this.credentialId) return
        const response = await broker.forthright.closePosition(payload)
        if (!response.success) throw new Error(response.error)
        this.$message.success(this.$t('brokerAccounts.forthright.orderSubmitted'))
      } catch (error) { this.$message.error(forthrightErrorMessage(error, this.$t.bind(this))) } finally { this.closing = false; await this.load() }
    },
    firstValue,
    rowCurrency (row) { return brokerRowCurrency(row, this.brokerId) },
    formatMoney: brokerMoney,
    quotePrice (value, row) { return row.market === 'Futures' ? brokerQuantity(value) : brokerPrice(value, this.rowCurrency(row)) },
    formatQuantity: brokerQuantity,
    pnlClass (record) {
      const v = Number(firstValue(record.unrealized_pnl, record.unrealizedPnl, record.unrealizedPnL, record.profit))
      if (v > 0) return 'pnl-positive'
      if (v < 0) return 'pnl-negative'
      return ''
    },
    rowKey (row) {
      return row.id || row.symbol || row.ticket || JSON.stringify(row).slice(0, 32)
    },
    async load (background = false) {
      if (this.loading) return
      const credentialId = this.credentialId
      this.loading = true
      try {
        const res = await broker[this.brokerId].positions(this.credentialId ? { credential_id: this.credentialId } : {})
        if (res && res.success === false) throw new Error('brokerAccounts.snapshotPositionsFailed')
        const payload = (res && (res.data || res)) || {}
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : (payload.positions || []))
        if (credentialId === this.credentialId) this.rows = list || []
      } catch (_) {
        if (background !== true) this.$message.error(this.$t('brokerAccounts.snapshotPositionsFailed'))
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
.bp-table-toolbar .ant-btn { order: 1; margin-left: auto; }
.pnl-positive { color: #389e0d; font-weight: 600; font-variant-numeric: tabular-nums; }
.pnl-negative { color: #cf1322; font-weight: 600; font-variant-numeric: tabular-nums; }

.bp-table-wrapper.theme-dark {
  .bp-table-count { color: rgba(255, 255, 255, 0.48); }

  ::v-deep .ant-table {
    color: rgba(255, 255, 255, 0.82);
    background: #181818;
  }

  ::v-deep .ant-table-thead > tr > th {
    background: #0d0d0d;
    color: rgba(255, 255, 255, 0.78);
    border-bottom-color: #303030;
  }

  ::v-deep .ant-table-tbody > tr > td {
    background: #181818;
    color: rgba(255, 255, 255, 0.82);
    border-bottom-color: #2a2a2a;
  }

  ::v-deep .ant-table-tbody > tr:hover > td {
    background: #202020 !important;
  }

  ::v-deep .ant-table-placeholder {
    color: rgba(255, 255, 255, 0.45);
    background: #181818;
    border-color: #303030;
  }
}
</style>
