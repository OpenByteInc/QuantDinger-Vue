<template>
  <div :class="footerCls">
    <global-footer class="footer custom-render">
      <template #links>
        <a
          v-if="brandConfig.legal && brandConfig.legal.user_agreement_url"
          :href="brandConfig.legal.user_agreement_url"
          target="_blank"
          rel="noopener noreferrer"
        >{{ $t('user.login.legal.title') }} {{ brandConfig.copyright }}</a>
        <a v-else @click="showLegal = true" style="cursor: pointer;">{{ $t('user.login.legal.title') }} {{ brandConfig.copyright }}</a>
      </template>
    </global-footer>

    <a-modal :visible="showLegal" :title="$t('user.login.legal.title')" :footer="null" @cancel="showLegal = false">
      <div :class="['legal-content', { 'legal-content-dark': isDarkTheme }]">
        {{ (brandConfig.legal && brandConfig.legal.user_agreement_text) || $t('user.login.legal.content') }}
      </div>
      <div style="margin-top: 12px; text-align: right;">
        <a-button type="primary" @click="showLegal = false">OK</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { GlobalFooter } from '@ant-design-vue/pro-layout'
import { baseMixin } from '@/store/app-mixin'

export default {
  name: 'ProGlobalFooter',
  components: {
    GlobalFooter
  },
  mixins: [baseMixin],
  data () {
    return {
      showLegal: false
    }
  },
  computed: {
    ...mapState({
      brandConfig: state => state.brand.config
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    footerCls () {
      return {
        'footer-wrapper': true,
        'footer-wrapper-dark': this.isDarkTheme
      }
    }
  }
}
</script>

<style lang="less">
.footer-wrapper {
  .ant-pro-global-footer {
    padding: 4px 16px 8px;
    margin: 0;
  }
  .ant-pro-global-footer-links {
    margin-bottom: 2px;
    padding: 0;
  }
  .ant-pro-global-footer-copyright {
    margin-top: 2px;
    padding: 0;
  }
}

.footer-wrapper {
  .ant-pro-global-footer {
    background: transparent !important;
    color: rgba(0, 0, 0, 0.65) !important;
  }

  .ant-pro-global-footer-links {
    a {
      color: rgba(0, 0, 0, 0.65) !important;

      &:hover {
        color: var(--primary-color, #1890ff) !important;
      }
    }
  }

  .ant-pro-global-footer-copyright {
    color: rgba(0, 0, 0, 0.65) !important;
  }
}

.legal-content {
  white-space: pre-wrap;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.85);
}

.footer-wrapper-dark {
  .ant-pro-global-footer {
    background: transparent !important;
    color: rgba(255, 255, 255, 0.65) !important;
    border-top: none !important;
  }

  .ant-pro-global-footer-links {
    a {
      color: rgba(255, 255, 255, 0.65) !important;

      &:hover {
        color: var(--primary-color, #1890ff) !important;
      }
    }
  }

  .ant-pro-global-footer-copyright {
    color: rgba(255, 255, 255, 0.65) !important;
  }

  .legal-content {
    color: rgba(255, 255, 255, 0.85) !important;
  }
}
</style>
