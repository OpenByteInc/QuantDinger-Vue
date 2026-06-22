<template>
  <div class="bot-list">
    <div class="list-header">
      <h3>{{ $t('trading-bot.myBots') }} <span class="count">({{ bots.length }})</span></h3>
      <div class="list-actions">
        <a-input-search
          v-model="searchText"
          :placeholder="$t('trading-bot.searchBot')"
          style="width: 220px;"
          allowClear
        />
        <a-select v-model="statusFilter" style="width: 120px;" allowClear :placeholder="$t('trading-bot.allStatus')">
          <a-select-option value="running">{{ $t('trading-bot.status.running') }}</a-select-option>
          <a-select-option value="stopped">{{ $t('trading-bot.status.stopped') }}</a-select-option>
          <a-select-option value="error">{{ $t('trading-bot.status.error') }}</a-select-option>
        </a-select>
      </div>
    </div>

    <a-spin :spinning="loading">
      <div v-if="filteredBots.length === 0 && !loading" class="empty-state">
        <a-empty :description="$t('trading-bot.noBots')" />
      </div>

      <div v-else class="bot-table-list">
        <div
          v-for="item in filteredBots"
          :key="item.id"
          :class="['bot-row', { active: selectedId === item.id }]"
          @click="$emit('select', item)"
        >
          <div class="bot-type-icon" :style="{ background: getBotTypeGradient(item.bot_type) }">
            <a-icon :type="getBotTypeIcon(item.bot_type)" />
          </div>
          <div class="bot-info">
            <div class="bot-name">{{ item.strategy_name }}</div>
            <div class="bot-meta">
              <a-tag size="small" color="blue" v-if="item.bot_type">{{ getBotTypeName(item.bot_type) }}</a-tag>
              <span class="meta-text" v-if="item.trading_config && item.trading_config.symbol">{{ item.trading_config.symbol }}</span>
              <span class="meta-text" v-if="item.exchange_config && item.exchange_config.exchange_id">{{ getExchangeName(item.exchange_config.exchange_id) }}</span>
            </div>
            <div class="bot-submeta" v-if="budgetText(item)">
              <span class="meta-text">{{ budgetLabel(item) }}: {{ budgetText(item) }}</span>
            </div>
          </div>
          <div class="bot-pnl" :class="{ positive: (item.unrealized_pnl || 0) >= 0, negative: (item.unrealized_pnl || 0) < 0 }">
            {{ (item.unrealized_pnl || 0) >= 0 ? '+' : '' }}${{ (item.unrealized_pnl || 0).toFixed(2) }}
          </div>
          <div class="bot-status-badge">
            <span :class="['dot', item.status || 'stopped']"></span>
            <span class="text">{{ getStatusText(item.status) }}</span>
          </div>
          <div class="bot-actions" @click.stop>
            <a-button
              v-if="item.status !== 'running'"
              class="bot-action-btn bot-action-btn--start"
              type="primary"
              size="small"
              ghost
              :loading="actionLoadingId === item.id"
              @click="$emit('start', item)"
            >
              <a-icon type="play-circle" />
            </a-button>
            <a-button
              v-else
              class="bot-action-btn bot-action-btn--pause"
              type="danger"
              size="small"
              ghost
              :loading="actionLoadingId === item.id"
              @click="$emit('stop', item)"
            >
              <a-icon type="pause-circle" />
            </a-button>
            <a-button class="bot-action-btn" size="small" @click="$emit('select', item)">
              <a-icon type="eye" />
            </a-button>
            <a-button
              class="bot-action-btn"
              size="small"
              @click="$emit('edit', item)"
              :disabled="item.status === 'running'"
            >
              <a-icon type="edit" />
            </a-button>
            <a-button class="bot-action-btn bot-action-btn--delete" size="small" type="danger" ghost @click="$emit('delete', item)" :disabled="item.status === 'running'">
              <a-icon type="delete" />
            </a-button>
          </div>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script>
const TYPE_META = {
  grid: { icon: 'bar-chart', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  martingale: { icon: 'fall', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  trend: { icon: 'stock', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  dca: { icon: 'fund', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  arbitrage: { icon: 'swap', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  custom: { icon: 'code', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' }
}

export default {
  name: 'BotList',
  props: {
    bots: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    selectedId: { type: [Number, String], default: null },
    actionLoadingId: { type: [Number, String], default: null }
  },
  data () {
    return {
      searchText: '',
      statusFilter: undefined
    }
  },
  computed: {
    filteredBots () {
      let list = this.bots
      if (this.searchText) {
        const q = this.searchText.toLowerCase()
        list = list.filter(b =>
          (b.strategy_name || '').toLowerCase().includes(q) ||
          (b.trading_config?.symbol || '').toLowerCase().includes(q)
        )
      }
      if (this.statusFilter) {
        list = list.filter(b => b.status === this.statusFilter)
      }
      return list
    }
  },
  methods: {
    getBotTypeIcon (type) {
      return (TYPE_META[type] || TYPE_META.custom).icon
    },
    getBotTypeGradient (type) {
      return (TYPE_META[type] || TYPE_META.custom).gradient
    },
    getBotTypeName (type) {
      return this.$t(`trading-bot.type.${type}`) || type
    },
    getExchangeName (id) {
      return { binance: 'Binance', bybit: 'Bybit', gate: 'Gate.io', okx: 'OKX' }[id] || id
    },
    getStatusText (s) {
      const map = {
        running: this.$t('trading-bot.status.running'),
        stopped: this.$t('trading-bot.status.stopped'),
        error: this.$t('trading-bot.status.error'),
        creating: this.$t('trading-bot.status.creating')
      }
      return map[s] || s || this.$t('trading-bot.status.stopped')
    },
    budgetLabel (item) {
      const labelKey = item?.bot_display?.capital_label_key
      if (labelKey) return this.$t(labelKey)
      return item?.bot_type === 'martingale'
        ? this.$t('trading-bot.martingale.totalBudget')
        : this.$t('trading-bot.wizard.initialCapital')
    },
    budgetText (item) {
      const val = item?.trading_config?.initial_capital
      if (val === null || val === undefined || val === '') return ''
      const n = Number(val)
      if (!Number.isFinite(n)) return ''
      return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
    }
  }
}
</script>

<style lang="less" scoped>
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 10px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: #262626;

    .count { color: #8c8c8c; font-weight: 400; }
  }

  .list-actions {
    display: flex;
    gap: 8px;
  }
}

.empty-state {
  padding: 48px 0;
  text-align: center;
}

.bot-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid #f0f0f0;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;

  &:hover {
    border-color: #d9d9d9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  &.active {
    border-color: #91d5ff;
    background: #e6f7ff;
  }
}

.bot-type-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  flex-shrink: 0;
}

.bot-info {
  flex: 1;
  min-width: 0;

  .bot-name {
    font-weight: 600;
    font-size: 14px;
    color: #262626;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bot-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;

    .meta-text {
      font-size: 12px;
      color: #8c8c8c;
    }
  }

  .bot-submeta {
    margin-top: 2px;

    .meta-text {
      font-size: 12px;
      color: #8c8c8c;
    }
  }
}

.bot-pnl {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  min-width: 90px;
  text-align: right;

  &.positive { color: #52c41a; }
  &.negative { color: #f5222d; }
}

.bot-status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  min-width: 70px;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &.running {
      background: #52c41a;
      box-shadow: 0 0 6px rgba(82, 196, 26, 0.4);
      animation: pulse 2s infinite;
    }

    &.stopped { background: #d9d9d9; }
    &.error { background: #f5222d; }
  }

  .text {
    font-size: 12px;
    color: #8c8c8c;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.bot-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.bot-action-btn {
  min-width: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff !important;
  border-color: #d9e2ef !important;
  color: #49627f !important;

  .anticon {
    color: inherit !important;
  }

  &:hover,
  &:focus {
    border-color: var(--primary-color, #1890ff) !important;
    color: var(--primary-color, #1890ff) !important;
  }
}

.bot-action-btn--start {
  background: #eef6ff !important;
  border-color: #91caff !important;
  color: #1677ff !important;

  &:hover,
  &:focus {
    background: #e6f4ff !important;
    border-color: #1677ff !important;
    color: #0958d9 !important;
  }
}

.bot-action-btn--pause,
.bot-action-btn--delete {
  background: #fff7f7 !important;
  border-color: #ffccc7 !important;
  color: #cf1322 !important;

  &:hover,
  &:focus {
    background: #fff1f0 !important;
    border-color: #ff4d4f !important;
    color: #a8071a !important;
  }
}

@media (max-width: 768px) {
  .bot-pnl { display: none; }

  .bot-row {
    flex-wrap: wrap;
  }
}
</style>
