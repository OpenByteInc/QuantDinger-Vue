<template>
  <div class="broker-panel" :class="{ 'theme-dark': isDarkTheme }">
    <div v-if="supportsSavedAccounts" class="bp-account-selector">
      <label>{{ $t('brokerAccounts.selectAccount') }}</label>
      <a-select :value="credentialId" :disabled="loading" :placeholder="$t('brokerAccounts.selectAccount')" @change="value => $emit('select-account', value)">
        <a-select-option v-for="account in accounts" :key="account.id" :value="Number(account.id)">
          {{ account.name }} · {{ account.api_key_hint }}<template v-if="account.account_type"> · {{ $t('brokerAccounts.forthright.' + account.account_type) }} · {{ $t('brokerAccounts.forthright.' + (account.environment || 'sandbox')) }}</template> · #{{ account.id }}
        </a-select-option>
      </a-select>
      <a-button :disabled="loading" @click="openConnectForm"><a-icon type="plus" /> {{ $t('brokerAccounts.addAccount') }}</a-button>
    </div>
    <!-- Connection summary -->
    <div class="bp-status-card" :class="connectionStateClass">
      <div class="bp-status-left">
        <div class="bp-status-icon">
          <provider-logo :provider="broker.id" :size="34" />
        </div>
        <div class="bp-status-meta">
          <div class="bp-status-name">
            {{ $t('brokerAccounts.' + broker.id + '.name') }}
          </div>
          <div class="bp-status-line">
            <a-badge :status="status && status.connected ? 'success' : 'default'" />
            <span class="bp-status-text">
              {{ status && status.connected
                ? $t('brokerAccounts.connected')
                : $t('brokerAccounts.notConnected') }}
            </span>
            <span v-if="status && status.connected && (status.accountId || status.account_id || status.host || status.server)" class="bp-status-account">
              · {{ status.accountId || status.account_id || status.server || (status.host + ':' + status.port) }}
            </span>
          </div>
          <div class="bp-badge-row">
            <a-tag v-if="broker.id === 'forthright' && status && status.environment" :color="status.environment === 'live' ? 'orange' : 'blue'">{{ $t('brokerAccounts.forthright.' + status.environment) }}</a-tag>
            <a-tag v-if="supportsAccountEnvironment && isConnected" :color="status.paper ? 'blue' : 'orange'">{{ $t(status.paper ? 'brokerAccounts.paperAccount' : 'brokerAccounts.liveAccount') }}</a-tag>
            <a-tag v-for="badge in broker.badges" :key="badge" :color="badgeColor(badge)" class="bp-badge">
              {{ $t('brokerAccounts.badges.' + badge) }}
            </a-tag>
            <a-tag v-for="m in broker.markets" :key="'m-' + m" color="cyan" class="bp-badge">{{ $t('brokerAccounts.market.' + m) }}</a-tag>
          </div>
        </div>
      </div>
      <div class="bp-status-actions">
        <a-button :disabled="loading" :loading="loading && refreshing" @click="onRefresh">
          <a-icon type="reload" /> {{ $t('brokerAccounts.refresh') }}
        </a-button>
        <a-button v-if="status && status.connected" type="danger" :loading="loading" @click="$emit('disconnect')">
          <a-icon type="disconnect" /> {{ $t('brokerAccounts.disconnect') }}
        </a-button>
      </div>
    </div>

    <a-alert
      v-if="cloudBlocked"
      type="warning"
      show-icon
      class="bp-cloud-alert"
      :message="$t('brokerAccounts.cloudBlockedAlert', { broker: $t('brokerAccounts.' + broker.id + '.name') })"
    />

    <forthright-unlock v-if="broker.id === 'forthright' && credentialId" :credential-id="credentialId" :is-dark="isDarkTheme" />

    <a-tabs v-model="innerTab" class="bp-inner-tabs">
      <!-- Connect form -->
      <a-tab-pane key="connect" :tab="$t('brokerAccounts.tabConnect')">
        <div class="bp-form-wrapper">
          <component
            :is="formComponent"
            ref="connectForm"
            :broker="broker"
            :disabled="loading || cloudBlocked"
            :loading="loading"
            @submit="submitConnection"
          />
          <div class="bp-form-helper">
            <a-icon type="info-circle" />
            <span>
              {{ helpTextPlain }}
              <a :href="docsLink" target="_blank" rel="noopener">{{ docsLinkLabel }}</a>
            </span>
          </div>
        </div>
      </a-tab-pane>

      <!-- Account overview -->
      <a-tab-pane key="account" :tab="$t('brokerAccounts.tabAccount')" :disabled="!isConnected">
        <broker-account-card ref="account" :key="refreshVersion" :broker-id="broker.id" :credential-id="credentialId" :is-dark-theme="isDarkTheme" />
      </a-tab-pane>

      <!-- Positions -->
      <a-tab-pane key="positions" :tab="$t('brokerAccounts.tabPositions')" :disabled="!isConnected">
        <broker-positions-table ref="positions" :key="refreshVersion" :broker-id="broker.id" :credential-id="credentialId" :is-dark-theme="isDarkTheme" />
      </a-tab-pane>

      <!-- Recent orders -->
      <a-tab-pane key="orders" :tab="$t('brokerAccounts.tabOrders')" :disabled="!isConnected">
        <broker-orders-table
          ref="orders"
          :key="refreshVersion"
          :broker-id="broker.id"
          :credential-id="credentialId"
          :is-dark-theme="isDarkTheme"
        />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script>
import ForthrightConnectForm from './forms/ForthrightConnectForm.vue'
import ForthrightUnlock from './ForthrightUnlock.vue'
import AlpacaConnectForm from './forms/AlpacaConnectForm.vue'
import IbkrConnectForm from './forms/IbkrConnectForm.vue'
import TigerConnectForm from './forms/TigerConnectForm.vue'
import WebullConnectForm from './forms/WebullConnectForm.vue'
import BrokerAccountCard from './BrokerAccountCard.vue'
import BrokerPositionsTable from './BrokerPositionsTable.vue'
import BrokerOrdersTable from './BrokerOrdersTable.vue'
import ProviderLogo from '@/components/ProviderLogo/ProviderLogo.vue'
import { startVisiblePolling } from '@/utils/visiblePolling'

const FORM_BY_BROKER = {
  forthright: 'ForthrightConnectForm',
  alpaca: 'AlpacaConnectForm',
  ibkr: 'IbkrConnectForm',
  tiger: 'TigerConnectForm',
  webull: 'WebullConnectForm'
}

const DOCS = {
  forthright: 'https://dev-openapi-doc.techfx88.com/zh/index.html',
  alpaca: 'https://app.alpaca.markets/paper/dashboard/overview',
  ibkr: 'https://www.interactivebrokers.com/en/trading/tws.php',
  tiger: 'https://docs-en.itigerup.com/docs/',
  webull: 'https://developer.webull.com/apis/docs/'
}

export default {
  name: 'BrokerPanel',
  components: { ForthrightConnectForm, ForthrightUnlock, AlpacaConnectForm, IbkrConnectForm, TigerConnectForm, WebullConnectForm, BrokerAccountCard, BrokerPositionsTable, BrokerOrdersTable, ProviderLogo },
  props: {
    broker: { type: Object, required: true },
    accounts: { type: Array, default: () => [] },
    credentialId: { type: Number, default: null },
    refreshVersion: { type: Number, default: 0 },
    status: { type: Object, default: () => null },
    loading: { type: Boolean, default: false },
    isDarkTheme: { type: Boolean, default: false },
    cloudBlocked: { type: Boolean, default: false }
  },
  data () {
    return {
      innerTab: this.status && this.status.connected ? 'account' : 'connect',
      refreshing: false
    }
  },
  computed: {
    formComponent () {
      return FORM_BY_BROKER[this.broker.id] || 'AlpacaConnectForm'
    },
    isConnected () {
      return !!(this.status && this.status.connected)
    },
    supportsSavedAccounts () {
      return this.broker.id !== 'ibkr'
    },
    supportsAccountEnvironment () {
      return this.broker.id === 'alpaca' || this.broker.id === 'tiger' || this.broker.id === 'webull'
    },
    connectionStateClass () {
      return this.isConnected ? 'is-connected' : 'is-disconnected'
    },
    docsLink () {
      return DOCS[this.broker.id] || '#'
    },
    docsLinkLabel () {
      return this.$t('brokerAccounts.' + this.broker.id + '.docsLabel')
    },
    helpTextPlain () {
      const raw = this.$t('brokerAccounts.' + this.broker.id + '.helpText')
      return String(raw).replace('{docs}', '').trim()
    }
  },
  watch: {
    isConnected (val) {
      if (val && this.innerTab === 'connect') {
        this.innerTab = 'account'
      } else if (!val) {
        this.innerTab = 'connect'
      }
    }
  },
  mounted () {
    this.stopPolling = startVisiblePolling(async () => {
      const view = this.$refs[this.innerTab]
      if (view && !view.loading && !view.closing && !view.cancellingId) await view.load(true)
    }, { enabled: () => this.isConnected && this.broker.id === 'forthright' && this.accounts.some(account => Number(account.id) === this.credentialId && account.account_type === 'futures') && this.$el?.getClientRects().length > 0 })
  },
  beforeDestroy () { this.clearConnectionSecrets(); this.stopPolling?.() },
  deactivated () { this.clearConnectionSecrets() },
  methods: {
    clearConnectionSecrets () {
      const form = this.$refs.connectForm?.form
      if (!form) return
      for (const key of ['privateKey', 'tradePassword', 'secretKey', 'apiKey', 'appKey', 'appSecret', 'accessToken']) {
        if (Object.prototype.hasOwnProperty.call(form, key)) form[key] = ''
      }
    },
    submitConnection (payload) {
      this.$emit('connect', payload)
      this.clearConnectionSecrets()
    },
    openConnectForm () {
      this.innerTab = 'connect'
    },
    badgeColor (badge) {
      const map = {
        zero_commission: 'green',
        paper_default: 'blue',
        rest_api: 'purple',
        tws_required: 'orange',
        pro_features: 'magenta',
        direct_openapi: 'purple',
        opend_required: 'gold',
        cloud_ready: 'green',
        sandbox_available: 'blue',
        terminal_required: 'gold',
        windows_only: 'red'
      }
      return map[badge] || 'default'
    },
    async onRefresh () {
      this.refreshing = true
      try {
        await this.$emit('refresh')
      } finally {
        setTimeout(() => { this.refreshing = false }, 300)
      }
    }
  }
}
</script>

<style lang="less" scoped>
.bp-account-selector {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  > label {
    flex: 0 0 auto;
    margin: 0;
    color: #475569;
    font-weight: 500;
    line-height: 32px;
  }
  .ant-select { flex: 1; min-width: 220px; max-width: 560px; }
}
.theme-dark .bp-account-selector > label { color: rgba(255, 255, 255, 0.72); }
.broker-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 2px 0;
}
.bp-status-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 4px 0 20px;
  border: 0;
  border-bottom: 1px solid #e8edf3;
  border-radius: 0;
  background: transparent;
  &.is-connected {
    border-bottom-color: #e8edf3;
    background: transparent;
  }
}
.theme-dark .bp-status-card {
  background: transparent;
  border-color: #30343a;
  &.is-connected {
    border-color: #30343a;
    background: transparent;
  }
}
.bp-status-left {
  display: flex;
  gap: 14px;
  flex: 1;
  min-width: 0;
}
.bp-status-icon {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: rgba(24, 144, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  i { font-size: 26px; }
}
.bp-status-meta {
  flex: 1;
  min-width: 0;
}
.bp-status-name {
  font-size: 21px;
  font-weight: 750;
  color: #1f1f1f;
  display: flex;
  align-items: center;
  gap: 8px;
}
.theme-dark .bp-status-name { color: rgba(255, 255, 255, 0.92); }
.bp-status-line {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #595959;
}
.theme-dark .bp-status-line { color: rgba(255, 255, 255, 0.65); }
.bp-status-text { font-weight: 500; }
.bp-status-account { color: var(--primary-color, #1890ff); font-variant-numeric: tabular-nums; }
.bp-badge-row {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.bp-badge { font-size: 11px; }
.bp-status-actions {
  display: flex;
  flex-direction: row;
  gap: 8px;
  flex-shrink: 0;
}
.bp-inner-tabs {
  ::v-deep .ant-tabs-bar { border-bottom-color: #ececec; }
  ::v-deep .ant-tabs-ink-bar { background: var(--primary-color, #1677ff); }
  ::v-deep .ant-tabs-tab {
    color: #475569 !important;
    background: transparent !important;
  }
  ::v-deep .ant-tabs-tab-active,
  ::v-deep .ant-tabs-tab:hover {
    color: var(--primary-color-active, #0958d9) !important;
    background: transparent !important;
  }
  ::v-deep .ant-tabs-tab-active span,
  ::v-deep .ant-tabs-tab:hover span {
    color: inherit;
  }
}
.theme-dark .bp-inner-tabs ::v-deep .ant-tabs-bar { border-bottom-color: #303030; }
.theme-dark .bp-inner-tabs ::v-deep .ant-tabs-ink-bar { background: var(--primary-color, #1890ff); }
.theme-dark .bp-inner-tabs ::v-deep .ant-tabs-tab {
  background: transparent !important;
  color: rgba(255, 255, 255, 0.58) !important;
}
.theme-dark .bp-inner-tabs ::v-deep .ant-tabs-tab span {
  color: inherit;
}
.theme-dark .bp-inner-tabs ::v-deep .ant-tabs-tab:hover {
  background: transparent !important;
  color: var(--primary-color, #1890ff) !important;
}
.theme-dark .bp-inner-tabs ::v-deep .ant-tabs-tab-active {
  background: transparent !important;
  color: var(--primary-color, #1890ff) !important;
}
.theme-dark .bp-inner-tabs ::v-deep .ant-tabs-tab-disabled {
  color: rgba(255, 255, 255, 0.25) !important;
}
.bp-form-wrapper {
  padding: 8px 4px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bp-form-helper {
  font-size: 12px;
  line-height: 1.6;
  color: #8c8c8c;
  background: rgba(24, 144, 255, 0.04);
  border: 1px dashed rgba(24, 144, 255, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  i { color: var(--primary-color, #1890ff); margin-top: 2px; }
  a { color: var(--primary-color, #1890ff); }
}
.theme-dark .bp-form-helper {
  background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, transparent);
  border-color: color-mix(in srgb, var(--primary-color, #1890ff) 30%, transparent);
  color: rgba(255, 255, 255, 0.55);
  a { color: var(--primary-color, #1890ff); }
}
.theme-dark .bp-form-wrapper {
  ::v-deep .broker-form .ant-form-item-label > label {
    color: rgba(255, 255, 255, 0.62);
  }

  ::v-deep .broker-form .ant-input,
  ::v-deep .broker-form .ant-input-password,
  ::v-deep .broker-form textarea.ant-input,
  ::v-deep .broker-form .ant-select-selection {
    background: #141414 !important;
    border-color: #303030 !important;
    color: rgba(255, 255, 255, 0.86) !important;
  }

  ::v-deep .broker-form .ant-input-password .ant-input {
    background: transparent !important;
    border-color: transparent !important;
  }

  ::v-deep .broker-form .ant-input::placeholder {
    color: rgba(255, 255, 255, 0.28);
  }

  ::v-deep .broker-form .ant-select-arrow,
  ::v-deep .broker-form .ant-select-selection-selected-value,
  ::v-deep .broker-form .ant-radio-button-wrapper {
    color: rgba(255, 255, 255, 0.72);
  }

  ::v-deep .broker-form .ant-radio-button-wrapper {
    background: #141414;
    border-color: #303030;
  }

  ::v-deep .broker-form.forthright-form .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
    background: var(--primary-color, #1890ff);
    border-color: var(--primary-color, #1890ff);
    color: #fff;
  }

  ::v-deep .broker-form .ant-input-password-icon {
    color: rgba(255, 255, 255, 0.45);
  }
}
.bp-cloud-alert { margin-bottom: 0; }
</style>
