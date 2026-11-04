import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import messages from '../../src/locales/referral-reward-overrides.js'

const settingsSource = readFileSync(new URL('../../src/views/settings/index.vue', import.meta.url), 'utf8')
const profileSource = readFileSync(new URL('../../src/views/profile/index.vue', import.meta.url), 'utf8')
const userManageSource = readFileSync(new URL('../../src/views/user-manage/index.vue', import.meta.url), 'utf8')
const billingApiSource = readFileSync(new URL('../../src/api/billing.js', import.meta.url), 'utf8')

const supportedLocales = [
  'ar-SA',
  'de-DE',
  'en-US',
  'fr-FR',
  'ja-JP',
  'ko-KR',
  'ru-RU',
  'th-TH',
  'vi-VN',
  'zh-CN',
  'zh-TW'
]

test('referral rate settings expose and enforce the three-level limit', () => {
  assert.match(settingsSource, /settings\.referralActivity\.maxThreeLevels/)
  assert.match(settingsSource, /@input="limitReferralRewardRates"/)
  assert.match(settingsSource, /tokens\.filter\(Boolean\)\.slice\(0, 3\)/)
  assert.match(settingsSource, /tokens\.length > 3/)
  assert.match(settingsSource, /color: var\(--qd-text-muted, #6b7280\) !important/)
})

test('billing settings keep receiving addresses editable and hide fixed token identifiers', () => {
  const start = settingsSource.indexOf('billingSectionDefinitions ()')
  const end = settingsSource.indexOf('dataSourceSectionDefinitions ()', start)
  const block = settingsSource.slice(start, end)

  for (const key of [
    'USDT_TRC20_ADDRESS',
    'USDT_BEP20_ADDRESS',
    'USDT_ERC20_ADDRESS',
    'USDT_SOL_ADDRESS',
    'USDC_ERC20_ADDRESS',
    'USDC_SOL_ADDRESS'
  ]) {
    assert.match(block, new RegExp(key))
  }
  for (const key of [
    'USDT_TRC20_CONTRACT',
    'USDT_BEP20_CONTRACT',
    'USDT_ERC20_CONTRACT',
    'USDT_SOL_MINT',
    'USDC_ERC20_CONTRACT',
    'USDC_SOL_MINT'
  ]) {
    assert.doesNotMatch(block, new RegExp(key))
  }
  assert.match(settingsSource, /fixedTokenIdentifierKeys/)
  assert.match(settingsSource, /!fixedTokenIdentifierKeys\.has\(item\.key\)/)
  assert.match(settingsSource, /if \(item\.readonly\) continue/)
  assert.match(settingsSource, /:disabled="entry\.item\.readonly"/)
})

test('brand identity shows every field without an advanced fold', () => {
  assert.match(settingsSource, /if \(this\.activeGroupKey === 'brand'\)/)
  assert.match(settingsSource, /key: `brand-\$\{item\.key\}`/)
  assert.match(settingsSource, /background: #121212/)
  assert.doesNotMatch(settingsSource, /background: #11151a/)
})

test('referral activity reveals dependent settings only when enabled', () => {
  assert.match(settingsSource, /v-if="referralProgramEnabled"/)
  assert.match(settingsSource, /@change="referralProgramEnabled = \$event"/)
  assert.match(settingsSource, /settings\.referralActivity\.disabledHint/)
})

test('persisted membership plans use the delete endpoint', () => {
  assert.match(settingsSource, /deleteAdminMembershipPlan\(plan\.code\)/)
  assert.match(billingApiSource, /method: 'delete'/)
  assert.match(settingsSource, /cannot_delete_last_active_plan/)
})

test('profile referral records use three tabs and surface the membership reward', () => {
  assert.match(profileSource, /profile\.referralRewards\.membershipRewardHint/)
  assert.match(profileSource, /referralRecordTab/)
  assert.match(profileSource, /key="promotions"/)
  assert.match(profileSource, /key="rewards"/)
  assert.match(profileSource, /key="withdrawals"/)
  assert.match(profileSource, /withdrawalCurrencies/)
  assert.match(profileSource, /withdrawalChains/)
  assert.match(profileSource, /handleRewardWithdrawalCurrencyChange/)
})

test('withdrawal management exposes summary cards and referral copy covers every locale', () => {
  assert.match(userManageSource, /rewardWithdrawalSummary\.total_requests/)
  assert.match(userManageSource, /rewardWithdrawalSummary\.pending_amount/)
  assert.match(userManageSource, /rewardWithdrawalSummary\.processing_requests/)
  assert.match(userManageSource, /rewardWithdrawalSummary\.paid_amount/)

  for (const locale of supportedLocales) {
    assert.ok(messages[locale], `Missing locale: ${locale}`)
    assert.ok(messages[locale]['profile.referralRewards.membershipRewardHint'])
    assert.ok(messages[locale]['profile.referralRewards.promotionRecords'])
    assert.ok(messages[locale]['profile.referralRewards.rewardRecords'])
    assert.ok(messages[locale]['profile.referralRewards.withdrawalRecords'])
    assert.ok(messages[locale]['profile.referralRewards.currency'])
    assert.ok(messages[locale]['profile.referralRewards.network'])
  }
})
