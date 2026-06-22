<template>
  <div class="trading-records strategy-tab-pane-inner" :class="{ 'theme-dark': isDark }">
    <div v-if="records.length === 0 && !loading" class="empty-state strategy-tab-empty">
      <a-empty :description="$t('trading-assistant.table.noPositions')" />
    </div>
    <div v-else class="records-container">
      <div class="records-header-bar">
        <div class="records-summary-bar">
          <!-- <span class="summary-title">{{ $t('trading-assistant.table.summary') || '合计统计' }}</span> -->
          <div class="summary-items">
            <div class="summary-item">
              <span class="summary-label">{{ $t('dashboard.indicator.backtest.profit') || '累计盈亏' }}:</span>
              <span :class="['summary-value', totalGrossProfitClass]">{{ formatTotalGrossProfitText }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">{{ $t('trading-assistant.table.commission') || '累计手续费' }}:</span>
              <span class="summary-value commission-value">{{ formatTotalCommissionText }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">{{ $t('trading-assistant.table.netProfit') || '净盈亏(盈亏-手续费)' }}:</span>
              <span :class="['summary-value', totalNetProfitClass]">{{ formatTotalNetProfitText }}</span>
            </div>
          </div>
        </div>
      </div>
      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="paginationConfig"
        @change="handleTableChange"
        size="small"
        rowKey="id"
        :scroll="{ x: 800 }"
      >
        <template slot="type" slot-scope="text">
          <div class="trade-type-cell">
            <a-tag :color="getTradeTypeColor(text)" class="trade-type-tag">
              {{ getTradeTypeText(text) }}
            </a-tag>
            <div class="trade-type-desc">{{ getTradeActionDescription(text) }}</div>
          </div>
        </template>
        <template slot="price" slot-scope="text">
          ${{ parseFloat(text).toFixed(4) }}
        </template>
        <template slot="amount" slot-scope="text">
          {{ parseFloat(text).toFixed(4) }}
        </template>
        <template slot="value" slot-scope="text">
          ${{ parseFloat(text).toFixed(2) }}
        </template>
        <template slot="profit" slot-scope="text, record">
          <span :class="['ta-pnl', profitToneClass(record)]">
            {{ formatProfit(record) }}
          </span>
        </template>
        <template slot="commission" slot-scope="text">
          {{ formatCommission(text) }}
        </template>
        <template slot="time" slot-scope="text, record">
          {{ formatTime(record.created_at || text) }}
        </template>
      </a-table>
    </div>
    <a-table
      v-else
      :columns="columns"
      :data-source="records"
      :loading="loading"
      :pagination="{ pageSize: 10 }"
      size="small"
      rowKey="id"
      :scroll="{ x: 800 }"
    >
      <template slot="type" slot-scope="text, record">
        <div class="trade-type-cell">
          <a-tag :color="getTradeTypeColor(text)" class="trade-type-tag">
            {{ getTradeTypeText(text) }}
          </a-tag>
          <div class="trade-type-desc">{{ getTradeActionDescription(record) }}</div>
        </div>
      </template>
      <template slot="price" slot-scope="text">
        ${{ parseFloat(text).toFixed(4) }}
      </template>
      <template slot="amount" slot-scope="text">
        {{ parseFloat(text).toFixed(4) }}
      </template>
      <template slot="value" slot-scope="text">
        ${{ parseFloat(text).toFixed(2) }}
      </template>
      <template slot="profit" slot-scope="text, record">
        <span :class="['ta-pnl', profitToneClass(record)]">
          {{ formatProfit(record) }}
        </span>
      </template>
      <template slot="grid_matched_profit" slot-scope="text, record">
        <span :class="['ta-pnl', gridProfitToneClass(record)]">
          {{ formatGridProfit(record) }}
        </span>
      </template>
      <template slot="commission" slot-scope="text, record">
        {{ formatCommission(text, record) }}
      </template>
      <template slot="time" slot-scope="text, record">
        {{ formatTime(record.created_at || text) }}
      </template>
    </a-table>
  </div>
</template>

<script>
import { getStrategyTrades } from '@/api/strategy'
import { formatUserDateTime, formatBrowserLocalDateTime, getUserTimezoneFromStorage } from '@/utils/userTime'

export default {
  name: 'TradingRecords',
  props: {
    strategyId: {
      type: Number,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    isDark: {
      type: Boolean,
      default: false
    },
    botType: {
      // 'grid' / 'dca' / '' — drives the "grid profit" column visibility.
      type: String,
      default: ''
    }
  },
  computed: {
    paginationConfig () {
      return {
        ...this.pagination,
        showTotal: (total) => this.$t('ai-trading-assistant.table.totalRecords', { total })
      }
    },
    typeFilters () {
      const types = [...new Set(this.records.map(r => r.type).filter(Boolean))]
      return types.map(type => ({
        text: this.getTradeTypeText(type),
        value: type
      }))
    },
    totalGrossProfit () {
      let hasValidProfit = false
      const sum = this.filteredRecords.reduce((acc, record) => {
        const raw = this.pickTradeProfitRaw(record)
        if (raw !== null && raw !== undefined && raw !== '') {
          const p = parseFloat(raw)
          if (!isNaN(p)) {
            hasValidProfit = true
            return acc + p
          }
        }
        return acc
      }, 0)
      return hasValidProfit ? sum : null
    },
    totalGrossProfitClass () {
      const val = this.totalGrossProfit
      if (val === null || Math.abs(val) < 1e-9) return 'ta-pnl-neutral'
      return val > 0 ? 'ta-pnl-pos' : 'ta-pnl-neg'
    },
    formatTotalGrossProfitText () {
      const val = this.totalGrossProfit
      if (val === null) return '--'
      return this.formatMoney(val)
    },
    totalCommission () {
      let hasValidCommission = false
      const sum = this.filteredRecords.reduce((acc, record) => {
        const c = record.commission != null ? parseFloat(record.commission) : null
        if (c !== null && !isNaN(c)) {
          hasValidCommission = true
          return acc + c
        }
        return acc
      }, 0)
      return hasValidCommission ? sum : null
    },
    formatTotalCommissionText () {
      const val = this.totalCommission
      if (val === null) return '--'
      return this.formatCommission(val)
    },
    totalNetProfit () {
      const gross = this.totalGrossProfit
      const comm = this.totalCommission
      if (gross === null && comm === null) return null
      return (gross || 0) - (comm || 0)
    },
    totalNetProfitClass () {
      const val = this.totalNetProfit
      if (val === null || Math.abs(val) < 1e-9) return 'ta-pnl-neutral'
      return val > 0 ? 'ta-pnl-pos' : 'ta-pnl-neg'
    },
    formatTotalNetProfitText () {
      const val = this.totalNetProfit
      if (val === null) return '--'
      return this.formatMoney(val)
    isGridBot () {
      const bt = String(this.botType || '').toLowerCase()
      return bt === 'grid' || bt === 'dca'
    },
    columns () {
      const cols = [
        {
          title: this.$t('trading-assistant.table.time'),
          dataIndex: 'created_at',
          key: 'created_at',
          width: 180,
          scopedSlots: { customRender: 'time' }
        },
        {
          title: this.$t('trading-assistant.table.typeAndAction'),
          dataIndex: 'type',
          key: 'type',
          width: 220,
          scopedSlots: { customRender: 'type' },
          filters: this.typeFilters,
          onFilter: (value, record) => String(record.type || '').toLowerCase() === String(value || '').toLowerCase()
        },
        {
          title: this.$t('trading-assistant.table.price'),
          dataIndex: 'price',
          key: 'price',
          width: 120,
          scopedSlots: { customRender: 'price' }
        },
        {
          title: this.$t('trading-assistant.table.amount'),
          dataIndex: 'amount',
          key: 'amount',
          width: 120,
          scopedSlots: { customRender: 'amount' }
        },
        {
          title: this.$t('trading-assistant.table.value'),
          dataIndex: 'value',
          key: 'value',
          width: 120,
          scopedSlots: { customRender: 'value' }
        },
        {
          title: this.$t('trading-assistant.table.netProfit'),
          dataIndex: 'profit',
          key: 'profit',
          width: 120,
          scopedSlots: { customRender: 'profit' }
        }
      ]
      if (this.isGridBot) {
        cols.push({
          title: this.$t('trading-assistant.table.gridMatchedProfit'),
          dataIndex: 'grid_matched_profit',
          key: 'grid_matched_profit',
          width: 130,
          scopedSlots: { customRender: 'grid_matched_profit' }
        })
      }
      cols.push({
        title: this.$t('trading-assistant.table.commission'),
        dataIndex: 'commission',
        key: 'commission',
        width: 100,
        scopedSlots: { customRender: 'commission' }
      })
      return cols
    }
  },
  data () {
    return {
      records: [],
      filteredRecords: [],
      pagination: {
        current: 1,
        pageSize: 10,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100']
      }
    }
  },
  watch: {
    strategyId: {
      handler (val) {
        if (val) {
          this.loadRecords()
        }
      },
      immediate: true
    }
  },
  methods: {
    handleTableChange (pagination, filters, sorter, extra) {
      this.pagination.current = pagination.current
      this.pagination.pageSize = pagination.pageSize
      if (extra && extra.currentDataSource) {
        this.filteredRecords = extra.currentDataSource
      }
    },
    async loadRecords () {
      if (!this.strategyId) return
      this.pagination.current = 1
      this.records = []
      this.filteredRecords = []
 
      try {
        const res = await getStrategyTrades(this.strategyId, this.$i18n && this.$i18n.locale)
        if (res.code === 1) {
          const list = res.data.trades || res.data.items || []
          this.records = list.map(trade => {
            const t = { ...trade }
            t.time = t.created_at || t.time
            const pr = this.pickTradeProfitRaw(t)
            if (pr === null || pr === undefined || pr === '') {
              t.profit = null
            } else {
              const n = parseFloat(pr)
              t.profit = isNaN(n) ? null : n
            }
            const cm = t.commission != null ? t.commission : t.fee
            if (cm === null || cm === undefined || cm === '') {
              t.commission = null
            } else {
              const c = parseFloat(cm)
              t.commission = isNaN(c) ? null : c
            }
            const price = t.price != null ? parseFloat(t.price) : null
            const amount = t.amount != null ? parseFloat(t.amount) : null
            if ((t.value == null || t.value === '') && price != null && amount != null && !isNaN(price) && !isNaN(amount)) {
              t.value = price * amount
            }
            return t
          })
          this.filteredRecords = [...this.records]
        } else {
          this.records = []
          this.filteredRecords = []
          this.$message.error(res.msg || this.$t('trading-assistant.messages.loadTradesFailed'))
        }
      } catch (error) {
        this.records = []
        this.filteredRecords = []
      }
    },
    formatTime (time) {
      if (!time) return '--'
      const loc = this.$i18n.locale || 'zh-CN'
      // Profile timezone (e.g. Asia/Shanghai) when set; else browser local — matches how we send UTC instants from API.
      if (getUserTimezoneFromStorage()) {
        return formatUserDateTime(time, { locale: loc, fallback: '--' })
      }
      return formatBrowserLocalDateTime(time, { locale: loc, fallback: '--' })
    },
    /** Net realised P&L after open + close fees (API may pre-compute net_pnl / profit). */
    netTradePnl (row) {
      if (!row || typeof row !== 'object') return null
      if (row.net_pnl !== null && row.net_pnl !== undefined && row.net_pnl !== '') {
        const n = parseFloat(row.net_pnl)
        if (!isNaN(n)) return n
      }
      if (row.profit_gross != null && row.profit != null) {
        const n = parseFloat(row.profit)
        if (!isNaN(n)) return n
      }
      const raw = this.pickTradeProfitRaw(row)
      if (raw === null || raw === undefined || raw === '') return null
      const p = parseFloat(raw)
      if (isNaN(p)) return null
      let fee = 0
      const cm = row && (row.commission != null ? row.commission : row.fee)
      if (cm !== null && cm !== undefined && cm !== '') {
        const c = parseFloat(cm)
        if (!isNaN(c)) fee = c
      }
      const openFee = parseFloat(row.open_commission_allocated || 0)
      return p - fee - (isNaN(openFee) ? 0 : openFee)
    },
    pickTradeProfitRaw (row) {
      if (!row || typeof row !== 'object') return null
      const keys = [
        'net_pnl',
        'netPnl',
        'profit',
        'pnl',
        'realized_pnl',
        'realizedPnl',
        'net_profit',
        'netProfit',
        'realized_profit',
        'realizedProfit'
      ]
      for (const k of keys) {
        const v = row[k]
        if (v !== null && v !== undefined && v !== '') return v
      }
      return null
    },
    closeReasonI18nKey (reason) {
      const code = String(reason || '').trim()
      if (!code) return null
      return `trading-assistant.tradeReason.${code}`
    },
    gridPurposeI18nKey (reason) {
      const code = String(reason || '').trim()
      if (!code) return null
      return `trading-bot.detail.restingPurpose.${code}`
    },
    tradeDetailI18nKey (type) {
      const ty = String(type || '').toLowerCase().replace(/-/g, '_')
      const map = {
        open_long: 'dashboard.indicator.backtest.tradeDetailOpenLong',
        add_long: 'dashboard.indicator.backtest.tradeDetailAddLong',
        close_long: 'dashboard.indicator.backtest.tradeDetailCloseLong',
        close_long_stop: 'dashboard.indicator.backtest.tradeDetailCloseLongStop',
        close_long_profit: 'dashboard.indicator.backtest.tradeDetailCloseLongProfit',
        close_long_trailing: 'dashboard.indicator.backtest.tradeDetailCloseLongTrailing',
        reduce_long: 'dashboard.indicator.backtest.tradeDetailReduceLong',
        open_short: 'dashboard.indicator.backtest.tradeDetailOpenShort',
        add_short: 'dashboard.indicator.backtest.tradeDetailAddShort',
        close_short: 'dashboard.indicator.backtest.tradeDetailCloseShort',
        close_short_stop: 'dashboard.indicator.backtest.tradeDetailCloseShortStop',
        close_short_profit: 'dashboard.indicator.backtest.tradeDetailCloseShortProfit',
        close_short_trailing: 'dashboard.indicator.backtest.tradeDetailCloseShortTrailing',
        reduce_short: 'dashboard.indicator.backtest.tradeDetailReduceShort',
        liquidation: 'dashboard.indicator.backtest.tradeDetailLiquidation',
        buy: 'dashboard.indicator.backtest.tradeDetailBuy',
        sell: 'dashboard.indicator.backtest.tradeDetailSell'
      }
      return map[ty] || null
    },
    getTradeActionDescription (recordOrType) {
      const record = recordOrType && typeof recordOrType === 'object' ? recordOrType : null
      const type = record ? record.type : recordOrType

      if (record) {
        const loc = String((this.$i18n && this.$i18n.locale) || 'zh-CN').toLowerCase()
        const preferEn = loc.startsWith('en')
        const note = preferEn
          ? (record.action_note_en || record.action_note)
          : (record.action_note || record.action_note_en)
        if (note) return note

        const reasonKey = this.closeReasonI18nKey(record.close_reason)
        if (reasonKey) {
          const rt = this.$t(reasonKey)
          if (rt !== reasonKey) return rt
        }

        const purposeKey = this.gridPurposeI18nKey(record.close_reason)
        if (purposeKey) {
          const pt = this.$t(purposeKey)
          if (pt !== purposeKey) return pt
        }

        // Backtest-style typed exits (close_long_stop / _profit / _trailing)
        const typedKey = this.tradeDetailI18nKey(type)
        if (typedKey && /_(stop|profit|trailing)$/.test(String(type || '').toLowerCase())) {
          const tt = this.$t(typedKey)
          if (tt !== typedKey) return tt
        }
      }

      const key = this.tradeDetailI18nKey(type)
      if (!key) return '—'
      const t = this.$t(key)
      return t !== key ? t : '—'
    },
    profitToneClass (record) {
      const net = this.netTradePnl(record)
      if (net === null) return 'ta-pnl-neutral'
      const n = net
      if (isNaN(n)) return 'ta-pnl-neutral'
      const ty = String(record && record.type || '').toLowerCase()
      const openTypes = ['open_long', 'open_short', 'add_long', 'add_short', 'buy']
      if (openTypes.includes(ty) && Math.abs(n) < 1e-9) return 'ta-pnl-neutral'
      if (n > 0) return 'ta-pnl-pos'
      if (n < 0) return 'ta-pnl-neg'
      return 'ta-pnl-zero'
    },
    getTradeTypeColor (type) {
      const ty = String(type || '').toLowerCase()
      const colorMap = {
        'buy': 'green',
        'sell': 'red',
        'liquidation': 'volcano',
        'open_long': 'green',
        'add_long': 'cyan',
        'close_long': 'orange',
        'close_long_stop': 'red',
        'close_long_profit': 'lime',
        'close_long_trailing': 'purple',
        'reduce_long': 'geekblue',
        'open_short': 'magenta',
        'add_short': 'volcano',
        'close_short': 'blue',
        'close_short_stop': 'red',
        'close_short_profit': 'cyan',
        'close_short_trailing': 'purple',
        'reduce_short': 'geekblue'
      }
      return colorMap[ty] || 'default'
    },
    getTradeTypeText (type) {
      const ty = String(type || '').toLowerCase()
      const textMap = {
        'buy': this.$t('dashboard.indicator.backtest.buy'),
        'sell': this.$t('dashboard.indicator.backtest.sell'),
        'liquidation': this.$t('dashboard.indicator.backtest.liquidation'),
        'open_long': this.$t('dashboard.indicator.backtest.openLong'),
        'add_long': this.$t('dashboard.indicator.backtest.addLong'),
        'close_long': this.$t('dashboard.indicator.backtest.closeLong'),
        'close_long_stop': this.$t('dashboard.indicator.backtest.closeLongStop'),
        'close_long_profit': this.$t('dashboard.indicator.backtest.closeLongProfit'),
        'close_long_trailing': this.$t('dashboard.indicator.backtest.closeLongTrailing'),
        'reduce_long': this.$t('dashboard.indicator.backtest.reduceLong'),
        'open_short': this.$t('dashboard.indicator.backtest.openShort'),
        'add_short': this.$t('dashboard.indicator.backtest.addShort'),
        'close_short': this.$t('dashboard.indicator.backtest.closeShort'),
        'close_short_stop': this.$t('dashboard.indicator.backtest.closeShortStop'),
        'close_short_profit': this.$t('dashboard.indicator.backtest.closeShortProfit'),
        'close_short_trailing': this.$t('dashboard.indicator.backtest.closeShortTrailing'),
        'reduce_short': this.$t('dashboard.indicator.backtest.reduceShort')
      }
      return textMap[ty] || type
    },
    formatMoney (value) {
      if (value === null || value === undefined) return '--'
      const sign = value >= 0 ? '+' : '-'
      return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    formatProfit (record) {
      const net = this.netTradePnl(record)
      if (net === null) return '--'

      const numValue = net

      const openTypes = ['open_long', 'open_short', 'add_long', 'add_short']
      if (numValue === 0 && record && openTypes.includes(record.type)) {
        return '--'
      }

      if (Math.abs(numValue) < 0.000001) {
        if (record && openTypes.includes(record.type)) {
          return '--'
        }
        return '$0.00'
      }

      return this.formatMoney(numValue)
    },
    pickGridProfit (record) {
      if (!record || typeof record !== 'object') return null
      const raw = record.grid_matched_profit
      if (raw === null || raw === undefined || raw === '') return null
      const v = parseFloat(raw)
      if (isNaN(v)) return null
      const matched = parseFloat(record.matched_entry_price || 0)
      if (!matched || matched <= 0) return null
      return v
    },
    formatGridProfit (record) {
      const v = this.pickGridProfit(record)
      if (v === null) return '—'
      if (Math.abs(v) < 1e-6) return '$0.00'
      return this.formatMoney(v)
    },
    gridProfitToneClass (record) {
      const v = this.pickGridProfit(record)
      if (v === null) return 'ta-pnl-neutral'
      if (v > 0) return 'ta-pnl-pos'
      if (v < 0) return 'ta-pnl-neg'
      return 'ta-pnl-zero'
    },
    formatCommission (value, record) {
      const row = record && typeof record === 'object' ? record : null
      if (row && row.total_commission != null && row.total_commission !== '') {
        const total = parseFloat(row.total_commission)
        if (!isNaN(total)) {
          if (Math.abs(total) < 1e-12) return '$0.00'
          return `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
        }
      }
      if (value === null || value === undefined) return '--'
      const numValue = parseFloat(value)
      if (isNaN(numValue)) return '--'
      if (Math.abs(numValue) < 1e-12) {
        return '$0.00'
      }
      return `$${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
    }
  }
}
</script>

<style lang="less" scoped>
@primary-color: #1890ff;
@success-color: #0ecb81;
@danger-color: #f6465d;

.trading-records {
  width: 100%;
  min-height: 300px;
  padding: 0;
  overflow-x: visible;
  overflow-y: visible;

  .trade-type-cell {
    max-width: 280px;
    .trade-type-tag {
      margin: 0 0 4px 0;
      font-weight: 600;
      border-radius: 6px;
    }
    .trade-type-desc {
      font-size: 12px;
      line-height: 1.45;
      color: #64748b;
      white-space: normal;
      word-break: break-word;
    }
  }

  .ta-pnl {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .ta-pnl-pos {
    color: #0ecb81 !important;
  }
  .ta-pnl-neg {
    color: #f6465d !important;
  }
  .ta-pnl-zero {
    color: #64748b !important;
  }
  .ta-pnl-neutral {
    color: #94a3b8 !important;
  }

  &.theme-dark .trade-type-cell .trade-type-desc {
    color: rgba(255, 255, 255, 0.45);
  }
  &.theme-dark .ta-pnl-zero {
    color: rgba(255, 255, 255, 0.45) !important;
  }
  &.theme-dark .ta-pnl-neutral {
    color: rgba(255, 255, 255, 0.35) !important;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 220px;
    padding: 40px 16px;
    border-radius: 8px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
  }

  &.theme-dark .empty-state {
    background: #141414;
    border-color: rgba(255, 255, 255, 0.08);
  }

  ::v-deep .ant-spin-nested-loading {
    overflow-x: visible;
  }

  ::v-deep .ant-spin-container {
    overflow-x: visible;
  }

  ::v-deep .ant-table-wrapper {
    overflow-x: visible;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    &::-webkit-scrollbar {
      height: 6px;
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    }
  }

  ::v-deep .ant-table {
    font-size: 13px;
    color: #333;
  }

  ::v-deep .ant-table-container {
    overflow-x: visible;
  }

  ::v-deep .ant-table-body {
    overflow-x: auto;
    overflow-y: visible;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    &::-webkit-scrollbar {
      height: 6px;
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    }
  }

  ::v-deep .ant-table-container {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    &::-webkit-scrollbar {
      height: 6px;
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    }
  }

  ::v-deep .ant-table-content {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    &::-webkit-scrollbar {
      height: 6px;
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    }
  }

  ::v-deep .ant-table-thead > tr > th,
  ::v-deep .ant-table-tbody > tr > td {
    white-space: nowrap;
  }

  ::v-deep .ant-table-thead > tr > th {
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    font-weight: 600;
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
    padding: 12px 16px;
    font-size: 13px;
  }

  ::v-deep .ant-table-tbody > tr > td {
    padding: 12px 16px;
    color: #334155;
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.2s ease;
  }

  ::v-deep .ant-table-tbody > tr {
    &:hover > td {
      background: #f0f7ff !important;
    }
  }

  ::v-deep .ant-tag {
    border-radius: 6px;
    padding: 3px 10px;
    font-weight: 600;
    font-size: 11px;
    border: none;
    transition: all 0.2s ease;

    &[color="green"], &[color="cyan"], &[color="lime"] {
      background: linear-gradient(135deg, rgba(14, 203, 129, 0.15) 0%, rgba(14, 203, 129, 0.08) 100%);
      color: @success-color;
      border: 1px solid rgba(14, 203, 129, 0.3);
    }

    &[color="red"], &[color="magenta"] {
      background: linear-gradient(135deg, rgba(246, 70, 93, 0.15) 0%, rgba(246, 70, 93, 0.08) 100%);
      color: @danger-color;
      border: 1px solid rgba(246, 70, 93, 0.3);
    }

    &[color="orange"] {
      background: linear-gradient(135deg, rgba(250, 173, 20, 0.15) 0%, rgba(250, 173, 20, 0.08) 100%);
      color: #d48806;
      border: 1px solid rgba(250, 173, 20, 0.3);
    }

    &[color="blue"] {
      background: linear-gradient(135deg, rgba(24, 144, 255, 0.15) 0%, rgba(24, 144, 255, 0.08) 100%);
      color: @primary-color;
      border: 1px solid rgba(24, 144, 255, 0.3);
    }

    &[color="volcano"] {
      background: linear-gradient(135deg, rgba(250, 84, 28, 0.15) 0%, rgba(250, 84, 28, 0.08) 100%);
      color: #d4380d;
      border: 1px solid rgba(250, 84, 28, 0.3);
    }

    &[color="purple"] {
      background: linear-gradient(135deg, rgba(114, 46, 209, 0.15) 0%, rgba(114, 46, 209, 0.08) 100%);
      color: #722ed1;
      border: 1px solid rgba(114, 46, 209, 0.3);
    }

    &[color="geekblue"] {
      background: linear-gradient(135deg, rgba(47, 84, 235, 0.15) 0%, rgba(47, 84, 235, 0.08) 100%);
      color: #2f54eb;
      border: 1px solid rgba(47, 84, 235, 0.3);
    }
  }

  ::v-deep .ant-pagination {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;

    .ant-pagination-item {
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s ease;

      &:hover {
        border-color: @primary-color;

        a {
          color: @primary-color;
        }
      }

      &.ant-pagination-item-active {
        background: linear-gradient(135deg, @primary-color 0%, #40a9ff 100%);
        border-color: @primary-color;

        a {
          color: #fff;
        }
      }
    }

    .ant-pagination-prev,
    .ant-pagination-next {
      .ant-pagination-item-link {
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        transition: all 0.2s ease;

        &:hover {
          border-color: @primary-color;
          color: @primary-color;
        }
      }
    }
  }

  &.theme-dark,
  .theme-dark & {
    ::v-deep .ant-table {
      background: #1c1c1c !important;
      color: #d1d4dc !important;
    }

    ::v-deep .ant-table-thead > tr > th {
      background: #2a2e39 !important;
      color: #d1d4dc !important;
      border-bottom-color: #363c4e !important;
      font-weight: 600;
    }

    ::v-deep .ant-table-tbody > tr > td {
      background: #1c1c1c !important;
      color: #d1d4dc !important;
      border-bottom-color: #363c4e !important;
    }

    ::v-deep .ant-table-tbody > tr:hover > td {
      background: #2a2e39 !important;
    }

    ::v-deep .ant-table-tbody > tr > td span:not(.ant-tag) {
      color: #d1d4dc !important;
    }

    ::v-deep .ant-empty .ant-empty-description {
      color: rgba(255, 255, 255, 0.35);
    }

    ::v-deep .ant-tag {
      &[color="green"], &[color="cyan"], &[color="lime"] {
        background: rgba(14, 203, 129, 0.22) !important;
        color: #49c292 !important;
        border-color: rgba(14, 203, 129, 0.45) !important;
      }
      &[color="red"], &[color="magenta"] {
        background: rgba(246, 70, 93, 0.22) !important;
        color: #ff6b7a !important;
        border-color: rgba(246, 70, 93, 0.45) !important;
      }
      &[color="orange"] {
        background: rgba(250, 173, 20, 0.22) !important;
        color: #faad14 !important;
        border-color: rgba(250, 173, 20, 0.45) !important;
      }
      &[color="blue"] {
        background: rgba(24, 144, 255, 0.22) !important;
        color: #40a9ff !important;
        border-color: rgba(24, 144, 255, 0.45) !important;
      }
      &[color="volcano"] {
        background: rgba(250, 84, 28, 0.22) !important;
        color: #ff7a45 !important;
        border-color: rgba(250, 84, 28, 0.45) !important;
      }
      &[color="purple"] {
        background: rgba(114, 46, 209, 0.22) !important;
        color: #b37feb !important;
        border-color: rgba(114, 46, 209, 0.45) !important;
      }
      &[color="geekblue"] {
        background: rgba(47, 84, 235, 0.22) !important;
        color: #85a5ff !important;
        border-color: rgba(47, 84, 235, 0.45) !important;
      }
    }
  }

  ::v-deep .ant-table-tbody > tr:hover > td {
    background: #fafafa;
  }

  @media (max-width: 768px) {
    min-height: 200px;
    overflow-x: visible;

    ::v-deep .ant-table {
      font-size: 12px;
    }

    ::v-deep .ant-table-body,
    ::v-deep .ant-table-container,
    ::v-deep .ant-table-wrapper {
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
      &::-webkit-scrollbar {
        height: 4px;
        width: 4px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 2px;
      }
      &::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 2px;
        &:hover {
          background: rgba(0, 0, 0, 0.3);
        }
      }
    }

    ::v-deep .ant-table-thead > tr > th {
      padding: 8px 10px;
      font-size: 11px;
      white-space: nowrap;
    }

    ::v-deep .ant-table-tbody > tr > td {
      padding: 8px 10px;
      font-size: 11px;
      white-space: nowrap;
    }

    ::v-deep .ant-pagination {
      margin-top: 12px;
      text-align: center;

      .ant-pagination-item,
      .ant-pagination-prev,
      .ant-pagination-next {
        margin: 0 2px;
        min-width: 28px;
        height: 28px;
        line-height: 26px;
        font-size: 12px;
      }
    }
  }

  @media (max-width: 480px) {
    ::v-deep .ant-table {
      font-size: 11px;
    }

    ::v-deep .ant-table-thead > tr > th {
      padding: 6px 8px;
      font-size: 10px;
    }

    ::v-deep .ant-table-tbody > tr > td {
      padding: 6px 8px;
      font-size: 10px;
    }
  }
}

</style>

<style lang="less">
.theme-dark .trading-records .ant-table-tbody > tr > td,
.theme-dark .trading-records[data-v] .ant-table-tbody > tr > td,
body.dark .trading-records .ant-table-tbody > tr > td,
body.realdark .trading-records .ant-table-tbody > tr > td {
  color: #d1d4dc !important;
  background: #1c1c1c !important;
  border-bottom-color: #363c4e !important;
}

.theme-dark .trading-records .ant-table-thead > tr > th,
.theme-dark .trading-records[data-v] .ant-table-thead > tr > th,
body.dark .trading-records .ant-table-thead > tr > th,
body.realdark .trading-records .ant-table-thead > tr > th {
  background: #2a2e39 !important;
  color: #d1d4dc !important;
  border-bottom-color: #363c4e !important;
  font-weight: 600 !important;
}

.theme-dark .trading-records .ant-table,
.theme-dark .trading-records[data-v] .ant-table,
body.dark .trading-records .ant-table,
body.realdark .trading-records .ant-table {
  background: #1c1c1c !important;
  color: #d1d4dc !important;
}

.theme-dark .trading-records .ant-table-tbody > tr > td *:not(.ant-tag),
.theme-dark .trading-records[data-v] .ant-table-tbody > tr > td *:not(.ant-tag),
body.dark .trading-records .ant-table-tbody > tr > td *:not(.ant-tag),
body.realdark .trading-records .ant-table-tbody > tr > td *:not(.ant-tag) {
  color: #d1d4dc !important;
}

.theme-dark .trading-records .ant-table-tbody > tr:hover > td,
.theme-dark .trading-records[data-v] .ant-table-tbody > tr:hover > td,
body.dark .trading-records .ant-table-tbody > tr:hover > td,
body.realdark .trading-records .ant-table-tbody > tr:hover > td {
  background: #2a2e39 !important;
}

.theme-dark .trading-records .ant-table-thead > tr > th,
.theme-dark .trading-records[data-v] .ant-table-thead > tr > th,
body.dark .trading-records .ant-table-thead > tr > th,
body.realdark .trading-records .ant-table-thead > tr > th {
  .ant-table-column-title {
    color: #d1d4dc !important;
  }
}

.theme-dark .trading-records[data-v-8a68b65a] .ant-table-tbody > tr:hover > td {
  background: #2a2e39 !important;
}

body.dark .trading-records[data-v-8a68b65a] .ant-table-tbody > tr > td,
body.realdark .trading-records[data-v-8a68b65a] .ant-table-tbody > tr > td {
  color: #d1d4dc !important;
  background: #1c1c1c !important;
  border-bottom-color: #363c4e !important;
}

body.dark .trading-records[data-v-8a68b65a] .ant-table-thead > tr > th,
body.realdark .trading-records[data-v-8a68b65a] .ant-table-thead > tr > th {
  background: #2a2e39 !important;
  color: #d1d4dc !important;
  border-bottom-color: #363c4e !important;
}

.theme-dark .trading-records[data-v] .ant-table-tbody > tr > td,
body.dark .trading-records[data-v] .ant-table-tbody > tr > td,
body.realdark .trading-records[data-v] .ant-table-tbody > tr > td {
  color: #d1d4dc !important;
  background: #1c1c1c !important;
  border-bottom-color: #363c4e !important;
}

.theme-dark .trading-records[data-v] .ant-table-thead > tr > th,
body.dark .trading-records[data-v] .ant-table-thead > tr > th,
body.realdark .trading-records[data-v] .ant-table-thead > tr > th {
  background: #2a2e39 !important;
  color: #d1d4dc !important;
  border-bottom-color: #363c4e !important;
}

.theme-dark .trading-records[data-v-8a68b65a] .ant-pagination-item,
body.dark .trading-records[data-v-8a68b65a] .ant-pagination-item,
body.realdark .trading-records[data-v-8a68b65a] .ant-pagination-item {
  background: #1c1c1c !important;
  border-color: #363c4e !important;

  a {
    color: #d1d4dc !important;
  }

  &:hover {
    border-color: #1890ff !important;

    a {
      color: #1890ff !important;
    }
  }
}

.theme-dark .trading-records[data-v-8a68b65a] .ant-pagination-item-active,
body.dark .trading-records[data-v-8a68b65a] .ant-pagination-item-active,
body.realdark .trading-records[data-v-8a68b65a] .ant-pagination-item-active {
  background: #1890ff !important;
  border-color: #1890ff !important;

  a {
    color: #fff !important;
  }
}

.theme-dark .trading-records[data-v-8a68b65a] .ant-pagination-prev .ant-pagination-item-link,
.theme-dark .trading-records[data-v-8a68b65a] .ant-pagination-next .ant-pagination-item-link,
body.dark .trading-records[data-v-8a68b65a] .ant-pagination-prev .ant-pagination-item-link,
body.dark .trading-records[data-v-8a68b65a] .ant-pagination-next .ant-pagination-item-link,
body.realdark .trading-records[data-v-8a68b65a] .ant-pagination-prev .ant-pagination-item-link,
body.realdark .trading-records[data-v-8a68b65a] .ant-pagination-next .ant-pagination-item-link {
  background: #1c1c1c !important;
  border-color: #363c4e !important;
  color: #d1d4dc !important;
}

.theme-dark .trading-records[data-v-8a68b65a] .ant-pagination-prev:hover .ant-pagination-item-link,
.theme-dark .trading-records[data-v-8a68b65a] .ant-pagination-next:hover .ant-pagination-item-link,
body.dark .trading-records[data-v-8a68b65a] .ant-pagination-prev:hover .ant-pagination-item-link,
body.dark .trading-records[data-v-8a68b65a] .ant-pagination-next:hover .ant-pagination-item-link,
body.realdark .trading-records[data-v-8a68b65a] .ant-pagination-prev:hover .ant-pagination-item-link,
body.realdark .trading-records[data-v-8a68b65a] .ant-pagination-next:hover .ant-pagination-item-link {
  border-color: #1890ff !important;
  color: #1890ff !important;
}

.theme-dark .trading-records[data-v] .ant-pagination-item,
body.dark .trading-records[data-v] .ant-pagination-item,
body.realdark .trading-records[data-v] .ant-pagination-item {
  background: #1c1c1c !important;
  border-color: #363c4e !important;

  a {
    color: #d1d4dc !important;
  }

  &:hover {
    border-color: #1890ff !important;

    a {
      color: #1890ff !important;
    }
  }
}

.theme-dark .trading-records[data-v] .ant-pagination-item-active,
body.dark .trading-records[data-v] .ant-pagination-item-active,
body.realdark .trading-records[data-v] .ant-pagination-item-active {
  background: #1890ff !important;
  border-color: #1890ff !important;

  a {
    color: #fff !important;
  }
}

.theme-dark .trading-records[data-v] .ant-pagination-prev .ant-pagination-item-link,
.theme-dark .trading-records[data-v] .ant-pagination-next .ant-pagination-item-link,
body.dark .trading-records[data-v] .ant-pagination-prev .ant-pagination-item-link,
body.dark .trading-records[data-v] .ant-pagination-next .ant-pagination-item-link,
body.realdark .trading-records[data-v] .ant-pagination-prev .ant-pagination-item-link,
body.realdark .trading-records[data-v] .ant-pagination-next .ant-pagination-item-link {
  background: #1c1c1c !important;
  border-color: #363c4e !important;
  color: #d1d4dc !important;
}

.theme-dark .trading-records[data-v] .ant-pagination-prev:hover .ant-pagination-item-link,
.theme-dark .trading-records[data-v] .ant-pagination-next:hover .ant-pagination-item-link,
body.dark .trading-records[data-v] .ant-pagination-prev:hover .ant-pagination-item-link,
body.dark .trading-records[data-v] .ant-pagination-next:hover .ant-pagination-item-link,
body.realdark .trading-records[data-v] .ant-pagination-prev:hover .ant-pagination-item-link,
body.realdark .trading-records[data-v] .ant-pagination-next:hover .ant-pagination-item-link {
  border-color: #1890ff !important;
  color: #1890ff !important;
}

.theme-dark .trading-records[data-v-8a68b65a] .ant-table-body,
.theme-dark .trading-records[data-v-8a68b65a] .ant-table-container,
.theme-dark .trading-records[data-v-8a68b65a] .ant-table-content,
.theme-dark .trading-records[data-v-8a68b65a] .ant-table-wrapper,
body.dark .trading-records[data-v-8a68b65a] .ant-table-body,
body.dark .trading-records[data-v-8a68b65a] .ant-table-container,
body.dark .trading-records[data-v-8a68b65a] .ant-table-content,
body.dark .trading-records[data-v-8a68b65a] .ant-table-wrapper,
body.realdark .trading-records[data-v-8a68b65a] .ant-table-body,
body.realdark .trading-records[data-v-8a68b65a] .ant-table-container,
body.realdark .trading-records[data-v-8a68b65a] .ant-table-content,
body.realdark .trading-records[data-v-8a68b65a] .ant-table-wrapper {
  scrollbar-width: thin;
  scrollbar-color: rgba(209, 212, 220, 0.3) transparent;
  &::-webkit-scrollbar {
    height: 6px;
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(209, 212, 220, 0.3);
    border-radius: 3px;
    &:hover {
      background: rgba(209, 212, 220, 0.5);
    }
  }
}

.theme-dark .trading-records[data-v] .ant-table-body,
.theme-dark .trading-records[data-v] .ant-table-container,
.theme-dark .trading-records[data-v] .ant-table-content,
.theme-dark .trading-records[data-v] .ant-table-wrapper,
body.dark .trading-records[data-v] .ant-table-body,
body.dark .trading-records[data-v] .ant-table-container,
body.dark .trading-records[data-v] .ant-table-content,
body.dark .trading-records[data-v] .ant-table-wrapper,
body.realdark .trading-records[data-v] .ant-table-body,
body.realdark .trading-records[data-v] .ant-table-container,
body.realdark .trading-records[data-v] .ant-table-content,
body.realdark .trading-records[data-v] .ant-table-wrapper {
  scrollbar-width: thin;
  scrollbar-color: rgba(209, 212, 220, 0.3) transparent;
  &::-webkit-scrollbar {
    height: 6px;
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(209, 212, 220, 0.3);
    border-radius: 3px;
    &:hover {
      background: rgba(209, 212, 220, 0.5);
    }
  }
}
</style>

<style lang="less">
.theme-dark .trading-records {
  ::v-deep .ant-table {
    background: #1c1c1c !important;
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table table {
    background: #1c1c1c !important;
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-thead > tr > th {
    background: #2a2e39 !important;
    color: #d1d4dc !important;
    border-bottom-color: #363c4e !important;
  }

  ::v-deep .ant-table-tbody {
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-tbody > tr > td {
    background: #1c1c1c !important;
    color: #d1d4dc !important;
    border-bottom-color: #363c4e !important;
  }

  ::v-deep .ant-table-tbody > tr > td,
  ::v-deep .ant-table-tbody > tr > td span:not(.ant-tag),
  ::v-deep .ant-table-tbody > tr > td div,
  ::v-deep .ant-table-tbody > tr > td *:not(.ant-tag) {
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-tbody > tr:hover > td {
    background: #2a2e39 !important;
  }

  ::v-deep .ant-table-placeholder {
    background: #1c1c1c !important;
    color: #868993 !important;
  }

  ::v-deep .ant-table-body,
  ::v-deep .ant-table-container,
  ::v-deep .ant-table-content,
  ::v-deep .ant-table-wrapper {
    scrollbar-width: thin;
    scrollbar-color: rgba(209, 212, 220, 0.3) transparent;
    &::-webkit-scrollbar {
      height: 6px;
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(209, 212, 220, 0.3);
      border-radius: 3px;
      &:hover {
        background: rgba(209, 212, 220, 0.5);
      }
    }
  }

  ::v-deep .ant-pagination {
    .ant-pagination-item {
      background: #1c1c1c !important;
      border-color: #363c4e !important;

      a {
        color: #d1d4dc !important;
      }

      &:hover {
        border-color: #1890ff !important;

        a {
          color: #1890ff !important;
        }
      }
    }

    .ant-pagination-item-active {
      background: #1890ff !important;
      border-color: #1890ff !important;

      a {
        color: #fff !important;
      }
    }

    .ant-pagination-prev,
    .ant-pagination-next {
      .ant-pagination-item-link {
        background: #1c1c1c !important;
        border-color: #363c4e !important;
        color: #d1d4dc !important;
      }

      &:hover .ant-pagination-item-link {
        border-color: #1890ff !important;
        color: #1890ff !important;
      }
    }

    .ant-pagination-options {
      .ant-select {
        .ant-select-selector {
          background: #1c1c1c !important;
          border-color: #363c4e !important;
          color: #d1d4dc !important;
        }
      }
    }
  }
}

body.dark .trading-records,
body.realdark .trading-records {
  ::v-deep .ant-table {
    background: #1c1c1c !important;
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table table {
    background: #1c1c1c !important;
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-thead > tr > th {
    background: #2a2e39 !important;
    color: #d1d4dc !important;
    border-bottom-color: #363c4e !important;
  }

  ::v-deep .ant-table-tbody {
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-tbody > tr > td {
    background: #1c1c1c !important;
    color: #d1d4dc !important;
    border-bottom-color: #363c4e !important;
  }

  ::v-deep .ant-table-tbody > tr > td,
  ::v-deep .ant-table-tbody > tr > td span:not(.ant-tag),
  ::v-deep .ant-table-tbody > tr > td div,
  ::v-deep .ant-table-tbody > tr > td *:not(.ant-tag) {
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-tbody > tr:hover > td {
    background: #2a2e39 !important;
  }

  ::v-deep .ant-table-placeholder {
    background: #1c1c1c !important;
    color: #868993 !important;
  }

  ::v-deep .ant-table-body,
  ::v-deep .ant-table-container,
  ::v-deep .ant-table-content,
  ::v-deep .ant-table-wrapper {
    scrollbar-width: thin;
    scrollbar-color: rgba(209, 212, 220, 0.3) transparent;
    &::-webkit-scrollbar {
      height: 6px;
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(209, 212, 220, 0.3);
      border-radius: 3px;
      &:hover {
        background: rgba(209, 212, 220, 0.5);
      }
    }
  }

  ::v-deep .ant-pagination {
    .ant-pagination-item {
      background: #1c1c1c !important;
      border-color: #363c4e !important;

      a {
        color: #d1d4dc !important;
      }

      &:hover {
        border-color: #1890ff !important;

        a {
          color: #1890ff !important;
        }
      }
    }

    .ant-pagination-item-active {
      background: #1890ff !important;
      border-color: #1890ff !important;

      a {
        color: #fff !important;
      }
    }

    .ant-pagination-prev,
    .ant-pagination-next {
      .ant-pagination-item-link {
        background: #1c1c1c !important;
        border-color: #363c4e !important;
        color: #d1d4dc !important;
      }

      &:hover .ant-pagination-item-link {
        border-color: #1890ff !important;
        color: #1890ff !important;
      }
    }

    .ant-pagination-options {
      .ant-select {
        .ant-select-selector {
          background: #1c1c1c !important;
          border-color: #363c4e !important;
          color: #d1d4dc !important;
        }
      }
    }
  }
}
</style>

<style lang="less">
.theme-dark .trading-records,
.theme-dark .trading-records *,
body.dark .trading-records,
body.dark .trading-records *,
body.realdark .trading-records,
body.realdark .trading-records * {
  ::v-deep .ant-table {
    background: #1c1c1c !important;
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table table {
    background: #1c1c1c !important;
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-thead > tr > th {
    background: #2a2e39 !important;
    color: #d1d4dc !important;
    border-bottom-color: #363c4e !important;
  }

  ::v-deep .ant-table-tbody {
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-tbody > tr > td {
    background: #1c1c1c !important;
    color: #d1d4dc !important;
    border-bottom-color: #363c4e !important;
  }

  ::v-deep .ant-table-tbody > tr > td,
  ::v-deep .ant-table-tbody > tr > td span:not(.ta-pnl):not(.ant-tag),
  ::v-deep .ant-table-tbody > tr > td div,
  ::v-deep .ant-table-tbody > tr > td *:not(.ant-tag):not(.ta-pnl) {
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-tbody > tr > td .ta-pnl-pos {
    color: #49c292 !important;
  }
  ::v-deep .ant-table-tbody > tr > td .ta-pnl-neg {
    color: #ff6b7a !important;
  }

  ::v-deep .ant-tag {
    &[color="green"], &[color="cyan"], &[color="lime"] {
      background: rgba(14, 203, 129, 0.22) !important;
      color: #49c292 !important;
      border: 1px solid rgba(14, 203, 129, 0.45) !important;
    }
    &[color="red"], &[color="magenta"] {
      background: rgba(246, 70, 93, 0.22) !important;
      color: #ff6b7a !important;
      border: 1px solid rgba(246, 70, 93, 0.45) !important;
    }
    &[color="orange"] {
      background: rgba(250, 173, 20, 0.22) !important;
      color: #faad14 !important;
      border: 1px solid rgba(250, 173, 20, 0.45) !important;
    }
    &[color="blue"] {
      background: rgba(24, 144, 255, 0.22) !important;
      color: #40a9ff !important;
      border: 1px solid rgba(24, 144, 255, 0.45) !important;
    }
    &[color="volcano"] {
      background: rgba(250, 84, 28, 0.22) !important;
      color: #ff7a45 !important;
      border: 1px solid rgba(250, 84, 28, 0.45) !important;
    }
    &[color="purple"] {
      background: rgba(114, 46, 209, 0.22) !important;
      color: #b37feb !important;
      border: 1px solid rgba(114, 46, 209, 0.45) !important;
    }
    &[color="geekblue"] {
      background: rgba(47, 84, 235, 0.22) !important;
      color: #85a5ff !important;
      border: 1px solid rgba(47, 84, 235, 0.45) !important;
    }
  }

  ::v-deep .ant-table-tbody > tr:hover > td {
    background: #2a2e39 !important;
  }

  ::v-deep .ant-table-placeholder {
    background: #1c1c1c !important;
    color: #868993 !important;
  }

  ::v-deep .ant-pagination {
    .ant-pagination-item {
      background: #1c1c1c !important;
      border-color: #363c4e !important;

      a {
        color: #d1d4dc !important;
      }

      &:hover {
        border-color: #1890ff !important;

        a {
          color: #1890ff !important;
        }
      }
    }

    .ant-pagination-item-active {
      background: #1890ff !important;
      border-color: #1890ff !important;

      a {
        color: #fff !important;
      }
    }

    .ant-pagination-prev,
    .ant-pagination-next {
      .ant-pagination-item-link {
        background: #1c1c1c !important;
        border-color: #363c4e !important;
        color: #d1d4dc !important;
      }

      &:hover .ant-pagination-item-link {
        border-color: #1890ff !important;
        color: #1890ff !important;
      }
    }

    .ant-pagination-options {
      .ant-select {
        .ant-select-selector {
          background: #1c1c1c !important;
          border-color: #363c4e !important;
          color: #d1d4dc !important;
        }
      }
    }
  }

  .records-header-bar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
    width: 100%;
  }

  .records-summary-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 8px;
    border: 1px dashed #cbd5e1;
    font-size: 13px;

    .summary-title {
      font-weight: 700;
      color: #334155;
    }

    .summary-items {
      display: flex;
      gap: 24px;
      align-items: center;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;

      .summary-label {
        color: #64748b;
      }

      .summary-value {
        font-weight: 700;
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
      }

      .commission-value {
        color: #334155;
      }
    }
  }

  &.theme-dark,
  .theme-dark & {
    .records-summary-bar {
      background: linear-gradient(135deg, #262a35 0%, #1c1f26 100%) !important;
      border-color: #3b4252 !important;
      
      .summary-title {
        color: #e5e9f0 !important;
      }

      .summary-label {
        color: #81899a !important;
      }

      .commission-value {
        color: #d8dee9 !important;
      }
    }
  }

  @media (max-width: 576px) {
    .records-header-bar {
      justify-content: stretch;
    }

    .records-summary-bar {
      width: 100%;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 12px;

      .summary-items {
        width: 100%;
        justify-content: space-between;
        gap: 12px;
      }
    }
  }
}
</style>
