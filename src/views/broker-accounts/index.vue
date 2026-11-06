<template>
  <div class="broker-accounts qd-workspace-page qd-page-frame" :class="{ 'theme-dark': isDarkTheme }">
    <div class="ba-header qd-page-heading">
      <div class="ba-header-text qd-page-heading__copy">
        <div class="ba-title qd-page-heading__title">
          <a-icon class="qd-page-heading__icon" type="bank" />
          <span>{{ $t('brokerAccounts.commandCenterTitle') }}</span>
        </div>
        <div class="ba-subtitle qd-page-heading__description">{{ $t('brokerAccounts.commandCenterSubtitle') }}</div>
      </div>
      <div class="ba-header-actions">
        <div class="ba-health">
          <span class="ba-health-label">{{ $t('brokerAccounts.connectionHealth') }}</span>
          <span class="ba-health-state" :class="{ 'is-healthy': connectedCount > 0 }">
            <i class="ba-health-dot" />
            {{ connectedCount > 0 ? $t('brokerAccounts.allHealthy') : $t('brokerAccounts.notConnected') }}
          </span>
        </div>
        <a-button :loading="refreshing" @click="refreshAll">
          <a-icon type="reload" /> {{ $t('brokerAccounts.refreshAll') }}
        </a-button>
        <a-button @click="signupModalVisible = true">
          <a-icon type="rocket" /> {{ $t('profile.exchange.openAccount') }}
        </a-button>
        <a-dropdown :trigger="['click']">
          <a-button type="primary">
            <a-icon type="plus" /> {{ $t('brokerAccounts.addAccount') }}
          </a-button>
          <a-menu slot="overlay" @click="handleAddAccountMenu">
            <a-menu-item v-if="cryptoProviders.length" key="crypto"><a-icon type="api" /> {{ $t('brokerAccounts.cryptoAccounts') }}</a-menu-item>
            <a-menu-item v-for="brokerItem in availableBrokers" :key="brokerItem.id">
              <provider-logo class="ba-menu-provider-logo" :provider="brokerItem.id" :size="15" />
              {{ $t('brokerAccounts.' + brokerItem.id + '.name') }}
            </a-menu-item>
          </a-menu>
        </a-dropdown>
      </div>
    </div>

    <div class="ba-workbench">
      <aside class="ba-rail">
        <div class="ba-rail-heading">
          <span>{{ $t('brokerAccounts.connections') }}</span>
          <a-icon type="up" />
        </div>

        <div class="ba-rail-group">
          <div class="ba-rail-label">
            <span>{{ $t('brokerAccounts.tradingAccounts') }}</span>
            <strong>{{ availableBrokers.length }}</strong>
          </div>
          <button
            v-for="b in availableBrokers"
            :key="b.id"
            type="button"
            class="ba-provider-row"
            :class="{ active: activeProvider === b.id }"
            @click="selectProvider(b.id)"
          >
            <span class="ba-provider-icon ba-provider-icon--broker" :style="{ '--brand-color': b.color }">
              <provider-logo :provider="b.id" :size="24" />
            </span>
            <span class="ba-provider-copy">
              <strong>{{ $t('brokerAccounts.' + b.id + '.name') }}</strong>
              <small>
                <i :class="{ connected: isBrokerConnected(b.id) }" />
                {{ isBrokerConnected(b.id) ? $t('brokerAccounts.connected') : $t('brokerAccounts.notConnected') }}
              </small>
            </span>
          </button>
        </div>

        <div v-if="cryptoProviders.length" class="ba-rail-group ba-rail-group--crypto">
          <div class="ba-rail-label">
            <span>{{ $t('brokerAccounts.cryptoAccounts') }}</span>
            <strong>{{ cryptoProviders.length }}</strong>
          </div>
          <button
            v-for="exchange in cryptoProviders"
            :key="exchange.id"
            type="button"
            class="ba-provider-row ba-provider-row--crypto"
            :class="{ active: activeProvider === 'crypto:' + exchange.id }"
            @click="selectProvider('crypto:' + exchange.id)"
          >
            <span class="ba-provider-icon" :style="{ '--brand-color': exchange.color }">
              <provider-logo :provider="exchange.id" :size="22" />
            </span>
            <span class="ba-provider-copy">
              <strong>{{ exchange.name }}</strong>
              <small>
                <i :class="{ connected: hasCryptoCredential(exchange.id) }" />
                {{ hasCryptoCredential(exchange.id) ? $t('brokerAccounts.connected') : $t('brokerAccounts.notConnected') }}
              </small>
            </span>
          </button>
        </div>
      </aside>

      <main class="ba-detail" :class="{ 'ba-detail--crypto': !selectedBroker }">
        <a-alert
          v-if="selectedBroker && !desktopBrokersAllowedLoading && isBrokerBlocked(selectedBroker.id)"
          type="info"
          show-icon
          class="ba-cloud-alert"
          :message="$t('brokerAccounts.cloudOnlyAlert')"
        />
        <broker-panel
          v-if="selectedBroker"
          ref="brokerPanel"
          :key="selectedBroker.id + ':' + (selectedCredentialId || '')"
          :broker="selectedBroker"
          :accounts="selectedBrokerAccounts"
          :credential-id="selectedCredentialId"
          :refresh-version="refreshVersion"
          :status="connectionMap[selectedBroker.id]"
          :loading="loadingMap[selectedBroker.id]"
          :is-dark-theme="isDarkTheme"
          :cloud-blocked="isBrokerBlocked(selectedBroker.id)"
          @connect="payload => handleConnect(selectedBroker.id, payload)"
          @disconnect="() => handleDisconnect(selectedBroker.id)"
          @refresh="() => loadOne(selectedBroker.id)"
          @select-account="selectBrokerAccount"
          @place-order="payload => handlePlaceOrder(selectedBroker.id, payload)"
        />
        <crypto-exchange-accounts-card
          v-else
          ref="cryptoCard"
          :is-dark-theme="isDarkTheme"
          :exchange-id="selectedCryptoExchangeId"
          @summary-change="handleCryptoSummary"
        />
      </main>
    </div>

    <exchange-signup-modal
      :visible.sync="signupModalVisible"
      :is-dark-theme="isDarkTheme"
    />
  </div>
</template>

<script>
import { broker, BROKER_IDS, BROKER_META } from '@/api/broker'
import { getDesktopBrokersPolicy, listExchangeCredentials } from '@/api/credentials'
import { getPublicSettingsConfig } from '@/api/settings'
import BrokerPanel from './components/BrokerPanel.vue'
import CryptoExchangeAccountsCard from './components/CryptoExchangeAccountsCard.vue'
import ExchangeSignupModal from '@/components/ExchangeSignupModal/ExchangeSignupModal.vue'
import ProviderLogo from '@/components/ProviderLogo/ProviderLogo.vue'
import { baseMixin } from '@/store/app-mixin'
import { normalizeEnabledTradingVenues } from '@/utils/tradingVenueConfig'

const ALL_TRADING_VENUE_IDS = ['alpaca', 'ibkr', 'tiger', 'webull', 'binance', 'okx', 'bybit', 'bitget', 'gate', 'htx']

const CRYPTO_PROVIDERS = [
  { id: 'binance', name: 'Binance', color: '#f0b90b' },
  { id: 'okx', name: 'OKX', color: '#7c8798' },
  { id: 'bybit', name: 'Bybit', color: '#f7a600' },
  { id: 'bitget', name: 'Bitget', color: '#00a6c8' },
  { id: 'gate', name: 'Gate.io', color: '#2354e6' },
  { id: 'htx', name: 'HTX', color: '#2e64fe' }
]

export default {
  name: 'BrokerAccounts',
  components: { BrokerPanel, CryptoExchangeAccountsCard, ExchangeSignupModal, ProviderLogo },
  mixins: [baseMixin],
  data () {
    return {
      activeBroker: 'alpaca',
      activeProvider: 'alpaca',
      connectionMap: {},
      brokerAccounts: {},
      brokerCredentialIds: {},
      refreshVersion: 0,
      loadingMap: {},
      requestVersions: {},
      cryptoCredentialItems: [],
      refreshing: false,
      signupModalVisible: false,
      desktopBrokersAllowed: true,
      desktopBrokersAllowedLoading: true,
      enabledTradingVenues: [...ALL_TRADING_VENUE_IDS]
    }
  },
  computed: {
    isDarkTheme () {
      const theme = this.navTheme || (this.$store && this.$store.getters && this.$store.getters.theme)
      return theme === 'dark' || theme === 'realdark'
    },
    availableBrokers () {
      const enabled = new Set(this.enabledTradingVenues)
      return BROKER_IDS.filter(id => enabled.has(id)).map(id => BROKER_META[id])
    },
    cryptoProviders () {
      const enabled = new Set(this.enabledTradingVenues)
      return CRYPTO_PROVIDERS.filter(provider => enabled.has(provider.id))
    },
    selectedBroker () {
      return BROKER_META[this.activeProvider] || null
    },
    selectedBrokerAccounts () {
      return this.selectedBroker ? (this.brokerAccounts[this.selectedBroker.id] || []) : []
    },
    selectedCredentialId () {
      return this.selectedBroker ? (this.brokerCredentialIds[this.selectedBroker.id] || null) : null
    },
    selectedCryptoExchangeId () {
      const prefix = 'crypto:'
      return String(this.activeProvider || '').startsWith(prefix)
        ? this.activeProvider.slice(prefix.length).trim().toLowerCase()
        : ''
    },
    connectedCount () {
      return this.availableBrokers.filter(item => this.isBrokerConnected(item.id)).length + this.cryptoCredentialItems.length
    }
  },
  async mounted () {
    // IMPORTANT: resolve the desktop-broker policy BEFORE firing any
    // /api/ibkr/status requests. On SaaS deployments those endpoints
    // intentionally return a long bilingual rejection message which used to
    // surface as a misleading toast/console error during the initial load.
    await Promise.all([this.loadDesktopPolicy(), this.loadTradingVenueConfig()])
    this.refreshAll()
  },
  methods: {
    async loadTradingVenueConfig () {
      try {
        const res = await getPublicSettingsConfig()
        const payload = (res && res.data) || {}
        this.enabledTradingVenues = normalizeEnabledTradingVenues(payload.enabled_trading_venues)
      } catch (_) {
        this.enabledTradingVenues = [...ALL_TRADING_VENUE_IDS]
      }
      const availableIds = [
        ...this.availableBrokers.map(item => item.id),
        ...this.cryptoProviders.map(item => `crypto:${item.id}`)
      ]
      if (!availableIds.includes(this.activeProvider)) {
        this.activeProvider = availableIds[0] || ''
        this.activeBroker = this.availableBrokers[0] ? this.availableBrokers[0].id : ''
      }
    },
    isBrokerConnected (id) {
      return !!(this.connectionMap[id] && this.connectionMap[id].connected)
    },
    hasCryptoCredential (exchangeId) {
      return this.cryptoCredentialItems.some(item => String(item.exchange_id || '').toLowerCase() === exchangeId)
    },
    selectProvider (provider) {
      this.activeProvider = provider
      if (BROKER_META[provider]) {
        this.activeBroker = provider
        this.onBrokerChange(provider)
      }
    },
    handleAddAccountMenu ({ key }) {
      if (key === 'crypto') {
        this.openCryptoAdd()
        return
      }
      this.selectProvider(key)
      this.$nextTick(() => {
        if (this.$refs.brokerPanel) this.$refs.brokerPanel.openConnectForm()
      })
    },
    openCryptoAdd () {
      const firstProvider = this.cryptoProviders[0]
      if (!firstProvider) return
      this.activeProvider = `crypto:${firstProvider.id}`
      this.$nextTick(() => {
        if (this.$refs.cryptoCard) this.$refs.cryptoCard.openAddModal()
      })
    },
    handleCryptoSummary (payload) {
      this.cryptoCredentialItems = payload && Array.isArray(payload.items) ? payload.items : []
    },
    async loadCryptoSummary () {
      try {
        const res = await listExchangeCredentials()
        this.cryptoCredentialItems = res && res.code === 1 && res.data && Array.isArray(res.data.items)
          ? res.data.items
          : []
      } catch (_) {
        this.cryptoCredentialItems = []
      }
    },
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
        await Promise.all([...this.availableBrokers.map(item => this.loadOne(item.id)), this.loadCryptoSummary()])
      } finally {
        this.refreshing = false
      }
    },
    async loadOne (id) {
      const version = (this.requestVersions[id] || 0) + 1
      this.$set(this.requestVersions, id, version)
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
        if (BROKER_META[id] && id !== 'ibkr') {
          const response = await broker[id].accounts()
          if (this.requestVersions[id] !== version) return
          const payload = response && response.data
          const items = Array.isArray(payload) ? payload : (payload && payload.data) || []
          this.$set(this.brokerAccounts, id, items)
          const currentId = this.brokerCredentialIds[id]
          if (!items.some(item => Number(item.id) === currentId)) {
            this.$set(this.brokerCredentialIds, id, items.length ? Number(items[0].id) : null)
          }
        }
        const res = await broker[id].status(this.accountParams(id))
        if (this.requestVersions[id] !== version) return
        const normalized = this.normalizeStatus(id, res)
        this.$set(this.connectionMap, id, normalized)
        this.refreshVersion += 1
      } catch (e) {
        if (this.requestVersions[id] !== version) return
        this.$set(this.connectionMap, id, { connected: false, error: e && e.message })
      } finally {
        if (this.requestVersions[id] === version) this.$set(this.loadingMap, id, false)
      }
    },
    accountParams (id) {
      const credentialId = this.brokerCredentialIds[id]
      return credentialId ? { credential_id: credentialId } : {}
    },
    selectBrokerAccount (credentialId) {
      const id = this.selectedBroker && this.selectedBroker.id
      if (!id) return
      this.$set(this.brokerCredentialIds, id, Number(credentialId))
      this.$set(this.connectionMap, id, { connected: false })
      this.loadOne(id).catch(() => undefined)
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
          if (id !== 'ibkr') {
            const status = (res.data && res.data.data) || res.data || {}
            this.$set(this.brokerCredentialIds, id, Number(status.credential_id) || null)
          }
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
        await broker[id].disconnect(this.accountParams(id))
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
        const res = await broker[id].placeOrder({ ...payload, ...this.accountParams(id) })
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
        const res = await broker[id].cancelOrder(orderId, this.accountParams(id))
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
  height: calc(100vh - 64px);
  min-height: 660px;
  padding: var(--qd-page-gutter, 16px) !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f7f9fc;
}

.ba-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 40px;
  margin-bottom: 10px;
}

.ba-header-text {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  gap: 16px;
  min-width: 0;
}

.ba-title {
  flex: 0 0 auto;
  font-size: 20px;
  font-weight: 750;
  color: #182338;
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: -0.02em;

  .anticon {
    font-size: 19px;
    color: var(--primary-color, #1890ff);
  }
}

.ba-subtitle {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.45;
  color: #64748b;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ba-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.ba-health {
  padding-right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-right: 1px solid #e6eaf0;
  white-space: nowrap;
}

.ba-health-label {
  font-size: 12px;
  color: #8490a3;
}

.ba-health-state {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--primary-color-active, #389e0d);
  font-size: 12px;
  font-weight: 600;
}

.ba-health-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-color, #52c41a);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color, #52c41a) 12%, transparent);
}

.ba-workbench {
  min-height: 0;
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 294px minmax(0, 1fr);
  background: #fff;
  border: 1px solid #e5eaf1;
  border-radius: 14px;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.055);
  overflow: hidden;
}

.ba-rail {
  min-height: 0;
  overflow-y: auto;
  border-right: 1px solid #e9edf3;
  background: #fbfcfe;
  scrollbar-width: thin;
}

.ba-rail-heading {
  height: 54px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e9edf3;
  color: #253147;
  font-size: 14px;
  font-weight: 700;
}

.ba-rail-group {
  padding: 18px 10px 10px;
}

.ba-rail-group--crypto {
  margin-top: 6px;
  padding-top: 16px;
  border-top: 1px solid #e9edf3;
}

.ba-rail-label {
  margin-bottom: 8px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #7b8799;
  font-size: 12px;
  font-weight: 600;

  strong {
    color: var(--primary-color-active, #389e0d);
    font-size: 12px;
  }
}

.ba-provider-row {
  width: 100%;
  min-height: 58px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #344158;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    background: #f1f5f9;
  }

  &.active {
    background: color-mix(in srgb, var(--primary-color, #52c41a) 10%, #fff);
    color: var(--primary-color-active, #389e0d);
    box-shadow: inset 3px 0 0 var(--primary-color, #52c41a);
  }
}

.ba-provider-row--crypto {
  min-height: 52px;
}

.ba-menu-provider-logo {
  display: inline-block;
  margin-right: 8px;
  vertical-align: -3px;
}

.ba-provider-icon {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e6eaf0;
  border-radius: 9px;
  border-color: color-mix(in srgb, var(--brand-color, #7c8798) 26%, #e6eaf0);
  background: color-mix(in srgb, var(--brand-color, #7c8798) 12%, #fff);
  color: var(--brand-color, #7c8798);
  font-size: 17px;
}

.ba-provider-icon--broker {
  color: #2563eb;
}

.ba-provider-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    overflow: hidden;
    color: inherit;
    font-size: 13px;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #929cad;
    font-size: 11px;
  }

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #c3cad4;

    &.connected {
      background: var(--primary-color, #52c41a);
    }
  }
}

.ba-detail {
  min-width: 0;
  min-height: 0;
  padding: 20px 22px 24px;
  overflow-y: auto;
  background: #fff;
  scrollbar-width: thin;
}

.ba-detail--crypto {
  padding: 0;

  ::v-deep .crypto-card {
    min-height: 100%;
    margin: 0;
    border-radius: 0;
    box-shadow: none;
  }
}

.ba-cloud-alert {
  margin-bottom: 16px;
}

.broker-accounts.theme-dark {
  background: #080808;

  .ba-title {
    color: rgba(255, 255, 255, 0.93);
  }

  .ba-subtitle,
  .ba-health-label {
    color: rgba(255, 255, 255, 0.48);
  }

  .ba-health {
    border-right-color: #2c3036;
  }

  .ba-workbench {
    background: #111;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 16px 38px rgba(0, 0, 0, 0.28);
  }

  .ba-rail {
    background: #0d0d0d;
    border-right-color: rgba(255, 255, 255, 0.1);
  }

  .ba-rail-heading,
  .ba-rail-group--crypto {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .ba-rail-heading {
    color: rgba(255, 255, 255, 0.86);
  }

  .ba-rail-label {
    color: rgba(255, 255, 255, 0.42);
  }

  .ba-provider-row {
    color: rgba(255, 255, 255, 0.72);

    &:hover {
      background: #181818;
    }

    &.active {
      background: color-mix(in srgb, var(--primary-color, #52c41a) 13%, #111);
      color: var(--primary-color, #73d13d);
    }
  }

  .ba-provider-icon {
    background: #181818;
    border-color: rgba(255, 255, 255, 0.12);
  }

  .ba-provider-copy small {
    color: rgba(255, 255, 255, 0.4);
  }

  .ba-detail {
    background: #111;
  }
}

@media (max-width: 1080px) {
  .broker-accounts {
    height: auto;
    min-height: calc(100vh - 64px);
    overflow: visible;
  }

  .ba-header {
    align-items: center;
  }

  .ba-subtitle,
  .ba-health {
    display: none;
  }

  .ba-workbench {
    min-height: 760px;
    grid-template-columns: 240px minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .broker-accounts {
    padding: 16px !important;
  }

  .ba-header {
    align-items: stretch;
    flex-direction: column;
  }

  .ba-header-text {
    width: 100%;
  }

  .ba-header-actions {
    width: 100%;

    > .ant-btn,
    > .ant-dropdown-trigger {
      flex: 1;
    }
  }

  .ba-workbench {
    display: block;
    min-height: 0;
    overflow: visible;
  }

  .ba-rail {
    max-height: 360px;
    border-right: 0;
    border-bottom: 1px solid #e9edf3;
  }

  .ba-detail {
    overflow: visible;
  }
}
</style>

<style lang="less">
@import './broker-accounts-polish.less';
</style>
