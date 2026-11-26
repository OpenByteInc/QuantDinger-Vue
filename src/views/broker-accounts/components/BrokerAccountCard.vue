<template>
  <a-spin :spinning="loading">
    <a-alert v-if="error" type="error" show-icon :message="error" />
    <div v-else-if="!loading && (!info || isEmpty)" class="bp-empty" :class="{ 'theme-dark': isDarkTheme }">
      <a-icon type="inbox" /> <span>{{ $t('brokerAccounts.noAccount') }}</span>
    </div>
    <div v-else-if="info" class="account-grid" :class="{ 'theme-dark': isDarkTheme }">
      <div
        v-for="metric in metrics"
        :key="metric.key"
        class="metric-card"
        :class="metric.tone || ''"
      >
        <div class="metric-label">
          <a-tooltip v-if="metric.help" :title="metric.help" :trigger="['hover', 'focus', 'click']"><button class="metric-help">{{ metric.label }} <a-icon type="question-circle" /></button></a-tooltip>
          <template v-else>{{ metric.label }}</template>
        </div>
        <div class="metric-value">{{ metric.value }}</div>
        <div v-if="metric.sub" class="metric-sub">{{ metric.sub }}</div>
      </div>
    </div>
  </a-spin>
</template>

<script>
import { forthrightErrorMessage } from '@/utils/forthright'
import { broker } from '@/api/broker'

function num (v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isFinite(n) ? n : null
}
function money (v, ccy = 'USD') {
  const n = num(v)
  if (n == null) return '--'
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${sign}${abs} ${ccy}`
}

export default {
  name: 'BrokerAccountCard',
  props: {
    brokerId: { type: String, required: true },
    credentialId: { type: Number, default: null },
    isDarkTheme: { type: Boolean, default: false }
  },
  data () {
    return {
      info: null,
      error: '',
      loading: false,
      timer: null
    }
  },
  computed: {
    isEmpty () {
      return !this.info || Object.keys(this.info).length === 0
    },
    metrics () {
      if (!this.info) return []
      const i = this.info
      const ccy = i.currency || i.account_currency || 'USD'
      if (this.brokerId === 'forthright') {
        const futures = i.account_type === 'futures'
        const help = key => futures ? this.$t('brokerAccounts.forthright.' + key) : ''
        return [
          { key: 'equity', label: this.$t('brokerAccounts.kpi.equity'), value: money(i.equity, ccy), help: help('equityHelp'), sub: futures ? '' : this.$t('brokerAccounts.forthright.currencyHint') },
          { key: 'cash', label: this.$t(futures ? 'brokerAccounts.forthright.convertedCashLabel' : 'brokerAccounts.kpi.cash'), value: money(i.cash, ccy), help: help('cashHelp'), sub: i.cash_is_converted ? this.$t('brokerAccounts.forthright.convertedCash') : '' },
          { key: 'bp', label: this.$t(futures ? 'brokerAccounts.forthright.available_funds' : 'brokerAccounts.kpi.buyingPower'), value: money(i.buying_power, ccy), help: help('availableFundsHelp'), tone: 'accent' },
          ...(futures ? ['initial_margin', 'maintenance_margin'].map(key => ({ key, label: this.$t('brokerAccounts.forthright.' + key), value: money(i[key], ccy), help: help(key + 'Help') })) : []),
          ...(i.balances || []).map(row => ({ key: `cash-${row.currency || row.ccy}`, label: this.$t(row.available_cash != null ? 'brokerAccounts.forthright.nativeCash' : 'brokerAccounts.forthright.originalCash'), help: help('nativeCashHelp'), value: money(row.available_cash ?? row.cash, row.currency || String(row.ccy || '').replace(/^HK-/, '')) })),
          { key: 'account', label: this.$t('brokerAccounts.kpi.account'), value: String(i.account_id || '--') }
        ]
      }
      if (this.brokerId === 'alpaca') {
        return [
          { key: 'equity', label: this.$t('brokerAccounts.kpi.equity'), value: money(i.equity != null ? i.equity : i.portfolio_value, ccy) },
          { key: 'cash', label: this.$t('brokerAccounts.kpi.cash'), value: money(i.cash, ccy) },
          { key: 'bp', label: this.$t('brokerAccounts.kpi.buyingPower'), value: money(i.buying_power, ccy), tone: 'accent' },
          { key: 'positions', label: this.$t('brokerAccounts.kpi.positionsCount'), value: i.position_count != null ? String(i.position_count) : '--' },
          { key: 'fills', label: this.$t('brokerAccounts.kpi.recentFills'), value: i.recent_filled_order_count != null ? String(i.recent_filled_order_count) : '--', sub: this.$t('brokerAccounts.kpi.recentFillsHint', { limit: i.recent_order_limit || 100 }) },
          { key: 'status', label: this.$t('brokerAccounts.kpi.accountStatus'), value: String(i.status || '--'), tone: i.status === 'ACTIVE' ? 'positive' : '' }
        ]
      }
      if (this.brokerId === 'ibkr') {
        return [
          { key: 'nav', label: this.$t('brokerAccounts.kpi.netLiq'), value: money(i.net_liquidation || i.NetLiquidation, ccy) },
          { key: 'cash', label: this.$t('brokerAccounts.kpi.cash'), value: money(i.total_cash_value || i.TotalCashValue, ccy) },
          { key: 'bp', label: this.$t('brokerAccounts.kpi.buyingPower'), value: money(i.buying_power || i.BuyingPower, ccy), tone: 'accent' },
          { key: 'init', label: this.$t('brokerAccounts.kpi.initMargin'), value: money(i.init_margin_req || i.InitMarginReq, ccy) },
          { key: 'maint', label: this.$t('brokerAccounts.kpi.maintMargin'), value: money(i.maint_margin_req || i.MaintMarginReq, ccy) },
          { key: 'account', label: this.$t('brokerAccounts.kpi.account'), value: String(i.account || i.AccountCode || '--') }
        ]
      }
      return [
        { key: 'equity', label: this.$t('brokerAccounts.kpi.equity'), value: money(i.equity != null ? i.equity : (i.net_liquidation != null ? i.net_liquidation : i.total_assets), ccy) },
        { key: 'cash', label: this.$t('brokerAccounts.kpi.cash'), value: money(i.cash != null ? i.cash : (i.cash_balance != null ? i.cash_balance : i.available_funds), ccy) },
        { key: 'bp', label: this.$t('brokerAccounts.kpi.buyingPower'), value: money(i.buying_power != null ? i.buying_power : i.available_funds, ccy), tone: 'accent' },
        { key: 'account', label: this.$t('brokerAccounts.kpi.account'), value: String(i.account || i.account_id || '--') }
      ]
    }
  },
  mounted () {
    this.load()
  },
  beforeDestroy () {
    if (this.timer) clearTimeout(this.timer)
  },
  methods: {
    async load () {
      this.loading = true
      this.error = ''
      try {
        const res = await broker[this.brokerId].account(this.credentialId ? { credential_id: this.credentialId } : {})
        if (res && res.success === false) throw new Error('brokerAccounts.accountLoadFailed')
        const payload = (res && (res.data || res)) || {}
        const inner = payload.data && typeof payload.data === 'object' ? payload.data : payload
        this.info = inner && Object.keys(inner).length ? inner : null
      } catch (error) {
        this.info = null
        this.error = this.brokerId === 'forthright' ? forthrightErrorMessage(error, this.$t.bind(this)) : this.$t('brokerAccounts.accountLoadFailed')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.account-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.metric-card {
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid #eef0f3;
  background: linear-gradient(165deg, #ffffff 0%, #f9fbff 100%);
  &.accent { border-color: rgba(24, 144, 255, 0.25); background: linear-gradient(165deg, rgba(24, 144, 255, 0.04) 0%, #fff 100%); }
  &.positive { border-color: rgba(82, 196, 26, 0.3); }
  &.negative { border-color: rgba(245, 34, 45, 0.3); }
}
.metric-label { font-size: 11px; color: #8c8c8c; text-transform: uppercase; letter-spacing: 0.3px; }
.metric-help { display: inline-flex; align-items: center; gap: 6px; border: 0; padding: 4px 0; margin: -4px 0; background: transparent; color: inherit; font: inherit; text-align: start; cursor: pointer; }
.metric-help:focus-visible { outline: 2px solid var(--primary-color, #1890ff); outline-offset: 2px; border-radius: 4px; }
.metric-value {
  margin-top: 8px;
  font-size: 20px;
  font-weight: 700;
  color: #1f1f1f;
  font-variant-numeric: tabular-nums;
}
.metric-card.positive .metric-value { color: #389e0d; }
.metric-card.negative .metric-value { color: #cf1322; }
.metric-card.accent .metric-value { color: var(--primary-color, #1890ff); }
.metric-sub { margin-top: 4px; font-size: 11px; color: #8c8c8c; }
.account-grid.theme-dark {
  .metric-card {
    background: #181818;
    border-color: #303030;

    &.accent {
      background: color-mix(in srgb, var(--primary-color, #1890ff) 10%, #181818);
      border-color: color-mix(in srgb, var(--primary-color, #1890ff) 45%, transparent);
    }

    &.positive {
      background: color-mix(in srgb, #52c41a 9%, #181818);
      border-color: rgba(82, 196, 26, 0.35);
    }

    &.negative {
      background: color-mix(in srgb, #f5222d 9%, #181818);
      border-color: rgba(245, 34, 45, 0.35);
    }
  }

  .metric-label,
  .metric-sub {
    color: rgba(255, 255, 255, 0.5);
  }

  .metric-value {
    color: rgba(255, 255, 255, 0.9);
  }
}
.bp-empty {
  padding: 32px;
  text-align: center;
  color: #8c8c8c;
  font-size: 13px;
  i { font-size: 22px; display: block; margin-bottom: 8px; }
}
.bp-empty.theme-dark {
  color: rgba(255, 255, 255, 0.5);
}
</style>
