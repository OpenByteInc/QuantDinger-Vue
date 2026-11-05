import assert from 'node:assert/strict'
import test from 'node:test'
import { gzipSync } from 'node:zlib'

import ExchangeKlineWs, {
  EXCHANGE_WS,
  getExchangeInterval,
  parseGateSpotBar,
  resolveExchangeId
} from '../../src/utils/exchangeWs.js'

function captureSubscription (exchangeId, symbol, interval, context) {
  const messages = []
  EXCHANGE_WS[exchangeId].subscribe({
    send (value) { messages.push(JSON.parse(value)) }
  }, symbol, interval, context)
  return messages[0]
}

test('Gate spot candles use base volume instead of quote turnover', () => {
  const bar = parseGateSpotBar({
    channel: 'spot.candlesticks',
    event: 'update',
    result: {
      t: '1784505600',
      o: '64726.5',
      h: '65662.2',
      l: '63733.8',
      c: '65514.6',
      v: '495134000',
      a: '7557.6131',
      n: '1d_BTC_USDT',
      w: false
    }
  })

  assert.equal(bar.volume, 7557.6131)
  assert.notEqual(bar.volume, 495134000)
  assert.equal(bar.isClosed, false)
})

test('Gate spot candles read the explicit window-close flag', () => {
  const bar = parseGateSpotBar({
    channel: 'spot.candlesticks',
    event: 'update',
    result: {
      t: '1784505600',
      o: '1',
      h: '2',
      l: '1',
      c: '2',
      v: '20',
      a: '10',
      n: '1m_BTC_USDT',
      w: true
    }
  })

  assert.equal(bar.isClosed, true)
})

test('Gate spot candles fail safe when base volume is absent', () => {
  const bar = parseGateSpotBar({
    channel: 'spot.candlesticks',
    event: 'update',
    result: {
      t: '1784505600',
      o: '1',
      h: '2',
      l: '1',
      c: '2',
      v: '500000000',
      n: '1m_BTC_USDT'
    }
  })

  assert.equal(bar.volume, 0)
  assert.equal(bar.isClosed, false)
})

test('Gate futures candles accept the exchange array notification shape', () => {
  const bar = parseGateSpotBar({
    channel: 'futures.candlesticks',
    event: 'update',
    result: [{
      t: 1784505600,
      o: '100',
      h: '110',
      l: '90',
      c: '105',
      v: '42',
      n: 'BTC_USDT',
      w: true
    }]
  }, { marketType: 'swap', timeframe: '1m' })

  assert.equal(bar.volume, 42)
  assert.equal(bar.isClosed, true)
})

test('all six exchanges expose venue-scoped spot and swap endpoints', () => {
  const spot = { marketType: 'spot', instrumentId: '' }
  const swap = { marketType: 'swap', instrumentId: '' }

  assert.equal(EXCHANGE_WS.binance.buildUrl('BTC/USDT', '1m', spot), 'wss://data-stream.binance.vision/ws/btcusdt@kline_1m')
  assert.equal(EXCHANGE_WS.binance.buildUrl('BTC/USDT', '1m', swap), 'wss://fstream.binance.com/ws/btcusdt@kline_1m')
  assert.equal(EXCHANGE_WS.okx.buildUrl('BTC/USDT', '1m', spot), 'wss://ws.okx.com/ws/v5/business')
  assert.equal(EXCHANGE_WS.bybit.buildUrl('BTC/USDT', '1', spot), 'wss://stream.bybit.com/v5/public/spot')
  assert.equal(EXCHANGE_WS.bybit.buildUrl('BTC/USDT', '1', swap), 'wss://stream.bybit.com/v5/public/linear')
  assert.equal(EXCHANGE_WS.gate.buildUrl('BTC/USDT', '1m', spot), 'wss://api.gateio.ws/ws/v4/')
  assert.equal(EXCHANGE_WS.gate.buildUrl('BTC/USDT', '1m', swap), 'wss://fx-ws.gateio.ws/v4/ws/usdt')
  assert.equal(EXCHANGE_WS.htx.buildUrl('BTC/USDT', '1min', spot), 'wss://api.huobi.pro/ws')
  assert.equal(EXCHANGE_WS.htx.buildUrl('BTC/USDT', '1min', swap), 'wss://api.hbdm.com/linear-swap-ws')
})

test('subscriptions retain exchange, product type, and native instrument identity', () => {
  const okx = captureSubscription('okx', 'BTC/USDT', '1m', {
    marketType: 'swap',
    instrumentId: 'BTC-USDT-SWAP'
  })
  assert.deepEqual(okx.args, [{ channel: 'candle1m', instId: 'BTC-USDT-SWAP' }])

  const okxCompact = captureSubscription('okx', 'BTC/USDT', '1m', {
    marketType: 'swap',
    instrumentId: 'BTCUSDT'
  })
  assert.deepEqual(okxCompact.args, [{ channel: 'candle1m', instId: 'BTC-USDT-SWAP' }])

  const bitget = captureSubscription('bitget', 'BTC/USDT', '1m', {
    marketType: 'swap',
    instrumentId: 'BTCUSDT'
  })
  assert.equal(bitget.args[0].instType, 'USDT-FUTURES')
  assert.equal(bitget.args[0].instId, 'BTCUSDT')

  const gate = captureSubscription('gate', 'BTC/USDT', '1m', {
    marketType: 'swap',
    instrumentId: 'BTC_USDT'
  })
  assert.equal(gate.channel, 'futures.candlesticks')
  assert.deepEqual(gate.payload, ['1m', 'BTC_USDT'])

  const gateCompact = captureSubscription('gate', 'BTC/USDT', '1m', {
    marketType: 'spot',
    instrumentId: 'BTCUSDT'
  })
  assert.deepEqual(gateCompact.payload, ['1m', 'BTC_USDT'])

  const htx = captureSubscription('htx', 'BTC/USDT', '1min', {
    marketType: 'swap',
    instrumentId: 'BTC-USDT'
  })
  assert.equal(htx.sub, 'market.BTC-USDT.kline.1min')

  const htxCompact = captureSubscription('htx', 'BTC/USDT', '1min', {
    marketType: 'swap',
    instrumentId: 'BTCUSDT'
  })
  assert.equal(htxCompact.sub, 'market.BTC-USDT.kline.1min')

  const htxSpot = captureSubscription('htx', 'BTC/USDT', '1min', {
    marketType: 'spot',
    instrumentId: 'BTC_USDT'
  })
  assert.equal(htxSpot.sub, 'market.btcusdt.kline.1min')
})

test('OKX uses the explicit confirm field instead of treating every update as closed', () => {
  const openBar = EXCHANGE_WS.okx.parseBar({
    arg: { channel: 'candle1m' },
    data: [['1784505600000', '1', '2', '1', '2', '10', '20', '20', '0']]
  })
  const closedBar = EXCHANGE_WS.okx.parseBar({
    arg: { channel: 'candle1m' },
    data: [['1784505600000', '1', '2', '1', '2', '10', '20', '20', '1']]
  })

  assert.equal(openBar.isClosed, false)
  assert.equal(closedBar.isClosed, true)
})

test('Bitget parses live candles without falsely closing the current interval', () => {
  const now = Date.now()
  const bar = EXCHANGE_WS.bitget.parseBar({
    arg: { channel: 'candle1m' },
    data: [[String(now), '1', '2', '0.5', '1.5', '12', '18', '18']]
  }, { timeframe: '1m' })

  assert.equal(bar.timestamp, now)
  assert.equal(bar.volume, 12)
  assert.equal(bar.isClosed, false)
})

test('HTX candles and aliases are supported', () => {
  assert.equal(resolveExchangeId('huobi'), 'htx')
  const bar = EXCHANGE_WS.htx.parseBar({
    ch: 'market.btcusdt.kline.1min',
    tick: { id: 1784505600, open: 1, high: 2, low: 0.5, close: 1.5, amount: 12 }
  }, { timeframe: '1m' })

  assert.equal(bar.timestamp, 1784505600000)
  assert.equal(bar.volume, 12)
})

test('HTX gzip WebSocket payloads are decoded before parsing', async () => {
  const payload = JSON.stringify({ ping: 1784505600000 })
  const compressed = gzipSync(payload)
  const buffer = compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength)
  const client = new ExchangeKlineWs()

  assert.equal(await client._decodeMessage(buffer), payload)
})

test('unsupported native intervals fail closed so the chart keeps same-venue REST polling', () => {
  assert.equal(getExchangeInterval('gate', '3m'), null)
  assert.equal(getExchangeInterval('htx', '3m'), null)
  assert.equal(getExchangeInterval('bitget', '3m'), null)
  assert.equal(getExchangeInterval('binance', '3m'), '3m')

  let errors = 0
  const client = new ExchangeKlineWs()
  const connected = client.connect('BTC/USDT', '3m', {
    onTick () {},
    onNewBar () {},
    onError () { errors += 1 }
  }, 'gate', { marketType: 'swap' })

  assert.equal(connected, false)
  assert.equal(errors, 1)
  assert.equal(client.currentExchange(), 'gate')
})

test('rejected subscriptions fall back immediately for every exchange response shape', async () => {
  const cases = [
    {
      exchange: 'gate',
      response: {
        channel: 'spot.candlesticks',
        event: 'subscribe',
        error: { code: 2, message: 'unknown currency pair' },
        result: { status: 'fail' }
      }
    },
    { exchange: 'okx', response: { event: 'error', code: '60012', msg: 'Invalid request' } },
    { exchange: 'bitget', response: { event: 'error', code: '30001', msg: 'Invalid channel' } },
    { exchange: 'bybit', response: { op: 'subscribe', success: false, ret_msg: 'Invalid topic' } },
    { exchange: 'htx', response: { status: 'error', err_code: 2002, err_msg: 'invalid topic' } },
    { exchange: 'htx', response: { status: 'error', 'err-code': 'bad-request', 'err-msg': 'invalid topic' } }
  ]

  for (const { exchange, response } of cases) {
    let errors = 0
    let closed = 0
    const client = new ExchangeKlineWs()
    client._closed = false
    client._exchangeId = exchange
    client._exchangeConf = EXCHANGE_WS[exchange]
    client._onError = () => { errors += 1 }
    client._ws = {
      onclose: () => {},
      close () { closed += 1 }
    }

    await client._handleMessage({ data: JSON.stringify(response) })

    assert.equal(closed, 1, exchange)
    assert.equal(errors, 1, exchange)
    assert.equal(client._closed, true, exchange)
  }
})

test('successful subscription acknowledgements do not produce fallback', async () => {
  const cases = [
    { exchange: 'gate', response: { event: 'subscribe', result: { status: 'success' } } },
    { exchange: 'okx', response: { event: 'subscribe', code: '0', arg: { channel: 'candle1m' } } },
    { exchange: 'bitget', response: { event: 'subscribe', code: '0', arg: { channel: 'candle1m' } } },
    { exchange: 'bybit', response: { op: 'subscribe', success: true, ret_msg: 'subscribe' } },
    { exchange: 'htx', response: { status: 'ok', subbed: 'market.btcusdt.kline.1min' } }
  ]

  for (const { exchange, response } of cases) {
    let errors = 0
    const client = new ExchangeKlineWs()
    client._closed = false
    client._exchangeId = exchange
    client._exchangeConf = EXCHANGE_WS[exchange]
    client._onError = () => { errors += 1 }
    client._ws = { close () { throw new Error('must not close') } }

    await client._handleMessage({ data: JSON.stringify(response) })

    assert.equal(errors, 0, exchange)
    assert.equal(client._closed, false, exchange)
  }
})
