import { getMarketModules } from '@/api/marketModules'

export const FALLBACK_MARKET_MODULES = [
  { key: 'Crypto', label: 'Crypto', enabled: true, features: ['research', 'backtest', 'paper', 'live'] },
  { key: 'USStock', label: 'US Stocks', enabled: true, features: ['research', 'backtest', 'paper', 'live'] },
  { key: 'Forex', label: 'Forex', enabled: true, features: ['research', 'backtest', 'paper', 'live'] }
]

export function toMarketOption (module) {
  const key = module && (module.key || module.value)
  return {
    value: key,
    label: module.label || key,
    i18nKey: `dashboard.analysis.market.${key}`,
    module
  }
}

export async function loadEnabledMarketOptions (opts = {}) {
  const include = Array.isArray(opts.includeFeatures) ? opts.includeFeatures : []
  const fallback = Array.isArray(opts.fallback) ? opts.fallback : FALLBACK_MARKET_MODULES
  try {
    const res = await getMarketModules()
    const markets = res && res.code === 1 && res.data && Array.isArray(res.data.markets)
      ? res.data.markets
      : fallback
    return markets
      .filter(market => market && market.enabled !== false)
      .filter(market => {
        if (include.length === 0) return true
        const features = market.features || []
        return include.some(feature => features.includes(feature))
      })
      .map(toMarketOption)
  } catch (e) {
    return fallback.map(toMarketOption)
  }
}

export function firstMarketValue (options, fallback = 'Crypto') {
  return options && options.length > 0 ? options[0].value : fallback
}

