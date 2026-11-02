<template>
  <section class="qla" :class="{ 'is-collapsed': collapsed }" :aria-label="$t('quickTrade.liquidityArena.title')">
    <header class="qla-head">
      <div class="qla-title">
        <a-icon type="radar-chart" />
        <strong>{{ $t('quickTrade.liquidityArena.title') }}</strong>
        <a-tooltip :title="$t('quickTrade.liquidityArena.info')"><a-icon type="info-circle" class="qla-info" /></a-tooltip>
        <span v-if="snapshot" class="qla-feed" :title="feedStatusText" :class="[`is-${feedStatusClass}`, { 'is-slow': feedLatencyMs > 2000 }]"><i /><span class="qla-feed-text">{{ feedStatusLabel }}</span></span>
        <span v-if="loadedLevelCount" class="qla-depth-count">{{ $t('quickTrade.liquidityArena.levelsPerSideLoaded', { count: loadedLevelCount }) }}</span>
      </div>
      <div class="qla-tools">
        <div v-if="!collapsed" class="qla-modes" role="group" :aria-label="$t('quickTrade.liquidityArena.depthMode')">
          <button v-for="mode in depthModes" :key="mode.value" type="button" :class="{ active: depthMode === mode.value }" @click="setDepthMode(mode.value)">{{ mode.label }}</button>
        </div>
        <button
          type="button"
          class="qla-collapse"
          :title="$t(collapsed ? 'quickTrade.liquidityArena.expand' : 'quickTrade.liquidityArena.collapse')"
          :aria-label="$t(collapsed ? 'quickTrade.liquidityArena.expand' : 'quickTrade.liquidityArena.collapse')"
          :aria-expanded="collapsed ? 'false' : 'true'"
          @click="collapsed = !collapsed"
        ><a-icon :type="collapsed ? 'down' : 'up'" /></button>
      </div>
    </header>

    <div v-if="!collapsed" class="qla-body">
      <div v-if="loading && !snapshot" class="qla-skeleton" :aria-label="$t('quickTrade.liquidityArena.loading')">
        <div class="qla-skeleton__meta">
          <span><i />{{ $t('quickTrade.liquidityArena.nearBid') }}</span>
          <strong><a-icon type="loading" />{{ $t('quickTrade.liquidityArena.loading') }}</strong>
          <span>{{ $t('quickTrade.liquidityArena.nearAsk') }}<i /></span>
        </div>
        <div class="qla-skeleton__ladder"><i v-for="height in skeletonHeights" :key="height" :style="{ width: `${height}%` }" /></div>
      </div>
      <div v-else-if="error && !snapshot" class="qla-state qla-state--error">
        <span>{{ $t('quickTrade.liquidityArena.unavailable') }}</span>
        <button type="button" @click="loadOrderBook">{{ $t('quickTrade.liquidityArena.retry') }}</button>
      </div>
      <template v-else>
        <div class="qla-intel">
          <div class="qla-force is-bid">
            <div><span>{{ $t('quickTrade.liquidityArena.nearBid') }}</span><strong>{{ formatPercent(bidShare) }}</strong></div>
            <i><b :style="{ width: `${bidShare}%` }" /></i>
          </div>
          <div class="qla-flow">
            <div class="qla-flow__quote">
              <span>{{ $t('quickTrade.liquidityArena.midPrice') }}</span>
              <strong>{{ formatPrice(midPrice) }}</strong>
              <em>{{ $t('quickTrade.liquidityArena.spread') }} {{ formatPrice(spread) }} · {{ formatBps(spreadBps) }}</em>
            </div>
            <div class="qla-flow__pressure">
              <span>{{ $t('quickTrade.liquidityArena.pressure15s') }}</span>
              <div class="qla-flow__scale">
                <small class="is-bid">{{ $t('quickTrade.liquidityArena.bidSide') }}</small>
                <div><i :class="pressureDelta >= 0 ? 'is-bid' : 'is-ask'" :style="pressureTrackStyle" /><b /></div>
                <small class="is-ask">{{ $t('quickTrade.liquidityArena.askSide') }}</small>
              </div>
              <strong :class="pressureDelta >= 0 ? 'is-bid' : 'is-ask'">{{ formatSignedPercent(pressureDelta) }}</strong>
            </div>
          </div>
          <div class="qla-force is-ask">
            <div><span>{{ $t('quickTrade.liquidityArena.nearAsk') }}</span><strong>{{ formatPercent(askShare) }}</strong></div>
            <i><b :style="{ width: `${askShare}%` }" /></i>
          </div>
        </div>

        <div ref="ladder" class="qla-ladder" :style="ladderViewportStyle" role="table" :aria-label="$t('quickTrade.liquidityArena.priceLadder')">
          <div class="qla-ladder__head" role="row">
            <span role="columnheader">{{ $t('quickTrade.liquidityArena.bidSize') }}</span>
            <span role="columnheader">{{ $t('quickTrade.liquidityArena.bidPrice') }}</span>
            <span role="columnheader">{{ $t('quickTrade.liquidityArena.askPrice') }}</span>
            <span role="columnheader">{{ $t('quickTrade.liquidityArena.askSize') }}</span>
          </div>
          <div v-for="(row, index) in ladderRows" :key="index" class="qla-ladder__row" role="row">
            <div class="qla-depth-cell is-bid" role="cell"><i :style="{ width: `${row.bidFill}%` }" /><strong>{{ formatCompact(row.bid && row.bid.size) }}</strong><small>{{ formatCompact(row.bidCumulative) }}</small></div>
            <button type="button" class="qla-price is-bid" :disabled="!row.bid" :title="$t('quickTrade.liquidityArena.useLimitPrice')" @click="selectPrice(row.bid && row.bid.price)">{{ formatPrice(row.bid && row.bid.price) }}</button>
            <button type="button" class="qla-price is-ask" :disabled="!row.ask" :title="$t('quickTrade.liquidityArena.useLimitPrice')" @click="selectPrice(row.ask && row.ask.price)">{{ formatPrice(row.ask && row.ask.price) }}</button>
            <div class="qla-depth-cell is-ask" role="cell"><i :style="{ width: `${row.askFill}%` }" /><strong>{{ formatCompact(row.ask && row.ask.size) }}</strong><small>{{ formatCompact(row.askCumulative) }}</small></div>
          </div>
        </div>
        <button
          type="button"
          class="qla-ladder-resizer"
          :class="{ 'is-resizing': ladderResizing }"
          role="separator"
          aria-orientation="horizontal"
          :aria-label="$t('quickTrade.liquidityArena.priceLadder')"
          :aria-valuemin="5"
          :aria-valuemax="maxVisibleLadderRows"
          :aria-valuenow="visibleLadderRows"
          @mousedown.stop.prevent="startLadderResize"
          @keydown.up.prevent="adjustLadderRows(1)"
          @keydown.down.prevent="adjustLadderRows(-1)"
          @dblclick="resetLadderRows"
        ><i /></button>

        <div class="qla-decision">
          <div class="qla-wall is-bid">
            <div class="qla-wall__head"><span><a-icon type="arrow-up" />{{ $t('quickTrade.liquidityArena.buyWall') }}</span><em><i />{{ $t(buyWallInfo.statusKey) }}</em></div>
            <div class="qla-wall__value"><strong>{{ formatPrice(buyWallInfo.price) }}</strong><b>{{ $t('quickTrade.liquidityArena.wallMultiple', { value: formatMultiple(buyWallInfo.intensity) }) }}</b></div>
            <div class="qla-wall__meter"><i :style="{ width: `${wallMeterWidth(buyWallInfo.intensity)}%` }" /></div>
            <small>{{ formatCompact(buyWallInfo.size) }} · {{ formatBps(buyWallInfo.distanceBps) }} · {{ formatAge(buyWallInfo.ageSeconds) }}</small>
          </div>
          <div class="qla-impact" :class="[{ 'is-limited': executionPreview && executionPreview.reliable && executionPreview.coverage < 99.5 }, `is-${impactSeverity}`]">
            <div class="qla-impact__title"><span><a-icon type="dashboard" />{{ $t('quickTrade.liquidityArena.executionPreview') }}</span><em>{{ $t(impactSeverityKey) }}</em><strong>{{ formatMoney(orderNotional) }}</strong></div>
            <template v-if="executionPreview && executionPreview.reliable">
              <div class="qla-impact__metrics">
                <span>{{ $t('quickTrade.liquidityArena.avgFill') }}<strong>{{ formatPrice(executionPreview.averagePrice) }}</strong></span>
                <span>{{ $t('quickTrade.liquidityArena.slippage') }}<strong>{{ formatBps(executionPreview.slippageBps) }}</strong></span>
                <span>{{ $t('quickTrade.liquidityArena.levelsConsumed') }}<strong>{{ executionPreview.levels }}</strong></span>
              </div>
              <div class="qla-impact__meter"><i :style="{ width: `${impactMeterWidth}%` }" /></div>
              <small v-if="executionPreview.coverage < 99.5">{{ $t('quickTrade.liquidityArena.insufficientDepth', { coverage: Math.round(executionPreview.coverage) }) }}</small>
            </template>
            <small v-else>{{ $t('quickTrade.liquidityArena.nativeContractsNote') }}</small>
          </div>
          <div class="qla-wall is-ask">
            <div class="qla-wall__head"><span>{{ $t('quickTrade.liquidityArena.sellWall') }}<a-icon type="arrow-down" /></span><em><i />{{ $t(sellWallInfo.statusKey) }}</em></div>
            <div class="qla-wall__value"><b>{{ $t('quickTrade.liquidityArena.wallMultiple', { value: formatMultiple(sellWallInfo.intensity) }) }}</b><strong>{{ formatPrice(sellWallInfo.price) }}</strong></div>
            <div class="qla-wall__meter"><i :style="{ width: `${wallMeterWidth(sellWallInfo.intensity)}%` }" /></div>
            <small>{{ formatCompact(sellWallInfo.size) }} · {{ formatBps(sellWallInfo.distanceBps) }} · {{ formatAge(sellWallInfo.ageSeconds) }}</small>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script>
import { getQuickTradeOrderBook } from '@/api/quick-trade'
import ExchangeOrderBookWs from '@/utils/exchangeOrderBookWs'
import { aggregateOrderBookRows, deriveOrderBookAggregationStep } from '@/utils/orderBookAggregation'
import { normalizeContractOrderBook, usesNativeContractQuantity } from '@/utils/orderBookUnits'

export default {
  name: 'CryptoLiquidityArena',
  props: {
    symbol: { type: String, default: '' },
    exchangeId: { type: String, default: '' },
    marketType: { type: String, default: 'swap' },
    currentPrice: { type: Number, default: 0 },
    orderNotional: { type: Number, default: 0 },
    orderSide: { type: String, default: 'buy' },
    active: { type: Boolean, default: true },
    dark: { type: Boolean, default: false }
  },
  data () {
    return {
      collapsed: false,
      depthMode: '10',
      snapshot: null,
      loading: false,
      error: '',
      pollTimer: null,
      orderBookStream: null,
      streamStatus: 'connecting',
      usingRestFallback: false,
      streamLatencyMs: 0,
      requestId: 0,
      requestController: null,
      requestLatencyMs: 0,
      contractMultiplier: 0,
      ladderViewportRows: 10,
      ladderResizing: false,
      pressureHistory: [],
      lastPressureSampleAt: 0,
      levelMemory: {},
      skeletonHeights: [94, 82, 70, 58, 48, 39, 30]
    }
  },
  computed: {
    depthModes () {
      return [
        { value: '10', label: this.$t('quickTrade.liquidityArena.levels10') },
        { value: '25', label: this.$t('quickTrade.liquidityArena.levelsStandard', { count: this.standardDepthLimit }) },
        { value: 'aggregate', label: this.$t('quickTrade.liquidityArena.aggregate') }
      ]
    },
    streamDepthLimit () {
      return ['binance', 'htx', 'huobi'].includes(String(this.exchangeId || '').toLowerCase()) ? 20 : 50
    },
    standardDepthLimit () {
      return Math.min(25, this.streamDepthLimit)
    },
    requestLimit () {
      return this.depthMode === '10' ? 10 : (this.depthMode === '25' ? this.standardDepthLimit : this.streamDepthLimit)
    },
    displayLevelCount () {
      return this.requestLimit
    },
    loadedLevelCount () {
      const bids = ((this.snapshot && this.snapshot.bids) || []).filter(row => Number(row && row.size) > 0).length
      const asks = ((this.snapshot && this.snapshot.asks) || []).filter(row => Number(row && row.size) > 0).length
      return Math.min(this.requestLimit, bids, asks)
    },
    visibleLadderRows () {
      return Math.max(5, Math.min(this.maxVisibleLadderRows, this.ladderViewportRows))
    },
    maxVisibleLadderRows () {
      const availableRows = this.ladderRows.length || this.displayLevelCount || 10
      return Math.max(5, Math.min(14, availableRows))
    },
    ladderViewportStyle () {
      return { height: `${24 + this.visibleLadderRows * 23}px` }
    },
    displaySymbol () {
      return String(this.symbol || '').replace(/^[^:]+:/, '').replace(/[-_]SWAP$/i, '') || '—'
    },
    baseAsset () {
      return (this.displaySymbol.split(/[/_-]/)[0] || '').toUpperCase() || '—'
    },
    usesNativeContracts () {
      return usesNativeContractQuantity(this.exchangeId, this.marketType)
    },
    hasNormalizedContractSize () {
      return !this.usesNativeContracts || this.contractMultiplier > 0
    },
    sizeUnitLabel () {
      const unit = this.hasNormalizedContractSize ? this.$t('quickTrade.liquidityArena.baseQuantity', { asset: this.baseAsset }) : this.$t('quickTrade.liquidityArena.contracts')
      if (this.depthMode !== 'aggregate') return unit
      return this.$t('quickTrade.liquidityArena.groupedUnit', { unit, step: this.formatPrice(this.aggregationStep) })
    },
    bidShare () {
      return this.weightedShare(this.snapshot)
    },
    askShare () {
      return 100 - this.bidShare
    },
    feedLatencyMs () {
      return this.streamStatus === 'live' && !this.usingRestFallback ? this.streamLatencyMs : this.requestLatencyMs
    },
    feedStatusClass () {
      return this.usingRestFallback ? 'rest' : this.streamStatus
    },
    feedStatusText () {
      if (this.usingRestFallback) return this.$t('quickTrade.liquidityArena.restFallback', { latency: this.requestLatencyMs })
      if (this.streamStatus === 'live') return this.$t('quickTrade.liquidityArena.webSocketFeed', { latency: this.streamLatencyMs })
      if (this.streamStatus === 'reconnecting') return this.$t('quickTrade.liquidityArena.reconnecting')
      if (this.streamStatus === 'connecting') return this.$t('quickTrade.liquidityArena.connecting')
      return this.$t('quickTrade.liquidityArena.restFallback', { latency: this.requestLatencyMs })
    },
    feedStatusLabel () {
      if (this.streamStatus === 'live' && !this.usingRestFallback) {
        return this.$t('quickTrade.liquidityArena.liveFeedCompact', { latency: this.streamLatencyMs })
      }
      return this.feedStatusText
    },
    pressureDelta () {
      if (this.pressureHistory.length < 2) return 0
      return this.pressureHistory[this.pressureHistory.length - 1].value - this.pressureHistory[0].value
    },
    pressureTrackStyle () {
      const magnitude = Math.min(50, Math.abs(Number(this.pressureDelta || 0)) / 2)
      if (this.pressureDelta >= 0) return { right: '50%', width: `${magnitude}%` }
      return { left: '50%', width: `${magnitude}%` }
    },
    midPrice () {
      return Number((this.snapshot && this.snapshot.mid) || this.currentPrice || 0)
    },
    spread () {
      return Number((this.snapshot && this.snapshot.spread) || 0)
    },
    spreadBps () {
      return Number((this.snapshot && this.snapshot.spread_bps) || 0)
    },
    bestBid () {
      return Number((this.snapshot && this.snapshot.best_bid) || 0)
    },
    bestAsk () {
      return Number((this.snapshot && this.snapshot.best_ask) || 0)
    },
    buyWall () {
      return this.largestLevel('bids')
    },
    sellWall () {
      return this.largestLevel('asks')
    },
    buyWallInfo () {
      return this.wallDetails('bid', this.buyWall)
    },
    sellWallInfo () {
      return this.wallDetails('ask', this.sellWall)
    },
    aggregationStep () {
      const bids = ((this.snapshot && this.snapshot.bids) || []).slice(0, this.requestLimit)
      const asks = ((this.snapshot && this.snapshot.asks) || []).slice(0, this.requestLimit)
      return deriveOrderBookAggregationStep(bids, asks, this.midPrice)
    },
    ladderRows () {
      const rawBids = ((this.snapshot && this.snapshot.bids) || []).slice(0, this.requestLimit).filter(row => Number(row && row.size) > 0)
      const rawAsks = ((this.snapshot && this.snapshot.asks) || []).slice(0, this.requestLimit).filter(row => Number(row && row.size) > 0)
      const bids = (this.depthMode === 'aggregate' ? aggregateOrderBookRows(rawBids, 'bid', this.aggregationStep) : rawBids).slice(0, this.displayLevelCount)
      const asks = (this.depthMode === 'aggregate' ? aggregateOrderBookRows(rawAsks, 'ask', this.aggregationStep) : rawAsks).slice(0, this.displayLevelCount)
      const maxSize = Math.max(1, ...bids.map(row => Number(row.size || 0)), ...asks.map(row => Number(row.size || 0)))
      let bidCumulative = 0
      let askCumulative = 0
      return Array.from({ length: Math.max(bids.length, asks.length) }, (_, index) => {
        const bid = bids[index] || null
        const ask = asks[index] || null
        bidCumulative += Number((bid && bid.size) || 0)
        askCumulative += Number((ask && ask.size) || 0)
        return {
          bid,
          ask,
          bidCumulative,
          askCumulative,
          bidFill: bid ? Math.max(4, Number(bid.size || 0) / maxSize * 100) : 0,
          askFill: ask ? Math.max(4, Number(ask.size || 0) / maxSize * 100) : 0
        }
      })
    },
    impactSeverity () {
      if (!this.executionPreview || !this.executionPreview.reliable) return 'unknown'
      if (this.executionPreview.coverage < 99.5 || this.executionPreview.slippageBps >= 5) return 'high'
      if (this.executionPreview.slippageBps >= 1) return 'medium'
      return 'low'
    },
    impactSeverityKey () {
      return `quickTrade.liquidityArena.impact${this.impactSeverity.charAt(0).toUpperCase()}${this.impactSeverity.slice(1)}`
    },
    impactMeterWidth () {
      if (!this.executionPreview || !this.executionPreview.reliable) return 0
      const slippageScore = Math.min(100, Number(this.executionPreview.slippageBps || 0) / 10 * 100)
      const coverageScore = Math.max(0, 100 - Number(this.executionPreview.coverage || 0))
      return Math.max(4, slippageScore, coverageScore)
    },
    executionPreview () {
      if (!this.snapshot || !(this.orderNotional > 0) || !(this.midPrice > 0)) return null
      if (!this.hasNormalizedContractSize) return { reliable: false, coverage: 0 }
      const selling = String(this.orderSide || '').toLowerCase() === 'sell'
      const rows = (selling ? this.snapshot.bids : this.snapshot.asks) || []
      const targetBase = Number(this.orderNotional) / this.midPrice
      let remaining = targetBase
      let filled = 0
      let quoteValue = 0
      let levels = 0
      for (const row of rows) {
        if (remaining <= 1e-12) break
        const available = Number(row.size || 0)
        const take = Math.min(remaining, available)
        if (take <= 0) continue
        filled += take
        quoteValue += take * Number(row.price || 0)
        remaining -= take
        levels += 1
      }
      const averagePrice = filled > 0 ? quoteValue / filled : 0
      const reference = selling ? this.bestBid : this.bestAsk
      const slippageBps = averagePrice > 0 && reference > 0 ? (selling ? (reference - averagePrice) : (averagePrice - reference)) / reference * 10000 : 0
      return { reliable: true, averagePrice, slippageBps: Math.max(0, slippageBps), levels, coverage: targetBase > 0 ? Math.min(100, filled / targetBase * 100) : 100 }
    }
  },
  watch: {
    symbol: 'restart',
    exchangeId: 'restart',
    marketType: 'restart',
    active (value) {
      if (value) this.restart()
      else this.stopPolling()
    },
    collapsed (value) {
      try { window.localStorage.setItem('quantdinger.quickTrade.liquidityArena.collapsed', value ? '1' : '0') } catch (e) {}
    }
  },
  mounted () {
    try { this.collapsed = window.localStorage.getItem('quantdinger.quickTrade.liquidityArena.collapsed') === '1' } catch (e) {}
    try {
      const storedRows = Number(window.localStorage.getItem('quantdinger.quickTrade.liquidityArena.rows'))
      if (Number.isFinite(storedRows) && storedRows >= 5) this.ladderViewportRows = Math.max(5, Math.min(14, storedRows))
    } catch (e) {}
    if (this.active) this.restart()
  },
  beforeDestroy () {
    this.stopLadderResize()
    this.stopPolling()
  },
  methods: {
    setDepthMode (mode) {
      if (this.depthMode === mode) return
      this.depthMode = mode
      if (this.streamStatus !== 'live') this.loadOrderBook()
      this.$nextTick(() => {
        if (this.$refs.ladder) this.$refs.ladder.scrollTop = 0
      })
    },
    adjustLadderRows (delta) {
      this.ladderViewportRows = Math.max(5, Math.min(this.maxVisibleLadderRows, this.ladderViewportRows + Number(delta || 0)))
      try { window.localStorage.setItem('quantdinger.quickTrade.liquidityArena.rows', String(this.ladderViewportRows)) } catch (e) {}
    },
    resetLadderRows () {
      this.ladderViewportRows = Math.min(10, this.maxVisibleLadderRows)
      try { window.localStorage.setItem('quantdinger.quickTrade.liquidityArena.rows', String(this.ladderViewportRows)) } catch (e) {}
    },
    startLadderResize (event) {
      if (!event || event.button !== 0) return
      event.preventDefault()
      this.ladderResizing = true
      this._ladderResizeStart = {
        y: event.clientY,
        rows: this.visibleLadderRows
      }
      this._ladderResizeMove = moveEvent => {
        const start = this._ladderResizeStart
        if (!start) return
        const rowDelta = Math.round((moveEvent.clientY - start.y) / 23)
        this.ladderViewportRows = Math.max(5, Math.min(this.maxVisibleLadderRows, start.rows + rowDelta))
      }
      this._ladderResizeEnd = () => this.stopLadderResize(true)
      window.addEventListener('mousemove', this._ladderResizeMove)
      window.addEventListener('mouseup', this._ladderResizeEnd, { once: true })
    },
    stopLadderResize (persist = false) {
      if (this._ladderResizeMove) window.removeEventListener('mousemove', this._ladderResizeMove)
      if (this._ladderResizeEnd) window.removeEventListener('mouseup', this._ladderResizeEnd)
      this._ladderResizeMove = null
      this._ladderResizeEnd = null
      this._ladderResizeStart = null
      this.ladderResizing = false
      if (persist) {
        try { window.localStorage.setItem('quantdinger.quickTrade.liquidityArena.rows', String(this.ladderViewportRows)) } catch (e) {}
      }
    },
    restart () {
      this.stopPolling()
      this.snapshot = null
      this.error = ''
      this.pressureHistory = []
      this.lastPressureSampleAt = 0
      this.levelMemory = {}
      this.contractMultiplier = 0
      if (!this.active || !this.symbol || !this.exchangeId) return
      this.streamStatus = 'connecting'
      this.usingRestFallback = false
      this.loadOrderBook()
      this.connectOrderBookStream()
    },
    stopPolling () {
      if (this.pollTimer) clearInterval(this.pollTimer)
      this.pollTimer = null
      if (this.orderBookStream) this.orderBookStream.disconnect()
      this.orderBookStream = null
      this.requestId += 1
      if (this.requestController) this.requestController.abort()
      this.requestController = null
      this.loading = false
    },
    connectOrderBookStream () {
      this.orderBookStream = new ExchangeOrderBookWs()
      const connected = this.orderBookStream.connect(this.symbol, {
        onSnapshot: payload => {
          if (!this.active) return
          this.streamStatus = 'live'
          this.usingRestFallback = false
          if (this.pollTimer) clearInterval(this.pollTimer)
          this.pollTimer = null
          const sourceTimestamp = Number(payload.timestamp || 0)
          this.streamLatencyMs = sourceTimestamp > 0 ? Math.max(0, Math.min(9999, Date.now() - sourceTimestamp)) : 0
          this.applySnapshot(payload)
        },
        onStatus: status => {
          if (status === 'live') this.streamStatus = 'live'
          else if (status === 'reconnecting') this.streamStatus = 'reconnecting'
          else if (!this.snapshot) this.streamStatus = 'connecting'
        },
        onFallback: () => this.startRestFallback(),
        onUnavailable: () => this.startRestFallback()
      }, this.exchangeId, { marketType: this.marketType })
      if (!connected) this.startRestFallback()
    },
    startRestFallback () {
      if (!this.active) return
      this.usingRestFallback = true
      this.loadOrderBook()
      if (!this.pollTimer) this.pollTimer = setInterval(this.loadOrderBook, 2000)
    },
    applySnapshot (payload) {
      if (!payload || !Array.isArray(payload.bids) || !Array.isArray(payload.asks)) return
      this.captureContractMetadata(payload)
      const normalizedPayload = this.usesNativeContracts
        ? normalizeContractOrderBook(payload, this.contractMultiplier)
        : payload
      this.updateLevelMemory(normalizedPayload)
      this.snapshot = normalizedPayload
      this.error = ''
      this.recordPressure(normalizedPayload)
    },
    captureContractMetadata (payload) {
      const multiplier = Number(payload && payload.contract_multiplier)
      if (!(multiplier > 0) || multiplier === this.contractMultiplier) return false
      this.contractMultiplier = multiplier
      return true
    },
    recordPressure (payload) {
      const now = Date.now()
      if (this.lastPressureSampleAt && now - this.lastPressureSampleAt < 500) return
      this.lastPressureSampleAt = now
      this.pressureHistory.push({ timestamp: now, value: this.weightedShare(payload) })
      this.pressureHistory = this.pressureHistory.filter(item => now - item.timestamp <= 15000).slice(-40)
    },
    async loadOrderBook () {
      if (!this.active || !this.symbol || !this.exchangeId || this.loading) return
      const requestId = ++this.requestId
      const controller = typeof AbortController === 'undefined' ? null : new AbortController()
      const startedAt = Date.now()
      this.requestController = controller
      this.loading = true
      try {
        const response = await getQuickTradeOrderBook({ exchange_id: this.exchangeId, symbol: this.symbol, market_type: this.marketType, limit: this.requestLimit }, { signal: controller && controller.signal })
        if (requestId !== this.requestId) return
        const payload = response && response.data && response.data.data ? response.data.data : (response && response.data ? response.data : response)
        if (!payload || !Array.isArray(payload.bids) || !Array.isArray(payload.asks)) throw new Error('INVALID_ORDER_BOOK')
        this.requestLatencyMs = Math.max(0, Date.now() - startedAt)
        const metadataChanged = this.captureContractMetadata(payload)
        if (metadataChanged && this.snapshot) this.applySnapshot(this.snapshot)
        if (this.streamStatus !== 'live' || !this.snapshot) this.applySnapshot(payload)
      } catch (error) {
        if (requestId === this.requestId && !this.snapshot) this.error = 'ORDER_BOOK_UNAVAILABLE'
      } finally {
        if (requestId === this.requestId) {
          this.requestController = null
          this.loading = false
        }
      }
    },
    weightedShare (snapshot) {
      if (!snapshot) return 50
      const weightedTotal = rows => (rows || []).slice(0, this.requestLimit).reduce((sum, row, index) => sum + Number(row.size || 0) / Math.pow(index + 1, 0.72), 0)
      const bids = weightedTotal(snapshot.bids)
      const asks = weightedTotal(snapshot.asks)
      return bids + asks > 0 ? bids / (bids + asks) * 100 : 50
    },
    updateLevelMemory (snapshot) {
      const now = Date.now()
      const next = {}
      const sides = ['bids', 'asks']
      sides.forEach(side => {
        const prefix = side === 'bids' ? 'bid' : 'ask'
        const rows = (snapshot[side] || []).slice(0, this.requestLimit)
        rows.forEach(row => {
          const key = `${prefix}:${Number(row.price)}`
          const previous = this.levelMemory[key]
          const size = Number(row.size || 0)
          next[key] = {
            firstSeen: previous ? previous.firstSeen : now,
            lastSeen: now,
            samples: previous ? previous.samples + 1 : 1,
            size,
            previousSize: previous ? previous.size : size,
            growth: previous && previous.size > 0 ? (size - previous.size) / previous.size : 0
          }
        })
      })
      this.levelMemory = next
    },
    largestLevel (side) {
      const rows = ((this.snapshot && this.snapshot[side]) || []).slice(0, this.requestLimit)
      return rows.reduce((best, row) => Number(row.size || 0) > Number(best.size || 0) ? row : best, {})
    },
    wallDetails (side, row) {
      const price = Number((row && row.price) || 0)
      const rows = ((this.snapshot && this.snapshot[`${side}s`]) || []).slice(0, this.requestLimit).filter(item => Number(item && item.size) > 0)
      const averageSize = rows.length ? rows.reduce((sum, item) => sum + Number(item.size || 0), 0) / rows.length : 0
      const memory = this.levelMemory[`${side}:${price}`] || {}
      const ageSeconds = memory.firstSeen ? Math.max(0, (Date.now() - memory.firstSeen) / 1000) : 0
      let statusKey = 'quickTrade.liquidityArena.wallNew'
      if (Number(memory.growth || 0) >= 0.25 && Number(memory.samples || 0) >= 2) statusKey = 'quickTrade.liquidityArena.wallReplenishing'
      else if (ageSeconds >= 6 && Number(memory.samples || 0) >= 3) statusKey = 'quickTrade.liquidityArena.wallStable'
      const size = Number((row && row.size) || 0)
      return { price, size, intensity: averageSize > 0 ? size / averageSize : 0, ageSeconds, statusKey, distanceBps: this.midPrice > 0 && price > 0 ? Math.abs(price - this.midPrice) / this.midPrice * 10000 : 0 }
    },
    wallMeterWidth (intensity) {
      return Math.max(8, Math.min(100, Number(intensity || 0) / 5 * 100))
    },
    selectPrice (price) {
      const value = Number(price || 0)
      if (value > 0) this.$emit('price-select', value)
    },
    formatPrice (value) {
      const number = Number(value || 0)
      if (!Number.isFinite(number) || number <= 0) return '—'
      const digits = number >= 1000 ? 2 : (number >= 1 ? 4 : 6)
      return number.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits })
    },
    formatPercent (value) {
      return `${Math.round(Number(value || 0))}%`
    },
    formatSignedPercent (value) {
      const number = Number(value || 0)
      return `${number >= 0 ? '+' : ''}${number.toFixed(1)}%`
    },
    formatBps (value) {
      const number = Number(value || 0)
      return this.$t('quickTrade.liquidityArena.bpsValue', { value: number.toFixed(number >= 10 ? 0 : 1) })
    },
    formatAge (seconds) {
      return this.$t('quickTrade.liquidityArena.ageSeconds', { value: Math.max(0, Math.round(Number(seconds || 0))) })
    },
    formatMoney (value) {
      const number = Number(value || 0)
      return this.$t('quickTrade.liquidityArena.usdtAmount', { value: number.toLocaleString('en-US', { maximumFractionDigits: 2 }) })
    },
    formatMultiple (value) {
      const number = Number(value || 0)
      return number >= 10 ? number.toFixed(0) : number.toFixed(1)
    },
    formatCompact (value) {
      const number = Number(value || 0)
      if (!Number.isFinite(number) || number <= 0) return '—'
      if (number < 1) {
        const maximumFractionDigits = number >= 0.01 ? 4 : (number >= 0.0001 ? 6 : 8)
        return number.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits })
      }
      return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(number)
    }
  }
}
</script>

<style lang="less" scoped>
.qla { color: var(--qtc-text); background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color) 2.5%, var(--qtc-bg)), var(--qtc-bg) 62%); border-bottom: 1px solid var(--qtc-border); font-family: var(--qtc-font-ui, "SF Pro Text", "Segoe UI Variable Text", Inter, "HarmonyOS Sans SC", MiSans, "PingFang SC", "Noto Sans SC", "Microsoft YaHei UI", sans-serif); font-size: 12px; line-height: 1.35; letter-spacing: 0; -webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1, "kern" 1; }
.qla-head { min-height: 38px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 5px 12px 4px; }
.qla-title, .qla-tools, .qla-modes, .qla-feed { display: flex; align-items: center; }
.qla-title { min-width: 0; gap: 6px; color: var(--qtc-muted); }
.qla-title > .anticon:first-child { width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; color: var(--primary-color); border: 1px solid color-mix(in srgb, var(--primary-color) 24%, transparent); border-radius: 6px; background: color-mix(in srgb, var(--primary-color) 9%, transparent); box-shadow: 0 4px 12px color-mix(in srgb, var(--primary-color) 8%, transparent); font-size: 13px; }
.qla-title strong { color: var(--qtc-text); font-size: 14px; font-weight: 650; line-height: 1.3; white-space: nowrap; }
.qla-info { font-size: 12px; }
.qla-feed { flex: 0 0 90px; width: 90px; box-sizing: border-box; justify-content: flex-start; white-space: nowrap; gap: 5px; margin-left: 3px; padding: 2px 7px; color: var(--qtc-green); border: 1px solid color-mix(in srgb, var(--qtc-green) 20%, transparent); border-radius: 999px; background: color-mix(in srgb, var(--qtc-green) 6%, transparent); font-size: 10px; font-weight: 500; }
.qla-feed-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; text-align: left; }
.qla-feed.is-rest, .qla-feed.is-reconnecting { color: #d48806; border-color: color-mix(in srgb, #d48806 25%, transparent); background: color-mix(in srgb, #d48806 7%, transparent); }
.qla-depth-count { display: inline-flex; align-items: center; min-height: 20px; padding: 1px 7px; color: var(--qtc-muted); border: 1px solid color-mix(in srgb, var(--qtc-border) 82%, transparent); border-radius: 999px; background: color-mix(in srgb, var(--qtc-muted-bg) 62%, transparent); font-size: 10px; font-weight: 600; white-space: nowrap; }
.qla-feed.is-connecting { color: var(--qtc-muted); border-color: color-mix(in srgb, var(--qtc-muted) 22%, transparent); background: color-mix(in srgb, var(--qtc-muted-bg) 70%, transparent); }
.qla-feed.is-slow { color: #d48806; }
.qla-feed i { flex-shrink: 0; width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 12%, transparent); }
.qla-tools { flex: 0 0 auto; gap: 5px; }
.qla-modes { padding: 2px; border: 1px solid color-mix(in srgb, var(--qtc-border) 78%, transparent); border-radius: 7px; background: color-mix(in srgb, var(--qtc-muted-bg) 78%, transparent); }
.qla-modes button, .qla-collapse, .qla-state button { color: var(--qtc-muted); background: transparent; border: 0; cursor: pointer; }
.qla-modes button { height: 26px; padding: 0 10px; border-radius: 5px; font-size: 12px; font-weight: 500; }
.qla-modes button.active { color: var(--primary-color); background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color) 9%, var(--qtc-bg)), var(--qtc-bg)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 42%, transparent), 0 2px 6px color-mix(in srgb, var(--primary-color) 7%, transparent); }
.qla-collapse { width: 26px; height: 26px; padding: 0; border-radius: 5px; }
.qla-collapse:hover { color: var(--primary-color); background: var(--qtc-muted-bg); }
.qla-body { position: relative; min-height: 0; padding: 1px 12px 7px; }
.qla-intel { height: 64px; display: grid; grid-template-columns: minmax(0, 1fr) 300px minmax(0, 1fr); align-items: center; gap: 10px; margin-bottom: 6px; padding: 0 11px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--qtc-border) 80%, transparent); border-radius: 9px; background: linear-gradient(90deg, color-mix(in srgb, var(--qtc-green) 8%, transparent), transparent 36%, transparent 64%, color-mix(in srgb, var(--qtc-red) 8%, transparent)); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 20%, transparent), 0 4px 14px color-mix(in srgb, var(--primary-color) 3%, transparent); }
.qla-force { min-width: 0; }
.qla-force > div { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; color: var(--qtc-muted); font-size: 11px; font-weight: 500; }
.qla-force strong { font-size: 16px; font-weight: 700; line-height: 1; }
.qla-force > i { display: block; height: 6px; margin-top: 5px; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--qtc-muted-bg) 84%, transparent); box-shadow: inset 0 1px 2px color-mix(in srgb, #000 12%, transparent); }
.qla-force > i > b { display: block; height: 100%; border-radius: inherit; }
.qla-force.is-bid strong { color: var(--qtc-green); }
.qla-force.is-bid > i > b { background: linear-gradient(90deg, color-mix(in srgb, var(--qtc-green) 72%, #fff), var(--qtc-green)); box-shadow: 0 0 8px color-mix(in srgb, var(--qtc-green) 28%, transparent); }
.qla-force.is-ask strong { color: var(--qtc-red); }
.qla-force.is-ask > i > b { margin-left: auto; background: linear-gradient(90deg, var(--qtc-red), color-mix(in srgb, var(--qtc-red) 72%, #fff)); box-shadow: 0 0 8px color-mix(in srgb, var(--qtc-red) 28%, transparent); }
.qla-flow { position: relative; min-width: 0; height: 54px; display: grid; grid-template-rows: 32px 20px; padding: 1px 10px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--qtc-border) 88%, transparent); border-radius: 8px; background: color-mix(in srgb, var(--qtc-bg) 96%, var(--qtc-muted-bg)); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 18%, transparent); }
.qla-flow__quote { min-width: 0; display: grid; grid-template-columns: auto auto minmax(0, 1fr); align-items: center; gap: 7px; border-bottom: 1px solid color-mix(in srgb, var(--qtc-border) 62%, transparent); }
.qla-flow__quote strong, .qla-flow__quote span, .qla-flow__quote em { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qla-flow__quote span { color: var(--qtc-muted); font-size: 10px; font-weight: 500; }
.qla-flow__quote strong { color: var(--qtc-text); font-size: 16px; font-weight: 700; letter-spacing: 0; }
.qla-flow__quote em { color: var(--qtc-muted); font-size: 9px; font-style: normal; font-weight: 500; text-align: right; }
.qla-flow__pressure { min-width: 0; display: grid; grid-template-columns: auto minmax(92px, 1fr) auto; align-items: center; gap: 7px; }
.qla-flow__pressure > span { color: var(--qtc-muted); font-size: 9px; white-space: nowrap; }
.qla-flow__pressure > strong { min-width: 40px; font-size: 10px; font-weight: 650; text-align: right; }
.qla-flow__pressure > strong.is-bid { color: var(--qtc-green); }
.qla-flow__pressure > strong.is-ask { color: var(--qtc-red); }
.qla-flow__scale { min-width: 0; display: grid; grid-template-columns: auto minmax(48px, 1fr) auto; align-items: center; gap: 5px; }
.qla-flow__scale small { font-size: 9px; font-weight: 500; white-space: nowrap; }
.qla-flow__scale small.is-bid { color: var(--qtc-green); }
.qla-flow__scale small.is-ask { color: var(--qtc-red); }
.qla-flow__scale > div { position: relative; height: 4px; overflow: visible; border-radius: 999px; background: color-mix(in srgb, var(--qtc-border) 72%, transparent); }
.qla-flow__scale > div > b { position: absolute; z-index: 2; top: -2px; bottom: -2px; left: 50%; width: 1px; background: var(--qtc-muted); opacity: 0.7; }
.qla-flow__scale > div > i { position: absolute; top: 0; bottom: 0; border-radius: 999px; transition: left 140ms ease, right 140ms ease, width 140ms ease; }
.qla-flow__scale > div > i.is-bid { background: var(--qtc-green); }
.qla-flow__scale > div > i.is-ask { background: var(--qtc-red); }
.qla-ladder { position: relative; height: 254px; overflow-x: hidden; overflow-y: auto; border: 1px solid color-mix(in srgb, var(--qtc-border) 88%, transparent); border-radius: 8px; background: color-mix(in srgb, var(--qtc-bg) 96%, var(--qtc-muted-bg)); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 14%, transparent); scrollbar-color: color-mix(in srgb, var(--qtc-muted) 40%, transparent) transparent; scrollbar-width: thin; isolation: isolate; transition: height 160ms ease; }
.qla-ladder::-webkit-scrollbar { width: 5px; }
.qla-ladder::-webkit-scrollbar-track { background: transparent; }
.qla-ladder::-webkit-scrollbar-thumb { border-radius: 999px; background: color-mix(in srgb, var(--qtc-muted) 38%, transparent); }
.qla-ladder::after { position: absolute; z-index: 2; top: 20px; bottom: 0; left: 50%; width: 1px; content: ''; pointer-events: none; background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color) 12%, transparent), color-mix(in srgb, var(--primary-color) 42%, transparent) 48%, color-mix(in srgb, var(--primary-color) 12%, transparent)); box-shadow: 0 0 7px color-mix(in srgb, var(--primary-color) 18%, transparent); }
.qla-ladder-resizer { width: 92px; height: 10px; display: flex; align-items: center; justify-content: center; margin: -1px auto 0; padding: 0; color: var(--qtc-muted); border: 0; background: transparent; cursor: ns-resize; touch-action: none; }
.qla-ladder-resizer i { width: 36px; height: 3px; display: block; border-radius: 999px; background: color-mix(in srgb, var(--qtc-muted) 42%, transparent); box-shadow: 0 1px 0 color-mix(in srgb, #fff 16%, transparent); transition: width 140ms ease, background 140ms ease, box-shadow 140ms ease; }
.qla-ladder-resizer:hover i, .qla-ladder-resizer:focus-visible i, .qla-ladder-resizer.is-resizing i { width: 48px; background: color-mix(in srgb, var(--primary-color) 72%, var(--qtc-muted)); box-shadow: 0 0 8px color-mix(in srgb, var(--primary-color) 24%, transparent); }
.qla-ladder-resizer:focus { outline: none; }
.qla-ladder__head, .qla-ladder__row { display: grid; grid-template-columns: minmax(74px, 1fr) 86px 86px minmax(74px, 1fr); }
.qla-ladder__head { position: sticky; z-index: 4; top: 0; min-height: 22px; align-items: center; color: var(--qtc-muted); background: linear-gradient(90deg, color-mix(in srgb, var(--qtc-green) 4%, var(--qtc-muted-bg)), var(--qtc-muted-bg) 48%, var(--qtc-muted-bg) 52%, color-mix(in srgb, var(--qtc-red) 4%, var(--qtc-muted-bg))); box-shadow: 0 1px 0 color-mix(in srgb, var(--qtc-border) 72%, transparent); font-size: 10px; font-weight: 500; letter-spacing: 0; }
.qla-ladder__head span { padding: 0 7px; }
.qla-ladder__head span:nth-child(2), .qla-ladder__head span:nth-child(3) { text-align: center; }
.qla-ladder__head span:last-child { text-align: right; }
.qla-ladder__row { min-height: 23px; border-top: 1px solid color-mix(in srgb, var(--qtc-border) 60%, transparent); transition: background 120ms ease; }
.qla-ladder__row:hover { background: linear-gradient(90deg, color-mix(in srgb, var(--qtc-green) 5%, transparent), transparent 48%, transparent 52%, color-mix(in srgb, var(--qtc-red) 5%, transparent)); }
.qla-depth-cell { position: relative; min-width: 0; display: flex; align-items: center; gap: 6px; padding: 0 7px; overflow: hidden; }
.qla-depth-cell i { position: absolute; z-index: 0; top: 3px; bottom: 3px; opacity: 0.2; border-radius: 3px; transition: width 160ms ease; }
.qla-depth-cell strong, .qla-depth-cell small { position: relative; z-index: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qla-depth-cell strong { font-size: 11px; font-weight: 650; }
.qla-depth-cell small { margin-left: auto; color: var(--qtc-muted); font-size: 10px; font-weight: 500; }
.qla-depth-cell.is-bid i { right: 0; background: linear-gradient(90deg, transparent, var(--qtc-green)); }
.qla-depth-cell.is-ask { flex-direction: row-reverse; text-align: right; }
.qla-depth-cell.is-ask i { left: 0; background: linear-gradient(90deg, var(--qtc-red), transparent); }
.qla-depth-cell.is-ask small { margin-right: auto; margin-left: 0; }
.qla-price { position: relative; z-index: 1; padding: 0 4px; background: transparent; border: 0; border-left: 1px solid color-mix(in srgb, var(--qtc-border) 72%, transparent); font-size: 11px; font-weight: 700; cursor: pointer; transition: background 120ms ease, filter 120ms ease; }
.qla-price:last-of-type { border-right: 1px solid var(--qtc-border); }
.qla-price:disabled { color: var(--qtc-muted); cursor: default; }
.qla-price:not(:disabled):hover { background: color-mix(in srgb, var(--primary-color) 8%, var(--qtc-muted-bg)); filter: brightness(1.04); }
.qla-price.is-bid { color: var(--qtc-green); }
.qla-price.is-ask { color: var(--qtc-red); }
.qla-decision { display: grid; grid-template-columns: minmax(120px, 0.9fr) minmax(250px, 1.5fr) minmax(120px, 0.9fr); gap: 7px; padding-top: 5px; }
.qla-wall, .qla-impact { min-width: 0; min-height: 72px; padding: 7px 10px; border: 1px solid var(--qtc-border); border-radius: 8px; background: color-mix(in srgb, var(--qtc-muted-bg) 35%, transparent); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 14%, transparent), 0 4px 10px color-mix(in srgb, #000 3%, transparent); }
.qla-wall__head, .qla-wall__value { display: flex; align-items: center; justify-content: space-between; gap: 5px; }
.qla-wall span, .qla-wall small, .qla-wall em, .qla-wall b { color: var(--qtc-muted); font-size: 10px; font-style: normal; font-weight: 500; }
.qla-wall__head span { display: inline-flex; align-items: center; gap: 4px; font-weight: 650; }
.qla-wall__head em { display: inline-flex; align-items: center; gap: 4px; padding: 1px 5px; border-radius: 99px; background: color-mix(in srgb, var(--qtc-muted-bg) 85%, transparent); }
.qla-wall__head em i { width: 4px; height: 4px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 12%, transparent); }
.qla-wall__value { margin: 2px 0 1px; }
.qla-wall__value strong { overflow: hidden; font-size: 14px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.qla-wall__value b { flex: 0 0 auto; }
.qla-wall__meter { height: 3px; margin: 2px 0 3px; overflow: hidden; border-radius: 99px; background: color-mix(in srgb, var(--qtc-muted-bg) 85%, transparent); }
.qla-wall__meter i { display: block; height: 100%; border-radius: inherit; transition: width 180ms ease; }
.qla-wall small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qla-wall.is-bid { border-color: color-mix(in srgb, var(--qtc-green) 22%, var(--qtc-border)); background: linear-gradient(135deg, color-mix(in srgb, var(--qtc-green) 7%, transparent), color-mix(in srgb, var(--qtc-muted-bg) 28%, transparent)); box-shadow: inset 3px 0 0 color-mix(in srgb, var(--qtc-green) 55%, transparent); }
.qla-wall.is-bid strong, .qla-wall.is-bid .qla-wall__head span { color: var(--qtc-green); }
.qla-wall.is-bid .qla-wall__meter i { background: linear-gradient(90deg, color-mix(in srgb, var(--qtc-green) 55%, transparent), var(--qtc-green)); box-shadow: 0 0 8px color-mix(in srgb, var(--qtc-green) 38%, transparent); }
.qla-wall.is-ask { text-align: right; }
.qla-wall.is-ask { border-color: color-mix(in srgb, var(--qtc-red) 22%, var(--qtc-border)); background: linear-gradient(225deg, color-mix(in srgb, var(--qtc-red) 7%, transparent), color-mix(in srgb, var(--qtc-muted-bg) 28%, transparent)); box-shadow: inset -3px 0 0 color-mix(in srgb, var(--qtc-red) 55%, transparent); }
.qla-wall.is-ask strong, .qla-wall.is-ask .qla-wall__head span { color: var(--qtc-red); }
.qla-wall.is-ask .qla-wall__meter i { margin-left: auto; background: linear-gradient(90deg, var(--qtc-red), color-mix(in srgb, var(--qtc-red) 55%, transparent)); box-shadow: 0 0 8px color-mix(in srgb, var(--qtc-red) 38%, transparent); }
.qla-impact { border-color: color-mix(in srgb, var(--primary-color) 18%, var(--qtc-border)); background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color) 5%, transparent), color-mix(in srgb, var(--qtc-muted-bg) 27%, transparent)); }
.qla-impact.is-limited { border-color: color-mix(in srgb, #faad14 55%, var(--qtc-border)); }
.qla-impact__title { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 6px; color: var(--qtc-muted); font-size: 10px; }
.qla-impact__title span { display: inline-flex; align-items: center; gap: 4px; font-weight: 650; }
.qla-impact__title em { padding: 1px 5px; color: var(--primary-color); border: 1px solid color-mix(in srgb, var(--primary-color) 20%, transparent); border-radius: 99px; background: color-mix(in srgb, var(--primary-color) 6%, transparent); font-size: 9px; font-style: normal; font-weight: 600; white-space: nowrap; }
.qla-impact.is-low .qla-impact__title em { color: var(--qtc-green); border-color: color-mix(in srgb, var(--qtc-green) 24%, transparent); background: color-mix(in srgb, var(--qtc-green) 7%, transparent); }
.qla-impact.is-medium .qla-impact__title em { color: #d48806; border-color: color-mix(in srgb, #d48806 28%, transparent); background: color-mix(in srgb, #d48806 7%, transparent); }
.qla-impact.is-high .qla-impact__title em { color: var(--qtc-red); border-color: color-mix(in srgb, var(--qtc-red) 26%, transparent); background: color-mix(in srgb, var(--qtc-red) 7%, transparent); }
.qla-impact__title strong { color: var(--qtc-text); font-size: 12px; font-weight: 650; }
.qla-impact__metrics { display: grid; grid-template-columns: 1.25fr 0.8fr 0.7fr; gap: 5px; margin-top: 4px; }
.qla-impact__metrics span { min-width: 0; color: var(--qtc-muted); font-size: 9px; font-weight: 500; }
.qla-impact__metrics strong { display: block; overflow: hidden; color: var(--qtc-text); font-size: 12px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.qla-impact__meter { height: 3px; margin-top: 3px; overflow: hidden; border-radius: 99px; background: color-mix(in srgb, var(--qtc-muted-bg) 88%, transparent); }
.qla-impact__meter i { display: block; height: 100%; border-radius: inherit; background: var(--qtc-green); box-shadow: 0 0 8px color-mix(in srgb, var(--qtc-green) 32%, transparent); transition: width 180ms ease; }
.qla-impact.is-medium .qla-impact__meter i { background: #d48806; box-shadow: 0 0 8px color-mix(in srgb, #d48806 32%, transparent); }
.qla-impact.is-high .qla-impact__meter i { background: var(--qtc-red); box-shadow: 0 0 8px color-mix(in srgb, var(--qtc-red) 32%, transparent); }
.qla-impact > small { display: block; overflow: hidden; color: var(--qtc-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.qla-state { min-height: 190px; display: flex; align-items: center; justify-content: center; gap: 7px; color: var(--qtc-muted); font-size: 12px; }
.qla-state--error { flex-direction: column; }
.qla-state button { color: var(--primary-color); }
.qla-skeleton { min-height: 250px; padding-top: 8px; overflow: hidden; }
.qla-skeleton__meta { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; color: var(--qtc-muted); font-size: 11px; }
.qla-skeleton__meta > span { display: flex; align-items: center; gap: 6px; }
.qla-skeleton__meta > span:last-child { justify-content: flex-end; }
.qla-skeleton__meta i { width: 62px; height: 4px; border-radius: 99px; background: var(--qtc-green); opacity: 0.7; }
.qla-skeleton__meta > span:last-child i { background: var(--qtc-red); }
.qla-skeleton__meta strong { display: flex; align-items: center; gap: 6px; font-weight: 500; }
.qla-skeleton__ladder { display: flex; flex-direction: column; gap: 7px; margin-top: 18px; }
.qla-skeleton__ladder i { height: 19px; margin: 0 auto; border-radius: 4px; background: linear-gradient(90deg, color-mix(in srgb, var(--qtc-green) 48%, transparent) 0 49%, var(--qtc-border) 49% 51%, color-mix(in srgb, var(--qtc-red) 48%, transparent) 51% 100%); animation: qla-pulse 1.2s ease-in-out infinite alternate; }
@keyframes qla-pulse { from { opacity: 0.28; } to { opacity: 0.62; } }
.qla.is-collapsed .qla-head { border-bottom: 0; }
@media (max-width: 720px) {
  .qla-title strong { font-size: 13px; }
  .qla-feed { display: none; }
  .qla-modes button { padding: 0 6px; }
  .qla-intel { grid-template-columns: 1fr 156px 1fr; gap: 7px; }
  .qla-flow { padding: 1px 5px; }
  .qla-flow__quote { grid-template-columns: auto 1fr; gap: 4px; }
  .qla-flow__quote em { display: none; }
  .qla-flow__pressure { grid-template-columns: minmax(72px, 1fr) auto; gap: 4px; }
  .qla-flow__pressure > span { display: none; }
  .qla-flow__scale { gap: 3px; }
  .qla-ladder__head, .qla-ladder__row { grid-template-columns: minmax(62px, 1fr) 74px 74px minmax(62px, 1fr); }
  .qla-decision { grid-template-columns: 1fr 1fr; }
  .qla-impact { grid-column: 1 / -1; grid-row: 1; }
}
</style>
