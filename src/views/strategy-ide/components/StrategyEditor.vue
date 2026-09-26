<template>
  <div class="strategy-editor" :class="{ 'theme-dark': isDark }">
    <div v-if="$slots.toolbar" class="editor-top-toolbar">
      <slot name="toolbar"></slot>
    </div>
    <div
      class="editor-layout"
      :class="{
        'editor-layout--split': isSplitSideMode,
        'editor-layout--split-no-params': isSplitSideMode && !hasStrategyConfiguration
      }"
    >
      <div class="code-col">
        <div class="code-section">
          <div class="section-header">
            <div class="section-title-wrap">
              <span class="section-title">
                <a-icon type="code" /> {{ $t('trading-assistant.editor.title') }}
              </span>
              <a-tag v-if="selectedTemplate" color="blue" class="current-template-tag">
                {{ getTemplateTitle(selectedTemplate) }}
              </a-tag>
              <a-tag v-else-if="isBlankScript" color="default" class="current-template-tag">
                {{ $t('trading-assistant.editor.blankTemplate') }}
              </a-tag>
            </div>
            <div class="section-actions">
              <span
                v-if="lastVerificationState"
                class="verification-status"
                :class="`verification-status--${lastVerificationState}`"
              >
                <a-icon :type="lastVerificationState === 'passed' ? 'check-circle' : 'exclamation-circle'" />
                {{ lastVerificationState === 'passed' ? $t('trading-assistant.editor.verifySuccess') : $t('trading-assistant.editor.verifyFailed') }}
              </span>
              <a-button
                type="link"
                size="small"
                @click="handleVerify"
                :loading="verifying"
                :disabled="hiddenSource || readonly"
                class="verify-btn"
              >
                <a-icon type="check-circle" />
                {{ $t('trading-assistant.editor.verify') }}
              </a-button>
              <a
                class="developer-guide-link"
                href="https://www.quantdinger.com/doc/trading/STRATEGY_DEV_GUIDE.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                <a-icon type="book" />
                {{ $t('dashboard.indicator.editor.guide') }}
              </a>
            </div>
          </div>
          <div v-if="hiddenSource" class="code-hidden-mask">
            <a-icon type="lock" />
            <strong>{{ hiddenTitle || $t('trading-assistant.editor.hiddenCodeTitle') }}</strong>
            <span>{{ hiddenDescription || $t('trading-assistant.editor.hiddenCodeDesc') }}</span>
          </div>
          <div v-else ref="editorContainer" class="code-editor-container"></div>
        </div>
        <div v-if="!isSplitSideMode && $slots['ai-workspace']" class="strategy-ai-workspace-host">
          <slot name="ai-workspace"></slot>
        </div>
      </div>

      <div v-if="!isSplitSideMode || hasStrategyConfiguration" class="side-col">
        <div v-if="isSplitSideMode" class="side-tabs side-tabs--split">
          <div class="split-param-pane">
            <div class="params-panel">
              <div v-if="hasRuntimeControls && assetType === 'script'" class="runtime-setup">
                <div class="runtime-setup__head">
                  <div class="runtime-setup__copy">
                    <strong>{{ $t('strategyBuilder.setupTitle') }}</strong>
                    <span>{{ $t('strategyBuilder.setupDescription') }}</span>
                  </div>
                  <span v-if="runtimeCapabilities.hasInstrument" class="runtime-market-badge">
                    <a-icon type="global" /> {{ runtimeMarketLabel }}
                  </span>
                </div>
                <div class="runtime-setup__grid">
                  <label v-if="runtimeCapabilities.hasInstrument" class="runtime-field runtime-field--wide">
                    <span class="runtime-field__label">
                      <span>{{ $t('strategyBuilder.symbol') }}</span>
                      <small v-if="runtimeWatchlistCount">
                        <a-icon type="star" theme="filled" />
                        {{ $t('universeManager.tabs.watchlist') }} {{ runtimeWatchlistCount }}
                      </small>
                    </span>
                    <a-select
                      show-search
                      :filter-option="false"
                      :value="runtimeSymbolValue"
                      :loading="runtimeSymbolLoading"
                      :placeholder="$t('strategyBuilder.symbolPlaceholder')"
                      @search="$emit('runtime-symbol-search', $event)"
                      @change="$emit('runtime-symbol-change', $event)"
                      @dropdownVisibleChange="handleRuntimeSymbolDropdown"
                    >
                      <a-select-option v-for="option in runtimeSymbolOptions" :key="option.value" :value="option.value">
                        <span class="runtime-symbol-option">
                          <a-icon v-if="option.is_watchlist" type="star" theme="filled" />
                          <span>{{ option.label }}</span>
                        </span>
                      </a-select-option>
                    </a-select>
                  </label>
                  <label v-if="runtimeCapabilities.hasExchange" class="runtime-field runtime-field--wide">
                    <span>{{ $t('strategyBuilder.exchange') }}</span>
                    <a-select :value="runtimeConfig.exchange_id" @change="emitRuntimeChange('exchange_id', $event)">
                      <a-select-option v-for="option in runtimeExchangeOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </a-select-option>
                    </a-select>
                  </label>
                  <label
                    v-if="runtimeCapabilities.hasProduct"
                    class="runtime-field runtime-field--wide"
                  >
                    <span>{{ $t('strategyBuilder.product') }}</span>
                    <a-radio-group class="runtime-product-switch" :value="runtimeConfig.market_type" button-style="solid" @change="emitRuntimeChange('market_type', $event.target.value)">
                      <a-radio-button value="spot">{{ $t('strategyBuilder.spot') }}</a-radio-button>
                      <a-radio-button value="swap">{{ $t('strategyBuilder.swap') }}</a-radio-button>
                    </a-radio-group>
                  </label>
                  <label v-if="runtimeCapabilities.hasTimeframe" class="runtime-field" :class="{ 'runtime-field--wide': !runtimeCapabilities.hasDirection }">
                    <span>{{ $t('strategyBuilder.timeframe') }}</span>
                    <a-select :value="runtimeConfig.timeframe" @change="emitRuntimeChange('timeframe', $event)">
                      <a-select-option v-for="timeframe in runtimeTimeframes" :key="timeframe" :value="timeframe">{{ timeframe }}</a-select-option>
                    </a-select>
                  </label>
                  <label v-if="runtimeCapabilities.hasDirection" class="runtime-field">
                    <span>{{ $t('strategyBuilder.direction') }}</span>
                    <a-select :value="runtimeConfig.trade_direction" @change="emitRuntimeChange('trade_direction', $event)">
                      <a-select-option value="long">{{ $t('strategyBuilder.long') }}</a-select-option>
                      <a-select-option value="short">{{ $t('strategyBuilder.short') }}</a-select-option>
                      <a-select-option value="both">{{ $t('strategyBuilder.both') }}</a-select-option>
                    </a-select>
                  </label>
                </div>
                <div v-if="runtimeCapabilities.hasProduct && runtimeConfig.market_category === 'Crypto' && runtimeConfig.market_type === 'spot'" class="runtime-setup__hint">
                  <a-icon type="info-circle" /> {{ $t('strategyBuilder.spotLongOnly') }}
                </div>
              </div>
              <div v-if="hasStrategyCode && activeParamTemplate" class="params-toolbar">
                <div class="params-toolbar__summary">
                  <div class="panel-intro__title">
                    {{ activeParamTemplateTitle }}
                    <a-tag v-if="activeParamTemplate" color="green" class="params-count-tag">
                      {{ (activeParamTemplate.params || []).length }} {{ $t('trading-assistant.editor.paramsTab') }}
                    </a-tag>
                  </div>
                  <div class="panel-intro__desc">
                    {{ activeParamTemplateDesc }}
                  </div>
                </div>
                <div v-if="activeParamTemplate" class="params-actions">
                  <a-button size="small" @click="resetTemplateParams">
                    {{ $t('trading-assistant.editor.resetTemplateParams') }}
                  </a-button>
                  <a-button
                    v-if="!hiddenSource"
                    size="small"
                    type="primary"
                    @click="applySelectedTemplateToCode"
                    :disabled="!templateDirty || readonly"
                  >
                    {{ $t('trading-assistant.editor.applyTemplateParams') }}
                  </a-button>
                  <a-tag v-else color="blue" class="params-live-tag">
                    {{ $t('trading-assistant.editor.hiddenParamsLive') }}
                  </a-tag>
                </div>
              </div>
              <template v-if="hasStrategyCode && activeParamTemplate">
                <div class="param-list">
                  <div v-for="param in activeParamTemplate.params" :key="param.name" class="param-item">
                    <div class="param-item__label-row">
                      <span class="param-item__label">{{ getParamLabel(param) }}</span>
                      <span class="param-item__type">{{ getParamTypeLabel(param.type) }}</span>
                    </div>
                    <div v-if="getParamDescription(param)" class="param-item__desc">{{ getParamDescription(param) }}</div>
                    <a-input-number
                      v-if="param.type === 'percent'"
                      :value="templateParamValues[param.name]"
                      :min="param.min"
                      :max="param.max"
                      :step="param.step || 1"
                      :precision="getParamPrecision(param)"
                      :formatter="formatPercentInput"
                      :parser="parsePercentInput"
                      style="width: 100%"
                      @change="handleNumericParamChange(param, $event)"
                    />
                    <a-input-number
                      v-else-if="param.type === 'number' || param.type === 'integer'"
                      :value="templateParamValues[param.name]"
                      :min="param.min"
                      :max="param.max"
                      :step="param.step || 1"
                      :precision="param.type === 'integer' ? 0 : getParamPrecision(param)"
                      style="width: 100%"
                      @change="handleNumericParamChange(param, $event)"
                    />
                    <a-select
                      v-else-if="param.type === 'select'"
                      :value="templateParamValues[param.name]"
                      style="width: 100%"
                      @change="handleSelectParamChange(param, $event)"
                    >
                      <a-select-option
                        v-for="option in (param.options || [])"
                        :key="option.value"
                        :value="option.value">
                        {{ getOptionLabel(param, option) }}
                      </a-select-option>
                    </a-select>
                    <div v-else-if="param.type === 'boolean'" class="param-item__switch">
                      <a-switch
                        :checked="!!templateParamValues[param.name]"
                        @change="handleBooleanParamChange(param, $event)"
                      />
                      <span>{{ templateParamValues[param.name] ? $t('common.yes') : $t('common.no') }}</span>
                    </div>
                    <a-input
                      v-else
                      :value="templateParamValues[param.name]"
                      @input="handleTextParamChange(param, $event.target.value)"
                    />
                  </div>
                </div>
              </template>
              <div v-else-if="!hasRuntimeControls" class="params-empty-guide">
                <a-empty :description="$t('trading-assistant.editor.paramsEmpty')" />
              </div>
            </div>
          </div>
        </div>
        <a-tabs
          v-else
          v-model="activeTab"
          size="small"
          class="side-tabs"
          :animated="false"
        >
          <a-tab-pane v-if="!isSplitSideMode" key="templates" :tab="$t('trading-assistant.editor.templateTab')" :force-render="true">
            <div class="panel-intro panel-intro--compact">
              <div class="panel-intro__title">{{ templatePickerTitle }}</div>
              <div class="panel-intro__desc">{{ templatePickerDescription }}</div>
            </div>

            <div
              class="blank-card"
              :class="{ active: isBlankScript }"
              @click="loadBlankTemplate"
            >
              <div class="blank-card__body">
                <div class="blank-card__title">{{ $t('trading-assistant.editor.blankTemplate') }}</div>
                <div class="blank-card__desc">{{ blankTemplateDescription }}</div>
              </div>
              <a-icon v-if="isBlankScript" type="check-circle" theme="filled" class="blank-card__check" />
            </div>

            <div class="template-section-label">
              {{ templateSectionTitle }}
            </div>

            <a-empty v-if="!visibleTemplates.length" class="template-empty" :description="$t('trading-assistant.editor.templateEmpty')" />
            <div v-else class="template-grid">
              <div
                v-for="tpl in visibleTemplates"
                :key="tpl.key"
                class="template-card"
                :class="[`template-card--${tpl.accent || 'blue'}`, { active: selectedTemplateKey === tpl.key, disabled: readonly }]"
                @click="loadTemplate(tpl.key, { focusParams: true, resetParams: true })"
              >
                <div class="template-card__head">
                  <span class="template-card__icon">
                    <a-icon :type="safeTemplateIcon(tpl)" />
                  </span>
                  <span class="template-card__name">{{ getTemplateTitle(tpl) }}</span>
                </div>
                <div class="template-card__desc">{{ getTemplateDesc(tpl) }}</div>
                <div class="template-card__meta">
                  <span>{{ (tpl.params || []).length }} {{ $t('trading-assistant.editor.paramsTab') }}</span>
                  <span>{{ $t('strategyV2.apiBadge') }}</span>
                </div>
                <div class="template-card__foot">
                  <span class="template-card__action">
                    {{ $t('trading-assistant.template.useTemplate') }}
                    <a-icon type="arrow-right" />
                  </span>
                </div>
              </div>
            </div>
          </a-tab-pane>

          <a-tab-pane key="params" :tab="$t('trading-assistant.editor.paramsTab')" :force-render="true">
            <div class="params-panel">
              <div class="panel-intro">
                <div class="panel-intro__title">
                  {{ activeParamTemplateTitle }}
                </div>
                <div class="panel-intro__desc">
                  {{ activeParamTemplateDesc }}
                </div>
              </div>
              <template v-if="activeParamTemplate">
                <div class="param-list">
                  <div v-for="param in activeParamTemplate.params" :key="param.name" class="param-item">
                    <div class="param-item__label-row">
                      <span class="param-item__label">{{ getParamLabel(param) }}</span>
                      <span class="param-item__type">{{ getParamTypeLabel(param.type) }}</span>
                    </div>
                    <div v-if="getParamDescription(param)" class="param-item__desc">{{ getParamDescription(param) }}</div>
                    <a-input-number
                      v-if="param.type === 'percent'"
                      :value="templateParamValues[param.name]"
                      :min="param.min"
                      :max="param.max"
                      :step="param.step || 1"
                      :precision="getParamPrecision(param)"
                      :formatter="formatPercentInput"
                      :parser="parsePercentInput"
                      style="width: 100%"
                      @change="handleNumericParamChange(param, $event)"
                    />
                    <a-input-number
                      v-else-if="param.type === 'number' || param.type === 'integer'"
                      :value="templateParamValues[param.name]"
                      :min="param.min"
                      :max="param.max"
                      :step="param.step || 1"
                      :precision="param.type === 'integer' ? 0 : getParamPrecision(param)"
                      style="width: 100%"
                      @change="handleNumericParamChange(param, $event)"
                    />
                    <a-select
                      v-else-if="param.type === 'select'"
                      :value="templateParamValues[param.name]"
                      style="width: 100%"
                      @change="handleSelectParamChange(param, $event)"
                    >
                      <a-select-option
                        v-for="option in (param.options || [])"
                        :key="option.value"
                        :value="option.value">
                        {{ getOptionLabel(param, option) }}
                      </a-select-option>
                    </a-select>
                    <div v-else-if="param.type === 'boolean'" class="param-item__switch">
                      <a-switch
                        :checked="!!templateParamValues[param.name]"
                        @change="handleBooleanParamChange(param, $event)"
                      />
                      <span>{{ templateParamValues[param.name] ? $t('common.yes') : $t('common.no') }}</span>
                    </div>
                    <a-input
                      v-else
                      :value="templateParamValues[param.name]"
                      @input="handleTextParamChange(param, $event.target.value)"
                    />
                  </div>
                </div>
                <div class="params-actions">
                  <a-button @click="resetTemplateParams">
                    {{ $t('trading-assistant.editor.resetTemplateParams') }}
                  </a-button>
                  <a-button
                    v-if="!hiddenSource"
                    type="primary"
                    @click="applySelectedTemplateToCode"
                    :disabled="!templateDirty || readonly"
                  >
                    {{ $t('trading-assistant.editor.applyTemplateParams') }}
                  </a-button>
                  <a-tag v-else color="blue" class="params-live-tag">
                    {{ $t('trading-assistant.editor.hiddenParamsLive') }}
                  </a-tag>
                </div>
              </template>
            </div>
            <div v-if="!activeParamTemplate" class="params-empty-guide">
              <a-empty :description="$t('trading-assistant.editor.paramsEmpty')" />
            </div>
          </a-tab-pane>

        </a-tabs>
      </div>
      <div
        v-if="isSplitSideMode && $slots['ai-workspace']"
        class="strategy-ai-workspace-host strategy-ai-workspace-host--primary"
      >
        <slot name="ai-workspace"></slot>
      </div>
    </div>
    <a-modal
      :visible="showTemplatePicker"
      :title="$t('trading-assistant.editor.templateTab')"
      :footer="null"
      :width="980"
      :destroy-on-close="false"
      :get-container="templateModalGetContainer"
      :wrap-class-name="isDark ? 'script-template-picker script-template-picker--dark' : 'script-template-picker'"
      @cancel="showTemplatePicker = false"
    >
      <div class="panel-intro panel-intro--compact">
        <div class="panel-intro__title">
          {{ templatePickerTitle }}
          <a-tag color="green">{{ visibleTemplates.length }}</a-tag>
        </div>
        <div class="panel-intro__desc">{{ templatePickerDescription }}</div>
      </div>

      <div class="template-picker-layout">
        <div
          class="blank-card"
          :class="{ active: isBlankScript }"
          @click="loadBlankTemplate"
        >
          <div class="blank-card__body">
            <div class="blank-card__title">{{ $t('trading-assistant.editor.blankTemplate') }}</div>
            <div class="blank-card__desc">{{ blankTemplateDescription }}</div>
          </div>
          <a-icon v-if="isBlankScript" type="check-circle" theme="filled" class="blank-card__check" />
        </div>
      </div>

      <div class="template-section-label">
        {{ templateSectionTitle }}
      </div>

      <a-empty v-if="!visibleTemplates.length" class="template-empty" :description="$t('trading-assistant.editor.templateEmpty')" />
      <div v-else class="template-grid template-grid--modal">
        <div
          v-for="tpl in visibleTemplates"
          :key="tpl.key"
          class="template-card"
          :data-testid="`strategy-template-${tpl.key}`"
          :class="[`template-card--${tpl.accent || 'blue'}`, { active: selectedTemplateKey === tpl.key, disabled: readonly }]"
          @click="loadTemplate(tpl.key, { focusParams: true, resetParams: true })"
        >
          <div class="template-card__head">
            <span class="template-card__icon">
              <a-icon :type="safeTemplateIcon(tpl)" />
            </span>
            <span class="template-card__name">{{ getTemplateTitle(tpl) }}</span>
          </div>
          <div class="template-card__desc">{{ getTemplateDesc(tpl) }}</div>
          <div class="template-card__meta">
            <span>{{ (tpl.params || []).length }} {{ $t('trading-assistant.editor.paramsTab') }}</span>
            <span>{{ $t('strategyV2.apiBadge') }}</span>
          </div>
          <div class="template-card__foot">
            <span class="template-card__action">
              {{ $t('trading-assistant.template.useTemplate') }}
              <a-icon type="arrow-right" />
            </span>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { message } from 'ant-design-vue'
import request from '@/utils/request'
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/python/python'
import 'codemirror/theme/monokai.css'
import 'codemirror/theme/eclipse.css'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/selection/active-line'
import {
  setScriptTemplateCatalog,
  getScriptTemplateByKey,
  buildTemplateCode,
  buildTemplateParamValues,
  extractScriptParamsFromCode,
  buildScriptCodeWithParamValues,
  applyStrategyRuntimeConfigToCode
} from './scriptTemplateCatalog'
import { getScriptTemplateList } from '@/api/strategy'
import {
  strategyParameterDescription,
  strategyParameterLabel,
  strategyParameterOptionLabel
} from '@/utils/strategyParameterPresentation'
import { ratioPercentInputFormatter, ratioPercentInputParser } from '@/utils/numberFormat'
import { applyCodeEditsToCodeMirror, setCodeMirrorValueWithHighlight } from '@/utils/codeEdits'

export default {
  name: 'StrategyEditor',
  props: {
    value: { type: String, default: '' },
    isDark: { type: Boolean, default: false },
    userId: { type: [Number, String], default: 1 },
    strategyId: { type: [Number, String], default: null },
    scriptSourceId: { type: [Number, String], default: null },
    assetType: { type: String, default: 'script' },
    visible: { type: Boolean, default: false },
    initialTemplateKey: { type: String, default: '' },
    initialParamSchema: { type: Object, default: () => ({}) },
    initialParamValues: { type: Object, default: () => ({}) },
    hiddenSource: { type: Boolean, default: false },
    hiddenTitle: { type: String, default: '' },
    hiddenDescription: { type: String, default: '' },
    readonly: { type: Boolean, default: false },
    consumeCopilotDraft: { type: Boolean, default: true },
    sideMode: { type: String, default: 'tabs' },
    runtimeConfig: { type: Object, default: () => ({}) },
    runtimeExchangeOptions: { type: Array, default: () => [] },
    runtimeSymbolOptions: { type: Array, default: () => [] },
    runtimeSymbolLoading: { type: Boolean, default: false },
    runtimeWatchlistCount: { type: Number, default: 0 },
    runtimeCapabilities: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      activeTab: 'templates',
      lastVerificationState: '',
      showTemplatePicker: false,
      verifying: false,
      editor: null,
      templates: [],
      loadingTemplates: false,
      selectedTemplateKey: '',
      inferredParamTemplate: null,
      templateParamValues: {},
      templateDirty: false,
      runtimeTimeframes: ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'],
      refreshTimer: null,
      refreshTimers: []
    }
  },
  computed: {
    isSplitSideMode () {
      return this.sideMode === 'split'
    },
    hasStrategyCode () {
      return this.hiddenSource || !!String(this.value || '').trim()
    },
    hasRuntimeControls () {
      return this.hasStrategyCode && !!this.runtimeCapabilities.hasControls
    },
    hasStrategyConfiguration () {
      return this.hasRuntimeControls || !!this.activeParamTemplate
    },
    runtimeSymbolValue () {
      const market = String(this.runtimeConfig.market_category || '')
      const symbol = String(this.runtimeConfig.symbol || '').toUpperCase()
      const marketType = String(this.runtimeConfig.market_type || '')
      const exchangeId = String(this.runtimeConfig.exchange_id || '')
      const exact = this.runtimeSymbolOptions.find(option => (
        String(option.market || '') === market &&
        String(option.symbol || '').toUpperCase() === symbol &&
        (!marketType || !option.market_type || String(option.market_type) === marketType) &&
        (!this.runtimeCapabilities.hasExchange || !option.exchange_id || String(option.exchange_id) === exchangeId)
      ))
      return exact ? exact.value : symbol
    },
    runtimeMarketLabel () {
      const market = String(this.runtimeConfig.market_category || '')
      const key = `dashboard.analysis.market.${market}`
      const translated = this.$t(key)
      return translated === key ? market : translated
    },
    visibleTemplates () {
      const expected = this.assetType === 'portfolio_strategy' ? 'portfolio_strategy' : 'script'
      return this.templates.filter(template => template.assetType === expected)
    },
    templatePickerTitle () {
      return this.$t(this.assetType === 'portfolio_strategy'
        ? 'trading-assistant.editor.portfolioTemplateIntroTitle'
        : 'trading-assistant.editor.ctaTemplateIntroTitle')
    },
    templatePickerDescription () {
      return this.$t(this.assetType === 'portfolio_strategy'
        ? 'trading-assistant.editor.portfolioTemplateIntroDesc'
        : 'trading-assistant.editor.ctaTemplateIntroDesc')
    },
    templateSectionTitle () {
      return this.$t(this.assetType === 'portfolio_strategy'
        ? 'trading-assistant.editor.portfolioTemplateSection'
        : 'trading-assistant.editor.ctaTemplateSection')
    },
    blankTemplateDescription () {
      return this.$t(this.assetType === 'portfolio_strategy'
        ? 'trading-assistant.editor.portfolioBlankTemplateDesc'
        : 'trading-assistant.editor.ctaBlankTemplateDesc')
    },
    selectedTemplate () {
      return getScriptTemplateByKey(this.selectedTemplateKey)
    },
    activeParamTemplate () {
      return this.selectedTemplate || this.inferredParamTemplate
    },
    activeParamTemplateTitle () {
      if (this.selectedTemplate) return this.getTemplateTitle(this.selectedTemplate)
      if (this.inferredParamTemplate) return this.inferredParamTemplate.title || this.$t('trading-assistant.editor.codeParamsTitle')
      return this.$t('trading-assistant.editor.codeParamsTitle')
    },
    activeParamTemplateDesc () {
      if (this.selectedTemplate) return this.getTemplateDesc(this.selectedTemplate)
      if (this.inferredParamTemplate) return this.inferredParamTemplate.desc || this.$t('trading-assistant.editor.codeParamsDesc')
      return this.$t('trading-assistant.editor.codeParamsDesc')
    },
    isBlankScript () {
      return !this.selectedTemplateKey
    }
  },
  mounted () {
    if (this.isSplitSideMode && this.activeTab === 'templates') {
      this.activeTab = 'params'
    }
    this.$nextTick(() => {
      if (!this.hiddenSource) {
        this.initEditor()
      }
      this.bootstrapTemplates()
      if (this.consumeCopilotDraft) {
        this.applyCopilotDraft()
      }
    })
    window.addEventListener('resize', this.scheduleEditorRefresh)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.scheduleEditorRefresh)
    this.clearRefreshTimers()
    this.destroyEditor()
  },
  watch: {
    value (newVal) {
      this.lastVerificationState = ''
      if (this.hiddenSource) return
      if (this.editor && this.editor.getValue() !== newVal) {
        this.editor.setValue(newVal || '')
        this.scheduleEditorRefresh()
      }
      if (!this.selectedTemplateKey) {
        this.refreshInferredParamsFromCode(newVal)
      }
    },
    isDark () {
      if (this.editor) {
        this.editor.setOption('theme', this.isDark ? 'monokai' : 'eclipse')
      }
      this.scheduleEditorRefresh()
    },
    readonly (value) {
      if (this.editor) {
        this.editor.setOption('readOnly', value ? 'nocursor' : false)
      }
    },
    hiddenSource (value) {
      if (value) {
        this.destroyEditor()
        this.applyExternalParamState()
      } else {
        this.$nextTick(() => {
          this.initEditor()
        })
      }
    },
    visible (val) {
      if (val) {
        this.$nextTick(() => {
          this.scheduleEditorRefresh()
          try {
            window.dispatchEvent(new Event('resize'))
          } catch (e) {}
        })
      }
    },
    initialTemplateKey (key) {
      if (this.hiddenSource) {
        this.applyExternalParamState()
        return
      }
      if (key && key !== this.selectedTemplateKey) {
        this.applyInitialTemplateKey(key, {
          preserveExistingCode: !!String(this.value || this.getCode() || '').trim()
        })
      } else if (!key) {
        this.selectedTemplateKey = ''
        this.refreshInferredParamsFromCode(this.getCode())
      }
    },
    initialParamSchema: {
      deep: true,
      handler () {
        if (this.hiddenSource) this.applyExternalParamState()
      }
    },
    initialParamValues: {
      deep: true,
      handler () {
        if (this.hiddenSource) this.applyExternalParamState()
      }
    },
    sideMode () {
      if (this.isSplitSideMode && this.activeTab === 'templates') {
        this.activeTab = 'params'
      }
      this.scheduleEditorRefresh()
    },
    assetType () {
      const selected = this.selectedTemplate
      if (selected && selected.assetType !== (this.assetType === 'portfolio_strategy' ? 'portfolio_strategy' : 'script')) {
        this.selectedTemplateKey = ''
        this.templateParamValues = {}
        this.templateDirty = false
      }
    }
  },
  methods: {
    async bootstrapTemplates () {
      await this.loadScriptTemplates()
      if (this._isDestroyed || this._isBeingDestroyed) return
      if (this.hiddenSource) {
        this.applyExternalParamState()
        return
      }
      if (this.initialTemplateKey) {
        this.applyInitialTemplateKey(this.initialTemplateKey, {
          preserveExistingCode: !!String(this.value || '').trim()
        })
      }
    },
    async loadScriptTemplates () {
      this.loadingTemplates = true
      try {
        const res = await getScriptTemplateList()
        const data = res && res.data
        const items = Array.isArray(data)
          ? data
          : ((data && data.items) || [])
        this.templates = [...setScriptTemplateCatalog(items)]
      } catch (e) {
        this.templates = [...setScriptTemplateCatalog([])]
      } finally {
        this.loadingTemplates = false
      }
    },
    templateModalGetContainer () {
      return this.$el || document.body
    },
    applyCopilotDraft () {
      if (this.hiddenSource) return
      let code = ''
      try {
        code = sessionStorage.getItem('qd_strategy_source') || ''
        if (code) sessionStorage.removeItem('qd_strategy_source')
      } catch (_) {}
      if (code) {
        this.activeTab = 'ai'
        this.setCode(code)
        this.templateDirty = true
      }
    },
    initEditor () {
      if (this.hiddenSource) return
      if (!this.$refs.editorContainer) return
      this.editor = CodeMirror(this.$refs.editorContainer, {
        value: String(this.value || ''),
        mode: 'python',
        theme: this.isDark ? 'monokai' : 'eclipse',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        styleActiveLine: true,
        tabSize: 4,
        indentUnit: 4,
        indentWithTabs: false,
        lineWrapping: false,
        readOnly: this.readonly ? 'nocursor' : false,
        fixedGutter: true,
        viewportMargin: Infinity,
        gutters: ['CodeMirror-linenumbers']
      })
      this.editor.on('change', () => {
        const code = this.editor.getValue()
        this.$emit('input', code)
        if (!this.selectedTemplateKey) {
          this.refreshInferredParamsFromCode(code, { preserveValues: true })
        }
      })
      this.refreshInferredParamsFromCode(this.editor.getValue())
      this.scheduleEditorRefresh()
    },

    destroyEditor () {
      if (!this.editor) return
      if (typeof this.editor.toTextArea === 'function') {
        this.editor.toTextArea()
      }
      this.editor = null
    },

    refreshEditorLayout () {
      if (!this.editor) return
      this.editor.refresh()
      const scroller = this.editor.getScrollerElement && this.editor.getScrollerElement()
      if (scroller && scroller.scrollLeft !== 0) {
        scroller.scrollLeft = 0
      }
    },

    clearRefreshTimers () {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer)
        this.refreshTimer = null
      }
      this.refreshTimers.forEach((id) => clearTimeout(id))
      this.refreshTimers = []
    },

    scheduleEditorRefresh () {
      this.clearRefreshTimers()
      ;[0, 60, 280].forEach((delay) => {
        const timerId = setTimeout(() => this.refreshEditorLayout(), delay)
        this.refreshTimers.push(timerId)
      })
    },

    applyInitialTemplateKey (key, { preserveExistingCode = true } = {}) {
      const template = getScriptTemplateByKey(key)
      if (template) {
        if (preserveExistingCode && String(this.value || this.getCode() || '').trim()) {
          this.selectedTemplateKey = key
          this.inferredParamTemplate = null
          this.templateParamValues = buildTemplateParamValues(template, this.initialParamValues)
          this.templateDirty = false
          this.activeTab = 'params'
          return
        }
        this.loadTemplate(key, { focusParams: true, resetParams: true })
        return
      }
      const hasExistingCode = !!(this.value && String(this.value).trim())
      if (!hasExistingCode) {
        this.loadBlankTemplate({ silent: true })
        return
      }
      this.selectedTemplateKey = ''
      this.refreshInferredParamsFromCode(this.value || this.getCode(), { preserveValues: false })
      this.templateDirty = false
    },

    buildSchemaTemplateFromProps () {
      const schema = this.initialParamSchema && typeof this.initialParamSchema === 'object'
        ? this.initialParamSchema
        : {}
      const params = Array.isArray(schema.params) ? schema.params : []
      if (!params.length) return null
      return {
        key: '__hidden_source_params__',
        title: this.$t('trading-assistant.editor.hiddenParamsTitle'),
        desc: this.$t('trading-assistant.editor.hiddenParamsDesc'),
        params: params.filter(item => item && item.name)
      }
    },

    applyExternalParamState () {
      const values = this.initialParamValues && typeof this.initialParamValues === 'object'
        ? this.initialParamValues
        : {}
      const schemaTemplate = this.buildSchemaTemplateFromProps()
      const template = !schemaTemplate && this.initialTemplateKey ? getScriptTemplateByKey(this.initialTemplateKey) : null
      if (schemaTemplate) {
        this.selectedTemplateKey = ''
        this.inferredParamTemplate = schemaTemplate
        this.templateParamValues = buildTemplateParamValues(schemaTemplate, values)
      } else if (template) {
        this.selectedTemplateKey = this.initialTemplateKey
        this.inferredParamTemplate = null
        this.templateParamValues = buildTemplateParamValues(template, values)
      } else {
        this.selectedTemplateKey = ''
        this.inferredParamTemplate = null
        this.templateParamValues = {}
      }
      this.templateDirty = false
      this.activeTab = 'params'
    },

    emitTemplateParams () {
      const paramSchema = this.activeParamTemplate && Array.isArray(this.activeParamTemplate.params)
        ? { params: this.activeParamTemplate.params }
        : (this.initialParamSchema || {})
      this.$emit('template-change', {
        key: this.selectedTemplate ? this.selectedTemplateKey : (this.initialTemplateKey || ''),
        params: { ...this.templateParamValues },
        param_schema: paramSchema
      })
    },

    loadBlankTemplate ({ silent = false } = {}) {
      if (this.hiddenSource) return
      this.selectedTemplateKey = ''
      this.inferredParamTemplate = null
      this.templateParamValues = {}
      this.templateDirty = false
      this.setCode('')
      this.$emit('template-change', { key: '', params: {} })
      this.activeTab = this.isSplitSideMode ? 'params' : 'templates'
      this.showTemplatePicker = false
      if (!silent) {
        this.scheduleEditorRefresh()
      }
    },

    openTemplatePicker () {
      if (this.readonly || this.hiddenSource) return
      this.showTemplatePicker = true
    },

    openTemplateEntry () {
      if (this.isSplitSideMode) {
        this.openTemplatePicker()
        return
      }
      this.activeTab = 'templates'
    },

    loadTemplate (key, { focusParams = false, resetParams = true } = {}) {
      if (this.readonly || this.hiddenSource) return
      const template = getScriptTemplateByKey(key)
      if (!template) return
      this.selectedTemplateKey = key
      this.inferredParamTemplate = null
      if (resetParams || !this.templateParamValues || Object.keys(this.templateParamValues).length === 0) {
        this.templateParamValues = buildTemplateParamValues(template)
      }
      this.templateDirty = true
      this.applySelectedTemplateToCode({ silent: true })
      if (focusParams) {
        this.activeTab = 'params'
      }
      this.showTemplatePicker = false
      this.scheduleEditorRefresh()
    },

    getCode () {
      return this.editor ? this.editor.getValue() : this.value
    },

    setCode (code) {
      if (this.readonly || this.hiddenSource) return
      const nextCode = String(code || '')
      this.$emit('input', nextCode)
      if (this.editor) {
        if (this.editor.getValue() !== nextCode) {
          this.editor.setValue(nextCode)
        }
      }
      this.scheduleEditorRefresh()
    },

    applyCodeEdits (operations) {
      if (this.readonly || this.hiddenSource || !this.editor) return null
      const nextCode = applyCodeEditsToCodeMirror(this.editor, operations)
      this.$emit('input', nextCode)
      this.scheduleEditorRefresh()
      return nextCode
    },

    setCodeWithHighlight (code) {
      if (this.readonly || this.hiddenSource || !this.editor) return null
      const nextCode = setCodeMirrorValueWithHighlight(this.editor, code)
      this.$emit('input', nextCode)
      this.scheduleEditorRefresh()
      return nextCode
    },

    applySelectedTemplateToCode ({ silent = false } = {}) {
      if (this.hiddenSource) {
        this.templateDirty = false
        this.emitTemplateParams()
        return
      }
      if (this.readonly) return
      const template = this.activeParamTemplate
      if (!template) return
      const parameterizedCode = this.selectedTemplate
        ? buildTemplateCode(this.selectedTemplate, this.templateParamValues)
        : buildScriptCodeWithParamValues(this.getCode(), template.params, this.templateParamValues)
      const code = this.assetType === 'script'
        ? applyStrategyRuntimeConfigToCode(parameterizedCode, this.runtimeConfig)
        : parameterizedCode
      this.setCode(code)
      this.templateDirty = false
      this.$emit('template-change', {
        key: this.selectedTemplate ? this.selectedTemplateKey : '',
        params: { ...this.templateParamValues }
      })
      if (!silent) {
        message.success(this.$t('trading-assistant.editor.templateApplied'))
      }
    },

    resetTemplateParams () {
      const template = this.activeParamTemplate
      if (!template) return
      this.templateParamValues = buildTemplateParamValues(template)
      this.templateDirty = true
      if (this.hiddenSource) {
        this.templateDirty = false
        this.emitTemplateParams()
        return
      }
      this.applySelectedTemplateToCode({ silent: false })
    },

    refreshInferredParamsFromCode (code, { preserveValues = true } = {}) {
      if (this.selectedTemplateKey) return
      const inferred = extractScriptParamsFromCode(code)
      if (!inferred) {
        this.inferredParamTemplate = null
        this.templateParamValues = {}
        this.$emit('template-change', { key: '', params: {}, param_schema: { params: [] } })
        return
      }
      const nextValues = buildTemplateParamValues(inferred)
      if (preserveValues && this.templateParamValues) {
        Object.keys(nextValues).forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(this.templateParamValues, key)) {
            nextValues[key] = this.templateParamValues[key]
          }
        })
      }
      this.inferredParamTemplate = inferred
      this.templateParamValues = nextValues
      this.$emit('template-change', {
        key: '',
        params: { ...nextValues },
        param_schema: { params: inferred.params.map(item => ({ ...item })) }
      })
      this.activeTab = 'params'
    },

    getParamLabel (param) {
      return strategyParameterLabel(param, key => this.$t(key))
    },

    getParamDescription (param) {
      return strategyParameterDescription(param, key => this.$t(key), this.$i18n && this.$i18n.locale)
    },

    getParamTypeLabel (type) {
      return this.$t(`trading-assistant.editor.paramType.${type}`)
    },

    formatPercentInput (value) {
      return ratioPercentInputFormatter(value)
    },

    parsePercentInput (value) {
      return ratioPercentInputParser(value)
    },

    getOptionLabel (param, option) {
      return strategyParameterOptionLabel(param, option, key => this.$t(key))
    },

    emitRuntimeChange (field, value) {
      this.$emit('runtime-change', { field, value })
    },

    handleRuntimeSymbolDropdown (visible) {
      if (visible) this.$emit('runtime-symbol-open')
    },

    safeTemplateIcon (template) {
      const byKey = {
        classic_ema_atr_trend: 'line-chart',
        donchian_breakout_pyramid: 'rise',
        bollinger_reversion_basket: 'stock',
        range_grid_basket: 'table',
        dca_accumulator: 'dollar',
        sequential_martingale: 'branches',
        layered_martingale_basket: 'branches',
        keltner_retest_breakout: 'area-chart',
        ema_trend_pullback: 'line-chart',
        donchian_breakout: 'rise',
        atr_channel_breakout: 'area-chart',
        rsi_mean_reversion: 'sync',
        macd_momentum: 'swap',
        bollinger_reversion: 'stock',
        turtle_breakout_lite: 'flag',
        volatility_stop_trend: 'safety'
      }
      const supported = new Set([
        'appstore', 'line-chart', 'rise', 'stock', 'table', 'dollar',
        'branches', 'area-chart', 'bar-chart', 'dot-chart', 'fund',
        'sync', 'swap', 'flag', 'safety'
      ])
      const keyIcon = byKey[template && template.key]
      const rawIcon = String((template && template.icon) || '').trim()
      return keyIcon || (supported.has(rawIcon) ? rawIcon : 'appstore')
    },

    getTemplateTitle (template) {
      if (!template) return ''
      if (template.titleI18nKey) {
        const named = this.$t(template.titleI18nKey)
        if (named !== template.titleI18nKey) return named
      }
      const key = `trading-assistant.template.${template.key}`
      const translated = this.$t(key)
      return translated === key ? (template.title || template.key) : translated
    },

    getTemplateDesc (template) {
      if (!template) return ''
      if (template.descriptionI18nKey) {
        const described = this.$t(template.descriptionI18nKey)
        if (described !== template.descriptionI18nKey) return described
      }
      const key = `trading-assistant.template.${template.key}Desc`
      const translated = this.$t(key)
      return translated === key ? (template.desc || '') : translated
    },

    getParamPrecision (param) {
      if (param.type === 'integer') return 0
      if (param.type === 'percent') return undefined
      const step = param.step
      if (!step || Number.isInteger(step)) return 0
      const stepText = String(step)
      const parts = stepText.split('.')
      return parts[1] ? parts[1].length : 0
    },

    handleNumericParamChange (param, value) {
      const normalized = value === '' || value === null || value === undefined
        ? param.default
        : (param.type === 'integer' ? parseInt(value, 10) : Number(value))
      this.$set(this.templateParamValues, param.name, normalized)
      this.templateDirty = true
      if (this.hiddenSource) this.emitTemplateParams()
    },

    handleSelectParamChange (param, value) {
      this.$set(this.templateParamValues, param.name, value)
      this.templateDirty = true
      if (this.hiddenSource) this.emitTemplateParams()
    },

    handleBooleanParamChange (param, value) {
      this.$set(this.templateParamValues, param.name, !!value)
      this.templateDirty = true
      if (this.hiddenSource) this.emitTemplateParams()
    },

    handleTextParamChange (param, value) {
      this.$set(this.templateParamValues, param.name, value)
      this.templateDirty = true
      if (this.hiddenSource) this.emitTemplateParams()
    },

    async handleVerify () {
      if (this.readonly || this.hiddenSource) return
      this.verifying = true
      try {
        const code = this.getCode()
        const res = await request({
          url: '/api/strategies/verify',
          method: 'post',
          data: { code }
        })
        if (res && res.code === 1 && res.data && res.data.valid) {
          this.lastVerificationState = 'passed'
          message.success(this.$t('trading-assistant.editor.verifySuccess'))
          this.$emit('verified', res.data)
        } else {
          this.lastVerificationState = 'failed'
          message.error((res && res.data && res.data.error) || (res && res.msg) || this.$t('trading-assistant.editor.verifyFailed'))
        }
      } catch (e) {
        this.lastVerificationState = 'failed'
        message.error(this.$t('trading-assistant.editor.verifyFailed') + ': ' + (e.message || ''))
      } finally {
        this.verifying = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.strategy-editor {
  width: 100%;
  min-width: 0;
  overflow: visible;
}

.editor-layout {
  min-height: 450px;
  display: flex;
  align-items: stretch;
  gap: 16px;
  min-width: 0;
}

.editor-layout--split {
  grid-template-columns: minmax(280px, 18%) minmax(520px, 1fr) minmax(340px, 29%);
  grid-template-rows: minmax(0, 1fr);
  display: grid;
  gap: 10px;
  height: 100%;
}

.editor-layout--split.editor-layout--split-no-params {
  grid-template-columns: minmax(520px, 1fr) minmax(340px, 29%);
}

.editor-layout--split-no-params .code-col {
  grid-column-start: 1;
  grid-column-end: 2;
}

.editor-layout--split-no-params .strategy-ai-workspace-host--primary {
  grid-column-start: 2;
  grid-column-end: 3;
}

.editor-top-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
  margin-bottom: 8px;
}

.code-col {
  display: flex;
  flex-direction: column;
  flex: 1 1 62%;
  min-height: 0;
  min-width: 0;
}

.strategy-ai-workspace-host {
  flex: 0 0 auto;
  min-height: 0;
  margin-top: 10px;
}

.strategy-ai-workspace-host--primary {
  grid-column-start: 3;
  grid-column-end: 4;
  grid-row-start: 1;
  grid-row-end: 2;
  height: 100%;
  margin-top: 0;
  min-width: 0;
}

.editor-layout--split .code-col {
  grid-column-start: 2;
  grid-column-end: 3;
  grid-row-start: 1;
  grid-row-end: 2;
  width: 100%;
  flex: none;
  height: 100%;
}

.side-col {
  display: flex;
  flex-direction: column;
  flex: 0 0 38%;
  min-width: 260px;
  max-width: 380px;
}

.editor-layout--split .side-col {
  grid-column-start: 1;
  grid-column-end: 2;
  grid-row-start: 1;
  grid-row-end: 2;
  width: 100%;
  flex: none;
  height: 100%;
  min-width: 0;
  max-width: none;
}

@media (max-width: 768px) {
  .editor-layout {
    flex-direction: column;
  }

  .editor-layout--split {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(280px, auto) minmax(420px, auto) minmax(320px, auto);
    display: grid;
    height: auto;
  }

  .editor-layout--split.editor-layout--split-no-params {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(420px, auto) minmax(320px, auto);
  }

  .strategy-ai-workspace-host--primary,
  .editor-layout--split .code-col,
  .editor-layout--split .side-col {
    grid-column-start: 1;
    grid-column-end: 2;
    grid-row-start: auto;
    grid-row-end: auto;
    height: auto;
  }

  .code-col,
  .side-col {
    flex: 1 1 auto;
    max-width: none;
    min-width: 0;
  }
}

.code-section {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
}

.section-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.section-title {
  font-weight: 600;
  font-size: 14px;

  .anticon {
    margin-right: 6px;
  }
}

.current-template-tag {
  margin-right: 0;
}

.verify-btn {
  color: #52c41a;
  font-weight: 600;
}

.developer-guide-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  padding: 0 4px;
  color: #52c41a;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;

  &:hover,
  &:focus {
    color: #389e0d;
  }
}

.verification-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 11px;
  line-height: 20px;
}

.verification-status--passed {
  border-color: #b7eb8f;
  color: #389e0d;
  background: #f6ffed;
}

.verification-status--failed {
  border-color: #ffccc7;
  color: #cf1322;
  background: #fff2f0;
}

.code-editor-container {
  flex: 1;
  min-height: 420px;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  ::v-deep .CodeMirror {
    flex: 1;
    height: 100%;
    font-family: 'Courier New', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 13px;
    line-height: 1.6;
    background: #ffffff;
  }

  ::v-deep .CodeMirror-scroll {
    min-height: 100%;
    overflow-x: auto !important;
    overflow-y: auto !important;
  }

  ::v-deep .CodeMirror-gutters {
    flex-shrink: 0;
    border-right: 1px solid #e8e8e8;
    background: linear-gradient(to right, #fafafa 0%, #f5f5f5 100%);
  }

  ::v-deep .CodeMirror-linenumber {
    min-width: 2ch;
    padding: 0 8px 0 4px;
    text-align: right;
    color: #999;
    font-size: 12px;
  }

  ::v-deep .CodeMirror-lines {
    padding-top: 12px;
    padding-bottom: 12px;
  }

  ::v-deep .CodeMirror pre.CodeMirror-line,
  ::v-deep .CodeMirror pre.CodeMirror-line-like {
    padding: 0 12px;
  }

  ::v-deep .CodeMirror-cursor {
    border-left: 2px solid var(--primary-color, #1890ff);
  }

  ::v-deep .CodeMirror-linebackground.ai-code-edit-line {
    background: rgba(24, 144, 255, 0.14);
    background: color-mix(in srgb, var(--primary-color, #1890ff) 18%, transparent);
    animation: strategy-ai-code-edit-highlight 8s ease-out forwards;
  }

  ::v-deep .ai-code-edit-wrap {
    box-shadow: inset 3px 0 0 var(--primary-color, #1890ff);
  }
}

@keyframes strategy-ai-code-edit-highlight {
  0%, 72% { opacity: 1; }
  100% { opacity: 0; }
}

.code-hidden-mask {
  flex: 1;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: clamp(120px, 22vh, 210px) 32px 48px;
  text-align: center;
  color: #8c8c8c;
  background:
    radial-gradient(circle at 50% 28%, rgba(82, 196, 26, 0.14), transparent 120px),
    #111;
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  .anticon {
    width: 48px;
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--primary-color, #52c41a);
    background: rgba(82, 196, 26, 0.14);
    border: 1px solid rgba(82, 196, 26, 0.28);
    font-size: 22px;
  }

  strong {
    color: #f0f0f0;
    font-size: 16px;
  }

  span {
    max-width: 360px;
    font-size: 13px;
    line-height: 1.7;
  }
}

.side-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;

  ::v-deep .ant-tabs-bar {
    margin-bottom: 0;
    flex-shrink: 0;
    padding: 0 12px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;
  }

  ::v-deep .ant-tabs-content {
    flex: 1 1 auto;
    min-height: 280px;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 12px;
  }
}

.side-tabs--split {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;

  ::v-deep .ant-tabs-content {
    min-height: 0;
    padding: 0;
  }

  ::v-deep .ant-tabs-tabpane-active {
    height: 100%;
  }

  .split-param-pane {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: #fff;
  }

  .params-panel {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .params-toolbar {
    flex: 0 0 auto;
    display: flex;
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
  }

  .params-toolbar__summary {
    min-width: 0;
  }

  .params-toolbar .panel-intro__title {
    font-size: 13px;
  }

  .params-toolbar .panel-intro__desc {
    margin-top: 4px;
    font-size: 11px;
    line-height: 1.55;
  }

  .param-list {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-content: start;
    overflow-y: auto;
    gap: 8px;
    padding: 10px;
  }

  .param-item {
    min-width: 0;
    padding: 10px;
  }

  .params-empty-guide {
    flex: 1 1 auto;
    min-height: 0;
    padding: 24px 12px;
    align-items: center;
  }

  .params-actions {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    margin: 0;
    padding: 0;
    border-top: 0;
    border-left: 0;
    background: transparent;
    box-shadow: none;
  }

  .params-actions .ant-btn {
    width: 100%;
    padding-right: 8px;
    padding-left: 8px;
  }
}

.params-count-tag {
  margin: 0;
  font-size: 10px;
  font-weight: 400;
}

.runtime-setup {
  flex: 0 0 auto;
  margin: 10px;
  padding: 13px;
  border: 1px solid #e7e9ed;
  border-radius: 10px;
  background: #fafbfc;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.runtime-setup__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;

  .runtime-setup__copy {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 3px;
  }

  strong {
    color: #202633;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.35;
  }

  .runtime-setup__copy > span {
    color: #7b8494;
    font-size: 11px;
    line-height: 1.5;
  }
}

.runtime-market-badge {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  padding: 3px 8px;
  border: 1px solid rgba(250, 173, 20, 0.22);
  border-radius: 999px;
  color: var(--primary-color, #faad14);
  background: rgba(250, 173, 20, 0.08);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

.runtime-setup__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px 10px;
}

.runtime-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;

  > span {
    color: #4b5565;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.3;
  }

  .runtime-field__label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    small {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--primary-color, #faad14);
      font-size: 10px;
      font-weight: 500;
      white-space: nowrap;
    }
  }

  ::v-deep .ant-select {
    width: 100%;
  }

  ::v-deep .ant-select-selection,
  ::v-deep .ant-select-selection--single {
    height: 34px;
    border-color: #dfe3e8;
    border-radius: 6px;
    background: #fff;
  }

  ::v-deep .ant-select-selection__rendered {
    margin-right: 28px;
    margin-left: 10px;
    line-height: 32px;
  }

  ::v-deep .ant-radio-group {
    display: flex;
    width: 100%;
  }

  ::v-deep .ant-radio-button-wrapper {
    flex: 1;
    height: 34px;
    padding: 0 6px;
    text-align: center;
    line-height: 32px;
    white-space: nowrap;
  }
}

.runtime-product-switch {
  padding: 2px;
  border: 1px solid #dfe3e8;
  border-radius: 7px;
  background: #f0f2f5;

  ::v-deep .ant-radio-button-wrapper {
    height: 28px;
    border: 0;
    border-radius: 5px;
    color: #667085;
    background: transparent;
    box-shadow: none;
    line-height: 28px;

    &::before {
      display: none;
    }

    &:not(:first-child) {
      border-left: 0;
    }

    &.ant-radio-button-wrapper-checked {
      color: #fff;
      background: var(--primary-color, #faad14);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
    }
  }
}

.runtime-field--wide {
  grid-column-start: 1;
  grid-column-end: -1;
}

.runtime-symbol-option {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;

  .anticon {
    flex: 0 0 auto;
    color: var(--primary-color, #faad14);
    font-size: 11px;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.runtime-setup__hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 11px;
  padding: 8px 9px;
  border: 1px solid #e8eaee;
  border-radius: 6px;
  color: #7b8494;
  background: #f4f6f8;
  font-size: 11px;
  line-height: 1.5;

  .anticon {
    margin-top: 2px;
    color: var(--primary-color, #faad14);
  }
}

.theme-dark {
  .runtime-setup {
    border-color: rgba(255, 255, 255, 0.09);
    background: #1b1b1b;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.24);
  }

  .runtime-setup__head strong,
  .runtime-field > span {
    color: #e8e8e8;
  }

  .runtime-setup__head .runtime-setup__copy > span,
  .runtime-setup__hint {
    color: rgba(255, 255, 255, 0.48);
  }

  .runtime-market-badge {
    border-color: rgba(250, 173, 20, 0.22);
    background: rgba(250, 173, 20, 0.08);
  }

  .runtime-field {
    ::v-deep .ant-select-selection,
    ::v-deep .ant-select-selection--single {
      border-color: rgba(255, 255, 255, 0.11) !important;
      background: #141414 !important;
    }
  }

  .runtime-product-switch {
    border-color: rgba(255, 255, 255, 0.1);
    background: #121212;

    ::v-deep .ant-radio-button-wrapper {
      color: rgba(255, 255, 255, 0.58);
      background: transparent;

      &.ant-radio-button-wrapper-checked {
        color: #fff;
        background: var(--primary-color, #faad14);
      }
    }
  }

  .runtime-setup__hint {
    border-color: rgba(255, 255, 255, 0.08);
    background: #151515;
  }
}

.params-live-tag {
  margin-left: auto;
  line-height: 28px;
}

.params-panel {
  min-height: 120px;
}

.template-card.disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.panel-intro {
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;

  &--compact {
    margin-bottom: 10px;
    padding: 10px 12px;
  }
}

.panel-intro__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.panel-intro__desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: #8c8c8c;
}

.blank-card {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 14px;
  border-radius: 8px;
  border: 1px dashed #d9d9d9;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;

  &:hover,
  &.active {
    border-color: var(--primary-color, #1890ff);
    background: rgba(24, 144, 255, 0.03);
  }

  &.active {
    border-style: solid;
    box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.12);
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 13px;
    font-weight: 600;
    color: #262626;
  }

  &__desc {
    margin-top: 2px;
    font-size: 11px;
    line-height: 1.5;
    color: #8c8c8c;
  }

  &__check {
    flex-shrink: 0;
    color: var(--primary-color, #1890ff);
    font-size: 16px;
  }
}

.template-section-label {
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: #bfbfbf;
}

.template-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 4px;
}

.template-grid--modal {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-height: 520px;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 4px;
}

.template-picker-layout {
  display: block;
}

.template-empty {
  margin: 12px 0 4px;
  padding: 18px 0;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
}

.template-card {
  position: relative;
  padding: 11px 12px 10px 12px;
  border-radius: 8px;
  border: 1px solid #262626;
  background: #fff;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #d9d9d9;
    opacity: 1;
  }

  &:hover,
  &.active {
    border-color: rgba(82, 196, 26, 0.5);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  }

  &.active {
    background: rgba(82, 196, 26, 0.035);
    box-shadow: 0 0 0 1px rgba(82, 196, 26, 0.12);

    &::before {
      background: #52c41a;
    }
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }

  &__icon {
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: #52c41a;
    background: rgba(82, 196, 26, 0.1);
    font-size: 15px;
  }

  &__badge {
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    color: #595959;
    background: #f5f5f5;
  }

  &__name {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: #262626;
    line-height: 1.4;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__desc {
    margin-top: 4px;
    font-size: 11px;
    line-height: 1.55;
    color: #8c8c8c;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;

    span {
      padding: 2px 6px;
      border-radius: 999px;
      color: #6b7280;
      background: #f3f4f6;
      font-size: 9px;
      font-weight: 600;
    }
  }

  &__foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 6px;
  }

  &__action {
    font-size: 11px;
    font-weight: 600;
    color: var(--primary-color, #1890ff);

    .anticon {
      font-size: 10px;
      margin-left: 2px;
    }
  }
}

.template-grid--modal .template-card {
  min-height: 136px;
  display: flex;
  flex-direction: column;
}

.template-grid--modal .template-card__foot {
  margin-top: auto;
  padding-top: 7px;
}

@media (max-width: 900px) {
  .template-grid--modal {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .template-grid--modal {
    grid-template-columns: 1fr;
  }
}

.template-card--blue .template-card__icon {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.12);
}

.template-card--cyan .template-card__icon {
  color: #0891b2;
  background: rgba(8, 145, 178, 0.12);
}

.template-card--teal .template-card__icon {
  color: #0d9488;
  background: rgba(13, 148, 136, 0.12);
}

.template-card--indigo .template-card__icon {
  color: #4f46e5;
  background: rgba(79, 70, 229, 0.13);
}

.template-card--gold .template-card__icon {
  color: #d97706;
  background: rgba(217, 119, 6, 0.13);
}

.template-card--purple .template-card__icon {
  color: #9333ea;
  background: rgba(147, 51, 234, 0.13);
}

.param-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-item {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fff;
}

.param-item--strategy-name {
  border-color: #d6e4ff;
  background: #f8fbff;
}

.param-item__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.param-item__label {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
}

.param-item__type {
  font-size: 11px;
  color: #8c8c8c;
}

.param-item__desc {
  margin-bottom: 8px;
  display: -webkit-box;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  color: #8c8c8c;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.param-item__switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.params-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.params-empty-guide {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.script-template-picker {
  .ant-modal-body {
    padding: 16px;
  }
}

.theme-dark {
  .code-section {
    border-color: #303030;
    background: #171717;
  }

  .section-header {
    background: #202020;
    border-color: #303030;
  }

  .section-title {
    color: #e0e6ed;
  }

  .current-template-tag {
    border-color: rgba(255, 255, 255, 0.12) !important;
    background: rgba(255, 255, 255, 0.06) !important;
    color: rgba(255, 255, 255, 0.72) !important;
  }

  .side-tabs {
    border-color: #303030;
    background: #191919;

    ::v-deep .ant-tabs-bar {
      background: #202020;
      border-bottom-color: #303030;
    }

    ::v-deep .ant-tabs-nav .ant-tabs-tab {
      color: rgba(255, 255, 255, 0.55);

      &:hover {
        color: rgba(255, 255, 255, 0.85);
      }

      &.ant-tabs-tab-active .ant-tabs-tab-btn {
        color: var(--primary-color, #1890ff);
      }
    }
  }

  .side-tabs--split {
    border-color: #303030;
    background: #191919;

    .split-param-pane {
      background: #191919;
      border-color: #303030;
    }

    .params-toolbar {
      border-bottom-color: #303030;
      background: #202020;
    }

    .params-actions {
      background: transparent;
    }
  }

  .verification-status--passed {
    border-color: rgba(82, 196, 26, 0.35);
    color: #95de64;
    background: rgba(82, 196, 26, 0.12);
  }

  .verification-status--failed {
    border-color: rgba(255, 77, 79, 0.34);
    color: #ff7875;
    background: rgba(255, 77, 79, 0.12);
  }

  .panel-intro {
    background: #1c1c1c;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .panel-intro__title,
  .param-item__label {
    color: #e0e6ed;
  }

  .panel-intro__desc,
  .param-item__desc,
  .param-item__type {
    color: rgba(255, 255, 255, 0.45);
  }

  .template-item,
  .param-item,
  .blank-card,
  .template-card {
    border-color: #303030;
    background: #202020;
  }

  .param-item--strategy-name {
    border-color: rgba(64, 169, 255, 0.25);
    background: rgba(24, 144, 255, 0.08);
  }

  .blank-card {
    border-color: rgba(255, 255, 255, 0.12);

    &:hover,
    &.active {
      border-color: var(--primary-color-active, #177ddc);
      background: rgba(23, 125, 220, 0.06);
    }

    &__title {
      color: #e0e6ed;
    }

    &__desc {
      color: rgba(255, 255, 255, 0.4);
    }

    &__meta span {
      color: rgba(255, 255, 255, 0.52);
      background: rgba(255, 255, 255, 0.07);
    }

    &__check {
      color: var(--primary-color-hover, #40a9ff);
    }
  }

  .template-section-label {
    color: rgba(255, 255, 255, 0.28);
  }

  .template-empty {
    border-color: rgba(255, 255, 255, 0.12);
  }

  .template-card {
    &:hover,
    &.active {
      border-color: rgba(23, 125, 220, 0.45);
      background: rgba(23, 125, 220, 0.06);
    }

    &__badge {
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.55);
    }

    &__icon {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.72);
    }

    &__name {
      color: #e0e6ed;
    }

    &__desc {
      color: rgba(255, 255, 255, 0.4);
    }

    &__action {
      color: var(--primary-color-hover, #40a9ff);
    }
  }

  .template-item:hover,
  .template-item.active {
    border-color: var(--primary-color-active, #177ddc);
    background: rgba(23, 125, 220, 0.06);
  }

  .tpl-name {
    color: #e0e6ed;
  }

  .tpl-desc {
    color: rgba(255, 255, 255, 0.4);
  }

  ::v-deep textarea.ant-input,
  ::v-deep .ant-input,
  ::v-deep .ant-input-number,
  ::v-deep .ant-input-number-input,
  ::v-deep .ant-select-selection,
  ::v-deep .ant-select-selection--single {
    background: #141414 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    color: #d1d4dc !important;
  }

  ::v-deep .ant-select-selection-selected-value,
  ::v-deep .ant-select-selection-placeholder {
    color: #d1d4dc !important;
  }

  ::v-deep .ant-empty-description {
    color: rgba(255, 255, 255, 0.45);
  }

  ::v-deep .ant-alert-info {
    background: rgba(24, 144, 255, 0.08);
    border-color: rgba(24, 144, 255, 0.2);

    .ant-alert-message {
      color: rgba(255, 255, 255, 0.65);
    }
  }

  .verify-btn {
    color: #52c41a;
  }

  .developer-guide-link {
    color: #73d13d;

    &:hover,
    &:focus {
      color: #95de64;
    }
  }

  .code-editor-container {
    ::v-deep .CodeMirror {
      background: #151515;
      color: #d1d4dc;
    }

    ::v-deep .CodeMirror-gutters {
      border-right-color: #2b2b2b;
      background: #1d1d1d;
    }

    ::v-deep .CodeMirror-linenumber {
      color: rgba(255, 255, 255, 0.32);
    }
  }
}
</style>
