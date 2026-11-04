import Vue from 'vue'
import VueI18n from 'vue-i18n'
import storage from 'store'
import moment from 'moment'
import enUS from './lang/en-US'
import copilotOverrides from './copilot-overrides'
import profileSecurityMessages from './lang/profile-security'
import brokerAccountWorkspaceMessages from './lang/broker-account-workspace'
import strategyV2Messages from './lang/strategy-v2'
import fundamentalSyncMessages from './lang/fundamental-sync'
import strategyLiveRiskMessages from './lang/strategy-live-risk'
import robotBuilderMessages from './lang/robot-builder-overrides'
import billingPaymentMessages from './billing-payment-overrides'
import referralRewardMessages from './referral-reward-overrides'
import adminOrderMessages from './admin-order-overrides'
import strategyTradeRecordMessages from './lang/strategy-trade-records'
import quickTradeRecordMessages from './quick-trade-records'
import chartTypeMessages from './chart-type-overrides'
import aiDecisionFilterMessages from './ai-decision-filter-overrides'
import generatedLocaleOverrides from './generated-locale-overrides'
import uxOverrides from './ux-overrides'
import copilotCallsiteOverrides from './copilot-callsite-overrides'
import reviewedUiOverrides from './reviewed-ui-overrides'
import professionalReportOverrides from './professional-report-overrides'
import backtestRangeOverrides from './backtest-range-overrides'
import settingsResearchOverrides from './settings-research-overrides'
import settingsRuntimeOverrides from './settings-runtime-overrides'
import strategyBuilderOverrides from './strategy-builder-overrides'
import currentFeatureOverrides from './lang/current-feature-overrides'
import strategyEvolutionMessages from './lang/strategy-evolution'
import quickTradeSpotSellMessages from './lang/quick-trade-spot-sell'
import talibFactorMessages from './lang/talib-factors'
import factorResearchMessages from './lang/factor-research-factors'
import factorLibraryEnhancementMessages from './lang/factor-library-enhancements'
import factorLibraryCustomMessages from './lang/factor-library-custom'
import backtestWorkbenchMessages from './lang/backtest-workbench'
import strategyReviewMessages from './lang/strategy-review'
import quickTradeFloatingMessages from './lang/quick-trade-floating'
import quickTradeLiquidityArenaMessages from './lang/quick-trade-liquidity-arena'
import quickTradeWorkflowMessages from './lang/quick-trade-workflow'
import settingsFeatureMessages from './settings-feature-overrides'
import settingsAiMessages from './settings-ai-overrides'
import settingsTradingMessages from './settings-trading-overrides'
import settingsSecurityMessages from './settings-security-overrides'
import strategyRunMessages from './strategy-run-overrides'
import agentManagementMessages from './agent-management-overrides'
import zhTwProductMessages from './zh-tw-product-overrides'
import navigationMessages from './navigation-overrides'
import bitgetAccountModeMessages from './lang/bitget-account-mode'
import aiSkillsTaxonomyMessages from './lang/ai-skills-taxonomy'
import factorResearchUniverseMessages from './lang/factor-research-universe'
import aiAnalysisWorkbenchMessages from './ai-analysis-workbench-overrides'
import settingsUniverseManagementMessages from './settings-universe-management-overrides'
import tradingVenueSettingsMessages from './lang/trading-venue-settings'
import indicatorWorkspaceLayoutMessages from './lang/indicator-workspace-layout'
import venueResearchCopyOverrides from './venue-research-copy-overrides'
import marketCatalogMessages from './market-catalog-overrides'
import humanCompletionOverrides from './human-completion-overrides'
import reviewedRoundTwoOverrides from './reviewed-round-two-overrides'
import reviewedStrategyReviewOverrides from './reviewed-strategy-review-overrides'

Vue.use(VueI18n)

export const defaultLang = 'en-US'

const messages = {
  [defaultLang]: {
    ...enUS,
    ...(copilotOverrides[defaultLang] || {}),
    ...(profileSecurityMessages[defaultLang] || {}),
    ...(brokerAccountWorkspaceMessages[defaultLang] || {}),
    ...(strategyV2Messages[defaultLang] || {}),
    ...(fundamentalSyncMessages[defaultLang] || {}),
    ...(strategyLiveRiskMessages[defaultLang] || {}),
    ...(robotBuilderMessages[defaultLang] || {}),
    ...(billingPaymentMessages[defaultLang] || {}),
    ...(referralRewardMessages[defaultLang] || {}),
    ...(adminOrderMessages[defaultLang] || {}),
    ...(strategyTradeRecordMessages[defaultLang] || {}),
    ...(quickTradeRecordMessages[defaultLang] || {}),
    ...(chartTypeMessages[defaultLang] || {}),
    ...(aiDecisionFilterMessages[defaultLang] || {}),
    ...(uxOverrides[defaultLang] || {}),
    ...(copilotCallsiteOverrides[defaultLang] || {}),
    ...(reviewedUiOverrides[defaultLang] || {}),
    ...(professionalReportOverrides[defaultLang] || {}),
    ...(backtestRangeOverrides[defaultLang] || {}),
    ...(settingsResearchOverrides[defaultLang] || {}),
    ...(settingsRuntimeOverrides[defaultLang] || {}),
    ...(strategyBuilderOverrides[defaultLang] || {}),
    ...(currentFeatureOverrides[defaultLang] || {}),
    ...(strategyEvolutionMessages[defaultLang] || {}),
    ...(quickTradeSpotSellMessages[defaultLang] || {}),
    ...(talibFactorMessages[defaultLang] || {}),
    ...(factorResearchMessages[defaultLang] || {}),
    ...(factorLibraryEnhancementMessages[defaultLang] || {}),
    ...(factorLibraryCustomMessages[defaultLang] || {}),
    ...(backtestWorkbenchMessages[defaultLang] || {}),
    ...(strategyReviewMessages[defaultLang] || {}),
    ...(quickTradeFloatingMessages[defaultLang] || {}),
    ...(quickTradeLiquidityArenaMessages[defaultLang] || {}),
    ...(quickTradeWorkflowMessages[defaultLang] || {}),
    ...(settingsFeatureMessages[defaultLang] || {}),
    ...(zhTwProductMessages[defaultLang] || {}),
    ...(navigationMessages[defaultLang] || {}),
    ...(bitgetAccountModeMessages[defaultLang] || {}),
    ...(aiSkillsTaxonomyMessages[defaultLang] || {}),
    ...(generatedLocaleOverrides[defaultLang] || {}),
    ...(factorResearchUniverseMessages[defaultLang] || {}),
    ...(aiAnalysisWorkbenchMessages[defaultLang] || {}),
    ...(settingsUniverseManagementMessages[defaultLang] || {}),
    ...(tradingVenueSettingsMessages[defaultLang] || {}),
    ...(indicatorWorkspaceLayoutMessages[defaultLang] || {}),
    ...(venueResearchCopyOverrides[defaultLang] || {}),
    ...(marketCatalogMessages[defaultLang] || {}),
    ...(settingsAiMessages[defaultLang] || {}),
    ...(settingsTradingMessages[defaultLang] || {}),
    ...(settingsSecurityMessages[defaultLang] || {}),
    ...(humanCompletionOverrides[defaultLang] || {}),
    ...(reviewedRoundTwoOverrides[defaultLang] || {}),
    ...(reviewedStrategyReviewOverrides[defaultLang] || {}),
    ...(strategyRunMessages[defaultLang] || {}),
    ...(agentManagementMessages[defaultLang] || {})
  }
}

const localeLoaders = {
  'ar-SA': () => import('./lang/ar-SA.js'),
  'de-DE': () => import('./lang/de-DE.js'),
  'fr-FR': () => import('./lang/fr-FR.js'),
  'ja-JP': () => import('./lang/ja-JP.js'),
  'ko-KR': () => import('./lang/ko-KR.js'),
  'ru-RU': () => import('./lang/ru-RU.js'),
  'th-TH': () => import('./lang/th-TH.js'),
  'vi-VN': () => import('./lang/vi-VN.js'),
  'zh-CN': () => import('./lang/zh-CN.js'),
  'zh-TW': () => import('./lang/zh-TW.js')
}

const i18n = new VueI18n({
  silentTranslationWarn: true,
  silentFallbackWarn: true,
  locale: defaultLang,
  fallbackLocale: defaultLang,
  messages
})

const loadedLanguages = [defaultLang]

function sanitizeLocaleMessage (message) {
  if (Array.isArray(message)) {
    return message
      .map(item => sanitizeLocaleMessage(item))
      .filter(item => item !== undefined)
  }

  if (message && typeof message === 'object') {
    return Object.keys(message).reduce((result, key) => {
      const value = sanitizeLocaleMessage(message[key])
      if (value !== undefined) {
        result[key] = value
      }
      return result
    }, {})
  }

  if (typeof message === 'string') {
    return message.includes('\uFFFD') ? undefined : message
  }

  return message
}

function setI18nLanguage (lang) {
  i18n.locale = lang
  const html = document.documentElement
  const isRtl = /^ar/i.test(lang)
  if (html) {
    html.setAttribute('lang', lang)
    html.setAttribute('dir', isRtl ? 'rtl' : 'ltr')
  }
  if (document.body) {
    document.body.setAttribute('dir', isRtl ? 'rtl' : 'ltr')
    document.body.classList.toggle('rtl', isRtl)
  }
  return lang
}

function mergeLocaleOverrides (lang) {
  const overrides = {
    ...(copilotOverrides[lang] || {}),
    ...(profileSecurityMessages[lang] || {}),
    ...(brokerAccountWorkspaceMessages[lang] || {}),
    ...(strategyV2Messages[lang] || {}),
    ...(fundamentalSyncMessages[lang] || {}),
    ...(strategyLiveRiskMessages[lang] || {}),
    ...(robotBuilderMessages[lang] || {}),
    ...(billingPaymentMessages[lang] || {}),
    ...(referralRewardMessages[lang] || {}),
    ...(adminOrderMessages[lang] || {}),
    ...(strategyTradeRecordMessages[lang] || {}),
    ...(quickTradeRecordMessages[lang] || {}),
    ...(chartTypeMessages[lang] || {}),
    ...(aiDecisionFilterMessages[lang] || {}),
    ...(uxOverrides[lang] || {}),
    ...(copilotCallsiteOverrides[lang] || {}),
    ...(reviewedUiOverrides[lang] || {}),
    ...(professionalReportOverrides[lang] || {}),
    ...(backtestRangeOverrides[lang] || {}),
    ...(settingsResearchOverrides[lang] || {}),
    ...(settingsRuntimeOverrides[lang] || {}),
    ...(strategyBuilderOverrides[lang] || {}),
    ...(currentFeatureOverrides[lang] || {}),
    ...(strategyEvolutionMessages[lang] || {}),
    ...(quickTradeSpotSellMessages[lang] || {}),
    ...(talibFactorMessages[lang] || {}),
    ...(factorResearchMessages[lang] || {}),
    ...(factorLibraryEnhancementMessages[lang] || {}),
    ...(factorLibraryCustomMessages[lang] || {}),
    ...(backtestWorkbenchMessages[lang] || {}),
    ...(strategyReviewMessages[lang] || {}),
    ...(quickTradeFloatingMessages[lang] || {}),
    ...(quickTradeLiquidityArenaMessages[lang] || {}),
    ...(quickTradeWorkflowMessages[lang] || {}),
    ...(settingsFeatureMessages[lang] || {}),
    ...(zhTwProductMessages[lang] || {}),
    ...(navigationMessages[lang] || {}),
    ...(bitgetAccountModeMessages[lang] || {}),
    ...(aiSkillsTaxonomyMessages[lang] || {}),
    ...(generatedLocaleOverrides[lang] || {}),
    ...(factorResearchUniverseMessages[lang] || {}),
    ...(aiAnalysisWorkbenchMessages[lang] || {}),
    ...(settingsUniverseManagementMessages[lang] || {}),
    ...(tradingVenueSettingsMessages[lang] || {}),
    ...(indicatorWorkspaceLayoutMessages[lang] || {}),
    ...(venueResearchCopyOverrides[lang] || {}),
    ...(marketCatalogMessages[lang] || {}),
    ...(settingsAiMessages[lang] || {}),
    ...(settingsTradingMessages[lang] || {}),
    ...(settingsSecurityMessages[lang] || {}),
    ...(humanCompletionOverrides[lang] || {}),
    ...(reviewedRoundTwoOverrides[lang] || {}),
    ...(reviewedStrategyReviewOverrides[lang] || {}),
    ...(strategyRunMessages[lang] || {}),
    ...(agentManagementMessages[lang] || {})
  }
  i18n.setLocaleMessage(lang, {
    ...(i18n.getLocaleMessage(lang) || {}),
    ...overrides
  })
}

export async function loadLanguageAsync (lang = defaultLang) {
  storage.set('lang', lang)
  if (i18n.locale === lang) {
    mergeLocaleOverrides(lang)
    return setI18nLanguage(lang)
  }

  if (!loadedLanguages.includes(lang)) {
    const loadLocale = localeLoaders[lang]
    if (!loadLocale) return setI18nLanguage(defaultLang)

    const msg = await loadLocale()
    const locale = sanitizeLocaleMessage({
      ...msg.default,
      ...(copilotOverrides[lang] || {}),
      ...(profileSecurityMessages[lang] || {}),
      ...(brokerAccountWorkspaceMessages[lang] || {}),
      ...(strategyV2Messages[lang] || {}),
      ...(fundamentalSyncMessages[lang] || {}),
      ...(strategyLiveRiskMessages[lang] || {}),
      ...(robotBuilderMessages[lang] || {}),
      ...(billingPaymentMessages[lang] || {}),
      ...(referralRewardMessages[lang] || {}),
      ...(adminOrderMessages[lang] || {}),
      ...(strategyTradeRecordMessages[lang] || {}),
      ...(quickTradeRecordMessages[lang] || {}),
      ...(chartTypeMessages[lang] || {}),
      ...(aiDecisionFilterMessages[lang] || {}),
      ...(uxOverrides[lang] || {}),
      ...(copilotCallsiteOverrides[lang] || {}),
      ...(reviewedUiOverrides[lang] || {}),
      ...(professionalReportOverrides[lang] || {}),
      ...(backtestRangeOverrides[lang] || {}),
      ...(settingsResearchOverrides[lang] || {}),
      ...(settingsRuntimeOverrides[lang] || {}),
      ...(strategyBuilderOverrides[lang] || {}),
      ...(currentFeatureOverrides[lang] || {}),
      ...(quickTradeSpotSellMessages[lang] || {}),
      ...(talibFactorMessages[lang] || {}),
      ...(factorResearchMessages[lang] || {}),
      ...(factorLibraryEnhancementMessages[lang] || {}),
      ...(factorLibraryCustomMessages[lang] || {}),
      ...(backtestWorkbenchMessages[lang] || {}),
      ...(strategyReviewMessages[lang] || {}),
      ...(quickTradeFloatingMessages[lang] || {}),
      ...(quickTradeLiquidityArenaMessages[lang] || {}),
      ...(quickTradeWorkflowMessages[lang] || {}),
      ...(settingsFeatureMessages[lang] || {}),
      ...(zhTwProductMessages[lang] || {}),
      ...(navigationMessages[lang] || {}),
      ...(generatedLocaleOverrides[lang] || {}),
      ...(settingsAiMessages[lang] || {}),
      ...(settingsTradingMessages[lang] || {}),
      ...(settingsSecurityMessages[lang] || {}),
      ...(factorResearchUniverseMessages[lang] || {}),
      ...(aiAnalysisWorkbenchMessages[lang] || {}),
      ...(settingsUniverseManagementMessages[lang] || {}),
      ...(tradingVenueSettingsMessages[lang] || {}),
      ...(indicatorWorkspaceLayoutMessages[lang] || {}),
      ...(venueResearchCopyOverrides[lang] || {}),
      ...(marketCatalogMessages[lang] || {}),
      ...(humanCompletionOverrides[lang] || {}),
      ...(reviewedRoundTwoOverrides[lang] || {}),
      ...(reviewedStrategyReviewOverrides[lang] || {}),
      ...(strategyRunMessages[lang] || {}),
      ...(agentManagementMessages[lang] || {})
    })
    i18n.setLocaleMessage(lang, locale)
    loadedLanguages.push(lang)
    if (locale.momentName && locale.momentLocale) {
      moment.updateLocale(locale.momentName, locale.momentLocale)
    }
  }

  mergeLocaleOverrides(lang)
  return setI18nLanguage(lang)
}

export function i18nRender (key) {
  return i18n.t(`${key}`)
}

export default i18n
