<template>
  <section
    class="operations-workspace"
    :class="{ 'theme-dark': dark, 'is-empty': !loading && strategies.length === 0 }"
  >
    <a-alert v-if="loadError" type="warning" show-icon :message="$t('globalMarket.refreshError')" />

    <div v-if="!loading && strategies.length === 0" class="workspace-empty">
      <a-icon type="fund" />
      <h2>{{ $t('strategyCenter.console.emptyTitle') }}</h2>
      <p>{{ $t('strategyCenter.console.emptyDescription') }}</p>
      <a-button type="primary" @click="$emit('open-workspace')">{{ $t('strategyCenter.stats.createLive') }}</a-button>
    </div>

    <template v-else>
      <aside class="strategy-master">
        <nav class="master-tabs" :aria-label="$t('strategyCenter.console.filterLabel')">
          <button
            v-for="tab in statusTabs"
            :key="tab.key"
            type="button"
            :class="{ active: statusTab === tab.key }"
            @click="statusTab = tab.key"
          >
            <span>{{ tab.label }}</span><b>{{ tab.count }}</b>
          </button>
        </nav>
        <a-input-search
          v-model="keyword"
          allow-clear
          class="master-search"
          :placeholder="$t('strategyCenter.console.searchPlaceholder')"
        />

        <div class="master-columns">
          <span>{{ $t('strategyCenter.console.strategyAndSymbol') }}</span>
          <span>{{ $t('systemOverview.colStatus') }}</span>
          <span>{{ $t('strategyCenter.console.todayPnl') }}</span>
        </div>

        <div class="strategy-list" :class="{ 'is-loading': loading }">
          <button
            v-for="strategy in filteredStrategies"
            :key="strategy.id"
            type="button"
            class="strategy-row"
            :class="{ selected: selectedId === strategy.id, attention: needsAttention(strategy) }"
            @click="selectStrategy(strategy)"
          >
            <span class="row-main">
              <strong>{{ strategy.strategy_name || '-' }}</strong>
              <small>{{ symbol(strategy) || '-' }}<template v-if="timeframe(strategy)"> · {{ timeframe(strategy) }}</template><template v-if="liveExchangeName(strategy)"> · {{ liveExchangeName(strategy) }}</template></small>
            </span>
            <span class="row-status">
              <i :class="statusClass(strategy)"></i>{{ statusLabel(strategy) }}
              <em :class="executionMode(strategy)">{{ executionLabel(strategy) }}</em>
            </span>
            <span class="row-pnl" :class="pnlClass(strategyPnl(strategy))">{{ formatPnl(strategyPnl(strategy)) }}</span>
          </button>
          <div v-if="!loading && filteredStrategies.length === 0" class="list-empty">
            <a-icon type="inbox" />
            <span>{{ $t('strategyCenter.console.noMatches') }}</span>
            <a-button v-if="statusTab !== 'all'" type="link" size="small" @click="statusTab = 'all'">
              {{ $t('systemOverview.filterAll') }}
            </a-button>
          </div>
        </div>
        <footer>{{ $t('strategyCenter.console.strategyCount', { count: filteredStrategies.length }) }}</footer>
      </aside>

      <main v-if="selectedStrategy" class="strategy-detail">
        <header class="detail-header">
          <div>
            <div class="detail-title-line">
              <h2>{{ selectedStrategy.strategy_name || '-' }}</h2>
              <span class="detail-symbol">{{ symbol(selectedStrategy) }}</span>
              <span class="status-pill" :class="statusClass(selectedStrategy)">{{ statusLabel(selectedStrategy) }}</span>
              <span class="execution-pill" :class="executionMode(selectedStrategy)">{{ executionLabel(selectedStrategy) }}</span>
              <span v-if="liveExchangeName(selectedStrategy)" class="exchange-pill">
                <a-icon type="bank" />{{ liveExchangeName(selectedStrategy) }}
              </span>
            </div>
            <p>
              {{ $t('strategyCenter.console.startedAt') }} · {{ formatTime(health(selectedStrategy).started_at || selectedStrategy.started_at || selectedStrategy.created_at) }}
              <span>·</span> {{ $t('liveMonitor.heartbeat') }} · {{ formatTime(lastActivity(selectedStrategy)) }}
            </p>
          </div>
          <div class="detail-actions">
            <a-button
              v-if="!isRunning(selectedStrategy)"
              type="primary"
              icon="caret-right"
              :loading="controlLoadingId === selectedStrategy.id"
              @click="$emit('start', selectedStrategy)"
            >{{ $t('trading-assistant.startStrategy') }}</a-button>
            <div v-else class="pause-actions">
              <a-popconfirm
                :title="$t('strategyCenter.console.pauseConfirm')"
                :ok-text="$t('strategyCenter.console.pauseOnly')"
                :cancel-text="$t('common.cancel')"
                @confirm="$emit('stop', selectedStrategy, { closePositions: false })"
              >
                <a-button icon="pause" :loading="controlLoadingId === selectedStrategy.id">
                  {{ $t('strategyCenter.console.pauseOnly') }}
                </a-button>
              </a-popconfirm>
              <a-popconfirm
                :title="$t('strategyCenter.console.stopAndCloseConfirm')"
                :ok-text="$t('strategyCenter.console.stopAndClose')"
                :cancel-text="$t('common.cancel')"
                ok-type="danger"
                @confirm="$emit('stop', selectedStrategy, { closePositions: true })"
              >
                <a-button icon="stop" type="danger" ghost :loading="controlLoadingId === selectedStrategy.id">
                  {{ $t('strategyCenter.console.stopAndClose') }}
                </a-button>
              </a-popconfirm>
            </div>
            <a-button icon="edit" :disabled="isRunning(selectedStrategy)" @click="$emit('edit', selectedStrategy)">{{ $t('trading-assistant.editStrategy') }}</a-button>
            <a-popconfirm
              :title="$t('trading-assistant.messages.deleteConfirmWithName', { name: selectedStrategy.strategy_name || '-' })"
              :ok-text="$t('trading-assistant.deleteStrategy')"
              :cancel-text="$t('common.cancel')"
              ok-type="danger"
              :disabled="isRunning(selectedStrategy)"
              @confirm="$emit('delete', selectedStrategy)"
            >
              <a-button
                class="delete-strategy-button"
                icon="delete"
                :disabled="isRunning(selectedStrategy)"
                :loading="controlLoadingId === selectedStrategy.id"
              >{{ $t('trading-assistant.deleteStrategy') }}</a-button>
            </a-popconfirm>
          </div>
        </header>

        <div class="runtime-status-bar" :aria-label="$t('strategyCenter.console.runtimeStatus')">
          <span>
            {{ $t('liveMonitor.health') }}
            <strong :class="healthClass(selectedStrategy)">{{ healthLabel(selectedStrategy) }}</strong>
          </span>
          <span>
            {{ $t('strategyCenter.console.latency') }}
            <strong>{{ runtimeLatency(selectedStrategy) }} ms</strong>
          </span>
          <span>
            {{ pendingWorkLabel(selectedStrategy) }}
            <strong>{{ health(selectedStrategy).pending_orders || 0 }}</strong>
          </span>
        </div>

        <section class="metric-section financial-metrics">
          <div class="metric-section-head">
            <h3>{{ $t('strategyCenter.console.financialOverview') }}</h3>
            <span>{{ financialMetricContext }}</span>
          </div>
          <div class="financial-strip">
            <div>
              <span>{{ $t('strategyCenter.console.strategyCapital') }}</span>
              <strong>{{ formatLiveMoney(performanceSummary.capital) }}</strong>
              <small>{{ financialMetricSuffix }}</small>
            </div>
            <div class="primary-financial-card">
              <span>{{ $t('strategyCenter.console.currentEquity') }}</span>
              <strong>{{ formatLiveMoney(performanceSummary.latestEquity) }}</strong>
              <small>{{ financialMetricSuffix }}</small>
            </div>
            <div>
              <span>{{ $t('strategyCenter.console.cumulativeNetPnl') }}</span>
              <strong :class="hasFinancialLedger ? pnlClass(performanceSummary.netPnl) : ''">{{ formatLiveMoney(performanceSummary.netPnl, true) }}</strong>
              <small>{{ financialMetricSuffix }}</small>
            </div>
            <div>
              <span :title="$t('strategyCenter.console.currentExposureHint')">{{ $t('strategyCenter.console.currentExposure') }}</span>
              <strong>{{ formatLiveMoney(performanceSummary.grossExposure) }}</strong>
              <small>{{ financialMetricSuffix }}</small>
            </div>
            <div>
              <span>{{ $t('strategyCenter.console.leverage') }}</span>
              <strong>{{ leverageDisplay }}</strong>
              <small>{{ leverageMarketLabel }}</small>
            </div>
          </div>
        </section>

        <section class="metric-section performance-metrics">
          <div class="metric-section-head">
            <h3>{{ $t('strategyCenter.console.performanceOverview') }}</h3>
            <span>{{ $t('strategyCenter.console.realtimeData') }}</span>
          </div>
          <div class="performance-strip">
            <div>
              <span>{{ $t('strategyCenter.console.todayPnl') }}</span>
              <strong :class="hasFinancialLedger ? pnlClass(strategyPnl(selectedStrategy)) : ''">{{ formatLivePnl(strategyPnl(selectedStrategy)) }}</strong>
              <small
                v-if="hasFinancialLedger && selectedStrategy.today_pnl_estimated"
                :title="$t('strategyCenter.console.todayPnlEstimatedHint')"
              >{{ $t('strategyCenter.console.todayPnlEstimated') }}</small>
            </div>
            <div>
              <span>{{ $t('trading-assistant.performance.totalReturn') }}</span>
              <strong :class="hasFinancialLedger ? pnlClass(performanceSummary.totalReturn) : ''">{{ formatLivePercent(performanceSummary.totalReturn) }}</strong>
            </div>
            <div>
              <span>{{ $t('trading-assistant.performance.maxDrawdown') }}</span>
              <strong class="drawdown-value">{{ formatLivePercent(Math.abs(performanceSummary.maxDrawdown), false) }}</strong>
            </div>
            <div>
              <span>{{ $t('trading-assistant.performance.winRate') }}</span>
              <strong>{{ formatLivePercent(performanceSummary.winRate, false) }}</strong>
              <small v-if="hasFinancialLedger && performanceSummary.completedTrades">
                {{ $t('strategyCenter.console.winRateSample', { wins: performanceSummary.wins, total: performanceSummary.completedTrades }) }}
              </small>
            </div>
            <div>
              <span>{{ $t('strategyCenter.console.completedTrades') }}</span>
              <strong>{{ hasFinancialLedger ? performanceSummary.completedTrades : '—' }}</strong>
            </div>
          </div>
        </section>

        <a-tabs v-model="detailTab" class="runtime-tabs" :animated="false">
          <a-tab-pane v-if="isGridStrategy" key="grid-orders" :tab="$t('strategyCenter.gridOrders.tab')">
            <grid-resting-orders
              v-if="detailTab === 'grid-orders'"
              :strategy-id="Number(selectedStrategy.id)"
              :is-dark="dark"
            />
          </a-tab-pane>
          <a-tab-pane key="overview" :tab="$t('strategyCenter.tabs.overview')">
            <section class="positions-panel panel-section overview-positions-panel">
              <div class="section-head">
                <h3>{{ $t('strategyCenter.console.currentPositions') }}</h3>
                <span>{{ $t('strategyCenter.console.realtimeData') }}</span>
              </div>
              <position-records
                v-if="detailTab === 'overview'"
                compact
                :strategy-id="Number(selectedStrategy.id)"
                :execution-mode="executionMode(selectedStrategy)"
                :market-type="tradingConfig(selectedStrategy).market_type || 'swap'"
                :leverage="tradingConfig(selectedStrategy).leverage || 1"
                :is-dark="dark"
              />
            </section>
            <section class="equity-panel panel-section overview-equity-panel">
              <div class="section-head">
                <h3>{{ $t('strategyCenter.console.equityCurve') }}</h3>
                <span>{{ $t('strategyCenter.console.realtimeData') }}</span>
              </div>
              <div v-show="hasEquitySeries" ref="equityChart" class="equity-chart"></div>
              <div v-if="!detailLoading && !hasEquitySeries" class="section-empty">
                <a-icon type="line-chart" />
                <span>{{ $t('strategyCenter.console.noEquityData') }}</span>
              </div>
            </section>
          </a-tab-pane>
          <a-tab-pane key="trades" :tab="$t('trading-assistant.tabs.tradingRecords')">
            <trading-records
              v-if="detailTab === 'trades'"
              :strategy-id="Number(selectedStrategy.id)"
              :is-dark="dark"
              :bot-type="selectedStrategy.bot_type || ''"
            />
          </a-tab-pane>
          <a-tab-pane v-if="aiDecisionFilterEnabled" key="ai-decisions" :tab="$t('aiDecisionFilter.tab')">
            <ai-decision-records
              v-if="detailTab === 'ai-decisions'"
              :strategy-id="Number(selectedStrategy.id)"
              :is-dark="dark"
            />
          </a-tab-pane>
          <a-tab-pane key="review" :tab="$t('trading-assistant.tabs.aiReview')">
            <strategy-review-report
              v-if="detailTab === 'review'"
              :strategy-id="Number(selectedStrategy.id)"
              :is-dark="dark"
              :bot-type="selectedStrategy.bot_type || ''"
            />
          </a-tab-pane>
          <a-tab-pane key="logs" :tab="$t('trading-assistant.tabs.logs')">
            <strategy-logs v-if="detailTab === 'logs'" :strategy-id="Number(selectedStrategy.id)" :is-dark="dark" />
          </a-tab-pane>
        </a-tabs>
      </main>

      <main v-else class="strategy-detail detail-empty"><a-spin :spinning="loading" /></main>
    </template>
  </section>
</template>

<script>
import * as echarts from 'echarts'
import { getStrategyDetail, getStrategyEquityCurve, getStrategyTrades } from '@/api/strategy'
import PositionRecords from './PositionRecords.vue'
import TradingRecords from './TradingRecords.vue'
import StrategyReviewReport from './StrategyReviewReport.vue'
import StrategyLogs from './StrategyLogs.vue'
import GridRestingOrders from './GridRestingOrders.vue'
import AiDecisionRecords from './AiDecisionRecords.vue'
import { getExchangeDisplayName } from '@/utils/exchangeCredential'
import {
  normalizeTimestampMilliseconds,
  strategyExchangeId,
  strategyExecutionMode,
  strategyLeverage,
  strategyLastActivity,
  strategyQuoteCurrency,
  strategySymbol,
  strategyTradingConfig,
  summarizeStrategyPerformance
} from '@/utils/strategyRuntime'

export default {
  name: 'LiveOperationsTable',
  components: { PositionRecords, TradingRecords, StrategyReviewReport, StrategyLogs, GridRestingOrders, AiDecisionRecords },
  props: {
    strategies: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    loadError: { type: Boolean, default: false },
    dark: { type: Boolean, default: false },
    initialStrategyId: { type: Number, default: 0 },
    controlLoadingId: { type: [Number, String], default: null }
  },
  data () {
    return {
      selectedId: null,
      selectedDetail: null,
      detailTab: 'overview',
      statusTab: 'all',
      keyword: '',
      curve: [],
      trades: [],
      detailLoading: false,
      chart: null,
      detailRequestId: 0
    }
  },
  computed: {
    selectedStrategy () {
      const base = this.strategies.find(item => item.id === this.selectedId)
      // The list endpoint owns volatile runtime fields such as status and heartbeat.
      // Detail data is useful for richer configuration, but it may lag behind a
      // start or stop request and must not overwrite the refreshed list state.
      return base ? { ...(this.selectedDetail || {}), ...base } : null
    },
    isGridStrategy () {
      const strategy = this.selectedStrategy || {}
      if (this.executionMode(strategy) !== 'live') return false
      const config = strategyTradingConfig(strategy)
      const type = String(strategy.resolved_bot_type || strategy.bot_type || config.bot_type || config.executor_type || '').toLowerCase().replace(/-/g, '_')
      const template = String(strategy.template_key || config.template_key || '').toLowerCase()
      const params = config.bot_params && typeof config.bot_params === 'object' ? config.bot_params : {}
      const parameterKeys = Object.keys(params).map(key => String(key).toLowerCase().replace(/_/g, ''))
      const hasGridParameters = ['gridcount', 'lowerprice', 'upperprice'].every(key => parameterKeys.includes(key))
      const triggerMode = String(this.health(strategy).trigger_mode || '').toLowerCase()
      return type === 'grid' || hasGridParameters || template.includes('robot_v2_grid') || triggerMode === 'exchange_resting_orders'
    },
    aiDecisionFilterEnabled () {
      return Boolean(strategyTradingConfig(this.selectedStrategy || {}).ai_decision_filter)
    },
    runningStrategies () {
      return this.strategies.filter(this.isRunning)
    },
    attentionStrategies () {
      return this.strategies.filter(this.needsAttention)
    },
    statusTabs () {
      return [
        { key: 'running', label: this.$t('systemOverview.filterRunning'), count: this.runningStrategies.length },
        { key: 'attention', label: this.$t('liveMonitor.attention'), count: this.attentionStrategies.length },
        { key: 'all', label: this.$t('systemOverview.filterAll'), count: this.strategies.length }
      ]
    },
    filteredStrategies () {
      const source = this.statusTab === 'attention'
        ? this.attentionStrategies
        : this.statusTab === 'running' ? this.runningStrategies : this.strategies
      const term = this.keyword.trim().toLowerCase()
      return source.filter(item => !term || [item.strategy_name, item.id, this.symbol(item)].join(' ').toLowerCase().includes(term))
    },
    hasEquitySeries () {
      return this.curve.filter(item => Number.isFinite(Number(item && (item.equity != null ? item.equity : item.value)))).length >= 2
    },
    performanceSummary () {
      return {
        ...summarizeStrategyPerformance({
          strategy: this.selectedStrategy,
          curve: this.curve,
          trades: this.trades
        }),
        grossExposure: Number(this.health(this.selectedStrategy).gross_exposure || 0)
      }
    },
    isLiveFinancial () {
      return this.selectedStrategy && this.executionMode(this.selectedStrategy) === 'live'
    },
    hasFinancialLedger () {
      return this.selectedStrategy && ['live', 'signal'].includes(this.executionMode(this.selectedStrategy))
    },
    financialCurrency () {
      return strategyQuoteCurrency(this.selectedStrategy)
    },
    financialMetricContext () {
      return this.isLiveFinancial
        ? this.$t('strategyCenter.console.netPnlBasis')
        : this.$t('strategyCenter.console.virtualAccountBasis')
    },
    financialMetricSuffix () {
      return this.isLiveFinancial
        ? this.financialCurrency
        : this.$t('strategyCenter.console.virtualAccount')
    },
    leverageDisplay () {
      if (!this.hasFinancialLedger) return '—'
      return `${strategyLeverage(this.selectedStrategy).toLocaleString(undefined, { maximumFractionDigits: 2 })}×`
    },
    leverageMarketLabel () {
      if (!this.isLiveFinancial) return this.$t('strategyCenter.console.virtualAccount')
      const marketType = String(this.tradingConfig(this.selectedStrategy).market_type || this.selectedStrategy.market_type || '').toLowerCase()
      return marketType === 'spot'
        ? this.$t('strategyCenter.console.spotMarket')
        : this.$t('strategyCenter.console.swapMarket')
    }
  },
  watch: {
    strategies: {
      immediate: true,
      handler (list) {
        if (!Array.isArray(list) || !list.length) {
          this.selectedId = null
          return
        }
        const preferred = this.initialStrategyId && list.find(item => Number(item.id) === Number(this.initialStrategyId))
        const current = list.find(item => item.id === this.selectedId)
        const next = preferred || current || list.find(this.isRunning) || list[0]
        if (next && next.id !== this.selectedId) this.selectStrategy(next)
      }
    },
    dark () {
      this.$nextTick(this.renderChart)
    },
    detailTab (value) {
      if (value === 'overview') this.$nextTick(this.renderChart)
    }
  },
  mounted () {
    window.addEventListener('resize', this.resizeChart)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.resizeChart)
    if (this.chart) this.chart.dispose()
  },
  methods: {
    selectStrategy (strategy) {
      if (!strategy || !strategy.id) return
      this.selectedId = strategy.id
      this.detailTab = 'overview'
      this.selectedDetail = null
      this.loadDetails(strategy.id)
    },
    async loadDetails (id) {
      const requestId = ++this.detailRequestId
      this.detailLoading = true
      this.curve = []
      this.trades = []
      try {
        const [detailRes, curveRes, tradesRes] = await Promise.all([
          getStrategyDetail(id).catch(() => null),
          getStrategyEquityCurve(id).catch(() => null),
          getStrategyTrades(id).catch(() => null)
        ])
        if (requestId !== this.detailRequestId) return
        if (detailRes && detailRes.code === 1) this.selectedDetail = detailRes.data || null
        this.curve = curveRes && curveRes.code === 1 && Array.isArray(curveRes.data) ? curveRes.data : []
        if (tradesRes && tradesRes.code === 1 && tradesRes.data) {
          this.trades = tradesRes.data.trades || tradesRes.data.items || []
        }
      } finally {
        if (requestId === this.detailRequestId) {
          this.detailLoading = false
          this.$nextTick(this.renderChart)
        }
      }
    },
    renderChart () {
      const el = this.$refs.equityChart
      if (!el || !this.hasEquitySeries) {
        if (this.chart) this.chart.clear()
        return
      }
      if (!this.chart) this.chart = echarts.init(el, null, { renderer: 'canvas' })
      const textColor = this.dark ? '#7f8793' : '#748094'
      const lineColor = '#e6a817'
      this.chart.setOption({
        animation: false,
        grid: { left: 58, right: 18, top: 20, bottom: 36 },
        tooltip: { trigger: 'axis', backgroundColor: this.dark ? '#171a1f' : '#fff', borderColor: this.dark ? '#343942' : '#e4e8ef', textStyle: { color: this.dark ? '#e7e9ed' : '#202938' } },
        xAxis: { type: 'category', boundaryGap: false, data: this.curve.map(item => this.shortTime(item.timestamp || item.time || item.created_at)), axisLine: { lineStyle: { color: this.dark ? '#30343b' : '#dde2e9' } }, axisLabel: { color: textColor, hideOverlap: true }, axisTick: { show: false } },
        yAxis: { type: 'value', scale: true, splitNumber: 4, axisLabel: { color: textColor }, splitLine: { lineStyle: { color: this.dark ? '#25292f' : '#eceff3' } } },
        series: [{ type: 'line', data: this.curve.map(item => Number(item.equity || item.value || 0)), symbol: 'none', smooth: 0.22, lineStyle: { width: 2, color: lineColor }, itemStyle: { color: lineColor } }]
      }, true)
      this.chart.resize()
    },
    resizeChart () { if (this.chart) this.chart.resize() },
    isRunning (strategy) { return String(strategy && strategy.status || '').toLowerCase() === 'running' },
    executionMode (strategy) { return strategyExecutionMode(strategy) },
    pendingWorkLabel (strategy) {
      return this.executionMode(strategy) === 'live'
        ? this.$t('liveMonitor.pendingOrders')
        : this.$t('strategyCenter.console.pendingSignals')
    },
    liveExchangeName (strategy) {
      if (this.executionMode(strategy) !== 'live') return ''
      const exchangeId = strategyExchangeId(strategy)
      return exchangeId ? getExchangeDisplayName(exchangeId) : ''
    },
    tradingConfig (strategy) { return strategyTradingConfig(strategy) },
    executionLabel (strategy) { return this.executionMode(strategy) === 'live' ? this.$t('systemOverview.live') : this.$t('systemOverview.signal') },
    symbol (strategy) { return strategySymbol(strategy) },
    timeframe (strategy) {
      return String(strategyTradingConfig(strategy).timeframe || strategy.timeframe || '')
    },
    health (strategy) { return strategy && strategy.runtime_health || {} },
    healthState (strategy) {
      const health = this.health(strategy)
      if (health.position_drift_blocked || Number(health.position_drift_count || 0) > 0) return 'degraded'
      return String(health.health || (this.isRunning(strategy) ? 'unknown' : 'inactive')).toLowerCase()
    },
    healthLabel (strategy) { return this.$t(`liveMonitor.${this.healthState(strategy)}`) },
    healthClass (strategy) { return `health-${this.healthState(strategy)}` },
    needsAttention (strategy) {
      const health = this.health(strategy)
      if (typeof health.needs_attention === 'boolean') return health.needs_attention
      return ['degraded', 'stale', 'offline'].includes(this.healthState(strategy)) ||
        Number(health.failed_orders || 0) > 0 ||
        Boolean(health.position_drift_blocked) ||
        Number(health.position_drift_count || 0) > 0
    },
    statusClass (strategy) { return this.needsAttention(strategy) ? 'warning' : (this.isRunning(strategy) ? 'running' : 'stopped') },
    statusLabel (strategy) { return this.needsAttention(strategy) ? this.healthLabel(strategy) : (this.isRunning(strategy) ? this.$t('systemOverview.running') : this.$t('systemOverview.stopped')) },
    strategyPnl (strategy) {
      if (!strategy || strategy.today_pnl == null || strategy.today_pnl === '') return null
      const value = Number(strategy.today_pnl)
      return Number.isFinite(value) ? value : null
    },
    lastActivity (strategy) {
      return this.health(strategy).last_heartbeat_at || strategyLastActivity(strategy)
    },
    pnlClass (value) { const number = Number(value || 0); return number > 0 ? 'profit' : number < 0 ? 'loss' : '' },
    formatPnl (value) {
      if (value == null || value === '' || !Number.isFinite(Number(value))) return '—'
      const number = Number(value)
      return `${number > 0 ? '+' : ''}${number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    formatPercent (value, signed = true) { const number = Number(value || 0) * 100; return `${signed && number > 0 ? '+' : ''}${number.toFixed(2)}%` },
    formatLiveMoney (value, signed = false) {
      if (!this.hasFinancialLedger) return '—'
      const number = Number(value || 0)
      return `${signed && number > 0 ? '+' : ''}${number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    formatLivePnl (value) { return this.hasFinancialLedger ? this.formatPnl(value) : '—' },
    formatLivePercent (value, signed = true) { return this.hasFinancialLedger ? this.formatPercent(value, signed) : '—' },
    runtimeLatency (strategy) {
      const health = this.health(strategy)
      const value = health.latency_ms ?? health.loop_latency_ms
      return value == null || value === '' || !Number.isFinite(Number(value)) ? '-' : Number(value)
    },
    formatTime (value) {
      if (!value) return '-'
      const numeric = typeof value === 'number' || /^\d+(?:\.\d+)?$/.test(String(value).trim()) ? Number(value) : null
      const normalized = numeric != null && Number.isFinite(numeric) && numeric < 100000000000 ? numeric * 1000 : value
      const date = new Date(normalized)
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
    },
    shortTime (value) { if (!value) return ''; const date = new Date(normalizeTimestampMilliseconds(value)); return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }
  }
}
</script>

<style lang="less" scoped>
.operations-workspace {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  min-height: 720px;
  border: 1px solid #e0e5ec;
  background: #fff;
  color: #17202d;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.strategy-master { display: flex; flex-direction: column; min-width: 0; border-right: 1px solid #e4e8ee; background: #fafbfc; }
.master-tabs { display: grid; grid-template-columns: repeat(3, 1fr); padding: 14px 14px 0; border-bottom: 1px solid #e7eaf0; }
.master-tabs button { position: relative; display: flex; justify-content: center; gap: 6px; padding: 11px 4px 13px; border: 0; background: transparent; color: #667085; font-size: 14px; font-weight: 500; cursor: pointer; }
.master-tabs button::after { content: ''; position: absolute; left: 18%; right: 18%; bottom: -1px; height: 2px; background: transparent; }
.master-tabs button.active { color: #b87600; font-weight: 700; }
.master-tabs button.active::after { background: #e6a817; }
.master-tabs b { min-width: 19px; padding: 0 5px; border-radius: 10px; background: #eef0f4; color: #596273; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
.master-search { padding: 14px; }
.master-columns { display: grid; grid-template-columns: 1.3fr .8fr .72fr; gap: 8px; padding: 0 14px 9px; color: #7f8997; font-size: 12px; font-weight: 500; }
.master-columns span:last-child { text-align: right; }
.strategy-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 8px; }
.strategy-row { position: relative; display: grid; grid-template-columns: 1.3fr .8fr .72fr; align-items: center; gap: 8px; width: 100%; min-height: 72px; padding: 12px 10px; border: 0; border-bottom: 1px solid #eceff3; background: transparent; text-align: left; cursor: pointer; }
.strategy-row::before { content: ''; position: absolute; left: 0; top: 12px; bottom: 12px; width: 2px; background: transparent; }
.strategy-row:hover { background: #f4f6f8; }
.strategy-row.selected { background: #fff8e8; }
.strategy-row.selected::before { background: #e6a817; }
.strategy-row.attention::before { background: #dc6b48; }
.row-main, .row-status { display: flex; flex-direction: column; min-width: 0; gap: 4px; }
.row-main strong { display: -webkit-box; overflow: hidden; color: #1a2230; font-size: 14px; font-weight: 650; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.row-main small { overflow: hidden; color: #788391; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.row-status { position: relative; padding-left: 12px; color: #525d6b; font-size: 12px; font-weight: 500; }
.row-status > i { position: absolute; left: 0; top: 4px; width: 6px; height: 6px; border-radius: 50%; }
.row-status > i.running { background: #28a85f; }.row-status > i.warning { background: #e16b47; }.row-status > i.stopped { background: #858c96; }
.row-status em { width: max-content; padding: 1px 5px; border: 1px solid #dfe3e8; border-radius: 3px; color: #697382; font-size: 11px; font-style: normal; font-weight: 500; }.row-status em.live { border-color: rgba(222, 164, 24, .35); color: #a66f00; }
.row-pnl { text-align: right; color: #596273; font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
.profit { color: #24a25a !important; }.loss { color: #d95656 !important; }
.list-empty, .section-empty { display: flex; align-items: center; justify-content: center; min-height: 180px; color: #949ca7; }.section-empty.compact { min-height: 110px; }
.strategy-master footer { padding: 12px 16px; border-top: 1px solid #e7eaf0; color: #7d8794; font-size: 12px; }
.strategy-detail { min-width: 0; padding: 18px; background: #fff; }
.detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid #e6e9ee; }
.detail-title-line { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; }.detail-title-line h2 { margin: 0; color: #151d29; font-size: 21px; font-weight: 700; letter-spacing: -.01em; }.detail-symbol { color: #667085; font-size: 13px; font-weight: 500; }
.detail-header p { margin: 7px 0 0; color: #778290; font-size: 12px; font-variant-numeric: tabular-nums; }.detail-header p span { margin: 0 6px; }
.status-pill, .execution-pill, .exchange-pill { padding: 2px 7px; border-radius: 3px; font-size: 12px; font-weight: 500; }.status-pill.running { color: #269d58; background: rgba(38, 157, 88, .09); }.status-pill.warning { color: #cb5f3f; background: rgba(203, 95, 63, .1); }.status-pill.stopped { color: #66717f; background: #eef0f3; }.execution-pill { border: 1px solid #e1e4e8; color: #66717f; }.execution-pill.live { border-color: rgba(225, 164, 22, .38); color: #a86f00; }.exchange-pill { display: inline-flex; align-items: center; gap: 5px; border: 1px solid rgba(24, 144, 255, .24); color: #1677b8; background: rgba(24, 144, 255, .06); }
.detail-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.pause-actions { display: inline-flex; gap: 8px; }
.delete-strategy-button:not([disabled]) { border-color: rgba(217, 86, 86, .4); color: #d95656; }
.delete-strategy-button:not([disabled]):hover { border-color: #d95656; color: #d95656; }
.runtime-status-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 20px; margin: 10px 2px 12px; color: #788391; font-size: 12px; }
.runtime-status-bar > span { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.runtime-status-bar strong { color: #202a37; font-size: 12px; font-weight: 650; font-variant-numeric: tabular-nums; }
.health-healthy { color: #25a25a !important; }.health-degraded,.health-stale { color: #d18425 !important; }.health-offline { color: #d95656 !important; }
.metric-section { margin-bottom: 12px; }
.metric-section-head { display: flex; align-items: center; justify-content: space-between; min-height: 28px; padding: 0 2px 6px; }
.metric-section-head h3 { margin: 0; color: #353f4c; font-size: 13px; font-weight: 650; }
.metric-section-head > span { color: #89929f; font-size: 11px; }
.financial-strip,.performance-strip { display: grid; gap: 10px; }
.financial-strip { grid-template-columns: 1.05fr 1.1fr 1.1fr 1fr .8fr; }
.performance-strip { grid-template-columns: repeat(5, 1fr); }
.financial-strip > div,.performance-strip > div { min-width: 0; padding: 11px 14px; border: 1px solid #e2e7ee; border-radius: 8px; background: #fff; }
.financial-strip > div { min-height: 84px; }
.performance-strip > div { min-height: 72px; }
.financial-strip span,.performance-strip span { display: block; margin-bottom: 4px; overflow: hidden; color: #7e8896; font-size: 11px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.financial-strip strong,.performance-strip strong { display: block; overflow: hidden; color: #202a37; font-size: 16px; font-weight: 650; font-variant-numeric: tabular-nums; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.financial-strip small,.performance-strip small { display: block; margin-top: 3px; color: #98a0ab; font-size: 10px; font-weight: 500; line-height: 1.3; }
.financial-strip .primary-financial-card { border-color: color-mix(in srgb, var(--primary-color, #1890ff) 32%, #e2e7ee); background: color-mix(in srgb, var(--primary-color, #1890ff) 5%, #fff); }
.financial-strip .primary-financial-card strong { font-size: 18px; }
.performance-strip .drawdown-value { color: #c28818; }
.panel-section { border: 1px solid #e4e8ed; background: #fff; }.section-head { display: flex; align-items: center; justify-content: space-between; min-height: 48px; padding: 0 14px; border-bottom: 1px solid #e7eaf0; }.section-head h3 { margin: 0; color: #242e3b; font-size: 14px; font-weight: 650; }.section-head > span { color: #7e8895; font-size: 12px; }
.equity-chart { height: 310px; }
.overview-equity-panel { margin-top: 12px; }
.overview-positions-panel ::v-deep .position-records { min-height: 0; }
.overview-positions-panel ::v-deep .positions-section { padding: 0 14px 14px; }
.overview-positions-panel ::v-deep .strategy-tab-empty { min-height: 132px; border: 0; background: transparent; }
.workspace-empty { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 620px; padding: 30px; text-align: center; }.workspace-empty > .anticon { margin-bottom: 18px; color: #d19a18; font-size: 42px; }.workspace-empty h2 { margin: 0 0 8px; }.workspace-empty p { max-width: 430px; margin-bottom: 20px; color: #7b8490; }.detail-empty { display: flex; align-items: center; justify-content: center; }
.theme-dark { border-color: #262a30; background: #111315; color: #e5e7eb; .strategy-master { border-color: #292d33; background: #121416; }.master-tabs,.strategy-master footer { border-color: #292d33; }.master-tabs b { background: #25282d; color: #a5abb4; }.strategy-row { border-color: #272b31; }.strategy-row:hover { background: #191c20; }.strategy-row.selected { background: #211d13; }.row-main strong { color: #e7e9ed; }.row-main small,.row-status { color: #818995; }.row-status em { border-color: #383c43; color: #959ca6; }.strategy-detail { background: #101214; }.detail-header,.section-head { border-color: #292d33; }.detail-title-line h2 { color: #f0f1f3; }.status-pill.stopped { background: #262a2f; color: #9ba2ab; }.execution-pill { border-color: #3a3e45; }.runtime-status-bar strong { color: #e1e4e8; }.metric-section-head h3 { color: #d8dce2; }.panel-section { border-color: #292d33; background: #131517; }.section-head h3 { color: #e0e3e7; }.master-search ::v-deep .ant-input { border-color: #30343a; background: #181b1e; color: #e4e7eb; }.master-search ::v-deep .ant-input-search-icon,.master-search ::v-deep .ant-input-clear-icon { color: #8f9baa; }.master-search ::v-deep .ant-input-search-icon:hover,.master-search ::v-deep .ant-input-clear-icon:hover { color: #f1f5f9; }.workspace-empty h2 { color: #eceef1; }}
.theme-dark .exchange-pill { border-color: rgba(64, 169, 255, .3); color: #69c0ff; background: rgba(24, 144, 255, .1); }

/* Operational console layout */
.operations-workspace {
  grid-template-columns: 350px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(24, 32, 44, .06);
}
.operations-workspace.is-empty { grid-template-columns: minmax(0, 1fr); }
.operations-workspace.is-empty .workspace-empty {
  grid-column: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
}
.strategy-master {
  min-height: 0;
  overflow: hidden;
  padding: 14px 12px 12px;
}
.master-tabs {
  gap: 4px;
  padding: 3px;
  border: 1px solid #e4e8ee;
  border-radius: 7px;
  background: #f2f4f7;
}
.master-tabs button {
  min-width: 0;
  padding: 8px 5px;
  border-radius: 5px;
  font-size: 13px;
}
.master-tabs button::after { display: none; }
.master-tabs button.active {
  background: #fff;
  color: var(--primary-color, #1890ff);
  box-shadow: 0 1px 3px rgba(18, 26, 38, .1);
}
.master-tabs b {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  line-height: 18px;
}
.master-search { padding: 12px 0; }
.master-search ::v-deep .ant-input { height: 36px; border-radius: 6px; }
.master-columns { padding: 2px 10px 9px; }
.strategy-list {
  padding: 0;
  border: 1px solid #e5e9ef;
  border-radius: 7px;
  background: #fff;
}
.strategy-row {
  grid-template-columns: minmax(0, 1.65fr) .72fr .5fr;
  min-height: 82px;
  padding: 12px 10px;
}
.strategy-row::before { top: 0; bottom: 0; width: 3px; border-radius: 0 2px 2px 0; }
.strategy-row:last-child { border-bottom: 0; }
.strategy-row.selected {
  background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, #fff);
}
.strategy-row.selected::before { background: var(--primary-color, #1890ff); }
.list-empty {
  flex-direction: column;
  gap: 8px;
  min-height: 210px;
  padding: 24px;
  text-align: center;
}
.list-empty > .anticon { color: #9aa3af; font-size: 24px; }
.strategy-master footer { margin-top: 10px; padding: 4px 4px 0; border: 0; }
.strategy-detail {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 20px;
  background: #f8f9fb;
}
.detail-header {
  align-items: center;
  padding: 16px 18px;
  border: 1px solid #e2e7ee;
  border-radius: 9px;
  background: #fff;
}
.detail-title-line { gap: 8px; }
.detail-title-line h2 { font-size: 22px; }
.detail-actions ::v-deep .ant-btn { height: 36px; border-radius: 6px; }
.runtime-tabs { margin-top: 12px; }
.runtime-tabs ::v-deep .ant-tabs-bar {
  margin: 0 0 12px;
  padding: 0 14px;
  border: 1px solid #e2e7ee;
  border-radius: 8px;
  background: #fff;
}
.runtime-tabs ::v-deep .ant-tabs-nav .ant-tabs-tab {
  margin-right: 26px;
  padding: 13px 2px;
  color: #6f7a88;
  font-size: 13px;
  font-weight: 550;
}
.runtime-tabs ::v-deep .ant-tabs-nav .ant-tabs-tab-active {
  color: var(--primary-color, #1890ff);
  font-weight: 650;
}
.runtime-tabs ::v-deep .ant-tabs-ink-bar { background: var(--primary-color, #1890ff); }
.runtime-tabs ::v-deep .ant-tabs-content { overflow: visible; }
.runtime-tabs ::v-deep .strategy-tab-pane-inner {
  min-height: 300px;
  padding: 16px;
  border: 1px solid #e2e7ee;
  border-radius: 9px;
  background: #fff;
}
.runtime-tabs ::v-deep .strategy-tab-pane-inner .strategy-tab-empty {
  min-height: 250px;
  margin: 0;
  border: 0;
  background: transparent;
}
.panel-section {
  overflow: hidden;
  border-radius: 9px;
  box-shadow: 0 2px 8px rgba(24, 32, 44, .025);
}
.section-head { min-height: 50px; padding: 0 16px; }
.section-head h3 { font-size: 15px; }
.equity-chart { height: 300px; }
.section-empty {
  flex-direction: column;
  gap: 10px;
  min-height: 300px;
  background: #fbfcfd;
}
.section-empty > .anticon {
  color: color-mix(in srgb, var(--primary-color, #1890ff) 68%, #8d96a3);
  font-size: 30px;
  opacity: .8;
}
.theme-dark.operations-workspace {
  border-color: rgba(255, 255, 255, 0.1);
  background: #111;
  box-shadow: 0 14px 34px rgba(0, 0, 0, .24);
  .strategy-master { background: #0d0d0d; }
  .master-tabs { border-color: rgba(255, 255, 255, 0.1); background: #111; }
  .master-tabs button.active { background: #242424; color: var(--primary-color, #52c41a); box-shadow: none; }
  .strategy-list { border-color: rgba(255, 255, 255, 0.1); background: #111; }
  .strategy-row.selected { background: color-mix(in srgb, var(--primary-color, #52c41a) 12%, #111); }
  .strategy-detail { background: #080808; }
  .detail-header,
  .financial-strip > div,
  .performance-strip > div,
  .panel-section { border-color: rgba(255, 255, 255, 0.1); background: #111; }
  .financial-strip .primary-financial-card {
    border-color: color-mix(in srgb, var(--primary-color, #52c41a) 38%, rgba(255, 255, 255, .1));
    background: color-mix(in srgb, var(--primary-color, #52c41a) 7%, #111);
  }
  .runtime-tabs ::v-deep .ant-tabs-bar,
  .runtime-tabs ::v-deep .strategy-tab-pane-inner { border-color: rgba(255, 255, 255, 0.1); background: #111; }
  .runtime-tabs ::v-deep .ant-tabs-nav .ant-tabs-tab { color: #89919c; }
  .runtime-tabs ::v-deep .ant-tabs-nav .ant-tabs-tab-active { color: var(--primary-color, #52c41a); }
  .financial-strip strong,
  .performance-strip strong { color: #e1e4e8; }
  .section-empty { background: #0d0d0d; }
  .section-empty > .anticon { color: var(--primary-color, #52c41a); }
}
.runtime-tabs .overview-positions-panel ::v-deep .position-records .strategy-tab-empty.is-compact {
  min-height: 112px !important;
  margin: 0;
  border: 0;
  background: transparent;
}
.runtime-tabs .overview-positions-panel ::v-deep .position-records.strategy-tab-pane-inner {
  min-height: 0 !important;
  padding: 0;
  border: 0;
  background: transparent;
}
@media (max-width: 1080px) { .operations-workspace { grid-template-columns: 290px minmax(0, 1fr); }.financial-strip,.performance-strip { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 760px) { .operations-workspace { display: block; height: auto; }.strategy-master { max-height: 430px; border-right: 0; border-bottom: 1px solid #e4e8ee; }.strategy-detail { overflow: visible; padding: 14px; }.detail-header { flex-direction: column; }.detail-actions { width: 100%; }.detail-actions .ant-btn { flex: 1; }.pause-actions { width: 100%; }.financial-strip,.performance-strip { grid-template-columns: repeat(2, 1fr); }.metric-section-head { align-items: flex-start; flex-direction: column; gap: 2px; }.equity-chart { height: 240px; } }
</style>
