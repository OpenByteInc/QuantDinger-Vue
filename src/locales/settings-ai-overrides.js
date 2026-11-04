const keys = [
  'settings.llm.currentProviderLabel',
  'settings.llm.currentProviderDesc',
  'settings.field.JEV_ENABLED',
  'settings.desc.JEV_ENABLED',
  'settings.llm.jevEnabledBadge',
  'settings.llm.jevDisabledBadge',
  'settings.llm.codeSection',
  'settings.llm.codeSectionDesc',
  'settings.llm.analysisSection',
  'settings.llm.analysisSectionDesc',
  'settings.llm.runtimeSection',
  'settings.llm.runtimeSectionDesc',
  'settings.field.OPENROUTER_TEMPERATURE',
  'settings.desc.OPENROUTER_TEMPERATURE',
  'settings.field.AI_ANALYSIS_CONSENSUS_TIMEFRAMES',
  'settings.desc.AI_ANALYSIS_CONSENSUS_TIMEFRAMES'
]

function messages (values) {
  return Object.fromEntries(keys.map((key, index) => [key, values[index]]))
}

export default {
  'en-US': messages([
    'Active provider', 'Only the selected provider credentials are shown. Switching providers keeps saved values.',
    'Prefer JEV', 'When enabled and configured, JEV runs first. When disabled or unavailable, the configured LLM performs the decision filter.',
    'JEV first', 'LLM decision', 'Code generation', 'Model overrides used only for strategy, indicator, and factor code generation.',
    'Fast analysis', 'Multi-timeframe defaults used only by fast AI analysis.', 'Model runtime limits', 'Provider-independent output limits applied to LLM requests.',
    'Indicator generation temperature', 'Creativity used only by indicator code generation; lower values are more deterministic.',
    'Fast analysis consensus timeframes', 'Comma-separated timeframes used only by fast AI analysis, for example 1D,4H.'
  ]),
  'zh-CN': messages([
    '当前供应商', '仅显示当前供应商的密钥、模型和端点；切换供应商不会清除已保存配置。',
    '优先使用 JEV', '开启且已配置时优先调用 JEV；关闭或不可用时，直接由当前大模型执行决策过滤。',
    'JEV 优先', 'LLM 决策', '代码生成', '仅用于策略、指标和因子代码生成的模型覆盖项。',
    '快速分析', '仅用于快速 AI 分析的多周期默认值。', '模型运行限制', '对所有供应商请求生效的通用输出限制。',
    '指标代码生成温度', '仅影响指标代码生成；数值越低，输出越稳定。',
    '快速分析共识周期', '仅用于快速 AI 分析，使用逗号分隔，例如 1D,4H。'
  ]),
  'zh-TW': messages([
    '目前供應商', '僅顯示目前供應商的金鑰、模型與端點；切換供應商不會清除已儲存設定。',
    '優先使用 JEV', '開啟且已設定時優先呼叫 JEV；關閉或無法使用時，直接由目前的大模型執行決策過濾。',
    'JEV 優先', 'LLM 決策', '程式碼生成', '僅用於策略、指標與因子程式碼生成的模型覆寫。',
    '快速分析', '僅供快速 AI 分析使用的多週期預設值。', '模型運行限制', '套用到所有供應商請求的通用輸出限制。',
    '指標程式碼生成溫度', '僅影響指標程式碼生成；數值越低，輸出越穩定。',
    '快速分析共識週期', '僅用於快速 AI 分析，請以逗號分隔，例如 1D,4H。'
  ]),
  'ja-JP': messages([
    '現在のプロバイダー', '選択中のプロバイダーの認証情報だけを表示します。切り替えても保存済み設定は保持されます。',
    'JEVを優先', '有効かつ設定済みの場合はJEVを優先し、無効または利用不可の場合は設定済みLLMが判定します。',
    'JEV優先', 'LLM判定', 'コード生成', '戦略、指標、因子のコード生成だけに使用するモデル設定です。',
    '高速分析', '高速AI分析だけに使用する複数時間足の既定値です。', 'モデル実行制限', 'すべてのプロバイダーに適用する出力制限です。',
    '指標生成の温度', '指標コード生成だけに影響します。低いほど決定的になります。',
    '高速分析の合意時間足', '高速AI分析だけで使用する時間足をカンマ区切りで指定します（例: 1D,4H）。'
  ]),
  'ko-KR': messages([
    '현재 제공업체', '선택한 제공업체의 자격 증명만 표시합니다. 전환해도 저장된 설정은 유지됩니다.',
    'JEV 우선 사용', '활성화되고 구성된 경우 JEV를 먼저 사용하며, 비활성화되거나 사용할 수 없으면 구성된 LLM이 판단합니다.',
    'JEV 우선', 'LLM 판단', '코드 생성', '전략, 지표 및 팩터 코드 생성에만 사용하는 모델 설정입니다.',
    '빠른 분석', '빠른 AI 분석에만 사용하는 다중 시간대 기본값입니다.', '모델 실행 제한', '모든 제공업체 요청에 적용되는 출력 제한입니다.',
    '지표 생성 온도', '지표 코드 생성에만 영향을 주며 값이 낮을수록 결과가 결정적입니다.',
    '빠른 분석 합의 시간대', '빠른 AI 분석에만 사용할 시간대를 쉼표로 구분합니다. 예: 1D,4H.'
  ]),
  'de-DE': messages([
    'Aktiver Anbieter', 'Es werden nur die Zugangsdaten des ausgewählten Anbieters angezeigt. Gespeicherte Werte bleiben beim Wechsel erhalten.',
    'JEV bevorzugen', 'Wenn aktiviert und konfiguriert, wird zuerst JEV verwendet. Andernfalls entscheidet das konfigurierte LLM.',
    'JEV zuerst', 'LLM-Entscheidung', 'Codegenerierung', 'Modellüberschreibungen nur für Strategie-, Indikator- und Faktorcode.',
    'Schnellanalyse', 'Mehrzeitrahmen-Standardwerte nur für die schnelle KI-Analyse.', 'Modell-Laufzeitlimits', 'Anbieterunabhängige Ausgabelimits für LLM-Anfragen.',
    'Temperatur der Indikatorgenerierung', 'Wirkt nur auf die Indikator-Codegenerierung; niedrigere Werte sind deterministischer.',
    'Konsens-Zeitrahmen der Schnellanalyse', 'Kommagetrennte Zeitrahmen nur für die schnelle KI-Analyse, z. B. 1D,4H.'
  ]),
  'fr-FR': messages([
    'Fournisseur actif', 'Seuls les identifiants du fournisseur sélectionné sont affichés. Les valeurs restent enregistrées lors du changement.',
    'Privilégier JEV', 'Lorsque JEV est activé et configuré, il est utilisé en premier. Sinon, le LLM configuré prend la décision.',
    'JEV prioritaire', 'Décision LLM', 'Génération de code', 'Surcharges de modèle utilisées uniquement pour le code de stratégie, indicateur et facteur.',
    'Analyse rapide', "Valeurs multi-temporelles utilisées uniquement par l'analyse IA rapide.", "Limites d'exécution du modèle", 'Limites de sortie indépendantes du fournisseur pour les requêtes LLM.',
    'Température de génération des indicateurs', "Affecte uniquement la génération du code d'indicateur ; une valeur basse est plus déterministe.",
    "Unités de temps de l'analyse rapide", "Unités séparées par des virgules, utilisées uniquement par l'analyse rapide, par exemple 1D,4H."
  ]),
  'ru-RU': messages([
    'Активный поставщик', 'Показываются только параметры выбранного поставщика. Сохранённые значения не удаляются при переключении.',
    'Предпочитать JEV', 'Если JEV включён и настроен, он используется первым. Иначе решение принимает настроенная LLM.',
    'Сначала JEV', 'Решение LLM', 'Генерация кода', 'Переопределения модели только для генерации кода стратегий, индикаторов и факторов.',
    'Быстрый анализ', 'Мультитаймфреймовые значения только для быстрого анализа ИИ.', 'Ограничения модели', 'Независимые от поставщика ограничения вывода LLM.',
    'Температура генерации индикаторов', 'Влияет только на генерацию кода индикатора; меньшие значения более детерминированы.',
    'Таймфреймы быстрого анализа', 'Таймфреймы через запятую только для быстрого анализа ИИ, например 1D,4H.'
  ]),
  'th-TH': messages([
    'ผู้ให้บริการที่ใช้งาน', 'แสดงเฉพาะข้อมูลของผู้ให้บริการที่เลือก การสลับจะไม่ลบค่าที่บันทึกไว้',
    'ใช้ JEV ก่อน', 'เมื่อเปิดและกำหนดค่าแล้ว ระบบจะใช้ JEV ก่อน หากปิดหรือใช้ไม่ได้ LLM ที่กำหนดจะตัดสินใจแทน',
    'JEV ก่อน', 'การตัดสินใจของ LLM', 'การสร้างโค้ด', 'การตั้งค่าโมเดลที่ใช้เฉพาะการสร้างโค้ดกลยุทธ์ อินดิเคเตอร์ และแฟกเตอร์',
    'การวิเคราะห์ด่วน', 'ค่าเริ่มต้นหลายกรอบเวลาสำหรับการวิเคราะห์ AI ด่วนเท่านั้น', 'ขีดจำกัดการทำงานของโมเดล', 'ขีดจำกัดเอาต์พุตที่ใช้กับคำขอ LLM ทุกผู้ให้บริการ',
    'อุณหภูมิการสร้างอินดิเคเตอร์', 'มีผลเฉพาะการสร้างโค้ดอินดิเคเตอร์ ค่าต่ำให้ผลลัพธ์คงที่กว่า',
    'กรอบเวลาฉันทามติของการวิเคราะห์ด่วน', 'กรอบเวลาคั่นด้วยจุลภาคสำหรับการวิเคราะห์ AI ด่วนเท่านั้น เช่น 1D,4H'
  ]),
  'vi-VN': messages([
    'Nhà cung cấp đang dùng', 'Chỉ hiển thị thông tin của nhà cung cấp đã chọn. Việc chuyển đổi không xóa giá trị đã lưu.',
    'Ưu tiên JEV', 'Khi được bật và cấu hình, JEV chạy trước. Khi tắt hoặc không khả dụng, LLM đã cấu hình sẽ đưa ra quyết định.',
    'JEV trước', 'Quyết định LLM', 'Tạo mã', 'Ghi đè mô hình chỉ dùng để tạo mã chiến lược, chỉ báo và nhân tố.',
    'Phân tích nhanh', 'Giá trị đa khung thời gian chỉ dùng cho phân tích AI nhanh.', 'Giới hạn chạy mô hình', 'Giới hạn đầu ra độc lập với nhà cung cấp cho các yêu cầu LLM.',
    'Nhiệt độ tạo chỉ báo', 'Chỉ ảnh hưởng đến việc tạo mã chỉ báo; giá trị thấp ổn định hơn.',
    'Khung thời gian đồng thuận nhanh', 'Danh sách khung thời gian phân tách bằng dấu phẩy, chỉ dùng cho phân tích nhanh, ví dụ 1D,4H.'
  ]),
  'ar-SA': messages([
    'المزوّد النشط', 'تظهر بيانات المزوّد المحدد فقط، ولا يؤدي التبديل إلى حذف القيم المحفوظة.',
    'تفضيل JEV', 'عند التفعيل والإعداد يُستخدم JEV أولاً، وعند تعطيله أو تعذره يتولى نموذج اللغة المُعدّ القرار.',
    'JEV أولاً', 'قرار نموذج اللغة', 'إنشاء الشفرة', 'إعدادات نموذج تُستخدم فقط لإنشاء شفرة الاستراتيجيات والمؤشرات والعوامل.',
    'التحليل السريع', 'قيم أطر زمنية متعددة تُستخدم فقط في التحليل السريع بالذكاء الاصطناعي.', 'حدود تشغيل النموذج', 'حدود إخراج مستقلة عن المزوّد لطلبات نماذج اللغة.',
    'حرارة إنشاء المؤشرات', 'تؤثر فقط في إنشاء شفرة المؤشرات؛ القيم الأقل أكثر حتمية.',
    'أطر توافق التحليل السريع', 'أطر زمنية مفصولة بفواصل للتحليل السريع فقط، مثل 1D,4H.'
  ])
}
