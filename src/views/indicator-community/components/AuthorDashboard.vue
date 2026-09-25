<template>
  <div class="author-dashboard" :class="{ 'theme-dark': isDarkTheme }">
    <a-row :gutter="16" class="author-dashboard-stat-row">
      <a-col :xs="12" :sm="12" :md="6">
        <a-card class="author-dashboard-stat-card" :loading="summaryLoading">
          <div class="author-dashboard-stat-label">{{ $t('authorDashboard.stat.published') }}</div>
          <div class="author-dashboard-stat-value">{{ summary.published_total }}</div>
          <div class="author-dashboard-stat-sub">
            <span class="author-dashboard-stat-sub-item">
              <a-badge status="success" />
              {{ $t('authorDashboard.stat.approved') }} {{ summary.approved_count }}
            </span>
            <span v-if="summary.pending_count > 0" class="author-dashboard-stat-sub-item">
              <a-badge status="processing" />
              {{ $t('authorDashboard.stat.pending') }} {{ summary.pending_count }}
            </span>
            <span v-if="summary.rejected_count > 0" class="author-dashboard-stat-sub-item">
              <a-badge status="error" />
              {{ $t('authorDashboard.stat.rejected') }} {{ summary.rejected_count }}
            </span>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="12" :md="6">
        <a-card class="author-dashboard-stat-card" :loading="summaryLoading">
          <div class="author-dashboard-stat-label">{{ $t('authorDashboard.stat.totalSales') }}</div>
          <div class="author-dashboard-stat-value">{{ summary.total_sales }}</div>
          <div class="author-dashboard-stat-sub">{{ $t('authorDashboard.stat.totalSalesHint') }}</div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="12" :md="6">
        <a-card class="author-dashboard-stat-card" :loading="summaryLoading">
          <div class="author-dashboard-stat-label">{{ $t('authorDashboard.stat.totalRevenue') }}</div>
          <div class="author-dashboard-stat-value author-dashboard-stat-value-revenue">
            {{ formatNumber(summary.total_revenue) }}
            <span class="author-dashboard-stat-unit">{{ $t('community.credits') }}</span>
          </div>
          <div class="author-dashboard-stat-sub">{{ $t('authorDashboard.stat.totalRevenueHint') }}</div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="12" :md="6">
        <a-card class="author-dashboard-stat-card" :loading="summaryLoading">
          <div class="author-dashboard-stat-label">{{ $t('authorDashboard.stat.avgRating') }}</div>
          <div class="author-dashboard-stat-value">
            <span v-if="summary.rating_count > 0">
              {{ formatNumber(summary.avg_rating) }}
              <a-icon type="star" theme="filled" class="author-dashboard-rating-star" />
            </span>
            <span v-else class="author-dashboard-stat-empty">—</span>
          </div>
          <div class="author-dashboard-stat-sub">
            {{ $t('authorDashboard.stat.ratingCount', { count: summary.rating_count }) }}
          </div>
        </a-card>
      </a-col>
    </a-row>

    <div class="author-dashboard-detail">
      <div class="author-dashboard-detail-toolbar">
        <a-radio-group v-model="subTab" class="author-dashboard-tabs" button-style="solid" @change="onSubTabChange">
          <a-radio-button value="published">
            <a-icon type="appstore" /> {{ $t('authorDashboard.tab.published') }}
          </a-radio-button>
          <a-radio-button value="sales">
            <a-icon type="dollar" /> {{ $t('authorDashboard.tab.sales') }}
          </a-radio-button>
        </a-radio-group>
      </div>

      <div v-show="subTab === 'published'">
        <a-alert
          v-if="publishedError"
          class="author-dashboard-load-error"
          type="error"
          show-icon
          :message="$t('authorDashboard.loadPublishedFailed')"
        />

        <a-table
          :columns="publishedColumns"
          :data-source="published.items"
          :loading="publishedLoading"
          :pagination="publishedPagination"
          :row-key="row => row.id"
          :scroll="{ x: 820 }"
          size="middle"
          class="author-dashboard-table"
          @change="onPublishedTableChange"
        >
          <template slot="nameCol" slot-scope="text, record">
            <div class="author-dashboard-name-col">
              <a class="author-dashboard-name" @click="viewSales(record)">{{ record.name }}</a>
              <a-tag class="author-dashboard-asset-tag" color="blue">{{ getAssetTypeText(record.asset_type) }}</a-tag>
              <div class="author-dashboard-desc">{{ record.description }}</div>
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
            <div v-if="record.review_note" class="author-dashboard-review-note">
              <a-icon type="message" />
              {{ record.review_note }}
            </div>
          </template>

          <template slot="price" slot-scope="text, record">
            <span v-if="record.pricing_type === 'free' || record.price <= 0" class="author-dashboard-free">
              {{ $t('community.free') }}
            </span>
            <span v-else>
              {{ formatNumber(record.price) }} {{ $t('community.credits') }}
              <a-tag v-if="record.vip_free" color="gold" class="author-dashboard-vip-tag">
                {{ $t('community.vipFree') }}
              </a-tag>
            </span>
          </template>

          <template slot="revenue" slot-scope="text, record">
            <span class="author-dashboard-revenue">{{ formatNumber(record.revenue) }}</span>
          </template>

          <template slot="rating" slot-scope="text, record">
            <span v-if="record.rating_count > 0">
              {{ formatNumber(record.avg_rating) }}
              <a-icon type="star" theme="filled" class="author-dashboard-rating-star" />
              <span class="author-dashboard-rating-count">({{ record.rating_count }})</span>
            </span>
            <span v-else class="author-dashboard-stat-empty">—</span>
          </template>

          <template slot="actions" slot-scope="text, record">
            <a-button type="link" size="small" @click="viewSales(record)">
              {{ $t('authorDashboard.viewSales') }}
            </a-button>
            <a-button type="link" size="small" @click="$emit('view-in-market', record)">
              {{ $t('authorDashboard.viewInMarket') }}
            </a-button>
            <a-button type="link" size="small" class="author-dashboard-danger-link" @click="confirmUnpublish(record)">
              {{ $t('authorDashboard.unpublish') }}
            </a-button>
          </template>
        </a-table>
      </div>

      <div v-show="subTab === 'sales'">

        <div v-if="salesIndicatorFilter" class="author-dashboard-filter-banner">
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
          class="author-dashboard-table"
          @change="onSalesTableChange"
        >
          <template slot="time" slot-scope="text, record">
            {{ formatTime(record.purchase_time) }}
          </template>
          <template slot="buyer" slot-scope="text, record">
            <span class="author-dashboard-buyer">
              <a-avatar :size="22" :src="record.buyer.avatar" />
              <span class="author-dashboard-buyer-name">{{ record.buyer.nickname || $t('authorDashboard.anonymousBuyer') }}</span>
            </span>
          </template>
          <template slot="price" slot-scope="text, record">
            <span v-if="record.price > 0" class="author-dashboard-revenue">
              +{{ formatNumber(record.price) }} {{ $t('community.credits') }}
            </span>
            <span v-else class="author-dashboard-free">{{ $t('community.free') }}</span>
          </template>
        </a-table>
      </div>
    </div>
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
        { title: this.$t('authorDashboard.col.actions'), key: 'actions', width: 230, scopedSlots: { customRender: 'actions' } }
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
      publishedError: false,
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
    onSubTabChange (event) {
      const selected = event && event.target ? event.target.value : this.subTab
      if (selected === 'sales' && this.sales.items.length === 0) {
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
      this.publishedError = false
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
        this.publishedError = true
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
    formatNumber (value, digits = 2) {
      const numericValue = Number(value)
      return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : Number(0).toFixed(digits)
    },
    confirmUnpublish (record) {
      if (!record || !record.id) return
      this.$confirm({
        title: this.$t('authorDashboard.unpublishConfirmTitle'),
        content: this.$t('authorDashboard.unpublishConfirmContent'),
        okText: this.$t('authorDashboard.unpublish'),
        cancelText: this.$t('community.cancelEdit'),
        okType: 'danger',
        onOk: () => this.unpublishAsset(record)
      })
    },
    async unpublishAsset (record) {
      try {
        const res = await request({
          url: `/api/community/author/indicators/${record.id}/unpublish`,
          method: 'post',
          data: { note: '' }
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('authorDashboard.unpublishSuccess'))
          this.refreshAll()
          return
        }
        this.$message.error((res && res.msg) || this.$t('authorDashboard.unpublishFailed'))
      } catch (e) {
        const msg = e && e.response && e.response.data && e.response.data.msg
        this.$message.error(msg || this.$t('authorDashboard.unpublishFailed'))
      }
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
      return this.$t('community.tabIndicators')
    }
  }
}
</script>

<style lang="less" scoped>
.author-dashboard {
  padding: 8px 0 0;
}

.author-dashboard-stat-row {
  margin-bottom: 16px;
}

.author-dashboard-stat-card {
  height: 100%;
  border-radius: 8px;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }
}

.author-dashboard-stat-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 8px;
}

.author-dashboard-stat-value {
  font-size: 26px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  line-height: 1.2;
}

.author-dashboard-stat-value-revenue {
  color: #fa8c16;
}

.author-dashboard-stat-unit {
  font-size: 13px;
  font-weight: normal;
  color: rgba(0, 0, 0, 0.45);
  margin-left: 4px;
}

.author-dashboard-stat-sub {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  min-height: 18px;
}

.author-dashboard-stat-sub-item {
  display: inline-flex;
  align-items: center;
  margin-right: 10px;
  gap: 2px;
}

.author-dashboard-stat-empty {
  color: rgba(0, 0, 0, 0.25);
}

.author-dashboard-rating-star {
  color: #faad14;
  font-size: 14px;
  margin-left: 2px;
}

.author-dashboard-rating-count {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-left: 2px;
}

.author-dashboard-detail {
  background: #fff;
  padding: 12px 16px 4px;
  border-radius: 8px;
}

.author-dashboard-detail-toolbar {
  margin-bottom: 12px;
}

.author-dashboard-tabs {
  display: inline-flex;
  overflow: hidden;
  border-radius: 6px;
}

.author-dashboard-tabs /deep/ .ant-radio-button-wrapper {
  border-radius: 0;
}

.author-dashboard-tabs /deep/ .ant-radio-button-wrapper:first-child {
  border-radius: 6px 0 0 6px;
}

.author-dashboard-tabs /deep/ .ant-radio-button-wrapper:last-child {
  border-radius: 0 6px 6px 0;
}

.author-dashboard-load-error {
  margin-bottom: 12px;
}

.author-dashboard-table {
  margin-top: 4px;
}

.author-dashboard-name-col {
  min-width: 220px;
}

.author-dashboard-name {
  font-weight: 500;
  color: var(--primary-color, #1890ff);
  cursor: pointer;
}

.author-dashboard-asset-tag {
  margin-left: 6px;
}

.author-dashboard-review-note {
  margin-top: 6px;
  color: #cf1322;
  font-size: 12px;
  line-height: 1.45;
  word-break: break-word;

  .anticon {
    margin-right: 4px;
  }
}

.author-dashboard-desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.author-dashboard-free {
  color: #52c41a;
  font-weight: 500;
}

.author-dashboard-vip-tag {
  margin-left: 6px;
}

.author-dashboard-revenue {
  color: #fa8c16;
  font-weight: 600;
}

.author-dashboard-danger-link {
  color: #ff4d4f;
}

.author-dashboard-buyer {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.author-dashboard-buyer-name {
  font-size: 13px;
}

.author-dashboard-filter-banner {
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
  .author-dashboard-stat-label,
  .author-dashboard-stat-sub,
  .author-dashboard-desc,
  .author-dashboard-rating-count { color: rgba(255, 255, 255, 0.55); }
  .author-dashboard-stat-value { color: rgba(255, 255, 255, 0.92); }
  .author-dashboard-stat-empty { color: rgba(255, 255, 255, 0.25); }

  .author-dashboard-stat-card,
  .author-dashboard-detail {
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

  .author-dashboard-filter-banner { background: rgba(24, 144, 255, 0.15); color: rgba(255, 255, 255, 0.85); }
  .author-dashboard-name { color: var(--primary-color-hover, #40a9ff); }
}
</style>
