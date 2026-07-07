<template>
  <div class="portfolio-container" :class="{ 'theme-dark': isDarkTheme, embedded: embedded }">
    <div class="summary-section">
      <div class="summary-card total-value">
        <div class="card-icon">
          <a-icon type="wallet" />
        </div>
        <div class="card-content">
          <div class="card-label">{{ $t('portfolio.summary.totalValue') }}</div>
          <div class="card-value">
            <span class="currency">$</span>
            <span class="amount">{{ formatNumber(summary.total_market_value) }}</span>
          </div>
          <div class="card-sub" v-if="summary.today_change !== undefined">
            <span :class="summary.today_change >= 0 ? 'positive' : 'negative'">
              {{ $t('portfolio.summary.today') }}: {{ summary.today_change >= 0 ? '+' : '' }}${{ formatNumber(summary.today_change) }}
            </span>
          </div>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon cost">
          <a-icon type="dollar" />
        </div>
        <div class="card-content">
          <div class="card-label">{{ $t('portfolio.summary.totalCost') }}</div>
          <div class="card-value">${{ formatNumber(summary.total_cost) }}</div>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon" :class="summary.total_pnl >= 0 ? 'profit' : 'loss'">
          <a-icon :type="summary.total_pnl >= 0 ? 'rise' : 'fall'" />
        </div>
        <div class="card-content">
          <div class="card-label">{{ $t('portfolio.summary.totalPnl') }}</div>
          <div class="card-value" :class="summary.total_pnl >= 0 ? 'positive' : 'negative'">
            {{ summary.total_pnl >= 0 ? '+' : '' }}${{ formatNumber(summary.total_pnl) }}
            <span class="percent">({{ summary.total_pnl_percent >= 0 ? '+' : '' }}{{ summary.total_pnl_percent }}%)</span>
          </div>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon positions">
          <a-icon type="fund" />
        </div>
        <div class="card-content">
          <div class="card-label">{{ $t('portfolio.summary.positionCount') }}</div>
          <div class="card-value">
            {{ summary.position_count }}
            <span class="position-detail" v-if="profitLossStats.profit > 0 || profitLossStats.loss > 0">
              (<span class="positive">{{ profitLossStats.profit }}</span>/<span class="negative">{{ profitLossStats.loss }}</span>)
            </span>
          </div>
          <div class="card-sub">
            {{ $t('portfolio.summary.profitLossRatio') }}
          </div>
        </div>
      </div>
    </div>

    <div class="summary-section secondary">
      <div class="summary-card mini">
        <div class="card-icon today" :class="summary.today_pnl >= 0 ? 'profit' : 'loss'">
          <a-icon type="stock" />
        </div>
        <div class="card-content">
          <div class="card-label">{{ $t('portfolio.summary.todayPnl') }}</div>
          <div class="card-value" :class="summary.today_pnl >= 0 ? 'positive' : 'negative'">
            {{ summary.today_pnl >= 0 ? '+' : '' }}${{ formatNumber(summary.today_pnl || 0) }}
          </div>
        </div>
      </div>

      <div class="summary-card mini">
        <div class="card-icon best">
          <a-icon type="trophy" />
        </div>
        <div class="card-content">
          <div class="card-label">{{ $t('portfolio.summary.bestPerformer') }}</div>
          <div class="card-value small positive" v-if="bestPerformer">
            {{ bestPerformer.symbol }} +{{ bestPerformer.pnl_percent }}%
          </div>
          <div class="card-value small" v-else>-</div>
        </div>
      </div>

      <div class="summary-card mini">
        <div class="card-icon worst">
          <a-icon type="warning" />
        </div>
        <div class="card-content">
          <div class="card-label">{{ $t('portfolio.summary.worstPerformer') }}</div>
          <div class="card-value small negative" v-if="worstPerformer">
            {{ worstPerformer.symbol }} {{ worstPerformer.pnl_percent }}%
          </div>
          <div class="card-value small" v-else>-</div>
        </div>
      </div>

      <div class="summary-card mini sync-card">
        <div class="card-icon sync" :class="{ 'syncing': isSyncing }">
          <a-icon type="sync" :spin="isSyncing" />
        </div>
        <div class="card-content">
          <div class="card-label">{{ $t('portfolio.summary.priceSync') }}</div>
          <div class="card-value small">
            {{ lastSyncTime ? formatSyncTime(lastSyncTime) : '-' }}
          </div>
          <div class="card-sub">
            {{ $t('portfolio.summary.syncInterval') }}: 30s
            <a-button type="link" size="small" @click="refreshPrices" :loading="isSyncing" style="padding: 0; margin-left: 8px;">
              <a-icon type="reload" v-if="!isSyncing" />
            </a-button>
          </div>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="positions-section">
        <div class="section-header">
          <h3>
            <a-icon type="stock" />
            <span>{{ $t('portfolio.positions.title') }}</span>
          </h3>
          <div class="header-actions">
            <a-radio-group v-model="viewMode" size="small" style="margin-right: 12px;">
              <a-radio-button value="grid">
                <a-icon type="appstore" />
              </a-radio-button>
              <a-radio-button value="group">
                <a-icon type="folder" />
              </a-radio-button>
            </a-radio-group>
            <a-select
              v-if="viewMode === 'grid'"
              v-model="selectedGroup"
              :placeholder="$t('portfolio.groups.all')"
              style="width: 150px; margin-right: 12px;"
              allow-clear
              @change="filterByGroup"
            >
              <a-select-option value="">{{ $t('portfolio.groups.all') }}</a-select-option>
              <a-select-option value="__ungrouped__">{{ $t('portfolio.groups.ungrouped') }}</a-select-option>
              <a-select-option v-for="g in groups" :key="g.name" :value="g.name">
                {{ g.name }} ({{ g.count }})
              </a-select-option>
            </a-select>
            <a-button type="primary" @click="showAddPositionModal = true">
              <a-icon type="plus" />
              {{ $t('portfolio.positions.add') }}
            </a-button>
          </div>
        </div>

        <a-spin :spinning="loadingPositions">
          <div class="positions-list">
            <div v-if="positions.length === 0" class="empty-state">
              <a-empty :description="$t('portfolio.positions.empty')">
                <a-button type="primary" @click="showAddPositionModal = true">
                  <a-icon type="plus" />
                  {{ $t('portfolio.positions.addFirst') }}
                </a-button>
              </a-empty>
            </div>

            <div v-else-if="viewMode === 'grid'" class="position-grid">
              <div
                v-for="pos in filteredPositions"
                :key="pos.id"
                class="position-card"
                :class="{ 'profit': pos.pnl >= 0, 'loss': pos.pnl < 0 }"
              >
                <div class="position-header">
                  <div class="symbol-info">
                    <a-tag :color="getMarketColor(pos.market)" size="small">{{ getMarketName(pos.market) }}</a-tag>
                    <span class="symbol">{{ pos.symbol }}</span>
                    <span class="name">{{ pos.name }}</span>
                    <a-tag v-if="pos.group_name" size="small" color="blue" style="margin-left: 4px;">
                      <a-icon type="folder" /> {{ pos.group_name }}
                    </a-tag>
                  </div>
                  <div class="position-actions">
                    <a-tooltip :title="hasAlertForPosition(pos.id) ? $t('portfolio.alerts.editAlert') : $t('portfolio.alerts.addAlert')">
                      <a-button
                        type="link"
                        size="small"
                        @click="showAddAlertForPosition(pos)"
                        :class="{ 'has-alert': hasAlertForPosition(pos.id) }"
                      >
                        <a-icon type="bell" :theme="hasAlertForPosition(pos.id) ? 'filled' : 'outlined'" />
                      </a-button>
                    </a-tooltip>
                    <a-button type="link" size="small" @click="editPosition(pos)">
                      <a-icon type="edit" />
                    </a-button>
                    <a-popconfirm
                      :title="$t('portfolio.positions.deleteConfirm')"
                      @confirm="deletePosition(pos.id)"
                    >
                      <a-button type="link" size="small" class="delete-btn">
                        <a-icon type="delete" />
                      </a-button>
                    </a-popconfirm>
                  </div>
                </div>

                <div class="position-body">
                  <div class="price-row">
                    <div class="current-price">
                      <span class="label">{{ $t('portfolio.positions.currentPrice') }}</span>
                      <span class="value">{{ getCurrencySymbol(pos.market) }}{{ formatPrice(pos.current_price) }}</span>
                      <span class="change" :class="pos.price_change >= 0 ? 'up' : 'down'">
                        {{ pos.price_change >= 0 ? '+' : '-' }}{{ Math.abs(pos.price_change_percent).toFixed(2) }}%
                      </span>
                    </div>
                    <div class="entry-price">
                      <span class="label">{{ $t('portfolio.positions.entryPrice') }}</span>
                      <span class="value">{{ getCurrencySymbol(pos.market) }}{{ formatPrice(pos.entry_price) }}</span>
                    </div>
                  </div>

                  <div class="quantity-row">
                    <div class="item">
                      <span class="label">{{ $t('portfolio.positions.quantity') }}</span>
                      <span class="value">{{ formatNumber(pos.quantity, 4) }}</span>
                    </div>
                    <div class="item">
                      <span class="label">{{ $t('portfolio.positions.side') }}</span>
                      <a-tag :color="pos.side === 'long' ? 'green' : 'red'" size="small">
                        {{ pos.side === 'long' ? $t('portfolio.positions.long') : $t('portfolio.positions.short') }}
                      </a-tag>
                    </div>
                    <div class="item">
                      <span class="label">{{ $t('portfolio.positions.marketValue') }}</span>
                      <span class="value">{{ getCurrencySymbol(pos.market) }}{{ formatNumber(pos.market_value) }}</span>
                    </div>
                  </div>
                </div>

                <div class="position-footer">
                  <div class="pnl">
                    <span class="label">{{ $t('portfolio.positions.pnl') }}</span>
                    <span class="value" :class="pos.pnl >= 0 ? 'positive' : 'negative'">
                      {{ pos.pnl >= 0 ? '+' : '' }}{{ getCurrencySymbol(pos.market) }}{{ formatNumber(pos.pnl) }}
                      <span class="percent">({{ pos.pnl_percent >= 0 ? '+' : '' }}{{ pos.pnl_percent }}%)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="position-collapse-view">
              <a-collapse v-model="activeGroups" :bordered="false">
                <a-collapse-panel v-if="ungroupedPositions.length > 0" key="__ungrouped__" class="group-panel">
                  <template slot="header">
                    <div class="group-header">
                      <span class="group-name">
                        <a-icon type="inbox" style="margin-right: 8px;" />
                        {{ $t('portfolio.groups.ungrouped') }}
                      </span>
                      <span class="group-stats">
                        <span class="count">{{ ungroupedPositions.length }} {{ $t('portfolio.positions.items') }}</span>
                        <span class="group-pnl" :class="getGroupPnl(ungroupedPositions) >= 0 ? 'positive' : 'negative'">
                          {{ getGroupPnl(ungroupedPositions) >= 0 ? '+' : '' }}${{ formatNumber(getGroupPnl(ungroupedPositions)) }}
                        </span>
                      </span>
                    </div>
                  </template>
                  <div class="position-grid compact">
                    <div
                      v-for="pos in ungroupedPositions"
                      :key="pos.id"
                      class="position-card compact"
                      :class="{ 'profit': pos.pnl >= 0, 'loss': pos.pnl < 0 }"
                    >
                      <div class="position-header">
                        <div class="symbol-info">
                          <a-tag :color="getMarketColor(pos.market)" size="small">{{ getMarketName(pos.market) }}</a-tag>
                          <span class="symbol">{{ pos.symbol }}</span>
                          <span class="name">{{ pos.name }}</span>
                        </div>
                        <div class="position-actions">
                          <a-button type="link" size="small" @click="editPosition(pos)">
                            <a-icon type="edit" />
                          </a-button>
                          <a-popconfirm :title="$t('portfolio.positions.deleteConfirm')" @confirm="deletePosition(pos.id)">
                            <a-button type="link" size="small" class="delete-btn"><a-icon type="delete" /></a-button>
                          </a-popconfirm>
                        </div>
                      </div>
                      <div class="position-compact-body">
                        <div class="compact-item">
                          <span class="value">{{ getCurrencySymbol(pos.market) }}{{ formatPrice(pos.current_price) }}</span>
                          <span class="change" :class="pos.price_change >= 0 ? 'up' : 'down'">
                            {{ pos.price_change >= 0 ? '+' : '-' }}{{ Math.abs(pos.price_change_percent).toFixed(2) }}%
                          </span>
                        </div>
                        <div class="compact-item">
                          <span class="label">{{ $t('portfolio.positions.quantity') }}:</span>
                          <span class="value">{{ formatNumber(pos.quantity, 4) }}</span>
                        </div>
                        <div class="compact-item pnl" :class="pos.pnl >= 0 ? 'positive' : 'negative'">
                          {{ pos.pnl >= 0 ? '+' : '' }}{{ getCurrencySymbol(pos.market) }}{{ formatNumber(pos.pnl) }}
                          <span class="percent">({{ pos.pnl_percent >= 0 ? '+' : '' }}{{ pos.pnl_percent }}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </a-collapse-panel>

                <a-collapse-panel v-for="group in groupsWithPositions" :key="group.name" class="group-panel">
                  <template slot="header">
                    <div class="group-header">
                      <span class="group-name">
                        <a-icon type="folder" style="margin-right: 8px; color: var(--primary-color, #1890ff);" />
                        {{ group.name }}
                      </span>
                      <span class="group-stats">
                        <span class="count">{{ group.positions.length }} {{ $t('portfolio.positions.items') }}</span>
                        <span class="group-pnl" :class="getGroupPnl(group.positions) >= 0 ? 'positive' : 'negative'">
                          {{ getGroupPnl(group.positions) >= 0 ? '+' : '' }}${{ formatNumber(getGroupPnl(group.positions)) }}
                        </span>
                      </span>
                    </div>
                  </template>
                  <div class="position-grid compact">
                    <div
                      v-for="pos in group.positions"
                      :key="pos.id"
                      class="position-card compact"
                      :class="{ 'profit': pos.pnl >= 0, 'loss': pos.pnl < 0 }"
                    >
                      <div class="position-header">
                        <div class="symbol-info">
                          <a-tag :color="getMarketColor(pos.market)" size="small">{{ getMarketName(pos.market) }}</a-tag>
                          <span class="symbol">{{ pos.symbol }}</span>
                          <span class="name">{{ pos.name }}</span>
                        </div>
                        <div class="position-actions">
                          <a-button type="link" size="small" @click="editPosition(pos)">
                            <a-icon type="edit" />
                          </a-button>
                          <a-popconfirm :title="$t('portfolio.positions.deleteConfirm')" @confirm="deletePosition(pos.id)">
                            <a-button type="link" size="small" class="delete-btn"><a-icon type="delete" /></a-button>
                          </a-popconfirm>
                        </div>
                      </div>
                      <div class="position-compact-body">
                        <div class="compact-item">
                          <span class="value">{{ getCurrencySymbol(pos.market) }}{{ formatPrice(pos.current_price) }}</span>
                          <span class="change" :class="pos.price_change >= 0 ? 'up' : 'down'">
                            {{ pos.price_change >= 0 ? '+' : '-' }}{{ Math.abs(pos.price_change_percent).toFixed(2) }}%
                          </span>
                        </div>
                        <div class="compact-item">
                          <span class="label">{{ $t('portfolio.positions.quantity') }}:</span>
                          <span class="value">{{ formatNumber(pos.quantity, 4) }}</span>
                        </div>
                        <div class="compact-item pnl" :class="pos.pnl >= 0 ? 'positive' : 'negative'">
                          {{ pos.pnl >= 0 ? '+' : '' }}{{ getCurrencySymbol(pos.market) }}{{ formatNumber(pos.pnl) }}
                          <span class="percent">({{ pos.pnl_percent >= 0 ? '+' : '' }}{{ pos.pnl_percent }}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </a-collapse-panel>
              </a-collapse>
            </div>
          </div>
        </a-spin>
      </div>

      <div class="monitors-section" ref="monitorsSection">
        <div class="section-header">
          <h3>
            <a-icon type="eye" />
            <span>{{ $t('portfolio.monitors.title') }}</span>
          </h3>
          <a-button type="primary" @click="openAddMonitorModal">
            <a-icon type="plus" />
            {{ $t('portfolio.monitors.add') }}
          </a-button>
        </div>

        <a-spin :spinning="loadingMonitors">
          <div class="monitors-list">
            <div v-if="monitors.length === 0" class="empty-state small">
              <a-empty :description="$t('portfolio.monitors.empty')" :image="simpleImage">
                <a-button type="primary" size="small" @click="openAddMonitorModal">
                  <a-icon type="plus" />
                  {{ $t('portfolio.monitors.addFirst') }}
                </a-button>
              </a-empty>
            </div>

            <div v-else>
              <div v-for="monitor in monitors" :key="monitor.id" class="monitor-card">
                <div class="monitor-header">
                  <div class="monitor-name">
                    <a-icon type="robot" />
                    <span>{{ monitor.name }}</span>
                  </div>
                  <a-switch
                    :checked="monitor.is_active"
                    @change="toggleMonitor(monitor.id, $event)"
                    size="small"
                  />
                </div>
                <div class="monitor-body">
                  <div class="monitor-info">
                    <span class="label">{{ $t('portfolio.monitors.interval') }}:</span>
                    <span class="value">{{ getIntervalText(monitor.config.interval_minutes) }}</span>
                  </div>
                  <div class="monitor-info">
                    <span class="label">{{ $t('portfolio.form.monitorScope') }}:</span>
                    <span class="value">
                      <template v-if="getMonitorPositionIds(monitor).length > 0">
                        <a-tooltip>
                          <template slot="title">
                            <div v-for="posId in getMonitorPositionIds(monitor)" :key="posId">
                              {{ getPositionNameById(posId) }}
                            </div>
                          </template>
                          <span class="scope-selected">
                            {{ $t('portfolio.form.selectedCount', { count: getMonitorPositionIds(monitor).length, total: positions.length }) }}
                          </span>
                        </a-tooltip>
                      </template>
                      <span v-else class="scope-all">{{ $t('portfolio.form.allPositions') }}</span>
                    </span>
                  </div>
                  <div class="monitor-info" v-if="monitor.last_run_at">
                    <span class="label">{{ $t('portfolio.monitors.lastRun') }}:</span>
                    <span class="value">{{ formatTime(monitor.last_run_at) }}</span>
                  </div>
                  <div class="monitor-info" v-if="monitor.next_run_at && monitor.is_active">
                    <span class="label">{{ $t('portfolio.monitors.nextRun') }}:</span>
                    <span class="value">{{ formatTime(monitor.next_run_at) }}</span>
                  </div>
                  <div class="monitor-channels" v-if="monitor.notification_config.channels">
                    <span class="label">{{ $t('portfolio.monitors.channels') }}:</span>
                    <a-tag v-for="ch in monitor.notification_config.channels" :key="ch" size="small">
                      {{ ch }}
                    </a-tag>
                  </div>
                </div>
                <div class="monitor-actions">
                  <a-button type="link" size="small" @click="runMonitorNow(monitor.id)" :loading="runningMonitor === monitor.id">
                    <a-icon type="play-circle" />
                    {{ $t('portfolio.monitors.runNow') }}
                  </a-button>
                  <a-button type="link" size="small" @click="editMonitor(monitor)">
                    <a-icon type="edit" />
                  </a-button>
                  <a-popconfirm
                    :title="$t('portfolio.monitors.deleteConfirm')"
                    @confirm="deleteMonitor(monitor.id)"
                  >
                    <a-button type="link" size="small" class="delete-btn">
                      <a-icon type="delete" />
                    </a-button>
                  </a-popconfirm>
                </div>
              </div>
            </div>
          </div>
        </a-spin>
      </div>
    </div>

    <a-modal
      :title="editingPosition ? $t('portfolio.modal.editPosition') : $t('portfolio.modal.addPosition')"
      :visible="showAddPositionModal"
      @ok="handleSavePosition"
      @cancel="closePositionModal"
      :confirmLoading="savingPosition"
      width="600px"
    >
      <a-form :form="positionForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item :label="$t('portfolio.form.market')">
          <a-select
            v-decorator="['market', { rules: [{ required: true, message: $t('portfolio.form.marketRequired') }] }]"
            :placeholder="$t('portfolio.form.selectMarket')"
            @change="handleMarketChange"
            :disabled="!!editingPosition"
          >
            <a-select-option v-for="mt in marketTypes" :key="mt.value" :value="mt.value">
              {{ $t(mt.i18nKey) }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="$t('portfolio.form.symbol')">
          <a-select
            v-decorator="['symbol', { rules: [{ required: true, message: $t('portfolio.form.symbolRequired') }] }]"
            show-search
            :placeholder="$t('portfolio.form.searchSymbol')"
            :default-active-first-option="false"
            :show-arrow="false"
            :filter-option="false"
            :not-found-content="null"
            @search="handleSymbolSearch"
            @change="handleSymbolSelect"
            :disabled="!!editingPosition"
            style="width: 100%"
          >
            <a-select-option v-for="item in symbolSearchResults" :key="item.symbol" :value="item.symbol">
              <div class="symbol-option">
                <strong>{{ item.symbol }}</strong>
                <span class="symbol-name">{{ item.name }}</span>
              </div>
            </a-select-option>
            <a-select-option
              v-if="symbolSearchKeyword && symbolSearchResults.length === 0"
              :key="'__manual__' + symbolSearchKeyword.toUpperCase()"
              :value="symbolSearchKeyword.toUpperCase()"
            >
              <div class="symbol-option manual-input">
                <a-icon type="edit" style="margin-right: 6px; color: var(--primary-color, #1890ff);" />
                <span>{{ $t('portfolio.form.useAsSymbol') }} </span>
                <strong style="color: var(--primary-color, #1890ff);">{{ symbolSearchKeyword.toUpperCase() }}</strong>
                <span> {{ $t('portfolio.form.asSymbolCode') }}</span>
              </div>
            </a-select-option>
          </a-select>
          <div class="symbol-hint" style="font-size: 12px; color: #999; margin-top: 4px;">
            {{ $t('portfolio.form.symbolHint') }}
          </div>
        </a-form-item>

        <a-form-item :label="$t('portfolio.form.side')">
          <a-radio-group v-decorator="['side', { initialValue: 'long' }]" :disabled="!!editingPosition">
            <a-radio-button value="long">{{ $t('portfolio.positions.long') }}</a-radio-button>
            <a-radio-button value="short">{{ $t('portfolio.positions.short') }}</a-radio-button>
          </a-radio-group>
        </a-form-item>

        <a-form-item :label="$t('portfolio.form.quantity')">
          <a-input-number
            v-decorator="['quantity', { rules: [{ required: true, message: $t('portfolio.form.quantityRequired') }] }]"
            :min="0.00000001"
            :step="1"
            style="width: 100%"
            :placeholder="$t('portfolio.form.enterQuantity')"
          />
        </a-form-item>

        <a-form-item :label="$t('portfolio.form.entryPrice')">
          <a-input-number
            v-decorator="['entry_price', { rules: [{ required: true, message: $t('portfolio.form.entryPriceRequired') }] }]"
            :min="0.00000001"
            :step="0.01"
            style="width: 100%"
            :placeholder="$t('portfolio.form.enterEntryPrice')"
          />
        </a-form-item>

        <a-form-item :label="$t('portfolio.form.notes')">
          <a-textarea
            v-decorator="['notes']"
            :rows="2"
            :placeholder="$t('portfolio.form.enterNotes')"
          />
        </a-form-item>

        <a-form-item :label="$t('portfolio.form.group')">
          <a-auto-complete
            v-decorator="['group_name']"
            :placeholder="$t('portfolio.form.enterGroup')"
            :dataSource="groupNames"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :title="editingAlert ? $t('portfolio.modal.editAlert') : $t('portfolio.modal.addAlert')"
      :visible="showAddAlertModal"
      @cancel="closeAlertModal"
      width="560px"
    >
      <template slot="footer">
        <div class="alert-modal-footer">
          <a-button
            v-if="editingAlert"
            type="danger"
            ghost
            :loading="deletingAlert"
            @click="confirmDeleteAlert"
          >
            <a-icon type="delete" />
            {{ $t('portfolio.alerts.delete') }}
          </a-button>
          <span v-else></span>
          <div class="footer-right">
            <a-button @click="closeAlertModal">{{ $t('common.cancel') }}</a-button>
            <a-button type="primary" :loading="savingAlert" @click="handleSaveAlert">
              {{ $t('common.save') }}
            </a-button>
          </div>
        </div>
      </template>
      <a-form :form="alertForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item :label="$t('portfolio.form.symbol')">
          <div class="alert-symbol-info">
            <a-input
              v-decorator="['symbol']"
              disabled
              class="symbol-input"
            />
            <div class="current-price-info" v-if="alertPosition">
              <span class="label">{{ $t('portfolio.alerts.currentPrice') }}:</span>
              <span class="price">${{ formatNumber(alertPosition.current_price || alertPosition.entry_price) }}</span>
            </div>
          </div>
        </a-form-item>

        <a-form-item :label="$t('portfolio.alerts.alertType')">
          <a-select
            v-decorator="['alert_type', { initialValue: 'price_above', rules: [{ required: true }] }]"
          >
            <a-select-option value="price_above">
              <a-icon type="rise" style="color: #52c41a; margin-right: 6px;" />
              {{ $t('portfolio.alerts.priceAbove') }}
            </a-select-option>
            <a-select-option value="price_below">
              <a-icon type="fall" style="color: #f5222d; margin-right: 6px;" />
              {{ $t('portfolio.alerts.priceBelow') }}
            </a-select-option>
            <a-select-option value="pnl_above">
              <a-icon type="dollar" style="color: #52c41a; margin-right: 6px;" />
              {{ $t('portfolio.alerts.pnlAbove') }}
            </a-select-option>
            <a-select-option value="pnl_below">
              <a-icon type="dollar" style="color: #f5222d; margin-right: 6px;" />
              {{ $t('portfolio.alerts.pnlBelow') }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="$t('portfolio.alerts.threshold')">
          <div class="threshold-input-wrapper">
            <a-input-number
              v-decorator="['threshold', { rules: [{ required: true, message: $t('portfolio.alerts.thresholdRequired') }] }]"
              :step="alertTypeIsPrice ? 0.01 : 1"
              style="width: 100%"
              :placeholder="alertTypeIsPrice ? $t('portfolio.alerts.enterPrice') : $t('portfolio.alerts.enterPercent')"
              :precision="alertTypeIsPrice ? 4 : 2"
            />
            <span class="alert-unit" v-if="!alertTypeIsPrice">%</span>
            <span class="alert-unit" v-else>$</span>
          </div>
          <div class="threshold-hint" v-if="alertPosition && alertTypeIsPrice">
            {{ $t('portfolio.alerts.currentPriceHint') }}: ${{ formatNumber(alertPosition.current_price || alertPosition.entry_price) }}
          </div>
        </a-form-item>

        <a-form-item :label="$t('portfolio.alerts.repeatInterval')">
          <a-select
            v-decorator="['repeat_interval', { initialValue: 0 }]"
          >
            <a-select-option :value="0">{{ $t('portfolio.alerts.noRepeat') }}</a-select-option>
            <a-select-option :value="5">{{ $t('portfolio.alerts.every5min') }}</a-select-option>
            <a-select-option :value="15">{{ $t('portfolio.alerts.every15min') }}</a-select-option>
            <a-select-option :value="30">{{ $t('portfolio.alerts.every30min') }}</a-select-option>
            <a-select-option :value="60">{{ $t('portfolio.alerts.every1hour') }}</a-select-option>
            <a-select-option :value="240">{{ $t('portfolio.alerts.every4hours') }}</a-select-option>
            <a-select-option :value="1440">{{ $t('portfolio.alerts.onceDaily') }}</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="$t('portfolio.form.notifyChannels')">
          <a-checkbox-group v-model="alertChannels">
            <a-checkbox value="browser">
              <a-icon type="bell" />
              {{ $t('portfolio.form.browser') }}
            </a-checkbox>
            <a-checkbox value="telegram">
              <a-icon type="message" />
              Telegram
            </a-checkbox>
            <a-checkbox value="email">
              <a-icon type="mail" />
              {{ $t('portfolio.form.email') }}
            </a-checkbox>
          </a-checkbox-group>
        </a-form-item>

        <!-- Notification settings hint -->
        <a-alert
          v-if="alertChannels.includes('telegram') || alertChannels.includes('email')"
          type="info"
          showIcon
          style="margin-bottom: 16px"
        >
          <template #message>
            <span>
              {{ $t('portfolio.form.notificationFromProfile') }}
              <router-link :to="{ path: '/profile', query: { tab: 'notifications' } }" style="margin-left: 8px">
                <a-icon type="setting" /> {{ $t('portfolio.form.goToProfile') }}
              </router-link>
            </span>
          </template>
        </a-alert>

        <a-form-item :label="$t('portfolio.alerts.enabled')">
          <a-switch
            v-decorator="['is_active', { initialValue: true, valuePropName: 'checked' }]"
          />
          <span class="switch-label">{{ $t('portfolio.alerts.enabledDesc') }}</span>
        </a-form-item>

        <a-form-item :label="$t('portfolio.form.notes')">
          <a-textarea
            v-decorator="['notes']"
            :placeholder="$t('portfolio.form.enterNotes')"
            :autoSize="{ minRows: 2, maxRows: 4 }"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :title="editingMonitor ? $t('portfolio.modal.editMonitor') : $t('portfolio.modal.addMonitor')"
      :visible="showAddMonitorModal"
      @ok="handleSaveMonitor"
      @cancel="closeMonitorModal"
      :confirmLoading="savingMonitor"
      width="600px"
    >
      <a-form :form="monitorForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item :label="$t('portfolio.form.monitorName')">
          <a-input
            v-decorator="['name', { rules: [{ required: true, message: $t('portfolio.form.monitorNameRequired') }] }]"
            :placeholder="$t('portfolio.form.enterMonitorName')"
          />
        </a-form-item>

        <a-form-item :label="$t('portfolio.form.interval')">
          <a-select
            v-decorator="['interval_minutes', { initialValue: 60, rules: [{ required: true }] }]"
          >
            <a-select-option :value="5">5 {{ $t('portfolio.form.minutes') }}</a-select-option>
            <a-select-option :value="10">10 {{ $t('portfolio.form.minutes') }}</a-select-option>
            <a-select-option :value="30">30 {{ $t('portfolio.form.minutes') }}</a-select-option>
            <a-select-option :value="60">1 {{ $t('portfolio.form.hour') }}</a-select-option>
            <a-select-option :value="120">2 {{ $t('portfolio.form.hours') }}</a-select-option>
            <a-select-option :value="240">4 {{ $t('portfolio.form.hours') }}</a-select-option>
            <a-select-option :value="480">8 {{ $t('portfolio.form.hours') }}</a-select-option>
            <a-select-option :value="1440">24 {{ $t('portfolio.form.hours') }}</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="$t('portfolio.form.notifyChannels')">
          <a-checkbox-group v-model="monitorChannels">
            <a-checkbox value="browser">{{ $t('portfolio.form.browser') }}</a-checkbox>
            <a-checkbox value="telegram">Telegram</a-checkbox>
            <a-checkbox value="email">{{ $t('portfolio.form.email') }}</a-checkbox>
          </a-checkbox-group>
        </a-form-item>

        <!-- Notification settings hint -->
        <a-alert
          v-if="monitorChannels.includes('telegram') || monitorChannels.includes('email')"
          type="info"
          showIcon
          style="margin-bottom: 16px"
        >
          <template #message>
            <span>
              {{ $t('portfolio.form.notificationFromProfile') }}
              <router-link :to="{ path: '/profile', query: { tab: 'notifications' } }" style="margin-left: 8px">
                <a-icon type="setting" /> {{ $t('portfolio.form.goToProfile') }}
              </router-link>
            </span>
          </template>
        </a-alert>

        <a-form-item :label="$t('portfolio.form.monitorScope')">
          <a-radio-group v-model="monitorScope" @change="handleMonitorScopeChange">
            <a-radio value="all">{{ $t('portfolio.form.allPositions') }}</a-radio>
            <a-radio value="selected">{{ $t('portfolio.form.selectedPositions') }}</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item
          :label="$t('portfolio.form.selectPositions')"
          v-if="monitorScope === 'selected'"
        >
          <a-checkbox-group
            v-model="selectedMonitorPositions"
            class="position-checkbox-group"
          >
            <div
              v-for="pos in positions"
              :key="pos.id"
              class="position-checkbox-item"
            >
              <a-checkbox :value="pos.id" class="position-checkbox">
                <div class="position-checkbox-label">
                  <div class="position-left">
                    <a-tag :color="getMarketColor(pos.market)" size="small">{{ pos.market }}</a-tag>
                    <span class="symbol">{{ pos.symbol }}</span>
                  </div>
                  <div class="position-middle">
                    <span class="name" :title="pos.name">{{ pos.name }}</span>
                  </div>
                  <div class="position-right">
                    <span :class="['pnl', pos.pnl >= 0 ? 'positive' : 'negative']">
                      {{ pos.pnl >= 0 ? '+' : '' }}{{ formatNumber(pos.pnl_percent) }}%
                    </span>
                  </div>
                </div>
              </a-checkbox>
            </div>
          </a-checkbox-group>
          <div class="position-select-actions">
            <a-button type="link" size="small" @click="selectAllPositions">
              {{ $t('portfolio.form.selectAll') }}
            </a-button>
            <a-divider type="vertical" />
            <a-button type="link" size="small" @click="deselectAllPositions">
              {{ $t('portfolio.form.deselectAll') }}
            </a-button>
            <span class="selected-count">
              {{ $t('portfolio.form.selectedCount', { count: selectedMonitorPositions.length, total: positions.length }) }}
            </span>
          </div>
        </a-form-item>

        <a-form-item :label="$t('portfolio.form.customPrompt')">
          <a-textarea
            v-decorator="['prompt']"
            :rows="3"
            :placeholder="$t('portfolio.form.customPromptPlaceholder')"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { Empty } from 'ant-design-vue'
import {
  getPositions, addPosition, updatePosition, deletePosition as deletePositionApi,
  getPortfolioSummary,
  getMonitors, addMonitor, updateMonitor, deleteMonitor as deleteMonitorApi, runMonitor,
  getAlerts, addAlert, updateAlert, deleteAlert as deleteAlertApi,
  getGroups,
  searchSymbols, getMarketTypes
} from '@/api/portfolio'
import { getNotificationSettings } from '@/api/user'

const DEFAULT_NOTIFICATION_CHANNELS = ['browser', 'email']
const normalizeNotificationChannels = channels => (
  Array.isArray(channels) && channels.length ? channels : DEFAULT_NOTIFICATION_CHANNELS
)

export default {
  name: 'Portfolio',
  props: {
    embedded: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      simpleImage: Empty.PRESENTED_IMAGE_SIMPLE,
      // Summary
      summary: {
        total_cost: 0,
        total_market_value: 0,
        total_pnl: 0,
        total_pnl_percent: 0,
        position_count: 0,
        market_distribution: [],
        today_pnl: 0,
        today_change: 0
      },
      // Positions
      positions: [],
      loadingPositions: false,
      showAddPositionModal: false,
      savingPosition: false,
      editingPosition: null,
      positionForm: null,
      // Monitors
      monitors: [],
      loadingMonitors: false,
      showAddMonitorModal: false,
      savingMonitor: false,
      editingMonitor: null,
      monitorForm: null,
      runningMonitor: null,
      // Market types
      marketTypes: [],
      // Symbol search
      symbolSearchResults: [],
      searchTimer: null,
      selectedSymbolName: '',
      symbolSearchKeyword: '',
      // Price refresh
      priceRefreshTimer: null,
      lastSyncTime: null,
      isSyncing: false,
      // Groups
      groups: [],
      selectedGroup: '',
      // View mode
      viewMode: 'grid', // 'grid' or 'group'
      activeGroups: [],
      // Alerts
      alerts: [],
      loadingAlerts: false,
      showAddAlertModal: false,
      savingAlert: false,
      deletingAlert: false,
      editingAlert: null,
      alertForm: null,
      alertPosition: null,
      // Alert channels (for reactive display)
      alertChannels: [...DEFAULT_NOTIFICATION_CHANNELS],
      // Monitor channels (for reactive display)
      monitorChannels: [...DEFAULT_NOTIFICATION_CHANNELS],
      // Monitor scope (all or selected positions)
      monitorScope: 'all',
      // Selected positions for monitoring
      selectedMonitorPositions: [],
      // User's default notification settings (loaded from profile)
      userNotificationSettings: {
        default_channels: [...DEFAULT_NOTIFICATION_CHANNELS],
        telegram_bot_token: '',
        telegram_chat_id: '',
        email: '',
        phone: '',
        discord_webhook: '',
        webhook_url: '',
        webhook_token: ''
      }
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    selectedChannels () {
      return this.monitorChannels || []
    },
    selectedAlertChannels () {
      return this.alertChannels || []
    },
    filteredPositions () {
      if (!this.selectedGroup) {
        return this.positions
      }
      if (this.selectedGroup === '__ungrouped__') {
        return this.positions.filter(p => !p.group_name)
      }
      return this.positions.filter(p => p.group_name === this.selectedGroup)
    },
    groupNames () {
      return this.groups.map(g => g.name)
    },
    alertTypeIsPrice () {
      if (!this.alertForm) return true
      const alertType = this.alertForm.getFieldValue('alert_type')
      return alertType && alertType.startsWith('price_')
    },
    profitLossStats () {
      const profit = this.positions.filter(p => p.pnl >= 0).length
      const loss = this.positions.filter(p => p.pnl < 0).length
      return { profit, loss }
    },
    bestPerformer () {
      if (this.positions.length === 0) return null
      return this.positions.reduce((best, pos) => {
        if (!best || (pos.pnl_percent || 0) > (best.pnl_percent || 0)) return pos
        return best
      }, null)
    },
    worstPerformer () {
      if (this.positions.length === 0) return null
      return this.positions.reduce((worst, pos) => {
        if (!worst || (pos.pnl_percent || 0) < (worst.pnl_percent || 0)) return pos
        return worst
      }, null)
    },
    ungroupedPositions () {
      return this.positions.filter(p => !p.group_name)
    },
    groupsWithPositions () {
      const groupMap = {}
      this.positions.forEach(pos => {
        if (pos.group_name) {
          if (!groupMap[pos.group_name]) {
            groupMap[pos.group_name] = {
              name: pos.group_name,
              positions: []
            }
          }
          groupMap[pos.group_name].positions.push(pos)
        }
      })
      return Object.values(groupMap).sort((a, b) => a.name.localeCompare(b.name))
    }
  },
  created () {
    this.positionForm = this.$form.createForm(this, { name: 'position_form' })
    this.monitorForm = this.$form.createForm(this, { name: 'monitor_form' })
    this.alertForm = this.$form.createForm(this, { name: 'alert_form' })
    this.loadMarketTypes()
    this.loadData()
  },
  mounted () {
    // Refresh prices every 30 seconds
    this.priceRefreshTimer = setInterval(() => {
      this.refreshPrices()
    }, 30000)
    // Load user's notification settings for default values
    this.loadUserNotificationSettings()
  },
  beforeDestroy () {
    if (this.priceRefreshTimer) {
      clearInterval(this.priceRefreshTimer)
    }
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }
  },
  methods: {
    async loadUserNotificationSettings () {
      // Load user's default notification settings
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
    async loadData () {
      await Promise.all([
        this.loadPositions(),
        this.loadSummary(),
        this.loadMonitors(),
        this.loadGroups(),
        this.loadAlerts()
      ])
      this.lastSyncTime = new Date()
    },
    filterByGroup () {
      // Filter is handled by computed property
    },
    async refreshPrices () {
      if (this.isSyncing) return
      this.isSyncing = true
      try {
        await Promise.all([
          this.loadPositions(true),
          this.loadSummary(true)
        ])
        this.lastSyncTime = new Date()
      } finally {
        this.isSyncing = false
      }
    },
    formatSyncTime (time) {
      if (!time) return '-'
      const now = new Date()
      const diff = Math.floor((now - time) / 1000)
      if (diff < 60) return this.$t('portfolio.summary.justNow')
      if (diff < 3600) return `${Math.floor(diff / 60)} ${this.$t('portfolio.form.minutes')}${this.$t('portfolio.summary.ago')}`
      return time.toLocaleTimeString()
    },
    getGroupPnl (positions) {
      return positions.reduce((sum, pos) => sum + (pos.pnl || 0), 0)
    },
    async loadGroups () {
      try {
        const res = await getGroups()
        if (res && res.code === 1 && res.data) {
          this.groups = res.data.groups || []
        }
      } catch (e) {
        console.error('Failed to load groups:', e)
      }
    },
    async loadAlerts () {
      this.loadingAlerts = true
      try {
        const res = await getAlerts()
        if (res && res.code === 1) {
          this.alerts = res.data || []
        }
      } catch (e) {
        console.error('Failed to load alerts:', e)
      } finally {
        this.loadingAlerts = false
      }
    },
    async loadMarketTypes () {
      try {
        const res = await getMarketTypes()
        if (res && res.code === 1 && res.data) {
          this.marketTypes = res.data.map(item => ({
            value: item.value,
            i18nKey: item.i18nKey || `dashboard.analysis.market.${item.value}`
          }))
        }
      } catch (e) {
        this.marketTypes = [
          { value: 'USStock', i18nKey: 'dashboard.analysis.market.USStock' },
          { value: 'Crypto', i18nKey: 'dashboard.analysis.market.Crypto' },
          { value: 'Forex', i18nKey: 'dashboard.analysis.market.Forex' },
          { value: 'Futures', i18nKey: 'dashboard.analysis.market.Futures' }
        ]
      }
    },
    async loadPositions (forceRefresh = false) {
      this.loadingPositions = true
      try {
        const params = forceRefresh ? { refresh: '1' } : {}
        const res = await getPositions(params)
        if (res && res.code === 1) {
          this.positions = res.data || []
        }
      } catch (e) {
        this.$message.error(this.$t('portfolio.message.loadFailed'))
      } finally {
        this.loadingPositions = false
      }
    },
    async loadSummary (forceRefresh = false) {
      try {
        const res = await getPortfolioSummary(forceRefresh ? { refresh: '1' } : {})
        if (res && res.code === 1) {
          this.summary = res.data || this.summary
        }
      } catch (e) {
        console.error('Failed to load summary:', e)
      }
    },
    async loadMonitors () {
      this.loadingMonitors = true
      try {
        const res = await getMonitors()
        if (res && res.code === 1) {
          this.monitors = res.data || []
        }
      } catch (e) {
        console.error('Failed to load monitors:', e)
      } finally {
        this.loadingMonitors = false
      }
    },
    // Position methods
    handleMarketChange (value) {
      this.symbolSearchResults = []
      this.symbolSearchKeyword = ''
      this.positionForm.setFieldsValue({ symbol: '' })
    },
    handleSymbolSearch (value) {
      this.symbolSearchKeyword = value || ''

      if (this.searchTimer) {
        clearTimeout(this.searchTimer)
      }
      if (!value || value.length < 1) {
        this.symbolSearchResults = []
        return
      }
      this.searchTimer = setTimeout(async () => {
        const market = this.positionForm.getFieldValue('market')
        if (!market) return
        try {
          const res = await searchSymbols({ market, keyword: value, limit: 10 })
          if (res && res.code === 1) {
            this.symbolSearchResults = res.data || []
          } else {
            this.symbolSearchResults = []
          }
        } catch (e) {
          this.symbolSearchResults = []
        }
      }, 300)
    },
    handleSymbolSelect (value, option) {
      const item = this.symbolSearchResults.find(s => s.symbol === value)
      if (item) {
        this.selectedSymbolName = item.name
      } else {
        this.selectedSymbolName = ''
      }
      this.symbolSearchKeyword = ''
    },
    editPosition (pos) {
      this.editingPosition = pos
      this.showAddPositionModal = true
      this.$nextTick(() => {
        this.positionForm.setFieldsValue({
          market: pos.market,
          symbol: pos.symbol,
          side: pos.side,
          quantity: pos.quantity,
          entry_price: pos.entry_price,
          notes: pos.notes,
          group_name: pos.group_name || ''
        })
      })
    },
    async handleSavePosition () {
      this.positionForm.validateFields(async (err, values) => {
        if (err) return
        this.savingPosition = true
        try {
          const data = {
            market: values.market,
            symbol: values.symbol.toUpperCase(),
            side: values.side,
            quantity: values.quantity,
            entry_price: values.entry_price,
            notes: values.notes || '',
            name: this.selectedSymbolName || '',
            group_name: values.group_name || ''
          }

          let res
          if (this.editingPosition) {
            res = await updatePosition(this.editingPosition.id, data)
          } else {
            res = await addPosition(data)
          }

          if (res && res.code === 1) {
            this.$message.success(this.$t('portfolio.message.saveSuccess'))
            this.closePositionModal()
            this.loadData()
          } else {
            this.$message.error(res?.msg || this.$t('portfolio.message.saveFailed'))
          }
        } catch (e) {
          this.$message.error(this.$t('portfolio.message.saveFailed'))
        } finally {
          this.savingPosition = false
        }
      })
    },
    async deletePosition (id) {
      try {
        const res = await deletePositionApi(id)
        if (res && res.code === 1) {
          this.$message.success(this.$t('portfolio.message.deleteSuccess'))
          this.loadData()
        } else {
          this.$message.error(res?.msg || this.$t('portfolio.message.deleteFailed'))
        }
      } catch (e) {
        this.$message.error(this.$t('portfolio.message.deleteFailed'))
      }
    },
    closePositionModal () {
      this.showAddPositionModal = false
      this.editingPosition = null
      this.positionForm.resetFields()
      this.symbolSearchResults = []
      this.selectedSymbolName = ''
      this.symbolSearchKeyword = ''
    },
    // Alert methods
    handleAlertChannelsChange (channels) {
      this.alertChannels = channels || []
    },
    showAddAlertForPosition (pos) {
      const existingAlert = this.alerts.find(a => a.position_id === pos.id)
      if (existingAlert) {
        this.editAlert(existingAlert)
        return
      }
      this.editingAlert = null
      this.alertPosition = pos
      this.alertChannels = [...normalizeNotificationChannels(this.userNotificationSettings.default_channels)]
      this.showAddAlertModal = true
      this.$nextTick(() => {
        this.alertForm.setFieldsValue({
          symbol: `${pos.market}/${pos.symbol}`,
          alert_type: 'price_above',
          threshold: pos.current_price || pos.entry_price,
          repeat_interval: 0,
          is_active: true,
          notes: ''
        })
      })
    },
    editAlert (alert) {
      this.editingAlert = alert
      this.alertPosition = this.positions.find(p => p.id === alert.position_id) || {
        market: alert.market,
        symbol: alert.symbol,
        current_price: 0,
        entry_price: 0
      }
      // Set channels directly with v-model binding
      this.alertChannels = [...normalizeNotificationChannels(alert.notification_config?.channels)]
      // Show modal
      this.showAddAlertModal = true
      // Set form values for fields still using v-decorator
      this.$nextTick(() => {
        if (this.alertForm) {
          this.alertForm.setFieldsValue({
            symbol: `${alert.market}/${alert.symbol}`,
            alert_type: alert.alert_type || 'price_above',
            threshold: alert.threshold || 0,
            repeat_interval: alert.repeat_interval || 0,
            is_active: alert.is_active !== false,
            notes: alert.notes || ''
          })
        }
      })
    },
    async handleSaveAlert () {
      this.alertForm.validateFields(async (err, values) => {
        if (err) return
        this.savingAlert = true
        try {
          const targets = {}
          if (this.alertChannels.includes('telegram') && this.userNotificationSettings.telegram_chat_id) {
            targets.telegram = this.userNotificationSettings.telegram_chat_id
            if (this.userNotificationSettings.telegram_bot_token) {
              targets.telegram_bot_token = this.userNotificationSettings.telegram_bot_token
            }
          }
          if (this.alertChannels.includes('email') && this.userNotificationSettings.email) {
            targets.email = this.userNotificationSettings.email
          }
          if (this.alertChannels.includes('phone') && this.userNotificationSettings.phone) {
            targets.phone = this.userNotificationSettings.phone
          }
          if (this.alertChannels.includes('discord') && this.userNotificationSettings.discord_webhook) {
            targets.discord = this.userNotificationSettings.discord_webhook
          }
          if (this.alertChannels.includes('webhook') && this.userNotificationSettings.webhook_url) {
            targets.webhook = this.userNotificationSettings.webhook_url
            if (this.userNotificationSettings.webhook_token) {
              targets.webhook_token = this.userNotificationSettings.webhook_token
            }
          }

          const data = {
            position_id: this.alertPosition?.id,
            market: this.alertPosition?.market,
            symbol: this.alertPosition?.symbol,
            alert_type: values.alert_type,
            threshold: values.threshold,
            notification_config: {
              channels: normalizeNotificationChannels(this.alertChannels),
              targets: targets,
              language: this.$store.getters.lang || 'en-US'
            },
            is_active: values.is_active !== false,
            repeat_interval: values.repeat_interval || 0,
            notes: values.notes || ''
          }

          let res
          if (this.editingAlert) {
            res = await updateAlert(this.editingAlert.id, data)
          } else {
            res = await addAlert(data)
          }

          if (res && res.code === 1) {
            this.$message.success(this.$t('portfolio.message.saveSuccess'))
            this.closeAlertModal()
            this.loadAlerts()
          } else {
            this.$message.error(res?.msg || this.$t('portfolio.message.saveFailed'))
          }
        } catch (e) {
          this.$message.error(this.$t('portfolio.message.saveFailed'))
        } finally {
          this.savingAlert = false
        }
      })
    },
    async deleteAlert (id) {
      try {
        const res = await deleteAlertApi(id)
        if (res && res.code === 1) {
          this.$message.success(this.$t('portfolio.message.deleteSuccess'))
          this.loadAlerts()
        } else {
          this.$message.error(res?.msg || this.$t('portfolio.message.deleteFailed'))
        }
      } catch (e) {
        this.$message.error(this.$t('portfolio.message.deleteFailed'))
      }
    },
    closeAlertModal () {
      this.showAddAlertModal = false
      this.editingAlert = null
      this.alertPosition = null
      this.alertChannels = [...normalizeNotificationChannels(this.userNotificationSettings.default_channels)]
      this.alertForm.resetFields()
    },
    confirmDeleteAlert () {
      if (!this.editingAlert) return
      const self = this
      this.$confirm({
        title: this.$t('portfolio.alerts.deleteConfirm'),
        okText: this.$t('common.confirm'),
        okType: 'danger',
        cancelText: this.$t('common.cancel'),
        async onOk () {
          await self.handleDeleteAlert()
        }
      })
    },
    async handleDeleteAlert () {
      if (!this.editingAlert) return
      this.deletingAlert = true
      try {
        const res = await deleteAlertApi(this.editingAlert.id)
        if (res && res.code === 1) {
          this.$message.success(this.$t('portfolio.message.deleteSuccess'))
          this.closeAlertModal()
          await this.loadAlerts()
        } else {
          this.$message.error(res?.msg || this.$t('portfolio.message.deleteFailed'))
        }
      } catch (e) {
        console.error('Delete alert error:', e)
        this.$message.error(this.$t('portfolio.message.deleteFailed'))
      } finally {
        this.deletingAlert = false
      }
    },
    // Monitor methods
    focusMonitorsSection () {
      this.$nextTick(() => {
        const node = this.$refs.monitorsSection
        if (node && typeof node.scrollIntoView === 'function') {
          node.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },
    openAddMonitorModal () {
      // Initialize with user's default notification settings
      this.editingMonitor = null
      this.monitorChannels = [...normalizeNotificationChannels(this.userNotificationSettings.default_channels)]
      this.monitorScope = 'all'
      this.selectedMonitorPositions = []
      this.showAddMonitorModal = true
      this.$nextTick(() => {
        if (this.monitorForm) {
          this.monitorForm.resetFields()
        }
      })
    },
    handleMonitorChannelsChange (channels) {
      this.monitorChannels = channels || []
    },
    editMonitor (monitor) {
      this.editingMonitor = monitor
      // Set channels directly with v-model binding
      this.monitorChannels = [...normalizeNotificationChannels(monitor.notification_config?.channels)]
      // Update monitor scope and selected positions
      let positionIds = []
      if (monitor.position_ids) {
        if (typeof monitor.position_ids === 'string') {
          try {
            positionIds = JSON.parse(monitor.position_ids) || []
          } catch (e) {
            positionIds = []
          }
        } else if (Array.isArray(monitor.position_ids)) {
          positionIds = monitor.position_ids
        }
      }
      this.monitorScope = positionIds.length > 0 ? 'selected' : 'all'
      this.selectedMonitorPositions = positionIds
      // Show modal
      this.showAddMonitorModal = true
      // Set form values for fields still using v-decorator
      this.$nextTick(() => {
        if (this.monitorForm) {
          this.monitorForm.setFieldsValue({
            name: monitor.name,
            interval_minutes: monitor.config?.interval_minutes || 60,
            prompt: monitor.config?.prompt || ''
          })
        }
      })
    },
    handleMonitorScopeChange (e) {
      this.monitorScope = e.target.value
      if (e.target.value === 'all') {
        this.selectedMonitorPositions = []
      }
    },
    selectAllPositions () {
      this.selectedMonitorPositions = this.positions.map(p => p.id)
    },
    deselectAllPositions () {
      this.selectedMonitorPositions = []
    },
    async handleSaveMonitor () {
      this.monitorForm.validateFields(async (err, values) => {
        if (err) return

        // Validate: if selected scope but no positions selected
        if (this.monitorScope === 'selected' && this.selectedMonitorPositions.length === 0) {
          this.$message.warning(this.$t('portfolio.form.pleaseSelectPositions'))
          return
        }

        this.savingMonitor = true
        try {
          const data = {
            name: values.name,
            monitor_type: 'ai',
            // position_ids as a separate field for backend
            position_ids: this.monitorScope === 'selected' ? this.selectedMonitorPositions : [],
            config: {
              interval_minutes: values.interval_minutes,
              prompt: values.prompt || '',
              language: this.$store.getters.lang || 'en-US'
            },
            notification_config: {
              // Use user's profile notification settings
              channels: normalizeNotificationChannels(this.monitorChannels),
              targets: {
                telegram: this.userNotificationSettings.telegram_chat_id || '',
                telegram_bot_token: this.userNotificationSettings.telegram_bot_token || '',
                email: this.userNotificationSettings.email || '',
                phone: this.userNotificationSettings.phone || '',
                discord: this.userNotificationSettings.discord_webhook || '',
                webhook: this.userNotificationSettings.webhook_url || '',
                webhook_token: this.userNotificationSettings.webhook_token || ''
              }
            },
            is_active: true
          }

          let res
          if (this.editingMonitor) {
            res = await updateMonitor(this.editingMonitor.id, data)
          } else {
            res = await addMonitor(data)
          }

          if (res && res.code === 1) {
            this.$message.success(this.$t('portfolio.message.saveSuccess'))
            this.closeMonitorModal()
            this.loadMonitors()
          } else {
            this.$message.error(res?.msg || this.$t('portfolio.message.saveFailed'))
          }
        } catch (e) {
          this.$message.error(this.$t('portfolio.message.saveFailed'))
        } finally {
          this.savingMonitor = false
        }
      })
    },
    async toggleMonitor (id, active) {
      try {
        const res = await updateMonitor(id, { is_active: active })
        if (res && res.code === 1) {
          this.$message.success(active ? this.$t('portfolio.message.monitorEnabled') : this.$t('portfolio.message.monitorDisabled'))
          this.loadMonitors()
        }
      } catch (e) {
        this.$message.error(this.$t('portfolio.message.updateFailed'))
      }
    },
    async runMonitorNow (id) {
      this.runningMonitor = id
      try {
        const currentLang = this.$store.getters.lang || 'en-US'
        const res = await runMonitor(id, { language: currentLang, async: true })
        if (res && res.code === 1) {
          if (res.data?.status === 'running') {
            this.$message.success(this.$t('portfolio.message.monitorRunning'))
            this.$notification.info({
              message: this.$t('portfolio.monitors.runningTitle'),
              description: this.$t('portfolio.monitors.runningDesc'),
              duration: 5
            })
          } else if (res.data?.success) {
            this.$message.success(this.$t('portfolio.message.monitorRunSuccess'))
            if (res.data.analysis) {
              this.$notification.open({
                message: this.$t('portfolio.monitors.analysisResult'),
                description: res.data.analysis.substring(0, 500) + (res.data.analysis.length > 500 ? '...' : ''),
                duration: 0
              })
            }
          } else if (res.data?.error) {
            this.$message.error(res.data.error || this.$t('portfolio.message.monitorRunFailed'))
          }
          this.loadMonitors()
        }
      } catch (e) {
        // Handle timeout gracefully - analysis may still be running in background
        if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
          this.$notification.warning({
            message: this.$t('portfolio.monitors.timeoutTitle'),
            description: this.$t('portfolio.monitors.timeoutDesc'),
            duration: 8
          })
        } else {
          this.$message.error(this.$t('portfolio.message.monitorRunFailed'))
        }
      } finally {
        this.runningMonitor = null
      }
    },
    async deleteMonitor (id) {
      try {
        const res = await deleteMonitorApi(id)
        if (res && res.code === 1) {
          this.$message.success(this.$t('portfolio.message.deleteSuccess'))
          this.loadMonitors()
        } else {
          this.$message.error(res?.msg || this.$t('portfolio.message.deleteFailed'))
        }
      } catch (e) {
        this.$message.error(this.$t('portfolio.message.deleteFailed'))
      }
    },
    closeMonitorModal () {
      this.showAddMonitorModal = false
      this.editingMonitor = null
      this.monitorForm.resetFields()
      this.monitorChannels = [...normalizeNotificationChannels(this.userNotificationSettings.default_channels)] // Reset to user default
      this.monitorScope = 'all' // Reset monitor scope
      this.selectedMonitorPositions = [] // Reset selected positions
    },
    // Helper to get position IDs from monitor
    getMonitorPositionIds (monitor) {
      if (!monitor.position_ids) return []
      if (typeof monitor.position_ids === 'string') {
        try {
          return JSON.parse(monitor.position_ids) || []
        } catch (e) {
          return []
        }
      }
      return Array.isArray(monitor.position_ids) ? monitor.position_ids : []
    },
    // Helper to get position name by ID
    getPositionNameById (posId) {
      const pos = this.positions.find(p => p.id === posId)
      return pos ? `${pos.symbol} (${pos.name || pos.market})` : `#${posId}`
    },
    // Helpers
    hasAlertForPosition (positionId) {
      return this.alerts.some(a => a.position_id === positionId)
    },
    getAlertForPosition (positionId) {
      return this.alerts.find(a => a.position_id === positionId)
    },
    getMarketColor (market) {
      const colors = {
        'USStock': 'green',
        'Crypto': 'purple',
        'Forex': 'gold',
        'Futures': 'cyan'
      }
      return colors[market] || 'default'
    },
    getMarketName (market) {
      return this.$t(`dashboard.analysis.market.${market}`) || market
    },
    getCurrencySymbol (market) {
      const dollarMarkets = ['USStock', 'Crypto', 'Forex', 'Futures']
      return dollarMarkets.includes(market) ? '$' : '楼'
    },
    formatNumber (num, digits = 2) {
      if (num === undefined || num === null) return '0.00'
      return Number(num).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    },
    formatPrice (price) {
      if (!price) return '0'
      if (price >= 1000) return this.formatNumber(price, 2)
      if (price >= 1) return this.formatNumber(price, 4)
      return this.formatNumber(price, 6)
    },
    formatTime (timestamp) {
      if (!timestamp) return '-'
      let d
      if (typeof timestamp === 'number') {
        d = new Date(timestamp * 1000)
      } else if (typeof timestamp === 'string') {
        if (/^\d+$/.test(timestamp)) {
          d = new Date(parseInt(timestamp, 10) * 1000)
        } else {
          d = new Date(timestamp)
        }
      } else {
        return '-'
      }
      if (isNaN(d.getTime())) {
        return '-'
      }
      return d.toLocaleString()
    },
    getIntervalText (minutes) {
      if (!minutes) return '-'
      if (minutes < 60) return `${minutes} ${this.$t('portfolio.form.minutes')}`
      const hours = minutes / 60
      return `${hours} ${this.$t('portfolio.form.hours')}`
    }
  }
}
</script>

<style lang="less" scoped>
@import '@/styles/antd-vars.less';

@green: #10b981;
@red: #ef4444;
@blue: #3b82f6;
@purple: #8b5cf6;

.portfolio-container {
  padding: 20px;
  background: #f5f5f5;
  min-height: calc(100vh - 120px);

  &.theme-dark {
    background: #131722;

    .summary-card {
      background: #1e222d;
      border-color: #363c4e;

      .card-label { color: #868993; }
      .card-value { color: #d1d4dc; }
      .card-sub { color: #868993; }

      &.total-value {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        border: 1px solid rgba(59, 130, 246, 0.3);

        .card-icon { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .card-label { color: rgba(255, 255, 255, 0.7); }
        .card-value { color: #fff; }
        .card-sub {
          color: rgba(255, 255, 255, 0.6);
          .positive { color: #34d399; }
          .negative { color: #f87171; }
        }
      }

      &.mini {
        .card-label { color: #868993; }
        .card-value { color: #d1d4dc; }
      }
    }

    .positions-section, .monitors-section {
      background: #1e222d;
      border-color: #363c4e;

      .section-header {
        border-color: #363c4e;
        h3 { color: #d1d4dc; }
      }
    }

    .position-card {
      background: #2a2e39;
      border-color: #363c4e;

      .position-header {
        border-color: #363c4e;

        .symbol { color: #d1d4dc; }
        .name { color: #868993; }
      }

      .position-body {
        .label { color: #868993; }
        .value { color: #d1d4dc; }

        .price-row {
          .current-price, .entry-price {
            .label { color: #868993; }
            .value { color: #d1d4dc; }
          }
        }

        .quantity-row {
          .item {
            .label { color: #868993; }
            .value { color: #d1d4dc; }
          }
        }
      }

      .position-footer {
        background: #252930;

        .pnl {
          .label { color: #868993; }
        }
      }

      &.compact {
        .position-compact-body {
          .compact-item {
            .label { color: #868993; }
            .value { color: #d1d4dc; }
          }
        }
      }
    }

    .monitor-card {
      background: #2a2e39;
      border-color: #363c4e;

      .monitor-header {
        .monitor-name { color: #d1d4dc; }
      }

      .monitor-body {
        .label { color: #868993; }
        .value { color: #d1d4dc; }
      }

      .monitor-actions {
        border-color: #363c4e;
      }
    }

    .position-collapse-view {
      ::v-deep .ant-collapse {
        .ant-collapse-item {
          background: #2a2e39;
        }

        .ant-collapse-header {
          background: #1e222d;
          border-color: #363c4e;
          color: #d1d4dc;
        }

        .ant-collapse-content-box {
          background: #2a2e39;
        }
      }

      .group-header {
        .group-name { color: #d1d4dc; }
        .group-stats .count { color: #868993; }
      }
    }
  }
}

.portfolio-container.embedded {
  padding: 0;
  background: transparent;
  min-height: auto;
}

.summary-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 16px;

  &.secondary {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    margin-bottom: 20px;
  }
}

.summary-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e8e8e8;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  &.total-value {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
    border: none;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);

    &::before {
      content: '';
      position: absolute;
      top: -30%;
      right: -20%;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 60%);
    }

    &::after {
      content: '';
      position: absolute;
      bottom: -30%;
      left: -10%;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
    }

    &:hover {
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
      transform: translateY(-2px);
    }

    .card-icon {
      background: rgba(255, 255, 255, 0.25);
      color: #fff;
    }

    .card-content {
      position: relative;
      z-index: 1;

      .card-label {
        color: rgba(255, 255, 255, 0.9) !important;
        font-weight: 500;
      }
      .card-value {
        color: #fff !important;
        font-size: 24px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

        .currency {
          color: rgba(255, 255, 255, 0.9);
          font-size: 18px;
        }
        .amount {
          color: #fff;
        }
      }
      .card-sub {
        color: rgba(255, 255, 255, 0.85) !important;
        font-size: 12px;
        margin-top: 4px;
        .positive { color: #bbf7d0 !important; }
        .negative { color: #fecaca !important; }
      }
    }
  }

  &.mini {
    padding: 14px 16px;

    .card-icon {
      width: 36px;
      height: 36px;
      font-size: 18px;
    }

    .card-value {
      font-size: 16px;

      &.small {
        font-size: 14px;
      }
    }
  }

  &.sync-card {
    .card-sub {
      display: flex;
      align-items: center;
    }
  }

  .card-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    background: rgba(59, 130, 246, 0.1);
    color: @blue;

    &.cost { background: rgba(139, 92, 246, 0.1); color: @purple; }
    &.profit { background: rgba(16, 185, 129, 0.1); color: @green; }
    &.loss { background: rgba(239, 68, 68, 0.1); color: @red; }
    &.positions { background: rgba(6, 182, 212, 0.1); color: #06b6d4; }
    &.today { background: rgba(251, 191, 36, 0.1); color: #f59e0b; }
    &.best { background: rgba(16, 185, 129, 0.1); color: @green; }
    &.worst { background: rgba(239, 68, 68, 0.1); color: @red; }
    &.sync {
      background: rgba(59, 130, 246, 0.1);
      color: @blue;
      &.syncing { color: var(--primary-color, #1890ff); }
    }
  }

  .card-content {
    flex: 1;
    min-width: 0;

    .card-label {
      font-size: 12px;
      color: #8c8c8c;
      margin-bottom: 4px;
    }

    .card-sub {
      font-size: 11px;
      color: #999;
      margin-top: 2px;
    }

    .card-value {
      font-size: 20px;
      font-weight: 700;
      color: #262626;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      .currency { font-size: 16px; margin-right: 2px; }
      .percent { font-size: 14px; margin-left: 8px; }

      .position-detail {
        font-size: 14px;
        font-weight: 500;
        margin-left: 4px;
      }
    }
  }
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 20px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

.positions-section, .monitors-section {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #262626;

    .anticon { color: @blue; }
  }
}

.positions-list {
  padding: 16px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;

  &.small {
    padding: 20px;
  }
}

.position-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.position-card {
  background: #fafafa;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  overflow: hidden;
  transition: all 0.3s;

  &:hover {
    border-color: @blue;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  &.profit {
    border-left: 3px solid @green;
  }

  &.loss {
    border-left: 3px solid @red;
  }

  .position-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;

    .symbol-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .symbol {
        font-size: 16px;
        font-weight: 600;
        color: #262626;
      }

      .name {
        font-size: 12px;
        color: #8c8c8c;
      }
    }

    .position-actions {
      .delete-btn { color: @red; }
      .has-alert {
        color: #faad14 !important;
        .anticon {
          color: #faad14;
        }
      }
    }
  }

  .position-body {
    padding: 12px 16px;

    .price-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;

      .current-price, .entry-price {
        .label {
          display: block;
          font-size: 11px;
          color: #8c8c8c;
          margin-bottom: 2px;
        }

        .value {
          font-size: 16px;
          font-weight: 600;
          color: #262626;
        }

        .change {
          font-size: 12px;
          margin-left: 8px;

          &.up { color: @green; }
          &.down { color: @red; }
        }
      }
    }

    .quantity-row {
      display: flex;
      gap: 16px;

      .item {
        .label {
          display: block;
          font-size: 11px;
          color: #8c8c8c;
          margin-bottom: 2px;
        }

        .value {
          font-size: 14px;
          color: #262626;
        }
      }
    }
  }

  .position-footer {
    padding: 12px 16px;
    background: #f5f5f5;

    .pnl {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .label {
        font-size: 12px;
        color: #8c8c8c;
      }

      .value {
        font-size: 18px;
        font-weight: 700;

        .percent {
          font-size: 14px;
          margin-left: 8px;
        }
      }
    }
  }
}

.monitors-list {
  padding: 16px;
}

.monitor-card {
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  padding: 12px 16px;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }

  .monitor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .monitor-name {
      font-size: 14px;
      font-weight: 600;
      color: #262626;
      display: flex;
      align-items: center;
      gap: 8px;

      .anticon { color: @blue; }
    }
  }

  .monitor-body {
    .monitor-info {
      font-size: 12px;
      margin-bottom: 4px;

      .label { color: #8c8c8c; }
      .value { color: #262626; margin-left: 4px; }
    }

    .monitor-channels {
      margin-top: 8px;
      font-size: 12px;

      .label { color: #8c8c8c; margin-right: 8px; }
    }

    .scope-selected {
      color: var(--primary-color, #1890ff);
      cursor: help;
      border-bottom: 1px dashed var(--primary-color, #1890ff);
    }

    .scope-all {
      color: #52c41a;
    }
  }

  .monitor-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;

    .delete-btn { color: @red; }
  }
}

.positive { color: @green !important; }
.negative { color: @red !important; }

.symbol-option {
  display: flex;
  align-items: center;
  gap: 8px;

  .symbol-name {
    color: #8c8c8c;
    font-size: 12px;
  }
}

.position-collapse-view {
  ::v-deep .ant-collapse {
    background: transparent;
    border: none;

    .ant-collapse-item {
      border: none;
      margin-bottom: 12px;
      background: #fafafa;
      border-radius: 8px;
      overflow: hidden;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .ant-collapse-header {
      padding: 12px 16px;
      background: #fff;
      border-bottom: 1px solid #f0f0f0;

      .ant-collapse-arrow {
        left: auto;
        right: 16px;
      }
    }

    .ant-collapse-content {
      border: none;

      .ant-collapse-content-box {
        padding: 12px;
        background: #fafafa;
      }
    }
  }

  .group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: calc(100% - 30px);

    .group-name {
      font-weight: 600;
      font-size: 14px;
      color: #262626;
      display: flex;
      align-items: center;
    }

    .group-stats {
      display: flex;
      align-items: center;
      gap: 16px;

      .count {
        font-size: 12px;
        color: #8c8c8c;
      }

      .group-pnl {
        font-size: 14px;
        font-weight: 600;
      }
    }
  }
}

.position-grid.compact {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.position-card.compact {
  padding: 12px;

  .position-header {
    padding: 0 0 8px 0;
    border-bottom: none;

    .symbol-info {
      .symbol {
        font-size: 14px;
      }
      .name {
        font-size: 11px;
      }
    }
  }

  .position-compact-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;

    .compact-item {
      .label {
        font-size: 11px;
        color: #8c8c8c;
        margin-right: 4px;
      }

      .value {
        font-size: 14px;
        font-weight: 600;
        color: #262626;
      }

      .change {
        font-size: 12px;
        margin-left: 6px;

        &.up { color: @green; }
        &.down { color: @red; }
      }

      &.pnl {
        font-size: 14px;
        font-weight: 700;

        .percent {
          font-size: 12px;
          margin-left: 4px;
        }
      }
    }
  }
}

.alert-symbol-info {
  .symbol-input {
    margin-bottom: 8px;
  }

  .current-price-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%);
    border-radius: 6px;
    font-size: 13px;

    .label {
      color: #595959;
    }

    .price {
      font-weight: 600;
      color: var(--primary-color, #1890ff);
      font-size: 14px;
    }
  }
}

.threshold-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;

  .alert-unit {
    position: absolute;
    right: 12px;
    color: #8c8c8c;
    font-size: 14px;
    pointer-events: none;
  }
}

.threshold-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}

.switch-label {
  margin-left: 12px;
  color: #8c8c8c;
  font-size: 13px;
}

.alert-modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .footer-right {
    display: flex;
    gap: 8px;
  }
}

.position-checkbox-group {
  display: flex;
  flex-direction: column;
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 8px;
  background: #fafafa;

  .position-checkbox-item {
    padding: 6px 8px;
    border-radius: 4px;
    margin-bottom: 4px;
    transition: background 0.2s;

    &:hover {
      background: rgba(24, 144, 255, 0.05);
    }

    &:last-child {
      margin-bottom: 0;
    }

    .ant-checkbox-wrapper {
      width: 100%;
    }
  }
}

.position-checkbox {
  width: 100%;

  // Override Ant Design checkbox label width
  ::v-deep .ant-checkbox + span {
    width: calc(100% - 24px);
    padding-left: 8px;
    padding-right: 0;
  }
}

.position-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  width: 100%;

  .position-left {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;

    .symbol {
      font-weight: 600;
      color: #262626;
      min-width: 50px;
    }
  }

  .position-middle {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    .name {
      color: #8c8c8c;
      font-size: 12px;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .position-right {
    flex-shrink: 0;
    margin-left: auto;

    .pnl {
      font-weight: 500;
      font-size: 12px;
      white-space: nowrap;

      &.positive { color: @green; }
      &.negative { color: @red; }
    }
  }
}

.position-select-actions {
  margin-top: 8px;
  display: flex;
  align-items: center;

  .ant-btn-link {
    padding: 0 4px;
    height: auto;
    font-size: 12px;
  }

  .selected-count {
    margin-left: auto;
    font-size: 12px;
    color: #8c8c8c;
  }
}

&.theme-dark {
  .position-checkbox-group {
    background: #2a2e39;
    border-color: #363c4e;
  }

  .position-checkbox-item:hover {
    background: rgba(24, 144, 255, 0.1);
  }

  .position-checkbox-label {
    .position-left .symbol { color: #d1d4dc; }
    .position-middle .name { color: #868993; }
  }

  .position-select-actions {
    .selected-count { color: #868993; }
  }

  .alert-symbol-info {
    .current-price-info {
      background: linear-gradient(135deg, rgba(24, 144, 255, 0.15) 0%, rgba(114, 46, 209, 0.1) 100%);

      .label {
        color: rgba(255, 255, 255, 0.65);
      }

      .price {
        color: var(--primary-color-hover, #40a9ff);
      }
    }
  }

  .threshold-hint {
    color: rgba(255, 255, 255, 0.45);
  }

  .switch-label {
    color: rgba(255, 255, 255, 0.45);
  }
}


@media screen and (max-width: 1024px) {
  .portfolio-container {
    padding: 16px;
  }

  .summary-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    &.secondary {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .main-content {
    grid-template-columns: 1fr;
    gap: 16px;

    .monitors-section {
      order: 2;
    }
  }

  .position-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
}

@media screen and (max-width: 768px) {
  .portfolio-container {
    padding: 12px;
  }

  .summary-section {
    grid-template-columns: 1fr 1fr;
    gap: 10px;

    &.secondary {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
  }

  .summary-card {
    padding: 14px;
    border-radius: 10px;
    gap: 10px;

    &.total-value {
      grid-column: span 2;
      padding: 16px;

      .card-content {
        .card-value {
          font-size: 22px;

          .currency {
            font-size: 16px;
          }
        }
      }
    }

    &.mini {
      padding: 10px 12px;

      .card-icon {
        width: 32px;
        height: 32px;
        font-size: 16px;
      }

      .card-value {
        font-size: 14px;

        &.small {
          font-size: 12px;
        }
      }

      .card-label {
        font-size: 11px;
      }
    }

    .card-icon {
      width: 40px;
      height: 40px;
      font-size: 20px;
      border-radius: 10px;
    }

    .card-content {
      .card-label {
        font-size: 11px;
      }

      .card-value {
        font-size: 16px;

        .percent {
          font-size: 11px;
        }

        .position-detail {
          font-size: 11px;
        }
      }

      .card-sub {
        font-size: 10px;
      }
    }
  }

  .main-content {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .positions-section {
    padding: 12px;
    border-radius: 10px;

    .section-header {
      padding-bottom: 10px;
      flex-wrap: wrap;
      gap: 8px;

      h3 {
        font-size: 15px;
        width: 100%;
      }

      .header-actions {
        width: 100%;
        justify-content: space-between;

        .view-toggle {
          .ant-btn {
            padding: 4px 8px;
            font-size: 12px;
          }
        }

        .group-filter {
          .ant-select {
            width: 120px !important;
            font-size: 12px;
          }
        }
      }
    }
  }

  .position-grid {
    grid-template-columns: 1fr;
    gap: 10px;

    &.compact {
      grid-template-columns: 1fr;
    }
  }

  .position-card {
    border-radius: 10px;

    .position-header {
      padding: 12px;

      .symbol-info {
        .symbol {
          font-size: 15px;
        }
        .name {
          font-size: 12px;
        }
      }

      .position-actions {
        .ant-btn {
          padding: 2px 6px;
          font-size: 12px;
        }
      }
    }

    .position-body {
      padding: 10px 12px;

      .price-row {
        flex-direction: column;
        gap: 8px;

        .current-price, .entry-price {
          .value {
            font-size: 14px;
          }
        }
      }

      .quantity-row {
        .item {
          .value {
            font-size: 13px;
          }
        }
      }
    }

    .position-footer {
      padding: 10px 12px;

      .pnl {
        .value {
          font-size: 16px;
        }
        .percent {
          font-size: 12px;
        }
      }
    }

    &.compact {
      .position-compact-body {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;

        .compact-item {
          width: 100%;
          display: flex;
          justify-content: space-between;

          .value {
            font-size: 13px;
          }
        }
      }
    }
  }

  .monitors-section {
    padding: 12px;
    border-radius: 10px;

    .section-header {
      padding-bottom: 10px;

      h3 {
        font-size: 15px;
      }
    }
  }

  .monitor-card {
    padding: 12px;
    border-radius: 8px;

    .monitor-header {
      .monitor-name {
        font-size: 14px;

        .anticon {
          font-size: 16px;
        }
      }
    }

    .monitor-body {
      .monitor-info {
        font-size: 12px;
      }
    }

    .monitor-actions {
      padding-top: 10px;
      flex-wrap: wrap;
      gap: 4px;

      .ant-btn {
        padding: 2px 8px;
        font-size: 12px;
      }
    }
  }

  .position-collapse-view {
    ::v-deep .ant-collapse {
      .ant-collapse-item {
        margin-bottom: 8px;
        border-radius: 8px;
      }

      .ant-collapse-header {
        padding: 10px 12px;
        font-size: 14px;
      }

      .ant-collapse-content-box {
        padding: 8px;
      }
    }

    .group-header {
      .group-name {
        font-size: 14px;
      }

      .group-stats {
        font-size: 11px;
        gap: 6px;
        flex-wrap: wrap;
      }
    }
  }

  .empty-state {
    padding: 30px 16px;

    &.small {
      padding: 20px 12px;
    }
  }
}

@media screen and (max-width: 480px) {
  .portfolio-container {
    padding: 8px;
  }

  .summary-section {
    gap: 8px;

    &.secondary {
      display: flex;
      overflow-x: auto;
      padding-bottom: 8px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }

      .summary-card.mini {
        flex-shrink: 0;
        min-width: 140px;
      }
    }
  }

  .summary-card {
    padding: 12px;
    gap: 8px;

    &.total-value {
      padding: 14px;

      .card-content {
        .card-value {
          font-size: 20px;
        }
      }
    }

    .card-icon {
      width: 36px;
      height: 36px;
      font-size: 18px;
    }

    .card-content {
      .card-value {
        font-size: 15px;
      }
    }
  }

  .positions-section, .monitors-section {
    padding: 10px;

    .section-header {
      h3 {
        font-size: 14px;
      }
    }
  }

  .position-card {
    .position-header {
      padding: 10px;

      .symbol-info {
        .symbol { font-size: 14px; }
        .name { font-size: 11px; }
      }
    }

    .position-body {
      padding: 8px 10px;
    }

    .position-footer {
      padding: 8px 10px;

      .pnl {
        .value { font-size: 15px; }
        .percent { font-size: 11px; }
      }
    }
  }

  .monitor-card {
    padding: 10px;

    .monitor-header {
      .monitor-name {
        font-size: 13px;
      }
    }
  }
}

</style>
