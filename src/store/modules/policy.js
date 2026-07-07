import { getBrokerMarketPolicy } from '@/api/policy'

/**
 * Defaults match what the backend would return on a normal deployment.
 * They let the UI pre-render before the policy request comes back, and act
 * as a safety net if the request fails.  Keep in sync with
 * `backend_api_python/app/services/broker_market_policy.py`.
 */
const DEFAULT_POLICY = {
  broker_markets: {
    binance: { Crypto: ['spot', 'swap'] },
    okx: { Crypto: ['spot', 'swap'] },
    bybit: { Crypto: ['spot', 'swap'] },
    bitget: { Crypto: ['spot', 'swap'] },
    gate: { Crypto: ['spot', 'swap'] },
    mexc: { Crypto: ['spot', 'swap'] },
    kraken: { Crypto: ['spot'] },
    coinbase: { Crypto: ['spot'] },
    huobi: { Crypto: ['spot'] },
    bingx: { Crypto: ['spot'] },
    ibkr: { USStock: ['spot'] },
    alpaca: { USStock: ['spot'], Crypto: ['spot'] }
  },
  long_only_brokers: ['alpaca', 'ibkr'],
  bot_type_markets: {
    grid: ['Crypto', 'Forex'],
    martingale: ['Crypto'],
    dca: ['Crypto', 'Forex', 'USStock'],
    trend: ['Crypto', 'Forex', 'USStock']
  },
  live_market_categories: ['Crypto', 'Forex', 'USStock']
}

const STORAGE_KEY = 'quantdinger.broker-market-policy.v1'

function readCachedPolicy () {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
  } catch (_) { /* ignore */ }
  return null
}

function persistPolicy (data) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (_) { /* ignore quota / private-mode */ }
}

const policy = {
  state: {
    config: readCachedPolicy() || DEFAULT_POLICY,
    loaded: false,
    loading: false
  },

  mutations: {
    SET_POLICY_LOADING (state, loading) {
      state.loading = !!loading
    },
    SET_POLICY_CONFIG (state, payload) {
      state.config = payload || DEFAULT_POLICY
      state.loaded = true
      persistPolicy(state.config)
    }
  },

  actions: {
    /**
     * Fetch broker-market policy from the backend and cache it in
     * sessionStorage.  Idempotent: a no-op if already loaded unless
     * `force=true`.
     */
    async LoadBrokerMarketPolicy ({ commit, state }, opts = {}) {
      if (state.loading) return state.config
      if (state.loaded && !opts.force) return state.config
      commit('SET_POLICY_LOADING', true)
      try {
        const res = await getBrokerMarketPolicy()
        if (res && res.code === 1 && res.data) {
          // Shallow merge over defaults so a partial backend response still
          // produces a usable object.
          const merged = {
            ...DEFAULT_POLICY,
            ...res.data,
            broker_markets: {
              ...DEFAULT_POLICY.broker_markets,
              ...(res.data.broker_markets || {})
            },
            bot_type_markets: {
              ...DEFAULT_POLICY.bot_type_markets,
              ...(res.data.bot_type_markets || {})
            }
          }
          commit('SET_POLICY_CONFIG', merged)
        }
      } catch (e) {
        // Policy is non-critical: keep cached / default values and let the
        // app keep working.  The backend remains the source of truth and
        // will reject any incompatible config at create/execute time.
        // eslint-disable-next-line no-console
        console.warn('LoadBrokerMarketPolicy failed, falling back to defaults:', e)
      } finally {
        commit('SET_POLICY_LOADING', false)
      }
      return state.config
    }
  },

  getters: {
    /**
     * Map { exchangeId -> [marketCategory, ...] }.  Convenience getter
     * because most call-sites only care which markets a broker supports.
     */
    brokerMarkets: state => {
      const out = {}
      const bm = (state.config && state.config.broker_markets) || {}
      Object.keys(bm).forEach(broker => {
        out[broker] = Object.keys(bm[broker] || {})
      })
      return out
    }
  }
}

export default policy
export { DEFAULT_POLICY }
