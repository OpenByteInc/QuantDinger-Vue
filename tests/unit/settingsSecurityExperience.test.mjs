import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import securityMessages from '../../src/locales/settings-security-overrides.js'

const locales = [
  'ar-SA', 'de-DE', 'en-US', 'fr-FR', 'ja-JP', 'ko-KR',
  'ru-RU', 'th-TH', 'vi-VN', 'zh-CN', 'zh-TW'
]

const sectionKeys = [
  'settings.group.security',
  'settings.security.section.mfa',
  'settings.security.section.mfaDesc',
  'settings.security.badge.userOptIn',
  'settings.security.section.turnstile',
  'settings.security.section.turnstileDesc',
  'settings.security.section.redirects',
  'settings.security.section.redirectsDesc',
  'settings.security.section.google',
  'settings.security.section.googleDesc',
  'settings.security.section.github',
  'settings.security.section.githubDesc',
  'settings.security.section.loginProtection',
  'settings.security.section.loginProtectionDesc',
  'settings.security.section.verificationCodes',
  'settings.security.section.verificationCodesDesc'
]

test('registration and login security sections are localized in every desktop locale', () => {
  assert.deepEqual(Object.keys(securityMessages).sort(), [...locales].sort())
  for (const locale of locales) {
    for (const key of sectionKeys) {
      assert.equal(typeof securityMessages[locale][key], 'string', `${locale}.${key}`)
      assert.ok(securityMessages[locale][key].trim(), `${locale}.${key} is empty`)
    }
  }
})

test('security settings are grouped by runtime responsibility', () => {
  const source = readFileSync(
    new URL('../../src/views/settings/index.vue', import.meta.url),
    'utf8'
  )
  const start = source.indexOf('securitySectionDefinitions ()')
  const end = source.indexOf('buildCategorizedEntries', start)
  const block = source.slice(start, end)

  assert.match(source, /activeGroupKey === 'security'/)
  for (const key of [
    'MFA_ENABLED',
    'TURNSTILE_SITE_KEY',
    'FRONTEND_URL',
    'GOOGLE_CLIENT_ID',
    'GITHUB_CLIENT_ID',
    'SECURITY_IP_MAX_ATTEMPTS',
    'VERIFICATION_CODE_EXPIRE_MINUTES'
  ]) {
    assert.match(block, new RegExp(key))
  }
  assert.match(block, /advancedKeys: \['MFA_CHALLENGE_EXPIRE_MINUTES', 'MFA_MAX_ATTEMPTS'\]/)
  assert.match(block, /'OAUTH_ALLOWED_REDIRECTS', 'OAUTH_STATE_TTL_MINUTES'/)
})

test('Simplified and Traditional Chinese security fields have complete operator copy', () => {
  const fieldKeys = [
    'MFA_ENABLED',
    'MFA_RISK_LOGIN_ONLY',
    'FRONTEND_URL',
    'OAUTH_ALLOWED_REDIRECTS',
    'OAUTH_STATE_TTL_MINUTES',
    'TURNSTILE_SITE_KEY',
    'TURNSTILE_SECRET_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_REDIRECT_URI',
    'SECURITY_IP_MAX_ATTEMPTS',
    'SECURITY_ACCOUNT_MAX_ATTEMPTS',
    'VERIFICATION_CODE_EXPIRE_MINUTES',
    'VERIFICATION_CODE_RATE_LIMIT'
  ]
  for (const locale of ['zh-CN', 'zh-TW']) {
    for (const key of fieldKeys) {
      assert.ok(securityMessages[locale][`settings.field.${key}`], `${locale} label ${key}`)
      assert.ok(securityMessages[locale][`settings.desc.${key}`], `${locale} description ${key}`)
    }
  }
})

