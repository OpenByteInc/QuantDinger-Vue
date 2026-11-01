const CONTRACT_QUANTITY_UNITS = Object.freeze({
  binance: 'base',
  okx: 'contracts',
  bitget: 'base',
  bybit: 'base',
  gate: 'contracts',
  htx: 'contracts'
})

export function orderBookQuantityUnit (exchangeId, marketType) {
  const exchange = String(exchangeId || '').trim().toLowerCase()
  const market = String(marketType || '').trim().toLowerCase()
  if (market === 'spot') return 'base'
  return CONTRACT_QUANTITY_UNITS[exchange] || 'unknown'
}

export function usesNativeContractQuantity (exchangeId, marketType) {
  return orderBookQuantityUnit(exchangeId, marketType) === 'contracts'
}

export function normalizeContractOrderBook (snapshot, multiplier) {
  if (!snapshot || snapshot.quantity_normalized) return snapshot
  if (snapshot.quantity_unit && snapshot.quantity_unit !== 'contracts') return snapshot
  const factor = Number(multiplier || 0)
  if (!(factor > 0)) return snapshot

  const normalizeRows = rows => (rows || []).map(row => {
    const price = Number(row && row.price) || 0
    const size = (Number(row && row.size) || 0) * factor
    return { ...row, price, size, notional: price * size }
  })
  const bids = normalizeRows(snapshot.bids)
  const asks = normalizeRows(snapshot.asks)
  const bidTotal = bids.reduce((sum, row) => sum + row.notional, 0)
  const askTotal = asks.reduce((sum, row) => sum + row.notional, 0)

  return {
    ...snapshot,
    bids,
    asks,
    bid_total: bidTotal,
    ask_total: askTotal,
    buy_wall: bids.reduce((best, row) => row.notional > Number(best.notional || 0) ? row : best, {}),
    sell_wall: asks.reduce((best, row) => row.notional > Number(best.notional || 0) ? row : best, {}),
    contract_multiplier: factor,
    quantity_unit: 'base',
    quantity_normalized: true
  }
}
