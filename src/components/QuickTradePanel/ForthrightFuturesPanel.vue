<template>
  <section class="futures-ticket" :class="{'theme-dark':isDark}">
    <div v-if="error || balanceError" class="ticket-error" role="alert"><a-icon type="warning"/><div><strong>{{ $t(error ? 'brokerAccounts.forthright.orderResponse' : 'brokerAccounts.tabAccount') }}</strong><p>{{ error || balanceError }}</p></div></div>
    <a-form layout="vertical">
      <div class="ft-section ft-account-section">
        <a-form-item :label="$t('brokerAccounts.selectAccount')"><a-select v-model="credentialId" :disabled="busy" @change="loadContracts"><a-select-option v-for="account in accounts" :key="account.id" :value="Number(account.id)">{{ account.name }} · {{ $t('brokerAccounts.forthright.' + (account.environment || 'sandbox')) }}</a-select-option></a-select><router-link v-if="!accounts.length" to="/broker-accounts">{{ $t('brokerAccounts.addAccount') }}</router-link></a-form-item>
        <a-form-item :label="$t('brokerAccounts.forthright.contract')"><a-select
          v-model="contract"
          show-search
          option-filter-prop="children"
          :disabled="busy"
          :loading="busy"
          @change="selectContract"><a-select-option v-for="item in contracts" :key="item.prodCode" :value="item.prodCode">{{ item.prodCode }} · {{ item.prodName }} · {{ item.lastTradeDate || item.expiryYmd }}</a-select-option></a-select></a-form-item>
        <div v-if="selectedContract" class="contract-facts"><span>{{ selectedContract.marketCode }}</span><span>{{ $t('brokerAccounts.forthright.expiry') }} {{ selectedContract.lastTradeDate || selectedContract.expiryYmd }}</span><span v-if="selectedContract.price_tick">{{ $t('brokerAccounts.forthright.tickSize') }} {{ selectedContract.price_tick }} {{ priceUnit }}</span></div>
      </div>
      <div class="ft-balances" :aria-busy="balanceLoading">
        <div v-for="balance in balances" :key="balance.ccy || balance.currency"><span>{{ $t('brokerAccounts.kpi.cash') }}</span><strong>{{ money(balance.cash) }} <small>{{ balance.currency || String(balance.ccy || '').replace(/^HK-/, '') }}</small></strong></div>
        <div v-for="metric in ['available_funds', 'initial_margin', 'maintenance_margin']" :key="metric"><span>{{ $t('brokerAccounts.forthright.' + metric) }}</span><strong>{{ money(accountSummary && accountSummary[metric]) }} <small>{{ accountSummary && accountSummary.currency }}</small></strong></div>
        <a-button
          type="link"
          size="small"
          :loading="balanceLoading"
          :disabled="!credentialId"
          :aria-label="$t('brokerAccounts.refresh')"
          @click="loadBalance"><a-icon type="reload" /></a-button>
      </div>
      <div class="ft-section ft-order-section">
        <div class="order-segment"><button
          v-for="kind in ['limit','market']"
          :key="kind"
          type="button"
          :class="{active:orderType===kind}"
          :aria-pressed="orderType===kind"
          :disabled="busy"
          @click="orderType=kind">{{ $t(`brokerAccounts.forthright.${kind}`) }}</button></div>
        <div class="ticket-inputs"><a-form-item :label="$t('brokerAccounts.forthright.lots')"><a-input-number v-model="quantity" :min="1" :step="1" :precision="0" :disabled="busy" /></a-form-item><a-form-item v-if="orderType==='limit'" :label="`${$t('brokerAccounts.forthright.price')}${priceUnit ? ` (${priceUnit})` : ''}`"><a-input-number v-model="price" :min="0" :step="selectedContract && selectedContract.price_tick || 0.01" :disabled="busy" /></a-form-item></div>
        <p v-if="invalidPriceStep" class="validation-note">{{ $t('brokerAccounts.forthright.priceStepHint',{tick:selectedContract.price_tick}) }}</p>
        <div class="futures-actions"><a-button type="primary" :disabled="!valid" :loading="busy" @click="submit('buy')">{{ $t('brokerAccounts.forthright.buy') }}</a-button><a-button type="danger" :disabled="!valid" :loading="busy" @click="submit('sell')">{{ $t('brokerAccounts.forthright.sell') }}</a-button></div>
      </div>
    </a-form>
    <a-tabs v-if="credentialId" v-model="activityTab" class="ft-activity"><a-button slot="tabBarExtraContent" size="small" :loading="activityLoading" @click="refreshActivity"><a-icon type="reload" />{{ $t('brokerAccounts.refresh') }}</a-button><a-tab-pane key="positions" :tab="$t('brokerAccounts.tabPositions')"><broker-positions-table
      ref="positions"
      compact
      hide-refresh
      :key="`${credentialId}-${version}`"
      broker-id="forthright"
      :credential-id="credentialId"
      :is-dark-theme="isDark" /></a-tab-pane><a-tab-pane key="orders" :tab="$t('brokerAccounts.tabOrders')"><broker-orders-table
        ref="orders"
        hide-refresh
        :key="`${credentialId}-${version}`"
        broker-id="forthright"
        :credential-id="credentialId"
        :is-dark-theme="isDark" /></a-tab-pane></a-tabs>
  </section>
</template>
<script>
import { broker } from '@/api/broker'
import { forthrightErrorMessage, validFuturesOrder } from '@/utils/forthright'
import { listExchangeCredentials } from '@/api/credentials'
import BrokerPositionsTable from '@/views/broker-accounts/components/BrokerPositionsTable.vue'
import BrokerOrdersTable from '@/views/broker-accounts/components/BrokerOrdersTable.vue'
import { startVisiblePolling } from '@/utils/visiblePolling'
export default {
  name: 'ForthrightFuturesPanel',
  components: { BrokerPositionsTable, BrokerOrdersTable },
  props: { symbol: { type: String, default: '' }, isDark: Boolean },
  data () { return { accounts: [], credentialId: null, contracts: [], contract: undefined, instrument: '', quantity: 1, orderType: 'limit', price: null, busy: false, error: '', balanceError: '', version: 0, accountSummary: null, balanceLoading: false, activityTab: 'positions', activityLoading: false } },
  computed: {
    balances () { return this.accountSummary?.balances || [] },
    selectedContract () { return this.contracts.find(item => item.prodCode === this.contract) },
    priceUnit () { return this.selectedContract?.quote_unit === 'index_points' ? this.$t('brokerAccounts.forthright.points') : this.selectedContract?.quote_currency || '' },
    valid () { return !this.busy && this.credentialId && validFuturesOrder(this.selectedContract, this.quantity, this.orderType, this.price) },
    invalidPriceStep () { return this.price > 0 && this.orderType === 'limit' && this.selectedContract?.price_tick && !validFuturesOrder(this.selectedContract, 1, 'limit', this.price) }
  },
  watch: { symbol (value) { const exact = String(value).replace(/^Futures:/i, ''); this.contract = this.contracts.some(item => item.prodCode === exact) ? exact : undefined; this.price = null; this.error = '' } },
  async mounted () {
    this.stopPolling = startVisiblePolling(() => this.refreshActivity(true), { enabled: () => Boolean(this.credentialId) && !this.busy && !this.activityLoading && this.$el?.getClientRects().length > 0 })
    try {
      const response = await listExchangeCredentials()
      const data = response.data?.data || response.data || response
      this.accounts = (Array.isArray(data) ? data : data.items || []).filter(item => item.exchange_id === 'forthright' && item.account_type === 'futures')
      if (this.accounts.length === 1) { this.credentialId = Number(this.accounts[0].id); await this.loadContracts() }
    } catch (error) { this.showError(error) }
  },
  beforeDestroy () { this.stopPolling?.() },
  methods: {
    money (value) { return value == null || value === '' || !Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    async refreshActivity (background = false) { if (this.activityLoading) return; this.activityLoading = true; try { for (const name of ['orders', 'positions']) { const view = this.$refs[name]; if (view && !view.loading && !view.closing && !view.cancellingId) await view.load(background === true) }; await this.loadBalance() } finally { this.activityLoading = false } },
    async loadBalance () {
      const id = this.credentialId
      if (!id || this.balanceLoading) return
      this.balanceLoading = true
      try { const response = await broker.forthright.account({ credential_id: id }); if (!response.success) throw new Error(response.error); if (id === this.credentialId) { this.accountSummary = response.data; this.balanceError = '' } } catch (error) { if (id === this.credentialId) this.balanceError = forthrightErrorMessage(error, this.$t.bind(this)) } finally { this.balanceLoading = false }
    },
    selectContract (value) { this.price = null; this.error = ''; this.$emit('contract-change', value) },
    showError (error) { this.error = forthrightErrorMessage(error, this.$t.bind(this)) },
    async loadContracts () {
      this.accountSummary = null; this.balanceError = ''
      this.busy = true; this.error = ''; this.contract = undefined; this.contracts = []; this.$emit('connection-change', false)
      try {
        const response = await broker.forthright.contracts({ credential_id: this.credentialId, instrument_code: this.instrument.trim() })
        if (!response.success) throw new Error(response.error)
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        this.contracts = (response.data || []).filter(item => String(item.expiryYmd || '') >= today && (!item.lastTradeDate || item.lastTradeDate.replace(/-/g, '') >= today))
        const exact = String(this.symbol).replace(/^Futures:/i, '')
        if (this.contracts.some(item => item.prodCode === exact)) this.contract = exact
        this.$emit('connection-change', true)
        await this.loadBalance()
      } catch (error) { this.showError(error); this.version++ } finally { this.busy = false }
    },
    async submit (side) {
      if (!this.valid) return
      const payload = { credential_id: this.credentialId, symbol: this.contract, marketType: 'Futures', side, quantity: this.quantity, orderType: this.orderType, price: this.price || 0 }
      this.busy = true
      const account = this.accounts.find(item => Number(item.id) === this.credentialId)
      const accountLabel = `${account?.name || ''} · ${this.$t('brokerAccounts.forthright.' + (account?.environment || 'sandbox'))}`
      const accepted = await new Promise(resolve => this.$confirm({ title: this.$t('brokerAccounts.forthright.futures'), content: `${accountLabel} · ${this.contract} · ${this.$t(side === 'buy' ? 'brokerAccounts.forthright.buy' : 'brokerAccounts.forthright.sell')} · ${this.quantity} ${this.$t('brokerAccounts.forthright.lots')} · ${this.orderType === 'limit' ? `${this.price} ${this.priceUnit}` : this.$t('brokerAccounts.forthright.market')}`, onOk: () => resolve(true), onCancel: () => resolve(false) }))
      if (!accepted || payload.credential_id !== this.credentialId || payload.symbol !== this.contract) { this.busy = false; return }
      this.busy = true; this.error = ''
      try {
        const response = await broker.forthright.placeOrder(payload)
        if (!response.success) throw new Error(response.error || response.message)
        this.version++
        await this.loadBalance()
        this.$emit('order-success', response.data)
        this.$message.success(this.$t('brokerAccounts.forthright.orderSubmitted'))
      } catch (error) { this.showError(error); this.version++ } finally { this.busy = false }
    }
  }
}
</script>
<style scoped>
.futures-ticket {
  --ft-bg: #fff; --ft-input: #f7f8fa; --ft-border: #e5e7eb; --ft-text: #20242a; --ft-muted: #727984;
  box-sizing: border-box; padding: 16px; min-width: 0; color: var(--ft-text); background: var(--ft-bg);
  font-size: 13px; font-variant-numeric: tabular-nums;
}
.futures-ticket.theme-dark { --ft-bg: #181818; --ft-input: #202020; --ft-border: #333; --ft-text: #ededed; --ft-muted: #a0a0a0; }
.ft-section { min-width: 0; }
.ft-account-section { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: 0 12px; padding-bottom: 12px; border-bottom: 1px solid var(--ft-border); }
.ft-section ::v-deep .ant-form-item { margin-bottom: 8px; min-width: 0; }
.ft-section ::v-deep .ant-form-item-label { padding-bottom: 4px; line-height: 20px; }
.ft-section ::v-deep .ant-form-item-label label { color: var(--ft-muted); font-size: 12px; }
.ft-section ::v-deep .ant-select, .ft-section ::v-deep .ant-input-number { width: 100%; }
.ft-section ::v-deep .ant-select-selection, .ft-section ::v-deep .ant-input-number { background: var(--ft-input); border-color: var(--ft-border); border-radius: 6px; color: var(--ft-text); height: 36px; }
.ft-section ::v-deep .ant-select-selection__rendered { line-height: 34px; font-size: 12px; }
.ft-section ::v-deep .ant-input-number-input { height: 34px; font-size: 14px; }
.ft-section ::v-deep .ant-select-arrow { color: var(--ft-muted); }
.ft-section ::v-deep .ant-input-number-handler-wrap { background: var(--ft-input); border-color: var(--ft-border); }
.ft-section ::v-deep .ant-input-number-handler { border-color: var(--ft-border); }
.ft-section ::v-deep .ant-input-number-handler-up-inner, .ft-section ::v-deep .ant-input-number-handler-down-inner { color: var(--ft-muted); }
.contract-facts { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; padding: 4px 0 0; color: var(--ft-muted); font-size: 11px; background: transparent; }
.contract-facts span:first-child { color: var(--ft-text); font-weight: 500; }
.ft-order-section { padding-top: 12px; }
.ft-balances { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 24px; padding: 12px 0; border-bottom: 1px solid var(--ft-border); }
.ft-balances div { display: grid; gap: 3px; }
.ft-balances span, .ft-balances small { color: var(--ft-muted); font-size: 11px; font-weight: 400; }
.ft-balances strong { font-size: 14px; color: var(--ft-text); }
.ft-balances > button { margin-left: auto; }
.order-segment { display: flex; gap: 4px; padding: 3px; margin-bottom: 12px; border-radius: 6px; background: var(--ft-input); }
.order-segment button { flex: 1; min-height: 30px; border: 0; border-radius: 4px; background: transparent; color: var(--ft-muted); cursor: pointer; font-size: 12px; }
.order-segment button.active { background: var(--ft-bg); color: var(--ft-text); box-shadow: 0 1px 3px #0000001a; }
.ticket-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ticket-inputs > * { min-width: 0; }
.futures-actions { display: flex; gap: 12px; margin-top: 4px; }
.futures-actions button { flex: 1; height: 36px; border-radius: 6px; font-size: 14px; font-weight: 500; }
.futures-actions button:first-child { background: #158463 !important; border-color: #158463 !important; color: #fff !important; }
.futures-actions button:last-child { background: #d64545 !important; border-color: #d64545 !important; color: #fff !important; }
.futures-actions button[disabled] { opacity: .4; }
.ft-activity { margin-top: 16px; }
.ft-activity ::v-deep .ant-tabs-bar { margin-bottom: 12px; border-color: var(--ft-border); }
.ft-activity ::v-deep .ant-tabs-tab { padding: 8px 4px; font-size: 12px; color: var(--ft-muted); }
.ft-activity ::v-deep .ant-tabs-tab-active { color: var(--primary-color, #3454f4); }
.ft-activity ::v-deep .ant-table-small { border-color: var(--ft-border); }
.ft-activity ::v-deep .ant-empty-normal { margin: 20px 0; }
.ticket-error { display: flex; gap: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid var(--ft-border); border-left: 3px solid #d64545; border-radius: 6px; font-size: 12px; }
.ticket-error > .anticon { margin-top: 3px; color: #d64545; }
.ticket-error p { margin: 4px 0 0; white-space: pre-line; overflow-wrap: anywhere; color: var(--ft-muted); line-height: 1.5; }
.validation-note { font-size: 12px; color: #d64545; margin: 0 0 8px; }
.order-segment button:focus-visible { outline: 2px solid var(--primary-color, #3454f4); outline-offset: 2px; }
@media (max-width: 540px) { .ft-account-section { grid-template-columns: minmax(0, 1fr); } }
</style>
