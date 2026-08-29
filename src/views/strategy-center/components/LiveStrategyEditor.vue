<template>
  <a-modal
    :visible="visible"
    :title="modalTitle"
    :width="880"
    :mask-closable="false"
    :confirm-loading="saving"
    class="live-strategy-editor"
    :wrap-class-name="isDarkTheme ? 'live-strategy-editor-wrap theme-dark' : 'live-strategy-editor-wrap'"
    @cancel="close">
    <a-steps :current="step" size="small" class="editor-steps">
      <a-step :title="$t('strategyV2.sourceTitle')" />
      <a-step :title="$t('strategyV2.runtimeTitle')" />
      <a-step :title="$t('trading-assistant.form.scriptStepSignalLive')" />
    </a-steps>

    <a-spin :spinning="loading">
      <section v-show="step === 0" class="editor-section">
        <a-alert
          show-icon
          type="info"
          :message="$t('trading-assistant.form.scriptSourceTitle')"
          :description="$t('trading-assistant.form.scriptSourceHint')" />
        <a-form layout="vertical" class="editor-form editor-form--source">
          <a-form-item :label="$t('trading-assistant.form.scriptSource')" required>
            <a-select
              v-model="model.scriptSourceId"
              show-search
              option-filter-prop="children"
              :loading="loadingSources"
              :placeholder="$t('trading-assistant.form.scriptSourcePlaceholder')"
              @change="loadSourceDetail">
              <a-select-option v-for="source in sources" :key="String(source.id)" :value="String(source.id)">
                {{ source.name || source.title || source.strategy_name || `#${source.id}` }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <div v-if="model.scriptSourceId" class="source-summary">
            <div class="source-summary__icon"><a-icon type="code" /></div>
            <div>
              <div class="source-summary__title">
                <strong>{{ sourceDetail.name || sourceDetail.title || sourceDetail.strategy_name }}</strong>
                <a-tag>{{ sourceTypeLabel(sourceDetail) }}</a-tag>
              </div>
              <p>{{ sourceDetail.description || sourceMetadata.description || $t('trading-assistant.form.scriptSourceHint') }}</p>
              <span>{{ $t('strategyV2.frequency') }} · {{ manifestFrequency }}</span>
              <span v-if="parameterDefinitions.length">{{ $t('trading-assistant.editor.paramsTab') }} · {{ parameterDefinitions.length }}</span>
            </div>
          </div>
          <a-alert
            v-if="model.scriptSourceId && sourceContractError"
            show-icon
            type="error"
            :message="$t('strategyV2.compileFailed')" />
          <div v-if="hasCurrentContract" class="strategy-v2-summary">
            <div class="strategy-v2-summary__head"><a-tag color="green">{{ $t('strategyV2.apiBadge') }}</a-tag><strong>{{ $t('strategyV2.manifestTitle') }}</strong></div>
            <p>{{ $t('strategyV2.manifestHint') }}</p>
            <div class="strategy-v2-summary__grid">
              <span><em>{{ $t('strategyV2.strategyType') }}</em><b>{{ $t(`strategyV2.${strategyManifest.strategyType === 'portfolio' ? 'portfolio' : 'cta'}`) }}</b></span>
              <span><em>{{ $t('strategyV2.universe') }}</em><b>{{ manifestUniverseLabel }}</b></span>
              <span><em>{{ $t('strategyV2.frequency') }}</em><b>{{ manifestFrequency }}</b></span>
              <span><em>{{ $t('strategyV2.markets') }}</em><b>{{ manifestMarkets }}</b></span>
            </div>
          </div>
          <div v-if="parameterDefinitions.length" class="parameter-panel parameter-panel--source">
            <div class="parameter-panel__head">
              <div>
                <strong>{{ $t('trading-assistant.editor.paramsTab') }}</strong>
                <span>{{ $t('trading-assistant.editor.codeParamsDesc') }}</span>
              </div>
              <a-tag>{{ parameterDefinitions.length }}</a-tag>
            </div>
            <div class="parameter-grid">
              <a-form-item v-for="param in parameterDefinitions" :key="param.name" :label="parameterLabel(param)">
                <a-switch
                  v-if="param.type === 'boolean'"
                  :checked="Boolean(model.templateParams[param.name])"
                  @change="value => setParameter(param.name, value)" />
                <a-select
                  v-else-if="param.type === 'select' && Array.isArray(param.options)"
                  :value="model.templateParams[param.name]"
                  @change="value => setParameter(param.name, value)">
                  <a-select-option v-for="option in param.options" :key="String(option.value != null ? option.value : option)" :value="option.value != null ? option.value : option">
                    {{ option.label || option.value || option }}
                  </a-select-option>
                </a-select>
                <a-input-number
                  v-else-if="['integer', 'number', 'percent'].includes(param.type)"
                  :value="model.templateParams[param.name]"
                  :min="param.min"
                  :max="param.max"
                  :step="param.step || (param.type === 'integer' ? 1 : 0.01)"
                  :precision="param.type === 'integer' ? 0 : undefined"
                  @change="value => setParameter(param.name, value)" />
                <a-input
                  v-else
                  :value="model.templateParams[param.name]"
                  @input="value => setParameter(param.name, value && value.target ? value.target.value : value)" />
              </a-form-item>
            </div>
          </div>
        </a-form>
      </section>

      <section v-show="step === 1" class="editor-section">
        <a-form layout="vertical" class="editor-form">
          <a-form-item :label="$t('trading-assistant.form.strategyName')" required>
            <a-input v-model.trim="model.name" :placeholder="$t('trading-assistant.placeholders.inputStrategyName')" />
          </a-form-item>
          <template>
            <a-alert show-icon type="info" :message="$t('strategyV2.runtimeTitle')" :description="$t('strategyV2.runtimeHint')" />
            <a-form-item :label="$t(capitalIsMargin ? 'trading-assistant.form.initialMargin' : 'trading-assistant.form.initialCapital')" required>
              <a-input-number v-model="model.initialCapital" :min="1" :max="1000000000" :precision="2" :step="1000" />
              <div v-if="capitalIsMargin" class="field-hint field-hint--notional">
                {{ $t('trading-assistant.form.marginNotionalCapacity', {
                  margin: formattedInitialCapital,
                  leverage: effectiveLeverage,
                  notional: formattedNotionalCapacity
                }) }}
              </div>
            </a-form-item>
            <a-form-item :label="$t('strategyV2.leverageEnabled')">
              <a-switch v-model="model.leverageEnabled" :disabled="!supportsStrategyV2Leverage" />
              <div v-if="!supportsStrategyV2Leverage" class="field-hint">{{ $t('strategyV2.leverageCryptoSwapOnly') }}</div>
            </a-form-item>
            <a-form-item v-if="model.leverageEnabled" :label="$t('strategyV2.leverageMultiplier')" required>
              <a-input-number v-model="model.leverage" :min="1" :max="Number(strategyManifest.maxLeverage || 1)" :step="1" />
            </a-form-item>
            <div v-if="requiresDirectionMode" class="account-risk-panel">
              <div class="account-risk-panel__head">
                <strong>{{ $t('strategyCenter.editor.accountRiskTitle') }}</strong>
                <span>{{ $t('strategyCenter.editor.accountRiskHint') }}</span>
              </div>
              <div class="account-risk-grid">
                <a-form-item :label="$t('strategyCenter.editor.maxGrossNotional')">
                  <a-input-number v-model="model.accountRisk.max_gross_notional" :min="0" :precision="2" />
                </a-form-item>
                <a-form-item :label="$t('strategyCenter.editor.maxSymbolGrossNotional')">
                  <a-input-number v-model="model.accountRisk.max_symbol_gross_notional" :min="0" :precision="2" />
                </a-form-item>
                <a-form-item :label="$t('strategyCenter.editor.maxMarginEstimate')">
                  <a-input-number v-model="model.accountRisk.max_margin_estimate" :min="0" :precision="2" />
                </a-form-item>
                <a-form-item :label="$t('strategyCenter.editor.maxGrossLeverage')">
                  <a-input-number v-model="model.accountRisk.max_gross_leverage" :min="0" :precision="2" />
                </a-form-item>
                <a-form-item :label="$t('strategyCenter.editor.maxRoundTripFee')">
                  <a-input-number v-model="model.accountRisk.max_round_trip_fee" :min="0" :precision="2" />
                </a-form-item>
                <a-form-item :label="$t('strategyCenter.editor.maxFundingPerInterval')">
                  <a-input-number v-model="model.accountRisk.max_funding_per_interval" :min="0" :precision="4" />
                </a-form-item>
              </div>
              <div class="field-hint">{{ $t('strategyCenter.editor.accountRiskAutoHint') }}</div>
            </div>
          </template>
        </a-form>
      </section>

      <section v-show="step === 2" class="editor-section">
        <a-form layout="vertical" class="editor-form">
          <a-form-item :label="$t('trading-assistant.form.executionMode')">
            <a-radio-group v-model="model.executionMode" button-style="solid">
              <a-radio-button value="signal">{{ $t('trading-assistant.form.executionModeSignal') }}</a-radio-button>
              <a-radio-button value="live" :disabled="!supportsLive">{{ $t('trading-assistant.form.executionModeLive') }}</a-radio-button>
            </a-radio-group>
            <div class="field-hint">{{ $t(model.executionMode === 'live' ? 'trading-assistant.form.executionModeLiveDesc' : 'trading-assistant.form.executionModeSignalDesc') }}</div>
          </a-form-item>

          <a-alert
            show-icon
            type="info"
            :message="$t(model.executionMode === 'live' ? 'strategyV2.liveSourceHint' : 'strategyV2.signalSourceHint')" />

          <template v-if="model.executionMode === 'live'">
            <a-alert show-icon type="warning" :message="$t('trading-assistant.liveDisclaimer.title')" :description="$t('trading-assistant.liveDisclaimer.content')" />
            <a-checkbox v-model="model.disclaimer" class="disclaimer-check">{{ $t('trading-assistant.liveDisclaimer.agree') }}</a-checkbox>
            <a-form-item :label="$t('trading-assistant.form.savedCredential')" required>
              <a-select
                v-model="model.credentialId"
                :loading="loadingCredentials"
                :placeholder="$t('trading-assistant.placeholders.selectSavedCredential')">
                <a-select-option v-for="credential in compatibleCredentials" :key="credential.id" :value="credential.id">
                  {{ credentialLabel(credential) }}
                </a-select-option>
              </a-select>
              <div v-if="!compatibleCredentials.length" class="field-hint field-hint--warning">
                {{ $t('trading-assistant.noCredentialForLive.title') }}
                <router-link :to="{ path: '/broker-accounts' }">{{ $t('trading-assistant.form.goToProfile') }}</router-link>
              </div>
            </a-form-item>
            <a-form-item
              v-if="requiresDirectionMode"
              :label="$t('strategyCenter.editor.directionMode')"
              :required="requiresDirectionFallback">
              <template v-if="manifestDirectionMode">
                <a-tag :color="directionModeColor(manifestDirectionMode)">
                  {{ directionModeLabel(manifestDirectionMode) }}
                </a-tag>
                <div class="field-hint">{{ $t('strategyCenter.editor.directionModeDetectedHint') }}</div>
              </template>
              <template v-else>
                <a-radio-group v-model="model.directionMode" button-style="solid" class="full-radio-group">
                  <a-radio-button value="long_only">{{ $t('strategyCenter.editor.directionLongOnly') }}</a-radio-button>
                  <a-radio-button value="short_only">{{ $t('strategyCenter.editor.directionShortOnly') }}</a-radio-button>
                  <a-radio-button value="both">{{ $t('strategyCenter.editor.directionBoth') }}</a-radio-button>
                  <a-radio-button value="neutral">{{ $t('strategyCenter.editor.directionNeutral') }}</a-radio-button>
                </a-radio-group>
                <div class="field-hint field-hint--warning">{{ $t('strategyCenter.editor.directionModeLegacyHint') }}</div>
              </template>
            </a-form-item>
            <div v-if="selectedCredentialExchange" class="execution-summary">
              <span>{{ $t('trading-assistant.form.exchange') }}</span>
              <strong>{{ exchangeName(selectedCredentialExchange) }}</strong>
            </div>
          </template>

          <a-form-item :label="$t('trading-assistant.form.notifyChannels')" required>
            <a-checkbox-group v-model="model.notifyChannels" class="notification-grid">
              <a-checkbox v-for="channel in notificationChannels" :key="channel" :value="channel">
                {{ $t(`trading-assistant.notify.${channel}`) }}
              </a-checkbox>
            </a-checkbox-group>
            <div class="field-hint">{{ $t('trading-assistant.form.notifyChannelsHint') }}</div>
          </a-form-item>
        </a-form>
      </section>
    </a-spin>

    <template #footer>
      <a-button @click="close">{{ $t('trading-assistant.form.cancel') }}</a-button>
      <a-button v-if="step > 0" @click="step -= 1">{{ $t('trading-assistant.form.prev') }}</a-button>
      <a-button v-if="step < 2" type="primary" :loading="step === 0 && sourceContractLoading" @click="next">{{ $t('trading-assistant.form.next') }}</a-button>
      <a-button v-else type="primary" :loading="saving" @click="save">
        {{ $t(isEdit ? 'trading-assistant.form.confirmEdit' : 'trading-assistant.form.confirmCreate') }}
      </a-button>
    </template>
  </a-modal>
</template>

<script>
import { compileScriptSource, createStrategy, getScriptSourceDetail, getScriptSourceList, getStrategyDetail, updateStrategy } from '@/api/strategy'
import { mapState } from 'vuex'
import { listExchangeCredentials } from '@/api/credentials'
import { getNotificationSettings } from '@/api/user'
import { formatExchangeCredentialLabel, getExchangeDisplayName } from '@/utils/exchangeCredential'
import { supportsLiveExecutionMode, credentialMatchesLiveStrategy } from '@/utils/liveTradingEligibility'
import { extractScriptParamsFromCode } from '@/views/strategy-ide/components/scriptTemplateCatalog'

const DEFAULT_CHANNELS = ['browser', 'email']
const DIRECTION_MODE_ALIASES = {
  long: 'long_only',
  longonly: 'long_only',
  short: 'short_only',
  shortonly: 'short_only',
  dual: 'both',
  hedged: 'both',
  bidirectional: 'both'
}
const DIRECTION_MODES = new Set(['long_only', 'short_only', 'both', 'neutral'])
const normalizeDirectionMode = value => {
  const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_')
  const result = DIRECTION_MODE_ALIASES[normalized] || normalized
  return DIRECTION_MODES.has(result) ? result : ''
}
const directionModePositionSide = value => {
  const mode = normalizeDirectionMode(value)
  if (mode === 'long_only') return 'long'
  if (mode === 'short_only') return 'short'
  if (mode === 'both' || mode === 'neutral') return 'neutral'
  return ''
}
const notificationTargets = settings => ({
  email: settings.email || '',
  phone: settings.phone || '',
  telegram: settings.telegram_chat_id || '',
  telegram_bot_token: settings.telegram_bot_token || '',
  discord: settings.discord_webhook || '',
  webhook: settings.webhook_url || '',
  webhook_token: settings.webhook_token || ''
})

export default {
  name: 'LiveStrategyEditor',
  props: {
    visible: { type: Boolean, default: false },
    mode: { type: String, default: 'create' },
    strategyId: { type: Number, default: null },
    initialConfig: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      step: 0,
      loading: false,
      saving: false,
      loadingSources: false,
      loadingCredentials: false,
      sources: [],
      credentials: [],
      sourceDetail: {},
      compiledManifest: {},
      sourceContractLoading: false,
      sourceContractError: false,
      originalStrategy: null,
      notificationSettings: {},
      notificationChannels: ['browser', 'email', 'telegram', 'discord', 'webhook', 'phone'],
      model: this.defaultModel()
    }
  },
  computed: {
    ...mapState({ navTheme: state => state.app.theme }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    isEdit () { return this.mode === 'edit' },
    modalTitle () {
      return this.$t(this.isEdit ? 'trading-assistant.editStrategy' : 'trading-assistant.createStrategy')
    },
    marketCategory () {
      const markets = Array.isArray(this.strategyManifest.markets) ? this.strategyManifest.markets : []
      return markets.length === 1 ? String(markets[0]) : 'Mixed'
    },
    isPortfolioStrategy () {
      return this.strategyManifest.strategyType === 'portfolio'
    },
    strategyManifest () {
      return this.parseObject(this.compiledManifest)
    },
    hasCurrentContract () {
      return Object.keys(this.strategyManifest).length > 0
    },
    manifestFrequency () {
      const subscriptions = Array.isArray(this.strategyManifest.subscriptions) ? this.strategyManifest.subscriptions : []
      return String((subscriptions[0] && subscriptions[0].frequency) || '1d')
    },
    manifestMarkets () {
      const markets = Array.isArray(this.strategyManifest.markets) ? this.strategyManifest.markets : []
      return markets.join(', ') || '-'
    },
    manifestUniverseLabel () {
      const universe = this.parseObject(this.strategyManifest.universe)
      if (universe.reference) return this.$t('strategyV2.dynamicUniverse', { reference: universe.reference })
      const instruments = Array.isArray(universe.instruments) ? universe.instruments : []
      return this.$t('strategyV2.symbolCount', { count: instruments.length })
    },
    supportsStrategyV2Leverage () {
      if (!this.strategyManifest.leverageAllowed) return false
      const universe = this.parseObject(this.strategyManifest.universe)
      const instruments = Array.isArray(universe.instruments) ? universe.instruments : []
      return instruments.length > 0 && instruments.every(item => {
        const marketType = String(item.market_type || '').toLowerCase()
        return String(item.market || '') === 'Crypto' && marketType === 'swap'
      })
    },
    capitalIsMargin () {
      return this.supportsStrategyV2Leverage
    },
    effectiveLeverage () {
      if (!this.capitalIsMargin || !this.model.leverageEnabled) return 1
      return Math.max(1, Number(this.model.leverage) || 1)
    },
    formattedInitialCapital () {
      return (Math.max(0, Number(this.model.initialCapital) || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    },
    formattedNotionalCapacity () {
      const value = Math.max(0, Number(this.model.initialCapital) || 0) * this.effectiveLeverage
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    },
    supportsLive () {
      return supportsLiveExecutionMode(this.strategyManifest)
    },
    requiresDirectionMode () {
      if (this.marketCategory !== 'Crypto') return false
      const universe = this.parseObject(this.strategyManifest.universe)
      const instruments = Array.isArray(universe.instruments) ? universe.instruments : []
      return instruments.length > 0 && instruments.every(item => {
        return String(item.market_type || '').toLowerCase() === 'swap'
      })
    },
    manifestDirectionMode () {
      const metadata = this.parseObject(this.strategyManifest.metadata)
      const explicit = normalizeDirectionMode(
        this.strategyManifest.directionMode ||
        this.strategyManifest.direction_mode ||
        metadata.direction_mode ||
        metadata.directionMode ||
        metadata.trade_direction ||
        metadata.position_side ||
        metadata.side
      )
      return explicit || this.inferLegacyDirectionMode()
    },
    effectiveDirectionMode () {
      return this.manifestDirectionMode || normalizeDirectionMode(this.model.directionMode)
    },
    requiresDirectionFallback () {
      return this.requiresDirectionMode && !this.manifestDirectionMode
    },
    sourceMetadata () {
      return this.parseObject(this.sourceDetail.metadata)
    },
    sourceParameterValues () {
      return {
        ...this.parseObject(this.sourceDetail.template_params)
      }
    },
    parameterDefinitions () {
      const schema = this.parseObject(this.sourceDetail.param_schema)
      if (Array.isArray(schema.params) && schema.params.length) return schema.params.filter(item => item && item.name)
      const inferred = extractScriptParamsFromCode(this.sourceDetail.code || '')
      if (inferred && Array.isArray(inferred.params) && inferred.params.length) return inferred.params
      return Object.keys(this.sourceParameterValues).map(name => ({
        name,
        type: Number.isInteger(this.sourceParameterValues[name]) ? 'integer' : (typeof this.sourceParameterValues[name] === 'number' ? 'number' : 'text'),
        default: this.sourceParameterValues[name]
      }))
    },
    compatibleCredentials () {
      return this.credentials.filter(credential =>
        credentialMatchesLiveStrategy(this.strategyManifest, credential.exchange_id)
      )
    },
    selectedCredentialExchange () {
      const credential = this.credentials.find(item => String(item.id) === String(this.model.credentialId))
      return String((credential && credential.exchange_id) || '')
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler (value) {
        if (value) this.initialize()
      }
    }
  },
  methods: {
    defaultModel () {
      const config = this.initialConfig || {}
      return {
        scriptSourceId: config.sourceId ? String(config.sourceId) : '',
        name: '',
        timeframe: '1d',
        initialCapital: Number(config.initial_capital) > 0 ? Number(config.initial_capital) : 1000,
        leverageEnabled: Boolean(config.leverage_enabled),
        leverage: Number(config.leverage) > 0 ? Number(config.leverage) : 1,
        executionMode: 'signal',
        credentialId: undefined,
        directionMode: '',
        accountRisk: {
          max_gross_notional: 0,
          max_symbol_gross_notional: 0,
          max_margin_estimate: 0,
          max_gross_leverage: 0,
          max_round_trip_fee: 0,
          max_funding_per_interval: 0
        },
        disclaimer: false,
        notifyChannels: [...DEFAULT_CHANNELS],
        templateParams: {}
      }
    },
    parseObject (value) {
      if (value && typeof value === 'object' && !Array.isArray(value)) return value
      if (typeof value !== 'string' || !value.trim()) return {}
      try {
        const parsed = JSON.parse(value)
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
      } catch (error) {
        return {}
      }
    },
    async initialize () {
      this.step = 0
      this.model = this.defaultModel()
      this.sourceDetail = {}
      this.compiledManifest = {}
      this.sourceContractError = false
      this.originalStrategy = null
      this.loading = true
      try {
        await Promise.all([
          this.loadSources(),
          this.loadCredentials(),
          this.loadNotifications()
        ])
        if (this.isEdit && this.strategyId) await this.loadStrategy()
        else if (this.model.scriptSourceId) await this.loadSourceDetail(this.model.scriptSourceId)
      } finally {
        this.loading = false
      }
    },
    async loadSources () {
      this.loadingSources = true
      try {
        const res = await getScriptSourceList()
        const data = res && res.data
        this.sources = Array.isArray(data) ? data : ((data && data.items) || [])
      } finally {
        this.loadingSources = false
      }
    },
    async loadCredentials () {
      this.loadingCredentials = true
      try {
        const res = await listExchangeCredentials({ user_id: 1 })
        this.credentials = res && res.code === 1 && res.data ? (res.data.items || []) : []
      } finally {
        this.loadingCredentials = false
      }
    },
    async loadNotifications () {
      try {
        const res = await getNotificationSettings()
        if (res && res.code === 1 && res.data) {
          this.notificationSettings = res.data
          if (Array.isArray(res.data.default_channels) && res.data.default_channels.length) {
            this.model.notifyChannels = [...res.data.default_channels]
          }
        }
      } catch (error) {}
    },
    async loadSourceDetail (id, applyDefaults = true) {
      if (!id) return
      const sourceId = String(id)
      if (applyDefaults && !this.isEdit) this.model.directionMode = ''
      this.compiledManifest = {}
      this.sourceContractError = false
      this.sourceContractLoading = true
      const contractRequest = compileScriptSource({ sourceId: Number(sourceId) })
        .then(response => ({ response }))
        .catch(error => ({ error }))
      try {
        const res = await getScriptSourceDetail(sourceId)
        const contractResult = await contractRequest
        if (String(this.model.scriptSourceId) !== sourceId) return
        this.sourceDetail = (res && res.data) || res || {}
        const manifest = this.parseObject(contractResult.response && contractResult.response.data && contractResult.response.data.manifest)
        this.compiledManifest = manifest
        this.sourceContractError = Boolean(contractResult.error) || !Object.keys(manifest).length
        if (!this.model.name || (applyDefaults && !this.isEdit)) {
          this.model.name = this.sourceDetail.name || this.sourceDetail.title || ''
        }
        if (applyDefaults && !this.isEdit) {
          this.model.timeframe = this.manifestFrequency
          this.model.templateParams = this.buildParameterValues(this.sourceParameterValues)
          this.model.leverageEnabled = false
          this.model.leverage = 1
          this.normalizeExecutionFields()
        }
      } catch (error) {
        if (String(this.model.scriptSourceId) === sourceId) this.sourceContractError = true
        throw error
      } finally {
        if (String(this.model.scriptSourceId) === sourceId) this.sourceContractLoading = false
      }
    },
    async loadStrategy () {
      const res = await getStrategyDetail(this.strategyId)
      const strategy = (res && res.data) || res || {}
      this.originalStrategy = strategy
      const config = this.parseObject(strategy.trading_config)
      const accountRisk = this.parseObject(config.account_risk)
      this.model = {
        ...this.defaultModel(),
        scriptSourceId: String(config.script_source_id || ''),
        name: strategy.strategy_name || '',
        timeframe: strategy.timeframe || '1d',
        initialCapital: Number(config.initial_capital || strategy.initial_capital || 10000),
        leverageEnabled: Boolean(config.leverage_enabled),
        leverage: Number(config.leverage || 1),
        executionMode: strategy.execution_mode === 'live' ? 'live' : 'signal',
        credentialId: config.credential_id || undefined,
        directionMode: normalizeDirectionMode(config.direction_mode || config.position_side),
        accountRisk: {
          ...this.defaultModel().accountRisk,
          ...accountRisk
        },
        disclaimer: strategy.execution_mode === 'live',
        notifyChannels: (strategy.notification_config && strategy.notification_config.channels) || [...DEFAULT_CHANNELS],
        templateParams: { ...this.parseObject(config.params) }
      }
      await this.loadSourceDetail(this.model.scriptSourceId, false)
      this.model.templateParams = this.buildParameterValues({
        ...this.sourceParameterValues,
        ...this.model.templateParams
      })
      this.normalizeExecutionFields()
    },
    normalizeExecutionFields () {
      if (!this.supportsStrategyV2Leverage) {
        this.model.leverageEnabled = false
        this.model.leverage = 1
      } else if (this.model.leverage < 1) {
        this.model.leverage = 1
      }
    },
    credentialLabel (credential) {
      return formatExchangeCredentialLabel(credential)
    },
    inferLegacyDirectionMode () {
      const metadata = this.parseObject(this.strategyManifest.metadata)
      const explicit = normalizeDirectionMode(metadata.position_side || metadata.trade_direction || metadata.side)
      if (explicit) return explicit
      const code = String(this.sourceDetail.code || '')
      const sides = new Set(Array.from(code.matchAll(/position_side\s*=\s*['"](long|short)['"]/g), match => match[1]))
      if (sides.has('long') && sides.has('short')) return 'both'
      if (sides.has('long')) return 'long_only'
      if (sides.has('short')) return 'short_only'
      const match = code.match(/^\s*DIRECTION\s*=\s*(-?1(?:\.0)?)\s*$/m)
      if (!match) return ''
      return Number(match[1]) < 0 ? 'short_only' : 'long_only'
    },
    directionModeLabel (mode) {
      return this.$t(`strategyCenter.editor.directionMode.${normalizeDirectionMode(mode) || 'unknown'}`)
    },
    directionModeColor (mode) {
      return {
        long_only: 'green',
        short_only: 'red',
        both: 'blue',
        neutral: 'purple'
      }[normalizeDirectionMode(mode)] || 'default'
    },
    exchangeName (exchangeId) {
      return getExchangeDisplayName(exchangeId)
    },
    sourceTypeLabel (source) {
      const metadata = this.parseObject(source && source.metadata)
      const manifest = source === this.sourceDetail
        ? this.strategyManifest
        : this.parseObject(metadata.strategy_manifest)
      return this.$t(manifest.strategyType === 'portfolio'
        ? 'strategyCenter.editor.portfolioStrategy'
        : 'strategyCenter.editor.ctaStrategy')
    },
    parameterLabel (param) {
      const key = `trading-assistant.templateParam.${param.name}.label`
      return this.$te && this.$te(key) ? this.$t(key) : String(param.name || '').replace(/_/g, ' ')
    },
    buildParameterValues (values) {
      const result = {}
      this.parameterDefinitions.forEach(param => {
        const value = values[param.name]
        result[param.name] = value !== undefined ? value : param.default
      })
      return result
    },
    setParameter (name, value) {
      this.$set(this.model.templateParams, name, value)
    },
    async next () {
      if (this.step === 0 && !this.model.scriptSourceId) {
        this.$message.warning(this.$t('trading-assistant.form.scriptSourceRequired'))
        return
      }
      if (this.step === 0 && !this.hasCurrentContract) {
        await this.loadSourceContract(this.model.scriptSourceId)
      }
      if (this.step === 0 && !this.hasCurrentContract) {
        this.$message.warning(this.$t('strategyV2.sourceContractRequired'))
        return
      }
      if (this.step === 1) {
        if (!this.model.name) {
          this.$message.warning(this.$t('trading-assistant.validation.strategyNameRequired'))
          return
        }
        if (!(Number(this.model.initialCapital) > 0)) {
          this.$message.warning(this.$t('trading-assistant.validation.initialCapitalRequired'))
          return
        }
      }
      this.step += 1
    },
    async loadSourceContract (id) {
      if (!id) return false
      const sourceId = String(id)
      this.sourceContractLoading = true
      this.sourceContractError = false
      try {
        const res = await compileScriptSource({ sourceId: Number(sourceId) })
        if (String(this.model.scriptSourceId) !== sourceId) return false
        const manifest = this.parseObject(res && res.data && res.data.manifest)
        this.compiledManifest = manifest
        this.sourceContractError = !Object.keys(manifest).length
        return !this.sourceContractError
      } catch (error) {
        if (String(this.model.scriptSourceId) === sourceId) {
          this.compiledManifest = {}
          this.sourceContractError = true
        }
        return false
      } finally {
        if (String(this.model.scriptSourceId) === sourceId) this.sourceContractLoading = false
      }
    },
    validateFinal () {
      if (!this.model.notifyChannels.length) {
        this.$message.warning(this.$t('trading-assistant.validation.notifyChannelRequired'))
        return false
      }
      if (this.model.executionMode === 'live' && !this.model.disclaimer) {
        this.$message.warning(this.$t('trading-assistant.liveDisclaimer.required'))
        return false
      }
      if (this.model.executionMode === 'live' && !this.model.credentialId) {
        this.$message.warning(this.$t('trading-assistant.validation.credentialRequired'))
        return false
      }
      if (this.model.executionMode === 'live' && this.requiresDirectionFallback && !this.model.directionMode) {
        this.$message.warning(this.$t('strategyCenter.editor.directionModeRequired'))
        return false
      }
      return true
    },
    async save () {
      if (!this.validateFinal()) return
      this.saving = true
      try {
        const payload = {
          sourceId: Number(this.model.scriptSourceId),
          name: this.model.name,
          initialCapital: Number(this.model.initialCapital),
          leverageEnabled: Boolean(this.model.leverageEnabled && this.supportsStrategyV2Leverage),
          leverage: this.model.leverageEnabled ? Number(this.model.leverage || 1) : 1,
          executionMode: this.model.executionMode,
          credentialId: this.model.executionMode === 'live' ? this.model.credentialId : undefined,
          directionMode: this.requiresDirectionMode ? this.effectiveDirectionMode : undefined,
          positionSide: this.requiresDirectionMode ? directionModePositionSide(this.effectiveDirectionMode) : undefined,
          accountRisk: this.requiresDirectionMode ? { ...this.model.accountRisk } : undefined,
          params: { ...this.model.templateParams },
          notificationChannels: [...this.model.notifyChannels],
          notificationTargets: notificationTargets(this.notificationSettings)
        }
        const res = this.isEdit
          ? await updateStrategy(this.strategyId, payload)
          : await createStrategy(payload)
        if (!res || res.code !== 1) throw new Error((res && res.msg) || '')
        this.$message.success(this.$t(this.isEdit ? 'trading-assistant.messages.updateSuccess' : 'trading-assistant.messages.createSuccess'))
        this.$emit('saved')
      } catch (error) {
        this.$message.error(error.backendMessage || error.message || this.$t(this.isEdit ? 'trading-assistant.messages.updateFailed' : 'trading-assistant.messages.createFailed'))
      } finally {
        this.saving = false
      }
    },
    close () {
      if (!this.saving) this.$emit('close')
    }
  }
}
</script>

<style lang="less">
.live-strategy-editor-wrap {
  .ant-modal { top: 4vh; height: 92vh; padding-bottom: 0; }
  .ant-modal-content { display: flex; flex-direction: column; height: 100%; overflow: hidden; border-radius: 12px; box-shadow: 0 24px 70px rgba(15, 23, 42, .22); }
  .ant-modal-header { padding: 19px 26px; border-bottom-color: #e8ebf0; }
  .ant-modal-title { color: #18202c; font-size: 18px; font-weight: 700; }
  .ant-modal,
  .ant-modal-content,
  .ant-modal-body,
  .ant-spin-nested-loading,
  .ant-spin-container,
  .editor-section { max-width: 100%; }
  .ant-modal-body { flex: 1 1 auto; min-height: 0; max-height: none; overflow-x: hidden !important; overflow-y: auto; padding: 24px 28px 20px; overscroll-behavior: contain; }
  .ant-spin-container { overflow-x: hidden; }
  .ant-modal-footer { padding: 14px 26px; border-top-color: #e8ebf0; }
  .ant-modal-footer .ant-btn { min-width: 86px; height: 36px; border-radius: 6px; }
  .editor-steps { margin: 2px 4px 24px; }
  .ant-steps-item-process .ant-steps-item-icon { border-color: var(--primary-color, #1890ff); background: var(--primary-color, #1890ff); }
  .ant-steps-item-finish .ant-steps-item-icon { border-color: var(--primary-color, #1890ff); }
  .ant-steps-item-finish .ant-steps-item-icon > .ant-steps-icon,
  .ant-alert-info .ant-alert-icon { color: var(--primary-color, #1890ff); }
  .ant-steps-item-finish > .ant-steps-item-container > .ant-steps-item-tail::after { background: var(--primary-color, #1890ff); }
  .editor-section { min-height: 360px; }
  .editor-form { margin-top: 20px; }
  .editor-form--source { max-width: 760px; margin-right: auto; margin-left: auto; }
  .editor-form .ant-form-item { margin-bottom: 17px; }
  .editor-form .ant-form-item-label { padding-bottom: 5px; font-weight: 600; }
  .editor-form .ant-input,
  .editor-form .ant-select-selection,
  .editor-form .ant-input-number { min-height: 38px; border-radius: 6px; }
  .editor-form .ant-select-selection__rendered { line-height: 36px; }
  .editor-form .ant-input-number { width: 100%; }
  .source-summary { display: flex; gap: 14px; margin: 4px 0 16px; padding: 16px; border: 1px solid #e4e8ee; border-radius: 9px; background: #f8fafc; }
  .source-summary__title { display: flex; align-items: center; gap: 8px; }
  .source-summary__icon { display: flex; align-items: center; justify-content: center; flex: 0 0 42px; height: 42px; border-radius: 9px; background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, #fff); color: var(--primary-color, #1890ff); font-size: 19px; }
  .source-summary strong { display: block; margin-bottom: 4px; color: #202938; font-size: 15px; }
  .source-summary p { margin: 0 0 7px; color: #697586; font-size: 12px; line-height: 1.55; }
  .source-summary span { display: inline-flex; margin-right: 14px; color: #7c8796; font-size: 12px; }
  .strategy-v2-summary { margin: 0 0 16px; padding: 15px; border: 1px solid color-mix(in srgb, var(--primary-color, #52c41a) 28%, #e4e8ee); border-radius: 9px; background: color-mix(in srgb, var(--primary-color, #52c41a) 5%, #fff); }
  .strategy-v2-summary__head { display: flex; align-items: center; gap: 9px; color: #202938; }
  .strategy-v2-summary p { margin: 8px 0 12px; color: #697586; font-size: 12px; line-height: 1.55; }
  .strategy-v2-summary__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .strategy-v2-summary__grid span { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px; border-radius: 6px; background: rgba(100, 116, 139, .07); }
  .strategy-v2-summary__grid em { color: #7c8796; font-size: 11px; font-style: normal; }
  .strategy-v2-summary__grid b { color: #273142; font-size: 12px; overflow-wrap: anywhere; text-align: right; }
  .field-hint { margin-top: 6px; color: #7d8794; font-size: 12px; line-height: 1.5; }
  .field-hint--warning { color: #d48806; }
  .strategy-defaults, .execution-summary { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin: -2px 0 17px; padding: 11px 13px; border: 1px solid #e4e8ee; border-radius: 7px; background: #f8fafc; color: #727d8b; font-size: 12px; }
  .strategy-defaults strong, .execution-summary strong { color: #202938; font-size: 13px; }
  .full-radio-group { display: flex; width: 100%; }
  .full-radio-group .ant-radio-button-wrapper { flex: 1; text-align: center; }
  .parameter-panel { margin-top: 3px; padding: 16px 16px 2px; border: 1px solid #e4e8ee; border-radius: 9px; background: #fafbfc; }
  .parameter-panel--source { margin-top: 18px; }
  .parameter-panel__head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
  .parameter-panel__head strong { display: block; color: #202938; font-size: 14px; }
  .parameter-panel__head span { display: block; margin-top: 3px; color: #7d8794; font-size: 12px; }
  .parameter-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 16px; }
  .account-risk-panel { margin-top: 18px; padding: 16px 16px 4px; border: 1px solid #e4e8ee; border-radius: 9px; background: #fafbfc; }
  .account-risk-panel__head { margin-bottom: 14px; }
  .account-risk-panel__head strong { display: block; color: #202938; font-size: 14px; }
  .account-risk-panel__head span { display: block; margin-top: 4px; color: #7d8794; font-size: 12px; line-height: 1.5; }
  .account-risk-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 16px; }
  .disclaimer-check { margin: 16px 0 18px; }
  .notification-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px 16px; }
  .notification-grid .ant-checkbox-wrapper { margin-left: 0; }
  &.theme-dark {
    .ant-modal-content,
    .ant-modal-header,
    .ant-modal-footer { border-color: #2b2f35; background: #17191c; }
    .ant-modal-title,
    .source-summary strong,
    .parameter-panel__head strong,
    .account-risk-panel__head strong,
    .strategy-defaults strong,
    .execution-summary strong,
    .ant-form-item-label > label,
    .ant-steps-item-title { color: #eef0f3 !important; }
    .ant-steps-item-wait .ant-steps-item-title { color: #aab0b8 !important; }
    .ant-steps-item-process .ant-steps-item-title { color: #eef0f3 !important; }
    .ant-steps-item-finish .ant-steps-item-title { color: #cfd4da !important; }
    .source-summary,
    .strategy-v2-summary,
    .parameter-panel,
    .account-risk-panel,
    .strategy-defaults,
    .execution-summary { border-color: #30343a; background: #121416; }
    .source-summary__icon { background: color-mix(in srgb, var(--primary-color, #52c41a) 16%, #121416); color: var(--primary-color, #52c41a); }
    .source-summary p,
    .source-summary span,
    .field-hint,
    .parameter-panel__head span,
    .account-risk-panel__head span,
    .strategy-defaults,
    .execution-summary { color: #8c949f; }
    .strategy-v2-summary { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 32%, #30343a); background: color-mix(in srgb, var(--primary-color, #52c41a) 6%, #121416); }
    .strategy-v2-summary__head,
    .strategy-v2-summary__grid b { color: #eef0f3; }
    .strategy-v2-summary p,
    .strategy-v2-summary__grid em { color: #8c949f; }
    .strategy-v2-summary__grid span { background: rgba(255, 255, 255, .04); }
    .ant-input,
    .ant-input-number,
    .ant-input-number-input,
    .ant-select-selection { border-color: #34383f; background: #1c1f23; color: #eef0f3; }
    .ant-input::placeholder,
    .ant-select-selection__placeholder { color: #6f7782; }
    .ant-select-arrow,
    .ant-input-number-handler { color: #9299a3; }
    .ant-input-number-handler-wrap { border-color: #34383f; background: #1c1f23; }
    .ant-radio-button-wrapper { border-color: #34383f; background: #1c1f23; color: #aab0b8; }
    .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) { border-color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 18%, #1c1f23); color: var(--primary-color, #52c41a); box-shadow: -1px 0 0 0 var(--primary-color, #52c41a); }
    .ant-checkbox-wrapper,
    .ant-modal-close,
    .ant-steps-item-wait .ant-steps-item-icon > .ant-steps-icon { color: #aab0b8; }
    .ant-steps-item-wait .ant-steps-item-icon { border-color: #4a4f57; background: #22262b; }
    .ant-steps-item-tail::after { background: #34383f; }
    .ant-steps-item-process .ant-steps-item-icon { border-color: var(--primary-color, #52c41a); background: var(--primary-color, #52c41a); }
    .ant-steps-item-finish .ant-steps-item-icon { border-color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 10%, #17191c); }
    .ant-steps-item-finish .ant-steps-item-icon > .ant-steps-icon,
    .ant-alert-info .ant-alert-icon { color: var(--primary-color, #52c41a); }
    .ant-steps-item-finish > .ant-steps-item-container > .ant-steps-item-tail::after { background: var(--primary-color, #52c41a); }
    .ant-alert-info { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 34%, #29465d); background: color-mix(in srgb, var(--primary-color, #52c41a) 7%, #111820); }
    .ant-alert-info .ant-alert-message { color: #dfe4e9; }
    .ant-alert-info .ant-alert-description { color: #98a1ac; }
  }
}
@media (max-width: 640px) {
  .live-strategy-editor-wrap {
    .ant-modal { width: calc(100vw - 20px) !important; margin: 0 10px; }
    .ant-modal-body { padding: 18px; }
    .parameter-grid,
    .account-risk-grid,
    .notification-grid { grid-template-columns: 1fr; }
  }
}
</style>
