<template>
  <div class="position-records strategy-tab-pane-inner" :class="{ 'theme-dark': isDark }">
    <div class="positions-section">
      <a-alert
        v-if="showReconciliationAlert"
        class="position-reconciliation-alert"
        type="warning"
        show-icon
        :message="reconciliationMessage"
      />
      <div v-if="positions.length === 0 && !loading" class="empty-state strategy-tab-empty">
        <a-empty :description="$t('trading-assistant.table.noPositions')" />
      </div>
      <a-table
        v-else
        :columns="columns"
        :data-source="positions"
        :loading="loading"
        :pagination="false"
        size="small"
        rowKey="id"
        :scroll="{ x: 960 }"
      >
        <template slot="symbol" slot-scope="text, record">
          <strong>{{ record.symbol || text }}</strong>
        </template>
        <template slot="side" slot-scope="text, record">
          <a-tag :color="(record.side || text) === 'long' ? 'green' : 'red'">
            {{ (record.side || text) === 'long' ? $t('trading-assistant.table.long') : $t('trading-assistant.table.short') }}
          </a-tag>
        </template>
        <template slot="entryPrice" slot-scope="text, record">
          <span v-if="hasValidPrice(record.entry_price || text)">
            ${{ parseFloat(record.entry_price || text).toFixed(4) }}
          </span>
          <span v-else>--</span>
        </template>
        <template slot="currentPrice" slot-scope="text, record">
          ${{ parseFloat(record.current_price || text || 0).toFixed(4) }}
        </template>
        <template slot="size" slot-scope="text, record">
          {{ parseFloat(record.size || text || 0).toFixed(4) }}
        </template>
        <template slot="notional" slot-scope="text, record">
          <span v-if="getNotional(record) > 0">${{ getNotional(record).toFixed(2) }}</span>
          <span v-else>--</span>
        </template>
        <template slot="unrealizedPnl" slot-scope="text, record">
          <span :class="{ 'profit': parseFloat(record.unrealized_pnl || text || 0) > 0, 'loss': parseFloat(record.unrealized_pnl || text || 0) < 0 }">
            ${{ parseFloat(record.unrealized_pnl || text || 0).toFixed(2) }}
          </span>
        </template>
        <template slot="positionRoi" slot-scope="text, record">
          <span :class="pnlClass(record.position_margin_pnl_percent || text)">
            {{ formatPercent(record.position_margin_pnl_percent || text) }}
          </span>
        </template>
        <template slot="capitalContribution" slot-scope="text, record">
          <span :class="pnlClass(record.strategy_capital_pnl_percent || text)">
            {{ formatPercent(record.strategy_capital_pnl_percent || text) }}
          </span>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script>
import { getStrategyPositions } from '@/api/strategy'

export default {
  name: 'PositionRecords',
  props: {
    strategyId: {
      type: Number,
      required: true
    },
    executionMode: {
      type: String,
      default: 'signal'
    },
    marketType: {
      type: String,
      default: 'swap'
    },
    leverage: {
      type: [Number, String],
      default: 1
    },
    loading: {
      type: Boolean,
      default: false
    },
    isDark: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      positions: [],
      reconciliation: {
        status: 'not_checked',
        notes: [],
        account_positions: []
      }
    }
  },
  computed: {
    showReconciliationAlert () {
      const status = String((this.reconciliation && this.reconciliation.status) || 'not_checked')
      return !['ok', 'not_checked'].includes(status)
    },
    reconciliationMessage () {
      const status = String((this.reconciliation && this.reconciliation.status) || '')
      const notes = (this.reconciliation && this.reconciliation.notes) || []
      const detail = Array.isArray(notes) && notes.length ? ` (${notes.slice(0, 2).join('; ')})` : ''
      const messageKeys = {
        account_only: 'trading-assistant.positions.reconciliation.accountOnly',
        strategy_only: 'trading-assistant.positions.reconciliation.strategyOnly',
        mismatch: 'trading-assistant.positions.reconciliation.mismatch',
        error: 'trading-assistant.positions.reconciliation.error'
      }
      return messageKeys[status] ? `${this.$t(messageKeys[status])}${detail}` : ''
    },
    columns () {
      return [
        {
          title: this.$t('trading-assistant.table.symbol'),
          dataIndex: 'symbol',
          key: 'symbol',
          width: 120,
          scopedSlots: { customRender: 'symbol' }
        },
        {
          title: this.$t('trading-assistant.table.side'),
          dataIndex: 'side',
          key: 'side',
          width: 80,
          scopedSlots: { customRender: 'side' }
        },
        {
          title: this.$t('trading-assistant.table.size'),
          dataIndex: 'size',
          key: 'size',
          width: 120,
          scopedSlots: { customRender: 'size' }
        },
        {
          title: this.$t('trading-assistant.table.notional') || 'Value (USDT)',
          dataIndex: 'notional',
          key: 'notional',
          width: 130,
          scopedSlots: { customRender: 'notional' }
        },
        {
          title: this.$t('trading-assistant.table.entryPrice'),
          dataIndex: 'entry_price',
          key: 'entry_price',
          width: 120,
          scopedSlots: { customRender: 'entryPrice' }
        },
        {
          title: this.$t('trading-assistant.table.currentPrice'),
          dataIndex: 'current_price',
          key: 'current_price',
          width: 120,
          scopedSlots: { customRender: 'currentPrice' }
        },
        {
          title: this.$t('trading-assistant.table.unrealizedPnl'),
          dataIndex: 'unrealized_pnl',
          key: 'unrealized_pnl',
          width: 120,
          scopedSlots: { customRender: 'unrealizedPnl' }
        },
        {
          title: this.$t('trading-assistant.table.positionRoi'),
          dataIndex: 'position_margin_pnl_percent',
          key: 'position_margin_pnl_percent',
          width: 120,
          scopedSlots: { customRender: 'positionRoi' }
        },
        {
          title: this.$t('trading-assistant.table.capitalContribution'),
          dataIndex: 'strategy_capital_pnl_percent',
          key: 'strategy_capital_pnl_percent',
          width: 120,
          scopedSlots: { customRender: 'capitalContribution' }
        }
      ]
    }
  },
  watch: {
    strategyId: {
      handler (val) {
        if (val) {
          this.loadPositions()
          this.startPolling()
        } else {
          this.stopPolling()
        }
      },
      immediate: true
    }
  },
  beforeDestroy () {
    this.stopPolling()
  },
  methods: {
    async loadPositions () {
      if (!this.strategyId) return

      try {
        const res = await getStrategyPositions(this.strategyId)
        if (res.code === 1) {
          const rawPositions = res.data.positions || res.data.items || []
          this.reconciliation = res.data.account_reconciliation || {
            status: 'not_checked',
            notes: [],
            account_positions: []
          }

          this.positions = rawPositions.map((position, index) => {
            const mt = String(this.marketType || 'swap').toLowerCase()
            let lev = parseFloat(this.leverage)
            if (!isFinite(lev) || lev <= 0) lev = 1
            if (mt === 'spot') lev = 1

            const entryPrice = parseFloat(position.entry_price || position.entryPrice || 0)
            const size = parseFloat(position.size || '0') || 0
            const pnl = parseFloat(position.unrealized_pnl || position.unrealizedPnl || '0') || 0
            const notional = parseFloat(position.notional_value || position.notionalValue || 0) || (entryPrice > 0 && size > 0 ? entryPrice * size : 0)
            const legacyPct = this.safeNumber(position.pnl_percent ?? position.pnlPercent)
            let marginPct = this.safeNumber(position.position_margin_pnl_percent ?? position.positionMarginPnlPercent)
            if (!Number.isFinite(marginPct)) {
              marginPct = Number.isFinite(legacyPct) ? legacyPct : (notional > 0 ? (pnl / notional) * 100 * lev : 0)
            }
            let capitalPct = this.safeNumber(position.strategy_capital_pnl_percent ?? position.capital_contribution_percent ?? position.strategyCapitalPnlPercent)
            if (!Number.isFinite(capitalPct)) capitalPct = 0

            return {
              id: position.id || index,
              symbol: position.symbol || '',
              side: position.side || 'long',
              size: size > 0 ? size.toString() : '0',
              entry_price: entryPrice > 0 ? entryPrice.toString() : '0',
              current_price: position.current_price || position.currentPrice || '0',
              unrealized_pnl: position.unrealized_pnl || position.unrealizedPnl || '0',
              pnl_percent: marginPct,
              position_margin_pnl_percent: marginPct,
              position_notional_pnl_percent: this.safeNumber(position.position_notional_pnl_percent ?? position.positionNotionalPnlPercent) || 0,
              strategy_capital_pnl_percent: capitalPct,
              notional_value: notional,
              updated_at: position.updated_at || position.updatedAt || ''
            }
          })
        } else {
          this.positions = []
          this.reconciliation = { status: 'not_checked', notes: [], account_positions: [] }
        }
      } catch (error) {
        this.positions = []
        this.reconciliation = { status: 'not_checked', notes: [], account_positions: [] }
      }
    },
    hasValidPrice (price) {
      const value = parseFloat(price)
      return Number.isFinite(value) && value > 0
    },
    safeNumber (value) {
      if (value === null || value === undefined || value === '') return NaN
      const parsed = parseFloat(value)
      return Number.isFinite(parsed) ? parsed : NaN
    },
    formatPercent (value) {
      const parsed = this.safeNumber(value)
      return `${(Number.isFinite(parsed) ? parsed : 0).toFixed(2)}%`
    },
    pnlClass (value) {
      const parsed = this.safeNumber(value)
      return {
        profit: Number.isFinite(parsed) && parsed > 0,
        loss: Number.isFinite(parsed) && parsed < 0
      }
    },
    getNotional (record) {
      const supplied = parseFloat(record.notional_value || 0)
      if (Number.isFinite(supplied) && supplied > 0) return supplied
      const size = parseFloat(record.size || 0)
      const cp = parseFloat(record.current_price || 0)
      if (size > 0 && cp > 0) return size * cp
      const ep = parseFloat(record.entry_price || 0)
      if (size > 0 && ep > 0) return size * ep
      return 0
    },
    startPolling () {
      this.stopPolling()
      this.pollingTimer = setInterval(() => {
        this.loadPositions()
      }, 5000)
    },
    stopPolling () {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    }
  }
}
</script>

<style lang="less" scoped>
@primary-color: #1890ff;
@success-color: #0ecb81;
@danger-color: #f6465d;

.position-records {
  width: 100%;
  min-height: 300px;
  padding: 0;

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 220px;
    padding: 40px 16px;
    border-radius: 8px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
  }

  &.theme-dark .empty-state {
    background: #141414;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .position-reconciliation-alert {
    margin-bottom: 12px;
    border-radius: 6px;
  }

  ::v-deep .ant-table {
    font-size: 13px;
    color: #333;
  }

  ::v-deep .ant-table-body {
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  }

  ::v-deep .ant-table-thead > tr > th {
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    font-weight: 600;
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
    padding: 12px 16px;
    font-size: 13px;
  }

  ::v-deep .ant-table-tbody > tr > td {
    padding: 12px 16px;
    color: #334155;
    border-bottom: 1px solid #f1f5f9;
  }

  ::v-deep .ant-tag {
    border-radius: 6px;
    padding: 2px 10px;
    font-weight: 600;
    font-size: 11px;
    border: none;

    &[color="green"] {
      background: linear-gradient(135deg, rgba(14, 203, 129, 0.15) 0%, rgba(14, 203, 129, 0.08) 100%);
      color: @success-color;
      border: 1px solid rgba(14, 203, 129, 0.3);
    }

    &[color="red"] {
      background: linear-gradient(135deg, rgba(246, 70, 93, 0.15) 0%, rgba(246, 70, 93, 0.08) 100%);
      color: @danger-color;
      border: 1px solid rgba(246, 70, 93, 0.3);
    }
  }

  &.theme-dark {
    ::v-deep .ant-table {
      background: #1c1c1c !important;
      color: #d1d4dc !important;
    }

    ::v-deep .ant-table-thead > tr > th {
      background: #2a2e39 !important;
      color: #d1d4dc !important;
      border-bottom-color: #363c4e !important;
    }

    ::v-deep .ant-table-tbody > tr > td {
      background: #1c1c1c !important;
      color: #d1d4dc !important;
      border-bottom-color: #363c4e !important;
    }
  }

  .profit {
    color: @success-color;
    font-weight: 700;
  }

  .loss {
    color: @danger-color;
    font-weight: 700;
  }
}
</style>
