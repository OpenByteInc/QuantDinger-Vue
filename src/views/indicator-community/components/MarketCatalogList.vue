<template>
  <div
    class="market-catalog"
    :class="[isStrategy ? 'market-catalog--strategy' : 'market-catalog--indicator', { 'market-catalog--dark': isDarkTheme }]"
  >
    <div class="market-catalog__scroller">
      <div class="market-catalog__head">
        <span class="catalog-col catalog-col--item">{{ $t('community.catalog.item') }}</span>
        <template v-if="isStrategy">
          <span class="catalog-col catalog-col--market">{{ $t('community.catalog.market') }}</span>
          <span class="catalog-col catalog-col--timeframe">{{ $t('community.catalog.timeframe') }}</span>
        </template>
        <span v-else class="catalog-col catalog-col--scope">{{ $t('community.catalog.scope') }}</span>
        <span class="catalog-col catalog-col--author">{{ $t('community.catalog.author') }}</span>
        <span class="catalog-col catalog-col--updated">{{ $t('community.catalog.updated') }}</span>
        <template v-if="isStrategy">
          <span class="catalog-col catalog-col--metric">
            <catalog-sort-button :label="$t('community.annualReturn')" sort-key="annual_return" :active-key="sortKey" :order="sortOrder" @sort="toggleSort" />
          </span>
          <span class="catalog-col catalog-col--metric">
            <catalog-sort-button :label="$t('community.maxDrawdown')" sort-key="max_drawdown" :active-key="sortKey" :order="sortOrder" @sort="toggleSort" />
          </span>
          <span class="catalog-col catalog-col--metric">
            <catalog-sort-button :label="$t('community.sharpe')" sort-key="sharpe" :active-key="sortKey" :order="sortOrder" @sort="toggleSort" />
          </span>
          <span class="catalog-col catalog-col--users">
            <catalog-sort-button :label="$t('community.catalog.users')" sort-key="users" :active-key="sortKey" :order="sortOrder" @sort="toggleSort" />
          </span>
        </template>
        <template v-else>
          <span class="catalog-col catalog-col--rating">
            <catalog-sort-button :label="$t('community.rating')" sort-key="rating" :active-key="sortKey" :order="sortOrder" @sort="toggleSort" />
          </span>
          <span class="catalog-col catalog-col--views">
            <catalog-sort-button :label="$t('community.views')" sort-key="views" :active-key="sortKey" :order="sortOrder" @sort="toggleSort" />
          </span>
          <span class="catalog-col catalog-col--users">
            <catalog-sort-button :label="$t('community.catalog.installs')" sort-key="installs" :active-key="sortKey" :order="sortOrder" @sort="toggleSort" />
          </span>
        </template>
        <span class="catalog-col catalog-col--price">
          <catalog-sort-button :label="$t('community.catalog.price')" sort-key="price" :active-key="sortKey" :order="sortOrder" @sort="toggleSort" />
        </span>
        <span class="catalog-col catalog-col--action"></span>
      </div>

      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="market-catalog__row"
        @click="$emit('open', item)"
      >
        <span class="catalog-col catalog-col--item catalog-item">
          <span v-if="!isStrategy" class="catalog-thumb">
            <img :src="previewImage(item)" :alt="item.name" @error="handleImageError(item.id)" />
          </span>
          <span class="catalog-item__copy">
            <span class="catalog-item__title-row">
              <strong class="catalog-item__title" :title="item.name">{{ item.name }}</strong>
              <span v-if="item.vip_free" class="catalog-vip-free">{{ $t('community.vipFree') }}</span>
              <span v-if="isNew(item)" class="catalog-new">{{ $t('community.catalog.new') }}</span>
              <span v-if="item.is_purchased" class="catalog-owned catalog-owned--purchased">
                <a-icon type="check-circle" /> {{ $t('community.purchased') }}
              </span>
              <span v-else-if="item.is_own" class="catalog-owned">{{ ownershipLabel }}</span>
            </span>
            <span class="catalog-item__desc">{{ item.description || $t('community.noDescription') }}</span>
          </span>
        </span>

        <template v-if="isStrategy">
          <span class="catalog-col catalog-col--market">
            <span class="catalog-chip">{{ strategyMarket(item) }}</span>
          </span>
          <span class="catalog-col catalog-col--timeframe">
            <span class="catalog-chip catalog-chip--plain">{{ strategyTimeframe(item) }}</span>
          </span>
        </template>
        <span v-else class="catalog-col catalog-col--scope catalog-scope">
          <span
            v-for="tag in indicatorScope(item)"
            :key="tag.key"
            class="catalog-chip"
            :class="`catalog-chip--${tag.tone}`"
          >{{ tag.label }}</span>
        </span>

        <span class="catalog-col catalog-col--author catalog-author">
          <a-avatar :src="item.author && item.author.avatar" :size="22" />
          <span :title="authorName(item)">{{ authorName(item) }}</span>
        </span>
        <span class="catalog-col catalog-col--updated catalog-muted">{{ relativeDate(item.updated_at || item.created_at) }}</span>

        <template v-if="isStrategy">
          <span class="catalog-col catalog-col--metric catalog-number" :class="metricTone(item.annual_return, 'return')">
            {{ formatPercent(item.annual_return, true) }}
          </span>
          <span class="catalog-col catalog-col--metric catalog-number catalog-number--negative">
            {{ formatDrawdown(item.max_drawdown) }}
          </span>
          <span class="catalog-col catalog-col--metric catalog-number" :class="metricTone(item.sharpe, 'sharpe')">
            {{ formatNumber(item.sharpe) }}
          </span>
          <span class="catalog-col catalog-col--users catalog-stat"><a-icon type="download" /> {{ formatCompact(item.purchase_count) }}</span>
        </template>
        <template v-else>
          <span class="catalog-col catalog-col--rating catalog-stat catalog-rating"><a-icon type="star" theme="filled" /> {{ formatRating(item.avg_rating) }}</span>
          <span class="catalog-col catalog-col--views catalog-stat"><a-icon type="eye" /> {{ formatCompact(item.view_count) }}</span>
          <span class="catalog-col catalog-col--users catalog-stat"><a-icon type="download" /> {{ formatCompact(item.purchase_count) }}</span>
        </template>

        <span class="catalog-col catalog-col--price">
          <span class="catalog-price" :class="isPaid(item) ? 'catalog-price--paid' : 'catalog-price--free'">
            {{ priceLabel(item) }}
          </span>
        </span>
        <span class="catalog-col catalog-col--action">
          <span class="catalog-open">{{ $t('community.catalog.open') }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script>
import moment from 'moment'
import fallbackCover from '@/assets/marketplace/indicator-preview-default.svg'

const CatalogSortButton = {
  name: 'CatalogSortButton',
  props: {
    label: { type: String, required: true },
    sortKey: { type: String, required: true },
    activeKey: { type: String, default: '' },
    order: { type: String, default: '' }
  },
  computed: {
    isActive () {
      return this.activeKey === this.sortKey
    }
  },
  methods: {
    handleClick () {
      const nextOrder = this.isActive && this.order === 'asc' ? 'desc' : 'asc'
      this.$emit('sort', this.sortKey, nextOrder)
    }
  },
  render (h) {
    return h('button', {
      class: ['catalog-sort', { 'catalog-sort--active': this.isActive }],
      attrs: {
        type: 'button',
        'aria-label': this.label
      },
      on: { click: this.handleClick }
    }, [
      h('span', { class: 'catalog-sort__label' }, this.label),
      h('span', { class: 'catalog-sort__arrows', attrs: { 'aria-hidden': 'true' } }, [
        h('i', { class: ['catalog-sort__arrow', 'catalog-sort__arrow--up', { 'is-active': this.isActive && this.order === 'asc' }] }),
        h('i', { class: ['catalog-sort__arrow', 'catalog-sort__arrow--down', { 'is-active': this.isActive && this.order === 'desc' }] })
      ])
    ])
  }
}

export default {
  name: 'MarketCatalogList',
  components: { CatalogSortButton },
  props: {
    items: {
      type: Array,
      default: () => []
    },
    assetType: {
      type: String,
      default: 'indicator'
    },
    isDarkTheme: {
      type: Boolean,
      default: false
    },
    sortKey: {
      type: String,
      default: ''
    },
    sortOrder: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      failedImages: {}
    }
  },
  computed: {
    isStrategy () {
      return this.assetType === 'script_template'
    },
    ownershipLabel () {
      return this.$t(this.isStrategy ? 'community.myStrategy' : 'community.myIndicator')
    }
  },
  methods: {
    toggleSort (key, order) {
      this.$emit('sort-change', { key, order })
    },
    previewImage (item) {
      return item.preview_image && !this.failedImages[item.id] ? item.preview_image : fallbackCover
    },
    handleImageError (id) {
      this.$set(this.failedImages, id, true)
    },
    isPaid (item) {
      return item.pricing_type !== 'free' && Number(item.price || 0) > 0
    },
    isNew (item) {
      if (!item.created_at) return false
      return moment().diff(moment(item.created_at), 'days') <= 7
    },
    priceLabel (item) {
      if (!this.isPaid(item)) return this.$t('community.free')
      return `${Number(item.price || 0).toLocaleString()} ${this.$t('community.credits')}`
    },
    authorName (item) {
      const author = item.author || {}
      return author.nickname || author.username || '-'
    },
    relativeDate (value) {
      if (!value) return '-'
      return moment(value).fromNow()
    },
    strategyContract (item) {
      const contract = item.marketplace_contract || item.strategy_contract
      return contract && typeof contract === 'object' ? contract : {}
    },
    strategyMarket (item) {
      const contract = this.strategyContract(item)
      const values = contract.markets || contract.market_categories || []
      if (Array.isArray(values) && values.length) return values[0]
      const instruments = contract.instruments || []
      if (Array.isArray(instruments) && instruments.length) {
        return instruments[0].market || instruments[0].market_category || this.$t('community.catalog.multiMarket')
      }
      return this.$t('community.catalog.multiMarket')
    },
    strategyTimeframe (item) {
      const contract = this.strategyContract(item)
      return item.execution_frequency || contract.execution_frequency || contract.primary_frequency || (item.applicable_timeframes || [])[0] || '-'
    },
    indicatorScope (item) {
      const tags = [{
        key: 'source',
        label: item.code_hidden ? this.$t('community.codeHidden') : this.$t('community.codeVisible'),
        tone: item.code_hidden ? 'source-hidden' : 'source-visible'
      }]
      const symbols = Array.isArray(item.applicable_symbols) ? item.applicable_symbols : []
      const timeframes = Array.isArray(item.applicable_timeframes) ? item.applicable_timeframes : []
      if (symbols[0]) {
        tags.push({ key: `symbol-${symbols[0]}`, label: symbols[0], tone: 'plain' })
      } else if (timeframes[0]) {
        tags.push({ key: `timeframe-${timeframes[0]}`, label: timeframes[0], tone: 'plain' })
      }
      return tags.slice(0, 2)
    },
    formatRating (value) {
      const numeric = Number(value)
      return Number.isFinite(numeric) && numeric > 0 ? numeric.toFixed(1) : '-'
    },
    formatNumber (value) {
      const numeric = Number(value)
      return Number.isFinite(numeric) ? numeric.toFixed(2) : '-'
    },
    formatPercent (value, sign) {
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) return '-'
      const prefix = sign && numeric > 0 ? '+' : ''
      return `${prefix}${numeric.toFixed(2)}%`
    },
    formatDrawdown (value) {
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) return '-'
      const normalized = numeric > 0 ? -numeric : numeric
      return `${normalized.toFixed(2)}%`
    },
    formatCompact (value) {
      const numeric = Number(value || 0)
      if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(1)}m`
      if (numeric >= 1000) return `${(numeric / 1000).toFixed(1)}k`
      return numeric.toLocaleString()
    },
    metricTone (value, type) {
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) return ''
      if (type === 'sharpe') {
        if (numeric >= 1) return 'catalog-number--positive'
        if (numeric < 0) return 'catalog-number--negative'
        return 'catalog-number--caution'
      }
      if (numeric > 0) return 'catalog-number--positive'
      if (numeric < 0) return 'catalog-number--negative'
      return ''
    }
  }
}
</script>

<style lang="less" scoped>
.market-catalog {
  width: 100%;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.09);
  border-radius: 8px;
  background: #fff;

  &__scroller {
    width: 100%;
    min-width: 0;
    overflow-x: auto;
  }

  &__head,
  &__row {
    display: grid;
    grid-template-columns:
      minmax(300px, 4fr)
      minmax(110px, 1.2fr)
      minmax(120px, 1.4fr)
      minmax(76px, 0.8fr)
      64px
      64px
      64px
      minmax(90px, 1fr)
      54px;
    align-items: center;
    column-gap: 8px;
    min-width: 1080px;
  }

  &--strategy &__head,
  &--strategy &__row {
    grid-template-columns:
      minmax(280px, 3.8fr)
      minmax(70px, 0.75fr)
      60px
      minmax(110px, 1.3fr)
      76px
      82px
      82px
      82px
      64px
      90px
      54px;
    min-width: 1120px;
  }

  &__head {
    min-height: 36px;
    padding: 0 12px;
    color: #64748b;
    font-size: 11px;
    font-weight: 600;
    background: #f7f9fb;
    border-bottom: 1px solid rgba(15, 23, 42, 0.08);

    .catalog-col {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__row {
    width: 100%;
    min-height: 68px;
    padding: 7px 12px;
    color: #1f2937;
    font: inherit;
    text-align: left;
    border: 0;
    border-bottom: 1px solid rgba(15, 23, 42, 0.065);
    background: transparent;
    cursor: pointer;
    transition: background 0.16s ease;

    &:last-child {
      border-bottom: 0;
    }

    &:hover,
    &:focus-visible {
      background: rgba(19, 194, 194, 0.045);
      outline: none;

      .catalog-open {
        color: #fff;
        background: #13c2c2;
      }
    }
  }
}

.catalog-col {
  min-width: 0;
}

.catalog-sort {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0;
  color: inherit;
  font: inherit;
  font-weight: inherit;
  line-height: 1;
  text-align: left;
  border: 0;
  background: transparent;
  cursor: pointer;

  &:focus-visible {
    color: #13a8a8;
    outline: none;
  }
}

::v-deep .catalog-sort__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

::v-deep .catalog-sort__arrows {
  display: inline-flex;
  flex: 0 0 10px;
  flex-direction: column;
  gap: 2px;
  margin-left: 6px;
}

::v-deep .catalog-sort__arrow {
  width: 0;
  height: 0;
  opacity: 0.48;
  border-right: 5px solid transparent;
  border-left: 5px solid transparent;

  &--up {
    border-bottom: 6px solid currentColor;
  }

  &--down {
    border-top: 6px solid currentColor;
  }

  &.is-active {
    color: #13a8a8;
    opacity: 1;
  }
}

.catalog-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  &__copy {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  &__title {
    overflow: hidden;
    color: #162033;
    font-size: 13px;
    font-weight: 650;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__desc {
    overflow: hidden;
    color: #7b8798;
    font-size: 11px;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.catalog-thumb {
  flex: 0 0 82px;
  width: 82px;
  height: 46px;
  overflow: hidden;
  border-radius: 5px;
  background: #111;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.catalog-new,
.catalog-owned,
.catalog-vip-free,
.catalog-chip,
.catalog-price {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  white-space: nowrap;
}

.catalog-new,
.catalog-owned,
.catalog-vip-free {
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 9px;
  font-size: 9px;
  font-weight: 700;
}

.catalog-vip-free {
  color: #8a5400;
  background: rgba(250, 173, 20, 0.18);
  box-shadow: inset 0 0 0 1px rgba(250, 173, 20, 0.32);
}

.catalog-new {
  color: #087f78;
  background: rgba(19, 194, 194, 0.12);
}

.catalog-owned {
  color: #64748b;
  background: #eef2f6;

  &--purchased {
    color: #2f7a16;
    background: rgba(82, 196, 26, 0.12);
  }
}

.catalog-chip {
  overflow: hidden;
  padding: 2px 6px;
  color: #41506a;
  font-size: 10px;
  line-height: 1.35;
  text-overflow: ellipsis;
  border-radius: 4px;
  background: #f0f3f7;

  &--plain {
    justify-content: center;
    min-width: 34px;
  }

  &--source-visible {
    color: #047857;
    background: #ecfdf5;
  }

  &--source-hidden {
    color: #b45309;
    background: #fff7ed;
  }
}

.catalog-scope {
  display: flex;
  gap: 4px;
  overflow: hidden;
}

.catalog-author {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  color: #475569;
  font-size: 11px;

  > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.catalog-muted,
.catalog-stat {
  color: #6b778c;
  font-size: 11px;
}

.catalog-stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.catalog-rating .anticon {
  color: #f5a623;
}

.catalog-number {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;

  &--positive {
    color: #16a36a;
  }

  &--negative {
    color: #e5484d;
  }

  &--caution {
    color: #b7791f;
  }
}

.catalog-price {
  justify-content: center;
  padding: 3px 7px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 650;

  &--free {
    color: #2f7a16;
    background: rgba(82, 196, 26, 0.12);
  }

  &--paid {
    color: #9a5a00;
    background: rgba(250, 173, 20, 0.16);
  }
}

.catalog-open {
  display: inline-flex;
  justify-content: center;
  min-width: 52px;
  padding: 4px 8px;
  color: #099e9e;
  font-size: 10px;
  font-weight: 650;
  border: 1px solid rgba(19, 194, 194, 0.55);
  border-radius: 5px;
  transition: all 0.16s ease;
}

.market-catalog--dark {
  border-color: rgba(255, 255, 255, 0.1);
  background: #1f1f1f;

  .market-catalog__head {
    color: rgba(255, 255, 255, 0.56);
    background: #252525;
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .market-catalog__row {
    color: rgba(255, 255, 255, 0.82);
    border-bottom-color: rgba(255, 255, 255, 0.07);

    &:hover,
    &:focus-visible {
      background: rgba(19, 194, 194, 0.09);
    }
  }

  .catalog-item__title {
    color: rgba(255, 255, 255, 0.9);
  }

  .catalog-item__desc,
  .catalog-muted,
  .catalog-stat,
  .catalog-author {
    color: rgba(255, 255, 255, 0.56);
  }

  .catalog-chip,
  .catalog-owned {
    color: rgba(255, 255, 255, 0.68);
    background: rgba(255, 255, 255, 0.08);
  }

  .catalog-vip-free {
    color: #ffd666;
    background: rgba(250, 173, 20, 0.16);
    box-shadow: inset 0 0 0 1px rgba(250, 173, 20, 0.3);
  }

  .catalog-chip--source-visible {
    color: #6ee7b7;
    background: rgba(16, 185, 129, 0.18);
  }

  .catalog-chip--source-hidden {
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.18);
  }
}
</style>
