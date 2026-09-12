const locale = {
  'trading-assistant.table.instrument': 'Instrument',
  'trading-assistant.fees.pending': 'Unconfirmed'
}

const enUSFallback = locale

export default {
  'en-US': locale,
  'ar-SA': enUSFallback,
  'de-DE': enUSFallback,
  'fr-FR': enUSFallback,
  'ja-JP': enUSFallback,
  'ko-KR': enUSFallback,
  'ru-RU': enUSFallback,
  'th-TH': enUSFallback,
  'vi-VN': enUSFallback,
  'zh-CN': {
    ...enUSFallback,
    'trading-assistant.table.instrument': '交易标的',
    'trading-assistant.fees.pending': '待确认'
  },
  'zh-TW': {
    ...enUSFallback,
    'trading-assistant.table.instrument': '交易標的',
    'trading-assistant.fees.pending': '待確認'
  }
}
