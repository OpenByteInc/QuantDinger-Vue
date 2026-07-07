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


    <div v-if="canTuneScriptParams" class="bt-tuner-card">

      <div class="bt-tuner-head">

        <div>

          <div class="bt-tuner-title">

            <a-icon type="control" />

            <span>{{ $t('strategyCenter.backtest.tunerTitle') }}</span>

          </div>

          <div class="bt-tuner-desc">{{ $t('strategyCenter.backtest.tunerDesc') }}</div>

        </div>

        <div class="bt-tuner-actions">

          <a-select v-model="tuneMethod" size="small" class="bt-tuner-objective">

            <a-select-option value="grid">{{ $t('strategyCenter.backtest.tunerMethodGrid') }}</a-select-option>

            <a-select-option value="random">{{ $t('strategyCenter.backtest.tunerMethodRandom') }}</a-select-option>

            <a-select-option value="de">{{ $t('strategyCenter.backtest.tunerMethodDe') }}</a-select-option>

            <a-select-option value="bayes">{{ $t('strategyCenter.backtest.tunerMethodBayes') }}</a-select-option>

          </a-select>

          <a-button type="primary" size="small" class="bt-tuner-run-btn" :loading="tuning" :disabled="running" @click="runStructuredTune">

            <a-icon type="experiment" />

            {{ $t('strategyCenter.backtest.runTuner') }}

          </a-button>

        </div>

      </div>

      <div class="bt-tuner-meta">

        <span><a-icon type="sliders" /> {{ tunableParams.length }} {{ $t('strategyCenter.backtest.tunableParams') }}</span>

        <span><a-icon type="deployment-unit" /> {{ tuneCandidates.length || plannedTuneCount }} {{ $t('strategyCenter.backtest.tuneCandidates') }}</span>

        <span v-if="tuning">{{ $t('strategyCenter.backtest.tuneProgress', { done: tuningProgress.done, total: tuningProgress.total }) }}</span>

      </div>

      <a-progress
        v-if="tuning"
        size="small"
        :percent="tuningProgressPercent"
        :show-info="false"
        class="bt-tuner-progress"
      />

      <a-table
        v-if="tuneResults.length"
        :columns="tuneColumns"
        :data-source="rankedTuneResults"
        size="small"
        row-key="id"
        :pagination="{ pageSize: 5, size: 'small' }"
        :row-class-name="tuneRowClassName"
        :custom-row="tuneRowProps"
        :scroll="{ x: 760 }"
        class="bt-tuner-table"
      >

        <template slot="rank" slot-scope="text, record, index">
          <a-tag :color="index === 0 ? 'gold' : 'blue'">#{{ index + 1 }}</a-tag>
        </template>

        <template slot="score" slot-scope="text">
          <strong>{{ fmtNum(text) }}</strong>
        </template>

        <template slot="totalReturn" slot-scope="text">
          <span :class="Number(text) >= 0 ? 'profit' : 'loss'">{{ fmtPct(text) }}</span>
        </template>

        <template slot="alphaReturn" slot-scope="text">
          <span :class="Number(text) >= 0 ? 'profit' : 'loss'">{{ fmtPct(text) }}</span>
        </template>

        <template slot="maxDrawdown" slot-scope="text">
          <span class="loss">{{ fmtPct(text) }}</span>
        </template>

        <template slot="params" slot-scope="text, record">
          <span class="bt-tuner-param-list">{{ formatTuneParams(record.params) }}</span>
        </template>

        <template slot="actions" slot-scope="text, record">
          <a-button type="link" size="small" @click="selectTuneResult(record)">
            {{ $t('strategyCenter.backtest.viewDetail') }}
          </a-button>
          <a-button type="link" size="small" @click="applyTuneResult(record)">
            {{ $t('strategyCenter.backtest.applyTuneParams') }}
          </a-button>
        </template>

      </a-table>
      <div v-if="tuneResults.length" class="bt-tuner-footer-actions">
        <a-button
          type="primary"
          size="small"
          :disabled="!selectedTuneResult"
          @click="applyTuneResult(selectedTuneResult)"
        >
          <a-icon type="check" />
          {{ $t('strategyCenter.backtest.applyTuneParams') }}
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

      <div class="bt-analysis-grid">

        <div class="bt-chart-card bt-chart-card--wide">

          <div class="bt-chart-card__head">

            <span><a-icon type="area-chart" /> {{ $t('strategyCenter.backtest.equityCurve') }}</span>

            <small>{{ resultDateRange }}</small>

          </div>

          <div class="bt-chart-legend">

            <span><i :style="{ background: equityToneColor }"></i>{{ $t('strategyCenter.backtest.strategyEquity') }}</span>

            <span v-if="benchmarkChartPoints.length"><i class="benchmark"></i>{{ $t('strategyCenter.backtest.spotBenchmark') }}</span>

            <strong v-if="result && result.alphaReturn != null" :class="Number(result.alphaReturn) >= 0 ? 'profit' : 'loss'">
              {{ $t('strategyCenter.backtest.alphaReturn') }} {{ fmtPct(result.alphaReturn) }}
            </strong>

          </div>

          <div v-if="equityChartPoints.length > 1" class="bt-equity-chart">

            <svg viewBox="0 0 640 220" preserveAspectRatio="none" role="img">

              <defs>

                <linearGradient :id="equityGradientId" x1="0" y1="0" x2="0" y2="1">

                  <stop offset="0%" :stop-color="equityToneColor" stop-opacity="0.32" />

                  <stop offset="100%" :stop-color="equityToneColor" stop-opacity="0.02" />

                </linearGradient>

              </defs>

              <g class="bt-chart-grid">

                <line v-for="tick in equityTicks" :key="tick" x1="0" x2="640" :y1="tick" :y2="tick" />

              </g>

              <path class="bt-equity-area" :d="equityAreaPath" :fill="`url(#${equityGradientId})`" />

              <polyline
                v-if="benchmarkPolyline"
                class="bt-benchmark-line"
                :points="benchmarkPolyline"
              />

              <polyline class="bt-equity-line" :points="equityPolyline" :stroke="equityToneColor" />

            </svg>

          </div>

          <div v-else class="bt-chart-empty">{{ $t('strategyCenter.backtest.emptyResultDesc') }}</div>

        </div>

        <div class="bt-chart-card">

          <div class="bt-chart-card__head">

            <span><a-icon type="bar-chart" /> {{ $t('strategyCenter.backtest.profitDistribution') }}</span>

          </div>

          <div v-if="tradeDistribution.length" class="bt-profit-bars">

            <div
              v-for="bar in tradeDistribution"
              :key="bar.key"
              class="bt-profit-bar"
            >

              <span class="bt-profit-bar__label">{{ bar.label }}</span>

              <div class="bt-profit-bar__track">

                <span
                  class="bt-profit-bar__fill"
                  :class="bar.value >= 0 ? 'profit' : 'loss'"
                  :style="{ width: `${bar.width}%` }"
                ></span>

              </div>

              <strong :class="bar.value >= 0 ? 'profit' : 'loss'">{{ fmtTradeProfit(bar.value) }}</strong>

            </div>

          </div>

          <div v-else class="bt-chart-empty">{{ $t('strategyCenter.backtest.emptyResultDesc') }}</div>

        </div>

      </div>

      <div class="bt-summary-strip">

        <div v-for="item in profitSummaryItems" :key="item.key" class="bt-summary-item">

          <span>{{ item.label }}</span>

          <strong :class="item.tone">{{ item.value }}</strong>

        </div>

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

import {
  extractScriptParamsFromCode,
  buildScriptCodeWithParamValues,
  buildTemplateParamValues
} from '@/views/trading-assistant/components/scriptTemplateCatalog'

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

    ,

    scriptCode: { type: String, default: '' }

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

      detailRun: null,

      tuning: false,

      tuneMethod: 'grid',

      tuneCandidates: [],

      tuneResults: [],

      selectedTuneId: '',

      tuningProgress: { done: 0, total: 0 }

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

    scriptParamTemplate () {

      return extractScriptParamsFromCode(this.scriptCode)

    },

    tunableParams () {

      const params = (this.scriptParamTemplate && this.scriptParamTemplate.params) || []

      return params.filter(param => ['integer', 'number', 'percent'].includes(param.type))

    },

    canTuneScriptParams () {

      return !!this.scriptCode && !!this.prepareRun && !!this.tunableParams.length

    },

    plannedTuneCount () {

      return Math.min(12, Math.max(0, this.tunableParams.length ? 10 : 0))

    },

    tuningProgressPercent () {

      const total = Number(this.tuningProgress.total || 0)

      if (!total) return 0

      return Math.min(100, Math.round((Number(this.tuningProgress.done || 0) / total) * 100))

    },

    rankedTuneResults () {

      return [...this.tuneResults].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))

    },
    selectedTuneResult () {

      return this.rankedTuneResults.find(item => item.id === this.selectedTuneId) || null

    },

    tuneColumns () {

      return [

        { title: this.$t('strategyCenter.backtest.tuneRank'), key: 'rank', width: 76, scopedSlots: { customRender: 'rank' } },

        { title: this.$t('strategyCenter.backtest.tuneScore'), dataIndex: 'score', width: 90, scopedSlots: { customRender: 'score' } },

        { title: this.$t('strategyCenter.backtest.totalReturn'), dataIndex: 'totalReturn', width: 110, scopedSlots: { customRender: 'totalReturn' } },

        { title: this.$t('strategyCenter.backtest.alphaReturn'), dataIndex: 'alphaReturn', width: 110, scopedSlots: { customRender: 'alphaReturn' } },

        { title: this.$t('strategyCenter.backtest.maxDrawdown'), dataIndex: 'maxDrawdown', width: 110, scopedSlots: { customRender: 'maxDrawdown' } },

        { title: this.$t('strategyCenter.backtest.sharpe'), dataIndex: 'sharpeRatio', width: 90, customRender: (t) => this.fmtNum(t) },

        { title: this.$t('strategyCenter.backtest.winRate'), dataIndex: 'winRate', width: 100, customRender: (t) => this.fmtUnsignedPct(t) },

        { title: this.$t('strategyCenter.backtest.tuneParams'), key: 'params', width: 220, scopedSlots: { customRender: 'params' } },

        { title: this.$t('strategyCenter.backtest.colAction'), key: 'actions', width: 160, scopedSlots: { customRender: 'actions' } }

      ]

    },

    equityGradientId () {

      return `bt-equity-gradient-${this._uid}`

    },

    equityToneColor () {

      const ret = Number(this.result && this.result.totalReturn)

      return Number.isFinite(ret) && ret < 0 ? '#ff4d4f' : '#16a34a'

    },

    equitySeries () {

      if (!this.result) return []

      const raw = this.result.equityCurve || this.result.equity_curve || this.result.balanceCurve || this.result.balance_curve

      if (Array.isArray(raw) && raw.length) {

        return raw.map((item, index) => {

          if (typeof item === 'number') return { index, value: Number(item) }

          return {

            index,

            time: item.time || item.date || item.timestamp || item.created_at || '',

            value: Number(item.value != null ? item.value : (item.balance != null ? item.balance : item.equity))

          }

        }).filter(item => Number.isFinite(item.value))

      }

      const trades = this.resultTrades

      if (!trades.length) return []

      const points = []

      trades.forEach((trade, index) => {

        const balance = Number(trade.balance != null ? trade.balance : trade.equity)

        if (Number.isFinite(balance)) {

          points.push({ index, time: trade.time || trade.date || '', value: balance })

        }

      })

      if (points.length) return points

      let balance = Number(this.result.initialCapital || this.result.initial_capital || 0)

      points.push({ index: 0, value: balance })

      trades.forEach((trade, index) => {

        const profit = Number(trade.profit || trade.pnl || 0)

        balance += Number.isFinite(profit) ? profit : 0

        points.push({ index: index + 1, time: trade.time || trade.date || '', value: balance })

      })

      return points.filter(item => Number.isFinite(item.value))

    },

    equityChartPoints () {

      return this.scaleChartSeries(this.equitySeries)

    },

    benchmarkSeries () {

      if (!this.result) return []

      const raw = this.result.benchmarkCurve || this.result.benchmark_curve ||
        (this.result.benchmark && (this.result.benchmark.curve || this.result.benchmark.equityCurve))

      if (!Array.isArray(raw) || !raw.length) {

        const ret = Number(this.result.benchmarkReturn != null
          ? this.result.benchmarkReturn
          : (this.result.benchmark && this.result.benchmark.return))

        const start = this.equitySeries.length ? Number(this.equitySeries[0].value) : Number(this.result.initialCapital || this.result.initial_capital || 0)

        if (!Number.isFinite(ret) || !Number.isFinite(start) || start <= 0) return []

        return [

          { index: 0, value: start },

          { index: 1, value: start * (1 + ret / 100) }

        ]

      }

      return raw.map((item, index) => {

        if (typeof item === 'number') return { index, value: Number(item) }

        return {

          index,

          time: item.time || item.date || item.timestamp || item.created_at || '',

          value: Number(item.value != null ? item.value : (item.balance != null ? item.balance : item.equity))

        }

      }).filter(item => Number.isFinite(item.value))

    },

    benchmarkChartPoints () {

      return this.scaleChartSeries(this.benchmarkSeries)

    },

    equityPolyline () {

      return this.equityChartPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

    },

    benchmarkPolyline () {

      return this.benchmarkChartPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

    },

    equityAreaPath () {

      const points = this.equityChartPoints

      if (!points.length) return ''

      const first = points[0]

      const last = points[points.length - 1]

      const line = points.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

      return `M ${first.x.toFixed(1)} 210 ${line.replace(/^L/, 'L')} L ${last.x.toFixed(1)} 210 Z`

    },

    equityTicks () {

      return [34, 78, 122, 166, 210]

    },

    numericTradeProfits () {

      return this.resultTrades

        .map(t => Number(t.profit != null ? t.profit : (t.pnl != null ? t.pnl : t.realized_pnl)))

        .filter(v => Number.isFinite(v))

    },

    tradeDistribution () {

      const values = this.numericTradeProfits.slice(-8)

      if (!values.length) return []

      const maxAbs = Math.max(...values.map(v => Math.abs(v)), 1)

      return values.map((value, index) => ({

        key: `${index}-${value}`,

        label: `#${this.numericTradeProfits.length - values.length + index + 1}`,

        value,

        width: Math.max(6, Math.min(100, Math.abs(value) / maxAbs * 100))

      }))

    },

    profitSummaryItems () {

      const values = this.numericTradeProfits

      const wins = values.filter(v => v > 0)

      const losses = values.filter(v => v < 0)

      const avg = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null

      const best = values.length ? Math.max(...values) : null

      const worst = values.length ? Math.min(...values) : null

      const avgWin = wins.length ? wins.reduce((sum, v) => sum + v, 0) / wins.length : 0

      const avgLoss = losses.length ? Math.abs(losses.reduce((sum, v) => sum + v, 0) / losses.length) : 0

      const payoff = avgLoss ? avgWin / avgLoss : null

      return [

        { key: 'wins', label: this.$t('strategyCenter.backtest.winningTrades'), value: String(wins.length), tone: 'profit' },

        { key: 'losses', label: this.$t('strategyCenter.backtest.losingTrades'), value: String(losses.length), tone: 'loss' },

        { key: 'best', label: this.$t('strategyCenter.backtest.bestTrade'), value: best == null ? '-' : this.fmtTradeProfit(best), tone: best == null ? '' : (best >= 0 ? 'profit' : 'loss') },

        { key: 'worst', label: this.$t('strategyCenter.backtest.worstTrade'), value: worst == null ? '-' : this.fmtTradeProfit(worst), tone: worst == null ? '' : (worst >= 0 ? 'profit' : 'loss') },

        { key: 'avg', label: this.$t('strategyCenter.backtest.averageProfit'), value: avg == null ? '-' : this.fmtTradeProfit(avg), tone: avg == null ? '' : (avg >= 0 ? 'profit' : 'loss') },

        { key: 'payoff', label: this.$t('strategyCenter.backtest.payoffRatio'), value: payoff == null ? '-' : `${payoff.toFixed(2)}x`, tone: payoff == null ? '' : (payoff >= 1 ? 'profit' : 'loss') }

      ]

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

    scaleChartSeries (series) {

      if (!Array.isArray(series) || !series.length) return []

      const width = 640

      const height = 220

      const padX = 16

      const padY = 18

      const allValues = [...this.equitySeries, ...this.benchmarkSeries]
        .map(item => Number(item.value))
        .filter(value => Number.isFinite(value))

      if (!allValues.length) return []

      const min = Math.min(...allValues)

      const max = Math.max(...allValues)

      const span = max - min || Math.max(Math.abs(max), 1)

      return series.map((item, index) => {

        const x = series.length === 1 ? width / 2 : padX + (index / (series.length - 1)) * (width - padX * 2)

        const y = padY + (1 - ((item.value - min) / span)) * (height - padY * 2)

        return { ...item, x, y }

      })

    },

    clampTuneValue (param, value) {

      let next = Number(value)

      if (!Number.isFinite(next)) next = Number(param.default || 0)

      if (param.type === 'integer') next = Math.round(next)

      if (param.min != null) next = Math.max(Number(param.min), next)

      if (param.max != null) next = Math.min(Number(param.max), next)

      const precision = param.type === 'integer' ? 0 : 4

      return Number(next.toFixed(precision))

    },

    tuneParamRange (param, current) {

      const base = Math.abs(Number(current) || Number(param.default) || 1)

      const step = Number(param.step || (param.type === 'integer' ? 1 : 0.1))

      const fallbackDelta = param.type === 'integer'
        ? Math.max(step, Math.round(base * 0.35) || step)
        : Math.max(step, base * 0.35)

      const min = param.min != null ? Number(param.min) : Number(current) - fallbackDelta * 2

      const max = param.max != null ? Number(param.max) : Number(current) + fallbackDelta * 2

      return {

        min: this.clampTuneValue(param, min),

        max: this.clampTuneValue(param, max),

        step

      }

    },

    tuneMidValue (param, a, b, ratio) {

      const min = Number(a)

      const max = Number(b)

      return this.clampTuneValue(param, min + (max - min) * ratio)

    },

    buildTuneCandidates () {

      const template = this.scriptParamTemplate

      if (!template) return []

      const baseValues = buildTemplateParamValues(template)

      const params = this.tunableParams

      const candidates = []

      const pushCandidate = (label, overrides) => {

        const values = { ...baseValues, ...overrides }

        const key = JSON.stringify(values)

        if (candidates.some(item => item.key === key)) return

        candidates.push({

          id: `tune-${candidates.length + 1}`,

          key,

          label,

          params: values,

          code: buildScriptCodeWithParamValues(this.scriptCode, template.params, values)

        })

      }

      pushCandidate(this.$t('strategyCenter.backtest.tuneBaseCandidate'), {})

      const activeParams = params.slice(0, this.tuneMethod === 'grid' ? 4 : 6)

      if (this.tuneMethod === 'random') {

        for (let i = 0; i < 11; i++) {

          const overrides = {}

          activeParams.forEach((param, paramIndex) => {

            const current = Number(baseValues[param.name])

            if (!Number.isFinite(current)) return

            const range = this.tuneParamRange(param, current)

            const seed = ((i + 1) * (paramIndex + 3) * 37) % 100

            overrides[param.name] = this.tuneMidValue(param, range.min, range.max, seed / 100)

          })

          pushCandidate(`${this.$t('strategyCenter.backtest.tunerMethodRandom')} #${i + 1}`, overrides)

        }

        return candidates.slice(0, 12)

      }

      if (this.tuneMethod === 'de' || this.tuneMethod === 'bayes') {

        const ratios = this.tuneMethod === 'de'
          ? [0.18, 0.32, 0.5, 0.68, 0.82]
          : [0.25, 0.38, 0.5, 0.62, 0.75]

        ratios.forEach((ratio, idx) => {

          const overrides = {}

          activeParams.forEach((param, paramIndex) => {

            const current = Number(baseValues[param.name])

            if (!Number.isFinite(current)) return

            const range = this.tuneParamRange(param, current)

            const shifted = (ratio + paramIndex * 0.13) % 1

            overrides[param.name] = this.tuneMidValue(param, range.min, range.max, shifted)

          })

          pushCandidate(`${this.$t(this.tuneMethod === 'de' ? 'strategyCenter.backtest.tunerMethodDe' : 'strategyCenter.backtest.tunerMethodBayes')} #${idx + 1}`, overrides)

        })

      }

      activeParams.slice(0, 4).forEach((param) => {

        const current = Number(baseValues[param.name])

        if (!Number.isFinite(current)) return

        const step = Number(param.step || (param.type === 'integer' ? 1 : 0.1))

        const delta = param.type === 'integer'
          ? Math.max(step, Math.round(Math.abs(current) * 0.2) || step)
          : Math.max(step, Math.abs(current) * 0.2 || step)

        const low = this.clampTuneValue(param, current - delta)

        const high = this.clampTuneValue(param, current + delta)

        pushCandidate(`${param.name} -`, { [param.name]: low })

        pushCandidate(`${param.name} +`, { [param.name]: high })

      })

      if (activeParams.length >= 2) {

        const pairOverrides = {}

        activeParams.slice(0, 2).forEach((param) => {

          const current = Number(baseValues[param.name])

          if (!Number.isFinite(current)) return

          const step = Number(param.step || (param.type === 'integer' ? 1 : 0.1))

          const delta = param.type === 'integer'
            ? Math.max(step, Math.round(Math.abs(current) * 0.2) || step)
            : Math.max(step, Math.abs(current) * 0.2 || step)

          pairOverrides[param.name] = this.clampTuneValue(param, current + delta)

        })

        pushCandidate(this.$t('strategyCenter.backtest.tuneAggressiveCandidate'), pairOverrides)

      }

      return candidates.slice(0, 12)

    },

    buildAdaptiveTuneCandidate (results, candidates) {

      if (!['de', 'bayes'].includes(this.tuneMethod) || !results.length || candidates.length >= 12) return null

      const template = this.scriptParamTemplate

      if (!template) return null

      const baseValues = buildTemplateParamValues(template)

      const activeParams = this.tunableParams.slice(0, 6)

      const ranked = [...results].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))

      const best = ranked[0]

      const second = ranked[1] || best

      const third = ranked[2] || second

      const index = candidates.length + 1

      const overrides = {}

      activeParams.forEach((param, paramIndex) => {

        const current = Number(baseValues[param.name])

        if (!Number.isFinite(current)) return

        const range = this.tuneParamRange(param, current)

        const bestValue = Number(best.params[param.name])

        const secondValue = Number(second.params[param.name])

        const thirdValue = Number(third.params[param.name])

        if (this.tuneMethod === 'de') {

          const factor = 0.45 + ((index + paramIndex) % 3) * 0.15

          const mutant = bestValue + factor * (secondValue - thirdValue)

          overrides[param.name] = this.clampTuneValue(param, Number.isFinite(mutant) ? mutant : current)

          return

        }

        const shrink = Math.max(0.12, 0.42 - results.length * 0.025)

        const direction = ((index + paramIndex) % 2 === 0 ? 1 : -1)

        const span = (Number(range.max) - Number(range.min)) * shrink

        const probe = bestValue + direction * span

        overrides[param.name] = this.clampTuneValue(param, Number.isFinite(probe) ? probe : current)

      })

      const values = { ...baseValues, ...overrides }

      const key = JSON.stringify(values)

      if (candidates.some(item => item.key === key)) return null

      return {

        id: `tune-${index}`,

        key,

        label: `${this.$t(this.tuneMethod === 'de' ? 'strategyCenter.backtest.tunerMethodDe' : 'strategyCenter.backtest.tunerMethodBayes')} #${index}`,

        params: values,

        code: buildScriptCodeWithParamValues(this.scriptCode, template.params, values)

      }

    },

    scoreTuneResult (result) {

      const ret = Number(result && result.totalReturn)

      const alpha = Number(result && result.alphaReturn)

      const drawdown = Math.abs(Number(result && result.maxDrawdown) || 0)

      const sharpe = Number(result && result.sharpeRatio)

      const winRate = Number(result && result.winRate)

      const totalReturn = Number.isFinite(ret) ? ret : 0

      const alphaReturn = Number.isFinite(alpha) ? alpha : 0

      const sharpeScore = Number.isFinite(sharpe) ? sharpe * 10 : 0

      const winScore = Number.isFinite(winRate) ? (winRate - 50) * 0.2 : 0

      return totalReturn * 0.7 + alphaReturn * 0.8 + sharpeScore + winScore - drawdown

    },

    formatTuneParams (params) {

      return Object.keys(params || {}).slice(0, 6).map(key => `${key}: ${params[key]}`).join(' / ')

    },

    tuneRowClassName (record) {

      return record && record.id === this.selectedTuneId ? 'bt-tuner-row--active' : ''

    },
    tuneRowProps (record) {

      return {
        on: {
          click: () => this.selectTuneResult(record)
        }
      }

    },

    selectTuneResult (record) {

      if (!record || !record.result) return

      this.selectedTuneId = record.id

      this.result = record.result

      this.lastRunRange = record.range || this.lastRunRange

    },

    applyTuneResult (record) {

      if (!record || !record.params) return

      this.$emit('apply-tune-params', {

        params: { ...record.params },

        code: record.code,

        result: record.result

      })

      this.$message.success(this.$t('strategyCenter.backtest.tuneApplied'))

    },

    async runStructuredTune () {

      if (!this.canTuneScriptParams) {

        this.$message.warning(this.$t('strategyCenter.backtest.tuneNoParams'))

        return

      }

      if (!this.startDate || !this.endDate) {

        this.$message.warning(this.$t('strategyCenter.backtest.dateRequired'))

        return

      }

      this.syncDateRangeToStrategy()

      const candidates = this.buildTuneCandidates()

      if (!candidates.length) {

        this.$message.warning(this.$t('strategyCenter.backtest.tuneNoParams'))

        return

      }

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

      const startStr = moment(this.startDate).format('YYYY-MM-DD')

      const endStr = moment(this.endDate).format('YYYY-MM-DD')

      this.tuning = true

      this.tuneCandidates = candidates

      this.tuneResults = []

      this.selectedTuneId = ''

      this.tuningProgress = { done: 0, total: Math.max(candidates.length, ['de', 'bayes'].includes(this.tuneMethod) ? 12 : candidates.length) }

      try {

        for (let i = 0; i < candidates.length; i++) {

          const candidate = candidates[i]

          const payload = {
            startDate: startStr,
            endDate: endStr,
            timeout: BACKTEST_TIMEOUT,
            persist: false,
            runPurpose: 'script_param_tuning',
            tuningMethod: this.tuneMethod,
            overrideConfig: {
              ...(overrideConfig || {}),
              codeOverride: candidate.code,
              runPurpose: 'script_param_tuning',
              tuningMethod: this.tuneMethod
            }
          }

          if (effectiveStrategyId) payload.strategyId = Number(effectiveStrategyId)
          else payload.scriptSourceId = Number(effectiveScriptSourceId)

          try {

            const res = await runStrategyBacktest(payload)

            if (res.code === 1 && res.data) {

              const normalized = this.normalizeBacktestResult((res.data && res.data.result) || res.data)

              const item = {
                ...candidate,
                result: normalized,
                range: { start: startStr, end: endStr },
                totalReturn: normalized.totalReturn,
                alphaReturn: normalized.alphaReturn,
                maxDrawdown: normalized.maxDrawdown,
                sharpeRatio: normalized.sharpeRatio,
                winRate: normalized.winRate,
                totalTrades: normalized.totalTrades,
                score: this.scoreTuneResult(normalized)
              }

              this.tuneResults.push(item)

            }

          } finally {

            if (['de', 'bayes'].includes(this.tuneMethod) && candidates.length < 12) {

              const next = this.buildAdaptiveTuneCandidate(this.tuneResults, candidates)

              if (next) {

                candidates.push(next)

                this.tuneCandidates = [...candidates]

              }

            }

            this.tuningProgress = {
              done: this.tuningProgress.done + 1,
              total: Math.max(candidates.length, this.tuningProgress.total)
            }

          }

        }

        if (this.rankedTuneResults.length) {

          this.selectTuneResult(this.rankedTuneResults[0])

          this.$message.success(this.$t('strategyCenter.backtest.tuneSuccess'))

        } else {

          this.$message.warning(this.$t('strategyCenter.backtest.tuneNoResult'))

        }

      } catch (e) {

        this.$message.error(e.message || this.$t('strategyCenter.backtest.tuneFailed'))

      } finally {

        this.tuning = false

      }

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

      const normalized = key.toLowerCase().replace(/\s+/g, '_')

      const map = {
        open_long: this.$t('strategyCenter.backtest.tradeTypeOpenLong'),
        close_long: this.$t('strategyCenter.backtest.tradeTypeCloseLong'),
        open_short: this.$t('strategyCenter.backtest.tradeTypeOpenShort'),
        close_short: this.$t('strategyCenter.backtest.tradeTypeCloseShort'),
        add_long: this.$t('strategyCenter.backtest.tradeTypeAddLong'),
        reduce_long: this.$t('strategyCenter.backtest.tradeTypeReduceLong')
      }

      return map[normalized] || key.replace(/_/g, ' ')

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

    .anticon { color: var(--primary-color, #1890ff); }

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

    box-shadow: 0 2px 8px var(--primary-color-ring, rgba(24, 144, 255, 0.25));

  }



  .bt-tuner-card {

    padding: 16px;

    margin-bottom: 16px;

    border-radius: 12px;

    background: #fff;

    border: 1px solid #e5e7eb;

    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);

  }



  .bt-tuner-head {

    display: flex;

    align-items: flex-start;

    justify-content: space-between;

    gap: 12px;

    margin-bottom: 10px;

  }



  .bt-tuner-title {

    display: flex;

    align-items: center;

    gap: 8px;

    color: #0f172a;

    font-weight: 700;

    .anticon { color: var(--primary-color, #1890ff); }

  }



  .bt-tuner-desc {

    margin-top: 4px;

    color: #64748b;

    font-size: 12px;

    line-height: 1.5;

  }



  .bt-tuner-actions {

    display: flex;

    align-items: center;

    gap: 6px;

    flex-wrap: nowrap;

    justify-content: flex-end;

    padding: 6px;

    border: 1px solid #e5e7eb;

    border-radius: 10px;

    background: #f8fafc;

  }



  .bt-tuner-objective {

    width: 168px;

    ::v-deep .ant-select-selection {

      height: 32px;

      border-color: transparent;

      border-radius: 8px;

      background: #fff;

      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);

    }

    ::v-deep .ant-select-selection__rendered {

      line-height: 30px;

      font-weight: 600;

    }

  }

  .bt-tuner-run-btn {

    height: 32px;

    min-width: 104px;

    border-radius: 8px;

    font-weight: 700;

    box-shadow: 0 6px 14px var(--primary-color-ring, rgba(24, 144, 255, 0.16));

  }



  .bt-tuner-meta {

    display: flex;

    flex-wrap: wrap;

    align-items: center;

    gap: 10px;

    margin-bottom: 10px;

    color: #475569;

    font-size: 12px;

    span {

      display: inline-flex;

      align-items: center;

      gap: 5px;

    }

  }



  .bt-tuner-progress {

    margin-bottom: 10px;

  }



  .bt-tuner-table {

    margin-top: 8px;

    ::v-deep .ant-table-tbody > tr {

      cursor: pointer;

    }

    ::v-deep .ant-table-tbody > tr:hover > td {

      background: var(--primary-color-soft, rgba(24, 144, 255, 0.06));

    }

    ::v-deep .bt-tuner-row--active td {

      background: var(--primary-color-soft, rgba(24, 144, 255, 0.1)) !important;

    }

  }

  .bt-tuner-footer-actions {

    display: flex;

    justify-content: flex-start;

    padding-top: 10px;

    margin-top: 8px;

    border-top: 1px solid #eef2f7;

    ::v-deep .ant-btn {

      border-radius: 8px;

      font-weight: 700;

    }

  }



  .bt-tuner-param-list {

    display: inline-block;

    max-width: 220px;

    color: #475569;

    font-size: 12px;

    white-space: nowrap;

    overflow: hidden;

    text-overflow: ellipsis;

  }



  .bt-running-banner {

    display: flex;

    align-items: center;

    gap: 10px;

    padding: 12px 16px;

    margin-bottom: 16px;

    border-radius: 8px;

    background: var(--primary-color-soft, rgba(24, 144, 255, 0.08));

    border: 1px solid var(--primary-color-ring, rgba(24, 144, 255, 0.2));

    color: var(--primary-color, #1890ff);

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

      color: var(--primary-color-active, #096dd9);

      background: var(--primary-color-soft, rgba(24, 144, 255, 0.08));

      border: 1px solid var(--primary-color-ring, rgba(24, 144, 255, 0.18));

    }

  }

  .bt-analysis-grid {

    display: grid;

    grid-template-columns: minmax(0, 1.35fr) minmax(220px, 0.9fr);

    gap: 12px;

    margin-bottom: 14px;

    @media (max-width: 900px) {

      grid-template-columns: 1fr;

    }

  }

  .bt-chart-card {

    min-width: 0;

    padding: 14px;

    border-radius: 10px;

    border: 1px solid #e8ecf1;

    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);

  }

  .bt-chart-card__head {

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 10px;

    margin-bottom: 12px;

    color: #1e293b;

    font-size: 13px;

    font-weight: 700;

    span {

      display: inline-flex;

      align-items: center;

      gap: 6px;

      min-width: 0;

    }

    .anticon,
    ::v-deep .anticon { color: var(--primary-color, #1890ff); }

    small {

      flex-shrink: 0;

      color: #94a3b8;

      font-size: 11px;

      font-weight: 500;

    }

  }

  .bt-chart-legend {

    display: flex;

    align-items: center;

    flex-wrap: wrap;

    gap: 10px 14px;

    margin: -4px 0 10px;

    color: #64748b;

    font-size: 11px;

    span {

      display: inline-flex;

      align-items: center;

      gap: 6px;

    }

    i {

      width: 18px;

      height: 3px;

      border-radius: 999px;

      display: inline-block;

      &.benchmark {

        height: 0;

        border-top: 2px dashed #64748b;

        background: transparent;

      }

    }

    strong {

      margin-left: auto;

      font-weight: 700;

      &.profit { color: #16a34a; }

      &.loss { color: #ef4444; }

    }

  }

  .bt-equity-chart {

    height: 180px;

    border-radius: 8px;

    overflow: hidden;

    background: #f8fafc;

    svg {

      width: 100%;

      height: 100%;

      display: block;

    }

  }

  .bt-chart-grid line {

    stroke: rgba(148, 163, 184, 0.22);

    stroke-width: 1;

  }

  .bt-equity-line {

    fill: none;

    stroke-width: 3;

    stroke-linecap: round;

    stroke-linejoin: round;

  }

  .bt-benchmark-line {

    fill: none;

    stroke: #64748b;

    stroke-width: 2.5;

    stroke-dasharray: 7 6;

    stroke-linecap: round;

    stroke-linejoin: round;

  }

  .bt-equity-area {

    stroke: none;

  }

  .bt-profit-bars {

    display: flex;

    flex-direction: column;

    gap: 9px;

  }

  .bt-profit-bar {

    display: grid;

    grid-template-columns: 34px minmax(0, 1fr) 72px;

    align-items: center;

    gap: 8px;

    font-size: 12px;

  }

  .bt-profit-bar__label {

    color: #94a3b8;

  }

  .bt-profit-bar__track {

    height: 8px;

    border-radius: 999px;

    background: #eef2f7;

    overflow: hidden;

  }

  .bt-profit-bar__fill {

    display: block;

    height: 100%;

    border-radius: inherit;

    &.profit { background: linear-gradient(90deg, #22c55e, #86efac); }

    &.loss { background: linear-gradient(90deg, #ff7875, #ffccc7); }

  }

  .bt-profit-bar strong,
  .bt-summary-item strong {

    text-align: right;

    font-weight: 700;

    color: #64748b;

    &.profit { color: #16a34a; }

    &.loss { color: #ef4444; }

  }

  .bt-summary-strip {

    display: grid;

    grid-template-columns: repeat(6, minmax(0, 1fr));

    gap: 8px;

    margin-bottom: 14px;

    @media (max-width: 900px) {

      grid-template-columns: repeat(2, minmax(0, 1fr));

    }

  }

  .bt-summary-item {

    min-width: 0;

    padding: 10px 12px;

    border-radius: 8px;

    background: #f8fafc;

    border: 1px solid #eef2f7;

    span {

      display: block;

      margin-bottom: 5px;

      color: #64748b;

      font-size: 11px;

      white-space: nowrap;

      overflow: hidden;

      text-overflow: ellipsis;

    }

    strong {

      display: block;

      text-align: left;

      font-size: 14px;

    }

  }

  .bt-chart-empty {

    display: flex;

    align-items: center;

    justify-content: center;

    min-height: 120px;

    color: #94a3b8;

    font-size: 12px;

    text-align: center;

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

    background: #181818;

    border-color: #303030;

  }

  .bt-toolbar__title { color: rgba(255, 255, 255, 0.9); }

  .preset-label, .date-field label { color: rgba(255, 255, 255, 0.45); }

  .bt-tuner-card {

    background: #181818;

    border-color: #303030;

    box-shadow: none;

  }

  .bt-tuner-title {

    color: rgba(255, 255, 255, 0.88);

  }

  .bt-tuner-desc,
  .bt-tuner-meta,
  .bt-tuner-param-list {

    color: rgba(255, 255, 255, 0.5);

  }

  .bt-tuner-actions {

    background: rgba(255, 255, 255, 0.04);

    border-color: rgba(255, 255, 255, 0.08);

  }

  .bt-tuner-objective ::v-deep .ant-select-selection {

    background: #1f1f1f;

    border-color: rgba(255, 255, 255, 0.08);

    color: rgba(255, 255, 255, 0.82);

    box-shadow: none;

  }

  .bt-tuner-footer-actions {

    border-top-color: rgba(255, 255, 255, 0.08);

  }

  .bt-tuner-table {

    ::v-deep .ant-table {

      color: rgba(255, 255, 255, 0.72);

      background: transparent;

    }

    ::v-deep .ant-table-bordered,
    ::v-deep .ant-table-bordered .ant-table-content,
    ::v-deep .ant-table-bordered .ant-table-body,
    ::v-deep .ant-table-bordered .ant-table-header,
    ::v-deep .ant-table-small,
    ::v-deep .ant-table-content,
    ::v-deep .ant-table-body,
    ::v-deep .ant-table-scroll,
    ::v-deep .ant-table-header,
    ::v-deep .ant-table-placeholder,
    ::v-deep table {

      border-color: #303030 !important;

      box-shadow: none !important;

    }

    ::v-deep .ant-table-thead > tr > th {

      background: rgba(255, 255, 255, 0.04);

      color: rgba(255, 255, 255, 0.62);

      border-bottom-color: rgba(255, 255, 255, 0.08);

      border-right-color: rgba(255, 255, 255, 0.06) !important;

      box-shadow: none !important;

    }

    ::v-deep .ant-table-tbody > tr > td {

      border-bottom-color: rgba(255, 255, 255, 0.06);

      border-right-color: rgba(255, 255, 255, 0.04) !important;

      box-shadow: none !important;

    }

    ::v-deep .ant-table-tbody > tr:hover > td,
    ::v-deep .bt-tuner-row--active td {

      background: var(--primary-color-soft-strong, rgba(24, 144, 255, 0.14)) !important;

    }

    ::v-deep .ant-badge-status-text {

      color: rgba(255, 255, 255, 0.66) !important;

    }

  }

  .bt-result-card {

    background: #181818;

    border-color: #303030;

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

    background: var(--primary-color-soft, rgba(24, 144, 255, 0.1));

    border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.24));

  }

  .bt-chart-card {

    background: rgba(255, 255, 255, 0.025);

    border-color: rgba(255, 255, 255, 0.08);

  }

  .bt-chart-card__head {

    color: rgba(255, 255, 255, 0.84);

    .anticon,
    ::v-deep .anticon { color: var(--primary-color, #1890ff); }

    small { color: rgba(255, 255, 255, 0.38); }

  }

  .bt-chart-legend {

    color: rgba(255, 255, 255, 0.48);

    i.benchmark {

      border-top-color: rgba(255, 255, 255, 0.48);

    }

  }

  .bt-equity-chart {

    background: rgba(255, 255, 255, 0.025);

  }

  .bt-chart-grid line {

    stroke: rgba(255, 255, 255, 0.08);

  }

  .bt-benchmark-line {

    stroke: rgba(255, 255, 255, 0.52);

  }

  .bt-profit-bar__label {

    color: rgba(255, 255, 255, 0.45);

  }

  .bt-profit-bar__track {

    background: rgba(255, 255, 255, 0.08);

  }

  .bt-summary-item {

    background: rgba(255, 255, 255, 0.025);

    border-color: rgba(255, 255, 255, 0.08);

    span { color: rgba(255, 255, 255, 0.45); }

  }

  .bt-chart-empty {

    color: rgba(255, 255, 255, 0.42);

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

    ::v-deep .ant-table-bordered,
    ::v-deep .ant-table-bordered .ant-table-content,
    ::v-deep .ant-table-bordered .ant-table-body,
    ::v-deep .ant-table-bordered .ant-table-header,
    ::v-deep .ant-table-small,
    ::v-deep .ant-table-content,
    ::v-deep .ant-table-body,
    ::v-deep .ant-table-scroll,
    ::v-deep .ant-table-header,
    ::v-deep .ant-table-placeholder,
    ::v-deep table {

      border-color: #303030 !important;

      box-shadow: none !important;

    }

    ::v-deep .ant-table-thead > tr > th {

      background: rgba(255, 255, 255, 0.04);

      color: rgba(255, 255, 255, 0.7);

      border-bottom-color: rgba(255, 255, 255, 0.08);

      border-right-color: rgba(255, 255, 255, 0.06) !important;

      box-shadow: none !important;

    }

    ::v-deep .ant-table-tbody > tr > td {

      border-bottom-color: rgba(255, 255, 255, 0.06);

      border-right-color: rgba(255, 255, 255, 0.04) !important;

      box-shadow: none !important;

    }

    ::v-deep .ant-table-tbody > tr:hover > td {

      background: rgba(255, 255, 255, 0.04);

    }

    ::v-deep .ant-badge-status-text {

      color: rgba(255, 255, 255, 0.66) !important;

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
