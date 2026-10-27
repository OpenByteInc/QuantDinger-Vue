<template>
  <div class="portfolio-result" :class="{ 'theme-dark': isDark }">
    <div class="result-trustbar" :class="trustTone">
      <div>
        <a-icon :type="auditPassed ? 'check-circle' : 'warning'" />
        <strong>{{ statusLabel }}</strong>
        <span>{{ statusHint }}</span>
      </div>
      <div>
        <a-tag
          :color="auditPassed ? 'green' : 'red'"
          class="trust-tag"
          :class="auditPassed ? 'trust-tag--success' : 'trust-tag--error'">
          {{ auditPassed ? $t('strategyV2.backtest.auditPassed') : $t('strategyV2.backtest.auditFailed') }}
        </a-tag>
        <a-tag color="blue" class="trust-tag trust-tag--info">{{ $t('strategyV2.backtest.marketData') }}</a-tag>
        <a-tag
          v-if="legacyBackfilled"
          color="orange"
          class="trust-tag trust-tag--warning"
          :title="$t('strategyV2.backtest.legacyBackfillHint')">
          {{ $t('strategyV2.backtest.legacyBackfill') }}
        </a-tag>
      </div>
    </div>

    <a-alert
      v-if="result.liquidated"
      type="error"
      show-icon
      class="liquidation-alert"
      :message="$t('strategyV2.backtest.liquidatedTitle')"
      :description="$t('strategyV2.backtest.liquidatedHint')" />
    <a-alert
      v-else-if="result.legacyInsolventContinuation"
      type="error"
      show-icon
      class="liquidation-alert"
      :message="$t('strategyV2.backtest.legacyInsolventTitle')"
      :description="$t('strategyV2.backtest.legacyInsolventHint')" />

    <div class="metrics-grid">
      <div v-for="item in metrics" :key="item.key" class="metric-card">
        <span class="metric-label">
          {{ item.label }}
          <a-tooltip v-if="item.hint" :title="item.hint">
            <a-icon type="info-circle" />
          </a-tooltip>
        </span>
        <strong :class="item.tone">{{ item.value }}</strong>
      </div>
    </div>

    <section v-if="hasDownsideRiskAnalysis" class="benchmark-analysis-card risk-analysis-card">
      <div class="benchmark-analysis-heading">
        <button
          type="button"
          class="benchmark-analysis-toggle"
          :aria-expanded="riskAnalysisExpanded ? 'true' : 'false'"
          :aria-label="$t('strategyV2.backtest.riskMetrics.title')"
          @click="riskAnalysisExpanded = !riskAnalysisExpanded">
          <a-icon :type="riskAnalysisExpanded ? 'down' : 'right'" />
        </button>
        <div class="benchmark-analysis-title">
          <h3>{{ $t('strategyV2.backtest.riskMetrics.title') }}</h3>
          <p v-if="riskAnalysisExpanded">{{ $t('strategyV2.backtest.riskMetrics.subtitle') }}</p>
        </div>
        <div v-if="!riskAnalysisExpanded" class="benchmark-analysis-preview">
          <span v-for="item in riskMetricCards.slice(0, 3)" :key="item.key">
            <small>{{ item.label }}</small>
            <strong :class="item.tone">{{ item.value }}</strong>
          </span>
        </div>
        <div class="benchmark-analysis-meta">
          <a-tag v-if="hasTailRiskAnalysis" class="analysis-accent-tag">
            {{ tailRiskStatusLabel }}
          </a-tag>
          <a-tag v-if="hasTailRiskAnalysis">
            {{ $t('strategyV2.backtest.riskMetrics.tailObservations', { count: result.tailRiskObservations || 0 }) }}
          </a-tag>
          <a-tag class="analysis-accent-tag">
            {{ $t('strategyV2.backtest.riskMetrics.periodsPerYear', { count: formatNumber(result.periodsPerYear, 0) }) }}
          </a-tag>
        </div>
      </div>
      <template v-if="riskAnalysisExpanded">
        <div class="benchmark-analysis-grid">
          <article v-for="item in riskMetricCards" :key="item.key" class="benchmark-analysis-metric">
            <span>
              {{ item.label }}
              <a-tooltip :title="item.hint"><a-icon type="info-circle" /></a-tooltip>
            </span>
            <strong :class="item.tone">{{ item.value }}</strong>
            <small>{{ item.detail }}</small>
          </article>
        </div>
        <template v-if="hasTailRiskAnalysis">
          <h4 class="benchmark-analysis-subheading">{{ $t('strategyV2.backtest.riskMetrics.tailTitle') }}</h4>
          <div class="benchmark-analysis-grid benchmark-analysis-grid--advanced">
            <article v-for="item in tailRiskMetricCards" :key="item.key" class="benchmark-analysis-metric">
              <span>
                {{ item.label }}
                <a-tooltip :title="item.hint"><a-icon type="info-circle" /></a-tooltip>
              </span>
              <strong :class="item.tone">{{ item.value }}</strong>
              <small>{{ item.detail }}</small>
            </article>
          </div>
          <p class="benchmark-analysis-note">{{ $t('strategyV2.backtest.riskMetrics.tailNote') }}</p>
        </template>
      </template>
    </section>

    <section v-if="hasBenchmarkRelativeAnalysis" class="benchmark-analysis-card">
      <div class="benchmark-analysis-heading">
        <button
          type="button"
          class="benchmark-analysis-toggle"
          :aria-expanded="benchmarkAnalysisExpanded ? 'true' : 'false'"
          :aria-label="$t('strategyV2.backtest.benchmarkMetrics.title')"
          @click="benchmarkAnalysisExpanded = !benchmarkAnalysisExpanded">
          <a-icon :type="benchmarkAnalysisExpanded ? 'down' : 'right'" />
        </button>
        <div class="benchmark-analysis-title">
          <h3>{{ $t('strategyV2.backtest.benchmarkMetrics.title') }}</h3>
          <p v-if="benchmarkAnalysisExpanded">{{ $t('strategyV2.backtest.benchmarkMetrics.subtitle') }}</p>
        </div>
        <div v-if="!benchmarkAnalysisExpanded" class="benchmark-analysis-preview">
          <span v-for="item in benchmarkMetricCards.slice(0, 3)" :key="item.key">
            <small>{{ item.label }}</small>
            <strong :class="item.tone">{{ item.value }}</strong>
          </span>
        </div>
        <div class="benchmark-analysis-meta">
          <a-tag class="analysis-accent-tag">
            {{ $t('strategyV2.backtest.benchmarkMetrics.observations', { count: benchmarkRelativeMetrics.observations || 0 }) }}
          </a-tag>
          <a-tag>{{ benchmarkRelativeMetrics.frequency || '-' }}</a-tag>
          <a-tooltip :title="$t('strategyV2.backtest.benchmarkMetrics.riskFreeHint')">
            <a-tag>
              {{ $t('strategyV2.backtest.benchmarkMetrics.riskFreeRate', { value: formatMetricRate(benchmarkRelativeMetrics.riskFreeRate, false) }) }}
            </a-tag>
          </a-tooltip>
        </div>
      </div>
      <template v-if="benchmarkAnalysisExpanded">
        <div class="benchmark-analysis-grid">
          <article v-for="item in benchmarkMetricCards" :key="item.key" class="benchmark-analysis-metric">
            <span>
              {{ item.label }}
              <a-tooltip :title="item.hint"><a-icon type="info-circle" /></a-tooltip>
            </span>
            <strong :class="item.tone">{{ item.value }}</strong>
            <small>{{ item.detail }}</small>
          </article>
        </div>
        <template v-if="hasAdvancedBenchmarkMetrics">
          <h4 class="benchmark-analysis-subheading">{{ $t('strategyV2.backtest.benchmarkMetrics.advancedTitle') }}</h4>
          <div class="benchmark-analysis-grid benchmark-analysis-grid--advanced">
            <article v-for="item in advancedBenchmarkMetricCards" :key="item.key" class="benchmark-analysis-metric">
              <span>
                {{ item.label }}
                <a-tooltip :title="item.hint"><a-icon type="info-circle" /></a-tooltip>
              </span>
              <strong :class="item.tone">{{ item.value }}</strong>
              <small>{{ item.detail }}</small>
            </article>
          </div>
        </template>
        <p class="benchmark-analysis-note">{{ $t('strategyV2.backtest.benchmarkMetrics.assumption') }}</p>
      </template>
    </section>

    <section class="chart-card">
      <div class="chart-heading">
        <div>
          <h3>{{ $t('strategyV2.backtest.portfolioDashboard') }}</h3>
          <span>{{ benchmarkCaption }}</span>
        </div>
        <div class="chart-legend-note">{{ $t('strategyV2.backtest.chartInteractionHint') }}</div>
      </div>
      <div ref="chart" class="portfolio-chart" role="img" />
    </section>

    <div v-if="result.executionAssumptions" class="assumption-strip">
      <div><span>{{ $t('strategyV2.backtest.engine') }}</span><strong>{{ $t('strategyV2.backtest.engineV2') }}</strong></div>
      <div><span>{{ $t('strategyV2.backtest.fillRule') }}</span><strong>{{ $t('strategyV2.backtest.fillRuleNextOpen') }}</strong></div>
      <div><span>{{ $t('strategyV2.backtest.dateRange') }}</span><strong>{{ formatDateRange(result.executionAssumptions) }}</strong></div>
      <div><span>{{ $t('backtest-center.initialCapital') }}</span><strong>{{ formatNumber(result.executionAssumptions.initialCapital) }}</strong></div>
      <div><span>{{ $t('backtest-center.leverage') }}</span><strong>{{ formatLeverage(result.executionAssumptions) }}</strong></div>
      <div><span>{{ $t('backtest-center.commission') }}</span><strong>{{ formatRate(result.executionAssumptions.commission) }}</strong></div>
      <div><span>{{ $t('backtest-center.slippage') }}</span><strong>{{ formatRate(result.executionAssumptions.slippage) }}</strong></div>
      <div><span>{{ $t('trading-assistant.costs.funding') }}</span><strong>{{ $t('backtest-center.fundingNotModeled') }}</strong></div>
    </div>

    <a-tabs class="result-tabs" default-active-key="overview">
      <a-tab-pane key="overview" :tab="$t('strategyV2.backtest.tabs.overview')">
        <div class="overview-grid">
          <div class="overview-card">
            <span>
              {{ $t('strategyV2.backtest.ledgerCash') }}
              <a-tooltip :title="$t('strategyV2.backtest.ledgerCashHint')">
                <a-icon type="info-circle" />
              </a-tooltip>
            </span>
            <strong>{{ formatNumber(latestSnapshot.cash) }}</strong>
          </div>
          <div class="overview-card">
            <span>
              {{ $t('strategyV2.backtest.grossExposure') }}
              <a-tooltip :title="$t('strategyV2.backtest.grossExposureHint')">
                <a-icon type="info-circle" />
              </a-tooltip>
            </span>
            <strong>{{ formatRate(latestSnapshot.grossExposure) }}</strong>
          </div>
          <div class="overview-card">
            <span>
              {{ $t('strategyV2.backtest.netExposure') }}
              <a-tooltip :title="$t('strategyV2.backtest.netExposureHint')">
                <a-icon type="info-circle" />
              </a-tooltip>
            </span>
            <strong>{{ formatRate(latestSnapshot.netExposure) }}</strong>
          </div>
          <div class="overview-card">
            <span>
              {{ $t('strategyV2.backtest.feeDrag') }}
              <a-tooltip :title="$t('strategyV2.backtest.feeDragHint')">
                <a-icon type="info-circle" />
              </a-tooltip>
            </span>
            <strong class="negative">{{ formatRate(attribution.feeDrag) }}</strong>
          </div>
          <div class="overview-card">
            <span>{{ $t('strategyV2.backtest.executions') }}</span>
            <strong>{{ Number(result.totalExecutions || 0) }}</strong>
          </div>
          <div class="overview-card">
            <span>{{ $t('strategyV2.backtest.closedTrades') }}</span>
            <strong>{{ Number(result.totalTrades || 0) }}</strong>
          </div>
          <div class="overview-card">
            <span>{{ $t('backtest-center.metrics.winRate') }}</span>
            <strong>{{ formatPercent(result.winRate, false) }}</strong>
          </div>
          <div class="overview-card">
            <span>{{ $t('backtest-center.metrics.sharpe') }}</span>
            <strong>{{ formatNullableNumber(result.sharpeRatio) }}</strong>
          </div>
        </div>
        <div class="status-grid">
          <div v-for="name in orderStatuses" :key="name" class="status-card" :class="`status-${name}`">
            <span>{{ $t(`strategyV2.backtest.orderStatus.${name}`) }}</span>
            <strong>{{ Number((attribution.orderStatus || {})[name] || 0) }}</strong>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="rebalances" :tab="$t('strategyV2.backtest.tabs.rebalances')">
        <a-empty v-if="!rebalanceRows.length" :description="$t('strategyV2.backtest.noRebalances')" />
        <a-table
          v-else
          :columns="rebalanceColumns"
          :data-source="rebalanceRows"
          :row-key="row => row._rowKey"
          size="small"
          :pagination="{ pageSize: 8 }"
          :scroll="{ x: 1100 }" />
      </a-tab-pane>

      <a-tab-pane key="holdings" :tab="$t('strategyV2.backtest.tabs.holdings')">
        <a-empty v-if="!holdingRows.length" :description="$t('strategyV2.backtest.noHoldings')" />
        <a-table
          v-else
          :columns="holdingColumns"
          :data-source="holdingRows"
          :row-key="(row, index) => `${row.time}-${row.symbol}-${index}`"
          size="small"
          :pagination="{ pageSize: 10 }"
          :scroll="{ x: 1050 }" />
      </a-tab-pane>

      <a-tab-pane key="closed" :tab="$t('strategyV2.backtest.tabs.tradesWithCount', { count: tradeRows.length })">
        <a-empty v-if="!tradeRows.length" :description="$t('strategyV2.backtest.noClosedTrades')" />
        <template v-else>
          <a-alert
            v-if="hasGridMatchedTrades"
            type="info"
            show-icon
            class="grid-accounting-alert"
            :message="$t('strategyV2.backtest.gridAccountingTitle')"
            :description="$t('strategyV2.backtest.gridAccountingHint')" />
          <a-table
            class="completed-trades-table"
            :columns="tradeColumns"
            :data-source="tradeRows"
            :row-key="(row, index) => row.id || index"
            size="small"
            :scroll="{ x: hasGridMatchedTrades ? 1850 : 1610 }"
            :pagination="{ pageSize: 8 }"
          />
        </template>
      </a-tab-pane>

      <a-tab-pane key="executions" :tab="$t('strategyV2.backtest.tabs.executionsWithCount', { count: executionRows.length })">
        <a-empty v-if="!executionRows.length" :description="$t('strategyV2.backtest.noExecutions')" />
        <a-table
          v-else
          :columns="executionColumns"
          :data-source="executionRows"
          :row-key="(row, index) => row.order_id || index"
          size="small"
          :scroll="{ x: 1250 }"
          :pagination="{ pageSize: 8 }" />
      </a-tab-pane>

      <a-tab-pane key="attribution" :tab="$t('strategyV2.backtest.tabs.attribution')">
        <a-table
          :columns="attributionColumns"
          :data-source="attribution.symbols || []"
          row-key="symbol"
          size="small"
          :pagination="false"
          :scroll="{ x: 900 }" />
      </a-tab-pane>

      <a-tab-pane key="audit" :tab="$t('strategyV2.backtest.tabs.audit')">
        <div class="audit-summary" :class="auditPassed ? 'passed' : 'failed'">
          <a-icon :type="auditPassed ? 'safety-certificate' : 'warning'" />
          <div><strong>{{ auditPassed ? $t('strategyV2.backtest.auditPassed') : $t('strategyV2.backtest.auditFailed') }}</strong><span>{{ $t('strategyV2.backtest.auditScope') }}</span></div>
        </div>
        <a-table
          :columns="ledgerColumns"
          :data-source="result.orderLedger || []"
          row-key="orderId"
          size="small"
          :pagination="{ pageSize: 10 }"
          :scroll="{ x: 1300 }" />
      </a-tab-pane>
    </a-tabs>

    <section v-if="hasTradeReview" class="trade-review-card">
      <div class="trade-review-heading">
        <div>
          <h3>{{ $t(isPortfolioStrategy ? 'strategyV2.backtest.portfolioReviewOverview' : 'strategyV2.backtest.tradeReviewOverview') }}</h3>
          <span>{{ $t(isPortfolioStrategy ? 'strategyV2.backtest.portfolioReviewHint' : 'strategyV2.backtest.tradeReviewHint') }}</span>
        </div>
        <a-select
          v-if="reviewSymbols.length > 1"
          v-model="activeReviewSymbol"
          size="small"
          class="review-symbol-select">
          <a-select-option v-for="symbol in reviewSymbols" :key="symbol" :value="symbol">
            {{ symbol }}
          </a-select-option>
        </a-select>
      </div>
      <div v-if="isPortfolioStrategy && portfolioContributionRows.length" class="portfolio-contribution-panel">
        <div class="contribution-heading">
          <strong>{{ $t('strategyV2.backtest.symbolContribution') }}</strong>
          <span>{{ $t('strategyV2.backtest.symbolContributionHint') }}</span>
        </div>
        <div class="contribution-list">
          <button
            v-for="item in portfolioContributionRows"
            :key="item.symbol"
            type="button"
            class="contribution-item"
            :class="{ active: item.symbol === effectiveReviewSymbol }"
            @click="activeReviewSymbol = item.symbol"
          >
            <span class="contribution-symbol">
              <span class="contribution-symbol-text">{{ item.symbol }}</span>
              <a-tag v-if="item.hasOpenPosition" class="open-position-tag">
                {{ $t('strategyV2.backtest.status.open_position_only') }}
              </a-tag>
            </span>
            <span><small>{{ $t('strategyV2.backtest.closedTrades') }}</small><b>{{ item.trades }}</b></span>
            <span>
              <small>{{ $t(item.hasOpenPosition && !item.trades ? 'backtest-center.quantity' : 'backtest-center.metrics.winRate') }}</small>
              <b>{{ item.hasOpenPosition && !item.trades ? formatNumber(item.positionQuantity, 4) : formatPercent(item.winRate, false) }}</b>
            </span>
            <span>
              <small>{{ $t(item.hasOpenPosition && !item.trades ? 'strategyV2.backtest.unrealizedProfit' : 'strategyV2.backtest.tradeReviewProfit') }}</small>
              <b :class="profitTone(item.profit)">{{ formatSignedNumber(item.profit) }}</b>
            </span>
            <a-icon :type="item.hasSnapshot ? 'line-chart' : 'info-circle'" />
          </button>
        </div>
      </div>
      <div class="review-facts">
        <div><span>{{ $t('backtest-center.symbol') }}</span><strong>{{ effectiveReviewSymbol }}</strong></div>
        <div><span>{{ $t('strategyV2.backtest.closedTrades') }}</span><strong>{{ reviewTrades.length }}</strong></div>
        <div><span>{{ $t('strategyV2.backtest.tradeReviewTimeframe') }}</span><strong>{{ reviewTimeframe }}</strong></div>
        <div><span>{{ $t(activeContributionRow && activeContributionRow.hasOpenPosition && !reviewTrades.length ? 'strategyV2.backtest.unrealizedProfit' : 'strategyV2.backtest.tradeReviewProfit') }}</span><strong :class="profitTone(reviewProfit)">{{ formatSignedNumber(reviewProfit) }}</strong></div>
        <div><span>{{ $t('strategyV2.backtest.tradeReviewRange') }}</span><strong>{{ reviewDateRange }}</strong></div>
      </div>
      <div v-if="canRenderTradeReview" class="inline-review-chart">
        <kline-chart
          :key="reviewChartKey"
          ref="reviewChart"
          :symbol="reviewInstrument.symbol"
          :market="reviewInstrument.market"
          :exchange-id="reviewInstrument.exchangeId"
          :market-type="reviewInstrument.marketType"
          :timeframe="reviewTimeframe"
          :initial-before-time="reviewWindow.beforeTime"
          :initial-limit="reviewWindow.limit"
          :initial-rows="reviewRows"
          :theme="isDark ? 'dark' : 'light'"
          :active-indicators="[]"
          :show-indicator-toolbar="false"
          :realtime-enabled="false"
          :full-width="true"
          @load="renderReviewMarkers"
          @indicators-updated="renderReviewMarkers"
        />
      </div>
      <a-empty
        v-else
        class="review-snapshot-empty"
        :description="$t('strategyV2.backtest.tradeReviewSnapshotMissing')" />
    </section>

  </div>
</template>

<script>
import * as echarts from 'echarts'
import moment from 'moment'
import KlineChart from '@/views/indicator-analysis/components/KlineChart.vue'
import {
  buildAggregateTradeReview,
  buildTradeReviewMarkers,
  buildTradeReviewWindow,
  calculateTradeValueUsd,
  findNearestBarIndex,
  normalizeTradeReviewSymbol
} from '@/utils/tradeReview'
import { timestampMillisecondsUtc } from '@/utils/utcInstant'
import { formatVisibleWeights } from './portfolioResultFormatters'
import { formatBacktestTime } from '@/utils/userTime'

export default {
  name: 'PortfolioResult',
  components: { KlineChart },
  props: {
    result: { type: Object, required: true },
    isDark: { type: Boolean, default: false }
  },
  data () {
    return {
      chart: null,
      resizeObserver: null,
      activeReviewSymbol: '',
      reviewMarkerTimer: null,
      riskAnalysisExpanded: false,
      benchmarkAnalysisExpanded: false,
      orderStatuses: ['filled', 'partial', 'deferred', 'rejected']
    }
  },
  computed: {
    auditPassed () { return Boolean(this.result.audit && this.result.audit.passed) },
    legacyBackfilled () { return Boolean(this.result.compatibility && this.result.compatibility.legacyBackfill) },
    initialCapital () {
      return Number(
        this.result.initialCapital ||
        (this.result.executionAssumptions && this.result.executionAssumptions.initialCapital) ||
        0
      )
    },
    attribution () {
      const source = this.result.attribution && typeof this.result.attribution === 'object'
        ? this.result.attribution
        : {}
      const executions = this.result.executions || this.result.rawTrades || []
      const recordedCommission = Number(this.result.totalCommission)
      const totalCommission = Number.isFinite(recordedCommission)
        ? recordedCommission
        : executions.reduce((sum, item) => sum + Number(item.commission || 0), 0)
      const feeDrag = source.feeDrag !== undefined && source.feeDrag !== null
        ? source.feeDrag
        : (this.initialCapital > 0 ? totalCommission / this.initialCapital : 0)
      const savedStatuses = source.orderStatus && typeof source.orderStatus === 'object'
        ? source.orderStatus
        : null
      const orderStatus = savedStatuses || executions.reduce((counts, item) => {
        const status = this.orderStatuses.includes(item.status) ? item.status : 'filled'
        counts[status] += 1
        return counts
      }, { filled: 0, partial: 0, deferred: 0, rejected: 0 })
      return { ...source, feeDrag, orderStatus }
    },
    isPortfolioStrategy () {
      return Boolean(this.result.manifest && this.result.manifest.strategyType === 'portfolio')
    },
    trustTone () {
      if (this.result.liquidated || this.result.legacyInsolventContinuation) return 'is-error'
      if (!this.auditPassed) return 'is-error'
      return this.result.resultStatus === 'completed_trades' ? 'is-success' : 'is-warning'
    },
    statusLabel () { return this.$t(`strategyV2.backtest.status.${this.result.resultStatus || 'unknown'}`) },
    statusHint () { return this.$t(`strategyV2.backtest.status.${this.result.resultStatus || 'unknown'}Hint`) },
    benchmarkCaption () {
      if (this.effectiveBenchmarkStatus === 'partial') {
        const item = this.result.benchmark || {}
        return this.$t('strategyV2.backtest.benchmarkPartial', {
          symbol: item.symbol || '-',
          end: this.formatDate(this.benchmarkCoverageEnd)
        })
      }
      if (this.effectiveBenchmarkStatus !== 'available') return this.$t('strategyV2.backtest.benchmarkUnavailable')
      const item = this.result.benchmark || {}
      return this.$t('strategyV2.backtest.comparedWith', { symbol: item.symbol || '-' })
    },
    benchmarkCoverageEnd () {
      return this.result.benchmarkCoverageEnd ||
        (this.result.dataProvenance && this.result.dataProvenance.benchmark && this.result.dataProvenance.benchmark.lastBar) ||
        null
    },
    effectiveBenchmarkStatus () {
      const status = this.result.benchmarkStatus || 'unavailable'
      if (status !== 'available') return status
      const curve = this.result.equityCurve || []
      const equityEnd = curve.length ? timestampMillisecondsUtc(curve[curve.length - 1].time) : null
      const coverageEnd = timestampMillisecondsUtc(this.benchmarkCoverageEnd)
      return Number.isFinite(equityEnd) && Number.isFinite(coverageEnd) && coverageEnd < equityEnd
        ? 'partial'
        : status
    },
    benchmarkCurveRows () {
      const rows = this.result.benchmarkCurve || []
      const coverageEnd = timestampMillisecondsUtc(this.benchmarkCoverageEnd)
      if (!Number.isFinite(coverageEnd)) return rows
      return rows.filter(item => {
        const time = timestampMillisecondsUtc(item && item.time)
        return Number.isFinite(time) && time <= coverageEnd
      })
    },
    hasBenchmarkMetrics () {
      if (!['available', 'partial'].includes(this.effectiveBenchmarkStatus)) return false
      return Number.isFinite(Number(this.result.benchmarkTotalReturn)) &&
        Number.isFinite(Number(this.result.excessReturn)) &&
        this.benchmarkCurveRows.length > 0
    },
    benchmarkRelativeMetrics () {
      const metrics = this.result.benchmarkRelativeMetrics
      return metrics && typeof metrics === 'object' ? metrics : {}
    },
    hasBenchmarkRelativeAnalysis () {
      return Number(this.benchmarkRelativeMetrics.observations || 0) > 0
    },
    hasDownsideRiskAnalysis () {
      return [
        'sortinoRatio',
        'calmarRatio',
        'annualizedDownsideDeviation',
        'maxDrawdownDurationDays',
        'maxDrawdownRecoveryDays',
        'recoveryFactor',
        'tailRiskStatus',
        'valueAtRisk95',
        'omegaRatio'
      ].some(key => this.result[key] !== undefined)
    },
    hasTailRiskAnalysis () {
      return [
        'tailRiskStatus',
        'valueAtRisk95',
        'valueAtRisk99',
        'omegaRatio',
        'tailRatio',
        'skewness',
        'kurtosis'
      ].some(key => this.result[key] !== undefined)
    },
    tailRiskStatusLabel () {
      return this.tailRiskMetricStatus(this.result.tailRiskStatus)
    },
    riskMetricCards () {
      const recoveryTime = this.result.maxDrawdownRecoveryTime
      const recovered = this.result.maxDrawdownRecovered === true
      return [
        {
          key: 'sortino',
          label: this.$t('strategyV2.backtest.riskMetrics.sortino'),
          value: this.formatMetricNumber(this.result.sortinoRatio),
          detail: this.benchmarkMetricStatus(null, this.result.sortinoRatio),
          hint: this.$t('strategyV2.backtest.riskMetrics.sortinoHint'),
          tone: this.metricTone(this.result.sortinoRatio)
        },
        {
          key: 'calmar',
          label: this.$t('strategyV2.backtest.riskMetrics.calmar'),
          value: this.formatMetricNumber(this.result.calmarRatio),
          detail: this.benchmarkMetricStatus(null, this.result.calmarRatio),
          hint: this.$t('strategyV2.backtest.riskMetrics.calmarHint'),
          tone: this.metricTone(this.result.calmarRatio)
        },
        {
          key: 'downsideDeviation',
          label: this.$t('strategyV2.backtest.riskMetrics.annualizedDownsideDeviation'),
          value: this.formatNullablePercent(this.result.annualizedDownsideDeviation, false),
          detail: this.$t('strategyV2.backtest.riskMetrics.annualized'),
          hint: this.$t('strategyV2.backtest.riskMetrics.annualizedDownsideDeviationHint'),
          tone: ''
        },
        {
          key: 'recoveryFactor',
          label: this.$t('strategyV2.backtest.riskMetrics.recoveryFactor'),
          value: this.formatMetricMultiple(this.result.recoveryFactor),
          detail: this.benchmarkMetricStatus(null, this.result.recoveryFactor),
          hint: this.$t('strategyV2.backtest.riskMetrics.recoveryFactorHint'),
          tone: this.metricTone(this.result.recoveryFactor)
        },
        {
          key: 'drawdownDuration',
          label: this.$t('strategyV2.backtest.riskMetrics.maxDrawdownDuration'),
          value: this.formatDurationDays(this.result.maxDrawdownDurationDays),
          detail: this.$t('strategyV2.backtest.riskMetrics.longestEpisode'),
          hint: this.$t('strategyV2.backtest.riskMetrics.maxDrawdownDurationHint'),
          tone: ''
        },
        {
          key: 'drawdownRecovery',
          label: this.$t('strategyV2.backtest.riskMetrics.maxDrawdownRecovery'),
          value: this.formatDurationDays(this.result.maxDrawdownRecoveryDays),
          detail: recovered
            ? (recoveryTime
                ? this.$t('strategyV2.backtest.riskMetrics.recoveredAt', { date: this.formatDate(recoveryTime) })
                : this.$t('strategyV2.backtest.riskMetrics.noRecoveryNeeded'))
            : this.$t('strategyV2.backtest.riskMetrics.notRecovered'),
          hint: this.$t('strategyV2.backtest.riskMetrics.maxDrawdownRecoveryHint'),
          tone: recovered ? 'positive' : 'negative'
        }
      ]
    },
    tailRiskMetricCards () {
      const status95 = this.result.valueAtRisk95Status
      const status99 = this.result.valueAtRisk99Status
      const cards = [
        ['valueAtRisk95', 'valueAtRisk95', status95, 'rate', 'loss'],
        ['cvar95', 'cvar95', status95, 'rate', 'loss'],
        ['valueAtRisk99', 'valueAtRisk99', status99, 'rate', 'loss'],
        ['cvar99', 'cvar99', status99, 'rate', 'loss'],
        ['parametricVaR95', 'parametricVaR95', status95, 'rate', 'loss'],
        ['parametricVaR99', 'parametricVaR99', status99, 'rate', 'loss'],
        ['omegaRatio', 'omegaRatio', null, 'number', 'ratio'],
        ['tailRatio', 'tailRatio', null, 'number', 'ratio'],
        ['skewness', 'skewness', null, 'number', 'signed'],
        ['kurtosis', 'kurtosis', null, 'number', 'neutral']
      ]
      return cards.map(([key, resultKey, status, format, tone]) => {
        const value = this.result[resultKey]
        return {
          key,
          label: this.$t(`strategyV2.backtest.riskMetrics.${key}`),
          value: format === 'rate' ? this.formatMetricRate(value, false) : this.formatMetricNumber(value),
          detail: this.tailRiskMetricStatus(status, value),
          hint: this.$t(`strategyV2.backtest.riskMetrics.${key}Hint`),
          tone: tone === 'loss'
            ? (this.hasMetricValue(value) && Number(value) > 0 ? 'negative' : '')
            : tone === 'ratio'
              ? this.thresholdRatioTone(value)
              : tone === 'signed'
                ? this.metricTone(value)
                : ''
        }
      })
    },
    hasAdvancedBenchmarkMetrics () {
      return [
        'mSquared',
        'mSquaredAlpha',
        'upBeta',
        'downBeta',
        'betaSpread',
        'battingAverage',
        'outperformancePayoffRatio'
      ].some(key => this.benchmarkRelativeMetrics[key] !== undefined)
    },
    advancedBenchmarkMetricCards () {
      const metrics = this.benchmarkRelativeMetrics
      return [
        {
          key: 'mSquared',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.mSquared'),
          value: this.formatMetricRate(metrics.mSquared),
          detail: this.benchmarkMetricStatus(metrics.mSquaredStatus, metrics.mSquared),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.mSquaredHint'),
          tone: this.metricTone(metrics.mSquared)
        },
        {
          key: 'mSquaredAlpha',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.mSquaredAlpha'),
          value: this.formatMetricRate(metrics.mSquaredAlpha),
          detail: this.benchmarkMetricStatus(metrics.mSquaredStatus, metrics.mSquaredAlpha),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.mSquaredAlphaHint'),
          tone: this.metricTone(metrics.mSquaredAlpha)
        },
        {
          key: 'upBeta',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.upBeta'),
          value: this.formatMetricNumber(metrics.upBeta),
          detail: this.$t('strategyV2.backtest.benchmarkMetrics.periods', { count: metrics.upMarketPeriods || 0 }),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.upBetaHint'),
          tone: ''
        },
        {
          key: 'downBeta',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.downBeta'),
          value: this.formatMetricNumber(metrics.downBeta),
          detail: this.$t('strategyV2.backtest.benchmarkMetrics.periods', { count: metrics.downMarketPeriods || 0 }),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.downBetaHint'),
          tone: ''
        },
        {
          key: 'betaSpread',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.betaSpread'),
          value: this.formatMetricNumber(metrics.betaSpread),
          detail: this.benchmarkMetricStatus(metrics.dualBetaStatus, metrics.betaSpread),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.betaSpreadHint'),
          tone: this.metricTone(metrics.betaSpread)
        },
        {
          key: 'battingAverage',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.battingAverage'),
          value: this.formatMetricRate(metrics.battingAverage, false),
          detail: this.$t('strategyV2.backtest.benchmarkMetrics.outperformancePeriods', {
            wins: metrics.outperformancePeriods || 0,
            losses: metrics.underperformancePeriods || 0
          }),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.battingAverageHint'),
          tone: ''
        },
        {
          key: 'outperformancePayoffRatio',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.outperformancePayoffRatio'),
          value: this.formatMetricMultiple(metrics.outperformancePayoffRatio),
          detail: this.benchmarkMetricStatus(metrics.battingStatus, metrics.outperformancePayoffRatio),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.outperformancePayoffRatioHint'),
          tone: ''
        }
      ]
    },
    benchmarkMetricCards () {
      const metrics = this.benchmarkRelativeMetrics
      return [
        {
          key: 'informationRatio',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.informationRatio'),
          value: this.formatMetricNumber(metrics.informationRatio),
          detail: metrics.classification
            ? this.$t(`strategyV2.backtest.benchmarkMetrics.classification.${metrics.classification}`)
            : this.benchmarkMetricStatus(metrics.status),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.informationRatioHint'),
          tone: this.metricTone(metrics.informationRatio)
        },
        {
          key: 'beta',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.beta'),
          value: this.formatMetricNumber(metrics.beta),
          detail: this.benchmarkMetricStatus(metrics.betaStatus, metrics.beta),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.betaHint'),
          tone: ''
        },
        {
          key: 'alpha',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.alpha'),
          value: this.formatMetricRate(metrics.alphaAnnualized),
          detail: this.benchmarkMetricStatus(metrics.betaStatus, metrics.alphaAnnualized),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.alphaHint'),
          tone: this.metricTone(metrics.alphaAnnualized)
        },
        {
          key: 'treynor',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.treynor'),
          value: this.formatMetricNumber(metrics.treynorRatio),
          detail: this.benchmarkMetricStatus(metrics.treynorStatus, metrics.treynorRatio),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.treynorHint'),
          tone: this.metricTone(metrics.treynorRatio)
        },
        {
          key: 'correlation',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.correlation'),
          value: this.formatMetricNumber(metrics.correlation),
          detail: this.benchmarkMetricStatus(metrics.correlationStatus, metrics.correlation),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.correlationHint'),
          tone: ''
        },
        {
          key: 'rSquared',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.rSquared'),
          value: this.formatMetricRate(metrics.rSquared, false),
          detail: this.benchmarkMetricStatus(metrics.correlationStatus, metrics.rSquared),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.rSquaredHint'),
          tone: ''
        },
        {
          key: 'upCapture',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.upCapture'),
          value: this.formatMetricRate(metrics.upCapture, false),
          detail: this.$t('strategyV2.backtest.benchmarkMetrics.periods', { count: metrics.upMarketPeriods || 0 }),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.upCaptureHint'),
          tone: ''
        },
        {
          key: 'downCapture',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.downCapture'),
          value: this.formatMetricRate(metrics.downCapture, false),
          detail: this.$t('strategyV2.backtest.benchmarkMetrics.periods', { count: metrics.downMarketPeriods || 0 }),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.downCaptureHint'),
          tone: ''
        },
        {
          key: 'captureRatio',
          label: this.$t('strategyV2.backtest.benchmarkMetrics.captureRatio'),
          value: this.formatMetricMultiple(metrics.captureRatio),
          detail: this.benchmarkMetricStatus(metrics.captureStatus, metrics.captureRatio),
          hint: this.$t('strategyV2.backtest.benchmarkMetrics.captureRatioHint'),
          tone: ''
        }
      ]
    },
    metrics () {
      return [
        { key: 'return', label: this.$t('backtest-center.metrics.totalReturn'), value: this.formatPercent(this.result.totalReturn), tone: this.profitTone(this.result.totalReturn), hint: this.$t('strategyV2.backtest.totalReturnHint') },
        { key: 'benchmark', label: this.$t('strategyV2.backtest.benchmarkReturn'), value: this.hasBenchmarkMetrics ? this.formatPercent(this.result.benchmarkTotalReturn) : '-', tone: this.hasBenchmarkMetrics ? this.profitTone(this.result.benchmarkTotalReturn) : '', hint: this.$t('strategyV2.backtest.benchmarkReturnHint') },
        { key: 'excess', label: this.$t('strategyV2.backtest.excessReturn'), value: this.hasBenchmarkMetrics ? this.formatPercentagePointValue(this.result.excessReturn) : '-', tone: this.hasBenchmarkMetrics ? this.profitTone(this.result.excessReturn) : '', hint: this.$t('strategyV2.backtest.excessReturnHint') },
        { key: 'drawdown', label: this.$t('backtest-center.metrics.maxDrawdown'), value: this.formatNullablePercent(this.result.maxDrawdown), tone: this.result.maxDrawdown === null || this.result.maxDrawdown === undefined ? '' : 'negative', hint: this.$t('strategyV2.backtest.maxDrawdownHint') },
        { key: 'equity', label: this.$t('strategyV2.backtest.finalEquity'), value: this.formatNumber(this.endingEquity), tone: '', hint: this.$t('strategyV2.backtest.finalEquityHint') },
        { key: 'fees', label: this.$t('strategyV2.backtest.feeDrag'), value: this.formatRate(this.attribution.feeDrag), tone: Number(this.attribution.feeDrag || 0) > 0 ? 'negative' : '', hint: this.$t('strategyV2.backtest.feeDragHint') }
      ]
    },
    endingEquity () {
      const curve = this.result.equityCurve || []
      const last = curve[curve.length - 1] || {}
      const value = Number(last.value)
      return Number.isFinite(value) ? value : this.initialCapital
    },
    latestSnapshot () {
      const snapshots = Array.isArray(this.result.holdingSnapshots) ? this.result.holdingSnapshots : []
      const rows = snapshots.length ? snapshots : (this.result.equityCurve || [])
      return rows[rows.length - 1] || {}
    },
    rebalanceRows () {
      const protectionReasons = (this.result.protectionEvents || []).reduce((groups, event) => {
        const time = String((event && event.time) || '')
        if (!groups[time]) groups[time] = []
        groups[time].push(event.reason)
        return groups
      }, {})
      const rows = (this.result.rebalanceRecords || []).map((row, index) => ({
        ...row,
        _rowKey: `${row.time || 'execution'}:${index}`
      }))
      for (let index = rows.length - 1; index >= 0; index -= 1) {
        const row = rows[index]
        if (row.recordType) continue
        const reasons = protectionReasons[String(row.time || '')] || []
        const hasNonZeroTarget = Object.values(row.targetWeights || {}).some(value => Math.abs(Number(value || 0)) > 1e-12)
        if (!hasNonZeroTarget && reasons.length) {
          row.recordType = 'protection'
          row.reasons = [reasons.pop()]
        }
      }
      return rows
    },
    holdingRows () {
      return (this.result.holdingSnapshots || []).flatMap(snapshot => Object.keys(snapshot.positions || {}).map(symbol => ({ time: snapshot.time, symbol, ...snapshot.positions[symbol], cash: snapshot.cash, grossExposure: snapshot.grossExposure, netExposure: snapshot.netExposure }))).reverse()
    },
    tradeRows () { return this.result.closedTrades || this.result.trades || [] },
    reviewSymbols () {
      const snapshots = this.result.reviewCandles && typeof this.result.reviewCandles === 'object'
        ? Object.keys(this.result.reviewCandles)
        : []
      const attributed = Array.isArray(this.attribution.symbols)
        ? this.attribution.symbols.map(row => String((row && row.symbol) || ''))
        : []
      return [...new Set([
        ...this.tradeRows.map(row => normalizeTradeReviewSymbol(row && row.symbol)),
        ...attributed.map(normalizeTradeReviewSymbol),
        ...snapshots.map(normalizeTradeReviewSymbol)
      ].filter(Boolean))]
    },
    effectiveReviewSymbol () {
      return this.reviewSymbols.includes(this.activeReviewSymbol)
        ? this.activeReviewSymbol
        : (this.reviewSymbols[0] || '')
    },
    reviewTrades () {
      return this.tradeRows.filter(row => normalizeTradeReviewSymbol(row && row.symbol) === this.effectiveReviewSymbol)
    },
    reviewMarkerTrades () {
      return this.sampleReviewRows(this.reviewTrades, 160)
    },
    reviewExecutions () {
      return (this.result.executions || this.result.rawTrades || []).filter(row => {
        return normalizeTradeReviewSymbol(row && row.symbol) === this.effectiveReviewSymbol
      })
    },
    reviewMarkerExecutions () {
      return this.sampleReviewRows(this.reviewExecutions, 240)
    },
    hasTradeReview () {
      return this.isPortfolioStrategy
        ? this.portfolioContributionRows.length > 0
        : this.reviewTrades.length > 0
    },
    portfolioContributionRows () {
      if (!this.isPortfolioStrategy) return []
      const attributed = new Map()
      ;(this.attribution.symbols || []).forEach(row => {
        const symbol = normalizeTradeReviewSymbol(row && row.symbol)
        if (!symbol) return
        const saved = attributed.get(symbol) || {}
        attributed.set(symbol, {
          ...saved,
          ...row,
          symbol,
          realizedProfit: Number(saved.realizedProfit || 0) + Number(row.realizedProfit || 0),
          unrealizedProfit: Number(saved.unrealizedProfit || 0) + Number(row.unrealizedProfit || 0),
          commission: Number(saved.commission || 0) + Number(row.commission || 0),
          netContribution: Number(saved.netContribution || 0) + Number(row.netContribution || 0)
        })
      })
      const positions = new Map()
      Object.entries(this.result.positions || {}).forEach(([rawSymbol, row]) => {
        const symbol = normalizeTradeReviewSymbol(rawSymbol)
        if (!symbol || !row || typeof row !== 'object') return
        positions.set(symbol, row)
      })
      const snapshots = this.result.reviewCandles && typeof this.result.reviewCandles === 'object'
        ? this.result.reviewCandles
        : {}
      return this.reviewSymbols.map(symbol => {
        const trades = this.tradeRows.filter(row => normalizeTradeReviewSymbol(row && row.symbol) === symbol)
        const attr = attributed.get(symbol) || {}
        const hasAttribution = attributed.has(symbol)
        const position = positions.get(symbol) || {}
        const positionQuantity = Number(position.amount !== undefined ? position.amount : position.quantity) || 0
        const hasOpenPosition = Math.abs(positionQuantity) > 1e-12
        const tradeProfit = trades.reduce((sum, row) => sum + Number((row && row.profit) || 0), 0)
        const unrealizedProfit = Number(attr.unrealizedProfit || 0)
        const attributedProfit = Number(attr.realizedProfit || 0) + unrealizedProfit
        const wins = trades.filter(row => Number((row && row.profit) || 0) > 0).length
        const snapshotKey = Object.keys(snapshots).find(key => normalizeTradeReviewSymbol(key) === symbol)
        const snapshot = snapshots[symbol] || (snapshotKey ? snapshots[snapshotKey] : null)
        return {
          symbol,
          trades: trades.length,
          winRate: trades.length ? wins / trades.length * 100 : 0,
          profit: hasAttribution ? attributedProfit : tradeProfit,
          unrealizedProfit,
          positionQuantity,
          hasOpenPosition,
          hasSnapshot: Boolean(snapshot && Array.isArray(snapshot.candles) && snapshot.candles.length)
        }
      }).sort((left, right) => right.profit - left.profit || right.trades - left.trades || left.symbol.localeCompare(right.symbol))
    },
    activeContributionRow () {
      return this.portfolioContributionRows.find(item => item.symbol === this.effectiveReviewSymbol) || null
    },
    reviewAggregate () {
      return buildAggregateTradeReview(
        this.reviewTrades,
        (this.result.manifest && this.result.manifest.primaryFrequency) || '1d'
      )
    },
    reviewProfit () {
      if (this.isPortfolioStrategy && this.activeContributionRow) return this.activeContributionRow.profit
      return this.reviewTrades.reduce((sum, trade) => sum + Number((trade && trade.profit) || 0), 0)
    },
    reviewDateRange () {
      const window = this.reviewWindow
      if (Number.isFinite(window.entryTime) && Number.isFinite(window.exitTime)) {
        return `${this.formatDate(window.entryTime)} ~ ${this.formatDate(window.exitTime)}`
      }
      if (!this.reviewRows.length) return '-'
      return `${this.formatDate(this.reviewRows[0].time)} ~ ${this.formatDate(this.reviewRows[this.reviewRows.length - 1].time)}`
    },
    hasGridMatchedTrades () {
      return this.tradeRows.some(row => row && row.profit_basis === 'grid_cell')
    },
    executionRows () {
      return [...(this.result.executions || this.result.rawTrades || [])].sort((left, right) => {
        return (timestampMillisecondsUtc(right && right.time) || 0) - (timestampMillisecondsUtc(left && left.time) || 0)
      })
    },
    reviewInstrument () {
      const raw = normalizeTradeReviewSymbol(this.effectiveReviewSymbol)
      const colon = raw.indexOf(':')
      const market = colon > -1 ? raw.slice(0, colon) : ''
      const rest = colon > -1 ? raw.slice(colon + 1) : raw
      const at = rest.lastIndexOf('@')
      const symbol = at > -1 ? rest.slice(0, at) : rest
      const suffix = at > -1 ? rest.slice(at + 1) : ''
      const parts = suffix.split(':')
      return { market, symbol, exchangeId: parts.length > 1 ? parts[0] : '', marketType: parts.length > 1 ? parts[1] : (parts[0] || 'spot') }
    },
    reviewTimeframe () {
      return this.reviewSnapshot.timeframe || this.reviewAggregate.timeframe
    },
    reviewSnapshot () {
      const snapshots = this.result.reviewCandles && typeof this.result.reviewCandles === 'object'
        ? this.result.reviewCandles
        : {}
      const snapshotKey = Object.keys(snapshots).find(key => normalizeTradeReviewSymbol(key) === this.effectiveReviewSymbol)
      const snapshot = snapshots[this.effectiveReviewSymbol] || (snapshotKey ? snapshots[snapshotKey] : null)
      return snapshot && typeof snapshot === 'object' ? snapshot : {}
    },
    reviewRows () {
      return Array.isArray(this.reviewSnapshot.candles) ? this.reviewSnapshot.candles : []
    },
    canRenderTradeReview () {
      return this.reviewRows.length > 0 || (
        Number.isFinite(this.reviewWindow.entryTime) &&
        Number.isFinite(this.reviewWindow.exitTime)
      )
    },
    reviewWindow () {
      const aggregateWindow = this.reviewAggregate.window || buildTradeReviewWindow({}, this.reviewTimeframe)
      if (this.reviewRows.length) {
        return { ...aggregateWindow, beforeTime: null, limit: this.reviewRows.length }
      }
      return aggregateWindow
    },
    reviewChartKey () {
      const rows = this.reviewRows
      const first = rows.length ? rows[0].time : ''
      const last = rows.length ? rows[rows.length - 1].time : ''
      return [this.effectiveReviewSymbol, this.reviewTimeframe, this.reviewWindow.beforeTime, this.reviewWindow.limit, first, last, this.isDark].join('|')
    },
    rebalanceColumns () {
      return [
        { title: this.$t('strategyV2.backtest.time'), dataIndex: 'time', width: 170, customRender: this.formatDate },
        { title: this.$t('strategyV2.backtest.recordType'), dataIndex: 'recordType', width: 130, customRender: (value, row) => this.formatRebalanceType(value, row) },
        { title: this.$t('strategyV2.backtest.targetWeights'), dataIndex: 'targetWeights', width: 240, customRender: this.formatWeights },
        { title: this.$t('strategyV2.backtest.actualWeights'), dataIndex: 'actualWeights', width: 240, customRender: this.formatWeights },
        { title: this.$t('strategyV2.backtest.turnover'), dataIndex: 'turnover', customRender: this.formatRate },
        { title: this.$t('strategyV2.backtest.cashAfter'), dataIndex: 'cashAfter', customRender: value => this.formatNumber(value) },
        { title: this.$t('strategyV2.backtest.orderHealth'), key: 'health', customRender: (value, row) => `${row.filled || 0}/${row.partial || 0}/${row.deferred || 0}/${row.rejected || 0}` }
      ]
    },
    holdingColumns () {
      return [
        { title: this.$t('strategyV2.backtest.time'), dataIndex: 'time', width: 165, customRender: this.formatDate },
        { title: this.$t('backtest-center.symbol'), dataIndex: 'symbol', width: 170 },
        { title: this.$t('backtest-center.quantity'), dataIndex: 'quantity', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('strategyV2.backtest.averageCost'), dataIndex: 'averageCost', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('strategyV2.backtest.marketValue'), dataIndex: 'marketValue', customRender: value => this.formatNumber(value) },
        { title: this.$t('strategyV2.backtest.weight'), dataIndex: 'weight', customRender: this.formatRate },
        { title: this.$t('strategyV2.backtest.cash'), dataIndex: 'cash', customRender: value => this.formatNumber(value) }
      ]
    },
    tradeColumns () {
      const columns = [
        { title: this.$t('backtest-center.symbol'), dataIndex: 'symbol', width: 165 },
        { title: this.$t('backtest-center.tradeColumns.side'), dataIndex: 'side', width: 72 },
        { title: this.$t('backtest-center.tradeColumns.entryTime'), dataIndex: 'entry_time', width: 165, customRender: this.formatDate },
        { title: this.$t('backtest-center.tradeColumns.exitTime'), dataIndex: 'exit_time', width: 165, customRender: this.formatDate },
        { title: this.$t('backtest-center.tradeColumns.quantity'), dataIndex: 'quantity', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('backtest-center.tradeColumns.valueUsd'), key: 'value_usd', customRender: (value, row) => this.formatNullableNumber(calculateTradeValueUsd(row)) },
        { title: this.$t(this.hasGridMatchedTrades ? 'strategyV2.backtest.gridMatchedEntry' : 'backtest-center.tradeColumns.entryPrice'), dataIndex: 'entry_price', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('backtest-center.tradeColumns.exitPrice'), dataIndex: 'exit_price', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('trading-assistant.costs.openingCommission'), dataIndex: 'entry_commission', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('trading-assistant.costs.closingCommission'), dataIndex: 'exit_commission', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t(this.hasGridMatchedTrades ? 'strategyV2.backtest.gridMatchedProfit' : 'backtest-center.tradeColumns.profit'), dataIndex: 'profit', customRender: value => this.$createElement('span', { class: ['trade-profit', this.profitTone(value)] }, this.formatSignedNumber(value)) },
        { title: this.$t('backtest-center.tradeColumns.balance'), dataIndex: 'balance', customRender: value => this.formatNumber(value) },
        { title: this.$t('backtest-center.tradeColumns.closeReason'), dataIndex: 'close_reason', width: 150 }
      ]
      if (this.hasGridMatchedTrades) {
        columns.splice(8, 0, {
          title: this.$t('strategyV2.backtest.accountAverageEntry'),
          dataIndex: 'account_avg_entry_price',
          customRender: value => this.formatNullableNumber(value === undefined ? null : value, 4)
        })
        columns.splice(columns.length - 2, 0, {
          title: this.$t('strategyV2.backtest.accountRealizedProfit'),
          dataIndex: 'account_realized_profit',
          customRender: value => value === undefined || value === null
            ? '-'
            : this.$createElement('span', { class: ['trade-profit', this.profitTone(value)] }, this.formatSignedNumber(value))
        })
      }
      return columns
    },
    executionColumns () {
      return [
        { title: this.$t('strategyV2.backtest.signalTime'), dataIndex: 'signal_time', width: 165, customRender: this.formatDate },
        { title: this.$t('strategyV2.backtest.fillTime'), dataIndex: 'time', width: 165, customRender: this.formatDate },
        { title: this.$t('backtest-center.symbol'), dataIndex: 'symbol', width: 165 },
        { title: this.$t('strategyV2.backtest.side'), dataIndex: 'side', width: 70 },
        { title: this.$t('backtest-center.quantity'), dataIndex: 'quantity', customRender: value => this.formatNumber(value, 6) },
        { title: this.$t('backtest-center.price'), dataIndex: 'price', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('strategyV2.backtest.filledNotional'), dataIndex: 'notional', customRender: (value, row) => this.formatNumber(value !== undefined && value !== null ? value : Number(row.quantity || 0) * Number(row.price || 0)) },
        { title: this.$t('backtest-center.commission'), dataIndex: 'commission', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('strategyV2.backtest.orderStatusLabel'), dataIndex: 'status' },
        { title: this.$t('strategyV2.backtest.reason'), dataIndex: 'reason', width: 145 }
      ]
    },
    attributionColumns () {
      return [
        { title: this.$t('backtest-center.symbol'), dataIndex: 'symbol', width: 180 },
        { title: this.$t('strategyV2.backtest.industry'), dataIndex: 'industry' },
        { title: this.$t('strategyV2.backtest.realizedProfit'), dataIndex: 'realizedProfit', customRender: value => this.signedCell(value) },
        { title: this.$t('strategyV2.backtest.unrealizedProfit'), dataIndex: 'unrealizedProfit', customRender: value => this.signedCell(value) },
        { title: this.$t('backtest-center.commission'), dataIndex: 'commission', customRender: value => this.formatNumber(value) },
        { title: this.$t('strategyV2.backtest.netContribution'), dataIndex: 'netContribution', customRender: value => this.signedPercentCell(value) }
      ]
    },
    ledgerColumns () {
      return [
        { title: this.$t('strategyV2.backtest.time'), dataIndex: 'eventTime', width: 165, customRender: this.formatDate },
        { title: this.$t('backtest-center.symbol'), dataIndex: 'symbol', width: 165 },
        { title: this.$t('strategyV2.backtest.orderStatusLabel'), dataIndex: 'status', width: 90, customRender: value => this.$createElement('a-tag', { props: { color: this.statusColor(value) } }, this.$t(`strategyV2.backtest.orderStatus.${value}`)) },
        { title: this.$t('strategyV2.backtest.statusReason'), dataIndex: 'statusReason', width: 180, customRender: this.formatStatusReason },
        { title: this.$t('strategyV2.backtest.requestedQuantity'), dataIndex: 'requestedQuantity', customRender: value => this.formatNumber(value, 6) },
        { title: this.$t('strategyV2.backtest.filledQuantity'), dataIndex: 'filledQuantity', customRender: value => this.formatNumber(value, 6) },
        { title: this.$t('backtest-center.price'), dataIndex: 'price', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('strategyV2.backtest.filledNotional'), key: 'filledNotional', customRender: (value, row) => this.formatNumber(Number(row.filledQuantity || 0) * Number(row.price || 0)) },
        { title: this.$t('strategyV2.backtest.attempt'), dataIndex: 'attempt' }
      ]
    }
  },
  watch: {
    result: { deep: true, handler () { this.syncReviewSymbol(); this.$nextTick(this.renderChart) } },
    effectiveReviewSymbol () { this.$nextTick(this.renderReviewMarkers) },
    isDark () { this.$nextTick(this.renderChart) }
  },
  mounted () { this.syncReviewSymbol(); this.renderChart(); window.addEventListener('resize', this.resizeChart) },
  beforeDestroy () {
    window.removeEventListener('resize', this.resizeChart)
    if (this.reviewMarkerTimer) clearTimeout(this.reviewMarkerTimer)
    if (this.resizeObserver) this.resizeObserver.disconnect()
    if (this.chart) this.chart.dispose()
  },
  methods: {
    sampleReviewRows (rows, limit) {
      if (!Array.isArray(rows) || rows.length <= limit) return rows || []
      const step = (rows.length - 1) / (limit - 1)
      return Array.from({ length: limit }, (_, index) => rows[Math.round(index * step)])
    },
    renderChart () {
      const curve = this.result.equityCurve || []
      if (!this.$refs.chart || !curve.length) return
      if (!this.chart) {
        this.chart = echarts.init(this.$refs.chart)
        if (typeof ResizeObserver !== 'undefined') {
          this.resizeObserver = new ResizeObserver(this.resizeChart)
          this.resizeObserver.observe(this.$refs.chart)
        }
      }
      const firstValue = Number(curve[0].value || 0)
      const base = this.initialCapital > 0 ? this.initialCapital : (firstValue > 0 ? firstValue : 1)
      let peak = base
      const normalized = curve.map(item => [timestampMillisecondsUtc(item.time), Number(item.value) / base * 100])
      const drawdown = curve.map(item => {
        const value = Number(item.value)
        peak = Math.max(peak, value)
        const savedDrawdown = Number(item.drawdown)
        const pointDrawdown = item.drawdown !== undefined && item.drawdown !== null && Number.isFinite(savedDrawdown)
          ? savedDrawdown
          : ((value / peak - 1) * 100)
        return [timestampMillisecondsUtc(item.time), pointDrawdown]
      })
      const benchmarkRaw = this.benchmarkCurveRows
      const benchmarkBase = benchmarkRaw.length ? Number(benchmarkRaw[0].value || 1) : 1
      const benchmark = benchmarkRaw.map(item => [timestampMillisecondsUtc(item.time), Number(item.value) / benchmarkBase * 100])
      const cash = curve.map(item => [timestampMillisecondsUtc(item.time), Number(item.cash || 0)])
      const longExposure = curve.map(item => {
        const gross = Number(item.grossExposure || 0)
        const net = Number(item.netExposure || 0)
        return [timestampMillisecondsUtc(item.time), Math.max(0, (gross + net) / 2) * 100]
      })
      const shortExposure = curve.map(item => {
        const gross = Number(item.grossExposure || 0)
        const net = Number(item.netExposure || 0)
        return [timestampMillisecondsUtc(item.time), -Math.max(0, (gross - net) / 2) * 100]
      })
      const maxExposure = [...longExposure, ...shortExposure].reduce((maximum, item) => Math.max(maximum, Math.abs(item[1])), 0)
      const exposureLimit = Math.max(100, Math.ceil(maxExposure / 25) * 25)
      const text = this.isDark ? '#8c8c8c' : '#64748b'
      const grid = this.isDark ? '#242424' : '#e8edf3'
      const strategyName = this.$t('strategyV2.backtest.strategyNormalized')
      const benchmarkName = this.$t('strategyV2.backtest.benchmarkNormalized')
      const drawdownName = this.$t('strategyV2.backtest.drawdown')
      const longExposureName = this.$t('strategyV2.backtest.longExposure')
      const shortExposureName = this.$t('strategyV2.backtest.shortExposure')
      const cashName = this.$t('strategyV2.backtest.ledgerCash')
      const percentageSeries = new Set([drawdownName, longExposureName, shortExposureName])
      const formatTooltipValue = item => {
        const rawValue = Array.isArray(item.value) ? item.value[1] : item.value
        const value = Number(rawValue)
        if (!Number.isFinite(value)) return '-'
        if (percentageSeries.has(item.seriesName)) return `${value.toFixed(2)}%`
        if (item.seriesName === cashName) return this.formatNumber(value, 2)
        return value.toFixed(2)
      }
      this.chart.setOption({
        animationDuration: 260,
        color: ['#17b3a3', '#f5a623', '#ff5a64', '#22c55e', '#f43f5e', '#94a3b8'],
        legend: {
          top: 6,
          left: 8,
          right: 8,
          itemGap: 16,
          selected: { [cashName]: false },
          textStyle: { color: text }
        },
        tooltip: {
          trigger: 'axis',
          confine: true,
          axisPointer: { type: 'cross', snap: true },
          backgroundColor: this.isDark ? 'rgba(14,14,14,.98)' : '#fff',
          borderColor: grid,
          textStyle: { color: this.isDark ? '#f5f5f5' : '#1f2937' },
          formatter: values => {
            const items = Array.isArray(values) ? values : [values]
            const first = items.find(item => Array.isArray(item.value))
            const timestamp = first && first.value[0]
            const rows = items.map(item => `${item.marker || ''}${item.seriesName}<span style="float:right;margin-left:24px;font-weight:600">${formatTooltipValue(item)}</span>`)
            return [this.formatDate(timestamp), ...rows].join('<br/>')
          }
        },
        axisPointer: { link: [{ xAxisIndex: [0, 1, 2] }] },
        grid: [
          { left: 58, right: 56, top: 58, height: 184 },
          { left: 58, right: 56, top: 278, height: 74 },
          { left: 58, right: 56, top: 388, height: 76 }
        ],
        xAxis: [0, 1, 2].map((value, index) => ({ type: 'time', gridIndex: index, axisLabel: { show: index === 2, color: text }, axisLine: { lineStyle: { color: grid } }, splitLine: { show: false } })),
        yAxis: [
          { type: 'value', gridIndex: 0, scale: true, name: this.$t('strategyV2.backtest.normalizedBase'), nameTextStyle: { color: text }, axisLabel: { color: text }, splitLine: { lineStyle: { color: grid, type: 'dashed' } } },
          { type: 'value', gridIndex: 1, max: 0, name: this.$t('strategyV2.backtest.drawdown'), nameTextStyle: { color: text }, axisLabel: { color: text, formatter: '{value}%' }, splitLine: { lineStyle: { color: grid, type: 'dashed' } } },
          { type: 'value', gridIndex: 2, min: -exposureLimit, max: exposureLimit, name: this.$t('strategyV2.backtest.positionExposure'), nameTextStyle: { color: text }, axisLabel: { color: text, formatter: '{value}%' }, splitLine: { lineStyle: { color: grid, type: 'dashed' } } },
          { type: 'value', gridIndex: 2, position: 'right', name: this.$t('strategyV2.backtest.ledgerCash'), nameTextStyle: { color: text }, axisLabel: { color: text }, splitLine: { show: false } }
        ],
        dataZoom: [{ type: 'inside', xAxisIndex: [0, 1, 2], filterMode: 'none' }, { type: 'slider', xAxisIndex: [0, 1, 2], bottom: 0, height: 22, showDetail: false }],
        series: [
          { name: strategyName, type: 'line', data: normalized, xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 2.2 }, areaStyle: { opacity: 0.06 } },
          { name: benchmarkName, type: 'line', data: benchmark, xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 1.6, type: 'dashed' } },
          { name: drawdownName, type: 'line', data: drawdown, xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, areaStyle: { opacity: 0.22 }, lineStyle: { width: 1.4 } },
          { name: longExposureName, type: 'line', data: longExposure, xAxisIndex: 2, yAxisIndex: 2, showSymbol: false, step: 'end', sampling: 'lttb', lineStyle: { width: 1.2, color: '#22c55e' }, areaStyle: { opacity: 0.2, color: '#22c55e' }, markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { width: 1, color: grid }, data: [{ yAxis: 0 }] } },
          { name: shortExposureName, type: 'line', data: shortExposure, xAxisIndex: 2, yAxisIndex: 2, showSymbol: false, step: 'end', sampling: 'lttb', lineStyle: { width: 1.2, color: '#f43f5e' }, areaStyle: { opacity: 0.2, color: '#f43f5e' } },
          { name: cashName, type: 'line', data: cash, xAxisIndex: 2, yAxisIndex: 3, showSymbol: false, sampling: 'lttb', lineStyle: { width: 1.2, type: 'dotted', color: '#94a3b8' } }
        ]
      }, true)
    },
    resizeChart () { if (this.chart) this.chart.resize() },
    syncReviewSymbol () {
      if (!this.reviewSymbols.includes(this.activeReviewSymbol)) this.activeReviewSymbol = this.reviewSymbols[0] || ''
    },
    renderReviewMarkers () {
      if (this.reviewMarkerTimer) clearTimeout(this.reviewMarkerTimer)
      this.reviewMarkerTimer = setTimeout(() => {
        const component = this.$refs.reviewChart
        const chart = component && component.getChartInstance ? component.getChartInstance() : null
        const entryTime = this.reviewWindow.entryTime
        const exitTime = this.reviewWindow.exitTime
        if (!component || !chart || !Number.isFinite(entryTime) || !Number.isFinite(exitTime)) return

        component.clearBacktestOverlays()
        const candleRows = typeof chart.getDataList === 'function' ? chart.getDataList() : this.reviewRows
        buildTradeReviewMarkers({
          executions: this.reviewMarkerExecutions,
          trades: this.reviewMarkerTrades,
          symbol: this.effectiveReviewSymbol,
          candleRows
        }).forEach(marker => {
          const label = this.$t(marker.kind === 'entry'
            ? 'strategyV2.backtest.entryMarker'
            : 'strategyV2.backtest.exitMarker')
          component.addBacktestOverlay(this.reviewMarkerConfig({
            ...marker,
            text: marker.count > 1 ? `${label}×${marker.count}` : label,
            color: marker.kind === 'entry' ? '#0ecb81' : '#f6465d'
          }))
        })
        this.focusReviewRange(chart, entryTime, exitTime)
      }, 80)
    },
    reviewMarkerConfig ({ timestamp, price, text, side, color, lane = 0 }) {
      return {
        name: 'signalTag',
        points: [{ timestamp, value: price }, { timestamp, value: price }],
        extendData: { text, shortText: text, side, color, lane, source: 'backtest', labelMode: 'compact' },
        lock: true
      }
    },
    focusReviewRange (chart, entryTime, exitTime) {
      const rows = typeof chart.getDataList === 'function' ? chart.getDataList() : []
      const entryIndex = findNearestBarIndex(rows, entryTime)
      const exitIndex = findNearestBarIndex(rows, exitTime)
      if (entryIndex < 0 || exitIndex < 0) return
      const firstIndex = Math.min(entryIndex, exitIndex)
      const lastIndex = Math.max(entryIndex, exitIndex)
      const tradeBars = Math.max(1, lastIndex - firstIndex + 1)
      const visibleBars = Math.min(rows.length, Math.max(48, Math.ceil(tradeBars * 1.2)))
      const size = typeof chart.getSize === 'function' ? chart.getSize() : null
      const chartWidth = size && Number(size.width) > 0 ? Number(size.width) : 1100
      if (typeof chart.setBarSpace === 'function') chart.setBarSpace(Math.max(1, Math.min(18, (chartWidth - 80) / visibleBars)))
      const centerIndex = Math.round((firstIndex + lastIndex) / 2)
      if (typeof chart.scrollToDataIndex === 'function') {
        chart.scrollToDataIndex(centerIndex, 0)
        if (typeof chart.scrollByDistance === 'function') {
          chart.scrollByDistance(-Math.max(0, (chartWidth - 80) / 2), 0)
        }
      } else if (typeof chart.scrollToTimestamp === 'function') {
        chart.scrollToTimestamp(Math.round((entryTime + exitTime) / 2), 0)
      }
    },
    formatDate (value) {
      return formatBacktestTime(value, { locale: this.$i18n.locale, fallback: '-' })
    },
    formatDateRange (assumptions) {
      const start = assumptions && assumptions.startDate
      const end = assumptions && assumptions.endDate
      return start && end ? `${moment(start).format('YYYY-MM-DD')} ~ ${moment(end).format('YYYY-MM-DD')}` : '-'
    },
    formatLeverage (assumptions) {
      const enabled = assumptions && assumptions.leverageEnabled
      const leverage = enabled === false ? 1 : Number((assumptions && assumptions.leverage) || 1)
      return `${Number.isFinite(leverage) ? leverage : 1}×`
    },
    formatStatusReason (value) {
      if (!value) return '-'
      const key = `strategyV2.backtest.statusReasonValue.${value}`
      const translated = this.$t(key)
      return translated === key ? String(value) : translated
    },
    formatRebalanceType (value, row) {
      const type = value || 'rebalance'
      const reasons = Array.isArray(row && row.reasons) ? row.reasons : []
      const reason = type === 'protection' && reasons.length === 1 ? reasons[0] : ''
      const reasonKey = reason ? `strategyV2.backtest.recordReason.${reason}` : ''
      const typeKey = `strategyV2.backtest.recordType.${type}`
      const label = reasonKey && this.$te(reasonKey) ? this.$t(reasonKey) : this.$t(typeKey)
      const color = { protection: 'orange', liquidation: 'red', rebalance: 'blue' }[type] || 'default'
      return this.$createElement('a-tag', { props: { color } }, label)
    },
    formatPercent (value, signed = true) { const number = Number(value || 0); return `${signed && number > 0 ? '+' : ''}${number.toFixed(2)}%` },
    formatPercentagePointValue (value) { const number = Number(value || 0); return `${number > 0 ? '+' : ''}${number.toFixed(2)}` },
    formatNullablePercent (value, signed = true) { return value === null || value === undefined ? '-' : this.formatPercent(value, signed) },
    formatRate (value) { return `${(Number(value || 0) * 100).toFixed(2)}%` },
    hasMetricValue (value) { return value !== null && value !== undefined && Number.isFinite(Number(value)) },
    formatMetricNumber (value, digits = 2) {
      if (!this.hasMetricValue(value)) return '-'
      const number = Number(value)
      return `${number > 0 ? '+' : ''}${number.toFixed(digits)}`
    },
    formatMetricRate (value, signed = true) {
      if (!this.hasMetricValue(value)) return '-'
      const number = Number(value) * 100
      return `${signed && number > 0 ? '+' : ''}${number.toFixed(2)}%`
    },
    formatMetricMultiple (value) {
      if (!this.hasMetricValue(value)) return '-'
      return `${Number(value).toFixed(2)}×`
    },
    formatDurationDays (value) {
      if (!this.hasMetricValue(value)) return '-'
      return this.$t('strategyV2.backtest.riskMetrics.days', { count: Number(value).toFixed(2) })
    },
    benchmarkMetricStatus (status, value) {
      const normalizedStatus = status || (this.hasMetricValue(value) ? 'available' : 'unavailable')
      const key = `strategyV2.backtest.benchmarkMetrics.status.${normalizedStatus}`
      return this.$te(key) ? this.$t(key) : this.$t('strategyV2.backtest.benchmarkMetrics.status.unavailable')
    },
    tailRiskMetricStatus (status, value) {
      const normalizedStatus = status || (this.hasMetricValue(value) ? 'available' : 'unavailable')
      const key = `strategyV2.backtest.riskMetrics.tailStatus.${normalizedStatus}`
      return this.$te(key) ? this.$t(key) : this.$t('strategyV2.backtest.riskMetrics.tailStatus.unavailable')
    },
    thresholdRatioTone (value) {
      if (!this.hasMetricValue(value)) return ''
      return Number(value) >= 1 ? 'positive' : 'negative'
    },
    metricTone (value) {
      if (!this.hasMetricValue(value)) return ''
      return this.profitTone(value)
    },
    formatNumber (value, digits = 2) { const number = Number(value || 0); return Number.isFinite(number) ? number.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '-' },
    formatNullableNumber (value, digits = 2) { return value === null || value === undefined ? '-' : this.formatNumber(value, digits) },
    formatSignedNumber (value, digits = 2) { const number = Number(value || 0); return `${number > 0 ? '+' : ''}${this.formatNumber(number, digits)}` },
    formatWeights (value) { return formatVisibleWeights(value, this.formatRate) },
    profitTone (value) { const number = Number(value || 0); return number > 0 ? 'positive' : number < 0 ? 'negative' : 'neutral' },
    signedCell (value) { return this.$createElement('span', { class: this.profitTone(value) }, this.formatSignedNumber(value)) },
    signedPercentCell (value) { return this.$createElement('span', { class: this.profitTone(value) }, this.formatPercent(Number(value || 0) * 100)) },
    statusColor (value) { return { filled: 'green', partial: 'orange', deferred: 'blue', rejected: 'red' }[value] || 'default' }
  }
}
</script>

<style lang="less" scoped>
.portfolio-result { display: flex; min-width: 0; flex-direction: column; }
.result-trustbar { order: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; padding: 8px 10px; border: 1px solid; border-radius: 7px; }
.result-trustbar > div { display: flex; align-items: center; gap: 8px; }
.result-trustbar span { color: #64748b; font-size: 12px; }
.result-trustbar.is-success { border-color: #b7eb8f; background: #f6ffed; color: #3f8600; }
.result-trustbar.is-warning { border-color: #ffe58f; background: #fffbe6; color: #ad6800; }
.result-trustbar.is-error { border-color: #ffccc7; background: #fff2f0; color: #cf1322; }
.liquidation-alert { order: 2; }
.metrics-grid { order: 3; display: grid; grid-template-columns: repeat(6, minmax(112px, 1fr)); gap: 0; overflow: hidden; margin-top: 10px; border: 1px solid #e5e9ee; border-radius: 8px; }
.metric-card, .overview-card, .status-card { min-width: 0; padding: 11px 12px; border: 1px solid #edf0f4; border-radius: 8px; background: #f8fafc; }
.metrics-grid .metric-card { border-width: 0 1px 0 0; border-radius: 0; background: #fbfcfd; }
.metrics-grid .metric-card:last-child { border-right: 0; }
.metric-card { display: flex; flex-direction: column; gap: 3px; }
.metric-card span, .overview-card span, .status-card span { color: #7c8ca1; font-size: 11px; }
.metric-label { display: inline-flex; align-items: center; gap: 5px; }
.metric-label .anticon { cursor: help; }
.metric-card strong { color: #20324a; font-size: 20px; font-variant-numeric: tabular-nums; }
.positive { color: #16a34a !important; }
.negative { color: #dc2626 !important; }
.neutral { color: #94a3b8 !important; }
.chart-card, .trade-review-card { margin-top: 10px; padding: 12px; border: 1px solid #e5e9ee; border-radius: 8px; background: #fff; }
.benchmark-analysis-card { --analysis-accent: var(--primary-color, #1890ff); order: 4; margin-top: 8px; padding: 10px 12px; border: 1px solid color-mix(in srgb, var(--analysis-accent) 24%, #e5e9ee); border-left: 3px solid var(--analysis-accent); border-radius: 8px; background: linear-gradient(135deg, color-mix(in srgb, var(--analysis-accent) 4%, #fff) 0%, #fff 100%); }
.risk-analysis-card { --analysis-accent: var(--primary-color, #1890ff); }
.benchmark-analysis-heading { display: flex; align-items: center; gap: 10px; min-height: 30px; }
.benchmark-analysis-toggle { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 5px; outline: none; background: transparent; color: var(--analysis-accent); cursor: pointer; transition: background .15s ease; }
.benchmark-analysis-toggle:hover, .benchmark-analysis-toggle:focus-visible { background: color-mix(in srgb, var(--analysis-accent) 10%, transparent); }
.benchmark-analysis-title { flex: 0 1 430px; min-width: 170px; }
.benchmark-analysis-heading h3 { margin: 0; color: #20324a; font-size: 14px; }
.benchmark-analysis-heading p, .benchmark-analysis-note { margin: 3px 0 0; color: #7c8ca1; font-size: 11px; }
.benchmark-analysis-preview { display: grid; flex: 1; grid-template-columns: repeat(3, minmax(90px, 1fr)); align-items: center; min-width: 0; }
.benchmark-analysis-preview > span { display: flex; align-items: baseline; justify-content: flex-end; gap: 8px; min-width: 0; padding: 0 14px; border-right: 1px solid #e5edf6; }
.benchmark-analysis-preview > span:last-child { border-right: 0; }
.benchmark-analysis-preview small { overflow: hidden; color: #7c8ca1; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.benchmark-analysis-preview strong { flex: none; color: #20324a; font-size: 14px; font-variant-numeric: tabular-nums; }
.benchmark-analysis-meta { display: flex; flex: none; flex-wrap: wrap; justify-content: flex-end; gap: 4px; margin-left: auto; }
.benchmark-analysis-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-top: 9px; }
.benchmark-analysis-subheading { margin: 10px 0 0; padding-top: 9px; border-top: 1px solid #e5edf6; color: #334155; font-size: 11px; }
.benchmark-analysis-grid--advanced { margin-top: 6px; }
.benchmark-analysis-metric { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; min-width: 0; padding: 7px 9px; border: 1px solid #e5edf6; border-radius: 6px; background: rgba(255, 255, 255, .86); }
.benchmark-analysis-metric > span { overflow: hidden; color: #64748b; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.benchmark-analysis-metric .anticon { margin-left: 4px; cursor: help; }
.benchmark-analysis-metric strong { grid-row: 1 / 3; grid-column: 2; align-self: center; color: #20324a; font-size: 15px; font-variant-numeric: tabular-nums; }
.benchmark-analysis-metric small { overflow: hidden; color: #94a3b8; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.benchmark-analysis-note { margin-top: 7px; }
.benchmark-analysis-meta /deep/ .analysis-accent-tag { border-color: color-mix(in srgb, var(--analysis-accent) 34%, transparent); color: var(--analysis-accent); background: color-mix(in srgb, var(--analysis-accent) 8%, transparent); }
.chart-card { order: 5; }
.trade-review-card { order: 6; }
.assumption-strip { order: 7; }
.result-tabs { order: 8; }
.chart-heading { display: flex; justify-content: space-between; gap: 16px; }
.chart-heading h3, .trade-review-heading h3 { margin: 0; color: #26364c; font-size: 14px; }
.chart-heading span, .chart-legend-note { color: #7c8ca1; font-size: 11px; }
.trade-review-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.trade-review-heading span { color: #7c8ca1; font-size: 11px; }
.review-symbol-select { min-width: 230px; }
.portfolio-contribution-panel { margin-top: 12px; padding: 10px; border: 1px solid #edf0f4; border-radius: 8px; background: #fbfcfe; }
.contribution-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.contribution-heading strong { color: #334155; font-size: 12px; }
.contribution-heading span { color: #7c8ca1; font-size: 10px; }
.contribution-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; max-height: 250px; overflow: auto; }
.contribution-item { display: grid; grid-template-columns: minmax(155px, 1.5fr) .62fr .7fr .85fr 18px; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; border: 1px solid #e7ebf0; border-radius: 7px; outline: none; background: #fff; color: #334155; text-align: left; cursor: pointer; transition: border-color .15s ease, background .15s ease, box-shadow .15s ease; }
.contribution-item:hover { border-color: #95de64; }
.contribution-item.active { border-color: #52c41a; background: #f6ffed; box-shadow: 0 0 0 1px rgba(82,196,26,.08); }
.contribution-item > span { min-width: 0; }
.contribution-item small { display: block; color: #8b99aa; font-size: 9px; }
.contribution-item b { display: block; overflow: hidden; color: #334155; font-size: 11px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.contribution-symbol { display: flex; align-items: center; gap: 6px; overflow: hidden; font-size: 11px; font-weight: 700; white-space: nowrap; }
.contribution-symbol-text { overflow: hidden; text-overflow: ellipsis; }
.open-position-tag { flex: none; margin: 0; padding: 0 5px; border-color: rgba(250, 173, 20, .32); border-radius: 999px; background: rgba(250, 173, 20, .08); color: #ad6800; font-size: 8px; font-weight: 600; line-height: 16px; }
.contribution-item > .anticon { color: #52c41a; }
.review-facts { display: grid; grid-template-columns: 1.25fr .7fr .7fr .8fr 1.8fr; gap: 8px; margin-top: 10px; }
.review-facts div { min-width: 0; padding: 8px 10px; border-radius: 7px; background: #f8fafc; }
.review-facts span { display: block; color: #7c8ca1; font-size: 10px; }
.review-facts strong { display: block; overflow: hidden; color: #334155; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.inline-review-chart { width: 100%; height: 520px; margin-top: 10px; overflow: hidden; border-radius: 8px; }
.review-snapshot-empty { margin: 16px 0 4px; padding: 28px 12px; border: 1px dashed #d9e2ec; border-radius: 8px; background: #fafcff; }
.inline-review-chart /deep/ .chart-left { width: 100% !important; height: 100% !important; }
.inline-review-chart /deep/ .kline-chart-container { height: auto !important; min-height: 0; }
.portfolio-chart { width: 100%; height: 520px; }
.assumption-strip, .overview-grid, .status-grid { display: grid; gap: 8px; margin-top: 12px; }
.assumption-strip { grid-template-columns: repeat(8, minmax(104px, 1fr)); overflow: hidden; border: 1px solid #e5e9ee; border-radius: 8px; }
.assumption-strip div { min-width: 0; padding: 8px 9px; border-right: 1px solid #e5e9ee; background: #f8fafc; }
.assumption-strip div:last-child { border-right: 0; }
.assumption-strip span { display: block; color: #7c8ca1; font-size: 11px; }
.assumption-strip strong { display: block; color: #334155; font-size: 11px; }
.overview-grid { grid-template-columns: repeat(4, 1fr); }
.overview-card, .status-card { display: flex; justify-content: space-between; align-items: center; }
.overview-card strong, .status-card strong { font-size: 18px; }
.status-grid { grid-template-columns: repeat(4, 1fr); }
.status-card.status-partial { border-color: rgba(250, 173, 20, .45); }
.status-card.status-deferred { border-color: rgba(24, 144, 255, .45); }
.status-card.status-rejected { border-color: rgba(255, 77, 79, .45); }
.result-tabs { margin-top: 10px; }
.grid-accounting-alert { margin-bottom: 12px; }
.completed-trades-table /deep/ .ant-table-body {
  scrollbar-width: thin;
  scrollbar-color: var(--qd-scrollbar-thumb, rgba(15, 23, 42, .22)) transparent;
}
.completed-trades-table /deep/ .ant-table-body::-webkit-scrollbar { width: 6px; height: 6px; }
.completed-trades-table /deep/ .ant-table-body::-webkit-scrollbar-track {
  background: transparent;
}
.completed-trades-table /deep/ .ant-table-body::-webkit-scrollbar-thumb {
  min-width: 72px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--qd-scrollbar-thumb, rgba(15, 23, 42, .22));
  background-clip: padding-box;
}
.completed-trades-table /deep/ .ant-table-body::-webkit-scrollbar-thumb:hover {
  background: var(--qd-scrollbar-thumb-hover, var(--primary-color, #1890ff));
  background-clip: padding-box;
}
.audit-summary { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 12px; border-radius: 8px; }
.audit-summary.passed { color: #52c41a; background: rgba(82, 196, 26, .08); }
.audit-summary.failed { color: #ff4d4f; background: rgba(255, 77, 79, .08); }
.audit-summary div { display: flex; flex-direction: column; }
.audit-summary span { color: #7c8ca1; font-size: 11px; }
.portfolio-result.theme-dark .metrics-grid, .portfolio-result.theme-dark .assumption-strip { border-color: #2d2d2d; }
.portfolio-result.theme-dark .benchmark-analysis-card { border-color: color-mix(in srgb, var(--analysis-accent) 30%, #2d2d2d); border-left-color: var(--analysis-accent); background: linear-gradient(135deg, color-mix(in srgb, var(--analysis-accent) 7%, #101010) 0%, #101010 72%); }
.portfolio-result.theme-dark .benchmark-analysis-heading h3, .portfolio-result.theme-dark .benchmark-analysis-metric strong, .portfolio-result.theme-dark .benchmark-analysis-preview strong { color: #e8e8e8; }
.portfolio-result.theme-dark .benchmark-analysis-heading p, .portfolio-result.theme-dark .benchmark-analysis-note, .portfolio-result.theme-dark .benchmark-analysis-metric > span { color: #8c8c8c; }
.portfolio-result.theme-dark .benchmark-analysis-preview > span { border-right-color: #303030; }
.portfolio-result.theme-dark .benchmark-analysis-preview small { color: #8c8c8c; }
.portfolio-result.theme-dark .benchmark-analysis-metric { border-color: #303030; background: #171717; }
.portfolio-result.theme-dark .benchmark-analysis-metric small, .portfolio-result.theme-dark .benchmark-analysis-metric .anticon { color: #737373; }
.portfolio-result.theme-dark .benchmark-analysis-subheading { border-top-color: #303030; color: #bfbfbf; }
.portfolio-result.theme-dark .benchmark-analysis-meta /deep/ .ant-tag { border-color: #3a3a3a; color: #bfbfbf; background: #1f1f1f; }
.portfolio-result.theme-dark .benchmark-analysis-meta /deep/ .analysis-accent-tag { border-color: color-mix(in srgb, var(--analysis-accent) 40%, #303030); color: var(--analysis-accent); background: color-mix(in srgb, var(--analysis-accent) 10%, #151515); }
.portfolio-result.theme-dark .metric-card, .portfolio-result.theme-dark .overview-card, .portfolio-result.theme-dark .status-card, .portfolio-result.theme-dark .assumption-strip div, .portfolio-result.theme-dark .review-facts div { border-color: #2d2d2d; background: #151515; }
.portfolio-result.theme-dark .portfolio-contribution-panel { border-color: rgba(255,255,255,.1); background: #0d0d0d; }
.portfolio-result.theme-dark .contribution-heading strong, .portfolio-result.theme-dark .contribution-item b, .portfolio-result.theme-dark .contribution-symbol { color: #e5e7eb; }
.portfolio-result.theme-dark .contribution-item { border-color: rgba(255,255,255,.1); background: #151515; color: #e5e7eb; }
.portfolio-result.theme-dark .contribution-item:hover { border-color: #389e0d; }
.portfolio-result.theme-dark .contribution-item.active { border-color: #52c41a; background: rgba(82,196,26,.12); }
.portfolio-result.theme-dark .open-position-tag { border-color: rgba(250, 173, 20, .4); background: rgba(250, 173, 20, .12); color: #ffd666; }
.portfolio-result.theme-dark .metric-card strong, .portfolio-result.theme-dark .overview-card strong, .portfolio-result.theme-dark .status-card strong, .portfolio-result.theme-dark .chart-heading h3, .portfolio-result.theme-dark .trade-review-heading h3, .portfolio-result.theme-dark .review-facts strong, .portfolio-result.theme-dark .assumption-strip strong { color: #e5e7eb; }
.liquidation-alert { margin-top: 0; margin-bottom: 10px; }
.portfolio-result.theme-dark .chart-card, .portfolio-result.theme-dark .trade-review-card { border-color: #2d2d2d; background: #111111; }
.portfolio-result.theme-dark .review-snapshot-empty { border-color: rgba(255,255,255,.12); background: rgba(255,255,255,.025); }
.portfolio-result.theme-dark .result-trustbar.is-success { border-color: #315d22; background: #13200f; color: #73d13d; }
.portfolio-result.theme-dark .result-trustbar.is-warning { border-color: #664d03; background: #211b08; color: #ffc53d; }
.portfolio-result.theme-dark .result-trustbar.is-error { border-color: #6b2525; background: #251111; color: #ff7875; }
.portfolio-result.theme-dark .result-trustbar span { color: rgba(255, 255, 255, .56); }
.portfolio-result.theme-dark .result-trustbar /deep/ .trust-tag { font-weight: 500; }
.portfolio-result.theme-dark .result-trustbar /deep/ .trust-tag--success { border-color: #315d22; background: rgba(82, 196, 26, .18); color: #b7eb8f; }
.portfolio-result.theme-dark .result-trustbar /deep/ .trust-tag--error { border-color: #6b2525; background: rgba(255, 77, 79, .18); color: #ffa39e; }
.portfolio-result.theme-dark .result-trustbar /deep/ .trust-tag--info { border-color: #164c7e; background: rgba(24, 144, 255, .18); color: #91d5ff; }
.portfolio-result.theme-dark .result-trustbar /deep/ .trust-tag--warning { border-color: #664d03; background: rgba(250, 173, 20, .18); color: #ffe58f; }
@media (max-width: 1500px) { .metrics-grid { grid-template-columns: repeat(6, minmax(95px, 1fr)); } .assumption-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 900px) { .metrics-grid, .overview-grid, .status-grid, .assumption-strip { grid-template-columns: repeat(2, 1fr); } .metrics-grid .metric-card, .assumption-strip div { border-right: 0; border-bottom: 1px solid #e5e9ee; } }
@media (max-width: 1280px) { .benchmark-analysis-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .benchmark-analysis-preview > span:nth-child(3) { display: none; } .benchmark-analysis-preview { grid-template-columns: repeat(2, minmax(90px, 1fr)); } }
@media (max-width: 900px) { .benchmark-analysis-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .benchmark-analysis-preview { display: none; } .benchmark-analysis-title { flex: 1; } .benchmark-analysis-meta { justify-content: flex-end; } }
@media (max-width: 560px) { .benchmark-analysis-grid { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .review-facts { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 1150px) { .contribution-list { grid-template-columns: 1fr; } }
@media (max-width: 720px) { .result-trustbar { align-items: flex-start; flex-direction: column; }.result-trustbar > div { flex-wrap: wrap; } }
</style>
