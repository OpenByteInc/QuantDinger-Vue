<template>
  <a-modal
    :visible="visible"
    :title="null"
    :footer="null"
    :width="720"
    :body-style="{ padding: 0 }"
    :wrap-class-name="modalWrapClass"
    @cancel="$emit('close')"
    class="indicator-detail-modal"
  >
    <a-spin :spinning="loading">
      <div v-if="detail" class="detail-container indicator-detail-modal" :class="{ 'is-dark': isDarkTheme }">
        <div class="detail-header" :style="headerStyle">
          <div class="header-cover" v-if="detail.preview_image">
            <img :src="detail.preview_image" :alt="detail.name" @error="imageError = true" />
          </div>
          <div class="header-cover default-cover" v-else>
            <span class="cover-initials">{{ indicatorInitials }}</span>
          </div>
          <div class="header-info">
            <h2 class="indicator-name">{{ detail.name }}</h2>
            <div class="indicator-meta">
              <div class="author-info">
                <a-avatar :src="detail.author.avatar" :size="32" />
                <span class="author-name">{{ detail.author.nickname || detail.author.username }}</span>
              </div>
              <div class="publish-time">
                {{ $t('community.publishedAt') }}: {{ formatDate(detail.created_at) }}
              </div>
            </div>
            <div class="indicator-stats">
              <a-statistic :title="$t('community.downloads')" :value="detail.purchase_count || 0">
                <template #prefix>
                  <a-icon type="download" />
                </template>
              </a-statistic>
              <a-statistic :title="$t('community.rating')">
                <template #formatter>
                  <a-rate :value="detail.avg_rating" disabled allow-half :style="{ fontSize: '14px' }" />
                  <span class="rating-text">({{ detail.rating_count || 0 }})</span>
                </template>
              </a-statistic>
              <a-statistic :title="$t('community.views')" :value="detail.view_count || 0">
                <template #prefix>
                  <a-icon type="eye" />
                </template>
              </a-statistic>
            </div>
          </div>
        </div>

        <div class="detail-body">
          <div class="section">
            <h3>{{ $t('community.description') }}</h3>
            <p class="description">{{ detail.description || $t('community.noDescription') }}</p>
          </div>

          <div class="section" v-if="isBotPreset">
            <h3>{{ $t('community.botPresetInfo') }}</h3>
            <p class="description">{{ $t('community.botPresetUseHint') }}</p>
          </div>

          <!--
            Performance panel. Headline KPIs are kept visually quiet; source
            context lives in the chart meta and applicable range rows.
          -->
          <div class="section" v-if="performance && !isBotPreset">
            <h3>{{ $t('community.performance') }}</h3>

            <div class="performance-grid">
              <div class="perf-item perf-item--score">
                <div class="perf-label">
                  {{ $t('community.compositeScore') }}
                  <a-tooltip :title="$t('community.scoreTooltipBase')">
                    <a-icon type="info-circle" />
                  </a-tooltip>
                </div>
                <div class="perf-value">
                  {{ formatScore(performance.score) }}
                  <span class="perf-unit">/ 100</span>
                </div>
              </div>
              <div class="perf-item">
                <div class="perf-label">
                  {{ $t('community.totalReturn') }}
                </div>
                <div class="perf-value" :class="toneClass(performance.total_return)">
                  {{ formatPercent(performance.total_return) }}
                </div>
              </div>
              <div class="perf-item">
                <div class="perf-label">
                  {{ $t('community.sharpe') }}
                </div>
                <div class="perf-value" :class="toneClass(performance.sharpe, 1)">
                  {{ formatNumber(performance.sharpe, 2) }}
                </div>
              </div>
              <div class="perf-item">
                <div class="perf-label">
                  {{ $t('community.maxDrawdown') }}
                </div>
                <div class="perf-value negative">
                  {{ formatPercent(performance.max_drawdown) }}
                </div>
              </div>
              <div class="perf-item">
                <div class="perf-label">
                  {{ $t('community.profitFactor') }}
                </div>
                <div class="perf-value" :class="toneClass(performance.profit_factor - 1)">
                  {{ formatNumber(performance.profit_factor, 2) }}
                </div>
              </div>
              <div class="perf-item">
                <div class="perf-label">
                  {{ $t('community.winRate') }}
                </div>
                <div class="perf-value" :class="performance.win_rate >= 50 ? 'positive' : 'negative'">
                  {{ formatNumber(performance.win_rate, 2) }}%
                </div>
              </div>
              <div class="perf-item">
                <div class="perf-label">
                  {{ $t('community.liveStrategies') }}
                </div>
                <div class="perf-value">{{ performance.live_strategy_count || 0 }}</div>
              </div>
              <div class="perf-item">
                <div class="perf-label">
                  {{ $t('community.liveTrades') }}
                </div>
                <div class="perf-value">{{ performance.live_trade_count || 0 }}</div>
              </div>
            </div>

            <div v-if="hasApplicable" class="applicable-row">
              <div class="applicable-row__label">{{ $t('community.applicableSymbols') }}</div>
              <div class="applicable-row__tags">
                <a-tag
                  v-for="sym in performance.applicable_symbols"
                  :key="`sym-${sym}`"
                  class="tag-symbol"
                >{{ sym }}</a-tag>
                <span v-if="!(performance.applicable_symbols || []).length" class="applicable-row__empty">—</span>
              </div>
            </div>
            <div v-if="hasApplicable" class="applicable-row">
              <div class="applicable-row__label">{{ $t('community.applicableTimeframes') }}</div>
              <div class="applicable-row__tags">
                <a-tag
                  v-for="tf in performance.applicable_timeframes"
                  :key="`tf-${tf}`"
                  class="tag-tf"
                >{{ tf }}</a-tag>
                <span v-if="!(performance.applicable_timeframes || []).length" class="applicable-row__empty">—</span>
              </div>
            </div>

            <div v-if="hasEquityCurve" class="equity-card">
              <div class="equity-card__head">
                <div class="equity-card__title">{{ $t('community.equityCurveTitle') }}</div>
                <div v-if="performance.best_run_meta" class="equity-card__meta">
                  <a-tag class="tag-symbol">{{ performance.best_run_meta.symbol }}</a-tag>
                  <a-tag class="tag-tf">{{ performance.best_run_meta.timeframe }}</a-tag>
                  <a-tag
                    v-if="performance.best_run_meta.market_type"
                    :class="performance.best_run_meta.market_type === 'swap' ? 'tag-market tag-market--swap' : 'tag-market tag-market--spot'"
                  >
                    {{ formatMarketType(performance.best_run_meta.market_type) }}
                  </a-tag>
                  <a-tag
                    v-if="performance.best_run_meta.leverage"
                    class="tag-leverage"
                  >
                    {{ formatLeverage(performance.best_run_meta.leverage) }}
                  </a-tag>
                  <a-tag
                    v-if="performance.best_run_meta.duration_days"
                    class="tag-duration"
                  >
                    {{ formatBacktestDuration(performance.best_run_meta.duration_days) }}
                  </a-tag>
                  <span class="equity-card__meta-sep">/</span>
                  <span :class="toneClass(performance.best_run_meta.total_return)">
                    {{ formatPercent(performance.best_run_meta.total_return) }}
                  </span>
                  <span class="equity-card__meta-sep">/</span>
                  <span class="negative">
                    {{ $t('community.maxDrawdown') }}
                    {{ formatPercent(performance.best_run_meta.max_drawdown) }}
                  </span>
                </div>
              </div>
              <div ref="equityChart" class="equity-card__chart"></div>
              <div class="equity-card__hint">
                {{ $t('community.equityCurveHint') }}
              </div>
            </div>
            <a-alert
              v-else-if="performance.sample_size > 0"
              type="info"
              show-icon
              :message="$t('community.equityCurveMissing')"
              style="margin-top: 16px;"
            />
          </div>

          <div class="section">
            <h3>{{ $t('community.reviews') }} ({{ comments.total || 0 }})</h3>
            <comment-list
              :comments="comments.items"
              :loading="commentsLoading"
              :can-comment="detail.is_purchased && !detail.is_own && !myComment"
              :current-user-id="currentUserId"
              :my-comment="myComment"
              :total="comments.total"
              @add-comment="handleAddComment"
              @update-comment="handleUpdateComment"
              @load-more="loadMoreComments"
            />
          </div>
        </div>

        <div class="detail-footer">
          <div class="price-info">
            <a-tag v-if="detail.vip_free" color="gold" style="margin-right: 8px;">
              {{ $t('community.vipFree') }}
            </a-tag>
            <!--
              For already-purchased users we show the price the buyer actually
              paid (your_purchase_price from the API) as the primary number,
              and mark the current price as a secondary "current price"
              caption underneath. This avoids the confusing case where the
              indicator has since been re-priced and the buyer thinks they
              were charged the wrong amount.
            -->
            <template v-if="showYourPurchasePrice">
              <div class="price-line price-line--primary">
                <span class="price-line__label">{{ $t('community.yourPurchasePrice') }}:</span>
                <span class="price-badge price-badge--paid">
                  {{ formatPrice(detail.your_purchase_price) }} {{ $t('community.credits') }}
                </span>
              </div>
              <div
                v-if="detail.pricing_type !== 'free' && Number(detail.price) > 0"
                class="price-line price-line--secondary"
              >
                <span class="price-line__label">{{ $t('community.currentPrice') }}:</span>
                <span class="price-current-aside">{{ detail.price }} {{ $t('community.credits') }}</span>
              </div>
            </template>
            <template v-else>
              <span v-if="detail.pricing_type === 'free' || detail.price <= 0" class="free-badge">
                {{ $t('community.free') }}
              </span>
              <span v-else class="price-badge">
                {{ detail.price }} {{ $t('community.credits') }}
              </span>
            </template>
          </div>
          <div class="action-buttons">
            <a-button v-if="detail.is_own" disabled>
              {{ $t('community.myIndicator') }}
            </a-button>
            <template v-else-if="detail.is_purchased">
              <a-tooltip :title="syncActionTooltip" placement="top">
                <a-badge :dot="!!detail.has_update && !localCopyMissing" :offset="[-4, 4]">
                  <a-button
                    :type="localCopyMissing ? 'primary' : 'default'"
                    :loading="syncing"
                    @click="handleSyncCode"
                  >
                    <a-icon :type="localCopyMissing ? 'cloud-download' : 'sync'" />
                    {{ syncing ? syncActionLoadingLabel : syncActionLabel }}
                    <a-tag
                      v-if="detail.has_update && !syncing && !localCopyMissing"
                      color="orange"
                      class="update-tag"
                    >{{ $t('community.hasUpdate') }}</a-tag>
                  </a-button>
                </a-badge>
              </a-tooltip>
              <a-button v-if="!localCopyMissing" type="primary" @click="goToUse">
                <a-icon :type="isBotPreset ? 'robot' : (isScriptTemplate ? 'code-sandbox' : 'code')" />
                {{ useNowLabel }}
              </a-button>
            </template>
            <a-button
              v-else
              type="primary"
              :loading="purchasing"
              @click="handlePurchase"
            >
              <a-icon type="shopping-cart" />
              {{ detail.pricing_type === 'free' || detail.price <= 0 ? $t('community.getFree') : $t('community.buyNow') }}
            </a-button>
          </div>
        </div>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import { mapState } from 'vuex'
import CommentList from './CommentList.vue'
import request from '@/utils/request'

export default {
  name: 'IndicatorDetail',
  components: {
    CommentList
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    indicatorId: {
      type: Number,
      default: null
    },
    currentUserId: {
      type: [Number, String],
      default: null
    }
  },
  data () {
    return {
      loading: false,
      purchasing: false,
      syncing: false,
      commentsLoading: false,
      detail: null,
      performance: null,
      comments: {
        items: [],
        total: 0,
        page: 1
      },
      myComment: null,
      imageError: false,
      // Equity-curve echarts instance. Lazy-loaded on first render
      // (see ``renderEquityChart``) so we don't pull echarts into the
      // initial bundle if the user never opens the indicator detail.
      // NB: vue/no-reserved-keys forbids leading underscores in data;
      // these are private-by-convention only; ``equityChart`` (no Inst
      // suffix) would collide with the template ref name.
      equityChartInst: null,
      equityResizeHandler: null
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    /** Stable wrap class for the portaled <a-modal>. Pairs with the
     * non-scoped style block at the bottom of this file to deliver
     * dark theme rules without relying on `body.dark` ancestor
     * selectors (which the modal isn't a descendant of). */
    modalWrapClass () {
      const base = 'qd-indicator-detail-modal-wrap'
      return this.isDarkTheme ? `${base} ${base}--dark` : base
    },
    /** True only when the buyer paid >0 credits; we don't want to
     * show "your purchase price: 0" on free indicators (would look
     * like a bug). The free badge in the price-info block already
     * conveys "this is free". */
    showYourPurchasePrice () {
      return !!(this.detail && this.detail.is_purchased &&
        Number(this.detail.your_purchase_price || 0) > 0)
    },
    isScriptTemplate () {
      return (this.detail && this.detail.asset_type) === 'script_template'
    },
    isBotPreset () {
      return (this.detail && this.detail.asset_type) === 'bot_preset'
    },
    localCopyMissing () {
      return !!(this.detail && this.detail.is_purchased && this.detail.local_copy_missing)
    },
    syncActionLabel () {
      return this.localCopyMissing ? this.$t('community.restoreCopy') : this.$t('community.syncCode')
    },
    syncActionLoadingLabel () {
      return this.localCopyMissing ? this.$t('community.restoringCopy') : this.$t('community.syncingCode')
    },
    syncActionTooltip () {
      return this.localCopyMissing ? this.$t('community.restoreCopyTooltip') : this.$t('community.syncCodeTooltip')
    },
    useNowLabel () {
      if (this.isScriptTemplate) {
        return this.$t('community.useScriptStrategy')
      }
      if (this.isBotPreset) {
        return this.$t('community.useBotPreset')
      }
      return this.$t('community.useNow')
    },
    hasEquityCurve () {
      return this.performance && Array.isArray(this.performance.equity_curve) &&
        this.performance.equity_curve.length > 1
    },
    hasApplicable () {
      if (!this.performance) return false
      return (this.performance.applicable_symbols || []).length > 0 ||
        (this.performance.applicable_timeframes || []).length > 0
    },
    headerStyle () {
      if (!this.detail) return {}
      const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)'
      ]
      const index = (this.detail.id || 0) % gradients.length
      return { background: gradients[index] }
    },
    indicatorInitials () {
      if (!this.detail) return ''
      const name = this.detail.name || 'I'
      if (/[\u4e00-\u9fa5]/.test(name)) {
        return name.slice(0, 2)
      }
      const words = name.split(/\s+/)
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      }
      return name.slice(0, 2).toUpperCase()
    }
  },
  watch: {
    visible (val) {
      if (val && this.indicatorId) {
        this.loadDetail()
        this.loadPerformance()
        this.loadComments(1)
        this.loadMyComment()
      } else {
        this.resetData()
      }
    },
    isDarkTheme () {
      if (this.hasEquityCurve && this.equityChartInst) {
        this.$nextTick(() => this.renderEquityChart())
      }
    }
  },
  beforeDestroy () {
    this.disposeEquityChart()
  },
  methods: {
    resetData () {
      this.detail = null
      this.performance = null
      this.comments = { items: [], total: 0, page: 1 }
      this.myComment = null
      this.disposeEquityChart()
    },

    async loadDetail () {
      this.loading = true
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}`,
          method: 'get'
        })
        if (res.code === 1) {
          this.detail = res.data
        } else {
          this.$message.error(res.msg || this.$t('community.loadFailed'))
        }
      } catch (e) {
        this.$message.error(this.$t('community.loadFailed'))
      } finally {
        this.loading = false
      }
    },

    async loadPerformance () {
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/performance`,
          method: 'get'
        })
        if (res.code === 1) {
          this.performance = res.data
          // Equity curve has to render *after* the DOM cell exists, and
          // echarts is dynamically imported to keep the indicator-market
          // entry chunk small. We don't await the import here; fire and
          // forget; if the user closes the modal before it finishes,
          // ``disposeEquityChart`` is a no-op on a missing instance.
          this.$nextTick(() => {
            if (this.hasEquityCurve) this.renderEquityChart()
          })
        }
      } catch (e) {
        console.error('Load performance failed:', e)
      }
    },

    async renderEquityChart () {
      const el = this.$refs.equityChart
      if (!el) return
      try {
        const echarts = await import('echarts')
        this.disposeEquityChart()
        const inst = echarts.init(el)
        const points = this.performance.equity_curve || []
        // Backend currently emits ``equity`` as a normalized series. We
        // accept both raw numbers and {timestamp, equity} dicts so that
        // backend schema can evolve without breaking this view.
        const xs = points.map((p, i) => {
          if (typeof p === 'object' && p !== null) {
            return p.time || p.date || p.timestamp || String(i)
          }
          return String(i)
        })
        const ys = points.map(p => {
          if (typeof p === 'object' && p !== null) {
            return parseFloat(p.equity != null ? p.equity : p.value) || 0
          }
          return parseFloat(p) || 0
        })
        // Start the area-fill at the baseline value (typically 1 for
        // normalized equity, or initial capital) so a flat-line series
        // doesn't look like it shot to infinity.
        const baseline = ys.length ? ys[0] : 0
        const dark = this.isDarkTheme
        const axisLabelColor = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'
        const splitLineColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
        const axisLineColor = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
        inst.setOption({
          backgroundColor: 'transparent',
          grid: { left: 50, right: 16, top: 16, bottom: 32 },
          tooltip: {
            trigger: 'axis',
            confine: true,
            backgroundColor: dark ? 'rgba(38,38,38,0.96)' : undefined,
            borderColor: dark ? '#434343' : undefined,
            textStyle: dark ? { color: 'rgba(255,255,255,0.85)' } : undefined,
            axisPointer: { type: 'cross' }
          },
          xAxis: {
            type: 'category',
            data: xs,
            boundaryGap: false,
            axisLabel: { fontSize: 11, color: axisLabelColor },
            axisLine: { lineStyle: { color: axisLineColor } },
            splitLine: { show: false }
          },
          yAxis: {
            type: 'value',
            scale: true,
            axisLabel: { fontSize: 11, color: axisLabelColor },
            axisLine: { lineStyle: { color: axisLineColor } },
            splitLine: { lineStyle: { color: splitLineColor } }
          },
          series: [{
            name: this.$t('community.equityCurveTitle'),
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: ys,
            lineStyle: { width: 2, color: 'var(--primary-color, #1890ff)' },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(24, 144, 255, 0.32)' },
                  { offset: 1, color: 'rgba(24, 144, 255, 0.02)' }
                ]
              },
              origin: baseline
            }
          }]
        })
        this.equityChartInst = inst
        // Modal width is fixed-ish but the chart still needs to resize
        // when the page chrome reflows (e.g. zooming, dev tools).
        this.equityResizeHandler = () => inst.resize()
        window.addEventListener('resize', this.equityResizeHandler)
      } catch (e) {
        console.error('Equity chart render failed:', e)
      }
    },

    disposeEquityChart () {
      if (this.equityResizeHandler) {
        window.removeEventListener('resize', this.equityResizeHandler)
        this.equityResizeHandler = null
      }
      if (this.equityChartInst) {
        try { this.equityChartInst.dispose() } catch (e) { /* noop */ }
        this.equityChartInst = null
      }
    },

    async loadComments (page = 1) {
      this.commentsLoading = true
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/comments`,
          method: 'get',
          params: { page, page_size: 10 }
        })
        if (res.code === 1) {
          if (page === 1) {
            this.comments.items = res.data.items
          } else {
            this.comments.items = [...this.comments.items, ...res.data.items]
          }
          this.comments.total = res.data.total
          this.comments.page = page
        }
      } catch (e) {
        console.error('Load comments failed:', e)
      } finally {
        this.commentsLoading = false
      }
    },

    loadMoreComments () {
      if (this.comments.items.length < this.comments.total) {
        this.loadComments(this.comments.page + 1)
      }
    },

    async loadMyComment () {
      if (!this.currentUserId) return
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/my-comment`,
          method: 'get'
        })
        if (res.code === 1) {
          this.myComment = res.data
        }
      } catch (e) {
        console.error('Load my comment failed:', e)
      }
    },

    async handleAddComment (data) {
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/comments`,
          method: 'post',
          data
        })
        if (res.code === 1) {
          this.$message.success(this.$t('community.commentSuccess'))
          this.loadComments(1)
          this.loadMyComment()
          this.loadDetail()
        } else {
          const msgKey = `community.${res.msg}`
          this.$message.error(this.$te(msgKey) ? this.$t(msgKey) : res.msg)
        }
      } catch (e) {
        this.$message.error(this.$t('community.commentFailed'))
      }
    },

    async handleUpdateComment (data) {
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/comments/${data.comment_id}`,
          method: 'put',
          data: {
            rating: data.rating,
            content: data.content
          }
        })
        if (res.code === 1) {
          this.$message.success(this.$t('community.commentUpdateSuccess'))
          this.loadComments(1)
          this.loadMyComment()
          this.loadDetail()
        } else {
          const msgKey = `community.${res.msg}`
          this.$message.error(this.$te(msgKey) ? this.$t(msgKey) : res.msg)
        }
      } catch (e) {
        this.$message.error(this.$t('community.commentUpdateFailed'))
      }
    },

    async handlePurchase () {
      this.purchasing = true
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/purchase`,
          method: 'post'
        })
        if (res.code === 1) {
          const assetType = res.data && res.data.asset_type
          let successKey = 'community.purchaseSuccess'
          if (assetType === 'script_template') {
            successKey = 'community.scriptTemplatePurchased'
          } else if (assetType === 'bot_preset') {
            successKey = 'community.botPresetPurchased'
          }
          this.$message.success(this.$t(successKey))
          this.loadDetail()
          this.$emit('purchased')
        } else {
          this.$message.error(this.formatPurchaseError(res))
        }
      } catch (e) {
        this.$message.error(this.formatPurchaseError(e))
      } finally {
        this.purchasing = false
      }
    },

    formatPurchaseError (source) {
      const envelope = (source && source.response && source.response.data) || source || {}
      const code = envelope.msg || envelope.message || envelope.error || ''
      const details = envelope.data || {}
      if (code === 'insufficient_credits') {
        const required = Number(details.required || 0)
        const current = Number(details.current || 0)
        const shortage = Math.max(required - current, 0)
        return this.$t('community.insufficientCreditsDetail', {
          required: this.formatPrice(required),
          current: this.formatPrice(current),
          shortage: this.formatPrice(shortage)
        })
      }
      const msgKey = code ? `community.${code}` : ''
      if (msgKey && this.$te(msgKey)) return this.$t(msgKey)
      return (source && source.backendMessage) || code || this.$t('community.purchaseFailed')
    },

    goToUse () {
      this.$emit('close')
      const assetType = (this.detail && this.detail.asset_type) || 'indicator'
      if (assetType === 'script_template') {
        const sid = this.detail && (this.detail.script_source_id || this.detail.purchased_script_source_id)
        if (sid) {
          this.$router.push({
            path: '/strategy-ide',
            query: { tab: 'script', source_id: String(sid) }
          })
        } else {
          this.$router.push({ path: '/strategy-ide', query: { tab: 'script' } })
        }
        return
      }
      if (assetType === 'bot_preset') {
        const sid = this.detail && this.detail.purchased_strategy_id
        if (sid) {
          this.$router.push({
            path: '/trading-bot',
            query: { strategy_id: String(sid), action: 'edit' }
          })
        } else {
          this.$router.push('/trading-bot')
        }
        return
      }
      this.$router.push('/indicator-ide')
    },

    handleSyncCode () {
      if (this.syncing) return
      this.$confirm({
        title: this.localCopyMissing ? this.$t('community.restoreCopyConfirmTitle') : this.$t('community.syncCodeConfirmTitle'),
        content: this.localCopyMissing ? this.$t('community.restoreCopyConfirmContent') : this.$t('community.syncCodeConfirmContent'),
        okText: this.localCopyMissing ? this.$t('community.restoreCopy') : this.$t('community.syncCode'),
        cancelText: this.$t('community.cancelEdit'),
        onOk: () => this.doSyncCode()
      })
    },

    async doSyncCode () {
      this.syncing = true
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/sync`,
          method: 'post'
        })
        if (res.code === 1) {
          // Backend returns `already_latest` when nothing had to be copied.
          if (res.msg === 'already_latest') {
            this.$message.info(this.$t('community.already_latest'))
          } else if (res.msg === 'restored') {
            this.$message.success(this.$t('community.restoreCopySuccess'))
          } else {
            this.$message.success(this.$t('community.syncCodeSuccess'))
          }
          // Refresh detail so the "Update available" badge clears immediately.
          this.loadDetail()
          this.$emit('synced')
        } else {
          const msgKey = `community.${res.msg}`
          this.$message.error(this.$te(msgKey) ? this.$t(msgKey) : (res.msg || this.$t('community.syncCodeFailed')))
        }
      } catch (e) {
          // request interceptor may surface backend msg directly; fall back to a generic one
        const backendMsg = e && e.response && e.response.data && e.response.data.msg
        const msgKey = backendMsg ? `community.${backendMsg}` : ''
        if (msgKey && this.$te(msgKey)) {
          this.$message.error(this.$t(msgKey))
        } else {
          this.$message.error(this.$t('community.syncCodeFailed'))
        }
      } finally {
        this.syncing = false
      }
    },

    formatDate (dateStr) {
      if (!dateStr) return '-'
      const d = new Date(dateStr)
      return d.toLocaleDateString()
    },
    /** Format the price the buyer paid. Integers print without decimals;
     * fractional credits keep up to 2 dp. Mirrors index.vue's helper. */
    formatPrice (val) {
      const n = parseFloat(val)
      if (isNaN(n)) return '0'
      return Number.isInteger(n) ? String(n) : n.toFixed(2)
    },
    formatNumber (val, digits) {
      const v = parseFloat(val)
      if (isNaN(v)) return '—'
      return v.toFixed(digits == null ? 2 : digits)
    },
    formatPercent (val) {
      const v = parseFloat(val)
      if (isNaN(v)) return '—'
      const sign = v > 0 ? '+' : ''
      return `${sign}${v.toFixed(2)}%`
    },
    formatScore (val) {
      const v = parseFloat(val)
      if (isNaN(v)) return '—'
      return v.toFixed(0)
    },
    formatMarketType (val) {
      const type = String(val || '').toLowerCase()
      if (type === 'spot') return this.$t('trading-assistant.form.marketTypeSpot')
      if (type === 'swap') return this.$t('trading-assistant.form.marketTypeFutures')
      return type || '—'
    },
    formatLeverage (val) {
      const v = parseFloat(val)
      if (isNaN(v) || v <= 0) return '1x'
      return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2)}x`
    },
    formatBacktestDuration (val) {
      const days = parseInt(val, 10)
      if (!days || days <= 0) return ''
      return this.$t('community.backtestDurationDays', { days })
    },
    // Generic tone class. ``positiveThreshold`` lets callers say "Sharpe
    // is only good if >= 1" without re-implementing the rule.
    toneClass (val, positiveThreshold = 0) {
      const v = parseFloat(val)
      if (isNaN(v)) return ''
      if (v > positiveThreshold) return 'positive'
      if (v < 0) return 'negative'
      return ''
    }
  }
}
</script>

<style lang="less" scoped>
.indicator-detail-modal {
  .detail-container {
    display: flex;
    flex-direction: column;
    max-height: 80vh;
  }

  .detail-header {
    display: flex;
    gap: 20px;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;

    .header-cover {
      width: 180px;
      height: 120px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      &.default-cover {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.15);
        border: 2px solid rgba(255, 255, 255, 0.3);

        .cover-initials {
          font-size: 42px;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          letter-spacing: 2px;
        }
      }
    }

    .header-info {
      flex: 1;

      .indicator-name {
        font-size: 20px;
        font-weight: 600;
        margin: 0 0 12px 0;
        color: #fff;
      }

      .indicator-meta {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;

        .author-info {
          display: flex;
          align-items: center;
          gap: 8px;

          .author-name {
            font-size: 14px;
          }
        }

        .publish-time {
          font-size: 12px;
          opacity: 0.8;
        }
      }

      .indicator-stats {
        display: flex;
        gap: 24px;

        ::v-deep .ant-statistic {
          .ant-statistic-title {
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
          }

          .ant-statistic-content {
            color: #fff;
            font-size: 16px;
          }
        }

        .rating-text {
          font-size: 12px;
          margin-left: 4px;
          opacity: 0.8;
        }
      }
    }
  }

  .detail-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;

    .section {
      margin-bottom: 24px;

      h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #f0f0f0;
      }

      .description {
        font-size: 14px;
        line-height: 1.8;
        color: rgba(0, 0, 0, 0.65);
        white-space: pre-wrap;
      }
    }

    .performance-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;

      .perf-item {
        text-align: center;
        padding: 12px 8px;
        background: #f5f5f5;
        border-radius: 8px;

        .perf-label {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.55);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex-wrap: wrap;

          .anticon { font-size: 12px; color: rgba(0, 0, 0, 0.35); }

          .src-tag {
            margin: 0;
            font-size: 10px;
            line-height: 14px;
            padding: 0 4px;
            border: none;

            &--bt { background: rgba(24, 144, 255, 0.08); color: var(--primary-color, #1890ff); }
            &--live { background: rgba(82, 196, 26, 0.08); color: #389e0d; }
          }
        }

        .perf-value {
          font-size: 18px;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.85);

          .perf-unit {
            font-size: 11px;
            font-weight: 400;
            color: rgba(0, 0, 0, 0.45);
            margin-left: 2px;
          }

          &.positive { color: #52c41a; }
          &.negative { color: #f5222d; }
        }

        &--score {
          background: linear-gradient(135deg, rgba(245, 175, 25, 0.12) 0%, rgba(241, 39, 17, 0.08) 100%);
          .perf-value { color: #d4380d; }
        }
      }
    }

    .applicable-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      font-size: 12px;

      &__label {
        flex-shrink: 0;
        color: rgba(0, 0, 0, 0.5);
        width: 80px;
      }
      &__tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;

        .ant-tag {
          margin: 0;
          font-size: 11px;
          border: none;
        }
        .tag-symbol { background: rgba(24, 144, 255, 0.08); color: var(--primary-color, #1890ff); }
        .tag-tf { background: rgba(82, 196, 26, 0.08); color: #389e0d; }
      }
      &__empty {
        color: rgba(0, 0, 0, 0.3);
      }
    }

    .equity-card {
      margin-top: 16px;
      padding: 16px;
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 8px;

      &__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        flex-wrap: wrap;
        gap: 8px;
      }
      &__title {
        font-size: 14px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.85);
      }
      &__meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        flex-wrap: wrap;

        .ant-tag {
          margin: 0;
          font-size: 11px;
          border: none;
        }
        .tag-symbol { background: rgba(24, 144, 255, 0.08); color: var(--primary-color, #1890ff); }
        .tag-tf { background: rgba(82, 196, 26, 0.08); color: #389e0d; }
        .tag-market--spot { background: rgba(19, 194, 194, 0.1); color: #08979c; }
        .tag-market--swap { background: rgba(114, 46, 209, 0.1); color: #722ed1; }
        .tag-leverage { background: rgba(250, 140, 22, 0.12); color: #d46b08; }
        .tag-duration { background: rgba(47, 84, 235, 0.1); color: #2f54eb; }
        .positive { color: #52c41a; font-weight: 600; }
        .negative { color: #f5222d; font-weight: 600; }
      }
      &__meta-sep { color: rgba(0, 0, 0, 0.25); }
      &__chart {
        width: 100%;
        height: 220px;
      }
      &__hint {
        margin-top: 4px;
        font-size: 11px;
        color: rgba(0, 0, 0, 0.4);
        line-height: 1.6;
      }
    }
  }

  .detail-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-top: 1px solid #f0f0f0;
    background: #fafafa;

    .price-info {
      .free-badge {
        font-size: 20px;
        font-weight: 600;
        color: #52c41a;
      }

      .price-badge {
        font-size: 20px;
        font-weight: 600;
        color: #f5222d;
      }
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      align-items: center;

      .update-tag {
        margin-left: 6px;
        margin-right: 0;
        font-size: 11px;
        line-height: 18px;
        padding: 0 6px;
      }

      ::v-deep .ant-badge {
        display: inline-block;
      }
    }
  }
}

// Styles for the new "your purchase price" footer line.
// Placed inside the scoped block because the elements live inside the
// modal body (which Ant *does* keep within the component scope for
// content; only the outer wrapper is portaled).
.indicator-detail-modal {
  .detail-footer {
    .price-info {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .price-line {
        display: flex;
        align-items: baseline;
        gap: 8px;

        &__label {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.45);
        }
      }

      .price-line--primary .price-badge--paid {
        font-size: 20px;
        font-weight: 600;
        color: #f5222d;
      }

      .price-line--secondary .price-current-aside {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.45);
        text-decoration: line-through;
      }
    }
  }
}

// Dark theme: scoped overrides beat the light-theme rules above because
// `.is-dark` adds an extra class on the same [data-v] subtree.
.detail-container.is-dark {
  .detail-body {
    background: #1a1a1a;

    .section h3 {
      color: rgba(255, 255, 255, 0.88);
      border-color: #303030;
    }

    .description {
      color: rgba(255, 255, 255, 0.72);
    }

    .performance-grid .perf-item {
      background: #262626;

      .perf-label {
        color: rgba(255, 255, 255, 0.55);

        .anticon {
          color: rgba(255, 255, 255, 0.35);
        }

        .src-tag {
          &--bt {
            background: rgba(24, 144, 255, 0.16);
            color: #69c0ff;
          }

          &--live {
            background: rgba(82, 196, 26, 0.16);
            color: #95de64;
          }
        }
      }

      .perf-value {
        color: rgba(255, 255, 255, 0.88);

        .perf-unit {
          color: rgba(255, 255, 255, 0.45);
        }
      }

      &--score {
        background: linear-gradient(135deg, rgba(245, 175, 25, 0.18) 0%, rgba(241, 39, 17, 0.12) 100%);

        .perf-value {
          color: #ffa940;
        }
      }
    }

    .applicable-row {
      &__label {
        color: rgba(255, 255, 255, 0.65);
      }

      &__empty {
        color: rgba(255, 255, 255, 0.3);
      }

      &__tags {
        .tag-symbol {
          background: rgba(24, 144, 255, 0.16);
          color: #69c0ff;
        }

        .tag-tf {
          background: rgba(82, 196, 26, 0.16);
          color: #95de64;
        }
      }
    }

    .equity-card {
      background: #262626;
      border-color: #303030;

      &__title {
        color: rgba(255, 255, 255, 0.88);
      }

      &__meta {
        .tag-symbol {
          background: rgba(24, 144, 255, 0.16);
          color: #69c0ff;
        }

        .tag-tf {
          background: rgba(82, 196, 26, 0.16);
          color: #95de64;
        }

        .positive {
          color: #95de64;
        }

        .negative {
          color: #ff7875;
        }
      }

      &__meta-sep {
        color: rgba(255, 255, 255, 0.25);
      }

      &__hint {
        color: rgba(255, 255, 255, 0.45);
      }
    }
  }

  .detail-footer {
    background: #1f1f1f;
    border-color: #303030;

    .price-info {
      .price-line__label {
        color: rgba(255, 255, 255, 0.45);
      }

      .price-line--secondary .price-current-aside {
        color: rgba(255, 255, 255, 0.35);
      }
    }
  }
}

</style>

<!--
  Non-scoped global style block.

  Ant Modal portals its DOM out to <body>, so the scoped rules above
  cannot reach the modal via class scoping alone (the modal wrapper
  has no `[data-v-xxxxx]` attribute, so scoped selectors silently miss).
  We give the modal a stable wrap class (`qd-indicator-detail-modal-wrap`)
  and style it globally. Pairing the wrap class with the `[--dark]`
  modifier lets us deliver the dark theme reliably without depending
  on a `body.dark` ancestor selector (the modal isn't a descendant of
  the dark-themed page container).
-->
<style lang="less">
.qd-indicator-detail-modal-wrap--dark {
  .ant-modal-content {
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.85);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }

  .ant-modal-close {
    color: rgba(255, 255, 255, 0.65);

    &:hover {
      color: rgba(255, 255, 255, 0.92);
    }
  }

  .detail-body {
    background: #1a1a1a;
    scrollbar-color: #434343 #1a1a1a;
    scrollbar-width: thin;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: #1a1a1a;
    }

    &::-webkit-scrollbar-thumb {
      background: #434343;
      border-radius: 4px;

      &:hover {
        background: #595959;
      }
    }

    .section h3 {
      color: rgba(255, 255, 255, 0.88);
      border-color: #303030;
    }

    .description {
      color: rgba(255, 255, 255, 0.65);
    }

    .performance-grid .perf-item {
      background: #262626 !important;

      .perf-label {
        color: rgba(255, 255, 255, 0.55);
        .anticon { color: rgba(255, 255, 255, 0.35); }
        .src-tag {
          &--bt { background: rgba(24, 144, 255, 0.16); color: #69c0ff; }
          &--live { background: rgba(82, 196, 26, 0.16); color: #95de64; }
        }
      }

      .perf-value {
        color: rgba(255, 255, 255, 0.88);
        .perf-unit { color: rgba(255, 255, 255, 0.45); }
      }

      &--score {
        background: linear-gradient(135deg, rgba(245, 175, 25, 0.18) 0%, rgba(241, 39, 17, 0.12) 100%) !important;
        .perf-value { color: #ffa940; }
      }
    }

    .applicable-row {
      &__label { color: rgba(255, 255, 255, 0.5); }
      &__tags {
        .tag-symbol { background: rgba(24, 144, 255, 0.16); color: #69c0ff; }
        .tag-tf { background: rgba(82, 196, 26, 0.16); color: #95de64; }
      }
      &__empty { color: rgba(255, 255, 255, 0.3); }
    }

    .equity-card {
      background: #262626 !important;
      border-color: #303030;

      &__title { color: rgba(255, 255, 255, 0.88); }
      &__meta {
        .tag-symbol { background: rgba(24, 144, 255, 0.16); color: #69c0ff; }
        .tag-tf { background: rgba(82, 196, 26, 0.16); color: #95de64; }
        .tag-market--spot { background: rgba(19, 194, 194, 0.18); color: #5cdbd3; }
        .tag-market--swap { background: rgba(114, 46, 209, 0.22); color: #b37feb; }
        .tag-leverage { background: rgba(250, 140, 22, 0.18); color: #ffc069; }
        .tag-duration { background: rgba(47, 84, 235, 0.2); color: #85a5ff; }
        .positive { color: #95de64; }
        .negative { color: #ff7875; }
      }
      &__meta-sep { color: rgba(255, 255, 255, 0.25); }
      &__hint { color: rgba(255, 255, 255, 0.4); }
    }

    .ant-alert-info {
      background: rgba(24, 144, 255, 0.12);
      border-color: rgba(24, 144, 255, 0.3);

      .ant-alert-icon {
        color: var(--primary-color-active, #177ddc);
      }

      .ant-alert-message {
        color: rgba(255, 255, 255, 0.88);
      }

      .ant-alert-description {
        color: rgba(255, 255, 255, 0.65);
      }
    }
  }

  .detail-footer {
    background: #1f1f1f !important;
    border-color: #303030;

    .price-info {
      .price-line__label { color: rgba(255, 255, 255, 0.45); }

      .price-badge { color: #ff7875; }
      .price-badge--paid { color: #ff7875; }
      .free-badge { color: #95de64; }

      .price-line--secondary .price-current-aside {
        color: rgba(255, 255, 255, 0.35);
      }
    }
  }

  .action-buttons {
    .ant-btn:not(.ant-btn-primary) {
      background: #262626;
      border-color: #434343;
      color: rgba(255, 255, 255, 0.72);

      &:hover,
      &:focus {
        background: #2f2f2f;
        border-color: #5a5a5a;
        color: rgba(255, 255, 255, 0.92);
      }
    }

    .update-tag {
      background: rgba(250, 140, 22, 0.15);
      border-color: rgba(250, 140, 22, 0.4);
      color: #fa8c16;
    }
  }

  .detail-header {
    .ant-statistic {
      .ant-statistic-content {
        color: rgba(255, 255, 255, 0.88);
      }

      .ant-statistic-title {
        color: rgba(255, 255, 255, 0.6);
      }
    }

    .rating-text {
      color: rgba(255, 255, 255, 0.72);
    }

    .publish-time {
      color: rgba(255, 255, 255, 0.72);
    }

    .author-name {
      color: rgba(255, 255, 255, 0.92);
    }
  }

  // Comments block in the modal: inherit dark colors.
  .comment-list {
    color: rgba(255, 255, 255, 0.85);

    .comment-item {
      border-color: #303030;

      .comment-content { color: rgba(255, 255, 255, 0.72); }
      .comment-meta,
      .comment-time { color: rgba(255, 255, 255, 0.45); }
    }

    .ant-input,
    .ant-input:hover,
    .ant-input:focus {
      background: #262626;
      border-color: #434343;
      color: rgba(255, 255, 255, 0.85);

      &::placeholder { color: rgba(255, 255, 255, 0.35); }
    }
  }
}
</style>
