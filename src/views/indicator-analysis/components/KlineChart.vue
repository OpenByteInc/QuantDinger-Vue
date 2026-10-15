<template>
  <div ref="chartRootEl" class="chart-left" :class="{ 'theme-dark': chartTheme === 'dark', 'chart-left--full': fullWidth }">
    <div class="chart-wrapper">
      <div class="drawing-toolbar">
        <a-tooltip
          v-for="tool in drawingTools"
          :key="tool.name"
          :title="tool.hint ? `${tool.title} - ${tool.hint}` : tool.title"
          placement="right"
        >
          <div
            class="drawing-tool-btn"
            :class="{ active: activeDrawingTool === tool.name }"
            @click="selectDrawingTool(tool.name)"
          >
            <svg class="drawing-tool-icon" viewBox="0 0 20 20" aria-hidden="true">
              <g v-if="tool.name === 'measure'">
                <line x1="10" y1="3" x2="10" y2="17" />
                <polyline points="7,6 10,3 13,6" />
                <polyline points="7,14 10,17 13,14" />
                <line x1="5" y1="3" x2="15" y2="3" />
                <line x1="5" y1="17" x2="15" y2="17" />
              </g>
              <g v-else-if="tool.name === 'line'">
                <line x1="4" y1="15" x2="16" y2="5" />
                <circle cx="4" cy="15" r="1.4" />
                <circle cx="16" cy="5" r="1.4" />
              </g>
              <g v-else-if="tool.name === 'horizontalLine'">
                <line x1="2" y1="10" x2="18" y2="10" />
              </g>
              <g v-else-if="tool.name === 'horizontalRay'">
                <circle cx="4" cy="10" r="1.5" />
                <line x1="5.5" y1="10" x2="18" y2="10" />
              </g>
              <g v-else-if="tool.name === 'horizontalSegment'">
                <line x1="4" y1="10" x2="16" y2="10" />
                <line x1="4" y1="6" x2="4" y2="14" />
                <line x1="16" y1="6" x2="16" y2="14" />
              </g>
              <g v-else-if="tool.name === 'verticalLine'">
                <line x1="10" y1="2" x2="10" y2="18" />
              </g>
              <g v-else-if="tool.name === 'ray'">
                <circle cx="4" cy="16" r="1.5" />
                <line x1="5" y1="15" x2="17" y2="3" />
              </g>
              <g v-else-if="tool.name === 'arrow'">
                <line x1="3" y1="16" x2="16" y2="4" />
                <polyline points="10,4 16,4 16,10" />
              </g>
              <g v-else-if="tool.name === 'straightLine'">
                <line x1="2" y1="18" x2="18" y2="2" />
              </g>
              <g v-else-if="tool.name === 'parallelStraightLine'">
                <line x1="1" y1="14" x2="13" y2="2" />
                <line x1="7" y1="18" x2="19" y2="6" />
              </g>
              <g v-else-if="tool.name === 'rectangle'">
                <rect x="3" y="4" width="14" height="12" rx="1" />
              </g>
              <g v-else-if="tool.name === 'priceLine'">
                <line x1="2" y1="10" x2="11" y2="10" />
                <rect x="11" y="6" width="7" height="8" rx="1" />
                <text x="14.5" y="11.9">$</text>
              </g>
              <g v-else-if="tool.name === 'priceChannelLine'">
                <line x1="2" y1="13" x2="14" y2="3" />
                <line x1="6" y1="17" x2="18" y2="7" />
                <line class="drawing-tool-icon__dash" x1="4" y1="15" x2="16" y2="5" />
              </g>
              <g v-else-if="tool.name === 'fibonacciLine'">
                <line x1="2" y1="3" x2="18" y2="3" />
                <line x1="4" y1="7" x2="18" y2="7" />
                <line x1="6" y1="11" x2="18" y2="11" />
                <line x1="8" y1="15" x2="18" y2="15" />
                <line x1="10" y1="18" x2="18" y2="18" />
              </g>
            </svg>
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
        <div v-if="showIndicatorToolbar" class="indicator-toolbar">
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
        <div v-if="showIndicatorToolbar && activePresetIndicators.length" class="indicator-active-bar">
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

      <div v-if="loading && !klineData.length" class="chart-overlay">
        <a-spin size="large">
          <a-icon slot="indicator" type="loading" style="font-size: 24px; color: #13c2c2" spin />
        </a-spin>
      </div>
      <div v-else-if="loading" class="chart-refresh-indicator" aria-live="polite">
        <a-spin size="small" />
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
import { inferMarketPricePrecision } from '@/utils/marketPricePrecision.mjs'
import ExchangeKlineWs from '@/utils/exchangeWs'
import { splitIndicatorPlotsByPane } from '@/utils/indicatorPlotGrouping'
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
    exchangeId: {
      type: String,
      default: ''
    },
    marketType: {
      type: String,
      default: 'spot'
    },
    instrumentId: {
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
    candleType: {
      type: String,
      default: 'candle_solid'
    },
    activeIndicators: {
      type: Array,
      default: () => []
    },
    showIndicatorToolbar: {
      type: Boolean,
      default: true
    },
    realtimeEnabled: {
      type: Boolean,
      default: false
    },
    fullWidth: {
      type: Boolean,
      default: false
    },
    initialBeforeTime: {
      type: [Number, String],
      default: null
    },
    initialLimit: {
      type: Number,
      default: null
    },
    initialRows: {
      type: Array,
      default: () => []
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
    let loadGeneration = 0
    let activeLoadContextKey = ''
    let lastHistoryBeforeTimestamp = null
    let lastHistoryLoadAt = 0
    let suppressHistoryRangeUntil = 0
    const chartInitialized = ref(false)

    const chartRef = shallowRef(null)
    const chartTheme = ref(props.theme || 'light')
    const supportedCandleTypes = new Set([
      'candle_solid',
      'candle_stroke',
      'candle_up_stroke',
      'candle_down_stroke',
      'ohlc',
      'area'
    ])
    const normalizedCandleType = () => supportedCandleTypes.has(props.candleType) ? props.candleType : 'candle_solid'
    let chartResizeObserver = null
    let chartResizeRafId = null
    let volEnsureRafId = null
    let volPaneEnsured = false
    let volPaneId = null
    const volumeVisible = ref(true)
    const VOL_PANE_OPTIONS = { height: 112, minHeight: 64, dragEnabled: true }
    const syncVolumePaneLayout = () => {
      if (!chartRef.value) return
      if (!volumeVisible.value) return
      if (!volPaneEnsured && typeof chartRef.value.createIndicator === 'function') {
        try {
          volPaneId = chartRef.value.createIndicator('VOL', false, VOL_PANE_OPTIONS) || null
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
    const toggleVolumePane = () => {
      volumeVisible.value = !volumeVisible.value
      if (volumeVisible.value) {
        volPaneEnsured = false
        scheduleSyncVolumePaneLayout()
        return
      }
      if (!chartRef.value || typeof chartRef.value.removeIndicator !== 'function') return
      try {
        if (volPaneId) chartRef.value.removeIndicator(volPaneId, 'VOL')
        else chartRef.value.removeIndicator('VOL')
      } catch (e) {
      }
      volPaneId = null
      volPaneEnsured = false
      try {
        chartRef.value.resize()
      } catch (e) {
      }
    }

    const wmCanvasRef = ref(null)
    const chartRootEl = ref(null)
    let _wmTimer = null
    let _wmObserver = null

    const realtimeTimer = ref(null)
    const realtimeInterval = ref(5000)
    const realtimeFetchInFlight = ref(false)
    let restPollingKickTimer = null
    let realtimeResyncTimer = null
    let realtimeChartRafId = null
    let wsClient = null
    const wsActive = ref(false)
    let wsStaleTimer = null
    let _cachedExchangeId = null
    let _exchangeIdTs = 0
    let _realtimeGeneration = 0
    const lastPriceEmitSig = ref('')

    const pricePrecision = ref(2)

    const HISTORY_LOAD_COOLDOWN_MS = 900
    const MIN_INITIAL_KLINE_LIMIT = 480
    const MAX_INITIAL_KLINE_LIMIT = 900
    const HISTORY_PAGE_LIMIT = 500
    const marketRequestParams = (extra = {}) => ({
      market: props.market,
      symbol: props.symbol,
      timeframe: props.timeframe,
      exchange_id: props.exchangeId || undefined,
      market_type: props.marketType || undefined,
      instrument_id: props.instrumentId || undefined,
      ...extra
    })

    const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value))

    const estimateVisibleBarCount = () => {
      const container = document.getElementById('kline-chart-container')
      const width = container && container.clientWidth ? container.clientWidth : (window.innerWidth || 1280)
      return clampNumber(Math.ceil(width / 8), 120, 260)
    }

    const getInitialKlineLimit = () => {
      const requestedLimit = Number(props.initialLimit)
      if (Number.isFinite(requestedLimit) && requestedLimit > 0) {
        return clampNumber(Math.round(requestedLimit), 120, 1000)
      }
      return clampNumber(estimateVisibleBarCount() * 3, MIN_INITIAL_KLINE_LIMIT, MAX_INITIAL_KLINE_LIMIT)
    }

    const getInitialBeforeTime = () => {
      const requestedTime = Number(props.initialBeforeTime)
      if (!Number.isFinite(requestedTime) || requestedTime <= 0) return undefined
      return Math.floor(requestedTime > 100000000000 ? requestedTime / 1000 : requestedTime)
    }

    const calcPricePrecision = (data) => inferMarketPricePrecision(data, props.market)

    const formatPrice = (v) => {
      return (Number(v) || 0).toFixed(pricePrecision.value)
    }

    const indicatorsUpdating = ref(false)
    const indicatorsUpdateQueued = ref(false)
    const lastRealtimeIndicatorBarTs = ref(null)
    let indicatorRenderSeq = 0

    const maybeUpdateIndicators = (force = false) => {
      if (!chartRef.value || !klineData.value.length) return
      const latestBar = klineData.value[klineData.value.length - 1]
      const latestBarTs = Number(latestBar && latestBar.timestamp)
      if (!force && Number.isFinite(latestBarTs) && lastRealtimeIndicatorBarTs.value === latestBarTs) return
      lastRealtimeIndicatorBarTs.value = Number.isFinite(latestBarTs) ? latestBarTs : null
      updateIndicators()
    }

    const isCryptoMarket = () => {
      const m = (props.market || '').toLowerCase()
      return m === 'crypto' || m === '' || m === 'cryptocurrency'
    }

    const getRealtimePollingInterval = () => {
      const tf = String(props.timeframe || '1H')
      const cryptoMap = {
        '1m': 5000,
        '3m': 8000,
        '5m': 10000,
        '15m': 15000,
        '30m': 30000,
        '1H': 30000,
        '4H': 45000,
        '1D': 60000,
        '1W': 60000
      }
      const marketDataMap = {
        '1m': 15000,
        '3m': 15000,
        '5m': 20000,
        '15m': 30000,
        '30m': 45000,
        '1H': 60000,
        '4H': 60000,
        '1D': 60000,
        '1W': 60000
      }
      const map = isCryptoMarket() ? cryptoMap : marketDataMap
      return map[tf] || (isCryptoMarket() ? 30000 : 60000)
    }

    const TIMEFRAME_MS = {
      '1m': 60 * 1000,
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1H': 60 * 60 * 1000,
      '4H': 4 * 60 * 60 * 1000,
      '1D': 24 * 60 * 60 * 1000,
      '1W': 7 * 24 * 60 * 60 * 1000
    }

    const getTimeframeMs = (tf = props.timeframe) => TIMEFRAME_MS[String(tf || '1H')] || 0

    const normalizeTimestampMs = (value) => {
      let timeValue = value
      if (typeof timeValue === 'string') {
        timeValue = parseInt(timeValue, 10)
      }
      if (!Number.isFinite(timeValue)) return null
      if (timeValue < 1e10) {
        timeValue = timeValue * 1000
      }
      return timeValue
    }

    const alignKlineTimestampMs = (value, tf = props.timeframe) => {
      const ts = normalizeTimestampMs(value)
      if (!ts) return null
      const key = String(tf || '1H')
      const interval = getTimeframeMs(key)
      if (!interval) return ts
      if (key === '1D') {
        const d = new Date(ts)
        return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
      }
      if (key === '1W') {
        const d = new Date(ts)
        const utcDay = d.getUTCDay()
        const daysFromMonday = (utcDay + 6) % 7
        return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - daysFromMonday * TIMEFRAME_MS['1D']
      }
      return Math.floor(ts / interval) * interval
    }

    const mergeKlineBar = (base, incoming, timestamp = base && base.timestamp) => {
      if (!base) return incoming
      if (!incoming) return base
      return {
        timestamp,
        open: Number.isFinite(Number(base.open)) ? Number(base.open) : Number(incoming.open),
        high: Math.max(Number(base.high), Number(incoming.high)),
        low: Math.min(Number(base.low), Number(incoming.low)),
        close: Number(incoming.close),
        volume: Math.max(Number(base.volume || 0), Number(incoming.volume || 0))
      }
    }

    const normalizeKlineSequence = (bars) => {
      if (!Array.isArray(bars) || bars.length === 0) return []
      const byTimestamp = new Map()
      bars
        .filter(item => item && item.timestamp && !isNaN(item.open) && !isNaN(item.high) && !isNaN(item.low) && !isNaN(item.close))
        .sort((a, b) => a.timestamp - b.timestamp)
        .forEach(item => {
          const existing = byTimestamp.get(item.timestamp)
          byTimestamp.set(item.timestamp, existing ? mergeKlineBar(existing, item, item.timestamp) : item)
        })
      return Array.from(byTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp)
    }

    const isRealtimeAppendGapSuspicious = (prevTimestamp, nextTimestamp) => {
      const prev = Number(prevTimestamp)
      const next = Number(nextTimestamp)
      const interval = getTimeframeMs()
      if (!interval || !Number.isFinite(prev) || !Number.isFinite(next) || next <= prev) return false
      const maxIntervals = isCryptoMarket() ? 3 : 80
      return (next - prev) > interval * maxIntervals
    }

    const scheduleRealtimeKlineResync = () => {
      if (realtimeResyncTimer || loading.value) return
      realtimeResyncTimer = setTimeout(() => {
        realtimeResyncTimer = null
        if (props.symbol && props.realtimeEnabled) {
          loadKlineData(true)
        }
      }, 300)
    }

    const addedIndicatorIds = ref([])
    const addedSignalOverlayIds = ref([])
    const addedBacktestOverlayIds = ref([])
    const addedDrawingOverlayIds = ref([])
    const activeDrawingTool = ref(null)
    let shiftMeasurePointerDownHandler = null

    const removeSignalOverlayBatch = (ids) => {
      const inst = chartRef.value
      if (!inst || !Array.isArray(ids) || ids.length === 0) return
      ids.forEach(overlayId => {
        try {
          if (typeof inst.removeOverlay === 'function') {
            inst.removeOverlay(overlayId)
          } else if (typeof inst.removeOverlayById === 'function') {
            inst.removeOverlayById(overlayId)
          }
        } catch (err) {
        }
      })
    }

    const removeIndicatorBatch = (items) => {
      const inst = chartRef.value
      if (!inst || !Array.isArray(items) || items.length === 0) return
      items.forEach(info => {
        try {
          const name = typeof info === 'string' ? info : info.name
          const paneId = typeof info === 'string' ? undefined : info.paneId
          if (!name) return
          if (paneId) {
            inst.removeIndicator(paneId, name)
          } else {
            inst.removeIndicator('candle_pane', name)
            inst.removeIndicator(name)
          }
        } catch (err) {
        }
      })
    }

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
      { name: 'horizontalRay', title: proxy.$t('dashboard.indicator.drawing.horizontalRay'), icon: 'arrow-right' },
      { name: 'horizontalSegment', title: proxy.$t('dashboard.indicator.drawing.horizontalSegment'), icon: 'minus' },
      { name: 'verticalLine', title: proxy.$t('dashboard.indicator.drawing.verticalLine'), icon: 'column-width' },
      { name: 'ray', title: proxy.$t('dashboard.indicator.drawing.ray'), icon: 'arrow-right' },
      { name: 'arrow', title: proxy.$t('dashboard.indicator.drawing.arrow'), icon: 'arrow-right' },
      { name: 'straightLine', title: proxy.$t('dashboard.indicator.drawing.straightLine'), icon: 'menu' },
      { name: 'parallelStraightLine', title: proxy.$t('dashboard.indicator.drawing.parallelLine'), icon: 'menu' },
      { name: 'rectangle', title: proxy.$t('dashboard.indicator.drawing.rectangle'), icon: 'border' },
      { name: 'priceLine', title: proxy.$t('dashboard.indicator.drawing.priceLine'), icon: 'dollar' },
      { name: 'priceChannelLine', title: proxy.$t('dashboard.indicator.drawing.priceChannel'), icon: 'border' },
      { name: 'fibonacciLine', title: proxy.$t('dashboard.indicator.drawing.fibonacciLine'), icon: 'rise' }
    ])

    const indicatorButtons = ref([
      {
        id: 'vol',
        name: 'Volume',
        shortName: 'VOL',
        type: 'builtin-volume',
        defaultParams: {},
        paramSchema: []
      },
      {
        id: 'sma',
        name: 'SMA',
        shortName: 'SMA',
        type: 'line',
        defaultParams: { length: 20 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 300, step: 1 }]
      },
      {
        id: 'ema',
        name: 'EMA',
        shortName: 'EMA',
        type: 'line',
        defaultParams: { length: 20 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 300, step: 1 }]
      },
      {
        id: 'rsi',
        name: 'RSI',
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
        name: 'Bollinger Bands',
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
        name: 'ATR',
        shortName: 'ATR',
        type: 'line',
        defaultParams: { period: 14 },
        paramSchema: [{ key: 'period', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'cci',
        name: 'CCI',
        shortName: 'CCI',
        type: 'line',
        defaultParams: { length: 20 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'williams',
        name: 'Williams %R',
        shortName: 'W%R',
        type: 'line',
        defaultParams: { length: 14 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'mfi',
        name: 'MFI',
        shortName: 'MFI',
        type: 'line',
        defaultParams: { length: 14 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      {
        id: 'adx',
        name: 'ADX',
        shortName: 'ADX',
        type: 'adx',
        defaultParams: { length: 14 },
        paramSchema: [{ key: 'length', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 200, step: 1 }]
      },
      { id: 'obv', name: 'OBV', shortName: 'OBV', type: 'line', defaultParams: {}, paramSchema: [] },
      {
        id: 'adosc',
        name: 'ADOSC',
        shortName: 'ADOSC',
        type: 'line',
        defaultParams: { fast: 3, slow: 10 },
        paramSchema: [
          { key: 'fast', labelKey: 'indicatorIde.editor.fastLine', type: 'number', min: 1, max: 100, step: 1 },
          { key: 'slow', labelKey: 'indicatorIde.editor.slowLine', type: 'number', min: 2, max: 200, step: 1 }
        ]
      },
      { id: 'ad', name: 'AD', shortName: 'AD', type: 'line', defaultParams: {}, paramSchema: [] },
      {
        id: 'kdj',
        name: 'KDJ',
        shortName: 'KDJ',
        type: 'line',
        defaultParams: { period: 9, k: 3, d: 3 },
        paramSchema: [
          { key: 'period', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 100, step: 1 },
          { key: 'k', labelKey: 'indicatorIde.editor.kSmoothing', type: 'number', min: 1, max: 20, step: 1 },
          { key: 'd', labelKey: 'indicatorIde.editor.dSmoothing', type: 'number', min: 1, max: 20, step: 1 }
        ]
      },
      {
        id: 'vwap',
        name: 'Volume Weighted Average Price',
        shortName: 'VWAP',
        type: 'line',
        defaultParams: { period: 20 },
        paramSchema: [{ key: 'period', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 500, step: 1 }]
      },
      {
        id: 'sar',
        name: 'Parabolic SAR',
        shortName: 'SAR',
        type: 'native',
        singleInstance: true,
        defaultParams: { start: 2, step: 2, max: 20 },
        paramSchema: []
      },
      {
        id: 'roc',
        name: 'Rate of Change',
        shortName: 'ROC',
        type: 'native',
        singleInstance: true,
        defaultParams: { period: 12, smoothing: 6 },
        paramSchema: [{ key: 'period', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 300, step: 1 }]
      },
      {
        id: 'mtm',
        name: 'Momentum',
        shortName: 'MTM',
        type: 'native',
        singleInstance: true,
        defaultParams: { period: 12, smoothing: 6 },
        paramSchema: [{ key: 'period', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 300, step: 1 }]
      },
      {
        id: 'bias',
        name: 'Bias Ratio',
        shortName: 'BIAS',
        type: 'native',
        singleInstance: true,
        defaultParams: { short: 6, medium: 12, long: 24 },
        paramSchema: []
      },
      {
        id: 'trix',
        name: 'Triple Exponential Average',
        shortName: 'TRIX',
        type: 'native',
        singleInstance: true,
        defaultParams: { period: 12, smoothing: 9 },
        paramSchema: [{ key: 'period', labelKey: 'indicatorIde.editor.period', type: 'number', min: 1, max: 300, step: 1 }]
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
      if (indicatorId === 'vol') return volumeVisible.value
      return props.activeIndicators.some(ind => ind.id === indicatorId)
    }

    const selectDrawingTool = (toolName) => {
      if (!chartRef.value) {
        return
      }

      const toolMap = {
        line: 'segment',
        horizontalLine: 'horizontalStraightLine',
        horizontalRay: 'horizontalRayLine',
        horizontalSegment: 'horizontalSegment',
        verticalLine: 'verticalStraightLine',
        ray: 'rayLine',
        arrow: 'qdArrow',
        straightLine: 'straightLine',
        parallelStraightLine: 'parallelStraightLine',
        rectangle: 'qdRectangle',
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
          calculate: null
        }
        emit('indicator-toggle', {
          action: 'add',
          indicator: indicatorToAdd
        })
      }
    }

    const handleIndicatorButtonClick = (indicator) => {
      if (!indicator || !indicator.id) return
      if (indicator.id === 'vol') {
        toggleVolumePane()
        return
      }
      if (indicator.singleInstance && isIndicatorActive(indicator.id)) {
        const activeInstance = props.activeIndicators.find(item => item.id === indicator.id)
        if (activeInstance) {
          removeIndicatorInstance(activeInstance)
        }
        return
      }
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
          gridLineColor: 'rgba(255, 255, 255, 0.055)',
          gridLineColorDashed: '#4a4d57',
          tooltipBg: 'rgba(27, 27, 27, 0.96)',
          tooltipBorder: '#303030',
          tooltipText: '#d1d4dc',
          tooltipTextSecondary: '#787b86',
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
          textColor: '#131722',
          textColorSecondary: '#6a6d78',
          borderColor: '#e0e3eb',
          gridLineColor: '#f0f3fa',
          gridLineColorDashed: '#d6d9e0',
          tooltipBg: 'rgba(255, 255, 255, 0.95)',
          tooltipBorder: '#e0e3eb',
          tooltipText: '#131722',
          tooltipTextSecondary: '#6a6d78',
          axisLabelColor: '#6a6d78',
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
        return ['#2962ff', '#ff9800', '#ab47bc', '#26a69a', '#ef5350', '#78909c'][idx % 6]
      } else {
        return ['#2962ff', '#f57c00', '#7b1fa2', '#00897b', '#d32f2f', '#546e7a'][idx % 6]
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
          plots: [],
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
        throw new Error('Python engine is not ready yet. Please try again after it finishes loading.')
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
          throw new Error(`Python execution did not return a valid JSON string. Return type: ${typeof resultJson}`)
        }

        let result
        try {
          result = JSON.parse(resultJson)
        } catch (parseError) {
          throw new Error(`Failed to parse Python JSON output: ${parseError.message}. Check for NaN or unsupported values.`)
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
        throw new Error(`Python execution failed: ${err.message}`)
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

const isFinitePrice = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const MAX_RENDERED_SIGNAL_POINTS = 320
const FALSE_SIGNAL_STRINGS = new Set(['', '0', 'false', 'none', 'null', 'nan', 'na', 'n/a'])

const buildSignalMarkerMetrics = (klineData = []) => {
  let minLow = Infinity
  let maxHigh = -Infinity
  for (const item of klineData) {
    const high = isFinitePrice(item?.high)
    const low = isFinitePrice(item?.low)
    if (high != null) maxHigh = Math.max(maxHigh, high)
    if (low != null) minLow = Math.min(minLow, low)
  }
  const rawRange = maxHigh - minLow
  const fallbackPrice = Math.max(Math.abs(maxHigh || 0), Math.abs(minLow || 0), 1)
  const priceRange = Number.isFinite(rawRange) && rawRange > 0
    ? rawRange
    : fallbackPrice * 0.01
  return { priceRange }
}

const normalizeSignalMarkerPrice = (rawPrice, klineItem, side, metrics) => {
  const high = isFinitePrice(klineItem?.high)
  const low = isFinitePrice(klineItem?.low)
  if (high == null || low == null) return isFinitePrice(rawPrice)

  const priceRange = Math.max(Number(metrics?.priceRange) || 0, Math.abs(high || low || 1) * 0.002, 0.000001)
  const candleRange = Math.max(high - low, 0)
  const minPad = Math.min(priceRange * 0.035, Math.max(priceRange * 0.012, candleRange * 0.18))
  const maxPad = Math.max(
    minPad,
    Math.min(priceRange * 0.055, Math.max(priceRange * 0.035, candleRange * 0.65))
  )
  const raw = isFinitePrice(rawPrice)
  const isBuy = side === 'buy'
  const anchor = isBuy ? low : high
  const defaultPrice = isBuy ? anchor - minPad : anchor + minPad
  if (raw == null) return defaultPrice

  if (isBuy) {
    if (raw >= low) return defaultPrice
    return Math.min(anchor - minPad, Math.max(anchor - maxPad, raw))
  }

  if (raw <= high) return defaultPrice
  return Math.max(anchor + minPad, Math.min(anchor + maxPad, raw))
}

const getKlineTimestampMs = (klineItem) => {
  const timestampRaw = klineItem?.timestamp ?? klineItem?.time
  let timestamp = Number(timestampRaw)
  if (!Number.isFinite(timestamp)) return null
  if (timestamp < 1e10) timestamp *= 1000
  return timestamp
}

const normalizeSignalSide = (signal) => {
  const explicitSide = String(signal?.side || '').toLowerCase()
  const rawType = String(signal?.type || signal?.action || 'buy').toLowerCase()
  const sideSource = explicitSide || rawType

  if (['sell', 'short', 'exit', 'close', 'close_long', 'reduce'].includes(sideSource)) return 'sell'
  if (['buy', 'long', 'entry', 'open', 'open_long', 'add'].includes(sideSource)) return 'buy'
  return rawType.includes('sell') || rawType.includes('short') || rawType.includes('exit') ? 'sell' : 'buy'
}

const defaultSignalText = (signal, side) => {
  if (signal?.text != null && String(signal.text).trim()) return String(signal.text)
  return side === 'buy' ? 'B' : 'S'
}

const defaultSignalColor = (signal, side) => {
  if (signal?.color) return signal.color
  return side === 'buy' ? '#22C55E' : '#EF4444'
}

const parseSignalValue = (value) => {
  if (value == null || value === false) {
    return { active: false, rawPrice: null }
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (FALSE_SIGNAL_STRINGS.has(normalized)) {
      return { active: false, rawPrice: null }
    }
    const rawPrice = isFinitePrice(value)
    return { active: true, rawPrice }
  }

  if (typeof value === 'number') {
    const rawPrice = isFinitePrice(value)
    return { active: rawPrice != null && rawPrice !== 0, rawPrice }
  }

  if (typeof value === 'boolean') {
    return { active: value, rawPrice: null }
  }

  if (typeof value === 'object') {
    const explicitActive = value.active ?? value.signal ?? value.triggered ?? value.hit ?? value.visible
    const rawPrice = isFinitePrice(value.price ?? value.value ?? value.y ?? value.data)
    const hasActiveFlag = explicitActive != null
    const active = hasActiveFlag ? Boolean(explicitActive) : rawPrice != null && rawPrice !== 0
    return {
      active,
      rawPrice,
      text: value.text ?? value.label ?? value.name,
      color: value.color
    }
  }

  return { active: false, rawPrice: null }
}

const signalRenderMode = (signal, activeCount, dataLength) => {
  const rawMode = String(signal?.renderMode || signal?.mode || '').toLowerCase()
  if (['event', 'events'].includes(rawMode)) return 'events'
  if (['point', 'points', 'marker', 'markers', 'raw'].includes(rawMode)) return 'points'
  if (['state', 'continuous', 'condition'].includes(rawMode)) return 'edge'

  const ratio = dataLength > 0 ? activeCount / dataLength : 0
  return ratio > 0.18 ? 'edge' : 'events'
}

const shouldRenderSignalEntry = (entries, index, mode) => {
  const entry = entries[index]
  if (!entry?.active) return false
  if (mode === 'points') return true
  if (mode === 'edge') {
    return !entries[index - 1]?.active
  }

  return true
}

const normalizeIndicatorRenderResult = (rawResult = {}, internalData = []) => {
  const result = rawResult && typeof rawResult === 'object' ? rawResult : {}
  const renderResult = {
    name: result.name ? String(result.name) : '',
    description: result.description ? String(result.description) : '',
    plots: Array.isArray(result.plots) ? result.plots : [],
    layers: Array.isArray(result.layers) ? result.layers : [],
    calculatedVars: result.calculatedVars && typeof result.calculatedVars === 'object'
      ? result.calculatedVars
      : {},
    signalPoints: []
  }

  if (!Array.isArray(result.signals) || !internalData.length) {
    return renderResult
  }

  const signalMarkerMetrics = buildSignalMarkerMetrics(internalData)
  const seenSignalKeys = new Set()

  for (const signal of result.signals) {
    if (!signal || !Array.isArray(signal.data)) continue

    const action = String(signal.type || signal.action || 'buy').toLowerCase()
    const side = normalizeSignalSide(signal)
    const isBuySignal = side === 'buy'
    const fallbackText = defaultSignalText(signal, side)
    const dataLength = Math.min(signal.data.length, internalData.length)
    const entries = Array.from({ length: dataLength }, (_, i) => parseSignalValue(signal.data[i]))
    const activeCount = entries.reduce((count, entry) => count + (entry.active ? 1 : 0), 0)
    const mode = signalRenderMode(signal, activeCount, dataLength)

    for (let i = 0; i < dataLength; i++) {
      if (!shouldRenderSignalEntry(entries, i, mode)) continue

      const entry = entries[i]
      const klineItem = internalData[i]
      const timestamp = getKlineTimestampMs(klineItem)
      if (timestamp == null) continue

      const anchorPrice = isBuySignal
        ? isFinitePrice(klineItem?.low)
        : isFinitePrice(klineItem?.high)
      const price = normalizeSignalMarkerPrice(entry.rawPrice, klineItem, side, signalMarkerMetrics)
      if (anchorPrice == null || price == null) continue

      let text = fallbackText
      if (Array.isArray(signal.textData) && signal.textData[i] != null) {
        text = signal.textData[i]
      } else if (entry.text != null && String(entry.text).trim()) {
        text = entry.text
      }

      const color = entry.color || defaultSignalColor(signal, side)
      const key = `${timestamp}:${side}:${String(text)}`
      if (seenSignalKeys.has(key)) continue
      seenSignalKeys.add(key)

      renderResult.signalPoints.push({
        timestamp,
        price,
        anchorPrice,
        side,
        action,
        color,
        text,
        rawPrice: entry.rawPrice
      })
    }
  }

  if (renderResult.signalPoints.length > MAX_RENDERED_SIGNAL_POINTS) {
    renderResult.signalPoints = renderResult.signalPoints.slice(-MAX_RENDERED_SIGNAL_POINTS)
  }

  return renderResult
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
        const signalY = coordinates[0].y

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
          const compactWidth = Math.max(18, Math.min(isBacktest ? 72 : 38, shortText.length * 7 + 10))
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
      createPointFigures: ({ coordinates, overlay, bounding }) => {
        if (!coordinates[0] || !coordinates[1]) return []
        const data = overlay.extendData || {}
        const x1 = Math.min(coordinates[0].x, coordinates[1].x)
        const x2 = data.extendRight === true && Number.isFinite(bounding?.width)
          ? Math.max(x1, bounding.width)
          : Math.max(coordinates[0].x, coordinates[1].x)
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
              borderSize: Number(data.borderSize ?? 1),
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
      createPointFigures: ({ coordinates, overlay, bounding }) => {
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
          const centered = data.textPosition === 'center'
          let textX = centered ? (coordinates[0].x + coordinates[1].x) / 2 : coordinates[1].x + 6
          if (!centered && data.keepTextVisible === true && Number.isFinite(bounding?.width)) {
            const width = measureLayerText(data.text, Number(data.fontSize || 10))
            textX = Math.max(4, Math.min(textX, bounding.width - width - 4))
          }
          const textY = centered ? (coordinates[0].y + coordinates[1].y) / 2 : coordinates[1].y
          const offset = Number(data.textOffsetY)
          figures.push({
            type: 'text',
            attrs: { x: textX, y: textY + (Number.isFinite(offset) ? offset : 0), text: String(data.text), align: centered ? 'center' : 'left', baseline: 'middle' },
            styles: {
              color: data.textColor || color,
              size: Number(data.fontSize || 10),
              weight: data.fontWeight || '600',
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
        if (timeSpan) metaText += ` 鐠?${timeSpan}`
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
      name: 'qdRectangle',
      totalStep: 3,
      lock: false,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ coordinates }) => {
        if (!coordinates[0] || !coordinates[1]) return []
        const x = Math.min(coordinates[0].x, coordinates[1].x)
        const y = Math.min(coordinates[0].y, coordinates[1].y)
        const width = Math.abs(coordinates[1].x - coordinates[0].x)
        const height = Math.abs(coordinates[1].y - coordinates[0].y)
        return [{
          type: 'rect',
          attrs: { x, y, width, height },
          styles: {
            style: 'stroke_fill',
            color: chartTheme.value === 'dark' ? 'rgba(41, 98, 255, 0.10)' : 'rgba(41, 98, 255, 0.08)',
            borderColor: '#5b8cff',
            borderSize: 1
          }
        }]
      }
    })

    registerOverlay({
      name: 'qdArrow',
      totalStep: 3,
      lock: false,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ coordinates }) => {
        if (!coordinates[0] || !coordinates[1]) return []
        const start = coordinates[0]
        const end = coordinates[1]
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const headLength = 10
        const wingOne = {
          x: end.x - headLength * Math.cos(angle - Math.PI / 6),
          y: end.y - headLength * Math.sin(angle - Math.PI / 6)
        }
        const wingTwo = {
          x: end.x - headLength * Math.cos(angle + Math.PI / 6),
          y: end.y - headLength * Math.sin(angle + Math.PI / 6)
        }
        const styles = { style: 'stroke', color: '#5b8cff', size: 1.5 }
        return [
          { type: 'line', attrs: { coordinates: [start, end] }, styles },
          { type: 'line', attrs: { coordinates: [end, wingOne] }, styles },
          { type: 'line', attrs: { coordinates: [end, wingTwo] }, styles }
        ]
      }
    })

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
      const bars = data.map(item => {
        const timeValue = alignKlineTimestampMs(item.time || item.timestamp)
        return {
          timestamp: timeValue,
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume || 0)
        }
      })
      return normalizeKlineSequence(bars)
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
        time: Math.floor(item.timestamp / 1000),
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

    const loadKlineData = async () => {
      if (!props.symbol) return
      const seededRows = Array.isArray(props.initialRows) ? props.initialRows : []
      const seedSignature = seededRows.length
        ? `${seededRows.length}:${seededRows[0] && seededRows[0].time}:${seededRows[seededRows.length - 1] && seededRows[seededRows.length - 1].time}`
        : ''
      const contextKey = JSON.stringify([
        props.market,
        props.symbol,
        props.timeframe,
        props.exchangeId,
        props.marketType,
        props.instrumentId,
        props.initialBeforeTime,
        props.initialLimit,
        seedSignature
      ])
      if (loading.value && contextKey === activeLoadContextKey) return
      const generation = ++loadGeneration
      activeLoadContextKey = contextKey

      stopRealtime()
      clearBacktestOverlays()

      loading.value = true
      error.value = null
      loadingHistory.value = false
      loadingHistoryPromise = null
      lastHistoryBeforeTimestamp = null
      lastHistoryLoadAt = 0
      suppressHistoryRangeUntil = Date.now() + 1200

      try {
        let formattedData = seededRows.length ? formatKlineData(seededRows) : []
        const initialLimit = getInitialKlineLimit()
        try {
          if (formattedData.length) {
            hasMoreHistory.value = false
          } else {
            const response = await request({
              url: '/api/indicator/kline',
              method: 'get',
              params: marketRequestParams({ limit: initialLimit, before_time: getInitialBeforeTime() }),
              timeout: 45000
            })

            if (generation !== loadGeneration) return

            if (response.code === 1 && response.data && Array.isArray(response.data)) {
              formattedData = formatKlineData(response.data)
            } else {
              let errMsg = response.msg || 'Failed to load K-line data'
              if (response.hint === 'tiingo_subscription') {
                errMsg = proxy.$t('dashboard.indicator.error.tiingoSubscription') || 'Forex 1-minute data requires Tiingo paid subscription'
              }
              throw new Error(errMsg)
            }
          }
        } catch (apiErr) {
          throw new Error(apiErr && apiErr.message ? apiErr.message : String(apiErr))
        }

        if (!formattedData || formattedData.length === 0) {
          throw new Error('No K-line data returned')
        }

        klineData.value = formattedData
        hasMoreHistory.value = !seededRows.length

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
                  maybeUpdateIndicators(true)
                }
              }, 100)
            }
          }

          if (props.realtimeEnabled) {
            startRealtime()
          }
        })
      } catch (err) {
        if (generation !== loadGeneration) return
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
        if (generation === loadGeneration) {
          loading.value = false
          activeLoadContextKey = ''
        }
      }
    }

    const loadMoreHistoryDataForScroll = async (timestamp) => {
      if (!props.symbol || !klineData.value || klineData.value.length === 0) {
        return
      }

      const beforeTimestamp = Number(timestamp)
      if (!Number.isFinite(beforeTimestamp)) {
        return
      }

      const now = Date.now()
      if (lastHistoryBeforeTimestamp === beforeTimestamp && now - lastHistoryLoadAt < 5000) {
        return
      }
      if (now - lastHistoryLoadAt < HISTORY_LOAD_COOLDOWN_MS) {
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
      lastHistoryBeforeTimestamp = beforeTimestamp
      lastHistoryLoadAt = now
      loadingHistoryPromise = (async () => {
        await nextTick()

        try {
          const beforeTime = Math.floor(beforeTimestamp / 1000)
          const response = await request({
            url: '/api/indicator/kline',
            method: 'get',
            params: marketRequestParams({
              limit: HISTORY_PAGE_LIMIT,
              before_time: beforeTime
            }),
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

            const filteredNewData = newData.filter(item => item.timestamp < beforeTimestamp)

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

            const mergedHistory = normalizeKlineSequence([...filteredNewData, ...klineData.value])
            const newDataCount = Math.max(0, mergedHistory.length - klineData.value.length)
            klineData.value = mergedHistory
            suppressHistoryRangeUntil = Date.now() + 1200

            nextTick(() => {
              if (chartRef.value) {
                const restoreDataIndex = savedVisibleRange && typeof savedVisibleRange.from === 'number'
                  ? Math.max(0, Math.round(savedVisibleRange.from + newDataCount))
                  : null

                const afterApply = () => {
                  if (restoreDataIndex !== null) {
                    requestAnimationFrame(() => {
                      suppressHistoryRangeUntil = Date.now() + 900
                      try {
                        if (chartRef.value && typeof chartRef.value.scrollToDataIndex === 'function') {
                          chartRef.value.scrollToDataIndex(restoreDataIndex, 0)
                        }
                      } catch (e) {
                      }
                    })
                  }
                  updateIndicators()
                }

                try {
                  chartRef.value.applyNewData(klineData.value, hasMoreHistory.value, afterApply)
                } catch (e) {
                  try {
                    chartRef.value.applyNewData(klineData.value)
                    afterApply()
                  } catch (e2) {
                    updateIndicators()
                  }
                }

                if (restoreDataIndex !== null && typeof chartRef.value.scrollToDataIndex !== 'function') {
                  setTimeout(() => {
                    try {
                      if (chartRef.value) {
                        suppressHistoryRangeUntil = Date.now() + 500
                      }
                    } catch (e) {
                    }
                  }, 50)
                }
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
            params: marketRequestParams({
              limit: HISTORY_PAGE_LIMIT,
              before_time: earliestTime
            }),
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

          klineData.value = normalizeKlineSequence([...filteredNewData, ...klineData.value])

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
          params: marketRequestParams({ limit: 3 }),
          timeout: 12000
        })

        if (response.code === 1 && response.data && Array.isArray(response.data) && response.data.length > 0) {
          const newData = formatKlineData(response.data)
          const existingData = [...klineData.value]

          if (newData.length > 0) {
            const existingLast = existingData[existingData.length - 1]
            const lastNew = newData[newData.length - 1]
            const newForwardBars = newData.filter(item => item.timestamp > existingLast.timestamp)

            if (newForwardBars.length > 0 && isRealtimeAppendGapSuspicious(existingLast.timestamp, newForwardBars[0].timestamp)) {
              scheduleRealtimeKlineResync()
              return
            }

            const existingTimestamps = new Set(existingData.map(item => item.timestamp))
            const mergedData = normalizeKlineSequence([...existingData, ...newData])
            const mergedLast = mergedData[mergedData.length - 1]
            const hasAppendedBars = mergedData.some(item => !existingTimestamps.has(item.timestamp))
            const lastChanged = mergedLast && (
              mergedLast.timestamp !== existingLast.timestamp ||
              klineBarSnapshotKey(mergedLast) !== klineBarSnapshotKey(existingLast)
            )

            if (!hasAppendedBars && !lastChanged && lastNew.timestamp <= existingLast.timestamp) {
              return
            }

            klineData.value = mergedData.length > 500 ? mergedData.slice(-500) : mergedData

            const internalData = convertToInternalFormat(klineData.value)
            updatePricePanel(internalData, { force: hasAppendedBars })

            if (hasAppendedBars) {
              const appendBars = mergedData.filter(item => !existingTimestamps.has(item.timestamp))
              appendRealtimeBarsToChart(appendBars)
              maybeUpdateIndicators(true)
            } else if (mergedLast && mergedLast.timestamp === existingLast.timestamp) {
              const bar = {
                timestamp: mergedLast.timestamp,
                open: mergedLast.open,
                high: mergedLast.high,
                low: mergedLast.low,
                close: mergedLast.close,
                volume: mergedLast.volume != null ? mergedLast.volume : 0
              }
              if (chartRef.value && typeof chartRef.value.updateData === 'function') {
                scheduleRealtimeChartBarUpdate(bar)
              } else if (chartRef.value) {
                try {
                  chartRef.value.applyNewData(klineData.value)
                } catch (_) {}
              }
              maybeUpdateIndicators(false)
            }
          }
        }
      } catch (err) {
      } finally {
        realtimeFetchInFlight.value = false
      }
    }

    const runRestRealtimeUpdate = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      if (!loading.value && props.symbol && klineData.value && klineData.value.length > 0) {
        updateKlineRealtime()
      }
    }

    const startRestPolling = (options = {}) => {
      if (realtimeTimer.value) {
        clearInterval(realtimeTimer.value)
      }
      if (restPollingKickTimer) {
        clearTimeout(restPollingKickTimer)
        restPollingKickTimer = null
      }
      realtimeInterval.value = getRealtimePollingInterval()

      if (props.realtimeEnabled && props.symbol && klineData.value.length > 0) {
        const kickDelay = Number(options.kickDelay)
        if (options.kick) {
          restPollingKickTimer = setTimeout(() => {
            restPollingKickTimer = null
            runRestRealtimeUpdate()
          }, Number.isFinite(kickDelay) ? Math.max(0, kickDelay) : 0)
        }
        realtimeTimer.value = setInterval(runRestRealtimeUpdate, realtimeInterval.value)
      }
    }

    const stopRestPolling = () => {
      if (restPollingKickTimer) {
        clearTimeout(restPollingKickTimer)
        restPollingKickTimer = null
      }
      if (realtimeTimer.value) {
        clearInterval(realtimeTimer.value)
        realtimeTimer.value = null
      }
    }

    const clearWsStaleWatchdog = () => {
      if (wsStaleTimer) {
        clearTimeout(wsStaleTimer)
        wsStaleTimer = null
      }
    }

    const armWsStaleWatchdog = () => {
      clearWsStaleWatchdog()
      if (!props.realtimeEnabled || !isCryptoMarket()) return
      wsStaleTimer = setTimeout(() => {
        wsStaleTimer = null
        if (wsActive.value && props.realtimeEnabled && props.symbol && klineData.value.length > 0) {
          startRestPolling({ kick: true, kickDelay: 0 })
        }
      }, 15000)
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
      armWsStaleWatchdog()
      const arr = klineData.value
      if (!arr || arr.length === 0) return

      const normalizedTimestamp = alignKlineTimestampMs(bar.timestamp)
      if (!normalizedTimestamp) return

      const normalizedBar = {
        timestamp: normalizedTimestamp,
        open: Number(bar.open),
        high: Number(bar.high),
        low: Number(bar.low),
        close: Number(bar.close),
        volume: Number(bar.volume || 0)
      }

      if (!Number.isFinite(normalizedBar.open) ||
          !Number.isFinite(normalizedBar.high) ||
          !Number.isFinite(normalizedBar.low) ||
          !Number.isFinite(normalizedBar.close)) {
        return
      }

      const lastBar = arr[arr.length - 1]

      if (normalizedBar.timestamp === lastBar.timestamp) {
        stopRestPolling()
        const merged = mergeKlineBar(lastBar, normalizedBar, lastBar.timestamp)
        if (klineBarSnapshotKey(merged) === klineBarSnapshotKey(lastBar)) {
          return
        }

        arr[arr.length - 1] = merged
        klineData.value = arr.slice()

        updatePricePanelFromLastBars(arr)

        pendingWsBar = merged
        if (wsTickRafId == null) {
          wsTickRafId = requestAnimationFrame(flushWsTick)
        }
        maybeUpdateIndicators(false)
      } else if (normalizedBar.timestamp > lastBar.timestamp) {
        if (isRealtimeAppendGapSuspicious(lastBar.timestamp, normalizedBar.timestamp)) {
          startRestPolling({ kick: true, kickDelay: 0 })
          scheduleRealtimeKlineResync()
          return
        }

        stopRestPolling()
        arr.push(normalizedBar)
        if (arr.length > 500) {
          arr.splice(0, arr.length - 500)
        }
        klineData.value = arr.slice()

        updatePricePanelFromLastBars(arr, true)

        appendRealtimeBarsToChart([normalizedBar])
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
      startRestPolling({ kick: true, kickDelay: 0 })
    }

    const handleWsReconnected = () => {
      startRestPolling({ kick: true, kickDelay: 0 })
      scheduleRealtimeKlineResync()
    }

    const handleWsError = () => {
      wsActive.value = false
      startRestPolling({ kick: true, kickDelay: 0 })
    }

    const _fetchExchangeId = async () => {
      const now = Date.now()
      if (_cachedExchangeId && (now - _exchangeIdTs) < 300000) return _cachedExchangeId
      try {
        const res = await request({ url: '/api/settings/public-config', method: 'get' })
        if (res && res.data && res.data.crypto_public_default_exchange) {
          _cachedExchangeId = res.data.crypto_public_default_exchange
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
        startRestPolling({ kick: true, kickDelay: 2500 })
        try {
          const exchangeId = props.exchangeId || await _fetchExchangeId()
          if (gen !== _realtimeGeneration) return
          if (!['binance', 'bitget', 'bybit', 'okx', 'gate', 'htx', 'huobi'].includes(String(exchangeId).toLowerCase())) return
          if (!wsClient) {
            wsClient = new ExchangeKlineWs()
          }
          const connecting = wsClient.connect(props.symbol, props.timeframe, {
            onTick: handleWsTick,
            onNewBar: handleWsNewBar,
            onError: handleWsError,
            onReconnecting: handleWsReconnecting,
            onReconnected: handleWsReconnected
          }, exchangeId, {
            marketType: props.marketType,
            instrumentId: props.instrumentId
          })
          wsActive.value = Boolean(connecting)
          if (connecting) armWsStaleWatchdog()
        } catch (_) {
          if (gen !== _realtimeGeneration) return
          wsActive.value = false
          startRestPolling({ kick: true, kickDelay: 0 })
        }
      } else {
        startRestPolling({ kick: true, kickDelay: 800 })
      }
    }

    const stopRealtime = () => {
      stopRestPolling()
      clearWsStaleWatchdog()
      if (realtimeResyncTimer) {
        clearTimeout(realtimeResyncTimer)
        realtimeResyncTimer = null
      }
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
      volPaneId = null

      try {
        const container = document.getElementById('kline-chart-container')
        if (!container) {
          throw new Error('K-line chart container is missing')
        }

        try {
          chartRef.value = init(container, {
            drawingBarVisible: true,
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
          throw new Error('K-line chart initialization failed')
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
        if (typeof chartRef.value.setOffsetRightDistance === 'function') {
          chartRef.value.setOffsetRightDistance(64)
        }
        if (typeof chartRef.value.setRightMinVisibleBarCount === 'function') {
          chartRef.value.setRightMinVisibleBarCount(4)
        }
        if (typeof chartRef.value.setBarSpace === 'function') {
          chartRef.value.setBarSpace(8)
        }
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
            const rows = typeof chartRef.value.getDataList === 'function' ? chartRef.value.getDataList() : []
            emit('load', { barCount: Array.isArray(rows) ? rows.length : 0 })
          })
        }

        if (chartRef.value && typeof chartRef.value.subscribeAction === 'function') {
          chartRef.value.subscribeAction('onOverlayCreated', (overlay) => {
            if (activeDrawingTool.value && overlay && overlay.id) {
              const toolMap = {
                line: 'segment',
                horizontalLine: 'horizontalStraightLine',
                horizontalRay: 'horizontalRayLine',
                horizontalSegment: 'horizontalSegment',
                verticalLine: 'verticalStraightLine',
                ray: 'rayLine',
                arrow: 'qdArrow',
                straightLine: 'straightLine',
                parallelStraightLine: 'parallelStraightLine',
                rectangle: 'qdRectangle',
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
              if (Date.now() < suppressHistoryRangeUntil) {
                lastVisibleFrom = data.from
                return
              }

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

              if (loadingHistory.value) {
                lastVisibleFrom = data.from
                return
              }

              const visibleBars = Math.max(1, (data.to || 0) - data.from)
              const leftThreshold = clampNumber(Math.ceil(visibleBars * 0.08), 3, 18)
              const reachedLeftEdge = data.from <= leftThreshold

              if (reachedLeftEdge && !loadingHistory.value && !loadingHistoryPromise && hasMoreHistory.value && chartInitialized.value) {
                const isScrollingLeft = lastVisibleFrom !== null && lastVisibleFrom > data.from
                const canLoadAgain = Date.now() - lastHistoryLoadAt >= HISTORY_LOAD_COOLDOWN_MS
                if (isScrollingLeft && canLoadAgain) {
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
              maybeUpdateIndicators(true)
            })
          }
        }

        window.addEventListener('resize', handleResize)
      } catch (error) {
        error.value = proxy.$t('dashboard.indicator.error.chartInitFailed') + ': ' + (error.message || 'Unknown error')
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
      const chartFontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      const upColor = '#089981'
      const downColor = '#f23645'

      chartRef.value.setStyles({
        grid: {
          show: true,
          horizontal: {
            show: true,
            color: theme.gridLineColor,
            style: 'solid',
            size: 1
          },
          vertical: {
            show: true,
            color: theme.gridLineColor,
            style: 'solid',
            size: 1
          }
        },
        candle: {
          type: normalizedCandleType(),
          priceMark: {
            show: true,
            high: {
              show: true,
              color: theme.axisLabelColor,
              textOffset: 5,
              textSize: 10,
              textFamily: chartFontFamily,
              textWeight: 'normal'
            },
            low: {
              show: true,
              color: theme.axisLabelColor,
              textOffset: 5,
              textSize: 10,
              textFamily: chartFontFamily,
              textWeight: 'normal'
            },
            last: {
              show: true,
              upColor,
              downColor,
              noChangeColor: theme.axisLabelColor,
              line: {
                show: true,
                style: 'dashed',
                dashedValue: [3, 3],
                size: 1
              },
              text: {
                show: true,
                color: '#ffffff',
                size: 11,
                family: chartFontFamily,
                weight: '600',
                paddingLeft: 5,
                paddingRight: 5,
                paddingTop: 3,
                paddingBottom: 3,
                borderRadius: 2
              }
            }
          },
          tooltip: {
            showRule: 'always',
            showType: 'standard',
            offsetLeft: 8,
            offsetTop: 31,
            offsetRight: 8,
            offsetBottom: 5,
            text: {
              size: 11,
              family: chartFontFamily,
              weight: 'normal',
              color: theme.textColorSecondary,
              marginLeft: 4,
              marginRight: 6,
              marginTop: 2,
              marginBottom: 2
            },
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
            upColor,
            downColor,
            noChangeColor: theme.axisLabelColor,
            upBorderColor: upColor,
            downBorderColor: downColor,
            noChangeBorderColor: theme.axisLabelColor,
            upWickColor: upColor,
            downWickColor: downColor,
            noChangeWickColor: theme.axisLabelColor
          },
          area: {
            point: { animation: false, animationDuration: 0 }
          }
        },
        indicator: {
          ohlc: {
            upColor: 'rgba(8, 153, 129, 0.72)',
            downColor: 'rgba(242, 54, 69, 0.72)',
            noChangeColor: theme.axisLabelColor
          },
          lastValueMark: {
            show: false
          },
          tooltip: {
            showRule: 'always',
            showType: 'standard',
            showName: true,
            showParams: true,
            offsetLeft: 8,
            offsetTop: 4,
            offsetRight: 8,
            offsetBottom: 4,
            text: {
              size: 11,
              family: chartFontFamily,
              weight: 'normal',
              color: theme.textColorSecondary,
              marginLeft: 4,
              marginRight: 6,
              marginTop: 2,
              marginBottom: 2
            }
          }
        },
        xAxis: {
          show: true,
          axisLine: {
            show: false,
            color: theme.borderColor
          },
          tickLine: {
            show: false,
            color: theme.borderColor,
            size: 1,
            length: 0
          },
          tickText: {
            show: true,
            color: theme.axisLabelColor,
            size: 11,
            family: chartFontFamily,
            weight: 'normal',
            marginStart: 4,
            marginEnd: 4
          }
        },
        yAxis: {
          show: true,
          axisLine: {
            show: false,
            color: theme.borderColor
          },
          tickLine: {
            show: false,
            color: theme.borderColor,
            size: 1,
            length: 0
          },
          tickText: {
            show: true,
            color: theme.axisLabelColor,
            size: 11,
            family: chartFontFamily,
            weight: 'normal',
            marginStart: 5,
            marginEnd: 5
          }
        },
        separator: {
          size: 1,
          color: theme.borderColor,
          fill: true,
          activeBackgroundColor: isDark ? 'rgba(120, 123, 134, 0.12)' : 'rgba(106, 109, 120, 0.08)'
        },
        crosshair: {
          show: true,
          horizontal: {
            show: true,
            line: {
              show: true,
              style: 'dashed',
              color: theme.gridLineColorDashed,
              size: 1,
              dashedValue: [4, 3]
            },
            text: {
              show: true,
              color: '#ffffff',
              backgroundColor: isDark ? '#363a45' : '#6a6d78',
              size: 11,
              family: chartFontFamily,
              weight: 'normal',
              paddingLeft: 5,
              paddingRight: 5,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 2
            }
          },
          vertical: {
            show: true,
            line: {
              show: true,
              style: 'dashed',
              color: theme.gridLineColorDashed,
              size: 1,
              dashedValue: [4, 3]
            },
            text: {
              show: true,
              color: '#ffffff',
              backgroundColor: isDark ? '#363a45' : '#6a6d78',
              size: 11,
              family: chartFontFamily,
              weight: 'normal',
              paddingLeft: 5,
              paddingRight: 5,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 2
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

    const CUSTOM_INDICATOR_RENDER_VERSION = 'r14'
    const LAMP_FIGURE_TYPES = ['lamp', 'dot', 'point', 'scatter', 'circle']

    const hashCustomIndicatorSignature = (value) => {
      const text = String(value || '')
      let hash = 2166136261
      for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i)
        hash = Math.imul(hash, 16777619)
      }
      return (hash >>> 0).toString(36)
    }

    const normalizeCustomFigureType = (type) => {
      const rawType = String(type || 'line').toLowerCase()
      if (LAMP_FIGURE_TYPES.includes(rawType)) return 'circle'
      if (['histogram', 'column'].includes(rawType)) return 'bar'
      if (['circle', 'bar', 'line'].includes(rawType)) return rawType
      return 'line'
    }

    const toPositiveNumber = (value, fallback) => {
      const numeric = Number(value)
      return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
    }

    const getPlotPointValue = (point) => {
      if (point && typeof point === 'object') {
        const value = point.value ?? point.y ?? point.data
        return value == null ? null : value
      }
      return point
    }

    const getPlotPointColor = (point) => {
      if (point && typeof point === 'object') {
        return point.color || point.fillColor || point.backgroundColor || null
      }
      return null
    }

    const getPlotPointSize = (point) => {
      if (point && typeof point === 'object') {
        const size = Number(point.size ?? point.radius ?? point.r)
        return Number.isFinite(size) && size > 0 ? size : null
      }
      return null
    }

    const isTruthyLampValue = (value) => {
      if (value == null) return false
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (!normalized || ['0', 'false', 'off', 'nan', 'none', 'null'].includes(normalized)) return false
        return true
      }
      const numeric = Number(value)
      return Number.isFinite(numeric) && numeric !== 0
    }

    const normalizePlotDataSeries = (data, options = {}) => {
      if (!Array.isArray(data)) return []
      if (options.forceLamp) {
        const lane = Number(options.lampLane)
        const fallbackLane = Number.isFinite(lane) && lane > 0 ? lane : 1
        return data.map(point => {
          const value = getPlotPointValue(point)
          return isTruthyLampValue(value) ? fallbackLane : null
        })
      }
      return data.map(getPlotPointValue)
    }

    const getKLineTimeKey = (item) => {
      const raw = Number(item?.timestamp ?? item?.time)
      if (!Number.isFinite(raw)) return null
      return raw > 1e10 ? Math.floor(raw / 1000) : Math.floor(raw)
    }

    const buildAlignedPlotRows = (sourceData, plotDataMap, targetData) => {
      const sourceRows = Array.isArray(sourceData) ? sourceData : []
      const targetRows = Array.isArray(targetData) ? targetData : []
      const sourceIndexByTime = new Map()

      sourceRows.forEach((item, index) => {
        const timeKey = getKLineTimeKey(item)
        if (timeKey !== null) {
          sourceIndexByTime.set(timeKey, index)
        }
      })

      return targetRows.map((item, fallbackIndex) => {
        const timeKey = getKLineTimeKey(item)
        const sourceIndex = timeKey !== null && sourceIndexByTime.has(timeKey)
          ? sourceIndexByTime.get(timeKey)
          : fallbackIndex
        const dataPoint = {}
        for (const figureKey in plotDataMap) {
          const plotData = plotDataMap[figureKey]
          dataPoint[figureKey] = sourceIndex >= 0 && sourceIndex < plotData.length
            ? plotData[sourceIndex]
            : null
        }
        return dataPoint
      })
    }

    const extractPlotColorSeries = (data) => {
      if (!Array.isArray(data)) return []
      return data.map(getPlotPointColor)
    }

    const extractPlotSizeSeries = (data) => {
      if (!Array.isArray(data)) return []
      return data.map(getPlotPointSize)
    }

    const isLampType = (type) => LAMP_FIGURE_TYPES.includes(String(type || '').toLowerCase())

    const looksLikeLampPlot = (plot) => {
      if (!plot) return false
      if (isLampType(plot.type)) return true
      const name = String(plot.name || plot.title || '').toLowerCase()
      const lampNamePattern = /(lamp|light|red|green|on|off|bull|bear|signal|state|trend)/
      if (!lampNamePattern.test(name)) return false
      const data = Array.isArray(plot.data) ? plot.data : []
      const sample = data.map(getPlotPointValue).filter(value => value != null).slice(0, 80)
      if (!sample.length) return true
      const numericSample = sample.map(Number).filter(Number.isFinite)
      if (!numericSample.length) return true
      const uniqueValues = new Set(numericSample.map(value => Number(value.toFixed(6))))
      const integerish = numericSample.every(value => Math.abs(value - Math.round(value)) < 1e-6)
      return integerish && uniqueValues.size <= 8
    }

    // Legacy lane parser kept for compatibility reference while v2 handles current lamp belts.
    // eslint-disable-next-line no-unused-vars
    const getLampLaneKey = (plot, plotIdx) => {
      const rawName = String(plot?.name || plot?.title || `lamp_${plotIdx}`)
      const key = rawName
        .replace(/\b(red|green|on|off|bullish|bearish|bull|bear|long|short|up|down|light|lamp)\b/ig, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return key || `lamp_${plotIdx}`
    }

    const isLampSummaryPlot = (plot) => {
      const name = String(plot?.name || plot?.title || '').toLowerCase()
      return /(count|score|total|sum|summary)/.test(name)
    }

    const getLampLaneKeyV2 = (plot, plotIdx) => {
      const explicitLabel = plot?.laneLabel ?? plot?.rowLabel ?? plot?.label ?? plot?.group ?? plot?.laneName
      const rawName = String(explicitLabel || plot?.name || plot?.title || `lamp_${plotIdx}`)
      const key = rawName
        .replace(/\b(red|green|on|off|bullish|bearish|bull|bear|long|short|up|down|light|lamp|buy|sell|entry|exit|signal|signals)\b/ig, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return key || `L${plotIdx + 1}`
    }

    const resolveLampColor = (color, fallback = '#22c55e') => {
      const normalized = String(color || '').toLowerCase()
      if (normalized.includes('ff3b30') || normalized.includes('ef4444') || normalized.includes('red')) return '#ff4d4f'
      if (normalized.includes('35c759') || normalized.includes('22c55e') || normalized.includes('green')) return '#22c55e'
      return color || fallback
    }

    const createLampBeltMeta = (plots) => {
      const laneKeys = []
      const laneKeyByIndex = new Map()

      plots.forEach((plot, plotIdx) => {
        if (!looksLikeLampPlot(plot) || isLampSummaryPlot(plot)) return
        const laneKey = getLampLaneKeyV2(plot, plotIdx)
        laneKeyByIndex.set(plotIdx, laneKey)
        if (!laneKeys.includes(laneKey)) laneKeys.push(laneKey)
      })

      if (laneKeys.length < 3) {
        return { enabled: false, laneByIndex: new Map(), hiddenIndexes: new Set(), laneCount: 0 }
      }

      const laneByIndex = new Map()
      const labelByLane = new Map()
      laneKeyByIndex.forEach((laneKey, plotIdx) => {
        const laneIndex = laneKeys.indexOf(laneKey)
        const lane = laneKeys.length - laneIndex
        laneByIndex.set(plotIdx, lane)
        labelByLane.set(lane, laneKey)
      })

      const hiddenIndexes = new Set()
      plots.forEach((plot, plotIdx) => {
        if (isLampSummaryPlot(plot)) hiddenIndexes.add(plotIdx)
      })

      return { enabled: true, laneByIndex, hiddenIndexes, laneCount: laneKeys.length, labelByLane, laneKeys }
    }

    const buildCustomPlotFigure = (plot, plotIdx, fallbackName, options = {}) => {
      const plotName = plot.name || fallbackName || `PLOT_${plotIdx}`
      const safeKeyBase = String(plotName)
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/^_+|_+$/g, '')
      const figureKey = safeKeyBase || `plot_${plotIdx}`
      const figureType = options.forceLamp ? 'bar' : normalizeCustomFigureType(plot.type)
      const plotColor = plot.color || getIndicatorColor(plotIdx)
      const pointSize = toPositiveNumber(plot.size ?? plot.radius, ['circle'].includes(figureType) ? 5 : 1.5)
      const lineSize = toPositiveNumber(plot.lineWidth ?? plot.size, 1.5)
      const borderSize = toPositiveNumber(plot.borderSize, 1)
      const styleColor = plotColor
      const colorKey = `${figureKey}__color`
      const sizeKey = `${figureKey}__size`
      const resolveRuntimeStyle = (indicatorData = {}) => {
        const runtimeColor = indicatorData[colorKey] || styleColor
        const runtimeSize = toPositiveNumber(indicatorData[sizeKey], pointSize)
        const style = {
          color: runtimeColor
        }
        const opacity = Number(plot.opacity)
        if (Number.isFinite(opacity)) {
          style.opacity = opacity
        }
        return { style, runtimeColor, runtimeSize }
      }

      const figure = {
        key: figureKey,
        title: options.forceLamp ? '' : (plot.title === false ? '' : (plot.title || plot.name || plotName)),
        type: figureType,
        lamp: options.forceLamp
          ? {
              lane: options.lampLane,
              label: getLampLaneKeyV2(plot, plotIdx),
              color: resolveLampColor(plotColor),
              size: pointSize
            }
          : null,
        styles: (data) => {
          const indicatorData = data?.current?.indicatorData || {}
          const { style: commonStyle, runtimeColor, runtimeSize } = resolveRuntimeStyle(indicatorData)

          if (figureType === 'circle') {
            return {
              ...commonStyle,
              borderColor: plot.borderColor || runtimeColor,
              borderSize,
              r: runtimeSize,
              radius: runtimeSize
            }
          }

          if (figureType === 'bar') {
            return {
              ...commonStyle,
              style: options.forceLamp ? 'fill' : commonStyle.style,
              borderColor: plot.borderColor || runtimeColor,
              borderSize: options.forceLamp ? 0 : borderSize
            }
          }

          return {
            ...commonStyle,
            size: lineSize,
            style: plot.lineStyle || plot.style || 'solid'
          }
        }
      }

      if (figureType === 'circle') {
        figure.attrs = ({ coordinate, data }) => {
          const indicatorData = data?.current || {}
          const { runtimeSize } = resolveRuntimeStyle(indicatorData)
          const currentCoordinate = coordinate?.current || {}
          return {
            x: currentCoordinate.x,
            y: currentCoordinate[figureKey],
            r: runtimeSize
          }
        }
      }

      if (options.forceLamp && figureType === 'bar') {
        figure.attrs = ({ coordinate, data, barSpace, bounding }) => {
          const indicatorData = data?.current || {}
          const currentCoordinate = coordinate?.current || {}
          const runtimeSize = toPositiveNumber(indicatorData[sizeKey], pointSize)
          const baseBarWidth = Number(barSpace?.bar ?? barSpace?.gapBar ?? 8)
          const width = Math.max(3, Math.min(5, (Number.isFinite(baseBarWidth) ? baseBarWidth : 8) * 0.42, runtimeSize * 0.82))
          const height = Math.max(8, Math.min(12, runtimeSize * 2.15))
          const reservedLeft = Number(bounding?.left || 0) + 82
          const x = Number(currentCoordinate.x)
          if (!Number.isFinite(x) || x < reservedLeft) {
            return { x: -9999, y: -9999, width: 0, height: 0 }
          }
          return {
            x: x - width / 2,
            y: currentCoordinate[figureKey] - height / 2,
            width,
            height,
            r: height / 2
          }
        }
      }

      if (figureType === 'bar' && plot.baseValue != null) {
        figure.baseValue = Number(plot.baseValue)
      }

      return { figureKey, figure, colorKey, sizeKey }
    }

    const hasLampStylePlots = (plots, lampBeltMeta = null) => {
      if (lampBeltMeta?.enabled) return true
      return Array.isArray(plots) && plots.some(plot => isLampType(plot?.type))
    }

    const getCustomPaneOptions = (plots, lampBeltMeta = null) => {
      const lampLaneCount = Number(lampBeltMeta?.laneCount || 0)
      const lampHeight = Math.max(170, Math.min(280, 82 + lampLaneCount * 22))
      return {
        height: hasLampStylePlots(plots, lampBeltMeta) ? lampHeight : 100,
        dragEnabled: true
      }
    }

    const drawRoundedRect = (ctx, x, y, width, height, radius) => {
      const r = Math.max(0, Math.min(radius, width / 2, height / 2))
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + width - r, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + r)
      ctx.lineTo(x + width, y + height - r)
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
      ctx.lineTo(x + r, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
    }

    // Legacy lamp renderer kept for compatibility reference while v2 handles current lamp belts.
    // eslint-disable-next-line no-unused-vars
    const createLampBeltDraw = (lampBeltMeta, displayName) => {
      if (!lampBeltMeta?.enabled) return null
      return ({ ctx, indicator, visibleRange, bounding, barSpace, xAxis, yAxis }) => {
        try {
          const result = indicator.result || []
          const figures = (indicator.figures || []).filter(figure => figure?.lamp)
          if (!figures.length || !result.length) return false

          const isDark = chartTheme.value === 'dark'
          const leftPad = 12
          const topPad = 26
          const bottomPad = 8
          const labelWidth = 76
          const chartLeft = bounding.left || 0
          const chartTop = bounding.top || 0
          const chartWidth = bounding.width || 0
          const chartHeight = bounding.height || 0
          const bodyTop = chartTop + topPad
          const bodyHeight = Math.max(24, chartHeight - topPad - bottomPad)
          const rowCount = Math.max(1, Number(lampBeltMeta.laneCount || 0))
          const rowHeight = bodyHeight / rowCount
          const baseBarWidth = Number(barSpace?.bar ?? barSpace?.gapBar ?? 8)
          const lampWidth = Math.max(3, Math.min(5, (Number.isFinite(baseBarWidth) ? baseBarWidth : 8) * 0.42))
          const lampHeight = Math.max(8, Math.min(12, rowHeight * 0.44))
          const from = Math.max(0, Math.floor(visibleRange?.from ?? visibleRange?.realFrom ?? 0) - 1)
          const to = Math.min(result.length - 1, Math.ceil(visibleRange?.to ?? visibleRange?.realTo ?? result.length - 1) + 1)

          ctx.save()

          const panelBg = isDark ? 'rgba(255,255,255,0.018)' : 'rgba(17,24,39,0.022)'
          const rowBg = isDark ? 'rgba(255,255,255,0.026)' : 'rgba(17,24,39,0.03)'
          const rowLine = isDark ? 'rgba(255,255,255,0.045)' : 'rgba(17,24,39,0.06)'
          const labelBg = isDark ? 'rgba(8,12,18,0.72)' : 'rgba(255,255,255,0.84)'
          const labelBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)'
          const textColor = isDark ? 'rgba(220,226,235,0.82)' : 'rgba(45,55,72,0.84)'
          const mutedText = isDark ? 'rgba(215,222,232,0.86)' : 'rgba(45,55,72,0.88)'

          drawRoundedRect(ctx, chartLeft + 6, chartTop + 7, Math.max(0, chartWidth - 12), Math.max(0, chartHeight - 14), 8)
          ctx.fillStyle = panelBg
          ctx.fill()

          ctx.font = '600 12px Inter, Arial, sans-serif'
          ctx.fillStyle = textColor
          ctx.fillText(displayName || indicator.shortName || 'Lamp Belt', chartLeft + leftPad, chartTop + 17)

          ctx.font = '700 10px Inter, Arial, sans-serif'
          const getLaneY = (lane) => {
            const numericLane = Number(lane)
            if (!Number.isFinite(numericLane)) return null
            const clampedLane = Math.max(1, Math.min(rowCount, numericLane))
            return bodyTop + (rowCount - clampedLane + 0.5) * rowHeight
          }

          for (let lane = 1; lane <= rowCount; lane++) {
            const yCenter = getLaneY(lane)
            if (!Number.isFinite(yCenter)) continue
            const rowY = yCenter - rowHeight * 0.38
            if (lane % 2 === 0) {
              drawRoundedRect(ctx, chartLeft + 8, rowY, Math.max(0, chartWidth - 16), rowHeight * 0.76, 5)
              ctx.fillStyle = rowBg
              ctx.fill()
            }
            ctx.beginPath()
            ctx.moveTo(chartLeft + labelWidth + 8, yCenter)
            ctx.lineTo(chartLeft + chartWidth - 10, yCenter)
            ctx.strokeStyle = rowLine
            ctx.lineWidth = 1
            ctx.stroke()

            const label = lampBeltMeta.labelByLane?.get(lane) || `L${lane}`
            const normalizedLabel = String(label)
              .replace(/[_-]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .toUpperCase()
              .slice(0, 8)
            drawRoundedRect(ctx, chartLeft + 8, yCenter - 9, labelWidth - 16, 18, 5)
            ctx.fillStyle = labelBg
            ctx.fill()
            ctx.strokeStyle = labelBorder
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.fillStyle = mutedText
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(normalizedLabel, chartLeft + labelWidth / 2, yCenter)
          }

          const minLampX = chartLeft + labelWidth + 12
          const maxLampX = chartLeft + chartWidth - 10
          for (let i = from; i <= to; i++) {
            const x = xAxis.convertToPixel(i)
            if (!Number.isFinite(x) || x < minLampX || x > maxLampX) continue
            const item = result[i] || {}
            for (const figure of figures) {
              const lane = Number(item[figure.key])
              if (!Number.isFinite(lane) || lane < 1 || lane > rowCount) continue
              const yCenter = getLaneY(lane)
              if (!Number.isFinite(yCenter)) continue
              const color = resolveLampColor(item[`${figure.key}__color`] || figure.lamp?.color)
              const x0 = x - lampWidth / 2
              const y0 = yCenter - lampHeight / 2
              drawRoundedRect(ctx, x0, y0, lampWidth, lampHeight, lampWidth / 2)
              ctx.fillStyle = color
              ctx.fill()
            }
          }

          ctx.font = '700 10px Inter, Arial, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          for (let lane = 1; lane <= rowCount; lane++) {
            const yCenter = getLaneY(lane)
            if (!Number.isFinite(yCenter)) continue
            const label = lampBeltMeta.labelByLane?.get(lane) || `L${lane}`
            const normalizedLabel = String(label)
              .replace(/[_-]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .toUpperCase()
              .slice(0, 8)
            drawRoundedRect(ctx, chartLeft + 8, yCenter - 9, labelWidth - 16, 18, 5)
            ctx.fillStyle = labelBg
            ctx.fill()
            ctx.strokeStyle = labelBorder
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.fillStyle = mutedText
            ctx.fillText(normalizedLabel, chartLeft + labelWidth / 2, yCenter)
          }

          ctx.textAlign = 'left'
          ctx.textBaseline = 'alphabetic'

          ctx.restore()
          return true
        } catch (error) {
          try {
            ctx.restore()
          } catch (_) {}
          return false
        }
      }
    }

    const createLampBeltDrawV2 = (displayName) => {
      return ({ ctx, indicator, bounding }) => {
        const lampBelt = indicator?.extendData?.lampBelt
        if (!lampBelt?.enabled) return false

        try {
          const isDark = chartTheme.value === 'dark'
          const chartLeft = Number(bounding?.left || 0)
          const chartTop = Number(bounding?.top || 0)
          const chartWidth = Number(bounding?.width || 0)
          const chartHeight = Number(bounding?.height || 0)
          const rowCount = Math.max(1, Number(lampBelt.laneCount || 0))
          if (!chartWidth || !chartHeight || !rowCount) return false

          const leftPad = 12
          const topPad = 26
          const bottomPad = 8
          const labelWidth = 82
          const bodyTop = chartTop + topPad
          const bodyHeight = Math.max(24, chartHeight - topPad - bottomPad)
          const rowHeight = bodyHeight / rowCount
          const lanes = Array.isArray(lampBelt.lanes) ? lampBelt.lanes : []
          const labelByLane = new Map(lanes.map(item => [Number(item.lane), item.label]))

          const panelBg = isDark ? 'rgba(255,255,255,0.018)' : 'rgba(17,24,39,0.022)'
          const rowBg = isDark ? 'rgba(255,255,255,0.026)' : 'rgba(17,24,39,0.03)'
          const rowLine = isDark ? 'rgba(255,255,255,0.045)' : 'rgba(17,24,39,0.06)'
          const labelBg = isDark ? 'rgba(8,12,18,0.84)' : 'rgba(255,255,255,0.9)'
          const labelBorder = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.12)'
          const titleColor = isDark ? 'rgba(220,226,235,0.78)' : 'rgba(45,55,72,0.78)'
          const labelColor = isDark ? 'rgba(226,232,240,0.9)' : 'rgba(31,41,55,0.9)'

          const getLaneY = (lane) => {
            const numericLane = Number(lane)
            if (!Number.isFinite(numericLane)) return null
            const clampedLane = Math.max(1, Math.min(rowCount, numericLane))
            return bodyTop + (rowCount - clampedLane + 0.5) * rowHeight
          }

          ctx.save()
          drawRoundedRect(ctx, chartLeft + 6, chartTop + 7, Math.max(0, chartWidth - 12), Math.max(0, chartHeight - 14), 8)
          ctx.fillStyle = panelBg
          ctx.fill()

          ctx.font = '600 12px Inter, Arial, sans-serif'
          ctx.fillStyle = titleColor
          ctx.textAlign = 'left'
          ctx.textBaseline = 'alphabetic'
          ctx.fillText(displayName || indicator.shortName || 'Lamp Belt', chartLeft + leftPad, chartTop + 17)

          ctx.font = '700 10px Inter, Arial, sans-serif'
          for (let lane = 1; lane <= rowCount; lane++) {
            const yCenter = getLaneY(lane)
            if (!Number.isFinite(yCenter)) continue
            const rowY = yCenter - rowHeight * 0.38
            if (lane % 2 === 0) {
              drawRoundedRect(ctx, chartLeft + 8, rowY, Math.max(0, chartWidth - 16), rowHeight * 0.76, 5)
              ctx.fillStyle = rowBg
              ctx.fill()
            }

            ctx.beginPath()
            ctx.moveTo(chartLeft + labelWidth + 8, yCenter)
            ctx.lineTo(chartLeft + chartWidth - 10, yCenter)
            ctx.strokeStyle = rowLine
            ctx.lineWidth = 1
            ctx.stroke()

            const normalizedLabel = String(labelByLane.get(lane) || `L${lane}`)
              .replace(/[_-]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .toUpperCase()
              .slice(0, 8)
            drawRoundedRect(ctx, chartLeft + 8, yCenter - 9, labelWidth - 16, 18, 5)
            ctx.fillStyle = labelBg
            ctx.fill()
            ctx.strokeStyle = labelBorder
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.fillStyle = labelColor
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(normalizedLabel, chartLeft + labelWidth / 2, yCenter)
          }

          ctx.restore()
        } catch (error) {
          try {
            ctx.restore()
          } catch (_) {}
        }

        return false
      }
    }

    const createLampBeltExtendData = (lampBeltMeta, figures) => {
      if (!lampBeltMeta?.enabled) return null
      const lanes = []
      if (lampBeltMeta.labelByLane && typeof lampBeltMeta.labelByLane.forEach === 'function') {
        lampBeltMeta.labelByLane.forEach((label, lane) => {
          lanes.push({ lane, label })
        })
      }
      return {
        enabled: true,
        laneCount: lampBeltMeta.laneCount,
        lanes,
        figures: (figures || [])
          .filter(figure => figure?.lamp)
          .map(figure => ({
            key: figure.key,
            lane: figure.lamp.lane,
            label: figure.lamp.label,
            color: figure.lamp.color,
            size: figure.lamp.size
          }))
      }
    }

    const normalizeLampLaneLabel = (label, lane) => {
      return String(label || `L${lane}`)
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase()
        .slice(0, 8)
    }

    const appendLampLaneLabelFigures = (figures, plotDataMap, lampBeltMeta, dataLength) => {
      if (!lampBeltMeta?.enabled || !lampBeltMeta.labelByLane) return
      const total = Math.max(0, Number(dataLength || 0))
      if (!total) return

      lampBeltMeta.labelByLane.forEach((label, lane) => {
        const numericLane = Number(lane)
        if (!Number.isFinite(numericLane)) return
        const labelText = normalizeLampLaneLabel(label, numericLane)
        const bgKey = `__lamp_lane_${numericLane}_bg`
        const textKey = `__lamp_lane_${numericLane}_label`

        plotDataMap[bgKey] = Array(total).fill(numericLane)
        plotDataMap[textKey] = Array(total).fill(numericLane)

        figures.push({
          key: bgKey,
          title: '',
          type: 'rect',
          attrs: ({ coordinate, bounding }) => {
            const y = coordinate?.current?.[bgKey]
            const left = Number(bounding?.left || 0)
            if (!Number.isFinite(y)) return { x: -9999, y: -9999, width: 0, height: 0 }
            return {
              x: left + 8,
              y: y - 9,
              width: 58,
              height: 18
            }
          },
          styles: () => {
            const isDark = chartTheme.value === 'dark'
            return {
              style: 'stroke_fill',
              color: isDark ? 'rgba(8,12,18,0.86)' : 'rgba(255,255,255,0.92)',
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.12)',
              borderSize: 1
            }
          }
        })

        figures.push({
          key: textKey,
          title: '',
          type: 'text',
          attrs: ({ coordinate, bounding }) => {
            const y = coordinate?.current?.[textKey]
            const left = Number(bounding?.left || 0)
            if (!Number.isFinite(y)) return { x: -9999, y: -9999, text: '' }
            return {
              x: left + 14,
              y,
              text: labelText,
              align: 'left',
              baseline: 'middle'
            }
          },
          styles: () => ({
            color: chartTheme.value === 'dark' ? 'rgba(226,232,240,0.94)' : 'rgba(31,41,55,0.92)',
            size: 10,
            weight: '700'
          })
        })
      })
    }

    const createLampBeltTooltip = (displayName) => () => ({
      name: displayName || 'Lamp Belt',
      calcParamsText: '',
      icons: [],
      values: []
    })

    const registerCustomIndicator = (name, calcFunc, figures, calcParams = [], precision = -1, shouldOverlay = false, displayName = null, extraConfig = {}) => {
      if (precision < 0) precision = pricePrecision.value
      try {
        const indicatorConfig = {
          name,
          shortName: displayName || name,
          calc: calcFunc,
          figures,
          calcParams,
          precision,
          series: shouldOverlay ? 'price' : 'normal',
          ...extraConfig
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

    const layerEndPoint = (timestamp, value, extendBars, internalData) => {
      const bars = Number(extendBars)
      if (Number.isFinite(bars) && bars > 0) {
        return { dataIndex: internalData.length - 1 + Math.min(500, Math.floor(bars)), value }
      }
      return { timestamp, value }
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
              borderSize: layer.borderSize,
              extendRight: layer.extendRight,
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
              layerEndPoint(end, y2, layer.extendBars, internalData)
            ],
            extendData: {
              text: layer.text || layer.name || '',
              color: layer.color,
              lineWidth: layer.lineWidth,
              textPosition: layer.textPosition,
              textOffsetY: layer.textOffsetY,
              fontWeight: layer.fontWeight,
              keepTextVisible: layer.keepTextVisible,
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

    const renderIndicatorSignals = (signalPoints) => {
      if (!Array.isArray(signalPoints) || !signalPoints.length) return
      if (!chartRef.value || typeof chartRef.value.createOverlay !== 'function') return

      for (const point of signalPoints) {
        try {
          const overlayId = chartRef.value.createOverlay({
            name: 'signalTag',
            points: [
              { timestamp: point.timestamp, value: point.price },
              { timestamp: point.timestamp, value: point.anchorPrice }
            ],
            extendData: {
              text: point.text,
              color: point.color,
              side: point.side,
              action: point.action,
              price: point.price,
              rawPrice: point.rawPrice
            },
            lock: true
          }, 'candle_pane')

          if (overlayId) {
            addedSignalOverlayIds.value.push(overlayId)
          }
        } catch (overlayErr) {
          // Drawing overlays are best-effort; one failed marker should not break the chart.
        }
      }
    }

    const updateIndicators = async () => {
      if (indicatorsUpdating.value) {
        indicatorsUpdateQueued.value = true
        return
      }
      if (!chartRef.value || klineData.value.length === 0) {
        return
      }

      indicatorsUpdating.value = true
      const renderCycleId = ++indicatorRenderSeq
      const previousSignalOverlayIds = [...addedSignalOverlayIds.value]
      const previousIndicatorIds = [...addedIndicatorIds.value]
      addedSignalOverlayIds.value = []
      addedIndicatorIds.value = []
      try {
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
      const buildCustomPlotBundle = (plots, fallbackNameForIndex) => {
        const figures = []
        const plotDataMap = {}
        const lampBeltMeta = createLampBeltMeta(plots)
        const renderPlots = plots
          .map((plot, plotIdx) => ({ plot, plotIdx }))
          .filter(({ plotIdx }) => !lampBeltMeta.hiddenIndexes.has(plotIdx))

        for (const { plot, plotIdx } of renderPlots) {
          const forceLamp = lampBeltMeta.laneByIndex.has(plotIdx)
          const lampLane = lampBeltMeta.laneByIndex.get(plotIdx)
          const fallbackName = typeof fallbackNameForIndex === 'function'
            ? fallbackNameForIndex(plotIdx)
            : `PLOT_${plotIdx}`
          const { figureKey, figure, colorKey, sizeKey } = buildCustomPlotFigure(plot, plotIdx, fallbackName, {
            forceLamp,
            lampLane
          })

          figures.push(figure)
          plotDataMap[figureKey] = normalizePlotDataSeries(plot.data, {
            forceLamp,
            lampLane
          })
          plotDataMap[colorKey] = extractPlotColorSeries(plot.data)
          plotDataMap[sizeKey] = extractPlotSizeSeries(plot.data)
        }

        appendLampLaneLabelFigures(figures, plotDataMap, lampBeltMeta, internalData.length)
        return {
          figures,
          plotDataMap,
          lampBeltMeta,
          lampBeltExtendData: createLampBeltExtendData(lampBeltMeta, figures)
        }
      }
      const customPlotExtraConfig = (bundle, displayName) => bundle.lampBeltMeta.enabled
        ? {
            minValue: 1,
            maxValue: bundle.lampBeltMeta.laneCount,
            extendData: { lampBelt: bundle.lampBeltExtendData },
            draw: createLampBeltDrawV2(displayName),
            createTooltipDataSource: createLampBeltTooltip(displayName)
          }
        : {}

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

                const renderResult = normalizeIndicatorRenderResult(result, internalData)
                const allPlots = [...renderResult.plots]
                renderIndicatorLayers(renderResult.layers, internalData)
                renderIndicatorSignals(renderResult.signalPoints)

                if (allPlots.length > 0) {
                  const validPlots = allPlots.filter(plot => plot.data && Array.isArray(plot.data) && plot.data.length > 0)

                  if (validPlots.length > 0) {
                    let customIndicatorDisplayName = 'Custom Indicator'
                    if (renderResult.name) {
                      customIndicatorDisplayName = renderResult.name
                    }
                    const { overlayPlots, panePlots } = splitIndicatorPlotsByPane(validPlots)
                    const plotGroups = [
                      { plots: overlayPlots, shouldOverlay: true, groupName: 'overlay' },
                      { plots: panePlots, shouldOverlay: false, groupName: 'pane' }
                    ]

                    for (const group of plotGroups) {
                      if (!group.plots.length) continue
                      const bundle = buildCustomPlotBundle(group.plots, plotIdx => `PLOT_${plotIdx}_${idx}_${group.groupName}`)
                      const renderSignature = hashCustomIndicatorSignature(JSON.stringify({
                        version: CUSTOM_INDICATOR_RENDER_VERSION,
                        code: indicator.code || '',
                        group: group.groupName,
                        plots: group.plots.map(plot => ({
                          name: plot.name,
                          title: plot.title,
                          type: plot.type,
                          overlay: plot.overlay,
                          color: plot.color
                        })),
                        lampLaneCount: bundle.lampBeltMeta.laneCount
                      }))
                      const customIndicatorName = `${customIndicatorDisplayName}_${group.groupName}_${CUSTOM_INDICATOR_RENDER_VERSION}_${renderSignature}_${renderCycleId}`
                      try {
                        const registered = registerCustomIndicator(
                          customIndicatorName,
                          (kLineDataList) => buildAlignedPlotRows(internalData, bundle.plotDataMap, kLineDataList),
                          bundle.figures,
                          [],
                          2,
                          group.shouldOverlay,
                          customIndicatorDisplayName,
                          customPlotExtraConfig(bundle, customIndicatorDisplayName)
                        )

                        if (!registered) continue
                        if (group.shouldOverlay) {
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
                            getCustomPaneOptions(group.plots, bundle.lampBeltMeta)
                          )
                          if (indicatorId) {
                            addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                          }
                        }
                      } catch (plotErr) {
                      }
                    }
                  }
                }
              } else {
                const decryptInfo = {
                  id: indicator.originalId || indicator.id,
                  user_id: indicator.user_id || indicator.userId,
                  is_encrypted: indicator.is_encrypted || indicator.isEncrypted || 0
                }
                const pythonResult = await executePythonStrategy(
                  indicator.code,
                  internalData,
                  resolvePythonIndicatorParams(indicator),
                  decryptInfo
                )

                const renderResult = normalizeIndicatorRenderResult(pythonResult, internalData)
                const allPlots = [...renderResult.plots]
                renderIndicatorLayers(renderResult.layers, internalData)
                renderIndicatorSignals(renderResult.signalPoints)

                if (allPlots.length > 0) {
                  const validPlots = allPlots.filter(plot => plot.data && Array.isArray(plot.data) && plot.data.length > 0)

                  if (validPlots.length > 0) {
                    let customIndicatorDisplayName = 'Custom Indicator'
                    if (renderResult.name) {
                      customIndicatorDisplayName = renderResult.name
                    }
                    const { overlayPlots, panePlots } = splitIndicatorPlotsByPane(validPlots)
                    const plotGroups = [
                      { plots: overlayPlots, shouldOverlay: true, groupName: 'overlay' },
                      { plots: panePlots, shouldOverlay: false, groupName: 'pane' }
                    ]

                    for (const group of plotGroups) {
                      if (!group.plots.length) continue
                      const bundle = buildCustomPlotBundle(group.plots, plotIdx => `PLOT_${plotIdx}_${idx}_${group.groupName}`)
                      const renderSignature = hashCustomIndicatorSignature(JSON.stringify({
                        version: CUSTOM_INDICATOR_RENDER_VERSION,
                        code: indicator.code || '',
                        group: group.groupName,
                        plots: group.plots.map(plot => ({
                          name: plot.name,
                          title: plot.title,
                          type: plot.type,
                          overlay: plot.overlay,
                          color: plot.color
                        })),
                        lampLaneCount: bundle.lampBeltMeta.laneCount
                      }))
                      const customIndicatorName = `${customIndicatorDisplayName}_${group.groupName}_${CUSTOM_INDICATOR_RENDER_VERSION}_${renderSignature}_${renderCycleId}`

                      try {
                        if (group.shouldOverlay) {
                          addMainPaneOverlayEntry({
                            signature: `${customIndicatorName}_${idx}`,
                            figures: bundle.figures,
                            calc: (kLineDataList) => buildAlignedPlotRows(internalData, bundle.plotDataMap, kLineDataList)
                          })
                        } else {
                          const registered = registerCustomIndicator(
                            customIndicatorName,
                            (kLineDataList) => buildAlignedPlotRows(internalData, bundle.plotDataMap, kLineDataList),
                            bundle.figures,
                            [],
                            2,
                            false,
                            customIndicatorDisplayName,
                            customPlotExtraConfig(bundle, customIndicatorDisplayName)
                          )

                          if (registered) {
                            const indicatorId = chartRef.value.createIndicator(
                              customIndicatorName,
                              false,
                              getCustomPaneOptions(group.plots, bundle.lampBeltMeta)
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
              }
            } catch (err) {
            }
            continue
          }

          const indicatorStyle = normalizeIndicatorStyle(indicator.style || {}, getIndicatorColor(idx))
          const color = indicatorStyle.color
          const lineWidth = indicatorStyle.lineWidth
          const indicatorInstanceKey = String(indicator.instanceId || `${indicator.id}_${idx}`).replace(/[^a-zA-Z0-9_]/g, '_')
          const buildUniqueIndicatorName = (baseName) => `${baseName}_${indicatorInstanceKey}_${renderCycleId}`
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
          } else if (indicator.id === 'vwap') {
            const period = indicator.params?.period || 20
            try {
              addMainPaneOverlayEntry({
                signature: buildUniqueIndicatorName(`VWAP_${period}`),
                figures: [buildLineFigure(`vwap_${indicatorInstanceKey}`, `VWAP(${period})`, color, lineWidth)],
                calc: (kLineDataList) => {
                  const rows = []
                  const priceVolumes = []
                  const volumes = []
                  let priceVolumeSum = 0
                  let volumeSum = 0
                  kLineDataList.forEach((bar, barIndex) => {
                    const volume = Number(bar.volume) || 0
                    const typicalPrice = (Number(bar.high) + Number(bar.low) + Number(bar.close)) / 3
                    const priceVolume = typicalPrice * volume
                    priceVolumes.push(priceVolume)
                    volumes.push(volume)
                    priceVolumeSum += priceVolume
                    volumeSum += volume
                    if (barIndex >= period) {
                      priceVolumeSum -= priceVolumes[barIndex - period]
                      volumeSum -= volumes[barIndex - period]
                    }
                    rows.push({
                      [`vwap_${indicatorInstanceKey}`]: volumeSum > 0 ? priceVolumeSum / volumeSum : null
                    })
                  })
                  return rows
                }
              })
            } catch (err) {
            }
          } else if (indicator.id === 'sar') {
            const start = indicator.params?.start || 2
            const step = indicator.params?.step || 2
            const max = indicator.params?.max || 20
            const figureKey = `sar_${indicatorInstanceKey}`
            try {
              addMainPaneOverlayEntry({
                signature: buildUniqueIndicatorName(`SAR_${start}_${step}_${max}`),
                figures: [{
                  key: figureKey,
                  title: `SAR(${start},${step},${max})`,
                  type: 'circle',
                  styles: (data) => {
                    const sarValue = data?.current?.indicatorData?.[figureKey]
                    const bar = data?.current?.kLineData
                    const midpoint = bar ? (Number(bar.high) + Number(bar.low)) / 2 : 0
                    return {
                      color: Number(sarValue) < midpoint ? '#089981' : '#f23645',
                      size: Math.max(2, lineWidth)
                    }
                  }
                }],
                calc: (kLineDataList) => {
                  const startAf = start / 100
                  const stepAf = step / 100
                  const maxAf = max / 100
                  let acceleration = startAf
                  let extremePoint = -100
                  let increasing = false
                  let sar = 0
                  return kLineDataList.map((bar, barIndex) => {
                    const previousSar = sar
                    const high = Number(bar.high)
                    const low = Number(bar.low)
                    if (increasing) {
                      if (extremePoint === -100 || extremePoint < high) {
                        extremePoint = high
                        acceleration = Math.min(acceleration + stepAf, maxAf)
                      }
                      sar = previousSar + acceleration * (extremePoint - previousSar)
                      const previousLow = Number(kLineDataList[Math.max(1, barIndex) - 1].low)
                      const lowMin = Math.min(previousLow, low)
                      if (sar > low) {
                        sar = extremePoint
                        acceleration = startAf
                        extremePoint = -100
                        increasing = false
                      } else if (sar > lowMin) {
                        sar = lowMin
                      }
                    } else {
                      if (extremePoint === -100 || extremePoint > low) {
                        extremePoint = low
                        acceleration = Math.min(acceleration + stepAf, maxAf)
                      }
                      sar = previousSar + acceleration * (extremePoint - previousSar)
                      const previousHigh = Number(kLineDataList[Math.max(1, barIndex) - 1].high)
                      const highMax = Math.max(previousHigh, high)
                      if (sar < high) {
                        sar = extremePoint
                        acceleration = 0
                        extremePoint = -100
                        increasing = true
                      } else if (sar < highMax) {
                        sar = highMax
                      }
                    }
                    return { [figureKey]: sar }
                  })
                }
              })
            } catch (err) {
            }
          } else if (['roc', 'mtm', 'bias', 'trix'].includes(indicator.id)) {
            const nativeConfigs = {
              roc: {
                name: 'ROC',
                params: [indicator.params?.period || 12, indicator.params?.smoothing || 6]
              },
              mtm: {
                name: 'MTM',
                params: [indicator.params?.period || 12, indicator.params?.smoothing || 6]
              },
              bias: {
                name: 'BIAS',
                params: [indicator.params?.short || 6, indicator.params?.medium || 12, indicator.params?.long || 24]
              },
              trix: {
                name: 'TRIX',
                params: [indicator.params?.period || 12, indicator.params?.smoothing || 9]
              }
            }
            const nativeConfig = nativeConfigs[indicator.id]
            try {
              const paneId = chartRef.value.createIndicator(
                { name: nativeConfig.name, calcParams: nativeConfig.params },
                false,
                { height: 100, dragEnabled: true }
              )
              if (paneId) {
                addedIndicatorIds.value.push({ paneId, name: nativeConfig.name })
              }
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
                  buildLineFigure(`upper_${indicatorInstanceKey}`, `Upper(${length},${mult})`, color, lineWidth),
                  buildLineFigure(`middle_${indicatorInstanceKey}`, `Middle(${length})`, '#8c8c8c', lineWidth),
                  buildLineFigure(`lower_${indicatorInstanceKey}`, `Lower(${length},${mult})`, color, lineWidth)
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
          const combinedName = `QD_MAIN_OVERLAY_${mainPaneOverlaySignatureParts.join('_').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 120)}_${renderCycleId}`
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
      const renderedCount = addedSignalOverlayIds.value.length + addedIndicatorIds.value.length
      const activeIndicatorCount = Array.isArray(props.activeIndicators) ? props.activeIndicators.length : 0
      if (renderedCount > 0 || activeIndicatorCount === 0) {
        removeSignalOverlayBatch(previousSignalOverlayIds)
        removeIndicatorBatch(previousIndicatorIds)
      } else {
        addedSignalOverlayIds.value = previousSignalOverlayIds
        addedIndicatorIds.value = previousIndicatorIds
      }
      } catch (e) {
        removeSignalOverlayBatch(addedSignalOverlayIds.value)
        removeIndicatorBatch(addedIndicatorIds.value)
        addedSignalOverlayIds.value = previousSignalOverlayIds
        addedIndicatorIds.value = previousIndicatorIds
      } finally {
        indicatorsUpdating.value = false
        emit('indicators-updated')
        if (indicatorsUpdateQueued.value) {
          indicatorsUpdateQueued.value = false
          setTimeout(() => {
            updateIndicators()
          }, 0)
        }
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

    watch(
      () => [
        props.market,
        props.symbol,
        props.timeframe,
        props.exchangeId,
        props.marketType,
        props.instrumentId,
        props.initialBeforeTime,
        props.initialLimit,
        Array.isArray(props.initialRows) ? props.initialRows.length : 0,
        Array.isArray(props.initialRows) && props.initialRows.length ? props.initialRows[0].time : null,
        Array.isArray(props.initialRows) && props.initialRows.length ? props.initialRows[props.initialRows.length - 1].time : null
      ],
      () => {
        if (props.symbol) loadKlineData()
      },
      { immediate: true }
    )
    watch(() => props.theme, (newTheme) => {
      chartTheme.value = newTheme
      if (chartRef.value) {
        updateChartTheme()
        updateIndicators()
      }
      nextTick(() => _ensureWmLayer())
    })

    watch(() => props.candleType, () => {
      if (chartRef.value) updateChartTheme()
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

    // Watermark layer with a lightweight tamper check.
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
      volPaneId = null
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
      volumeVisible,
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

.chart-left.chart-left--full {
  width: 100% !important;
  min-width: 100% !important;
  flex: 1 1 100% !important;
  border-right: none;
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
  width: 34px;
  background: #fff;
  border-right: 1px solid #e0e3eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 3px;
  gap: 2px;
  z-index: 10;
  overflow-y: auto;
  overflow-x: hidden;
}

.chart-left.theme-dark .drawing-toolbar {
  background: #141414;
  border-right-color: #2a2a2a;
}

.drawing-tool-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 5px;
  transition: all 0.2s;
  color: #666;
  font-size: 16px;
  user-select: none;
}

.drawing-tool-icon {
  width: 19px;
  height: 19px;
  display: block;
  overflow: visible;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.drawing-tool-icon circle {
  fill: currentColor;
  stroke: none;
}

.drawing-tool-icon text {
  fill: currentColor;
  stroke: none;
  font-size: 6px;
  font-weight: 700;
  text-anchor: middle;
}

.drawing-tool-icon__dash {
  stroke-dasharray: 2 2;
}

.chart-left.theme-dark .drawing-tool-btn {
  color: #787b86;
}

.drawing-tool-btn:hover {
  background: #f0f3fa;
  color: #2962ff;
}

.chart-left.theme-dark .drawing-tool-btn:hover {
  background: #252525;
  color: #d1d4dc;
}

.drawing-tool-btn.active {
  background: #e8f0ff;
  color: #2962ff;
  border: 1px solid transparent;
}

.chart-left.theme-dark .drawing-tool-btn.active {
  background: #252525;
  color: #5b8cff;
  border-color: transparent;
}

.drawing-toolbar .ant-divider-vertical {
  margin: 8px 0;
  height: 20px;
}

.indicator-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 3px;
  min-height: 32px;
  padding: 3px 6px;
  background: #fff;
  border-bottom: 1px solid #e0e3eb;
  flex-wrap: nowrap;
  z-index: 1;
  position: relative;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

.indicator-toolbar::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.indicator-active-bar {
  position: absolute;
  top: 36px;
  left: 8px;
  right: 56px;
  z-index: 9;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  padding: 0;
  overflow-x: auto;
  overflow-y: hidden;
  background: transparent;
  border: 0;
  scrollbar-width: none;
  pointer-events: none;
}

.indicator-active-bar::-webkit-scrollbar {
  display: none;
}

.chart-left.theme-dark .indicator-active-bar {
  background: transparent;
  border-color: transparent;
}

.indicator-active-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 22px;
  padding: 0 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid transparent;
  color: #434651;
  font-size: 10px;
  line-height: 20px;
  white-space: nowrap;
  pointer-events: auto;
  backdrop-filter: blur(4px);
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.indicator-active-chip:hover {
  background: #fff;
  border-color: #e0e3eb;
}

.indicator-active-chip--hidden {
  opacity: 0.65;
  background: #fafafa;
  border-color: #d9d9d9;
}

.chart-left.theme-dark .indicator-active-chip {
  background: transparent;
  border-color: transparent;
  color: #b2b5be;
}

.chart-left.theme-dark .indicator-active-chip:hover {
  background: #252525;
  border-color: #303030;
}

.chart-left.theme-dark .indicator-active-chip--hidden {
  background: #1f1f1f;
  border-color: #434343;
  color: rgba(255, 255, 255, 0.55);
}

.indicator-active-chip__label {
  cursor: pointer;
  font-weight: 500;
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
  height: 24px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 22px;
  color: #6a6d78;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  min-width: 36px;
  text-align: center;
  user-select: none;
}

.chart-left.theme-dark .indicator-btn {
  color: #787b86;
  background: transparent;
  border-color: transparent;
}

.indicator-btn:hover {
  color: #131722;
  border-color: transparent;
  background: #f0f3fa;
}

.chart-left.theme-dark .indicator-btn:hover {
  color: #d1d4dc;
  border-color: transparent;
  background: #252525;
}

.indicator-btn.active {
  color: #2962ff;
  background: #e8f0ff;
  border-color: transparent;
  box-shadow: none;
}

.chart-left.theme-dark .indicator-btn.active {
  color: #5b8cff;
  background: rgba(41, 98, 255, 0.16);
  border-color: transparent;
  box-shadow: none;
}

.kline-chart-container {
  flex: 1;
  width: 100%;
  min-width: 0;
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

.chart-refresh-indicator {
  position: absolute;
  top: 92px;
  right: 16px;
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 3;
  pointer-events: none;
}

.chart-left.theme-dark .chart-refresh-indicator {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(32, 32, 32, 0.9);
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
    display: none;
  }

  .indicator-toolbar {
    padding-left: 12px;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
  }

  .indicator-toolbar::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  .indicator-btn {
    flex-shrink: 0;
  }
}

@media (max-width: 1200px) {
  .drawing-toolbar {
    display: none;
  }

  .indicator-toolbar {
    padding-left: 12px;
  }

  .kline-chart-container {
    margin-left: 0;
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
    height: calc(100% - 45px) !important;
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
    height: calc(100% - 45px) !important;
    min-height: 300px !important;
    max-height: calc(100% - 45px) !important;
  }
}
</style>
