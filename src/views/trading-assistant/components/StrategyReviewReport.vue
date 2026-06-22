<template>
  <div class="strategy-review-report strategy-tab-pane-inner" :class="{ 'theme-dark': isDark }">
    <div class="review-toolbar">
      <div class="review-title-block">
        <div class="review-title">
          <a-icon type="audit" />
          <span>{{ $t('strategyReview.title') }}</span>
        </div>
        <div class="review-subtitle">{{ $t('strategyReview.subtitle') }}</div>
      </div>
      <div class="review-actions">
        <a-select
          v-model="selectedHistoryId"
          size="small"
          class="history-select"
          :placeholder="$t('strategyReview.historyPlaceholder')"
          :loading="historyLoading"
          :not-found-content="$t('strategyReview.historyEmpty')"
          allow-clear
          @change="handleHistoryChange">
          <a-select-option v-for="item in history" :key="item.id" :value="item.id">
            {{ formatHistoryLabel(item) }}
          </a-select-option>
        </a-select>
        <a-button size="small" :loading="historyLoading" :title="$t('strategyReview.historyRefresh')" @click="loadHistory">
          <a-icon type="reload" />
        </a-button>
        <a-select v-model="lookbackDays" size="small" class="lookback-select">
          <a-select-option :value="7">{{ $t('strategyReview.lookback7') }}</a-select-option>
          <a-select-option :value="30">{{ $t('strategyReview.lookback30') }}</a-select-option>
          <a-select-option :value="90">{{ $t('strategyReview.lookback90') }}</a-select-option>
        </a-select>
        <a-checkbox v-model="includeAi">{{ $t('strategyReview.includeAi') }}</a-checkbox>
        <a-button type="primary" size="small" :loading="loading" @click="loadReport">
          <a-icon type="thunderbolt" />
          {{ hasReport ? $t('strategyReview.regenerate') : $t('strategyReview.generate') }}
        </a-button>
      </div>
    </div>

    <a-spin :spinning="loading">
      <a-empty
        v-if="!hasReport && !loading"
        class="strategy-tab-empty review-empty"
        :description="$t('strategyReview.emptyDesc')">
        <a-button type="primary" @click="loadReport">
          <a-icon type="audit" />
          {{ $t('strategyReview.generate') }}
        </a-button>
      </a-empty>

      <template v-if="hasReport">
        <div v-if="historyMeta" class="history-meta">
          <a-icon type="clock-circle" />
          <span>{{ historyMeta }}</span>
        </div>

        <div class="ai-summary-panel">
          <div class="panel-head">
            <span class="panel-title">
              <a-icon type="robot" />
              {{ $t('strategyReview.aiSummary') }}
            </span>
            <div class="ai-status-block">
              <a-tag :color="aiStatusColor">{{ aiStatusLabel }}</a-tag>
              <span v-if="aiStatusDetail" class="panel-sub ai-status-detail">{{ aiStatusDetail }}</span>
            </div>
          </div>
          <div class="summary-text">{{ aiSummary }}</div>
          <div v-if="aiDiagnosis.length" class="ai-list-grid">
            <div class="ai-list-block">
              <div class="list-title">{{ $t('strategyReview.aiDiagnosis') }}</div>
              <ul>
                <li v-for="(item, idx) in aiDiagnosis" :key="'diag-' + idx">{{ item }}</li>
              </ul>
            </div>
            <div class="ai-list-block">
              <div class="list-title">{{ $t('strategyReview.aiRecommendations') }}</div>
              <ul>
                <li v-for="(item, idx) in aiRecommendations" :key="'rec-' + idx">{{ item }}</li>
              </ul>
            </div>
          </div>
          <div v-if="aiCautions.length" class="caution-line">
            <a-icon type="info-circle" />
            <span>{{ aiCautions[0] }}</span>
          </div>
        </div>

        <div class="metrics-grid">
          <div
            v-for="card in metricCards"
            :key="card.key"
            class="metric-card"
            :class="card.tone">
            <div class="metric-label">{{ card.label }}</div>
            <div class="metric-value">{{ card.value }}</div>
            <div v-if="card.hint" class="metric-hint">{{ card.hint }}</div>
          </div>
        </div>

        <div class="review-grid">
          <div class="review-panel">
            <div class="panel-head">
              <span class="panel-title">
                <a-icon type="safety-certificate" />
                {{ $t('strategyReview.ruleDiagnostics') }}
              </span>
              <span class="panel-sub">{{ $t('strategyReview.ruleDiagnosticsHint') }}</span>
            </div>
            <div v-if="diagnostics.length" class="review-items">
              <div v-for="item in diagnostics" :key="item.code" class="review-item">
                <a-tag :color="severityColor(item.severity)">{{ severityLabel(item.severity) }}</a-tag>
                <div class="review-item-body">
                  <div class="review-item-title">{{ item.title }}</div>
                  <div class="review-item-detail">{{ item.detail }}</div>
                </div>
              </div>
            </div>
            <a-empty v-else :description="$t('strategyReview.noDiagnostics')" :image="false" />
          </div>

          <div class="review-panel">
            <div class="panel-head">
              <span class="panel-title">
                <a-icon type="bulb" />
                {{ $t('strategyReview.ruleRecommendations') }}
              </span>
              <span class="panel-sub">{{ $t('strategyReview.ruleRecommendationsHint') }}</span>
            </div>
            <div v-if="recommendations.length" class="review-items">
              <div v-for="item in recommendations" :key="item.code" class="review-item">
                <a-tag :color="priorityColor(item.priority)">{{ priorityLabel(item.priority) }}</a-tag>
                <div class="review-item-body">
                  <div class="review-item-title">{{ item.title }}</div>
                  <div class="review-item-detail">{{ item.detail }}</div>
                </div>
              </div>
            </div>
            <a-empty v-else :description="$t('strategyReview.noRecommendations')" :image="false" />
          </div>
        </div>
      </template>
    </a-spin>
  </div>
</template>

<script>
import { getStrategyReviewReport, getStrategyReviewReportHistory } from '@/api/strategy'

export default {
  name: 'StrategyReviewReport',
  props: {
    strategyId: { type: [Number, String], default: null },
    isDark: { type: Boolean, default: false },
    botType: { type: String, default: '' }
  },
  data () {
    return {
      loading: false,
      historyLoading: false,
      report: null,
      history: [],
      selectedHistoryId: null,
      lookbackDays: 30,
      includeAi: true
    }
  },
  computed: {
    hasReport () {
      return !!this.report
    },
    metrics () {
      return (this.report && this.report.metrics) || {}
    },
    ai () {
      return (this.report && this.report.ai) || {}
    },
    aiSummary () {
      return this.ai.summary || this.$t('strategyReview.aiSummaryEmpty')
    },
    aiDiagnosis () {
      return Array.isArray(this.ai.diagnosis) ? this.ai.diagnosis : []
    },
    aiRecommendations () {
      return Array.isArray(this.ai.recommendations) ? this.ai.recommendations : []
    },
    aiCautions () {
      return Array.isArray(this.ai.cautions) ? this.ai.cautions : []
    },
    diagnostics () {
      return (this.report && Array.isArray(this.report.diagnostics)) ? this.report.diagnostics : []
    },
    recommendations () {
      return (this.report && Array.isArray(this.report.recommendations)) ? this.report.recommendations : []
    },
    historyMeta () {
      if (!this.report) return ''
      const ts = this.report.created_at || this.report.generated_at
      const timeText = ts ? this.formatTime(ts) : ''
      const parts = []
      if (timeText) {
        parts.push(this.$t('strategyReview.historyGeneratedAt', { time: timeText }))
      }
      if (this.report.language) {
        parts.push(String(this.report.language))
      }
      if (this.report.history_saved || this.report.history_id) {
        parts.push(this.$t('strategyReview.historySaved'))
      }
      return parts.join(' · ')
    },
    aiStatusLabel () {
      const status = this.ai.status || 'skipped'
      if (status === 'ok') return this.$t('strategyReview.aiStatus.ok')
      if (status === 'fallback') return this.$t('strategyReview.aiStatus.fallback')
      return this.$t('strategyReview.aiStatus.skipped')
    },
    aiStatusColor () {
      const status = this.ai.status || 'skipped'
      if (status === 'ok') return 'green'
      if (status === 'fallback') return 'orange'
      return 'default'
    },
    aiStatusDetail () {
      const status = this.ai.status || 'skipped'
      if (status === 'ok') {
        const pieces = []
        if (this.ai.provider) pieces.push(String(this.ai.provider))
        if (this.ai.model) pieces.push(String(this.ai.model))
        if (this.ai.elapsed_ms) pieces.push(`${this.ai.elapsed_ms}ms`)
        return pieces.join(' · ')
      }
      if (status === 'fallback') {
        const reason = this.ai.error || this.ai.report || this.$t('strategyReview.aiFallbackDetail')
        return this.truncateText(reason, 120)
      }
      return this.$t('strategyReview.aiSkippedDetail')
    },
    metricCards () {
      const m = this.metrics
      return [
        {
          key: 'net',
          label: this.$t('strategyReview.metric.netPnl'),
          value: this.formatMoney(m.window_net_pnl != null ? m.window_net_pnl : m.total_net_pnl, true),
          tone: this.toneClass(m.window_net_pnl != null ? m.window_net_pnl : m.total_net_pnl),
          hint: this.$t('strategyReview.metric.netPnlHint')
        },
        {
          key: 'return',
          label: this.$t('strategyReview.metric.returnPct'),
          value: this.formatPercent(m.performance_total_return_pct != null ? m.performance_total_return_pct : m.total_return_pct),
          tone: this.toneClass(m.performance_total_return_pct != null ? m.performance_total_return_pct : m.total_return_pct),
          hint: this.$t('strategyReview.metric.returnPctHint')
        },
        {
          key: 'winRate',
          label: this.$t('strategyReview.metric.winRate'),
          value: this.formatPercent(m.win_rate),
          tone: this.toneClass((m.win_rate || 0) - 50),
          hint: `${m.winning_trades || 0}/${m.closed_trades_with_pnl || 0}`
        },
        {
          key: 'profitFactor',
          label: this.$t('strategyReview.metric.profitFactor'),
          value: this.formatNumber(m.profit_factor, 2),
          tone: this.toneClass((m.profit_factor || 0) - 1),
          hint: this.$t('strategyReview.metric.profitFactorHint')
        },
        {
          key: 'drawdown',
          label: this.$t('strategyReview.metric.maxDrawdown'),
          value: this.formatPercent(m.performance_max_drawdown_pct != null ? m.performance_max_drawdown_pct : m.max_drawdown_pct),
          tone: ((m.performance_max_drawdown_pct != null ? m.performance_max_drawdown_pct : m.max_drawdown_pct) || 0) > 0 ? 'tone-danger' : 'tone-neutral',
          hint: this.formatMoney(m.performance_max_drawdown != null ? m.performance_max_drawdown : m.max_drawdown)
        },
        {
          key: 'fees',
          label: this.$t('strategyReview.metric.fees'),
          value: this.formatMoney(m.total_commission),
          tone: (m.fee_to_abs_pnl || 0) >= 0.5 ? 'tone-warning' : 'tone-neutral',
          hint: this.$t('strategyReview.metric.feesHint', { ratio: this.formatPercent((m.fee_to_abs_pnl || 0) * 100) })
        },
        {
          key: 'open',
          label: this.$t('strategyReview.metric.openPositions'),
          value: String(m.open_position_count || 0),
          tone: (m.open_position_count || 0) > 0 ? 'tone-info' : 'tone-neutral',
          hint: this.formatMoney(m.unrealized_pnl, true)
        },
        {
          key: 'grid',
          label: this.$t('strategyReview.metric.gridPairs'),
          value: String(m.grid_matched_pairs || 0),
          tone: (m.grid_negative_pairs || 0) > 0 ? 'tone-warning' : 'tone-neutral',
          hint: this.$t('strategyReview.metric.gridPairsHint', { negative: m.grid_negative_pairs || 0 })
        }
      ]
    }
  },
  watch: {
    strategyId () {
      this.report = null
      this.history = []
      this.selectedHistoryId = null
      this.loadHistory()
    }
  },
  mounted () {
    this.loadHistory()
  },
  methods: {
    async loadReport () {
      if (!this.strategyId) return
      this.loading = true
      try {
        const language = this.$i18n && this.$i18n.locale ? this.$i18n.locale : 'zh-CN'
        const res = await getStrategyReviewReport(this.strategyId, {
          lookback_days: this.lookbackDays,
          include_ai: this.includeAi,
          language
        })
        if (res && res.code === 1) {
          this.report = res.data || null
          this.selectedHistoryId = this.report && this.report.history_id ? this.report.history_id : null
          this.loadHistory()
        } else {
          this.$message.error((res && res.msg) || this.$t('strategyReview.loadFailed'))
        }
      } catch (err) {
        this.$message.error((err && err.message) || this.$t('strategyReview.loadFailed'))
      } finally {
        this.loading = false
      }
    },
    async loadHistory () {
      if (!this.strategyId) return
      this.historyLoading = true
      try {
        const res = await getStrategyReviewReportHistory(this.strategyId, { limit: 20 })
        if (res && res.code === 1) {
          this.history = Array.isArray(res.data) ? res.data : []
        }
      } catch (err) {
        this.history = []
      } finally {
        this.historyLoading = false
      }
    },
    async handleHistoryChange (reportId) {
      if (!reportId) return
      await this.loadHistoryReport(reportId)
    },
    async loadHistoryReport (reportId) {
      if (!this.strategyId || !reportId) return
      this.loading = true
      try {
        const res = await getStrategyReviewReportHistory(this.strategyId, { report_id: reportId })
        if (res && res.code === 1) {
          this.report = res.data || null
          this.selectedHistoryId = reportId
          if (this.report && this.report.lookback_days) {
            this.lookbackDays = Number(this.report.lookback_days) || this.lookbackDays
          }
          if (this.report && this.report.ai) {
            this.includeAi = !!this.report.ai.enabled
          }
        } else {
          this.$message.error((res && res.msg) || this.$t('strategyReview.historyLoadFailed'))
        }
      } catch (err) {
        this.$message.error((err && err.message) || this.$t('strategyReview.historyLoadFailed'))
      } finally {
        this.loading = false
      }
    },
    formatHistoryLabel (item) {
      const timeText = this.formatTime(item && item.created_at)
      const days = item && item.lookback_days ? item.lookback_days : 30
      const pnl = this.formatMoney(item && item.total_net_pnl, true)
      return `${timeText} · ${this.$t('strategyReview.historyLookback', { days })} · ${pnl}`
    },
    truncateText (value, maxLen = 120) {
      const text = String(value || '').trim()
      if (!text || text.length <= maxLen) return text
      return `${text.slice(0, maxLen - 1)}…`
    },
    formatTime (value) {
      if (!value) return '--'
      const raw = Number(value)
      const date = isFinite(raw)
        ? new Date(raw > 100000000000 ? raw : raw * 1000)
        : new Date(value)
      if (isNaN(date.getTime())) return String(value)
      return date.toLocaleString()
    },
    formatNumber (value, digits = 2) {
      const n = Number(value)
      if (!isFinite(n)) return '--'
      return n.toFixed(digits)
    },
    formatMoney (value, signed = false) {
      const n = Number(value)
      if (!isFinite(n)) return '--'
      const sign = signed && n > 0 ? '+' : ''
      return `${sign}$${n.toFixed(2)}`
    },
    formatPercent (value) {
      const n = Number(value)
      if (!isFinite(n)) return '--'
      return `${n.toFixed(2)}%`
    },
    toneClass (value) {
      const n = Number(value)
      if (!isFinite(n) || Math.abs(n) < 1e-9) return 'tone-neutral'
      return n > 0 ? 'tone-success' : 'tone-danger'
    },
    severityColor (severity) {
      if (severity === 'danger') return 'red'
      if (severity === 'warning') return 'orange'
      if (severity === 'success') return 'green'
      return 'blue'
    },
    severityLabel (severity) {
      return this.$t(`strategyReview.severity.${severity || 'info'}`)
    },
    priorityColor (priority) {
      if (priority === 'high') return 'red'
      if (priority === 'medium') return 'orange'
      if (priority === 'low') return 'green'
      return 'blue'
    },
    priorityLabel (priority) {
      return this.$t(`strategyReview.priority.${priority || 'medium'}`)
    }
  }
}
</script>

<style scoped>
.strategy-review-report {
  padding: 4px 0 10px;
  color: #24364f;
}

.review-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.review-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #173b68;
}

.review-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #7a8aa0;
}

.review-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.lookback-select {
  width: 110px;
}

.history-select {
  width: 290px;
}

.history-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(24, 144, 255, 0.08);
  color: #41617f;
  font-size: 12px;
}

.ai-summary-panel,
.review-panel,
.metric-card {
  border: 1px solid #e6edf5;
  border-radius: 8px;
  background: #fff;
}

.ai-summary-panel {
  padding: 16px;
  margin-bottom: 14px;
  background: linear-gradient(135deg, #f7fbff 0%, #ffffff 70%);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: #183b63;
}

.ai-status-block {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.ai-status-detail {
  max-width: 520px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-sub {
  font-size: 12px;
  color: #8a98aa;
}

.summary-text {
  line-height: 1.7;
  color: #2b405f;
  white-space: pre-wrap;
}

.ai-list-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.ai-list-block {
  padding: 12px;
  border-radius: 8px;
  background: rgba(24, 144, 255, 0.06);
}

.list-title {
  font-weight: 700;
  color: #1f4d7a;
  margin-bottom: 8px;
}

.ai-list-block ul {
  margin: 0;
  padding-left: 18px;
}

.ai-list-block li {
  margin-bottom: 6px;
  line-height: 1.55;
}

.caution-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  color: #8a6d1d;
  font-size: 12px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.metric-card {
  padding: 13px 14px;
  min-height: 92px;
}

.metric-label {
  font-size: 12px;
  color: #7b8da6;
}

.metric-value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 800;
  color: #183b63;
}

.metric-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #96a3b4;
}

.tone-success .metric-value {
  color: #12a86b;
}

.tone-danger .metric-value {
  color: #f04455;
}

.tone-warning .metric-value {
  color: #d48806;
}

.tone-info .metric-value {
  color: #1677ff;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.review-panel {
  padding: 14px;
}

.review-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.review-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: #f8fafc;
}

.review-item .ant-tag {
  flex: 0 0 auto;
  margin-right: 0;
}

.review-item-title {
  font-weight: 700;
  color: #24364f;
}

.review-item-detail {
  margin-top: 3px;
  color: #66768d;
  line-height: 1.55;
}

.review-empty {
  padding: 42px 0;
}

.theme-dark {
  color: #d8e0ee;
}

.theme-dark .review-title,
.theme-dark .panel-title,
.theme-dark .metric-value,
.theme-dark .review-item-title {
  color: #eef4ff;
}

.theme-dark .review-subtitle,
.theme-dark .metric-label,
.theme-dark .metric-hint,
.theme-dark .panel-sub,
.theme-dark .review-item-detail {
  color: #98a6ba;
}

.theme-dark .ai-summary-panel,
.theme-dark .review-panel,
.theme-dark .metric-card {
  background: #1f1f1f;
  border-color: #333b48;
}

.theme-dark .ai-summary-panel {
  background: linear-gradient(135deg, #182538 0%, #1f1f1f 70%);
}

.theme-dark .summary-text {
  color: #d8e0ee;
}

.theme-dark .ai-list-block,
.theme-dark .review-item {
  background: rgba(255, 255, 255, 0.06);
}

@media (max-width: 1100px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .review-grid,
  .ai-list-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .review-toolbar {
    flex-direction: column;
  }
  .review-actions {
    justify-content: flex-start;
  }
  .history-select {
    width: 100%;
  }
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
