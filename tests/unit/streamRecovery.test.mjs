import assert from 'node:assert/strict'
import test from 'node:test'
import ExchangeKlineWs from '../../src/utils/exchangeWs.js'
import ExchangeOrderBookWs from '../../src/utils/exchangeOrderBookWs.js'

const bar = (timestamp = 60000) => JSON.stringify({ e: 'kline', k: { t: timestamp, o: '100', h: '102', l: '99', c: '101', v: '5', x: false } })
function sockets (t) {
  const instances = []
  class Socket {
    static OPEN = 1
    constructor (url) { this.url = url; this.readyState = 0; this.messages = []; instances.push(this) }
    send (message) { this.messages.push(message) }
    close () { this.readyState = 3 }
    open () { this.readyState = 1; this.onopen() }
  }
  const original = globalThis.WebSocket
  globalThis.WebSocket = Socket
  t.after(() => { globalThis.WebSocket = original })
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 100000 })
  return instances
}

test('transport failure keeps REST available and recovers only after valid same-venue candles', async t => {
  const ws = sockets(t)
  const client = new ExchangeKlineWs()
  t.after(() => client.disconnect())
  let fallback = 0; let recovered = 0; const ticks = []
  assert.equal(client.connect('BTC/USDT', '1m', {
    onTick: value => ticks.push(value), onReconnecting: () => fallback++, onReconnected: () => recovered++
  }, 'binance', { marketType: 'swap' }), true)
  t.mock.timers.tick(8000)
  assert.equal(fallback, 1)
  assert.equal(client._closed, false)
  t.mock.timers.tick(5000)
  assert.equal(ws.length, 2)
  assert.equal(ws[0].url, ws[1].url)
  ws[1].open()
  assert.equal(recovered, 0)
  await client._handleMessage({ data: bar() })
  assert.equal(recovered, 1)
  assert.equal(ticks.length, 1)
  assert.equal(client._reconnectAttempts, 0)
})

test('silent reopened sockets continue bounded backoff; disconnect cancels pending recovery', t => {
  const ws = sockets(t)
  const client = new ExchangeKlineWs()
  t.after(() => client.disconnect())
  client.connect('BTC/USDT', '1m', { onTick () {} }, 'binance')
  ws[0].open()
  t.mock.timers.tick(12000)
  t.mock.timers.tick(5000)
  ws[1].open()
  t.mock.timers.tick(12000)
  assert.equal(client._reconnectAttempts, 2)
  client.disconnect()
  t.mock.timers.tick(120000)
  assert.equal(ws.length, 2)
})

test('invalid candles never end fallback and old generations never publish', async t => {
  const ws = sockets(t)
  const client = new ExchangeKlineWs()
  t.after(() => client.disconnect())
  let ticks = 0
  client.connect('BTC/USDT', '1m', { onTick () { ticks++ } }, 'binance')
  ws[0].open()
  const oldGeneration = client._openGen
  await client._handleMessage({ data: 'null' })
  await client._handleMessage({ data: '[]' })
  await client._handleMessage({ data: bar().replace('"101"', '"NaN"') })
  assert.equal(client._gotData, false)
  client._tryFallback()
  await client._handleMessage({ data: bar() }, oldGeneration)
  assert.equal(ticks, 0)
})

test('missing application pong triggers recovery without falsely reporting a live stream', t => {
  const ws = sockets(t)
  const client = new ExchangeKlineWs()
  t.after(() => client.disconnect())
  let fallback = 0
  client.connect('BTC/USDT', '1m', { onTick () {}, onReconnecting () { fallback++ } }, 'bitget')
  ws[0].open()
  client._gotData = true
  t.mock.timers.tick(25000)
  assert.equal(ws[0].messages.at(-1), 'ping')
  t.mock.timers.tick(50000)
  assert.equal(fallback, 1)
})

test('order book recovery clears stale queued snapshots and reports live again', async t => {
  const ws = sockets(t)
  const client = new ExchangeOrderBookWs()
  t.after(() => client.disconnect())
  const statuses = []; const snapshots = []
  client.connect('BTC/USDT', { onStatus: value => statuses.push(value), onSnapshot: value => snapshots.push(value) }, 'binance')
  ws[0].open()
  const frame = { data: JSON.stringify({ lastUpdateId: 1, bids: [['100', '2']], asks: [['101', '3']] }) }
  await client._handleMessage(frame, client.generation)
  assert.equal(statuses.at(-1), 'live')
  client._failSocket()
  t.mock.timers.tick(100)
  assert.equal(snapshots.length, 0)
  t.mock.timers.tick(1200)
  ws[1].open()
  await client._handleMessage(frame, client.generation)
  assert.equal(statuses.at(-1), 'live')
  t.mock.timers.tick(100)
  assert.equal(snapshots.length, 1)
})
