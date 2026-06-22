<template>
  <div class="strategy-center" :class="{ 'theme-dark': isDarkTheme }">
    <header class="sc-header">
      <div class="sc-header-main">
        <div
          class="sc-header-badge"
          role="button"
          tabindex="0"
          @click="go('/broker-accounts')"
          @keydown.enter.prevent="go('/broker-accounts')"
          @keydown.space.prevent="go('/broker-accounts')"
        >
          <a-icon type="cluster" />
          {{ $t('strategyCenter.header.badge') }}
        </div>
        <h1 class="sc-header-title">{{ $t('strategyCenter.title') }}</h1>
        <p class="sc-header-sub">{{ $t('strategyCenter.subtitle') }}</p>
      </div>
      <div class="sc-header-actions">
        <a-button type="primary" class="sc-action-btn sc-action-btn--primary" @click="go('/strategy-ide')">
          <a-icon type="code" /> {{ isZh ? '打开策略 IDE' : 'Open Strategy IDE' }}
        </a-button>
        <a-button class="sc-action-btn" @click="go('/trading-bot')">
          <a-icon type="robot" /> {{ $t('strategyCenter.header.createBot') }}
        </a-button>
      </div>
    </header>

    <div class="sc-mini-stats">
      <div v-for="item in miniStatItems" :key="item.key" class="sc-mini-stat" @click="item.path && go(item.path)">
        <span class="sc-mini-stat-icon" :class="`sc-mini-stat-icon--${item.key}`">
          <a-icon :type="item.icon" />
        </span>
        <div class="sc-mini-stat-body">
          <span class="sc-mini-stat-num">{{ item.value }}</span>
          <span class="sc-mini-stat-label">{{ item.label }}</span>
        </div>
        <a-icon v-if="item.path" type="right" class="sc-mini-stat-arrow" />
      </div>
    </div>

    <div class="sc-dashboard-wrap">
      <dashboard-overview hide-setup-guide embedded />
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import request from '@/utils/request'
import { getStrategyList } from '@/api/strategy'
import DashboardOverview from '@/views/dashboard/index.vue'

export default {
  name: 'StrategyCenter',
  components: { DashboardOverview },
  data () {
    return {
      loadingStats: false,
      stats: { indicator: 0, signal: 0, script: 0, bot: 0, running: 0 }
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    miniStatItems () {
      return [
        { key: 'running', icon: 'thunderbolt', value: this.stats.running, label: this.$t('strategyCenter.stats.running'), path: '/strategy-live?tab=strategy&status=running' },
        { key: 'signal', icon: 'deployment-unit', value: this.stats.signal, label: this.$t('strategyCenter.stats.indicatorStrategy'), path: '/strategy-live?tab=strategy' },
        { key: 'script', icon: 'code-sandbox', value: this.stats.script, label: this.$t('strategyCenter.stats.script'), path: '/strategy-script?tab=strategy' },
        { key: 'bot', icon: 'robot', value: this.stats.bot, label: this.$t('strategyCenter.stats.bot'), path: '/trading-bot' },
        { key: 'indicator', icon: 'line-chart', value: this.stats.indicator, label: this.$t('strategyCenter.stats.ownIndicators'), path: '/strategy-ide' }
      ]
    },
    isZh () {
      return String(this.$i18n && this.$i18n.locale || '').toLowerCase().startsWith('zh')
    }
  },
  watch: {
    '$route.query.tab' (tab) {
      this.syncTabFromRoute(tab)
    }
  },
  mounted () {
    this.syncTabFromRoute(this.$route.query.tab)
    this.loadStats()
  },
  methods: {
    syncTabFromRoute (tab) {
      const t = String(tab || '').toLowerCase()
      if (t === 'history' || t === 'workspace' || t === 'library') {
        this.$router.replace({ path: '/strategy-center', query: { tab: 'overview' } }).catch(() => {})
      }
    },
    go (path) {
      if (!path) return
      const qIdx = path.indexOf('?')
      if (qIdx > -1) {
        const routePath = path.slice(0, qIdx)
        const qs = new URLSearchParams(path.slice(qIdx + 1))
        const query = {}
        qs.forEach((v, k) => { query[k] = v })
        this.$router.push({ path: routePath, query }).catch(() => {})
      } else {
        this.$router.push(path).catch(() => {})
      }
    },
    strategyModeBucket (s) {
      const mode = String((s && s.strategy_mode) || '').trim().toLowerCase()
      if (mode === 'bot') return 'bot'
      if (mode === 'script') return 'script'
      return 'signal'
    },
    isRunningStrategy (s) {
      return String((s && s.status) || '').trim().toLowerCase() === 'running'
    },
    parseStrategyList (res) {
      if (!res || res.code !== 1 || !res.data) return []
      if (Array.isArray(res.data)) return res.data
      if (Array.isArray(res.data.strategies)) return res.data.strategies
      return []
    },
    async loadStats () {
      this.loadingStats = true
      try {
        const [strRes, indRes] = await Promise.all([
          getStrategyList(),
          request({ url: '/api/indicator/getIndicators', method: 'get' }).catch(() => ({ code: 0, data: [] }))
        ])
        const list = this.parseStrategyList(strRes)
        this.stats.signal = list.filter(s => this.strategyModeBucket(s) === 'signal').length
        this.stats.script = list.filter(s => this.strategyModeBucket(s) === 'script').length
        this.stats.bot = list.filter(s => this.strategyModeBucket(s) === 'bot').length
        this.stats.running = list.filter(s => this.isRunningStrategy(s)).length
        const inds = (indRes.code === 1 && Array.isArray(indRes.data)) ? indRes.data : []
        this.stats.indicator = inds.filter(i => Number(i.is_buy || 0) !== 1).length
      } finally {
        this.loadingStats = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
@sc-blue: #1677ff;
@sc-purple: #722ed1;
@sc-teal: #13c2c2;
@sc-radius: 14px;
@sc-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);

.strategy-center {
  min-height: calc(100vh - 120px);
  padding: 16px !important;
  background: linear-gradient(180deg, #f0f5ff 0%, #f5f7fa 38%, #f8fafc 100%);
}

.sc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.sc-header-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: @sc-blue;
  background: rgba(22, 119, 255, 0.1);
  border: 1px solid rgba(22, 119, 255, 0.18);
  margin-bottom: 10px;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;

  &:hover,
  &:focus-visible {
    background: rgba(22, 119, 255, 0.16);
    border-color: rgba(22, 119, 255, 0.38);
    box-shadow: 0 6px 18px rgba(22, 119, 255, 0.12);
    outline: none;
  }
}

.sc-header-title {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.sc-header-sub {
  margin: 0;
  max-width: 560px;
  font-size: 14px;
  line-height: 1.6;
  color: #64748b;
}

.sc-header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.sc-action-btn {
  height: 38px;
  border-radius: 10px;
  font-weight: 500;
  box-shadow: @sc-shadow;

  &--primary {
    background: linear-gradient(135deg, #1677ff 0%, #4096ff 100%);
    border: none;
  }
}

.sc-mini-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 20px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.sc-mini-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border-radius: @sc-radius;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: @sc-shadow;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
    border-color: rgba(22, 119, 255, 0.25);
  }
}

.sc-mini-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;

  &--running { background: rgba(82, 196, 26, 0.12); color: #52c41a; }
  &--signal { background: rgba(22, 119, 255, 0.12); color: @sc-blue; }
  &--script { background: rgba(114, 46, 209, 0.12); color: @sc-purple; }
  &--bot { background: rgba(19, 194, 194, 0.12); color: @sc-teal; }
  &--indicator { background: rgba(250, 173, 20, 0.12); color: #fa8c16; }
}

.sc-mini-stat-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sc-mini-stat-num {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
}

.sc-mini-stat-label {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.sc-mini-stat-arrow {
  color: #cbd5e1;
  font-size: 12px;
}

.sc-dashboard-wrap {
  margin: 0 -8px;
  border-radius: @sc-radius;
  overflow: hidden;

  ::v-deep .dashboard-pro.dashboard-pro--embedded {
    min-height: auto;
    padding: 0 8px 8px;
    background: transparent;
  }
}

.theme-dark {
  background: linear-gradient(180deg, #141414 0%, #1a1a1a 100%);

  .sc-header-title { color: rgba(255, 255, 255, 0.92); }
  .sc-header-sub { color: rgba(255, 255, 255, 0.45); }
  .sc-mini-stat {
    background: #1f1f1f;
    border-color: #303030;
  }
  .sc-mini-stat-num { color: rgba(255, 255, 255, 0.92); }
  .sc-mini-stat-label { color: rgba(255, 255, 255, 0.45); }
}
</style>
