<template>
  <div class="evolution-shell" :class="{ 'theme-dark': isDarkTheme }" data-testid="strategy-evolution">
    <aside class="evolution-rail evolution-config">
      <div class="evolution-rail__title">
        <a-icon type="experiment" />
        <div><strong>{{ $t('strategyEvolution.configTitle') }}</strong><span>{{ $t('strategyEvolution.configHint') }}</span></div>
      </div>
      <div class="evolution-scroll">
        <section class="evolution-section">
          <label>{{ $t('strategyEvolution.strategy') }}</label>
          <a-select
            v-model="form.sourceId"
            show-search
            option-filter-prop="children"
            class="full-width"
            :loading="loadingSources"
            @change="selectSource">
            <a-select-option v-for="item in sources" :key="item.id" :value="item.id">{{ item.name }}</a-select-option>
          </a-select>
        </section>
        <section class="evolution-section">
          <div class="section-line"><label>{{ $t('strategyEvolution.parameterSpace') }}</label><span>{{ selectedParameterCount }}/{{ searchableParameterCount }}</span></div>
          <div v-if="parameterDefinitions.length" class="parameter-space-hint">
            <a-icon type="robot" />
            <span>{{ $t('strategyEvolution.systemSampling') }}</span>
          </div>
          <a-alert
            v-if="parameterContract && parameterContract.scope === 'riskExecution'"
            class="parameter-scope-alert"
            type="info"
            show-icon
            :message="$t('strategyEvolution.robotScopeHint')" />
          <div v-if="!parameterDefinitions.length" class="evolution-muted">{{ $t('strategyEvolution.noParameters') }}</div>
          <div v-for="item in parameterDefinitions" :key="item.name" class="parameter-row" :class="{ 'parameter-row--disabled': !searchableParameter(item) }">
            <div class="parameter-row__title">
              <a-checkbox :checked="parameterEnabled[item.name]" :disabled="!searchableParameter(item)" @change="toggleParameter(item.name, $event.target.checked)">{{ parameterLabel(item) }}</a-checkbox>
              <code>{{ item.name }}</code>
            </div>
            <div v-if="parameterEnabled[item.name]" class="parameter-domain">
              <template v-if="numericParameter(item)">
                <a-input-number
                  :value="parameterSpace[item.name].min"
                  :min="item.min"
                  :max="parameterSpace[item.name].max"
                  :step="item.step"
                  @change="updateParameterRange(item.name, 'min', $event)" />
                <i>—</i>
                <a-input-number
                  :value="parameterSpace[item.name].max"
                  :min="parameterSpace[item.name].min"
                  :max="item.max"
                  :step="item.step"
                  @change="updateParameterRange(item.name, 'max', $event)" />
                <a-button type="link" size="small" @click="resetParameterRange(item)">{{ $t('strategyEvolution.resetRecommended') }}</a-button>
                <small>{{ $t('strategyEvolution.rangeBounds', { min: formatParameterValue(item.min), max: formatParameterValue(item.max), step: formatParameterValue(item.step) }) }}</small>
              </template>
              <template v-else-if="booleanParameter(item)">
                <span>{{ $t('strategyEvolution.boolean.false') }}</span><i>/</i><span>{{ $t('strategyEvolution.boolean.true') }}</span>
              </template>
              <template v-else>
                <span>{{ parameterChoices(item).join(' / ') }}</span>
              </template>
            </div>
          </div>
        </section>
        <section class="evolution-section">
          <label>{{ $t('strategyEvolution.searchMethod') }}</label>
          <div class="method-grid">
            <button
              v-for="method in searchMethods"
              :key="method.value"
              type="button"
              class="method-card"
              :class="{ 'method-card--active': form.method === method.value }"
              @click="form.method = method.value">
              <a-icon :type="method.icon" />
              <span><strong>{{ $t(`strategyEvolution.method.${method.value}`) }}</strong><small>{{ $t(`strategyEvolution.methodHint.${method.value}`) }}</small></span>
            </button>
          </div>
          <div class="two-col">
            <a-form-item :label="$t('strategyEvolution.trials')"><a-input-number v-model="form.trials" :min="4" :max="300" /></a-form-item>
            <a-form-item :label="$t('strategyEvolution.folds')"><a-input-number v-model="form.folds" :min="4" :max="10" /></a-form-item>
          </div>
          <div class="two-col">
            <a-form-item :label="$t('strategyEvolution.trainRatio')"><a-input-number v-model="form.trainRatio" :min="0.55" :max="0.85" :step="0.05" /></a-form-item>
            <a-form-item :label="$t('strategyEvolution.blindRatio')"><a-input-number v-model="form.blindRatio" :min="0" :max="0.3" :step="0.05" /></a-form-item>
          </div>
          <div class="switch-setting"><span>{{ $t('strategyEvolution.autoPrune') }}</span><a-switch v-model="form.autoPrune" /></div>
        </section>
        <section class="evolution-section">
          <label>{{ $t('strategyEvolution.dateRange') }}</label>
          <div class="date-presets">
            <a-button v-for="preset in datePresets" :key="preset.key" size="small" :disabled="preset.disabled" @click="applyDatePreset(preset)">{{ preset.label }}</a-button>
          </div>
          <a-date-picker v-model="form.startDate" class="full-width" />
          <a-date-picker v-model="form.endDate" class="full-width" />
          <a-alert
            v-if="backtestRangePolicy"
            class="range-alert"
            :type="backtestRangeExceeded ? 'warning' : 'info'"
            show-icon
            :message="$t(backtestRangeExceeded ? 'strategyEvolution.rangeExceeded' : 'strategyEvolution.rangeLimit', { timeframe: manifestFrequency, days: backtestRangeLimitDays })" />
          <div class="two-col">
            <a-form-item :label="$t('strategyEvolution.commission')"><a-input-number v-model="form.commission" :min="0" :max="1" :step="0.0001" /></a-form-item>
            <a-form-item :label="$t('strategyEvolution.slippage')"><a-input-number v-model="form.slippage" :min="0" :max="1" :step="0.0001" /></a-form-item>
          </div>
        </section>
      </div>
      <div class="evolution-runbar">
        <div class="resource-estimate"><span>{{ $t('strategyEvolution.estimatedTrials') }}</span><strong>{{ estimatedTrials }}</strong></div>
        <div class="resource-estimate resource-estimate--runs"><span>{{ $t('strategyEvolution.estimatedRuns') }}</span><strong>{{ estimateLoading ? '…' : estimatedRuns }}</strong></div>
        <p class="estimate-hint">{{ $t(estimateIsUpperBound ? 'strategyEvolution.estimateUpperBound' : 'strategyEvolution.estimateExact') }}</p>
        <div v-if="running" class="run-actions">
          <a-button icon="stop" @click="cancelStudy">{{ $t('strategyEvolution.cancel') }}</a-button>
          <a-button type="primary" block size="large" icon="loading" disabled>{{ progressLabel }}</a-button>
        </div>
        <a-button
          v-else
          type="primary"
          block
          size="large"
          icon="thunderbolt"
          :disabled="!canRun"
          @click="runStudy">
          {{ $t('strategyEvolution.run') }}
        </a-button>
      </div>
    </aside>

    <main class="evolution-main">
      <div v-if="!result && !running && progress.phase === 'failed'" class="evolution-empty evolution-failure">
        <span class="empty-icon"><a-icon type="warning" /></span>
        <h2>{{ $t('strategyEvolution.failureTitle') }}</h2>
        <p>{{ jobFailureMessage({ progress }) }}</p>
        <div v-if="progress.failure" class="failure-facts">
          <span><b>{{ progress.failure.totalTrials || 0 }}</b>{{ $t('strategyEvolution.failure.candidates') }}</span>
          <span><b>{{ progress.failure.activeTrainingTrials || 0 }}</b>{{ $t('strategyEvolution.failure.trainingActive') }}</span>
          <span><b>{{ progress.failure.activeValidationTrials || 0 }}</b>{{ $t('strategyEvolution.failure.validationActive') }}</span>
          <span v-if="progress.failure.actualBacktestRuns !== null && progress.failure.actualBacktestRuns !== undefined"><b>{{ progress.failure.actualBacktestRuns }}</b>{{ $t('strategyEvolution.actualRuns') }}</span>
        </div>
      </div>
      <div v-else-if="!result && !running" class="evolution-empty">
        <span class="empty-icon"><a-icon type="experiment" /></span>
        <h2>{{ $t('strategyEvolution.emptyTitle') }}</h2>
        <p>{{ $t('strategyEvolution.emptyHint') }}</p>
        <div class="empty-flow">
          <span>{{ $t('strategyEvolution.flow.search') }}</span><a-icon type="arrow-right" />
          <span>{{ $t('strategyEvolution.flow.walkForward') }}</span><a-icon type="arrow-right" />
          <span>{{ $t('strategyEvolution.flow.robustness') }}</span>
        </div>
      </div>
      <div v-else-if="running" class="evolution-empty">
        <a-icon type="loading" class="running-spinner" />
        <h2>{{ $t('strategyEvolution.runningTitle') }}</h2>
        <p>{{ $t('strategyEvolution.runningHint', { trials: estimatedTrials, runs: estimatedRuns }) }}</p>
        <a-progress :percent="progressPercent" class="evolution-progress" />
      </div>
      <template v-else>
        <header class="result-header">
          <div><span class="eyebrow">{{ $t('strategyEvolution.completed') }}</span><h2>{{ result.source.name }}</h2></div>
          <a-button type="primary" icon="check" @click="$emit('apply', { sourceId: form.sourceId, params: result.bestParams })">{{ $t('strategyEvolution.applyBest') }}</a-button>
        </header>
        <div class="study-facts">
          <span v-if="result.plan && result.plan.sampleCount"><b>{{ result.plan.sampleCount }}</b>{{ $t('strategyEvolution.marketBars') }}</span>
          <span v-if="result.plan && result.plan.effectiveFolds"><b>{{ result.plan.effectiveFolds }}</b>{{ $t('strategyEvolution.effectiveFolds') }}</span>
          <span v-if="result.plan && result.plan.blindBars"><b>{{ result.plan.blindBars }}</b>{{ $t('strategyEvolution.blindBars') }}</span>
          <span><b>{{ result.summary.completedTrials }}</b>{{ $t('strategyEvolution.completedTrials') }}</span>
          <span v-if="result.summary.constraintRejectedTrials"><b>{{ result.summary.constraintRejectedTrials }}</b>{{ $t('strategyEvolution.constraintRejectedTrials') }}</span>
          <span v-if="result.summary.duplicateTrials"><b>{{ result.summary.duplicateTrials }}</b>{{ $t('strategyEvolution.duplicateTrials') }}</span>
          <span v-if="result.summary.actualBacktestRuns !== null && result.summary.actualBacktestRuns !== undefined"><b>{{ result.summary.actualBacktestRuns }}</b>{{ $t('strategyEvolution.actualRuns') }}</span>
          <span v-if="result.summary.elapsedSeconds !== null && result.summary.elapsedSeconds !== undefined"><b>{{ formatDuration(result.summary.elapsedSeconds) }}</b>{{ $t('strategyEvolution.elapsed') }}</span>
        </div>
        <div class="metric-grid">
          <article><span>{{ $t('strategyEvolution.robustnessScore') }}</span><strong>{{ result.summary.robustnessScore }}</strong><em>{{ result.summary.robustnessGrade }}</em></article>
          <article><span>{{ $t('strategyEvolution.oosReturn') }}</span><strong>{{ formatPercent(result.summary.oosReturn) }}</strong></article>
          <article><span>{{ $t('strategyEvolution.oosSharpe') }}</span><strong>{{ formatNumber(result.summary.oosSharpe) }}</strong></article>
          <article><span>{{ $t('strategyEvolution.maxDrawdown') }}</span><strong class="negative">-{{ formatPercent(result.summary.maxDrawdown) }}</strong></article>
          <article><span>{{ $t('strategyEvolution.decay') }}</span><strong>{{ formatPercent(result.summary.decayRate) }}</strong></article>
        </div>
        <div class="chart-grid chart-grid--hero">
          <section class="chart-card chart-card--wide"><div class="chart-title"><strong>{{ $t('strategyEvolution.chart.equity') }}</strong><span>{{ $t('strategyEvolution.chart.blindHint') }}</span></div><div ref="equityChart" class="chart chart--hero" /></section>
          <section class="chart-card"><div class="chart-title"><strong>{{ $t('strategyEvolution.chart.drawdown') }}</strong></div><div ref="drawdownChart" class="chart chart--hero" /></section>
        </div>
        <div class="chart-grid">
          <section class="chart-card"><div class="chart-title"><strong>{{ $t('strategyEvolution.chart.convergence') }}</strong></div><div ref="convergenceChart" class="chart" /></section>
          <section class="chart-card"><div class="chart-title"><strong>{{ $t('strategyEvolution.chart.heatmap') }}</strong></div><div ref="heatmapChart" class="chart" /></section>
          <section class="chart-card"><div class="chart-title"><strong>{{ $t('strategyEvolution.chart.monteCarlo') }}</strong><span>{{ $t('strategyEvolution.chart.monteCarloHint') }}</span></div><div ref="monteCarloChart" class="chart" /></section>
          <section class="chart-card"><div class="chart-title"><strong>{{ $t('strategyEvolution.chart.costStress') }}</strong><span>{{ $t('strategyEvolution.chart.costStressHint') }}</span></div><div ref="costChart" class="chart" /></section>
        </div>
        <section class="candidate-card">
          <div class="chart-title"><strong>{{ $t('strategyEvolution.topCandidates') }}</strong><span>{{ result.summary.completedTrials }} · {{ $t('strategyEvolution.completedTrials') }}</span></div>
          <div class="candidate-table">
            <div class="candidate-table__head"><span>#</span><span>{{ $t('strategyEvolution.score') }}</span><span>{{ $t('strategyEvolution.parameters') }}</span><span>{{ $t('strategyEvolution.validationActivity') }}</span><span>{{ $t('strategyEvolution.oosReturn') }}</span><span>{{ $t('strategyEvolution.maxDrawdown') }}</span></div>
            <div v-for="item in result.topCandidates" :key="item.number" class="candidate-table__row">
              <span>{{ item.number }}</span><strong>{{ formatNumber(item.score) }}</strong><code>{{ formatParams(item.params) }}</code><span>{{ formatNumber(item.components.validationActivity) }}</span><span>{{ formatPercent(item.components.oosReturn) }}</span><span>{{ formatPercent(item.components.maxDrawdown) }}</span>
            </div>
          </div>
        </section>
      </template>
    </main>

    <aside class="evolution-rail evolution-validation">
      <div class="evolution-rail__title history-title">
        <a-icon type="history" />
        <div><strong>{{ $t('strategyEvolution.historyTitle') }}</strong><span>{{ $t('strategyEvolution.historyHint') }}</span></div>
        <a-button type="link" icon="reload" :loading="historyLoading" @click="loadHistory" />
      </div>
      <div class="history-list">
        <div v-if="!history.length && !historyLoading" class="history-empty">{{ $t('strategyEvolution.historyEmpty') }}</div>
        <button
          v-for="job in history"
          :key="job.jobId"
          type="button"
          class="history-item"
          :class="{ 'history-item--active': job.jobId === jobId }"
          @click="openHistory(job)">
          <span class="history-item__top"><strong>{{ historySourceName(job) }}</strong><em :class="`job-status job-status--${job.status}`">{{ $t(`strategyEvolution.status.${job.status}`) }}</em></span>
          <span>{{ historyMethod(job) }} · {{ historyDateRange(job) }}</span>
          <small v-if="job.status === 'failed'" class="history-item__failure" :title="jobFailureMessage(job)">{{ jobFailureMessage(job) }}</small>
          <small>{{ formatDateTime(job.createdAt) }}</small>
        </button>
      </div>
      <div class="validation-divider"><a-icon type="safety-certificate" /><strong>{{ $t('strategyEvolution.validationTitle') }}</strong></div>
      <div class="validation-scroll">
        <template v-if="result">
          <div class="validation-score" :class="`validation-score--${String(result.summary.robustnessGrade || 'D').toLowerCase()}`">
            <span>{{ result.summary.robustnessGrade }}</span>
            <div><strong>{{ result.summary.robustnessScore }}<small>/100</small></strong><p>{{ $t('strategyEvolution.robustnessCoverage', { available: robustnessAvailableChecks, total: robustnessTotalChecks }) }}</p></div>
          </div>
          <article class="validation-card"><div><a-icon type="experiment" /><strong>{{ $t('strategyEvolution.pbo') }}</strong></div><b>{{ result.validation.pbo.available ? formatPercent(result.validation.pbo.probability * 100) : '—' }}</b><p>{{ $t(result.validation.pbo.available ? 'strategyEvolution.pboHint' : 'strategyEvolution.validationInsufficient') }}</p></article>
          <article class="validation-card"><div><a-icon type="rise" /><strong>{{ $t('strategyEvolution.dsr') }}</strong></div><b>{{ result.validation.deflatedSharpe.available ? formatPercent(result.validation.deflatedSharpe.probability * 100) : '—' }}</b><p v-if="deflatedSharpeHasDetails">{{ $t('strategyEvolution.dsrDetail', { observed: formatNumber(result.validation.deflatedSharpe.observedSharpe), benchmark: formatNumber(result.validation.deflatedSharpe.benchmarkSharpe), observations: result.validation.deflatedSharpe.observations }) }}</p><p v-else>{{ $t(result.validation.deflatedSharpe.available ? 'strategyEvolution.dsrHint' : 'strategyEvolution.validationInsufficient') }}</p></article>
          <article class="validation-card"><div><a-icon type="cluster" /><strong>{{ $t('strategyEvolution.monteCarlo') }}</strong></div><b>{{ monteCarloAvailable ? formatPercent(monteCarloMedian) : '—' }}</b><p v-if="monteCarloHasDetails">{{ $t('strategyEvolution.monteCarloDetail', { loss: formatPercent(result.validation.monteCarlo.lossProbability * 100), paths: result.validation.monteCarlo.paths, observations: result.validation.monteCarlo.observations }) }}</p><p v-else>{{ $t(monteCarloAvailable ? 'strategyEvolution.monteCarloHint' : 'strategyEvolution.validationInsufficient') }}</p></article>
          <article class="validation-card"><div><a-icon type="dollar" /><strong>{{ $t('strategyEvolution.costStress') }}</strong></div><b>{{ worstCostStress ? formatPercent(worstCostStress.return) : '—' }}</b><p v-if="worstCostStress">{{ $t('strategyEvolution.costStressDetail', { multiplier: worstCostStress.multiplier, delta: formatPercent(worstCostStressDelta) }) }}</p><p v-else>{{ $t('strategyEvolution.validationInsufficient') }}</p></article>
          <section class="best-params"><strong>{{ $t('strategyEvolution.bestParams') }}</strong><div v-for="(value, key) in result.bestParams" :key="key"><code>{{ key }}</code><b>{{ value }}</b></div></section>
        </template>
        <div v-else class="validation-placeholder"><a-icon type="safety-certificate" /><p>{{ $t('strategyEvolution.validationEmpty') }}</p></div>
      </div>
    </aside>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import moment from 'moment'
import { mapState } from 'vuex'
import { cancelStrategyEvolutionJob, compileScriptSource, estimateStrategyEvolution, getScriptSourceList, getScriptSourceDetail, getStrategyEvolutionJob, getStrategyEvolutionJobs, getStrategyEvolutionParameterSpace, runStrategyEvolution } from '@/api/strategy'
import { strategyParameterLabel } from '@/utils/strategyParameterPresentation'

export default {
  name: 'StrategyEvolution',
  data () {
    const end = moment().subtract(1, 'day').startOf('day')
    return {
      sources: [],
      loadingSources: false,
      loadingSource: false,
      source: null,
      manifest: null,
      backtestRangePolicy: null,
      parameterDefinitions: [],
      parameterContract: null,
      parameterEnabled: {},
      parameterSpace: {},
      running: false,
      jobId: '',
      progress: {},
      pollTimer: null,
      result: null,
      charts: [],
      estimate: null,
      estimateLoading: false,
      estimateTimer: null,
      history: [],
      historyLoading: false,
      historyRequestId: 0,
      searchMethods: [
        { value: 'random', icon: 'random' },
        { value: 'grid', icon: 'appstore' },
        { value: 'tpe', icon: 'deployment-unit' }
      ],
      form: { sourceId: null, method: 'tpe', trials: 12, folds: 4, trainRatio: 0.7, blindRatio: 0.15, autoPrune: true, startDate: end.clone().subtract(2, 'years'), endDate: end, commission: 0.0005, slippage: 0.0005 }
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme,
      primaryColor: state => state.app.color || '#52C41A'
    }),
    isDarkTheme () { return this.navTheme === 'dark' || this.navTheme === 'realdark' },
    selectedParameterCount () { return Object.values(this.parameterEnabled).filter(Boolean).length },
    searchableParameterCount () { return this.parameterDefinitions.filter(this.searchableParameter).length },
    estimatedRuns () { return (this.estimate && this.estimate.backtestRuns) || (this.form.trials + 5) },
    estimatedTrials () { return (this.estimate && this.estimate.trials) || this.form.trials },
    estimateIsUpperBound () { return !this.estimate || Boolean(this.estimate.isUpperBound) },
    progressPercent () { return this.progress.total ? Math.round((Number(this.progress.completed || 0) / Number(this.progress.total)) * 100) : 0 },
    progressLabel () { return this.progress.total ? `${this.progress.completed || 0}/${this.progress.total}` : this.$t('strategyEvolution.running') },
    manifestFrequency () {
      const subscriptions = (this.manifest && this.manifest.subscriptions) || []
      return (this.manifest && this.manifest.primaryFrequency) || (subscriptions[0] && subscriptions[0].frequency) || '-'
    },
    backtestRangeLimitDays () {
      if (!this.backtestRangePolicy || this.backtestRangePolicy.maxSelectedDays === null || this.backtestRangePolicy.maxSelectedDays === undefined) return null
      const value = Number(this.backtestRangePolicy.maxSelectedDays)
      return Number.isFinite(value) ? Math.max(0, value) : null
    },
    selectedRangeDays () {
      if (!this.form.startDate || !this.form.endDate) return null
      return this.form.endDate.clone().startOf('day').diff(this.form.startDate.clone().startOf('day'), 'days')
    },
    backtestRangeExceeded () {
      if (this.selectedRangeDays === null || this.selectedRangeDays < 0) return true
      return this.backtestRangeLimitDays !== null && this.selectedRangeDays > this.backtestRangeLimitDays
    },
    parameterRangesValid () {
      return this.parameterDefinitions.every(item => {
        if (!this.parameterEnabled[item.name] || !this.numericParameter(item)) return true
        const range = this.parameterSpace[item.name] || {}
        const minimum = Number(range.min); const maximum = Number(range.max)
        return Number.isFinite(minimum) && Number.isFinite(maximum) && minimum <= maximum && minimum >= Number(item.min) && maximum <= Number(item.max)
      })
    },
    robustnessAvailableChecks () { return Number((((this.result || {}).summary || {}).availableChecks) || this.inferAvailableChecks()) },
    robustnessTotalChecks () { return Number((((this.result || {}).summary || {}).totalChecks) || 4) },
    deflatedSharpeHasDetails () {
      const row = (((this.result || {}).validation || {}).deflatedSharpe || {})
      return Boolean(row.available && row.observedSharpe !== undefined && row.observations !== undefined)
    },
    monteCarloAvailable () { return Boolean(this.result && this.result.validation && this.result.validation.monteCarlo && this.result.validation.monteCarlo.available) },
    monteCarloHasDetails () {
      const row = (((this.result || {}).validation || {}).monteCarlo || {})
      return Boolean(row.available && row.observations !== undefined)
    },
    monteCarloMedian () { return Number(((((this.result || {}).validation || {}).monteCarlo || {}).percentiles || {})['50'] || 0) },
    worstCostStress () {
      const rows = (((this.result || {}).validation || {}).costStress || [])
      return rows.length ? rows[rows.length - 1] : null
    },
    worstCostStressDelta () {
      const rows = (((this.result || {}).validation || {}).costStress || [])
      if (!rows.length) return 0
      const worst = rows[rows.length - 1]
      return worst.returnDelta !== undefined ? Number(worst.returnDelta) : Number(worst.return || 0) - Number(rows[0].return || 0)
    },
    datePresets () {
      const end = (this.form.endDate || moment().subtract(1, 'day')).clone().startOf('day')
      const rows = [
        { key: '1m', startDate: end.clone().subtract(1, 'month') },
        { key: '3m', startDate: end.clone().subtract(3, 'months') },
        { key: '6m', startDate: end.clone().subtract(6, 'months') }
      ]
      const presets = rows.map(row => ({ ...row, label: this.$t(`strategyEvolution.quickRange.${row.key}`), disabled: this.backtestRangeLimitDays !== null && end.diff(row.startDate, 'days') > this.backtestRangeLimitDays }))
      if (this.backtestRangeLimitDays !== null) presets.push({ key: 'max', startDate: end.clone().subtract(this.backtestRangeLimitDays, 'days'), label: this.$t('strategyEvolution.quickRange.max', { days: this.backtestRangeLimitDays }), disabled: false })
      return presets
    },
    canRun () { return Boolean(!this.loadingSource && this.form.sourceId && this.selectedParameterCount && this.parameterRangesValid && this.form.startDate && this.form.endDate && !this.backtestRangeExceeded) }
  },
  watch: {
    form: { handler: 'scheduleEstimate', deep: true },
    parameterSpace: { handler: 'scheduleEstimate', deep: true },
    parameterEnabled: { handler: 'scheduleEstimate', deep: true },
    isDarkTheme () { this.refreshChartsForTheme() },
    primaryColor () { this.refreshChartsForTheme() }
  },
  mounted () { this.initializeWorkspace(); window.addEventListener('resize', this.resizeCharts) },
  beforeDestroy () { window.removeEventListener('resize', this.resizeCharts); this.disposeCharts(); this.stopPolling(); if (this.estimateTimer) window.clearTimeout(this.estimateTimer) },
  methods: {
    async initializeWorkspace () {
      const allHistory = await this.fetchHistory()
      const active = allHistory.find(job => ['queued', 'running'].includes(job.status))
      if (active && active.request) this.form.sourceId = active.request.sourceId
      await this.loadSources()
      this.scheduleEstimate()
    },
    async loadSources () {
      this.loadingSources = true
      try {
        const response = await getScriptSourceList()
        this.sources = (response.data && response.data.items) || []
        if (!this.form.sourceId && this.sources.length) this.form.sourceId = this.sources[0].id
        if (this.form.sourceId) await this.selectSource(this.form.sourceId)
      } finally { this.loadingSources = false }
    },
    async selectSource (sourceId) {
      this.stopPolling()
      this.disposeCharts()
      this.running = false
      this.jobId = ''
      this.progress = {}
      this.result = null
      await this.loadSource(sourceId)
      await this.loadHistory(sourceId)
      const active = this.history.find(job => ['queued', 'running'].includes(job.status))
      if (!active) return
      this.applyHistoryRequest(active.request)
      this.jobId = active.jobId
      this.progress = active.progress || {}
      this.running = true
      await this.pollStudy()
    },
    async loadSource (sourceId) {
      this.loadingSource = true
      try {
        const [response, compiled, parameterSpaceResponse] = await Promise.all([
          getScriptSourceDetail(sourceId),
          compileScriptSource({ sourceId }),
          getStrategyEvolutionParameterSpace(sourceId)
        ])
        this.source = response.data || null
        this.manifest = compiled.data && compiled.data.manifest
        this.backtestRangePolicy = compiled.data && compiled.data.backtestRangePolicy
        this.parameterContract = parameterSpaceResponse.data || null
        this.parameterDefinitions = (this.parameterContract && this.parameterContract.parameters) || []
        const enabled = {}; const space = {}
        this.parameterDefinitions.forEach(item => {
          enabled[item.name] = this.searchableParameter(item) && item.defaultSelected !== false
          space[item.name] = {
            min: item.recommendedMin !== undefined ? item.recommendedMin : item.min,
            max: item.recommendedMax !== undefined ? item.recommendedMax : item.max
          }
        })
        this.parameterEnabled = enabled; this.parameterSpace = space; this.result = null
        this.applyBacktestRangePolicy()
      } catch (error) {
        this.manifest = null
        this.backtestRangePolicy = null
        this.parameterContract = null
        this.parameterDefinitions = []
        this.parameterEnabled = {}
        this.parameterSpace = {}
        this.$message.error((error && error.backendMessage) || this.$t('strategyEvolution.sourceLoadFailed'))
      } finally {
        this.loadingSource = false
      }
    },
    applyBacktestRangePolicy () {
      if (this.backtestRangeLimitDays === null || !this.form.endDate) return
      const endDate = this.form.endDate.clone().startOf('day')
      if (!this.form.startDate || this.selectedRangeDays > this.backtestRangeLimitDays || this.selectedRangeDays < 0) {
        this.form.startDate = endDate.clone().subtract(this.backtestRangeLimitDays, 'days')
      }
    },
    applyDatePreset (preset) {
      if (!preset || preset.disabled) return
      this.form.startDate = preset.startDate.clone()
    },
    numericParameter (item) { return ['int', 'integer', 'float', 'number', 'percent'].includes(item.type) },
    booleanParameter (item) { return ['bool', 'boolean'].includes(item.type) },
    parameterChoices (item) {
      return (item.choices || item.options || item.values || []).map(value => (value && typeof value === 'object' ? value.value : value))
    },
    searchableParameter (item) {
      if (item.optimizable === false) return false
      const choices = this.parameterChoices(item)
      const boundedNumeric = this.numericParameter(item) && item.min !== undefined && item.min !== null && item.max !== undefined && item.max !== null
      return boundedNumeric || ['bool', 'boolean'].includes(item.type) || Boolean(choices.length)
    },
    parameterLabel (item) { return strategyParameterLabel(item, key => this.$t(key)) },
    toggleParameter (name, enabled) { this.parameterEnabled = { ...this.parameterEnabled, [name]: enabled } },
    updateParameterRange (name, boundary, value) {
      this.parameterSpace = { ...this.parameterSpace, [name]: { ...(this.parameterSpace[name] || {}), [boundary]: value } }
    },
    resetParameterRange (item) {
      this.parameterSpace = { ...this.parameterSpace, [item.name]: { min: item.recommendedMin !== undefined ? item.recommendedMin : item.min, max: item.recommendedMax !== undefined ? item.recommendedMax : item.max } }
    },
    inferAvailableChecks () {
      const validation = (this.result && this.result.validation) || {}
      return ['pbo', 'deflatedSharpe', 'monteCarlo'].filter(key => validation[key] && validation[key].available).length + ((validation.costStress || []).some(row => Number(row.activity || 0) > 0) ? 1 : 0)
    },
    formatParameterValue (value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '—'
      return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(8)))
    },
    parameterPayload () { return this.parameterDefinitions.filter(item => this.parameterEnabled[item.name]).map(item => ({ ...item, ...(this.parameterSpace[item.name] || {}) })) },
    estimatePayload () {
      return { parameterSpace: this.parameterPayload(), config: { method: this.form.method, trials: this.form.trials, folds: this.form.folds, trainRatio: this.form.trainRatio, blindRatio: this.form.blindRatio, autoPrune: this.form.autoPrune, monteCarloPaths: 1000 } }
    },
    scheduleEstimate () {
      if (this.estimateTimer) window.clearTimeout(this.estimateTimer)
      this.estimateTimer = window.setTimeout(this.refreshEstimate, 250)
    },
    async refreshEstimate () {
      this.estimateTimer = null
      if (!this.selectedParameterCount) { this.estimate = null; return }
      this.estimateLoading = true
      try {
        const response = await estimateStrategyEvolution(this.estimatePayload())
        this.estimate = response.data || null
      } catch (error) {
        this.estimate = null
      } finally {
        this.estimateLoading = false
      }
    },
    async fetchHistory (sourceId) {
      const params = { limit: 20 }
      if (sourceId !== undefined && sourceId !== null && sourceId !== '') params.sourceId = sourceId
      const response = await getStrategyEvolutionJobs(params)
      return (response.data && response.data.items) || []
    },
    async loadHistory (sourceId = this.form.sourceId) {
      const requestId = ++this.historyRequestId
      this.historyLoading = true
      try {
        const items = await this.fetchHistory(sourceId)
        if (requestId === this.historyRequestId && Number(sourceId) === Number(this.form.sourceId)) this.history = items
      } catch (error) {
        if (requestId === this.historyRequestId) this.history = []
      } finally {
        if (requestId === this.historyRequestId) this.historyLoading = false
      }
    },
    applyHistoryRequest (request = {}) {
      const config = request.config || {}
      if (request.sourceId) this.form.sourceId = request.sourceId
      if (request.startDate) this.form.startDate = moment(request.startDate)
      if (request.endDate) this.form.endDate = moment(request.endDate)
      ;['method', 'trials', 'folds', 'trainRatio', 'blindRatio', 'autoPrune'].forEach(key => {
        if (config[key] !== undefined) this.form[key] = config[key]
      })
      if (request.commission !== undefined) this.form.commission = request.commission
      if (request.slippage !== undefined) this.form.slippage = request.slippage
      const requested = new Map((request.parameterSpace || []).map(item => [item.name, item]))
      if (requested.size) {
        const enabled = {}; const space = { ...this.parameterSpace }
        this.parameterDefinitions.forEach(item => {
          const saved = requested.get(item.name)
          enabled[item.name] = Boolean(saved)
          if (saved) space[item.name] = { min: saved.min, max: saved.max }
        })
        this.parameterEnabled = enabled
        this.parameterSpace = space
      }
    },
    async openHistory (job) {
      this.stopPolling()
      this.disposeCharts()
      let selected = job
      try {
        const response = await getStrategyEvolutionJob(job.jobId)
        selected = response.data || job
      } catch (error) {
        this.$message.error((error && error.backendMessage) || this.$t('strategyEvolution.jobNotFound'))
        return
      }
      this.jobId = selected.jobId
      if (selected.request && selected.request.sourceId && selected.request.sourceId !== this.form.sourceId) {
        this.form.sourceId = selected.request.sourceId
        await this.loadSource(selected.request.sourceId)
      }
      this.applyHistoryRequest(selected.request)
      this.progress = selected.progress || {}
      this.running = ['queued', 'running'].includes(selected.status)
      this.result = selected.status === 'succeeded' ? selected.result : null
      if (this.running) await this.pollStudy()
      if (this.result) { await this.$nextTick(); this.renderCharts() }
    },
    historySourceName (job) {
      if (job.result && job.result.source && job.result.source.name) return job.result.source.name
      const sourceId = job.request && job.request.sourceId
      const source = this.sources.find(item => Number(item.id) === Number(sourceId))
      return (source && source.name) || this.$t('strategyEvolution.historyStudy')
    },
    historyMethod (job) { return this.$t(`strategyEvolution.method.${((job.request || {}).config || {}).method || 'tpe'}`) },
    historyDateRange (job) { const request = job.request || {}; return request.startDate && request.endDate ? `${request.startDate} – ${request.endDate}` : '—' },
    formatDateTime (value) { return value ? moment(value).format('YYYY-MM-DD HH:mm') : '—' },
    async runStudy () {
      this.running = true; this.result = null; this.progress = {}; this.disposeCharts()
      try {
        const response = await runStrategyEvolution({ sourceId: this.form.sourceId, startDate: this.form.startDate.format('YYYY-MM-DD'), endDate: this.form.endDate.format('YYYY-MM-DD'), initialCapital: 10000, commission: this.form.commission, slippage: this.form.slippage, parameterSpace: this.parameterPayload(), config: { method: this.form.method, trials: this.form.trials, folds: this.form.folds, trainRatio: this.form.trainRatio, blindRatio: this.form.blindRatio, autoPrune: this.form.autoPrune, monteCarloPaths: 1000 } })
        this.jobId = String((response.data && response.data.jobId) || '')
        if (!this.jobId) throw new Error('strategyEvolution.jobNotCreated')
        await this.loadHistory()
        await this.pollStudy()
      } catch (error) {
        this.$message.error((error && error.backendMessage) || this.$t('strategyEvolution.runFailed'))
        this.running = false
      }
    },
    async pollStudy () {
      if (!this.running || !this.jobId) return
      try {
        const response = await getStrategyEvolutionJob(this.jobId)
        const job = response.data || {}
        this.progress = job.progress || {}
        if (job.status === 'succeeded') {
          this.result = job.result
          this.running = false
          this.stopPolling()
          await this.loadHistory()
          await this.$nextTick()
          this.renderCharts()
          return
        }
        if (job.status === 'failed' || job.status === 'cancelled') {
          this.running = false
          this.stopPolling()
          await this.loadHistory()
          if (job.status === 'failed') this.$message.error(this.jobFailureMessage(job))
          return
        }
        this.pollTimer = window.setTimeout(this.pollStudy, 1500)
      } catch (error) {
        this.pollTimer = window.setTimeout(this.pollStudy, 2500)
      }
    },
    async cancelStudy () {
      if (!this.jobId) return
      await cancelStrategyEvolutionJob(this.jobId)
      this.running = false
      this.stopPolling()
      await this.loadHistory()
      this.$message.info(this.$t('strategyEvolution.cancelled'))
    },
    stopPolling () { if (this.pollTimer) window.clearTimeout(this.pollTimer); this.pollTimer = null },
    jobFailureMessage (job) {
      const failure = job && job.progress && job.progress.failure
      if (failure && failure.messageKey && this.$te(failure.messageKey)) {
        const counts = failure.reasonCounts || {}
        return this.$t(failure.messageKey, {
          count: counts[failure.dominantReason] || 0,
          total: failure.totalTrials || 0,
          training: failure.activeTrainingTrials || 0,
          validation: failure.activeValidationTrials || 0,
          runs: failure.actualBacktestRuns || 0
        })
      }
      const raw = String((job && job.error) || (job && job.progress && job.progress.error) || '').split(/\r?\n/, 1)[0].trim()
      if (!raw) return this.$t('strategyEvolution.runFailed')
      return this.$te(raw) ? this.$t(raw) : raw
    },
    renderCharts () {
      const palette = this.chartPalette()
      const { text, grid, accent, accentArea, cyan, red, redArea, tooltipBackground, tooltipText } = palette
      const tooltip = { trigger: 'axis', backgroundColor: tooltipBackground, borderColor: grid, textStyle: { color: tooltipText }, valueFormatter: value => this.chartNumber(value) }
      const curve = this.result.equityCurve || []
      this.makeChart(this.$refs.equityChart, { tooltip, grid: { left: 62, right: 18, top: 30, bottom: 42 }, xAxis: { type: 'category', data: curve.map(row => row.time), axisLabel: { color: text, hideOverlap: true }, axisLine: { lineStyle: { color: grid } } }, yAxis: { type: 'value', scale: true, axisLabel: { color: text, formatter: value => this.chartNumber(value) }, splitLine: { lineStyle: { color: grid } } }, dataZoom: [{ type: 'inside' }], series: [{ type: 'line', data: curve.map(row => row.value), symbol: 'none', lineStyle: { color: accent, width: 2 }, areaStyle: { color: accentArea } }] })
      this.makeChart(this.$refs.drawdownChart, { tooltip, grid: { left: 50, right: 15, top: 22, bottom: 35 }, xAxis: { type: 'category', data: curve.map(row => row.time), axisLabel: { color: text, hideOverlap: true }, axisLine: { lineStyle: { color: grid } } }, yAxis: { type: 'value', axisLabel: { color: text, formatter: '{value}%' }, splitLine: { lineStyle: { color: grid } } }, series: [{ type: 'line', data: curve.map(row => row.drawdown || 0), symbol: 'none', lineStyle: { color: red }, areaStyle: { color: redArea } }] })
      const convergence = this.result.convergence || []
      this.makeChart(this.$refs.convergenceChart, { tooltip, grid: { left: 45, right: 15, top: 20, bottom: 35 }, xAxis: { type: 'category', data: convergence.map(row => row.trial), axisLabel: { color: text } }, yAxis: { type: 'value', axisLabel: { color: text }, splitLine: { lineStyle: { color: grid } } }, series: [{ type: 'scatter', data: convergence.map(row => row.score), itemStyle: { color: cyan } }, { type: 'line', data: convergence.map(row => row.best), symbol: 'none', lineStyle: { color: accent } }] })
      const heat = this.result.heatmap || { points: [] }
      this.makeChart(this.$refs.heatmapChart, { tooltip, grid: { left: 55, right: 20, top: 20, bottom: 45 }, xAxis: { type: 'value', name: heat.xParameter, nameTextStyle: { color: text }, axisLabel: { color: text }, splitLine: { lineStyle: { color: grid } } }, yAxis: { type: 'value', name: heat.yParameter, nameTextStyle: { color: text }, axisLabel: { color: text }, splitLine: { lineStyle: { color: grid } } }, visualMap: { min: 0, max: 100, show: false, inRange: { color: [red, '#c9951a', accent] } }, series: [{ type: 'scatter', symbolSize: 16, data: heat.points }] })
      const histogram = (((this.result.validation || {}).monteCarlo || {}).terminalReturns) || []
      this.makeChart(this.$refs.monteCarloChart, { title: histogram.length ? undefined : this.emptyChartTitle(text), tooltip, grid: { left: 54, right: 18, top: 30, bottom: 42 }, xAxis: { type: 'category', data: histogram.map(row => row.value), axisLabel: { color: text, interval: 4, formatter: value => this.chartNumber(value) }, axisLine: { lineStyle: { color: grid } } }, yAxis: { type: 'value', axisLabel: { color: text }, splitLine: { lineStyle: { color: grid } } }, series: [{ type: 'bar', data: histogram.map(row => row.count), itemStyle: { color: cyan } }] })
      const costs = ((this.result.validation || {}).costStress) || []
      this.makeChart(this.$refs.costChart, { title: costs.some(row => Number(row.activity || 0) > 0) ? undefined : this.emptyChartTitle(text), tooltip, grid: { left: 54, right: 18, top: 30, bottom: 42 }, xAxis: { type: 'category', data: costs.map(row => `${row.multiplier}×`), axisLabel: { color: text }, axisLine: { lineStyle: { color: grid } } }, yAxis: { type: 'value', axisLabel: { color: text, formatter: value => `${this.chartNumber(value)}%` }, splitLine: { lineStyle: { color: grid } } }, series: [{ type: 'bar', data: costs.map(row => row.return), itemStyle: { color: params => params.value >= 0 ? accent : red } }] })
    },
    chartPalette () {
      const styles = this.$el && window.getComputedStyle(this.$el)
      const read = (name, fallback) => (styles && styles.getPropertyValue(name).trim()) || fallback
      return {
        text: read('--evo-chart-text', this.isDarkTheme ? '#8b949e' : '#667085'),
        grid: read('--evo-chart-grid', this.isDarkTheme ? '#262b2d' : '#e5e7eb'),
        accent: read('--evo-accent', '#52c41a'),
        accentArea: read('--evo-chart-accent-area', this.isDarkTheme ? 'rgba(82,196,26,.1)' : 'rgba(82,196,26,.08)'),
        cyan: read('--evo-chart-secondary', '#20c8c8'),
        red: read('--evo-danger', '#ff5a5f'),
        redArea: read('--evo-chart-danger-area', this.isDarkTheme ? 'rgba(255,90,95,.14)' : 'rgba(255,90,95,.1)'),
        tooltipBackground: read('--evo-tooltip-bg', this.isDarkTheme ? '#15191a' : '#ffffff'),
        tooltipText: read('--evo-tooltip-text', this.isDarkTheme ? '#f4f7f5' : '#1f2937')
      }
    },
    refreshChartsForTheme () {
      this.$nextTick(() => {
        if (!this.result) return
        this.disposeCharts()
        this.renderCharts()
      })
    },
    makeChart (element, option) { if (!element) return; const chart = echarts.init(element); chart.setOption(option); this.charts.push(chart) },
    disposeCharts () { this.charts.forEach(chart => chart.dispose()); this.charts = [] },
    resizeCharts () { this.charts.forEach(chart => chart.resize()) },
    formatPercent (value) { return `${Number(value || 0).toFixed(2)}%` },
    formatNumber (value) { return Number(value || 0).toFixed(2) },
    formatDuration (value) {
      const seconds = Math.max(0, Math.round(Number(value) || 0))
      const minutes = Math.floor(seconds / 60)
      return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
    },
    chartNumber (value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '—'
      const magnitude = Math.abs(number)
      const decimals = magnitude >= 1000 ? 0 : magnitude >= 10 ? 2 : 4
      return decimals ? number.toFixed(decimals).replace(/\.?0+$/, '') : number.toFixed(0)
    },
    emptyChartTitle (color) { return { text: this.$t('strategyEvolution.validationInsufficient'), left: 'center', top: 'middle', textStyle: { color, fontSize: 11, fontWeight: 'normal' } } },
    formatParams (params) { return Object.entries(params || {}).map(([key, value]) => `${key}=${value}`).join(' · ') }
  }
}
</script>

<style lang="less" scoped>
.evolution-shell {
  --evo-accent: var(--primary-color, #52c41a);
  --evo-page: #f4f6f8;
  --evo-panel: #ffffff;
  --evo-surface: #f8fafb;
  --evo-surface-strong: #f1f4f6;
  --evo-input: #ffffff;
  --evo-border: #dfe4e8;
  --evo-border-soft: #edf0f2;
  --evo-heading: #182026;
  --evo-text: #344049;
  --evo-muted: #66727b;
  --evo-faint: #8b959d;
  --evo-disabled: #a9b1b7;
  --evo-danger: #e5484d;
  --evo-warning: #c58b14;
  --evo-shadow: rgba(35, 49, 60, .09);
  --evo-chart-text: #667085;
  --evo-chart-grid: #e5e9ed;
  --evo-chart-secondary: #20aeb5;
  --evo-chart-accent-area: color-mix(in srgb, var(--evo-accent) 12%, transparent);
  --evo-chart-danger-area: rgba(229, 72, 77, .10);
  --evo-tooltip-bg: #ffffff;
  --evo-tooltip-text: #1f2937;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 310px minmax(720px, 1fr) 270px;
  gap: 12px;
  height: calc(100vh - 148px);
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  color: var(--evo-text);
  background: var(--evo-page);
  color-scheme: light;
}
.evolution-shell.theme-dark {
  --evo-page: #090b0c;
  --evo-panel: #0f1213;
  --evo-surface: #111516;
  --evo-surface-strong: #0b0e0f;
  --evo-input: #151918;
  --evo-border: #262b2d;
  --evo-border-soft: #202426;
  --evo-heading: #f4f7f5;
  --evo-text: #dce2de;
  --evo-muted: #8d9792;
  --evo-faint: #737d82;
  --evo-disabled: #596368;
  --evo-danger: #ff6d72;
  --evo-warning: #d7aa2b;
  --evo-shadow: rgba(0, 0, 0, .24);
  --evo-chart-text: #8b949e;
  --evo-chart-grid: #262b2d;
  --evo-chart-secondary: #20c8c8;
  --evo-chart-accent-area: color-mix(in srgb, var(--evo-accent) 13%, transparent);
  --evo-chart-danger-area: rgba(255, 90, 95, .14);
  --evo-tooltip-bg: #15191a;
  --evo-tooltip-text: #f4f7f5;
  color-scheme: dark;
}
.evolution-rail, .evolution-main { min-width: 0; min-height: 0; border: 1px solid var(--evo-border); background: var(--evo-panel); }
.evolution-rail { display: flex; overflow: hidden; flex-direction: column; }
.evolution-rail__title { display: flex; gap: 10px; align-items: flex-start; padding: 15px 16px; border-bottom: 1px solid var(--evo-border); color: var(--evo-accent); }
.evolution-rail__title > i { margin-top: 3px; font-size: 18px; }
.evolution-rail__title div { display: flex; flex-direction: column; }
.evolution-rail__title strong { color: var(--evo-heading); }
.evolution-rail__title span { margin-top: 3px; color: var(--evo-faint); font-size: 11px; }
.evolution-scroll { min-height: 0; overflow: auto; flex: 1; }
.evolution-section { padding: 15px 16px; border-bottom: 1px solid var(--evo-border-soft); }
.evolution-section > label, .section-line label { display: block; margin-bottom: 8px; color: var(--evo-text); font-size: 12px; font-weight: 600; }
.section-line { display: flex; justify-content: space-between; }
.section-line span, .evolution-muted { color: var(--evo-faint); font-size: 11px; }
.full-width { width: 100%; }
.parameter-space-hint { display: flex; align-items: center; gap: 6px; margin: -2px 0 8px; color: var(--evo-accent); font-size: 10px; line-height: 1.45; }
.parameter-scope-alert { margin-bottom: 8px; }
.parameter-row { padding: 9px 0; border-top: 1px solid var(--evo-border-soft); }
.parameter-row__title { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.parameter-row__title /deep/ .ant-checkbox-wrapper { color: var(--evo-text); }
.parameter-row__title /deep/ .ant-checkbox-inner { border-color: var(--evo-border); background: var(--evo-input); }
.parameter-row__title /deep/ .ant-checkbox-checked .ant-checkbox-inner { border-color: var(--evo-accent); background: var(--evo-accent); }
.parameter-row--disabled { opacity: .5; }
.parameter-row--disabled .parameter-row__title /deep/ .ant-checkbox-wrapper { color: var(--evo-disabled); }
.parameter-row code { color: var(--evo-faint); font-size: 10px; }
.parameter-domain { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin-top: 7px; color: var(--evo-text); font-variant-numeric: tabular-nums; }
.parameter-domain > span { min-width: 48px; padding: 5px 8px; border: 1px solid var(--evo-border); border-radius: 3px; background: var(--evo-input); text-align: center; }
.parameter-domain /deep/ .ant-input-number { width: 84px; border-color: var(--evo-border); background: var(--evo-input); }
.parameter-domain /deep/ .ant-input-number-input { color: var(--evo-heading); background: transparent; }
.parameter-domain /deep/ .ant-input-number-handler-wrap { border-color: var(--evo-border); background: var(--evo-surface-strong); }
.parameter-domain /deep/ .ant-input-number-handler { border-color: var(--evo-border); }
.parameter-domain /deep/ .ant-btn-link { height: 28px; margin-left: auto; padding: 0 2px; color: var(--evo-accent); font-size: 9px; }
.parameter-domain i, .parameter-domain small { color: var(--evo-faint); font-style: normal; }
.parameter-domain small { width: 100%; font-size: 9px; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.two-col .ant-input-number { width: 100%; }
.two-col .ant-form-item { margin: 11px 0 0; }
.two-col /deep/ .ant-form-item-label > label { color: var(--evo-muted); }
.switch-setting { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; color: var(--evo-muted); }
.evolution-section .ant-calendar-picker + .ant-calendar-picker { margin-top: 8px; }
.evolution-section /deep/ .ant-select-selection, .evolution-section /deep/ .ant-calendar-picker-input, .evolution-section /deep/ .ant-input-number { border-color: var(--evo-border); color: var(--evo-heading); background: var(--evo-input); }
.evolution-section /deep/ .ant-select-selection__rendered, .evolution-section /deep/ .ant-calendar-picker-icon, .evolution-section /deep/ .ant-select-arrow { color: var(--evo-muted); }
.range-alert { margin-top: 8px; }
.method-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.method-card { min-width: 0; padding: 9px 5px; border: 1px solid var(--evo-border); border-radius: 4px; color: var(--evo-muted); background: var(--evo-surface); cursor: pointer; }
.method-card > i { display: block; margin-bottom: 5px; font-size: 15px; }
.method-card span, .method-card strong, .method-card small { display: block; }
.method-card strong { overflow: hidden; color: var(--evo-text); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.method-card small { margin-top: 2px; overflow: hidden; color: var(--evo-faint); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.method-card--active { border-color: var(--evo-accent); color: var(--evo-accent); background: color-mix(in srgb, var(--evo-accent) 9%, var(--evo-panel)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--evo-accent) 14%, transparent); }
.method-card--active strong { color: var(--evo-heading); }
.method-card--active small { color: color-mix(in srgb, var(--evo-accent) 74%, var(--evo-muted)); }
.date-presets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-bottom: 8px; }
.date-presets /deep/ .ant-btn { min-width: 0; padding: 0 4px; border-color: var(--evo-border); border-radius: 3px; color: var(--evo-muted); background: var(--evo-surface); font-size: 10px; }
.date-presets /deep/ .ant-btn:hover:not([disabled]) { border-color: var(--evo-accent); color: var(--evo-accent); }
.evolution-runbar { z-index: 2; flex: 0 0 auto; padding: 11px 16px 13px; border-top: 1px solid var(--evo-border); background: var(--evo-surface-strong); box-shadow: 0 -10px 22px var(--evo-shadow); }
.resource-estimate { display: flex; justify-content: space-between; margin-bottom: 4px; color: var(--evo-faint); font-size: 11px; }
.resource-estimate strong { color: var(--evo-text); }
.resource-estimate--runs strong { color: var(--evo-accent); }
.estimate-hint { margin: 3px 0 9px; color: var(--evo-disabled); font-size: 9px; line-height: 1.35; }
.run-actions { display: grid; grid-template-columns: auto 1fr; gap: 8px; }
.evolution-main { overflow: auto; padding: 16px; background: var(--evo-page); }
.evolution-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--evo-muted); text-align: center; }
.empty-icon { display: grid; place-items: center; width: 62px; height: 62px; border: 1px solid color-mix(in srgb, var(--evo-accent) 38%, var(--evo-border)); background: color-mix(in srgb, var(--evo-accent) 9%, var(--evo-panel)); color: var(--evo-accent); font-size: 28px; box-shadow: 0 0 35px color-mix(in srgb, var(--evo-accent) 12%, transparent); }
.evolution-empty h2 { margin: 18px 0 5px; color: var(--evo-heading); }
.evolution-empty p { max-width: 530px; }
.empty-flow { display: flex; align-items: center; gap: 10px; margin-top: 18px; }
.empty-flow span { padding: 7px 11px; border: 1px solid var(--evo-border); color: var(--evo-muted); background: var(--evo-panel); }
.running-spinner { color: var(--evo-accent); font-size: 42px; }
.evolution-progress { width: 80%; max-width: 520px; margin-top: 16px; }
.result-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 13px; }
.result-header h2 { margin: 3px 0 0; color: var(--evo-heading); }
.eyebrow { color: var(--evo-accent); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
.metric-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px; }
.metric-grid article { position: relative; min-width: 0; padding: 12px; border: 1px solid var(--evo-border); background: var(--evo-surface); }
.metric-grid span { display: block; color: var(--evo-faint); font-size: 10px; }
.metric-grid strong { display: block; margin-top: 5px; color: var(--evo-heading); font-size: 21px; }
.metric-grid em { position: absolute; top: 12px; right: 12px; color: var(--evo-accent); font-style: normal; font-weight: 700; }
.negative { color: var(--evo-danger) !important; }
.study-facts { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 8px 0 10px; padding: 9px 12px; border: 1px solid var(--evo-border-soft); color: var(--evo-faint); background: var(--evo-surface-strong); font-size: 10px; }
.study-facts span { display: flex; gap: 5px; align-items: center; }
.study-facts b { color: var(--evo-accent); font-size: 12px; }
.chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.chart-grid--hero { grid-template-columns: 1.65fr 1fr; }
.chart-card, .candidate-card { border: 1px solid var(--evo-border); background: var(--evo-panel); box-shadow: 0 1px 2px var(--evo-shadow); }
.chart-title { display: flex; align-items: center; justify-content: space-between; height: 42px; padding: 0 13px; border-bottom: 1px solid var(--evo-border-soft); }
.chart-title strong { color: var(--evo-text); font-size: 12px; }
.chart-title span { color: var(--evo-faint); font-size: 10px; }
.chart { height: 220px; }
.chart--hero { height: 270px; }
.candidate-card { margin-top: 10px; }
.candidate-table__head, .candidate-table__row { display: grid; grid-template-columns: 45px 75px minmax(240px, 1fr) 85px 100px 100px; align-items: center; gap: 12px; min-height: 38px; padding: 0 13px; border-bottom: 1px solid var(--evo-border-soft); color: var(--evo-muted); font-size: 11px; }
.candidate-table__head { color: var(--evo-faint); background: var(--evo-surface-strong); }
.candidate-table__row strong { color: var(--evo-accent); }
.candidate-table__row code { overflow: hidden; color: var(--evo-muted); text-overflow: ellipsis; white-space: nowrap; }
.evolution-validation { padding-bottom: 0; }
.history-title { flex: 0 0 auto; }
.history-title /deep/ .ant-btn { margin-left: auto; padding: 0; color: var(--evo-faint); }
.history-list { flex: 0 1 300px; min-height: 86px; overflow: auto; padding: 8px; border-bottom: 1px solid var(--evo-border); }
.history-empty { padding: 20px 8px; color: var(--evo-disabled); font-size: 11px; text-align: center; }
.history-item { width: 100%; padding: 9px; border: 1px solid transparent; border-radius: 4px; color: var(--evo-faint); background: transparent; text-align: left; cursor: pointer; }
.history-item + .history-item { margin-top: 4px; }
.history-item:hover, .history-item--active { border-color: color-mix(in srgb, var(--evo-accent) 42%, var(--evo-border)); background: color-mix(in srgb, var(--evo-accent) 7%, var(--evo-panel)); }
.history-item__top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.history-item strong { overflow: hidden; color: var(--evo-text); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.history-item > span:not(.history-item__top), .history-item small { display: block; margin-top: 3px; overflow: hidden; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.history-item .history-item__failure { display: -webkit-box; overflow: hidden; color: var(--evo-danger); line-height: 1.35; white-space: normal; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.job-status { flex: 0 0 auto; font-size: 9px; font-style: normal; }
.job-status--running, .job-status--queued, .job-status--succeeded { color: var(--evo-accent); }
.job-status--failed, .job-status--cancelled { color: var(--evo-danger); }
.validation-divider { display: flex; flex: 0 0 auto; gap: 8px; align-items: center; padding: 11px 14px; border-bottom: 1px solid var(--evo-border); color: var(--evo-accent); font-size: 11px; }
.validation-divider strong { color: var(--evo-text); }
.validation-scroll { min-height: 0; overflow: auto; flex: 1; }
.validation-score { display: grid; grid-template-columns: 58px 1fr; gap: 12px; align-items: center; margin: 14px; padding: 14px; border: 1px solid color-mix(in srgb, var(--evo-accent) 42%, var(--evo-border)); border-radius: 5px; background: linear-gradient(135deg, color-mix(in srgb, var(--evo-accent) 11%, var(--evo-panel)), var(--evo-surface)); box-shadow: inset 3px 0 0 var(--evo-accent); }
.validation-score > span { display: grid; place-items: center; width: 48px; height: 48px; border: 1px solid currentColor; border-radius: 50%; color: var(--evo-accent); font-size: 27px; font-weight: 800; }
.validation-score > div { min-width: 0; }
.validation-score strong { display: block; color: var(--evo-heading); font-size: 25px; line-height: 1.1; }
.validation-score strong small { margin-left: 2px; color: var(--evo-faint); font-size: 10px; font-weight: 500; }
.validation-score p { margin: 5px 0 0; color: var(--evo-muted); font-size: 9px; }
.validation-score--c { border-color: color-mix(in srgb, var(--evo-warning) 55%, var(--evo-border)); box-shadow: inset 3px 0 0 var(--evo-warning); }
.validation-score--c > span { color: var(--evo-warning); }
.validation-score--d { border-color: color-mix(in srgb, var(--evo-danger) 48%, var(--evo-border)); background: linear-gradient(135deg, color-mix(in srgb, var(--evo-danger) 9%, var(--evo-panel)), var(--evo-surface)); box-shadow: inset 3px 0 0 var(--evo-danger); }
.validation-score--d > span { color: var(--evo-danger); }
.validation-card { margin: 0 14px 9px; padding: 12px; border: 1px solid var(--evo-border); border-radius: 4px; background: var(--evo-surface); }
.validation-card > div { display: flex; gap: 8px; align-items: center; color: var(--evo-muted); }
.validation-card > div i { color: var(--evo-accent); }
.validation-card b { display: block; margin-top: 9px; color: var(--evo-heading); font-size: 20px; font-variant-numeric: tabular-nums; }
.validation-card p { margin: 4px 0 0; color: var(--evo-faint); font-size: 10px; line-height: 1.5; }
.best-params { margin: 14px; padding-top: 12px; border-top: 1px solid var(--evo-border); }
.best-params > strong { display: block; margin-bottom: 8px; color: var(--evo-text); }
.best-params div { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--evo-border-soft); }
.best-params code { color: var(--evo-muted); }
.best-params b { color: var(--evo-accent); }
.validation-placeholder { height: 100%; min-height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; color: var(--evo-disabled); text-align: center; }
.validation-placeholder i { font-size: 30px; }
.evolution-failure .empty-icon { border-color: color-mix(in srgb, var(--evo-danger) 45%, var(--evo-border)); color: var(--evo-danger); background: color-mix(in srgb, var(--evo-danger) 8%, var(--evo-panel)); }
.failure-facts { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 14px; }
.failure-facts span { padding: 7px 10px; border: 1px solid var(--evo-border); border-radius: 3px; color: var(--evo-muted); background: var(--evo-surface); font-size: 10px; }
.failure-facts b { margin-right: 4px; color: var(--evo-heading); font-size: 13px; }
@media (max-width: 1500px) { .evolution-shell { grid-template-columns: 285px minmax(620px, 1fr) 240px; }.metric-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 1200px) { .evolution-shell { grid-template-columns: 280px minmax(0, 1fr); }.evolution-validation { display: none; }.chart-grid, .chart-grid--hero { grid-template-columns: 1fr; } }
</style>
