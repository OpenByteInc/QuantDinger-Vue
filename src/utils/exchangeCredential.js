/** Display names for crypto exchange_id values (shared across account pickers). */
export const CRYPTO_EXCHANGE_DISPLAY_NAMES = {
  binance: 'Binance',
  okx: 'OKX',
  bitget: 'Bitget',
  bybit: 'Bybit',
  coinbaseexchange: 'Coinbase',
  kraken: 'Kraken',
  kucoin: 'KuCoin',
  gate: 'Gate.io',
  bitfinex: 'Bitfinex',
  htx: 'HTX',
  alpaca: 'Alpaca',
  ibkr: 'IBKR',
  mt5: 'MetaTrader 5'
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
