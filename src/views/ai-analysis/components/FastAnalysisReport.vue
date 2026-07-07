<template>
  <div class="fast-analysis-report" :class="{ 'theme-dark': isDarkTheme }">
    <div v-if="loading" class="loading-container">
      <div class="loading-content-pro">
        <div class="loading-header">
          <a-icon type="thunderbolt" class="loading-icon-pro" />
          <span class="loading-title">{{ $t('fastAnalysis.analyzing') }}</span>
        </div>

        <div class="progress-wrapper">
          <a-progress
            :percent="progressPercent"
            :showInfo="false"
            strokeColor="var(--primary-color, #1890ff)"
            :strokeWidth="8"
          />
          <span class="progress-text">{{ formatProgress(progressPercent) }}%</span>
        </div>

        <div class="current-step">
          <a-icon type="loading" spin />
          <span>{{ currentStepText }}</span>
        </div>

        <div class="steps-list">
          <div class="step-item" :class="{ done: step > 1, active: step === 1 }">
            <span class="step-dot"></span>
            <span class="step-text">{{ $t('fastAnalysis.step1') || '获取实时数据' }}</span>
            <a-icon v-if="step > 1" type="check" class="step-check" />
          </div>
          <div class="step-item" :class="{ done: step > 2, active: step === 2 }">
            <span class="step-dot"></span>
            <span class="step-text">{{ $t('fastAnalysis.step2') || '计算技术指标' }}</span>
            <a-icon v-if="step > 2" type="check" class="step-check" />
          </div>
          <div class="step-item" :class="{ done: step > 3, active: step === 3 }">
            <span class="step-dot"></span>
            <span class="step-text">{{ $t('fastAnalysis.step3') || 'AI深度分析' }}</span>
            <a-icon v-if="step > 3" type="check" class="step-check" />
          </div>
          <div class="step-item" :class="{ done: step > 4, active: step === 4 }">
            <span class="step-dot"></span>
            <span class="step-text">{{ $t('fastAnalysis.step4') || '生成报告' }}</span>
            <a-icon v-if="step > 4" type="check" class="step-check" />
          </div>
        </div>

        <div class="loading-footer">
          <span class="elapsed-time">{{ elapsedTimeText }}</span>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <a-result
        :status="errorTone === 'warning' ? 'warning' : 'error'"
        :title="errorTitle"
        :sub-title="error"
      >
        <template #extra>
          <a-button type="primary" @click="$emit('retry')">
            {{ $t('fastAnalysis.retry') }}
          </a-button>
        </template>
      </a-result>
    </div>

    <!-- Empty State -->
    <div v-else-if="!result" class="empty-container">
      <div class="empty-content">
        <a-icon type="radar-chart" class="empty-icon" />
        <div class="empty-title">{{ $t('fastAnalysis.selectSymbol') }}</div>
        <div class="empty-hint">{{ $t('fastAnalysis.selectHint') }}</div>
      </div>
    </div>

    <!-- Result Display -->
    <div v-else class="result-container">
      <!-- Header: Decision Card -->
      <div class="decision-card" :class="decisionClass">
        <div class="decision-main">
          <div class="decision-badge">
            <a-icon :type="decisionIcon" />
            <span class="decision-text">{{ result.decision }}</span>
          </div>
          <div class="confidence-ring">
            <a-progress
              type="circle"
              :percent="result.confidence"
              :width="80"
              :strokeColor="confidenceColor"
            >
              <template #format="percent">
                <span class="confidence-value">{{ percent }}%</span>
              </template>
            </a-progress>
            <div class="confidence-label">{{ $t('fastAnalysis.confidence') }}</div>
          </div>
        </div>
        <div class="decision-summary">
          {{ result.summary }}
        </div>
        <div v-if="consensusBlock" class="consensus-strip">
          <div class="consensus-strip-title">
            <a-icon type="cluster" />
            {{ $t('fastAnalysis.consensusTitle') }}
          </div>
          <div class="consensus-strip-metrics">
            <span class="cm-item">
              <em>{{ $t('fastAnalysis.consensusDecision') }}</em>
              {{ consensusBlock.consensus_decision }}
            </span>
            <span class="cm-item">
              <em>{{ $t('fastAnalysis.consensusScore') }}</em>
              {{ formatConsensusNum(consensusBlock.consensus_score) }}
            </span>
            <span v-if="consensusBlock.agreement_ratio != null" class="cm-item">
              <em>{{ $t('fastAnalysis.consensusAgreement') }}</em>
              {{ formatAgreementPct(consensusBlock.agreement_ratio) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Historical Accuracy Strip -->
      <div v-if="performanceStats && performanceStats.total_analyses" class="performance-strip">
        <div class="perf-item">
          <span class="perf-value">{{ performanceStats.total_analyses }}</span>
          <span class="perf-label">{{ $t('fastAnalysis.totalAnalyses') || '历史分析' }}</span>
        </div>
        <div class="perf-item" v-if="performanceStats.accuracy_rate != null">
          <span class="perf-value" :class="performanceStats.accuracy_rate >= 50 ? 'positive' : 'negative'">{{ formatNumber(performanceStats.accuracy_rate, 1) }}%</span>
          <span class="perf-label">{{ $t('fastAnalysis.accuracyRate') || '准确率' }}</span>
        </div>
        <div class="perf-item" v-if="performanceStats.avg_confidence != null">
          <span class="perf-value">{{ formatNumber(performanceStats.avg_confidence, 0) }}</span>
          <span class="perf-label">{{ $t('fastAnalysis.avgConfidence') || '平均置信' }}</span>
        </div>
        <div class="perf-item" v-if="performanceStats.avg_return != null">
          <span class="perf-value" :class="performanceStats.avg_return >= 0 ? 'positive' : 'negative'">{{ formatNumber(performanceStats.avg_return, 2) }}%</span>
          <span class="perf-label">{{ $t('fastAnalysis.avgReturn') || '平均收益' }}</span>
        </div>
      </div>

      <!-- Price Info Row -->
      <div class="price-info-row" :class="{ 'hold-mode': isHoldDecision }">
        <div class="price-card current">
          <div class="price-label">{{ $t('fastAnalysis.currentPrice') }}</div>
          <div class="price-value">${{ formatPrice(result.market_data?.current_price) }}</div>
          <div class="price-change" :class="result.market_data?.change_24h >= 0 ? 'positive' : 'negative'">
            {{ result.market_data?.change_24h >= 0 ? '+' : '' }}{{ formatNumber(result.market_data?.change_24h, 2) }}%
          </div>
        </div>
        <template v-if="!isHoldDecision">
          <div class="price-card entry">
            <div class="price-label">{{ $t('fastAnalysis.entryPrice') }}</div>
            <div class="price-value">${{ formatPrice(tradingPlan.entry_price) }}</div>
          </div>
          <div class="price-card stop">
            <div class="price-label">{{ $t('fastAnalysis.stopLoss') }}</div>
            <div class="price-value negative">${{ formatPrice(tradingPlan.stop_loss) }}</div>
            <div class="price-hint">
              <a-tooltip :title="stopLossHintText">
                <a-icon type="info-circle" /> {{ $t('fastAnalysis.atrBased') }}
              </a-tooltip>
            </div>
          </div>
          <div class="price-card target">
            <div class="price-label">{{ $t('fastAnalysis.takeProfit') }}</div>
            <div class="price-value positive">${{ formatPrice(tradingPlan.take_profit) }}</div>
            <div class="price-hint">
              <a-tooltip :title="takeProfitHintText">
                <a-icon type="info-circle" /> {{ $t('fastAnalysis.atrBased') }}
              </a-tooltip>
            </div>
          </div>
        </template>
      </div>

      <div v-if="trendOutlookBlocks.length || trendOutlookSummaryText" class="trend-outlook-card">
        <div class="trend-outlook-header section-clickable" @click="toggleSection('trendOutlook')">
          <a-icon type="calendar" />
          <span>{{ $t('fastAnalysis.trendOutlookTitle') }}</span>
          <a-icon type="right" class="section-toggle-arrow" :class="{ open: !sectionCollapsed.trendOutlook }" />
        </div>
        <div v-show="!sectionCollapsed.trendOutlook">
          <div v-if="trendOutlookSummaryText" class="trend-outlook-summary">
            {{ trendOutlookSummaryText }}
          </div>
          <div v-if="trendOutlookBlocks.length" class="trend-outlook-grid">
            <div v-for="row in trendOutlookBlocks" :key="row.key" class="trend-outlook-item">
              <div class="to-label">{{ row.label }}</div>
              <div class="to-trend" :class="outlookTrendClass(row.trend)">
                {{ formatOutlookTrend(row.trend) }}
              </div>
              <div class="to-meta">
                <span class="to-score">{{ row.score != null ? row.score : '--' }}</span>
                <span class="to-str">{{ row.strength || '--' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Scores (Collapsible) -->
      <div class="report-section">
        <div class="report-section-header" @click="toggleSection('scores')">
          <span class="rsh-title"><a-icon type="dashboard" /> {{ $t('fastAnalysis.scoresTitle') || '四维评分' }}</span>
          <a-icon type="right" class="section-toggle-arrow" :class="{ open: !sectionCollapsed.scores }" />
        </div>
        <div v-show="!sectionCollapsed.scores">
          <div class="scores-row">
            <div class="score-item">
              <div class="score-header">
                <a-icon type="line-chart" />
                <span>{{ $t('fastAnalysis.technical') }}</span>
              </div>
              <a-progress :percent="result.scores?.technical || 50" :strokeColor="getScoreColor(result.scores?.technical)" :showInfo="false" />
              <div class="score-value">{{ result.scores?.technical || 50 }}</div>
            </div>
            <div class="score-item">
              <div class="score-header">
                <a-icon type="bank" />
                <span>{{ $t('fastAnalysis.fundamental') }}</span>
              </div>
              <a-progress :percent="result.scores?.fundamental || 50" :strokeColor="getScoreColor(result.scores?.fundamental)" :showInfo="false" />
              <div class="score-value">{{ result.scores?.fundamental || 50 }}</div>
            </div>
            <div class="score-item">
              <div class="score-header">
                <a-icon type="heart" />
                <span>{{ $t('fastAnalysis.sentiment') }}</span>
              </div>
              <a-progress :percent="result.scores?.sentiment || 50" :strokeColor="getScoreColor(result.scores?.sentiment)" :showInfo="false" />
              <div class="score-value">{{ result.scores?.sentiment || 50 }}</div>
            </div>
            <div class="score-item overall">
              <div class="score-header">
                <a-icon type="dashboard" />
                <span>{{ $t('fastAnalysis.overall') }}</span>
              </div>
              <a-progress :percent="result.scores?.overall || 50" :strokeColor="getScoreColor(result.scores?.overall)" :showInfo="false" />
              <div class="score-value">{{ result.scores?.overall || 50 }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Crypto Factors (Collapsible) -->
      <div v-if="isCryptoResult && cryptoFactorRows.length" class="report-section">
        <div class="report-section-header" @click="toggleSection('cryptoFactors')">
          <span class="rsh-title">
            <a-icon type="fund" />
            {{ ($i18n && $i18n.locale === 'zh-CN') ? 'Crypto 交易大数据' : 'Crypto Market Structure' }}
          </span>
          <a-icon type="right" class="section-toggle-arrow" :class="{ open: !sectionCollapsed.cryptoFactors }" />
        </div>
        <div v-show="!sectionCollapsed.cryptoFactors">
          <div class="crypto-factor-summary">
            <div class="crypto-factor-score" :class="cryptoFactorScoreClass">
              {{ ($i18n && $i18n.locale === 'zh-CN') ? '因子偏向' : 'Factor Bias' }}:
              <strong>{{ cryptoFactorScoreText }}</strong>
              <span v-if="result.crypto_factor_score !== undefined && result.crypto_factor_score !== null" class="crypto-factor-score__num">
                {{ formatNumber(result.crypto_factor_score, 1) }}
              </span>
            </div>
            <div class="crypto-factor-summary__text">
              {{ result.crypto_factor_summary || '--' }}
            </div>
            <div v-if="cryptoSignals.length" class="crypto-factor-signals">
              <a-tag v-for="item in cryptoSignals" :key="item.key" :color="item.color">{{ item.label }}</a-tag>
            </div>
          </div>
          <div class="crypto-factor-grid">
            <div v-for="row in cryptoFactorRows" :key="row.key" class="crypto-factor-item">
              <div class="crypto-factor-item__label">{{ row.label }}</div>
              <div class="crypto-factor-item__value" :class="row.valueClass">{{ row.text }}</div>
              <div v-if="row.hint" class="crypto-factor-item__hint">{{ row.hint }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed Analysis (Collapsible) -->
      <div class="report-section" v-if="result.detailed_analysis">
        <div class="report-section-header" @click="toggleSection('detailedAnalysis')">
          <span class="rsh-title"><a-icon type="file-text" /> {{ $t('fastAnalysis.detailedAnalysisTitle') || '详细分析' }}</span>
          <a-icon type="right" class="section-toggle-arrow" :class="{ open: !sectionCollapsed.detailedAnalysis }" />
        </div>
        <div v-show="!sectionCollapsed.detailedAnalysis">
          <div class="detailed-analysis">
            <div class="analysis-card technical" v-if="result.detailed_analysis.technical">
              <div class="analysis-card-header">
                <a-icon type="line-chart" />
                <span>{{ $t('fastAnalysis.technicalAnalysis') }}</span>
                <a-tag :color="getScoreTagColor(result.scores?.technical)">{{ result.scores?.technical || 50 }}分</a-tag>
              </div>
              <div class="analysis-card-content">{{ result.detailed_analysis.technical }}</div>
            </div>
            <div class="analysis-card fundamental" v-if="result.detailed_analysis.fundamental">
              <div class="analysis-card-header">
                <a-icon type="bank" />
                <span>{{ $t('fastAnalysis.fundamentalAnalysis') }}</span>
                <a-tag :color="getScoreTagColor(result.scores?.fundamental)">{{ result.scores?.fundamental || 50 }}分</a-tag>
              </div>
              <div class="analysis-card-content">{{ result.detailed_analysis.fundamental }}</div>
            </div>
            <div class="analysis-card sentiment" v-if="result.detailed_analysis.sentiment">
              <div class="analysis-card-header">
                <a-icon type="heart" />
                <span>{{ $t('fastAnalysis.sentimentAnalysis') }}</span>
                <a-tag :color="getScoreTagColor(result.scores?.sentiment)">{{ result.scores?.sentiment || 50 }}分</a-tag>
              </div>
              <div class="analysis-card-content">{{ result.detailed_analysis.sentiment }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reasons & Risks (Collapsible) -->
      <div class="report-section">
        <div class="report-section-header" @click="toggleSection('reasonsRisks')">
          <span class="rsh-title"><a-icon type="bulb" /> {{ $t('fastAnalysis.reasonsAndRisks') || '关键理由与风险' }}</span>
          <a-icon type="right" class="section-toggle-arrow" :class="{ open: !sectionCollapsed.reasonsRisks }" />
        </div>
        <div v-show="!sectionCollapsed.reasonsRisks">
          <div class="analysis-details">
            <div class="detail-section reasons">
              <div class="section-title">
                <a-icon type="bulb" theme="twoTone" twoToneColor="#52c41a" />
                <span>{{ $t('fastAnalysis.keyReasons') }}</span>
              </div>
              <ul class="detail-list">
                <li v-for="(reason, idx) in result.reasons" :key="'r-'+idx">{{ reason }}</li>
              </ul>
            </div>
            <div class="detail-section risks">
              <div class="section-title">
                <a-icon type="warning" theme="twoTone" twoToneColor="#faad14" />
                <span>{{ $t('fastAnalysis.risks') }}</span>
              </div>
              <ul class="detail-list">
                <li v-for="(risk, idx) in result.risks" :key="'k-'+idx">{{ risk }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Technical Indicators (Collapsible, default collapsed) -->
      <div class="report-section" v-if="result.indicators && Object.keys(result.indicators).length > 0">
        <div class="report-section-header" @click="toggleSection('indicators')">
          <span class="rsh-title">
            <a-icon type="stock" />
            {{ $t('fastAnalysis.indicators') }}
            <a-tag color="blue" class="indicators-pro-badge">{{ $t('fastAnalysis.indicatorsProBadge') }}</a-tag>
          </span>
          <a-icon type="right" class="section-toggle-arrow" :class="{ open: !sectionCollapsed.indicators }" />
        </div>
        <div v-show="!sectionCollapsed.indicators">
          <div class="indicators-section">
            <div class="indicators-methodology">
              <a-icon type="experiment" />
              <span>{{ $t('fastAnalysis.indicatorsProSubtitle') }}</span>
            </div>
            <div class="indicators-grid">
              <div class="indicator-item" v-if="result.indicators.rsi">
                <div class="indicator-name">RSI (14)</div>
                <div class="indicator-value" :class="getRsiClass(result.indicators.rsi.value)">
                  {{ formatNumber(result.indicators.rsi.value, 1) }}
                </div>
                <div class="indicator-signal">{{ translateSignal(result.indicators.rsi.signal) }}</div>
              </div>
              <div class="indicator-item" v-if="result.indicators.macd">
                <div class="indicator-name">MACD (12,26,9)</div>
                <div class="indicator-value" :class="result.indicators.macd.signal === 'bullish' ? 'bullish' : (result.indicators.macd.signal === 'bearish' ? 'bearish' : '')">
                  {{ translateTrend(result.indicators.macd.trend) }}
                </div>
                <div class="indicator-signal">{{ translateSignal(result.indicators.macd.signal) }}</div>
              </div>
              <div class="indicator-item" v-if="result.indicators.moving_averages">
                <div class="indicator-name">{{ $t('fastAnalysis.maTrend') }}</div>
                <div class="indicator-value" :class="getMaTrendClass(result.indicators.moving_averages.trend)">
                  {{ translateTrend(result.indicators.moving_averages.trend) }}
                </div>
              </div>
              <div class="indicator-item" v-if="result.indicators.volatility && result.indicators.volatility.atr != null">
                <div class="indicator-name">ATR (14)</div>
                <div class="indicator-value" :class="getVolatilityClass(result.indicators.volatility.level)">
                  ${{ formatPrice(result.indicators.volatility.atr) }}
                </div>
                <div class="indicator-signal">{{ $t('fastAnalysis.atrTrueRange') }}</div>
              </div>
              <div class="indicator-item" v-if="result.indicators.bollinger && result.indicators.bollinger.BB_width != null">
                <div class="indicator-name">{{ $t('fastAnalysis.bbWidth') }}</div>
                <div class="indicator-value">{{ formatNumber(result.indicators.bollinger.BB_width, 2) }}%</div>
                <div class="indicator-signal">{{ $t('fastAnalysis.bbWidthHint') }}</div>
              </div>
              <div class="indicator-item" v-if="result.indicators.price_position != null">
                <div class="indicator-name">{{ $t('fastAnalysis.rangePct20') }}</div>
                <div class="indicator-value">{{ formatNumber(result.indicators.price_position, 1) }}%</div>
                <div class="indicator-signal">{{ $t('fastAnalysis.rangePct20Hint') }}</div>
              </div>
              <div class="indicator-item" v-if="result.indicators.volume_ratio != null">
                <div class="indicator-name">{{ $t('fastAnalysis.volumeRatio') }}</div>
                <div class="indicator-value" :class="volumeRatioClass(result.indicators.volume_ratio)">
                  {{ formatNumber(result.indicators.volume_ratio, 2) }}×
                </div>
                <div class="indicator-signal">{{ $t('fastAnalysis.volumeRatioHint') }}</div>
              </div>
              <div class="indicator-item" v-if="result.indicators.levels">
                <div class="indicator-name">{{ $t('fastAnalysis.support') }}</div>
                <div class="indicator-value">${{ formatPrice(result.indicators.levels.support) }}</div>
              </div>
              <div class="indicator-item" v-if="result.indicators.levels">
                <div class="indicator-name">{{ $t('fastAnalysis.resistance') }}</div>
                <div class="indicator-value">${{ formatPrice(result.indicators.levels.resistance) }}</div>
              </div>
              <div class="indicator-item" v-if="result.indicators.volatility">
                <div class="indicator-name">{{ $t('fastAnalysis.volatility') }}</div>
                <div class="indicator-value" :class="getVolatilityClass(result.indicators.volatility.level)">
                  {{ translateVolatility(result.indicators.volatility.level) }} ({{ result.indicators.volatility.pct }}%)
                </div>
              </div>
            </div>

            <div v-if="professionalIndicatorRows.length" class="indicators-pro-wrap">
              <div class="indicators-pro-title">
                <a-icon type="deployment-unit" />
                {{ ($i18n && $i18n.locale === 'zh-CN') ? '量化参数明细' : 'Quant Parameters' }}
              </div>
              <a-descriptions
                bordered
                size="small"
                :column="2"
                class="indicators-pro-desc"
              >
                <a-descriptions-item
                  v-for="row in professionalIndicatorRows"
                  :key="row.key"
                  :label="row.label"
                >
                  <span :class="row.valueClass">{{ row.text }}</span>
                </a-descriptions-item>
              </a-descriptions>
            </div>
          </div>
        </div>
      </div>

      <!-- Feedback Section -->
      <div class="feedback-section">
        <div class="feedback-question">{{ $t('fastAnalysis.wasHelpful') }}</div>
        <div class="feedback-buttons">
          <a-button
            :type="userFeedback === 'helpful' ? 'primary' : 'default'"
            size="small"
            @click="submitFeedback('helpful')"
            :loading="feedbackLoading === 'helpful'"
          >
            <a-icon type="like" />
            {{ $t('fastAnalysis.helpful') }}
          </a-button>
          <a-button
            :type="userFeedback === 'not_helpful' ? 'danger' : 'default'"
            size="small"
            @click="submitFeedback('not_helpful')"
            :loading="feedbackLoading === 'not_helpful'"
          >
            <a-icon type="dislike" />
            {{ $t('fastAnalysis.notHelpful') }}
          </a-button>
        </div>
        <div class="analysis-meta">
          <span>{{ $t('fastAnalysis.analysisTime') }}: {{ result.analysis_time_ms }}ms</span>
          <span v-if="result.memory_id">ID: #{{ result.memory_id }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { submitFeedback as submitFeedbackApi, getPerformanceStats } from '@/api/fast-analysis'

export default {
  name: 'FastAnalysisReport',
  props: {
    result: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    },
    errorTone: {
      type: String,
      default: 'error',
      validator: (v) => ['error', 'warning', 'info'].includes(v)
    }
  },
  data () {
    return {
      userFeedback: null,
      feedbackLoading: null,
      progress: 0,
      elapsedSeconds: 0,
      mainTimer: null,
      performanceStats: null,
      performanceLoading: false,
      sectionCollapsed: {
        trendOutlook: false,
        scores: false,
        cryptoFactors: false,
        detailedAnalysis: false,
        reasonsRisks: false,
        indicators: false
      }
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    progressPercent () {
      return Math.round(this.progress * 10) / 10
    },
    step () {
      if (this.progress < 25) return 1
      if (this.progress < 50) return 2
      if (this.progress < 75) return 3
      return 4
    },
    currentStepText () {
      const steps = {
        1: this.$t('fastAnalysis.step1') || '获取实时数据',
        2: this.$t('fastAnalysis.step2') || '计算技术指标',
        3: this.$t('fastAnalysis.step3') || 'AI深度分析',
        4: this.$t('fastAnalysis.step4') || '生成报告'
      }
      return steps[this.step] || this.$t('fastAnalysis.preparing') || '准备中...'
    },
    elapsedTimeText () {
      if (this.elapsedSeconds < 60) {
        return `${this.elapsedSeconds}s`
      }
      const mins = Math.floor(this.elapsedSeconds / 60)
      const secs = this.elapsedSeconds % 60
      return `${mins}m ${secs}s`
    },
    isHoldDecision () {
      return this.result && this.result.decision === 'HOLD'
    },
    isCryptoResult () {
      return String(this.result?.market || '').toLowerCase() === 'crypto'
    },
    decisionClass () {
      if (!this.result) return ''
      const d = this.result.decision
      if (d === 'BUY') return 'decision-buy'
      if (d === 'SELL') return 'decision-sell'
      return 'decision-hold'
    },
    decisionIcon () {
      if (!this.result) return 'question'
      const d = this.result.decision
      if (d === 'BUY') return 'arrow-up'
      if (d === 'SELL') return 'arrow-down'
      return 'pause'
    },
    confidenceColor () {
      const c = this.result?.confidence || 50
      if (c >= 70) return '#52c41a'
      if (c >= 50) return 'var(--primary-color, #1890ff)'
      return '#faad14'
    },
    consensusBlock () {
      const c = this.result?.consensus
      if (!c || typeof c !== 'object') return null
      if (c.consensus_decision == null && c.consensus_score == null) return null
      return c
    },
    tradingPlan () {
      const tp = this.result?.trading_plan || {}
      const entry = tp.entry_price ?? tp.entryPrice
      const sl = tp.stop_loss ?? tp.stopLoss ?? tp.loss_exit_price
      const tpv = tp.take_profit ?? tp.takeProfit ?? tp.profit_target_price
      return {
        entry_price: entry,
        stop_loss: sl,
        take_profit: tpv
      }
    },
    trendOutlookRaw () {
      return this.result?.trend_outlook || this.result?.trendOutlook || null
    },
    trendOutlookSummaryText () {
      const s = this.result?.trend_outlook_summary || this.result?.trendOutlookSummary
      return (s && String(s).trim()) ? String(s).trim() : ''
    },
    trendOutlookBlocks () {
      const o = this.trendOutlookRaw
      if (!o || typeof o !== 'object') return []
      const keys = [
        { key: 'next_24h', labelKey: 'fastAnalysis.outlook24h' },
        { key: 'next_3d', labelKey: 'fastAnalysis.outlook3d' },
        { key: 'next_1w', labelKey: 'fastAnalysis.outlook1w' },
        { key: 'next_1m', labelKey: 'fastAnalysis.outlook1m' }
      ]
      return keys.map(({ key, labelKey }) => {
        const block = o[key] || {}
        return {
          key,
          label: this.$t(labelKey),
          trend: block.trend,
          score: block.score,
          strength: block.strength
        }
      }).filter(r => {
        const b = o[r.key]
        return b && typeof b === 'object' && (b.trend != null || b.score != null)
      })
    },
    stopLossHintText () {
      const d = String(this.result?.decision || '').toUpperCase()
      if (d === 'SELL') return this.$t('fastAnalysis.stopLossHintShort')
      return this.$t('fastAnalysis.stopLossHint')
    },
    takeProfitHintText () {
      const d = String(this.result?.decision || '').toUpperCase()
      if (d === 'SELL') return this.$t('fastAnalysis.takeProfitHintShort')
      return this.$t('fastAnalysis.takeProfitHint')
    },
    professionalIndicatorRows () {
      const ind = this.result?.indicators || {}
      const rows = []
      const add = (key, label, text, valueClass = '') => {
        if (text === undefined || text === null || text === '') return
        rows.push({ key, label, text: String(text), valueClass })
      }

      const m = ind.macd || {}
      if (m.value != null) add('macd_dif', this.$t('fastAnalysis.macdDif'), this.formatCompactNum(m.value))
      if (m.signal_line != null) add('macd_dea', this.$t('fastAnalysis.macdDea'), this.formatCompactNum(m.signal_line))
      if (m.histogram != null) {
        const h = Number(m.histogram)
        const cls = h > 0 ? 'bullish' : (h < 0 ? 'bearish' : '')
        add('macd_hist', this.$t('fastAnalysis.macdHist'), this.formatCompactNum(m.histogram), cls)
      }

      const ma = ind.moving_averages || {}
      if (ma.ma5 != null) add('ma5', this.$t('fastAnalysis.ma5Label'), '$' + this.formatPrice(ma.ma5))
      if (ma.ma10 != null) add('ma10', this.$t('fastAnalysis.ma10Label'), '$' + this.formatPrice(ma.ma10))
      if (ma.ma20 != null) add('ma20', this.$t('fastAnalysis.ma20Label'), '$' + this.formatPrice(ma.ma20))

      const bb = ind.bollinger || {}
      if (bb.BB_upper != null) add('bb_u', this.$t('fastAnalysis.bbUpper'), '$' + this.formatPrice(bb.BB_upper))
      if (bb.BB_middle != null) add('bb_m', this.$t('fastAnalysis.bbMiddle'), '$' + this.formatPrice(bb.BB_middle))
      if (bb.BB_lower != null) add('bb_l', this.$t('fastAnalysis.bbLower'), '$' + this.formatPrice(bb.BB_lower))
      if (bb.BB_width != null) add('bb_w', this.$t('fastAnalysis.bbWidthPct'), this.formatNumber(bb.BB_width, 2) + '%')

      const lv = ind.levels || {}
      if (lv.pivot != null) add('piv', this.$t('fastAnalysis.pivotStd'), '$' + this.formatPrice(lv.pivot))
      if (lv.s1 != null) add('s1', this.$t('fastAnalysis.levelS1'), '$' + this.formatPrice(lv.s1))
      if (lv.r1 != null) add('r1', this.$t('fastAnalysis.levelR1'), '$' + this.formatPrice(lv.r1))
      if (lv.s2 != null) add('s2', this.$t('fastAnalysis.levelS2'), '$' + this.formatPrice(lv.s2))
      if (lv.r2 != null) add('r2', this.$t('fastAnalysis.levelR2'), '$' + this.formatPrice(lv.r2))
      if (lv.swing_high != null) add('sw_h', this.$t('fastAnalysis.swingHigh20'), '$' + this.formatPrice(lv.swing_high))
      if (lv.swing_low != null) add('sw_l', this.$t('fastAnalysis.swingLow20'), '$' + this.formatPrice(lv.swing_low))

      const vol = ind.volatility || {}
      if (vol.atr != null) {
        const pct = vol.pct != null ? this.formatNumber(vol.pct, 2) + '% ATR/Price' : ''
        add('atr14', this.$t('fastAnalysis.atr14Label'), '$' + this.formatPrice(vol.atr) + (pct ? ' · ' + pct : ''))
      }

      const tl = ind.trading_levels || {}
      if (tl.risk_reward_ratio != null && Number(tl.risk_reward_ratio) > 0) {
        add('rr', this.$t('fastAnalysis.rrLongRef'), '1 : ' + this.formatNumber(tl.risk_reward_ratio, 2))
      }

      if (ind.current_price != null) {
        add('cref', this.$t('fastAnalysis.refClose'), '$' + this.formatPrice(ind.current_price))
      }

      return rows
    },
    cryptoFactorRows () {
      if (!this.isCryptoResult) return []
      const cf = this.result?.crypto_factors || {}
      const rows = []
      const add = (key, label, text, valueClass = '', hint = '') => {
        if (text === undefined || text === null || text === '') return
        rows.push({ key, label, text: String(text), valueClass, hint })
      }

      const usd = (val) => {
        if (val === undefined || val === null || val === '') return '--'
        const num = parseFloat(val)
        if (isNaN(num)) return '--'
        if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B USD`
        if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M USD`
        if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(2)}K USD`
        return `${num.toFixed(2)} USD`
      }
      const pct = (val) => {
        if (val === undefined || val === null || val === '') return '--'
        const num = parseFloat(val)
        return isNaN(num) ? '--' : `${num.toFixed(2)}%`
      }
      const localZh = this.$i18n && this.$i18n.locale === 'zh-CN'

      add('volume_24h', localZh ? '24h成交额' : '24h Volume', usd(cf.volume_24h))
      add('volume_change_24h', localZh ? '成交活跃度变化' : 'Volume Activity Change', pct(cf.volume_change_24h), Number(cf.volume_change_24h) > 0 ? 'bullish' : (Number(cf.volume_change_24h) < 0 ? 'bearish' : ''))
      add('funding_rate', localZh ? '资金费率' : 'Funding Rate', pct(cf.funding_rate), Number(cf.funding_rate) > 0 ? 'bullish' : (Number(cf.funding_rate) < 0 ? 'bearish' : ''))
      add('open_interest', localZh ? '未平仓量 OI' : 'Open Interest', usd(cf.open_interest))
      add('open_interest_change_24h', localZh ? 'OI变化(24h)' : 'OI Change (24h)', pct(cf.open_interest_change_24h), Number(cf.open_interest_change_24h) > 0 ? 'bullish' : (Number(cf.open_interest_change_24h) < 0 ? 'bearish' : ''))
      add('long_short_ratio', localZh ? '多空比' : 'Long / Short Ratio', this.formatCompactNum(cf.long_short_ratio))
      add('exchange_netflow', localZh ? '交易所净流' : 'Exchange Netflow', usd(cf.exchange_netflow), Number(cf.exchange_netflow) < 0 ? 'bullish' : (Number(cf.exchange_netflow) > 0 ? 'bearish' : ''))
      add('stablecoin_netflow', localZh ? '稳定币净流' : 'Stablecoin Netflow', usd(cf.stablecoin_netflow), Number(cf.stablecoin_netflow) > 0 ? 'bullish' : (Number(cf.stablecoin_netflow) < 0 ? 'bearish' : ''))
      return rows
    },
    cryptoSignals () {
      if (!this.isCryptoResult) return []
      const sig = (this.result?.crypto_factors || {}).signals || {}
      const localZh = this.$i18n && this.$i18n.locale === 'zh-CN'
      const items = []
      if (sig.derivatives_bias) {
        items.push({
          key: 'derivatives_bias',
          color: sig.derivatives_bias === 'bullish' ? 'green' : (sig.derivatives_bias === 'bearish' ? 'red' : 'blue'),
          label: `${localZh ? '衍生品' : 'Derivatives'}: ${sig.derivatives_bias}`
        })
      }
      if (sig.flow_bias) {
        items.push({
          key: 'flow_bias',
          color: sig.flow_bias === 'bullish' ? 'green' : (sig.flow_bias === 'bearish' ? 'red' : 'blue'),
          label: `${localZh ? '资金流' : 'Flow'}: ${sig.flow_bias}`
        })
      }
      if (sig.squeeze_risk) {
        items.push({
          key: 'squeeze_risk',
          color: sig.squeeze_risk === 'high' ? 'red' : (sig.squeeze_risk === 'medium' ? 'orange' : 'green'),
          label: `${localZh ? '挤仓风险' : 'Squeeze Risk'}: ${sig.squeeze_risk}`
        })
      }
      return items
    },
    cryptoFactorScoreClass () {
      const score = Number(this.result?.crypto_factor_score)
      if (Number.isNaN(score)) return ''
      if (score >= 20) return 'bullish'
      if (score <= -20) return 'bearish'
      return 'neutral'
    },
    cryptoFactorScoreText () {
      const score = Number(this.result?.crypto_factor_score)
      const localZh = this.$i18n && this.$i18n.locale === 'zh-CN'
      if (Number.isNaN(score)) return localZh ? '数据不足' : 'Insufficient data'
      if (score >= 40) return localZh ? '明显偏多' : 'Bullish'
      if (score >= 20) return localZh ? '轻度偏多' : 'Mild Bullish'
      if (score <= -40) return localZh ? '明显偏空' : 'Bearish'
      if (score <= -20) return localZh ? '轻度偏空' : 'Mild Bearish'
      return localZh ? '中性' : 'Neutral'
    },
    insufficientCreditsError () {
      if (!this.error) return false
      const e = String(this.error)
      return e.includes('积分不足') || e.toLowerCase().includes('insufficient credits')
    },
    errorTitle () {
      if (this.errorTone === 'warning') {
        return this.$t('fastAnalysis.analysisInProgressTitle')
      }
      if (this.insufficientCreditsError) {
        return this.$t('fastAnalysis.insufficientCredits')
      }
      return this.$t('fastAnalysis.error')
    }
  },
  watch: {
    result (newVal) {
      this.userFeedback = null
      if (newVal && newVal.market && newVal.symbol) {
        this.fetchPerformance(newVal.market, newVal.symbol)
      }
    },
    loading: {
      handler (newVal) {
        if (newVal) {
          this.startProgressTimer()
        } else {
          this.stopProgressTimer()
        }
      },
      immediate: true
    }
  },
  mounted () {
    if (this.loading) {
      this.startProgressTimer()
    }
  },
  beforeDestroy () {
    this.stopProgressTimer()
  },
  methods: {
    formatPrice (value) {
      if (value === undefined || value === null) return '--'
      const num = parseFloat(value)
      if (isNaN(num)) return '--'
      // Smart formatting: more decimals for small numbers
      if (num < 1) return num.toFixed(6)
      if (num < 100) return num.toFixed(4)
      if (num < 10000) return num.toFixed(2)
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatNumber (value, decimals = 2) {
      if (value === undefined || value === null) return '--'
      const num = parseFloat(value)
      if (isNaN(num)) return '--'
      return num.toFixed(decimals)
    },
    formatConsensusNum (n) {
      if (n === undefined || n === null || n === '') return '--'
      const x = Number(n)
      return Number.isNaN(x) ? '--' : x.toFixed(1)
    },
    formatAgreementPct (r) {
      const x = Number(r)
      if (Number.isNaN(x)) return '--'
      return `${Math.round(x * 100)}%`
    },
    formatProgress (value) {
      const num = parseFloat(value) || 0
      return num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)
    },
    formatOutlookTrend (trend) {
      const t = String(trend || 'HOLD').toUpperCase()
      if (t === 'BUY') return this.$t('fastAnalysis.outlookBull')
      if (t === 'SELL') return this.$t('fastAnalysis.outlookBear')
      return this.$t('fastAnalysis.outlookNeutral')
    },
    outlookTrendClass (trend) {
      const t = String(trend || '').toUpperCase()
      if (t === 'BUY') return 'trend-bull'
      if (t === 'SELL') return 'trend-bear'
      return 'trend-neutral'
    },
    formatCompactNum (value) {
      const x = parseFloat(value)
      if (Number.isNaN(x)) return '--'
      if (x !== 0 && Math.abs(x) < 1e-4) return x.toExponential(2)
      if (Math.abs(x) < 1) return x.toFixed(6)
      if (Math.abs(x) < 100) return x.toFixed(4)
      return x.toFixed(2)
    },
    volumeRatioClass (ratio) {
      const r = parseFloat(ratio)
      if (Number.isNaN(r)) return ''
      if (r >= 1.5) return 'bullish'
      if (r <= 0.65) return 'bearish'
      return ''
    },
    getScoreColor (score) {
      if (score >= 70) return '#52c41a'
      if (score >= 50) return 'var(--primary-color, #1890ff)'
      if (score >= 30) return '#faad14'
      return '#ff4d4f'
    },
    getScoreTagColor (score) {
      if (score >= 70) return 'green'
      if (score >= 50) return 'blue'
      if (score >= 30) return 'orange'
      return 'red'
    },
    getRsiClass (value) {
      if (value < 30) return 'oversold'
      if (value > 70) return 'overbought'
      return ''
    },
    getMaTrendClass (trend) {
      if (!trend) return ''
      if (trend.includes('uptrend') || trend.includes('strong_uptrend')) return 'bullish'
      if (trend.includes('downtrend') || trend.includes('strong_downtrend')) return 'bearish'
      return ''
    },
    getVolatilityClass (level) {
      if (level === 'high') return 'high-volatility'
      if (level === 'low') return 'low-volatility'
      return ''
    },
    translateSignal (signal) {
      if (!signal) return '--'
      const key = `fastAnalysis.signal.${signal}`
      const translated = this.$t(key)
      return translated === key ? signal : translated
    },
    translateTrend (trend) {
      if (!trend) return '--'
      const key = `fastAnalysis.trend.${trend}`
      const translated = this.$t(key)
      return translated === key ? trend : translated
    },
    translateVolatility (level) {
      if (!level) return '--'
      const key = `fastAnalysis.volatilityLevel.${level}`
      const translated = this.$t(key)
      return translated === key ? level : translated
    },
    toggleSection (key) {
      this.$set(this.sectionCollapsed, key, !this.sectionCollapsed[key])
    },
    async fetchPerformance (market, symbol) {
      this.performanceLoading = true
      try {
        const res = await getPerformanceStats({ market, symbol, days: 30 })
        if (res && res.code === 1 && res.data) {
          this.performanceStats = res.data
        }
      } catch (e) {
        console.warn('Performance stats unavailable:', e)
      } finally {
        this.performanceLoading = false
      }
    },
    async submitFeedback (feedback) {
      if (!this.result?.memory_id) {
        this.$message.warning(this.$t('fastAnalysis.feedbackUnavailable') || '反馈功能暂不可用，请刷新后重试')
        return
      }

      this.feedbackLoading = feedback
      try {
        await submitFeedbackApi({
          memory_id: this.result.memory_id,
          feedback: feedback
        })
        this.userFeedback = feedback
        this.$message.success(this.$t('fastAnalysis.feedbackThanks'))
      } catch (e) {
        console.error('Feedback error:', e)
        this.$message.error(this.$t('fastAnalysis.feedbackFailed'))
      } finally {
        this.feedbackLoading = null
      }
    },
    startProgressTimer () {
      this.stopProgressTimer()

      this.progress = 0
      this.elapsedSeconds = 0

      const startTime = Date.now()

      this.mainTimer = window.setInterval(() => {
        this.elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)

        if (this.progress < 75) {
          this.progress = Math.min(this.progress + 1, 75)
        } else if (this.progress < 90) {
          this.progress = Math.min(this.progress + 0.5, 90)
        } else if (this.progress < 95) {
          this.progress = Math.min(this.progress + 0.2, 95)
        }
      }, 100)
    },
    stopProgressTimer () {
      if (this.mainTimer) {
        window.clearInterval(this.mainTimer)
        this.mainTimer = null
      }
      this.progress = 0
      this.elapsedSeconds = 0
    }
  }
}
</script>

<style lang="less" scoped>
@rpt-bg: #f7f8fa;
@rpt-surface: #fff;
@rpt-border: #ebeef2;
@rpt-text: #1a1a2e;
@rpt-text2: #555;
@rpt-text3: #999;
@rpt-green: #10b981;
@rpt-red: #ef4444;
@rpt-amber: #f59e0b;
@rpt-pink: #ec4899;
@rpt-mono: 'SF Mono', 'Cascadia Code', 'Consolas', 'Monaco', monospace;
@rpt-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;

.fast-analysis-report {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  background: @rpt-bg;
  font-family: @rpt-sans;
  -webkit-font-smoothing: antialiased;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #d0d4da; border-radius: 2px; }

  // ── Loading ──
  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 420px;

    .loading-content-pro {
      width: 100%;
      max-width: 400px;
      padding: 40px;

      .loading-header {
        display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 32px;
        .loading-icon-pro { font-size: 26px; color: var(--primary-color, #1890ff); }
        .loading-title { font-size: 18px; font-weight: 700; color: @rpt-text; }
      }
      .progress-wrapper {
        margin-bottom: 24px; position: relative;
        .progress-text { position: absolute; right: 0; top: -22px; font-size: 13px; font-weight: 700; color: var(--primary-color, #1890ff); }
      }
      .current-step {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        padding: 10px 20px; background: color-mix(in srgb, var(--primary-color, #1890ff) 6%, transparent); border-radius: 8px; margin-bottom: 20px;
        color: var(--primary-color, #1890ff); font-size: 13px; font-weight: 600;
        .anticon { font-size: 15px; }
      }
      .steps-list {
        display: flex; flex-direction: column; gap: 8px;
        .step-item {
          display: flex; align-items: center; gap: 10px; padding: 9px 14px;
          background: rgba(0,0,0,0.02); border-radius: 8px; font-size: 12px; color: @rpt-text3; transition: all 0.3s;
          .step-dot { width: 7px; height: 7px; border-radius: 50%; background: #ddd; transition: all 0.3s; }
          .step-text { flex: 1; }
          .step-check { color: @rpt-green; font-size: 13px; }
          &.active { background: color-mix(in srgb, var(--primary-color, #1890ff) 6%, transparent); color: var(--primary-color, #1890ff); font-weight: 600; .step-dot { background: var(--primary-color, #1890ff); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color, #1890ff) 15%, transparent); } }
          &.done { color: @rpt-green; .step-dot { background: @rpt-green; } }
        }
      }
      .loading-footer { margin-top: 20px; text-align: center; .elapsed-time { font-size: 12px; color: @rpt-text3; font-family: 'SF Mono', Monaco, monospace; } }
    }
  }

  // ── Empty ──
  .empty-container {
    display: flex; align-items: center; justify-content: center; min-height: 400px;
    .empty-content {
      text-align: center;
      .empty-icon { font-size: 56px; color: #ccc; }
      .empty-title { margin-top: 14px; font-size: 17px; font-weight: 700; color: @rpt-text; }
      .empty-hint { margin-top: 6px; color: @rpt-text3; font-size: 13px; }
    }
  }

  // ── Performance Strip ──
  .performance-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0;
    background: @rpt-surface;
    margin-bottom: 2px;

    .perf-item {
      text-align: center;
      padding: 12px 8px;
      position: relative;

      &:not(:last-child)::after {
        content: '';
        position: absolute;
        right: 0;
        top: 20%;
        height: 60%;
        width: 1px;
        background: @rpt-border;
      }

      .perf-value {
        display: block;
        font-size: 18px;
        font-weight: 800;
        color: @rpt-text;
        font-family: @rpt-mono;
        &.positive { color: @rpt-green; }
        &.negative { color: @rpt-red; }
      }

      .perf-label {
        display: block;
        font-size: 10px;
        color: @rpt-text3;
        margin-top: 2px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
    }
  }

  // ── Report Section (Collapsible) ──
  .report-section {
    background: @rpt-surface;
    margin-bottom: 2px;
  }

  .report-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;

    &:hover { background: rgba(0,0,0,0.02); }

    .rsh-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: @rpt-text;
      .anticon { color: var(--primary-color, #1890ff); font-size: 15px; }
      .indicators-pro-badge { margin: 0; font-size: 10px; line-height: 16px; font-weight: 600; }
    }
  }

  .section-clickable {
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
    &:hover { background: rgba(0,0,0,0.02); }
  }

  .section-toggle-arrow {
    font-size: 12px;
    color: @rpt-text3;
    margin-left: auto;
    transition: transform 0.25s ease;
    &.open { transform: rotate(90deg); }
  }

  // ── Result ──
  .result-container {

    // ─ Decision Hero ─
    .decision-card {
      padding: 28px 24px;
      margin-bottom: 2px;
      border-radius: 16px 16px 0 0;
      background: @rpt-surface;
      position: relative;
      overflow: hidden;

      &::after {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: var(--primary-color, #1890ff);
      }
      &.decision-buy::after  { background: linear-gradient(90deg, @rpt-green, #34d399); }
      &.decision-sell::after { background: linear-gradient(90deg, @rpt-red, #f87171); }
      &.decision-hold::after { background: linear-gradient(90deg, @rpt-amber, #fbbf24); }

      .decision-main {
        display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
        .decision-badge {
          display: flex; align-items: center; gap: 12px;
          .anticon { font-size: 28px; }
          .decision-text { font-size: 32px; font-weight: 800; letter-spacing: 1px; color: @rpt-text; font-family: @rpt-sans; }
        }
        .confidence-ring {
          text-align: center;
          .confidence-value { font-size: 17px; font-weight: 800; color: @rpt-text; font-family: @rpt-mono; }
          .confidence-label { font-size: 11px; color: @rpt-text3; margin-top: 2px; font-family: @rpt-sans; }
        }
      }
      .decision-summary { font-size: 14px; line-height: 1.75; color: @rpt-text2; padding-top: 14px; border-top: 1px solid @rpt-border; }
      .consensus-strip {
        margin-top: 12px; padding: 10px 14px; border-radius: 8px;
        background: color-mix(in srgb, var(--primary-color, #1890ff) 4%, transparent); font-size: 12px; color: @rpt-text2;
        .consensus-strip-title { display: flex; align-items: center; gap: 6px; font-weight: 700; margin-bottom: 6px; color: var(--primary-color, #1890ff); font-size: 12px; }
        .consensus-strip-metrics { display: flex; flex-wrap: wrap; gap: 8px 18px; .cm-item em { font-style: normal; color: @rpt-text3; margin-right: 4px; } }
      }

      &.decision-buy  .decision-badge { .anticon { color: @rpt-green; } .decision-text { color: @rpt-green; } }
      &.decision-sell .decision-badge { .anticon { color: @rpt-red; } .decision-text { color: @rpt-red; } }
      &.decision-hold .decision-badge { .anticon { color: @rpt-amber; } .decision-text { color: @rpt-amber; } }
    }

    // ─ Price Strip (no separate cards) ─
    .price-info-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
      background: @rpt-surface; margin-bottom: 2px;

      &.hold-mode { grid-template-columns: 1fr; }

      .price-card {
        padding: 16px 14px; text-align: center; position: relative;
        background: transparent; border: none; box-shadow: none; border-radius: 0;

        &:not(:last-child)::after {
          content: ''; position: absolute; right: 0; top: 20%; height: 60%; width: 1px; background: @rpt-border;
        }

        .price-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: @rpt-text3; margin-bottom: 6px; }
        .price-value { font-size: 18px; font-weight: 700; color: @rpt-text; font-family: @rpt-mono; &.positive { color: @rpt-green; } &.negative { color: @rpt-red; } }
        .price-hint { font-size: 9px; color: #bbb; margin-top: 4px; .anticon { margin-right: 2px; } }
        .price-change { font-size: 13px; margin-top: 3px; font-weight: 700; font-family: @rpt-mono; &.positive { color: @rpt-green; } &.negative { color: @rpt-red; } }

        &.current .price-label { color: #3b82f6; }
        &.entry .price-label { color: var(--primary-color, #1890ff); }
        &.stop .price-label { color: @rpt-red; }
        &.target .price-label { color: @rpt-green; }
      }
    }

    // ─ Trend Outlook ─
    .trend-outlook-card {
      background: @rpt-surface; padding: 18px 20px; margin-bottom: 2px;

      .trend-outlook-header {
        display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: @rpt-text; margin-bottom: 10px;
        .anticon { color: var(--primary-color, #1890ff); font-size: 15px; }
      }
      .trend-outlook-summary { font-size: 12px; line-height: 1.65; color: @rpt-text2; margin-bottom: 12px; padding: 10px 12px; background: rgba(0,0,0,0.02); border-radius: 8px; }
      .trend-outlook-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .trend-outlook-item {
        background: rgba(0,0,0,0.02); border-radius: 8px; padding: 10px; text-align: center;
        .to-label { font-size: 10px; color: @rpt-text3; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
        .to-trend { font-size: 13px; font-weight: 700; margin-bottom: 4px; &.trend-bull { color: @rpt-green; } &.trend-bear { color: @rpt-red; } &.trend-neutral { color: @rpt-amber; } }
        .to-meta { font-size: 10px; color: @rpt-text3; display: flex; justify-content: center; gap: 6px; }
      }
    }
    @media (max-width: 992px) { .trend-outlook-card .trend-outlook-grid { grid-template-columns: repeat(2, 1fr); } }

    // ─ Scores Row (inline bar, no separate boxes) ─
    .scores-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
      background: @rpt-surface; margin-bottom: 2px;

      .score-item {
        padding: 14px 16px; position: relative;
        background: transparent; border: none; box-shadow: none; border-radius: 0;

        &:not(:last-child)::after {
          content: ''; position: absolute; right: 0; top: 16%; height: 68%; width: 1px; background: @rpt-border;
        }

        .score-header { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: @rpt-text3; margin-bottom: 8px; .anticon { font-size: 14px; color: var(--primary-color, #1890ff); } }
        .score-value { text-align: right; font-size: 22px; font-weight: 800; color: @rpt-text; margin-top: 6px; font-family: @rpt-mono; }

        &.overall { background: color-mix(in srgb, var(--primary-color, #1890ff) 3%, transparent); .score-header .anticon { color: var(--primary-color, #1890ff); } }
      }
    }

    // ─ Detailed Analysis (clean sections, no boxes) ─
    .detailed-analysis {
      display: flex; flex-direction: column; gap: 0;
      background: @rpt-surface; margin-bottom: 2px; padding: 0;

      .analysis-card {
        padding: 20px 24px; border: none; box-shadow: none; border-radius: 0; background: transparent;
        border-bottom: 1px solid @rpt-border;
        position: relative;

        &:last-child { border-bottom: none; }

        &::before {
          content: ''; position: absolute; left: 0; top: 20px; bottom: 20px; width: 3px; border-radius: 2px;
        }
        &.technical::before { background: #3b82f6; }
        &.fundamental::before { background: var(--primary-color, #1890ff); }
        &.sentiment::before { background: @rpt-pink; }

        .analysis-card-header {
          display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 14px; font-weight: 700; color: @rpt-text; padding-left: 12px;
          .anticon { font-size: 16px; }
          &.technical .anticon { color: #3b82f6; }
          &.fundamental .anticon { color: var(--primary-color, #1890ff); }
          &.sentiment .anticon { color: @rpt-pink; }
        }
        .analysis-card-content { font-size: 13px; line-height: 1.85; color: @rpt-text2; padding-left: 12px; }
      }
    }

    // ─ Reasons & Risks (side-by-side, no separate boxes) ─
    .analysis-details {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0;
      background: @rpt-surface; margin-bottom: 2px;

      .detail-section {
        padding: 20px 24px; border: none; box-shadow: none; border-radius: 0; background: transparent;

        &.reasons { border-right: 1px solid @rpt-border; }

        .section-title {
          display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; margin-bottom: 12px; color: @rpt-text;
          text-transform: uppercase; letter-spacing: 0.3px;
        }
        .detail-list {
          list-style: none; padding: 0; margin: 0;
          li {
            padding: 8px 0; font-size: 13px; line-height: 1.65; color: @rpt-text2;
            border-bottom: 1px solid rgba(0,0,0,0.04);
            &:last-child { border-bottom: none; }
            &::before { content: ''; display: inline-block; width: 5px; height: 5px; border-radius: 50%; margin-right: 10px; vertical-align: middle; }
          }
        }
        &.reasons .detail-list li::before { background: @rpt-green; }
        &.risks .detail-list li::before { background: @rpt-amber; }
      }
    }

    // ─ Indicators (clean grid) ─
    .indicators-section {
      background: @rpt-surface; padding: 20px 24px; margin-bottom: 2px;
      border: none; box-shadow: none; border-radius: 0;

      .section-title {
        display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
        font-size: 13px; font-weight: 700; margin-bottom: 8px; color: @rpt-text;
        text-transform: uppercase; letter-spacing: 0.3px;
        .anticon { color: var(--primary-color, #1890ff); }
        .indicators-pro-badge { margin: 0; font-size: 10px; line-height: 16px; font-weight: 600; }
      }

      .indicators-methodology {
        display: flex; align-items: flex-start; gap: 8px; font-size: 11px; line-height: 1.5; color: @rpt-text3;
        margin-bottom: 14px; padding: 8px 12px; background: rgba(0,0,0,0.02); border-radius: 6px; border: none;
        .anticon { color: var(--primary-color, #1890ff); margin-top: 1px; }
      }

      .indicators-pro-wrap {
        margin-top: 18px; padding-top: 14px; border-top: 1px solid @rpt-border;
        .indicators-pro-title { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: @rpt-text2; margin-bottom: 10px; .anticon { color: var(--primary-color, #1890ff); } }
        ::v-deep .indicators-pro-desc {
          .ant-descriptions-item-label { font-size: 11px; color: @rpt-text3; font-weight: 600; font-family: @rpt-sans; }
          .ant-descriptions-item-content { font-size: 11px; font-family: @rpt-mono; }
          .bullish { color: @rpt-green; font-weight: 700; }
          .bearish { color: @rpt-red; font-weight: 700; }
        }
      }

      .indicators-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px;

        .indicator-item {
          background: rgba(0,0,0,0.02); border-radius: 8px; padding: 12px 10px; text-align: center; border: none;
          transition: background 0.15s;
          &:hover { background: rgba(0,0,0,0.04); }
          .indicator-name { font-size: 10px; color: @rpt-text3; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; font-family: @rpt-sans; }
          .indicator-value {
            font-size: 15px; font-weight: 700; color: @rpt-text; font-family: @rpt-mono;
            &.bullish, &.oversold { color: @rpt-green; }
            &.bearish, &.overbought { color: @rpt-red; }
            &.high-volatility { color: @rpt-red; }
            &.low-volatility { color: @rpt-green; }
          }
          .indicator-signal { font-size: 10px; color: @rpt-text3; margin-top: 3px; font-family: @rpt-sans; }
        }
      }
    }

    // ─ Feedback (bottom, rounded) ─
    .feedback-section {
      background: @rpt-surface; border-radius: 0 0 16px 16px; padding: 18px 24px; text-align: center;
      border: none; box-shadow: none;
      .feedback-question { font-size: 13px; color: @rpt-text3; margin-bottom: 10px; }
      .feedback-buttons { display: flex; justify-content: center; gap: 12px; margin-bottom: 12px; .ant-btn { min-width: 90px; border-radius: 8px; } }
      .analysis-meta { font-size: 11px; color: #bbb; display: flex; justify-content: center; gap: 14px; }
    }
  }

  @media (max-width: 992px) {
    .price-info-row:not(.hold-mode), .scores-row { grid-template-columns: repeat(2, 1fr); }
    .analysis-details { grid-template-columns: 1fr; .detail-section.reasons { border-right: none; border-bottom: 1px solid @rpt-border; } }
  }
  @media (max-width: 576px) {
    padding: 8px 6px;
    .price-info-row:not(.hold-mode), .scores-row { grid-template-columns: 1fr; }
    .decision-card { padding: 20px 16px;
      .decision-main { flex-direction: column; gap: 14px; text-align: center; .decision-badge { flex-direction: column; .decision-text { font-size: 26px; } } }
    }
  }
}

.crypto-factor-summary {
  margin-bottom: 16px;
  padding: 14px 16px;
  border: 1px solid @rpt-border;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.06), rgba(82, 196, 26, 0.04));

  &__text {
    margin-top: 8px;
    color: @rpt-text2;
    line-height: 1.7;
  }
}

.crypto-factor-score {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: @rpt-text;

  &.bullish { color: @rpt-green; }
  &.bearish { color: @rpt-red; }
  &.neutral { color: @rpt-amber; }

  &__num {
    font-family: @rpt-mono;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.05);
  }
}

.crypto-factor-signals {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.crypto-factor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.crypto-factor-item {
  border: 1px solid @rpt-border;
  border-radius: 12px;
  padding: 14px;
  background: @rpt-surface;

  &__label {
    font-size: 12px;
    color: @rpt-text3;
    margin-bottom: 8px;
  }

  &__value {
    font-family: @rpt-mono;
    font-size: 16px;
    font-weight: 700;
    color: @rpt-text;

    &.bullish { color: @rpt-green; }
    &.bearish { color: @rpt-red; }
  }

  &__hint {
    margin-top: 6px;
    font-size: 12px;
    color: @rpt-text3;
    line-height: 1.5;
  }
}

// ━━━━━━ Dark Theme ━━━━━━
@dk-bg: #111113;
@dk-surface: #19191b;
@dk-surface2: #222224;
@dk-border: rgba(255,255,255,0.06);
@dk-text: #e8e8ec;
@dk-text2: #a0a0a8;
@dk-text3: #666;

.fast-analysis-report.theme-dark {
  background: @dk-bg;

  &::-webkit-scrollbar-thumb { background: #333; }

  .performance-strip {
    background: @dk-surface;
    .perf-item {
      &:not(:last-child)::after { background: @dk-border; }
      .perf-value { color: #f0f0f2; &.positive { color: #34d399; } &.negative { color: #f87171; } }
      .perf-label { color: @dk-text3; }
    }
  }

  .report-section { background: @dk-surface; }
  .report-section-header {
    &:hover { background: rgba(255,255,255,0.03); }
    .rsh-title { color: @dk-text; .anticon { color: var(--primary-color, #1890ff); } }
  }
  .section-clickable:hover { background: rgba(255,255,255,0.03); }
  .section-toggle-arrow { color: @dk-text3; }

  .loading-container .loading-content-pro {
    .loading-title { color: @dk-text; }
    .loading-icon-pro { color: var(--primary-color, #1890ff); }
    .progress-wrapper .progress-text { color: var(--primary-color, #1890ff); }
    .current-step { background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, transparent); color: var(--primary-color, #1890ff); }
    .steps-list .step-item {
      background: @dk-surface2; color: @dk-text3;
      &.active { background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, transparent); color: var(--primary-color, #1890ff); .step-dot { background: var(--primary-color, #1890ff); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color, #1890ff) 15%, transparent); } }
      &.done { color: #34d399; .step-dot { background: #34d399; } }
    }
    .loading-footer .elapsed-time { color: @dk-text3; }
  }

  .empty-content { .empty-icon { color: #444; } .empty-title { color: @dk-text; } .empty-hint { color: @dk-text3; } }

  .result-container {
    .decision-card {
      background: @dk-surface;
      &.decision-buy  {
        background: linear-gradient(135deg, rgba(16,185,129,0.06) 0%, @dk-surface 100%);
        .decision-badge .anticon { color: #34d399; }
        .decision-text { color: #34d399; }
      }
      &.decision-sell {
        background: linear-gradient(135deg, rgba(239,68,68,0.06) 0%, @dk-surface 100%);
        .decision-badge .anticon { color: #f87171; }
        .decision-text { color: #f87171; }
      }
      &.decision-hold {
        background: linear-gradient(135deg, rgba(245,158,11,0.06) 0%, @dk-surface 100%);
        .decision-badge .anticon { color: #fbbf24; }
        .decision-text { color: #fbbf24; }
      }
      .decision-text { color: @dk-text; }
      .confidence-label { color: @dk-text2; }
      .decision-summary { color: @dk-text2; border-top-color: @dk-border; }
      ::v-deep .ant-progress-text { color: @dk-text !important; }
      .confidence-value { color: @dk-text !important; }
      .consensus-strip {
        background: color-mix(in srgb, var(--primary-color, #1890ff) 5%, transparent); color: @dk-text2;
        .consensus-strip-title { color: var(--primary-color, #1890ff); }
        .cm-item em { color: @dk-text3; }
      }
    }

    .price-info-row {
      background: @dk-surface;
      .price-card {
        &:not(:last-child)::after { background: @dk-border; }
        .price-label { color: @dk-text2; }
        .price-value { color: #f0f0f2; &.positive { color: #34d399; } &.negative { color: #f87171; } }
        .price-hint { color: #555; }
        .price-change { &.positive { color: #34d399; } &.negative { color: #f87171; } }
        &.current .price-label { color: #60a5fa; }
        &.entry .price-label { color: var(--primary-color, #1890ff); }
        &.stop .price-label { color: #f87171; }
        &.target .price-label { color: #34d399; }
      }
    }

    .trend-outlook-card {
      background: @dk-surface;
      .trend-outlook-header { color: @dk-text; .anticon { color: var(--primary-color, #1890ff); } }
      .trend-outlook-summary { background: @dk-surface2; color: @dk-text2; }
      .trend-outlook-item { background: @dk-surface2; .to-label, .to-meta { color: @dk-text3; } .to-trend { &.trend-bull { color: #34d399; } &.trend-bear { color: #f87171; } &.trend-neutral { color: #fbbf24; } } }
    }

    .scores-row {
      background: @dk-surface;
      .score-item {
        &:not(:last-child)::after { background: @dk-border; }
        .score-header { color: @dk-text2; .anticon { color: var(--primary-color, #1890ff); } }
        .score-value { color: #f0f0f2; }
        &.overall { background: color-mix(in srgb, var(--primary-color, #1890ff) 4%, transparent); }
      }
    }

    .detailed-analysis {
      background: @dk-surface;
      .analysis-card {
        border-bottom-color: @dk-border;
        .analysis-card-header { color: @dk-text; }
        .analysis-card-content { color: @dk-text2; }
      }
    }

    .analysis-details {
      background: @dk-surface;
      .detail-section {
        &.reasons { border-right-color: @dk-border; }
        .section-title { color: @dk-text; }
        .detail-list li { color: @dk-text2; border-bottom-color: @dk-border; }
      }
    }

    .indicators-section {
      background: @dk-surface;
      .section-title { color: @dk-text; .anticon { color: var(--primary-color, #1890ff); } }
      .indicators-methodology { background: @dk-surface2; color: @dk-text3; .anticon { color: var(--primary-color, #1890ff); } }
      .indicators-grid .indicator-item {
        background: @dk-surface2;
        &:hover { background: rgba(255,255,255,0.05); }
        .indicator-name { color: @dk-text2; }
        .indicator-value { color: #f0f0f2; &.bullish, &.oversold { color: #34d399; } &.bearish, &.overbought { color: #f87171; } &.high-volatility { color: #f87171; } &.low-volatility { color: #34d399; } }
        .indicator-signal { color: @dk-text3; }
      }
      .indicators-pro-wrap {
        border-top-color: @dk-border;
        .indicators-pro-title { color: @dk-text; .anticon { color: var(--primary-color, #1890ff); } }
        ::v-deep .indicators-pro-desc {
          .ant-descriptions-view { border-color: @dk-border; }
          .ant-descriptions-row { border-color: @dk-border; }
          th.ant-descriptions-item-label { background: @dk-surface2; border-color: @dk-border; color: @dk-text3; }
          td.ant-descriptions-item-content { background: @dk-surface; border-color: @dk-border; color: @dk-text2; }
          .ant-descriptions-item-label { background: @dk-surface2; border-color: @dk-border; color: @dk-text3; }
          .ant-descriptions-item-content { background: @dk-surface; border-color: @dk-border; color: @dk-text2; }
          .ant-descriptions-item-content > span { color: @dk-text2; }
          .bullish { color: #34d399 !important; }
          .bearish { color: #f87171 !important; }
        }
      }
    }

    .feedback-section {
      background: @dk-surface;
      .feedback-question { color: @dk-text3; }
      .analysis-meta { color: #555; }
      .ant-btn { background: @dk-surface2; border-color: @dk-border; color: @dk-text2; &:hover { border-color: color-mix(in srgb, var(--primary-color, #1890ff) 30%, transparent); color: var(--primary-color, #1890ff); } }
    }
  }

  @media (max-width: 992px) {
    .result-container .analysis-details .detail-section.reasons { border-right-color: transparent; border-bottom-color: @dk-border; }
  }
}
</style>
