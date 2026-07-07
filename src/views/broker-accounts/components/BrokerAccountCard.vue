<template>
  <a-spin :spinning="loading">
    <div v-if="!loading && (!info || isEmpty)" class="bp-empty" :class="{ 'theme-dark': isDarkTheme }">
      <a-icon type="inbox" /> <span>{{ $t('brokerAccounts.noAccount') }}</span>
    </div>
    <div v-else-if="info" class="account-grid" :class="{ 'theme-dark': isDarkTheme }">
      <div
        v-for="metric in metrics"
        :key="metric.key"
        class="metric-card"
        :class="metric.tone || ''"
      >
        <div class="metric-label">{{ metric.label }}</div>
        <div class="metric-value">{{ metric.value }}</div>
        <div v-if="metric.sub" class="metric-sub">{{ metric.sub }}</div>
      </div>
    </div>
  </a-spin>
</template>

<script>
import { broker } from '@/api/broker'

function num (v) {
  const n = Number(v)
  return isFinite(n) ? n : null
}
function money (v, ccy = 'USD') {
  const n = num(v)
  if (n == null) return '--'
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${sign}${ccy === 'USD' ? '$' : ''}${abs}${ccy && ccy !== 'USD' ? ' ' + ccy : ''}`
}

export default {
  name: 'BrokerAccountCard',
  props: {
    brokerId: { type: String, required: true },
    isDarkTheme: { type: Boolean, default: false }
  },
  data () {
    return {
      info: null,
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
      if (this.brokerId === 'alpaca') {
        return [
          { key: 'equity', label: this.$t('brokerAccounts.kpi.equity'), value: money(i.equity || i.portfolio_value, ccy) },
          { key: 'cash', label: this.$t('brokerAccounts.kpi.cash'), value: money(i.cash, ccy) },
          { key: 'bp', label: this.$t('brokerAccounts.kpi.buyingPower'), value: money(i.buying_power, ccy), tone: 'accent' },
          { key: 'positions', label: this.$t('brokerAccounts.kpi.positionsCount'), value: String(i.position_count || i.positions_count || '--') },
          { key: 'daytrades', label: this.$t('brokerAccounts.kpi.dayTrades'), value: String(i.daytrade_count || '--') },
          { key: 'status', label: this.$t('brokerAccounts.kpi.accountStatus'), value: String(i.status || 'ACTIVE'), tone: 'positive' }
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
      return []
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
      try {
        const res = await broker[this.brokerId].account()
        const payload = (res && (res.data || res)) || {}
        const inner = payload.data && typeof payload.data === 'object' ? payload.data : payload
        this.info = inner && Object.keys(inner).length ? inner : null
      } catch (_) {
        this.info = null
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
    background: linear-gradient(165deg, #1b1f24 0%, #151719 100%);
    border-color: #30363d;

    &.accent {
      background: linear-gradient(165deg, color-mix(in srgb, var(--primary-color, #1890ff) 14%, transparent) 0%, #171b20 100%);
      border-color: color-mix(in srgb, var(--primary-color, #1890ff) 45%, transparent);
    }

    &.positive {
      background: linear-gradient(165deg, rgba(82, 196, 26, 0.12) 0%, #171b18 100%);
      border-color: rgba(82, 196, 26, 0.35);
    }

    &.negative {
      background: linear-gradient(165deg, rgba(245, 34, 45, 0.12) 0%, #1d1718 100%);
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
