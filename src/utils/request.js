import axios from 'axios'
// import store from '@/store'
import storage from 'store'
import notification from 'ant-design-vue/es/notification'
import { VueAxios } from './axios'
import { ACCESS_TOKEN, USER_INFO, USER_ROLES } from '@/store/mutation-types'
import i18n from '@/locales'

const PHPSESSID_KEY = 'PHPSESSID'
// Locale storage key used by vue-i18n (see src/locales/index.js)
const LOCALE_KEY = 'lang'

// Prevent multiple concurrent 401 redirects
let isRedirectingToLogin = false

function getToken () {
  let token = storage.get(ACCESS_TOKEN)
  if (!token) {
    return null
  }
  if (typeof token !== 'string') {
    if (token && typeof token === 'object') {
      token = token.token || token.value || null
    } else {
      token = null
    }
  }
  return (typeof token === 'string' && token.length > 0) ? token : null
}

const request = axios.create({
  baseURL: '/',
  timeout: 30000, // Default request timeout 30s (can be overridden per request)
  withCredentials: true // 允许携带 cookies
})

// Extended timeout for long-running AI analysis APIs
export const ANALYSIS_TIMEOUT = 180000 // 3 minutes for AI analysis

// Extended timeout for AI code/bot generation (LLM + auto-fix loop)
export const AI_GENERATE_TIMEOUT = 180000 // 3 minutes for AI generation

// Extended timeout for AI Copilot chat. Local Ollama models can need several
// minutes before returning a full non-streaming response.
export const AI_CHAT_TIMEOUT = 600000 // 10 minutes for AI chat fallback

// Extended timeout for backtest APIs (can take several minutes)
export const BACKTEST_TIMEOUT = 600000 // 10 minutes for backtest

// Translate via i18n with a hard-coded fallback so this util works even if a
// locale file failed to load (we never want the user to stare at a raw key).
function tt (key, fallback) {
  try {
    if (i18n && typeof i18n.t === 'function') {
      const v = i18n.t(key)
      if (v && v !== key) return v
    }
  } catch (e) { /* noop */ }
  return fallback
}

function tf (key, fallback, values = {}) {
  let text = tt(key, fallback)
  Object.keys(values).forEach(k => {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), values[k])
  })
  return text
}

function getBackendErrorMessage (error) {
  const data = error && error.response && error.response.data
  if (!data) return ''
  if (typeof data === 'string') return data
  return data.msg || data.message || data.error || ''
}

function normalizeBacktestRangeLimitError (error) {
  const envelope = error && error.response && error.response.data
  const details = envelope && envelope.data
  if (!details || details.error_type !== 'BACKTEST_RANGE_LIMIT') return ''
  const values = {
    market: details.market || '',
    symbol: details.symbol || '',
    timeframe: details.timeframe || '',
    maxRange: details.max_range || details.max_days || '',
    maxDays: details.max_days || '',
    fetchDays: details.fetch_days || '',
    warmupBars: details.warmup_bars || 0,
    requestedStart: details.requested_start || '',
    requestedEnd: details.requested_end || '',
    recommendedStart: details.recommended_start || '',
    recommendedEnd: details.recommended_end || ''
  }
  values.warmupNote = Number(values.warmupBars) > 0
    ? tf('request.backtestRangeLimitWarmup', ' including {warmupBars} warmup bars', values)
    : ''
  if (details.recommendation_available === false || !values.recommendedStart || !values.recommendedEnd) {
    return tf(
      'request.backtestRangeLimitNoSuggestion',
      'Backtest range is too long for {market}:{symbol} {timeframe}. This provider supports up to {maxRange} ({maxDays} days), but this run needs {fetchDays} days{warmupNote}. The indicator warmup alone exceeds the provider limit. Reduce lookback parameters or use a higher timeframe.',
      values
    )
  }
  return tf(
    'request.backtestRangeLimit',
    'Backtest range is too long for {market}:{symbol} {timeframe}. This provider supports up to {maxRange} ({maxDays} days), but this run needs {fetchDays} days{warmupNote}. Use {recommendedStart} to {requestedEnd}, or keep {requestedStart} and set the end date to {recommendedEnd}.',
    values
  )
}

function normalizeBusinessErrorMessage (message, error) {
  const backtestRangeLimit = normalizeBacktestRangeLimitError(error)
  if (backtestRangeLimit) return backtestRangeLimit
  if (!message) return ''
  const liveConflict = message.match(/Live strategy conflict: another running strategy already uses the same API key\/exchange\/market\/symbol \(([^)]+)\)\. Please stop strategy (\d+)(?: \((.+)\))? first\./i)
  if (liveConflict) {
    const [, scope, strategyId, strategyName] = liveConflict
    const target = strategyName ? `${strategyId} (${strategyName})` : strategyId
    return tf(
      'request.liveStrategyConflict',
      'Live strategy conflict: only one live strategy can run for the same API key / exchange / market type / symbol ({scope}). Please stop strategy {target} first.',
      { scope, target }
    )
  }
  const gridSpacing = message.match(/Grid spacing is too narrow after fees: worst cell \[([^\]]+)\] captures ~([0-9.]+)% but needs ~([0-9.]+)% to cover round-trip fees \(([0-9.]+)% per side plus safety buffer\)\. Widen the price range, reduce gridCount, or lower fee settings\./i)
  if (gridSpacing) {
    const [, cell, captures, required, fee] = gridSpacing
    return tf(
      'request.gridSpacingTooNarrow',
      'Grid spacing is too narrow after fees: worst cell [{cell}] captures about {captures}% but needs about {required}% to cover round-trip fees ({fee}% per side plus safety buffer). Widen the price range, reduce grid count, or lower fee settings.',
      { cell, captures, required, fee }
    )
  }
  return message
}

function attachBackendErrorMessage (error) {
  const message = normalizeBusinessErrorMessage(getBackendErrorMessage(error), error)
  if (!message) return error
  error.backendMessage = message
  try {
    error.message = message
  } catch (e) { /* noop */ }
  return error
}

const errorHandler = (error) => {
  attachBackendErrorMessage(error)
  if (error.response) {
    const data = error.response.data
    if (error.response.status === 403) {
      // NOTE: this notification used to be labelled "(Demo Mode) / Read-only in
      // demo mode", which was misleading: the backend returns 403 for many
      // distinct reasons (permission denied, IBKR disabled by env, market
      // not on whitelist, billing-gated route, ...). Always show the backend
      // msg as the description so users see the real cause.
      notification.error({
        message: tt('request.forbiddenTitle', 'Operation not allowed'),
        description: data.msg || data.message ||
          tt('request.forbiddenDesc', 'You do not have permission to perform this action.')
      })
    }
    if (error.response.status === 401 && !(data.result && data.result.isLogin)) {
      // Token invalid/expired: MUST clear local auth state, otherwise route guard will
      // detect a stale token and immediately bounce user away from login page.
      if (!isRedirectingToLogin) {
        isRedirectingToLogin = true
        try {
          storage.remove(ACCESS_TOKEN)
          storage.remove(USER_INFO)
          storage.remove(USER_ROLES)
          storage.remove(PHPSESSID_KEY)
        } catch (e) {}

        notification.error({
          message: tt('request.unauthorizedTitle', 'Unauthorized'),
          description: data.msg || data.message ||
            tt('request.unauthorizedDesc', 'Token invalid or expired, please login again.')
        })

        const curHash = window.location.hash || ''
        if (!curHash.includes('/user/login')) {
          const redirect = encodeURIComponent(curHash.replace('#', '') || '/')
          window.location.assign(`/#/user/login?redirect=${redirect}`)
        }
      }
    }
  }
  return Promise.reject(error)
}

// request interceptor
request.interceptors.request.use(config => {
  const isDefaultTimeout = !config.timeout || config.timeout === request.defaults.timeout
  if (config.url && isDefaultTimeout) {
    if (config.url.includes('/backtest/aiAnalyze')) {
      config.timeout = ANALYSIS_TIMEOUT
    } else if (config.url.includes('/strategies/ai-generate') || config.url.includes('/indicator/aiGenerate')) {
      config.timeout = AI_GENERATE_TIMEOUT
    } else if (config.url.includes('/api/ai/chat/message')) {
      config.timeout = AI_CHAT_TIMEOUT
    } else if (config.url.includes('/global-market/heatmap')) {
      config.timeout = 90000
    } else if (config.url.includes('/backtest')) {
      config.timeout = BACKTEST_TIMEOUT
    }
  }

  const token = getToken()
  const lang = storage.get(LOCALE_KEY) || 'en-US'

  // Tell backend which UI language user is using, so AI reports can match it.
  // We keep both a custom header and the standard Accept-Language for compatibility.
  config.headers['X-App-Lang'] = lang
  config.headers['Accept-Language'] = lang

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
    config.headers[ACCESS_TOKEN] = token
    config.headers['token'] = token
  } else {
    if (config.url && config.url.includes('/api/auth/info')) {
      const rawToken = storage.get(ACCESS_TOKEN)
      console.warn('Token missing for /api/auth/info request')
      console.warn('Raw token from storage:', rawToken)
      console.warn('Token type:', typeof rawToken)
      console.warn('Token value:', rawToken)
    }
  }

  config.headers['Cache-Control'] = 'no-cache'
  config.headers['Pragma'] = 'no-cache'
  config.headers['If-Modified-Since'] = '0'

  if ((config.method || 'get').toLowerCase() === 'get') {
    const ts = Date.now()
    config.params = Object.assign({}, config.params || {}, { _t: ts })
  }

  const phpsessid = storage.get(PHPSESSID_KEY)
  if (phpsessid && typeof document !== 'undefined') {
    const currentCookies = document.cookie
    const currentPhpsessidMatch = currentCookies.match(/PHPSESSID=([^;]+)/i)
    const currentPhpsessid = currentPhpsessidMatch ? currentPhpsessidMatch[1].trim() : null

    if (!currentPhpsessid || currentPhpsessid !== phpsessid) {
      try {
        if (window.location.hostname.includes('quantdinger.com')) {
          document.cookie = `PHPSESSID=${phpsessid}; path=/; domain=.quantdinger.com; SameSite=None; Secure`
        } else {
          document.cookie = `PHPSESSID=${phpsessid}; path=/; SameSite=None; Secure`
        }
      } catch (e) {
      }
    }
  }

  return config
}, errorHandler)

// response interceptor
request.interceptors.response.use((response) => {
  try {
    if (typeof document !== 'undefined') {
      const cookies = document.cookie
      const phpsessidMatch = cookies.match(/PHPSESSID=([^;]+)/i)
      if (phpsessidMatch && phpsessidMatch[1]) {
        const phpsessid = phpsessidMatch[1].trim()
        const savedPhpsessid = storage.get(PHPSESSID_KEY)
        if (!savedPhpsessid || savedPhpsessid !== phpsessid) {
          storage.set(PHPSESSID_KEY, phpsessid, new Date().getTime() + 24 * 60 * 60 * 1000)
        }
      }
    }
  } catch (e) {
  }

  return response.data
}, errorHandler)

const installer = {
  vm: {},
  install (Vue) {
    Vue.use(VueAxios, request)
  }
}

export default request

export {
  installer as VueAxios,
  request as axios
}
