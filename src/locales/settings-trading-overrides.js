const keys = [
  'settings.trading.executionSection',
  'settings.trading.executionSectionDesc',
  'settings.trading.executionBadge',
  'settings.field.MAKER_WAIT_SEC',
  'settings.desc.MAKER_WAIT_SEC',
  'settings.field.MAKER_OFFSET_BPS',
  'settings.desc.MAKER_OFFSET_BPS'
]

function messages (values) {
  return Object.fromEntries(keys.map((key, index) => [key, values[index]]))
}

const translations = {
  'en-US': messages([
    'Maker order defaults', 'Used only when an order selects maker-then-market without its own values. Strategy and order settings take priority; restart the trading worker after saving.', 'Strategy setting wins',
    'Maker-to-market wait (seconds)', 'How long a maker limit order waits before it is cancelled and replaced by a market order.',
    'Maker price offset (bps)', 'Limit-price distance from the reference price. Buy orders move lower and sell orders move higher.'
  ]),
  'zh-CN': messages([
    'Maker 订单默认值', '仅在订单选择“Maker 后转市价”且未单独传值时使用。策略和单次订单配置优先；保存后需重启交易 Worker。', '策略配置优先',
    'Maker 转市价等待时间（秒）', 'Maker 限价单等待成交的时间；超时后撤单并改用市价单。',
    'Maker 价格偏移（基点）', '限价相对参考价的偏移。买单向下偏移，卖单向上偏移。'
  ]),
  'zh-TW': messages([
    'Maker 訂單預設值', '僅在訂單選擇「Maker 後轉市價」且未個別傳值時使用。策略與單筆訂單設定優先；儲存後需重新啟動交易 Worker。', '策略設定優先',
    'Maker 轉市價等待時間（秒）', 'Maker 限價單等待成交的時間；逾時後撤單並改用市價單。',
    'Maker 價格偏移（基點）', '限價相對參考價的偏移。買單向下偏移，賣單向上偏移。'
  ]),
  'ja-JP': messages([
    'Maker注文の既定値', '注文がMaker後成行を選び、個別値がない場合のみ使用します。戦略と注文の設定が優先され、保存後は取引Workerの再起動が必要です。', '戦略設定を優先',
    'Makerから成行への待機時間（秒）', 'Maker指値注文を待機し、時間切れ後に取消して成行注文へ切り替えるまでの時間です。',
    'Maker価格オフセット（bps）', '基準価格からの指値距離です。買いは低く、売りは高く設定されます。'
  ]),
  'ko-KR': messages([
    'Maker 주문 기본값', '주문이 Maker 후 시장가를 선택하고 자체 값이 없을 때만 사용합니다. 전략 및 주문 설정이 우선하며 저장 후 거래 Worker를 다시 시작해야 합니다.', '전략 설정 우선',
    'Maker에서 시장가 전환 대기(초)', 'Maker 지정가 주문을 기다린 뒤 취소하고 시장가 주문으로 전환하는 시간입니다.',
    'Maker 가격 오프셋(bps)', '기준 가격과 지정가 사이의 거리입니다. 매수는 낮게, 매도는 높게 조정됩니다.'
  ]),
  'de-DE': messages([
    'Maker-Order-Standardwerte', 'Nur verwendet, wenn eine Order Maker-dann-Market ohne eigene Werte auswählt. Strategie- und Orderwerte haben Vorrang; danach den Trading-Worker neu starten.', 'Strategie hat Vorrang',
    'Wartezeit bis Market (Sekunden)', 'Wartezeit einer Maker-Limit-Order, bevor sie storniert und durch eine Market-Order ersetzt wird.',
    'Maker-Preisabstand (bps)', 'Abstand des Limitpreises zum Referenzpreis. Käufe liegen tiefer, Verkäufe höher.'
  ]),
  'fr-FR': messages([
    'Valeurs par défaut des ordres Maker', "Utilisées uniquement lorsqu'un ordre choisit Maker puis marché sans valeur propre. La stratégie et l'ordre sont prioritaires ; redémarrez le Worker de trading après l'enregistrement.", 'Priorité à la stratégie',
    'Attente avant passage au marché (secondes)', "Durée d'attente de l'ordre limite Maker avant annulation et remplacement par un ordre au marché.",
    'Décalage du prix Maker (pb)', 'Distance entre le prix limite et le prix de référence. Les achats sont placés plus bas et les ventes plus haut.'
  ]),
  'ru-RU': messages([
    'Значения Maker по умолчанию', 'Используются только для Maker-с-переходом-в-рынок без собственных значений. Настройки стратегии и ордера приоритетны; после сохранения перезапустите торговый Worker.', 'Приоритет стратегии',
    'Ожидание до рынка (секунды)', 'Время ожидания лимитного Maker-ордера до отмены и замены рыночным ордером.',
    'Смещение цены Maker (б.п.)', 'Расстояние лимитной цены от опорной: покупка ниже, продажа выше.'
  ]),
  'th-TH': messages([
    'ค่าเริ่มต้นคำสั่ง Maker', 'ใช้เมื่อคำสั่งเลือก Maker แล้วเปลี่ยนเป็นตลาดโดยไม่มีค่าของตนเองเท่านั้น การตั้งค่ากลยุทธ์และคำสั่งมีลำดับสูงกว่า และต้องรีสตาร์ต Worker การซื้อขายหลังบันทึก', 'ใช้ค่ากลยุทธ์ก่อน',
    'เวลารอก่อนเปลี่ยนเป็นตลาด (วินาที)', 'เวลารอคำสั่งจำกัดแบบ Maker ก่อนยกเลิกและแทนที่ด้วยคำสั่งตลาด',
    'ระยะห่างราคา Maker (bps)', 'ระยะของราคาจำกัดจากราคาอ้างอิง คำสั่งซื้อจะต่ำลงและคำสั่งขายจะสูงขึ้น'
  ]),
  'vi-VN': messages([
    'Mặc định lệnh Maker', 'Chỉ dùng khi lệnh chọn Maker rồi chuyển sang thị trường mà không có giá trị riêng. Cấu hình chiến lược và lệnh được ưu tiên; hãy khởi động lại Worker giao dịch sau khi lưu.', 'Ưu tiên chiến lược',
    'Thời gian chờ chuyển sang thị trường (giây)', 'Thời gian chờ lệnh giới hạn Maker trước khi hủy và thay bằng lệnh thị trường.',
    'Độ lệch giá Maker (bps)', 'Khoảng cách giữa giá giới hạn và giá tham chiếu. Lệnh mua thấp hơn, lệnh bán cao hơn.'
  ]),
  'ar-SA': messages([
    'القيم الافتراضية لأوامر Maker', 'تُستخدم فقط عندما يختار الأمر Maker ثم السوق دون قيم خاصة. إعدادات الاستراتيجية والأمر لها الأولوية؛ أعد تشغيل عامل التداول بعد الحفظ.', 'الأولوية للاستراتيجية',
    'الانتظار قبل التحويل إلى السوق (ثوانٍ)', 'مدة انتظار أمر Maker المحدد قبل إلغائه واستبداله بأمر سوق.',
    'إزاحة سعر Maker (نقطة أساس)', 'المسافة بين السعر المحدد والسعر المرجعي. يكون الشراء أقل والبيع أعلى.'
  ])
}

const quoteKeys = [
  'settings.trading.quoteFreshnessSection',
  'settings.field.EQUITY_QUOTE_MAX_AGE_MINUTES',
  'settings.desc.EQUITY_QUOTE_MAX_AGE_MINUTES',
  'settings.invalidEquityQuoteMaxAge'
]

const quoteCopy = {
  'en-US': [
    'Equity execution quotes', 'Maximum quote age (minutes)',
    'Applies to live equity entries, rebalancing and locally monitored exits. Default: 16 minutes (range 1–60), allowing for 15-minute delayed quotes. Delayed prices can delay stops and differ from execution prices. Quotes must still belong to the current trading session. Restart trading workers after saving.',
    'Enter a whole number from 1 to 60 minutes.'
  ],
  'zh-CN': [
    '股票执行报价', '报价最大允许延迟（分钟）',
    '用于股票实盘开仓、调仓及本地监测的止盈止损。默认 16 分钟，可设 1–60 分钟，兼容 15 分钟延迟行情。延迟报价可能使止损触发滞后，并与实际成交价存在差异；报价仍须属于当前交易时段。保存后需重启交易 Worker。',
    '请输入 1–60 分钟之间的整数。'
  ],
  'zh-TW': [
    '股票執行報價', '報價最大允許延遲（分鐘）',
    '用於股票實盤開倉、調倉及本地監測的停利停損。預設 16 分鐘，可設 1–60 分鐘，相容 15 分鐘延遲行情。延遲報價可能使停損觸發落後，並與實際成交價有差異；報價仍須屬於目前交易時段。儲存後需重新啟動交易 Worker。',
    '請輸入 1–60 分鐘之間的整數。'
  ],
  'ja-JP': [
    '株式の執行用価格', '許容する価格の経過時間（分）',
    '株式の実取引の新規注文、リバランス、ローカル監視の決済に適用。既定は16分、範囲は1～60分で、15分遅延の価格に対応します。遅延価格は損切りを遅らせ、約定価格と異なる場合があります。同じ取引時間帯の価格が必要です。保存後は取引Workerを再起動してください。',
    '1～60分の整数を入力してください。'
  ],
  'ko-KR': [
    '주식 주문용 시세', '최대 허용 시세 지연(분)',
    '주식 실거래 진입, 리밸런싱 및 로컬 감시 청산에 적용됩니다. 기본값은 16분이며 1~60분으로 설정하여 15분 지연 시세를 허용할 수 있습니다. 지연 시세는 손절을 늦추고 체결가와 다를 수 있습니다. 시세는 현재 거래 시간대에 속해야 합니다. 저장 후 거래 Worker를 다시 시작하세요.',
    '1~60분 사이의 정수를 입력하세요.'
  ],
  'de-DE': [
    'Aktienkurse für die Ausführung', 'Maximales Kursalter (Minuten)',
    'Gilt für Live-Aktienkäufe, Rebalancing und lokal überwachte Ausstiege. Standard: 16 Minuten (1–60), auch für 15 Minuten verzögerte Kurse. Verzögerungen können Stopps verzögern; Ausführungskurse können abweichen. Kurse müssen aus dem aktuellen Handelsabschnitt stammen. Nach dem Speichern die Trading-Worker neu starten.',
    'Eine ganze Zahl von 1 bis 60 Minuten eingeben.'
  ],
  'fr-FR': [
    'Cours utilisés pour les ordres sur actions', 'Âge maximal du cours (minutes)',
    'S’applique aux entrées réelles sur actions, au rééquilibrage et aux sorties surveillées localement. Par défaut : 16 minutes (1–60), pour les cours différés de 15 minutes. Ces cours peuvent retarder les stops et différer du prix exécuté. Ils doivent appartenir à la plage de négociation en cours. Redémarrez les workers de trading après enregistrement.',
    'Saisissez un nombre entier de 1 à 60 minutes.'
  ],
  'ru-RU': [
    'Котировки для исполнения сделок с акциями', 'Максимальный возраст котировки (минуты)',
    'Для реальных входов по акциям, ребалансировки и выходов под локальным контролем. По умолчанию 16 минут (1–60), включая котировки с задержкой 15 минут. Задержка может замедлить стопы; цена исполнения может отличаться. Котировка должна относиться к текущему торговому интервалу. После сохранения перезапустите торговые процессы.',
    'Введите целое число от 1 до 60 минут.'
  ],
  'th-TH': [
    'ราคาหุ้นสำหรับส่งคำสั่ง', 'อายุราคาสูงสุด (นาที)',
    'ใช้กับการเปิดสถานะหุ้นจริง การปรับพอร์ต และการปิดสถานะที่ระบบเฝ้าดู ค่าเริ่มต้น 16 นาที (1–60) รองรับราคาล่าช้า 15 นาที ราคาล่าช้าอาจทำให้จุดตัดขาดทุนทำงานช้าและต่างจากราคาที่จับคู่ ต้องเป็นราคาจากช่วงซื้อขายปัจจุบัน รีสตาร์ต Worker ซื้อขายหลังบันทึก',
    'กรอกจำนวนเต็มระหว่าง 1 ถึง 60 นาที'
  ],
  'vi-VN': [
    'Giá cổ phiếu dùng để thực thi', 'Độ trễ giá tối đa (phút)',
    'Áp dụng cho mở vị thế cổ phiếu thực, tái cân bằng và đóng vị thế do hệ thống giám sát. Mặc định 16 phút (1–60), hỗ trợ giá trễ 15 phút. Giá trễ có thể làm chậm cắt lỗ và khác giá khớp. Giá vẫn phải thuộc khoảng giao dịch hiện tại. Khởi động lại Worker giao dịch sau khi lưu.',
    'Nhập số nguyên từ 1 đến 60 phút.'
  ],
  'ar-SA': [
    'أسعار تنفيذ الأسهم', 'الحد الأقصى لعمر السعر (دقائق)',
    'ينطبق على فتح صفقات الأسهم الفعلية وإعادة الموازنة والخروج المراقب محلياً. الافتراضي 16 دقيقة (1–60) لاستيعاب الأسعار المتأخرة 15 دقيقة. قد تؤخر الأسعار وقف الخسارة وتختلف عن سعر التنفيذ. يجب أن تنتمي الأسعار إلى فترة التداول الحالية. أعد تشغيل عمال التداول بعد الحفظ.',
    'أدخل عدداً صحيحاً من 1 إلى 60 دقيقة.'
  ]
}

for (const [locale, values] of Object.entries(quoteCopy)) {
  Object.assign(translations[locale], Object.fromEntries(quoteKeys.map((key, index) => [key, values[index]])))
}

export default translations
