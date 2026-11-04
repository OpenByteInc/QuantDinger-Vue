<template>
  <div class="trading-records strategy-tab-pane-inner" :class="{ 'theme-dark': isDark }">
    <p v-if="records.length || hasCostSummary" class="execution-note">
      <a-tag v-if="portfolio" color="purple">{{ $t('strategyV2.portfolio') }}</a-tag>
      {{ $t('trading-assistant.execution.systemSummary') }}
    </p>
    <div v-if="records.length || hasCostSummary" class="cost-summary-grid">
      <div v-for="item in costSummaryItems" :key="item.key" class="cost-summary-card">
        <span>{{ item.label }}</span>
        <strong :class="item.tone">{{ item.value }}</strong>
      </div>
    </div>
    <div v-if="records.length === 0 && !isRecordsLoading" class="empty-state strategy-tab-empty">
      <a-empty :image="false" :description="$t('trading-assistant.table.noTrades')" />
    </div>
    <a-alert
      v-if="costSummary && costSummary.pnl_pending_count"
      class="execution-reconciliation-alert"
      type="warning"
      show-icon
      :message="$t('trading-assistant.execution.gridPendingSummary', { count: costSummary.pnl_pending_count })"
    />
    <p v-if="records.length" class="execution-note execution-source-note">
      <a-icon type="info-circle" />
      <span>{{ $t('trading-assistant.execution.note') }}</span>
    </p>
    <a-table
      v-if="records.length > 0 || isRecordsLoading"
      class="execution-records-table"
      :columns="columns"
      :data-source="records"
      :loading="isRecordsLoading"
      :pagination="{ pageSize: 10 }"
      size="small"
      rowKey="id"
      :scroll="{ x: 1370 }"
    >
      <template slot="type" slot-scope="text, record">
        <div class="trade-type-cell">
          <a-tag :color="getTradeTypeColor(text)" class="trade-type-tag">
            {{ getTradeTypeText(text) }}
          </a-tag>
          <div class="trade-type-desc">{{ getTradeActionDescription(record) }}</div>
        </div>
      </template>
      <template slot="instrument" slot-scope="text, record">
        <span class="trade-instrument">{{ formatTradeInstrument(record) }}</span>
      </template>
      <template slot="execution" slot-scope="text, record">
        <div class="execution-cell">
          <a-tooltip :title="formatExecutionNumber(record.price) + (record.exchange_order_id ? ' · ' + $t('trading-assistant.execution.orderId') + ': ' + record.exchange_order_id : '')">
            <strong>{{ formatExecutionPrice(record.price) }}</strong>
          </a-tooltip>
          <a-tooltip :title="$t('trading-assistant.table.amount') + ': ' + formatExecutionNumber(record.amount) + ' · ' + $t('trading-assistant.table.value') + ': ' + formatTradeValue(record.value)">
            <small>{{ formatExecutionNumber(record.amount) }} · {{ formatTradeValue(record.value) }}</small>
          </a-tooltip>
        </div>
      </template>
      <template slot="execution_quality" slot-scope="text, record">
        <div class="execution-quality-cell">
          <a-tooltip :title="formatExecutionNumber(record.reference_price)">
            <strong>{{ formatExecutionPrice(record.reference_price) }}</strong>
          </a-tooltip>
          <a-tooltip :title="executionDeviationHint(record)">
            <small>{{ formatExecutionDeviation(record.price_deviation_pct, record) }}</small>
          </a-tooltip>
        </div>
      </template>
      <template slot="exchange_pnl" slot-scope="text, record">
        <a-popover
          v-if="text && text.status === 'reported'"
          placement="top"
          trigger="hover"
          :overlay-class-name="isDark ? 'strategy-pnl-popover strategy-pnl-popover--dark' : 'strategy-pnl-popover'"
        >
          <div slot="content" class="pnl-breakdown">
            <div class="pnl-breakdown__header">
              <div>
                <strong>{{ $t('trading-assistant.execution.exchangePnl') }}</strong>
                <p>{{ $t('trading-assistant.execution.exchangePnlHint') }}</p>
              </div>
            </div>
            <div class="pnl-breakdown__badge">{{ $t('trading-assistant.execution.' + text.fee_basis) }}</div>
            <div class="pnl-breakdown__rows">
              <div class="pnl-breakdown__row"><span>{{ $t('trading-assistant.execution.orderId') }}</span><strong>{{ text.order_id }}</strong></div>
              <div class="pnl-breakdown__row"><span>{{ $t('trading-assistant.execution.reportedQuantity') }}</span><strong>{{ formatExecutionNumber(text.quantity) }}</strong></div>
              <div class="pnl-breakdown__row"><span>{{ $t('trading-assistant.execution.reportSource') }}</span><strong>{{ text.source }}</strong></div>
            </div>
          </div>
          <span :class="['ta-pnl', { 'ta-pnl-pos': text.amount > 0, 'ta-pnl-neg': text.amount < 0 }]">{{ formatReportedPnl(text, record) }}</span>
        </a-popover>
        <span v-else class="pnl-status">{{ formatReportedPnl(text, record) }}</span>
      </template>
      <template slot="profit" slot-scope="text, record">
        <a-popover
          v-if="hasRealizedProfit(record) || record.pnl_source === 'grid_exchange_order_pairs'"
          placement="top"
          trigger="hover"
          :overlay-class-name="isDark ? 'strategy-pnl-popover strategy-pnl-popover--dark' : 'strategy-pnl-popover'"
        >
          <div slot="content" class="pnl-breakdown">
            <div class="pnl-breakdown__header">
              <div>
                <strong>{{ $t(record.pnl_source === 'grid_exchange_order_pairs' ? 'trading-assistant.execution.gridNetPnl' : 'trading-assistant.execution.systemPnl') }}</strong>
                <p>{{ $t(record.pnl_source === 'grid_exchange_order_pairs' ? 'trading-assistant.execution.gridPnlHint' : 'trading-assistant.execution.pnlHint') }}</p>
              </div>
            </div>
            <div class="pnl-breakdown__rows">
              <div class="pnl-breakdown__row"><span>{{ $t('trading-assistant.costs.grossRealized') }}</span><strong :class="moneyTone(record.profit_gross)">{{ formatSignedMoney(record.profit_gross) }}</strong></div>
              <div class="pnl-breakdown__row"><span>{{ $t('trading-assistant.costs.openingCommission') }}</span><strong :class="expenseTone(record.open_commission_allocated)">{{ formatExpense(record.open_commission_allocated) }}</strong></div>
              <div class="pnl-breakdown__row"><span>{{ $t('trading-assistant.costs.closingCommission') }}</span><strong :class="expenseTone(record.close_commission)">{{ formatExpense(record.close_commission) }}</strong></div>
            </div>
            <div v-for="(match, index) in record.matched_orders || []" :key="index" class="grid-order-match">
              <p>{{ $t('trading-assistant.execution.entryOrders') }}: {{ match.entry_order_ids.join(', ') }}</p>
              <p>{{ $t('trading-assistant.execution.exitOrder') }}: {{ match.exit_order_id }}</p>
              <p>{{ $t('trading-assistant.table.amount') }}: {{ formatExecutionNumber(match.quantity) }}</p>
              <p>{{ formatExecutionPrice(match.entry_price) }} → {{ formatExecutionPrice(match.exit_price) }}</p>
            </div>
            <div :class="['pnl-breakdown-total', moneyTone(netTradePnl(record))]"><span>{{ $t('trading-assistant.costs.netRealized') }}</span><strong>{{ formatProfit(record) }}</strong></div>
          </div>
          <span :class="['ta-pnl', profitToneClass(record)]">{{ formatProfit(record) }}</span>
        </a-popover>
        <span v-else :class="['ta-pnl', profitToneClass(record)]">{{ formatProfit(record) }}</span>
      </template>
      <template slot="grid_matched_profit" slot-scope="text, record">
        <span :class="['ta-pnl', gridProfitToneClass(record)]">
          {{ formatGridProfit(record) }}
        </span>
      </template>
      <template slot="commission" slot-scope="text, record">
        <a-tooltip v-if="record.fee_source === 'virtual_simulation'" :title="virtualFeeBasis(record)">
          <span>{{ formatCommission(text, record) }}</span>
        </a-tooltip>
        <span v-else>{{ formatCommission(text, record) }}</span>
      </template>
      <template slot="time" slot-scope="text, record">
        {{ formatTime(record.created_at || text) }}
      </template>
    </a-table>
  </div>
</template>

<script>
import { getStrategyTrades } from '@/api/strategy'
import { formatExecutionNumber, formatExecutionPrice, formatPriceDeviation, formatTradeMoney } from '@/utils/tradeExecution'
import { formatTradeCommission } from '@/utils/tradeCommission'
import { formatUserDateTime, formatBrowserLocalDateTime, getUserTimezoneFromStorage } from '@/utils/userTime'

const SYSTEM_PNL_FIELDS = [
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

function hasSystemPnlResult (record) {
  if (!record || typeof record !== 'object') return false
  if (record.pnl_source === 'grid_exchange_order_pairs' && record.pnl_status !== 'matched') return false
  const raw = SYSTEM_PNL_FIELDS.map(key => record[key])
    .find(value => value !== null && value !== undefined && value !== '')
  const value = Number(raw)
  if (!Number.isFinite(value)) return false
  const openTypes = ['open_long', 'open_short', 'add_long', 'add_short']
  return !openTypes.includes(String(record.type || '').toLowerCase()) || Math.abs(value) >= 1e-9
}

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
    portfolio: {
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
    isRecordsLoading () {
      return this.loading || this.recordsLoading
    },
    isGridBot () {
      const bt = String(this.botType || '').toLowerCase()
      return bt === 'grid' || bt === 'dca'
    },
    hasCostSummary () {
      return !!this.costSummary
    },
    showExchangePnlColumn () {
      if (!this.records.length) return true
      const hiddenStatuses = new Set(['not_applicable', 'not_applicable_spot', 'unsupported'])
      return !this.records.every(record => {
        const status = record && record.exchange_pnl && record.exchange_pnl.status
        return hiddenStatuses.has(String(status || '').toLowerCase())
      })
    },
    costSummaryItems () {
      const summary = this.costSummary || {}
      const funding = Number(summary.funding_payment || 0)
      const items = [
        { key: 'gross', label: this.$t('trading-assistant.costs.grossRealized'), value: this.formatSignedMoney(summary.gross_realized_pnl), tone: this.moneyTone(summary.gross_realized_pnl) },
        { key: 'openFee', label: this.$t('trading-assistant.costs.openingCommission'), value: this.formatExpense(summary.opening_commission), tone: this.moneyTone(-summary.opening_commission) },
        { key: 'closeFee', label: this.$t('trading-assistant.costs.closingCommission'), value: this.formatExpense(summary.closing_commission), tone: this.moneyTone(-summary.closing_commission) }
      ]
      const brokerPayments = [
        { key: 'regulatory', label: this.$t('trading-assistant.costs.regulatoryFees'), raw: summary.regulatory_payment },
        { key: 'adr', label: this.$t('trading-assistant.costs.adrFees'), raw: summary.adr_payment },
        { key: 'marginInterest', label: this.$t('trading-assistant.costs.marginInterest'), raw: summary.margin_interest_payment },
        { key: 'brokerOther', label: this.$t('trading-assistant.costs.otherBrokerFees'), raw: summary.other_broker_payment }
      ]
      if (summary.broker_activity_applicable || brokerPayments.some(item => Math.abs(Number(item.raw || 0)) > 0)) {
        brokerPayments.forEach(item => items.push({
          ...item,
          value: this.formatSignedMoney(item.raw),
          tone: this.moneyTone(item.raw)
        }))
      }
      items.push(
        ...(summary.slippage_cost !== null && summary.slippage_cost !== undefined
          ? [{ key: 'slippage', label: this.$t('trading-assistant.costs.slippage'), value: this.formatExpense(summary.slippage_cost), tone: this.moneyTone(-summary.slippage_cost) }]
          : []),
        { key: 'funding', label: this.$t('trading-assistant.costs.funding'), value: this.formatSignedMoney(funding), tone: this.moneyTone(funding) },
        { key: 'net', label: this.$t('trading-assistant.costs.netRealized'), value: this.formatSignedMoney(summary.net_realized_pnl), tone: this.moneyTone(summary.net_realized_pnl) }
      )
      return items
    },
    columns () {
      const cols = [
        {
          title: this.$t('trading-assistant.table.time'),
          dataIndex: 'created_at',
          key: 'created_at',
          width: 150,
          scopedSlots: { customRender: 'time' }
        },
        {
          title: this.$t('trading-assistant.table.typeAndAction'),
          dataIndex: 'type',
          key: 'type',
          width: 190,
          scopedSlots: { customRender: 'type' }
        },
        {
          title: this.$t('trading-assistant.table.instrument'),
          dataIndex: 'symbol',
          key: 'symbol',
          width: 110,
          scopedSlots: { customRender: 'instrument' }
        },
        {
          title: this.$t('trading-assistant.execution.fillSummary'),
          dataIndex: 'price',
          key: 'execution',
          width: 190,
          scopedSlots: { customRender: 'execution' }
        },
        {
          title: this.$t(this.records.some(r => r.pnl_source === 'grid_exchange_order_pairs') ? 'trading-assistant.execution.gridNetPnl' : 'trading-assistant.execution.systemPnl'),
          dataIndex: 'profit',
          key: 'profit',
          className: 'pnl-column',
          width: 150,
          scopedSlots: { customRender: 'profit' }
        }
      ]
      if (this.isGridBot && !this.records.some(r => r.pnl_source === 'grid_exchange_order_pairs')) {
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
          width: 120,
          scopedSlots: { customRender: 'commission' }
        })
      if (this.showExchangePnlColumn) {
        cols.push({
          title: this.$t('trading-assistant.execution.exchangePnl'),
          dataIndex: 'exchange_pnl',
          key: 'exchange_pnl',
          className: 'pnl-column',
          width: 170,
          scopedSlots: { customRender: 'exchange_pnl' }
        })
      }
      cols.push({
          title: this.$t('trading-assistant.execution.qualitySummary'),
          dataIndex: 'reference_price',
          key: 'execution_quality',
          width: 160,
          scopedSlots: { customRender: 'execution_quality' }
        })
      return cols
    }
  },
  data () {
    return {
      records: [],
      costSummary: null,
      recordsLoading: false,
      recordsRequestId: 0
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
    formatExecutionNumber,
    formatExecutionPrice,
    formatPriceDeviation,
    formatTradeValue (value) {
      return formatTradeMoney(value)
    },
    formatReportedPnl (report, record) {
      if (!report || report.status === 'not_applicable') return '--'
      if (report.status === 'unsupported') {
        return this.$t('trading-assistant.execution.reportUnsupported')
      }
      if (report.status === 'not_applicable_spot') {
        return this.$t('trading-assistant.execution.spotPnlNotApplicable')
      }
      if (report.status === 'reported') {
        return formatTradeMoney(report.amount, true).replace('$', '') + ' ' + report.currency
      }
      const systemPnlAvailable = hasSystemPnlResult(record)
      const key = report.status === 'order_total_elsewhere'
        ? 'orderTotalElsewhere'
        : (report.status === 'pending'
            ? (systemPnlAvailable ? 'reportPendingWithSystem' : 'reportPending')
            : 'reportUnavailable')
      return this.$t('trading-assistant.execution.' + key)
    },
    formatTradeInstrument (record) {
      if (!record || typeof record !== 'object') return '--'
      const raw = record.symbol || record.symbol_canonical || record.instrument || record.inst_id || record.ticker
      if (raw === null || raw === undefined || String(raw).trim() === '') return '--'
      return String(raw)
        .trim()
        .replace(/^(Crypto|USStock|CNStock|HKStock|Forex|Commodity|Future):/i, '')
        .replace(/@(spot|swap|future|futures)$/i, '')
    },
    async loadRecords () {
      if (!this.strategyId) return

      const requestId = ++this.recordsRequestId
      this.recordsLoading = true
      try {
        const res = await getStrategyTrades(this.strategyId, this.$i18n && this.$i18n.locale)
        if (requestId !== this.recordsRequestId) return
        if (res.code === 1) {
          const list = res.data.trades || res.data.items || []
          this.costSummary = res.data.cost_summary || null
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
            if (t.commission_quote !== null && t.commission_quote !== undefined && t.commission_quote !== '') {
              const cq = parseFloat(t.commission_quote)
              t.commission_quote = isNaN(cq) ? null : cq
            }
            const price = t.price != null ? parseFloat(t.price) : null
            const amount = t.amount != null ? parseFloat(t.amount) : null
            if ((t.value == null || t.value === '') && price != null && amount != null && !isNaN(price) && !isNaN(amount)) {
              t.value = price * amount
            }
            return t
          })
        } else {
          this.$message.error(res.msg || this.$t('trading-assistant.messages.loadTradesFailed'))
        }
      } catch (error) {
      } finally {
        if (requestId === this.recordsRequestId) this.recordsLoading = false
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
      if (row.pnl_source === 'grid_exchange_order_pairs' && row.pnl_status !== 'matched') return null
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
      const cm = row && (row.commission_quote != null
        ? row.commission_quote
        : (row.commission != null ? row.commission : row.fee))
      if (cm !== null && cm !== undefined && cm !== '') {
        const c = parseFloat(cm)
        if (!isNaN(c)) fee = c
      }
      const openFee = parseFloat(row.open_commission_allocated || 0)
      return p - fee - (isNaN(openFee) ? 0 : openFee)
    },
    pickTradeProfitRaw (row) {
      if (!row || typeof row !== 'object') return null
      for (const k of SYSTEM_PNL_FIELDS) {
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

        const loc = String((this.$i18n && this.$i18n.locale) || 'zh-CN').toLowerCase()
        const preferEn = loc.startsWith('en')
        const note = preferEn
          ? (record.action_note_en || record.action_note)
          : (record.action_note || record.action_note_en)
        if (note) return note
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
        buy: 'green',
        sell: 'red',
        liquidation: 'volcano',
        open_long: 'green',
        add_long: 'cyan',
        close_long: 'orange',
        close_long_stop: 'red',
        close_long_profit: 'lime',
        close_long_trailing: 'purple',
        reduce_long: 'geekblue',
        open_short: 'magenta',
        add_short: 'volcano',
        close_short: 'blue',
        close_short_stop: 'red',
        close_short_profit: 'cyan',
        close_short_trailing: 'purple',
        reduce_short: 'geekblue'
      }
      return colorMap[ty] || 'default'
    },
    getTradeTypeText (type) {
      const ty = String(type || '').toLowerCase()
      const textMap = {
        buy: this.$t('dashboard.indicator.backtest.buy'),
        sell: this.$t('dashboard.indicator.backtest.sell'),
        liquidation: this.$t('dashboard.indicator.backtest.liquidation'),
        open_long: this.$t('dashboard.indicator.backtest.openLong'),
        add_long: this.$t('dashboard.indicator.backtest.addLong'),
        close_long: this.$t('dashboard.indicator.backtest.closeLong'),
        close_long_stop: this.$t('dashboard.indicator.backtest.closeLongStop'),
        close_long_profit: this.$t('dashboard.indicator.backtest.closeLongProfit'),
        close_long_trailing: this.$t('dashboard.indicator.backtest.closeLongTrailing'),
        reduce_long: this.$t('dashboard.indicator.backtest.reduceLong'),
        open_short: this.$t('dashboard.indicator.backtest.openShort'),
        add_short: this.$t('dashboard.indicator.backtest.addShort'),
        close_short: this.$t('dashboard.indicator.backtest.closeShort'),
        close_short_stop: this.$t('dashboard.indicator.backtest.closeShortStop'),
        close_short_profit: this.$t('dashboard.indicator.backtest.closeShortProfit'),
        close_short_trailing: this.$t('dashboard.indicator.backtest.closeShortTrailing'),
        reduce_short: this.$t('dashboard.indicator.backtest.reduceShort')
      }
      return textMap[ty] || type
    },
    formatMoney (value) {
      if (value === null || value === undefined) return '--'
      return formatTradeMoney(value, true)
    },
    formatSignedMoney (value) {
      return formatTradeMoney(value, true)
    },
    formatExpense (value) {
      if (value === null || value === undefined || value === '') return '--'
      return formatTradeMoney(-Number(value), true)
    },
    expenseTone (value) {
      if (value === null || value === undefined || value === '') return 'cost-neutral'
      return this.moneyTone(-Number(value))
    },
    moneyTone (value) {
      const number = Number(value || 0)
      if (number > 0) return 'cost-positive'
      if (number < 0) return 'cost-negative'
      return 'cost-neutral'
    },
    hasRealizedProfit (record) {
      return record && record.profit_gross !== null && record.profit_gross !== undefined
    },
    formatProfit (record) {
      if (record && record.pnl_status === 'unmatched') return this.$t('trading-assistant.execution.pairPending')
      if (record && record.pnl_status === 'fees_pending') return this.$t('trading-assistant.execution.feesPending')
      const net = this.netTradePnl(record)
      if (net === null) return '--'

      const numValue = net

      const openTypes = ['open_long', 'open_short', 'add_long', 'add_short']
      if (numValue === 0 && record && openTypes.includes(record.type)) {
        return '--'
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
      return formatTradeCommission(record || { commission: value }, key => this.$t(key))
    },
    formatExecutionDeviation (value, record) {
      const normalized = record && record.fee_source === 'virtual_simulation'
        ? Math.abs(Number(value))
        : value
      return formatPriceDeviation(normalized)
    },
    executionDeviationHint (record) {
      if (record && record.fee_source === 'virtual_simulation') {
        return this.$t('trading-assistant.execution.virtualSlippageBasis', {
          rate: (Number(record.slippage_rate || 0) * 100).toFixed(4)
        })
      }
      return this.$t('trading-assistant.execution.deviationHint')
    },
    virtualFeeBasis (record) {
      return this.$t('trading-assistant.execution.virtualFeeBasis', {
        rate: (Number(record.commission_rate || 0) * 100).toFixed(4),
        leverage: Number(record.leverage || 1).toFixed(2)
      })
    }
  }
}
</script>

<style lang="less" scoped>
.trading-records ::v-deep .ant-table .pnl-column {
  white-space: normal;
  overflow-wrap: anywhere;
  .ta-pnl, .pnl-status {
    display: inline-block;
    max-width: 100%;
    white-space: normal;
  }
  .ta-pnl.ta-pnl-pos { color: #0ecb81 !important; }
  .ta-pnl.ta-pnl-neg { color: #f6465d !important; }
}

.execution-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 12px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.55;
}
@primary-color: #1890ff;
@success-color: #0ecb81;
@danger-color: #f6465d;

.trading-records {
  width: 100%;
  min-height: 300px;
  padding: 0;
  overflow-x: visible;
  overflow-y: visible;

  .cost-summary-grid {
    display: grid;
    grid-auto-columns: minmax(132px, 1fr);
    grid-auto-flow: column;
    gap: 8px;
    margin-bottom: 12px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: thin;
  }
  .cost-summary-card {
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--sc-border, #e2e8f0);
    border-radius: var(--sc-radius-sm, 6px);
    background: var(--sc-surface-subtle, #fff);
    span { display: block; margin-bottom: 4px; overflow: hidden; color: var(--sc-muted, #64748b); font-size: 11px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
    strong { display: block; overflow: hidden; color: var(--sc-text, #17202d); font-size: 15px; font-weight: 650; line-height: 1.35; font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }
  }
  .cost-positive { color: var(--sc-positive, @success-color); }
  .cost-negative { color: var(--sc-negative, @danger-color); }
  .cost-neutral { color: var(--sc-muted, #64748b); }

  .execution-reconciliation-alert {
    margin: 4px 0 0;
    padding: 10px 14px;
    padding-inline-start: 40px;
    border: 1px solid #f5d98d;
    border-radius: 9px;
    background: linear-gradient(90deg, #fffaf0 0%, #fffcf5 100%);

    ::v-deep .ant-alert-icon {
      top: 13px;
      color: #d99a00;
    }

    ::v-deep .ant-alert-message {
      color: #6f5313;
      font-size: 12px;
      font-weight: 550;
      line-height: 1.55;
      overflow-wrap: anywhere;
    }
  }

  .execution-source-note {
    align-items: flex-start;
    margin: 8px 0 12px;
    padding: 8px 12px;
    border: 1px solid #e7edf4;
    border-radius: 8px;
    background: #f8fafc;
    color: #748196;

    .anticon {
      flex: 0 0 auto;
      margin-top: 3px;
      color: #8da0b8;
    }
  }
  &.theme-dark .cost-summary-card {
    background: var(--sc-surface-subtle, #171717);
    border-color: var(--sc-border, rgba(255, 255, 255, 0.1));
    span { color: var(--sc-muted, rgba(255, 255, 255, 0.48)); }
    strong { color: var(--sc-text, #e4e7ec); }
    .cost-positive { color: var(--sc-positive, #49c292); }
    .cost-negative { color: var(--sc-negative, #ff6b7a); }
    .cost-neutral { color: var(--sc-muted, #8f98a6); }
  }

  &.theme-dark .execution-reconciliation-alert {
    border-color: rgba(250, 173, 20, 0.28);
    background: linear-gradient(90deg, rgba(250, 173, 20, 0.12) 0%, rgba(250, 173, 20, 0.06) 100%);

    ::v-deep .ant-alert-icon {
      color: #ffc53d;
    }

    ::v-deep .ant-alert-message {
      color: #f2d489;
    }
  }

  &.theme-dark .execution-source-note {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.035);
    color: rgba(255, 255, 255, 0.5);

    .anticon {
      color: rgba(255, 255, 255, 0.38);
    }
  }

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

  .trade-instrument {
    color: #0f172a;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .execution-cell,
  .execution-quality-cell {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 3px;
    font-variant-numeric: tabular-nums;
    strong { overflow: hidden; color: var(--sc-text, #17202d); font-size: 12px; font-weight: 650; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
    small { overflow: hidden; color: var(--sc-muted, #64748b); font-size: 10px; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
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
  &.theme-dark .trade-instrument {
    color: rgba(255, 255, 255, 0.88);
  }
  &.theme-dark .execution-cell,
  &.theme-dark .execution-quality-cell {
    strong { color: var(--sc-text, #e4e7ec); }
    small { color: var(--sc-muted, #8f98a6); }
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
    padding: 9px 12px;
    font-size: 12px;
  }

  ::v-deep .ant-table-tbody > tr > td {
    padding: 9px 12px;
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
        background: linear-gradient(135deg, @primary-color 0%, var(--primary-color-hover, #40a9ff) 100%);
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

  ::v-deep .execution-records-table .ant-table-pagination.ant-pagination {
    float: none;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 3px;
    width: fit-content;
    margin: 14px 10px 10px auto;
    padding: 5px;
    border: 1px solid #e5eaf1;
    border-radius: 10px;
    background: #f8fafc;
    box-shadow: 0 3px 10px rgba(15, 23, 42, 0.045);

    .ant-pagination-item,
    .ant-pagination-prev,
    .ant-pagination-next {
      min-width: 30px;
      height: 30px;
      margin: 0 !important;
      line-height: 28px;
    }

    .ant-pagination-item,
    .ant-pagination-prev .ant-pagination-item-link,
    .ant-pagination-next .ant-pagination-item-link {
      border: 0 !important;
      border-radius: 7px !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .ant-pagination-item a,
    .ant-pagination-prev .ant-pagination-item-link,
    .ant-pagination-next .ant-pagination-item-link {
      color: #66758a;
    }

    .ant-pagination-item:hover,
    .ant-pagination-prev:hover .ant-pagination-item-link,
    .ant-pagination-next:hover .ant-pagination-item-link {
      background: #edf3f9 !important;
      color: var(--primary-color, #1890ff) !important;
    }

    .ant-pagination-item-active {
      background: var(--primary-color, #1890ff) !important;
      box-shadow: 0 3px 8px rgba(24, 144, 255, 0.24) !important;

      a {
        color: #fff !important;
        font-weight: 650;
      }
    }

    .ant-pagination-disabled .ant-pagination-item-link {
      color: #c6ced8 !important;
      background: transparent !important;
    }
  }

  &.theme-dark,
  .theme-dark & {
    ::v-deep .ant-table {
      background: #1c1c1c !important;
      color: #d1d4dc !important;
    }

    ::v-deep .ant-table-thead > tr > th {
      background: #222222 !important;
      color: #d1d4dc !important;
      border-bottom-color: #333333 !important;
      font-weight: 600;
    }

    ::v-deep .ant-table-tbody > tr > td {
      background: #1c1c1c !important;
      color: #d1d4dc !important;
      border-bottom-color: #333333 !important;
    }

    ::v-deep .ant-table-tbody > tr:hover > td {
      background: #222222 !important;
    }

    ::v-deep .ant-table-tbody > tr > td span:not(.ant-tag) {
      color: #d1d4dc !important;
    }

    ::v-deep .ant-empty .ant-empty-description {
      color: rgba(255, 255, 255, 0.35);
    }

    ::v-deep .execution-records-table .ant-table-pagination.ant-pagination {
      border-color: rgba(255, 255, 255, 0.09);
      background: #181a1e;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);

      .ant-pagination-item,
      .ant-pagination-prev .ant-pagination-item-link,
      .ant-pagination-next .ant-pagination-item-link {
        background: transparent !important;
        border-color: transparent !important;
      }

      .ant-pagination-item a,
      .ant-pagination-prev .ant-pagination-item-link,
      .ant-pagination-next .ant-pagination-item-link {
        color: #aeb6c2 !important;
      }

      .ant-pagination-item:hover,
      .ant-pagination-prev:hover .ant-pagination-item-link,
      .ant-pagination-next:hover .ant-pagination-item-link {
        background: rgba(255, 255, 255, 0.07) !important;
        color: #fff !important;
      }

      .ant-pagination-item-active {
        background: var(--primary-color, #1890ff) !important;

        a {
          color: #fff !important;
        }
      }
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
        color: var(--primary-color-hover, #40a9ff) !important;
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
  border-bottom-color: #333333 !important;
}

.theme-dark .trading-records .ant-table-thead > tr > th,
.theme-dark .trading-records[data-v] .ant-table-thead > tr > th,
body.dark .trading-records .ant-table-thead > tr > th,
body.realdark .trading-records .ant-table-thead > tr > th {
  background: #222222 !important;
  color: #d1d4dc !important;
  border-bottom-color: #333333 !important;
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
  background: #222222 !important;
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
  background: #222222 !important;
}

body.dark .trading-records[data-v-8a68b65a] .ant-table-tbody > tr > td,
body.realdark .trading-records[data-v-8a68b65a] .ant-table-tbody > tr > td {
  color: #d1d4dc !important;
  background: #1c1c1c !important;
  border-bottom-color: #333333 !important;
}

body.dark .trading-records[data-v-8a68b65a] .ant-table-thead > tr > th,
body.realdark .trading-records[data-v-8a68b65a] .ant-table-thead > tr > th {
  background: #222222 !important;
  color: #d1d4dc !important;
  border-bottom-color: #333333 !important;
}

.theme-dark .trading-records[data-v] .ant-table-tbody > tr > td,
body.dark .trading-records[data-v] .ant-table-tbody > tr > td,
body.realdark .trading-records[data-v] .ant-table-tbody > tr > td {
  color: #d1d4dc !important;
  background: #1c1c1c !important;
  border-bottom-color: #333333 !important;
}

.theme-dark .trading-records[data-v] .ant-table-thead > tr > th,
body.dark .trading-records[data-v] .ant-table-thead > tr > th,
body.realdark .trading-records[data-v] .ant-table-thead > tr > th {
  background: #222222 !important;
  color: #d1d4dc !important;
  border-bottom-color: #333333 !important;
}

.theme-dark .trading-records[data-v-8a68b65a] .ant-pagination-item,
body.dark .trading-records[data-v-8a68b65a] .ant-pagination-item,
body.realdark .trading-records[data-v-8a68b65a] .ant-pagination-item {
  background: #1c1c1c !important;
  border-color: #333333 !important;

  a {
    color: #d1d4dc !important;
  }

  &:hover {
    border-color: var(--primary-color, #1890ff) !important;

    a {
      color: var(--primary-color, #1890ff) !important;
    }
  }
}

.theme-dark .trading-records[data-v-8a68b65a] .ant-pagination-item-active,
body.dark .trading-records[data-v-8a68b65a] .ant-pagination-item-active,
body.realdark .trading-records[data-v-8a68b65a] .ant-pagination-item-active {
  background: var(--primary-color, #1890ff) !important;
  border-color: var(--primary-color, #1890ff) !important;

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
  border-color: #333333 !important;
  color: #d1d4dc !important;
}

.theme-dark .trading-records[data-v-8a68b65a] .ant-pagination-prev:hover .ant-pagination-item-link,
.theme-dark .trading-records[data-v-8a68b65a] .ant-pagination-next:hover .ant-pagination-item-link,
body.dark .trading-records[data-v-8a68b65a] .ant-pagination-prev:hover .ant-pagination-item-link,
body.dark .trading-records[data-v-8a68b65a] .ant-pagination-next:hover .ant-pagination-item-link,
body.realdark .trading-records[data-v-8a68b65a] .ant-pagination-prev:hover .ant-pagination-item-link,
body.realdark .trading-records[data-v-8a68b65a] .ant-pagination-next:hover .ant-pagination-item-link {
  border-color: var(--primary-color, #1890ff) !important;
  color: var(--primary-color, #1890ff) !important;
}

.theme-dark .trading-records[data-v] .ant-pagination-item,
body.dark .trading-records[data-v] .ant-pagination-item,
body.realdark .trading-records[data-v] .ant-pagination-item {
  background: #1c1c1c !important;
  border-color: #333333 !important;

  a {
    color: #d1d4dc !important;
  }

  &:hover {
    border-color: var(--primary-color, #1890ff) !important;

    a {
      color: var(--primary-color, #1890ff) !important;
    }
  }
}

.theme-dark .trading-records[data-v] .ant-pagination-item-active,
body.dark .trading-records[data-v] .ant-pagination-item-active,
body.realdark .trading-records[data-v] .ant-pagination-item-active {
  background: var(--primary-color, #1890ff) !important;
  border-color: var(--primary-color, #1890ff) !important;

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
  border-color: #333333 !important;
  color: #d1d4dc !important;
}

.theme-dark .trading-records[data-v] .ant-pagination-prev:hover .ant-pagination-item-link,
.theme-dark .trading-records[data-v] .ant-pagination-next:hover .ant-pagination-item-link,
body.dark .trading-records[data-v] .ant-pagination-prev:hover .ant-pagination-item-link,
body.dark .trading-records[data-v] .ant-pagination-next:hover .ant-pagination-item-link,
body.realdark .trading-records[data-v] .ant-pagination-prev:hover .ant-pagination-item-link,
body.realdark .trading-records[data-v] .ant-pagination-next:hover .ant-pagination-item-link {
  border-color: var(--primary-color, #1890ff) !important;
  color: var(--primary-color, #1890ff) !important;
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

.pnl-breakdown {
  width: 380px;
  max-width: calc(100vw - 48px);
  font-variant-numeric: tabular-nums;

  .pnl-breakdown__header {
    padding-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;
    > div { min-width: 0; }
    strong { display: block; color: #17202d; font-size: 14px; font-weight: 650; line-height: 1.4; }
    p { margin: 4px 0 0; color: #64748b; font-size: 11px; line-height: 1.55; }
  }

  .pnl-breakdown__badge {
    display: inline-flex;
    margin-top: 10px;
    padding: 3px 8px;
    border: 1px solid rgba(24, 144, 255, 0.22);
    border-radius: 999px;
    color: var(--primary-color, #1890ff);
    background: rgba(24, 144, 255, 0.06);
    font-size: 10px;
    line-height: 1.4;
  }

  .pnl-breakdown__rows { padding-top: 8px; }
  .pnl-breakdown__row,
  .pnl-breakdown-total {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    min-height: 28px;
    padding: 4px 0;
    span { color: #64748b; font-size: 12px; }
    strong { overflow: hidden; color: #17202d; font-size: 12px; font-weight: 650; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
  }
  .pnl-breakdown-total {
    margin-top: 6px;
    padding: 10px 10px 6px;
    border-top: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #f8fafc;
    strong { font-size: 13px; }
  }
  .pnl-breakdown__row strong.cost-positive,
  .pnl-breakdown-total.cost-positive strong { color: #0ecb81; }
  .pnl-breakdown__row strong.cost-negative,
  .pnl-breakdown-total.cost-negative strong { color: #f6465d; }
  .pnl-breakdown__row strong.cost-neutral,
  .pnl-breakdown-total.cost-neutral strong { color: #64748b; }
  .pnl-breakdown-total.cost-positive { background: rgba(14, 203, 129, 0.07); }
  .pnl-breakdown-total.cost-negative { background: rgba(246, 70, 93, 0.07); }
  .grid-order-match {
    margin-top: 8px;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #f8fafc;
    p { margin: 0; color: #64748b; font-size: 11px; line-height: 1.55; }
  }
}

@media (max-width: 1100px) {
  .trading-records .cost-summary-grid { grid-auto-columns: minmax(140px, 1fr); }
}
</style>

<style lang="less">
.strategy-pnl-popover {
  .ant-popover-inner {
    overflow: hidden;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  }
  .ant-popover-inner-content { padding: 14px 16px; }
  .ant-popover-arrow { border-color: #fff; }
}

.strategy-pnl-popover--dark {
  .ant-popover-inner {
    border-color: rgba(255, 255, 255, 0.1);
    background: #17191d;
    box-shadow: 0 16px 38px rgba(0, 0, 0, 0.48);
  }
  .ant-popover-inner-content { color: #e4e7ec; }
  .ant-popover-arrow { border-color: #17191d; }
  .pnl-breakdown {
    .pnl-breakdown__header {
      border-bottom-color: rgba(255, 255, 255, 0.09);
      strong { color: #eef0f3; }
      p { color: #8f98a6; }
    }
    .pnl-breakdown__badge {
      border-color: color-mix(in srgb, var(--primary-color, #1890ff) 32%, transparent);
      background: color-mix(in srgb, var(--primary-color, #1890ff) 10%, transparent);
    }
    .pnl-breakdown__row,
    .pnl-breakdown-total {
      span { color: #8f98a6; }
      strong { color: #eef0f3; }
    }
    .pnl-breakdown-total {
      border-top-color: rgba(255, 255, 255, 0.09);
      background: rgba(255, 255, 255, 0.025);
    }
    .pnl-breakdown__row strong.cost-positive,
    .pnl-breakdown-total.cost-positive strong { color: #49c292; }
    .pnl-breakdown__row strong.cost-negative,
    .pnl-breakdown-total.cost-negative strong { color: #ff6b7a; }
    .pnl-breakdown__row strong.cost-neutral,
    .pnl-breakdown-total.cost-neutral strong { color: #8f98a6; }
    .pnl-breakdown-total.cost-positive { background: rgba(73, 194, 146, 0.1); }
    .pnl-breakdown-total.cost-negative { background: rgba(255, 107, 122, 0.1); }
    .grid-order-match {
      border-color: rgba(255, 255, 255, 0.09);
      background: rgba(255, 255, 255, 0.025);
      p { color: #8f98a6; }
    }
  }
}

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
    background: #222222 !important;
    color: #d1d4dc !important;
    border-bottom-color: #333333 !important;
  }

  ::v-deep .ant-table-tbody {
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-tbody > tr > td {
    background: #1c1c1c !important;
    color: #d1d4dc !important;
    border-bottom-color: #333333 !important;
  }

  ::v-deep .ant-table-tbody > tr > td,
  ::v-deep .ant-table-tbody > tr > td span:not(.ant-tag),
  ::v-deep .ant-table-tbody > tr > td div,
  ::v-deep .ant-table-tbody > tr > td *:not(.ant-tag) {
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-tbody > tr:hover > td {
    background: #222222 !important;
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
      border-color: #333333 !important;

      a {
        color: #d1d4dc !important;
      }

      &:hover {
        border-color: var(--primary-color, #1890ff) !important;

        a {
          color: var(--primary-color, #1890ff) !important;
        }
      }
    }

    .ant-pagination-item-active {
      background: var(--primary-color, #1890ff) !important;
      border-color: var(--primary-color, #1890ff) !important;

      a {
        color: #fff !important;
      }
    }

    .ant-pagination-prev,
    .ant-pagination-next {
      .ant-pagination-item-link {
        background: #1c1c1c !important;
        border-color: #333333 !important;
        color: #d1d4dc !important;
      }

      &:hover .ant-pagination-item-link {
        border-color: var(--primary-color, #1890ff) !important;
        color: var(--primary-color, #1890ff) !important;
      }
    }

    .ant-pagination-options {
      .ant-select {
        .ant-select-selector {
          background: #1c1c1c !important;
          border-color: #333333 !important;
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
    background: #222222 !important;
    color: #d1d4dc !important;
    border-bottom-color: #333333 !important;
  }

  ::v-deep .ant-table-tbody {
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-tbody > tr > td {
    background: #1c1c1c !important;
    color: #d1d4dc !important;
    border-bottom-color: #333333 !important;
  }

  ::v-deep .ant-table-tbody > tr > td,
  ::v-deep .ant-table-tbody > tr > td span:not(.ant-tag),
  ::v-deep .ant-table-tbody > tr > td div,
  ::v-deep .ant-table-tbody > tr > td *:not(.ant-tag) {
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-tbody > tr:hover > td {
    background: #222222 !important;
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
      border-color: #333333 !important;

      a {
        color: #d1d4dc !important;
      }

      &:hover {
        border-color: var(--primary-color, #1890ff) !important;

        a {
          color: var(--primary-color, #1890ff) !important;
        }
      }
    }

    .ant-pagination-item-active {
      background: var(--primary-color, #1890ff) !important;
      border-color: var(--primary-color, #1890ff) !important;

      a {
        color: #fff !important;
      }
    }

    .ant-pagination-prev,
    .ant-pagination-next {
      .ant-pagination-item-link {
        background: #1c1c1c !important;
        border-color: #333333 !important;
        color: #d1d4dc !important;
      }

      &:hover .ant-pagination-item-link {
        border-color: var(--primary-color, #1890ff) !important;
        color: var(--primary-color, #1890ff) !important;
      }
    }

    .ant-pagination-options {
      .ant-select {
        .ant-select-selector {
          background: #1c1c1c !important;
          border-color: #333333 !important;
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
    background: #222222 !important;
    color: #d1d4dc !important;
    border-bottom-color: #333333 !important;
  }

  ::v-deep .ant-table-tbody {
    color: #d1d4dc !important;
  }

  ::v-deep .ant-table-tbody > tr > td {
    background: #1c1c1c !important;
    color: #d1d4dc !important;
    border-bottom-color: #333333 !important;
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
      color: var(--primary-color-hover, #40a9ff) !important;
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
    background: #222222 !important;
  }

  ::v-deep .ant-table-placeholder {
    background: #1c1c1c !important;
    color: #868993 !important;
  }

  ::v-deep .ant-pagination {
    .ant-pagination-item {
      background: #1c1c1c !important;
      border-color: #333333 !important;

      a {
        color: #d1d4dc !important;
      }

      &:hover {
        border-color: var(--primary-color, #1890ff) !important;

        a {
          color: var(--primary-color, #1890ff) !important;
        }
      }
    }

    .ant-pagination-item-active {
      background: var(--primary-color, #1890ff) !important;
      border-color: var(--primary-color, #1890ff) !important;

      a {
        color: #fff !important;
      }
    }

    .ant-pagination-prev,
    .ant-pagination-next {
      .ant-pagination-item-link {
        background: #1c1c1c !important;
        border-color: #333333 !important;
        color: #d1d4dc !important;
      }

      &:hover .ant-pagination-item-link {
        border-color: var(--primary-color, #1890ff) !important;
        color: var(--primary-color, #1890ff) !important;
      }
    }

    .ant-pagination-options {
      .ant-select {
        .ant-select-selector {
          background: #1c1c1c !important;
          border-color: #333333 !important;
          color: #d1d4dc !important;
        }
      }
    }
  }
}
</style>
