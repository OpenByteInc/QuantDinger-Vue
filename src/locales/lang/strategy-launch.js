const keys = [
  'strategyCenter.launch.createAndStart',
  'strategyCenter.launch.createdStarting',
  'strategyCenter.launch.createdStarted',
  'strategyCenter.launch.createdStartUnconfirmed'
]

const translations = {
  'en-US': [
    'Create and start',
    'Strategy created. Startup is queued; its status will update automatically.',
    'Strategy created and started.',
    'Strategy created, but startup could not be confirmed: {reason}. Check its status and logs before retrying Start; do not create it again.'
  ],
  'zh-CN': [
    '创建并启动',
    '策略已创建，正在启动，运行状态会自动更新。',
    '策略已创建并启动。',
    '策略已创建，但尚未确认启动成功：{reason}。请查看运行状态和日志后再尝试启动，无需重复创建。'
  ],
  'zh-TW': [
    '建立並啟動',
    '策略已建立，正在啟動，執行狀態會自動更新。',
    '策略已建立並啟動。',
    '策略已建立，但尚未確認啟動成功：{reason}。請查看執行狀態與日誌後再嘗試啟動，無需重複建立。'
  ],
  'ja-JP': [
    '作成して開始',
    '戦略を作成し、起動を受け付けました。状態は自動更新されます。',
    '戦略を作成して開始しました。',
    '戦略は作成されましたが、起動を確認できませんでした：{reason}。状態とログを確認してから開始を再試行してください。再作成は不要です。'
  ],
  'ko-KR': [
    '생성 및 시작',
    '전략이 생성되어 시작 대기 중입니다. 상태는 자동으로 갱신됩니다.',
    '전략이 생성되고 시작되었습니다.',
    '전략은 생성되었지만 시작 여부를 확인하지 못했습니다: {reason}. 상태와 로그를 확인한 후 시작을 재시도하세요. 다시 생성하지 마세요.'
  ],
  'de-DE': [
    'Erstellen und starten',
    'Strategie erstellt. Der Start ist vorgemerkt; der Status wird automatisch aktualisiert.',
    'Strategie erstellt und gestartet.',
    'Strategie erstellt, Start jedoch nicht bestätigt: {reason}. Prüfen Sie Status und Protokolle, bevor Sie den Start erneut versuchen. Erstellen Sie die Strategie nicht erneut.'
  ],
  'fr-FR': [
    'Créer et démarrer',
    'Stratégie créée. Le démarrage est en attente ; le statut sera actualisé automatiquement.',
    'Stratégie créée et démarrée.',
    'Stratégie créée, mais démarrage non confirmé : {reason}. Vérifiez le statut et les journaux avant de réessayer de la démarrer. Ne la créez pas à nouveau.'
  ],
  'ru-RU': [
    'Создать и запустить',
    'Стратегия создана и ожидает запуска. Статус обновится автоматически.',
    'Стратегия создана и запущена.',
    'Стратегия создана, но запуск не подтверждён: {reason}. Проверьте статус и журналы перед повторным запуском. Не создавайте стратегию заново.'
  ],
  'ar-SA': [
    'إنشاء وتشغيل',
    'تم إنشاء الاستراتيجية ووضع التشغيل في قائمة الانتظار. ستُحدّث الحالة تلقائياً.',
    'تم إنشاء الاستراتيجية وتشغيلها.',
    'تم إنشاء الاستراتيجية، لكن تعذّر تأكيد التشغيل: {reason}. راجع الحالة والسجلات قبل إعادة محاولة التشغيل، ولا تنشئ الاستراتيجية مرة أخرى.'
  ],
  'th-TH': [
    'สร้างและเริ่มทำงาน',
    'สร้างกลยุทธ์แล้ว กำลังรอเริ่มทำงาน สถานะจะอัปเดตอัตโนมัติ',
    'สร้างและเริ่มกลยุทธ์แล้ว',
    'สร้างกลยุทธ์แล้ว แต่ยังยืนยันการเริ่มทำงานไม่ได้: {reason} โปรดตรวจสอบสถานะและบันทึกก่อนลองเริ่มอีกครั้ง ไม่ต้องสร้างซ้ำ'
  ],
  'vi-VN': [
    'Tạo và khởi chạy',
    'Đã tạo chiến lược và đưa vào hàng đợi khởi chạy. Trạng thái sẽ tự động cập nhật.',
    'Đã tạo và khởi chạy chiến lược.',
    'Đã tạo chiến lược nhưng chưa xác nhận được việc khởi chạy: {reason}. Hãy kiểm tra trạng thái và nhật ký trước khi thử khởi chạy lại; không tạo lại chiến lược.'
  ]
}

export default Object.fromEntries(Object.entries(translations).map(([locale, values]) => [
  locale, Object.fromEntries(keys.map((key, index) => [key, values[index]]))
]))
