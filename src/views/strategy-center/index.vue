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
          <a-icon type="code" /> {{ $t('strategyCenter.header.openIde') }}
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
          <span v-if="item.meta" class="sc-mini-stat-meta">{{ item.meta }}</span>
        </div>
        <button
          v-if="item.createPath"
          type="button"
          class="sc-mini-stat-create"
          @click.stop="go(item.createPath)"
        >
          <a-icon type="plus-circle" />
          <span>{{ $t('strategyCenter.stats.createLive') }}</span>
        </button>
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
import { getScriptSourceList, getStrategyList } from '@/api/strategy'
import DashboardOverview from '@/views/dashboard/index.vue'

export default {
  name: 'StrategyCenter',
  components: { DashboardOverview },
  data () {
    return {
      loadingStats: false,
      stats: {
        indicator: 0,
        strategySource: 0,
        signal: 0,
        signalRunning: 0,
        script: 0,
        scriptRunning: 0,
        bot: 0,
        botRunning: 0
      }
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
        {
          key: 'signal',
          icon: 'deployment-unit',
          value: this.stats.signal,
          label: this.$t('strategyCenter.stats.indicatorStrategy'),
          meta: this.runningTotalText(this.stats.signalRunning, this.stats.signal),
          path: '/strategy-live?tab=strategy',
          createPath: '/strategy-live?mode=create'
        },
        {
          key: 'script',
          icon: 'code-sandbox',
          value: this.stats.script,
          label: this.$t('strategyCenter.stats.script'),
          meta: this.runningTotalText(this.stats.scriptRunning, this.stats.script),
          path: '/strategy-script?tab=strategy',
          createPath: '/strategy-script?mode=create'
        },
        {
          key: 'bot',
          icon: 'robot',
          value: this.stats.bot,
          label: this.$t('strategyCenter.stats.bot'),
          meta: this.runningTotalText(this.stats.botRunning, this.stats.bot),
          path: '/trading-bot',
          createPath: '/trading-bot'
        },
        { key: 'indicator', icon: 'line-chart', value: this.stats.indicator, label: this.$t('strategyCenter.stats.ownIndicators'), path: '/strategy-ide' },
        { key: 'strategySource', icon: 'code', value: this.stats.strategySource, label: this.$t('strategyCenter.stats.ownStrategies'), path: '/strategy-ide?tab=script' }
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
    runningTotalText (running, total) {
      return this.$t('strategyCenter.stats.runningTotal', { running, total })
    },
    parseStrategyList (res) {
      if (!res || res.code !== 1 || !res.data) return []
      if (Array.isArray(res.data)) return res.data
      if (Array.isArray(res.data.strategies)) return res.data.strategies
      return []
    },
    parseScriptSourceList (res) {
      if (!res || res.code !== 1 || !res.data) return []
      if (Array.isArray(res.data)) return res.data
      if (Array.isArray(res.data.sources)) return res.data.sources
      if (Array.isArray(res.data.strategies)) return res.data.strategies
      if (Array.isArray(res.data.items)) return res.data.items
      return []
    },
    async loadStats () {
      this.loadingStats = true
      try {
        const [strRes, indRes, scriptSourceRes] = await Promise.all([
          getStrategyList(),
          request({ url: '/api/indicator/getIndicators', method: 'get' }).catch(() => ({ code: 0, data: [] })),
          getScriptSourceList().catch(() => ({ code: 0, data: [] }))
        ])
        const list = this.parseStrategyList(strRes)
        const signal = list.filter(s => this.strategyModeBucket(s) === 'signal')
        const script = list.filter(s => this.strategyModeBucket(s) === 'script')
        const bot = list.filter(s => this.strategyModeBucket(s) === 'bot')
        this.stats.signal = signal.length
        this.stats.signalRunning = signal.filter(this.isRunningStrategy).length
        this.stats.script = script.length
        this.stats.scriptRunning = script.filter(this.isRunningStrategy).length
        this.stats.bot = bot.length
        this.stats.botRunning = bot.filter(this.isRunningStrategy).length
        const inds = (indRes.code === 1 && Array.isArray(indRes.data)) ? indRes.data : []
        this.stats.indicator = inds.filter(i => Number(i.is_buy || 0) !== 1).length
        this.stats.strategySource = this.parseScriptSourceList(scriptSourceRes).length
      } finally {
        this.loadingStats = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
@sc-blue: var(--primary-color, #1677ff);
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
  background: var(--primary-color-soft, rgba(22, 119, 255, 0.1));
  border: 1px solid color-mix(in srgb, var(--primary-color, #1677ff) 18%, transparent);
  margin-bottom: 10px;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;

  &:hover,
  &:focus-visible {
    background: var(--primary-color-soft-strong, rgba(22, 119, 255, 0.16));
    border-color: color-mix(in srgb, var(--primary-color, #1677ff) 38%, transparent);
    box-shadow: 0 6px 18px color-mix(in srgb, var(--primary-color, #1677ff) 12%, transparent);
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
    background: linear-gradient(135deg, var(--primary-color, #1677ff) 0%, var(--primary-color-hover, #4096ff) 100%);
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
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 42px 16px 16px;
  background: #fff;
  border-radius: @sc-radius;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: @sc-shadow;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
    border-color: color-mix(in srgb, var(--primary-color, #1677ff) 25%, transparent);
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
  &--strategySource { background: rgba(47, 84, 235, 0.12); color: #2f54eb; }
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

.sc-mini-stat-meta {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.3;
  color: #64748b;
}

.sc-mini-stat-create {
  position: absolute;
  top: 10px;
  right: 34px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: calc(100% - 92px);
  height: 24px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--primary-color, #1677ff) 16%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary-color, #1677ff) 6%, transparent);
  color: @sc-blue;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:hover {
    border-color: color-mix(in srgb, var(--primary-color, #1677ff) 34%, transparent);
    background: var(--primary-color-soft, rgba(22, 119, 255, 0.1));
    color: var(--primary-color-active, #0958d9);
  }
}

.sc-mini-stat-arrow {
  position: absolute;
  right: 16px;
  bottom: 16px;
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
  .sc-mini-stat-meta { color: rgba(255, 255, 255, 0.55); }
  .sc-mini-stat-create {
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 24%, transparent);
    background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, transparent);
    color: var(--primary-color, #1890ff);

    &:hover {
      border-color: color-mix(in srgb, var(--primary-color, #1890ff) 42%, transparent);
      background: color-mix(in srgb, var(--primary-color, #1890ff) 14%, transparent);
      color: var(--primary-color-hover, #91caff);
    }
  }
}
</style>
