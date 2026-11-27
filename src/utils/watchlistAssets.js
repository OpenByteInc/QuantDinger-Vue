export function watchlistAssetKey (item = {}) {
  const hk = String(item.symbol || '').trim().toUpperCase().match(/^(?:HKSTOCK:)?(?:HK\.?)?(\d{1,5})(?:\.HK)?$/)
  if (item.market === 'HKStock' && hk) return `HKStock:${hk[1].padStart(5, '0')}:${item.product_type || 'hkstock'}`
  const assetId = Number(item.asset_id || item.assetId || 0)
  if (assetId > 0) return `asset:${assetId}`
  const market = String(item.market || '')
  const symbol = String(item.symbol || '').trim().toUpperCase()
  const product = String(item.product_type || '').toLowerCase()
  return JSON.stringify([market, symbol, product, item.underlying_market || '', item.underlying_symbol || ''])
}

export function groupWatchlistAssets (rows = [], preferred = null) {
  const groups = new Map()
  for (const item of rows) {
    if (!item || !item.market || !item.symbol) continue
    const key = watchlistAssetKey(item)
    if (!groups.has(key)) groups.set(key, { key, items: [], item })
    const group = groups.get(key)
    group.items.push(item)
    if (preferred && watchlistAssetKey(item) === watchlistAssetKey(preferred)) group.item = item
  }
  return [...groups.values()]
}

export function watchlistDisplayName (item) {
  if (!item) return ''
  const symbol = String(item.symbol || '').trim().toUpperCase()
  const name = [item.company_name, item.name, item.display_name]
    .find(value => typeof value === 'string' && value.trim() && value.trim().toUpperCase() !== symbol)
  return name ? name.trim() : ''
}

export function watchlistContextLabel (item, translate, { includeName = true } = {}) {
  if (!item) return ''
  const types = Array.isArray(item.market_types) ? item.market_types : []
  const typeLabels = item.market === 'Futures' ? [] : types.map(type => translate('marketContext.' + type))
  const product = String(item.product_type || '').toLowerCase()
  const productLabel = product && product !== 'crypto' ? translate('marketContext.product.' + product) : ''
  const symbol = String(item.symbol || '').trim()
  const nameLabel = includeName ? watchlistDisplayName(item) : ''
  return [productLabel, ...typeLabels, nameLabel].filter(Boolean).join(' · ') || symbol
}

export function watchlistPayload (item) {
  return {
    asset_id: Number(item.asset_id || item.assetId || 0)
  }
}
