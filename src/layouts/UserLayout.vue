<template>

  <div id="userLayout" :class="['user-layout-wrapper', isMobile && 'mobile']">
    <div class="container">
      <div class="fx-layer" aria-hidden="true">
        <div class="fx-gradient"></div>
        <div class="fx-grid"></div>
      </div>
      <div class="user-layout-lang">
        <select-lang class="select-lang-trigger" />
      </div>
      <div class="user-layout-content">
        <div class="top">
          <div class="header">
            <a href="/">
              <img :src="loginLogo" class="logo" :alt="brandConfig.app_name">
              <!-- <span class="title">{{ brandConfig.app_name }}</span> -->
            </a>
          </div>
          <!-- <div class="desc">
            {{ $t('layouts.userLayout.title') }}
          </div> -->
        </div>

        <div class="main-content">
          <router-view />
        </div>

        <div class="footer">
          <div class="copyright">
            {{ brandConfig.copyright }}
            <div style="width: 70%; text-align: center; margin-left: 15%; margin-top: 10px;">
              <a
                v-if="brandConfig.legal && brandConfig.legal.privacy_policy_url"
                :href="brandConfig.legal.privacy_policy_url"
                target="_blank"
                rel="noopener noreferrer"
                style="color: var(--primary-color, #1890ff); cursor: pointer;"
              >{{ $t('user.login.privacy.view') }}</a>
              <a v-else @click="toggleRisk" style="color: var(--primary-color, #1890ff); cursor: pointer;">
                {{ showRisk ? $t('user.login.privacy.collapse') : $t('user.login.privacy.view') }}
              </a>
              <div v-if="showRisk && !(brandConfig.legal && brandConfig.legal.privacy_policy_url)" style="margin-top: 10px; font-size: 12px; color: rgba(0,0,0,0.65); line-height: 1.6; text-align: left;">
                <div style="font-weight: 600; margin-bottom: 6px;">{{ $t('user.login.privacy.title') }}</div>
                {{ (brandConfig.legal && brandConfig.legal.privacy_policy_text) || $t('user.login.privacy.content') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { deviceMixin } from '@/store/device-mixin'
import SelectLang from '@/components/SelectLang'
import defaultLogo from '@/assets/logo.png'

export default {
  name: 'UserLayout',
  components: {
    SelectLang
  },
  mixins: [deviceMixin],
  data () {
    return {
      showRisk: false
    }
  },
  computed: {
    ...mapState({
      brandConfig: state => state.brand.config
    }),
    // Logo on the login / register screen: prefer the light-theme brand URL,
    // fall back to the bundled asset so the page never renders a broken image.
    loginLogo () {
      const remote = this.brandConfig && this.brandConfig.logos && this.brandConfig.logos.light
      return remote || defaultLogo
    }
  },
  methods: {
    toggleRisk () {
      this.showRisk = !this.showRisk
    }
  },
  mounted () {
    document.body.classList.add('userLayout')
  },
  beforeDestroy () {
    document.body.classList.remove('userLayout')
  }
}
</script>

<style lang="less" scoped>
#userLayout.user-layout-wrapper {
  height: 100%;

  &.mobile {
    .container {
      .main {
        max-width: 368px;
        width: 98%;
      }
    }
  }

  .container {
    width: 100%;
    min-height: 100%;
    background: #f0f2f5 url('@/assets/background.svg') no-repeat 50%;
    background-size: 100%;
    //padding: 50px 0 84px;
    position: relative;

    .fx-layer {
      position: absolute;
      inset: 0;
      overflow: hidden;
      z-index: 0;
      pointer-events: none;

      .fx-gradient {
        position: absolute;
        inset: -20% -20% -20% -20%;
        background: radial-gradient(1200px 600px at 10% 10%, rgba(78, 161, 255, 0.18), transparent 60%),
                    radial-gradient(900px 500px at 90% 20%, rgba(127, 92, 255, 0.18), transparent 60%),
                    radial-gradient(800px 500px at 30% 90%, rgba(0, 210, 170, 0.14), transparent 60%);
        filter: blur(20px);
        animation: fxFloat 18s ease-in-out infinite alternate;
        transform: translateZ(0);
      }

      .fx-grid {
        position: absolute;
        inset: 0;
        background-image: linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
        background-size: 44px 44px, 44px 44px;
        background-position: 0 0, 0 0;
        mix-blend-mode: overlay;
        animation: gridDrift 40s linear infinite;
      }
    }

    .user-layout-lang {
      width: 100%;
      height: 40px;
      line-height: 44px;
      text-align: right;

      .select-lang-trigger {
        cursor: pointer;
        padding: 12px;
        margin-right: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        vertical-align: middle;
      }
    }

    .user-layout-content {
      padding: 32px 0 24px;
      display: flex;
      flex-direction: column;
      min-height: calc(100vh - 40px);
      position: relative;
      z-index: 1;

      .top {
        text-align: center;

        .header {
          height: 56px;
          line-height: 56px;

          .badge {
            position: absolute;
            display: inline-block;
            line-height: 1;
            vertical-align: middle;
            margin-left: -12px;
            margin-top: -10px;
            opacity: 0.8;
          }

          .logo {
            width: 342px; // approx 3.8:1 when height ~90px, keep responsive
            max-width: 42vw;
            height: auto;
            vertical-align: middle;
            margin-right: 0;
            border-style: none;
          }

          .title {
            font-size: 33px;
            color: rgba(0, 0, 0, .85);
            font-family: Avenir, 'Helvetica Neue', Arial, Helvetica, sans-serif;
            font-weight: 600;
            position: relative;
            top: 2px;
          }
        }
        .desc {
          font-size: 14px;
          color: rgba(0, 0, 0, 0.45);
          margin-top: 12px;
          margin-bottom: 40px;
        }
      }

      .main {
        min-width: 320px;
        width: 480px;
        margin: 0 auto;
      }

      .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .footer {
        width: 100%;
        padding: 0 16px;
        margin-top: auto;
        margin-bottom: 16px;
        text-align: center;

        .links {
          margin-bottom: 8px;
          font-size: 14px;
          a {
            color: rgba(0, 0, 0, 0.45);
            transition: all 0.3s;
            &:not(:last-child) {
              margin-right: 40px;
            }
          }
        }
        .copyright {
          color: rgba(0, 0, 0, 0.45);
          font-size: 14px;
        }
      }
    }

    a {
      text-decoration: none;
    }

  }
}

@media (max-width: 576px) {
  #userLayout.user-layout-wrapper .container .user-layout-content .top .header .logo {
    width: 208px;
    max-width: 70vw;
    margin-top: 8px;
  }
  #userLayout.user-layout-wrapper .container .user-layout-content .main {
    width: 92vw;
  }
}

@keyframes fxFloat {
  0%   { transform: translate3d(-2%, -1%, 0) scale(1); }
  50%  { transform: translate3d(1%, 2%, 0) scale(1.02); }
  100% { transform: translate3d(3%, -2%, 0) scale(1.04); }
}

@keyframes gridDrift {
  0%   { background-position: 0 0, 0 0; transform: rotate(0deg); }
  50%  { background-position: 22px 22px, 22px 22px; }
  100% { background-position: 44px 44px, 44px 44px; transform: rotate(0.01turn); }
}
</style>
