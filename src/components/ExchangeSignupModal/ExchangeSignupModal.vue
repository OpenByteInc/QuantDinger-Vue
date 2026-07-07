<template>
  <a-modal
    :title="$t('profile.exchange.openAccountTitle')"
    :visible="visible"
    :wrap-class-name="modalWrapClass"
    :footer="null"
    width="860px"
    @cancel="handleCancel"
  >
    <div class="exchange-signup-modal">
      <div class="exchange-signup-promo">{{ $t('profile.exchange.openAccountPromo') }}</div>

      <section class="signup-section signup-section--crypto">
        <div class="signup-section-head">
          <div class="signup-section-icon signup-section-icon--crypto">
            <a-icon type="wallet" />
          </div>
          <div class="signup-section-text">
            <div class="signup-section-title">
              {{ $t('profile.exchange.signupSectionCrypto') }}
              <a-tag color="blue" class="signup-section-tag">{{ $t('profile.exchange.signupTagApi') }}</a-tag>
            </div>
            <div class="signup-section-desc">{{ $t('profile.exchange.signupSectionCryptoHint') }}</div>
          </div>
        </div>
        <div class="exchange-signup-grid">
          <div
            v-for="item in cryptoCards"
            :key="item.id"
            class="exchange-signup-card"
          >
            <div class="exchange-signup-card__header">
              <div class="exchange-signup-logo" :style="{ background: item.brandBg, color: item.brandColor }">
                {{ item.short }}
              </div>
              <div class="exchange-signup-meta">
                <div class="exchange-signup-name">{{ item.name }}</div>
              </div>
            </div>
            <div class="exchange-signup-actions">
              <a-button
                type="primary"
                block
                :disabled="!item.signupUrl"
                @click="openSignupLink(item.signupUrl)"
              >
                {{ $t('profile.exchange.openAccountButton') }}
              </a-button>
            </div>
          </div>
        </div>
      </section>

    </div>
  </a-modal>
</template>

<script>
import { CRYPTO_SIGNUP_CARDS } from '@/constants/exchangeSignupCards'

export default {
  name: 'ExchangeSignupModal',
  props: {
    visible: { type: Boolean, default: false },
    isDarkTheme: { type: Boolean, default: false }
  },
  data () {
    return {
      cryptoCards: CRYPTO_SIGNUP_CARDS
    }
  },
  computed: {
    modalWrapClass () {
      const base = 'profile-exchange-modal'
      return this.isDarkTheme ? `${base} ${base}--dark` : base
    }
  },
  methods: {
    handleCancel () {
      this.$emit('update:visible', false)
    },
    openSignupLink (url) {
      if (!url) return
      window.open(url, '_blank')
    }
  }
}
</script>

<style lang="less">
@exchange-dark-border: #2a2a2a;
@exchange-dark-title: #e0e6ed;
@exchange-dark-muted: rgba(255, 255, 255, 0.55);

.exchange-signup-modal {
  .exchange-signup-promo {
    margin-bottom: 20px;
    padding: 12px 14px;
    border-radius: 12px;
    background: linear-gradient(90deg, rgba(22, 119, 255, 0.12) 0%, rgba(99, 102, 241, 0.1) 100%);
    border: 1px solid rgba(22, 119, 255, 0.2);
    color: #1e40af;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.5;
    text-align: center;
  }

  .signup-section {
    margin-bottom: 4px;
  }

  .signup-section-head {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 14px;
  }

  .signup-section-icon {
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }

  .signup-section-icon--crypto {
    background: linear-gradient(135deg, rgba(24, 144, 255, 0.15) 0%, rgba(99, 102, 241, 0.12) 100%);
    color: #1677ff;
  }

  .signup-section-icon--forex {
    background: linear-gradient(135deg, rgba(82, 196, 26, 0.2) 0%, rgba(56, 158, 13, 0.12) 100%);
    color: #389e0d;
  }

  .signup-section-title {
    font-size: 15px;
    font-weight: 700;
    color: #1f2937;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    line-height: 1.4;
  }

  .signup-section-tag {
    margin: 0;
    font-size: 11px;
    line-height: 18px;
    border-radius: 4px;
  }

  .signup-section-desc {
    margin-top: 4px;
    font-size: 12px;
    color: #6b7280;
    line-height: 1.5;
  }

  .signup-section-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px 0 18px;
    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, #e5e7eb 20%, #e5e7eb 80%, transparent);
    }
  }

  .signup-section-divider-label {
    font-size: 11px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }

  .exchange-signup-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .exchange-signup-card {
    border: 1px solid #eef1f5;
    border-radius: 14px;
    padding: 14px;
    background: linear-gradient(180deg, #ffffff 0%, #fafcff 100%);
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
    transition: border-color 0.2s, box-shadow 0.2s;
    &:hover {
      border-color: rgba(24, 144, 255, 0.35);
      box-shadow: 0 8px 20px rgba(24, 144, 255, 0.08);
    }
  }

  .exchange-signup-card__header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .exchange-signup-logo {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
  }

  .exchange-signup-name {
    font-size: 15px;
    font-weight: 700;
    color: #1f2937;
  }

  .exchange-signup-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .forex-signup-banner {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 18px 18px 20px;
    border-radius: 16px;
    border: 1px solid rgba(0, 82, 155, 0.22);
    background: linear-gradient(105deg, rgba(230, 244, 255, 1) 0%, #ffffff 42%, #f5f9ff 100%);
    box-shadow: 0 8px 28px rgba(0, 82, 155, 0.08);
    overflow: hidden;
  }

  .forex-signup-banner__accent {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, var(--primary-color, #1890ff) 0%, #0052a3 100%);
    border-radius: 16px 0 0 16px;
  }

  .forex-signup-logo {
    flex: 0 0 52px;
    width: 52px;
    height: 52px;
    margin-left: 4px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .forex-signup-banner__body {
    flex: 1;
    min-width: 0;
  }

  .forex-signup-name {
    font-size: 17px;
    font-weight: 700;
    color: #003a8c;
  }

  .forex-signup-subtitle {
    margin-top: 2px;
    font-size: 13px;
    font-weight: 500;
    color: #6b7280;
  }

  .forex-signup-tags {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    .ant-tag {
      margin: 0;
      font-size: 11px;
    }
  }

  .forex-signup-note {
    margin-top: 8px;
    font-size: 12px;
    color: #6b7280;
    line-height: 1.45;
  }

  .forex-signup-banner__action {
    flex-shrink: 0;
  }

  .forex-signup-btn {
    height: 40px;
    padding: 0 20px;
    background: linear-gradient(135deg, var(--primary-color, #1890ff) 0%, #0052a3 100%);
    border: none;
    box-shadow: 0 4px 12px rgba(0, 82, 155, 0.25);
    &:hover,
    &:focus {
      background: linear-gradient(135deg, var(--primary-color-hover, #40a9ff) 0%, var(--primary-color, #1890ff) 100%);
    }
  }
}

@media (max-width: 640px) {
  .exchange-signup-modal {
    .exchange-signup-grid {
      grid-template-columns: 1fr;
    }
    .forex-signup-banner {
      flex-direction: column;
      align-items: stretch;
      text-align: center;
    }
    .forex-signup-banner__action .forex-signup-btn {
      width: 100%;
    }
    .forex-signup-logo {
      margin: 0 auto;
    }
    .forex-signup-tags {
      justify-content: center;
    }
  }
}

.profile-exchange-modal--dark {
  .exchange-signup-modal {
    .exchange-signup-promo {
      color: #93c5fd;
      background: linear-gradient(90deg, rgba(59, 130, 246, 0.18) 0%, rgba(99, 102, 241, 0.14) 100%);
      border-color: rgba(96, 165, 250, 0.35);
    }

    .signup-section-title {
      color: @exchange-dark-title;
    }

    .signup-section-desc,
    .forex-signup-note {
      color: @exchange-dark-muted;
    }

    .signup-section-divider::before,
    .signup-section-divider::after {
      background: linear-gradient(90deg, transparent, #303030 20%, #303030 80%, transparent);
    }

    .signup-section-divider-label {
      color: rgba(255, 255, 255, 0.4);
    }

    .exchange-signup-card {
      background: linear-gradient(180deg, #171717 0%, #1f1f1f 100%);
      border-color: @exchange-dark-border;
      box-shadow: none;
      &:hover {
        border-color: rgba(88, 166, 255, 0.4);
      }
    }

    .exchange-signup-name {
      color: @exchange-dark-title;
    }

    .forex-signup-banner {
      background: linear-gradient(105deg, rgba(22, 40, 18, 0.95) 0%, #1a1a1a 50%, #171717 100%);
      border-color: rgba(82, 196, 26, 0.35);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    .forex-signup-name {
      color: #69b1ff;
    }

    .forex-signup-subtitle {
      color: @exchange-dark-muted;
    }

    .forex-signup-banner {
      border-color: rgba(0, 82, 155, 0.4);
    }
  }
}
</style>
