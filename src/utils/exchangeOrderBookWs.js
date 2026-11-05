import { orderBookQuantityUnit } from './orderBookUnits.js'

const EXCHANGE_ALIASES = {
  binance: 'binance',
  okx: 'okx',
  okex: 'okx',
  bitget: 'bitget',
  bybit: 'bybit',
  gate: 'gate',
  gateio: 'gate',
  htx: 'htx',
  huobi: 'htx'
}

function marketType (value) {
  const normalized = String(value || '').toLowerCase()
  return ['swap', 'future', 'futures', 'perpetual', 'contract'].includes(normalized) ? 'swap' : 'spot'
}

export function resolveOrderBookExchangeId (value) {
  const key = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return EXCHANGE_ALIASES[key] || ''
}

function compactSymbol (value) {
  return String(value || '')
    .replace(/^[^:]+:/, '')
    .replace(/[-_]SWAP$/i, '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
}

function pairSymbol (value, separator) {
  const raw = String(value || '')
    .replace(/^[^:]+:/, '')
    .replace(/[-_]SWAP$/i, '')
    .toUpperCase()
  const parts = raw.split(/[/_-]/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]}${separator}${parts[1]}`
  const compact = compactSymbol(raw)
  for (const quote of ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'EUR']) {
    if (compact.endsWith(quote) && compact.length > quote.length) {
      return `${compact.slice(0, -quote.length)}${separator}${quote}`
    }
  }
  return compact
}

function okxSymbol (value, type) {
  const pair = pairSymbol(value, '-')
  return type === 'swap' && !pair.endsWith('-SWAP') ? `${pair}-SWAP` : pair
}

function normalizeRows (rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(row => Array.isArray(row) ? [Number(row[0]), Number(row[1])] : [Number(row.price), Number(row.size)])
    .filter(row => Number.isFinite(row[0]) && row[0] > 0 && Number.isFinite(row[1]) && row[1] >= 0)
}

function normalizeSequence (value) {
  if (value === undefined || value === null || value === '') return null
  const text = String(value)
  if (/^-?\d+$/.test(text)) {
    try {
      const integer = BigInt(text)
      if (integer <= BigInt(Number.MAX_SAFE_INTEGER) && integer >= BigInt(Number.MIN_SAFE_INTEGER)) return Number(integer)
      return integer.toString()
    } catch (_) {}
  }
  const number = Number(value)
  return Number.isFinite(number) ? number : text
}

function sequenceInteger (value) {
  if (value === undefined || value === null || value === '') return null
  try { return BigInt(String(value)) } catch (_) { return null }
}

function compareSequence (left, right) {
  const leftInteger = sequenceInteger(left)
  const rightInteger = sequenceInteger(right)
  if (leftInteger === null || rightInteger === null) return String(left) === String(right) ? 0 : null
  return leftInteger === rightInteger ? 0 : (leftInteger > rightInteger ? 1 : -1)
}

function sequenceIsNext (current, next) {
  const currentInteger = sequenceInteger(current)
  const nextInteger = sequenceInteger(next)
  return currentInteger !== null && nextInteger !== null && nextInteger === currentInteger + BigInt(1)
}

function sequenceIs (value, expected) {
  return compareSequence(value, expected) === 0
}

export function parseOrderBookJson (raw) {
  const lossless = String(raw || '').replace(
    /("(?:seq|pseq|seqId|prevSeqId|lastUpdateId|u|U)"\s*:\s*)(-?\d{16,})(?=\s*[,}\]])/g,
    '$1"$2"'
  )
  return JSON.parse(lossless)
}

export class LocalOrderBook {
  constructor () {
    this.bids = new Map()
    this.asks = new Map()
    this.sequence = null
    this.timestamp = 0
    this.ready = false
  }

  replace (bids, asks, sequence, timestamp) {
    this.bids.clear()
    this.asks.clear()
    this._applySide(this.bids, bids)
    this._applySide(this.asks, asks)
    this.sequence = normalizeSequence(sequence)
    this.timestamp = Number(timestamp || Date.now())
    this.ready = this.bids.size > 0 && this.asks.size > 0
  }

  update (bids, asks, sequence, timestamp) {
    if (!this.ready) throw new Error('ORDER_BOOK_SNAPSHOT_REQUIRED')
    this._applySide(this.bids, bids)
    this._applySide(this.asks, asks)
    if (sequence !== undefined && sequence !== null) this.sequence = normalizeSequence(sequence)
    this.timestamp = Number(timestamp || Date.now())
  }

  _applySide (target, rows) {
    normalizeRows(rows).forEach(([price, size]) => {
      if (size === 0) target.delete(price)
      else target.set(price, size)
    })
  }

  snapshot (context, limit = 50) {
    if (!this.ready) return null
    const toRows = (source, descending) => [...source.entries()]
      .sort((left, right) => descending ? right[0] - left[0] : left[0] - right[0])
      .slice(0, limit)
      .map(([price, size]) => ({ price, size, notional: price * size }))
    const bids = toRows(this.bids, true)
    const asks = toRows(this.asks, false)
    if (!bids.length || !asks.length) return null
    const bestBid = bids[0].price
    const bestAsk = asks[0].price
    const mid = (bestBid + bestAsk) / 2
    const spread = Math.max(0, bestAsk - bestBid)
    return {
      exchange_id: context.exchangeId,
      symbol: context.symbol,
      market_type: context.marketType,
      quantity_unit: orderBookQuantityUnit(context.exchangeId, context.marketType),
      timestamp: this.timestamp,
      sequence: this.sequence,
      transport: 'websocket',
      received_at: Date.now(),
      bids,
      asks,
      best_bid: bestBid,
      best_ask: bestAsk,
      mid,
      spread,
      spread_bps: mid > 0 ? spread / mid * 10000 : 0
    }
  }
}

function ensureSequence (book, previous, next, reset = false) {
  if (reset || book.sequence === null || previous === undefined || previous === null) return
  if (compareSequence(previous, book.sequence) !== 0) throw new Error('ORDER_BOOK_SEQUENCE_GAP')
}

export function applyBinanceOrderBook (book, data) {
  if (!data || (!Array.isArray(data.bids) && !Array.isArray(data.b))) return false
  book.replace(data.bids || data.b, data.asks || data.a, data.lastUpdateId ?? data.u, data.E)
  return true
}

export function applyOkxOrderBook (book, data) {
  if (!data || !data.arg || data.arg.channel !== 'books' || !Array.isArray(data.data)) return false
  const row = data.data[0]
  if (!row) return false
  const snapshot = data.action === 'snapshot'
  if (!snapshot) ensureSequence(book, row.prevSeqId, row.seqId, sequenceIs(row.prevSeqId, -1))
  if (snapshot || sequenceIs(row.prevSeqId, -1)) book.replace(row.bids, row.asks, row.seqId, row.ts)
  else book.update(row.bids, row.asks, row.seqId, row.ts)
  return true
}

export function applyBybitOrderBook (book, data) {
  if (!data || !String(data.topic || '').startsWith('orderbook.') || !data.data) return false
  const row = data.data
  const snapshot = data.type === 'snapshot' || sequenceIs(row.u, 1)
  if (!snapshot && book.sequence !== null) {
    const order = compareSequence(row.u, book.sequence)
    if (order !== null && order <= 0) return false
    if (!sequenceIsNext(book.sequence, row.u)) throw new Error('ORDER_BOOK_SEQUENCE_GAP')
  }
  if (snapshot) book.replace(row.b, row.a, row.u, data.ts)
  else book.update(row.b, row.a, row.u, data.ts)
  return true
}

export function applyBitgetOrderBook (book, data) {
  if (!data || !data.arg || !String(data.arg.topic || '').startsWith('books') || !Array.isArray(data.data)) return false
  const row = data.data[0]
  if (!row) return false
  const snapshot = data.action === 'snapshot' || sequenceIs(row.pseq, 0)
  if (!snapshot) ensureSequence(book, row.pseq, row.seq)
  if (snapshot) book.replace(row.b, row.a, row.seq, row.ts || data.ts)
  else book.update(row.b, row.a, row.seq, row.ts || data.ts)
  return true
}

export function applyGateOrderBook (book, data) {
  if (!data || !['spot.obu', 'futures.obu'].includes(data.channel) || data.event !== 'update' || !data.result) return false
  const row = data.result
  const snapshot = row.full === true
  if (!snapshot) {
    if (book.sequence === null) throw new Error('ORDER_BOOK_SNAPSHOT_REQUIRED')
    const lastOrder = compareSequence(row.u, book.sequence)
    if (lastOrder !== null && lastOrder <= 0) return false
    if (lastOrder === null || !sequenceIsNext(book.sequence, row.U)) throw new Error('ORDER_BOOK_SEQUENCE_GAP')
  }
  if (snapshot) book.replace(row.b, row.a, row.u, row.t || data.time_ms)
  else book.update(row.b, row.a, row.u, row.t || data.time_ms)
  return true
}

export function applyHtxOrderBook (book, data) {
  const channel = String(data && data.ch || '')
  if (!data || (!channel.includes('.depth.') && !channel.includes('.mbp.refresh.')) || !data.tick) return false
  const row = data.tick
  book.replace(row.bids, row.asks, row.seqNum || row.version || row.id, row.ts || data.ts)
  return true
}

export const ORDER_BOOK_WS = {
  binance: {
    buildUrl (context) {
      const base = context.marketType === 'swap' ? 'wss://fstream.binance.com/ws' : 'wss://stream.binance.com:443/ws'
      return `${base}/${compactSymbol(context.symbol).toLowerCase()}@depth20@100ms`
    },
    apply: applyBinanceOrderBook,
    pingInterval: 0
  },
  okx: {
    buildUrl: () => 'wss://ws.okx.com/ws/v5/public',
    subscribe (socket, context) {
      socket.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'books', instId: okxSymbol(context.symbol, context.marketType) }] }))
    },
    apply: applyOkxOrderBook,
    ping: socket => socket.send('ping'),
    pingInterval: 25000
  },
  bitget: {
    buildUrl: () => 'wss://ws.bitget.com/v3/ws/public',
    subscribe (socket, context) {
      socket.send(JSON.stringify({
        op: 'subscribe',
        args: [{ instType: context.marketType === 'swap' ? 'usdt-futures' : 'spot', topic: 'books50', symbol: compactSymbol(context.symbol) }]
      }))
    },
    apply: applyBitgetOrderBook,
    ping: socket => socket.send('ping'),
    pingInterval: 25000
  },
  bybit: {
    buildUrl: context => `wss://stream.bybit.com/v5/public/${context.marketType === 'swap' ? 'linear' : 'spot'}`,
    subscribe (socket, context) {
      socket.send(JSON.stringify({ op: 'subscribe', args: [`orderbook.50.${compactSymbol(context.symbol)}`] }))
    },
    apply: applyBybitOrderBook,
    ping: socket => socket.send(JSON.stringify({ op: 'ping' })),
    pingInterval: 20000
  },
  gate: {
    buildUrl: context => context.marketType === 'swap' ? 'wss://fx-ws.gateio.ws/v4/ws/usdt' : 'wss://api.gateio.ws/ws/v4/',
    subscribe (socket, context) {
      const channel = context.marketType === 'swap' ? 'futures.obu' : 'spot.obu'
      socket.send(JSON.stringify({
        time: Math.floor(Date.now() / 1000),
        channel,
        event: 'subscribe',
        payload: [`ob.${pairSymbol(context.symbol, '_')}.50`]
      }))
    },
    apply: applyGateOrderBook,
    ping (socket, context) {
      socket.send(JSON.stringify({
        time: Math.floor(Date.now() / 1000),
        channel: context.marketType === 'swap' ? 'futures.ping' : 'spot.ping'
      }))
    },
    pingInterval: 20000
  },
  htx: {
    buildUrl: context => context.marketType === 'swap' ? 'wss://api.hbdm.com/linear-swap-ws' : 'wss://api.huobi.pro/feed',
    subscribe (socket, context) {
      const instrument = context.marketType === 'swap'
        ? pairSymbol(context.symbol, '-')
        : compactSymbol(context.symbol).toLowerCase()
      const request = context.marketType === 'swap'
        ? { sub: `market.${instrument}.depth.size_20.high_freq`, data_type: 'snapshot', id: `qd-depth-${Date.now()}` }
        : { sub: `market.${instrument}.mbp.refresh.20`, id: `qd-depth-${Date.now()}` }
      socket.send(JSON.stringify(request))
    },
    apply: applyHtxOrderBook,
    pingInterval: 0
  }
}

function subscriptionRejected (data) {
  if (!data || typeof data !== 'object') return false
  const event = String(data.event || '').toLowerCase()
  const status = String(data.status || (data.result && data.result.status) || '').toLowerCase()
  const code = data.code ?? data.retCode ?? data.err_code ?? data['err-code']
  return event === 'error' || status === 'error' || status === 'fail' || data.success === false ||
    (code !== undefined && code !== null && !['', '0', '00000'].includes(String(code)))
}

export default class ExchangeOrderBookWs {
  constructor () {
    this.socket = null
    this.context = null
    this.config = null
    this.book = new LocalOrderBook()
    this.callbacks = {}
    this.closed = true
    this.generation = 0
    this.reconnectAttempts = 0
    this.reconnectTimer = null
    this.connectTimer = null
    this.staleTimer = null
    this.pingTimer = null
    this.emitTimer = null
    this.pendingSnapshot = null
    this.lastDataAt = 0
    this.openedAt = 0
    this.everLive = false
  }

  connect (symbol, callbacks, exchangeId, options = {}) {
    this.disconnect()
    const resolved = resolveOrderBookExchangeId(exchangeId)
    const config = ORDER_BOOK_WS[resolved]
    if (!config || !symbol) {
      if (callbacks && callbacks.onUnavailable) callbacks.onUnavailable()
      return false
    }
    this.closed = false
    this.context = { exchangeId: resolved, symbol, marketType: marketType(options.marketType) }
    this.config = config
    this.callbacks = callbacks || {}
    this.book = new LocalOrderBook()
    this.reconnectAttempts = 0
    this.everLive = false
    this._open()
    return true
  }

  disconnect () {
    this.closed = true
    this.generation += 1
    this._clearTimers()
    if (this.socket) {
      this.socket.onopen = null
      this.socket.onmessage = null
      this.socket.onerror = null
      this.socket.onclose = null
      try { this.socket.close() } catch (_) {}
    }
    this.socket = null
  }

  _open () {
    if (this.closed) return
    const generation = ++this.generation
    this._setStatus(this.everLive ? 'reconnecting' : 'connecting')
    try {
      this.socket = new WebSocket(this.config.buildUrl(this.context))
      this.socket.binaryType = 'arraybuffer'
    } catch (_) {
      this._scheduleReconnect()
      return
    }

    this.connectTimer = setTimeout(() => {
      if (generation !== this.generation || this.closed || this.everLive) return
      this._failSocket()
    }, 8000)

    this.socket.onopen = () => {
      if (generation !== this.generation) return
      this._clearTimer('connectTimer')
      this.openedAt = Date.now()
      try {
        if (this.config.subscribe) this.config.subscribe(this.socket, this.context)
      } catch (_) {
        this._failSocket()
        return
      }
      this._startPing()
      this._startStaleWatch(generation)
    }
    this.socket.onmessage = event => this._handleMessage(event, generation)
    this.socket.onerror = () => {}
    this.socket.onclose = () => {
      if (generation !== this.generation || this.closed) return
      this.socket = null
      this._clearTimer('pingTimer')
      this._clearTimer('staleTimer')
      this._scheduleReconnect()
    }
  }

  async _handleMessage (event, generation) {
    let raw = ''
    try { raw = await this._decode(event.data) } catch (_) { return }
    if (generation !== this.generation || this.closed || !raw || raw === 'pong') return
    let data
    try { data = parseOrderBookJson(raw) } catch (_) { return }
    if (data.ping !== undefined) {
      try { this.socket.send(JSON.stringify({ pong: data.ping })) } catch (_) {}
      return
    }
    if (data.op === 'ping') {
      try { this.socket.send(JSON.stringify({ op: 'pong', ts: data.ts })) } catch (_) {}
      return
    }
    if (subscriptionRejected(data)) {
      this._failSocket()
      return
    }
    try {
      if (!this.config.apply(this.book, data)) return
      const snapshot = this.book.snapshot(this.context)
      if (!snapshot) return
      this.lastDataAt = Date.now()
      this.reconnectAttempts = 0
      if (!this.everLive) {
        this.everLive = true
        this._setStatus('live')
      }
      this._queueSnapshot(snapshot)
    } catch (_) {
      this._failSocket()
    }
  }

  _queueSnapshot (snapshot) {
    this.pendingSnapshot = snapshot
    if (this.emitTimer) return
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null
      const next = this.pendingSnapshot
      this.pendingSnapshot = null
      if (next && !this.closed && this.callbacks.onSnapshot) this.callbacks.onSnapshot(next)
    }, 100)
  }

  async _decode (raw) {
    if (typeof raw === 'string') return raw
    let bytes
    if (raw instanceof ArrayBuffer) bytes = new Uint8Array(raw)
    else if (typeof Blob !== 'undefined' && raw instanceof Blob) bytes = new Uint8Array(await raw.arrayBuffer())
    else return ''
    const gzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
    if (gzip && typeof DecompressionStream !== 'undefined') {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
      return new Response(stream).text()
    }
    return new TextDecoder().decode(bytes)
  }

  _startPing () {
    this._clearTimer('pingTimer')
    if (!this.config.ping || !this.config.pingInterval) return
    this.pingTimer = setInterval(() => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
      try { this.config.ping(this.socket, this.context) } catch (_) {}
    }, this.config.pingInterval)
  }

  _startStaleWatch (generation) {
    this._clearTimer('staleTimer')
    this.staleTimer = setInterval(() => {
      if (generation !== this.generation || this.closed) return
      const age = Date.now() - this.lastDataAt
      if ((!this.lastDataAt && Date.now() - this.openedAt > 12000) || (this.lastDataAt && age > 15000)) this._failSocket()
    }, 3000)
  }

  _failSocket () {
    if (this.closed) return
    const socket = this.socket
    this.socket = null
    this._clearTimer('connectTimer')
    this._clearTimer('pingTimer')
    this._clearTimer('staleTimer')
    if (socket) {
      socket.onclose = null
      socket.onmessage = null
      socket.onerror = null
      try { socket.close() } catch (_) {}
    }
    this._scheduleReconnect()
  }

  _scheduleReconnect () {
    if (this.closed || this.reconnectTimer) return
    this.reconnectAttempts += 1
    this.book = new LocalOrderBook()
    this.lastDataAt = 0
    this._setStatus('reconnecting')
    if (this.callbacks.onFallback) this.callbacks.onFallback()
    const delay = Math.min(30000, 800 * Math.pow(1.8, Math.min(this.reconnectAttempts - 1, 7))) + Math.floor(Math.random() * 300)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this._open()
    }, delay)
  }

  _setStatus (status) {
    if (this.callbacks.onStatus) this.callbacks.onStatus(status)
  }

  _clearTimer (name) {
    if (!this[name]) return
    if (name === 'pingTimer' || name === 'staleTimer') clearInterval(this[name])
    else clearTimeout(this[name])
    this[name] = null
  }

  _clearTimers () {
    ;['reconnectTimer', 'connectTimer', 'staleTimer', 'pingTimer', 'emitTimer'].forEach(name => this._clearTimer(name))
    this.pendingSnapshot = null
  }
}
