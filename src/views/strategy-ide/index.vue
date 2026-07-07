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
              <strategy-editor
                ref="scriptEditor"
                :key="scriptEditorKey"
                v-model="scriptCode"
                :is-dark="isDarkTheme"
                :visible="activeMode === 'script'"
                :user-id="userId"
                :strategy-id="scriptDraftStrategyId"
                :strategy-name="deriveScriptName()"
                :initial-template-key="editorInitialTemplateKey"
                @verified="scriptVerified = true"
                @template-change="onScriptTemplateChange"
                @name-change="scriptName = $event"
              >
                <template #toolbar>
                  <div class="script-code-actions">
                    <span class="script-select-label">{{ text.selectScriptLabel }}</span>
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
                    <a-tooltip :title="text.versionHistory">
                      <a-button
                        class="ide-icon-btn"
                        :disabled="!scriptDraftStrategyId"
                        :loading="scriptVersionLoading"
                        @click="openScriptVersionDrawer"
                      >
                        <a-icon type="history" />
                      </a-button>
                    </a-tooltip>
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
                    <a-button
                      class="script-live-button"
                      type="primary"
                      :loading="savingScript"
                      @click="createLiveFromScript"
                    >
                      <a-icon type="thunderbolt" />
                      {{ text.createLive }}
                    </a-button>
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
                </template>
              </strategy-editor>
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
                  <div class="run-target-grid run-target-grid--simple">
                    <div class="run-field">
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
                    <div class="run-field">
                      <label>{{ text.runtimeCadence }}</label>
                      <div class="run-fixed-cadence">
                        <a-tag color="green">1m</a-tag>
                        <a-tag color="blue">10s</a-tag>
                      </div>
                    </div>
                  </div>
                  <div class="target-summary">
                    <a-tag color="blue">{{ marketLabel(runForm.marketCategory) }}</a-tag>
                    <strong>{{ runForm.symbol || text.noSymbol }}</strong>
                    <span v-if="selectedWatchItem && selectedWatchItem.name">{{ selectedWatchItem.name }}</span>
                    <span class="target-summary__divider"></span>
                    <span>{{ text.timeframeBoundary }}</span>
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
                        <a-radio-button value="swap">{{ text.swap }}</a-radio-button>
                      </a-radio-group>
                    </div>
                    <div class="run-field">
                      <label>{{ text.direction }}</label>
                      <a-radio-group v-model="runForm.tradeDirection" button-style="solid" class="run-segment" :disabled="!supportsSwap || runForm.marketType === 'spot'">
                        <a-radio-button value="long">{{ text.long }}</a-radio-button>
                        <a-radio-button value="short" :disabled="!supportsSwap || runForm.marketType === 'spot'">{{ text.short }}</a-radio-button>
                        <a-radio-button value="both" :disabled="!supportsSwap || runForm.marketType === 'spot'">{{ text.both }}</a-radio-button>
                      </a-radio-group>
                      <div v-if="runForm.marketType === 'spot'" class="run-field__hint">
                        {{ text.spotDirectionHint }}
                      </div>
                    </div>
                    <div class="run-field">
                      <label>{{ text.initialCapital }}</label>
                      <a-input-number
                        v-model="runForm.initialCapital"
                        :min="investmentAmountMin"
                        :max="investmentAmountMax"
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
                        :disabled="!supportsSwap || runForm.marketType === 'spot'"
                        style="width: 100%"
                      />
                    </div>
                  </div>
                </div>

                <div class="run-field run-field--note">
                  <a-icon type="info-circle" />
                  <span>{{ text.runNote }}</span>
                </div>
                <div class="run-field run-field--note run-field--boundary-note">
                  <a-icon type="partition" />
                  <span>{{ text.strategyBoundaryNote }}</span>
                </div>
              </div>

              <strategy-backtest-panel
                ref="scriptBacktestPanel"
                :strategy-id="null"
                :script-source-id="scriptDraftStrategyId"
                :strategy="scriptBacktestStrategy"
                :is-dark="isDarkTheme"
                :prepare-run="prepareScriptBacktest"
                :script-code="scriptCode"
                class="script-backtest-panel"
                @backtested="loadScriptStrategies"
                @apply-tune-params="applyScriptTuneParams"
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

    <a-drawer
      :title="text.versionHistory"
      :visible="showScriptVersionDrawer"
      :width="560"
      :wrap-class-name="isDarkTheme ? 'script-version-drawer script-version-drawer--dark' : 'script-version-drawer'"
      @close="showScriptVersionDrawer = false"
    >
      <div class="code-version-toolbar">
        <span>{{ scriptName || text.defaultName }}</span>
        <a-button size="small" icon="reload" :loading="scriptVersionLoading" @click="loadScriptVersions">
          {{ text.refreshScripts }}
        </a-button>
      </div>
      <a-spin :spinning="scriptVersionLoading">
        <a-empty v-if="!scriptVersions.length" :description="text.versionEmpty" />
        <div v-else class="code-version-list">
          <div v-for="item in scriptVersions" :key="item.id" class="code-version-item">
            <div class="code-version-item__main">
              <strong>{{ text.versionNo.replace('{version}', item.version_no) }}</strong>
              <span>{{ formatScriptVersionTime(item.created_at) }}</span>
              <small>{{ item.name || scriptName || text.defaultName }}</small>
            </div>
            <div class="code-version-item__actions">
              <a-button size="small" @click="previewScriptVersion(item)">{{ text.versionPreview }}</a-button>
              <a-button
                size="small"
                type="primary"
                :loading="restoringScriptVersionId === item.id"
                @click="confirmRestoreScriptVersion(item)"
              >
                {{ text.versionRestore }}
              </a-button>
            </div>
          </div>
        </div>
      </a-spin>
      <div v-if="scriptVersionPreview" class="code-version-preview">
        <div class="code-version-preview__head">
          <strong>{{ text.versionPreviewTitle.replace('{version}', scriptVersionPreview.version_no) }}</strong>
          <a-button size="small" icon="close" @click="scriptVersionPreview = null">{{ text.close }}</a-button>
        </div>
        <pre>{{ scriptVersionPreview.code }}</pre>
      </div>
    </a-drawer>
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
  getScriptSourceVersion,
  getScriptSourceVersions,
  publishScriptSource,
  restoreScriptSourceVersion,
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
      scriptTemplateParams: {},
      editorInitialTemplateKey: '',
      scriptEditorKeySeed: 0,
      scriptVerified: false,
      savingScript: false,
      publishingScript: false,
      showPublishModal: false,
      showScriptVersionDrawer: false,
      scriptVersionLoading: false,
      scriptVersions: [],
      scriptVersionPreview: null,
      restoringScriptVersionId: null,
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
      investmentAmountMin: 10,
      investmentAmountMax: 1000000,
      lastSavedScriptSnapshot: '',
      loadingWatchlist: false,
      selectedWatchKey: '',
      watchlist: [],
      runForm: {
        marketCategory: 'Crypto',
        symbol: 'BTC/USDT',
        timeframe: '1m',
        marketType: 'swap',
        tradeDirection: 'long',
        initialCapital: 10000,
        leverage: 5
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
        indicator: '指标编写',
        script: '交易脚本',
        libraryTitle: '脚本源码库',
        libraryDesc: '在这里切换、编辑、回测和发布脚本源码。运行时选择标的、现货/合约、方向、投入金额和杠杆。',
        selectScriptLabel: '当前脚本',
        selectScriptPlaceholder: '选择已保存脚本源码',
        newScript: '新建脚本',
        codeTitle: '脚本代码',
        codeDesc: '这里只保存脚本逻辑。运行标的、现货/合约、方向、投入金额、杠杆、账户和通知在回测或实盘启动时选择。',
        backtestTitle: '脚本回测',
        backtestDesc: '从自选标的发起回测，市场自动识别；系统固定使用 1m on_bar 和 10s 价格检查。',
        strategyNamePlaceholder: '可选策略名，留空自动生成',
        saveScript: '保存脚本',
        updateScript: '更新脚本',
        saveAsNew: '另存为新脚本',
        createLive: '创建实盘',
        publishScript: '发布到市场',
        deleteScript: '删除',
        refreshScripts: '刷新脚本列表',
        versionHistory: '历史版本',
        versionEmpty: '暂无历史版本',
        versionNo: '版本 #{version}',
        versionPreview: '查看',
        versionRestore: '恢复',
        versionRestoreTitle: '恢复历史版本？',
        versionRestoreContent: '将当前脚本恢复到版本 #{version}，恢复后会自动生成一个新的历史版本。',
        versionPreviewTitle: '版本 #{version} 预览',
        versionRestored: '已恢复历史版本',
        versionLoadFailed: '加载历史版本失败',
        versionRestoreFailed: '恢复历史版本失败',
        close: '关闭',
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
        timeframe: '脚本触发周期',
        runtimeCadence: '运行频率',
        marketType: '市场类型',
        spot: '现货',
        swap: '合约',
        direction: '交易方向',
        long: '做多',
        short: '做空',
        both: '双向',
        initialCapital: '投入金额',
        leverage: '杠杆',
        spotDirectionHint: '现货只能做多，系统会固定方向为做多、杠杆为 1x。',
        timeframeBoundary: '固定 1m 触发 on_bar，实盘每 10s 检查一次最新价格。',
        strategyBoundaryNote: '边界：这里仅选择标的、现货/合约、方向、投入金额和杠杆；分仓、间距、马丁倍数、止盈止损等高级设置由脚本代码决定。',
        runNote: '运行回测时会先同步当前脚本源码；实盘账户、通知和账户级风控仍在策略实盘页绑定。',
        codeRequired: '请先编写交易脚本代码',
        symbolRequired: '请选择回测标的',
        saveSuccess: '脚本源码已保存',
        saveFailed: '保存脚本源码失败',
        preparing: '正在同步脚本源码...',
        loadScriptsFailed: '加载脚本源码列表失败',
        loadScriptFailed: '加载脚本源码失败',
        runningEditBlocked: '策略正在运行，请先停止后再修改代码',
        autoNameSuffix: '脚本源码',
        defaultName: '未命名脚本',
        noScriptChanges: '脚本已是最新'
      }
      const en = {
        indicator: 'Indicator Builder',
        script: 'Trading Script',
        libraryTitle: 'Script Source Library',
        libraryDesc: 'Switch, edit, backtest, and publish script source here. Runs ask for symbol, spot/swap, direction, investment amount, and leverage.',
        selectScriptLabel: 'Script',
        selectScriptPlaceholder: 'Select a saved script source',
        newScript: 'New Script',
        codeTitle: 'Script Code',
        codeDesc: 'Save only script logic here. Choose symbol, spot/swap, direction, investment amount, leverage, account, and notifications when backtesting or going live.',
        backtestTitle: 'Script Backtest',
        backtestDesc: 'Choose a watchlist symbol for this run. Market is inferred automatically; scripts use fixed 1m on_bar and 10s price checks.',
        strategyNamePlaceholder: 'Optional name, auto-generated if empty',
        saveScript: 'Save Script',
        updateScript: 'Update Script',
        saveAsNew: 'Save as New',
        createLive: 'Create Live',
        publishScript: 'Publish',
        deleteScript: 'Delete',
        refreshScripts: 'Refresh scripts',
        versionHistory: 'Version History',
        versionEmpty: 'No version history yet',
        versionNo: 'Version #{version}',
        versionPreview: 'View',
        versionRestore: 'Restore',
        versionRestoreTitle: 'Restore this version?',
        versionRestoreContent: 'Restore the current script to version #{version}. This restore will be saved as a new version.',
        versionPreviewTitle: 'Version #{version} Preview',
        versionRestored: 'Version restored',
        versionLoadFailed: 'Failed to load version history',
        versionRestoreFailed: 'Failed to restore version',
        close: 'Close',
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
        timeframe: 'Trigger Interval',
        runtimeCadence: 'Runtime Cadence',
        marketType: 'Market Type',
        spot: 'Spot',
        swap: 'Swap',
        direction: 'Direction',
        long: 'Long',
        short: 'Short',
        both: 'Both',
        initialCapital: 'Investment Amount',
        investmentAmountRange: 'Investment amount must be between 10 and 1,000,000',
        leverage: 'Leverage',
        spotDirectionHint: 'Spot can only run long; direction is fixed to Long and leverage to 1x.',
        timeframeBoundary: 'Fixed 1m on_bar trigger; live mode checks the latest price every 10s.',
        strategyBoundaryNote: 'Boundary: this panel only chooses symbol, spot/swap, direction, investment amount, and leverage. Layers, spacing, martingale sizing, exits, and other advanced settings belong in script code.',
        runNote: 'Backtest syncs the current script source first. Live account, notifications, and account-level risk remain bound in Strategy Live.',
        codeRequired: 'Write trading script code first',
        symbolRequired: 'Select a backtest symbol',
        saveSuccess: 'Script source saved',
        saveFailed: 'Failed to save script source',
        preparing: 'Syncing script source...',
        loadScriptsFailed: 'Failed to load script sources',
        loadScriptFailed: 'Failed to load script source',
        runningEditBlocked: 'Stop the running strategy before editing its code',
        autoNameSuffix: 'Script Source',
        defaultName: 'Untitled Script',
        noScriptChanges: 'Script is already up to date'
      }
      const bundle = this.isZh ? zh : en
      bundle.selectScriptLabel = this.$t('strategyIde.selectScriptLabel')
      bundle.investmentAmountRange = this.$t('trading-assistant.validation.initialCapitalRange')
      return bundle
    }
  },
  mounted () {
    this._scriptSaveShortcutListener = (event) => this.handleScriptSaveShortcut(event)
    window.addEventListener('keydown', this._scriptSaveShortcutListener, true)
    const tab = String((this.$route.query && this.$route.query.tab) || '').toLowerCase()
    if (tab === 'script') this.activeMode = 'script'
    const template = String((this.$route.query && this.$route.query.template) || '').trim()
    if (template) {
      this.scriptTemplateKey = template
      this.editorInitialTemplateKey = template
    }
    this.applyCopilotScriptDraft()
    this.loadWatchlist()
    this.loadScriptStrategies()
  },
  beforeDestroy () {
    if (this._scriptSaveShortcutListener) {
      window.removeEventListener('keydown', this._scriptSaveShortcutListener, true)
      this._scriptSaveShortcutListener = null
    }
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
    applyCopilotScriptDraft () {
      const query = this.$route.query || {}
      const isScriptDraft = String(query.aiDraft || '') === '1' && String(query.tab || '').toLowerCase() === 'script'
      if (!isScriptDraft || typeof sessionStorage === 'undefined') return
      const code = String(sessionStorage.getItem('qd_copilot_script_strategy_code') || '').trim()
      if (!code) return

      let meta = {}
      try {
        meta = JSON.parse(sessionStorage.getItem('qd_copilot_script_strategy_meta') || '{}') || {}
      } catch (_) {
        meta = {}
      }

      this.activeMode = 'script'
      this.selectedScriptId = undefined
      this.scriptDraftStrategyId = null
      this.scriptRuntimeStrategyId = null
      this.scriptDraftStrategy = null
      this.scriptCode = code
      this.scriptName = String(meta.name || '').trim() || this.extractScriptTitleFromCode(code) || this.text.defaultName
      this.scriptTemplateKey = ''
      this.scriptTemplateParams = {}
      this.editorInitialTemplateKey = ''
      this.scriptVerified = false
      this.lastSavedScriptSnapshot = ''
      this.scriptEditorKeySeed += 1

      const market = meta.market || query.market
      const symbol = meta.symbol || query.symbol
      if (market) this.runForm.marketCategory = this.normalizeMarket(market)
      if (symbol) this.runForm.symbol = String(symbol).trim()
      this.syncSelectedWatchKey()
    },
    hasCopilotScriptDraft () {
      return String((this.$route.query && this.$route.query.aiDraft) || '') === '1' &&
        String((this.$route.query && this.$route.query.tab) || '').toLowerCase() === 'script' &&
        !this.scriptDraftStrategyId &&
        String(this.scriptCode || '').trim() &&
        String(this.scriptCode || '').trim() !== String(DEFAULT_SCRIPT_CODE || '').trim()
    },
    handleScriptSaveShortcut (event) {
      if (!event || (!event.ctrlKey && !event.metaKey) || String(event.key || '').toLowerCase() !== 's') return
      if (this.activeMode !== 'script') return
      event.preventDefault()
      event.stopPropagation()
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
      this.saveScriptFromShortcut()
    },
    async saveScriptFromShortcut () {
      if (this.savingScript) return
      if (this.scriptDraftStrategyId && this.lastSavedScriptSnapshot === this.scriptSourceSnapshot()) {
        this.$message.info(this.text.noScriptChanges || this.text.saveSuccess)
        return
      }
      await this.saveScriptStrategy(false)
    },
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
        const targetId = queryId || (currentExists ? currentId : (this.hasCopilotScriptDraft() ? null : firstId))

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
      this.scriptTemplateParams = {
        ...((metadata && metadata.script_template_params) || {}),
        ...((tc && tc.script_template_params) || {})
      }
      this.editorInitialTemplateKey = ''
      this.scriptVerified = !!(metadata.lifecycle_verified || metadata.script_verified)
      this.scriptEditorKeySeed += 1
      this.runForm.marketCategory = this.normalizeMarket(tc.market_category || 'Crypto')
      this.runForm.symbol = tc.symbol || this.runForm.symbol || 'BTC/USDT'
      this.runForm.timeframe = '1m'
      this.runForm.marketType = this.supportsSwap && (tc.market_type === 'swap' || tc.market_type === 'futures') ? 'swap' : 'spot'
      this.runForm.tradeDirection = this.supportsSwap
        ? (tc.trade_direction || this.runForm.tradeDirection || 'long')
        : 'long'
      this.runForm.initialCapital = Number(tc.initial_capital || strategy.initial_capital || this.runForm.initialCapital || 10000)
      this.runForm.leverage = !this.supportsSwap
        ? 1
        : Number(tc.leverage || strategy.leverage || this.runForm.leverage || 5)
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
      this.scriptTemplateParams = {}
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
      const codeTitle = this.extractScriptTitleFromCode(this.scriptCode)
      if (codeTitle) return codeTitle
      const symbol = String(this.runForm.symbol || '').trim()
      return symbol ? `${symbol} ${this.text.autoNameSuffix}` : this.text.defaultName
    },
    extractScriptTitleFromCode (code) {
      const source = String(code || '')
      const match = source.match(/^\s*("""|''')([\s\S]*?)\1/)
      if (!match) return ''
      const lines = String(match[2] || '').split(/\r?\n/)
      const title = lines.map(line => String(line || '').trim()).find(Boolean)
      return title || ''
    },
    onScriptTemplateChange (payload) {
      this.scriptTemplateKey = (payload && payload.key) || ''
      this.scriptTemplateParams = (payload && payload.params && typeof payload.params === 'object') ? { ...payload.params } : {}
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
      const investmentAmount = Number(this.runForm.initialCapital)
      if (!Number.isFinite(investmentAmount) || investmentAmount < this.investmentAmountMin || investmentAmount > this.investmentAmountMax) {
        this.$message.warning(this.text.investmentAmountRange)
        return false
      }
      return true
    },
    buildTradingConfig () {
      const marketSupportsSwap = String(this.runForm.marketCategory || '') === 'Crypto'
      const marketType = marketSupportsSwap && this.runForm.marketType === 'swap' ? 'swap' : 'spot'
      const tradeDirection = marketType === 'spot' ? 'long' : (this.runForm.tradeDirection || 'long')
      const investmentAmount = Number(this.runForm.initialCapital || 10000)
      const config = {
        runtime_contract_version: 'simple_script_v1',
        symbol: String(this.runForm.symbol || '').trim(),
        timeframe: '1m',
        tick_interval_sec: 10,
        market_type: marketType,
        trade_direction: tradeDirection,
        initial_capital: investmentAmount,
        investment_amount: investmentAmount,
        leverage: marketType === 'spot' ? 1 : Number(this.runForm.leverage || 1)
      }
      if (this.scriptTemplateKey) config.script_template_key = this.scriptTemplateKey
      if (this.scriptTemplateParams && Object.keys(this.scriptTemplateParams).length) {
        config.script_template_params = { ...this.scriptTemplateParams }
      }
      return config
    },
    buildScriptPayload () {
      return {
        user_id: this.userId,
        name: this.deriveScriptName(),
        code: this.scriptCode,
        template_key: this.scriptTemplateKey,
        template_params: { ...this.scriptTemplateParams },
        metadata: {
          last_run_config: this.buildTradingConfig(),
          script_template_params: { ...this.scriptTemplateParams },
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
    openScriptVersionDrawer () {
      if (!this.scriptDraftStrategyId) return
      this.showScriptVersionDrawer = true
      this.scriptVersionPreview = null
      this.loadScriptVersions()
    },
    async loadScriptVersions () {
      if (!this.scriptDraftStrategyId) return
      this.scriptVersionLoading = true
      try {
        const res = await getScriptSourceVersions(this.scriptDraftStrategyId)
        if (res && res.code === 1) {
          this.scriptVersions = Array.isArray(res.data) ? res.data : []
        } else {
          this.$message.error((res && res.msg) || this.text.versionLoadFailed)
        }
      } catch (e) {
        this.$message.error(e.backendMessage || e.message || this.text.versionLoadFailed)
      } finally {
        this.scriptVersionLoading = false
      }
    },
    async previewScriptVersion (item) {
      if (!item || !item.id) return
      try {
        const res = await getScriptSourceVersion(item.id)
        if (res && res.code === 1) {
          this.scriptVersionPreview = res.data || null
        } else {
          this.$message.error((res && res.msg) || this.text.versionLoadFailed)
        }
      } catch (e) {
        this.$message.error(e.backendMessage || e.message || this.text.versionLoadFailed)
      }
    },
    confirmRestoreScriptVersion (item) {
      if (!item || !item.id) return
      this.$confirm({
        title: this.text.versionRestoreTitle,
        content: this.text.versionRestoreContent.replace('{version}', item.version_no),
        okText: this.text.versionRestore,
        cancelText: this.text.cancel,
        onOk: () => this.restoreScriptVersion(item)
      })
    },
    async restoreScriptVersion (item) {
      if (!item || !item.id) return
      this.restoringScriptVersionId = item.id
      try {
        const res = await restoreScriptSourceVersion(item.id)
        if (res && res.code === 1 && res.data) {
          this.applyStrategyToEditor(res.data)
          await this.loadScriptStrategies()
          await this.loadScriptVersions()
          this.scriptVersionPreview = null
          this.$message.success(this.text.versionRestored)
        } else {
          this.$message.error((res && res.msg) || this.text.versionRestoreFailed)
        }
      } catch (e) {
        this.$message.error(e.backendMessage || e.message || this.text.versionRestoreFailed)
      } finally {
        this.restoringScriptVersionId = null
      }
    },
    formatScriptVersionTime (value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
      return date.toLocaleString()
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
    async createLiveFromScript () {
      if (!this.validateScriptCode()) return
      this.savingScript = true
      try {
        const sourceId = await this.saveScriptStrategy(false, { skipUnchanged: true, silent: true })
        if (!sourceId) return
        const tradingConfig = this.buildTradingConfig()
        this.$router.push({
          path: '/strategy-script',
          query: {
            mode: 'create',
            source_id: String(sourceId),
            market_type: tradingConfig.market_type,
            trade_direction: tradingConfig.trade_direction,
            initial_capital: String(tradingConfig.initial_capital || 10000),
            leverage: String(tradingConfig.leverage || 1)
          }
        }).catch(() => {})
      } finally {
        this.savingScript = false
      }
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
    },
    applyScriptTuneParams (payload) {
      if (!payload || !payload.code) return
      this.scriptCode = payload.code
      this.scriptVerified = false
      this.$nextTick(() => {
        if (this.$refs.scriptEditor && typeof this.$refs.scriptEditor.setCode === 'function') {
          this.$refs.scriptEditor.setCode(payload.code)
        }
      })
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
  width: 260px;
  max-width: 28vw;
}

.script-select-label {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 600;
  color: #8c8c8c;
  white-space: nowrap;
  line-height: 34px;
}

.script-workspace {
  display: grid;
  grid-template-columns: minmax(680px, 1.2fr) minmax(560px, 0.95fr);
  align-items: stretch;
  gap: 12px;
  padding: 12px;
  height: calc(100vh - 118px);
  overflow: hidden;
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
  height: 100%;
  max-height: none;
  display: flex;
  flex-direction: column;

  ::v-deep .strategy-editor {
    flex: 1 1 auto;
    height: 100%;
    min-height: 0;
    padding: 10px;
    box-sizing: border-box;
    overflow: hidden;
  }

  ::v-deep .editor-layout {
    height: calc(100% - 42px);
    min-height: 0;
    max-height: none;
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
  height: 100%;
  max-height: none;
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
    color: var(--primary-color, #1890ff);
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
  width: 100%;
  flex: 1 1 auto;
  max-width: none;
  justify-content: flex-end;
}

.script-live-button {
  height: 34px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
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

.code-version-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #64748b;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.code-version-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.code-version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}

.code-version-item__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    color: #0f172a;
  }

  span,
  small {
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.code-version-item__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.code-version-preview {
  margin-top: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  background: #0f172a;
}

.code-version-preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  background: transparent;
  border-bottom: 1px solid #e5e7eb;

  strong {
    color: #0f172a;
  }
}

.code-version-preview pre {
  max-height: 360px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.55;
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  white-space: pre;
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
    color: var(--primary-color, #1890ff);
  }
}

.run-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(150px, 1fr));
  gap: 12px;
}

.run-target-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(132px, 180px);
  align-items: end;
  gap: 12px;
}

.run-fixed-cadence {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
}

.run-field__hint {
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
}

.target-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  margin-top: 8px;
  padding: 0;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;

  strong {
    color: #172033;
  }
}

.target-summary__divider {
  width: 1px;
  height: 14px;
  background: #dbe3ef;
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
}

.run-control--symbol {
  max-width: none;
}

.run-control--timeframe {
  max-width: none;
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

.run-field--template-note {
  background: #eef2ff;
  color: #1d39c4;
}

.run-field--boundary-note {
  background: #f0fdf4;
  color: #15803d;
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
    scrollbar-color: #cbd5e1 #f3f4f6;
    scrollbar-width: thin;

    &::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: #cbd5e1;
    }

    &::-webkit-scrollbar-track {
      background: #f3f4f6;
    }
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
    color: var(--primary-color-active, #177ddc) !important;
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

  .script-select-label {
    color: rgba(255, 255, 255, 0.42);
  }

  .action-divider {
    background: rgba(255, 255, 255, 0.12);
  }

  .script-panel {
    background: #181818;
    border-color: #303030;
    box-shadow: none;
  }

  .script-backtest-panel {
    ::v-deep .bt-toolbar,
    ::v-deep .bt-tuner-card,
    ::v-deep .bt-result-card,
    ::v-deep .bt-history-empty {
      background: #181818;
      border-color: #303030;
      box-shadow: none;
    }

    ::v-deep .ant-table {
      background: transparent;
      color: rgba(255, 255, 255, 0.74);
    }

    ::v-deep .ant-table-content {
      scrollbar-color: #5b6472 #202020;

      &::-webkit-scrollbar-thumb {
        background: #5b6472;
      }

      &::-webkit-scrollbar-track {
        background: #202020;
      }
    }

    ::v-deep .ant-table-bordered,
    ::v-deep .ant-table-bordered .ant-table-content,
    ::v-deep .ant-table-bordered .ant-table-body,
    ::v-deep .ant-table-small,
    ::v-deep .ant-table-content,
    ::v-deep .ant-table-body,
    ::v-deep .ant-table-scroll,
    ::v-deep .ant-table-header,
    ::v-deep table {
      border-color: #303030 !important;
      box-shadow: none !important;
    }

    ::v-deep .ant-table-thead > tr > th {
      background: #141414;
      color: rgba(255, 255, 255, 0.72);
      border-color: #303030 !important;
    }

    ::v-deep .ant-table-tbody > tr > td {
      color: rgba(255, 255, 255, 0.74);
      border-color: #282828 !important;
      box-shadow: none !important;
    }

    ::v-deep .ant-table-tbody > tr:hover > td,
    ::v-deep .bt-tuner-row--active td {
      background: #1f2a33 !important;
    }

    ::v-deep .ant-pagination-item,
    ::v-deep .ant-pagination-prev .ant-pagination-item-link,
    ::v-deep .ant-pagination-next .ant-pagination-item-link {
      background: #181818;
      border-color: #303030;
      color: rgba(255, 255, 255, 0.68);
    }

    ::v-deep .ant-pagination-item a {
      color: rgba(255, 255, 255, 0.68);
    }

    ::v-deep .ant-pagination-item-active {
      background: #0f5fb8;
      border-color: var(--primary-color-active, #177ddc);
    }

    ::v-deep .ant-pagination-item-active a {
      color: #fff;
    }

    ::v-deep .ant-badge-status-text {
      color: rgba(255, 255, 255, 0.66) !important;
    }
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
    background: transparent;
    color: rgba(255, 255, 255, 0.52);

    strong {
      color: rgba(255, 255, 255, 0.88);
    }
  }

  .target-summary__divider {
    background: rgba(255, 255, 255, 0.12);
  }

  .run-field--note {
    background: rgba(24, 144, 255, 0.09);
    color: #69c0ff;
  }

  .run-field--boundary-note {
    background: rgba(82, 196, 26, 0.1);
    color: #95de64;
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
    background: var(--primary-color-active, #177ddc);
    border-color: var(--primary-color-active, #177ddc);
  }
}

@media (max-width: 1280px) {
  .script-workspace {
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
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

  .script-select {
    width: 100%;
    max-width: none;
  }

  .script-select-label {
    width: 100%;
    line-height: 1.4;
  }

  .run-control,
  .run-control--symbol,
  .run-control--timeframe {
    max-width: none;
  }

  .run-target-grid,
  .run-form-grid {
    grid-template-columns: 1fr;
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

.script-version-drawer--dark {
  .ant-drawer-content {
    background: #181818;
  }

  .ant-drawer-header {
    background: #181818;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .ant-drawer-title,
  .ant-drawer-close {
    color: rgba(255, 255, 255, 0.88);
  }

  .code-version-toolbar {
    color: rgba(255, 255, 255, 0.58);
  }

  .code-version-item {
    background: #141414;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .code-version-item__main {
    strong {
      color: rgba(255, 255, 255, 0.88);
    }

    span,
    small {
      color: rgba(255, 255, 255, 0.52);
    }
  }

  .code-version-preview {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .code-version-preview__head {
    background: #141414;
    border-color: rgba(255, 255, 255, 0.08);

    strong {
      color: rgba(255, 255, 255, 0.88);
    }
  }
}
</style>
