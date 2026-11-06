<template>
  <div class="strategy-center qd-workspace-page qd-page-frame" :class="{ 'theme-dark': isDarkTheme }">
    <live-operations-table
      ref="operationsTable"
      :strategies="strategies"
      :loading="loading"
      :load-error="loadError"
      :refreshed-at="refreshedAt"
      :dark="isDarkTheme"
      :initial-strategy-id="initialStrategyId"
      :control-loading-id="controlLoadingId"
      @start="handleStart"
      @stop="handleStop"
      @edit="openEditLive"
      @delete="handleDelete"
      @refresh="loadStrategies"
      @open-workspace="openStrategyWorkspace"
      @ownership-reconciled="loadStrategies({ force: true })"
    />

    <live-strategy-editor
      v-if="editorOpen"
      :key="editorInstanceKey"
      :visible="editorOpen"
      :mode="editorMode"
      :strategy-id="editorStrategyId"
      :initial-config="$route.query"
      @close="closeLiveEditor"
      @saved="handleEditorSaved"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { deleteStrategy, getStrategyCommandStatus, getStrategyList, startStrategy, stopStrategy } from '@/api/strategy'
import { waitForStrategyCommand } from '@/utils/strategyCommandPolling'
import { strategyStopFeedback } from '@/utils/strategyStopFeedback'
import LiveOperationsTable from './components/LiveOperationsTable.vue'
import LiveStrategyEditor from './components/LiveStrategyEditor.vue'

export default {
  name: 'StrategyCenter',
  components: { LiveOperationsTable, LiveStrategyEditor },
  data () {
    return {
      strategies: [],
      loading: false,
      loadError: false,
      refreshedAt: '',
      refreshTimer: null,
      controlLoadingId: null,
      editorOpen: false,
      editorMode: '',
      editorStrategyId: null,
      editorInstanceKey: 0,
      editorRouteSignature: '',
      strategyLoadPromise: null,
      stopCommandTrackers: new Set()
    }
  },
  computed: {
    ...mapState({ navTheme: state => state.app.theme }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    initialStrategyId () {
      const value = Number(this.$route.query.strategyId || 0)
      return Number.isFinite(value) ? value : 0
    }
  },
  mounted () {
    this.loadStrategies()
    this.startRefreshTimer()
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    this.openEditorFromRoute()
  },
  activated () {
    this.startRefreshTimer()
    this.openEditorFromRoute()
  },
  deactivated () {
    this.stopRefreshTimer()
  },
  beforeDestroy () {
    this.stopRefreshTimer()
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  },
  watch: {
    '$route.fullPath' () {
      this.openEditorFromRoute()
    }
  },
  methods: {
    parseList (res) {
      if (!res || res.code !== 1 || !res.data) return []
      if (Array.isArray(res.data)) return res.data
      return []
    },
    async loadStrategies ({ force = false } = {}) {
      if (this.loading && this.strategyLoadPromise) {
        if (!force) return this.strategyLoadPromise
        await this.strategyLoadPromise
      }
      this.loading = true
      this.loadError = false
      const request = getStrategyList()
      const loadPromise = (async () => {
        try {
          const res = await request
          if (!res || res.code !== 1) throw new Error('STRATEGY_LIST_LOAD_FAILED')
          this.strategies = this.parseList(res)
          this.refreshedAt = new Date()
        } catch (error) {
          this.loadError = true
        } finally {
          if (this.strategyLoadPromise === loadPromise) {
            this.strategyLoadPromise = null
            this.loading = false
          }
        }
      })()
      this.strategyLoadPromise = loadPromise
      return loadPromise
    },
    async handleStart (strategy) {
      if (!strategy || !strategy.id || this.controlLoadingId) return
      this.controlLoadingId = strategy.id
      try {
        const res = await startStrategy(strategy.id)
        if (res && res.code === 1) {
          const status = String((res.data && res.data.status) || '')
          if (status === 'starting') {
            this.$message.info(this.$t('strategyV2.startQueued'))
          } else {
            this.$message.success(this.$t('trading-assistant.messages.startSuccess'))
          }
          await this.loadStrategies()
        } else {
          this.$message.error((res && res.msg) || this.$t('trading-assistant.messages.startFailed'))
        }
      } catch (error) {
        this.$message.error(error.backendMessage || error.message || this.$t('trading-assistant.messages.startFailed'))
      } finally {
        this.controlLoadingId = null
      }
    },
    async handleStop (strategy, options = {}) {
      if (!strategy || !strategy.id || this.controlLoadingId) return
      this.controlLoadingId = strategy.id
      const closePositions = Boolean(options && options.closePositions)
      try {
        const res = await stopStrategy(strategy.id, closePositions)
        const feedback = strategyStopFeedback(res, key => this.$t(key), closePositions)
        this.$message[feedback.level](feedback.message)
        const commandId = Number(res && res.data && res.data.command_id)
        if (res && res.data && res.data.status === 'stopping' && commandId > 0) {
          this.trackStopCommand(strategy.id, commandId, closePositions)
        }
      } catch (error) {
        const feedback = strategyStopFeedback(error.response && error.response.data, key => this.$t(key), closePositions)
        this.$message[feedback.level](feedback.message)
      } finally {
        await this.loadStrategies()
        this.controlLoadingId = null
      }
    },
    async trackStopCommand (strategyId, commandId, closePositions) {
      const trackerKey = `${strategyId}:${commandId}`
      if (this.stopCommandTrackers.has(trackerKey)) return
      this.stopCommandTrackers.add(trackerKey)
      try {
        let result = null
        try {
          result = await waitForStrategyCommand(
            () => getStrategyCommandStatus(strategyId, commandId)
          )
        } catch (error) {
          result = error && error.response && error.response.data
        }
        if (result) {
          const feedback = strategyStopFeedback(result, key => this.$t(key), closePositions)
          this.$message[feedback.level](feedback.message)
        }
        await this.loadStrategies({ force: true })
      } finally {
        this.stopCommandTrackers.delete(trackerKey)
      }
    },
    openCreateLive () {
      this.editorMode = 'create'
      this.editorStrategyId = null
      this.editorInstanceKey += 1
      this.editorOpen = true
    },
    openEditLive (strategy) {
      if (!strategy || !strategy.id) return
      this.editorMode = 'edit'
      this.editorStrategyId = Number(strategy.id)
      this.editorInstanceKey += 1
      this.editorOpen = true
    },
    openEditorFromRoute () {
      const mode = String(this.$route.query.mode || '')
      const sourceId = String(this.$route.query.sourceId || '')
      const strategyId = String(this.$route.query.strategyId || '')
      const signature = mode === 'create'
        ? `create:${sourceId}`
        : (mode === 'edit' && strategyId ? `edit:${strategyId}` : '')
      if (!signature) {
        this.editorRouteSignature = ''
        return
      }
      if (signature === this.editorRouteSignature && this.editorOpen) return
      this.editorRouteSignature = signature
      if (mode === 'create') {
        this.editorMode = 'create'
        this.editorStrategyId = null
        this.editorInstanceKey += 1
        this.editorOpen = true
        return
      }
      if (mode === 'edit' && this.$route.query.strategyId) {
        this.editorMode = 'edit'
        this.editorStrategyId = Number(this.$route.query.strategyId)
        this.editorInstanceKey += 1
        this.editorOpen = true
      }
    },
    closeLiveEditor () {
      this.editorOpen = false
      this.editorMode = ''
      this.editorStrategyId = null
      this.editorRouteSignature = ''
      this.clearEditorRouteState()
    },
    async handleEditorSaved (saved = {}) {
      const savedId = Number(saved.id || this.editorStrategyId || 0)
      this.closeLiveEditor()
      await this.loadStrategies({ force: true })
      if (!savedId) return
      await this.$nextTick()
      const savedStrategy = this.strategies.find(item => Number(item.id) === savedId)
      const operationsTable = this.$refs.operationsTable
      if (savedStrategy && operationsTable && typeof operationsTable.selectStrategy === 'function') {
        operationsTable.selectStrategy(savedStrategy)
      }
    },
    clearEditorRouteState () {
      if (!this.$route.query.mode) return
      const query = { ...this.$route.query }
      delete query.mode
      delete query.sourceId
      delete query.strategyId
      delete query.leverage
      this.$router.replace({ path: '/strategy-center', query }).catch(() => {})
    },
    async handleDelete (strategy) {
      if (!strategy || !strategy.id || this.controlLoadingId) return
      this.controlLoadingId = strategy.id
      try {
        const res = await deleteStrategy(strategy.id)
        if (res && res.code === 1) {
          this.$message.success(this.$t('trading-assistant.messages.deleteSuccess'))
          await this.loadStrategies()
        } else {
          this.$message.error(this.localizedBackendMessage(res && res.msg, 'trading-assistant.messages.deleteFailed'))
        }
      } catch (error) {
        this.$message.error(this.localizedBackendMessage(error && (error.backendMessage || error.message), 'trading-assistant.messages.deleteFailed'))
      } finally {
        this.controlLoadingId = null
      }
    },
    localizedBackendMessage (code, fallbackKey) {
      if (!code) return this.$t(fallbackKey)
      const translated = this.$t(code)
      return translated && translated !== code ? translated : code
    },
    openStrategyWorkspace () {
      this.openCreateLive()
    },
    startRefreshTimer () {
      if (this.refreshTimer) return
      this.refreshTimer = window.setInterval(() => {
        if (!document.hidden) this.loadStrategies()
      }, 5000)
    },
    stopRefreshTimer () {
      if (this.refreshTimer) window.clearInterval(this.refreshTimer)
      this.refreshTimer = null
    },
    handleVisibilityChange () {
      if (!document.hidden && this.refreshTimer) this.loadStrategies({ force: true })
    },
    formatTime (value) {
      if (!value) return '-'
      const date = value instanceof Date ? value : new Date(value)
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
    }
  }
}
</script>

<style lang="less" scoped>
.strategy-center {
  --sc-page: #f5f7f9;
  --sc-surface: #ffffff;
  --sc-surface-subtle: #f8fafb;
  --sc-surface-muted: #f1f4f7;
  --sc-border: #e1e6ec;
  --sc-border-soft: #ebeff3;
  --sc-text: #182230;
  --sc-heading: #111827;
  --sc-muted: #667085;
  --sc-subtle: #8a94a3;
  --sc-positive: #218653;
  --sc-negative: #d14f5a;
  --sc-warning: #b37816;
  --sc-radius-sm: 6px;
  --sc-radius-md: 8px;
  --sc-radius-lg: 10px;
  --sc-shadow: 0 8px 24px rgba(24, 34, 48, .05);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  min-height: 0;
  overflow: hidden;
  padding: 18px 20px 24px !important;
  background: var(--sc-page);
  color: var(--sc-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.strategy-center > .operations-workspace { flex: 1 1 auto; min-height: 0; }
.theme-dark {
  --sc-page: #080808;
  --sc-surface: #111111;
  --sc-surface-subtle: #151515;
  --sc-surface-muted: #181818;
  --sc-border: rgba(255, 255, 255, .1);
  --sc-border-soft: rgba(255, 255, 255, .07);
  --sc-text: #e4e7ec;
  --sc-heading: #f2f4f7;
  --sc-muted: #8f98a6;
  --sc-subtle: #6f7885;
  --sc-positive: #55bd7c;
  --sc-negative: #f06f79;
  --sc-warning: #d5a348;
  --sc-shadow: none;
  background: var(--sc-page);
  color: var(--sc-text);
}
@media (max-width: 720px) {
  .strategy-center { height: auto; min-height: calc(100vh - 64px); overflow: visible; padding: 12px !important; }
}
</style>
