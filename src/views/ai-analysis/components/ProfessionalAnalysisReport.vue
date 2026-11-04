<template>
  <section class="professional-report" :class="{ 'theme-dark': isDarkTheme }">
    <div v-if="loading" class="research-loading" role="status" aria-live="polite">
      <header class="research-loading__header">
        <span class="research-loading__mark"><a-icon type="thunderbolt" /></span>
        <div>
          <strong>{{ loadingTitle }}</strong>
          <p>{{ $t('fastAnalysis.loadingSubtitle') }}</p>
        </div>
        <time>{{ $t('fastAnalysis.loadingElapsed', { time: elapsedText }) }} · {{ $t('fastAnalysis.loadingTypicalDuration') }}</time>
      </header>

      <div class="research-pipeline" :aria-label="$t('fastAnalysis.loadingWorkflow')">
        <div
          v-for="stage in loadingStages"
          :key="stage.key"
          class="research-stage"
          :class="`is-${stage.status}`"
        >
          <span class="research-stage__icon">
            <a-icon :type="stage.status === 'complete' ? 'check' : stage.icon" :class="{ spinning: stage.status === 'active' && stage.icon === 'loading' }" />
          </span>
          <span>{{ $t(`fastAnalysis.loadingStage.${stage.key}`) }}</span>
        </div>
      </div>

      <div class="research-activity">
        <span class="research-activity__pulse" />
        <div>
          <strong>{{ $t(`fastAnalysis.loadingActivity.${activeLoadingStage.key}`) }}</strong>
          <span>{{ $t('fastAnalysis.loadingActivityHint') }}</span>
        </div>
      </div>

      <div class="research-scope">
        <span>{{ $t('fastAnalysis.loadingResearchScope') }}</span>
        <a-tag v-for="item in loadingScope" :key="item">{{ $t(`fastAnalysis.loadingScope.${item}`) }}</a-tag>
      </div>

      <div class="report-preview">
        <article v-for="item in reportPreviewItems" :key="item.key">
          <a-icon :type="item.icon" />
          <div>
            <strong>{{ $t(`fastAnalysis.loadingPreview.${item.key}`) }}</strong>
            <span>{{ $t(`fastAnalysis.loadingPreviewHint.${item.key}`) }}</span>
          </div>
        </article>
      </div>
    </div>

    <div v-else-if="error" class="report-state report-error">
      <a-icon :type="errorTone === 'warning' ? 'clock-circle' : 'warning'" class="state-icon" />
      <strong>{{ error }}</strong>
      <a-button type="primary" @click="$emit('retry')">{{ $t('fastAnalysis.retry') }}</a-button>
    </div>

    <a-alert
      v-else-if="!report"
      type="warning"
      show-icon
      :message="$t('fastAnalysis.professionalContractRequired')"
      :description="$t('fastAnalysis.professionalContractRequiredDescription')"
    />

    <template v-else>
      <header class="report-header" :class="[decisionClass, biasClass]">
        <div class="report-identity">
          <span class="report-kicker">{{ $t('fastAnalysis.professionalReportTitle') }}</span>
          <h2>{{ instrument.market }}:{{ instrument.canonical_symbol || instrument.symbol }}</h2>
          <p>{{ instrument.name || instrument.symbol }} · {{ report.data_tier === 'professional' ? $t('fastAnalysis.professionalTier') : $t('fastAnalysis.communityTier') }}</p>
        </div>
        <div class="decision-panel">
          <div class="decision-bias">
            <small class="decision-heading">{{ $t('fastAnalysis.marketBias') }}</small>
            <strong>{{ marketBiasLabel }}</strong>
          </div>
          <div class="decision-confidence">
            <span class="trade-action">{{ $t('fastAnalysis.tradeAction') }} · {{ tradeActionLabel }}</span>
            <span class="confidence-value">{{ formatNumber(confidencePercent, 0) }}%</span>
          </div>
          <div
            class="confidence-meter"
            role="progressbar"
            :aria-label="$t('fastAnalysis.modelStrength')"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="confidencePercent"
          >
            <span :style="{ width: `${confidencePercent}%` }" />
          </div>
          <small class="confidence-caption">{{ $t('fastAnalysis.modelStrength') }}</small>
        </div>
      </header>

      <section class="executive-summary">
        <div class="section-title"><a-icon type="file-search" /> {{ $t('fastAnalysis.executiveSummary') }}</div>
        <p>{{ cleanNarrative(report.executive_summary || decisionProfile.rationale) }}</p>
      </section>

      <section v-if="priceChartBars.length" class="report-section price-chart-section">
        <div class="price-chart-heading">
          <div class="section-title"><a-icon type="stock" /> {{ $t('fastAnalysis.priceChartTitle') }}</div>
          <span>{{ $t('fastAnalysis.priceChartBars', { count: priceChartBars.length, timeframe: priceChart.timeframe || '1D' }) }} · {{ $t('fastAnalysis.dataAsOf') }} {{ priceChartCutoff }}</span>
        </div>
        <div ref="priceChart" class="price-chart" role="img" :aria-label="$t('fastAnalysis.priceChartAriaLabel')" />
        <p class="price-chart-note"><a-icon type="info-circle" /> {{ $t('fastAnalysis.priceChartEvidenceNote') }}</p>
      </section>

      <section v-if="hasResearchBrief" class="report-section research-brief">
        <div class="section-title"><a-icon type="compass" /> {{ $t('fastAnalysis.researchBrief') }}</div>
        <div class="brief-grid">
          <article v-if="researchBrief.core_thesis" class="brief-card thesis-card">
            <span>{{ $t('fastAnalysis.coreThesis') }}</span>
            <p>{{ cleanNarrative(researchBrief.core_thesis.text) }}</p>
            <small v-if="researchBrief.core_thesis.evidence_refs && researchBrief.core_thesis.evidence_refs.length">
              {{ $t('fastAnalysis.evidenceReferences') }}: {{ researchBrief.core_thesis.evidence_refs.join(', ') }}
            </small>
          </article>
          <article v-if="researchBrief.variant_view" class="brief-card variant-card">
            <span>{{ $t('fastAnalysis.variantView') }}</span>
            <p>{{ cleanNarrative(researchBrief.variant_view.text) }}</p>
            <small v-if="researchBrief.variant_view.evidence_refs && researchBrief.variant_view.evidence_refs.length">
              {{ $t('fastAnalysis.evidenceReferences') }}: {{ researchBrief.variant_view.evidence_refs.join(', ') }}
            </small>
          </article>
        </div>
        <div v-if="monitoringItems.length" class="monitoring-list">
          <strong>{{ $t('fastAnalysis.monitoringChecklist') }}</strong>
          <ul>
            <li v-for="(item, index) in monitoringItems" :key="`${item.kind}-${item.case || index}-${index}`">
              <a-tag :color="monitoringColor(item)">{{ monitoringLabel(item) }}</a-tag>
              <span>{{ cleanNarrative(item.text) }}</span>
              <small v-if="item.invalidation != null">{{ $t('fastAnalysis.invalidation') }}: {{ formatInvalidation(item.invalidation) }}</small>
            </li>
          </ul>
        </div>
      </section>

      <section class="quality-panel">
        <div class="quality-score">
          <a-progress type="circle" :percent="qualityPercent" :width="72" :stroke-color="qualityColor" />
          <span>{{ $t('fastAnalysis.dataQuality') }}</span>
        </div>
        <div class="quality-grid">
          <div><span>{{ $t('fastAnalysis.dataCoverage') }}</span><strong>{{ formatRatio(quality.coverage_ratio) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.dataFreshness') }}</span><strong>{{ formatRatio(quality.freshness_ratio) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.dataConflict') }}</span><strong>{{ formatRatio(quality.conflict_ratio) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.conclusionStrength') }}</span><strong>{{ strengthLabel(quality.max_conclusion_strength) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.dataAsOf') }}</span><strong>{{ formatTimestamp(dataAsOf) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.instrumentTimezone') }}</span><strong>{{ instrument.timezone || 'UTC' }}</strong></div>
        </div>
      </section>

      <a-alert
        v-if="quality.directional_conclusion_allowed === false"
        type="warning"
        show-icon
        :message="$t('fastAnalysis.directionBlockedTitle')"
        :description="$t('fastAnalysis.directionBlockedDescription')"
      />

      <section v-if="researchIntelligence.workflow_id" class="report-section research-intelligence">
        <div class="section-title"><a-icon type="fund" /> {{ $t('fastAnalysis.researchIntelligence') }}</div>
        <div class="research-summary">
          <div>
            <span>{{ $t('fastAnalysis.researchWorkflow') }}</span>
            <strong>{{ capabilityLabel(researchIntelligence.workflow_id) }}</strong>
          </div>
          <div>
            <span>{{ $t('fastAnalysis.researchReadiness') }}</span>
            <a-tag :color="readinessColor">{{ readinessLabel }}</a-tag>
          </div>
          <div v-for="item in performanceRows" :key="item.key">
            <span>{{ capabilityLabel(item.key) }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
        <div v-if="researchIntelligence.available_capabilities && researchIntelligence.available_capabilities.length" class="tag-list research-capabilities">
          <a-tag v-for="item in researchIntelligence.available_capabilities" :key="item" color="blue">{{ capabilityLabel(item) }}</a-tag>
        </div>
      </section>

      <section v-if="missingItems.length" class="report-section gaps-section">
        <div class="section-title"><a-icon type="warning" /> {{ $t('fastAnalysis.missingData') }}</div>
        <div class="tag-list">
          <a-tag v-for="item in missingItems" :key="item" color="orange">{{ capabilityLabel(item) }}</a-tag>
        </div>
      </section>

      <section class="report-section">
        <div class="section-title"><a-icon type="dashboard" /> {{ $t('fastAnalysis.analysisDimensions') }}</div>
        <div class="dimension-grid">
          <article v-for="item in dimensions" :key="item.key" class="dimension-card">
            <header>
              <strong>{{ dimensionLabel(item.key) }}</strong>
              <a-tag :color="item.status === 'available' ? scoreColor(item.score) : 'orange'">
                {{ item.status === 'available' ? formatNumber(item.score, 0) : $t('fastAnalysis.insufficientData') }}
              </a-tag>
            </header>
            <p>{{ dimensionNarrative(item) || $t('fastAnalysis.noNarrative') }}</p>
            <div v-if="item.missing_data && item.missing_data.length" class="tag-list compact">
              <a-tag v-for="missing in item.missing_data" :key="missing">{{ capabilityLabel(missing) }}</a-tag>
            </div>
          </article>
        </div>
      </section>

      <section v-if="scenarios.length" class="report-section">
        <div class="section-title"><a-icon type="branches" /> {{ $t('fastAnalysis.scenarioAnalysis') }}</div>
        <div class="scenario-grid">
          <article v-for="scenario in scenarios" :key="scenario.case" :class="`scenario-${scenario.case}`">
            <strong>{{ scenarioLabel(scenario.case) }}</strong>
            <span>{{ scenario.target_price == null ? '--' : formatMoney(scenario.target_price) }}</span>
            <p>{{ scenarioTriggerLabel(scenario) }}</p>
            <small v-if="scenario.invalidation != null">{{ $t('fastAnalysis.invalidation') }}: {{ formatInvalidation(scenario.invalidation) }}</small>
          </article>
        </div>
      </section>

      <section v-if="riskPlan" class="report-section">
        <div class="section-title"><a-icon type="safety-certificate" /> {{ isCandidateSetup ? $t('fastAnalysis.candidateSetup') : $t('fastAnalysis.riskPlan') }}</div>
        <a-alert
          v-if="isCandidateSetup"
          class="candidate-notice"
          type="info"
          show-icon
          :message="$t('fastAnalysis.candidateSetupDescription')"
        />
        <div class="risk-grid">
          <div><span>{{ $t('fastAnalysis.entryPrice') }}</span><strong>{{ formatMoney(displayRiskPlan.entry_price) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.stopLoss') }}</span><strong>{{ formatMoney(displayRiskPlan.stop_loss) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.takeProfit') }}</span><strong>{{ formatMoney(displayRiskPlan.take_profit) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.grossRiskReward') }}</span><strong>{{ formatRiskReward(displayRiskPlan.gross_risk_reward) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.netRiskReward') }}</span><strong>{{ formatRiskReward(displayRiskPlan.net_risk_reward) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.riskBudget') }}</span><strong>{{ formatPercent(riskPlan.risk_budget_pct) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.recommendedPosition') }}</span><strong>{{ formatPercent(riskPlan.recommended_position_pct) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.estimatedCost') }}</span><strong>{{ formatBps(riskPlan.estimated_roundtrip_cost_bps) }}</strong></div>
        </div>
        <div v-if="riskWarnings.length" class="tag-list risk-warnings">
          <a-tag v-for="warning in riskWarnings" :key="warning" color="orange">{{ warningLabel(warning) }}</a-tag>
        </div>
      </section>

      <section v-if="claims.length" class="report-section">
        <div class="section-title"><a-icon type="link" /> {{ $t('fastAnalysis.evidenceClaims') }}</div>
        <div class="claim-list">
          <article v-for="(claim, index) in claims" :key="claim.claim_id || index">
            <a-tag :color="claim.kind === 'risk' ? 'orange' : claim.kind === 'counter_argument' ? 'purple' : 'blue'">
              {{ claimKindLabel(claim.kind) }}
            </a-tag>
            <p>{{ cleanNarrative(claim.text) }}</p>
            <small>{{ $t('fastAnalysis.evidenceReferences') }}: {{ claim.evidence_refs.join(', ') }}</small>
          </article>
        </div>
      </section>

      <a-collapse v-if="evidenceRows.length" class="evidence-collapse" :bordered="false">
        <a-collapse-panel key="evidence" :header="$t('fastAnalysis.viewEvidence')">
          <div class="evidence-table">
            <div class="evidence-head">
              <span>{{ $t('fastAnalysis.evidenceMetric') }}</span>
              <span>{{ $t('fastAnalysis.evidenceValue') }}</span>
              <span>{{ $t('fastAnalysis.evidenceSource') }}</span>
              <span>{{ $t('fastAnalysis.dataAsOf') }}</span>
            </div>
            <div v-for="item in evidenceRows" :key="item.evidence_id" class="evidence-row">
              <div class="evidence-metric"><strong :title="capabilityLabel(item.metric)">{{ capabilityLabel(item.metric) }}</strong><small :title="item.evidence_id">{{ item.evidence_id }}</small></div>
              <span class="evidence-observed" :title="evidenceValueTitle(item)">{{ evidenceValue(item) }}</span>
              <span class="evidence-provider" :title="providerLabel(item.source)">
                <a v-if="safeUrl(item.source_url)" :href="safeUrl(item.source_url)" target="_blank" rel="noopener noreferrer">{{ providerLabel(item.source) }}</a>
                <template v-else>{{ providerLabel(item.source) }}</template>
              </span>
              <span class="evidence-timestamp">{{ formatTimestamp(item.as_of) }}</span>
            </div>
          </div>
        </a-collapse-panel>
      </a-collapse>

      <footer class="report-footer">
        <span>{{ $t('fastAnalysis.reportContract') }}: {{ report.schema_version }}</span>
        <span>{{ $t('fastAnalysis.reportId') }}: {{ report.report_id }}</span>
        <span v-if="runtime.analysis_time_ms">{{ $t('fastAnalysis.analysisTime') }}: {{ runtime.analysis_time_ms }}ms</span>
      </footer>
    </template>
  </section>
</template>

<script>
import { mapState } from 'vuex'
import * as echarts from 'echarts'
import {
  evidenceProviderTokens,
  formatEvidenceObservation,
  resolveMarketBiasLabelKey,
  resolveTradeActionLabelKey
} from '@/utils/fastAnalysisPresentation'

export default {
  name: 'ProfessionalAnalysisReport',
  props: {
    result: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    target: { type: Object, default: null },
    error: { type: String, default: null },
    errorTone: {
      type: String,
      default: 'error',
      validator: value => ['error', 'warning', 'info'].includes(value)
    }
  },
  data () {
    return { elapsedSeconds: 0, timer: null, priceChartInstance: null }
  },
  computed: {
    ...mapState({ navTheme: state => state.app.theme }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    report () {
      const candidate = this.result?.report || this.result?.professional_report || this.result
      return candidate && ['professional_report_v1', '1.0'].includes(candidate.schema_version)
        ? candidate
        : null
    },
    runtime () {
      return this.result?.runtime || {
        memory_id: this.result?.memory_id,
        analysis_time_ms: this.result?.analysis_time_ms
      }
    },
    instrument () {
      return this.report?.instrument || {}
    },
    decisionProfile () {
      return this.report?.decision_profile || {}
    },
    confidencePercent () {
      const value = Number(this.decisionProfile.confidence)
      return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
    },
    technicalDimensionScore () {
      return Number(this.dimensions.find(item => item.key === 'technical')?.score)
    },
    marketBiasLabelKey () {
      return resolveMarketBiasLabelKey({
        marketBias: this.decisionProfile.market_bias,
        biasScore: this.decisionProfile.market_bias_score,
        technicalScore: this.technicalDimensionScore
      })
    },
    marketBiasLabel () {
      return this.$t(this.marketBiasLabelKey)
    },
    tradeActionLabel () {
      return this.$t(resolveTradeActionLabelKey(this.decisionProfile.decision))
    },
    decisionClass () {
      return `decision-${String(this.decisionProfile.decision || 'HOLD').toLowerCase()}`
    },
    biasClass () {
      if (this.marketBiasLabelKey.endsWith('Bullish')) return 'bias-bullish'
      if (this.marketBiasLabelKey.endsWith('Bearish')) return 'bias-bearish'
      return 'bias-neutral'
    },
    quality () {
      return this.report?.data_quality || {}
    },
    researchIntelligence () {
      return this.report?.research_intelligence || {}
    },
    researchBrief () {
      return this.researchIntelligence.research_brief || {}
    },
    monitoringItems () {
      const catalysts = Array.isArray(this.researchBrief.catalysts)
        ? this.researchBrief.catalysts.map(item => ({ ...item, kind: 'catalyst' }))
        : []
      const watchItems = Array.isArray(this.researchBrief.watch_items) ? this.researchBrief.watch_items : []
      return [...catalysts, ...watchItems]
    },
    hasResearchBrief () {
      return Boolean(this.researchBrief.core_thesis || this.researchBrief.variant_view || this.monitoringItems.length)
    },
    readinessLabel () {
      const value = String(this.researchIntelligence.readiness_posture || 'insufficient')
      return this.$t(`fastAnalysis.readiness.${value}`)
    },
    readinessColor () {
      const value = this.researchIntelligence.readiness_posture
      return value === 'decision_ready' ? 'green' : value === 'conditional' ? 'orange' : 'red'
    },
    performanceRows () {
      const performance = this.researchIntelligence.performance || {}
      return Object.entries(performance).map(([key, value]) => ({
        key,
        value: key.endsWith('_pct') ? this.formatPercent(value) : this.formatNumber(value, 0)
      }))
    },
    qualityPercent () {
      const direct = Number(this.quality.overall_score)
      if (Number.isFinite(direct)) return Math.max(0, Math.min(100, Math.round(direct)))
      const ratio = Number(this.quality.quality_score)
      return Number.isFinite(ratio) ? Math.max(0, Math.min(100, Math.round(ratio * 100))) : 0
    },
    qualityColor () {
      if (this.qualityPercent >= 85) return '#10b981'
      if (this.qualityPercent >= 65) return '#f59e0b'
      return '#ef4444'
    },
    dataAsOf () {
      const asOf = this.report?.as_of
      const generatedAt = this.report?.generated_at
      const asOfMs = new Date(asOf).getTime()
      const generatedMs = new Date(generatedAt).getTime()
      return Number.isFinite(asOfMs) && Number.isFinite(generatedMs) && asOfMs > generatedMs
        ? generatedAt
        : asOf
    },
    missingItems () {
      const qualityMissing = this.quality.missing_metrics || []
      const featureMissing = this.report?.market_features?.missing_capabilities || []
      return [...new Set([...qualityMissing, ...featureMissing])]
    },
    dimensions () {
      return Array.isArray(this.report?.dimensions) ? this.report.dimensions : []
    },
    scenarios () {
      return Array.isArray(this.report?.scenarios) ? this.report.scenarios : []
    },
    claims () {
      return Array.isArray(this.report?.claims) ? this.report.claims : []
    },
    riskPlan () {
      return this.report?.risk_plan || null
    },
    displayRiskPlan () {
      return this.riskPlan?.candidate_setup || this.riskPlan || {}
    },
    isCandidateSetup () {
      return Boolean(this.riskPlan?.candidate_setup)
    },
    riskWarnings () {
      return [...new Set([
        ...(Array.isArray(this.riskPlan?.warnings) ? this.riskPlan.warnings : []),
        ...(Array.isArray(this.riskPlan?.candidate_setup?.warnings) ? this.riskPlan.candidate_setup.warnings : [])
      ])]
    },
    evidenceRows () {
      const rows = this.report?.evidence_snapshot?.observations
      if (!Array.isArray(rows)) return []
      const referenced = new Set([
        ...this.claims.flatMap(claim => claim.evidence_refs || []),
        ...this.dimensions.flatMap(item => item.evidence_refs || [])
      ])
      return [...rows]
        .sort((a, b) => Number(referenced.has(b.evidence_id)) - Number(referenced.has(a.evidence_id)))
        .slice(0, 120)
    },
    quoteCurrency () {
      return this.instrument.quote_currency || 'USD'
    },
    loadingTargetLabel () {
      const target = this.target || {}
      return [target.market, target.symbol].filter(Boolean).join(':')
    },
    loadingTitle () {
      return this.loadingTargetLabel
        ? this.$t('fastAnalysis.loadingTitle', { target: this.loadingTargetLabel })
        : this.$t('fastAnalysis.loadingTitleGeneric')
    },
    loadingStageIndex () {
      if (this.elapsedSeconds < 5) return 0
      if (this.elapsedSeconds < 16) return 1
      if (this.elapsedSeconds < 34) return 2
      if (this.elapsedSeconds < 55) return 3
      if (this.elapsedSeconds < 78) return 4
      return 5
    },
    loadingStages () {
      const stages = [
        { key: 'marketData', icon: 'line-chart' },
        { key: 'fundamentals', icon: 'bank' },
        { key: 'newsSentiment', icon: 'notification' },
        { key: 'macro', icon: 'global' },
        { key: 'risk', icon: 'safety-certificate' },
        { key: 'conclusion', icon: 'file-done' }
      ]
      return stages.map((stage, index) => ({
        ...stage,
        status: index < this.loadingStageIndex ? 'complete' : index === this.loadingStageIndex ? 'active' : 'pending'
      }))
    },
    activeLoadingStage () {
      return this.loadingStages[this.loadingStageIndex] || this.loadingStages[0]
    },
    loadingScope () {
      const market = String((this.target || {}).market || '')
      if (market === 'Crypto') return ['market', 'derivatives', 'news', 'macro']
      if (market === 'Forex') return ['market', 'macro', 'positioning', 'risk']
      if (market === 'Futures') return ['market', 'curve', 'positioning', 'macro']
      return ['market', 'company', 'news', 'macro']
    },
    reportPreviewItems () {
      return [
        { key: 'priceChart', icon: 'stock' },
        { key: 'thesis', icon: 'bulb' },
        { key: 'scenarios', icon: 'branches' },
        { key: 'risk', icon: 'safety-certificate' }
      ]
    },
    priceChart () {
      return this.report?.price_chart || {}
    },
    priceChartBars () {
      return Array.isArray(this.priceChart.bars) ? this.priceChart.bars : []
    },
    priceChartCutoff () {
      const last = this.priceChartBars[this.priceChartBars.length - 1]
      return this.formatTimestamp(last && last.timestamp)
    },
    elapsedText () {
      const minutes = Math.floor(this.elapsedSeconds / 60)
      const seconds = this.elapsedSeconds % 60
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
  },
  watch: {
    loading: {
      immediate: true,
      handler (active) {
        this.stopTimer()
        if (!active) return
        this.elapsedSeconds = 0
        this.timer = window.setInterval(() => { this.elapsedSeconds += 1 }, 1000)
      }
    },
    priceChartBars () {
      this.$nextTick(this.renderPriceChart)
    },
    isDarkTheme () {
      this.$nextTick(this.renderPriceChart)
    }
  },
  mounted () {
    window.addEventListener('resize', this.resizePriceChart)
    this.$nextTick(this.renderPriceChart)
  },
  beforeDestroy () {
    this.stopTimer()
    window.removeEventListener('resize', this.resizePriceChart)
    if (this.priceChartInstance) this.priceChartInstance.dispose()
    this.priceChartInstance = null
  },
  methods: {
    stopTimer () {
      if (this.timer) window.clearInterval(this.timer)
      this.timer = null
    },
    resizePriceChart () {
      if (this.priceChartInstance) this.priceChartInstance.resize()
    },
    movingAverage (period) {
      return this.priceChartBars.map((bar, index) => {
        if (index < period - 1) return '-'
        const windowBars = this.priceChartBars.slice(index - period + 1, index + 1)
        const value = windowBars.reduce((sum, item) => sum + Number(item.close || 0), 0) / period
        return Number(value.toFixed(4))
      })
    },
    renderPriceChart () {
      const element = this.$refs.priceChart
      if (!element || !this.priceChartBars.length) return
      if (this.priceChartInstance) this.priceChartInstance.dispose()
      this.priceChartInstance = echarts.init(element, null, { renderer: 'canvas' })
      const dates = this.priceChartBars.map(item => String(item.timestamp || '').slice(0, 10))
      const candles = this.priceChartBars.map(item => [item.open, item.close, item.low, item.high])
      const volumes = this.priceChartBars.map((item, index) => ({
        value: Number(item.volume || 0),
        itemStyle: { color: Number(item.close) >= Number(item.open) ? '#12a87d' : '#ef5b5b' },
        index
      }))
      const textColor = this.isDarkTheme ? '#b7c3d5' : '#64748b'
      const splitColor = this.isDarkTheme ? 'rgba(148, 163, 184, .12)' : '#edf1f7'
      const markLineData = []
      if (Number(this.priceChart.support) > 0) markLineData.push({ name: this.$t('fastAnalysis.priceChartSupport'), yAxis: Number(this.priceChart.support), lineStyle: { color: '#16a085' } })
      if (Number(this.priceChart.resistance) > 0) markLineData.push({ name: this.$t('fastAnalysis.priceChartResistance'), yAxis: Number(this.priceChart.resistance), lineStyle: { color: '#e67e22' } })
      const periods = Array.isArray(this.priceChart.moving_average_periods) ? this.priceChart.moving_average_periods : [5, 10, 20]
      const primaryColor = window.getComputedStyle(element).getPropertyValue('--primary-color').trim() || '#1890ff'
      const maColors = [primaryColor, '#8b5cf6', '#f59e0b']
      const maSeries = periods.slice(0, 3).map((period, index) => ({
        name: `MA${period}`,
        type: 'line',
        data: this.movingAverage(Number(period)),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.4, color: maColors[index] },
        xAxisIndex: 0,
        yAxisIndex: 0
      }))
      this.priceChartInstance.setOption({
        animationDuration: 350,
        textStyle: { color: textColor },
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: { top: 0, right: 8, data: periods.slice(0, 3).map(period => `MA${period}`), textStyle: { color: textColor } },
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        grid: [
          { left: 12, right: 58, top: 34, height: '60%', containLabel: true },
          { left: 12, right: 58, top: '77%', height: '15%', containLabel: true }
        ],
        xAxis: [
          { type: 'category', data: dates, boundaryGap: true, axisLine: { lineStyle: { color: splitColor } }, axisLabel: { show: false }, splitLine: { show: false } },
          { type: 'category', gridIndex: 1, data: dates, boundaryGap: true, axisLine: { lineStyle: { color: splitColor } }, axisLabel: { color: textColor, fontSize: 10 }, splitLine: { show: false } }
        ],
        yAxis: [
          { scale: true, position: 'right', axisLabel: { color: textColor, fontSize: 10 }, splitLine: { lineStyle: { color: splitColor } } },
          { scale: true, gridIndex: 1, position: 'right', axisLabel: { show: false }, splitLine: { show: false } }
        ],
        dataZoom: [{ type: 'inside', xAxisIndex: [0, 1], start: Math.max(0, 100 - (40 / this.priceChartBars.length) * 100), end: 100 }],
        series: [
          {
            name: this.$t('fastAnalysis.priceChartCandles'),
            type: 'candlestick',
            data: candles,
            itemStyle: { color: '#12a87d', color0: '#ef5b5b', borderColor: '#12a87d', borderColor0: '#ef5b5b' },
            markLine: { symbol: 'none', label: { color: textColor, formatter: '{b}' }, data: markLineData }
          },
          ...maSeries,
          { name: this.$t('fastAnalysis.priceChartVolume'), type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: volumes, barMaxWidth: 8 }
        ]
      }, true)
    },
    formatNumber (value, decimals = 2) {
      const number = Number(value)
      return Number.isFinite(number) ? number.toFixed(decimals) : '--'
    },
    formatRatio (value) {
      const number = Number(value)
      return Number.isFinite(number) ? `${Math.round(number * 100)}%` : '--'
    },
    formatPercent (value) {
      if (value === null || value === undefined || value === '') return '--'
      return `${this.formatNumber(value, 2)}%`
    },
    formatBps (value) {
      return value === null || value === undefined || value === '' ? '--' : `${this.formatNumber(value, 0)} bps`
    },
    formatPrice (value) {
      if (value === null || value === undefined || value === '') return '--'
      const number = Number(value)
      if (!Number.isFinite(number)) return '--'
      if (number < 1) return number.toFixed(6)
      if (number < 100) return number.toFixed(4)
      return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatMoney (value) {
      const price = this.formatPrice(value)
      return price === '--' ? '--' : `${price} ${this.quoteCurrency}`
    },
    formatRiskReward (value) {
      if (value === null || value === undefined || value === '') return '--'
      return `1 : ${this.formatNumber(value, 2)}`
    },
    formatTimestamp (value) {
      if (!value) return '--'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
    },
    cleanNarrative (value) {
      return String(value || '')
        .replace(/\s*\[(?:ev_[a-f0-9]+(?:\s*,\s*)?)+\]/gi, '')
        .replace(/\bstrong_downtrend\b/gi, this.$t('fastAnalysis.trend.strong_downtrend'))
        .replace(/\bstrong_uptrend\b/gi, this.$t('fastAnalysis.trend.strong_uptrend'))
        .replace(/\bbearish_alignment\b/gi, this.$t('fastAnalysis.trend.bearish_alignment'))
        .replace(/\bbullish_alignment\b/gi, this.$t('fastAnalysis.trend.bullish_alignment'))
        .replace(/\brevenue_growth\b/gi, this.capabilityLabel('revenue_growth'))
        .replace(/\bGreed\b/g, this.$t('globalMarket.greed'))
    },
    dimensionNarrative (item) {
      const code = item?.narrative_code || (
        item?.key === 'crypto_market_structure'
          ? this.legacyCryptoNarrativeCode(item?.narrative)
          : null
      )
      if (item?.key === 'crypto_market_structure' && code && typeof code === 'object') {
        const parts = ['volume_state', 'bias', 'crowding'].map(group => {
          const value = String(code[group] || 'unknown').toLowerCase()
          const summaryGroup = group === 'volume_state'
            ? 'volume'
            : group
          const key = `fastAnalysis.cryptoSummary.${summaryGroup}.${value}`
          const translated = this.$t(key)
          return translated === key ? '' : translated
        }).filter(Boolean)
        return parts.join(this.narrativeSeparator())
      }
      if (item?.key === 'macro' && code && typeof code === 'object') {
        const facts = !Array.isArray(code.facts)
          ? []
          : code.facts.map(fact => {
          const labelKey = `fastAnalysis.macroSummary.metric.${String(fact?.metric || '')}`
          const label = this.$t(labelKey)
          if (!fact || label === labelKey) return ''
          return `${label} ${fact.value}${fact.unit || ''}`
        }).filter(Boolean)
        if (!facts.length) return this.$t('fastAnalysis.macroSummary.unavailable')
        const contextKey = `fastAnalysis.macroSummary.context.${String(code.context || 'global_risk_assets')}`
        const context = this.$t(contextKey)
        return this.$t('fastAnalysis.macroSummary.available', {
          facts: facts.join(this.narrativeSeparator()),
          context: context === contextKey ? '' : context
        })
      }
      return this.cleanNarrative(item?.narrative)
    },
    legacyCryptoNarrativeCode (narrative) {
      const text = String(narrative || '')
      if (!/[\u6574\u9ad4][\u4f53\u9ad4]|\u64c1\u64e0|\u62e5\u6324/.test(text)) return null
      const volumeState = /\u653e\u5927/.test(text)
        ? 'expanding'
        : /\u56de\u843d/.test(text)
          ? 'shrinking'
          : /\u7a69[\u5b9a\u5b9a]/.test(text)
            ? 'stable'
            : 'unknown'
      const bias = /\u504f\u591a/.test(text)
        ? 'bullish'
        : /\u504f[\u7a7a\u7a7a]/.test(text)
          ? 'bearish'
          : 'neutral'
      const crowding = /(?:\u98a8\u96aa|\u98ce\u9669)\u9ad8/.test(text)
        ? 'high'
        : /\u62ac\u5347|\u5347\u9ad8/.test(text)
          ? 'medium'
          : /(?:\u98a8\u96aa|\u98ce\u9669)\u4f4e/.test(text)
            ? 'low'
            : 'unknown'
      return { volume_state: volumeState, bias, crowding }
    },
    narrativeSeparator () {
      const locale = String(this.$i18n?.locale || '').toLowerCase()
      if (locale.startsWith('zh') || locale.startsWith('ja')) return '、'
      if (locale.startsWith('ar')) return '، '
      return ', '
    },
    strengthLabel (value) {
      const key = `fastAnalysis.conclusionStrength.${String(value || 'none').toLowerCase()}`
      const translated = this.$t(key)
      return translated === key ? String(value || '--') : translated
    },
    dimensionLabel (value) {
      const key = `fastAnalysis.dimension.${String(value || '')}`
      const translated = this.$t(key)
      return translated === key ? String(value || '--').replace(/_/g, ' ') : translated
    },
    capabilityLabel (value) {
      const raw = String(value || '').trim()
      if (!raw) return '--'
      const normalized = this.normalizeMetricToken(raw.replace(/^missing[._\s-]+/i, ''))
      const aliases = { crypto_funding_rate: 'funding_rate', crypto_open_interest: 'open_interest' }
      const key = `fastAnalysis.capability.${aliases[normalized] || normalized}`
      const translated = this.$t(key)
      if (translated !== key) return translated
      return raw
        .replace(/^missing[._\s-]+/i, '')
        .split('.')
        .filter(Boolean)
        .map(part => this.metricPartLabel(part))
        .join(' · ')
    },
    normalizeMetricToken (value) {
      return String(value || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    },
    metricPartLabel (value) {
      const raw = String(value || '').trim()
      if (!raw) return '--'
      const normalized = this.normalizeMetricToken(raw)
      const key = `fastAnalysis.metricPart.${normalized}`
      const translated = this.$t(key)
      if (translated !== key) return translated
      if (/^(?:ma|ema|sma|rsi|macd|s|r)\d+$/i.test(raw)) return raw.toUpperCase()
      return raw.replace(/_/g, ' ')
    },
    providerLabel (value) {
      const raw = String(value || '').trim()
      if (!raw) return '--'
      const tokens = evidenceProviderTokens(raw)
      if (!tokens.length) return '--'
      return tokens.map(token => {
        const key = `fastAnalysis.provider.${token}`
        const translated = this.$t(key)
        return translated === key ? token.replace(/_/g, ' ') : translated
      }).join(' + ')
    },
    scenarioLabel (value) {
      return this.$t(`fastAnalysis.scenario.${String(value || 'base')}`)
    },
    monitoringLabel (item) {
      if (item?.kind === 'scenario') return this.scenarioLabel(item.case)
      if (item?.kind === 'catalyst') return this.$t('fastAnalysis.monitoredCatalyst')
      return this.$t('fastAnalysis.monitoredInvalidation')
    },
    monitoringColor (item) {
      if (item?.kind === 'catalyst' || item?.case === 'bull') return 'green'
      if (item?.case === 'bear' || item?.kind === 'invalidation') return 'red'
      return 'orange'
    },
    scenarioTriggerLabel (scenario) {
      const direct = scenario?.trigger || (Array.isArray(scenario?.triggers) ? scenario.triggers.join('；') : '')
      const normalized = String(direct || '').trim().toLowerCase()
      const generatedDefaults = {
        'price and evidence confirm the upside thesis.': 'bull',
        'current evidence remains mixed or follows the central path.': 'base',
        'downside catalyst or technical breakdown is confirmed.': 'bear'
      }
      if (generatedDefaults[normalized]) {
        return this.$t(`fastAnalysis.scenarioTrigger.${generatedDefaults[normalized]}`)
      }
      if (direct) return this.cleanNarrative(direct)
      const key = `fastAnalysis.scenarioTrigger.${String(scenario?.case || 'base')}`
      const translated = this.$t(key)
      return translated === key ? '--' : translated
    },
    claimKindLabel (value) {
      const key = `fastAnalysis.claimKind.${String(value || 'thesis').toLowerCase()}`
      const translated = this.$t(key)
      return translated === key ? String(value || 'thesis').replace(/_/g, ' ') : translated
    },
    warningLabel (value) {
      const key = `fastAnalysis.warning.${String(value || '').toLowerCase()}`
      const translated = this.$t(key)
      return translated === key ? String(value || '--').replace(/_/g, ' ') : translated
    },
    formatInvalidation (value) {
      return typeof value === 'number' ? this.formatMoney(value) : this.cleanNarrative(value)
    },
    scoreColor (score) {
      const value = Number(score)
      if (value >= 70) return 'green'
      if (value >= 50) return 'blue'
      if (value >= 30) return 'orange'
      return 'red'
    },
    evidenceValue (item) {
      const rawValue = item?.value
      if (rawValue && typeof rawValue === 'object') return this.structuredEvidenceValue(rawValue, item)
      const formatted = formatEvidenceObservation(item, this.evidenceFormatOptions())
      return formatted?.display || this.scalarEvidenceValue(rawValue)
    },
    evidenceExactValue (item) {
      const formatted = formatEvidenceObservation(item, this.evidenceFormatOptions())
      return formatted?.compacted ? formatted.exact : ''
    },
    evidenceValueTitle (item) {
      return this.evidenceExactValue(item) || this.evidenceValue(item)
    },
    evidenceFormatOptions () {
      return {
        locale: this.$i18n?.locale,
        shareLabel: this.$t('fastAnalysis.unit.share'),
        countLabel: this.$t('fastAnalysis.unit.count'),
        bpsLabel: this.$t('fastAnalysis.unit.bps')
      }
    },
    scalarEvidenceValue (value) {
      if (value === null || value === undefined || value === '') return '--'
      if (typeof value === 'boolean') return this.$t(`fastAnalysis.evidenceValueEnum.${value ? 'true' : 'false'}`)
      if (typeof value !== 'string') return String(value)
      const normalized = this.normalizeMetricToken(value)
      const key = `fastAnalysis.evidenceValueEnum.${normalized}`
      const translated = this.$t(key)
      return translated === key ? value : translated
    },
    structuredEvidenceValue (value, parentItem = {}) {
      if (!value || typeof value !== 'object') return this.scalarEvidenceValue(value)
      return Object.entries(value)
        .filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined && fieldValue !== '')
        .map(([field, fieldValue]) => `${this.metricPartLabel(field)} ${this.evidenceValue({
          ...parentItem,
          metric: `${parentItem.metric || ''}.${field}`,
          value: fieldValue
        })}`)
        .join(' · ') || '--'
    },
    safeUrl (value) {
      try {
        const url = new URL(String(value || ''))
        return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
      } catch (_) {
        return ''
      }
    }
  }
}
</script>

<style scoped lang="less">
.professional-report {
  --report-bg: #fff;
  --report-soft: #f7f9fc;
  --report-border: #e4eaf2;
  --report-text: #17243a;
  --report-muted: #718096;
  --report-header-base: #f8fafc;
  --report-header-end: #f1f4f8;
  --report-header-text: #17243a;
  --report-header-muted: #667085;
  --report-header-shadow: rgba(15, 23, 42, 0.08);
  --report-bullish: #087a5b;
  --report-bearish: #c9364f;
  --report-neutral: #9a6200;
  display: grid;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--report-border);
  border-radius: 12px;
  background: var(--report-bg);
  color: var(--report-text);
}

.professional-report *,
.professional-report *::before,
.professional-report *::after { box-sizing: border-box; }

.professional-report > * { min-width: 0; max-width: 100%; }

.report-header {
  display: grid;
  position: relative;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 36%);
  align-items: stretch;
  gap: 18px;
  overflow: hidden;
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 22%, var(--report-border));
  border-radius: 12px;
  background:
    radial-gradient(circle at 88% 0, color-mix(in srgb, var(--primary-color, #1890ff) 16%, transparent), transparent 42%),
    linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 4%, var(--report-header-base)), var(--report-header-end));
  box-shadow:
    inset 3px 0 0 color-mix(in srgb, var(--primary-color, #1890ff) 78%, transparent),
    0 12px 28px var(--report-header-shadow);
  color: var(--report-header-text);
  h2 { margin: 6px 0; color: var(--report-header-text); font-size: 24px; line-height: 1.25; }
  p { margin: 0; color: var(--report-header-muted); }
}

.report-identity { display: grid; align-content: center; min-width: 0; padding: 4px 10px; }
.report-kicker { color: var(--primary-color, #1890ff); font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.decision-panel {
  display: grid;
  grid-template-columns: minmax(94px, auto) minmax(130px, 1fr);
  grid-template-areas:
    'bias confidence'
    'meter meter'
    'caption caption';
  align-content: center;
  gap: 9px 18px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 14%, var(--report-border));
  border-radius: 11px;
  background: color-mix(in srgb, var(--primary-color, #1890ff) 4%, var(--report-bg));
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 42%, transparent);
}
.decision-bias { display: grid; grid-area: bias; align-content: center; gap: 2px; }
.decision-bias strong { color: var(--report-neutral); font-size: 22px; line-height: 1.2; }
.decision-confidence { display: grid; grid-area: confidence; justify-items: end; align-content: center; gap: 2px; text-align: right; }
.decision-panel .decision-heading { font-size: 10px; letter-spacing: 0.06em; }
.decision-panel .decision-heading,
.decision-panel .confidence-caption { color: var(--report-header-muted); }
.decision-panel .trade-action { color: var(--report-header-text); font-size: 12px; font-weight: 600; }
.decision-panel .confidence-value { color: var(--report-header-text); font-size: 25px; font-weight: 750; font-variant-numeric: tabular-nums; line-height: 1.15; }
.confidence-meter { grid-area: meter; height: 5px; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--report-header-muted) 18%, transparent); }
.confidence-meter span { display: block; width: 0; height: 100%; border-radius: inherit; background: linear-gradient(90deg, color-mix(in srgb, var(--primary-color, #1890ff) 72%, #fff), var(--primary-color, #1890ff)); box-shadow: 0 0 10px color-mix(in srgb, var(--primary-color, #1890ff) 35%, transparent); transition: width 0.35s ease; }
.confidence-caption { grid-area: caption; text-align: right; }
.bias-bullish .decision-bias strong { color: var(--report-bullish); }
.bias-bearish .decision-bias strong { color: var(--report-bearish); }
.bias-neutral .decision-bias strong { color: var(--report-neutral); }
.candidate-notice { margin-bottom: 12px; }

.report-state { display: grid; place-items: center; gap: 10px; min-height: 260px; color: var(--report-muted); }
.state-icon { color: #f59e0b; font-size: 30px; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.research-loading {
  display: grid;
  gap: 18px;
  min-height: 400px;
  padding: 24px;
  border: 1px solid var(--report-border);
  border-radius: 12px;
  background:
    radial-gradient(circle at 100% 0, color-mix(in srgb, var(--primary-color, #1890ff) 10%, transparent), transparent 32%),
    var(--report-bg);
}
.research-loading__header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 14px; }
.research-loading__header strong { display: block; color: var(--report-text); font-size: 18px; }
.research-loading__header p { margin: 4px 0 0; color: var(--report-muted); font-size: 12px; }
.research-loading__header time { color: var(--report-muted); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.research-loading__mark { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 12px; background: linear-gradient(135deg, var(--primary-color, #1890ff), var(--primary-color-hover, #40a9ff)); color: #fff; box-shadow: 0 8px 20px color-mix(in srgb, var(--primary-color, #1890ff) 28%, transparent); font-size: 18px; }

.research-pipeline { display: grid; grid-template-columns: repeat(6, minmax(72px, 1fr)); position: relative; padding: 5px 0; }
.research-pipeline::before { position: absolute; top: 22px; right: 8.5%; left: 8.5%; height: 2px; background: var(--report-border); content: ''; }
.research-stage { display: grid; position: relative; z-index: 1; justify-items: center; gap: 7px; color: var(--report-muted); font-size: 11px; text-align: center; }
.research-stage__icon { display: grid; width: 36px; height: 36px; place-items: center; border: 2px solid var(--report-border); border-radius: 50%; background: var(--report-bg); color: var(--report-muted); font-size: 14px; transition: 0.2s ease; }
.research-stage.is-complete { color: #137c62; }
.research-stage.is-complete .research-stage__icon { border-color: #12a87d; background: #eaf9f4; color: #0b8a68; }
.research-stage.is-active { color: var(--report-text); font-weight: 700; }
.research-stage.is-active .research-stage__icon { border-color: var(--primary-color, #1890ff); background: var(--primary-color-soft, color-mix(in srgb, var(--primary-color, #1890ff) 10%, var(--report-bg))); color: var(--primary-color, #1890ff); box-shadow: 0 0 0 5px color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent); animation: active-stage 1.8s ease-in-out infinite; }
@keyframes active-stage { 50% { box-shadow: 0 0 0 9px color-mix(in srgb, var(--primary-color, #1890ff) 4%, transparent); } }

.research-activity { display: flex; align-items: center; gap: 12px; padding: 13px 15px; border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 22%, transparent); border-radius: 9px; background: color-mix(in srgb, var(--primary-color, #1890ff) 7%, var(--report-bg)); }
.research-activity__pulse { width: 9px; height: 9px; flex: 0 0 auto; border-radius: 50%; background: var(--primary-color, #1890ff); box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-color, #1890ff) 38%, transparent); animation: activity-pulse 1.6s infinite; }
@keyframes activity-pulse { 70% { box-shadow: 0 0 0 8px color-mix(in srgb, var(--primary-color, #1890ff) 0%, transparent); } }
.research-activity div { display: grid; gap: 3px; }
.research-activity strong { color: var(--report-text); font-size: 13px; }
.research-activity span { color: var(--report-muted); font-size: 11px; }
.research-scope { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; color: var(--report-muted); font-size: 11px; }
.research-scope > span { margin-right: 2px; font-weight: 700; }
.research-scope /deep/ .ant-tag { margin: 0; border-color: color-mix(in srgb, var(--primary-color, #1890ff) 32%, transparent); border-radius: 10px; background: color-mix(in srgb, var(--primary-color, #1890ff) 9%, var(--report-bg)); color: var(--primary-color, #1890ff); }

.report-preview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; }
.report-preview article { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 10px; min-width: 0; padding: 12px; border: 1px solid var(--report-border); border-radius: 9px; background: var(--report-soft); }
.report-preview article > .anticon { color: var(--primary-color, #1890ff); font-size: 17px; }
.report-preview article div { display: grid; min-width: 0; gap: 2px; }
.report-preview article strong { overflow: hidden; color: var(--report-text); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.report-preview article span { overflow: hidden; color: var(--report-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }

.executive-summary, .quality-panel, .report-section { padding: 16px; border: 1px solid var(--report-border); border-radius: 10px; background: var(--report-soft); }
.executive-summary p, .dimension-card p, .scenario-grid p, .claim-list p { margin: 8px 0 0; color: var(--report-text); line-height: 1.75; }
.section-title { margin-bottom: 12px; color: var(--report-text); font-size: 15px; font-weight: 700; .anticon { margin-right: 6px; color: var(--primary-color, #1677ff); } }
.price-chart-section { background: var(--report-bg); }
.price-chart-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.price-chart-heading > span { color: var(--report-muted); font-size: 11px; text-align: right; }
.price-chart { width: 100%; height: 310px; }
.price-chart-note { margin: 6px 0 0; color: var(--report-muted); font-size: 11px; }
.price-chart-note .anticon { margin-right: 4px; color: var(--primary-color, #1890ff); }

.brief-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.brief-card { display: grid; gap: 7px; padding: 14px; border: 1px solid var(--report-border); border-left-width: 4px; border-radius: 9px; background: var(--report-bg); }
.brief-card > span { color: var(--report-muted); font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.brief-card p { margin: 0; color: var(--report-text); line-height: 1.75; }
.brief-card small { color: var(--report-muted); overflow-wrap: anywhere; }
.thesis-card { border-left-color: var(--primary-color, #1890ff); }
.variant-card { border-left-color: #8b5cf6; }
.monitoring-list { margin-top: 14px; }
.monitoring-list > strong { color: var(--report-text); font-size: 13px; }
.monitoring-list ul { display: grid; gap: 8px; margin: 9px 0 0; padding: 0; list-style: none; }
.monitoring-list li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 8px; background: var(--report-bg); color: var(--report-text); }
.monitoring-list li small { color: var(--report-muted); }

.quality-panel { display: grid; grid-template-columns: 100px 1fr; gap: 18px; }
.quality-score { display: grid; justify-items: center; gap: 6px; color: var(--report-muted); font-size: 12px; }
.quality-grid, .risk-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.quality-grid > div, .risk-grid > div { display: grid; gap: 4px; padding: 10px; border-radius: 8px; background: var(--report-bg); span { color: var(--report-muted); font-size: 12px; } strong { color: var(--report-text); } }
.research-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.research-summary > div { display: grid; gap: 4px; padding: 10px; border-radius: 8px; background: var(--report-bg); span { color: var(--report-muted); font-size: 12px; } strong { color: var(--report-text); overflow-wrap: anywhere; } }
.research-capabilities { margin-top: 10px; }

.dimension-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.dimension-card, .scenario-grid article, .claim-list article { min-width: 0; padding: 13px; border: 1px solid var(--report-border); border-radius: 9px; background: var(--report-bg); overflow-wrap: anywhere; }
.dimension-card header { display: flex; align-items: center; justify-content: space-between; }
.scenario-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.scenario-grid article { display: grid; gap: 5px; border-top-width: 3px; }
.scenario-bull { border-top-color: #10b981 !important; }
.scenario-base { border-top-color: #f59e0b !important; }
.scenario-bear { border-top-color: #ef4444 !important; }
.scenario-grid article > span { font-size: 18px; font-weight: 700; }
.scenario-grid small, .claim-list small { color: var(--report-muted); overflow-wrap: anywhere; }

.claim-list { display: grid; gap: 8px; }
.claim-list article { display: grid; grid-template-columns: auto 1fr; align-items: start; gap: 8px; }
.claim-list article p { margin: 0; }
.claim-list article small { grid-column: 2; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-list.compact { margin-top: 8px; }
.risk-warnings { margin-top: 10px; }

.evidence-collapse { overflow: hidden; border: 1px solid var(--report-border); border-radius: 10px; background: var(--report-soft); }
.evidence-collapse /deep/ .ant-collapse-item { border-color: var(--report-border); }
.evidence-collapse /deep/ .ant-collapse-header {
  color: var(--report-text);
  background: var(--report-soft);
}
.evidence-collapse /deep/ .ant-collapse-arrow { color: var(--report-muted); }
.evidence-collapse /deep/ .ant-collapse-content {
  color: var(--report-text);
  border-top-color: var(--report-border);
  background: var(--report-bg);
}
.evidence-collapse /deep/ .ant-collapse-content-box { max-width: 100%; overflow-x: auto; background: var(--report-bg); }
.evidence-table { display: grid; width: 100%; min-width: 620px; }
.evidence-head, .evidence-row { display: grid; width: 100%; grid-template-columns: minmax(145px, 1.25fr) minmax(165px, 1fr) minmax(100px, 0.75fr) minmax(140px, 0.9fr); gap: 10px; padding: 9px 6px; border-bottom: 1px solid var(--report-border); align-items: start; }
.evidence-head > *, .evidence-row > * { min-width: 0; }
.evidence-head { color: var(--report-muted); font-size: 12px; font-weight: 700; }
.evidence-row { color: var(--report-text); font-size: 12px; }
.evidence-row > div { display: grid; min-width: 0; gap: 3px; }
.evidence-row strong, .evidence-row > span { color: var(--report-text); }
.evidence-metric strong, .evidence-metric small, .evidence-provider { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.evidence-observed { display: -webkit-box; max-height: 3em; overflow: hidden; font-variant-numeric: tabular-nums; line-height: 1.5; overflow-wrap: anywhere; white-space: normal; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.evidence-row small { color: var(--report-muted); }
.evidence-timestamp { white-space: nowrap; }
.evidence-row a { color: var(--primary-color, #60a5fa); }
.report-footer { display: flex; flex-wrap: wrap; gap: 8px 18px; color: var(--report-muted); font-size: 11px; }

.theme-dark {
  --report-bg: #121312;
  --report-soft: #121312;
  --report-border: rgba(255, 255, 255, 0.11);
  --report-text: #e5e7eb;
  --report-muted: #9ca3af;
  --report-header-base: #121312;
  --report-header-end: #121312;
  --report-header-text: #f3f4f6;
  --report-header-muted: #a3a3a3;
  --report-header-shadow: rgba(0, 0, 0, 0.32);
  --report-bullish: #65d9af;
  --report-bearish: #ff9aa8;
  --report-neutral: #f2c45e;
}
.theme-dark .report-header,
.theme-dark .decision-panel,
.theme-dark .research-loading {
  background: var(--report-bg);
}
.theme-dark .decision-panel { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04); }
.theme-dark /deep/ .ant-progress-circle .ant-progress-text {
  color: var(--report-text) !important;
}

@media (max-width: 900px) {
  .quality-grid, .risk-grid, .dimension-grid, .research-summary, .brief-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .scenario-grid { grid-template-columns: 1fr; }
  .report-preview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 600px) {
  .professional-report { padding: 10px; }
  .report-header { grid-template-columns: minmax(0, 1fr); padding: 14px; }
  .report-identity { padding: 2px 4px; }
  .decision-panel { grid-template-columns: minmax(84px, auto) minmax(0, 1fr); padding: 12px; }
  .confidence-caption { text-align: left; }
  .quality-panel { grid-template-columns: 1fr; }
  .quality-grid, .risk-grid, .dimension-grid, .scenario-grid, .research-summary, .brief-grid { grid-template-columns: minmax(0, 1fr); }
  .monitoring-list li { grid-template-columns: auto minmax(0, 1fr); }
  .monitoring-list li small { grid-column: 2; }
  .research-loading { min-height: 0; padding: 16px; }
  .research-loading__header { grid-template-columns: auto minmax(0, 1fr); }
  .research-loading__header time { grid-column: 2; }
  .research-pipeline { grid-template-columns: repeat(3, minmax(0, 1fr)); row-gap: 14px; }
  .research-pipeline::before { display: none; }
  .report-preview { grid-template-columns: minmax(0, 1fr); }
  .price-chart-heading { display: grid; }
  .price-chart-heading > span { text-align: left; }
  .price-chart { height: 270px; }
}
</style>
