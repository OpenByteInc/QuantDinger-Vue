<template>
  <div class="quick-trade-panel-root">
    <component
      :is="embedded ? 'div' : 'a-drawer'"
      v-bind="containerProps"
      @close="handleClose"
      class="quick-trade-shell"
      :class="[embedded ? 'quick-trade-embedded' : 'quick-trade-drawer', { 'theme-dark': isDark, 'qt-embedded-ide': embedded && embeddedIde }]"
    >
      <!-- Header (hidden in embedded mode since parent tab already shows title) -->
      <div v-if="!embedded" class="qt-header">
        <div class="qt-header-left">
          <a-icon type="thunderbolt" theme="filled" class="qt-icon" />
          <span class="qt-header-title">{{ $t('quickTrade.title') }}</span>
        </div>
        <a-icon type="close" class="qt-close" @click="handleClose" />
      </div>

      <!-- Symbol & Price Bar -->
      <div class="qt-symbol-bar">
        <div class="qt-symbol-selector">
          <a-select
            v-model="currentSymbol"
            show-search
            :placeholder="$t('quickTrade.selectSymbol')"
            style="width: 100%"
            :filter-option="false"
            :not-found-content="symbolSearching ? null : undefined"
            :get-popup-container="qtSelectPopupContainer"
            :dropdown-class-name="qtSelectDropdownClass"
            @search="handleSymbolSearch"
            @change="handleSymbolChange"
            @focus="handleSymbolFocus"
            :loading="symbolSearching"
          >
            <a-icon slot="suffixIcon" type="search" style="color: #999" />
            <a-select-option
              v-for="item in symbolSuggestions"
              :key="item.value"
              :value="item.value"
            >
              <div class="qt-symbol-option">
                <span class="qt-symbol-option-name">{{ item.symbol }}</span>
                <span v-if="item.name" class="qt-symbol-option-desc">{{ item.name }}</span>
              </div>
            </a-select-option>
          </a-select>
        </div>
        <div class="qt-price-display" :class="priceChangeClass">
          <span class="qt-current-price">${{ formatPrice(currentPrice) }}</span>
        </div>
      </div>

      <div :class="['qt-embedded-split', { 'qt-embedded-split--cols': embedded }]">
        <div class="qt-embedded-col qt-embedded-col-left">

          <!-- Credential Selector -->
          <div class="qt-section">
            <div class="qt-label">{{ $t('quickTrade.exchange') }} <span class="qt-crypto-hint">{{ $t('quickTrade.cryptoOnly') }}</span></div>
            <a-select
              v-model="selectedCredentialId"
              :placeholder="$t('quickTrade.selectExchange')"
              style="width: 100%"
              :get-popup-container="qtSelectPopupContainer"
              :dropdown-class-name="qtSelectDropdownClass"
              @change="onCredentialChange"
              :loading="credLoading"
              :notFoundContent="$t('quickTrade.noExchange')"
            >
              <a-select-option v-for="c in credentials" :key="c.id" :value="c.id">
                {{ formatCredentialOptionLabel(c) }}
                <a-tag v-if="c.enable_demo_trading" color="orange" size="small" style="margin-left: 6px;">{{ $t('quickTrade.testnetTag') }}</a-tag>
                <a-tag v-if="c.market_type" size="small" style="margin-left: 6px;">{{ c.market_type }}</a-tag>
              </a-select-option>
            </a-select>
            <div class="qt-account-actions">
              <a-button type="primary" block size="small" class="qt-add-account-btn" @click="showAddExchangeModal = true">
                <a-icon type="plus" /> {{ $t('quickTrade.addAccountInline') }}
              </a-button>
            </div>
            <div class="qt-balance" v-if="selectedCredentialId">
              <template v-if="balanceLoading">
                <a-spin size="small" />
                <span class="qt-balance-label qt-balance-loading-text">{{ $t('quickTrade.available') }}…</span>
              </template>
              <template v-else>
                <div
                  class="qt-balance-line"
                  :class="{ 'qt-balance-line--active': isSwapMode }"
                >
                  <span class="qt-balance-label">{{ $t('quickTrade.swapAvailable') }}</span>
                  <span class="qt-balance-value">${{ formatPrice(swapBalanceAvailable) }}</span>
                </div>
                <div
                  class="qt-balance-line"
                  :class="{ 'qt-balance-line--active': !isSwapMode }"
                >
                  <span class="qt-balance-label">{{ $t('quickTrade.spotAvailable') }}</span>
                  <span class="qt-balance-value">${{ formatPrice(spotBalanceAvailable) }}</span>
                </div>
                <div
                  v-if="balanceErrorMessage"
                  class="qt-balance-error-hint"
                  :title="balance.error"
                >
                  {{ balanceErrorMessage }}
                </div>
              </template>
            </div>
          </div>

          <!-- Direction Toggle -->
          <div class="qt-section">
            <div class="qt-direction-toggle" :class="{ 'qt-direction-toggle--spot': !isSwapMode }">
              <div
                class="qt-dir-btn qt-dir-long"
                :class="{ active: side === 'buy', 'qt-dir-btn--solo': !isSwapMode }"
                @click="setTradeSide('buy')"
              >
                <a-icon type="arrow-up" />
                {{ isSwapMode ? $t('quickTrade.long') : $t('quickTrade.buySpot') }}
              </div>
              <div
                v-if="isSwapMode"
                class="qt-dir-btn qt-dir-short"
                :class="{ active: side === 'sell' }"
                @click="setTradeSide('sell')"
              >
                <a-icon type="arrow-down" /> {{ $t('quickTrade.short') }}
              </div>
            </div>
            <div v-if="!isSwapMode" class="qt-hint-text qt-hint-inline">{{ $t('quickTrade.spotBuyOnlyHint') }}</div>
          </div>

          <!-- Order Type -->
          <div class="qt-section">
            <a-radio-group v-model="orderType" button-style="solid" size="small" style="width: 100%;">
              <a-radio-button value="market" style="width: 50%; text-align: center;">
                {{ $t('quickTrade.market') }}
              </a-radio-button>
              <a-radio-button value="limit" style="width: 50%; text-align: center;">
                {{ $t('quickTrade.limit') }}
              </a-radio-button>
            </a-radio-group>
          </div>

          <!-- Limit Price -->
          <div class="qt-section" v-if="orderType === 'limit'">
            <div class="qt-label">{{ $t('quickTrade.limitPrice') }}</div>
            <a-input-number
              v-model="limitPrice"
              :min="0"
              :step="priceStep"
              :precision="pricePrecision"
              style="width: 100%"
              :placeholder="$t('quickTrade.enterPrice')"
            />
          </div>

          <!-- Amount (USDT) -->
          <div class="qt-section qt-amount-block">
            <div class="qt-label">{{ $t('quickTrade.amount') }} (USDT)</div>
            <a-input-number
              v-model="amount"
              :min="1"
              :step="10"
              :precision="2"
              style="width: 100%"
              :placeholder="$t('quickTrade.enterAmount')"
            />
            <div class="qt-quick-amounts">
              <a-button
                v-for="pct in quickAmountPcts"
                :key="pct"
                size="small"
                @click="setAmountByPercent(pct)"
                :disabled="activeBalanceAvailable <= 0"
              >
                {{ pct }}%
              </a-button>
            </div>
          </div>

          <!-- Mode & Leverage -->
          <div class="qt-section qt-card qt-mode-card">
            <div class="qt-section-title-row">
              <span class="qt-section-title">{{ isSwapMode ? $t('quickTrade.leverage') : $t('quickTrade.spotModeTitle') }}</span>
              <div class="qt-mode-toggle">
                <div
                  class="qt-mode-toggle-item"
                  :class="{ active: tradeMode === 'swap' }"
                  @click="tradeMode = 'swap'"
                >{{ $t('quickTrade.contractBadge') }}</div>
                <div
                  class="qt-mode-toggle-item"
                  :class="{ active: tradeMode === 'spot' }"
                  @click="tradeMode = 'spot'"
                >{{ $t('quickTrade.spotModeTitle') }}</div>
              </div>
            </div>
            <template v-if="isSwapMode">
              <div class="qt-leverage-row">
                <div class="qt-leverage-slider-wrap">
                  <a-slider
                    v-model="leverage"
                    :min="1"
                    :max="125"
                    :marks="leverageMarks"
                    :tipFormatter="v => v + 'x'"
                  />
                </div>
                <a-input-number
                  v-model="leverage"
                  :min="1"
                  :max="125"
                  :formatter="v => `${v}x`"
                  :parser="v => String(v).replace('x', '')"
                  class="qt-leverage-input"
                />
              </div>
              <div class="qt-label qt-label-spaced">{{ $t('quickTrade.marginMode') }}</div>
              <a-radio-group v-model="marginMode" size="small" button-style="solid" class="qt-margin-radio">
                <a-radio-button value="cross">{{ $t('quickTrade.crossMargin') }}</a-radio-button>
                <a-radio-button value="isolated">{{ $t('quickTrade.isolatedMargin') }}</a-radio-button>
              </a-radio-group>
              <div class="qt-hint-text">{{ $t('quickTrade.marginModeHint') }}</div>
            </template>
            <template v-else>
              <div class="qt-spot-info">
                <a-icon type="wallet" class="qt-spot-info-icon" />
                <span class="qt-hint-text">{{ $t('quickTrade.spotModeHint') }}</span>
              </div>
            </template>
          </div>

          <!-- TP / SL (optional, always expanded) -->
          <div class="qt-section qt-card qt-tpsl-card">
            <div class="qt-section-title-row">
              <span class="qt-section-title">{{ $t('quickTrade.tpsl') }}</span>
              <span class="qt-optional-tag">{{ $t('quickTrade.optional') }}</span>
            </div>
            <div class="qt-tpsl-row">
              <div class="qt-tpsl-item">
                <span class="qt-label qt-tp-label">{{ $t('quickTrade.tp') }}</span>
                <a-input-number
                  v-model="tpPrice"
                  :min="0"
                  :step="priceStep"
                  :precision="pricePrecision"
                  class="qt-input-full"
                  :placeholder="$t('quickTrade.tpPlaceholder')" />
              </div>
              <div class="qt-tpsl-item">
                <span class="qt-label qt-sl-label">{{ $t('quickTrade.sl') }}</span>
                <a-input-number
                  v-model="slPrice"
                  :min="0"
                  :step="priceStep"
                  :precision="pricePrecision"
                  class="qt-input-full"
                  :placeholder="$t('quickTrade.slPlaceholder')" />
              </div>
            </div>
            <div class="qt-hint-text qt-tpsl-record-hint">{{ $t('quickTrade.tpslRecordOnlyHint') }}</div>
          </div>

          <!-- Submit Button (embedded: half-width inside left col) -->
          <div class="qt-submit-section qt-submit-section--embedded-left">
            <a-button
              :type="side === 'buy' ? 'primary' : 'danger'"
              size="large"
              block
              :loading="submitting"
              :disabled="!canSubmit"
              @click="handleSubmit"
              class="qt-submit-btn"
              :class="[side === 'buy' ? 'qt-btn-long' : 'qt-btn-short']"
            >
              <a-icon :type="side === 'buy' ? 'arrow-up' : 'arrow-down'" />
              {{ isSwapMode
                ? (side === 'buy' ? $t('quickTrade.buyLong') : $t('quickTrade.sellShort'))
                : $t('quickTrade.buySpot') }}
              {{ symbol }}
            </a-button>
          </div>

        </div>
        <div class="qt-embedded-col qt-embedded-col-right">

          <!-- Current Positions -->
          <div class="qt-position-section">
            <div class="qt-section-header">
              <a-icon type="wallet" /> {{ $t('quickTrade.currentPosition') }}
              <span v-if="currentPositions.length > 1" class="qt-position-count">({{ currentPositions.length }})</span>
            </div>
            <template v-if="currentPositions.length > 0">
              <div v-if="isSwapMode" class="qt-close-scope qt-close-scope-global">
                <a-radio-group v-model="closeScope" size="small" class="qt-close-scope-radio">
                  <a-radio-button value="full">{{ $t('quickTrade.closeScopeFull') }}</a-radio-button>
                  <a-radio-button value="system_tracked">{{ $t('quickTrade.closeScopeSystem') }}</a-radio-button>
                </a-radio-group>
                <div class="qt-hint-text">{{ $t('quickTrade.closeScopeSystemHint') }}</div>
              </div>
              <div
                v-for="(pos, idx) in currentPositions"
                :key="'pos-' + idx + '-' + (pos.side || '') + '-' + String(pos.size || '')"
                class="qt-position-card"
                :class="pos.side"
              >
                <div class="qt-pos-row">
                  <span>{{ $t('quickTrade.side') }}</span>
                  <a-tag :color="pos.side === 'long' ? '#52c41a' : '#f5222d'" size="small">
                    {{ pos.side === 'long'
                      ? (isSwapMode ? $t('quickTrade.long') : $t('quickTrade.spotHold'))
                      : $t('quickTrade.short') }}
                  </a-tag>
                </div>
                <div class="qt-pos-row">
                  <span>{{ $t('quickTrade.posSize') }}</span>
                  <span>{{ pos.size }}</span>
                </div>
                <div class="qt-pos-row">
                  <span>{{ $t('quickTrade.entryPrice') }}</span>
                  <span>${{ formatPrice(pos.entry_price) }}</span>
                </div>
                <div class="qt-pos-row" v-if="pos.mark_price">
                  <span>{{ $t('quickTrade.markPrice') }}</span>
                  <span>${{ formatPrice(pos.mark_price) }}</span>
                </div>
                <div class="qt-pos-row" v-if="pos.leverage && pos.leverage > 1">
                  <span>{{ $t('quickTrade.leverage') }}</span>
                  <span>{{ pos.leverage }}x</span>
                </div>
                <div class="qt-pos-row">
                  <span>{{ $t('quickTrade.unrealizedPnl') }}</span>
                  <span :class="pos.unrealized_pnl >= 0 ? 'qt-green' : 'qt-red'">
                    ${{ formatPrice(pos.unrealized_pnl) }}
                  </span>
                </div>
                <a-button
                  type="danger"
                  size="small"
                  block
                  ghost
                  @click="handleClosePosition(pos)"
                  :loading="closingPositionSide === pos.side"
                  style="margin-top: 8px;"
                >
                  {{ isSwapMode ? $t('quickTrade.closePosition') : $t('quickTrade.sellSpot') }}
                </a-button>
              </div>
            </template>
            <div v-else class="qt-position-empty">
              <a-icon type="inbox" class="qt-empty-icon" />
              <span class="qt-empty-desc">{{ $t('quickTrade.noPositionHint') }}</span>
            </div>
          </div>

          <!-- Recent Trades -->
          <div class="qt-history-section" v-if="recentTrades.length > 0">
            <a-collapse :bordered="false" :activeKey="historyCollapsed ? [] : ['history']" @change="handleHistoryCollapse">
              <a-collapse-panel key="history" :showArrow="false" :style="collapseStyle">
                <template slot="header">
                  <div class="qt-section-header" style="margin: 0; padding: 0;">
                    <a-icon type="history" /> {{ $t('quickTrade.recentTrades') }}
                    <span class="qt-history-count">({{ recentTrades.length }})</span>
                  </div>
                </template>
                <div class="qt-trade-list">
                  <div class="qt-trade-item" v-for="t in recentTrades" :key="t.id">
                    <div class="qt-trade-main">
                      <a-tag :color="t.side === 'buy' ? '#52c41a' : '#f5222d'" size="small">
                        {{ t.side === 'buy' ? 'LONG' : 'SHORT' }}
                      </a-tag>
                      <span class="qt-trade-symbol">{{ t.symbol }}</span>
                      <span class="qt-trade-amount">${{ formatPrice(t.amount) }}</span>
                    </div>
                    <div class="qt-trade-meta">
                      <a-tag :color="t.status === 'filled' ? '#52c41a' : t.status === 'failed' ? '#f5222d' : '#faad14'" size="small">
                        {{ t.status }}
                      </a-tag>
                      <span class="qt-trade-time">{{ formatTime(t.created_at) }}</span>
                    </div>
                  </div>
                </div>
              </a-collapse-panel>
            </a-collapse>
          </div>

        </div>
      </div>

    </component>
    <exchange-account-modal
      :visible.sync="showAddExchangeModal"
      :overlay-mount="() => qtOverlayMount()"
      @success="onExchangeAccountSaved"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { listExchangeCredentials } from '@/api/credentials'
import { formatExchangeCredentialLabel } from '@/utils/exchangeCredential'
import ExchangeAccountModal from '@/components/ExchangeAccountModal/ExchangeAccountModal.vue'
import { placeQuickOrder, getQuickTradeBalance, getQuickTradePosition, getQuickTradeHistory, closeQuickTradePosition } from '@/api/quick-trade'
import { searchSymbols, getWatchlist } from '@/api/market'
import { getUserInfo } from '@/api/login'
import request from '@/utils/request'

export default {
  name: 'QuickTradePanel',
  components: { ExchangeAccountModal },
  props: {
    visible: { type: Boolean, default: false },
    symbol: { type: String, default: '' },
    presetSide: { type: String, default: '' }, // 'buy' or 'sell' — pre-filled from AI signal
    presetPrice: { type: Number, default: 0 },
    source: { type: String, default: 'manual' }, // ai_radar / ai_analysis / indicator / manual
    marketType: { type: String, default: 'swap' }, // swap / spot
    embedded: { type: Boolean, default: false },
    embeddedIde: { type: Boolean, default: false },
    overlayGetContainer: { type: Function, default: null }
  },
  data () {
    return {
      // exchange
      credentials: [],
      selectedCredentialId: undefined,
      credLoading: false,
      balanceLoading: false,
      balance: {
        available: 0,
        total: 0,
        swap: { available: 0, total: 0 },
        spot: { available: 0, total: 0 }
      },
      // order
      side: 'buy',
      orderType: 'market',
      limitPrice: 0,
      amount: 100,
      leverage: 5,
      tradeMode: 'swap',
      marginMode: 'cross',
      tpPrice: null,
      slPrice: null,
      // state
      submitting: false,
      closingPositionSide: null, // 'long' | 'short' | null — which leg is closing
      currentPrice: 0,
      currentPositions: [],
      recentTrades: [],
      historyCollapsed: true, // 交易记录默认折叠
      closeScope: 'full', // full | system_tracked（合约一键平仓范围）
      // symbol search
      currentSymbol: '',
      symbolSuggestions: [],
      symbolSearching: false,
      symbolSearchTimer: null,
      userId: null, // 用户ID，用于获取自选列表
      // constants
      quickAmountPcts: [10, 25, 50, 75, 100],
      // polling
      pollTimer: null,
      showAddExchangeModal: false
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDark () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    qtSelectDropdownClass () {
      return this.embeddedIde ? 'ide-qt-select-dropdown' : ''
    },
    isSwapMode () {
      return this.tradeMode === 'swap'
    },
    leverageMarks () {
      const keys = this.embeddedIde ? [1, 50, 125] : [1, 25, 50, 100, 125]
      return keys.reduce((acc, v) => {
        acc[v] = `${v}x`
        return acc
      }, {})
    },
    effectiveMarketType () {
      return this.tradeMode
    },
    swapBalanceAvailable () {
      const leg = this.balance && this.balance.swap
      if (leg && leg.available != null) return parseFloat(leg.available) || 0
      if (!this.isSwapMode) return 0
      return parseFloat(this.balance.available) || 0
    },
    spotBalanceAvailable () {
      const leg = this.balance && this.balance.spot
      if (leg && leg.available != null) return parseFloat(leg.available) || 0
      if (this.isSwapMode) return 0
      return parseFloat(this.balance.available) || 0
    },
    activeBalanceAvailable () {
      return this.isSwapMode ? this.swapBalanceAvailable : this.spotBalanceAvailable
    },
    balanceErrorMessage () {
      const err = (this.balance && this.balance.error) || ''
      if (!err) return ''
      if (/40018|Invalid IP|invalid ip/i.test(err)) {
        const ip = (this.balance && this.balance.request_ip) || ''
        return this.$t('quickTrade.errorBitgetIpWhitelist', { ip: ip || '—' })
      }
      if (this.balance && this.balance.error_hint_key) {
        const key = this.balance.error_hint_key
        if (this.$te && this.$te(key)) return this.$t(key)
      }
      return err.length > 120 ? `${err.slice(0, 120)}…` : err
    },
    priceStep () {
      if (this.currentPrice > 10000) return 1
      if (this.currentPrice > 100) return 0.1
      if (this.currentPrice > 1) return 0.01
      return 0.0001
    },
    pricePrecision () {
      if (this.currentPrice > 10000) return 0
      if (this.currentPrice > 100) return 1
      if (this.currentPrice > 1) return 2
      return 4
    },
    canSubmit () {
      return this.selectedCredentialId && this.currentSymbol && this.amount > 0 && !this.submitting
    },
    priceChangeClass () {
      return ''
    },
    collapseStyle () {
      return { background: 'transparent', borderRadius: '4px', border: 0, overflow: 'hidden' }
    },
    containerProps () {
      if (this.embedded) return {}
      return {
        title: null,
        width: 400,
        visible: this.visible,
        closable: false,
        bodyStyle: { padding: 0 },
        maskStyle: { background: 'rgba(0,0,0,0.45)' }
      }
    }
  },
  watch: {
    visible (val) {
      if (this.embedded) {
        if (val) {
          this.init()
        } else {
          this.stopPolling()
        }
        return
      }
      if (val) {
        this.init()
      } else {
        this.stopPolling()
      }
    },
    symbol (val) {
      // Update currentSymbol when prop changes
      if (val) {
        this.currentSymbol = val
      }
    },
    currentSymbol (val) {
      // Reload price and position when symbol changes
      if (val) {
        this.loadPrice()
        if (this.selectedCredentialId) {
          this.loadPosition()
        }
        // Emit symbol change to parent
        this.$emit('update:symbol', val)
      }
    },
    selectedCredentialId (val) {
      // Reload position when credential changes
      if (val && this.currentSymbol) {
        this.loadPosition()
      }
    },
    presetSide (val) {
      if (val) this.side = val
    },
    presetPrice (val) {
      if (val > 0) {
        this.currentPrice = val
        this.limitPrice = val
      }
    },
    leverage () {
      this.$nextTick(() => {
        if (this.selectedCredentialId) {
          this.loadBalance()
          this.loadPosition()
        }
      })
    },
    tradeMode (val) {
      if (val === 'spot' && this.side === 'sell') {
        this.side = 'buy'
      }
      this.$nextTick(() => {
        if (this.selectedCredentialId) {
          this.loadBalance()
          this.loadPosition()
        }
      })
    }
  },
  mounted () {
    if (this.embedded) {
      if (this.visible) this.init()
    } else if (this.visible) {
      this.init()
    }
  },
  methods: {
    formatCredentialOptionLabel (cred) {
      return formatExchangeCredentialLabel(cred, {
        unnamed: this.$t('brokerAccounts.cryptoSection.unnamed')
      })
    },
    qtSelectPopupContainer (triggerNode) {
      if (typeof this.overlayGetContainer === 'function') {
        return this.overlayGetContainer(triggerNode)
      }
      const fs = document.fullscreenElement || document.webkitFullscreenElement
      const el = this.$el
      if (el && fs && typeof fs.contains === 'function' && fs.contains(el)) return fs
      return document.body
    },
    qtOverlayMount () {
      if (typeof this.overlayGetContainer === 'function') {
        const n = this.overlayGetContainer()
        return n || document.body
      }
      const fs = document.fullscreenElement || document.webkitFullscreenElement
      const el = this.$el
      if (el && fs && typeof fs.contains === 'function' && fs.contains(el)) return fs
      return document.body
    },
    setTradeSide (s) {
      if (s === 'sell' && !this.isSwapMode) {
        this.$message.warning(this.$t('quickTrade.shortDisabledSpot'))
        return
      }
      this.side = s
    },
    async init () {
      // Initialize current symbol from prop
      this.currentSymbol = this.symbol || ''
      if (this.presetSide) this.side = this.presetSide
      if (this.marketType === 'spot') {
        this.tradeMode = 'spot'
      }
      if (this.presetPrice > 0) {
        this.currentPrice = this.presetPrice
        this.limitPrice = this.presetPrice
      }
      await this.loadCredentials()
      // Load user info to get userId
      await this.loadUserInfo()
      // Load watchlist crypto symbols for initial suggestions
      await this.loadWatchlistSymbols()
      // Load price for current symbol
      if (this.currentSymbol) {
        await this.loadPrice()
      }
      // Load position if credential and symbol are already available
      if (this.selectedCredentialId && this.currentSymbol) {
        await this.loadPosition()
      }
      this.loadHistory()
      this.startPolling()
    },
    async loadUserInfo () {
      try {
        // Try to get user info from store first
        const store = this.$store
        const storeUserInfo = store?.getters?.userInfo || {}
        if (storeUserInfo && storeUserInfo.id) {
          this.userId = storeUserInfo.id
          return
        }
        // If not in store, fetch from API
        const res = await getUserInfo()
        if (res && res.code === 1 && res.data) {
          this.userId = res.data.id
          // Update store
          if (store) {
            store.commit('SET_INFO', res.data)
          }
        }
      } catch (e) {
        console.warn('loadUserInfo error:', e)
      }
    },
    async loadWatchlistSymbols () {
      if (!this.userId) {
        // If no userId, try to load it first
        await this.loadUserInfo()
        if (!this.userId) {
          console.warn('Cannot load watchlist: userId not available')
          return
        }
      }
      try {
        // Load watchlist and filter crypto symbols
        const res = await getWatchlist({ userid: this.userId })
        if (res && res.code === 1 && res.data) {
          // Filter only Crypto market symbols
          const cryptoSymbols = (res.data || []).filter(item =>
            (item.market || '').toLowerCase() === 'crypto'
          ).map(item => ({
            value: item.symbol || '',
            symbol: item.symbol || '',
            name: item.name || ''
          })).filter(item => item.value)

          this.symbolSuggestions = cryptoSymbols
        }
      } catch (e) {
        console.warn('loadWatchlistSymbols error:', e)
      }
    },
    handleSymbolSearch (value) {
      // Clear previous timer
      if (this.symbolSearchTimer) {
        clearTimeout(this.symbolSearchTimer)
      }

      if (!value || value.trim() === '') {
        // If empty, load watchlist symbols
        this.loadWatchlistSymbols()
        return
      }

      // Debounce search
      this.symbolSearchTimer = setTimeout(async () => {
        this.symbolSearching = true
        try {
          const res = await searchSymbols({ market: 'Crypto', keyword: value.trim(), limit: 20 })
          if (res && res.code === 1 && res.data) {
            this.symbolSuggestions = (res.data.items || res.data || []).map(item => ({
              value: item.symbol || '',
              symbol: item.symbol || '',
              name: item.name || ''
            })).filter(item => item.value)
          } else {
            this.symbolSuggestions = []
          }
        } catch (e) {
          console.warn('handleSymbolSearch error:', e)
          this.symbolSuggestions = []
        } finally {
          this.symbolSearching = false
        }
      }, 300)
    },
    handleSymbolChange (value) {
      if (value && value !== this.currentSymbol) {
        this.currentSymbol = value
        // Load price for new symbol
        this.loadPrice()
        // Reload position for new symbol
        if (this.selectedCredentialId) {
          this.loadPosition()
        }
        // Emit to parent
        this.$emit('update:symbol', value)
      }
    },
    async loadPrice () {
      if (!this.currentSymbol) {
        this.currentPrice = 0
        return
      }
      try {
        // Use market API to get current price
        const res = await request({
          url: '/api/market/price',
          method: 'get',
          params: {
            market: 'Crypto',
            symbol: this.currentSymbol
          }
        })
        if (res && res.code === 1 && res.data) {
          const price = parseFloat(res.data.price || 0)
          if (price > 0) {
            this.currentPrice = price
            // Update limit price if it's 0 or same as old price
            if (this.limitPrice === 0 || this.limitPrice === this.presetPrice) {
              this.limitPrice = price
            }
          }
        }
      } catch (e) {
        console.warn('loadPrice error:', e)
        // Don't reset price on error, keep current value
      }
    },
    handleSymbolFocus () {
      // Load watchlist symbols when focusing if no suggestions
      if (this.symbolSuggestions.length === 0) {
        this.loadWatchlistSymbols()
      }
    },
    async loadCredentials () {
      this.credLoading = true
      try {
        const res = await listExchangeCredentials()
        if (res.code === 1 && res.data) {
          const all = res.data.items || res.data || []
          // Quick Trade only supports crypto exchanges — filter out IBKR, MT5, etc.
          const NON_CRYPTO = ['ibkr', 'mt5']
          this.credentials = all.filter(c => {
            const eid = (c.exchange_id || c.name || '').toLowerCase()
            return !NON_CRYPTO.includes(eid)
          })
          // Auto-select first if none selected
          if (!this.selectedCredentialId && this.credentials.length > 0) {
            this.selectedCredentialId = this.credentials[0].id
            this.onCredentialChange(this.selectedCredentialId)
          }
        }
      } catch (e) {
        console.error('loadCredentials error:', e)
      } finally {
        this.credLoading = false
      }
    },
    async onExchangeAccountSaved (data) {
      const prevId = this.selectedCredentialId
      await this.loadCredentials()
      const newId = data && (data.id || data.credential_id)
      if (newId) {
        this.selectedCredentialId = newId
        await this.onCredentialChange(newId)
      } else if (!prevId && this.credentials.length === 1) {
        this.selectedCredentialId = this.credentials[0].id
        await this.onCredentialChange(this.selectedCredentialId)
      }
    },
    async onCredentialChange (credId) {
      this.selectedCredentialId = credId
      await this.loadBalance()
      await this.loadPosition()
    },
    async loadBalance () {
      if (!this.selectedCredentialId) return
      this.balanceLoading = true
      try {
        const res = await getQuickTradeBalance({
          credential_id: this.selectedCredentialId,
          market_type: this.effectiveMarketType
        })
        if (res.code === 1 && res.data) {
          const d = res.data || {}
          const swap = d.swap && typeof d.swap === 'object' ? d.swap : {}
          const spot = d.spot && typeof d.spot === 'object' ? d.spot : {}
          const activeAvail = this.isSwapMode
            ? (parseFloat(swap.available) || parseFloat(d.available) || 0)
            : (parseFloat(spot.available) || parseFloat(d.available) || 0)
          this.balance = {
            available: activeAvail,
            total: parseFloat(d.total) || 0,
            currency: d.currency || 'USDT',
            swap: {
              available: parseFloat(swap.available) || 0,
              total: parseFloat(swap.total) || 0
            },
            spot: {
              available: parseFloat(spot.available) || 0,
              total: parseFloat(spot.total) || 0
            },
            error: d.error || swap.error || spot.error || '',
            error_hint_key: d.error_hint_key || '',
            request_ip: d.request_ip || ''
          }
          if (d.error && this.$message) {
            this.$message.warning(this.balanceErrorMessage || d.error, 6)
          }
        } else {
          this.balance = {
            available: 0,
            total: 0,
            swap: { available: 0, total: 0 },
            spot: { available: 0, total: 0 }
          }
        }
      } catch (e) {
        console.warn('loadBalance error:', e)
        this.balance = {
          available: 0,
          total: 0,
          swap: { available: 0, total: 0 },
          spot: { available: 0, total: 0 },
          error: String(e.message || e)
        }
      } finally {
        this.balanceLoading = false
      }
    },
    async loadPosition () {
      if (!this.selectedCredentialId || !this.currentSymbol) {
        console.log('loadPosition skipped:', { credentialId: this.selectedCredentialId, symbol: this.currentSymbol })
        return
      }
      try {
        console.log('Loading position:', { credential_id: this.selectedCredentialId, symbol: this.currentSymbol, market_type: this.effectiveMarketType })
        const res = await getQuickTradePosition({
          credential_id: this.selectedCredentialId,
          symbol: this.currentSymbol,
          market_type: this.effectiveMarketType
        })
        console.log('Position response:', res)
        if (res.code === 1 && res.data && res.data.positions && res.data.positions.length > 0) {
          this.currentPositions = res.data.positions
          console.log('Positions loaded:', this.currentPositions.length)
          return true
        } else {
          this.currentPositions = []
          console.log('No position found')
          return false
        }
      } catch (e) {
        console.error('loadPosition error:', e)
        this.currentPositions = []
        return false
      }
    },
    async loadPositionWithRetry (maxRetries = 3, delayMs = 2000) {
      // Try to load position immediately
      let found = await this.loadPosition()
      if (found) return

      // If not found, retry with delay (exchange may need time to update)
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
        found = await this.loadPosition()
        if (found) {
          console.log(`Position found after ${i + 1} retry(ies)`)
          return
        }
      }
      console.log('Position not found after all retries')
    },
    async loadHistory () {
      try {
        const res = await getQuickTradeHistory({ limit: 5 })
        if (res.code === 1 && res.data) {
          this.recentTrades = res.data.trades || []
        }
      } catch (e) {
        console.warn('loadHistory error:', e)
      }
    },
    setAmountByPercent (pct) {
      const avail = this.activeBalanceAvailable
      if (avail > 0) {
        this.amount = Math.floor(avail * pct / 100 * 100) / 100
      }
    },
    async handleSubmit () {
      if (!this.canSubmit) return
      this.submitting = true
      try {
        const payload = {
          credential_id: this.selectedCredentialId,
          symbol: this.currentSymbol,
          side: this.side,
          order_type: this.orderType,
          amount: this.amount,
          price: this.orderType === 'limit' ? this.limitPrice : 0,
          leverage: this.isSwapMode ? this.leverage : 1,
          market_type: this.effectiveMarketType,
          margin_mode: this.isSwapMode ? this.marginMode : undefined,
          tp_price: this.tpPrice || 0,
          sl_price: this.slPrice || 0,
          source: this.source
        }
        const res = await placeQuickOrder(payload)
        if (res.code === 1) {
          // Emit event for parent component (parent will show success message)
          this.$emit('order-success', res.data)

          // Reload all data after successful order
          await this.loadBalance()
          await this.loadHistory()

          // Load position with retry mechanism (exchange may need time to update)
          await this.loadPositionWithRetry()
        } else {
          const hint = res.error_hint ? this.$t(res.error_hint) : ''
          this.$notification.error({
            message: this.$t('quickTrade.orderFailed'),
            description: hint || res.msg || ''
          })
        }
      } catch (e) {
        const rd = (e && e.response && e.response.data) || {}
        const hint = rd.error_hint ? this.$t(rd.error_hint) : ''
        this.$notification.error({
          message: this.$t('quickTrade.orderFailed'),
          description: hint || rd.msg || e.message || ''
        })
      } finally {
        this.submitting = false
      }
    },
    async handleClosePosition (pos) {
      if (!pos || !this.selectedCredentialId || !this.currentSymbol) return
      const leg = (pos.side || '').toLowerCase()
      this.closingPositionSide = leg || null
      try {
        const payload = {
          credential_id: this.selectedCredentialId,
          symbol: this.currentSymbol,
          market_type: this.effectiveMarketType,
          size: 0,
          close_scope: this.isSwapMode ? this.closeScope : 'full',
          position_side: leg,
          source: 'manual'
        }
        const res = await closeQuickTradePosition(payload)
        if (res.code === 1) {
          this.$message.success(this.$t('quickTrade.positionClosed'))
          await this.loadBalance()
          await this.loadHistory()
          this.currentPositions = this.currentPositions.filter(p => (p.side || '').toLowerCase() !== leg)
          setTimeout(async () => {
            await this.loadPosition()
          }, 2000)
        } else {
          const hint = res.error_hint ? this.$t(res.error_hint) : ''
          this.$notification.error({
            message: this.$t('quickTrade.orderFailed'),
            description: hint || res.msg || ''
          })
        }
      } catch (e) {
        const rd = (e && e.response && e.response.data) || {}
        const hint = rd.error_hint ? this.$t(rd.error_hint) : ''
        this.$notification.error({
          message: this.$t('quickTrade.orderFailed'),
          description: hint || rd.msg || e.message || ''
        })
      } finally {
        this.closingPositionSide = null
      }
    },
    startPolling () {
      this.stopPolling()
      this.pollTimer = setInterval(() => {
        if (this.currentSymbol) {
          // Always update price
          this.loadPrice()
        }
        if (this.selectedCredentialId && this.currentSymbol) {
          this.loadBalance()
          this.loadPosition()
        }
      }, 10000)
    },
    stopPolling () {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    handleClose () {
      this.$emit('close')
      this.$emit('update:visible', false)
    },
    handleHistoryCollapse (activeKeys) {
      this.historyCollapsed = !activeKeys.includes('history')
    },
    formatPrice (val) {
      const v = parseFloat(val || 0)
      if (Math.abs(v) >= 10000) return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      if (Math.abs(v) >= 100) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      if (Math.abs(v) >= 1) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
      return v.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
    },
    formatTime (ts) {
      if (!ts) return ''
      const d = new Date(ts)
      const pad = n => String(n).padStart(2, '0')
      return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  },
  beforeDestroy () {
    this.stopPolling()
  }
}
</script>

<style lang="less" scoped>
.quick-trade-drawer {
  ::v-deep .ant-drawer-body {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
  }
}

/* Drawer / default: wrapper is transparent; columns flatten into normal flow */
.qt-embedded-split:not(.qt-embedded-split--cols) {
  display: contents;
}
.qt-embedded-split:not(.qt-embedded-split--cols) .qt-embedded-col-left,
.qt-embedded-split:not(.qt-embedded-split--cols) .qt-embedded-col-right {
  display: contents;
}
/* IDE tab: left / right columns */
.qt-embedded-split--cols {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  padding: 2px 0 6px;
}
.qt-embedded-split--cols .qt-embedded-col-left,
.qt-embedded-split--cols .qt-embedded-col-right {
  flex: 1;
  min-width: 0;
}
.qt-embedded-split--cols .qt-embedded-col-right {
  border-left: 1px solid #f0f0f0;
  padding-left: 14px;
  padding-right: 4px;
  margin-left: 2px;
}
.qt-embedded-split--cols .qt-section {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.quick-trade-embedded {
  display: flex;
  flex-direction: column;
  border: none;
  border-radius: 0;
  overflow: visible;
  background: transparent;
  .qt-embedded-split--cols {
    padding: 8px 18px 12px;
  }
  .qt-symbol-bar {
    padding: 8px 18px;
    background: transparent;
    flex-direction: row;
    align-items: center;
    .qt-symbol-selector { flex: 1; }
    .qt-price-display { margin-left: 12px; }
  }
  .qt-section { padding: 6px 0; }
  .qt-card { margin-left: 0; margin-right: 0; padding: 10px 12px; border-radius: 8px; }
  .qt-mode-card,
  .qt-tpsl-card {
    margin-left: 0;
    margin-right: 0;
  }
  .qt-mode-card { margin-top: 8px; }
  .qt-tpsl-card { margin-top: 8px; }

  .qt-mode-card .qt-section-title-row {
    margin-bottom: 14px;
  }
  .qt-mode-card .qt-leverage-row {
    margin-top: 8px;
    margin-bottom: 8px;
  }
  .qt-mode-card .qt-label-spaced {
    margin-top: 18px;
    margin-bottom: 10px;
  }
  .qt-mode-card .qt-margin-radio {
    margin-top: 6px;
  }
  .qt-mode-card .qt-hint-text {
    margin-top: 14px;
  }

  .qt-tpsl-card .qt-section-title-row {
    margin-bottom: 14px;
  }
  .qt-tpsl-card .qt-tpsl-row {
    gap: 16px;
  }
  .qt-tpsl-card .qt-tpsl-item .qt-label {
    display: block;
    margin-bottom: 10px;
  }
  .qt-tpsl-card .qt-tpsl-record-hint {
    margin-top: 16px;
  }

  .qt-submit-section--embedded-left {
    padding: 12px 0 4px;
    .qt-submit-btn { height: 40px; font-size: 14px; border-radius: 8px; }
  }

  .qt-position-section { padding: 0 0 10px; }
  .qt-history-section { padding: 0 0 10px; }

  .qt-direction-toggle .qt-dir-btn { padding: 8px; font-size: 13px; border-radius: 6px; }
  .qt-quick-amounts { margin-top: 6px; margin-bottom: 2px; }
  .qt-amount-block { padding-bottom: 6px; }
  .qt-account-actions .qt-add-account-btn { height: 30px; }
}

.quick-trade-embedded.qt-embedded-ide {
  .qt-embedded-split--cols {
    padding: 0 12px 12px;
    gap: 14px;
  }
  .qt-embedded-split--cols .qt-embedded-col-left,
  .qt-embedded-split--cols .qt-embedded-col-right {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    padding-left: 0 !important;
    padding-right: 0 !important;
    margin-left: 0 !important;
  }
  .qt-embedded-split--cols .qt-section {
    padding-left: 14px !important;
    padding-right: 14px !important;
  }
  .qt-symbol-bar {
    margin: 0 14px 12px;
    padding: 12px 14px;
    border-radius: 12px;
    background: linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%);
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    ::v-deep .ant-select-selection {
      border-radius: 8px;
      border-color: #e2e8f0;
    }
    .qt-current-price {
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
  }
  .qt-section:not(.qt-card) {
    padding: 10px 14px;
    margin: 0 14px 8px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  }
  .qt-card {
    margin-left: 14px;
    margin-right: 14px;
    margin-bottom: 8px;
    padding: 12px 14px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }
  .qt-mode-card,
  .qt-tpsl-card {
    margin-left: 14px;
    margin-right: 14px;
  }
  .qt-submit-section--embedded-left {
    padding: 8px 14px 4px;
    margin: 0 14px;
  }
  .qt-position-section {
    margin: 0 14px;
    padding: 12px 14px 10px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-sizing: border-box;
  }
  .qt-history-section {
    margin: 0 14px 8px;
    padding: 8px 14px 12px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-sizing: border-box;
  }
  .qt-position-empty {
    border-radius: 10px;
  }
  .qt-position-card {
    border-radius: 10px;
  }
}

.qt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
  .qt-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    .qt-icon {
      font-size: 20px;
      color: #595959;
    }
    .qt-header-title {
      font-size: 16px;
      font-weight: 600;
    }
  }
  .qt-close {
    font-size: 16px;
    cursor: pointer;
    color: #999;
    &:hover { color: #333; }
  }
}

.qt-symbol-bar {
  padding: 12px 20px;
  background: linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  .qt-symbol-selector {
    width: 100%;
    ::v-deep .ant-select {
      width: 100%;
    }
    ::v-deep .ant-select-selection {
      border-radius: 6px;
      border: 1px solid #d9d9d9;
    }
  }
  .qt-price-display {
    display: flex;
    justify-content: flex-end;
    .qt-current-price {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
  }
}

.qt-symbol-option {
  display: flex;
  align-items: center;
  gap: 8px;
  .qt-symbol-option-name {
    font-weight: 600;
    font-size: 14px;
  }
  .qt-symbol-option-desc {
    color: #999;
    font-size: 12px;
  }
}

.qt-section {
  padding: 8px 20px;
  .qt-label {
    font-size: 12px;
    color: #999;
    margin-bottom: 4px;
    font-weight: 500;
  }
  .qt-crypto-hint {
    font-size: 10px;
    color: #faad14;
    background: rgba(250, 173, 20, 0.1);
    padding: 1px 6px;
    border-radius: 4px;
    margin-left: 4px;
  }
}

.qt-balance {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  font-size: 12px;

  .qt-balance-label {
    color: #8c8c8c;
    flex-shrink: 0;
  }
  .qt-balance-loading-text { margin-left: 4px; }
  .qt-balance-value {
    color: #52c41a;
    font-weight: 600;
    margin-left: auto;
  }
  .qt-balance-error { color: #faad14; cursor: help; }
}

.qt-balance-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 0;
  opacity: 0.72;

  &--active {
    opacity: 1;
    .qt-balance-label {
      color: #595959;
      font-weight: 600;
    }
    .qt-balance-value {
      color: #389e0d;
    }
  }
}

.qt-balance-error-hint {
  font-size: 11px;
  line-height: 1.45;
  color: #cf1322;
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(255, 77, 79, 0.08);
  border: 1px solid rgba(255, 77, 79, 0.25);
}

.qt-account-actions {
  margin-top: 8px;
}

.qt-add-account-btn {
  height: 32px;
  border-radius: 6px;
  font-weight: 600;
}

.qt-direction-toggle {
  display: flex;
  gap: 8px;
  .qt-dir-btn {
    flex: 1;
    padding: 10px;
    text-align: center;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    user-select: none;
  }
  .qt-dir-long {
    color: #52c41a;
    background: rgba(82, 196, 26, 0.06);
    border-color: rgba(82, 196, 26, 0.2);
    &.active {
      background: #52c41a;
      color: #fff;
      border-color: #52c41a;
      box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
    }
    &:hover:not(.active) {
      border-color: #52c41a;
    }
  }
  .qt-dir-short {
    color: #f5222d;
    background: rgba(245, 34, 45, 0.06);
    border-color: rgba(245, 34, 45, 0.2);
    &.active {
      background: #f5222d;
      color: #fff;
      border-color: #f5222d;
      box-shadow: 0 4px 12px rgba(245, 34, 45, 0.3);
    }
    &:hover:not(.active) {
      border-color: #f5222d;
    }
  }
}

.qt-amount-block {
  padding-bottom: 14px;
}

.qt-quick-amounts {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  margin-bottom: 4px;
  button { flex: 1; font-size: 12px; }
}

.qt-leverage-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.qt-leverage-slider-wrap {
  flex: 1;
  min-width: 0;
  padding: 4px 6px 26px;

  ::v-deep .ant-slider {
    margin: 8px 6px 0;
  }

  ::v-deep .ant-slider-rail,
  ::v-deep .ant-slider-track,
  ::v-deep .ant-slider-step {
    height: 4px;
  }

  ::v-deep .ant-slider-handle {
    width: 14px;
    height: 14px;
    margin-top: -5px;
  }

  ::v-deep .ant-slider-mark {
    top: 14px;
  }

  ::v-deep .ant-slider-mark-text {
    font-size: 11px;
    color: #8c8c8c;
    white-space: nowrap;
    transform: translateX(-50%);
  }

  ::v-deep .ant-slider-mark-text-active {
    color: #1890ff;
    font-weight: 600;
  }

  ::v-deep .ant-slider-mark:first-child .ant-slider-mark-text {
    transform: translateX(0);
  }

  ::v-deep .ant-slider-mark:last-child .ant-slider-mark-text {
    transform: translateX(-100%);
  }
}

.qt-leverage-input {
  width: 72px;
  flex-shrink: 0;
  margin-top: 2px;
}

.qt-card {
  margin-left: 16px;
  margin-right: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
}

.qt-mode-card {
  margin-top: 16px;
}

.qt-tpsl-card {
  margin-top: 16px;
}

.qt-section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.qt-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.qt-badge-contract {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #ebebeb;
  color: #595959;
  border: 1px solid #d9d9d9;
}

.qt-optional-tag {
  font-size: 10px;
  color: #8c8c8c;
  background: #f0f0f0;
  padding: 1px 8px;
  border-radius: 4px;
}

.qt-label-spaced {
  margin-top: 10px;
}

.qt-margin-radio {
  width: 100%;
  display: flex;
  ::v-deep .ant-radio-button-wrapper {
    flex: 1;
    text-align: center;
    padding: 0 4px;
  }
}

.qt-hint-text {
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.45;
  margin-top: 8px;
}

.qt-hint-inline {
  margin-top: 6px;
}

.qt-mode-toggle {
  display: flex;
  background: #f0f0f0;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}
.qt-mode-toggle-item {
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 500;
  color: #8c8c8c;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;
  &:hover { color: #595959; }
  &.active {
    background: #fff;
    color: #1890ff;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
}
.qt-spot-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0 2px;
}
.qt-spot-info-icon {
  font-size: 18px;
  color: #52c41a;
  flex-shrink: 0;
}
.qt-spot-info .qt-hint-text {
  margin-top: 0;
}

.qt-tpsl-row {
  display: flex;
  gap: 12px;
  .qt-tpsl-item { flex: 1; }
}

.qt-tpsl-record-hint {
  margin-top: 10px;
  margin-bottom: 0;
}

.qt-close-scope {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #e8e8e8;
}

.qt-label-close-scope {
  margin-bottom: 6px;
}

.qt-close-scope-radio {
  width: 100%;
  display: flex;
  ::v-deep .ant-radio-button-wrapper {
    flex: 1;
    text-align: center;
    padding: 0 4px;
    font-size: 12px;
  }
}

.qt-tp-label {
  color: #389e0d !important;
}

.qt-sl-label {
  color: #cf1322 !important;
}

.qt-input-full {
  width: 100%;
}

.qt-dir-btn.qt-dir-disabled {
  opacity: 0.42;
  cursor: not-allowed;
  pointer-events: none;
}

.qt-direction-toggle--spot .qt-dir-btn--solo {
  flex: 1 1 100%;
  max-width: 100%;
}

.qt-empty-icon {
  font-size: 28px;
  color: #d9d9d9;
  margin-bottom: 8px;
}

.qt-empty-desc {
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.5;
}

.qt-submit-section {
  padding: 12px 20px;
  .qt-submit-btn {
    height: 48px;
    font-size: 16px;
    font-weight: 700;
    border-radius: 8px;
    letter-spacing: 0.5px;
  }
  .qt-btn-long {
    background: #52c41a !important;
    border-color: #52c41a !important;
    &:hover { background: #73d13d !important; }
    &:active { background: #389e0d !important; }
  }
  .qt-btn-short {
    background: #f5222d !important;
    border-color: #f5222d !important;
    &:hover { background: #ff4d4f !important; }
    &:active { background: #cf1322 !important; }
  }
}

.qt-position-section {
  padding: 8px 20px 12px;
  .qt-section-header {
    font-size: 13px;
    font-weight: 600;
    color: #666;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .qt-position-count {
    font-size: 12px;
    color: #999;
    font-weight: 400;
  }
  .qt-close-scope-global {
    margin-bottom: 10px;
  }
}

.qt-history-section {
  padding: 8px 20px 12px;
  ::v-deep .ant-collapse {
    background: transparent;
    border: none;
  }
  ::v-deep .ant-collapse-item {
    border: none;
  }
  ::v-deep .ant-collapse-header {
    padding: 0 !important;
    cursor: pointer;
    &:hover {
      opacity: 0.8;
    }
  }
  ::v-deep .ant-collapse-content {
    border: none;
    background: transparent;
  }
  ::v-deep .ant-collapse-content-box {
    padding: 8px 0 0 0 !important;
  }
  .qt-section-header {
    font-size: 13px;
    font-weight: 600;
    color: #666;
    display: flex;
    align-items: center;
    gap: 6px;
    user-select: none;
  }
  .qt-history-count {
    font-size: 12px;
    color: #999;
    font-weight: 400;
  }
}

.qt-position-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 10px 12px;
  border-left: 3px solid #d9d9d9;
  & + .qt-position-card {
    margin-top: 10px;
  }
  &.long { border-left-color: #52c41a; }
  &.short { border-left-color: #f5222d; }
  .qt-pos-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 2px 0;
    span:first-child { color: #999; }
  }
}

.qt-position-empty {
  background: #fafafa;
  border-radius: 8px;
  padding: 20px 12px;
  text-align: center;
  border: 1px dashed #d9d9d9;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qt-green { color: #52c41a !important; }
.qt-red   { color: #f5222d !important; }

.qt-trade-list {
  .qt-trade-item {
    padding: 6px 0;
    border-bottom: 1px solid #f5f5f5;
    &:last-child { border-bottom: none; }
    .qt-trade-main {
      display: flex;
      align-items: center;
      gap: 6px;
      .qt-trade-symbol { font-weight: 600; font-size: 13px; }
      .qt-trade-amount { margin-left: auto; font-size: 13px; }
    }
    .qt-trade-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2px;
      .qt-trade-time { font-size: 11px; color: #bbb; }
    }
  }
}

/* ======== Dark Theme ======== */
  .theme-dark {
  .qt-embedded-split--cols .qt-embedded-col-right {
    border-left-color: #303030;
  }
  &.quick-trade-embedded {
    background: transparent;
    border-color: transparent;
    .qt-symbol-bar {
      background: transparent;
    }
  }
  &.quick-trade-embedded.qt-embedded-ide {
    .qt-symbol-bar {
      background: linear-gradient(135deg, #262626 0%, #1c1c1c 100%);
      border-color: #363636;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      ::v-deep .ant-select-selection {
        border-color: #434343;
      }
    }
    .qt-section:not(.qt-card) {
      background: #1f1f1f;
      border-color: #363636;
      box-shadow: none;
    }
    .qt-card {
      background: #1f1f1f;
      border-color: #404040;
      box-shadow: none;
    }
    .qt-position-section,
    .qt-history-section {
      background: #1f1f1f;
      border-color: #363636;
    }
  }
  .qt-header {
    border-bottom-color: #303030;
    .qt-icon { color: #a3a3a3; }
    .qt-header-title { color: #e0e0e0; }
    .qt-close { color: #666; &:hover { color: #bbb; } }
  }
  .qt-symbol-bar {
    background: linear-gradient(180deg, #262626 0%, #1f1f1f 100%);
    .qt-current-price { color: #e0e0e0; }
    ::v-deep .ant-select-selection {
      background: #262626;
      border-color: #303030;
      color: #e0e0e0;
    }
    ::v-deep .ant-select-selection__placeholder {
      color: #666;
    }
  }
  .qt-symbol-option {
    .qt-symbol-option-name { color: #e0e0e0; }
    .qt-symbol-option-desc { color: #999; }
  }
  .qt-section {
    .qt-label { color: #777; }
  }
  .qt-position-section {
    .qt-section-header { color: #ccc; }
    .qt-position-count { color: #888; }
  }
  .qt-position-card {
    background: #262626;
    .qt-pos-row span:first-child { color: #777; }
    .qt-pos-row span:last-child { color: #ccc; }
  }
  .qt-history-section {
    .qt-section-header {
      color: #ccc;
    }
    .qt-history-count {
      color: #888;
    }
    ::v-deep .ant-collapse {
      background: transparent !important;
      color: #ccc;
      .ant-collapse-header {
        color: #ccc !important;
        &:hover {
          opacity: 0.8;
        }
      }
      .ant-collapse-content {
        background: transparent;
        color: #ccc;
      }
    }
  }
  .qt-trade-item {
    border-bottom-color: #2a2a2a !important;
    .qt-trade-symbol { color: #e0e0e0; }
    .qt-trade-amount { color: #ccc; }
  }
  ::v-deep .ant-collapse {
    background: transparent !important;
    color: #ccc;
    .ant-collapse-header { color: #ccc !important; }
    .ant-collapse-content { background: transparent; color: #ccc; }
  }
  ::v-deep .ant-drawer-content {
    background: #141414;
  }
  ::v-deep .ant-select-selection,
  ::v-deep .ant-input-number {
    background: #262626;
    border-color: #303030;
    color: #e0e0e0;
  }
  ::v-deep .ant-radio-group .ant-radio-button-wrapper {
    background: #262626;
    border-color: #303030;
    color: #ccc;
    &.ant-radio-button-wrapper-checked {
      background: #434343;
      border-color: #595959;
      color: #fff;
    }
  }
  ::v-deep .ant-slider-rail { background: #303030; }
  ::v-deep .ant-slider-track { background: #737373; }
  .qt-leverage-slider-wrap ::v-deep .ant-slider-mark-text {
    color: #8c8c8c;
  }
  .qt-leverage-slider-wrap ::v-deep .ant-slider-mark-text-active {
    color: #58a6ff;
  }
  .qt-balance {
    background: #262626;
    border-color: #363636;
    .qt-balance-label { color: #8c8c8c; }
    .qt-balance-line--active .qt-balance-label { color: #d9d9d9; }
    .qt-balance-value { color: #73d13d; }
    .qt-balance-line--active .qt-balance-value { color: #95de64; }
  }
  .qt-add-account-btn {
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.22);
  }
  .qt-card {
    background: #262626;
    border-color: #3a3a3a;
  }
  .qt-section-title {
    color: #e8e8e8;
  }
  .qt-badge-contract {
    background: #333;
    color: #bfbfbf;
    border-color: #434343;
  }
  .qt-optional-tag {
    background: #2a2a2a;
    color: #888;
  }
  .qt-hint-text {
    color: #777;
  }
  .qt-mode-toggle {
    background: #2a2a2a;
  }
  .qt-mode-toggle-item {
    color: #777;
    &:hover { color: #bbb; }
    &.active {
      background: #3a3a3a;
      color: #58a6ff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }
  }
  .qt-spot-info-icon {
    color: #73d13d;
  }
  .qt-tp-label {
    color: #95de64 !important;
  }
  .qt-sl-label {
    color: #ff7875 !important;
  }
  .qt-close-scope {
    border-top-color: #3a3a3a;
  }

  .qt-position-empty {
    background: #262626;
    border-color: #303030;
  }
  .qt-empty-icon {
    color: #434343;
  }
  .qt-empty-desc {
    color: #888;
  }
}
</style>
