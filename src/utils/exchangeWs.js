/**
 * Exchange WebSocket K-line stream client.
 *
 * Supports venue-scoped spot and perpetual streams for the configured exchange.
 * A failed stream falls back to REST for the same venue; prices never cross venues.
 */

// ── Exchange WebSocket configs ─────────────────────────────

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

function normalizedMarketType (value) {
  const raw = String(value || 'spot').trim().toLowerCase()
  return ['swap', 'future', 'futures', 'perp', 'perpetual', 'linear'].includes(raw) ? 'swap' : 'spot'
}

function closedByTime (timestamp, timeframe) {
  const duration = TIMEFRAME_MS[String(timeframe || '')]
  const start = Number(timestamp)
  return Boolean(duration && Number.isFinite(start) && Date.now() >= start + duration)
}

function normalizedSymbol (value) {
  return String(value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

function spotPair (value) {
  const raw = String(value || '').replace(/:/g, '/').split('/').filter(Boolean)
  if (raw.length >= 2) return `${raw[0].toUpperCase()}_${raw[1].toUpperCase()}`
  const compact = normalizedSymbol(value)
  for (const quote of ['USDT', 'USDC', 'USD', 'BTC', 'ETH']) {
    if (compact.endsWith(quote) && compact.length > quote.length) {
      return `${compact.slice(0, -quote.length)}_${quote}`
    }
  }
  return compact
}

function okxInstrumentId (symbol, marketType, instrumentId) {
  const supplied = String(instrumentId || '').trim().toUpperCase()
  if (supplied.includes('-')) return supplied
  const pair = spotPair(supplied || symbol).replace('_', '-')
  return normalizedMarketType(marketType) === 'swap' && !pair.endsWith('-SWAP') ? `${pair}-SWAP` : pair
}

function gateInstrumentId (symbol, instrumentId) {
  const supplied = String(instrumentId || '').trim().toUpperCase()
  if (supplied.includes('_')) return supplied
  return spotPair(supplied || symbol)
}

function htxInstrumentId (symbol, marketType, instrumentId) {
  const supplied = String(instrumentId || '').trim()
  const pair = spotPair(supplied || symbol)
  return normalizedMarketType(marketType) === 'swap' ? pair.replace('_', '-') : pair.replace('_', '').toLowerCase()
}

function subscriptionControlState (data) {
  const event = String(data.event || '').toLowerCase()
  const op = String(data.op || '').toLowerCase()
  const status = String(data.status || (data.result && data.result.status) || '').toLowerCase()
  const errorCode = data.code ?? data.retCode ?? data.err_code ?? data['err-code']
  const hasErrorCode = errorCode !== undefined && errorCode !== null && String(errorCode) !== ''
  const isControl = event === 'subscribe' || event === 'error' || op === 'subscribe' ||
    data.subbed !== undefined || status === 'error' || Boolean(data.error)
  if (!isControl) return null

  const normalizedCode = hasErrorCode ? String(errorCode) : ''
  return {
    failed: Boolean(data.error) || event === 'error' || status === 'fail' || status === 'error' ||
      data.success === false || (hasErrorCode && !['0', '00000'].includes(normalizedCode))
  }
}

export function parseGateSpotBar (data, context = {}) {
  if (!['spot.candlesticks', 'futures.candlesticks'].includes(data.channel) || data.event !== 'update') return null
  const c = Array.isArray(data.result) ? data.result[0] : data.result
  if (!c) return null
  const swap = normalizedMarketType(context.marketType) === 'swap' || data.channel === 'futures.candlesticks'
  const baseVolume = parseFloat(swap ? c.v : c.a)
  const timestamp = parseInt(c.t) * 1000
  return {
    timestamp,
    open: parseFloat(c.o),
    high: parseFloat(c.h),
    low: parseFloat(c.l),
    close: parseFloat(c.c),
    // Spot `a` is base volume; futures `v` is the exchange contract volume.
    volume: Number.isFinite(baseVolume) ? baseVolume : 0,
    isClosed: c.w === true || closedByTime(timestamp, context.timeframe)
  }
}

const EXCHANGE_WS = {
  binance: {
    buildUrl (symbol, interval, context) {
      const s = normalizedSymbol(context.instrumentId || symbol).toLowerCase()
      const base = normalizedMarketType(context.marketType) === 'swap'
        ? 'wss://fstream.binance.com/ws'
        : 'wss://data-stream.binance.vision/ws'
      return `${base}/${s}@kline_${interval}`
    },
    parseBar (data, context) {
      if (data.e !== 'kline' || !data.k) return null
      const k = data.k
      return {
        timestamp: k.t,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
        isClosed: !!k.x
      }
    },
    pingInterval: 0
  },

  okx: {
    base: 'wss://ws.okx.com/ws/v5/business',
    buildUrl () { return this.base },
    subscribe (ws, symbol, interval, context) {
      const instId = okxInstrumentId(symbol, context.marketType, context.instrumentId)
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [{ channel: 'candle' + interval, instId }]
      }))
    },
    parseBar (data) {
      if (!data.data || !data.arg || !data.arg.channel) return null
      if (!data.arg.channel.startsWith('candle')) return null
      const c = data.data[0]
      if (!c) return null
      return {
        timestamp: parseInt(c[0]),
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5]),
        isClosed: String(c[8] || '') === '1'
      }
    },
    ping (ws) { try { ws.send('ping') } catch (_) {} },
    pingInterval: 25000
  },

  bitget: {
    base: 'wss://ws.bitget.com/v2/ws/public',
    buildUrl () { return this.base },
    subscribe (ws, symbol, interval, context) {
      const instId = normalizedSymbol(context.instrumentId || symbol)
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [{
          instType: normalizedMarketType(context.marketType) === 'swap' ? 'USDT-FUTURES' : 'SPOT',
          channel: 'candle' + interval,
          instId
        }]
      }))
    },
    parseBar (data, context) {
      if (!data.data || !Array.isArray(data.data) || data.data.length === 0) return null
      if (!data.arg || !String(data.arg.channel || '').startsWith('candle')) return null
      const c = data.data[0]
      if (!Array.isArray(c)) return null
      return {
        timestamp: parseInt(c[0]),
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5]),
        isClosed: closedByTime(parseInt(c[0]), context.timeframe)
      }
    },
    ping (ws) { try { ws.send('ping') } catch (_) {} },
    pingInterval: 25000
  },

  bybit: {
    buildUrl (_symbol, _interval, context) {
      return `wss://stream.bybit.com/v5/public/${normalizedMarketType(context.marketType) === 'swap' ? 'linear' : 'spot'}`
    },
    subscribe (ws, symbol, interval, context) {
      const s = normalizedSymbol(context.instrumentId || symbol)
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [`kline.${interval}.${s}`]
      }))
    },
    parseBar (data) {
      if (!data.data || data.topic === undefined) return null
      if (!String(data.topic).startsWith('kline.')) return null
      const c = data.data[0]
      if (!c) return null
      return {
        timestamp: parseInt(c.start),
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
        volume: parseFloat(c.volume),
        isClosed: !!c.confirm
      }
    },
    ping (ws) { try { ws.send(JSON.stringify({ op: 'ping' })) } catch (_) {} },
    pingInterval: 20000
  },

  gate: {
    buildUrl (_symbol, _interval, context) {
      return normalizedMarketType(context.marketType) === 'swap'
        ? 'wss://fx-ws.gateio.ws/v4/ws/usdt'
        : 'wss://api.gateio.ws/ws/v4/'
    },
    subscribe (ws, symbol, interval, context) {
      const swap = normalizedMarketType(context.marketType) === 'swap'
      const s = gateInstrumentId(symbol, context.instrumentId)
      ws.send(JSON.stringify({
        time: Math.floor(Date.now() / 1000),
        channel: swap ? 'futures.candlesticks' : 'spot.candlesticks',
        event: 'subscribe',
        payload: [interval, s]
      }))
    },
    parseBar (data, context) {
      return parseGateSpotBar(data, context)
    },
    ping (ws, context) {
      try {
        ws.send(JSON.stringify({
          time: Math.floor(Date.now() / 1000),
          channel: normalizedMarketType(context.marketType) === 'swap' ? 'futures.ping' : 'spot.ping'
        }))
      } catch (_) {}
    },
    pingInterval: 20000
  },

  htx: {
    buildUrl (_symbol, _interval, context) {
      return normalizedMarketType(context.marketType) === 'swap'
        ? 'wss://api.hbdm.com/linear-swap-ws'
        : 'wss://api.huobi.pro/ws'
    },
    subscribe (ws, symbol, interval, context) {
      const instrument = htxInstrumentId(symbol, context.marketType, context.instrumentId)
      ws.send(JSON.stringify({
        sub: `market.${instrument}.kline.${interval}`,
        id: `qd-${Date.now()}`
      }))
    },
    parseBar (data, context) {
      const channel = String(data.ch || '')
      const c = data.tick
      if (!channel.includes('.kline.') || !c) return null
      const timestamp = parseInt(c.id) * 1000
      return {
        timestamp,
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
        volume: parseFloat(c.amount || 0),
        isClosed: closedByTime(timestamp, context.timeframe)
      }
    },
    pingInterval: 0
  }
}

// ── Timeframe mapping per exchange ──────────────────────────

const BINANCE_TF = { '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m', '1H': '1h', '4H': '4h', '1D': '1d', '1W': '1w' }
const OKX_TF = { '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m', '1H': '1H', '4H': '4H', '1D': '1D', '1W': '1W' }
const BITGET_TF = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1H': '1H', '4H': '4H', '1D': '1D', '1W': '1W' }
const BYBIT_TF = { '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30', '1H': '60', '4H': '240', '1D': 'D', '1W': 'W' }
const GATE_TF = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1H': '1h', '4H': '4h', '1D': '1d', '1W': '7d' }
const HTX_TF = { '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min', '1H': '60min', '4H': '4hour', '1D': '1day', '1W': '1week' }

export function getExchangeInterval (exchange, timeframe) {
  const map = { binance: BINANCE_TF, okx: OKX_TF, bitget: BITGET_TF, bybit: BYBIT_TF, gate: GATE_TF, htx: HTX_TF }
  return (map[exchange] || {})[timeframe] || null
}

// ── Resolve exchange alias ──────────────────────────────────

function resolveExchangeId (id) {
  const lower = (id || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const aliases = {
    okx: 'okx',
    okex: 'okx',
    binance: 'binance',
    bitget: 'bitget',
    bybit: 'bybit',
    gate: 'gate',
    gateio: 'gate',
    htx: 'htx',
    huobi: 'htx'
  }
  return aliases[lower] || ''
}

// ── Main class ──────────────────────────────────────────────

export default class ExchangeKlineWs {
  constructor () {
    this._ws = null
    this._url = ''
    this._exchangeId = 'binance'
    this._exchangeConf = EXCHANGE_WS.binance
    this._onTick = null
    this._onNewBar = null
    this._onError = null
    this._onReconnecting = null
    this._onReconnected = null
    this._reconnectAttempts = 0
    this._maxReconnectAttempts = 20
    this._reconnectTimer = null
    this._pingTimer = null
    this._closed = false
    this._symbol = ''
    this._timeframe = ''
    this._marketType = 'spot'
    this._instrumentId = ''
    this._everConnected = false
    this._fallbackUsed = false
    this._connectTimeout = null
    this._dataTimeout = null
    this._openGen = 0
    this._gotData = false
  }

  /**
   * @param {string} symbol  e.g. "BTC/USDT"
   * @param {string} timeframe e.g. "1m", "1H"
   * @param {Object} callbacks
   * @param {string} [exchangeId] preferred exchange from settings
   */
  connect (symbol, timeframe, callbacks, exchangeId, options = {}) {
    this.disconnect()
    this._closed = false
    this._everConnected = false
    this._fallbackUsed = false
    this._symbol = symbol
    this._timeframe = timeframe
    this._marketType = normalizedMarketType(options.marketType)
    this._instrumentId = String(options.instrumentId || '').trim()
    this._onTick = callbacks.onTick
    this._onNewBar = callbacks.onNewBar
    this._onError = callbacks.onError || null
    this._onReconnecting = callbacks.onReconnecting || null
    this._onReconnected = callbacks.onReconnected || null
    this._reconnectAttempts = 0

    this._exchangeId = resolveExchangeId(exchangeId)
    this._exchangeConf = EXCHANGE_WS[this._exchangeId]
    if (!this._exchangeConf || !getExchangeInterval(this._exchangeId, this._timeframe)) {
      this._closed = true
      if (this._onError) this._onError()
      return false
    }
    this._buildUrl()
    this._open()
    return !this._closed
  }

  disconnect () {
    this._closed = true
    this._openGen++
    this._clearTimers()
    if (this._ws) {
      this._ws.onclose = null
      this._ws.onmessage = null
      this._ws.onerror = null
      this._ws.onopen = null
      try { this._ws.close() } catch (_) {}
      this._ws = null
    }
  }

  isConnected () {
    return this._ws !== null && this._ws.readyState === WebSocket.OPEN
  }

  currentExchange () {
    return this._exchangeId
  }

  // ── internal ──────────────────────────────

  _buildUrl () {
    const interval = getExchangeInterval(this._exchangeId, this._timeframe)
    this._url = this._exchangeConf.buildUrl(this._symbol, interval, this._context())
  }

  _context () {
    return {
      exchangeId: this._exchangeId,
      marketType: this._marketType,
      instrumentId: this._instrumentId,
      timeframe: this._timeframe
    }
  }

  _open () {
    if (this._closed) return
    const myGen = ++this._openGen
    try {
      this._ws = new WebSocket(this._url)
      this._ws.binaryType = 'arraybuffer'
    } catch (e) {
      console.warn(`[ExchangeWs] ${this._exchangeId} WebSocket constructor failed:`, e.message)
      this._tryFallback()
      return
    }

    this._connectTimeout = setTimeout(() => {
      if (myGen !== this._openGen) return
      if (this._ws && this._ws.readyState !== WebSocket.OPEN) {
        console.warn(`[ExchangeWs] ${this._exchangeId} connect timeout (8s)`)
        this._ws.onclose = null
        this._ws.onerror = null
        try { this._ws.close() } catch (_) {}
        this._ws = null
        this._tryFallback()
      }
    }, 8000)

    this._ws.onopen = () => {
      if (myGen !== this._openGen) return
      if (this._connectTimeout) {
        clearTimeout(this._connectTimeout)
        this._connectTimeout = null
      }
      const wasReconnect = this._everConnected
      this._everConnected = true
      this._reconnectAttempts = 0
      this._gotData = false
      this._startPing()

      if (this._exchangeConf.subscribe) {
        const interval = getExchangeInterval(this._exchangeId, this._timeframe)
        try {
          this._exchangeConf.subscribe(this._ws, this._symbol, interval, this._context())
        } catch (e) {
          console.warn(`[ExchangeWs] ${this._exchangeId} subscribe error:`, e)
        }
      }

      // If no data arrives within 12s after open, the connection or subscription
      // likely failed silently, so the caller must continue same-venue REST polling.
      if (!this._fallbackUsed) {
        this._dataTimeout = setTimeout(() => {
          if (myGen !== this._openGen) return
          if (!this._gotData && !this._closed) {
            console.warn(`[ExchangeWs] ${this._exchangeId} connected but no data received`)
            this._ws.onclose = null
            try { this._ws.close() } catch (_) {}
            this._ws = null
            this._tryFallback()
          }
        }, 12000)
      }

      if (wasReconnect && this._onReconnected) {
        this._onReconnected()
      }
    }

    this._ws.onmessage = (evt) => {
      if (myGen !== this._openGen) return
      this._handleMessage(evt, myGen)
    }

    this._ws.onerror = () => {}

    this._ws.onclose = () => {
      if (myGen !== this._openGen) return
      if (this._connectTimeout) {
        clearTimeout(this._connectTimeout)
        this._connectTimeout = null
      }
      this._clearPing()
      if (!this._closed) {
        if (!this._everConnected && !this._fallbackUsed) {
          this._tryFallback()
        } else {
          if (this._everConnected && this._onReconnecting) {
            this._onReconnecting()
          }
          this._scheduleReconnect()
        }
      }
    }
  }

  _tryFallback () {
    this._fallbackUsed = true
    this._closed = true
    this._clearTimers()
    if (this._onError) this._onError()
  }

  async _decodeMessage (raw) {
    if (typeof raw === 'string') return raw
    let bytes = null
    if (raw instanceof ArrayBuffer) bytes = new Uint8Array(raw)
    else if (typeof Blob !== 'undefined' && raw instanceof Blob) bytes = new Uint8Array(await raw.arrayBuffer())
    if (!bytes) return ''

    const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
    if (isGzip && typeof DecompressionStream !== 'undefined') {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
      return new Response(stream).text()
    }
    return new TextDecoder().decode(bytes)
  }

  async _handleMessage (evt, generation = this._openGen) {
    let raw
    try {
      raw = await this._decodeMessage(evt.data)
    } catch (_) {
      return
    }
    if (generation !== this._openGen || this._closed) return
    if (raw === 'pong' || raw === '') return

    let data
    try { data = JSON.parse(raw) } catch (_) { return }

    if (data.ping !== undefined) {
      try { this._ws.send(JSON.stringify({ pong: data.ping })) } catch (_) {}
      return
    }
    if (data.op === 'ping') {
      try { this._ws.send(JSON.stringify({ op: 'pong', ts: data.ts })) } catch (_) {}
      return
    }

    const subscriptionControl = subscriptionControlState(data)
    if (subscriptionControl) {
      if (subscriptionControl.failed) {
        console.warn(`[ExchangeWs] ${this._exchangeId} subscription rejected`)
        if (this._ws) {
          this._ws.onclose = null
          try { this._ws.close() } catch (_) {}
          this._ws = null
        }
        this._tryFallback()
      }
      return
    }
    if (data.event === 'pong' || data.ret_msg === 'pong') return

    let parsed
    try {
      parsed = this._exchangeConf.parseBar(data, this._context())
    } catch (_) {
      return
    }
    if (!parsed) return

    if (!this._gotData) {
      this._gotData = true
      if (this._dataTimeout) {
        clearTimeout(this._dataTimeout)
        this._dataTimeout = null
      }
    }

    const bar = {
      timestamp: parsed.timestamp,
      open: parsed.open,
      high: parsed.high,
      low: parsed.low,
      close: parsed.close,
      volume: parsed.volume
    }

    if (this._onTick) {
      this._onTick(bar)
    }

    if (parsed.isClosed && this._onNewBar) {
      this._onNewBar(bar)
    }
  }

  _scheduleReconnect () {
    if (this._closed) return
    this._reconnectAttempts++
    if (this._reconnectAttempts > this._maxReconnectAttempts) {
      if (this._onError) this._onError()
      return
    }
    const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts - 1), 30000)
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null
      this._open()
    }, delay)
  }

  _startPing () {
    this._clearPing()
    const interval = Number(this._exchangeConf.pingInterval || 0)
    if (!interval || typeof this._exchangeConf.ping !== 'function') return
    this._pingTimer = setInterval(() => {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        this._exchangeConf.ping(this._ws, this._context())
      }
    }, interval)
  }

  _clearPing () {
    if (this._pingTimer) {
      clearInterval(this._pingTimer)
      this._pingTimer = null
    }
  }

  _clearTimers () {
    this._clearPing()
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer)
      this._reconnectTimer = null
    }
    if (this._connectTimeout) {
      clearTimeout(this._connectTimeout)
      this._connectTimeout = null
    }
    if (this._dataTimeout) {
      clearTimeout(this._dataTimeout)
      this._dataTimeout = null
    }
  }
}

export { resolveExchangeId, EXCHANGE_WS }
