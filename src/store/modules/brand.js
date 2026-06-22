import { getBrandConfig } from '@/api/brand'

const BUILD_APP_VERSION = typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0.0.0-dev'
const DEFAULT_COPYRIGHT = 'Copyright 2025-2026 QuantDinger. All rights reserved.'

function normalizeCopyright (value) {
  const text = String(value || '').trim()
  if (!text) return DEFAULT_COPYRIGHT
  return text.replace(/^漏\s*/, 'Copyright ')
}

/**
 * Defaults match the values the backend would return if every BRAND_* env
 * var were empty.  Keeping them here as a fallback lets the first-paint of
 * the app render the layout even if the brand-config request hasn't returned
 * yet (or fails entirely).
 */
const DEFAULT_BRAND = {
  app_name: 'QuantDinger',
  app_version: BUILD_APP_VERSION,
  copyright: DEFAULT_COPYRIGHT,
  logos: {
    light: '',
    dark: '',
    collapsed: '',
    favicon: ''
  },
  contact: {
    email: 'support@quantdinger.com',
    support_url: 'https://t.me/quantdinger',
    feature_request_url: 'https://github.com/brokermr810/QuantDinger/issues',
    live_chat_url: 'https://t.me/quantdinger'
  },
  social_accounts: [
    { name: 'GitHub', icon: 'github', url: 'https://github.com/brokermr810/QuantDinger' },
    { name: 'X', icon: 'x', url: 'https://x.com/quantdinger_en' },
    { name: 'Discord', icon: 'discord', url: 'https://discord.com/invite/tyx5B6TChr' },
    { name: 'Telegram', icon: 'telegram', url: 'https://t.me/quantdinger' },
    { name: 'YouTube', icon: 'youtube', url: 'https://youtube.com/@quantdinger' }
  ],
  legal: {
    user_agreement_url: '',
    user_agreement_text: '',
    privacy_policy_url: '',
    privacy_policy_text: ''
  },
  mobile_app: {
    latest_version: '',
    download_url: ''
  }
}

const STORAGE_KEY = 'quantdinger.brand-config.v1'

function readCachedBrand () {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
  } catch (_) { /* ignore */ }
  return null
}

function persistBrand (data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (_) { /* ignore quota / private-mode */ }
}

function normalizeBrand (data) {
  const brand = data && typeof data === 'object' ? data : DEFAULT_BRAND
  return {
    ...brand,
    app_version: brand.app_version || BUILD_APP_VERSION,
    copyright: normalizeCopyright(brand.copyright)
  }
}

/**
 * Reflect brand config into <title> and <link rel="icon">. Both are no-ops in
 * SSR or test environments where ``document`` doesn't exist.
 */
function applyBrandToDocument (data) {
  if (typeof document === 'undefined') return
  if (data && data.app_name) {
    document.title = data.app_name
  }
  const faviconUrl = data && data.logos && data.logos.favicon
  if (faviconUrl) {
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'icon')
      document.head.appendChild(link)
    }
    link.setAttribute('href', faviconUrl)
  }
}

const cachedBrand = readCachedBrand()
const initialBrand = normalizeBrand(cachedBrand
  ? { ...cachedBrand, app_version: BUILD_APP_VERSION }
  : DEFAULT_BRAND)
// Apply cached brand to <title>/<favicon> immediately on module load so the
// browser tab matches the deployment before the brand-config request returns.
applyBrandToDocument(initialBrand)

const brand = {
  state: {
    // Start from the cached payload if available, then DEFAULT_BRAND.
    // Hydrate ASAP so the first paint of <BasicLayout> already shows the
    // correct logo/title even before the network call returns.
    config: initialBrand,
    loaded: false,
    loading: false
  },

  mutations: {
    SET_BRAND_LOADING (state, loading) {
      state.loading = !!loading
    },
    SET_BRAND_CONFIG (state, payload) {
      state.config = normalizeBrand(payload || DEFAULT_BRAND)
      state.loaded = true
      persistBrand(state.config)
      applyBrandToDocument(state.config)
    }
  },

  actions: {
    /**
     * Fetch brand config from the backend and cache it.
     * - `force=true` re-fetches even if already loaded (used after admin saves
     *   settings).
     */
    async LoadBrandConfig ({ commit, state }, opts = {}) {
      if (state.loading) return state.config
      if (state.loaded && !opts.force) return state.config
      commit('SET_BRAND_LOADING', true)
      try {
        const res = await getBrandConfig()
        if (res && res.code === 1 && res.data) {
          // Shallow-merge over defaults so a partial response still works.
          const merged = {
            ...DEFAULT_BRAND,
            ...res.data,
            logos: { ...DEFAULT_BRAND.logos, ...(res.data.logos || {}) },
            contact: { ...DEFAULT_BRAND.contact, ...(res.data.contact || {}) },
            legal: { ...DEFAULT_BRAND.legal, ...(res.data.legal || {}) },
            mobile_app: { ...DEFAULT_BRAND.mobile_app, ...(res.data.mobile_app || {}) },
            social_accounts: Array.isArray(res.data.social_accounts) && res.data.social_accounts.length > 0
              ? res.data.social_accounts
              : DEFAULT_BRAND.social_accounts
          }
          commit('SET_BRAND_CONFIG', merged)
        }
      } catch (e) {
        // Brand-config is non-critical: keep cached / default values and let
        // the app keep working.
        // eslint-disable-next-line no-console
        console.warn('LoadBrandConfig failed, falling back to defaults:', e)
      } finally {
        commit('SET_BRAND_LOADING', false)
      }
      return state.config
    }
  }
}

export default brand
export { DEFAULT_BRAND }
