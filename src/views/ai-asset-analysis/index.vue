<template>
  <div class="ai-asset-analysis-page" :class="{ 'theme-dark': isDarkTheme }">

    <!-- ======== AI Trading Radar ======== -->
    <div class="radar-section" v-if="showOpportunityRadar && opportunities.length > 0">
      <div class="radar-header">
        <div class="radar-header-left">
          <h2 class="radar-title">{{ $t('aiAssetAnalysis.opportunities.title') }}</h2>
          <p class="radar-subtitle">{{ $t('aiAssetAnalysis.opportunities.updateHint') }}</p>
        </div>
        <a-button class="radar-refresh-btn" size="small" :loading="oppLoading" @click="loadOpportunities(true)">
          <a-icon type="sync" /> {{ $t('common.refresh') || 'Refresh' }}
        </a-button>
      </div>
      <div
        class="radar-carousel"
        @touchstart="oppHover = true"
        @touchend="oppHover = false"
        @mouseenter="oppHover = true"
        @mouseleave="oppHover = false"
      >
        <div class="radar-track" :class="{ paused: oppHover }" :style="oppTrackStyle">
          <div
            class="radar-card"
            v-for="(opp, idx) in carouselItems"
            :key="'opp-' + idx"
            :class="[opp.impact]"
            @click="analyzeOpportunity(opp)"
          >
            <!-- Card top: symbol + market -->
            <div class="rc-head">
              <span class="rc-symbol">{{ opp.symbol }}</span>
              <span class="rc-market" :class="'rc-market-' + (opp.market || '').toLowerCase()">
                {{ getMarketLabel(opp.market) }}
              </span>
            </div>
            <!-- Metrics row -->
            <div class="rc-metrics">
              <div class="rc-metric">
                <span class="rc-metric-label">{{ ($i18n && $i18n.locale === 'zh-CN') ? '当前价格' : 'Price' }}</span>
                <span class="rc-metric-value">${{ formatOppPrice(opp.price) }}</span>
              </div>
              <div class="rc-metric">
                <span class="rc-metric-label">{{ ($i18n && $i18n.locale === 'zh-CN') ? '24h涨跌' : '24h Change' }}</span>
                <span class="rc-metric-value" :class="opp.change_24h >= 0 ? 'rc-up' : 'rc-down'">
                  {{ opp.change_24h >= 0 ? '+' : '' }}{{ (opp.change_24h || 0).toFixed(2) }}%
                </span>
              </div>
              <div class="rc-metric">
                <span class="rc-metric-label">{{ ($i18n && $i18n.locale === 'zh-CN') ? '信号' : 'Signal' }}</span>
                <span class="rc-metric-value rc-signal-val" :class="'rc-signal-' + (opp.signal || '')">
                  {{ getSignalLabel(opp.signal) }}
                </span>
              </div>
            </div>
            <!-- Card footer -->
            <div class="rc-footer">
              <span class="rc-reason">{{ getReasonText(opp) }}</span>
              <span class="rc-cta" v-if="opp.market === 'Crypto'" @click.stop="openQuickTradeFromOpp(opp)">
                <a-icon type="transaction" /> {{ $t('quickTrade.tradeNow') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======== Floating Quick Trade Button (only show when analyzing a Crypto symbol) ======== -->
    <a-tooltip :title="$t('quickTrade.openPanel')" placement="left">
      <div class="qt-floating-btn" @click="openQuickTradeFromCurrent" v-if="!showQuickTrade && currentAnalysisSymbol">
        <a-icon type="thunderbolt" theme="filled" />
      </div>
    </a-tooltip>

    <!-- ======== Quick Trade Panel ======== -->
    <quick-trade-panel
      :visible="showQuickTrade"
      :symbol="qtSymbol"
      :preset-side="qtSide"
      :preset-price="qtPrice"
      :source="qtSource"
      market-type="swap"
      @close="showQuickTrade = false"
      @order-success="onQuickTradeSuccess"
      @update:symbol="handleQuickTradeSymbolChange"
    />

    <!-- ======== Main Workspace ======== -->
    <a-card :bordered="false" class="workspace-card">
      <AnalysisView
        :embedded="true"
        :preset-symbol="presetSymbol"
        :auto-analyze-signal="autoAnalyzeSignal"
        @symbol-change="onAnalysisSymbolChange"
      />
    </a-card>

  </div>
</template>

<script>
import { mapState } from 'vuex'
import AnalysisView from '@/views/ai-analysis'
import { getTradingOpportunities } from '@/api/global-market'
import QuickTradePanel from '@/components/QuickTradePanel/QuickTradePanel'
import sessionCache from '@/utils/sessionCache'

// Opportunities don't change every second — the backend recalculates the
// signal scan periodically. Caching for 3 minutes makes page re-entry feel
// instant while still keeping the carousel reasonably fresh.
const OPP_CACHE_KEY = 'aiAsset.opportunities'
const OPP_CACHE_TTL_MS = 3 * 60 * 1000

export default {
  name: 'AIAssetAnalysis',
  components: {
    AnalysisView,
    QuickTradePanel
  },
  data () {
    return {
      showOpportunityRadar: false,
      // Opportunities (Carousel)
      opportunities: [],
      oppLoading: false,
      oppHover: false,
      // Props passed to AnalysisView
      presetSymbol: '',
      autoAnalyzeSignal: 0,
      // Quick Trade Panel
      showQuickTrade: false,
      qtSymbol: '',
      qtSide: '',
      qtPrice: 0,
      qtSource: 'ai_radar',
      // Current analysis symbol (from AnalysisView)
      currentAnalysisSymbol: '',
      currentAnalysisMarket: ''
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    // Duplicate items for seamless infinite carousel
    carouselItems () {
      if (this.opportunities.length === 0) return []
      // Duplicate the array so the CSS animation can loop seamlessly
      return [...this.opportunities, ...this.opportunities]
    },
    oppTrackStyle () {
      // Animation duration proportional to number of items (3s per card)
      const duration = this.opportunities.length * 3
      return {
        animationDuration: duration + 's'
      }
    }
  },
  created () {
    // Render cached opportunities first (if any) so the carousel shows up
    // immediately; then kick off a fresh fetch only when the cache is stale
    // or missing. Re-entering the page within the TTL window therefore
    // produces zero network round-trips for this section.
    if (this.showOpportunityRadar) {
      const cached = sessionCache.read(OPP_CACHE_KEY)
      if (Array.isArray(cached) && cached.length > 0) {
        this.opportunities = cached
      }
      if (!sessionCache.isFresh(OPP_CACHE_KEY)) {
        this.loadOpportunities()
      }
    }
  },
  activated () {
    // keep-alive re-entry: only refresh when the cache has aged past its TTL.
    // This is the "user came back after a while" path — they want fresh
    // signals but we don't want to spam the backend if they just bounced.
    if (this.showOpportunityRadar && !sessionCache.isFresh(OPP_CACHE_KEY)) {
      this.loadOpportunities()
    }
  },
  methods: {
    // ==================== Trading Opportunities (Carousel) ====================
    async loadOpportunities (force = false) {
      // When force=true we always refetch; otherwise honour the cache so
      // accidental double-invocations (e.g. created + activated firing on
      // first mount) don't multiply the upstream load.
      if (!force && sessionCache.isFresh(OPP_CACHE_KEY) && this.opportunities.length > 0) {
        return
      }
      this.oppLoading = true
      try {
        const params = force ? { force: true } : {}
        const res = await getTradingOpportunities(params)
        if (res && res.code === 1 && Array.isArray(res.data)) {
          const next = res.data.slice(0, 20)
          this.opportunities = next
          sessionCache.write(OPP_CACHE_KEY, next, OPP_CACHE_TTL_MS)
        }
      } catch (e) {
        console.warn('Load opportunities failed:', e)
      } finally {
        this.oppLoading = false
      }
    },
    getSignalColor (signal) {
      const map = {
        overbought: 'volcano',
        oversold: 'green',
        bullish_momentum: 'cyan',
        bearish_momentum: 'red'
      }
      return map[signal] || 'default'
    },
    getSignalLabel (signal) {
      const key = `aiAssetAnalysis.opportunities.signal.${signal}`
      const translated = this.$t(key)
      // If i18n returns the key itself, fall back to the raw signal name
      return translated !== key ? translated : signal
    },
    getMarketTagColor (market) {
      const colors = {
        Crypto: 'purple',
        USStock: 'green',
        CNStock: 'blue',
        HKStock: 'geekblue',
        Forex: 'gold'
      }
      return colors[market] || 'default'
    },
    getMarketLabel (market) {
      const key = `aiAssetAnalysis.opportunities.market.${market}`
      const translated = this.$t(key)
      return translated !== key ? translated : market
    },
    getReasonText (opp) {
      const market = (opp.market || 'Crypto').toLowerCase()
      const signal = opp.signal || ''
      const key = `aiAssetAnalysis.opportunities.reason.${market}.${signal}`
      const translated = this.$t(key)
      if (translated === key) {
        // i18n key not found, fall back to backend reason
        return opp.reason || ''
      }
      const change = Math.abs(opp.change_24h || 0).toFixed(1)
      const change7d = Math.abs(opp.change_7d || 0).toFixed(1)
      return translated.replace('{change}', change).replace('{change7d}', change7d)
    },
    formatOppPrice (price) {
      if (!price) return '--'
      if (price >= 10000) return (price / 1000).toFixed(1) + 'K'
      if (price >= 1) return price.toFixed(2)
      return price.toFixed(4)
    },
    analyzeOpportunity (opp) {
      const market = opp.market || 'Crypto'
      this.presetSymbol = `${market}:${opp.symbol}`
      this.$nextTick(() => {
        this.autoAnalyzeSignal++
      })
    },
    // ==================== Quick Trade ====================
    onAnalysisSymbolChange (value) {
      // value format: "Crypto:BTC/USDT"
      if (!value) {
        this.currentAnalysisSymbol = ''
        this.currentAnalysisMarket = ''
        return
      }
      const parts = value.split(':')
      const market = parts.length > 1 ? parts[0] : 'Crypto'
      const symbol = parts.length > 1 ? parts[1] : parts[0]
      this.currentAnalysisMarket = market
      // Only allow Quick Trade for Crypto
      if (market === 'Crypto') {
        this.currentAnalysisSymbol = symbol
      } else {
        this.currentAnalysisSymbol = ''
      }
    },
    openQuickTradeFromCurrent () {
      if (!this.currentAnalysisSymbol) return
      this.qtSymbol = this.currentAnalysisSymbol
      this.qtSide = ''
      this.qtPrice = 0
      this.qtSource = 'ai_analysis'
      this.showQuickTrade = true
    },
    openQuickTradeFromOpp (opp) {
      // Quick Trade only supports Crypto
      if (opp.market !== 'Crypto') return
      this.qtSymbol = opp.symbol || ''
      const signal = (opp.signal || '').toLowerCase()
      // Map opp signals to buy/sell
      if (signal.includes('oversold') || signal.includes('bullish')) {
        this.qtSide = 'buy'
      } else if (signal.includes('overbought') || signal.includes('bearish')) {
        this.qtSide = 'sell'
      } else {
        this.qtSide = ''
      }
      this.qtPrice = opp.price || 0
      this.qtSource = 'ai_radar'
      this.showQuickTrade = true
    },
    onQuickTradeSuccess () {
      this.$message.success(this.$t('quickTrade.orderSuccess'))
    },
    handleQuickTradeSymbolChange (newSymbol) {
      if (newSymbol) {
        this.qtSymbol = newSymbol
      }
    }
  }
}
</script>

<style lang="less" scoped>
.ai-asset-analysis-page {
  --qd-accent: var(--primary-color, #1677ff);
  --qd-accent-soft: color-mix(in srgb, var(--qd-accent) 10%, #ffffff);
  --qd-accent-weak: color-mix(in srgb, var(--qd-accent) 8%, transparent);
  --qd-accent-border: color-mix(in srgb, var(--qd-accent) 42%, transparent);
  --qd-accent-ring: color-mix(in srgb, var(--qd-accent) 18%, transparent);
  padding: 6px 8px;
  min-height: calc(100vh - 76px);
  background: #f0f2f5;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;

  /* ===== Radar Section ===== */
  .radar-section {
    margin-bottom: 20px;

    .radar-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 14px;

      .radar-header-left {
        .radar-title {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.2px;
        }
        .radar-subtitle {
          margin: 2px 0 0;
          font-size: 12px;
          color: #999;
        }
      }

      .radar-refresh-btn {
        border-radius: 8px;
        border: 1px solid #e0e0e0;
        background: #fff;
        color: #666;
        font-size: 12px;
        font-weight: 500;
        &:hover { border-color: var(--qd-accent); color: var(--qd-accent); }
      }
    }

    .radar-carousel {
      overflow: hidden;
      position: relative;
      border-radius: 12px;
      padding: 2px 0;

      &::before,
      &::after {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        width: 50px;
        z-index: 2;
        pointer-events: none;
      }
      &::before { left: 0; background: linear-gradient(to right, #f0f2f5, transparent); }
      &::after  { right: 0; background: linear-gradient(to left, #f0f2f5, transparent); }
    }

    .radar-track {
      display: flex;
      gap: 12px;
      animation: radar-scroll 60s linear infinite;
      width: max-content;
      padding: 4px 0;
      &.paused { animation-play-state: paused; }
    }

    @keyframes radar-scroll {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    /* ----- Card (Light / default) ----- */
    .radar-card {
      width: 250px;
      background: #ffffff;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      flex-shrink: 0;
      border: 1px solid #eaeaea;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 12px;
        opacity: 0;
        transition: opacity 0.3s;
        background: linear-gradient(135deg, var(--qd-accent-weak), color-mix(in srgb, var(--qd-accent) 3%, transparent));
      }

      &:hover {
        transform: translateY(-2px);
        border-color: var(--qd-accent-border);
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--qd-accent-weak);
        &::before { opacity: 1; }
      }

      .rc-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        gap: 8px;
      }

      .rc-symbol {
        font-weight: 800;
        font-size: 15px;
        color: #111;
        letter-spacing: -0.2px;
      }

      .rc-market {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        padding: 2px 7px;
        border-radius: 5px;
        flex-shrink: 0;
        background: #f5f5f5;
        color: #888;

        &.rc-market-crypto   { color: #7c3aed; background: rgba(124, 58, 237, 0.08); }
        &.rc-market-usstock  { color: #16a34a; background: rgba(22, 163, 74, 0.08); }
        &.rc-market-forex    { color: #d97706; background: rgba(217, 119, 6, 0.08); }
      }

      .rc-metrics {
        display: flex;
        gap: 4px;
        margin-bottom: 12px;
      }

      .rc-metric {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 7px;
        border-radius: 8px;
        background: #fafafa;

        .rc-metric-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: #999;
        }

        .rc-metric-value {
          font-size: 13px;
          font-weight: 700;
          color: #222;

          &.rc-up   { color: #16a34a; }
          &.rc-down { color: #dc2626; }

          &.rc-signal-val { font-size: 11px; font-weight: 600; }
          &.rc-signal-bullish_momentum { color: #0891b2; }
          &.rc-signal-overbought       { color: #d97706; }
          &.rc-signal-oversold         { color: #16a34a; }
          &.rc-signal-bearish_momentum { color: #dc2626; }
        }
      }

      .rc-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .rc-reason {
        font-size: 11px;
        color: #999;
        line-height: 1.4;
        flex: 1;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .rc-cta {
        font-size: 11px;
        font-weight: 700;
        color: #fff;
        background: linear-gradient(135deg, var(--qd-accent), color-mix(in srgb, var(--qd-accent) 78%, #000000));
        padding: 4px 12px;
        border-radius: 8px;
        white-space: nowrap;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
        &:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 12px var(--qd-accent-ring);
        }
      }
    }
  }

  /* ===== Floating QT Button ===== */
  .qt-floating-btn {
    position: fixed;
    right: 24px;
    bottom: 80px;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--qd-accent), color-mix(in srgb, var(--qd-accent) 78%, #000000));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    cursor: pointer;
    box-shadow: 0 4px 20px var(--qd-accent-ring);
    z-index: 1000;
    transition: all 0.3s;
    animation: qt-float-pulse 2.5s ease-in-out infinite;
    &:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px color-mix(in srgb, var(--qd-accent) 32%, transparent);
    }
  }
  @keyframes qt-float-pulse {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  /* ===== Workspace Card ===== */
  .workspace-card {
    border-radius: 14px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    border: 1px solid #e8e8e8;
    overflow: hidden;

    ::v-deep .ant-card-body { padding: 0; }

    ::v-deep .ai-analysis-container.embedded,
    ::v-deep .portfolio-container.embedded {
      border-radius: 0;
      overflow: hidden;
    }
  }

  /* ===== Dark Theme ===== */
  &.theme-dark {
    background: #141414;
    --qd-accent-soft: color-mix(in srgb, var(--qd-accent) 16%, transparent);
    --qd-accent-weak: color-mix(in srgb, var(--qd-accent) 10%, transparent);
    --qd-accent-border: color-mix(in srgb, var(--qd-accent) 46%, transparent);
    --qd-accent-ring: color-mix(in srgb, var(--qd-accent) 22%, transparent);

    .radar-section {
      .radar-header {
        .radar-title { color: #e8e8e8; }
        .radar-subtitle { color: #666; }
      }
      .radar-refresh-btn {
        background: #1c1c1c;
        border-color: #2a2a2a;
        color: #999;
        &:hover { border-color: var(--qd-accent); color: var(--qd-accent); }
      }
      .radar-carousel {
        &::before { background: linear-gradient(to right, #141414, transparent); }
        &::after  { background: linear-gradient(to left, #141414, transparent); }
      }

      .radar-card {
        background: #1a1a1c;
        border-color: rgba(255, 255, 255, 0.06);

        &::before {
          background: linear-gradient(135deg, var(--qd-accent-weak), color-mix(in srgb, var(--qd-accent) 4%, transparent));
        }

        &:hover {
          border-color: var(--qd-accent-border);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--qd-accent-weak);
        }

        .rc-symbol { color: #f0f0f0; }

        .rc-market {
          background: rgba(255, 255, 255, 0.06);
          color: #888;
          &.rc-market-crypto   { color: #a78bfa; background: rgba(167, 139, 250, 0.12); }
          &.rc-market-usstock  { color: #4ade80; background: rgba(74, 222, 128, 0.10); }
          &.rc-market-forex    { color: #fbbf24; background: rgba(251, 191, 36, 0.10); }
        }

        .rc-metric {
          background: rgba(255, 255, 255, 0.03);
          .rc-metric-label { color: #666; }
          .rc-metric-value {
            color: #ddd;
            &.rc-up   { color: #4ade80; }
            &.rc-down { color: #f87171; }
            &.rc-signal-bullish_momentum { color: #22d3ee; }
            &.rc-signal-overbought       { color: #fbbf24; }
            &.rc-signal-oversold         { color: #4ade80; }
            &.rc-signal-bearish_momentum { color: #f87171; }
          }
        }

        .rc-reason { color: #555; }
        .rc-cta { color: #fff; }
      }
    }

    .workspace-card {
      background: #1c1c1c;
      border-color: #2a2a2a;
    }
  }
}

@media (max-width: 768px) {
  .ai-asset-analysis-page {
    padding: 5px;
    min-height: auto;

    .radar-section {
      margin-bottom: 10px;

      .radar-header {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;

        .radar-header-left {
          .radar-title { font-size: 15px; }
          .radar-subtitle { font-size: 11px; }
        }

        .radar-refresh-btn {
          align-self: flex-end;
        }
      }

      .radar-carousel {
        &::before,
        &::after {
          width: 28px;
        }
      }

      .radar-card {
        width: 210px;
        padding: 12px;

        .rc-symbol { font-size: 14px; }
        .rc-metric { padding: 6px; }
      }
    }

    .qt-floating-btn {
      right: ~"max(16px, env(safe-area-inset-right, 0px))";
      bottom: ~"max(80px, calc(52px + env(safe-area-inset-bottom, 0px)))";
      width: 48px;
      height: 48px;
      font-size: 22px;
    }

    .workspace-card {
      border-radius: 10px;
    }
  }
}

@media (max-width: 480px) {
  .ai-asset-analysis-page {
    padding: 4px;

    .radar-section .radar-card {
      width: 188px;
      padding: 10px;

      .rc-metrics { gap: 3px; }
      .rc-metric .rc-metric-value { font-size: 12px; }
    }

    .workspace-card {
      border-radius: 8px;
    }
  }
}
</style>
