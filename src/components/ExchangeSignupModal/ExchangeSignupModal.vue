<template>
  <a-modal
    :title="$t('profile.exchange.openAccountTitle')"
    :visible="visible"
    :wrap-class-name="modalWrapClass"
    :footer="null"
    width="720px"
    centered
    @cancel="handleCancel"
  >
    <div class="exchange-signup-modal">
      <div class="exchange-signup-promo">
        <a-icon type="gift" />
        <span>{{ $t('profile.exchange.openAccountPromo') }}</span>
      </div>
      <section class="signup-section" aria-labelledby="signup-section-title">
        <div class="signup-section-head">
          <h3 id="signup-section-title">{{ $t('profile.exchange.signupSectionCrypto') }}</h3>
          <span class="signup-section-tag">{{ $t('profile.exchange.signupTagApi') }}</span>
        </div>
        <p class="signup-section-desc">{{ $t('profile.exchange.signupSectionCryptoHint') }}</p>
        <div class="exchange-signup-grid">
          <button
            v-for="item in cryptoCards"
            :key="item.id"
            type="button"
            class="exchange-signup-card"
            :disabled="!item.signupUrl"
            @click="openSignupLink(item.signupUrl)"
          >
            <span class="exchange-signup-logo"><provider-logo :provider="item.id" :size="32" /></span>
            <span class="exchange-signup-name">{{ item.name }}</span>
            <span class="exchange-signup-action">
              {{ $t('profile.exchange.openAccountButton') }}
              <a-icon type="export" />
            </span>
          </button>
        </div>
      </section>
    </div>
  </a-modal>
</template>

<script>
import { CRYPTO_SIGNUP_CARDS } from '@/constants/exchangeSignupCards'
import ProviderLogo from '@/components/ProviderLogo/ProviderLogo.vue'

export default {
  name: 'ExchangeSignupModal',
  components: { ProviderLogo },
  props: {
    visible: { type: Boolean, default: false },
    isDarkTheme: { type: Boolean, default: false }
  },
  data () {
    return { cryptoCards: CRYPTO_SIGNUP_CARDS }
  },
  computed: {
    modalWrapClass () {
      const base = 'exchange-signup-wrap'
      return this.isDarkTheme ? `${base} ${base}--dark` : base
    }
  },
  methods: {
    handleCancel () {
      this.$emit('update:visible', false)
    },
    openSignupLink (url) {
      if (!url) return
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }
}
</script>

<style lang="less">
.ant-modal-wrap.exchange-signup-wrap {
  --signup-bg: #fff;
  --signup-surface: #f6f7f9;
  --signup-border: #e4e7eb;
  --signup-text: #243041;
  --signup-muted: #626c7b;
  --signup-hover: #f8f9fb;
  --signup-accent: var(--primary-color, #1890ff);

  &.exchange-signup-wrap--dark {
    --signup-bg: #181818;
    --signup-surface: #222222;
    --signup-border: #343434;
    --signup-text: #e0e6ed;
    --signup-muted: #a0abb8;
    --signup-hover: #242424;
  }

  .ant-modal { max-width: calc(100vw - 32px); padding-bottom: 0; }
  .ant-modal-content { background: var(--signup-bg); border: 1px solid var(--signup-border); border-radius: 12px; overflow: hidden; }
  .ant-modal-header { padding: 20px 24px; background: var(--signup-bg); border-bottom: 1px solid var(--signup-border); }
  .ant-modal-title { padding-right: 28px; color: var(--signup-text); font-size: 16px; line-height: 24px; font-weight: 600; }
  .ant-modal-close { color: var(--signup-muted); }
  .ant-modal-close-x { width: 64px; height: 64px; line-height: 64px; }
  .ant-modal-close:focus-visible { outline: 2px solid var(--signup-accent); outline-offset: -8px; }
  .ant-modal-body { padding: 24px; max-height: calc(100dvh - 128px); overflow-y: auto; }

  .exchange-signup-promo { display: flex; align-items: center; gap: 10px; padding: 12px 16px; margin-bottom: 24px; border-radius: 6px; background: var(--signup-surface); color: var(--signup-text); font-size: 13px; line-height: 20px; }
  .exchange-signup-promo .anticon { color: var(--signup-accent); font-size: 16px; flex-shrink: 0; }
  .signup-section-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
  .signup-section-head h3 { margin: 0; font-size: 14px; line-height: 20px; font-weight: 600; color: var(--signup-text); }
  .signup-section-tag { padding: 0 6px; border: 1px solid var(--signup-border); border-radius: 4px; font-size: 11px; line-height: 18px; color: var(--signup-muted); }
  .signup-section-desc { margin: 8px 0 16px; color: var(--signup-muted); font-size: 13px; line-height: 20px; }
  .exchange-signup-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .exchange-signup-card { display: flex; align-items: center; gap: 12px; width: 100%; min-width: 0; min-height: 80px; padding: 16px; border: 1px solid var(--signup-border); border-radius: 8px; background: var(--signup-bg); color: var(--signup-text); font: inherit; text-align: left; cursor: pointer; transition: background-color .15s, border-color .15s; }
  .exchange-signup-card:hover:not(:disabled) { border-color: var(--signup-accent); background: var(--signup-hover); }
  .exchange-signup-card:focus-visible { outline: 2px solid var(--signup-accent); outline-offset: 2px; }
  .exchange-signup-card:disabled { opacity: .45; cursor: not-allowed; }
  .exchange-signup-logo { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; flex-shrink: 0; border: 1px solid var(--signup-border); border-radius: 8px; background: #fff; }
  .exchange-signup-name { font-size: 14px; line-height: 20px; font-weight: 600; min-width: 0; overflow-wrap: anywhere; }
  .exchange-signup-action { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; color: var(--signup-muted); font-size: 12px; line-height: 20px; text-align: right; }
  .exchange-signup-action .anticon { font-size: 14px; flex-shrink: 0; }
  .exchange-signup-card:hover:not(:disabled) .exchange-signup-action, .exchange-signup-card:focus-visible .exchange-signup-action { color: var(--signup-accent); }

  @media (max-width: 600px) {
    .ant-modal-header { padding: 16px; }
    .ant-modal-close-x { width: 56px; height: 56px; line-height: 56px; }
    .ant-modal-body { padding: 16px; }
    .exchange-signup-promo { margin-bottom: 20px; padding: 12px; }
    .exchange-signup-grid { grid-template-columns: minmax(0, 1fr); gap: 8px; }
    .exchange-signup-card { min-height: 72px; padding: 12px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .exchange-signup-card { transition: none; }
  }
}
</style>
