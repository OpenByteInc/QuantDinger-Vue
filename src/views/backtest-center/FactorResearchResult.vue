<template>
  <div class="factor-result" :class="{ 'theme-dark': isDark }">
    <div class="metrics-grid">
      <div v-for="item in metrics" :key="item.key" class="metric-card">
        <span>{{ item.label }}</span>
        <strong :class="item.tone">{{ item.value }}</strong>
      </div>
    </div>
    <a-alert
      v-if="sampleWarning"
      class="sample-alert"
      type="warning"
      show-icon
      :message="sampleWarning.title"
      :description="sampleWarning.description" />
    <section class="chart-card">
      <div class="chart-heading">
        <div><h3>{{ $t('strategyV2.factorResearch.dashboard') }}</h3><span>{{ $t('strategyV2.factorResearch.pointInTimeHint') }}</span></div>
        <div class="chart-tags">
          <a-tag v-if="groupsAdjusted" color="orange">{{ $t('strategyV2.factorResearch.groupsAdjusted', { requested: result.requestedGroups, effective: result.effectiveGroups }) }}</a-tag>
          <a-tag :color="result.neutralized ? 'green' : 'default'">{{ result.neutralized ? $t('strategyV2.factorResearch.neutralized') : $t('strategyV2.factorResearch.rawFactor') }}</a-tag>
        </div>
      </div>
      <div ref="chart" class="factor-chart" />
    </section>
    <a-tabs class="factor-tabs" default-active-key="overview">
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
            <div v-for="(value, columnIndex) in row" :key="`${rowIndex}-${columnIndex}`" class="correlation-cell" :style="correlationCellStyle(value)">{{ formatNumber(value, 3) }}</div>
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
        { key: 'ic', label: this.$t('strategyV2.factorResearch.rankIc'), value: this.formatNumber(this.result.rankIc, 4), tone: this.tone(this.result.rankIc) },
        { key: 'icir', label: this.$t('strategyV2.factorResearch.icir'), value: this.formatNumber(this.result.icir, 3), tone: this.tone(this.result.icir) },
        { key: 'positive', label: this.$t('strategyV2.factorResearch.icPositiveRate'), value: this.formatRate(this.result.icPositiveRate), tone: '' },
        { key: 'monotonicity', label: this.$t('strategyV2.factorResearch.monotonicity'), value: this.formatNumber(this.result.monotonicity, 3), tone: this.tone(this.result.monotonicity) },
        { key: 'coverage', label: this.$t('strategyV2.factorResearch.coverage'), value: this.formatRate(this.result.coverage), tone: '' },
        { key: 'missing', label: this.$t('strategyV2.factorResearch.missingRate'), value: this.formatRate(this.result.missingRate), tone: Number(this.result.missingRate) > 0.2 ? 'negative' : '' },
        { key: 'turnover', label: this.$t('strategyV2.factorResearch.turnover'), value: this.formatRate(this.result.averageTurnover), tone: '' },
        { key: 'longShort', label: this.$t('strategyV2.factorResearch.netLongShort'), value: this.formatRate(this.result.netLongShortReturn), tone: this.tone(this.result.netLongShortReturn) }
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
          { name: longShortName, type: 'line', data: longShort, showSymbol: false, xAxisIndex: 0, yAxisIndex: 0, lineStyle: { width: 2.6, type: 'dashed' } },
          { name: rankIcName, type: 'bar', data: ic, xAxisIndex: 1, yAxisIndex: 1, itemStyle: { color: params => Number(params.value[1]) >= 0 ? '#52c41a' : '#ff4d4f' } },
          { name: rollingIcName, type: 'line', data: rolling, showSymbol: false, xAxisIndex: 1, yAxisIndex: 1, lineStyle: { width: 2 } }
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
    formatNumber (value, digits = 2) { const number = Number(value || 0); return Number.isFinite(number) ? number.toFixed(digits) : '-' },
    formatRate (value) { return `${(Number(value || 0) * 100).toFixed(2)}%` },
    tone (value) { const number = Number(value || 0); return number > 0 ? 'positive' : number < 0 ? 'negative' : '' },
    signedCell (value, digits = 2) { return this.$createElement('span', { class: this.tone(value) }, `${Number(value) > 0 ? '+' : ''}${this.formatNumber(value, digits)}`) },
    percentCell (value) { return this.$createElement('span', { class: this.tone(value) }, `${Number(value) > 0 ? '+' : ''}${this.formatRate(value)}`) },
    correlationCellStyle (value) { const alpha = Math.min(0.8, Math.abs(Number(value || 0)) * 0.75 + 0.08); return { background: Number(value) >= 0 ? `rgba(82,196,26,${alpha})` : `rgba(255,77,79,${alpha})` } }
  }
}
</script>

<style lang="less" scoped>
.metrics-grid { display: grid; grid-template-columns: repeat(8, minmax(105px, 1fr)); gap: 8px; }
.sample-alert { margin-top: 10px; }
.metric-card, .overview-card { padding: 12px; border: 1px solid #edf0f4; border-radius: 8px; background: #f8fafc; }
.metric-card { display: flex; flex-direction: column; gap: 3px; }
.metric-card span, .overview-card span { color: #7c8ca1; font-size: 11px; }
.metric-card strong { color: #20324a; font-size: 18px; }
.positive { color: #16a34a !important; }
.negative { color: #dc2626 !important; }
.chart-card { margin-top: 12px; padding: 13px; border: 1px solid #edf0f4; border-radius: 8px; }
.chart-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.chart-tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.chart-heading h3 { margin: 0; color: #26364c; font-size: 14px; }
.chart-heading span { color: #7c8ca1; font-size: 11px; }
.factor-chart { width: 100%; height: 590px; margin-top: 8px; }
.factor-tabs { margin-top: 12px; }
.overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.overview-card { display: flex; min-height: 76px; flex-direction: column; justify-content: space-between; }
.correlation-grid { display: grid; gap: 1px; overflow: auto; border: 1px solid #303030; background: #303030; }
.correlation-head, .correlation-cell, .correlation-corner { display: flex; min-height: 48px; align-items: center; justify-content: center; padding: 8px; background: #111; }
.correlation-head { color: #a3a3a3; font-size: 11px; font-weight: 700; }
.correlation-cell { color: #fff; font-variant-numeric: tabular-nums; }
.factor-result.theme-dark .metric-card, .factor-result.theme-dark .overview-card { border-color: rgba(255,255,255,.1); background: #0d0d0d; }
.factor-result.theme-dark .metric-card strong, .factor-result.theme-dark .overview-card strong, .factor-result.theme-dark .chart-heading h3 { color: #e5e7eb; }
.factor-result.theme-dark .chart-card { border-color: rgba(255,255,255,.1); }
::v-deep .factor-tooltip { min-width: 190px; }
::v-deep .factor-tooltip-date { margin-bottom: 5px; color: #8c8c8c; font-weight: 600; }
::v-deep .factor-tooltip-row { display: grid; grid-template-columns: 14px minmax(90px, 1fr) auto; align-items: center; gap: 5px; line-height: 24px; }
::v-deep .factor-tooltip-row strong { margin-left: 14px; font-variant-numeric: tabular-nums; }
@media (max-width: 1500px) { .metrics-grid { grid-template-columns: repeat(4, 1fr); } }
</style>
