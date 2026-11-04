import { join, resolve } from 'node:path'
import {
  isTranslatableText,
  loadCoreLocale,
  localeTargets,
  postGeneratedOverrideModulePaths,
  preGeneratedOverrideModulePaths,
  placeholdersMatch
} from './i18n-utils.mjs'
import generatedOverrides, {
  verifiedSameTranslations
} from '../src/locales/generated-locale-overrides.js'
import { verifiedSameUiMessages } from '../src/locales/reviewed-ui-overrides.js'
import { verifiedSameSettingsMessages } from '../src/locales/settings-research-overrides.js'
import { verifiedSameHumanMessages } from '../src/locales/human-completion-overrides.js'
import { verifiedSameStrategyReviewMessages } from '../src/locales/reviewed-strategy-review-overrides.js'

const root = resolve(process.cwd())
const langDir = join(root, 'src', 'locales', 'lang')
const preGeneratedModules = await Promise.all(
  preGeneratedOverrideModulePaths.map(modulePath => import(new URL(modulePath, import.meta.url)))
)
const postGeneratedModules = await Promise.all(
  postGeneratedOverrideModulePaths.map(modulePath => import(new URL(modulePath, import.meta.url)))
)

function composeOverrides(localeName) {
  return Object.assign(
    {},
    ...preGeneratedModules.map(module => module.default?.[localeName] || {}),
    ...postGeneratedModules.map(module => module.default?.[localeName] || {}),
    generatedOverrides[localeName] || {}
  )
}

function finalMessages(localeName) {
  return {
    ...loadCoreLocale(langDir, localeName).locale,
    ...composeOverrides(localeName)
  }
}

const english = finalMessages('en-US')
const failures = []
const coverage = []
const requestedLocale = process.env.QUANTDINGER_I18N_AUDIT_LOCALE
const localesToAudit = requestedLocale ? [requestedLocale] : Object.keys(localeTargets)

if (requestedLocale && !localeTargets[requestedLocale]) {
  throw new Error(`Unsupported locale requested for audit: ${requestedLocale}`)
}

for (const localeName of localesToAudit) {
  const locale = finalMessages(localeName)
  const verifiedSame = new Set([
    ...(verifiedSameTranslations[localeName] || []),
    ...verifiedSameUiMessages,
    ...verifiedSameSettingsMessages,
    ...verifiedSameStrategyReviewMessages,
    ...(verifiedSameHumanMessages[localeName] || [])
  ])
  const missing = []
  const placeholderMismatches = []
  const untranslated = []

  for (const [key, source] of Object.entries(english)) {
    const target = locale[key]
    if (target === undefined || target === null) {
      missing.push(key)
      continue
    }
    if (typeof source !== 'string') {
      if (typeof target !== typeof source) missing.push(key)
      continue
    }
    if (typeof target !== 'string') {
      missing.push(key)
      continue
    }
    if (!placeholdersMatch(source, target)) {
      placeholderMismatches.push(key)
    }
    if (
      target === source &&
      isTranslatableText(source) &&
      !verifiedSame.has(key)
    ) {
      untranslated.push(key)
    }
  }

  coverage.push({
    locale: localeName,
    keys: Object.keys(locale).length,
    missing: missing.length,
    placeholderMismatches: placeholderMismatches.length,
    untranslated: untranslated.length
  })

  if (process.env.QUANTDINGER_I18N_AUDIT_DETAILS === localeName) {
    console.log(JSON.stringify({ locale: localeName, missing, placeholderMismatches, untranslated }, null, 2))
  }

  if (missing.length) {
    failures.push(`${localeName}: missing ${missing.length} keys (${missing.slice(0, 8).join(', ')})`)
  }
  if (placeholderMismatches.length) {
    failures.push(
      `${localeName}: ${placeholderMismatches.length} placeholder mismatches ` +
      `(${placeholderMismatches.slice(0, 8).join(', ')})`
    )
  }
  if (untranslated.length) {
    failures.push(
      `${localeName}: ${untranslated.length} unverified English fallbacks ` +
      `(${untranslated.slice(0, 8).join(', ')})`
    )
  }
}

console.table(coverage)

if (failures.length) {
  console.error('Locale completeness audit failed:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`Locale completeness audit passed for ${localesToAudit.length} translated locale(s).`)
