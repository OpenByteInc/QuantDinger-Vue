const keys = [
  'strategyEvolution.chart.monteCarlo',
  'strategyEvolution.chart.monteCarloHint',
  'strategyEvolution.chart.costStress',
  'strategyEvolution.chart.costStressHint',
  'strategyEvolution.topCandidates',
  'strategyEvolution.validationActivity',
  'strategyEvolution.validationInsufficient',
  'strategyEvolution.rankingReturn',
  'strategyEvolution.rankingScope',
  'strategyEvolution.validationTie',
  'strategyEvolution.parameters',
  'strategyEvolution.profitableFolds',
  'strategyEvolution.segmentValidation',
  'strategyEvolution.segmentValidationHint',
  'strategyEvolution.fold',
  'strategyEvolution.trainingRange',
  'strategyEvolution.validationRange',
  'strategyEvolution.trainingReturn',
  'strategyEvolution.validationReturn',
  'strategyEvolution.monteCarlo',
  'strategyEvolution.monteCarloHint',
  'strategyEvolution.monteCarloDetail',
  'strategyEvolution.costStress',
  'strategyEvolution.costStressHint',
  'strategyEvolution.costStressDetail',
  'strategyEvolution.bestParams'
]

const locale = values => Object.fromEntries(keys.map((key, index) => [key, values[index]]))

export default {
  'zh-TW': locale([
    '蒙地卡羅期末報酬', '樣本外報酬重抽樣後的分布', '交易成本敏感度', '盲測區間在各成本倍數下的淨報酬',
    '已評估候選中的最佳結果', '向前測試執行次數', '有效報酬觀測不足，無法執行此檢驗。', '順序驗證報酬',
    '顯示 {displayed}/{shortlist} 個驗證候選 · 共搜尋 {searched} 組訓練候選', '並列 ×{count}', '參數', '獲利測試區間',
    '訓練與驗證的時間順序切分', '只在使用者選取的精確區間內切分一次；預熱 K 線從該區間之前載入，不占用訓練時間。',
    '切分', '參數訓練區間', '向前測試區間', '訓練結果', '單一區間向前報酬', '蒙地卡羅',
    '區塊自助法會保留報酬的短期相依性。', '期末報酬中位數 · 虧損機率 {loss} · 依據 {observations} 個樣本外觀測模擬 {paths} 條路徑',
    '成本壓力層級', '以逐步提高的手續費與滑點重新測試最佳候選。', '{multiplier}× 成本淨報酬 · 相較基準 {delta}', '最佳已測試參數組合'
  ]),
  'ja-JP': locale([
    'モンテカルロ最終リターン', '再標本化したアウト・オブ・サンプル収益の分布', '取引コスト感応度', '各コスト倍率における最終ホールドアウトの純収益',
    '評価済み候補の上位結果', 'フォワードテスト約定回数', 'この検定に必要な有効リターン観測が不足しています。', '時系列検証リターン',
    '検証候補 {displayed}/{shortlist} 件を表示 · 学習候補 {searched} 件を探索', '同率 ×{count}', 'パラメーター', '収益がプラスの検証期間',
    '学習・検証の時系列分割', 'ユーザーが選択した期間内で1回だけ分割します。ウォームアップ用バーは期間前から読み込まれ、学習時間には含まれません。',
    '分割', 'パラメーター学習期間', 'フォワードテスト期間', '学習結果', '単一期間のフォワード収益', 'モンテカルロ',
    'ブロック・ブートストラップで収益の短期依存を保持します。', '最終収益中央値 · 損失確率 {loss} · OOS観測 {observations} 件から {paths} 経路',
    'コスト・ストレス水準', '手数料とスリッページを段階的に引き上げて最良候補を再検証します。', '{multiplier}× コスト純収益 · 基準比 {delta}', '検証済み最良パラメーター'
  ]),
  'ko-KR': locale([
    '몬테카를로 최종 수익률', '재표본화한 표본 외 수익률 분포', '거래 비용 민감도', '각 비용 배수에서 최종 블라인드 구간의 순수익률',
    '평가된 후보 중 상위 결과', '전진 검증 체결 수', '이 검정에 필요한 유효 수익률 관측치가 부족합니다.', '시계열 검증 수익률',
    '검증 최종 후보 {displayed}/{shortlist}개 표시 · 학습 후보 {searched}개 탐색', '동률 ×{count}', '매개변수', '수익이 난 검증 구간',
    '학습 및 검증 시계열 분할', '사용자가 선택한 정확한 구간 안에서 한 번만 분할합니다. 워밍업 봉은 해당 구간 이전에서 불러오며 학습 기간에 포함되지 않습니다.',
    '분할', '매개변수 학습 기간', '전진 검증 기간', '학습 결과', '단일 구간 전진 수익률', '몬테카를로',
    '블록 부트스트랩으로 수익률의 단기 의존성을 유지합니다.', '최종 수익률 중앙값 · 손실 확률 {loss} · 표본 외 관측치 {observations}개에서 {paths}개 경로',
    '비용 스트레스 수준', '수수료와 슬리피지를 단계적으로 높여 최상위 후보를 다시 검증합니다.', '{multiplier}× 비용 순수익률 · 기준 대비 {delta}', '검증된 최적 매개변수 조합'
  ]),
  'de-DE': locale([
    'Monte-Carlo-Endrendite', 'Verteilung neu gezogener Out-of-Sample-Renditen', 'Transaktionskostensensitivität', 'Nettorendite des Blind-Holdouts bei jedem Kostenmultiplikator',
    'Beste bewertete Kandidaten', 'Ausführungen im Vorwärtstest', 'Für diesen Test liegen nicht genügend aktive Renditebeobachtungen vor.', 'Rendite der chronologischen Validierung',
    '{displayed}/{shortlist} Validierungsfinalisten angezeigt · {searched} Trainingskandidaten durchsucht', 'Gleichstand ×{count}', 'Parameter', 'Profitable Testzeiträume',
    'Chronologische Aufteilung von Training und Validierung', 'Innerhalb des exakt gewählten Zeitraums wird einmal geteilt. Aufwärmkerzen werden davor geladen und verbrauchen keine Trainingszeit.',
    'Teilung', 'Parameter-Trainingszeitraum', 'Vorwärtstestzeitraum', 'Trainingsergebnis', 'Vorwärtsrendite des Einzelzeitraums', 'Monte Carlo',
    'Block-Bootstrap-Pfade erhalten kurzfristige Abhängigkeiten der Renditen.', 'Median der Endrendite · Verlustwahrscheinlichkeit {loss} · {paths} Pfade aus {observations} OOS-Beobachtungen',
    'Kostenstresstest', 'Der beste Kandidat wird mit schrittweise höheren Gebühren und Slippage erneut geprüft.', '{multiplier}× Kosten-Nettorendite · {delta} gegenüber der Basis', 'Bestes getestetes Parameterset'
  ]),
  'fr-FR': locale([
    'Rendement terminal Monte-Carlo', 'Distribution des rendements hors échantillon rééchantillonnés', 'Sensibilité aux coûts de transaction', 'Rendement net du segment aveugle pour chaque multiplicateur de coût',
    'Meilleurs candidats évalués', 'Exécutions du test prospectif', 'Les observations de rendement actif sont insuffisantes pour ce test.', 'Rendement de validation chronologique',
    '{displayed}/{shortlist} finalistes affichés · {searched} candidats d’entraînement explorés', 'ex æquo ×{count}', 'Paramètres', 'Périodes de test rentables',
    'Découpage chronologique entraînement-validation', 'Un seul découpage est effectué dans la plage exacte choisie. Les bougies de préchauffage sont chargées avant cette plage et ne consomment pas de temps d’entraînement.',
    'Segment', 'Période d’entraînement des paramètres', 'Période de test prospectif', 'Résultat d’entraînement', 'Rendement prospectif sur une période', 'Monte-Carlo',
    'Le bootstrap par blocs conserve les dépendances de court terme des rendements.', 'Rendement terminal médian · probabilité de perte {loss} · {paths} trajectoires issues de {observations} observations hors échantillon',
    'Niveaux de stress des coûts', 'Reteste le meilleur candidat avec des frais et un glissement progressivement plus élevés.', 'Rendement net à {multiplier}× les coûts · {delta} par rapport à la référence', 'Meilleur jeu de paramètres testé'
  ]),
  'ru-RU': locale([
    'Итоговая доходность Монте-Карло', 'Распределение повторно выбранной вневыборочной доходности', 'Чувствительность к торговым издержкам', 'Чистая доходность слепого участка при каждом множителе издержек',
    'Лучшие из оценённых кандидатов', 'Исполнения в форвард-тесте', 'Для этого теста недостаточно наблюдений активной доходности.', 'Доходность хронологической валидации',
    'Показано {displayed}/{shortlist} финалистов · исследовано {searched} обучающих кандидатов', 'одинаковый ранг ×{count}', 'Параметры', 'Прибыльные тестовые периоды',
    'Хронологическое разделение обучения и валидации', 'Внутри точно выбранного диапазона выполняется одно разделение. Прогревочные свечи загружаются до него и не расходуют время обучения.',
    'Разделение', 'Период обучения параметров', 'Период форвард-теста', 'Результат обучения', 'Форвард-доходность одного периода', 'Монте-Карло',
    'Блочный бутстрэп сохраняет краткосрочную зависимость доходностей.', 'Медианная итоговая доходность · вероятность убытка {loss} · {paths} траекторий из {observations} вневыборочных наблюдений',
    'Уровни стресс-теста издержек', 'Повторная проверка лучшего кандидата с поэтапно растущими комиссиями и проскальзыванием.', 'Чистая доходность при издержках ×{multiplier} · {delta} к базе', 'Лучший протестированный набор параметров'
  ]),
  'th-TH': locale([
    'ผลตอบแทนปลายทางแบบมอนติคาร์โล', 'การกระจายของผลตอบแทนนอกตัวอย่างที่สุ่มซ้ำ', 'ความไวต่อต้นทุนธุรกรรม', 'ผลตอบแทนสุทธิของช่วงทดสอบปิดบังในแต่ละตัวคูณต้นทุน',
    'ผู้สมัครที่ประเมินแล้วอันดับสูงสุด', 'จำนวนการดำเนินการทดสอบล่วงหน้า', 'ข้อมูลสังเกตผลตอบแทนที่ใช้งานได้ไม่เพียงพอสำหรับการทดสอบนี้', 'ผลตอบแทนการตรวจสอบตามลำดับเวลา',
    'แสดงผู้เข้ารอบ {displayed}/{shortlist} ราย · สำรวจผู้สมัครฝึก {searched} ราย', 'อันดับร่วม ×{count}', 'พารามิเตอร์', 'ช่วงทดสอบที่มีกำไร',
    'การแบ่งช่วงฝึกและตรวจสอบตามลำดับเวลา', 'แบ่งหนึ่งครั้งภายในช่วงที่ผู้ใช้เลือกอย่างแม่นยำ แท่งวอร์มอัปจะโหลดจากก่อนช่วงดังกล่าวและไม่ใช้เวลาฝึก',
    'ช่วง', 'ช่วงฝึกพารามิเตอร์', 'ช่วงทดสอบล่วงหน้า', 'ผลการฝึก', 'ผลตอบแทนล่วงหน้ารายช่วง', 'มอนติคาร์โล',
    'บล็อกบูตสแตรปคงความสัมพันธ์ระยะสั้นของผลตอบแทนไว้', 'ค่ามัธยฐานผลตอบแทนปลายทาง · โอกาสขาดทุน {loss} · {paths} เส้นทางจากข้อมูลนอกตัวอย่าง {observations} จุด',
    'ระดับทดสอบความเครียดของต้นทุน', 'ทดสอบผู้สมัครที่ดีที่สุดซ้ำด้วยค่าธรรมเนียมและสลิปเพจที่เพิ่มขึ้น', 'ผลตอบแทนสุทธิที่ต้นทุน {multiplier}× · {delta} เทียบฐาน', 'ชุดพารามิเตอร์ที่ทดสอบแล้วดีที่สุด'
  ]),
  'vi-VN': locale([
    'Lợi nhuận cuối kỳ Monte Carlo', 'Phân phối lợi nhuận ngoài mẫu được lấy mẫu lại', 'Độ nhạy với chi phí giao dịch', 'Lợi nhuận ròng của vùng kiểm tra mù tại từng hệ số chi phí',
    'Các ứng viên được đánh giá tốt nhất', 'Số lần khớp trong kiểm định tiến', 'Không đủ quan sát lợi nhuận hoạt động cho phép kiểm định này.', 'Lợi nhuận xác thực theo thời gian',
    'Hiển thị {displayed}/{shortlist} ứng viên xác thực · đã tìm {searched} ứng viên huấn luyện', 'đồng hạng ×{count}', 'Tham số', 'Giai đoạn kiểm định có lãi',
    'Phân tách huấn luyện và xác thực theo thời gian', 'Chỉ phân tách một lần trong đúng khoảng người dùng chọn. Nến khởi động được tải trước khoảng đó và không chiếm thời gian huấn luyện.',
    'Phân đoạn', 'Giai đoạn huấn luyện tham số', 'Giai đoạn kiểm định tiến', 'Kết quả huấn luyện', 'Lợi nhuận tiến của một giai đoạn', 'Monte Carlo',
    'Bootstrap theo khối giữ lại phụ thuộc ngắn hạn của lợi nhuận.', 'Lợi nhuận cuối kỳ trung vị · xác suất lỗ {loss} · {paths} đường từ {observations} quan sát ngoài mẫu',
    'Mức kiểm tra sức chịu đựng chi phí', 'Kiểm tra lại ứng viên tốt nhất với phí và trượt giá tăng dần.', 'Lợi nhuận ròng ở mức chi phí {multiplier}× · {delta} so với cơ sở', 'Bộ tham số đã kiểm định tốt nhất'
  ]),
  'ar-SA': locale([
    'العائد النهائي لمحاكاة مونت كارلو', 'توزيع العوائد المعاد أخذ عيناتها خارج العينة', 'حساسية تكاليف المعاملات', 'صافي عائد الاختبار المعزول عند كل مضاعف تكلفة',
    'أفضل المرشحين الذين جرى تقييمهم', 'عدد عمليات التنفيذ في الاختبار التقدمي', 'لا تتوفر ملاحظات عائد نشطة كافية لهذا الاختبار.', 'عائد التحقق الزمني',
    'عرض {displayed}/{shortlist} من مرشحي التحقق · استكشاف {searched} من مرشحي التدريب', 'تعادل ×{count}', 'المعلمات', 'فترات الاختبار المربحة',
    'التقسيم الزمني للتدريب والتحقق', 'يُجرى تقسيم واحد داخل النطاق الدقيق الذي اختاره المستخدم. تُحمّل شموع الإحماء قبل النطاق ولا تستهلك وقت التدريب.',
    'تقسيم', 'فترة تدريب المعلمات', 'فترة الاختبار التقدمي', 'نتيجة التدريب', 'العائد التقدمي لفترة واحدة', 'مونت كارلو',
    'يحافظ التمهيد الكتلي على الاعتماد قصير المدى للعوائد.', 'وسيط العائد النهائي · احتمال الخسارة {loss} · {paths} مساراً من {observations} ملاحظة خارج العينة',
    'مستويات ضغط التكلفة', 'إعادة اختبار أفضل مرشح مع زيادة الرسوم والانزلاق تدريجياً.', 'صافي العائد عند تكلفة ×{multiplier} · {delta} مقابل الأساس', 'أفضل مجموعة معلمات مختبرة'
  ])
}
