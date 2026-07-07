<template>
  <div ref="chartRootEl" class="chart-left" :class="{ 'theme-dark': chartTheme === 'dark' }">
    <div class="chart-wrapper">
      <div class="drawing-toolbar">
        <a-tooltip
          v-for="tool in drawingTools"
          :key="tool.name"
          :title="tool.hint ? `${tool.title} — ${tool.hint}` : tool.title"
          placement="right"
        >
          <div
            class="drawing-tool-btn"
            :class="{ active: activeDrawingTool === tool.name }"
            @click="selectDrawingTool(tool.name)"
          >
            <a-icon :type="tool.icon" />
          </div>
        </a-tooltip>
        <a-divider type="vertical" />
        <a-tooltip :title="$t('dashboard.indicator.drawing.clearAll')" placement="right">
          <div class="drawing-tool-btn" @click="clearAllDrawings">
            <a-icon type="delete" />
          </div>
        </a-tooltip>
      </div>
      <div class="chart-content-area">
        <div class="indicator-toolbar">
          <div
            v-for="indicator in indicatorButtons"
            :key="indicator.id"
            class="indicator-btn"
            :class="{ active: isIndicatorActive(indicator.id) }"
            @click="handleIndicatorButtonClick(indicator)"
            :title="indicator.name"
          >
            {{ indicator.shortName }}
          </div>
        </div>
        <div v-if="activePresetIndicators.length" class="indicator-active-bar">
          <div
            v-for="indicator in activePresetIndicators"
            :key="indicator.instanceId || indicator.id"
            class="indicator-active-chip"
            :class="{ 'indicator-active-chip--hidden': indicator.visible === false }"
          >
            <span class="indicator-active-chip__label" @click="openIndicatorEditor(indicator)">
              {{ formatIndicatorInstanceLabel(indicator) }}
            </span>
            <a-tooltip :title="indicator.visible === false ? $t('indicatorIde.editor.showIndicator') : $t('indicatorIde.editor.hideIndicator')">
              <a-icon
                :type="indicator.visible === false ? 'eye-invisible' : 'eye'"
                class="indicator-active-chip__action"
                @click.stop="toggleIndicatorVisibility(indicator)"
              />
            </a-tooltip>
            <a-tooltip :title="$t('indicatorIde.editor.settings')">
              <a-icon
                type="setting"
                class="indicator-active-chip__action"
                @click.stop="openIndicatorEditor(indicator)"
              />
            </a-tooltip>
            <a-tooltip :title="$t('indicatorIde.editor.deleteIndicator')">
              <a-icon
                type="close"
                class="indicator-active-chip__action"
                @click.stop="removeIndicatorInstance(indicator)"
              />
            </a-tooltip>
          </div>
        </div>
        <div
          id="kline-chart-container"
          class="kline-chart-container"
        ></div>
        <canvas
          ref="wmCanvasRef"
          class="qd-wm-layer"
          :class="{ 'qd-wm-layer--dark': chartTheme === 'dark' }"
        ></canvas>
      </div>

      <div v-if="loading" class="chart-overlay">
        <a-spin size="large">
          <a-icon slot="indicator" type="loading" style="font-size: 24px; color: #13c2c2" spin />
        </a-spin>
      </div>

      <div v-if="error" class="chart-overlay">
        <div class="error-box">
          <a-icon type="warning" style="font-size: 24px; color: #ef5350; margin-bottom: 10px" />
          <span>{{ error }}</span>
          <a-button type="primary" size="small" ghost @click="handleRetry" style="margin-top: 12px">
            {{ $t('dashboard.indicator.retry') }}
          </a-button>
        </div>
      </div>

      <div v-if="pyodideLoadFailed" class="chart-overlay pyodide-warning">
        <div class="warning-box">
          <a-icon type="warning" style="font-size: 32px; color: #faad14; margin-bottom: 12px" />
          <div class="warning-title">{{ $t('dashboard.indicator.warning.pyodideLoadFailed') }}</div>
          <div class="warning-desc">{{ $t('dashboard.indicator.warning.pyodideLoadFailedDesc') }}</div>
        </div>
      </div>

      <div v-if="!symbol && !loading && !error && !pyodideLoadFailed" class="chart-overlay initial-hint">
        <div class="hint-box">
          <a-icon type="line-chart" style="font-size: 48px; color: var(--primary-color, #1890ff); margin-bottom: 16px" />
          <div class="hint-title">{{ $t('dashboard.indicator.hint.selectSymbol') }}</div>
          <div class="hint-desc">{{ $t('dashboard.indicator.hint.selectSymbolDesc') }}</div>
        </div>
      </div>
    </div>
    <a-modal
      :visible="indicatorEditorVisible"
      :title="indicatorEditorTitle"
      :confirmLoading="indicatorEditorSaving"
      :okText="$t('common.confirm')"
      :cancelText="$t('common.cancel')"
      :get-container="chartModalGetContainer"
      :wrap-class-name="indicatorEditorModalWrapClass"
      @ok="applyIndicatorEditor"
      @cancel="closeIndicatorEditor"
    >
      <div v-if="indicatorEditorSchema.length" class="indicator-editor-form">
        <div
          v-for="field in indicatorEditorSchema"
          :key="field.key"
          class="indicator-editor-field"
        >
          <div class="indicator-editor-field__label">{{ field.label }}</div>
          <a-input-number
            v-model="indicatorEditorForm[field.key]"
            :min="field.min"
            :max="field.max"
            :step="field.step || 1"
            :precision="field.precision != null ? field.precision : 0"
            style="width: 100%"
          />
          <div v-if="field.hint" class="indicator-editor-field__hint">{{ field.hint }}</div>
        </div>
        <div class="indicator-editor-field">
          <div class="indicator-editor-field__label">{{ $t('indicatorIde.editor.color') }}</div>
          <input v-model="indicatorEditorForm._styleColor" type="color" class="indicator-editor-color" />
        </div>
        <div class="indicator-editor-field">
          <div class="indicator-editor-field__label">{{ $t('indicatorIde.editor.lineWidth') }}</div>
          <a-input-number
            v-model="indicatorEditorForm._styleLineWidth"
            :min="1"
            :max="6"
            :step="1"
            :precision="0"
            style="width: 100%"
          />
        </div>
      </div>
      <div v-else class="indicator-editor-empty">{{ $t('indicatorIde.editor.noEditableParams') }}</div>
    </a-modal>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch, shallowRef, getCurrentInstance } from 'vue'
import { init, registerIndicator, registerOverlay } from 'klinecharts'
import request from '@/utils/request'
import ExchangeKlineWs from '@/utils/exchangeWs'
import { usePyodide } from '@/services/pyodide/usePyodide'
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
  calculateATR,
  calculateCCI,
  calculateWilliamsR,
  calculateMFI,
  calculateADX,
  calculateOBV,
  calculateAD,
  calculateADOSC,
  calculateKDJ
} from '@/utils/technicalIndicators'

export default {
  name: 'KlineChart',
  props: {
    symbol: {
      type: String,
      default: ''
    },
    market: {
      type: String,
      default: ''
    },
    timeframe: {
      type: String,
      default: '1H'
    },
    theme: {
      type: String,
      default: 'light'
    },
    activeIndicators: {
      type: Array,
      default: () => []
    },
    realtimeEnabled: {
      type: Boolean,
      default: false
    },
    userId: {
      type: Number,
      default: null
    }
  },
  emits: ['retry', 'price-change', 'load', 'indicator-toggle', 'indicators-updated'],
  setup (props, { emit }) {
    const klineData = shallowRef([])
    const loading = ref(false)
    const error = ref(null)
    const loadingHistory = ref(false)
    const hasMoreHistory = ref(true)
    let loadingHistoryPromise = null
    const chartInitialized = ref(false)

    const chartRef = shallowRef(null)
    const chartTheme = ref(props.theme || 'light')
    let chartResizeObserver = null
    let chartResizeRafId = null
    let volEnsureRafId = null
    let volPaneEnsured = false
    const VOL_PANE_OPTIONS = { height: 112, minHeight: 64, dragEnabled: true }
    const syncVolumePaneLayout = () => {
      if (!chartRef.value) return
      if (!volPaneEnsured && typeof chartRef.value.createIndicator === 'function') {
        try {
          chartRef.value.createIndicator('VOL', false, VOL_PANE_OPTIONS)
        } catch (e) {
        }
        volPaneEnsured = true
      }
      try {
        if (typeof chartRef.value.resize === 'function') {
          chartRef.value.resize()
        }
      } catch (e) {
      }
    }
    const scheduleSyncVolumePaneLayout = () => {
      if (volEnsureRafId != null) cancelAnimationFrame(volEnsureRafId)
      volEnsureRafId = requestAnimationFrame(() => {
        volEnsureRafId = null
        syncVolumePaneLayout()
      })
    }

    const wmCanvasRef = ref(null)
    const chartRootEl = ref(null)
    let _wmTimer = null
    let _wmObserver = null

    const realtimeTimer = ref(null)
    const realtimeInterval = ref(5000)
    const realtimeFetchInFlight = ref(false)
    let realtimeChartRafId = null
    let wsClient = null
    const wsActive = ref(false)
    let _cachedExchangeId = null
    let _exchangeIdTs = 0
    let _realtimeGeneration = 0
    const lastPriceEmitSig = ref('')

    const pricePrecision = ref(2)

    const calcPricePrecision = (data) => {
      if (!data || data.length === 0) return 2

      let maxDecimals = 0
      const sample = data.length > 50 ? data.slice(-50) : data
      for (let i = 0; i < sample.length; i++) {
        const vals = [sample[i].close, sample[i].open, sample[i].high, sample[i].low]
        for (let j = 0; j < vals.length; j++) {
          const s = String(vals[j])
          const dot = s.indexOf('.')
          if (dot >= 0) {
            const dec = s.length - dot - 1
            if (dec > maxDecimals) maxDecimals = dec
          }
        }
      }

      let minSpread = Infinity
      for (let i = 0; i < sample.length; i++) {
        const spread = sample[i].high - sample[i].low
        if (spread > 0 && spread < minSpread) minSpread = spread
      }
      let spreadDecimals = 2
      if (minSpread < Infinity && minSpread > 0) {
        spreadDecimals = Math.ceil(-Math.log10(minSpread)) + 2
      }

      const result = Math.max(maxDecimals, spreadDecimals, 2)
      return Math.min(result, 10) // 上限 10 位
    }

    const formatPrice = (v) => {
      return (Number(v) || 0).toFixed(pricePrecision.value)
    }

    const indicatorsUpdating = ref(false)
    const indicatorRefreshInterval = ref(10000)
    const lastIndicatorRefreshTs = ref(0)

    const maybeUpdateIndicators = (force = false) => {
      if (!chartRef.value) return
      const now = Date.now()
      const iv = Number(indicatorRefreshInterval.value || 10000)
      if (force || !lastIndicatorRefreshTs.value || (now - lastIndicatorRefreshTs.value) >= iv) {
        lastIndicatorRefreshTs.value = now
        updateIndicators()
      }
    }

    const addedIndicatorIds = ref([])
    const addedSignalOverlayIds = ref([])
    const addedBacktestOverlayIds = ref([])
    const addedDrawingOverlayIds = ref([])
    const activeDrawingTool = ref(null)
    let shiftMeasurePointerDownHandler = null

    const { proxy } = getCurrentInstance()

    const drawingTools = computed(() => [
      {
        name: 'measure',
        title: proxy.$t('dashboard.indicator.drawing.measure'),
        hint: proxy.$t('dashboard.indicator.drawing.measureHint'),
        icon: 'column-height'
      },
      { name: 'line', title: proxy.$t('dashboard.indicator.drawing.line'), icon: 'line' },
      { name: 'horizontalLine', title: proxy.$t('dashboard.indicator.drawing.horizontalLine'), icon: 'minus' },
      { name: 'verticalLine', title: proxy.$t('dashboard.indicator.drawing.verticalLine'), icon: 'column-width' },
      { name: 'ray', title: proxy.$t('dashboard.indicator.drawing.ray'), icon: 'arrow-right' },
      { name: 'straightLine', title: proxy.$t('dashboard.indicator.drawing.straightLine'), icon: 'menu' },
      { name: 'parallelStraightLine', title: proxy.$t('dashboard.indicator.drawing.parallelLine'), icon: 'menu' },
      { name: 'priceLine', title: proxy.$t('dashboard.indicator.drawing.priceLine'), icon: 'dollar' },
      { name: 'priceChannelLine', title: proxy.$t('dashboard.indicator.drawing.priceChannel'), icon: 'border' },
      { name: 'fibonacciLine', title: proxy.$t('dashboard.indicator.drawing.fibonacciLine'), icon: 'rise' }
    ])

    const indicatorButtons = ref([
      {
        id: 'sma',
        name: 'SMA (简单移动平均)',
        shortName: 'SMA',
        type: 'line',
        defaultParams: { length: 20 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 300, step: 1 }]
      },
      {
        id: 'ema',
        name: 'EMA (指数移动平均)',
        shortName: 'EMA',
        type: 'line',
        defaultParams: { length: 20 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 300, step: 1 }]
      },
      {
        id: 'rsi',
        name: 'RSI (相对强弱)',
        shortName: 'RSI',
        type: 'line',
        defaultParams: { length: 14 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'macd',
        name: 'MACD',
        shortName: 'MACD',
        type: 'macd',
        defaultParams: { fast: 12, slow: 26, signal: 9 },
        paramSchema: [
          { key: 'fast', labelKey: 'indicatorIde.editor.fastLine', type: 'number', min: 1, max: 100, step: 1 },
          { key: 'slow', labelKey: 'indicatorIde.editor.slowLine', type: 'number', min: 2, max: 200, step: 1 },
          { key: 'signal', labelKey: 'indicatorIde.editor.signalLine', type: 'number', min: 1, max: 100, step: 1 }
        ]
      },
      {
        id: 'bb',
        name: '布林带 (Bollinger Bands)',
        shortName: 'BB',
        type: 'band',
        defaultParams: { length: 20, mult: 2 },
        paramSchema: [
          { key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 300, step: 1 },
          { key: 'mult', labelKey: 'indicatorIde.editor.multiplier', type: 'number', min: 0.1, max: 10, step: 0.1, precision: 1 }
        ]
      },
      {
        id: 'atr',
        name: 'ATR (平均真实波幅)',
        shortName: 'ATR',
        type: 'line',
        defaultParams: { period: 14 },
        paramSchema: [{ key: 'period', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'cci',
        name: 'CCI (商品通道指数)',
        shortName: 'CCI',
        type: 'line',
        defaultParams: { length: 20 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'williams',
        name: 'Williams %R (威廉指标)',
        shortName: 'W%R',
        type: 'line',
        defaultParams: { length: 14 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'mfi',
        name: 'MFI (资金流量指标)',
        shortName: 'MFI',
        type: 'line',
        defaultParams: { length: 14 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'adx',
        name: 'ADX (平均趋向指数)',
        shortName: 'ADX',
        type: 'adx',
        defaultParams: { length: 14 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      { id: 'obv', name: 'OBV (能量潮)', shortName: 'OBV', type: 'line', defaultParams: {}, paramSchema: [] },
      {
        id: 'adosc',
        name: 'ADOSC (积累/派发振荡器)',
        shortName: 'ADOSC',
        type: 'line',
        defaultParams: { fast: 3, slow: 10 },
        paramSchema: [
          { key: 'fast', labelKey: 'indicatorIde.editor.fastLine', type: 'number', min: 1, max: 100, step: 1 },
          { key: 'slow', labelKey: 'indicatorIde.editor.slowLine', type: 'number', min: 2, max: 200, step: 1 }
        ]
      },
      { id: 'ad', name: 'AD (积累/派发线)', shortName: 'AD', type: 'line', defaultParams: {}, paramSchema: [] },
      {
        id: 'kdj',
        name: 'KDJ (随机指标)',
        shortName: 'KDJ',
        type: 'line',
        defaultParams: { period: 9, k: 3, d: 3 },
        paramSchema: [
          { key: 'period', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 100, step: 1 },
          { key: 'k', labelKey: 'indicatorIde.editor.kSmoothing', type: 'number', min: 1, max: 20, step: 1 },
          { key: 'd', labelKey: 'indicatorIde.editor.dSmoothing', type: 'number', min: 1, max: 20, step: 1 }
        ]
      }
    ])

    const getIndicatorTemplate = (indicatorId) => {
      return indicatorButtons.value.find(item => item.id === indicatorId) || null
    }

    const normalizeIndicatorParams = (template, rawParams = {}) => {
      const params = { ...(template?.defaultParams || {}) }
      const schema = (template && Array.isArray(template.paramSchema)) ? template.paramSchema : []
      schema.forEach(field => {
        const rawValue = rawParams[field.key]
        const fallback = params[field.key]
        let nextValue = rawValue != null && rawValue !== '' ? Number(rawValue) : fallback
        if (Number.isNaN(nextValue)) nextValue = fallback
        if (field.min != null && nextValue < field.min) nextValue = field.min
        if (field.max != null && nextValue > field.max) nextValue = field.max
        if (field.precision != null && typeof nextValue === 'number') {
          nextValue = Number(nextValue.toFixed(field.precision))
        } else if (typeof nextValue === 'number' && Number.isInteger(field.step || 1)) {
          nextValue = Math.round(nextValue)
        }
        params[field.key] = nextValue
      })
      return params
    }

    const createIndicatorInstanceId = (indicatorId) => {
      return `${indicatorId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }

    const normalizeIndicatorStyle = (style = {}, fallbackColor = '') => {
      const lineWidth = Math.max(1, Math.min(6, parseInt(style.lineWidth, 10) || 2))
      return {
        color: String(style.color || fallbackColor || '').trim() || fallbackColor || 'var(--primary-color, #1890ff)',
        lineWidth
      }
    }

    const pickNextDefaultParams = (template, existingIndicators = []) => {
      const baseParams = normalizeIndicatorParams(template, template?.defaultParams || {})
      if (!template || !template.id) return baseParams
      const sameType = (existingIndicators || []).filter(item => item && item.id === template.id)
      if (!sameType.length) return baseParams

      if (template.id === 'ema' || template.id === 'sma') {
        const preferred = [10, 20, 60, 120, 250]
        const used = new Set(sameType.map(item => Number(item?.params?.length || item?.params?.period || 0)).filter(Boolean))
        const candidate = preferred.find(value => !used.has(value))
        if (candidate) {
          return {
            ...baseParams,
            length: candidate
          }
        }
        const maxUsed = Math.max(...Array.from(used))
        return {
          ...baseParams,
          length: maxUsed > 0 ? maxUsed + 10 : (baseParams.length || 20)
        }
      }

      return baseParams
    }

    const formatIndicatorInstanceLabel = (indicator) => {
      if (!indicator) return ''
      const template = getIndicatorTemplate(indicator.id)
      const params = normalizeIndicatorParams(template, indicator.params || {})
      switch (indicator.id) {
        case 'sma':
        case 'ema':
        case 'rsi':
        case 'cci':
        case 'mfi':
        case 'adx':
        case 'williams':
          return `${template ? template.shortName : indicator.id.toUpperCase()}(${params.length})`
        case 'atr':
          return `ATR(${params.period})`
        case 'macd':
          return `MACD(${params.fast}, ${params.slow}, ${params.signal})`
        case 'bb':
          return `BB(${params.length}, ${params.mult})`
        case 'adosc':
          return `ADOSC(${params.fast}, ${params.slow})`
        case 'kdj':
          return `KDJ(${params.period}, ${params.k}, ${params.d})`
        default:
          return template ? template.shortName : indicator.id.toUpperCase()
      }
    }

    const activePresetIndicators = computed(() => {
      return (props.activeIndicators || []).filter(item => item && item.id && item.id !== 'selected-python-indicator' && item.type !== 'python')
    })

    const indicatorEditorVisible = ref(false)
    const indicatorEditorSaving = ref(false)
    const indicatorEditorTargetId = ref('')
    const indicatorEditorForm = reactive({})

    const indicatorEditorTarget = computed(() => {
      return activePresetIndicators.value.find(item => (item.instanceId || item.id) === indicatorEditorTargetId.value) || null
    })

    const indicatorEditorTemplate = computed(() => {
      return indicatorEditorTarget.value ? getIndicatorTemplate(indicatorEditorTarget.value.id) : null
    })

    const indicatorEditorSchema = computed(() => {
      return indicatorEditorTemplate.value && Array.isArray(indicatorEditorTemplate.value.paramSchema)
        ? indicatorEditorTemplate.value.paramSchema.map(field => ({
            ...field,
            label: field.labelKey ? proxy.$t(field.labelKey) : field.label
          }))
        : []
    })

    const indicatorEditorModalWrapClass = computed(() => {
      return chartTheme.value === 'dark' ? 'indicator-editor-modal indicator-editor-modal--dark' : 'indicator-editor-modal'
    })

    const chartModalGetContainer = () => {
      try {
        const root = chartRootEl.value
        const fs = document.fullscreenElement || document.webkitFullscreenElement
        if (root && fs && typeof fs.contains === 'function' && fs.contains(root)) return fs
      } catch (_) {}
      return document.body
    }

    const indicatorEditorTitle = computed(() => {
      return indicatorEditorTarget.value
        ? `${proxy.$t('indicatorIde.editor.edit')} ${formatIndicatorInstanceLabel(indicatorEditorTarget.value)}`
        : proxy.$t('indicatorIde.editor.editParams')
    })

    const isIndicatorActive = (indicatorId) => {
      return props.activeIndicators.some(ind => ind.id === indicatorId)
    }

    const selectDrawingTool = (toolName) => {
      if (!chartRef.value) {
        return
      }

      const toolMap = {
        line: 'segment',
        horizontalLine: 'horizontalStraightLine',
        verticalLine: 'verticalStraightLine',
        ray: 'rayLine',
        straightLine: 'straightLine',
        parallelStraightLine: 'parallelStraightLine',
        priceLine: 'priceLine',
        priceChannelLine: 'priceChannelLine',
        fibonacciLine: 'fibonacciLine',
        measure: 'priceRangeMeasure'
      }

      const overlayName = toolMap[toolName] || toolName

      if (activeDrawingTool.value === toolName) {
        activeDrawingTool.value = null
        try {
          if (typeof chartRef.value.overrideOverlay === 'function') {
            chartRef.value.overrideOverlay(null)
          }
        } catch (e) {
        }
        return
      }

      activeDrawingTool.value = toolName

      try {
        const overlayConfig = {
          name: overlayName,
          lock: false,
          extendData: {
            isDrawing: true
          }
        }
        if (overlayName === 'priceRangeMeasure') {
          overlayConfig.styles = getMeasureOverlayTheme()
        }
        const overlayId = chartRef.value.createOverlay(overlayConfig)
        if (overlayId) {
          addedDrawingOverlayIds.value.push(overlayId)
        } else {
          console.warn(`Failed to create overlay: ${overlayName}. Make sure the overlay is registered.`)
          activeDrawingTool.value = null
        }
      } catch (err) {
        console.error(`Error selecting drawing tool ${toolName} (${overlayName}):`, err)
        activeDrawingTool.value = null
      }
    }

    const clearAllDrawings = () => {
      if (!chartRef.value) return

      try {
        addedDrawingOverlayIds.value.forEach(overlayId => {
          try {
            if (typeof chartRef.value.removeOverlay === 'function') {
              chartRef.value.removeOverlay(overlayId)
            } else if (typeof chartRef.value.removeOverlayById === 'function') {
              chartRef.value.removeOverlayById(overlayId)
            }
          } catch (err) {
          }
        })
        addedDrawingOverlayIds.value = []
        activeDrawingTool.value = null

        if (typeof chartRef.value.overrideOverlay === 'function') {
          chartRef.value.overrideOverlay(null)
        }
      } catch (err) {
      }
    }

    const toggleIndicator = (indicator) => {
      const isActive = isIndicatorActive(indicator.id)

      if (isActive) {
        emit('indicator-toggle', {
          action: 'remove',
          indicator: { id: indicator.id }
        })
      } else {
        const indicatorToAdd = {
          ...indicator,
          params: { ...indicator.defaultParams },
          calculate: null // calculate 函数在 updateIndicators 中通过 id 判断
        }
        emit('indicator-toggle', {
          action: 'add',
          indicator: indicatorToAdd
        })
      }
    }

    const handleIndicatorButtonClick = (indicator) => {
      if (!indicator || !indicator.id) return
      const fallbackColor = getIndicatorColor(activePresetIndicators.value.length)
      const nextParams = pickNextDefaultParams(indicator, activePresetIndicators.value)
      emit('indicator-toggle', {
        action: 'add',
        indicator: {
          ...indicator,
          instanceId: createIndicatorInstanceId(indicator.id),
          params: nextParams,
          style: normalizeIndicatorStyle({}, fallbackColor),
          visible: true,
          calculate: null
        }
      })
    }

    const openIndicatorEditor = (indicator) => {
      if (!indicator || !indicator.id) return
      const template = getIndicatorTemplate(indicator.id)
      const indicatorIndex = activePresetIndicators.value.findIndex(item => (item.instanceId || item.id) === (indicator.instanceId || indicator.id))
      const fallbackColor = indicator.style?.color || getIndicatorColor(indicatorIndex >= 0 ? indicatorIndex : 0)
      indicatorEditorTargetId.value = indicator.instanceId || indicator.id
      const nextParams = normalizeIndicatorParams(template, indicator.params || {})
      Object.keys(indicatorEditorForm).forEach(key => {
        delete indicatorEditorForm[key]
      })
      Object.keys(nextParams).forEach(key => {
        indicatorEditorForm[key] = nextParams[key]
      })
      indicatorEditorForm._styleColor = normalizeIndicatorStyle(indicator.style || {}, fallbackColor).color
      indicatorEditorForm._styleLineWidth = normalizeIndicatorStyle(indicator.style || {}, fallbackColor).lineWidth
      indicatorEditorVisible.value = true
    }

    const closeIndicatorEditor = () => {
      indicatorEditorVisible.value = false
      indicatorEditorTargetId.value = ''
      indicatorEditorSaving.value = false
      Object.keys(indicatorEditorForm).forEach(key => {
        delete indicatorEditorForm[key]
      })
    }

    const removeIndicatorInstance = (indicator) => {
      if (!indicator || !indicator.id) return
      emit('indicator-toggle', {
        action: 'remove',
        indicator: { id: indicator.id, instanceId: indicator.instanceId || indicator.id }
      })
      if (indicatorEditorTargetId.value === (indicator.instanceId || indicator.id)) {
        closeIndicatorEditor()
      }
    }

    const toggleIndicatorVisibility = (indicator) => {
      if (!indicator || !indicator.id) return
      emit('indicator-toggle', {
        action: 'update',
        indicator: {
          ...indicator,
          instanceId: indicator.instanceId || indicator.id,
          visible: indicator.visible === false
        }
      })
    }

    const applyIndicatorEditor = () => {
      const indicator = indicatorEditorTarget.value
      const template = indicatorEditorTemplate.value
      if (!indicator || !template) {
        closeIndicatorEditor()
        return
      }
      const nextParams = normalizeIndicatorParams(template, indicatorEditorForm)
      if (Object.prototype.hasOwnProperty.call(nextParams, 'fast') &&
          Object.prototype.hasOwnProperty.call(nextParams, 'slow') &&
          Number(nextParams.fast) >= Number(nextParams.slow)) {
        proxy.$message.warning(proxy.$t('indicatorIde.editor.fastLessThanSlow'))
        return
      }
      const nextStyle = normalizeIndicatorStyle({
        color: indicatorEditorForm._styleColor,
        lineWidth: indicatorEditorForm._styleLineWidth
      }, indicator.style?.color || getIndicatorColor(0))
      indicatorEditorSaving.value = true
      emit('indicator-toggle', {
        action: 'update',
        indicator: {
          ...indicator,
          instanceId: indicator.instanceId || indicator.id,
          params: nextParams,
          style: nextStyle,
          visible: indicator.visible !== false
        }
      })
      closeIndicatorEditor()
    }

    const {
      ready: pythonReady,
      loading: loadingPython,
      failed: pyodideLoadFailed,
      prewarm: prewarmPyodide,
      ensureReady: ensurePyodideReady,
      runStrategy: pyodideRunStrategy
    } = usePyodide()

    const themeConfig = computed(() => {
      if (chartTheme.value === 'dark') {
        return {
          backgroundColor: '#141414',
          textColor: '#d1d4dc',
          textColorSecondary: '#787b86',
          borderColor: '#2a2a2a',
          gridLineColor: '#252525',
          gridLineColorDashed: '#363c4e',
          tooltipBg: 'rgba(25, 27, 32, 0.95)',
          tooltipBorder: '#333',
          tooltipText: '#ccc',
          tooltipTextSecondary: '#888',
          axisLabelColor: '#787b86',
          splitAreaColor: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
          dataZoomBorder: '#2a2a2a',
          dataZoomFiller: 'rgba(41, 98, 255, 0.15)',
          dataZoomHandle: '#13c2c2',
          dataZoomText: 'transparent',
          dataZoomBg: '#252525'
        }
      } else {
        return {
          backgroundColor: '#fff',
          textColor: '#333',
          textColorSecondary: '#666',
          borderColor: '#e8e8e8',
          gridLineColor: '#e8e8e8',
          gridLineColorDashed: '#e8e8e8',
          tooltipBg: 'rgba(255, 255, 255, 0.95)',
          tooltipBorder: '#e8e8e8',
          tooltipText: '#333',
          tooltipTextSecondary: '#666',
          axisLabelColor: '#666',
          splitAreaColor: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
          dataZoomBorder: '#e8e8e8',
          dataZoomFiller: 'rgba(24, 144, 255, 0.15)',
          dataZoomHandle: 'var(--primary-color, #1890ff)',
          dataZoomText: '#999',
          dataZoomBg: '#f0f2f5'
        }
      }
    })

    const getIndicatorColor = (idx) => {
      if (chartTheme.value === 'dark') {
        return ['#13c2c2', '#e040fb', '#ffeb3b', '#00e676', '#ff6d00', '#9c27b0'][idx % 6]
      } else {
        return ['#13c2c2', '#9c27b0', '#f57c00', '#1976d2', '#c2185b', '#7b1fa2'][idx % 6]
      }
    }

    const castPythonParamValue = (rawValue, type) => {
      const paramType = String(type || '').toLowerCase()
      if (paramType === 'bool') {
        return ['true', '1', 'yes', 'on'].includes(String(rawValue).toLowerCase())
      }
      if (paramType === 'int') {
        const num = Number(rawValue)
        return Number.isFinite(num) ? Math.trunc(num) : rawValue
      }
      if (paramType === 'float') {
        const num = Number(rawValue)
        return Number.isFinite(num) ? num : rawValue
      }
      return String(rawValue)
    }

    const extractPythonParamDefaults = (code) => {
      const defaults = {}
      if (!code || typeof code !== 'string') return defaults
      const paramRe = /^\s*#\s*@param\s+(\w+)\s+(int|float|bool|str|string)\s+(\S+)/i
      for (const rawLine of code.split('\n')) {
        const match = rawLine.match(paramRe)
        if (!match) continue
        defaults[match[1]] = castPythonParamValue(match[3], match[2])
      }
      return defaults
    }

    const resolvePythonIndicatorParams = (indicator = {}) => {
      const code = indicator.code || indicator.userCode || ''
      const declaredDefaults = extractPythonParamDefaults(code)
      const explicitParams = indicator.params && typeof indicator.params === 'object'
        ? indicator.params
        : {}
      const snakeParams = indicator.indicator_params && typeof indicator.indicator_params === 'object'
        ? indicator.indicator_params
        : {}
      const camelParams = indicator.indicatorParams && typeof indicator.indicatorParams === 'object'
        ? indicator.indicatorParams
        : {}
      return {
        ...declaredDefaults,
        ...snakeParams,
        ...camelParams,
        ...explicitParams
      }
    }

    const parsePythonStrategy = (code) => {
      if (!code || typeof code !== 'string') {
        return null
      }

      try {
        const params = extractPythonParamDefaults(code)

        const paramMatches = code.match(/(\w+)\s*=\s*(\d+\.?\d*)/g)
        if (paramMatches) {
          paramMatches.forEach(match => {
            const parts = match.split('=')
            if (parts.length === 2) {
              const key = parts[0].trim()
              const value = parseFloat(parts[1].trim())
              if (!isNaN(value)) {
                params[key] = value
              }
            }
          })
        }

        return {
          params: params,
          plots: [], // 从代码中无法直接提取 plots，需要在执行时确定
          success: true
        }
      } catch (err) {
        return {
          params: {},
          plots: [],
          success: false
        }
      }
    }

    const executePythonStrategy = async (userCode, klineData, params = {}, indicatorInfo = {}) => {
      try {
        await ensurePyodideReady()
      } catch (err) {
        throw new Error('Python 引擎未就绪，请等待加载完成')
      }

      try {
        const finalCode = userCode

        const rawData = klineData.map(item => {
          let timeValue = item.timestamp || item.time
          if (timeValue < 1e10) timeValue = timeValue * 1000
          return {
            time: Math.floor(timeValue / 1000),
            open: parseFloat(item.open) || 0,
            high: parseFloat(item.high) || 0,
            low: parseFloat(item.low) || 0,
            close: parseFloat(item.close) || 0,
            volume: parseFloat(item.volume) || 0
          }
        })

        const resultJson = await pyodideRunStrategy({
          userCode: finalCode,
          rawData,
          params: params || {}
        })

        if (!resultJson || typeof resultJson !== 'string') {
          throw new Error(`Python 代码执行后未返回有效的 JSON 字符串，返回类型: ${typeof resultJson}`)
        }

        let result
        try {
          result = JSON.parse(resultJson)
        } catch (parseError) {
          throw new Error(`JSON 解析失败: ${parseError.message}。可能是数据中包含 NaN 或其他无效值。`)
        }

        if (!result) {
          return { plots: [], signals: [], calculatedVars: {} }
        }

        if (!result.plots || !Array.isArray(result.plots)) {
          result.plots = []
        }

        result.plots = result.plots.map(plot => {
          if (plot.data && Array.isArray(plot.data)) {
            plot.data = plot.data.map(val => {
              if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
                return null
              }
              return val
            })
          }
          return plot
        })

        if (result.signals && Array.isArray(result.signals)) {
          result.signals = result.signals.map(signal => {
            if (signal.data && Array.isArray(signal.data)) {
              signal.data = signal.data.map(val => {
                if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
                  return null
                }
                return val
              })
            }
            return signal
          })
        }

        if (!result.calculatedVars) {
          result.calculatedVars = {}
        }

        return result
      } catch (err) {
        throw new Error(`Python 执行失败: ${err.message}`)
      }
    }

const withAlpha = (color, alpha) => {
  const hex = String(color || '').replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return color
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const isSolidHexColor = (color) => /^#?[0-9a-fA-F]{6}$/.test(String(color || '').trim())

const resolveLayerColor = (color, fallback, alpha) => {
  const raw = String(color || '').trim()
  const base = raw || fallback
  if (isSolidHexColor(base)) return withAlpha(base, alpha)
  if (/^rgba?\(/i.test(base)) return base
  return withAlpha(fallback, alpha)
}

const measureLayerText = (text, fontSize = 10, min = 40, max = 140) => {
  const raw = String(text || '')
  const width = raw.split('').reduce((acc, char) => acc + (char.charCodeAt(0) > 255 ? fontSize : fontSize * 0.58), 0)
  return Math.max(min, Math.min(max, width + 18))
}

const normalizeCompactBacktestMarkerText = (text, side) => {
  const raw = String(text || '').trim()
  const lower = raw.toLowerCase()
  if (lower.includes('liquid')) return 'LQ'
  if (lower.includes('trailing')) return 'TR'
  if (lower.includes('profit') || lower.includes('tp')) return 'TP'
  if (lower.includes('stop') || lower.includes('sl')) return 'SL'
  if (lower.includes('open long')) return 'L'
  if (lower.includes('open short')) return 'S'
  if (lower.includes('close long')) return 'XL'
  if (lower.includes('close short')) return 'XS'
  if (lower.includes('signal')) return side === 'buy' ? 'L?' : 'S?'
  if (/^[A-Za-z0-9?+]{1,4}$/.test(raw)) return raw
  return side === 'buy' ? 'L' : 'S'
}

registerOverlay({
      name: 'signalTag',
      totalStep: 1,

      lock: true,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,

      checkEventOn: () => false,

      createPointFigures: ({ coordinates, overlay }) => {
        const { text } = overlay.extendData || {}
        const color = overlay.extendData?.color || '#555555'
        // `markerStyle === 'dashed'` is used by the indicator IDE to render a
        // "signal bar" marker alongside the regular "execution bar" marker.
        // Visual: hollow box with dashed border + lower-opacity fill, so the
        // user can see the two-bar offset that exists when signalTiming is
        // `next_bar_open` (signal fires on bar t, executes at t+1 open).
        const markerStyle = overlay.extendData?.markerStyle || 'solid'
        const isDashed = markerStyle === 'dashed'
        const isBacktest = overlay.extendData?.source === 'backtest'

        if (!coordinates[0]) return []
        const x = coordinates[0].x
        const signalY = coordinates[0].y // Point 0: 标签位置（已含与 K 线的价格间距）

        const anchorY = coordinates[1] ? coordinates[1].y : signalY

        const boxPaddingX = isBacktest ? 5 : 8
        const boxPaddingY = isBacktest ? 2 : 4
        const fontSize = Number(overlay.extendData?.fontSize) || (isBacktest ? 11 : 12)
        const textStr = String(text || '')
        const textWidth = textStr.split('').reduce((acc, char) => acc + (char.charCodeAt(0) > 255 ? 11 : 6.5), 0)
        const boxWidth = Math.max(textWidth + boxPaddingX * 2, isBacktest ? 28 : 20)
        const boxHeight = fontSize + boxPaddingY * 2

        // Compatibility: old overlays used extendData.type='buy'/'sell', new overlays use extendData.side='buy'/'sell'
        const side = overlay.extendData?.side || overlay.extendData?.type || 'buy'
        const isBuy = side === 'buy'

        if (isBacktest && overlay.extendData?.labelMode !== 'full') {
          const lane = Math.max(0, Math.min(3, Number(overlay.extendData?.lane) || 0))
          const shortText = normalizeCompactBacktestMarkerText(overlay.extendData?.shortText || textStr, side)
          const compactFontSize = Number(overlay.extendData?.fontSize) || (isDashed ? 9 : 10)
          const compactHeight = isDashed ? 13 : 15
          const compactWidth = Math.max(18, Math.min(38, shortText.length * 7 + 10))
          const laneShift = lane * 16
          const compactY = isBuy ? signalY + laneShift : signalY - compactHeight - laneShift
          const dotY = anchorY
          const edgeLineEndY = isBuy ? compactY : (compactY + compactHeight)
          const labelFill = isDashed ? 'rgba(0,0,0,0)' : color
          const labelTextColor = isDashed ? withAlpha(color, 0.86) : '#ffffff'
          return [
            {
              type: 'line',
              attrs: { coordinates: [{ x, y: dotY }, { x, y: edgeLineEndY }] },
              styles: {
                style: 'stroke',
                color: withAlpha(color, isDashed ? 0.34 : 0.46),
                dashedValue: isDashed ? [2, 4] : [2, 3]
              },
              ignoreEvent: true
            },
            {
              type: 'circle',
              attrs: { x, y: dotY, r: isDashed ? 2 : 2.5 },
              styles: isDashed
                ? { style: 'stroke', color: withAlpha(color, 0.82), lineWidth: 1.2 }
                : { style: 'fill', color: color },
              ignoreEvent: true
            },
            {
              type: 'rect',
              attrs: {
                x: x - compactWidth / 2,
                y: compactY,
                width: compactWidth,
                height: compactHeight,
                r: 4
              },
              styles: {
                style: isDashed ? 'stroke' : 'stroke_fill',
                color: labelFill,
                borderColor: isDashed ? withAlpha(color, 0.86) : color,
                borderSize: 1,
                borderDashedValue: isDashed ? [3, 3] : []
              },
              ignoreEvent: true
            },
            {
              type: 'text',
              attrs: {
                x,
                y: compactY + compactHeight / 2,
                text: shortText,
                align: 'center',
                baseline: 'middle'
              },
              styles: { color: labelTextColor, size: compactFontSize, weight: '700' },
              ignoreEvent: true
            }
          ]
        }

        const boxY = isBuy ? signalY : (signalY - boxHeight)

        const circleY = anchorY
        const lineStartY = circleY
        const lineEndY = isBuy ? boxY : (boxY + boxHeight)
        const lineStyle = isBacktest
          ? { style: 'stroke', color: color, dashedValue: isDashed ? [3, 2] : [4, 3] }
          : { style: 'stroke', color: color, dashedValue: [2, 2] }
        const circleRadius = isBacktest ? 3 : 4
        const solidTextColor = '#ffffff'
        const textWeight = isBacktest ? 'bold' : 'bold'

        if (isDashed) {
          return [
            {
              type: 'line',
              attrs: {
                coordinates: [
                  { x, y: lineStartY },
                  { x, y: lineEndY }
                ]
              },
              styles: lineStyle,
              ignoreEvent: true
            },
            {
              type: 'circle',
              attrs: { x, y: circleY, r: circleRadius },
              styles: { style: 'stroke', color: color, lineWidth: 1.5 },
              ignoreEvent: true
            },
            {
              type: 'rect',
              attrs: {
                x: x - boxWidth / 2,
                y: boxY,
                width: boxWidth,
                height: boxHeight,
                r: 3
              },
              styles: {
                style: 'stroke',
                color: 'rgba(0,0,0,0)',
                borderColor: color,
                borderSize: 1.5,
                borderDashedValue: [4, 3]
              },
              ignoreEvent: true
            },
            {
              type: 'text',
              attrs: {
                x: x,
                y: boxY + boxHeight / 2,
                text: textStr,
                align: 'center',
                baseline: 'middle'
              },
              styles: { color: color, size: fontSize, weight: '600' },
              ignoreEvent: true
            }
          ]
        }

        return [
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x, y: lineStartY },
                { x, y: lineEndY }
              ]
            },
            styles: lineStyle,
            ignoreEvent: true
          },
          {
            type: 'circle',
            attrs: { x, y: circleY, r: circleRadius },
            styles: { style: 'fill', color: color },
            ignoreEvent: true
          },
          {
            type: 'rect',
            attrs: {
              x: x - boxWidth / 2,
              y: boxY,
              width: boxWidth,
              height: boxHeight,
              r: 3
            },
            styles: { style: 'fill', color: color, borderSize: 0 },
            ignoreEvent: true
          },
          {
            type: 'text',
            attrs: {
              x: x,
              y: boxY + boxHeight / 2,
              text: textStr,
              align: 'center',
              baseline: 'middle'
            },
            styles: { color: solidTextColor, size: fontSize, weight: textWeight },
            ignoreEvent: true
          }
        ]
      }
    })

    registerOverlay({
      name: 'qdIndicatorZone',
      totalStep: 2,
      lock: true,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      checkEventOn: () => false,
      createPointFigures: ({ coordinates, overlay }) => {
        if (!coordinates[0] || !coordinates[1]) return []
        const data = overlay.extendData || {}
        const x1 = Math.min(coordinates[0].x, coordinates[1].x)
        const x2 = Math.max(coordinates[0].x, coordinates[1].x)
        const y1 = Math.min(coordinates[0].y, coordinates[1].y)
        const y2 = Math.max(coordinates[0].y, coordinates[1].y)
        const isDark = chartTheme.value === 'dark'
        const text = String(data.text || '')
        const lowerText = text.toLowerCase()
        const semanticAccent = lowerText.includes('risk') || lowerText.includes('atr')
          ? '#fa8c16'
          : (lowerText.includes('support') ? '#13c2c2' : (lowerText.includes('resistance') ? '#f5222d' : 'var(--primary-color, #1890ff)'))
        const color = data.color || semanticAccent
        const opacity = Number.isFinite(Number(data.opacity)) ? Math.min(Number(data.opacity), 0.10) : (isDark ? 0.075 : 0.055)
        const fillColor = resolveLayerColor(data.fillColor, color, opacity)
        const borderColor = resolveLayerColor(data.borderColor, color, isDark ? 0.48 : 0.42)
        const figures = [
          {
            type: 'rect',
            attrs: { x: x1, y: y1, width: Math.max(1, x2 - x1), height: Math.max(1, y2 - y1) },
            styles: {
              style: 'stroke_fill',
              color: fillColor,
              borderColor,
              borderSize: Number(data.borderSize || 1),
              borderDashedValue: data.dashed === false ? [] : [5, 4]
            },
            ignoreEvent: true
          }
        ]
        if (text) {
          const fontSize = Number(data.fontSize || 10)
          const labelWidth = measureLayerText(text, fontSize, 48, 150)
          const labelHeight = Math.max(17, fontSize + 8)
          const labelX = x1 + 8
          const labelY = y1 + 8
          figures.push({
            type: 'rect',
            attrs: { x: labelX, y: labelY, width: labelWidth, height: labelHeight, r: 5 },
            styles: {
              style: 'stroke_fill',
              color: isDark ? 'rgba(14, 18, 25, 0.78)' : 'rgba(255, 255, 255, 0.78)',
              borderColor: resolveLayerColor(data.borderColor, color, isDark ? 0.38 : 0.30),
              borderSize: 1
            },
            ignoreEvent: true
          })
          figures.push({
            type: 'text',
            attrs: { x: labelX + 9, y: labelY + labelHeight / 2, text, align: 'left', baseline: 'middle' },
            styles: {
              color: data.textColor || color,
              size: fontSize,
              weight: '700',
              backgroundColor: 'transparent'
            },
            ignoreEvent: true
          })
        }
        return figures
      }
    })

    registerOverlay({
      name: 'qdIndicatorLine',
      totalStep: 2,
      lock: true,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      checkEventOn: () => false,
      createPointFigures: ({ coordinates, overlay }) => {
        if (!coordinates[0] || !coordinates[1]) return []
        const data = overlay.extendData || {}
        const color = data.color || 'var(--primary-color, #1890ff)'
        const figures = [
          {
            type: 'line',
            attrs: { coordinates: [{ x: coordinates[0].x, y: coordinates[0].y }, { x: coordinates[1].x, y: coordinates[1].y }] },
            styles: {
              style: 'stroke',
              color,
              size: Number(data.lineWidth || 1),
              dashedValue: data.dashed ? [5, 5] : []
            },
            ignoreEvent: true
          }
        ]
        if (data.text) {
          figures.push({
            type: 'text',
            attrs: { x: coordinates[1].x + 6, y: coordinates[1].y, text: String(data.text), align: 'left', baseline: 'middle' },
            styles: {
              color: data.textColor || color,
              size: Number(data.fontSize || 10),
              weight: '600',
              backgroundColor: 'transparent'
            },
            ignoreEvent: true
          })
        }
        return figures
      }
    })

    registerOverlay({
      name: 'qdIndicatorLabel',
      totalStep: 1,
      lock: true,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      checkEventOn: () => false,
      createPointFigures: ({ coordinates, overlay }) => {
        if (!coordinates[0]) return []
        const data = overlay.extendData || {}
        const text = String(data.text || '')
        if (!text) return []
        const isDark = chartTheme.value === 'dark'
        const lowerText = text.toLowerCase()
        const color = data.color || (lowerText.includes('bull') ? '#12b76a' : (lowerText.includes('bear') ? '#f04438' : '#1677ff'))
        const isAbove = data.side === 'above' || data.side === 'sell'
        const fontSize = Number(data.fontSize || 10)
        const width = measureLayerText(text, fontSize, 38, 132)
        const height = fontSize + 9
        const x = coordinates[0].x
        const anchorRight = data.side === 'right' || lowerText.startsWith('regime')
        const rectX = anchorRight ? x + 8 : x - width / 2
        const y = coordinates[0].y + (isAbove ? -height - 7 : 7)
        return [
          {
            type: 'rect',
            attrs: { x: rectX, y, width, height, r: 5 },
            styles: {
              style: 'stroke_fill',
              color: data.fillColor
                ? resolveLayerColor(data.fillColor, color, isDark ? 0.20 : 0.12)
                : (isDark ? 'rgba(14, 18, 25, 0.76)' : 'rgba(255, 255, 255, 0.82)'),
              borderColor: data.borderColor ? resolveLayerColor(data.borderColor, color, 0.46) : withAlpha(color, 0.46),
              borderSize: 1
            },
            ignoreEvent: true
          },
          {
            type: 'text',
            attrs: { x: rectX + width / 2, y: y + height / 2, text, align: 'center', baseline: 'middle' },
            styles: {
              color: data.textColor || color,
              size: fontSize,
              weight: '700',
              backgroundColor: 'transparent'
            },
            ignoreEvent: true
          }
        ]
      }
    })

    const getMeasureOverlayTheme = () => {
      const isDark = chartTheme.value === 'dark'
      const accent = '#26a69a'
      return {
        point: {
          color: accent,
          borderColor: accent,
          borderSize: 2,
          radius: 4,
          activeColor: accent,
          activeBorderColor: accent,
          activeBorderSize: 2,
          activeRadius: 5
        },
        text: {
          color: isDark ? 'rgba(236, 240, 245, 0.92)' : 'rgba(38, 44, 52, 0.88)',
          backgroundColor: 'transparent',
          size: 11,
          weight: 'normal'
        },
        rect: {
          style: 'stroke_fill',
          color: isDark ? 'rgba(22, 26, 35, 0.94)' : 'rgba(255, 255, 255, 0.96)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          borderSize: 1,
          borderRadius: 6
        }
      }
    }

    const buildPriceRangeMeasureFigures = (startPoint, endPoint, coordinates) => {
      if (!startPoint || !endPoint || !coordinates[0] || !coordinates[1]) return []

      const startPrice = Number(startPoint.value)
      const endPrice = Number(endPoint.value)
      if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice)) return []

      const priceChange = endPrice - startPrice
      const percentChange = startPrice !== 0 ? (priceChange / startPrice) * 100 : 0

      const startTimestamp = startPoint.timestamp
      const endTimestamp = endPoint.timestamp
      const timeDiff = Math.abs(endTimestamp - startTimestamp)

      let timeSpan = ''
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

      if (days > 0) {
        timeSpan = `${days}${proxy.$t('dashboard.indicator.drawing.measureDayUnit')}${hours > 0 ? hours + proxy.$t('dashboard.indicator.drawing.measureHourUnit') : ''}`
      } else if (hours > 0) {
        timeSpan = `${hours}${proxy.$t('dashboard.indicator.drawing.measureHourUnit')}${minutes > 0 ? minutes + proxy.$t('dashboard.indicator.drawing.measureMinuteUnit') : ''}`
      } else if (minutes > 0) {
        timeSpan = `${minutes}${proxy.$t('dashboard.indicator.drawing.measureMinuteUnit')}`
      } else {
        timeSpan = `${seconds}${proxy.$t('dashboard.indicator.drawing.measureSecondUnit')}`
      }

      let barCount = 0
      if (Number.isFinite(startPoint.dataIndex) && Number.isFinite(endPoint.dataIndex)) {
        barCount = Math.abs(endPoint.dataIndex - startPoint.dataIndex)
      } else {
        try {
          const chartData = chartRef.value && typeof chartRef.value.getDataList === 'function'
            ? chartRef.value.getDataList()
            : null
          if (chartData && Array.isArray(chartData) && chartData.length > 0) {
            const startIndex = chartData.findIndex(item => Math.abs(item.timestamp - startTimestamp) < 1000)
            const endIndex = chartData.findIndex(item => Math.abs(item.timestamp - endTimestamp) < 1000)
            if (startIndex >= 0 && endIndex >= 0) {
              barCount = Math.abs(endIndex - startIndex)
            }
          }
        } catch (e) {}
      }

      const percentStr = percentChange >= 0
        ? `+${percentChange.toFixed(2)}%`
        : `${percentChange.toFixed(2)}%`
      const pp = pricePrecision.value
      const priceChangeStr = priceChange >= 0
        ? `+${priceChange.toFixed(pp)}`
        : `${priceChange.toFixed(pp)}`

      let metaText = ''
      if (barCount > 0) {
        metaText = `${barCount}${proxy.$t('dashboard.indicator.drawing.measureBarUnit')}`
        if (timeSpan) metaText += ` · ${timeSpan}`
      } else if (timeSpan) {
        metaText = timeSpan
      }

      const isUp = priceChange >= 0
      const isDark = chartTheme.value === 'dark'
      const accentColor = isUp ? '#26a69a' : '#ef5350'
      const accentSoft = isUp ? 'rgba(38, 166, 154, 0.55)' : 'rgba(239, 83, 80, 0.55)'
      const labelBg = isDark ? 'rgba(22, 26, 35, 0.94)' : 'rgba(255, 255, 255, 0.96)'
      const labelBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
      const labelText = isDark ? 'rgba(236, 240, 245, 0.92)' : 'rgba(38, 44, 52, 0.88)'
      const labelMuted = isDark ? 'rgba(180, 187, 198, 0.78)' : 'rgba(96, 105, 118, 0.82)'
      const dotFill = isDark ? '#161a23' : '#ffffff'

      const x1 = coordinates[0].x
      const y1 = coordinates[0].y
      const x2 = coordinates[1].x
      const y2 = coordinates[1].y
      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2
      const fontSize = 11
      const metaFontSize = 10
      const percentWidth = percentStr.length * 6.8 + 8
      const priceWidth = priceChangeStr.length * 6.5 + 8
      const metaWidth = metaText ? metaText.length * 5.8 + 10 : 0
      const boxWidth = percentWidth + priceWidth + metaWidth + (metaText ? 12 : 4)
      const boxHeight = metaText ? 34 : 24
      const boxX = midX - boxWidth / 2
      const boxY = midY - boxHeight - 14
      const row1Y = metaText ? boxY + 13 : boxY + boxHeight / 2
      const row2Y = boxY + 26
      const priceX = boxX + percentWidth + 2

      const figures = [
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: x1, y: y1 },
              { x: x2, y: y2 }
            ]
          },
          styles: {
            style: 'stroke',
            color: accentSoft,
            size: 1.5,
            dashedValue: [5, 4]
          },
          ignoreEvent: false
        },
        {
          type: 'circle',
          attrs: { x: x1, y: y1, r: 5 },
          styles: { style: 'stroke', color: accentColor, size: 2 },
          ignoreEvent: false
        },
        {
          type: 'circle',
          attrs: { x: x1, y: y1, r: 2.5 },
          styles: { style: 'fill', color: dotFill },
          ignoreEvent: false
        },
        {
          type: 'circle',
          attrs: { x: x2, y: y2, r: 5 },
          styles: { style: 'stroke', color: accentColor, size: 2 },
          ignoreEvent: false
        },
        {
          type: 'circle',
          attrs: { x: x2, y: y2, r: 2.5 },
          styles: { style: 'fill', color: dotFill },
          ignoreEvent: false
        },
        {
          type: 'rect',
          attrs: {
            x: boxX,
            y: boxY,
            width: boxWidth,
            height: boxHeight,
            r: 6
          },
          styles: {
            style: 'stroke_fill',
            color: labelBg,
            borderColor: labelBorder,
            borderSize: 1
          },
          ignoreEvent: false
        },
        {
          type: 'text',
          attrs: {
            x: boxX + 8,
            y: row1Y,
            text: percentStr,
            align: 'left',
            baseline: 'middle'
          },
          styles: {
            color: accentColor,
            size: fontSize,
            weight: 'bold',
            backgroundColor: 'transparent'
          },
          ignoreEvent: false
        },
        {
          type: 'text',
          attrs: {
            x: priceX,
            y: row1Y,
            text: priceChangeStr,
            align: 'left',
            baseline: 'middle'
          },
          styles: {
            color: labelText,
            size: fontSize,
            weight: 'normal',
            backgroundColor: 'transparent'
          },
          ignoreEvent: false
        }
      ]

      if (metaText) {
        figures.push({
          type: 'text',
          attrs: {
            x: boxX + 8,
            y: row2Y,
            text: metaText,
            align: 'left',
            baseline: 'middle'
          },
          styles: {
            color: labelMuted,
            size: metaFontSize,
            weight: 'normal',
            backgroundColor: 'transparent'
          },
          ignoreEvent: false
        })
      }

      return figures
    }

    registerOverlay({
      name: 'priceRangeMeasure',
      totalStep: 3,
      lock: false,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,

      createPointFigures: ({ coordinates, overlay }) => {
        const points = overlay.points || []
        return buildPriceRangeMeasureFigures(points[0], points[1], coordinates)
      }
    })

    const formatKlineData = (data) => {
      return data.map(item => {
        let timeValue = item.time || item.timestamp
        if (typeof timeValue === 'string') {
          timeValue = parseInt(timeValue)
        }
        if (timeValue < 1e10) {
          timeValue = timeValue * 1000
        }
        return {
          timestamp: timeValue,
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume || 0)
        }
      }).filter(item => item.timestamp && !isNaN(item.open) && !isNaN(item.high) && !isNaN(item.low) && !isNaN(item.close))
        .sort((a, b) => a.timestamp - b.timestamp)
    }

    const klineBarSnapshotKey = (b) => {
      if (!b) return ''
      const p = pricePrecision.value + 2
      const q = (x) => (Number(x) || 0).toFixed(p)
      return [q(b.open), q(b.high), q(b.low), q(b.close), q(b.volume)].join('|')
    }

    const flushRealtimeChartBar = (bar) => {
      if (!chartRef.value || typeof chartRef.value.updateData !== 'function') return
      try {
        chartRef.value.updateData(bar)
      } catch (e) {
        try {
          chartRef.value.applyNewData(klineData.value)
        } catch (_) {}
      }
    }

    const scheduleRealtimeChartBarUpdate = (bar) => {
      if (realtimeChartRafId != null) {
        cancelAnimationFrame(realtimeChartRafId)
      }
      realtimeChartRafId = requestAnimationFrame(() => {
        realtimeChartRafId = null
        flushRealtimeChartBar(bar)
      })
    }

    const appendRealtimeBarsToChart = (bars) => {
      if (!chartRef.value || !Array.isArray(bars) || bars.length === 0) return
      if (typeof chartRef.value.updateData === 'function') {
        bars.forEach(bar => {
          chartRef.value.updateData({
            timestamp: bar.timestamp,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: bar.volume != null ? bar.volume : 0
          })
        })
        return
      }
      try {
        chartRef.value.applyNewData(klineData.value)
      } catch (_) {}
    }

    const updatePricePanel = (data, options = {}) => {
      const force = !!(options && options.force)
      if (!data || data.length === 0) return
      const last = data[data.length - 1]
      let sig
      let payload
      if (data.length > 1) {
        const prev = data[data.length - 2]
        const price = formatPrice(last.close)
        const change = ((last.close - prev.close) / prev.close) * 100
        sig = `${price}|${change.toFixed(3)}`
        payload = { price, change }
      } else {
        const price = formatPrice(last.close)
        sig = `${price}|0`
        payload = { price, change: 0 }
      }
      if (!force && sig === lastPriceEmitSig.value) return
      lastPriceEmitSig.value = sig
      emit('price-change', payload)
    }

    const convertToInternalFormat = (data) => {
      return data.map(item => ({
        time: Math.floor(item.timestamp / 1000), // 转回秒级时间戳用于比较
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }))
    }

    const isSameTimeframe = (time1, time2, tf) => {
      const date1 = new Date(time1 * 1000)
      const date2 = new Date(time2 * 1000)

      switch (tf) {
        case '1m':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours() &&
                 date1.getMinutes() === date2.getMinutes()
        case '5m':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours() &&
                 Math.floor(date1.getMinutes() / 5) === Math.floor(date2.getMinutes() / 5)
        case '15m':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours() &&
                 Math.floor(date1.getMinutes() / 15) === Math.floor(date2.getMinutes() / 15)
        case '30m':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours() &&
                 Math.floor(date1.getMinutes() / 30) === Math.floor(date2.getMinutes() / 30)
        case '1H':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours()
        case '4H':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 Math.floor(date1.getHours() / 4) === Math.floor(date2.getHours() / 4)
        case '1D':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate()
        case '1W': {
          const week1 = Math.floor((date1.getTime() - new Date(date1.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
          const week2 = Math.floor((date2.getTime() - new Date(date2.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
          return date1.getFullYear() === date2.getFullYear() && week1 === week2
        }
        default:
          return time1 === time2
      }
    }

    const loadKlineData = async (silent = false) => {
      if (!props.symbol) return
      if (loading.value && !silent) return

      stopRealtime()
      clearBacktestOverlays()

      loading.value = true
      error.value = null

      try {
        let formattedData = []
        try {
          const response = await request({
            url: '/api/indicator/kline',
            method: 'get',
            params: {
              market: props.market,
              symbol: props.symbol,
              timeframe: props.timeframe,
              limit: 300
            },
            timeout: 45000
          })

          if (response.code === 1 && response.data && Array.isArray(response.data)) {
            formattedData = formatKlineData(response.data)
          } else {
            let errMsg = response.msg || 'Failed to load K-line data'
            if (response.hint === 'tiingo_subscription') {
              errMsg = proxy.$t('dashboard.indicator.error.tiingoSubscription') || 'Forex 1-minute data requires Tiingo paid subscription'
            }
            throw new Error(errMsg)
          }
        } catch (apiErr) {
          throw new Error(apiErr && apiErr.message ? apiErr.message : String(apiErr))
        }

        if (!formattedData || formattedData.length === 0) {
          throw new Error('No K-line data returned')
        }

        klineData.value = formattedData
        hasMoreHistory.value = true

        pricePrecision.value = calcPricePrecision(formattedData)

        const internalData = convertToInternalFormat(formattedData)
        updatePricePanel(internalData, { force: true })

        nextTick(() => {
          if (!chartRef.value) {
            initChart()
          } else {
            if (typeof chartRef.value.setPriceVolumePrecision === 'function') {
              chartRef.value.setPriceVolumePrecision(pricePrecision.value, 0)
            }

            const validData = klineData.value.filter(item =>
              item.timestamp &&
              !isNaN(item.open) &&
              !isNaN(item.high) &&
              !isNaN(item.low) &&
              !isNaN(item.close)
            )

            if (validData.length > 0 && chartRef.value) {
              chartRef.value.applyNewData(validData)

              setTimeout(() => {
                if (chartRef.value) {
                  updateIndicators()
                }
              }, 100)
            }
          }

          if (props.realtimeEnabled) {
            startRealtime()
          }

          if (formattedData.length < 200 && hasMoreHistory.value) {
            setTimeout(() => {
              if (klineData.value.length > 0 && klineData.value.length < 200 && hasMoreHistory.value) {
                loadMoreHistoryDataForScroll(klineData.value[0].timestamp)
              }
            }, 1500)
          }
        })
      } catch (err) {
        error.value = proxy.$t('dashboard.indicator.error.loadDataFailed') + ': ' + (err.message || proxy.$t('dashboard.indicator.error.loadDataFailedDesc'))
        klineData.value = []
        if (chartRef.value) {
          try {
            chartRef.value.applyNewData([])
          } catch (e) {
            // Best-effort cleanup after a failed load.
          }
        }
      } finally {
        loading.value = false
      }
    }

    const loadMoreHistoryDataForScroll = async (timestamp) => {
      if (!props.symbol || !klineData.value || klineData.value.length === 0) {
        return
      }

      if (loadingHistory.value || loadingHistoryPromise) {
        if (loadingHistoryPromise) {
          try {
            await loadingHistoryPromise
          } catch (e) {
          }
        }
        return
      }

      if (!hasMoreHistory.value) {
        if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
          chartRef.value.noMoreData()
        }
        return
      }

      loadingHistory.value = true
      loadingHistoryPromise = (async () => {
        await nextTick()

        try {
          const beforeTime = Math.floor(timestamp / 1000)
          const response = await request({
            url: '/api/indicator/kline',
            method: 'get',
            params: {
              market: props.market,
              symbol: props.symbol,
              timeframe: props.timeframe,
              limit: 300,
              before_time: beforeTime
            },
            timeout: 45000
          })

          if (response.code === 1 && response.data && Array.isArray(response.data)) {
            const newData = formatKlineData(response.data)

            if (newData.length === 0) {
              hasMoreHistory.value = false
              if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
                chartRef.value.noMoreData()
              }
              return
            }

            const filteredNewData = newData.filter(item => item.timestamp < timestamp)

            if (filteredNewData.length === 0) {
              hasMoreHistory.value = false
              if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
                chartRef.value.noMoreData()
              }
              return
            }

            let savedVisibleRange = null
            try {
              if (chartRef.value && typeof chartRef.value.getVisibleRange === 'function') {
                savedVisibleRange = chartRef.value.getVisibleRange()
              }
            } catch (e) {
            }

            const newDataCount = filteredNewData.length
            klineData.value = [...filteredNewData, ...klineData.value]

            nextTick(() => {
              if (chartRef.value) {
                chartRef.value.applyNewData(klineData.value)

                if (savedVisibleRange && typeof savedVisibleRange.from === 'number') {
                  const newFrom = savedVisibleRange.from + newDataCount
                  const newTo = savedVisibleRange.to + newDataCount

                  setTimeout(() => {
                    try {
                      if (chartRef.value) {
                        if (typeof chartRef.value.scrollToDataIndex === 'function') {
                          chartRef.value.scrollToDataIndex(newFrom)
                        } else if (typeof chartRef.value.setVisibleRange === 'function') {
                          chartRef.value.setVisibleRange(newFrom, newTo)
                        }
                      }
                    } catch (e) {
                    }
                  }, 50)
                }

                updateIndicators()
              }
            })
          } else if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
            chartRef.value.noMoreData()
          }
        } catch (err) {
          if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
            chartRef.value.noMoreData()
          }
        } finally {
          loadingHistory.value = false
          loadingHistoryPromise = null
        }
      })()

      try {
        await loadingHistoryPromise
      } catch (err) {
      }
    }

    const loadMoreHistoryData = async () => {
      if (!props.symbol || !klineData.value || klineData.value.length === 0) {
        return
      }

      if (loadingHistory.value || !hasMoreHistory.value) {
        return
      }

      loadingHistory.value = true

      try {
        const earliestTimestamp = klineData.value[0].timestamp
        const earliestTime = Math.floor(earliestTimestamp / 1000)
        const response = await request({
          url: '/api/indicator/kline',
          method: 'get',
          params: {
            market: props.market,
            symbol: props.symbol,
            timeframe: props.timeframe,
            limit: 300,
            before_time: earliestTime
          },
          timeout: 45000
        })

        if (response.code === 1 && response.data && Array.isArray(response.data)) {
          const newData = formatKlineData(response.data)

          if (newData.length === 0) {
            hasMoreHistory.value = false
            return
          }

          const filteredNewData = newData.filter(item => item.timestamp < earliestTimestamp)

          if (filteredNewData.length === 0) {
            hasMoreHistory.value = false
            return
          }

          klineData.value = [...filteredNewData, ...klineData.value]

          nextTick(() => {
            if (chartRef.value) {
              chartRef.value.applyNewData(klineData.value)
              updateIndicators()
            }
          })
        }
      } catch (err) {
        // Keep the current chart usable when older history fails.
      } finally {
        loadingHistory.value = false
      }
    }

    const updateKlineRealtime = async () => {
      if (!props.symbol || !klineData.value || klineData.value.length === 0) {
        return
      }
      if (realtimeFetchInFlight.value) {
        return
      }
      realtimeFetchInFlight.value = true

      try {
        const response = await request({
          url: '/api/indicator/kline',
          method: 'get',
          params: {
            market: props.market,
            symbol: props.symbol,
            timeframe: props.timeframe,
            limit: 3
          },
          timeout: 12000
        })

        if (response.code === 1 && response.data && Array.isArray(response.data) && response.data.length > 0) {
          const newData = formatKlineData(response.data)
          const existingData = [...klineData.value]

          if (newData.length > 0) {
            const lastNewTime = Math.floor(newData[newData.length - 1].timestamp / 1000)
            const lastExistingTime = Math.floor(existingData[existingData.length - 1].timestamp / 1000)

            if (isSameTimeframe(lastNewTime, lastExistingTime, props.timeframe)) {
              const existingLast = existingData[existingData.length - 1]
              const newLast = newData[newData.length - 1]

              const mergedLast = {
                timestamp: existingLast.timestamp,
                open: existingLast.open,
                high: Math.max(existingLast.high, newLast.high),
                low: Math.min(existingLast.low, newLast.low),
                close: newLast.close,
                volume: newLast.volume
              }
              if (klineBarSnapshotKey(mergedLast) === klineBarSnapshotKey(existingLast)) {
                return
              }
              existingData[existingData.length - 1] = mergedLast
              klineData.value = existingData

              const internalData = convertToInternalFormat(klineData.value)
              updatePricePanel(internalData)

              const last = existingData[existingData.length - 1]
              const bar = {
                timestamp: last.timestamp,
                open: last.open,
                high: last.high,
                low: last.low,
                close: last.close,
                volume: last.volume != null ? last.volume : 0
              }
              if (chartRef.value && typeof chartRef.value.updateData === 'function') {
                scheduleRealtimeChartBarUpdate(bar)
              } else if (chartRef.value) {
                try {
                  chartRef.value.applyNewData(klineData.value)
                } catch (_) {}
              }
            } else if (lastNewTime > lastExistingTime) {
              const uniqueNewData = newData.filter(newItem => {
                const newItemTime = Math.floor(newItem.timestamp / 1000)
                return !existingData.some(existingItem => {
                  const existingItemTime = Math.floor(existingItem.timestamp / 1000)
                  return isSameTimeframe(newItemTime, existingItemTime, props.timeframe)
                })
              })

              if (uniqueNewData.length > 0) {
                klineData.value = [...existingData, ...uniqueNewData]
                if (klineData.value.length > 500) {
                  klineData.value = klineData.value.slice(-500)
                }

                const internalData = convertToInternalFormat(klineData.value)
                updatePricePanel(internalData, { force: true })

                appendRealtimeBarsToChart(uniqueNewData)
                maybeUpdateIndicators(true)
              }
            }
          }
        }
      } catch (err) {
      } finally {
        realtimeFetchInFlight.value = false
      }
    }

    const startRestPolling = () => {
      if (realtimeTimer.value) {
        clearInterval(realtimeTimer.value)
      }
      const intervalMap = {
        '1m': 30000,
        '3m': 30000,
        '5m': 30000,
        '15m': 45000,
        '30m': 60000,
        '1H': 60000,
        '4H': 60000,
        '1D': 60000,
        '1W': 60000
      }
      const base = intervalMap[props.timeframe] || 30000
      realtimeInterval.value = Math.min(Math.max(base, 30000), 60000)

      if (props.realtimeEnabled && props.symbol && klineData.value.length > 0) {
        realtimeTimer.value = setInterval(() => {
          if (typeof document !== 'undefined' && document.hidden) return
          if (!loading.value && props.symbol && klineData.value && klineData.value.length > 0) {
            updateKlineRealtime()
          }
        }, realtimeInterval.value)
      }
    }

    const stopRestPolling = () => {
      if (realtimeTimer.value) {
        clearInterval(realtimeTimer.value)
        realtimeTimer.value = null
      }
    }

    let pendingWsBar = null
    let wsTickRafId = null

    const flushWsTick = () => {
      wsTickRafId = null
      if (!wsActive.value) { pendingWsBar = null; return }
      const bar = pendingWsBar
      if (!bar || !chartRef.value) return
      pendingWsBar = null
      scheduleRealtimeChartBarUpdate(bar)
    }

    const handleWsTick = (bar) => {
      if (!wsActive.value) return
      const arr = klineData.value
      if (!arr || arr.length === 0) return

      const lastBar = arr[arr.length - 1]

      if (bar.timestamp === lastBar.timestamp) {
        const newHigh = Math.max(lastBar.high, bar.high)
        const newLow = Math.min(lastBar.low, bar.low)
        if (lastBar.close === bar.close &&
            lastBar.high === newHigh &&
            lastBar.low === newLow &&
            lastBar.volume === bar.volume) {
          return // 数值无变化，跳过
        }
        const merged = {
          timestamp: lastBar.timestamp,
          open: lastBar.open,
          high: newHigh,
          low: newLow,
          close: bar.close,
          volume: bar.volume
        }
        arr[arr.length - 1] = merged
        klineData.value = arr.slice()

        updatePricePanelFromLastBars(arr)

        pendingWsBar = merged
        if (wsTickRafId == null) {
          wsTickRafId = requestAnimationFrame(flushWsTick)
        }
      } else if (bar.timestamp > lastBar.timestamp) {
        arr.push(bar)
        if (arr.length > 500) {
          arr.splice(0, arr.length - 500)
        }
        klineData.value = arr.slice()

        updatePricePanelFromLastBars(arr, true)

        appendRealtimeBarsToChart([bar])
        maybeUpdateIndicators(true)
      }
    }

    const handleWsNewBar = (_bar) => {
    }

    const updatePricePanelFromLastBars = (arr, force) => {
      if (!arr || arr.length === 0) return
      const last = arr[arr.length - 1]
      let payload, sig
      if (arr.length > 1) {
        const prev = arr[arr.length - 2]
        const price = formatPrice(last.close)
        const change = ((last.close - prev.close) / prev.close) * 100
        sig = `${price}|${change.toFixed(3)}`
        payload = { price, change }
      } else {
        const price = formatPrice(last.close)
        sig = `${price}|0`
        payload = { price, change: 0 }
      }
      if (!force && sig === lastPriceEmitSig.value) return
      lastPriceEmitSig.value = sig
      emit('price-change', payload)
    }

    const handleWsReconnecting = () => {
      startRestPolling()
    }

    const handleWsReconnected = () => {
      stopRestPolling()
    }

    const handleWsError = () => {
      wsActive.value = false
      startRestPolling()
    }

    const isCryptoMarket = () => {
      const m = (props.market || '').toLowerCase()
      return m === 'crypto' || m === '' || m === 'cryptocurrency'
    }

    const _fetchExchangeId = async () => {
      const now = Date.now()
      if (_cachedExchangeId && (now - _exchangeIdTs) < 300000) return _cachedExchangeId
      try {
        const res = await request({ url: '/api/settings/public-config', method: 'get' })
        if (res && res.data && res.data.ccxt_default_exchange) {
          _cachedExchangeId = res.data.ccxt_default_exchange
          _exchangeIdTs = now
        }
      } catch (_) { /* keep cached or null */ }
      return _cachedExchangeId || 'binance'
    }

    const startRealtime = async () => {
      stopRealtime()
      const gen = ++_realtimeGeneration

      if (!props.realtimeEnabled || !props.symbol || klineData.value.length === 0) return

      if (isCryptoMarket()) {
        try {
          const exchangeId = await _fetchExchangeId()
          if (gen !== _realtimeGeneration) return
          if (!wsClient) {
            wsClient = new ExchangeKlineWs()
          }
          wsClient.connect(props.symbol, props.timeframe, {
            onTick: handleWsTick,
            onNewBar: handleWsNewBar,
            onError: handleWsError,
            onReconnecting: handleWsReconnecting,
            onReconnected: handleWsReconnected
          }, exchangeId)
          wsActive.value = true
        } catch (_) {
          if (gen !== _realtimeGeneration) return
          wsActive.value = false
          startRestPolling()
        }
      } else {
        startRestPolling()
      }
    }

    const stopRealtime = () => {
      stopRestPolling()
      if (wsTickRafId != null) {
        cancelAnimationFrame(wsTickRafId)
        wsTickRafId = null
      }
      pendingWsBar = null
      if (wsClient) {
        wsClient.disconnect()
      }
      wsActive.value = false
    }

    const initChart = () => {
      const container = document.getElementById('kline-chart-container')
      if (!container) return

      if (container.clientWidth === 0 || container.clientHeight === 0) {
        let retryCount = 0
        const maxRetries = 10
        const checkAndInit = () => {
          const checkContainer = document.getElementById('kline-chart-container')
          if (checkContainer && checkContainer.clientWidth > 0 && checkContainer.clientHeight > 0) {
            initChart()
          } else if (retryCount < maxRetries) {
            retryCount++
            setTimeout(checkAndInit, 200)
          } else {
            initChart()
          }
        }
        setTimeout(checkAndInit, 200)
        return
      }

      if (chartRef.value) {
        try {
          clearBacktestOverlays()
          chartRef.value.destroy()
        } catch (e) {}
        chartRef.value = null
      }
      volPaneEnsured = false

      try {
        const container = document.getElementById('kline-chart-container')
        if (!container) {
          throw new Error('容器元素不存在')
        }

        try {
          chartRef.value = init(container, {
            drawingBarVisible: true, // 尝试启用内置画线工具栏
            overlay: {
              visible: true
            }
          })
        } catch (e) {
          chartRef.value = init(container)
        }

        if (chartRef.value && typeof chartRef.value.setDrawingBarVisible === 'function') {
          chartRef.value.setDrawingBarVisible(true)
        } else if (chartRef.value && typeof chartRef.value.setDrawingBar === 'function') {
          chartRef.value.setDrawingBar(true)
        } else if (chartRef.value && typeof chartRef.value.enableDrawing === 'function') {
          chartRef.value.enableDrawing(true)
        }

        if (!chartRef.value) {
          throw new Error('图表初始化失败：无法创建图表实例')
        }

        if (chartRef.value) {
          if (typeof chartRef.value.setDrawingBarVisible === 'function') {
            chartRef.value.setDrawingBarVisible(true)
          }
          if (typeof chartRef.value.setDrawingBar === 'function') {
            chartRef.value.setDrawingBar(true)
          }
          if (typeof chartRef.value.enableDrawing === 'function') {
            chartRef.value.enableDrawing(true)
          }
        }

        if (typeof chartRef.value.setPriceVolumePrecision === 'function') {
          chartRef.value.setPriceVolumePrecision(pricePrecision.value, 0)
        }

        updateChartTheme()
        nextTick(() => _ensureWmLayer())

        if (container && !shiftMeasurePointerDownHandler) {
          shiftMeasurePointerDownHandler = (e) => {
            if (e.button !== 0 || !e.shiftKey || !chartRef.value) return
            if (activeDrawingTool.value && activeDrawingTool.value !== 'measure') return
            if (activeDrawingTool.value === 'measure') return

            activeDrawingTool.value = 'measure'
            try {
              const overlayId = chartRef.value.createOverlay({
                name: 'priceRangeMeasure',
                lock: false,
                styles: getMeasureOverlayTheme()
              })
              if (overlayId) {
                addedDrawingOverlayIds.value.push(overlayId)
              }
            } catch (err) {}
          }
          container.addEventListener('pointerdown', shiftMeasurePointerDownHandler, true)
        }

        if (chartRef.value && typeof chartRef.value.subscribeAction === 'function') {
          chartRef.value.subscribeAction('onDataReady', () => {
            scheduleSyncVolumePaneLayout()
          })
        }

        if (chartRef.value && typeof chartRef.value.subscribeAction === 'function') {
          chartRef.value.subscribeAction('onOverlayCreated', (overlay) => {
            if (activeDrawingTool.value && overlay && overlay.id) {
              const toolMap = {
                line: 'segment',
                horizontalLine: 'horizontalStraightLine',
                verticalLine: 'verticalStraightLine',
                ray: 'rayLine',
                straightLine: 'straightLine',
                parallelStraightLine: 'parallelStraightLine',
                priceLine: 'priceLine',
                priceChannelLine: 'priceChannelLine',
                fibonacciLine: 'fibonacciLine',
                measure: 'priceRangeMeasure'
              }
              const expectedOverlayName = toolMap[activeDrawingTool.value]

              if (expectedOverlayName === 'priceRangeMeasure') {
                return
              }
              if (!overlay.name || overlay.name === expectedOverlayName) {
                addedDrawingOverlayIds.value.push(overlay.id)
                activeDrawingTool.value = null
                try {
                  if (typeof chartRef.value.overrideOverlay === 'function') {
                    chartRef.value.overrideOverlay(null)
                  }
                } catch (e) {
                }
              }
            }
          })

          if (typeof chartRef.value.subscribeAction === 'function') {
            try {
              chartRef.value.subscribeAction('onOverlayComplete', (overlay) => {
                if (activeDrawingTool.value && overlay && overlay.id) {
                  if (activeDrawingTool.value === 'measure') {
                    const points = overlay.points || []
                    if (points.length < 2 || !points[0] || !points[1]) {
                      return
                    }
                  }
                  addedDrawingOverlayIds.value.push(overlay.id)
                  activeDrawingTool.value = null
                }
              })
            } catch (e) {
            }
          }

          chartRef.value.subscribeAction('onOverlayRemoved', (overlayId) => {
            const index = addedDrawingOverlayIds.value.indexOf(overlayId)
            if (index > -1) {
              addedDrawingOverlayIds.value.splice(index, 1)
            }
          })
        }

        if (chartRef.value && typeof chartRef.value.subscribeAction === 'function') {
          let lastVisibleFrom = null
          let initialRangeProcessed = false

          chartRef.value.subscribeAction('onVisibleRangeChange', async (data) => {
            if (data && typeof data.from === 'number') {
              if (!initialRangeProcessed) {
                lastVisibleFrom = data.from
                initialRangeProcessed = true
                setTimeout(() => {
                  chartInitialized.value = true
                }, 1000)
                return
              }

              if (!chartInitialized.value) {
                lastVisibleFrom = data.from
                return
              }

              if (loadingHistory.value && data.from <= 0) {
                try {
                  if (chartRef.value && typeof chartRef.value.setVisibleRange === 'function') {
                    const dataLength = klineData.value.length
                    if (dataLength > 0) {
                      const currentRange = chartRef.value.getVisibleRange()
                      if (currentRange) {
                        const visibleCount = Math.ceil((currentRange.to - currentRange.from) * dataLength / 100)
                        const minFrom = 0.1
                        const newTo = Math.min(100, minFrom + (visibleCount / dataLength * 100))
                        chartRef.value.setVisibleRange(minFrom, newTo)
                      }
                    }
                  }
                } catch (e) {
                }
                return
              }

              if (data.from <= 5 && !loadingHistory.value && !loadingHistoryPromise && hasMoreHistory.value && chartInitialized.value) {
                const isScrollingLeft = lastVisibleFrom !== null && lastVisibleFrom > data.from
                const isAlreadyAtEdge = data.from <= 0
                if (isScrollingLeft || isAlreadyAtEdge) {
                  if (klineData.value.length > 0) {
                    const earliestTimestamp = klineData.value[0].timestamp
                    await loadMoreHistoryDataForScroll(earliestTimestamp)
                  }
                }
              }

              lastVisibleFrom = data.from
            }
          })
        }

        if (klineData.value && klineData.value.length > 0) {
          const validData = klineData.value.filter(item =>
            item.timestamp &&
            !isNaN(item.open) &&
            !isNaN(item.high) &&
            !isNaN(item.low) &&
            !isNaN(item.close)
          )

          if (validData.length > 0) {
            try {
              chartRef.value.applyNewData(validData)
            } catch (e) {
              try {
                chartRef.value.applyNewData(validData)
              } catch (e2) {
              }
            }

            nextTick(() => {
              updateIndicators()
            })
          }
        }

        window.addEventListener('resize', handleResize)
      } catch (error) {
        error.value = proxy.$t('dashboard.indicator.error.chartInitFailed') + ': ' + (error.message || '未知错误')
      }
    }

    const handleResize = () => {
      if (chartRef.value) {
        setTimeout(() => {
          if (chartRef.value) {
            chartRef.value.resize()
          }
        }, 100)
      } else {
        const container = document.getElementById('kline-chart-container')
        if (container && container.clientWidth > 0 && container.clientHeight > 0) {
          initChart()
        }
      }
    }

    const updateChartTheme = () => {
      if (!chartRef.value) return

      const theme = themeConfig.value
      const isDark = chartTheme.value === 'dark'

      chartRef.value.setStyles({
        grid: {
          show: true,
          horizontal: {
            show: true,
            color: theme.gridLineColor,
            style: 'dashed',
            size: 1
          },
          vertical: {
            show: true,
            color: isDark ? 'rgba(255, 255, 255, 0.045)' : 'rgba(17, 24, 39, 0.045)',
            style: 'solid',
            size: 1
          }
        },
        candle: {
          priceMark: {
            show: true,
            high: {
              show: true,
              color: theme.axisLabelColor
            },
            low: {
              show: true,
              color: theme.axisLabelColor
            }
          },
          tooltip: {
            showRule: 'always',
            showType: 'standard',
            labels: [
              proxy.$t('dashboard.indicator.tooltip.time'),
              proxy.$t('dashboard.indicator.tooltip.open'),
              proxy.$t('dashboard.indicator.tooltip.high'),
              proxy.$t('dashboard.indicator.tooltip.low'),
              proxy.$t('dashboard.indicator.tooltip.close'),
              proxy.$t('dashboard.indicator.tooltip.volume')
            ],
            values: (kLineData) => {
              const d = new Date(kLineData.timestamp)
              const p = pricePrecision.value
              return [
                `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`,
                kLineData.open.toFixed(p),
                kLineData.high.toFixed(p),
                kLineData.low.toFixed(p),
                kLineData.close.toFixed(p),
                kLineData.volume.toFixed(0)
              ]
            }
          },
          bar: {
            upColor: isDark ? '#0ecb81' : '#13c2c2',
            downColor: isDark ? '#f6465d' : '#fa541c',
            noChangeColor: theme.borderColor
          },
          area: {
            point: { animation: false, animationDuration: 0 }
          }
        },
        indicator: {
          tooltip: {
            showRule: 'always',
            showType: 'standard'
          }
        },
        xAxis: {
          show: true,
          axisLine: {
            show: true,
            color: theme.borderColor
          }
        },
        yAxis: {
          show: true,
          axisLine: {
            show: false
          }
        },
        crosshair: {
          show: true,
          horizontal: {
            show: true,
            line: {
              show: true,
              style: 'dashed',
              color: theme.gridLineColor,
              size: 1
            }
          },
          vertical: {
            show: true,
            line: {
              show: true,
              style: 'dashed',
              color: theme.gridLineColor,
              size: 1
            }
          }
        },
        watermark: {
          show: false
        },
        overlay: {
          point: {
            color: isDark ? '#6b7a8c' : '#94a0ad',
            borderColor: isDark ? '#6b7a8c' : '#94a0ad',
            borderSize: 2,
            radius: 4,
            activeColor: '#26a69a',
            activeBorderColor: '#26a69a',
            activeBorderSize: 2,
            activeRadius: 5
          },
          text: {
            color: isDark ? 'rgba(236, 240, 245, 0.9)' : 'rgba(38, 44, 52, 0.88)',
            backgroundColor: 'transparent',
            size: 11
          }
        }
      })
    }

    const registerCustomIndicator = (name, calcFunc, figures, calcParams = [], precision = -1, shouldOverlay = false) => {
      if (precision < 0) precision = pricePrecision.value
      try {
        const indicatorConfig = {
          name,
          shortName: name, // 添加 shortName
          calc: calcFunc,
          figures,
          calcParams,
          precision,
          series: shouldOverlay ? 'price' : 'normal'
        }

        registerIndicator(indicatorConfig)
        return true
      } catch (err) {
        if (err.message && err.message.includes('already registered')) {
          return true
        }
        return false
      }
    }

    const normalizeLayerTimestamp = (value, internalData, fallbackIndex = null) => {
      const raw = value == null ? fallbackIndex : value
      if (raw == null) return null
      const numeric = Number(raw)
      if (!Number.isFinite(numeric)) return null
      if (Number.isInteger(numeric) && numeric >= 0 && numeric < internalData.length) {
        const timeValue = internalData[numeric].timestamp || internalData[numeric].time || null
        if (timeValue == null) return null
        return timeValue < 1e10 ? timeValue * 1000 : timeValue
      }
      return numeric < 1e10 ? numeric * 1000 : numeric
    }

    const normalizeLayerPrice = (...values) => {
      for (const value of values) {
        const numeric = Number(value)
        if (Number.isFinite(numeric)) return numeric
      }
      return null
    }

    const pushLayerOverlay = (overlayConfig) => {
      if (!chartRef.value || typeof chartRef.value.createOverlay !== 'function') return
      try {
        const overlayId = chartRef.value.createOverlay(overlayConfig, 'candle_pane')
        if (overlayId) addedSignalOverlayIds.value.push(overlayId)
      } catch (e) {
      }
    }

    const renderIndicatorLayers = (layers, internalData) => {
      if (!Array.isArray(layers) || !layers.length || !internalData.length) return
      const lastIndex = internalData.length - 1

      layers.forEach(layer => {
        if (!layer || typeof layer !== 'object') return
        const type = String(layer.type || '').toLowerCase()

        if (['zone', 'box', 'rect', 'area'].includes(type)) {
          const startIndex = layer.startIndex ?? layer.fromIndex ?? layer.index ?? 0
          const endIndex = layer.endIndex ?? layer.toIndex ?? layer.end ?? lastIndex
          const start = normalizeLayerTimestamp(layer.start ?? layer.from ?? layer.x1, internalData, startIndex)
          const end = normalizeLayerTimestamp(layer.end ?? layer.to ?? layer.x2, internalData, endIndex)
          const top = normalizeLayerPrice(layer.top, layer.high, layer.y1, layer.price1)
          const bottom = normalizeLayerPrice(layer.bottom, layer.low, layer.y2, layer.price2)
          if (start == null || end == null || top == null || bottom == null) return
          pushLayerOverlay({
            name: 'qdIndicatorZone',
            points: [
              { timestamp: start, value: top },
              { timestamp: end, value: bottom }
            ],
            extendData: {
              text: layer.text || layer.name || '',
              color: layer.color,
              fillColor: layer.fillColor,
              borderColor: layer.borderColor,
              opacity: layer.opacity,
              dashed: layer.dashed,
              fontSize: layer.fontSize,
              textColor: layer.textColor
            },
            lock: true
          })
          return
        }

        if (['line', 'segment', 'level', 'ray'].includes(type)) {
          const startIndex = layer.startIndex ?? layer.fromIndex ?? layer.index ?? 0
          const endIndex = layer.endIndex ?? layer.toIndex ?? layer.end ?? lastIndex
          const start = normalizeLayerTimestamp(layer.start ?? layer.from ?? layer.x1, internalData, startIndex)
          const end = normalizeLayerTimestamp(layer.end ?? layer.to ?? layer.x2, internalData, endIndex)
          const y1 = normalizeLayerPrice(layer.y1, layer.price1, layer.price, layer.level)
          const y2 = normalizeLayerPrice(layer.y2, layer.price2, layer.price, layer.level)
          if (start == null || end == null || y1 == null || y2 == null) return
          pushLayerOverlay({
            name: 'qdIndicatorLine',
            points: [
              { timestamp: start, value: y1 },
              { timestamp: end, value: y2 }
            ],
            extendData: {
              text: layer.text || layer.name || '',
              color: layer.color,
              lineWidth: layer.lineWidth,
              dashed: layer.dashed,
              fontSize: layer.fontSize,
              textColor: layer.textColor
            },
            lock: true
          })
          return
        }

        if (['label', 'tag', 'note'].includes(type)) {
          const timestamp = normalizeLayerTimestamp(layer.timestamp ?? layer.time ?? layer.index, internalData, layer.index ?? lastIndex)
          const price = normalizeLayerPrice(layer.price, layer.value, layer.y)
          if (timestamp == null || price == null) return
          pushLayerOverlay({
            name: 'qdIndicatorLabel',
            points: [{ timestamp, value: price }],
            extendData: {
              text: layer.text || layer.name || '',
              color: layer.color,
              fillColor: layer.fillColor,
              borderColor: layer.borderColor,
              side: layer.side,
              fontSize: layer.fontSize,
              textColor: layer.textColor
            },
            lock: true
          })
        }
      })
    }

    const updateIndicators = async () => {
      if (indicatorsUpdating.value) {
        return
      }
      if (!chartRef.value || klineData.value.length === 0) {
        return
      }

      indicatorsUpdating.value = true
      try {
      try {
        if (addedSignalOverlayIds.value.length > 0 && chartRef.value) {
          addedSignalOverlayIds.value.forEach(overlayId => {
            try {
              if (typeof chartRef.value.removeOverlay === 'function') {
                chartRef.value.removeOverlay(overlayId)
              } else if (typeof chartRef.value.removeOverlayById === 'function') {
                chartRef.value.removeOverlayById(overlayId)
              }
            } catch (err) {
            }
          })
          addedSignalOverlayIds.value = []
        }
      } catch (e) {
      }

      try {
        if (addedIndicatorIds.value.length > 0) {
          addedIndicatorIds.value.forEach(info => {
            const name = typeof info === 'string' ? info : info.name
            const paneId = typeof info === 'string' ? undefined : info.paneId

            // KLineChart v9: removeIndicator(paneId, name)
            if (paneId) {
              chartRef.value.removeIndicator(paneId, name)
            } else {
              chartRef.value.removeIndicator('candle_pane', name)
              chartRef.value.removeIndicator(name)
            }
          })
          addedIndicatorIds.value = []
        }
      } catch (e) {
      }

      const internalData = convertToInternalFormat(klineData.value)
      const mainPaneOverlayFigures = []
      const mainPaneOverlayCalcEntries = []
      const mainPaneOverlaySignatureParts = []
      const addMainPaneOverlayEntry = ({ signature, figures, calc }) => {
        if (signature) {
          mainPaneOverlaySignatureParts.push(String(signature))
        }
        if (Array.isArray(figures) && figures.length) {
          mainPaneOverlayFigures.push(...figures)
        }
        if (typeof calc === 'function') {
          mainPaneOverlayCalcEntries.push(calc)
        }
      }

      for (let idx = 0; idx < props.activeIndicators.length; idx++) {
        const indicator = props.activeIndicators[idx]
        try {
          if (indicator && indicator.visible === false) {
            continue
          }
          if (indicator.type === 'python') {
            if (!indicator.code) continue

            try {
              if (indicator.calculate && typeof indicator.calculate === 'function') {
                const result = await indicator.calculate(internalData, resolvePythonIndicatorParams(indicator))

                let allPlots = []
                if (result && result.plots && Array.isArray(result.plots)) {
                  allPlots = [...result.plots]
                }
                renderIndicatorLayers(result && result.layers, internalData)

                if (result && result.signals && Array.isArray(result.signals)) {
                  for (const signal of result.signals) {
                    if (signal.data && Array.isArray(signal.data) && signal.data.length > 0) {
                      const sampleValues = []
                      for (let i = 0; i < Math.min(signal.data.length, 20); i++) {
                        const val = signal.data[i]
                        if (val !== null && val !== undefined && !isNaN(val)) {
                          if (sampleValues.length < 5) {
                            sampleValues.push({ index: i, value: val })
                          }
                        }
                      }

                      const signalPoints = []
                      for (let i = 0; i < signal.data.length && i < internalData.length; i++) {
                        const signalValue = signal.data[i]
                        if (signalValue !== null && signalValue !== undefined && !isNaN(signalValue)) {
                          const klineItem = internalData[i]
                          const timestamp = klineItem.timestamp || klineItem.time

                          const highPrice = klineItem.high
                          const lowPrice = klineItem.low

                          // Signal type: chart only displays indicator signals (buy/sell).
                          const signalTypeRaw = (signal.type || 'buy')
                          const signalType = String(signalTypeRaw).toLowerCase()
                          // Chart only displays indicator signals (no position mgmt / TP/SL / trailing etc).
                          const allowedSignalTypes = ['buy', 'sell']
                          if (!allowedSignalTypes.includes(signalType)) {
                            continue
                          }
                          // Buy-side labels are shown below candles; sell-side labels above candles.
                          const isBuySignal = signalType === 'buy'

                          // Text: prefer per-point textData, otherwise use signal.text, otherwise fallback to B/S.
                          let pointText = signal.text || (isBuySignal ? 'B' : 'S')
                          if (signal.textData && signal.textData[i] != null) {
                            pointText = signal.textData[i]
                          }

                          signalPoints.push({
                            timestamp,
                            price: signalValue,
                            anchorPrice: isBuySignal ? lowPrice : highPrice,
                            // side is used for layout/styling; action preserves the original type (buy/sell).
                            side: isBuySignal ? 'buy' : 'sell',
                            action: signalType,
                            color: signal.color || (isBuySignal ? '#00E676' : '#FF5252'),
                            text: pointText
                          })
                        }
                      }

                      if (signalPoints.length > 0 && chartRef.value) {
                        for (const point of signalPoints) {
                          try {
                            let timestamp = point.timestamp
                            if (timestamp < 1e10) {
                              timestamp = timestamp * 1000
                            }

                            const displaySimpleText = point.text

                            if (typeof chartRef.value.createOverlay === 'function') {
                              const overlayId = chartRef.value.createOverlay({
                                name: 'signalTag',
                                points: [
                                  { timestamp: timestamp, value: point.price },
                                  { timestamp: timestamp, value: point.anchorPrice }
                                ],
                                extendData: {
                                  text: displaySimpleText,
                                  color: point.color,
                                  side: point.side,
                                  action: point.action,
                                  price: point.price
                                },
                                lock: true // 锁定防止拖动
                              }, 'candle_pane') // 绘制在主图

                              if (overlayId) {
                                addedSignalOverlayIds.value.push(overlayId)
                              }
                            }
                          } catch (overlayErr) {
                            // Drawing overlays are best-effort; one failed marker should not break the chart.
                          }
                        }
                      }
                    }
                  }
                }

                if (allPlots.length > 0) {
                  const validPlots = allPlots.filter(plot => plot.data && Array.isArray(plot.data) && plot.data.length > 0)

                  if (validPlots.length > 0) {
                    const figures = []
                    const plotDataMap = {}

                    for (let plotIdx = 0; plotIdx < validPlots.length; plotIdx++) {
                      const plot = validPlots[plotIdx]
                      const plotName = plot.name || `PLOT_${plotIdx}_${idx}`
                      const figureKey = plotName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_')
                      const plotColor = plot.color || getIndicatorColor(plotIdx)

                      const figureType = plot.type || 'line'

                      figures.push({
                        key: figureKey,
                        title: plot.name || plotName,
                        type: figureType,
                        color: plotColor
                      })

                      plotDataMap[figureKey] = plot.data
                    }

                    const allOverlay = validPlots.every(plot => plot.overlay !== false)
                    const pyNameKey = String(indicator.instanceId || indicator.id || `py_${idx}`).replace(/[^a-zA-Z0-9_-]/g, '_')
                    let customIndicatorName = `${pyNameKey}_combined`
                    if (result && result.name) {
                      customIndicatorName = `${pyNameKey}_${String(result.name)}`
                    }
                    try {
                      const registered = registerCustomIndicator(
                        customIndicatorName,
                        (kLineDataList) => {
                          const result = []
                          for (let i = 0; i < kLineDataList.length; i++) {
                            const dataPoint = {}
                            for (const figureKey in plotDataMap) {
                              const plotData = plotDataMap[figureKey]
                              dataPoint[figureKey] = i < plotData.length ? plotData[i] : null
                            }
                            result.push(dataPoint)
                          }
                          return result
                        },
                        figures,
                        [],
                        2,
                        allOverlay
                      )

                      if (registered) {
                        if (allOverlay) {
                          const paneId = chartRef.value.createIndicator(
                            customIndicatorName,
                            false,
                            { id: 'candle_pane' }
                          )
                          if (paneId) {
                            addedIndicatorIds.value.push({ paneId, name: customIndicatorName })
                          } else {
                            addedIndicatorIds.value.push({ paneId: 'candle_pane', name: customIndicatorName })
                          }
                        } else {
                          const indicatorId = chartRef.value.createIndicator(
                            customIndicatorName,
                            false,
                            { height: 100, dragEnabled: true }
                          )
                          if (indicatorId) {
                            addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                          }
                        }
                      }
                    } catch (plotErr) {
                    }
                  }
                }
              } else {
                const decryptInfo = {
                  id: indicator.originalId || indicator.id, // 优先使用原始数据库ID
                  user_id: indicator.user_id || indicator.userId,
                  is_encrypted: indicator.is_encrypted || indicator.isEncrypted || 0
                }
                const pythonResult = await executePythonStrategy(
                  indicator.code,
                  internalData,
                  resolvePythonIndicatorParams(indicator),
                  decryptInfo // 传递解密信息
                )

                let allPlots = []
                if (pythonResult && pythonResult.plots && Array.isArray(pythonResult.plots)) {
                  allPlots = [...pythonResult.plots]
                }
                renderIndicatorLayers(pythonResult && pythonResult.layers, internalData)

                if (pythonResult && pythonResult.signals && Array.isArray(pythonResult.signals)) {
                  for (const signal of pythonResult.signals) {
                    if (signal.data && Array.isArray(signal.data) && signal.data.length > 0) {
                      const sampleValues = []
                      for (let i = 0; i < Math.min(signal.data.length, 20); i++) {
                        const val = signal.data[i]
                        if (val !== null && val !== undefined && !isNaN(val)) {
                          if (sampleValues.length < 5) {
                            sampleValues.push({ index: i, value: val })
                          }
                        }
                      }

                      const signalPoints = []
                      for (let i = 0; i < signal.data.length && i < internalData.length; i++) {
                        const signalValue = signal.data[i]
                        if (signalValue !== null && signalValue !== undefined && !isNaN(signalValue)) {
                          const klineItem = internalData[i]
                          const timestamp = klineItem.timestamp || klineItem.time

                          const highPrice = klineItem.high
                          const lowPrice = klineItem.low

                          // Signal type: chart only displays indicator signals (buy/sell).
                          const signalTypeRaw = (signal.type || 'buy')
                          const signalType = String(signalTypeRaw).toLowerCase()
                          // Chart only displays indicator signals (no position mgmt / TP/SL / trailing etc).
                          const allowedSignalTypes = ['buy', 'sell']
                          if (!allowedSignalTypes.includes(signalType)) {
                            continue
                          }
                          const isBuySignal = signalType === 'buy'

                          // Text: prefer per-point textData, otherwise use signal.text, otherwise fallback to B/S.
                          let pointText = signal.text || (isBuySignal ? 'B' : 'S')
                          if (signal.textData && signal.textData[i] != null) {
                            pointText = signal.textData[i]
                          }

                          signalPoints.push({
                            timestamp,
                            price: signalValue,
                            anchorPrice: isBuySignal ? lowPrice : highPrice,
                            side: isBuySignal ? 'buy' : 'sell',
                            action: signalType,
                            color: signal.color || (isBuySignal ? '#00E676' : '#FF5252'),
                            text: pointText
                          })
                        }
                      }

                      if (signalPoints.length > 0 && chartRef.value) {
                        for (const point of signalPoints) {
                          try {
                            let timestamp = point.timestamp
                            if (timestamp < 1e10) {
                              timestamp = timestamp * 1000
                            }

                            const displaySimpleText = point.text

                            if (typeof chartRef.value.createOverlay === 'function') {
                              const overlayId = chartRef.value.createOverlay({
                                name: 'signalTag',
                                points: [
                                  { timestamp: timestamp, value: point.price },
                                  { timestamp: timestamp, value: point.anchorPrice }
                                ],
                                extendData: {
                                  text: displaySimpleText,
                                  color: point.color,
                                  side: point.side,
                                  action: point.action,
                                  price: point.price
                                },
                                lock: true // 锁定防止拖动
                              }, 'candle_pane') // 绘制在主图

                              if (overlayId) {
                                addedSignalOverlayIds.value.push(overlayId)
                              }
                            }
                          } catch (overlayErr) {
                            // Drawing overlays are best-effort; one failed marker should not break the chart.
                          }
                        }
                      }
                    }
                  }
                }

                if (allPlots.length > 0) {
                  const validPlots = allPlots.filter(plot => plot.data && Array.isArray(plot.data) && plot.data.length > 0)

                  if (validPlots.length > 0) {
                    const figures = []
                    const plotDataMap = {}

                    for (let plotIdx = 0; plotIdx < validPlots.length; plotIdx++) {
                      const plot = validPlots[plotIdx]
                      const plotName = plot.name || `PLOT_${plotIdx}`
                      const figureKey = plotName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_')
                      const plotColor = plot.color || getIndicatorColor(plotIdx)

                      const figureType = plot.type || 'line'

                      figures.push({
                        key: figureKey,
                        title: plot.name || plotName,
                        type: figureType,
                        color: plotColor
                      })

                      plotDataMap[figureKey] = plot.data
                    }

                    const allOverlay = validPlots.every(plot => plot.overlay !== false)
                    const pyNameKey2 = String(indicator.instanceId || indicator.id || `py_${idx}`).replace(/[^a-zA-Z0-9_-]/g, '_')
                    let customIndicatorName = `${pyNameKey2}_combined`
                    if (pythonResult && pythonResult.name) {
                      customIndicatorName = `${pyNameKey2}_${String(pythonResult.name)}`
                    }

                    try {
                      if (allOverlay) {
                        addMainPaneOverlayEntry({
                          signature: `${customIndicatorName}_${idx}`,
                          figures,
                          calc: () => {
                            const result = []
                            for (let i = 0; i < internalData.length; i++) {
                              const dataPoint = {}
                              for (const figureKey in plotDataMap) {
                                const plotData = plotDataMap[figureKey]
                                dataPoint[figureKey] = i < plotData.length ? plotData[i] : null
                              }
                              result.push(dataPoint)
                            }
                            return result
                          }
                        })
                      } else {
                        const registered = registerCustomIndicator(
                          customIndicatorName,
                          (kLineDataList) => {
                            const result = []
                            for (let i = 0; i < kLineDataList.length; i++) {
                              const dataPoint = {}
                              for (const figureKey in plotDataMap) {
                                const plotData = plotDataMap[figureKey]
                                dataPoint[figureKey] = i < plotData.length ? plotData[i] : null
                              }
                              result.push(dataPoint)
                            }
                            return result
                          },
                          figures,
                          [],
                          2,
                          false
                        )

                        if (registered) {
                          const indicatorId = chartRef.value.createIndicator(
                            customIndicatorName,
                            false,
                            { height: 100, dragEnabled: true }
                          )
                          if (indicatorId) {
                            addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                          }
                        }
                      }
                    } catch (plotErr) {
                    }
                  }
                }
              }
            } catch (err) {
            }
            continue
          }

          const indicatorStyle = normalizeIndicatorStyle(indicator.style || {}, getIndicatorColor(idx))
          const color = indicatorStyle.color
          const lineWidth = indicatorStyle.lineWidth
          const indicatorInstanceKey = String(indicator.instanceId || `${indicator.id}_${idx}`).replace(/[^a-zA-Z0-9_]/g, '_')
          const buildUniqueIndicatorName = (baseName) => `${baseName}_${indicatorInstanceKey}`
          const buildLineFigure = (key, title, figureColor = color, width = lineWidth) => ({
            key,
            title,
            type: 'line',
            color: figureColor,
            styles: () => ({
              color: figureColor,
              size: width,
              style: 'solid'
            })
          })
          const buildBarFigure = (key, title, {
            baseValue = 0,
            upColor = '#ef5350',
            downColor = '#26a69a'
          } = {}) => ({
            key,
            title,
            type: 'bar',
            baseValue,
            styles: (data) => {
              const value = data?.current?.indicatorData?.[key]
              if (value == null || Number.isNaN(Number(value))) {
                return { color: upColor, borderColor: upColor }
              }
              const barColor = Number(value) >= 0 ? upColor : downColor
              return { color: barColor, borderColor: barColor }
            }
          })

          if (indicator.id === 'sma' || indicator.id === 'ema') {
            const maType = indicator.id === 'sma' ? 'SMA' : 'EMA'
            const period = indicator.params?.length || indicator.params?.period || 20
            const figureKey = maType.toLowerCase()
            const calcPeriod = period

            try {
              addMainPaneOverlayEntry({
                signature: buildUniqueIndicatorName(`${maType}_${period}`),
                figures: [buildLineFigure(`${figureKey}_${indicatorInstanceKey}`, `${maType}(${period})`, color, lineWidth)],
                calc: (kLineDataList) => {
                  const p = calcPeriod
                  const values = maType === 'SMA'
                    ? calculateSMA(kLineDataList, p)
                    : calculateEMA(kLineDataList, p)
                  return values.map(v => ({ [`${figureKey}_${indicatorInstanceKey}`]: v }))
                }
              })
            } catch (err) {
            }
          } else if (indicator.id === 'macd') {
            const fast = indicator.params?.fast || 12
            const slow = indicator.params?.slow || 26
            const signal = indicator.params?.signal || 9
            const customIndicatorName = buildUniqueIndicatorName(`MACD_${fast}_${slow}_${signal}`)
            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const fast = indicator.calcParams[0] || 12
                  const slow = indicator.calcParams[1] || 26
                  const signal = indicator.calcParams[2] || 9
                  const macdValues = calculateMACD(kLineDataList, fast, slow, signal)
                  return macdValues.macd.map((value, i) => ({
                    macd: value,
                    signal: macdValues.signal[i],
                    histogram: macdValues.histogram[i]
                  }))
                },
                [
                  buildLineFigure('macd', `MACD(${fast},${slow})`, color, lineWidth),
                  buildLineFigure('signal', `SIGNAL(${signal})`, '#fa8c16', lineWidth),
                  buildBarFigure('histogram', 'HIST')
                ],
                [fast, slow, signal]
              )
              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'rsi') {
            const length = indicator.params?.length || 14
            const customIndicatorName = buildUniqueIndicatorName(`RSI_${length}`)
            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 14
                  const rsiValues = calculateRSI(kLineDataList, length)
                  return rsiValues.map(value => ({ rsi: value }))
                },
                [buildLineFigure('rsi', `RSI(${length})`, color, lineWidth)],
                [length]
              )
              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'bollinger_bands' || indicator.id === 'bb') {
            const length = indicator.params?.length || 20
            const mult = indicator.params?.mult || 2

            try {
              addMainPaneOverlayEntry({
                signature: buildUniqueIndicatorName(`BOLL_${length}_${mult}`),
                figures: [
                  buildLineFigure(`upper_${indicatorInstanceKey}`, `上轨(${length},${mult})`, color, lineWidth),
                  buildLineFigure(`middle_${indicatorInstanceKey}`, `中轨(${length})`, '#8c8c8c', lineWidth),
                  buildLineFigure(`lower_${indicatorInstanceKey}`, `下轨(${length},${mult})`, color, lineWidth)
                ],
                calc: (kLineDataList) => {
                  const currentLength = length
                  const currentMult = mult
                  const bbResult = calculateBollingerBands(kLineDataList, currentLength, currentMult)
                  const result = []
                  for (let i = 0; i < bbResult.length; i++) {
                    result.push({
                      [`upper_${indicatorInstanceKey}`]: bbResult[i]?.upper ?? null,
                      [`middle_${indicatorInstanceKey}`]: bbResult[i]?.middle ?? null,
                      [`lower_${indicatorInstanceKey}`]: bbResult[i]?.lower ?? null
                    })
                  }
                  return result
                }
              })
            } catch (err) {
            }
          } else if (indicator.id === 'atr') {
            const period = indicator.params?.period || indicator.params?.length || 14
            const customIndicatorName = buildUniqueIndicatorName(`ATR_${period}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const period = indicator.calcParams[0] || 14
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const atrValues = calculateATR(data, period)
                  return atrValues.map(value => ({ atr: value }))
                },
                [buildLineFigure('atr', `ATR(${period})`, color, lineWidth)],
                [period]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'williams' || indicator.id === 'williams_r') {
            const length = indicator.params?.length || 14
            const customIndicatorName = buildUniqueIndicatorName(`WPR_${length}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 14
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const wrValues = calculateWilliamsR(data, length)
                  return wrValues.map(value => ({ wr: value }))
                },
                [buildLineFigure('wr', `W%R(${length})`, color, lineWidth)],
                [length]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'mfi') {
            const length = indicator.params?.length || 14
            const customIndicatorName = buildUniqueIndicatorName(`MFI_${length}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 14
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume
                  }))
                  const mfiValues = calculateMFI(data, length)
                  return mfiValues.map(value => ({ mfi: value }))
                },
                [buildLineFigure('mfi', `MFI(${length})`, color, lineWidth)],
                [length]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'cci') {
            const length = indicator.params?.length || 20
            const customIndicatorName = buildUniqueIndicatorName(`CCI_${length}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 20
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const cciValues = calculateCCI(data, length)
                  return cciValues.map(value => ({ cci: value }))
                },
                [buildLineFigure('cci', `CCI(${length})`, color, lineWidth)],
                [length]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'adx') {
            const length = indicator.params?.length || 14
            const customIndicatorName = buildUniqueIndicatorName(`ADX_${length}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 14
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const result = calculateADX(data, length)
                  return result.adx.map(value => ({ adx: value }))
                },
                [buildLineFigure('adx', `ADX(${length})`, color, lineWidth)],
                [length]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'obv') {
            const customIndicatorName = buildUniqueIndicatorName('OBV')

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const data = kLineDataList.map(d => ({
                    close: d.close,
                    volume: d.volume || 0
                  }))
                  const obvValues = calculateOBV(data)
                  return obvValues.map(value => ({ obv: value }))
                },
                [buildLineFigure('obv', 'OBV', color, lineWidth)],
                []
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'adosc') {
            const fast = indicator.params?.fast || 3
            const slow = indicator.params?.slow || 10
            const customIndicatorName = buildUniqueIndicatorName(`ADOSC_${fast}_${slow}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const fast = indicator.calcParams[0] || 3
                  const slow = indicator.calcParams[1] || 10
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume || 0
                  }))
                  const adoscValues = calculateADOSC(data, fast, slow)
                  return adoscValues.map(value => ({ adosc: value }))
                },
                [buildLineFigure('adosc', `ADOSC(${fast},${slow})`, color, lineWidth)],
                [fast, slow]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'ad') {
            const customIndicatorName = buildUniqueIndicatorName('AD')

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume || 0
                  }))
                  const adValues = calculateAD(data)
                  return adValues.map(value => ({ ad: value }))
                },
                [buildLineFigure('ad', 'AD', color, lineWidth)],
                []
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'kdj') {
            const period = indicator.params?.period || 9
            const kPeriod = indicator.params?.k || 3
            const dPeriod = indicator.params?.d || 3
            const customIndicatorName = buildUniqueIndicatorName(`KDJ_${period}_${kPeriod}_${dPeriod}`)

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const period = indicator.calcParams[0] || 9
                  const kPeriod = indicator.calcParams[1] || 3
                  const dPeriod = indicator.calcParams[2] || 3
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const result = calculateKDJ(data, period, kPeriod, dPeriod)
                  return result.k.map((k, i) => ({
                    k: k,
                    d: result.d[i],
                    j: result.j[i]
                  }))
                },
                [
                  buildLineFigure('k', `K(${period},${kPeriod})`, color, lineWidth),
                  buildLineFigure('d', `D(${dPeriod})`, '#4ECDC4', lineWidth),
                  buildLineFigure('j', 'J', '#95E1D3', lineWidth)
                ],
                [period, kPeriod, dPeriod]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else {
            try {
              const indicatorName = indicator.id.toUpperCase()
              const indicatorId = chartRef.value.createIndicator(indicatorName, false, { height: 100, dragEnabled: true })
              if (indicatorId) {
                addedIndicatorIds.value.push({ paneId: indicatorId, name: indicatorName })
              }
            } catch (err) {
            }
          }
        } catch (e) {
        }
      }
      if (mainPaneOverlayFigures.length > 0) {
        try {
          const combinedName = `QD_MAIN_OVERLAY_${mainPaneOverlaySignatureParts.join('_').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 120)}`
          const registered = registerCustomIndicator(
            combinedName,
            (kLineDataList) => {
              const mergedResults = Array.from({ length: kLineDataList.length }, () => ({}))
              mainPaneOverlayCalcEntries.forEach(calc => {
                const partial = calc(kLineDataList) || []
                for (let i = 0; i < mergedResults.length; i++) {
                  if (partial[i] && typeof partial[i] === 'object') {
                    Object.assign(mergedResults[i], partial[i])
                  }
                }
              })
              return mergedResults
            },
            mainPaneOverlayFigures,
            [],
            -1,
            true
          )
          if (registered) {
            const paneId = chartRef.value.createIndicator(combinedName, true, { id: 'candle_pane' })
            if (paneId) {
              addedIndicatorIds.value.push({ paneId, name: combinedName })
            } else {
              addedIndicatorIds.value.push({ paneId: 'candle_pane', name: combinedName })
            }
          }
        } catch (e) {
        }
      }
      } finally {
        indicatorsUpdating.value = false
        emit('indicators-updated')
      }
    }

    const getChartInstance = () => chartRef.value || null

    const clearBacktestOverlays = () => {
      const inst = chartRef.value
      if (!inst) {
        addedBacktestOverlayIds.value = []
        return
      }
      addedBacktestOverlayIds.value.forEach(id => {
        try {
          if (typeof inst.removeOverlay === 'function') inst.removeOverlay(id)
        } catch (_) {}
      })
      addedBacktestOverlayIds.value = []
    }

    const addBacktestOverlay = (overlayConfig) => {
      const inst = chartRef.value
      if (!inst || typeof inst.createOverlay !== 'function') return null
      try {
        const overlayId = inst.createOverlay(overlayConfig, 'candle_pane')
        if (overlayId) addedBacktestOverlayIds.value.push(overlayId)
        return overlayId
      } catch (_) {
        return null
      }
    }

    const handleRetry = () => {
      loadKlineData()
    }

    watch(() => props.symbol, () => {
      if (props.symbol) {
        loadKlineData()
      }
    })
    watch(() => props.theme, (newTheme) => {
      chartTheme.value = newTheme
      if (chartRef.value) {
        updateChartTheme()
        updateIndicators()
      }
      nextTick(() => _ensureWmLayer())
    })

    watch(() => props.market, () => {
      if (props.symbol) {
        loadKlineData()
      }
    })

    watch(() => props.timeframe, () => {
      if (props.symbol) {
        loadKlineData()
      }
    })

    watch(() => props.activeIndicators, (newVal, oldVal) => {
      if (chartRef.value && klineData.value.length > 0) {
        nextTick(() => {
          if (chartRef.value) {
            updateIndicators()
          }
        })
      }
      if (indicatorEditorVisible.value && indicatorEditorTargetId.value) {
        const current = (newVal || []).find(item => item && (item.instanceId || item.id) === indicatorEditorTargetId.value)
        if (!current) {
          closeIndicatorEditor()
        }
      }
    }, { deep: true })

    watch(() => props.realtimeEnabled, (newVal) => {
      if (newVal) {
        startRealtime()
      } else {
        stopRealtime()
      }
    })

    onMounted(async () => {
      await nextTick()
      if (props.theme && (props.theme === 'dark' || props.theme === 'light')) {
        chartTheme.value = props.theme
      }

      prewarmPyodide()

      nextTick(() => {
        setTimeout(() => {
          if (!chartRef.value && props.symbol) {
            initChart()
          }
        }, 300)
      })

      nextTick(() => {
        const el = document.getElementById('kline-chart-container')
        if (!el || typeof ResizeObserver === 'undefined') return
        chartResizeObserver = new ResizeObserver(() => {
          if (chartResizeRafId != null) cancelAnimationFrame(chartResizeRafId)
          chartResizeRafId = requestAnimationFrame(() => {
            chartResizeRafId = null
            if (chartRef.value && typeof chartRef.value.resize === 'function') {
              chartRef.value.resize()
              scheduleSyncVolumePaneLayout()
            } else {
              const c = document.getElementById('kline-chart-container')
              if (c && c.clientWidth > 0 && c.clientHeight > 0) {
                initChart()
              }
            }
            _ensureWmLayer()
          })
        })
        chartResizeObserver.observe(el)
      })

      nextTick(() => {
        _ensureWmLayer()
        _startWmGuard()
      })
    })

    // ── Watermark (multi-layer, tamper-resistant) ──
    const _wmText = [81, 117, 97, 110, 116, 68, 105, 110, 103, 101, 114].map(c => String.fromCharCode(c)).join('')
    const _wmSub = [113, 117, 97, 110, 116, 100, 105, 110, 103, 101, 114, 46, 99, 111, 109].map(c => String.fromCharCode(c)).join('')

    const _paintWmCanvas = () => {
      const cvs = wmCanvasRef.value
      if (!cvs) return
      const parent = cvs.parentElement
      if (!parent) return
      const w = parent.clientWidth
      const h = parent.clientHeight
      if (w === 0 || h === 0) return
      const dpr = window.devicePixelRatio || 1
      cvs.width = w * dpr
      cvs.height = h * dpr
      cvs.style.width = w + 'px'
      cvs.style.height = h + 'px'
      const ctx = cvs.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, cvs.width, cvs.height)
      ctx.save()
      ctx.scale(dpr, dpr)
      const isDark = chartTheme.value === 'dark'
      // main brand
      ctx.font = 'bold 18px "Segoe UI", Helvetica, Arial, sans-serif'
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
      ctx.textBaseline = 'bottom'
      ctx.fillText(_wmText, 12, h - 24)
      // sub domain
      ctx.font = '11px "Segoe UI", Helvetica, Arial, sans-serif'
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.045)'
      ctx.fillText(_wmSub, 12, h - 10)
      // tiled repeat across chart
      ctx.font = '13px "Segoe UI", Helvetica, Arial, sans-serif'
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.022)'
      ctx.save()
      ctx.rotate(-0.35)
      for (let y = 0; y < h + 200; y += 140) {
        for (let x = -200; x < w + 200; x += 260) {
          ctx.fillText(_wmText, x, y)
        }
      }
      ctx.restore()
      ctx.restore()
    }

    const _ensureWmLayer = () => {
      const cvs = wmCanvasRef.value
      if (!cvs) return
      // force visibility
      cvs.style.display = 'block'
      cvs.style.opacity = '1'
      cvs.style.visibility = 'visible'
      cvs.style.pointerEvents = 'none'
      _paintWmCanvas()
    }

    const _startWmGuard = () => {
      if (_wmTimer) clearInterval(_wmTimer)
      _wmTimer = setInterval(_ensureWmLayer, 3000)

      if (typeof MutationObserver !== 'undefined' && wmCanvasRef.value) {
        if (_wmObserver) _wmObserver.disconnect()
        _wmObserver = new MutationObserver(() => { _ensureWmLayer() })
        _wmObserver.observe(wmCanvasRef.value, { attributes: true, attributeFilter: ['style', 'class'] })
        const parent = wmCanvasRef.value.parentElement
        if (parent) {
          _wmObserver.observe(parent, { childList: true })
        }
      }
    }

    onBeforeUnmount(() => {
      stopRealtime()
      wsClient = null
      if (realtimeChartRafId != null) {
        cancelAnimationFrame(realtimeChartRafId)
        realtimeChartRafId = null
      }
      if (chartResizeRafId != null) {
        cancelAnimationFrame(chartResizeRafId)
        chartResizeRafId = null
      }
      if (volEnsureRafId != null) {
        cancelAnimationFrame(volEnsureRafId)
        volEnsureRafId = null
      }
      if (chartResizeObserver) {
        chartResizeObserver.disconnect()
        chartResizeObserver = null
      }
      if (_wmTimer) { clearInterval(_wmTimer); _wmTimer = null }
      if (_wmObserver) { _wmObserver.disconnect(); _wmObserver = null }
      const chartContainer = document.getElementById('kline-chart-container')
      if (chartContainer && shiftMeasurePointerDownHandler) {
        chartContainer.removeEventListener('pointerdown', shiftMeasurePointerDownHandler, true)
        shiftMeasurePointerDownHandler = null
      }
      if (chartRef.value) {
        chartRef.value.destroy()
        chartRef.value = null
      }
      volPaneEnsured = false
      window.removeEventListener('resize', handleResize)
    })

    return {
      klineData,
      loading,
      error,
      loadingHistory,
      chartRef,
      chartTheme,
      themeConfig,
      wmCanvasRef,
      chartRootEl,
      chartModalGetContainer,
      getIndicatorColor,
      handleRetry,
      loadingPython,
      pythonReady,
      pyodideLoadFailed,
      formatKlineData,
      updatePricePanel,
      isSameTimeframe,
      loadKlineData,
      loadMoreHistoryData,
      updateKlineRealtime,
      startRealtime,
      stopRealtime,
      initChart,
      handleResize,
      updateChartTheme,
      updateIndicators,
      executePythonStrategy,
      parsePythonStrategy,
      indicatorButtons,
      activePresetIndicators,
      handleIndicatorButtonClick,
      isIndicatorActive,
      toggleIndicator,
      indicatorEditorVisible,
      indicatorEditorSaving,
      indicatorEditorForm,
      indicatorEditorSchema,
      indicatorEditorTitle,
      indicatorEditorModalWrapClass,
      formatIndicatorInstanceLabel,
      openIndicatorEditor,
      closeIndicatorEditor,
      applyIndicatorEditor,
      removeIndicatorInstance,
      toggleIndicatorVisibility,
      drawingTools,
      activeDrawingTool,
      selectDrawingTool,
      clearAllDrawings,
      addedSignalOverlayIds,
      addedBacktestOverlayIds,
      getChartInstance,
      clearBacktestOverlays,
      addBacktestOverlay
    }
  }
}
</script>

<style lang="less" scoped>
.chart-left {
  width: 70% !important;
  flex: 0 0 70% !important;
  position: relative;
  border-right: 1px solid #e8e8e8;
  background: #fff;
  transition: background-color 0.3s;
  touch-action: pan-x pan-y;
  -webkit-overflow-scrolling: touch;

  &.theme-dark {
    background: #141414;
    border-right-color: #2a2a2a;
  }
}

.chart-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  background: #fff;
  transition: background-color 0.3s;
  touch-action: pan-x pan-y;
  -webkit-overflow-scrolling: touch;
  display: flex;

  .theme-dark & {
    background: #141414;
  }
}

.drawing-toolbar {
  flex-shrink: 0;
  width: 40px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  gap: 4px;
  z-index: 10;
  overflow-y: auto;
  overflow-x: hidden;
}

.chart-left.theme-dark .drawing-toolbar {
  background: #141414;
  border-right-color: #2a2a2a;
}

.drawing-tool-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  color: #666;
  font-size: 16px;
  user-select: none;
}

.chart-left.theme-dark .drawing-tool-btn {
  color: #d1d4dc;
}

.drawing-tool-btn:hover {
  background: #f0f2f5;
  color: var(--primary-color, #1890ff);
}

.chart-left.theme-dark .drawing-tool-btn:hover {
  background: #252525;
  color: #13c2c2;
}

.drawing-tool-btn.active {
  background: #e6f7ff;
  color: var(--primary-color, #1890ff);
  border: 1px solid var(--primary-color, #1890ff);
}

.chart-left.theme-dark .drawing-tool-btn.active {
  background: #252525;
  color: #13c2c2;
  border-color: #13c2c2;
}

.drawing-toolbar .ant-divider-vertical {
  margin: 8px 0;
  height: 20px;
}

.indicator-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-wrap: wrap;
  z-index: 1;
  position: relative;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

.indicator-toolbar::-webkit-scrollbar {
  display: none; /* Chrome Safari */
  width: 0;
  height: 0;
}

.indicator-active-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 0 12px 10px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.chart-left.theme-dark .indicator-active-bar {
  background: #141414;
  border-bottom-color: #2a2a2a;
}

.indicator-active-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 999px;
  background: #f7faff;
  border: 1px solid #d6e4ff;
  color: #1f1f1f;
  font-size: 12px;
  line-height: 1;
}

.indicator-active-chip--hidden {
  opacity: 0.65;
  background: #fafafa;
  border-color: #d9d9d9;
}

.chart-left.theme-dark .indicator-active-chip {
  background: rgba(24, 144, 255, 0.12);
  border-color: rgba(24, 144, 255, 0.28);
  color: rgba(255, 255, 255, 0.88);
}

.chart-left.theme-dark .indicator-active-chip--hidden {
  background: #1f1f1f;
  border-color: #434343;
  color: rgba(255, 255, 255, 0.55);
}

.indicator-active-chip__label {
  cursor: pointer;
  font-weight: 600;
}

.indicator-active-chip__action {
  cursor: pointer;
  color: #8c8c8c;
  transition: color 0.2s ease;
}

.indicator-active-chip__action:hover {
  color: var(--primary-color, #1890ff);
}

.chart-left.theme-dark .indicator-active-chip__action {
  color: rgba(255, 255, 255, 0.55);
}

.chart-left.theme-dark .indicator-active-chip__action:hover {
  color: #13c2c2;
}

.indicator-editor-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.indicator-editor-field__label {
  margin-bottom: 8px;
  color: #262626;
  font-weight: 600;
}

.indicator-editor-field__hint {
  margin-top: 6px;
  font-size: 12px;
  color: #8c8c8c;
}

.indicator-editor-color {
  width: 100%;
  height: 36px;
  padding: 4px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.chart-left.theme-dark .indicator-editor-color {
  border-color: #434343;
  background: #1f1f1f;
}

.indicator-editor-empty {
  color: #8c8c8c;
}

::v-deep .indicator-editor-modal--dark .ant-modal-content {
  background: #1f1f1f;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
}

::v-deep .indicator-editor-modal--dark .ant-modal-header {
  background: #1f1f1f;
  border-bottom: 1px solid #303030;
}

::v-deep .indicator-editor-modal--dark .ant-modal-title {
  color: rgba(255, 255, 255, 0.9);
}

::v-deep .indicator-editor-modal--dark .ant-modal-close {
  color: rgba(255, 255, 255, 0.45);
}

::v-deep .indicator-editor-modal--dark .ant-modal-close:hover {
  color: rgba(255, 255, 255, 0.85);
}

::v-deep .indicator-editor-modal--dark .ant-modal-body {
  background: #1f1f1f;
}

::v-deep .indicator-editor-modal--dark .ant-modal-footer {
  background: #1f1f1f;
  border-top: 1px solid #303030;
}

::v-deep .indicator-editor-modal--dark .ant-input-number {
  background: #141414;
  border-color: #434343;
}

::v-deep .indicator-editor-modal--dark .ant-input-number-input {
  background: transparent;
  color: rgba(255, 255, 255, 0.88);
}

::v-deep .indicator-editor-modal--dark .ant-input-number-handler-wrap {
  background: #141414;
  border-left-color: #303030;
}

::v-deep .indicator-editor-modal--dark .ant-input-number-handler {
  color: rgba(255, 255, 255, 0.45);
}

::v-deep .indicator-editor-modal--dark .ant-input-number:hover,
::v-deep .indicator-editor-modal--dark .ant-input-number-focused {
  border-color: var(--primary-color-active, #177ddc);
}

::v-deep .indicator-editor-modal--dark .indicator-editor-field__label {
  color: rgba(255, 255, 255, 0.88);
}

::v-deep .indicator-editor-modal--dark .indicator-editor-field__hint,
::v-deep .indicator-editor-modal--dark .indicator-editor-empty {
  color: rgba(255, 255, 255, 0.45);
}

::v-deep .indicator-editor-modal--dark .indicator-editor-color {
  background: #141414;
  border-color: #434343;
}

.chart-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

.qd-wm-layer {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 8 !important;
  pointer-events: none !important;
  display: block !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.chart-left.theme-dark .indicator-toolbar {
  background: #141414;
  border-bottom-color: #2a2a2a;
}

.indicator-btn {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  background: #f0f2f5;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  min-width: 40px;
  text-align: center;
  user-select: none;
}

.chart-left.theme-dark .indicator-btn {
  color: #d1d4dc;
  background: #252525;
  border-color: #2a2a2a;
}

.indicator-btn:hover {
  color: var(--primary-color, #1890ff);
  border-color: var(--primary-color, #1890ff);
  background: #f0f8ff;
}

.chart-left.theme-dark .indicator-btn:hover {
  color: #13c2c2;
  border-color: #13c2c2;
  background: #252525;
}

.indicator-btn.active {
  color: var(--primary-color, #1890ff);
  background: #fff;
  border-color: var(--primary-color, #1890ff);
  border-width: 2px;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.chart-left.theme-dark .indicator-btn.active {
  color: #13c2c2;
  background: #252525;
  border-color: #13c2c2;
  box-shadow: 0 0 0 2px rgba(19, 194, 194, 0.2);
}

.kline-chart-container {
  flex: 1;
  width: 100%;
  min-width: 0; /* 防止 flex 子元素溢出 */
  background: #fff;
  transition: background-color 0.3s;
  touch-action: pan-x pan-y;
  -webkit-overflow-scrolling: touch;
  overflow: hidden;

  .theme-dark & {
    background: #141414;
  }
}

.chart-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
  backdrop-filter: blur(2px);
}

.chart-left.theme-dark .chart-overlay {
  background: rgba(20, 20, 20, 0.95);
}

.error-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #333;
}

.initial-hint {
  background: rgba(255, 255, 255, 0.98);
}

.chart-left.theme-dark .initial-hint {
  background: rgba(20, 20, 20, 0.98);
}

.hint-box {
  text-align: center;
  color: #666;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 400px;
  padding: 20px;
}

.pyodide-warning {
  background: rgba(255, 255, 255, 0.98);
}

.chart-left.theme-dark .pyodide-warning {
  background: rgba(20, 20, 20, 0.98);
}

.warning-box {
  text-align: center;
  color: #666;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 500px;
  padding: 20px;
}

.warning-title {
  font-size: 16px;
  font-weight: 600;
  color: #faad14;
  margin-bottom: 8px;
}

.warning-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.chart-left.theme-dark .warning-box {
  color: #d1d4dc;
}

.chart-left.theme-dark .warning-title {
  color: #faad14;
}

.chart-left.theme-dark .warning-desc {
  color: #868993;
}

.chart-left.theme-dark .hint-box {
  color: #d1d4dc;
}

.hint-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.chart-left.theme-dark .hint-title {
  color: #d1d4dc;
}

.hint-desc {
  font-size: 14px;
  color: #999;
  line-height: 1.6;
}

.chart-left.theme-dark .hint-desc {
  color: #787b86;
}

.history-loading-hint {
  position: absolute;
  left: 20px;
  top: 60px;
  z-index: 1000 !important;
  display: flex !important;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.98) !important;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  color: #666 !important;
  backdrop-filter: blur(4px);
  pointer-events: none;
  visibility: visible !important;
  opacity: 1 !important;
}

.chart-left.theme-dark .history-loading-hint {
  background: rgba(20, 20, 20, 0.98) !important;
  border-color: #2a2a2a;
  color: #d1d4dc !important;
}

.loading-text {
  white-space: nowrap;
  margin-left: 4px;
}

@media (max-width: 768px) {
  .drawing-toolbar {
    display: none; /* 移动端隐藏画线工具栏 */
  }

  .indicator-toolbar {
    padding-left: 12px; /* 移动端恢复原始padding */
    flex-wrap: nowrap; /* 手机端不换行，只显示一行 */
    overflow-x: auto; /* 允许横向滚动 */
    overflow-y: hidden; /* 禁止纵向滚动 */
    scrollbar-width: none; /* Firefox 隐藏滚动条 */
    -ms-overflow-style: none; /* IE 10+ 隐藏滚动条 */
    -webkit-overflow-scrolling: touch; /* iOS 平滑滚动 */
  }

  .indicator-toolbar::-webkit-scrollbar {
    display: none; /* Chrome Safari 隐藏滚动条 */
    width: 0;
    height: 0;
  }

  .indicator-btn {
    flex-shrink: 0; /* 按钮不收缩，保持原始大小 */
  }
}

@media (max-width: 1200px) {
  .drawing-toolbar {
    display: none; /* 移动端隐藏画线工具栏 */
  }

  .indicator-toolbar {
    padding-left: 12px; /* 移动端恢复原始padding */
  }

  .kline-chart-container {
    margin-left: 0; /* 移动端恢复原始margin */
  }

  .chart-left {
    width: 100% !important;
    min-width: 100% !important;
    border-right: none;
    border-bottom: 1px solid #e8e8e8;
    height: 600px !important;
    min-height: 600px !important;
  }

  .chart-wrapper {
    height: 100% !important;
    min-height: 600px !important;
  }

  .kline-chart-container {
    height: 100% !important;
    min-height: 600px !important;
  }
}

@media (max-width: 992px) {
  .chart-left {
    height: 650px !important;
    min-height: 650px !important;
  }

  .chart-wrapper {
    height: 100% !important;
    min-height: 650px !important;
  }

  .kline-chart-container {
    height: 100% !important;
    min-height: 650px !important;
  }
}

@media (max-width: 768px) {
  .chart-left {
    height: 60vh !important;
    min-height: 400px !important;
    max-height: 80vh !important;
  }

  .chart-wrapper {
    height: 100% !important;
    min-height: 400px !important;
    max-height: 100% !important;
  }

  .kline-chart-container {
    height: calc(100% - 45px) !important; /* 减去工具栏高度 */
    min-height: 350px !important;
    max-height: calc(100% - 45px) !important;
  }
}

@media (max-width: 576px) {
  .chart-left {
    height: 55vh !important;
    min-height: 350px !important;
    max-height: 75vh !important;
  }

  .chart-wrapper {
    height: 100% !important;
    min-height: 350px !important;
    max-height: 100% !important;
  }

  .kline-chart-container {
    height: calc(100% - 45px) !important; /* 减去工具栏高度 */
    min-height: 300px !important;
    max-height: calc(100% - 45px) !important;
  }
}
</style>
