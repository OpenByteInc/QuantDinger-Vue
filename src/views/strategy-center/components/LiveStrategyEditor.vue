<template>
  <a-modal
    :visible="visible"
    :title="modalTitle"
    :width="960"
    :mask-closable="false"
    :confirm-loading="saving"
    class="live-strategy-editor live-strategy-editor--unified"
    :wrap-class-name="isDarkTheme ? 'live-strategy-editor-wrap theme-dark' : 'live-strategy-editor-wrap'"
    @cancel="close">
    <div class="editor-content-scroll">
      <a-spin :spinning="loading">
      <section class="editor-section editor-section--source">
        <a-form layout="vertical" class="editor-form editor-form--source">
          <div class="deploy-primary-grid">
            <a-form-item :label="$t('trading-assistant.form.scriptSource')" required>
              <a-select
                v-model="model.scriptSourceId"
                show-search
                option-filter-prop="children"
                :loading="loadingSources"
                :placeholder="$t('trading-assistant.form.scriptSourcePlaceholder')"
                @change="loadSourceDetail"
                @dropdownVisibleChange="onSourceDropdownVisibleChange">
                <a-select-option v-for="source in sources" :key="String(source.id)" :value="String(source.id)">
                  {{ source.name || source.title || source.strategy_name || `#${source.id}` }}
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item :label="$t('trading-assistant.form.strategyName')" required>
              <a-input v-model.trim="model.name" :disabled="!model.scriptSourceId" :placeholder="$t('trading-assistant.placeholders.inputStrategyName')" />
            </a-form-item>
          </div>
          <a-alert
            v-if="model.scriptSourceId && sourceContractError"
            show-icon
            type="error"
            :message="$t('strategyV2.compileFailed')" />
          <div v-if="hasCurrentContract" class="strategy-v2-summary">
            <div class="strategy-v2-summary__head">
              <div>
                <strong>{{ $t('strategyV2.deploymentContractTitle') }}</strong>
                <p>{{ manifestUniverseLabel }} · {{ manifestFrequency }}</p>
              </div>
              <div class="strategy-v2-summary__meta">
                <span>{{ $t('strategyV2.strategyType') }} · {{ $t(`strategyV2.${strategyManifest.strategyType === 'portfolio' ? 'portfolio' : 'cta'}`) }}</span>
                <span>{{ $t('strategyV2.markets') }} · {{ manifestMarkets }}</span>
              </div>
            </div>
            <div v-if="canEditSourceRuntime" class="strategy-runtime-editor">
              <div v-if="sourceRuntimeContract.hasInstrument" class="strategy-runtime-field strategy-runtime-field--symbol">
                <span class="strategy-runtime-field__label">
                  <span>{{ $t('strategyBuilder.symbol') }}</span>
                  <small v-if="runtimeWatchlistOptions.length">
                    <a-icon type="star" theme="filled" />
                    {{ $t('universeManager.tabs.watchlist') }} {{ runtimeWatchlistOptions.length }}
                  </small>
                </span>
                <a-select
                  show-search
                  option-label-prop="label"
                  :filter-option="filterRuntimeSymbolOption"
                  :value="runtimeSymbolValue"
                  :loading="runtimeSymbolLoading"
                  :placeholder="$t('strategyBuilder.symbolPlaceholder')"
                  :dropdown-class-name="isDarkTheme ? 'watchlist-select-dropdown watchlist-select-dropdown--dark' : 'watchlist-select-dropdown'"
                  @change="handleRuntimeSymbolChange"
                  @dropdownVisibleChange="onRuntimeSymbolDropdownVisibleChange">
                  <a-select-option
                    v-for="option in runtimeSymbolOptions"
                    :key="option.value"
                    :value="option.value"
                    :label="option.symbol"
                    :title="[option.symbol, option.context_label].filter(Boolean).join(' · ')">
                    <span class="runtime-symbol-option">
                      <span class="runtime-symbol-market" :class="'runtime-symbol-market--' + String(option.market || '').toLowerCase()">
                        {{ runtimeOptionMarketLabel(option.market) }}
                      </span>
                      <strong>{{ option.symbol }}</strong>
                      <span class="runtime-symbol-context">{{ option.context_label }}</span>
                    </span>
                  </a-select-option>
                  <a-select-option key="__add__" value="__add__" class="runtime-symbol-add-option">
                    <span class="runtime-symbol-add-row">
                      <a-icon type="plus" />
                      <span>{{ $t('watchlistAssets.add') }}</span>
                    </span>
                  </a-select-option>
                </a-select>
              </div>
              <div class="strategy-runtime-editor__controls">
                <div v-if="sourceRuntimeContract.hasProduct && runtimeDraft.market_category === 'Crypto'" class="strategy-runtime-field">
                  <span>{{ $t('strategyBuilder.product') }}</span>
                  <a-radio-group
                    class="strategy-runtime-product"
                    :value="runtimeDraft.market_type"
                    @change="setRuntimeDraft('market_type', $event.target.value)">
                    <a-radio-button value="spot">{{ $t('strategyBuilder.spot') }}</a-radio-button>
                    <a-radio-button value="swap">{{ $t('strategyBuilder.swap') }}</a-radio-button>
                  </a-radio-group>
                </div>
                <div v-if="sourceRuntimeContract.hasTimeframe" class="strategy-runtime-field">
                  <span>{{ $t('strategyBuilder.timeframe') }}</span>
                  <a-select :value="runtimeDraft.timeframe" @change="setRuntimeDraft('timeframe', $event)">
                    <a-select-option v-for="timeframe in runtimeTimeframes" :key="timeframe" :value="timeframe">{{ timeframe }}</a-select-option>
                  </a-select>
                </div>
              </div>
            </div>
            <div v-else class="strategy-v2-summary__instrument">
              <em>{{ $t('strategyV2.instrument') }}</em>
              <b>{{ manifestUniverseLabel }}</b>
            </div>
            <a-collapse v-if="parameterDefinitions.length" v-model="expandedSections" :bordered="false" class="deploy-collapse deploy-collapse--parameters">
              <a-collapse-panel key="parameters">
                <template #header>
                  <span class="deploy-collapse__title">
                    <span>{{ $t('trading-assistant.editor.paramsTab') }}</span>
                    <a-tag>{{ parameterDefinitions.length }}</a-tag>
                  </span>
                </template>
                <div class="parameter-panel parameter-panel--source">
                  <div class="parameter-grid">
                    <a-form-item v-for="param in parameterDefinitions" :key="param.name" :label="parameterLabel(param)">
                      <a-switch
                        v-if="param.type === 'boolean'"
                        :checked="Boolean(model.templateParams[param.name])"
                        :disabled="isParameterDisabled(param)"
                        @change="value => setParameter(param.name, value)" />
                      <a-input-number
                        v-else-if="['integer', 'number', 'percent'].includes(param.type)"
                        :value="model.templateParams[param.name]"
                        :min="param.min"
                        :max="param.max"
                        :step="param.step || (param.type === 'integer' ? 1 : 0.01)"
                        :precision="param.type === 'integer' ? 0 : undefined"
                        :formatter="param.type === 'percent' ? formatRatioPercent : undefined"
                        :parser="param.type === 'percent' ? parseRatioPercent : undefined"
                        @change="value => setParameter(param.name, value)" />
                      <a-select
                        v-else-if="parameterOptions(param).length"
                        :value="model.templateParams[param.name]"
                        @change="value => setParameter(param.name, value)">
                        <a-select-option v-for="option in parameterOptions(param)" :key="String(option.value)" :value="option.value">
                          {{ parameterOptionLabel(param, option) }}
                        </a-select-option>
                      </a-select>
                      <a-input
                        v-else
                        :value="model.templateParams[param.name]"
                        @input="value => setParameter(param.name, value && value.target ? value.target.value : value)" />
                      <div v-if="parameterDescription(param)" class="parameter-description">{{ parameterDescription(param) }}</div>
                    </a-form-item>
                  </div>
                  <p class="parameter-contract-hint">{{ $t('strategyCenter.editor.deploymentParametersHint') }}</p>
                </div>
              </a-collapse-panel>
            </a-collapse>
            <div v-if="canEditSourceDefinition" class="strategy-source-apply">
              <span><a-icon type="info-circle" /> {{ $t('strategyCenter.editor.sourceChangesHint') }}</span>
              <a-button
                size="small"
                type="primary"
                :loading="savingSourceRuntime"
                :disabled="!sourceDefinitionDirty"
                @click="applySourceDefinitionChanges"
              >
                {{ $t('strategyCenter.editor.applySourceChanges') }}
              </a-button>
            </div>
          </div>
        </a-form>
      </section>

      <section v-if="model.scriptSourceId && hasCurrentContract" class="editor-section editor-section--execution">
        <a-form layout="vertical" class="editor-form editor-form--execution">
          <div class="execution-panel execution-panel--mode">
            <div class="execution-panel__head">
              <div>
                <strong>{{ $t('trading-assistant.form.executionMode') }}</strong>
                <span>{{ $t(model.executionMode === 'live' ? 'strategyV2.liveSourceHint' : 'strategyV2.signalSourceHint') }}</span>
              </div>
            </div>
            <a-radio-group
              v-model="model.executionMode"
              class="execution-mode-grid"
              :class="{ 'is-single': !liveTradingEnabled }">
              <a-radio
                v-if="liveTradingEnabled"
                value="live"
                :disabled="!supportsLive"
                class="execution-mode-card"
                :class="{ 'is-selected': model.executionMode === 'live' }">
                <span class="execution-mode-card__icon" aria-hidden="true"><a-icon type="thunderbolt" /></span>
                <span class="execution-mode-card__copy">
                  <strong>{{ $t('trading-assistant.form.executionModeLive') }}</strong>
                  <span>{{ $t('trading-assistant.form.executionModeLiveDesc') }}</span>
                </span>
              </a-radio>
              <a-radio
                value="signal"
                class="execution-mode-card"
                :class="{ 'is-selected': model.executionMode === 'signal' }">
                <span class="execution-mode-card__icon" aria-hidden="true"><a-icon type="notification" /></span>
                <span class="execution-mode-card__copy">
                  <strong>{{ $t('trading-assistant.form.executionModeSignal') }}</strong>
                  <span>{{ $t('strategyCenter.editor.signalExecutionModeDesc') }}</span>
                </span>
              </a-radio>
            </a-radio-group>
          </div>

          <div class="deployment-finance-grid">
            <a-form-item :label="$t(capitalFieldLabelKey)" required>
              <a-input-number v-model="model.initialCapital" :min="1" :max="1000000000" :precision="2" :step="1000" />
              <div v-if="capitalCurrency" class="field-hint">
                {{ $t(model.executionMode === 'signal' ? 'strategyCenter.editor.paperCapitalCurrencyHint' : 'strategyV2.capitalCurrencyHint', { currency: capitalCurrency }) }}
              </div>
              <div v-else class="field-hint">
                {{ $t(model.executionMode === 'signal' ? 'strategyCenter.editor.paperCapitalGenericHint' : 'strategyCenter.editor.capitalCurrencyGenericHint') }}
              </div>
              <div v-if="capitalIsMargin" class="field-hint field-hint--notional">
                {{ $t(capitalCurrency ? 'strategyCenter.editor.marginNotionalCapacity' : 'strategyCenter.editor.marginNotionalCapacityGeneric', {
                  margin: formattedInitialCapital,
                  leverage: effectiveLeverage,
                  notional: formattedNotionalCapacity,
                  currency: capitalCurrency
                }) }}
              </div>
            </a-form-item>
            <div v-if="supportsStrategyV2Leverage" class="leverage-panel">
              <div class="leverage-panel__copy">
                <strong>{{ $t('strategyCenter.editor.leverageAutoTitle') }}</strong>
                <span>{{ $t('strategyCenter.editor.leverageAutoHint', { max: platformMaxLeverage }) }}</span>
              </div>
              <div class="leverage-panel__control">
                <a-input-number v-model="model.leverage" :min="1" :max="platformMaxLeverage" :step="1" :precision="0" />
                <b>×</b>
              </div>
            </div>
            <a-alert
              v-else-if="requiresDirectionMode && String(runtimeDraft.market_type || '').toLowerCase() === 'swap'"
              show-icon
              type="info"
              :message="$t('strategyV2.leverageNotAllowed')" />
          </div>

          <div class="strategy-equity-risk">
            <div class="strategy-equity-risk__head">
              <div>
                <strong>{{ $t('strategyCenter.editor.strategyEquityRiskTitle') }}</strong>
                <span>{{ $t('strategyCenter.editor.strategyEquityRiskHint') }}</span>
              </div>
              <a-tag>{{ $t('strategyCenter.editor.equityRiskAction') }}</a-tag>
            </div>
            <div class="strategy-equity-risk__grid">
              <div class="strategy-equity-risk__row" :class="{ 'is-enabled': model.equityStopLossEnabled }">
                <a-switch v-model="model.equityStopLossEnabled" size="small" />
                <div class="strategy-equity-risk__copy">
                  <strong>{{ $t('strategyCenter.editor.equityStopLoss') }}</strong>
                  <span>{{ model.equityStopLossEnabled
                    ? $t('strategyCenter.editor.equityTriggerValue', { value: formattedStopEquity, currency: riskCurrencyLabel })
                    : $t('strategyCenter.editor.equityStopLossHint') }}</span>
                </div>
                <a-input-number
                  v-model="model.equityStopLossPct"
                  :disabled="!model.equityStopLossEnabled"
                  :min="0.01"
                  :max="1"
                  :step="0.01"
                  :precision="2"
                  :formatter="formatRatioPercent"
                  :parser="parseRatioPercent" />
              </div>
              <div class="strategy-equity-risk__row" :class="{ 'is-enabled': model.equityTakeProfitEnabled }">
                <a-switch v-model="model.equityTakeProfitEnabled" size="small" />
                <div class="strategy-equity-risk__copy">
                  <strong>{{ $t('strategyCenter.editor.equityTakeProfit') }}</strong>
                  <span>{{ model.equityTakeProfitEnabled
                    ? $t('strategyCenter.editor.equityTriggerValue', { value: formattedTakeProfitEquity, currency: riskCurrencyLabel })
                    : $t('strategyCenter.editor.equityTakeProfitHint') }}</span>
                </div>
                <a-input-number
                  v-model="model.equityTakeProfitPct"
                  :disabled="!model.equityTakeProfitEnabled"
                  :min="0.01"
                  :max="10"
                  :step="0.01"
                  :precision="2"
                  :formatter="formatRatioPercent"
                  :parser="parseRatioPercent" />
              </div>
            </div>
          </div>

          <transition name="editor-reveal">
            <div v-if="model.executionMode === 'live'" class="execution-panel execution-panel--live">
              <div class="execution-panel__head">
                <div>
                  <strong>{{ $t('trading-assistant.form.savedCredential') }}</strong>
                  <span>{{ $t('trading-assistant.form.executionModeLiveDesc') }}</span>
                </div>
                <a-tag v-if="selectedCredentialExchange" class="execution-panel__status" color="orange">
                  {{ exchangeName(selectedCredentialExchange) }}
                </a-tag>
              </div>

              <div class="live-connection-grid">
                <a-form-item required>
                  <template #label>
                    <span class="credential-field-label">
                      <span>{{ $t('trading-assistant.form.savedCredential') }}</span>
                      <a-button type="link" size="small" icon="plus" @click.stop="openBrokerAccounts">
                        {{ $t('strategyCenter.editor.addAccount') }}
                      </a-button>
                    </span>
                  </template>
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
                    <a href="#/broker-accounts" class="credential-config-link" @click.prevent.stop="openBrokerAccounts">
                      {{ $t('trading-assistant.form.goToProfile') }}
                    </a>
                  </div>
                </a-form-item>
              </div>
            </div>
          </transition>

          <div class="deployment-options">
              <div v-if="model.executionMode === 'live' && requiresDirectionFallback" class="advanced-field">
                <strong>{{ $t('strategyCenter.editor.directionMode') }}</strong>
                <a-radio-group v-model="model.directionMode" class="full-radio-group">
                  <a-radio-button value="long_only">{{ $t('strategyCenter.editor.directionLongOnly') }}</a-radio-button>
                  <a-radio-button value="short_only">{{ $t('strategyCenter.editor.directionShortOnly') }}</a-radio-button>
                  <a-radio-button value="one_way">{{ $t('strategyCenter.editor.directionOneWay') }}</a-radio-button>
                  <a-radio-button value="both">{{ $t('strategyCenter.editor.directionBoth') }}</a-radio-button>
                  <a-radio-button value="neutral">{{ $t('strategyCenter.editor.directionNeutral') }}</a-radio-button>
                </a-radio-group>
                <p>{{ $t('strategyCenter.editor.directionModeLegacyHint') }}</p>
              </div>
              <div
                v-if="model.executionMode === 'live'"
                class="ai-decision-filter-card"
                :class="{ 'is-disabled': !supportsAiDecisionFilter }">
                <span class="ai-decision-filter-card__icon"><a-icon type="safety" /></span>
                <div class="ai-decision-filter-card__copy">
                  <strong>{{ $t('aiDecisionFilter.title') }}</strong>
                  <p>{{ $t(supportsAiDecisionFilter ? 'aiDecisionFilter.strategyHint' : 'aiDecisionFilter.unsupportedStrategy') }}</p>
                </div>
                <a-switch
                  v-model="model.aiDecisionFilter"
                  :aria-label="$t('aiDecisionFilter.title')"
                  :disabled="!supportsAiDecisionFilter"
                />
              </div>
              <div class="execution-panel execution-panel--notifications">
                <div class="execution-panel__head">
                  <div>
                    <strong>{{ $t('trading-assistant.form.notifyChannels') }}</strong>
                    <span>{{ $t('trading-assistant.form.notifyChannelsHint') }}</span>
                  </div>
                </div>
                <a-checkbox-group v-model="model.notifyChannels" class="notification-grid">
                  <a-checkbox
                    v-for="channel in notificationChannels"
                    :key="channel"
                    :value="channel"
                    class="notification-card"
                    :class="{ 'is-selected': model.notifyChannels.includes(channel) }">
                    <span class="notification-card__content">
                      <a-icon :type="notificationIcon(channel)" aria-hidden="true" />
                      <span>{{ $t(`trading-assistant.notify.${channel}`) }}</span>
                    </span>
                  </a-checkbox>
                </a-checkbox-group>
              </div>
          </div>
        </a-form>
      </section>

      </a-spin>
    </div>

    <add-watchlist-modal
      :visible="showRuntimeAddWatchlist"
      :markets="runtimeAddMarketKeys"
      :watchlist="runtimeWatchlistRows"
      :initial-market="runtimeDraft.market_category || 'Crypto'"
      @close="showRuntimeAddWatchlist = false"
      @added="handleRuntimeWatchlistAdded"
    />

    <template #footer>
      <div class="deployment-modal-footer">
        <div v-if="model.scriptSourceId && hasCurrentContract && model.executionMode === 'live'" class="deployment-consent-row">
          <a-checkbox v-model="model.disclaimer">
            {{ $t('trading-assistant.liveDisclaimer.agree') }}
          </a-checkbox>
          <a-popover
            trigger="click"
            placement="topRight"
            :overlay-class-name="isDarkTheme ? 'deployment-disclaimer-popover deployment-disclaimer-popover--dark' : 'deployment-disclaimer-popover'">
            <template #title>{{ $t('trading-assistant.liveDisclaimer.title') }}</template>
            <template #content>
              <p>{{ $t('trading-assistant.liveDisclaimer.content') }}</p>
            </template>
            <a-button type="link" class="deployment-consent-row__link">
              {{ $t('trading-assistant.liveDisclaimer.view') }}
            </a-button>
          </a-popover>
        </div>
        <div class="deployment-modal-footer__actions">
          <a-button @click="close">{{ $t('trading-assistant.form.cancel') }}</a-button>
          <a-button type="primary" :loading="saving || sourceContractLoading" @click="save">
            {{ $t(isEdit ? 'trading-assistant.form.confirmEdit' : 'trading-assistant.form.confirmCreate') }}
          </a-button>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script>
import { compileScriptSource, createStrategy, getScriptSourceDetail, getScriptSourceList, getStrategyDetail, updateScriptSource, updateStrategy } from '@/api/strategy'
import { mapState } from 'vuex'
import { listExchangeCredentials } from '@/api/credentials'
import { getWatchlist } from '@/api/market'
import { getNotificationSettings } from '@/api/user'
import AddWatchlistModal from '@/components/Watchlist/AddWatchlistModal.vue'
import { loadEnabledMarketOptions } from '@/utils/marketModules'
import { groupWatchlistAssets, watchlistAssetKey, watchlistContextLabel } from '@/utils/watchlistAssets'
import {
  credentialMatchesLiveStrategy,
  formatExchangeCredentialLabel,
  getExchangeDisplayName,
  supportsLiveExecutionMode
} from '@/utils/exchangeCredential'

import {
  applyStrategyRuntimeConfigToCode,
  buildScriptCodeWithParamValues,
  extractScriptParamsFromCode,
  extractStrategyRuntimeContractFromCode,
  sanitizeRuntimeConfigForSource
} from '@/views/strategy-ide/components/scriptTemplateCatalog'
import { CRYPTO_EXCHANGE_IDS, normalizeExchangeId, normalizeMarketType } from '@/utils/marketContext'
import {
  strategyParameterDescription,
  strategyParameterLabel,
  strategyParameterOptionLabel,
  strategyParameterOptions
} from '@/utils/strategyParameterPresentation'
import { ratioPercentInputFormatter, ratioPercentInputParser } from '@/utils/numberFormat'

const PLATFORM_MAX_LEVERAGE = 100
const DEFAULT_CHANNELS = ['browser', 'email']
const RUNTIME_TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W']
const MARKET_ACCOUNTING_CURRENCIES = {
  USStock: 'USD',
  HKStock: 'HKD',
  CNStock: 'CNY',
  AStock: 'CNY'
}
const instrumentAccountingCurrency = (market, symbol, instrument = {}) => {
  const explicit = String(
    instrument.settlement_currency ||
    instrument.settle_currency ||
    instrument.quote_currency ||
    instrument.currency ||
    ''
  ).trim().toUpperCase()
  if (explicit) return explicit
  const marketCurrency = MARKET_ACCOUNTING_CURRENCIES[String(market || '')]
  if (marketCurrency) return marketCurrency
  const normalizedSymbol = String(symbol || '').replace(/^[^:]+:/, '').split('@')[0].trim().toUpperCase()
  if (normalizedSymbol.includes('/')) return normalizedSymbol.split('/').pop()
  if (String(market || '') === 'Forex' && /^[A-Z]{6}$/.test(normalizedSymbol)) return normalizedSymbol.slice(-3)
  return ''
}
const DIRECTION_MODE_ALIASES = {
  long: 'long_only',
  longonly: 'long_only',
  short: 'short_only',
  shortonly: 'short_only',
  net: 'one_way',
  oneway: 'one_way',
  net_position: 'one_way',
  single_position: 'one_way',
  dual: 'both',
  hedged: 'both',
  bidirectional: 'both'
}
const DIRECTION_MODES = new Set(['long_only', 'short_only', 'one_way', 'both', 'neutral'])
const AI_FILTER_UNSUPPORTED_AUTOMATIONS = new Set(['grid', 'dca', 'martingale', 'layered_martingale'])
const normalizeAutomationType = value => String(value || '').trim().toLowerCase().replace(/-/g, '_')
const sourceUsesUnsupportedAutomation = (source = {}, manifest = {}) => {
  const sourceMetadata = source.metadata && typeof source.metadata === 'object' ? source.metadata : {}
  const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {}
  const candidates = [
    manifest.bot_type,
    manifest.executor_type,
    manifestMetadata.bot_type,
    manifestMetadata.executor_type,
    manifestMetadata.strategy_family,
    source.bot_type,
    source.executor_type,
    sourceMetadata.bot_type,
    sourceMetadata.executor_type,
    sourceMetadata.strategy_family
  ].map(normalizeAutomationType)
  if (candidates.some(value => AI_FILTER_UNSUPPORTED_AUTOMATIONS.has(value))) return true

  const template = normalizeAutomationType(source.template_key || sourceMetadata.template_key)
  if (Array.from(AI_FILTER_UNSUPPORTED_AUTOMATIONS).some(value => template.includes(value))) return true

  const code = String(source.code || '')
  const markerGroups = [
    ['GRID_TEMPLATE_VERSION', 'CELL_LOWER', 'CELL_UPPER', 'CELL_ROLES', 'MAX_OPEN_ENTRY_ORDERS'],
    ['DCA_TEMPLATE_VERSION', 'DCA_INTERVAL_MINUTES', 'DCA_MAX_ORDERS', 'DCA_TOTAL_BUDGET_PCT', 'def _reconcile_purchase(']
  ]
  if (markerGroups.some(markers => markers.every(marker => code.includes(marker)))) return true

  const realtimeRobotMarkers = ['ROBOT_TEMPLATE_VERSION', "ENTRY_TRIGGER_MODE = 'realtime_price'", 'PRICE_LEVELS', 'def on_price_tick(']
  const martingaleGenerator = code.includes('Strategy API V2 martingale robot generated') ||
    code.includes('Strategy API V2 layered martingale robot generated')
  return martingaleGenerator && realtimeRobotMarkers.every(marker => code.includes(marker))
}
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
  components: { AddWatchlistModal },
  props: {
    visible: { type: Boolean, default: false },
    mode: { type: String, default: 'create' },
    strategyId: { type: Number, default: null },
    initialConfig: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      expandedSections: [],
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
      savingSourceRuntime: false,
      runtimeDraft: {},
      runtimeOriginal: {},
      runtimeSymbolOptions: [],
      runtimeWatchlistOptions: [],
      runtimeWatchlistRows: [],
      runtimeSymbolLoading: false,
      runtimeWatchlistLoading: false,
      runtimeTimeframes: [...RUNTIME_TIMEFRAMES],
      runtimeAddMarketKeys: [],
      showRuntimeAddWatchlist: false,
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
    liveTradingEnabled () {
      return this.$store.state.features.config.live_trading_enabled !== false
    },
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
      return String(this.strategyManifest.primaryFrequency || (subscriptions[0] && subscriptions[0].frequency) || '1d')
    },
    manifestMarkets () {
      const markets = Array.isArray(this.strategyManifest.markets) ? this.strategyManifest.markets : []
      return markets.join(', ') || '-'
    },
    manifestUniverseLabel () {
      const universe = this.parseObject(this.strategyManifest.universe)
      if (universe.reference) return this.$t('strategyV2.dynamicUniverse', { reference: universe.reference })
      const instruments = this.manifestInstruments
      if (instruments.length === 1) return String(instruments[0].symbol || '-')
      if (instruments.length > 1 && instruments.length <= 3) {
        return instruments.map(item => String(item.symbol || '')).filter(Boolean).join(' · ')
      }
      return this.$t('strategyV2.symbolCount', { count: instruments.length })
    },
    manifestInstruments () {
      const universe = this.parseObject(this.strategyManifest.universe)
      const universeInstruments = Array.isArray(universe.instruments) ? universe.instruments : []
      if (universeInstruments.length) return universeInstruments
      const subscriptions = Array.isArray(this.strategyManifest.subscriptions) ? this.strategyManifest.subscriptions : []
      const seen = new Set()
      return subscriptions.flatMap(item => Array.isArray(item.instruments) ? item.instruments : []).filter(item => {
        if (!item) return false
        const key = [item.market, item.symbol, item.market_type, item.exchange_id].join(':')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    },
    manifestProductLabel () {
      if (!this.manifestInstruments.length) return '-'
      const products = new Set(this.manifestInstruments.map(item => {
        const market = String(item.market || '')
        const marketType = String(item.market_type || '').toLowerCase()
        if (market !== 'Crypto') return this.$t('strategyV2.cashProduct')
        return this.$t(marketType === 'swap' ? 'strategyV2.swap' : 'strategyV2.spot')
      }))
      return Array.from(products).join(' · ')
    },
    manifestExchangeLabel () {
      const exchanges = new Set(this.manifestInstruments
        .map(item => String(item.exchange_id || '').trim().toLowerCase())
        .filter(Boolean)
        .map(item => getExchangeDisplayName(item)))
      return Array.from(exchanges).join(' · ')
    },
    supportsStrategyV2Leverage () {
      if (!this.strategyManifest.leverageAllowed) return false
      if (
        this.canEditSourceRuntime &&
        this.sourceRuntimeContract.hasProduct &&
        String(this.runtimeDraft.market_category || '') === 'Crypto' &&
        String(this.runtimeDraft.market_type || '').toLowerCase() !== 'swap'
      ) return false
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
    capitalFieldLabelKey () {
      if (this.model.executionMode === 'signal') {
        return this.capitalIsMargin
          ? 'strategyCenter.editor.paperInitialMargin'
          : 'strategyCenter.editor.paperInitialCapital'
      }
      return this.capitalIsMargin
        ? 'trading-assistant.form.initialMargin'
        : 'trading-assistant.form.initialCapital'
    },
    platformMaxLeverage () {
      return this.supportsStrategyV2Leverage ? PLATFORM_MAX_LEVERAGE : 1
    },
    capitalCurrency () {
      const runtimeMarket = String(this.runtimeDraft.market_category || '')
      const runtimeSymbol = String(this.runtimeDraft.symbol || '')
      if (this.canEditSourceRuntime && runtimeMarket && runtimeSymbol) {
        return instrumentAccountingCurrency(runtimeMarket, runtimeSymbol, this.runtimeDraft)
      }
      const universe = this.parseObject(this.strategyManifest.universe)
      if (universe.reference) {
        return MARKET_ACCOUNTING_CURRENCIES[this.marketCategory] || ''
      }
      const instruments = Array.isArray(universe.instruments) ? universe.instruments : []
      const currencies = new Set(instruments
        .map(item => instrumentAccountingCurrency(item.market, item.symbol, item))
        .filter(Boolean))
      return currencies.size === 1 ? Array.from(currencies)[0] : ''
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
    riskCurrencyLabel () {
      return this.capitalCurrency || ''
    },
    formattedStopEquity () {
      const capital = Math.max(0, Number(this.model.initialCapital) || 0)
      const ratio = Math.min(1, Math.max(0, Number(this.model.equityStopLossPct) || 0))
      return (capital * (1 - ratio)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    },
    formattedTakeProfitEquity () {
      const capital = Math.max(0, Number(this.model.initialCapital) || 0)
      const ratio = Math.max(0, Number(this.model.equityTakeProfitPct) || 0)
      return (capital * (1 + ratio)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    },
    supportsLive () {
      return this.liveTradingEnabled && supportsLiveExecutionMode(this.strategyManifest)
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
    supportsAiDecisionFilter () {
      return !sourceUsesUnsupportedAutomation(
        { ...this.sourceDetail, metadata: this.sourceMetadata },
        { ...this.strategyManifest, metadata: this.parseObject(this.strategyManifest.metadata) }
      )
    },
    sourceRuntimeContract () {
      return extractStrategyRuntimeContractFromCode(this.sourceDetail.code || '')
    },
    canEditSourceRuntime () {
      const hidden = Boolean(this.sourceDetail.code_hidden || this.sourceMetadata.code_hidden)
      const running = String(this.sourceDetail.status || '').toLowerCase() === 'running'
      return Boolean(
        this.model.scriptSourceId &&
        !this.isPortfolioStrategy &&
        !hidden &&
        !running &&
        this.sourceRuntimeContract.hasInstrument &&
        String(this.sourceDetail.code || '').trim()
      )
    },
    canEditSourceParameters () {
      const hidden = Boolean(this.sourceDetail.code_hidden || this.sourceMetadata.code_hidden)
      const running = String(this.sourceDetail.status || '').toLowerCase() === 'running'
      return Boolean(
        this.model.scriptSourceId &&
        !hidden &&
        !running &&
        this.parameterDefinitions.length &&
        String(this.sourceDetail.code || '').trim()
      )
    },
    canEditSourceDefinition () {
      return this.canEditSourceRuntime || this.canEditSourceParameters
    },
    sourceParametersDirty () {
      if (!this.canEditSourceParameters) return false
      const sourceValues = this.buildParameterValues(this.sourceParameterValues)
      const draftValues = this.buildParameterValues(this.model.templateParams)
      return JSON.stringify(sourceValues) !== JSON.stringify(draftValues)
    },
    sourceDefinitionDirty () {
      return this.runtimeDirty || this.sourceParametersDirty
    },
    runtimeExchangeOptions () {
      return CRYPTO_EXCHANGE_IDS.map(value => ({
        value,
        label: getExchangeDisplayName(value)
      }))
    },
    runtimeSymbolValue () {
      const option = this.runtimeSymbolOptions.find(item => this.runtimeSymbolMatchesDraft(item))
      return option ? option.value : undefined
    },
    runtimeDirty () {
      if (!this.canEditSourceRuntime) return false
      const fields = ['market_category', 'symbol']
      if (this.sourceRuntimeContract.hasProduct) fields.push('market_type')
      if (this.sourceRuntimeContract.hasTimeframe) fields.push('timeframe')
      if (this.sourceRuntimeContract.hasExchange) fields.push('exchange_id')
      return fields.some(field => String(this.runtimeDraft[field] || '') !== String(this.runtimeOriginal[field] || ''))
    },
    sourceParameterValues () {
      const metadata = this.sourceMetadata
      const lastRunConfig = this.parseObject(metadata.last_run_config)
      return {
        ...this.parseObject(metadata.script_template_params),
        ...this.parseObject(lastRunConfig.script_template_params),
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
      return this.credentials.filter(credential => (
        credentialMatchesLiveStrategy(this.strategyManifest, credential.exchange_id)
      ))
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
        equityStopLossEnabled: this.mode !== 'edit',
        equityStopLossPct: 0.3,
        equityTakeProfitEnabled: false,
        equityTakeProfitPct: 0.5,
        executionMode: this.liveTradingEnabled ? 'live' : 'signal',
        credentialId: undefined,
        directionMode: '',
        disclaimer: false,
        notifyChannels: [...DEFAULT_CHANNELS],
        aiDecisionFilter: false,
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
      this.expandedSections = []
      this.model = this.defaultModel()
      this.sourceDetail = {}
      this.compiledManifest = {}
      this.sourceContractError = false
      this.savingSourceRuntime = false
      this.runtimeDraft = {}
      this.runtimeOriginal = {}
      this.runtimeSymbolOptions = []
      this.runtimeWatchlistOptions = []
      this.runtimeWatchlistRows = []
      this.showRuntimeAddWatchlist = false
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
    onSourceDropdownVisibleChange (visible) {
      if (visible && !this.loadingSources) this.loadSources()
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
          const sourceRuntime = this.sourceRuntimeContract.config || {}
          const sourceStopLoss = Number(sourceRuntime.equity_stop_loss_pct)
          const sourceTakeProfit = Number(sourceRuntime.equity_take_profit_pct)
          this.model.timeframe = this.manifestFrequency
          this.model.templateParams = this.buildParameterValues(this.sourceParameterValues)
          this.model.leverageEnabled = false
          this.model.leverage = 1
          if (Number.isFinite(sourceStopLoss)) {
            this.model.equityStopLossEnabled = sourceStopLoss > 0
            if (sourceStopLoss > 0) this.model.equityStopLossPct = sourceStopLoss
          }
          if (Number.isFinite(sourceTakeProfit)) {
            this.model.equityTakeProfitEnabled = sourceTakeProfit > 0
            if (sourceTakeProfit > 0) this.model.equityTakeProfitPct = sourceTakeProfit
          }
        }
        this.normalizeExecutionFields()
        this.syncRuntimeDraftFromSource()
        if (this.canEditSourceRuntime) this.loadRuntimeWatchlistOptions()
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
      const deploymentRisk = this.parseObject(config.deployment_risk)
      const equityStopLossPct = Number(
        deploymentRisk.equity_stop_loss_pct !== undefined
          ? deploymentRisk.equity_stop_loss_pct
          : config.equity_stop_loss_pct
      ) || 0
      const equityTakeProfitPct = Number(
        deploymentRisk.equity_take_profit_pct !== undefined
          ? deploymentRisk.equity_take_profit_pct
          : config.equity_take_profit_pct
      ) || 0
      this.model = {
        ...this.defaultModel(),
        scriptSourceId: String(config.script_source_id || ''),
        name: strategy.strategy_name || '',
        timeframe: strategy.timeframe || '1d',
        initialCapital: Number(config.initial_capital || strategy.initial_capital || 10000),
        leverageEnabled: Boolean(config.leverage_enabled),
        leverage: Number(config.leverage || 1),
        equityStopLossEnabled: equityStopLossPct > 0,
        equityStopLossPct: equityStopLossPct > 0 ? equityStopLossPct : 0.3,
        equityTakeProfitEnabled: equityTakeProfitPct > 0,
        equityTakeProfitPct: equityTakeProfitPct > 0 ? equityTakeProfitPct : 0.5,
        executionMode: strategy.execution_mode === 'live' ? 'live' : 'signal',
        credentialId: config.credential_id || undefined,
        directionMode: normalizeDirectionMode(config.direction_mode || config.position_side),
        disclaimer: strategy.execution_mode === 'live',
        notifyChannels: (strategy.notification_config && strategy.notification_config.channels) || [...DEFAULT_CHANNELS],
        aiDecisionFilter: Boolean(config.ai_decision_filter),
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
      } else {
        this.model.leverageEnabled = true
        const maximum = this.platformMaxLeverage
        this.model.leverage = Math.min(maximum, Math.max(1, Number(this.model.leverage) || 1))
      }
      if (!this.supportsLive && this.model.executionMode === 'live') {
        this.model.executionMode = 'signal'
        this.model.disclaimer = false
      }
      if (!this.supportsAiDecisionFilter) this.model.aiDecisionFilter = false
      if (
        this.model.credentialId &&
        !this.compatibleCredentials.some(item => String(item.id) === String(this.model.credentialId))
      ) {
        this.model.credentialId = undefined
      }
    },
    syncRuntimeDraftFromSource () {
      const inferred = this.sourceRuntimeContract.config || {}
      const firstInstrument = this.manifestInstruments[0] || {}
      const market = String(inferred.market_category || firstInstrument.market || this.marketCategory || 'Crypto')
      const next = {
        asset_id: Number(inferred.asset_id || firstInstrument.asset_id || 0),
        market_category: market,
        symbol: String(inferred.symbol || firstInstrument.symbol || '').trim().toUpperCase(),
        market_type: normalizeMarketType(inferred.market_type || firstInstrument.market_type, market),
        exchange_id: market === 'Crypto'
          ? normalizeExchangeId(inferred.exchange_id || firstInstrument.exchange_id || '')
          : '',
        instrument_id: String(inferred.instrument_id || firstInstrument.instrument_id || '').trim(),
        timeframe: String(inferred.timeframe || this.manifestFrequency || '').trim()
      }
      this.runtimeDraft = { ...next }
      this.runtimeOriginal = { ...next }
      this.ensureCurrentRuntimeSymbolOption()
    },
    runtimeSymbolMatchesDraft (option) {
      if (!option) return false
      const assetId = Number(this.runtimeDraft.asset_id || 0)
      return option.market === this.runtimeDraft.market_category &&
        (assetId > 0
          ? option.asset_id === assetId
          : option.symbol === String(this.runtimeDraft.symbol || '').trim().toUpperCase())
    },
    normalizeRuntimeSymbolOptions (rows, isWatchlist = false) {
      return groupWatchlistAssets(Array.isArray(rows) ? rows : []).map(group => {
        const marketTypes = [...new Set(group.items.flatMap(item => {
          if (Array.isArray(item.market_types)) return item.market_types
          return item.market_type || item.marketType ? [item.market_type || item.marketType] : []
        }))]
        return this.normalizeRuntimeSymbolOption({ ...group.item, market_types: marketTypes }, isWatchlist)
      }).filter(Boolean)
    },
    normalizeRuntimeSymbolOption (item, isWatchlist = false) {
      const symbol = String((item && (item.symbol || item.code || item.value)) || '').trim().toUpperCase()
      if (!symbol) return null
      const market = String((item && (item.market || item.category)) || 'Crypto')
      const assetId = Number((item && (item.asset_id || item.assetId)) || 0)
      const marketTypes = Array.isArray(item && item.market_types)
        ? item.market_types.map(value => normalizeMarketType(value, market))
        : (item && (item.market_type || item.marketType)
            ? [normalizeMarketType(item.market_type || item.marketType, market)]
            : [])
      const marketType = market === 'Crypto' ? (marketTypes[0] || 'spot') : 'spot'
      const instrumentId = String((item && (item.instrument_id || item.instrumentId)) || '').trim()
      const name = String((item && (item.name || item.display_name)) || '').trim()
      const productType = String((item && (item.product_type || item.productType)) || (market === 'Crypto' ? 'crypto' : 'equity')).toLowerCase()
      return {
        value: assetId > 0 ? `asset:${assetId}` : [market, symbol, productType].join('|'),
        label: [symbol, name, market].filter(Boolean).join(' · '),
        name,
        context_label: watchlistContextLabel({
          ...item,
          name,
          symbol,
          product_type: productType,
          market_types: marketTypes
        }, key => this.$t(key)),
        asset_id: assetId,
        market,
        symbol,
        market_type: marketType,
        market_types: marketTypes,
        instrument_id: instrumentId,
        product_type: productType,
        is_watchlist: isWatchlist
      }
    },
    ensureCurrentRuntimeSymbolOption () {
      const symbol = String(this.runtimeDraft.symbol || '').trim().toUpperCase()
      if (!symbol || this.runtimeSymbolOptions.some(item => this.runtimeSymbolMatchesDraft(item))) return
      const current = this.normalizeRuntimeSymbolOption({
        market: this.runtimeDraft.market_category,
        asset_id: this.runtimeDraft.asset_id,
        symbol,
        market_type: this.runtimeDraft.market_type,
        instrument_id: this.runtimeDraft.instrument_id
      })
      if (current) this.runtimeSymbolOptions = [current, ...this.runtimeSymbolOptions]
    },
    async loadRuntimeWatchlistOptions () {
      if (this.runtimeWatchlistLoading) return
      this.runtimeWatchlistLoading = true
      this.runtimeSymbolLoading = true
      try {
        const res = await getWatchlist()
        const data = res && res.data
        const list = Array.isArray(data) ? data : ((data && data.watchlist) || [])
        this.runtimeWatchlistRows = list
        this.runtimeWatchlistOptions = this.normalizeRuntimeSymbolOptions(list, true)
        this.runtimeSymbolOptions = [...this.runtimeWatchlistOptions]
      } catch (error) {
        if (!this.runtimeWatchlistOptions.length) this.runtimeSymbolOptions = []
      } finally {
        this.ensureCurrentRuntimeSymbolOption()
        this.runtimeWatchlistLoading = false
        this.runtimeSymbolLoading = false
      }
    },
    onRuntimeSymbolDropdownVisibleChange (visible) {
      if (visible) this.loadRuntimeWatchlistOptions()
    },
    filterRuntimeSymbolOption (input, option) {
      const props = option && option.componentOptions && option.componentOptions.propsData
      const query = String(input || '').trim().toLowerCase()
      if (!query) return true
      return [props && props.label, props && props.title, props && props.value]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query))
    },
    runtimeOptionMarketLabel (market) {
      const value = String(market || '')
      const key = `dashboard.analysis.market.${value}`
      const translated = this.$t(key)
      return translated === key ? value : translated
    },
    async openRuntimeWatchlistModal () {
      if (!this.runtimeAddMarketKeys.length) {
        const options = await loadEnabledMarketOptions({ includeFeatures: ['research'] })
        this.runtimeAddMarketKeys = options.map(item => item.value)
      }
      this.showRuntimeAddWatchlist = true
    },
    async handleRuntimeWatchlistAdded (item) {
      await this.loadRuntimeWatchlistOptions()
      const key = watchlistAssetKey(item)
      const option = this.runtimeWatchlistOptions.find(candidate => watchlistAssetKey(candidate) === key)
      if (option) this.handleRuntimeSymbolChange(option.value)
    },
    handleRuntimeSymbolChange (value) {
      if (value === '__add__') {
        this.openRuntimeWatchlistModal()
        return
      }
      if (!this.sourceRuntimeContract.hasInstrument) return
      const selected = this.runtimeSymbolOptions.find(option => option.value === value)
      if (!selected) return
      const patch = {
        asset_id: selected.asset_id,
        market_category: selected.market,
        symbol: selected.symbol,
        instrument_id: selected.instrument_id || ''
      }
      if (selected.market === 'Crypto') {
        const currentType = normalizeMarketType(this.runtimeDraft.market_type, 'Crypto')
        patch.market_type = selected.market_types.includes(currentType)
          ? currentType
          : (selected.market_types[0] || currentType)
      } else {
        patch.market_type = 'spot'
        patch.exchange_id = ''
      }
      this.runtimeDraft = { ...this.runtimeDraft, ...patch }
      this.ensureCurrentRuntimeSymbolOption()
    },
    setRuntimeDraft (field, value) {
      const next = { ...this.runtimeDraft, [field]: value }
      if (field === 'exchange_id') next.exchange_id = normalizeExchangeId(value)
      if (field === 'market_type') next.market_type = normalizeMarketType(value, next.market_category)
      if (next.market_category !== 'Crypto') {
        next.market_type = 'spot'
        next.exchange_id = ''
      }
      this.runtimeDraft = next
      if (
        field === 'market_type' &&
        next.market_category === 'Crypto' &&
        next.market_type === 'spot' &&
        Object.prototype.hasOwnProperty.call(this.model.templateParams, 'allow_short')
      ) {
        this.$set(this.model.templateParams, 'allow_short', false)
      }
      this.ensureCurrentRuntimeSymbolOption()
    },
    async applySourceRuntimeConfig (options = {}) {
      const silentSuccess = Boolean(options && options.silentSuccess)
      if (!this.canEditSourceRuntime) return false
      if (!this.runtimeDirty) return true
      this.savingSourceRuntime = true
      try {
        const runtimeCode = applyStrategyRuntimeConfigToCode(this.sourceDetail.code || '', this.runtimeDraft)
        if (!runtimeCode || runtimeCode === this.sourceDetail.code) {
          throw new Error(this.$t('strategyV2.sourceRuntimeUnsupported'))
        }
        const templateParams = this.buildParameterValues(this.sourceParameterValues)
        const code = runtimeCode
        const metadata = this.sourceMetadata
        const lastRunConfig = sanitizeRuntimeConfigForSource(this.parseObject(metadata.last_run_config), code)
        await this.persistSourceDefinition({
          code,
          templateParams,
          lastRunConfig: {
            ...lastRunConfig,
            ...this.runtimeDraft
          },
          failureKey: 'strategyV2.sourceRuntimeUpdateFailed'
        })
        if (!silentSuccess) this.$message.success(this.$t('strategyV2.sourceRuntimeUpdated'))
        return true
      } catch (error) {
        this.$message.error(error.backendMessage || error.message || this.$t('strategyV2.sourceRuntimeUpdateFailed'))
        return false
      } finally {
        this.savingSourceRuntime = false
      }
    },
    async persistSourceDefinition ({ code, templateParams, lastRunConfig, failureKey }) {
      const metadata = this.sourceMetadata
      const description = this.sourceDetail.description || metadata.description || ''
      const res = await updateScriptSource(Number(this.model.scriptSourceId), {
        name: this.sourceDetail.name || this.sourceDetail.title || this.sourceDetail.strategy_name || '',
        description,
        code,
        asset_type: this.sourceDetail.asset_type || 'script',
        template_key: this.sourceDetail.template_key || '',
        param_schema: this.parseObject(this.sourceDetail.param_schema),
        template_params: { ...templateParams },
        metadata: {
          ...metadata,
          description,
          last_run_config: { ...lastRunConfig },
          script_template_params: { ...templateParams },
          lifecycle_verified: false,
          script_verified: false
        }
      })
      if (!res || res.code !== 1) throw new Error((res && res.msg) || this.$t(failureKey))
      await this.loadSourceDetail(this.model.scriptSourceId, false)
    },
    async applySourceDefinitionChanges () {
      if (!this.canEditSourceDefinition || !this.sourceDefinitionDirty) return false
      this.savingSourceRuntime = true
      try {
        const sourceCode = this.sourceDetail.code || ''
        let code = sourceCode
        if (this.runtimeDirty) {
          code = applyStrategyRuntimeConfigToCode(code, this.runtimeDraft)
          if (!code || code === sourceCode) throw new Error(this.$t('strategyV2.sourceRuntimeUnsupported'))
        }
        const templateParams = this.sourceParametersDirty
          ? this.buildParameterValues(this.model.templateParams)
          : this.buildParameterValues(this.sourceParameterValues)
        if (this.sourceParametersDirty) {
          code = buildScriptCodeWithParamValues(code, this.parameterDefinitions, templateParams)
        }
        const metadata = this.sourceMetadata
        const lastRunConfig = sanitizeRuntimeConfigForSource(this.parseObject(metadata.last_run_config), code)
        await this.persistSourceDefinition({
          code,
          templateParams,
          lastRunConfig: {
            ...lastRunConfig,
            ...(this.runtimeDirty ? this.runtimeDraft : {}),
            script_template_params: { ...templateParams }
          },
          failureKey: 'strategyCenter.editor.sourceChangesApplyFailed'
        })
        this.$message.success(this.$t('strategyCenter.editor.sourceChangesApplied'))
        return true
      } catch (error) {
        this.$message.error(error.backendMessage || error.message || this.$t('strategyCenter.editor.sourceChangesApplyFailed'))
        return false
      } finally {
        this.savingSourceRuntime = false
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
    exchangeName (exchangeId) {
      return getExchangeDisplayName(exchangeId)
    },
    openBrokerAccounts () {
      this.$emit('close')
      if (this.$route && this.$route.name === 'BrokerAccounts') return
      this.$router.push({ name: 'BrokerAccounts' }).catch(() => {})
    },
    notificationIcon (channel) {
      return {
        browser: 'notification',
        email: 'mail',
        telegram: 'message',
        discord: 'team',
        webhook: 'api',
        phone: 'mobile'
      }[channel] || 'bell'
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
      return strategyParameterLabel(param, key => this.$t(key))
    },
    parameterDescription (param) {
      return strategyParameterDescription(param, key => this.$t(key), this.$i18n && this.$i18n.locale)
    },
    parameterOptions (param) {
      return strategyParameterOptions(param)
    },
    parameterOptionLabel (param, option) {
      return strategyParameterOptionLabel(param, option, key => this.$t(key))
    },
    formatRatioPercent (value) {
      return ratioPercentInputFormatter(value)
    },
    parseRatioPercent (value) {
      return ratioPercentInputParser(value)
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
    isParameterDisabled (param) {
      return Boolean(
        param &&
        param.name === 'allow_short' &&
        String(this.runtimeDraft.market_category || '') === 'Crypto' &&
        String(this.runtimeDraft.market_type || '').toLowerCase() === 'spot'
      )
    },
    async validateDeployment () {
      if (!this.model.scriptSourceId) {
        this.$message.warning(this.$t('trading-assistant.form.scriptSourceRequired'))
        return false
      }
      if (this.runtimeDirty) {
        const applied = await this.applySourceRuntimeConfig({ silentSuccess: true })
        if (!applied) return false
      }
      if (!this.hasCurrentContract) {
        await this.loadSourceContract(this.model.scriptSourceId)
      }
      if (!this.hasCurrentContract) {
        this.$message.warning(this.$t('strategyV2.sourceContractRequired'))
        return false
      }
      if (!this.model.name) {
        this.$message.warning(this.$t('trading-assistant.validation.strategyNameRequired'))
        return false
      }
      if (!(Number(this.model.initialCapital) > 0)) {
        this.$message.warning(this.$t('trading-assistant.validation.initialCapitalRequired'))
        return false
      }
      return this.validateFinal()
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
        this.normalizeExecutionFields()
        this.syncRuntimeDraftFromSource()
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
      if (
        this.model.executionMode === 'live' &&
        !this.compatibleCredentials.some(item => String(item.id) === String(this.model.credentialId))
      ) {
        this.$message.warning(this.$t('trading-assistant.validation.credentialRequired'))
        return false
      }
      if (this.model.executionMode === 'live' && this.requiresDirectionFallback && !this.model.directionMode) {
        this.$message.warning(this.$t('strategyCenter.editor.directionModeRequired'))
        return false
      }
      if (this.model.equityStopLossEnabled && !(Number(this.model.equityStopLossPct) > 0 && Number(this.model.equityStopLossPct) <= 1)) {
        this.$message.warning(this.$t('trading-assistant.validation.equityStopLossRequired'))
        return false
      }
      if (this.model.equityTakeProfitEnabled && !(Number(this.model.equityTakeProfitPct) > 0 && Number(this.model.equityTakeProfitPct) <= 10)) {
        this.$message.warning(this.$t('trading-assistant.validation.equityTakeProfitRequired'))
        return false
      }
      return true
    },
    async save () {
      if (!(await this.validateDeployment())) return
      this.saving = true
      try {
        const payload = {
          sourceId: Number(this.model.scriptSourceId),
          name: this.model.name,
          initialCapital: Number(this.model.initialCapital),
          leverageEnabled: Boolean(this.model.leverageEnabled && this.supportsStrategyV2Leverage),
          leverage: this.model.leverageEnabled ? Number(this.model.leverage || 1) : 1,
          equityStopLossPct: this.model.equityStopLossEnabled ? Number(this.model.equityStopLossPct) : 0,
          equityTakeProfitPct: this.model.equityTakeProfitEnabled ? Number(this.model.equityTakeProfitPct) : 0,
          executionMode: this.model.executionMode,
          credentialId: this.model.executionMode === 'live' ? this.model.credentialId : undefined,
          directionMode: this.requiresDirectionMode ? this.effectiveDirectionMode : undefined,
          positionSide: this.requiresDirectionMode ? directionModePositionSide(this.effectiveDirectionMode) : undefined,
          params: { ...this.model.templateParams },
          notificationChannels: [...this.model.notifyChannels],
          notificationTargets: notificationTargets(this.notificationSettings),
          aiDecisionFilter: Boolean(this.model.aiDecisionFilter && this.supportsAiDecisionFilter)
        }
        const res = this.isEdit
          ? await updateStrategy(this.strategyId, payload)
          : await createStrategy(payload)
        if (!res || res.code !== 1) throw new Error((res && res.msg) || '')
        this.$message.success(this.$t(this.isEdit ? 'trading-assistant.messages.updateSuccess' : 'trading-assistant.messages.createSuccess'))
        this.$emit('saved', {
          id: Number((res.data && res.data.id) || this.strategyId || 0),
          mode: this.isEdit ? 'edit' : 'create'
        })
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
  .ai-decision-filter-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid #e1e6ed; border-radius: 8px; background: #fafbfc; transition: border-color .18s ease, background .18s ease, box-shadow .18s ease; }
  .ai-decision-filter-card:hover,
  .ai-decision-filter-card:focus-within { border-color: color-mix(in srgb, var(--primary-color, #1677ff) 48%, #d9e6f5); box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #1677ff) 10%, transparent); }
  .ai-decision-filter-card.is-disabled { opacity: .65; }
  .ai-decision-filter-card__icon { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 7px; background: color-mix(in srgb, var(--primary-color, #52c41a) 10%, #fff); color: var(--primary-color, #52c41a); font-size: 15px; }
  .ai-decision-filter-card__copy { flex: 1; min-width: 0; }
  .ai-decision-filter-card__copy strong { color: #18202c; }
  .ai-decision-filter-card__copy p { margin: 3px 0 0; color: #667085; font-size: 12px; line-height: 1.5; }
  .ant-modal { top: 6vh; max-width: calc(100vw - 32px); padding-bottom: 0; }
  .ant-modal-content { display: flex; flex-direction: column; max-height: 88vh; overflow: hidden; border-radius: 10px; box-shadow: 0 20px 56px rgba(15, 23, 42, .24); }
  .ant-modal-header { flex: 0 0 auto; padding: 16px 24px; border-bottom-color: #e8ebf0; }
  .ant-modal-title { color: #18202c; font-size: 17px; font-weight: 700; line-height: 24px; }
  .ant-modal,
  .ant-modal-content,
  .ant-modal-body,
  .ant-spin-nested-loading,
  .ant-spin-container,
  .editor-section { max-width: 100%; }
  .ant-modal-body { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; overflow: hidden; padding: 0; }
  .ant-spin-container { overflow-x: hidden; }
  .ant-modal-footer { flex: 0 0 auto; padding: 12px 24px; border-top-color: #e8ebf0; background: #fff; text-align: initial; }
  .ant-modal-footer .ant-btn { min-width: 82px; height: 34px; border-radius: 5px; }
  .deployment-modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 20px; width: 100%; min-height: 34px; }
  .deployment-modal-footer .deployment-consent-row { flex: 1 1 auto; min-width: 0; margin: 0; text-align: left; }
  .deployment-modal-footer__actions { display: flex; flex: 0 0 auto; align-items: center; gap: 8px; }
  .deployment-modal-footer__actions .ant-btn + .ant-btn { margin-left: 0; }
  .editor-content-scroll { flex: 1 1 auto; min-height: 0; max-height: calc(88vh - 108px); overflow-x: hidden; overflow-y: auto; padding: 16px 20px 20px; overscroll-behavior: contain; }
  .ant-alert-info .ant-alert-icon { color: var(--primary-color, #1890ff); }
  .editor-section { width: 100%; max-width: 860px; margin: 0 auto; }
  .editor-section + .editor-section { margin-top: 10px; }
  .editor-form { max-width: 100%; margin: 0 auto; }
  .editor-form--source { max-width: 100%; }
  .editor-form--execution { display: flex; flex-direction: column; max-width: 860px; }
  .editor-form .ant-form-item { margin-bottom: 14px; }
  .editor-form .ant-form-item-label { padding-bottom: 5px; font-weight: 600; }
  .editor-form .ant-input,
  .editor-form .ant-select-selection,
  .editor-form .ant-input-number { min-height: 36px; border-radius: 5px; }
  .editor-form .ant-select-selection__rendered { line-height: 34px; }
  .editor-form .ant-input-number { width: 100%; }
  .deploy-primary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .strategy-v2-summary { margin: 0; overflow: hidden; border: 1px solid #e1e6ed; border-radius: 8px; background: #fafbfc; }
  .strategy-v2-summary__head { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 11px 14px; border-bottom: 1px solid #e7eaf0; color: #202938; }
  .strategy-v2-summary__head > div { min-width: 0; }
  .strategy-v2-summary__head strong { display: block; font-size: 13px; line-height: 1.35; }
  .strategy-v2-summary__head p { margin: 3px 0 0; color: #7a8594; font-size: 11px; line-height: 1.45; }
  .strategy-v2-summary__meta { display: flex; flex: 0 0 auto; align-items: center; gap: 14px; color: #7c8796; font-size: 11px; white-space: nowrap; }
  .strategy-runtime-editor { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 14px; border: 0; background: transparent; }
  .strategy-runtime-editor__controls { display: grid; grid-template-columns: minmax(230px, 1.35fr) minmax(150px, .65fr); gap: 14px; }
  .strategy-runtime-field { display: flex !important; flex-direction: column; gap: 7px; min-width: 0; color: #354052; font-size: 12px; font-weight: 600; }
  .strategy-runtime-field--exchange { grid-column: 1 / -1; }
  .strategy-runtime-field .ant-select { width: 100%; }
  .strategy-runtime-field__label { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .strategy-runtime-field__label small { color: #d48806; font-size: 11px; font-weight: 500; white-space: nowrap; }
  .strategy-runtime-product { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }
  .strategy-runtime-product .ant-radio-button-wrapper { min-width: 0; height: 38px; padding: 0 12px; overflow: hidden; line-height: 36px; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
  .strategy-runtime-product .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) { border-color: var(--primary-color, #52c41a) !important; background: color-mix(in srgb, var(--primary-color, #52c41a) 9%, #fff) !important; color: var(--primary-color, #52c41a) !important; box-shadow: -1px 0 0 0 var(--primary-color, #52c41a) !important; }
  .strategy-source-apply { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 12px; padding: 10px 12px; border-radius: 6px; background: color-mix(in srgb, var(--primary-color, #faad14) 6%, transparent); color: #7c8796; font-size: 11px; line-height: 1.45; }
  .strategy-source-apply > span { min-width: 0; }
  .strategy-source-apply .ant-btn { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; height: 34px; padding: 0 16px; border-radius: 6px; }
  .runtime-symbol-option { display: inline-flex; align-items: center; gap: 7px; }
  .runtime-symbol-option .anticon-star { color: #faad14; }
  .strategy-v2-summary__instrument { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin: 0; padding: 14px; background: transparent; }
  .strategy-v2-summary__instrument em { color: #697586; font-size: 12px; font-style: normal; }
  .strategy-v2-summary__instrument b { color: #1f2937; font-size: 16px; overflow-wrap: anywhere; text-align: right; }
  .field-hint { margin-top: 6px; color: #7d8794; font-size: 12px; line-height: 1.5; }
  .field-hint--warning { color: #d48806; }
  .editor-section--execution { overflow: hidden; border: 1px solid #e1e6ed; border-radius: 8px; background: #fff; }
  .deployment-finance-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr); gap: 12px; padding: 14px; border-top: 1px solid #e7eaf0; background: transparent; }
  .deployment-finance-grid > .ant-form-item { min-width: 0; margin: 0; }
  .strategy-equity-risk { padding: 14px; border-top: 1px solid #e7eaf0; }
  .strategy-equity-risk__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 11px; }
  .strategy-equity-risk__head strong { display: block; color: #202938; font-size: 14px; }
  .strategy-equity-risk__head span { display: block; margin-top: 3px; color: #7d8794; font-size: 12px; line-height: 1.5; }
  .strategy-equity-risk__head .ant-tag { flex: 0 0 auto; margin: 0; }
  .strategy-equity-risk__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .strategy-equity-risk__row { display: grid; grid-template-columns: auto minmax(0, 1fr) 112px; align-items: center; gap: 10px; min-width: 0; padding: 11px 12px; border: 1px solid #e1e6ed; border-radius: 7px; background: #fafbfc; transition: border-color .18s ease, background .18s ease; }
  .strategy-equity-risk__row.is-enabled { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 55%, #e1e6ed); background: color-mix(in srgb, var(--primary-color, #52c41a) 5%, #fff); }
  .strategy-equity-risk__row .ant-input-number { width: 112px; }
  .strategy-equity-risk__copy { min-width: 0; }
  .strategy-equity-risk__copy strong { display: block; color: #202938; font-size: 13px; line-height: 1.4; }
  .strategy-equity-risk__copy span { display: block; margin-top: 2px; color: #7d8794; font-size: 11px; line-height: 1.4; overflow-wrap: anywhere; }
  .full-radio-group { display: flex; width: 100%; }
  .full-radio-group .ant-radio-button-wrapper { flex: 1; text-align: center; }
  .parameter-panel { margin-top: 0; padding: 4px 4px 0; border: 0; border-radius: 0; background: transparent; }
  .parameter-panel--source { margin-top: 0; }
  .parameter-panel__head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
  .parameter-panel__head strong { display: block; color: #202938; font-size: 14px; }
  .parameter-panel__head span { display: block; margin-top: 3px; color: #7d8794; font-size: 12px; }
  .parameter-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 14px; }
  .parameter-description { margin-top: 5px; color: #7d8794; font-size: 11px; line-height: 1.45; }
  .parameter-contract-hint { margin: -2px 0 13px; color: #7d8794; font-size: 11px; line-height: 1.5; }
  .leverage-panel { display: flex; align-items: center; gap: 12px; margin: 0; padding: 0 0 0 14px; border: 0; border-left: 1px solid #e4e8ee; border-radius: 0; background: transparent; }
  .leverage-panel__copy { min-width: 0; }
  .leverage-panel__copy strong { display: block; color: #202938; font-size: 14px; }
  .leverage-panel__copy span { display: block; margin-top: 3px; color: #7d8794; font-size: 12px; line-height: 1.5; }
  .leverage-panel__control { display: flex; align-items: center; gap: 8px; flex: 0 0 138px; margin-left: auto; }
  .leverage-panel__control .ant-input-number { width: 108px; }
  .leverage-panel__control b { color: #4b5563; font-size: 16px; }
  .execution-panel { padding: 14px; border: 0; border-radius: 0; background: transparent; }
  .execution-panel--live { border-top: 1px solid #e7eaf0; }
  .execution-panel__head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
  .execution-panel__head > div { min-width: 0; }
  .execution-panel__head strong { display: block; color: #202938; font-size: 13px; line-height: 1.4; overflow-wrap: anywhere; }
  .execution-panel__head > div > span { display: block; margin-top: 2px; color: #7d8794; font-size: 11px; line-height: 1.45; white-space: normal; overflow-wrap: anywhere; }
  .execution-panel__status { flex: 0 0 auto; margin: 0 0 0 auto; }
  .execution-mode-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; width: 100%; }
  .execution-mode-grid.is-single { grid-template-columns: minmax(0, 1fr); }
  .execution-mode-card { display: flex; align-items: flex-start; min-width: 0; margin: 0 !important; padding: 12px; border: 1px solid #e1e6ed; border-radius: 7px; background: #fafbfc; white-space: normal; transition: border-color .18s ease, background .18s ease, box-shadow .18s ease; }
  .execution-mode-card:hover { border-color: color-mix(in srgb, var(--primary-color, #faad14) 48%, #e1e6ed); }
  .execution-mode-card.is-selected { border-color: var(--primary-color, #faad14); background: color-mix(in srgb, var(--primary-color, #faad14) 7%, #fff); box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #faad14) 10%, transparent); }
  .execution-mode-card > .ant-radio { margin-top: 8px; }
  .execution-mode-card > span:last-child { display: flex; align-items: flex-start; gap: 9px; min-width: 0; width: 100%; padding-left: 8px; white-space: normal; }
  .execution-mode-card__icon { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 32px; height: 32px; border-radius: 7px; background: color-mix(in srgb, var(--primary-color, #faad14) 11%, #fff); color: var(--primary-color, #faad14); font-size: 14px; }
  .execution-mode-card__copy { min-width: 0; white-space: normal; overflow-wrap: anywhere; }
  .execution-mode-card__copy strong { display: block; color: #202938; font-size: 13px; line-height: 1.4; white-space: normal; overflow-wrap: anywhere; }
  .execution-mode-card__copy > span { display: block; margin-top: 4px; color: #7d8794; font-size: 11px; line-height: 1.5; white-space: normal; overflow-wrap: anywhere; }
  .live-connection-grid { display: block; }
  .live-connection-grid .ant-form-item { margin: 0; }
  .deployment-consent-row { display: flex; align-items: center; gap: 6px; width: 100%; max-width: 860px; margin: 10px auto 0; padding: 0 2px; color: #697586; font-size: 12px; }
  .deployment-consent-row .ant-checkbox-wrapper { color: inherit; font-size: inherit; }
  .deployment-consent-row__link { height: auto; padding: 0; font-size: inherit; line-height: inherit; }
  .advanced-field { margin-bottom: 12px; }
  .advanced-field strong { display: block; margin-bottom: 8px; color: #202938; font-size: 13px; }
  .advanced-field p { margin: 7px 0 0; color: #7d8794; font-size: 11px; line-height: 1.5; }
  .notification-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; width: 100%; }
  .notification-card { display: flex; align-items: center; min-width: 0; min-height: 42px; margin: 0 !important; padding: 9px 10px; border: 1px solid #e4e8ee; border-radius: 7px; background: #fafbfc; white-space: normal; transition: border-color .18s ease, background .18s ease; }
  .notification-card:hover { border-color: color-mix(in srgb, var(--primary-color, #faad14) 45%, #e4e8ee); }
  .notification-card.is-selected { border-color: color-mix(in srgb, var(--primary-color, #faad14) 72%, #e4e8ee); background: color-mix(in srgb, var(--primary-color, #faad14) 7%, #fff); }
  .notification-card > span:last-child { min-width: 0; padding-left: 9px; white-space: normal; }
  .notification-card__content { display: inline-flex; align-items: center; gap: 8px; min-width: 0; color: #354052; font-size: 12px; font-weight: 600; white-space: normal; overflow-wrap: anywhere; }
  .credential-config-link { display: inline-block; margin-left: 4px; color: var(--primary-color, #faad14); font-weight: 600; }
  .credential-field-label { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; }
  .credential-field-label .ant-btn { display: inline-flex; align-items: center; height: 24px; padding: 0; font-size: 12px; }
  .notification-card__content .anticon { color: #7d8794; font-size: 15px; }
  .notification-card.is-selected .notification-card__content .anticon { color: var(--primary-color, #faad14); }
  .deploy-collapse { overflow: hidden; border: 0; background: transparent; }
  .deploy-collapse + .deploy-collapse { margin-top: 12px; }
  .deploy-collapse > .ant-collapse-item { border: 0; }
  .deploy-collapse > .ant-collapse-item > .ant-collapse-header { min-height: 42px; padding: 11px 40px 11px 14px; border-top: 1px solid #e7eaf0; color: #354052; font-size: 13px; font-weight: 600; line-height: 20px; }
  .deploy-collapse > .ant-collapse-item > .ant-collapse-header .ant-collapse-arrow { right: 14px; left: auto; }
  .deploy-collapse .ant-collapse-content { border-top: 1px solid #edf0f4; background: transparent; }
  .deploy-collapse .ant-collapse-content > .ant-collapse-content-box { padding: 14px; }
  .deploy-collapse__title { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; }
  .deploy-collapse__title .ant-tag { margin-right: 0; }
  .deployment-options { display: grid; gap: 12px; padding-top: 2px; }
  .strategy-v2-summary .deploy-collapse > .ant-collapse-item > .ant-collapse-header { border-top-color: #e7eaf0; }
  .editor-reveal-enter-active,
  .editor-reveal-leave-active { transition: opacity .18s ease, transform .18s ease; }
  .editor-reveal-enter,
  .editor-reveal-leave-to { opacity: 0; transform: translateY(-6px); }
  &.theme-dark {
    .ant-modal-content,
    .ant-modal-header,
    .ant-modal-body,
    .ant-modal-footer,
    .editor-content-scroll { border-color: #333; background: #1b1b1b; }
    .ant-modal-title,
    .parameter-panel__head strong,
    .leverage-panel__copy strong,
    .ant-form-item-label > label { color: #eef0f3 !important; }
    .strategy-v2-summary,
    .editor-section--execution { border-color: #333; background: #1b1b1b; }
    .parameter-panel,
    .leverage-panel { background: transparent; }
    .execution-panel { background: transparent; }
    .execution-panel--live,
    .deployment-finance-grid,
    .strategy-equity-risk { border-top-color: #333; background: transparent; }
    .deploy-collapse { background: transparent; }
    .deployment-finance-grid .leverage-panel { border-left-color: #333; }
    .deploy-collapse > .ant-collapse-item > .ant-collapse-header { border-top-color: #333; color: #dfe4e9; }
    .deploy-collapse .ant-collapse-content { border-top-color: #333; background: transparent; color: #dfe4e9; }
    .field-hint,
    .parameter-panel__head span,
    .leverage-panel__copy span,
    .strategy-equity-risk__head span,
    .strategy-equity-risk__copy span { color: #8c949f; }
    .execution-panel__head strong,
    .execution-mode-card__copy strong,
    .advanced-field strong,
    .notification-card__content { color: #eef0f3; }
    .strategy-equity-risk__head strong,
    .strategy-equity-risk__copy strong { color: #eef0f3; }
    .execution-panel__head > div > span,
    .execution-mode-card__copy > span,
    .advanced-field p { color: #8c949f; }
    .execution-mode-card__icon { background: color-mix(in srgb, var(--primary-color, #faad14) 15%, #202020); }
    .execution-mode-card,
    .notification-card,
    .ai-decision-filter-card,
    .strategy-equity-risk__row { border-color: #333; background: #202020; }
    .strategy-equity-risk__row.is-enabled { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 58%, #333); background: color-mix(in srgb, var(--primary-color, #52c41a) 8%, #202020); }
    .execution-mode-card:hover,
    .notification-card:hover { border-color: color-mix(in srgb, var(--primary-color, #faad14) 55%, #343434); }
    .execution-mode-card.is-selected,
    .notification-card.is-selected { border-color: var(--primary-color, #faad14); background: color-mix(in srgb, var(--primary-color, #faad14) 10%, #202020); }
    .ai-decision-filter-card:hover,
    .ai-decision-filter-card:focus-within { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 48%, #333); box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #52c41a) 12%, transparent); }
    .ai-decision-filter-card__icon { background: color-mix(in srgb, var(--primary-color, #52c41a) 14%, #202020); color: var(--primary-color, #52c41a); }
    .ai-decision-filter-card__copy strong { color: #eef0f3; }
    .ai-decision-filter-card__copy p { color: #98a1ac; }
    .strategy-v2-summary__head { border-bottom-color: #333; }
    .strategy-v2-summary__head,
    .strategy-v2-summary__instrument b { color: #eef0f3; }
    .strategy-v2-summary__head p,
    .strategy-v2-summary__meta,
    .strategy-v2-summary__instrument em { color: #8c949f; }
    .strategy-runtime-editor { background: transparent; }
    .strategy-runtime-field { color: #dfe4e9; }
    .strategy-source-apply { color: #8c949f; }
    .strategy-v2-summary__instrument { background: transparent; }
    .leverage-panel__control b { color: #cfd4da; }
    .ant-input,
    .ant-input-number,
    .ant-input-number-input,
    .ant-select-selection { border-color: #373737; background: #202020; color: #eef0f3; }
    .ant-input::placeholder,
    .ant-select-selection__placeholder { color: #6f7782; }
    .ant-select-arrow,
    .ant-input-number-handler { color: #9299a3; }
    .ant-input-number-handler-wrap { border-color: #373737; background: #202020; }
    .ant-radio-button-wrapper { border-color: #373737; background: #202020; color: #aab0b8; }
    .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) { border-color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 18%, #202020); color: var(--primary-color, #52c41a); box-shadow: -1px 0 0 0 var(--primary-color, #52c41a); }
    .strategy-runtime-product .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) { background: color-mix(in srgb, var(--primary-color, #52c41a) 10%, #202020) !important; }
    .deployment-consent-row { color: #aab0b8; }
    .ant-checkbox-wrapper,
    .ant-modal-close { color: #aab0b8; }
    .ant-alert-info .ant-alert-icon { color: var(--primary-color, #52c41a); }
    .ant-alert-info { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 34%, #333333); background: color-mix(in srgb, var(--primary-color, #52c41a) 7%, #141414); }
    .ant-alert-info .ant-alert-message { color: #dfe4e9; }
    .ant-alert-info .ant-alert-description { color: #98a1ac; }
  }
}
.deployment-disclaimer-popover {
  max-width: 420px;
  .ant-popover-title { font-size: 14px; font-weight: 600; }
  .ant-popover-inner-content { padding: 12px 16px; }
  p { margin: 0; color: #5d6876; font-size: 13px; line-height: 1.7; }
  &.deployment-disclaimer-popover--dark {
    .ant-popover-inner { background: #202020; }
    .ant-popover-title { border-bottom-color: #353535; color: #eef0f3; }
    .ant-popover-arrow { border-right-color: #202020 !important; border-bottom-color: #202020 !important; }
    p { color: #aab0b8; }
  }
}
@import '../../../components/Watchlist/watchlist-select.less';
@media (max-width: 640px) {
  .live-strategy-editor-wrap {
    .ant-modal { width: calc(100vw - 20px) !important; margin: 0 10px; }
    .ant-modal-body { padding: 18px; }
    .ant-modal-footer { padding: 10px 14px; }
    .deployment-modal-footer { align-items: stretch; flex-direction: column; gap: 8px; }
    .deployment-modal-footer__actions { justify-content: flex-end; }
    .parameter-grid,
    .notification-grid,
    .execution-mode-grid,
    .live-connection-grid,
    .strategy-runtime-editor__controls,
    .deploy-primary-grid,
    .deployment-finance-grid,
    .strategy-equity-risk__grid { grid-template-columns: 1fr; }
    .strategy-runtime-field--exchange { grid-column: auto; }
    .strategy-source-apply { align-items: stretch; flex-direction: column; }
    .leverage-panel { align-items: flex-start; flex-wrap: wrap; }
    .deployment-finance-grid .leverage-panel { padding: 12px 0 0; border-top: 1px solid #e4e8ee; border-left: 0; }
    &.theme-dark .deployment-finance-grid .leverage-panel { border-top-color: #333333; }
    .leverage-panel__control { flex-basis: 100%; margin-left: 51px; }
    .execution-panel { padding: 15px; }
    .execution-panel__status { display: none; }
    .full-radio-group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .full-radio-group .ant-radio-button-wrapper { width: auto; }
    .ai-decision-filter-card { align-items: flex-start; flex-wrap: wrap; }
    .ai-decision-filter-card__copy { flex-basis: calc(100% - 50px); }
    .ai-decision-filter-card .ant-switch { margin-inline-start: 50px; }
  }
}
</style>
