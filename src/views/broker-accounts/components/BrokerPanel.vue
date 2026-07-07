<template>
  <div class="broker-panel" :class="{ 'theme-dark': isDarkTheme }">
    <!-- Connection summary -->
    <div class="bp-status-card" :class="connectionStateClass">
      <div class="bp-status-left">
        <div class="bp-status-icon">
          <a-icon :type="broker.icon" :style="{ color: broker.color }" />
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
            <span v-if="status && status.connected && (status.accountId || status.host || status.server)" class="bp-status-account">
              · {{ status.accountId || status.server || (status.host + ':' + status.port) }}
            </span>
          </div>
          <div class="bp-badge-row">
            <a-tag v-for="badge in broker.badges" :key="badge" :color="badgeColor(badge)" class="bp-badge">
              {{ $t('brokerAccounts.badges.' + badge) }}
            </a-tag>
            <a-tag v-for="m in broker.markets" :key="'m-' + m" color="cyan" class="bp-badge">{{ m }}</a-tag>
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

    <a-tabs v-model="innerTab" class="bp-inner-tabs">
      <!-- Connect form -->
      <a-tab-pane key="connect" :tab="$t('brokerAccounts.tabConnect')">
        <div class="bp-form-wrapper">
          <component
            :is="formComponent"
            :broker="broker"
            :disabled="loading || cloudBlocked"
            :loading="loading"
            @submit="payload => $emit('connect', payload)"
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
        <broker-account-card :broker-id="broker.id" :is-dark-theme="isDarkTheme" />
      </a-tab-pane>

      <!-- Positions -->
      <a-tab-pane key="positions" :tab="$t('brokerAccounts.tabPositions')" :disabled="!isConnected">
        <broker-positions-table :broker-id="broker.id" :is-dark-theme="isDarkTheme" />
      </a-tab-pane>

      <!-- Open orders -->
      <a-tab-pane key="orders" :tab="$t('brokerAccounts.tabOrders')" :disabled="!isConnected">
        <broker-orders-table
          :broker-id="broker.id"
          :is-dark-theme="isDarkTheme"
          @cancel="orderId => $emit('cancel-order', orderId)"
        />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script>
import AlpacaConnectForm from './forms/AlpacaConnectForm.vue'
import IbkrConnectForm from './forms/IbkrConnectForm.vue'
import BrokerAccountCard from './BrokerAccountCard.vue'
import BrokerPositionsTable from './BrokerPositionsTable.vue'
import BrokerOrdersTable from './BrokerOrdersTable.vue'

const FORM_BY_BROKER = {
  alpaca: 'AlpacaConnectForm',
  ibkr: 'IbkrConnectForm'
}

const DOCS = {
  alpaca: 'https://app.alpaca.markets/paper/dashboard/overview',
  ibkr: 'https://www.interactivebrokers.com/en/trading/tws.php'
}

export default {
  name: 'BrokerPanel',
  components: { AlpacaConnectForm, IbkrConnectForm, BrokerAccountCard, BrokerPositionsTable, BrokerOrdersTable },
  props: {
    broker: { type: Object, required: true },
    status: { type: Object, default: () => null },
    loading: { type: Boolean, default: false },
    isDarkTheme: { type: Boolean, default: false },
    cloudBlocked: { type: Boolean, default: false }
  },
  data () {
    return {
      innerTab: 'connect',
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
  methods: {
    badgeColor (badge) {
      const map = {
        zero_commission: 'green',
        paper_default: 'blue',
        rest_api: 'purple',
        tws_required: 'orange',
        pro_features: 'magenta',
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
.broker-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
}
.bp-status-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid #eef0f3;
  background: linear-gradient(135deg, #ffffff 0%, #f7fafe 100%);
  &.is-connected {
    border-color: rgba(82, 196, 26, 0.35);
    background: linear-gradient(135deg, rgba(82, 196, 26, 0.06) 0%, #fff 60%);
  }
}
.theme-dark .bp-status-card {
  background: linear-gradient(135deg, #1f1f1f 0%, #181818 100%);
  border-color: #303030;
  &.is-connected {
    border-color: rgba(115, 209, 61, 0.4);
    background: linear-gradient(135deg, rgba(115, 209, 61, 0.08) 0%, #1f1f1f 60%);
  }
}
.bp-status-left {
  display: flex;
  gap: 14px;
  flex: 1;
  min-width: 0;
}
.bp-status-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(24, 144, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  i { font-size: 22px; }
}
.bp-status-meta {
  flex: 1;
  min-width: 0;
}
.bp-status-name {
  font-size: 16px;
  font-weight: 700;
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
  flex-direction: column;
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
.bp-cloud-alert { margin-bottom: 0; }
</style>
