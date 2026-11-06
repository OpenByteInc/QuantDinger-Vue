<template>
  <div class="billing-page qd-workspace-page qd-page-frame" :class="{ 'theme-dark': isDarkTheme }">
    <section class="billing-hero">
      <div class="hero-copy">
        <h2 class="page-title">{{ $t('billing.title') }}</h2>
        <p class="page-desc">{{ $t('billing.valueDesc') }}</p>
        <div class="hero-rule">
          <span class="rule-label">{{ $t('billing.vipRule.title') }}</span>
          <span>{{ $t('billing.vipRule.desc') }}</span>
        </div>
      </div>

      <div class="account-snapshot">
        <div class="snapshot-block credits-snapshot">
          <div class="snap-label">{{ $t('billing.snapshot.credits') }}</div>
          <div class="snap-value">{{ formatCredits(billing.credits) }}</div>
        </div>
        <div class="snapshot-divider" />
        <div class="snapshot-block vip-snapshot">
          <div class="snap-label">{{ $t('billing.snapshot.vip') }}</div>
          <div class="snap-value vip-value">
            <span v-if="billing.is_lifetime" class="vip-state is-lifetime">
              {{ $t('billing.snapshot.lifetime') }}
            </span>
            <span v-else-if="billing.is_vip" class="vip-state is-active">VIP</span>
            <span v-else class="vip-state is-inactive">{{ $t('billing.snapshot.notVip') }}</span>
          </div>
          <div v-if="billing.vip_expires_at && !billing.is_lifetime" class="vip-exp">
            {{ $t('billing.snapshot.expires') }}: {{ formatDate(billing.vip_expires_at) }}
          </div>
        </div>
      </div>
    </section>

    <a-alert
      v-if="billing.is_lifetime"
      style="margin-top: 16px;"
      type="success"
      show-icon
      :message="$t('billing.lifetimeTopupHint')"
    />

    <section class="plans-section">
      <div class="plans-heading">
        <div>
          <h3>{{ $t('billing.choosePlan') }}</h3>
          <p>{{ $t('billing.choosePlanHint') }}</p>
        </div>
      </div>

      <div class="library-entitlement" :class="{ 'is-loading': freeAssetCountsLoading }">
        <div class="library-entitlement-copy">
          <span class="library-entitlement-label">{{ $t('billing.libraryEntitlement.label') }}</span>
          <strong>{{ $t('billing.libraryEntitlement.title') }}</strong>
        </div>
        <div class="library-entitlement-counts">
          <span>
            <b>{{ freeAssetCountsLoading ? '—' : formatCredits(freeAssetCounts.strategy_count) }}</b>
            {{ $t('billing.libraryEntitlement.strategies') }}
          </span>
          <i />
          <span>
            <b>{{ freeAssetCountsLoading ? '—' : formatCredits(freeAssetCounts.indicator_count) }}</b>
            {{ $t('billing.libraryEntitlement.indicators') }}
          </span>
        </div>
        <span class="library-entitlement-note">{{ $t('billing.libraryEntitlement.note') }}</span>
      </div>

      <div class="plans-grid">
        <article
          v-for="plan in planItems"
          :key="plan.code"
          class="plan-card"
          :class="{ highlight: isRecommendedPlan(plan), lifetime: plan.is_lifetime }"
        >
          <div v-if="isRecommendedPlan(plan)" class="popular-badge">
            <span>{{ $t('billing.recommended') }}</span>
          </div>

          <div class="plan-heading">
            <div>
              <div class="plan-title">{{ planDisplayName(plan) }}</div>
              <div class="plan-duration">
                {{ plan.is_lifetime ? $t('billing.once') : `${plan.duration_days} ${$t('billing.days')}` }}
              </div>
            </div>
          </div>

          <div class="plan-price-row">
            <span class="plan-currency">$</span>
            <span class="plan-price">{{ plan.price_usd }}</span>
            <span class="plan-unit">{{ plan.is_lifetime ? $t('billing.once') : `/ ${plan.duration_days} ${$t('billing.days')}` }}</span>
          </div>

          <div class="plan-value-row">
            <span>{{ planValueText(plan) }}</span>
            <span v-if="planSavingsPercent(plan)" class="savings-label">
              {{ $t('billing.saveComparedMonthly', { percent: planSavingsPercent(plan) }) }}
            </span>
          </div>

          <div class="plan-divider" />

          <div class="benefits-label">{{ $t('billing.included') }}</div>
          <div class="plan-benefits">
            <div v-if="plan.credits_once" class="plan-benefit is-primary">
              <a-icon type="check-circle" theme="filled" />
              <span>+{{ formatCredits(plan.credits_once) }} {{ $t('billing.credits') }}</span>
            </div>
            <div v-if="plan.credits_monthly" class="plan-benefit is-primary">
              <a-icon type="check-circle" theme="filled" />
              <span>{{ $t('billing.lifetimeMonthly') }} +{{ formatCredits(plan.credits_monthly) }} {{ $t('billing.credits') }}</span>
            </div>
            <div class="plan-benefit is-primary">
              <a-icon type="check-circle" theme="filled" />
              <span>{{ $t('billing.benefitVipLibrary') }}</span>
            </div>
            <div class="plan-benefit">
              <a-icon type="check-circle" theme="filled" />
              <span>{{ $t('billing.benefitUpdates') }}</span>
            </div>
            <div class="plan-benefit">
              <a-icon type="check-circle" theme="filled" />
              <span>{{ $t('billing.strategyLimit', { count: plan.strategy_limit }) }}</span>
            </div>
          </div>

          <a-button
            class="plan-action"
            :type="isRecommendedPlan(plan) ? 'primary' : 'default'"
            block
            :loading="purchasing === plan.code"
            @click="buy(plan.code)"
          >
            <span>{{ planActionLabel(plan) }}</span>
            <a-icon type="arrow-right" />
          </a-button>
        </article>
      </div>
    </section>

    <a-modal
      v-model="methodPickerVisible"
      :title="tr('billing.paymentMethod', 'Select payment method')"
      :footer="null"
      wrapClassName="payment-method-picker-wrap"
      width="520px"
    >
      <div class="payment-picker-intro">{{ tr('billing.paymentMethodHint', 'Choose a secure payment method for this order') }}</div>
      <div class="payment-methods">
        <button
          v-for="method in availablePaymentMethods"
          :key="method.code"
          type="button"
          class="payment-method-card"
          :class="`method-${method.code.toLowerCase()}`"
          @click="choosePaymentMethod(method.code)"
        >
          <span class="payment-brand" aria-hidden="true">
            <svg v-if="method.code === 'USDT'" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#26A17B"/><path d="M17.9 17.9v-.003c-.1.008-.6.04-1.8.04-1 0-1.5-.028-1.7-.04v.004c-3.4-.15-5.9-.74-5.9-1.44 0-.7 2.5-1.29 5.9-1.44v2.3c.2.013.7.05 1.7.05 1.2 0 1.6-.04 1.8-.05v-2.3c3.4.15 5.9.74 5.9 1.44 0 .7-2.5 1.29-5.9 1.44zm0-3.12V12.7h5v-2.4H9.2v2.4h5v2.08c-3.8.18-6.7.93-6.7 1.83s2.9 1.65 6.7 1.83v6.56h3.6v-6.56c3.8-.18 6.7-.93 6.7-1.83s-2.8-1.65-6.6-1.83z" fill="#fff"/></svg>
            <svg v-else-if="method.code === 'USDC'" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#2775CA"/><circle
              cx="16"
              cy="16"
              r="10.5"
              fill="none"
              stroke="#fff"
              stroke-width="1.8"
            /><path d="M18.9 12.7c-.4-1-1.3-1.5-2.7-1.5-1.6 0-2.7.8-2.7 2s.9 1.7 2.8 2.1c2.3.5 3.4 1.3 3.4 3.2 0 1.7-1.3 2.9-3.3 3.1V24h-1.5v-2.4c-1.8-.2-3-1-3.7-2.5l1.8-.9c.5 1.1 1.5 1.7 3 1.7 1.2 0 2.1-.5 2.1-1.4 0-.8-.7-1.2-2.6-1.7-2.4-.5-3.5-1.5-3.5-3.4 0-1.8 1.2-3.1 3-3.5V7.6h1.5v2.2c1.8.2 3.1 1 3.8 2.3l-1.4.6z" fill="#fff"/></svg>
            <span v-else class="stripe-mark">S</span>
          </span>
          <span class="payment-method-copy">
            <strong>{{ paymentMethodTitle(method.code) }}</strong>
            <small>{{ paymentMethodDescription(method.code) }}</small>
            <span v-if="method.code === 'STRIPE'" class="card-brand-list" aria-hidden="true">
              <span class="visa-chip">VISA</span>
              <span class="mastercard-chip"><i></i><i></i><b>Mastercard</b></span>
              <span class="stripe-chip">stripe</span>
            </span>
          </span>
          <a-icon class="payment-method-arrow" type="right" />
        </button>
        <a-empty v-if="availablePaymentMethods.length === 0" :description="tr('billing.noPaymentMethod', 'No payment method is configured for this plan')" />
      </div>
    </a-modal>

    <!-- Chain Picker Modal (v3.0.6+) -->
    <a-modal
      v-model="chainPickerVisible"
      :title="$t('billing.usdt.pickChainTitle') || 'Select payment network'"
      :footer="null"
      :maskClosable="!creatingOrder"
      :closable="!creatingOrder"
      wrapClassName="usdt-chain-picker-wrap"
      width="520px"
      @cancel="closeChainPicker"
    >
      <div class="chain-picker-body">
        <a-alert
          v-if="chainsLoadError"
          type="error"
          show-icon
          :message="chainsLoadError"
          style="margin-bottom: 12px;"
        />
        <a-spin :spinning="chainsLoading">
          <div v-if="!chainsLoading && availableChains.length === 0" class="empty-chains">
            <a-alert
              type="warning"
              show-icon
              :message="$t('billing.usdt.noChainsTitle') || 'No payment networks configured'"
              :description="tr('billing.cryptoNoChainsDesc', `Ask the administrator to configure a ${selectedCurrency} receiving address.`, { currency: selectedCurrency })"
            />
          </div>
          <div v-else class="chain-options">
            <div
              v-for="c in availableChains"
              :key="c.code"
              class="chain-option"
              :class="{ selected: selectedChain === c.code, recommended: c.recommended }"
              @click="selectedChain = c.code"
            >
              <div class="chain-row">
                <div class="chain-name">
                  <a-icon type="link" />
                  <span class="chain-label">{{ c.label }}</span>
                  <a-tag v-if="c.recommended" color="green" class="chain-badge">{{ $t('billing.usdt.recommended') || 'Recommended' }}</a-tag>
                </div>
                <div class="chain-fee">
                  <span class="fee-label">{{ $t('billing.usdt.typicalFee') || 'Typical fee' }}</span>
                  <span class="fee-value">≈ ${{ Number(c.typical_fee_usdt).toFixed(c.typical_fee_usdt < 0.01 ? 4 : 2) }}</span>
                </div>
              </div>
              <div class="chain-sub">
                <a-icon type="check-circle" v-if="selectedChain === c.code" theme="filled" class="picked-icon" />
                <span class="chain-addr-hint">{{ $t('billing.usdt.receivingAddrPrefix') || 'Receives to' }} {{ c.address_prefix_hint }}</span>
              </div>
            </div>
          </div>
        </a-spin>
        <div class="picker-actions">
          <a-button :disabled="creatingOrder" @click="closeChainPicker">{{ $t('common.cancel') || 'Cancel' }}</a-button>
          <a-button
            type="primary"
            :disabled="!selectedChain || availableChains.length === 0"
            :loading="creatingOrder"
            @click="confirmChain"
          >
            {{ $t('billing.usdt.continueToPay') || 'Continue to pay' }}
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- Stablecoin Pay Modal -->
    <a-modal
      v-model="usdtModalVisible"
      :title="null"
      :footer="null"
      :maskClosable="false"
      :closable="false"
      wrapClassName="usdt-pay-modal-wrap"
      width="600px"
      @cancel="closeUsdtModal"
    >
      <div v-if="usdtOrder" class="usdt-checkout" :class="{ 'currency-usdc': activeCurrency === 'USDC' }">
        <!-- Custom Header -->
        <div class="checkout-header">
          <div class="header-left">
            <div class="stablecoin-logo">
              <svg v-if="activeCurrency === 'USDC'" viewBox="0 0 32 32" width="28" height="28"><circle cx="16" cy="16" r="16" fill="#2775CA"/><circle
                cx="16"
                cy="16"
                r="10.5"
                fill="none"
                stroke="#fff"
                stroke-width="1.8"
              /><path d="M18.9 12.7c-.4-1-1.3-1.5-2.7-1.5-1.6 0-2.7.8-2.7 2s.9 1.7 2.8 2.1c2.3.5 3.4 1.3 3.4 3.2 0 1.7-1.3 2.9-3.3 3.1V24h-1.5v-2.4c-1.8-.2-3-1-3.7-2.5l1.8-.9c.5 1.1 1.5 1.7 3 1.7 1.2 0 2.1-.5 2.1-1.4 0-.8-.7-1.2-2.6-1.7-2.4-.5-3.5-1.5-3.5-3.4 0-1.8 1.2-3.1 3-3.5V7.6h1.5v2.2c1.8.2 3.1 1 3.8 2.3l-1.4.6z" fill="#fff"/></svg>
              <svg v-else viewBox="0 0 32 32" width="28" height="28"><circle cx="16" cy="16" r="16" fill="#26A17B"/><path d="M17.9 17.9v-.003c-.1.008-.6.04-1.8.04-1 0-1.5-.028-1.7-.04v.004c-3.4-.15-5.9-.74-5.9-1.44 0-.7 2.5-1.29 5.9-1.44v2.3c.2.013.7.05 1.7.05 1.2 0 1.6-.04 1.8-.05v-2.3c3.4.15 5.9.74 5.9 1.44 0 .7-2.5 1.29-5.9 1.44zm0-3.12V12.7h5v-2.4H9.2v2.4h5v2.08c-3.8.18-6.7.93-6.7 1.83s2.9 1.65 6.7 1.83v6.56h3.6v-6.56c3.8-.18 6.7-.93 6.7-1.83s-2.8-1.65-6.6-1.83z" fill="#fff"/></svg>
            </div>
            <div class="header-text">
              <div class="header-title">{{ activeCurrency }} {{ tr('billing.cryptoPayment', 'payment') }}</div>
              <div class="header-desc">{{ tr('billing.cryptoPaymentHint', `Pay the exact ${activeCurrency} amount on the selected network`, { currency: activeCurrency }) }}</div>
            </div>
          </div>
          <a-button type="link" class="close-btn" @click="closeUsdtModal">
            <a-icon type="close" />
          </a-button>
        </div>

        <!-- Status Steps -->
        <div class="checkout-steps">
          <div
            v-for="(step, idx) in stepItems"
            :key="idx"
            class="step-item"
            :class="{ active: idx <= usdtStepCurrent, current: idx === usdtStepCurrent }"
          >
            <div class="step-dot">
              <span class="dot-inner" />
              <span v-if="idx === usdtStepCurrent && usdtOrder.status === 'pending'" class="dot-pulse" />
            </div>
            <span class="step-label">{{ step }}</span>
            <div v-if="idx < stepItems.length - 1" class="step-line" :class="{ filled: idx < usdtStepCurrent }" />
          </div>
        </div>

        <!-- Main Content -->
        <div class="checkout-body">
          <!-- QR Section -->
          <div class="qr-section">
            <div class="qr-frame" :class="{ 'qr-confirmed': usdtOrder.status === 'confirmed' }">
              <img :src="usdtQrUrl" :alt="`${activeCurrency} QR`" />
            </div>
            <div class="qr-amount">
              <span class="amt-number">
                <span class="amt-base">{{ amountParts.base }}</span><span class="amt-suffix">{{ amountParts.suffix }}</span>
              </span>
              <span class="amt-currency">{{ activeCurrency }}</span>
            </div>
            <div class="qr-chain">
              <a-tag color="green">{{ usdtOrder.chain }}</a-tag>
              <a-tooltip v-if="walletCompatHint" :title="walletCompatHint">
                <a-tag color="blue" style="margin-left: 4px;">
                  <a-icon type="info-circle" /> {{ $t('billing.usdt.walletCompat') || 'Wallet hint' }}
                </a-tag>
              </a-tooltip>
            </div>
          </div>

          <!-- Info Section -->
          <div class="info-section">
            <!-- Address -->
            <div class="info-block">
              <div class="info-label">
                <a-icon type="environment" />
                <span>{{ $t('billing.usdt.address') }}</span>
              </div>
              <div class="addr-box">
                <code class="addr-text">{{ usdtOrder.address }}</code>
                <a-tooltip :title="$t('billing.usdt.copyAddress')">
                  <a-button size="small" class="copy-btn" @click="copyText(usdtOrder.address)">
                    <a-icon type="copy" />
                  </a-button>
                </a-tooltip>
              </div>
            </div>

            <!-- Amount (with suffix highlighted so the user does not skip the trailing digits) -->
            <div class="info-block">
              <div class="info-label">
                <a-icon type="dollar" />
                <span>{{ $t('billing.usdt.amount') }}</span>
                <span class="info-sublabel">{{ $t('billing.usdt.amountSuffixHint') || 'Pay this exact amount — the trailing digits identify your order.' }}</span>
              </div>
              <div class="amt-box">
                <code class="amt-text">
                  <span>{{ amountParts.base }}</span><span class="amt-suffix-inline">{{ amountParts.suffix }}</span>
                  <span class="amt-currency-inline"> {{ activeCurrency }}</span>
                </code>
                <a-tooltip :title="$t('billing.usdt.copyAmount')">
                  <a-button size="small" class="copy-btn" @click="copyText(usdtOrder.amount_usdt)">
                    <a-icon type="copy" />
                  </a-button>
                </a-tooltip>
              </div>
            </div>

            <!-- Warning -->
            <div class="warn-strip">
              <a-icon type="exclamation-circle" />
              <span>{{ $t('billing.usdt.hintTitle') }}</span>
            </div>

            <!-- Expiry & Status -->
            <div class="meta-row">
              <div class="meta-status">
                <a-tag :color="statusColor">{{ statusText }}</a-tag>
              </div>
              <div v-if="usdtOrder.expires_at" class="meta-expire">
                <a-icon type="clock-circle" />
                <span>{{ formatDateTime(usdtOrder.expires_at) }}</span>
              </div>
            </div>

            <!-- Expired: contact support -->
            <div v-if="usdtOrder.status === 'expired'" class="expired-hint">
              <a-alert
                type="warning"
                :message="$t('billing.usdt.expiredHint')"
                show-icon
                banner
              />
            </div>

            <!-- Confirmed: success banner -->
            <div v-if="usdtOrder.status === 'confirmed'" class="confirmed-hint">
              <a-alert
                type="success"
                :message="$t('billing.usdt.confirmedHint')"
                show-icon
                banner
              />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="checkout-footer">
          <a-button v-if="usdtOrder.status !== 'confirmed'" size="small" :loading="usdtRefreshing" @click="refreshUsdtOrder">
            <a-icon type="reload" />
            {{ $t('billing.usdt.refresh') }}
          </a-button>
          <a-button v-if="usdtOrder.status === 'confirmed'" type="primary" @click="closeUsdtModal">
            <a-icon type="check-circle" />
            {{ $t('common.done') || 'Done' }}
          </a-button>
          <a-button v-else @click="closeUsdtModal">{{ $t('common.close') || 'Close' }}</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { getMembershipPlans, getFreeMarketAssetCounts, listCryptoChains, createCryptoOrder, getCryptoOrder, createStripeCheckout } from '@/api/billing'

export default {
  name: 'BillingPage',
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    planItems () {
      return Object.values(this.plans || {}).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    },
    recommendedPlanCode () {
      const recurringPlans = this.planItems.filter(plan => !plan.is_lifetime)
      const recommended = recurringPlans.find(plan => plan.is_popular) || recurringPlans.reduce((current, plan) => {
        return !current || Number(plan.duration_days) > Number(current.duration_days) ? plan : current
      }, null)
      return recommended ? recommended.code : ''
    },
    activeCurrency () {
      return (this.usdtOrder && this.usdtOrder.currency) || this.selectedCurrency || 'USDT'
    },
    availablePaymentMethods () {
      const plan = this.plans && this.plans[this.pendingPlan]
      return (this.paymentMethods || []).filter(method => method.code !== 'STRIPE' || (plan && plan.stripe_enabled))
    },
    usdtQrUrl () {
      const text = this.getUsdtQrText()
      if (!text) return ''
      // External QR generator (MVP). Replace with local generator later if needed.
      return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(text)}`
    },
    amountParts () {
      // Split the amount into the "human-readable" base portion and the
      // suffix tail. The suffix is what identifies the order on-chain, so
      // we render it in a contrasting style on top of the base — users
      // who skim the amount and miss the trailing digits would otherwise
      // under-pay.
      const order = this.usdtOrder
      if (!order || !order.amount_usdt) return { full: '', base: '', suffix: '' }
      const full = String(order.amount_usdt)
      const dotIdx = full.indexOf('.')
      if (dotIdx < 0) return { full, base: full, suffix: '' }
      const fractional = full.slice(dotIdx + 1)
      if (fractional.length <= 2) return { full, base: full, suffix: '' }
      // Keep the first 2 fractional digits in the "base" group (the
      // dollar-cent portion of the price). The remaining digits are the
      // identifier suffix and get the highlight class.
      const baseLen = dotIdx + 1 + 2
      return {
        full,
        base: full.slice(0, baseLen),
        suffix: full.slice(baseLen)
      }
    },
    walletCompatHint () {
      const note = this.usdtOrder && this.usdtOrder.wallet_compat_note
      if (!note) return ''
      const map = {
        evm_eip681: this.$t('billing.usdt.compat.evm') || 'MetaMask, TrustWallet, TokenPocket, imToken, OKX and Coinbase will auto-fill both the address and the amount when they scan this QR.',
        solana_pay: this.$t('billing.usdt.compat.solana') || 'Phantom, Solflare, TokenPocket and OKX will auto-fill both the address and the amount when they scan this QR.',
        tron_partial: this.$t('billing.usdt.compat.tron') || 'TokenPocket and imToken auto-fill both fields. Older TronLink builds only pick up the address — copy the amount from the highlighted field on the right.'
      }
      return map[note] || ''
    },
    statusText () {
      const s = (this.usdtOrder && this.usdtOrder.status) ? String(this.usdtOrder.status) : ''
      const map = {
        pending: this.$t('billing.usdt.status.pending'),
        paid: this.$t('billing.usdt.status.paid'),
        confirmed: this.$t('billing.usdt.status.confirmed'),
        expired: this.$t('billing.usdt.status.expired'),
        cancelled: this.$t('billing.usdt.status.cancelled'),
        failed: this.$t('billing.usdt.status.failed')
      }
      return map[s] || s || '--'
    },
    statusColor () {
      const s = (this.usdtOrder && this.usdtOrder.status) ? String(this.usdtOrder.status) : ''
      if (s === 'confirmed') return 'green'
      if (s === 'paid') return 'blue'
      if (s === 'expired' || s === 'failed' || s === 'cancelled') return 'red'
      return 'orange'
    },
    usdtStepCurrent () {
      const s = (this.usdtOrder && this.usdtOrder.status) ? String(this.usdtOrder.status) : ''
      if (s === 'confirmed') return 2
      if (s === 'paid') return 1
      return 0
    },
    stepItems () {
      return [
        this.$t('billing.usdt.status.pending'),
        this.$t('billing.usdt.status.paid'),
        this.$t('billing.usdt.status.confirmed')
      ]
    }
  },
  data () {
    return {
      loading: false,
      purchasing: '',
      usdtModalVisible: false,
      usdtOrder: null,
      usdtPollingTimer: null,
      usdtPollingGeneration: 0,
      usdtRefreshing: false,
      // Chain picker state (v3.0.6+)
      chainPickerVisible: false,
      chainsLoading: false,
      chainsLoadError: '',
      availableChains: [],
      selectedChain: null,
      pendingPlan: null,
      creatingOrder: false,
      methodPickerVisible: false,
      paymentMethods: [],
      selectedCurrency: 'USDT',
      freeAssetCountsLoading: true,
      freeAssetCounts: {
        strategy_count: 0,
        indicator_count: 0
      },
      billing: {
        credits: 0,
        is_vip: false,
        is_lifetime: false,
        vip_expires_at: null
      },
      plans: {}
    }
  },
  created () {
    this.load()
    this.loadFreeMarketAssetCounts()
    if (this.$route.query.payment === 'stripe_success') {
      this.$message.success(this.tr('billing.stripeSuccess', 'Payment completed. Credits will refresh after Stripe confirms it.'))
      window.setTimeout(() => this.load(), 2000)
    }
  },
  activated () {
    if (!this.freeAssetCountsLoading) {
      this.loadFreeMarketAssetCounts()
    }
  },
  beforeDestroy () {
    this.stopUsdtPolling()
  },
  methods: {
    tr (key, fallback, params) {
      const translated = this.$t(key, params)
      return translated && translated !== key ? translated : fallback
    },
    paymentMethodTitle (code) {
      const titles = {
        USDT: this.tr('billing.methodUsdtTitle', 'USDT stablecoin'),
        USDC: this.tr('billing.methodUsdcTitle', 'USDC stablecoin'),
        STRIPE: this.tr('billing.methodStripeTitle', 'Card payment')
      }
      return titles[code] || code
    },
    paymentMethodDescription (code) {
      const descriptions = {
        USDT: this.tr('billing.methodUsdtDesc', 'Transfer from a crypto wallet on supported networks'),
        USDC: this.tr('billing.methodUsdcDesc', 'Circle stablecoin on Ethereum or Solana'),
        STRIPE: this.tr('billing.methodStripeDesc', 'Visa, Mastercard and other cards, securely processed by Stripe')
      }
      return descriptions[code] || ''
    },
    async load () {
      this.loading = true
      try {
        const res = await getMembershipPlans()
        if (res && res.code === 1 && res.data) {
          this.plans = res.data.plans || this.plans
          this.billing = res.data.billing || this.billing
          this.paymentMethods = res.data.payment_methods || []
        } else {
          this.$message.error(res?.msg || 'Load failed')
        }
      } catch (e) {
        this.$message.error(e?.response?.data?.msg || 'Load failed')
      } finally {
        this.loading = false
      }
    },
    async loadFreeMarketAssetCounts () {
      this.freeAssetCountsLoading = true
      try {
        const res = await getFreeMarketAssetCounts()
        if (res && res.code === 1 && res.data) {
          this.freeAssetCounts = {
            strategy_count: Number(res.data.strategy_count || 0),
            indicator_count: Number(res.data.indicator_count || 0)
          }
        }
      } catch (e) {
        console.warn('Failed to load free marketplace asset counts', e)
      } finally {
        this.freeAssetCountsLoading = false
      }
    },
    formatCredits (v) {
      if (!v && v !== 0) return '0'
      return Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    },
    planDisplayName (plan) {
      const key = `billing.plan.${plan.code}`
      const translated = this.$t(key)
      return translated && translated !== key ? translated : (plan.name || plan.code)
    },
    isRecommendedPlan (plan) {
      return Boolean(plan && plan.code === this.recommendedPlanCode)
    },
    monthlyReferencePlan () {
      return this.planItems.find(plan => !plan.is_lifetime && Number(plan.duration_days) > 0 && Number(plan.duration_days) <= 31)
    },
    monthlyEquivalent (plan) {
      const duration = Number(plan && plan.duration_days)
      const price = Number(plan && plan.price_usd)
      if (!duration || !Number.isFinite(price) || plan.is_lifetime) return ''
      return (price / (duration / 30)).toFixed(2).replace(/\.00$/, '')
    },
    planSavingsPercent (plan) {
      if (!plan || plan.is_lifetime) return 0
      const monthlyPlan = this.monthlyReferencePlan()
      const duration = Number(plan.duration_days)
      const monthlyDuration = Number(monthlyPlan && monthlyPlan.duration_days)
      const monthlyPrice = Number(monthlyPlan && monthlyPlan.price_usd)
      const price = Number(plan.price_usd)
      if (!monthlyPlan || plan.code === monthlyPlan.code || !duration || !monthlyDuration || !monthlyPrice || !price) return 0
      const comparablePrice = monthlyPrice * (duration / monthlyDuration)
      return Math.max(0, Math.round((1 - price / comparablePrice) * 100))
    },
    planValueText (plan) {
      if (plan.is_lifetime) return this.$t('billing.lifetimeValue')
      const monthly = this.monthlyEquivalent(plan)
      if (Number(plan.duration_days) <= 31) return this.$t('billing.flexiblePlan')
      return this.$t('billing.monthlyEquivalent', { price: monthly })
    },
    planActionLabel (plan) {
      if (plan.is_lifetime) return this.$t('billing.chooseLifetime')
      if (this.isRecommendedPlan(plan)) return this.$t('billing.chooseRecommended')
      return this.$t('billing.choosePlanAction')
    },
    formatDate (dateStr) {
      if (!dateStr) return ''
      return new Date(dateStr).toLocaleDateString()
    },
    async buy (plan) {
      this.purchasing = plan
      this.pendingPlan = plan
      this.methodPickerVisible = true
      this.purchasing = ''
    },

    async choosePaymentMethod (method) {
      this.methodPickerVisible = false
      if (method === 'STRIPE') {
        // Open synchronously while the click still carries a browser user gesture.
        // Waiting for the API first causes Safari and other browsers to block it.
        const checkoutWindow = window.open('about:blank', '_blank')
        if (!checkoutWindow) {
          this.$message.warning(this.tr('billing.stripePopupBlocked', 'Please allow pop-ups to open the secure card payment page.'))
          return
        }
        checkoutWindow.opener = null
        this.purchasing = this.pendingPlan
        try {
          const res = await createStripeCheckout(this.pendingPlan)
          if (res && res.code === 1 && res.data && res.data.checkout_url) {
            if (checkoutWindow.closed) {
              this.$message.warning(this.tr('billing.stripePopupBlocked', 'Please allow pop-ups to open the secure card payment page.'))
              return
            }
            checkoutWindow.location.replace(res.data.checkout_url)
            return
          }
          checkoutWindow.close()
          this.$message.error(res?.msg || this.$t('billing.purchaseFailed'))
        } catch (e) {
          checkoutWindow.close()
          this.$message.error(e?.response?.data?.msg || this.$t('billing.purchaseFailed'))
        } finally {
          this.purchasing = ''
        }
        return
      }
      this.selectedCurrency = method
      this.selectedChain = null
      this.chainsLoadError = ''
      this.chainsLoading = true
      this.chainPickerVisible = true
      try {
        const res = await listCryptoChains(method)
        if (res && res.code === 1 && res.data && Array.isArray(res.data.chains)) {
          this.availableChains = res.data.chains
          // Preselect the first "recommended" chain; if none, the first one.
          const rec = this.availableChains.find(c => c.recommended)
          this.selectedChain = (rec || this.availableChains[0] || {}).code || null
        } else {
          this.availableChains = []
          this.chainsLoadError = res?.msg || (this.$t('billing.usdt.chainListFailed') || 'Failed to load payment networks')
        }
      } catch (e) {
        this.availableChains = []
        this.chainsLoadError = e?.response?.data?.msg || (this.$t('billing.usdt.chainListFailed') || 'Failed to load payment networks')
      } finally {
        this.chainsLoading = false
        this.purchasing = ''
      }
    },

    closeChainPicker () {
      if (this.creatingOrder) return
      this.chainPickerVisible = false
      this.pendingPlan = null
      this.selectedChain = null
    },

    async confirmChain () {
      if (!this.pendingPlan || !this.selectedChain) return
      this.creatingOrder = true
      try {
        const res = await createCryptoOrder(this.pendingPlan, this.selectedChain, this.selectedCurrency)
        if (res && res.code === 1 && res.data) {
          this.usdtOrder = res.data
          this.usdtModalVisible = true
          this.chainPickerVisible = false
          this.pendingPlan = null
          // If the backend reused an existing (still-valid) pending
          // order, give the user a light toast so they don't think the
          // app silently ignored their click. We don't block the flow.
          if (res.data.reused) {
            this.$message.info(this.$t('billing.usdt.reusedHint') || 'Resuming your previous unpaid order')
          }
          this.startUsdtPolling()
        } else {
          this.$message.error(res?.msg || this.$t('billing.purchaseFailed'))
        }
      } catch (e) {
        this.$message.error(e?.response?.data?.msg || this.$t('billing.purchaseFailed'))
      } finally {
        this.creatingOrder = false
      }
    },

    getUsdtQrText () {
      // v3.0.6+: prefer the backend-built deep link URI (EIP-681 /
      // Solana Pay / tron:) so EVM and Solana wallets can pre-fill both
      // the recipient and the amount. Fall back to the raw receiving
      // address so the QR is still scannable even on legacy wallets.
      if (!this.usdtOrder) return ''
      return this.usdtOrder.payment_uri || this.usdtOrder.address || ''
    },

    /**
     * Copy a string to the clipboard.
     *
     * Notes
     * - Does NOT depend on `this.$copyText` (vue-clipboard2). That plugin is
     *   listed in package.json but is never registered in main.js, so calling
     *   `this.$copyText` throws TypeError and the error toast falls through to
     *   `this.$t('common.copyFailed')`. vue-i18n returns the key itself when a
     *   key is missing, and a non-empty string is truthy, so the JS-style
     *   `this.$t(key) || 'fallback'` pattern silently fails — that is exactly
     *   why the user saw `common.copyFailed` rendered literally on screen.
     * - Two-tier strategy: prefer the modern async Clipboard API (works in
     *   secure contexts including Capacitor https://localhost), and fall back
     *   to the legacy execCommand path for plain-http / iframe / older
     *   browsers. Both branches end with a clear i18n message.
     */
    async copyText (txt) {
      const value = String(txt == null ? '' : txt)
      if (!value) return
      const successMsg = this.$t('common.copySuccess')
      const failMsg = this.$t('common.copyFailed')

      let ok = false
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value)
          ok = true
        }
      } catch (_) {
        ok = false
      }

      if (!ok) {
        try {
          const ta = document.createElement('textarea')
          ta.value = value
          ta.setAttribute('readonly', '')
          ta.style.position = 'fixed'
          ta.style.top = '-1000px'
          ta.style.left = '-1000px'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.focus()
          ta.select()
          ok = document.execCommand && document.execCommand('copy')
          document.body.removeChild(ta)
        } catch (_) {
          ok = false
        }
      }

      if (ok) {
        this.$message.success(successMsg)
      } else {
        this.$message.error(failMsg)
      }
    },

    formatDateTime (dateStr) {
      if (!dateStr) return ''
      return new Date(dateStr).toLocaleString()
    },

    async refreshUsdtOrder () {
      if (!this.usdtOrder || !this.usdtOrder.order_id) return
      const generation = this.usdtPollingGeneration
      const orderId = this.usdtOrder.order_id
      this.usdtRefreshing = true
      try {
        const res = await getCryptoOrder(orderId, true)
        if (res && res.code === 1 && res.data) {
          if (generation !== this.usdtPollingGeneration || !this.usdtOrder || this.usdtOrder.order_id !== orderId) return
          this.usdtOrder = res.data
          const status = this.usdtOrder.status
          if (status === 'confirmed') {
            this.$message.success(this.$t('billing.usdt.paidSuccess'))
            this.stopUsdtPolling()
            await this.load()
          } else if (status === 'expired' || status === 'failed' || status === 'cancelled') {
            // Terminal state — stop polling
            this.stopUsdtPolling()
          }
        }
      } catch (e) {
        // Ignore polling errors
      } finally {
        this.usdtRefreshing = false
      }
    },

    startUsdtPolling () {
      this.stopUsdtPolling()
      this.usdtPollingTimer = setInterval(() => {
        this.refreshUsdtOrder()
      }, 5000)
    },

    stopUsdtPolling () {
      this.usdtPollingGeneration += 1
      if (this.usdtPollingTimer) {
        clearInterval(this.usdtPollingTimer)
        this.usdtPollingTimer = null
      }
    },

    closeUsdtModal () {
      this.usdtModalVisible = false
      this.stopUsdtPolling()
      this.usdtOrder = null
    }
  }
}
</script>

<style lang="less" scoped>
@import './billing-polish.less';

.billing-page {
  --billing-page-bg: #f4f6f8;
  --billing-surface: #ffffff;
  --billing-surface-muted: #f7f8fa;
  --billing-border: #e2e6eb;
  --billing-text: #17202d;
  --billing-secondary: #596576;
  --billing-muted: #8993a2;
  --billing-shadow: 0 12px 32px rgba(23, 32, 45, 0.06);
  --billing-accent-soft: color-mix(in srgb, var(--primary-color, #13c2c2) 10%, transparent);
  --billing-accent-border: color-mix(in srgb, var(--primary-color, #13c2c2) 32%, transparent);
  min-height: 100%;
  padding: var(--qd-page-gutter, 16px);
  color: var(--billing-text);
  background: var(--billing-page-bg);

  .billing-hero,
  .plans-section,
  > .ant-alert {
    width: 100%;
    max-width: 1440px;
    margin-right: auto;
    margin-left: auto;
  }

  .billing-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(360px, 480px);
    gap: 32px;
    min-height: 190px;
    padding: 30px 34px;
    border: 1px solid var(--billing-border);
    border-radius: 16px;
    background: var(--billing-surface);
    box-shadow: var(--billing-shadow);
  }

  .hero-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
  }

  .page-title {
    margin: 0;
    color: var(--billing-text);
    font-size: clamp(24px, 2vw, 30px);
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -.02em;
  }

  .page-desc {
    max-width: 640px;
    margin: 8px 0 24px;
    color: var(--billing-secondary);
    font-size: 15px;
    line-height: 1.65;
  }

  .hero-rule {
    display: flex;
    align-items: baseline;
    gap: 12px;
    max-width: 720px;
    padding-left: 13px;
    border-left: 2px solid var(--primary-color, #13c2c2);
    color: var(--billing-secondary);
    font-size: 13px;
    line-height: 1.55;
  }

  .rule-label {
    flex: 0 0 auto;
    color: var(--billing-text);
    font-weight: 700;
  }

  .account-snapshot {
    align-self: center;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
    gap: 24px;
    width: 100%;
    padding-left: 32px;
    border-left: 1px solid var(--billing-border);
  }

  .snapshot-block {
    min-width: 0;
  }

  .snap-label {
    margin-bottom: 8px;
    color: var(--billing-muted);
    font-size: 12px;
    font-weight: 600;
  }

  .snap-value {
    color: var(--billing-text);
    font-size: 28px;
    font-weight: 750;
    line-height: 1.15;
    letter-spacing: -.025em;
  }

  .snapshot-divider {
    width: 1px;
    height: 64px;
    margin: 0;
    background: var(--billing-border);
  }

  .vip-state {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    vertical-align: middle;

    &.is-active,
    &.is-lifetime {
      color: var(--primary-color, #13c2c2);
      background: var(--billing-accent-soft);
    }

    &.is-inactive {
      color: var(--billing-secondary);
      background: var(--billing-surface-muted);
    }
  }

  .vip-exp {
    margin-top: 7px;
    color: var(--billing-muted);
    font-size: 12px;
  }

  > .ant-alert {
    border-radius: 8px;
  }

  .plans-section {
    margin-top: 30px;
  }

  .plans-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 16px;

    h3 {
      margin: 0;
      color: var(--billing-text);
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -.015em;
    }

    p {
      margin: 5px 0 0;
      color: var(--billing-muted);
      font-size: 13px;
    }
  }

  .library-entitlement {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) auto minmax(180px, auto);
    align-items: center;
    gap: 24px;
    margin-bottom: 16px;
    padding: 16px 20px;
    border: 1px solid var(--billing-accent-border);
    border-radius: 12px;
    background: var(--billing-accent-soft);

    &.is-loading {
      opacity: .72;
    }
  }

  .library-entitlement-copy {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;

    strong {
      color: var(--billing-text);
      font-size: 14px;
      font-weight: 700;
    }
  }

  .library-entitlement-label {
    flex: 0 0 auto;
    color: var(--primary-color, #13c2c2);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0;
  }

  .library-entitlement-counts {
    display: flex;
    align-items: center;
    gap: 16px;
    color: var(--billing-secondary);
    font-size: 13px;
    font-weight: 650;

    span {
      white-space: nowrap;
    }

    b {
      margin-right: 4px;
      color: var(--primary-color, #13c2c2);
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -.02em;
    }

    i {
      width: 1px;
      height: 18px;
      background: var(--billing-accent-border);
    }
  }

  .library-entitlement-note {
    justify-self: end;
    color: var(--billing-muted);
    font-size: 12px;
    white-space: nowrap;
  }

  .plans-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .plan-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 410px;
    padding: 26px;
    border: 1px solid var(--billing-border);
    border-radius: 14px;
    background: var(--billing-surface);
    box-shadow: 0 4px 16px rgba(23, 32, 45, .035);
    transition: border-color .2s ease, box-shadow .2s ease;

    &:hover {
      border-color: var(--billing-accent-border);
      box-shadow: 0 10px 28px rgba(23, 32, 45, .075);
    }

    &.highlight {
      border-color: var(--primary-color, #13c2c2);
      box-shadow: 0 8px 24px var(--billing-accent-soft);
    }

    &.lifetime {
      border-color: var(--billing-border);
    }
  }

  .popular-badge {
    position: absolute;
    top: 20px;
    right: 20px;
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border: 1px solid var(--billing-accent-border);
    border-radius: 5px;
    color: var(--primary-color, #13c2c2);
    background: transparent;
    font-size: 11px;
    font-weight: 700;
  }

  .plan-heading {
    display: flex;
    align-items: center;
    min-height: 43px;
    padding-right: 74px;
  }

  .plan-title {
    color: var(--billing-text);
    font-size: 18px;
    font-weight: 700;
    line-height: 1.3;
  }

  .plan-duration {
    margin-top: 3px;
    color: var(--billing-muted);
    font-size: 12px;
  }

  .plan-price-row {
    display: flex;
    align-items: baseline;
    margin-top: 26px;
    color: var(--billing-text);
  }

  .plan-currency {
    margin-right: 3px;
    font-size: 19px;
    font-weight: 700;
  }

  .plan-price {
    font-size: clamp(36px, 3vw, 46px);
    font-weight: 750;
    line-height: 1;
    letter-spacing: -.045em;
  }

  .plan-unit {
    margin-left: 8px;
    color: var(--billing-muted);
    font-size: 12px;
    font-weight: 600;
  }

  .plan-value-row {
    min-height: 28px;
    margin-top: 12px;
    color: var(--billing-secondary);
    font-size: 12px;
    line-height: 1.5;
  }

  .savings-label {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--primary-color, #13c2c2);
    background: var(--billing-accent-soft);
    font-weight: 700;
  }

  .plan-divider {
    height: 1px;
    margin: 18px 0 18px;
    background: var(--billing-border);
  }

  .plan-benefits {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .benefits-label {
    margin-bottom: 12px;
    color: var(--billing-muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .plan-benefit {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    color: var(--billing-secondary);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;

    .anticon {
      margin-top: 3px;
      color: var(--primary-color, #13c2c2);
    }

    &.is-primary {
      color: var(--billing-text);

      .anticon {
        color: var(--primary-color, #13c2c2);
      }
    }
  }

  .plan-action {
    height: 44px;
    margin-top: 24px;
    border-color: var(--billing-border);
    border-radius: 8px;
    color: var(--billing-text);
    background: var(--billing-surface-muted);
    font-weight: 700;

    .anticon {
      margin-left: 7px;
      transition: transform .2s ease;
    }

    &:hover .anticon {
      transform: translateX(3px);
    }

    &.ant-btn-primary {
      border-color: var(--primary-color, #13c2c2);
      color: #fff;
      background: var(--primary-color, #13c2c2);
      box-shadow: none;
    }
  }

  .payment-methods {
    display: grid;
    gap: 12px;
  }

  &.theme-dark {
    --billing-page-bg: #101010;
    --billing-surface: #181818;
    --billing-surface-muted: #202020;
    --billing-border: rgba(255, 255, 255, .09);
    --billing-text: #f2f3f5;
    --billing-secondary: #b0b5bd;
    --billing-muted: #7e858e;
    --billing-shadow: 0 10px 28px rgba(0, 0, 0, .22);

    .billing-hero {
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .025), var(--billing-shadow);
    }

    .plan-card {
      box-shadow: 0 4px 16px rgba(0, 0, 0, .16);

      &:hover {
        box-shadow: 0 10px 28px rgba(0, 0, 0, .24);
      }

      &.highlight {
        box-shadow: 0 8px 24px rgba(0, 0, 0, .22);
      }
    }

    .plan-action:not(.ant-btn-primary) {
      color: var(--billing-text);
      background: #202020;

      &:hover {
        border-color: var(--primary-color, #13c2c2);
        color: var(--primary-color, #13c2c2);
      }
    }
  }

  @media (max-width: 1080px) {
    .billing-hero {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .account-snapshot {
      display: grid;
      grid-template-columns: 1fr 1px 1fr;
      gap: 24px;
      padding: 22px 0 0;
      border-top: 1px solid var(--billing-border);
      border-left: 0;
    }

    .snapshot-divider {
      width: 1px;
      height: 100%;
      margin: 0;
    }

    .plans-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .library-entitlement {
      grid-template-columns: 1fr auto;
    }

    .library-entitlement-note {
      grid-column: 1 / -1;
      justify-self: start;
    }

    .plan-card:last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 700px) {
    padding: 16px 14px 36px;

    .billing-hero {
      min-height: auto;
      padding: 24px 20px;
      border-radius: 14px;
    }

    .library-entitlement {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      padding: 15px 16px;
    }

    .library-entitlement-copy {
      align-items: flex-start;
      flex-direction: column;
      gap: 5px;
    }

    .page-title {
      font-size: 24px;
    }

    .hero-rule {
      display: grid;
      gap: 4px;
    }

    .account-snapshot {
      display: flex;
      gap: 18px;
    }

    .snapshot-divider {
      width: 100%;
      height: 1px;
    }

    .plans-grid {
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .plan-card:last-child:nth-child(odd) {
      grid-column: auto;
    }

    .plan-card {
      min-height: 0;
      padding: 24px 22px;
      border-radius: 12px;
    }
  }
}

</style>

<style lang="less">
/* ===== Modal Wrapper ===== */
.payment-method-picker-wrap {
  .ant-modal-content {
    overflow: hidden;
    border-radius: 16px;
  }
  .ant-modal-header {
    padding: 20px 22px 12px;
    border-bottom: 0;
  }
  .ant-modal-title { font-size: 18px; font-weight: 800; }
  .ant-modal-body { padding: 0 22px 22px; }
  .payment-picker-intro {
    margin-bottom: 14px;
    color: rgba(0, 0, 0, 0.5);
    font-size: 13px;
  }
  .payment-methods { display: grid; gap: 12px; }
  .payment-method-card {
    width: 100%;
    min-height: 88px;
    padding: 14px 16px;
    border: 1px solid #e8ebf0;
    border-radius: 14px;
    background: #fff;
    color: rgba(0, 0, 0, 0.85);
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) 18px;
    align-items: center;
    gap: 14px;
    text-align: left;
    cursor: pointer;
    transition: border-color .2s, box-shadow .2s, transform .2s;
    &:hover {
      border-color: var(--primary-color, #52c41a);
      box-shadow: 0 8px 24px rgba(20, 30, 45, .09);
      transform: translateY(-1px);
    }
  }
  .payment-brand {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fa;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .04);
    svg { width: 34px; height: 34px; }
  }
  .method-stripe .payment-brand { background: #635bff; }
  .stripe-mark { color: #fff; font-size: 25px; font-weight: 900; font-style: italic; }
  .payment-method-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    strong { font-size: 15px; line-height: 1.3; }
    small { color: rgba(0, 0, 0, .48); font-size: 12px; line-height: 1.45; }
  }
  .payment-method-arrow { color: rgba(0, 0, 0, .28); }
  .card-brand-list { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
  .visa-chip { color: #1a1f71; font-size: 12px; font-weight: 900; font-style: italic; letter-spacing: -.04em; }
  .mastercard-chip {
    display: inline-flex; align-items: center; position: relative; padding-left: 18px;
    i { position: absolute; width: 13px; height: 13px; border-radius: 50%; left: 0; background: #eb001b; }
    i + i { left: 7px; background: rgba(247, 158, 27, .88); }
    b { color: rgba(0,0,0,.6); font-size: 10px; font-weight: 700; }
  }
  .stripe-chip { color: #635bff; font-size: 11px; font-weight: 800; }
}

body.dark .payment-method-picker-wrap,
body.realdark .payment-method-picker-wrap {
  .ant-modal-content, .ant-modal-header { background: #1c1c1c; }
  .ant-modal-title { color: rgba(255,255,255,.92); }
  .payment-picker-intro { color: rgba(255,255,255,.5); }
  .payment-method-card {
    background: #242424;
    border-color: rgba(255,255,255,.1);
    color: rgba(255,255,255,.92);
    &:hover { border-color: var(--primary-color, #52c41a); box-shadow: 0 8px 24px rgba(0,0,0,.35); }
  }
  .payment-brand { background: rgba(255,255,255,.07); box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }
  .method-stripe .payment-brand { background: #635bff; }
  .payment-method-copy small { color: rgba(255,255,255,.5); }
  .payment-method-arrow { color: rgba(255,255,255,.3); }
  .visa-chip { color: #7fa4ff; }
  .mastercard-chip b { color: rgba(255,255,255,.58); }
  .stripe-chip { color: #a8a4ff; }
}

.usdt-pay-modal-wrap {
  .ant-modal-header { display: none; }
  .ant-modal-body { padding: 0 !important; }
  .ant-modal-content { border-radius: 16px; overflow: hidden; }
}

/* ===== Checkout UI ===== */
.usdt-checkout {
  /* -- Header -- */
  .checkout-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: linear-gradient(135deg, #26A17B 0%, #1b8a6b 100%);
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      .stablecoin-logo {
        width: 40px; height: 40px; border-radius: 50%;
        background: rgba(255,255,255,0.18);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .header-text {
        .header-title { font-size: 16px; font-weight: 800; color: #fff; }
        .header-desc { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 2px; line-height: 1.4; }
      }
    }
    .close-btn {
      color: rgba(255,255,255,0.8) !important;
      font-size: 18px;
      &:hover { color: #fff !important; }
    }
  }

  &.currency-usdc {
    .checkout-header { background: linear-gradient(135deg, #2775ca 0%, #1557a0 100%); }
    .checkout-steps .step-item {
      .dot-pulse { background: rgba(39, 117, 202, .35); }
      .step-line.filled { background: #2775ca; }
      &.active .dot-inner { background: #2775ca; }
    }
  }

  /* -- Steps -- */
  .checkout-steps {
    display: flex;
    align-items: center;
    padding: 16px 24px 12px;
    .step-item {
      display: flex;
      align-items: center;
      gap: 6px;
      .step-dot {
        position: relative;
        width: 18px; height: 18px;
        display: flex; align-items: center; justify-content: center;
        .dot-inner {
          width: 10px; height: 10px; border-radius: 50%;
          background: #d9d9d9;
          transition: all 0.3s;
        }
        .dot-pulse {
          position: absolute;
          width: 18px; height: 18px; border-radius: 50%;
          background: rgba(38, 161, 123, 0.35);
          animation: pulse-ring 1.5s ease-out infinite;
        }
      }
      .step-label {
        font-size: 12px;
        color: rgba(0,0,0,0.35);
        font-weight: 500;
        white-space: nowrap;
        transition: all 0.3s;
      }
      .step-line {
        flex: 1;
        height: 2px;
        min-width: 30px;
        background: #e8e8e8;
        margin: 0 6px;
        border-radius: 1px;
        transition: all 0.3s;
        &.filled { background: #26A17B; }
      }
      &.active {
        .dot-inner { background: #26A17B; }
        .step-label { color: rgba(0,0,0,0.85); font-weight: 700; }
      }
      &.current {
        .dot-inner { background: #26A17B; box-shadow: 0 0 0 3px rgba(38, 161, 123, 0.2); }
      }
    }
  }

  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(1.8); opacity: 0; }
  }

  /* -- Body -- */
  .checkout-body {
    display: flex;
    gap: 20px;
    padding: 4px 24px 16px;

    .qr-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;

      .qr-frame {
        width: 180px; height: 180px;
        padding: 8px;
        border-radius: 14px;
        background: #fff;
        border: 2px solid #e8e8e8;
        display: flex; align-items: center; justify-content: center;
        position: relative;
        transition: border-color 0.4s;
        box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        img { width: 100%; height: 100%; border-radius: 8px; }
        &.qr-confirmed {
          border-color: #26A17B;
          &::after {
            content: '\2713';
            position: absolute;
            top: -10px; right: -10px;
            width: 28px; height: 28px;
            background: #26A17B;
            color: #fff;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; font-weight: 700;
            box-shadow: 0 2px 8px rgba(38,161,123,0.4);
          }
        }
      }

      .qr-amount {
        margin-top: 12px;
        display: flex;
        align-items: baseline;
        gap: 4px;
        .amt-number {
          font-size: 22px;
          font-weight: 900;
          color: rgba(0,0,0,0.88);
          letter-spacing: -0.5px;
        }
        .amt-currency {
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.45);
        }
      }

      .qr-chain {
        margin-top: 4px;
      }
    }

    .info-section {
      flex: 1;
      min-width: 0;

      .info-block {
        margin-bottom: 14px;
        .info-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: rgba(0,0,0,0.45); font-weight: 600;
          margin-bottom: 6px;
        }
      }

      .addr-box, .amt-box {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #f6f8fa;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        padding: 8px 10px;

        code {
          flex: 1;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
          font-size: 12px;
          color: rgba(0,0,0,0.78);
          word-break: break-all;
          line-height: 1.5;
          background: none;
          border: none;
          padding: 0;
        }

        .copy-btn {
          flex-shrink: 0;
          border: none;
          background: rgba(0,0,0,0.04);
          color: rgba(0,0,0,0.55);
          border-radius: 6px;
          &:hover {
            background: rgba(24, 144, 255, 0.08);
            color: var(--primary-color, #1890ff);
          }
        }
      }

      .warn-strip {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        background: rgba(250, 173, 20, 0.08);
        border: 1px solid rgba(250, 173, 20, 0.2);
        font-size: 12px;
        font-weight: 600;
        color: #d48806;
        margin-bottom: 14px;
      }

      .meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        .meta-expire {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: rgba(0,0,0,0.45);
        }
      }

      .expired-hint, .confirmed-hint {
        margin-top: 12px;
      }
    }
  }

  /* -- Footer -- */
  .checkout-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px 16px;
    border-top: 1px solid rgba(0,0,0,0.06);
  }
}

/* ===== Amount highlight =====
 * The whole amount string is rendered in the alert-red colour. The amount
 * is the order's on-chain identity (every digit matters, including the
 * trailing suffix), so we don't split the visual style across base/suffix
 * any more — users glance at the colour and immediately understand "this
 * is the number I must reproduce exactly". The amount-base / amount-suffix
 * spans are kept in the template only so the wrapping behaves nicely on
 * very small screens. */
.usdt-checkout {
  .qr-section .qr-amount .amt-number {
    .amt-base,
    .amt-suffix {
      color: #d4380d;
    }
  }
  .info-section .info-block {
    .info-sublabel {
      font-weight: 500;
      color: rgba(0,0,0,0.45);
      margin-left: 6px;
    }
  }
  .info-section .amt-box code {
    .amt-suffix-inline {
      color: #d4380d;
    }
    /* The "USDT" suffix stays muted so the eye locks onto the number. */
    .amt-currency-inline {
      color: rgba(0,0,0,0.45);
      font-weight: 600;
      margin-left: 4px;
    }
  }
  /* The whole amount code block is red too, not just the trailing span. */
  .info-section .amt-box code > span:first-child {
    color: #d4380d;
  }
}

/* ===== Chain Picker ===== */
.usdt-chain-picker-wrap {
  .ant-modal-content { border-radius: 12px; }
  .chain-picker-body {
    .chain-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .chain-option {
      border: 1.5px solid #e8e8e8;
      border-radius: 10px;
      padding: 12px 14px;
      cursor: pointer;
      transition: all 0.2s;
      background: #fff;
      &:hover {
        border-color: rgba(24, 144, 255, 0.5);
        background: rgba(24, 144, 255, 0.04);
      }
      &.selected {
        border-color: var(--primary-color, #1890ff);
        background: rgba(24, 144, 255, 0.06);
        box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
      }
      &.recommended {
        border-color: rgba(38, 161, 123, 0.4);
      }
      &.selected.recommended {
        border-color: var(--primary-color, #1890ff);
      }
      .chain-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .chain-name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        font-size: 14px;
        .chain-label { color: rgba(0,0,0,0.85); }
        .chain-badge { margin-left: 4px; font-weight: 500; }
      }
      .chain-fee {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        .fee-label { font-size: 11px; color: rgba(0,0,0,0.45); }
        .fee-value { font-size: 13px; font-weight: 700; color: rgba(0,0,0,0.85); }
      }
      .chain-sub {
        margin-top: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: rgba(0,0,0,0.55);
        .picked-icon { color: var(--primary-color, #1890ff); font-size: 14px; }
      }
    }
    .empty-chains { padding: 6px 0; }
    .picker-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 16px;
    }
  }
}

body.dark .usdt-chain-picker-wrap,
body.realdark .usdt-chain-picker-wrap {
  .ant-modal-content { background: #1c1c1c; }
  .chain-picker-body .chain-option {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.12);
    &:hover { background: rgba(24,144,255,0.08); border-color: rgba(64,169,255,0.55); }
    &.selected { background: rgba(24,144,255,0.14); border-color: var(--primary-color-hover, #40a9ff); }
    .chain-name .chain-label { color: rgba(255,255,255,0.9); }
    .chain-fee .fee-label { color: rgba(255,255,255,0.45); }
    .chain-fee .fee-value { color: rgba(255,255,255,0.9); }
    .chain-sub { color: rgba(255,255,255,0.55); }
  }
}

body.dark .usdt-checkout .qr-section .qr-amount .amt-number .amt-base,
body.realdark .usdt-checkout .qr-section .qr-amount .amt-number .amt-base,
body.dark .usdt-checkout .qr-section .qr-amount .amt-number .amt-suffix,
body.realdark .usdt-checkout .qr-section .qr-amount .amt-number .amt-suffix {
  color: #ff7875;
}
body.dark .usdt-checkout .info-section .amt-box code,
body.realdark .usdt-checkout .info-section .amt-box code,
body.dark .usdt-checkout .info-section .amt-box code > span:first-child,
body.realdark .usdt-checkout .info-section .amt-box code > span:first-child,
body.dark .usdt-checkout .info-section .amt-box code .amt-suffix-inline,
body.realdark .usdt-checkout .info-section .amt-box code .amt-suffix-inline {
  color: #ff7875;
}
body.dark .usdt-checkout .info-section .amt-box code .amt-currency-inline,
body.realdark .usdt-checkout .info-section .amt-box code .amt-currency-inline {
  color: rgba(255,255,255,0.45);
}
body.dark .usdt-checkout .info-section .info-block .info-sublabel,
body.realdark .usdt-checkout .info-section .info-block .info-sublabel {
  color: rgba(255,255,255,0.45);
}

/* ===== Mobile ===== */
@media (max-width: 560px) {
  .usdt-checkout .checkout-body {
    flex-direction: column;
    align-items: center;
    .info-section { width: 100%; }
  }
}

/* ===== Dark Theme for USDT modal portal (body.dark / body.realdark) ===== */
body.dark .usdt-pay-modal-wrap .ant-modal-content,
body.realdark .usdt-pay-modal-wrap .ant-modal-content {
  background: #1c1c1c;
}

body.dark .usdt-checkout,
body.realdark .usdt-checkout {
  .checkout-header {
    background: linear-gradient(135deg, #1a7a5a 0%, #145c45 100%);
  }
  &.currency-usdc .checkout-header {
    background: linear-gradient(135deg, #225f9f 0%, #164575 100%);
  }
  .checkout-steps {
    .step-item {
      .step-label { color: rgba(255,255,255,0.35); }
      .step-line { background: rgba(255,255,255,0.12); &.filled { background: #26A17B; } }
      &.active .step-label { color: rgba(255,255,255,0.9); }
      .dot-inner { background: rgba(255,255,255,0.2); }
      &.active .dot-inner { background: #26A17B; }
    }
  }
  .checkout-body {
    .qr-section {
      .qr-frame { background: #252525; border-color: rgba(255,255,255,0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
      .qr-amount .amt-number { color: rgba(255,255,255,0.9); }
      .qr-amount .amt-currency { color: rgba(255,255,255,0.5); }
    }
    .info-section {
      .info-block .info-label { color: rgba(255,255,255,0.5); }
      .addr-box, .amt-box {
        background: rgba(255,255,255,0.06);
        border-color: rgba(255,255,255,0.1);
        code { color: rgba(255,255,255,0.8); }
        .copy-btn {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.6);
          &:hover { background: rgba(24, 144, 255, 0.15); color: var(--primary-color-hover, #40a9ff); }
        }
      }
      .warn-strip {
        background: rgba(250, 173, 20, 0.1);
        border-color: rgba(250, 173, 20, 0.2);
        color: #faad14;
      }
      .meta-row .meta-expire { color: rgba(255,255,255,0.45); }
    }
  }
  .checkout-footer {
    border-top-color: rgba(255,255,255,0.08);
    .ant-btn:not(.ant-btn-primary) {
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.8);
      &:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.25); color: #fff; }
    }
  }
}
</style>
