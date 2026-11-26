<template>
  <section class="catalog-content-section instrument-catalog">
    <div class="catalog-section-heading">
      <div><h5>{{ $t('instrumentCatalog.title') }}</h5><p>{{ $t('instrumentCatalog.description') }}</p></div>
      <a-button :loading="loading" @click="load"><a-icon type="reload" />{{ $t('common.refresh') }}</a-button>
    </div>
    <div class="instrument-catalog-controls">
      <a-radio-group v-model="market" class="instrument-market-switch" button-style="solid" @change="reset">
        <a-radio-button value="Futures">{{ $t('instrumentCatalog.futures') }}</a-radio-button>
        <a-radio-button value="HKStock">{{ $t('instrumentCatalog.hkStock') }}</a-radio-button>
      </a-radio-group>
      <a-input-search v-model="keyword" :placeholder="$t('instrumentCatalog.search')" @search="reset" />
    </div>
    <a-alert v-if="error" type="error" show-icon :message="error" />
    <a-table
      size="small"
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :row-key="row => row.exchange + ':' + row.symbol"
      :scroll="{ x: 980 }"
      :pagination="{ current: page, pageSize: 20, total, showSizeChanger: false }"
      @change="changePage">
      <template slot="status" slot-scope="value, row"><a-tag :color="row.expired || !row.is_active ? 'default' : 'green'">{{ $t(row.expired || !row.is_active ? 'instrumentCatalog.expired' : 'instrumentCatalog.active') }}</a-tag></template>
    </a-table>
  </section>
</template>

<script>
import { getInstrumentCatalog } from '@/api/settings'

export default {
  name: 'InstrumentCatalog',
  props: { syncing: Boolean },
  data () { return { market: 'Futures', keyword: '', page: 1, items: [], total: 0, loading: false, error: '', requestId: 0 } },
  computed: {
    columns () {
      const fields = this.market === 'HKStock'
        ? ['symbol', 'name', 'exchange', 'currency', 'board_lot', 'rules_as_of']
        : ['symbol', 'name', 'exchange', 'currency', 'expiry', 'quantity_step', 'price_tick', 'metadata_updated_at']
      return [...fields.map(key => ({ title: this.$t(`instrumentCatalog.${key}`), dataIndex: key, key, ellipsis: true, width: key === 'name' ? 240 : 130 })),
        { title: this.$t('instrumentCatalog.status'), key: 'status', width: 110, scopedSlots: { customRender: 'status' } }]
    }
  },
  watch: { syncing (value, old) { if (old && !value) return this.load() } },
  mounted () { return this.load() },
  beforeDestroy () { this.requestId++ },
  methods: {
    reset () { this.page = 1; return this.load() },
    changePage (pagination) { this.page = pagination.current; return this.load() },
    async load () {
      const requestId = ++this.requestId
      this.loading = true; this.error = ''
      try {
        const res = await getInstrumentCatalog({ market: this.market, keyword: this.keyword, page: this.page, page_size: 20 })
        if (requestId !== this.requestId) return
        if (res.code !== 1) throw new Error('catalog')
        this.total = res.data.total
        this.items = res.data.items.map(row => {
          const meta = row.product_meta || {}
          return {
            ...row,
            exchange: meta.exchange || row.exchange,
            currency: row.currency || '—',
            board_lot: row.board_lot || '—',
            rules_as_of: row.rules_as_of || '—',
            expiry: String(meta.expiry || '').replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3') || '—',
            quantity_step: meta.quantity_step || '—',
            price_tick: meta.price_tick ?? '—',
            metadata_updated_at: row.metadata_updated_at?.slice(0, 19) || '—'
          }
        })
      } catch (error) {
        if (requestId === this.requestId) { this.items = []; this.total = 0; this.error = this.$t('brokerAccounts.positionsLoadFailed') }
      } finally { if (requestId === this.requestId) this.loading = false }
    }
  }
}
</script>

<style scoped>
.instrument-catalog-controls { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-bottom: 16px; }
.instrument-catalog-controls .ant-input-search { width: 320px; max-width: 100%; }
.instrument-catalog { min-width: 0; }
.catalog-section-heading { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.catalog-section-heading h5 { color: inherit; font-size: 14px; margin: 0 0 4px; }
.catalog-section-heading p { color: inherit; opacity: .7; font-size: 12px; margin: 0; }
</style>
