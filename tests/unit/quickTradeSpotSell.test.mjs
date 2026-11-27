import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { stockQuantityPrecision } from '../../src/utils/forthright.js'
import { quantityFromAmount } from '../../src/utils/orderQuantity.mjs'
import { stockSymbolsMatch } from '../../src/utils/stockSymbol.mjs'

test('stock sell availability excludes shares frozen by the broker', () => {
  const panel = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = {isSpotCashOrder:true, currentPositions:[{side:'long',quantity:100,size:100,salable_qty:0}]}
  assert.equal(panel.computed.spotSellAvailable.call(state),0)
  state.currentPositions[0].salable_qty=40
  assert.equal(panel.computed.spotSellAvailable.call(state),40)
})

test('stock history keeps execution shares distinct from cash turnover', async () => {
  const panel = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = {isStockMarket:true,selectedCredentialId:18,currentSymbol:'00700.HK',normalizeBrokerSymbol:v=>v,apiPayload:v=>v,
    selectedStockBrokerClient:{
      orders:async()=>[{id:'O1',quantity:100,limit_price:345}],
      tradeHistory:async()=>[{id:'fill1',order_id:'O1',filled_qty:10,filled_amount:3450,filled_avg_price:345,amount:3450,currency:'HKD',fee_status:'pending'}]
    }}
  await panel.methods.loadHistory.call(state)
  assert.equal(state.recentOpenOrders[0].requested_base_qty,100)
  assert.equal(state.recentTrades[0].filled_amount,10)
  assert.equal(state.recentTrades[0].amount,3450)
  assert.equal(state.recentTrades[0].fee_status,'pending')
})

test('HK chart symbols retain broker fills, open orders and positions across code formats', async () => {
  const panel = options('components/QuickTradePanel/QuickTradePanel.vue')
  for (const symbol of ['00700', '700', '00700.HK', 'HKStock:00700']) {
    const state = {
      isStockMarket: true, normalizedMarket: 'HKStock', effectiveMarketType: 'spot',
      selectedCredentialId: 18, currentSymbol: symbol,
      normalizeBrokerSymbol: panel.methods.normalizeBrokerSymbol,
      apiPayload: value => value, normalizePosition: value => value,
      isMarketOrderPositionConfirmed: () => false,
      selectedStockBrokerClient: {
        orders: async ({ credential_id }) => {
          assert.equal(credential_id, 18)
          return [
            { id: 'pending', symbol: '00700.HK', quantity: 100, status: 'submitted' },
            { id: 'other', symbol: '00388.HK', quantity: 100, status: 'submitted' }
          ]
        },
        tradeHistory: async ({ credential_id }) => {
          assert.equal(credential_id, 18)
          return [
            { id: 'fill1', symbol: '00700.HK', filled_qty: 100, filled_avg_price: 353, currency: 'HKD' },
            { id: 'fill2', symbol: '00700.HK', filled_qty: 100, filled_avg_price: 353.2, currency: 'HKD' },
            { id: 'other-fill', symbol: '00388.HK', filled_qty: 100, filled_avg_price: 300 }
          ]
        },
        positions: async () => [{ symbol: '00700.HK', qty: 200 }, { symbol: '00388.HK', qty: 100 }]
      }
    }
    await panel.methods.loadHistory.call(state)
    const trades = panel.computed.scopedTradeRows.call(state)
    assert.deepEqual(Array.from(trades, row => row.id), ['fill1', 'fill2'], symbol)
    assert.equal(trades[0].filled_amount, 100)
    assert.equal(trades[0].display_amount, 35300)
    assert.deepEqual(Array.from(panel.computed.openOrderRows.call(state), row => row.id), ['pending'], symbol)
    await panel.methods.loadPosition.call(state)
    assert.deepEqual(Array.from(state.currentPositions, row => row.symbol), ['00700.HK'], symbol)
    assert.equal(state.currentPositions[0].qty, 200)
  }
})

test('stock matching keeps different instruments, markets and US share classes separate', () => {
  assert.equal(stockSymbolsMatch('700', '00700.HK', 'HKStock'), true)
  assert.equal(stockSymbolsMatch('00700.HK', '00388', 'HKStock'), false)
  assert.equal(stockSymbolsMatch('USStock:00700', '00700', 'HKStock'), false)
  assert.equal(stockSymbolsMatch('700', '00700.HK', 'USStock'), false)
  assert.equal(stockSymbolsMatch('usstock:brk.b', 'BRK.B', 'USStock'), true)
  assert.equal(stockSymbolsMatch('BRK.B', 'BRK-B', 'USStock'), false)
  assert.equal(stockSymbolsMatch('', '', 'HKStock'), false)
  assert.equal(stockSymbolsMatch('BRK/B', 'BRK.B', 'USStock', 'alpaca'), true)
  assert.equal(stockSymbolsMatch('BRK/B', 'BRK.B', 'USStock', 'tiger'), false)
  const panel = options('components/QuickTradePanel/QuickTradePanel.vue')
  const rows = panel.computed.scopedTradeRows.call({
    isStockMarket: false, currentSymbol: 'BTC/USDT', effectiveMarketType: 'spot',
    recentTrades: [
      { id: 'spot', symbol: 'BTC/USDT', market_type: 'spot' },
      { id: 'swap', symbol: 'BTC/USDT', market_type: 'swap' },
      { id: 'other', symbol: 'ETH/USDT', market_type: 'spot' }
    ]
  })
  assert.deepEqual(Array.from(rows, row => row.id), ['spot'])
})

test('all stock brokers keep fills, pending sell orders and signed position costs', async () => {
  const panel = options('components/QuickTradePanel/QuickTradePanel.vue')
  for (const [brokerId, market, symbol, native] of [
    ['alpaca', 'USStock', 'BRK/B', 'BRK.B'],
    ['ibkr', 'USStock', 'AAPL', 'AAPL'],
    ['tiger', 'USStock', 'AAPL', 'AAPL'],
    ['webull', 'USStock', 'AAPL', 'AAPL'],
    ['forthright', 'USStock', 'AAPL', 'AAPL'],
    ['tiger', 'HKStock', '700.HK', '00700'],
    ['forthright', 'HKStock', '700', '00700.HK']
  ]) {
    const order = brokerId === 'ibkr'
      ? { orderId: 123, symbol: native, action: 'SELL', orderType: 'LMT', limitPrice: 200, quantity: 10, filled: 2, avgFillPrice: 199, status: 'PreSubmitted' }
      : { id: 123, symbol: native, side: 'sell', order_type: 'limit', limit_price: 200, quantity: 10, filled_qty: 2, filled_avg_price: 199, status: 'partially_filled' }
    const state = {
      isStockMarket: true, normalizedMarket: market, effectiveMarketType: 'spot', selectedStockBrokerId: brokerId,
      selectedCredentialId: 18, currentSymbol: symbol, currentPrice: 200,
      normalizeBrokerSymbol: panel.methods.normalizeBrokerSymbol, apiPayload: value => value,
      isMarketOrderPositionConfirmed: () => false,
      calculatePositionPnl: () => null,
      selectedStockBrokerClient: {
        orders: async () => [order],
        tradeHistory: async () => [{ id: 'execution-1', symbol: native, side: 'sell', filled_qty: 2, filled_avg_price: 199 }],
        positions: async () => [{ symbol: native, quantity: -8, avgCost: 198 }]
      }
    }
    for (const name of ['toFiniteNumber', 'pickNumber', 'pickOptionalNumber', 'inferPositionSide', 'normalizePosition']) {
      state[name] = panel.methods[name].bind(state)
    }
    await panel.methods.loadHistory.call(state)
    const open = panel.computed.openOrderRows.call(state)
    assert.equal(open.length, 1, brokerId)
    assert.equal(open[0].side, 'sell', brokerId)
    assert.equal(open[0].price, 200, brokerId)
    assert.equal(open[0].order_type, 'limit', brokerId)
    assert.equal(open[0].id, 123, brokerId)
    const fills = panel.computed.scopedTradeRows.call(state)
    assert.equal(fills.length, 1, brokerId)
    assert.equal(fills[0].filled_amount, 2, brokerId)
    assert.equal(fills[0].display_amount, 398, brokerId)
    await panel.methods.loadPosition.call(state)
    assert.equal(state.currentPositions[0].side, 'short', brokerId)
    assert.equal(state.currentPositions[0].size, 8, brokerId)
    assert.equal(state.currentPositions[0].entry_price, 198, brokerId)
  }
})

test('HK position overlay takes its entry timestamp from the matching broker fill', () => {
  const panel = options('components/QuickTradePanel/QuickTradePanel.vue')
  const timestamp = panel.methods.positionEntryTimestamp.call({
    isStockMarket: true, normalizedMarket: 'HKStock', currentSymbol: '00700',
    normalizePositionTimestamp: value => Number(value) || 0,
    recentTrades: [
      { symbol: '00700.HK', side: 'buy', filled_at: 100 },
      { symbol: '00388.HK', side: 'buy', filled_at: 200 }
    ]
  }, { side: 'long' })
  assert.equal(timestamp, 100)
})

test('HK broker responses cannot populate a different account after switching', async () => {
  const panel = options('components/QuickTradePanel/QuickTradePanel.vue')
  let resolve
  const pending = new Promise(done => { resolve = done })
  const state = {
    isStockMarket: true, normalizedMarket: 'HKStock', currentSymbol: '00700',
    effectiveMarketType: 'spot', selectedCredentialId: 18,
    normalizeBrokerSymbol: panel.methods.normalizeBrokerSymbol,
    apiPayload: value => value, normalizePosition: value => value,
    recentTrades: [], recentOpenOrders: [], currentPositions: [],
    selectedStockBrokerClient: { orders: () => pending, tradeHistory: () => pending, positions: () => pending }
  }
  const history = panel.methods.loadHistory.call(state)
  const positions = panel.methods.loadPosition.call(state)
  state.selectedCredentialId = 19
  resolve([{ id: 'old-account', symbol: '00700.HK', qty: 200 }])
  await Promise.all([history, positions])
  assert.equal(state.recentTrades.length, 0)
  assert.equal(state.recentOpenOrders.length, 0)
  assert.equal(state.currentPositions.length, 0)
})

test('stock amount tickets floor quantity, preserve Alpaca notional and reject zero shares', async () => {
  const panel = options('components/QuickTradePanel/QuickTradePanel.vue')
  for (const [brokerId, market, expected] of [['tiger','USStock',33],['webull','USStock',33.333333],['forthright','USStock',33.3333],['alpaca','USStock',undefined]]) {
    const calls=[]
    const state={stockLotSize:10,orderType:'limit',limitPrice:3,pricePrecision:2,spotBuyInputMode:'amount',amount:100,selectedStockBrokerId:brokerId,priceMarketParam:market,selectedCredentialId:18,currentSymbol:'AAPL',normalizeBrokerSymbol:value=>value,selectedStockBrokerClient:{placeOrder:async payload=>{calls.push(payload);return {}}},apiSuccess:()=>true,apiPayload:value=>value,$emit:()=>{},loadBalance:async()=>{},loadHistory:async()=>{},loadPositionWithRetry:async()=>{},$t:key=>key}
    await panel.methods.submitStockOrder.call(state,'buy')
    assert.equal(calls[0].quantity,expected)
    assert.equal(calls[0].notional,brokerId==='alpaca'?100:undefined)
    if(expected)assert.ok(expected*3<=100)
    if(brokerId==='tiger') {
      state.amount=2
      await panel.methods.submitStockOrder.call(state,'buy')
      assert.equal(calls.length,1)
      assert.equal(state.tradeFeedback.text,'quickTrade.errorHints.invalidSize')
    }
  }
})

test('Forthright HK rejects missing rules, odd lots and budgets below one lot before submission', async () => {
  const panel = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = { stockLotSize: 100, orderType: 'limit', limitPrice: 90, pricePrecision: 2, spotBuyInputMode: 'quantity', buyQuantity: 101, selectedStockBrokerId: 'forthright', priceMarketParam: 'HKStock', $t: key => key,
    selectedStockBrokerClient: { placeOrder: () => assert.fail('Invalid lot reached broker') } }
  await panel.methods.submitStockOrder.call(state, 'buy')
  assert.equal(state.tradeFeedback.text, 'brokerAccounts.forthright.wholeBoardLot')
  state.buyQuantity = 11
  await panel.methods.submitStockOrder.call(state, 'buy')
  assert.equal(state.tradeFeedback.text, 'brokerAccounts.forthright.belowBoardLot')
  state.stockLotSize = 0
  await panel.methods.submitStockOrder.call(state, 'buy')
  assert.equal(state.tradeFeedback.text, 'brokerAccounts.forthright.lotUnavailable')
})

test('HK lot inputs convert to shares for Tiger and Forthright without changing US inputs', async () => {
  const panel = options('components/QuickTradePanel/QuickTradePanel.vue')
  for (const brokerId of ['forthright', 'tiger']) {
    for (const lot of [100, 500, 1000]) {
      const calls = []
      const state = { isHKStock: true, stockLotSize: lot, orderType: 'limit', limitPrice: 10, pricePrecision: 2,
        spotBuyInputMode: 'amount', amount: 999999, selectedStockBrokerId: brokerId, priceMarketParam: 'HKStock',
        selectedCredentialId: 18, currentSymbol: '00001', normalizeBrokerSymbol: v => v,
        selectedStockBrokerClient: { placeOrder: async payload => { calls.push(payload); return {} } },
        apiSuccess: () => true, apiPayload: v => v, $emit: () => {}, loadBalance: async () => {}, loadHistory: async () => {}, loadPositionWithRetry: async () => {}, $t: key => key }
      panel.computed.buyInputQuantity.set.call(state, 2)
      assert.equal(state.buyQuantity, lot * 2)
      assert.equal(panel.computed.buyInputQuantity.get.call(state), 2)
      await panel.methods.submitStockOrder.call(state, 'buy')
      assert.equal(calls[0].quantity, lot * 2)
      assert.equal(calls[0].notional, undefined)
    }
  }
  const us = { isHKStock: false }
  panel.computed.buyInputQuantity.set.call(us, 0.1)
  assert.equal(us.buyQuantity, 0.1)
})

test('stock amount submission keeps exact decimal boundaries', async () => {
  const panel = options('components/QuickTradePanel/QuickTradePanel.vue')
  const calls = []
  const state = {orderType:'limit',limitPrice:0.01,pricePrecision:2,spotBuyInputMode:'amount',amount:0.29,selectedStockBrokerId:'tiger',priceMarketParam:'USStock',selectedCredentialId:18,currentSymbol:'AAPL',normalizeBrokerSymbol:value=>value,selectedStockBrokerClient:{placeOrder:async payload=>{calls.push(payload);return {}}},apiSuccess:()=>true,apiPayload:value=>value,$emit:()=>{},loadBalance:async()=>{},loadHistory:async()=>{},loadPositionWithRetry:async()=>{},$t:key=>key}
  await panel.methods.submitStockOrder.call(state, 'buy')
  assert.equal(calls[0].quantity, 29)
  assert.equal(panel.computed.quantityStep.call({quantityPrecision:6}), 0.000001)
})

test('stock percentage shortcuts honor market and broker quantity precision', () => {
  const panel=options('components/QuickTradePanel/QuickTradePanel.vue')
  for (const [market,brokerId,expected] of [['HKStock','forthright',0],['USStock','tiger',1],['USStock','forthright',1.6666],['USStock','webull',1.666666]]) {
    const state={stockLotSize:100,isStockMarket:true,priceMarketParam:market,selectedStockBrokerId:brokerId,spotBuyInputMode:'quantity',spotSellReferencePrice:3,activeBalanceAvailable:10}
    panel.methods.setQuickAmountByPercent.call(state,50,'buy')
    assert.equal(state.buyQuantity,expected)
  }
})

test('broker zero buying power and equity do not fall back to positive cash', async () => {
  const panel=options('components/QuickTradePanel/QuickTradePanel.vue')
  for(const brokerId of ['alpaca','tiger','webull']) {
    const state={selectedCredentialId:12,isStockMarket:true,selectedStockBrokerId:brokerId,selectedStockBrokerClient:{account:async()=>({buying_power:0,equity:0,cash:1000,currency:'USD'})},apiPayload:value=>value,balance:{}}
    await panel.methods.loadBalance.call(state)
    assert.equal(state.balance.available,0)
    assert.equal(state.balance.total,0)
  }
})

test('base-currency funds are not treated as quote-currency budget', () => {
  const panel=options('components/QuickTradePanel/QuickTradePanel.vue')
  const state={isStockMarket:true,balance:{currency:'USD'},orderCurrency:'HKD',isSpotCashOrder:true,selectedCredentialId:12,spotBuyRequestedValue:200,activeBalanceAvailable:100}
  state.accountCurrency=panel.computed.accountCurrency.call(state)
  state.buyingPowerCurrencyMismatch=panel.computed.buyingPowerCurrencyMismatch.call(state)
  assert.equal(state.accountCurrency,'USD')
  assert.equal(state.buyingPowerCurrencyMismatch,true)
  assert.equal(panel.computed.buyFundsInsufficient.call(state),false)
  panel.methods.setQuickAmountByPercent.call(state,100,'buy')
  assert.equal(state.amount,undefined)
})

function options (file, mocks = {}) {
  let script = fs.readFileSync(new URL('../../src/' + file, import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
  const scope = { stockQuantityPrecision, quantityFromAmount, stockSymbolsMatch, ...mocks, console, setTimeout, clearTimeout }
  script = script.replace(/^import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]\s*$/gm, (_, names) => {
    for (const item of names.replace(/[{}]/g, '').split(',')) {
      const name = item.trim().split(/\s+as\s+/).pop()
      if (!(name in scope)) scope[name] = () => ({})
    }
    return ''
  })
  vm.runInNewContext(script.replace('export default', 'result ='), scope)
  return scope.result
}

test('position history ignores a late response after switching instruments', async () => {
  const pending = []
  const component = options('components/QuickTradePanel/PositionActivity.vue', {
    getQuickPositionHistory: () => new Promise(resolve => pending.push(resolve))
  })
  const state = { ...component.data(), credentialId: 12, symbol: 'BTC/USDT', marketType: 'swap', history: true, $t: key => key }
  const first = component.methods.load.call(state)
  state.symbol = 'SOL/USDT'
  const second = component.methods.load.call(state)
  pending[1]({ code: 1, data: { supported: true, positions: [{ id: 'sol' }] } })
  await second
  pending[0]({ code: 1, data: { supported: true, positions: [{ id: 'btc' }] } })
  await first
  assert.equal(state.rows[0].id, 'sol')
  assert.equal(state.loading, false)
})

test('trade history keeps the authoritative source returned by the backend', async () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    getQuickTradeHistory: async () => ({
      code: 1,
      data: { source: 'local_fallback', trades: [{ id: 'local-1' }] }
    })
  })
  const state = {
    isStockMarket: false,
    selectedCredentialId: 7,
    currentSymbol: 'BTC/USDT',
    effectiveMarketType: 'swap',
    recentTrades: [],
    historyRecordSource: '',
    pruneMarketOrderConfirmations: () => {}
  }

  await component.methods.loadHistory.call(state)

  assert.equal(state.historyRecordSource, 'local_fallback')
  assert.deepEqual(JSON.parse(JSON.stringify(state.recentTrades)), [{ id: 'local-1' }])
})

test('history refresh preserves visible rows while pending and reports a failed refresh', async () => {
  let reject
  const component = options('components/QuickTradePanel/PositionActivity.vue', {
    getQuickPositionHistory: () => new Promise((resolve, fail) => { reject = fail })
  })
  const state = { ...component.data(), credentialId: 12, symbol: 'SOL/USDT', marketType: 'swap', history: true, rows: [{ id: 'existing' }], $t: key => key }
  const request = component.methods.load.call(state)
  assert.equal(state.rows[0].id, 'existing')
  assert.equal(state.loading, true)
  reject(new Error('offline'))
  await request
  assert.equal(state.loading, false)
  assert.equal(state.error, 'quickTrade.workflow.historyFailed')
  assert.equal(component.methods.number(null), '—')
})

test('floating ticket sends only enabled protection legs and keeps limit, margin and leverage', async () => {
  const calls = []
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    placeQuickOrder: async payload => { calls.push(payload); return { code: 0 } }
  })
  for (const [tp, sl] of [[false, false], [true, false], [false, true], [true, true]]) {
    const state = {
      canSubmitBuy: true, canSubmitSell: true, floatingConsole: true,
      supportsNativeProtection: true, embeddedDock: true, dockTpslEnabled: false,
      consoleTpEnabled: tp, consoleSlEnabled: sl, tpPrice: 85000, slPrice: 79000,
      isCryptoMarket: true, isStockMarket: false, isSwapMode: true,
      selectedCredentialId: 7, currentSymbol: 'BTC/USDT', orderType: 'limit',
      limitPrice: 81000, amount: 100, leverage: 5, marginMode: 'isolated',
      effectiveMarketType: 'swap', source: 'indicator',
      $t: key => key, $notification: { error: () => {} }
    }
    await component.methods.handleSubmit.call(state, 'buy')
    const payload = calls.at(-1)
    assert.equal(payload.tp_price, tp ? 85000 : 0)
    assert.equal(payload.sl_price, sl ? 79000 : 0)
    assert.equal(payload.price, 81000)
    assert.equal(payload.leverage, 5)
    assert.equal(payload.margin_mode, 'isolated')
    assert.equal(payload.amount, 100)
    assert.equal(state.submitting, false)
  }
  assert.equal(calls.length, 4)
})

test('quick trade sends immutable product identity only for specialized equity products', async () => {
  const calls = []
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    placeQuickOrder: async payload => { calls.push(payload); return { code: 0 } }
  })
  const baseState = {
    canSubmitBuy: true,
    canSubmitSell: true,
    floatingConsole: false,
    embeddedDock: false,
    dockTpslEnabled: false,
    isCryptoMarket: true,
    isStockMarket: false,
    isSwapMode: false,
    selectedCredentialId: 7,
    currentSymbol: 'ETH/USDT',
    orderType: 'market',
    currentPrice: 2415,
    currentPriceUpdatedAt: Date.now(),
    amount: 100,
    effectiveMarketType: 'spot',
    spotBuyInputMode: 'amount',
    spotSellInputMode: 'quantity',
    source: 'indicator',
    instrumentId: 'ETHUSDT',
    productType: 'crypto',
    apiFamily: 'spot',
    $t: key => key,
    $emit: () => {}
  }

  await component.methods.handleSubmit.call({ ...baseState }, 'buy')
  await component.methods.handleSubmit.call({
    ...baseState,
    currentSymbol: 'QQQ/USDT',
    instrumentId: 'QQQUSDT',
    productType: 'stock_perpetual',
    apiFamily: 'swap',
    isSwapMode: true,
    effectiveMarketType: 'swap',
    leverage: 2,
    marginMode: 'cross'
  }, 'buy')

  assert.equal(calls[0].resolve_product, true)
  assert.equal(calls[0].instrument_id, undefined)
  assert.equal(calls[0].product_type, undefined)
  assert.equal(calls[0].api_family, undefined)
  assert.equal(calls[1].instrument_id, 'QQQUSDT')
  assert.equal(calls[1].product_type, 'stock_perpetual')
  assert.equal(calls[1].api_family, 'swap')
})

test('live quotes do not overwrite a manually entered limit', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = { orderType: 'limit', limitPrice: 81000, currentPrice: 82000 }
  component.watch.presetPrice.call(state, 82500)
  assert.equal(state.currentPrice, 82500)
  assert.equal(state.limitPrice, 81000)
  state.limitPrice = state.currentPrice
  component.methods.applyNewPrice.call(state, 82600)
  assert.equal(state.limitPrice, 82500)
  state.orderType = 'market'
  component.watch.presetPrice.call(state, 82600)
  assert.equal(state.limitPrice, 82600)
})

test('floating price inputs preserve fractional prices for high and low value assets', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  assert.equal(component.computed.pricePrecision.call({ floatingConsole: true, currentPrice: 81000.5 }), 2)
  assert.equal(component.computed.pricePrecision.call({ floatingConsole: true, currentPrice: 1e-7 }), 7)
  assert.equal(component.computed.pricePrecision.call({ floatingConsole: true, currentPrice: 81000, limitPrice: 81000.125 }), 3)
})

test('enabled protection must have a price and empty limit prices cannot submit', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = {
    floatingConsole: true, supportsNativeProtection: true, consoleTpEnabled: true,
    consoleSlEnabled: false, tpPrice: null, tradableMarketSupported: true,
    selectedCredentialId: 7, selectedCredential: { id: 7 }, currentSymbol: 'BTC/USDT',
    submitting: false
  }
  assert.equal(component.computed.submitContextReady.call(state), false)
  state.tpPrice = 85000
  assert.equal(component.computed.submitContextReady.call(state), true)
  assert.equal(component.computed.canSubmitBuy.call({ submitContextReady: true, orderType: 'limit', limitPrice: null, amount: 100 }), false)
  assert.equal(component.computed.canSubmitSell.call({ submitContextReady: true, orderType: 'limit', limitPrice: 0, amount: 100, isSwapMode: true }), false)
})

test('quotes use the selected exchange and market and ignore stale responses', async () => {
  let release
  let params
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    request: request => { params = request.params; return new Promise(resolve => { release = resolve }) }
  })
  const prices = []
  const state = {
    currentSymbol: 'BTC/USDT', isCryptoMarket: true,
    selectedCredential: { exchange_id: 'gate' }, exchangeId: 'okx',
    effectiveMarketType: 'swap', priceMarketParam: 'Crypto',
    applyNewPrice: value => prices.push(value)
  }
  const pending = component.methods.loadPrice.call(state)
  assert.deepEqual(JSON.parse(JSON.stringify(params)), { market: 'Crypto', symbol: 'BTC/USDT', exchange_id: 'gate', market_type: 'swap' })
  state.effectiveMarketType = 'spot'
  release({ code: 1, data: { price: 82000 } })
  await pending
  assert.deepEqual(prices, [])
  const next = component.methods.loadPrice.call(state)
  release({ code: 1, data: { price: 81000 } })
  await next
  assert.deepEqual(prices, [81000])
})

test('selecting an activity tab expands a collapsed floating table', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = { floatingConsole: true, floatingActivityExpanded: false, $nextTick: fn => fn() }
  component.methods.selectDockTab.call(state, 'positions')
  assert.equal(state.activeDockTab, 'positions')
  assert.equal(state.floatingActivityExpanded, true)
})

test('full Binance close retries only the verified residual once', async () => {
  const calls = []
  const messages = []
  const responses = [
    { code: 1, data: { status: 'partially_filled', filled: 2.86, remaining_size: 1.9, retry_close_size: 1.9, close_complete: false } },
    { code: 1, data: { status: 'filled', filled: 1.9, remaining_size: 0, retry_close_size: 0, close_complete: true } }
  ]
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    closeQuickTradePosition: async payload => {
      calls.push(payload)
      return responses.shift()
    }
  })
  const state = {
    selectedCredentialId: 7,
    currentSymbol: 'SOL/USDT',
    effectiveMarketType: 'swap',
    floatingConsole: true,
    isSwapMode: true,
    isStockMarket: false,
    closingPositionSide: null,
    positionRequestId: 0,
    currentPositions: [{ side: 'short', size: 4.76 }],
    positionEditor: {},
    $t: (key, params) => ({ key, params }),
    $message: {
      success: value => messages.push({ type: 'success', value }),
      warning: value => messages.push({ type: 'warning', value }),
      info: () => {}
    },
    $notification: { error: () => {} },
    refreshAfterTrade: () => {}
  }
  state.applyConfirmedClose = (data, side) => component.methods.applyConfirmedClose.call(state, data, side)

  await component.methods.handleClosePosition.call(state, state.currentPositions[0])

  assert.equal(calls.length, 2)
  assert.equal(calls[0].size, 4.76)
  assert.equal(calls[0].close_scope, 'full')
  assert.equal(calls[1].size, 1.9)
  assert.equal(calls[1].position_side, 'short')
  assert.deepEqual(state.currentPositions, [])
  assert.equal(messages.length, 1)
  assert.equal(messages[0].type, 'success')
  assert.equal(messages[0].value.key, 'quickTrade.workflow.exitFilled')
})

test('PC spot sell submits the exact base asset quantity', async () => {
  const calls = []
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    placeQuickOrder: async payload => {
      calls.push(payload)
      return { code: 1, data: { id: 91 } }
    }
  })
  const state = {
    canSubmitBuy: true,
    canSubmitSell: true,
    isStockMarket: false,
    isCryptoMarket: true,
    isSwapMode: false,
    spotSellAvailable: 0.02,
    spotSellAvailableValue: 1600,
    spotSellInputMode: 'quantity',
    sellQuantity: 0.01234567,
    sellAmount: null,
    amount: 250,
    side: 'buy',
    submitting: false,
    submittingSide: '',
    embeddedDock: false,
    dockTpslEnabled: false,
    selectedCredentialId: 7,
    currentSymbol: 'BTC/USDT',
    orderType: 'market',
    limitPrice: 0,
    leverage: 1,
    effectiveMarketType: 'spot',
    marginMode: 'cross',
    tpPrice: null,
    slPrice: null,
    source: 'indicator',
    aiDecisionFilter: false,
    $emit: () => {},
    $t: key => key,
    $notification: { error: () => {}, warning: () => {} },
    loadBalance: async () => {},
    loadHistory: async () => {},
    loadPositionWithRetry: async () => {}
  }

  await component.methods.handleSubmit.call(state, 'sell')

  assert.equal(calls.length, 1)
  assert.equal(calls[0].amount, 0)
  assert.equal(calls[0].quantity, 0.01234567)
  assert.equal(calls[0].market_type, 'spot')
  assert.equal(calls[0].side, 'sell')
})

test('PC spot sell can submit a USDT value without a quantity field', async () => {
  const calls = []
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    placeQuickOrder: async payload => {
      calls.push(payload)
      return { code: 1, data: { id: 92 } }
    }
  })
  const state = {
    canSubmitBuy: true,
    canSubmitSell: true,
    isStockMarket: false,
    isCryptoMarket: true,
    isSwapMode: false,
    spotSellAvailable: 1,
    spotSellAvailableValue: 83000,
    spotSellInputMode: 'amount',
    sellQuantity: null,
    sellAmount: 100,
    amount: 250,
    side: 'buy',
    submitting: false,
    submittingSide: '',
    embeddedDock: false,
    dockTpslEnabled: false,
    selectedCredentialId: 7,
    currentSymbol: 'BTC/USDT',
    orderType: 'market',
    limitPrice: 0,
    leverage: 1,
    effectiveMarketType: 'spot',
    marginMode: 'cross',
    tpPrice: null,
    slPrice: null,
    source: 'indicator',
    aiDecisionFilter: false,
    $emit: () => {},
    $t: key => key,
    $notification: { error: () => {}, warning: () => {} },
    loadBalance: async () => {},
    loadHistory: async () => {},
    loadPositionWithRetry: async () => {}
  }

  await component.methods.handleSubmit.call(state, 'sell')

  assert.equal(calls.length, 1)
  assert.equal(calls[0].amount, 100)
  assert.equal('quantity' in calls[0], false)
  assert.equal(calls[0].market_type, 'spot')
})

test('PC spot buy can submit an exact base asset quantity', async () => {
  const calls = []
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    placeQuickOrder: async payload => {
      calls.push(payload)
      return { code: 1, data: { id: 93 } }
    }
  })
  const state = {
    canSubmitBuy: true,
    canSubmitSell: true,
    isStockMarket: false,
    isCryptoMarket: true,
    isSwapMode: false,
    spotBuyInputMode: 'quantity',
    spotSellInputMode: 'quantity',
    buyQuantity: 0.00123456,
    amount: 250,
    side: 'buy',
    submitting: false,
    submittingSide: '',
    embeddedDock: false,
    dockTpslEnabled: false,
    selectedCredentialId: 7,
    currentSymbol: 'BTC/USDT',
    orderType: 'market',
    limitPrice: 0,
    leverage: 1,
    effectiveMarketType: 'spot',
    marginMode: 'cross',
    tpPrice: null,
    slPrice: null,
    source: 'indicator',
    aiDecisionFilter: false,
    $emit: () => {},
    $t: key => key,
    $notification: { error: () => {}, warning: () => {} },
    loadBalance: async () => {},
    loadHistory: async () => {},
    loadPositionWithRetry: async () => {}
  }

  await component.methods.handleSubmit.call(state, 'buy')

  assert.equal(calls.length, 1)
  assert.equal(calls[0].amount, 0)
  assert.equal(calls[0].quantity, 0.00123456)
  assert.equal(calls[0].side, 'buy')
})

test('PC spot sell percentages use the base asset holding', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = {
    isCryptoMarket: true,
    isSwapMode: false,
    spotSellAvailable: 0.015,
    spotSellAvailableValue: 1245,
    spotSellInputMode: 'quantity',
    activeBalanceAvailable: 500,
    sellQuantity: null,
    sellAmount: null,
    amount: 100
  }

  component.methods.setQuickAmountByPercent.call(state, 50, 'sell')
  assert.equal(state.sellQuantity, 0.0075)

  state.spotSellInputMode = 'amount'
  component.methods.setQuickAmountByPercent.call(state, 50, 'sell')
  assert.equal(state.sellAmount, 622.5)

  component.methods.setQuickAmountByPercent.call(state, 25, 'buy')
  assert.equal(state.amount, 125)
})

test('spot sell availability excludes exchange dust', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = {
    isSpotCashOrder: true,
    currentPositions: [
      { side: 'long', size: 2, available: 1.8, tradable_size: 1.7 },
      { side: 'long', size: 0.002, available: 0.002, tradable_size: 0, is_dust: true },
      { side: 'long', size: 3, available: 0, tradable_size: 0, is_locked: true }
    ]
  }

  assert.equal(component.computed.spotSellAvailable.call(state), 1.7)
})

test('PC spot sell validates both quantity and USDT value against the holding', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const compute = ({ mode, sellQuantity, sellAmount }) => component.computed.canSubmitSell.call({
    submitContextReady: true,
    isCryptoMarket: true,
    isSwapMode: false,
    spotSellInputMode: mode,
    sellQuantity,
    sellAmount,
    spotSellAvailable: 0.01,
    spotSellAvailableValue: 830,
    spotSellReferencePrice: 83000,
    currentPositions: []
  })

  assert.equal(compute({ mode: 'quantity', sellQuantity: 0.01 }), true)
  assert.equal(compute({ mode: 'quantity', sellQuantity: 0.01000001 }), false)
  assert.equal(compute({ mode: 'amount', sellAmount: 100 }), true)
  assert.equal(compute({ mode: 'amount', sellAmount: 831 }), false)
})

test('cash buy validates requested value against available funds', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const amountState = {
    isSpotCashOrder: true,
    spotBuyInputMode: 'amount',
    amount: 100,
    activeBalanceAvailable: 0,
    balanceLoading: false,
    selectedCredentialId: 13
  }
  amountState.spotBuyRequestedValue = component.computed.spotBuyRequestedValue.call(amountState)
  assert.equal(amountState.spotBuyRequestedValue, 100)
  assert.equal(component.computed.buyFundsInsufficient.call(amountState), true)

  const quantityState = {
    isSpotCashOrder: true,
    spotBuyInputMode: 'quantity',
    buyQuantity: 0.25,
    spotBuyReferencePrice: 400,
    activeBalanceAvailable: 100,
    balanceLoading: false,
    selectedCredentialId: 13
  }
  quantityState.spotBuyRequestedValue = component.computed.spotBuyRequestedValue.call(quantityState)
  assert.equal(quantityState.spotBuyRequestedValue, 100)
  assert.equal(component.computed.buyFundsInsufficient.call(quantityState), false)
})

test('insufficient cash buy is blocked with a friendly warning', async () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = {
    canSubmitBuy: false,
    canSubmitSell: false,
    buyFundsInsufficient: true,
    buyFundsWarning: 'friendly balance warning',
    spotSellInputMode: 'quantity',
    sellQuantity: 0,
    spotSellAvailable: 0,
    $t: key => key
  }

  await component.methods.handleSubmit.call(state, 'buy')

  assert.equal(state.tradeFeedback.type, 'warning')
  assert.equal(state.tradeFeedback.text, 'friendly balance warning')
})

test('order rejection is shown below the ticket instead of a global notification', async () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    placeQuickOrder: async () => ({ code: 0, error_hint: 'quickTrade.errorHints.positionConflict' })
  })
  const state = {
    canSubmitBuy: true,
    canSubmitSell: true,
    isStockMarket: false,
    isCryptoMarket: true,
    isSwapMode: true,
    floatingConsole: true,
    supportsNativeProtection: false,
    selectedCredentialId: 7,
    currentSymbol: 'SOL/USDT',
    orderType: 'market',
    amount: 100,
    leverage: 5,
    effectiveMarketType: 'swap',
    marginMode: 'cross',
    source: 'manual',
    $t: key => `translated:${key}`
  }

  await component.methods.handleSubmit.call(state, 'buy')

  assert.equal(state.tradeFeedback.type, 'error')
  assert.equal(state.tradeFeedback.text, 'translated:quickTrade.errorHints.positionConflict')
})

test('reselecting the current symbol clears stale trade feedback', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = {
    currentSymbol: 'BTC/USDT',
    tradeFeedback: { type: 'error', text: 'strategyV2.instrumentResolutionAmbiguous' }
  }

  component.methods.handleSymbolChange.call(state, 'BTC/USDT')

  assert.equal(state.tradeFeedback, null)
  assert.equal(state.currentSymbol, 'BTC/USDT')
})

test('close rejection is shown below the ticket instead of a global notification', async () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    closeQuickTradePosition: async () => ({ code: 0, error_hint: 'quickTrade.errorHints.positionConflict' })
  })
  const state = {
    selectedCredentialId: 7,
    currentSymbol: 'SOL/USDT',
    effectiveMarketType: 'swap',
    floatingConsole: true,
    isSwapMode: true,
    isStockMarket: false,
    closingPositionSide: null,
    positionRequestId: 0,
    $t: key => `translated:${key}`
  }

  await component.methods.handleClosePosition.call(state, { side: 'short', size: 1.9 })

  assert.equal(state.tradeFeedback.type, 'error')
  assert.equal(state.tradeFeedback.text, 'translated:quickTrade.errorHints.positionConflict')
  assert.equal(state.closingPositionSide, null)
})

test('Alpaca buying power rejection is converted into a local message', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = {
    isStockMarket: true,
    spotBuyRequestedValue: 100,
    activeBalanceAvailable: 0,
    orderCurrency: 'USD',
    formatPrice: component.methods.formatPrice,
    $t: (key, values) => `${key}:${values.required}:${values.available}:${values.currency}`
  }

  const message = component.methods.friendlyOrderErrorMessage.call(state, {
    msg: 'Alpaca rejected the request. Raw error: {"buying_power":"0","code":40310000,"cost_basis":"100","message":"insufficient buying power"}'
  })

  assert.equal(message, 'quickTrade.insufficientBuyingPower:100.00:0.0000:USD')
})

test('Alpaca rejection does not invent an insufficient balance from the panel total', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = {
    isStockMarket: true,
    spotBuyRequestedValue: 100,
    activeBalanceAvailable: 157853,
    orderCurrency: 'USD',
    formatPrice: component.methods.formatPrice,
    $t: key => key
  }

  const message = component.methods.friendlyOrderErrorMessage.call(state, {
    msg: 'Alpaca rejected the request. Raw error: {"buying_power":"157853","code":40310000,"cost_basis":"100","message":"insufficient buying power"}'
  })

  assert.equal(message, 'quickTrade.alpacaBuyingPowerRejected')
})

test('Alpaca non-fractionable rejection tells the user to enter whole shares', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = {
    isStockMarket: true,
    $t: key => key
  }

  const message = component.methods.friendlyOrderErrorMessage.call(state, {
    msg: 'Alpaca request failed: quickTrade.alpacaFractionalNotSupported'
  })

  assert.equal(message, 'quickTrade.alpacaFractionalNotSupported')

  const brokerMessage = component.methods.friendlyOrderErrorMessage.call(state, {
    msg: 'Alpaca rejected the request. Raw error: {"code":40310000,"message":"asset \\"SPCX\\" is not fractionable"}'
  })
  assert.equal(brokerMessage, 'quickTrade.alpacaFractionalNotSupported')
})

test('quick trade localizes a backend error key before displaying it', async () => {
  const errorKey = 'strategyV2.equityProductCatalogStale'
  const translated = 'localized catalog message'
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    placeQuickOrder: async () => ({ code: 0, msg: errorKey })
  })
  const state = {
    canSubmitBuy: true,
    canSubmitSell: true,
    floatingConsole: false,
    embeddedDock: false,
    dockTpslEnabled: false,
    isCryptoMarket: true,
    isStockMarket: false,
    isSwapMode: false,
    selectedCredentialId: 7,
    currentSymbol: 'ETH/USDT',
    orderType: 'market',
    currentPrice: 2415,
    currentPriceUpdatedAt: Date.now(),
    amount: 100,
    effectiveMarketType: 'spot',
    spotBuyInputMode: 'amount',
    spotSellInputMode: 'quantity',
    source: 'indicator',
    $t: key => key === errorKey ? translated : key,
    $emit: () => {}
  }

  await component.methods.handleSubmit.call(state, 'buy')

  assert.equal(state.tradeFeedback.text, translated)
})

test('balance refresh keeps the last value pending or failed and accepts a real zero', async () => {
  let release
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    getQuickTradeBalance: () => new Promise(resolve => { release = resolve })
  })
  const state = { selectedCredentialId: 7, effectiveMarketType: 'swap', isSwapMode: true, balance: { available: 431, total: 496, swap: { available: 431, total: 496 } }, $t: key => key }
  let pending = component.methods.loadBalance.call(state)
  assert.equal(state.balance.available, 431)
  release({ code: 0, msg: 'offline' })
  await pending
  assert.equal(state.balance.available, 431)
  assert.equal(state.balance.error, 'offline')
  pending = component.methods.loadBalance.call(state)
  release({ code: 1, data: { available: 999, total: 496, swap: { available: 0, total: 496 } } })
  await pending
  assert.equal(state.balance.available, 0)
  assert.equal(state.balance.swap.available, 0)
  assert.equal(state.balanceLoading, false)
})

test('balance refresh ignores responses from another account, market or an older request', async () => {
  const releases = []
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    getQuickTradeBalance: () => new Promise(resolve => { releases.push(resolve) })
  })
  const state = { selectedCredentialId: 7, effectiveMarketType: 'swap', balance: { available: 431 }, $t: key => key }
  const result = value => ({ code: 1, data: { available: value, swap: { available: value } } })
  const first = component.methods.loadBalance.call(state)
  const second = component.methods.loadBalance.call(state)
  releases[1](result(432)); await second
  releases[0](result(400)); await first
  assert.equal(state.balance.available, 432)
  const third = component.methods.loadBalance.call(state)
  state.selectedCredentialId = 8
  releases[2](result(900)); await third
  assert.equal(state.balance.available, 432)
  const fourth = component.methods.loadBalance.call(state)
  state.effectiveMarketType = 'spot'
  releases[3](result(800)); await fourth
  assert.equal(state.balance.available, 432)
})

test('leverage input clamps blank, fractional and out-of-range values', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  for (const [input, expected] of [[null, 1], [0, 1], [500, 125], [5.6, 6], [20, 20]]) {
    const state = { leverage: input }
    component.methods.normalizeLeverage.call(state)
    assert.equal(state.leverage, expected)
  }
})

test('full close is market by default and refreshes fresh snapshots without hiding a live position', async () => {
  const calls = []
  let release
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    closeQuickTradePosition: async data => { calls.push(data); return { code: 1 } }
  })
  const pos = { side: 'long', size: .0061 }
  const state = {
    selectedCredentialId: 7, currentSymbol: 'BTC/USDT', effectiveMarketType: 'swap',
    floatingConsole: true, isSwapMode: true, closeScope: 'system_tracked', currentPositions: [pos],
    $t: key => key, $message: { success: () => {} },
    loadBalance: fresh => { assert.equal(fresh, true); return new Promise(resolve => { release = resolve }) },
    loadPosition: fresh => { assert.equal(fresh, true) }, loadHistory: () => {},
    applyConfirmedClose: (...args) => component.methods.applyConfirmedClose.call(state, ...args),
    refreshAfterTrade: () => component.methods.refreshAfterTrade.call(state),
    $notification: { error: () => assert.fail('unexpected error') }
  }
  await component.methods.handleClosePosition.call(state, pos)
  assert.equal(calls[0].order_type, 'market')
  assert.equal(calls[0].close_scope, 'full')
  assert.equal(calls[0].size, 0.0061)
  assert.equal(state.currentPositions[0], pos)
  assert.equal(state.closingPositionSide, null)
  release()
  await component.methods.handleClosePosition.call(state, pos, 'limit', 90000)
  assert.equal(calls[1].price, 90000)
  assert.equal(calls[1].order_type, 'limit')
  assert.equal(state.activeDockTab, 'openOrders')
  release()
})

test('positions ignore stale market responses and keep last snapshot on failure', async () => {
  const pending = []
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    getQuickTradePosition: () => new Promise(resolve => pending.push(resolve))
  })
  const position = { side: 'long', size: .0061 }
  const state = { selectedCredentialId: 7, currentSymbol: 'BTC/USDT', effectiveMarketType: 'swap', currentPositions: [position], normalizePosition: p => p }
  const first = component.methods.loadPosition.call(state)
  state.effectiveMarketType = 'spot'
  pending[0]({ code: 1, data: { positions: [] } }); await first
  assert.equal(state.currentPositions[0], position)
  const second = component.methods.loadPosition.call(state)
  pending[1]({ code: 0 }); await second
  assert.equal(state.currentPositions[0], position)
})

test('Alpaca history uses individual exchange fills and execution timestamps', async () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    broker: { alpaca: {
      orders: async () => ({ success: true, data: [] }),
      tradeHistory: async () => ({ success: true, data: [
        {
          id: 'exchange-alpaca-fill-1', exchange_fill_id: 'fill-1', exchange_order_id: 'order-1',
          symbol: 'AAPL', side: 'sell', status: 'filled', filled_amount: 1.25,
          avg_fill_price: 250, filled_at: '2026-10-23T08:30:01Z', fee_status: 'pending'
        },
        {
          id: 'exchange-alpaca-fill-2', exchange_fill_id: 'fill-2', exchange_order_id: 'order-1',
          symbol: 'AAPL', side: 'sell', status: 'filled', filled_amount: 0.75,
          avg_fill_price: 251, filled_at: '2026-10-23T08:30:02Z', fee_status: 'pending'
        }
      ] })
    } }
  })
  const state = {
    isStockMarket: true,
    selectedCredentialId: 9,
    currentSymbol: 'AAPL',
    recentTrades: [],
    recentOpenOrders: [],
    historyRecordSource: '',
    apiPayload: response => response.data,
    normalizeBrokerSymbol: symbol => symbol
  }

  await component.methods.loadHistory.call(state)

  assert.equal(state.historyRecordSource, 'exchange')
  assert.deepEqual(state.recentTrades.map(row => row.id), ['exchange-alpaca-fill-1', 'exchange-alpaca-fill-2'])
  assert.equal(state.recentTrades[0].filled_amount, 1.25)
  assert.equal(state.recentTrades[0].created_at, '2026-10-23T08:30:01Z')
  const formatted = component.methods.formatTradeCommission.call({
    formatPrice: component.methods.formatPrice,
    formatQuantity: component.methods.formatQuantity
  }, state.recentTrades[0])
  assert.equal(formatted, '--')
})

test('Alpaca notional market orders keep their requested value before filling', async () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    broker: { alpaca: {
      orders: async () => ({ success: true, data: [{
        id: 'alpaca-notional-1', symbol: 'NVDA', side: 'sell', status: 'accepted',
        qty: null, notional: 10000, order_type: 'market', limit_price: null,
        filled_qty: 0, filled_avg_price: null, asset_class: 'us_equity'
      }] }),
      tradeHistory: async () => ({ success: true, data: [] })
    } }
  })
  const state = {
    isStockMarket: true,
    selectedCredentialId: 13,
    currentSymbol: 'NVDA',
    recentTrades: [],
    recentOpenOrders: [],
    historyRecordSource: '',
    apiPayload: response => response.data,
    normalizeBrokerSymbol: symbol => symbol
  }

  await component.methods.loadHistory.call(state)

  const order = state.recentOpenOrders[0]
  assert.equal(order.requested_base_qty, 0)
  assert.equal(order.requested_notional, 10000)
  assert.equal(order.price, 0)
  assert.equal(order.avg_fill_price, 0)

  const display = {
    orderCurrency: 'USD',
    formatPrice: component.methods.formatPrice,
    formatQuantity: component.methods.formatQuantity,
    $t: key => key
  }
  assert.equal(component.methods.requestedOrderPriceLabel.call(display, order), 'quickTrade.market')
  assert.equal(component.methods.formatRequestedOrderSize.call(display, order), '10,000 USD')
})

test('buying power validation does not render a polling warning inside the ticket', async () => {
  const source = fs.readFileSync(new URL('../../src/components/QuickTradePanel/QuickTradePanel.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /v-if="buyFundsWarning"/)
  assert.doesNotMatch(source, /class="qt-buy-funds-warning"/)
})


test('only confirmed fills reduce the displayed holding, preserving the other side and spot dust', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = { currentPositions: [{ side: 'long', size: .082917 }, { side: 'short', size: 2 }], positionRequestId: 4 }
  component.methods.applyConfirmedClose.call(state, { status: 'submitted', filled: .082 }, 'long')
  assert.equal(state.currentPositions[0].size, .082917)
  component.methods.applyConfirmedClose.call(state, { status: 'filled', filled: .082 }, 'long')
  assert.ok(Math.abs(state.currentPositions[0].size - .000917) < 1e-12)
  assert.equal(state.currentPositions[1].size, 2)
  assert.equal(state.positionRequestId, 5)
  component.methods.applyConfirmedClose.call(state, { status: 'filled', filled: .000917 }, 'long')
  assert.equal(state.currentPositions.length, 1)
  assert.equal(state.currentPositions[0].side, 'short')
})

test('spot hides position history and returning from swap history selects holdings', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = { floatingConsole: true, isSwapMode: false, currentPositions: [], openOrderRows: [], scopedTradeRows: [], $t: key => key }
  assert.equal(component.computed.dockTabItems.call(state).length, 3)
  state.isSwapMode = true
  assert.equal(component.computed.dockTabItems.call(state).length, 4)
  Object.assign(state, { activeDockTab: 'positionHistory', $nextTick: () => {} })
  component.watch.tradeMode.call(state, 'spot')
  assert.equal(state.activeDockTab, 'positions')
})

test('order acknowledgement releases the ticket without waiting for account refresh', async () => {
  let refreshing = false
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', { placeQuickOrder: async () => ({ code: 1, data: { status: 'filled' } }) })
  const state = { canSubmitBuy: true, isSwapMode: true, selectedCredentialId: 12, currentSymbol: 'SOL/USDT', effectiveMarketType: 'swap', orderType: 'market', amount: 25, leverage: 5, $emit: () => {}, refreshAfterTrade: () => { refreshing = true }, $notification: { error: () => assert.fail('unexpected error') } }
  await component.methods.handleSubmit.call(state, 'buy')
  assert.equal(refreshing, true)
  assert.equal(state.submitting, false)
})

test('market order leaves current orders as soon as the position snapshot confirms the size change', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = {
    currentPositions: [],
    marketOrderConfirmations: {},
    positionSizeForSide: side => component.methods.positionSizeForSide.call(state, side)
  }
  component.methods.rememberMarketOrderConfirmation.call(state, 41, 'long', 0, 'increase')
  const trade = { id: 41, order_type: 'market', status: 'submitted' }
  assert.equal(component.methods.isMarketOrderPositionConfirmed.call(state, trade), false)
  state.currentPositions = [{ side: 'long', size: 0.01 }]
  assert.equal(component.methods.isMarketOrderPositionConfirmed.call(state, trade), true)
})

test('position confirmation does not hide limit orders or an unchanged market position', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = {
    currentPositions: [{ side: 'long', size: 0.01 }],
    marketOrderConfirmations: {},
    positionSizeForSide: side => component.methods.positionSizeForSide.call(state, side)
  }
  component.methods.rememberMarketOrderConfirmation.call(state, 42, 'long', 0.01, 'increase')
  assert.equal(component.methods.isMarketOrderPositionConfirmed.call(state, { id: 42, order_type: 'market' }), false)
  assert.equal(component.methods.isMarketOrderPositionConfirmed.call(state, { id: 42, order_type: 'limit' }), false)
})

test('post-trade account refresh is bounded instead of forcing every poll to hit the exchange', () => {
  const source = fs.readFileSync(new URL('../../src/components/QuickTradePanel/QuickTradePanel.vue', import.meta.url), 'utf8')
  assert.match(source, /accountRefreshUntil = Date\.now\(\) \+ 4000/)
  assert.match(source, /\}, 1200\)/)
  assert.match(source, /loadPosition\(false\)/)
  assert.match(source, /loadBalance\(false\)/)
  assert.doesNotMatch(source, /fresh = this\.floatingConsole/)
})


test('stock ticket submits its displayed precision without hidden fractional digits', async () => {
  const panel = options('components/QuickTradePanel/QuickTradePanel.vue')
  const calls = []
  const state = {
    isStockMarket: true, currentPrice: 64.1, limitPrice: 64.0999984741211, pricePrecision: 2, orderType: 'limit',
    spotBuyInputMode: 'quantity', buyQuantity: 100, stockLotSize: 100, selectedCredentialId: 18,
    currentSymbol: '03690', priceMarketParam: 'HKStock', selectedStockBrokerId: 'forthright',
    selectedStockBrokerClient: { placeOrder: async payload => { calls.push(payload); return { success: true } } },
    normalizeBrokerSymbol: value => value, apiSuccess: () => true, apiPayload: value => value,
    $emit: () => {}, loadBalance: async () => {}, loadHistory: async () => {}, loadPositionWithRetry: async () => {}
  }
  await panel.methods.submitStockOrder.call(state, 'buy')
  assert.equal(calls[0].price, 64.1)
  assert.equal(calls[0].quantity, 100)
  state.limitPrice = 64.125
  state.pricePrecision = 3
  await panel.methods.submitStockOrder.call(state, 'buy')
  assert.equal(calls[1].price, 64.125)
})


test('Forthright SMS field opens only when requested and clears after verification', async () => {
  const calls = []
  const panel = options('views/broker-accounts/components/ForthrightUnlock.vue', {
    broker: { forthright: { unlock: async payload => {
      calls.push(payload)
      if (!payload.smsCode) throw { response: { data: { error: 'brokerAccounts.forthright.secondAuthRequired' } } }
      return { success: true }
    } } }
  })
  const state = { ...panel.data(), credentialId: 18, $t: key => key, $nextTick: fn => fn(), $refs: {} }
  await panel.methods.unlock.call(state, '')
  assert.equal(state.phase, 'verify')
  state.code = '1111'
  await panel.methods.unlock.call(state, state.code)
  assert.equal(state.phase, 'unlocked')
  assert.equal(state.code, '')
  assert.equal(calls[1].credential_id, 18)
  assert.equal(calls[1].smsCode, '1111')
  panel.watch.credentialId.call(state)
  assert.equal(state.phase, 'idle')
})

test('Forthright unlock response cannot mark a newly selected account as verified', async () => {
  let finish
  const panel = options('views/broker-accounts/components/ForthrightUnlock.vue', {
    broker: { forthright: { unlock: () => new Promise(resolve => { finish = resolve }) } }
  })
  const state = { ...panel.data(), credentialId: 18 }
  const request = panel.methods.unlock.call(state, '')
  state.credentialId = 19
  panel.watch.credentialId.call(state)
  finish({ success: true })
  await request
  assert.equal(state.phase, 'idle')
  assert.equal(state.busy, false)
})


test('reloaded Forthright authorization restores saved verification without requesting an unlock', async () => {
  const panel = options('views/broker-accounts/components/ForthrightUnlock.vue', {
    broker: { forthright: { authorization: async ({ credential_id }) => {
      assert.equal(credential_id, 18)
      return { success: true, data: { state: 'verified' } }
    }, unlock: () => { throw new Error('must not unlock on reload') } } }
  })
  const state = { ...panel.data(), credentialId: 18 }
  await panel.methods.restore.call(state)
  assert.equal(state.phase, 'unlocked')
  assert.equal(state.busy, false)
})
