<template>
  <div class="ai-analysis-container" :class="{ 'theme-dark': isDarkTheme, embedded: embedded }" :style="{ '--primary-color': primaryColor }">
    <!-- Full-width main content -->
    <div class="main-content-full">
      <!-- Top index strip -->
      <div v-if="false" class="top-index-bar">
        <template v-if="loadingSentiment">
          <div class="indicator-box skeleton-box">
            <span class="skeleton-text short"></span>
            <span class="skeleton-text"></span>
          </div>
          <div class="indicator-box skeleton-box">
            <span class="skeleton-text short"></span>
            <span class="skeleton-text"></span>
          </div>
          <div class="indicator-box skeleton-box">
            <span class="skeleton-text short"></span>
            <span class="skeleton-text"></span>
          </div>
        </template>
        <template v-else>
          <div class="indicator-box fear-greed" :class="getFearGreedClass(marketData.fearGreed)">
            <span class="ind-label">{{ $t('globalMarket.fearGreedShort') }}</span>
            <span class="ind-value">{{ marketData.fearGreed || '--' }}</span>
          </div>
          <div class="indicator-box vix" :class="getVixLevel(marketData.vix)">
            <span class="ind-label">VIX</span>
            <span class="ind-value">{{ marketData.vix || '--' }}</span>
          </div>
          <div class="indicator-box dxy">
            <span class="ind-label">DXY</span>
            <span class="ind-value">{{ marketData.dxy || '--' }}</span>
          </div>
        </template>

        <!-- Global index ticker - disabled by default -->
        <div class="indices-marquee">
          <template v-if="loadingIndices">
            <div class="indices-loading">
              <a-icon type="loading" /> {{ $t('common.loading') || '加载中...' }}
            </div>
          </template>
          <template v-else-if="marketData.indices.length > 0">
            <div class="marquee-track">
              <div class="index-item" v-for="idx in marketData.indices" :key="'a-'+idx.symbol">
                <span class="idx-flag">{{ idx.flag }}</span>
                <span class="idx-symbol">{{ idx.symbol }}</span>
                <span class="idx-price">{{ formatPrice(idx.price) }}</span>
                <span class="idx-change" :class="idx.change >= 0 ? 'up' : 'down'">
                  <a-icon :type="idx.change >= 0 ? 'caret-up' : 'caret-down'" />
                  {{ Math.abs(idx.change).toFixed(2) }}%
                </span>
              </div>
              <div class="index-item" v-for="idx in marketData.indices" :key="'b-'+idx.symbol">
                <span class="idx-flag">{{ idx.flag }}</span>
                <span class="idx-symbol">{{ idx.symbol }}</span>
                <span class="idx-price">{{ formatPrice(idx.price) }}</span>
                <span class="idx-change" :class="idx.change >= 0 ? 'up' : 'down'">
                  <a-icon :type="idx.change >= 0 ? 'caret-up' : 'caret-down'" />
                  {{ Math.abs(idx.change).toFixed(2) }}%
                </span>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="indices-empty">--</div>
          </template>
        </div>
        <a-button type="link" size="small" class="refresh-btn" :loading="loadingMarket" @click="loadMarketData(true)">
          <a-icon type="sync" :spin="loadingMarket" />
        </a-button>
      </div>

      <copilot-workbench />
      <div v-if="false" class="main-body">
        <div class="left-panel">
          <!-- Heatmap - disabled by default -->
          <div v-if="false" class="heatmap-box">
            <div class="box-header">
              <a-radio-group v-model="heatmapType" size="small" button-style="solid" class="heatmap-type-tabs">
                <a-radio-button value="us_stocks">{{ $t('globalMarket.usStockHeatmap') }}</a-radio-button>
                <a-radio-button value="hk_stocks">{{ $t('globalMarket.hkStockHeatmap') }}</a-radio-button>
                <a-radio-button value="crypto">{{ $t('globalMarket.cryptoHeatmap') }}</a-radio-button>
                <a-radio-button value="commodities">{{ $t('globalMarket.commoditiesHeatmap') }}</a-radio-button>
                <a-radio-button value="sectors">{{ $t('globalMarket.sectorHeatmap') }}</a-radio-button>
                <a-radio-button value="forex">{{ $t('globalMarket.forexHeatmap') }}</a-radio-button>
              </a-radio-group>
            </div>
            <div class="heatmap-grid">
              <template v-if="loadingHeatmap">
                <div v-for="i in 12" :key="'skel-'+i" class="heat-cell skeleton-cell">
                  <span class="skeleton-text short"></span>
                  <span class="skeleton-text"></span>
                </div>
              </template>
              <template v-else-if="currentHeatmap.length > 0">
                <div v-for="(item, i) in currentHeatmap.slice(0, 12)" :key="i" class="heat-cell" :style="getHeatmapStyle(item.value)">
                  <span class="heat-name">{{ getHeatmapName(item) }}</span>
                  <span class="heat-price" v-if="item.price">{{ formatHeatmapPrice(item.price) }}</span>
                  <span class="heat-val">{{ item.value >= 0 ? '+' : '' }}{{ formatNum(item.value) }}%</span>
                </div>
              </template>
              <template v-else>
                <div class="heatmap-empty">{{ $t('common.noData') || '暂无数据' }}</div>
              </template>
            </div>
          </div>

          <div class="calendar-box">
            <div class="box-header">
              <span class="box-title"><a-icon type="calendar" /> {{ $t('globalMarket.calendar') }}</span>
            </div>
            <div class="calendar-list">
              <template v-if="loadingCalendar">
                <div v-for="i in 5" :key="'cal-skel-'+i" class="cal-item skeleton-item">
                  <span class="skeleton-text short"></span>
                  <span class="skeleton-text short"></span>
                  <span class="skeleton-text"></span>
                </div>
              </template>
              <template v-else-if="marketData.calendar.length > 0">
                <div v-for="evt in marketData.calendar.slice(0, 6)" :key="`${evt.date}-${evt.time}-${evt.name_en}-${evt.country}`" class="cal-item" :class="evt.importance">
                  <div class="cal-main-row">
                    <span class="cal-date">{{ formatCalendarDate(evt.date) }}</span>
                    <span class="cal-time">{{ evt.time || '--:--' }}</span>
                    <span class="cal-flag">{{ getCountryFlag(evt.country) }}</span>
                    <span class="cal-name">{{ isZhLocale ? evt.name : evt.name_en }}</span>
                    <span class="cal-impact" :class="getImpactClass(evt)">
                      <a-icon v-if="getImpactClass(evt) === 'bullish'" type="arrow-up" />
                      <a-icon v-else-if="getImpactClass(evt) === 'bearish'" type="arrow-down" />
                      <a-icon v-else type="minus" />
                      {{ formatCalendarValue(evt) }}
                    </span>
                  </div>
                  <div v-if="evt.ai_insight" class="cal-ai-insight" :class="evt.ai_insight.risk_level">
                    <div class="cal-ai-title">
                      <a-icon type="thunderbolt" />
                      <span>{{ getCalendarInsightTitle(evt) }}</span>
                      <em>{{ getCalendarRiskWindow(evt) }}</em>
                    </div>
                    <div class="cal-ai-summary">{{ getCalendarInsightSummary(evt) }}</div>
                    <div class="cal-ai-assets" v-if="getCalendarInsightAssets(evt).length">
                      <span
                        v-for="asset in getCalendarInsightAssets(evt)"
                        :key="`${evt.id}-${asset.symbol}`"
                        class="cal-ai-asset"
                        :class="asset.bias"
                      >
                        {{ asset.symbol }} · {{ isZhLocale ? asset.bias_label : asset.bias_label_en }}
                      </span>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="cal-empty">
                  <template v-if="calendarStatus === 'missing_config'">
                    <div class="cal-empty-title">{{ $t('globalMarket.calendarUnavailable') }}</div>
                    <div class="cal-empty-desc">{{ $t('globalMarket.calendarMissingFinnhub') }}</div>
                    <a-button type="link" size="small" @click="$router.push('/settings')">
                      {{ $t('globalMarket.configureDataSource') }}
                    </a-button>
                  </template>
                  <template v-else-if="calendarStatus === 'forbidden'">
                    <div class="cal-empty-title">{{ $t('globalMarket.calendarForbidden') }}</div>
                    <div class="cal-empty-desc">{{ $t('globalMarket.calendarFinnhubForbidden') }}</div>
                    <a-button type="link" size="small" @click="$router.push('/settings')">
                      {{ $t('globalMarket.configureDataSource') }}
                    </a-button>
                  </template>
                  <template v-else-if="calendarStatus === 'rate_limited' || calendarStatus === 'upstream_error' || calendarStatus === 'error'">
                    <div class="cal-empty-title">{{ $t('globalMarket.calendarLoadFailed') }}</div>
                    <div class="cal-empty-desc">{{ calendarErrorMessage }}</div>
                  </template>
                  <template v-else>
                    {{ $t('globalMarket.noEvents') }}
                  </template>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="right-panel">
          <!-- Analysis toolbar -->
          <div class="analysis-toolbar">
            <a-select
              v-model="selectedSymbol"
              :placeholder="$t('dashboard.analysis.empty.selectSymbol')"
              size="large"
              show-search
              allow-clear
              option-label-prop="label"
              :filter-option="filterSymbolOption"
              @change="handleSymbolChange"
              class="symbol-selector"
            >
              <a-select-option
                v-for="stock in (watchlist || [])"
                :key="`${stock.market}-${stock.symbol}`"
                :value="`${stock.market}:${stock.symbol}`"
                :label="watchlistSelectLabel(stock)"
              >
                <span class="symbol-option wl-select-option-row">
                  <a-tag :color="getMarketColor(stock.market)" size="small">{{ getMarketName(stock.market) }}</a-tag>
                  <strong class="wl-select-symbol">{{ stock.symbol }}</strong>
                  <span v-if="stock.name" class="symbol-name wl-select-name">{{ stock.name }}</span>
                </span>
              </a-select-option>
              <a-select-option key="add-stock-option" value="__add_stock_option__" class="add-stock-option">
                <div style="text-align: center; padding: 4px 0; color: #1890ff;">
                  <a-icon type="plus" style="margin-right: 4px;" />{{ $t('dashboard.analysis.watchlist.add') }}
                </div>
              </a-select-option>
            </a-select>
            <a-button
type="primary"
size="large"
icon="thunderbolt"
@click="startFastAnalysis"
:loading="analyzing"
:disabled="!selectedSymbol || analyzing"
class="analyze-button">
              {{ $t('fastAnalysis.startAnalysis') }}
            </a-button>
            <a-button size="large" icon="history" @click="showHistoryModal = true; loadHistoryList()" class="history-button">
              {{ $t('fastAnalysis.history') }}
            </a-button>
          </div>

          <div class="analysis-main">
            <div v-if="!analysisResult && !analyzing && !analysisError" class="analysis-placeholder">
              <div class="placeholder-hero">
                <div class="hero-bg">
                  <div class="hero-bg-circle c1"></div>
                  <div class="hero-bg-circle c2"></div>
                  <div class="hero-bg-grid"></div>
                </div>
                <div class="hero-body">
                  <div class="hero-badge">AI-POWERED</div>
                  <h2 class="hero-title">{{ $t('aiAssetAnalysis.placeholder.title') }}</h2>
                  <p class="hero-subtitle">{{ $t('aiAssetAnalysis.placeholder.subtitle') }}</p>
                  <div class="hero-stats">
                    <div class="hstat">
                      <div class="hstat-icon"><a-icon type="line-chart" /></div>
                      <div class="hstat-body">
                        <span class="hstat-val">{{ $t('aiAssetAnalysis.placeholder.feature1') }}</span>
                        <span class="hstat-label">{{ $t('aiAssetAnalysis.placeholder.feature1Desc') }}</span>
                      </div>
                    </div>
                    <div class="hstat">
                      <div class="hstat-icon"><a-icon type="dashboard" /></div>
                      <div class="hstat-body">
                        <span class="hstat-val">{{ $t('aiAssetAnalysis.placeholder.feature2') }}</span>
                        <span class="hstat-label">{{ $t('aiAssetAnalysis.placeholder.feature2Desc') }}</span>
                      </div>
                    </div>
                    <div class="hstat">
                      <div class="hstat-icon"><a-icon type="apartment" /></div>
                      <div class="hstat-body">
                        <span class="hstat-val">{{ $t('aiAssetAnalysis.placeholder.feature3') }}</span>
                        <span class="hstat-label">{{ $t('aiAssetAnalysis.placeholder.feature3Desc') }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="hero-cta">
                    <a-button type="primary" size="large" icon="plus" @click="showAddStockModal = true">
                      {{ $t('dashboard.analysis.watchlist.add') }}
                    </a-button>
                    <a-button size="large" icon="thunderbolt" :disabled="!selectedSymbol" @click="startFastAnalysis">
                      {{ $t('fastAnalysis.startAnalysis') }}
                    </a-button>
                  </div>
                  <p class="hero-hint">{{ $t('aiAssetAnalysis.placeholder.quickStart') }}</p>
                </div>
              </div>
            </div>
            <FastAnalysisReport
              v-if="analysisResult || analyzing || analysisError"
              :result="analysisResult"
              :loading="analyzing"
              :error="analysisError"
              :error-tone="analysisErrorTone"
              @retry="startFastAnalysis"
              @generate-strategy="handleGenerateStrategy"
              @go-backtest="handleGoBacktest"
            />
          </div>
        </div>

        <div class="watchlist-panel">
          <div class="panel-header">
            <span class="panel-title"><a-icon type="star" theme="filled" /> {{ $t('dashboard.analysis.watchlist.title') }}</span>
            <span class="panel-header-actions">
              <a-tooltip :title="$t('aiAssetAnalysis.tasks.manage')">
                <a-badge :count="monitors.length" :offset="[-2, 2]" :number-style="{ fontSize: '9px', minWidth: '14px', height: '14px', lineHeight: '14px', padding: '0 3px' }">
                  <a-icon type="unordered-list" class="panel-header-icon" @click="showTaskDrawer = true" />
                </a-badge>
              </a-tooltip>
              <a-tooltip :title="$t('aiAssetAnalysis.batch.schedule')">
                <a-icon type="schedule" class="panel-header-icon" @click="toggleBatchMode" />
              </a-tooltip>
              <a-icon type="plus" class="panel-header-icon" @click="showAddStockModal = true" />
            </span>
          </div>

          <div class="panel-summary" v-if="watchlist && watchlist.length > 0">
            <div class="summary-chip">
              <span class="sc-num">{{ watchlist.length }}</span>
              <span class="sc-label">{{ $t('aiAssetAnalysis.watchlist.totalAssets') }}</span>
            </div>
            <div class="summary-chip" v-if="watchlistPositionCount > 0">
              <span class="sc-num">{{ watchlistPositionCount }}</span>
              <span class="sc-label">{{ $t('aiAssetAnalysis.watchlist.positionCount') }}</span>
            </div>
            <div class="summary-chip" v-if="watchlistTaskCount > 0">
              <span class="sc-num">{{ watchlistTaskCount }}</span>
              <span class="sc-label">{{ $t('aiAssetAnalysis.watchlist.taskCount') }}</span>
            </div>
            <div class="summary-chip pnl" v-if="watchlistTotalPnl !== 0">
              <span class="sc-num" :class="watchlistTotalPnl >= 0 ? 'up' : 'down'">{{ watchlistTotalPnl >= 0 ? '+' : '' }}{{ formatNum(watchlistTotalPnl) }}</span>
              <span class="sc-label">P&amp;L</span>
            </div>
          </div>

          <div class="batch-bar" v-if="batchMode">
            <a-checkbox :checked="batchSelectedAll" :indeterminate="batchIndeterminate" @change="onBatchSelectAll" class="batch-all-cb">
              {{ $t('aiAssetAnalysis.batch.selectAll') }}
            </a-checkbox>
            <a-button type="primary" size="small" :disabled="batchSelectedKeys.length === 0" @click="openBatchScheduleModal">
              {{ $t('aiAssetAnalysis.batch.schedule') }}<template v-if="batchSelectedKeys.length > 0"> {{ batchSelectedKeys.length }}</template>
            </a-button>
            <a-button size="small" @click="toggleBatchMode">{{ $t('common.cancel') }}</a-button>
          </div>

          <div class="watchlist-list">
            <div
              v-for="stock in (watchlist || [])"
              :key="`wl-${stock.market}-${stock.symbol}`"
              class="wl-card"
              :class="{ active: selectedSymbol === `${stock.market}:${stock.symbol}` }"
              @click="selectWatchlistItem(stock)"
            >
              <a-checkbox
                v-if="batchMode"
                class="wl-card-cb"
                :checked="batchSelectedKeys.includes(`${stock.market}:${stock.symbol}`)"
                @change="onBatchItemToggle(stock, $event)"
                @click.native.stop
              />
              <div class="wl-card-body" :class="{ 'with-cb': batchMode }">
                <!-- Main row: symbol + price/change -->
                <div class="wl-row-main">
                  <div class="wl-info-left">
                    <div class="wl-symbol-line">
                      <span class="wl-symbol">{{ stock.symbol }}</span>
                      <span class="wl-market">{{ getMarketName(stock.market) }}</span>
                    </div>
                    <div class="wl-name" v-if="stock.name && stock.name !== stock.symbol">{{ stock.name }}</div>
                  </div>
                  <div class="wl-sparkline-wrap" v-if="watchlistPrices[`${stock.market}:${stock.symbol}`]">
                    <svg class="wl-sparkline" viewBox="0 0 60 20" preserveAspectRatio="none">
                      <polyline
                        :points="getSparklinePoints(stock)"
                        fill="none"
                        :stroke="(watchlistPrices[`${stock.market}:${stock.symbol}`]?.change || 0) >= 0 ? '#10b981' : '#ef4444'"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                  <span v-else class="wl-spacer"></span>
                  <div class="wl-info-right" v-if="watchlistPrices[`${stock.market}:${stock.symbol}`]">
                    <span class="wl-price">{{ formatPrice(watchlistPrices[`${stock.market}:${stock.symbol}`].price) }}</span>
                    <span class="wl-change" :class="(watchlistPrices[`${stock.market}:${stock.symbol}`]?.change || 0) >= 0 ? 'up' : 'down'">
                      {{ (watchlistPrices[`${stock.market}:${stock.symbol}`]?.change || 0) >= 0 ? '+' : '' }}{{ formatNum(watchlistPrices[`${stock.market}:${stock.symbol}`]?.change) }}%
                    </span>
                  </div>
                </div>
                <div class="wl-row-pnl" v-if="positionSummaryMap[`${stock.market}:${stock.symbol}`]">
                  <span class="wl-pnl-qty">{{ formatNum(positionSummaryMap[`${stock.market}:${stock.symbol}`].quantity, 4) }} @ {{ formatPrice(positionSummaryMap[`${stock.market}:${stock.symbol}`].avgEntry || 0) }}</span>
                  <span class="wl-pnl-val" :class="positionSummaryMap[`${stock.market}:${stock.symbol}`].pnl >= 0 ? 'up' : 'down'">
                    {{ positionSummaryMap[`${stock.market}:${stock.symbol}`].pnl >= 0 ? '+' : '' }}{{ formatNum(positionSummaryMap[`${stock.market}:${stock.symbol}`].pnl || 0) }}
                    ({{ positionSummaryMap[`${stock.market}:${stock.symbol}`].pnlPercent >= 0 ? '+' : '' }}{{ formatNum(positionSummaryMap[`${stock.market}:${stock.symbol}`].pnlPercent || 0) }}%)
                  </span>
                </div>
                <div class="wl-row-task" v-if="getMonitorMeta(stock)">
                  <span class="wl-task-badge" :class="getMonitorMeta(stock).activeCount > 0 ? 'active' : 'paused'" @click.stop="toggleStockMonitor(stock)">
                    <a-icon :type="getMonitorMeta(stock).activeCount > 0 ? 'sync' : 'pause-circle'" :spin="getMonitorMeta(stock).activeCount > 0" />
                    {{ getMonitorMeta(stock).activeCount > 0 ? ($t('aiAssetAnalysis.monitor.running')) : ($t('aiAssetAnalysis.monitor.paused')) }}
                  </span>
                  <span class="wl-task-next" v-if="getMonitorMeta(stock).nextRunAtText">{{ getMonitorMeta(stock).nextRunAtText }}</span>
                </div>
              </div>
              <div class="wl-card-hover-actions">
                <a-tooltip :title="$t('aiAssetAnalysis.position.quickAdd')"><span class="wl-hover-btn" @click.stop="openPositionModal(stock)"><a-icon type="wallet" /></span></a-tooltip>
                <a-tooltip :title="$t('aiAssetAnalysis.monitor.quickTask')"><span class="wl-hover-btn" @click.stop="openMonitorModal(stock)"><a-icon type="clock-circle" /></span></a-tooltip>
                <span class="wl-hover-btn danger" @click.stop="removeFromWatchlist(stock)"><a-icon type="delete" /></span>
              </div>
            </div>
            <div v-if="!watchlist || watchlist.length === 0" class="watchlist-empty">
              <div class="we-icon"><a-icon type="star" /></div>
              <p>{{ $t('dashboard.analysis.empty.noWatchlist') }}</p>
              <a-button type="primary" size="small" icon="plus" @click="showAddStockModal = true">
                {{ $t('dashboard.analysis.watchlist.add') }}
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <a-modal
      :title="$t('dashboard.analysis.modal.addStock.title')"
      :visible="showAddStockModal"
      @ok="handleAddStock"
      @cancel="handleCloseAddStockModal"
      :confirmLoading="addingStock"
      width="600px"
      :wrapClassName="isDarkTheme ? 'qd-dark-modal' : ''"
      :okText="$t('dashboard.analysis.modal.addStock.confirm')"
      :cancelText="$t('dashboard.analysis.modal.addStock.cancel')"
    >
      <div class="add-stock-modal-content">
        <a-tabs v-model="selectedMarketTab" @change="handleMarketTabChange" class="market-tabs">
          <a-tab-pane
            v-for="marketType in marketTypes"
            :key="marketType.value"
            :tab="$t(marketType.i18nKey || `dashboard.analysis.market.${marketType.value}`)"
          >
          </a-tab-pane>
        </a-tabs>

        <!-- Search/input -->
        <div class="symbol-search-section">
          <a-input-search
            v-model="symbolSearchKeyword"
            :placeholder="searchInputPlaceholder"
            @search="handleSearchOrInput"
            @change="handleSymbolSearchInput"
            :loading="searchingSymbols"
            size="large"
            allow-clear
          >
            <a-button slot="enterButton" type="primary" icon="search">
              {{ $t('dashboard.analysis.modal.addStock.search') }}
            </a-button>
          </a-input-search>
          <!-- Inline guard: if the keyword the user is typing clearly belongs
               to a different market than the currently selected tab (e.g. a
               6-digit A-share code while on the US tab), warn before they
               submit and offer a one-click market switch. -->
          <div v-if="marketMismatchHint" class="market-mismatch-hint">
            <a-icon type="exclamation-circle" theme="filled" style="color: #faad14; margin-right: 6px;" />
            <span>{{ marketMismatchHint.msg }}</span>
            <a-button
              size="small"
              type="link"
              v-if="marketMismatchHint.suggestedMarket"
              @click="switchToSuggestedMarket(marketMismatchHint.suggestedMarket)"
              style="padding: 0 4px;"
            >
              {{ marketMismatchHint.switchLabel }}
            </a-button>
          </div>
        </div>

        <div v-if="symbolSearchResults.length > 0" class="search-results-section">
          <div class="section-title">
            <a-icon type="search" style="margin-right: 4px;" />
            {{ $t('dashboard.analysis.modal.addStock.searchResults') }}
          </div>
          <a-list
            :data-source="symbolSearchResults"
            :loading="searchingSymbols"
            size="small"
            class="symbol-list"
          >
            <a-list-item slot="renderItem" slot-scope="item" class="symbol-list-item" @click="selectSymbol(item)">
              <a-list-item-meta>
                <template slot="title">
                  <div class="symbol-item-content">
                    <span class="symbol-code">{{ item.symbol }}</span>
                    <span class="symbol-name">{{ item.name }}</span>
                    <a-tag v-if="item.exchange" size="small" color="blue" style="margin-left: 8px;">
                      {{ item.exchange }}
                    </a-tag>
                  </div>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </a-list>
        </div>

        <div class="hot-symbols-section">
          <div class="section-title">
            <a-icon type="fire" style="color: #ff4d4f; margin-right: 4px;" />
            {{ $t('dashboard.analysis.modal.addStock.hotSymbols') }}
          </div>
          <a-spin :spinning="loadingHotSymbols">
            <a-list
              v-if="hotSymbols.length > 0"
              :data-source="hotSymbols"
              size="small"
              class="symbol-list"
            >
              <a-list-item slot="renderItem" slot-scope="item" class="symbol-list-item" @click="selectSymbol(item)">
                <a-list-item-meta>
                  <template slot="title">
                    <div class="symbol-item-content">
                      <span class="symbol-code">{{ item.symbol }}</span>
                      <span class="symbol-name">{{ item.name }}</span>
                      <a-tag v-if="item.exchange" size="small" color="orange" style="margin-left: 8px;">
                        {{ item.exchange }}
                      </a-tag>
                    </div>
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </a-list>
            <a-empty v-else :description="$t('dashboard.analysis.modal.addStock.noHotSymbols')" :image="false" />
          </a-spin>
        </div>

        <!-- Selected symbol -->
        <div v-if="selectedSymbolForAdd" class="selected-symbol-section">
          <a-alert
            :message="$t('dashboard.analysis.modal.addStock.selectedSymbol')"
            type="info"
            show-icon
            closable
            @close="selectedSymbolForAdd = null"
          >
            <template slot="description">
              <div class="selected-symbol-info">
                <a-tag :color="getMarketColor(selectedSymbolForAdd.market)" style="margin-right: 8px;">
                  {{ $t(`dashboard.analysis.market.${selectedSymbolForAdd.market}`) }}
                </a-tag>
                <strong>{{ selectedSymbolForAdd.symbol }}</strong>
                <span v-if="selectedSymbolForAdd.name" style="color: #999; margin-left: 8px;">{{ selectedSymbolForAdd.name }}</span>
              </div>
            </template>
          </a-alert>
        </div>
      </div>
    </a-modal>

    <a-modal
      :visible="showPositionModal"
      :title="`${($i18n && $i18n.locale === 'zh-CN') ? '创建持仓（虚拟仓）' : 'Create Position (Virtual)'} - ${targetStockForOps ? targetStockForOps.symbol : ''}`"
      @ok="savePosition"
      @cancel="showPositionModal = false"
      :wrapClassName="isDarkTheme ? 'qd-dark-modal' : ''"
    >
      <a-form layout="vertical">
        <a-form-item :label="$t('portfolio.positions.side') || 'Direction'">
          <a-select v-model="positionForm.side">
            <a-select-option value="long">{{ $t('portfolio.positions.long') || 'Long' }}</a-select-option>
            <a-select-option value="short">{{ $t('portfolio.positions.short') || 'Short' }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="($i18n && $i18n.locale === 'zh-CN') ? '数量' : 'Quantity'">
          <a-input-number v-model="positionForm.quantity" :min="0" :step="0.01" style="width: 100%;" />
        </a-form-item>
        <a-form-item :label="($i18n && $i18n.locale === 'zh-CN') ? '买入单价' : 'Entry Price'">
          <a-input-number v-model="positionForm.entryPrice" :min="0" :step="0.01" style="width: 100%;" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :visible="showMonitorModal"
      :title="`${$t('aiAssetAnalysis.monitor.quickTask')} - ${targetStockForOps ? targetStockForOps.symbol : ''}`"
      @ok="saveMonitorTask"
      @cancel="showMonitorModal = false"
      :wrapClassName="isDarkTheme ? 'qd-dark-modal' : ''"
    >
      <a-form layout="vertical">
        <a-form-item :label="$t('aiAssetAnalysis.batch.intervalLabel')">
          <a-select v-model="monitorForm.interval_min" style="width: 100%;">
            <a-select-option :value="60">{{ $t('aiAssetAnalysis.batch.interval1h') }}</a-select-option>
            <a-select-option :value="240">{{ $t('aiAssetAnalysis.batch.interval4h') }}</a-select-option>
            <a-select-option :value="720">{{ $t('aiAssetAnalysis.batch.interval12h') }}</a-select-option>
            <a-select-option :value="1440">{{ $t('aiAssetAnalysis.batch.interval24h') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('aiAssetAnalysis.batch.notifyLabel')">
          <a-checkbox-group v-model="monitorForm.notify_channels" style="width: 100%;">
            <a-row :gutter="8">
              <a-col :span="8"><a-checkbox value="email"><a-icon type="mail" /> Email</a-checkbox></a-col>
              <a-col :span="8"><a-checkbox value="telegram"><a-icon type="send" /> Telegram</a-checkbox></a-col>
              <a-col :span="8"><a-checkbox value="webhook"><a-icon type="api" /> Webhook</a-checkbox></a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>
        <a-alert :message="$t('aiAssetAnalysis.monitor.tip')" type="info" show-icon />
      </a-form>
    </a-modal>

    <a-modal
      :visible="showBatchScheduleModal"
      :title="$t('aiAssetAnalysis.batch.scheduleTitle')"
      @ok="saveBatchSchedule"
      @cancel="showBatchScheduleModal = false"
      :confirmLoading="batchRunning"
      width="520px"
      :wrapClassName="isDarkTheme ? 'qd-dark-modal' : ''"
    >
      <div class="batch-modal-summary">
        <p>{{ $t('aiAssetAnalysis.batch.scheduleDesc', { count: batchSelectedKeys.length }) }}</p>
        <div class="batch-symbols-preview">
          <a-tag v-for="key in batchSelectedKeys" :key="key" color="blue" style="margin-bottom: 4px;">{{ key.split(':')[1] }}</a-tag>
        </div>
      </div>
      <a-form layout="vertical">
        <a-form-item :label="$t('aiAssetAnalysis.batch.intervalLabel')">
          <a-select v-model="batchScheduleForm.interval_min" style="width: 100%;">
            <a-select-option :value="60">{{ $t('aiAssetAnalysis.batch.interval1h') }}</a-select-option>
            <a-select-option :value="240">{{ $t('aiAssetAnalysis.batch.interval4h') }}</a-select-option>
            <a-select-option :value="720">{{ $t('aiAssetAnalysis.batch.interval12h') }}</a-select-option>
            <a-select-option :value="1440">{{ $t('aiAssetAnalysis.batch.interval24h') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('aiAssetAnalysis.batch.notifyLabel')">
          <a-checkbox-group v-model="batchScheduleForm.notify_channels" style="width: 100%;">
            <a-row :gutter="8">
              <a-col :span="8"><a-checkbox value="email"><a-icon type="mail" /> Email</a-checkbox></a-col>
              <a-col :span="8"><a-checkbox value="telegram"><a-icon type="send" /> Telegram</a-checkbox></a-col>
              <a-col :span="8"><a-checkbox value="webhook"><a-icon type="api" /> Webhook</a-checkbox></a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
      <a-alert :message="$t('aiAssetAnalysis.batch.scheduleTip')" type="info" show-icon style="margin-top: 8px;" />
    </a-modal>

    <a-drawer
      :title="$t('aiAssetAnalysis.tasks.manage')"
      :visible="showTaskDrawer"
      @close="showTaskDrawer = false"
      width="420"
      placement="right"
      :wrapClassName="isDarkTheme ? 'qd-dark-drawer' : ''"
    >
      <div v-if="monitors.length === 0" class="task-drawer-empty">
        <a-icon type="inbox" style="font-size: 40px; color: #ccc;" />
        <p>{{ $t('aiAssetAnalysis.tasks.empty') }}</p>
      </div>
      <div v-else class="task-drawer-list">
        <div v-for="m in monitors" :key="m.id" class="task-item">
          <div class="task-item-header">
            <span class="task-item-name">{{ m.name || 'AI Task' }}</span>
            <a-tag :color="m.is_active ? 'green' : 'default'" size="small">
              {{ m.is_active ? $t('aiAssetAnalysis.monitor.running') : $t('aiAssetAnalysis.monitor.paused') }}
            </a-tag>
          </div>
          <div class="task-item-meta">
            <span v-if="m.config && m.config.run_interval_minutes">
              <a-icon type="clock-circle" /> {{ formatIntervalText(m.config.run_interval_minutes) }}
            </span>
            <span v-if="m.next_run_at">
              <a-icon type="calendar" /> {{ _formatNextRunText(m.next_run_at) }}
            </span>
          </div>
          <div class="task-item-actions">
            <a-button size="small" :type="m.is_active ? 'default' : 'primary'" icon="poweroff" @click="handleToggleTask(m)">
              {{ m.is_active ? $t('aiAssetAnalysis.tasks.pause') : $t('aiAssetAnalysis.tasks.resume') }}
            </a-button>
            <a-button size="small" icon="edit" @click="handleEditTask(m)">{{ $t('aiAssetAnalysis.tasks.edit') }}</a-button>
            <a-popconfirm :title="$t('aiAssetAnalysis.tasks.deleteConfirm')" @confirm="handleDeleteTask(m)" :okText="$t('common.confirm')" :cancelText="$t('common.cancel')">
              <a-button size="small" type="danger" icon="delete">{{ $t('aiAssetAnalysis.tasks.delete') }}</a-button>
            </a-popconfirm>
          </div>
        </div>
      </div>
    </a-drawer>

    <a-modal
      :visible="showEditTaskModal"
      :title="$t('aiAssetAnalysis.tasks.edit')"
      @ok="saveEditTask"
      @cancel="showEditTaskModal = false"
      :confirmLoading="editTaskLoading"
      :wrapClassName="isDarkTheme ? 'qd-dark-modal' : ''"
    >
      <a-form layout="vertical" v-if="editTaskForm">
        <a-form-item :label="$t('aiAssetAnalysis.tasks.name')">
          <a-input v-model="editTaskForm.name" />
        </a-form-item>
        <a-form-item :label="$t('aiAssetAnalysis.batch.intervalLabel')">
          <a-select v-model="editTaskForm.interval_min" style="width: 100%;">
            <a-select-option :value="60">{{ $t('aiAssetAnalysis.batch.interval1h') }}</a-select-option>
            <a-select-option :value="240">{{ $t('aiAssetAnalysis.batch.interval4h') }}</a-select-option>
            <a-select-option :value="720">{{ $t('aiAssetAnalysis.batch.interval12h') }}</a-select-option>
            <a-select-option :value="1440">{{ $t('aiAssetAnalysis.batch.interval24h') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('aiAssetAnalysis.batch.notifyLabel')">
          <a-checkbox-group v-model="editTaskForm.notify_channels" style="width: 100%;">
            <a-row :gutter="8">
              <a-col :span="8"><a-checkbox value="email"><a-icon type="mail" /> Email</a-checkbox></a-col>
              <a-col :span="8"><a-checkbox value="telegram"><a-icon type="send" /> Telegram</a-checkbox></a-col>
              <a-col :span="8"><a-checkbox value="webhook"><a-icon type="api" /> Webhook</a-checkbox></a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :title="$t('dashboard.analysis.modal.history.title')"
      :visible="showHistoryModal"
      @cancel="showHistoryModal = false"
      :footer="null"
      width="800px"
      :bodyStyle="{ maxHeight: '60vh', overflowY: 'auto' }"
      :wrapClassName="isDarkTheme ? 'qd-dark-modal' : ''"
    >
      <a-spin :spinning="historyLoading">
        <a-list
          :data-source="historyList"
          :pagination="{
            current: historyPage,
            pageSize: historyPageSize,
            total: historyTotal,
            onChange: (page) => { historyPage = page; loadHistoryList() },
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onShowSizeChange: (current, size) => { historyPageSize = size; historyPage = 1; loadHistoryList() }
          }"
        >
          <a-list-item slot="renderItem" slot-scope="item">
            <a-list-item-meta>
              <template slot="title">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <a-tag :color="getMarketColor(item.market)" style="margin-right: 8px;">
                      {{ getMarketName(item.market) }}
                    </a-tag>
                    <strong>{{ item.symbol }}</strong>
                    <a-tag
                      :color="item.decision === 'BUY' ? 'green' : (item.decision === 'SELL' ? 'red' : 'blue')"
                      style="margin-left: 12px;"
                    >
                      {{ item.decision }}
                    </a-tag>
                    <a-tag :color="getStatusColor(item.status || 'completed')" style="margin-left: 8px;">
                      {{ getStatusText(item.status || 'completed') }}
                    </a-tag>
                    <span style="color: #999; margin-left: 8px; font-size: 12px;">
                      {{ $t('fastAnalysis.confidence') }}: {{ item.confidence }}%
                    </span>
                  </div>
                  <div>
                    <a-button
                      type="link"
                      size="small"
                      icon="eye"
                      :disabled="(item.status || '').toLowerCase() === 'processing'"
                      @click="viewHistoryResult(item)"
                    >
                      {{ $t('dashboard.analysis.modal.history.viewResult') }}
                    </a-button>
                    <a-popconfirm
                      :title="$t('dashboard.analysis.modal.history.deleteConfirm')"
                      :ok-text="$t('common.confirm')"
                      :cancel-text="$t('common.cancel')"
                      @confirm="deleteHistoryItem(item)"
                    >
                      <a-button
                        type="link"
                        size="small"
                        icon="delete"
                        style="color: #ff4d4f;"
                      >
                        {{ $t('dashboard.analysis.modal.history.delete') }}
                      </a-button>
                    </a-popconfirm>
                  </div>
                </div>
              </template>
              <template slot="description">
                <div style="color: #666; font-size: 12px;">
                  <span v-if="item.price">${{ formatNumber(item.price) }}</span>
                  <span v-if="item.summary" style="margin-left: 8px;">{{ item.summary.substring(0, 80) }}{{ item.summary.length > 80 ? '...' : '' }}</span>
                </div>
                <div v-if="item.created_at" style="color: #999; font-size: 12px; margin-top: 4px;">
                  {{ formatIsoTime(item.created_at) }}
                </div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </a-list>
        <a-empty v-if="!historyLoading && historyList.length === 0" :description="$t('dashboard.analysis.empty.noHistory')" />
      </a-spin>
    </a-modal>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { getUserInfo } from '@/api/login'
import { getWatchlist, addWatchlist, removeWatchlist, getWatchlistPrices, searchSymbols, getHotSymbols } from '@/api/market'
import { getPositions, addPosition, getMonitors, addMonitor, updateMonitor, deleteMonitor } from '@/api/portfolio'
import { fastAnalyze, getAllAnalysisHistory, deleteAnalysisHistory } from '@/api/fast-analysis'
import { getMarketSentiment, getEconomicCalendar } from '@/api/global-market'
import FastAnalysisReport from './components/FastAnalysisReport.vue'
import CopilotWorkbench from './components/CopilotWorkbench.vue'
import sessionCache from '@/utils/sessionCache'
import { loadEnabledMarketOptions, firstMarketValue } from '@/utils/marketModules'

// Cache only the context panels that remain on the default AI analysis screen.
// Market heatmaps and global index tickers are not loaded by default because
// they cost API calls without directly helping the user start an analysis.
const MARKET_CACHE = {
  sentiment: { key: 'aiAnalysis.market.sentiment', ttl: 5 * 60 * 1000 },
  calendar: { key: 'aiAnalysis.market.calendar.v3', ttl: 10 * 60 * 1000 }
}

// `window.requestIdleCallback` is unavailable on Safari < 16. Fall back to a
// short setTimeout so we still get the "yield to first paint, then run" effect.
function _onIdle (cb, timeout = 800) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(cb, { timeout })
  }
  return setTimeout(cb, 60)
}

export default {
  name: 'Analysis',
  props: {
    embedded: {
      type: Boolean,
      default: false
    },
    presetSymbol: {
      type: String,
      default: ''
    },
    autoAnalyzeSignal: {
      type: Number,
      default: 0
    }
  },
  components: {
    FastAnalysisReport,
    CopilotWorkbench
  },
  data () {
    return {
      loadingMarket: false,
      heatmapType: 'us_stocks',
      marketData: {
        fearGreed: null,
        vix: null,
        dxy: null,
        indices: [],
        heatmap: { us_stocks: [], hk_stocks: [], crypto: [], commodities: [], sectors: [], forex: [] },
        calendar: []
      },
      calendarMeta: {},
      loadingSentiment: false,
      loadingIndices: false,
      loadingHeatmap: false,
      loadingCalendar: false,
      watchlistPriceTimer: null,
      watchlistPrices: {},
      localUserInfo: {},
      loadingUserInfo: false,
      userId: 1,
      watchlist: [],
      loadingWatchlist: false,
      showAddStockModal: false,
      addingStock: false,
      selectedSymbol: undefined,
      analyzing: false,
      analysisResult: null,
      analysisError: null,
      analysisErrorTone: 'error',
      showHistoryModal: false,
      historyList: [],
      historyLoading: false,
      historyPage: 1,
      historyPageSize: 20,
      historyTotal: 0,
      currentTaskId: null,
      taskPollingTimer: null,
      taskPollingStartedAt: 0,
      marketTypes: [],
      selectedMarketTab: '',
      symbolSearchKeyword: '',
      symbolSearchResults: [],
      searchingSymbols: false,
      hotSymbols: [],
      loadingHotSymbols: false,
      selectedSymbolForAdd: null,
      searchTimer: null,
      hasSearched: false,
      positions: [],
      monitors: [],
      positionSummaryMap: {},
      showPositionModal: false,
      showMonitorModal: false,
      targetStockForOps: null,
      positionForm: {
        side: 'long',
        quantity: null,
        entryPrice: null
      },
      monitorForm: {
        interval_min: 240,
        notify_channels: []
      },
      batchMode: false,
      batchSelectedKeys: [],
      batchRunning: false,
      batchProgress: 0,
      showBatchScheduleModal: false,
      batchScheduleForm: {
        interval_min: 240,
        notify_channels: []
      },
      showTaskDrawer: false,
      showEditTaskModal: false,
      editTaskLoading: false,
      editTaskId: null,
      editTaskForm: {
        name: '',
        interval_min: 240,
        notify_channels: []
      }
    }
  },
  computed: {
    ...mapGetters(['userInfo']),
    ...mapState({
      navTheme: state => state.app.theme,
      primaryColor: state => state.app.color || '#1890ff'
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    isZhLocale () {
      return String(this.$i18n.locale || '').toLowerCase().startsWith('zh')
    },
    calendarStatus () {
      const status = (this.calendarMeta && this.calendarMeta.status) || ''
      const message = String((this.calendarMeta && this.calendarMeta.message) || '')
      if (status === 'upstream_error' && /403|forbidden/i.test(message)) {
        return 'forbidden'
      }
      if (status === 'upstream_error' && /429|rate limit/i.test(message)) {
        return 'rate_limited'
      }
      return status
    },
    calendarErrorMessage () {
      const message = String((this.calendarMeta && this.calendarMeta.message) || this.$t('globalMarket.fetchError') || '')
      return message
        .replace(/([?&]token=)[^&\s]+/ig, '$1***')
        .replace(/([?&]api_?key=)[^&\s]+/ig, '$1***')
    },
    currentHeatmap () {
      return this.marketData.heatmap[this.heatmapType] || []
    },
    storeUserInfo () {
      return this.userInfo || {}
    },
    mergedUserInfo () {
      return this.localUserInfo && this.localUserInfo.email ? this.localUserInfo : this.storeUserInfo
    },
    watchlistTotalPnl () {
      return Object.values(this.positionSummaryMap).reduce((s, v) => s + (Number(v.pnl) || 0), 0)
    },
    watchlistPositionCount () {
      return Object.values(this.positionSummaryMap).filter(v => v.quantity > 0).length
    },
    watchlistTaskCount () {
      return Object.values(this.positionSummaryMap).reduce((s, v) => s + (v.monitorCount || 0), 0)
    },
    batchSelectedAll () {
      return this.watchlist && this.watchlist.length > 0 && this.batchSelectedKeys.length === this.watchlist.length
    },
    batchIndeterminate () {
      return this.batchSelectedKeys.length > 0 && this.batchSelectedKeys.length < (this.watchlist || []).length
    },
    // Dynamic placeholder for the "add to watchlist" search box. Showing
    // market-specific examples up front prevents users from typing the wrong
    // shape (e.g. "000159" while sitting on the US tab) in the first place.
    searchInputPlaceholder () {
      // Crypto example deliberately spells out BASE/QUOTE form. The backend
      // canonicalises bare bases (BTC -> BTC/USDT) but storing the canonical
      // shape from the start makes UI / dedupe / search far less surprising.
      const examples = {
        USStock: this.i18nText('dashboard.analysis.modal.addStock.example.USStock', 'e.g. AAPL, MSFT, NVDA'),
        CNStock: this.i18nText('dashboard.analysis.modal.addStock.example.CNStock', 'e.g. 600519, 000001, 300750'),
        HKStock: this.i18nText('dashboard.analysis.modal.addStock.example.HKStock', 'e.g. 00700, 09988, 03690'),
        Crypto: this.i18nText('dashboard.analysis.modal.addStock.example.Crypto', 'e.g. BTC/USDT, ETH/USDT, SOL/USDT'),
        Forex: this.i18nText('dashboard.analysis.modal.addStock.example.Forex', 'e.g. EURUSD, GBPUSD'),
        Futures: this.i18nText('dashboard.analysis.modal.addStock.example.Futures', 'e.g. GC, CL, ES'),
        MOEX: this.i18nText('dashboard.analysis.modal.addStock.example.MOEX', 'e.g. SBER, GAZP, LKOH')
      }
      const fallback = this.$t('dashboard.analysis.modal.addStock.searchOrInputPlaceholder')
      return examples[this.selectedMarketTab] || fallback
    },
    // Inline warning shown beneath the search box when the keyword being
    // typed clearly belongs to a different market. Returns null when there's
    // nothing to warn about, or `{msg, suggestedMarket, switchLabel}`. The
    // switch button uses `suggestedMarket` to one-click hop to the right tab.
    marketMismatchHint () {
      const raw = (this.symbolSearchKeyword || '').trim().toUpperCase()
      if (!raw || !this.selectedMarketTab) return null

      // 6 digits => CN A-share. The exact shape of every other market
      // (US tickers, FX pairs, HK with 4-5 digits + optional .HK) is too
      // ambiguous to warn on without false positives, so we only flag this
      // one high-confidence pattern.
      if (/^\d{6}$/.test(raw) && this.selectedMarketTab !== 'CNStock') {
        const hasCN = (this.marketTypes || []).some(m => m.value === 'CNStock')
        return {
          msg: this.i18nText('dashboard.analysis.modal.addStock.mismatch.cn', '"{symbol}" looks like a CN A-share code (6 digits), not {market}.', {
            symbol: raw,
            market: this.marketLabel(this.selectedMarketTab)
          }),
          suggestedMarket: hasCN ? 'CNStock' : '',
          switchLabel: this.i18nText('dashboard.analysis.modal.addStock.switchTo', 'Switch to {market}', {
            market: this.marketLabel('CNStock')
          })
        }
      }
      // Explicit .HK suffix => must be HKStock.
      if (raw.endsWith('.HK') && this.selectedMarketTab !== 'HKStock') {
        const hasHK = (this.marketTypes || []).some(m => m.value === 'HKStock')
        return {
          msg: this.i18nText('dashboard.analysis.modal.addStock.mismatch.hk', '"{symbol}" looks like a Hong Kong stock code (.HK suffix), not {market}.', {
            symbol: raw,
            market: this.marketLabel(this.selectedMarketTab)
          }),
          suggestedMarket: hasHK ? 'HKStock' : '',
          switchLabel: this.i18nText('dashboard.analysis.modal.addStock.switchTo', 'Switch to {market}', {
            market: this.marketLabel('HKStock')
          })
        }
      }
      // Crypto on the Crypto tab without a "/" => the backend will canonicalise
      // bare bases (BTC -> BTC/USDT) and the price layer also does it at
      // runtime, but spelling out the convention here keeps users from being
      // confused later when search results / strategy lists show "BTC/USDT".
      // No suggestedMarket; renders as a plain hint without a switch button.
      if (this.selectedMarketTab === 'Crypto' && raw && !raw.includes('/')) {
        return {
          msg: this.i18nText('dashboard.analysis.modal.addStock.mismatch.cryptoPairHint', 'Crypto symbols should be entered as BASE/QUOTE, such as BTC/USDT. If you submit "{symbol}", it will be auto-completed to {pair}.', {
            symbol: raw,
            pair: `${raw}/USDT`
          }),
          suggestedMarket: '',
          switchLabel: ''
        }
      }
      return null
    }
  },
  created () {
    // 1. Render-from-cache pass: hydrate lightweight context panels from
    //    sessionStorage. No network round-trips here.
    this._hydrateMarketCache()

    // 2. Critical-path requests: user info + market types are tiny and
    //    drive subsequent UI (e.g. the watchlist selector). Watchlist +
    //    positions are user-specific and immediately visible, so they
    //    stay on the eager path.
    this.loadUserInfo()
    this.loadMarketTypes()
    this.loadWatchlist()
    this.loadPositionData()

    // 3. Deferred path: refresh the economic calendar after first paint and
    //    only when the cached value is stale.
    _onIdle(() => this.loadMarketData())
  },
  mounted () {
    this.startWatchlistPriceRefresh()
  },
  activated () {
    // keep-alive re-entry. We don't re-run the entire created() path; we just
    // top up any data whose cache window has aged past TTL. Critical user
    // data (positions, watchlist prices) is refreshed unconditionally
    // because users expect those to reflect "right now".
    this.loadPositionData()
    if (this.watchlist && this.watchlist.length > 0) {
      this.loadWatchlistPrices()
    }
    _onIdle(() => this.loadMarketData())
  },
  beforeDestroy () {
    if (this.watchlistPriceTimer) {
      clearInterval(this.watchlistPriceTimer)
    }
    if (this.taskPollingTimer) {
      clearInterval(this.taskPollingTimer)
      this.taskPollingTimer = null
    }
  },
  methods: {
    stopTaskPolling () {
      if (this.taskPollingTimer) {
        clearInterval(this.taskPollingTimer)
        this.taskPollingTimer = null
      }
      this.currentTaskId = null
      this.taskPollingStartedAt = 0
    },
    async pollTaskResult () {
      if (!this.currentTaskId) return
      try {
        const res = await getAllAnalysisHistory({ page: 1, pagesize: 50 })
        if (!(res && res.code === 1 && res.data)) return
        const list = res.data.list || []
        const task = list.find(x => Number(x.id) === Number(this.currentTaskId))
        if (!task) return

        const st = String(task.status || '').toLowerCase()
        if (st === 'completed') {
          if (task.full_result) {
            this.analysisResult = task.full_result
          } else {
            // Reuse the existing hydration path so displayed fields stay consistent.
            await this.viewHistoryResult(task)
          }
          this.$message.success(this.$t('dashboard.analysis.message.analysisComplete'))
          await this.refreshUserInfoFromServer()
          this.analyzing = false
          this.stopTaskPolling()
        } else if (st === 'failed') {
          this.analysisError = task.error_message || this.$t('dashboard.analysis.message.analysisFailed')
          this.analysisErrorTone = 'error'
          this.$message.error(this.analysisError)
          await this.refreshUserInfoFromServer()
          this.analyzing = false
          this.stopTaskPolling()
        } else if (Date.now() - this.taskPollingStartedAt > 3 * 60 * 1000) {
          // Stop automatic polling after timeout; users can refresh history manually.
          this.$message.warning(this.$t('fastAnalysis.analysisStillProcessing') || '任务仍在处理中，请稍后在历史记录查看')
          this.analyzing = false
          this.stopTaskPolling()
        }
      } catch (e) {
        // Polling errors should not interrupt the visible analysis flow.
      }
    },
    async startTaskPolling (taskId) {
      this.stopTaskPolling()
      this.currentTaskId = Number(taskId)
      this.taskPollingStartedAt = Date.now()
      await this.pollTaskResult()
      this.taskPollingTimer = setInterval(() => {
        this.pollTaskResult()
      }, 2500)
    },
    watchlistSelectLabel (stock) {
      if (!stock) return ''
      const sym = (stock.symbol || '').trim()
      const nm = (stock.name || '').trim()
      if (nm && nm !== sym) return `${sym} · ${nm}`
      return sym
    },
    filterSymbolOption (input, option) {
      const props = option.componentOptions?.propsData || {}
      const value = props.value || ''
      if (value === '__add_stock_option__') return true
      const q = (input || '').toLowerCase()
      const label = (props.label || '').toString().toLowerCase()
      return value.toLowerCase().includes(q) || (label && label.includes(q))
    },
    handleSymbolChange (value) {
      if (value === '__add_stock_option__') {
        this.showAddStockModal = true
        this.$nextTick(() => {
          this.selectedSymbol = undefined
        })
        return
      }
      this.selectedSymbol = value
      // Clear previous result when symbol changes
      this.analysisResult = null
      this.analysisError = null
      this.analysisErrorTone = 'error'
      // Notify parent about symbol change (for Quick Trade integration)
      this.$emit('symbol-change', value)
    },
    selectWatchlistItem (stock) {
      this.selectedSymbol = `${stock.market}:${stock.symbol}`
      this.analysisResult = null
      this.analysisError = null
      this.analysisErrorTone = 'error'
      this.$emit('symbol-change', this.selectedSymbol)
    },
    hasMonitorForStock (stock) {
      if (!stock) return false
      const key = `${stock.market}:${stock.symbol}`
      const summary = this.positionSummaryMap[key]
      return !!(summary && summary.monitorCount > 0)
    },
    getMonitorMeta (stock) {
      if (!stock) return null
      const key = `${stock.market}:${stock.symbol}`
      const summary = this.positionSummaryMap[key]
      if (!summary || summary.monitorCount <= 0) return null
      return {
        activeCount: summary.activeMonitorCount || 0,
        nextRunAtText: summary.nextRunAtText || ''
      }
    },
    getPnlBarStyle (summary) {
      const pct = Math.abs(Number(summary?.pnlPercent || 0))
      const width = Math.min(100, Math.max(4, pct))
      return { width: `${width}%` }
    },
    /**
     * Match the IANA timezone configured in profile; fallback to browser local time when missing or invalid.
     */
    _displayDateTimeLocaleOptions () {
      const tz = String((this.storeUserInfo && this.storeUserInfo.timezone) || '').trim()
      const base = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }
      if (!tz) return base
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz }).format(new Date())
        return { ...base, timeZone: tz }
      } catch (e) {
        return base
      }
    },

    /**
     * Parse backend timestamps (prefer RFC3339 / UTC Z) and display them with _displayDateTimeLocaleOptions.
     */
    _parseInstantForDisplay (s) {
      s = String(s || '').trim()
      if (!s) return null
      const hasTz = /[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)
      if (!hasTz) {
        const norm = s.replace(' ', 'T')
        s = norm.endsWith('Z') ? norm : `${norm}Z`
      }
      const d = new Date(s)
      return Number.isNaN(d.getTime()) ? null : d
    },
    _formatNextRunText (iso) {
      try {
        const d = this._parseInstantForDisplay(iso)
        if (!d) return ''
        return d.toLocaleString(undefined, this._displayDateTimeLocaleOptions())
      } catch (e) {
        return ''
      }
    },
    buildPositionSummary () {
      const map = {}
      const positions = Array.isArray(this.positions) ? this.positions : []
      const monitors = Array.isArray(this.monitors) ? this.monitors : []
      const monitorPositionIds = new Set()
      const positionKeyById = {}
      positions.forEach(pos => {
        positionKeyById[Number(pos.id)] = `${pos.market}:${pos.symbol}`
      })
      monitors.forEach(m => {
        const ids = Array.isArray(m.position_ids) ? m.position_ids : []
        ids.forEach(id => monitorPositionIds.add(Number(id)))
        const active = !!m.is_active
        const nextRunAt = m.next_run_at || ''
        ids.forEach(id => {
          const key = positionKeyById[Number(id)]
          if (!key) return
          if (!map[key]) {
            map[key] = {
              quantity: 0,
              weightedEntry: 0,
              pnl: 0,
              marketValue: 0,
              monitorCount: 0,
              activeMonitorCount: 0,
              nextRunAtText: ''
            }
          }
          map[key].monitorCount += 1
          if (active) map[key].activeMonitorCount += 1
          if (!map[key].nextRunAtText && nextRunAt) {
            map[key].nextRunAtText = this._formatNextRunText(nextRunAt)
          }
        })
      })
      positions.forEach(pos => {
        const key = `${pos.market}:${pos.symbol}`
        const qty = Number(pos.quantity || 0)
        const entry = Number(pos.entry_price || 0)
        if (!map[key]) {
          map[key] = {
            quantity: 0,
            weightedEntry: 0,
            pnl: 0,
            marketValue: 0,
            monitorCount: 0,
            activeMonitorCount: 0,
            nextRunAtText: ''
          }
        }
        map[key].quantity += qty
        map[key].weightedEntry += qty * entry
        map[key].pnl += Number(pos.pnl || 0)
        map[key].marketValue += Number(pos.market_value || 0)
        if (monitorPositionIds.has(Number(pos.id))) {
          map[key].monitorCount += 1
        }
      })
      Object.keys(map).forEach(k => {
        const x = map[k]
        x.avgEntry = x.quantity > 0 ? x.weightedEntry / x.quantity : 0
        const cost = x.quantity > 0 ? x.weightedEntry : 0
        x.pnlPercent = cost > 0 ? (x.pnl / cost) * 100 : 0
      })
      this.positionSummaryMap = map
    },
    async toggleStockMonitor (stock) {
      const key = `${stock.market}:${stock.symbol}`
      const ids = (this.positions || [])
        .filter(p => `${p.market}:${p.symbol}` === key)
        .map(p => Number(p.id))
        .filter(Boolean)
      if (ids.length === 0) return
      const targetMonitors = (this.monitors || []).filter(m => {
        const mids = Array.isArray(m.position_ids) ? m.position_ids.map(x => Number(x)) : []
        return mids.some(id => ids.includes(id))
      })
      if (targetMonitors.length === 0) return
      const shouldEnable = !targetMonitors.some(m => !!m.is_active)
      try {
        await Promise.all(targetMonitors.map(m => updateMonitor(m.id, { is_active: shouldEnable })))
        this.$message.success(
          shouldEnable
            ? (this.$t('aiAssetAnalysis.monitor.enabled') || '已启用任务')
            : (this.$t('aiAssetAnalysis.monitor.disabled') || '已暂停任务')
        )
        await this.loadPositionData()
      } catch (e) {
        this.$message.error(e?.response?.data?.msg || e?.message || 'Toggle monitor failed')
      }
    },
    async loadPositionData () {
      try {
        const [posRes, monRes] = await Promise.all([
          getPositions(),
          getMonitors()
        ])
        this.positions = posRes && posRes.code === 1 ? (posRes.data || []) : []
        this.monitors = monRes && monRes.code === 1 ? (monRes.data || []) : []
        this.buildPositionSummary()
      } catch (e) {
        this.positions = []
        this.monitors = []
        this.positionSummaryMap = {}
      }
    },
    openPositionModal (stock) {
      this.targetStockForOps = stock
      const key = `${stock.market}:${stock.symbol}`
      const existingPos = (this.positions || []).find(p => `${p.market}:${p.symbol}` === key)
      if (existingPos) {
        const qty = Number(existingPos.quantity || 0)
        this.positionForm = {
          side: existingPos.side || (qty < 0 ? 'short' : 'long'),
          quantity: Math.abs(qty) || null,
          entryPrice: Number(existingPos.entry_price || 0) || null
        }
      } else {
        this.positionForm = {
          side: 'long',
          quantity: null,
          entryPrice: null
        }
      }
      this.showPositionModal = true
    },
    async savePosition () {
      const stock = this.targetStockForOps
      if (!stock) return
      const quantity = Number(this.positionForm.quantity || 0)
      const entryPrice = Number(this.positionForm.entryPrice || 0)
      if (!(quantity > 0) || !(entryPrice > 0)) {
        this.$message.warning(
          this.$i18n && this.$i18n.locale === 'zh-CN'
            ? '请输入有效的数量和买入单价'
            : 'Please enter valid quantity and entry price'
        )
        return
      }
      try {
        const res = await addPosition({
          market: stock.market,
          symbol: stock.symbol,
          name: stock.name || stock.symbol,
          side: this.positionForm.side || 'long',
          quantity,
          entry_price: entryPrice
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('portfolio.positions.add') + ' OK')
          this.showPositionModal = false
          await this.loadPositionData()
        } else {
          this.$message.error(res?.msg || 'Add position failed')
        }
      } catch (e) {
        this.$message.error(e?.response?.data?.msg || e?.message || 'Add position failed')
      }
    },
    openMonitorModal (stock) {
      this.targetStockForOps = stock
      this.monitorForm = {
        interval_min: 240,
        notify_channels: []
      }
      this.showMonitorModal = true
    },
    async saveMonitorTask () {
      const stock = this.targetStockForOps
      if (!stock) return
      const key = `${stock.market}:${stock.symbol}`
      const interval = this.monitorForm.interval_min
      const notifyChannels = this.monitorForm.notify_channels || []
      const positionIds = (this.positions || [])
        .filter(p => `${p.market}:${p.symbol}` === key)
        .map(p => Number(p.id))
        .filter(Boolean)
      try {
        const res = await addMonitor({
          name: `AI-${stock.symbol}-${interval}m`,
          position_ids: positionIds,
          monitor_type: 'ai',
          config: { run_interval_minutes: interval, symbol: stock.symbol, market: stock.market, language: this.$store.getters.lang || this.$i18n.locale || 'en-US' },
          notification_config: { channels: notifyChannels },
          is_active: true
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('aiAssetAnalysis.monitor.created'))
          this.showMonitorModal = false
          await this.loadPositionData()
        } else {
          this.$message.error(res?.msg || 'Create monitor failed')
        }
      } catch (e) {
        this.$message.error(e?.response?.data?.msg || e?.message || 'Create monitor failed')
      }
    },
    toggleBatchMode () {
      this.batchMode = !this.batchMode
      if (!this.batchMode) this.batchSelectedKeys = []
    },
    onBatchSelectAll (e) {
      if (e.target.checked) {
        this.batchSelectedKeys = (this.watchlist || []).map(s => `${s.market}:${s.symbol}`)
      } else {
        this.batchSelectedKeys = []
      }
    },
    onBatchItemToggle (stock, e) {
      const key = `${stock.market}:${stock.symbol}`
      if (e.target.checked) {
        if (!this.batchSelectedKeys.includes(key)) this.batchSelectedKeys.push(key)
      } else {
        this.batchSelectedKeys = this.batchSelectedKeys.filter(k => k !== key)
      }
    },
    openBatchScheduleModal () {
      if (this.batchSelectedKeys.length === 0) return
      this.batchScheduleForm = { interval_min: 240, notify_channels: [] }
      this.showBatchScheduleModal = true
    },
    async saveBatchSchedule () {
      const keys = [...this.batchSelectedKeys]
      if (keys.length === 0) return
      this.batchRunning = true
      const interval = this.batchScheduleForm.interval_min
      const notifyChannels = this.batchScheduleForm.notify_channels || []
      let created = 0
      for (const key of keys) {
        const [market, symbol] = key.split(':')
        const stock = (this.watchlist || []).find(s => s.market === market && s.symbol === symbol)
        if (!stock) continue
        const positionIds = (this.positions || [])
          .filter(p => `${p.market}:${p.symbol}` === key)
          .map(p => Number(p.id))
          .filter(Boolean)
        try {
          await addMonitor({
            name: `AI-${symbol}-${interval}m`,
            position_ids: positionIds,
            monitor_type: 'ai',
            config: { run_interval_minutes: interval, symbol, market, language: this.$store.getters.lang || this.$i18n.locale || 'en-US' },
            notification_config: { channels: notifyChannels },
            is_active: true
          })
          created++
        } catch (_) {}
      }
      this.batchRunning = false
      this.showBatchScheduleModal = false
      this.batchMode = false
      this.batchSelectedKeys = []
      await this.loadPositionData()
      this.$message.success(this.$t('aiAssetAnalysis.batch.done') + ` (${created}/${keys.length})`)
    },
    formatIntervalText (minutes) {
      if (minutes >= 1440) return `${Math.round(minutes / 1440)}d`
      if (minutes >= 60) return `${Math.round(minutes / 60)}h`
      return `${minutes}m`
    },
    async handleToggleTask (m) {
      try {
        await updateMonitor(m.id, { is_active: !m.is_active })
        this.$message.success(m.is_active ? this.$t('aiAssetAnalysis.tasks.paused') : this.$t('aiAssetAnalysis.tasks.resumed'))
        await this.loadPositionData()
      } catch (e) {
        this.$message.error(e?.response?.data?.msg || e?.message || 'Failed')
      }
    },
    handleEditTask (m) {
      this.editTaskId = m.id
      this.editTaskForm = {
        name: m.name || '',
        interval_min: (m.config && m.config.run_interval_minutes) || 240,
        notify_channels: (m.notification_config && m.notification_config.channels) || []
      }
      this.showEditTaskModal = true
    },
    async saveEditTask () {
      if (!this.editTaskId) return
      this.editTaskLoading = true
      try {
        await updateMonitor(this.editTaskId, {
          name: this.editTaskForm.name,
          config: { run_interval_minutes: this.editTaskForm.interval_min },
          notification_config: { channels: this.editTaskForm.notify_channels }
        })
        this.$message.success('OK')
        this.showEditTaskModal = false
        await this.loadPositionData()
      } catch (e) {
        this.$message.error(e?.response?.data?.msg || e?.message || 'Failed')
      } finally {
        this.editTaskLoading = false
      }
    },
    async handleDeleteTask (m) {
      try {
        await deleteMonitor(m.id)
        this.$message.success(this.$t('aiAssetAnalysis.tasks.deleted'))
        await this.loadPositionData()
      } catch (e) {
        this.$message.error(e?.response?.data?.msg || e?.message || 'Failed')
      }
    },
    // Cache-first hydration. Called from created() before any network work so
    // lightweight context panels can paint with last-session's data.
    _hydrateMarketCache () {
      try {
        const sentiment = sessionCache.read(MARKET_CACHE.sentiment.key)
        if (sentiment) {
          this.marketData.fearGreed = sentiment.fearGreed ?? null
          this.marketData.vix = sentiment.vix ?? null
          this.marketData.dxy = sentiment.dxy ?? null
        }
        const calendar = sessionCache.read(MARKET_CACHE.calendar.key)
        if (Array.isArray(calendar)) {
          this.marketData.calendar = calendar
          this.calendarMeta = {}
        } else if (calendar && typeof calendar === 'object') {
          this.marketData.calendar = Array.isArray(calendar.events) ? calendar.events : []
          this.calendarMeta = calendar.meta || {}
        }
      } catch (e) {
        // Cache hydration is best-effort; never let it block UI render.
      }
    },
    async loadMarketData (force = false) {
      // Default screen only loads visible, decision-relevant context.
      // Opportunity radar, index ticker, heatmap and sentiment widgets stay
      // off the hot path so opening this page does not burn unnecessary API calls.
      const bypass = force === true
      this.loadingMarket = true
      this.loadingSentiment = false
      this.loadingIndices = false
      this.loadingHeatmap = false
      this.loadCalendarData(bypass)
    },
    async loadSentimentData (force = false) {
      const meta = MARKET_CACHE.sentiment
      if (!force && sessionCache.isFresh(meta.key) && this.marketData.fearGreed != null) {
        // Cache still warm; nothing to do. checkAllLoaded() handles the
        // collective loading flag.
        this.loadingSentiment = false
        this.checkAllLoaded()
        return
      }
      this.loadingSentiment = true
      try {
        const res = await getMarketSentiment()
        if (res?.code === 1 && res?.data) {
          const next = {
            fearGreed: res.data.fear_greed?.value || null,
            vix: res.data.vix?.value || null,
            dxy: res.data.dxy?.value || null
          }
          this.marketData.fearGreed = next.fearGreed
          this.marketData.vix = next.vix
          this.marketData.dxy = next.dxy
          sessionCache.write(meta.key, next, meta.ttl)
        }
      } catch (e) {
        console.error('Load sentiment failed:', e)
      } finally {
        this.loadingSentiment = false
        this.checkAllLoaded()
      }
    },
    async loadCalendarData (force = false) {
      const meta = MARKET_CACHE.calendar
      if (!force && sessionCache.isFresh(meta.key) && (this.marketData.calendar || []).length > 0) {
        this.loadingCalendar = false
        this.checkAllLoaded()
        return
      }
      this.loadingCalendar = true
      try {
        const res = await getEconomicCalendar({ force: force ? '1' : undefined })
        if (res?.code === 1) {
          const next = Array.isArray(res.data) ? res.data : []
          const responseMeta = res.meta || {}
          this.marketData.calendar = next
          this.calendarMeta = responseMeta
          sessionCache.write(meta.key, { events: next, meta: responseMeta }, meta.ttl)
        }
      } catch (e) {
        console.error('Load calendar failed:', e)
      } finally {
        this.loadingCalendar = false
        this.checkAllLoaded()
      }
    },
    checkAllLoaded () {
      // Close the aggregate loading state once visible context is ready.
      if (!this.loadingSentiment && !this.loadingCalendar) {
        this.loadingMarket = false
      }
    },
    getFearGreedClass (val) {
      if (!val) return ''
      if (val <= 25) return 'extreme-fear'
      if (val <= 45) return 'fear'
      if (val <= 55) return 'neutral'
      if (val <= 75) return 'greed'
      return 'extreme-greed'
    },
    getVixLevel (val) {
      if (!val) return ''
      if (val < 15) return 'low'
      if (val < 25) return 'medium'
      return 'high'
    },
    getSparklinePoints (stock) {
      const key = `${stock.market}:${stock.symbol}`
      const pd = this.watchlistPrices[key]
      if (!pd || !pd.price) return '0,10 60,10'
      const change = pd.change || 0
      const endPrice = pd.price
      const startPrice = endPrice / (1 + change / 100)
      const numPts = 20
      const w = 60
      const h = 20
      const seed = stock.symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      const priceDiff = Math.abs(endPrice - startPrice)
      const minAmplitude = endPrice * 0.003
      const amplitude = Math.max(priceDiff, minAmplitude)
      const prices = []
      for (let i = 0; i <= numPts; i++) {
        const t = i / numPts
        const base = startPrice + (endPrice - startPrice) * t
        const noise = (Math.sin(i * 2.7 + seed) + Math.sin(i * 1.3 + seed * 0.3)) * amplitude * 0.25
        prices.push(base + noise)
      }
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      const range = max - min || 1
      return prices.map((p, i) => {
        const x = (i / numPts) * w
        const y = h - ((p - min) / range) * (h - 4) - 2
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    },
    formatNum (num, digits = 2) {
      if (num === undefined || num === null || isNaN(num)) return '--'
      return Number(num).toFixed(digits)
    },
    getHeatmapStyle (value) {
      const v = parseFloat(value) || 0
      const intensity = Math.min(Math.abs(v) / 5, 1)
      const dark = this.isDarkTheme
      if (v >= 0) {
        const color = dark ? (v > 2 ? '#fff' : '#4ade80') : (v > 2 ? '#fff' : '#166534')
        return { background: `rgba(34, 197, 94, ${0.15 + intensity * 0.6})`, color }
      } else {
        const color = dark ? (v < -2 ? '#fff' : '#f87171') : (v < -2 ? '#fff' : '#991b1b')
        return { background: `rgba(239, 68, 68, ${0.15 + intensity * 0.6})`, color }
      }
    },
    getCountryFlag (country) {
      const flags = { US: '🇺🇸', CN: '🇨🇳', EU: '🇪🇺', JP: '🇯🇵', UK: '🇬🇧', DE: '🇩🇪', AU: '🇦🇺', CA: '🇨🇦' }
      return flags[country] || '🌍'
    },
    formatCalendarDate (dateStr) {
      if (!dateStr) return ''
      try {
        const date = new Date(dateStr)
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        if (date.toDateString() === today.toDateString()) {
          return this.isZhLocale ? '今天' : 'Today'
        }
        if (date.toDateString() === tomorrow.toDateString()) {
          return this.isZhLocale ? '明天' : 'Tmrw'
        }

        const month = date.getMonth() + 1
        const day = date.getDate()
        return `${month}/${day}`
      } catch (e) {
        return dateStr
      }
    },
    formatPrice (price) {
      if (!price) return '--'
      if (price >= 10000) return (price / 1000).toFixed(1) + 'K'
      if (price >= 1000) return price.toFixed(0)
      return price.toFixed(2)
    },
    formatHeatmapPrice (price) {
      if (!price) return ''
      const prefix = this.heatmapType === 'hk_stocks' ? 'HK$' : '$'
      if (price >= 10000) return prefix + (price / 1000).toFixed(1) + 'K'
      if (price >= 1000) return prefix + price.toFixed(0)
      if (price >= 1) return prefix + price.toFixed(2)
      return prefix + price.toFixed(4)
    },
    getHeatmapName (item) {
      if (this.heatmapType === 'hk_stocks') {
        return this.isZhLocale ? (item.name_cn || item.fullName || item.name) : (item.name || item.fullName)
      }
      if (this.heatmapType === 'us_stocks') {
        return item.name || item.fullName || ''
      }
      if (this.heatmapType === 'sectors' || this.heatmapType === 'commodities' || this.heatmapType === 'forex') {
        return this.isZhLocale ? (item.name_cn || item.name) : (item.name_en || item.name)
      }
      return item.name
    },
    getImpactClass (evt) {
      return evt.actual_impact || evt.expected_impact || 'neutral'
    },
    formatCalendarValue (evt) {
      const val = evt && (evt.actual || evt.forecast)
      if (val == null || val === '' || val === '-') return '--'
      return val
    },
    getCalendarInsightTitle (evt) {
      const insight = evt && evt.ai_insight
      if (!insight) return ''
      return this.isZhLocale ? (insight.title || insight.title_en || '') : (insight.title_en || insight.title || '')
    },
    getCalendarInsightSummary (evt) {
      const insight = evt && evt.ai_insight
      if (!insight) return ''
      return this.isZhLocale ? (insight.summary || insight.summary_en || '') : (insight.summary_en || insight.summary || '')
    },
    getCalendarRiskWindow (evt) {
      const insight = evt && evt.ai_insight
      const window = insight && insight.volatility_window
      return (window && window.label) || ''
    },
    getCalendarInsightAssets (evt) {
      const insight = evt && evt.ai_insight
      const assets = insight && Array.isArray(insight.affected_assets) ? insight.affected_assets : []
      return assets.slice(0, 4)
    },
    getMarketColor (market) {
      const colors = {
        'USStock': 'green',
        'CNStock': 'blue',
        'HKStock': 'geekblue',
        'Crypto': 'purple',
        'Forex': 'gold',
        'Futures': 'cyan'
      }
      return colors[market] || 'default'
    },
    getCurrencySymbol (market) {
      return '$'
    },
    formatCreditNum (n) {
      if (n === undefined || n === null || n === '') return '--'
      const x = Number(n)
      if (Number.isNaN(x)) return String(n)
      return Number.isInteger(x) ? String(x) : x.toFixed(2)
    },
    async refreshUserInfoFromServer () {
      try {
        const res = await getUserInfo()
        if (res && res.code === 1 && res.data) {
          this.localUserInfo = res.data
          this.userId = res.data.id
          this.$store.commit('SET_INFO', res.data)
        }
      } catch (e) {
      }
    },
    handleGenerateStrategy (result) {
      const market = result.market || (this.selectedSymbol ? this.selectedSymbol.split(':')[0] : '')
      const symbol = result.symbol || (this.selectedSymbol ? this.selectedSymbol.split(':')[1] : '')
      const decision = result.decision || 'HOLD'
      const tp = result.trading_plan || {}
      const query = {
        mode: 'create',
        market,
        symbol,
        from_analysis: '1',
        decision,
        entry_price: tp.entry_price || tp.entryPrice || '',
        stop_loss: tp.stop_loss || tp.stopLoss || '',
        take_profit: tp.take_profit || tp.takeProfit || ''
      }
      Object.keys(query).forEach(k => { if (!query[k] && query[k] !== 0) delete query[k] })
      this.$router.push({ path: '/strategy-live', query })
    },
    handleGoBacktest (result) {
      const market = result.market || (this.selectedSymbol ? this.selectedSymbol.split(':')[0] : '')
      const symbol = result.symbol || (this.selectedSymbol ? this.selectedSymbol.split(':')[1] : '')
      this.$router.push({
        path: '/indicator-ide',
        query: { market, symbol }
      })
    },
    async startFastAnalysis () {
      if (this.analyzing) return
      if (!this.selectedSymbol) {
        this.$message.warning(this.$t('dashboard.analysis.message.selectSymbol'))
        return
      }

      this.analyzing = true
      this.analysisError = null
      this.analysisErrorTone = 'error'

      const [market, symbol] = this.selectedSymbol.split(':')
      const language = this.$store.getters.lang || 'zh-CN'

      let keepProgress = false
      try {
        const res = await fastAnalyze({
          market: market,
          symbol: symbol,
          language: language,
          timeframe: '1D',
          async_submit: true
        })

        if (res && res.code === 1 && res.data) {
          if (res.data.status === 'processing') {
            keepProgress = true
            const rem = res.data.remaining_credits
            if (rem !== undefined && rem !== null) {
              this.$message.success(
                this.$t('fastAnalysis.analysisSubmittedWithCredits', { remaining: this.formatCreditNum(rem) })
              )
            } else {
              this.$message.success(this.$t('fastAnalysis.analysisSubmitted') || '任务已提交，正在分析中')
            }
            await this.startTaskPolling(res.data.task_id)
          } else {
            const payload = { ...res.data }
            delete payload.credits_charged
            delete payload.remaining_credits
            this.analysisResult = payload
            const rem = res.data.remaining_credits
            if (rem !== undefined && rem !== null) {
              this.$message.success(
                this.$t('fastAnalysis.analysisCompleteWithCredits', { remaining: this.formatCreditNum(rem) })
              )
            } else {
              this.$message.success(this.$t('dashboard.analysis.message.analysisComplete'))
            }
          }
          await this.refreshUserInfoFromServer()
        } else {
          throw new Error(res?.msg || '分析失败')
        }
      } catch (error) {
        console.error('Fast analysis failed:', error)
        const status = error?.response?.status
        const body = error?.response?.data || {}
        const msg = body.msg
        const data = body.data

        if (status === 429 && data && data.in_progress) {
          this.analysisErrorTone = 'warning'
          this.analysisError = this.$t('fastAnalysis.analysisInProgress')
          this.$message.warning(this.analysisError)
        } else if (status === 400 && msg === 'Insufficient credits') {
          this.analysisError = this.$t('fastAnalysis.insufficientCreditsDetail', {
            required: this.formatCreditNum(data?.required),
            current: this.formatCreditNum(data?.current),
            shortage: this.formatCreditNum(data?.shortage)
          })
          this.$message.error(this.analysisError)
        } else {
          this.analysisError = msg || error?.message || this.$t('dashboard.analysis.message.analysisFailed')
          this.$message.error(this.analysisError)
        }
      } finally {
        if (!keepProgress) {
          this.analyzing = false
        }
      }
    },
    async loadHistoryList () {
      this.historyLoading = true
      try {
        const res = await getAllAnalysisHistory({
          page: this.historyPage,
          pagesize: this.historyPageSize
        })

        if (res && res.code === 1 && res.data) {
          this.historyList = res.data.list || []
          this.historyTotal = res.data.total || 0
        }
      } catch (error) {
        this.$message.error(this.$t('dashboard.analysis.message.loadHistoryFailed') || '加载历史记录失败')
      } finally {
        this.historyLoading = false
      }
    },
    async viewHistoryResult (item) {
      if ((item.status || '').toLowerCase() === 'processing') {
        this.$message.info(this.$t('fastAnalysis.analysisStillProcessing') || '该任务仍在处理中，请稍后刷新历史记录')
        return
      }
      if (item.full_result) {
        this.analysisResult = item.full_result
        this.selectedSymbol = `${item.market}:${item.symbol}`
        this.showHistoryModal = false
        return
      }

      // Otherwise build a display payload from the historical row; stop loss/take profit geometry must match decision.
      const p = Number(item.price) || 0
      const dec = String(item.decision || 'HOLD').toUpperCase()
      let stopLoss = null
      let takeProfit = null
      if (p > 0) {
        if (dec === 'SELL') {
          stopLoss = p * 1.05
          takeProfit = p * 0.95
        } else if (dec === 'BUY') {
          stopLoss = p * 0.95
          takeProfit = p * 1.05
        }
      }
      this.analysisResult = {
        decision: item.decision,
        confidence: item.confidence,
        summary: item.summary,
        market_data: {
          current_price: item.price,
          change_24h: 0
        },
        trading_plan: {
          entry_price: item.price,
          stop_loss: stopLoss,
          take_profit: takeProfit
        },
        scores: item.scores || {},
        reasons: item.reasons || [],
        risks: [],
        indicators: item.indicators || {},
        memory_id: item.id,
        analysis_time_ms: 0
      }
      this.selectedSymbol = `${item.market}:${item.symbol}`
      this.showHistoryModal = false
    },
    async deleteHistoryItem (item) {
      try {
        const res = await deleteAnalysisHistory(item.id)
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.analysis.message.deleteSuccess'))
          this.loadHistoryList()
        } else {
          this.$message.error(res?.msg || this.$t('dashboard.analysis.message.deleteFailed'))
        }
      } catch (error) {
        this.$message.error(this.$t('dashboard.analysis.message.deleteFailed'))
      }
    },
    formatTime (timestamp) {
      if (!timestamp) return '-'
      const date = new Date(timestamp * 1000)
      if (Number.isNaN(date.getTime())) return '-'
      return date.toLocaleString(undefined, this._displayDateTimeLocaleOptions())
    },
    formatIsoTime (isoString) {
      const d = this._parseInstantForDisplay(isoString)
      if (!d) return '-'
      return d.toLocaleString(undefined, this._displayDateTimeLocaleOptions())
    },
    getStatusColor (status) {
      const colors = {
        'pending': 'orange',
        'processing': 'blue',
        'completed': 'green',
        'failed': 'red'
      }
      return colors[status] || 'default'
    },
    getStatusText (status) {
      const statusMap = {
        'pending': 'dashboard.analysis.status.pending',
        'processing': 'dashboard.analysis.status.processing',
        'completed': 'dashboard.analysis.status.completed',
        'failed': 'dashboard.analysis.status.failed'
      }
      const key = statusMap[status]
      return key ? this.$t(key) : status
    },
    async loadUserInfo () {
      this.loadingUserInfo = true
      try {
        if (this.storeUserInfo && this.storeUserInfo.email) {
          this.localUserInfo = this.storeUserInfo
          this.userId = this.storeUserInfo.id
          this.loadingUserInfo = false
          this.loadWatchlist()
          return
        }
        const res = await getUserInfo()
        if (res && res.code === 1 && res.data) {
          this.localUserInfo = res.data
          this.userId = res.data.id
          this.$store.commit('SET_INFO', res.data)
          this.loadWatchlist()
        }
      } catch (error) {
        // Silent fail
      } finally {
        this.loadingUserInfo = false
      }
    },
    async loadWatchlist () {
      if (!this.userId) return
      this.loadingWatchlist = true
      try {
        const res = await getWatchlist({ userid: this.userId })
        if (res && res.code === 1 && res.data) {
          this.watchlist = res.data.map(item => ({
            ...item,
            price: 0,
            change: 0,
            changePercent: 0
          }))
          await this.loadWatchlistPrices()
        }
      } catch (error) {
        // Silent fail
      } finally {
        this.loadingWatchlist = false
      }
    },
    async loadWatchlistPrices () {
      if (!this.watchlist || this.watchlist.length === 0) return

      try {
        const watchlistData = this.watchlist.map(item => ({
          market: item.market,
          symbol: item.symbol
        }))

        const res = await getWatchlistPrices({
          watchlist: watchlistData
        })

        if (res && res.code === 1 && res.data) {
          const priceMap = {}
          const pricesObj = {}
          res.data.forEach(item => {
            priceMap[`${item.market}-${item.symbol}`] = item
            // Also fill watchlistPrices object, using ":" as the key separator.
            pricesObj[`${item.market}:${item.symbol}`] = {
              price: item.price || 0,
              change: item.changePercent || 0
            }
          })
          this.watchlistPrices = pricesObj

          this.watchlist = this.watchlist.map(item => {
            const key = `${item.market}-${item.symbol}`
            const priceData = priceMap[key]
            if (priceData) {
              return {
                ...item,
                price: priceData.price || 0,
                change: priceData.change || 0,
                changePercent: priceData.changePercent || 0
              }
            }
            return item
          })
        }
      } catch (error) {
        // Silent fail
      }
    },
    startWatchlistPriceRefresh () {
      this.watchlistPriceTimer = setInterval(() => {
        if (this.watchlist && this.watchlist.length > 0) {
          this.loadWatchlistPrices()
        }
      }, 30000)

      if (this.watchlist && this.watchlist.length > 0) {
        this.loadWatchlistPrices()
      }
    },
    // Client-side sanity check for (market, symbol) pairs before we send them
    // to /watchlist/add. Mirrors backend _validate_watchlist_pair in
    // routes/market.py; backend remains the source of truth, this just avoids
    // a round-trip and gives clearer guidance to the user. Returns an error
    // string when the pair is implausible, or '' when it looks OK.
    _validateWatchlistPair (market, symbol) {
      if (!market || !symbol) return this.i18nText('dashboard.analysis.modal.addStock.missingMarketOrSymbol', 'Missing market or symbol')
      // Pure 6-digit codes are CN A-shares and must not go to Crypto / US / etc.
      if (/^\d{6}$/.test(symbol) && market !== 'CNStock') {
        return this.i18nText('dashboard.analysis.modal.addStock.validate.cn', '"{symbol}" looks like a CN A-share; choose {target} instead of {market}.', {
          symbol,
          market: this.marketLabel(market),
          target: this.marketLabel('CNStock')
        })
      }
      if (symbol.toUpperCase().endsWith('.HK') && market !== 'HKStock') {
        return this.i18nText('dashboard.analysis.modal.addStock.validate.hk', '"{symbol}" looks like a Hong Kong stock; choose {target}.', {
          symbol,
          target: this.marketLabel('HKStock')
        })
      }
      return ''
    },
    async handleAddStock () {
      let market = ''
      let symbol = ''
      let name = ''

      if (this.selectedSymbolForAdd) {
        market = this.selectedSymbolForAdd.market
        symbol = this.selectedSymbolForAdd.symbol.toUpperCase()
        name = this.selectedSymbolForAdd.name || ''
      } else if (this.symbolSearchKeyword && this.symbolSearchKeyword.trim()) {
        if (!this.selectedMarketTab) {
          this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
          return
        }
        market = this.selectedMarketTab
        symbol = this.symbolSearchKeyword.trim().toUpperCase()
        name = ''
      } else {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectOrEnterSymbol'))
        return
      }

      // Final guard: refuse obvious market/symbol mismatches before sending the
      // request. Backend will also reject them (defense in depth), but blocking
      // here gives the user immediate, specific feedback instead of a 400.
      const pairErr = this._validateWatchlistPair(market, symbol)
      if (pairErr) {
        this.$message.warning(pairErr)
        return
      }

      this.addingStock = true
      try {
        const res = await addWatchlist({
          userid: this.userId,
          market: market,
          symbol: symbol,
          name: name
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.analysis.message.addStockSuccess'))
          this.handleCloseAddStockModal()
          await this.loadWatchlist()
        } else {
          this.$message.error(res?.msg || this.$t('dashboard.analysis.message.addStockFailed'))
        }
      } catch (error) {
        const errorMsg = error?.response?.data?.msg || error?.message || this.$t('dashboard.analysis.message.addStockFailed')
        this.$message.error(errorMsg)
      } finally {
        this.addingStock = false
      }
    },
    handleCloseAddStockModal () {
      this.showAddStockModal = false
      this.selectedSymbolForAdd = null
      this.symbolSearchKeyword = ''
      this.symbolSearchResults = []
      this.hasSearched = false
      this.selectedMarketTab = this.marketTypes.length > 0 ? this.marketTypes[0].value : ''
    },
    handleMarketTabChange (activeKey) {
      this.selectedMarketTab = activeKey
      this.symbolSearchKeyword = ''
      this.symbolSearchResults = []
      this.selectedSymbolForAdd = null
      this.hasSearched = false
      this.loadHotSymbols(activeKey)
    },
    // Triggered by the inline mismatch-hint's "Switch to <market>" button.
    // Keeps the keyword the user already typed so they don't have to retype
    // it after switching tabs; they just see the search re-fire on the
    // correct market.
    switchToSuggestedMarket (targetMarket) {
      if (!targetMarket || targetMarket === this.selectedMarketTab) return
      const keyword = this.symbolSearchKeyword
      this.selectedMarketTab = targetMarket
      this.symbolSearchResults = []
      this.selectedSymbolForAdd = null
      this.hasSearched = false
      this.loadHotSymbols(targetMarket)
      // Preserve and re-trigger search on the new tab.
      this.symbolSearchKeyword = keyword
      if (keyword && keyword.trim()) {
        if (this.searchTimer) {
          clearTimeout(this.searchTimer)
        }
        this.searchTimer = setTimeout(() => {
          this.searchSymbolsInModal(keyword)
        }, 200)
      }
    },
    handleSymbolSearchInput (e) {
      const keyword = e.target.value
      this.symbolSearchKeyword = keyword

      if (this.searchTimer) {
        clearTimeout(this.searchTimer)
      }

      if (!keyword || keyword.trim() === '') {
        this.symbolSearchResults = []
        this.hasSearched = false
        this.selectedSymbolForAdd = null
        return
      }

      this.searchTimer = setTimeout(() => {
        this.searchSymbolsInModal(keyword)
      }, 500)
    },
    handleSearchOrInput (keyword) {
      if (!keyword || !keyword.trim()) return

      if (!this.selectedMarketTab) {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
        return
      }

      if (this.symbolSearchResults.length > 0) return

      if (this.hasSearched && this.symbolSearchResults.length === 0) {
        this.handleDirectAdd()
      } else {
        this.searchSymbolsInModal(keyword)
      }
    },
    async searchSymbolsInModal (keyword) {
      if (!keyword || keyword.trim() === '') {
        this.symbolSearchResults = []
        this.hasSearched = false
        return
      }

      if (!this.selectedMarketTab) {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
        return
      }

      this.searchingSymbols = true
      this.hasSearched = true
      try {
        const res = await searchSymbols({
          market: this.selectedMarketTab,
          keyword: keyword.trim(),
          limit: 20
        })
        if (res && res.code === 1 && res.data && res.data.length > 0) {
          this.symbolSearchResults = res.data
        } else {
          // Search returned nothing. Previously we silently fabricated a
          // synthetic result from the typed text, which made it too easy to
          // let users persist things like {Crypto, 000159}. Now we keep the
          // selection empty so the "Add" button stays disabled, and only
          // pre-fill the selection when the symbol format actually fits the
          // currently selected market tab.
          this.symbolSearchResults = []
          const candidate = keyword.trim().toUpperCase()
          const pairErr = this._validateWatchlistPair(this.selectedMarketTab, candidate)
          if (pairErr) {
            this.selectedSymbolForAdd = null
            this.$message.warning(pairErr)
          } else {
            this.selectedSymbolForAdd = {
              market: this.selectedMarketTab,
              symbol: candidate,
              name: ''
            }
          }
        }
      } catch (error) {
        // Network / server error: same policy as "no results"; never blindly
        // accept the user's typed symbol against an arbitrary market tab.
        this.symbolSearchResults = []
        const candidate = keyword.trim().toUpperCase()
        const pairErr = this._validateWatchlistPair(this.selectedMarketTab, candidate)
        if (pairErr) {
          this.selectedSymbolForAdd = null
          this.$message.warning(pairErr)
        } else {
          this.selectedSymbolForAdd = {
            market: this.selectedMarketTab,
            symbol: candidate,
            name: ''
          }
        }
      } finally {
        this.searchingSymbols = false
      }
    },
    handleDirectAdd () {
      if (!this.symbolSearchKeyword || !this.symbolSearchKeyword.trim()) {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseEnterSymbol'))
        return
      }

      if (!this.selectedMarketTab) {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
        return
      }

      const candidate = this.symbolSearchKeyword.trim().toUpperCase()
      const pairErr = this._validateWatchlistPair(this.selectedMarketTab, candidate)
      if (pairErr) {
        this.selectedSymbolForAdd = null
        this.$message.warning(pairErr)
        return
      }

      this.selectedSymbolForAdd = {
        market: this.selectedMarketTab,
        symbol: candidate,
        name: ''
      }
    },
    selectSymbol (symbol) {
      this.selectedSymbolForAdd = {
        market: symbol.market,
        symbol: symbol.symbol,
        name: symbol.name || symbol.symbol
      }
    },
    async loadHotSymbols (market) {
      if (!market) {
        market = this.selectedMarketTab || (this.marketTypes.length > 0 ? this.marketTypes[0].value : '')
      }

      if (!market) return

      this.loadingHotSymbols = true
      try {
        const res = await getHotSymbols({
          market: market,
          limit: 10
        })
        if (res && res.code === 1 && res.data) {
          this.hotSymbols = res.data
        } else {
          this.hotSymbols = []
        }
      } catch (error) {
        this.hotSymbols = []
      } finally {
        this.loadingHotSymbols = false
      }
    },
    async removeFromWatchlist (stock) {
      if (!this.userId) return
      const symbol = typeof stock === 'object' ? stock.symbol : stock
      const market = typeof stock === 'object' ? stock.market : arguments[1]
      try {
        const res = await removeWatchlist({
          userid: this.userId,
          symbol: symbol,
          market: market
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.analysis.message.removeStockSuccess'))
          await this.loadWatchlist()
        } else {
          this.$message.error(res?.msg || this.$t('dashboard.analysis.message.removeStockFailed'))
        }
      } catch (error) {
        this.$message.error(this.$t('dashboard.analysis.message.removeStockFailed'))
      }
    },
    i18nText (key, fallback, values) {
      const translated = this.$t ? this.$t(key, values) : key
      if (translated && translated !== key) return translated
      return Object.entries(values || {}).reduce((text, [name, value]) => {
        return text.replace(new RegExp(`\\{${name}\\}`, 'g'), value)
      }, fallback)
    },
    getMarketName (market) {
      return this.i18nText(`dashboard.analysis.market.${market}`, market || '')
    },
    formatNumber (num) {
      if (typeof num === 'string') return num
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    async loadMarketTypes () {
      this.marketTypes = await loadEnabledMarketOptions({ includeFeatures: ['research'] })

      if (this.marketTypes.length > 0 && !this.selectedMarketTab) {
        this.selectedMarketTab = firstMarketValue(this.marketTypes)
      }
    }
  },
  watch: {
    presetSymbol (newVal) {
      if (newVal && newVal !== this.selectedSymbol) {
        this.selectedSymbol = newVal
        this.analysisResult = null
        this.analysisError = null
        this.analysisErrorTone = 'error'
      }
    },
    autoAnalyzeSignal (newVal) {
      if (!newVal) return
      if (this.presetSymbol && this.presetSymbol !== this.selectedSymbol) {
        this.selectedSymbol = this.presetSymbol
      }
      this.$nextTick(() => {
        this.startFastAnalysis()
      })
    },
    showAddStockModal (newVal) {
      if (newVal) {
        if (this.marketTypes.length > 0 && !this.selectedMarketTab) {
          this.selectedMarketTab = this.marketTypes[0].value
        }
        if (this.selectedMarketTab) {
          this.loadHotSymbols(this.selectedMarketTab)
        }
      } else {
        this.selectedSymbolForAdd = null
        this.symbolSearchKeyword = ''
        this.symbolSearchResults = []
        this.hasSearched = false
        if (this.searchTimer) {
          clearTimeout(this.searchTimer)
          this.searchTimer = null
        }
      }
    }
  }
}
</script>

<style lang="less" scoped>
.ai-analysis-container {
  display: flex;
  height: calc(100vh - 88px);
  background: #f0f2f5;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.ai-analysis-container.embedded {
  height: calc(100vh - 92px);
  min-height: 560px;
  background: transparent;
}

@media (max-width: 768px) {
  .ai-analysis-container.embedded {
    min-height: 0;
  }
}

.ai-analysis-container.embedded .main-content-full {
  box-shadow: none;
  border-radius: 0;
}

.ai-analysis-container.embedded .top-index-bar {
  margin-top: 6px;
}

// Full-width main content
.main-content-full {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  border-radius: 0;
  height: 100%;
  box-shadow: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

// Top index strip
.top-index-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-family: 'SF Mono', Monaco, Consolas, monospace;

  .indicator-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 10px;
    background: #fff;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    min-width: 50px;

    .ind-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; }
    .ind-value { font-size: 13px; font-weight: 700; color: #1e293b; }

    &.fear-greed.extreme-fear .ind-value { color: #dc2626; }
    &.fear-greed.fear .ind-value { color: #ea580c; }
    &.fear-greed.neutral .ind-value { color: #ca8a04; }
    &.fear-greed.greed .ind-value { color: #65a30d; }
    &.fear-greed.extreme-greed .ind-value { color: #16a34a; }
    &.vix.low .ind-value { color: #16a34a; }
    &.vix.medium .ind-value { color: #ca8a04; }
    &.vix.high .ind-value { color: #dc2626; }
    &.dxy .ind-value { color: #2563eb; }
  }

  .indices-marquee {
    flex: 1;
    overflow: hidden;
    min-width: 0;

    .marquee-track {
      display: flex;
      gap: 8px;
      animation: marquee 35s linear infinite;
      width: max-content;
      &:hover { animation-play-state: paused; }
    }

    .index-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #fff;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      font-size: 11px;
      white-space: nowrap;

      .idx-flag { font-size: 11px; }
      .idx-symbol { color: #64748b; font-weight: 500; }
      .idx-price { color: #1e293b; font-weight: 600; }
      .idx-change {
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 1px;
        &.up { color: #16a34a; }
        &.down { color: #dc2626; }
      }
    }
  }

  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  .refresh-btn {
    color: #94a3b8;
    flex-shrink: 0;
    &:hover { color: #1e293b; }
  }
}

.main-body {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
  min-height: 0;
}

.left-panel {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;

  .heatmap-box {
    background: #fff;
    border-radius: 10px;
    padding: 14px;
    border: 1px solid #eaeef3;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

    .box-header {
      margin-bottom: 10px;

      ::v-deep .ant-radio-group.heatmap-type-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        width: 100%;
        background: #f4f5f7;
        border-radius: 8px;
        padding: 3px;

        .ant-radio-button-wrapper {
          flex: 1 1 calc(33.333% - 3px);
          min-width: 0;
          max-width: calc(33.333% - 2px);
          font-size: 10px;
          font-weight: 600;
          padding: 0 2px;
          height: 26px;
          line-height: 26px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #8c8c8c;
          box-shadow: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
          transition: all 0.2s;

          &::before { display: none; }

          &:hover { color: #555; }

          &.ant-radio-button-wrapper-checked {
            background: #fff;
            border-color: transparent;
            color: #111;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
        }
      }
    }

    .heatmap-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;

      .heat-cell {
        padding: 6px 4px;
        border-radius: 6px;
        text-align: center;
        font-size: 9px;
        transition: transform 0.15s;
        &:hover { transform: scale(1.03); }
        .heat-name { display: block; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 1px; }
        .heat-price { display: block; font-size: 9px; opacity: 0.8; margin-bottom: 1px; }
        .heat-val { font-weight: 700; font-size: 10px; }
      }
    }
  }

  .calendar-box {
    flex: 1;
    background: #fff;
    border-radius: 10px;
    padding: 14px;
    border: 1px solid #eaeef3;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;

    .box-header {
      margin-bottom: 8px;
      .box-title {
        font-size: 12px;
        color: #555;
        font-weight: 700;
        letter-spacing: -0.1px;
        .anticon { margin-right: 6px; color: var(--primary-color, #1890ff); }
      }
    }

    .calendar-list {
      flex: 1;
      overflow-y: auto;

      &::-webkit-scrollbar { width: 3px; }
      &::-webkit-scrollbar-thumb { background: #d4d8dd; border-radius: 2px; }

      .cal-item {
        padding: 7px 0;
        border-bottom: 1px solid #f1f5f9;
        font-size: 10px;
        &:last-child { border-bottom: none; }
        &.high { border-left: 3px solid #dc2626; padding-left: 8px; margin-left: -4px; }
        &.medium { border-left: 3px solid #ca8a04; padding-left: 8px; margin-left: -4px; }
        &.low { border-left: 3px solid #16a34a; padding-left: 8px; margin-left: -4px; }

        .cal-main-row {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .cal-date {
          font-size: 9px;
          color: #94a3b8;
          min-width: 32px;
          font-weight: 500;
        }
        .cal-time { color: #64748b; min-width: 36px; font-weight: 500; }
        .cal-flag { font-size: 12px; }
        .cal-name { flex: 1; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-impact {
          font-weight: 600;
          font-size: 10px;
          display: flex;
          align-items: center;
          gap: 2px;
          &.bullish { color: #16a34a; }
          &.bearish { color: #dc2626; }
          &.neutral { color: #94a3b8; }
        }
        .cal-ai-insight {
          margin: 6px 0 0 74px;
          padding: 6px 7px;
          border-radius: 7px;
          background: #f8fafc;
          border: 1px solid #e5edf5;
          &.high {
            background: #fff7ed;
            border-color: #fed7aa;
          }
          &.medium {
            background: #f8fbff;
            border-color: #dbeafe;
          }
          &.low {
            background: #f8fafc;
            border-color: #e5edf5;
          }
        }
        .cal-ai-title {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #1e293b;
          font-weight: 700;
          line-height: 1.3;
          .anticon { color: var(--primary-color, #1890ff); }
          span {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          em {
            flex: none;
            font-style: normal;
            color: #64748b;
            font-weight: 600;
            font-size: 9px;
          }
        }
        .cal-ai-summary {
          margin-top: 4px;
          color: #64748b;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .cal-ai-assets {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 5px;
        }
        .cal-ai-asset {
          padding: 1px 5px;
          border-radius: 999px;
          background: #eef2ff;
          color: #475569;
          font-weight: 600;
          line-height: 1.5;
          &.up { background: #dcfce7; color: #15803d; }
          &.down { background: #fee2e2; color: #b91c1c; }
          &.volatility { background: #fef3c7; color: #92400e; }
        }
      }
      .cal-empty {
        text-align: center;
        color: #94a3b8;
        padding: 20px 12px;
        font-size: 12px;
        line-height: 1.6;
        .cal-empty-title {
          color: #334155;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .cal-empty-desc {
          max-width: 320px;
          margin: 0 auto 4px;
        }
      }
    }
  }
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #eaeef3;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  .analysis-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f2f5;
    background: #fafbfc;
    border-radius: 10px 10px 0 0;

    .symbol-selector {
      flex: 1;
      max-width: 320px;
    }

    ::v-deep .symbol-selector {
      .wl-select-option-row {
        display: flex;
        align-items: center;
        flex-wrap: nowrap;
        gap: 8px;
        min-width: 0;
      }
      .wl-select-symbol {
        flex: 0 0 auto;
        margin-left: 0;
      }
      .wl-select-name {
        flex: 1 1 auto;
        min-width: 0;
        margin-left: 0;
        padding-left: 4px;
        color: #8c8c8c;
        font-size: 13px;
        font-weight: 400;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        border-left: 1px solid #f0f0f0;
      }
    }

    .analyze-button {
      background: var(--primary-color, #1890ff);
      border-color: var(--primary-color, #1890ff);
      border-radius: 8px;
      font-weight: 600;
    }

    .history-button {
      border-color: #d9d9d9;
      border-radius: 8px;
    }
  }

  .analysis-main {
    flex: 1;
    overflow: auto;
    padding: 16px;
    min-height: 0;

    .analysis-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 300px;
    }
  }
}

.watchlist-panel {
  width: 300px;
  flex-shrink: 0;
  align-self: flex-start;
  max-height: calc(100vh - 180px);
  background: #fff;
  border-radius: 10px;
  border: 1px solid #eaeef3;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid #f0f2f5;
    background: #fafbfc;

    .panel-title {
      font-size: 13px;
      font-weight: 700;
      color: #333;
      letter-spacing: -0.1px;
      .anticon { color: #facc15; margin-right: 6px; }
    }
  }

  .watchlist-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px 8px;

    &::-webkit-scrollbar { width: 3px; }
    &::-webkit-scrollbar-thumb { background: #d4d8dd; border-radius: 2px; }

    .watchlist-empty {
      text-align: center;
      padding: 24px 12px;
      color: #94a3b8;
      .anticon { font-size: 32px; margin-bottom: 8px; display: block; }
      p { font-size: 12px; margin-bottom: 12px; }
    }
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Responsive */
@media (max-width: 992px) {
  .ai-analysis-container {
    height: auto;
    min-height: calc(100vh - 64px);
    overflow-y: auto;
    overflow-x: hidden;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .main-content-full {
    height: auto;
    min-height: auto;
  }

  .top-index-bar {
    flex-wrap: wrap;
    padding: 6px 8px;

    .indicator-box {
      min-width: 45px;
      padding: 3px 6px;
    }

    .indices-marquee {
      order: 10;
      width: 100%;
      margin-top: 6px;
    }
  }

  .main-body {
    flex-direction: column;
    padding: 8px;
    gap: 8px;
  }

  .left-panel {
    width: 100%;
    flex-direction: row;
    gap: 8px;

    .heatmap-box, .calendar-box {
      flex: 1;
      min-width: 0;
    }

    .calendar-box {
      max-height: 200px;
    }
  }

  .right-panel {
    .analysis-toolbar {
      flex-wrap: wrap;
      .symbol-selector { width: 100% !important; max-width: none !important; }
      .analyze-button, .history-button { flex: 1; }
    }
  }

  .watchlist-panel {
    width: 100%;
    max-height: 250px;
    order: -1;
  }

  .hero-stats {
    flex-direction: column;
    flex-wrap: wrap;
    align-items: center;
    .hstat { width: 100%; max-width: 300px; flex: none; }
  }
}

/* Mobile: single-column stack; avoid cramped heatmap/calendar panels */
@media (max-width: 576px) {
  .main-body {
    padding: 4px 6px;
    gap: 6px;
  }

  .top-index-bar {
    padding: 5px 6px;
    gap: 6px;

    .indicator-box {
      padding: 2px 5px;
      .ind-value { font-size: 11px; }
    }
    .indices-marquee .index-item {
      font-size: 10px;
      padding: 2px 5px;
    }
  }

  .left-panel {
    flex-direction: column;
    gap: 6px;

    .heatmap-box,
    .calendar-box {
      flex: none;
      width: 100%;
      min-width: 0;
      padding: 8px;
      border-radius: 8px;
    }

    .calendar-box {
      max-height: 220px;
    }

    .calendar-list .cal-item .cal-ai-insight {
      margin-left: 0;
    }

    .heatmap-box .box-header {
      ::v-deep .ant-radio-group.heatmap-type-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;

        .ant-radio-button-wrapper {
          flex: 1 1 calc(33.333% - 3px);
          min-width: 0;
          max-width: calc(33.333% - 2px);
        }
      }
    }
  }

  .right-panel {
    border-radius: 8px;

    .analysis-toolbar {
      padding: 6px 8px;
      gap: 6px;

      ::v-deep .ant-btn-lg {
        height: 36px;
        padding: 0 10px;
        font-size: 13px;
      }

      ::v-deep .symbol-selector .ant-select-selection--single {
        height: 36px !important;
      }

      ::v-deep .symbol-selector .ant-select-selection__rendered {
        line-height: 34px !important;
      }
    }

    .analysis-main {
      padding: 6px 8px;
    }
  }

  .watchlist-panel {
    max-height: ~"min(42vh, 320px)";
    border-radius: 8px;

    .panel-header {
      padding: 8px 10px;
    }

    .watchlist-list {
      padding: 4px 6px;
    }
  }

  .batch-bar {
    margin: 6px 6px 4px;
    padding: 8px 8px;
    gap: 6px;
  }

  .panel-summary {
    flex-wrap: wrap;

    .summary-chip {
      flex: 1 1 22%;
      min-width: 0;
      padding: 5px 2px;
    }

    .sc-num { font-size: 12px; }
    .sc-label { font-size: 8px; letter-spacing: 0.2px; }
  }

  .placeholder-hero .hero-body {
    padding: 16px 10px;
    max-width: 100%;
  }

  .hero-title {
    font-size: 20px;
  }

  .hero-subtitle {
    font-size: 13px;
    margin-bottom: 14px;
  }

  .hero-stats {
    flex-direction: column;
    flex-wrap: nowrap;
    gap: 8px;
    margin-bottom: 14px;

    .hstat {
      width: 100%;
      max-width: none;
      flex: none;
      padding: 10px 10px;
    }
  }

  .hero-cta {
    flex-direction: column;
    width: 100%;
    gap: 8px;

    .ant-btn {
      width: 100%;
      height: 40px;
    }
  }

  .wl-card {
    padding: 8px 10px;
  }
}

/* Dark Theme - pure black / dark gray */
.ai-analysis-container.theme-dark {
  background: #0a0a0a;
  color: #d4d4d4;

  .main-content-full {
    background: #141416;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .top-index-bar {
    background: #141416;
    border-bottom-color: rgba(255, 255, 255, 0.05);

    .indicator-box {
      background: #1a1a1c;
      border-color: rgba(255, 255, 255, 0.06);
      .ind-label { color: #666; }
      .ind-value { color: #d4d4d4; }
    }

    .indices-marquee .index-item {
      background: #1a1a1c;
      border-color: rgba(255, 255, 255, 0.06);
      .idx-symbol { color: #777; }
      .idx-price { color: #d4d4d4; }
    }

    .refresh-btn {
      color: #666;
      &:hover { color: #d4d4d4; }
    }
  }

  .watchlist-panel {
    background: #1a1a1c;
    border-color: rgba(255, 255, 255, 0.06);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

    .panel-header {
      background: #141416;
      border-bottom-color: rgba(255, 255, 255, 0.05);
      .panel-title { color: #ccc; }
    }
    .panel-summary {
      background: #141416;
      border-bottom-color: rgba(255, 255, 255, 0.05);
      .summary-chip { border-right-color: rgba(255, 255, 255, 0.05); }
      .sc-num { color: #d4d4d4; }
      .sc-label { color: #666; }
    }
    .batch-bar {
      background: #1c1c1c;
      border: 1px solid #2a2a2a;
      border-radius: 10px;
      margin: 8px 10px;
      margin-bottom: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .batch-bar .batch-all-cb { color: #a0a0a8; }
    .batch-bar .ant-btn:not(.ant-btn-primary) {
      background: #2a2a2c;
      border-color: #3a3a3c;
      color: #b0b0b8;
      &:hover { background: #333336; border-color: var(--primary-color, #1890ff); color: var(--primary-color, #1890ff); }
    }

    .watchlist-list {
      &::-webkit-scrollbar-thumb { background: #333; }

      .wl-card {
        &:hover { background: #222224; border-color: rgba(255, 255, 255, 0.06); }
        &.active { background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, transparent); border-color: color-mix(in srgb, var(--primary-color, #1890ff) 28%, transparent); }
        .wl-symbol { color: #e0e0e0; }
        .wl-name { color: #666; }
        .wl-market { color: #666; background: rgba(255, 255, 255, 0.06); }
        .wl-price { color: #d4d4d4; }
        .wl-pnl-qty { color: #666; }
        .wl-task-badge.paused { background: rgba(255, 255, 255, 0.05); color: #666; }
        .wl-task-next { color: #555; }
      }
      .wl-card-hover-actions {
        background: linear-gradient(90deg, transparent 0%, #222224 30%);
        .wl-hover-btn { background: #1a1a1c; color: #888; box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
        .wl-hover-btn:hover { color: var(--primary-color, #1890ff); background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent); }
        .wl-hover-btn.danger:hover { color: #f87171; background: rgba(248, 113, 113, 0.1); }
      }
      .wl-card.active .wl-card-hover-actions { background: linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--primary-color, #1890ff) 6%, transparent) 30%); }
      .watchlist-empty { color: #555; }
      .we-icon { color: #333; }
    }
  }

  .placeholder-hero {
    .hero-bg-grid { background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); }
    .hero-badge { background: color-mix(in srgb, var(--primary-color, #1890ff) 10%, transparent); border-color: color-mix(in srgb, var(--primary-color, #1890ff) 25%, transparent); color: var(--primary-color, #1890ff); }
    .hero-title { color: #e0e0e0; }
    .hero-subtitle, .hero-hint { color: #777; }
    .hstat { background: #1a1a1c; border-color: rgba(255,255,255,0.06); box-shadow: none; }
    .hstat:hover { border-color: color-mix(in srgb, var(--primary-color, #1890ff) 35%, transparent); box-shadow: 0 4px 16px color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent); }
    .hstat-icon { background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent); color: var(--primary-color, #1890ff); }
    .hstat-val { color: #ddd; }
    .hstat-label { color: #666; }
    .hero-cta .ant-btn-primary { box-shadow: 0 4px 14px color-mix(in srgb, var(--primary-color, #1890ff) 35%, transparent); }
  }

  .watchlist-bar-legacy {
    background: #141414;
    border-bottom-color: #2a2a2a;

    .stock-chip {
      background: #1c1c1c;
      border-color: #2a2a2a;
      &:hover, &.active { border-color: var(--primary-color, #1890ff); background: rgba(24, 144, 255, 0.08); }
      .chip-symbol { color: #d4d4d4; }
      .chip-price { color: #888; }
    }
  }

  .left-panel {
    .heatmap-box {
      background: #1a1a1c;
      border-color: rgba(255, 255, 255, 0.06);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

      ::v-deep .ant-radio-group.heatmap-type-tabs {
        background: #111113;

        .ant-radio-button-wrapper {
          background: transparent;
          border-color: transparent;
          color: #666;
          &:hover { color: #aaa; }
          &.ant-radio-button-wrapper-checked {
            background: #2a2a2c;
            color: #e8e8e8;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          }
        }
      }
    }

    .calendar-box {
      background: #1a1a1c;
      border-color: rgba(255, 255, 255, 0.06);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

      .box-title { color: #888; }
      .cal-item {
        border-bottom-color: rgba(255, 255, 255, 0.05);
        .cal-date { color: #555; }
        .cal-time { color: #777; }
        .cal-name { color: #ccc; }
        .cal-ai-insight {
          background: #202226;
          border-color: rgba(255, 255, 255, 0.08);
          &.high {
            background: rgba(251, 146, 60, 0.08);
            border-color: rgba(251, 146, 60, 0.22);
          }
          &.medium {
            background: rgba(59, 130, 246, 0.08);
            border-color: rgba(59, 130, 246, 0.20);
          }
        }
        .cal-ai-title {
          color: #e5e7eb;
          em { color: #94a3b8; }
        }
        .cal-ai-summary { color: #94a3b8; }
        .cal-ai-asset {
          background: rgba(99, 102, 241, 0.16);
          color: #c7d2fe;
          &.up { background: rgba(34, 197, 94, 0.14); color: #86efac; }
          &.down { background: rgba(239, 68, 68, 0.14); color: #fca5a5; }
          &.volatility { background: rgba(245, 158, 11, 0.14); color: #fcd34d; }
        }
      }
      .cal-empty {
        color: #777;
        .cal-empty-title { color: #ccc; }
      }

      .calendar-list {
        &::-webkit-scrollbar-thumb { background: #333; }
      }
    }
  }

  .right-panel {
    background: #1a1a1c;
    border-color: rgba(255, 255, 255, 0.06);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

    .analysis-toolbar {
      background: #141416;
      border-bottom-color: rgba(255, 255, 255, 0.05);

      .history-button {
        background: #222224;
        border-color: rgba(255, 255, 255, 0.08);
        color: #ccc;
        &:hover { border-color: color-mix(in srgb, var(--primary-color, #1890ff) 45%, transparent); color: var(--primary-color, #1890ff); }
      }
    }
  }

  .hero-cta .ant-btn:not(.ant-btn-primary) {
    background: #1c1c1c;
    border-color: #2a2a2a;
    color: #d4d4d4;
    &:hover { border-color: #1890ff; color: #1890ff; }
  }

  .wl-change.up { background: rgba(74,222,128,0.10); }
  .wl-change.down { background: rgba(248,113,113,0.10); }

  .panel-header-icon { color: #666; }
  .panel-header-icon:hover { color: var(--primary-color, #1890ff); background: color-mix(in srgb, var(--primary-color, #1890ff) 10%, transparent); }

  .panel-summary { background: #141416; }

  .batch-bar {
    background: #1c1c1c !important;
    border: 1px solid #2a2a2a !important;
    border-radius: 10px;
    margin: 8px 10px;
    margin-bottom: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .batch-bar .batch-all-cb { color: #a0a0a8; }
  .batch-bar .ant-btn:not(.ant-btn-primary) {
    background: #2a2a2c !important;
    border-color: #3a3a3c !important;
    color: #b0b0b8 !important;
    &:hover { background: #333336 !important; border-color: var(--primary-color, #1890ff) !important; color: var(--primary-color, #1890ff) !important; }
  }

  .watchlist-bar-compat {
    background: #141414;
    border-top-color: #2a2a2a;

    .bar-label { color: #888; }

    .stock-chip {
      background: #1c1c1c;
      border-color: #2a2a2a;

      &:hover, &.active {
        border-color: var(--primary-color, #1890ff);
        background: rgba(24, 144, 255, 0.08);
      }

      .chip-symbol { color: #d4d4d4; }
      .chip-price { color: #888; }
      .chip-remove { color: #666; }
    }
  }

  ::v-deep .symbol-selector {
    .ant-select-selection {
      background-color: #1c1c1c;
      border-color: #2a2a2a;
      color: #d4d4d4;
    }
    .wl-select-name {
      color: #888 !important;
      border-left-color: #333 !important;
    }
  }

  ::v-deep {
    .ant-tabs-bar { border-bottom-color: #2a2a2a; }
    .ant-tabs-tab { color: #888; &:hover { color: #d4d4d4; } }
    .ant-tabs-tab-active { color: #1890ff !important; }
    .ant-tabs-ink-bar { background-color: #1890ff; }
    .ant-input { background: #1c1c1c; border-color: #2a2a2a; color: #d4d4d4; &::placeholder { color: #555; } }
    .ant-input-number { background: #1c1c1c; border-color: #2a2a2a; color: #d4d4d4; .ant-input-number-handler-wrap { background: #1c1c1c; } }
    .ant-select-selection { background: #1c1c1c; border-color: #2a2a2a; color: #d4d4d4; }
    .ant-select-arrow { color: #666; }
    .ant-form-item-label > label { color: #d4d4d4; }
    .ant-checkbox-wrapper { color: #d4d4d4; }
    .ant-radio-wrapper { color: #d4d4d4; }
    .ant-btn-default { background: #1c1c1c; border-color: #2a2a2a; color: #d4d4d4; &:hover { border-color: #1890ff; color: #1890ff; } }
    .ant-alert { background: rgba(24,144,255,0.06); border-color: #2a2a2a; }
    .ant-alert-message { color: #d4d4d4; }
    .ant-tag { background: #1c1c1c; border-color: #2a2a2a; color: #d4d4d4; }
    .ant-list-item { border-bottom-color: #2a2a2a; color: #d4d4d4; }
    .ant-list-item-meta-title { color: #d4d4d4; }
    .ant-list-item-meta-description { color: #888; }
    .ant-empty-description { color: #666; }
    .ant-tooltip-inner { background: #1c1c1c; }
    .ant-badge-count { box-shadow: 0 0 0 1px #141414; }
    .ant-popover-inner { background: #1c1c1c; }
    .ant-popover-message { color: #d4d4d4; }
    .ant-popover-arrow { border-color: #1c1c1c; }
  }
}

/* ===== Placeholder Hero ===== */
.placeholder-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.hero-bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.5;
}
.hero-bg-circle.c1 {
  width: 320px;
  height: 320px;
  top: -80px;
  right: -60px;
  background: radial-gradient(circle, rgba(24,144,255,0.10) 0%, transparent 70%);
  animation: hero-float 6s ease-in-out infinite;
}
.hero-bg-circle.c2 {
  width: 240px;
  height: 240px;
  bottom: -40px;
  left: -40px;
  background: radial-gradient(circle, rgba(114,46,209,0.08) 0%, transparent 70%);
  animation: hero-float 8s ease-in-out infinite reverse;
}
.hero-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(24,144,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(24,144,255,0.03) 1px, transparent 1px);
  background-size: 32px 32px;
}
@keyframes hero-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
.hero-body {
  position: relative;
  text-align: center;
  padding: 40px 32px;
  max-width: 560px;
}
.hero-badge {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--primary-color, #1890ff);
  background: rgba(24,144,255,0.08);
  border: 1px solid rgba(24,144,255,0.2);
  margin-bottom: 16px;
}
.hero-title {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 8px;
  letter-spacing: -0.3px;
  line-height: 1.3;
}
.hero-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 32px;
  line-height: 1.5;
}
.hero-stats {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 32px;
  flex-wrap: nowrap;
}
.hstat {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  flex: 1;
  min-width: 0;
  text-align: left;
  transition: all 0.25s;
}
.hstat:hover {
  border-color: var(--primary-color, #1890ff);
  box-shadow: 0 4px 16px rgba(24,144,255,0.10);
  transform: translateY(-2px);
}
.hstat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(24,144,255,0.10) 0%, rgba(114,46,209,0.08) 100%);
  font-size: 16px;
  color: var(--primary-color, #1890ff);
  flex-shrink: 0;
}
.hstat-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.hstat-val {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hstat-label {
  font-size: 10px;
  color: #94a3b8;
  line-height: 1.3;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hero-cta {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 16px;
}
.hero-cta .ant-btn {
  border-radius: 10px;
  font-weight: 600;
  height: 42px;
  padding: 0 24px;
  font-size: 14px;
}
.hero-cta .ant-btn-primary {
  box-shadow: 0 4px 14px rgba(24,144,255,0.3);
}
.hero-hint {
  font-size: 12px;
  color: #94a3b8;
}

/* ===== Watchlist panel header ===== */
.panel-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.panel-header-icon {
  font-size: 15px;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;
}
.panel-header-icon:hover {
  color: var(--primary-color, #1890ff);
  background: rgba(24,144,255,0.08);
}

/* ===== Panel Summary ===== */
.panel-summary {
  display: flex;
  gap: 0;
  padding: 0;
  border-bottom: 1px solid #f1f5f9;
}
.summary-chip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border-right: 1px solid #f1f5f9;
}
.summary-chip:last-child { border-right: none; }
.sc-num {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  font-family: 'SF Mono', Monaco, monospace;
}
.sc-num.up { color: #16a34a; }
.sc-num.down { color: #dc2626; }
.sc-label {
  font-size: 9px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

/* ===== Batch Bar ===== */
.batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin: 8px 10px;
  margin-bottom: 4px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  flex-wrap: wrap;
}
.batch-all-cb {
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  margin-right: 4px;
}
.batch-bar .ant-btn {
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  height: 28px;
  padding: 0 10px;
  flex-shrink: 0;
  transition: all 0.2s;
}
.batch-bar .ant-btn-primary {
  box-shadow: 0 1px 2px color-mix(in srgb, var(--primary-color, #1890ff) 20%, transparent);
  &:hover { filter: brightness(1.05); }
}
.batch-bar .ant-btn:not(.ant-btn-primary) {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #64748b;
  &:hover { background: #f1f5f9; border-color: #cbd5e1; color: #475569; }
}

/* ===== Watchlist Card (wl-card) ===== */
.wl-card {
  position: relative;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 3px;
  border: 1px solid transparent;
}
.wl-card:hover {
  background: #f5f7fa;
  border-color: #e8ecf1;
}
.wl-card.active {
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 6%, #fff) 0%, color-mix(in srgb, var(--primary-color, #1890ff) 4%, #fff) 100%);
  border-color: color-mix(in srgb, var(--primary-color, #1890ff) 28%, transparent);
  box-shadow: 0 1px 4px color-mix(in srgb, var(--primary-color, #1890ff) 10%, transparent);
}
.wl-card-cb {
  position: absolute;
  top: 12px;
  left: 4px;
  z-index: 1;
}
.wl-card-body {
  transition: padding-left 0.2s;
}
.wl-card-body.with-cb {
  padding-left: 24px;
}
.wl-row-main {
  display: grid;
  grid-template-columns: 1fr 80px auto;
  align-items: center;
  gap: 4px;
}
.wl-info-left {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
.wl-symbol-line {
  display: flex;
  align-items: baseline;
  gap: 5px;
  overflow: hidden;
}
.wl-name {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}
.wl-info-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  white-space: nowrap;
}
.wl-symbol {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wl-market {
  font-size: 9px;
  color: #94a3b8;
  letter-spacing: 0.3px;
  padding: 1px 4px;
  background: #f1f5f9;
  border-radius: 3px;
  flex-shrink: 0;
}
.wl-spacer { }
.wl-sparkline-wrap {
  width: 80px;
  padding: 0 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  .wl-sparkline {
    width: 100%;
    height: 20px;
  }
}
.wl-price {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  font-family: 'SF Mono', Monaco, monospace;
}
.wl-change {
  font-size: 10px;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
}
.wl-change.up { color: #16a34a; background: rgba(22,163,74,0.08); }
.wl-change.down { color: #dc2626; background: rgba(220,38,38,0.06); }

.wl-row-pnl {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-family: 'SF Mono', Monaco, monospace;
}
.wl-pnl-qty {
  font-size: 10px;
  color: #94a3b8;
}
.wl-pnl-val {
  font-size: 10px;
  font-weight: 600;
  margin-left: auto;
}
.wl-pnl-val.up { color: #16a34a; }
.wl-pnl-val.down { color: #dc2626; }

.wl-row-task {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.wl-task-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.wl-task-badge.active {
  color: #16a34a;
  background: rgba(22,163,74,0.08);
}
.wl-task-badge.paused {
  color: #94a3b8;
  background: #f1f5f9;
}
.wl-task-badge:hover { opacity: 0.75; }
.wl-task-next {
  font-size: 10px;
  color: #94a3b8;
  margin-left: auto;
}

/* hover actions overlay */
.wl-card-hover-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 8px;
  opacity: 0;
  transition: opacity 0.15s;
  background: linear-gradient(90deg, transparent 0%, #f8fafc 30%);
  border-radius: 0 8px 8px 0;
  pointer-events: none;
}
.wl-card:hover .wl-card-hover-actions {
  opacity: 1;
  pointer-events: auto;
}
.wl-card.active .wl-card-hover-actions {
  background: linear-gradient(90deg, transparent 0%, #e6f7ff 30%);
}
.wl-hover-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.wl-hover-btn:hover {
  color: var(--primary-color, #1890ff);
  background: #e6f7ff;
}
.wl-hover-btn.danger:hover {
  color: #dc2626;
  background: #fef2f2;
}

/* empty state */
.watchlist-empty {
  text-align: center;
  padding: 32px 16px;
}
.we-icon {
  font-size: 36px;
  color: #e2e8f0;
  margin-bottom: 12px;
}
.watchlist-empty p {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 12px;
}

/* batch modal */
.batch-modal-summary {
  margin-bottom: 16px;
}
.batch-modal-summary p {
  font-size: 13px;
  color: #475569;
  margin-bottom: 8px;
}
.batch-symbols-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 80px;
  overflow-y: auto;
}

/* ===== Task Drawer ===== */
.task-drawer-empty {
  text-align: center;
  padding: 48px 16px;
  color: #94a3b8;
  p { margin-top: 12px; font-size: 13px; }
}
.task-drawer-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.task-item {
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fafafa;
  transition: box-shadow 0.2s;
}
.task-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.task-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.task-item-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.task-item-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 10px;
  .anticon { margin-right: 4px; }
}
.task-item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;

  .ant-btn {
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    height: 28px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s;
    border-width: 1px;

    &.ant-btn-primary {
      background: var(--primary-color, #1890ff);
      border-color: var(--primary-color, #1890ff);
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      &:hover { filter: brightness(1.05); box-shadow: 0 2px 6px color-mix(in srgb, var(--primary-color, #1890ff) 25%, transparent); }
    }
    &.ant-btn-default {
      background: #f8fafc;
      border-color: #e2e8f0;
      color: #475569;
      &:hover { background: #f1f5f9; border-color: #cbd5e1; color: #334155; }
    }
    &.ant-btn-danger {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
      &:hover { background: #fee2e2; border-color: #fca5a5; color: #b91c1c; }
    }
  }
}

/* Add Stock Modal */
.add-stock-modal-content {
  .market-tabs { margin-bottom: 16px; }
  .symbol-search-section { margin-bottom: 24px; }
  .market-mismatch-hint {
    margin-top: 8px;
    padding: 8px 12px;
    background: #fffbe6;
    border: 1px solid #ffe58f;
    border-radius: 4px;
    color: #874d00;
    font-size: 12px;
    line-height: 1.5;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-results-section,
  .hot-symbols-section {
    margin-bottom: 24px;

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #262626;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }
  }

  .symbol-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #e8e8e8;
    border-radius: 4px;

    .symbol-list-item {
      cursor: pointer;
      padding: 8px 12px;
      transition: background-color 0.3s;

      &:hover { background-color: #f5f5f5; }

      .symbol-item-content {
        display: flex;
        align-items: center;
        gap: 8px;

        .symbol-code {
          font-weight: 600;
          color: #262626;
          min-width: 80px;
        }

        .symbol-name {
          color: #595959;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }

  .selected-symbol-section {
    margin-top: 16px;

    .selected-symbol-info {
      display: flex;
      align-items: center;
    }
  }
}

/* Skeleton loading animation - progressive loading */
.skeleton-box {
  .skeleton-text {
    display: block;
    height: 12px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    border-radius: 4px;
    margin: 3px 0;

    &.short { width: 40px; height: 9px; }
  }
}

.skeleton-cell {
  background: #f8fafc !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;

  .skeleton-text {
    width: 80%;
    height: 10px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    border-radius: 3px;
    margin: 2px 0;

    &.short { width: 50%; height: 8px; }
  }
}

.skeleton-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;

  .skeleton-text {
    height: 12px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    border-radius: 4px;
    flex: 1;

    &.short { flex: none; width: 40px; }
  }
}

.indices-loading, .indices-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 11px;
  color: #94a3b8;
  padding: 4px 16px;
}

.indices-loading {
  .anticon { margin-right: 6px; }
}

.heatmap-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 20px;
  color: #94a3b8;
  font-size: 12px;
}

@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Dark theme skeletons */
.theme-dark {
  .skeleton-box, .skeleton-cell, .skeleton-item {
    .skeleton-text {
      background: linear-gradient(90deg, #2a2a2a 25%, #333 50%, #2a2a2a 75%);
      background-size: 200% 100%;
    }
  }

  .skeleton-cell {
    background: #1c1c1c !important;
  }

  .indices-loading, .indices-empty, .heatmap-empty {
    color: #666;
  }
}
</style>

<style lang="less">
/* Unified dark theme for portals (modals / drawers) */
.qd-dark-modal {
  .ant-modal-content {
    background: #141414;
  }
  .ant-modal-header {
    background: #141414;
    border-bottom-color: #2a2a2a;
    .ant-modal-title { color: #d4d4d4; }
  }
  .ant-modal-close-x { color: #888; }
  .ant-modal-body {
    background: #141414;
    color: #d4d4d4;
  }
  .ant-modal-footer {
    background: #141414;
    border-top-color: #2a2a2a;
    .ant-btn-default { background: #1c1c1c; border-color: #2a2a2a; color: #d4d4d4; &:hover { border-color: #1890ff; color: #1890ff; } }
  }
  .ant-form-item-label > label { color: #d4d4d4; }
  .ant-input { background: #1c1c1c; border-color: #2a2a2a; color: #d4d4d4; &::placeholder { color: #555; } }
  .ant-input-number { background: #1c1c1c; border-color: #2a2a2a; color: #d4d4d4; }
  .ant-select-selection { background: #1c1c1c; border-color: #2a2a2a; color: #d4d4d4; }
  .ant-select-arrow { color: #666; }
  .ant-checkbox-wrapper { color: #d4d4d4; }
  .ant-radio-wrapper { color: #d4d4d4; }
  .ant-tabs-bar { border-bottom-color: #2a2a2a; }
  .ant-tabs-tab { color: #888; &:hover { color: #d4d4d4; } }
  .ant-tabs-tab-active { color: #1890ff !important; }
  .ant-tag { background: #1c1c1c; border-color: #2a2a2a; color: #d4d4d4; }
  .ant-tag-blue { background: rgba(24,144,255,0.1); border-color: rgba(24,144,255,0.3); color: #1890ff; }
  .ant-alert { background: rgba(24,144,255,0.06); border-color: #2a2a2a; }
  .ant-alert-message { color: #d4d4d4; }
  .ant-alert-info .ant-alert-icon { color: #1890ff; }
  .ant-list-item { border-bottom-color: #2a2a2a; color: #d4d4d4; }
  .ant-list-item-meta-title { color: #d4d4d4; }
  .ant-list-item-meta-description { color: #888; }
  .ant-empty-description { color: #666; }
  p { color: #d4d4d4; }
  .add-stock-modal-content {
    color: #d4d4d4;
    .section-title { color: #d4d4d4 !important; }
    .symbol-list {
      border-color: #2a2a2a;
      background: #1c1c1c;
      .symbol-list-item {
        &:hover { background: #252525 !important; }
        .symbol-code { color: #d4d4d4 !important; }
        .symbol-name { color: #888 !important; }
      }
    }
    .selected-symbol-info strong { color: #d4d4d4; }
    .selected-symbol-info span { color: #888 !important; }
  }
  .batch-modal-summary p { color: #d4d4d4; }
  .batch-symbols-preview .ant-tag { background: rgba(24,144,255,0.1); border-color: rgba(24,144,255,0.3); color: #1890ff; }
  .task-item { background: #1c1c1c; border-color: #2a2a2a; &:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.3); } }
  .task-item-name { color: #d4d4d4; }
  .task-item-meta { color: #888; }
  .task-drawer-empty { color: #666; }
  .history-item { background: #1c1c1c; border-color: #2a2a2a; }
  .search-result-item { color: #d4d4d4; }
  .search-result-item:hover { background: #1c1c1c; }
  .search-result-name { color: #d4d4d4; }
  .search-result-market { color: #888; }
}
.qd-dark-drawer {
  .ant-drawer-content { background: #141414; }
  .ant-drawer-header { background: #141414; border-bottom-color: #2a2a2a; .ant-drawer-title { color: #d4d4d4; } .ant-drawer-close { color: #888; } }
  .ant-drawer-body { background: #141414; color: #d4d4d4; }
  .task-item { background: #1c1c1c; border-color: #2a2a2a; &:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.3); } }
  .task-item-name { color: #d4d4d4; }
  .task-item-meta { color: #888; }
  .task-drawer-empty { color: #666; }
  .task-item-actions .ant-btn {
    &.ant-btn-primary { background: var(--primary-color, #1890ff); border-color: var(--primary-color, #1890ff); &:hover { filter: brightness(1.1); } }
    &.ant-btn-default { background: #2a2a2c; border-color: #3a3a3c; color: #b0b0b8; &:hover { background: #333336; border-color: var(--primary-color, #1890ff); color: var(--primary-color, #1890ff); } }
    &.ant-btn-danger { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.25); color: #f87171; &:hover { background: rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.4); color: #fca5a5; } }
  }
  .ant-btn-default { background: #1c1c1c; border-color: #2a2a2a; color: #d4d4d4; &:hover { border-color: #1890ff; color: #1890ff; } }
  .ant-btn-danger { background: transparent; }
  .ant-popover-inner { background: #1c1c1c; }
  .ant-popover-message { color: #d4d4d4; }
  .ant-popover-message-title { color: #d4d4d4; }
  .ant-popover-buttons .ant-btn-default { background: #1c1c1c; border-color: #2a2a2a; color: #d4d4d4; }
}
</style>

<style lang="less">
/* Global dark override for Ant Select dropdown portals (rendered at body level) */
body.colorWeak .ant-select-dropdown,
.qd-dark-modal .ant-select-dropdown {
  background: #1c1c1c;
  .ant-select-dropdown-menu-item { color: #d4d4d4; }
  .ant-select-dropdown-menu-item:hover { background: #252525; }
  .ant-select-dropdown-menu-item-active { background: #252525; }
  .ant-select-dropdown-menu-item-selected { background: rgba(24,144,255,0.1); color: #1890ff; }
}
</style>
