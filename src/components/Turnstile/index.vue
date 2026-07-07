<template>
  <div class="turnstile-container" v-if="enabled">
    <div ref="turnstileRef" :id="containerId"></div>
    <div v-if="error" class="turnstile-error">
      {{ error }}
      <a @click="reset">{{ $t('user.security.retry') || 'Retry' }}</a>
    </div>
  </div>
</template>

<script>
let turnstileScriptLoaded = false
let turnstileScriptLoading = false
const turnstileCallbacks = []

function loadTurnstileScript () {
  return new Promise((resolve, reject) => {
    if (turnstileScriptLoaded) {
      resolve()
      return
    }

    turnstileCallbacks.push({ resolve, reject })

    if (turnstileScriptLoading) {
      return
    }

    turnstileScriptLoading = true

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true

    script.onload = () => {
      turnstileScriptLoaded = true
      turnstileCallbacks.forEach(cb => cb.resolve())
      turnstileCallbacks.length = 0
    }

    script.onerror = () => {
      turnstileScriptLoading = false
      turnstileCallbacks.forEach(cb => cb.reject(new Error('Failed to load Turnstile script')))
      turnstileCallbacks.length = 0
    }

    document.head.appendChild(script)
  })
}

export default {
  name: 'Turnstile',

  props: {
    siteKey: {
      type: String,
      default: ''
    },
    enabled: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      default: 'auto' // 'light', 'dark', 'auto'
    },
    size: {
      type: String,
      default: 'normal' // 'normal', 'compact'
    }
  },

  data () {
    return {
      widgetId: null,
      token: null,
      error: null,
      containerId: `turnstile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  },

  mounted () {
    if (this.enabled && this.siteKey) {
      this.initTurnstile()
    }
  },

  beforeDestroy () {
    this.cleanup()
  },

  watch: {
    siteKey (newVal) {
      if (newVal && this.enabled) {
        this.initTurnstile()
      }
    },
    enabled (newVal) {
      if (newVal && this.siteKey) {
        this.initTurnstile()
      } else {
        this.cleanup()
      }
    }
  },

  methods: {
    translate (key, fallback) {
      const value = this.$t ? this.$t(key) : ''
      return value && value !== key ? value : fallback
    },

    async initTurnstile () {
      try {
        await loadTurnstileScript()
        this.renderWidget()
      } catch (e) {
        this.error = this.translate('user.security.loadFailed', 'Failed to load verification')
        console.error('Turnstile init error:', e)
      }
    },

    renderWidget () {
      if (!window.turnstile || !this.$refs.turnstileRef) {
        return
      }

      // Clean up existing widget
      this.cleanup()

      this.widgetId = window.turnstile.render(this.$refs.turnstileRef, {
        sitekey: this.siteKey,
        theme: this.theme,
        size: this.size,
        callback: (token) => {
          this.token = token
          this.error = null
          this.$emit('success', token)
        },
        'error-callback': (code) => {
          this.token = null
          this.error = this.translate('user.security.verificationFailed', 'Verification failed')
          if (code) {
            console.warn('Turnstile verification error:', code)
          }
          this.$emit('error', code)
        },
        'expired-callback': () => {
          this.token = null
          this.$emit('expired')
        }
      })
    },

    reset () {
      this.token = null
      this.error = null
      if (window.turnstile && this.widgetId !== null) {
        window.turnstile.reset(this.widgetId)
      } else {
        this.renderWidget()
      }
    },

    getToken () {
      return this.token
    },

    cleanup () {
      if (window.turnstile && this.widgetId !== null) {
        try {
          window.turnstile.remove(this.widgetId)
        } catch (e) {
          // Ignore cleanup errors
        }
        this.widgetId = null
      }
    }
  }
}
</script>

<style lang="less" scoped>
.turnstile-container {
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  align-items: center;

  .turnstile-error {
    margin-top: 8px;
    color: #ff4d4f;
    font-size: 13px;

    a {
      margin-left: 8px;
      color: var(--primary-color, #1890ff);
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>
