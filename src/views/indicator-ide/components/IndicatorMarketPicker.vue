<template>
  <a-modal
    :visible="visible"
    :title="null"
    :footer="null"
    :width="860"
    :get-container="getContainer"
    :wrap-class-name="dark ? 'ide-market-picker-wrap ide-market-picker-wrap--dark' : 'ide-market-picker-wrap'"
    @cancel="$emit('close')"
  >
    <div class="ide-market-picker">
      <header class="ide-market-picker__header">
        <div class="ide-market-picker__heading">
          <span class="ide-market-picker__icon"><a-icon type="shop" /></span>
          <div>
            <h2>{{ pickerText.title }}</h2>
            <p>{{ pickerText.subtitle }}</p>
          </div>
        </div>
        <a-input-search
          v-model="keyword"
          :placeholder="$t('community.searchPlaceholder')"
          :enter-button="$t('community.applyFilters')"
          allow-clear
          class="ide-market-picker__search"
          @search="loadItems"
          @pressEnter="loadItems"
        />
      </header>

      <div class="ide-market-picker__summary">
        <span>{{ pickerText.resultCount }}</span>
        <a-radio-group
          v-if="isStrategyMode"
          v-model="strategyType"
          class="ide-market-picker__strategy-types"
          button-style="solid"
          size="small"
          @change="loadItems"
        >
          <a-radio-button value="cta">{{ $t('strategyIde.marketPicker.cta') }}</a-radio-button>
          <a-radio-button value="portfolio">{{ $t('strategyIde.marketPicker.portfolio') }}</a-radio-button>
        </a-radio-group>
        <span v-else class="ide-market-picker__indicator-only">
          <a-icon type="line-chart" />
          {{ $t('community.chartIndicator') }}
        </span>
      </div>

      <a-spin :spinning="loading">
        <div v-if="!loading && !items.length" class="ide-market-picker__empty">
          <a-empty :description="pickerText.empty" />
        </div>
        <div v-else class="ide-market-picker__list">
          <article
            v-for="item in items"
            :key="item.id"
            class="ide-market-picker-item"
            :class="{ 'ide-market-picker-item--strategy': isStrategyMode }"
          >
            <div class="ide-market-picker-item__cover" :style="coverStyle(item)">
              <img v-if="item.preview_image" :src="item.preview_image" :alt="item.name" />
              <span v-else>{{ initials(item.name) }}</span>
            </div>
            <div class="ide-market-picker-item__body">
              <div class="ide-market-picker-item__title-row">
                <h3>{{ item.name }}</h3>
                <a-tag v-if="isStrategyMode" color="blue">{{ strategyTypeLabel(item) }}</a-tag>
                <a-tag v-if="item.code_hidden || item.is_encrypted" color="gold">
                  <a-icon type="lock" /> {{ $t('community.codeHidden') }}
                </a-tag>
                <a-tag v-else color="green">
                  <a-icon type="unlock" /> {{ $t('community.codeVisible') }}
                </a-tag>
                <a-tag v-if="item.vip_free" color="gold" class="ide-market-picker-item__vip-free">
                  <a-icon type="crown" />
                  {{ $t('community.vipFree') }}
                </a-tag>
              </div>
              <p>{{ item.description || $t('community.noDescription') }}</p>
              <div v-if="isStrategyMode" class="ide-market-picker-item__performance">
                <template v-if="hasBacktestData(item)">
                  <div class="ide-market-picker-item__metric">
                    <span>{{ $t('community.totalReturn') }}</span>
                    <strong :class="metricTone(item.total_return)">{{ formatPercent(item.total_return, true) }}</strong>
                  </div>
                  <div class="ide-market-picker-item__metric">
                    <span>{{ $t('community.maxDrawdown') }}</span>
                    <strong class="negative">{{ formatDrawdown(item.max_drawdown) }}</strong>
                  </div>
                  <div class="ide-market-picker-item__metric">
                    <span>{{ $t('community.sharpe') }}</span>
                    <strong>{{ formatRatio(item.sharpe) }}</strong>
                  </div>
                  <div class="ide-market-picker-item__metric">
                    <span>{{ $t('community.winRate') }}</span>
                    <strong>{{ formatPercent(item.win_rate_backtest) }}</strong>
                  </div>
                </template>
                <div v-else class="ide-market-picker-item__no-performance">
                  <a-icon type="line-chart" />
                  {{ $t('strategyIde.marketPicker.noBacktestData') }}
                </div>
              </div>
              <div class="ide-market-picker-item__meta">
                <span><a-icon type="user" /> {{ authorName(item) }}</span>
                <span><a-icon type="star" theme="filled" /> {{ rating(item) }}</span>
                <span><a-icon type="download" /> {{ item.purchase_count || 0 }}</span>
                <span v-if="isStrategyMode && hasBacktestData(item)">
                  <a-icon type="database" />
                  {{ $t('strategyIde.marketPicker.samples', { count: item.sample_size }) }}
                </span>
              </div>
            </div>
            <div class="ide-market-picker-item__action">
              <div class="ide-market-picker-item__price" :class="{ free: isFree(item) }">
                {{ priceLabel(item) }}
              </div>
              <a-button
                :type="isAcquired(item) ? 'default' : 'primary'"
                :disabled="isAcquired(item) && !isStrategyMode"
                :loading="!!purchasing[item.id]"
                @click="acquire(item)"
              >
                <a-icon :type="isAcquired(item) ? 'check' : isFree(item) ? 'plus' : 'shopping-cart'" />
                {{ actionLabel(item) }}
              </a-button>
            </div>
          </article>
        </div>
      </a-spin>
    </div>
  </a-modal>
</template>

<script>
import request from '@/utils/request'

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #14291c 0%, #1f6b3f 100%)',
  'linear-gradient(135deg, #1b2440 0%, #3458a8 100%)',
  'linear-gradient(135deg, #34234f 0%, #7652a8 100%)',
  'linear-gradient(135deg, #3b2a16 0%, #a66c24 100%)'
]

export default {
  name: 'IndicatorMarketPicker',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    dark: {
      type: Boolean,
      default: false
    },
    getContainer: {
      type: Function,
      required: true
    },
    assetMode: {
      type: String,
      default: 'indicator'
    },
    initialStrategyType: {
      type: String,
      default: 'cta'
    }
  },
  data () {
    return {
      keyword: '',
      loading: false,
      items: [],
      total: 0,
      purchasing: {},
      strategyType: 'cta'
    }
  },
  computed: {
    isStrategyMode () {
      return String(this.assetMode || '').toLowerCase() === 'strategy'
    },
    pickerText () {
      const namespace = this.isStrategyMode ? 'strategyIde.marketPicker' : 'indicatorIde.marketPicker'
      return {
        title: this.$t(`${namespace}.title`),
        subtitle: this.$t(`${namespace}.subtitle`),
        resultCount: this.$t(`${namespace}.resultCount`, { count: this.total }),
        empty: this.$t(`${namespace}.empty`)
      }
    }
  },
  watch: {
    visible (value) {
      if (value) {
        this.strategyType = this.initialStrategyType === 'portfolio' ? 'portfolio' : 'cta'
        this.loadItems()
      }
    }
  },
  methods: {
    async loadItems () {
      this.loading = true
      try {
        const res = await request({
          url: '/api/community/indicators',
          method: 'get',
          params: {
            page: 1,
            page_size: 50,
            keyword: this.keyword || undefined,
            sort_by: 'hot',
            asset_type: this.isStrategyMode ? 'script_template' : 'indicator',
            strategy_type: this.isStrategyMode ? this.strategyType : undefined
          }
        })
        if (res && res.code === 1) {
          const rows = (res.data && res.data.items) || []
          const expectedAssetType = this.isStrategyMode ? 'script_template' : 'indicator'
          this.items = rows.filter(item => {
            if (String(item.asset_type || 'indicator').toLowerCase() !== expectedAssetType) return false
            if (!this.isStrategyMode) return true
            return String(item.strategy_type || '').toLowerCase() === this.strategyType
          })
          this.total = this.items.length
        } else {
          this.$message.error((res && res.msg) || this.$t('community.loadFailed'))
        }
      } catch (error) {
        this.$message.error(this.$t('community.loadFailed'))
      } finally {
        this.loading = false
      }
    },
    async acquire (item) {
      if (!item) return
      this.$set(this.purchasing, item.id, true)
      try {
        if (this.isAcquired(item)) {
          const detail = await request({
            url: `/api/community/indicators/${item.id}`,
            method: 'get'
          })
          if (detail && detail.code === 1) {
            let result = detail.data || {}
            if (this.isStrategyMode && result.local_copy_missing && item.is_purchased) {
              const restored = await request({
                url: `/api/community/indicators/${item.id}/sync`,
                method: 'post'
              })
              if (!restored || restored.code !== 1) {
                this.$message.error(this.purchaseError(restored))
                return
              }
              result = restored.data || result
            }
            this.$emit('acquired', { item, result })
          } else {
            this.$message.error((detail && detail.msg) || this.$t('community.loadFailed'))
          }
          return
        }
        const res = await request({
          url: `/api/community/indicators/${item.id}/purchase`,
          method: 'post'
        })
        if (res && res.code === 1) {
          this.$set(item, 'is_purchased', true)
          this.$message.success(this.$t('community.purchaseSuccess'))
          this.$emit('acquired', { item, result: res.data || {} })
        } else {
          this.$message.error(this.purchaseError(res))
        }
      } catch (error) {
        this.$message.error(this.purchaseError(error))
      } finally {
        this.$delete(this.purchasing, item.id)
      }
    },
    purchaseError (source) {
      const envelope = (source && source.response && source.response.data) || source || {}
      const code = envelope.msg || envelope.message || envelope.error || ''
      const details = envelope.data || {}
      if (code === 'insufficient_credits') {
        const required = Number(details.required || 0)
        const current = Number(details.current || 0)
        return this.$t('community.insufficientCreditsDetail', {
          required: this.formatNumber(required),
          current: this.formatNumber(current),
          shortage: this.formatNumber(Math.max(required - current, 0))
        })
      }
      const key = code ? `community.${code}` : ''
      if (key && this.$te(key)) return this.$t(key)
      return code || this.$t('community.purchaseFailed')
    },
    isFree (item) {
      return item.pricing_type === 'free' || Number(item.price || 0) <= 0
    },
    isAcquired (item) {
      return !!(item.is_own || item.is_purchased)
    },
    actionLabel (item) {
      if (this.isStrategyMode && this.isAcquired(item)) return this.$t('strategyIde.marketPicker.edit')
      if (item.is_own) return this.$t('community.myIndicator')
      if (item.is_purchased) return this.$t('indicatorIde.marketPicker.added')
      return this.isFree(item) ? this.$t('community.getFree') : this.$t('community.buyNow')
    },
    strategyTypeLabel (item) {
      return String(item.strategy_type || '').toLowerCase() === 'portfolio'
        ? this.$t('strategyIde.marketPicker.portfolioShort')
        : this.$t('strategyIde.marketPicker.ctaShort')
    },
    priceLabel (item) {
      if (this.isFree(item)) return this.$t('community.free')
      return `${this.formatNumber(item.price)} ${this.$t('community.credits')}`
    },
    formatNumber (value) {
      const number = Number(value || 0)
      return Number.isInteger(number) ? String(number) : number.toFixed(2)
    },
    hasBacktestData (item) {
      return Number(item && item.sample_size) > 0
    },
    formatPercent (value, showSign = false) {
      const number = Number(value || 0)
      const sign = showSign && number > 0 ? '+' : ''
      return `${sign}${number.toFixed(2)}%`
    },
    formatDrawdown (value) {
      const number = Math.abs(Number(value || 0))
      return number > 0 ? `-${number.toFixed(2)}%` : '0.00%'
    },
    formatRatio (value) {
      return Number(value || 0).toFixed(2)
    },
    metricTone (value) {
      const number = Number(value || 0)
      if (number > 0) return 'positive'
      if (number < 0) return 'negative'
      return 'neutral'
    },
    rating (item) {
      const value = Number(item.avg_rating || 0)
      return value > 0 ? value.toFixed(1) : this.$t('community.noRatings')
    },
    authorName (item) {
      const author = item.author || {}
      return author.nickname || author.username || this.$t('indicatorIde.marketPicker.communityAuthor')
    },
    initials (name) {
      const value = String(name || 'I').trim()
      if (/[一-龥]/.test(value)) return value.slice(0, 2)
      const words = value.split(/\s+/).filter(Boolean)
      return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : value.slice(0, 2)).toUpperCase()
    },
    coverStyle (item) {
      return { background: COVER_GRADIENTS[Number(item.id || 0) % COVER_GRADIENTS.length] }
    }
  }
}
</script>

<style lang="less">
.ide-market-picker-wrap {
  .ant-modal {
    max-width: calc(100vw - 32px);
    padding-bottom: 0;
  }

  .ant-modal-content {
    overflow: hidden;
    border-radius: 8px;
  }

  .ant-modal-close {
    top: 14px;
    right: 14px;
    width: 36px;
    height: 36px;
    border-radius: 6px;

    .ant-modal-close-x {
      width: 36px;
      height: 36px;
      line-height: 36px;
    }
  }

  .ant-modal-body {
    padding: 0;
  }
}

.ide-market-picker {
  color: #1f2937;

  &__header {
    display: flex;
    align-items: flex-end;
    gap: 24px;
    padding: 22px 72px 18px 24px;
    border-bottom: 1px solid #edf0f3;
  }

  &__heading {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 280px;

    h2 {
      margin: 0 0 3px;
      color: #111827;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.25;
    }

    p {
      margin: 0;
      color: #7b8492;
      font-size: 12px;
      line-height: 1.45;
    }
  }

  &__icon {
    display: flex;
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    background: rgba(82, 196, 26, 0.12);
    color: #52c41a;
    font-size: 18px;
  }

  &__search {
    min-width: 300px;
    flex: 1;

    .ant-input,
    .ant-btn {
      height: 34px;
    }

    .ant-input {
      border-radius: 6px 0 0 6px;
    }

    .ant-btn {
      min-width: 74px;
      border-radius: 0 6px 6px 0;
      box-shadow: none;
    }
  }

  &__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 24px;
    color: #8b93a1;
    font-size: 12px;
    background: #fafbfc;
  }

  &__indicator-only {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #52c41a;
    font-weight: 600;
  }

  &__strategy-types {
    display: inline-flex;
    overflow: hidden;
    border-radius: 6px;

    .ant-radio-button-wrapper {
      border-radius: 0;
    }

    .ant-radio-button-wrapper:first-child {
      border-radius: 6px 0 0 6px;
    }

    .ant-radio-button-wrapper:last-child {
      border-radius: 0 6px 6px 0;
    }
  }

  &__list {
    max-height: 560px;
    overflow-y: auto;
    padding: 6px 14px 14px;
  }

  &__empty {
    display: flex;
    min-height: 320px;
    align-items: center;
    justify-content: center;
  }
}

.ide-market-picker-item {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 132px;
  gap: 14px;
  align-items: center;
  min-height: 92px;
  padding: 13px 10px;
  border-bottom: 1px solid #edf0f3;
  transition: background 0.16s ease;

  &:hover {
    background: #f7faf7;
  }

  &--strategy {
    min-height: 134px;
  }

  &__cover {
    position: relative;
    display: flex;
    width: 56px;
    height: 56px;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 7px;
    color: #fff;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: 0.04em;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__body {
    min-width: 0;

    p {
      display: -webkit-box;
      overflow: hidden;
      margin: 5px 0 7px;
      color: #747e8c;
      font-size: 12px;
      line-height: 1.45;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 7px;

    h3 {
      overflow: hidden;
      margin: 0;
      color: #202733;
      font-size: 14px;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ant-tag {
      margin: 0;
      flex-shrink: 0;
      font-size: 10px;
      line-height: 18px;
    }
  }

  &__meta {
    display: flex;
    gap: 14px;
    color: #98a1ad;
    font-size: 11px;

    span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .anticon-star {
      color: #faad14;
    }
  }

  &__performance {
    display: grid;
    grid-template-columns: repeat(4, minmax(72px, 1fr));
    gap: 6px;
    margin: 8px 0;
  }

  &__metric {
    min-width: 0;
    padding: 5px 8px;
    border: 1px solid #e6e9e6;
    border-radius: 5px;
    background: #f7f9f7;

    span,
    strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      color: #8b93a1;
      font-size: 10px;
      line-height: 1.25;
    }

    strong {
      margin-top: 2px;
      color: #2d3743;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      line-height: 1.3;
    }

    strong.positive {
      color: #389e0d;
    }

    strong.negative {
      color: #cf3c3c;
    }
  }

  &__no-performance {
    grid-column: 1 / -1;
    display: flex;
    min-height: 36px;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    border: 1px dashed #dfe3df;
    border-radius: 5px;
    color: #98a1ad;
    font-size: 11px;
  }

  &__action {
    display: flex;
    align-items: stretch;
    flex-direction: column;
    gap: 7px;

    .ant-btn {
      height: 32px;
      border-radius: 6px;
    }
  }

  &__vip-free.ant-tag {
    margin: 0;
    padding: 0 7px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    line-height: 20px;
  }

  &__price {
    color: #f59e0b;
    font-size: 12px;
    font-weight: 700;
    text-align: center;

    &.free {
      color: #52c41a;
    }
  }
}

.ide-market-picker-wrap--dark {
  .ant-modal-content,
  .ant-modal-body {
    background: #171817;
  }

  .ant-modal-close {
    color: rgba(255, 255, 255, 0.55);
  }

  .ide-market-picker {
    color: rgba(255, 255, 255, 0.86);

    &__header,
    .ide-market-picker-item {
      border-color: #303330;
    }

    &__heading h2,
    .ide-market-picker-item__title-row h3 {
      color: rgba(255, 255, 255, 0.9);
    }

    &__heading p,
    .ide-market-picker-item__body p {
      color: rgba(255, 255, 255, 0.46);
    }

    &__summary {
      color: rgba(255, 255, 255, 0.42);
      background: #1d1f1d;
    }

    &__search {
      .ant-input {
        border-color: #3b3e3b;
        background: #202220;
        color: rgba(255, 255, 255, 0.88);
      }

      .ant-input::placeholder {
        color: rgba(255, 255, 255, 0.32);
      }
    }
  }

  .ide-market-picker-item {
    &:hover {
      background: rgba(82, 196, 26, 0.055);
    }

    &__meta {
      color: rgba(255, 255, 255, 0.36);
    }

    &__metric {
      border-color: #303330;
      background: rgba(255, 255, 255, 0.025);

      span {
        color: rgba(255, 255, 255, 0.38);
      }

      strong {
        color: rgba(255, 255, 255, 0.82);
      }

      strong.positive {
        color: #52c41a;
      }

      strong.negative {
        color: #ff6b6b;
      }
    }

    &__no-performance {
      border-color: #343734;
      color: rgba(255, 255, 255, 0.34);
      background: rgba(255, 255, 255, 0.018);
    }

    &__action .ant-btn-default[disabled] {
      border-color: #353835;
      background: #232523;
      color: rgba(255, 255, 255, 0.34);
    }
  }
}

@media (max-width: 720px) {
  .ide-market-picker {
    &__header {
      align-items: stretch;
      flex-direction: column;
      gap: 14px;
      padding: 56px 18px 18px;
    }

    &__search {
      width: 100%;
      min-width: 0;
    }

    &__summary {
      padding-right: 18px;
      padding-left: 18px;
    }
  }

  .ide-market-picker-item {
    grid-template-columns: 46px minmax(0, 1fr);

    &__cover {
      width: 46px;
      height: 46px;
    }

    &__performance {
      grid-template-columns: repeat(2, minmax(86px, 1fr));
    }

    &__action {
      grid-column: 2;
      align-items: center;
      flex-direction: row;
      justify-content: flex-end;

      .ant-btn {
        min-width: 120px;
      }
    }
  }
}
</style>
