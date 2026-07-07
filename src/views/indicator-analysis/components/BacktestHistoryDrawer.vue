<template>
  <a-drawer
    :title="$t('dashboard.indicator.backtest.historyTitle')"
    :visible="visible"
    :width="isMobile ? '100%' : 1060"
    :maskClosable="true"
    :wrapClassName="drawerWrapClass"
    @close="$emit('cancel')"
    class="backtest-history-drawer"
  >
    <div class="drawer-toolbar">
      <div class="toolbar-left">
        <a-button type="primary" :loading="loading" icon="reload" size="small" @click="loadRuns">
          {{ $t('dashboard.indicator.backtest.historyRefresh') }}
        </a-button>
        <span class="row-click-hint">{{ $t('dashboard.indicator.backtest.historyRowClickHint') }}</span>
      </div>
      <div class="toolbar-right">
        <a-input
          v-model="filterSymbol"
          style="width: 160px"
          size="small"
          allow-clear
          :placeholder="$t('dashboard.indicator.backtest.historyFilterSymbol')"
          @change="debouncedLoad"
        />
        <a-select
          v-model="filterTimeframe"
          style="width: 100px"
          size="small"
          :placeholder="$t('dashboard.indicator.backtest.historyFilterTimeframe')"
          allow-clear
          @change="loadRuns"
        >
          <a-select-option v-for="tf in timeframes" :key="tf" :value="tf">{{ tf }}</a-select-option>
        </a-select>
      </div>
    </div>

    <a-table
      :columns="columns"
      :data-source="runs"
      :loading="loading"
      size="small"
      :pagination="{ pageSize: 15, size: 'small' }"
      rowKey="id"
      :scroll="{ x: 1090 }"
      :customRow="customRowProps"
    >
      <template slot="symbol" slot-scope="text, record">
        <span style="font-weight: 600;">{{ record.symbol || '-' }}</span>
        <a-tag v-if="record.market" size="small" style="margin-left: 4px;">{{ record.market }}</a-tag>
      </template>
      <template slot="range" slot-scope="text, record">
        <span>{{ (record.start_date || '').slice(0, 10) }} ~ {{ (record.end_date || '').slice(0, 10) }}</span>
      </template>
      <template slot="returnPct" slot-scope="text">
        <span v-if="text !== null && text !== undefined" :style="{ color: text >= 0 ? '#52c41a' : '#f5222d', fontWeight: 600 }">
          {{ text >= 0 ? '+' : '' }}{{ Number(text).toFixed(2) }}%
        </span>
        <span v-else>-</span>
      </template>
      <template slot="fillTiming" slot-scope="text, record">
        <a-tag v-if="fillTimingKind(record) === 'same'" size="small" color="orange">
          {{ $t('dashboard.indicator.backtest.historyFillTimingSame') }}
        </a-tag>
        <a-tag v-else size="small" color="blue">
          {{ $t('dashboard.indicator.backtest.historyFillTimingNext') }}
        </a-tag>
      </template>
      <template slot="simulation" slot-scope="text, record">
        <a-tag v-if="simulationKind(record) === 'aggressive_1m'" size="small" color="geekblue">
          {{ simulationLabel(record) }}
        </a-tag>
        <a-tag v-else-if="simulationKind(record) === 'strict'" size="small" color="blue">
          {{ simulationLabel(record) }}
        </a-tag>
        <a-tag v-else-if="simulationFallback(record)" size="small" color="orange">
          {{ simulationLabel(record) }}
        </a-tag>
        <a-tag v-else size="small">
          {{ simulationLabel(record) }}
        </a-tag>
      </template>
      <template slot="createdAt" slot-scope="text">
        <span>{{ formatLocalDateTime(text) }}</span>
      </template>
      <template slot="status" slot-scope="text">
        <a-tag :color="text === 'success' ? 'green' : text === 'failed' ? 'red' : 'blue'">
          {{ text === 'success' ? $t('dashboard.indicator.backtest.historyStatusSuccess') : text === 'failed' ? $t('dashboard.indicator.backtest.historyStatusFailed') : text }}
        </a-tag>
      </template>
    </a-table>

    <a-empty v-if="!loading && runs.length === 0" :description="$t('dashboard.indicator.backtest.historyNoData')" />

  </a-drawer>
</template>

<script>
import request from '@/utils/request'
import moment from 'moment'

export default {
  name: 'BacktestHistoryDrawer',
  props: {
    visible: { type: Boolean, default: false },
    userId: { type: [Number, String], default: 1 },
    indicatorId: { type: [Number, String], default: null },
    strategyId: { type: [Number, String], default: null },
    runType: { type: String, default: '' },
    symbol: { type: String, default: '' },
    market: { type: String, default: '' },
    timeframe: { type: String, default: '' },
    isMobile: { type: Boolean, default: false },
    isDark: { type: Boolean, default: false }
  },
  data () {
    return {
      loading: false,
      detailLoadingId: null,
      filterSymbol: '',
      filterTimeframe: undefined,
      timeframes: ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'],
      runs: [],
      columns: [],
      debounceTimer: null
    }
  },
  computed: {
    isStrategyHistory () {
      return !!this.strategyId || String(this.runType || '').indexOf('strategy_') === 0
    },
    drawerWrapClass () {
      return this.isDark ? 'backtest-history-drawer-wrap backtest-history-drawer-wrap--dark' : 'backtest-history-drawer-wrap'
    }
  },
  watch: {
    visible (val) {
      if (val) {
        this.initColumns()
        this.filterSymbol = ''
        this.filterTimeframe = undefined
        this.loadRuns()
      }
    }
  },
  methods: {
    customRowProps (record) {
      return {
        class: 'backtest-history-row--clickable',
        on: {
          click: (e) => {
            const el = e && e.target
            if (!el || !el.closest) return
            if (el.closest('button, a')) return
            if (this.detailLoadingId) return
            this.onRowClick(record)
          }
        }
      }
    },
    onRowClick (record) {
      if (!record || !record.id) return
      this.viewRun(record)
    },
    debouncedLoad () {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => this.loadRuns(), 400)
    },
    fillTimingKind (record) {
      const cfg = (record && record.strategy_config) || {}
      const raw = (cfg.execution || {}).signalTiming
      if (raw == null || String(raw).trim() === '') return 'next'
      const r = String(raw).toLowerCase()
      if (r === 'same_bar_close' || r === 'current_bar_close' || r === 'bar_close' || r === 'close') return 'same'
      return 'next'
    },
    simulationSummary (record) {
      return (record && record.simulation_summary) || {}
    },
    simulationKind (record) {
      const sum = this.simulationSummary(record)
      const mode = String(sum.mode || '').toLowerCase()
      if (mode === 'strict') return 'strict'
      if (mode === 'aggressive_1m' || mode === 'mtf') return 'aggressive_1m'
      return 'aggressive_bar'
    },
    simulationFallback (record) {
      return !!this.simulationSummary(record).mtfFallbackReason
    },
    simulationLabel (record) {
      const sum = this.simulationSummary(record)
      const kind = this.simulationKind(record)
      if (sum.mtfFallbackReason && kind === 'aggressive_bar') {
        return this.$t('dashboard.indicator.backtest.historySimulationFallback')
      }
      if (kind === 'strict') {
        return this.$t('dashboard.indicator.backtest.historySimulationStrict')
      }
      if (kind === 'aggressive_1m') {
        const tf = sum.execTimeframe || '1m'
        return this.$t('dashboard.indicator.backtest.historySimulationAggressive1m', { tf })
      }
      return this.$t('dashboard.indicator.backtest.historySimulationAggressiveBar')
    },
    initColumns () {
      const columns = [
        { title: '#', dataIndex: 'id', key: 'id', width: 60 },
        ...(this.isStrategyHistory ? [{ title: this.$t('backtest-center.strategy.selectStrategy') || 'Strategy', dataIndex: 'strategy_name', key: 'strategy_name', width: 180 }] : []),
        { title: this.$t('dashboard.indicator.backtest.historySymbol') || 'Symbol', key: 'symbol', width: 150, scopedSlots: { customRender: 'symbol' } },
        { title: this.$t('dashboard.indicator.backtest.timeframe') || 'TF', dataIndex: 'timeframe', key: 'timeframe', width: 70 },
        { title: this.$t('dashboard.indicator.backtest.historyFillTimingCol'), key: 'fillTiming', width: 96, scopedSlots: { customRender: 'fillTiming' } },
        { title: this.$t('dashboard.indicator.backtest.historySimulationCol'), key: 'simulation', width: 110, scopedSlots: { customRender: 'simulation' } },
        { title: this.$t('dashboard.indicator.backtest.historyRange'), key: 'range', width: 180, scopedSlots: { customRender: 'range' } },
        { title: this.$t('dashboard.indicator.backtest.tradeDirection'), dataIndex: 'trade_direction', key: 'trade_direction', width: 80 },
        { title: this.$t('dashboard.indicator.backtest.leverage'), dataIndex: 'leverage', key: 'leverage', width: 60 },
        { title: this.$t('dashboard.indicator.backtest.totalReturn') || 'Return', dataIndex: 'total_return', key: 'total_return', width: 100, scopedSlots: { customRender: 'returnPct' } },
        { title: this.$t('dashboard.indicator.backtest.historyStatus'), dataIndex: 'status', key: 'status', width: 80, scopedSlots: { customRender: 'status' } },
        { title: this.$t('dashboard.indicator.backtest.historyCreatedAt'), dataIndex: 'created_at', key: 'created_at', width: 180, scopedSlots: { customRender: 'createdAt' } }
      ]
      this.columns = columns
    },
    formatLocalDateTime (value) {
      const m = this.parseDateTimeToLocal(value)
      return m ? m.format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    parseDateTimeToLocal (value) {
      if (!value && value !== 0) return null
      if (moment.isMoment(value)) return value.clone()
      if (typeof value === 'number') {
        return String(value).length <= 10 ? moment.unix(value) : moment(value)
      }
      const raw = String(value).trim()
      if (!raw) return null
      if (/^\d+$/.test(raw)) {
        const n = Number(raw)
        return raw.length <= 10 ? moment.unix(n) : moment(n)
      }
      if (/[zZ]|[-+]\d{2}:\d{2}$/.test(raw)) {
        const zoned = moment(raw)
        return zoned.isValid() ? zoned.local() : null
      }
      if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
        const utcMoment = moment.utc(raw, ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DDTHH:mm:ss', moment.ISO_8601], true)
        return utcMoment.isValid() ? utcMoment.local() : null
      }
      const localMoment = moment(raw)
      return localMoment.isValid() ? localMoment : null
    },
    escapeHtml (str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    },
    formatInlineMarkdown (str) {
      let text = this.escapeHtml(str)
      text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
      text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>')
      text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
      text = text.replace(/_([^_]+)_/g, '<em>$1</em>')
      return text
    },
    markdownToHtml (markdown) {
      const text = String(markdown || '').replace(/\r\n/g, '\n').trim()
      if (!text) return ''

      const lines = text.split('\n')
      const html = []
      let inUl = false
      let inOl = false
      let inCode = false
      let codeLines = []

      const closeLists = () => {
        if (inUl) {
          html.push('</ul>')
          inUl = false
        }
        if (inOl) {
          html.push('</ol>')
          inOl = false
        }
      }

      for (const rawLine of lines) {
        const line = rawLine.trimRight()
        const trimmed = line.trim()

        if (trimmed.startsWith('```')) {
          closeLists()
          if (!inCode) {
            inCode = true
            codeLines = []
          } else {
            html.push(`<pre><code>${this.escapeHtml(codeLines.join('\n'))}</code></pre>`)
            inCode = false
            codeLines = []
          }
          continue
        }

        if (inCode) {
          codeLines.push(rawLine)
          continue
        }

        if (!trimmed) {
          closeLists()
          continue
        }

        if (/^###\s+/.test(trimmed)) {
          closeLists()
          html.push(`<h3>${this.formatInlineMarkdown(trimmed.replace(/^###\s+/, ''))}</h3>`)
          continue
        }
        if (/^##\s+/.test(trimmed)) {
          closeLists()
          html.push(`<h2>${this.formatInlineMarkdown(trimmed.replace(/^##\s+/, ''))}</h2>`)
          continue
        }
        if (/^#\s+/.test(trimmed)) {
          closeLists()
          html.push(`<h1>${this.formatInlineMarkdown(trimmed.replace(/^#\s+/, ''))}</h1>`)
          continue
        }
        if (/^【.+】$/.test(trimmed)) {
          closeLists()
          html.push(`<h3>${this.formatInlineMarkdown(trimmed.replace(/^【|】$/g, ''))}</h3>`)
          continue
        }
        if (/^>\s+/.test(trimmed)) {
          closeLists()
          html.push(`<blockquote>${this.formatInlineMarkdown(trimmed.replace(/^>\s+/, ''))}</blockquote>`)
          continue
        }
        if (/^[-*]\s+/.test(trimmed)) {
          if (inOl) {
            html.push('</ol>')
            inOl = false
          }
          if (!inUl) {
            html.push('<ul>')
            inUl = true
          }
          html.push(`<li>${this.formatInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}</li>`)
          continue
        }
        if (/^\d+\.\s+/.test(trimmed)) {
          if (inUl) {
            html.push('</ul>')
            inUl = false
          }
          if (!inOl) {
            html.push('<ol>')
            inOl = true
          }
          html.push(`<li>${this.formatInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}</li>`)
          continue
        }

        closeLists()
        html.push(`<p>${this.formatInlineMarkdown(trimmed)}</p>`)
      }

      closeLists()
      if (inCode) {
        html.push(`<pre><code>${this.escapeHtml(codeLines.join('\n'))}</code></pre>`)
      }
      return html.join('')
    },
    async loadRuns () {
      if (!this.userId) return
      this.loading = true
      try {
        const params = {
          userid: this.userId,
          limit: 200,
          offset: 0
        }
        if (this.indicatorId) params.indicatorId = this.indicatorId
        if (this.strategyId) params.strategyId = this.strategyId
        params.runType = this.runType || (this.isStrategyHistory ? '' : 'indicator')
        if (this.filterSymbol) params.symbol = this.filterSymbol
        if (this.filterTimeframe) params.timeframe = this.filterTimeframe
        const res = await request({
          url: this.isStrategyHistory ? '/api/strategies/backtest/history' : '/api/indicator/backtest/history',
          method: 'get',
          params
        })
        if (res && res.code === 1 && Array.isArray(res.data)) {
          this.runs = res.data
        } else {
          this.runs = []
        }
      } finally {
        this.loading = false
      }
    },
    async viewRun (record) {
      if (!record || !record.id) return
      this.detailLoadingId = record.id
      try {
        const res = await request({
          url: this.isStrategyHistory ? '/api/strategies/backtest/get' : '/api/indicator/backtest/get',
          method: 'get',
          params: { userid: this.userId, runId: record.id }
        })
        if (res && res.code === 1 && res.data) {
          this.$emit('view', res.data)
        }
      } finally {
        this.detailLoadingId = null
      }
    }
  }
}
</script>

<style lang="less" scoped>
.drawer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
  .toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
}
.row-click-hint {
  font-size: 12px;
  color: #8c8c8c;
  width: 100%;
  flex-basis: 100%;
  margin-top: 2px;
}
::v-deep .ant-table-tbody > tr.backtest-history-row--clickable:hover > td {
  background: #fafafa;
}
</style>

<style lang="less">
.backtest-history-drawer-wrap--dark {
  .ant-drawer-content {
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.85);
  }

  .ant-drawer-header {
    background: #1f1f1f;
    border-bottom-color: #303030;
  }

  .ant-drawer-title {
    color: rgba(255, 255, 255, 0.88);
  }

  .ant-drawer-close {
    color: rgba(255, 255, 255, 0.55);
  }

  .ant-drawer-body {
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.85);
  }

  .row-click-hint {
    color: rgba(255, 255, 255, 0.45);
  }

  .drawer-toolbar {
    .selected-tip {
      color: rgba(255, 255, 255, 0.55);
    }

    .ant-btn-primary.ant-btn-background-ghost {
      color: #69c0ff;
      border-color: var(--primary-color-active, #177ddc);

      &:hover:not(:disabled),
      &:focus:not(:disabled) {
        color: #91d5ff;
        border-color: #3c9ae8;
      }

      &:disabled {
        color: rgba(255, 255, 255, 0.25);
        border-color: #434343;
        background: transparent;
      }
    }
  }

  .ant-input,
  .ant-select-selection,
  .ant-select-selection--single {
    background: #141414 !important;
    border-color: #434343 !important;
    color: rgba(255, 255, 255, 0.88) !important;
  }

  .ant-select-selection-selected-value,
  .ant-select-selection-placeholder,
  .ant-input::placeholder {
    color: rgba(255, 255, 255, 0.45) !important;
  }

  .ant-table {
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
  }

  .ant-table-thead > tr > th {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.65);
    border-bottom-color: #303030;
  }

  .ant-table-tbody > tr > td {
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    border-bottom-color: #303030;
  }

  .ant-table-tbody > tr:hover > td {
    background: rgba(255, 255, 255, 0.04);
  }

  .ant-pagination-total-text {
    color: rgba(255, 255, 255, 0.65);
  }

  .ant-pagination-item {
    background: #1f1f1f;
    border-color: #434343;
  }

  .ant-pagination-item a,
  .ant-pagination-prev .ant-pagination-item-link,
  .ant-pagination-next .ant-pagination-item-link {
    color: rgba(255, 255, 255, 0.65);
    background: #1f1f1f;
    border-color: #434343;
  }

  .ant-empty-description {
    color: rgba(255, 255, 255, 0.45);
  }

  .ant-alert-warning {
    background: rgba(250, 173, 20, 0.12);
    border-color: rgba(250, 173, 20, 0.35);
  }

  .ant-alert-warning .ant-alert-message,
  .ant-alert-warning .ant-alert-description {
    color: rgba(255, 255, 255, 0.82);
  }
}
</style>
