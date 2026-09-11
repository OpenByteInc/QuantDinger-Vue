<template>
  <div class="strategy-logs strategy-tab-pane-inner" :class="{ 'theme-dark': isDark }">
    <div class="logs-toolbar">
      <div class="toolbar-left">
        <div class="log-filter-tabs">
          <div
            v-for="item in filterOptions"
            :key="item.value"
            class="log-filter-tab"
            :class="[
              'tab-' + item.value,
              { active: filterLevel === item.value }
            ]"
            @click="filterLevel = item.value"
          >
            <a-icon :type="item.icon" class="tab-icon" />
            <span class="tab-label">{{ item.label }}</span>
            <span v-if="item.value !== 'all' && countByLevel(item.value) > 0" class="tab-count">
              {{ countByLevel(item.value) > 99 ? '99+' : countByLevel(item.value) }}
            </span>
            <span v-if="item.value === 'all' && logs.length > 0" class="tab-count">
              {{ logs.length > 99 ? '99+' : logs.length }}
            </span>
          </div>
        </div>
      </div>
      <div class="toolbar-right">
        <a-switch
          :checked="autoRefresh"
          @change="toggleAutoRefresh"
          size="small"
        />
        <span class="auto-refresh-label">{{ $t('trading-assistant.logs.autoRefresh') }}</span>
      </div>
    </div>

    <div class="logs-container custom-scrollbar" ref="logsContainer">
      <div v-if="displayLogs.length === 0" class="logs-empty">
        <a-icon type="file-text" style="font-size: 32px; color: #ccc;" />
        <p>{{ $t('trading-assistant.logs.noLogs') }}</p>
      </div>
      <div
        v-for="(log, idx) in displayLogs"
        :key="idx"
        class="log-entry"
        :class="'level-' + normalizeLogLevel(log.level)"
      >
        <span class="log-time">{{ formatTime(log.timestamp) }}</span>
        <span
          class="log-level"
          :class="'log-level-' + normalizeLogLevel(log.level)"
        >
          {{ getLevelText(log.level) }}
        </span>
        <div v-if="isMarketDataError(log)" class="market-data-error">
          <div class="market-data-error-head">
            <a-icon :type="marketDataIcon(log)" />
            <strong>{{ marketDataReasonLabel(log) }}</strong>
            <span class="market-data-context">{{ marketDataContext(log) }}</span>
          </div>
          <div class="market-data-error-message">{{ log.message }}</div>
          <div class="market-data-error-action">
            <a-icon type="bulb" /> {{ marketDataAction(log) }}
          </div>
          <a-tooltip v-if="marketDataError(log).technical_detail" :title="marketDataError(log).technical_detail">
            <span class="market-data-technical">
              <a-icon type="code" /> {{ $t('trading-assistant.logs.marketData.technicalDetail') }}
            </span>
          </a-tooltip>
        </div>
        <span v-else class="log-message">{{ String(log.message || '').startsWith('strategyRuntime.') ? $t(log.message) : log.message }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import request from '@/utils/request'
import { formatStrategyLogTime } from '@/utils/userTime'
import {
  normalizeStrategyLogLevel,
  STRATEGY_LOG_FILTERS,
  strategyLogLevelKey
} from '@/utils/strategyLogs'

export default {
  name: 'StrategyLogs',
  props: {
    strategyId: { type: [Number, String], default: null },
    isDark: { type: Boolean, default: false }
  },
  data () {
    return {
      logs: [],
      filterLevel: 'all',
      autoRefresh: false,
      refreshTimer: null,
      loading: false
    }
  },
  computed: {
    filterOptions () {
      return STRATEGY_LOG_FILTERS.map(item => ({
        ...item,
        label: this.$t(strategyLogLevelKey(item.value))
      }))
    },
    filteredLogs () {
      if (this.filterLevel === 'all') return this.logs
      return this.logs.filter(l => this.normalizeLogLevel(l.level) === this.filterLevel)
    },
    /** Newest entries first (API returns id DESC). */
    displayLogs () {
      return this.filteredLogs.slice()
    }
  },
  watch: {
    strategyId: {
      handler (val) {
        if (val) this.loadLogs()
      },
      immediate: true
    }
  },
  beforeDestroy () {
    this.stopAutoRefresh()
  },
  methods: {
    async loadLogs () {
      if (!this.strategyId) return
      this.loading = true
      try {
        const res = await request({
          url: '/api/strategies/logs',
          method: 'get',
          params: { id: this.strategyId, limit: 200 }
        })
        if (res && res.data) {
          this.logs = res.data
          this.$nextTick(() => this.scrollToTop())
        }
      } catch (e) {
        console.warn('Load logs failed:', e)
      } finally {
        this.loading = false
      }
    },

    toggleAutoRefresh (checked) {
      this.autoRefresh = checked
      if (checked) {
        this.refreshTimer = setInterval(() => this.loadLogs(), 5000)
      } else {
        this.stopAutoRefresh()
      }
    },

    stopAutoRefresh () {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    },

    scrollToTop () {
      const el = this.$refs.logsContainer
      if (el) el.scrollTop = 0
    },

    countByLevel (level) {
      return this.logs.filter(l => this.normalizeLogLevel(l.level) === level).length
    },

    formatTime (ts) {
      if (!ts) return ''
      const loc = this.$i18n.locale || 'zh-CN'
      const profileTz = (this.$store.getters.userInfo || {}).timezone
      return formatStrategyLogTime(ts, {
        locale: loc,
        timeZone: profileTz,
        fallback: String(ts)
      })
    },

    getLevelText (level) {
      const normalized = this.normalizeLogLevel(level)
      const key = strategyLogLevelKey(normalized)
      const translated = this.$t(key)
      return translated !== key ? translated : normalized
    },

    normalizeLogLevel (level) {
      return normalizeStrategyLogLevel(level)
    },

    isMarketDataError (log) {
      return log?.event_type === 'market_data_unavailable' && log?.market_data_error
    },

    marketDataError (log) {
      return log?.market_data_error || {}
    },

    marketDataReasonLabel (log) {
      const code = this.marketDataError(log).code || 'no_market_data'
      return this.$t(`trading-assistant.logs.marketData.reason.${code}`)
    },

    marketDataAction (log) {
      const code = this.marketDataError(log).code || 'no_market_data'
      return this.$t(`trading-assistant.logs.marketData.action.${code}`)
    },

    marketDataIcon (log) {
      const code = this.marketDataError(log).code
      if (code === 'region_restricted') return 'global'
      if (code === 'proxy_failure') return 'disconnect'
      if (code === 'symbol_not_found') return 'search'
      if (code === 'rate_limited') return 'clock-circle'
      return 'warning'
    },

    marketDataContext (log) {
      const item = this.marketDataError(log)
      return [item.exchange_id, item.symbol, item.market_type, item.timeframe]
        .filter(Boolean)
        .join(' · ')
    }
  }
}
</script>

<style lang="less" scoped>
.strategy-logs {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.logs-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  margin-bottom: 8px;
  gap: 12px;

  .toolbar-left {
    flex: 1;
    min-width: 0;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 6px;

    .auto-refresh-label {
      font-size: 12px;
      color: #999;
    }
  }
}

.log-filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  overflow: visible;
}

.log-filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  border: 1px solid transparent;
  line-height: 1.5;

  .tab-icon {
    font-size: 13px;
    color: inherit;
    transition: transform 0.2s;
  }

  .tab-label {
    color: inherit;
    white-space: nowrap;
  }

  .tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
  }

  &:hover .tab-icon {
    transform: scale(1.15);
  }

  // All
  &.tab-all {
    color: #595959;
    background: #f5f5f5;
    border-color: #e8e8e8;
    .tab-count { background: #e0e0e0; color: #595959; }
    &:hover { background: #ebebeb; }
    &.active {
      color: var(--primary-color, #1890ff);
      background: #e6f7ff;
      border-color: #91d5ff;
      .tab-count { background: var(--primary-color, #1890ff); color: #fff; }
    }
  }

  // Trade
  &.tab-trade {
    color: #389e0d;
    background: #f6ffed;
    border-color: #d9f7be;
    .tab-count { background: #d9f7be; color: #389e0d; }
    &:hover { background: #eaffdb; }
    &.active {
      color: #fff;
      background: linear-gradient(135deg, #52c41a, #389e0d);
      border-color: transparent;
      box-shadow: 0 2px 8px rgba(82, 196, 26, 0.35);
      .tab-count { background: rgba(255, 255, 255, 0.3); color: #fff; }
    }
  }

  // Signal
  &.tab-signal {
    color: #531dab;
    background: #f9f0ff;
    border-color: #d3adf7;
    .tab-count { background: #d3adf7; color: #531dab; }
    &:hover { background: #f0e0ff; }
    &.active {
      color: #fff;
      background: linear-gradient(135deg, #9254de, #722ed1);
      border-color: transparent;
      box-shadow: 0 2px 8px rgba(114, 46, 209, 0.35);
      .tab-count { background: rgba(255, 255, 255, 0.3); color: #fff; }
    }
  }

  // Warning
  &.tab-warning {
    color: #d48806;
    background: #fffbe6;
    border-color: #ffe58f;
    .tab-count { background: #ffe58f; color: #ad6800; }
    &:hover { background: #fff7cc; }
    &.active {
      color: #fff;
      background: linear-gradient(135deg, #faad14, #d48806);
      border-color: transparent;
      box-shadow: 0 2px 8px rgba(250, 173, 20, 0.35);
      .tab-count { background: rgba(255, 255, 255, 0.3); color: #fff; }
    }
  }

  // Error
  &.tab-error {
    color: #cf1322;
    background: #fff1f0;
    border-color: #ffa39e;
    .tab-count { background: #ffa39e; color: #cf1322; }
    &:hover { background: #ffe4e2; }
    &.active {
      color: #fff;
      background: linear-gradient(135deg, #ff4d4f, #cf1322);
      border-color: transparent;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.35);
      .tab-count { background: rgba(255, 255, 255, 0.3); color: #fff; }
    }
  }
}

.logs-container {
  flex: 1;
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 8px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.7;
  background: #fafafa;
}

.logs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #ccc;

  p {
    margin-top: 8px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 3px;

  &:hover {
    background: rgba(0, 0, 0, 0.02);
  }

  &.level-error {
    background: rgba(255, 77, 79, 0.04);
  }

  &.level-warning {
    background: rgba(250, 173, 20, 0.06);
  }

  &.level-trade {
    background: rgba(82, 196, 26, 0.04);
  }
}

.log-time {
  color: #999;
  white-space: nowrap;
  font-size: 11px;
  min-width: 65px;
}

.log-level {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 42px;
  min-height: 20px;
  padding: 0 7px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 18px;
  white-space: nowrap;
}

.log-level-info {
  color: #096dd9;
  background: #e6f7ff;
  border-color: #91d5ff;
}

.log-level-trade {
  color: #237804;
  background: #f6ffed;
  border-color: #b7eb8f;
}

.log-level-signal {
  color: #531dab;
  background: #f9f0ff;
  border-color: #d3adf7;
}

.log-level-warning {
  color: #874d00;
  background: #fffbe6;
  border-color: #ffd666;
}

.log-level-error {
  color: #a8071a;
  background: #fff1f0;
  border-color: #ffa39e;
}

.market-data-error {
  flex: 1;
  min-width: 0;
  padding: 9px 11px;
  border: 1px solid rgba(250, 173, 20, 0.42);
  border-radius: 6px;
  background: rgba(250, 173, 20, 0.08);
}

.market-data-error-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  color: #d48806;
}

.market-data-context {
  color: #8c8c8c;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}

.market-data-error-message {
  margin-top: 4px;
  color: inherit;
}

.market-data-error-action {
  margin-top: 5px;
  color: #8c6d1f;
  font-size: 12px;
}

.market-data-technical {
  display: inline-block;
  margin-top: 5px;
  color: #8c8c8c;
  cursor: help;
  font-size: 11px;
}

.theme-dark .market-data-error {
  border-color: rgba(250, 173, 20, 0.36);
  background: rgba(250, 173, 20, 0.1);
}

.theme-dark .market-data-error-action {
  color: #d6b35f;
}

.log-message {
  flex: 1;
  word-break: break-all;
}

.theme-dark {
  .logs-toolbar {
    .toolbar-right .auto-refresh-label {
      color: rgba(255, 255, 255, 0.4);
    }
  }

  .log-filter-tab {
    &.tab-all {
      color: rgba(255, 255, 255, 0.6);
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
      .tab-count { background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.5); }
      &:hover { background: rgba(255, 255, 255, 0.1); }
      &.active {
        color: var(--primary-color-hover, #40a9ff);
        background: rgba(24, 144, 255, 0.15);
        border-color: rgba(24, 144, 255, 0.4);
        .tab-count { background: var(--primary-color, #1890ff); color: #fff; }
      }
    }
    &.tab-trade {
      color: #73d13d;
      background: rgba(82, 196, 26, 0.08);
      border-color: rgba(82, 196, 26, 0.2);
      .tab-count { background: rgba(82, 196, 26, 0.15); color: #73d13d; }
      &:hover { background: rgba(82, 196, 26, 0.14); }
      &.active {
        color: #fff;
        background: linear-gradient(135deg, #52c41a, #389e0d);
        border-color: transparent;
        box-shadow: 0 2px 10px rgba(82, 196, 26, 0.4);
        .tab-count { background: rgba(255, 255, 255, 0.25); color: #fff; }
      }
    }
    &.tab-signal {
      color: #b37feb;
      background: rgba(114, 46, 209, 0.08);
      border-color: rgba(114, 46, 209, 0.2);
      .tab-count { background: rgba(114, 46, 209, 0.15); color: #b37feb; }
      &:hover { background: rgba(114, 46, 209, 0.14); }
      &.active {
        color: #fff;
        background: linear-gradient(135deg, #9254de, #722ed1);
        border-color: transparent;
        box-shadow: 0 2px 10px rgba(114, 46, 209, 0.4);
        .tab-count { background: rgba(255, 255, 255, 0.25); color: #fff; }
      }
    }
    &.tab-warning {
      color: #ffc53d;
      background: rgba(250, 173, 20, 0.08);
      border-color: rgba(250, 173, 20, 0.22);
      .tab-count { background: rgba(250, 173, 20, 0.16); color: #ffc53d; }
      &:hover { background: rgba(250, 173, 20, 0.14); }
      &.active {
        color: #fff;
        background: linear-gradient(135deg, #faad14, #d48806);
        border-color: transparent;
        box-shadow: 0 2px 10px rgba(250, 173, 20, 0.4);
        .tab-count { background: rgba(255, 255, 255, 0.25); color: #fff; }
      }
    }
    &.tab-error {
      color: #ff7875;
      background: rgba(255, 77, 79, 0.08);
      border-color: rgba(255, 77, 79, 0.2);
      .tab-count { background: rgba(255, 77, 79, 0.15); color: #ff7875; }
      &:hover { background: rgba(255, 77, 79, 0.14); }
      &.active {
        color: #fff;
        background: linear-gradient(135deg, #ff4d4f, #cf1322);
        border-color: transparent;
        box-shadow: 0 2px 10px rgba(255, 77, 79, 0.4);
        .tab-count { background: rgba(255, 255, 255, 0.25); color: #fff; }
      }
    }
  }

  .logs-container {
    background: #141414;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .logs-empty {
    color: rgba(255, 255, 255, 0.25);

    .anticon {
      color: rgba(255, 255, 255, 0.15) !important;
    }

    p {
      color: rgba(255, 255, 255, 0.3);
    }
  }

  .log-entry {
    &:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    &.level-error {
      background: rgba(255, 77, 79, 0.06);
    }

    &.level-warning {
      background: rgba(250, 173, 20, 0.08);
    }

    &.level-trade {
      background: rgba(82, 196, 26, 0.06);
    }
  }

  .log-time {
    color: rgba(255, 255, 255, 0.3);
  }

  .log-level-info {
    color: #69c0ff;
    background: rgba(24, 144, 255, 0.16);
    border-color: rgba(105, 192, 255, 0.45);
  }

  .log-level-trade {
    color: #95de64;
    background: rgba(82, 196, 26, 0.14);
    border-color: rgba(149, 222, 100, 0.42);
  }

  .log-level-signal {
    color: #d3adf7;
    background: rgba(114, 46, 209, 0.18);
    border-color: rgba(211, 173, 247, 0.42);
  }

  .log-level-warning {
    color: #ffd666;
    background: rgba(250, 173, 20, 0.16);
    border-color: rgba(255, 214, 102, 0.5);
  }

  .log-level-error {
    color: #ff9c9c;
    background: rgba(255, 77, 79, 0.16);
    border-color: rgba(255, 156, 156, 0.46);
  }

  .log-message {
    color: rgba(255, 255, 255, 0.75);
  }
}
</style>
