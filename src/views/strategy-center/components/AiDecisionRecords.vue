<template>
  <div class="ai-decision-records strategy-tab-pane-inner" :class="{ 'theme-dark': isDark, 'is-compact': compact }">
    <div class="ai-decision-records__head">
      <div>
        <h3>{{ $t('aiDecisionFilter.processTitle') }}</h3>
        <p>{{ $t('aiDecisionFilter.processHint') }}</p>
      </div>
      <a-button icon="reload" :loading="loading" @click="load">{{ $t('common.refresh') }}</a-button>
    </div>
    <a-spin :spinning="loading" aria-live="polite">
      <a-alert
        v-if="loadFailed"
        type="error"
        show-icon
        :message="$t('ai-trading-assistant.messages.loadDecisionsFailed')"
        class="ai-decision-records__error"
      />
      <a-empty v-else-if="!rows.length" :description="$t('aiDecisionFilter.noRecords')" />
      <a-collapse v-else :bordered="false" class="ai-decision-records__list">
        <a-collapse-panel v-for="(row, index) in rows" :key="row.decision_uid || String(index)">
          <template slot="header">
            <div class="ai-decision-record__summary">
              <a-tag :color="decisionColor(row)">{{ decisionLabel(row) }}</a-tag>
              <a-tag :color="executionColor(row)">{{ executionLabel(row) }}</a-tag>
              <strong>{{ actionLabel(row.action) }} · {{ row.symbol }}</strong>
              <span class="ai-decision-record__provider">{{ row.provider || '-' }}</span>
              <span v-if="row.confidence != null">{{ formatConfidence(row.confidence) }}</span>
              <time :datetime="row.created_at || null">{{ formatTime(row.created_at) }}</time>
            </div>
          </template>
          <div class="ai-decision-record">
            <div class="ai-decision-record__meta">
              <span>{{ $t('aiDecisionFilter.provider') }}: {{ row.provider || '-' }}</span>
              <span v-if="row.model">{{ $t('aiDecisionFilter.model') }}: {{ row.model }}</span>
              <span v-if="row.confidence != null" class="ai-decision-record__confidence">
                {{ $t('aiDecisionFilter.confidence') }}: {{ formatConfidence(row.confidence) }}
                <a-progress :percent="confidencePercent(row.confidence)" :show-info="false" size="small" />
              </span>
              <span>{{ row.latency_ms || 0 }} ms</span>
            </div>
            <div v-if="decisionChecks(row).length" class="ai-decision-record__checks">
              <a-tag v-for="check in decisionChecks(row)" :key="check.name">
                {{ checkLabel(check.name) }}: {{ checkResultLabel(check.result) }} · {{ $t('aiDecisionFilter.selectedProbability') }} {{ checkProbability(check) }}
              </a-tag>
            </div>
            <p>{{ reasonText(row.reason) }}</p>
            <p v-if="row.fallback_reason" class="ai-decision-record__fallback">{{ fallbackText(row) }}</p>
            <p v-if="row.fallback_reason" class="ai-decision-record__technical">
              {{ $t('aiDecisionFilter.fallbackTechnical') }}: {{ fallbackTechnical(row) }}
            </p>
            <div v-if="decisionChecks(row).length" class="ai-decision-record__details">
              <strong class="ai-decision-record__details-title">{{ $t('aiDecisionFilter.viewConfidenceDetails') }}</strong>
              <div v-for="check in decisionChecks(row)" :key="check.name" class="ai-decision-check">
                <div class="ai-decision-check__head">
                  <strong>{{ checkLabel(check.name) }}</strong>
                  <span>{{ checkResultLabel(check.result) }} · {{ $t('aiDecisionFilter.confidence') }} {{ checkConfidence(check) }}</span>
                </div>
                <div class="ai-decision-check__probabilities">
                  <span
                    v-for="option in checkProbabilityRows(check)"
                    :key="option.name"
                    :class="{ selected: option.name === check.result }"
                  >
                    {{ checkResultLabel(option.name) }} {{ formatConfidence(option.value) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </a-collapse-panel>
      </a-collapse>
    </a-spin>
  </div>
</template>

<script>
import { getStrategyAiDecisions } from '@/api/strategy'
import { getQuickTradeAiDecisions } from '@/api/quick-trade'

export default {
  name: 'AiDecisionRecords',
  props: {
    strategyId: { type: [Number, String], default: 0 },
    sourceType: { type: String, default: 'strategy' },
    sourceId: { type: [Number, String], default: 0 },
    symbol: { type: String, default: '' },
    marketType: { type: String, default: '' },
    refreshKey: { type: [Number, String], default: 0 },
    compact: { type: Boolean, default: false },
    isDark: { type: Boolean, default: false }
  },
  data () {
    return { rows: [], loading: false, loadFailed: false, requestToken: 0 }
  },
  watch: {
    strategyId: { immediate: true, handler () { this.load() } },
    sourceId () { this.load() },
    symbol () { this.load() },
    marketType () { this.load() },
    refreshKey () { this.load() }
  },
  methods: {
    async load () {
      const requestToken = ++this.requestToken
      const isQuickTrade = this.sourceType === 'quick_trade'
      const sourceId = Number(this.sourceId || 0)
      if (!isQuickTrade && !this.strategyId) {
        this.rows = []
        this.loading = false
        this.$emit('loaded', this.rows)
        return
      }
      if (isQuickTrade && !sourceId) {
        this.rows = []
        this.loading = false
        this.$emit('loaded', this.rows)
        return
      }
      this.loading = true
      this.loadFailed = false
      try {
        const res = isQuickTrade
          ? await getQuickTradeAiDecisions({
            credential_id: sourceId,
            symbol: this.symbol,
            market_type: this.marketType,
            limit: 100
          })
          : await getStrategyAiDecisions(this.strategyId)
        if (requestToken !== this.requestToken) return
        this.rows = (res && Array.isArray(res.data)) ? res.data : []
        this.$emit('loaded', this.rows)
      } catch (error) {
        if (requestToken !== this.requestToken) return
        this.loadFailed = true
        this.$emit('load-error', error)
      } finally {
        if (requestToken === this.requestToken) this.loading = false
      }
    },
    decisionColor (row) {
      if (row.decision === 'reject' || row.allowed === false) return 'red'
      if (row.decision === 'pass') return 'green'
      return 'orange'
    },
    decisionLabel (row) {
      const key = row.decision === 'reject' || row.allowed === false
        ? 'aiDecisionFilter.decisionReject'
        : row.decision === 'pass' ? 'aiDecisionFilter.decisionPass' : 'aiDecisionFilter.decisionSkipped'
      return this.$t(key)
    },
    executionColor (row) {
      if (row.decision === 'reject' || row.allowed === false) return 'red'
      if (row.decision === 'skipped' || row.provider === 'none') return 'orange'
      return 'blue'
    },
    executionLabel (row) {
      if (row.decision === 'reject' || row.allowed === false) return this.$t('aiDecisionFilter.executionNotSubmitted')
      if (row.decision === 'skipped' || row.provider === 'none') return this.$t('aiDecisionFilter.executionFailOpen')
      return this.$t('aiDecisionFilter.executionReleased')
    },
    actionLabel (action) {
      const normalized = String(action || '').toLowerCase()
      const keys = {
        open_long: 'dashboard.signalType.openLong',
        add_long: 'dashboard.signalType.addLong',
        open_short: 'dashboard.signalType.openShort',
        add_short: 'dashboard.signalType.addShort',
        buy: 'quickTrade.buy',
        sell: 'quickTrade.sell'
      }
      const key = keys[normalized]
      if (!key) return action || '-'
      const translated = this.$t(key)
      return translated === key ? (action || '-') : translated
    },
    formatConfidence (value) {
      return `${(Number(value || 0) * 100).toFixed(1)}%`
    },
    confidencePercent (value) {
      return Math.max(0, Math.min(100, Number(value || 0) * 100))
    },
    formatTime (value) {
      return value ? new Date(value).toLocaleString() : ''
    },
    reasonText (reason) {
      const raw = String(reason || '')
      const exactKey = `aiDecisionFilter.reason.${raw}`
      const exact = this.$t(exactKey)
      if (exact !== exactKey) return exact
      const baseKey = `aiDecisionFilter.reason.${raw.split(':')[0]}`
      const translated = this.$t(baseKey)
      return translated === baseKey ? (raw || '-') : translated
    },
    decisionChecks (row) {
      const checks = row && row.checks_json
      if (Array.isArray(checks)) return checks
      if (typeof checks !== 'string') return []
      try {
        const parsed = JSON.parse(checks)
        return Array.isArray(parsed) ? parsed : []
      } catch (e) {
        return []
      }
    },
    checkLabel (name) {
      const key = `aiDecisionFilter.check.${String(name || '')}`
      const translated = this.$t(key)
      return translated === key ? (name || '-') : translated
    },
    checkResultLabel (result) {
      const key = `aiDecisionFilter.checkResult.${String(result || '')}`
      const translated = this.$t(key)
      return translated === key ? (result || '-') : translated
    },
    checkProbability (check) {
      const probabilities = (check && check.probabilities) || {}
      const value = probabilities[check.result]
      const confidence = value == null ? check.confidence : value
      return confidence == null ? '-' : this.formatConfidence(confidence)
    },
    checkConfidence (check) {
      return check && check.confidence != null ? this.formatConfidence(check.confidence) : '-'
    },
    checkProbabilityRows (check) {
      const probabilities = (check && check.probabilities) || {}
      return Object.keys(probabilities)
        .map(name => ({ name, value: Number(probabilities[name] || 0) }))
        .sort((left, right) => right.value - left.value)
    },
    fallbackText (row) {
      if (row.provider !== 'llm') return this.$t('aiDecisionFilter.providerUnavailable')
      const detail = String(row.fallback_reason || '').toLowerCase()
      if (detail.includes('confidence below threshold')) return this.$t('aiDecisionFilter.fallbackConfidence')
      if (detail.includes('timeout') || detail.includes('timed out')) return this.$t('aiDecisionFilter.fallbackTimeout')
      if (detail.includes('401') || detail.includes('403') || detail.includes('unauthorized') || detail.includes('authentication') || detail.includes('api key')) {
        return this.$t('aiDecisionFilter.fallbackAuthentication')
      }
      if (detail.includes('response') || detail.includes('probabilit') || detail.includes('valid ')) {
        return this.$t('aiDecisionFilter.fallbackInvalidResponse')
      }
      return this.$t('aiDecisionFilter.fallbackRechecked')
    },
    fallbackTechnical (row) {
      return String(row.fallback_reason || '-').replace(/^jev:/i, '')
    }
  }
}
</script>

<style lang="less" scoped>
.ai-decision-records { min-height: 260px; padding: 18px 20px; color: #18202c; }
.ai-decision-records__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
.ai-decision-records__head h3 { margin: 0; color: inherit; font-size: 16px; }
.ai-decision-records__head p { max-width: 680px; margin: 5px 0 0; color: #667085; line-height: 1.55; }
.ai-decision-records__error { margin-bottom: 14px; }
.ai-decision-records__list { background: transparent; }
.ai-decision-records__list /deep/ .ant-collapse-item { margin-bottom: 10px; overflow: hidden; border: 1px solid #e8ebf0; border-radius: 9px; background: #fff; }
.ai-decision-records__list /deep/ .ant-collapse-header { padding: 12px 38px 12px 42px; }
.ai-decision-records__list /deep/ .ant-collapse-content { border-top: 1px solid #eef0f3; }
.ai-decision-records__list /deep/ .ant-collapse-content-box { padding: 12px 14px 14px; }
.ai-decision-record { min-width: 0; }
.ai-decision-record__summary { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; min-width: 0; }
.ai-decision-record__summary .ant-tag { margin: 0; }
.ai-decision-record__summary time { margin-inline-start: auto; color: #667085; font-size: 12px; white-space: nowrap; }
.ai-decision-record__provider { color: #667085; font-size: 12px; text-transform: uppercase; }
.ai-decision-record__meta { display: flex; flex-wrap: wrap; gap: 12px; margin: 8px 0; color: #667085; font-size: 12px; }
.ai-decision-record__confidence { display: inline-flex; align-items: center; gap: 7px; }
.ai-decision-record__confidence .ant-progress { width: 64px; margin: 0; }
.ai-decision-record__checks { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.ai-decision-record__checks .ant-tag { margin: 0; white-space: normal; }
.ai-decision-record p { margin: 5px 0 0; line-height: 1.55; overflow-wrap: anywhere; }
.ai-decision-record__fallback { color: #ad6800; font-size: 12px; }
.ai-decision-record__technical { color: #87909c; font-family: Consolas, Monaco, monospace; font-size: 11px; }
.ai-decision-record__details { margin-top: 12px; padding-top: 10px; border-top: 1px solid #eef0f3; }
.ai-decision-record__details-title { color: #526172; font-size: 12px; }
.ai-decision-check { padding: 8px 0; border-top: 1px solid #eef0f3; }
.ai-decision-check__head { display: flex; justify-content: space-between; gap: 10px; color: #364152; font-size: 12px; }
.ai-decision-check__probabilities { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.ai-decision-check__probabilities span { padding: 2px 7px; border-radius: 10px; color: #667085; background: #f3f5f7; font-size: 11px; }
.ai-decision-check__probabilities span.selected { color: #1d4ed8; background: #e8f1ff; font-weight: 600; }
.is-compact { min-height: 160px; padding: 8px 2px; }
.is-compact .ai-decision-records__head { margin-bottom: 12px; }
.is-compact .ai-decision-records__head h3 { font-size: 14px; }
.is-compact .ai-decision-records__head p { font-size: 12px; }
.theme-dark { color: #eef0f3; }
.theme-dark .ai-decision-records__head p,
.theme-dark .ai-decision-record__summary time,
.theme-dark .ai-decision-record__provider,
.theme-dark .ai-decision-record__meta { color: #98a1ac; }
.theme-dark .ai-decision-records__list /deep/ .ant-collapse-item { border-color: #30343a; background: #15181b; }
.theme-dark .ai-decision-records__list /deep/ .ant-collapse-header { color: #eef0f3; }
.theme-dark .ai-decision-records__list /deep/ .ant-collapse-content { border-top-color: #30343a; background: #15181b; color: #eef0f3; }
.theme-dark .ai-decision-record__checks .ant-tag { color: #cfd4da; border-color: #43484f; background: #22262b; }
.theme-dark .ai-decision-record__fallback { color: #ffc53d; }
.theme-dark .ai-decision-record__technical { color: #7f8a96; }
.theme-dark .ai-decision-record__details { border-top-color: #30343a; }
.theme-dark .ai-decision-record__details-title,
.theme-dark .ai-decision-check__head { color: #cfd4da; }
.theme-dark .ai-decision-check { border-top-color: #30343a; }
.theme-dark .ai-decision-check__probabilities span { color: #aeb5bd; background: #22262b; }
.theme-dark .ai-decision-check__probabilities span.selected { color: #91caff; background: #102a44; }
.theme-dark /deep/ .ant-empty-description { color: #98a1ac; }

@media (max-width: 640px) {
  .ai-decision-records { padding: 15px 12px; }
  .ai-decision-records__head { align-items: stretch; flex-direction: column; }
  .ai-decision-records__head .ant-btn { align-self: flex-start; }
  .ai-decision-record__summary time { width: 100%; margin-inline-start: 0; }
}
</style>
