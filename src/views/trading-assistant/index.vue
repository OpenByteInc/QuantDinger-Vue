<template>
  <div class="trading-assistant" :class="{ 'theme-dark': isDarkTheme, 'trading-assistant--signal': isIndicatorSignalOnlyPage, 'trading-assistant--script': isScriptStrategiesOnlyPage }">
    <div v-if="pageTypeBanner" class="assistant-page-banner" :class="`assistant-page-banner--${pageTypeBanner.variant}`">
      <div class="assistant-page-banner-main">
        <span class="assistant-page-banner-badge">{{ pageTypeBanner.badge }}</span>
        <span class="assistant-page-banner-desc">{{ pageTypeBanner.desc }}</span>
      </div>
    </div>
    <div v-if="showAssistantGuide" class="assistant-guide-bar">
      <div class="assistant-guide-copy">
        <div class="assistant-guide-eyebrow">{{ $t('trading-assistant.guide.eyebrow') }}</div>
        <div class="assistant-guide-title">{{ $t('trading-assistant.guide.title') }}</div>
        <div class="assistant-guide-desc">{{ $t('trading-assistant.guide.desc') }}</div>
      </div>
      <div class="assistant-guide-steps">
        <div class="assistant-step-card">
          <div class="assistant-step-index">1</div>
          <div class="assistant-step-body">
            <div class="assistant-step-title">{{ $t('trading-assistant.guide.step1Title') }}</div>
            <div class="assistant-step-desc">{{ $t('trading-assistant.guide.step1Desc') }}</div>
          </div>
        </div>
        <div class="assistant-step-card">
          <div class="assistant-step-index">2</div>
          <div class="assistant-step-body">
            <div class="assistant-step-title">{{ $t('trading-assistant.guide.step2Title') }}</div>
            <div class="assistant-step-desc">{{ $t('trading-assistant.guide.step2Desc') }}</div>
          </div>
        </div>
        <div class="assistant-step-card">
          <div class="assistant-step-index">3</div>
          <div class="assistant-step-body">
            <div class="assistant-step-title">{{ $t('trading-assistant.guide.step3Title') }}</div>
            <div class="assistant-step-desc">{{ $t('trading-assistant.guide.step3Desc') }}</div>
          </div>
        </div>
      </div>
      <div class="assistant-guide-actions">
        <a-button @click="goToStrategyTab">
          <a-icon type="appstore" />
          {{ $t('trading-assistant.guide.secondary') }}
        </a-button>
        <a-button type="primary" @click="openCreateStrategyFromGuide">
          <a-icon type="plus" />
          {{ $t('trading-assistant.guide.primary') }}
        </a-button>
        <a-button class="assistant-guide-close" @click="dismissAssistantGuide">
          <a-icon type="close" />
        </a-button>
      </div>
    </div>
    <a-tabs
      v-model="topTab"
      class="top-level-tabs"
      :animated="false"
    >
      <a-tab-pane key="strategy" :tab="$t('trading-assistant.tabs.strategyManage')">
        <a-row :gutter="24" class="strategy-layout">
          <a-col
            :xs="24"
            :sm="24"
            :md="10"
            :lg="8"
            :xl="8"
            class="strategy-list-col">
            <a-card :bordered="false" class="strategy-list-card">
              <div slot="title" class="card-title">
                <span>{{ $t('trading-assistant.strategyList') }}</span>
                <a-button type="primary" size="small" @click="handleCreateStrategy">
                  <a-icon type="plus" />
                  {{ createStrategyButtonLabel }}
                </a-button>
              </div>

              <div class="group-mode-switch">
                <span class="group-mode-label">{{ $t('trading-assistant.groupBy') }}:</span>
                <a-radio-group v-model="groupByMode" size="small" button-style="solid">
                  <a-radio-button value="strategy">
                    <a-icon type="folder" />
                    {{ $t('trading-assistant.groupByStrategy') }}
                  </a-radio-button>
                  <a-radio-button value="symbol">
                    <a-icon type="stock" />
                    {{ $t('trading-assistant.groupBySymbol') }}
                  </a-radio-button>
                </a-radio-group>
              </div>

              <a-spin :spinning="loading">
                <div v-if="!loading && strategiesForPage.length === 0" class="strategy-empty-state">
                  <a-empty :description="$t('trading-assistant.empty.title')" />
                  <div class="strategy-empty-desc">{{ $t('trading-assistant.empty.desc') }}</div>
                  <a-button type="primary" @click="openCreateStrategyFromGuide">
                    <a-icon type="plus" />
                    {{ $t('trading-assistant.empty.primary') }}
                  </a-button>
                </div>
                <div v-else class="strategy-grouped-list">
                  <div v-for="group in groupedStrategies.groups" :key="group.id" class="strategy-group">
                    <div class="strategy-group-header" @click="toggleGroup(group.id)">
                      <div class="group-header-left">
                        <a-icon :type="collapsedGroups[group.id] ? 'right' : 'down'" class="collapse-icon" />
                        <a-icon :type="groupByMode === 'symbol' ? 'stock' : 'folder'" class="group-icon" />
                        <span class="group-name">{{ group.baseName }}</span>
                        <a-tag size="small" color="blue">{{ group.strategies.length }} {{
                          groupByMode === 'symbol' ? $t('trading-assistant.strategyCount') : $t('trading-assistant.symbolCount') }}</a-tag>
                      </div>
                      <div class="group-header-right" @click.stop>
                        <span v-if="group.runningCount > 0" class="group-status running">
                          {{ group.runningCount }} {{ $t('trading-assistant.status.running') }}
                        </span>
                        <span v-if="group.stoppedCount > 0" class="group-status stopped">
                          {{ group.stoppedCount }} {{ $t('trading-assistant.status.stopped') }}
                        </span>
                        <a-dropdown :getPopupContainer="getDropdownContainer" :trigger="['click']">
                          <a-menu slot="overlay" @click="({ key }) => handleGroupMenuClick(key, group)">
                            <a-menu-item key="startAll">
                              <a-icon type="play-circle" />
                              {{ $t('trading-assistant.startAll') }}
                            </a-menu-item>
                            <a-menu-item key="stopAll">
                              <a-icon type="pause-circle" />
                              {{ $t('trading-assistant.stopAll') }}
                            </a-menu-item>
                            <a-menu-divider />
                            <a-menu-item key="deleteAll" class="danger-item">
                              <a-icon type="delete" />
                              {{ $t('trading-assistant.deleteAll') }}
                            </a-menu-item>
                          </a-menu>
                          <a-button type="link" icon="more" size="small" />
                        </a-dropdown>
                      </div>
                    </div>
                    <div v-show="!collapsedGroups[group.id]" class="strategy-group-content">
                      <div
                        v-for="item in group.strategies"
                        :key="item.id"
                        :class="[
                          'strategy-list-item',
                          { active: selectedStrategy && selectedStrategy.id === item.id },
                          { 'strategy-list-item--strategy-group': groupByMode === 'strategy' }
                        ]"
                        @click="handleSelectStrategy(item)">
                        <div class="strategy-item-content">
                          <div class="strategy-item-header">
                            <div :class="['strategy-name-wrapper', { 'strategy-name-wrapper--grouped': groupByMode === 'symbol' }]">
                              <template v-if="groupByMode === 'strategy'">
                                <span class="strategy-name">{{ item.strategy_name }}</span>
                                <a-tag
                                  v-if="item.strategy_type === 'PromptBasedStrategy'"
                                  color="purple"
                                  size="small"
                                  class="strategy-type-tag">
                                  <a-icon type="robot" style="margin-right: 2px;" />
                                  AI
                                </a-tag>
                                <a-tag v-if="item.strategy_mode === 'script'" size="small" color="green" style="margin-left: 4px;">
                                  <a-icon type="code" style="margin-right: 2px;" />{{ $t('trading-assistant.strategyMode.script') }}
                                </a-tag>
                                <a-tag
                                  v-if="item.strategy_mode === 'script' && scriptTemplateKeyOf(item)"
                                  size="small"
                                  color="blue"
                                  style="margin-left: 4px;">
                                  {{ scriptTemplateLabel(scriptTemplateKeyOf(item)) }}
                                </a-tag>
                                <a-tag
                                  v-if="isCrossSectionalStrategy(item)"
                                  size="small"
                                  color="orange"
                                  style="margin-left: 4px;">
                                  {{ $t('trading-assistant.tag.crossSectional') }}
                                </a-tag>
                              </template>
                              <template v-else>
                                <span class="info-item strategy-name-text">
                                  <a-icon type="thunderbolt" />
                                  {{ item.displayInfo ? item.displayInfo.strategyName : item.strategy_name }}
                                </span>
                                <a-tag size="small" color="cyan" v-if="item.displayInfo && item.displayInfo.timeframe">
                                  <a-icon type="clock-circle" style="margin-right: 2px;" />
                                  {{ item.displayInfo.timeframe }}
                                </a-tag>
                                <a-tag size="small" color="purple" v-if="item.displayInfo && item.displayInfo.indicatorName && item.displayInfo.indicatorName !== '-'">
                                  <a-icon type="line-chart" style="margin-right: 2px;" />
                                  {{ item.displayInfo.indicatorName }}
                                </a-tag>
                                <a-tag v-if="item.strategy_mode === 'script'" size="small" color="green" style="margin-left: 4px;">
                                  <a-icon type="code" style="margin-right: 2px;" />{{ $t('trading-assistant.strategyMode.script') }}
                                </a-tag>
                                <a-tag
                                  v-if="item.strategy_mode === 'script' && scriptTemplateKeyOf(item)"
                                  size="small"
                                  color="blue"
                                  style="margin-left: 4px;">
                                  {{ scriptTemplateLabel(scriptTemplateKeyOf(item)) }}
                                </a-tag>
                              </template>
                            </div>
                          </div>
                          <div class="strategy-item-info">
                            <template v-if="groupByMode === 'strategy'">
                              <span class="info-item" v-if="item.trading_config && item.trading_config.symbol">
                                <a-icon type="dollar" />
                                {{ item.trading_config.symbol }}
                              </span>
                              <span
                                class="info-item"
                                v-if="item.exchange_config && item.exchange_config.exchange_id">
                                <a-icon type="bank" />
                                {{ getExchangeDisplayName(item.exchange_config.exchange_id) }}
                              </span>
                              <span class="info-item" v-if="item.trading_config && item.trading_config.timeframe">
                                <a-icon type="clock-circle" />
                                {{ item.trading_config.timeframe }}
                              </span>
                            </template>
                            <span
                              class="status-label"
                              :class="[
                                item.status ? `status-${item.status}` : '',
                                { 'status-stopped': item.status === 'stopped' }
                              ]">
                              {{ getStatusText(item.status) }}
                            </span>
                          </div>
                        </div>
                        <div class="strategy-item-actions" @click.stop>
                          <a-dropdown :getPopupContainer="getDropdownContainer" :trigger="['click']">
                            <a-menu slot="overlay" @click="({ key }) => handleMenuClick(key, item)">
                              <a-menu-item v-if="item.status === 'stopped'" key="start">
                                <a-icon type="play-circle" />
                                {{ $t('trading-assistant.startStrategy') }}
                              </a-menu-item>
                              <a-menu-item v-if="item.status === 'running'" key="stop">
                                <a-icon type="pause-circle" />
                                {{ $t('trading-assistant.stopStrategy') }}
                              </a-menu-item>
                              <a-menu-divider />
                              <a-menu-item key="edit">
                                <a-icon type="edit" />
                                {{ $t('trading-assistant.editStrategy') }}
                              </a-menu-item>
                              <a-menu-item v-if="showStrategyListBacktest" key="backtest">
                                <a-icon type="experiment" />
                                {{ $t('dashboard.indicator.action.backtest') }}
                              </a-menu-item>
                              <a-menu-divider />
                              <a-menu-item key="delete" class="danger-item">
                                <a-icon type="delete" />
                                {{ $t('trading-assistant.deleteStrategy') }}
                              </a-menu-item>
                            </a-menu>
                            <a-button type="link" icon="more" size="small" />
                          </a-dropdown>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    v-for="item in groupedStrategies.ungrouped"
                    :key="item.id"
                    :class="['strategy-list-item', { active: selectedStrategy && selectedStrategy.id === item.id }]"
                    @click="handleSelectStrategy(item)">
                    <div class="strategy-item-content">
                      <div class="strategy-item-header">
                        <div class="strategy-name-wrapper">
                          <a-tag
                            v-if="item.exchange_config && item.exchange_config.exchange_id"
                            :color="getExchangeTagColor(item.exchange_config.exchange_id)"
                            size="small"
                            class="exchange-tag">
                            <a-icon type="bank" style="margin-right: 4px;" />
                            {{ getExchangeDisplayName(item.exchange_config.exchange_id) }}
                          </a-tag>
                          <span class="strategy-name">{{ item.strategy_name }}</span>
                          <a-tag
                            v-if="item.strategy_type === 'PromptBasedStrategy'"
                            color="purple"
                            size="small"
                            class="strategy-type-tag">
                            <a-icon type="robot" style="margin-right: 2px;" />
                            AI
                          </a-tag>
                          <a-tag v-if="item.strategy_mode === 'script'" size="small" color="green" style="margin-left: 4px;">
                            <a-icon type="code" style="margin-right: 2px;" />{{ $t('trading-assistant.strategyMode.script') }}
                          </a-tag>
                          <a-tag
                            v-if="item.strategy_mode === 'script' && scriptTemplateKeyOf(item)"
                            size="small"
                            color="blue"
                            style="margin-left: 4px;">
                            {{ scriptTemplateLabel(scriptTemplateKeyOf(item)) }}
                          </a-tag>
                          <a-tag
                            v-if="isCrossSectionalStrategy(item)"
                            size="small"
                            color="orange"
                            style="margin-left: 4px;">
                            {{ $t('trading-assistant.tag.crossSectional') }}
                          </a-tag>
                        </div>
                      </div>
                      <div class="strategy-item-info">
                        <span class="info-item" v-if="item.trading_config && item.trading_config.symbol">
                          <a-icon type="dollar" />
                          {{ item.trading_config.symbol }}
                        </span>
                        <span
                          class="status-label"
                          :class="[
                            item.status ? `status-${item.status}` : '',
                            { 'status-stopped': item.status === 'stopped' }
                          ]">
                          {{ getStatusText(item.status) }}
                        </span>
                      </div>
                    </div>
                    <div class="strategy-item-actions" @click.stop>
                      <a-dropdown :getPopupContainer="getDropdownContainer" :trigger="['click']">
                        <a-menu slot="overlay" @click="({ key }) => handleMenuClick(key, item)">
                          <a-menu-item v-if="item.status === 'stopped'" key="start">
                            <a-icon type="play-circle" />
                            {{ $t('trading-assistant.startStrategy') }}
                          </a-menu-item>
                          <a-menu-item v-if="item.status === 'running'" key="stop">
                            <a-icon type="pause-circle" />
                            {{ $t('trading-assistant.stopStrategy') }}
                          </a-menu-item>
                          <a-menu-divider />
                          <a-menu-item key="edit">
                            <a-icon type="edit" />
                            {{ $t('trading-assistant.editStrategy') }}
                          </a-menu-item>
                          <a-menu-item v-if="showStrategyListBacktest" key="backtest">
                            <a-icon type="experiment" />
                            {{ $t('dashboard.indicator.action.backtest') }}
                          </a-menu-item>
                          <a-menu-divider />
                          <a-menu-item key="delete" class="danger-item">
                            <a-icon type="delete" />
                            {{ $t('trading-assistant.deleteStrategy') }}
                          </a-menu-item>
                        </a-menu>
                        <a-button type="link" icon="more" size="small" />
                      </a-dropdown>
                    </div>
                  </div>
                </div>
              </a-spin>
            </a-card>
          </a-col>

          <a-col
            :xs="24"
            :sm="24"
            :md="14"
            :lg="16"
            :xl="16"
            class="strategy-detail-col">
            <div v-if="!selectedStrategy" class="strategy-empty-detail">
              <div class="strategy-empty-detail-card">
                <div class="strategy-empty-detail-icon">
                  <a-icon type="deployment-unit" />
                </div>
                <h3 class="strategy-empty-detail-title">{{ $t('trading-assistant.emptyDetail.title') }}</h3>
                <p class="strategy-empty-detail-hint">{{ $t('trading-assistant.emptyDetail.hint') }}</p>
                <div class="strategy-empty-detail-actions">
                  <a-button type="primary" @click="handleCreateStrategy">
                    <a-icon type="plus" />
                    {{ createStrategyButtonLabel }}
                  </a-button>
                </div>
              </div>
            </div>

            <div v-else class="strategy-detail-panel">
              <a-card :bordered="false" class="strategy-header-card">
                <div class="strategy-header">
                  <div class="header-left">
                    <div class="strategy-title-row">
                      <h3 class="strategy-title">{{ selectedStrategy.strategy_name }}</h3>
                      <div class="status-badge" :class="[`status-${selectedStrategy.status}`]">
                        <span class="status-dot"></span>
                        {{ getStatusText(selectedStrategy.status) }}
                      </div>
                    </div>

                    <div class="key-stats-grid">
                      <div
                        class="stat-card"
                        v-if="strategyInitialCapital != null">
                        <div class="stat-icon investment">
                          <a-icon type="wallet" />
                        </div>
                        <div class="stat-content">
                          <div class="stat-label">{{ $t('trading-assistant.detail.totalInvestment') }}</div>
                          <div class="stat-value">${{ strategyInitialCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                        </div>
                      </div>
                      <div class="stat-card" v-if="currentEquity !== null">
                        <div class="stat-icon equity">
                          <a-icon type="fund" />
                        </div>
                        <div class="stat-content">
                          <div class="stat-label">{{ $t('trading-assistant.detail.currentEquity') }}</div>
                          <div class="stat-value" :class="getEquityColorClass">{{ formatCurrency(currentEquity) }}</div>
                        </div>
                      </div>
                      <div
                        class="stat-card pnl-card"
                        v-if="totalPnl !== null"
                        :class="{ 'profit': totalPnl > 0, 'loss': totalPnl < 0 }">
                        <div class="stat-icon pnl">
                          <a-icon :type="totalPnl >= 0 ? 'rise' : 'fall'" />
                        </div>
                        <div class="stat-content">
                          <div class="stat-label">{{ $t('trading-assistant.detail.totalPnl') }}</div>
                          <div class="stat-value" :class="getPnlColorClass">
                            {{ formatPnl(totalPnl) }}
                            <span class="pnl-percent">({{ formatPnlPercent(totalPnlPercent) }})</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-if="selectedStrategy" class="strategy-lifecycle-tags">
                      <template v-if="isScriptStrategySelected">
                        <a-tag v-if="isStrategyVerified(selectedStrategy)" color="green">{{ $t('strategyCenter.lifecycle.verified') }}</a-tag>
                        <a-tag v-else color="orange">{{ $t('strategyCenter.lifecycle.unverified') }}</a-tag>
                        <a-tag v-if="strategyHasBacktest" color="blue">{{ $t('strategyCenter.lifecycle.backtested') }}</a-tag>
                        <a-tag v-else color="default">{{ $t('strategyCenter.lifecycle.notBacktested') }}</a-tag>
                      </template>
                      <a-button
                        v-else-if="isIndicatorSignalOnlyPage"
                        type="link"
                        size="small"
                        class="lifecycle-ide-btn"
                        @click="goToIndicatorIdeForBacktest"
                      >
                        <a-icon type="line-chart" />
                        {{ $t('trading-assistant.backtestInIde') }}
                      </a-button>
                    </div>

                    <div class="strategy-tags">
                      <div class="tag-item" v-if="isCrossSectionalStrategy(selectedStrategy)">
                        <a-icon type="appstore" />
                        <span>{{ $t('trading-assistant.tag.crossSectional') }} 闂?{{ (selectedStrategy.trading_config.symbol_list || []).length }} {{ $t('trading-assistant.symbolCount') }}</span>
                      </div>
                      <div class="tag-item" v-else-if="selectedStrategy.trading_config">
                        <a-icon type="stock" />
                        <span>{{ selectedStrategy.trading_config.symbol }}</span>
                      </div>
                      <div
                        class="tag-item"
                        v-if="selectedStrategy.indicator_config && selectedStrategy.indicator_config.indicator_name">
                        <a-icon type="line-chart" />
                        <span>{{ selectedStrategy.indicator_config.indicator_name }}</span>
                      </div>
                      <div class="tag-item" v-if="selectedStrategy.trading_config">
                        <a-icon type="thunderbolt" />
                        <span>{{ selectedStrategy.trading_config.leverage || 1 }}x</span>
                      </div>
                      <div
                        class="tag-item"
                        v-if="selectedStrategy.trading_config && selectedStrategy.trading_config.trade_direction">
                        <a-icon type="swap" />
                        <span>{{ getTradeDirectionText(selectedStrategy.trading_config.trade_direction) }}</span>
                      </div>
                      <div
                        class="tag-item"
                        v-if="selectedStrategy.strategy_mode === 'script' && scriptTemplateKeyOf(selectedStrategy)">
                        <a-icon type="file-text" />
                        <span>{{ scriptTemplateLabel(scriptTemplateKeyOf(selectedStrategy)) }}</span>
                      </div>
                      <div
                        class="tag-item"
                        v-if="selectedStrategy.trading_config && selectedStrategy.trading_config.timeframe">
                        <a-icon type="clock-circle" />
                        <span>{{ selectedStrategy.trading_config.timeframe }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="header-right">
                    <a-button
                      v-if="isScriptStrategySelected"
                      class="action-btn publish-market-btn"
                      @click="openPublishTemplateModal"
                    >
                      <a-icon type="shop" />
                      {{ $t('strategyCenter.publish.action') }}
                    </a-button>
                    <a-button
                      v-if="selectedStrategy.status === 'stopped'"
                      type="primary"
                      size="large"
                      class="action-btn start-btn"
                      @click="handleStartStrategy(selectedStrategy.id)">
                      <a-icon type="play-circle" />
                      {{ $t('trading-assistant.startStrategy') }}
                    </a-button>
                    <a-button
                      v-if="selectedStrategy.status === 'running'"
                      type="danger"
                      size="large"
                      class="action-btn stop-btn"
                      @click="handleStopStrategy(selectedStrategy.id)">
                      <a-icon type="pause-circle" />
                      {{ $t('trading-assistant.stopStrategy') }}
                    </a-button>
                  </div>
                </div>
              </a-card>

              <a-card :bordered="false" class="strategy-content-card">
                <a-tabs v-model="detailTab">
                  <a-tab-pane key="positions" :tab="$t('trading-assistant.tabs.positions')">
                    <position-records
                      :strategy-id="selectedStrategy.id"
                      :execution-mode="selectedStrategy.execution_mode || 'signal'"
                      :market-type="(selectedStrategy.trading_config && selectedStrategy.trading_config.market_type) || 'swap'"
                      :leverage="(selectedStrategy.trading_config && selectedStrategy.trading_config.leverage) || 1"
                      :loading="loadingRecords"
                      :is-dark="isDarkTheme" />
                  </a-tab-pane>
                  <a-tab-pane key="trades" :tab="$t('trading-assistant.tabs.tradingRecords')">
                    <trading-records
                      :strategy-id="selectedStrategy.id"
                      :loading="loadingRecords"
                      :is-dark="isDarkTheme" />
                  </a-tab-pane>
                  <a-tab-pane key="performance" :tab="$t('trading-assistant.tabs.performance')">
                    <performance-analysis
                      :strategy-id="selectedStrategy.id"
                      :is-dark="isDarkTheme" />
                  </a-tab-pane>
                  <a-tab-pane key="review" :tab="$t('trading-assistant.tabs.aiReview')">
                    <strategy-review-report
                      v-if="detailTab === 'review'"
                      :strategy-id="selectedStrategy.id"
                      :is-dark="isDarkTheme" />
                  </a-tab-pane>
                  <a-tab-pane key="logs" :tab="$t('trading-assistant.tabs.logs')">
                    <strategy-logs
                      :strategy-id="selectedStrategy.id"
                      :is-dark="isDarkTheme" />
                  </a-tab-pane>
                </a-tabs>
              </a-card>
            </div>
          </a-col>
        </a-row>

        <a-modal
          :visible="showModeSelector"
          :title="$t('trading-assistant.selectMode')"
          :width="isMobile ? '95%' : 700"
          :footer="null"
          @cancel="showModeSelector = false"
          :maskClosable="true"
          class="mode-selector-modal"
          :bodyStyle="{ padding: '16px 24px' }">
          <strategy-type-selector
            :selected="strategyMode"
            :is-dark="isDarkTheme"
            :variant="modeSelectorVariant"
            @select="handleModeSelect"
            @use-template="handleUseTemplate"
          />
        </a-modal>

        <a-modal
          :visible="showFormModal"
          :destroy-on-close="true"
          :title="editingStrategy ? $t('trading-assistant.editStrategy') : $t('trading-assistant.createStrategy') + (strategyMode === 'script' ? ' - ' + $t('trading-assistant.strategyMode.script') : '')"
          :width="isMobile ? '95%' : 1120"
          :confirmLoading="saving"
          @ok="handleSubmit"
          @cancel="handleCloseModal"
          :maskClosable="false"
          :wrapClassName="strategyFormWrapClass"
          :bodyStyle="{ maxHeight: '76vh', overflowY: 'auto', paddingBottom: '8px' }">
          <a-spin :spinning="loadingIndicators">
            <a-steps :current="displayCurrentStep" class="steps-container">
              <template v-if="strategyMode === 'script'">
                <a-step :title="$t('trading-assistant.form.scriptSource')" />
                <a-step :title="$t('trading-assistant.form.scriptStepParams')" />
                <a-step :title="$t('trading-assistant.form.scriptStepSignalLive')" />
              </template>
              <template v-else>
                <a-step :title="$t('trading-assistant.form.stepMergedConfig')" />
                <a-step :title="$t('trading-assistant.form.step3Signal')" />
              </template>
            </a-steps>

            <div class="form-container">
              <div v-show="currentStep === 0" class="step-content">
                <div v-if="strategyMode === 'script'">
                  <a-alert
                    type="info"
                    show-icon
                    style="margin-bottom: 12px;"
                    :message="$t('trading-assistant.form.scriptSourceTitle')"
                    :description="$t('trading-assistant.form.scriptSourceHint')"
                  />
                  <a-form :form="form" layout="vertical">
                    <a-form-item :label="$t('trading-assistant.form.scriptSource')">
                      <a-select
                        v-model="selectedScriptSourceId"
                        show-search
                        option-filter-prop="children"
                        :loading="loadingScriptSource"
                        :placeholder="$t('trading-assistant.form.scriptSourcePlaceholder')"
                        @change="handleScriptSourceChange">
                        <a-select-option
                          v-for="item in scriptSourceOptions"
                          :key="String(item.id)"
                          :value="String(item.id)">
                          {{ item.optionLabel }}
                        </a-select-option>
                      </a-select>
                    </a-form-item>
                    <div v-if="selectedScriptSourcePreview" class="script-source-preview">
                      <div class="script-source-preview__title">{{ selectedScriptSourcePreview.name || selectedScriptSourcePreview.strategy_name }}</div>
                      <div class="script-source-preview__meta">
                        <a-tag v-if="scriptTemplateKeyOf(selectedScriptSourcePreview)" color="blue">
                          {{ scriptTemplateLabel(scriptTemplateKeyOf(selectedScriptSourcePreview)) }}
                        </a-tag>
                        <span>{{ selectedScriptSourcePreview.code ? selectedScriptSourcePreview.code.length : 0 }} chars</span>
                      </div>
                    </div>
                    <a-button type="link" icon="code" style="padding-left: 0" @click="$router.push({ path: '/strategy-ide', query: { tab: 'script' } })">
                      {{ $t('trading-assistant.form.manageScriptSources') }}
                    </a-button>
                  </a-form>
                </div>

                <div v-if="strategyType === 'indicator' && strategyMode !== 'script'">
                  <a-form :form="form" layout="vertical">
                    <a-form-item :label="$t('trading-assistant.form.indicator')">
                      <a-select
                        v-decorator="['indicator_id', { rules: [{ required: true, message: $t('trading-assistant.validation.indicatorRequired') }] }]"
                        :placeholder="$t('trading-assistant.placeholders.selectIndicator')"
                        show-search
                        optionLabelProp="label"
                        :filter-option="filterIndicatorOption"
                        @focus="handleIndicatorSelectFocus"
                        @change="handleIndicatorChange"
                        :loading="loadingIndicators"
                        :getPopupContainer="(triggerNode) => triggerNode.parentNode">
                        <a-select-option
                          v-for="indicator in availableIndicators"
                          :key="String(indicator.id)"
                          :value="String(indicator.id)"
                          :label="getIndicatorOptionLabel(indicator)">
                          <div class="indicator-option">
                            <div class="indicator-option-main">
                              <span class="indicator-name">{{ indicator.name }}</span>
                              <span v-if="indicator.description" class="indicator-option-desc">{{ indicator.description }}</span>
                            </div>
                            <a-tag v-if="indicator.type" size="small" :color="getIndicatorTypeColor(indicator.type)">
                              {{ getIndicatorTypeName(indicator.type) }}
                            </a-tag>
                          </div>
                        </a-select-option>
                      </a-select>
                      <div class="form-item-hint">
                        {{ $t('trading-assistant.form.indicatorHint') }}
                      </div>
                      <a-alert
                        v-if="!loadingIndicators && (!availableIndicators || availableIndicators.length === 0)"
                        type="info"
                        show-icon
                        style="margin-top: 12px;"
                        :message="$t('trading-assistant.indicatorEmpty.title')"
                        :description="$t('trading-assistant.indicatorEmpty.desc')"
                      >
                        <template slot="action">
                          <a-button type="primary" size="small" @click="goToIndicatorAnalysisCreate">
                            <a-icon type="rocket" />
                            {{ $t('trading-assistant.indicatorEmpty.cta') }}
                          </a-button>
                        </template>
                      </a-alert>
                    </a-form-item>

                    <a-form-item v-if="selectedIndicator" :label="$t('trading-assistant.form.indicatorDescription')">
                      <div class="selected-indicator-card">
                        <div class="selected-indicator-header">
                          <span class="selected-indicator-name">{{ selectedIndicator.name }}</span>
                          <a-tag v-if="selectedIndicator.type" size="small" :color="getIndicatorTypeColor(selectedIndicator.type)">
                            {{ getIndicatorTypeName(selectedIndicator.type) }}
                          </a-tag>
                        </div>
                        <div class="indicator-description">
                          {{ selectedIndicator.description || $t('trading-assistant.form.noDescription') }}
                        </div>
                      </div>
                    </a-form-item>

                    <a-form-item v-if="indicatorParams.length > 0" :label="$t('trading-assistant.form.indicatorParams')">
                      <div class="indicator-params-form">
                        <a-row :gutter="16">
                          <a-col v-for="param in indicatorParams" :key="param.name" :xs="24" :sm="12" :md="8">
                            <div class="param-item">
                              <label class="param-label">
                                {{ param.name }}
                                <a-tooltip v-if="param.description" :title="param.description">
                                  <a-icon type="question-circle" style="margin-left: 4px; color: #999;" />
                                </a-tooltip>
                              </label>
                              <a-input-number
                                v-if="param.type === 'int'"
                                v-model="indicatorParamValues[param.name]"
                                :precision="0"
                                style="width: 100%;"
                                size="small" />
                              <a-input-number
                                v-else-if="param.type === 'float'"
                                v-model="indicatorParamValues[param.name]"
                                :precision="4"
                                style="width: 100%;"
                                size="small" />
                              <a-switch
                                v-else-if="param.type === 'bool'"
                                v-model="indicatorParamValues[param.name]"
                                size="small" />
                              <a-input
                                v-else
                                v-model="indicatorParamValues[param.name]"
                                size="small" />
                            </div>
                          </a-col>
                        </a-row>
                        <div class="form-item-hint" style="margin-top: 8px;">
                          {{ $t('trading-assistant.form.indicatorParamsHint') }}
                        </div>
                      </div>
                    </a-form-item>

                    <a-divider />

                    <a-form-item :label="$t('trading-assistant.form.strategyName')">
                      <a-input
                        v-decorator="['strategy_name', { rules: [{ required: true, message: $t('trading-assistant.validation.strategyNameRequired') }] }]"
                        :placeholder="$t('trading-assistant.placeholders.inputStrategyName')" />
                      <div class="form-item-hint">
                        {{ $t('trading-assistant.form.strategyNameHint') }}
                      </div>
                    </a-form-item>

                    <!-- ===== Strategy type & market scope ===== -->
                    <div class="advanced-settings-shell">
                      <div class="section-block-title">
                        <span>{{ $t('trading-assistant.form.sectionStrategyMarket') }}</span>
                        <span class="section-block-desc">{{ $t('trading-assistant.form.sectionStrategyMarketDesc') }}</span>
                      </div>
                    </div>

                    <a-form-item :label="$t('trading-assistant.form.strategyType')">
                      <a-radio-group
                        v-decorator="['cs_strategy_type', { initialValue: 'single' }]"
                        :disabled="isEditMode"
                        @change="handleStrategyTypeChange">
                        <a-radio-button value="single">
                          {{ $t('trading-assistant.form.strategyTypeSingle') }}
                        </a-radio-button>
                        <a-radio-button value="cross_sectional">
                          {{ $t('trading-assistant.form.strategyTypeCrossSectional') }}
                        </a-radio-button>
                      </a-radio-group>
                      <div class="form-item-hint">{{ $t('trading-assistant.form.strategyTypeHint') }}</div>
                    </a-form-item>

                    <template v-if="csStrategyTypeUi === 'cross_sectional'">
                      <a-form-item :label="$t('trading-assistant.form.symbolList')" :required="true">
                        <a-select
                          v-model="crossSectionalSymbols"
                          mode="multiple"
                          :placeholder="$t('trading-assistant.placeholders.selectSymbols')"
                          show-search
                          :filter-option="filterWatchlistOptionWithAdd"
                          :loading="loadingWatchlist"
                          @change="handleCrossSectionalSymbolChange"
                          :getPopupContainer="(triggerNode) => triggerNode.parentNode"
                          :maxTagCount="4">
                          <a-select-option
                            v-for="item in watchlist"
                            :key="`cs-${item.market}:${item.symbol}`"
                            :value="`${item.market}:${item.symbol}`">
                            <div class="symbol-option">
                              <a-tag :color="getMarketColor(item.market)" style="margin-right: 8px; margin-bottom: 0;">
                                {{ item.market }}
                              </a-tag>
                              <span class="symbol-name">{{ item.symbol }}</span>
                              <span v-if="item.name" class="symbol-name-extra">{{ item.name }}</span>
                            </div>
                          </a-select-option>
                          <a-select-option key="__add_symbol_option__" value="__add_symbol_option__" class="add-symbol-option">
                            <div style="width: 100%; text-align: center; padding: 4px 0; color: var(--primary-color, #1890ff); cursor: pointer;">
                              <a-icon type="plus" style="margin-right: 4px;" />
                              <span>{{ $t('trading-assistant.form.addSymbol') }}</span>
                            </div>
                          </a-select-option>
                        </a-select>
                        <div class="form-item-hint">{{ $t('trading-assistant.form.symbolListHint') }}</div>
                      </a-form-item>
                      <a-row :gutter="16">
                        <a-col :xs="24" :sm="8">
                          <a-form-item :label="$t('trading-assistant.form.portfolioSize')">
                            <a-input-number
                              v-decorator="['portfolio_size', { initialValue: 5, rules: [{ required: true, message: $t('trading-assistant.validation.portfolioSizeRequired') }] }]"
                              :min="1"
                              :max="50"
                              style="width: 100%;" />
                            <div class="form-item-hint">{{ $t('trading-assistant.form.portfolioSizeHint') }}</div>
                          </a-form-item>
                        </a-col>
                        <a-col :xs="24" :sm="8">
                          <a-form-item :label="$t('trading-assistant.form.longRatio')">
                            <a-input-number
                              v-decorator="['long_ratio', { initialValue: 1 }]"
                              :min="0"
                              :max="1"
                              :step="0.1"
                              style="width: 100%;" />
                            <div class="form-item-hint">{{ $t('trading-assistant.form.longRatioHint') }}</div>
                          </a-form-item>
                        </a-col>
                        <a-col :xs="24" :sm="8">
                          <a-form-item :label="$t('trading-assistant.form.rebalanceFrequency')">
                            <a-select
                              v-decorator="['rebalance_frequency', { initialValue: 'daily' }]"
                              style="width: 100%;">
                              <a-select-option value="daily">{{ $t('trading-assistant.form.rebalanceDaily') }}</a-select-option>
                              <a-select-option value="weekly">{{ $t('trading-assistant.form.rebalanceWeekly') }}</a-select-option>
                              <a-select-option value="monthly">{{ $t('trading-assistant.form.rebalanceMonthly') }}</a-select-option>
                            </a-select>
                            <div class="form-item-hint">{{ $t('trading-assistant.form.rebalanceFrequencyHint') }}</div>
                          </a-form-item>
                        </a-col>
                      </a-row>
                      <a-alert
                        v-if="crossSectionalIndicatorCodeOverride"
                        type="success"
                        show-icon
                        :message="$t('trading-assistant.form.crossSectionalTemplateApplied')"
                        style="margin-bottom: 8px;" />
                      <a-button type="link" icon="snippets" style="padding-left: 0;" @click="insertCrossSectionalIndicatorTemplate">
                        {{ $t('trading-assistant.form.insertCrossSectionalTemplate') }}
                      </a-button>
                      <a-alert
                        v-if="crossSectionalIndicatorWarn"
                        type="warning"
                        show-icon
                        :message="$t('trading-assistant.form.crossSectionalIndicatorWarn')"
                        style="margin-bottom: 12px;" />
                    </template>

                    <a-form-item
                      v-if="csStrategyTypeUi !== 'cross_sectional'"
                      :label="isEditMode ? $t('trading-assistant.form.symbol') : $t('trading-assistant.form.symbols')"
                      :required="true">
                      <a-select
                        v-if="isEditMode"
                        v-decorator="['symbol', { rules: [{ required: true, message: $t('trading-assistant.validation.symbolRequired') }] }]"
                        :placeholder="$t('trading-assistant.placeholders.selectSymbol')"
                        show-search
                        :filter-option="filterWatchlistOption"
                        :loading="loadingWatchlist"
                        @change="handleWatchlistSymbolChange"
                        :getPopupContainer="(triggerNode) => triggerNode.parentNode">
                        <a-select-option
                          v-for="item in watchlist"
                          :key="`${item.market}:${item.symbol}`"
                          :value="`${item.market}:${item.symbol}`">
                          <div class="symbol-option">
                            <a-tag :color="getMarketColor(item.market)" style="margin-right: 8px; margin-bottom: 0;">
                              {{ item.market }}
                            </a-tag>
                            <span class="symbol-name">{{ item.symbol }}</span>
                            <span v-if="item.name" class="symbol-name-extra">{{ item.name }}</span>
                          </div>
                        </a-select-option>
                        <a-select-option key="__add_symbol_option__" value="__add_symbol_option__" class="add-symbol-option">
                          <div style="width: 100%; text-align: center; padding: 4px 0; color: var(--primary-color, #1890ff); cursor: pointer;">
                            <a-icon type="plus" style="margin-right: 4px;" />
                            <span>{{ $t('trading-assistant.form.addSymbol') }}</span>
                          </div>
                        </a-select-option>
                      </a-select>
                      <a-select
                        v-else
                        v-model="selectedSymbols"
                        mode="multiple"
                        :placeholder="$t('trading-assistant.placeholders.selectSymbols')"
                        show-search
                        :filter-option="filterWatchlistOptionWithAdd"
                        :loading="loadingWatchlist"
                        @change="handleMultiSymbolChangeWithAdd"
                        :getPopupContainer="(triggerNode) => triggerNode.parentNode"
                        :maxTagCount="3">
                        <a-select-option
                          v-for="item in watchlist"
                          :key="`${item.market}:${item.symbol}`"
                          :value="`${item.market}:${item.symbol}`">
                          <div class="symbol-option">
                            <a-tag :color="getMarketColor(item.market)" style="margin-right: 8px; margin-bottom: 0;">
                              {{ item.market }}
                            </a-tag>
                            <span class="symbol-name">{{ item.symbol }}</span>
                            <span v-if="item.name" class="symbol-name-extra">{{ item.name }}</span>
                          </div>
                        </a-select-option>
                        <a-select-option key="__add_symbol_option__" value="__add_symbol_option__" class="add-symbol-option">
                          <div style="width: 100%; text-align: center; padding: 4px 0; color: var(--primary-color, #1890ff); cursor: pointer;">
                            <a-icon type="plus" style="margin-right: 4px;" />
                            <span>{{ $t('trading-assistant.form.addSymbol') }}</span>
                          </div>
                        </a-select-option>
                      </a-select>
                      <div class="form-item-hint">
                        {{ isEditMode ? $t('trading-assistant.form.symbolHintCrypto') :
                          $t('trading-assistant.form.symbolsHint') }}
                      </div>
                    </a-form-item>

                    <!-- ===== Trading params (capital/leverage/direction/timeframe etc.) ===== -->
                    <div>

                      <a-row :gutter="16">
                        <a-col :xs="24" :sm="24" :md="12" :lg="12">
                          <a-form-item :label="$t('trading-assistant.form.initialCapital')">
                            <a-input-number
                              v-decorator="['initial_capital', { rules: [{ required: true, message: $t('trading-assistant.validation.initialCapitalRequired') }, { validator: validateInvestmentAmount }], initialValue: 1000 }]"
                              :min="investmentAmountMin"
                              :max="investmentAmountMax"
                              :step="100"
                              :precision="2"
                              style="width: 100%" />
                          </a-form-item>
                        </a-col>
                        <a-col v-if="shouldShowMarketTypeSelector" :xs="24" :sm="24" :md="12" :lg="12">
                          <a-form-item :label="$t('trading-assistant.form.marketType')">
                            <a-radio-group
                              v-decorator="['market_type', { initialValue: 'swap' }]"
                              @change="handleMarketTypeChange">
                              <a-radio value="swap" :disabled="isAlpacaCryptoSpotOnly">{{ $t('trading-assistant.form.marketTypeFutures') }}</a-radio>
                              <a-radio value="spot">{{ $t('trading-assistant.form.marketTypeSpot') }}</a-radio>
                            </a-radio-group>
                            <div class="form-item-hint">
                              {{ $t('trading-assistant.form.marketTypeHint') }}
                            </div>
                            <div
                              v-if="isAlpacaCryptoSpotOnly"
                              class="form-item-hint"
                              style="color: #ff9800;">
                              {{ $t('trading-assistant.form.alpacaCryptoSpotOnlyHint') || 'Alpaca crypto desk is spot-only (no perpetual swaps). Market type locked to Spot.' }}
                            </div>
                          </a-form-item>
                        </a-col>
                        <a-col v-else :xs="24" :sm="24" :md="12" :lg="12">
                          <a-form-item :label="$t('trading-assistant.form.marketType')">
                            <a-tag color="cyan">{{ $t('trading-assistant.form.marketTypeSpot') }}</a-tag>
                            <div class="form-item-hint">
                              {{ $t('trading-assistant.form.stockSpotOnlyHint') || 'Stocks are traded as spot/cash products. Futures/contract market type is hidden.' }}
                            </div>
                          </a-form-item>
                        </a-col>
                      </a-row>

                      <a-row :gutter="16">
                        <a-col :xs="24" :sm="24" :md="12" :lg="12">
                          <a-form-item :label="`${$t('trading-assistant.form.leverage')} (x)`">
                            <a-input-number
                              v-decorator="['leverage', { initialValue: 5, rules: [{ required: true, message: $t('trading-assistant.validation.leverageRequired') }] }]"
                              :min="1"
                              :max="isSpotLikeMarket ? 1 : 125"
                              :step="1"
                              style="width: 100%"
                              :disabled="isSpotLikeMarket" />
                            <div class="form-item-hint">
                              <span v-if="isSpotLikeMarket">
                                {{ $t('trading-assistant.form.spotLeverageFixed') }}
                              </span>
                              <span v-else>
                                {{ $t('trading-assistant.form.leverageHint') }}
                              </span>
                            </div>
                          </a-form-item>
                        </a-col>
                        <a-col :xs="24" :sm="24" :md="12" :lg="12">
                          <a-form-item :label="$t('trading-assistant.form.tradeDirection')">
                            <a-radio-group
                              v-decorator="['trade_direction', { initialValue: 'long' }]"
                              :disabled="isSpotLikeMarket || isLongOnlyBroker">
                              <a-radio value="long">{{ $t('trading-assistant.form.tradeDirectionLong') }}</a-radio>
                              <a-radio value="short" :disabled="isSpotLikeMarket || isLongOnlyBroker">
                                {{ $t('trading-assistant.form.tradeDirectionShort') }}
                              </a-radio>
                              <a-radio value="both" :disabled="isSpotLikeMarket || isLongOnlyBroker">
                                {{ $t('trading-assistant.form.tradeDirectionBoth') }}
                              </a-radio>
                            </a-radio-group>
                            <div
                              v-if="isSpotLikeMarket"
                              class="form-item-hint"
                              style="color: #ff9800;">
                              {{ $t('trading-assistant.form.spotOnlyLongHint') }}
                            </div>
                            <div
                              v-else-if="isLongOnlyBroker"
                              class="form-item-hint"
                              style="color: #ff9800;">
                              {{ $t('trading-assistant.form.longOnlyBrokerHint') || 'IBKR / Alpaca currently support long-only trading. Direction locked to Long.' }}
                            </div>
                          </a-form-item>
                        </a-col>
                      </a-row>

                      <a-row :gutter="16">
                        <a-col :xs="24" :sm="24" :md="12" :lg="12">
                          <a-form-item :label="$t('trading-assistant.form.klinePeriod')">
                            <a-select
                              v-decorator="['timeframe', { initialValue: '15m', rules: [{ required: true }] }]"
                              :placeholder="$t('trading-assistant.placeholders.selectKlinePeriod')"
                              :getPopupContainer="(triggerNode) => triggerNode.parentNode">
                              <a-select-option value="1m">{{ $t('trading-assistant.form.timeframe1m') }}</a-select-option>
                              <a-select-option value="5m">{{ $t('trading-assistant.form.timeframe5m') }}</a-select-option>
                              <a-select-option value="15m">{{ $t('trading-assistant.form.timeframe15m') }}</a-select-option>
                              <a-select-option value="30m">{{ $t('trading-assistant.form.timeframe30m') }}</a-select-option>
                              <a-select-option value="1H">{{ $t('trading-assistant.form.timeframe1H') }}</a-select-option>
                              <a-select-option value="4H">{{ $t('trading-assistant.form.timeframe4H') }}</a-select-option>
                              <a-select-option value="1D">{{ $t('trading-assistant.form.timeframe1D') }}</a-select-option>
                            </a-select>
                          </a-form-item>
                        </a-col>
                        <a-col :xs="24" :sm="24" :md="12" :lg="12">
                          <a-form-item :label="$t('trading-assistant.form.strictMode')">
                            <a-switch
                              v-decorator="['strict_mode', { valuePropName: 'checked', initialValue: true }]" />
                            <div class="form-item-hint" style="margin-top: 4px;">
                              {{ $t('trading-assistant.form.strictModeHint') }}
                            </div>
                          </a-form-item>
                        </a-col>
                      </a-row>

                    </div><!-- / trading params -->

                    <a-divider />
                    <p class="form-item-hint" style="margin-bottom: 10px;">
                      {{ $t('trading-assistant.form.riskFromIndicatorInfo') }}
                    </p>
                    <a-alert
                      v-if="indicatorRiskMissingWarn"
                      type="warning"
                      show-icon
                      :message="$t('trading-assistant.form.riskFromIndicatorMissingWarn')"
                      style="margin-bottom: 14px;"
                    />

                    <div class="ai-filter-box">
                      <div class="ai-filter-header">
                        <div class="ai-filter-title">
                          <a-icon type="robot" />
                          <span>{{ $t('trading-assistant.form.enableAiFilter') }}</span>
                        </div>
                        <a-switch :checked="aiFilterEnabledUi" @change="onAiFilterToggle" />
                      </div>
                      <div class="ai-filter-hint">{{ $t('trading-assistant.form.enableAiFilterHint') }}</div>
                    </div>
                  </a-form>
                </div>
              </div>

              <div v-if="strategyMode === 'script'" v-show="currentStep === 1" class="step-content">
                <div>
                  <a-form :form="form" layout="vertical">
                    <a-form-item :label="$t('trading-assistant.form.strategyName')">
                      <a-input
                        v-decorator="['strategy_name', { rules: [{ required: true, message: $t('trading-assistant.validation.strategyNameRequired') }] }]"
                        :placeholder="$t('trading-assistant.placeholders.inputStrategyName')" />
                    </a-form-item>

                    <a-form-item :label="$t('trading-assistant.form.symbol')">
                      <a-select
                        v-decorator="['symbol', { rules: [{ required: true, message: $t('trading-assistant.validation.symbolRequired') }] }]"
                        :placeholder="$t('trading-assistant.placeholders.selectSymbol')"
                        show-search
                        :filter-option="filterWatchlistOption"
                        :loading="loadingWatchlist"
                        @change="handleWatchlistSymbolChange"
                        :getPopupContainer="(triggerNode) => triggerNode.parentNode">
                        <a-select-option
                          v-for="item in watchlist"
                          :key="`${item.market}:${item.symbol}`"
                          :value="`${item.market}:${item.symbol}`">
                          <div class="symbol-option">
                            <a-tag :color="getMarketColor(item.market)" style="margin-right: 8px; margin-bottom: 0;">
                              {{ item.market }}
                            </a-tag>
                            <span class="symbol-name">{{ item.symbol }}</span>
                            <span v-if="item.name" class="symbol-name-extra">{{ item.name }}</span>
                          </div>
                        </a-select-option>
                      </a-select>
                    </a-form-item>
                    <a-row :gutter="16">
                      <a-col :xs="24" :sm="12">
                        <a-form-item :label="$t('trading-assistant.form.initialCapital')">
                          <a-input-number
                            v-decorator="['initial_capital', { initialValue: 1000, rules: [{ required: true, message: $t('trading-assistant.validation.initialCapitalRequired') }, { validator: validateInvestmentAmount }] }]"
                            :min="investmentAmountMin"
                            :max="investmentAmountMax"
                            :step="100"
                            :precision="2"
                            style="width: 100%"
                          />
                          <div class="form-item-hint">
                            {{ $t('trading-assistant.form.initialCapitalRuntimeHint') }}
                          </div>
                        </a-form-item>
                      </a-col>
                      <a-col :xs="24" :sm="12">
                        <a-form-item :label="`${$t('trading-assistant.form.leverage')} (x)`">
                          <a-input-number
                            v-decorator="['leverage', { initialValue: 5, rules: [{ required: true }] }]"
                            :min="1"
                            :max="isScriptRuntimeSpotOnly ? 1 : 125"
                            :step="1"
                            style="width: 100%"
                            :disabled="isScriptRuntimeSpotOnly"
                          />
                          <div v-if="isScriptRuntimeSpotOnly" class="form-item-hint" style="color: #ff9800;">
                            {{ $t('trading-assistant.form.scriptSpotOnlyHint') }}
                          </div>
                        </a-form-item>
                      </a-col>
                    </a-row>

                    <a-row :gutter="16">
                      <a-col v-if="shouldShowMarketTypeSelector" :xs="24" :sm="12">
                        <a-form-item :label="$t('trading-assistant.form.marketType')">
                          <a-radio-group
                            v-decorator="['market_type', { initialValue: 'swap' }]"
                            @change="handleMarketTypeChange">
                            <a-radio value="swap" :disabled="isAlpacaCryptoSpotOnly">{{ $t('trading-assistant.form.marketTypeFutures') }}</a-radio>
                            <a-radio value="spot">{{ $t('trading-assistant.form.marketTypeSpot') }}</a-radio>
                          </a-radio-group>
                          <div v-if="isAlpacaCryptoSpotOnly" class="form-item-hint" style="color: #ff9800;">
                            {{ $t('trading-assistant.form.alpacaCryptoSpotOnlyHint') || 'Alpaca crypto desk is spot-only. Market type locked to Spot.' }}
                          </div>
                        </a-form-item>
                      </a-col>
                      <a-col v-else :xs="24" :sm="12">
                        <a-form-item :label="$t('trading-assistant.form.marketType')">
                          <a-tag color="cyan">{{ $t('trading-assistant.form.marketTypeSpot') }}</a-tag>
                          <div class="form-item-hint">
                            {{ $t('trading-assistant.form.stockSpotOnlyHint') || 'Stocks are traded as spot/cash products. Futures/contract market type is hidden.' }}
                          </div>
                        </a-form-item>
                      </a-col>
                      <a-col :xs="24" :sm="12">
                        <a-form-item :label="$t('trading-assistant.form.tradeDirection')">
                          <a-select
                            v-decorator="['trade_direction', { initialValue: 'long', rules: [{ required: true }] }]"
                            :disabled="isScriptRuntimeSpotOnly"
                            :getPopupContainer="(triggerNode) => triggerNode.parentNode">
                            <a-select-option value="long">{{ $t('trading-assistant.form.tradeDirectionLong') }}</a-select-option>
                            <a-select-option value="short" :disabled="isScriptRuntimeSpotOnly">{{ $t('trading-assistant.form.tradeDirectionShort') }}</a-select-option>
                            <a-select-option value="both" :disabled="isScriptRuntimeSpotOnly">{{ $t('trading-assistant.form.tradeDirectionBoth') }}</a-select-option>
                          </a-select>
                          <div
                            v-if="isScriptRuntimeSpotOnly"
                            class="form-item-hint"
                            style="color: #ff9800;">
                            闂備浇宕甸崰鎰垝鎼淬垺娅犳俊銈呮噹缁犱即鏌涘☉姗堟敾婵炲懐濞€閺岋絽螣濞嗘儳娈梺鍛婂姀閸嬫捇姊绘担瑙勫仩闁稿寒鍣ｅ鎻掝煥閸喎浠奸梻渚囧墮缁夌敻鎮″▎鎾村€垫繛鎴炵懐閻掕棄顭胯娴滎亪寮诲☉銏犵厸闁稿本绮庨悡澶愭倵鐟欏嫭澶勯柛銊ㄦ硾閻ｇ兘宕￠悙宥嗘閸┾偓妞ゆ巻鍋撻柍钘夘槼椤﹀綊鏌＄仦璇测偓妤呭焵椤掆偓濠€杈ㄦ叏閻㈡潌澶嬪緞婵炴帒缍婇幃鈺佺暦閸ワ絽顫岄柣搴＄仛濠㈡鈧凹鍓熼敐鐐测攽鐎ｎ亞顦悷婊冪箻钘濇い鏇楀亾婵﹥妞藉畷顐﹀礋椤愮喎浜惧┑鐘宠壘缁犵娀鏌熼幑鎰靛殭缂佺姵鐗楃换婵囩節閸屾粌顣洪梺缁樺姇閿曨亪寮诲☉妯锋斀闁糕剝顨忔导鈧梻浣告惈濡瑥顭垮鈧崺銉﹀緞閹邦剛顔掗梺鎯ф禋閸嬪懘宕曢幘瀵哥閻庣數顭堟牎缂備礁顑嗙敮鎺楊敋閵夆晛绀嬫い鎰靛亝閸嶇敻姊洪棃娑辨Ф闁搞劏顫夌粋?                          </div>
                        </a-form-item>
                      </a-col>
                    </a-row>

                    <a-alert
                      type="info"
                      show-icon
                      class="script-template-sizing-alert"
                      :message="$t('trading-assistant.form.scriptRuntimeBoundaryInfo')"
                    />
                  </a-form>
                </div>
              </div>

              <div
                v-show="(strategyMode === 'script' && currentStep === 2) || (strategyMode !== 'script' && currentStep === 1)"
                class="step-content">
                <a-form :form="form" layout="vertical" autocomplete="off">
                  <div class="execution-step-layout">
                    <div class="execution-step-hero">
                      <div class="simple-mode-kicker">{{ $t('trading-assistant.form.step2HeroTitle') }}</div>
                      <div class="execution-step-hero-desc">{{ $t('trading-assistant.form.step2HeroDesc') }}</div>
                    </div>

                    <div class="execution-section-card">
                      <div class="section-block-title">
                        <span>{{ $t('trading-assistant.form.executionSectionTitle') }}</span>
                        <span class="section-block-desc">{{ $t('trading-assistant.form.executionSectionDesc') }}</span>
                      </div>

                      <a-form-item :label="$t('trading-assistant.form.executionMode')" class="compact-form-item">
                        <a-input
                          v-decorator="['execution_mode', { initialValue: 'live' }]"
                          style="display: none;" />
                        <div class="execution-mode-cards">
                          <div
                            :class="['execution-mode-card', 'live-card', { active: executionModeUi === 'live', disabled: !canUseLiveTrading }]"
                            @click="canUseLiveTrading && setExecutionModeUi('live')">
                            <div class="execution-mode-card-icon live">
                              <a-icon type="thunderbolt" />
                            </div>
                            <div class="execution-mode-card-body">
                              <div class="execution-mode-card-title">{{ $t('trading-assistant.form.executionModeLive') }}</div>
                              <div class="execution-mode-card-desc">
                                {{ canUseLiveTrading ? $t('trading-assistant.form.executionModeLiveDesc') : $t('trading-assistant.form.liveTradingNotSupportedHint') }}
                              </div>
                            </div>
                            <a-icon
                              v-if="executionModeUi === 'live' && canUseLiveTrading"
                              type="check-circle"
                              theme="filled"
                              class="execution-mode-card-check" />
                          </div>

                          <div
                            :class="['execution-mode-card', { active: executionModeUi === 'signal' }]"
                            @click="setExecutionModeUi('signal')">
                            <div class="execution-mode-card-icon signal">
                              <a-icon type="notification" />
                            </div>
                            <div class="execution-mode-card-body">
                              <div class="execution-mode-card-title">{{ $t('trading-assistant.form.executionModeSignal') }}</div>
                              <div class="execution-mode-card-desc">{{ $t('trading-assistant.form.executionModeSignalDesc') }}</div>
                            </div>
                            <a-icon v-if="executionModeUi === 'signal'" type="check-circle" theme="filled" class="execution-mode-card-check" />
                          </div>
                        </div>
                        <div v-if="!canUseLiveTrading" class="form-item-hint execution-warn-text">
                          {{ $t('trading-assistant.form.liveTradingNotSupportedHint') }}
                        </div>
                      </a-form-item>

                      <a-alert
                        v-if="executionModeUi === 'live' && canUseLiveTrading"
                        type="warning"
                        showIcon
                        class="section-inline-alert"
                        :message="$t('trading-assistant.liveDisclaimer.title')"
                        :description="$t('trading-assistant.liveDisclaimer.content')" />
                    </div>

                    <div class="execution-section-card execution-section-card--collapsible">
                      <div class="section-block-title section-block-title--toggle" @click="notifySectionExpanded = !notifySectionExpanded">
                        <span>
                          <a-icon :type="notifySectionExpanded ? 'down' : 'right'" class="collapse-arrow" />
                          {{ $t('trading-assistant.form.notificationSectionTitle') }}
                        </span>
                        <span class="section-block-desc">
                          {{ notifySectionExpanded ? '' : $t('trading-assistant.form.notificationSectionDesc') }}
                        </span>
                      </div>

                      <div v-show="notifySectionExpanded" class="collapsible-body">
                        <a-form-item :label="$t('trading-assistant.form.notifyChannels')" class="compact-form-item">
                          <a-checkbox-group
                            v-decorator="['notify_channels', { initialValue: ['browser', 'email'] }]"
                            class="notify-channel-grid"
                            @change="onNotifyChannelsChange">
                            <a-checkbox value="browser">{{ $t('trading-assistant.notify.browser') }}</a-checkbox>
                            <a-checkbox value="email">{{ $t('trading-assistant.notify.email') }}</a-checkbox>
                            <a-checkbox value="telegram">{{ $t('trading-assistant.notify.telegram') }}</a-checkbox>
                            <a-checkbox value="discord">{{ $t('trading-assistant.notify.discord') }}</a-checkbox>
                            <a-checkbox value="webhook">{{ $t('trading-assistant.notify.webhook') }}</a-checkbox>
                            <a-checkbox value="phone">{{ $t('trading-assistant.notify.phone') }}</a-checkbox>
                          </a-checkbox-group>
                          <div class="form-item-hint">{{ $t('trading-assistant.form.notifyChannelsHint') }}</div>
                        </a-form-item>

                        <a-alert
                          v-if="unconfiguredChannels.length > 0"
                          type="warning"
                          showIcon
                          class="section-inline-alert">
                          <template #message>
                            <span>
                              {{ $t('trading-assistant.form.notificationConfigMissing', { channels: unconfiguredChannels.join(', ') }) }}
                              <router-link :to="{ path: '/profile', query: { tab: 'notifications' } }" style="margin-left: 8px">
                                <a-icon type="setting" /> {{ $t('trading-assistant.form.goToProfile') }}
                              </router-link>
                            </span>
                          </template>
                        </a-alert>

                        <a-alert
                          v-else-if="notifyChannelsUi.length > 0 && !notifyChannelsUi.includes('browser') || (notifyChannelsUi.length > 1)"
                          type="info"
                          showIcon
                          class="section-inline-alert">
                          <template #message>
                            <span>
                              {{ $t('trading-assistant.form.notificationFromProfile') }}
                              <router-link :to="{ path: '/profile', query: { tab: 'notifications' } }" style="margin-left: 8px">
                                <a-icon type="setting" /> {{ $t('trading-assistant.form.goToProfile') }}
                              </router-link>
                            </span>
                          </template>
                        </a-alert>
                      </div>
                    </div>

                    <div v-if="executionModeUi === 'live' && canUseLiveTrading" class="execution-section-card">
                      <div class="section-block-title">
                        <span>{{ $t('trading-assistant.form.liveConnectionSectionTitle') }}</span>
                        <span class="section-block-desc">{{ $t('trading-assistant.form.liveConnectionSectionDesc') }}</span>
                      </div>

                      <a-alert
                        type="warning"
                        show-icon
                        class="section-inline-alert"
                        style="margin-bottom: 16px;"
                        :message="$t('trading-assistant.form.liveTradingConfigTitle')"
                        :description="$t('trading-assistant.form.liveTradingConfigHint')" />

                      <a-form-item :label="$t('trading-assistant.form.savedCredential')" class="compact-form-item ta-credential-form-item">
                        <div class="ta-credential-row">
                          <a-select
                            v-decorator="['credential_id', {
                              rules: [{ required: true, message: $t('profile.exchange.noCredentialHint') }],
                              getValueFromEvent: (val) => val || undefined
                            }]"
                            class="ta-credential-select"
                            :placeholder="$t('trading-assistant.placeholders.selectSavedCredential')"
                            allow-clear
                            show-search
                            option-filter-prop="children"
                            :loading="loadingExchangeCredentials"
                            @change="handleCredentialSelectChange">
                            <a-select-option
                              v-for="cred in filteredExchangeCredentials"
                              :key="cred.id"
                              :value="cred.id">
                              {{ formatCredentialLabel(cred) }}
                            </a-select-option>
                          </a-select>
                          <a-button type="primary" class="ta-add-cred-btn" @click="showExchangeAccountModal = true">
                            <a-icon type="plus" /> {{ $t('quickTrade.addAccountInline') }}
                          </a-button>
                        </div>
                        <a-alert
                          v-if="executionModeUi === 'live' && canUseLiveTrading && !loadingExchangeCredentials && filteredExchangeCredentials.length === 0"
                          type="warning"
                          show-icon
                          style="margin-top: 10px;"
                          :message="$t('trading-assistant.noCredentialForLive.title')"
                        >
                          <template slot="description">
                            <span>{{ $t('trading-assistant.noCredentialForLive.desc') }}</span>
                            <a-button type="primary" size="small" class="ta-empty-add-cred-btn" @click="showExchangeAccountModal = true">
                              <a-icon type="plus" />
                              {{ $t('quickTrade.addAccountInline') }}
                            </a-button>
                          </template>
                        </a-alert>
                      </a-form-item>
                    </div>
                  </div>
                </a-form>
              </div>
            </div>
          </a-spin>

          <template slot="footer">
            <a-button @click="handleCloseModal">{{ $t('trading-assistant.form.cancel') }}</a-button>
            <a-button v-show="currentStep > 0" @click="handlePrev">
              {{ $t('trading-assistant.form.prev') }}
            </a-button>
            <a-button v-show="showStrategyFormNext" type="primary" @click="handleNext" :loading="saving">
              {{ $t('trading-assistant.form.next') }}
            </a-button>
            <a-button v-show="showStrategyFormSubmit" type="primary" @click="handleSubmit" :loading="saving">
              {{ editingStrategy ? $t('trading-assistant.form.confirmEdit') : $t('trading-assistant.form.confirmCreate') }}
            </a-button>
          </template>
        </a-modal>

        <a-modal
          :title="$t('trading-assistant.form.addSymbolTitle')"
          :visible="showAddSymbolModal"
          @ok="handleConfirmAddSymbol"
          @cancel="handleCloseAddSymbolModal"
          :confirmLoading="addingSymbol"
          width="600px"
          :okText="$t('trading-assistant.form.confirmAdd')"
          :cancelText="$t('trading-assistant.form.cancel')"
          :maskClosable="false"
          :keyboard="false">
          <div class="add-symbol-modal-content">
            <a-tabs v-model="addSymbolMarket" @change="handleAddSymbolMarketChange" class="market-tabs">
              <a-tab-pane
                v-for="marketType in addSymbolMarketTypes"
                :key="marketType.value"
                :tab="$t(marketType.i18nKey || `dashboard.analysis.market.${marketType.value}`)">
              </a-tab-pane>
            </a-tabs>

            <div class="symbol-search-section">
              <a-input-search
                v-model="addSymbolKeyword"
                :placeholder="$t('dashboard.analysis.modal.addStock.searchOrInputPlaceholder')"
                @search="handleSearchSymbol"
                @change="handleSymbolSearchInputChange"
                :loading="searchingSymbol"
                size="large"
                allow-clear>
                <a-button slot="enterButton" type="primary" icon="search">
                  {{ $t('dashboard.analysis.modal.addStock.search') }}
                </a-button>
              </a-input-search>
            </div>

            <div v-if="symbolSearchResults.length > 0" class="search-results-section">
              <div class="section-title">
                <a-icon type="search" style="margin-right: 4px;" />
                {{ $t('dashboard.analysis.modal.addStock.searchResults') }}
              </div>
              <a-list
                :data-source="symbolSearchResults"
                :loading="searchingSymbol"
                size="small"
                class="symbol-list">
                <a-list-item slot="renderItem" slot-scope="item" class="symbol-list-item" @click="handleSelectAddSymbol(item)">
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
                  class="symbol-list">
                  <a-list-item slot="renderItem" slot-scope="item" class="symbol-list-item" @click="handleSelectAddSymbol(item)">
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

            <div v-if="selectedAddSymbol" class="selected-symbol-section">
              <div class="section-title">
                <a-icon type="check-circle" style="color: #52c41a; margin-right: 4px;" />
                {{ $t('dashboard.analysis.modal.addStock.selectedSymbol') }}
              </div>
              <div class="selected-symbol-info">
                <a-tag :color="getMarketColor(addSymbolMarket)" style="margin-right: 8px;">{{ addSymbolMarket }}</a-tag>
                <span class="symbol-code">{{ selectedAddSymbol.symbol }}</span>
                <span v-if="selectedAddSymbol.name" class="symbol-name">{{ selectedAddSymbol.name }}</span>
              </div>
            </div>
          </div>
        </a-modal>
      </a-tab-pane>
    </a-tabs>

    <exchange-account-modal
      :visible.sync="showExchangeAccountModal"
      @success="handleExchangeAccountCreated"
    />

    <a-modal
      :visible="showPublishTemplateModal"
      :title="$t('strategyCenter.publish.title')"
      :confirm-loading="publishingTemplate"
      @ok="submitPublishTemplate"
      @cancel="showPublishTemplateModal = false"
    >
      <a-form layout="vertical">
        <a-form-item :label="$t('strategyCenter.publish.name')">
          <a-input v-model="publishForm.name" />
        </a-form-item>
        <a-form-item :label="$t('strategyCenter.publish.description')">
          <a-textarea v-model="publishForm.description" :rows="3" />
        </a-form-item>
        <a-form-item :label="$t('strategyCenter.publish.pricingType')">
          <a-radio-group v-model="publishForm.pricingType">
            <a-radio value="free">{{ $t('community.free') }}</a-radio>
            <a-radio value="paid">{{ $t('community.paidOnly') }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="publishForm.pricingType === 'paid'" :label="$t('strategyCenter.publish.price')">
          <a-input-number v-model="publishForm.price" :min="0" :step="1" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { getStrategyList, getStrategyDetail, getScriptSourceList, getScriptSourceDetail, startStrategy, stopStrategy, deleteStrategy, updateStrategy, createStrategy, getStrategyEquityCurve, getStrategyPositions, batchCreateStrategies, batchStartStrategies, batchStopStrategies, batchDeleteStrategies, getStrategyBacktestHistory, publishStrategyTemplate, publishScriptSource, publishBotPreset } from '@/api/strategy'
import { getWatchlist, addWatchlist, searchSymbols, getHotSymbols } from '@/api/market'
import { listExchangeCredentials } from '@/api/credentials'
import { formatExchangeCredentialLabel } from '@/utils/exchangeCredential'
import { getNotificationSettings } from '@/api/user'
import { baseMixin } from '@/store/app-mixin'
import request from '@/utils/request'
import { loadEnabledMarketOptions, firstMarketValue } from '@/utils/marketModules'
import TradingRecords from './components/TradingRecords.vue'
import PositionRecords from './components/PositionRecords.vue'
import StrategyTypeSelector from './components/StrategyTypeSelector.vue'
import PerformanceAnalysis from './components/PerformanceAnalysis.vue'
import StrategyReviewReport from './components/StrategyReviewReport.vue'
import StrategyLogs from './components/StrategyLogs.vue'
import ExchangeAccountModal from '@/components/ExchangeAccountModal/ExchangeAccountModal.vue'
import { CROSS_SECTIONAL_INDICATOR_TEMPLATE } from '@/constants/crossSectionalIndicatorTemplate'

const CRYPTO_SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT',
  'XRP/USDT', 'DOGE/USDT', 'DOT/USDT', 'MATIC/USDT', 'AVAX/USDT',
  'LINK/USDT', 'UNI/USDT', 'LTC/USDT', 'ATOM/USDT', 'ETC/USDT'
]

const DEFAULT_NOTIFICATION_CHANNELS = ['browser', 'email']
const normalizeNotificationChannels = channels => (
  Array.isArray(channels) && channels.length ? channels : DEFAULT_NOTIFICATION_CHANNELS
)

// Crypto exchange options
const EXCHANGE_OPTIONS = [
  { value: 'binance', labelKey: 'binance' },
  { value: 'okx', labelKey: 'okx' },
  { value: 'bitget', labelKey: 'bitget' },
  { value: 'bybit', labelKey: 'bybit' },
  { value: 'coinbaseexchange', labelKey: 'coinbaseexchange' },
  { value: 'kraken', labelKey: 'kraken' },
  { value: 'kucoin', labelKey: 'kucoin' },
  { value: 'gate', labelKey: 'gate' }
]

// Traditional broker options (US stocks) - extensible for future brokers
const BROKER_OPTIONS = [
  { value: 'ibkr', labelKey: 'ibkr', name: 'Interactive Brokers' }
  // Future brokers can be added here:
  // { value: 'td', labelKey: 'td', name: 'TD Ameritrade' },
  // { value: 'schwab', labelKey: 'schwab', name: 'Charles Schwab' },
]

export default {
  name: 'TradingAssistant',
  mixins: [baseMixin],
  components: {
    TradingRecords,
    PositionRecords,
    StrategyTypeSelector,
    PerformanceAnalysis,
    StrategyReviewReport,
    StrategyLogs,
    ExchangeAccountModal
  },
  computed: {
    showAssistantGuide () {
      if (this.$route.meta && this.$route.meta.scriptStrategiesOnly) return false
      return !this.assistantGuideDismissed
    },
    pageTypeBanner () {
      if (this.isScriptStrategiesOnlyPage) {
        return {
          variant: 'script',
          badge: this.$t('trading-assistant.pageBanner.script.badge'),
          desc: this.$t('trading-assistant.pageBanner.script.desc')
        }
      }
      if (this.isIndicatorSignalOnlyPage) {
        return {
          variant: 'signal',
          badge: this.$t('trading-assistant.pageBanner.signal.badge'),
          desc: this.$t('trading-assistant.pageBanner.signal.desc')
        }
      }
      return null
    },
    createStrategyButtonLabel () {
      if (this.isScriptStrategiesOnlyPage) {
        return this.$t('trading-assistant.createScriptStrategy')
      }
      if (this.isIndicatorSignalOnlyPage) {
        return this.$t('trading-assistant.createIndicatorStrategy')
      }
      return this.$t('trading-assistant.createStrategy')
    },
    assistantGuideStorageKey () {
      const userId = this.$store.getters.userInfo?.id || 'guest'
      return `trading-assistant-guide-dismissed:${userId}`
    },
    strategyFormWrapClass () {
      const classes = ['strategy-form-modal']
      if (this.isMobile) classes.push('mobile-modal')
      if (this.isDarkTheme) classes.push('strategy-form-modal-dark')
      return classes.join(' ')
    },
    displayCurrentStep () {
      return this.currentStep
    },
    strategyFormLastStepIndex () {
      return this.strategyMode === 'script' ? 2 : 1
    },
    showStrategyFormNext () {
      return this.currentStep < this.strategyFormLastStepIndex
    },
    showStrategyFormSubmit () {
      return this.currentStep === this.strategyFormLastStepIndex
    },
    indicatorRiskMissingWarn () {
      if (!this.showFormModal || this.strategyMode === 'script') return false
      if (this.currentStep !== 0) return false
      const ind = this.selectedIndicator
      if (!ind || !ind.code) return false
      const r = this.buildRiskPositionFromIndicatorCode(ind.code)
      const hasSl = Number(r.stop_loss_pct) > 0
      const hasTp = Number(r.take_profit_pct) > 0
      const hasTrail = !!r.trailing_enabled && Number(r.trailing_stop_pct) > 0
      return !hasSl && !hasTp && !hasTrail
    },
    crossSectionalIndicatorWarn () {
      if (this.strategyMode === 'script' || this.csStrategyTypeUi !== 'cross_sectional') return false
      if (this.crossSectionalIndicatorCodeOverride) return false
      const ind = this.selectedIndicator
      if (!ind || !ind.code) return true
      return !String(ind.code).includes('scores')
    },
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    needsPassphrase () {
      // Exchanges that require passphrase
      return ['okx', 'okex', 'coinbaseexchange', 'kucoin', 'bitget'].includes(this.currentExchangeId)
    },
    // Check if current market uses IBKR (US Stock)
    isIBKRMarket () {
      return this.selectedMarketCategory === 'USStock'
    },
    // Check if current market uses any broker (not crypto exchange)
    isBrokerMarket () {
      return this.isIBKRMarket
    },
    // Filter exchange credentials based on market category
    filteredExchangeCredentials () {
      if (!this.exchangeCredentials || !Array.isArray(this.exchangeCredentials)) {
        return []
      }

      // Filter credentials based on market category
      return this.exchangeCredentials.filter(cred => {
        return this.isCredentialCompatible(cred)
      })
    },
    formattedExchangeOptions () {
      return EXCHANGE_OPTIONS.map(exchange => {
        let label = ''
        try {
          if (exchange.labelKey) {
            const translationKey = `trading-assistant.exchangeNames.${exchange.labelKey}`
            const translated = this.$t(translationKey)
            if (translated !== translationKey) {
              label = translated
            }
          }
        } catch (e) {
        }

        if (!label) {
          label = exchange.value.charAt(0).toUpperCase() + exchange.value.slice(1)
        }
        return {
          ...exchange,
          displayName: label
        }
      })
    },
    strategyInitialCapital () {
      const s = this.selectedStrategy
      if (!s) return null
      const raw = s.initial_capital != null && s.initial_capital !== ''
        ? s.initial_capital
        : (s.trading_config && s.trading_config.initial_capital != null && s.trading_config.initial_capital !== ''
          ? s.trading_config.initial_capital
          : null)
      if (raw == null) return null
      const n = parseFloat(raw)
      return isNaN(n) ? null : n
    },
    totalPnl () {
      if (this.currentEquity === null || !this.selectedStrategy || this.strategyInitialCapital == null) {
        return null
      }
      return this.currentEquity - this.strategyInitialCapital
    },
    totalPnlPercent () {
      if (this.totalPnl === null || this.strategyInitialCapital == null) {
        return null
      }
      if (this.strategyInitialCapital === 0) return 0
      return (this.totalPnl / this.strategyInitialCapital) * 100
    },
    getEquityColorClass () {
      if (this.totalPnl === null) return ''
      return this.totalPnl >= 0 ? 'text-success' : 'text-danger'
    },
    getPnlColorClass () {
      if (this.totalPnl === null) return ''
      return this.totalPnl >= 0 ? 'text-success' : 'text-danger'
    },
    isCryptoMarket () {
      // IMPORTANT: do not rely on form.getFieldValue for reactivity (Ant Form is not reactive).
      // Always depend on selectedMarketCategory to make UI reactive.
      const cat = this.selectedMarketCategory || 'Crypto'
      return String(cat).toLowerCase() === 'crypto'
    },
    isStockMarketCategory () {
      const cat = String(this.selectedMarketCategory || '').toLowerCase()
      return ['usstock', 'cnstock', 'hkstock'].includes(cat)
    },
    shouldShowMarketTypeSelector () {
      return !this.isStockMarketCategory
    },
    isSpotLikeMarket () {
      if (this.isStockMarketCategory || this.isAlpacaCryptoSpotOnly) {
        return true
      }
      try {
        return this.form && this.form.getFieldValue && this.form.getFieldValue('market_type') === 'spot'
      } catch (e) {
        return false
      }
    },
    isScriptRuntimeSpotOnly () {
      if (this.isStockMarketCategory || this.isAlpacaCryptoSpotOnly || this.isLongOnlyBroker) {
        return true
      }
      return this.scriptRuntimeMarketTypeUi === 'spot'
    },
    // Check if selected market supports live trading.
    canUseLiveTrading () {
      const cat = this.selectedMarketCategory || 'Crypto'
      if (String(cat).toLowerCase() === 'crypto') {
        return true
      }
      if (cat === 'USStock') {
        return true
      }
      return false
    },
    // Snapshot of the backend broker x market policy fetched at app boot
    // (see store/modules/policy.js).  Falls back to DEFAULT_POLICY when the
    // request hasn't returned yet, so first-paint still works.
    brokerMarketPolicy () {
      return this.$store.getters.brokerMarketPolicy || {}
    },
    // Brokers whose live execution path is long-only in QuantDinger today
    // (currently IBKR and Alpaca - their `_execute_*_order` paths reject
    // short signals).  When one of these is selected we lock trade_direction
    // to 'long' in the form so the user never builds a strategy that the
    // worker will refuse at runtime.
    isLongOnlyBroker () {
      const exchangeId = (this.currentExchangeId || '').toLowerCase()
      const longOnly = (this.brokerMarketPolicy.long_only_brokers || [])
        .map(s => String(s).toLowerCase())
      return longOnly.includes(exchangeId)
    },
    // Alpaca's crypto desk is spot-only (no perpetual swaps, no shorting).
    // Used by the strategy form to lock market_type=spot when the user picks
    // an Alpaca credential together with the Crypto market category.
    isAlpacaCryptoSpotOnly () {
      const exchangeId = (this.currentExchangeId || '').toLowerCase()
      const cat = (this.selectedMarketCategory || '').toLowerCase()
      return exchangeId === 'alpaca' && cat === 'crypto'
    },
    // Check if current market + exchange combination supports live trading
    isLiveTradingAvailable () {
      const cat = this.selectedMarketCategory || 'Crypto'
      const exchangeId = (this.currentExchangeId || '').toLowerCase()
      // Crypto markets use crypto exchanges OR Alpaca crypto desk.
      if (String(cat).toLowerCase() === 'crypto') {
        return [
          'binance', 'okx', 'bitget', 'bybit', 'coinbaseexchange',
          'kraken', 'kucoin', 'gate', 'htx', 'alpaca'
        ].includes(exchangeId)
      }
      // USStock uses IBKR (local TWS/Gateway) or Alpaca (REST).
      if (cat === 'USStock') {
        return this.currentBrokerId === 'ibkr' || exchangeId === 'ibkr' || exchangeId === 'alpaca'
      }
      return false
    },
    showDemoTradingSwitch () {
      return this.currentExchangeId && this.currentExchangeId.toLowerCase() === 'binance'
    },
    // Broker options for US stocks (with i18n support)
    brokerOptions () {
      return BROKER_OPTIONS.map(broker => {
        let label = ''
        try {
          const translationKey = `trading-assistant.brokerNames.${broker.labelKey}`
          const translated = this.$t(translationKey)
          if (translated !== translationKey) {
            label = translated
          }
        } catch (e) { }
        if (!label) {
          label = broker.name || broker.value.toUpperCase()
        }
        return {
          ...broker,
          displayName: label
        }
      })
    },
    // Crypto exchange options only
    cryptoExchangeOptions () {
      return EXCHANGE_OPTIONS.map(exchange => {
        let label = ''
        try {
          if (exchange.labelKey) {
            const translationKey = `trading-assistant.exchangeNames.${exchange.labelKey}`
            const translated = this.$t(translationKey)
            if (translated !== translationKey) {
              label = translated
            }
          }
        } catch (e) { }
        if (!label) {
          label = exchange.value.charAt(0).toUpperCase() + exchange.value.slice(1)
        }
        return {
          ...exchange,
          displayName: label
        }
      })
    },
    isScriptStrategiesOnlyPage () {
      return !!(this.$route.meta && this.$route.meta.scriptStrategiesOnly)
    },
    showStrategyListBacktest () {
      return false
    },
    showStrategyDetailBacktest () {
      return false
    },
    isIndicatorSignalOnlyPage () {
      return !!(this.$route.meta && this.$route.meta.indicatorSignalOnly)
    },
    modeSelectorVariant () {
      if (this.isScriptStrategiesOnlyPage) return 'script'
      return 'all'
    },
    strategiesForPage () {
      const list = this.strategies || []
      if (this.isIndicatorSignalOnlyPage) {
        return list.filter(s => s.strategy_mode !== 'script' && s.strategy_mode !== 'bot')
      }
      if (this.isScriptStrategiesOnlyPage) {
        return list.filter(s => s.strategy_mode === 'script')
      }
      return list.filter(s => s.strategy_mode !== 'bot')
    },
    groupedStrategies () {
      if (this.groupByMode === 'symbol') {
        return this.groupedBySymbol
      }
      return this.groupedByStrategy
    },
    groupedByStrategy () {
      const groups = {}
      const ungrouped = []

      for (const s of this.strategiesForPage) {
        const groupId = s.strategy_group_id
        if (groupId && groupId.trim()) {
          if (!groups[groupId]) {
            groups[groupId] = {
              id: groupId,
              baseName: s.group_base_name || s.strategy_name.split('-')[0],
              strategies: [],
              runningCount: 0,
              stoppedCount: 0
            }
          }
          groups[groupId].strategies.push(s)
          if (s.status === 'running') {
            groups[groupId].runningCount++
          } else {
            groups[groupId].stoppedCount++
          }
        } else {
          ungrouped.push(s)
        }
      }

      const groupList = Object.values(groups).sort((a, b) => {
        const aTime = Math.max(...a.strategies.map(s => s.created_at || 0))
        const bTime = Math.max(...b.strategies.map(s => s.created_at || 0))
        return bTime - aTime
      })

      return { groups: groupList, ungrouped }
    },
    groupedBySymbol () {
      const groups = {}
      const ungrouped = []

      for (const s of this.strategiesForPage) {
        const tc = s.trading_config || {}
        const symbol = tc.symbol
        if (symbol && symbol.trim()) {
          if (!groups[symbol]) {
            groups[symbol] = {
              id: `symbol_${symbol}`,
              baseName: symbol,
              strategies: [],
              runningCount: 0,
              stoppedCount: 0
            }
          }
          const strategyInfo = {
            ...s,
            displayInfo: {
              strategyName: s.strategy_name || s.group_base_name || 'Unnamed',
              timeframe: tc.timeframe || '-',
              indicatorName: s.indicator_name || (s.indicator_config && s.indicator_config.name) || '-'
            }
          }
          groups[symbol].strategies.push(strategyInfo)
          if (s.status === 'running') {
            groups[symbol].runningCount++
          } else {
            groups[symbol].stoppedCount++
          }
        } else {
          ungrouped.push(s)
        }
      }

      const groupList = Object.values(groups).sort((a, b) => {
        return a.baseName.localeCompare(b.baseName)
      })

      return { groups: groupList, ungrouped }
    },
    // Check if selected channels are configured in user profile
    unconfiguredChannels () {
      const missing = []
      if (this.notifyChannelsUi.includes('telegram')) {
        // Check if telegram token or chat id is missing
        if (!this.userNotificationSettings.telegram_bot_token && !this.userNotificationSettings.telegram_chat_id) {
          missing.push('Telegram')
        }
      }
      if (this.notifyChannelsUi.includes('email')) {
        if (!this.userNotificationSettings.email) {
          missing.push('Email')
        }
      }
      if (this.notifyChannelsUi.includes('discord')) {
        if (!this.userNotificationSettings.discord_webhook) {
          missing.push('Discord')
        }
      }
      if (this.notifyChannelsUi.includes('webhook')) {
        if (!this.userNotificationSettings.webhook_url) {
          missing.push('Webhook')
        }
      }
      // Phone/SMS check if needed
      // if (this.notifyChannelsUi.includes('phone') && !this.userNotificationSettings.phone) { ... }

      return missing
    },
    isScriptStrategySelected () {
      const s = this.selectedStrategy
      if (!s) return false
      return s.strategy_mode === 'script' || s.strategy_type === 'ScriptStrategy'
    },
    scriptSourceOptions () {
      return (this.scriptSources || [])
        .map(s => {
          const pieces = [s.name || s.strategy_name || `Script #${s.id}`]
          return { ...s, optionLabel: pieces.join(' - ') }
        })
    },
    selectedScriptSourcePreview () {
      const id = String(this.selectedScriptSourceId || '')
      if (!id) return null
      return (this.scriptSourceOptions || []).find(item => String(item.id) === id) || null
    },
  },
  watch: {
    '$route.path' (to, from) {
      if (!from || to === from) return
      this.selectedStrategy = null
      this.loadStrategies()
    },
    '$route.query': {
      handler (q) {
        if (q && String(q.tab) === 'strategy') {
          this.topTab = 'strategy'
        }
      },
      deep: true
    },
    detailTab (tab) {
      if (tab === 'backtest' && !this.showStrategyDetailBacktest) {
        this.detailTab = 'positions'
      }
    }
  },
  data () {
    return {
      topTab: 'strategy',
      loading: false,
      loadingRecords: false,
      strategies: [],
      selectedStrategy: null,
      detailTab: 'positions',
      strategyHasBacktest: false,
      showPublishTemplateModal: false,
      publishingTemplate: false,
      publishForm: {
        name: '',
        description: '',
        pricingType: 'free',
        price: 0
      },
      showFormModal: false,
      investmentAmountMin: 10,
      investmentAmountMax: 1000000,
      pendingRouteIndicatorId: '',
      lastAutoStrategyName: '',
      lastAutoScriptStrategyName: '',
      scriptTemplateKeyForPayload: '',
      selectedScriptTemplateParams: {},
      scriptRuntimeMarketTypeUi: 'swap',
      // Strategy mode: 'signal' (indicator-based) or 'script' (code-based)
      strategyMode: '',
      strategyCode: '',
      scriptSources: [],
      pendingScriptTemplateKey: '',
      selectedScriptSourceId: '',
      loadingScriptSource: false,
      showModeSelector: false,
      // Only indicator strategy in local mode
      strategyType: 'indicator',
      selectedMarketCategory: 'Crypto', // USStock / Crypto / Forex / Futures
      currentStep: 0,
      saving: false,
      loadingIndicators: false,
      availableIndicators: [],
      selectedIndicator: null,
      indicatorParams: [], // 闂傚倸鍊风粈浣革耿闁秮鈧箓宕煎婵囨そ閺佸啴宕掑☉妯瑰嚱闂備焦瀵х换鍌炈囬鐐村剹婵°倕鎳忛悡鏇㈡倶閻愭彃鈷旈柍顖涙礃缁绘盯宕奸敐鍡欍€愬銈庡幖濞尖€崇暦閻戠瓔鏁囬柣鎴濇濮ｅ绻?
      indicatorParamValues: {}, // 闂傚倸鍊烽悞锕€顪冮崹顕呯劷闁秆勵殔缁€澶屸偓骞垮劚椤︻垶寮伴妷锔剧闁瑰鍋熼。鎻掆攽椤栨哎鍋㈤柡灞剧洴楠炴ê螖閳ь剟骞婅箛娑欏€垫い鎾卞灪閳锋垶鎱ㄩ悷鐗堟悙濠碘€炽偢閹顫濋悡搴☆潻濡炪倖娲╃紞渚€銆佸Δ鍛妞ゆ劧绲块埀顒夊墴濮婃椽宕崟鍨︾紓浣靛姂娴滆泛鐣?      cryptoSymbols: CRYPTO_SYMBOLS,
      // Watchlist symbols (same source as indicator-analysis page)
      loadingWatchlist: false,
      watchlist: [],
      exchangeOptions: EXCHANGE_OPTIONS,
      currentExchangeId: '',
      currentBrokerId: 'ibkr',
      connectionTestResult: null,
      indicatorsLoaded: false, // 闂傚倸鍊风粈渚€骞栭銈囩煋闁哄鍤氬ú顏勭厸闁告粈鐒﹂弲鈺呮⒑閹肩偛鍔撮柛鎾寸懅缁粯瀵肩€涙鍘遍梺闈涱檧缁茶姤淇婇崸妤佺厱闁靛鍎崑銏ゆ煛瀹€瀣瘈鐎规洜鍠栧Λ鍐ㄢ槈濮橆偄鎽嬮梻鍌欐祰椤曟牠宕归婊呯焼濞撴埃鍋撴い銏＄懆缁犳稑鈽夊Ο纰卞斀闂備礁婀遍崕銈夊春閸繍鐒介梺顒€绉甸悡?      editingStrategy: null, // 婵犵數濮甸鏍窗濡ゅ啯宕查柟閭﹀枛缁躲倝鏌﹀Ο渚闁肩増瀵ч妵鍕疀閹炬惌妫ょ紒鎯у綖缁瑩寮婚垾鎰佸悑閹肩补鈧剚娼鹃梺姹囧焺閸ㄦ澘螞濠靛钃熼柨婵嗩槸鎯熼梺闈涱槶閸庣儤瀵奸埀顒勬⒒娴ｅ壊鍚旈柡澶婄仢婵箓姊?      currentEquity: null, // 闂備浇宕甸崰鎰垝鎼淬垺娅犳俊銈呮噹缁犱即鏌涘☉姗堟敾婵炲懐濞€閺岋絽螣濞嗘儳娈紓浣插亾闁告洦鍨遍悡鍐喐濠婂牆绀堥柣鏃堫棑閺?      equityPollingTimer: null, // 闂傚倸鍊风粈渚€骞夐敓鐘插瀭闁绘梻鍘х壕濠氭煙閸撗呭笡闁绘挻娲栭埞鎴︽偐閸欏娅ｅ銈冨劚缁夊綊寮婚敐澶娢ч柛娑卞櫘濡倝姊鸿ぐ鎺濇濠电偐鍋撴繝娈垮枓閸嬫捇姊虹紒妯忣亪鎮樺顑帗鎯旈妸锔规嫼闂佸憡绻傜€氼剟寮抽姀锛勭濠㈣泛顑囬埥澶愭煃?
      aiFilterEnabledUi: false,
      isEditMode: false, // 闂傚倸鍊风粈渚€骞栭銈傚亾濮樺崬鍘寸€规洝顫夌€靛ジ寮堕幋鐘垫毎濠电偠鎻徊钘夛耿闁秴鐓濋柡鍐ㄧ墛閻擄綁鐓崶銊﹀鞍閻犳劏鍓濇穱濠囨倷閹殿喚鐓撻悗娈垮枛閻栫厧鐣锋總鍛婂亜濡炲绨煎鎾绘⒑閻撳海浜柡鍛箞閸┾偓?      supportedIPs: [], // 闂傚倸鍊峰ù鍥儍椤愶箑骞㈡慨妤€妫欓ˉ澶愭⒒娴ｇ瓔鍤冮柛鐘愁殔鐓ら柣鏃堫棑閺嗭箓鏌ㄩ悢鍝勑㈢紒顐㈢Ф缁辨挸顓兼惔婵嬪仐闂佸搫鏈惄顖炵嵁閹烘绠奸柛鎰ㄦ櫇閺嗩垶姊?
      cryptoSymbols: CRYPTO_SYMBOLS,
      editingStrategy: null,
      currentEquity: null,
      equityPollingTimer: null,
      supportedIPs: [],
      executionModeUi: 'live',
      liveDisclaimerAckUi: false,
      notifySectionExpanded: true,
      notifyChannelsUi: [...DEFAULT_NOTIFICATION_CHANNELS],
      // User's notification settings from profile
      userNotificationSettings: {
        default_channels: [...DEFAULT_NOTIFICATION_CHANNELS],
        telegram_bot_token: '',
        telegram_chat_id: '',
        email: '',
        phone: '',
        discord_webhook: '',
        webhook_url: '',
        webhook_token: ''
      },
      // Exchange credentials vault
      loadingExchangeCredentials: false,
      exchangeCredentials: [],
      showExchangeAccountModal: false,
      saveCredentialUi: false,
      suppressApiClearOnce: false,
      selectedSymbols: [],
      crossSectionalSymbols: [],
      csStrategyTypeUi: 'single',
      crossSectionalIndicatorCodeOverride: null,
      collapsedGroups: {},
      groupByMode: 'strategy',
      showAddSymbolModal: false,
      addSymbolMarket: 'Crypto',
      addSymbolMarketTypes: [],
      addSymbolKeyword: '',
      searchingSymbol: false,
      symbolSearchResults: [],
      selectedAddSymbol: null,
      hasSearchedSymbol: false,
      addingSymbol: false,
      hotSymbols: [],
      loadingHotSymbols: false,
      searchTimer: null,
      assistantGuideDismissed: false
      // Market category is inferred from Step 1 watchlist symbol ("Market:SYMBOL").
    }
  },
  beforeCreate () {
    this.form = this.$form.createForm(this)
  },
  async mounted () {
    this.restoreAssistantGuidePreference()
    if (this.isScriptStrategiesOnlyPage) {
      this.topTab = 'strategy'
    }
    if (this.$route.query.tab === 'strategy' || this.$route.query.mode === 'create') {
      this.topTab = 'strategy'
    }
    await this.loadMarketModules()
    this.loadStrategies()
    this.loadUserNotificationSettings()

    if (this.$route.query.mode === 'create') {
      this.$nextTick(() => {
        if (this.isScriptStrategiesOnlyPage) {
          this.strategyMode = 'script'
          this.pendingScriptTemplateKey = ''
          this.selectedScriptSourceId = this.$route.query.source_id ? String(this.$route.query.source_id) : ''
          this._openCreateModal()
          return
        }
        const indicatorId = this.$route.query.indicator_id
        if (indicatorId) {
          this.strategyMode = 'signal'
          this.pendingRouteIndicatorId = String(indicatorId)
          this._openCreateModal()
        } else if (this.isIndicatorSignalOnlyPage) {
          this.strategyMode = 'signal'
          this._openCreateModal()
        } else {
          this.handleCreateStrategy()
        }
      })
    }
  },
  beforeDestroy () {
    this.stopEquityPolling()
  },
  methods: {
    investmentAmountRangeMessage () {
      return this.$t('trading-assistant.validation.initialCapitalRange') || 'Investment amount must be between 10 and 1,000,000'
    },
    isValidInvestmentAmount (value) {
      const amount = Number(value)
      return Number.isFinite(amount) && amount >= this.investmentAmountMin && amount <= this.investmentAmountMax
    },
    validateInvestmentAmount (rule, value, callback) {
      if (this.isValidInvestmentAmount(value)) {
        callback()
        return
      }
      callback(new Error(this.investmentAmountRangeMessage()))
    },
    isScriptStrategy (strategy) {
      const type = String(strategy?.strategy_type || strategy?.strategyType || '').toLowerCase()
      const mode = String(strategy?.strategy_mode || strategy?.strategyMode || '').toLowerCase()
      return type === 'scriptstrategy' || mode === 'script' || mode === 'bot'
    },
    async loadMarketModules () {
      const options = await loadEnabledMarketOptions({ includeFeatures: ['research'] })
      this.addSymbolMarketTypes = options
      const values = options.map(item => item.value)
      if (!values.includes(this.addSymbolMarket)) {
        this.addSymbolMarket = firstMarketValue(options)
      }
      if (!values.includes(this.selectedMarketCategory)) {
        this.selectedMarketCategory = this.addSymbolMarket || firstMarketValue(options)
        this.applyMarketDefaultsForCategory(this.selectedMarketCategory)
      }
    },
    restoreAssistantGuidePreference () {
      try {
        this.assistantGuideDismissed = window.localStorage.getItem(this.assistantGuideStorageKey) === '1'
      } catch (e) {
        this.assistantGuideDismissed = false
      }
    },
    dismissAssistantGuide () {
      this.assistantGuideDismissed = true
      try {
        window.localStorage.setItem(this.assistantGuideStorageKey, '1')
      } catch (e) {}
    },
    goToStrategyTab () {
      this.topTab = 'strategy'
    },
    openCreateStrategyFromGuide () {
      this.topTab = 'strategy'
      this.$nextTick(() => {
        this.handleCreateStrategy()
      })
    },
    async loadUserNotificationSettings () {
      // Load user's default notification settings from profile
      try {
        const res = await getNotificationSettings()
        if (res.code === 1 && res.data) {
          this.userNotificationSettings = {
            default_channels: normalizeNotificationChannels(res.data.default_channels),
            telegram_bot_token: res.data.telegram_bot_token || '',
            telegram_chat_id: res.data.telegram_chat_id || '',
            email: res.data.email || '',
            phone: res.data.phone || '',
            discord_webhook: res.data.discord_webhook || '',
            webhook_url: res.data.webhook_url || '',
            webhook_token: res.data.webhook_token || ''
          }
        }
      } catch (e) {
        // Silently fail, use default values
      }
    },
    async loadWatchlist () {
      this.loadingWatchlist = true
      try {
        const res = await getWatchlist({ userid: 1 })
        if (res && res.code === 1) {
          this.watchlist = Array.isArray(res.data) ? res.data : []
        } else {
          this.watchlist = []
        }
      } catch (e) {
        this.watchlist = []
      } finally {
        this.loadingWatchlist = false
      }
    },
    handleCloseAddSymbolModal () {
      this.showAddSymbolModal = false
      this.addSymbolKeyword = ''
      this.symbolSearchResults = []
      this.selectedAddSymbol = null
      this.hasSearchedSymbol = false
    },
    handleAddSymbolMarketChange (market) {
      this.addSymbolMarket = market
      this.addSymbolKeyword = ''
      this.symbolSearchResults = []
      this.selectedAddSymbol = null
      this.hasSearchedSymbol = false
      this.loadHotSymbols(market)
    },
    handleSymbolSearchInputChange (e) {
      const keyword = e.target.value
      this.addSymbolKeyword = keyword

      if (this.searchTimer) {
        clearTimeout(this.searchTimer)
      }

      if (!keyword || keyword.trim() === '') {
        this.symbolSearchResults = []
        this.hasSearchedSymbol = false
        this.selectedAddSymbol = null
        return
      }

      this.searchTimer = setTimeout(() => {
        this.searchSymbolsInModal(keyword)
      }, 500)
    },
    async handleSearchSymbol (keyword) {
      if (!keyword || !keyword.trim()) {
        return
      }

      if (!this.addSymbolMarket) {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
        return
      }

      if (this.symbolSearchResults.length > 0) {
        return
      }

      if (this.hasSearchedSymbol && this.symbolSearchResults.length === 0) {
        this.handleDirectAdd()
      } else {
        this.searchSymbolsInModal(keyword)
      }
    },
    async searchSymbolsInModal (keyword) {
      if (!keyword || keyword.trim() === '') {
        this.symbolSearchResults = []
        this.hasSearchedSymbol = false
        return
      }

      if (!this.addSymbolMarket) {
        return
      }

      this.searchingSymbol = true
      this.hasSearchedSymbol = true

      try {
        const res = await searchSymbols({
          market: this.addSymbolMarket,
          keyword: keyword.trim()
        })
        if (res && res.code === 1 && Array.isArray(res.data)) {
          this.symbolSearchResults = res.data
        } else {
          this.symbolSearchResults = []
        }
      } catch (e) {
        this.symbolSearchResults = []
      } finally {
        this.searchingSymbol = false
      }
    },
    handleDirectAdd () {
      if (!this.addSymbolKeyword || !this.addSymbolKeyword.trim()) {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseEnterSymbol'))
        return
      }

      if (!this.addSymbolMarket) {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
        return
      }

      this.selectedAddSymbol = {
        market: this.addSymbolMarket,
        symbol: this.addSymbolKeyword.trim().toUpperCase(),
        name: '' // 闂傚倸鍊风粈渚€骞夐敓鐘冲殞闁告挆鍛厠闂佽鍨辨竟瀣矗閸ф鈷掑ù锝呮贡濠€浠嬫煕閵娧勫殌闁伙絿鍏橀、妤呭礋椤愩倗鏆繝寰锋澘鈧洟宕导鏉戠婵﹩鍘规禍婊堟煛瀹ュ骸浜滃ù婊冪秺閺屾稓鈧綆鍋呯亸顓熴亜椤愶絿绠撻柣锝囧厴瀹曞爼鍩￠崘鈺傜槖API闂傚倸鍊风粈渚€宕ョ€ｎ喖纾块柟鎯版鎼村﹪鏌ら懝鎵牚濞?
      }
    },
    handleSelectAddSymbol (item) {
      this.selectedAddSymbol = {
        market: this.addSymbolMarket,
        symbol: item.symbol,
        name: item.name || ''
      }
    },
    async loadHotSymbols (market) {
      if (!market) {
        market = this.addSymbolMarket || 'Crypto'
      }

      if (!market) {
        return
      }

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
    async handleConfirmAddSymbol () {
      let market = ''
      let symbol = ''

      if (this.selectedAddSymbol) {
        market = this.selectedAddSymbol.market
        symbol = this.selectedAddSymbol.symbol.toUpperCase()
      } else if (this.addSymbolKeyword && this.addSymbolKeyword.trim()) {
        if (!this.addSymbolMarket) {
          this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectMarket'))
          return
        }
        market = this.addSymbolMarket
        symbol = this.addSymbolKeyword.trim().toUpperCase()
      } else {
        this.$message.warning(this.$t('dashboard.analysis.modal.addStock.pleaseSelectOrEnterSymbol'))
        return
      }

      this.addingSymbol = true
      try {
        const res = await addWatchlist({
          userid: 1,
          market: market,
          symbol: symbol
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.analysis.message.addStockSuccess'))
          await this.loadWatchlist()
          const newValue = `${market}:${symbol}`
          if (this.isEditMode) {
            this.form.setFieldsValue({ symbol: newValue })
            this.handleWatchlistSymbolChange(newValue)
          } else if (this.csStrategyTypeUi === 'cross_sectional') {
            if (!this.crossSectionalSymbols.includes(newValue)) {
              this.crossSectionalSymbols = [...this.crossSectionalSymbols, newValue]
            }
            this.handleCrossSectionalSymbolChange(this.crossSectionalSymbols)
          } else {
            if (!this.selectedSymbols.includes(newValue)) {
              this.selectedSymbols = [...this.selectedSymbols, newValue]
            }
            this.handleMultiSymbolChange(this.selectedSymbols)
          }
          this.handleCloseAddSymbolModal()
        } else {
          this.$message.error(res?.msg || this.$t('dashboard.analysis.message.addStockFailed'))
        }
      } catch (e) {
        const errorMsg = e?.response?.data?.msg || e?.message || this.$t('dashboard.analysis.message.addStockFailed')
        this.$message.error(errorMsg)
      } finally {
        this.addingSymbol = false
      }
    },
    filterWatchlistOption (input, option) {
      const value = option.componentOptions?.propsData?.value || ''
      if (value === '__add_symbol_option__') return true
      return String(value).toLowerCase().includes(String(input || '').toLowerCase())
    },
    filterWatchlistOptionWithAdd (input, option) {
      const value = option.componentOptions?.propsData?.value || ''
      if (value === '__add_symbol_option__') return true
      return String(value).toLowerCase().includes(String(input || '').toLowerCase())
    },
    handleMultiSymbolChangeWithAdd (vals) {
      if (vals && vals.includes('__add_symbol_option__')) {
        this.selectedSymbols = vals.filter(v => v !== '__add_symbol_option__')
        this.showAddSymbolModal = true
        this.loadHotSymbols(this.addSymbolMarket)
        return
      }
      this.handleMultiSymbolChange(vals)
    },
    handleStrategyTypeChange (e) {
      const strategyType = e && e.target ? e.target.value : e
      this.csStrategyTypeUi = strategyType || 'single'
      if (strategyType === 'single') {
        this.crossSectionalSymbols = []
        this.crossSectionalIndicatorCodeOverride = null
      } else if (strategyType === 'cross_sectional') {
        this.selectedSymbols = []
      }
    },
    insertCrossSectionalIndicatorTemplate () {
      this.crossSectionalIndicatorCodeOverride = CROSS_SECTIONAL_INDICATOR_TEMPLATE
      this.$message.success(this.$t('trading-assistant.form.crossSectionalTemplateApplied'))
    },
    isCrossSectionalStrategy (strategy) {
      const tc = (strategy && strategy.trading_config) || {}
      return (tc.cs_strategy_type || '') === 'cross_sectional'
    },
    handleCrossSectionalSymbolChange (vals) {
      if (vals && vals.includes('__add_symbol_option__')) {
        this.crossSectionalSymbols = vals.filter(v => v !== '__add_symbol_option__')
        this.showAddSymbolModal = true
        this.loadHotSymbols(this.addSymbolMarket)
        return
      }
      this.crossSectionalSymbols = vals || []

      if (vals && vals.length > 0) {
        const firstVal = vals[0]
        if (typeof firstVal === 'string' && firstVal.includes(':')) {
          const idx = firstVal.indexOf(':')
          const market = firstVal.slice(0, idx)
          this.selectedMarketCategory = market || 'Crypto'
          this.applyMarketDefaultsForCategory(this.selectedMarketCategory)
        }
      }
    },
    getMarketColor (market) {
      const colors = {
        USStock: 'green',
        Crypto: 'purple',
        Forex: 'gold',
        Futures: 'cyan'
      }
      return colors[market] || 'default'
    },
    safeSetFormFields (values) {
      if (!this.form || !this.form.setFieldsValue || !values || typeof values !== 'object') {
        return
      }
      const nextValues = {}
      Object.keys(values).forEach(key => {
        try {
          if (!this.form.getFieldInstance || this.form.getFieldInstance(key)) {
            nextValues[key] = values[key]
          }
        } catch (e) { }
      })
      if (Object.keys(nextValues).length > 0) {
        this.form.setFieldsValue(nextValues)
      }
    },
    applyMarketDefaultsForCategory (marketCategory) {
      const cat = String(marketCategory || this.selectedMarketCategory || '').toLowerCase()
      const isStock = ['usstock', 'cnstock', 'hkstock'].includes(cat)
      if (!isStock) {
        this.scriptRuntimeMarketTypeUi = 'swap'
        return
      }
      this.scriptRuntimeMarketTypeUi = 'spot'
      const patch = {
        leverage: 1,
        trade_direction: 'long'
      }
      if (this.shouldShowMarketTypeSelector) {
        patch.market_type = 'spot'
      }
      this.safeSetFormFields(patch)
    },
    normalizeMarketExecutionFields (marketCategory, values) {
      const cat = String(marketCategory || '').toLowerCase()
      const isStock = ['usstock', 'cnstock', 'hkstock'].includes(cat)
      let marketType = ((values && values.market_type) === 'futures'
        ? 'swap'
        : ((values && values.market_type) || 'swap'))
      let leverage = values && values.leverage != null ? values.leverage : 5
      let tradeDirection = (values && values.trade_direction) || (isStock ? 'long' : 'both')

      if (isStock) {
        return {
          marketType: 'spot',
          leverage: 1,
          tradeDirection: 'long'
        }
      }
      if (this.isAlpacaCryptoSpotOnly && marketType !== 'spot') {
        marketType = 'spot'
      }
      if (marketType === 'spot') {
        leverage = 1
        tradeDirection = 'long'
      } else {
        if (leverage < 1) leverage = 1
        if (leverage > 125) leverage = 125
      }
      if (this.isLongOnlyBroker) {
        tradeDirection = 'long'
      }
      return { marketType, leverage, tradeDirection }
    },
    handleWatchlistSymbolChange (val) {
      if (val === '__add_symbol_option__') {
        this.$nextTick(() => {
          this.form.setFieldsValue({ symbol: undefined })
        })
        this.showAddSymbolModal = true
        this.loadHotSymbols(this.addSymbolMarket)
        return
      }
      // val format: "Market:SYMBOL" (same as indicator-analysis page)
      if (!val || typeof val !== 'string' || !val.includes(':')) {
        return
      }
      const idx = val.indexOf(':')
      const market = val.slice(0, idx)
      // Keep selection reactive for Step 3 execution gating
      this.selectedMarketCategory = market || 'Crypto'
      this.applyMarketDefaultsForCategory(this.selectedMarketCategory)

      // Auto-set broker ID based on market category
      if (this.selectedMarketCategory === 'USStock') {
        this.currentBrokerId = 'ibkr'
        try {
          this.form && this.form.setFieldsValue && this.form.setFieldsValue({ broker_id: 'ibkr' })
        } catch (e) { }
      }

      // Markets without live trading support: force back to signal mode
      const supportsLiveTrading = ['Crypto', 'USStock'].includes(this.selectedMarketCategory)
      if (!supportsLiveTrading) {
        this.executionModeUi = 'signal'
        try {
          this.form && this.form.setFieldsValue && this.form.setFieldsValue({ execution_mode: 'signal' })
        } catch (e) { }
      }

      // Clear exchange selection when market changes (different markets use different exchanges)
      this.currentExchangeId = ''
      try {
        this.form && this.form.setFieldsValue && this.form.setFieldsValue({ exchange_id: undefined })
      } catch (e) { }
    },
    handleSimpleSymbolChange (val) {
      if (val === '__add_symbol_option__') {
        this.showAddSymbolModal = true
        this.loadHotSymbols(this.addSymbolMarket)
        return
      }
      const values = val ? [val] : []
      this.handleMultiSymbolChange(values)
    },
    handleMultiSymbolChange (vals) {
      // vals: array like ["Crypto:BTC/USDT", "Crypto:ETH/USDT"]
      this.selectedSymbols = vals || []

      // Update market type based on selected symbols
      if (vals && vals.length > 0) {
        const firstVal = vals[0]
        if (typeof firstVal === 'string' && firstVal.includes(':')) {
          const idx = firstVal.indexOf(':')
          const market = firstVal.slice(0, idx)
          this.selectedMarketCategory = market || 'Crypto'
          this.applyMarketDefaultsForCategory(this.selectedMarketCategory)
        }
      }

      // Auto-set broker ID based on market category
      if (this.selectedMarketCategory === 'USStock') {
        this.currentBrokerId = 'ibkr'
        try {
          this.form && this.form.setFieldsValue && this.form.setFieldsValue({ broker_id: 'ibkr' })
        } catch (e) { }
      }

      // Markets without live trading support: force back to signal mode
      const supportsLiveTrading = ['Crypto', 'USStock'].includes(this.selectedMarketCategory)
      if (!supportsLiveTrading) {
        this.executionModeUi = 'signal'
        try {
          this.form && this.form.setFieldsValue && this.form.setFieldsValue({ execution_mode: 'signal' })
        } catch (e) { }
      }

      // Clear exchange selection when market changes
      this.currentExchangeId = ''
      try {
        this.form && this.form.setFieldsValue && this.form.setFieldsValue({ exchange_id: undefined })
      } catch (e) { }
    },
    async loadExchangeCredentials () {
      this.loadingExchangeCredentials = true
      try {
        const res = await listExchangeCredentials({ user_id: 1 })
        if (res && res.code === 1) {
          this.exchangeCredentials = (res.data && res.data.items) || []
        } else {
          this.exchangeCredentials = []
          this.$message.warning(res?.msg || this.$t('trading-assistant.messages.loadFailed'))
        }
      } catch (e) {
        this.exchangeCredentials = []
        this.$message.warning(this.$t('trading-assistant.exchange.testFailed'))
      } finally {
        this.loadingExchangeCredentials = false
      }
    },
    goToIndicatorAnalysisCreate () {
      this.$router.push('/indicator-analysis')
    },
    async handleExchangeAccountCreated (data) {
      await this.loadExchangeCredentials()
      const newId = data && (data.id || data.credential_id)
      if (newId) {
        try {
          this.form && this.form.setFieldsValue && this.form.setFieldsValue({ credential_id: newId })
        } catch (e) { }
        await this.handleCredentialSelectChange(newId)
      } else if (this.exchangeCredentials.length === 1) {
        const id = this.exchangeCredentials[0].id
        try {
          this.form && this.form.setFieldsValue && this.form.setFieldsValue({ credential_id: id })
        } catch (e) { }
        await this.handleCredentialSelectChange(id)
      }
    },
    formatCredentialLabel (cred) {
      return formatExchangeCredentialLabel(cred)
    },
    // Check if credential is compatible with current market category.
    //
    // Reads the broker x market matrix from the backend policy snapshot
    // (store/modules/policy.js) so the UI never drifts from the worker's
    // own validation in `broker_market_policy.validate_strategy_config`.
    // Default-deny on unknown brokers: a misconfigured row should fail in
    // the form, not at live-execution time.
    isCredentialCompatible (cred) {
      if (!cred || !cred.exchange_id) return true

      const exchangeId = (cred.exchange_id || '').toLowerCase()
      const marketCategory = this.selectedMarketCategory || 'Crypto'

      const matrix = (this.brokerMarketPolicy && this.brokerMarketPolicy.broker_markets) || {}
      const supported = matrix[exchangeId]
      if (!supported) return false
      return Object.prototype.hasOwnProperty.call(supported, marketCategory)
    },
    buildLiveExchangeConfig (values) {
      if (values.credential_id) {
        return {
          credential_id: values.credential_id,
          exchange_id: this.currentExchangeId || undefined
        }
      }
      if (this.isIBKRMarket) {
        return {
          exchange_id: values.broker_id || this.currentBrokerId || 'ibkr',
          ibkr_host: values.ibkr_host || '127.0.0.1',
          ibkr_port: values.ibkr_port || 7497,
          ibkr_client_id: values.ibkr_client_id || 1,
          ibkr_account: values.ibkr_account || ''
        }
      }
      return {
        credential_id: values.credential_id,
        exchange_id: this.currentExchangeId || undefined
      }
    },
    async handleCredentialSelectChange (credentialId) {
      // Selecting a saved credential updates the exchange_id UI state.
      // API keys are NOT stored in form fields 闂?they live only in the credentials vault.
      if (!credentialId) {
        this.currentExchangeId = ''
        this.connectionTestResult = null
        return
      }

      // Find credential in local list to get exchange_id for UI display
      const localCred = this.exchangeCredentials.find(c => String(c.id) === String(credentialId))
      if (localCred) {
        const exchangeId = (localCred.exchange_id || '').toLowerCase()

        // Validate IBKR can only be used for USStock
        if (exchangeId === 'ibkr' && this.selectedMarketCategory !== 'USStock') {
          this.$message.error(this.$t('trading-assistant.validation.ibkrOnlyForUSStock'))
          // Clear the selection
          try {
            this.form && this.form.setFieldsValue && this.form.setFieldsValue({ credential_id: undefined })
          } catch (e) { }
          this.currentExchangeId = ''
          this.connectionTestResult = null
          return
        }

        // Validate Alpaca: USStock or Crypto
        if (exchangeId === 'alpaca' && !['USStock', 'Crypto'].includes(this.selectedMarketCategory)) {
          this.$message.error(
            this.$t('trading-assistant.validation.alpacaOnlyForUSStockOrCrypto') ||
            'Alpaca supports US stocks and Crypto only.'
          )
          try {
            this.form && this.form.setFieldsValue && this.form.setFieldsValue({ credential_id: undefined })
          } catch (e) { }
          this.currentExchangeId = ''
          this.connectionTestResult = null
          return
        }

        // Validate crypto exchanges can only be used for Crypto
        const cryptoExchanges = ['binance', 'okx', 'bitget', 'bybit', 'coinbaseexchange', 'kraken', 'kucoin', 'gate', 'htx']
        if (cryptoExchanges.includes(exchangeId) && this.selectedMarketCategory !== 'Crypto') {
          this.$message.error(this.$t('trading-assistant.validation.cryptoExchangeOnlyForCrypto'))
          // Clear the selection
          try {
            this.form && this.form.setFieldsValue && this.form.setFieldsValue({ credential_id: undefined })
          } catch (e) { }
          this.currentExchangeId = ''
          this.connectionTestResult = null
          return
        }

        this.currentExchangeId = localCred.exchange_id || ''

        // Long-only brokers (IBKR / Alpaca): force trade_direction to 'long' so
        // the strategy never produces signals that the worker rejects. This
        // mirrors the backend `validate_strategy_config` long-only rule.
        if (exchangeId === 'ibkr' || exchangeId === 'alpaca') {
          try {
            const current = this.form && this.form.getFieldValue && this.form.getFieldValue('trade_direction')
            if (current && String(current).toLowerCase() !== 'long') {
              this.safeSetFormFields({ trade_direction: 'long' })
              this.$message.info(
                this.$t('trading-assistant.form.longOnlyBrokerHint') ||
                'IBKR / Alpaca currently support long-only trading. Direction locked to Long.'
              )
            }
          } catch (e) { }
        }

        // Alpaca crypto desk is spot-only.  Force market_type to 'spot' so
        // the strategy never produces a swap order that the worker rejects.
        // Mirrors `broker_market_policy.validate_strategy_config` Rule 4.
        if (exchangeId === 'alpaca' && this.selectedMarketCategory === 'Crypto') {
          try {
            const currentMt = this.form && this.form.getFieldValue && this.form.getFieldValue('market_type')
            if (currentMt && String(currentMt).toLowerCase() !== 'spot') {
              this.scriptRuntimeMarketTypeUi = 'spot'
              this.safeSetFormFields({ market_type: 'spot', leverage: 1 })
              this.$message.info(
                this.$t('trading-assistant.form.alpacaCryptoSpotOnlyHint') ||
                'Alpaca crypto desk is spot-only (no perpetual swaps). Market type locked to Spot.'
              )
            }
          } catch (e) { }
        }
      }

      // Reset test results when credential changes
      this.connectionTestResult = null
    },
    onSaveCredentialChange (e) {
      const checked = !!(e && e.target && e.target.checked)
      this.saveCredentialUi = checked
      try {
        this.form && this.form.setFieldsValue && this.form.setFieldsValue({ save_credential: checked })
      } catch (err) { }
    },
    onExecutionModeChange (e) {
      const v = e && e.target ? e.target.value : e
      this.executionModeUi = v || 'signal'

      // If market doesn't support live trading, force signal mode
      if (!this.canUseLiveTrading && this.executionModeUi !== 'signal') {
        this.executionModeUi = 'signal'
        try {
          this.form && this.form.setFieldsValue && this.form.setFieldsValue({ execution_mode: 'signal' })
        } catch (err) { }
      }
    },
    setExecutionModeUi (mode) {
      const targetMode = mode || 'signal'
      this.onExecutionModeChange(targetMode)
      try {
        this.form && this.form.setFieldsValue && this.form.setFieldsValue({ execution_mode: targetMode })
      } catch (err) { }
    },
    onLiveDisclaimerAckChange (e) {
      const checked = !!(e && e.target && e.target.checked)
      this.liveDisclaimerAckUi = checked
      try {
        this.form && this.form.setFieldsValue && this.form.setFieldsValue({ live_disclaimer_ack: checked })
      } catch (err) { }
    },
    onNotifyChannelsChange (vals) {
      this.notifyChannelsUi = Array.isArray(vals) ? vals : []
    },
    formatCurrency (value) {
      if (value === null || value === undefined) return '-'
      return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatPnl (value) {
      if (value === null || value === undefined) return '-'
      const prefix = value >= 0 ? '+' : ''
      return prefix + '$' + Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatPnlPercent (value) {
      if (value === null || value === undefined) return '-'
      const prefix = value >= 0 ? '+' : ''
      return prefix + Math.abs(value).toFixed(2) + '%'
    },
    async loadStrategies () {
      this.loading = true
      try {
        const res = await getStrategyList()
        if (res.code === 1) {
          const allStrategies = res.data.strategies || []
          this.strategies = allStrategies
          if (this.selectedStrategy) {
            const updated = this.strategies.find(s => s.id === this.selectedStrategy.id)
            if (updated) {
              this.selectedStrategy = updated
            } else {
              this.selectedStrategy = null
            }
          }
        } else {
          this.$message.error(res.msg || this.$t('trading-assistant.messages.loadFailed'))
        }
      } catch (error) {
        this.$message.error(this.$t('trading-assistant.messages.loadFailed'))
      } finally {
        this.loading = false
        this.applyRouteStrategyQuery()
      }
    },
    applyRouteStrategyQuery () {
      const q = this.$route.query || {}
      const sid = q.strategy_id ? Number(q.strategy_id) : 0
      if (!sid || Number.isNaN(sid)) return
      const found = (this.strategies || []).find(s => s.id === sid)
      if (!found) return
      if (this.isIndicatorSignalOnlyPage && found.strategy_mode === 'script') return
      if (this.isScriptStrategiesOnlyPage && found.strategy_mode !== 'script') return
      this.topTab = 'strategy'
      this.handleSelectStrategy(found)
      if (q.mode === 'edit') {
        this.$nextTick(() => this.handleEditStrategy(found))
      }
    },
    async fetchStrategyDetailForEdit (strategy) {
      if (!strategy || !strategy.id) return strategy
      try {
        const res = await getStrategyDetail(strategy.id)
        if (res && res.code === 1 && res.data) {
          return { ...strategy, ...res.data }
        }
      } catch (e) {
        // fall back to list row
      }
      return strategy
    },
    handleCreateStrategy () {
      this.isEditMode = false
      this.editingStrategy = null
      if (this.isIndicatorSignalOnlyPage) {
        this.strategyMode = 'signal'
        this.pendingScriptTemplateKey = ''
        this.strategyCode = ''
        this.showModeSelector = false
        this.showFormModal = false
        this._openCreateModal()
        return
      }
      if (this.isScriptStrategiesOnlyPage) {
        this.strategyMode = 'script'
        this.pendingScriptTemplateKey = ''
        this.strategyCode = ''
        this.selectedScriptSourceId = ''
        this.showModeSelector = false
        this.showFormModal = false
        this._openCreateModal()
        return
      }
      this.strategyMode = ''
      this.strategyCode = ''
      this.pendingScriptTemplateKey = ''
      this.showModeSelector = true
      this.showFormModal = false
    },
    handleModeSelect (mode) {
      this.strategyMode = mode
      this.pendingScriptTemplateKey = ''
      this.showModeSelector = false
      this._openCreateModal()
    },
    handleUseTemplate (templateKey) {
      this.showModeSelector = false
      this.$router.push({ path: '/strategy-ide', query: { tab: 'script', template: templateKey || '' } })
    },
    _openCreateModal () {
      this.strategyType = 'indicator'
      this.currentStep = 0
      this.currentExchangeId = ''
      this.currentBrokerId = 'ibkr'
      this.selectedIndicator = null
      this.connectionTestResult = null
      this.executionModeUi = 'live'
      this.notifyChannelsUi = [...DEFAULT_NOTIFICATION_CHANNELS]
      this.saveCredentialUi = false
      this.aiFilterEnabledUi = false
      this.selectedMarketCategory = 'Crypto'
      this.selectedSymbols = []
      this.crossSectionalSymbols = []
      this.csStrategyTypeUi = 'single'
      this.crossSectionalIndicatorCodeOverride = null
      const isScriptCreate = this.strategyMode === 'script'
      const routeScriptSourceId = isScriptCreate && this.$route.query.source_id
        ? String(this.$route.query.source_id)
        : ''
      const routeMarketType = String((this.$route.query && this.$route.query.market_type) || '').toLowerCase() === 'spot'
        ? 'spot'
        : 'swap'
      const routeDirectionRaw = String((this.$route.query && this.$route.query.trade_direction) || '').toLowerCase()
      const routeTradeDirection = ['long', 'short', 'both'].includes(routeDirectionRaw) ? routeDirectionRaw : 'long'
      const routeInitialCapital = Number((this.$route.query && this.$route.query.initial_capital) || 1000)
      const routeLeverage = Number((this.$route.query && this.$route.query.leverage) || 5)
      this.selectedScriptSourceId = routeScriptSourceId
      this.strategyCode = ''
      const defaultStrategyName = isScriptCreate
        ? this.buildScriptStrategyDefaultName(this.pendingScriptTemplateKey || null)
        : this.buildStrategyDefaultName()
      this.lastAutoStrategyName = defaultStrategyName
      this.lastAutoScriptStrategyName = isScriptCreate ? defaultStrategyName : ''
      this.scriptTemplateKeyForPayload = isScriptCreate ? (this.pendingScriptTemplateKey || '') : ''
      this.selectedScriptTemplateParams = {}
      this.scriptRuntimeMarketTypeUi = routeMarketType

      this.form.resetFields()
      this.csStrategyTypeUi = 'single'
      this.liveDisclaimerAckUi = false
      this.showFormModal = true

      this.$nextTick(async () => {
        this.safeSetFormFields({
          strategy_name: defaultStrategyName,
          execution_mode: 'signal',
          notify_channels: [...DEFAULT_NOTIFICATION_CHANNELS],
          save_credential: false,
          live_disclaimer_ack: false,
          initial_capital: Number.isFinite(routeInitialCapital) && routeInitialCapital > 0 ? routeInitialCapital : 1000,
          market_type: routeMarketType,
          leverage: routeMarketType === 'spot' ? 1 : (Number.isFinite(routeLeverage) && routeLeverage > 0 ? routeLeverage : 5),
          trade_direction: routeMarketType === 'spot' ? 'long' : routeTradeDirection,
          timeframe: '1m',
          cs_strategy_type: 'single',
          portfolio_size: 5,
          long_ratio: 1,
          rebalance_frequency: 'daily'
        })
        await this.loadWatchlist()
        await this.loadIndicators()
        if (isScriptCreate) {
          await this.loadScriptSources()
          if (routeScriptSourceId) {
            this.selectedScriptSourceId = routeScriptSourceId
            await this.handleScriptSourceChange(routeScriptSourceId)
          }
        }
        this.applyPendingRouteIndicatorSelection()
        this.loadExchangeCredentials()
      })
    },
    async handleEditStrategy (strategy) {
      if (strategy.status === 'running') {
        this.$message.warning(this.$t('trading-assistant.messages.runningWarning'))
        return
      }

      const isScript = strategy.strategy_mode === 'script' || strategy.strategy_type === 'ScriptStrategy'
      const fullStrategy = isScript ? await this.fetchStrategyDetailForEdit(strategy) : strategy

      this.strategyType = 'indicator'
      this.strategyMode = fullStrategy.strategy_mode === 'bot' ? 'script' : (fullStrategy.strategy_mode || 'signal')
      this.strategyCode = fullStrategy.strategy_code || ''
      this.pendingScriptTemplateKey = ''

      this.isEditMode = true
      this.editingStrategy = fullStrategy
      this.csStrategyTypeUi = 'single'
      this.crossSectionalSymbols = []
      this.crossSectionalIndicatorCodeOverride = null
      this.currentStep = 0
      this.currentExchangeId = ''
      this.selectedIndicator = null
      this.connectionTestResult = null
      this.form.resetFields()
      this.aiFilterEnabledUi = false

      // IMPORTANT:
      // Ensure modal is visible BEFORE filling form values, otherwise some fields are not registered yet
      // (especially Step 2/3 fields) and setFieldsValue may silently drop values.
      this.showFormModal = true

      // Delay loading to ensure modal/form items are mounted.
      this.$nextTick(async () => {
        // Keep data sources in sync (same as create flow)
        this.loadWatchlist()
        this.loadIndicators()
        this.loadExchangeCredentials()
        await this.loadStrategyDataToForm(fullStrategy)
      })
    },
    async loadStrategyDataToForm (strategy) {
      if (!this.indicatorsLoaded) {
        await this.loadIndicators()
      }

      await this.$nextTick()

      // Market / execution / notification defaults (backward compatible)
      this.selectedMarketCategory = strategy.market_category || 'Crypto'
      this.applyMarketDefaultsForCategory(this.selectedMarketCategory)
      const executionMode = strategy.execution_mode || 'signal'
      this.executionModeUi = executionMode
      // Editing an existing live strategy: default as acknowledged to avoid blocking edits
      this.liveDisclaimerAckUi = executionMode === 'live'
      const notifyChannels = strategy.notification_config && strategy.notification_config.channels
      this.notifyChannelsUi = [...normalizeNotificationChannels(notifyChannels)]

      // Initialize AI filter state
      let aiFilterEnabled = false

      if (strategy.trading_config) {
        const tc = strategy.trading_config || {}
        const aiVal = tc.enable_ai_filter
        aiFilterEnabled = aiVal === true || aiVal === 'true' || aiVal === 1 || aiVal === '1'
      }
      this.aiFilterEnabledUi = aiFilterEnabled

      await this.$nextTick()

      // First, set the "switch" fields that might control v-if visibility of other fields
      // For ai_filter, it relies on aiFilterEnabledUi which is updated above, so form value is secondary for UI display
      // But we still need to set form value for submission
      this.form.setFieldsValue({
        enable_ai_filter: aiFilterEnabled
      })

      // Wait for form value to update and v-if to re-render (for ai_filter)
      await this.$nextTick()

      this.form.setFieldsValue({
        execution_mode: this.executionModeUi,
        live_disclaimer_ack: this.liveDisclaimerAckUi,
        notify_channels: this.notifyChannelsUi,
        notify_email: strategy.notification_config?.targets?.email || '',
        notify_phone: strategy.notification_config?.targets?.phone || '',
        notify_telegram: strategy.notification_config?.targets?.telegram || '',
        notify_discord: strategy.notification_config?.targets?.discord || '',
        notify_webhook: strategy.notification_config?.targets?.webhook || ''
      })

      const isScriptStrategy = strategy.strategy_mode === 'script' || strategy.strategy_mode === 'bot' || strategy.strategy_type === 'ScriptStrategy'
      if (isScriptStrategy) {
        const tc = strategy.trading_config || {}
        const rawSym = tc.symbol || strategy.symbol || ''
        const symbolValue = (typeof rawSym === 'string' && rawSym.includes(':'))
          ? rawSym
          : `${this.selectedMarketCategory}:${rawSym}`
        const sk = tc.script_template_key ? String(tc.script_template_key) : ''
        this.scriptTemplateKeyForPayload = sk
        this.pendingScriptTemplateKey = sk
        this.selectedScriptTemplateParams = { ...((tc && tc.script_template_params) || {}) }
        this.scriptRuntimeMarketTypeUi = this.isStockMarketCategory
          ? 'spot'
          : (tc.market_type === 'spot' ? 'spot' : 'swap')
        this.selectedScriptSourceId = tc.script_source_id ? String(tc.script_source_id) : ''
        this.strategyCode = strategy.strategy_code || ''
        if (tc.script_source_id) {
          try {
            await this.loadScriptSources()
            const srcRes = await getScriptSourceDetail(tc.script_source_id)
            const src = (srcRes && srcRes.data) || srcRes || {}
            this.strategyCode = src.code || this.strategyCode
            this.scriptTemplateKeyForPayload = src.template_key || this.scriptTemplateKeyForPayload
            const metadata = src.metadata || {}
            const lastRun = metadata.last_run_config || {}
            this.selectedScriptTemplateParams = {
              ...this.selectedScriptTemplateParams,
              ...((metadata && metadata.script_template_params) || {}),
              ...((lastRun && lastRun.script_template_params) || {}),
              ...((src && src.template_params) || {})
            }
          } catch (e) {}
        }
        this.lastAutoScriptStrategyName = strategy.strategy_name || ''
        this.lastAutoStrategyName = strategy.strategy_name || ''
        this.form.setFieldsValue({
          strategy_name: strategy.strategy_name,
          symbol: symbolValue,
          initial_capital: tc.initial_capital != null ? tc.initial_capital : (strategy.initial_capital || 1000),
          leverage: this.isStockMarketCategory ? 1 : (tc.leverage != null ? tc.leverage : (strategy.leverage || 5)),
          trade_direction: this.isStockMarketCategory ? 'long' : (tc.trade_direction || 'long'),
          market_type: this.isStockMarketCategory ? 'spot' : (tc.market_type === 'futures' ? 'swap' : (tc.market_type || 'swap'))
        })
        this.syncScriptTemplateParamsToForm()
        return
      }

      if (strategy.indicator_config && strategy.indicator_config.indicator_id) {
        const targetId = strategy.indicator_config.indicator_id
        const indicator = this.availableIndicators.find(ind => {
          return String(ind.id) === String(targetId)
        })

        if (indicator) {
          const finalId = String(indicator.id)
          this.form.setFieldsValue({
            indicator_id: finalId
          })
          await this.handleIndicatorChange(finalId)

          const savedParams = strategy.trading_config?.indicator_params
          if (savedParams && typeof savedParams === 'object') {
            Object.keys(savedParams).forEach(key => {
              if (key in this.indicatorParamValues) {
                this.$set(this.indicatorParamValues, key, savedParams[key])
              }
            })
          }
        } else {
          this.form.setFieldsValue({
            indicator_id: String(targetId)
          })
        }
      }

      // Load exchange/broker configuration
      if (strategy.exchange_config) {
        const exchangeId = strategy.exchange_config.exchange_id || ''
        const isLive = this.executionModeUi === 'live'
        const supportsLiveTrading = ['Crypto', 'USStock'].includes(this.selectedMarketCategory)
        const isBrokerMarket = this.selectedMarketCategory === 'USStock'

        if (isLive && supportsLiveTrading) {
          if (isBrokerMarket) {
            // Broker configuration (US stocks)
            this.currentBrokerId = exchangeId || 'ibkr'
            this.form.setFieldsValue({
              broker_id: exchangeId || 'ibkr',
              ibkr_host: strategy.exchange_config.ibkr_host || '127.0.0.1',
              ibkr_port: strategy.exchange_config.ibkr_port || 7497,
              ibkr_client_id: strategy.exchange_config.ibkr_client_id || 1,
              ibkr_account: strategy.exchange_config.ibkr_account || ''
            })
          } else {
            // Crypto exchange configuration 闂?only credential_id is stored in strategy.
            this.currentExchangeId = exchangeId || strategy.exchange_config.exchange_id || ''
            const credId = strategy.exchange_config.credential_id
            if (credId) {
              this.form.setFieldsValue({
                credential_id: credId
              })
              // Update currentExchangeId from credential metadata
              await this.handleCredentialSelectChange(credId)
            }
          }
        }

        // Update UI state
        if (isBrokerMarket) {
          this.currentBrokerId = exchangeId || 'ibkr'
        } else {
          this.currentExchangeId = exchangeId
        }
      }

      if (strategy.trading_config) {
        const tc = strategy.trading_config || {}
        const csType = tc.cs_strategy_type || 'single'
        this.csStrategyTypeUi = csType
        this.crossSectionalSymbols = Array.isArray(tc.symbol_list) ? [...tc.symbol_list] : []
        this.crossSectionalIndicatorCodeOverride = null

        // Backward compatible: show symbol as "Market:SYMBOL" for watchlist dropdown
        const rawSymbol = tc.symbol
        const symbolValue = (typeof rawSymbol === 'string' && rawSymbol.includes(':'))
          ? rawSymbol
          : `${this.selectedMarketCategory}:${rawSymbol}`
        this.form.setFieldsValue({
          strategy_name: strategy.strategy_name,
          symbol: symbolValue,
          initial_capital: tc.initial_capital,
          leverage: this.isStockMarketCategory ? 1 : tc.leverage,
          trade_direction: this.isStockMarketCategory ? 'long' : (tc.trade_direction || 'long'),
          timeframe: tc.timeframe || '1H',
          market_type: this.isStockMarketCategory ? 'spot' : (tc.market_type === 'futures' ? 'swap' : (tc.market_type || 'swap')),
          enable_ai_filter: aiFilterEnabled,
          strict_mode: tc.strict_mode !== false,
          cs_strategy_type: csType,
          portfolio_size: tc.portfolio_size != null ? tc.portfolio_size : 5,
          long_ratio: tc.long_ratio != null ? tc.long_ratio : 1,
          rebalance_frequency: tc.rebalance_frequency || 'daily'
        })
        if (csType === 'cross_sectional' && this.crossSectionalSymbols.length > 0) {
          const first = this.crossSectionalSymbols[0]
          if (typeof first === 'string' && first.includes(':')) {
            this.selectedMarketCategory = first.split(':', 1)[0] || this.selectedMarketCategory
            this.applyMarketDefaultsForCategory(this.selectedMarketCategory)
          }
        }
      }
    },
    handleSelectStrategy (strategy) {
      this.selectedStrategy = strategy
      this.currentEquity = null
      this.detailTab = 'positions'
      this.refreshStrategyBacktestFlag(strategy && strategy.id)
      this.loadStrategyDetails()
      this.startEquityPolling()
    },
    async loadStrategyDetails () {
      if (!this.selectedStrategy) {
        return Promise.resolve()
      }
      try {
        const [curveRes, posRes] = await Promise.all([
          getStrategyEquityCurve(this.selectedStrategy.id),
          getStrategyPositions(this.selectedStrategy.id)
        ])

        let closedEquity = null
        if (curveRes.code === 1 && curveRes.data) {
          if (Array.isArray(curveRes.data) && curveRes.data.length > 0) {
            const last = curveRes.data[curveRes.data.length - 1]
            closedEquity = last.equity
          } else {
            const base = this.strategyInitialCapital
            closedEquity = base != null ? base : null
          }
        }

        let totalUnrealizedPnl = 0
        if (posRes.code === 1 && posRes.data) {
          const positions = posRes.data.positions || posRes.data.items || []
          for (const pos of positions) {
            totalUnrealizedPnl += parseFloat(pos.unrealized_pnl || pos.unrealizedPnl || 0)
          }
        }

        if (closedEquity !== null) {
          this.currentEquity = closedEquity + totalUnrealizedPnl
        } else {
          this.currentEquity = null
        }
      } catch (error) {
      }
    },
    startEquityPolling () {
      this.stopEquityPolling()
      if (!this.selectedStrategy) return

      this.loadStrategyDetails()

      this.equityPollingTimer = setInterval(() => {
        this.loadStrategyDetails()
      }, 10000)
    },
    stopEquityPolling () {
      if (this.equityPollingTimer) {
        clearInterval(this.equityPollingTimer)
        this.equityPollingTimer = null
      }
    },
    handleCloseModal () {
      this.showFormModal = false
      this.editingStrategy = null
      this.isEditMode = false
      this.strategyType = 'indicator'
      this.strategyMode = ''
      this.strategyCode = ''
      this.pendingScriptTemplateKey = ''
      this.selectedScriptSourceId = ''
      this.currentStep = 0
      this.currentExchangeId = ''
      this.selectedIndicator = null
      this.connectionTestResult = null
      this.indicatorsLoaded = false
      this.availableIndicators = []
      this.pendingRouteIndicatorId = ''
      this.lastAutoStrategyName = ''
      this.lastAutoScriptStrategyName = ''
      this.scriptTemplateKeyForPayload = ''
      this.aiFilterEnabledUi = false
      this.executionModeUi = 'live'
      this.liveDisclaimerAckUi = false

      this.form.resetFields()
    },
    handleRefresh () {
      this.loadStrategies()
      this.showFormModal = false
    },
    handleMenuClick (key, strategy) {
      switch (key) {
        case 'start':
          this.handleStartStrategy(strategy.id)
          break
        case 'stop':
          this.handleStopStrategy(strategy.id)
          break
        case 'edit':
          this.handleEditStrategy(strategy)
          break
        case 'backtest':
          this.handleBacktestStrategy(strategy)
          break
        case 'delete':
          this.handleDeleteStrategy(strategy)
          break
      }
    },
    toggleGroup (groupId) {
      this.$set(this.collapsedGroups, groupId, !this.collapsedGroups[groupId])
    },
    handleBacktestStrategy (strategy) {
      if (!strategy || !strategy.id) return
      this.goToStrategyIdeForBacktest(strategy)
    },
    goToIndicatorIdeForBacktest (strategy) {
      const st = strategy || this.selectedStrategy
      const indId = st && st.indicator_config && st.indicator_config.indicator_id
      const query = indId ? { indicator_id: String(indId) } : {}
      this.$router.push({ path: '/strategy-ide', query })
    },
    goToStrategyIdeForBacktest (strategy) {
      const st = strategy || this.selectedStrategy
      if (st && (st.strategy_mode === 'script' || st.strategy_type === 'ScriptStrategy')) {
        this.$router.push({
          path: '/strategy-ide',
          query: { tab: 'script', strategy_id: String(st.id) }
        })
        return
      }
      this.goToIndicatorIdeForBacktest(st)
    },
    isStrategyVerified (strategy) {
      const tc = (strategy && strategy.trading_config) || {}
      return !!(tc.lifecycle_verified || tc.script_verified)
    },
    onStrategyBacktested () {
      this.strategyHasBacktest = true
    },
    onBacktestHistoryLoaded (rows) {
      this.strategyHasBacktest = Array.isArray(rows) && rows.length > 0
    },
    onScriptVerified () {
      if (this.editingStrategy && this.editingStrategy.trading_config) {
        this.$set(this.editingStrategy.trading_config, 'lifecycle_verified', true)
        this.$set(this.editingStrategy.trading_config, 'script_verified', true)
      }
      if (this.selectedStrategy && this.selectedStrategy.trading_config) {
        this.$set(this.selectedStrategy.trading_config, 'lifecycle_verified', true)
        this.$set(this.selectedStrategy.trading_config, 'script_verified', true)
      }
    },
    openPublishTemplateModal () {
      if (!this.selectedStrategy) return
      this.publishForm = {
        name: this.selectedStrategy.strategy_name || '',
        description: '',
        pricingType: 'free',
        price: 0
      }
      this.showPublishTemplateModal = true
    },
    async submitPublishTemplate () {
      if (!this.selectedStrategy || !this.selectedStrategy.id) return
      const tradingConfig = this.selectedStrategy.trading_config || this.selectedStrategy.tradingConfig || {}
      const scriptSourceId = tradingConfig.script_source_id || tradingConfig.scriptSourceId
      const isScriptStrategy = this.isScriptStrategy(this.selectedStrategy)
      const isBotPreset = String(this.selectedStrategy.strategy_mode || '').toLowerCase() === 'bot'
      if (isScriptStrategy && !isBotPreset && !scriptSourceId) {
        this.$message.warning(this.$t('trading-assistant.form.scriptSourceRequired'))
        return
      }
      this.publishingTemplate = true
      try {
        const payload = {
          name: this.publishForm.name,
          description: this.publishForm.description,
          pricingType: this.publishForm.pricingType,
          price: this.publishForm.pricingType === 'paid' ? this.publishForm.price : 0
        }
        const res = isBotPreset
          ? await publishBotPreset({ ...payload, strategyId: this.selectedStrategy.id })
          : (isScriptStrategy
            ? await publishScriptSource({ ...payload, sourceId: scriptSourceId })
            : await publishStrategyTemplate({ ...payload, strategyId: this.selectedStrategy.id }))
        if (res.code === 1) {
          this.$message.success(this.$t('strategyCenter.publish.success'))
          this.showPublishTemplateModal = false
        } else {
          this.$message.error(res.msg || this.$t('strategyCenter.publish.failed'))
        }
      } catch (e) {
        this.$message.error(this.$t('strategyCenter.publish.failed'))
      } finally {
        this.publishingTemplate = false
      }
    },
    async refreshStrategyBacktestFlag (strategyId) {
      if (!strategyId) return
      try {
        const res = await getStrategyBacktestHistory({ strategyId: Number(strategyId), limit: 1 })
        this.strategyHasBacktest = res.code === 1 && Array.isArray(res.data) && res.data.length > 0
      } catch (e) {
        this.strategyHasBacktest = false
      }
    },
    async handleGroupMenuClick (key, group) {
      const strategyIds = group.strategies.map(s => s.id)
      switch (key) {
        case 'startAll':
          await this.handleBatchStartStrategies(strategyIds, group.baseName)
          break
        case 'stopAll':
          await this.handleBatchStopStrategies(strategyIds, group.baseName)
          break
        case 'deleteAll':
          await this.handleBatchDeleteStrategies(strategyIds, group.baseName)
          break
      }
    },
    async handleBatchStartStrategies (strategyIds, groupName) {
      try {
        const res = await batchStartStrategies({ strategy_ids: strategyIds })
        if (res.code === 1) {
          const count = res.data?.success_ids?.length || strategyIds.length
          this.$message.success(this.$t('trading-assistant.messages.batchStartSuccess', { count }))
          this.loadStrategies()
        } else {
          this.$message.error(res.msg || this.$t('trading-assistant.messages.batchStartFailed'))
        }
      } catch (error) {
        this.$message.error(error.backendMessage || error.message || this.$t('trading-assistant.messages.batchStartFailed'))
      }
    },
    async handleBatchStopStrategies (strategyIds, groupName) {
      try {
        const res = await batchStopStrategies({ strategy_ids: strategyIds })
        if (res.code === 1) {
          const count = res.data?.success_ids?.length || strategyIds.length
          this.$message.success(this.$t('trading-assistant.messages.batchStopSuccess', { count }))
          this.loadStrategies()
        } else {
          this.$message.error(res.msg || this.$t('trading-assistant.messages.batchStopFailed'))
        }
      } catch (error) {
        this.$message.error(error.backendMessage || error.message || this.$t('trading-assistant.messages.batchStopFailed'))
      }
    },
    async handleBatchDeleteStrategies (strategyIds, groupName) {
      const confirmText = this.$t('trading-assistant.messages.batchDeleteConfirm', {
        count: strategyIds.length,
        name: groupName
      })
      this.$confirm({
        class: this.isDarkTheme ? 'ta-strategy-confirm-modal' : '',
        title: this.$t('trading-assistant.deleteAll'),
        content: confirmText,
        okText: this.$t('trading-assistant.deleteAll'),
        okType: 'danger',
        cancelText: this.$t('trading-assistant.form.cancel'),
        onOk: async () => {
          try {
            const res = await batchDeleteStrategies({ strategy_ids: strategyIds })
            if (res.code === 1) {
              const count = res.data?.success_ids?.length || strategyIds.length
              this.$message.success(this.$t('trading-assistant.messages.batchDeleteSuccess', { count }))
              if (this.selectedStrategy && strategyIds.includes(this.selectedStrategy.id)) {
                this.selectedStrategy = null
                this.stopEquityPolling()
              }
              this.loadStrategies()
            } else {
              this.$message.error(res.msg || this.$t('trading-assistant.messages.batchDeleteFailed'))
            }
          } catch (error) {
            this.$message.error(this.$t('trading-assistant.messages.batchDeleteFailed'))
          }
        }
      })
    },
    async handleStartStrategy (id) {
      const strategy = this.selectedStrategy && this.selectedStrategy.id === id
        ? this.selectedStrategy
        : (this.strategies || []).find(s => s.id === id)
      const isScript = strategy && (strategy.strategy_mode === 'script' || strategy.strategy_type === 'ScriptStrategy')
      if (isScript) {
        await this.refreshStrategyBacktestFlag(id)
        if (!this.strategyHasBacktest) {
          const ok = await new Promise(resolve => {
            this.$confirm({
              title: this.$t('strategyCenter.live.noBacktestTitle'),
              content: this.$t('strategyCenter.live.noBacktestContent'),
              okText: this.$t('strategyCenter.live.startAnyway'),
              cancelText: this.$t('strategyCenter.live.goBacktest'),
              onOk: () => resolve(true),
              onCancel: () => {
                if (strategy) {
                  this.goToStrategyIdeForBacktest(strategy)
                }
                resolve(false)
              }
            })
          })
          if (!ok) return
        }
      }
      try {
        const res = await startStrategy(id)
        if (res.code === 1) {
          this.$message.success(this.$t('trading-assistant.messages.startSuccess'))
          this.loadStrategies()
          if (this.selectedStrategy && this.selectedStrategy.id === id) {
            this.selectedStrategy.status = 'running'
          }
        } else {
          this.$message.error(res.msg || this.$t('trading-assistant.messages.startFailed'))
        }
      } catch (error) {
        this.$message.error(error.backendMessage || error.message || this.$t('trading-assistant.messages.startFailed'))
      }
    },
    async handleStopStrategy (id) {
      try {
        const res = await stopStrategy(id)
        if (res.code === 1) {
          this.$message.success(this.$t('trading-assistant.messages.stopSuccess'))
          this.loadStrategies()
          if (this.selectedStrategy && this.selectedStrategy.id === id) {
            this.selectedStrategy.status = 'stopped'
          }
        } else {
          this.$message.error(res.msg || this.$t('trading-assistant.messages.stopFailed'))
        }
      } catch (error) {
        this.$message.error(error.backendMessage || error.message || this.$t('trading-assistant.messages.stopFailed'))
      }
    },
    handleDeleteStrategy (strategy) {
      const confirmText = this.$t('trading-assistant.messages.deleteConfirmWithName', {
        name: strategy.strategy_name
      })
      this.$confirm({
        class: this.isDarkTheme ? 'ta-strategy-confirm-modal' : '',
        title: this.$t('trading-assistant.deleteStrategy'),
        content: confirmText,
        okText: this.$t('trading-assistant.deleteStrategy'),
        okType: 'danger',
        cancelText: this.$t('trading-assistant.form.cancel'),
        onOk: async () => {
          try {
            const res = await deleteStrategy(strategy.id)
            if (res.code === 1) {
              this.$message.success(this.$t('trading-assistant.messages.deleteSuccess'))
              if (this.selectedStrategy && this.selectedStrategy.id === strategy.id) {
                this.selectedStrategy = null
                this.stopEquityPolling() // 闂傚倸鍊烽懗鍫曗€﹂崼銉晞闁糕剝鐟ラ崹婵堚偓骞垮劚椤︿粙寮崱妯肩闁瑰鍋熼幊鍕攽椤旂晫鐭嬮柕鍥у瀵噣鍩€椤掑嫷鏁勬繛鍡樻尭閸?
              }
              this.loadStrategies()
            } else {
              this.$message.error(res.msg || this.$t('trading-assistant.messages.deleteFailed'))
            }
          } catch (error) {
            this.$message.error(this.$t('trading-assistant.messages.deleteFailed'))
          }
        }
      })
    },
    getStatusColor (status) {
      const colors = {
        running: 'green',
        stopped: 'default',
        error: 'red'
      }
      return colors[status] || 'default'
    },
    getStatusText (status) {
      return this.$t(`trading-assistant.status.${status}`) || status
    },
    getStrategyTypeText (type) {
      return this.$t(`trading-assistant.strategyType.${type}`) || type
    },
    getTradeDirectionText (direction) {
      if (!direction) return ''
      const directionMap = {
        long: this.$t('trading-assistant.form.tradeDirectionLong') || 'Long',
        short: this.$t('trading-assistant.form.tradeDirectionShort') || 'Short',
        both: this.$t('trading-assistant.form.tradeDirectionBoth') || 'Both'
      }
      return directionMap[direction] || direction
    },
    async handleIndicatorSelectFocus () {
      if (!this.indicatorsLoaded && !this.loadingIndicators) {
        await this.loadIndicators()
      }
    },
    async loadIndicators () {
      if (this.loadingIndicators) {
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (!this.loadingIndicators) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 100)
        })
      }

      if (this.indicatorsLoaded) {
        return Promise.resolve()
      }

      const userInfo = this.$store.getters.userInfo || {}
      const userId = userInfo.id || 1

      this.loadingIndicators = true
      try {
        const res = await request({
          url: '/api/indicator/getIndicators',
          method: 'get',
          params: {
            userid: userId
          }
        })

        if (res.code === 1 && res.data) {
          const indicators = res.data.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            type: item.indicator_type || item.indicatorType || 'python',
            code: item.code,
            is_buy: item.is_buy,
            source: item.is_buy === 1 ? 'bought' : 'custom'
          }))

          this.availableIndicators = indicators
          this.indicatorsLoaded = true
          this.applyPendingRouteIndicatorSelection()
        } else {
          this.availableIndicators = []
          this.$message.warning(res.msg || this.$t('trading-assistant.messages.loadIndicatorsFailed'))
        }
      } catch (error) {
        this.availableIndicators = []
        this.$message.warning(this.$t('trading-assistant.messages.loadIndicatorsFailed'))
      } finally {
        this.loadingIndicators = false
      }
    },
    async handleIndicatorChange (indicatorId) {
      const idStr = String(indicatorId)
      this.selectedIndicator = this.availableIndicators.find(ind => String(ind.id) === idStr)
      this.applyAutoStrategyName(this.selectedIndicator)

      this.indicatorParams = []
      this.indicatorParamValues = {}
      if (indicatorId) {
        try {
          const res = await this.$http.get('/api/indicator/getIndicatorParams', {
            params: { indicator_id: indicatorId }
          })
          if (res && res.code === 1 && Array.isArray(res.data)) {
            this.indicatorParams = res.data
            const paramValues = {}
            res.data.forEach(p => {
              paramValues[p.name] = p.default
            })
            this.indicatorParamValues = paramValues
          }
        } catch (err) {
          console.warn('Failed to load indicator params:', err)
        }
      }
    },
    handleMarketTypeChange (e) {
      const marketType = e.target.value
      this.scriptRuntimeMarketTypeUi = marketType === 'spot' ? 'spot' : 'swap'
      if (marketType === 'spot') {
        this.form.setFieldsValue({
          trade_direction: 'long',
          leverage: 1
        })
      }
    },
    parseStrategyAnnotationRaw (code) {
      const lineRe = /^#\s*@strategy\s+(\w+)\s*:?\s*(\S+)/i
      const config = {}
      if (!code) return config
      for (const rawLine of code.split('\n')) {
        const line = rawLine.trim()
        const m = line.match(lineRe)
        if (m) config[m[1]] = m[2]
      }
      return config
    },
    parseIndicatorContractHeaders (code) {
      const pairRe = /\b(signal_form|exit_owner|flip_mode)\s*:?\s*(\S+)/ig
      const out = {}
      if (!code) return out
      for (const rawLine of code.split('\n')) {
        const line = rawLine.trim()
        if (!line.startsWith('#')) continue
        pairRe.lastIndex = 0
        let m
        while ((m = pairRe.exec(line.slice(1).trim())) !== null) {
          const key = String(m[1] || '').toLowerCase()
          const val = String(m[2] || '').trim()
          if (key === 'exit_owner') {
            const owner = val.toLowerCase()
            if (owner === 'indicator' || owner === 'engine') out.exit_owner = owner
          } else if (key === 'signal_form') {
            out.signal_form = val.toLowerCase()
          } else if (key === 'flip_mode') {
            out.flip_mode = val.toUpperCase()
          }
        }
      }
      return out
    },
    buildRiskPositionFromIndicatorCode (code) {
      const raw = this.parseStrategyAnnotationRaw(code || '')
      const headers = this.parseIndicatorContractHeaders(code || '')
      const toFloat = (v) => {
        const f = parseFloat(v)
        return isNaN(f) ? null : f
      }
      const toBool = (v) => ['true', '1', 'yes', 'on'].includes(String(v).toLowerCase())
      const ratioToPercent = (v, defaultPercent = 0) => {
        const n = toFloat(v)
        if (n == null || n <= 0) return defaultPercent
        if (n > 1 && n <= 100) return n
        return n * 100
      }
      const clampPct = (v, max = 100) => {
        const n = Number(v)
        if (!Number.isFinite(n) || n <= 0) return 0
        return Math.min(n, max)
      }

      const sl = clampPct(ratioToPercent(raw.stopLossPct))
      const tp = clampPct(ratioToPercent(raw.takeProfitPct), 1000)
      const trailingEnabled = raw.trailingEnabled != null ? toBool(raw.trailingEnabled) : false
      const trailingStopPct = clampPct(ratioToPercent(raw.trailingStopPct))
      const trailingActivationPct = clampPct(ratioToPercent(raw.trailingActivationPct), 1000)

      const hasEntry = Object.prototype.hasOwnProperty.call(raw, 'entryPct') &&
        raw.entryPct != null && raw.entryPct !== ''
      const entryPctOut = hasEntry
        ? clampPct(ratioToPercent(raw.entryPct))
        : 100

      const out = {
        stop_loss_pct: sl,
        take_profit_pct: tp,
        trailing_enabled: trailingEnabled,
        trailing_stop_pct: trailingStopPct,
        trailing_activation_pct: trailingActivationPct,
        entry_pct: entryPctOut
      }
      if (headers.exit_owner) out.exit_owner = headers.exit_owner
      return out
    },
    extractScaleReduceFlatFromTradingConfig (tc) {
      tc = tc || {}
      const scaleObj = (tc.scale && typeof tc.scale === 'object') ? tc.scale : null
      const trendAddObj = scaleObj && scaleObj.trendAdd ? scaleObj.trendAdd : null
      const dcaAddObj = scaleObj && scaleObj.dcaAdd ? scaleObj.dcaAdd : null
      const trendReduceObj = scaleObj && scaleObj.trendReduce ? scaleObj.trendReduce : null
      const adverseReduceObj = scaleObj && scaleObj.adverseReduce ? scaleObj.adverseReduce : null
      return {
        trend_add_enabled: (tc.trend_add_enabled !== undefined) ? !!tc.trend_add_enabled : !!(trendAddObj && trendAddObj.enabled),
        trend_add_step_pct: (tc.trend_add_step_pct !== undefined) ? (tc.trend_add_step_pct || 0) : (trendAddObj ? (trendAddObj.stepPct || 0) : 0),
        trend_add_size_pct: (tc.trend_add_size_pct !== undefined) ? (tc.trend_add_size_pct || 0) : (trendAddObj ? (trendAddObj.sizePct || 0) : 0),
        trend_add_max_times: (tc.trend_add_max_times !== undefined) ? (tc.trend_add_max_times || 0) : (trendAddObj ? (trendAddObj.maxTimes || 0) : 0),
        dca_add_enabled: (tc.dca_add_enabled !== undefined) ? !!tc.dca_add_enabled : !!(dcaAddObj && dcaAddObj.enabled),
        dca_add_step_pct: (tc.dca_add_step_pct !== undefined) ? (tc.dca_add_step_pct || 0) : (dcaAddObj ? (dcaAddObj.stepPct || 0) : 0),
        dca_add_size_pct: (tc.dca_add_size_pct !== undefined) ? (tc.dca_add_size_pct || 0) : (dcaAddObj ? (dcaAddObj.sizePct || 0) : 0),
        dca_add_max_times: (tc.dca_add_max_times !== undefined) ? (tc.dca_add_max_times || 0) : (dcaAddObj ? (dcaAddObj.maxTimes || 0) : 0),
        trend_reduce_enabled: (tc.trend_reduce_enabled !== undefined) ? !!tc.trend_reduce_enabled : !!(trendReduceObj && trendReduceObj.enabled),
        trend_reduce_step_pct: (tc.trend_reduce_step_pct !== undefined) ? (tc.trend_reduce_step_pct || 0) : (trendReduceObj ? (trendReduceObj.stepPct || 0) : 0),
        trend_reduce_size_pct: (tc.trend_reduce_size_pct !== undefined) ? (tc.trend_reduce_size_pct || 0) : (trendReduceObj ? (trendReduceObj.sizePct || 0) : 0),
        trend_reduce_max_times: (tc.trend_reduce_max_times !== undefined) ? (tc.trend_reduce_max_times || 0) : (trendReduceObj ? (trendReduceObj.maxTimes || 0) : 0),
        adverse_reduce_enabled: (tc.adverse_reduce_enabled !== undefined) ? !!tc.adverse_reduce_enabled : !!(adverseReduceObj && adverseReduceObj.enabled),
        adverse_reduce_step_pct: (tc.adverse_reduce_step_pct !== undefined) ? (tc.adverse_reduce_step_pct || 0) : (adverseReduceObj ? (adverseReduceObj.stepPct || 0) : 0),
        adverse_reduce_size_pct: (tc.adverse_reduce_size_pct !== undefined) ? (tc.adverse_reduce_size_pct || 0) : (adverseReduceObj ? (adverseReduceObj.sizePct || 0) : 0),
        adverse_reduce_max_times: (tc.adverse_reduce_max_times !== undefined) ? (tc.adverse_reduce_max_times || 0) : (adverseReduceObj ? (adverseReduceObj.maxTimes || 0) : 0)
      }
    },
    onAiFilterToggle (checked) {
      this.aiFilterEnabledUi = !!checked
      // Ensure rc-form value is always in sync even if decorator event binding gets overridden.
      try {
        this.form && this.form.setFieldsValue && this.form.setFieldsValue({ enable_ai_filter: !!checked })
      } catch (e) { }
    },
    filterIndicatorOption (input, option) {
      const text = option.componentOptions?.propsData?.label || ''
      return text.toLowerCase().indexOf(input.toLowerCase()) >= 0
    },
    getIndicatorOptionLabel (indicator) {
      if (!indicator) return ''
      return indicator.description ? `${indicator.name} - ${indicator.description}` : indicator.name
    },
    buildStrategyDefaultName (indicator) {
      const baseName = indicator && indicator.name
        ? indicator.name
        : this.$t('trading-assistant.form.defaultStrategyName')
      const suffix = this.$t('trading-assistant.form.defaultStrategySuffix')
      return `${baseName}${suffix}`
    },
    buildScriptStrategyDefaultName (templateKey) {
      const suffix = this.$t('trading-assistant.form.defaultStrategySuffix')
      const raw = templateKey && String(templateKey).trim()
      if (raw) {
        const i18nKey = `trading-assistant.template.${raw}`
        const label = this.$t(i18nKey)
        const base = label !== i18nKey ? label : raw
        return `${base}${suffix}`
      }
      const base = this.$t('trading-assistant.form.defaultScriptStrategyName')
      return `${base}${suffix}`
    },
    scriptTemplateKeyOf (item) {
      if (!item) return ''
      const tc = item.trading_config || item.metadata || {}
      const lastRun = tc.last_run_config || {}
      const k = item.template_key || tc.script_template_key || lastRun.script_template_key
      return k ? String(k) : ''
    },
    scriptTemplateLabel (key) {
      if (!key) return ''
      const i18nKey = `trading-assistant.template.${key}`
      const t = this.$t(i18nKey)
      return t !== i18nKey ? t : String(key)
    },
    onScriptTemplateChange (payload) {
      const key = payload && payload.key ? String(payload.key) : ''
      this.scriptTemplateKeyForPayload = key
      this.selectedScriptTemplateParams = (payload && payload.params && typeof payload.params === 'object') ? { ...payload.params } : {}
      this.syncScriptTemplateParamsToForm()
      if (this.strategyMode !== 'script' || !this.form) return
      const nextName = this.buildScriptStrategyDefaultName(key || null)
      const currentName = this.form.getFieldValue('strategy_name')
      if (!currentName || currentName === this.lastAutoScriptStrategyName || currentName === this.lastAutoStrategyName) {
        this.form.setFieldsValue({ strategy_name: nextName })
        this.lastAutoScriptStrategyName = nextName
        this.lastAutoStrategyName = nextName
      }
    },
    syncScriptTemplateParamsToForm () {
      // Runtime fields such as direction and market type are not code params.
      // The template catalog prevents them from entering template params.
    },
    applyAutoStrategyName (indicator) {
      if (this.editingStrategy || !this.form || this.strategyMode === 'script') return
      const nextName = this.buildStrategyDefaultName(indicator)
      const currentName = this.form.getFieldValue('strategy_name')
      if (!currentName || currentName === this.lastAutoStrategyName) {
        this.form.setFieldsValue({ strategy_name: nextName })
        this.lastAutoStrategyName = nextName
      }
    },
    async applyPendingRouteIndicatorSelection () {
      if (!this.pendingRouteIndicatorId || !this.form || this.loadingIndicators) return
      const targetId = String(this.pendingRouteIndicatorId)
      const target = this.availableIndicators.find(ind => String(ind.id) === targetId)
      if (!target) return
      this.form.setFieldsValue({ indicator_id: targetId })
      await this.handleIndicatorChange(targetId)
      this.pendingRouteIndicatorId = ''
    },
    filterSymbolOption (input, option) {
      return option.componentOptions.children[0].text.toLowerCase().indexOf(input.toLowerCase()) >= 0
    },
    getIndicatorTypeColor (type) {
      const colors = {
        trend: 'blue',
        momentum: 'green',
        volatility: 'orange',
        volume: 'purple',
        custom: 'cyan',
        python: 'geekblue',
        pine: 'magenta'
      }
      return colors[type] || 'cyan'
    },
    getIndicatorTypeName (type) {
      const key = `trading-assistant.indicatorType.${type}`
      const translated = this.$t(key)
      return translated !== key ? translated : type
    },
    getExchangeName (exchange) {
      if (exchange.labelKey) {
        const translationKey = `trading-assistant.exchangeNames.${exchange.labelKey}`
        const translated = this.$t(translationKey)
        if (translated === translationKey) {
          return exchange.value.charAt(0).toUpperCase() + exchange.value.slice(1)
        }
        return translated
      }
      return exchange.label || exchange.value
    },
    getExchangeDisplayName (exchangeId) {
      if (!exchangeId) return ''
      const exchange = this.exchangeOptions.find(ex => ex.value === exchangeId)
      if (exchange) {
        return this.getExchangeName(exchange)
      }
      return exchangeId.charAt(0).toUpperCase() + exchangeId.slice(1)
    },
    getExchangeTagColor (exchangeId) {
      const colorMap = {
        binance: 'gold',
        okx: 'blue',
        coinbaseexchange: 'cyan',
        kraken: 'purple',
        huobi: 'orange',
        gate: 'green',
        mexc: 'lime',
        kucoin: 'volcano',
        bybit: 'red',
        bitget: 'magenta',
        bitmex: 'red',
        deribit: 'blue',
        phemex: 'cyan',
        bitmart: 'geekblue',
        bitstamp: 'purple',
        bittrex: 'orange',
        poloniex: 'green',
        gemini: 'lime',
        cryptocom: 'volcano',
        blockchaincom: 'magenta',
        bitflyer: 'red',
        upbit: 'blue',
        bithumb: 'cyan',
        coinone: 'purple',
        zb: 'geekblue',
        lbank: 'orange',
        bibox: 'green',
        bigone: 'lime',
        bitrue: 'volcano',
        coinex: 'magenta',
        ftx: 'red',
        ftxus: 'blue',
        binanceus: 'gold',
        binancecoinm: 'gold',
        binanceusdm: 'gold',
        ibkr: 'green'
      }
      return colorMap[exchangeId] || 'default'
    },
    handleApiConfigChange () {
      this.connectionTestResult = null
    },
    getModalPopupContainer () {
      // Return document.body for Select dropdown to avoid modal scroll issues
      return window.document.body
    },
    handleBrokerSelectChange (value) {
      this.currentBrokerId = value || 'ibkr'
      this.connectionTestResult = null
    },
    handleExchangeSelectChange (value) {
      this.currentExchangeId = value || ''
      this.connectionTestResult = null

      // If exchange_id is set programmatically (e.g. by selecting a saved credential),
      // don't clear the api fields we just filled.
      if (this.suppressApiClearOnce) {
        this.suppressApiClearOnce = false
        return
      }

      // Clear API fields when exchange changes, as we rely on "Saved credential"
      // to auto-fill api_key/secret_key. User must re-enter if changing exchange.
      this.$nextTick(() => {
        const fieldsToClear = {
          api_key: undefined,
          secret_key: undefined,
          passphrase: undefined,
          enable_demo_trading: false // Reset demo switch too
        }
        setTimeout(() => {
          this.form.setFieldsValue(fieldsToClear)
        }, 100)
      })
    },
    getPlaceholder (fieldType) {
      const placeholders = {
        okx: { api_key: 'OKX API Key', secret_key: 'OKX Secret Key', passphrase: 'OKX Passphrase' },
        okex: { api_key: 'OKX API Key', secret_key: 'OKX Secret Key', passphrase: 'OKX Passphrase' },
        binance: { api_key: 'Binance API Key', secret_key: 'Binance Secret Key' },
        coinbaseexchange: { api_key: 'Coinbase API Key Name', secret_key: 'Coinbase Private Key', passphrase: 'Coinbase Passphrase' },
        kucoin: { api_key: 'KuCoin API Key', secret_key: 'KuCoin Secret Key', passphrase: 'KuCoin Passphrase' },
        gate: { api_key: 'Gate API Key', secret_key: 'Gate Secret Key' },
        mexc: { api_key: 'MEXC Access Key', secret_key: 'MEXC Secret Key' },
        kraken: { api_key: 'Kraken API Key', secret_key: 'Kraken Private Key' },
        bybit: { api_key: 'Bybit API Key', secret_key: 'Bybit Secret Key' },
        bitget: { api_key: 'Bitget API Key', secret_key: 'Bitget Secret Key', passphrase: 'Bitget Passphrase' }
      }

      const exchangePlaceholders = placeholders[this.currentExchangeId] || {}
      if (exchangePlaceholders[fieldType]) {
        return exchangePlaceholders[fieldType]
      }
      const fieldLabels = {
        'api_key': this.$t('trading-assistant.placeholders.inputApiKey'),
        'secret_key': this.$t('trading-assistant.placeholders.inputSecretKey'),
        'passphrase': this.$t('trading-assistant.placeholders.inputPassphrase')
      }
      return fieldLabels[fieldType] || this.$t('trading-assistant.placeholders.inputApiKey')
    },
    async loadScriptSources () {
      this.loadingScriptSource = true
      try {
        const res = await getScriptSourceList()
        const data = res && res.data
        this.scriptSources = Array.isArray(data)
          ? data
          : ((data && (data.sources || data.items)) || [])
      } catch (e) {
        this.scriptSources = []
        this.$message.warning(this.$t('trading-assistant.form.scriptSourceLoadFailed'))
      } finally {
        this.loadingScriptSource = false
      }
    },
    async handleScriptSourceChange (id) {
      if (!id) {
        this.strategyCode = ''
        this.scriptTemplateKeyForPayload = ''
        this.selectedScriptTemplateParams = {}
        return
      }
      this.loadingScriptSource = true
      try {
        const res = await getScriptSourceDetail(id)
        const source = (res && res.data) || res || {}
        const metadata = source.metadata || {}
        const tc = metadata.last_run_config || {}
        this.strategyCode = source.code || source.strategy_code || ''
        this.scriptTemplateKeyForPayload = source.template_key || (tc.script_template_key ? String(tc.script_template_key) : '')
        this.selectedScriptTemplateParams = {
          ...((metadata && metadata.script_template_params) || {}),
          ...((tc && tc.script_template_params) || {}),
          ...((source && source.template_params) || {})
        }
        this.syncScriptTemplateParamsToForm()
        const nextName = this.buildScriptStrategyDefaultName(this.scriptTemplateKeyForPayload || null)
        const currentName = this.form && this.form.getFieldValue('strategy_name')
        if (!currentName || currentName === this.lastAutoScriptStrategyName || currentName === this.lastAutoStrategyName) {
          this.safeSetFormFields({ strategy_name: nextName })
          this.lastAutoScriptStrategyName = nextName
          this.lastAutoStrategyName = nextName
        }
      } catch (e) {
        this.$message.error(this.$t('trading-assistant.form.scriptSourceLoadFailed'))
      } finally {
        this.loadingScriptSource = false
      }
    },
    async handleNext () {
      // ===== Script mode: code 闂?params 闂?signal/live =====
      if (this.strategyMode === 'script') {
        if (this.currentStep === 0) {
          if (!this.selectedScriptSourceId) {
            this.$message.warning(this.$t('trading-assistant.form.scriptSourceRequired'))
            return
          }
          if (!this.strategyCode) {
            await this.handleScriptSourceChange(this.selectedScriptSourceId)
          }
          if (!this.strategyCode || this.strategyCode.trim().length < 20) {
            this.$message.warning(this.$t('trading-assistant.form.scriptSourceCodeMissing'))
            return
          }
          this.currentStep = 1
          return
        }
        if (this.currentStep === 1) {
          const fieldsToValidate = ['strategy_name', 'symbol', 'initial_capital', 'leverage', 'trade_direction']
          if (this.shouldShowMarketTypeSelector) {
            fieldsToValidate.push('market_type')
          }
          this.form.validateFields(fieldsToValidate, (err) => {
            if (err) return
            try {
              const execMode = this.form.getFieldValue('execution_mode') || 'signal'
              this.executionModeUi = execMode
              const chans = this.form.getFieldValue('notify_channels')
              this.notifyChannelsUi = [...normalizeNotificationChannels(chans)]
            } catch (e) { }
            this.currentStep = 2
          })
        }
        return
      }

      // ===== Signal mode (original logic) =====
      if (this.currentStep === 0) {
        const fieldsToValidate = ['indicator_id', 'strategy_name']
        fieldsToValidate.push('initial_capital', 'leverage', 'trade_direction', 'timeframe')
        if (this.shouldShowMarketTypeSelector) {
          fieldsToValidate.push('market_type')
        } else {
          this.applyMarketDefaultsForCategory(this.selectedMarketCategory)
        }

        const csTypePreview = this.csStrategyTypeUi || 'single'
        if (this.isEditMode && csTypePreview !== 'cross_sectional') {
          fieldsToValidate.push('symbol')
        }
        if (csTypePreview === 'cross_sectional') {
          fieldsToValidate.push('portfolio_size')
        }
        this.form.validateFields(fieldsToValidate, (err, values) => {
          if (err) return

          const csType = (values && values.cs_strategy_type) || this.csStrategyTypeUi || 'single'
          if (csType === 'cross_sectional') {
            if (!this.crossSectionalSymbols || this.crossSectionalSymbols.length < 2) {
              this.$message.warning(this.$t('trading-assistant.validation.symbolListMin'))
              return
            }
          } else if (!this.isEditMode) {
            if (!this.selectedSymbols || this.selectedSymbols.length === 0) {
              this.$message.warning(this.$t('trading-assistant.validation.symbolsRequired'))
              return
            }
          }

          try {
            const marketType = (values && values.market_type) || this.form.getFieldValue('market_type')
            if (marketType === 'spot' || this.isSpotLikeMarket) {
              this.safeSetFormFields({ leverage: 1, trade_direction: 'long' })
            }
          } catch (e) { }

          try {
            const execMode = this.form.getFieldValue('execution_mode') || 'signal'
            this.executionModeUi = execMode
            const chans = this.form.getFieldValue('notify_channels')
            this.notifyChannelsUi = [...normalizeNotificationChannels(chans)]
          } catch (e) { }
          this.currentStep = 1
        })
      }
    },
    handlePrev () {
      if (this.currentStep > 0) {
        this.currentStep--
      }
    },
    async handleSubmit () {
      if (this.currentStep !== this.strategyFormLastStepIndex) {
        return
      }
      this.form.validateFields(async (err, values) => {
        if (!err) {
          try {
            this.saving = true

            if (this.strategyMode === 'script') {
              const notificationConfig = {
                channels: normalizeNotificationChannels(values.notify_channels),
                targets: {
                  email: this.userNotificationSettings.email || '',
                  phone: this.userNotificationSettings.phone || '',
                  telegram: this.userNotificationSettings.telegram_chat_id || '',
                  telegram_bot_token: this.userNotificationSettings.telegram_bot_token || '',
                  discord: this.userNotificationSettings.discord_webhook || '',
                  webhook: this.userNotificationSettings.webhook_url || '',
                  webhook_token: this.userNotificationSettings.webhook_token || ''
                }
              }
              if (!notificationConfig.channels || notificationConfig.channels.length === 0) {
                this.$message.warning(this.$t('trading-assistant.validation.notifyChannelRequired'))
                this.saving = false
                return
              }

              let symbol = values.symbol || ''
              let marketCategory = 'Crypto'
              if (typeof symbol === 'string' && symbol.includes(':')) {
                const idx = symbol.indexOf(':')
                marketCategory = symbol.slice(0, idx) || 'Crypto'
                symbol = symbol.slice(idx + 1)
              }
              this.selectedMarketCategory = marketCategory

              const isLive = this.canUseLiveTrading && (values.execution_mode || 'signal') === 'live'
              if (isLive) {
                const credentialId = values.credential_id
                if (!credentialId) {
                  this.$message.warning(this.$t('trading-assistant.validation.credentialRequired'))
                  this.saving = false
                  return
                }
              }

              const normalizedExec = this.normalizeMarketExecutionFields(marketCategory, values)
              let marketType = normalizedExec.marketType
              let leverage = normalizedExec.leverage
              let tradeDirection = normalizedExec.tradeDirection
              if (this.isLongOnlyBroker && tradeDirection !== 'long') {
                this.$message.warning(
                  this.$t('trading-assistant.form.longOnlyBrokerHint') ||
                  'IBKR / Alpaca currently support long-only trading. Direction set to Long.'
                )
                tradeDirection = 'long'
              }

              const rawPrev = this.editingStrategy && this.editingStrategy.trading_config
              const prevTc = (rawPrev && typeof rawPrev === 'object' && !Array.isArray(rawPrev))
                ? { ...rawPrev }
                : {}
              const investmentAmount = Number(values.initial_capital || 1000)
              if (!this.isValidInvestmentAmount(investmentAmount)) {
                this.$message.warning(this.investmentAmountRangeMessage())
                this.saving = false
                return
              }
              const tradingConfig = {
                ...prevTc,
                runtime_contract_version: 'simple_script_v1',
                initial_capital: investmentAmount,
                investment_amount: investmentAmount,
                leverage,
                trade_direction: tradeDirection,
                timeframe: '1m',
                tick_interval_sec: 10,
                market_type: marketType,
                symbol: symbol,
                script_source_id: this.selectedScriptSourceId || undefined,
                script_role: 'runtime'
              }
              if (this.scriptTemplateKeyForPayload) {
                tradingConfig.script_template_key = this.scriptTemplateKeyForPayload
              } else {
                delete tradingConfig.script_template_key
              }
              if (this.selectedScriptTemplateParams && Object.keys(this.selectedScriptTemplateParams).length) {
                tradingConfig.script_template_params = { ...this.selectedScriptTemplateParams }
              } else {
                delete tradingConfig.script_template_params
              }

              const payload = {
                strategy_name: values.strategy_name,
                strategy_type: 'ScriptStrategy',
                strategy_mode: 'script',
                strategy_code: '',
                market_category: marketCategory,
                execution_mode: values.execution_mode || 'signal',
                notification_config: notificationConfig,
                exchange_config: isLive ? this.buildLiveExchangeConfig(values) : undefined,
                trading_config: tradingConfig
              }

              let res
              if (this.editingStrategy) {
                res = await updateStrategy(this.editingStrategy.id, payload)
              } else {
                payload.user_id = 1
                res = await createStrategy(payload)
              }
              if (res.code === 1) {
                this.$message.success(
                  this.editingStrategy
                    ? this.$t('trading-assistant.messages.updateSuccess')
                    : this.$t('trading-assistant.messages.createSuccess')
                )
                this.handleRefresh()
              } else {
                this.$message.error(
                  res.msg || (this.editingStrategy
                    ? this.$t('trading-assistant.messages.updateFailed')
                    : this.$t('trading-assistant.messages.createFailed'))
                )
              }
              this.saving = false
              this.showFormModal = false
              return
            }

            // ===== Signal Strategy Submit (original logic) =====
            const isLive = this.canUseLiveTrading && values.execution_mode === 'live'

            if (isLive) {
              const credentialId = values.credential_id
              if (!credentialId) {
                this.$message.warning(this.$t('trading-assistant.validation.credentialRequired'))
                this.saving = false
                return
              }
            }

            const notificationConfig = {
              channels: values.notify_channels || [],
              targets: {
                email: this.userNotificationSettings.email || '',
                phone: this.userNotificationSettings.phone || '',
                telegram: this.userNotificationSettings.telegram_chat_id || '',
                telegram_bot_token: this.userNotificationSettings.telegram_bot_token || '',
                discord: this.userNotificationSettings.discord_webhook || '',
                webhook: this.userNotificationSettings.webhook_url || '',
                webhook_token: this.userNotificationSettings.webhook_token || ''
              }
            }
            if (!notificationConfig.channels || notificationConfig.channels.length === 0) {
              this.$message.warning(this.$t('trading-assistant.validation.notifyChannelRequired'))
              this.saving = false
              return
            }

            const indicatorIdStr = String(values.indicator_id)
            const indicator = this.availableIndicators.find(ind => String(ind.id) === indicatorIdStr)
            if (!indicator) {
              this.$message.error(this.$t('trading-assistant.validation.indicatorRequired'))
              this.saving = false
              return
            }

            // AI filter values: source of truth is the reactive UI state to avoid rc-form edge cases.
            const enableAiFilter = !!this.aiFilterEnabledUi

            const rawMarketType = (values.market_type === 'futures' ? 'swap' : (values.market_type || 'swap'))
            const normalizedExec = this.normalizeMarketExecutionFields(this.selectedMarketCategory || 'Crypto', values)
            let marketType = normalizedExec.marketType
            let leverage = normalizedExec.leverage
            let tradeDirection = normalizedExec.tradeDirection

            // Hard guard: Alpaca crypto desk is spot-only.  Even if the user
            // bypasses the disabled radio (devtools, stale form state), the
            // worker would reject swap orders at runtime 闂?coerce here so
            // the saved strategy matches what will actually execute.
            if (this.isAlpacaCryptoSpotOnly && rawMarketType !== 'spot') {
              this.$message.warning(
                this.$t('trading-assistant.form.alpacaCryptoSpotOnlyHint') ||
                'Alpaca crypto desk is spot-only. Market type forced to Spot.'
              )
            }

            if (marketType === 'spot') {
              this.$message.info(this.$t('trading-assistant.messages.spotLimitations'))
            }

            // Hard guard: long-only brokers (IBKR / Alpaca). Even if the user
            // bypasses the disabled radio (devtools, stale form state),
            // the worker would reject short signals at runtime 闂?coerce here
            // so the saved strategy matches what will actually execute.
            if (this.isLongOnlyBroker && tradeDirection !== 'long') {
              this.$message.warning(
                this.$t('trading-assistant.form.longOnlyBrokerHint') ||
                'IBKR / Alpaca currently support long-only trading. Direction set to Long.'
              )
              tradeDirection = 'long'
            }

            const csType = values.cs_strategy_type || this.csStrategyTypeUi || 'single'
            const isCrossSectional = csType === 'cross_sectional'
            const indicatorCode = this.crossSectionalIndicatorCodeOverride || indicator.code || ''

            if (isCrossSectional) {
              if (!this.crossSectionalSymbols || this.crossSectionalSymbols.length < 2) {
                this.$message.warning(this.$t('trading-assistant.validation.symbolListMin'))
                this.saving = false
                return
              }
              if (!indicatorCode.includes('scores')) {
                this.$message.warning(this.$t('trading-assistant.form.crossSectionalIndicatorWarn'))
                this.saving = false
                return
              }
            }

            const riskFromCode = this.buildRiskPositionFromIndicatorCode(indicatorCode)
            const investmentAmount = Number(values.initial_capital || 1000)
            if (!this.isValidInvestmentAmount(investmentAmount)) {
              this.$message.warning(this.investmentAmountRangeMessage())
              this.saving = false
              return
            }
            const prevTc = this.editingStrategy && this.editingStrategy.trading_config
              ? this.editingStrategy.trading_config
              : {}
            const scaleReduceFlat = this.extractScaleReduceFlatFromTradingConfig(prevTc)

            let longRatio = values.long_ratio != null ? Number(values.long_ratio) : 1
            if (marketType === 'spot') {
              longRatio = 1
            }

            const tradingConfigBase = {
              initial_capital: investmentAmount,
              leverage: leverage,
              trade_direction: tradeDirection,
              timeframe: values.timeframe,
              market_type: marketType,
              margin_mode: 'cross',
              signal_mode: 'confirmed',
              strict_mode: values.strict_mode !== false,
              take_profit_pct: riskFromCode.take_profit_pct,
              stop_loss_pct: riskFromCode.stop_loss_pct,
              trailing_enabled: riskFromCode.trailing_enabled,
              trailing_stop_pct: riskFromCode.trailing_stop_pct,
              trailing_activation_pct: riskFromCode.trailing_activation_pct,
              entry_pct: riskFromCode.entry_pct,
              ...scaleReduceFlat,
              commission: values.commission || 0,
              slippage: values.slippage || 0,
              enable_ai_filter: enableAiFilter,
              indicator_params: this.indicatorParamValues,
              cs_strategy_type: csType,
              strategy_type: isCrossSectional ? 'cross_sectional' : 'single'
            }

            if (isCrossSectional) {
              tradingConfigBase.symbol_list = [...this.crossSectionalSymbols]
              tradingConfigBase.portfolio_size = values.portfolio_size
              tradingConfigBase.long_ratio = longRatio
              tradingConfigBase.rebalance_frequency = values.rebalance_frequency || 'daily'
            }

            const basePayload = {
              strategy_name: values.strategy_name,
              market_category: this.selectedMarketCategory || 'Crypto',
              execution_mode: values.execution_mode || 'signal',
              notification_config: notificationConfig,
              indicator_config: {
                indicator_id: indicator.id,
                indicator_name: indicator.name,
                indicator_code: indicatorCode
              },
              exchange_config: isLive ? this.buildLiveExchangeConfig(values) : undefined,
              trading_config: tradingConfigBase
            }

            if (isCrossSectional) {
              basePayload.cs_strategy_type = 'cross_sectional'
              basePayload.symbol_list = [...this.crossSectionalSymbols]
              basePayload.portfolio_size = values.portfolio_size
              basePayload.long_ratio = longRatio
              basePayload.rebalance_frequency = values.rebalance_frequency || 'daily'
            }

            let res
            if (this.editingStrategy) {
              if (isCrossSectional) {
                const first = this.crossSectionalSymbols[0] || ''
                if (typeof first === 'string' && first.includes(':')) {
                  const idx = first.indexOf(':')
                  basePayload.market_category = first.slice(0, idx) || basePayload.market_category
                  basePayload.trading_config.symbol = first.slice(idx + 1)
                } else {
                  basePayload.trading_config.symbol = first
                }
              } else {
                let parsedSymbol = values.symbol
                if (typeof parsedSymbol === 'string' && parsedSymbol.includes(':')) {
                  const idx = parsedSymbol.indexOf(':')
                  basePayload.market_category = parsedSymbol.slice(0, idx) || basePayload.market_category
                  parsedSymbol = parsedSymbol.slice(idx + 1)
                }
                basePayload.trading_config.symbol = parsedSymbol
              }
              res = await updateStrategy(this.editingStrategy.id, basePayload)
            } else if (isCrossSectional) {
              basePayload.user_id = 1
              basePayload.strategy_type = 'IndicatorStrategy'
              res = await createStrategy(basePayload)
            } else {
              basePayload.user_id = 1
              basePayload.strategy_type = 'IndicatorStrategy'
              basePayload.symbols = this.selectedSymbols
              res = await batchCreateStrategies(basePayload)
            }

            if (res.code === 1) {
              if (this.isEditMode) {
                this.$message.success(this.$t('trading-assistant.messages.updateSuccess'))
              } else if (isCrossSectional) {
                this.$message.success(this.$t('trading-assistant.messages.crossSectionalCreateSuccess'))
              } else {
                const totalCreated = res.data?.total_created || this.selectedSymbols.length
                this.$message.success(this.$t('trading-assistant.messages.batchCreateSuccess', { count: totalCreated }))
              }
              // Credentials are managed in Broker Accounts; no inline save needed.
              this.handleRefresh()
            } else {
              this.$message.error(res.msg || (this.isEditMode ? this.$t('trading-assistant.messages.updateFailed') : this.$t('trading-assistant.messages.createFailed')))
            }
          } catch (error) {
            this.$message.error(this.isEditMode ? this.$t('trading-assistant.messages.updateFailed') : this.$t('trading-assistant.messages.createFailed'))
          } finally {
            this.saving = false
          }
        }
      })
    },
    getFormValues () {
      return new Promise((resolve, reject) => {
        this.form.validateFields((err, values) => {
          if (err) {
            reject(err)
          } else {
            resolve(values)
          }
        })
      })
    },
    getDropdownContainer (triggerNode) {
      return document.body
    }
  }
}

</script>

<style lang="less" scoped>
.script-source-preview {
  margin: 8px 0 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.script-source-preview__title {
  font-weight: 700;
  color: #172033;
}

.script-source-preview__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
}

.top-level-tabs {
  ::v-deep .ant-tabs-bar {
    margin-bottom: 16px;
    border-bottom: 1px solid #e8e8e8;
  }
  ::v-deep .ant-tabs-tab {
    font-size: 15px;
    padding: 12px 20px;
  }
}
.theme-dark .top-level-tabs {
  ::v-deep .ant-tabs-bar {
    border-bottom-color: #303030;
  }
  ::v-deep .ant-tabs-tab {
    color: rgba(255,255,255,0.65);
  }
  ::v-deep .ant-tabs-tab-active {
    color: var(--primary-color-active, #177ddc);
  }
  ::v-deep .ant-tabs-ink-bar {
    background: var(--primary-color-active, #177ddc);
  }
}

.assistant-page-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 14px;
  border-radius: 12px;
  border: 1px solid transparent;

  &--signal {
    background: linear-gradient(90deg, rgba(22, 119, 255, 0.1) 0%, rgba(22, 119, 255, 0.03) 100%);
    border-color: rgba(22, 119, 255, 0.18);

    .assistant-page-banner-badge {
      background: rgba(22, 119, 255, 0.14);
      color: #1677ff;
    }
  }

  &--script {
    background: linear-gradient(90deg, rgba(114, 46, 209, 0.1) 0%, rgba(114, 46, 209, 0.03) 100%);
    border-color: rgba(114, 46, 209, 0.18);

    .assistant-page-banner-badge {
      background: rgba(114, 46, 209, 0.14);
      color: #722ed1;
    }
  }
}

.assistant-page-banner-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.assistant-page-banner-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.assistant-page-banner-desc {
  font-size: 13px;
  line-height: 1.5;
  color: #475569;
}

.assistant-guide-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 18px;
  margin-bottom: 16px;
  border: 1px solid rgba(24, 144, 255, 0.14);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.08) 0%, rgba(114, 46, 209, 0.06) 100%);

  .assistant-guide-copy {
    min-width: 0;
    flex: 1 1 240px;
  }

  .assistant-guide-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    margin-bottom: 8px;
    border-radius: 999px;
    background: rgba(24, 144, 255, 0.12);
    color: #1677ff;
    font-size: 12px;
    font-weight: 600;
  }

  .assistant-guide-title {
    font-size: 16px;
    font-weight: 700;
    color: #1f2937;
  }

  .assistant-guide-desc {
    margin-top: 4px;
    color: #475569;
    line-height: 1.6;
  }

  .assistant-guide-steps {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    flex: 1 1 520px;
  }

  .assistant-step-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-height: 92px;
    padding: 12px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.66);
    border: 1px solid rgba(148, 163, 184, 0.16);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  }

  .assistant-step-index {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: linear-gradient(135deg, #1677ff 0%, #6d28d9 100%);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .assistant-step-body {
    min-width: 0;
  }

  .assistant-step-title {
    font-size: 13px;
    font-weight: 700;
    color: #1f2937;
  }

  .assistant-step-desc {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.6;
    color: #64748b;
  }

  .assistant-guide-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;

    .assistant-guide-close {
      min-width: 36px;
      width: 36px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-color: rgba(148, 163, 184, 0.28);
      color: #64748b;
      background: rgba(255, 255, 255, 0.72);

      &:hover,
      &:focus {
        color: #1677ff;
        border-color: rgba(24, 144, 255, 0.35);
        background: #fff;
      }
    }
  }
}

.strategy-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 16px 32px;
  text-align: center;

  .strategy-empty-desc {
    max-width: 420px;
    color: #475569;
    line-height: 1.7;
  }

  .strategy-empty-path {
    font-size: 12px;
    color: #64748b;
  }
}

@primary-color: #1890ff;
@primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
@success-color: #0ecb81;
@danger-color: #f6465d;
@warning-color: #f0b90b;
@card-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
@card-shadow-hover: 0 8px 32px rgba(0, 0, 0, 0.12);
@border-radius-lg: 16px;
@border-radius-md: 12px;
@border-radius-sm: 8px;

.trading-assistant {
  padding: 0px;
  min-height: calc(100vh - 120px);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);

  .strategy-layout {
    min-height: calc(100vh - 120px);
    align-items: stretch;
  }

  @media (max-width: 768px) {
    min-height: auto;
    margin: -24px;

    .assistant-guide-bar {
      flex-direction: column;
      align-items: stretch;
      margin: 0 12px 12px;
      padding: 14px;

      .assistant-guide-steps {
        grid-template-columns: 1fr;
      }

      .assistant-guide-actions {
        width: 100%;

        .ant-btn {
          flex: 1;
        }
      }
    }

    .strategy-layout {
      height: auto;
      min-height: calc(100vh - 120px);
    }

    .strategy-list-col {
      margin-bottom: 12px;
      height: auto;
      max-height: 50vh;

      .strategy-list-card {
        height: auto;
        max-height: 50vh;

        .card-title {
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px 16px;

          span {
            font-size: 14px;
            font-weight: 600;
          }

          .ant-btn {
            font-size: 12px;
            padding: 0 10px;
            height: 28px;
            line-height: 28px;
          }
        }

        ::v-deep .ant-card-body {
          max-height: calc(50vh - 60px);
          overflow-y: auto;
          padding: 8px;
          -webkit-overflow-scrolling: touch;
        }

        ::v-deep .ant-card-head {
          padding: 0;
          min-height: 48px;
        }

        .strategy-list-item {
          padding: 12px 8px;
          margin-bottom: 4px;
          border-radius: 8px;

          ::v-deep .ant-list-item-meta {
            width: 100%;
          }

          ::v-deep .ant-list-item-action {
            margin-left: 8px;
          }

          .strategy-item-header {
            width: 100%;

            .strategy-name-wrapper {
              width: 100%;
              display: flex;
              align-items: center;
              gap: 6px;
              margin-bottom: 6px;
              flex-wrap: wrap;

              .strategy-type-tag {
                font-size: 10px;
                padding: 2px 6px;
                line-height: 1.4;
                margin: 0;
              }

              .exchange-tag {
                font-size: 10px;
                padding: 2px 6px;
                line-height: 1.4;
                margin: 0;

                .anticon {
                  font-size: 10px;
                  margin-right: 2px;
                }
              }

              .strategy-name {
                font-size: 14px;
                font-weight: 600;
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }
          }

          ::v-deep .ant-list-item-meta-description {
            .strategy-item-info {
              display: flex !important;
              flex-direction: row;
              align-items: center;
              gap: 6px;
              margin-top: 4px;
              font-size: 11px;
              flex-wrap: wrap;

              .info-item {
                display: flex;
                align-items: center;
                gap: 3px;
                flex-shrink: 0;
                font-size: 11px;

                .anticon {
                  font-size: 11px;
                }
              }

              .status-label {
                font-size: 10px;
                padding: 2px 6px;
                line-height: 1.4;
              }
            }
          }
        }
      }
    }

    .strategy-detail-col {
      height: auto;
      min-height: calc(50vh - 60px);

      .strategy-detail-panel {
        gap: 12px;

        .strategy-header-card {
          ::v-deep .ant-card-body {
            padding: 16px 12px;
          }

          ::v-deep .ant-card-head {
            padding: 0;
          }

          .strategy-header {
            flex-direction: column;
            gap: 12px;

            .header-left {
              width: 100%;

              .strategy-title {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 12px;
                line-height: 1.4;
                word-break: break-word;
              }

              .strategy-meta {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                align-items: start;

                ::v-deep .ant-tag {
                  grid-column: 1 / -1;
                  justify-self: start;
                  margin: 0;
                  font-size: 11px;
                  padding: 4px 8px;
                }

                .meta-item {
                  display: flex;
                  align-items: flex-start;
                  gap: 4px;
                  font-size: 12px;
                  line-height: 1.5;
                  word-break: break-word;

                  .anticon {
                    font-size: 12px;
                    flex-shrink: 0;
                    margin-top: 2px;
                  }

                  &>span {
                    word-break: break-word;
                    line-height: 1.5;
                    flex: 1;
                  }

                  span:not(.anticon) {
                    display: inline;
                    word-break: break-word;
                    overflow-wrap: break-word;
                  }
                }

                @media (max-width: 480px) {
                  grid-template-columns: 1fr;

                  ::v-deep .ant-tag {
                    grid-column: 1;
                  }
                }
              }
            }

            .header-right {
              width: 100%;
              display: flex;
              justify-content: flex-start;
              gap: 8px;
              flex-wrap: wrap;

              .ant-btn {
                flex: 1;
                min-width: 100px;
                font-size: 13px;
                padding: 0 12px;
                height: 36px;
                line-height: 36px;

                .anticon {
                  margin-right: 4px;
                }
              }
            }
          }
        }

        .strategy-content-card {
          ::v-deep .ant-card-body {
            padding: 12px 8px;
            overflow-x: hidden;
          }

          ::v-deep .ant-card-head {
            padding: 0 8px;
          }

          ::v-deep .ant-tabs {
            .ant-tabs-nav {
              padding: 0 4px;

              .ant-tabs-tab {
                font-size: 13px;
                padding: 8px 10px;
                margin: 0 2px;
                white-space: nowrap;
              }
            }

            .ant-tabs-content {
              padding-top: 12px;
              overflow-x: hidden;

              .ant-tabs-tabpane {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
              }
            }
          }
        }
      }
    }
  }

  @media (max-width: 480px) {
    .strategy-list-col {
      max-height: 45vh;

      .strategy-list-card {
        max-height: 45vh;

        ::v-deep .ant-card-body {
          max-height: calc(45vh - 60px);
        }
      }
    }

    .strategy-detail-col {
      .strategy-detail-panel {
        .strategy-header-card {
          .strategy-header {
            .header-left {
              .strategy-meta {
                grid-template-columns: 1fr;
                gap: 6px;

                .meta-item {
                  font-size: 11px;
                  line-height: 1.6;
                }
              }
            }

            .header-right {
              .ant-btn {
                width: 100%;
                flex: none;
              }
            }
          }
        }
      }
    }
  }

  .strategy-list-col {
    height: 100%;
    display: flex;
    flex-direction: column;

    .strategy-list-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      border-radius: @border-radius-lg;
      box-shadow: @card-shadow;
      border: none;
      overflow: hidden;
      transition: box-shadow 0.3s ease;

      &:hover {
        box-shadow: @card-shadow-hover;
      }

      .card-title {
        display: flex;
        justify-content: space-between;
        align-items: center;

        span {
          font-size: 16px;
          font-weight: 700;
          background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ant-btn-primary {
          border-radius: @border-radius-sm;
          background: linear-gradient(135deg, @primary-color 0%, var(--primary-color-hover, #40a9ff) 100%);
          border: none;
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.35);
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(24, 144, 255, 0.45);
          }
        }
      }

      .group-mode-switch {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0 12px;
        border-bottom: 1px solid #f0f0f0;
        margin-bottom: 12px;

        .group-mode-label {
          font-size: 13px;
          color: #8c8c8c;
          font-weight: 500;
        }

        ::v-deep .ant-radio-group {
          .ant-radio-button-wrapper {
            font-size: 12px;
            padding: 0 10px;
            height: 26px;
            line-height: 24px;
            border-radius: 4px;

            &:first-child {
              border-radius: 4px 0 0 4px;
            }

            &:last-child {
              border-radius: 0 4px 4px 0;
            }

            .anticon {
              margin-right: 4px;
            }
          }
        }
      }

      ::v-deep .ant-card-body {
        flex: 1;
        overflow-y: auto;
        background: #fff;
        padding: 12px;
      }

      ::v-deep .ant-card-head {
        background: linear-gradient(180deg, #fff 0%, #fafbfc 100%);
        border-bottom: 1px solid #f0f0f0;
      }

      .strategy-grouped-list {
        .strategy-group {
          margin-bottom: 12px;
          background: #fff;
          border-radius: @border-radius-md;
          border: 1px solid #e8ecf1;
          overflow: hidden;

          .strategy-group-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            cursor: pointer;
            transition: all 0.2s ease;

            &:hover {
              background: linear-gradient(135deg, #e8f4fd 0%, #e3f0fc 100%);
            }

            .group-header-left {
              display: flex;
              align-items: center;
              gap: 8px;
              flex: 1;
              min-width: 0;

              .collapse-icon {
                font-size: 12px;
                color: #8c8c8c;
                transition: transform 0.2s ease;
              }

              .group-icon {
                font-size: 16px;
                color: @primary-color;
              }

              .group-name {
                font-weight: 600;
                font-size: 14px;
                color: #1e3a5f;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }

            .group-header-right {
              display: flex;
              align-items: center;
              gap: 8px;

              .group-status {
                font-size: 11px;
                padding: 2px 8px;
                border-radius: 10px;

                &.running {
                  background: rgba(14, 203, 129, 0.1);
                  color: @success-color;
                }

                &.stopped {
                  background: rgba(246, 70, 93, 0.1);
                  color: @danger-color;
                }
              }
            }
          }

          .strategy-group-content {
            padding: 6px 8px 10px 6px;

            .strategy-list-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 8px;
              padding: 10px 12px;
              margin-bottom: 6px;
              margin-left: 4px;
              border: 1px solid #eef2f6;
              border-left: 3px solid #dbe4ee;
              background: #fbfcfe;
              border-radius: @border-radius-sm;
              box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);

              &:last-child {
                margin-bottom: 0;
              }

              &:hover {
                background: #f0f7ff;
                border-left-color: @primary-color;
                border-color: rgba(24, 144, 255, 0.22);
                box-shadow: 0 2px 8px rgba(24, 144, 255, 0.08);
                transform: none;
              }

              &.active {
                background: linear-gradient(135deg, #e8f4ff 0%, #f0f9ff 100%);
                border-color: rgba(24, 144, 255, 0.35);
                border-left-color: @primary-color;
                border-left-width: 3px;
                box-shadow: 0 2px 12px rgba(24, 144, 255, 0.12);
              }

              .strategy-item-content {
                flex: 1;
                min-width: 0;
              }

              .strategy-item-header {
                align-items: flex-start;
                width: 100%;
              }

              .strategy-item-actions {
                flex-shrink: 0;
                display: flex;
                align-items: center;
                align-self: center;
                padding-top: 0;
                margin-left: 4px;

                ::v-deep .ant-btn {
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                }
              }

              .strategy-item-info {
                display: flex;
                gap: 8px;
                align-items: center;
                flex-wrap: wrap;
                margin-top: 4px;
                font-size: 12px;
                color: #8c8c8c;

                .info-item {
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                  white-space: nowrap;

                  .anticon {
                    font-size: 12px;
                  }
                }

                .status-label {
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;
                  padding: 3px 10px;
                  border-radius: 16px;
                  font-size: 11px;
                  font-weight: 600;
                  line-height: 1;
                  border: 1px solid transparent;
                  flex-shrink: 0;
                  background: linear-gradient(135deg, #f0f2f5 0%, #e8eaed 100%);
                  color: #595959;

                  &::before {
                    content: '';
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: currentColor;
                  }
                }

                .status-running {
                  background: linear-gradient(135deg, rgba(14, 203, 129, 0.15) 0%, rgba(14, 203, 129, 0.08) 100%);
                  color: @success-color;
                  border-color: rgba(14, 203, 129, 0.3);
                }

                .status-stopped {
                  background: linear-gradient(135deg, rgba(246, 70, 93, 0.15) 0%, rgba(246, 70, 93, 0.08) 100%);
                  color: @danger-color;
                  border-color: rgba(246, 70, 93, 0.3);
                }

                .status-error {
                  background: linear-gradient(135deg, rgba(255, 77, 79, 0.15) 0%, rgba(255, 77, 79, 0.08) 100%);
                  color: #ff4d4f;
                  border-color: rgba(255, 77, 79, 0.3);
                }
              }

              &.strategy-list-item--strategy-group {
                .strategy-item-header {
                  margin-bottom: 2px;
                }

                .strategy-name-wrapper {
                  flex-wrap: nowrap;
                  align-items: center;
                  gap: 8px;
                }

                .strategy-name {
                  flex: 1;
                  min-width: 0;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }

                .strategy-item-info {
                  gap: 10px;
                }
              }
            }
          }
        }
      }

      .strategy-list-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 14px 16px;
        border-radius: @border-radius-md;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        margin-bottom: 8px;
        background: #fafbfc;
        border: 1px solid transparent;

        .strategy-item-content {
          flex: 1;
          min-width: 0;
        }

        .strategy-item-actions {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          align-self: center;
          margin-left: 4px;

          ::v-deep .ant-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
        }

        .strategy-item-info {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          margin-top: 4px;
          font-size: 12px;
          color: #8c8c8c;

          .info-item {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;

            .anticon {
              font-size: 12px;
            }
          }

          .status-label {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 3px 10px;
            border-radius: 16px;
            font-size: 11px;
            font-weight: 600;
            line-height: 1;
            border: 1px solid transparent;
            flex-shrink: 0;
            background: linear-gradient(135deg, #f0f2f5 0%, #e8eaed 100%);
            color: #595959;

            &::before {
              content: '';
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: currentColor;
            }
          }

          .status-running {
            background: linear-gradient(135deg, rgba(14, 203, 129, 0.15) 0%, rgba(14, 203, 129, 0.08) 100%);
            color: @success-color;
            border-color: rgba(14, 203, 129, 0.3);
          }

          .status-stopped {
            background: linear-gradient(135deg, rgba(246, 70, 93, 0.15) 0%, rgba(246, 70, 93, 0.08) 100%);
            color: @danger-color;
            border-color: rgba(246, 70, 93, 0.3);
          }

          .status-error {
            background: linear-gradient(135deg, rgba(255, 77, 79, 0.15) 0%, rgba(255, 77, 79, 0.08) 100%);
            color: #ff4d4f;
            border-color: rgba(255, 77, 79, 0.3);
          }
        }

        &:hover {
          background: linear-gradient(135deg, #f0f7ff 0%, #f5f9ff 100%);
          border-color: rgba(24, 144, 255, 0.2);
          transform: none;
          box-shadow: 0 2px 12px rgba(24, 144, 255, 0.1);
        }

        &.active {
          background: linear-gradient(135deg, #e6f4ff 0%, #f0f9ff 100%);
          border-color: @primary-color;
          border-left: 4px solid @primary-color;
          box-shadow: 0 4px 16px rgba(24, 144, 255, 0.15);
        }

        @media (max-width: 768px) {
          padding: 12px 8px;
          margin: 0 4px 4px 4px;

          &.active {
            border-left-width: 2px;
          }
        }

        .strategy-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .strategy-name-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
            min-width: 0;

            .strategy-name {
              font-weight: 600;
              font-size: 14px;
              flex-shrink: 0;
              color: #1e3a5f;
              transition: color 0.2s ease;
            }

            .exchange-tag {
              flex-shrink: 0;
              display: inline-flex;
              align-items: center;
              font-size: 11px;
              line-height: 1.5;
              padding: 2px 8px;
              border-radius: 6px;
              background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
              border: 1px solid rgba(102, 126, 234, 0.2);
              color: #667eea;
              transition: all 0.2s ease;

              .anticon {
                font-size: 11px;
              }
            }

            .strategy-type-tag {
              flex-shrink: 0;
              display: inline-flex;
              align-items: center;
              font-size: 10px;
              line-height: 1.5;
              margin-left: 4px;
              padding: 2px 8px;
              border-radius: 6px;
              background: linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(103, 58, 183, 0.1) 100%);
              border: 1px solid rgba(156, 39, 176, 0.2);

              .anticon {
                font-size: 10px;
                margin-right: 3px;
              }
            }

            &.strategy-name-wrapper--grouped {
              flex-wrap: wrap;
              align-items: flex-start;
              align-content: flex-start;
              row-gap: 6px;
              column-gap: 6px;
              width: 100%;

              ::v-deep .ant-tag {
                margin-right: 0;
              }

              .status-label {
                flex-shrink: 0;
              }
            }
          }

          ::v-deep .status-stopped {
            color: @danger-color !important;
            border-color: @danger-color !important;
          }
        }

        ::v-deep .ant-list-item-meta-description {
          max-width: calc(100% - 20px); // 闂傚倸鍊峰鎺旀椤旀儳绶ゅΔ锝呭暞閸嬶繝鏌曟径鍡樻珔闁告俺顫夐妵鍕箻鐠虹洅銉╂煟椤撶喓顣茬紒缁樼☉椤斿繘顢欓懡銈呭毈闂備焦瀵х粙鎾诲窗閹捐埖顫曢柟鎯х摠婵挳鏌涢敂璇插箺闁革急鍥ㄥ仭婵犲﹤瀚欢鏌ユ煙鐠囇呯？缂侇噮鍙冮幃銏犆虹紒妯烆亪姊绘担鐑樺殌闁靛牊鎮傚銊╂焼瀹ュ懐顔嗛梺鍛婁緱閸欏酣鎮￠妷鈺傜厱闁哄洢鍔屾禍鐐翠繆椤栨碍顥㈡慨濠勭帛閹峰懘鎼圭憴鍕晵闂備礁鎽滄慨鐢告偋閻樿崵宓侀煫鍥ㄦ煥椤曢亶鎮楀☉娆樼劷闁告柨鐏氱换婵嬪閿濆棛銆愬銈忛檮婵炲﹤鐣烽姀銈庢晢闁告洦鍋嗘鍥⒑閸撴彃浜剧紓宥呮椤洭骞囬婊€绨?
          overflow: hidden;

          .strategy-item-info {
            display: flex !important;
            gap: 12px; // 闂傚倸鍊风粈渚€骞夐敓鐘插瀭闁汇垹鐏氬畷鏌ユ煙閹殿喖顣奸柛搴＄У閵囧嫰骞掗幋婵愪痪闂佹娊鏀辩敮鐐烘儉椤忓牆绠氱憸婊堝磿閹达附鐓?
            margin-top: 8px;
            font-size: 12px;
            color: var(--text-color-secondary, #8c8c8c);
            align-items: center;
            flex-wrap: nowrap; // 缂傚倸鍊搁崐椋庣矆娓氣偓瀹曟劙鎮滈懞銉モ偓鍧楁煥閺囩偛浜為柡浣告缁绘盯骞嬪▎蹇曚患缂備胶濮甸悡锟犲蓟閺囷紕鐤€闁靛／鍛咃綁姊虹悰鈥充壕?
            max-width: 100%;
            overflow: hidden;

            .status-label {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 4px 12px;
              border-radius: 16px;
              font-size: 11px;
              font-weight: 600;
              line-height: 1;
              border: 1px solid transparent;
              flex-shrink: 0;
              background: linear-gradient(135deg, #f0f2f5 0%, #e8eaed 100%);
              color: #595959;
              transition: all 0.2s ease;

              &::before {
                content: '';
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: currentColor;
              }
            }

            .status-running {
              background: linear-gradient(135deg, rgba(14, 203, 129, 0.15) 0%, rgba(14, 203, 129, 0.08) 100%);
              color: @success-color;
              border-color: rgba(14, 203, 129, 0.3);
              box-shadow: 0 2px 8px rgba(14, 203, 129, 0.2);

              &::before {
                animation: statusPulse 2s infinite;
                box-shadow: 0 0 8px @success-color;
              }
            }

            .status-stopped {
              background: linear-gradient(135deg, rgba(246, 70, 93, 0.15) 0%, rgba(246, 70, 93, 0.08) 100%);
              color: @danger-color;
              border-color: rgba(246, 70, 93, 0.3);
            }

            .status-error {
              background: linear-gradient(135deg, rgba(255, 77, 79, 0.15) 0%, rgba(255, 77, 79, 0.08) 100%);
              color: #ff4d4f;
              border-color: rgba(255, 77, 79, 0.3);
            }

            @keyframes statusPulse {

              0%,
              100% {
                opacity: 1;
              }

              50% {
                opacity: 0.5;
              }
            }

            .info-item {
              display: flex;
              align-items: center;
              gap: 4px;
              flex-shrink: 1;
              min-width: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;

              &.strategy-name-text {
                font-weight: 500;
                color: #1e3a5f;
                max-width: 100%;
                white-space: normal;
                line-height: 1.35;
              }
            }

            ::v-deep .ant-tag {
              margin-right: 0;
              font-size: 11px;
              line-height: 18px;
              padding: 0 6px;
            }
          }
        }
      }
    }
  }

  .strategy-detail-col {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;

    .strategy-empty-detail {
      flex: 1;
      min-height: 320px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }

    .strategy-empty-detail-card {
      max-width: 420px;
      width: 100%;
      text-align: center;
      padding: 40px 32px 36px;
      border-radius: @border-radius-lg;
      background: linear-gradient(165deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%);
      border: 1px solid #e8ecf1;
      box-shadow: @card-shadow;
    }

    .strategy-empty-detail-icon {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(24, 144, 255, 0.12) 0%, rgba(64, 169, 255, 0.08) 100%);
      color: @primary-color;
      font-size: 32px;
    }

    .strategy-empty-detail-title {
      margin: 0 0 12px;
      font-size: 18px;
      font-weight: 700;
      color: #1e3a5f;
      letter-spacing: 0.02em;
    }

    .strategy-empty-detail-hint {
      margin: 0 0 24px;
      font-size: 14px;
      line-height: 1.65;
      color: #64748b;
    }

    .strategy-empty-detail-actions {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .strategy-detail-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-height: 100%;

      .strategy-header-card {
        flex-shrink: 0; // 闂傚倸鍊搁崐鎼佸磹閹间礁鐤い鎰╁焺閸ゆ洟鏌涢锝嗗闁轰礁妫欑换娑㈠箣閻愬灚鍣х紓浣稿閸嬨倝寮婚悢铏圭＜闁靛繒濮甸悘鍫ユ⒑閸涘﹥鐓熼柛搴ｆ暬楠炲啰鎹勬笟顖涘兊闂佺粯鎸哥花鑲╄姳婵犳碍鐓熼柕蹇婃櫅閻忕姵绻涚仦鍌氬婵?        background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
        border: none;
        border-radius: @border-radius-lg;
        box-shadow: @card-shadow;
        transition: all 0.3s ease;

        &:hover {
          box-shadow: @card-shadow-hover;
        }

        ::v-deep .ant-card-head {
          background: transparent;
          border-bottom: none;
        }

        ::v-deep .ant-card-body {
          background: transparent;
          padding: 20px;
        }

        .strategy-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;

          .header-left {
            flex: 1;
            min-width: 0;

            .strategy-title-row {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 16px;
              flex-wrap: wrap;

              .strategy-title {
                font-size: 20px;
                font-weight: 700;
                margin: 0;
                background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              }

              .status-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.3s ease;

                .status-dot {
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  animation: pulse 2s infinite;
                }

                &.status-running {
                  background: linear-gradient(135deg, rgba(14, 203, 129, 0.15) 0%, rgba(14, 203, 129, 0.08) 100%);
                  color: @success-color;
                  border: 1px solid rgba(14, 203, 129, 0.3);

                  .status-dot {
                    background: @success-color;
                    box-shadow: 0 0 12px @success-color;
                  }
                }

                &.status-stopped {
                  background: linear-gradient(135deg, rgba(246, 70, 93, 0.15) 0%, rgba(246, 70, 93, 0.08) 100%);
                  color: @danger-color;
                  border: 1px solid rgba(246, 70, 93, 0.3);

                  .status-dot {
                    background: @danger-color;
                    animation: none;
                  }
                }

                &.status-error {
                  background: linear-gradient(135deg, rgba(255, 77, 79, 0.15) 0%, rgba(255, 77, 79, 0.08) 100%);
                  color: #ff4d4f;
                  border: 1px solid rgba(255, 77, 79, 0.3);

                  .status-dot {
                    background: #ff4d4f;
                    animation: none;
                  }
                }
              }
            }

            .key-stats-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
              margin-bottom: 14px;

              .stat-card {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                background: #fff;
                border-radius: @border-radius-sm;
                border: 1px solid #f0f0f0;
                transition: all 0.2s ease;

                &:hover {
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                }

                .stat-icon {
                  width: 36px;
                  height: 36px;
                  border-radius: 8px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 16px;
                  flex-shrink: 0;

                  &.investment {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff;
                  }

                  &.equity {
                    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                    color: #fff;
                  }

                  &.pnl {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    color: #fff;
                  }
                }

                .stat-content {
                  flex: 1;
                  min-width: 0;

                  .stat-label {
                    font-size: 11px;
                    color: #8c8c8c;
                    margin-bottom: 2px;
                  }

                  .stat-value {
                    font-size: 15px;
                    font-weight: 700;
                    color: #1e3a5f;
                    line-height: 1.2;

                    .pnl-percent {
                      font-size: 12px;
                      font-weight: 500;
                      opacity: 0.8;
                    }
                  }
                }

                &.pnl-card {
                  &.profit .stat-content .stat-value {
                    color: @success-color;
                  }

                  &.loss .stat-content .stat-value {
                    color: @danger-color;
                  }
                }
              }
            }

            .strategy-lifecycle-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-bottom: 12px;
            }

            .strategy-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;

              .tag-item {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 10px;
                background: #f5f7fa;
                border-radius: 14px;
                font-size: 12px;
                color: #5a6872;
                border: 1px solid #e8ecf1;

                .anticon {
                  font-size: 12px;
                  color: @primary-color;
                }
              }
            }
          }

          .header-right {
            flex-shrink: 0;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;

            .action-btn {
              min-width: 120px;
              height: 38px;
              border-radius: @border-radius-sm;
              font-size: 14px;
              font-weight: 600;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              transition: all 0.2s ease;

              .anticon {
                font-size: 16px;
              }

              &.start-btn {
                background: linear-gradient(135deg, @success-color 0%, #26d87d 100%);
                border: none;
                box-shadow: 0 2px 8px rgba(14, 203, 129, 0.3);

                &:hover {
                  box-shadow: 0 4px 12px rgba(14, 203, 129, 0.4);
                }
              }

              &.stop-btn {
                background: linear-gradient(135deg, @danger-color 0%, #ff6b7a 100%);
                border: none;
                box-shadow: 0 2px 8px rgba(246, 70, 93, 0.3);

                &:hover {
                  box-shadow: 0 4px 12px rgba(246, 70, 93, 0.4);
                }
              }

              &.publish-market-btn {
                background: linear-gradient(135deg, #f8fafc 0%, #fff 100%);
                border: 1px solid #c4b5fd;
                color: #6d28d9;
                box-shadow: 0 1px 4px rgba(109, 40, 217, 0.12);

                &:hover,
                &:focus {
                  color: #5b21b6;
                  border-color: #a78bfa;
                  background: linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%);
                  box-shadow: 0 4px 12px rgba(109, 40, 217, 0.18);
                }

                .anticon {
                  color: #7c3aed;
                }
              }
            }
          }
        }
      }

      @keyframes pulse {

        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }

        50% {
          opacity: 0.6;
          transform: scale(1.1);
        }
      }

      .strategy-content-card {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #fff;
        border: none;
        border-radius: @border-radius-lg;
        box-shadow: @card-shadow;
        transition: all 0.3s ease;
        min-height: 400px; // 缂傚倸鍊烽懗鍫曟惞鎼淬劌鐭楅幖娣妼缁愭鏌￠崶鈺佇ｇ€规洖寮堕幈銊ノ熼幐搴ｃ€愰柣搴㈣壘椤︻垶鈥︾捄銊﹀磯婵炲樊浜堕埀顒侇殜閺屾盯鎮╅搹顐ゎ槬濡炪値鍘煎鈥崇暦濠婂嫭濯撮柛娑橈功娴滄牗绻濋悽闈涗粶闁绘锕畷褰掑垂椤曞懎娈ㄩ梺姹囧灮椤牓鎮為崹顐犱簻闁圭儤鍨甸埀顒傚厴閹偞绻濋崶鈺佸絼闂佹悶鍎崝搴ㄥΥ閹烘梹鍠愰梺顓ㄧ畱閻忥附顨?
        &:hover {
          box-shadow: @card-shadow-hover;
        }

        ::v-deep .ant-card-head {
          background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
          border-bottom: 1px solid #f0f0f0;
          flex-shrink: 0;
        }

        ::v-deep .ant-card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 16px;
          background: #fff;

          .ant-tabs {
            flex: 1 0 auto;
            display: flex;
            flex-direction: column;

            .ant-tabs-bar {
              flex-shrink: 0;
            }

            .ant-tabs-content {
              flex: 1 0 auto;
            }

            .ant-tabs-tabpane {
              .strategy-tab-pane-inner {
                min-height: 304px;
                padding-top: 2px;
              }

              .trading-records,
              .position-records {
                width: 100%;
              }
            }
          }
        }
      }
    }
  }

  &.theme-dark {
    background: #0f0f10;
    color: var(--dark-text-color, #fff);

    .strategy-layout,
    .strategy-detail-col,
    .strategy-detail-panel {
      background: #0f0f10;
    }

    .creation-mode-toggle {
      background: rgba(24, 144, 255, 0.08);
      border-color: rgba(24, 144, 255, 0.2);

      .mode-hint {
        color: rgba(255, 255, 255, 0.45);
      }
    }

    .strategy-list-col {
      .strategy-list-card {
        background: #1c1c1c;
        border: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

        .card-title span {
          background: linear-gradient(135deg, #e0e6ed 0%, #c5ccd6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        ::v-deep .ant-card-head {
          background: #1c1c1c;
          border-bottom-color: rgba(255, 255, 255, 0.06);

          .ant-card-head-title {
            color: #d1d4dc;
          }
        }

        ::v-deep .ant-card-body {
          background: transparent;
        }

        ::v-deep .ant-empty-description {
          color: #868993;
        }

        .strategy-grouped-list {
          .strategy-group {
            background: rgba(30, 30, 30, 0.96);
            border: 1px solid rgba(255, 255, 255, 0.08);

            .strategy-group-header {
              background: rgba(255, 255, 255, 0.06);
              border-bottom: 1px solid rgba(255, 255, 255, 0.06);

              .group-name {
                color: rgba(255, 255, 255, 0.92);
              }

              .group-icon {
                color: #69c0ff;
              }

              .collapse-icon {
                color: rgba(255, 255, 255, 0.45);
              }
            }

            .strategy-group-content {
              .strategy-list-item {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-left: 3px solid rgba(255, 255, 255, 0.12);
                box-shadow: none;

                &:hover {
                  background: rgba(255, 255, 255, 0.08);
                  border-color: rgba(255, 255, 255, 0.14);
                  border-left-color: @primary-color;
                }

                &.active {
                  background: rgba(24, 144, 255, 0.15);
                  border-color: rgba(24, 144, 255, 0.35);
                  border-left-color: @primary-color;
                }

                .strategy-item-info {
                  color: #868993;

                  .info-item {
                    color: rgba(255, 255, 255, 0.55);
                  }

                  .status-label {
                    background: rgba(255, 255, 255, 0.08);
                    color: rgba(255, 255, 255, 0.65);
                    border-color: rgba(255, 255, 255, 0.12);
                  }
                }
              }
            }
          }
        }

        .strategy-grouped-list {
          .strategy-group .strategy-group-content .strategy-list-item,
          > .strategy-list-item {
            .strategy-item-header .strategy-name-wrapper {
              .strategy-name {
                color: rgba(255, 255, 255, 0.92);
              }

              .info-item,
              .strategy-name-text {
                color: rgba(255, 255, 255, 0.92);
              }

              .anticon {
                color: rgba(255, 255, 255, 0.55);
              }
            }
          }
        }

        ::v-deep .ant-list {
          .ant-list-item {
            border-bottom-color: rgba(255, 255, 255, 0.06);

            .ant-list-item-meta-title {
              color: #d1d4dc;
            }

            .ant-list-item-meta-description {
              color: #868993;
            }
          }
        }
      }

      .group-mode-switch {
        border-bottom-color: rgba(255, 255, 255, 0.08);

        .group-mode-label {
          color: rgba(255, 255, 255, 0.45);
        }

        ::v-deep .ant-radio-button-wrapper {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.65);

          &:hover {
            color: #69c0ff;
          }
        }

        ::v-deep .ant-radio-button-wrapper-checked {
          background: rgba(24, 144, 255, 0.25) !important;
          border-color: @primary-color !important;
          color: #fff !important;
        }
      }

      .strategy-group {
        background: rgba(0, 0, 0, 0.18);
        border-color: rgba(255, 255, 255, 0.08);
      }

      .strategy-group-header {
        background: rgba(255, 255, 255, 0.04);

        &:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .group-name {
          color: rgba(255, 255, 255, 0.88);
        }

        .collapse-icon {
          color: rgba(255, 255, 255, 0.45);
        }
      }

      .strategy-group-content .strategy-list-item {
        background: rgba(255, 255, 255, 0.03);
        border-color: rgba(255, 255, 255, 0.08);
        border-left-color: rgba(255, 255, 255, 0.12);

        &:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
          border-left-color: @primary-color;
        }

        &.active {
          background: rgba(24, 144, 255, 0.12);
          border-color: rgba(24, 144, 255, 0.28);
          border-left-color: @primary-color;
        }

        .strategy-item-info {
          color: #868993;

          .info-item {
            color: rgba(255, 255, 255, 0.55);
          }

          .status-label {
            background: rgba(255, 255, 255, 0.06);
            color: rgba(255, 255, 255, 0.45);
            border-color: rgba(255, 255, 255, 0.1);
          }

          .status-running {
            background: rgba(14, 203, 129, 0.12);
            color: #52c41a;
            border-color: rgba(14, 203, 129, 0.25);
          }

          .status-stopped {
            background: rgba(246, 70, 93, 0.12);
            color: @danger-color;
            border-color: rgba(246, 70, 93, 0.25);
          }

          .status-error {
            background: rgba(255, 77, 79, 0.12);
            color: #ff4d4f;
            border-color: rgba(255, 77, 79, 0.25);
          }
        }
      }

      .strategy-name-wrapper {
        .info-item,
        .strategy-name-text {
          color: rgba(255, 255, 255, 0.88) !important;
        }
      }

      .strategy-list-item {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.04);

        &:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
          transform: none;
        }

        &.active {
          background: rgba(24, 144, 255, 0.1);
          border-color: @primary-color;
          box-shadow: 0 4px 20px rgba(24, 144, 255, 0.2);
        }

        .strategy-name {
          color: #e0e6ed;
        }

        .strategy-item-info {
          color: #868993;
        }

        .strategy-item-header {
          .exchange-tag {
            background: rgba(102, 126, 234, 0.15);
            border-color: rgba(102, 126, 234, 0.3);
            color: #8da2f0;
          }

          .strategy-type-tag {
            background: rgba(177, 130, 255, 0.15);
            border-color: rgba(177, 130, 255, 0.3);
            color: #b182ff;
          }

          .strategy-name {
            color: rgba(255, 255, 255, 0.88);
          }
        }
      }
    }

    .strategy-detail-col {
      .strategy-header-card {
        background: #1c1c1c;
        border: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

        ::v-deep .ant-card-head {
          background: transparent;
          border-bottom: none;
        }

        ::v-deep .ant-card-body {
          background: transparent;
        }

        .strategy-header .header-left .strategy-title-row .strategy-title {
          background: none !important;
          -webkit-background-clip: border-box !important;
          background-clip: border-box !important;
          color: #e0e6ed !important;
          -webkit-text-fill-color: #e0e6ed !important;
        }

        .status-badge {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.72);

          &.status-running {
            background: rgba(14, 203, 129, 0.14);
            border-color: rgba(14, 203, 129, 0.28);
            color: #52c41a;
          }

          &.status-stopped {
            background: rgba(246, 70, 93, 0.14);
            border-color: rgba(246, 70, 93, 0.3);
            color: #ff7875;
          }

          &.status-error {
            background: rgba(255, 77, 79, 0.14);
            border-color: rgba(255, 77, 79, 0.3);
            color: #ff7875;
          }
        }

        .strategy-lifecycle-tags {
          ::v-deep .ant-tag {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.12);
            color: rgba(255, 255, 255, 0.72);
          }

          ::v-deep .ant-tag-green {
            background: rgba(82, 196, 26, 0.14);
            border-color: rgba(82, 196, 26, 0.28);
            color: #95de64;
          }

          ::v-deep .ant-tag-orange {
            background: rgba(250, 173, 20, 0.14);
            border-color: rgba(250, 173, 20, 0.3);
            color: #ffd666;
          }

          ::v-deep .ant-tag-blue {
            background: rgba(24, 144, 255, 0.14);
            border-color: rgba(24, 144, 255, 0.3);
            color: #69c0ff;
          }
        }

        .header-right {
          ::v-deep .ant-btn:not(.ant-btn-primary):not(.ant-btn-danger) {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.14);
            color: rgba(255, 255, 255, 0.78);

            &:hover,
            &:focus {
              background: rgba(255, 255, 255, 0.1);
              border-color: rgba(250, 173, 20, 0.42);
              color: #ffd666;
            }
          }
        }

        .key-stats-grid {
          .stat-card {
            background: rgba(255, 255, 255, 0.03);
            border-color: rgba(255, 255, 255, 0.06);

            &:hover {
              background: rgba(255, 255, 255, 0.06);
              border-color: rgba(255, 255, 255, 0.1);
            }

            .stat-content {
              .stat-label {
                color: #868993;
              }

              .stat-value {
                color: #e0e6ed;
              }
            }
          }
        }

        .strategy-tags {
          .tag-item {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.08);
            color: #a0a8b3;

            &:hover {
              background: rgba(24, 144, 255, 0.1);
              border-color: rgba(24, 144, 255, 0.3);
            }
          }
        }
      }

      .strategy-content-card {
        background: #1c1c1c;
        border: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

        ::v-deep .ant-card-head {
          background: #1c1c1c;
          border-bottom-color: rgba(255, 255, 255, 0.06);

          .ant-card-head-title {
            color: #d1d4dc;
          }
        }

        ::v-deep .ant-card-body {
          background: transparent;
        }

        ::v-deep .ant-tabs {
          .ant-tabs-nav {
            .ant-tabs-tab {
              color: #868993;

              &:hover {
                color: #d1d4dc;
              }

              &.ant-tabs-tab-active {
                .ant-tabs-tab-btn {
                  color: var(--primary-color, #1890ff);
                }
              }
            }

            .ant-tabs-ink-bar {
              background: linear-gradient(90deg, @primary-color 0%, var(--primary-color-hover, #40a9ff) 100%);
            }
          }

          .ant-tabs-content {
            color: #d1d4dc;
          }
        }

        ::v-deep .ant-empty-description {
          color: #868993;
        }
      }

      .strategy-empty-detail-card {
        background: #1c1c1c;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
      }

      .strategy-empty-detail-icon {
        background: linear-gradient(135deg, rgba(24, 144, 255, 0.22) 0%, rgba(64, 169, 255, 0.1) 100%);
        color: #69c0ff;
      }

      .strategy-empty-detail-title {
        color: rgba(255, 255, 255, 0.92);
      }

      .strategy-empty-detail-hint {
        color: rgba(255, 255, 255, 0.55);
      }
    }
  }
}

.theme-dark {
  .assistant-page-banner-desc {
    color: rgba(255, 255, 255, 0.55);
  }

  .assistant-page-banner--signal {
    background: linear-gradient(90deg, rgba(22, 119, 255, 0.16) 0%, rgba(22, 119, 255, 0.05) 100%);
    border-color: rgba(22, 119, 255, 0.28);
  }

  .assistant-page-banner--script {
    background: linear-gradient(90deg, rgba(114, 46, 209, 0.16) 0%, rgba(114, 46, 209, 0.05) 100%);
    border-color: rgba(114, 46, 209, 0.28);
  }

  .assistant-guide-bar {
    border-color: rgba(23, 125, 220, 0.28);
    background: linear-gradient(135deg, rgba(23, 125, 220, 0.14) 0%, rgba(114, 46, 209, 0.12) 100%);

    .assistant-guide-eyebrow {
      background: rgba(23, 125, 220, 0.2);
      color: #69c0ff;
    }

    .assistant-guide-title {
      color: rgba(255, 255, 255, 0.92);
    }

    .assistant-guide-desc {
      color: rgba(255, 255, 255, 0.72);
    }

    .assistant-step-card {
      background: rgba(30, 30, 30, 0.6);
      border-color: rgba(255, 255, 255, 0.08);
    }

    .assistant-step-title {
      color: rgba(255, 255, 255, 0.9);
    }

    .assistant-step-desc {
      color: rgba(255, 255, 255, 0.58);
    }

    .assistant-guide-close {
      background: rgba(30, 30, 30, 0.5);
      border-color: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.72);

      &:hover,
      &:focus {
        background: rgba(50, 50, 50, 0.7);
        border-color: rgba(105, 192, 255, 0.45);
        color: #91d5ff;
      }
    }
  }

  .strategy-empty-state {
    .strategy-empty-desc {
      color: rgba(255, 255, 255, 0.72);
    }

    .strategy-empty-path {
      color: rgba(255, 255, 255, 0.48);
    }
  }
}

/* Strategy params collapse (Step 2) */
.strategy-params-collapse {
  background: #fafafa;
  border-radius: 10px;
  overflow: hidden;

  ::v-deep .ant-collapse-item {
    border-bottom-color: #f0f0f0;
  }

  ::v-deep .ant-collapse-header {
    font-weight: 500;
    font-size: 13px;
  }

  ::v-deep .ant-collapse-content-box {
    padding: 12px 16px;
  }

  ::v-deep .ant-input-number {
    width: 100%;
  }
}

/* AI filter box (Step 2) */
.ai-filter-box {
  margin-top: 12px;
  padding: 14px 14px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  background: linear-gradient(180deg, #fafcff 0%, #ffffff 100%);
}

.ai-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ai-filter-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #262626;
}

.ai-filter-title .anticon {
  color: var(--primary-color, #1890ff);
}

.ai-filter-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #8c8c8c;
}

.symbol-option {
  display: flex;
  align-items: center;
}

.symbol-name {
  font-weight: 600;
  color: #8f8d8d;
  margin-right: 8px;
}

.symbol-name-extra {
  font-size: 12px;
  color: #999;
  margin-left: 4px;
}

// Simple/Advanced mode toggle
.creation-mode-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 14px 16px;
  background: rgba(24, 144, 255, 0.04);
  border-radius: 8px;
  border: 1px solid rgba(24, 144, 255, 0.12);

  .mode-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mode-title {
    font-size: 14px;
    font-weight: 600;
    color: #262626;
  }

  .mode-hint {
    color: rgba(0, 0, 0, 0.45);
    font-size: 12px;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
}

.section-block-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.section-block-desc {
  font-size: 12px;
  font-weight: 400;
  color: #8c8c8c;
}

.simple-mode-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.08) 0%, rgba(114, 46, 209, 0.06) 100%);
  border: 1px solid rgba(24, 144, 255, 0.14);
}

.simple-mode-hero-main {
  min-width: 0;
}

.simple-mode-kicker {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-color, #1890ff);
  margin-bottom: 4px;
}

.simple-mode-hero-desc {
  font-size: 12px;
  line-height: 1.6;
  color: #595959;
}

.simple-mode-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.simple-essentials-card,
.advanced-settings-shell,
.selected-indicator-card {
  padding: 20px;
  margin-bottom: 18px;
  border-radius: 12px;
  background: #fafcff;
  border: 1px solid rgba(24, 144, 255, 0.12);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.required-label {
  display: inline-flex;
  align-items: center;
}

.required-star {
  color: #f5222d;
  margin-right: 4px;
}

.compact-form-item {
  margin-bottom: 18px;
}

.compact-grid-row {
  margin-bottom: 4px;
}

.execution-step-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.execution-step-hero {
  padding: 16px 18px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.08) 0%, rgba(24, 144, 255, 0.08) 100%);
  border: 1px solid rgba(24, 144, 255, 0.14);
}

.execution-step-hero-desc {
  font-size: 12px;
  line-height: 1.7;
  color: #595959;
}

.execution-section-card {
  padding: 18px 20px;
  border-radius: 12px;
  background: #fafcff;
  border: 1px solid rgba(24, 144, 255, 0.12);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);

  &--collapsible {
    padding-bottom: 12px;

    .section-block-title--toggle {
      cursor: pointer;
      user-select: none;
      transition: color 0.2s;
      margin-bottom: 0;

      &:hover { color: var(--primary-color, #1890ff); }
    }

    .collapse-arrow {
      font-size: 12px;
      margin-right: 6px;
      transition: transform 0.25s;
    }

    .collapsible-body {
      padding-top: 14px;
    }
  }
}

.section-inline-alert {
  margin-top: 4px;
}

.ta-credential-form-item {
  .ta-credential-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ta-credential-select {
    flex: 1 1 auto;
    min-width: 0;
  }

  .ta-add-cred-btn {
    flex: 0 0 auto;
    height: 36px;
    padding: 0 16px;
    border-radius: 6px;
    font-weight: 600;
  }

  .ta-empty-add-cred-btn {
    margin-left: 8px;
    font-weight: 600;
    border-radius: 6px;
  }
}

@media (max-width: 640px) {
  .ta-credential-form-item {
    .ta-credential-row {
      align-items: stretch;
      flex-direction: column;
    }

    .ta-add-cred-btn {
      width: 100%;
    }

    .ta-empty-add-cred-btn {
      display: block;
      width: 100%;
      margin: 8px 0 0;
    }
  }
}

.notify-channel-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 12px;
}

.execution-warn-text {
  color: #ff9800;
}

.execution-mode-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.execution-mode-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-height: 110px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(24, 144, 255, 0.12);
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(24, 144, 255, 0.35);
    box-shadow: 0 8px 24px rgba(24, 144, 255, 0.08);
  }

  &.active {
    border-color: var(--primary-color, #1890ff);
    background: linear-gradient(135deg, rgba(24, 144, 255, 0.08) 0%, rgba(24, 144, 255, 0.03) 100%);
    box-shadow: 0 10px 28px rgba(24, 144, 255, 0.12);
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.68;
    background: #fafafa;

    &:hover {
      border-color: rgba(24, 144, 255, 0.12);
      box-shadow: none;
    }
  }
}

.execution-mode-card-icon {
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 18px;

  &.signal {
    color: var(--primary-color, #1890ff);
    background: rgba(24, 144, 255, 0.1);
  }

  &.live {
    color: #fa8c16;
    background: rgba(250, 140, 22, 0.12);
  }
}

.execution-mode-card-body {
  flex: 1;
  min-width: 0;
}

.execution-mode-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 6px;
}

.execution-mode-card-desc {
  font-size: 12px;
  line-height: 1.6;
  color: #8c8c8c;
}

.execution-mode-card-check {
  position: absolute;
  top: 12px;
  right: 12px;
  color: var(--primary-color, #1890ff);
  font-size: 18px;
}

.steps-container {
  margin-bottom: 24px;

  @media (max-width: 768px) {
    margin-bottom: 16px;

    ::v-deep .ant-steps-item-title {
      font-size: 12px;
    }

    ::v-deep .ant-steps-item-icon {
      width: 24px;
      height: 24px;
      line-height: 24px;
      font-size: 12px;
    }
  }
}

.form-container {
  min-height: 400px;
  padding: 24px 0;

  .step-content {
    animation: fadeIn 0.3s;
  }

  ::v-deep .ant-form-item {
    margin-bottom: 20px;
  }

  @media (max-width: 768px) {
    min-height: 300px;
    padding: 16px 0;

    .simple-mode-hero {
      flex-direction: column;
      align-items: flex-start;
    }

    .simple-mode-badges {
      width: 100%;
    }

    .notify-channel-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .execution-mode-cards {
      grid-template-columns: 1fr;
    }

    .execution-section-card,
    .execution-step-hero {
      padding: 16px;
    }

    ::v-deep .ant-form-item-label {
      padding-bottom: 4px;

      label {
        font-size: 13px;
      }
    }

    ::v-deep .ant-input,
    ::v-deep .ant-input-number,
    ::v-deep .ant-select {
      font-size: 14px;
    }

    ::v-deep .ant-radio-group {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .ant-radio-wrapper {
        font-size: 13px;
      }
    }
  }

  @media (max-width: 480px) {
    min-height: 250px;
    padding: 12px 0;

    ::v-deep .ant-form-item-label label {
      font-size: 12px;
    }

    ::v-deep .ant-input,
    ::v-deep .ant-input-number,
    ::v-deep .ant-select {
      font-size: 13px;
    }
  }
}

.strategy-type-selector {
  padding: 16px 0;

  .market-category-selector {
    margin-bottom: 16px;

    .selector-label {
      font-weight: 600;
      margin-bottom: 8px;
      color: #262626;
    }

    ::v-deep .ant-radio-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }

  .strategy-type-card {
    cursor: pointer;
    transition: all 0.3s;
    height: 100%;
    min-height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      border-color: var(--primary-color, #1890ff);
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
    }

    &.selected {
      border-color: var(--primary-color, #1890ff);
      background-color: #e6f7ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
    }

    .strategy-type-content {
      text-align: center;
      padding: 16px;

      .strategy-type-icon {
        font-size: 48px;
        color: var(--primary-color, #1890ff);
        margin-bottom: 16px;
      }

      h3 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #1f1f1f;
      }

      p {
        font-size: 14px;
        color: #8c8c8c;
        margin: 0;
        line-height: 1.6;
      }
    }
  }
}

.indicator-option {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;

  .indicator-option-main {
    flex: 1;
  }

  .indicator-name {
    display: block;
    color: #262626;
    font-weight: 600;
  }
}

.indicator-option-desc {
  display: block;
  margin-top: 2px;
  color: #8c8c8c;
  font-size: 12px;
  line-height: 1.5;
}

.selected-indicator-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.selected-indicator-name {
  font-weight: 600;
  color: #262626;
}

.indicator-description {
  border-radius: 4px;
  color: var(--text-color, #666);
  font-size: 14px;
  line-height: 1.6;
}

.theme-dark {
  .creation-mode-toggle,
  .simple-essentials-card,
  .advanced-settings-shell,
  .selected-indicator-card {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .mode-title,
  .section-block-title,
  .selected-indicator-name,
  .indicator-option .indicator-name {
    color: rgba(255, 255, 255, 0.9);
  }

  .mode-hint,
  .section-block-desc,
  .indicator-option-desc {
    color: rgba(255, 255, 255, 0.6);
  }

  .simple-mode-hero {
    background: linear-gradient(135deg, rgba(24, 144, 255, 0.14) 0%, rgba(114, 46, 209, 0.12) 100%);
    border-color: rgba(64, 169, 255, 0.18);
  }

  .execution-step-hero {
    background: linear-gradient(135deg, rgba(82, 196, 26, 0.14) 0%, rgba(24, 144, 255, 0.14) 100%);
    border-color: rgba(64, 169, 255, 0.18);
  }

  .execution-mode-card {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);

    &:hover {
      border-color: rgba(64, 169, 255, 0.3);
      box-shadow: 0 8px 24px rgba(24, 144, 255, 0.12);
    }

    &.active {
      background: linear-gradient(135deg, rgba(24, 144, 255, 0.16) 0%, rgba(24, 144, 255, 0.08) 100%);
      border-color: var(--primary-color, #1890ff);
    }

    &.disabled {
      background: rgba(255, 255, 255, 0.02);
    }
  }

  .execution-mode-card-title {
    color: #e0e6ed;
  }

  .execution-mode-card-desc {
    color: rgba(255, 255, 255, 0.6);
  }

  .simple-mode-kicker {
    color: #69c0ff;
  }

  .simple-mode-hero-desc,
  .execution-step-hero-desc {
    color: rgba(255, 255, 255, 0.72);
  }
}

.indicator-params-form {
  padding: 12px;
  background-color: var(--bg-color-secondary, #f5f7fa);
  border-radius: 6px;
  border: 1px dashed var(--border-color, #e0e0e0);
}

.indicator-params-form .param-item {
  margin-bottom: 12px;
}

.indicator-params-form .param-label {
  display: block;
  font-size: 13px;
  color: var(--text-color, #666);
  margin-bottom: 4px;
  font-weight: 500;
}

.form-item-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-color-secondary, #8c8c8c);
}

.script-template-sizing-alert {
  margin-bottom: 16px;
}

.script-runtime-fixed-box {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
}

.test-result {
  margin-top: 8px;
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;

  &.success {
    background-color: #f6ffed;
    border: 1px solid #b7eb8f;
    color: #52c41a;
  }
}

.ip-whitelist-tip {
  margin-top: 12px;
  padding: 12px;
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  font-size: 13px;
  color: var(--primary-color, #1890ff);
  line-height: 1.6;

  .anticon {
    margin-right: 6px;
    color: var(--primary-color, #1890ff);
  }

  .ip-list {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    .ant-tag {
      margin: 0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
  }

  &.error {
    background-color: #fff2f0;
    border: 1px solid #ffccc7;
    color: #ff4d4f;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

::v-deep .danger-item {
  color: #ff4d4f;
}

::v-deep .mobile-modal {
  .ant-modal {
    top: 20px;
    padding-bottom: 0;
  }

  .ant-modal-content {
    max-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
  }

  .ant-modal-body {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 16px;
  }

  .ant-modal-footer {
    padding: 12px 16px;
    border-top: 1px solid #e8e8e8;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;

    .ant-btn {
      font-size: 13px;
      padding: 0 12px;
      height: 32px;
    }
  }
}

.add-symbol-modal-content {
  .market-tabs {
    margin-bottom: 16px;
  }

  .symbol-search-section {
    margin-bottom: 16px;
  }

  .section-title {
    font-weight: 500;
    margin-bottom: 8px;
    color: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
  }

  .search-results-section,
  .hot-symbols-section {
    margin-bottom: 16px;
  }

  .symbol-list {
    .symbol-list-item {
      cursor: pointer;
      transition: background-color 0.3s;
      padding: 8px 12px;
      border-radius: 4px;

      &:hover {
        background-color: #f5f5f5;
      }
    }
  }

  .symbol-item-content {
    display: flex;
    align-items: center;

    .symbol-code {
      font-weight: 500;
      margin-right: 8px;
    }

    .symbol-name {
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .selected-symbol-section {
    padding: 12px;
    background-color: #f6ffed;
    border: 1px solid #b7eb8f;
    border-radius: 4px;
    margin-top: 16px;

    .selected-symbol-info {
      display: flex;
      align-items: center;
      margin-top: 8px;

      .symbol-code {
        font-weight: 500;
        margin-right: 8px;
      }

      .symbol-name {
        color: rgba(0, 0, 0, 0.45);
      }
    }
  }
}

</style>

<style lang="less">
body.dark {
  .ta-strategy-confirm-modal.ant-modal-confirm {
    .ant-modal-content {
      background: #1e1e1e;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .ant-modal-body {
      background: #1e1e1e;
    }

    .ant-modal-confirm-body .ant-modal-confirm-title {
      color: rgba(255, 255, 255, 0.88);
    }

    .ant-modal-confirm-body .ant-modal-confirm-content {
      color: rgba(255, 255, 255, 0.65);
    }

    .ant-modal-confirm-btns {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 12px;
    }

    .ant-modal-confirm-btns .ant-btn-default {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.85);
    }

    .ant-modal-confirm-btns .ant-btn-danger {
      background: #ff4d4f;
      border-color: #ff4d4f;
      color: #fff;
    }

    .ant-modal-confirm-body > .anticon {
      color: #faad14;
    }
  }

  .mode-selector-modal .ant-modal-content {
    background: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.08);

    .ant-modal-header {
      background: #252525;
      border-bottom-color: rgba(255, 255, 255, 0.06);

      .ant-modal-title {
        color: #e0e6ed;
      }
    }

    .ant-modal-close-x {
      color: rgba(255, 255, 255, 0.45);
    }

    .ant-modal-body {
      color: #d1d4dc;
    }
  }

  .strategy-form-modal.strategy-form-modal-dark .ant-modal-content {
    background: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);

    .ant-modal-header {
      background: #252525;
      border-bottom-color: rgba(255, 255, 255, 0.06);

      .ant-modal-title {
        color: #e0e6ed;
      }
    }

    .ant-modal-close-x {
      color: rgba(255, 255, 255, 0.45);
    }

    .ant-modal-body {
      color: #d1d4dc;
      background: #1e1e1e;
    }

    .script-source-preview {
      background: #141414;
      border-color: rgba(255, 255, 255, 0.12);
    }

    .script-source-preview__title {
      color: rgba(255, 255, 255, 0.88);
    }

    .script-source-preview__meta {
      color: rgba(255, 255, 255, 0.52);
    }

    .creation-mode-toggle {
      background: rgba(24, 144, 255, 0.08);
      border-color: rgba(24, 144, 255, 0.2);

      .mode-title,
      .mode-hint {
        color: rgba(255, 255, 255, 0.72);
      }
    }
  }

  .strategy-form-modal.strategy-form-modal-dark .ant-steps {
    .ant-steps-item-title {
      color: rgba(255, 255, 255, 0.65) !important;
    }

    .ant-steps-item-description {
      color: rgba(255, 255, 255, 0.35) !important;
    }

    .ant-steps-item-wait .ant-steps-item-icon {
      background: transparent;
      border-color: rgba(255, 255, 255, 0.2);

      .ant-steps-icon {
        color: rgba(255, 255, 255, 0.45);
      }
    }

    .ant-steps-item-process .ant-steps-item-icon {
      background: var(--primary-color, #1890ff);
      border-color: var(--primary-color, #1890ff);

      .ant-steps-icon {
        color: #fff;
      }
    }

    .ant-steps-item-finish .ant-steps-item-icon {
      background: transparent;
      border-color: var(--primary-color, #1890ff);

      .ant-steps-icon {
        color: var(--primary-color, #1890ff);
      }
    }

    .ant-steps-item-tail::after {
      background: rgba(255, 255, 255, 0.1);
    }
  }

  .strategy-form-modal.strategy-form-modal-dark {
    .ant-form-item-label > label {
      color: rgba(255, 255, 255, 0.75);
    }

    .notify-channel-grid .ant-checkbox-wrapper {
      display: flex;
      align-items: center;
      min-height: 40px;
      padding: 0 12px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.72);
    }

    .ant-input,
    .ant-input-number {
      background: #1c1c1c;
      border-color: rgba(255, 255, 255, 0.12);
      color: #d1d4dc;

      &::placeholder {
        color: rgba(255, 255, 255, 0.25);
      }

      &:hover,
      &:focus {
        border-color: var(--primary-color, #1890ff);
      }
    }

    .ant-input-number-handler-wrap {
      background: #252525;
      border-left-color: rgba(255, 255, 255, 0.12);

      .ant-input-number-handler {
        border-bottom-color: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.45);

        &:hover {
          color: var(--primary-color, #1890ff);
        }
      }
    }

    .ant-select {
      .ant-select-selection {
        background: #1c1c1c;
        border-color: rgba(255, 255, 255, 0.12);
        color: #d1d4dc;

        .ant-select-arrow {
          color: rgba(255, 255, 255, 0.35);
        }

        &:hover {
          border-color: var(--primary-color, #1890ff);
        }
      }
    }

    .ant-radio-group {
      .ant-radio-button-wrapper {
        background: #1c1c1c;
        border-color: rgba(255, 255, 255, 0.12);
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

      .ant-radio-wrapper {
        color: rgba(255, 255, 255, 0.65);
      }
    }

    .ant-switch {
      background: rgba(255, 255, 255, 0.15);

      &.ant-switch-checked {
        background: var(--primary-color, #1890ff);
      }
    }

    textarea.ant-input {
      background: #1c1c1c;
      border-color: rgba(255, 255, 255, 0.12);
      color: #d1d4dc;

      &::placeholder {
        color: rgba(255, 255, 255, 0.25);
      }
    }

    .ant-form-explain,
    .ant-form-extra {
      color: rgba(255, 255, 255, 0.35);
    }

    .ant-form-item-label > label {
      color: rgba(255, 255, 255, 0.75);
    }

    /* strategy params collapse dark */
    .strategy-params-collapse {
      background: #1c1c1c !important;
      border-color: rgba(255, 255, 255, 0.08);

      .ant-collapse-item {
        border-color: rgba(255, 255, 255, 0.08);
      }

      .ant-collapse-header {
        color: rgba(255, 255, 255, 0.85) !important;
        background: rgba(255, 255, 255, 0.03);
      }

      .ant-collapse-content {
        background: #1c1c1c;
        border-color: rgba(255, 255, 255, 0.06);
        color: #d1d4dc;
      }
    }

    .simple-essentials-card,
    .advanced-settings-shell,
    .selected-indicator-card,
    .execution-section-card {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.08);
      box-shadow: none;
    }

    .section-block-title--toggle:hover {
      color: var(--primary-color-hover, #40a9ff);
    }

    .simple-mode-hero {
      background: linear-gradient(135deg, rgba(24, 144, 255, 0.16) 0%, rgba(114, 46, 209, 0.14) 100%);
      border-color: rgba(64, 169, 255, 0.2);
    }

    .execution-step-hero {
      background: linear-gradient(135deg, rgba(82, 196, 26, 0.16) 0%, rgba(24, 144, 255, 0.14) 100%);
      border-color: rgba(64, 169, 255, 0.2);
    }

    .section-block-title,
    .mode-title,
    .selected-indicator-name {
      color: #e0e6ed;
    }

    .section-block-desc,
    .simple-mode-hero-desc,
    .execution-step-hero-desc,
    .indicator-description,
    .form-item-hint {
      color: rgba(255, 255, 255, 0.62);
    }

    /* AI filter box */
    .ai-filter-box {
      background: #1c1c1c;
      border-color: rgba(255, 255, 255, 0.1);

      .ai-filter-title {
        color: #e0e6ed;
      }

      .ai-filter-hint {
        color: rgba(255, 255, 255, 0.4);
      }
    }

    /* form container */
    .form-container {
      color: #d1d4dc;

      .ant-form-item-label > label {
        color: rgba(255, 255, 255, 0.75);
      }
    }

    /* ip whitelist tip */
    .ip-whitelist-tip {
      background: rgba(24, 144, 255, 0.08);
      border-color: rgba(24, 144, 255, 0.2);
      color: var(--primary-color-hover, #40a9ff);
    }

    /* indicator description */
    .indicator-description {
      background: #1c1c1c;
      color: rgba(255, 255, 255, 0.65);
    }

    /* indicator params */
    .indicator-params-form {
      background: #1c1c1c;
      border-color: rgba(255, 255, 255, 0.1);

      .param-label {
        color: rgba(255, 255, 255, 0.65);
      }
    }

    /* strategy type selector */
    .strategy-type-selector {
      .strategy-type-card {
        border-color: rgba(255, 255, 255, 0.1);
        background: #1c1c1c;
        color: #d1d4dc;

        &:hover {
          border-color: var(--primary-color-active, #177ddc);
        }

        &.selected {
          border-color: var(--primary-color-active, #177ddc);
          background: rgba(23, 125, 220, 0.08);
        }

        .strategy-type-content {
          h3 {
            color: #e0e6ed;
          }

          p {
            color: rgba(255, 255, 255, 0.45);
          }
        }
      }

      .market-category-selector .selector-label {
        color: rgba(255, 255, 255, 0.75);
      }
    }

    /* indicator dropdown options */
    .indicator-option .indicator-name {
      color: rgba(255, 255, 255, 0.9);
    }

    .indicator-option-desc {
      color: rgba(255, 255, 255, 0.6);
    }

    .ant-select-selection-selected-value {
      color: #d1d4dc !important;
    }

    /* execution mode cards */
    .execution-mode-card {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.08);

      &:hover {
        border-color: rgba(64, 169, 255, 0.3);
        box-shadow: 0 8px 24px rgba(24, 144, 255, 0.12);
      }

      &.active {
        background: linear-gradient(135deg, rgba(24, 144, 255, 0.16) 0%, rgba(24, 144, 255, 0.08) 100%);
        border-color: var(--primary-color, #1890ff);
      }

      &.disabled {
        background: rgba(255, 255, 255, 0.02);
      }
    }

    .execution-mode-card-icon {
      &.signal {
        color: #69c0ff;
        background: rgba(24, 144, 255, 0.15);
      }

      &.live {
        color: #ffc069;
        background: rgba(250, 140, 22, 0.15);
      }
    }

    .execution-mode-card-title {
      color: #e0e6ed;
    }

    .execution-mode-card-desc {
      color: rgba(255, 255, 255, 0.6);
    }

    .simple-mode-kicker {
      color: #69c0ff;
    }

    .simple-mode-hero-desc,
    .execution-step-hero-desc {
      color: rgba(255, 255, 255, 0.72);
    }
  }

  /* --- Modal header/footer --- */
  .ant-modal-wrap .ant-modal-content {
    background: #1e1e1e;

    .ant-modal-header {
      background: #252525;
      border-bottom-color: rgba(255, 255, 255, 0.06);

      .ant-modal-title {
        color: #e0e6ed;
      }
    }

    .ant-modal-close-x {
      color: rgba(255, 255, 255, 0.45);
    }

    .ant-modal-body {
      color: #d1d4dc;
    }

    .ant-modal-footer {
      border-top-color: rgba(255, 255, 255, 0.06);
      background: #252525;
    }
  }

  /* --- Select dropdown (teleports to body) --- */
  .ant-select-dropdown {
    background: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);

    .ant-select-dropdown-menu-item {
      color: #d1d4dc;

      &:hover,
      &-active {
        background: rgba(24, 144, 255, 0.1);
      }

      &-selected {
        background: rgba(24, 144, 255, 0.15);
        color: var(--primary-color, #1890ff);
      }

      &-disabled {
        color: rgba(255, 255, 255, 0.25);
      }
    }

    .ant-select-search__field {
      background: #141414;
      border-color: rgba(255, 255, 255, 0.12);
      color: #d1d4dc;
    }

    .ant-select-dropdown-menu {
      background: #1e1e1e;
    }

    .ant-empty-description {
      color: rgba(255, 255, 255, 0.35);
    }
  }

  /* --- Collapse panels (Step 2 params) --- */
  .ant-modal-wrap .ant-collapse {
    background: #1c1c1c !important;
    border-color: rgba(255, 255, 255, 0.08);

    .ant-collapse-item {
      border-color: rgba(255, 255, 255, 0.08);
    }

    .ant-collapse-header {
      color: rgba(255, 255, 255, 0.85) !important;
      background: rgba(255, 255, 255, 0.03);

      .anticon {
        color: rgba(255, 255, 255, 0.45);
      }
    }

    .ant-collapse-content {
      background: #1c1c1c;
      border-color: rgba(255, 255, 255, 0.06);
      color: #d1d4dc;
    }
  }

  /* --- Spin loading --- */
  .ant-modal-wrap .ant-spin-text {
    color: rgba(255, 255, 255, 0.65);
  }

  /* --- Alert --- */
  .ant-modal-wrap .ant-alert {
    background: rgba(24, 144, 255, 0.06);
    border-color: rgba(24, 144, 255, 0.2);

    .ant-alert-message {
      color: rgba(255, 255, 255, 0.75);
    }

    .ant-alert-description {
      color: rgba(255, 255, 255, 0.55);
    }
  }
}
</style>
