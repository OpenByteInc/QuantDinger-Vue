<template>
  <div class="bot-detail" :class="{ 'theme-dark': isDark }" v-if="bot">
    <a-card :bordered="false" class="detail-header-card">
      <div class="detail-header">
        <div class="header-left">
          <div class="type-icon" :style="{ background: botGradient }">
            <a-icon :type="botIcon" />
          </div>
          <div class="header-info">
            <h3>{{ bot.strategy_name }}</h3>
            <div class="header-tags">
              <a-tag :color="bot.status === 'running' ? 'green' : bot.status === 'error' ? 'red' : 'default'">
                {{ statusText }}
              </a-tag>
              <a-tag v-if="bot.bot_type" color="purple">{{ botTypeName }}</a-tag>
              <a-tag v-if="bot.trading_config && bot.trading_config.symbol" color="blue">
                {{ bot.trading_config.symbol }}
              </a-tag>
              <a-tag v-if="bot.exchange_config && bot.exchange_config.exchange_id">
                {{ exchangeName }}
              </a-tag>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <a-button
            v-if="bot.status !== 'running'"
            type="primary"
            :loading="actionLoading"
            @click="$emit('start', bot)"
          >
            <a-icon type="play-circle" /> {{ $t('trading-bot.action.start') }}
          </a-button>
          <a-button
            v-else
            type="danger"
            :loading="actionLoading"
            @click="$emit('stop', bot)"
          >
            <a-icon type="pause-circle" /> {{ $t('trading-bot.action.stop') }}
          </a-button>
          <a-button
            @click="$emit('edit', bot)"
            :disabled="bot.status === 'running'"
          >
            <a-icon type="edit" /> {{ $t('trading-bot.action.edit') }}
          </a-button>
          <!--
            "Clone as code" escape hatch. The button is hidden unless the bot
            already has a Python `strategy_code` saved (it always should, but
            we guard against legacy rows). The actual cloning is owned by the
            parent (trading-bot/index.vue) so we just emit and let it decide
            how to confirm + call the API + handle the success toast.
          -->
          <a-tooltip
            v-if="bot && bot.strategy_code"
            :title="$t('trading-bot.cloneAsScript.tooltip')"
          >
            <a-button
              icon="code-sandbox"
              @click="$emit('clone-as-script', bot)"
            >
              {{ $t('trading-bot.action.cloneAsScript') }}
            </a-button>
          </a-tooltip>
          <a-button @click="$emit('publish', bot)">
            <a-icon type="shop" />
            {{ $t('trading-bot.action.publishToMarket') }}
          </a-button>
          <a-button
            type="danger"
            ghost
            @click="$emit('delete', bot)"
            :disabled="bot.status === 'running'"
          >
            <a-icon type="delete" />
          </a-button>
          <a-button @click="$emit('close')">
            <a-icon type="close" />
          </a-button>
        </div>
      </div>
    </a-card>

    <a-card
      v-if="isGridLikeBot"
      :bordered="false"
      class="hedge-summary-card"
      style="margin-top: 12px;"
    >
      <div class="hedge-summary">
        <div class="hedge-summary__header">
          <div class="hedge-summary__title">
            <span class="hedge-summary__icon">
              <a-icon type="dashboard" />
            </span>
            <div class="hedge-summary__title-text">
              <span class="hedge-summary__name">{{ $t('trading-bot.detail.hedgeSummary') }}</span>
              <a-tooltip :title="$t('trading-bot.detail.hedgeSummaryHint')">
                <a-icon type="question-circle" class="hedge-summary__tip" />
              </a-tooltip>
            </div>
          </div>
          <a-button
            size="small"
            class="hedge-summary__refresh"
            @click="refreshHedgeSummary"
            :loading="hedgeLoading"
          >
            <a-icon type="reload" />
          </a-button>
        </div>

        <div class="hedge-summary__grid">
          <div class="hedge-stat hedge-stat--long">
            <div class="hedge-stat__head">
              <span class="hedge-stat__badge hedge-stat__badge--long">
                <a-icon type="arrow-up" />
              </span>
              <span class="hedge-stat__label">{{ $t('trading-bot.detail.longLeg') }}</span>
            </div>
            <div
              class="hedge-stat__value"
              :class="{ 'hedge-stat__value--empty': !legHasSize(longLeg) }"
            >
              {{ formatLegSizeDisplay(longLeg) }}
            </div>
            <div v-if="legHasSize(longLeg)" class="hedge-stat__meta">
              <span class="hedge-stat__meta-item">
                {{ $t('trading-assistant.table.entryPrice') }}
                <strong>{{ formatPrice(longLeg.entry_price) }}</strong>
              </span>
              <span class="hedge-stat__pnl" :class="legPnlClass(longLeg)">
                {{ formatPnl(legPnl(longLeg)) }}
              </span>
            </div>
            <div v-else class="hedge-stat__meta hedge-stat__meta--muted">
              {{ $t('trading-bot.detail.noLegPosition') }}
            </div>
          </div>

          <div class="hedge-stat hedge-stat--short">
            <div class="hedge-stat__head">
              <span class="hedge-stat__badge hedge-stat__badge--short">
                <a-icon type="arrow-down" />
              </span>
              <span class="hedge-stat__label">{{ $t('trading-bot.detail.shortLeg') }}</span>
            </div>
            <div
              class="hedge-stat__value"
              :class="{ 'hedge-stat__value--empty': !legHasSize(shortLeg) }"
            >
              {{ formatLegSizeDisplay(shortLeg) }}
            </div>
            <div v-if="legHasSize(shortLeg)" class="hedge-stat__meta">
              <span class="hedge-stat__meta-item">
                {{ $t('trading-assistant.table.entryPrice') }}
                <strong>{{ formatPrice(shortLeg.entry_price) }}</strong>
              </span>
              <span class="hedge-stat__pnl" :class="legPnlClass(shortLeg)">
                {{ formatPnl(legPnl(shortLeg)) }}
              </span>
            </div>
            <div v-else class="hedge-stat__meta hedge-stat__meta--muted">
              {{ $t('trading-bot.detail.noLegPosition') }}
            </div>
          </div>

          <div class="hedge-stat hedge-stat--profit">
            <div class="hedge-stat__head">
              <span class="hedge-stat__badge hedge-stat__badge--profit">
                <a-icon type="fund" />
              </span>
              <span class="hedge-stat__label">{{ $t('trading-bot.detail.totalGridProfit') }}</span>
            </div>
            <div class="hedge-stat__value">
              <span :class="totalGridProfit > 0 ? 'profit' : totalGridProfit < 0 ? 'loss' : 'neutral'">
                {{ formatPnl(totalGridProfit) }}
              </span>
            </div>
            <div class="hedge-stat__tags">
              <span class="hedge-stat__tag">
                {{ $t('trading-bot.detail.matchedPairs') }} {{ matchedPairCount }}
              </span>
              <span class="hedge-stat__tag">
                {{ $t('trading-bot.detail.tickInterval') }} {{ tickIntervalDisplay }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </a-card>

    <a-card :bordered="false" class="detail-tabs-card" style="margin-top: 12px;">
      <a-tabs v-model="activeTab" :animated="false">
        <a-tab-pane key="params" :tab="$t('trading-bot.tab.params')">
          <div v-if="activeTab === 'params'" class="params-panel">
            <div class="params-section">
              <div class="params-section__title">
                <a-icon type="setting" />
                <span>{{ $t('trading-bot.detail.basicConfig') }}</span>
              </div>
              <div class="params-grid">
                <div class="param-item">
                  <span class="param-label">{{ $t('trading-bot.wizard.symbol') }}</span>
                  <span class="param-value">{{ tc.symbol || '-' }}</span>
                </div>
                <div class="param-item">
                  <span class="param-label">{{ $t('trading-bot.wizard.marketType') }}</span>
                  <span class="param-value">
                    <a-tag :color="tc.market_type === 'swap' ? 'orange' : 'cyan'" size="small">
                      {{ tc.market_type === 'swap' ? $t('trading-bot.wizard.futures') : $t('trading-bot.wizard.spot') }}
                    </a-tag>
                  </span>
                </div>
                <div class="param-item" v-if="needsTimeframe">
                  <span class="param-label">{{ $t('trading-bot.wizard.timeframe') }}</span>
                  <span class="param-value">{{ tc.timeframe || '-' }}</span>
                </div>
                <div class="param-item" v-if="tc.market_type === 'swap'">
                  <span class="param-label">{{ $t('trading-bot.wizard.leverage') }}</span>
                  <span class="param-value highlight">{{ tc.leverage || 1 }}x</span>
                </div>
                <div class="param-item">
                  <span class="param-label">{{ capitalLabel }}</span>
                  <span class="param-value highlight">{{ formatNum(tc.initial_capital) }} USDT</span>
                </div>
                <div class="param-item" v-if="tc.order_mode">
                  <span class="param-label">{{ $t('trading-bot.grid.orderType') }}</span>
                  <span class="param-value">
                    <a-tag :color="tc.order_mode === 'maker' ? 'green' : 'blue'" size="small">
                      {{ tc.order_mode === 'maker' ? $t('trading-bot.grid.limitOrder') : $t('trading-bot.grid.marketOrder') }}
                    </a-tag>
                  </span>
                </div>
              </div>
            </div>

            <div class="params-section" v-if="displayStrategyItems.length">
              <div class="params-section__title">
                <a-icon type="sliders" />
                <span>{{ $t('trading-bot.wizard.strategyParams') }}</span>
              </div>
              <div class="params-grid">
                <div class="param-item" v-for="item in displayStrategyItems" :key="item.key">
                  <span class="param-label">{{ item.label }}</span>
                  <span class="param-value" :class="{ highlight: isNumeric(item.value) }">{{ item.value }}</span>
                </div>
              </div>
            </div>

            <div class="params-section" v-if="displayRiskItems.length">
              <div class="params-section__title">
                <a-icon type="safety-certificate" />
                <span>{{ $t('trading-bot.wizard.riskParams') }}</span>
              </div>
              <div class="params-grid">
                <div class="param-item" v-for="item in displayRiskItems" :key="item.key">
                  <span class="param-label">{{ item.label }}</span>
                  <span class="param-value highlight" :class="riskValueClass(item.key)">{{ item.value }}</span>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane
          v-if="isGridBot"
          key="restingOrders"
          :tab="$t('trading-bot.tab.gridRestingOrders')"
        >
          <div v-if="activeTab === 'restingOrders'" class="resting-orders-panel">
            <div class="resting-orders-toolbar">
              <div class="resting-orders-summary">
                <span class="resting-summary-chip resting-summary-chip--long">
                  <a-icon type="arrow-up" />
                  {{ $t('trading-bot.detail.gridLong') }}
                  <strong>{{ restingLongOrders.length }}</strong>
                </span>
                <span class="resting-summary-chip resting-summary-chip--short">
                  <a-icon type="arrow-down" />
                  {{ $t('trading-bot.detail.gridShort') }}
                  <strong>{{ restingShortOrders.length }}</strong>
                </span>
                <span v-if="bot.status !== 'running'" class="resting-orders-hint">
                  {{ $t('trading-bot.detail.restingOrdersStopped') }}
                </span>
              </div>
              <a-button size="small" class="resting-orders-refresh" @click="refreshRestingOrders" :loading="restingLoading">
                <a-icon type="reload" />
              </a-button>
            </div>

            <a-spin :spinning="restingLoading && !restingOrderRows.length">
              <div v-if="restingOrderRows.length" class="resting-orders-book">
                <div class="resting-book-col resting-book-col--long">
                  <div class="resting-book-col__head">
                    <span class="resting-book-col__title">
                      <a-icon type="arrow-up" />
                      {{ $t('trading-bot.detail.gridLong') }}
                    </span>
                    <span class="resting-book-col__hint">{{ $t('trading-bot.detail.restingLongSortHint') }}</span>
                  </div>
                  <div class="resting-book-col__labels">
                    <span>{{ $t('trading-bot.detail.restingOrderCell') }}</span>
                    <span>{{ $t('trading-bot.detail.restingOrderPrice') }}</span>
                    <span>{{ $t('trading-bot.detail.restingOrderQty') }}</span>
                    <span>{{ $t('trading-bot.detail.restingOrderPurpose') }}</span>
                  </div>
                  <div class="resting-book-col__body">
                    <div
                      v-for="o in restingLongOrders"
                      :key="'rest-long-' + o.id"
                      class="resting-book-row resting-book-row--long"
                      :title="o.exchange_order_id"
                    >
                      <span class="resting-book-row__cell">#{{ o.cell_index }}</span>
                      <span class="resting-book-row__price">{{ formatPrice(o.price) }}</span>
                      <span class="resting-book-row__qty">{{ formatLegSize({ size: o.quantity }) }}</span>
                      <span class="resting-book-row__purpose">{{ o.purposeLabel }}</span>
                    </div>
                    <div v-if="!restingLongOrders.length" class="resting-book-col__empty">—</div>
                  </div>
                </div>

                <div class="resting-book-mid">
                  <div class="resting-book-mid__badge">
                    <a-icon type="aim" />
                  </div>
                  <div class="resting-book-mid__price">{{ formatPrice(restingRefPrice) }}</div>
                  <div class="resting-book-mid__label">{{ $t('trading-bot.detail.gridRefPrice') }}</div>
                  <div v-if="restingGridLower && restingGridUpper" class="resting-book-mid__range">
                    {{ formatPrice(restingGridLower) }}
                    <span class="resting-book-mid__range-sep">~</span>
                    {{ formatPrice(restingGridUpper) }}
                  </div>
                </div>

                <div class="resting-book-col resting-book-col--short">
                  <div class="resting-book-col__head">
                    <span class="resting-book-col__title">
                      <a-icon type="arrow-down" />
                      {{ $t('trading-bot.detail.gridShort') }}
                    </span>
                    <span class="resting-book-col__hint">{{ $t('trading-bot.detail.restingShortSortHint') }}</span>
                  </div>
                  <div class="resting-book-col__labels">
                    <span>{{ $t('trading-bot.detail.restingOrderCell') }}</span>
                    <span>{{ $t('trading-bot.detail.restingOrderPrice') }}</span>
                    <span>{{ $t('trading-bot.detail.restingOrderQty') }}</span>
                    <span>{{ $t('trading-bot.detail.restingOrderPurpose') }}</span>
                  </div>
                  <div class="resting-book-col__body">
                    <div
                      v-for="o in restingShortOrders"
                      :key="'rest-short-' + o.id"
                      class="resting-book-row resting-book-row--short"
                      :title="o.exchange_order_id"
                    >
                      <span class="resting-book-row__cell">#{{ o.cell_index }}</span>
                      <span class="resting-book-row__price">{{ formatPrice(o.price) }}</span>
                      <span class="resting-book-row__qty">{{ formatLegSize({ size: o.quantity }) }}</span>
                      <span class="resting-book-row__purpose">{{ o.purposeLabel }}</span>
                    </div>
                    <div v-if="!restingShortOrders.length" class="resting-book-col__empty">—</div>
                  </div>
                </div>
              </div>
              <a-empty v-else :description="$t('trading-bot.detail.restingOrdersEmpty')" />
            </a-spin>
          </div>
        </a-tab-pane>

        <a-tab-pane key="positions" :tab="$t('trading-bot.tab.positions')">
          <position-records
            v-if="activeTab === 'positions'"
            :strategy-id="bot.id"
            :execution-mode="(bot && bot.execution_mode) || 'live'"
            :market-type="tc.market_type || 'swap'"
            :leverage="tc.leverage || 1"
            :is-dark="isDark"
          />
        </a-tab-pane>
        <a-tab-pane key="trades" :tab="$t('trading-bot.tab.trades')">
          <trading-records
            v-if="activeTab === 'trades'"
            :strategyId="bot.id"
            :isDark="isDark"
            :botType="bot && bot.bot_type"
          />
        </a-tab-pane>
        <a-tab-pane key="performance" :tab="$t('trading-bot.tab.performance')">
          <performance-analysis
            v-if="activeTab === 'performance'"
            :strategyId="bot.id"
            :isDark="isDark"
            :botType="bot && bot.bot_type"
          />
        </a-tab-pane>
        <a-tab-pane key="review" :tab="$t('trading-bot.tab.aiReview')">
          <strategy-review-report
            v-if="activeTab === 'review'"
            :strategyId="bot.id"
            :isDark="isDark"
            :botType="bot && bot.bot_type"
          />
        </a-tab-pane>
        <a-tab-pane key="logs" :tab="$t('trading-bot.tab.logs')">
          <strategy-logs
            v-if="activeTab === 'logs'"
            :strategyId="bot.id"
            :isDark="isDark"
          />
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script>
import TradingRecords from '@/views/trading-assistant/components/TradingRecords.vue'
import PositionRecords from '@/views/trading-assistant/components/PositionRecords.vue'
import PerformanceAnalysis from '@/views/trading-assistant/components/PerformanceAnalysis.vue'
import StrategyReviewReport from '@/views/trading-assistant/components/StrategyReviewReport.vue'
import StrategyLogs from '@/views/trading-assistant/components/StrategyLogs.vue'
import { getStrategyPositions, getStrategyTrades, getGridRestingOrders } from '@/api/strategy'

const TYPE_META = {
  grid: { icon: 'bar-chart', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  martingale: { icon: 'fall', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  trend: { icon: 'stock', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  dca: { icon: 'fund', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  arbitrage: { icon: 'swap', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  custom: { icon: 'code', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' }
}

const PARAM_LABEL_MAP = {
  upperPrice: 'trading-bot.grid.upperPrice',
  lowerPrice: 'trading-bot.grid.lowerPrice',
  gridCount: 'trading-bot.grid.gridCount',
  amountPerGrid: 'trading-bot.grid.amountPerGrid',
  gridMode: 'trading-bot.grid.mode',
  gridDirection: 'trading-bot.grid.direction',
  initialPositionPct: 'trading-bot.grid.initialPositionPct',
  boundaryAction: 'trading-bot.grid.boundaryAction',
  adaptiveBounds: 'trading-bot.grid.adaptiveBounds',
  adaptiveAtrMult: 'trading-bot.grid.adaptiveAtrMult',
  waterfallProtection: 'trading-bot.grid.waterfallProtection',
  waterfallDropPct: 'trading-bot.grid.waterfallDropPct',
  referencePrice: 'trading-bot.detail.gridRefPrice',
  orderMode: 'trading-bot.grid.orderType',
  initialAmount: 'trading-bot.martingale.initialAmount',
  multiplier: 'trading-bot.martingale.multiplier',
  maxLayers: 'trading-bot.martingale.maxLayers',
  priceDropPct: 'trading-bot.martingale.priceDropPct',
  takeProfitPct: 'trading-bot.martingale.takeProfitPct',
  stopLossPct: 'trading-bot.risk.stopLossPct',
  direction: 'trading-bot.martingale.direction',
  maPeriod: 'trading-bot.trend.maPeriod',
  maType: 'trading-bot.trend.maType',
  confirmBars: 'trading-bot.trend.confirmBars',
  positionPct: 'trading-bot.trend.positionPct',
  amountEach: 'trading-bot.dca.amountEach',
  frequency: 'trading-bot.dca.frequency',
  totalBudget: 'trading-bot.dca.totalBudget',
  dipBuyEnabled: 'trading-bot.dca.dipBuy',
  dipThreshold: 'trading-bot.dca.dipThreshold'
}

const VALUE_DISPLAY_MAP = {
  gridMode: { arithmetic: 'trading-bot.grid.arithmetic', geometric: 'trading-bot.grid.geometric' },
  gridDirection: { neutral: 'trading-bot.grid.neutral', long: 'trading-bot.grid.long', short: 'trading-bot.grid.short' },
  orderMode: { maker: 'trading-bot.grid.limitOrder', market: 'trading-bot.grid.marketOrder' },
  boundaryAction: {
    pause: 'trading-bot.grid.boundaryPause',
    stop_loss: 'trading-bot.grid.boundaryStopLoss',
    hold: 'trading-bot.grid.boundaryHold'
  }
}

export default {
  name: 'BotDetail',
  components: { TradingRecords, PositionRecords, PerformanceAnalysis, StrategyReviewReport, StrategyLogs },
  props: {
    bot: { type: Object, default: null },
    isDark: { type: Boolean, default: false },
    actionLoading: { type: Boolean, default: false }
  },
  data () {
    return {
      activeTab: 'params',
      // Hedge summary for grid/DCA bots (P0-1 / P1-1 surfacing).
      hedgePositions: [],
      hedgeTrades: [],
      hedgeLoading: false,
      hedgeTimer: null,
      restingOrders: [],
      restingLoading: false,
      restingTimer: null
    }
  },
  computed: {
    restingOrderRows () {
      return (this.restingOrders || []).map(o => ({
        ...o,
        purposeLabel: this.formatRestingPurpose(o.purpose, o),
        priceLabel: this.formatPrice(o.price),
        qtyLabel: this.formatLegSize({ size: o.quantity }),
        filledLabel: this.formatLegSize({ size: o.filled_quantity }),
        statusLabel: this.formatRestingStatus(o.status)
      }))
    },
    restingLongOrders () {
      return this.restingOrderRows
        .filter(o => this.restingLegSide(o) === 'long')
        .sort((a, b) => parseFloat(b.price || 0) - parseFloat(a.price || 0))
    },
    restingShortOrders () {
      return this.restingOrderRows
        .filter(o => this.restingLegSide(o) === 'short')
        .sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0))
    },
    restingGridLower () {
      return parseFloat(this.botParams.lowerPrice) || 0
    },
    restingGridUpper () {
      return parseFloat(this.botParams.upperPrice) || 0
    },
    restingRefPrice () {
      const fixed = parseFloat(this.botParams.referencePrice)
      if (fixed > 0) return fixed
      const { restingGridLower: lower, restingGridUpper: upper } = this
      if (upper > lower) return (upper + lower) / 2
      const rows = this.restingOrderRows
      if (!rows.length) return 0
      const prices = rows.map(o => parseFloat(o.price)).filter(p => p > 0)
      if (!prices.length) return 0
      return (Math.max(...prices) + Math.min(...prices)) / 2
    },
    tc () { return this.bot?.trading_config || {} },
    botParams () { return this.tc.bot_params || {} },
    botDisplay () { return this.bot?.bot_display || {} },
    isMartingaleBot () { return (this.bot?.bot_type || this.tc.bot_type) === 'martingale' },
    needsTimeframe () { return (this.bot?.bot_type || this.tc.bot_type) === 'trend' },
    displayStrategyItems () {
      const items = Array.isArray(this.botDisplay?.strategy_params) ? this.botDisplay.strategy_params : null
      if (items && items.length) {
        return items.map(item => ({
          key: item.key,
          label: item.label_key ? this.$t(item.label_key) : this.paramLabel(item.key),
          value: this.formatDisplayItem(item)
        }))
      }
      return Object.entries(this.displayBotParams).map(([key, val]) => ({
        key,
        label: this.paramLabel(key),
        value: this.formatParamValue(key, val)
      }))
    },
    displayBotParams () {
      const skip = new Set(['orderMode', 'timeframe', 'gridExecutionMode', 'grid_execution_mode'])
      const trailingOn = this.botParams && this.botParams.trailingTpEnabled === true
      const out = {}
      for (const [k, v] of Object.entries(this.botParams)) {
        if (skip.has(k)) continue
        if (v === null || v === undefined || v === '') continue
        // Hide the activation / callback % rows when trailing TP is OFF —
        // they're noise for users who didn't enable the feature.
        if (!trailingOn && (k === 'trailingTpActivationPct' || k === 'trailingTpCallbackPct')) continue
        out[k] = v
      }
      return out
    },
    capitalLabel () {
      return this.botDisplay?.capital_label_key
        ? this.$t(this.botDisplay.capital_label_key)
        : this.$t('trading-bot.wizard.initialCapital')
    },
    displayRiskItems () {
      const items = Array.isArray(this.botDisplay?.risk_params) ? this.botDisplay.risk_params : null
      if (items && items.length) {
        return items.map(item => ({
          key: item.key,
          label: item.label_key ? this.$t(item.label_key) : this.paramLabel(item.key),
          value: this.formatDisplayItem(item)
        }))
      }
      const fallback = []
      if (!this.isMartingaleBot && this.tc.stop_loss_pct) fallback.push({ key: 'stopLossPct', label: this.$t('trading-bot.risk.stopLossPct'), value: `${this.tc.stop_loss_pct}%` })
      if (!this.isMartingaleBot && this.tc.take_profit_pct) fallback.push({ key: 'takeProfitPct', label: this.$t('trading-bot.risk.takeProfitPct'), value: `${this.tc.take_profit_pct}%` })
      if (!this.isMartingaleBot && this.tc.max_position) fallback.push({ key: 'maxPosition', label: this.$t('trading-bot.risk.maxPosition'), value: `${this.formatNum(this.tc.max_position)} USDT` })
      if (this.tc.max_daily_loss) fallback.push({ key: 'maxDailyLoss', label: this.isMartingaleBot ? this.$t('trading-bot.martingale.maxDailyLossAdvanced') : this.$t('trading-bot.risk.maxDailyLoss'), value: `${this.formatNum(this.tc.max_daily_loss)} USDT` })
      return fallback
    },
    isGridBot () { return (this.bot?.bot_type || this.tc.bot_type) === 'grid' },
    isGridLikeBot () {
      const bt = this.bot?.bot_type || this.tc.bot_type
      return bt === 'grid' || bt === 'dca'
    },
    longLeg () {
      const sym = String((this.tc.symbol || '').split(':')[0] || '').toUpperCase()
      return this.hedgePositions.find(p => {
        const s = String(p.side || '').toLowerCase()
        const ok = String((p.symbol || '').split(':')[0] || '').toUpperCase() === sym
        return s === 'long' && ok
      }) || { side: 'long', size: 0, entry_price: 0, current_price: 0 }
    },
    shortLeg () {
      const sym = String((this.tc.symbol || '').split(':')[0] || '').toUpperCase()
      return this.hedgePositions.find(p => {
        const s = String(p.side || '').toLowerCase()
        const ok = String((p.symbol || '').split(':')[0] || '').toUpperCase() === sym
        return s === 'short' && ok
      }) || { side: 'short', size: 0, entry_price: 0, current_price: 0 }
    },
    // FIFO matched-grid profit comes pre-computed from the backend
    // (P1-1 — grid_matched_profit on qd_strategy_trades). We just sum the
    // realised legs and count rows that have a non-zero matched_entry_price.
    totalGridProfit () {
      let sum = 0
      for (const t of this.hedgeTrades) {
        const v = parseFloat(t.grid_matched_profit || 0)
        if (!isNaN(v)) sum += v
      }
      return sum
    },
    matchedPairCount () {
      let n = 0
      for (const t of this.hedgeTrades) {
        const matched = parseFloat(t.matched_entry_price || 0)
        if (matched > 0) n += 1
      }
      return n
    },
    tickIntervalDisplay () {
      const tc = this.tc || {}
      const override = tc.tick_interval_sec
      if (override != null && override !== '') return `${override}s`
      // Backend default: 1s for grid/dca, 10s otherwise (see trading_executor.py).
      return this.isGridLikeBot ? '1s' : '10s'
    },
    botIcon () { return (TYPE_META[this.bot?.bot_type] || TYPE_META.custom).icon },
    botGradient () { return (TYPE_META[this.bot?.bot_type] || TYPE_META.custom).gradient },
    botTypeName () { return this.$t(`trading-bot.type.${this.bot?.bot_type}`) || this.bot?.bot_type },
    statusText () {
      const map = { running: this.$t('trading-bot.status.running'), stopped: this.$t('trading-bot.status.stopped'), error: this.$t('trading-bot.status.error') }
      return map[this.bot?.status] || this.$t('trading-bot.status.stopped')
    },
    exchangeName () {
      const id = this.bot?.exchange_config?.exchange_id
      return { binance: 'Binance', bybit: 'Bybit', gate: 'Gate.io', okx: 'OKX', htx: 'HTX' }[id] || id
    }
  },
  watch: {
    'bot.id': {
      immediate: true,
      handler (id) {
        this.stopHedgePolling()
        this.stopRestingPolling()
        if (id && this.isGridLikeBot) {
          this.refreshHedgeSummary()
          this.startHedgePolling()
        }
        if (id && this.isGridBot) {
          this.refreshRestingOrders(true)
        }
      }
    },
    activeTab (tab) {
      if (tab === 'restingOrders' && this.isGridBot) {
        this.refreshRestingOrders()
        this.startRestingPolling()
      } else {
        this.stopRestingPolling()
      }
    },
    isGridLikeBot: {
      handler (val) {
        this.stopHedgePolling()
        if (val && this.bot?.id) {
          this.refreshHedgeSummary()
          this.startHedgePolling()
        }
      }
    },
    bot () {
      this.activeTab = 'params'
    }
  },
  beforeDestroy () {
    this.stopHedgePolling()
    this.stopRestingPolling()
  },
  methods: {
    startRestingPolling () {
      this.stopRestingPolling()
      if (!this.isGridBot) return
      this.restingTimer = setInterval(() => {
        if (this.activeTab === 'restingOrders') this.refreshRestingOrders(true)
      }, 5000)
    },
    stopRestingPolling () {
      if (this.restingTimer) {
        clearInterval(this.restingTimer)
        this.restingTimer = null
      }
    },
    async refreshRestingOrders (silent = false) {
      if (!this.bot?.id || !this.isGridBot) return
      if (!silent) this.restingLoading = true
      try {
        const res = await getGridRestingOrders(this.bot.id, { limit: 200, sync: true })
        if (res && res.code === 1) {
          this.restingOrders = (res.data && (res.data.orders || res.data.items)) || []
        }
      } finally {
        this.restingLoading = false
      }
    },
    formatRestingPurpose (purpose, order) {
      const row = order && typeof order === 'object' ? order : null
      if (row) {
        const loc = String((this.$i18n && this.$i18n.locale) || 'zh-CN').toLowerCase()
        const preferEn = loc.startsWith('en')
        const label = preferEn
          ? (row.purpose_label_en || row.purpose_label)
          : (row.purpose_label || row.purpose_label_en)
        if (label) return label
      }
      const key = `trading-bot.detail.restingPurpose.${purpose}`
      const t = this.$t(key)
      return t !== key ? t : String(purpose || '-')
    },
    formatRestingStatus (status) {
      const key = `trading-bot.detail.restingStatus.${status}`
      const t = this.$t(key)
      return t !== key ? t : String(status || '-')
    },
    restingLegSide (order) {
      const ps = String(order.pos_side || order.posSide || '').toLowerCase()
      if (ps === 'long' || ps === 'short') return ps
      const purpose = String(order.purpose || '').toLowerCase()
      if (purpose.includes('long')) return 'long'
      if (purpose.includes('short')) return 'short'
      return String(order.side || '').toLowerCase() === 'buy' ? 'long' : 'short'
    },
    startHedgePolling () {
      this.stopHedgePolling()
      // 15s cadence is plenty — the summary card is informational, not
      // execution-critical, and the row data is refreshed cheaply via
      // existing list endpoints.
      this.hedgeTimer = setInterval(() => {
        this.refreshHedgeSummary(true)
      }, 15000)
    },
    stopHedgePolling () {
      if (this.hedgeTimer) {
        clearInterval(this.hedgeTimer)
        this.hedgeTimer = null
      }
    },
    async refreshHedgeSummary (silent = false) {
      if (!this.bot?.id) return
      if (!silent) this.hedgeLoading = true
      try {
        const [posRes, trdRes] = await Promise.all([
          getStrategyPositions(this.bot.id).catch(() => null),
          getStrategyTrades(this.bot.id, this.$i18n && this.$i18n.locale).catch(() => null)
        ])
        if (posRes && posRes.code === 1) {
          this.hedgePositions = (posRes.data && (posRes.data.positions || posRes.data.items)) || []
        }
        if (trdRes && trdRes.code === 1) {
          this.hedgeTrades = (trdRes.data && (trdRes.data.trades || trdRes.data.items)) || []
        }
      } finally {
        this.hedgeLoading = false
      }
    },
    formatLegSize (leg) {
      const sz = parseFloat(leg?.size || 0)
      if (!sz || sz <= 0) return '—'
      return sz.toFixed(6)
    },
    legHasSize (leg) {
      const sz = parseFloat(leg?.size || 0)
      return sz > 0
    },
    formatLegSizeDisplay (leg) {
      if (!this.legHasSize(leg)) {
        return this.$t('trading-bot.detail.noLegPosition')
      }
      const sym = String((this.tc.symbol || '').split(':')[0] || '')
      const unit = sym.includes('/') ? sym.split('/')[0].toUpperCase() : ''
      const size = this.formatLegSize(leg)
      return unit ? `${size} ${unit}` : size
    },
    legPnl (leg) {
      const sz = parseFloat(leg?.size || 0)
      const ep = parseFloat(leg?.entry_price || 0)
      const cp = parseFloat(leg?.current_price || 0)
      if (!(sz > 0 && ep > 0 && cp > 0)) return 0
      const sign = String(leg.side).toLowerCase() === 'long' ? 1 : -1
      return sign * (cp - ep) * sz
    },
    legPnlClass (leg) {
      const v = this.legPnl(leg)
      if (v > 0) return 'profit'
      if (v < 0) return 'loss'
      return ''
    },
    formatPnl (v) {
      const n = parseFloat(v || 0)
      if (!isFinite(n) || Math.abs(n) < 1e-9) return '$0.00'
      const sign = n > 0 ? '+' : '-'
      return `${sign}$${Math.abs(n).toFixed(2)}`
    },
    formatDisplayItem (item) {
      const valueType = item?.value_type || 'text'
      const value = item?.value
      if (valueType === 'enum' && item?.value_key) return this.$t(item.value_key)
      if (valueType === 'bool') return value ? this.$t('trading-bot.common.enabled') : this.$t('trading-bot.common.disabled')
      if (valueType === 'percent') return `${this.formatNum(value)}%`
      if (valueType === 'usdt') return `${this.formatNum(value)} USDT`
      if (valueType === 'number' && typeof value === 'number') return this.formatNum(value)
      return String(value)
    },
    riskValueClass (key) {
      if (key === 'takeProfitPct') return 'success'
      if (key === 'stopLossPct' || key === 'maxDailyLoss') return 'danger'
      return ''
    },
    formatNum (v) {
      if (v === null || v === undefined) return '-'
      const n = parseFloat(v)
      if (isNaN(n)) return v
      return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatPrice (v) {
      if (v === null || v === undefined) return '-'
      const n = parseFloat(v)
      if (isNaN(n)) return v
      if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      if (n >= 1) return n.toFixed(4)
      return n.toPrecision(6)
    },
    isNumeric (v) { return typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v)) && isFinite(v)) },
    paramLabel (key) {
      if (this.isMartingaleBot) {
        const martingaleLabels = {
          initialAmount: this.$t('trading-bot.martingale.initialAmountAuto'),
          priceDropPct: this.$t('trading-bot.martingale.priceDropTrigger'),
          takeProfitPct: this.$t('trading-bot.martingale.avgEntryTakeProfit'),
          stopLossPct: this.$t('trading-bot.martingale.avgEntryStopLoss')
        }
        if (martingaleLabels[key]) return martingaleLabels[key]
      }
      // Trailing-TP fields share the same display across martingale & trend
      // bots; we don't have dedicated i18n keys for them yet so fall back
      // to inline zh/en labels (consistent with BotCreateWizard).
      const isZh = String(this.$i18n?.locale || '').toLowerCase().startsWith('zh')
      const trailingLabels = {
        trailingTpEnabled: isZh ? '启用追踪止盈' : 'Trailing TP',
        trailingTpActivationPct: isZh ? '追踪止盈激活涨幅' : 'Trailing TP Activation %',
        trailingTpCallbackPct: isZh ? '追踪止盈回撤幅度' : 'Trailing TP Callback %'
      }
      if (trailingLabels[key]) return trailingLabels[key]
      const i18nKey = PARAM_LABEL_MAP[key]
      if (i18nKey) return this.$t(i18nKey)
      return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
    },
    formatParamValue (key, val) {
      const displayMap = VALUE_DISPLAY_MAP[key]
      if (displayMap && displayMap[val]) return this.$t(displayMap[val])
      if (key === 'direction') {
        if (this.bot?.bot_type === 'trend') {
          return { long: this.$t('trading-bot.trend.longOnly'), short: this.$t('trading-bot.trend.shortOnly'), both: this.$t('trading-bot.trend.bothSides') }[val] || String(val)
        }
        return { long: this.$t('trading-bot.martingale.long'), short: this.$t('trading-bot.martingale.short') }[val] || String(val)
      }
      if (key === 'frequency') {
        return {
          every_bar: this.$t('trading-bot.dca.everyBar'),
          hourly: this.$t('trading-bot.dca.hourly'),
          '4h': '4H',
          daily: this.$t('trading-bot.dca.daily'),
          weekly: this.$t('trading-bot.dca.weekly'),
          biweekly: this.$t('trading-bot.dca.biweekly'),
          monthly: this.$t('trading-bot.dca.monthly')
        }[val] || String(val)
      }
      if (val === 'true' || val === 'false') return val === 'true' ? this.$t('trading-bot.common.enabled') : this.$t('trading-bot.common.disabled')
      if (typeof val === 'boolean') return val ? this.$t('trading-bot.common.enabled') : this.$t('trading-bot.common.disabled')
      if (['priceDropPct', 'takeProfitPct', 'stopLossPct', 'positionPct', 'dipThreshold',
           'trailingTpActivationPct', 'trailingTpCallbackPct', 'initialPositionPct', 'waterfallDropPct'].includes(key)) {
        return `${this.formatNum(val)}%`
      }
      if (['initialAmount', 'amountEach', 'amountPerGrid', 'referencePrice', 'totalBudget'].includes(key)) {
        return `${this.formatNum(val)} USDT`
      }
      if (typeof val === 'number') return this.formatNum(val)
      return String(val)
    }
  }
}
</script>

<style lang="less" scoped>
.detail-header-card,
.detail-tabs-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.detail-header {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  .header-left { display: flex; align-items: center; gap: 14px; flex: 1; }
  .type-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; flex-shrink: 0; }
  .header-info h3 { font-size: 18px; font-weight: 700; margin: 0 0 6px; color: #262626; }
  .header-tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .header-actions { display: flex; gap: 8px; flex-shrink: 0; }
}

.params-panel { padding: 4px 0; }
.params-section {
  margin-bottom: 20px;
  &__title {
    display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600;
    color: #262626; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;
    .anticon { color: #667eea; font-size: 16px; }
  }
}
.params-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.param-item {
  display: flex; flex-direction: column; gap: 4px; padding: 10px 14px;
  background: #fafafa; border-radius: 8px; border: 1px solid #f0f0f0;
  .param-label { font-size: 12px; color: #8c8c8c; line-height: 1.4; }
  .param-value { font-size: 14px; font-weight: 500; color: #262626;
    &.highlight { font-weight: 700; color: #1890ff; }
    &.danger { color: #f5222d; }
    &.success { color: #52c41a; }
  }
}

.resting-orders-panel { padding: 4px 0; }
.resting-orders-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.resting-orders-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}
.resting-summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: #595959;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  strong { font-weight: 700; font-family: 'SF Mono', monospace; }
  &--long {
    color: #389e0d;
    background: rgba(82, 196, 26, 0.06);
    border-color: rgba(82, 196, 26, 0.18);
  }
  &--short {
    color: #cf1322;
    background: rgba(245, 34, 45, 0.06);
    border-color: rgba(245, 34, 45, 0.16);
  }
}
.resting-orders-hint { font-size: 12px; color: #8c8c8c; }
.resting-orders-refresh { border-radius: 8px; flex-shrink: 0; }

.resting-orders-book {
  display: flex;
  gap: 12px;
  align-items: stretch;
  min-height: 320px;
}
.resting-book-col {
  flex: 1;
  min-width: 0;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  &--long { border-color: rgba(82, 196, 26, 0.22); }
  &--short { border-color: rgba(245, 34, 45, 0.2); }
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  }
  &--long &__head {
    background: rgba(82, 196, 26, 0.06);
    border-bottom-color: rgba(82, 196, 26, 0.12);
  }
  &--short &__head {
    background: rgba(245, 34, 45, 0.06);
    border-bottom-color: rgba(245, 34, 45, 0.12);
  }
  &__title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
  }
  &--long &__title { color: #389e0d; }
  &--short &__title { color: #cf1322; }
  &__hint {
    font-size: 11px;
    color: #8c8c8c;
    white-space: nowrap;
  }
  &__labels {
    display: grid;
    grid-template-columns: 44px 1fr 88px minmax(0, 1.2fr);
    gap: 8px;
    padding: 8px 14px;
    font-size: 11px;
    color: #8c8c8c;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;
  }
  &__body {
    flex: 1;
    max-height: 420px;
    overflow-y: auto;
    padding: 4px 0;
  }
  &__empty {
    text-align: center;
    padding: 32px 16px;
    color: #bfbfbf;
    font-size: 13px;
  }
}
.resting-book-row {
  display: grid;
  grid-template-columns: 44px 1fr 88px minmax(0, 1.2fr);
  gap: 8px;
  align-items: center;
  padding: 8px 14px;
  font-size: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
  transition: background 0.15s ease;
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(0, 0, 0, 0.02); }
  &__cell {
    font-weight: 600;
    color: #bfbfbf;
    font-size: 11px;
  }
  &__price {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-weight: 700;
    font-size: 13px;
  }
  &__qty {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    color: #595959;
    font-size: 11px;
  }
  &__purpose {
    color: #8c8c8c;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &--long &__price { color: #389e0d; }
  &--short &__price { color: #cf1322; }
}
.resting-book-mid {
  flex-shrink: 0;
  width: 108px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 4px;
  &__badge {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1890ff, #667eea);
    color: #fff;
    font-size: 16px;
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.25);
  }
  &__price {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-weight: 700;
    font-size: 12px;
    color: #1890ff;
    text-align: center;
    line-height: 1.35;
    word-break: break-all;
  }
  &__label {
    font-size: 10px;
    color: #8c8c8c;
    text-align: center;
  }
  &__range {
    margin-top: 4px;
    font-size: 10px;
    color: #bfbfbf;
    text-align: center;
    line-height: 1.45;
  }
  &__range-sep { margin: 0 2px; }
}

@media (max-width: 992px) {
  .resting-orders-book {
    flex-direction: column;
    min-height: 0;
  }
  .resting-book-mid {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    padding: 10px;
    border-radius: 10px;
    background: rgba(24, 144, 255, 0.04);
    border: 1px dashed rgba(24, 144, 255, 0.18);
  }
  .resting-book-col__labels,
  .resting-book-row {
    grid-template-columns: 36px 1fr 72px minmax(0, 1fr);
  }
}

/* ===================== Hedge summary (grid / DCA) ===================== */
.hedge-summary-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}
.hedge-summary {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  &__title {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  &__icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
    color: #667eea;
    font-size: 16px;
    flex-shrink: 0;
  }
  &__title-text {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  &__name {
    font-size: 14px;
    font-weight: 600;
    color: #262626;
    line-height: 1.4;
  }
  &__tip {
    color: #bfbfbf;
    cursor: help;
    font-size: 13px;
  }
  &__refresh {
    border-radius: 8px;
    color: #595959;
    flex-shrink: 0;
  }
  &__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }
}
.hedge-stat {
  position: relative;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  background: #fafbfc;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  &:hover {
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
  }
  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  &__badge {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    flex-shrink: 0;
    &--long {
      background: rgba(82, 196, 26, 0.12);
      color: #389e0d;
    }
    &--short {
      background: rgba(245, 34, 45, 0.1);
      color: #cf1322;
    }
    &--profit {
      background: rgba(24, 144, 255, 0.1);
      color: #1890ff;
    }
  }
  &__label {
    font-size: 13px;
    font-weight: 500;
    color: #595959;
    line-height: 1.3;
  }
  &__value {
    font-size: 24px;
    font-weight: 700;
    color: #141414;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    line-height: 1.25;
    letter-spacing: -0.02em;
    min-height: 30px;
    &--empty {
      font-size: 15px;
      font-weight: 500;
      color: #bfbfbf;
      font-family: inherit;
      letter-spacing: 0;
    }
    .profit { color: #52c41a; }
    .loss { color: #f5222d; }
    .neutral { color: #262626; }
  }
  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 10px;
    font-size: 12px;
    color: #8c8c8c;
    &--muted {
      justify-content: flex-start;
      color: #bfbfbf;
    }
    &-item strong {
      color: #595959;
      font-weight: 600;
      margin-left: 4px;
    }
  }
  &__pnl {
    font-weight: 600;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    white-space: nowrap;
    &.profit { color: #52c41a; }
    &.loss { color: #f5222d; }
  }
  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }
  &__tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    color: #595959;
    background: rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.06);
    white-space: nowrap;
  }
  &--long {
    background: linear-gradient(180deg, rgba(82, 196, 26, 0.04) 0%, #fafbfc 100%);
    border-color: rgba(82, 196, 26, 0.18);
  }
  &--short {
    background: linear-gradient(180deg, rgba(245, 34, 45, 0.04) 0%, #fafbfc 100%);
    border-color: rgba(245, 34, 45, 0.16);
  }
  &--profit {
    background: linear-gradient(180deg, rgba(24, 144, 255, 0.05) 0%, #fafbfc 100%);
    border-color: rgba(24, 144, 255, 0.16);
  }
}

@media (max-width: 992px) {
  .hedge-summary__grid {
    grid-template-columns: 1fr;
  }
}
.theme-dark {
  .detail-header-card, .detail-tabs-card, .hedge-summary-card { background: #1f1f1f; box-shadow: 0 2px 12px rgba(0,0,0,0.3); }
  .hedge-summary__name { color: #e8e8e8; }
  .hedge-summary__icon {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  }
  .hedge-stat {
    background: #141414;
    border-color: #303030;
    &__label { color: #a6a6a6; }
    &__value {
      color: #f0f0f0;
      &--empty { color: #595959; }
      .neutral { color: #e8e8e8; }
    }
    &__meta {
      color: #8c8c8c;
      &--muted { color: #595959; }
      &-item strong { color: #bfbfbf; }
    }
    &__tag {
      color: #a6a6a6;
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
    }
    &--long {
      background: linear-gradient(180deg, rgba(82, 196, 26, 0.08) 0%, #141414 100%);
      border-color: rgba(82, 196, 26, 0.22);
    }
    &--short {
      background: linear-gradient(180deg, rgba(245, 34, 45, 0.08) 0%, #141414 100%);
      border-color: rgba(245, 34, 45, 0.2);
    }
    &--profit {
      background: linear-gradient(180deg, rgba(24, 144, 255, 0.08) 0%, #141414 100%);
      border-color: rgba(24, 144, 255, 0.2);
    }
  }
  .header-info h3 { color: #e8e8e8; }
  .params-section__title { color: #d9d9d9; border-bottom-color: #303030; }
  .param-item { background: #141414; border-color: #303030;
    .param-label { color: #8c8c8c; }
    .param-value { color: #e8e8e8; }
  }
  .resting-summary-chip {
    background: rgba(255, 255, 255, 0.04);
    border-color: #303030;
    color: #a6a6a6;
    &--long { background: rgba(82, 196, 26, 0.1); border-color: rgba(82, 196, 26, 0.22); color: #73d13d; }
    &--short { background: rgba(245, 34, 45, 0.1); border-color: rgba(245, 34, 45, 0.2); color: #ff4d4f; }
  }
  .resting-book-col {
    border-color: #303030;
    &--long { border-color: rgba(82, 196, 26, 0.22); }
    &--short { border-color: rgba(245, 34, 45, 0.2); }
    &__labels { background: #141414; border-bottom-color: #303030; color: #8c8c8c; }
    &__head { border-bottom-color: rgba(255, 255, 255, 0.06); }
    &--long &__head { background: rgba(82, 196, 26, 0.1); }
    &--short &__head { background: rgba(245, 34, 45, 0.1); }
  }
  .resting-book-row {
    border-bottom-color: rgba(255, 255, 255, 0.04);
    &:hover { background: rgba(255, 255, 255, 0.03); }
    &__cell { color: #595959; }
    &__qty { color: #a6a6a6; }
    &__purpose { color: #8c8c8c; }
    &--long &__price { color: #73d13d; }
    &--short &__price { color: #ff4d4f; }
  }
  .resting-book-mid {
    &__price { color: #40a9ff; }
    &__label, &__range { color: #595959; }
  }
}
</style>
