<template>
  <div class="strategy-ide-shell" :class="{ 'theme-dark': isDarkTheme }">
    <div class="strategy-ide-tabs">
      <a-tabs v-model="activeMode" :animated="false" size="large">
        <a-tab-pane key="indicator">
          <span slot="tab"><a-icon type="line-chart" /> {{ text.indicator }}</span>
          <indicator-ide />
        </a-tab-pane>

        <a-tab-pane key="script">
          <span slot="tab"><a-icon type="code" /> {{ text.script }}</span>

          <div class="script-workspace">
            <section class="script-panel script-panel--editor">
              <div class="panel-head">
                <div>
                  <div class="panel-title">
                    <a-icon type="code" />
                    <span>{{ text.codeTitle }}</span>
                    <a-tag v-if="scriptDraftStrategyId" color="blue">#{{ scriptDraftStrategyId }}</a-tag>
                  </div>
                  <div class="panel-desc">{{ text.codeDesc }}</div>
                </div>
                <div class="script-code-actions">
                  <a-select
                    v-model="selectedScriptId"
                    class="script-select"
                    show-search
                    allow-clear
                    option-filter-prop="children"
                    :loading="loadingScripts"
                    :placeholder="text.selectScriptPlaceholder"
                    @change="handleScriptSelect"
                  >
                    <a-select-option
                      v-for="item in scriptStrategyOptions"
                      :key="String(item.id)"
                      :value="String(item.id)"
                    >
                      {{ item.optionLabel }}
                    </a-select-option>
                  </a-select>
                  <a-tooltip :title="text.newScript">
                    <a-button class="ide-icon-btn" @click="newScriptDraft">
                      <a-icon type="plus" />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip :title="text.refreshScripts">
                    <a-button class="ide-icon-btn" :loading="loadingScripts" @click="loadScriptStrategies">
                      <a-icon type="reload" />
                    </a-button>
                  </a-tooltip>
                  <span class="action-divider"></span>
                  <a-input
                    v-model="scriptName"
                    class="save-inline__input"
                    :placeholder="text.strategyNamePlaceholder"
                  />
                  <a-tooltip :title="scriptDraftStrategyId ? text.updateScript : text.saveScript">
                    <a-button
                    class="ide-icon-btn"
                    type="primary"
                    :loading="savingScript"
                    @click="saveScriptStrategy(false)"
                    >
                      <a-icon type="save" />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip v-if="scriptDraftStrategyId" :title="text.saveAsNew">
                    <a-button
                      class="ide-icon-btn"
                      :loading="savingScript"
                      @click="saveScriptStrategy(true)"
                    >
                      <a-icon type="copy" />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip v-if="scriptDraftStrategyId" :title="text.publishScript">
                    <a-button
                      class="ide-icon-btn"
                      :loading="savingScript || publishingScript"
                      @click="openPublishScriptModal"
                    >
                      <a-icon type="shop" />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip v-if="scriptDraftStrategyId" :title="text.deleteScript">
                    <a-button
                      class="ide-icon-btn ide-icon-btn--danger"
                      :loading="savingScript"
                      @click="deleteCurrentScriptSource"
                    >
                      <a-icon type="delete" />
                    </a-button>
                  </a-tooltip>
                </div>
              </div>

              <strategy-editor
                ref="scriptEditor"
                :key="scriptEditorKey"
                v-model="scriptCode"
                :is-dark="isDarkTheme"
                :visible="activeMode === 'script'"
                :user-id="userId"
                :strategy-id="scriptDraftStrategyId"
                :initial-template-key="editorInitialTemplateKey"
                @verified="scriptVerified = true"
                @template-change="onScriptTemplateChange"
              />
            </section>

            <section class="script-panel script-panel--backtest">
              <div class="panel-head">
                <div>
                  <div class="panel-title">
                    <a-icon type="experiment" />
                    <span>{{ text.backtestTitle }}</span>
                  </div>
                  <div class="panel-desc">{{ text.backtestDesc }}</div>
                </div>
                <a-tag v-if="scriptDraftStrategyId" color="green">{{ text.draftReady }}</a-tag>
              </div>

              <div class="run-config-grid">
                <div class="run-section run-section--target">
                  <div class="run-section__title">
                    <a-icon type="star" />
                    <span>{{ text.runTarget }}</span>
                  </div>
                  <div class="run-field run-field--wide">
                    <label>{{ text.watchlistSymbol }}</label>
                    <a-select
                      v-model="selectedWatchKey"
                      class="run-control run-control--symbol"
                      show-search
                      option-filter-prop="children"
                      :loading="loadingWatchlist"
                      :placeholder="text.watchlistPlaceholder"
                      @change="onWatchSymbolChange"
                    >
                      <a-select-option
                        v-for="item in watchlistOptions"
                        :key="item.value"
                        :value="item.value"
                      >
                        {{ item.label }}
                      </a-select-option>
                    </a-select>
                  </div>
                  <div class="target-summary">
                    <a-tag color="blue">{{ marketLabel(runForm.marketCategory) }}</a-tag>
                    <strong>{{ runForm.symbol || text.noSymbol }}</strong>
                    <span v-if="selectedWatchItem && selectedWatchItem.name">{{ selectedWatchItem.name }}</span>
                  </div>
                  <div class="run-field">
                    <label>{{ text.timeframe }}</label>
                    <a-select v-model="runForm.timeframe" class="run-control run-control--timeframe">
                      <a-select-option value="1m">1m</a-select-option>
                      <a-select-option value="5m">5m</a-select-option>
                      <a-select-option value="15m">15m</a-select-option>
                      <a-select-option value="30m">30m</a-select-option>
                      <a-select-option value="1H">1H</a-select-option>
                      <a-select-option value="4H">4H</a-select-option>
                      <a-select-option value="1D">1D</a-select-option>
                      <a-select-option value="1W">1W</a-select-option>
                    </a-select>
                  </div>
                </div>

                <div class="run-section">
                  <div class="run-section__title">
                    <a-icon type="wallet" />
                    <span>{{ text.accountDirection }}</span>
                  </div>
                  <div class="run-form-grid">
                    <div v-if="supportsSwap" class="run-field">
                      <label>{{ text.marketType }}</label>
                      <a-radio-group v-model="runForm.marketType" button-style="solid" class="run-segment">
                        <a-radio-button value="spot">{{ text.spot }}</a-radio-button>
                        <a-radio-button value="swap" :disabled="!supportsSwap">{{ text.swap }}</a-radio-button>
                      </a-radio-group>
                    </div>
                    <div class="run-field">
                      <label>{{ text.direction }}</label>
                      <a-radio-group v-model="runForm.tradeDirection" button-style="solid" class="run-segment">
                        <a-radio-button value="long">{{ text.long }}</a-radio-button>
                        <a-radio-button value="short" :disabled="runForm.marketType === 'spot' || !supportsSwap">{{ text.short }}</a-radio-button>
                        <a-radio-button value="both" :disabled="runForm.marketType === 'spot' || !supportsSwap">{{ text.both }}</a-radio-button>
                      </a-radio-group>
                    </div>
                    <div class="run-field">
                      <label>{{ text.initialCapital }}</label>
                      <a-input-number
                        v-model="runForm.initialCapital"
                        :min="100"
                        :step="1000"
                        :precision="2"
                        style="width: 100%"
                      />
                    </div>
                    <div class="run-field">
                      <label>{{ text.leverage }}</label>
                      <a-input-number
                        v-model="runForm.leverage"
                        :min="1"
                        :max="125"
                        :step="1"
                        :disabled="runForm.marketType === 'spot' || !supportsSwap"
                        style="width: 100%"
                      />
                    </div>
                  </div>
                </div>

                <div class="run-field run-field--note">
                  <a-icon type="info-circle" />
                  <span>{{ text.runNote }}</span>
                </div>
              </div>

              <strategy-backtest-panel
                ref="scriptBacktestPanel"
                :strategy-id="null"
                :script-source-id="scriptDraftStrategyId"
                :strategy="scriptBacktestStrategy"
                :is-dark="isDarkTheme"
                :prepare-run="prepareScriptBacktest"
                class="script-backtest-panel"
                @backtested="loadScriptStrategies"
              />
            </section>
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>

    <a-modal
      :title="text.publishModalTitle"
      :visible="showPublishModal"
      :confirmLoading="publishingScript"
      :ok-text="text.publishConfirm"
      :cancel-text="text.cancel"
      :wrap-class-name="isDarkTheme ? 'script-publish-modal script-publish-modal--dark' : 'script-publish-modal'"
      @ok="confirmPublishScriptSource"
      @cancel="closePublishScriptModal"
    >
      <a-alert type="info" show-icon :message="text.publishHint" style="margin-bottom: 16px" />
      <div class="publish-form">
        <label class="field-label">{{ text.publishName }}</label>
        <a-input v-model="publishForm.name" :placeholder="text.publishNamePlaceholder" />

        <label class="field-label field-label--spaced">{{ text.publishPricingType }}</label>
        <a-radio-group v-model="publishForm.pricingType">
          <a-radio value="free">{{ text.publishFree }}</a-radio>
          <a-radio value="paid">{{ text.publishPaid }}</a-radio>
        </a-radio-group>

        <div v-if="publishForm.pricingType === 'paid'" class="publish-field">
          <label class="field-label">{{ text.publishPrice }}</label>
          <a-input-number v-model="publishForm.price" :min="0" :precision="2" style="width: 100%" />
        </div>

        <label class="field-label field-label--spaced">{{ text.publishDescription }}</label>
        <a-textarea
          v-model="publishForm.description"
          :rows="4"
          :placeholder="text.publishDescriptionPlaceholder"
        />
      </div>
    </a-modal>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import IndicatorIde from '@/views/indicator-ide'
import StrategyEditor from '@/views/trading-assistant/components/StrategyEditor.vue'
import StrategyBacktestPanel from '@/components/StrategyBacktestPanel.vue'
import {
  createScriptSource,
  deleteScriptSource,
  getScriptSourceDetail,
  getScriptSourceList,
  publishScriptSource,
  updateScriptSource
} from '@/api/strategy'
import { getWatchlist } from '@/api/market'

const DEFAULT_SCRIPT_CODE = `"""
My Custom Strategy
"""

def on_init(ctx):
    # Initialize strategy parameters via ctx.param('name', default)
    pass

def on_bar(ctx, bar):
    # Core trading logic, called on each K-line bar
    # bar: { open, high, low, close, volume, timestamp }
    pass
`

export default {
  name: 'StrategyIDE',
  components: { IndicatorIde, StrategyEditor, StrategyBacktestPanel },
  data () {
    return {
      activeMode: 'indicator',
      loadingScripts: false,
      scriptStrategies: [],
      selectedScriptId: undefined,
      scriptCode: DEFAULT_SCRIPT_CODE,
      scriptName: '',
      scriptTemplateKey: '',
      editorInitialTemplateKey: '',
      scriptEditorKeySeed: 0,
      scriptVerified: false,
      savingScript: false,
      publishingScript: false,
      showPublishModal: false,
      publishForm: {
        name: '',
        description: '',
        pricingType: 'free',
        price: 0
      },
      preparingBacktest: false,
      scriptDraftStrategyId: null,
      scriptRuntimeStrategyId: null,
      scriptDraftStrategy: null,
      lastSavedScriptSnapshot: '',
      loadingWatchlist: false,
      selectedWatchKey: '',
      watchlist: [],
      runForm: {
        marketCategory: 'Crypto',
        symbol: 'BTC/USDT',
        timeframe: '15m',
        marketType: 'spot',
        tradeDirection: 'long',
        initialCapital: 10000,
        leverage: 1
      }
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      const body = typeof document !== 'undefined' ? document.body : null
      return this.navTheme === 'dark' ||
        this.navTheme === 'realdark' ||
        !!(body && (body.classList.contains('dark') || body.classList.contains('realdark')))
    },
    isZh () {
      return String((this.$i18n && this.$i18n.locale) || '').toLowerCase().startsWith('zh')
    },
    userId () {
      const userInfo = this.$store && this.$store.getters && this.$store.getters.userInfo
      return (userInfo && userInfo.id) || 1
    },
    scriptStrategyOptions () {
      return (this.scriptStrategies || []).map(item => {
        const id = item.id || item.source_id || item.sourceId
        const pieces = [item.name || item.strategy_name || `Script #${id}`]
        return {
          ...item,
          id,
          optionLabel: pieces.join(' - ')
        }
      })
    },
    watchlistOptions () {
      const list = (this.watchlist || []).map(item => {
        const market = this.normalizeMarket(item.market || item.market_category || 'Crypto')
        const symbol = String(item.symbol || '').trim()
        if (!symbol) return null
        const name = String(item.name || item.display_name || '').trim()
        const value = `${market}:${symbol}`
        const label = name
          ? `${symbol} - ${name} - ${this.marketLabel(market)}`
          : `${symbol} - ${this.marketLabel(market)}`
        return { ...item, market, symbol, name, value, label }
      }).filter(Boolean)
      if (!list.length && this.runForm.symbol) {
        const market = this.runForm.marketCategory || 'Crypto'
        const symbol = this.runForm.symbol
        return [{ market, symbol, name: '', value: `${market}:${symbol}`, label: `${symbol} - ${this.marketLabel(market)}` }]
      }
      return list
    },
    selectedWatchItem () {
      return (this.watchlistOptions || []).find(item => item.value === this.selectedWatchKey) || null
    },
    supportsSwap () {
      return String(this.runForm.marketCategory || '') === 'Crypto'
    },
    scriptBacktestStrategy () {
      return {
        id: null,
        strategy_name: this.deriveScriptName(),
        strategy_type: 'ScriptStrategy',
        strategy_mode: 'script',
        strategy_code: '',
        market_category: this.runForm.marketCategory || 'Crypto',
        status: 'draft',
        trading_config: {
          ...this.buildTradingConfig(),
          script_source_id: this.scriptDraftStrategyId ? Number(this.scriptDraftStrategyId) : null
        }
      }
    },
    scriptEditorKey () {
      return `script-editor-${this.selectedScriptId || 'new'}-${this.scriptEditorKeySeed}`
    },
    text () {
      const zh = {
        indicator: '指标策略',
        script: '脚本策略',
        libraryTitle: '脚本源码库',
        libraryDesc: '在这里切换、编辑、回测和发布脚本源码。标的、周期、资金和方向属于本次回测或实盘运行配置。',
        selectScriptPlaceholder: '选择已保存脚本源码',
        newScript: '新建脚本',
        codeTitle: '策略代码',
        codeDesc: '这里只保存脚本逻辑。运行标的、周期、资金、账户和通知在回测或实盘启动时选择。',
        backtestTitle: '脚本回测',
        backtestDesc: '从自选标的发起回测，市场自动识别；K 线输入周期会作为 on_bar 的数据粒度。',
        strategyNamePlaceholder: '可选策略名，留空自动生成',
        saveScript: '保存脚本',
        updateScript: '更新脚本',
        saveAsNew: '另存为新脚本',
        publishScript: '发布到市场',
        deleteScript: '删除',
        refreshScripts: '刷新脚本列表',
        deleteConfirmTitle: '删除脚本源码？',
        deleteConfirmDesc: '删除后不会删除已创建的实盘策略，但这些策略如果仍引用该源码将无法继续回测或运行。',
        deleteSuccess: '脚本源码已删除',
        deleteFailed: '删除脚本源码失败',
        publishSuccess: '已提交到策略市场',
        publishFailed: '发布脚本源码失败',
        publishModalTitle: '发布脚本源码到市场',
        publishConfirm: '确认发布',
        cancel: '取消',
        publishHint: '发布后用户购买的是脚本源码，可以再用该源码创建自己的策略实例。',
        publishName: '市场展示名称',
        publishNamePlaceholder: '例如 BTC 趋势跟随脚本',
        publishPricingType: '价格类型',
        publishFree: '免费',
        publishPaid: '付费',
        publishPrice: '价格',
        publishDescription: '策略说明',
        publishDescriptionPlaceholder: '说明适用市场、核心逻辑、风险边界和建议用法',
        priceRequired: '付费发布需要填写大于 0 的价格',
        draftReady: '已选择脚本',
        runTarget: '本次运行标的',
        watchlistSymbol: '自选标的',
        watchlistPlaceholder: '从自选列表选择标的',
        noSymbol: '未选择标的',
        accountDirection: '账户与方向',
        timeframe: 'K 线输入周期',
        marketType: '市场类型',
        spot: '现货',
        swap: '合约',
        direction: '交易方向',
        long: '做多',
        short: '做空',
        both: '双向',
        initialCapital: '初始资金',
        leverage: '杠杆',
        runNote: '运行回测时会先同步当前脚本源码；实盘账户、通知、风控和仓位参数仍在策略实盘页绑定。',
        codeRequired: '请先编写脚本策略代码',
        symbolRequired: '请选择回测标的',
        saveSuccess: '脚本源码已保存',
        saveFailed: '保存脚本源码失败',
        preparing: '正在同步脚本源码...',
        loadScriptsFailed: '加载脚本源码列表失败',
        loadScriptFailed: '加载脚本源码失败',
        runningEditBlocked: '策略正在运行，请先停止后再修改代码',
        autoNameSuffix: '脚本源码',
        defaultName: '未命名脚本'
      }
      const en = {
        indicator: 'Indicator Strategy',
        script: 'Script Strategy',
        libraryTitle: 'Script Source Library',
        libraryDesc: 'Switch, edit, backtest, and publish script source here. Symbol, timeframe, capital, and direction are run settings.',
        selectScriptPlaceholder: 'Select a saved script source',
        newScript: 'New Script',
        codeTitle: 'Strategy Code',
        codeDesc: 'Save only script logic here. Choose symbol, timeframe, capital, account, and notifications when backtesting or going live.',
        backtestTitle: 'Script Backtest',
        backtestDesc: 'Choose a watchlist symbol for this run. Market is inferred automatically; timeframe is the bar feed for on_bar.',
        strategyNamePlaceholder: 'Optional name, auto-generated if empty',
        saveScript: 'Save Script',
        updateScript: 'Update Script',
        saveAsNew: 'Save as New',
        publishScript: 'Publish',
        deleteScript: 'Delete',
        refreshScripts: 'Refresh scripts',
        deleteConfirmTitle: 'Delete script source?',
        deleteConfirmDesc: 'Existing live strategies are not deleted, but strategies still referencing this source will no longer backtest or run.',
        deleteSuccess: 'Script source deleted',
        deleteFailed: 'Failed to delete script source',
        publishSuccess: 'Submitted to marketplace',
        publishFailed: 'Failed to publish script source',
        publishModalTitle: 'Publish Script Source',
        publishConfirm: 'Publish',
        cancel: 'Cancel',
        publishHint: 'Buyers receive the script source and can create their own strategy instance from it.',
        publishName: 'Marketplace Name',
        publishNamePlaceholder: 'Example: BTC Trend Script',
        publishPricingType: 'Pricing',
        publishFree: 'Free',
        publishPaid: 'Paid',
        publishPrice: 'Price',
        publishDescription: 'Description',
        publishDescriptionPlaceholder: 'Describe supported markets, core logic, risk limits, and suggested usage',
        priceRequired: 'Paid publishing requires a price greater than 0',
        draftReady: 'Script selected',
        runTarget: 'Run Target',
        watchlistSymbol: 'Watchlist Symbol',
        watchlistPlaceholder: 'Select from watchlist',
        noSymbol: 'No symbol selected',
        accountDirection: 'Account & Direction',
        timeframe: 'K-line Feed',
        marketType: 'Market Type',
        spot: 'Spot',
        swap: 'Swap',
        direction: 'Direction',
        long: 'Long',
        short: 'Short',
        both: 'Both',
        initialCapital: 'Initial Capital',
        leverage: 'Leverage',
        runNote: 'Backtest syncs the current script source first. Live account, notifications, risk, and sizing remain bound in Strategy Live.',
        codeRequired: 'Write script strategy code first',
        symbolRequired: 'Select a backtest symbol',
        saveSuccess: 'Script source saved',
        saveFailed: 'Failed to save script source',
        preparing: 'Syncing script source...',
        loadScriptsFailed: 'Failed to load script sources',
        loadScriptFailed: 'Failed to load script source',
        runningEditBlocked: 'Stop the running strategy before editing its code',
        autoNameSuffix: 'Script Source',
        defaultName: 'Untitled Script'
      }
      return this.isZh ? zh : en
    }
  },
  mounted () {
    const tab = String((this.$route.query && this.$route.query.tab) || '').toLowerCase()
    if (tab === 'script') this.activeMode = 'script'
    const template = String((this.$route.query && this.$route.query.template) || '').trim()
    if (template) {
      this.scriptTemplateKey = template
      this.editorInitialTemplateKey = template
    }
    this.loadWatchlist()
    this.loadScriptStrategies()
  },
  watch: {
    activeMode (mode) {
      const query = { ...(this.$route.query || {}) }
      if (mode === 'script') query.tab = 'script'
      else delete query.tab
      this.$router.replace({ path: '/strategy-ide', query }).catch(() => {})
    },
    '$route.query.source_id' (id) {
      if (id && String(id) !== String(this.selectedScriptId || '')) {
        this.selectedScriptId = String(id)
        this.handleScriptSelect(this.selectedScriptId)
      }
    },
    'runForm.marketType' (value) {
      if (value === 'spot') {
        this.runForm.tradeDirection = 'long'
        this.runForm.leverage = 1
      }
    },
    'runForm.marketCategory' () {
      if (!this.supportsSwap) {
        this.runForm.marketType = 'spot'
        this.runForm.tradeDirection = 'long'
        this.runForm.leverage = 1
      }
    }
  },
  methods: {
    marketLabel (market) {
      const key = String(market || '').trim()
      const labels = {
        Crypto: this.isZh ? '加密货币' : 'Crypto',
        USStock: this.isZh ? '美股' : 'US Stocks',
        CNStock: this.isZh ? 'A 股' : 'China A-Shares',
        HKStock: this.isZh ? 'H 股' : 'Hong Kong Stocks',
        Forex: this.isZh ? '外汇' : 'Forex',
        Futures: this.isZh ? '期货' : 'Futures',
        MOEX: 'MOEX'
      }
      return labels[key] || key || (this.isZh ? '未知市场' : 'Unknown')
    },
    normalizeMarket (market) {
      const raw = String(market || 'Crypto').trim()
      const aliases = {
        crypto: 'Crypto',
        usstock: 'USStock',
        usstocks: 'USStock',
        stock: 'USStock',
        cnstock: 'CNStock',
        ashare: 'CNStock',
        hkstock: 'HKStock',
        forex: 'Forex',
        futures: 'Futures',
        moex: 'MOEX'
      }
      return aliases[raw.toLowerCase()] || raw
    },
    normalizeWatchItem (item) {
      if (!item || typeof item !== 'object') return null
      const market = this.normalizeMarket(item.market || item.market_category || 'Crypto')
      const symbol = String(item.symbol || '').trim()
      if (!symbol) return null
      return {
        ...item,
        market,
        symbol,
        name: String(item.name || item.display_name || '').trim()
      }
    },
    extractStrategies (res) {
      const data = res && res.data
      if (Array.isArray(data)) return data
      if (data && Array.isArray(data.strategies)) return data.strategies
      if (data && Array.isArray(data.sources)) return data.sources
      if (data && Array.isArray(data.items)) return data.items
      return []
    },
    isScriptStrategy (item) {
      return item && (item.strategy_type === 'ScriptStrategy' || item.strategy_mode === 'script')
    },
    async loadScriptStrategies () {
      this.loadingScripts = true
      try {
        const res = await getScriptSourceList()
        this.scriptStrategies = this.extractStrategies(res)
        const queryId = this.$route.query && (this.$route.query.source_id || this.$route.query.strategy_id)
        const currentId = this.selectedScriptId || this.scriptDraftStrategyId
        const currentExists = currentId && this.scriptStrategies.some(item => {
          const id = item && (item.id || item.source_id || item.sourceId)
          return String(id) === String(currentId)
        })
        const firstScript = this.scriptStrategies[0]
        const firstId = firstScript && (firstScript.id || firstScript.source_id || firstScript.sourceId)
        const targetId = queryId || (currentExists ? currentId : firstId)

        if (targetId && String(targetId) !== String(this.scriptDraftStrategyId || '')) {
          this.selectedScriptId = String(targetId)
          await this.handleScriptSelect(this.selectedScriptId, { silentRoute: !!queryId })
        } else if (targetId) {
          this.selectedScriptId = String(targetId)
        }
      } catch (e) {
        this.$message.warning(this.text.loadScriptsFailed)
      } finally {
        this.loadingScripts = false
      }
    },
    applyStrategyToEditor (strategy) {
      const metadata = strategy.metadata || {}
      const tc = metadata.last_run_config || {}
      this.scriptDraftStrategyId = strategy.id || strategy.source_id || null
      this.selectedScriptId = this.scriptDraftStrategyId ? String(this.scriptDraftStrategyId) : undefined
      this.scriptRuntimeStrategyId = null
      this.scriptDraftStrategy = strategy
      this.scriptName = strategy.name || strategy.strategy_name || ''
      this.scriptCode = strategy.code || strategy.strategy_code || DEFAULT_SCRIPT_CODE
      this.scriptTemplateKey = strategy.template_key || tc.script_template_key || ''
      this.editorInitialTemplateKey = ''
      this.scriptVerified = !!(metadata.lifecycle_verified || metadata.script_verified)
      this.scriptEditorKeySeed += 1
      this.runForm.marketCategory = this.normalizeMarket(tc.market_category || 'Crypto')
      this.runForm.symbol = tc.symbol || this.runForm.symbol || 'BTC/USDT'
      this.runForm.timeframe = tc.timeframe || this.runForm.timeframe || '15m'
      this.runForm.marketType = 'spot'
      this.runForm.tradeDirection = this.runForm.marketType === 'spot'
        ? 'long'
        : (tc.trade_direction || this.runForm.tradeDirection || 'both')
      this.runForm.initialCapital = Number(tc.initial_capital || strategy.initial_capital || this.runForm.initialCapital || 10000)
      this.runForm.leverage = this.runForm.marketType === 'spot'
        ? 1
        : Number(tc.leverage || strategy.leverage || this.runForm.leverage || 1)
      this.syncSelectedWatchKey()
      this.lastSavedScriptSnapshot = this.scriptSourceSnapshot()
    },
    async handleScriptSelect (id, opts = {}) {
      if (!id) {
        this.newScriptDraft()
        return
      }
      try {
        const res = await getScriptSourceDetail(id)
        const strategy = (res && res.data) || res
        if (!strategy || !strategy.id) throw new Error('Not a script source')
        this.applyStrategyToEditor(strategy)
        if (!opts.silentRoute) {
          const query = { ...(this.$route.query || {}), tab: 'script', source_id: String(id) }
          delete query.strategy_id
          this.$router.replace({ path: '/strategy-ide', query }).catch(() => {})
        }
      } catch (e) {
        this.$message.error(this.text.loadScriptFailed)
      }
    },
    newScriptDraft () {
      this.selectedScriptId = undefined
      this.scriptDraftStrategyId = null
      this.scriptRuntimeStrategyId = null
      this.scriptDraftStrategy = null
      this.scriptName = ''
      this.scriptCode = DEFAULT_SCRIPT_CODE
      this.scriptTemplateKey = ''
      this.editorInitialTemplateKey = ''
      this.scriptEditorKeySeed += 1
      this.scriptVerified = false
      this.lastSavedScriptSnapshot = ''
      const query = { ...(this.$route.query || {}), tab: 'script' }
      delete query.strategy_id
      delete query.source_id
      this.$router.replace({ path: '/strategy-ide', query }).catch(() => {})
    },
    onWatchSymbolChange (value) {
      const selected = (this.watchlistOptions || []).find(item => item.value === value)
      if (!selected) return
      this.runForm.marketCategory = this.normalizeMarket(selected.market || 'Crypto')
      this.runForm.symbol = selected.symbol || ''
    },
    syncSelectedWatchKey () {
      const current = `${this.runForm.marketCategory || 'Crypto'}:${this.runForm.symbol || ''}`
      const options = this.watchlistOptions || []
      const matched = options.find(item => item.value === current) || options[0]
      if (matched) {
        this.selectedWatchKey = matched.value
        this.onWatchSymbolChange(matched.value)
      }
    },
    async loadWatchlist () {
      this.loadingWatchlist = true
      try {
        const res = await getWatchlist({ userid: this.userId })
        const raw = Array.isArray(res && res.data)
          ? res.data
          : ((res && res.data && (res.data.watchlist || res.data.items)) || [])
        this.watchlist = raw.map(this.normalizeWatchItem).filter(Boolean)
      } catch (e) {
        this.watchlist = []
      } finally {
        this.loadingWatchlist = false
        this.syncSelectedWatchKey()
      }
    },
    deriveScriptName () {
      const explicit = String(this.scriptName || '').trim()
      if (explicit) return explicit
      const symbol = String(this.runForm.symbol || '').trim()
      return symbol ? `${symbol} ${this.text.autoNameSuffix}` : this.text.defaultName
    },
    onScriptTemplateChange (payload) {
      this.scriptTemplateKey = (payload && payload.key) || ''
      this.scriptVerified = false
    },
    validateScriptCode () {
      if (!String(this.scriptCode || '').trim()) {
        this.$message.warning(this.text.codeRequired)
        return false
      }
      return true
    },
    validateRunForm () {
      if (!this.validateScriptCode()) return false
      if (!String(this.runForm.symbol || '').trim()) {
        this.$message.warning(this.text.symbolRequired)
        return false
      }
      return true
    },
    buildTradingConfig () {
      const marketSupportsSwap = String(this.runForm.marketCategory || '') === 'Crypto'
      const marketType = marketSupportsSwap && this.runForm.marketType === 'swap' ? 'swap' : 'spot'
      const tradeDirection = marketType === 'spot' ? 'long' : (this.runForm.tradeDirection || 'both')
      const config = {
        symbol: String(this.runForm.symbol || '').trim(),
        timeframe: this.runForm.timeframe || '15m',
        market_type: marketSupportsSwap ? marketType : undefined,
        trade_direction: tradeDirection,
        initial_capital: Number(this.runForm.initialCapital || 10000),
        leverage: marketType === 'spot' ? 1 : Number(this.runForm.leverage || 1)
      }
      if (this.scriptTemplateKey) config.script_template_key = this.scriptTemplateKey
      return config
    },
    buildScriptPayload () {
      return {
        user_id: this.userId,
        name: this.deriveScriptName(),
        code: this.scriptCode,
        template_key: this.scriptTemplateKey,
        metadata: {
          last_run_config: this.buildTradingConfig(),
          lifecycle_verified: this.scriptVerified,
          script_verified: this.scriptVerified
        }
      }
    },
    scriptSourceSnapshot () {
      return JSON.stringify(this.buildScriptPayload())
    },
    applySavedStrategy (raw) {
      const data = raw && raw.data ? raw.data : raw
      const id = data && (data.id || data.source_id || data.sourceId)
      if (id) this.scriptDraftStrategyId = id
      this.scriptName = this.deriveScriptName()
      this.selectedScriptId = this.scriptDraftStrategyId ? String(this.scriptDraftStrategyId) : undefined
      const query = { ...(this.$route.query || {}), tab: 'script', source_id: String(this.scriptDraftStrategyId) }
      delete query.strategy_id
      this.$router.replace({ path: '/strategy-ide', query }).catch(() => {})
      this.lastSavedScriptSnapshot = this.scriptSourceSnapshot()
    },
    async saveScriptStrategy (forceCreate = false, opts = {}) {
      if (!this.validateScriptCode()) return null
      if (!forceCreate && this.scriptDraftStrategy && this.scriptDraftStrategy.status === 'running') {
        this.$message.warning(this.text.runningEditBlocked)
        return null
      }
      if (!forceCreate && opts.skipUnchanged && this.scriptDraftStrategyId && this.lastSavedScriptSnapshot === this.scriptSourceSnapshot()) {
        return this.scriptDraftStrategyId
      }
      this.savingScript = true
      try {
        const payload = this.buildScriptPayload()
        const res = (!forceCreate && this.scriptDraftStrategyId)
          ? await updateScriptSource(this.scriptDraftStrategyId, payload)
          : await createScriptSource(payload)
        if (res && res.code === 1) {
          this.applySavedStrategy(res)
          await this.loadScriptStrategies()
          if (!opts.silent) this.$message.success(this.text.saveSuccess)
          return this.scriptDraftStrategyId
        }
        this.$message.error((res && res.msg) || this.text.saveFailed)
        return null
      } catch (e) {
        this.$message.error(e.backendMessage || e.message || this.text.saveFailed)
        return null
      } finally {
        this.savingScript = false
      }
    },
    async openPublishScriptModal () {
      const sourceId = await this.saveScriptStrategy(false)
      if (!sourceId) return
      const metadata = (this.scriptDraftStrategy && this.scriptDraftStrategy.metadata) || {}
      this.publishForm = {
        name: this.deriveScriptName(),
        description: metadata.description || (this.scriptDraftStrategy && this.scriptDraftStrategy.description) || '',
        pricingType: 'free',
        price: 0
      }
      this.showPublishModal = true
    },
    closePublishScriptModal () {
      if (!this.publishingScript) this.showPublishModal = false
    },
    async confirmPublishScriptSource () {
      const sourceId = this.scriptDraftStrategyId || await this.saveScriptStrategy(false)
      if (!sourceId) return
      const pricingType = this.publishForm.pricingType === 'paid' ? 'paid' : 'free'
      const price = Number(this.publishForm.price || 0)
      if (pricingType === 'paid' && price <= 0) {
        this.$message.warning(this.text.priceRequired)
        return
      }
      this.publishingScript = true
      try {
        const res = await publishScriptSource({
          sourceId,
          name: String(this.publishForm.name || '').trim() || this.deriveScriptName(),
          description: String(this.publishForm.description || '').trim(),
          pricingType,
          price: pricingType === 'paid' ? price : 0
        })
        if (res && res.code === 1) {
          this.$message.success(this.text.publishSuccess)
          this.showPublishModal = false
        } else {
          this.$message.error((res && res.msg) || this.text.publishFailed)
        }
      } catch (e) {
        this.$message.error(e.backendMessage || e.message || this.text.publishFailed)
      } finally {
        this.publishingScript = false
      }
    },
    deleteCurrentScriptSource () {
      if (!this.scriptDraftStrategyId) return
      this.$confirm({
        title: this.text.deleteConfirmTitle,
        content: this.text.deleteConfirmDesc,
        okType: 'danger',
        onOk: async () => {
          this.savingScript = true
          try {
            const res = await deleteScriptSource(this.scriptDraftStrategyId)
            if (res && res.code === 1) {
              this.$message.success(this.text.deleteSuccess)
              this.newScriptDraft()
              await this.loadScriptStrategies()
            } else {
              this.$message.error((res && res.msg) || this.text.deleteFailed)
            }
          } catch (e) {
            this.$message.error(e.backendMessage || e.message || this.text.deleteFailed)
          } finally {
            this.savingScript = false
          }
        }
      })
    },
    async prepareScriptBacktest () {
      if (!this.validateRunForm()) return false
      this.preparingBacktest = true
      const hide = this.$message.loading(this.text.preparing, 0)
      try {
        const sourceId = await this.saveScriptStrategy(false, { skipUnchanged: true, silent: true })
        if (!sourceId) return false
        const tradingConfig = {
          ...this.buildTradingConfig(),
          script_source_id: Number(sourceId),
          script_role: 'runtime'
        }
        this.scriptDraftStrategy = {
          id: null,
          strategy_name: this.deriveScriptName(),
          strategy_type: 'ScriptStrategy',
          strategy_mode: 'script',
          strategy_code: '',
          market_category: this.runForm.marketCategory || 'Crypto',
          status: 'draft',
          trading_config: tradingConfig
        }
        return {
          scriptSourceId: Number(sourceId),
          overrideConfig: {
            ...tradingConfig,
            market: this.runForm.marketCategory || 'Crypto',
            market_category: this.runForm.marketCategory || 'Crypto',
            strategy_name: this.deriveScriptName()
          }
        }
      } finally {
        this.preparingBacktest = false
        if (typeof hide === 'function') hide()
      }
    }
  }
}
</script>

<style lang="less" scoped>
.strategy-ide-shell {
  min-height: calc(100vh - 64px);
  background: #f5f7fb;

  ::v-deep .ant-tabs-bar {
    margin: 0;
    padding: 0 16px;
    background: #fff;
    border-bottom-color: #e5e7eb;
  }

  ::v-deep .ant-tabs-tab {
    font-weight: 700;
  }
}

.script-select {
  width: 230px;
  max-width: 24vw;
}

.script-workspace {
  display: grid;
  grid-template-columns: minmax(680px, 1.2fr) minmax(560px, 0.95fr);
  align-items: start;
  gap: 12px;
  padding: 12px;
}

.script-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.script-panel--editor {
  min-width: 0;
  max-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;

  ::v-deep .strategy-editor {
    flex: 1 1 auto;
    min-height: 0;
    padding: 12px;
    overflow: hidden;
  }

  ::v-deep .editor-layout {
    height: calc(100vh - 305px);
    min-height: 480px;
    max-height: calc(100vh - 305px);
    overflow: hidden;
  }

  ::v-deep .code-editor-container {
    height: 100%;
    min-height: 0;
  }

  ::v-deep .code-col,
  ::v-deep .code-section,
  ::v-deep .side-col,
  ::v-deep .side-tabs {
    min-height: 0;
  }

  ::v-deep .CodeMirror {
    height: 100% !important;
  }

  ::v-deep .CodeMirror-scroll {
    min-height: 0 !important;
  }

  ::v-deep .CodeMirror-scroll::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::v-deep .CodeMirror-scroll::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(100, 116, 139, 0.46);
  }

  ::v-deep .CodeMirror-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
}

.script-panel--backtest {
  min-width: 0;
  max-height: calc(100vh - 170px);
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(100, 116, 139, 0.46);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
  color: #172033;

  .anticon {
    color: #1890ff;
  }
}

.panel-desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
}

.script-code-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 0 1 auto;
  max-width: 760px;
  justify-content: flex-end;
}

.save-inline__input {
  width: 190px;
}

.ide-icon-btn {
  width: 34px;
  min-width: 34px;
  height: 34px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ide-icon-btn--danger {
  color: #ff4d4f;
  border-color: rgba(255, 77, 79, 0.65);
  background: transparent;

  &:hover,
  &:focus {
    color: #fff;
    border-color: #ff4d4f;
    background: #ff4d4f;
  }
}

.action-divider {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
}

.run-config-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #eef2f7;
  background: #fbfdff;
}

.run-section {
  min-width: 0;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.run-section__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 800;
  color: #172033;

  .anticon {
    color: #1890ff;
  }
}

.run-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(150px, 1fr));
  gap: 12px;
}

.target-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  margin: 10px 0 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;

  strong {
    color: #172033;
  }
}

.run-field {
  min-width: 0;

  label {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 700;
    color: #475569;
  }

  ::v-deep .ant-select,
  ::v-deep .ant-input,
  ::v-deep .ant-input-number {
    width: 100%;
  }

  ::v-deep .ant-select-selection {
    width: 100%;
  }
}

.run-control {
  width: 100%;
  max-width: 260px;
}

.run-control--symbol {
  max-width: 360px;
}

.run-control--timeframe {
  max-width: 180px;
}

.run-segment {
  display: flex;

  ::v-deep .ant-radio-button-wrapper {
    flex: 1;
    text-align: center;
  }
}

.run-field--note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  line-height: 1.6;
}

.script-backtest-panel {
  padding: 14px 16px 16px;

  ::v-deep .bt-toolbar {
    gap: 12px;
    padding: 12px;
    margin-bottom: 12px;
    border-radius: 8px;
  }

  ::v-deep .bt-toolbar__left {
    flex-basis: 100%;
  }

  ::v-deep .bt-toolbar__dates {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    width: 100%;
  }

  ::v-deep .date-field .ant-calendar-picker {
    width: 100%;
  }

  ::v-deep .bt-toolbar__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
    margin-left: 0;
  }

  ::v-deep .bt-toolbar__actions .ant-btn {
    width: 100%;
  }

  ::v-deep .bt-result-card,
  ::v-deep .bt-trades-section,
  ::v-deep .bt-history-section {
    min-width: 0;
    overflow: hidden;
  }

  ::v-deep .bt-trades-table,
  ::v-deep .bt-history-table {
    max-width: 100%;
  }

  ::v-deep .ant-table-wrapper,
  ::v-deep .ant-spin-nested-loading,
  ::v-deep .ant-spin-container,
  ::v-deep .ant-table,
  ::v-deep .ant-table-content {
    max-width: 100%;
  }

  ::v-deep .ant-table-content {
    overflow-x: auto;
  }

  ::v-deep .ant-pagination {
    max-width: 100%;
    overflow-x: auto;
    white-space: nowrap;
  }
}

.theme-dark.strategy-ide-shell {
  background: #0f0f10;

  ::v-deep .ant-tabs-bar {
    background: #0f0f10;
    border-bottom-color: #303030;
  }

  ::v-deep .ant-tabs-tab {
    color: rgba(255, 255, 255, 0.58) !important;
  }

  ::v-deep .ant-tabs-tab:hover {
    color: rgba(255, 255, 255, 0.82) !important;
  }

  ::v-deep .ant-tabs-tab-active {
    color: #177ddc !important;
  }

  ::v-deep .ant-tabs-tab-disabled {
    color: rgba(255, 255, 255, 0.25) !important;
  }

  .panel-title,
  .run-section__title {
    color: rgba(255, 255, 255, 0.88);
  }

  .panel-desc,
  .run-field label {
    color: rgba(255, 255, 255, 0.5);
  }

  .action-divider {
    background: rgba(255, 255, 255, 0.12);
  }

  .script-panel {
    background: #181818;
    border-color: #303030;
    box-shadow: none;
  }

  .panel-head {
    background: #181818;
  }

  .panel-head,
  .run-config-grid {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .run-config-grid {
    background: #121212;
  }

  .run-section {
    background: #181818;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .target-summary {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.52);

    strong {
      color: rgba(255, 255, 255, 0.88);
    }
  }

  .run-field--note {
    background: rgba(24, 144, 255, 0.09);
    color: #69c0ff;
  }

  ::v-deep .ant-input,
  ::v-deep .ant-input-number,
  ::v-deep .ant-input-number-input,
  ::v-deep .ant-select-selection,
  ::v-deep .ant-select-selection--single {
    background: #141414 !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
    color: #d1d4dc !important;
  }

  ::v-deep .ant-radio-button-wrapper {
    background: #141414;
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.72);
  }

  ::v-deep .ant-radio-button-wrapper-checked {
    color: #fff;
    background: #177ddc;
    border-color: #177ddc;
  }
}

@media (max-width: 1280px) {
  .script-workspace {
    grid-template-columns: 1fr;
  }

  .script-panel--backtest {
    max-height: none;
    overflow-y: visible;
  }

  .script-panel--editor {
    max-height: none;

    ::v-deep .editor-layout,
    ::v-deep .code-editor-container {
      height: 520px;
      min-height: 420px;
      max-height: 520px;
    }
  }
}

@media (max-width: 900px) {
  .panel-head {
    align-items: stretch;
    flex-direction: column;
  }

  .script-code-actions {
    width: 100%;
    max-width: none;
    min-width: 0;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .script-select,
  .save-inline__input {
    width: 100%;
    max-width: none;
  }

  .run-control,
  .run-control--symbol,
  .run-control--timeframe {
    max-width: none;
  }
}
</style>

<style lang="less">
.script-publish-modal {
  .publish-form {
    display: flex;
    flex-direction: column;
  }

  .field-label {
    margin-bottom: 6px;
    color: #334155;
    font-size: 13px;
    font-weight: 700;
  }

  .field-label--spaced,
  .publish-field {
    margin-top: 16px;
  }
}

.script-publish-modal--dark {
  .ant-modal-content,
  .ant-modal-header {
    background: #181818;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .ant-modal-title,
  .field-label {
    color: rgba(255, 255, 255, 0.88);
  }

  .ant-modal-close,
  .ant-radio-wrapper {
    color: rgba(255, 255, 255, 0.72);
  }

  .ant-input,
  .ant-input-number,
  .ant-input-number-input,
  .ant-input-number-handler-wrap,
  textarea.ant-input {
    background: #141414;
    border-color: rgba(255, 255, 255, 0.12);
    color: #d1d4dc;
  }
}
</style>
