<template>
  <div class="performance-analysis strategy-tab-pane-inner" :class="{ 'theme-dark': isDark }">
    <a-spin :spinning="loading">
      <div v-if="hasData" class="performance-inner">
        <div class="metrics-grid">
          <div
            v-for="card in metricCards"
            :key="card.key"
            class="metric-card"
            :class="card.cardClass">
            <div class="metric-card-inner">
              <div class="metric-icon" :class="card.iconClass">
                <a-icon :type="card.icon" />
              </div>
              <div class="metric-body">
                <div class="metric-label">{{ card.label }}</div>
                <div class="metric-value" :class="card.valueClass">{{ card.display }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-card-head">
            <span class="chart-card-title">{{ $t('trading-assistant.performance.equityCurve') }}</span>
            <span class="chart-card-sub">{{ $t('trading-assistant.performance.equityCurveHint') }}</span>
          </div>
          <div ref="equityChart" class="chart-container"></div>
        </div>

        <div class="chart-card">
          <div class="chart-card-head">
            <span class="chart-card-title">{{ $t('trading-assistant.performance.stepReturns') }}</span>
            <span class="chart-card-sub">{{ $t('trading-assistant.performance.stepReturnsHint') }}</span>
          </div>
          <div ref="dailyChart" class="chart-container chart-container--compact"></div>
        </div>

        <div class="chart-card deviation-card">
          <div class="chart-card-head">
            <span class="chart-card-title">{{ $t('trading-assistant.performance.dryRunDeviation') }}</span>
            <span class="chart-card-sub">{{ $t('trading-assistant.performance.dryRunDeviationHint') }}</span>
            <a-tooltip v-if="deviationReport && deviationReport.verdict" :title="$t('trading-assistant.performance.dryRunVerdict.' + (deviationReport.verdict.level || 'unknown'))">
              <a-tag :color="deviationVerdictColor" class="deviation-verdict-tag">{{ deviationVerdictLabel }}</a-tag>
            </a-tooltip>
          </div>
          <!-- For ≥ 1h timeframes the metrics mostly capture intra-bar drift,
               not real execution latency / slippage. Without this banner the
               numbers (e.g. 3h latency on a 4h strategy) look alarming when
               they're actually structural. -->
          <div v-if="deviationLongTimeframeNote" class="deviation-tf-note">
            <a-icon type="info-circle" theme="filled" style="color: var(--primary-color, #1890ff); margin-right: 6px;" />
            <span>{{ deviationLongTimeframeNote }}</span>
          </div>
          <a-spin :spinning="deviationLoading">
            <div v-if="deviationReport && deviationReport.summary && deviationReport.summary.sampleSize > 0">
              <div class="deviation-summary-grid">
                <div class="deviation-summary-cell">
                  <span class="deviation-summary-label">{{ $t('trading-assistant.performance.dryRunAvgSlippage') }}</span>
                  <strong :class="deviationSlippageClass(deviationReport.summary.avgSlippageBps)">{{ formatBps(deviationReport.summary.avgSlippageBps) }}</strong>
                </div>
                <div class="deviation-summary-cell">
                  <span class="deviation-summary-label">{{ $t('trading-assistant.performance.dryRunMedianSlippage') }}</span>
                  <strong :class="deviationSlippageClass(deviationReport.summary.medianSlippageBps)">{{ formatBps(deviationReport.summary.medianSlippageBps) }}</strong>
                </div>
                <div class="deviation-summary-cell">
                  <span class="deviation-summary-label">{{ $t('trading-assistant.performance.dryRunP90Slippage') }}</span>
                  <strong :class="deviationSlippageClass(deviationReport.summary.p90SlippageBps)">{{ formatBps(deviationReport.summary.p90SlippageBps) }}</strong>
                </div>
                <div class="deviation-summary-cell">
                  <span class="deviation-summary-label">{{ $t('trading-assistant.performance.dryRunMaxSlippage') }}</span>
                  <strong :class="deviationSlippageClass(deviationReport.summary.maxAdverseSlippageBps)">{{ formatBps(deviationReport.summary.maxAdverseSlippageBps) }}</strong>
                </div>
                <div class="deviation-summary-cell">
                  <span class="deviation-summary-label">{{ $t('trading-assistant.performance.dryRunTotalCost') }}</span>
                  <strong>{{ formatMoney(deviationReport.summary.totalSlippageCost) }}</strong>
                </div>
                <div class="deviation-summary-cell">
                  <span class="deviation-summary-label">{{ $t('trading-assistant.performance.dryRunAvgLatency') }}</span>
                  <strong>{{ formatSeconds(deviationReport.summary.avgLatencySeconds) }}</strong>
                </div>
                <div class="deviation-summary-cell">
                  <span class="deviation-summary-label">{{ $t('trading-assistant.performance.dryRunSamples') }}</span>
                  <strong>{{ deviationReport.summary.matchedTrades }} / {{ deviationReport.summary.sampleSize }}</strong>
                </div>
              </div>
            </div>
            <a-empty v-else-if="!deviationLoading" :description="$t('trading-assistant.performance.dryRunEmpty')" class="strategy-tab-empty deviation-empty" />
          </a-spin>
        </div>
      </div>

      <a-empty
        v-else-if="!loading"
        :description="$t('trading-assistant.performance.noData')"
        class="strategy-tab-empty"
      />
    </a-spin>
  </div>
</template>

<script>
import { getStrategyDryRunDeviation, getStrategyEquityCurve, getStrategyTrades } from '@/api/strategy'

export default {
  name: 'PerformanceAnalysis',
  props: {
    strategyId: { type: [Number, String], default: null },
    isDark: { type: Boolean, default: false },
    // When set to 'grid' / 'dca' the metrics grid gains three extra cards
    // showing realised grid-matched PnL, matched-pair count and avg PnL per
    // match — built from the same tradesList that drives the equity curve.
    botType: { type: String, default: '' }
  },
  data () {
    return {
      loading: false,
      metrics: {},
      equityData: [],
      tradesList: [],
      stepReturns: [],
      stepLabels: [],
      equityChartInstance: null,
      dailyChartInstance: null,
      deviationLoading: false,
      deviationReport: null
    }
  },
  computed: {
    hasData () {
      return this.equityData.length > 0
    },
    metricCards () {
      const m = this.metrics || {}
      const fmt = this.formatPercent
      return [
        {
          key: 'totalReturn',
          label: this.$t('trading-assistant.performance.totalReturn'),
          display: fmt(m.totalReturn),
          cardClass: this.cardTone(m.totalReturn),
          iconClass: 'icon-return',
          icon: 'line-chart',
          valueClass: this.valueTone(m.totalReturn)
        },
        {
          key: 'annualReturn',
          label: this.$t('trading-assistant.performance.annualReturn'),
          display: fmt(m.annualReturn),
          cardClass: this.cardTone(m.annualReturn),
          iconClass: 'icon-annual',
          icon: 'calendar',
          valueClass: this.valueTone(m.annualReturn)
        },
        {
          key: 'maxDrawdown',
          label: this.$t('trading-assistant.performance.maxDrawdown'),
          display: fmt(m.maxDrawdown),
          cardClass: 'metric-card--dd',
          iconClass: 'icon-dd',
          icon: 'fall',
          valueClass: 'metric-val-dd'
        },
        {
          key: 'sharpe',
          label: this.$t('trading-assistant.performance.sharpe'),
          display: (m.sharpe != null && !isNaN(m.sharpe)) ? Number(m.sharpe).toFixed(2) : '—',
          cardClass: '',
          iconClass: 'icon-sharpe',
          icon: 'fund',
          valueClass: ''
        },
        {
          key: 'winRate',
          label: this.$t('trading-assistant.performance.winRate'),
          display: fmt(m.winRate),
          cardClass: this.cardTone((m.winRate || 0) - 0.5),
          iconClass: 'icon-win',
          icon: 'trophy',
          valueClass: this.valueTone((m.winRate || 0) - 0.5)
        },
        {
          key: 'profitFactor',
          label: this.$t('trading-assistant.performance.profitFactor'),
          display: (m.profitFactor != null && !isNaN(m.profitFactor)) ? Number(m.profitFactor).toFixed(2) : '—',
          cardClass: this.cardTone((m.profitFactor || 0) - 1),
          iconClass: 'icon-pf',
          icon: 'swap',
          valueClass: this.valueTone((m.profitFactor || 0) - 1)
        },
        {
          key: 'totalTrades',
          label: this.$t('trading-assistant.performance.totalTrades'),
          display: String(m.totalTrades != null ? m.totalTrades : 0),
          cardClass: '',
          iconClass: 'icon-trades',
          icon: 'transaction',
          valueClass: ''
        },
        {
          key: 'runningDays',
          label: this.$t('trading-assistant.performance.runningDays'),
          display: String(m.runningDays != null ? m.runningDays : 0),
          cardClass: '',
          iconClass: 'icon-days',
          icon: 'clock-circle',
          valueClass: ''
        },
        ...this.gridMetricCards
      ]
    },
    isGridLikeBot () {
      const bt = String(this.botType || '').toLowerCase()
      return bt === 'grid' || bt === 'dca'
    },
    gridStats () {
      if (!this.isGridLikeBot) return { totalProfit: 0, matched: 0, avgProfit: 0 }
      let total = 0
      let matched = 0
      for (const t of this.tradesList || []) {
        const me = parseFloat(t.matched_entry_price || 0)
        if (!(me > 0)) continue
        matched += 1
        const p = parseFloat(t.grid_matched_profit || 0)
        if (!isNaN(p)) total += p
      }
      const avg = matched > 0 ? total / matched : 0
      return { totalProfit: total, matched, avgProfit: avg }
    },
    gridMetricCards () {
      if (!this.isGridLikeBot) return []
      const g = this.gridStats
      return [
        {
          key: 'gridTotalProfit',
          label: this.$t('trading-assistant.performance.gridTotalProfit'),
          display: this.formatMoney(g.totalProfit),
          cardClass: this.cardTone(g.totalProfit),
          iconClass: 'icon-pf',
          icon: 'gold',
          valueClass: this.valueTone(g.totalProfit)
        },
        {
          key: 'gridMatchedPairs',
          label: this.$t('trading-assistant.performance.gridMatchedPairs'),
          display: String(g.matched),
          cardClass: '',
          iconClass: 'icon-trades',
          icon: 'block',
          valueClass: ''
        },
        {
          key: 'gridAvgProfit',
          label: this.$t('trading-assistant.performance.gridAvgProfit'),
          display: this.formatMoney(g.avgProfit),
          cardClass: this.cardTone(g.avgProfit),
          iconClass: 'icon-pf',
          icon: 'pie-chart',
          valueClass: this.valueTone(g.avgProfit)
        }
      ]
    },
    deviationVerdictLabel () {
      const level = (this.deviationReport && this.deviationReport.verdict && this.deviationReport.verdict.level) || 'unknown'
      const map = {
        good: this.$t('trading-assistant.performance.dryRunVerdictGood'),
        warn: this.$t('trading-assistant.performance.dryRunVerdictWarn'),
        bad: this.$t('trading-assistant.performance.dryRunVerdictBad'),
        unknown: this.$t('trading-assistant.performance.dryRunVerdictUnknown')
      }
      return map[level] || map.unknown
    },
    deviationVerdictColor () {
      const level = (this.deviationReport && this.deviationReport.verdict && this.deviationReport.verdict.level) || 'unknown'
      if (level === 'good') return 'green'
      if (level === 'warn') return 'orange'
      if (level === 'bad') return 'red'
      return 'default'
    },
    // For ≥ 1h strategies the "slippage" / "latency" cells mix in the time
    // spent waiting inside the current K-line (the report compares against
    // the *previous* bar's close). Surface that caveat inline so users don't
    // misread a structural 3h "latency" on a 4h strategy as a broken broker.
    deviationLongTimeframeNote () {
      const tf = this.deviationReport && this.deviationReport.tfSeconds
      if (!tf) return ''
      if (tf < 3600) return ''
      const tfLabel = (this.deviationReport && this.deviationReport.timeframe) || ''
      return `当前周期 ${tfLabel || '≥ 1h'}：延迟主要反映"上根 K 线收盘 → 实际成交"的等待时间（受策略 evaluate 间隔影响），滑点包含 K 线周期内的市场漂移，并非订单执行延迟/损失。verdict 阈值已自动按周期放宽。 / On ≥ 1h timeframes these numbers mostly reflect intra-bar drift and strategy evaluate cadence, not actual execution latency or fill slippage. Verdict thresholds are auto-relaxed for longer bars.`
    }
  },
  watch: {
    strategyId: {
      handler (val) {
        if (val) this.loadData()
      },
      immediate: true
    },
    isDark () {
      this.disposeCharts()
      this.$nextTick(() => this.renderCharts())
    }
  },
  beforeDestroy () {
    this.disposeCharts()
  },
  methods: {
    cardTone (v) {
      if (v == null || isNaN(v)) return ''
      if (v > 0) return 'metric-card--pos'
      if (v < 0) return 'metric-card--neg'
      return ''
    },
    valueTone (v) {
      if (v == null || isNaN(v)) return ''
      if (v > 0) return 'metric-val-pos'
      if (v < 0) return 'metric-val-neg'
      return ''
    },
    formatBps (value) {
      if (value == null || isNaN(value)) return '—'
      const v = Number(value)
      const sign = v > 0 ? '+' : ''
      return `${sign}${v.toFixed(1)} bps`
    },
    formatMoney (value) {
      if (value == null || isNaN(value)) return '—'
      const v = Number(value)
      const sign = v < 0 ? '-' : ''
      return `${sign}$${Math.abs(v).toFixed(2)}`
    },
    formatSeconds (value) {
      if (value == null || isNaN(value)) return '—'
      const v = Number(value)
      if (v < 60) return `${v.toFixed(1)} s`
      if (v < 3600) return `${(v / 60).toFixed(1)} min`
      return `${(v / 3600).toFixed(1)} h`
    },
    // Cell colouring follows the same thresholds the backend uses for the
    // overall verdict (returned in deviation.verdict.thresholds), so a green
    // verdict never sits next to red cells. Falls back to the original
    // short-timeframe defaults when the report doesn't carry thresholds —
    // matches the pre-A-stage behaviour for old cached responses.
    deviationSlippageClass (value) {
      if (value == null || isNaN(value)) return ''
      const v = Number(value)
      const verdict = this.deviationReport && this.deviationReport.verdict
      const th = (verdict && verdict.thresholds) || {}
      const badAvg = Number(th.warn_avg || 30)
      const warnAvg = Number(th.good_avg || 10)
      if (v >= badAvg) return 'deviation-value--bad'
      if (v >= warnAvg) return 'deviation-value--warn'
      if (v <= -warnAvg) return 'deviation-value--good'
      return ''
    },
    async loadDeviationReport () {
      if (!this.strategyId) return
      this.deviationLoading = true
      try {
        const res = await getStrategyDryRunDeviation(this.strategyId)
        if (res && res.code === 1) {
          this.deviationReport = res.data || null
        } else {
          this.deviationReport = null
        }
      } catch (e) {
        this.deviationReport = null
      } finally {
        this.deviationLoading = false
      }
    },
    async loadData () {
      if (!this.strategyId) return
      this.loading = true
      this.loadDeviationReport()
      try {
        const [curveRes, tradesRes] = await Promise.all([
          getStrategyEquityCurve(this.strategyId),
          getStrategyTrades(this.strategyId)
        ])

        let raw = []
        if (curveRes && curveRes.code === 1 && curveRes.data != null) {
          raw = Array.isArray(curveRes.data) ? curveRes.data : (curveRes.data.equity_curve || [])
        }
        this.equityData = raw
          .map(d => ({
            time: Number(d.time != null ? d.time : d.timestamp || 0),
            equity: Number(d.equity != null ? d.equity : d.value != null ? d.value : d.y || 0)
          }))
          .filter(d => d.time > 0)
          .sort((a, b) => a.time - b.time)

        this.tradesList = []
        if (tradesRes && tradesRes.code === 1 && tradesRes.data) {
          this.tradesList = tradesRes.data.trades || tradesRes.data.items || []
        }

        this.computeMetrics()
        this.$nextTick(() => this.renderCharts())
      } catch (e) {
        console.error('Load performance failed:', e)
      } finally {
        this.loading = false
      }
    },

    computeMetrics () {
      const data = this.equityData
      if (!data.length) {
        this.metrics = {}
        this.stepReturns = []
        this.stepLabels = []
        return
      }

      const equities = data.map(d => d.equity)
      const initial = equities[0] || 1
      const final = equities[equities.length - 1] || initial

      const totalReturn = initial > 0 ? (final - initial) / initial : 0

      let maxPeak = equities[0]
      let maxDrawdown = 0
      for (let i = 0; i < equities.length; i++) {
        if (equities[i] > maxPeak) maxPeak = equities[i]
        const peak = maxPeak > 0 ? maxPeak : 1e-9
        const dd = (equities[i] - peak) / peak
        if (dd < maxDrawdown) maxDrawdown = dd
      }

      const times = data.map(d => d.time).filter(t => t > 0)
      let runningDays = 1
      if (times.length >= 1) {
        const spanSec = Math.max(...times) - Math.min(...times)
        runningDays = Math.max(1, Math.ceil(spanSec / 86400))
      }

      const years = runningDays / 365.0
      let annualReturn = 0
      if (initial > 0 && final > 0 && years > 1e-6) {
        if (years >= 1) {
          annualReturn = Math.pow(final / initial, 1 / years) - 1
        } else {
          annualReturn = totalReturn * (365 / Math.max(runningDays, 1))
        }
      }

      const stepRets = []
      const labels = []
      for (let i = 1; i < data.length; i++) {
        const prev = equities[i - 1]
        const cur = equities[i]
        const denom = prev > 0 ? prev : 1e-9
        stepRets.push((cur - prev) / denom)
        const t = data[i].time
        const d = new Date(t * 1000)
        labels.push(`${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
      }
      this.stepReturns = stepRets
      this.stepLabels = labels

      const avgRet = stepRets.length ? stepRets.reduce((a, b) => a + b, 0) / stepRets.length : 0
      const stdRet = stepRets.length > 1
        ? Math.sqrt(stepRets.reduce((s, r) => s + (r - avgRet) ** 2, 0) / (stepRets.length - 1))
        : 0
      const sharpe = stdRet > 0 ? (avgRet / stdRet) * Math.sqrt(Math.min(252, Math.max(stepRets.length, 1))) : 0

      const settled = (this.tradesList || []).filter(t => {
        const ty = String(t.type || '').toLowerCase()
        if (ty.startsWith('open') || ty.startsWith('add')) return false
        if (t.profit === null || t.profit === undefined || t.profit === '') return false
        return true
      })
      const profits = settled.map(t => {
        const p = parseFloat(t.profit)
        if (isNaN(p)) return NaN
        const c = parseFloat(t.commission)
        return p - (isNaN(c) ? 0 : c)
      }).filter(n => !isNaN(n))
      const wins = profits.filter(p => p > 0).length
      const losses = profits.filter(p => p < 0).length
      const decided = wins + losses
      const winRate = decided > 0 ? wins / decided : 0

      let grossProfit = 0
      let grossLoss = 0
      profits.forEach(p => {
        if (p > 0) grossProfit += p
        if (p < 0) grossLoss += Math.abs(p)
      })
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99 : 0)

      this.metrics = {
        totalReturn,
        annualReturn,
        maxDrawdown,
        sharpe,
        winRate,
        profitFactor,
        totalTrades: (this.tradesList || []).length,
        runningDays
      }
    },

    async renderCharts () {
      const echarts = await this.getEcharts()
      if (!echarts) return
      this.renderEquityChart(echarts)
      this.renderStepChart(echarts)
    },

    async getEcharts () {
      if (window.echarts) return window.echarts
      try {
        const mod = await import('echarts')
        window.echarts = mod.default || mod
        return window.echarts
      } catch {
        return null
      }
    },

    formatAxisTime (ts) {
      const t = Number(ts)
      if (!t) return ''
      const d = new Date(t * 1000)
      return `${d.getMonth() + 1}/${d.getDate()}`
    },

    renderEquityChart (echarts) {
      if (!this.$refs.equityChart) return
      if (this.equityChartInstance) {
        this.equityChartInstance.dispose()
        this.equityChartInstance = null
      }
      this.equityChartInstance = echarts.init(this.$refs.equityChart, this.isDark ? 'dark' : null)

      const xData = this.equityData.map(d => this.formatAxisTime(d.time))
      const yData = this.equityData.map(d => d.equity)

      const lineColor = this.isDark ? '#58a6ff' : 'var(--primary-color, #1890ff)'
      this.equityChartInstance.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 56, right: 16, top: 24, bottom: 28 },
        xAxis: { type: 'category', data: xData, axisLabel: { fontSize: 10, color: this.isDark ? '#8b949e' : '#64748b' } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: this.isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0' } }, axisLabel: { fontSize: 10, color: this.isDark ? '#8b949e' : '#64748b' } },
        series: [{
          type: 'line',
          data: yData,
          smooth: true,
          lineStyle: { width: 2.5, color: lineColor },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: this.isDark ? 'rgba(88,166,255,0.25)' : 'rgba(24,144,255,0.25)' },
                { offset: 1, color: this.isDark ? 'rgba(88,166,255,0.02)' : 'rgba(24,144,255,0.02)' }
              ]
            }
          },
          itemStyle: { color: lineColor },
          showSymbol: this.equityData.length <= 24
        }]
      })
    },

    renderStepChart (echarts) {
      if (!this.$refs.dailyChart || !this.stepReturns.length) return
      if (this.dailyChartInstance) {
        this.dailyChartInstance.dispose()
        this.dailyChartInstance = null
      }
      this.dailyChartInstance = echarts.init(this.$refs.dailyChart, this.isDark ? 'dark' : null)

      this.dailyChartInstance.setOption({
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            const p = params && params[0]
            if (!p) return ''
            const idx = p.dataIndex
            const label = this.stepLabels[idx] || ''
            return `${label}<br/>${(p.value * 100).toFixed(3)}%`
          }
        },
        grid: { left: 52, right: 12, top: 16, bottom: 24 },
        xAxis: {
          type: 'category',
          data: this.stepLabels,
          axisLabel: { fontSize: 9, color: this.isDark ? '#8b949e' : '#64748b', rotate: 40 }
        },
        yAxis: {
          type: 'value',
          axisLabel: { formatter: v => (v * 100).toFixed(1) + '%', fontSize: 10, color: this.isDark ? '#8b949e' : '#64748b' },
          splitLine: { lineStyle: { color: this.isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0' } }
        },
        series: [{
          type: 'bar',
          data: this.stepReturns.map(r => ({
            value: r,
            itemStyle: { color: r >= 0 ? (this.isDark ? '#3fb950' : '#52c41a') : (this.isDark ? '#f85149' : '#ff4d4f') }
          })),
          barMaxWidth: 14
        }]
      })
    },

    disposeCharts () {
      if (this.equityChartInstance) {
        this.equityChartInstance.dispose()
        this.equityChartInstance = null
      }
      if (this.dailyChartInstance) {
        this.dailyChartInstance.dispose()
        this.dailyChartInstance = null
      }
    },

    formatPercent (val) {
      if (val === undefined || val === null || isNaN(val)) return '—'
      return (val >= 0 ? '+' : '') + (val * 100).toFixed(2) + '%'
    }
  }
}
</script>

<style lang="less" scoped>
.performance-analysis {
  padding: 4px 0;
}

.performance-inner {
  animation: pa-fade-in 0.25s ease;
}

@keyframes pa-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.strategy-tab-empty {
  padding: 48px 16px;
  margin: 0 auto;
  max-width: 360px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 22px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
}

.metric-card {
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);

  &--pos {
    border-color: rgba(82, 196, 26, 0.35);
    background: linear-gradient(145deg, #f6ffed 0%, #ffffff 100%);
  }
  &--neg {
    border-color: rgba(255, 77, 79, 0.35);
    background: linear-gradient(145deg, #fff2f0 0%, #ffffff 100%);
  }
  &--dd {
    border-color: rgba(250, 173, 20, 0.4);
    background: linear-gradient(145deg, #fffbe6 0%, #ffffff 100%);
  }
}

.metric-card-inner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
}

.metric-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  background: #f1f5f9;
  color: #475569;

  &.icon-return { background: rgba(24, 144, 255, 0.12); color: var(--primary-color, #1890ff); }
  &.icon-annual { background: rgba(114, 46, 209, 0.1); color: #722ed1; }
  &.icon-dd { background: rgba(250, 173, 20, 0.15); color: #d48806; }
  &.icon-sharpe { background: rgba(19, 194, 194, 0.12); color: #13c2c2; }
  &.icon-win { background: rgba(82, 196, 26, 0.12); color: #52c41a; }
  &.icon-pf { background: rgba(47, 84, 235, 0.1); color: #2f54eb; }
  &.icon-trades { background: rgba(100, 116, 139, 0.12); color: #64748b; }
  &.icon-days { background: rgba(245, 158, 11, 0.12); color: #d97706; }
}

.metric-body {
  min-width: 0;
  flex: 1;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 6px;
  line-height: 1.3;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
  line-height: 1.2;
}

.metric-val-pos {
  color: #16a34a !important;
}
.metric-val-neg {
  color: #dc2626 !important;
}
.metric-val-dd {
  color: #d97706 !important;
}

.chart-card {
  margin-bottom: 20px;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  background: #fff;
  padding: 16px 16px 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.chart-card-head {
  margin-bottom: 8px;
  padding: 0 4px;
}

.chart-card-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.chart-card-sub {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.chart-container--compact {
  height: 240px;
}

.theme-dark {
  .metric-card {
    background: linear-gradient(145deg, #1c1c1c 0%, #141414 100%);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: none;

    &--pos {
      border-color: rgba(63, 185, 80, 0.35);
      background: linear-gradient(145deg, rgba(63, 185, 80, 0.08) 0%, #1a1a1a 100%);
    }
    &--neg {
      border-color: rgba(248, 81, 73, 0.35);
      background: linear-gradient(145deg, rgba(248, 81, 73, 0.08) 0%, #1a1a1a 100%);
    }
    &--dd {
      border-color: rgba(210, 153, 34, 0.4);
      background: linear-gradient(145deg, rgba(210, 153, 34, 0.1) 0%, #1a1a1a 100%);
    }
  }

  .metric-icon {
    background: rgba(255, 255, 255, 0.06);
    color: #c9d1d9;

    &.icon-return { background: rgba(88, 166, 255, 0.15); color: #58a6ff; }
    &.icon-annual { background: rgba(163, 113, 247, 0.15); color: #a371f7; }
    &.icon-dd { background: rgba(210, 153, 34, 0.15); color: #e3b341; }
    &.icon-sharpe { background: rgba(57, 197, 207, 0.15); color: #39c5cf; }
    &.icon-win { background: rgba(63, 185, 80, 0.15); color: #3fb950; }
    &.icon-pf { background: rgba(121, 192, 255, 0.12); color: #79c0ff; }
    &.icon-trades { background: rgba(139, 148, 158, 0.15); color: #8b949e; }
    &.icon-days { background: rgba(210, 153, 34, 0.12); color: #d29922; }
  }

  .metric-label {
    color: rgba(255, 255, 255, 0.45);
  }

  .metric-value {
    color: #e6edf3;
  }

  .metric-val-pos {
    color: #3fb950 !important;
  }
  .metric-val-neg {
    color: #f85149 !important;
  }
  .metric-val-dd {
    color: #e3b341 !important;
  }

  .chart-card {
    background: #161b22;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .chart-card-title {
    color: #e6edf3;
  }

  .chart-card-sub {
    color: rgba(255, 255, 255, 0.38);
  }

  ::v-deep .ant-empty-description {
    color: rgba(255, 255, 255, 0.35);
  }

  .strategy-tab-empty ::v-deep .ant-empty-description {
    color: rgba(255, 255, 255, 0.35);
  }

  .deviation-summary-cell {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.06);
    strong {
      color: #e6edf3;
    }
    .deviation-summary-label {
      color: rgba(255, 255, 255, 0.45);
    }
  }

  .deviation-tf-note {
    background: rgba(24, 144, 255, 0.12);
    border-color: rgba(24, 144, 255, 0.35);
    color: rgba(255, 255, 255, 0.78);
  }
}

.deviation-card {
  margin-top: 16px;
}
.deviation-verdict-tag {
  margin-left: auto;
  font-weight: 500;
}
.deviation-tf-note {
  margin: 8px 4px 0;
  padding: 8px 12px;
  background: rgba(24, 144, 255, 0.08);
  border: 1px solid rgba(24, 144, 255, 0.25);
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #1d3957;
  display: flex;
  align-items: flex-start;
}
.deviation-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  padding: 12px 4px 4px;
}
.deviation-summary-cell {
  background: rgba(0, 0, 0, 0.025);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  .deviation-summary-label {
    font-size: 12px;
    color: #8c8c8c;
  }
  strong {
    font-size: 15px;
    font-weight: 600;
    color: #262626;
  }
}
.deviation-value--good {
  color: #389e0d !important;
}
.deviation-value--warn {
  color: #d48806 !important;
}
.deviation-value--bad {
  color: #cf1322 !important;
}
.deviation-empty {
  padding: 12px 0;
}
</style>
