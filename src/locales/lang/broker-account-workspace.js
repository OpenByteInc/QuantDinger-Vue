const locale = {
  'brokerAccounts.snapshotConnectionFailed': 'Could not connect to the brokerage account. Check its credentials and environment.',
  'brokerAccounts.snapshotPositionsFailed': 'Could not load positions. The account may still hold assets; retry the request.',
  'brokerAccounts.snapshotOrdersFailed': 'Could not load open orders. Existing orders may still be active; retry the request.',
  'brokerAccounts.quoteUnavailable': 'No valid quote is currently available for this instrument. Retry later.',
  'brokerAccounts.commandCenterTitle': 'Account Center',
  'brokerAccounts.commandCenterSubtitle': 'Manage brokerage and crypto exchange connections from one workspace.',
  'brokerAccounts.connectionHealth': 'Connection health',
  'brokerAccounts.allHealthy': 'All connected accounts are healthy',
  'brokerAccounts.connections': 'Accounts & connections',
  'brokerAccounts.tradingAccounts': 'Stock brokers',
  'brokerAccounts.cryptoAccounts': 'Crypto exchanges',
  'brokerAccounts.addAccount': 'Add account',
  'brokerAccounts.addCryptoConnection': 'Add crypto exchange',
  'brokerAccounts.cryptoConnectionHint': 'Connect another venue and expand market coverage.',
  'brokerAccounts.connectedCount': '{count} connected',
  'brokerAccounts.cryptoSection.emptyHint': 'Use Add account in the top right to connect your first exchange.'
}

const zhCN = {
  'brokerAccounts.snapshotConnectionFailed': '无法连接券商账户，请检查凭证与账户环境。',
  'brokerAccounts.snapshotPositionsFailed': '持仓读取失败，账户可能仍有持仓，请重试。',
  'brokerAccounts.snapshotOrdersFailed': '未成交订单读取失败，已有订单可能仍在执行，请重试。',
  'brokerAccounts.quoteUnavailable': '当前无法获取该标的的有效报价，请稍后重试。',
  'brokerAccounts.commandCenterTitle': '账户中心',
  'brokerAccounts.commandCenterSubtitle': '统一管理股票券商与加密交易所连接，实时掌握账户状态。',
  'brokerAccounts.connectionHealth': '整体连接状态',
  'brokerAccounts.allHealthy': '已连接账户全部正常',
  'brokerAccounts.connections': '账户与连接',
  'brokerAccounts.tradingAccounts': '股票券商',
  'brokerAccounts.cryptoAccounts': '加密交易所',
  'brokerAccounts.addAccount': '添加账户',
  'brokerAccounts.addCryptoConnection': '添加加密交易所',
  'brokerAccounts.cryptoConnectionHint': '连接更多交易所，覆盖全球市场。',
  'brokerAccounts.connectedCount': '已连接 {count} 个',
  'brokerAccounts.cryptoSection.emptyHint': '请使用右上角“添加账户”连接第一个交易所。'
}

const zhTW = {
  'brokerAccounts.snapshotConnectionFailed': '無法連接券商帳戶，請檢查憑證與帳戶環境。',
  'brokerAccounts.snapshotPositionsFailed': '持倉讀取失敗，帳戶可能仍有持倉，請重試。',
  'brokerAccounts.snapshotOrdersFailed': '未成交訂單讀取失敗，已有訂單可能仍在執行，請重試。',
  'brokerAccounts.quoteUnavailable': '目前無法取得該標的的有效報價，請稍後重試。',
  'brokerAccounts.commandCenterTitle': '帳戶中心',
  'brokerAccounts.commandCenterSubtitle': '統一管理股票券商與加密交易所連線，即時掌握帳戶狀態。',
  'brokerAccounts.connectionHealth': '整體連線狀態',
  'brokerAccounts.allHealthy': '已連線帳戶全部正常',
  'brokerAccounts.connections': '帳戶與連線',
  'brokerAccounts.tradingAccounts': '股票券商',
  'brokerAccounts.cryptoAccounts': '加密交易所',
  'brokerAccounts.addAccount': '新增帳戶',
  'brokerAccounts.addCryptoConnection': '新增加密交易所',
  'brokerAccounts.cryptoConnectionHint': '連接更多交易所，覆蓋全球市場。',
  'brokerAccounts.connectedCount': '已連線 {count} 個',
  'brokerAccounts.cryptoSection.emptyHint': '請使用右上角「新增帳戶」連線第一個交易所。'
}

const enUSFallback = locale
const locales = ['ar-SA', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', 'th-TH', 'vi-VN']

export default locales.reduce((messages, localeName) => {
  messages[localeName] = { ...enUSFallback }
  return messages
}, {
  'en-US': locale,
  'zh-CN': zhCN,
  'zh-TW': zhTW
})
