const MARKET_NAMES = {
  cnstock: 'CNStock',
  crypto: 'Crypto',
  forex: 'Forex',
  future: 'Futures',
  futures: 'Futures',
  hkstock: 'HKStock',
  moex: 'MOEX',
  usstock: 'USStock'
}

const CRYPTO_MARKET_TYPE_ALIASES = {
  future: 'swap',
  futures: 'swap',
  perp: 'swap',
  perpetual: 'swap',
  spot: 'spot',
  swap: 'swap'
}

function normalizeMarketName (value, fallback = '') {
  const raw = String(value || '').trim()
  return MARKET_NAMES[raw.toLowerCase()] || raw || fallback
}

function normalizeCryptoMarketType (value, fallback = 'spot') {
  return CRYPTO_MARKET_TYPE_ALIASES[String(value || '').trim().toLowerCase()] || fallback
}

function splitInstrumentMarket (value, fallbackMarket = '') {
  const raw = String(value || '').trim()
  const prefixMatch = raw.match(/^([^:]+):(.*)$/)
  if (prefixMatch && MARKET_NAMES[String(prefixMatch[1] || '').trim().toLowerCase()]) {
    return {
      market: normalizeMarketName(prefixMatch[1]),
      body: String(prefixMatch[2] || '').trim()
    }
  }
  return {
    market: normalizeMarketName(fallbackMarket, 'Crypto'),
    body: raw
  }
}

function parseCryptoBody (value, fallbackMarketType = 'spot') {
  const segments = String(value || '').trim().split('@')
  const symbol = String(segments.shift() || '').trim().toUpperCase()
  let exchangeId = ''
  let marketType = normalizeCryptoMarketType(fallbackMarketType)

  segments.filter(Boolean).forEach(segment => {
    const qualifier = String(segment || '').trim()
    if (!qualifier) return
    const separator = qualifier.lastIndexOf(':')
    if (separator > -1) {
      const exchange = qualifier.slice(0, separator).trim().toLowerCase()
      const product = qualifier.slice(separator + 1).trim()
      if (exchange) exchangeId = exchange
      marketType = normalizeCryptoMarketType(product, marketType)
      return
    }
    const product = CRYPTO_MARKET_TYPE_ALIASES[qualifier.toLowerCase()]
    if (product) marketType = product
    else exchangeId = qualifier.toLowerCase()
  })

  return { symbol, exchangeId, marketType }
}

export function parseStrategyInstrumentIdentity (value, defaults = {}) {
  const fallbackMarket = defaults.market_category || defaults.marketCategory || defaults.market
  const { market, body } = splitInstrumentMarket(value, fallbackMarket)
  if (market === 'Crypto') {
    const parsed = parseCryptoBody(body, defaults.market_type || defaults.marketType || 'spot')
    const qualifier = parsed.exchangeId
      ? `${parsed.exchangeId}:${parsed.marketType}`
      : parsed.marketType
    return {
      market,
      symbol: parsed.symbol,
      exchangeId: parsed.exchangeId,
      marketType: parsed.marketType,
      instrument: parsed.symbol ? `Crypto:${parsed.symbol}@${qualifier}` : ''
    }
  }

  let symbol = String(body || '').split('@', 1)[0].trim().toUpperCase()
  if (market === 'HKStock') {
    const match = symbol.match(/^(?:HK\.?)?(\d{1,5})(?:\.HK|\.XHKG)?$/)
    if (match) symbol = `${match[1].padStart(5, '0')}.HK`
  }
  return {
    market,
    symbol,
    exchangeId: '',
    marketType: 'spot',
    instrument: symbol ? `${market}:${symbol}` : ''
  }
}

export function formatStrategyInstrumentIdentity (config = {}, options = {}) {
  const rawSymbol = config.symbol || config.instrument || ''
  const parsed = parseStrategyInstrumentIdentity(rawSymbol, config)
  if (!parsed.symbol) return ''
  if (parsed.market !== 'Crypto') return `${parsed.market}:${parsed.symbol}`

  const marketType = normalizeCryptoMarketType(
    config.market_type || config.marketType,
    parsed.marketType || 'spot'
  )
  const exchangeId = parsed.exchangeId || (
    options.includeConfigExchange
      ? String(config.exchange_id || config.exchangeId || '').trim().toLowerCase()
      : ''
  )
  const qualifier = exchangeId ? `${exchangeId}:${marketType}` : marketType
  return `Crypto:${parsed.symbol}@${qualifier}`
}
