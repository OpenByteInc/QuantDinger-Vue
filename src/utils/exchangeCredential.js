/** Display names for crypto exchange_id values (shared across account pickers). */
export const CRYPTO_EXCHANGE_DISPLAY_NAMES = {
  binance: 'Binance',
  okx: 'OKX',
  bitget: 'Bitget',
  bybit: 'Bybit',
  gate: 'Gate.io',
  htx: 'HTX',
  alpaca: 'Alpaca',
  ibkr: 'IBKR',
  tiger: 'Tiger Brokers',
  forthright: 'Forthright',
  webull: 'Webull'
}

export const CRYPTO_EXCHANGE_IDS = new Set([
  'binance',
  'okx',
  'bitget',
  'bybit',
  'gate',
  'htx'
])

export const US_STOCK_EXCHANGE_IDS = new Set([
  'alpaca',
  'ibkr',
  'tiger',
  'forthright',
  'webull'
])

export const HK_STOCK_EXCHANGE_IDS = new Set([
  'tiger',
  'forthright'
])

export const QUICK_TRADE_EXCHANGE_IDS = new Set([
  'binance',
  'okx',
  'bitget',
  'bybit',
  'gate',
  'htx'
])

export function isCryptoExchangeCredential (cred) {
  return CRYPTO_EXCHANGE_IDS.has(String(cred?.exchange_id || '').trim().toLowerCase())
}

export function filterCryptoExchangeCredentials (credentials, exchangeId) {
  const selectedExchangeId = String(exchangeId || '').trim().toLowerCase()
  return (Array.isArray(credentials) ? credentials : []).filter(cred => {
    const credentialExchangeId = String(cred?.exchange_id || '').trim().toLowerCase()
    return CRYPTO_EXCHANGE_IDS.has(credentialExchangeId) &&
      (!selectedExchangeId || credentialExchangeId === selectedExchangeId)
  })
}

export function isQuickTradeExchangeCredential (cred) {
  return QUICK_TRADE_EXCHANGE_IDS.has(String(cred?.exchange_id || '').trim().toLowerCase())
}

function liveExecutionMarket (manifest) {
  const markets = Array.isArray(manifest?.markets)
    ? [...new Set(manifest.markets.map(value => String(value || '').trim()).filter(Boolean))]
    : []
  if (markets.length !== 1) return ''
  return ['Crypto', 'USStock', 'HKStock'].includes(markets[0]) ? markets[0] : ''
}

/**
 * Live execution is a market capability, not a CTA/portfolio distinction.
 * A same-market portfolio is supported; a mixed-market strategy is not.
 */
export function supportsLiveExecutionMode (manifest) {
  return Boolean(liveExecutionMarket(manifest))
}

export function credentialMatchesLiveStrategy (manifest, exchangeId, accountType = '') {
  const market = liveExecutionMarket(manifest)
  const normalizedExchangeId = String(exchangeId || '').trim().toLowerCase()
  if (normalizedExchangeId === 'forthright') return ['USStock', 'HKStock'].includes(market) && accountType === 'securities'
  if (market === 'Crypto') return CRYPTO_EXCHANGE_IDS.has(normalizedExchangeId)
  if (market === 'USStock') return US_STOCK_EXCHANGE_IDS.has(normalizedExchangeId)
  if (market === 'HKStock') return HK_STOCK_EXCHANGE_IDS.has(normalizedExchangeId)
  return false
}

export function getExchangeDisplayName (exchangeId) {
  const id = String(exchangeId || '').trim().toLowerCase()
  if (!id) return '--'
  return CRYPTO_EXCHANGE_DISPLAY_NAMES[id] || id.toUpperCase()
}

/**
 * Human-readable label for a saved exchange credential (select options, lists).
 * @param {object} cred - row from /api/credentials/list
 * @param {{ unnamed?: string, includeHint?: boolean }} opts
 */
export function formatExchangeCredentialLabel (cred, opts = {}) {
  if (!cred) return ''
  const { unnamed = '', includeHint = true } = opts
  const alias = String(cred.name || '').trim()
  const ex = getExchangeDisplayName(cred.exchange_id)
  const hint = includeHint && cred.api_key_hint ? String(cred.api_key_hint).trim() : ''
  if (alias) {
    return hint ? `${ex} · ${alias} (${hint})` : `${ex} · ${alias}`
  }
  if (hint) return `${ex} (${hint})`
  return unnamed ? `${ex} · ${unnamed}` : ex
}
