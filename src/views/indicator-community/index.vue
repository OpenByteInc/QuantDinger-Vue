<template>
  <div class="indicator-community-container" :class="{ 'theme-dark': isDarkTheme }">
    <a-tabs v-model="activeTab" class="admin-tabs" @change="handleTabChange">
      <a-tab-pane key="market" :tab="$t('community.title')">
      </a-tab-pane>
      <a-tab-pane key="author" :tab="$t('community.authorTab')">
      </a-tab-pane>
      <a-tab-pane v-if="isAdmin" key="review">
        <template slot="tab">
          <a-badge :count="reviewStats.pending" :offset="[10, 0]">
            {{ $t('community.admin.reviewTab') }}
          </a-badge>
        </template>
      </a-tab-pane>
    </a-tabs>

    <div v-show="activeTab === 'market'" class="market-header">
      <div class="header-left">
        <h2 class="page-title">
          <a-icon type="shop" />
          {{ $t('community.title') }}
        </h2>
        <a-radio-group
          v-model="marketAssetType"
          button-style="solid"
          class="market-asset-tabs"
          @change="handleMarketAssetTypeChange"
        >
          <a-radio-button value="indicator">{{ $t('community.tabIndicators') }}</a-radio-button>
          <a-radio-button value="script_template">{{ $t('community.tabScriptTemplates') }}</a-radio-button>
          <a-radio-button value="bot_preset">{{ $t('community.tabBotPresets') }}</a-radio-button>
        </a-radio-group>
      </div>
      <div class="header-right">
        <a-input-search
          v-model="filters.keyword"
          :placeholder="$t('community.searchPlaceholder')"
          style="width: 240px"
          allow-clear
          @search="handleSearch"
          @pressEnter="handleSearch"
        />
        <a-radio-group v-model="filters.pricingType" button-style="solid" @change="handleFilterChange">
          <a-radio-button value="">{{ $t('community.all') }}</a-radio-button>
          <a-radio-button value="free">{{ $t('community.freeOnly') }}</a-radio-button>
          <a-radio-button value="paid">{{ $t('community.paidOnly') }}</a-radio-button>
        </a-radio-group>
        <!--
          Sort. Default = composite score, so high-quality indicators
          surface to the top of page 1 without the user having to
          discover the option. The other modes are still useful
          (newest = "what's new", hot = "what's everyone using").
        -->
        <a-select v-model="filters.sortBy" style="width: 160px" @change="handleFilterChange">
          <a-select-option value="score">{{ $t('community.sortScore') }}</a-select-option>
          <a-select-option value="newest">{{ $t('community.sortNewest') }}</a-select-option>
          <a-select-option value="hot">{{ $t('community.sortHot') }}</a-select-option>
          <a-select-option value="rating">{{ $t('community.sortRating') }}</a-select-option>
          <a-select-option value="price_asc">{{ $t('community.sortPriceLow') }}</a-select-option>
          <a-select-option value="price_desc">{{ $t('community.sortPriceHigh') }}</a-select-option>
        </a-select>
        <a-button type="link" @click="showMyPurchases = true">
          <a-icon type="shopping" />
          {{ $t('community.myPurchases') }}
        </a-button>
      </div>
    </div>

    <template v-if="activeTab === 'market'">
      <a-spin :spinning="loading">
        <div v-if="indicators.length === 0 && !loading" class="empty-state">
          <a-empty :description="marketEmptyDescription">
            <a-button v-if="marketAssetType === 'indicator'" type="primary" @click="goToCreate">
              {{ $t('community.createFirst') }}
            </a-button>
            <a-button v-else-if="marketAssetType === 'bot_preset'" type="primary" @click="goToTradingBot">
              {{ $t('community.createBotPreset') }}
            </a-button>
          </a-empty>
        </div>
        <div v-else class="indicator-grid">
          <indicator-card
            v-for="item in indicators"
            :key="item.id"
            :indicator="item"
            @click="openDetail(item)"
          />
        </div>
      </a-spin>

      <div v-if="pagination.total > 0" class="pagination-wrapper">
        <a-pagination
          :current="pagination.current"
          :total="pagination.total"
          :page-size="pagination.pageSize"
          :show-total="(total) => `${$t('community.total')} ${total} ${$t('community.items')}`"
          show-quick-jumper
          @change="handlePageChange"
        />
      </div>
    </template>

    <template v-if="activeTab === 'author'">
      <author-dashboard
        :is-dark-theme="isDarkTheme"
        @view-in-market="handleViewInMarket"
      />
    </template>

    <template v-if="activeTab === 'review' && isAdmin">
      <div class="review-panel">
        <div class="review-header">
          <a-radio-group v-model="reviewFilter" button-style="solid" @change="loadPendingIndicators">
            <a-radio-button value="pending">
              <a-badge :count="reviewStats.pending" :offset="[8, -2]" :number-style="{ backgroundColor: '#faad14' }">
                {{ $t('community.admin.pending') }}
              </a-badge>
            </a-radio-button>
            <a-radio-button value="approved">
              {{ $t('community.admin.approved') }} ({{ reviewStats.approved }})
            </a-radio-button>
            <a-radio-button value="rejected">
              {{ $t('community.admin.rejected') }} ({{ reviewStats.rejected }})
            </a-radio-button>
          </a-radio-group>
        </div>

        <a-spin :spinning="reviewLoading">
          <div v-if="pendingIndicators.length === 0 && !reviewLoading" class="empty-state">
            <a-empty :description="$t('community.admin.noItems')" />
          </div>
          <div v-else class="review-list">
            <div v-for="item in pendingIndicators" :key="item.id" class="review-item">
              <div class="review-item-header">
                <div class="item-info">
                  <span class="item-name">{{ item.name }}</span>
                  <a-tag color="blue">{{ getAssetTypeText(item.asset_type) }}</a-tag>
                  <a-tag v-if="item.pricing_type === 'free'" color="green">{{ $t('community.free') }}</a-tag>
                  <a-tag v-else color="orange">{{ item.price }} {{ $t('community.credits') }}</a-tag>
                  <a-tag :color="getStatusColor(item.review_status)">{{ getStatusText(item.review_status) }}</a-tag>
                </div>
                <div class="item-author">
                  <a-avatar :src="item.author.avatar" size="small" />
                  <span>{{ item.author.nickname || item.author.username }}</span>
                  <span class="item-time">{{ formatDate(item.created_at) }}</span>
                </div>
              </div>

              <div class="review-item-body">
                <div class="item-desc">{{ item.description || $t('community.admin.noDescription') }}</div>
                <div v-if="item.code" class="item-code">
                  <a-button type="link" size="small" @click="toggleCode(item.id)">
                    <a-icon :type="expandedCodes[item.id] ? 'up' : 'down'" />
                    {{ $t('community.admin.viewCode') }}
                  </a-button>
                  <pre v-if="expandedCodes[item.id]" class="code-preview">{{ item.code }}</pre>
                </div>
                <div v-if="item.review_note" class="review-note">
                  <a-icon type="info-circle" />
                  {{ $t('community.admin.note') }}: {{ item.review_note }}
                </div>
              </div>

              <div class="review-item-actions">
                <template v-if="item.review_status === 'pending'">
                  <a-button type="primary" size="small" @click="handleReview(item, 'approve')">
                    <a-icon type="check" />
                    {{ $t('community.admin.approve') }}
                  </a-button>
                  <a-button type="danger" size="small" @click="handleReview(item, 'reject')">
                    <a-icon type="close" />
                    {{ $t('community.admin.reject') }}
                  </a-button>
                </template>
                <template v-else-if="item.review_status === 'approved'">
                  <a-button size="small" @click="handleUnpublish(item)">
                    <a-icon type="stop" />
                    {{ $t('community.admin.unpublish') }}
                  </a-button>
                </template>
                <a-popconfirm
                  :title="$t('community.admin.deleteConfirm')"
                  @confirm="handleDelete(item)"
                >
                  <a-button type="link" size="small" class="delete-btn">
                    <a-icon type="delete" />
                    {{ $t('community.admin.delete') }}
                  </a-button>
                </a-popconfirm>
              </div>
            </div>
          </div>
        </a-spin>

        <div v-if="reviewPagination.total > 0" class="pagination-wrapper">
          <a-pagination
            :current="reviewPagination.current"
            :total="reviewPagination.total"
            :page-size="reviewPagination.pageSize"
            :show-total="(total) => `${$t('community.total')} ${total} ${$t('community.items')}`"
            @change="handleReviewPageChange"
          />
        </div>
      </div>
    </template>

    <a-modal
      v-model="showReviewModal"
      :title="reviewAction === 'approve' ? $t('community.admin.approveTitle') : $t('community.admin.rejectTitle')"
      :ok-text="reviewAction === 'approve' ? $t('community.admin.approve') : $t('community.admin.reject')"
      :ok-button-props="{ props: { type: reviewAction === 'approve' ? 'primary' : 'danger' } }"
      @ok="submitReview"
    >
      <a-form layout="vertical">
        <a-form-item :label="$t('community.admin.noteLabel')">
          <a-textarea
            v-model="reviewNote"
            :placeholder="$t('community.admin.notePlaceholder')"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <indicator-detail
      :visible="detailVisible"
      :indicator-id="selectedIndicatorId"
      :current-user-id="currentUserId"
      @close="detailVisible = false"
      @purchased="handlePurchased"
    />

    <a-modal
      v-model="showMyPurchases"
      :title="$t('community.myPurchases')"
      :footer="null"
      width="640px"
      :wrap-class-name="myPurchasesWrapClass"
    >
      <a-spin :spinning="purchasesLoading">
        <div v-if="myPurchases.length === 0" class="empty-purchases">
          <a-empty :description="$t('community.noPurchases')" />
        </div>
        <a-list v-else :data-source="myPurchases" item-layout="horizontal" class="my-purchases-list">
          <a-list-item slot="renderItem" slot-scope="item">
            <a-list-item-meta>
              <template #title>
                <a class="purchase-item-title" @click="openDetailById(item.indicator.id)">{{ item.indicator.name }}</a>
              </template>
              <template #description>
                <div class="purchase-item-meta">
                  <span class="meta-label">{{ $t('community.purchasedFrom') }}:</span>
                  <span class="meta-value">{{ item.seller.nickname }}</span>
                </div>
                <div class="purchase-item-meta">
                  <span class="meta-label">{{ $t('community.purchaseTime') }}:</span>
                  <span class="meta-value">{{ formatDate(item.purchase_time) }}</span>
                </div>
                <div class="purchase-item-meta purchase-item-price">
                  <span class="meta-label">{{ $t('community.yourPurchasePrice') }}:</span>
                  <span v-if="(item.purchase_price || 0) > 0" class="price-tag price-tag--paid">
                    {{ formatPurchasePrice(item.purchase_price) }}&nbsp;{{ $t('community.credits') }}
                  </span>
                  <span v-else class="price-tag price-tag--free">{{ $t('community.free') }}</span>
                </div>
              </template>
            </a-list-item-meta>
            <template #actions>
              <a-button
                type="link"
                size="small"
                :loading="!!restoringPurchaseIds[item.purchase_id]"
                @click="goToUse(item)"
              >
                {{ usePurchaseActionLabel(item) }}
              </a-button>
            </template>
          </a-list-item>
        </a-list>
      </a-spin>
    </a-modal>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import IndicatorCard from './components/IndicatorCard.vue'
import IndicatorDetail from './components/IndicatorDetail.vue'
import AuthorDashboard from './components/AuthorDashboard.vue'
import request from '@/utils/request'

export default {
  name: 'IndicatorCommunity',
  components: {
    IndicatorCard,
    IndicatorDetail,
    AuthorDashboard
  },
  computed: {
    ...mapState({
      currentUserId: state => state.user.info?.id || state.user.info?.userId,
      userRole: state => state.user.info?.role,
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    myPurchasesWrapClass () {
      const base = 'qd-my-purchases-modal'
      return this.isDarkTheme ? `${base} ${base}--dark` : base
    },
    isAdmin () {
      if (!this.userRole) return false
      const roleId = this.userRole.id || this.userRole
      return roleId === 'admin'
    },
    marketEmptyDescription () {
      if (this.marketAssetType === 'script_template') {
        return this.$t('community.scriptTemplatesEmpty')
      }
      if (this.marketAssetType === 'bot_preset') {
        return this.$t('community.botPresetsEmpty')
      }
      return this.$t('community.noIndicators')
    }
  },
  data () {
    return {
      loading: false,
      marketAssetType: 'indicator',
      indicators: [],
      filters: {
        keyword: '',
        pricingType: '',
        // 'score' = composite multi-factor scoring (return / sharpe /
        // drawdown / win-rate / stability), see backend
        // services/community_service.py::_summarise_indicator_runs.
        // Default landing puts the best-scoring indicators on page 1.
        sortBy: 'score'
      },
      pagination: {
        current: 1,
        pageSize: 12,
        total: 0
      },
      detailVisible: false,
      selectedIndicatorId: null,
      showMyPurchases: false,
      purchasesLoading: false,
      restoringPurchaseIds: {},
      myPurchases: [],
      activeTab: 'market',
      reviewFilter: 'pending',
      reviewLoading: false,
      pendingIndicators: [],
      reviewPagination: {
        current: 1,
        pageSize: 20,
        total: 0
      },
      reviewStats: {
        pending: 0,
        approved: 0,
        rejected: 0
      },
      expandedCodes: {},
      showReviewModal: false,
      reviewAction: 'approve',
      reviewNote: '',
      reviewingIndicator: null
    }
  },
  watch: {
    showMyPurchases (val) {
      if (val) {
        this.loadMyPurchases()
      }
    },
    isAdmin: {
      immediate: true,
      handler (val) {
        if (val) {
          this.loadReviewStats()
        }
      }
    }
  },
  mounted () {
    const q = this.$route.query
    if (q && q.asset_type) {
      this.marketAssetType = String(q.asset_type)
    }
    this.loadIndicators()
  },
  methods: {
    async loadIndicators () {
      this.loading = true
      try {
        const res = await request({
          url: '/api/community/indicators',
          method: 'get',
          params: {
            page: this.pagination.current,
            page_size: this.pagination.pageSize,
            keyword: this.filters.keyword || undefined,
            pricing_type: this.filters.pricingType || undefined,
            sort_by: this.filters.sortBy,
            asset_type: this.marketAssetType
          }
        })
        if (res.code === 1) {
          this.indicators = res.data.items || []
          this.pagination.total = Number(res.data.total || 0)
          // Keep current page in range if backend total changed.
          const totalPages = Math.max(1, Math.ceil(this.pagination.total / this.pagination.pageSize))
          if (this.pagination.current > totalPages) {
            this.pagination.current = totalPages
          }
        } else {
          this.$message.error(res.msg || this.$t('community.loadFailed'))
        }
      } catch (e) {
        console.error('Load indicators failed:', e)
        this.$message.error(this.$t('community.loadFailed'))
      } finally {
        this.loading = false
      }
    },

    async loadMyPurchases () {
      this.purchasesLoading = true
      try {
        const res = await request({
          url: '/api/community/my-purchases',
          method: 'get',
          params: { page: 1, page_size: 50 }
        })
        if (res.code === 1) {
          this.myPurchases = res.data.items || []
        }
      } catch (e) {
        console.error('Load purchases failed:', e)
      } finally {
        this.purchasesLoading = false
      }
    },

    handleSearch () {
      this.pagination.current = 1
      this.loadIndicators()
    },

    handleFilterChange () {
      this.pagination.current = 1
      this.loadIndicators()
    },

    handleMarketAssetTypeChange () {
      this.pagination.current = 1
      this.loadIndicators()
    },

    handlePageChange (page) {
      this.pagination.current = Number(page || 1)
      this.loadIndicators()
    },

    openDetail (indicator) {
      this.selectedIndicatorId = indicator.id
      this.detailVisible = true
    },

    openDetailById (id) {
      this.showMyPurchases = false
      this.selectedIndicatorId = id
      this.detailVisible = true
    },

    handlePurchased () {
      this.loadIndicators()
    },

    goToCreate () {
      this.$router.push('/indicator-ide')
    },

    goToTradingBot () {
      this.$router.push('/trading-bot')
    },

    usePurchaseActionLabel (item) {
      if (item && item.local_copy_missing) {
        return this.$t('community.restoreCopy')
      }
      const assetType = item && item.indicator && item.indicator.asset_type
      if (assetType === 'script_template') {
        return this.$t('community.useScriptStrategy')
      }
      if (assetType === 'bot_preset') {
        return this.$t('community.useBotPreset')
      }
      return this.$t('community.useNow')
    },

    async goToUse (item) {
      if (item && item.local_copy_missing) {
        const restored = await this.restorePurchaseCopy(item)
        if (!restored) return
      }
      this.showMyPurchases = false
      const indicator = item && item.indicator
      const assetType = (indicator && indicator.asset_type) || 'indicator'
      if (assetType === 'script_template') {
        const sid = (item && (item.script_source_id || item.purchased_script_source_id)) || (indicator && (indicator.script_source_id || indicator.purchased_script_source_id))
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
        const sid = (item && item.purchased_strategy_id) || (indicator && indicator.purchased_strategy_id)
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

    async restorePurchaseCopy (item) {
      const indicatorId = item && item.indicator && item.indicator.id
      if (!indicatorId) return false
      this.$set(this.restoringPurchaseIds, item.purchase_id, true)
      try {
        const res = await request({
          url: `/api/community/indicators/${indicatorId}/sync`,
          method: 'post'
        })
        if (res && res.code === 1) {
          const data = res.data || {}
          this.$message.success(this.$t(res.msg === 'restored' ? 'community.restoreCopySuccess' : 'community.syncCodeSuccess'))
          item.local_copy_missing = false
          item.local_copy_exists = true
          item.restore_available = false
          if (data.script_source_id) {
            item.script_source_id = data.script_source_id
            item.purchased_script_source_id = data.script_source_id
          }
          if (data.strategy_id) {
            item.purchased_strategy_id = data.strategy_id
          }
          if (data.local_copy_id) {
            item.local_copy_id = data.local_copy_id
          }
          await this.loadMyPurchases()
          return true
        }
        const msgKey = `community.${res && res.msg}`
        this.$message.error(this.$te(msgKey) ? this.$t(msgKey) : this.$t('community.restoreCopyFailed'))
        return false
      } catch (e) {
        const backendMsg = e && e.response && e.response.data && e.response.data.msg
        const msgKey = backendMsg ? `community.${backendMsg}` : ''
        this.$message.error(msgKey && this.$te(msgKey) ? this.$t(msgKey) : this.$t('community.restoreCopyFailed'))
        return false
      } finally {
        this.$delete(this.restoringPurchaseIds, item.purchase_id)
      }
    },

    formatDate (dateStr) {
      if (!dateStr) return '-'
      return new Date(dateStr).toLocaleString()
    },

    /** Format the price the buyer actually paid. Integer credits are
     * printed without decimals; fractional credits keep up to 2 dp. */
    formatPurchasePrice (val) {
      const n = parseFloat(val)
      if (isNaN(n)) return '0'
      return Number.isInteger(n) ? String(n) : n.toFixed(2)
    },


    handleTabChange (tab) {
      if (tab === 'review') {
        this.loadPendingIndicators()
        this.loadReviewStats()
      }
    },

    handleViewInMarket (record) {
      this.activeTab = 'market'
      this.selectedIndicatorId = record.id
      this.detailVisible = true
    },

    async loadReviewStats () {
      try {
        const res = await request({
          url: '/api/community/admin/review-stats',
          method: 'get'
        })
        if (res.code === 1) {
          this.reviewStats = res.data || { pending: 0, approved: 0, rejected: 0 }
        }
      } catch (e) {
        console.error('Load review stats failed:', e)
      }
    },

    async loadPendingIndicators () {
      this.reviewLoading = true
      try {
        const res = await request({
          url: '/api/community/admin/pending-indicators',
          method: 'get',
          params: {
            page: this.reviewPagination.current,
            page_size: this.reviewPagination.pageSize,
            review_status: this.reviewFilter
          }
        })
        if (res.code === 1) {
          this.pendingIndicators = res.data.items || []
          this.reviewPagination.total = Number(res.data.total || 0)
        }
      } catch (e) {
        console.error('Load pending indicators failed:', e)
        this.$message.error(this.$t('community.admin.loadFailed'))
      } finally {
        this.reviewLoading = false
      }
    },

    handleReviewPageChange (page) {
      this.reviewPagination.current = Number(page || 1)
      this.loadPendingIndicators()
    },

    toggleCode (id) {
      this.$set(this.expandedCodes, id, !this.expandedCodes[id])
    },

    getStatusColor (status) {
      const colors = {
        pending: 'orange',
        approved: 'green',
        rejected: 'red'
      }
      return colors[status] || 'default'
    },

    getStatusText (status) {
      const texts = {
        pending: this.$t('community.admin.pending'),
        approved: this.$t('community.admin.approved'),
        rejected: this.$t('community.admin.rejected')
      }
      return texts[status] || status
    },

    getAssetTypeText (assetType) {
      const type = assetType || 'indicator'
      if (type === 'script_template') return this.$t('community.tabScriptTemplates')
      if (type === 'bot_preset') return this.$t('community.tabBotPresets')
      return this.$t('community.tabIndicators')
    },

    handleReview (indicator, action) {
      this.reviewingIndicator = indicator
      this.reviewAction = action
      this.reviewNote = ''
      this.showReviewModal = true
    },

    async submitReview () {
      if (!this.reviewingIndicator) return

      try {
        const res = await request({
          url: `/api/community/admin/indicators/${this.reviewingIndicator.id}/review`,
          method: 'post',
          data: {
            action: this.reviewAction,
            note: this.reviewNote
          }
        })
        if (res.code === 1) {
          this.$message.success(this.$t('community.admin.reviewSuccess'))
          this.showReviewModal = false
          this.loadPendingIndicators()
          this.loadReviewStats()
        } else {
          this.$message.error(res.msg || this.$t('community.admin.reviewFailed'))
        }
      } catch (e) {
        console.error('Review failed:', e)
        this.$message.error(this.$t('community.admin.reviewFailed'))
      }
    },

    async handleUnpublish (indicator) {
      this.$confirm({
        title: this.$t('community.admin.unpublishConfirm'),
        content: this.$t('community.admin.unpublishHint'),
        okText: this.$t('community.admin.confirm'),
        cancelText: this.$t('community.admin.cancel'),
        onOk: async () => {
          try {
            const res = await request({
              url: `/api/community/admin/indicators/${indicator.id}/unpublish`,
              method: 'post',
              data: { note: '' }
            })
            if (res.code === 1) {
              this.$message.success(this.$t('community.admin.unpublishSuccess'))
              this.loadPendingIndicators()
              this.loadReviewStats()
            } else {
              this.$message.error(res.msg || this.$t('community.admin.unpublishFailed'))
            }
          } catch (e) {
            console.error('Unpublish failed:', e)
            this.$message.error(this.$t('community.admin.unpublishFailed'))
          }
        }
      })
    },

    async handleDelete (indicator) {
      try {
        const res = await request({
          url: `/api/community/admin/indicators/${indicator.id}`,
          method: 'delete'
        })
        if (res.code === 1) {
          this.$message.success(this.$t('community.admin.deleteSuccess'))
          this.loadPendingIndicators()
          this.loadReviewStats()
        } else {
          this.$message.error(res.msg || this.$t('community.admin.deleteFailed'))
        }
      } catch (e) {
        console.error('Delete failed:', e)
        this.$message.error(this.$t('community.admin.deleteFailed'))
      }
    }
  }
}
</script>

<style lang="less" scoped>
.indicator-community-container {
  padding: 24px;
  min-height: calc(100vh - 120px);
  background: #f5f5f5;

  .market-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 16px 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .page-title {
        margin: 0;
        font-size: 20px;
        font-weight: 600;

        .anticon {
          margin-right: 8px;
          color: var(--primary-color, #1890ff);
        }
      }

      .market-asset-tabs {
        align-self: flex-start;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
  }

  .indicator-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }

  .empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    background: #fff;
    border-radius: 8px;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 32px;
    padding: 16px;
    background: #fff;
    border-radius: 8px;
  }

  .empty-purchases {
    padding: 40px 0;
  }

  .admin-tabs {
    margin-bottom: 16px;
    padding: 0 20px;
    background: #fff;
    border-radius: 8px;
  }

  .review-panel {
    .review-header {
      margin-bottom: 20px;
      padding: 16px 20px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .review-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .review-item {
      background: #fff;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

      .review-item-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;

        .item-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;

          .item-name {
            font-size: 16px;
            font-weight: 600;
          }
        }

        .item-author {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #666;

          .item-time {
            color: #999;
          }
        }
      }

      .review-item-body {
        margin-bottom: 16px;

        .item-desc {
          color: #666;
          margin-bottom: 8px;
          line-height: 1.6;
        }

        .item-code {
          .code-preview {
            margin-top: 8px;
            padding: 12px;
            background: #f5f5f5;
            border-radius: 4px;
            font-size: 12px;
            max-height: 300px;
            overflow: auto;
            white-space: pre-wrap;
            word-break: break-all;
          }
        }

        .review-note {
          margin-top: 12px;
          padding: 8px 12px;
          background: #fff7e6;
          border-radius: 4px;
          color: #d46b08;
          font-size: 13px;

          .anticon {
            margin-right: 6px;
          }
        }
      }

      .review-item-actions {
        display: flex;
        gap: 12px;
        padding-top: 12px;
        border-top: 1px solid #f0f0f0;

        .delete-btn {
          color: #ff4d4f;
          margin-left: auto;
        }
      }
    }
  }
}

.indicator-community-container.theme-dark {
  background: #141414;

  .admin-tabs {
    background: #1f1f1f;

    ::v-deep .ant-tabs-nav .ant-tabs-tab {
      color: rgba(255, 255, 255, 0.65);
      &.ant-tabs-tab-active {
        color: var(--primary-color, #1890ff);
      }
    }
  }

  .review-panel {
    .review-header {
      background: #1f1f1f;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .review-item {
      background: #1f1f1f;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

      .item-name {
        color: rgba(255, 255, 255, 0.85);
      }

      .item-author {
        color: rgba(255, 255, 255, 0.45);

        .item-time {
          color: rgba(255, 255, 255, 0.35);
        }
      }

      .item-desc {
        color: rgba(255, 255, 255, 0.65);
      }

      .item-code .code-preview {
        background: #262626;
        color: rgba(255, 255, 255, 0.85);
      }

      .review-note {
        background: rgba(250, 173, 20, 0.1);
        color: #ffc53d;
      }

      .review-item-actions {
        border-color: #303030;
      }
    }
  }

  .market-header {
    background: #1f1f1f;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

    .page-title {
      color: rgba(255, 255, 255, 0.85);
    }
  }

  .empty-state,
  .pagination-wrapper {
    background: #1f1f1f;
  }

  ::v-deep .indicator-card {
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
    }
  }

  ::v-deep .ant-input {
    background: #262626;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.85);

    &::placeholder {
      color: rgba(255, 255, 255, 0.35);
    }
  }

  ::v-deep .ant-input-search-icon {
    color: rgba(255, 255, 255, 0.45);
  }

  ::v-deep .ant-radio-group {
    .ant-radio-button-wrapper {
      background: #262626;
      border-color: #434343;
      color: rgba(255, 255, 255, 0.65);

      &:hover {
        color: var(--primary-color, #1890ff);
      }

      &.ant-radio-button-wrapper-checked {
        background: var(--primary-color, #1890ff);
        border-color: var(--primary-color, #1890ff);
        color: #fff;
      }
    }
  }

  ::v-deep .ant-select {
    .ant-select-selection {
      background: #262626;
      border-color: #434343;
      color: rgba(255, 255, 255, 0.85);
    }

    .ant-select-arrow {
      color: rgba(255, 255, 255, 0.45);
    }
  }

  ::v-deep .ant-btn-link {
    color: var(--primary-color, #1890ff);
  }

  ::v-deep .ant-pagination {
    .ant-pagination-item {
      background: #262626;
      border-color: #434343;

      a {
        color: rgba(255, 255, 255, 0.85);
      }

      &.ant-pagination-item-active {
        background: var(--primary-color, #1890ff);
        border-color: var(--primary-color, #1890ff);

        a {
          color: #fff;
        }
      }
    }

    .ant-pagination-prev,
    .ant-pagination-next {
      .ant-pagination-item-link {
        background: #262626;
        border-color: #434343;
        color: rgba(255, 255, 255, 0.65);
      }
    }

    .ant-pagination-options-quick-jumper {
      color: rgba(255, 255, 255, 0.65);

      input {
        background: #262626;
        border-color: #434343;
        color: rgba(255, 255, 255, 0.85);
      }
    }

    .ant-pagination-total-text {
      color: rgba(255, 255, 255, 0.65);
    }
  }

  ::v-deep .ant-modal-content {
    background: #1f1f1f;

    .ant-modal-header {
      background: #1f1f1f;
      border-color: #303030;

      .ant-modal-title {
        color: rgba(255, 255, 255, 0.85);
      }
    }

    .ant-modal-close-x {
      color: rgba(255, 255, 255, 0.45);
    }

    .ant-list-item-meta-title a {
      color: var(--primary-color, #1890ff);
    }

    .ant-list-item-meta-description {
      color: rgba(255, 255, 255, 0.45);
    }

    .ant-list-item {
      border-color: #303030;
    }
  }
}

@media (max-width: 768px) {
  .indicator-community-container {
    padding: 12px;

    .market-header {
      flex-direction: column;
      gap: 16px;

      .header-right {
        flex-wrap: wrap;
        justify-content: center;
      }
    }

    .indicator-grid {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
  }
}
</style>

<!--
  Non-scoped style block.

  Ant Modal portals its DOM out to <body>, so the scoped rules above
  cannot reach the modal's content via class scoping alone. We give the
  modal a stable wrap class (qd-my-purchases-modal[-dark]) and style it
  globally here. The .qd-my-purchases-modal prefix keeps these rules
  from leaking to other modals.
-->
<style lang="less">
.qd-my-purchases-modal {
  .my-purchases-list {
    .ant-list-item {
      padding: 14px 0;
    }

    .purchase-item-title {
      font-size: 15px;
      font-weight: 600;
    }

    .purchase-item-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      line-height: 1.8;

      .meta-label {
        color: rgba(0, 0, 0, 0.45);
        flex-shrink: 0;
      }

      .meta-value {
        color: rgba(0, 0, 0, 0.75);
      }
    }

    .purchase-item-price {
      margin-top: 4px;

      .price-tag {
        display: inline-flex;
        align-items: center;
        padding: 1px 8px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 13px;

        &--paid {
          background: rgba(245, 34, 45, 0.08);
          color: #f5222d;
        }

        &--free {
          background: rgba(82, 196, 26, 0.12);
          color: #52c41a;
        }
      }
    }
  }
}

.qd-my-purchases-modal--dark {
  .ant-modal-content {
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.85);
  }

  .ant-modal-header {
    background: #1f1f1f;
    border-bottom-color: #303030;

    .ant-modal-title {
      color: rgba(255, 255, 255, 0.88);
    }
  }

  .ant-modal-close {
    color: rgba(255, 255, 255, 0.55);

    &:hover {
      color: rgba(255, 255, 255, 0.88);
    }
  }

  .empty-purchases .ant-empty-description {
    color: rgba(255, 255, 255, 0.45);
  }

  .my-purchases-list {
    .ant-list-item {
      border-color: #303030;
    }

    .purchase-item-title {
      color: var(--primary-color, #69c0ff);

      &:hover {
        color: var(--primary-color-hover, #40a9ff);
      }
    }

    .purchase-item-meta {
      .meta-label {
        color: rgba(255, 255, 255, 0.45);
      }

      .meta-value {
        color: rgba(255, 255, 255, 0.85);
      }
    }

    .purchase-item-price .price-tag {
      &--paid {
        background: rgba(245, 34, 45, 0.15);
        color: #ff7875;
      }

      &--free {
        background: rgba(82, 196, 26, 0.18);
        color: #95de64;
      }
    }

    .ant-list-item-meta-description {
      color: rgba(255, 255, 255, 0.65);
    }

    .ant-btn-link {
      color: var(--primary-color, #69c0ff);

      &:hover {
        color: var(--primary-color-hover, #40a9ff);
      }
    }
  }
}
</style>
