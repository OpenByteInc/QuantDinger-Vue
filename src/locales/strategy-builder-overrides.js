const en = {
  setupTitle: 'Strategy setup', setupDescription: 'Choose an instrument from your watchlist or search. Its market is detected automatically.',
  market: 'Market', exchange: 'Exchange', product: 'Product', symbol: 'Instrument', symbolPlaceholder: 'Search an instrument',
  timeframe: 'Timeframe', direction: 'Direction', spot: 'Spot', swap: 'Perpetual', long: 'Long', short: 'Short', both: 'Long & short',
  spotLongOnly: 'Spot strategies are long-only. Leverage is fixed at 1x.', parametersTitle: 'Strategy parameters',
  parametersDescription: 'These values are saved with the strategy and reused by backtests and live creation.',
  sourceContractHint: 'Instrument, product, and timeframe come from the saved strategy contract.',
  params: {
    target_pct: { label: 'Capital to use', description: '95% means the strategy targets 95% of its capital after entry and keeps 5% for fees and execution differences. Perpetual leverage is calculated separately.' },
    allow_short: { label: 'Allow short positions', description: 'Applies to perpetual contracts. Spot strategies remain long-only.' }
  }
}

const zhCN = {
  setupTitle: '策略设置', setupDescription: '从自选列表选择或搜索交易标的，系统会自动识别市场并同步策略代码。',
  market: '市场', exchange: '交易所', product: '交易品种', symbol: '交易标的', symbolPlaceholder: '搜索交易标的',
  timeframe: 'K 线周期', direction: '交易方向', spot: '现货', swap: '永续合约', long: '只做多', short: '只做空', both: '多空双向',
  spotLongOnly: '现货策略只能做多，杠杆固定为 1 倍。', parametersTitle: '策略参数',
  parametersDescription: '这些参数会随策略保存，并在回测与创建实盘时继续使用。',
  sourceContractHint: '交易标的、品种和周期来自已保存的策略契约。',
  params: {
    target_pct: { label: '资金使用比例', description: '例如 95% 表示入场后使用该策略资金的 95%，剩余 5% 用于手续费和成交偏差；合约杠杆另行计算。' },
    allow_short: { label: '允许做空', description: '仅适用于永续合约；现货策略始终只能做多。' }
  }
}

const locale = (setupTitle, setupDescription, labels, hint, params) => ({
  setupTitle,
  setupDescription,
  market: labels[0], exchange: labels[1], product: labels[2], symbol: labels[3], symbolPlaceholder: labels[4],
  timeframe: labels[5], direction: labels[6], spot: labels[7], swap: labels[8], long: labels[9], short: labels[10], both: labels[11],
  spotLongOnly: hint[0], parametersTitle: hint[1], parametersDescription: hint[2], sourceContractHint: hint[3],
  params
})

const protectionParams = {
  'en-US': {
    stop_loss_pct: { label: 'Stop loss', description: 'Close the position when the loss reaches this percentage.' },
    stop_loss_price: { label: 'Stop-loss price', description: 'Close the position when this absolute price is reached.' },
    take_profit_pct: { label: 'Take profit', description: 'Close the position when the profit reaches this percentage.' },
    take_profit_price: { label: 'Take-profit price', description: 'Close the position when this absolute price is reached.' },
    trailing_stop_pct: { label: 'Trailing stop distance', description: 'Distance from the best price used by the trailing stop.' },
    trailing_stop_points: { label: 'Trailing stop points', description: 'Absolute price distance from the best price used by the trailing stop.' },
    trailing_activation_pct: { label: 'Trailing stop activation', description: 'Profit required before the trailing stop starts following price.' },
    trailing_activation_points: { label: 'Trailing activation points', description: 'Absolute favorable price movement required before trailing starts.' },
    exit_fraction: { label: 'Protection exit fraction', description: 'Default position fraction closed by a protection trigger. 0.4 closes 40%.' },
    stop_loss_exit_fraction: { label: 'Stop-loss exit fraction', description: 'Position fraction closed by stop loss; set to 0 to inherit the default protection fraction.' },
    take_profit_exit_fraction: { label: 'Take-profit exit fraction', description: 'Position fraction closed by take profit; set to 0 to inherit the default protection fraction.' },
    trailing_exit_fraction: { label: 'Trailing-stop exit fraction', description: 'Position fraction closed by trailing stop; set to 0 to inherit the default protection fraction.' },
    time_limit_exit_fraction: { label: 'Time-limit exit fraction', description: 'Position fraction closed by the holding-time limit; set to 0 to inherit the default protection fraction.' },
    trailing_enabled: { label: 'Enable trailing stop', description: 'Use a trailing stop to protect gains after activation.' },
    max_holding_bars: { label: 'Maximum holding bars', description: 'Close the position after this many bars. Set to 0 to disable.' },
    time_limit_seconds: { label: 'Maximum holding time', description: 'Close the position after this many seconds. Set to 0 to disable.' }
  },
  'zh-CN': {
    stop_loss_pct: { label: '止损比例', description: '亏损达到该比例时平仓。' },
    stop_loss_price: { label: '止损价格', description: '价格达到该绝对价位时触发止损。' },
    take_profit_pct: { label: '止盈比例', description: '盈利达到该比例时平仓。' },
    take_profit_price: { label: '止盈价格', description: '价格达到该绝对价位时触发止盈。' },
    trailing_stop_pct: { label: '移动止损距离', description: '移动止损价格与持仓期间最优价格之间的回撤比例。' },
    trailing_stop_points: { label: '移动止损点数', description: '移动止损价格与持仓期间最优价格之间的绝对价差。' },
    trailing_activation_pct: { label: '移动止损启动比例', description: '盈利达到该比例后开始跟踪价格。' },
    trailing_activation_points: { label: '移动止损启动点数', description: '价格向盈利方向移动该绝对点数后开始跟踪。' },
    exit_fraction: { label: '保护退出比例', description: '保护条件触发时默认退出的仓位比例，例如 0.4 表示退出 40%。' },
    stop_loss_exit_fraction: { label: '止损退出比例', description: '止损触发时退出的仓位比例；设为 0 时继承保护退出比例。' },
    take_profit_exit_fraction: { label: '止盈退出比例', description: '止盈触发时退出的仓位比例；设为 0 时继承保护退出比例。' },
    trailing_exit_fraction: { label: '移动止损退出比例', description: '移动止损触发时退出的仓位比例；设为 0 时继承保护退出比例。' },
    time_limit_exit_fraction: { label: '到期退出比例', description: '最大持仓时间触发时退出的仓位比例；设为 0 时继承保护退出比例。' },
    trailing_enabled: { label: '启用移动止损', description: '启动后使用移动止损保护已有盈利。' },
    max_holding_bars: { label: '最大持仓 K 线数', description: '持仓达到该 K 线数量后平仓，设置为 0 表示不限制。' },
    time_limit_seconds: { label: '最大持仓时间', description: '持仓达到该秒数后平仓，设置为 0 表示不限制。' }
  },
  'zh-TW': {
    stop_loss_pct: { label: '停損比例', description: '虧損達到此比例時平倉。' },
    stop_loss_price: { label: '停損價格', description: '價格達到此絕對價位時觸發停損。' },
    take_profit_pct: { label: '停利比例', description: '獲利達到此比例時平倉。' },
    take_profit_price: { label: '停利價格', description: '價格達到此絕對價位時觸發停利。' },
    trailing_stop_pct: { label: '移動停損距離', description: '移動停損價格與持倉期間最佳價格之間的回撤比例。' },
    trailing_stop_points: { label: '移動停損點數', description: '移動停損價格與持倉期間最佳價格之間的絕對價差。' },
    trailing_activation_pct: { label: '移動停損啟動比例', description: '獲利達到此比例後開始追蹤價格。' },
    trailing_activation_points: { label: '移動停損啟動點數', description: '價格向獲利方向移動此絕對點數後開始追蹤。' },
    exit_fraction: { label: '保護退出比例', description: '保護條件觸發時預設退出的倉位比例，例如 0.4 表示退出 40%。' },
    stop_loss_exit_fraction: { label: '停損退出比例', description: '停損觸發時退出的倉位比例；設為 0 時沿用保護退出比例。' },
    take_profit_exit_fraction: { label: '停利退出比例', description: '停利觸發時退出的倉位比例；設為 0 時沿用保護退出比例。' },
    trailing_exit_fraction: { label: '移動停損退出比例', description: '移動停損觸發時退出的倉位比例；設為 0 時沿用保護退出比例。' },
    time_limit_exit_fraction: { label: '到期退出比例', description: '最大持倉時間觸發時退出的倉位比例；設為 0 時沿用保護退出比例。' },
    trailing_enabled: { label: '啟用移動停損', description: '啟動後使用移動停損保護既有獲利。' },
    max_holding_bars: { label: '最大持倉 K 線數', description: '持倉達到此 K 線數量後平倉，設為 0 表示不限制。' },
    time_limit_seconds: { label: '最大持倉時間', description: '持倉達到此秒數後平倉，設為 0 表示不限制。' }
  },
  'de-DE': {
    stop_loss_pct: { label: 'Stop-Loss', description: 'Schließt die Position, wenn der Verlust diesen Prozentsatz erreicht.' },
    take_profit_pct: { label: 'Take-Profit', description: 'Schließt die Position, wenn der Gewinn diesen Prozentsatz erreicht.' },
    trailing_stop_pct: { label: 'Trailing-Stop-Abstand', description: 'Abstand zum besten Kurs, den der Trailing-Stop verwendet.' },
    trailing_activation_pct: { label: 'Trailing-Stop-Aktivierung', description: 'Erforderlicher Gewinn, bevor der Trailing-Stop dem Kurs folgt.' },
    trailing_enabled: { label: 'Trailing-Stop aktivieren', description: 'Schützt Gewinne nach der Aktivierung mit einem Trailing-Stop.' },
    max_holding_bars: { label: 'Maximale Haltedauer in Kerzen', description: 'Schließt die Position nach dieser Anzahl von Kerzen. 0 deaktiviert das Limit.' },
    time_limit_seconds: { label: 'Maximale Haltedauer', description: 'Schließt die Position nach dieser Anzahl von Sekunden. 0 deaktiviert das Limit.' }
  },
  'fr-FR': {
    stop_loss_pct: { label: 'Stop-loss', description: 'Ferme la position lorsque la perte atteint ce pourcentage.' },
    take_profit_pct: { label: 'Take-profit', description: 'Ferme la position lorsque le gain atteint ce pourcentage.' },
    trailing_stop_pct: { label: 'Distance du stop suiveur', description: 'Écart par rapport au meilleur prix utilisé par le stop suiveur.' },
    trailing_activation_pct: { label: 'Activation du stop suiveur', description: 'Gain requis avant que le stop suiveur commence à suivre le prix.' },
    trailing_enabled: { label: 'Activer le stop suiveur', description: 'Protège les gains avec un stop suiveur après son activation.' },
    max_holding_bars: { label: 'Nombre maximal de bougies', description: 'Ferme la position après ce nombre de bougies. 0 désactive la limite.' },
    time_limit_seconds: { label: 'Durée maximale de détention', description: 'Ferme la position après ce nombre de secondes. 0 désactive la limite.' }
  },
  'ja-JP': {
    stop_loss_pct: { label: '損切り率', description: '損失がこの割合に達した時点でポジションを決済します。' },
    take_profit_pct: { label: '利確率', description: '利益がこの割合に達した時点でポジションを決済します。' },
    trailing_stop_pct: { label: 'トレーリングストップ幅', description: '保有中の最良価格からの逆行幅です。' },
    trailing_activation_pct: { label: 'トレーリング開始率', description: 'この利益率に達すると価格の追跡を開始します。' },
    trailing_enabled: { label: 'トレーリングストップを有効化', description: '開始後にトレーリングストップで利益を保護します。' },
    max_holding_bars: { label: '最大保有バー数', description: 'このバー数に達すると決済します。0 で無効になります。' },
    time_limit_seconds: { label: '最大保有時間', description: 'この秒数に達すると決済します。0 で無効になります。' }
  },
  'ko-KR': {
    stop_loss_pct: { label: '손절 비율', description: '손실이 이 비율에 도달하면 포지션을 청산합니다.' },
    take_profit_pct: { label: '익절 비율', description: '수익이 이 비율에 도달하면 포지션을 청산합니다.' },
    trailing_stop_pct: { label: '트레일링 스톱 거리', description: '보유 중 최적 가격에서 허용하는 되돌림 비율입니다.' },
    trailing_activation_pct: { label: '트레일링 스톱 시작 비율', description: '수익이 이 비율에 도달하면 가격 추적을 시작합니다.' },
    trailing_enabled: { label: '트레일링 스톱 사용', description: '시작 후 트레일링 스톱으로 수익을 보호합니다.' },
    max_holding_bars: { label: '최대 보유 봉 수', description: '이 봉 수에 도달하면 청산합니다. 0은 제한 없음입니다.' },
    time_limit_seconds: { label: '최대 보유 시간', description: '이 초에 도달하면 청산합니다. 0은 제한 없음입니다.' }
  },
  'ru-RU': {
    stop_loss_pct: { label: 'Стоп-лосс', description: 'Закрывает позицию, когда убыток достигает указанного процента.' },
    take_profit_pct: { label: 'Тейк-профит', description: 'Закрывает позицию, когда прибыль достигает указанного процента.' },
    trailing_stop_pct: { label: 'Дистанция трейлинг-стопа', description: 'Допустимый откат от лучшей цены за время удержания позиции.' },
    trailing_activation_pct: { label: 'Активация трейлинг-стопа', description: 'Прибыль, необходимая для начала сопровождения цены.' },
    trailing_enabled: { label: 'Включить трейлинг-стоп', description: 'Защищает прибыль трейлинг-стопом после активации.' },
    max_holding_bars: { label: 'Максимум баров удержания', description: 'Закрывает позицию после указанного числа баров. 0 отключает ограничение.' },
    time_limit_seconds: { label: 'Максимальное время удержания', description: 'Закрывает позицию после указанного числа секунд. 0 отключает ограничение.' }
  },
  'th-TH': {
    stop_loss_pct: { label: 'สัดส่วนหยุดขาดทุน', description: 'ปิดสถานะเมื่อขาดทุนถึงสัดส่วนนี้' },
    take_profit_pct: { label: 'สัดส่วนทำกำไร', description: 'ปิดสถานะเมื่อกำไรถึงสัดส่วนนี้' },
    trailing_stop_pct: { label: 'ระยะ Trailing Stop', description: 'สัดส่วนการย่อตัวจากราคาที่ดีที่สุดระหว่างถือสถานะ' },
    trailing_activation_pct: { label: 'จุดเริ่ม Trailing Stop', description: 'เริ่มติดตามราคาเมื่อกำไรถึงสัดส่วนนี้' },
    trailing_enabled: { label: 'เปิดใช้ Trailing Stop', description: 'ใช้ Trailing Stop เพื่อปกป้องกำไรหลังเริ่มทำงาน' },
    max_holding_bars: { label: 'จำนวนแท่งสูงสุดที่ถือ', description: 'ปิดสถานะเมื่อครบจำนวนแท่งนี้ ตั้งเป็น 0 เพื่อปิดข้อจำกัด' },
    time_limit_seconds: { label: 'เวลาถือสูงสุด', description: 'ปิดสถานะเมื่อครบจำนวนวินาทีนี้ ตั้งเป็น 0 เพื่อปิดข้อจำกัด' }
  },
  'vi-VN': {
    stop_loss_pct: { label: 'Tỷ lệ cắt lỗ', description: 'Đóng vị thế khi mức lỗ đạt tỷ lệ này.' },
    take_profit_pct: { label: 'Tỷ lệ chốt lời', description: 'Đóng vị thế khi mức lời đạt tỷ lệ này.' },
    trailing_stop_pct: { label: 'Khoảng cách dừng lỗ động', description: 'Tỷ lệ thoái lui từ mức giá tốt nhất trong thời gian giữ vị thế.' },
    trailing_activation_pct: { label: 'Kích hoạt dừng lỗ động', description: 'Bắt đầu bám theo giá khi lợi nhuận đạt tỷ lệ này.' },
    trailing_enabled: { label: 'Bật dừng lỗ động', description: 'Dùng dừng lỗ động để bảo vệ lợi nhuận sau khi kích hoạt.' },
    max_holding_bars: { label: 'Số nến giữ tối đa', description: 'Đóng vị thế sau số nến này. Đặt 0 để tắt giới hạn.' },
    time_limit_seconds: { label: 'Thời gian giữ tối đa', description: 'Đóng vị thế sau số giây này. Đặt 0 để tắt giới hạn.' }
  },
  'ar-SA': {
    stop_loss_pct: { label: 'نسبة إيقاف الخسارة', description: 'إغلاق المركز عندما تصل الخسارة إلى هذه النسبة.' },
    take_profit_pct: { label: 'نسبة جني الأرباح', description: 'إغلاق المركز عندما يصل الربح إلى هذه النسبة.' },
    trailing_stop_pct: { label: 'مسافة الإيقاف المتحرك', description: 'نسبة التراجع عن أفضل سعر أثناء الاحتفاظ بالمركز.' },
    trailing_activation_pct: { label: 'تفعيل الإيقاف المتحرك', description: 'بدء تتبع السعر عندما يصل الربح إلى هذه النسبة.' },
    trailing_enabled: { label: 'تفعيل الإيقاف المتحرك', description: 'استخدام الإيقاف المتحرك لحماية الأرباح بعد التفعيل.' },
    max_holding_bars: { label: 'الحد الأقصى لشموع الاحتفاظ', description: 'إغلاق المركز بعد هذا العدد من الشموع. القيمة 0 تلغي الحد.' },
    time_limit_seconds: { label: 'الحد الأقصى لمدة الاحتفاظ', description: 'إغلاق المركز بعد هذا العدد من الثواني. القيمة 0 تلغي الحد.' }
  }
}

const protectionParamAliases = {
  stopLossPct: 'stop_loss_pct',
  stopLossPrice: 'stop_loss_price',
  takeProfitPct: 'take_profit_pct',
  takeProfitPrice: 'take_profit_price',
  trailingStopPct: 'trailing_stop_pct',
  trailingStopPoints: 'trailing_stop_points',
  trailingActivationPct: 'trailing_activation_pct',
  trailingActivationPoints: 'trailing_activation_points',
  exitFraction: 'exit_fraction',
  stopLossExitFraction: 'stop_loss_exit_fraction',
  takeProfitExitFraction: 'take_profit_exit_fraction',
  trailingExitFraction: 'trailing_exit_fraction',
  timeLimitExitFraction: 'time_limit_exit_fraction',
  trailingEnabled: 'trailing_enabled',
  maxHoldingBars: 'max_holding_bars',
  timeLimitSeconds: 'time_limit_seconds'
}

function withProtectionParams (lang, messages) {
  const localized = {
    ...protectionParams['en-US'],
    ...(protectionParams[lang] || {})
  }
  const aliases = Object.keys(protectionParamAliases).reduce((result, alias) => {
    result[alias] = localized[protectionParamAliases[alias]]
    return result
  }, {})
  return {
    ...messages,
    params: {
      ...localized,
      ...aliases,
      ...(messages.params || {})
    }
  }
}

const messages = {
  'en-US': { strategyBuilder: en },
  'zh-CN': { strategyBuilder: zhCN },
  'zh-TW': { strategyBuilder: locale('策略設定', '選擇此單一標的策略使用的市場環境，系統會同步更新策略程式碼。', ['市場', '交易所', '交易品種', '交易標的', '搜尋交易標的', 'K 線週期', '交易方向', '現貨', '永續合約', '只做多', '只做空', '多空雙向'], ['現貨策略只能做多，槓桿固定為 1 倍。', '策略參數', '這些參數會隨策略儲存，並在回測與建立實盤時繼續使用。', '交易標的、品種和週期來自已儲存的策略契約。'], { target_pct: { label: '資金使用比例', description: '例如 95% 表示進場後使用該策略資金的 95%，其餘 5% 預留給手續費和成交差異；合約槓桿另行計算。' }, allow_short: { label: '允許做空', description: '僅適用於永續合約；現貨策略始終只能做多。' } }) },
  'de-DE': { strategyBuilder: locale('Strategie einrichten', 'Wählen Sie den Marktkontext für diese Einzelinstrument-Strategie.', ['Markt', 'Börse', 'Produkt', 'Instrument', 'Instrument suchen', 'Zeitrahmen', 'Richtung', 'Spot', 'Perpetual', 'Long', 'Short', 'Long & Short'], ['Spot-Strategien sind nur Long; der Hebel ist 1x.', 'Strategieparameter', 'Diese Werte werden gespeichert und für Backtests und Live-Erstellung wiederverwendet.', 'Instrument, Produkt und Zeitraum stammen aus dem gespeicherten Strategievertrag.'], { target_pct: { label: 'Kapitaleinsatz', description: '95 % bedeutet, dass die Strategie 95 % ihres Kapitals einsetzt und 5 % für Gebühren und Ausführungsabweichungen zurückhält. Der Hebel wird separat berechnet.' }, allow_short: { label: 'Short-Positionen erlauben', description: 'Gilt für Perpetual-Kontrakte; Spot bleibt nur Long.' } }) },
  'fr-FR': { strategyBuilder: locale('Configuration de la stratégie', 'Choisissez le contexte de marché de cette stratégie mono-instrument.', ['Marché', 'Plateforme', 'Produit', 'Instrument', 'Rechercher un instrument', 'Période', 'Direction', 'Spot', 'Perpétuel', 'Long', 'Short', 'Long et short'], ['Les stratégies spot sont uniquement longues, avec un levier de 1x.', 'Paramètres de stratégie', 'Ces valeurs sont enregistrées et réutilisées pour le backtest et le lancement réel.', 'L’instrument, le produit et la période proviennent du contrat enregistré.'], { target_pct: { label: 'Capital utilisé', description: '95 % signifie que la stratégie utilise 95 % de son capital et conserve 5 % pour les frais et les écarts d’exécution. Le levier est calculé séparément.' }, allow_short: { label: 'Autoriser les positions short', description: 'Valable pour les contrats perpétuels ; le spot reste long uniquement.' } }) },
  'ja-JP': { strategyBuilder: locale('戦略設定', '単一銘柄戦略で使用する市場条件を選択します。', ['市場', '取引所', '商品', '銘柄', '銘柄を検索', '時間足', '方向', '現物', '無期限', 'ロング', 'ショート', '両方向'], ['現物戦略はロングのみで、レバレッジは1倍です。', '戦略パラメータ', 'これらの値は戦略と共に保存され、バックテストと実運用作成で再利用されます。', '銘柄、商品、時間足は保存済みの戦略契約から取得します。'], { target_pct: { label: '資金使用率', description: '95% は戦略資金の 95% を使用し、5% を手数料や約定差のために残す設定です。無期限契約のレバレッジは別に計算されます。' }, allow_short: { label: 'ショートを許可', description: '無期限契約のみ。現物はロングのみです。' } }) },
  'ko-KR': { strategyBuilder: locale('전략 설정', '단일 종목 전략에 사용할 시장 환경을 선택하세요.', ['시장', '거래소', '상품', '종목', '종목 검색', '시간 주기', '방향', '현물', '무기한', '롱', '숏', '양방향'], ['현물 전략은 롱만 가능하며 레버리지는 1배입니다.', '전략 매개변수', '이 값은 전략과 함께 저장되어 백테스트와 실거래 생성에 재사용됩니다.', '종목, 상품, 주기는 저장된 전략 계약에서 가져옵니다.'], { target_pct: { label: '자금 사용 비율', description: '95%는 전략 자금의 95%를 사용하고 수수료와 체결 오차를 위해 5%를 남긴다는 뜻입니다. 무기한 계약 레버리지는 별도로 계산됩니다.' }, allow_short: { label: '숏 허용', description: '무기한 계약에만 적용되며 현물은 롱만 가능합니다.' } }) },
  'ru-RU': { strategyBuilder: locale('Настройка стратегии', 'Выберите рыночный контекст для стратегии одного инструмента.', ['Рынок', 'Биржа', 'Продукт', 'Инструмент', 'Поиск инструмента', 'Таймфрейм', 'Направление', 'Спот', 'Бессрочный', 'Лонг', 'Шорт', 'Лонг и шорт'], ['Спотовые стратегии работают только в лонг с плечом 1x.', 'Параметры стратегии', 'Значения сохраняются и используются в бэктесте и при запуске.', 'Инструмент, продукт и таймфрейм берутся из сохранённого контракта стратегии.'], { target_pct: { label: 'Использование капитала', description: '95% означает использование 95% капитала стратегии с резервом 5% на комиссии и отклонения исполнения. Плечо рассчитывается отдельно.' }, allow_short: { label: 'Разрешить шорт', description: 'Только для бессрочных контрактов; спот остаётся только лонг.' } }) },
  'th-TH': { strategyBuilder: locale('ตั้งค่ากลยุทธ์', 'เลือกบริบทตลาดสำหรับกลยุทธ์ตราสารเดียวนี้', ['ตลาด', 'ตลาดซื้อขาย', 'ผลิตภัณฑ์', 'ตราสาร', 'ค้นหาตราสาร', 'กรอบเวลา', 'ทิศทาง', 'สปอต', 'สัญญาถาวร', 'ซื้อ', 'ขาย', 'สองทาง'], ['กลยุทธ์สปอตเปิดได้เฉพาะฝั่งซื้อและเลเวอเรจ 1x', 'พารามิเตอร์กลยุทธ์', 'ค่าเหล่านี้จะถูกบันทึกและนำไปใช้กับการทดสอบย้อนหลังและการสร้างไลฟ์', 'ตราสาร ผลิตภัณฑ์ และกรอบเวลามาจากสัญญากลยุทธ์ที่บันทึกไว้'], { target_pct: { label: 'สัดส่วนเงินทุนที่ใช้', description: '95% หมายถึงใช้เงินทุนของกลยุทธ์ 95% และสำรอง 5% สำหรับค่าธรรมเนียมและความคลาดเคลื่อนในการส่งคำสั่ง ส่วนเลเวอเรจคำนวณแยกต่างหาก' }, allow_short: { label: 'อนุญาตฝั่งขาย', description: 'ใช้กับสัญญาถาวรเท่านั้น; สปอตเปิดได้เฉพาะฝั่งซื้อ' } }) },
  'vi-VN': { strategyBuilder: locale('Thiết lập chiến lược', 'Chọn bối cảnh thị trường cho chiến lược một mã này.', ['Thị trường', 'Sàn', 'Sản phẩm', 'Mã giao dịch', 'Tìm mã giao dịch', 'Khung thời gian', 'Hướng', 'Giao ngay', 'Vĩnh cửu', 'Mua', 'Bán', 'Hai chiều'], ['Chiến lược giao ngay chỉ mua và đòn bẩy cố định 1x.', 'Tham số chiến lược', 'Các giá trị được lưu và dùng lại khi kiểm thử và tạo giao dịch thật.', 'Mã, sản phẩm và khung thời gian lấy từ hợp đồng chiến lược đã lưu.'], { target_pct: { label: 'Tỷ lệ vốn sử dụng', description: '95% nghĩa là chiến lược dùng 95% vốn và giữ lại 5% cho phí cùng sai lệch khớp lệnh. Đòn bẩy hợp đồng được tính riêng.' }, allow_short: { label: 'Cho phép bán khống', description: 'Chỉ áp dụng cho hợp đồng vĩnh cửu; giao ngay chỉ mua.' } }) },
  'ar-SA': { strategyBuilder: locale('إعداد الاستراتيجية', 'اختر سياق السوق لهذه الاستراتيجية ذات الأداة الواحدة.', ['السوق', 'المنصة', 'المنتج', 'الأداة', 'البحث عن أداة', 'الإطار الزمني', 'الاتجاه', 'فوري', 'دائم', 'شراء', 'بيع', 'الاتجاهان'], ['استراتيجيات السوق الفوري للشراء فقط والرافعة 1x.', 'معلمات الاستراتيجية', 'تُحفظ هذه القيم وتُستخدم في الاختبار وإنشاء التداول المباشر.', 'تأتي الأداة والمنتج والإطار الزمني من عقد الاستراتيجية المحفوظ.'], { target_pct: { label: 'نسبة رأس المال المستخدم', description: 'تعني 95% استخدام 95% من رأس مال الاستراتيجية مع إبقاء 5% للرسوم وفروق التنفيذ. تُحسب الرافعة للعقود بشكل منفصل.' }, allow_short: { label: 'السماح بالبيع', description: 'للعقود الدائمة فقط؛ السوق الفوري للشراء فقط.' } }) }
}

export default Object.keys(messages).reduce((result, lang) => {
  result[lang] = {
    ...messages[lang],
    strategyBuilder: withProtectionParams(lang, messages[lang].strategyBuilder)
  }
  return result
}, {})
