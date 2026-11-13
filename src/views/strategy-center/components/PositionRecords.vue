<template>
  <div class="position-records strategy-tab-pane-inner" :class="{ 'theme-dark': isDark }">
    <div class="positions-section">
      <a-alert
        v-if="showReconciliationAlert"
        class="ownership-warning-alert position-reconciliation-alert"
        :class="{ 'is-dark': isDark }"
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
      <div v-else-if="executionMode === 'signal'" class="virtual-account-note" role="note">
        <span class="virtual-account-note__icon"><a-icon type="experiment" /></span>
        <span class="virtual-account-note__copy">{{ $t('strategyCenter.console.virtualPositionsHint') }}</span>
      </div>
      <div v-if="portfolio && positions.length" class="portfolio-position-summary">
        <div>
          <span>{{ $t('strategyCenter.console.currentPositions') }}</span>
          <strong>{{ positionSummary.count }}</strong>
        </div>
        <div>
          <span>{{ $t('trading-assistant.table.positionCost') }}</span>
          <strong>{{ formatMoney(positionSummary.cost) }}</strong>
        </div>
        <div>
          <span>{{ $t('trading-assistant.table.marketValue') }}</span>
          <strong>{{ formatMoney(positionSummary.marketValue) }}</strong>
        </div>
        <div>
          <span>{{ $t('trading-assistant.table.unrealizedPnl') }}</span>
          <strong :class="pnlClass(positionSummary.unrealizedPnl)">{{ formatSignedMoney(positionSummary.unrealizedPnl) }}</strong>
        </div>
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
        :scroll="{ x: compact ? (portfolio ? 1130 : 1060) : (portfolio ? 1380 : 1260) }"
      >
        <template slot="symbol" slot-scope="text, record">
          <span class="position-symbol">
            <strong>{{ record.symbol || text }}</strong>
            <a-tooltip v-if="record.position_state === 'exit_residual'" :title="$t('quickTrade.dustBalanceHint')">
              <a-tag color="orange" class="position-residual-tag">
                {{ $t('quickTrade.dustBalance') }}
              </a-tag>
            </a-tooltip>
          </span>
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
        <template slot="weight" slot-scope="text, record">
          <strong class="position-weight">{{ formatPercent(getPositionWeight(record)) }}</strong>
        </template>
        <template slot="positionCost" slot-scope="text, record">
          <span v-if="getPositionCost(record) > 0">{{ formatMoney(getPositionCost(record)) }}</span>
          <span v-else>--</span>
        </template>
        <template slot="marketValue" slot-scope="text, record">
          <span v-if="getMarketValue(record) > 0">{{ formatMoney(getMarketValue(record)) }}</span>
          <span v-else>--</span>
        </template>
        <template slot="valueSummary" slot-scope="text, record">
          <span class="position-value-summary">
            <span>{{ formatMoney(getPositionCost(record)) }}</span>
            <a-icon type="arrow-right" />
            <strong>{{ formatMoney(getMarketValue(record)) }}</strong>
          </span>
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
      <div class="ownership-guidance" :class="{ 'is-dark': isDark }">
        <div class="ownership-guidance__main">
          <span class="ownership-guidance__icon">
            <a-icon type="safety-certificate" />
          </span>
          <div class="ownership-guidance__copy">
            <strong>{{ $t('strategyCenter.positionOwnership.riskTitle') }}</strong>
            <p>{{ $t(ownershipExchangeId === 'alpaca' ? 'strategyCenter.positionOwnership.alpacaRiskDescription' : 'strategyCenter.positionOwnership.riskDescription') }}</p>
          </div>
        </div>
        <div class="ownership-guidance__note">
          <a-icon type="info-circle" />
          <span>{{ $t(ownershipExchangeId === 'alpaca' ? 'strategyCenter.positionOwnership.alpacaHelp' : 'strategyCenter.positionOwnership.toleranceHelp') }}</span>
        </div>
      </div>
      <a-table
        :columns="ownershipColumns"
        :data-source="ownershipRows"
        :loading="ownershipLoading"
        :pagination="false"
        row-key="rowKey"
        size="small"
        :scroll="{ x: 960 }"
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
          <div v-if="record.difference_quote != null">{{ $t(ownershipExchangeId === 'alpaca' ? 'strategyCenter.positionOwnership.alpacaQuoteDifference' : 'strategyCenter.positionOwnership.quoteDifference', { value: formatSignedMoney(record.difference_quote) }) }}</div>
        </template>
        <template slot="ownershipAllocations" slot-scope="text, record">
          <a-popover
            v-if="record.allocations && record.allocations.length"
            :title="$t('strategyCenter.positionOwnership.relatedStrategies')"
            :overlay-class-name="isDark ? 'position-ownership-popover position-ownership-popover--dark' : 'position-ownership-popover'"
          >
            <template slot="content">
              <div v-for="allocation in record.allocations" :key="allocation.strategy_id" class="position-ownership-popover__row">
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
        <template slot="ownershipActions" slot-scope="text, record">
          <span v-if="record.repair_kind === 'allocation_shortfall'">
            <a-tooltip :title="$t('strategyCenter.positionOwnership.shortfallHelp')">
              <a-tag color="red">{{ $t('strategyCenter.positionOwnership.shortfall') }}</a-tag>
            </a-tooltip>
          </span>
          <a-button v-else type="link" size="small" @click="repairOwnership(record, 'recheck')">
            {{ $t('strategyCenter.positionOwnership.recheck') }}
          </a-button>
        </template>
      </a-table>
      <a-alert
        v-if="ownershipRows.some(row => row.repair_kind === 'allocation_shortfall')"
        class="ownership-warning-alert ownership-shortfall-alert"
        :class="{ 'is-dark': isDark }"
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
    portfolio: {
      type: Boolean,
      default: false
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
      ownershipExchangeId: '',
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
        const columns = [
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
          ...(this.portfolio
            ? [{
                title: this.$t('strategyV2.backtest.weight'),
                key: 'weight',
                width: 92,
                scopedSlots: { customRender: 'weight' }
              }]
            : []),
          {
            title: `${this.$t('trading-assistant.table.positionCost')} / ${this.$t('trading-assistant.table.marketValue')}`,
            key: 'value_summary',
            width: 210,
            scopedSlots: { customRender: 'valueSummary' }
          },
          {
            title: `${this.$t('trading-assistant.table.averageEntryPrice')} / ${this.$t('trading-assistant.table.currentPrice')}`,
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
          ...(this.portfolio
            ? []
            : [{
                title: this.$t('trading-assistant.form.leverage'),
                key: 'leverage',
                width: 86,
                scopedSlots: { customRender: 'leverage' }
              }])
        ]
        return columns
      }
      const columns = [
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
        ...(this.portfolio
          ? [{
              title: this.$t('strategyV2.backtest.weight'),
              key: 'weight',
              width: 100,
              scopedSlots: { customRender: 'weight' }
            }]
          : []),
        {
          title: this.$t('trading-assistant.table.positionCost'),
          dataIndex: 'position_cost',
          key: 'position_cost',
          width: 140,
          scopedSlots: { customRender: 'positionCost' }
        },
        {
          title: this.$t('trading-assistant.table.marketValue'),
          dataIndex: 'market_value',
          key: 'market_value',
          width: 140,
          scopedSlots: { customRender: 'marketValue' }
        },
        {
          title: this.$t('trading-assistant.table.averageEntryPrice'),
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
      return columns
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
        { title: this.$t('strategyCenter.positionOwnership.status'), dataIndex: 'status', width: 90, scopedSlots: { customRender: 'ownershipStatus' } },
        { title: this.$t('common.actions'), key: 'actions', fixed: 'right', width: 120, scopedSlots: { customRender: 'ownershipActions' } }
      ]
    },
    effectiveLeverage () {
      if (String(this.marketType || '').toLowerCase() === 'spot') return 1
      const parsed = parseFloat(this.leverage)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
    },
    positionSummary () {
      return this.positions.reduce((summary, position) => {
        if (position.position_state === 'exit_residual') return summary
        summary.count += 1
        summary.cost += this.getPositionCost(position)
        summary.marketValue += this.getMarketValue(position)
        summary.unrealizedPnl += Number(position.unrealized_pnl || 0)
        return summary
      }, { count: 0, cost: 0, marketValue: 0, unrealizedPnl: 0 })
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
      if (await this.loadOwnership()) {
        await this.loadPositions()
        this.$emit('ownership-reconciled')
      }
    },
    async loadOwnership () {
      if (!this.strategyId) return
      this.ownershipLoading = true
      try {
        const res = await getStrategyPositionOwnership(this.strategyId)
        if (res.code !== 1) throw new Error(this.$t(res.msg || 'strategyCenter.positionOwnership.loadFailed'))
        const data = res.data || {}
        const rows = data.items || []
        this.ownershipExchangeId = String(data.exchange_id || '').toLowerCase()
        this.ownershipRows = rows.map(row => ({
          ...row,
          rowKey: `${row.symbol || ''}:${row.side || ''}`
        }))
        return true
      } catch (error) {
        this.ownershipExchangeId = ''
        this.ownershipRows = []
        this.$message.error((error && error.message) || this.$t('strategyCenter.positionOwnership.loadFailed'))
        return false
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
        await this.loadOwnership()
        await this.loadPositions()
        this.$emit('ownership-reconciled')
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
            const currentPrice = parseFloat(position.current_price || position.currentPrice || 0) || 0
            const positionCost = parseFloat(position.notional_value || position.notionalValue || 0) || (entryPrice > 0 && size > 0 ? entryPrice * size : 0)
            const marketValue = currentPrice > 0 && size > 0 ? currentPrice * size : positionCost
            const legacyPct = this.safeNumber(position.pnl_percent ?? position.pnlPercent)
            let marginPct = this.safeNumber(position.position_margin_pnl_percent ?? position.positionMarginPnlPercent)
            if (!Number.isFinite(marginPct)) {
              marginPct = Number.isFinite(legacyPct) ? legacyPct : (positionCost > 0 ? (pnl / positionCost) * 100 * lev : 0)
            }
            let capitalPct = this.safeNumber(position.strategy_capital_pnl_percent ?? position.capital_contribution_percent ?? position.strategyCapitalPnlPercent)
            if (!Number.isFinite(capitalPct)) capitalPct = 0

            return {
              id: position.id || index,
              symbol: position.symbol || '',
              side: position.side || 'long',
              size: size > 0 ? size.toString() : '0',
              entry_price: entryPrice > 0 ? entryPrice.toString() : '0',
              current_price: currentPrice > 0 ? currentPrice.toString() : '0',
              unrealized_pnl: position.unrealized_pnl || position.unrealizedPnl || '0',
              pnl_percent: marginPct,
              position_margin_pnl_percent: marginPct,
              position_notional_pnl_percent: this.safeNumber(position.position_notional_pnl_percent ?? position.positionNotionalPnlPercent) || 0,
              strategy_capital_pnl_percent: capitalPct,
              position_cost: positionCost,
              market_value: marketValue,
              notional_value: positionCost,
              position_state: position.position_state || position.positionState || 'open',
              tradable_size: this.safeNumber(position.tradable_size ?? position.tradableSize) || 0,
              residual_reason: position.residual_reason || position.residualReason || '',
              updated_at: position.updated_at || position.updatedAt || ''
            }
          })
          this.emitSummary()
        } else {
          this.positions = []
          this.reconciliation = { status: 'not_checked', notes: [], account_positions: [] }
          this.emitSummary()
        }
      } catch (error) {
        this.positions = []
        this.reconciliation = { status: 'not_checked', notes: [], account_positions: [] }
        this.emitSummary()
      }
    },
    emitSummary () {
      this.$emit('summary-change', { ...this.positionSummary })
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
    formatMoney (value) {
      const parsed = this.safeNumber(value)
      return Number.isFinite(parsed) && parsed > 0 ? `$${parsed.toFixed(2)}` : '--'
    },
    pnlClass (value) {
      const parsed = this.safeNumber(value)
      return {
        profit: Number.isFinite(parsed) && parsed > 0,
        loss: Number.isFinite(parsed) && parsed < 0
      }
    },
    getPositionCost (record) {
      const supplied = parseFloat(record.position_cost || record.notional_value || 0)
      if (Number.isFinite(supplied) && supplied > 0) return supplied
      const size = parseFloat(record.size || 0)
      const ep = parseFloat(record.entry_price || 0)
      if (size > 0 && ep > 0) return size * ep
      return 0
    },
    getMarketValue (record) {
      const supplied = parseFloat(record.market_value || 0)
      if (Number.isFinite(supplied) && supplied > 0) return supplied
      const size = parseFloat(record.size || 0)
      const cp = parseFloat(record.current_price || 0)
      if (size > 0 && cp > 0) return size * cp
      return this.getPositionCost(record)
    },
    getPositionWeight (record) {
      if (this.positionSummary.marketValue <= 0) return 0
      return this.getMarketValue(record) / this.positionSummary.marketValue * 100
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
  }

  .virtual-account-note {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 10px 0 12px;
    padding: 8px 11px;
    border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 18%, #e2e8f0);
    border-radius: 7px;
    color: #586579;
    background: color-mix(in srgb, var(--primary-color, #1890ff) 3%, #fff);
    font-size: 12px;
    line-height: 1.45;
  }

  .virtual-account-note__icon {
    display: inline-flex;
    flex: 0 0 24px;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    color: var(--primary-color, #1890ff);
    background: color-mix(in srgb, var(--primary-color, #1890ff) 10%, transparent);
    font-size: 12px;
  }

  .virtual-account-note__copy { min-width: 0; }

  &.theme-dark .virtual-account-note {
    border-color: color-mix(in srgb, var(--primary-color, #52c41a) 22%, #30343a);
    color: #aeb7c4;
    background: color-mix(in srgb, var(--primary-color, #52c41a) 5%, #16181b);
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
    border-color: #333333;
    background: #181818;
  }

  .portfolio-position-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 12px;

    > div {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
      padding: 9px 11px;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      background: #f8fafc;
    }

    span {
      overflow: hidden;
      color: #7a8594;
      font-size: 11px;
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      color: #243044;
      font-size: 14px;
      font-weight: 680;
      font-variant-numeric: tabular-nums;
    }
  }

  .position-weight {
    color: var(--primary-color, #1890ff);
    font-variant-numeric: tabular-nums;
  }

  .position-symbol {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .position-residual-tag {
    margin-right: 0;
    font-size: 10px;
    line-height: 18px;
  }

  &.theme-dark .portfolio-position-summary > div {
    border-color: #333333;
    background: #181818;

    span { color: #8f98a5; }
    strong { color: #e0e4e9; }
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
      background: #222222 !important;
      color: #d1d4dc !important;
      border-bottom-color: #333333 !important;
    }

    ::v-deep .ant-table-tbody > tr > td {
      background: #1c1c1c !important;
      color: #d1d4dc !important;
      border-bottom-color: #333333 !important;
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

  .position-value-summary,
  .position-price-summary,
  .position-pnl-summary {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .position-value-summary,
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
    .position-value-summary,
    .position-price-summary {
      color: #8f98a5;

      strong { color: #e0e4e9; }
    }

    .position-leverage { color: #d9a928; }
  }
}

.ownership-guidance {
  margin-bottom: 16px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 20%, transparent);
  border-radius: 10px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 5%, #fff) 0%, #fff 72%);

  &__main {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 13px 15px 11px;
  }

  &__icon {
    display: inline-flex;
    flex: 0 0 30px;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    margin-top: 1px;
    border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 20%, transparent);
    border-radius: 8px;
    color: var(--primary-color, #1890ff);
    background: color-mix(in srgb, var(--primary-color, #1890ff) 9%, transparent);
    font-size: 15px;
  }

  &__copy {
    min-width: 0;

    strong {
      display: block;
      color: #253044;
      font-size: 14px;
      font-weight: 650;
      line-height: 1.45;
    }

    p {
      margin: 4px 0 0;
      color: #667085;
      font-size: 13px;
      line-height: 1.55;
    }
  }

  &__note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 9px 15px 10px 57px;
    border-top: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent);
    color: #758095;
    background: color-mix(in srgb, var(--primary-color, #1890ff) 2%, transparent);
    font-size: 12px;
    line-height: 1.5;

    .anticon {
      margin-top: 3px;
      color: var(--primary-color, #1890ff);
    }
  }

  &.is-dark {
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 30%, transparent);
    background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 10%, #1b1d20) 0%, #1b1d20 72%);

    .ownership-guidance__icon {
      border-color: color-mix(in srgb, var(--primary-color, #1890ff) 30%, transparent);
      background: color-mix(in srgb, var(--primary-color, #1890ff) 14%, transparent);
    }

    .ownership-guidance__copy {
      strong { color: #e5e9ef; }
      p { color: #a8b0bc; }
    }

    .ownership-guidance__note {
      border-top-color: rgba(255, 255, 255, 0.07);
      color: #949eab;
      background: rgba(255, 255, 255, 0.015);
    }
  }
}

.ownership-warning-alert {
  position: relative;
  overflow: hidden;
  padding: 13px 15px 13px 58px;
  border: 1px solid rgba(217, 169, 40, 0.28);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(217, 169, 40, 0.08) 0%, #fff 72%);
  box-shadow: inset 3px 0 0 rgba(217, 169, 40, 0.52);

  &::before {
    position: absolute;
    top: 0;
    right: 0;
    width: 120px;
    height: 100%;
    content: '';
    pointer-events: none;
    background: radial-gradient(circle at top right, rgba(217, 169, 40, 0.09), transparent 68%);
  }

  ::v-deep .ant-alert-icon {
    top: 13px;
    left: 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    color: #b7791f;
    font-size: 14px;
    background: rgba(217, 169, 40, 0.12);
    border: 1px solid rgba(217, 169, 40, 0.24);
    border-radius: 8px;
  }

  ::v-deep .ant-alert-message {
    position: relative;
    color: #463819;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
  }

  ::v-deep .ant-alert-description {
    position: relative;
    margin-top: 4px;
    color: #766943;
    font-size: 13px;
    line-height: 1.55;
  }

  ::v-deep .ant-btn-link {
    height: auto;
    padding: 2px 0 0;
    color: #9a6b00;
    font-size: 12px;
    font-weight: 600;
  }

  &.is-dark {
    border-color: rgba(217, 169, 40, 0.3);
    background: linear-gradient(135deg, rgba(217, 169, 40, 0.1) 0%, #1b1d20 72%);
    box-shadow: inset 3px 0 0 rgba(217, 169, 40, 0.58);

    &::before {
      background: radial-gradient(circle at top right, rgba(217, 169, 40, 0.08), transparent 68%);
    }

    ::v-deep .ant-alert-icon {
      color: #e0b84d;
      background: rgba(217, 169, 40, 0.13);
      border-color: rgba(217, 169, 40, 0.28);
    }

    ::v-deep .ant-alert-message {
      color: #e8e3d7;
    }

    ::v-deep .ant-alert-description {
      color: #aaa394;
    }

    ::v-deep .ant-btn-link {
      color: #d9a928;

      &:hover,
      &:focus {
        color: #edc85f;
      }
    }
  }
}

.ownership-shortfall-alert {
  margin-top: 16px;
}
</style>

<style lang="less">
.position-ownership-popover {
  .ant-popover-inner {
    border-color: #e2e8f0;
    background: #fff;
  }

  .ant-popover-title {
    border-bottom-color: #e8edf3;
    color: #253044;
    font-weight: 650;
  }

  .ant-popover-inner-content {
    color: #475569;
  }

  .ant-popover-arrow {
    border-color: #fff;
  }

  &__row {
    color: inherit;
    line-height: 1.7;
  }
}

.position-ownership-popover--dark {
  .ant-popover-inner {
    border-color: #343941 !important;
    background: #1b1d20 !important;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.46) !important;
  }

  .ant-popover-title {
    border-bottom-color: rgba(255, 255, 255, 0.09);
    color: #f2f4f7;
  }

  .ant-popover-inner-content {
    color: #d7dce3;
  }

  .ant-popover-arrow {
    border-color: #1b1d20 !important;
    background: #1b1d20;
  }
}
</style>
