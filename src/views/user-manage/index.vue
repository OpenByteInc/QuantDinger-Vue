<template>
  <div class="user-manage-page qd-workspace-page qd-page-frame" :class="{ 'theme-dark': isDarkTheme }">
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
              <div class="summary-icon summary-icon-primary">
                <a-icon type="team" />
              </div>
              <div class="summary-info">
                <div class="summary-value">{{ formatNumber(userStats.summary.total) }}</div>
                <div class="summary-label">{{ $t('userManage.kpiTotal') || 'Total Members' }}</div>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon summary-icon-primary">
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
              <div class="summary-icon summary-icon-primary">
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
              <div class="summary-icon summary-icon-primary">
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
              <div class="summary-icon summary-icon-warning">
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
              <div class="summary-icon summary-icon-neutral">
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
            <a-divider type="vertical" class="toolbar-divider" />
            <span v-if="selectedUserRowKeys.length" class="batch-selected-count">
              {{ selectedCountText }}
            </span>
            <a-popconfirm
              :title="batchBanConfirmText"
              :ok-text="$t('userManage.batchBan') || 'Batch ban'"
              :cancel-text="$t('common.cancel') || 'Cancel'"
              placement="bottomLeft"
              @confirm="handleBatchBanUsers"
            >
              <a-button
                type="danger"
                :disabled="!batchBannableUsers.length"
                :loading="batchBanLoading"
              >
                <a-icon type="stop" />
                {{ $t('userManage.batchBan') || 'Batch ban' }}
              </a-button>
            </a-popconfirm>
            <a-button v-if="selectedUserRowKeys.length" @click="clearSelectedUsers">
              {{ $t('userManage.clearSelection') || 'Clear selection' }}
            </a-button>
          </div>
          <div class="toolbar-right toolbar-filters">
            <a-select
              v-model="userRoleFilter"
              class="toolbar-filter-select"
              :placeholder="$t('userManage.filterRole')"
              allowClear
              @change="handleUserFilterChange"
            >
              <a-select-option v-for="role in roles" :key="role.id" :value="role.id">
                {{ getRoleLabel(role.id) }}
              </a-select-option>
            </a-select>
            <a-select
              v-model="userStatusFilter"
              class="toolbar-filter-select"
              :placeholder="$t('userManage.filterStatus')"
              allowClear
              @change="handleUserFilterChange"
            >
              <a-select-option value="active">{{ $t('userManage.active') }}</a-select-option>
              <a-select-option value="disabled">{{ $t('userManage.disabled') }}</a-select-option>
            </a-select>
            <a-select
              v-model="userVipFilter"
              class="toolbar-filter-select"
              :placeholder="$t('userManage.filterVip')"
              allowClear
              @change="handleUserFilterChange"
            >
              <a-select-option value="active">{{ $t('userManage.vipActive') }}</a-select-option>
              <a-select-option value="inactive">{{ $t('userManage.vipInactive') }}</a-select-option>
            </a-select>
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
          <a-tag v-if="userRoleFilter" closable @close="clearUserRoleFilter">
            {{ $t('userManage.role') }}: {{ getRoleLabel(userRoleFilter) }}
          </a-tag>
          <a-tag v-if="userStatusFilter" closable @close="clearUserStatusFilter">
            {{ $t('userManage.status') }}: {{ userStatusFilter === 'active' ? $t('userManage.active') : $t('userManage.disabled') }}
          </a-tag>
          <a-tag v-if="userVipFilter" closable @close="clearUserVipFilter">
            {{ $t('userManage.filterVip') }}: {{ userVipFilter === 'active' ? $t('userManage.vipActive') : $t('userManage.vipInactive') }}
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
            :rowSelection="userRowSelection"
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
                    <a-icon type="bar-chart" style="color: var(--primary-color, #1890ff)" />
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
        <section class="strategy-contract-banner">
          <div class="strategy-contract-copy">
            <span class="strategy-contract-icon"><a-icon type="deployment-unit" /></span>
            <div>
              <div class="strategy-contract-title">{{ $t('systemOverview.contractTitle') }}</div>
              <p>{{ $t('systemOverview.contractDesc') }}</p>
            </div>
          </div>
          <div class="strategy-contract-status">
            <a-tag color="green">Strategy API V2</a-tag>
            <span>{{ $t('systemOverview.contractReady') }} <strong>{{ strategySummary ? strategySummary.contract_ready_strategies || 0 : 0 }}</strong></span>
            <span v-if="strategySummary && strategySummary.legacy_strategies">
              {{ $t('systemOverview.legacyRecords') }} <strong>{{ strategySummary.legacy_strategies }}</strong>
            </span>
          </div>
        </section>

        <!-- Summary Cards -->
        <div class="summary-cards" v-if="strategySummary">
          <div class="summary-card">
            <div class="summary-icon summary-icon-v2">
              <a-icon type="code" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ strategySummary.v2_strategies || 0 }}</div>
              <div class="summary-sub strategy-class-breakdown">
                <span>{{ $t('systemOverview.cta') }} {{ strategySummary.cta_strategies || 0 }}</span>
                <span>{{ $t('systemOverview.portfolio') }} {{ strategySummary.portfolio_strategies || 0 }}</span>
                <span>{{ $t('systemOverview.robot') }} {{ strategySummary.robot_strategies || 0 }}</span>
              </div>
              <div class="summary-label">{{ $t('systemOverview.v2Deployments') }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon summary-icon-running">
              <a-icon type="play-circle" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ strategySummary.running_strategies || 0 }}</div>
              <div class="summary-sub">
                {{ $t('systemOverview.live') }}: {{ strategySummary.running_live_strategies || 0 }}
                /
                {{ $t('systemOverview.signal') }}: {{ strategySummary.running_signal_strategies || 0 }}
              </div>
              <div class="summary-label">{{ $t('systemOverview.runningStrategies') }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon summary-icon-capital">
              <a-icon type="bank" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ formatNumber(strategySummary.live_capital) }}</div>
              <div class="summary-sub">
                {{ $t('systemOverview.live') }}: {{ strategySummary.live_strategies || 0 }}
                · {{ $t('systemOverview.signalCapitalExcluded') }}
              </div>
              <div class="summary-label">{{ $t('systemOverview.liveCapital') }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon" :class="(strategySummary.live_pnl || 0) >= 0 ? 'summary-icon-profit' : 'summary-icon-loss'">
              <a-icon type="rise" />
            </div>
            <div class="summary-info">
              <div class="summary-value" :class="(strategySummary.live_pnl || 0) >= 0 ? 'text-profit' : 'text-loss'">
                {{ formatPnl(strategySummary.live_pnl) }}
                <span class="roi-badge">{{ strategySummary.live_roi || 0 }}%</span>
              </div>
              <div class="summary-sub">
                {{ $t('systemOverview.livePnlDesc') }}
                · {{ $t('systemOverview.virtualPnl') }} {{ formatPnl(strategySummary.signal_pnl) }}
              </div>
              <div class="summary-label">{{ $t('systemOverview.livePnl') }}</div>
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
            <a-select v-model="strategyClassFilter" class="toolbar-select" @change="handleStrategyClassFilterChange">
              <a-select-option value="all">{{ $t('systemOverview.filterClassAll') }}</a-select-option>
              <a-select-option value="cta">{{ $t('systemOverview.cta') }}</a-select-option>
              <a-select-option value="portfolio">{{ $t('systemOverview.portfolio') }}</a-select-option>
              <a-select-option value="robot">{{ $t('systemOverview.robot') }}</a-select-option>
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
          <a-tag v-if="strategyClassFilter !== 'all'" closable @close="clearStrategyClassFilter">
            {{ $t('systemOverview.colStrategyClass') }}: {{ $t(`systemOverview.${strategyClassFilter}`) }}
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
            :scroll="{ x: 1880 }"
            @change="handleStrategyTableChange"
          >
            <!-- Strategy ID -->
            <template slot="strategyId" slot-scope="text">
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

            <template slot="strategySourceInfo" slot-scope="text, record">
              <div class="strategy-source-cell">
                <a-tooltip :title="record.strategy_name || record.source_name || '-'">
                  <strong>{{ record.strategy_name || record.source_name || '-' }}</strong>
                </a-tooltip>
                <div class="strategy-source-meta">
                  <a-tag :color="record.contract_ready ? 'green' : 'orange'">
                    {{ record.contract_ready ? $t('systemOverview.contractV2') : $t('systemOverview.contractIncomplete') }}
                  </a-tag>
                  <button v-if="record.source_id" type="button" class="source-id-link" @click="copyText(record.source_id)">
                    {{ $t('systemOverview.sourceId') }} #{{ record.source_id }}
                  </button>
                </div>
              </div>
            </template>

            <template slot="strategyClassInfo" slot-scope="text">
              <a-tag :color="strategyClassColor(text)">{{ $t(`systemOverview.${text || 'cta'}`) }}</a-tag>
            </template>

            <!-- Symbol Column -->
            <template slot="symbolInfo" slot-scope="text, record">
              <div class="universe-cell">
                <strong>{{ formatStrategyUniverse(record) }}</strong>
                <span>
                  {{ formatStrategyMarket(record) }}
                  <template v-if="record.primary_frequency"> · {{ record.primary_frequency }}</template>
                </span>
              </div>
            </template>

            <!-- Capital Column -->
            <template slot="capitalInfo" slot-scope="text, record">
              <div class="ledger-value-cell">
                <span>{{ formatNumber(text) }}</span>
                <small v-if="record.ledger_mode === 'virtual'" class="virtual-ledger-label">
                  {{ $t('systemOverview.virtualAccount') }}
                </small>
              </div>
            </template>

            <!-- Execution mode -->
            <template slot="executionModeInfo" slot-scope="text, record">
              <a-tag v-if="text === 'live'" color="green" size="small">{{ $t('systemOverview.live') || 'Live' }}</a-tag>
              <div v-else-if="text === 'signal'" class="execution-mode-stack">
                <a-tag color="blue" size="small">{{ $t('systemOverview.signal') || 'Signal' }}</a-tag>
                <small v-if="record.ledger_mode === 'virtual'" class="virtual-ledger-label">
                  {{ $t('systemOverview.virtualLedger') }}
                </small>
              </div>
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

            <template slot="runtimeInfo" slot-scope="text, record">
              <div class="runtime-cell">
                <span><a-icon type="pie-chart" /> {{ $t('systemOverview.positionsShort') }} {{ record.position_count || 0 }}</span>
                <span><a-icon type="swap" /> {{ $t('systemOverview.tradesShort') }} {{ record.trade_count || 0 }}</span>
                <small v-if="record.ledger_mode === 'virtual'" class="virtual-ledger-label">
                  {{ $t('systemOverview.virtualLedger') }}
                </small>
              </div>
            </template>

            <template slot="activityInfo" slot-scope="text, record">
              <div class="activity-cell">
                <span>{{ formatTime(record.updated_at) }}</span>
                <small v-if="record.schedule_count"><a-icon type="clock-circle" /> {{ $t('systemOverview.schedules') }} {{ record.schedule_count }}</small>
                <small v-else>{{ $t('systemOverview.eventDriven') }}</small>
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
                <a-tooltip :title="$t('common.delete') || 'Delete'">
                  <a-button
                    type="link"
                    size="small"
                    class="danger-link"
                    :loading="strategyDeletingId === record.id"
                    @click.stop="handleStrategyDelete(record)"
                  >
                    <a-icon type="delete" />
                  </a-button>
                </a-tooltip>
              </a-space>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>

      <!-- Tab 3: Order List -->
      <a-tab-pane v-if="billingEnabled" key="orders" :tab="$t('adminOrders.tabTitle') || 'Order List'">
        <!-- Order Summary Cards -->
        <div class="summary-cards" v-if="orderSummary">
          <div class="summary-card">
            <div class="summary-icon summary-icon-primary">
              <a-icon type="file-text" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ orderSummary.total_orders || 0 }}</div>
              <div class="summary-label">{{ $t('adminOrders.totalOrders') || 'Total Orders' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon summary-icon-success">
              <a-icon type="check-circle" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ orderSummary.paid_orders || 0 }}</div>
              <div class="summary-label">{{ $t('adminOrders.paidOrders') || 'Paid' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon summary-icon-warning">
              <a-icon type="clock-circle" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ orderSummary.pending_orders || 0 }}</div>
              <div class="summary-label">{{ $t('adminOrders.pendingOrders') || 'Pending' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon summary-icon-primary">
              <a-icon type="dollar" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ formatNumber(orderSummary.total_revenue) }} <span style="font-size: 13px; color: #999;">{{ orderSummary.revenue_currency || 'USD' }}</span></div>
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
              <a-select-option value="failed">{{ $t('adminOrders.filterFailed') || 'Failed' }}</a-select-option>
              <a-select-option value="cancelled">{{ $t('adminOrders.filterCancelled') || 'Cancelled' }}</a-select-option>
            </a-select>
            <a-select v-model="orderPaymentFilter" class="toolbar-select" @change="handleOrderFilterChange">
              <a-select-option value="all">{{ $t('adminOrders.filterPaymentAll') || 'All payment methods' }}</a-select-option>
              <a-select-option value="usdt">USDT</a-select-option>
              <a-select-option value="usdc">USDC</a-select-option>
              <a-select-option value="stripe">{{ $t('adminOrders.methodStripe') || 'Card (Stripe)' }}</a-select-option>
            </a-select>
            <a-select v-model="orderPlanFilter" class="toolbar-select" @change="handleOrderFilterChange">
              <a-select-option value="all">{{ $t('adminOrders.filterPlanAll') || 'All plans' }}</a-select-option>
              <a-select-option v-for="plan in orderFilterOptions.plans" :key="plan.code" :value="plan.code">
                {{ plan.name || plan.code }}
              </a-select-option>
            </a-select>
            <a-button v-if="hasActiveOrderFilters" @click="resetOrderFilters">
              <a-icon type="undo" />
              {{ $t('adminOrders.resetFilters') || 'Reset' }}
            </a-button>
          </div>
          <div class="toolbar-right">
            <a-input-search
              v-model="orderSearchKeyword"
              class="toolbar-search"
              :placeholder="$t('adminOrders.searchPlaceholderExtended') || 'User, email, order no. or payment reference'"
              allowClear
              @change="handleOrderSearchChange"
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

            <!-- Payment Method Column -->
            <template slot="orderTypeInfo" slot-scope="text">
              <a-tag :color="getPaymentMethodColor(text)" class="payment-method-tag">
                <a-icon :type="text === 'stripe' ? 'credit-card' : 'wallet'" />
                {{ getPaymentMethodLabel(text) }}
              </a-tag>
            </template>

            <!-- Plan Column -->
            <template slot="planInfo" slot-scope="text, record">
              <a-tag :color="getOrderPlanColor(text)">
                {{ record.plan_name || getOrderPlanLabel(text) }}
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

            <!-- Payment Reference Column -->
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
              <template v-if="canManualConfirm(record)">
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
          :title="$t('adminOrders.manualConfirmTitle') || 'Manual confirm on-chain order'"
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
            <div class="mc-row"><span class="mc-label">{{ $t('adminOrders.colAmount') || 'Amount' }}:</span><span class="mc-amount">{{ manualConfirmModal.record.amount }} {{ manualConfirmModal.record.currency }}</span></div>
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

      <a-tab-pane v-if="billingEnabled" key="rewardWithdrawals" :tab="$t('adminReferralWithdrawals.tabTitle')">
        <div class="summary-cards" v-if="rewardWithdrawalSummary">
          <div class="summary-card">
            <div class="summary-icon summary-icon-primary">
              <a-icon type="file-text" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ rewardWithdrawalSummary.total_requests || 0 }}</div>
              <div class="summary-label">{{ $t('adminReferralWithdrawals.summary.total') }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon summary-icon-warning">
              <a-icon type="clock-circle" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ rewardWithdrawalSummary.pending_requests || 0 }}</div>
              <div class="summary-label">{{ $t('adminReferralWithdrawals.summary.pending') }}</div>
              <div class="summary-sub">{{ formatNumber(rewardWithdrawalSummary.pending_amount) }} USD {{ $t('adminReferralWithdrawals.summary.awaiting') }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon summary-icon-primary">
              <a-icon type="sync" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ rewardWithdrawalSummary.processing_requests || 0 }}</div>
              <div class="summary-label">{{ $t('adminReferralWithdrawals.summary.processing') }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon summary-icon-success">
              <a-icon type="check-circle" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ formatNumber(rewardWithdrawalSummary.paid_amount) }} <span class="summary-currency">USD</span></div>
              <div class="summary-label">{{ $t('adminReferralWithdrawals.summary.paidAmount') }}</div>
              <div class="summary-sub">{{ $t('adminReferralWithdrawals.summary.paidRequests', { count: rewardWithdrawalSummary.paid_requests || 0 }) }}</div>
            </div>
          </div>
        </div>

        <div class="toolbar reward-withdrawal-toolbar">
          <div class="toolbar-left">
            <a-button :loading="rewardWithdrawalLoading" @click="loadRewardWithdrawals">
              <a-icon type="reload" />
              {{ $t('common.refresh') }}
            </a-button>
            <a-select v-model="rewardWithdrawalStatus" class="toolbar-select" @change="handleRewardWithdrawalFilterChange">
              <a-select-option value="all">{{ $t('adminReferralWithdrawals.filterAll') }}</a-select-option>
              <a-select-option value="pending">{{ $t('adminReferralWithdrawals.status.pending') }}</a-select-option>
              <a-select-option value="processing">{{ $t('adminReferralWithdrawals.status.processing') }}</a-select-option>
              <a-select-option value="paid">{{ $t('adminReferralWithdrawals.status.paid') }}</a-select-option>
              <a-select-option value="rejected">{{ $t('adminReferralWithdrawals.status.rejected') }}</a-select-option>
            </a-select>
          </div>
          <div class="reward-withdrawal-count">
            {{ $t('adminReferralWithdrawals.total', { count: rewardWithdrawalPagination.total }) }}
          </div>
        </div>

        <a-card :bordered="false" class="user-table-card reward-withdrawal-card">
          <a-table
            :columns="rewardWithdrawalColumns"
            :dataSource="rewardWithdrawals"
            :loading="rewardWithdrawalLoading"
            :pagination="rewardWithdrawalPagination"
            :rowKey="record => record.id"
            :scroll="{ x: 1080 }"
            @change="handleRewardWithdrawalTableChange"
          >
            <template slot="rewardWithdrawalUser" slot-scope="text, record">
              <span class="user-cell">
                <a-avatar size="small" :style="{ backgroundColor: getUserColor(record.user_id), fontSize: '11px', marginRight: '6px' }">
                  {{ (record.nickname || record.username || '?').charAt(0).toUpperCase() }}
                </a-avatar>
                <span class="user-name">{{ record.nickname || record.username || '-' }}</span>
              </span>
            </template>
            <template slot="rewardWithdrawalAmount" slot-scope="text">
              <strong>{{ Number(text || 0).toFixed(2) }}</strong>
              <span class="text-muted reward-currency">USD</span>
            </template>
            <template slot="rewardWithdrawalChannel" slot-scope="text, record">
              <a-tag color="blue">{{ record.currency }} · {{ text }}</a-tag>
            </template>
            <template slot="rewardWithdrawalAddress" slot-scope="text">
              <a-tooltip :title="text">
                <span class="address-text">{{ truncate(text, 24) }}</span>
              </a-tooltip>
            </template>
            <template slot="rewardWithdrawalStatus" slot-scope="text">
              <a-tag :color="getRewardWithdrawalStatusColor(text)">
                {{ $t(`adminReferralWithdrawals.status.${text}`) }}
              </a-tag>
            </template>
            <template slot="rewardWithdrawalCreatedAt" slot-scope="text">
              {{ text ? formatTime(text) : '-' }}
            </template>
            <template slot="rewardWithdrawalActions" slot-scope="text, record">
              <a-space v-if="record.status === 'pending' || record.status === 'processing'" size="small">
                <a-button v-if="record.status === 'pending'" size="small" @click="startRewardWithdrawalReview(record)">
                  {{ $t('adminReferralWithdrawals.startProcessing') }}
                </a-button>
                <a-button size="small" type="primary" @click="openRewardWithdrawalReview(record, 'paid')">
                  {{ $t('adminReferralWithdrawals.markPaid') }}
                </a-button>
                <a-button size="small" type="danger" ghost @click="openRewardWithdrawalReview(record, 'rejected')">
                  {{ $t('adminReferralWithdrawals.reject') }}
                </a-button>
              </a-space>
              <span v-else class="text-muted">-</span>
            </template>
          </a-table>
        </a-card>

        <a-modal
          v-model="rewardReview.visible"
          :wrap-class-name="userManageModalWrapClass"
          :title="$t(`adminReferralWithdrawals.reviewTitle.${rewardReview.action}`)"
          :confirmLoading="rewardReview.submitting"
          :ok-text="$t(`adminReferralWithdrawals.reviewConfirm.${rewardReview.action}`)"
          :cancel-text="$t('common.cancel')"
          @ok="submitRewardWithdrawalReview"
        >
          <a-alert
            v-if="rewardReview.record"
            type="info"
            show-icon
            :message="$t('adminReferralWithdrawals.reviewSummary', { user: rewardReview.record.username || '-', amount: Number(rewardReview.record.amount || 0).toFixed(2) })"
            class="reward-review-alert"
          />
          <a-form layout="vertical">
            <a-form-item v-if="rewardReview.action === 'paid'" :label="$t('adminReferralWithdrawals.txHash')" required>
              <a-input v-model.trim="rewardReview.txHash" :placeholder="$t('adminReferralWithdrawals.txHashPlaceholder')" />
            </a-form-item>
            <a-form-item :label="$t('adminReferralWithdrawals.reviewNote')">
              <a-textarea v-model="rewardReview.note" :auto-size="{ minRows: 3, maxRows: 6 }" :placeholder="$t('adminReferralWithdrawals.reviewNotePlaceholder')" />
            </a-form-item>
          </a-form>
        </a-modal>
      </a-tab-pane>

      <!-- Tab 5: AI Analysis Records -->
      <a-tab-pane key="aiStats" :tab="$t('adminAiStats.tabTitle') || 'AI Analysis'">
        <!-- AI Stats Summary Cards -->
        <div class="summary-cards" v-if="aiStatsSummary">
          <div class="summary-card">
            <div class="summary-icon summary-icon-primary">
              <a-icon type="thunderbolt" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ (aiStatsSummary.total_analyses || 0) + (aiStatsSummary.total_copilot_sessions || 0) }}</div>
              <div class="summary-label">{{ $t('adminAiStats.aiActivity') || 'AI Activity' }}</div>
              <div class="summary-sub">{{ $t('adminAiStats.reportCount', { count: aiStatsSummary.total_analyses || 0 }) }} / {{ $t('adminAiStats.chatCount', { count: aiStatsSummary.total_copilot_sessions || 0 }) }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon summary-icon-primary">
              <a-icon type="team" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ Math.max(aiStatsSummary.unique_users || 0, aiStatsSummary.unique_chat_users || 0) }}</div>
              <div class="summary-label">{{ $t('adminAiStats.activeUsers') || 'Active Users' }}</div>
              <div class="summary-sub">{{ $t('adminAiStats.copilotUserCount', { count: aiStatsSummary.unique_chat_users || 0 }) }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon summary-icon-primary">
              <a-icon type="stock" />
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ aiStatsSummary.total_copilot_messages || 0 }}</div>
              <div class="summary-label">{{ $t('adminAiStats.copilotMessages') || 'Copilot Messages' }}</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon summary-icon-success">
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
              <span style="font-weight: 600; color: var(--primary-color, #1890ff);">{{ text || 0 }}</span>
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
import { getUserList, exportUsers, createUser, updateUser, deleteUser, resetUserPassword, getRoles, setUserCredits, setUserVip, getSystemStrategies, adminToggleStrategy, adminDeleteStrategy, getAdminOrders, manualConfirmOrder, getAdminAiStats, getUserAdminStats } from '@/api/user'
import { getAdminReferralWithdrawals, reviewAdminReferralWithdrawal } from '@/api/billing'
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
      batchBanLoading: false,
      users: [],
      selectedUserRowKeys: [],
      selectedUserRows: [],
      roles: [],
      searchKeyword: '',
      userIdSearch: '',
      userRoleFilter: undefined,
      userStatusFilter: undefined,
      userVipFilter: undefined,
      userSortBy: '',
      userSortOrder: 'desc',
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
      strategyClassFilter: 'all',
      strategySortBy: '',
      strategySortOrder: 'desc',
      strategySearchKeyword: '',
      strategyIdSearch: '',
      strategyUserIdSearch: '',
      strategyTogglingId: null,
      strategyDeletingId: null,
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
      orderPaymentFilter: 'all',
      orderPlanFilter: 'all',
      orderFilterOptions: {
        payment_methods: ['usdt', 'usdc', 'stripe'],
        plans: []
      },
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
      rewardWithdrawalLoading: false,
      rewardWithdrawals: [],
      rewardWithdrawalSummary: null,
      rewardWithdrawalStatus: 'all',
      rewardWithdrawalPagination: {
        current: 1,
        pageSize: 20,
        total: 0
      },
      rewardWithdrawalsLoaded: false,
      rewardReview: {
        visible: false,
        submitting: false,
        record: null,
        action: '',
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
    billingEnabled () {
      return this.$store.state.features.config.billing_enabled !== false
    },
    ...mapGetters(['userInfo']),
    isZh () {
      const locale = this.$i18n ? String(this.$i18n.locale || '') : 'zh-CN'
      return locale.toLowerCase().startsWith('zh')
    },
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    hasActiveOrderFilters () {
      return this.orderStatusFilter !== 'all' ||
        this.orderPaymentFilter !== 'all' ||
        this.orderPlanFilter !== 'all' ||
        Boolean((this.orderSearchKeyword || '').trim())
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
      return !!(
        this.normalizePositiveInt(this.userIdSearch) ||
        String(this.searchKeyword || '').trim() ||
        this.userRoleFilter ||
        this.userStatusFilter ||
        this.userVipFilter
      )
    },
    selectedCountText () {
      const template = this.$t('userManage.selectedCount') || '{count} selected'
      return String(template).replace('{count}', this.selectedUserRowKeys.length)
    },
    batchBanConfirmText () {
      const template = this.$t('userManage.batchBanConfirm') || 'Ban {count} selected users? They will not be able to log in.'
      return String(template).replace('{count}', this.batchBannableUsers.length)
    },
    batchBannableUsers () {
      return this.selectedUserRows.filter(user => {
        return user &&
          user.id !== this.currentUserId &&
          String(user.status || '').toLowerCase() !== 'disabled'
      })
    },
    userRowSelection () {
      return {
        selectedRowKeys: this.selectedUserRowKeys,
        onChange: this.handleUserSelectionChange,
        getCheckboxProps: record => ({
          props: {
            disabled: record.id === this.currentUserId || String(record.status || '').toLowerCase() === 'disabled',
            name: String(record.id)
          }
        })
      }
    },
    hasStrategyFilters () {
      return !!(
        this.normalizePositiveInt(this.strategyIdSearch) ||
        this.normalizePositiveInt(this.strategyUserIdSearch) ||
        String(this.strategySearchKeyword || '').trim() ||
        this.strategyStatusFilter !== 'all' ||
        this.strategyExecutionFilter !== 'all' ||
        this.strategyClassFilter !== 'all'
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
          key: 'credits',
          width: 100,
          sorter: true,
          sortOrder: this.userSortBy === 'credits'
            ? (this.userSortOrder === 'asc' ? 'ascend' : 'descend')
            : false,
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
          width: 88,
          fixed: 'left',
          scopedSlots: { customRender: 'strategyId' },
          sorter: true,
          sortOrder: so('id')
        },
        {
          title: this.$t('systemOverview.colUserId') || 'User ID',
          dataIndex: 'user_id',
          key: 'user_id',
          width: 82,
          fixed: 'left',
          scopedSlots: { customRender: 'ownerUserId' }
        },
        {
          title: this.$t('systemOverview.colUser') || 'User',
          dataIndex: 'username',
          key: 'username',
          width: 116,
          fixed: 'left',
          scopedSlots: { customRender: 'userInfo' }
        },
        {
          title: this.$t('systemOverview.colSource'),
          dataIndex: 'strategy_name',
          key: 'strategy_name',
          width: 240,
          scopedSlots: { customRender: 'strategySourceInfo' },
          sorter: true,
          sortOrder: so('strategy_name')
        },
        {
          title: this.$t('systemOverview.colStrategyClass'),
          dataIndex: 'strategy_class',
          key: 'strategy_class',
          width: 100,
          align: 'center',
          scopedSlots: { customRender: 'strategyClassInfo' }
        },
        {
          title: this.$t('systemOverview.colStatus') || 'Status',
          dataIndex: 'status',
          key: 'status',
          width: 104,
          scopedSlots: { customRender: 'strategyStatus' },
          sorter: true,
          sortOrder: so('status')
        },
        {
          title: this.$t('systemOverview.colExecutionMode') || 'Mode',
          dataIndex: 'execution_mode',
          key: 'execution_mode',
          width: 92,
          align: 'center',
          scopedSlots: { customRender: 'executionModeInfo' },
          sorter: true,
          sortOrder: so('execution_mode')
        },
        {
          title: this.$t('systemOverview.colUniverse'),
          dataIndex: 'symbol',
          key: 'symbol',
          width: 220,
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
          title: this.$t('systemOverview.colPnl') || 'PnL / ROI',
          dataIndex: 'total_pnl',
          key: 'total_pnl',
          width: 200,
          scopedSlots: { customRender: 'pnlInfo' },
          sorter: true,
          sortOrder: so('total_pnl')
        },
        {
          title: this.$t('systemOverview.colRuntime'),
          dataIndex: 'trade_count',
          key: 'runtime',
          width: 158,
          scopedSlots: { customRender: 'runtimeInfo' }
        },
        {
          title: this.$t('systemOverview.colExchange') || 'Exchange',
          dataIndex: 'exchange_name',
          key: 'exchange_name',
          width: 100,
          scopedSlots: { customRender: 'exchangeInfo' }
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
          title: this.$t('systemOverview.colActivity'),
          dataIndex: 'updated_at',
          key: 'updated_at',
          width: 168,
          scopedSlots: { customRender: 'activityInfo' },
          sorter: true,
          sortOrder: so('updated_at')
        },
        {
          title: this.$t('common.actions') || 'Actions',
          key: 'actions',
          width: 140,
          fixed: 'right',
          scopedSlots: { customRender: 'strategyActions' }
        }
      ]
    },
    orderColumns () {
      return [
        {
          title: this.$t('adminOrders.colOrderNo') || 'Order No.',
          dataIndex: 'order_no',
          width: 128
        },
        {
          title: this.$t('adminOrders.colUser') || 'User',
          dataIndex: 'username',
          width: 120,
          scopedSlots: { customRender: 'orderUserInfo' }
        },
        {
          title: this.$t('adminOrders.colType') || 'Payment',
          dataIndex: 'payment_method',
          width: 128,
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
          title: this.$t('adminOrders.colPaymentReference') || 'Payment Reference',
          dataIndex: 'payment_reference',
          width: 190,
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
    rewardWithdrawalColumns () {
      return [
        {
          title: this.$t('adminReferralWithdrawals.colUser'),
          dataIndex: 'username',
          width: 160,
          scopedSlots: { customRender: 'rewardWithdrawalUser' }
        },
        {
          title: this.$t('adminReferralWithdrawals.colAmount'),
          dataIndex: 'amount',
          width: 130,
          scopedSlots: { customRender: 'rewardWithdrawalAmount' }
        },
        {
          title: this.$t('adminReferralWithdrawals.colChannel'),
          dataIndex: 'chain',
          width: 150,
          scopedSlots: { customRender: 'rewardWithdrawalChannel' }
        },
        {
          title: this.$t('adminReferralWithdrawals.colAddress'),
          dataIndex: 'address',
          width: 240,
          scopedSlots: { customRender: 'rewardWithdrawalAddress' }
        },
        {
          title: this.$t('adminReferralWithdrawals.colStatus'),
          dataIndex: 'status',
          width: 110,
          scopedSlots: { customRender: 'rewardWithdrawalStatus' }
        },
        {
          title: this.$t('adminReferralWithdrawals.colCreatedAt'),
          dataIndex: 'created_at',
          width: 170,
          scopedSlots: { customRender: 'rewardWithdrawalCreatedAt' }
        },
        {
          title: this.$t('adminReferralWithdrawals.colActions'),
          key: 'actions',
          width: 280,
          fixed: 'right',
          scopedSlots: { customRender: 'rewardWithdrawalActions' }
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
      if (key === 'rewardWithdrawals' && !this.rewardWithdrawalsLoaded) {
        this.loadRewardWithdrawals()
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
        strategy_class: this.strategyClassFilter === 'all' ? '' : this.strategyClassFilter,
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
      if (this.userRoleFilter) params.role = this.userRoleFilter
      if (this.userStatusFilter) params.status = this.userStatusFilter
      if (this.userVipFilter) params.vip_status = this.userVipFilter

      if (this.userSortBy) {
        params.sort_by = this.userSortBy
        params.sort_order = this.userSortOrder
      }
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

    handleStrategyClassFilterChange () {
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
      this.strategyClassFilter = 'all'
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

    clearStrategyClassFilter () {
      this.strategyClassFilter = 'all'
      this.strategyPagination.current = 1
      this.loadSystemStrategies()
    },

    clearUserFilters () {
      this.userIdSearch = ''
      this.searchKeyword = ''
      this.userRoleFilter = undefined
      this.userStatusFilter = undefined
      this.userVipFilter = undefined
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

    clearUserRoleFilter () {
      this.userRoleFilter = undefined
      this.handleUserFilterChange()
    },

    clearUserStatusFilter () {
      this.userStatusFilter = undefined
      this.handleUserFilterChange()
    },

    clearUserVipFilter () {
      this.userVipFilter = undefined
      this.handleUserFilterChange()
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
                  this.$t('systemOverview.strategyStartNotPersisted') ||
                    '策略未能保持运行，请打开该策略查看运行日志'
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

    handleStrategyDelete (record) {
      if (!record || !record.id) return
      this.$confirm({
        title: this.$t('systemOverview.confirmDeleteTitle') || '删除该策略？',
        content: this.$t('systemOverview.confirmDeleteDesc') || '删除后不可恢复；如果策略正在运行，系统会先停止再删除。',
        okText: this.$t('common.delete') || '删除',
        cancelText: this.$t('common.cancel') || '取消',
        okType: 'danger',
        onOk: async () => {
          this.strategyDeletingId = record.id
          try {
            const res = await adminDeleteStrategy(record.id)
            if (res && res.code === 1) {
              this.$message.success(res.msg || (this.$t('common.deleteSuccess') || 'Deleted'))
              await this.loadSystemStrategies()
            } else {
              this.$message.error((res && res.msg) || (this.$t('common.deleteFailed') || 'Delete failed'))
            }
          } catch (e) {
            this.$message.error(this.$t('common.deleteFailed') || 'Delete failed')
          } finally {
            this.strategyDeletingId = null
          }
        }
      })
    },

    getUserColor (userId) {
      const colors = ['var(--primary-color, #1890ff)', '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96', '#52c41a', '#2f54eb', '#faad14']
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
    _chartPrimaryColor () {
      if (typeof window === 'undefined') return '#1890ff'
      return window.getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#1890ff'
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
      const primaryColor = this._chartPrimaryColor()
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
              color: primaryColor,
              opacity: 0.42,
              borderRadius: [2, 2, 0, 0]
            },
            data: newSeries
          },
          {
            name: this.$t('userManage.legendTotal') || 'Cumulative',
            type: 'line',
            yAxisIndex: 1,
            smooth: false,
            symbol: 'none',
            lineStyle: { color: primaryColor, width: 2 },
            itemStyle: { color: primaryColor },
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
      const primaryColor = this._chartPrimaryColor()
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
            color: primaryColor,
            opacity: 0.68,
            borderRadius: [2, 2, 0, 0]
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
      const locale = String(this.$i18n?.locale || 'en-US')
      const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
      const direction = future ? 1 : -1
      if (day > 0) return formatter.format(direction * day, 'day')
      if (hr > 0) return formatter.format(direction * hr, 'hour')
      if (min > 0) return formatter.format(direction * min, 'minute')
      return formatter.format(0, 'second')
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

    strategyClassColor (value) {
      return { cta: 'blue', portfolio: 'purple', robot: 'cyan' }[value] || 'default'
    },

    formatStrategyUniverse (record) {
      if (!record) return '-'
      if (record.universe_reference) return record.universe_reference
      const symbols = Array.isArray(record.universe_symbols) ? record.universe_symbols.filter(Boolean) : []
      if (symbols.length === 1) {
        const marketType = Array.isArray(record.market_types) ? record.market_types[0] : ''
        const typeKey = marketType ? `marketContext.${marketType}` : ''
        const typeLabel = typeKey && this.$te && this.$te(typeKey) ? this.$t(typeKey) : ''
        return typeLabel ? `${symbols[0]} · ${typeLabel}` : symbols[0]
      }
      const count = Number(record.instrument_count || symbols.length || 0)
      if (count > 1) return `${count} ${this.$t('systemOverview.symbols')}`
      return record.symbol || '-'
    },

    formatStrategyMarket (record) {
      const markets = Array.isArray(record && record.markets) ? record.markets.filter(Boolean) : []
      const values = markets.length ? markets : [record && record.market_category].filter(Boolean)
      return values.map(value => {
        const key = `universeManager.market.${value}`
        return this.$te && this.$te(key) ? this.$t(key) : value
      }).join(' / ') || '-'
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
          this.pruneSelectedUsers(items)
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
      this.clearSelectedUsers()
      this.loadUsers()
    },

    handleUserFilterChange () {
      this.pagination.current = 1
      this.clearSelectedUsers()
      this.loadUsers().catch(() => undefined)
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

    handleTableChange (pagination, filters, sorter) {
      const previousSortBy = this.userSortBy
      const previousSortOrder = this.userSortOrder
      const sorterKey = sorter && (sorter.columnKey || sorter.field)
      if (sorterKey === 'credits' && (sorter.order === 'ascend' || sorter.order === 'descend')) {
        this.userSortBy = 'credits'
        this.userSortOrder = sorter.order === 'ascend' ? 'asc' : 'desc'
      } else if (sorterKey === 'credits') {
        this.userSortBy = ''
        this.userSortOrder = 'desc'
      }
      const sortChanged = previousSortBy !== this.userSortBy || previousSortOrder !== this.userSortOrder
      this.pagination.current = sortChanged ? 1 : pagination.current
      this.pagination.pageSize = pagination.pageSize
      this.clearSelectedUsers()
      this.loadUsers()
    },

    handleUserSelectionChange (selectedRowKeys, selectedRows) {
      this.selectedUserRowKeys = selectedRowKeys
      this.selectedUserRows = selectedRows
    },

    clearSelectedUsers () {
      this.selectedUserRowKeys = []
      this.selectedUserRows = []
    },

    pruneSelectedUsers (visibleRows) {
      if (!this.selectedUserRowKeys.length) return
      const rowMap = new Map((visibleRows || []).map(row => [row.id, row]))
      this.selectedUserRowKeys = this.selectedUserRowKeys.filter(id => rowMap.has(id))
      this.selectedUserRows = this.selectedUserRowKeys.map(id => rowMap.get(id)).filter(Boolean)
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

    async handleBatchBanUsers () {
      const targets = this.batchBannableUsers
      if (!targets.length) {
        this.$message.warning(this.$t('userManage.batchBanNoValid') || 'Please select users that can be banned')
        return
      }

      this.batchBanLoading = true
      try {
        const results = await Promise.allSettled(
          targets.map(user => updateUser(user.id, { status: 'disabled' }))
        )
        const successCount = results.filter(result => {
          return result.status === 'fulfilled' && result.value && result.value.code === 1
        }).length
        const failedCount = targets.length - successCount

        if (successCount && !failedCount) {
          const template = this.$t('userManage.batchBanSuccess') || 'Banned {count} users'
          this.$message.success(String(template).replace('{count}', successCount))
        } else if (successCount) {
          const template = this.$t('userManage.batchBanPartial') || 'Banned {success} users, {failed} failed'
          this.$message.warning(String(template).replace('{success}', successCount).replace('{failed}', failedCount))
        } else {
          this.$message.error(this.$t('userManage.batchBanFailed') || 'Batch ban failed')
        }

        this.clearSelectedUsers()
        this.loadUsers()
        this.loadUserStats(true)
      } catch (error) {
        this.$message.error(this.$t('userManage.batchBanFailed') || 'Batch ban failed')
      } finally {
        this.batchBanLoading = false
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
        user: 'blue',
        viewer: 'default'
      }
      return colors[role] || 'default'
    },

    getRoleLabel (role) {
      const labels = {
        admin: this.$t('userManage.roleAdmin') || 'Admin',
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
          payment_method: this.orderPaymentFilter === 'all' ? '' : this.orderPaymentFilter,
          plan: this.orderPlanFilter === 'all' ? '' : this.orderPlanFilter,
          search: this.orderSearchKeyword || ''
        })
        if (res.code === 1) {
          this.orders = res.data.items || []
          this.orderPagination.total = res.data.total || 0
          this.orderSummary = res.data.summary || {}
          this.orderFilterOptions = res.data.filter_options || this.orderFilterOptions
          this.ordersLoaded = true
        } else {
          this.$message.error(res.msg || this.$t('adminOrders.loadFailed'))
        }
      } catch (error) {
        console.error('Failed to load orders:', error)
        this.$message.error(this.$t('adminOrders.loadFailed'))
      } finally {
        this.orderLoading = false
      }
    },

    handleOrderSearch () {
      this.orderPagination.current = 1
      this.loadOrders()
    },

    handleOrderSearchChange (event) {
      const value = event && event.target ? event.target.value : this.orderSearchKeyword
      if (!String(value || '').trim()) {
        this.orderSearchKeyword = ''
        this.handleOrderSearch()
      }
    },

    handleOrderFilterChange () {
      this.orderPagination.current = 1
      this.loadOrders()
    },

    resetOrderFilters () {
      this.orderStatusFilter = 'all'
      this.orderPaymentFilter = 'all'
      this.orderPlanFilter = 'all'
      this.orderSearchKeyword = ''
      this.orderPagination.current = 1
      this.loadOrders()
    },

    handleOrderTableChange (pagination) {
      this.orderPagination.current = pagination.current
      this.orderPagination.pageSize = pagination.pageSize
      this.loadOrders()
    },

    async loadRewardWithdrawals () {
      this.rewardWithdrawalLoading = true
      try {
        const res = await getAdminReferralWithdrawals({
          page: this.rewardWithdrawalPagination.current,
          page_size: this.rewardWithdrawalPagination.pageSize,
          status: this.rewardWithdrawalStatus === 'all' ? '' : this.rewardWithdrawalStatus
        })
        if (res && res.code === 1) {
          this.rewardWithdrawals = (res.data && res.data.items) || []
          this.rewardWithdrawalPagination.total = (res.data && res.data.total) || 0
          this.rewardWithdrawalSummary = (res.data && res.data.summary) || {}
          this.rewardWithdrawalsLoaded = true
        } else {
          this.$message.error((res && res.msg) || this.$t('adminReferralWithdrawals.loadFailed'))
        }
      } catch (error) {
        const message = error && error.response && error.response.data && error.response.data.msg
        this.$message.error(message || this.$t('adminReferralWithdrawals.loadFailed'))
      } finally {
        this.rewardWithdrawalLoading = false
      }
    },

    handleRewardWithdrawalFilterChange () {
      this.rewardWithdrawalPagination.current = 1
      this.loadRewardWithdrawals()
    },

    handleRewardWithdrawalTableChange (pagination) {
      this.rewardWithdrawalPagination.current = pagination.current
      this.rewardWithdrawalPagination.pageSize = pagination.pageSize
      this.loadRewardWithdrawals()
    },

    getRewardWithdrawalStatusColor (status) {
      return {
        pending: 'orange',
        processing: 'blue',
        paid: 'green',
        rejected: 'red'
      }[status] || 'default'
    },

    async startRewardWithdrawalReview (record) {
      try {
        const res = await reviewAdminReferralWithdrawal(record.id, { action: 'processing' })
        if (res && res.code === 1) {
          this.$message.success(this.$t('adminReferralWithdrawals.processingSaved'))
          await this.loadRewardWithdrawals()
        } else {
          this.$message.error((res && res.msg) || this.$t('adminReferralWithdrawals.reviewFailed'))
        }
      } catch (error) {
        const message = error && error.response && error.response.data && error.response.data.msg
        this.$message.error(message || this.$t('adminReferralWithdrawals.reviewFailed'))
      }
    },

    openRewardWithdrawalReview (record, action) {
      this.rewardReview = {
        visible: true,
        submitting: false,
        record,
        action,
        txHash: '',
        note: ''
      }
    },

    async submitRewardWithdrawalReview () {
      if (!this.rewardReview.record) return
      if (this.rewardReview.action === 'paid' && !this.rewardReview.txHash) {
        this.$message.warning(this.$t('adminReferralWithdrawals.txHashRequired'))
        return
      }
      this.rewardReview.submitting = true
      try {
        const res = await reviewAdminReferralWithdrawal(this.rewardReview.record.id, {
          action: this.rewardReview.action,
          tx_hash: this.rewardReview.txHash,
          review_note: this.rewardReview.note
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('adminReferralWithdrawals.reviewSaved'))
          this.rewardReview.visible = false
          await this.loadRewardWithdrawals()
        } else {
          this.$message.error((res && res.msg) || this.$t('adminReferralWithdrawals.reviewFailed'))
        }
      } catch (error) {
        const message = error && error.response && error.response.data && error.response.data.msg
        this.$message.error(message || this.$t('adminReferralWithdrawals.reviewFailed'))
      } finally {
        this.rewardReview.submitting = false
      }
    },

    // --- Manual confirm (admin rescue tool) --------------------------
    //
    // Only orders that the on-chain reconciler may have legitimately
    // missed are eligible: pending (never matched), paid (matched but
    // confirmation delay glitch), expired (TTL ran out before the
    // watcher caught up). Cancelled is intentionally excluded so a
    // refunded order doesn't get accidentally revived.
    canManualConfirm (record) {
      const method = String((record && (record.payment_method || record.order_type)) || '').toLowerCase()
      const status = String((record && record.status) || '').toLowerCase()
      return ['usdt', 'usdc'].indexOf(method) >= 0 && ['pending', 'paid', 'expired'].indexOf(status) >= 0
    },

    getPaymentMethodColor (method) {
      return { usdt: 'green', usdc: 'blue', stripe: 'purple' }[String(method || '').toLowerCase()] || 'default'
    },

    getPaymentMethodLabel (method) {
      const normalized = String(method || '').toLowerCase()
      if (normalized === 'usdt') return 'USDT'
      if (normalized === 'usdc') return 'USDC'
      if (normalized === 'stripe') return this.$t('adminOrders.methodStripe') || 'Card (Stripe)'
      return method || '-'
    },

    getOrderPlanColor (plan) {
      return { lifetime: 'gold', yearly: 'purple', monthly: 'cyan' }[String(plan || '').toLowerCase()] || 'blue'
    },

    getOrderPlanLabel (plan) {
      const normalized = String(plan || '').toLowerCase()
      if (normalized === 'lifetime') return this.$t('adminOrders.lifetime') || 'Lifetime'
      if (normalized === 'yearly') return this.$t('adminOrders.yearly') || 'Yearly'
      if (normalized === 'monthly') return this.$t('adminOrders.monthly') || 'Monthly'
      return plan || '-'
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
@import './user-manage-polish.less';

.user-manage-page {
  padding: var(--qd-page-gutter, 16px) !important;
  min-height: calc(100vh - 120px);
  background: var(--qd-surface-subtle);

  .manage-tabs {
    ::v-deep .ant-tabs-bar {
      margin-bottom: 20px;
    }

    ::v-deep .ant-tabs-ink-bar {
      background: var(--primary-color, #1890ff);
    }

    ::v-deep .ant-tabs-tab-active,
    ::v-deep .ant-tabs-tab:hover {
      color: var(--primary-color, #1890ff);
    }
  }

  .strategy-contract-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 16px;
    padding: 16px 18px;
    border: 1px solid rgba(82, 196, 26, 0.22);
    border-radius: 12px;
    background: #f8fff3;
  }

  .strategy-contract-copy {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;

    .strategy-contract-icon {
      display: inline-flex;
      width: 38px;
      height: 38px;
      flex: none;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: rgba(82, 196, 26, 0.12);
      color: #52c41a;
      font-size: 19px;
    }

    .strategy-contract-title {
      color: #1e293b;
      font-size: 15px;
      font-weight: 700;
    }

    p {
      margin: 3px 0 0;
      color: #64748b;
      font-size: 12px;
      line-height: 1.55;
    }
  }

  .strategy-contract-status {
    display: flex;
    flex: none;
    align-items: center;
    gap: 12px;
    color: #64748b;
    font-size: 12px;

    strong {
      margin-left: 3px;
      color: #1e293b;
      font-size: 14px;
    }
  }

  // Summary Cards
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;

    .summary-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px;
      border: 1px solid var(--qd-border);
      border-radius: var(--qd-radius);
      background: var(--qd-surface);
      box-shadow: var(--qd-shadow-card);
      transition: border-color 0.18s ease, box-shadow 0.18s ease;

      &:hover {
        border-color: color-mix(in srgb, var(--primary-color, #1890ff) 28%, var(--qd-border));
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.07);
      }

      .summary-icon {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 20%, transparent);
        border-radius: 10px;
        background: color-mix(in srgb, var(--primary-color, #1890ff) 9%, transparent);
        color: var(--primary-color, #1890ff);

        .anticon {
          color: currentColor;
          font-size: 18px;
        }
      }

      .summary-icon-primary,
      .summary-icon-v2,
      .summary-icon-capital {
        border-color: color-mix(in srgb, var(--primary-color, #1890ff) 20%, transparent);
        background: color-mix(in srgb, var(--primary-color, #1890ff) 9%, transparent);
        color: var(--primary-color, #1890ff);
      }

      .summary-icon-success,
      .summary-icon-running,
      .summary-icon-profit {
        border-color: color-mix(in srgb, #16a37a 20%, transparent);
        background: color-mix(in srgb, #16a37a 9%, transparent);
        color: #168460;
      }

      .summary-icon-warning {
        border-color: color-mix(in srgb, #d48806 22%, transparent);
        background: color-mix(in srgb, #d48806 9%, transparent);
        color: #ad6800;
      }

      .summary-icon-danger,
      .summary-icon-loss {
        border-color: color-mix(in srgb, #e5484d 20%, transparent);
        background: color-mix(in srgb, #e5484d 9%, transparent);
        color: #cf3036;
      }

      .summary-icon-neutral {
        border-color: color-mix(in srgb, var(--qd-text-secondary) 18%, transparent);
        background: color-mix(in srgb, var(--qd-text-secondary) 8%, transparent);
        color: var(--qd-text-secondary);
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

        .strategy-class-breakdown {
          display: flex;
          gap: 8px;

          span + span::before {
            margin-right: 8px;
            color: #cbd5e1;
            content: '·';
          }
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

      .toolbar-divider {
        height: 24px;
        margin: 0 4px;
      }

      .batch-selected-count {
        display: inline-flex;
        align-items: center;
        height: 32px;
        padding: 0 10px;
        border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 24%, transparent);
        border-radius: 4px;
        color: var(--primary-color, #1890ff);
        background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, transparent);
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
      }
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

  .toolbar-filter-select {
    width: 128px;
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

  .reward-withdrawal-toolbar {
    min-height: 32px;
  }

  .reward-withdrawal-count {
    color: #64748b;
    font-size: 13px;
    white-space: nowrap;
  }

  .summary-currency {
    color: #94a3b8;
    font-size: 12px;
    font-weight: 600;
  }

  .reward-withdrawal-card {
    .reward-currency {
      margin-left: 5px;
      font-size: 12px;
      font-weight: 500;
    }
  }

  .reward-review-alert {
    margin-bottom: 16px;
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
    color: var(--primary-color, #1890ff);
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

    .danger-link {
      color: #ff4d4f;

      &:hover {
        color: #ff7875;
      }
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

  .ledger-value-cell,
  .execution-mode-stack {
    display: grid;
    gap: 3px;
    justify-items: start;
  }

  .virtual-ledger-label {
    color: #1677ff;
    font-size: 10px;
    font-weight: 500;
    line-height: 1.2;
    white-space: nowrap;
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

  .strategy-source-cell {
    min-width: 0;

    > strong {
      display: block;
      overflow: hidden;
      color: #1e293b;
      font-size: 13px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .strategy-source-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;

    ::v-deep .ant-tag {
      margin-right: 0;
      font-size: 10px;
      line-height: 18px;
    }
  }

  .source-id-link {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--primary-color, #1890ff);
    cursor: pointer;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 10px;
  }

  .universe-cell {
    display: grid;
    gap: 3px;

    strong {
      overflow: hidden;
      color: #1e293b;
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      color: #64748b;
      font-size: 11px;
    }
  }

  .runtime-cell {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;

    span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      color: #64748b;
      font-size: 10px;
    }

    .virtual-ledger-label {
      flex-basis: 100%;
    }
  }

  .activity-cell {
    display: grid;
    gap: 3px;
    font-size: 11px;

    small {
      color: #64748b;
      font-size: 10px;
    }
  }

  // Order address & hash styles
  .address-text,
  .hash-text {
    font-family: 'Roboto Mono', 'Courier New', monospace;
    font-size: 12px;
    color: var(--primary-color, #1890ff);
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
    background: #080808;

    .strategy-contract-banner {
      border-color: rgba(82, 196, 26, 0.2);
      background: #0d160b;
    }

    .strategy-contract-copy {
      .strategy-contract-title { color: #f3f4f6; }
      p { color: #7f8b9c; }
    }

    .strategy-contract-status {
      color: #7f8b9c;

      strong { color: #e5e7eb; }
    }

    .reward-withdrawal-count {
      color: #8b949e;
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
        color: var(--primary-color, #1890ff);
      }
    }

    .summary-cards .summary-card {
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: #111;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);

      &:hover {
        border-color: color-mix(in srgb, var(--primary-color, #1890ff) 30%, #30343b);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
      }

      .summary-icon-success,
      .summary-icon-running,
      .summary-icon-profit {
        color: #45c49a;
      }

      .summary-icon-warning {
        color: #e6a843;
      }

      .summary-icon-danger,
      .summary-icon-loss {
        color: #ff6b70;
      }

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

    .strategy-source-cell > strong,
    .universe-cell strong {
      color: #e5e7eb;
    }

    .universe-cell span,
    .activity-cell small {
      color: #7f8b9c;
    }

    .runtime-cell span {
      border-color: rgba(255, 255, 255, 0.1);
      background: #0d0d0d;
      color: #aab4c2;
    }

    .source-id-link {
      color: #52c41a;
    }

    .user-table-card {
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: #111;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

      ::v-deep .ant-card-body {
        background: #111;
      }

      ::v-deep .ant-table {
        background: #111;
        color: #c9d1d9;

        .ant-table-thead > tr > th {
          background: #0d0d0d;
          color: #e0e6ed;
          border-bottom-color: #2a2a2a;
        }

        .ant-table-tbody > tr > td {
          border-bottom-color: #2a2a2a;
        }

        .ant-table-tbody > tr:hover > td {
          background: #171717;
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
      color: var(--primary-color, #1890ff);
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
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--qd-border);
      border-radius: var(--qd-radius);
      background: var(--qd-surface);
      box-shadow: var(--qd-shadow-card);

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
    padding: var(--qd-page-gutter, 12px);
    min-height: calc(100vh - 100px);

    .strategy-contract-banner,
    .strategy-contract-status {
      align-items: flex-start;
      flex-direction: column;
    }

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
    .toolbar-filter-select,
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
    padding: var(--qd-page-gutter, 12px);

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
  .ant-input-number,
  .ant-input-number-input,
  .ant-select-selection,
  .ant-calendar-picker-input {
    background: #141414 !important;
    border-color: #303030 !important;
    color: #e0e6ed !important;
  }

  .ant-input::placeholder,
  .ant-input-password input::placeholder,
  .ant-input-number-input::placeholder {
    color: #6e7681;
  }

  .ant-input-number-handler-wrap {
    background: #1f1f1f;
    border-left-color: #303030;
  }

  .ant-input-number-handler {
    border-color: #303030;
    color: rgba(255, 255, 255, 0.55);
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
    background: #141414 !important;
    border: 1px solid rgba(255, 255, 255, 0.08);

    .label {
      color: rgba(255, 255, 255, 0.68) !important;
    }

    .value {
      color: var(--primary-color, #1890ff) !important;
    }
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
