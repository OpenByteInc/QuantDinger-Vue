import { getPublicSettingsConfig } from '@/api/settings'

const DEFAULT_CONFIG = Object.freeze({
  billing_enabled: false,
  marketplace_enabled: false,
  registration_enabled: true,
  broker_accounts_enabled: true,
  live_trading_enabled: true,
  agent_gateway_enabled: true
})

const features = {
  state: {
    config: { ...DEFAULT_CONFIG },
    loaded: false
  },
  mutations: {
    SET_FEATURE_CONFIG (state, config) {
      state.config = { ...DEFAULT_CONFIG, ...(config || {}) }
      state.loaded = true
    }
  },
  actions: {
    async LoadFeatureConfig ({ commit, state }, options = {}) {
      if (state.loaded && !options.force) return state.config
      try {
        const response = await getPublicSettingsConfig()
        if (response && response.code === 1 && response.data) {
          commit('SET_FEATURE_CONFIG', response.data)
        }
      } catch (_) {
        return state.config
      }
      return state.config
    }
  }
}

export default features
