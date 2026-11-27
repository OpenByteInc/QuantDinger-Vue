function normalizedMarket (market) {
  return String(market || '').replace(/[\s_-]/g, '').toLowerCase()
}

// CME outright quote display precision, not order-price rounding rules.
// https://www.cmegroup.com/markets/fx/fx-product-guide
const CME_FUTURES_PRICE_DECIMALS = {
  '6A': 5,
  '6B': 4,
  '6C': 5,
  '6E': 5,
  '6J': 7,
  '6N': 5,
  '6S': 5,
  MES: 2,
  MNQ: 2
}

export function formatMarketPrice (value, market = '', symbol = '', locale) {
  const price = Number(value)
  if (!Number.isFinite(price) || price <= 0) return '--'

  const marketKey = normalizedMarket(market)
  if (marketKey === 'futures') {
    const contract = String(symbol || '').trim().toUpperCase()
    const match = /^(6[ABCEJNS]|MES|MNQ)(?:[FGHJKMNQUVXZ]\d{1,4}(?:\.CME)?|=F)?$/.exec(contract)
    if (match) {
      const digits = CME_FUTURES_PRICE_DECIMALS[match[1]]
      return price.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })
    }
  }
  if (marketKey === 'usstock' || marketKey === 'hkstock') {
    return price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (price >= 1000) return price.toLocaleString(locale, { maximumFractionDigits: 2 })
  if (price >= 1) return price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  return price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 8 })
}

function latestReferencePrice (data) {
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i] || {}
    const candidates = [row.close, row.open, row.high, row.low]
    for (let j = 0; j < candidates.length; j++) {
      const value = Number(candidates[j])
      if (Number.isFinite(value) && value > 0) return value
    }
  }
  return 0
}

export function inferMarketPricePrecision (data, market) {
  if (!Array.isArray(data) || data.length === 0) return 2

  // Provider values may arrive as float32-style numbers such as
  // 219.2400054932. The trailing digits are serialization noise rather than
  // the display precision of a US equity.
  const marketKey = normalizedMarket(market)
  if (marketKey === 'usstock' || marketKey === 'usequity') {
    const referencePrice = latestReferencePrice(data)
    return referencePrice > 0 && referencePrice < 1 ? 4 : 2
  }

  let maxDecimals = 0
  const sample = data.length > 50 ? data.slice(-50) : data
  for (let i = 0; i < sample.length; i++) {
    const vals = [sample[i].close, sample[i].open, sample[i].high, sample[i].low]
    for (let j = 0; j < vals.length; j++) {
      const value = Number(vals[j])
      if (!Number.isFinite(value)) continue
      const s = String(value)
      const dot = s.indexOf('.')
      if (dot >= 0) maxDecimals = Math.max(maxDecimals, s.length - dot - 1)
    }
  }

  let minSpread = Infinity
  for (let i = 0; i < sample.length; i++) {
    const spread = Number(sample[i].high) - Number(sample[i].low)
    if (spread > 0 && spread < minSpread) minSpread = spread
  }
  let spreadDecimals = 2
  if (minSpread < Infinity && minSpread > 0) {
    spreadDecimals = Math.ceil(-Math.log10(minSpread)) + 2
  }

  return Math.min(Math.max(maxDecimals, spreadDecimals, 2), 10)
}
