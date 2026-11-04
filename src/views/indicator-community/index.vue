<template>
  <div class="indicator-community-container qd-workspace-page qd-page-frame" :class="{ 'theme-dark': isDarkTheme }">
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

    <template v-if="activeTab === 'market'">
      <div class="market-catalog-shell">
        <div class="market-catalog-toolbar">
          <div class="market-catalog-toolbar__top">
            <a-radio-group
              v-model="marketAssetType"
              button-style="solid"
              class="market-asset-tabs"
              @change="handleMarketAssetTypeChange"
            >
              <a-radio-button value="indicator">
                {{ $t('community.tabIndicators') }} ({{ marketAssetCounts.indicator }})
              </a-radio-button>
              <a-radio-button value="script_template">
                {{ $t('community.tabScriptTemplates') }} ({{ marketAssetCounts.script_template }})
              </a-radio-button>
            </a-radio-group>
            <a-button type="link" class="market-purchases-btn" @click="showMyPurchases = true">
              <a-icon type="shopping" />
              {{ $t('community.myPurchases') }}
            </a-button>
          </div>

          <div class="market-catalog-toolbar__discovery">
            <a-radio-group v-model="filters.sortBy" button-style="solid" class="market-discovery-tabs" @change="handleDiscoverySortChange">
              <a-tooltip v-for="option in marketDiscoveryOptions" :key="option.value" :title="option.hint">
                <a-radio-button :value="option.value">
                  {{ option.label }}
                  <span v-if="option.value === 'newest' && marketNewAssetCounts[marketAssetType]" class="market-new-count">
                    {{ marketNewAssetCounts[marketAssetType] }}
                  </span>
                </a-radio-button>
              </a-tooltip>
            </a-radio-group>
            <a-input-search
              v-model="filters.keyword"
              :placeholder="marketSearchPlaceholder"
              class="market-search"
              allow-clear
              @search="handleSearch"
              @pressEnter="handleSearch"
            />
            <a-select v-model="filters.sortBy" class="market-sort-select" @change="handleDiscoverySortChange">
              <a-select-option v-for="option in marketDiscoveryOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </a-select-option>
            </a-select>
            <a-radio-group v-model="marketViewMode" button-style="solid" class="market-view-toggle">
              <a-radio-button value="compact"><a-icon type="unordered-list" /> {{ $t('community.catalog.compactList') }}</a-radio-button>
              <a-radio-button value="grid"><a-icon type="appstore" /> {{ $t('community.catalog.visualGrid') }}</a-radio-button>
            </a-radio-group>
          </div>
        </div>

        <div class="market-catalog-workspace">
          <aside class="market-filter-rail">
            <div class="market-filter-rail__head">
              <strong>
                <a-icon type="filter" /> {{ $t('community.catalog.filters') }}
                <span v-if="activeMarketFilterCount" class="market-filter-count">{{ activeMarketFilterCount }}</span>
              </strong>
              <a-button type="link" size="small" :disabled="!activeMarketFilterCount" @click="resetMarketFilters">
                {{ $t('community.catalog.clearAll') }}
              </a-button>
            </div>

            <section class="market-filter-section">
              <h4>{{ $t('community.catalog.price') }}</h4>
              <a-radio-group v-model="filters.pricingType" class="market-filter-options" @change="handleFilterChange">
                <a-radio value="">{{ $t('community.all') }}</a-radio>
                <a-radio value="free">{{ $t('community.freeOnly') }}</a-radio>
                <a-radio value="paid">{{ $t('community.paidOnly') }}</a-radio>
                <a-radio value="vip_free">{{ $t('community.vipFree') }}</a-radio>
              </a-radio-group>
              <div class="market-price-range">
                <a-input-number v-model="filters.minPrice" :min="0" :precision="0" :placeholder="$t('community.minPrice')" />
                <span>–</span>
                <a-input-number v-model="filters.maxPrice" :min="0" :precision="0" :placeholder="$t('community.maxPrice')" />
              </div>
              <a-button size="small" block @click="handleFilterChange">{{ $t('community.applyFilters') }}</a-button>
            </section>

            <section class="market-filter-section">
              <h4>{{ $t('community.codeVisibility') }}</h4>
              <a-radio-group v-model="filters.codeVisibility" class="market-filter-options" @change="handleFilterChange">
                <a-radio value="">{{ $t('community.all') }}</a-radio>
                <a-radio value="visible">{{ $t('community.codeVisible') }}</a-radio>
                <a-radio value="hidden">{{ $t('community.codeHidden') }}</a-radio>
              </a-radio-group>
            </section>

            <template v-if="marketAssetType === 'script_template'">
              <section class="market-filter-section">
                <h4>{{ $t('community.catalog.market') }}</h4>
                <a-select v-model="filters.market" :placeholder="$t('community.all')" allow-clear @change="handleFilterChange">
                  <a-select-option v-for="option in strategyMarketOptions" :key="option.value" :value="option.value">
                    {{ strategyMarketLabel(option) }}
                  </a-select-option>
                </a-select>
              </section>
              <section class="market-filter-section">
                <h4>{{ $t('community.filterStrategyType') }}</h4>
                <a-select v-model="filters.strategyType" :placeholder="$t('community.all')" allow-clear @change="handleFilterChange">
                  <a-select-option value="cta">{{ $t('community.strategyType.cta') }}</a-select-option>
                  <a-select-option value="portfolio">{{ $t('community.strategyType.portfolio') }}</a-select-option>
                </a-select>
              </section>
              <section class="market-filter-section">
                <h4>{{ $t('community.filterDirection') }}</h4>
                <a-select v-model="filters.directionMode" :placeholder="$t('community.all')" allow-clear @change="handleFilterChange">
                  <a-select-option v-for="value in strategyDirections" :key="value" :value="value">{{ $t(`community.direction.${value}`) }}</a-select-option>
                </a-select>
              </section>
              <section class="market-filter-section">
                <h4>{{ $t('community.filterBinding') }}</h4>
                <a-select v-model="filters.bindingMode" :placeholder="$t('community.all')" allow-clear @change="handleFilterChange">
                  <a-select-option v-for="value in strategyBindingModes" :key="value" :value="value">{{ $t(`community.binding.${value}`) }}</a-select-option>
                </a-select>
              </section>
            </template>
          </aside>

          <main ref="marketResultsStart" class="market-results">
            <div v-if="marketAssetType === 'script_template'" class="market-strategy-risk">
              <a-icon type="safety-certificate" />
              <span>{{ $t('community.catalog.strategyRiskNote') }}</span>
            </div>
            <div class="market-result-summary">
              <span>{{ $t('community.catalog.showing', { shown: indicators.length, total: pagination.total }) }}</span>
            </div>

            <a-spin :spinning="loading && pagination.current === 1">
              <a-empty v-if="indicators.length === 0 && !loading" class="market-empty" :description="$t('community.catalog.emptyTitle')">
                <a-button type="primary" ghost @click="resetMarketFilters">{{ $t('community.catalog.clearFilters') }}</a-button>
              </a-empty>
              <market-catalog-list
                v-else-if="marketViewMode === 'compact'"
                :items="indicators"
                :asset-type="marketAssetType"
                :is-dark-theme="isDarkTheme"
                :sort-key="catalogSort.key"
                :sort-order="catalogSort.order"
                @open="openDetail"
                @sort-change="handleCatalogSortChange"
              />
              <div v-else class="indicator-grid">
                <indicator-card
                  v-for="item in indicators"
                  :key="item.id"
                  :indicator="item"
                  @click="openDetail(item)"
                />
              </div>
            </a-spin>

            <div v-if="hasMoreMarketItems" class="market-load-more">
              <a-button :loading="loading && pagination.current > 1" @click="loadMoreMarketItems">
                {{ $t('community.loadMore') }}
                <a-icon type="down" />
              </a-button>
            </div>
          </main>
        </div>

        <div class="market-risk-tip">
          <a-icon type="safety-certificate" />
          <span>{{ $t('community.marketRiskTip') }}</span>
        </div>
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
          <div class="review-header__status">
            <a-radio-group v-model="reviewFilter" button-style="solid" class="review-status-tabs" @change="handleReviewStatusChange">
              <a-radio-button value="pending">
                {{ $t('community.admin.pending') }} ({{ reviewStats.pending }})
              </a-radio-button>
              <a-radio-button value="approved">
                {{ $t('community.admin.approved') }} ({{ reviewStats.approved }})
              </a-radio-button>
              <a-radio-button value="rejected">
                {{ $t('community.admin.rejected') }} ({{ reviewStats.rejected }})
              </a-radio-button>
            </a-radio-group>
          </div>
          <div class="review-header__filters">
            <a-input-search
              v-model="reviewFilters.keyword"
              :placeholder="$t('community.admin.searchPlaceholder')"
              allow-clear
              class="review-search"
              @search="handleReviewFilterChange"
              @pressEnter="handleReviewFilterChange"
            />
            <a-select v-model="reviewFilters.assetType" class="review-select" @change="handleReviewFilterChange">
              <a-select-option value="">{{ $t('community.admin.allTypes') }}</a-select-option>
              <a-select-option value="indicator">{{ $t('community.tabIndicators') }}</a-select-option>
              <a-select-option value="script_template">{{ $t('community.tabScriptTemplates') }}</a-select-option>
            </a-select>
            <a-select v-model="reviewFilters.pricingType" class="review-select" @change="handleReviewFilterChange">
              <a-select-option value="">{{ $t('community.all') }}</a-select-option>
              <a-select-option value="free">{{ $t('community.freeOnly') }}</a-select-option>
              <a-select-option value="paid">{{ $t('community.paidOnly') }}</a-select-option>
              <a-select-option value="vip_free">{{ $t('community.vipFree') }}</a-select-option>
            </a-select>
            <a-select v-model="reviewFilters.sortBy" class="review-select" @change="handleReviewFilterChange">
              <a-select-option value="newest">{{ $t('community.sortNewest') }}</a-select-option>
              <a-select-option value="oldest">{{ $t('community.admin.sortOldest') }}</a-select-option>
              <a-select-option value="price_asc">{{ $t('community.sortPriceLow') }}</a-select-option>
              <a-select-option value="price_desc">{{ $t('community.sortPriceHigh') }}</a-select-option>
              <a-select-option value="name">{{ $t('community.admin.sortName') }}</a-select-option>
            </a-select>
            <a-button class="review-reset-btn" @click="resetReviewFilters">
              <a-icon type="reload" />
              {{ $t('community.admin.resetFilters') }}
            </a-button>
          </div>
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
                  <a-tag v-if="item.vip_free" color="gold">{{ $t('community.vipFree') }}</a-tag>
                  <a-tag
                    class="code-visibility-tag"
                    :class="{ 'is-hidden': item.code_hidden }"
                    :color="item.code_hidden ? 'default' : 'cyan'"
                  >
                    {{ item.code_hidden ? $t('community.codeHidden') : $t('community.codeVisible') }}
                  </a-tag>
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
                <div class="review-evidence-row">
                  <button
                    v-if="isStrategyAsset(item)"
                    type="button"
                    class="evidence-button"
                    @click="openReviewPerformance(item)"
                  >
                    <a-icon type="line-chart" />
                    {{ $t('community.admin.viewBacktest') }}
                  </button>
                  <button type="button" class="evidence-button" @click="openDetail(item)">
                    <a-icon type="profile" />
                    {{ $t('community.admin.viewDetail') }}
                  </button>
                  <span v-if="item.reviewed_at" class="reviewed-meta">
                    {{ $t('community.admin.reviewedAt') }}: {{ formatDate(item.reviewed_at) }}
                    <template v-if="item.reviewer_username"> / {{ item.reviewer_username }}</template>
                  </span>
                </div>
                <div v-if="item.code" class="item-code">
                  <div class="code-toolbar">
                    <a-button type="link" size="small" @click="toggleCode(item.id)">
                      <a-icon :type="expandedCodes[item.id] ? 'up' : 'down'" />
                      {{ $t('community.admin.viewCode') }}
                    </a-button>
                    <a-button type="link" size="small" @click.stop="copyReviewCode(item)">
                      <a-icon type="copy" />
                      {{ $t('community.admin.copyCode') }}
                    </a-button>
                    <span class="code-meta">{{ formatCodeMeta(item.code) }}</span>
                  </div>
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

    <a-modal
      v-model="reviewPerformanceVisible"
      :title="reviewPerformanceTitle"
      :footer="null"
      width="760px"
      :wrap-class-name="reviewPerformanceWrapClass"
    >
      <a-spin :spinning="reviewPerformanceLoading">
        <div v-if="reviewPerformance" class="review-performance">
          <div class="review-performance__grid">
            <div class="perf-cell perf-cell--score">
              <span>{{ $t('community.compositeScore') }}</span>
              <strong>{{ formatReviewNumber(reviewPerformance.score, 0) }}</strong>
            </div>
            <div class="perf-cell">
              <span>{{ $t('community.totalReturn') }}</span>
              <strong :class="toneClass(reviewPerformance.total_return)">
                {{ formatReviewPercent(reviewPerformance.total_return) }}
              </strong>
            </div>
            <div class="perf-cell">
              <span>{{ $t('community.sharpe') }}</span>
              <strong :class="toneClass(reviewPerformance.sharpe, 1)">
                {{ formatReviewNumber(reviewPerformance.sharpe, 2) }}
              </strong>
            </div>
            <div class="perf-cell">
              <span>{{ $t('community.maxDrawdown') }}</span>
              <strong class="negative">{{ formatReviewPercent(reviewPerformance.max_drawdown) }}</strong>
            </div>
            <div class="perf-cell">
              <span>
                {{ $t('strategyCenter.backtest.payoffRatio') }}
                <a-tooltip :title="payoffRatioTooltip(reviewPerformance)">
                  <a-icon
                    type="info-circle"
                    :class="{ 'payoff-warning': isPayoffRatioUnstable(reviewPerformance) }"
                  />
                </a-tooltip>
              </span>
              <strong>{{ formatReviewPayoffRatio(reviewPerformance) }}</strong>
            </div>
            <div class="perf-cell">
              <span>{{ $t('community.winRate') }}</span>
              <strong :class="Number(reviewPerformance.win_rate || 0) >= 50 ? 'positive' : 'negative'">
                {{ formatReviewNumber(reviewPerformance.win_rate, 2) }}%
              </strong>
            </div>
            <div class="perf-cell">
              <span>{{ $t('community.admin.backtestSamples') }}</span>
              <strong>{{ reviewPerformance.sample_size || 0 }}</strong>
            </div>
            <div class="perf-cell">
              <span>{{ $t('community.liveTrades') }}</span>
              <strong>{{ reviewPerformance.live_trade_count || 0 }}</strong>
            </div>
          </div>
          <div v-if="reviewPerformance.best_run_meta" class="review-performance__best">
            <div class="best-title">{{ $t('community.admin.bestRun') }}</div>
            <a-tag v-if="reviewPerformance.best_run_meta.symbol" class="tag-symbol">
              {{ reviewPerformance.best_run_meta.symbol }}
            </a-tag>
            <a-tag v-if="reviewPerformance.best_run_meta.timeframe" class="tag-tf">
              {{ reviewPerformance.best_run_meta.timeframe }}
            </a-tag>
            <span :class="toneClass(reviewPerformance.best_run_meta.total_return)">
              {{ $t('community.totalReturn') }} {{ formatReviewPercent(reviewPerformance.best_run_meta.total_return) }}
            </span>
            <span class="negative">
              {{ $t('community.maxDrawdown') }} {{ formatReviewPercent(reviewPerformance.best_run_meta.max_drawdown) }}
            </span>
          </div>
          <div v-if="hasReviewPerformanceTags" class="review-performance__tags">
            <div>
              <span class="tag-label">{{ $t('community.applicableSymbols') }}</span>
              <a-tag v-for="sym in reviewPerformance.applicable_symbols" :key="`review-sym-${sym}`" class="tag-symbol">{{ sym }}</a-tag>
            </div>
            <div>
              <span class="tag-label">{{ $t('community.applicableTimeframes') }}</span>
              <a-tag v-for="tf in reviewPerformance.applicable_timeframes" :key="`review-tf-${tf}`" class="tag-tf">{{ tf }}</a-tag>
            </div>
          </div>
          <a-alert
            v-if="!Number(reviewPerformance.sample_size || 0)"
            type="warning"
            show-icon
            :message="$t('community.admin.noBacktestData')"
          />
        </div>
        <a-empty v-else-if="!reviewPerformanceLoading" :description="$t('community.admin.noBacktestData')" />
      </a-spin>
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
import MarketCatalogList from './components/MarketCatalogList.vue'
import request from '@/utils/request'
import { loadEnabledMarketOptions } from '@/utils/marketModules'

export default {
  name: 'IndicatorCommunity',
  components: {
    IndicatorCard,
    IndicatorDetail,
    AuthorDashboard,
    MarketCatalogList
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
    reviewPerformanceWrapClass () {
      const base = 'qd-review-performance-modal'
      return this.isDarkTheme ? `${base} ${base}--dark` : base
    },
    reviewPerformanceTitle () {
      const name = this.reviewPerformanceItem && this.reviewPerformanceItem.name
      return name
        ? `${this.$t('community.admin.backtestData')} · ${name}`
        : this.$t('community.admin.backtestData')
    },
    hasReviewPerformanceTags () {
      if (!this.reviewPerformance) return false
      return (this.reviewPerformance.applicable_symbols || []).length > 0 ||
        (this.reviewPerformance.applicable_timeframes || []).length > 0
    },
    isAdmin () {
      if (!this.userRole) return false
      const roleId = this.userRole.id || this.userRole
      return roleId === 'admin'
    },
    normalizedPriceRange () {
      const parse = value => {
        if (value === '' || value === null || value === undefined) return undefined
        const parsed = Number(value)
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
      }
      const min = parse(this.filters.minPrice)
      const max = parse(this.filters.maxPrice)
      if (min !== undefined && max !== undefined && min > max) {
        return { min: max, max: min }
      }
      return { min, max }
    },
    defaultMarketSort () {
      return this.marketAssetType === 'indicator' ? 'hot' : 'score'
    },
    requestSortBy () {
      if (this.catalogSort.key) return this.catalogSort.key
      return this.filters.sortBy === 'recommended' ? this.defaultMarketSort : this.filters.sortBy
    },
    requestSortOrder () {
      return this.catalogSort.key ? this.catalogSort.order : undefined
    },
    marketDiscoveryOptions () {
      return [
        { value: 'recommended', label: this.$t('community.catalog.recommended'), hint: this.$t('community.catalog.recommendedHint') },
        { value: 'newest', label: this.$t('community.catalog.newArrivals'), hint: this.$t('community.catalog.newArrivalsHint') },
        { value: 'hot', label: this.$t('community.catalog.trending'), hint: this.$t('community.catalog.trendingHint') },
        { value: 'rating', label: this.$t('community.catalog.topRated'), hint: this.$t('community.catalog.topRatedHint') },
        { value: 'random', label: this.$t('community.catalog.random'), hint: this.$t('community.catalog.randomHint') }
      ]
    },
    activeMarketFilterCount () {
      const keys = ['keyword', 'pricingType', 'codeVisibility', 'minPrice', 'maxPrice']
      if (this.marketAssetType === 'script_template') {
        keys.push('market', 'strategyType', 'directionMode', 'bindingMode', 'marketType', 'leverage')
      }
      return keys.reduce((count, key) => {
        const value = this.filters[key]
        return count + (value !== '' && value !== null && value !== undefined ? 1 : 0)
      }, 0)
    },
    marketSearchPlaceholder () {
      return this.$t(this.marketAssetType === 'script_template'
        ? 'community.catalog.searchStrategies'
        : 'community.catalog.searchIndicators')
    },
    hasMoreMarketItems () {
      return this.indicators.length < this.pagination.total
    },
    activeStrategyFilterChips () {
      const f = this.filters
      const chips = []
      if (f.market) {
        const option = this.strategyMarketOptions.find(item => item.value === f.market) || { value: f.market, label: f.market }
        chips.push({ key: 'market', label: this.strategyMarketLabel(option) })
      }
      if (f.bindingMode) chips.push({ key: 'bindingMode', label: this.$t(`community.binding.${f.bindingMode}`) })
      if (f.strategyType) chips.push({ key: 'strategyType', label: this.$t(`community.strategyType.${f.strategyType}`) })
      if (f.marketType) chips.push({ key: 'marketType', label: f.marketType.toUpperCase() })
      if (f.directionMode) chips.push({ key: 'directionMode', label: this.$t(`community.direction.${f.directionMode}`) })
      if (f.leverage) chips.push({ key: 'leverage', label: this.$t(f.leverage === 'yes' ? 'community.leverageDeclared' : 'community.contractNoLeverage') })
      return chips
    }
  },
  data () {
    return {
      loading: false,
      marketAssetType: 'indicator',
      marketAssetCounts: {
        indicator: 0,
        script_template: 0
      },
      marketNewAssetCounts: {
        indicator: 0,
        script_template: 0
      },
      indicators: [],
      catalogSort: {
        key: '',
        order: ''
      },
      filters: {
        keyword: '',
        pricingType: '',
        codeVisibility: '',
        minPrice: undefined,
        maxPrice: undefined,
        sortBy: 'recommended',
        market: undefined,
        marketType: undefined,
        bindingMode: undefined,
        strategyType: undefined,
        directionMode: undefined,
        leverage: undefined
      },
      marketViewMode: 'compact',
      showMarketFilters: false,
      strategyMarketOptions: [],
      strategyBindingModes: ['fixed', 'parameterized', 'universe', 'portfolio'],
      strategyDirections: ['long_only', 'short_only', 'one_way', 'both'],
      pagination: {
        current: 1,
        pageSize: 24,
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
      reviewFilters: {
        keyword: '',
        assetType: '',
        pricingType: '',
        sortBy: 'newest'
      },
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
      reviewingIndicator: null,
      reviewPerformanceVisible: false,
      reviewPerformanceLoading: false,
      reviewPerformanceItem: null,
      reviewPerformance: null
    }
  },
  watch: {
    '$i18n.locale' () {
      this.pagination.current = 1
      this.loadIndicators()
      if (this.showMyPurchases) {
        this.loadMyPurchases()
      }
      if (this.activeTab === 'review' && this.isAdmin) {
        this.loadPendingIndicators()
      }
    },
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
  async mounted () {
    const q = this.$route.query
    if (q && q.asset_type) {
      this.marketAssetType = String(q.asset_type)
      this.filters.sortBy = 'recommended'
    }
    await this.loadStrategyMarketOptions()
    this.loadIndicators()
  },
  methods: {
    async loadStrategyMarketOptions () {
      this.strategyMarketOptions = await loadEnabledMarketOptions()
      const supported = this.strategyMarketOptions.map(option => option.value)
      if (this.filters.market && !supported.includes(this.filters.market)) {
        this.filters.market = undefined
      }
    },

    strategyMarketLabel (option) {
      if (!option) return ''
      const communityKey = `community.market.${option.value}`
      if (this.$te(communityKey)) return this.$t(communityKey)
      if (option.i18nKey && this.$te(option.i18nKey)) return this.$t(option.i18nKey)
      return option.label || option.value
    },

    async loadIndicators ({ append = false } = {}) {
      this.loading = true
      try {
        const res = await request({
          url: '/api/community/indicators',
          method: 'get',
          params: {
            page: this.pagination.current,
            page_size: this.pagination.pageSize,
            keyword: this.filters.keyword || undefined,
            pricing_type: this.filters.pricingType && this.filters.pricingType !== 'vip_free' ? this.filters.pricingType : undefined,
            vip_free: this.filters.pricingType === 'vip_free' ? 1 : undefined,
            code_visibility: this.filters.codeVisibility || undefined,
            min_price: this.normalizedPriceRange.min,
            max_price: this.normalizedPriceRange.max,
            sort_by: this.requestSortBy,
            sort_order: this.requestSortOrder,
            asset_type: this.marketAssetType,
            market: this.marketAssetType === 'script_template' ? this.filters.market : undefined,
            market_type: this.marketAssetType === 'script_template' ? this.filters.marketType : undefined,
            binding_mode: this.marketAssetType === 'script_template' ? this.filters.bindingMode : undefined,
            strategy_type: this.marketAssetType === 'script_template' ? this.filters.strategyType : undefined,
            direction_mode: this.marketAssetType === 'script_template' ? this.filters.directionMode : undefined,
            leverage: this.marketAssetType === 'script_template' ? this.filters.leverage : undefined
          }
        })
        if (res.code === 1) {
          const nextItems = res.data.items || []
          if (append) {
            const seen = new Set(this.indicators.map(item => item.id))
            this.indicators = this.indicators.concat(nextItems.filter(item => !seen.has(item.id)))
          } else {
            this.indicators = nextItems
          }
          this.pagination.total = Number(res.data.total || 0)
          const counts = res.data.asset_type_counts || {}
          const currentTypeCount = this.pagination.total
          this.marketAssetCounts = {
            indicator: counts.indicator === undefined
              ? (this.marketAssetType === 'indicator' ? currentTypeCount : this.marketAssetCounts.indicator)
              : Number(counts.indicator || 0),
            script_template: counts.script_template === undefined
              ? (this.marketAssetType === 'script_template' ? currentTypeCount : this.marketAssetCounts.script_template)
              : Number(counts.script_template || 0)
          }
          const newCounts = res.data.new_asset_type_counts || {}
          this.marketNewAssetCounts = {
            indicator: Number(newCounts.indicator || 0),
            script_template: Number(newCounts.script_template || 0)
          }
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

    handleDiscoverySortChange () {
      this.catalogSort = { key: '', order: '' }
      this.handleFilterChange()
    },

    handleCatalogSortChange ({ key, order }) {
      this.catalogSort = { key, order }
      this.pagination.current = 1
      this.loadIndicators()
    },

    handleMarketAssetTypeChange () {
      this.pagination.current = 1
      this.filters.sortBy = 'recommended'
      this.catalogSort = { key: '', order: '' }
      this.loadIndicators()
    },

    clearStrategyFilter (key) {
      if (Object.prototype.hasOwnProperty.call(this.filters, key)) {
        this.filters[key] = undefined
        this.handleFilterChange()
      }
    },

    resetMarketFilters () {
      this.catalogSort = { key: '', order: '' }
      this.filters = {
        keyword: '',
        pricingType: '',
        codeVisibility: '',
        minPrice: undefined,
        maxPrice: undefined,
        sortBy: 'recommended',
        market: undefined,
        marketType: undefined,
        bindingMode: undefined,
        strategyType: undefined,
        directionMode: undefined,
        leverage: undefined
      }
      this.pagination.current = 1
      this.loadIndicators()
    },

    async loadMoreMarketItems () {
      if (this.loading || !this.hasMoreMarketItems) return
      this.pagination.current += 1
      await this.loadIndicators({ append: true })
    },

    async handlePageChange (page) {
      this.pagination.current = Number(page || 1)
      await this.loadIndicators()
      this.$nextTick(() => {
        const target = this.$refs.marketResultsStart
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
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
      this.loadMyPurchases()
    },

    usePurchaseActionLabel (item) {
      if (item && item.local_copy_missing) {
        return this.$t('community.restoreCopy')
      }
      const assetType = item && item.indicator && item.indicator.asset_type
      if (assetType === 'script_template') {
        return this.$t('community.useStrategyV2')
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
            query: { sourceId: String(sid) }
          })
        } else {
          this.$router.push({ path: '/strategy-ide' })
        }
        return
      }
      const localId = item && (item.local_copy_id || item.purchased_indicator_id || item.indicator_id)
      this.$router.push({
        path: '/indicator-ide',
        query: localId ? { indicator_id: String(localId) } : {}
      })
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
          if (res.msg === 'restored') {
            this.$message.success(this.$t('community.restoreCopySuccess'))
          } else if (res.msg === 'listing_unpublished_no_update' || res.msg === 'listing_deleted_no_update') {
            const msgKey = `community.${res.msg}`
            this.$message.info(this.$te(msgKey) ? this.$t(msgKey) : this.$t('community.already_latest'))
          } else {
            this.$message.success(this.$t('community.syncCodeSuccess'))
          }
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
          method: 'get',
          params: {
            keyword: this.reviewFilters.keyword || undefined,
            asset_type: this.reviewFilters.assetType || undefined,
            pricing_type: this.reviewFilters.pricingType || undefined
          }
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
            review_status: this.reviewFilter,
            keyword: this.reviewFilters.keyword || undefined,
            asset_type: this.reviewFilters.assetType || undefined,
            pricing_type: this.reviewFilters.pricingType || undefined,
            sort_by: this.reviewFilters.sortBy || 'newest'
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

    handleReviewStatusChange () {
      this.reviewPagination.current = 1
      this.loadPendingIndicators()
    },

    handleReviewFilterChange () {
      this.reviewPagination.current = 1
      this.loadPendingIndicators()
      this.loadReviewStats()
    },

    resetReviewFilters () {
      this.reviewFilters = {
        keyword: '',
        assetType: '',
        pricingType: '',
        sortBy: 'newest'
      }
      this.reviewPagination.current = 1
      this.loadPendingIndicators()
      this.loadReviewStats()
    },

    handleReviewPageChange (page) {
      this.reviewPagination.current = Number(page || 1)
      this.loadPendingIndicators()
    },

    toggleCode (id) {
      this.$set(this.expandedCodes, id, !this.expandedCodes[id])
    },

    async copyReviewCode (item) {
      const code = item && item.code
      if (!code) return
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(code)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = code
          textarea.setAttribute('readonly', '')
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        this.$message.success(this.$t('community.admin.codeCopied'))
      } catch (e) {
        console.error('Copy review code failed:', e)
        this.$message.error(this.$t('community.admin.codeCopyFailed'))
      }
    },

    formatCodeMeta (code) {
      const text = String(code || '')
      if (!text) return ''
      const lines = text.split(/\r\n|\r|\n/).length
      return this.$t('community.admin.codeMeta', { lines, chars: text.length })
    },

    isStrategyAsset (item) {
      const assetType = String((item && item.asset_type) || '').toLowerCase()
      return assetType === 'script_template' || assetType === 'script' || assetType === 'strategy'
    },

    async openReviewPerformance (item) {
      if (!item || !item.id) return
      this.reviewPerformanceItem = item
      this.reviewPerformance = null
      this.reviewPerformanceVisible = true
      this.reviewPerformanceLoading = true
      try {
        const res = await request({
          url: `/api/community/indicators/${item.id}/performance`,
          method: 'get'
        })
        if (res.code === 1) {
          this.reviewPerformance = res.data || null
        } else {
          this.$message.error(res.msg || this.$t('community.admin.backtestLoadFailed'))
        }
      } catch (e) {
        console.error('Load review performance failed:', e)
        this.$message.error(this.$t('community.admin.backtestLoadFailed'))
      } finally {
        this.reviewPerformanceLoading = false
      }
    },

    formatReviewNumber (val, digits = 2) {
      const v = parseFloat(val)
      if (isNaN(v)) return '-'
      return v.toFixed(digits)
    },

    formatReviewPayoffRatio (performance) {
      if (!performance || Number(performance.losing_trades || 0) <= 0) return '—'
      return this.formatReviewNumber(performance.profit_loss_ratio, 2)
    },

    isPayoffRatioUnstable (performance) {
      const losses = Number(performance && performance.losing_trades) || 0
      return losses > 0 && losses < 3
    },

    payoffRatioTooltip (performance) {
      const wins = Number(performance && performance.winning_trades) || 0
      const losses = Number(performance && performance.losing_trades) || 0
      const sampleWarning = this.isPayoffRatioUnstable(performance)
        ? `${this.$t('backtest-center.audit.lowSample')} · `
        : ''
      return `${sampleWarning}${this.$t('strategyCenter.backtest.winningTrades')}: ${wins} · ${this.$t('strategyCenter.backtest.losingTrades')}: ${losses}`
    },

    formatReviewPercent (val) {
      const v = parseFloat(val)
      if (isNaN(v)) return '-'
      const sign = v > 0 ? '+' : ''
      return `${sign}${v.toFixed(2)}%`
    },

    toneClass (val, positiveThreshold = 0) {
      const v = parseFloat(val)
      if (isNaN(v)) return ''
      if (v > positiveThreshold) return 'positive'
      if (v < 0) return 'negative'
      return ''
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
  --market-font-body: 14px;
  --market-font-control: 13px;
  --market-font-small: 12px;
  --market-font-section: 20px;
  padding: 24px;
  min-height: calc(100vh - 120px);
  background: #f5f5f5;
  font-size: var(--market-font-body);
  line-height: 1.5;

  .market-catalog-shell {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .market-catalog-toolbar {
    overflow: hidden;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 8px;
    background: #fff;

    &__top,
    &__discovery {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      padding: 10px 12px;
    }

    &__top {
      justify-content: space-between;
      border-bottom: 1px solid rgba(15, 23, 42, 0.07);
    }

    &__discovery {
      flex-wrap: wrap;
    }

    .market-search {
      flex: 1 1 260px;
      min-width: 210px;
      max-width: 430px;
      margin-left: auto;
    }

    .market-sort-select {
      width: 148px;
      display: none;
    }

    ::v-deep .ant-radio-group {
      display: inline-flex;
    }

    ::v-deep .ant-radio-button-wrapper,
    ::v-deep .ant-btn,
    ::v-deep .ant-select-selection,
    ::v-deep .ant-input,
    ::v-deep .ant-input-search-button {
      height: 32px;
      font-size: 12px;
    }

    ::v-deep .ant-radio-button-wrapper {
      line-height: 30px;
    }

    ::v-deep .ant-select-selection__rendered {
      line-height: 30px;
    }
  }

  .market-discovery-tabs {
    flex-shrink: 0;
  }

  .market-asset-tabs,
  .market-discovery-tabs,
  .market-view-toggle {
    display: inline-flex;
    overflow: hidden;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    background: #fff;

    ::v-deep .ant-radio-button-wrapper {
      height: 32px;
      margin-left: 0;
      border: 0 !important;
      border-left: 1px solid #d9d9d9 !important;
      border-radius: 0 !important;
      line-height: 30px;
      box-shadow: none !important;

      &::before {
        display: none !important;
      }

      &:first-child {
        margin-left: 0;
        border-left: 0 !important;
      }

      &.ant-radio-button-wrapper-checked {
        z-index: 2;
        border-left-color: transparent !important;
      }
    }
  }

  .market-new-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    margin-left: 4px;
    padding: 0 5px;
    color: #087f78;
    font-size: 10px;
    font-weight: 700;
    border-radius: 9px;
    background: rgba(19, 194, 194, 0.12);
  }

  .market-catalog-workspace {
    display: grid;
    grid-template-columns: 196px minmax(0, 1fr);
    align-items: start;
    gap: 12px;
  }

  .market-filter-rail {
    position: sticky;
    top: 82px;
    overflow: hidden;
    border: 1px solid rgba(15, 23, 42, 0.09);
    border-radius: 8px;
    background: #fff;

    &__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 42px;
      padding: 0 12px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);

      strong {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: #1f2937;
        font-size: 13px;
      }

      ::v-deep .ant-btn {
        height: auto;
        padding: 0;
        font-size: 10px;
      }
    }
  }

  .market-filter-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 17px;
    height: 17px;
    padding: 0 5px;
    border-radius: 9px;
    background: rgba(19, 194, 194, 0.12);
    color: #087f78;
    font-size: 10px;
    font-weight: 700;
  }

  .market-empty {
    margin: 52px 0;

    ::v-deep .ant-empty-description {
      color: #64748b;
      font-size: 12px;
    }
  }

  .market-filter-section {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.065);

    &:last-child {
      border-bottom: 0;
    }

    h4 {
      margin: 0 0 7px;
      color: #334155;
      font-size: 11px;
      font-weight: 650;
    }

    > .ant-select {
      width: 100%;
      font-size: 11px;
    }

    ::v-deep .ant-select-selection--single {
      height: 28px;
    }

    ::v-deep .ant-select-selection__rendered {
      line-height: 26px;
    }

    ::v-deep .ant-radio-wrapper {
      margin: 0;
      color: #5a6678;
      font-size: 11px;
      line-height: 24px;
    }

    ::v-deep .ant-btn {
      margin-top: 7px;
      height: 26px;
      font-size: 10px;
    }
  }

  .market-filter-options {
    display: flex;
    flex-direction: column;
  }

  .market-price-range {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 4px;
    margin-top: 7px;

    ::v-deep .ant-input-number {
      width: 100%;
      height: 28px;
      font-size: 10px;
    }

    ::v-deep .ant-input-number-input {
      height: 26px;
      padding: 0 6px;
    }

    > span {
      color: #94a3b8;
    }
  }

  .market-results {
    min-width: 0;
    scroll-margin-top: 96px;
  }

  .market-strategy-risk,
  .market-result-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 34px;
    margin-bottom: 8px;
    padding: 7px 10px;
    font-size: 11px;
    border-radius: 6px;
  }

  .market-strategy-risk {
    justify-content: flex-start;
    color: #8a5b00;
    border: 1px solid rgba(250, 173, 20, 0.2);
    background: rgba(250, 173, 20, 0.08);
  }

  .market-result-summary {
    color: #7b8798;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255, 255, 255, 0.72);

    span:first-child {
      color: #475569;
      font-weight: 600;
    }
  }

  .market-load-more {
    display: flex;
    justify-content: center;
    padding: 14px 0 2px;

    ::v-deep .ant-btn {
      min-width: 160px;
      border-radius: 6px;
      font-size: 12px;
    }
  }

  .market-header {
    margin-bottom: 18px;
    padding: 12px 14px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 8px;
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.05);

    &__workspace {
      min-width: 0;

      .market-search {
        width: 42vw;
        max-width: 560px;
        margin-left: auto;
        flex: 1 1 420px;
      }
    }

    .market-advanced-filters {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .market-filter-bar {
      display: flex;
      flex-direction: column;
      gap: 10px;

      &__primary,
      &__secondary {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        width: 100%;
      }

      &__secondary {
        padding-top: 10px;
        border-top: 1px solid rgba(15, 23, 42, 0.07);
      }

      .market-filter-select {
        width: 138px;
      }

      .market-sort-select {
        width: 150px;
      }

      .market-purchases-btn {
        flex-shrink: 0;
      }

      ::v-deep .ant-btn,
      ::v-deep .ant-select-selection,
      ::v-deep .ant-input,
      ::v-deep .ant-input-affix-wrapper,
      ::v-deep .ant-input-number {
        border-radius: 6px;
        font-size: var(--market-font-control);
      }

      ::v-deep .ant-btn,
      ::v-deep .ant-select-selection--single,
      ::v-deep .ant-input,
      ::v-deep .ant-input-affix-wrapper {
        min-height: 32px;
      }

      ::v-deep .ant-select-selection__rendered {
        line-height: 30px;
      }

      ::v-deep .ant-radio-group {
        display: inline-flex;
        overflow: hidden;
        border-radius: 6px;

        .ant-radio-button-wrapper {
          height: 32px;
          line-height: 30px;
          border-radius: 0;

          &:first-child {
            border-radius: 6px 0 0 6px;
          }

          &:last-child {
            border-radius: 0 6px 6px 0;
          }
        }
      }

      .market-search {
        ::v-deep .ant-input-group {
          display: flex;
          align-items: stretch;
          overflow: hidden;
          width: 100%;
          border-radius: 6px;
        }

        ::v-deep .ant-input-affix-wrapper,
        ::v-deep .ant-input-group > .ant-input:first-child {
          flex: 1 1 auto;
          min-width: 0;
          height: 32px;
          border-radius: 6px 0 0 6px;
        }

        ::v-deep .ant-input-affix-wrapper .ant-input {
          height: 32px;
          border-right: 0;
          border-radius: 6px 0 0 6px;
        }

        ::v-deep .ant-input-group-addon {
          display: flex;
          flex: 0 0 auto;
          width: auto;
          padding: 0;
          border: 0;
          background: transparent;
        }

        ::v-deep .ant-input-search-button {
          height: 32px;
          min-width: 68px;
          margin: 0;
          border-radius: 0 6px 6px 0;
          box-shadow: none;
        }
      }
    }

    .market-advanced-filters {
      grid-area: advanced;
      padding-top: 14px;
      border-top: 1px solid rgba(15, 23, 42, 0.08);

      .strategy-filter-select {
        width: 154px;
      }
    }

    .price-range-filter {
      display: inline-flex;
      align-items: center;
      gap: 6px;

      ::v-deep .ant-input-number {
        width: 104px;
      }

      &__dash {
        color: rgba(0, 0, 0, 0.35);
        line-height: 32px;
      }

      &__apply {
        flex-shrink: 0;
      }
    }
  }

  .market-filters-enter-active,
  .market-filters-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
  }

  .market-filters-enter,
  .market-filters-leave-to {
    opacity: 0;
    transform: translateY(-4px);
  }

  .strategy-filter-summary {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: -12px 0 20px;
    padding: 10px 14px;
    border: 1px solid rgba(82, 196, 26, 0.24);
    border-radius: 8px;
    background: rgba(82, 196, 26, 0.06);

    &__label {
      margin-right: 4px;
      color: #389e0d;
      font-weight: 600;
    }
  }

  .indicator-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .market-results {
    scroll-margin-top: 96px;
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
    margin-top: 24px;
    padding: 10px 0;
  }

  .market-risk-tip {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 14px;
    padding: 12px 16px;
    color: rgba(0, 0, 0, 0.58);
    font-size: 12px;
    line-height: 1.65;
    background: rgba(250, 173, 20, 0.08);
    border: 1px solid rgba(250, 173, 20, 0.18);
    border-radius: 8px;

    .anticon {
      margin-top: 2px;
      color: #d48806;
      flex-shrink: 0;
    }
  }

  .empty-purchases {
    padding: 40px 0;
  }

  .admin-tabs {
    margin-bottom: 14px;
    padding: 0 2px;
    background: transparent;

    ::v-deep .ant-tabs-bar {
      margin-bottom: 0;
    }

    ::v-deep .ant-tabs-nav .ant-tabs-tab {
      font-size: var(--market-font-body);
      font-weight: 600;
      line-height: 22px;
    }

    ::v-deep .ant-tabs-nav .ant-badge {
      color: inherit;
      font: inherit;
      line-height: inherit;
    }
  }

  .review-panel {
    .review-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 20px;
      padding: 16px 20px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

      &__status {
        flex-shrink: 0;

        .review-status-tabs {
          display: inline-flex;
          overflow: hidden;
          border-radius: 6px;

          ::v-deep .ant-radio-button-wrapper {
            height: 32px;
            line-height: 30px;
            border-radius: 0;

            &:first-child {
              border-radius: 6px 0 0 6px;
            }

            &:last-child {
              border-radius: 0 6px 6px 0;
            }
          }
        }
      }

      &__filters {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        flex: 1;
        min-width: 420px;
        flex-wrap: wrap;

        .review-search {
          width: 260px;
        }

        .review-select {
          width: 132px;
        }

        .review-reset-btn {
          flex-shrink: 0;
        }
      }
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

          .code-visibility-tag.is-hidden {
            border-color: #d9d9d9;
            background: #fafafa;
            color: rgba(0, 0, 0, 0.65);
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
          margin-top: 10px;

          .code-toolbar {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 6px;

            .code-meta {
              margin-left: auto;
              font-size: 12px;
              color: rgba(0, 0, 0, 0.4);
            }
          }

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

        .review-evidence-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin: 10px 0 8px;

          .evidence-button {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            height: 28px;
            padding: 0 10px;
            border: 1px solid rgba(82, 196, 26, 0.24);
            border-radius: 4px;
            background: rgba(82, 196, 26, 0.08);
            color: #389e0d;
            font-size: 12px;
            cursor: pointer;

            &:hover {
              background: rgba(82, 196, 26, 0.16);
              border-color: rgba(82, 196, 26, 0.45);
            }
          }

          .reviewed-meta {
            margin-left: auto;
            font-size: 12px;
            color: rgba(0, 0, 0, 0.45);
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
    background: transparent;

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

      .code-visibility-tag.is-hidden {
        border-color: #434343;
        background: #303030;
        color: rgba(255, 255, 255, 0.78);
      }

      .item-code .code-preview {
        background: #262626;
        color: rgba(255, 255, 255, 0.85);
      }

      .item-code .code-toolbar .code-meta {
        color: rgba(255, 255, 255, 0.4);
      }

      .review-evidence-row {
        .evidence-button {
          background: rgba(82, 196, 26, 0.12);
          border-color: rgba(82, 196, 26, 0.32);
          color: #95de64;

          &:hover {
            background: rgba(82, 196, 26, 0.2);
            border-color: rgba(82, 196, 26, 0.5);
          }
        }

        .reviewed-meta {
          color: rgba(255, 255, 255, 0.45);
        }
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
    border-color: #303030;
    background: #1f1f1f;
    box-shadow: none;

    .market-filter-bar__secondary,
    .market-advanced-filters {
      border-color: rgba(255, 255, 255, 0.08);
    }

    .price-range-filter__dash {
      color: rgba(255, 255, 255, 0.35);
    }
  }

  .market-catalog-toolbar,
  .market-filter-rail {
    border-color: #303030;
    background: #1f1f1f;
  }

  .market-catalog-toolbar__top,
  .market-filter-rail__head,
  .market-filter-section {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .market-filter-rail__head strong,
  .market-filter-section h4 {
    color: rgba(255, 255, 255, 0.78);
  }

  .market-filter-section ::v-deep .ant-radio-wrapper {
    color: rgba(255, 255, 255, 0.62);
  }

  .market-result-summary {
    color: rgba(255, 255, 255, 0.45);
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.035);

    span:first-child {
      color: rgba(255, 255, 255, 0.68);
    }
  }

  .market-strategy-risk {
    color: #ffc53d;
    border-color: rgba(250, 173, 20, 0.24);
    background: rgba(250, 173, 20, 0.09);
  }

  .empty-state {
    background: #1f1f1f;
  }

  .market-risk-tip {
    color: rgba(255, 255, 255, 0.58);
    background: rgba(250, 173, 20, 0.09);
    border-color: rgba(250, 173, 20, 0.24);

    .anticon {
      color: #ffc53d;
    }
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

  ::v-deep .ant-input-number {
    background: #262626;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.85);

    .ant-input-number-input {
      color: rgba(255, 255, 255, 0.85);

      &::placeholder {
        color: rgba(255, 255, 255, 0.35);
      }
    }

    .ant-input-number-handler-wrap {
      background: #262626;
      border-color: #434343;
    }

    .ant-input-number-handler {
      border-color: #434343;
    }

    .ant-input-number-handler-up-inner,
    .ant-input-number-handler-down-inner {
      color: rgba(255, 255, 255, 0.45);
    }
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

  .market-asset-tabs,
  .market-discovery-tabs,
  .market-view-toggle {
    border-color: #434343;
    background: #262626;

    ::v-deep .ant-radio-button-wrapper {
      border-left-color: #434343 !important;

      &:first-child,
      &.ant-radio-button-wrapper-checked {
        border-left-color: transparent !important;
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

@media (max-width: 1200px) {
  .indicator-community-container {
    .market-catalog-workspace {
      grid-template-columns: 174px minmax(0, 1fr);
    }

    .market-catalog-toolbar__discovery {
      .market-search {
        order: 3;
        max-width: none;
      }
    }

    .indicator-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}

@media (min-width: 1201px) and (max-width: 1700px) {
  .indicator-community-container .indicator-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .indicator-community-container {
    padding: 12px;

    .market-catalog-toolbar {
      &__top,
      &__discovery {
        align-items: stretch;
        flex-direction: column;
      }

      .market-search,
      .market-sort-select,
      .market-view-toggle,
      .market-asset-tabs,
      .market-purchases-btn {
        width: 100%;
        max-width: none;
        margin-left: 0;
      }

      .market-sort-select {
        display: block;
      }

      ::v-deep .ant-radio-group {
        display: flex;
        overflow-x: auto;
      }

      ::v-deep .ant-radio-button-wrapper {
        flex: 1 0 auto;
        text-align: center;
      }
    }

    .market-catalog-workspace {
      grid-template-columns: minmax(0, 1fr);
    }

    .market-filter-rail {
      position: static;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));

      &__head {
        grid-column: 1 / -1;
      }
    }

    .market-filter-section {
      border-right: 1px solid rgba(15, 23, 42, 0.065);
    }

    .market-result-summary {
      align-items: flex-start;
      flex-direction: column;
    }

    .market-header {
      padding: 16px;
      box-sizing: border-box;
      width: 100%;

      &__workspace {
        width: 100%;
      }

      .market-search {
        width: 100%;
        max-width: 100%;
        flex-basis: 100%;

        ::v-deep .ant-input-group {
          display: flex;
          width: 100%;
        }

        ::v-deep .ant-input {
          width: auto;
          min-width: 0;
          flex: 1;
        }

        ::v-deep .ant-input-affix-wrapper {
          width: auto;
          min-width: 0;
          flex: 1;

          .ant-input {
            width: 100%;
          }
        }

        ::v-deep .ant-input-group-addon {
          display: block;
          width: auto;
        }
      }

      .market-advanced-filters {
        align-items: stretch;
        flex-direction: column;

        .market-filter-select,
        .market-sort-select,
        .strategy-filter-select,
        .market-reset-btn,
        .market-purchases-btn,
        > .ant-radio-group,
        > .ant-btn {
          width: 100%;
        }

        .market-purchases-btn {
          margin-left: 0;
        }
      }

      .market-filter-bar {
        &__primary,
        &__secondary {
          align-items: stretch;
          flex-direction: column;
        }

        .market-search,
        .market-filter-select,
        .market-sort-select,
        .market-reset-btn,
        .market-purchases-btn,
        .market-asset-tabs,
        .market-pricing-tabs,
        &__secondary > .ant-btn {
          width: 100%;
        }

        .market-purchases-btn {
          margin-left: 0;
        }

        .market-asset-tabs,
        .market-pricing-tabs {
          ::v-deep .ant-radio-button-wrapper {
            flex: 1;
            text-align: center;
          }
        }
      }

      .price-range-filter {
        display: grid;
        grid-template-columns: 1fr auto 1fr auto;
        width: 100%;

        ::v-deep .ant-input-number {
          width: 100%;
        }
      }
    }

    .indicator-grid {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }

  }
}

@media (max-width: 480px) {
  .indicator-community-container {
    .market-header .market-asset-tabs {
      display: flex;
      width: 100%;

      ::v-deep .ant-radio-button-wrapper {
        flex: 1;
        text-align: center;
      }
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
.qd-review-performance-modal {
  .payoff-warning {
    color: #faad14;
  }

  .review-performance {
    &__grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .perf-cell {
      min-width: 0;
      padding: 12px;
      border-radius: 8px;
      background: #f7f7f7;

      span {
        display: block;
        margin-bottom: 6px;
        color: rgba(0, 0, 0, 0.45);
        font-size: 12px;
      }

      strong {
        color: rgba(0, 0, 0, 0.85);
        font-size: 18px;
        line-height: 1.2;
      }

      &--score {
        background: linear-gradient(135deg, rgba(245, 175, 25, 0.12), rgba(241, 39, 17, 0.08));

        strong {
          color: #d4380d;
        }
      }
    }

    .positive {
      color: #52c41a !important;
    }

    .negative {
      color: #f5222d !important;
    }

    &__best,
    &__tags {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
      padding: 12px;
      border-radius: 8px;
      background: #fafafa;
      border: 1px solid #f0f0f0;
      font-size: 12px;

      .ant-tag {
        margin: 0;
        border: none;
      }

      .tag-symbol {
        background: rgba(24, 144, 255, 0.08);
        color: var(--primary-color, #1890ff);
      }

      .tag-tf {
        background: rgba(82, 196, 26, 0.08);
        color: #389e0d;
      }
    }

    &__tags {
      align-items: flex-start;
      flex-direction: column;

      > div {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .tag-label,
      .best-title {
        color: rgba(0, 0, 0, 0.45);
      }
    }

    .best-title {
      font-weight: 600;
      color: rgba(0, 0, 0, 0.65);
    }
  }
}

.qd-review-performance-modal--dark {
  .ant-modal-content,
  .ant-modal-header {
    background: #1f1f1f;
    border-color: #303030;
  }

  .ant-modal-title {
    color: rgba(255, 255, 255, 0.88);
  }

  .ant-modal-close {
    color: rgba(255, 255, 255, 0.55);

    &:hover {
      color: rgba(255, 255, 255, 0.88);
    }
  }

  .review-performance {
    .perf-cell {
      background: #262626;

      span {
        color: rgba(255, 255, 255, 0.45);
      }

      strong {
        color: rgba(255, 255, 255, 0.88);
      }

      &--score {
        background: linear-gradient(135deg, rgba(245, 175, 25, 0.18), rgba(241, 39, 17, 0.12));

        strong {
          color: #ffa940;
        }
      }
    }

    &__best,
    &__tags {
      background: #262626;
      border-color: #303030;
      color: rgba(255, 255, 255, 0.65);

      .tag-symbol {
        background: rgba(24, 144, 255, 0.16);
        color: #69c0ff;
      }

      .tag-tf {
        background: rgba(82, 196, 26, 0.16);
        color: #95de64;
      }
    }

    .tag-label,
    .best-title {
      color: rgba(255, 255, 255, 0.55);
    }
  }

  .ant-empty-description {
    color: rgba(255, 255, 255, 0.45);
  }
}

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
