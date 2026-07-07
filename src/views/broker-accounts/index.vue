<template>
  <div class="broker-accounts" :class="{ 'theme-dark': isDarkTheme }">
    <div class="ba-header">
      <div class="ba-header-text">
        <div class="ba-title">
          <a-icon type="bank" />
          <span>{{ $t('brokerAccounts.title') }}</span>
        </div>
        <div class="ba-subtitle">{{ $t('brokerAccounts.subtitle') }}</div>
      </div>
      <div class="ba-header-actions">
        <a-button :loading="refreshing" @click="refreshAll">
          <a-icon type="reload" /> {{ $t('brokerAccounts.refreshAll') }}
        </a-button>
      </div>
    </div>

    <crypto-exchange-accounts-card :is-dark-theme="isDarkTheme" />

    <div class="ba-section-divider">
      <span class="ba-section-divider-label">
        <a-icon type="api" />
        {{ $t('brokerAccounts.restSection.title') }}
      </span>
      <span class="ba-section-divider-hint">{{ $t('brokerAccounts.restSection.hint') }}</span>
    </div>

    <a-alert
      v-if="!desktopBrokersAllowedLoading && !desktopBrokersAllowed"
      type="info"
      show-icon
      class="ba-cloud-alert"
      :message="$t('brokerAccounts.cloudOnlyAlert')"
    />

    <a-tabs v-model="activeBroker" class="ba-tabs" type="card" @change="onBrokerChange">
      <a-tab-pane v-for="b in availableBrokers" :key="b.id">
        <template #tab>
          <span class="ba-tab-label">
            <a-icon :type="b.icon" />
            <span>{{ $t('brokerAccounts.' + b.id + '.name') }}</span>
            <a-badge
              v-if="connectionMap[b.id] && connectionMap[b.id].connected"
              status="success"
              class="ba-tab-badge"
            />
            <a-badge
              v-else
              status="default"
              class="ba-tab-badge"
            />
          </span>
        </template>

        <broker-panel
          :broker="b"
          :status="connectionMap[b.id]"
          :loading="loadingMap[b.id]"
          :is-dark-theme="isDarkTheme"
          :cloud-blocked="isBrokerBlocked(b.id)"
          @connect="payload => handleConnect(b.id, payload)"
          @disconnect="() => handleDisconnect(b.id)"
          @refresh="() => loadOne(b.id)"
          @place-order="payload => handlePlaceOrder(b.id, payload)"
          @cancel-order="orderId => handleCancelOrder(b.id, orderId)"
        />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script>
import { broker, BROKER_IDS, BROKER_META } from '@/api/broker'
import { getDesktopBrokersPolicy } from '@/api/credentials'
import BrokerPanel from './components/BrokerPanel.vue'
import CryptoExchangeAccountsCard from './components/CryptoExchangeAccountsCard.vue'
import { baseMixin } from '@/store/app-mixin'

export default {
  name: 'BrokerAccounts',
  components: { BrokerPanel, CryptoExchangeAccountsCard },
  mixins: [baseMixin],
  data () {
    return {
      activeBroker: 'alpaca',
      connectionMap: {},
      loadingMap: {},
      refreshing: false,
      desktopBrokersAllowed: true,
      desktopBrokersAllowedLoading: true
    }
  },
  computed: {
    isDarkTheme () {
      return this.theme === 'dark' || (this.$store && this.$store.getters && this.$store.getters.theme === 'dark')
    },
    availableBrokers () {
      return BROKER_IDS.map(id => BROKER_META[id])
    }
  },
  async mounted () {
    // IMPORTANT: resolve the desktop-broker policy BEFORE firing any
    // /api/ibkr/status requests. On SaaS deployments those endpoints
    // intentionally return a long bilingual rejection message which used to
    // surface as a misleading toast/console error during the initial load.
    await this.loadDesktopPolicy()
    this.refreshAll()
  },
  methods: {
    async loadDesktopPolicy () {
      try {
        const res = await getDesktopBrokersPolicy()
        const payload = (res && (res.data || res)) || {}
        const flag = payload.allow_local_desktop_brokers
        if (flag === undefined || flag === null) {
          this.desktopBrokersAllowed = !!(payload.allowed || payload.allow || payload.enabled)
        } else {
          this.desktopBrokersAllowed = !!flag
        }
      } catch (_) {
        this.desktopBrokersAllowed = true
      } finally {
        this.desktopBrokersAllowedLoading = false
      }
    },
    isBrokerBlocked (id) {
      const meta = BROKER_META[id]
      if (!meta) return false
      return !this.desktopBrokersAllowed && !meta.cloudFriendly
    },
    onBrokerChange (id) {
      if (this.isBrokerBlocked(id)) {
        if (!this.connectionMap[id]) {
          this.$set(this.connectionMap, id, { connected: false, blocked: true })
        }
        return
      }
      if (!this.connectionMap[id]) this.loadOne(id)
    },
    async refreshAll () {
      this.refreshing = true
      try {
        await Promise.all(BROKER_IDS.map(id => this.loadOne(id)))
      } finally {
        this.refreshing = false
      }
    },
    async loadOne (id) {
      // SaaS / cloud deployments disable IBKR (no local TWS/Gateway
      // reachable). Skip the network call entirely so users don't
      // see the bilingual rejection payload in DevTools or as an error toast.
      if (this.isBrokerBlocked(id)) {
        this.$set(this.connectionMap, id, { connected: false, blocked: true })
        this.$set(this.loadingMap, id, false)
        return
      }
      this.$set(this.loadingMap, id, true)
      try {
        const res = await broker[id].status()
        const normalized = this.normalizeStatus(id, res)
        this.$set(this.connectionMap, id, normalized)
      } catch (e) {
        this.$set(this.connectionMap, id, { connected: false, error: e && e.message })
      } finally {
        this.$set(this.loadingMap, id, false)
      }
    },
    normalizeStatus (id, res) {
      if (!res) return { connected: false }
      const payload = res.data && Object.prototype.hasOwnProperty.call(res.data, 'connected')
        ? res.data
        : (res.data && res.data.data) || res
      return {
        connected: !!payload.connected,
        accountId: payload.account_id || payload.account || payload.login || null,
        paper: payload.paper === true || payload.paper === 'true',
        baseUrl: payload.base_url || payload.baseUrl || '',
        host: payload.host || '',
        port: payload.port || null,
        server: payload.server || '',
        raw: payload
      }
    },
    async handleConnect (id, payload) {
      this.$set(this.loadingMap, id, true)
      try {
        const res = await broker[id].connect(payload)
        if (res && (res.success || (res.data && res.data.success))) {
          this.$message.success(this.$t('brokerAccounts.connectSuccess'))
          await this.loadOne(id)
        } else {
          const msg = (res && (res.error || (res.data && res.data.error))) || this.$t('brokerAccounts.connectFailed')
          this.$message.error(msg)
        }
      } catch (e) {
        this.$message.error((e && (e.error || e.message)) || this.$t('brokerAccounts.connectFailed'))
      } finally {
        this.$set(this.loadingMap, id, false)
      }
    },
    async handleDisconnect (id) {
      this.$set(this.loadingMap, id, true)
      try {
        await broker[id].disconnect()
        this.$message.success(this.$t('brokerAccounts.disconnectSuccess'))
        this.$set(this.connectionMap, id, { connected: false })
      } catch (e) {
        this.$message.error((e && (e.error || e.message)) || this.$t('brokerAccounts.disconnectFailed'))
      } finally {
        this.$set(this.loadingMap, id, false)
      }
    },
    async handlePlaceOrder (id, payload) {
      try {
        const res = await broker[id].placeOrder(payload)
        if (res && (res.success || (res.data && res.data.success))) {
          this.$message.success(this.$t('brokerAccounts.orderPlaced'))
          return true
        }
        const msg = (res && (res.error || (res.data && res.data.error))) || this.$t('brokerAccounts.orderFailed')
        this.$message.error(msg)
      } catch (e) {
        this.$message.error((e && (e.error || e.message)) || this.$t('brokerAccounts.orderFailed'))
      }
      return false
    },
    async handleCancelOrder (id, orderId) {
      try {
        const res = await broker[id].cancelOrder(orderId)
        if (res && (res.success || (res.data && res.data.success))) {
          this.$message.success(this.$t('brokerAccounts.orderCancelled'))
        }
      } catch (e) {
        this.$message.error((e && (e.error || e.message)) || this.$t('brokerAccounts.cancelFailed'))
      }
    }
  }
}
</script>

<style lang="less" scoped>
.broker-accounts {
  padding: 16px !important;
  min-height: calc(100vh - 64px);
  background: #f5f7fa;
  &.theme-dark {
    background: #0f0f10;
  }
}
.ba-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.ba-header-text {
  max-width: 720px;
}
.ba-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e3a5f;
  display: flex;
  align-items: center;
  gap: 12px;

  .anticon {
    font-size: 28px;
    color: var(--primary-color, #1890ff);
  }
}
.ba-subtitle {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #64748b;
}
.broker-accounts.theme-dark {
  .ba-title { color: rgba(255, 255, 255, 0.92); }
  .ba-subtitle { color: rgba(255, 255, 255, 0.55); }
}
.ba-cloud-alert {
  margin-bottom: 16px;
}
.ba-section-divider {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 8px 4px 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e8e8e8;
}
.ba-section-divider-label {
  font-size: 14px;
  font-weight: 700;
  color: #1f1f1f;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  i { color: #722ed1; }
}
.ba-section-divider-hint {
  font-size: 12px;
  color: #8c8c8c;
}
.broker-accounts.theme-dark {
  .ba-section-divider { border-bottom-color: #303030; }
  .ba-section-divider-label { color: rgba(255, 255, 255, 0.92); }
  .ba-section-divider-hint { color: rgba(255, 255, 255, 0.55); }
}
.ba-tabs {
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px 18px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);

  ::v-deep .ant-tabs-card-bar .ant-tabs-tab {
    color: #475569 !important;
    background: #f8fafc !important;
    border-color: #e5e7eb !important;
  }

  ::v-deep .ant-tabs-card-bar .ant-tabs-tab:hover {
    color: var(--primary-color-active, #0958d9) !important;
    border-color: color-mix(in srgb, var(--primary-color, #1677ff) 34%, #e5e7eb) !important;
    background: color-mix(in srgb, var(--primary-color, #1677ff) 5%, #ffffff) !important;
  }

  ::v-deep .ant-tabs-tab-active {
    border-color: color-mix(in srgb, var(--primary-color, #1677ff) 36%, transparent) !important;
    background: #ffffff !important;
    color: var(--primary-color-active, #0958d9) !important;
  }

  ::v-deep .ant-tabs-tab-active .ba-tab-label,
  ::v-deep .ant-tabs-tab-active .ba-tab-label span,
  ::v-deep .ant-tabs-tab-active .ba-tab-label .anticon {
    color: var(--primary-color-active, #0958d9);
  }

  ::v-deep .ba-tab-label,
  ::v-deep .ba-tab-label span,
  ::v-deep .ba-tab-label .anticon {
    color: inherit;
  }
}
.broker-accounts.theme-dark .ba-tabs {
  background: #181818;
  border: 1px solid #2a2a2a;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);

  ::v-deep .ant-tabs-bar {
    border-bottom-color: #303030;
  }

  ::v-deep .ant-tabs-nav-container {
    color: rgba(255, 255, 255, 0.68);
  }

  ::v-deep .ant-tabs-card-bar .ant-tabs-tab {
    background: #111214 !important;
    border-color: #303030 !important;
    color: rgba(255, 255, 255, 0.58) !important;
  }

  ::v-deep .ant-tabs-card-bar .ant-tabs-tab:hover {
    background: #171b20 !important;
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 36%, #303030) !important;
    color: var(--primary-color, #1890ff) !important;
  }

  ::v-deep .ant-tabs-card-bar .ant-tabs-tab-active {
    background: #16181b !important;
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 55%, transparent) !important;
    color: var(--primary-color, #1890ff) !important;
  }

  ::v-deep .ant-tabs-tab-disabled {
    background: #101010 !important;
    color: rgba(255, 255, 255, 0.25) !important;
  }

  ::v-deep .ba-tab-label,
  ::v-deep .ba-tab-label span,
  ::v-deep .ba-tab-label .anticon {
    color: inherit;
  }

  ::v-deep .ant-badge-status-default {
    background-color: rgba(255, 255, 255, 0.3);
  }
}
.ba-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  i { font-size: 16px; }
}
.ba-tab-badge {
  margin-left: 2px;
}
</style>
