<template>
  <a-card
    hoverable
    class="indicator-card"
    :body-style="{ padding: '12px' }"
    @click="$emit('click', indicator)"
  >
    <div class="card-cover" :style="coverStyle">
      <img
        v-if="indicator.preview_image && !imageError"
        :src="indicator.preview_image"
        :alt="indicator.name"
        @error="handleImageError"
      />
      <div v-else class="default-cover" :style="{ background: coverGradient }">
        <span class="cover-title">{{ indicatorInitials }}</span>
        <span class="cover-subtitle">{{ indicator.name }}</span>
      </div>
      <div class="price-tag" :class="isPaid ? 'paid' : 'free'">
        {{ isPaid ? `${indicator.price} ${$t('community.credits')}` : $t('community.free') }}
      </div>
      <div v-if="indicator.vip_free" class="vip-free-tag">
        {{ $t('community.vipFree') }}
      </div>
      <div v-if="indicator.is_own" class="own-tag">
        {{ $t('community.myIndicator') }}
      </div>
      <div v-else-if="indicator.is_purchased" class="purchased-tag">
        <a-icon type="check-circle" /> {{ $t('community.purchased') }}
      </div>

      <a-tooltip v-if="hasScore" :title="scoreTooltip">
        <div class="score-badge" :class="scoreBadgeClass">
          <a-icon type="trophy" theme="filled" />
          <span class="score-num">{{ scoreLabel }}</span>
        </div>
      </a-tooltip>
    </div>

    <div class="card-content">
      <h3 class="card-title" :title="indicator.name">{{ indicator.name }}</h3>
      <p class="card-desc">{{ indicator.description || $t('community.noDescription') }}</p>

      <!--
        Backtest KPI strip: return / sharpe / drawdown. Numbers come from
        the median across all this indicator's successful backtests, so
        a single lucky run can't game the card. ``hasKpi`` (any of the
        three is non-zero OR sample_size > 0) gates the whole strip — we
        don't want to show "+0.00% / 0.00 / -0.00%" on indicators that
        nobody's backtested yet, that just looks broken.
      -->
      <div v-if="hasKpi" class="card-kpi">
        <div class="kpi-cell">
          <div class="kpi-label">{{ $t('community.totalReturn') }}</div>
          <div class="kpi-value" :class="returnToneClass">{{ formatPercent(indicator.total_return) }}</div>
        </div>
        <div class="kpi-cell">
          <div class="kpi-label">{{ $t('community.sharpe') }}</div>
          <div class="kpi-value" :class="sharpeToneClass">{{ formatNumber(indicator.sharpe, 2) }}</div>
        </div>
        <div class="kpi-cell">
          <div class="kpi-label">{{ $t('community.maxDrawdown') }}</div>
          <div class="kpi-value kpi-dd">{{ formatPercent(indicator.max_drawdown) }}</div>
        </div>
      </div>

      <overfit-risk-gauge v-if="hasKpi" :indicator="indicator" />

      <!--
        "Applicable" range tags: distilled from the symbols/timeframes
        the author has successfully backtested. We cap at 2 visible
        entries each and roll the rest into a "+N" indicator to keep
        cards from blowing up vertically.
      -->
      <div v-if="hasApplicable" class="card-tags">
        <a-tag v-for="sym in visibleSymbols" :key="`s-${sym}`" class="tag-symbol">{{ sym }}</a-tag>
        <a-tag v-if="extraSymbolCount > 0" class="tag-extra">+{{ extraSymbolCount }}</a-tag>
        <a-tag v-for="tf in visibleTimeframes" :key="`t-${tf}`" class="tag-tf">{{ tf }}</a-tag>
        <a-tag v-if="extraTimeframeCount > 0" class="tag-extra">+{{ extraTimeframeCount }}</a-tag>
      </div>

      <div class="card-author">
        <a-avatar :src="indicator.author.avatar" :size="24" />
        <span class="author-name">{{ indicator.author.nickname || indicator.author.username }}</span>
      </div>

      <div class="card-stats">
        <span class="stat-item">
          <a-icon type="download" />
          {{ indicator.purchase_count || 0 }}
        </span>
        <span class="stat-item">
          <a-icon type="star" theme="filled" :style="{ color: '#faad14' }" />
          {{ formatRating(indicator.avg_rating) }}
        </span>
        <span class="stat-item">
          <a-icon type="eye" />
          {{ indicator.view_count || 0 }}
        </span>
      </div>
    </div>
  </a-card>
</template>

<script>
import OverfitRiskGauge from './OverfitRiskGauge.vue'

const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  'linear-gradient(135deg, #9890e3 0%, #b1f4cf 100%)',
  'linear-gradient(135deg, #ebc0fd 0%, #d9ded8 100%)',
  'linear-gradient(135deg, #f6d365 0%, #fda085 100%)'
]

export default {
  name: 'IndicatorCard',
  components: { OverfitRiskGauge },
  props: {
    indicator: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      imageError: false
    }
  },
  computed: {
    isPaid () {
      return this.indicator.pricing_type !== 'free' && this.indicator.price > 0
    },
    coverGradient () {
      const index = (this.indicator.id || 0) % GRADIENT_PRESETS.length
      return GRADIENT_PRESETS[index]
    },
    indicatorInitials () {
      const name = this.indicator.name || 'I'
      if (/[\u4e00-\u9fa5]/.test(name)) {
        return name.slice(0, 2)
      }
      const words = name.split(/\s+/)
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      }
      return name.slice(0, 2).toUpperCase()
    },
    coverStyle () {
      return {
        background: (!this.indicator.preview_image || this.imageError) ? this.coverGradient : '#f5f5f5'
      }
    },
    // === Score badge ===
    scoreNumber () {
      const v = parseFloat(this.indicator.score)
      return isNaN(v) ? 0 : v
    },
    hasScore () {
      // Hide the trophy entirely on indicators with no scoring evidence.
      // sample_size also gates this because score=0 can happen with
      // sample_size>0 too (a truly bad indicator) — that case still
      // deserves the badge, it's just a low score.
      return (this.indicator.sample_size || 0) > 0
    },
    scoreLabel () {
      return this.scoreNumber.toFixed(0)
    },
    scoreBadgeClass () {
      // Thresholds match StrategyScoringService's scoring band roughly:
      // 80+ excellent, 60-80 solid, 40-60 mediocre, <40 weak.
      const s = this.scoreNumber
      if (s >= 80) return 'score-badge--top'
      if (s >= 60) return 'score-badge--good'
      if (s >= 40) return 'score-badge--mid'
      return 'score-badge--low'
    },
    scoreTooltip () {
      const n = this.indicator.sample_size || 0
      const base = this.$t('community.scoreTooltipBase')
      const sample = this.$t('community.scoreTooltipSample', { n })
      return `${base} ${sample}`
    },
    // === KPI strip ===
    hasKpi () {
      const i = this.indicator
      // We show the strip if there's at least one signal of real backtest
      // evidence. ``sample_size`` is the cleanest gate; the value
      // fallback covers older API responses that don't return it yet.
      return (i.sample_size || 0) > 0 ||
        parseFloat(i.total_return || 0) !== 0 ||
        parseFloat(i.sharpe || 0) !== 0 ||
        parseFloat(i.max_drawdown || 0) !== 0
    },
    returnToneClass () {
      const v = parseFloat(this.indicator.total_return) || 0
      if (v > 0) return 'kpi-pos'
      if (v < 0) return 'kpi-neg'
      return ''
    },
    sharpeToneClass () {
      const v = parseFloat(this.indicator.sharpe) || 0
      if (v >= 1) return 'kpi-pos'
      if (v < 0) return 'kpi-neg'
      return ''
    },
    // === Applicable range tags ===
    visibleSymbols () {
      return (this.indicator.applicable_symbols || []).slice(0, 2)
    },
    extraSymbolCount () {
      return Math.max(0, (this.indicator.applicable_symbols || []).length - 2)
    },
    visibleTimeframes () {
      return (this.indicator.applicable_timeframes || []).slice(0, 2)
    },
    extraTimeframeCount () {
      return Math.max(0, (this.indicator.applicable_timeframes || []).length - 2)
    },
    hasApplicable () {
      return (this.indicator.applicable_symbols || []).length > 0 ||
        (this.indicator.applicable_timeframes || []).length > 0
    }
  },
  methods: {
    formatRating (rating) {
      const r = parseFloat(rating) || 0
      return r > 0 ? r.toFixed(1) : '-'
    },
    formatNumber (val, digits) {
      const v = parseFloat(val)
      if (isNaN(v)) return '—'
      return v.toFixed(digits == null ? 2 : digits)
    },
    // Percent values arrive from the backend already in 0..100 scale (e.g.
    // 12.5 means +12.5%). max_drawdown is negative by convention so we
    // don't need to flip it.
    formatPercent (val) {
      const v = parseFloat(val)
      if (isNaN(v)) return '—'
      const sign = v > 0 ? '+' : ''
      return `${sign}${v.toFixed(2)}%`
    },
    handleImageError () {
      this.imageError = true
    }
  }
}
</script>

<style lang="less" scoped>
.indicator-card {
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  .card-cover {
    position: relative;
    width: 100%;
    height: 140px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .default-cover {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: -20%;
        right: -20%;
        width: 80%;
        height: 80%;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
      }

      &::after {
        content: '';
        position: absolute;
        bottom: -30%;
        left: -20%;
        width: 60%;
        height: 60%;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
      }

      .cover-title {
        font-size: 36px;
        font-weight: 700;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 1;
        letter-spacing: 2px;
      }

      .cover-subtitle {
        font-size: 12px;
        margin-top: 8px;
        opacity: 0.9;
        max-width: 80%;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        z-index: 1;
      }
    }

    .price-tag {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      z-index: 2;

      &.free {
        background: #52c41a;
        color: #fff;
      }

      &.paid {
        background: linear-gradient(135deg, #f5af19 0%, #f12711 100%);
        color: #fff;
      }
    }

    .own-tag,
    .purchased-tag {
      position: absolute;
      bottom: 8px;
      left: 8px;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      z-index: 2;
    }

    .purchased-tag {
      background: rgba(82, 196, 26, 0.85);
    }

    // Composite-score trophy badge (top-left of cover).
    // Position next to vip-free-tag (which also sits top-left); when both
    // exist the vip-free tag wins the corner and the score badge slides
    // down. Use a tiered colour so the eye can scan the leaderboard.
    .score-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      padding: 3px 8px 3px 6px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 4px;
      z-index: 3;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
      backdrop-filter: blur(4px);

      .anticon { font-size: 12px; }
      .score-num { letter-spacing: 0.5px; }

      &--top { background: linear-gradient(135deg, #f5af19, #f12711); }
      &--good { background: linear-gradient(135deg, #36d1dc, #5b86e5); }
      &--mid { background: linear-gradient(135deg, #8e8e8e, #b4b4b4); }
      &--low { background: rgba(0, 0, 0, 0.55); }
    }
  }

  .vip-free-tag {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    background: rgba(250, 173, 20, 0.92);
    color: #1f1f1f;
  }

  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 4px 0;

    .card-title {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 6px 0;
      color: rgba(0, 0, 0, 0.85);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-desc {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
      margin: 0 0 8px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      line-height: 1.5;
      min-height: 36px;
    }

    // KPI strip (return / sharpe / drawdown). Three equal-width columns
    // with light background so it visually reads as one chunk rather
    // than three loose numbers next to the description.
    .card-kpi {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 4px;
      padding: 6px 8px;
      margin: 4px 0 8px;
      background: rgba(0, 0, 0, 0.025);
      border-radius: 6px;

      .kpi-cell {
        text-align: center;
        min-width: 0;
      }
      .kpi-label {
        font-size: 10px;
        color: rgba(0, 0, 0, 0.4);
        line-height: 1.4;
      }
      .kpi-value {
        font-size: 12px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.75);
        line-height: 1.4;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        &.kpi-pos { color: #389e0d; }
        &.kpi-neg, &.kpi-dd { color: #cf1322; }
      }
    }

    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 8px;

      .ant-tag {
        margin: 0;
        font-size: 11px;
        line-height: 18px;
        padding: 0 6px;
        border: none;
      }
      .tag-symbol { background: rgba(24, 144, 255, 0.08); color: var(--primary-color, #1890ff); }
      .tag-tf { background: rgba(82, 196, 26, 0.08); color: #389e0d; }
      .tag-extra {
        background: rgba(0, 0, 0, 0.04);
        color: rgba(0, 0, 0, 0.45);
        font-weight: 600;
      }
    }

    .card-author {
      display: flex;
      align-items: center;
      margin-bottom: 8px;

      .author-name {
        margin-left: 8px;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.65);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .card-stats {
      display: flex;
      gap: 12px;
      margin-top: auto;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.45);

        .anticon {
          font-size: 14px;
        }
      }
    }
  }
}

.theme-dark .indicator-card,
.dark-theme .indicator-card,
[data-theme='dark'] .indicator-card {
  background: #1f1f1f;
  border-color: #303030;

  .card-content {
    .card-title {
      color: rgba(255, 255, 255, 0.85);
    }

    .card-desc {
      color: rgba(255, 255, 255, 0.45);
    }

    .card-author .author-name {
      color: rgba(255, 255, 255, 0.65);
    }

    .card-stats .stat-item {
      color: rgba(255, 255, 255, 0.45);
    }

    .card-kpi {
      background: rgba(255, 255, 255, 0.04);
      .kpi-label { color: rgba(255, 255, 255, 0.4); }
      .kpi-value {
        color: rgba(255, 255, 255, 0.78);
        &.kpi-pos { color: #95de64; }
        &.kpi-neg, &.kpi-dd { color: #ff7875; }
      }
    }

    .card-tags {
      .tag-symbol { background: rgba(24, 144, 255, 0.16); color: #69c0ff; }
      .tag-tf { background: rgba(82, 196, 26, 0.16); color: #95de64; }
      .tag-extra { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.45); }
    }
  }
}
</style>
