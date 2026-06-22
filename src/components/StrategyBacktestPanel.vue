<template>

  <div class="strategy-backtest-panel" :class="{ 'theme-dark': isDark }">

    <a-alert

      v-if="isBotStrategy"

      type="info"

      show-icon

      class="bot-hint"

      :message="$t('strategyCenter.backtest.botHintTitle')"

      :description="$t('strategyCenter.backtest.botHintDesc')"

    />




    <div class="bt-toolbar">

      <div class="bt-toolbar__left">

        <div class="bt-toolbar__title">

          <a-icon type="line-chart" />

          <span>{{ $t('strategyCenter.backtest.panelTitle') }}</span>

        </div>

        <div class="bt-toolbar__presets">

          <span class="preset-label">{{ $t('strategyCenter.backtest.quickRange') }}</span>

          <a-button

            v-for="p in filteredDatePresets"

            :key="p.days"

            size="small"

            :type="activePresetDays === p.days ? 'primary' : 'default'"

            @click="applyPreset(p.days)"

          >

            {{ p.label }}

          </a-button>

        </div>

      </div>

      <div class="bt-toolbar__dates">

        <div class="date-field">

          <label>{{ $t('strategyCenter.backtest.startDate') }}</label>

          <a-date-picker
            v-model="startDate"
            format="YYYY-MM-DD"
            :allow-clear="false"
            :disabled-date="disabledStartDate"
            @change="clampDateRange"
          />

        </div>

        <span class="date-sep">~</span>

        <div class="date-field">

          <label>{{ $t('strategyCenter.backtest.endDate') }}</label>

          <a-date-picker
            v-model="endDate"
            format="YYYY-MM-DD"
            :allow-clear="false"
            :disabled-date="disabledEndDate"
            @change="clampDateRange"
          />

        </div>

      </div>

      <div class="bt-toolbar__actions">

        <a-button type="primary" size="large" class="run-btn" :loading="running" :disabled="!strategyId && !scriptSourceId && !prepareRun" @click="runBacktest">

          <a-icon type="thunderbolt" />

          {{ $t('strategyCenter.backtest.run') }}

        </a-button>

        <a-button size="large" @click="loadHistory">

          <a-icon type="reload" />

          {{ $t('strategyCenter.backtest.refreshHistory') }}

        </a-button>

      </div>

    </div>




    <div v-if="running" class="bt-running-banner">

      <a-spin size="small" />

      <span>{{ $t('strategyCenter.backtest.running') }}</span>

    </div>




    <div v-if="result && !running" class="bt-result-card">

      <div class="bt-metrics">

        <div class="metric-tile" :class="metricClass(result.totalReturn)">

          <div class="metric-tile__label">{{ $t('strategyCenter.backtest.totalReturn') }}</div>

          <div class="metric-tile__value">{{ fmtPct(result.totalReturn) }}</div>

        </div>

        <div class="metric-tile" :class="Number(result.maxDrawdown) ? 'loss' : ''">

          <div class="metric-tile__label">{{ $t('strategyCenter.backtest.maxDrawdown') }}</div>

          <div class="metric-tile__value">{{ fmtPct(result.maxDrawdown) }}</div>

        </div>

        <div class="metric-tile" :class="Number(result.sharpeRatio) >= 1 ? 'profit' : (Number(result.sharpeRatio) < 0 ? 'loss' : '')">

          <div class="metric-tile__label">{{ $t('strategyCenter.backtest.sharpe') }}</div>

          <div class="metric-tile__value">{{ fmtNum(result.sharpeRatio) }}</div>

        </div>

        <div class="metric-tile" :class="Number(result.winRate) >= 50 ? 'profit' : (Number(result.winRate) < 40 ? 'loss' : '')">

          <div class="metric-tile__label">{{ $t('strategyCenter.backtest.winRate') }}</div>

          <div class="metric-tile__value">{{ fmtUnsignedPct(result.winRate) }}</div>

        </div>

        <div class="metric-tile">

          <div class="metric-tile__label">{{ $t('strategyCenter.backtest.trades') }}</div>

          <div class="metric-tile__value">{{ result.totalTrades != null ? result.totalTrades : '-' }}</div>

        </div>

      </div>

      <div v-if="resultAdvice" class="bt-advice" :class="resultAdvice.tone">

        <a-icon :type="resultAdvice.icon" />

        <span>{{ resultAdvice.text }}</span>

      </div>

      <div v-if="resultTrades.length" class="bt-trades-section">

        <div class="bt-trades-section__head">

          <span>{{ $t('strategyCenter.backtest.tradeDetails') }} ({{ resultTrades.length }})</span>

        </div>

        <a-table
          :columns="tradeColumns"
          :data-source="resultTrades"
          size="small"
          row-key="__rowKey"
          :pagination="{ pageSize: 10, size: 'small' }"
          :scroll="{ x: 820 }"
          class="bt-trades-table"
        >

          <template slot="tradeType" slot-scope="text">

            <a-tag size="small">{{ tradeTypeLabel(text) }}</a-tag>

          </template>

          <template slot="tradeProfit" slot-scope="text">

            <span :style="tradeProfitStyle(text)">{{ fmtTradeProfit(text) }}</span>

          </template>

          <template slot="closeReason" slot-scope="text, record">

            <a-tag size="small" :color="exitTagColor(record)">{{ exitTagLabel(record) }}</a-tag>

          </template>

        </a-table>

      </div>

    </div>




    <div v-else-if="!running" class="bt-empty-result">

      <a-icon type="experiment" class="bt-empty-result__icon" />

      <div class="bt-empty-result__title">{{ $t('strategyCenter.backtest.emptyResultTitle') }}</div>

      <div class="bt-empty-result__desc">{{ $t('strategyCenter.backtest.emptyResultDesc') }}</div>

    </div>




    <div class="bt-history-section">

      <div class="bt-history-header">

        <h4>{{ $t('strategyCenter.backtest.historyTitle') }}</h4>

        <span v-if="history.length" class="bt-history-count">{{ history.length }} {{ $t('strategyCenter.backtest.records') }}</span>

      </div>

      <a-table

        v-if="history.length || historyLoading"

        :columns="historyColumns"

        :data-source="history"

        :loading="historyLoading"

        size="middle"

        row-key="id"

        :pagination="{ pageSize: 8, size: 'small' }"
        :scroll="{ x: 760 }"

        class="bt-history-table"

      >

        <template slot="returnPct" slot-scope="text, record">

          <a-tooltip v-if="record && record.status === 'failed' && record.error_message" :title="record.error_message">

            <span class="return-failed">{{ $t('strategyCenter.backtest.failed') }}</span>

          </a-tooltip>

          <span v-else :style="historyReturnStyle(record)">{{ formatHistoryReturn(record) }}</span>

        </template>

        <template slot="runType" slot-scope="text">

          <a-tag :color="runTypeColor(text)">{{ runTypeLabel(text) }}</a-tag>

        </template>

        <template slot="status" slot-scope="text">

          <a-badge :status="text === 'success' ? 'success' : 'error'" :text="text === 'success' ? $t('strategyCenter.backtest.statusSuccess') : $t('strategyCenter.backtest.statusFailed')" />

        </template>

        <template slot="actions" slot-scope="text, record">

          <a-button

            type="link"

            size="small"

            :disabled="record.status !== 'success'"

            :loading="detailLoading && detailRun && detailRun.id === record.id"

            @click="viewRunDetail(record)"

          >

            {{ $t('strategyCenter.backtest.viewDetail') }}

          </a-button>

        </template>

      </a-table>

      <div v-else class="bt-history-empty">

        <a-empty :description="$t('strategyCenter.backtest.noHistory')" />

      </div>

    </div>

  </div>

</template>



<script>

import moment from 'moment'


import { runStrategyBacktest, getStrategyBacktestHistory, getStrategyBacktestRun } from '@/api/strategy'

import { BACKTEST_TIMEOUT } from '@/utils/request'

// Align with backend app/services/backtest_limits.py.
const DEFAULT_TF_MAX_DAYS = {
  '1m': 30,
  '3m': 30,
  '5m': 180,
  '15m': 365,
  '30m': 365,
  '1H': 1095,
  '4H': 1095,
  '1D': 1095,
  '1W': 1095
}

const MARKET_TF_MAX_DAYS = {
  USStock: {
    '1m': 7,
    '3m': 7,
    '5m': 60,
    '15m': 60,
    '30m': 60,
    '1H': 700,
    '4H': 700,
    '1D': 3650,
    '1W': 3650
  },
  Forex: {
    '1m': 7,
    '3m': 30,
    '5m': 60,
    '15m': 60,
    '30m': 120,
    '1H': 365,
    '4H': 730,
    '1D': 1095,
    '1W': 1095
  }
}

export default {

  name: 'StrategyBacktestPanel',

  components: {},

  props: {

    strategyId: { type: [Number, String], default: null },

    scriptSourceId: { type: [Number, String], default: null },

    strategy: { type: Object, default: null },

    isDark: { type: Boolean, default: false },

    prepareRun: { type: Function, default: null }

  },

  data () {

    const end = moment()

    const start = moment().subtract(30, 'days')

    return {

      startDate: start,

      endDate: end,

      activePresetDays: 30,

      running: false,

      result: null,

      lastRunRange: null,

      history: [],

      historyLoading: false,

      detailLoading: false,

      detailRun: null

    }

  },

  computed: {

    isBotStrategy () {

      const s = this.strategy || {}

      return s.strategy_mode === 'bot' || !!(s.trading_config && s.trading_config.bot_type)

    },

    isScriptBacktestStrategy () {

      const s = this.strategy || {}

      return s.strategy_mode === 'script' || s.strategy_mode === 'bot' || s.strategy_type === 'ScriptStrategy'

    },

    isScriptOnlyStrategy () {

      const s = this.strategy || {}

      return s.strategy_mode === 'script' || s.strategy_type === 'ScriptStrategy'

    },

    datePresets () {

      return [

        { days: 30, label: this.$t('strategyCenter.backtest.preset30d') },

        { days: 90, label: this.$t('strategyCenter.backtest.preset90d') },

        { days: 180, label: this.$t('strategyCenter.backtest.preset180d') },

        { days: 365, label: this.$t('strategyCenter.backtest.preset1y') },

        { days: 730, label: '2Y' },

        { days: 1095, label: '3Y' }

      ]

    },

    strategyMarket () {

      const s = this.strategy || {}

      const tc = s.trading_config || {}

      return String(tc.market_category || s.market_category || s.market || 'Crypto').trim() || 'Crypto'

    },

    strategyTimeframe () {

      const s = this.strategy || {}

      const tc = s.trading_config || {}

      return String(tc.timeframe || s.timeframe || '1D').trim()

    },

    tfMaxDays () {

      const marketLimits = MARKET_TF_MAX_DAYS[this.strategyMarket] || {}

      return marketLimits[this.strategyTimeframe] || DEFAULT_TF_MAX_DAYS[this.strategyTimeframe] || 1095

    },

    effectiveMaxDays () {

      return this.tfMaxDays

    },

    filteredDatePresets () {

      return this.datePresets.filter(p => p.days <= this.effectiveMaxDays)

    },

    defaultPresetDays () {

      return Math.min(180, this.tfMaxDays)

    },

    resultDateRange () {

      if (!this.lastRunRange) return ''

      return `${this.lastRunRange.start} ~ ${this.lastRunRange.end}`

    },

    resultTrades () {

      return (this.result && Array.isArray(this.result.trades)) ? this.result.trades : []

    },

    resultAdvice () {

      if (!this.result) return null

      const totalReturn = Number(this.result.totalReturn)

      const maxDrawdown = Number(this.result.maxDrawdown)

      const sharpe = Number(this.result.sharpeRatio)

      if (Number.isFinite(totalReturn) && totalReturn < 0) {

        return { tone: 'loss', icon: 'warning', text: this.$t('strategyCenter.backtest.adviceLoss') }

      }

      if (Number.isFinite(maxDrawdown) && Math.abs(maxDrawdown) >= 20) {

        return { tone: 'warning', icon: 'exclamation-circle', text: this.$t('strategyCenter.backtest.adviceDrawdown') }

      }

      if (Number.isFinite(totalReturn) && totalReturn > 0 && Number.isFinite(sharpe) && sharpe >= 1) {

        return { tone: 'profit', icon: 'check-circle', text: this.$t('strategyCenter.backtest.adviceGood') }

      }

      return { tone: 'neutral', icon: 'info-circle', text: this.$t('strategyCenter.backtest.adviceNeutral') }

    },

    tradeColumns () {

      return [

        { title: this.$t('strategyCenter.backtest.tradeTime'), dataIndex: 'time', width: 150 },

        { title: this.$t('strategyCenter.backtest.tradeType'), dataIndex: 'type', width: 130, scopedSlots: { customRender: 'tradeType' } },

        { title: this.$t('indicatorIde.exitTag'), dataIndex: 'closeReason', width: 120, scopedSlots: { customRender: 'closeReason' } },

        { title: this.$t('strategyCenter.backtest.tradePrice'), dataIndex: 'price', width: 100,

          customRender: (t) => (t != null ? Number(t).toFixed(4) : '-') },

        { title: this.$t('strategyCenter.backtest.tradeAmount'), dataIndex: 'amount', width: 100,

          customRender: (t) => (t != null ? Number(t).toFixed(4) : '-') },

        { title: this.$t('strategyCenter.backtest.tradeProfit'), dataIndex: 'profit', width: 100, scopedSlots: { customRender: 'tradeProfit' } },

        { title: this.$t('strategyCenter.backtest.tradeBalance'), dataIndex: 'balance', width: 110,

          customRender: (t) => (t != null ? Number(t).toFixed(2) : '-') }

      ]

    },

    historyColumns () {

      return [

        { title: this.$t('strategyCenter.backtest.colDate'), dataIndex: 'created_at', width: 160,

          customRender: (t) => (t ? String(t).slice(0, 19).replace('T', ' ') : '-') },

        { title: this.$t('strategyCenter.backtest.colRange'), key: 'range', width: 200,

          customRender: (_, r) => `${(r.start_date || '').slice(0, 10)} ~ ${(r.end_date || '').slice(0, 10)}` },

        { title: this.$t('strategyCenter.backtest.colReturn'), key: 'returnPct', width: 110, scopedSlots: { customRender: 'returnPct' } },

        { title: this.$t('strategyCenter.backtest.colStatus'), dataIndex: 'status', width: 100, scopedSlots: { customRender: 'status' } },

        { title: this.$t('strategyCenter.backtest.colType'), dataIndex: 'run_type', width: 120, scopedSlots: { customRender: 'runType' } },

        { title: this.$t('strategyCenter.backtest.colAction'), key: 'actions', width: 100, scopedSlots: { customRender: 'actions' } }

      ]

    }

  },

  watch: {

    strategyId: {

      immediate: true,

      handler (id) {

        if (id) {

          this.loadHistory()

          this.result = null

        }

      }

    },

    scriptSourceId: {

      immediate: true,

      handler (id) {

        if (id) {

          this.loadHistory()

          this.result = null

        }

      }

    },

    strategy: {

      immediate: true,

      deep: true,

      handler () {

        this.syncDateRangeToStrategy()

      }

    },

    strategyTimeframe () {

      this.syncDateRangeToStrategy()

    }

  },

  methods: {

    clampPresetDays (days) {

      const n = Number(days)

      if (!Number.isFinite(n) || n <= 0) return this.defaultPresetDays

      const allowed = (this.filteredDatePresets || []).map(p => p.days)

      if (!allowed.length) return Math.min(n, this.effectiveMaxDays)

      if (allowed.includes(n)) return n

      return allowed.reduce((best, d) => (Math.abs(d - n) < Math.abs(best - n) ? d : best), allowed[0])

    },

    applyPreset (days) {

      const clamped = this.clampPresetDays(days)

      this.activePresetDays = clamped

      this.endDate = moment()

      this.startDate = moment().subtract(clamped, 'days')

    },

    syncDateRangeToStrategy () {

      if (!this.startDate || !this.endDate) {

        this.applyPreset(this.defaultPresetDays)

        return

      }

      this.clampDateRange()

    },

    clampDateRange () {

      const maxDays = this.effectiveMaxDays

      let end = this.endDate ? moment(this.endDate).startOf('day') : moment().startOf('day')

      let start = this.startDate ? moment(this.startDate).startOf('day') : moment(end).subtract(maxDays, 'days')

      if (!start.isValid() || !end.isValid()) {

        this.applyPreset(this.defaultPresetDays)

        return

      }

      if (end.isBefore(start)) {

        start = moment(end).subtract(maxDays, 'days')

      }

      if (end.diff(start, 'days') > maxDays) {

        start = moment(end).subtract(maxDays, 'days')

      }

      this.startDate = start

      this.endDate = end

      const span = end.diff(start, 'days')

      const match = (this.filteredDatePresets || []).find(p => p.days === span)

      this.activePresetDays = match ? match.days : null

    },

    disabledStartDate (current) {

      if (!current) return false

      const end = this.endDate ? moment(this.endDate).startOf('day') : moment().startOf('day')

      const cur = moment(current).startOf('day')

      if (cur.isAfter(end)) return true

      return end.diff(cur, 'days') > this.effectiveMaxDays

    },

    disabledEndDate (current) {

      if (!current) return false

      const start = this.startDate

        ? moment(this.startDate).startOf('day')

        : moment().subtract(this.effectiveMaxDays, 'days').startOf('day')

      const cur = moment(current).startOf('day')

      if (cur.isBefore(start)) return true

      return cur.diff(start, 'days') > this.effectiveMaxDays

    },

    fmtPct (v) {

      if (v == null || v === '') return '-'

      const n = Number(v)

      if (!Number.isFinite(n)) return '-'

      return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

    },

    fmtUnsignedPct (v) {

      if (v == null || v === '') return '-'

      const n = Number(v)

      if (!Number.isFinite(n)) return '-'

      return `${n.toFixed(2)}%`

    },

    fmtNum (v) {

      if (v == null || v === '') return '-'

      const n = Number(v)

      return Number.isFinite(n) ? n.toFixed(2) : '-'

    },

    metricClass (v) {

      const n = Number(v)

      if (!Number.isFinite(n)) return ''

      return n >= 0 ? 'profit' : 'loss'

    },

    runTypeLabel (t) {

      const key = String(t || 'strategy_indicator')

      const map = {

        strategy_indicator: this.$t('strategyCenter.backtest.typeIndicator'),

        strategy_script: this.$t('strategyCenter.backtest.typeScript'),

        indicator: this.$t('strategyCenter.backtest.typeIde')

      }

      return map[key] || key

    },

    runTypeColor (t) {

      const key = String(t || '')

      if (key === 'strategy_script') return 'purple'

      if (key === 'strategy_indicator') return 'blue'

      return 'default'

    },

    formatHistoryReturn (row) {

      const n = this.historyReturnPct(row)

      if (n == null) return '-'

      return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

    },

    historyReturnStyle (row) {

      const n = this.historyReturnPct(row)

      if (n == null) return { color: '#8c8c8c', fontWeight: 600 }

      return { color: n >= 0 ? '#52c41a' : '#f5222d', fontWeight: 600 }

    },

    historyReturnPct (row) {

      if (!row) return null

      const raw = row.total_return_pct != null ? row.total_return_pct : row.total_return

      if (raw == null || raw === '') return null

      const n = Number(raw)

      return Number.isFinite(n) ? n : null

    },

    exitTagLabel (record) {

      const type = String((record && (record.closeType || record.type)) || '').toLowerCase()

      const reason = String((record && record.closeReason) || '').toLowerCase()

      if (type.includes('liquidation') || reason.includes('liquidat')) return this.$t('indicatorIde.exitTagLiquidation')

      if (type.includes('trailing') || reason.includes('trailing')) return this.$t('indicatorIde.exitTagTrailing')

      if (type.includes('stop') || reason.includes('stop_loss') || reason.includes('server_stop_loss')) return this.$t('indicatorIde.exitTagStopLoss')

      if (type.includes('profit') || reason.includes('take_profit') || reason.includes('server_take_profit')) return this.$t('indicatorIde.exitTagTakeProfit')

      if (type.includes('reduce')) return this.$t('indicatorIde.exitTagReduce')

      if (type.includes('add')) return this.$t('indicatorIde.exitTagAdd')

      if (type.includes('close') || reason.includes('signal')) return this.$t('indicatorIde.exitTagSignal')

      if (record && record.closeReason) return String(record.closeReason)

      return '-'

    },

    exitTagColor (record) {

      const type = String((record && (record.closeType || record.type)) || '').toLowerCase()

      const reason = String((record && record.closeReason) || '').toLowerCase()

      if (type.includes('liquidation') || reason.includes('liquidat')) return 'red'

      if (type.includes('trailing') || reason.includes('trailing')) return 'cyan'

      if (type.includes('stop') || reason.includes('stop_loss')) return 'orange'

      if (type.includes('profit') || reason.includes('take_profit')) return 'green'

      if (type.includes('reduce')) return 'blue'

      if (type.includes('add')) return 'purple'

      if (type.includes('close') || reason.includes('signal')) return 'geekblue'

      return 'default'

    },

    async runBacktest () {

      let effectiveStrategyId = this.strategyId
      let effectiveScriptSourceId = this.scriptSourceId
      let overrideConfig = null

      if (typeof this.prepareRun === 'function') {

        const prepared = await this.prepareRun()

        if (prepared === false) return

        if (prepared && prepared.strategyId) effectiveStrategyId = prepared.strategyId
        if (prepared && prepared.scriptSourceId) effectiveScriptSourceId = prepared.scriptSourceId
        if (prepared && prepared.overrideConfig) overrideConfig = prepared.overrideConfig

      }

      if (!effectiveStrategyId && !effectiveScriptSourceId) {

        this.$message.warning(this.$t('strategyCenter.backtest.noStrategy'))

        return

      }

      this.syncDateRangeToStrategy()

      if (!this.startDate || !this.endDate) {

        this.$message.warning(this.$t('strategyCenter.backtest.dateRequired'))

        return

      }

      this.running = true

      this.result = null

      const startStr = moment(this.startDate).format('YYYY-MM-DD')

      const endStr = moment(this.endDate).format('YYYY-MM-DD')

      try {

        const payload = {
          startDate: startStr,
          endDate: endStr,
          timeout: BACKTEST_TIMEOUT
        }
        if (effectiveStrategyId) payload.strategyId = Number(effectiveStrategyId)
        else payload.scriptSourceId = Number(effectiveScriptSourceId)
        if (overrideConfig) payload.overrideConfig = overrideConfig

        const res = await runStrategyBacktest(payload)

        if (res.code === 1 && res.data) {

          const payload = res.data

          this.result = this.normalizeBacktestResult(payload.result || payload)

          this.lastRunRange = { start: startStr, end: endStr }

          this.$message.success(this.$t('strategyCenter.backtest.success'))

          this.$emit('backtested', this.result)

          await this.loadHistory({
            strategyId: effectiveStrategyId,
            scriptSourceId: effectiveScriptSourceId
          })

        } else {

          this.$message.error(res.msg || this.$t('strategyCenter.backtest.failed'))

          await this.loadHistory({
            strategyId: effectiveStrategyId,
            scriptSourceId: effectiveScriptSourceId
          })

        }

      } catch (e) {

        this.$message.error(e.message || this.$t('strategyCenter.backtest.failed'))

      } finally {

        this.running = false

      }

    },

    async loadHistory (identity = {}) {

      const strategyId = identity.strategyId || this.strategyId
      const scriptSourceId = identity.scriptSourceId || this.scriptSourceId

      if (!strategyId && !scriptSourceId) return

      this.historyLoading = true

      try {

        const params = { limit: 30 }
        if (strategyId) params.strategyId = Number(strategyId)
        else params.scriptSourceId = Number(scriptSourceId)

        const res = await getStrategyBacktestHistory(params)

        if (res.code === 1 && Array.isArray(res.data)) {

          this.history = res.data.map(row => ({

            ...row,

            total_return_pct: this.historyReturnPct(row)

          }))

          this.$emit('history-loaded', this.history)

          if (!this.result) {

            await this.loadLatestResultIfEmpty()

          }

        }

      } catch (e) {

        // silent

      } finally {

        this.historyLoading = false

      }

    },

    normalizeBacktestResult (raw) {

      if (!raw || typeof raw !== 'object') return null

      const trades = Array.isArray(raw.trades)
        ? raw.trades.map((t, i) => ({
          ...t,
          closeReason: t.closeReason || t.close_reason || t.reason || t.exit_reason || '',
          closeType: t.closeType || t.close_type || t.exit_type || '',
          __rowKey: `${t.time || ''}-${t.type || ''}-${i}`
        }))
        : []

      return {

        ...raw,

        totalReturn: raw.totalReturn != null ? raw.totalReturn : raw.total_return,

        maxDrawdown: raw.maxDrawdown != null ? raw.maxDrawdown : raw.max_drawdown,

        sharpeRatio: raw.sharpeRatio != null ? raw.sharpeRatio : raw.sharpe_ratio,

        winRate: raw.winRate != null ? raw.winRate : raw.win_rate,

        totalTrades: raw.totalTrades != null ? raw.totalTrades : raw.total_trades,

        trades

      }

    },

    applyRunResult (runRow) {

      const result = runRow && runRow.result

      if (!result) return false

      this.result = this.normalizeBacktestResult(result)

      this.lastRunRange = {

        start: (runRow.start_date || '').slice(0, 10),

        end: (runRow.end_date || '').slice(0, 10)

      }

      return true

    },

    async loadLatestResultIfEmpty () {

      if (this.result || !(this.history || []).length) return

      const latest = this.history.find(h => h.status === 'success')

      if (!latest || !latest.id) return

      try {

        const res = await getStrategyBacktestRun(latest.id)

        if (res.code === 1 && res.data) {

          this.applyRunResult(res.data)

        }

      } catch (e) {

        // silent

      }

    },

    async viewRunDetail (record) {

      if (!record || !record.id) return

      if (record.status !== 'success') {

        this.$message.warning(this.$t('strategyCenter.backtest.detailOnlySuccess'))

        return

      }

      this.detailLoading = true

      this.detailRun = record

      try {

        const res = await getStrategyBacktestRun(record.id)

        if (res.code === 1 && res.data) {

          this.applyRunResult(res.data)

          this.$message.success(this.$t('strategyCenter.backtest.detailLoaded'))

        } else {

          this.$message.error(res.msg || this.$t('strategyCenter.backtest.loadDetailFailed'))

        }

      } catch (e) {

        this.$message.error(e.message || this.$t('strategyCenter.backtest.loadDetailFailed'))

      } finally {

        this.detailLoading = false

        this.detailRun = null

      }

    },

    tradeTypeLabel (type) {

      const key = String(type || '').trim()

      if (!key) return '-'

      return key.replace(/_/g, ' ')

    },

    fmtTradeProfit (v) {

      if (v == null || v === '') return '-'

      const n = Number(v)

      if (!Number.isFinite(n)) return '-'

      return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`

    },

    tradeProfitStyle (v) {

      const n = Number(v)

      if (!Number.isFinite(n) || n === 0) return { color: '#8c8c8c' }

      return { color: n > 0 ? '#52c41a' : '#f5222d', fontWeight: 600 }

    },

    hasBacktestHistory () {

      return (this.history || []).length > 0

    }

  }

}

</script>



<style lang="less" scoped>

.strategy-backtest-panel {

  .bot-hint { margin-bottom: 16px; }



  .bt-toolbar {

    display: flex;

    flex-wrap: wrap;

    align-items: flex-end;

    gap: 16px 20px;

    padding: 18px 20px;

    margin-bottom: 16px;

    border-radius: 12px;

    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);

    border: 1px solid #e2e8f0;

  }



  .bt-toolbar__left {

    flex: 1 1 220px;

    min-width: 200px;

  }



  .bt-toolbar__title {

    display: flex;

    align-items: center;

    gap: 8px;

    font-size: 15px;

    font-weight: 600;

    color: #1e293b;

    margin-bottom: 10px;

    .anticon { color: #1890ff; }

  }



  .bt-toolbar__presets {

    display: flex;

    flex-wrap: wrap;

    align-items: center;

    gap: 6px;

    .preset-label {

      font-size: 12px;

      color: #64748b;

      margin-right: 4px;

    }

  }



  .bt-toolbar__dates {

    display: flex;

    align-items: flex-end;

    gap: 8px;

    flex-wrap: wrap;

  }



  .date-field {

    display: flex;

    flex-direction: column;

    gap: 4px;

    label {

      font-size: 12px;

      color: #64748b;

      font-weight: 500;

    }

  }



  .date-sep {

    color: #94a3b8;

    padding-bottom: 8px;

    font-weight: 500;

  }



  .bt-toolbar__actions {

    display: flex;

    gap: 10px;

    flex-wrap: wrap;

    margin-left: auto;

  }



  .run-btn {

    min-width: 128px;

    font-weight: 600;

    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.25);

  }



  .bt-running-banner {

    display: flex;

    align-items: center;

    gap: 10px;

    padding: 12px 16px;

    margin-bottom: 16px;

    border-radius: 8px;

    background: rgba(24, 144, 255, 0.08);

    border: 1px solid rgba(24, 144, 255, 0.2);

    color: #1890ff;

    font-size: 13px;

    font-weight: 500;

  }



  .bt-result-card {

    margin-bottom: 20px;

    padding: 20px;

    border-radius: 12px;

    background: #fff;

    border: 1px solid #e8ecf1;

    box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);

  }



  .bt-metrics {

    display: grid;

    grid-template-columns: repeat(5, minmax(0, 1fr));

    gap: 12px;

    margin-bottom: 14px;

    @media (max-width: 768px) {

      grid-template-columns: repeat(2, 1fr);

    }

  }



  .metric-tile {

    padding: 14px 16px;

    border-radius: 8px;

    background: #f8fafc;

    border: 1px solid #eef2f6;

    transition: border-color 0.2s ease, background 0.2s ease;

    &.profit {

      background: linear-gradient(135deg, rgba(82, 196, 26, 0.12) 0%, rgba(82, 196, 26, 0.04) 100%);

      border-color: rgba(82, 196, 26, 0.24);

      .metric-tile__value { color: #389e0d; }

    }

    &.loss {

      background: linear-gradient(135deg, rgba(245, 34, 45, 0.12) 0%, rgba(245, 34, 45, 0.04) 100%);

      border-color: rgba(245, 34, 45, 0.24);

      .metric-tile__value { color: #cf1322; }

    }

    &__label {

      font-size: 12px;

      color: #64748b;

      margin-bottom: 6px;

    }

    &__value {

      font-size: 18px;

      font-weight: 700;

      color: #1e293b;

    }

    &__sub {

      margin-top: 6px;

      font-size: 12px;

      color: #94a3b8;

      white-space: nowrap;

    }

  }



  .bt-advice {

    display: flex;

    align-items: center;

    gap: 8px;

    padding: 10px 12px;

    margin-bottom: 14px;

    border-radius: 8px;

    font-size: 13px;

    font-weight: 500;

    &.profit {

      color: #237804;

      background: rgba(82, 196, 26, 0.1);

      border: 1px solid rgba(82, 196, 26, 0.22);

    }

    &.loss {

      color: #a8071a;

      background: rgba(245, 34, 45, 0.1);

      border: 1px solid rgba(245, 34, 45, 0.22);

    }

    &.warning {

      color: #ad6800;

      background: rgba(250, 173, 20, 0.12);

      border: 1px solid rgba(250, 173, 20, 0.25);

    }

    &.neutral {

      color: #096dd9;

      background: rgba(24, 144, 255, 0.08);

      border: 1px solid rgba(24, 144, 255, 0.18);

    }

  }

  .bt-trades-section {

    margin-top: 14px;

    padding-top: 12px;

    border-top: 1px dashed #e8ecf1;

    &__head {

      display: flex;

      align-items: center;

      justify-content: space-between;

      font-size: 13px;

      font-weight: 600;

      color: #475569;

    }

  }

  .bt-trades-table {

    ::v-deep .ant-table-thead > tr > th {

      background: #f8fafc;

      font-weight: 600;

    }

  }



  .bt-empty-result {

    text-align: center;

    padding: 36px 24px;

    margin-bottom: 20px;

    border-radius: 12px;

    border: 1px dashed #d9e2ec;

    background: #fafbfc;

    &__icon {

      font-size: 40px;

      color: #cbd5e1;

      margin-bottom: 12px;

    }

    &__title {

      font-size: 15px;

      font-weight: 600;

      color: #475569;

      margin-bottom: 6px;

    }

    &__desc {

      font-size: 13px;

      color: #94a3b8;

      max-width: 360px;

      margin: 0 auto;

      line-height: 1.5;

    }

  }



  .bt-history-section {

    margin-top: 8px;

  }



  .bt-history-header {

    display: flex;

    align-items: center;

    justify-content: space-between;

    margin-bottom: 12px;

    h4 {

      margin: 0;

      font-size: 15px;

      font-weight: 600;

      color: #1e293b;

    }

  }



  .bt-history-count {

    font-size: 12px;

    color: #94a3b8;

  }



  .bt-history-table {

    ::v-deep .ant-table-thead > tr > th {

      background: #f8fafc;

      font-weight: 600;

      color: #475569;

    }

  }



  .bt-history-empty {

    padding: 24px;

    border-radius: 8px;

    background: #fafbfc;

    border: 1px solid #eef2f6;

  }



  .return-failed {

    color: #cf1322;

    font-weight: 600;

    cursor: help;

  }

}



.theme-dark.strategy-backtest-panel {

  .bt-toolbar {

    background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.5) 100%);

    border-color: rgba(255, 255, 255, 0.08);

  }

  .bt-toolbar__title { color: rgba(255, 255, 255, 0.9); }

  .preset-label, .date-field label { color: rgba(255, 255, 255, 0.45); }

  .bt-result-card {

    background: rgba(255, 255, 255, 0.03);

    border-color: rgba(255, 255, 255, 0.08);

  }

  .metric-tile {

    background: rgba(255, 255, 255, 0.03);

    border-color: rgba(255, 255, 255, 0.06);

    &__label { color: rgba(255, 255, 255, 0.45); }

    &__value { color: rgba(255, 255, 255, 0.88); }

    &__sub { color: rgba(255, 255, 255, 0.36); }

    &.profit {

      background: linear-gradient(135deg, rgba(82, 196, 26, 0.16) 0%, rgba(82, 196, 26, 0.05) 100%);

      border-color: rgba(82, 196, 26, 0.26);

      .metric-tile__value { color: #52c41a; }

    }

    &.loss {

      background: linear-gradient(135deg, rgba(245, 34, 45, 0.16) 0%, rgba(245, 34, 45, 0.05) 100%);

      border-color: rgba(245, 34, 45, 0.26);

      .metric-tile__value { color: #ff4d4f; }

    }

  }

  .bt-advice.neutral {

    color: #69c0ff;

    background: rgba(24, 144, 255, 0.1);

    border-color: rgba(24, 144, 255, 0.24);

  }

  .bt-trades-section {

    border-top-color: rgba(255, 255, 255, 0.08);

    &__head { color: rgba(255, 255, 255, 0.78); }

  }

  .bt-trades-table,
  .bt-history-table {

    ::v-deep .ant-table {

      color: rgba(255, 255, 255, 0.72);

      background: transparent;

    }

    ::v-deep .ant-table-thead > tr > th {

      background: rgba(255, 255, 255, 0.04);

      color: rgba(255, 255, 255, 0.7);

      border-bottom-color: rgba(255, 255, 255, 0.08);

    }

    ::v-deep .ant-table-tbody > tr > td {

      border-bottom-color: rgba(255, 255, 255, 0.06);

    }

    ::v-deep .ant-table-tbody > tr:hover > td {

      background: rgba(255, 255, 255, 0.04);

    }

  }

  .bt-empty-result, .bt-history-empty {

    background: rgba(255, 255, 255, 0.02);

    border-color: rgba(255, 255, 255, 0.08);

    .bt-empty-result__title { color: rgba(255, 255, 255, 0.75); }

    .bt-empty-result__desc { color: rgba(255, 255, 255, 0.45); }

  }

  .bt-history-header h4 { color: rgba(255, 255, 255, 0.88); }

}

</style>
