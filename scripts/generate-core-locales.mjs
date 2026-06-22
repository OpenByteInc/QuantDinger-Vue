import vm from 'node:vm'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(process.cwd())
const langDir = join(root, 'src', 'locales', 'lang')

const specs = {
  'ar-SA': {
    antdVar: 'antdArEG',
    antdPath: 'ant-design-vue/es/locale-provider/ar_EG',
    momentVar: 'momentAR',
    momentPath: 'moment/locale/ar',
    momentName: 'ar',
    base: 'en-US'
  },
  'de-DE': {
    antdVar: 'antdDeDE',
    antdPath: 'ant-design-vue/es/locale-provider/de_DE',
    momentVar: 'momentDE',
    momentPath: 'moment/locale/de',
    momentName: 'de',
    base: 'en-US'
  },
  'fr-FR': {
    antdVar: 'antdFrFR',
    antdPath: 'ant-design-vue/es/locale-provider/fr_FR',
    momentVar: 'momentFR',
    momentPath: 'moment/locale/fr',
    momentName: 'fr',
    base: 'en-US'
  },
  'ja-JP': {
    antdVar: 'antdJaJP',
    antdPath: 'ant-design-vue/es/locale-provider/ja_JP',
    momentVar: 'momentJA',
    momentPath: 'moment/locale/ja',
    momentName: 'ja',
    base: 'en-US'
  },
  'ko-KR': {
    antdVar: 'antdKoKR',
    antdPath: 'ant-design-vue/es/locale-provider/ko_KR',
    momentVar: 'momentKO',
    momentPath: 'moment/locale/ko',
    momentName: 'ko',
    base: 'en-US'
  },
  'ru-RU': {
    antdVar: 'antdRuRU',
    antdPath: 'ant-design-vue/es/locale-provider/ru_RU',
    momentVar: 'momentRU',
    momentPath: 'moment/locale/ru',
    momentName: 'ru',
    base: 'en-US'
  },
  'th-TH': {
    antdVar: 'antdThTH',
    antdPath: 'ant-design-vue/es/locale-provider/th_TH',
    momentVar: 'momentTH',
    momentPath: 'moment/locale/th',
    momentName: 'th',
    base: 'en-US'
  },
  'vi-VN': {
    antdVar: 'antdViVN',
    antdPath: 'ant-design-vue/es/locale-provider/vi_VN',
    momentVar: 'momentVI',
    momentPath: 'moment/locale/vi',
    momentName: 'vi',
    base: 'en-US'
  },
  'zh-TW': {
    antdVar: 'antdZhTW',
    antdPath: 'ant-design-vue/es/locale-provider/zh_TW',
    momentVar: 'momentZHTW',
    momentPath: 'moment/locale/zh-tw',
    momentName: 'zh-tw',
    bases: ['en-US', 'zh-CN']
  }
}

const translationPacks = {
  'ar-SA': {
    'navBar.lang': 'اللغة',
    submit: 'إرسال',
    save: 'حفظ',
    'submit.ok': 'تم الإرسال بنجاح',
    'save.ok': 'تم الحفظ بنجاح',
    'common.confirm': 'تأكيد',
    'common.cancel': 'إلغاء',
    'common.save': 'حفظ',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة',
    'common.close': 'إغلاق',
    'common.done': 'تم',
    'common.ok': 'موافق',
    'common.loading': 'جار التحميل...',
    'common.noData': 'لا توجد بيانات',
    'common.yes': 'نعم',
    'common.no': 'لا',
    'common.copy': 'نسخ',
    'menu.dashboard.aiAssetAnalysis': 'تحليل ذكي بالذكاء الاصطناعي',
    'menu.dashboard.strategyIde': 'مختبر الاستراتيجيات',
    'menu.dashboard.brokerAccounts': 'حسابات الوسطاء',
    'menu.dashboard.settings': 'الإعدادات',
    'aiAnalysis.quickCards.diagnose.title': 'تشخيص الأصل',
    'aiAnalysis.quickCards.chart.title': 'تشخيص الرسم',
    'aiAnalysis.quickCards.strategy.title': 'تطوير الاستراتيجية',
    'aiAnalysis.quickCards.schedule.title': 'تتبع مجدول',
    'aiAnalysis.quickCards.news.title': 'بحث الأخبار والأحداث',
    'aiAnalysis.quickCards.logs.title': 'فحص السجلات',
    'aiAnalysis.quickCards.macro.title': 'بيانات الاقتصاد الكلي',
    'aiAnalysis.quickCards.opportunity.title': 'اكتشاف الفرص'
  },
  'de-DE': {
    'navBar.lang': 'Sprache',
    submit: 'Absenden',
    save: 'Speichern',
    'submit.ok': 'Erfolgreich gesendet',
    'save.ok': 'Erfolgreich gespeichert',
    'common.confirm': 'Bestätigen',
    'common.cancel': 'Abbrechen',
    'common.save': 'Speichern',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.add': 'Hinzufügen',
    'common.close': 'Schließen',
    'common.done': 'Fertig',
    'common.ok': 'OK',
    'common.loading': 'Wird geladen...',
    'common.noData': 'Keine Daten',
    'common.yes': 'Ja',
    'common.no': 'Nein',
    'common.copy': 'Kopieren',
    'menu.dashboard.aiAssetAnalysis': 'KI-Analyse',
    'menu.dashboard.strategyIde': 'Strategieentwicklung',
    'menu.dashboard.brokerAccounts': 'Brokerkonten',
    'menu.dashboard.settings': 'Einstellungen',
    'aiAnalysis.quickCards.diagnose.title': 'Symbol analysieren',
    'aiAnalysis.quickCards.chart.title': 'Chart analysieren',
    'aiAnalysis.quickCards.strategy.title': 'Strategieentwicklung',
    'aiAnalysis.quickCards.schedule.title': 'Geplante Überwachung',
    'aiAnalysis.quickCards.news.title': 'News- und Ereignissuche',
    'aiAnalysis.quickCards.logs.title': 'Logs prüfen',
    'aiAnalysis.quickCards.macro.title': 'Makrodaten',
    'aiAnalysis.quickCards.opportunity.title': 'Chancen finden'
  },
  'fr-FR': {
    'navBar.lang': 'Langue',
    submit: 'Envoyer',
    save: 'Enregistrer',
    'submit.ok': 'Envoyé avec succès',
    'save.ok': 'Enregistré avec succès',
    'common.confirm': 'Confirmer',
    'common.cancel': 'Annuler',
    'common.save': 'Enregistrer',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.add': 'Ajouter',
    'common.close': 'Fermer',
    'common.done': 'Terminé',
    'common.ok': 'OK',
    'common.loading': 'Chargement...',
    'common.noData': 'Aucune donnée',
    'common.yes': 'Oui',
    'common.no': 'Non',
    'common.copy': 'Copier',
    'menu.dashboard.aiAssetAnalysis': 'Analyse IA',
    'menu.dashboard.strategyIde': 'Recherche stratégique',
    'menu.dashboard.brokerAccounts': 'Comptes courtiers',
    'menu.dashboard.settings': 'Paramètres',
    'aiAnalysis.quickCards.diagnose.title': 'Diagnostiquer le symbole',
    'aiAnalysis.quickCards.chart.title': 'Diagnostiquer le graphique',
    'aiAnalysis.quickCards.strategy.title': 'Recherche stratégique',
    'aiAnalysis.quickCards.schedule.title': 'Suivi planifié',
    'aiAnalysis.quickCards.news.title': 'Recherche actualités/événements',
    'aiAnalysis.quickCards.logs.title': 'Examiner les journaux',
    'aiAnalysis.quickCards.macro.title': 'Données macro',
    'aiAnalysis.quickCards.opportunity.title': 'Détecter les opportunités'
  },
  'ja-JP': {
    'navBar.lang': '言語',
    submit: '送信',
    save: '保存',
    'submit.ok': '送信しました',
    'save.ok': '保存しました',
    'common.confirm': '確認',
    'common.cancel': 'キャンセル',
    'common.save': '保存',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.add': '追加',
    'common.close': '閉じる',
    'common.done': '完了',
    'common.ok': 'OK',
    'common.loading': '読み込み中...',
    'common.noData': 'データなし',
    'common.yes': 'はい',
    'common.no': 'いいえ',
    'common.copy': 'コピー',
    'menu.dashboard.aiAssetAnalysis': 'AIスマート分析',
    'menu.dashboard.strategyIde': '戦略開発',
    'menu.dashboard.brokerAccounts': 'ブローカー口座',
    'menu.dashboard.settings': '設定',
    'aiAnalysis.quickCards.diagnose.title': '銘柄診断',
    'aiAnalysis.quickCards.chart.title': 'チャート診断',
    'aiAnalysis.quickCards.strategy.title': '戦略開発',
    'aiAnalysis.quickCards.schedule.title': '定期追跡',
    'aiAnalysis.quickCards.news.title': 'ニュース・イベント検索',
    'aiAnalysis.quickCards.logs.title': 'ログ調査',
    'aiAnalysis.quickCards.macro.title': 'マクロ経済データ',
    'aiAnalysis.quickCards.opportunity.title': '機会探索'
  },
  'ko-KR': {
    'navBar.lang': '언어',
    submit: '제출',
    save: '저장',
    'submit.ok': '제출되었습니다',
    'save.ok': '저장되었습니다',
    'common.confirm': '확인',
    'common.cancel': '취소',
    'common.save': '저장',
    'common.delete': '삭제',
    'common.edit': '편집',
    'common.add': '추가',
    'common.close': '닫기',
    'common.done': '완료',
    'common.ok': '확인',
    'common.loading': '불러오는 중...',
    'common.noData': '데이터 없음',
    'common.yes': '예',
    'common.no': '아니요',
    'common.copy': '복사',
    'menu.dashboard.aiAssetAnalysis': 'AI 스마트 분석',
    'menu.dashboard.strategyIde': '전략 개발',
    'menu.dashboard.brokerAccounts': '브로커 계정',
    'menu.dashboard.settings': '설정',
    'aiAnalysis.quickCards.diagnose.title': '종목 진단',
    'aiAnalysis.quickCards.chart.title': '차트 진단',
    'aiAnalysis.quickCards.strategy.title': '전략 개발',
    'aiAnalysis.quickCards.schedule.title': '예약 추적',
    'aiAnalysis.quickCards.news.title': '뉴스/이벤트 검색',
    'aiAnalysis.quickCards.logs.title': '로그 조사',
    'aiAnalysis.quickCards.macro.title': '거시경제 데이터',
    'aiAnalysis.quickCards.opportunity.title': '기회 탐색'
  },
  'ru-RU': {
    'navBar.lang': 'Язык',
    submit: 'Отправить',
    save: 'Сохранить',
    'submit.ok': 'Успешно отправлено',
    'save.ok': 'Успешно сохранено',
    'common.confirm': 'Подтвердить',
    'common.cancel': 'Отмена',
    'common.save': 'Сохранить',
    'common.delete': 'Удалить',
    'common.edit': 'Изменить',
    'common.add': 'Добавить',
    'common.close': 'Закрыть',
    'common.done': 'Готово',
    'common.ok': 'OK',
    'common.loading': 'Загрузка...',
    'common.noData': 'Нет данных',
    'common.yes': 'Да',
    'common.no': 'Нет',
    'common.copy': 'Копировать',
    'menu.dashboard.aiAssetAnalysis': 'AI-анализ',
    'menu.dashboard.strategyIde': 'Разработка стратегий',
    'menu.dashboard.brokerAccounts': 'Брокерские счета',
    'menu.dashboard.settings': 'Настройки',
    'aiAnalysis.quickCards.diagnose.title': 'Диагностика инструмента',
    'aiAnalysis.quickCards.chart.title': 'Диагностика графика',
    'aiAnalysis.quickCards.strategy.title': 'Разработка стратегии',
    'aiAnalysis.quickCards.schedule.title': 'Плановый мониторинг',
    'aiAnalysis.quickCards.news.title': 'Поиск новостей/событий',
    'aiAnalysis.quickCards.logs.title': 'Проверка журналов',
    'aiAnalysis.quickCards.macro.title': 'Макроданные',
    'aiAnalysis.quickCards.opportunity.title': 'Поиск возможностей'
  },
  'th-TH': {
    'navBar.lang': 'ภาษา',
    submit: 'ส่ง',
    save: 'บันทึก',
    'submit.ok': 'ส่งสำเร็จ',
    'save.ok': 'บันทึกสำเร็จ',
    'common.confirm': 'ยืนยัน',
    'common.cancel': 'ยกเลิก',
    'common.save': 'บันทึก',
    'common.delete': 'ลบ',
    'common.edit': 'แก้ไข',
    'common.add': 'เพิ่ม',
    'common.close': 'ปิด',
    'common.done': 'เสร็จสิ้น',
    'common.ok': 'ตกลง',
    'common.loading': 'กำลังโหลด...',
    'common.noData': 'ไม่มีข้อมูล',
    'common.yes': 'ใช่',
    'common.no': 'ไม่',
    'common.copy': 'คัดลอก',
    'menu.dashboard.aiAssetAnalysis': 'วิเคราะห์อัจฉริยะ AI',
    'menu.dashboard.strategyIde': 'พัฒนากลยุทธ์',
    'menu.dashboard.brokerAccounts': 'บัญชีโบรกเกอร์',
    'menu.dashboard.settings': 'ตั้งค่า',
    'aiAnalysis.quickCards.diagnose.title': 'วิเคราะห์สินทรัพย์',
    'aiAnalysis.quickCards.chart.title': 'วิเคราะห์กราฟ',
    'aiAnalysis.quickCards.strategy.title': 'พัฒนากลยุทธ์',
    'aiAnalysis.quickCards.schedule.title': 'ติดตามตามเวลา',
    'aiAnalysis.quickCards.news.title': 'ค้นหาข่าว/เหตุการณ์',
    'aiAnalysis.quickCards.logs.title': 'ตรวจสอบบันทึก',
    'aiAnalysis.quickCards.macro.title': 'ข้อมูลเศรษฐกิจมหภาค',
    'aiAnalysis.quickCards.opportunity.title': 'ค้นหาโอกาส'
  },
  'vi-VN': {
    'navBar.lang': 'Ngôn ngữ',
    submit: 'Gửi',
    save: 'Lưu',
    'submit.ok': 'Gửi thành công',
    'save.ok': 'Đã lưu thành công',
    'common.confirm': 'Xác nhận',
    'common.cancel': 'Hủy',
    'common.save': 'Lưu',
    'common.delete': 'Xóa',
    'common.edit': 'Sửa',
    'common.add': 'Thêm',
    'common.close': 'Đóng',
    'common.done': 'Xong',
    'common.ok': 'OK',
    'common.loading': 'Đang tải...',
    'common.noData': 'Không có dữ liệu',
    'common.yes': 'Có',
    'common.no': 'Không',
    'common.copy': 'Sao chép',
    'menu.dashboard.aiAssetAnalysis': 'Phân tích AI thông minh',
    'menu.dashboard.strategyIde': 'Phát triển chiến lược',
    'menu.dashboard.brokerAccounts': 'Tài khoản môi giới',
    'menu.dashboard.settings': 'Cài đặt',
    'aiAnalysis.quickCards.diagnose.title': 'Chẩn đoán mã',
    'aiAnalysis.quickCards.chart.title': 'Chẩn đoán biểu đồ',
    'aiAnalysis.quickCards.strategy.title': 'Phát triển chiến lược',
    'aiAnalysis.quickCards.schedule.title': 'Theo dõi định kỳ',
    'aiAnalysis.quickCards.news.title': 'Tìm tin tức/sự kiện',
    'aiAnalysis.quickCards.logs.title': 'Kiểm tra nhật ký',
    'aiAnalysis.quickCards.macro.title': 'Dữ liệu vĩ mô',
    'aiAnalysis.quickCards.opportunity.title': 'Tìm cơ hội'
  },
  'zh-TW': {
    'navBar.lang': '語言',
    submit: '提交',
    save: '儲存',
    'submit.ok': '提交成功',
    'save.ok': '儲存成功',
    'common.confirm': '確認',
    'common.cancel': '取消',
    'common.save': '儲存',
    'common.delete': '刪除',
    'common.edit': '編輯',
    'common.add': '新增',
    'common.close': '關閉',
    'common.done': '完成',
    'common.ok': '確定',
    'common.loading': '載入中...',
    'common.noData': '暫無資料',
    'common.yes': '是',
    'common.no': '否',
    'common.copy': '複製',
    'menu.dashboard.aiAssetAnalysis': 'AI 智能分析',
    'menu.dashboard.strategyIde': '策略研發',
    'menu.dashboard.brokerAccounts': '券商帳戶',
    'menu.dashboard.settings': '系統設定',
    'aiAnalysis.quickCards.diagnose.title': '診斷標的',
    'aiAnalysis.quickCards.chart.title': '看圖診斷',
    'aiAnalysis.quickCards.strategy.title': '策略研發',
    'aiAnalysis.quickCards.schedule.title': '定時跟蹤',
    'aiAnalysis.quickCards.news.title': '新聞/事件檢索',
    'aiAnalysis.quickCards.logs.title': '排查日誌',
    'aiAnalysis.quickCards.macro.title': '宏觀經濟資料',
    'aiAnalysis.quickCards.opportunity.title': '機會雷達'
  }
}

function extractLocaleObject(source, fileName) {
  const marker = 'const locale ='
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) throw new Error(`${fileName}: missing "const locale ="`)

  const start = source.indexOf('{', markerIndex)
  if (start < 0) throw new Error(`${fileName}: missing locale object start`)

  let depth = 0
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (lineComment) {
      if (char === '\n') lineComment = false
      continue
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }

    if (quote) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = null
      }
      continue
    }

    if (char === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }

    if (char === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }

    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }

  throw new Error(`${fileName}: missing locale object end`)
}

function loadLocale(localeName) {
  const fileName = `${localeName}.js`
  const source = readFileSync(join(langDir, fileName), 'utf8')
  const objectSource = extractLocaleObject(source, fileName)
  return vm.runInNewContext(`(${objectSource})`, {}, { filename: fileName })
}

function escapeKey(key) {
  return JSON.stringify(key)
}

function renderLocaleObject(locale) {
  return Object.entries(locale)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  ${escapeKey(key)}: ${JSON.stringify(value)}`)
    .join(',\n')
}

function buildLocale(target, bases) {
  const spec = specs[target]
  const base = {}
  for (const baseName of spec.bases || [spec.base]) {
    Object.assign(base, bases[baseName])
  }
  return {
    ...base,
    ...(translationPacks[target] || {})
  }
}

const bases = {
  'en-US': loadLocale('en-US'),
  'zh-CN': loadLocale('zh-CN')
}

for (const [localeName, spec] of Object.entries(specs)) {
  const locale = buildLocale(localeName, bases)
  const body = `import ${spec.antdVar} from '${spec.antdPath}'
import ${spec.momentVar} from '${spec.momentPath}'

const components = {
  antLocale: ${spec.antdVar},
  momentName: '${spec.momentName}',
  momentLocale: ${spec.momentVar}
}

const locale = {
${renderLocaleObject(locale)}
}

export default {
  ...components,
  ...locale
}
`

  writeFileSync(join(langDir, `${localeName}.js`), body, 'utf8')
}

console.log(`Generated ${Object.keys(specs).length} complete locale files.`)
