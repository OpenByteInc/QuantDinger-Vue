const en = {
  'settings.field.ENABLED_TRADING_VENUES': 'Brokers and Exchanges',
  'settings.desc.ENABLED_TRADING_VENUES': 'Choose which live-trading connections are available across account management, quick trading, and automated strategies.',
  'settings.venues.title': 'Venue availability',
  'settings.venues.description': 'Turning off a venue removes it from account selection and blocks new manual or automated orders. Saved credentials remain encrypted and can be used again after re-enabling it.',
  'settings.venues.brokers': 'Stock brokers',
  'settings.venues.crypto': 'Crypto exchanges',
  'settings.venues.enabled': 'Enabled',
  'settings.venues.disabled': 'Disabled',
  'settings.venues.name.alpaca': 'Alpaca Markets',
  'settings.venues.name.ibkr': 'Interactive Brokers',
  'settings.venues.name.tiger': 'Tiger Brokers',
  'settings.venues.name.webull': 'Webull',
  'settings.venues.name.binance': 'Binance',
  'settings.venues.name.okx': 'OKX',
  'settings.venues.name.bybit': 'Bybit',
  'settings.venues.name.bitget': 'Bitget',
  'settings.venues.name.gate': 'Gate.io',
  'settings.venues.name.htx': 'HTX',
  'settings.venues.desc.alpaca': 'Direct OpenAPI for US stocks.',
  'settings.venues.desc.ibkr': 'TWS or IB Gateway connection for global markets.',
  'settings.venues.desc.tiger': 'Direct Tiger OpenAPI for US and Hong Kong stocks.',
  'settings.venues.desc.webull': 'Direct Webull OpenAPI for US stocks.',
  'settings.venues.desc.binance': 'Spot and USD-M futures trading.',
  'settings.venues.desc.okx': 'Spot and perpetual trading.',
  'settings.venues.desc.bybit': 'Spot and derivatives trading.',
  'settings.venues.desc.bitget': 'Spot and perpetual trading.',
  'settings.venues.desc.gate': 'Spot, futures, and supported equity products.',
  'settings.venues.desc.htx': 'Spot and derivatives trading.',
  'brokerAccounts.tradingVenueDisabled': 'This broker is disabled in System Settings.',
  'strategyV2.tradingVenueDisabled': 'This broker or exchange is disabled in System Settings.'
}

const zhCN = {
  ...en,
  'settings.field.ENABLED_TRADING_VENUES': '交易所与券商支持',
  'settings.desc.ENABLED_TRADING_VENUES': '选择系统允许使用的实盘连接，统一影响账户管理、闪电交易与自动化策略。',
  'settings.venues.title': '通道开关说明',
  'settings.venues.description': '关闭通道后，它会从账户选择中隐藏，并停止新的手动与自动化下单；已有凭证仍会加密保留，重新开启即可继续使用。',
  'settings.venues.brokers': '股票券商',
  'settings.venues.crypto': '加密交易所',
  'settings.venues.enabled': '已开启',
  'settings.venues.disabled': '已关闭',
  'settings.venues.name.alpaca': 'Alpaca Markets',
  'settings.venues.name.ibkr': 'Interactive Brokers',
  'settings.venues.name.tiger': '老虎证券',
  'settings.venues.name.webull': 'Webull 微牛',
  'settings.venues.desc.alpaca': '美股 Direct OpenAPI 连接。',
  'settings.venues.desc.ibkr': '通过 TWS 或 IB Gateway 连接全球市场。',
  'settings.venues.desc.tiger': '老虎官方 OpenAPI，支持美股与港股。',
  'settings.venues.desc.webull': '微牛官方 OpenAPI，支持美股。',
  'settings.venues.desc.binance': '现货与 U 本位合约交易。',
  'settings.venues.desc.okx': '现货与永续合约交易。',
  'settings.venues.desc.bybit': '现货与衍生品交易。',
  'settings.venues.desc.bitget': '现货与永续合约交易。',
  'settings.venues.desc.gate': '现货、合约及已支持的证券产品。',
  'settings.venues.desc.htx': '现货与衍生品交易。',
  'brokerAccounts.tradingVenueDisabled': '该券商已在系统设置中关闭。',
  'strategyV2.tradingVenueDisabled': '该券商或交易所已在系统设置中关闭。'
}

const zhTW = {
  ...zhCN,
  'settings.field.ENABLED_TRADING_VENUES': '交易所與券商支援',
  'settings.desc.ENABLED_TRADING_VENUES': '選擇系統允許使用的實盤連線，統一影響帳戶管理、閃電交易與自動化策略。',
  'settings.venues.title': '通道開關說明',
  'settings.venues.description': '關閉通道後，它會從帳戶選擇中隱藏，並停止新的手動與自動化下單；已有憑證仍會加密保留，重新開啟即可繼續使用。',
  'settings.venues.brokers': '股票券商',
  'settings.venues.crypto': '加密交易所',
  'settings.venues.enabled': '已開啟',
  'settings.venues.disabled': '已關閉',
  'brokerAccounts.tradingVenueDisabled': '該券商已在系統設定中關閉。',
  'strategyV2.tradingVenueDisabled': '該券商或交易所已在系統設定中關閉。'
}

const locales = ['ar-SA', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', 'th-TH', 'vi-VN']

export default locales.reduce((messages, locale) => {
  messages[locale] = { ...en }
  return messages
}, {
  'en-US': en,
  'zh-CN': zhCN,
  'zh-TW': zhTW
})
