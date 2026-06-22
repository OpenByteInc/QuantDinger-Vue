<template>
  <div class="user-manage-page" :class="{ 'theme-dark': isDarkTheme }">
    <div class="page-header">
      <h2 class="page-title">
        <a-icon type="team" />
        <span>{{ $t('userManage.title') || 'User Management' }}</span>
      </h2>
      <p class="page-desc">{{ $t('userManage.description') || 'Manage system users, roles and permissions' }}</p>
    </div>

    <!-- Tabs -->
    <a-tabs :activeKey="activeTab" @change="handleTabChange" class="manage-tabs">
      <!-- Tab 1: User Management -->
      <a-tab-pane key="users" :tab="$t('userManage.tabUsers') || 'User Management'">
        <!-- KPI Cards (operations-at-a-glance) -->
        <div class="summary-cards user-kpi-cards" v-if="userStats || userStatsLoading">
          <template v-if="userStatsLoading && !userStats">
            <div class="summary-card kpi-skeleton" v-for="i in 6" :key="`skel-${i}`">
              <a-skeleton active :paragraph="{ rows: 1 }" />
            </div>
          </template>
          <template v-if="userStats">
            <div class="summary-card">
              <div class="summary-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
                <a-icon type="team" />
              </div>
              <div class="summary-info">
                <div class="summary-value">{{ formatNumber(userStats.summary.total) }}</div>
                <div class="summary-label">{{ $t('userManage.kpiTotal') || 'Total Members' }}</div>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: linear-gradient(135deg, #11998e, #38ef7d)">
                <a-icon type="user-add" />
              </div>
              <div class="summary-info">
                <div class="summary-value">
                  {{ formatNumber(userStats.summary.today_new) }}
                  <span class="delta" :class="todayDeltaClass" v-if="hasYesterdayBaseline">
                    {{ todayDeltaText }}
                  </span>
                </div>
                <div class="summary-sub">{{ kpiYesterdaySub }}</div>
                <div class="summary-label">{{ $t('userManage.kpiToday') || 'New Today' }}</div>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
                <a-icon type="rise" />
              </div>
              <div class="summary-info">
                <div class="summary-value">{{ formatNumber(userStats.summary.week_new) }}</div>
                <div class="summary-sub">
                  30{{ $t('userManage.kpiDays') || 'd' }}: {{ formatNumber(userStats.summary.month_new) }}
                </div>
                <div class="summary-label">{{ $t('userManage.kpiWeek') || 'New This Week' }}</div>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: linear-gradient(135deg, #fa709a, #fee140)">
                <a-icon type="thunderbolt" />
              </div>
              <div class="summary-info">
                <div class="summary-value">{{ formatNumber(userStats.summary.active_today) }}</div>
                <div class="summary-sub">
                  7{{ $t('userManage.kpiDays') || 'd' }}: {{ formatNumber(userStats.summary.active_week) }}
                </div>
                <div class="summary-label">{{ $t('userManage.kpiActive') || 'Active Today' }}</div>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: linear-gradient(135deg, #f6d365, #fda085)">
                <a-icon type="crown" />
              </div>
              <div class="summary-info">
                <div class="summary-value">{{ formatNumber(userStats.summary.vip_total) }}</div>
                <div class="summary-sub" :class="userStats.summary.vip_expiring_7d > 0 ? 'sub-warn' : ''">
                  {{ $t('userManage.kpiVipExpiring') || 'Expiring 7d' }}: {{ formatNumber(userStats.summary.vip_expiring_7d) }}
                </div>
                <div class="summary-label">{{ $t('userManage.kpiVip') || 'Active VIPs' }}</div>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: linear-gradient(135deg, #868f96, #596164)">
                <a-icon type="stop" />
              </div>
              <div class="summary-info">
                <div class="summary-value">{{ formatNumber(userStats.summary.disabled) }}</div>
                <div class="summary-label">{{ $t('userManage.kpiDisabled') || 'Disabled' }}</div>
              </div>
            </div>
          </template>
        </div>

        <!-- Charts Row: Growth + DAU side-by-side, each 50% wide. -->
        <div class="charts-grid charts-grid-2col" v-if="userStats">
          <a-card :bordered="false" class="chart-card">
            <div class="chart-card-header">
              <h4 class="section-card-title">
                <a-icon type="line-chart" class="section-card-title-icon" />
                {{ $t('userManage.chartGrowthTitle') || 'Member Growth (Last 30 Days)' }}
              </h4>
            </div>
            <div ref="growthChart" class="chart-canvas chart-canvas-tall" />
          </a-card>

          <a-card :bordered="false" class="chart-card">
            <h4 class="section-card-title">
              <a-icon type="bar-chart" class="section-card-title-icon" />
              {{ $t('userManage.chartActivityTitle') || 'Daily Active Users (14d)' }}
            </h4>
            <div ref="activityChart" class="chart-canvas chart-canvas-tall" />
          </a-card>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <a-button type="primary" @click="showCreateModal">
              <a-icon type="user-add" />
              {{ $t('userManage.createUser') || 'Create User' }}
            </a-button>
            <a-button :loading="exportingUsers" @click="handleExportUsers">
              <a-icon type="download" />
              {{ $t('userManage.exportUsers') || 'Export Users' }}
            </a-button>
            <a-button @click="loadUsers">
              <a-icon type="reload" />
              {{ $t('common.refresh') || 'Refresh' }}
            </a-button>
          </div>
          <div class="toolbar-right toolbar-filters">
            <a-input
              v-model="userIdSearch"
              class="toolbar-id-input"
              :placeholder="$t('userManage.searchById') || 'User ID'"
              allowClear
              @pressEnter="handleSearch"
            />
            <a-input-search
              v-model="searchKeyword"
              class="toolbar-search"
              :placeholder="$t('userManage.searchPlaceholder') || 'Search username/email/nickname/ID'"
              allowClear
              @search="handleSearch"
            />
            <a-button v-if="hasUserFilters" @click="clearUserFilters">
              {{ $t('systemOverview.clearFilters') || 'Clear' }}
            </a-button>
          </div>
        </div>
        <div v-if="hasUserFilters" class="active-filters">
          <span class="active-filters-label">{{ $t('systemOverview.activeFilters') || 'Active filters' }}:</span>
          <a-tag v-if="normalizePositiveInt(userIdSearch)" closable @close="clearUserIdFilter">
            {{ $t('userManage.searchById') || 'User ID' }}: {{ normalizePositiveInt(userIdSearch) }}
          </a-tag>
          <a-tag v-if="searchKeyword" closable @close="clearUserKeywordFilter">
            {{ $t('systemOverview.filterKeyword') || 'Keyword' }}: {{ searchKeyword }}
          </a-tag>
        </div>

        <!-- User Table -->
        <a-card :bordered="false" class="user-table-card">
          <a-table
            :columns="columns"
            :dataSource="users"
            :loading="loading"
            :pagination="pagination"
            :rowKey="record => record.id"
            :scroll="{ x: 1420 }"
            @change="handleTableChange"
          >
            <!-- Email Column Title (with show/hide toggle) -->
            <template slot="emailTitle">
              <span class="email-col-title">
                {{ $t('userManage.email') || 'Email' }}
                <a-tooltip :title="emailVisible ? ($t('userManage.hideEmail') || 'Hide emails') : ($t('userManage.showEmail') || 'Show emails')">
                  <a-button
                    type="link"
                    size="small"
                    class="email-toggle-btn"
                    @click="toggleEmailVisible"
                  >
                    <a-icon :type="emailVisible ? 'eye' : 'eye-invisible'" />
                  </a-button>
                </a-tooltip>
              </span>
            </template>

            <!-- Email Column Cell -->
            <template slot="email" slot-scope="text">
              <span v-if="emailVisible">{{ text || '-' }}</span>
              <span v-else class="email-masked">{{ maskEmail(text) }}</span>
            </template>

            <!-- Status Column -->
            <template slot="status" slot-scope="text">
              <a-tag :color="text === 'active' ? 'green' : 'red'">
                {{ text === 'active' ? ($t('userManage.active') || 'Active') : ($t('userManage.disabled') || 'Disabled') }}
              </a-tag>
            </template>

            <!-- Role Column -->
            <template slot="role" slot-scope="text">
              <a-tag :color="getRoleColor(text)">
                {{ getRoleLabel(text) }}
              </a-tag>
            </template>

            <!-- Last Login Column -->
            <template slot="last_login_at" slot-scope="text">
              <span v-if="text">{{ formatTime(text) }}</span>
              <span v-else class="text-muted">{{ $t('userManage.neverLogin') || 'Never' }}</span>
            </template>

            <!-- Register IP Column -->
            <template slot="register_ip" slot-scope="text">
              <span v-if="text">{{ text }}</span>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Credits Column -->
            <template slot="credits" slot-scope="text">
              <span class="credits-value">{{ formatCredits(text) }}</span>
            </template>

            <!-- VIP Column -->
            <template slot="vip_expires_at" slot-scope="text">
              <template v-if="text && isVipActive(text)">
                <a-tag color="gold">
                  <a-icon type="crown" />
                  {{ formatDate(text) }}
                </a-tag>
              </template>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Actions Column -->
            <template slot="action" slot-scope="text, record">
              <a-space>
                <a-tooltip :title="$t('common.edit') || 'Edit'">
                  <a-button type="link" size="small" @click="showEditModal(record)">
                    <a-icon type="edit" />
                  </a-button>
                </a-tooltip>
                <a-tooltip :title="$t('userManage.adjustCredits') || 'Adjust Credits'">
                  <a-button type="link" size="small" @click="showCreditsModal(record)">
                    <a-icon type="wallet" style="color: #722ed1" />
                  </a-button>
                </a-tooltip>
                <a-tooltip :title="$t('userManage.setVip') || 'Set VIP'">
                  <a-button type="link" size="small" @click="showVipModal(record)">
                    <a-icon type="crown" style="color: #faad14" />
                  </a-button>
                </a-tooltip>
                <a-tooltip :title="$t('userManage.resetPassword') || 'Reset Password'">
                  <a-button type="link" size="small" @click="showResetPasswordModal(record)">
                    <a-icon type="key" />
                  </a-button>
                </a-tooltip>
                <a-tooltip :title="$t('systemOverview.viewUserStrategies') || 'View strategies'">
                  <a-button type="link" size="small" @click.stop="filterStrategiesByUser(record.id)">
                    <a-icon type="bar-chart" style="color: #1890ff" />
                  </a-button>
                </a-tooltip>
                <a-tooltip :title="$t('common.delete') || 'Delete'">
                  <a-popconfirm
                    :title="$t('userManage.confirmDelete') || 'Are you sure to delete this user?'"
                    @confirm="handleDelete(record.id)"
                  >
                    <a-button type="link" size="small" :disabled="record.id === currentUserId">
                      <a-icon type="delete" style="color: #ff4d4f" />
                    </a-button>
                  </a-popconfirm>
                </a-tooltip>
              </a-space>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>

      <!-- Tab 2: System Strategy Overview (forceRender keeps pane mounted for programmatic filters) -->
      <a-tab-pane key="strategies" forceRender :tab="$t('systemOverview.tabTitle') || 'System Overview'">
        <!-- Summary Cards -->
        <div class="summary-cards" v-if="strategySummary">
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
              <a-icon type="fund" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ strategySummary.total_strategies || 0 }}</div>
              <div class="summary-label">{{ $t('systemOverview.totalStrategies') || 'Total Strategies' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #11998e, #38ef7d)">
              <a-icon type="play-circle" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ strategySummary.running_strategies || 0 }}</div>
              <div class="summary-sub">
                {{ $t('systemOverview.live') || '实盘' }}: {{ strategySummary.running_live_strategies || 0 }}
                /
                {{ $t('systemOverview.signal') || '仅通知' }}: {{ strategySummary.running_signal_strategies || 0 }}
              </div>
              <div class="summary-label">{{ $t('systemOverview.runningStrategies') || 'Running' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
              <a-icon type="dollar" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ formatNumber(strategySummary.total_capital) }}</div>
              <div class="summary-sub">
                {{ $t('systemOverview.live') || '实盘' }}: {{ formatNumber(strategySummary.live_capital) }}
                /
                {{ $t('systemOverview.signal') || '仅通知' }}: {{ formatNumber(strategySummary.signal_capital) }}
              </div>
              <div class="summary-label">{{ $t('systemOverview.totalCapital') || 'Total Capital' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" :style="{ background: (strategySummary.total_pnl || 0) >= 0 ? 'linear-gradient(135deg, #11998e, #38ef7d)' : 'linear-gradient(135deg, #ff416c, #ff4b2b)' }">
              <a-icon type="rise" />
            </div>
            <div class="summary-info">
              <div class="summary-value" :class="(strategySummary.total_pnl || 0) >= 0 ? 'text-profit' : 'text-loss'">
                {{ formatPnl(strategySummary.total_pnl) }}
                <span class="roi-badge">{{ strategySummary.total_roi || 0 }}%</span>
              </div>
              <div class="summary-sub">
                {{ $t('systemOverview.live') || '实盘' }}: {{ formatPnl(strategySummary.live_pnl) }}
                /
                {{ $t('systemOverview.signal') || '仅通知' }}: {{ formatPnl(strategySummary.signal_pnl) }}
              </div>
              <div class="summary-label">{{ $t('systemOverview.totalPnl') || 'Total PnL' }}</div>
            </div>
          </div>
        </div>

        <!-- Strategy Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <a-button @click="loadSystemStrategies">
              <a-icon type="reload" />
              {{ $t('common.refresh') || 'Refresh' }}
            </a-button>
            <a-select v-model="strategyStatusFilter" class="toolbar-select" @change="handleStrategyFilterChange">
              <a-select-option value="all">{{ $t('systemOverview.filterAll') || 'All Status' }}</a-select-option>
              <a-select-option value="running">{{ $t('systemOverview.filterRunning') || 'Running' }}</a-select-option>
              <a-select-option value="stopped">{{ $t('systemOverview.filterStopped') || 'Stopped' }}</a-select-option>
            </a-select>
            <a-select v-model="strategyExecutionFilter" class="toolbar-select" @change="handleStrategyExecutionFilterChange">
              <a-select-option value="all">{{ $t('systemOverview.filterExecAll') || 'All modes' }}</a-select-option>
              <a-select-option value="live">{{ $t('systemOverview.live') || 'Live' }}</a-select-option>
              <a-select-option value="signal">{{ $t('systemOverview.signal') || 'Signal' }}</a-select-option>
            </a-select>
          </div>
          <div class="toolbar-right toolbar-filters">
            <a-input
              v-model="strategyIdSearch"
              class="toolbar-id-input"
              :placeholder="$t('systemOverview.searchStrategyId') || 'Strategy ID'"
              allowClear
              @pressEnter="handleStrategySearch"
            />
            <a-input
              v-model="strategyUserIdSearch"
              class="toolbar-id-input"
              :placeholder="$t('systemOverview.searchUserId') || 'User ID'"
              allowClear
              @pressEnter="handleStrategySearch"
            />
            <a-input-search
              v-model="strategySearchKeyword"
              class="toolbar-search"
              :placeholder="$t('systemOverview.searchPlaceholder') || 'Search strategy/symbol/user/ID'"
              allowClear
              @search="handleStrategySearch"
            />
            <a-button type="primary" @click="handleStrategySearch">
              <a-icon type="search" />
              {{ $t('systemOverview.applyFilters') || 'Search' }}
            </a-button>
            <a-button v-if="hasStrategyFilters" @click="clearStrategyFilters">
              {{ $t('systemOverview.clearFilters') || 'Clear' }}
            </a-button>
          </div>
        </div>
        <div v-if="hasStrategyFilters" class="active-filters">
          <span class="active-filters-label">{{ $t('systemOverview.activeFilters') || 'Active filters' }}:</span>
          <a-tag v-if="normalizePositiveInt(strategyIdSearch)" closable @close="clearStrategyIdFilter">
            {{ $t('systemOverview.searchStrategyId') || 'Strategy ID' }}: {{ normalizePositiveInt(strategyIdSearch) }}
          </a-tag>
          <a-tag v-if="normalizePositiveInt(strategyUserIdSearch)" closable @close="clearStrategyUserIdFilter">
            {{ $t('systemOverview.searchUserId') || 'User ID' }}: {{ normalizePositiveInt(strategyUserIdSearch) }}
          </a-tag>
          <a-tag v-if="strategySearchKeyword" closable @close="clearStrategyKeywordFilter">
            {{ $t('systemOverview.filterKeyword') || 'Keyword' }}: {{ strategySearchKeyword }}
          </a-tag>
          <a-tag v-if="strategyStatusFilter !== 'all'" closable @close="clearStrategyStatusFilter">
            {{ $t('systemOverview.colStatus') || 'Status' }}: {{ strategyStatusFilter }}
          </a-tag>
          <a-tag v-if="strategyExecutionFilter !== 'all'" closable @close="clearStrategyExecutionFilter">
            {{ $t('systemOverview.colExecutionMode') || 'Mode' }}: {{ strategyExecutionFilter }}
          </a-tag>
        </div>

        <!-- Strategy Table -->
        <a-card :bordered="false" class="user-table-card">
          <a-table
            :columns="strategyColumns"
            :dataSource="systemStrategies"
            :loading="strategyLoading"
            :pagination="strategyPagination"
            :rowKey="record => record.id"
            :scroll="{ x: 2100 }"
            @change="handleStrategyTableChange"
          >
            <!-- Strategy ID -->
            <template slot="strategyId" slot-scope="text, record">
              <span class="id-cell">
                <span class="mono-id">{{ text }}</span>
                <a-tooltip :title="$t('common.copy') || 'Copy'">
                  <a-button type="link" size="small" class="id-copy-btn" @click="copyText(text)">
                    <a-icon type="copy" />
                  </a-button>
                </a-tooltip>
              </span>
            </template>

            <!-- Owner user id -->
            <template slot="ownerUserId" slot-scope="text, record">
              <a-button type="link" size="small" class="link-id-btn" @click.stop="filterStrategiesByUser(record.user_id)">
                {{ text }}
              </a-button>
            </template>

            <!-- Strategy Status -->
            <template slot="strategyStatus" slot-scope="text">
              <span class="status-cell">
                <span class="status-dot" :class="text === 'running' ? 'dot-running' : 'dot-stopped'" />
                <span :class="text === 'running' ? 'status-running' : 'status-stopped'">
                  {{ text === 'running' ? ($t('systemOverview.running') || 'Running') : ($t('systemOverview.stopped') || 'Stopped') }}
                </span>
              </span>
            </template>

            <!-- User Column -->
            <template slot="userInfo" slot-scope="text, record">
              <a-tooltip :title="(record.nickname || record.username || '-')">
                <span class="user-cell">
                  <a-avatar size="small" :style="{ backgroundColor: getUserColor(record.user_id), fontSize: '11px', marginRight: '6px' }">
                    {{ (record.nickname || record.username || '?').charAt(0).toUpperCase() }}
                  </a-avatar>
                  <span class="user-name">{{ truncate(record.nickname || record.username || '-', 8) }}</span>
                </span>
              </a-tooltip>
            </template>

            <!-- Symbol Column -->
            <template slot="symbolInfo" slot-scope="text, record">
              <div>
                <span class="symbol-text">{{ record.symbol || '-' }}</span>
                <a-tag v-if="record.cs_strategy_type === 'cross_sectional'" color="purple" size="small" style="margin-left: 4px">CS</a-tag>
              </div>
              <div v-if="record.cs_strategy_type === 'cross_sectional' && record.symbol_list && record.symbol_list.length" class="symbol-count text-muted">
                {{ record.symbol_list.length }} {{ $t('systemOverview.symbols') || 'symbols' }}
              </div>
            </template>

            <!-- Capital Column -->
            <template slot="capitalInfo" slot-scope="text">
              <span>{{ formatNumber(text) }}</span>
            </template>

            <!-- Execution mode -->
            <template slot="executionModeInfo" slot-scope="text">
              <a-tag v-if="text === 'live'" color="green" size="small">{{ $t('systemOverview.live') || 'Live' }}</a-tag>
              <a-tag v-else-if="text === 'signal'" color="blue" size="small">{{ $t('systemOverview.signal') || 'Signal' }}</a-tag>
              <a-tag v-else size="small">{{ text || '—' }}</a-tag>
            </template>

            <!-- Position equity (live book value; from open positions) -->
            <template slot="equityInfo" slot-scope="text, record">
              <span v-if="record.execution_mode === 'live'">{{ formatNumber(text || 0) }}</span>
              <span v-else class="text-muted">—</span>
            </template>

            <!-- PnL Column -->
            <template slot="pnlInfo" slot-scope="text, record">
              <div :class="record.total_pnl >= 0 ? 'text-profit' : 'text-loss'">
                <span class="pnl-value">{{ formatPnl(record.total_pnl) }}</span>
                <span class="roi-text">({{ record.roi >= 0 ? '+' : '' }}{{ record.roi }}%)</span>
              </div>
              <div class="pnl-detail text-muted">
                <span>{{ $t('systemOverview.realized') || 'Real' }}: {{ formatPnl(record.total_realized_pnl) }}</span>
                <span style="margin-left: 8px">{{ $t('systemOverview.unrealized') || 'Unreal' }}: {{ formatPnl(record.total_unrealized_pnl) }}</span>
              </div>
            </template>

            <!-- Positions Column -->
            <template slot="positionInfo" slot-scope="text, record">
              <a-badge :count="record.position_count" :numberStyle="{ backgroundColor: record.position_count > 0 ? '#52c41a' : '#d9d9d9' }" />
            </template>

            <!-- Trades Column -->
            <template slot="tradeInfo" slot-scope="text">
              <span>{{ text || 0 }}</span>
            </template>

            <!-- Indicator Column -->
            <template slot="indicatorInfo" slot-scope="text">
              <a-tooltip v-if="text" :title="text">
                <span class="indicator-name">{{ truncate(text, 16) }}</span>
              </a-tooltip>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Exchange Column -->
            <template slot="exchangeInfo" slot-scope="text">
              <span v-if="text" class="exchange-name">{{ formatExchangeName(text) }}</span>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Timeframe Column -->
            <template slot="timeframeInfo" slot-scope="text">
              <a-tag v-if="text" size="small">{{ text }}</a-tag>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Leverage Column -->
            <template slot="leverageInfo" slot-scope="text">
              <span v-if="text > 1" style="color: #fa8c16; font-weight: 600">{{ text }}x</span>
              <span v-else>{{ text || 1 }}x</span>
            </template>

            <!-- Created At Column -->
            <template slot="createdAtInfo" slot-scope="text">
              <span v-if="text">{{ formatTime(text) }}</span>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Updated At Column -->
            <template slot="updatedAtInfo" slot-scope="text">
              <span v-if="text">{{ formatTime(text) }}</span>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Actions: start/stop -->
            <template slot="strategyActions" slot-scope="text, record">
              <a-space size="small">
                <a-tooltip
                  :title="record.status === 'running'
                    ? ($t('systemOverview.stopStrategy') || 'Stop strategy')
                    : ($t('systemOverview.startStrategy') || 'Start strategy')"
                >
                  <a-switch
                    :checked="record.status === 'running'"
                    :loading="strategyTogglingId === record.id"
                    :checked-children="$t('systemOverview.switchOn') || 'On'"
                    :un-checked-children="$t('systemOverview.switchOff') || 'Off'"
                    @change="(checked) => handleStrategyToggle(record, checked)"
                  />
                </a-tooltip>
                <a-tooltip :title="$t('systemOverview.viewUserStrategies') || 'View user strategies'">
                  <a-button type="link" size="small" @click.stop="filterStrategiesByUser(record.user_id)">
                    <a-icon type="user" />
                  </a-button>
                </a-tooltip>
              </a-space>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>

      <!-- Tab 3: Order List -->
      <a-tab-pane key="orders" :tab="$t('adminOrders.tabTitle') || 'Order List'">
        <!-- Order Summary Cards -->
        <div class="summary-cards" v-if="orderSummary">
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
              <a-icon type="file-text" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ orderSummary.total_orders || 0 }}</div>
              <div class="summary-label">{{ $t('adminOrders.totalOrders') || 'Total Orders' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #11998e, #38ef7d)">
              <a-icon type="check-circle" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ orderSummary.paid_orders || 0 }}</div>
              <div class="summary-label">{{ $t('adminOrders.paidOrders') || 'Paid' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
              <a-icon type="clock-circle" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ orderSummary.pending_orders || 0 }}</div>
              <div class="summary-label">{{ $t('adminOrders.pendingOrders') || 'Pending' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #fa709a, #fee140)">
              <a-icon type="dollar" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ formatNumber(orderSummary.total_revenue) }} <span style="font-size: 13px; color: #999;">USDT</span></div>
              <div class="summary-label">{{ $t('adminOrders.totalRevenue') || 'Total Revenue' }}</div>
            </div>
          </div>
        </div>

        <!-- Order Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <a-button @click="loadOrders">
              <a-icon type="reload" />
              {{ $t('common.refresh') || 'Refresh' }}
            </a-button>
            <a-select v-model="orderStatusFilter" class="toolbar-select" @change="handleOrderFilterChange">
              <a-select-option value="all">{{ $t('adminOrders.filterAll') || 'All Status' }}</a-select-option>
              <a-select-option value="pending">{{ $t('adminOrders.filterPending') || 'Pending' }}</a-select-option>
              <a-select-option value="paid">{{ $t('adminOrders.filterPaid') || 'Paid' }}</a-select-option>
              <a-select-option value="confirmed">{{ $t('adminOrders.filterConfirmed') || 'Confirmed' }}</a-select-option>
              <a-select-option value="expired">{{ $t('adminOrders.filterExpired') || 'Expired' }}</a-select-option>
            </a-select>
          </div>
          <div class="toolbar-right">
            <a-input-search
              v-model="orderSearchKeyword"
              class="toolbar-search"
              :placeholder="$t('adminOrders.searchPlaceholder') || 'Search by username/email'"
              allowClear
              @search="handleOrderSearch"
              @pressEnter="handleOrderSearch"
            />
          </div>
        </div>

        <!-- Order Table -->
        <a-card :bordered="false" class="user-table-card">
          <a-table
            :columns="orderColumns"
            :dataSource="orders"
            :loading="orderLoading"
            :pagination="orderPagination"
            :rowKey="record => record.order_type + '-' + record.id"
            :scroll="{ x: 1400 }"
            @change="handleOrderTableChange"
          >
            <!-- User Column -->
            <template slot="orderUserInfo" slot-scope="text, record">
              <a-tooltip :title="(record.nickname || record.username || '-') + ' (' + (record.user_email || '') + ')'">
                <span class="user-cell">
                  <a-avatar size="small" :style="{ backgroundColor: getUserColor(record.user_id), fontSize: '11px', marginRight: '6px' }">
                    {{ (record.nickname || record.username || '?').charAt(0).toUpperCase() }}
                  </a-avatar>
                  <span class="user-name">{{ truncate(record.nickname || record.username || '-', 10) }}</span>
                </span>
              </a-tooltip>
            </template>

            <!-- Order Type Column -->
            <template slot="orderTypeInfo" slot-scope="text">
              <a-tag :color="text === 'usdt' ? 'green' : 'blue'">
                {{ text === 'usdt' ? 'USDT' : 'Mock' }}
              </a-tag>
            </template>

            <!-- Plan Column -->
            <template slot="planInfo" slot-scope="text">
              <a-tag :color="text === 'lifetime' ? 'gold' : text === 'yearly' ? 'purple' : 'cyan'">
                {{ text === 'lifetime' ? ($t('adminOrders.lifetime') || 'Lifetime') : text === 'yearly' ? ($t('adminOrders.yearly') || 'Yearly') : ($t('adminOrders.monthly') || 'Monthly') }}
              </a-tag>
            </template>

            <!-- Amount Column -->
            <template slot="amountInfo" slot-scope="text, record">
              <span style="font-weight: 600;">{{ text }}</span>
              <span class="text-muted" style="margin-left: 4px;">{{ record.currency }}</span>
            </template>

            <!-- Status Column -->
            <template slot="orderStatusInfo" slot-scope="text">
              <a-tag :color="getOrderStatusColor(text)">{{ getOrderStatusLabel(text) }}</a-tag>
            </template>

            <!-- Chain Column -->
            <template slot="chainInfo" slot-scope="text">
              <span v-if="text">{{ text }}</span>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Address Column -->
            <template slot="addressInfo" slot-scope="text">
              <a-tooltip v-if="text" :title="text">
                <span class="address-text">{{ truncate(text, 12) }}</span>
              </a-tooltip>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Tx Hash Column -->
            <template slot="txHashInfo" slot-scope="text">
              <a-tooltip v-if="text" :title="text">
                <span class="hash-text">{{ truncate(text, 14) }}</span>
              </a-tooltip>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Created At Column -->
            <template slot="orderCreatedAt" slot-scope="text">
              <span v-if="text">{{ formatTime(text) }}</span>
              <span v-else class="text-muted">-</span>
            </template>

            <!-- Actions Column: admin "manual confirm" rescue button.
                 Only surfaces for status in {pending, paid, expired} —
                 cancelled is intentionally hidden (we don't want to
                 silently revive a refund) and confirmed shows a passive
                 "amend note" link that re-uses the same modal. -->
            <template slot="orderActions" slot-scope="text, record">
              <template v-if="canManualConfirm(record.status)">
                <a-button type="link" size="small" class="manual-confirm-btn" @click="openManualConfirm(record)">
                  <a-icon type="thunderbolt" />
                  {{ $t('adminOrders.manualConfirm') || 'Manual confirm' }}
                </a-button>
              </template>
              <template v-else-if="record.status === 'confirmed' && record.matched_via === 'manual_admin'">
                <a-tooltip :title="record.admin_note || ($t('adminOrders.manualConfirmedNoNote') || 'Manually confirmed by an admin')">
                  <a-tag color="purple" class="manual-tag">
                    <a-icon type="user" /> {{ $t('adminOrders.manualConfirmed') || 'Manual' }}
                  </a-tag>
                </a-tooltip>
              </template>
              <span v-else class="text-muted">-</span>
            </template>
          </a-table>
        </a-card>

        <!-- Manual-confirm modal (admin "rescue" tool when the on-chain
             reconciler missed a real payment). Two-step UX: paste tx
             hash + optional note, then a confirmation gate before we
             grant the membership. -->
        <a-modal
          v-model="manualConfirmModal.visible"
          :title="$t('adminOrders.manualConfirmTitle') || 'Manual confirm USDT order'"
          :ok-text="$t('adminOrders.manualConfirmOk') || 'Confirm & grant'"
          :cancel-text="$t('common.cancel') || 'Cancel'"
          :ok-button-props="{ props: { type: 'primary', loading: manualConfirmModal.submitting, disabled: !manualConfirmModal.txHash.trim() } }"
          :mask-closable="!manualConfirmModal.submitting"
          :closable="!manualConfirmModal.submitting"
          width="540px"
          @ok="submitManualConfirm"
          @cancel="closeManualConfirm"
        >
          <a-alert
            type="warning"
            show-icon
            :message="$t('adminOrders.manualConfirmWarnTitle') || 'You are about to grant a membership.'"
            :description="$t('adminOrders.manualConfirmWarnDesc') || 'The on-chain reconciler will be bypassed. Only use this when you have independently verified that the buyer paid the correct amount to the receiving address on the chain shown below.'"
            style="margin-bottom: 14px;"
          />

          <div v-if="manualConfirmModal.record" class="mc-summary">
            <div class="mc-row"><span class="mc-label">{{ $t('adminOrders.colUser') || 'User' }}:</span><span>{{ manualConfirmModal.record.username || '-' }} <span class="text-muted">({{ manualConfirmModal.record.user_email || '-' }})</span></span></div>
            <div class="mc-row"><span class="mc-label">{{ $t('adminOrders.colPlan') || 'Plan' }}:</span><a-tag :color="manualConfirmModal.record.plan === 'lifetime' ? 'gold' : manualConfirmModal.record.plan === 'yearly' ? 'purple' : 'cyan'">{{ manualConfirmModal.record.plan }}</a-tag></div>
            <div class="mc-row"><span class="mc-label">{{ $t('adminOrders.colAmount') || 'Amount' }}:</span><span class="mc-amount">{{ manualConfirmModal.record.amount }} USDT</span></div>
            <div class="mc-row"><span class="mc-label">{{ $t('adminOrders.colChain') || 'Chain' }}:</span><a-tag color="green">{{ manualConfirmModal.record.chain }}</a-tag></div>
            <div class="mc-row mc-row-mono"><span class="mc-label">{{ $t('adminOrders.colAddress') || 'Address' }}:</span><span class="mc-mono">{{ manualConfirmModal.record.address }}</span></div>
            <div class="mc-row"><span class="mc-label">{{ $t('adminOrders.colStatus') || 'Status' }}:</span><a-tag :color="getOrderStatusColor(manualConfirmModal.record.status)">{{ getOrderStatusLabel(manualConfirmModal.record.status) }}</a-tag></div>
          </div>

          <a-form layout="vertical" style="margin-top: 14px;">
            <a-form-item :label="$t('adminOrders.txHashLabel') || 'On-chain tx hash'" :required="true">
              <a-input
                v-model="manualConfirmModal.txHash"
                :placeholder="$t('adminOrders.txHashPlaceholder') || 'Paste the on-chain transaction signature / hash'"
                :max-length="120"
                allow-clear
              />
            </a-form-item>
            <a-form-item :label="$t('adminOrders.adminNoteLabel') || 'Note (optional, kept in audit log)'">
              <a-textarea
                v-model="manualConfirmModal.note"
                :placeholder="$t('adminOrders.adminNotePlaceholder') || 'e.g. user confirmed in support ticket #1234, reconciler missed it'"
                :max-length="1000"
                :rows="3"
              />
            </a-form-item>
          </a-form>
        </a-modal>
      </a-tab-pane>

      <!-- Tab 4: AI Analysis Records -->
      <a-tab-pane key="aiStats" :tab="$t('adminAiStats.tabTitle') || 'AI Analysis'">
        <!-- AI Stats Summary Cards -->
        <div class="summary-cards" v-if="aiStatsSummary">
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
              <a-icon type="thunderbolt" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ (aiStatsSummary.total_analyses || 0) + (aiStatsSummary.total_copilot_sessions || 0) }}</div>
              <div class="summary-label">{{ $t('adminAiStats.aiActivity') || 'AI Activity' }}</div>
              <div class="summary-sub">{{ aiStatsSummary.total_analyses || 0 }} {{ isZh ? '份报告' : 'reports' }} / {{ aiStatsSummary.total_copilot_sessions || 0 }} {{ isZh ? '个会话' : 'chats' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #11998e, #38ef7d)">
              <a-icon type="team" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ Math.max(aiStatsSummary.unique_users || 0, aiStatsSummary.unique_chat_users || 0) }}</div>
              <div class="summary-label">{{ $t('adminAiStats.activeUsers') || 'Active Users' }}</div>
              <div class="summary-sub">{{ aiStatsSummary.unique_chat_users || 0 }} {{ isZh ? '名 Copilot 用户' : 'Copilot users' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
              <a-icon type="stock" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ aiStatsSummary.total_copilot_messages || 0 }}</div>
              <div class="summary-label">{{ $t('adminAiStats.copilotMessages') || 'Copilot Messages' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" style="background: linear-gradient(135deg, #fa709a, #fee140)">
              <a-icon type="like" />
            </div>
            <div class="summary-info">
              <div class="summary-value">
                {{ aiStatsSummary.correct_count || 0 }}
                <span style="font-size: 13px; color: #999;">/ {{ aiStatsSummary.total_memory || 0 }}</span>
              </div>
              <div class="summary-label">{{ $t('adminAiStats.accuracy') || 'Correct / Verified' }}</div>
            </div>
          </div>
        </div>

        <!-- AI Stats Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <a-button @click="loadAiStats">
              <a-icon type="reload" />
              {{ $t('common.refresh') || 'Refresh' }}
            </a-button>
          </div>
          <div class="toolbar-right">
            <a-input-search
              v-model="aiStatsSearchKeyword"
              class="toolbar-search"
              :placeholder="$t('adminAiStats.searchPlaceholder') || 'Search by username'"
              allowClear
              @search="handleAiStatsSearch"
              @pressEnter="handleAiStatsSearch"
            />
          </div>
        </div>

        <!-- Per-User AI Stats Table -->
        <a-card :bordered="false" class="user-table-card" style="margin-bottom: 20px;">
          <h4 class="section-card-title">
            <a-icon type="bar-chart" class="section-card-title-icon" />
            {{ $t('adminAiStats.userStatsTitle') || 'Per-User Statistics' }}
          </h4>
          <a-table
            :columns="aiUserColumns"
            :dataSource="aiUserStats"
            :loading="aiStatsLoading"
            :pagination="aiStatsPagination"
            :rowKey="record => record.user_id"
            :scroll="{ x: 1160 }"
            @change="handleAiStatsTableChange"
          >
            <!-- User Column -->
            <template slot="aiUserInfo" slot-scope="text, record">
              <a-tooltip :title="(record.nickname || record.username || '-') + ' (' + (record.email || '') + ')'">
                <span class="user-cell">
                  <a-avatar size="small" :style="{ backgroundColor: getUserColor(record.user_id), fontSize: '11px', marginRight: '6px' }">
                    {{ (record.nickname || record.username || '?').charAt(0).toUpperCase() }}
                  </a-avatar>
                  <span class="user-name">{{ truncate(record.nickname || record.username || '-', 10) }}</span>
                </span>
              </a-tooltip>
            </template>

            <!-- Analysis Count -->
            <template slot="analysisCountInfo" slot-scope="text">
              <span style="font-weight: 600; color: #1890ff;">{{ text || 0 }}</span>
            </template>

            <!-- Correct/Incorrect -->
            <template slot="accuracyInfo" slot-scope="text, record">
              <span class="text-profit">{{ record.correct || 0 }}</span>
              <span class="text-muted"> / </span>
              <span class="text-loss">{{ record.incorrect || 0 }}</span>
            </template>

            <!-- Feedback -->
            <template slot="feedbackInfo" slot-scope="text, record">
              <a-tooltip :title="($t('adminAiStats.helpful') || 'Helpful') + ' / ' + ($t('adminAiStats.notHelpful') || 'Not Helpful')">
                <span style="color: #52c41a;"><a-icon type="like" /> {{ record.helpful || 0 }}</span>
                <span class="text-muted"> / </span>
                <span style="color: #ff4d4f;"><a-icon type="dislike" /> {{ record.not_helpful || 0 }}</span>
              </a-tooltip>
            </template>

            <!-- Last Analysis At -->
            <template slot="lastAnalysisAt" slot-scope="text">
              <span v-if="text">{{ formatTime(text) }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </a-table>
        </a-card>

        <!-- Recent Analysis Records -->
        <a-card :bordered="false" class="user-table-card">
          <h4 class="section-card-title">
            <a-icon type="history" class="section-card-title-icon" />
            {{ $t('adminAiStats.recentTitle') || 'Recent Analysis Records' }}
          </h4>
          <a-table
            :columns="aiRecentColumns"
            :dataSource="aiRecentRecords"
            :loading="aiStatsLoading"
            :pagination="false"
            :rowKey="record => record.id"
            :scroll="{ x: 900 }"
            size="small"
          >
            <!-- User Column -->
            <template slot="recentUserInfo" slot-scope="text, record">
              <span class="user-cell">
                <a-avatar size="small" :style="{ backgroundColor: getUserColor(record.user_id), fontSize: '11px', marginRight: '6px' }">
                  {{ (record.nickname || record.username || '?').charAt(0).toUpperCase() }}
                </a-avatar>
                <span class="user-name">{{ truncate(record.nickname || record.username || '-', 8) }}</span>
              </span>
            </template>

            <!-- Status Column -->
            <template slot="recentStatusInfo" slot-scope="text">
              <a-tag :color="text === 'completed' ? 'green' : text === 'failed' ? 'red' : 'blue'">
                {{ text }}
              </a-tag>
            </template>

            <!-- Created At Column -->
            <template slot="recentCreatedAt" slot-scope="text">
              <span v-if="text">{{ formatTime(text) }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>
    </a-tabs>

    <!-- Create/Edit User Modal -->
    <a-modal
      v-model="modalVisible"
      :wrap-class-name="userManageModalWrapClass"
      :title="isEdit ? ($t('userManage.editUser') || 'Edit User') : ($t('userManage.createUser') || 'Create User')"
      :confirmLoading="modalLoading"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
    >
      <a-form :form="form" layout="vertical">
        <a-form-item :label="$t('userManage.username') || 'Username'">
          <a-input
            v-decorator="['username', {
              rules: [{ required: !isEdit, message: $t('userManage.usernameRequired') || 'Please enter username' }]
            }]"
            :disabled="isEdit"
            :placeholder="$t('userManage.usernamePlaceholder') || 'Enter username'"
          >
            <a-icon slot="prefix" type="user" />
          </a-input>
        </a-form-item>

        <a-form-item v-if="!isEdit" :label="$t('userManage.password') || 'Password'">
          <a-input-password
            v-decorator="['password', {
              rules: [
                { required: true, message: $t('userManage.passwordRequired') || 'Please enter password' },
                { min: 6, message: $t('userManage.passwordMin') || 'Password must be at least 6 characters' }
              ]
            }]"
            :placeholder="$t('userManage.passwordPlaceholder') || 'Enter password (min 6 characters)'"
          >
            <a-icon slot="prefix" type="lock" />
          </a-input-password>
        </a-form-item>

        <a-form-item :label="$t('userManage.nickname') || 'Nickname'">
          <a-input
            v-decorator="['nickname']"
            :placeholder="$t('userManage.nicknamePlaceholder') || 'Enter nickname'"
          >
            <a-icon slot="prefix" type="smile" />
          </a-input>
        </a-form-item>

        <a-form-item :label="$t('userManage.email') || 'Email'">
          <a-input
            v-decorator="['email', {
              rules: [{ type: 'email', message: $t('userManage.emailInvalid') || 'Invalid email format' }]
            }]"
            :placeholder="$t('userManage.emailPlaceholder') || 'Enter email'"
          >
            <a-icon slot="prefix" type="mail" />
          </a-input>
        </a-form-item>

        <a-form-item :label="$t('userManage.role') || 'Role'">
          <a-select
            v-decorator="['role', { initialValue: 'user' }]"
            :placeholder="$t('userManage.rolePlaceholder') || 'Select role'"
          >
            <a-select-option v-for="role in roles" :key="role.id" :value="role.id">
              {{ getRoleLabel(role.id) }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item v-if="isEdit" :label="$t('userManage.status') || 'Status'">
          <a-select
            v-decorator="['status', { initialValue: 'active' }]"
            :placeholder="$t('userManage.statusPlaceholder') || 'Select status'"
          >
            <a-select-option value="active">{{ $t('userManage.active') || 'Active' }}</a-select-option>
            <a-select-option value="disabled">{{ $t('userManage.disabled') || 'Disabled' }}</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Reset Password Modal -->
    <a-modal
      v-model="resetPasswordVisible"
      :wrap-class-name="userManageModalWrapClass"
      :title="$t('userManage.resetPassword') || 'Reset Password'"
      :confirmLoading="resetPasswordLoading"
      @ok="handleResetPassword"
    >
      <a-form :form="resetPasswordForm" layout="vertical">
        <a-alert
          :message="$t('userManage.resetPasswordWarning') || 'This will reset the user\'s password'"
          type="warning"
          showIcon
          style="margin-bottom: 16px"
        />
        <a-form-item :label="$t('userManage.newPassword') || 'New Password'">
          <a-input-password
            v-decorator="['new_password', {
              rules: [
                { required: true, message: $t('userManage.passwordRequired') || 'Please enter new password' },
                { min: 6, message: $t('userManage.passwordMin') || 'Password must be at least 6 characters' }
              ]
            }]"
            :placeholder="$t('userManage.newPasswordPlaceholder') || 'Enter new password'"
          >
            <a-icon slot="prefix" type="lock" />
          </a-input-password>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Adjust Credits Modal -->
    <a-modal
      v-model="creditsModalVisible"
      :wrap-class-name="userManageModalWrapClass"
      :title="($t('userManage.adjustCredits') || 'Adjust Credits') + (creditsEditingUser ? ` - ${creditsEditingUser.username}` : '')"
      :confirmLoading="creditsLoading"
      @ok="handleSetCredits"
    >
      <a-form layout="vertical">
        <div class="current-credits-info" v-if="creditsEditingUser">
          <span class="label">{{ $t('userManage.currentCredits') || 'Current Credits' }}:</span>
          <span class="value">{{ formatCredits(creditsEditingUser.credits) }}</span>
        </div>
        <a-form-item :label="$t('userManage.newCredits') || 'New Credits'">
          <a-input-number
            v-model="newCredits"
            :min="0"
            :precision="2"
            style="width: 100%"
            :placeholder="$t('userManage.enterCredits') || 'Enter new credits amount'"
          />
        </a-form-item>
        <a-form-item :label="$t('userManage.remark') || 'Remark'">
          <a-input
            v-model="creditsRemark"
            :placeholder="$t('userManage.remarkPlaceholder') || 'Optional remark'"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Set VIP Modal -->
    <a-modal
      v-model="vipModalVisible"
      :wrap-class-name="userManageModalWrapClass"
      :title="($t('userManage.setVip') || 'Set VIP') + (vipEditingUser ? ` - ${vipEditingUser.username}` : '')"
      :confirmLoading="vipLoading"
      @ok="handleSetVip"
    >
      <a-form layout="vertical">
        <div class="current-vip-info" v-if="vipEditingUser && vipEditingUser.vip_expires_at">
          <span class="label">{{ $t('userManage.currentVip') || 'Current VIP' }}:</span>
          <span class="value" :class="isVipActive(vipEditingUser.vip_expires_at) ? 'active' : 'expired'">
            {{ isVipActive(vipEditingUser.vip_expires_at)
              ? ($t('userManage.vipActive') || 'Active') + ` (${formatDate(vipEditingUser.vip_expires_at)})`
              : ($t('userManage.vipExpired') || 'Expired') }}
          </span>
        </div>
        <a-form-item :label="$t('userManage.vipDays') || 'VIP Days'">
          <a-select v-model="vipDays" style="width: 100%">
            <a-select-option :value="0">{{ $t('userManage.cancelVip') || 'Cancel VIP' }}</a-select-option>
            <a-select-option :value="7">7 {{ $t('userManage.days') || 'days' }}</a-select-option>
            <a-select-option :value="30">30 {{ $t('userManage.days') || 'days' }}</a-select-option>
            <a-select-option :value="90">90 {{ $t('userManage.days') || 'days' }}</a-select-option>
            <a-select-option :value="180">180 {{ $t('userManage.days') || 'days' }}</a-select-option>
            <a-select-option :value="365">365 {{ $t('userManage.days') || 'days' }}</a-select-option>
            <a-select-option :value="-1">{{ $t('userManage.customDate') || 'Custom Date' }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="vipDays === -1" :label="$t('userManage.vipExpiresAt') || 'VIP Expires At'">
          <a-date-picker
            v-model="vipCustomDate"
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item :label="$t('userManage.remark') || 'Remark'">
          <a-input
            v-model="vipRemark"
            :placeholder="$t('userManage.remarkPlaceholder') || 'Optional remark'"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { getUserList, exportUsers, createUser, updateUser, deleteUser, resetUserPassword, getRoles, setUserCredits, setUserVip, getSystemStrategies, adminToggleStrategy, getAdminOrders, manualConfirmOrder, getAdminAiStats, getUserAdminStats } from '@/api/user'
import { baseMixin } from '@/store/app-mixin'
import { mapGetters } from 'vuex'
import * as echarts from 'echarts'
import { getExchangeDisplayName } from '@/utils/exchangeCredential'

export default {
  name: 'UserManage',
  mixins: [baseMixin],
  data () {
    return {
      activeTab: 'users',
      loading: false,
      exportingUsers: false,
      users: [],
      roles: [],
      searchKeyword: '',
      userIdSearch: '',
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0
      },
      // Admin dashboard stats (KPIs + charts) for the Users tab.
      // Loaded once on mount; refresh button forces a reload. The charts are
      // rendered with echarts in `renderCharts()`; instances live on `this`
      // (non-reactive) under `_chartInstances` so they survive theme changes.
      userStats: null,
      userStatsLoading: false,
      // Admin can click the eye icon in the email column header to reveal
      // real addresses. Defaulting to masked avoids casual shoulder-surfing
      // when the admin shares their screen during a demo / support call.
      emailVisible: false,
      // Create/Edit Modal
      modalVisible: false,
      modalLoading: false,
      isEdit: false,
      editingUser: null,
      // Reset Password Modal
      resetPasswordVisible: false,
      resetPasswordLoading: false,
      resetPasswordUserId: null,
      // Credits Modal
      creditsModalVisible: false,
      creditsLoading: false,
      creditsEditingUser: null,
      newCredits: 0,
      creditsRemark: '',
      // VIP Modal
      vipModalVisible: false,
      vipLoading: false,
      vipEditingUser: null,
      vipDays: 30,
      vipCustomDate: null,
      vipRemark: '',
      // System Strategy Overview
      strategyLoading: false,
      systemStrategies: [],
      strategySummary: null,
      strategyStatusFilter: 'all',
      strategyExecutionFilter: 'all',
      strategySortBy: '',
      strategySortOrder: 'desc',
      strategySearchKeyword: '',
      strategyIdSearch: '',
      strategyUserIdSearch: '',
      strategyTogglingId: null,
      strategyPagination: {
        current: 1,
        pageSize: 20,
        total: 0
      },
      strategiesLoaded: false,
      // Order List
      orderLoading: false,
      orders: [],
      orderSummary: null,
      orderStatusFilter: 'all',
      orderSearchKeyword: '',
      orderPagination: {
        current: 1,
        pageSize: 20,
        total: 0
      },
      ordersLoaded: false,
      // Admin manual-confirm modal (rescue tool when on-chain reconciler
      // missed a payment). `record` holds the row currently being
      // confirmed so the modal body can show plan/amount/chain context.
      manualConfirmModal: {
        visible: false,
        submitting: false,
        record: null,
        txHash: '',
        note: ''
      },
      // AI Analysis Stats
      aiStatsLoading: false,
      aiUserStats: [],
      aiRecentRecords: [],
      aiStatsSummary: null,
      aiStatsSearchKeyword: '',
      aiStatsPagination: {
        current: 1,
        pageSize: 20,
        total: 0
      },
      aiStatsLoaded: false
    }
  },
  computed: {
    ...mapGetters(['userInfo']),
    isZh () {
      const locale = this.$i18n ? String(this.$i18n.locale || '') : 'zh-CN'
      return locale.toLowerCase().startsWith('zh')
    },
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    userManageModalWrapClass () {
      return this.isDarkTheme ? 'user-manage-modal user-manage-modal-dark' : 'user-manage-modal'
    },
    currentUserId () {
      return this.userInfo?.id
    },
    // ---- Admin dashboard derived state ----
    // Suppress the "today vs yesterday" delta on a brand-new install where
    // yesterday is also zero — `+∞%` next to "0 new" would be misleading.
    hasYesterdayBaseline () {
      const s = this.userStats && this.userStats.summary
      if (!s) return false
      return Number(s.yesterday_new || 0) > 0 || Number(s.today_new || 0) > 0
    },
    todayDeltaText () {
      const s = this.userStats && this.userStats.summary
      if (!s) return ''
      const today = Number(s.today_new || 0)
      const y = Number(s.yesterday_new || 0)
      if (y === 0 && today === 0) return ''
      if (y === 0) return today > 0 ? '+∞' : ''
      const pct = ((today - y) / y) * 100
      const sign = pct >= 0 ? '+' : ''
      return `${sign}${pct.toFixed(0)}%`
    },
    todayDeltaClass () {
      const s = this.userStats && this.userStats.summary
      if (!s) return 'delta-flat'
      const today = Number(s.today_new || 0)
      const y = Number(s.yesterday_new || 0)
      if (today > y) return 'delta-up'
      if (today < y) return 'delta-down'
      return 'delta-flat'
    },
    kpiYesterdaySub () {
      const s = this.userStats && this.userStats.summary
      const y = s ? Number(s.yesterday_new || 0) : 0
      const label = this.$t('userManage.kpiYesterday') || 'Yesterday'
      return `${label}: ${this.formatNumber(y)}`
    },
    hasUserFilters () {
      return !!(this.normalizePositiveInt(this.userIdSearch) || String(this.searchKeyword || '').trim())
    },
    hasStrategyFilters () {
      return !!(
        this.normalizePositiveInt(this.strategyIdSearch) ||
        this.normalizePositiveInt(this.strategyUserIdSearch) ||
        String(this.strategySearchKeyword || '').trim() ||
        this.strategyStatusFilter !== 'all' ||
        this.strategyExecutionFilter !== 'all'
      )
    },
    columns () {
      return [
        {
          title: 'ID',
          dataIndex: 'id',
          width: 60
        },
        {
          title: this.$t('userManage.username') || 'Username',
          dataIndex: 'username',
          width: 120
        },
        {
          title: this.$t('userManage.nickname') || 'Nickname',
          dataIndex: 'nickname',
          width: 100
        },
        {
          dataIndex: 'email',
          width: 200,
          slots: { title: 'emailTitle' },
          scopedSlots: { customRender: 'email' }
        },
        {
          title: this.$t('userManage.role') || 'Role',
          dataIndex: 'role',
          width: 90,
          scopedSlots: { customRender: 'role' }
        },
        {
          title: this.$t('userManage.credits') || 'Credits',
          dataIndex: 'credits',
          width: 100,
          scopedSlots: { customRender: 'credits' }
        },
        {
          title: 'VIP',
          dataIndex: 'vip_expires_at',
          width: 120,
          scopedSlots: { customRender: 'vip_expires_at' }
        },
        {
          title: this.$t('userManage.status') || 'Status',
          dataIndex: 'status',
          width: 90,
          scopedSlots: { customRender: 'status' }
        },
        {
          title: this.$t('userManage.registerIp') || '注册 IP',
          dataIndex: 'register_ip',
          width: 140,
          scopedSlots: { customRender: 'register_ip' }
        },
        {
          title: this.$t('userManage.lastLogin') || 'Last Login',
          dataIndex: 'last_login_at',
          width: 150,
          scopedSlots: { customRender: 'last_login_at' }
        },
        {
          title: this.$t('common.actions') || 'Actions',
          dataIndex: 'action',
          width: 220,
          scopedSlots: { customRender: 'action' }
        }
      ]
    },
    strategyColumns () {
      const so = (key) =>
        this.strategySortBy === key ? (this.strategySortOrder === 'asc' ? 'ascend' : 'descend') : false
      return [
        {
          title: 'ID',
          dataIndex: 'id',
          key: 'id',
          width: 96,
          fixed: 'left',
          scopedSlots: { customRender: 'strategyId' },
          sorter: true,
          sortOrder: so('id')
        },
        {
          title: this.$t('systemOverview.colUserId') || 'User ID',
          dataIndex: 'user_id',
          key: 'user_id',
          width: 88,
          fixed: 'left',
          scopedSlots: { customRender: 'ownerUserId' }
        },
        {
          title: this.$t('systemOverview.colUser') || 'User',
          dataIndex: 'username',
          key: 'username',
          width: 118,
          fixed: 'left',
          scopedSlots: { customRender: 'userInfo' }
        },
        {
          title: this.$t('systemOverview.colStrategy') || 'Strategy',
          dataIndex: 'strategy_name',
          key: 'strategy_name',
          width: 160,
          ellipsis: true,
          sorter: true,
          sortOrder: so('strategy_name')
        },
        {
          title: this.$t('systemOverview.colStatus') || 'Status',
          dataIndex: 'status',
          key: 'status',
          width: 108,
          scopedSlots: { customRender: 'strategyStatus' },
          sorter: true,
          sortOrder: so('status')
        },
        {
          title: this.$t('systemOverview.colExecutionMode') || 'Mode',
          dataIndex: 'execution_mode',
          key: 'execution_mode',
          width: 96,
          align: 'center',
          scopedSlots: { customRender: 'executionModeInfo' },
          sorter: true,
          sortOrder: so('execution_mode')
        },
        {
          title: this.$t('systemOverview.colSymbol') || 'Symbol',
          dataIndex: 'symbol',
          key: 'symbol',
          width: 140,
          scopedSlots: { customRender: 'symbolInfo' },
          sorter: true,
          sortOrder: so('symbol')
        },
        {
          title: this.$t('systemOverview.colCapital') || 'Capital',
          dataIndex: 'initial_capital',
          key: 'initial_capital',
          width: 110,
          scopedSlots: { customRender: 'capitalInfo' },
          sorter: true,
          sortOrder: so('initial_capital')
        },
        {
          title: this.$t('systemOverview.colPositionEquity') || 'Pos. equity',
          dataIndex: 'total_equity',
          key: 'total_equity',
          width: 120,
          align: 'right',
          scopedSlots: { customRender: 'equityInfo' },
          sorter: true,
          sortOrder: so('total_equity')
        },
        {
          title: this.$t('systemOverview.colPnl') || 'PnL / ROI',
          dataIndex: 'total_pnl',
          key: 'total_pnl',
          width: 200,
          scopedSlots: { customRender: 'pnlInfo' },
          sorter: true,
          sortOrder: so('total_pnl')
        },
        {
          title: this.$t('systemOverview.colPositions') || 'Pos',
          dataIndex: 'position_count',
          key: 'position_count',
          width: 76,
          align: 'center',
          scopedSlots: { customRender: 'positionInfo' },
          sorter: true,
          sortOrder: so('position_count')
        },
        {
          title: this.$t('systemOverview.colTrades') || 'Trades',
          dataIndex: 'trade_count',
          key: 'trade_count',
          width: 88,
          align: 'center',
          scopedSlots: { customRender: 'tradeInfo' },
          sorter: true,
          sortOrder: so('trade_count')
        },
        {
          title: this.$t('systemOverview.colIndicator') || 'Indicator',
          dataIndex: 'indicator_name',
          key: 'indicator_name',
          width: 130,
          scopedSlots: { customRender: 'indicatorInfo' }
        },
        {
          title: this.$t('systemOverview.colExchange') || 'Exchange',
          dataIndex: 'exchange_name',
          key: 'exchange_name',
          width: 100,
          scopedSlots: { customRender: 'exchangeInfo' }
        },
        {
          title: this.$t('systemOverview.colTimeframe') || 'TF',
          dataIndex: 'timeframe',
          key: 'timeframe',
          width: 70,
          align: 'center',
          scopedSlots: { customRender: 'timeframeInfo' }
        },
        {
          title: this.$t('systemOverview.colLeverage') || 'Lev',
          dataIndex: 'leverage',
          key: 'leverage',
          width: 70,
          align: 'center',
          scopedSlots: { customRender: 'leverageInfo' },
          sorter: true,
          sortOrder: so('leverage')
        },
        {
          title: this.$t('systemOverview.colCreatedAt') || 'Created',
          dataIndex: 'created_at',
          key: 'created_at',
          width: 150,
          scopedSlots: { customRender: 'createdAtInfo' },
          sorter: true,
          sortOrder: so('created_at')
        },
        {
          title: this.$t('systemOverview.colUpdatedAt') || 'Updated',
          dataIndex: 'updated_at',
          key: 'updated_at',
          width: 150,
          scopedSlots: { customRender: 'updatedAtInfo' },
          sorter: true,
          sortOrder: so('updated_at')
        },
        {
          title: this.$t('common.actions') || 'Actions',
          key: 'actions',
          width: 120,
          fixed: 'right',
          scopedSlots: { customRender: 'strategyActions' }
        }
      ]
    },
    orderColumns () {
      return [
        {
          title: this.$t('adminOrders.colUser') || 'User',
          dataIndex: 'username',
          width: 120,
          scopedSlots: { customRender: 'orderUserInfo' }
        },
        {
          title: this.$t('adminOrders.colType') || 'Type',
          dataIndex: 'order_type',
          width: 80,
          scopedSlots: { customRender: 'orderTypeInfo' }
        },
        {
          title: this.$t('adminOrders.colPlan') || 'Plan',
          dataIndex: 'plan',
          width: 100,
          scopedSlots: { customRender: 'planInfo' }
        },
        {
          title: this.$t('adminOrders.colAmount') || 'Amount',
          dataIndex: 'amount',
          width: 120,
          scopedSlots: { customRender: 'amountInfo' }
        },
        {
          title: this.$t('adminOrders.colStatus') || 'Status',
          dataIndex: 'status',
          width: 100,
          scopedSlots: { customRender: 'orderStatusInfo' }
        },
        {
          title: this.$t('adminOrders.colChain') || 'Chain',
          dataIndex: 'chain',
          width: 80,
          scopedSlots: { customRender: 'chainInfo' }
        },
        {
          title: this.$t('adminOrders.colAddress') || 'Address',
          dataIndex: 'address',
          width: 140,
          scopedSlots: { customRender: 'addressInfo' }
        },
        {
          title: this.$t('adminOrders.colTxHash') || 'Tx Hash',
          dataIndex: 'tx_hash',
          width: 160,
          scopedSlots: { customRender: 'txHashInfo' }
        },
        {
          title: this.$t('adminOrders.colCreatedAt') || 'Created',
          dataIndex: 'created_at',
          width: 150,
          scopedSlots: { customRender: 'orderCreatedAt' }
        },
        {
          title: this.$t('adminOrders.colActions') || 'Actions',
          key: 'actions',
          width: 140,
          fixed: 'right',
          scopedSlots: { customRender: 'orderActions' }
        }
      ]
    },
    aiUserColumns () {
      return [
        {
          title: this.$t('adminAiStats.colUser') || 'User',
          dataIndex: 'username',
          width: 140,
          scopedSlots: { customRender: 'aiUserInfo' }
        },
        {
          title: this.$t('adminAiStats.colAnalysisCount') || 'Analyses',
          dataIndex: 'analysis_count',
          width: 100,
          align: 'center',
          scopedSlots: { customRender: 'analysisCountInfo' },
          sorter: (a, b) => a.analysis_count - b.analysis_count,
          defaultSortOrder: 'descend'
        },
        {
          title: this.$t('adminAiStats.colSymbols') || 'Symbols',
          dataIndex: 'symbol_count',
          width: 90,
          align: 'center'
        },
        {
          title: this.$t('adminAiStats.colMarkets') || 'Markets',
          dataIndex: 'market_count',
          width: 90,
          align: 'center'
        },
        {
          title: this.$t('adminAiStats.colCopilotSessions') || 'Chats',
          dataIndex: 'chat_session_count',
          width: 90,
          align: 'center'
        },
        {
          title: this.$t('adminAiStats.colCopilotMessages') || 'Messages',
          dataIndex: 'chat_message_count',
          width: 100,
          align: 'center'
        },
        {
          title: this.$t('adminAiStats.colAccuracy') || 'Correct / Wrong',
          dataIndex: 'correct',
          width: 130,
          align: 'center',
          scopedSlots: { customRender: 'accuracyInfo' }
        },
        {
          title: this.$t('adminAiStats.colFeedback') || 'Feedback',
          dataIndex: 'helpful',
          width: 130,
          align: 'center',
          scopedSlots: { customRender: 'feedbackInfo' }
        },
        {
          title: this.$t('adminAiStats.colLastAnalysis') || 'Last Analysis',
          dataIndex: 'last_analysis_at',
          width: 160,
          scopedSlots: { customRender: 'lastAnalysisAt' }
        }
      ]
    },
    aiRecentColumns () {
      return [
        {
          title: 'ID',
          dataIndex: 'id',
          width: 60
        },
        {
          title: this.$t('adminAiStats.colUser') || 'User',
          dataIndex: 'username',
          width: 120,
          scopedSlots: { customRender: 'recentUserInfo' }
        },
        {
          title: this.$t('adminAiStats.colMarket') || 'Market',
          dataIndex: 'market',
          width: 80
        },
        {
          title: this.$t('adminAiStats.colSymbol') || 'Symbol',
          dataIndex: 'symbol',
          width: 120
        },
        {
          title: this.$t('adminAiStats.colModel') || 'Model',
          dataIndex: 'model',
          width: 140,
          ellipsis: true
        },
        {
          title: this.$t('adminAiStats.colStatus') || 'Status',
          dataIndex: 'status',
          width: 100,
          scopedSlots: { customRender: 'recentStatusInfo' }
        },
        {
          title: this.$t('adminAiStats.colCreatedAt') || 'Time',
          dataIndex: 'created_at',
          width: 160,
          scopedSlots: { customRender: 'recentCreatedAt' }
        }
      ]
    }
  },
  beforeCreate () {
    this.form = this.$form.createForm(this)
    this.resetPasswordForm = this.$form.createForm(this, { name: 'resetPassword' })
  },
  mounted () {
    this.loadUsers()
    this.loadRoles()
    this.loadUserStats()
    window.addEventListener('resize', this._handleChartResize)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this._handleChartResize)
    this._disposeCharts()
  },
  methods: {
    handleTabChange (key) {
      this.activeTab = key
      if (key === 'strategies' && !this.strategiesLoaded) {
        this.loadSystemStrategies()
      }
      if (key === 'orders' && !this.ordersLoaded) {
        this.loadOrders()
      }
      if (key === 'aiStats' && !this.aiStatsLoaded) {
        this.loadAiStats()
      }
    },

    // ==================== System Strategy Overview ====================
    normalizePositiveInt (raw) {
      if (raw == null || raw === '') return undefined
      const n = parseInt(String(raw).trim(), 10)
      return Number.isFinite(n) && n > 0 ? n : undefined
    },

    buildStrategyQueryParams () {
      const params = {
        page: this.strategyPagination.current,
        page_size: this.strategyPagination.pageSize,
        status: this.strategyStatusFilter === 'all' ? '' : this.strategyStatusFilter,
        execution_mode: this.strategyExecutionFilter === 'all' ? '' : this.strategyExecutionFilter,
        search: String(this.strategySearchKeyword || '').trim()
      }
      const sid = this.normalizePositiveInt(this.strategyIdSearch)
      const uid = this.normalizePositiveInt(this.strategyUserIdSearch)
      if (sid) params.strategy_id = sid
      if (uid) params.user_id = uid
      if (this.strategySortBy) {
        params.sort_by = this.strategySortBy
        params.sort_order = this.strategySortOrder
      }
      return params
    },

    buildUserQueryParams () {
      const params = {
        page: this.pagination.current,
        page_size: this.pagination.pageSize,
        search: String(this.searchKeyword || '').trim()
      }
      const uid = this.normalizePositiveInt(this.userIdSearch)
      if (uid) params.user_id = uid
      return params
    },

    async loadSystemStrategies (retryOnEmptyPage = true) {
      this.strategyLoading = true
      try {
        const res = await getSystemStrategies(this.buildStrategyQueryParams())
        if (res.code === 1) {
          const items = res.data.items || []
          const total = res.data.total || 0
          if (
            retryOnEmptyPage &&
            items.length === 0 &&
            total > 0 &&
            this.strategyPagination.current > 1
          ) {
            this.strategyPagination.current = 1
            await this.loadSystemStrategies(false)
            return
          }
          this.systemStrategies = items
          this.strategyPagination.total = total
          this.strategySummary = res.data.summary || {}
          this.strategiesLoaded = true
        } else {
          this.$message.error(res.msg || 'Failed to load strategies')
        }
      } catch (error) {
        console.error('Failed to load system strategies:', error)
        this.$message.error('Failed to load system strategies')
      } finally {
        this.strategyLoading = false
      }
    },

    handleStrategySearch () {
      this.strategyPagination.current = 1
      this.loadSystemStrategies()
    },

    handleStrategyFilterChange () {
      this.strategyPagination.current = 1
      this.loadSystemStrategies()
    },

    handleStrategyExecutionFilterChange () {
      this.strategyPagination.current = 1
      this.loadSystemStrategies()
    },

    handleStrategyTableChange (pagination, filters, sorter) {
      if (pagination) {
        this.strategyPagination.current = pagination.current
        this.strategyPagination.pageSize = pagination.pageSize
      }
      if (sorter && Object.keys(sorter).length) {
        if (sorter.order === 'ascend' || sorter.order === 'descend') {
          const key = sorter.columnKey != null ? String(sorter.columnKey) : String(sorter.field || '')
          this.strategySortBy = key
          this.strategySortOrder = sorter.order === 'ascend' ? 'asc' : 'desc'
        } else {
          this.strategySortBy = ''
          this.strategySortOrder = 'desc'
        }
      }
      this.loadSystemStrategies()
    },

    filterStrategiesByUser (userId) {
      const uid = this.normalizePositiveInt(userId)
      if (!uid) {
        this.$message.warning(this.$t('systemOverview.invalidUserId') || 'Invalid user ID')
        return
      }
      this.strategyUserIdSearch = String(uid)
      this.strategyIdSearch = ''
      this.strategySearchKeyword = ''
      this.strategyPagination.current = 1
      this.activeTab = 'strategies'
      this.$nextTick(() => {
        this.loadSystemStrategies()
        this.$message.success(
          this.$t('systemOverview.filteredByUser', { id: uid }) || `Showing strategies for user #${uid}`
        )
        const tabsEl = this.$el && this.$el.querySelector('.manage-tabs')
        if (tabsEl && typeof tabsEl.scrollIntoView === 'function') {
          tabsEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },

    clearStrategyFilters () {
      this.strategyIdSearch = ''
      this.strategyUserIdSearch = ''
      this.strategySearchKeyword = ''
      this.strategyStatusFilter = 'all'
      this.strategyExecutionFilter = 'all'
      this.strategyPagination.current = 1
      this.loadSystemStrategies()
    },

    clearStrategyIdFilter () {
      this.strategyIdSearch = ''
      this.strategyPagination.current = 1
      this.loadSystemStrategies()
    },

    clearStrategyUserIdFilter () {
      this.strategyUserIdSearch = ''
      this.strategyPagination.current = 1
      this.loadSystemStrategies()
    },

    clearStrategyKeywordFilter () {
      this.strategySearchKeyword = ''
      this.strategyPagination.current = 1
      this.loadSystemStrategies()
    },

    clearStrategyStatusFilter () {
      this.strategyStatusFilter = 'all'
      this.strategyPagination.current = 1
      this.loadSystemStrategies()
    },

    clearStrategyExecutionFilter () {
      this.strategyExecutionFilter = 'all'
      this.strategyPagination.current = 1
      this.loadSystemStrategies()
    },

    clearUserFilters () {
      this.userIdSearch = ''
      this.searchKeyword = ''
      this.pagination.current = 1
      this.loadUsers()
    },

    clearUserIdFilter () {
      this.userIdSearch = ''
      this.pagination.current = 1
      this.loadUsers()
    },

    clearUserKeywordFilter () {
      this.searchKeyword = ''
      this.pagination.current = 1
      this.loadUsers()
    },

    copyText (text) {
      const val = String(text == null ? '' : text).trim()
      if (!val) return
      const done = () => this.$message.success(this.$t('common.copySuccess') || 'Copied')
      const fail = () => this.$message.error(this.$t('common.copyFailed') || 'Copy failed')
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(done).catch(fail)
        return
      }
      try {
        const ta = document.createElement('textarea')
        ta.value = val
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        done()
      } catch (e) {
        fail()
      }
    },

    handleStrategyToggle (record, checked) {
      const wantRun = !!checked
      const action = wantRun ? 'start' : 'stop'
      const runToggle = async () => {
        this.strategyTogglingId = record.id
        try {
          const res = await adminToggleStrategy(record.id, action)
          if (res && res.code === 1) {
            const newStatus = (res.data && res.data.status) || (wantRun ? 'running' : 'stopped')
            record.status = newStatus
            this.$message.success(res.msg || 'OK')
            await this.loadSystemStrategies()
            if (wantRun) {
              const row = (this.systemStrategies || []).find(s => s.id === record.id)
              if (row && String(row.status || '').toLowerCase() !== 'running') {
                this.$message.warning(
                  this.$t('systemOverview.strategyStartNotPersisted')
                    || '策略未能保持运行，请打开该策略查看运行日志'
                )
              }
            }
          } else {
            this.$message.error((res && res.msg) || 'Operation failed')
            await this.loadSystemStrategies()
          }
        } catch (e) {
          this.$message.error('Operation failed')
        } finally {
          this.strategyTogglingId = null
        }
      }
      if (!wantRun && record.execution_mode === 'live') {
        this.$confirm({
          title: this.$t('systemOverview.confirmStopLiveTitle') || 'Stop live strategy?',
          content: this.$t('systemOverview.confirmStopLiveDesc') || 'This will stop the live executor for this user strategy.',
          okText: this.$t('systemOverview.stopStrategy') || 'Stop',
          cancelText: this.$t('common.cancel') || 'Cancel',
          okType: 'danger',
          onOk: () => runToggle()
        })
        return
      }
      runToggle()
    },

    getUserColor (userId) {
      const colors = ['#1890ff', '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96', '#52c41a', '#2f54eb', '#faad14']
      return colors[(userId || 0) % colors.length]
    },

    // ==================== Admin Dashboard Stats ====================
    async loadUserStats (force = false) {
      if (this.userStatsLoading) return
      this.userStatsLoading = true
      try {
        const res = await getUserAdminStats({ _t: force ? Date.now() : undefined })
        if (res && res.code === 1 && res.data) {
          this.userStats = res.data
          // ECharts needs the canvas DOM to exist before init. We do a
          // nextTick + tiny rAF chain to also wait for v-if to mount the
          // chart wrappers.
          this.$nextTick(() => {
            window.requestAnimationFrame(() => this.renderCharts())
          })
        } else if (res) {
          this.$message.warning(res.msg || 'Failed to load user stats')
        }
      } catch (e) {
        console.warn('loadUserStats failed', e)
      } finally {
        this.userStatsLoading = false
      }
    },

    _chartTextColor () {
      return this.isDarkTheme ? '#c9d1d9' : '#1e293b'
    },
    _chartAxisColor () {
      return this.isDarkTheme ? '#3a3a3a' : '#e5e7eb'
    },
    _chartTooltipBg () {
      return this.isDarkTheme ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.96)'
    },

    renderCharts () {
      if (!this.userStats) return
      // Lazy-init the holder so unit tests / SSR don't hit echarts.init().
      if (!this._chartInstances) this._chartInstances = {}
      this._renderGrowthChart()
      this._renderActivityChart()
      // ECharts grabs the container size at init() time. The growth + DAU
      // cards live inside a `v-if="userStats"` block, so the very first
      // init might happen while the parent grid is still settling its
      // column widths (especially in modal contexts or after a tab switch).
      // We fire one more resize on the next two frames to lock the canvas
      // dimensions to whatever the grid finally landed on — cheap, and
      // fixes the "chart squished into the right column" symptom in
      // narrower wrappers.
      this.$nextTick(() => {
        this._handleChartResize()
        window.requestAnimationFrame(() => this._handleChartResize())
      })
    },

    toggleEmailVisible () {
      this.emailVisible = !this.emailVisible
    },

    maskEmail (raw) {
      const email = String(raw || '').trim()
      if (!email) return '-'
      const at = email.lastIndexOf('@')
      if (at <= 0) {
        // No '@' (legacy or admin-created accounts) — mask the middle of the
        // raw string but keep the first/last char so the admin can still tell
        // two rows apart at a glance.
        if (email.length <= 2) return '••'
        return email[0] + '•••' + email.slice(-1)
      }
      const local = email.slice(0, at)
      const domain = email.slice(at + 1)
      const localMasked = local.length <= 2
        ? local[0] + '•'
        : local[0] + '•••' + local.slice(-1)
      const dotIdx = domain.lastIndexOf('.')
      let domainMasked
      if (dotIdx > 0) {
        const sld = domain.slice(0, dotIdx)
        const tld = domain.slice(dotIdx) // includes the leading dot
        domainMasked = (sld.length <= 2 ? sld[0] + '•' : sld[0] + '•••') + tld
      } else {
        domainMasked = domain.length <= 2 ? domain[0] + '•' : domain[0] + '•••'
      }
      return localMasked + '@' + domainMasked
    },

    _renderGrowthChart () {
      const el = this.$refs.growthChart
      if (!el || !this.userStats) return
      let inst = this._chartInstances.growth
      if (!inst || inst.isDisposed()) {
        inst = echarts.init(el, null, { renderer: 'canvas' })
        this._chartInstances.growth = inst
      }
      const data = this.userStats.growth || []
      const xs = data.map(d => d.date)
      const newSeries = data.map(d => d.new_users || 0)
      const cumSeries = data.map(d => d.cumulative || 0)
      const axisColor = this._chartAxisColor()
      const textColor = this._chartTextColor()
      inst.setOption({
        grid: { left: 56, right: 56, top: 36, bottom: 36 },
        tooltip: {
          trigger: 'axis',
          backgroundColor: this._chartTooltipBg(),
          borderColor: axisColor,
          textStyle: { color: textColor }
        },
        legend: {
          data: [
            this.$t('userManage.legendNew') || 'New Users',
            this.$t('userManage.legendTotal') || 'Cumulative'
          ],
          textStyle: { color: textColor },
          top: 0
        },
        xAxis: {
          type: 'category',
          data: xs,
          axisLine: { lineStyle: { color: axisColor } },
          axisLabel: { color: textColor, fontSize: 11, hideOverlap: true }
        },
        yAxis: [
          {
            type: 'value',
            name: this.$t('userManage.legendNew') || 'New',
            position: 'left',
            axisLine: { show: false },
            axisLabel: { color: textColor },
            splitLine: { lineStyle: { color: axisColor, type: 'dashed', opacity: 0.5 } }
          },
          {
            type: 'value',
            name: this.$t('userManage.legendTotal') || 'Total',
            position: 'right',
            axisLine: { show: false },
            axisLabel: { color: textColor },
            splitLine: { show: false }
          }
        ],
        series: [
          {
            name: this.$t('userManage.legendNew') || 'New Users',
            type: 'bar',
            yAxisIndex: 0,
            barMaxWidth: 18,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#667eea' },
                { offset: 1, color: '#764ba2' }
              ]),
              borderRadius: [4, 4, 0, 0]
            },
            data: newSeries
          },
          {
            name: this.$t('userManage.legendTotal') || 'Cumulative',
            type: 'line',
            yAxisIndex: 1,
            smooth: true,
            symbol: 'circle',
            symbolSize: 5,
            lineStyle: { color: '#11998e', width: 2 },
            itemStyle: { color: '#11998e' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(17,153,142,0.35)' },
                { offset: 1, color: 'rgba(17,153,142,0.02)' }
              ])
            },
            data: cumSeries
          }
        ]
      }, true)
    },

    _renderActivityChart () {
      const el = this.$refs.activityChart
      if (!el || !this.userStats) return
      let inst = this._chartInstances.activity
      if (!inst || inst.isDisposed()) {
        inst = echarts.init(el, null, { renderer: 'canvas' })
        this._chartInstances.activity = inst
      }
      const data = this.userStats.activity || []
      const axisColor = this._chartAxisColor()
      const textColor = this._chartTextColor()
      inst.setOption({
        grid: { left: 40, right: 16, top: 20, bottom: 28 },
        tooltip: {
          trigger: 'axis',
          backgroundColor: this._chartTooltipBg(),
          borderColor: axisColor,
          textStyle: { color: textColor }
        },
        xAxis: {
          type: 'category',
          data: data.map(d => (d.date || '').slice(5)),
          axisLine: { lineStyle: { color: axisColor } },
          axisLabel: { color: textColor, fontSize: 11, hideOverlap: true }
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          axisLabel: { color: textColor },
          splitLine: { lineStyle: { color: axisColor, type: 'dashed', opacity: 0.5 } }
        },
        series: [{
          type: 'bar',
          barMaxWidth: 14,
          data: data.map(d => d.active_users || 0),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#f093fb' },
              { offset: 1, color: '#f5576c' }
            ]),
            borderRadius: [4, 4, 0, 0]
          }
        }]
      }, true)
    },

    _handleChartResize () {
      if (!this._chartInstances) return
      Object.values(this._chartInstances).forEach(c => {
        if (c && !c.isDisposed()) c.resize()
      })
    },

    _disposeCharts () {
      if (!this._chartInstances) return
      Object.values(this._chartInstances).forEach(c => {
        if (c && !c.isDisposed()) c.dispose()
      })
      this._chartInstances = null
    },

    formatRelativeTime (timestamp, future = false) {
      if (!timestamp) return ''
      const d = new Date(timestamp)
      if (Number.isNaN(d.getTime())) return ''
      const diffMs = future ? (d.getTime() - Date.now()) : (Date.now() - d.getTime())
      const diffSec = Math.max(0, Math.floor(diffMs / 1000))
      const min = Math.floor(diffSec / 60)
      const hr = Math.floor(min / 60)
      const day = Math.floor(hr / 24)
      const isZh = String(this.$i18n?.locale || '').toLowerCase().startsWith('zh')
      const suffix = future
        ? (isZh ? '后' : ' left')
        : (isZh ? '前' : ' ago')
      if (day > 0) return `${day}${isZh ? '天' : 'd'}${suffix}`
      if (hr > 0) return `${hr}${isZh ? '小时' : 'h'}${suffix}`
      if (min > 0) return `${min}${isZh ? '分' : 'm'}${suffix}`
      return isZh ? '刚刚' : 'just now'
    },

    formatNumber (num) {
      if (!num && num !== 0) return '0'
      return Number(num).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    },

    formatPnl (pnl) {
      if (!pnl && pnl !== 0) return '0'
      const val = Number(pnl)
      const prefix = val >= 0 ? '+' : ''
      return prefix + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    },

    /** Map exchange_id (binance / alpaca / ibkr …) to a human label. */
    formatExchangeName (exchangeId) {
      const id = String(exchangeId || '').trim().toLowerCase()
      if (!id) return '-'
      const i18nKey = `brokerAccounts.${id}.name`
      if (this.$te && this.$te(i18nKey)) {
        return this.$t(i18nKey)
      }
      return getExchangeDisplayName(id)
    },

    truncate (str, maxLen) {
      if (!str) return ''
      return str.length > maxLen ? str.substring(0, maxLen) + '...' : str
    },

    // ==================== User Management ====================
    async loadUsers (retryOnEmptyPage = true) {
      this.loading = true
      try {
        const res = await getUserList(this.buildUserQueryParams())
        if (res.code === 1) {
          const items = res.data.items || []
          const total = res.data.total || 0
          if (
            retryOnEmptyPage &&
            items.length === 0 &&
            total > 0 &&
            this.pagination.current > 1
          ) {
            this.pagination.current = 1
            await this.loadUsers(false)
            return
          }
          this.users = items
          this.pagination.total = total
        } else {
          this.$message.error(res.msg || 'Failed to load users')
        }
      } catch (error) {
        this.$message.error('Failed to load users')
      } finally {
        this.loading = false
      }
    },

    async handleExportUsers () {
      this.exportingUsers = true
      try {
        const blob = await exportUsers(this.buildUserQueryParams())
        const file = blob instanceof Blob ? blob : new Blob([blob], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(file)
        const link = document.createElement('a')
        link.href = url
        link.download = `quantdinger_users_${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        this.$message.success(this.$t('userManage.exportSuccess') || 'Export successful')
      } catch (error) {
        this.$message.error((error && error.message) || (this.$t('userManage.exportFailed') || 'Export failed'))
      } finally {
        this.exportingUsers = false
      }
    },

    handleSearch () {
      this.pagination.current = 1
      this.loadUsers()
    },

    async loadRoles () {
      try {
        const res = await getRoles()
        if (res.code === 1) {
          this.roles = res.data.roles || []
        }
      } catch (error) {
        console.error('Failed to load roles:', error)
      }
    },

    handleTableChange (pagination) {
      this.pagination.current = pagination.current
      this.pagination.pageSize = pagination.pageSize
      this.loadUsers()
    },

    showCreateModal () {
      this.isEdit = false
      this.editingUser = null
      this.modalVisible = true
      this.$nextTick(() => {
        this.form.resetFields()
      })
    },

    showEditModal (record) {
      this.isEdit = true
      this.editingUser = record
      this.modalVisible = true
      this.$nextTick(() => {
        this.form.setFieldsValue({
          username: record.username,
          nickname: record.nickname,
          email: record.email,
          role: record.role,
          status: record.status
        })
      })
    },

    handleModalCancel () {
      this.modalVisible = false
      this.form.resetFields()
    },

    handleModalOk () {
      this.form.validateFields(async (err, values) => {
        if (err) return

        this.modalLoading = true
        try {
          let res
          if (this.isEdit) {
            res = await updateUser(this.editingUser.id, {
              nickname: values.nickname,
              email: values.email,
              role: values.role,
              status: values.status
            })
          } else {
            res = await createUser(values)
          }

          if (res.code === 1) {
            this.$message.success(res.msg || 'Success')
            this.modalVisible = false
            this.form.resetFields()
            this.loadUsers()
          } else {
            this.$message.error(res.msg || 'Operation failed')
          }
        } catch (error) {
          this.$message.error('Operation failed')
        } finally {
          this.modalLoading = false
        }
      })
    },

    async handleDelete (id) {
      try {
        const res = await deleteUser(id)
        if (res.code === 1) {
          this.$message.success(res.msg || 'User deleted')
          this.loadUsers()
        } else {
          this.$message.error(res.msg || 'Delete failed')
        }
      } catch (error) {
        this.$message.error('Delete failed')
      }
    },

    showResetPasswordModal (record) {
      this.resetPasswordUserId = record.id
      this.resetPasswordVisible = true
      this.$nextTick(() => {
        this.resetPasswordForm.resetFields()
      })
    },

    handleResetPassword () {
      this.resetPasswordForm.validateFields(async (err, values) => {
        if (err) return

        this.resetPasswordLoading = true
        try {
          const res = await resetUserPassword({
            user_id: this.resetPasswordUserId,
            new_password: values.new_password
          })
          if (res.code === 1) {
            this.$message.success(res.msg || 'Password reset successfully')
            this.resetPasswordVisible = false
            this.resetPasswordForm.resetFields()
          } else {
            this.$message.error(res.msg || 'Reset failed')
          }
        } catch (error) {
          this.$message.error('Reset failed')
        } finally {
          this.resetPasswordLoading = false
        }
      })
    },

    getRoleColor (role) {
      const colors = {
        admin: 'red',
        manager: 'orange',
        user: 'blue',
        viewer: 'default'
      }
      return colors[role] || 'default'
    },

    getRoleLabel (role) {
      const labels = {
        admin: this.$t('userManage.roleAdmin') || 'Admin',
        manager: this.$t('userManage.roleManager') || 'Manager',
        user: this.$t('userManage.roleUser') || 'User',
        viewer: this.$t('userManage.roleViewer') || 'Viewer'
      }
      return labels[role] || role
    },

    formatTime (timestamp) {
      if (!timestamp) return ''
      const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleString()
    },

    formatCredits (credits) {
      if (!credits && credits !== 0) return '0'
      return Number(credits).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    },

    formatDate (dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString()
    },

    isVipActive (expiresAt) {
      if (!expiresAt) return false
      return new Date(expiresAt) > new Date()
    },

    // Credits Modal
    showCreditsModal (record) {
      this.creditsEditingUser = record
      this.newCredits = parseFloat(record.credits) || 0
      this.creditsRemark = ''
      this.creditsModalVisible = true
    },

    async handleSetCredits () {
      if (this.newCredits < 0) {
        this.$message.error(this.$t('userManage.creditsNonNegative') || 'Credits cannot be negative')
        return
      }

      this.creditsLoading = true
      try {
        const res = await setUserCredits({
          user_id: this.creditsEditingUser.id,
          credits: this.newCredits,
          remark: this.creditsRemark
        })
        if (res.code === 1) {
          this.$message.success(res.msg || 'Credits updated successfully')
          this.creditsModalVisible = false
          this.loadUsers()
        } else {
          this.$message.error(res.msg || 'Update failed')
        }
      } catch (error) {
        this.$message.error('Update failed')
      } finally {
        this.creditsLoading = false
      }
    },

    // VIP Modal
    showVipModal (record) {
      this.vipEditingUser = record
      this.vipDays = 30
      this.vipCustomDate = null
      this.vipRemark = ''
      this.vipModalVisible = true
    },

    async handleSetVip () {
      const data = {
        user_id: this.vipEditingUser.id,
        remark: this.vipRemark
      }

      if (this.vipDays === -1) {
        if (!this.vipCustomDate) {
          this.$message.error(this.$t('userManage.selectDate') || 'Please select a date')
          return
        }
        data.vip_expires_at = this.vipCustomDate.toISOString()
      } else {
        data.vip_days = this.vipDays
      }

      this.vipLoading = true
      try {
        const res = await setUserVip(data)
        if (res.code === 1) {
          this.$message.success(res.msg || 'VIP status updated successfully')
          this.vipModalVisible = false
          this.loadUsers()
        } else {
          this.$message.error(res.msg || 'Update failed')
        }
      } catch (error) {
        this.$message.error('Update failed')
      } finally {
        this.vipLoading = false
      }
    },

    // ==================== Order List ====================
    async loadOrders () {
      this.orderLoading = true
      try {
        const res = await getAdminOrders({
          page: this.orderPagination.current,
          page_size: this.orderPagination.pageSize,
          status: this.orderStatusFilter === 'all' ? '' : this.orderStatusFilter,
          search: this.orderSearchKeyword || ''
        })
        if (res.code === 1) {
          this.orders = res.data.items || []
          this.orderPagination.total = res.data.total || 0
          this.orderSummary = res.data.summary || {}
          this.ordersLoaded = true
        } else {
          this.$message.error(res.msg || 'Failed to load orders')
        }
      } catch (error) {
        console.error('Failed to load orders:', error)
        this.$message.error('Failed to load orders')
      } finally {
        this.orderLoading = false
      }
    },

    handleOrderSearch () {
      this.orderPagination.current = 1
      this.loadOrders()
    },

    handleOrderFilterChange () {
      this.orderPagination.current = 1
      this.loadOrders()
    },

    handleOrderTableChange (pagination) {
      this.orderPagination.current = pagination.current
      this.orderPagination.pageSize = pagination.pageSize
      this.loadOrders()
    },

    // --- Manual confirm (admin rescue tool) --------------------------
    //
    // Only orders that the on-chain reconciler may have legitimately
    // missed are eligible: pending (never matched), paid (matched but
    // confirmation delay glitch), expired (TTL ran out before the
    // watcher caught up). Cancelled is intentionally excluded so a
    // refunded order doesn't get accidentally revived.
    canManualConfirm (status) {
      return ['pending', 'paid', 'expired'].indexOf(String(status || '').toLowerCase()) >= 0
    },

    openManualConfirm (record) {
      this.manualConfirmModal = {
        visible: true,
        submitting: false,
        record,
        txHash: '',
        note: ''
      }
    },

    closeManualConfirm () {
      if (this.manualConfirmModal.submitting) return
      this.manualConfirmModal.visible = false
      this.manualConfirmModal.record = null
      this.manualConfirmModal.txHash = ''
      this.manualConfirmModal.note = ''
    },

    async submitManualConfirm () {
      const m = this.manualConfirmModal
      const order = m.record
      if (!order) return
      const tx = (m.txHash || '').trim()
      if (!tx) {
        this.$message.warning(this.$t('adminOrders.txHashRequired') || 'Tx hash is required')
        return
      }
      // Hard confirm gate — the modal already warns, but granting a
      // membership without the on-chain reconciler is irreversible
      // (the user's VIP dates / bonus credits get rolled), so one
      // more explicit click prevents fat-finger mistakes.
      this.$confirm({
        title: this.$t('adminOrders.manualConfirmFinalTitle') || 'Activate membership now?',
        content: this.$t('adminOrders.manualConfirmFinalDesc') || 'The user will be granted the membership immediately. This cannot be undone via the UI.',
        okText: this.$t('adminOrders.manualConfirmOk') || 'Confirm & grant',
        cancelText: this.$t('common.cancel') || 'Cancel',
        okType: 'danger',
        onOk: async () => {
          m.submitting = true
          try {
            const res = await manualConfirmOrder(order.id, { tx_hash: tx, note: m.note || '' })
            if (res && res.code === 1) {
              this.$message.success(this.$t('adminOrders.manualConfirmSuccess') || 'Order confirmed and membership granted')
              this.manualConfirmModal.visible = false
              this.manualConfirmModal.record = null
              this.manualConfirmModal.txHash = ''
              this.manualConfirmModal.note = ''
              this.loadOrders()
            } else {
              const msg = (res && res.msg) || (this.$t('adminOrders.manualConfirmFailed') || 'Failed to confirm order')
              this.$message.error(msg)
            }
          } catch (e) {
            const apiMsg = e && e.response && e.response.data && e.response.data.msg
            this.$message.error(apiMsg || (this.$t('adminOrders.manualConfirmFailed') || 'Failed to confirm order'))
          } finally {
            m.submitting = false
          }
        }
      })
    },

    getOrderStatusColor (status) {
      const colors = {
        paid: 'green',
        confirmed: 'green',
        pending: 'orange',
        expired: 'grey', // 改为灰色，确保文字可见
        cancelled: 'default',
        failed: 'red'
      }
      return colors[status] || 'default'
    },

    getOrderStatusLabel (status) {
      const labels = {
        paid: this.$t('adminOrders.statusPaid') || 'Paid',
        confirmed: this.$t('adminOrders.statusConfirmed') || 'Confirmed',
        pending: this.$t('adminOrders.statusPending') || 'Pending',
        expired: this.$t('adminOrders.statusExpired') || 'Expired',
        cancelled: this.$t('adminOrders.statusCancelled') || 'Cancelled',
        failed: this.$t('adminOrders.statusFailed') || 'Failed'
      }
      return labels[status] || status
    },

    // ==================== AI Analysis Stats ====================
    async loadAiStats () {
      this.aiStatsLoading = true
      try {
        const res = await getAdminAiStats({
          page: this.aiStatsPagination.current,
          page_size: this.aiStatsPagination.pageSize,
          search: this.aiStatsSearchKeyword || ''
        })
        if (res.code === 1) {
          this.aiUserStats = res.data.user_stats || []
          this.aiRecentRecords = res.data.recent || []
          this.aiStatsPagination.total = res.data.user_total || 0
          this.aiStatsSummary = res.data.summary || {}
          this.aiStatsLoaded = true
        } else {
          this.$message.error(res.msg || 'Failed to load AI stats')
        }
      } catch (error) {
        console.error('Failed to load AI stats:', error)
        this.$message.error('Failed to load AI stats')
      } finally {
        this.aiStatsLoading = false
      }
    },

    handleAiStatsSearch () {
      this.aiStatsPagination.current = 1
      this.loadAiStats()
    },

    handleAiStatsTableChange (pagination) {
      this.aiStatsPagination.current = pagination.current
      this.aiStatsPagination.pageSize = pagination.pageSize
      this.loadAiStats()
    }
  }
}
</script>

<style lang="less" scoped>
@primary-color: #1890ff;

.user-manage-page {
  padding: 24px;
  min-height: calc(100vh - 120px);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);

  .page-header {
    margin-bottom: 24px;

    .page-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #1e3a5f;
      display: flex;
      align-items: center;
      gap: 12px;

      .anticon {
        font-size: 28px;
        color: @primary-color;
      }
    }

    .page-desc {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }
  }

  .manage-tabs {
    ::v-deep .ant-tabs-bar {
      margin-bottom: 20px;
    }
  }

  // Summary Cards
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;

    .summary-card {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      }

      .summary-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .anticon {
          font-size: 22px;
          color: #fff;
        }
      }

      .summary-info {
        flex: 1;
        min-width: 0;

        .summary-value {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.3;

          .roi-badge {
            font-size: 13px;
            font-weight: 600;
            margin-left: 6px;
            padding: 1px 6px;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.04);
          }
        }

        .summary-sub {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .summary-label {
          font-size: 13px;
          color: #94a3b8;
          margin-top: 2px;
        }
      }
    }
  }

  .toolbar {
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;

    .toolbar-left {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .toolbar-right {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      min-width: 0;
    }
  }

  .toolbar-search {
    width: 280px;
    max-width: 100%;
  }

  .toolbar-id-input {
    width: 120px;
    max-width: 100%;
  }

  .toolbar-filters {
    justify-content: flex-end;
  }

  .active-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: -4px 0 12px;
    padding: 8px 12px;
    background: rgba(24, 144, 255, 0.06);
    border: 1px solid rgba(24, 144, 255, 0.15);
    border-radius: 8px;

    .active-filters-label {
      font-size: 12px;
      color: #64748b;
      margin-right: 4px;
    }
  }

  .id-cell {
    display: inline-flex;
    align-items: center;
    gap: 2px;

    .mono-id {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
    }

    .id-copy-btn {
      padding: 0 4px;
      height: 22px;
    }
  }

  .link-id-btn {
    padding: 0;
    height: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
  }

  .toolbar-select {
    width: 140px;
    max-width: 100%;
  }

  .section-card-title {
    margin-bottom: 12px;
    color: #1e3a5f;
    font-weight: 600;
    font-size: 15px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    line-height: 1.4;
  }

  .section-card-title-icon {
    flex-shrink: 0;
  }

  .user-table-card {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    min-width: 0;
    overflow: hidden;

    ::v-deep .ant-card-body {
      padding: 20px 24px;
    }

    .text-muted {
      color: #94a3b8;
    }
  }

  .email-col-title {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .email-toggle-btn {
    padding: 0 4px !important;
    height: 22px;
    line-height: 22px;

    .anticon {
      font-size: 14px;
    }
  }

  .email-masked {
    color: #8c8c8c;
    font-family: ui-monospace, 'Cascadia Mono', 'Source Han Sans SC', monospace;
    letter-spacing: 0.5px;
  }

  // PnL colors
  .text-profit {
    color: #52c41a;
    font-weight: 600;
  }

  .text-loss {
    color: #ff4d4f;
    font-weight: 600;
  }

  .pnl-value {
    font-size: 14px;
  }

  .roi-text {
    font-size: 12px;
    margin-left: 4px;
  }

  .pnl-detail {
    font-size: 11px;
    margin-top: 2px;
  }

  .symbol-text {
    font-weight: 500;
  }

  .symbol-count {
    font-size: 11px;
    margin-top: 2px;
  }

  // Status cell
  .status-cell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;

    .status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;

      &.dot-running {
        background: #52c41a;
        box-shadow: 0 0 6px rgba(82, 196, 26, 0.5);
        animation: pulse-green 2s infinite;
      }

      &.dot-stopped {
        background: #d9d9d9;
      }
    }

    .status-running {
      color: #52c41a;
      font-weight: 500;
      font-size: 13px;
    }

    .status-stopped {
      color: #999;
      font-size: 13px;
    }
  }

  @keyframes pulse-green {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  // User cell
  .user-cell {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    cursor: default;

    .user-name {
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 80px;
    }
  }

  .indicator-name {
    color: #722ed1;
    font-size: 12px;
  }

  .exchange-name {
    font-size: 12px;
    text-transform: capitalize;
  }

  // Order address & hash styles
  .address-text,
  .hash-text {
    font-family: 'Roboto Mono', 'Courier New', monospace;
    font-size: 12px;
    color: #1890ff;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  // Order status tag styles - ensure expired status is visible
  ::v-deep .ant-tag {
    &.ant-tag-grey {
      background-color: #f5f5f5;
      border-color: #d9d9d9;
      color: #595959;
    }
  }

  // Dark theme
  &.theme-dark {
    background: linear-gradient(180deg, #141414 0%, #1c1c1c 100%);

    .page-header {
      .page-title {
        color: #e0e6ed;
      }
      .page-desc {
        color: #8b949e;
      }
    }

    .manage-tabs {
      ::v-deep .ant-tabs-bar {
        border-bottom-color: #2a2a2a;
      }
      ::v-deep .ant-tabs-tab {
        color: #8b949e;
        &:hover {
          color: #c9d1d9;
        }
      }
      ::v-deep .ant-tabs-tab-active {
        color: @primary-color;
      }
    }

    .summary-cards .summary-card {
      background: #1c1c1c;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);

      .summary-info {
        .summary-value {
          color: #e0e6ed;

          .roi-badge {
            background: rgba(255, 255, 255, 0.08);
          }
        }
        .summary-sub {
          color: #8b949e;
        }
        .summary-label {
          color: #6e7681;
        }
      }
    }

    .user-table-card {
      background: #1c1c1c;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

      ::v-deep .ant-card-body {
        background: #1c1c1c;
      }

      ::v-deep .ant-table {
        background: #1c1c1c;
        color: #c9d1d9;

        .ant-table-thead > tr > th {
          background: #252525;
          color: #e0e6ed;
          border-bottom-color: #2a2a2a;
        }

        .ant-table-tbody > tr > td {
          border-bottom-color: #2a2a2a;
        }

        .ant-table-tbody > tr:hover > td {
          background: #252525;
        }

        .ant-table-fixed-left .ant-table-thead > tr > th,
        .ant-table-fixed-right .ant-table-thead > tr > th {
          background: #252525 !important;
        }

        .ant-table-fixed-left .ant-table-tbody > tr > td,
        .ant-table-fixed-right .ant-table-tbody > tr > td {
          background: #1c1c1c;
        }

        .ant-table-fixed-left .ant-table-tbody > tr:hover > td,
        .ant-table-fixed-right .ant-table-tbody > tr:hover > td {
          background: #252525;
        }
      }

      .text-muted {
        color: #6e7681;
      }

      h4 {
        color: #e0e6ed !important;
      }
    }

    .section-card-title {
      color: #e0e6ed;
    }

    // Charts grid in dark theme
    .charts-grid {
      .chart-card {
        background: #1c1c1c;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

        ::v-deep .ant-card-body {
          background: #1c1c1c;
        }
      }

      .chart-card-hint {
        color: #6e7681;
      }

      .chart-empty-hint {
        color: #6e7681;
      }

      .recent-list .recent-row {
        border-bottom-color: #2a2a2a;

        .recent-meta {
          .recent-name { color: #e0e6ed; }
          .recent-sub  { color: #6e7681; }
        }
        .recent-time { color: #6e7681; }
      }
    }

    .summary-cards.user-kpi-cards {
      .summary-card .summary-info .summary-value .delta {
        &.delta-up   { background: rgba(82, 196, 26, 0.2);  color: #73d13d; }
        &.delta-down { background: rgba(255, 77, 79, 0.2);  color: #ff7875; }
        &.delta-flat { background: rgba(255, 255, 255, 0.08); color: #c9d1d9; }
      }
    }
  }

  // Credits value style
  .credits-value {
    font-weight: 600;
    color: #722ed1;
  }

  // Current info styles
  .current-credits-info,
  .current-vip-info {
    margin-bottom: 16px;
    padding: 12px 16px;
    background: #f5f5f5;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;

    .label {
      color: #666;
    }

    .value {
      font-weight: 600;
      color: #1890ff;
      font-size: 18px;

      &.active {
        color: #52c41a;
      }

      &.expired {
        color: #999;
      }
    }
  }

  // ---- User-mgmt KPI block (6 cards, 3-col on wide screens) ----
  .summary-cards.user-kpi-cards {
    grid-template-columns: repeat(3, 1fr);

    .summary-card .summary-info .summary-value {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 6px;

      .delta {
        font-size: 11px;
        font-weight: 600;
        padding: 1px 6px;
        border-radius: 999px;
        line-height: 1.4;

        &.delta-up    { background: rgba(82, 196, 26, 0.15);  color: #389e0d; }
        &.delta-down  { background: rgba(255, 77, 79, 0.15);  color: #cf1322; }
        &.delta-flat  { background: rgba(0, 0, 0, 0.05);      color: #595959; }
      }
    }

    .summary-card .summary-info .summary-sub.sub-warn {
      color: #d48806;
      font-weight: 500;
    }

    .kpi-skeleton {
      display: block;
      padding: 18px 20px;
    }
  }

  // ---- Charts grid: 6 panels, responsive ----
  // Layout intent:
  //   * Growth chart spans 2 columns (it's the headline trend).
  //   * The other 5 cards fall into a normal 2-col grid below.
  // Using auto-fit instead of fixed columns means the layout degrades
  // gracefully on narrow viewports without extra media queries.
  .charts-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 20px;

    .chart-card {
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      background: #fff;
      overflow: hidden;
      min-width: 0;
      width: 100%;
      display: flex;
      flex-direction: column;

      ::v-deep .ant-card-body {
        padding: 16px 18px;
        flex: 1;
        display: flex;
        flex-direction: column;
      }
    }

    .chart-card-wide {
      grid-column: 1 / -1;
    }

    .chart-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
      flex-wrap: wrap;

      .section-card-title {
        margin-bottom: 0;
      }
    }

    .chart-card-hint {
      font-size: 12px;
      color: #94a3b8;
      white-space: nowrap;
    }

    .chart-canvas {
      width: 100%;
      height: 240px;
      min-height: 240px;
    }

    .chart-canvas-tall {
      height: 280px;
      min-height: 280px;
    }

    .chart-empty-hint {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #94a3b8;
      font-size: 13px;
      padding: 32px 12px;
      min-height: 200px;
      text-align: center;
    }
    .chart-empty-hint-soft {
      color: #52c41a;
    }

    .recent-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 240px;
      overflow-y: auto;
      padding-right: 4px;

      .recent-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 0;
        border-bottom: 1px dashed rgba(0, 0, 0, 0.06);

        &:last-child {
          border-bottom: none;
        }

        .recent-meta {
          flex: 1;
          min-width: 0;

          .recent-name {
            font-size: 13px;
            font-weight: 600;
            color: #1e3a5f;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .recent-sub {
            font-size: 11px;
            color: #94a3b8;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .recent-time {
          font-size: 11px;
          color: #94a3b8;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .recent-time-warn {
          color: #d48806;
          font-weight: 600;
        }
      }
    }
  }

  // Strict 2-column override for the slim "growth + DAU" row. The base
  // `.charts-grid` rule already targets `repeat(2, minmax(0, 1fr))`, but a
  // parent component or theme wrapper occasionally narrows the grid via a
  // sibling rule on the page — `!important` here pins the layout so the two
  // charts always render side-by-side regardless of the cascade order.
  .charts-grid.charts-grid-2col {
    grid-template-columns: 1fr 1fr !important;

    .chart-card {
      grid-column: auto !important;
    }
  }

  @media (max-width: 1200px) {
    .summary-cards {
      grid-template-columns: repeat(2, 1fr);
    }
    .summary-cards.user-kpi-cards {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    padding: 16px 12px;
    min-height: calc(100vh - 100px);

    .charts-grid {
      grid-template-columns: 1fr;

      .chart-card-wide {
        grid-column: auto;
      }

      .chart-canvas,
      .chart-canvas-tall {
        height: 220px;
      }
    }

    .summary-cards.user-kpi-cards {
      grid-template-columns: 1fr;
    }

    .page-header {
      margin-bottom: 16px;

      .page-title {
        font-size: 20px;

        .anticon {
          font-size: 22px;
        }
      }

      .page-desc {
        font-size: 13px;
      }
    }

    .summary-cards {
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 16px;

      .summary-card {
        padding: 14px 16px;
        gap: 12px;

        .summary-icon {
          width: 44px;
          height: 44px;

          .anticon {
            font-size: 20px;
          }
        }

        .summary-info .summary-value {
          font-size: 18px;
        }
      }
    }

    .toolbar {
      flex-direction: column;
      align-items: stretch;

      .toolbar-left,
      .toolbar-right {
        width: 100%;
      }
    }

    .toolbar-search,
    .toolbar-select {
      width: 100% !important;
    }

    .manage-tabs {
      ::v-deep .ant-tabs-bar {
        margin-bottom: 12px;
      }

      ::v-deep .ant-tabs-nav-container {
        overflow-x: auto;
        overflow-y: hidden;
      }

      ::v-deep .ant-tabs-nav-wrap {
        margin-bottom: 0;
      }

      ::v-deep .ant-tabs-tab {
        padding: 10px 12px;
        margin-right: 4px;
        font-size: 13px;
        white-space: nowrap;
      }
    }

    .user-table-card ::v-deep .ant-card-body {
      padding: 12px 10px;
    }

    ::v-deep .ant-table {
      font-size: 12px;
    }

    ::v-deep .ant-table-thead > tr > th,
    ::v-deep .ant-table-tbody > tr > td {
      padding: 8px 6px;
    }

    ::v-deep .ant-pagination {
      margin: 12px 0 0;
    }
  }

  @media (max-width: 480px) {
    padding: 12px 8px;

    .page-header .page-title {
      font-size: 18px;
    }

    .toolbar .toolbar-left {
      flex-direction: column;

      .ant-btn {
        width: 100%;
      }
    }

    .summary-cards .summary-card .summary-sub {
      white-space: normal;
      line-height: 1.35;
    }

    ::v-deep .ant-pagination-options {
      display: none;
    }
  }
}

/* ---- Manual confirm (admin rescue) -------------------------------- */
.manual-confirm-btn {
  padding: 0 4px;
  color: #d4380d;
  &:hover { color: #fa541c; }
}

.manual-tag {
  font-weight: 500;
  cursor: help;
}

/* Summary block inside the manual-confirm modal. */
.mc-summary {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px 14px;
  font-size: 13px;

  .mc-row {
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.9;
    word-break: break-all;

    &.mc-row-mono { align-items: flex-start; }
  }

  .mc-label {
    color: rgba(0, 0, 0, 0.55);
    min-width: 64px;
    flex-shrink: 0;
  }

  .mc-amount { font-weight: 700; color: #d4380d; }
  .mc-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace; font-size: 12px; color: rgba(0, 0, 0, 0.78); }
}

.theme-dark .mc-summary {
  background: #141414;
  border-color: #303030;
  .mc-label { color: rgba(255, 255, 255, 0.55); }
  .mc-amount { color: #ff7875; }
  .mc-mono { color: rgba(255, 255, 255, 0.78); }
}
</style>

<style lang="less">
.user-manage-modal-dark {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body,
  .ant-modal-footer {
    background: #1c1c1c;
  }

  .ant-modal-header {
    border-bottom-color: #2a2a2a;
  }

  .ant-modal-title {
    color: #e0e6ed;
  }

  .ant-modal-close {
    color: rgba(255, 255, 255, 0.55);
  }

  .ant-modal-footer {
    border-top-color: #2a2a2a;
  }

  .ant-form-item-label > label,
  .current-credits-info .label,
  .current-vip-info .label {
    color: #c9d1d9;
  }

  .ant-input,
  .ant-input-password,
  .ant-input-affix-wrapper,
  .ant-select-selection,
  .ant-calendar-picker-input {
    background: #141414 !important;
    border-color: #303030 !important;
    color: #e0e6ed !important;
  }

  .ant-input::placeholder,
  .ant-input-password input::placeholder {
    color: #6e7681;
  }

  .ant-input-prefix,
  .ant-input-affix-wrapper .ant-input-prefix,
  .ant-input-password-icon,
  .ant-input-password .anticon,
  .ant-calendar-picker-icon,
  .anticon {
    color: rgba(255, 255, 255, 0.55);
  }

  .current-credits-info,
  .current-vip-info {
    background: #141414;
  }
}

@media (max-width: 576px) {
  .user-manage-modal .ant-modal {
    max-width: calc(100vw - 16px) !important;
    margin: 8px auto;
    padding-bottom: 0;
    top: 8px;
  }

  .user-manage-modal .ant-modal-content {
    border-radius: 10px;
  }

  .user-manage-modal .ant-modal-body {
    max-height: calc(100vh - 180px);
    overflow-y: auto;
    padding: 16px;
  }

  .user-manage-modal .ant-modal-header {
    padding: 12px 16px;
  }

  .user-manage-modal .ant-modal-footer {
    padding: 10px 16px;
  }
}
</style>
