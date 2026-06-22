import store from '@/store'
import storage from 'store'
import {
  ACCESS_TOKEN,
  APP_LANGUAGE,
  TOGGLE_CONTENT_WIDTH,
  TOGGLE_FIXED_HEADER,
  TOGGLE_FIXED_SIDEBAR, TOGGLE_HIDE_HEADER,
  TOGGLE_LAYOUT, TOGGLE_NAV_THEME, TOGGLE_WEAK,
  TOGGLE_COLOR, TOGGLE_MULTI_TAB
} from '@/store/mutation-types'
import { printANSI } from '@/utils/screenLog'
import defaultSettings from '@/config/defaultSettings'

export default function Initializer () {
  printANSI() // 请自行移除该行.  please remove this line

  const savedLayout = storage.get(TOGGLE_LAYOUT, defaultSettings.layout)
  const nextLayout = defaultSettings.layout === 'topmenu' && savedLayout === 'sidemenu'
    ? defaultSettings.layout
    : savedLayout
  store.commit(TOGGLE_LAYOUT, nextLayout)
  store.commit(TOGGLE_FIXED_HEADER, storage.get(TOGGLE_FIXED_HEADER, defaultSettings.fixedHeader))
  store.commit(TOGGLE_FIXED_SIDEBAR, storage.get(TOGGLE_FIXED_SIDEBAR, defaultSettings.fixSiderbar))
  store.commit(TOGGLE_CONTENT_WIDTH, storage.get(TOGGLE_CONTENT_WIDTH, defaultSettings.contentWidth))
  store.commit(TOGGLE_HIDE_HEADER, storage.get(TOGGLE_HIDE_HEADER, defaultSettings.autoHideHeader))
  store.commit(TOGGLE_NAV_THEME, storage.get(TOGGLE_NAV_THEME, defaultSettings.navTheme))
  store.commit(TOGGLE_WEAK, storage.get(TOGGLE_WEAK, defaultSettings.colorWeak))
  store.commit(TOGGLE_COLOR, storage.get(TOGGLE_COLOR, defaultSettings.primaryColor))
  store.commit(TOGGLE_MULTI_TAB, storage.get(TOGGLE_MULTI_TAB, defaultSettings.multiTab))
  let token = storage.get(ACCESS_TOKEN)
  if (token && typeof token !== 'string') {
    token = token.token || token.value || (typeof token === 'object' ? null : token)
  }
  token = typeof token === 'string' ? token : null
  store.commit('SET_TOKEN', token)

  store.dispatch('setLang', storage.get(APP_LANGUAGE, 'zh-CN'))

  // Fire-and-forget: pull brand / legal / contact config from backend so the
  // sidebar footer, login page, version label and legal modals reflect the
  // current deployment.  Errors are swallowed inside the action and we fall
  // back to the cached / default brand values, so this can never block boot.
  store.dispatch('LoadBrandConfig').catch(() => {})

  // Fire-and-forget: pull broker x market policy so the strategy / bot
  // wizards can disable incompatible options before the user submits.
  // Cached in sessionStorage; backend is still the source of truth and
  // re-validates every create/update/execute call.
  store.dispatch('LoadBrokerMarketPolicy').catch(() => {})

  // last step
}
