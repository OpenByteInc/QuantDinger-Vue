<template>
  <a-modal
    :visible="visible"
    :title="$t('watchlistAssets.add')"
    :ok-text="$t('watchlistAssets.add')"
    :cancel-text="$t('common.cancel')"
    :confirm-loading="saving"
    :ok-button-props="{ props: { disabled: !selected || alreadyAdded(selected) || loading } }"
    :closable="!saving"
    :mask-closable="!saving"
    :keyboard="!saving"
    :cancel-button-props="{ props: { disabled: saving } }"
    wrap-class-name="watchlist-asset-modal"
    :width="640"
    @cancel="close"
    @ok="save"
  >
    <a-tabs :active-key="market" @change="changeMarket">
      <a-tab-pane v-for="value in orderedMarkets" :key="value" :tab="$t('dashboard.indicator.market.' + value)" :disabled="saving" />
    </a-tabs>
    <p class="watchlist-help">{{ $t('watchlistAssets.hint') }}</p>
    <a-input-search
      v-model="keyword"
      :disabled="saving"
      :placeholder="$t('backtest-center.config.symbolPlaceholder')"
      :loading="loading"
      allow-clear
      @change="queueSearch"
      @search="search"
    />
    <div class="watchlist-results" :aria-busy="loading">
      <a-spin v-if="loading" />
      <a-alert v-else-if="failed" type="warning" show-icon :message="$t('watchlistAssets.searchFailed')" />
      <a-empty v-else-if="!groups.length" :description="$t(keyword.trim() ? 'watchlistAssets.empty' : 'watchlistAssets.searchHint')" />
      <button
        v-for="group in loading ? [] : groups"
        :key="group.key"
        type="button"
        class="watchlist-result"
        :class="{ selected: selected && assetKey(selected) === group.key }"
        :disabled="saving || alreadyAdded(group.item)"
        :aria-pressed="Boolean(selected && assetKey(selected) === group.key)"
        @click="selectGroup(group)"
      >
        <span class="watchlist-result-main"><strong>{{ group.item.symbol }}</strong><span>{{ group.item.name }}</span></span>
        <span class="watchlist-result-context">{{ groupLabel(group) }}</span>
        <span v-if="alreadyAdded(group.item)">{{ $t('watchlistAssets.added') }}</span>
        <a-icon v-else-if="selected && assetKey(selected) === group.key" type="check-circle" />
      </button>
    </div>
  </a-modal>
</template>

<script>
import { addWatchlist, getWatchlist, searchAssets } from '@/api/market'
import { groupWatchlistAssets, watchlistAssetKey, watchlistContextLabel, watchlistPayload } from '@/utils/watchlistAssets'

export default {
  name: 'AddWatchlistModal',
  props: {
    visible: Boolean,
    markets: { type: Array, default: () => [] },
    watchlist: { type: Array, default: () => [] },
    initialMarket: { type: String, default: 'Crypto' }
  },
  data () {
    return { market: '', keyword: '', rows: [], selected: null, loading: false, saving: false, failed: false, sequence: 0, timer: null }
  },
  computed: {
    orderedMarkets () {
      const priority = ['Crypto', 'USStock', 'HKStock', 'CNStock', 'Forex', 'Futures', 'MOEX']
      return priority.filter(value => this.markets.includes(value))
    },
    groups () { return groupWatchlistAssets(this.rows) }
  },
  watch: {
    visible (value) {
      this.invalidate()
      if (!value) return
      this.market = this.orderedMarkets.includes(this.initialMarket) ? this.initialMarket : this.orderedMarkets[0]
      this.keyword = ''
      this.search()
    }
  },
  beforeDestroy () { this.invalidate() },
  methods: {
    assetKey: watchlistAssetKey,
    contextLabel (item) { return watchlistContextLabel(item, key => this.$t(key)) },
    groupLabel (group) { return this.contextLabel(group.item) },
    alreadyAdded (item, rows = this.watchlist) { return rows.some(row => watchlistAssetKey(row) === watchlistAssetKey(item)) },
    invalidate () {
      clearTimeout(this.timer)
      this.sequence += 1
      this.rows = []
      this.selected = null
      this.loading = false
      this.failed = false
    },
    close () { if (!this.saving) this.$emit('close') },
    changeMarket (market) { this.market = market; this.search().catch(() => undefined) },
    queueSearch () {
      this.invalidate()
      this.loading = true
      this.timer = setTimeout(() => this.search(), 300)
    },
    async search () {
      this.invalidate()
      if (!this.visible || !this.market) return
      const sequence = this.sequence
      this.loading = true
      try {
        const response = await searchAssets({ market: this.market, keyword: this.keyword.trim(), limit: 60 })
        if (sequence !== this.sequence || !this.visible) return
        if (!response || response.code !== 1) throw new Error()
        const data = response.data || []
        const rows = Array.isArray(data) ? data : (data.results || data.symbols || data.items || [])
        this.rows = rows.filter(item => item.symbol && (item.market || this.market) === this.market).map(item => ({ ...item, market: item.market || this.market }))
      } catch (_) {
        if (sequence === this.sequence) this.failed = true
      } finally {
        if (sequence === this.sequence) this.loading = false
      }
    },
    selectGroup (group) { this.selected = group.item },
    async save () {
      if (this.saving || this.loading || !this.selected || this.alreadyAdded(this.selected)) return
      const item = { ...this.selected }
      this.saving = true
      try {
        const latest = await getWatchlist()
        if (!latest || latest.code !== 1 || !Array.isArray(latest.data)) throw new Error()
        if (!this.alreadyAdded(item, latest.data)) {
          const result = await addWatchlist(watchlistPayload(item))
          if (!result || result.code !== 1) throw new Error()
        }
        this.$message.success(this.$t('backtest-center.config.addSuccess'))
        this.$emit('added', item)
        this.$emit('close')
      } catch (_) {
        this.$message.error(this.$t('watchlistAssets.saveFailed'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style lang="less">
.watchlist-asset-modal {
  .watchlist-help { margin: 14px 0; color: #66758b; }
  .watchlist-results { min-height: 180px; max-height: 330px; overflow-y: auto; margin: 16px 0; }
  .watchlist-result { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px; margin: 6px 0; border: 1px solid #dce3ec; border-radius: 8px; background: transparent; color: inherit; text-align: start; cursor: pointer; }
  .watchlist-result.selected, .watchlist-result:focus-visible { border-color: var(--primary-color, #1890ff); outline: 2px solid var(--primary-color, #1890ff); outline-offset: -2px; }
  .watchlist-result:disabled { cursor: default; opacity: .8; }
  .watchlist-result-main { display: flex; flex-direction: column; flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .watchlist-result-main > span, .watchlist-result-context { color: #66758b; font-size: 12px; }
  .watchlist-result-context { max-width: 45%; white-space: normal; }
}
body.dark .watchlist-asset-modal, body.realdark .watchlist-asset-modal, .theme-dark .watchlist-asset-modal {
  .ant-modal-content, .ant-modal-header { background: #1b1d20; color: #e7e9ed; }
  .ant-modal-title, .ant-modal-close { color: #e7e9ed; }
  .ant-modal-header, .ant-modal-footer, .watchlist-result { border-color: #3b4149; }
  .watchlist-help, .watchlist-result-main > span, .watchlist-result-context { color: #abb5c4; }
  .ant-input, .ant-select-selection { background: #141618; border-color: #454b55; color: #e7e9ed; }
  .watchlist-result.selected { background: #222b34; }
}
body.dark .watchlist-asset-dropdown, body.realdark .watchlist-asset-dropdown, .theme-dark .watchlist-asset-dropdown {
  background: #1b1d20;
  .ant-select-dropdown-menu-item { color: #e7e9ed; }
  .ant-select-dropdown-menu-item-active, .ant-select-dropdown-menu-item-selected { background: #293442; }
}
</style>
