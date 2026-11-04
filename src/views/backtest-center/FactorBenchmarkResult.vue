<template>
  <div class="factor-benchmark" :class="{ 'theme-dark': isDark }" data-testid="factor-benchmark-result">
    <header class="benchmark-header">
      <div class="benchmark-header__identity">
        <span class="benchmark-header__icon"><a-icon type="experiment" /></span>
        <div>
          <span class="eyebrow">{{ $t('strategyV2.factorResearch.benchmarkComplete') }}</span>
          <h3>{{ $t('strategyV2.factorResearch.benchmarkTitle') }}</h3>
          <p>{{ $t('strategyV2.factorResearch.benchmarkMethodHint') }}</p>
        </div>
      </div>
      <div class="benchmark-header__meta">
        <span>{{ $t('strategyV2.factorResearch.methodologyVersion', { version: result.methodologyVersion || 1 }) }}</span>
        <code>{{ $t('strategyV2.factorResearch.benchmarkId') }} {{ result.benchmarkId }}</code>
      </div>
    </header>

    <section class="research-verdict" :class="{ 'research-verdict--review': !verdictReady }">
      <span class="research-verdict__icon"><a-icon :type="verdictReady ? 'check' : 'warning'" /></span>
      <div class="research-verdict__copy">
        <span>{{ $t('strategyV2.factorResearch.verdictLabel') }}</span>
        <strong>{{ $t(verdictReady ? 'strategyV2.factorResearch.verdictReadyTitle' : 'strategyV2.factorResearch.verdictReviewTitle') }}</strong>
        <p>{{ $t(verdictReady ? 'strategyV2.factorResearch.verdictReadyDesc' : 'strategyV2.factorResearch.verdictReviewDesc', verdictValues) }}</p>
      </div>
      <div class="research-verdict__chips">
        <span class="verdict-chip verdict-chip--status"><i />{{ $t(verdictReady ? 'strategyV2.factorResearch.verdictReady' : 'strategyV2.factorResearch.verdictReview') }}</span>
        <span class="verdict-chip"><a-icon type="clock-circle" />{{ percent(validation.trainFraction) }} / {{ percent(validation.testFraction) }}</span>
        <span class="verdict-chip"><a-icon type="safety-certificate" />{{ $t('strategyV2.factorResearch.falseDiscoveryRate') }} {{ percent(validation.falseDiscoveryRate) }}</span>
      </div>
    </section>

    <div class="study-facts">
      <span><b>{{ evaluatedFactorCount }}</b>{{ $t('strategyV2.factorResearch.evaluatedFactors') }}</span>
      <span><b>{{ totalObservationCount }}</b>{{ $t('strategyV2.factorResearch.observations') }}</span>
      <span><b>{{ validation.minimumOosObservations || '-' }}</b>{{ $t('strategyV2.factorResearch.minimumOosObservations') }}</span>
      <span><b>{{ percent(validation.minimumCoverage) }}</b>{{ $t('strategyV2.factorResearch.minimumCoverage') }}</span>
      <span><b>{{ errors.length }}</b>{{ $t('strategyV2.factorResearch.failedFactors') }}</span>
      <span><b>{{ positiveOosCount }}</b>{{ $t('strategyV2.factorResearch.positiveOosFactors') }}</span>
      <span><b>{{ negativeOosCount }}</b>{{ $t('strategyV2.factorResearch.negativeOosFactors') }}</span>
      <span class="study-facts__explain"><a-icon type="info-circle" />{{ $t('strategyV2.factorResearch.icDirectionHint') }}</span>
    </div>

    <div class="metric-grid">
      <article>
        <span>{{ $t('strategyV2.factorResearch.factorsTested') }}</span>
        <strong>{{ requestedFactorCount }}</strong>
        <em>{{ evaluatedFactorCount }} {{ $t('strategyV2.factorResearch.completedShort') }}</em>
      </article>
      <article :class="{ 'metric-card--positive': validatedCount > 0 }">
        <span>{{ $t('strategyV2.factorResearch.aliveFactors') }}</span>
        <strong>{{ validatedCount }}</strong>
        <em>{{ percent(validatedRate) }}</em>
      </article>
      <article class="metric-card--leader">
        <span>{{ $t('strategyV2.factorResearch.bestFactor') }}</span>
        <strong>{{ hasLeader ? topFactor.factorId : $t('strategyV2.factorResearch.noValidatedLeader') }}</strong>
        <em v-if="hasLeader">{{ number(topFactor.score, 1) }} / 100</em>
      </article>
      <article>
        <span>{{ $t('strategyV2.factorResearch.strongestOosIc') }}</span>
        <strong :class="metricTone(strongestOosFactor.testRankIc)">{{ signedNumber(strongestOosFactor.testRankIc, 4) }}</strong>
        <em>{{ strongestOosFactor.factorId || '-' }} · {{ $t(`strategyV2.factorResearch.direction.${strongestOosFactor.direction || 'normal'}`) }}</em>
      </article>
      <article>
        <span>{{ $t('strategyV2.factorResearch.averageCoverage') }}</span>
        <strong>{{ percent(averageCoverage) }}</strong>
        <em>{{ $t(averageCoverage >= Number(validation.minimumCoverage || 0) ? 'strategyV2.factorResearch.thresholdPass' : 'strategyV2.factorResearch.thresholdFail') }}</em>
      </article>
      <article>
        <span>{{ $t('strategyV2.factorResearch.falseDiscoveryRate') }}</span>
        <strong>{{ percent(validation.falseDiscoveryRate) }}</strong>
        <em>{{ $t('strategyV2.factorResearch.multipleTestingShort') }}</em>
      </article>
    </div>

    <div class="analysis-grid">
      <section class="analysis-card leader-card">
        <div class="analysis-card__heading">
          <div><span class="section-icon"><a-icon type="trophy" /></span><strong>{{ $t('strategyV2.factorResearch.factorLeader') }}</strong></div>
          <span>{{ $t('strategyV2.factorResearch.factorLeaderHint') }}</span>
        </div>
        <div v-if="hasLeader" class="leader-card__body">
          <div class="leader-score"><span>{{ number(topFactor.score, 1) }}</span><small>/ 100</small></div>
          <div class="leader-copy">
            <div class="leader-copy__title">
              <strong>{{ topFactor.factorId || '-' }}</strong>
              <span class="classification-pill" :class="classificationClass(topFactor.classification)">{{ classificationLabel(topFactor.classification) }}</span>
            </div>
            <p>{{ $t('strategyV2.factorResearch.leaderEvidence', { train: signedNumber(topFactor.trainRankIc, 4), test: signedNumber(topFactor.testRankIc, 4), retention: percent(topFactor.oosRetention) }) }}</p>
            <div class="evidence-bars">
              <div><span>{{ $t('strategyV2.factorResearch.trainRankIc') }}</span><b>{{ signedNumber(topFactor.trainRankIc, 4) }}</b><i><em :style="positiveBarStyle(topFactor.trainRankIc)" /></i></div>
              <div><span>{{ $t('strategyV2.factorResearch.testRankIc') }}</span><b>{{ signedNumber(topFactor.testRankIc, 4) }}</b><i><em :style="positiveBarStyle(topFactor.testRankIc)" /></i></div>
            </div>
          </div>
        </div>
        <div v-else class="leader-empty"><a-icon type="warning" /><div><strong>{{ $t('strategyV2.factorResearch.noValidatedLeader') }}</strong><span>{{ $t('strategyV2.factorResearch.noValidatedLeaderHint') }}</span></div></div>
      </section>

      <section class="analysis-card validation-card">
        <div class="analysis-card__heading">
          <div><span class="section-icon"><a-icon type="safety-certificate" /></span><strong>{{ $t('strategyV2.factorResearch.validationDesign') }}</strong></div>
          <span>{{ $t('strategyV2.factorResearch.timeOrdered') }}</span>
        </div>
        <div class="sample-split">
          <div class="sample-split__bar">
            <span class="sample-split__train" :style="{ width: percent(validation.trainFraction) }" />
            <span class="sample-split__test" :style="{ width: percent(validation.testFraction) }" />
          </div>
          <div class="sample-split__labels">
            <span><i class="train-dot" />{{ $t('strategyV2.factorResearch.trainSample') }} <b>{{ percent(validation.trainFraction) }}</b></span>
            <span><i class="test-dot" />{{ $t('strategyV2.factorResearch.testSample') }} <b>{{ percent(validation.testFraction) }}</b></span>
          </div>
        </div>
        <dl class="validation-thresholds">
          <div><dt>{{ $t('strategyV2.factorResearch.fdrThreshold') }}</dt><dd>{{ percent(validation.falseDiscoveryRate) }}</dd></div>
          <div><dt>{{ $t('strategyV2.factorResearch.minimumOosIc') }}</dt><dd>{{ number(validation.minimumAbsOosIc, 3) }}</dd></div>
          <div><dt>{{ $t('strategyV2.factorResearch.minimumCoverage') }}</dt><dd>{{ percent(validation.minimumCoverage) }}</dd></div>
        </dl>
      </section>

      <section class="analysis-card distribution-card">
        <div class="analysis-card__heading">
          <div><span class="section-icon"><a-icon type="radar-chart" /></span><strong>{{ $t('strategyV2.factorResearch.qualityDistribution') }}</strong></div>
          <span>{{ evaluatedFactorCount }}</span>
        </div>
        <div class="distribution-bar" :aria-label="$t('strategyV2.factorResearch.qualityDistribution')">
          <span v-for="item in distribution" v-if="item.count" :key="item.key" :class="`distribution-bar__${item.tone}`" :style="{ width: `${item.ratio * 100}%` }" />
        </div>
        <div class="distribution-legend">
          <span v-for="item in distribution" :key="item.key"><i :class="`legend-${item.tone}`" />{{ item.label }}<b>{{ item.count }}</b></span>
        </div>
      </section>
    </div>

    <section class="research-detail">
      <a-tabs v-model="activeTab" :animated="false" class="benchmark-tabs">
        <a-tab-pane key="ranking">
          <span slot="tab"><a-icon type="ordered-list" />{{ $t('strategyV2.factorResearch.tabRanking') }}</span>
          <div class="section-heading">
            <div><strong>{{ $t('strategyV2.factorResearch.rankingTitle') }}</strong><p>{{ $t('strategyV2.factorResearch.rankingHint') }}</p></div>
            <span>{{ rankings.length }} / {{ requestedFactorCount }}</span>
          </div>
          <div class="ranking-table-wrap">
            <table class="ranking-table">
              <thead><tr><th>#</th><th>{{ $t('strategyV2.factorResearch.factor') }}</th><th>{{ $t('strategyV2.factorResearch.classification') }}</th><th>{{ $t('strategyV2.factorResearch.score') }}</th><th>{{ $t('strategyV2.factorResearch.icStability') }}</th><th>{{ $t('strategyV2.factorResearch.oosRetention') }}</th><th>{{ $t('strategyV2.factorResearch.significance') }}</th><th>{{ $t('strategyV2.factorResearch.coverage') }}</th></tr></thead>
              <tbody>
                <tr v-for="row in rankings" :key="row.factorId">
                  <td><span class="rank-badge" :class="{ 'rank-badge--top': hasLeader && row.factorId === topFactor.factorId }">{{ row.rank }}</span></td>
                  <td><div class="factor-identity"><strong>{{ row.factorId }}</strong><code>{{ factorParams(row.factorParams) }}</code></div></td>
                  <td><span class="classification-pill" :class="classificationClass(row.classification)">{{ classificationLabel(row.classification) }}</span></td>
                  <td><div class="score-cell"><strong>{{ number(row.score, 1) }}</strong><span><i :style="{ width: `${clamp(row.score, 0, 100)}%` }" /></span></div></td>
                  <td><div class="ic-comparison"><span><small>{{ $t('strategyV2.factorResearch.trainShort') }}</small><b :class="metricTone(row.trainRankIc)">{{ signedNumber(row.trainRankIc, 4) }}</b></span><i><a-icon type="arrow-right" /></i><span><small>{{ $t('strategyV2.factorResearch.testShort') }}</small><b :class="metricTone(row.testRankIc)">{{ signedNumber(row.testRankIc, 4) }}</b></span></div></td>
                  <td><div class="compact-progress"><strong>{{ percent(row.oosRetention) }}</strong><span><i :style="{ width: `${row.oosRetention == null ? 0 : clamp(Number(row.oosRetention) * 100, 0, 100)}%` }" /></span></div></td>
                  <td><div class="significance-cell"><strong>{{ number(row.qValue, 4) }}</strong><span :class="{ pass: significancePassed(row), fail: !significancePassed(row) }">{{ $t(significancePassed(row) ? 'strategyV2.factorResearch.thresholdPass' : 'strategyV2.factorResearch.thresholdFail') }}</span></div></td>
                  <td><div class="coverage-cell"><strong>{{ percent(row.coverage) }}</strong><span><i :style="{ width: `${clamp(Number(row.coverage) * 100, 0, 100)}%` }" /></span></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </a-tab-pane>

        <a-tab-pane key="correlation">
          <span slot="tab"><a-icon type="cluster" />{{ $t('strategyV2.factorResearch.tabCorrelation') }}</span>
          <div class="section-heading">
            <div><strong>{{ $t('strategyV2.factorResearch.benchmarkCorrelation') }}</strong><p>{{ $t('strategyV2.factorResearch.benchmarkCorrelationHint') }}</p></div>
            <div class="heat-legend"><span>-1</span><i /><span>+1</span></div>
          </div>
          <div v-if="correlation.factors && correlation.factors.length" class="correlation-scroll">
            <table class="correlation-matrix">
              <thead><tr><th></th><th v-for="factor in correlation.factors" :key="`head-${factor}`">{{ factor }}</th></tr></thead>
              <tbody>
                <tr v-for="(factor, rowIndex) in correlation.factors" :key="factor">
                  <th>{{ factor }}</th>
                  <td v-for="(value, columnIndex) in correlation.matrix[rowIndex]" :key="`${rowIndex}-${columnIndex}`" :style="correlationStyle(value)" :title="correlationTitle(value, rowIndex, columnIndex)">
                    <strong>{{ value == null ? '—' : number(value, 2) }}</strong><small>{{ correlationObservation(rowIndex, columnIndex) }}</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-analysis"><a-icon type="cluster" /><span>{{ $t('strategyV2.factorResearch.noCorrelationData') }}</span></div>
        </a-tab-pane>

        <a-tab-pane key="diagnostics">
          <span slot="tab"><a-icon type="audit" />{{ $t('strategyV2.factorResearch.tabDiagnostics') }}<em v-if="errors.length">{{ errors.length }}</em></span>
          <div class="section-heading"><div><strong>{{ $t('strategyV2.factorResearch.diagnosticTitle') }}</strong><p>{{ $t('strategyV2.factorResearch.diagnosticHint') }}</p></div></div>
          <div class="protocol-grid">
            <article><a-icon type="clock-circle" /><div><strong>{{ $t('strategyV2.factorResearch.protocolTimeOrder') }}</strong><span>{{ $t('strategyV2.factorResearch.protocolTimeOrderHint') }}</span></div></article>
            <article><a-icon type="safety-certificate" /><div><strong>{{ $t('strategyV2.factorResearch.protocolMultipleTesting') }}</strong><span>{{ $t('strategyV2.factorResearch.protocolMultipleTestingHint') }}</span></div></article>
            <article><a-icon type="dollar" /><div><strong>{{ $t('strategyV2.factorResearch.protocolCostAware') }}</strong><span>{{ $t('strategyV2.factorResearch.protocolCostAwareHint') }}</span></div></article>
          </div>
          <div v-if="errors.length" class="failure-list">
            <article v-for="item in errors" :key="item.factorId"><span><a-icon type="warning" /></span><div><strong>{{ item.factorId }}</strong><p>{{ errorMessage(item.error) }}</p></div><em>{{ $t('strategyV2.factorResearch.notEvaluated') }}</em></article>
          </div>
          <div v-else class="diagnostic-success"><a-icon type="check-circle" /><div><strong>{{ $t('strategyV2.factorResearch.noFailures') }}</strong><span>{{ $t('strategyV2.factorResearch.noFailuresHint') }}</span></div></div>
        </a-tab-pane>
      </a-tabs>
    </section>
  </div>
</template>

<script>
export default {
  name: 'FactorBenchmarkResult',
  props: { result: { type: Object, required: true }, isDark: { type: Boolean, default: false } },
  data () { return { activeTab: 'ranking' } },
  computed: {
    rankings () { return Array.isArray(this.result.rankings) ? this.result.rankings : [] },
    summary () { return this.result.summary || {} },
    validation () { return this.result.validation || {} },
    correlation () { return this.result.correlation || {} },
    errors () { return Array.isArray(this.result.errors) ? this.result.errors : [] },
    requestedFactorCount () { const requested = Number(this.summary.requestedFactorCount); return Number.isFinite(requested) ? requested : Number(this.summary.factorCount || 0) + this.errors.length },
    evaluatedFactorCount () { return this.rankings.length },
    validatedCount () { return this.count('alive') + this.count('reversed') },
    validatedRate () { return this.requestedFactorCount ? this.validatedCount / this.requestedFactorCount : 0 },
    verdictReady () { return this.validatedCount > 0 },
    topFactor () {
      const factorId = this.summary.bestFactorId
      if (!factorId) return {}
      return this.rankings.find(item => item.factorId === factorId && ['alive', 'reversed', 'candidate'].includes(item.classification)) || {}
    },
    hasLeader () { return Boolean(this.topFactor.factorId) },
    strongestOosFactor () { return this.rankings.slice(1).reduce((strongest, item) => Math.abs(Number(item.testRankIc || 0)) > Math.abs(Number(strongest.testRankIc || 0)) ? item : strongest, this.rankings[0] || {}) },
    positiveOosCount () { return this.rankings.filter(item => Number(item.testRankIc) > 0).length },
    negativeOosCount () { return this.rankings.filter(item => Number(item.testRankIc) < 0).length },
    averageCoverage () { return this.rankings.length ? this.rankings.reduce((total, item) => total + Number(item.coverage || 0), 0) / this.rankings.length : 0 },
    totalObservationCount () { return this.rankings.reduce((total, item) => total + Number(item.observationCount || 0), 0) },
    verdictValues () { return { factor: this.topFactor.factorId || '-', count: this.validatedCount } },
    distribution () {
      const total = Math.max(1, this.evaluatedFactorCount)
      return [
        { key: 'alive', tone: 'positive', count: this.count('alive') + this.count('reversed') },
        { key: 'candidate', tone: 'candidate', count: this.count('candidate') },
        { key: 'decaying', tone: 'warning', count: this.count('decaying') },
        { key: 'dead', tone: 'danger', count: this.count('dead') },
        { key: 'insufficient', tone: 'muted', count: this.count('insufficient') }
      ].map(item => ({ ...item, ratio: item.count / total, label: this.$t(`strategyV2.factorResearch.distribution.${item.key}`) }))
    }
  },
  methods: {
    count (key) { return Number((this.summary.counts || {})[key] || 0) },
    clamp (value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, Number(value) || 0)) },
    number (value, digits = 3) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed.toFixed(digits) : '—' },
    signedNumber (value, digits = 3) { const parsed = Number(value); return Number.isFinite(parsed) ? `${parsed > 0 ? '+' : ''}${parsed.toFixed(digits)}` : '—' },
    percent (value) { if (value === null || value === undefined || value === '') return '—'; const parsed = Number(value); return Number.isFinite(parsed) ? `${(parsed * 100).toFixed(1)}%` : '—' },
    metricTone (value) { const parsed = Number(value); return !Number.isFinite(parsed) || parsed === 0 ? 'neutral' : (parsed > 0 ? 'positive' : 'negative') },
    errorMessage (value) {
      const raw = String(value || '')
      const separator = raw.indexOf(':')
      const code = separator >= 0 ? raw.slice(0, separator) : raw
      const detail = separator >= 0 ? raw.slice(separator + 1) : ''
      if (code && this.$te(code)) { const translated = this.$t(code); return detail ? this.$t('strategyV2.factorResearch.failureWithDetail', { reason: translated, detail }) : translated }
      return this.$t('strategyV2.factorResearch.unknownFailure')
    },
    classificationLabel (value) { return this.$t(`strategyV2.factorResearch.classification.${value || 'insufficient'}`) },
    classificationClass (value) { return `classification-pill--${value || 'insufficient'}` },
    factorParams (params) { const entries = Object.entries(params || {}); return entries.length ? entries.map(([key, value]) => `${key}=${value}`).join(' · ') : this.$t('strategyV2.factorResearch.defaultParameters') },
    significancePassed (row) { return Number(row.qValue) <= Number(this.validation.falseDiscoveryRate) },
    positiveBarStyle (value) { const width = this.clamp(Math.abs(Number(value)) / 0.1 * 100, 3, 100); return { width: `${width}%`, background: Number(value) < 0 ? 'var(--fb-danger)' : 'var(--fb-accent)' } },
    correlationObservation (rowIndex, columnIndex) { const rows = Array.isArray(this.correlation.observations) ? this.correlation.observations : []; const count = rows[rowIndex] && rows[rowIndex][columnIndex]; return Number.isFinite(Number(count)) ? this.$t('strategyV2.factorResearch.sharedObservationShort', { count }) : '' },
    correlationTitle (value, rowIndex, columnIndex) { return `${value == null ? '—' : this.number(value, 4)} · ${this.$t('strategyV2.factorResearch.sharedObservations')} ${this.correlationObservation(rowIndex, columnIndex)}` },
    correlationStyle (value) {
      if (value == null) return {}
      const parsed = this.clamp(Number(value), -1, 1)
      const alpha = 0.12 + Math.abs(parsed) * (this.isDark ? 0.48 : 0.42)
      const base = parsed >= 0 ? (this.isDark ? '82, 196, 26' : '68, 170, 32') : (this.isDark ? '255, 109, 114' : '220, 38, 38')
      return { backgroundColor: `rgba(${base}, ${alpha})`, color: Math.abs(parsed) > 0.62 ? '#fff' : 'var(--fb-heading)' }
    }
  }
}
</script>

<style lang="less" scoped>
.factor-benchmark { --fb-accent: var(--primary-color, #52c41a); --fb-accent-soft: color-mix(in srgb, var(--fb-accent) 9%, transparent); --fb-panel: #fff; --fb-surface: #fafbfc; --fb-surface-strong: #f5f7fa; --fb-border: #e2e6eb; --fb-border-soft: #edf0f4; --fb-heading: #17233d; --fb-text: #445269; --fb-muted: #718096; --fb-faint: #8b96a7; --fb-positive: #26934a; --fb-cyan: #168ea3; --fb-warning: #c58b14; --fb-danger: #e5484d; --fb-shadow: rgba(15, 35, 60, .06); display: grid; gap: 10px; color: var(--fb-text); color-scheme: light; }
.factor-benchmark.theme-dark { --fb-panel: #111; --fb-surface: #151515; --fb-surface-strong: #0d0d0d; --fb-border: #2d2d2d; --fb-border-soft: #242424; --fb-heading: #f4f7f5; --fb-text: #dce2de; --fb-muted: #8d9792; --fb-faint: #69736f; --fb-positive: #68cf82; --fb-cyan: #4bc7d7; --fb-warning: #d7aa2b; --fb-danger: #ff6d72; --fb-shadow: rgba(0, 0, 0, .24); color-scheme: dark; }
.benchmark-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 3px 0 4px; }.benchmark-header__identity { display: grid; min-width: 0; grid-template-columns: 38px minmax(0, 1fr); gap: 11px; }.benchmark-header__icon { display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid color-mix(in srgb, var(--fb-accent) 34%, var(--fb-border)); border-radius: 9px; color: var(--fb-accent); background: var(--fb-accent-soft); font-size: 17px; }.eyebrow { color: var(--fb-accent); font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }.benchmark-header h3 { margin: 2px 0; color: var(--fb-heading); font-size: 16px; line-height: 1.4; }.benchmark-header p { max-width: 780px; margin: 0; color: var(--fb-muted); font-size: 11px; line-height: 1.5; }.benchmark-header__meta { display: flex; flex: none; align-items: flex-end; flex-direction: column; gap: 4px; color: var(--fb-faint); font-size: 9px; }.benchmark-header__meta code { padding: 3px 7px; border: 1px solid var(--fb-border); border-radius: 5px; color: var(--fb-muted); background: var(--fb-surface); }
.research-verdict { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 12px; align-items: center; min-height: 78px; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--fb-accent) 34%, var(--fb-border)); border-left: 3px solid var(--fb-accent); border-radius: 9px; background: linear-gradient(100deg, color-mix(in srgb, var(--fb-accent) 8%, var(--fb-panel)), var(--fb-surface-strong) 64%); box-shadow: 0 4px 16px var(--fb-shadow); }.research-verdict--review { border-color: color-mix(in srgb, var(--fb-warning) 35%, var(--fb-border)); border-left-color: var(--fb-warning); background: linear-gradient(100deg, color-mix(in srgb, var(--fb-warning) 7%, var(--fb-panel)), var(--fb-surface-strong) 64%); }.research-verdict__icon { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid color-mix(in srgb, var(--fb-accent) 48%, var(--fb-border)); border-radius: 50%; color: var(--fb-accent); background: color-mix(in srgb, var(--fb-accent) 10%, var(--fb-panel)); }.research-verdict--review .research-verdict__icon { border-color: color-mix(in srgb, var(--fb-warning) 48%, var(--fb-border)); color: var(--fb-warning); background: color-mix(in srgb, var(--fb-warning) 9%, var(--fb-panel)); }.research-verdict__copy > span { display: block; color: var(--fb-faint); font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }.research-verdict__copy strong { display: block; margin-top: 2px; color: var(--fb-heading); font-size: 14px; }.research-verdict__copy p { margin: 3px 0 0; color: var(--fb-muted); font-size: 10px; line-height: 1.45; }.research-verdict__chips { display: flex; max-width: 360px; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }.verdict-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border: 1px solid var(--fb-border); border-radius: 999px; color: var(--fb-muted); background: var(--fb-surface); font-size: 9px; line-height: 1.2; white-space: nowrap; }.verdict-chip--status { border-color: color-mix(in srgb, var(--fb-accent) 40%, var(--fb-border)); color: var(--fb-accent); }.research-verdict--review .verdict-chip--status { border-color: color-mix(in srgb, var(--fb-warning) 42%, var(--fb-border)); color: var(--fb-warning); }.verdict-chip--status i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
.study-facts { display: flex; flex-wrap: wrap; gap: 8px 20px; padding: 9px 12px; border: 1px solid var(--fb-border-soft); border-radius: 8px; color: var(--fb-faint); background: var(--fb-surface-strong); font-size: 10px; }.study-facts span { display: flex; align-items: center; gap: 5px; }.study-facts b { color: var(--fb-accent); font-size: 12px; font-variant-numeric: tabular-nums; }.study-facts__explain { margin-left: auto; color: var(--fb-muted); }
.metric-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }.metric-grid article { position: relative; min-width: 0; min-height: 78px; padding: 12px; border: 1px solid var(--fb-border); border-radius: 9px; background: var(--fb-surface); box-shadow: 0 1px 2px var(--fb-shadow); }.metric-grid article > span { display: block; overflow: hidden; color: var(--fb-faint); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.metric-grid article > strong { display: block; overflow: hidden; margin-top: 6px; color: var(--fb-heading); font-size: 21px; line-height: 1.1; text-overflow: ellipsis; white-space: nowrap; }.metric-grid article > em { position: absolute; top: 12px; right: 11px; color: var(--fb-muted); font-size: 9px; font-style: normal; }.metric-grid .metric-card--positive > strong, .metric-grid .metric-card--positive > em { color: var(--fb-positive); }.metric-grid .metric-card--leader { border-color: color-mix(in srgb, var(--fb-accent) 30%, var(--fb-border)); background: linear-gradient(145deg, var(--fb-accent-soft), var(--fb-surface) 60%); }.metric-grid .metric-card--leader > strong { color: var(--fb-accent); font-size: 15px; }.positive { color: var(--fb-positive) !important; }.negative { color: var(--fb-danger) !important; }.neutral { color: var(--fb-muted) !important; }
.analysis-grid { display: grid; grid-template-columns: 1.35fr 1fr 1fr; gap: 8px; }.analysis-card, .research-detail { overflow: hidden; border: 1px solid var(--fb-border); border-radius: 9px; background: var(--fb-panel); box-shadow: 0 1px 2px var(--fb-shadow); }.analysis-card__heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 42px; padding: 0 12px; border-bottom: 1px solid var(--fb-border-soft); }.analysis-card__heading > div { display: flex; align-items: center; gap: 7px; }.analysis-card__heading strong { color: var(--fb-text); font-size: 11px; }.analysis-card__heading > span { color: var(--fb-faint); font-size: 9px; }.section-icon { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; color: var(--fb-accent); background: var(--fb-accent-soft); }
.leader-card__body { display: grid; grid-template-columns: 82px minmax(0, 1fr); gap: 12px; align-items: center; padding: 13px; }.leader-score { display: flex; width: 72px; height: 72px; align-items: baseline; justify-content: center; border: 1px solid color-mix(in srgb, var(--fb-accent) 45%, var(--fb-border)); border-radius: 50%; color: var(--fb-accent); background: radial-gradient(circle, var(--fb-accent-soft), transparent 70%); box-shadow: inset 0 0 0 5px var(--fb-surface); }.leader-score span { align-self: center; font-size: 23px; font-weight: 800; }.leader-score small { align-self: center; margin: 9px 0 0 2px; color: var(--fb-faint); font-size: 8px; }.leader-copy { min-width: 0; }.leader-copy__title { display: flex; align-items: center; gap: 8px; }.leader-copy__title > strong { overflow: hidden; color: var(--fb-heading); font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }.leader-copy p { margin: 5px 0 8px; color: var(--fb-muted); font-size: 9px; line-height: 1.5; }.evidence-bars { display: grid; gap: 5px; }.evidence-bars > div { display: grid; grid-template-columns: 48px 52px 1fr; align-items: center; gap: 6px; font-size: 9px; }.evidence-bars span { color: var(--fb-faint); }.evidence-bars b { color: var(--fb-text); font-variant-numeric: tabular-nums; }.evidence-bars i { height: 4px; overflow: hidden; border-radius: 999px; background: var(--fb-border-soft); }.evidence-bars em { display: block; height: 100%; border-radius: inherit; }
.leader-empty { display: flex; min-height: 98px; align-items: center; justify-content: center; gap: 10px; padding: 16px; color: var(--fb-warning); text-align: left; }.leader-empty strong, .leader-empty span { display: block; }.leader-empty strong { color: var(--fb-heading); font-size: 11px; }.leader-empty span { margin-top: 3px; color: var(--fb-muted); font-size: 9px; line-height: 1.45; }
.classification-pill { display: inline-flex; align-items: center; width: fit-content; padding: 3px 7px; border: 1px solid var(--fb-border); border-radius: 999px; color: var(--fb-muted); background: var(--fb-surface); font-size: 9px; font-weight: 700; white-space: nowrap; }.classification-pill--alive { border-color: color-mix(in srgb, var(--fb-positive) 36%, var(--fb-border)); color: var(--fb-positive); background: color-mix(in srgb, var(--fb-positive) 8%, var(--fb-panel)); }.classification-pill--reversed { border-color: color-mix(in srgb, var(--fb-cyan) 38%, var(--fb-border)); color: var(--fb-cyan); background: color-mix(in srgb, var(--fb-cyan) 8%, var(--fb-panel)); }.classification-pill--candidate { border-color: color-mix(in srgb, var(--fb-accent) 38%, var(--fb-border)); color: var(--fb-accent); background: var(--fb-accent-soft); }.classification-pill--decaying { border-color: color-mix(in srgb, var(--fb-warning) 40%, var(--fb-border)); color: var(--fb-warning); background: color-mix(in srgb, var(--fb-warning) 8%, var(--fb-panel)); }.classification-pill--dead { border-color: color-mix(in srgb, var(--fb-danger) 36%, var(--fb-border)); color: var(--fb-danger); background: color-mix(in srgb, var(--fb-danger) 7%, var(--fb-panel)); }
.sample-split { padding: 14px 13px 9px; }.sample-split__bar { display: flex; height: 11px; overflow: hidden; border-radius: 3px; background: var(--fb-border-soft); }.sample-split__train { background: var(--fb-accent); }.sample-split__test { background: var(--fb-cyan); }.sample-split__labels { display: flex; justify-content: space-between; gap: 10px; margin-top: 8px; color: var(--fb-muted); font-size: 9px; }.sample-split__labels span { display: flex; align-items: center; gap: 5px; }.sample-split__labels i { width: 6px; height: 6px; border-radius: 2px; }.sample-split__labels b { color: var(--fb-text); }.train-dot { background: var(--fb-accent); }.test-dot { background: var(--fb-cyan); }.validation-thresholds { display: grid; grid-template-columns: repeat(3, 1fr); margin: 0; border-top: 1px solid var(--fb-border-soft); }.validation-thresholds div { min-width: 0; padding: 10px; text-align: center; }.validation-thresholds div + div { border-left: 1px solid var(--fb-border-soft); }.validation-thresholds dt { overflow: hidden; color: var(--fb-faint); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }.validation-thresholds dd { margin: 4px 0 0; color: var(--fb-heading); font-size: 12px; font-weight: 700; }
.distribution-card { padding-bottom: 10px; }.distribution-bar { display: flex; height: 11px; overflow: hidden; margin: 18px 13px 13px; border-radius: 3px; background: var(--fb-border-soft); }.distribution-bar span { min-width: 2px; }.distribution-bar__positive, .legend-positive { background: var(--fb-positive); }.distribution-bar__candidate, .legend-candidate { background: var(--fb-accent); }.distribution-bar__warning, .legend-warning { background: var(--fb-warning); }.distribution-bar__danger, .legend-danger { background: var(--fb-danger); }.distribution-bar__muted, .legend-muted { background: var(--fb-faint); }.distribution-legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px 10px; padding: 0 13px; }.distribution-legend span { display: grid; grid-template-columns: 6px minmax(0, 1fr) auto; align-items: center; gap: 5px; overflow: hidden; color: var(--fb-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.distribution-legend i { width: 6px; height: 6px; border-radius: 2px; }.distribution-legend b { color: var(--fb-heading); }
.research-detail { min-height: 260px; }.benchmark-tabs /deep/ .ant-tabs-bar { margin: 0; padding: 0 13px; border-color: var(--fb-border); background: var(--fb-surface-strong); }.benchmark-tabs /deep/ .ant-tabs-tab { padding: 11px 4px; color: var(--fb-muted); font-size: 10px; }.benchmark-tabs /deep/ .ant-tabs-tab-active { color: var(--fb-accent); }.benchmark-tabs /deep/ .ant-tabs-ink-bar { background: var(--fb-accent); }.benchmark-tabs /deep/ .ant-tabs-tab .anticon { margin-right: 5px; }.benchmark-tabs /deep/ .ant-tabs-tab em { display: inline-flex; min-width: 15px; height: 15px; align-items: center; justify-content: center; margin-left: 5px; border-radius: 999px; color: #fff; background: var(--fb-warning); font-size: 8px; font-style: normal; }.benchmark-tabs /deep/ .ant-tabs-content { color: var(--fb-text); }.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 12px 13px; border-bottom: 1px solid var(--fb-border-soft); }.section-heading strong { color: var(--fb-heading); font-size: 12px; }.section-heading p { margin: 2px 0 0; color: var(--fb-muted); font-size: 9px; line-height: 1.45; }.section-heading > span { color: var(--fb-faint); font-size: 9px; }
.ranking-table-wrap { overflow-x: auto; }.ranking-table { width: 100%; min-width: 940px; border-collapse: collapse; table-layout: fixed; }.ranking-table th { height: 34px; padding: 0 9px; border-bottom: 1px solid var(--fb-border); color: var(--fb-faint); background: var(--fb-surface-strong); font-size: 9px; font-weight: 600; text-align: left; }.ranking-table th:nth-child(1) { width: 42px; }.ranking-table th:nth-child(2) { width: 150px; }.ranking-table th:nth-child(3) { width: 100px; }.ranking-table th:nth-child(4) { width: 95px; }.ranking-table th:nth-child(5) { width: 180px; }.ranking-table th:nth-child(6), .ranking-table th:nth-child(8) { width: 105px; }.ranking-table th:nth-child(7) { width: 105px; }.ranking-table td { height: 52px; padding: 7px 9px; border-bottom: 1px solid var(--fb-border-soft); color: var(--fb-text); font-size: 10px; }.ranking-table tbody tr:hover td { background: color-mix(in srgb, var(--fb-accent) 3%, var(--fb-panel)); }.rank-badge { display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid var(--fb-border); border-radius: 6px; color: var(--fb-muted); background: var(--fb-surface); font-weight: 700; }.rank-badge--top { border-color: color-mix(in srgb, var(--fb-warning) 45%, var(--fb-border)); color: var(--fb-warning); background: color-mix(in srgb, var(--fb-warning) 9%, var(--fb-panel)); }.factor-identity strong, .factor-identity code { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.factor-identity strong { color: var(--fb-heading); font-size: 11px; }.factor-identity code { margin-top: 2px; color: var(--fb-faint); font-size: 8px; }.score-cell strong { color: var(--fb-heading); font-size: 12px; }.score-cell span, .compact-progress span, .coverage-cell span { display: block; height: 3px; overflow: hidden; margin-top: 5px; border-radius: 999px; background: var(--fb-border-soft); }.score-cell i, .compact-progress i, .coverage-cell i { display: block; height: 100%; border-radius: inherit; background: var(--fb-accent); }.ic-comparison { display: grid; grid-template-columns: 1fr 12px 1fr; align-items: center; gap: 5px; }.ic-comparison > span { display: grid; grid-template-columns: auto 1fr; gap: 5px; }.ic-comparison small { color: var(--fb-faint); }.ic-comparison b { font-variant-numeric: tabular-nums; }.ic-comparison > i { color: var(--fb-faint); font-size: 8px; }.compact-progress strong, .coverage-cell strong { color: var(--fb-heading); font-variant-numeric: tabular-nums; }.compact-progress i { background: var(--fb-cyan); }.coverage-cell i { background: var(--fb-positive); }.significance-cell { display: flex; align-items: center; gap: 6px; }.significance-cell strong { color: var(--fb-heading); font-variant-numeric: tabular-nums; }.significance-cell span { padding: 2px 4px; border-radius: 3px; font-size: 8px; }.significance-cell .pass { color: var(--fb-positive); background: color-mix(in srgb, var(--fb-positive) 9%, var(--fb-panel)); }.significance-cell .fail { color: var(--fb-warning); background: color-mix(in srgb, var(--fb-warning) 9%, var(--fb-panel)); }
.heat-legend { display: flex; align-items: center; gap: 4px; color: var(--fb-faint); font-size: 8px; }.heat-legend i { width: 26px; height: 6px; border-radius: 2px; background: linear-gradient(90deg, var(--fb-danger), var(--fb-surface), var(--fb-positive)); }.correlation-scroll { overflow-x: auto; padding: 12px; }.correlation-matrix { width: 100%; min-width: 520px; border-collapse: separate; border-spacing: 3px; font-size: 10px; }.correlation-matrix th { min-width: 92px; padding: 7px; color: var(--fb-muted); background: var(--fb-surface-strong); font-size: 9px; font-weight: 600; text-align: center; }.correlation-matrix td { min-width: 92px; height: 58px; border-radius: 4px; color: var(--fb-heading); background: var(--fb-surface); text-align: center; font-variant-numeric: tabular-nums; }.correlation-matrix td strong, .correlation-matrix td small { display: block; }.correlation-matrix td strong { font-size: 12px; }.correlation-matrix td small { margin-top: 2px; color: currentColor; font-size: 8px; opacity: .62; }.empty-analysis { display: flex; min-height: 190px; align-items: center; justify-content: center; gap: 8px; color: var(--fb-muted); }
.protocol-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px; }.protocol-grid article { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 8px; padding: 11px; border: 1px solid var(--fb-border); border-radius: 8px; background: var(--fb-surface); }.protocol-grid article > i { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; color: var(--fb-accent); background: var(--fb-accent-soft); }.protocol-grid strong, .protocol-grid span { display: block; }.protocol-grid strong { color: var(--fb-heading); font-size: 10px; }.protocol-grid span { margin-top: 3px; color: var(--fb-muted); font-size: 8px; line-height: 1.45; }.failure-list { display: grid; gap: 7px; padding: 0 12px 12px; }.failure-list article { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; gap: 9px; align-items: center; padding: 10px; border: 1px solid color-mix(in srgb, var(--fb-warning) 28%, var(--fb-border)); border-radius: 8px; background: color-mix(in srgb, var(--fb-warning) 5%, var(--fb-panel)); }.failure-list article > span { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; color: var(--fb-warning); background: color-mix(in srgb, var(--fb-warning) 10%, var(--fb-panel)); }.failure-list strong { color: var(--fb-heading); font-size: 10px; }.failure-list p { margin: 2px 0 0; color: var(--fb-muted); font-size: 9px; }.failure-list em { color: var(--fb-warning); font-size: 8px; font-style: normal; }.diagnostic-success { display: flex; align-items: center; gap: 9px; margin: 0 12px 12px; padding: 12px; border: 1px solid color-mix(in srgb, var(--fb-positive) 30%, var(--fb-border)); border-radius: 8px; color: var(--fb-positive); background: color-mix(in srgb, var(--fb-positive) 6%, var(--fb-panel)); }.diagnostic-success strong, .diagnostic-success span { display: block; }.diagnostic-success strong { color: var(--fb-heading); font-size: 10px; }.diagnostic-success span { margin-top: 2px; color: var(--fb-muted); font-size: 9px; }
@media (max-width: 1500px) { .metric-grid { grid-template-columns: repeat(3, 1fr); }.analysis-grid { grid-template-columns: 1.35fr 1fr; }.distribution-card { grid-column: 1 / 3; }.distribution-legend { grid-template-columns: repeat(5, 1fr); } }
@media (max-width: 1100px) { .research-verdict { grid-template-columns: 36px minmax(0, 1fr); }.research-verdict__chips { grid-column: 2; justify-content: flex-start; }.analysis-grid { grid-template-columns: 1fr; }.distribution-card { grid-column: auto; }.distribution-legend { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) { .benchmark-header { flex-direction: column; }.benchmark-header__meta { align-items: flex-start; }.metric-grid { grid-template-columns: repeat(2, 1fr); }.leader-card__body { grid-template-columns: 1fr; }.protocol-grid { grid-template-columns: 1fr; } }
</style>
