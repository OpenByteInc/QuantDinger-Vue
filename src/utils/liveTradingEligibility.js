const LIVE_CRYPTO_EXCHANGES = new Set(['binance', 'bitget', 'bybit', 'okx', 'gate', 'htx'])
const LIVE_US_STOCK_EXCHANGES = new Set(['alpaca', 'ibkr'])

const normalizeMarketCategory = manifestLike => {
  const markets = Array.isArray(manifestLike && manifestLike.markets)
    ? manifestLike.markets
    : []
  return markets.length === 1 ? String(markets[0]) : 'Mixed'
}

/**
 * Returns true when the deployment's executionMode may be "live".
 * Mirrors QuantDinger/backend_api_python/app/services/strategy_v2/deployment.py
 * ::_validate_execution_account, except that we fail fast locally instead of
 * round-tripping the server for a known-reject.
 */
export const supportsLiveExecutionMode = manifestLike => {
  const marketCategory = normalizeMarketCategory(manifestLike)
  return marketCategory === 'Crypto' || marketCategory === 'USStock'
}

/**
 * Returns true when the supplied exchange_id is a legal credential for a
 * live deployment of the given strategy manifest.
 */
export const credentialMatchesLiveStrategy = (manifestLike, exchangeId) => {
  const exchange = String(exchangeId || '').toLowerCase()
  const marketCategory = normalizeMarketCategory(manifestLike)
  if (marketCategory === 'Crypto') return LIVE_CRYPTO_EXCHANGES.has(exchange)
  if (marketCategory === 'USStock') return LIVE_US_STOCK_EXCHANGES.has(exchange)
  return false
}
