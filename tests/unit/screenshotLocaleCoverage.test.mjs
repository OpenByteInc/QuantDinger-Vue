import assert from 'node:assert/strict'
import test from 'node:test'

import reviewedOverrides from '../../src/locales/reviewed-round-two-overrides.js'

const expected = {
  'ja-JP': {
    'quickTrade.workflow.entryProtection': '利確 / 損切を設定',
    'quickTrade.workflow.history': 'ポジション履歴',
    'menu.agentTokens': 'エージェント管理',
    'billing.strategyLimit': '同時実行できるストラテジーは最大 {count} 件',
    'profile.referralRewards.available': '紹介報酬残高',
    'profile.referralRewards.pending': '確定待ち報酬',
    'profile.referralRewards.withdraw': '出金を申請',
    'strategyReviewV2.title': 'ストラテジーレビュー',
    'strategyReviewV2.generate': 'ストラテジーを分析',
    'strategyEvolution.strategySetup': 'ストラテジーを選択',
    'strategyEvolution.emptyTitle': '学習期間外でも有効なパラメーターを探します',
    'strategyEvolution.historyTitle': '研究履歴'
  },
  'ko-KR': {
    'strategyV2.backtest.readyTitle': '소스 코드로 관리되는 백테스트 준비',
    'strategyV2.factorResearch.workspace': '팩터 연구 작업 공간',
    'strategyV2.factorResearch.readyTitle': '시점 일치 팩터 연구 준비',
    'settings.field.BRAND_CONTACT_EMAIL': '고객 지원 이메일',
    'settings.field.BRAND_LEGAL_USER_AGREEMENT_URL': '이용약관 URL',
    'settings.field.MOBILE_APP_DOWNLOAD_URL': '모바일 앱 다운로드 URL',
    'profile.referralRewards.withdraw': '출금 신청',
    'adminReferralWithdrawals.tabTitle': '보상 출금',
    'adminReferralWithdrawals.colAddress': '수령 주소',
    'strategyReviewV2.title': '전략 리뷰',
    'strategyEvolution.strategySetup': '전략 선택',
    'strategyEvolution.emptyTitle': '학습 표본 밖에서도 유효한 매개변수를 찾습니다'
  }
}

for (const [locale, entries] of Object.entries(expected)) {
  test(`${locale} screenshot translations use reviewed copy`, () => {
    for (const [key, value] of Object.entries(entries)) {
      assert.equal(reviewedOverrides[locale][key], value, key)
    }
  })
}

test('reviewed strategy workflow translations preserve placeholders', () => {
  for (const locale of ['ja-JP', 'ko-KR']) {
    assert.match(reviewedOverrides[locale]['strategyEvolution.effectiveBudget'], /\{effective\}/)
    assert.match(reviewedOverrides[locale]['strategyEvolution.effectiveBudget'], /\{requested\}/)
    assert.match(reviewedOverrides[locale]['strategyEvolution.decision.insufficientSample'], /\{minimum\}/)
    assert.match(reviewedOverrides[locale]['strategyReviewV2.window'], /\{days\}/)
  }
})

test('every supported translated locale covers the reported screenshot keys', () => {
  const locales = ['ar-SA', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', 'th-TH', 'vi-VN']
  const keys = [
    'quickTrade.workflow.entryProtection',
    'quickTrade.workflow.history',
    'menu.agentTokens',
    'billing.strategyLimit',
    'profile.referralRewards.available',
    'profile.referralRewards.pending',
    'profile.referralRewards.withdraw',
    'strategyV2.backtest.readyTitle',
    'strategyV2.factorResearch.workspace',
    'strategyV2.factorResearch.readyTitle',
    'strategyReviewV2.title',
    'strategyReviewV2.generate',
    'adminReferralWithdrawals.tabTitle',
    'adminReferralWithdrawals.colAddress',
    'settings.field.BRAND_CONTACT_EMAIL',
    'settings.field.BRAND_LEGAL_USER_AGREEMENT_URL',
    'settings.field.MOBILE_APP_DOWNLOAD_URL',
    'strategyEvolution.strategySetup',
    'strategyEvolution.emptyTitle',
    'strategyEvolution.historyTitle',
    'strategyEvolution.validationEmpty'
  ]

  for (const locale of locales) {
    for (const key of keys) {
      assert.equal(typeof reviewedOverrides[locale][key], 'string', `${locale}: ${key}`)
      assert.notEqual(reviewedOverrides[locale][key].trim(), '', `${locale}: ${key}`)
    }
  }
})
