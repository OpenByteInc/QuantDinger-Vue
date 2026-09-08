<template>
  <section class="professional-report" :class="{ 'theme-dark': isDarkTheme }">
    <div v-if="loading" class="report-state">
      <a-icon type="loading" class="state-icon spinning" />
      <strong>{{ $t('fastAnalysis.analyzing') }}</strong>
      <span>{{ $t('fastAnalysis.preparing') }} · {{ elapsedText }}</span>
      <a-progress :percent="loadingProgress" :show-info="false" />
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
      <header class="report-header" :class="decisionClass">
        <div>
          <span class="report-kicker">{{ $t('fastAnalysis.professionalReportTitle') }}</span>
          <h2>{{ instrument.market }}:{{ instrument.canonical_symbol || instrument.symbol }}</h2>
          <p>{{ instrument.name || instrument.symbol }} · {{ report.data_tier === 'professional' ? $t('fastAnalysis.professionalTier') : $t('fastAnalysis.communityTier') }}</p>
        </div>
        <div class="decision-panel">
          <strong>{{ decisionLabel }}</strong>
          <span>{{ formatNumber(decisionProfile.confidence, 0) }}%</span>
          <small>{{ $t('fastAnalysis.modelStrength') }}</small>
        </div>
      </header>

      <section class="executive-summary">
        <div class="section-title"><a-icon type="file-search" /> {{ $t('fastAnalysis.executiveSummary') }}</div>
        <p>{{ cleanNarrative(report.executive_summary || decisionProfile.rationale) }}</p>
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
            <p>{{ cleanNarrative(item.narrative) || $t('fastAnalysis.noNarrative') }}</p>
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
        <div class="section-title"><a-icon type="safety-certificate" /> {{ $t('fastAnalysis.riskPlan') }}</div>
        <div class="risk-grid">
          <div><span>{{ $t('fastAnalysis.entryPrice') }}</span><strong>{{ formatMoney(riskPlan.entry_price) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.stopLoss') }}</span><strong>{{ formatMoney(riskPlan.stop_loss) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.takeProfit') }}</span><strong>{{ formatMoney(riskPlan.take_profit) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.grossRiskReward') }}</span><strong>{{ formatRiskReward(riskPlan.gross_risk_reward) }}</strong></div>
          <div><span>{{ $t('fastAnalysis.netRiskReward') }}</span><strong>{{ formatRiskReward(riskPlan.net_risk_reward) }}</strong></div>
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
              <div><strong>{{ capabilityLabel(item.metric) }}</strong><small>{{ item.evidence_id }}</small></div>
              <span>{{ evidenceValue(item) }}</span>
              <span>
                <a v-if="safeUrl(item.source_url)" :href="safeUrl(item.source_url)" target="_blank" rel="noopener noreferrer">{{ providerLabel(item.source) }}</a>
                <template v-else>{{ providerLabel(item.source) }}</template>
              </span>
              <span>{{ formatTimestamp(item.as_of) }}</span>
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
import { resolveDecisionLabelKey } from '@/utils/fastAnalysisPresentation'

export default {
  name: 'ProfessionalAnalysisReport',
  props: {
    result: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: null },
    errorTone: {
      type: String,
      default: 'error',
      validator: value => ['error', 'warning', 'info'].includes(value)
    }
  },
  data () {
    return { elapsedSeconds: 0, timer: null }
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
    decisionLabel () {
      return this.$t(resolveDecisionLabelKey({
        decision: this.decisionProfile.decision,
        score: this.decisionProfile.score
      }))
    },
    decisionClass () {
      return `decision-${String(this.decisionProfile.decision || 'HOLD').toLowerCase()}`
    },
    quality () {
      return this.report?.data_quality || {}
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
    riskWarnings () {
      return Array.isArray(this.riskPlan?.warnings) ? this.riskPlan.warnings : []
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
    elapsedText () {
      const minutes = Math.floor(this.elapsedSeconds / 60)
      const seconds = this.elapsedSeconds % 60
      return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`
    },
    loadingProgress () {
      return Math.min(92, Math.round(8 + this.elapsedSeconds * 0.55))
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
    }
  },
  beforeDestroy () {
    this.stopTimer()
  },
  methods: {
    stopTimer () {
      if (this.timer) window.clearInterval(this.timer)
      this.timer = null
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
      const key = `fastAnalysis.provider.${this.normalizeMetricToken(raw)}`
      const translated = this.$t(key)
      return translated === key ? raw.replace(/_/g, ' ') : translated
    },
    scenarioLabel (value) {
      return this.$t(`fastAnalysis.scenario.${String(value || 'base')}`)
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
      if (rawValue && typeof rawValue === 'object') return this.structuredEvidenceValue(rawValue)
      const value = this.scalarEvidenceValue(rawValue)
      const isNumeric = typeof rawValue === 'number' || (typeof rawValue === 'string' && rawValue.trim() !== '' && Number.isFinite(Number(rawValue)))
      const unit = isNumeric ? this.evidenceUnit(item?.unit, item?.currency, item?.metric) : ''
      const currency = item?.currency && !unit.includes(item.currency) ? ` ${item.currency}` : ''
      return `${value}${unit}${currency}`
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
    structuredEvidenceValue (value) {
      if (!value || typeof value !== 'object') return this.scalarEvidenceValue(value)
      return Object.entries(value)
        .filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined && fieldValue !== '')
        .map(([field, fieldValue]) => `${this.metricPartLabel(field)} ${this.scalarEvidenceValue(fieldValue)}`)
        .join(' · ') || '--'
    },
    evidenceUnit (value, currency, metric) {
      const normalized = this.normalizeMetricToken(value)
      if (/(^|\.)rsi(\.|$)/i.test(String(metric || ''))) return ''
      if (!normalized || ['price', 'currency', 'ohlcv', 'mixed_earnings'].includes(normalized)) return ''
      if (normalized === 'percent') return '%'
      if (normalized === 'multiple') return '×'
      if (normalized === 'usd') return currency === 'USD' ? '' : ' USD'
      if (normalized === 'currency_per_share') return currency ? ` ${currency}/${this.$t('fastAnalysis.unit.share')}` : `/${this.$t('fastAnalysis.unit.share')}`
      const key = `fastAnalysis.unit.${normalized}`
      const translated = this.$t(key)
      return translated === key ? ` ${value}` : ` ${translated}`
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
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;
  border-radius: 10px;
  background: linear-gradient(135deg, #13243b, #1f3b5f);
  color: #fff;
  h2 { margin: 4px 0; color: #fff; font-size: 24px; }
  p { margin: 0; color: rgba(255, 255, 255, 0.7); }
}

.report-kicker { color: #8fc5ff; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.decision-panel { display: grid; min-width: 130px; align-content: center; text-align: right; strong { font-size: 21px; } span { font-size: 26px; font-weight: 700; } small { color: rgba(255, 255, 255, 0.65); } }
.decision-buy .decision-panel strong { color: #6ee7b7; }
.decision-sell .decision-panel strong { color: #fca5a5; }
.decision-hold .decision-panel strong { color: #fcd34d; }

.report-state { display: grid; place-items: center; gap: 10px; min-height: 260px; color: var(--report-muted); .ant-progress { width: 80%; max-width: 380px; } }
.state-icon { color: #f59e0b; font-size: 30px; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.executive-summary, .quality-panel, .report-section { padding: 16px; border: 1px solid var(--report-border); border-radius: 10px; background: var(--report-soft); }
.executive-summary p, .dimension-card p, .scenario-grid p, .claim-list p { margin: 8px 0 0; color: var(--report-text); line-height: 1.75; }
.section-title { margin-bottom: 12px; color: var(--report-text); font-size: 15px; font-weight: 700; .anticon { margin-right: 6px; color: var(--primary-color, #1677ff); } }

.quality-panel { display: grid; grid-template-columns: 100px 1fr; gap: 18px; }
.quality-score { display: grid; justify-items: center; gap: 6px; color: var(--report-muted); font-size: 12px; }
.quality-grid, .risk-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.quality-grid > div, .risk-grid > div { display: grid; gap: 4px; padding: 10px; border-radius: 8px; background: var(--report-bg); span { color: var(--report-muted); font-size: 12px; } strong { color: var(--report-text); } }

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
.evidence-collapse /deep/ .ant-collapse-content-box { overflow-x: auto; background: var(--report-bg); }
.evidence-table { display: grid; min-width: 760px; }
.evidence-head, .evidence-row { display: grid; grid-template-columns: 1.35fr 1fr 0.85fr 1fr; gap: 10px; padding: 9px 6px; border-bottom: 1px solid var(--report-border); align-items: center; }
.evidence-head { color: var(--report-muted); font-size: 12px; font-weight: 700; }
.evidence-row { color: var(--report-text); font-size: 12px; }
.evidence-row > div { display: grid; gap: 3px; }
.evidence-row strong, .evidence-row > span { color: var(--report-text); }
.evidence-row small { color: var(--report-muted); overflow-wrap: anywhere; }
.evidence-row a { color: var(--primary-color, #60a5fa); }
.report-footer { display: flex; flex-wrap: wrap; gap: 8px 18px; color: var(--report-muted); font-size: 11px; }

.theme-dark {
  --report-bg: #16181d;
  --report-soft: #1d2027;
  --report-border: #30343d;
  --report-text: #e5e7eb;
  --report-muted: #9ca3af;
}
.theme-dark /deep/ .ant-progress-circle .ant-progress-text {
  color: var(--report-text) !important;
}

@media (max-width: 900px) {
  .quality-grid, .risk-grid, .dimension-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .scenario-grid { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .professional-report { padding: 10px; }
  .report-header { display: grid; }
  .decision-panel { text-align: left; }
  .quality-panel { grid-template-columns: 1fr; }
  .quality-grid, .risk-grid, .dimension-grid, .scenario-grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
