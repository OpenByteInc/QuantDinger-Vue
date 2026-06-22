<template>
  <div class="strategy-editor" :class="{ 'theme-dark': isDark }">
    <div class="editor-layout">
      <div class="code-col">
        <div class="code-section">
          <div class="section-header">
            <div class="section-title-wrap">
              <span class="section-title">
                <a-icon type="code" /> {{ $t('trading-assistant.editor.title') }}
              </span>
              <a-tag v-if="selectedTemplate" color="blue" class="current-template-tag">
                {{ $t(`trading-assistant.template.${selectedTemplate.key}`) }}
              </a-tag>
              <a-tag v-else-if="isBlankScript" color="default" class="current-template-tag">
                {{ $t('trading-assistant.editor.blankTemplate') }}
              </a-tag>
            </div>
            <div class="section-actions">
              <a-button
                type="link"
                size="small"
                @click="handleVerify"
                :loading="verifying"
                class="verify-btn"
              >
                <a-icon type="check-circle" />
                {{ $t('trading-assistant.editor.verify') }}
              </a-button>
            </div>
          </div>
          <div ref="editorContainer" class="code-editor-container"></div>
        </div>
      </div>

      <div class="side-col">
        <a-tabs v-model="activeTab" size="small" class="side-tabs" :animated="false">
          <a-tab-pane key="templates" :tab="$t('trading-assistant.editor.templateTab')" :force-render="true">
            <div class="panel-intro panel-intro--compact">
              <div class="panel-intro__title">{{ $t('trading-assistant.editor.templateIntroTitle') }}</div>
              <div class="panel-intro__desc">{{ $t('trading-assistant.editor.templateIntroDesc') }}</div>
            </div>

            <div class="indicator-redirect" role="button" tabindex="0" @click="goIndicatorIde" @keyup.enter="goIndicatorIde">
              <div class="indicator-redirect__icon">
                <a-icon type="line-chart" />
              </div>
              <div class="indicator-redirect__body">
                <div class="indicator-redirect__title">{{ $t('trading-assistant.editor.indicatorRedirectTitle') }}</div>
                <div class="indicator-redirect__desc">{{ $t('trading-assistant.editor.indicatorRedirectDesc') }}</div>
              </div>
              <a-icon type="right" class="indicator-redirect__arrow" />
            </div>

            <div
              class="blank-card"
              :class="{ active: isBlankScript }"
              @click="loadBlankTemplate"
            >
              <div class="blank-card__icon">
                <a-icon type="file-text" />
              </div>
              <div class="blank-card__body">
                <div class="blank-card__title">{{ $t('trading-assistant.editor.blankTemplate') }}</div>
                <div class="blank-card__desc">{{ $t('trading-assistant.editor.blankTemplateDesc') }}</div>
              </div>
              <a-icon v-if="isBlankScript" type="check-circle" theme="filled" class="blank-card__check" />
            </div>

            <div class="template-section-label">
              {{ $t('trading-assistant.editor.statefulTemplateSection') }}
            </div>

            <div class="template-grid">
              <div
                v-for="tpl in templates"
                :key="tpl.key"
                class="template-card"
                :class="[`template-card--${tpl.accent || 'blue'}`, { active: selectedTemplateKey === tpl.key }]"
                @click="loadTemplate(tpl.key, { focusParams: true, resetParams: true })"
              >
                <div class="template-card__head">
                  <span class="template-card__icon">{{ tpl.icon }}</span>
                  <span class="template-card__badge">{{ $t('trading-assistant.editor.statefulTemplateBadge') }}</span>
                </div>
                <div class="template-card__name">{{ $t(`trading-assistant.template.${tpl.key}`) }}</div>
                <div class="template-card__desc">{{ $t(`trading-assistant.template.${tpl.key}Desc`) }}</div>
                <div class="template-card__foot">
                  <span class="template-card__meta">
                    {{ tpl.params.length }} {{ $t('trading-assistant.editor.paramCountLabel') }}
                  </span>
                  <span class="template-card__action">
                    {{ $t('trading-assistant.template.useTemplate') }}
                    <a-icon type="arrow-right" />
                  </span>
                </div>
              </div>
            </div>
          </a-tab-pane>

          <a-tab-pane key="params" :tab="$t('trading-assistant.editor.paramsTab')" :force-render="true">
            <div v-if="activeParamTemplate" class="params-panel">
              <div class="panel-intro">
                <div class="panel-intro__title">
                  {{ activeParamTemplateTitle }}
                </div>
                <div class="panel-intro__desc">
                  {{ activeParamTemplateDesc }}
                </div>
              </div>
              <a-alert
                type="info"
                show-icon
                class="params-tip"
                :message="$t('trading-assistant.editor.paramsHint')"
              />
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
                      {{ getOptionLabel(option) }}
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
                <a-button type="primary" @click="applySelectedTemplateToCode" :disabled="!templateDirty">
                  {{ $t('trading-assistant.editor.applyTemplateParams') }}
                </a-button>
              </div>
            </div>
            <div v-else class="params-empty-guide">
              <a-empty :description="$t('trading-assistant.editor.paramsEmpty')">
                <a-button type="primary" size="small" ghost @click="activeTab = 'templates'">
                  <a-icon type="appstore" />
                  {{ $t('trading-assistant.editor.templateTab') }}
                </a-button>
              </a-empty>
            </div>
          </a-tab-pane>

          <a-tab-pane key="ai" :tab="$t('trading-assistant.editor.aiTab')" :force-render="true">
            <div class="ai-panel">
              <div class="panel-intro">
                <div class="panel-intro__title">
                  <a-icon type="robot" />
                  <span>{{ $t('trading-assistant.editor.aiGenerate') }}</span>
                </div>
                <div class="panel-intro__desc">{{ $t('trading-assistant.editor.aiHint') }}</div>
              </div>
              <div class="ai-suggestions">
                <a-tag
                  v-for="item in aiPromptSuggestions"
                  :key="item.id"
                  class="prompt-tag"
                  @click="applyPromptSuggestion(item.value)">
                  {{ item.label }}
                </a-tag>
              </div>
              <a-textarea
                v-model="aiPrompt"
                :placeholder="$t('trading-assistant.editor.aiPromptPlaceholder')"
                :rows="10"
                :auto-size="{ minRows: 8, maxRows: 16 }"
              />
              <div class="ai-actions">
                <a-button
                  type="primary"
                  block
                  @click="handleAIAdjustParams"
                  :loading="aiAdjustingParams"
                  :disabled="aiGenerating"
                  size="large"
                >
                  <a-icon type="setting" />
                  {{ $t('trading-assistant.editor.aiAdjustParamsBtn') }}
                </a-button>
                <a-button
                  block
                  @click="handleAIGenerate"
                  :loading="aiGenerating"
                  :disabled="aiAdjustingParams"
                  size="large"
                  style="margin-top: 8px;"
                >
                  <a-icon type="code" />
                  {{ $t('trading-assistant.editor.aiGenerateFullCodeBtn') }}
                </a-button>
              </div>
              <div v-if="aiGenerating || aiAdjustingParams" class="ai-status">
                <a-icon type="loading" spin />
                {{ aiAdjustingParams ? $t('trading-assistant.editor.aiAdjustingParams') : $t('trading-assistant.editor.generating') }}
              </div>
              <div
                v-if="aiDebugSummary"
                class="ai-debug-card"
                :class="`ai-debug-card--${aiDebugState()}`"
              >
                <div class="ai-debug-card__header">
                  <div class="ai-debug-card__badge">
                    <a-icon :type="aiDebugStateIcon()" />
                  </div>
                  <div class="ai-debug-card__headline">
                    <span class="ai-debug-card__tag">AI 质检</span>
                    <span class="ai-debug-card__title">{{ aiDebugSummary.title }}</span>
                  </div>
                  <a-icon type="close" class="ai-debug-card__dismiss" @click="aiDebugSummary = null" />
                </div>
                <div class="ai-debug-card__chips">
                  <span :class="['ai-debug-chip', `ai-debug-chip--${aiDebugState()}`]">{{ aiDebugStateLabel() }}</span>
                  <span v-if="aiDebugSummary.fixed_messages.length" class="ai-debug-chip ai-debug-chip--success">
                    <a-icon type="check" style="font-size: 10px;" /> {{ aiDebugSummary.fixed_messages.length }} 已修复
                  </span>
                  <span v-if="aiDebugSummary.remaining_messages.length" class="ai-debug-chip ai-debug-chip--warning">
                    <a-icon type="eye" style="font-size: 10px;" /> {{ aiDebugSummary.remaining_messages.length }} 待关注
                  </span>
                </div>
                <div v-if="aiDebugSummary.returned_text" class="ai-debug-card__body">
                  {{ aiDebugSummary.returned_text }}
                </div>
                <div v-if="aiDebugSummary.fixed_messages.length" class="ai-debug-card__group ai-debug-card__group--fixed">
                  <div class="ai-debug-card__group-label"><a-icon type="check-circle" /> 已自动修复</div>
                  <div v-for="(msg, idx) in aiDebugSummary.fixed_messages" :key="`fixed-${idx}`" class="ai-debug-card__item">
                    <span class="ai-debug-card__bullet ai-debug-card__bullet--green"></span>{{ msg }}
                  </div>
                </div>
                <div v-if="aiDebugSummary.remaining_messages.length" class="ai-debug-card__group ai-debug-card__group--remaining">
                  <div class="ai-debug-card__group-label"><a-icon type="warning" /> 仍需关注</div>
                  <div v-for="(msg, idx) in aiDebugSummary.remaining_messages" :key="`remaining-${idx}`" class="ai-debug-card__item">
                    <span class="ai-debug-card__bullet ai-debug-card__bullet--orange"></span>{{ msg }}
                  </div>
                </div>
              </div>
            </div>
          </a-tab-pane>

        </a-tabs>
      </div>
    </div>
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
  SCRIPT_TEMPLATE_CATALOG,
  getScriptTemplateByKey,
  buildTemplateCode,
  buildTemplateParamValues,
  normalizePercentParamValue,
  extractScriptParamsFromCode,
  buildScriptCodeWithParamValues
} from './scriptTemplateCatalog'

export default {
  name: 'StrategyEditor',
  props: {
    value: { type: String, default: '' },
    isDark: { type: Boolean, default: false },
    userId: { type: [Number, String], default: 1 },
    strategyId: { type: [Number, String], default: null },
    visible: { type: Boolean, default: false },
    initialTemplateKey: { type: String, default: '' }
  },
  data () {
    return {
      activeTab: 'templates',
      aiPrompt: '',
      aiGenerating: false,
      aiAdjustingParams: false,
      aiDebugSummary: null,
      verifying: false,
      editor: null,
      templates: SCRIPT_TEMPLATE_CATALOG,
      selectedTemplateKey: '',
      inferredParamTemplate: null,
      templateParamValues: {},
      templateDirty: false,
      refreshTimer: null,
      refreshTimers: []
    }
  },
  computed: {
    selectedTemplate () {
      return getScriptTemplateByKey(this.selectedTemplateKey)
    },
    activeParamTemplate () {
      return this.selectedTemplate || this.inferredParamTemplate
    },
    activeParamTemplateTitle () {
      if (this.selectedTemplate) return this.$t(`trading-assistant.template.${this.selectedTemplate.key}`)
      return this.$t('trading-assistant.editor.codeParamsTitle')
    },
    activeParamTemplateDesc () {
      if (this.selectedTemplate) return this.$t(`trading-assistant.template.${this.selectedTemplate.key}Desc`)
      return this.$t('trading-assistant.editor.codeParamsDesc')
    },
    isBlankScript () {
      return !this.selectedTemplateKey
    },
    aiPromptSuggestions () {
      return [
        {
          id: 'improve',
          label: this.$t('trading-assistant.editor.aiSuggestionImprove'),
          value: this.$t('trading-assistant.editor.aiSuggestionImprovePrompt')
        },
        {
          id: 'risk',
          label: this.$t('trading-assistant.editor.aiSuggestionRisk'),
          value: this.$t('trading-assistant.editor.aiSuggestionRiskPrompt')
        },
        {
          id: 'explain',
          label: this.$t('trading-assistant.editor.aiSuggestionExplain'),
          value: this.$t('trading-assistant.editor.aiSuggestionExplainPrompt')
        }
      ]
    }
  },
  mounted () {
    this.$nextTick(() => {
      this.initEditor()
      if (this.initialTemplateKey) {
        this.applyInitialTemplateKey(this.initialTemplateKey)
      } else if (!this.value) {
        this.$emit('input', this._getDefaultCode())
      }
      this.applyCopilotDraft()
    })
    window.addEventListener('resize', this.scheduleEditorRefresh)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.scheduleEditorRefresh)
    this.clearRefreshTimers()
    if (this.editor) {
      if (typeof this.editor.toTextArea === 'function') {
        this.editor.toTextArea()
      }
      this.editor = null
    }
  },
  watch: {
    value (newVal) {
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
      if (key && key !== this.selectedTemplateKey) {
        this.applyInitialTemplateKey(key)
      } else if (!key) {
        this.selectedTemplateKey = ''
        this.refreshInferredParamsFromCode(this.getCode())
      }
    }
  },
  methods: {
    applyCopilotDraft () {
      let code = ''
      try {
        code = sessionStorage.getItem('qd_copilot_script_strategy_code') || ''
        if (code) sessionStorage.removeItem('qd_copilot_script_strategy_code')
      } catch (_) {}
      if (code) {
        this.activeTab = 'ai'
        this.setCode(code)
        this.templateDirty = true
      }
    },
    initEditor () {
      if (!this.$refs.editorContainer) return
      this.editor = CodeMirror(this.$refs.editorContainer, {
        value: this.value || this._getDefaultCode(),
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

    _getDefaultCode () {
      return `"""
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
    },

    applyInitialTemplateKey (key) {
      const template = getScriptTemplateByKey(key)
      if (template) {
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

    loadBlankTemplate ({ silent = false } = {}) {
      this.selectedTemplateKey = ''
      this.inferredParamTemplate = null
      this.templateParamValues = {}
      this.templateDirty = false
      this.setCode(this._getDefaultCode())
      this.$emit('template-change', { key: '', params: {} })
      this.activeTab = 'templates'
      if (!silent) {
        this.scheduleEditorRefresh()
      }
    },

    goIndicatorIde () {
      this.$router.push('/indicator-ide')
    },

    loadTemplate (key, { focusParams = false, resetParams = true } = {}) {
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
      if (!this.aiPrompt.trim()) {
        this.aiPrompt = this.$t('trading-assistant.editor.aiPromptTemplateHint') + ' ' + this.$t(`trading-assistant.template.${template.key}`)
      }
      this.scheduleEditorRefresh()
    },

    getCode () {
      return this.editor ? this.editor.getValue() : this.value
    },

    setCode (code) {
      if (this.editor) {
        if (this.editor.getValue() !== code) {
          this.editor.setValue(code)
        } else {
          this.$emit('input', code)
        }
      } else {
        this.$emit('input', code)
      }
      this.scheduleEditorRefresh()
    },

    applySelectedTemplateToCode ({ silent = false } = {}) {
      const template = this.activeParamTemplate
      if (!template) return
      const code = this.selectedTemplate
        ? buildTemplateCode(this.selectedTemplate, this.templateParamValues)
        : buildScriptCodeWithParamValues(this.getCode(), template.params, this.templateParamValues)
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
      this.applySelectedTemplateToCode({ silent: false })
    },

    refreshInferredParamsFromCode (code, { preserveValues = true } = {}) {
      if (this.selectedTemplateKey) return
      const inferred = extractScriptParamsFromCode(code)
      if (!inferred) {
        this.inferredParamTemplate = null
        this.templateParamValues = {}
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
      this.activeTab = 'params'
    },

    getParamLabel (param) {
      const key = `trading-assistant.templateParam.${param.name}.label`
      const value = this.$t(key)
      return value === key ? param.name : value
    },

    getParamDescription (param) {
      const key = `trading-assistant.templateParam.${param.name}.desc`
      const value = this.$t(key)
      return value === key ? '' : value
    },

    getParamTypeLabel (type) {
      return this.$t(`trading-assistant.editor.paramType.${type}`)
    },

    formatPercentInput (value) {
      if (value === '' || value === null || value === undefined) return ''
      return `${value}%`
    },

    parsePercentInput (value) {
      if (value === '' || value === null || value === undefined) return ''
      return String(value).replace(/%/g, '').trim()
    },

    getOptionLabel (option) {
      if (!option) return ''
      if (option.labelKey) {
        const translated = this.$t(option.labelKey)
        if (translated !== option.labelKey) return translated
      }
      return option.label || option.value
    },

    getParamPrecision (param) {
      if (param.type === 'integer') return 0
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
    },

    handleSelectParamChange (param, value) {
      this.$set(this.templateParamValues, param.name, value)
      this.templateDirty = true
    },

    handleBooleanParamChange (param, value) {
      this.$set(this.templateParamValues, param.name, !!value)
      this.templateDirty = true
    },

    handleTextParamChange (param, value) {
      this.$set(this.templateParamValues, param.name, value)
      this.templateDirty = true
    },

    applyPromptSuggestion (value) {
      this.aiPrompt = value
    },
    normalizeAiDebugSummary (summary) {
      if (!summary || typeof summary !== 'object') return null
      const fixedMessages = Array.isArray(summary.fixed_messages) ? summary.fixed_messages.filter(Boolean) : []
      const remainingMessages = Array.isArray(summary.remaining_messages) ? summary.remaining_messages.filter(Boolean) : []
      const normalized = {
        title: summary.title ? String(summary.title) : '',
        returned_text: summary.returned_text ? String(summary.returned_text) : '',
        fixed_messages: fixedMessages,
        remaining_messages: remainingMessages
      }
      if (!normalized.title && !normalized.returned_text && !fixedMessages.length && !remainingMessages.length) {
        return null
      }
      return normalized
    },
    aiDebugAlertType (summary = this.aiDebugSummary) {
      if (!summary) return 'info'
      if ((summary.remaining_messages || []).length) return 'warning'
      if ((summary.fixed_messages || []).length) return 'success'
      return 'info'
    },
    aiDebugState (summary = this.aiDebugSummary) {
      return this.aiDebugAlertType(summary)
    },
    aiDebugStateIcon (summary = this.aiDebugSummary) {
      const state = this.aiDebugState(summary)
      if (state === 'warning') return 'exclamation-circle'
      if (state === 'success') return 'check-circle'
      return 'info-circle'
    },
    aiDebugStateLabel (summary = this.aiDebugSummary) {
      const state = this.aiDebugState(summary)
      if (state === 'warning') return '仍有提醒'
      if (state === 'success') return '自动修复完成'
      return '质检已通过'
    },
    aiDebugStateTagColor (summary = this.aiDebugSummary) {
      const state = this.aiDebugState(summary)
      if (state === 'warning') return 'orange'
      if (state === 'success') return 'green'
      return 'blue'
    },

    async handleVerify () {
      this.verifying = true
      try {
        const code = this.getCode()
        const res = await request({
          url: '/api/strategies/verify-code',
          method: 'post',
          data: {
            code,
            user_id: this.userId,
            strategyId: this.strategyId || undefined
          }
        })
        if (res && res.success) {
          message.success(this.$t('trading-assistant.editor.verifySuccess'))
          this.$emit('verified')
        } else {
          message.error((res && (res.msg || res.message)) || this.$t('trading-assistant.editor.verifyFailed'))
        }
      } catch (e) {
        message.error(this.$t('trading-assistant.editor.verifyFailed') + ': ' + (e.message || ''))
      } finally {
        this.verifying = false
      }
    },

    _coerceParamValue (param, raw) {
      if (raw === null || raw === undefined) return undefined
      const t = param.type
      if (t === 'boolean') {
        if (typeof raw === 'boolean') return raw
        if (raw === 'true' || raw === 1 || raw === '1') return true
        if (raw === 'false' || raw === 0 || raw === '0') return false
        return undefined
      }
      if (t === 'integer') {
        const n = parseInt(String(raw), 10)
        if (!Number.isFinite(n)) return undefined
        let v = n
        if (param.min != null) v = Math.max(param.min, v)
        if (param.max != null) v = Math.min(param.max, v)
        return v
      }
      if (t === 'number' || t === 'percent') {
        const n = Number(raw)
        if (!Number.isFinite(n)) return undefined
        let v = t === 'percent' ? (normalizePercentParamValue(n) ?? n) : n
        if (param.min != null) v = Math.max(param.min, v)
        if (param.max != null) v = Math.min(param.max, v)
        return v
      }
      if (t === 'select') {
        const opts = param.options || []
        const allowed = new Set(opts.map(o => o.value))
        if (allowed.has(raw)) return raw
        const s = String(raw)
        if (allowed.has(s)) return s
        return undefined
      }
      return String(raw)
    },

    applyAIParamUpdates (updates) {
      const template = this.activeParamTemplate
      if (!template || !updates || typeof updates !== 'object') return false
      const allowed = new Set(template.params.map(p => p.name))
      let changed = false
      Object.keys(updates).forEach((k) => {
        if (!allowed.has(k)) return
        const param = template.params.find(p => p.name === k)
        const v = this._coerceParamValue(param, updates[k])
        if (v !== undefined) {
          this.$set(this.templateParamValues, k, v)
          changed = true
        }
      })
      return changed
    },

    async handleAIAdjustParams () {
      if (!this.aiPrompt.trim()) {
        message.warning(this.$t('trading-assistant.editor.aiPromptRequired'))
        return
      }
      if (!this.activeParamTemplate) {
        message.warning(this.$t('trading-assistant.editor.aiAdjustParamsNeedTemplate'))
        return
      }
      this.aiAdjustingParams = true
      try {
        const res = await request({
          url: '/api/strategies/ai-generate',
          method: 'post',
          data: {
            prompt: this.aiPrompt,
            user_id: this.userId,
            intent: 'adjust_params',
            template_key: this.selectedTemplateKey,
            params: { ...this.templateParamValues },
            code: this.getCode()
          }
        })
        if (res && res.params && typeof res.params === 'object') {
          const ok = this.applyAIParamUpdates(res.params)
          if (ok) {
            this.templateDirty = true
            this.applySelectedTemplateToCode({ silent: true })
            message.success(this.$t('trading-assistant.editor.aiAdjustParamsSuccess'))
          } else {
            message.warning(this.$t('trading-assistant.editor.aiAdjustParamsNoChanges'))
          }
        } else {
          message.error((res && (res.msg || res.message)) || this.$t('trading-assistant.editor.aiAdjustParamsFailed'))
        }
      } catch (e) {
        message.error((e && e.message) || this.$t('trading-assistant.editor.aiAdjustParamsFailed'))
      } finally {
        this.aiAdjustingParams = false
      }
    },

    async handleAIGenerate () {
      if (!this.aiPrompt.trim()) {
        message.warning(this.$t('trading-assistant.editor.aiPromptRequired'))
        return
      }
      this.aiGenerating = true
      this.aiDebugSummary = null
      try {
        const res = await request({
          url: '/api/strategies/ai-generate',
          method: 'post',
          data: {
            prompt: this.aiPrompt,
            user_id: this.userId,
            intent: 'generate_code',
            template_key: this.selectedTemplateKey || undefined,
            params: this.activeParamTemplate ? { ...this.templateParamValues } : undefined,
            code: this.getCode()
          }
        })
        this.aiDebugSummary = this.normalizeAiDebugSummary(res && res.debug && res.debug.human_summary)
        const code = res && typeof res.code === 'string' ? res.code : ''
        if (code) {
          this.setCode(code)
          message.success(this.$t('trading-assistant.editor.aiGenerateSuccess'))
        } else {
          message.error((res && (res.msg || res.message)) || this.$t('trading-assistant.editor.aiGenerateFailed'))
        }
      } catch (e) {
        message.error((e && e.message) || this.$t('trading-assistant.editor.aiGenerateFailed'))
      } finally {
        this.aiGenerating = false
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

.code-col {
  display: flex;
  flex-direction: column;
  flex: 1 1 62%;
  min-width: 0;
}

.side-col {
  display: flex;
  flex-direction: column;
  flex: 0 0 38%;
  min-width: 260px;
  max-width: 380px;
}

@media (max-width: 768px) {
  .editor-layout {
    flex-direction: column;
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
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
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
    border-left: 2px solid #1890ff;
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

.ai-actions {
  margin-top: 12px;
}

.params-panel {
  min-height: 120px;
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

.indicator-redirect {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: 10px;
  border: 1px solid rgba(24, 144, 255, 0.18);
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.06) 0%, rgba(24, 144, 255, 0.02) 100%);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(24, 144, 255, 0.35);
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.08);
  }

  &__icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: rgba(24, 144, 255, 0.12);
    color: #1890ff;
    font-size: 16px;
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 13px;
    font-weight: 600;
    color: #262626;
    line-height: 1.4;
  }

  &__desc {
    margin-top: 2px;
    font-size: 11px;
    line-height: 1.5;
    color: #8c8c8c;
  }

  &__arrow {
    flex-shrink: 0;
    color: #bfbfbf;
    font-size: 12px;
  }
}

.blank-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin-bottom: 14px;
  border-radius: 10px;
  border: 1px dashed #d9d9d9;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;

  &:hover,
  &.active {
    border-color: #1890ff;
    background: rgba(24, 144, 255, 0.03);
  }

  &.active {
    border-style: solid;
    box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.12);
  }

  &__icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: #f5f5f5;
    color: #595959;
    font-size: 16px;
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
    color: #1890ff;
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

.template-card {
  position: relative;
  padding: 12px 12px 10px 14px;
  border-radius: 10px;
  border: 1px solid #f0f0f0;
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
    width: 3px;
    background: #1890ff;
    opacity: 0.75;
  }

  &--violet::before { background: linear-gradient(180deg, #722ed1, #9254de); }
  &--teal::before { background: linear-gradient(180deg, #13c2c2, #36cfc9); }
  &--amber::before { background: linear-gradient(180deg, #fa8c16, #ffc53d); }

  &:hover,
  &.active {
    border-color: rgba(24, 144, 255, 0.35);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    transform: translateY(-1px);
  }

  &.active {
    background: rgba(24, 144, 255, 0.03);
    box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.12);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  &__icon {
    font-size: 18px;
    line-height: 1;
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
    font-size: 13px;
    font-weight: 600;
    color: #262626;
    line-height: 1.4;
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

  &__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 8px;
  }

  &__meta {
    font-size: 10px;
    color: #bfbfbf;
  }

  &__action {
    font-size: 11px;
    font-weight: 600;
    color: #1890ff;

    .anticon {
      font-size: 10px;
      margin-left: 2px;
    }
  }
}

.params-tip {
  margin-bottom: 12px;
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
  font-size: 12px;
  line-height: 1.5;
  color: #8c8c8c;
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

.ai-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.prompt-tag {
  cursor: pointer;
}

.ai-status {
  margin-top: 8px;
  color: #1890ff;
  font-size: 13px;
  text-align: center;
}

.ai-debug-card {
  margin-top: 12px;
  padding: 0;
  border: 1px solid #e6f4ff;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
  font-size: 12px;
}
.ai-debug-card--success { border-color: #b7eb8f; }
.ai-debug-card--warning { border-color: #ffd591; }

.ai-debug-card__header {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.06) 0%, transparent 100%);
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.ai-debug-card--success .ai-debug-card__header { background: linear-gradient(135deg, rgba(82, 196, 26, 0.06) 0%, transparent 100%); }
.ai-debug-card--warning .ai-debug-card__header { background: linear-gradient(135deg, rgba(250, 140, 22, 0.06) 0%, transparent 100%); }

.ai-debug-card__badge {
  width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
  border-radius: 7px; flex-shrink: 0; font-size: 13px;
  background: rgba(24, 144, 255, 0.1); color: #1890ff;
}
.ai-debug-card--success .ai-debug-card__badge { background: rgba(82, 196, 26, 0.1); color: #389e0d; }
.ai-debug-card--warning .ai-debug-card__badge { background: rgba(250, 140, 22, 0.1); color: #d46b08; }

.ai-debug-card__headline { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; }
.ai-debug-card__tag {
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
  color: #1890ff; white-space: nowrap;
}
.ai-debug-card--success .ai-debug-card__tag { color: #389e0d; }
.ai-debug-card--warning .ai-debug-card__tag { color: #d46b08; }

.ai-debug-card__title {
  font-size: 12px; font-weight: 600; color: #262626;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ai-debug-card__dismiss {
  flex-shrink: 0; cursor: pointer; font-size: 12px; color: #bfbfbf;
  padding: 2px; border-radius: 4px; transition: all 0.15s;
  &:hover { color: #595959; background: rgba(0,0,0,0.04); }
}

.ai-debug-card__chips { display: flex; flex-wrap: wrap; gap: 5px; padding: 8px 10px 0; }
.ai-debug-chip {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;
  background: rgba(24, 144, 255, 0.08); color: #1890ff;
}
.ai-debug-chip--success { background: rgba(82, 196, 26, 0.08); color: #389e0d; }
.ai-debug-chip--warning { background: rgba(250, 140, 22, 0.08); color: #d46b08; }
.ai-debug-chip--info { background: rgba(24, 144, 255, 0.08); color: #1890ff; }

.ai-debug-card__body { padding: 8px 10px 0; line-height: 1.6; color: #595959; }

.ai-debug-card__group { padding: 6px 10px; &:last-child { padding-bottom: 10px; } }
.ai-debug-card__group-label {
  font-size: 11px; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; color: #389e0d;
}
.ai-debug-card__group--remaining .ai-debug-card__group-label { color: #d46b08; }

.ai-debug-card__item {
  display: flex; align-items: baseline; gap: 6px; padding: 2px 0; font-size: 11px; line-height: 1.5; color: #595959;
}
.ai-debug-card__bullet { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
.ai-debug-card__bullet--green { background: #52c41a; }
.ai-debug-card__bullet--orange { background: #fa8c16; }

.params-empty-guide {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.theme-dark {
  .code-section {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .section-header {
    background: #1c1c1c;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .section-title {
    color: #e0e6ed;
  }

  .side-tabs {
    border-color: rgba(255, 255, 255, 0.1);

    ::v-deep .ant-tabs-bar {
      background: #1c1c1c;
      border-bottom-color: rgba(255, 255, 255, 0.08);
    }

    ::v-deep .ant-tabs-nav .ant-tabs-tab {
      color: rgba(255, 255, 255, 0.55);

      &:hover {
        color: rgba(255, 255, 255, 0.85);
      }

      &.ant-tabs-tab-active .ant-tabs-tab-btn {
        color: #1890ff;
      }
    }
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
    border-color: rgba(255, 255, 255, 0.08);
    background: #1c1c1c;
  }

  .indicator-redirect {
    border-color: rgba(64, 169, 255, 0.25);
    background: linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(24, 144, 255, 0.03) 100%);

    &:hover {
      border-color: rgba(64, 169, 255, 0.4);
    }

    &__icon {
      background: rgba(64, 169, 255, 0.15);
      color: #69c0ff;
    }

    &__title {
      color: #e0e6ed;
    }

    &__desc {
      color: rgba(255, 255, 255, 0.45);
    }

    &__arrow {
      color: rgba(255, 255, 255, 0.35);
    }
  }

  .blank-card {
    border-color: rgba(255, 255, 255, 0.12);

    &:hover,
    &.active {
      border-color: #177ddc;
      background: rgba(23, 125, 220, 0.06);
    }

    &__icon {
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.65);
    }

    &__title {
      color: #e0e6ed;
    }

    &__desc {
      color: rgba(255, 255, 255, 0.4);
    }

    &__check {
      color: #40a9ff;
    }
  }

  .template-section-label {
    color: rgba(255, 255, 255, 0.28);
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

    &__name {
      color: #e0e6ed;
    }

    &__desc {
      color: rgba(255, 255, 255, 0.4);
    }

    &__meta {
      color: rgba(255, 255, 255, 0.28);
    }

    &__action {
      color: #40a9ff;
    }
  }

  .template-item:hover,
  .template-item.active {
    border-color: #177ddc;
    background: rgba(23, 125, 220, 0.06);
  }

  .tpl-name {
    color: #e0e6ed;
  }

  .tpl-desc {
    color: rgba(255, 255, 255, 0.4);
  }

  .prompt-tag {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
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

  .ai-status {
    color: #40a9ff;
  }

  .ai-debug-card { border-color: #303030; background: #1f1f1f; }
  .ai-debug-card--success { border-color: rgba(82, 196, 26, 0.25); }
  .ai-debug-card--warning { border-color: rgba(250, 140, 22, 0.3); }
  .ai-debug-card__header { background: linear-gradient(135deg, rgba(24, 144, 255, 0.08) 0%, transparent 100%); border-bottom-color: #303030; }
  .ai-debug-card--success .ai-debug-card__header { background: linear-gradient(135deg, rgba(82, 196, 26, 0.08) 0%, transparent 100%); }
  .ai-debug-card--warning .ai-debug-card__header { background: linear-gradient(135deg, rgba(250, 140, 22, 0.08) 0%, transparent 100%); }
  .ai-debug-card__badge { background: rgba(24, 144, 255, 0.15); }
  .ai-debug-card--success .ai-debug-card__badge { background: rgba(82, 196, 26, 0.15); }
  .ai-debug-card--warning .ai-debug-card__badge { background: rgba(250, 140, 22, 0.15); }
  .ai-debug-card__title { color: rgba(255,255,255,0.9); }
  .ai-debug-card__dismiss { color: rgba(255,255,255,0.3); &:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.06); } }
  .ai-debug-chip { background: rgba(24, 144, 255, 0.12); }
  .ai-debug-chip--success { background: rgba(82, 196, 26, 0.12); }
  .ai-debug-chip--warning { background: rgba(250, 140, 22, 0.12); }
  .ai-debug-card__body, .ai-debug-card__item { color: rgba(255,255,255,0.65); }
  .ai-debug-card__group-label { color: #73d13d; }
  .ai-debug-card__group--remaining .ai-debug-card__group-label { color: #ffa940; }

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

  .ai-panel {
    color: rgba(255, 255, 255, 0.78);
  }

  .code-editor-container {
    ::v-deep .CodeMirror {
      background: #141414;
      color: #d1d4dc;
    }

    ::v-deep .CodeMirror-gutters {
      border-right-color: rgba(255, 255, 255, 0.08);
      background: linear-gradient(to right, #1a1a1a 0%, #1c1c1c 100%);
    }

    ::v-deep .CodeMirror-linenumber {
      color: rgba(255, 255, 255, 0.32);
    }
  }
}
</style>
