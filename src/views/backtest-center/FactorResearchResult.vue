<template>
  <div class="factor-result" :class="{ 'theme-dark': isDark }">
    <section class="factor-summary-panel">
      <div class="metrics-grid">
        <div v-for="item in metrics" :key="item.key" class="metric-card" :class="{ 'metric-card--featured': item.featured }">
          <span class="metric-card__label">{{ item.label }}</span>
          <strong :class="item.tone">{{ item.value }}</strong>
          <i class="metric-card__accent" aria-hidden="true" />
        </div>
      </div>
    </section>
    <a-alert
      v-if="sampleWarning"
      class="sample-alert sample-quality-banner"
      type="warning"
      show-icon
      :message="sampleWarning.title"
      :description="sampleWarning.description" />
    <section class="chart-card factor-analysis-card">
      <div class="chart-heading">
        <div class="chart-heading__copy"><h3>{{ $t('strategyV2.factorResearch.dashboard') }}</h3><span>{{ $t('strategyV2.factorResearch.pointInTimeHint') }}</span></div>
        <div class="chart-tags">
          <a-tag v-if="groupsAdjusted" color="orange">{{ $t('strategyV2.factorResearch.groupsAdjusted', { requested: result.requestedGroups, effective: result.effectiveGroups }) }}</a-tag>
          <a-tag :color="result.neutralized ? 'green' : 'default'">{{ result.neutralized ? $t('strategyV2.factorResearch.neutralized') : $t('strategyV2.factorResearch.rawFactor') }}</a-tag>
          <a-tag>{{ $t('strategyV2.factorResearch.longShortConvention', { exposure: longShortGrossExposure }) }}</a-tag>
        </div>
      </div>
      <div ref="chart" class="factor-chart" />
    </section>
    <a-tabs class="factor-tabs factor-detail-tabs" default-active-key="overview">
      <a-tab-pane key="overview" :tab="$t('strategyV2.backtest.tabs.overview')">
        <div class="overview-grid">
          <div class="overview-card"><span>{{ $t('strategyV2.factorResearch.firstHalfIc') }}</span><strong>{{ formatNumber(stability.firstHalfIc, 4) }}</strong></div>
          <div class="overview-card"><span>{{ $t('strategyV2.factorResearch.secondHalfIc') }}</span><strong>{{ formatNumber(stability.secondHalfIc, 4) }}</strong></div>
          <div class="overview-card"><span>{{ $t('strategyV2.factorResearch.rankAutocorrelation') }}</span><strong>{{ formatNumber(stability.rankAutocorrelation, 4) }}</strong></div>
          <div class="overview-card"><span>{{ $t('strategyV2.factorResearch.executionRule') }}</span><strong>{{ $t('strategyV2.factorResearch.nextOpenRule') }}</strong></div>
        </div>
      </a-tab-pane>
      <a-tab-pane key="ic" :tab="$t('strategyV2.factorResearch.tabs.ic')">
        <a-table :columns="icColumns" :data-source="result.icSeries || []" row-key="time" size="small" :pagination="{ pageSize: 10 }" />
      </a-tab-pane>
      <a-tab-pane key="groups" :tab="$t('strategyV2.factorResearch.tabs.groups')">
        <a-table :columns="groupColumns" :data-source="groupSummary" row-key="group" size="small" :pagination="false" />
      </a-tab-pane>
      <a-tab-pane key="correlation" :tab="$t('strategyV2.factorResearch.tabs.correlation')">
        <div class="correlation-grid" :style="correlationStyle">
          <div class="correlation-corner" />
          <div v-for="factor in correlation.factors || []" :key="`head-${factor}`" class="correlation-head">{{ factor }}</div>
          <template v-for="(row, rowIndex) in correlation.matrix || []">
            <div :key="`label-${rowIndex}`" class="correlation-head">{{ correlation.factors[rowIndex] }}</div>
            <div v-for="(value, columnIndex) in row" :key="`${rowIndex}-${columnIndex}`" class="correlation-cell" :style="correlationCellStyle(value)">
              <strong>{{ formatNumber(value, 3) }}</strong>
              <small v-if="correlationObservation(rowIndex, columnIndex)">{{ $t('strategyV2.factorResearch.correlationObservations', { count: correlationObservation(rowIndex, columnIndex) }) }}</small>
            </div>
          </template>
        </div>
      </a-tab-pane>
      <a-tab-pane key="observations" :tab="$t('strategyV2.factorResearch.tabs.observations')">
        <a-table
          :columns="observationColumns"
          :data-source="result.groupObservations || []"
          :row-key="(row, index) => `${row.time}-${row.group}-${index}`"
          size="small"
          :pagination="{ pageSize: 10 }"
          :scroll="{ x: 900 }" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import moment from 'moment'

export default {
  name: 'FactorResearchResult',
  props: {
    result: { type: Object, required: true },
    isDark: { type: Boolean, default: false }
  },
  data () { return { chart: null, resizeObserver: null } },
  computed: {
    stability () { return this.result.stability || {} },
    correlation () { return this.result.factorCorrelation || {} },
    sampleDiagnostics () { return this.result.sampleDiagnostics || {} },
    executionAssumptions () { return this.result.executionAssumptions || {} },
    longShortGrossExposure () { return this.formatNumber(this.executionAssumptions.longShortGrossExposure || 2, 1) },
    isExploratory () { return this.sampleDiagnostics.quality === 'insufficient' },
    groupsAdjusted () { return Number(this.result.effectiveGroups || 0) < Number(this.result.requestedGroups || 0) },
    sampleWarning () {
      const warnings = this.sampleDiagnostics.warnings || []
      if (!warnings.length) return null
      const description = warnings.map(item => this.$t(`strategyV2.factorResearch.sampleWarning.${item}`, {
        requested: this.sampleDiagnostics.requestedGroups,
        effective: this.sampleDiagnostics.effectiveGroups,
        members: this.sampleDiagnostics.medianCrossSectionSize,
        perGroup: this.formatNumber(this.sampleDiagnostics.medianMembersPerGroup, 1),
        observations: this.sampleDiagnostics.icObservations
      })).join(' ')
      return {
        title: this.$t(`strategyV2.factorResearch.sampleQuality.${this.sampleDiagnostics.quality || 'limited'}`),
        description
      }
    },
    correlationStyle () { return { gridTemplateColumns: `minmax(120px, 1.3fr) repeat(${(this.correlation.factors || []).length}, minmax(90px, 1fr))` } },
    metrics () {
      return [
        { key: 'ic', label: this.$t('strategyV2.factorResearch.rankIc'), value: this.formatNumber(this.result.rankIc, 4), tone: this.isExploratory ? '' : this.tone(this.result.rankIc), featured: true },
        { key: 'icir', label: this.$t('strategyV2.factorResearch.icir'), value: this.formatNumber(this.result.icir, 3), tone: this.isExploratory ? '' : this.tone(this.result.icir), featured: true },
        { key: 'positive', label: this.$t('strategyV2.factorResearch.icPositiveRate'), value: this.formatRate(this.result.icPositiveRate), tone: '' },
        { key: 'monotonicity', label: this.$t('strategyV2.factorResearch.monotonicity'), value: Number(this.result.effectiveGroups) < 3 ? this.$t('strategyV2.factorResearch.notApplicable') : this.formatNumber(this.result.monotonicity, 3), tone: Number(this.result.effectiveGroups) < 3 ? '' : this.tone(this.result.monotonicity) },
        { key: 'coverage', label: this.$t('strategyV2.factorResearch.coverage'), value: this.formatRate(this.result.coverage), tone: '' },
        { key: 'missing', label: this.$t('strategyV2.factorResearch.missingRate'), value: this.formatRate(this.result.missingRate), tone: Number(this.result.missingRate) > 0.2 ? 'negative' : '' },
        { key: 'turnover', label: this.$t('strategyV2.factorResearch.turnover'), value: this.formatRate(this.result.averageTurnover), tone: '' },
        { key: 'longShort', label: this.$t('strategyV2.factorResearch.netLongShort'), value: this.formatRate(this.result.netLongShortReturn), tone: this.tone(this.result.netLongShortReturn), featured: true }
      ]
    },
    groupSummary () {
      return (this.result.groupCurves || []).map(item => ({ group: item.group, finalGross: item.finalGross - 1, finalNet: item.finalNet - 1, observations: (item.points || []).length }))
    },
    icColumns () {
      return [
        { title: this.$t('strategyV2.backtest.time'), dataIndex: 'time', customRender: this.formatDate },
        { title: this.$t('strategyV2.factorResearch.rankIc'), dataIndex: 'value', customRender: value => this.signedCell(value, 4) },
        { title: this.$t('strategyV2.factorResearch.rollingIc'), dataIndex: 'rolling', customRender: value => value == null ? '-' : this.signedCell(value, 4) }
      ]
    },
    groupColumns () {
      return [
        { title: this.$t('strategyV2.factorResearch.group'), dataIndex: 'group', customRender: value => `Q${value}` },
        { title: this.$t('strategyV2.factorResearch.grossReturn'), dataIndex: 'finalGross', customRender: value => this.percentCell(value) },
        { title: this.$t('strategyV2.factorResearch.netReturn'), dataIndex: 'finalNet', customRender: value => this.percentCell(value) },
        { title: this.$t('strategyV2.factorResearch.observations'), dataIndex: 'observations' }
      ]
    },
    observationColumns () {
      return [
        { title: this.$t('strategyV2.backtest.time'), dataIndex: 'time', width: 165, customRender: this.formatDate },
        { title: this.$t('strategyV2.factorResearch.group'), dataIndex: 'group', customRender: value => `Q${value}` },
        { title: this.$t('strategyV2.factorResearch.grossReturn'), dataIndex: 'grossReturn', customRender: value => this.percentCell(value) },
        { title: this.$t('strategyV2.factorResearch.netReturn'), dataIndex: 'netReturn', customRender: value => this.percentCell(value) },
        { title: this.$t('strategyV2.factorResearch.turnover'), dataIndex: 'turnover', customRender: this.formatRate },
        { title: this.$t('strategyV2.factorResearch.members'), dataIndex: 'members', width: 360, customRender: value => (value || []).join(', ') }
      ]
    }
  },
  watch: { result: { deep: true, handler () { this.$nextTick(this.renderChart) } }, isDark () { this.$nextTick(this.renderChart) } },
  mounted () { this.renderChart(); window.addEventListener('resize', this.resizeChart) },
  beforeDestroy () { window.removeEventListener('resize', this.resizeChart); if (this.resizeObserver) this.resizeObserver.disconnect(); if (this.chart) this.chart.dispose() },
  methods: {
    renderChart () {
      if (!this.$refs.chart) return
      if (!this.chart) {
        this.chart = echarts.init(this.$refs.chart)
        if (typeof ResizeObserver !== 'undefined') { this.resizeObserver = new ResizeObserver(this.resizeChart); this.resizeObserver.observe(this.$refs.chart) }
      }
      const text = this.isDark ? '#8c8c8c' : '#64748b'
      const grid = this.isDark ? '#242424' : '#e8edf3'
      const groupSeries = (this.result.groupCurves || []).map(item => ({ name: `Q${item.group}`, type: 'line', data: (item.points || []).map(point => [moment(point.time).valueOf(), Number(point.net)]), showSymbol: false, xAxisIndex: 0, yAxisIndex: 0 }))
      const longShort = (this.result.longShortCurve || []).map(point => [moment(point.time).valueOf(), Number(point.net)])
      const ic = (this.result.icSeries || []).map(point => [moment(point.time).valueOf(), Number(point.value)])
      const rolling = (this.result.icSeries || []).filter(point => point.rolling != null).map(point => [moment(point.time).valueOf(), Number(point.rolling)])
      const longShortName = this.$t('strategyV2.factorResearch.longShortNetValue')
      const rankIcName = this.$t('strategyV2.factorResearch.rankIc')
      const rollingIcName = this.$t('strategyV2.factorResearch.rollingIc')
      const upperLegend = [...groupSeries.map(item => item.name), longShortName]
      const lowerLegend = [rankIcName, rollingIcName]
      this.chart.setOption({
        animationDuration: 260,
        color: ['#52c41a', '#69c0ff', '#9254de', '#faad14', '#ff7875', '#13c2c2', '#2f54eb'],
        tooltip: { trigger: 'axis', confine: true, axisPointer: { type: 'cross' }, formatter: this.tooltipFormatter, backgroundColor: this.isDark ? 'rgba(14,14,14,.98)' : '#fff', borderColor: grid, textStyle: { color: this.isDark ? '#f5f5f5' : '#1f2937' } },
        legend: [
          { type: 'scroll', data: upperLegend, top: 8, left: 64, right: 24, itemGap: 16, textStyle: { color: text } },
          { type: 'scroll', data: lowerLegend, top: 310, left: 64, right: 24, itemGap: 16, textStyle: { color: text } }
        ],
        axisPointer: {
          link: [{ xAxisIndex: [0, 1] }],
          label: { formatter: params => params.axisDimension === 'y' ? this.formatNumber(params.value, 3) : moment(params.value).format('YYYY-MM-DD') }
        },
        grid: [
          { left: 64, right: 35, top: 52, height: 220 },
          { left: 64, right: 35, top: 354, height: 158 }
        ],
        xAxis: [0, 1].map(index => ({ type: 'time', gridIndex: index, axisLabel: { color: text }, axisLine: { lineStyle: { color: grid } }, splitLine: { show: false } })),
        yAxis: [
          { type: 'value', gridIndex: 0, scale: true, axisLabel: { color: text, formatter: value => this.formatNumber(value, 2) }, splitLine: { lineStyle: { color: grid, type: 'dashed' } } },
          { type: 'value', gridIndex: 1, min: -1, max: 1, axisLabel: { color: text, formatter: value => this.formatNumber(value, 2) }, splitLine: { lineStyle: { color: grid, type: 'dashed' } } }
        ],
        dataZoom: [{ type: 'inside', xAxisIndex: [0, 1] }, { type: 'slider', xAxisIndex: [0, 1], height: 20, bottom: 4, showDetail: false }],
        series: [
          ...groupSeries,
          { name: longShortName, type: 'line', data: longShort, showSymbol: false, xAxisIndex: 0, yAxisIndex: 0, lineStyle: { width: 2.8, type: 'dashed' }, areaStyle: { opacity: this.isDark ? 0.08 : 0.05 } },
          { name: rankIcName, type: 'bar', data: ic, xAxisIndex: 1, yAxisIndex: 1, barMaxWidth: 12, itemStyle: { borderRadius: [3, 3, 0, 0], color: params => Number(params.value[1]) >= 0 ? '#52c41a' : '#ff4d4f' } },
          { name: rollingIcName, type: 'line', data: rolling, showSymbol: false, xAxisIndex: 1, yAxisIndex: 1, lineStyle: { width: 2.4 }, areaStyle: { opacity: this.isDark ? 0.06 : 0.04 } }
        ]
      }, true)
    },
    tooltipFormatter (params) {
      const rows = Array.isArray(params) ? params : [params]
      if (!rows.length) return ''
      const timestamp = Array.isArray(rows[0].value) ? rows[0].value[0] : rows[0].axisValue
      const body = rows.map(item => {
        const value = Array.isArray(item.value) ? item.value[1] : item.value
        return `<div class="factor-tooltip-row">${item.marker}${item.seriesName}<strong>${this.formatNumber(value, 4)}</strong></div>`
      }).join('')
      return `<div class="factor-tooltip"><div class="factor-tooltip-date">${moment(timestamp).format('YYYY-MM-DD')}</div>${body}</div>`
    },
    resizeChart () { if (this.chart) this.chart.resize() },
    formatDate (value) { return value ? moment(value).format('YYYY-MM-DD') : '-' },
    formatNumber (value, digits = 2) { if (value === null || value === undefined || value === '') return '—'; const number = Number(value); return Number.isFinite(number) ? number.toFixed(digits) : '—' },
    formatRate (value) { if (value === null || value === undefined || value === '') return '—'; const number = Number(value); return Number.isFinite(number) ? `${(number * 100).toFixed(2)}%` : '—' },
    tone (value) { if (value === null || value === undefined || value === '') return ''; const number = Number(value); return number > 0 ? 'positive' : number < 0 ? 'negative' : '' },
    correlationObservation (rowIndex, columnIndex) { const rows = Array.isArray(this.correlation.observations) ? this.correlation.observations : []; const count = rows[rowIndex] && rows[rowIndex][columnIndex]; return Number.isFinite(Number(count)) ? Number(count) : 0 },
    signedCell (value, digits = 2) { return this.$createElement('span', { class: this.tone(value) }, `${Number(value) > 0 ? '+' : ''}${this.formatNumber(value, digits)}`) },
    percentCell (value) { return this.$createElement('span', { class: this.tone(value) }, `${Number(value) > 0 ? '+' : ''}${this.formatRate(value)}`) },
    correlationCellStyle (value) {
      if (value === null || value === undefined || value === '') return { background: 'var(--factor-surface)', color: 'var(--factor-muted)' }
      const number = Number(value)
      const intensity = Math.abs(number)
      const alpha = this.isDark
        ? Math.min(0.8, intensity * 0.75 + 0.08)
        : Math.min(0.42, intensity * 0.34 + 0.06)
      return {
        background: number >= 0
          ? `rgba(82,196,26,${alpha})`
          : `rgba(255,77,79,${alpha})`,
        color: this.isDark ? '#fff' : '#1f2937'
      }
    }
  }
}
</script>

<style lang="less" scoped>
.factor-result { --factor-border: #e7ecf2; --factor-surface: #fff; --factor-surface-soft: #f7f9fc; --factor-text: #20324a; --factor-muted: #718096; }
.factor-summary-panel { padding: 10px; border: 1px solid var(--factor-border); border-radius: 12px; background: var(--factor-surface-soft); }
.metrics-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; }
.sample-alert { margin-top: 12px; }
.metric-card, .overview-card { position: relative; overflow: hidden; padding: 13px 14px; border: 1px solid var(--factor-border); border-radius: 9px; background: var(--factor-surface); }
.metric-card { display: flex; min-width: 0; min-height: 76px; flex-direction: column; justify-content: space-between; gap: 8px; }
.metric-card__label, .overview-card span { color: var(--factor-muted); font-size: 11px; line-height: 1.35; }
.metric-card strong { color: var(--factor-text); font-size: 20px; font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
.metric-card__accent { position: absolute; right: 12px; bottom: 0; left: 12px; height: 2px; border-radius: 2px 2px 0 0; background: #d8dee8; }
.metric-card--featured { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 24%, var(--factor-border)); box-shadow: 0 5px 18px rgba(15, 23, 42, .035); }
.metric-card--featured .metric-card__accent { background: var(--primary-color, #52c41a); }
.sample-quality-banner { border: 1px solid #f1d48a; border-left: 4px solid #d99b12; border-radius: 10px; background: #fffbeb; }
.sample-quality-banner /deep/ .ant-alert-icon { color: #d99b12; }
.sample-quality-banner /deep/ .ant-alert-message { color: #4a3a12; font-weight: 700; }
.sample-quality-banner /deep/ .ant-alert-description { color: #735f2d; font-size: 12px; line-height: 1.6; }
.positive { color: #16a34a !important; }
.negative { color: #dc2626 !important; }
.chart-card { margin-top: 12px; padding: 15px; border: 1px solid var(--factor-border); border-radius: 12px; background: var(--factor-surface); box-shadow: 0 8px 24px rgba(15, 23, 42, .025); }
.chart-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.chart-heading__copy { min-width: 0; padding-left: 10px; border-left: 3px solid var(--primary-color, #52c41a); }
.chart-tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.chart-tags /deep/ .ant-tag { margin: 0; border-radius: 6px; font-size: 10px; line-height: 22px; }
.chart-heading h3 { margin: 0; color: var(--factor-text); font-size: 14px; }
.chart-heading span { color: var(--factor-muted); font-size: 11px; }
.factor-chart { width: 100%; height: 560px; margin-top: 8px; }
.factor-tabs { margin-top: 14px; }
.factor-detail-tabs { padding: 0 14px 14px; border: 1px solid var(--factor-border); border-radius: 12px; background: var(--factor-surface); }
.factor-detail-tabs /deep/ .ant-tabs-bar { margin: 0 -14px 14px; padding: 0 14px; border-bottom-color: var(--factor-border); border-radius: 12px 12px 0 0; background: var(--factor-surface-soft); }
.factor-detail-tabs /deep/ .ant-tabs-tab { padding: 13px 2px 11px; color: var(--factor-muted); font-weight: 600; }
.overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.overview-card { display: flex; min-height: 84px; flex-direction: column; justify-content: space-between; }
.overview-card strong { color: var(--factor-text); font-size: 14px; }
.correlation-grid { display: grid; gap: 1px; overflow: auto; border: 1px solid #e2e8f0; border-radius: 8px; background: #e2e8f0; }
.correlation-head, .correlation-cell, .correlation-corner { display: flex; min-height: 48px; align-items: center; justify-content: center; padding: 8px; background: #fff; }
.correlation-head, .correlation-corner { background: #f8fafc; }
.correlation-head { color: #475569; font-size: 11px; font-weight: 700; }
.correlation-cell { color: #1f2937; font-variant-numeric: tabular-nums; }
.correlation-cell { flex-direction: column; gap: 2px; }
.correlation-cell strong { font-size: 12px; }
.correlation-cell small { color: currentColor; font-size: 9px; opacity: .72; }
.factor-result.theme-dark { --factor-border: #2d2d2d; --factor-surface: #111; --factor-surface-soft: #151515; --factor-text: #f1f5f9; --factor-muted: rgba(255,255,255,.5); }
.factor-result.theme-dark .factor-summary-panel { background: #0d0d0d; }
.factor-result.theme-dark .metric-card, .factor-result.theme-dark .overview-card { background: #151515; }
.factor-result.theme-dark .metric-card--featured { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 34%, #2d2d2d); box-shadow: none; }
.factor-result.theme-dark .metric-card__accent { background: #343434; }
.factor-result.theme-dark .metric-card--featured .metric-card__accent { background: var(--primary-color, #52c41a); }
.factor-result.theme-dark .sample-quality-banner { border-color: #5c4515; border-left-color: #d99b12; background: #201b0e; }
.factor-result.theme-dark .sample-quality-banner /deep/ .ant-alert-message { color: #f5d879; }
.factor-result.theme-dark .sample-quality-banner /deep/ .ant-alert-description { color: rgba(255,255,255,.58); }
.factor-result.theme-dark .chart-tags /deep/ .ant-tag { border-color: #3a3a3a; color: rgba(255,255,255,.76); background: #1b1b1b; }
.factor-result.theme-dark .chart-tags /deep/ .ant-tag-orange { border-color: #765b1a; color: #f5d879; background: #2b230f; }
.factor-result.theme-dark .chart-tags /deep/ .ant-tag-green { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 40%, #303030); color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 9%, #111); }
.factor-result.theme-dark .correlation-grid { border-color: #303030; background: #303030; }
.factor-result.theme-dark .correlation-head, .factor-result.theme-dark .correlation-corner { color: #a3a3a3; background: #111; }
::v-deep .factor-tooltip { min-width: 190px; }
::v-deep .factor-tooltip-date { margin-bottom: 5px; color: #8c8c8c; font-weight: 600; }
::v-deep .factor-tooltip-row { display: grid; grid-template-columns: 14px minmax(90px, 1fr) auto; align-items: center; gap: 5px; line-height: 24px; }
::v-deep .factor-tooltip-row strong { margin-left: 14px; font-variant-numeric: tabular-nums; }
@media (max-width: 1050px) { .metrics-grid, .overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .metrics-grid, .overview-grid { grid-template-columns: 1fr; } .chart-heading { flex-direction: column; } .chart-tags { justify-content: flex-start; } }
</style>
