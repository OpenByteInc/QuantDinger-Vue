export const DEFAULT_TRADING_VENUE_IDS = Object.freeze([
  'alpaca',
  'ibkr',
  'tiger',
  'forthright',
  'webull',
  'binance',
  'okx',
  'bybit',
  'bitget',
  'gate',
  'htx'
])

export function normalizeEnabledTradingVenues (value) {
  if (!Array.isArray(value)) return [...DEFAULT_TRADING_VENUE_IDS]
  const allowed = new Set(DEFAULT_TRADING_VENUE_IDS)
  return value
    .map(item => String(item || '').trim().toLowerCase())
    .filter(item => allowed.has(item))
}
