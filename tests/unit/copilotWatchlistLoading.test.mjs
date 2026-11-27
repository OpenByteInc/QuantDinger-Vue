import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../../src/views/ai-analysis/components/CopilotWorkbench.vue', import.meta.url), 'utf8')
const names = ['loadWatchlist', 'refreshWatchlist', 'reloadWatchlistOnly', 'normalizeSymbolOption', 'seedSymbolOptions', 'applyDefaultWatchSymbol', 'symbolOptionValue', 'normalizePriceMap']
const code = names.map(name => source.match(new RegExp(`    (?:async )?${name} \\([^\\n]*\\) \\{[\\s\\S]*?\\n    \\},`))[0]).join('\n')
const asset = { asset_id: 1, market: 'Crypto', symbol: 'BNB/USDT' }
const nextAsset = { asset_id: 2, market: 'USStock', symbol: 'SPCX' }
function deferred () {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function workspace (list, prices = async () => ({ code: 1, data: [] })) {
  return {
    ...new Function('getWatchlist', 'getWatchlistPrices', `return ({${code}})`)(list, prices),
    watchlist: [], watchlistPrices: {}, watchlistRequestVersion: 0, loadingWatchlist: false,
    context: {}, selectedSymbolValue: '', draftContextLock: null, symbolOptions: [],
    watchKey: item => item.symbol, watchAssetKey: item => `asset:${item.asset_id}`
  }
}

test('quotes may fail after the saved assets and selection are already visible', async () => {
  const quote = deferred()
  const vm = workspace(async () => ({ code: 1, data: [asset] }), () => quote.promise)
  const request = vm.loadWatchlist()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(vm.watchlist[0].symbol, asset.symbol)
  assert.equal(vm.loadingWatchlist, false)
  assert.equal(vm.selectedSymbolValue, 'asset:1')
  quote.reject(new Error('price request timed out'))
  await request
  assert.equal(vm.watchlist.length, 1)
  assert.equal(vm.symbolOptions.length, 1)
  assert.deepEqual(vm.watchlistPrices, {})
})

test('activation and add refresh retain the selected research context when quotes fail', async () => {
  const vm = workspace(async () => ({ code: 1, data: { watchlist: [asset] } }), async () => { throw new Error('503') })
  vm.context = { market: 'USStock', symbol: 'AAPL' }
  vm.selectedSymbolValue = 'existing-selection'
  await vm.reloadWatchlistOnly()
  assert.equal(vm.watchlist[0].symbol, asset.symbol)
  assert.equal(vm.context.symbol, 'AAPL')
  assert.equal(vm.selectedSymbolValue, 'existing-selection')
})

test('failed or malformed list responses preserve the cached collection', async () => {
  for (const list of [
    async () => { throw new Error('network') },
    async () => ({ code: 0, data: [] }),
    async () => ({ code: 1, data: null })
  ]) {
    let quoteCalls = 0
    const vm = workspace(list, async () => { quoteCalls++ })
    vm.watchlist = [asset]
    await vm.loadWatchlist()
    assert.deepEqual(vm.watchlist, [asset])
    assert.equal(vm.loadingWatchlist, false)
    assert.equal(quoteCalls, 0)
  }
})

test('a successful empty list clears assets and quotes without fetching quotes', async () => {
  const vm = workspace(async () => ({ code: 1, data: [] }), async () => { throw new Error('must not run') })
  vm.watchlist = [asset]
  vm.watchlistPrices = { old: { price: 10 } }
  await vm.loadWatchlist()
  assert.deepEqual(vm.watchlist, [])
  assert.deepEqual(vm.watchlistPrices, {})
})

test('an older list cannot overwrite a more recent refresh', async () => {
  const old = deferred()
  let count = 0
  const vm = workspace(() => ++count === 1 ? old.promise : Promise.resolve({ code: 1, data: [nextAsset] }))
  const first = vm.loadWatchlist()
  await vm.reloadWatchlistOnly()
  old.resolve({ code: 1, data: [asset] })
  await first
  assert.equal(vm.watchlist[0].symbol, nextAsset.symbol)
  assert.equal(vm.context.symbol, nextAsset.symbol)
})

test('late quotes cannot overwrite the latest list or its prices', async () => {
  const old = deferred()
  let lists = 0
  let quotes = 0
  const vm = workspace(
    async () => ({ code: 1, data: [++lists === 1 ? asset : nextAsset] }),
    () => ++quotes === 1 ? old.promise : Promise.resolve({ code: 1, data: [{ ...nextAsset, price: 25 }] })
  )
  const first = vm.loadWatchlist()
  await new Promise(resolve => setImmediate(resolve))
  await vm.reloadWatchlistOnly()
  old.resolve({ code: 1, data: [{ ...asset, price: 100 }] })
  await first
  assert.equal(vm.watchlist[0].symbol, nextAsset.symbol)
  assert.equal(vm.watchlistPrices.SPCX.price, 25)
  assert.equal(vm.watchlistPrices[asset.symbol], undefined)
})

test('application-level quote failure does not erase the loaded assets', async () => {
  const vm = workspace(async () => ({ code: 1, data: [asset] }), async () => ({ code: 0, data: [] }))
  await vm.loadWatchlist()
  assert.equal(vm.watchlist.length, 1)
  assert.deepEqual(vm.watchlistPrices, {})
})
