<template>
  <div class="position-records strategy-tab-pane-inner" :class="{ 'theme-dark': isDark }">
    <div class="positions-section">
      <a-alert
        v-if="showReconciliationAlert"
        class="position-reconciliation-alert"
        type="warning"
        show-icon
        :message="reconciliationMessage"
      >
        <template slot="description">
          <a-button type="link" size="small" @click="openOwnershipRepair">
            {{ $t('strategyCenter.positionOwnership.resolveNow') }}
          </a-button>
        </template>
      </a-alert>
      <div v-if="executionMode === 'live'" class="ownership-toolbar">
        <span>{{ $t('strategyCenter.positionOwnership.summary') }}</span>
        <a-button size="small" icon="safety-certificate" @click="openOwnershipRepair">
          {{ $t('strategyCenter.positionOwnership.openRepair') }}
        </a-button>
      </div>
      <div v-if="positions.length === 0 && !loading" class="empty-state strategy-tab-empty" :class="{ 'is-compact': compact }">
        <template v-if="compact">
          <a-icon type="inbox" />
          <span>{{ $t('trading-assistant.table.noPositions') }}</span>
        </template>
        <a-empty v-else :image="false" :description="$t('trading-assistant.table.noPositions')" />
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
        <template slot="priceSummary" slot-scope="text, record">
          <span class="position-price-summary">
            <span>{{ formatPrice(record.entry_price) }}</span>
            <a-icon type="arrow-right" />
            <strong>{{ formatPrice(record.current_price) }}</strong>
          </span>
        </template>
        <template slot="pnlSummary" slot-scope="text, record">
          <span class="position-pnl-summary" :class="pnlClass(record.unrealized_pnl)">
            <strong>{{ formatSignedMoney(record.unrealized_pnl) }}</strong>
            <small>{{ formatPercent(record.position_margin_pnl_percent) }}</small>
          </span>
        </template>
        <template slot="leverage">
          <strong class="position-leverage">{{ effectiveLeverage }}x</strong>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model="ownershipVisible"
      :title="$t('strategyCenter.positionOwnership.title')"
      :footer="null"
      :width="1120"
      destroy-on-close
    >
      <a-alert
        class="ownership-risk-alert"
        type="warning"
        show-icon
        :message="$t('strategyCenter.positionOwnership.riskTitle')"
        :description="$t('strategyCenter.positionOwnership.riskDescription')"
      />
      <a-alert
        class="ownership-risk-alert"
        type="info"
        show-icon
        :message="$t('strategyCenter.positionOwnership.toleranceHelp')"
      />
      <a-table
        :columns="ownershipColumns"
        :data-source="ownershipRows"
        :loading="ownershipLoading"
        :pagination="false"
        row-key="rowKey"
        size="small"
        :scroll="{ x: 1080 }"
      >
        <template slot="ownershipSide" slot-scope="text, record">
          <a-tag :color="record.side === 'long' ? 'green' : 'red'">
            {{ record.side === 'long' ? $t('trading-assistant.table.long') : $t('trading-assistant.table.short') }}
          </a-tag>
        </template>
        <template slot="ownershipQty" slot-scope="text">
          {{ formatOwnershipQty(text) }}
        </template>
        <template slot="ownershipDifference" slot-scope="text, record">
          <span :class="{ 'text-danger': Number(text) < -Number(record.tolerance || 0) }">
            {{ formatOwnershipQty(text) }}
          </span>
          <div v-if="record.difference_quote != null">{{ $t('strategyCenter.positionOwnership.quoteDifference', { value: formatSignedMoney(record.difference_quote) }) }}</div>
        </template>
        <template slot="ownershipAllocations" slot-scope="text, record">
          <a-popover v-if="record.allocations && record.allocations.length" :title="$t('strategyCenter.positionOwnership.relatedStrategies')">
            <template slot="content">
              <div v-for="allocation in record.allocations" :key="allocation.strategy_id">
                {{ allocation.strategy_name }} #{{ allocation.strategy_id }} · {{ formatOwnershipQty(allocation.quantity) }}
              </div>
            </template>
            <a>{{ formatOwnershipQty(text) }} <a-icon type="info-circle" /></a>
          </a-popover>
          <span v-else>{{ formatOwnershipQty(text) }}</span>
        </template>
        <template slot="ownershipStatus" slot-scope="text, record">
          <a-tag :color="record.status === 'ok' ? 'green' : 'orange'">
            {{ record.status === 'ok' ? $t('strategyCenter.positionOwnership.normal') : $t('strategyCenter.positionOwnership.blocked') }}
          </a-tag>
        </template>
        <template slot="ownershipMode" slot-scope="text, record">
          {{ record.coexistence_mode === 'advanced' ? $t('strategyCenter.positionOwnership.advanced') : $t('strategyCenter.positionOwnership.strict') }}
        </template>
        <template slot="ownershipActions" slot-scope="text, record">
          <span v-if="record.repair_kind === 'allocation_shortfall'">
            <a-tooltip :title="$t('strategyCenter.positionOwnership.shortfallHelp')">
              <a-tag color="red">{{ $t('strategyCenter.positionOwnership.shortfall') }}</a-tag>
            </a-tooltip>
          </span>
          <a-popconfirm
            v-else-if="record.repair_kind === 'reset_protection'"
            :title="$t('strategyCenter.positionOwnership.resetProtectionConfirm')"
            :ok-text="$t('common.confirm')"
            :cancel-text="$t('common.cancel')"
            @confirm="repairOwnership(record, 'reset_protection')"
          >
            <a-button type="link" size="small" :loading="ownershipRepairKey === record.rowKey">
              {{ $t('strategyCenter.positionOwnership.resetProtection') }}
            </a-button>
          </a-popconfirm>
          <a-popconfirm
            v-else-if="ownershipAdvancedAvailable && Number(record.unknown_qty || 0) > Number(record.tolerance || 0)"
            :title="$t('strategyCenter.positionOwnership.protectConfirm')"
            :ok-text="$t('strategyCenter.positionOwnership.protectManual')"
            :cancel-text="$t('common.cancel')"
            @confirm="repairOwnership(record, 'protect_manual')"
          >
            <a-button type="link" size="small" :loading="ownershipRepairKey === record.rowKey">
              {{ $t('strategyCenter.positionOwnership.protectManual') }}
            </a-button>
          </a-popconfirm>
          <a-popconfirm
            v-else-if="record.coexistence_mode === 'advanced'"
            :title="$t('strategyCenter.positionOwnership.strictConfirm')"
            :ok-text="$t('strategyCenter.positionOwnership.useStrict')"
            :cancel-text="$t('common.cancel')"
            @confirm="repairOwnership(record, 'strict_mode')"
          >
            <a-button type="link" size="small" :loading="ownershipRepairKey === record.rowKey">
              {{ $t('strategyCenter.positionOwnership.useStrict') }}
            </a-button>
          </a-popconfirm>
          <a-button type="link" size="small" @click="repairOwnership(record, 'recheck')">
            {{ $t('strategyCenter.positionOwnership.recheck') }}
          </a-button>
        </template>
      </a-table>
      <a-alert
        v-if="ownershipRows.some(row => row.repair_kind === 'allocation_shortfall')"
        class="ownership-risk-alert"
        type="warning"
        show-icon
        :message="$t('strategyCenter.positionOwnership.shortfall')"
        :description="$t('strategyCenter.positionOwnership.shortfallHelp')"
      />
    </a-modal>
  </div>
</template>

<script>
import {
  getStrategyPositionOwnership,
  getStrategyPositions,
  repairStrategyPositionOwnership
} from '@/api/strategy'
import { createVisibilityPolling } from '@/utils/visibilityPolling'

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
    compact: {
      type: Boolean,
      default: false
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
      },
      ownershipVisible: false,
      ownershipLoading: false,
      ownershipRepairKey: '',
      ownershipAdvancedAvailable: false,
      ownershipRows: [],
      pollingTimer: null,
      positionPoller: null
    }
  },
  computed: {
    showReconciliationAlert () {
      const status = String((this.reconciliation && this.reconciliation.status) || 'not_checked')
      return !['ok', 'not_checked'].includes(status)
    },
    reconciliationMessage () {
      const status = String((this.reconciliation && this.reconciliation.status) || '')
      const messageKeys = {
        account_only: 'trading-assistant.positions.reconciliation.accountOnly',
        strategy_only: 'trading-assistant.positions.reconciliation.strategyOnly',
        mismatch: 'trading-assistant.positions.reconciliation.mismatch',
        error: 'trading-assistant.positions.reconciliation.error'
      }
      return messageKeys[status] ? this.$t(messageKeys[status]) : ''
    },
    columns () {
      if (this.compact) {
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
            width: 84,
            scopedSlots: { customRender: 'side' }
          },
          {
            title: this.$t('trading-assistant.table.size'),
            dataIndex: 'size',
            key: 'size',
            width: 118,
            scopedSlots: { customRender: 'size' }
          },
          {
            title: this.$t('trading-assistant.table.notional'),
            dataIndex: 'notional',
            key: 'notional',
            width: 132,
            scopedSlots: { customRender: 'notional' }
          },
          {
            title: `${this.$t('trading-assistant.table.entryPrice')} / ${this.$t('trading-assistant.table.currentPrice')}`,
            key: 'price_summary',
            width: 190,
            scopedSlots: { customRender: 'priceSummary' }
          },
          {
            title: `${this.$t('trading-assistant.table.unrealizedPnl')} / ${this.$t('trading-assistant.table.positionRoi')}`,
            key: 'pnl_summary',
            width: 170,
            scopedSlots: { customRender: 'pnlSummary' }
          },
          {
            title: this.$t('trading-assistant.form.leverage'),
            key: 'leverage',
            width: 86,
            scopedSlots: { customRender: 'leverage' }
          }
        ]
      }
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
          title: this.$t('trading-assistant.table.notional'),
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
    },
    ownershipColumns () {
      const quantitySlot = { customRender: 'ownershipQty' }
      return [
        { title: this.$t('trading-assistant.table.symbol'), dataIndex: 'symbol', width: 118 },
        { title: this.$t('trading-assistant.table.side'), dataIndex: 'side', width: 76, scopedSlots: { customRender: 'ownershipSide' } },
        { title: this.$t('strategyCenter.positionOwnership.accountQty'), dataIndex: 'account_qty', width: 112, scopedSlots: quantitySlot },
        { title: this.$t('strategyCenter.positionOwnership.relatedStrategies'), dataIndex: 'strategy_qty', width: 140, scopedSlots: { customRender: 'ownershipAllocations' } },
        { title: this.$t('strategyCenter.positionOwnership.protectedQty'), dataIndex: 'protected_qty', width: 112, scopedSlots: quantitySlot },
        { title: this.$t('strategyCenter.positionOwnership.unknownQty'), dataIndex: 'unknown_qty', width: 150, scopedSlots: { customRender: 'ownershipDifference' } },
        { title: this.$t('strategyCenter.positionOwnership.mode'), dataIndex: 'coexistence_mode', width: 90, scopedSlots: { customRender: 'ownershipMode' } },
        { title: this.$t('strategyCenter.positionOwnership.status'), dataIndex: 'status', width: 90, scopedSlots: { customRender: 'ownershipStatus' } },
        { title: this.$t('common.actions'), key: 'actions', fixed: 'right', width: 190, scopedSlots: { customRender: 'ownershipActions' } }
      ]
    },
    effectiveLeverage () {
      if (String(this.marketType || '').toLowerCase() === 'spot') return 1
      const parsed = parseFloat(this.leverage)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
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
    async openOwnershipRepair () {
      this.ownershipVisible = true
      await this.loadOwnership()
    },
    async loadOwnership () {
      if (!this.strategyId) return
      this.ownershipLoading = true
      try {
        const res = await getStrategyPositionOwnership(this.strategyId)
        if (res.code !== 1) throw new Error(this.$t(res.msg || 'strategyCenter.positionOwnership.loadFailed'))
        const data = res.data || {}
        const rows = data.items || []
        this.ownershipAdvancedAvailable = Boolean(data.advanced_coexistence_available)
        this.ownershipRows = rows.map(row => ({
          ...row,
          rowKey: `${row.symbol || ''}:${row.side || ''}`
        }))
      } catch (error) {
        this.ownershipAdvancedAvailable = false
        this.ownershipRows = []
        this.$message.error((error && error.message) || this.$t('strategyCenter.positionOwnership.loadFailed'))
      } finally {
        this.ownershipLoading = false
      }
    },
    async repairOwnership (record, action) {
      this.ownershipRepairKey = record.rowKey
      try {
        const res = await repairStrategyPositionOwnership({
          id: this.strategyId,
          symbol: record.symbol,
          side: record.side,
          action
        })
        if (res.code !== 1) throw new Error(res.msg ? this.$t(res.msg) : this.$t('strategyCenter.positionOwnership.repairFailed'))
        this.$message.success(this.$t('strategyCenter.positionOwnership.repairSuccess'))
        await Promise.all([this.loadOwnership(), this.loadPositions()])
      } catch (error) {
        this.$message.error((error && error.message) || this.$t('strategyCenter.positionOwnership.repairFailed'))
      } finally {
        this.ownershipRepairKey = ''
      }
    },
    formatOwnershipQty (value) {
      const quantity = Number(value || 0)
      return Number.isFinite(quantity) ? quantity.toFixed(8).replace(/0+$/, '').replace(/\.$/, '') || '0' : '0'
    },
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
    formatPrice (value) {
      const parsed = this.safeNumber(value)
      return Number.isFinite(parsed) && parsed > 0 ? parsed.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '--'
    },
    formatSignedMoney (value) {
      const parsed = this.safeNumber(value)
      const amount = Number.isFinite(parsed) ? parsed : 0
      return `${amount > 0 ? '+' : amount < 0 ? '-' : ''}$${Math.abs(amount).toFixed(2)}`
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
      this.positionPoller = createVisibilityPolling(() => this.loadPositions(), 15000, {
        immediate: false
      })
      this.positionPoller.start()
    },
    stopPolling () {
      if (this.positionPoller) {
        this.positionPoller.stop()
        this.positionPoller = null
      }
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

  .empty-state.is-compact {
    flex-direction: column;
    gap: 8px;
    min-height: 112px;
    padding: 24px 16px;
    color: #8b95a3;

    > .anticon { font-size: 22px; }
  }

  &.theme-dark .empty-state {
    background: #141414;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .position-reconciliation-alert {
    margin-bottom: 12px;
    border-radius: 6px;
  }

  .ownership-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    color: #64748b;
    background: #f8fafc;
  }

  &.theme-dark .ownership-toolbar {
    color: #aeb7c4;
    border-color: #363c4e;
    background: #20232b;
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

  .position-price-summary,
  .position-pnl-summary {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .position-price-summary {
    color: #64748b;

    .anticon { color: #94a3b8; font-size: 10px; }
    strong { color: #273244; font-weight: 650; }
  }

  .position-pnl-summary {
    small { font-size: 11px; font-weight: 650; opacity: .82; }
  }

  .position-leverage {
    color: #9a6b00;
    font-variant-numeric: tabular-nums;
  }

  &.theme-dark {
    .position-price-summary {
      color: #8f98a5;

      strong { color: #e0e4e9; }
    }

    .position-leverage { color: #d9a928; }
  }
}

.ownership-risk-alert {
  margin-bottom: 16px;
}
</style>
