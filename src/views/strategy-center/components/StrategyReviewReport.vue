<template>
  <section class="strategy-review-report strategy-tab-pane-inner" :class="{ 'theme-dark': isDark }" data-testid="strategy-review-v2">
    <header class="review-toolbar">
      <div><h2>{{ $t('strategyReviewV2.title') }}</h2><p class="muted">{{ $t('strategyReviewV2.subtitle') }}</p></div>
      <div class="review-actions">
        <a-select
          class="history-select"
          :value="selectedHistoryId"
          :loading="historyLoading"
          :disabled="loading"
          :placeholder="$t('strategyReviewV2.history')"
          :aria-label="$t('strategyReviewV2.history')"
          allow-clear
          @change="selectHistory">
          <a-select-option v-for="item in history" :key="item.id" :value="item.id">{{ historyLabel(item) }}</a-select-option>
        </a-select>
        <a-select v-model="lookbackDays" :disabled="loading" :aria-label="$t('strategyReviewV2.scope')" class="window-select">
          <a-select-option v-for="days in [7, 30, 90]" :key="days" :value="days">{{ $t('strategyReviewV2.window', { days }) }}</a-select-option>
        </a-select>
        <a-button type="primary" :loading="loading" @click="loadReport"><a-icon type="audit" />{{ $t('strategyReviewV2.generate') }}</a-button>
      </div>
    </header>
    <div class="ai-consent"><a-checkbox v-model="includeAi" :disabled="loading">{{ $t('strategyReviewV2.ai') }}</a-checkbox><span class="muted">{{ $t('strategyReviewV2.aiDisclosure') }}</span></div>
    <a-spin :spinning="loading">
      <a-empty v-if="!report" class="review-empty" :description="$t('strategyReviewV2.empty')" />
      <template v-else>
        <section class="review-verdict" :class="verdictTone" aria-live="polite">
          <div class="verdict-label">{{ $t('strategyReviewV2.reportConclusion') }}</div>
          <div class="verdict-content">
            <div class="verdict-heading">
              <h3>{{ $t('strategyReviewV2.' + (isV2 ? evidence.verdict : 'legacy')) }}</h3>
              <span class="ai-status" :class="'is-' + aiStatus"><i />{{ $t('strategyReviewV2.' + aiStatus) }}</span>
            </div>
            <p>{{ reportSummary }}</p>
          </div>
        </section>
        <template v-if="isV2">
          <section class="overview-metrics" :aria-label="$t('strategyReviewV2.reportMetrics')">
            <div><span>{{ $t('strategyReviewV2.net') }}</span><b :class="numberTone(facts.window_net_pnl)">{{ formatNumber(facts.window_net_pnl) }}</b></div>
            <div><span>{{ $t('strategyReviewV2.before') }}</span><b :class="numberTone(facts.before_commission_pnl)">{{ formatNumber(facts.before_commission_pnl) }}</b></div>
            <div><span>{{ $t('strategyReviewV2.fee') }}</span><b class="cost-value">{{ formatNumber(facts.commission) }}</b></div>
            <div><span>{{ $t('strategyReviewV2.closed') }}</span><b>{{ formatNumber(facts.closed_fill_count, 0) }}</b></div>
            <div><span>{{ $t('strategyReviewV2.profitFactor') }}</span><b>{{ profitFactorText }}</b></div>
          </section>
          <div class="report-grid">
            <section class="report-panel loss-breakdown">
              <div class="section-heading"><h3>{{ $t('strategyReviewV2.lossBreakdown') }}</h3><span class="muted">{{ quoteCurrency }}</span></div>
              <template v-if="costChart && costChart.rows.length">
                <div v-for="row in costChart.rows" :key="row.code" class="loss-row">
                  <div class="loss-row-label"><span>{{ row.label }}</span><b :class="numberTone(row.value)">{{ formatNumber(row.value) }}</b></div>
                  <svg viewBox="0 0 1000 18" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    <line x1="0" x2="1000" y1="17" y2="17" class="chart-baseline" />
                    <line :x1="chartX(costChart, 0)" :x2="chartX(costChart, 0)" y1="0" y2="18" class="chart-zero" />
                    <rect
                      :x="Math.min(chartX(costChart, 0), chartX(costChart, row.value))"
                      :width="Math.abs(chartX(costChart, row.value) - chartX(costChart, 0))"
                      y="3"
                      height="11"
                      rx="2"
                      :class="row.value < 0 ? 'bar-negative' : 'bar-positive'" />
                  </svg>
                </div>
                <p class="muted report-caption">{{ costInterpretation }}</p>
              </template>
              <a-alert v-else type="warning" show-icon :message="$t(facts.closed_fill_count ? 'strategyReviewV2.costUnavailable' : 'strategyReviewV2.noTrades')" />
            </section>
            <section class="report-panel diagnosis-panel">
              <div class="section-heading"><h3>{{ $t('strategyReviewV2.coreDiagnosis') }}</h3></div>
              <div class="diagnosis-table" role="table" :aria-label="$t('strategyReviewV2.coreDiagnosis')">
                <div class="diagnosis-table-head" role="row"><span>{{ $t('strategyReviewV2.diagnosisItem') }}</span><span>{{ $t('strategyReviewV2.diagnosisConclusion') }}</span><span>{{ $t('strategyReviewV2.diagnosisStatus') }}</span></div>
                <div v-for="row in diagnosticRows" :key="row.code" class="diagnosis-table-row" role="row">
                  <strong>{{ row.label }}</strong><span :class="row.tone">{{ row.conclusion }}</span><span>{{ row.status }}</span>
                </div>
              </div>
            </section>
          </div>
          <section class="optimization-report report-panel">
            <div class="section-heading"><h3>{{ $t('strategyReviewV2.optimizationDirections') }}</h3><span class="muted">{{ $t(hasAiAdvice ? 'strategyReviewV2.aiAdviceHint' : 'strategyReviewV2.optimizationHint') }}</span></div>
            <ol :class="{ 'has-ai-advice': hasAiAdvice }">
              <li v-for="(direction, index) in optimizationDirections" :key="direction.code || direction.title">
                <span>{{ index + 1 }}</span>
                <div class="direction-content">
                  <b>{{ direction.title }}</b>
                  <template v-if="direction.ai">
                    <p class="ai-interpretation">{{ direction.interpretation }}</p>
                    <dl>
                      <div><dt>{{ $t('strategyReviewV2.change') }}</dt><dd>{{ direction.proposedChange }}</dd></div>
                      <div><dt>{{ $t('strategyReviewV2.tradeoff') }}</dt><dd>{{ direction.tradeoff }}</dd></div>
                    </dl>
                  </template>
                  <p v-else>{{ direction.body }}</p>
                </div>
              </li>
            </ol>
          </section>
          <section v-if="supportCharts.length" class="support-evidence">
            <figure v-for="chart in supportCharts" :key="chart.code" class="evidence-chart">
              <figcaption><h4>{{ $t('strategyReviewV2.chart.' + chart.code) }}</h4><span class="muted">{{ quoteCurrency }}</span></figcaption>
              <div v-for="row in chart.rows" :key="row.code" class="chart-row">
                <div class="chart-label"><span>{{ row.label }} <small v-if="row.count != null">{{ $t('strategyReviewV2.chartCount', { count: row.count, known: row.known }) }}</small></span><b :class="numberTone(row.value)">{{ formatNumber(row.value) }}</b></div>
                <svg viewBox="0 0 1000 22" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                  <line x1="0" x2="1000" y1="21" y2="21" class="chart-baseline" />
                  <line :x1="chartX(chart, 0)" :x2="chartX(chart, 0)" y1="0" y2="22" class="chart-zero" />
                  <rect
                    :x="Math.min(chartX(chart, 0), chartX(chart, row.value))"
                    :width="Math.abs(chartX(chart, row.value) - chartX(chart, 0))"
                    y="4"
                    height="13"
                    rx="2"
                    :class="row.value < 0 ? 'bar-negative' : 'bar-positive'" />
                </svg>
              </div>
              <div class="chart-axis"><span>{{ formatNumber(chart.min) }}</span><span>{{ formatNumber(chart.max) }}</span></div>
              <p class="muted chart-note">{{ $t('strategyReviewV2.chartNote.' + chart.code) }}</p>
            </figure>
          </section>
          <section class="report-boundary report-panel">
            <div class="section-heading"><h3>{{ $t('strategyReviewV2.reportBoundary') }}</h3></div>
            <p>{{ $t('strategyReviewV2.reportBoundaryText') }}</p>
            <div v-if="coverageRows.length" class="coverage-summary">
              <div v-for="row in coverageRows" :key="row.code"><span>{{ row.label }}</span><b>{{ row.value }}</b></div>
            </div>
            <template v-if="coverageGaps.length">
              <strong class="gap-heading">{{ $t('strategyReviewV2.missingEvidence') }}</strong>
              <ul><li v-for="gap in coverageGaps" :key="gap">{{ $t('strategyReviewV2.gap.' + gap) }}</li></ul>
            </template>
            <p v-else class="coverage-complete">{{ $t('strategyReviewV2.coverageComplete') }}</p>
          </section>
        </template>
        <section v-else class="legacy-report">
          <a-alert type="info" show-icon :message="$t('strategyReviewV2.legacyHint')" />
          <h3>{{ $t('strategyReview.aiDiagnosis') }}</h3><ul><li v-for="(line, i) in ai.diagnosis || []" :key="i">{{ line }}</li></ul>
          <h3>{{ $t('strategyReview.aiRecommendations') }}</h3><ul><li v-for="(line, i) in ai.recommendations || []" :key="i">{{ line }}</li></ul>
        </section>
      </template>
    </a-spin>
  </section>
</template>

<script>
import { getStrategyReviewReport, getStrategyReviewReportHistory } from '@/api/strategy'

export default {
  name: 'StrategyReviewReport',
  props: { strategyId: { type: [Number, String], default: null }, isDark: { type: Boolean, default: false }, botType: { type: String, default: '' } },
  data () { return { loading: false, historyLoading: false, report: null, history: [], selectedHistoryId: undefined, lookbackDays: 30, includeAi: true, showTrades: false, requestSequence: 0, historySequence: 0 } },
  computed: {
    isV2 () { return this.report && this.report.schema_version === 2 && !!this.report.evidence },
    evidence () { return (this.report && this.report.evidence) || {} },
    facts () { return this.evidence.facts || {} },
    coverage () { return this.evidence.coverage || {} },
    coverageGaps () { return Array.isArray(this.coverage.gaps) ? this.coverage.gaps : [] },
    coverageRows () {
      const fraction = (included, total) => this.$t('strategyReviewV2.coverageFraction', { included: this.formatNumber(included, 0), total: this.formatNumber(total, 0) })
      const present = value => Number.isFinite(Number(value))
      const rows = []
      if (present(this.coverage.trade_rows_included) || present(this.coverage.trade_rows_total)) rows.push({ code: 'trades', label: this.$t('strategyReviewV2.coverageTrades'), value: fraction(this.coverage.trade_rows_included, this.coverage.trade_rows_total) })
      if (present(this.coverage.exit_reason_rows) || present(this.coverage.closed_rows_total)) {
        const base = fraction(this.coverage.exit_reason_rows, this.coverage.closed_rows_total)
        const inferred = Number(this.coverage.exit_reason_inferred_rows || 0)
        const recorded = Number(this.coverage.exit_reason_recorded_rows || 0)
        const value = inferred > 0
          ? this.$t('strategyReviewV2.coverageExitReasonDetail', { classified: base, recorded: this.formatNumber(recorded, 0), inferred: this.formatNumber(inferred, 0) })
          : base
        rows.push({ code: 'exits', label: this.$t('strategyReviewV2.coverageExitReasons'), value })
      }
      if (present(this.coverage.log_rows_included) || present(this.coverage.log_rows_total)) rows.push({ code: 'logs', label: this.$t('strategyReviewV2.coverageLogs'), value: fraction(this.coverage.log_rows_included, this.coverage.log_rows_total) })
      if (present(this.coverage.current_position_rows)) rows.push({ code: 'positions', label: this.$t('strategyReviewV2.coveragePositions'), value: this.$t('strategyReviewV2.coverageCurrentSnapshot', { count: this.formatNumber(this.coverage.current_position_rows, 0) }) })
      if (typeof this.coverage.source_available === 'boolean') rows.push({ code: 'source', label: this.$t('strategyReviewV2.coverageSource'), value: this.$t(this.coverage.source_available ? 'strategyReviewV2.coverageCurrentSource' : 'strategyReviewV2.sourceMissing') })
      return rows
    },
    issues () { return (this.evidence.checks && this.evidence.checks.length ? this.evidence.checks : this.evidence.issues) || [] },
    metrics () { return (this.report && this.report.metrics) || {} },
    ai () { return (this.report && this.report.ai) || {} },
    aiAdvice () {
      if (this.ai.status !== 'ok' || !Array.isArray(this.ai.issues)) return []
      return this.ai.issues.filter(item => item && typeof item.code === 'string' && ['interpretation', 'proposed_change', 'tradeoff'].every(key => typeof item[key] === 'string' && item[key].trim()))
    },
    aiStatus () {
      if (this.ai.status === 'ok' && typeof this.ai.summary === 'string' && this.ai.summary.trim() && this.aiAdvice.length) return 'ready'
      return this.ai.status === 'fallback' || this.ai.status === 'ok' ? 'fallback' : 'skipped'
    },
    hasAiAdvice () { return this.aiStatus === 'ready' },
    verdictTone () { return this.evidence.verdict === 'review_required' ? 'needs-review' : '' },
    quoteCurrency () {
      const symbol = String((this.report && this.report.strategy && this.report.strategy.symbol) || '').toUpperCase().split('@')[0]
      if (symbol.includes('/')) return symbol.split('/')[1].split(':')[0]
      return ['USDT', 'USDC', 'USD', 'BTC', 'ETH'].find(unit => symbol.endsWith(unit)) || ''
    },
    profitFactorText () { return this.facts.profit_factor_state === 'no_losses' ? this.$t('strategyReviewV2.noLosses') : this.formatNumber(this.facts.profit_factor) },
    reportSummary () {
      if (this.aiStatus === 'ready') return this.ai.summary.trim()
      const finite = value => value != null && Number.isFinite(Number(value))
      if (finite(this.facts.window_net_pnl) && finite(this.facts.before_commission_pnl) && finite(this.facts.closed_fill_count)) {
        const key = Number(this.facts.exit_reason_coverage_pct) === 0 ? 'reportSummaryMissingExits' : 'reportSummary'
        return this.$t('strategyReviewV2.' + key, {
          net: this.formatNumber(this.facts.window_net_pnl),
          before: this.formatNumber(this.facts.before_commission_pnl),
          closed: this.formatNumber(this.facts.closed_fill_count, 0)
        })
      }
      return this.ai.summary || this.$t('strategyReviewV2.summaryFallback')
    },
    costChart () { return this.charts.find(chart => chart.code === 'cost') || null },
    supportCharts () { return this.charts.filter(chart => chart.code !== 'cost') },
    costInterpretation () {
      const commission = Number(this.facts.commission)
      const net = Number(this.facts.window_net_pnl)
      if (Number.isFinite(commission) && Number.isFinite(net) && net !== 0) {
        return this.$t('strategyReviewV2.costShare', { share: this.formatNumber(Math.abs(commission / net) * 100, 1) })
      }
      return this.$t('strategyReviewV2.costNote')
    },
    diagnosticRows () {
      const finite = value => value != null && Number.isFinite(Number(value))
      const issue = code => this.issues.find(item => item.code === code) || {}
      const observed = item => item.status === 'observed'
      const reviewable = item => item.status === 'observed' || item.status === 'review'
      const confirmed = this.$t('strategyReviewV2.diagnosisConfirmed')
      const insufficient = this.$t('strategyReviewV2.diagnosisInsufficient')
      return [
        {
          code: 'earning',
          label: this.$t('strategyReviewV2.diagnosisEarning'),
          conclusion: finite(this.facts.before_commission_pnl) && Number(this.facts.before_commission_pnl) < 0 ? this.$t('strategyReviewV2.diagnosisWeak') : this.$t('strategyReviewV2.diagnosisUnknown'),
          status: finite(this.facts.before_commission_pnl) ? confirmed : insufficient,
          tone: finite(this.facts.before_commission_pnl) && Number(this.facts.before_commission_pnl) < 0 ? 'negative-diagnosis' : 'warning-diagnosis'
        },
        {
          code: 'cost',
          label: this.$t('strategyReviewV2.diagnosisCost'),
          conclusion: finite(this.facts.commission) && Number(this.facts.commission) > 0 ? this.$t('strategyReviewV2.diagnosisDrag') : this.$t('strategyReviewV2.diagnosisUnknown'),
          status: finite(this.facts.commission) && (this.evidence.coverage || {}).cost_usable !== false ? confirmed : insufficient,
          tone: finite(this.facts.commission) && Number(this.facts.commission) > 0 ? 'negative-diagnosis' : 'warning-diagnosis'
        },
        {
          code: 'exits',
          label: this.$t('strategyReviewV2.diagnosisExits'),
          conclusion: reviewable(issue('exits_check')) ? this.$t('strategyReviewV2.diagnosisExitClassified') : this.$t('strategyReviewV2.diagnosisUnknown'),
          status: reviewable(issue('exits_check')) ? this.$t('strategyReviewV2.checkStatus.review') : insufficient,
          tone: 'warning-diagnosis'
        },
        {
          code: 'risk',
          label: this.$t('strategyReviewV2.diagnosisRisk'),
          conclusion: observed(issue('risk_check')) ? this.$t('strategyReviewV2.diagnosisReview') : this.$t('strategyReviewV2.diagnosisUnknown'),
          status: observed(issue('risk_check')) ? confirmed : insufficient,
          tone: observed(issue('risk_check')) ? '' : 'warning-diagnosis'
        }
      ]
    },
    optimizationDirections () {
      if (this.hasAiAdvice) {
        return this.aiAdvice.slice(0, 4).map((item, index) => {
          const titleKey = 'strategyReviewV2.issue.' + item.code + '.title'
          const translatedTitle = this.$t(titleKey)
          return {
            ai: true,
            code: item.code,
            title: translatedTitle === titleKey ? this.$t('strategyReviewV2.aiFinding', { index: index + 1 }) : translatedTitle,
            interpretation: item.interpretation,
            proposedChange: item.proposed_change,
            tradeoff: item.tradeoff
          }
        })
      }
      return [1, 2, 3].map(index => ({
        ai: false,
        title: this.$t('strategyReviewV2.direction' + index + 'Title'),
        body: this.$t('strategyReviewV2.direction' + index + 'Body')
      }))
    },
    charts () {
      const finite = value => value != null && Number.isFinite(Number(value))
      const chart = (code, rows) => {
        const usable = rows.filter(row => finite(row.value)).map(row => ({ ...row, value: Number(row.value) }))
        return { code, rows: usable, min: Math.min(0, ...usable.map(row => row.value)), max: Math.max(0, ...usable.map(row => row.value)) }
      }
      const result = []
      if (finite(this.facts.before_commission_pnl) && finite(this.facts.commission) && finite(this.facts.window_net_pnl)) {
        result.push(chart('cost', [
          { code: 'before', label: this.$t('strategyReviewV2.before'), value: this.facts.before_commission_pnl },
          { code: 'fee', label: this.$t('strategyReviewV2.feeImpact'), value: -this.facts.commission },
          { code: 'net', label: this.$t('strategyReviewV2.net'), value: this.facts.window_net_pnl }
        ]))
      }
      if ((this.evidence.coverage || {}).cost_usable !== false) {
        for (const [code, groups, prefix] of [['exits', this.evidence.exit_groups, 'exit.'], ['holding', this.evidence.holding_groups, 'holdingBucket.']]) {
          const rows = (groups || []).filter(group => group.count > 0).map(group => ({ code: group.code, label: this.$t('strategyReviewV2.' + prefix + group.code), count: group.count, known: group.pnl_count, value: group.net_pnl }))
          const entry = chart(code, rows)
          if (entry.rows.length) result.push(entry)
        }
      }
      return result
    }
  },
  watch: {
    strategyId () { this.requestSequence++; this.historySequence++; this.loading = false; this.report = null; this.history = []; this.showTrades = false; this.selectedHistoryId = undefined; this.loadHistory() }
  },
  mounted () { this.loadHistory() },
  beforeDestroy () { this.requestSequence++; this.historySequence++ },
  methods: {
    async loadReport () {
      if (!this.strategyId || this.loading) return
      const seq = ++this.requestSequence
      this.loading = true
      try {
        const res = await getStrategyReviewReport(this.strategyId, { lookback_days: this.lookbackDays, include_ai: this.includeAi, language: this.$i18n.locale })
        if (res && res.data && res.data.billing && res.data.billing.remaining != null) this.$root.$emit('credits-updated', res.data.billing.remaining)
        if (seq !== this.requestSequence) return
        if (!res || res.code !== 1 || !res.data) throw new Error('review_unavailable')
        this.report = res.data
        this.showTrades = false
        this.selectedHistoryId = res.data.history_id || undefined
        this.loadHistory()
      } catch (err) {
        if (seq === this.requestSequence) this.$message.error(this.$t('strategyReview.loadFailed'))
      } finally { if (seq === this.requestSequence) this.loading = false }
    },
    async loadHistory () {
      if (!this.strategyId) return
      const seq = ++this.historySequence
      this.historyLoading = true
      try {
        const res = await getStrategyReviewReportHistory(this.strategyId, { limit: 20 })
        if (seq === this.historySequence) this.history = res && res.code === 1 && Array.isArray(res.data) ? res.data : []
      } catch (err) {
        if (seq === this.historySequence) this.history = []
      } finally { if (seq === this.historySequence) this.historyLoading = false }
    },
    async selectHistory (id) {
      this.selectedHistoryId = id
      if (!id || this.loading) return
      const seq = ++this.requestSequence
      this.loading = true
      try {
        const res = await getStrategyReviewReportHistory(this.strategyId, { report_id: id })
        if (seq !== this.requestSequence) return
        if (!res || res.code !== 1 || !res.data) throw new Error('review_unavailable')
        this.report = res.data
        this.showTrades = false
        this.lookbackDays = res.data.lookback_days || 30
      } catch (err) {
        if (seq === this.requestSequence) this.$message.error(this.$t('strategyReview.historyLoadFailed'))
      } finally { if (seq === this.requestSequence) this.loading = false }
    },
    annotation (issue) { return (Array.isArray(this.ai.issues) && this.ai.issues.find(item => item.code === issue.code)) || {} },
    issueStatusText (issue) {
      const status = ['observed', 'review', 'insufficient'].includes(issue && issue.status) ? issue.status : null
      return this.$t(status ? 'strategyReviewV2.checkStatus.' + status : 'strategyReviewV2.hypothesis')
    },
    adjustmentText (issue) {
      return this.$t(issue.finding ? 'strategyReviewV2.action.' + issue.finding : 'strategyReviewV2.experiment.' + issue.experiment + '.change')
    },
    chartX (chart, value) { return chart.max === chart.min ? 500 : (value - chart.min) / (chart.max - chart.min) * 1000 },
    factLabel (key) {
      const diagnosticKeys = ['events_per_day', 'closes_per_day', 'stop_loss_fills', 'stop_loss_net', 'take_profit_fills', 'take_profit_net', 'exit_reason_coverage_pct', 'configured_leverage', 'worst_close_loss', 'worst_close_initial_pct', 'liquidation_fills']
      if (diagnosticKeys.includes(key)) return this.$t('strategyReviewV2.fact.' + key)
      const labels = { window_net_pnl: 'net', before_commission_pnl: 'before', commission: 'fee', closed_fill_count: 'closed', profit_factor: 'profitFactor', avg_net_per_close: 'average', top_5_profit_share: 'concentration', max_consecutive_losses: 'streak', short_hold_count: 'shortCount', short_hold_net_pnl: 'shortNet', short_hold_threshold_seconds: 'shortThreshold' }
      return this.$t('strategyReviewV2.' + (labels[key] || 'notAvailable'))
    },
    factValue (key) {
      if (key === 'profit_factor') return this.profitFactorText
      if (key === 'top_5_profit_share') return this.facts[key] == null ? this.formatNumber(null) : this.formatNumber(this.facts[key] * 100) + '%'
      if (this.facts[key] != null && (key.endsWith('_pct') || key === 'configured_leverage')) return this.formatNumber(this.facts[key]) + (key === 'configured_leverage' ? '×' : '%')
      return this.formatNumber(this.facts[key], ['closed_fill_count', 'max_consecutive_losses', 'short_hold_count', 'stop_loss_fills', 'take_profit_fills', 'liquidation_fills'].includes(key) ? 0 : 2)
    },
    historyLabel (item) { return `${this.formatTime(item.created_at)} · ${this.$t('strategyReviewV2.window', { days: item.lookback_days })} · ${this.formatNumber(item.total_net_pnl)}` },
    formatNumber (value, digits = 2) { return value == null || !Number.isFinite(Number(value)) ? this.$t('strategyReviewV2.notAvailable') : Number(value).toLocaleString(this.$i18n.locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }) },
    formatTime (value) {
      if (!value) return this.$t('strategyReviewV2.notAvailable')
      const numeric = Number(value)
      const date = new Date(Number.isFinite(numeric) ? (numeric > 100000000000 ? numeric : numeric * 1000) : value)
      return Number.isNaN(date.getTime()) ? this.$t('strategyReviewV2.notAvailable') : date.toLocaleString(this.$i18n.locale)
    },
    numberTone (value) { return value == null || !Number.isFinite(Number(value)) ? '' : Number(value) < 0 ? 'negative' : Number(value) > 0 ? 'positive' : '' }
  }
}
</script>

<style scoped>
.strategy-review-report {
  --review-text: var(--sc-text, #182230);
  --review-heading: var(--sc-heading, #111827);
  --review-muted: var(--sc-muted, #667085);
  --review-line: var(--sc-border, #e1e6ec);
  --review-line-soft: var(--sc-border-soft, #ebeff3);
  --review-surface: var(--sc-surface-subtle, #f8fafb);
  --review-surface-muted: var(--sc-surface-muted, #f1f4f7);
  --review-positive: var(--sc-positive, #218653);
  --review-negative: var(--sc-negative, #d14f5a);
  --review-warning: var(--sc-warning, #b37816);
  padding: 0 0 18px;
  color: var(--review-text);
  font-size: 13px;
  line-height: 1.55;
}
h2, h3, h4, p { margin: 0; color: inherit; }
h2 { color: var(--review-heading); font-size: 16px; font-weight: 650; line-height: 1.35; }
h3 { color: var(--review-heading); font-size: 15px; font-weight: 650; line-height: 1.4; }
h4 { color: var(--review-heading); font-size: 14px; font-weight: 650; line-height: 1.45; }
.muted { color: var(--review-muted); font-size: 12px; }
.review-toolbar, .review-actions, .section-heading, .verdict-heading, .issue-heading, .plan-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.review-toolbar { margin-bottom: 8px; }
.review-toolbar > div:first-child { min-width: 0; }
.review-toolbar > div:first-child .muted { margin-top: 2px; }
.review-actions { justify-content: flex-end; flex-wrap: wrap; gap: 6px; }
.review-actions ::v-deep .ant-btn, .review-actions ::v-deep .ant-select-selection { min-height: 32px; border-radius: var(--sc-radius-sm, 6px); }
.history-select { width: 220px; }
.window-select { width: 138px; }
.ai-consent { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 12px; min-height: 36px; margin-bottom: 10px; padding: 7px 10px; border: 1px solid var(--review-line-soft); border-radius: var(--sc-radius-sm, 6px); background: var(--review-surface); }
.ai-consent ::v-deep .ant-checkbox-wrapper { color: var(--review-text); font-size: 12px; }
.theme-dark ::v-deep .ant-btn:not(.ant-btn-primary), .theme-dark ::v-deep .ant-select-selection { color: var(--review-text); background: var(--review-surface); border-color: var(--review-line); }
.theme-dark ::v-deep .ant-select-arrow, .theme-dark ::v-deep .ant-select-selection__placeholder { color: var(--review-muted); }
.review-verdict { display: grid; grid-template-columns: 104px minmax(0, 1fr); margin-top: 2px; border: 1px solid var(--review-line); border-radius: var(--sc-radius-md, 8px); background: var(--sc-surface, #fff); }
.review-verdict.needs-review { border-color: color-mix(in srgb, var(--review-warning) 36%, var(--review-line)); }
.verdict-label { display: flex; align-items: center; min-height: 74px; padding: 14px; border-left: 3px solid var(--primary-color, #52c41a); border-right: 1px solid var(--review-line-soft); border-radius: 8px 0 0 8px; color: var(--review-heading); background: var(--review-surface); font-size: 12px; font-weight: 650; line-height: 1.45; }
.needs-review .verdict-label { border-left-color: var(--review-warning); }
.verdict-content { min-width: 0; padding: 13px 16px; }
.review-verdict h3 { margin-bottom: 4px; font-size: 15px; letter-spacing: -.01em; }
.verdict-heading { align-items: flex-start; margin-bottom: 4px; }
.verdict-heading h3 { margin-bottom: 0; }
.ai-status { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 6px; padding: 2px 8px; border: 1px solid var(--review-line); border-radius: 999px; color: var(--review-muted); background: var(--review-surface); font-size: 10px; font-weight: 600; line-height: 1.5; }
.ai-status i { width: 6px; height: 6px; border-radius: 50%; background: var(--review-muted); }
.ai-status.is-ready { color: var(--review-positive); border-color: color-mix(in srgb, var(--review-positive) 35%, var(--review-line)); }
.ai-status.is-ready i { background: var(--review-positive); }
.ai-status.is-fallback { color: var(--review-warning); border-color: color-mix(in srgb, var(--review-warning) 35%, var(--review-line)); }
.ai-status.is-fallback i { background: var(--review-warning); }
.review-verdict p { max-width: 1120px; color: var(--review-text); font-size: 12px; line-height: 1.58; white-space: pre-wrap; overflow-wrap: anywhere; }
.overview-metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1px; overflow: hidden; margin-top: 10px; border: 1px solid var(--review-line); border-radius: var(--sc-radius-md, 8px); background: var(--review-line); }
.overview-metrics > div { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 10px 12px; background: var(--sc-surface, #fff); }
.overview-metrics span { overflow: hidden; color: var(--review-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.overview-metrics b { overflow: hidden; color: var(--review-heading); font-size: 16px; font-weight: 650; font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }
.overview-metrics .negative, .negative { color: var(--review-negative); }
.overview-metrics .positive, .positive { color: var(--review-positive); }
.overview-metrics .cost-value, .cost-value { color: var(--review-warning); }
.report-grid { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); gap: 10px; margin-top: 10px; }
.report-panel { min-width: 0; padding: 13px 14px; border: 1px solid var(--review-line); border-radius: var(--sc-radius-md, 8px); background: var(--sc-surface, #fff); }
.section-heading { align-items: flex-start; margin-bottom: 9px; }
.loss-row + .loss-row { margin-top: 10px; }
.loss-row-label { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; color: var(--review-text); font-size: 12px; }
.loss-row-label b { flex: 0 0 auto; font-variant-numeric: tabular-nums; }
.loss-row svg { display: block; width: 100%; height: 18px; margin-top: 4px; overflow: visible; }
.report-caption { margin-top: 10px; line-height: 1.5; }
.diagnosis-table { overflow: hidden; border: 1px solid var(--review-line-soft); border-radius: var(--sc-radius-sm, 6px); }
.diagnosis-table-head, .diagnosis-table-row { display: grid; grid-template-columns: minmax(90px, .9fr) minmax(90px, .95fr) minmax(105px, 1.15fr); gap: 10px; align-items: center; min-height: 35px; padding: 7px 10px; }
.diagnosis-table-head { color: var(--review-muted); background: var(--review-surface); font-size: 10px; font-weight: 600; }
.diagnosis-table-row { border-top: 1px solid var(--review-line-soft); font-size: 11px; line-height: 1.4; }
.diagnosis-table-row strong { color: var(--review-heading); font-weight: 600; }
.diagnosis-table-row > span:last-child { color: var(--review-muted); }
.negative-diagnosis { color: var(--review-negative); }
.warning-diagnosis { color: var(--review-warning); }
.optimization-report { margin-top: 10px; }
.optimization-report ol { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; margin: 0; padding: 0; list-style: none; }
.optimization-report li { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 9px; min-width: 0; padding: 3px 14px; }
.optimization-report li:first-child { padding-left: 0; }
.optimization-report li + li { border-left: 1px solid var(--review-line-soft); }
.optimization-report li > span { display: inline-flex; width: 22px; height: 22px; align-items: center; justify-content: center; border: 1px solid var(--review-line); border-radius: 50%; color: var(--review-muted); background: var(--review-surface); font-size: 10px; font-weight: 650; }
.direction-content { min-width: 0; }
.optimization-report li p { color: var(--review-muted); font-size: 11px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
.optimization-report li b { display: block; margin-bottom: 2px; color: var(--review-heading); font-size: 12px; font-weight: 650; }
.optimization-report .has-ai-advice { grid-template-columns: 1fr; }
.optimization-report .has-ai-advice li { padding: 10px 0; }
.optimization-report .has-ai-advice li:first-child { padding-top: 2px; }
.optimization-report .has-ai-advice li + li { border-top: 1px solid var(--review-line-soft); border-left: 0; }
.ai-interpretation { margin-bottom: 7px !important; color: var(--review-text) !important; }
.direction-content dl { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); gap: 8px; margin: 0; }
.direction-content dl > div { min-width: 0; padding: 7px 9px; border-radius: var(--sc-radius-sm, 6px); background: var(--review-surface); }
.direction-content dt { margin-bottom: 2px; color: var(--review-muted); font-size: 10px; font-weight: 600; }
.direction-content dd { margin: 0; color: var(--review-text); font-size: 11px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
.support-evidence { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 310px), 1fr)); gap: 10px; margin-top: 10px; }
.evidence-chart { min-width: 0; margin: 0; padding: 13px 14px; border: 1px solid var(--review-line); border-radius: var(--sc-radius-md, 8px); background: var(--sc-surface, #fff); }
.evidence-chart figcaption { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.chart-row { margin-top: 9px; }
.chart-label { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: 12px; }
.chart-label small { display: block; color: var(--review-muted); font-size: 10px; }
.chart-label b { white-space: nowrap; font-variant-numeric: tabular-nums; }
.chart-row svg { display: block; width: 100%; height: 18px; margin-top: 4px; overflow: visible; }
.chart-baseline { stroke: var(--review-line); stroke-width: 1; vector-effect: non-scaling-stroke; }
.chart-zero { stroke: var(--review-muted); stroke-width: 1; vector-effect: non-scaling-stroke; }
.bar-negative { fill: var(--review-negative); }
.bar-positive { fill: var(--review-positive); }
.chart-axis { display: flex; justify-content: space-between; margin-top: 5px; color: var(--review-muted); font-size: 10px; font-variant-numeric: tabular-nums; }
.chart-note { margin-top: 9px; font-size: 11px; line-height: 1.5; }
.report-boundary { margin-top: 10px; color: var(--review-muted); font-size: 11px; line-height: 1.5; }
.coverage-summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1px; overflow: hidden; margin-top: 10px; border: 1px solid var(--review-line-soft); border-radius: var(--sc-radius-sm, 6px); background: var(--review-line-soft); }
.coverage-summary > div { display: flex; min-width: 0; flex-direction: column; gap: 2px; padding: 7px 9px; background: var(--review-surface); }
.coverage-summary span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.coverage-summary b { color: var(--review-heading); font-size: 11px; font-weight: 650; }
.gap-heading { display: block; margin-top: 10px; color: var(--review-heading); font-size: 11px; }
.report-boundary ul { margin: 5px 0 0; padding-left: 18px; }
.report-boundary li + li { margin-top: 3px; }
.coverage-complete { margin-top: 9px; color: var(--review-positive); }
.legacy-report { padding: 16px 0; }
.legacy-report h3 { margin-top: 16px; }
.review-empty { padding: 40px 0; }
@media (max-width: 1100px) {
  .review-toolbar { align-items: flex-start; flex-direction: column; }
  .review-actions { justify-content: flex-start; }
  .report-grid { grid-template-columns: 1fr; }
  .optimization-report ol { grid-template-columns: 1fr; }
  .optimization-report li { padding: 8px 0; }
  .optimization-report li + li { border-top: 1px solid var(--review-line-soft); border-left: 0; }
  .direction-content dl { grid-template-columns: 1fr; }
  .coverage-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .review-actions { width: 100%; }
  .history-select { width: 100%; }
  .review-verdict { grid-template-columns: 1fr; }
  .verdict-label { min-height: auto; padding: 9px 12px; border-right: 0; border-bottom: 1px solid var(--review-line-soft); border-radius: 8px 8px 0 0; }
  .verdict-content { padding: 11px 12px; }
  .overview-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .diagnosis-table-head, .diagnosis-table-row { grid-template-columns: minmax(80px, .8fr) minmax(90px, 1fr) minmax(95px, 1.15fr); gap: 7px; padding: 7px 8px; }
  .section-heading { align-items: flex-start; }
}
</style>
