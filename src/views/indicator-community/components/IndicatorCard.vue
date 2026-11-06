<template>
  <a-card
    hoverable
    class="indicator-card"
    :class="{ 'indicator-card--strategy': isStrategyAsset }"
    :body-style="{ padding: '12px' }"
    @click="$emit('click', indicator)"
  >
    <div v-if="!isStrategyAsset" class="card-cover">
      <img :src="previewImage" :alt="indicator.name" @error="handleImageError" />
      <div class="cover-badges">
        <div class="cover-badges__left">
          <a-tooltip v-if="isStrategyAsset && hasScore" :title="scoreTooltip">
            <div class="score-badge" :class="scoreBadgeClass">
              <a-icon type="trophy" theme="filled" />
              <span class="score-num">{{ scoreLabel }}</span>
            </div>
          </a-tooltip>
          <div v-else class="asset-type-badge">
            <a-icon :type="isStrategyAsset ? 'code-sandbox' : 'line-chart'" />
            <span>{{ isStrategyAsset ? $t('community.tabScriptTemplates') : $t('community.chartIndicator') }}</span>
          </div>
        </div>
        <div class="cover-badges__right">
          <div class="price-tag" :class="isPaid ? 'paid' : 'free'">
            {{ isPaid ? `${indicator.price} ${$t('community.credits')}` : $t('community.free') }}
          </div>
        </div>
      </div>
      <div v-if="indicator.is_own" class="own-tag">
        {{ $t('community.myIndicator') }}
      </div>
      <div v-else-if="indicator.is_purchased" class="purchased-tag">
        <a-icon type="check-circle" /> {{ $t('community.purchased') }}
      </div>
    </div>

    <div class="card-content">
      <div v-if="isStrategyAsset" class="strategy-card-head">
        <div class="strategy-card-title-row">
          <div class="strategy-card-title-copy">
            <h3 class="card-title" :title="indicator.name">{{ indicator.name }}</h3>
            <span v-if="indicator.vip_free" class="vip-free-tag">{{ $t('community.vipFree') }}</span>
          </div>
          <div class="strategy-card-badges">
            <a-tooltip v-if="hasScore" :title="scoreTooltip">
              <span class="strategy-score-badge" :class="scoreBadgeClass">
                <a-icon type="trophy" theme="filled" /> {{ scoreLabel }}
              </span>
            </a-tooltip>
            <span class="price-tag" :class="isPaid ? 'paid' : 'free'">
              {{ isPaid ? `${indicator.price} ${$t('community.credits')}` : $t('community.free') }}
            </span>
          </div>
        </div>
        <span v-if="indicator.is_own" class="strategy-ownership-tag">{{ $t('community.myStrategy') }}</span>
        <span v-else-if="indicator.is_purchased" class="strategy-ownership-tag strategy-ownership-tag--purchased">
          <a-icon type="check-circle" /> {{ $t('community.purchased') }}
        </span>
      </div>
      <div v-else class="indicator-card-title-row">
        <h3 class="card-title" :title="indicator.name">{{ indicator.name }}</h3>
        <span v-if="indicator.vip_free" class="vip-free-tag">{{ $t('community.vipFree') }}</span>
      </div>
      <p class="card-desc">{{ indicator.description || $t('community.noDescription') }}</p>
      <div v-if="isStrategyAsset && hasKpi" class="card-kpi">
        <div class="kpi-cell">
          <div class="kpi-label">{{ $t('community.totalReturn') }}</div>
          <div class="kpi-value" :class="returnToneClass">{{ formatPercent(indicator.total_return) }}</div>
        </div>
        <div class="kpi-cell">
          <div class="kpi-label" :title="$t('community.annualReturn')">{{ $t('community.annualReturn') }}</div>
          <div class="kpi-value" :class="annualReturnToneClass">{{ formatPercent(indicator.annual_return) }}</div>
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
      <div v-if="isStrategyAsset && strategyCardFacts.length" class="strategy-card-facts">
        <span v-for="fact in strategyCardFacts" :key="fact.key" :title="fact.label">
          <a-icon :type="fact.icon" />
          {{ fact.value }}
        </span>
      </div>
      <div v-else class="card-tags card-tags--indicator">
        <a-tag class="tag-visibility"><a-icon :type="codeHidden ? 'lock' : 'unlock'" /> {{ visibilityLabel }}</a-tag>
        <a-tag v-if="parameterCount > 0" class="tag-params"><a-icon type="sliders" /> {{ parameterChipLabel }}</a-tag>
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
import fallbackCover from '@/assets/marketplace/indicator-preview-default.svg'

export default {
  name: 'IndicatorCard',
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
    isStrategyAsset () {
      const assetType = String(this.indicator.asset_type || '').toLowerCase()
      return assetType === 'script_template' || assetType === 'script' || assetType === 'strategy'
    },
    strategyContract () {
      const contract = this.indicator.marketplace_contract || this.indicator.strategy_contract
      return contract && typeof contract === 'object' ? contract : {}
    },
    executionModeLabel () {
      const mode = this.strategyContract.execution_mode || this.indicator.execution_mode || 'bar'
      const key = `community.executionModeValue.${mode}`
      return this.$te(key) ? this.$t(key) : mode
    },
    executionFrequencyLabel () {
      return this.strategyContract.execution_frequency || this.indicator.execution_frequency || this.strategyContract.primary_frequency || '—'
    },
    confirmationFrequencyLabel () {
      const values = this.strategyContract.confirmation_frequencies || this.indicator.confirmation_frequencies || []
      return Array.isArray(values) && values.length ? values.join(' · ') : ''
    },
    bindingMode () {
      return this.indicator.binding_mode || this.strategyContract.binding_mode || 'unknown'
    },
    boundInstrumentLabel () {
      if (this.strategyContract.universe_reference) return this.strategyContract.universe_reference
      const values = this.strategyContract.bound_instruments || []
      if (!values.length) return this.$t(`community.binding.${this.bindingMode}`)
      return values.slice(0, 2).join(' · ') + (values.length > 2 ? ` +${values.length - 2}` : '')
    },
    testedInstrumentLabel () {
      const values = this.indicator.tested_instruments || this.indicator.applicable_symbols || []
      if (!values.length) return ''
      return values.slice(0, 2).join(' · ') + (values.length > 2 ? ` +${values.length - 2}` : '')
    },
    strategyCardFacts () {
      const facts = []
      const contract = this.strategyContract
      const boundValues = contract.bound_instruments || []
      const declaredInstruments = (contract.instruments || [])
        .map(item => item.symbol || item.instrument_id)
        .filter(Boolean)
      const instrument = contract.universe_reference ||
        (boundValues.length ? boundValues.slice(0, 2).join(' · ') + (boundValues.length > 2 ? ` +${boundValues.length - 2}` : '') : '') ||
        (declaredInstruments.length ? declaredInstruments.slice(0, 2).join(' · ') + (declaredInstruments.length > 2 ? ` +${declaredInstruments.length - 2}` : '') : '') ||
        this.testedInstrumentLabel
      if (instrument) {
        facts.push({ key: 'instrument', icon: 'global', label: this.$t('community.boundTo'), value: instrument })
      }

      const frequency = this.executionFrequencyLabel === '—' ? '' : this.executionFrequencyLabel
      const cadence = [this.executionModeLabel, frequency].filter(Boolean).join(' · ')
      if (cadence) {
        facts.push({ key: 'cadence', icon: 'clock-circle', label: this.$t('community.executionFrequency'), value: cadence })
      }
      if (this.confirmationFrequencyLabel) {
        facts.push({
          key: 'confirmation',
          icon: 'check-circle',
          label: this.$t('community.confirmationFrequencies'),
          value: this.confirmationFrequencyLabel
        })
      }
      return facts.slice(0, 3)
    },
    previewImage () {
      return this.indicator.preview_image && !this.imageError
        ? this.indicator.preview_image
        : fallbackCover
    },
    scoreNumber () {
      const v = parseFloat(this.indicator.score)
      return isNaN(v) ? 0 : v
    },
    hasScore () {
      return (this.indicator.sample_size || 0) > 0
    },
    scoreLabel () {
      return this.scoreNumber.toFixed(0)
    },
    scoreBadgeClass () {
      const s = this.scoreNumber
      if (s >= 80) return 'score-badge--top'
      if (s >= 60) return 'score-badge--good'
      if (s >= 40) return 'score-badge--mid'
      return 'score-badge--low'
    },
    scoreTooltip () {
      const n = this.indicator.sample_size || 0
      return `${this.$t('community.scoreTooltipBase')} ${this.$t('community.scoreTooltipSample', { n })}`
    },
    codeHidden () {
      return !!(this.indicator.code_hidden || this.indicator.codeHidden || this.indicator.is_encrypted)
    },
    visibilityLabel () {
      return this.codeHidden ? this.$t('community.codeHidden') : this.$t('community.codeVisible')
    },
    parameterCount () {
      const raw = this.indicator.param_count || this.indicator.parameter_count || this.indicator.params_count || 0
      const n = Number(raw)
      return Number.isFinite(n) && n > 0 ? n : 0
    },
    parameterChipLabel () {
      return this.parameterCount > 0
        ? this.$t('community.paramCount', { n: this.parameterCount })
        : this.$t('community.adjustableParams')
    },
    hasKpi () {
      const i = this.indicator
      return (i.sample_size || 0) > 0 ||
        parseFloat(i.total_return || 0) !== 0 ||
        parseFloat(i.annual_return || 0) !== 0 ||
        parseFloat(i.sharpe || 0) !== 0 ||
        parseFloat(i.max_drawdown || 0) !== 0
    },
    returnToneClass () {
      const v = parseFloat(this.indicator.total_return) || 0
      if (v > 0) return 'kpi-pos'
      if (v < 0) return 'kpi-neg'
      return ''
    },
    annualReturnToneClass () {
      const v = parseFloat(this.indicator.annual_return) || 0
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
      if (isNaN(v)) return '-'
      return v.toFixed(digits == null ? 2 : digits)
    },
    formatPercent (val) {
      const v = parseFloat(val)
      if (isNaN(v)) return '-'
      const sign = v > 0 ? '+' : ''
      return `${sign}${v.toFixed(2)}%`
    },
    handleImageError () {
      if (!this.imageError) this.imageError = true
    }
  }
}
</script>

<style lang="less" scoped>
.indicator-card {
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
  height: 100%;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 34%, rgba(15, 23, 42, 0.12));
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
  }

  .card-cover {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    height: auto;
    min-height: 0;
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

    .cover-badges {
      position: absolute;
      top: 8px;
      left: 8px;
      right: 8px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      pointer-events: none;
      z-index: 3;

      &__left,
      &__right {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        min-width: 0;
      }

      &__right {
        flex-direction: row;
        align-items: flex-end;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
    }

    .price-tag {
      display: inline-flex;
      align-items: center;
      max-width: 96px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: auto;

      &.free {
        background: #52c41a;
        color: #fff;
      }

      &.paid {
        background: var(--primary-color, #f25a2b);
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

    .asset-type-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 4px;
      max-width: 118px;
      background: rgba(0, 0, 0, 0.48);
      box-shadow: none;
      backdrop-filter: blur(4px);
      pointer-events: auto;

      .anticon { font-size: 12px; }
      span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .score-badge {
      padding: 3px 8px 3px 6px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 4px;
      box-shadow: none;
      backdrop-filter: blur(4px);
      pointer-events: auto;

      .anticon { font-size: 12px; }
      .score-num { letter-spacing: 0.5px; }

      &--top { background: #d97706; }
      &--good { background: #2563a6; }
      &--mid { background: #6b7280; }
      &--low { background: rgba(0, 0, 0, 0.55); }
    }

  }

  .vip-free-tag {
    display: inline-flex;
    align-items: center;
    max-width: 82px;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    background: rgba(250, 173, 20, 0.92);
    color: #1f1f1f;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: auto;
  }

  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 4px 0;

    .strategy-card-head {
      margin-bottom: 8px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .strategy-card-title-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;

      .card-title {
        margin: 1px 0 0;
        font-size: 16px;
        line-height: 1.35;
      }
    }

    .strategy-card-title-copy,
    .indicator-card-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;

      .card-title {
        min-width: 0;
        margin-bottom: 0;
      }

      .vip-free-tag {
        flex: 0 0 auto;
        padding: 3px 7px;
        font-size: 10px;
      }
    }

    .strategy-card-title-copy {
      flex: 1 1 auto;
    }

    .indicator-card-title-row {
      margin-bottom: 6px;
    }

    .strategy-card-badges {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 5px;
      flex-shrink: 0;
    }

    .strategy-score-badge,
    .price-tag,
    .strategy-ownership-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }

    .strategy-score-badge {
      color: #fff;
      &.score-badge--top { background: linear-gradient(135deg, #f5af19, #f12711); }
      &.score-badge--good { background: linear-gradient(135deg, #36d1dc, #5b86e5); }
      &.score-badge--mid { background: linear-gradient(135deg, #8e8e8e, #b4b4b4); }
      &.score-badge--low { background: rgba(0, 0, 0, 0.55); }
    }

    .price-tag {
      color: #fff;
      &.free { background: #52c41a; }
      &.paid { background: linear-gradient(135deg, #f5af19 0%, #f12711 100%); }
    }

    .strategy-ownership-tag {
      margin-top: 7px;
      color: rgba(0, 0, 0, 0.58);
      background: rgba(0, 0, 0, 0.05);

      &--purchased {
        color: #389e0d;
        background: rgba(82, 196, 26, 0.1);
      }
    }

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
      line-height: 1.55;
      min-height: 38px;
    }

    .visual-summary {
      padding: 8px;
      margin: 4px 0 8px;
      background: linear-gradient(135deg, rgba(24, 144, 255, 0.08), rgba(82, 196, 26, 0.08));
      border-radius: 6px;
      border: 1px solid rgba(24, 144, 255, 0.12);
    }

    .visual-summary__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
      color: rgba(0, 0, 0, 0.48);

      span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }

      strong {
        font-weight: 600;
        color: rgba(0, 0, 0, 0.78);
        white-space: nowrap;
      }
    }

    .visual-meter {
      display: grid;
      grid-template-columns: 1.25fr 0.9fr 0.7fr;
      gap: 3px;
      height: 6px;
      margin: 7px 0;

      &__bar {
        border-radius: 999px;
        opacity: 0.95;
        &--trend { background: #1890ff; }
        &--signal { background: #52c41a; }
        &--zone { background: #faad14; }
      }
    }

    .visual-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;

      span {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        max-width: 100%;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.62);
        color: rgba(0, 0, 0, 0.58);
        font-size: 10px;
        line-height: 16px;
      }
    }

    .card-kpi {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 4px;
      padding: 6px 4px;
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
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
        &.kpi-neg,
        &.kpi-dd { color: #cf1322; }
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
        border-radius: 4px;
      }
      .tag-symbol { background: rgba(24, 144, 255, 0.08); color: var(--primary-color, #1890ff); }
      .tag-tf { background: rgba(82, 196, 26, 0.08); color: #389e0d; }
      .tag-visibility { background: rgba(0, 0, 0, 0.045); color: rgba(0, 0, 0, 0.62); }
      .tag-params { background: rgba(114, 46, 209, 0.08); color: #722ed1; }
      .tag-extra {
        background: rgba(0, 0, 0, 0.04);
        color: rgba(0, 0, 0, 0.45);
        font-weight: 600;
      }
    }

    .strategy-card-facts {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px 14px;
      min-height: 20px;
      margin: 2px 0 12px;
      color: rgba(0, 0, 0, 0.48);
      font-size: 11px;

      span {
        display: inline-flex;
        align-items: center;
        min-width: 0;
        gap: 5px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .anticon {
        flex: 0 0 auto;
        color: var(--primary-color, #1890ff);
      }
    }

    .card-author {
      display: flex;
      align-items: center;
      margin-bottom: 10px;

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
        font-size: 11px;
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
    .strategy-card-head { border-bottom-color: rgba(255, 255, 255, 0.09); }
    .strategy-ownership-tag {
      color: rgba(255, 255, 255, 0.62);
      background: rgba(255, 255, 255, 0.07);
      &--purchased {
        color: #95de64;
        background: rgba(82, 196, 26, 0.14);
      }
    }

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

    .visual-summary {
      background: linear-gradient(135deg, rgba(24, 144, 255, 0.14), rgba(82, 196, 26, 0.12));
      border-color: rgba(255, 255, 255, 0.08);
    }

    .visual-summary__head {
      color: rgba(255, 255, 255, 0.46);

      strong {
        color: rgba(255, 255, 255, 0.78);
      }
    }

    .visual-chips span {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.56);
    }

    .card-kpi {
      background: rgba(255, 255, 255, 0.045);
      border: 1px solid rgba(255, 255, 255, 0.07);

      .kpi-label {
        color: rgba(255, 255, 255, 0.48);
      }

      .kpi-value {
        color: rgba(255, 255, 255, 0.82);

        &.kpi-pos { color: #52c41a; }
        &.kpi-neg,
        &.kpi-dd { color: #ff4d4f; }
      }
    }

    .card-tags {
      .tag-symbol { background: rgba(24, 144, 255, 0.16); color: #69c0ff; }
      .tag-tf { background: rgba(82, 196, 26, 0.16); color: #95de64; }
      .tag-visibility { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.68); }
      .tag-params { background: rgba(114, 46, 209, 0.18); color: #b37feb; }
      .tag-extra { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.45); }
    }
  }
}
</style>

<!-- The market card lives inside a themed page owned by the parent component.
     These selectors must remain unscoped so the ancestor theme class can match. -->
<style lang="less">
.theme-dark .indicator-card,
.dark-theme .indicator-card,
[data-theme='dark'] .indicator-card {
  background: #1f1f1f;
  border-color: #343434;

  .ant-card-body {
    background: #1f1f1f;
  }

  .card-content {
    .strategy-card-head { border-bottom-color: rgba(255, 255, 255, 0.09); }
    .strategy-ownership-tag {
      color: rgba(255, 255, 255, 0.62);
      background: rgba(255, 255, 255, 0.07);
      &--purchased {
        color: #95de64;
        background: rgba(82, 196, 26, 0.14);
      }
    }
    .card-title { color: rgba(255, 255, 255, 0.9); }
    .card-desc { color: rgba(255, 255, 255, 0.58); }
    .card-author .author-name { color: rgba(255, 255, 255, 0.76); }
    .card-stats .stat-item { color: rgba(255, 255, 255, 0.55); }

    .card-kpi {
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.055);

      .kpi-label { color: rgba(255, 255, 255, 0.56); }
      .kpi-value {
        color: rgba(255, 255, 255, 0.88);
        &.kpi-pos { color: #73d13d; }
        &.kpi-neg,
        &.kpi-dd { color: #ff7875; }
      }
    }

    .strategy-card-facts {
      color: rgba(255, 255, 255, 0.58);

      .anticon {
        color: var(--primary-color-hover, #69c0ff);
      }
    }

    .visual-summary {
      border-color: rgba(255, 255, 255, 0.09);
      background: linear-gradient(135deg, rgba(24, 144, 255, 0.14), rgba(82, 196, 26, 0.12));
    }

    .visual-summary__head {
      color: rgba(255, 255, 255, 0.56);
      strong { color: rgba(255, 255, 255, 0.82); }
    }

    .visual-chips span {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.65);
    }
  }
}
</style>
