<template>
  <div class="crypto-card" :class="{ 'theme-dark': isDarkTheme }">
    <div class="crypto-card-header">
      <div class="crypto-card-title-block">
        <div class="crypto-card-title">
          <a-icon type="api" class="crypto-card-title-icon" />
          {{ $t('brokerAccounts.cryptoSection.title') }}
        </div>
        <div class="crypto-card-subtitle">
          {{ $t('brokerAccounts.cryptoSection.subtitle') }}
        </div>
      </div>
      <div class="crypto-card-actions">
        <a-button :loading="loading" @click="loadCredentials">
          <a-icon type="reload" /> {{ $t('brokerAccounts.refresh') }}
        </a-button>
        <a-button class="crypto-open-account-btn" @click="signupModalVisible = true">
          <a-icon type="rocket" /> {{ $t('profile.exchange.openAccount') }}
        </a-button>
        <a-button type="primary" @click="openAddModal">
          <a-icon type="plus" /> {{ $t('brokerAccounts.cryptoSection.addAccount') }}
        </a-button>
      </div>
    </div>

    <a-spin :spinning="loading">
      <div v-if="!loading && filteredItems.length === 0" class="crypto-empty">
        <a-icon type="inbox" />
        <div class="crypto-empty-text">{{ $t('brokerAccounts.cryptoSection.empty') }}</div>
        <a-button type="link" @click="openAddModal">
          {{ $t('brokerAccounts.cryptoSection.emptyCta') }} →
        </a-button>
      </div>

      <div v-else class="crypto-grid">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="crypto-item"
        >
          <div class="crypto-item-top">
            <div class="crypto-item-icon" :style="{ background: iconBg(item.exchange_id) }">
              {{ exchangeInitial(item.exchange_id) }}
            </div>
            <div class="crypto-item-meta">
              <div class="crypto-item-name">
                {{ exchangeDisplayName(item.exchange_id) }}
                <span class="crypto-item-sep">·</span>
                <span class="crypto-item-alias">{{ credentialAlias(item) }}</span>
              </div>
              <div class="crypto-item-line">
                <span v-if="item.api_key_hint" class="crypto-item-hint">{{ item.api_key_hint }}</span>
                <span v-if="item.created_at" class="crypto-item-time">{{ formatTime(item.created_at) }}</span>
              </div>
            </div>
          </div>
          <div class="crypto-item-footer">
            <a-button size="small" class="crypto-view-account-btn" @click="openSnapshotModal(item)">
              <a-icon type="fund" /> {{ $t('trading-assistant.positions.viewAccountPositions') }}
            </a-button>
            <a-button size="small" @click="openRenameModal(item)">
              <a-icon type="edit" /> {{ $t('brokerAccounts.cryptoSection.editName') }}
            </a-button>
            <a-popconfirm
              :title="$t('brokerAccounts.cryptoSection.confirmDelete', { name: item.name || exchangeDisplayName(item.exchange_id) })"
              :ok-text="$t('brokerAccounts.confirm')"
              :cancel-text="$t('brokerAccounts.cancel')"
              ok-type="danger"
              @confirm="deleteItem(item)"
            >
              <a-button size="small" type="danger" ghost>
                <a-icon type="delete" /> {{ $t('brokerAccounts.cryptoSection.delete') }}
              </a-button>
            </a-popconfirm>
          </div>
        </div>
      </div>
    </a-spin>

    <exchange-account-modal
      :visible.sync="addModalVisible"
      @success="onCredentialSaved"
    />
    <rename-credential-modal
      :visible.sync="renameModalVisible"
      :credential="renameTarget"
      @success="onCredentialRenamed"
    />
    <exchange-signup-modal
      :visible.sync="signupModalVisible"
      :is-dark-theme="isDarkTheme"
    />

    <a-modal
      :visible="snapshotModalVisible"
      :title="snapshotModalTitle"
      :footer="null"
      width="820px"
      :wrap-class-name="snapshotModalWrapClass"
      :body-style="{ paddingTop: '8px' }"
      @cancel="snapshotModalVisible = false"
    >
      <a-spin :spinning="snapshotLoading">
        <a-alert
          v-if="snapshotErrors.length"
          type="error"
          show-icon
          class="snapshot-error-alert"
          :message="$t('trading-assistant.positions.snapshotFetchErrors')"
        >
          <template slot="description">
            <ul class="snapshot-error-list">
              <li v-for="(err, idx) in snapshotErrors" :key="idx">{{ err }}</li>
            </ul>
          </template>
        </a-alert>
        <a-alert
          v-else-if="snapshotPartial"
          type="warning"
          show-icon
          class="snapshot-error-alert"
          :message="$t('trading-assistant.positions.snapshotPartial')"
        />
        <a-alert
          v-if="!snapshotErrors.length"
          type="info"
          show-icon
          class="snapshot-modal-hint"
          :message="$t('trading-assistant.positions.sharedCredentialHint')"
        />
        <div v-if="snapshotFetchedAt" class="snapshot-fetched-at">
          {{ $t('trading-assistant.positions.liveFetchedAt') }}: {{ formatTime(snapshotFetchedAt) }}
        </div>
        <a-tabs v-model="snapshotActiveTab" class="snapshot-tabs">
          <a-tab-pane key="swap" :tab="swapTabLabel">
            <a-table
              v-if="swapRows.length"
              :columns="positionColumns"
              :data-source="swapRows"
              :pagination="false"
              size="small"
              row-key="rowKey"
              :scroll="{ x: 560 }"
            />
            <a-empty
              v-else
              :description="snapshotErrors.length ? $t('trading-assistant.positions.fetchFailedShort') : $t('trading-assistant.positions.noSwapPositions')"
            />
          </a-tab-pane>
          <a-tab-pane key="spot" :tab="spotTabLabel">
            <a-table
              v-if="spotRows.length"
              :columns="positionColumns"
              :data-source="spotRows"
              :pagination="false"
              size="small"
              row-key="rowKey"
              :scroll="{ x: 560 }"
            />
            <a-empty
              v-else
              :description="snapshotErrors.length ? $t('trading-assistant.positions.fetchFailedShort') : $t('trading-assistant.positions.noSpotPositions')"
            />
          </a-tab-pane>
          <a-tab-pane key="orders" :tab="ordersTabLabel">
            <a-table
              v-if="orderRows.length"
              :columns="orderColumns"
              :data-source="orderRows"
              :pagination="false"
              size="small"
              row-key="rowKey"
              :scroll="{ x: 720 }"
            />
            <a-empty
              v-else
              :description="snapshotErrors.length ? $t('trading-assistant.positions.fetchFailedShort') : $t('trading-assistant.positions.noOpenOrders')"
            />
          </a-tab-pane>
        </a-tabs>
      </a-spin>
    </a-modal>
  </div>
</template>

<script>
import { listExchangeCredentials, deleteExchangeCredential } from '@/api/credentials'
import { getAccountSnapshot } from '@/api/strategy'
import ExchangeAccountModal from '@/components/ExchangeAccountModal/ExchangeAccountModal.vue'
import ExchangeSignupModal from '@/components/ExchangeSignupModal/ExchangeSignupModal.vue'
import RenameCredentialModal from '@/components/RenameCredentialModal/RenameCredentialModal.vue'
import { CRYPTO_EXCHANGE_IDS, getExchangeDisplayName } from '@/utils/exchangeCredential'
import moment from 'moment'

const DISPLAY_NAMES = {
  binance: 'Binance',
  okx: 'OKX',
  bitget: 'Bitget',
  bybit: 'Bybit',
  coinbaseexchange: 'Coinbase',
  kraken: 'Kraken',
  kucoin: 'KuCoin',
  gate: 'Gate.io',
  bitfinex: 'Bitfinex',
  htx: 'HTX'
}

const ICON_COLORS = {
  binance: '#F0B90B',
  okx: '#000',
  bitget: '#00D1FF',
  bybit: '#F7A600',
  coinbaseexchange: '#1652F0',
  kraken: '#5741D9',
  kucoin: '#24AE8F',
  gate: '#17E1A4',
  bitfinex: '#16B157',
  htx: '#1B2C3B'
}

export default {
  name: 'CryptoExchangeAccountsCard',
  components: { ExchangeAccountModal, ExchangeSignupModal, RenameCredentialModal },
  props: {
    isDarkTheme: { type: Boolean, default: false }
  },
  data () {
    return {
      items: [],
      loading: false,
      addModalVisible: false,
      signupModalVisible: false,
      renameModalVisible: false,
      renameTarget: null,
      snapshotModalVisible: false,
      snapshotLoading: false,
      snapshotTarget: null,
      snapshotActiveTab: 'swap',
      swapRows: [],
      spotRows: [],
      orderRows: [],
      snapshotFetchedAt: null,
      snapshotErrors: [],
      snapshotPartial: false
    }
  },
  computed: {
    filteredItems () {
      return this.items.filter(it => CRYPTO_EXCHANGE_IDS.has(String(it.exchange_id || '').toLowerCase()))
    },
    snapshotModalTitle () {
      const item = this.snapshotTarget
      if (!item) return this.$t('trading-assistant.positions.accountPositionsTitle')
      const name = this.credentialAlias(item)
      const ex = this.exchangeDisplayName(item.exchange_id)
      return `${this.$t('trading-assistant.positions.accountPositionsTitle')} · ${ex} (${name})`
    },
    swapTabLabel () {
      const n = this.swapRows.length
      return n > 0
        ? `${this.$t('trading-assistant.positions.tabSwap')} (${n})`
        : this.$t('trading-assistant.positions.tabSwap')
    },
    spotTabLabel () {
      const n = this.spotRows.length
      return n > 0
        ? `${this.$t('trading-assistant.positions.tabSpot')} (${n})`
        : this.$t('trading-assistant.positions.tabSpot')
    },
    ordersTabLabel () {
      const n = this.orderRows.length
      return n > 0
        ? `${this.$t('trading-assistant.positions.tabOpenOrders')} (${n})`
        : this.$t('trading-assistant.positions.tabOpenOrders')
    },
    snapshotModalWrapClass () {
      const base = 'exchange-account-snapshot-modal'
      return this.isDarkTheme ? `${base} ${base}--dark` : base
    },
    positionColumns () {
      return [
        { title: this.$t('trading-assistant.table.symbol'), dataIndex: 'symbol', width: 120 },
        { title: this.$t('trading-assistant.table.side'), dataIndex: 'sideLabel', width: 80 },
        { title: this.$t('trading-assistant.table.size'), dataIndex: 'sizeLabel', width: 120 },
        { title: this.$t('trading-assistant.table.entryPrice'), dataIndex: 'entryLabel', width: 120 }
      ]
    },
    orderColumns () {
      return [
        { title: this.$t('trading-assistant.table.symbol'), dataIndex: 'symbol', width: 110 },
        { title: this.$t('trading-assistant.table.side'), dataIndex: 'sideLabel', width: 72 },
        { title: this.$t('trading-assistant.positions.orderType'), dataIndex: 'orderTypeLabel', width: 90 },
        { title: this.$t('trading-assistant.table.price'), dataIndex: 'priceLabel', width: 100 },
        { title: this.$t('trading-assistant.table.amount'), dataIndex: 'amountLabel', width: 100 },
        { title: this.$t('trading-assistant.positions.filled'), dataIndex: 'filledLabel', width: 90 },
        { title: this.$t('trading-assistant.positions.orderStatus'), dataIndex: 'statusLabel', width: 90 }
      ]
    }
  },
  mounted () {
    this.loadCredentials()
  },
  methods: {
    exchangeDisplayName (id) {
      return getExchangeDisplayName(id) || DISPLAY_NAMES[id] || (id ? id.toUpperCase() : '--')
    },
    credentialAlias (item) {
      const alias = (item && item.name && String(item.name).trim()) || ''
      if (alias) return alias
      const hint = item && item.api_key_hint
      if (hint) return hint
      return this.$t('brokerAccounts.cryptoSection.unnamed')
    },
    exchangeInitial (id) {
      const name = this.exchangeDisplayName(id)
      return name.charAt(0).toUpperCase()
    },
    iconBg (id) {
      return ICON_COLORS[id] || 'var(--primary-color, #1890ff)'
    },
    formatTime (raw) {
      if (raw === null || raw === undefined || raw === '') return ''
      const ts = Number(raw)
      if (Number.isFinite(ts) && ts > 0) {
        // Backend fetched_at is Unix seconds; moment(number) treats numbers as ms → 1970 bug.
        const m = ts < 1e12 ? moment.unix(Math.floor(ts)) : moment(Math.floor(ts))
        return m.isValid() ? m.format('YYYY-MM-DD HH:mm:ss') : ''
      }
      const m = moment(raw)
      return m.isValid() ? m.format('YYYY-MM-DD HH:mm:ss') : ''
    },
    mapPositionRows (rows) {
      return (rows || []).map((r, idx) => {
        const side = String(r.side || '').toLowerCase()
        const size = parseFloat(r.size || 0)
        const entry = parseFloat(r.entry_price || 0)
        return {
          rowKey: r.inst_id || `${r.symbol}-${side}-${idx}`,
          symbol: r.symbol || '',
          sideLabel: side === 'long'
            ? this.$t('trading-assistant.table.long')
            : side === 'short'
              ? this.$t('trading-assistant.table.short')
              : side,
          sizeLabel: Number.isFinite(size) ? size.toFixed(4) : '--',
          entryLabel: entry > 0 ? `$${entry.toFixed(4)}` : '--'
        }
      })
    },
    mapOrderRows (rows) {
      return (rows || []).map((r, idx) => {
        const side = String(r.side || '').toLowerCase()
        const px = parseFloat(r.price || 0)
        const amt = parseFloat(r.amount || 0)
        const filled = parseFloat(r.filled || 0)
        return {
          rowKey: r.exchange_order_id || `${r.symbol}-${side}-${idx}`,
          symbol: r.symbol || '',
          sideLabel: side === 'buy' || side === 'long'
            ? this.$t('trading-assistant.table.buy')
            : side === 'sell' || side === 'short'
              ? this.$t('trading-assistant.table.sell')
              : side,
          orderTypeLabel: String(r.order_type || '--'),
          priceLabel: px > 0 ? `$${px.toFixed(4)}` : '--',
          amountLabel: Number.isFinite(amt) ? amt.toFixed(4) : '--',
          filledLabel: Number.isFinite(filled) ? filled.toFixed(4) : '--',
          statusLabel: String(r.status || '--')
        }
      })
    },
    async loadCredentials () {
      this.loading = true
      try {
        const res = await listExchangeCredentials()
        if (res && res.code === 1 && res.data && Array.isArray(res.data.items)) {
          this.items = res.data.items
        } else {
          this.items = []
        }
      } catch (_) {
        this.items = []
      } finally {
        this.loading = false
      }
    },
    openAddModal () {
      this.addModalVisible = true
    },
    onCredentialSaved () {
      this.loadCredentials()
    },
    openRenameModal (item) {
      this.renameTarget = item ? { ...item } : null
      this.renameModalVisible = true
    },
    onCredentialRenamed () {
      this.loadCredentials()
    },
    async openSnapshotModal (item) {
      this.snapshotTarget = item
      this.snapshotModalVisible = true
      this.snapshotActiveTab = 'swap'
      this.snapshotLoading = true
      this.swapRows = []
      this.spotRows = []
      this.orderRows = []
      this.snapshotFetchedAt = null
      this.snapshotErrors = []
      this.snapshotPartial = false
      try {
        const res = await getAccountSnapshot({ credential_id: item.id })
        const data = (res && res.data) ? res.data : {}
        this.swapRows = this.mapPositionRows(data.swap_positions || [])
        this.spotRows = this.mapPositionRows(data.spot_positions || [])
        this.orderRows = this.mapOrderRows(data.open_orders || [])
        this.snapshotFetchedAt = data.fetched_at || null
        this.snapshotPartial = !!data.partial
        const warnings = Array.isArray(data.warnings) ? data.warnings.filter(Boolean) : []
        if (data.error) {
          this.snapshotErrors = [data.error, ...warnings.filter(w => w !== data.error)]
        } else {
          this.snapshotErrors = warnings
        }
        if (this.snapshotErrors.length) {
          if (!this.swapRows.length && !this.spotRows.length && !this.orderRows.length) {
            this.$message.error(this.snapshotErrors[0])
          } else {
            this.$message.warning(this.snapshotErrors[0])
          }
        } else if (res && res.code !== 1 && res.msg) {
          this.$message.warning(res.msg)
        }
      } catch (e) {
        this.snapshotErrors = [this.$t('trading-assistant.positions.snapshotFailed')]
        this.$message.error(this.$t('trading-assistant.positions.snapshotFailed'))
      } finally {
        this.snapshotLoading = false
      }
    },
    async deleteItem (item) {
      try {
        const res = await deleteExchangeCredential(item.id)
        if (res && res.code === 1) {
          this.$message.success(this.$t('brokerAccounts.cryptoSection.deleteSuccess'))
          this.loadCredentials()
        } else {
          this.$message.error((res && res.msg) || this.$t('brokerAccounts.cryptoSection.deleteFailed'))
        }
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('brokerAccounts.cryptoSection.deleteFailed'))
      }
    }
  }
}
</script>

<style lang="less" scoped>
.crypto-card {
  background: #fff;
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
  margin-bottom: 16px;
}
.crypto-card.theme-dark {
  background: #1f1f1f;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
}
.crypto-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}
.crypto-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f1f1f;
  display: flex;
  align-items: center;
  gap: 8px;
}
.crypto-card-title-icon { color: var(--primary-color, #1890ff); font-size: 18px; }
.crypto-card-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
  max-width: 600px;
  line-height: 1.55;
}
.crypto-card.theme-dark {
  .crypto-card-title { color: rgba(255, 255, 255, 0.92); }
  .crypto-card-subtitle { color: rgba(255, 255, 255, 0.55); }
}
.crypto-card-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.crypto-open-account-btn {
  border-color: #d9d9d9;
  color: #3f4a5a;
  background: #fff;
}
.crypto-open-account-btn:hover,
.crypto-open-account-btn:focus {
  border-color: var(--primary-color, #1890ff);
  color: var(--primary-color-active, #096dd9);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, #ffffff);
}
.crypto-empty {
  text-align: center;
  padding: 32px 16px;
  color: #8c8c8c;
  i { font-size: 28px; color: #d9d9d9; display: block; margin-bottom: 10px; }
}
.crypto-empty-text { font-size: 13px; margin-bottom: 6px; }
.crypto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.crypto-item {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 14px 16px;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  background: linear-gradient(135deg, #ffffff 0%, #fafbfd 100%);
  transition: border-color 0.2s, box-shadow 0.2s;
  min-width: 0;
}
.crypto-item:hover {
  border-color: rgba(24, 144, 255, 0.35);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.08);
}
.crypto-card.theme-dark .crypto-item {
  background: linear-gradient(135deg, #262626 0%, #1f1f1f 100%);
  border-color: #303030;
}
.crypto-item-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}
.crypto-item-icon {
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  color: #fff;
  font-weight: 700;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.crypto-item-meta {
  flex: 1;
  min-width: 0;
}
.crypto-item-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f1f1f;
  line-height: 1.45;
  word-break: break-word;
}
.crypto-card.theme-dark .crypto-item-name { color: rgba(255, 255, 255, 0.92); }
.crypto-item-sep { color: #bfbfbf; margin: 0 2px; }
.crypto-item-alias { color: #595959; font-weight: 500; }
.crypto-card.theme-dark .crypto-item-alias { color: rgba(255, 255, 255, 0.7); }
.crypto-item-line {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: #8c8c8c;
}
.crypto-item-hint {
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}
.crypto-item-time { color: #bfbfbf; font-size: 11px; }
.crypto-card.theme-dark .crypto-item-time { color: rgba(255, 255, 255, 0.4); }
.crypto-item-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eef0f3;
}
.crypto-card.theme-dark .crypto-item-footer {
  border-top-color: #303030;
}
.crypto-view-account-btn {
  border-color: var(--primary-color, #1677ff);
  background: color-mix(in srgb, var(--primary-color, #1677ff) 10%, #ffffff);
  color: var(--primary-color-active, #0958d9);
  font-weight: 600;
}
.crypto-view-account-btn:hover,
.crypto-view-account-btn:focus {
  border-color: var(--primary-color-active, #0958d9);
  background: var(--primary-color, #1677ff);
  color: #fff;
}
.crypto-card.theme-dark {
  .crypto-open-account-btn {
    border-color: #3a3a3a;
    color: rgba(255, 255, 255, 0.78);
    background: #262626;
  }
  .crypto-open-account-btn:hover,
  .crypto-open-account-btn:focus {
    border-color: var(--primary-color, #1890ff);
    color: var(--primary-color, #1890ff);
    background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent);
  }
  .crypto-view-account-btn {
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 55%, transparent);
    background: color-mix(in srgb, var(--primary-color, #1890ff) 16%, transparent);
    color: var(--primary-color-hover, #9ecbff);
  }
  .crypto-view-account-btn:hover,
  .crypto-view-account-btn:focus {
    border-color: var(--primary-color, #1890ff);
    background: var(--primary-color-active, #1f6feb);
    color: #fff;
  }
}
.snapshot-modal-hint { margin-bottom: 10px; }
.snapshot-error-alert { margin-bottom: 10px; }
.snapshot-error-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
}
.snapshot-fetched-at {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 8px;
}
.snapshot-tabs {
  margin-top: 4px;
}
</style>

<style lang="less">
.exchange-account-snapshot-modal--dark {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body {
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.86);
  }

  .ant-modal-header {
    border-bottom-color: #303030;
  }

  .ant-modal-title {
    color: rgba(255, 255, 255, 0.92);
  }

  .ant-modal-close {
    color: rgba(255, 255, 255, 0.56);

    &:hover {
      color: rgba(255, 255, 255, 0.86);
    }
  }

  .snapshot-fetched-at {
    color: rgba(255, 255, 255, 0.56);
  }

  .ant-alert-info {
    background: #102437;
    border-color: #164a72;
  }

  .ant-alert-warning {
    background: rgba(250, 173, 20, 0.12);
    border-color: rgba(250, 173, 20, 0.38);
  }

  .ant-alert-error {
    background: rgba(255, 77, 79, 0.12);
    border-color: rgba(255, 77, 79, 0.38);
  }

  .ant-alert-message,
  .ant-alert-description {
    color: rgba(255, 255, 255, 0.86);
  }

  .ant-tabs-bar {
    border-bottom-color: #3a3a3a;
  }

  .ant-tabs-nav .ant-tabs-tab {
    color: rgba(255, 255, 255, 0.58);

    &:hover {
      color: #69c0ff;
    }
  }

  .ant-tabs-nav .ant-tabs-tab-active {
    color: var(--primary-color-hover, #40a9ff);
  }

  .ant-tabs-ink-bar {
    background: var(--primary-color, #1890ff);
  }

  .ant-table,
  .ant-table-content,
  .ant-table-body,
  .ant-table-placeholder {
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.82);
  }

  .ant-table-thead > tr > th {
    background: #141414;
    color: rgba(255, 255, 255, 0.78);
    border-bottom-color: #3a3a3a;
  }

  .ant-table-tbody > tr > td {
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.84);
    border-bottom-color: #3a3a3a;
  }

  .ant-table-tbody > tr:hover:not(.ant-table-expanded-row) > td,
  .ant-table-tbody > tr.ant-table-row-hover > td,
  .ant-table-tbody > tr.ant-table-row-selected > td {
    background: #262626 !important;
    color: rgba(255, 255, 255, 0.92);
  }

  .ant-table-placeholder {
    border-top-color: #3a3a3a;
    border-bottom-color: #3a3a3a;
  }

  .ant-empty-description {
    color: rgba(255, 255, 255, 0.56);
  }
}
</style>
