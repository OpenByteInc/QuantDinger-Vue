import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LocalOrderBook,
  ORDER_BOOK_WS,
  applyBinanceOrderBook,
  applyBitgetOrderBook,
  applyBybitOrderBook,
  applyGateOrderBook,
  applyHtxOrderBook,
  applyOkxOrderBook,
  parseOrderBookJson,
  resolveOrderBookExchangeId
} from '../../src/utils/exchangeOrderBookWs.js'

const context = { exchangeId: 'test', symbol: 'BTC/USDT', marketType: 'spot' }

function snapshot (book) {
  return book.snapshot(context, 50)
}

test('exchange aliases resolve to the six supported public depth venues', () => {
  assert.equal(resolveOrderBookExchangeId('Gate.io'), 'gate')
  assert.equal(resolveOrderBookExchangeId('Huobi'), 'htx')
  assert.equal(resolveOrderBookExchangeId('OKEx'), 'okx')
  assert.equal(resolveOrderBookExchangeId('unsupported'), '')
})

test('Binance partial depth replaces the full top-of-book snapshot', () => {
  const book = new LocalOrderBook()
  assert.equal(applyBinanceOrderBook(book, {
    lastUpdateId: 12,
    bids: [['100', '2'], ['99', '3']],
    asks: [['101', '4'], ['102', '5']]
  }), true)
  assert.equal(snapshot(book).best_bid, 100)
  assert.equal(snapshot(book).best_ask, 101)
  assert.equal(snapshot(book).sequence, 12)
})

test('OKX applies snapshots and checked incrementals including sequence reset', () => {
  const book = new LocalOrderBook()
  applyOkxOrderBook(book, { arg: { channel: 'books' }, action: 'snapshot', data: [{ bids: [['100', '2']], asks: [['101', '3']], prevSeqId: -1, seqId: 10, ts: '1' }] })
  applyOkxOrderBook(book, { arg: { channel: 'books' }, action: 'update', data: [{ bids: [['100', '0'], ['99', '4']], asks: [], prevSeqId: 10, seqId: 15, ts: '2' }] })
  assert.equal(snapshot(book).best_bid, 99)
  applyOkxOrderBook(book, { arg: { channel: 'books' }, action: 'update', data: [{ bids: [['98', '1']], asks: [], prevSeqId: 15, seqId: 3, ts: '3' }] })
  assert.equal(snapshot(book).sequence, 3)
})

test('OKX rejects a sequence gap before mutating the local book', () => {
  const book = new LocalOrderBook()
  applyOkxOrderBook(book, { arg: { channel: 'books' }, action: 'snapshot', data: [{ bids: [['100', '2']], asks: [['101', '3']], seqId: 10 }] })
  assert.throws(() => applyOkxOrderBook(book, { arg: { channel: 'books' }, action: 'update', data: [{ bids: [['99', '4']], asks: [], prevSeqId: 9, seqId: 11 }] }), /SEQUENCE_GAP/)
  assert.equal(snapshot(book).best_bid, 100)
})

test('Bybit resets on snapshots and applies absolute delta quantities', () => {
  const book = new LocalOrderBook()
  applyBybitOrderBook(book, { topic: 'orderbook.50.BTCUSDT', type: 'snapshot', ts: 1, data: { u: 20, b: [['100', '2']], a: [['101', '3']] } })
  applyBybitOrderBook(book, { topic: 'orderbook.50.BTCUSDT', type: 'delta', ts: 2, data: { u: 21, b: [['100', '0'], ['99', '4']], a: [] } })
  assert.equal(snapshot(book).best_bid, 99)
  assert.equal(snapshot(book).sequence, 21)
})

test('Bybit rejects a missing incremental update', () => {
  const book = new LocalOrderBook()
  applyBybitOrderBook(book, { topic: 'orderbook.50.BTCUSDT', type: 'snapshot', data: { u: 20, b: [['100', '2']], a: [['101', '3']] } })
  assert.throws(() => applyBybitOrderBook(book, { topic: 'orderbook.50.BTCUSDT', type: 'delta', data: { u: 22, b: [['99', '4']], a: [] } }), /SEQUENCE_GAP/)
  assert.equal(snapshot(book).best_bid, 100)
})

test('Bitget v3 books50 validates pseq before applying updates', () => {
  const book = new LocalOrderBook()
  applyBitgetOrderBook(book, { arg: { topic: 'books50' }, action: 'snapshot', data: [{ b: [['100', '2']], a: [['101', '3']], pseq: 0, seq: 40, ts: '1' }] })
  applyBitgetOrderBook(book, { arg: { topic: 'books50' }, action: 'update', data: [{ b: [['100', '5']], a: [], pseq: 40, seq: 41, ts: '2' }] })
  assert.equal(snapshot(book).bids[0].size, 5)
  assert.throws(() => applyBitgetOrderBook(book, { arg: { topic: 'books50' }, action: 'update', data: [{ b: [], a: [], pseq: 39, seq: 42 }] }), /SEQUENCE_GAP/)
})

test('64-bit order-book sequence identifiers stay lossless', () => {
  const message = parseOrderBookJson('{"data":[{"pseq":1304314508780744705,"seq":1304314508780744706,"b":[],"a":[]}]}')
  assert.equal(message.data[0].pseq, '1304314508780744705')
  assert.equal(message.data[0].seq, '1304314508780744706')

  const book = new LocalOrderBook()
  applyBitgetOrderBook(book, { arg: { topic: 'books50' }, action: 'snapshot', data: [{ b: [['100', '2']], a: [['101', '3']], pseq: '0', seq: '1304314508780744705' }] })
  applyBitgetOrderBook(book, { arg: { topic: 'books50' }, action: 'update', data: [{ b: [['100', '5']], a: [], pseq: '1304314508780744705', seq: '1304314508780744706' }] })
  assert.equal(snapshot(book).sequence, '1304314508780744706')
})

test('Gate OBU requires a full frame and validates the update range', () => {
  const book = new LocalOrderBook()
  applyGateOrderBook(book, { channel: 'spot.obu', event: 'update', result: { full: true, u: 100, t: 1, b: [['100', '2']], a: [['101', '3']] } })
  applyGateOrderBook(book, { channel: 'spot.obu', event: 'update', result: { U: 101, u: 103, t: 2, b: [['100', '0'], ['99', '4']], a: [] } })
  assert.equal(snapshot(book).best_bid, 99)
  assert.throws(() => applyGateOrderBook(book, { channel: 'spot.obu', event: 'update', result: { U: 105, u: 106, b: [], a: [] } }), /SEQUENCE_GAP/)
})

test('HTX snapshot depth replaces both sides', () => {
  const book = new LocalOrderBook()
  applyHtxOrderBook(book, { ch: 'market.btcusdt.depth.step0', ts: 1, tick: { version: 7, bids: [[100, 2]], asks: [[101, 3]] } })
  applyHtxOrderBook(book, { ch: 'market.btcusdt.depth.step0', ts: 2, tick: { version: 8, bids: [[99, 4]], asks: [[102, 5]] } })
  assert.equal(snapshot(book).best_bid, 99)
  assert.equal(snapshot(book).best_ask, 102)
  applyHtxOrderBook(book, { ch: 'market.btcusdt.mbp.refresh.20', ts: 3, tick: { seqNum: 9, bids: [[98, 6]], asks: [[103, 7]] } })
  assert.equal(snapshot(book).best_bid, 98)
})

test('subscriptions match current public order-book channel schemas', () => {
  const messages = {}
  for (const exchange of ['okx', 'bitget', 'bybit', 'gate', 'htx']) {
    const sent = []
    ORDER_BOOK_WS[exchange].subscribe({ send: value => sent.push(JSON.parse(value)) }, { exchangeId: exchange, symbol: 'BTC/USDT', marketType: 'swap' })
    messages[exchange] = sent[0]
  }
  assert.deepEqual(messages.okx.args[0], { channel: 'books', instId: 'BTC-USDT-SWAP' })
  assert.deepEqual(messages.bitget.args[0], { instType: 'usdt-futures', topic: 'books50', symbol: 'BTCUSDT' })
  assert.equal(messages.bybit.args[0], 'orderbook.50.BTCUSDT')
  assert.deepEqual(messages.gate.payload, ['ob.BTC_USDT.50'])
  assert.equal(messages.htx.sub, 'market.BTC-USDT.depth.size_20.high_freq')
  assert.equal(messages.htx.data_type, 'snapshot')
})

test('all six transports build secure production WebSocket URLs', () => {
  for (const exchange of Object.keys(ORDER_BOOK_WS)) {
    const url = ORDER_BOOK_WS[exchange].buildUrl({ exchangeId: exchange, symbol: 'BTC/USDT', marketType: 'spot' })
    assert.match(url, /^wss:\/\//)
  }
})

test('WebSocket snapshots carry the correct quantity unit for every venue and market', () => {
  const expected = {
    binance: 'base',
    okx: 'contracts',
    bitget: 'base',
    bybit: 'base',
    gate: 'contracts',
    htx: 'contracts'
  }
  Object.entries(expected).forEach(([exchangeId, quantityUnit]) => {
    const book = new LocalOrderBook()
    book.replace([[100, 2]], [[101, 3]], 1, 10)
    assert.equal(book.snapshot({ exchangeId, symbol: 'SOL/USDT', marketType: 'swap' }).quantity_unit, quantityUnit)
    assert.equal(book.snapshot({ exchangeId, symbol: 'SOL/USDT', marketType: 'spot' }).quantity_unit, 'base')
  })
})
