<template>
  <div class="author-dashboard" :class="{ 'theme-dark': isDarkTheme }">
    <a-row :gutter="16" class="ad-stat-row">
      <a-col :xs="12" :sm="12" :md="6">
        <a-card class="ad-stat-card" :loading="summaryLoading">
          <div class="ad-stat-label">{{ $t('authorDashboard.stat.published') }}</div>
          <div class="ad-stat-value">{{ summary.published_total }}</div>
          <div class="ad-stat-sub">
            <span class="ad-stat-sub-item">
              <a-badge status="success" />
              {{ $t('authorDashboard.stat.approved') }} {{ summary.approved_count }}
            </span>
            <span v-if="summary.pending_count > 0" class="ad-stat-sub-item">
              <a-badge status="processing" />
              {{ $t('authorDashboard.stat.pending') }} {{ summary.pending_count }}
            </span>
            <span v-if="summary.rejected_count > 0" class="ad-stat-sub-item">
              <a-badge status="error" />
              {{ $t('authorDashboard.stat.rejected') }} {{ summary.rejected_count }}
            </span>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="12" :md="6">
        <a-card class="ad-stat-card" :loading="summaryLoading">
          <div class="ad-stat-label">{{ $t('authorDashboard.stat.totalSales') }}</div>
          <div class="ad-stat-value">{{ summary.total_sales }}</div>
          <div class="ad-stat-sub">{{ $t('authorDashboard.stat.totalSalesHint') }}</div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="12" :md="6">
        <a-card class="ad-stat-card" :loading="summaryLoading">
          <div class="ad-stat-label">{{ $t('authorDashboard.stat.totalRevenue') }}</div>
          <div class="ad-stat-value ad-stat-value-revenue">
            {{ summary.total_revenue.toFixed(2) }}
            <span class="ad-stat-unit">{{ $t('community.credits') }}</span>
          </div>
          <div class="ad-stat-sub">{{ $t('authorDashboard.stat.totalRevenueHint') }}</div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="12" :md="6">
        <a-card class="ad-stat-card" :loading="summaryLoading">
          <div class="ad-stat-label">{{ $t('authorDashboard.stat.avgRating') }}</div>
          <div class="ad-stat-value">
            <span v-if="summary.rating_count > 0">
              {{ summary.avg_rating.toFixed(2) }}
              <a-icon type="star" theme="filled" class="ad-rating-star" />
            </span>
            <span v-else class="ad-stat-empty">—</span>
          </div>
          <div class="ad-stat-sub">
            {{ $t('authorDashboard.stat.ratingCount', { count: summary.rating_count }) }}
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-tabs v-model="subTab" class="ad-tabs" type="card" @change="onSubTabChange">
      <a-tab-pane key="published">
        <template #tab>
          <span><a-icon type="appstore" /> {{ $t('authorDashboard.tab.published') }}</span>
        </template>

        <a-table
          :columns="publishedColumns"
          :data-source="published.items"
          :loading="publishedLoading"
          :pagination="publishedPagination"
          :row-key="row => row.id"
          :scroll="{ x: 820 }"
          size="middle"
          class="ad-table"
          @change="onPublishedTableChange"
        >
          <template slot="nameCol" slot-scope="text, record">
            <div class="ad-name-col">
              <a class="ad-name" @click="viewSales(record)">{{ record.name }}</a>
              <a-tag class="ad-asset-tag" color="blue">{{ getAssetTypeText(record.asset_type) }}</a-tag>
              <div class="ad-desc">{{ record.description }}</div>
            </div>
          </template>

          <template slot="status" slot-scope="text, record">
            <a-tag v-if="record.review_status === 'approved'" color="green">
              {{ $t('community.statusApproved') }}
            </a-tag>
            <a-tag v-else-if="record.review_status === 'pending'" color="blue">
              {{ $t('community.statusPending') }}
            </a-tag>
            <a-tag v-else-if="record.review_status === 'rejected'" color="red">
              {{ $t('community.statusRejected') }}
            </a-tag>
            <a-tag v-else color="default">—</a-tag>
            <div v-if="record.review_note" class="ad-review-note">
              <a-icon type="message" />
              {{ record.review_note }}
            </div>
          </template>

          <template slot="price" slot-scope="text, record">
            <span v-if="record.pricing_type === 'free' || record.price <= 0" class="ad-free">
              {{ $t('community.free') }}
            </span>
            <span v-else>
              {{ record.price.toFixed(2) }} {{ $t('community.credits') }}
              <a-tag v-if="record.vip_free" color="gold" class="ad-vip-tag">
                {{ $t('community.vipFree') }}
              </a-tag>
            </span>
          </template>

          <template slot="revenue" slot-scope="text, record">
            <span class="ad-revenue">{{ record.revenue.toFixed(2) }}</span>
          </template>

          <template slot="rating" slot-scope="text, record">
            <span v-if="record.rating_count > 0">
              {{ record.avg_rating.toFixed(2) }}
              <a-icon type="star" theme="filled" class="ad-rating-star" />
              <span class="ad-rating-count">({{ record.rating_count }})</span>
            </span>
            <span v-else class="ad-stat-empty">—</span>
          </template>

          <template slot="actions" slot-scope="text, record">
            <a-button type="link" size="small" @click="viewSales(record)">
              {{ $t('authorDashboard.viewSales') }}
            </a-button>
            <a-button type="link" size="small" @click="$emit('view-in-market', record)">
              {{ $t('authorDashboard.viewInMarket') }}
            </a-button>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="sales">
        <template #tab>
          <span><a-icon type="dollar" /> {{ $t('authorDashboard.tab.sales') }}</span>
        </template>

        <div v-if="salesIndicatorFilter" class="ad-filter-banner">
          <a-icon type="filter" />
          {{ $t('authorDashboard.filteredBy') }}:
          <strong>{{ salesIndicatorFilter.name }}</strong>
          <a-button type="link" size="small" @click="clearSalesFilter">
            <a-icon type="close-circle" /> {{ $t('authorDashboard.clearFilter') }}
          </a-button>
        </div>

        <a-table
          :columns="salesColumns"
          :data-source="sales.items"
          :loading="salesLoading"
          :pagination="salesPagination"
          :row-key="row => row.purchase_id"
          :scroll="{ x: 720 }"
          size="middle"
          class="ad-table"
          @change="onSalesTableChange"
        >
          <template slot="time" slot-scope="text, record">
            {{ formatTime(record.purchase_time) }}
          </template>
          <template slot="buyer" slot-scope="text, record">
            <span class="ad-buyer">
              <a-avatar :size="22" :src="record.buyer.avatar" />
              <span class="ad-buyer-name">{{ record.buyer.nickname || $t('authorDashboard.anonymousBuyer') }}</span>
            </span>
          </template>
          <template slot="price" slot-scope="text, record">
            <span v-if="record.price > 0" class="ad-revenue">
              +{{ record.price.toFixed(2) }} {{ $t('community.credits') }}
            </span>
            <span v-else class="ad-free">{{ $t('community.free') }}</span>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script>
import request from '@/utils/request'

export default {
  name: 'AuthorDashboard',
  props: {
    isDarkTheme: { type: Boolean, default: false }
  },
  computed: {
    publishedColumns () {
      return [
        { title: this.$t('authorDashboard.col.name'), dataIndex: 'name', key: 'name', scopedSlots: { customRender: 'nameCol' } },
        { title: this.$t('authorDashboard.col.status'), dataIndex: 'review_status', key: 'review_status', width: 180, scopedSlots: { customRender: 'status' } },
        { title: this.$t('authorDashboard.col.price'), dataIndex: 'price', key: 'price', width: 130, scopedSlots: { customRender: 'price' } },
        { title: this.$t('authorDashboard.col.sales'), dataIndex: 'purchase_count', key: 'purchase_count', width: 80, align: 'right', sorter: (a, b) => a.purchase_count - b.purchase_count },
        { title: this.$t('authorDashboard.col.revenue'), dataIndex: 'revenue', key: 'revenue', width: 110, align: 'right', scopedSlots: { customRender: 'revenue' }, sorter: (a, b) => a.revenue - b.revenue },
        { title: this.$t('authorDashboard.col.rating'), dataIndex: 'avg_rating', key: 'avg_rating', width: 130, scopedSlots: { customRender: 'rating' } },
        { title: this.$t('authorDashboard.col.actions'), key: 'actions', width: 180, scopedSlots: { customRender: 'actions' } }
      ]
    },
    salesColumns () {
      return [
        { title: this.$t('authorDashboard.col.time'), dataIndex: 'purchase_time', key: 'purchase_time', width: 170, scopedSlots: { customRender: 'time' } },
        { title: this.$t('authorDashboard.col.buyer'), dataIndex: 'buyer', key: 'buyer', width: 200, scopedSlots: { customRender: 'buyer' } },
        { title: this.$t('authorDashboard.col.indicator'), dataIndex: 'indicator_name', key: 'indicator_name' },
        { title: this.$t('authorDashboard.col.income'), dataIndex: 'price', key: 'price', width: 160, align: 'right', scopedSlots: { customRender: 'price' } }
      ]
    },
    publishedPagination () {
      return {
        current: this.published.page,
        pageSize: this.published.page_size,
        total: this.published.total,
        showSizeChanger: false,
        showTotal: total => this.$t('authorDashboard.totalCount', { total })
      }
    },
    salesPagination () {
      return {
        current: this.sales.page,
        pageSize: this.sales.page_size,
        total: this.sales.total,
        showSizeChanger: false,
        showTotal: total => this.$t('authorDashboard.totalCount', { total })
      }
    }
  },
  data () {
    return {
      subTab: 'published',
      summaryLoading: false,
      publishedLoading: false,
      salesLoading: false,
      summary: {
        published_total: 0,
        approved_count: 0,
        pending_count: 0,
        rejected_count: 0,
        total_sales: 0,
        total_revenue: 0,
        avg_rating: 0,
        rating_count: 0
      },
      published: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      sales: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      salesIndicatorFilter: null
    }
  },
  mounted () {
    this.refreshAll()
  },
  methods: {
    refreshAll () {
      this.loadSummary()
      this.loadPublished()
      if (this.subTab === 'sales') this.loadSales()
    },
    onSubTabChange (key) {
      if (key === 'sales' && this.sales.items.length === 0) {
        this.loadSales()
      }
    },
    async loadSummary () {
      this.summaryLoading = true
      try {
        const res = await request({ url: '/api/community/author/summary', method: 'get' })
        if (res && res.code === 1 && res.data) {
          this.summary = { ...this.summary, ...res.data }
        }
      } catch (e) {
        console.error('loadSummary failed', e)
      } finally {
        this.summaryLoading = false
      }
    },
    async loadPublished (page = 1) {
      this.publishedLoading = true
      try {
        const res = await request({
          url: '/api/community/author/published',
          method: 'get',
          params: { page, page_size: this.published.page_size }
        })
        if (res && res.code === 1 && res.data) {
          this.published = res.data
        }
      } catch (e) {
        console.error('loadPublished failed', e)
      } finally {
        this.publishedLoading = false
      }
    },
    async loadSales (page = 1) {
      this.salesLoading = true
      try {
        const params = { page, page_size: this.sales.page_size }
        if (this.salesIndicatorFilter) params.indicator_id = this.salesIndicatorFilter.id
        const res = await request({
          url: '/api/community/author/sales',
          method: 'get',
          params
        })
        if (res && res.code === 1 && res.data) {
          this.sales = res.data
        }
      } catch (e) {
        console.error('loadSales failed', e)
      } finally {
        this.salesLoading = false
      }
    },
    onPublishedTableChange (pagination) {
      this.loadPublished(pagination.current)
    },
    onSalesTableChange (pagination) {
      this.loadSales(pagination.current)
    },
    viewSales (record) {
      this.salesIndicatorFilter = { id: record.id, name: record.name }
      this.subTab = 'sales'
      this.loadSales(1)
    },
    clearSalesFilter () {
      this.salesIndicatorFilter = null
      this.loadSales(1)
    },
    formatTime (iso) {
      if (!iso) return '—'
      try {
        const d = new Date(iso)
        const pad = n => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
      } catch (e) {
        return iso
      }
    },
    getAssetTypeText (assetType) {
      const type = assetType || 'indicator'
      if (type === 'script_template') return this.$t('community.tabScriptTemplates')
      if (type === 'bot_preset') return this.$t('community.tabBotPresets')
      return this.$t('community.tabIndicators')
    }
  }
}
</script>

<style lang="less" scoped>
.author-dashboard {
  padding: 8px 0 0;
}

.ad-stat-row {
  margin-bottom: 16px;
}

.ad-stat-card {
  height: 100%;
  border-radius: 8px;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }
}

.ad-stat-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 8px;
}

.ad-stat-value {
  font-size: 26px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  line-height: 1.2;
}

.ad-stat-value-revenue {
  color: #fa8c16;
}

.ad-stat-unit {
  font-size: 13px;
  font-weight: normal;
  color: rgba(0, 0, 0, 0.45);
  margin-left: 4px;
}

.ad-stat-sub {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  min-height: 18px;
}

.ad-stat-sub-item {
  display: inline-flex;
  align-items: center;
  margin-right: 10px;
  gap: 2px;
}

.ad-stat-empty {
  color: rgba(0, 0, 0, 0.25);
}

.ad-rating-star {
  color: #faad14;
  font-size: 14px;
  margin-left: 2px;
}

.ad-rating-count {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-left: 2px;
}

.ad-tabs {
  background: #fff;
  padding: 12px 16px 4px;
  border-radius: 8px;
}

.ad-table {
  margin-top: 4px;
}

.ad-name-col {
  min-width: 220px;
}

.ad-name {
  font-weight: 500;
  color: var(--primary-color, #1890ff);
  cursor: pointer;
}

.ad-asset-tag {
  margin-left: 6px;
}

.ad-review-note {
  margin-top: 6px;
  color: #cf1322;
  font-size: 12px;
  line-height: 1.45;
  word-break: break-word;

  .anticon {
    margin-right: 4px;
  }
}

.ad-desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ad-free {
  color: #52c41a;
  font-weight: 500;
}

.ad-vip-tag {
  margin-left: 6px;
}

.ad-revenue {
  color: #fa8c16;
  font-weight: 600;
}

.ad-buyer {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ad-buyer-name {
  font-size: 13px;
}

.ad-filter-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(24, 144, 255, 0.08);
  border-left: 3px solid var(--primary-color, #1890ff);
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

/* ============ Dark theme ============ */
.theme-dark {
  .ad-stat-label,
  .ad-stat-sub,
  .ad-desc,
  .ad-rating-count { color: rgba(255, 255, 255, 0.55); }
  .ad-stat-value { color: rgba(255, 255, 255, 0.92); }
  .ad-stat-empty { color: rgba(255, 255, 255, 0.25); }

  .ad-stat-card,
  .ad-tabs {
    background: #1f1f1f !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  ::v-deep .ant-card { background: #1f1f1f !important; border-color: rgba(255, 255, 255, 0.08) !important; }
  ::v-deep .ant-card-body { background: #1f1f1f !important; }

  ::v-deep .ant-tabs-bar { border-bottom-color: rgba(255, 255, 255, 0.1) !important; }
  ::v-deep .ant-tabs-nav-container { color: rgba(255, 255, 255, 0.65) !important; }
  ::v-deep .ant-tabs-nav .ant-tabs-tab,
  ::v-deep .ant-tabs.ant-tabs-card .ant-tabs-card-bar .ant-tabs-tab {
    background: #1a1a1a !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
    color: rgba(255, 255, 255, 0.65) !important;
  }
  ::v-deep .ant-tabs-nav .ant-tabs-tab:hover,
  ::v-deep .ant-tabs.ant-tabs-card .ant-tabs-card-bar .ant-tabs-tab:hover {
    color: var(--primary-color-hover, #40a9ff) !important;
  }
  ::v-deep .ant-tabs-nav .ant-tabs-tab-active,
  ::v-deep .ant-tabs.ant-tabs-card .ant-tabs-card-bar .ant-tabs-tab-active,
  ::v-deep .ant-tabs-tab.ant-tabs-tab-active {
    background: #2a2a2a !important;
    border-color: rgba(255, 255, 255, 0.18) !important;
    color: var(--primary-color-hover, #40a9ff) !important;
  }
  ::v-deep .ant-tabs-nav .ant-tabs-ink-bar { background-color: var(--primary-color-hover, #40a9ff) !important; }

  ::v-deep .ant-table { background: #1f1f1f !important; color: rgba(255, 255, 255, 0.85) !important; }
  ::v-deep .ant-table-thead > tr > th { background: #262626 !important; color: rgba(255, 255, 255, 0.85) !important; border-bottom-color: rgba(255, 255, 255, 0.1) !important; }
  ::v-deep .ant-table-tbody > tr > td { background: #1f1f1f !important; border-bottom-color: rgba(255, 255, 255, 0.08) !important; }
  ::v-deep .ant-table-tbody > tr:hover > td { background: #262626 !important; }
  ::v-deep .ant-pagination-item,
  ::v-deep .ant-pagination-prev .ant-pagination-item-link,
  ::v-deep .ant-pagination-next .ant-pagination-item-link {
    background: #1f1f1f !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
    color: rgba(255, 255, 255, 0.85) !important;
  }
  ::v-deep .ant-pagination-item-active { border-color: var(--primary-color-hover, #40a9ff) !important; }
  ::v-deep .ant-pagination-item-active a { color: var(--primary-color-hover, #40a9ff) !important; }

  .ad-filter-banner { background: rgba(24, 144, 255, 0.15); color: rgba(255, 255, 255, 0.85); }
  .ad-name { color: var(--primary-color-hover, #40a9ff); }
}
</style>
