const en = {
  'eventRadar.tab': 'Events',
  'eventRadar.title': 'Event Radar',
  'eventRadar.referenceOnly': 'News and macro impact for reference only. It never blocks or submits an order.',
  'eventRadar.masterDisabled': 'Event Radar is disabled by the system administrator.',
  'eventRadar.localDisabled': 'Event Radar is off. Turn it on when you want an event analysis.',
  'eventRadar.costHint': 'Each new analysis uses {cost} credits',
  'eventRadar.sourceUpgradeHint': 'Stock news sources were improved. Refresh once at no charge.',
  'eventRadar.run': 'Analyze events',
  'eventRadar.rerun': 'Analyze again',
  'eventRadar.noAnalysis': 'No event analysis for this instrument yet.',
  'eventRadar.noEvents': 'No relevant event sources were returned.',
  'eventRadar.confidence': 'confidence',
  'eventRadar.impact': 'Impact',
  'eventRadar.relevance': 'Relevance',
  'eventRadar.freshness': 'Freshness',
  'eventRadar.news': 'News',
  'eventRadar.macro': 'Macro',
  'eventRadar.filing': 'SEC filing',
  'eventRadar.macroType.inflation': 'Inflation data',
  'eventRadar.macroType.central_bank': 'Central bank decision or speech',
  'eventRadar.macroType.jobs': 'Employment data',
  'eventRadar.macroType.growth': 'Economic growth data',
  'eventRadar.macroType.macro': 'Macro event',
  'eventRadar.metric.actual': 'actual',
  'eventRadar.metric.forecast': 'forecast',
  'eventRadar.metric.previous': 'previous',
  'eventRadar.viewSource': 'Source',
  'eventRadar.charged': '{cost} credits used',
  'eventRadar.completed': 'Event analysis completed',
  'eventRadar.failed': 'Event analysis is temporarily unavailable. Any incomplete charge is refunded.',
  'eventRadar.insufficientCredits': 'Insufficient credits for this analysis.',
  'eventRadar.generatedSummary': '{direction} event signal with {impact} impact and {relevance} relevance. Use it as supporting context only.',
  'eventRadar.direction.bullish': 'Bullish',
  'eventRadar.direction.bearish': 'Bearish',
  'eventRadar.direction.neutral': 'Neutral',
  'eventRadar.direction.mixed': 'Mixed',
  'eventRadar.level.high': 'High',
  'eventRadar.level.medium': 'Medium',
  'eventRadar.level.low': 'Low',
  'eventRadar.freshnessValue.fresh': 'Fresh',
  'eventRadar.freshnessValue.mixed': 'Mixed',
  'eventRadar.freshnessValue.stale': 'Stale',
  'settings.field.EVENT_RADAR_ENABLED': 'Enable Event Radar',
  'settings.desc.EVENT_RADAR_ENABLED': 'Makes the reference-only Event Radar available in Quick Trade.',
  'settings.field.EVENT_RADAR_JEV_MIN_CONFIDENCE': 'Event Radar JEV Minimum Confidence',
  'settings.desc.EVENT_RADAR_JEV_MIN_CONFIDENCE': 'Falls back to the configured LLM when any key JEV classification is below this value.',
  'settings.field.EVENT_RADAR_NEWS_LOOKBACK_DAYS': 'Event Radar News Lookback (days)',
  'settings.desc.EVENT_RADAR_NEWS_LOOKBACK_DAYS': 'How many recent days the reusable search providers scan for instrument news.',
  'settings.field.EVENT_RADAR_MAX_EVENTS': 'Event Radar Maximum Events',
  'settings.desc.EVENT_RADAR_MAX_EVENTS': 'Maximum combined news and macro items sent to the classifier.',
  'settings.field.EVENT_RADAR_CRYPTO_RSS_ENABLED': 'Enable Crypto News Feed',
  'settings.desc.EVENT_RADAR_CRYPTO_RSS_ENABLED': 'Adds direct cryptocurrency news from a free RSS feed and filters it by the selected asset.',
  'settings.field.EVENT_RADAR_YAHOO_FINANCE_RSS_ENABLED': 'Enable US Stock News Feed',
  'settings.desc.EVENT_RADAR_YAHOO_FINANCE_RSS_ENABLED': 'Adds ticker-specific US stock news from the free Yahoo Finance RSS feed.',
  'settings.field.EVENT_RADAR_SEC_EDGAR_ENABLED': 'Enable SEC EDGAR Filings',
  'settings.desc.EVENT_RADAR_SEC_EDGAR_ENABLED': 'Adds recent material SEC filings when the selected instrument is a US stock.',
  'settings.field.SEC_EDGAR_USER_AGENT': 'SEC EDGAR User Agent',
  'settings.desc.SEC_EDGAR_USER_AGENT': 'Optional declared application name and contact email for SEC requests. When empty, the configured support email is used.',
  'settings.field.BILLING_COST_EVENT_RADAR': 'Event Radar Cost',
  'settings.desc.BILLING_COST_EVENT_RADAR': 'Credits consumed for each completed Event Radar analysis.'
}

const zhCN = {
  ...en,
  'eventRadar.tab': '事件雷达',
  'eventRadar.title': '事件雷达',
  'eventRadar.referenceOnly': '新闻和宏观影响仅供参考，不会拦截或提交订单。',
  'eventRadar.masterDisabled': '系统管理员已关闭事件雷达。',
  'eventRadar.localDisabled': '事件雷达已关闭，需要分析时可随时开启。',
  'eventRadar.costHint': '每次新分析消耗 {cost} 积分',
  'eventRadar.sourceUpgradeHint': '美股新闻源已改进，本次刷新不扣积分。',
  'eventRadar.run': '分析当前事件',
  'eventRadar.rerun': '重新分析',
  'eventRadar.noAnalysis': '当前标的还没有事件分析。',
  'eventRadar.noEvents': '暂未获取到相关事件来源。',
  'eventRadar.confidence': '置信度',
  'eventRadar.impact': '影响程度',
  'eventRadar.relevance': '相关性',
  'eventRadar.freshness': '时效性',
  'eventRadar.news': '新闻',
  'eventRadar.macro': '宏观',
  'eventRadar.filing': 'SEC 公告',
  'eventRadar.macroType.inflation': '通胀数据',
  'eventRadar.macroType.central_bank': '央行决议或讲话',
  'eventRadar.macroType.jobs': '就业数据',
  'eventRadar.macroType.growth': '经济增长数据',
  'eventRadar.macroType.macro': '宏观事件',
  'eventRadar.metric.actual': '实际值',
  'eventRadar.metric.forecast': '预期值',
  'eventRadar.metric.previous': '前值',
  'eventRadar.viewSource': '查看来源',
  'eventRadar.charged': '已消耗 {cost} 积分',
  'eventRadar.completed': '事件分析已完成',
  'eventRadar.failed': '事件分析暂时不可用，未完成的扣费会自动退回。',
  'eventRadar.insufficientCredits': '积分不足，无法进行本次分析。',
  'eventRadar.generatedSummary': '事件信号为{direction}，影响程度{impact}，相关性{relevance}。请仅作为开仓判断的辅助信息。',
  'eventRadar.direction.bullish': '利多',
  'eventRadar.direction.bearish': '利空',
  'eventRadar.direction.neutral': '中性',
  'eventRadar.direction.mixed': '多空交织',
  'eventRadar.level.high': '高',
  'eventRadar.level.medium': '中',
  'eventRadar.level.low': '低',
  'eventRadar.freshnessValue.fresh': '最新',
  'eventRadar.freshnessValue.mixed': '部分较新',
  'eventRadar.freshnessValue.stale': '较旧',
  'settings.field.EVENT_RADAR_ENABLED': '开启事件雷达',
  'settings.desc.EVENT_RADAR_ENABLED': '在闪电交易中提供仅供参考的事件雷达。',
  'settings.field.EVENT_RADAR_JEV_MIN_CONFIDENCE': '事件雷达 JEV 最低置信度',
  'settings.desc.EVENT_RADAR_JEV_MIN_CONFIDENCE': '任一关键 JEV 判断低于此值时，自动转由已配置的 LLM 复核。',
  'settings.field.EVENT_RADAR_NEWS_LOOKBACK_DAYS': '事件雷达新闻回溯天数',
  'settings.desc.EVENT_RADAR_NEWS_LOOKBACK_DAYS': '复用搜索源查询当前标的近期新闻的天数。',
  'settings.field.EVENT_RADAR_MAX_EVENTS': '事件雷达最大事件数',
  'settings.desc.EVENT_RADAR_MAX_EVENTS': '单次发送给模型的新闻和宏观事件总数上限。',
  'settings.field.EVENT_RADAR_CRYPTO_RSS_ENABLED': '启用加密货币新闻源',
  'settings.desc.EVENT_RADAR_CRYPTO_RSS_ENABLED': '接入免费 RSS 加密新闻，并按当前选择的币种严格过滤。',
  'settings.field.EVENT_RADAR_YAHOO_FINANCE_RSS_ENABLED': '启用美股新闻源',
  'settings.desc.EVENT_RADAR_YAHOO_FINANCE_RSS_ENABLED': '接入免费的 Yahoo Finance RSS，并按当前美股代码获取公司相关新闻。',
  'settings.field.EVENT_RADAR_SEC_EDGAR_ENABLED': '启用 SEC EDGAR 公告',
  'settings.desc.EVENT_RADAR_SEC_EDGAR_ENABLED': '当前标的是美股时，接入近期重要 SEC 公告。',
  'settings.field.SEC_EDGAR_USER_AGENT': 'SEC EDGAR 请求标识',
  'settings.desc.SEC_EDGAR_USER_AGENT': '可填写应用名称和联系邮箱；留空时使用系统配置的支持邮箱。',
  'settings.field.BILLING_COST_EVENT_RADAR': '事件雷达单次消耗',
  'settings.desc.BILLING_COST_EVENT_RADAR': '每次完成事件雷达分析消耗的积分数。'
}

const zhTW = {
  ...zhCN,
  'eventRadar.tab': '事件雷達',
  'eventRadar.title': '事件雷達',
  'eventRadar.referenceOnly': '新聞和宏觀影響僅供參考，不會攔截或提交訂單。',
  'eventRadar.masterDisabled': '系統管理員已關閉事件雷達。',
  'eventRadar.localDisabled': '事件雷達已關閉，需要分析時可隨時開啟。',
  'eventRadar.costHint': '每次新分析消耗 {cost} 積分',
  'eventRadar.sourceUpgradeHint': '美股新聞來源已改善，本次重新整理不扣積分。',
  'eventRadar.run': '分析目前事件',
  'eventRadar.rerun': '重新分析',
  'eventRadar.noAnalysis': '目前標的尚無事件分析。',
  'eventRadar.noEvents': '暫未取得相關事件來源。',
  'eventRadar.confidence': '置信度',
  'eventRadar.impact': '影響程度',
  'eventRadar.relevance': '相關性',
  'eventRadar.freshness': '時效性',
  'eventRadar.news': '新聞',
  'eventRadar.macro': '宏觀',
  'eventRadar.filing': 'SEC 公告',
  'eventRadar.macroType.inflation': '通膨資料',
  'eventRadar.macroType.central_bank': '央行決議或談話',
  'eventRadar.macroType.jobs': '就業資料',
  'eventRadar.macroType.growth': '經濟成長資料',
  'eventRadar.macroType.macro': '宏觀事件',
  'eventRadar.metric.actual': '實際值',
  'eventRadar.metric.forecast': '預期值',
  'eventRadar.metric.previous': '前值',
  'eventRadar.viewSource': '查看來源',
  'eventRadar.charged': '已消耗 {cost} 積分',
  'eventRadar.completed': '事件分析已完成',
  'eventRadar.failed': '事件分析暫時無法使用，未完成的扣費會自動退回。',
  'eventRadar.insufficientCredits': '積分不足，無法進行本次分析。',
  'eventRadar.generatedSummary': '事件訊號為{direction}，影響程度{impact}，相關性{relevance}。請僅作為開倉判斷的輔助資訊。',
  'eventRadar.direction.bullish': '利多',
  'eventRadar.direction.bearish': '利空',
  'eventRadar.direction.neutral': '中性',
  'eventRadar.direction.mixed': '多空交織',
  'eventRadar.level.high': '高',
  'eventRadar.level.medium': '中',
  'eventRadar.level.low': '低',
  'eventRadar.freshnessValue.fresh': '最新',
  'eventRadar.freshnessValue.mixed': '部分較新',
  'eventRadar.freshnessValue.stale': '較舊',
  'settings.field.EVENT_RADAR_ENABLED': '開啟事件雷達',
  'settings.desc.EVENT_RADAR_ENABLED': '在閃電交易中提供僅供參考的事件雷達。',
  'settings.field.EVENT_RADAR_JEV_MIN_CONFIDENCE': '事件雷達 JEV 最低置信度',
  'settings.desc.EVENT_RADAR_JEV_MIN_CONFIDENCE': '任一關鍵 JEV 判斷低於此值時，自動改由已設定的 LLM 複核。',
  'settings.field.EVENT_RADAR_NEWS_LOOKBACK_DAYS': '事件雷達新聞回溯天數',
  'settings.desc.EVENT_RADAR_NEWS_LOOKBACK_DAYS': '重複使用搜尋來源查詢目前標的近期新聞的天數。',
  'settings.field.EVENT_RADAR_MAX_EVENTS': '事件雷達最大事件數',
  'settings.desc.EVENT_RADAR_MAX_EVENTS': '單次傳送給模型的新聞和宏觀事件總數上限。',
  'settings.field.EVENT_RADAR_CRYPTO_RSS_ENABLED': '啟用加密貨幣新聞來源',
  'settings.desc.EVENT_RADAR_CRYPTO_RSS_ENABLED': '接入免費 RSS 加密新聞，並依目前選擇的幣種嚴格篩選。',
  'settings.field.EVENT_RADAR_YAHOO_FINANCE_RSS_ENABLED': '啟用美股新聞來源',
  'settings.desc.EVENT_RADAR_YAHOO_FINANCE_RSS_ENABLED': '接入免費的 Yahoo Finance RSS，並依目前美股代碼取得公司相關新聞。',
  'settings.field.EVENT_RADAR_SEC_EDGAR_ENABLED': '啟用 SEC EDGAR 公告',
  'settings.desc.EVENT_RADAR_SEC_EDGAR_ENABLED': '目前標的是美股時，接入近期重要 SEC 公告。',
  'settings.field.SEC_EDGAR_USER_AGENT': 'SEC EDGAR 請求識別',
  'settings.desc.SEC_EDGAR_USER_AGENT': '可填寫應用程式名稱和聯絡信箱；留空時使用系統設定的支援信箱。',
  'settings.field.BILLING_COST_EVENT_RADAR': '事件雷達單次消耗',
  'settings.desc.BILLING_COST_EVENT_RADAR': '每次完成事件雷達分析消耗的積分數。'
}

const eventKeys = Object.keys(en)

const localizedValues = {
  'de-DE': [
    'Ereignisse', 'Ereignisradar', 'Nachrichten und Makroauswirkungen dienen nur als Referenz. Sie blockieren oder senden keine Order.', 'Der Ereignisradar wurde vom Systemadministrator deaktiviert.', 'Der Ereignisradar ist ausgeschaltet. Aktivieren Sie ihn für eine Ereignisanalyse.', 'Jede neue Analyse verbraucht {cost} Credits', 'Die Quellen für Aktiennachrichten wurden verbessert. Einmal kostenlos aktualisieren.', 'Ereignisse analysieren', 'Erneut analysieren', 'Für dieses Instrument liegt noch keine Ereignisanalyse vor.', 'Es wurden keine relevanten Ereignisquellen gefunden.', 'Konfidenz', 'Auswirkung', 'Relevanz', 'Aktualität', 'Nachricht', 'Makro', 'SEC-Meldung', 'Inflationsdaten', 'Zentralbankentscheidung oder -rede', 'Arbeitsmarktdaten', 'Wirtschaftswachstum', 'Makroereignis', 'Istwert', 'Prognose', 'Vorwert', 'Quelle', '{cost} Credits verbraucht', 'Ereignisanalyse abgeschlossen', 'Die Ereignisanalyse ist vorübergehend nicht verfügbar. Nicht abgeschlossene Abbuchungen werden erstattet.', 'Nicht genügend Credits für diese Analyse.', '{direction} Ereignissignal mit {impact} Auswirkung und {relevance} Relevanz. Nur als ergänzenden Kontext verwenden.', 'Bullisch', 'Bärisch', 'Neutral', 'Gemischt', 'Hoch', 'Mittel', 'Niedrig', 'Aktuell', 'Gemischt', 'Veraltet', 'Ereignisradar aktivieren', 'Stellt den nur zur Referenz dienenden Ereignisradar im Schnellhandel bereit.', 'Minimale JEV-Konfidenz des Ereignisradars', 'Wechselt zum konfigurierten LLM, wenn eine wichtige JEV-Klassifizierung unter diesem Wert liegt.', 'Nachrichtenrückblick des Ereignisradars (Tage)', 'Anzahl der letzten Tage, die wiederverwendete Suchanbieter nach instrumentbezogenen Nachrichten durchsuchen.', 'Maximale Ereigniszahl des Ereignisradars', 'Maximale Gesamtzahl aus Nachrichten und Makroereignissen, die an den Klassifikator gesendet wird.', 'Krypto-Nachrichtenfeed aktivieren', 'Fügt direkte Kryptowährungsnachrichten aus einem kostenlosen RSS-Feed hinzu und filtert nach dem ausgewählten Asset.', 'US-Aktiennachrichten aktivieren', 'Fügt tickerbezogene US-Aktiennachrichten aus dem kostenlosen Yahoo-Finance-RSS-Feed hinzu.', 'SEC-EDGAR-Meldungen aktivieren', 'Fügt aktuelle wesentliche SEC-Meldungen hinzu, wenn eine US-Aktie ausgewählt ist.', 'SEC-EDGAR User-Agent', 'Optionale Anwendungsbezeichnung und Kontakt-E-Mail für SEC-Anfragen. Leer verwendet die konfigurierte Support-E-Mail.', 'Kosten des Ereignisradars', 'Credits pro abgeschlossener Ereignisradar-Analyse.'
  ],
  'fr-FR': [
    'Événements', 'Radar événementiel', 'Les actualités et leur impact macroéconomique sont fournis à titre indicatif. Ils ne bloquent ni n’envoient aucun ordre.', 'Le radar événementiel a été désactivé par l’administrateur système.', 'Le radar événementiel est désactivé. Activez-le lorsque vous souhaitez lancer une analyse.', 'Chaque nouvelle analyse utilise {cost} crédits', 'Les sources d’actualités boursières ont été améliorées. Actualisez une fois sans frais.', 'Analyser les événements', 'Analyser à nouveau', 'Aucune analyse événementielle pour cet instrument.', 'Aucune source événementielle pertinente n’a été trouvée.', 'confiance', 'Impact', 'Pertinence', 'Actualité', 'Actualité', 'Macro', 'Dépôt SEC', 'Données d’inflation', 'Décision ou discours de banque centrale', 'Données sur l’emploi', 'Données de croissance économique', 'Événement macroéconomique', 'réel', 'prévision', 'précédent', 'Source', '{cost} crédits utilisés', 'Analyse événementielle terminée', 'L’analyse événementielle est temporairement indisponible. Tout débit inachevé est remboursé.', 'Crédits insuffisants pour cette analyse.', 'Signal événementiel {direction}, avec un impact {impact} et une pertinence {relevance}. À utiliser uniquement comme contexte complémentaire.', 'Haussier', 'Baissier', 'Neutre', 'Mitigé', 'Élevé', 'Moyen', 'Faible', 'Récent', 'Mitigé', 'Ancien', 'Activer le radar événementiel', 'Rend disponible dans le trading rapide le radar événementiel fourni à titre indicatif.', 'Confiance JEV minimale du radar', 'Utilise le LLM configuré lorsqu’une classification JEV importante est inférieure à cette valeur.', 'Historique des actualités du radar (jours)', 'Nombre de jours récents analysés par les fournisseurs de recherche réutilisables pour les actualités de l’instrument.', 'Nombre maximal d’événements', 'Nombre maximal cumulé d’actualités et d’événements macroéconomiques envoyé au classificateur.', 'Activer le flux d’actualités crypto', 'Ajoute des actualités directes sur les cryptomonnaies depuis un flux RSS gratuit et les filtre selon l’actif choisi.', 'Activer le flux d’actualités des actions US', 'Ajoute des actualités sur les actions US propres au symbole depuis le flux RSS gratuit de Yahoo Finance.', 'Activer les dépôts SEC EDGAR', 'Ajoute les dépôts SEC importants récents lorsque l’instrument sélectionné est une action US.', 'Agent utilisateur SEC EDGAR', 'Nom d’application et e-mail de contact facultatifs pour les requêtes SEC. Si vide, l’e-mail d’assistance configuré est utilisé.', 'Coût du radar événementiel', 'Crédits consommés pour chaque analyse événementielle terminée.'
  ],
  'ja-JP': [
    'イベント', 'イベントレーダー', 'ニュースとマクロ経済への影響は参考情報です。注文のブロックや送信は行いません。', 'システム管理者がイベントレーダーを無効にしています。', 'イベントレーダーはオフです。分析するときにオンにしてください。', '新しい分析ごとに {cost} クレジットを使用します', '株式ニュースソースを改善しました。1 回無料で更新できます。', 'イベントを分析', '再分析', 'この銘柄のイベント分析はまだありません。', '関連するイベントソースが見つかりませんでした。', '信頼度', '影響度', '関連性', '鮮度', 'ニュース', 'マクロ', 'SEC 提出書類', 'インフレ指標', '中央銀行の決定または発言', '雇用指標', '経済成長指標', 'マクロイベント', '実績', '予想', '前回', 'ソース', '{cost} クレジットを使用', 'イベント分析が完了しました', 'イベント分析は一時的に利用できません。完了していない課金は返金されます。', 'この分析に必要なクレジットが不足しています。', '{direction} のイベントシグナルです。影響度は {impact}、関連性は {relevance} です。補助情報としてのみ使用してください。', '強気', '弱気', '中立', '混在', '高', '中', '低', '最新', '混在', '古い', 'イベントレーダーを有効化', 'クイック取引で参考情報用のイベントレーダーを利用できるようにします。', 'イベントレーダーの JEV 最低信頼度', '重要な JEV 分類がこの値を下回る場合、設定済みの LLM に切り替えます。', 'イベントレーダーのニュース参照期間（日）', '再利用可能な検索プロバイダーが銘柄ニュースを検索する直近の日数です。', 'イベントレーダーの最大イベント数', '分類器へ送信するニュースとマクロイベントの合計上限です。', '暗号資産ニュースフィードを有効化', '無料 RSS から暗号資産ニュースを追加し、選択中の資産で絞り込みます。', '米国株ニュースフィードを有効化', '無料の Yahoo Finance RSS から銘柄別の米国株ニュースを追加します。', 'SEC EDGAR 提出書類を有効化', '選択中の銘柄が米国株の場合、最近の重要な SEC 提出書類を追加します。', 'SEC EDGAR ユーザーエージェント', 'SEC リクエスト用のアプリ名と連絡先メールです。空欄の場合は設定済みのサポートメールを使用します。', 'イベントレーダーのコスト', 'イベントレーダー分析が完了するたびに消費するクレジット数です。'
  ],
  'ko-KR': [
    '이벤트', '이벤트 레이더', '뉴스와 거시경제 영향은 참고용입니다. 주문을 차단하거나 제출하지 않습니다.', '시스템 관리자가 이벤트 레이더를 비활성화했습니다.', '이벤트 레이더가 꺼져 있습니다. 분석이 필요할 때 켜세요.', '새 분석마다 {cost} 크레딧을 사용합니다', '주식 뉴스 소스를 개선했습니다. 한 번 무료로 새로 고칠 수 있습니다.', '이벤트 분석', '다시 분석', '이 종목의 이벤트 분석이 아직 없습니다.', '관련 이벤트 소스를 찾지 못했습니다.', '신뢰도', '영향', '관련성', '최신성', '뉴스', '거시경제', 'SEC 공시', '인플레이션 지표', '중앙은행 결정 또는 발언', '고용 지표', '경제 성장 지표', '거시경제 이벤트', '실제', '예상', '이전', '출처', '{cost} 크레딧 사용', '이벤트 분석 완료', '이벤트 분석을 일시적으로 사용할 수 없습니다. 완료되지 않은 차감은 환불됩니다.', '이 분석에 필요한 크레딧이 부족합니다.', '{direction} 이벤트 신호이며 영향은 {impact}, 관련성은 {relevance}입니다. 보조 정보로만 사용하세요.', '강세', '약세', '중립', '혼조', '높음', '보통', '낮음', '최신', '혼재', '오래됨', '이벤트 레이더 사용', '빠른 거래에서 참고용 이벤트 레이더를 사용할 수 있게 합니다.', '이벤트 레이더 JEV 최소 신뢰도', '핵심 JEV 분류가 이 값보다 낮으면 설정된 LLM으로 전환합니다.', '이벤트 레이더 뉴스 조회 기간(일)', '재사용 검색 공급자가 종목 뉴스를 조회할 최근 일수입니다.', '이벤트 레이더 최대 이벤트 수', '분류기에 전달할 뉴스와 거시경제 이벤트의 최대 합계입니다.', '암호화폐 뉴스 피드 사용', '무료 RSS에서 암호화폐 뉴스를 추가하고 선택한 자산으로 필터링합니다.', '미국 주식 뉴스 피드 사용', '무료 Yahoo Finance RSS에서 종목별 미국 주식 뉴스를 추가합니다.', 'SEC EDGAR 공시 사용', '선택한 종목이 미국 주식이면 최근 주요 SEC 공시를 추가합니다.', 'SEC EDGAR 사용자 에이전트', 'SEC 요청에 사용할 선택적 앱 이름과 연락처 이메일입니다. 비어 있으면 설정된 지원 이메일을 사용합니다.', '이벤트 레이더 비용', '완료된 이벤트 레이더 분석마다 소비되는 크레딧입니다.'
  ],
  'ru-RU': [
    'События', 'Радар событий', 'Новости и макроэкономическое влияние приводятся только для справки. Они не блокируют и не отправляют ордера.', 'Радар событий отключён системным администратором.', 'Радар событий выключен. Включите его, когда понадобится анализ.', 'Каждый новый анализ расходует {cost} кредитов', 'Источники новостей по акциям улучшены. Один раз обновите бесплатно.', 'Анализировать события', 'Анализировать снова', 'Для этого инструмента ещё нет анализа событий.', 'Релевантные источники событий не найдены.', 'уверенность', 'Влияние', 'Релевантность', 'Актуальность', 'Новость', 'Макро', 'Документ SEC', 'Данные по инфляции', 'Решение или выступление центрального банка', 'Данные по занятости', 'Данные по экономическому росту', 'Макроэкономическое событие', 'факт', 'прогноз', 'предыдущее', 'Источник', 'Использовано кредитов: {cost}', 'Анализ событий завершён', 'Анализ событий временно недоступен. Незавершённое списание будет возвращено.', 'Недостаточно кредитов для этого анализа.', 'Сигнал события: {direction}, влияние: {impact}, релевантность: {relevance}. Используйте только как дополнительный контекст.', 'Бычий', 'Медвежий', 'Нейтральный', 'Смешанный', 'Высокое', 'Среднее', 'Низкое', 'Свежие', 'Смешанные', 'Устаревшие', 'Включить радар событий', 'Делает справочный радар событий доступным в быстрой торговле.', 'Минимальная уверенность JEV для радара', 'Переходит к настроенной LLM, если важная классификация JEV ниже этого значения.', 'Глубина новостей радара (дни)', 'Количество последних дней, за которые повторно используемые поисковые провайдеры проверяют новости по инструменту.', 'Максимум событий в радаре', 'Максимальное суммарное число новостей и макрособытий, отправляемых классификатору.', 'Включить ленту криптоновостей', 'Добавляет новости о криптовалютах из бесплатной RSS-ленты и фильтрует их по выбранному активу.', 'Включить новости по акциям США', 'Добавляет новости по тикеру акции США из бесплатной RSS-ленты Yahoo Finance.', 'Включить документы SEC EDGAR', 'Добавляет недавние существенные документы SEC, когда выбран инструмент рынка акций США.', 'User-Agent SEC EDGAR', 'Необязательное название приложения и контактный e-mail для запросов SEC. Если поле пусто, используется настроенный адрес поддержки.', 'Стоимость радара событий', 'Число кредитов за каждый завершённый анализ событий.'
  ],
  'th-TH': [
    'เหตุการณ์', 'เรดาร์เหตุการณ์', 'ข่าวและผลกระทบทางเศรษฐกิจมหภาคใช้เป็นข้อมูลอ้างอิงเท่านั้น ระบบจะไม่บล็อกหรือส่งคำสั่งซื้อขาย', 'ผู้ดูแลระบบปิดใช้งานเรดาร์เหตุการณ์', 'เรดาร์เหตุการณ์ปิดอยู่ เปิดใช้งานเมื่อต้องการวิเคราะห์เหตุการณ์', 'การวิเคราะห์ใหม่แต่ละครั้งใช้ {cost} เครดิต', 'ปรับปรุงแหล่งข่าวหุ้นแล้ว รีเฟรชได้ฟรีหนึ่งครั้ง', 'วิเคราะห์เหตุการณ์', 'วิเคราะห์อีกครั้ง', 'ยังไม่มีการวิเคราะห์เหตุการณ์สำหรับสินทรัพย์นี้', 'ไม่พบแหล่งข้อมูลเหตุการณ์ที่เกี่ยวข้อง', 'ความเชื่อมั่น', 'ผลกระทบ', 'ความเกี่ยวข้อง', 'ความสดใหม่', 'ข่าว', 'มหภาค', 'เอกสาร SEC', 'ข้อมูลเงินเฟ้อ', 'มติหรือถ้อยแถลงของธนาคารกลาง', 'ข้อมูลการจ้างงาน', 'ข้อมูลการเติบโตทางเศรษฐกิจ', 'เหตุการณ์มหภาค', 'ค่าจริง', 'คาดการณ์', 'ครั้งก่อน', 'แหล่งที่มา', 'ใช้แล้ว {cost} เครดิต', 'วิเคราะห์เหตุการณ์เสร็จแล้ว', 'การวิเคราะห์เหตุการณ์ไม่พร้อมใช้งานชั่วคราว ระบบจะคืนเครดิตที่หักไปแต่ไม่สำเร็จ', 'เครดิตไม่เพียงพอสำหรับการวิเคราะห์นี้', 'สัญญาณเหตุการณ์เป็น {direction} ผลกระทบ {impact} และความเกี่ยวข้อง {relevance} ใช้เป็นข้อมูลประกอบเท่านั้น', 'เชิงบวก', 'เชิงลบ', 'เป็นกลาง', 'ผสม', 'สูง', 'ปานกลาง', 'ต่ำ', 'ล่าสุด', 'ผสม', 'เก่า', 'เปิดใช้เรดาร์เหตุการณ์', 'เปิดให้ใช้เรดาร์เหตุการณ์แบบอ้างอิงในหน้าซื้อขายด่วน', 'ความเชื่อมั่น JEV ขั้นต่ำของเรดาร์', 'เปลี่ยนไปใช้ LLM ที่ตั้งค่าไว้เมื่อการจำแนก JEV สำคัญต่ำกว่าค่านี้', 'ช่วงย้อนหลังข่าวของเรดาร์ (วัน)', 'จำนวนวันล่าสุดที่ผู้ให้บริการค้นหาเดิมใช้ค้นข่าวของสินทรัพย์', 'จำนวนเหตุการณ์สูงสุดของเรดาร์', 'จำนวนรวมสูงสุดของข่าวและเหตุการณ์มหภาคที่ส่งให้ตัวจำแนก', 'เปิดใช้ฟีดข่าวคริปโท', 'เพิ่มข่าวคริปโทเคอร์เรนซีโดยตรงจาก RSS ฟรี และกรองตามสินทรัพย์ที่เลือก', 'เปิดใช้ฟีดข่าวหุ้นสหรัฐฯ', 'เพิ่มข่าวหุ้นสหรัฐฯ ตามสัญลักษณ์จาก Yahoo Finance RSS ฟรี', 'เปิดใช้เอกสาร SEC EDGAR', 'เพิ่มเอกสาร SEC สำคัญล่าสุดเมื่อสินทรัพย์ที่เลือกเป็นหุ้นสหรัฐฯ', 'User Agent ของ SEC EDGAR', 'ชื่อแอปและอีเมลติดต่อสำหรับคำขอ SEC แบบไม่บังคับ หากเว้นว่างจะใช้อีเมลฝ่ายสนับสนุนที่ตั้งค่าไว้', 'ค่าใช้จ่ายเรดาร์เหตุการณ์', 'เครดิตที่ใช้ต่อการวิเคราะห์เรดาร์เหตุการณ์ที่เสร็จสมบูรณ์'
  ],
  'vi-VN': [
    'Sự kiện', 'Radar sự kiện', 'Tin tức và tác động vĩ mô chỉ mang tính tham khảo. Tính năng này không chặn hoặc gửi lệnh.', 'Quản trị viên hệ thống đã tắt Radar sự kiện.', 'Radar sự kiện đang tắt. Hãy bật khi bạn muốn phân tích sự kiện.', 'Mỗi phân tích mới dùng {cost} tín dụng', 'Nguồn tin chứng khoán đã được cải thiện. Làm mới một lần miễn phí.', 'Phân tích sự kiện', 'Phân tích lại', 'Chưa có phân tích sự kiện cho công cụ này.', 'Không tìm thấy nguồn sự kiện liên quan.', 'độ tin cậy', 'Tác động', 'Mức liên quan', 'Độ mới', 'Tin tức', 'Vĩ mô', 'Hồ sơ SEC', 'Dữ liệu lạm phát', 'Quyết định hoặc phát biểu của ngân hàng trung ương', 'Dữ liệu việc làm', 'Dữ liệu tăng trưởng kinh tế', 'Sự kiện vĩ mô', 'thực tế', 'dự báo', 'trước đó', 'Nguồn', 'Đã dùng {cost} tín dụng', 'Đã hoàn tất phân tích sự kiện', 'Phân tích sự kiện tạm thời không khả dụng. Khoản trừ chưa hoàn tất sẽ được hoàn lại.', 'Không đủ tín dụng cho phân tích này.', 'Tín hiệu sự kiện {direction}, tác động {impact} và mức liên quan {relevance}. Chỉ dùng làm thông tin hỗ trợ.', 'Tăng giá', 'Giảm giá', 'Trung lập', 'Đan xen', 'Cao', 'Trung bình', 'Thấp', 'Mới', 'Đan xen', 'Cũ', 'Bật Radar sự kiện', 'Cho phép dùng Radar sự kiện chỉ để tham khảo trong Giao dịch nhanh.', 'Độ tin cậy JEV tối thiểu của Radar', 'Chuyển sang LLM đã cấu hình khi bất kỳ phân loại JEV quan trọng nào thấp hơn giá trị này.', 'Số ngày xem lại tin của Radar', 'Số ngày gần đây mà các nhà cung cấp tìm kiếm dùng lại quét tin tức về công cụ.', 'Số sự kiện tối đa của Radar', 'Tổng số tin tức và sự kiện vĩ mô tối đa được gửi tới bộ phân loại.', 'Bật nguồn tin tiền mã hóa', 'Thêm tin tiền mã hóa trực tiếp từ RSS miễn phí và lọc theo tài sản đã chọn.', 'Bật nguồn tin chứng khoán Mỹ', 'Thêm tin chứng khoán Mỹ theo mã từ nguồn Yahoo Finance RSS miễn phí.', 'Bật hồ sơ SEC EDGAR', 'Thêm các hồ sơ SEC quan trọng gần đây khi công cụ được chọn là cổ phiếu Mỹ.', 'User Agent SEC EDGAR', 'Tên ứng dụng và email liên hệ tùy chọn cho yêu cầu SEC. Nếu để trống, hệ thống dùng email hỗ trợ đã cấu hình.', 'Chi phí Radar sự kiện', 'Tín dụng dùng cho mỗi phân tích Radar sự kiện hoàn tất.'
  ],
  'ar-SA': [
    'الأحداث', 'رادار الأحداث', 'الأخبار وتأثيرات الاقتصاد الكلي مرجعية فقط. لا تحظر الأوامر ولا ترسلها.', 'عطّل مسؤول النظام رادار الأحداث.', 'رادار الأحداث متوقف. فعّله عندما تريد تحليل الأحداث.', 'يستهلك كل تحليل جديد {cost} من الرصيد', 'تم تحسين مصادر أخبار الأسهم. حدّث مرة واحدة دون تكلفة.', 'تحليل الأحداث', 'إعادة التحليل', 'لا يوجد تحليل أحداث لهذه الأداة بعد.', 'لم يتم العثور على مصادر أحداث ذات صلة.', 'الثقة', 'التأثير', 'الصلة', 'الحداثة', 'أخبار', 'اقتصاد كلي', 'إيداع SEC', 'بيانات التضخم', 'قرار أو خطاب بنك مركزي', 'بيانات التوظيف', 'بيانات النمو الاقتصادي', 'حدث اقتصادي كلي', 'الفعلي', 'المتوقع', 'السابق', 'المصدر', 'تم استخدام {cost} من الرصيد', 'اكتمل تحليل الأحداث', 'تحليل الأحداث غير متاح مؤقتًا. سيُعاد أي خصم لم يكتمل.', 'الرصيد غير كافٍ لهذا التحليل.', 'إشارة الحدث {direction} بتأثير {impact} وصلة {relevance}. استخدمها كمعلومة مساندة فقط.', 'صعودي', 'هبوطي', 'محايد', 'مختلط', 'مرتفع', 'متوسط', 'منخفض', 'حديث', 'مختلط', 'قديم', 'تفعيل رادار الأحداث', 'يتيح رادار الأحداث المرجعي في التداول السريع.', 'الحد الأدنى لثقة JEV في الرادار', 'يعود إلى نموذج LLM المضبوط عندما يقل أي تصنيف JEV أساسي عن هذه القيمة.', 'فترة مراجعة أخبار الرادار (أيام)', 'عدد الأيام الأخيرة التي تبحث فيها خدمات البحث القابلة لإعادة الاستخدام عن أخبار الأداة.', 'الحد الأقصى لأحداث الرادار', 'أقصى عدد إجمالي من الأخبار والأحداث الاقتصادية المرسلة إلى المصنف.', 'تفعيل موجز أخبار العملات الرقمية', 'يضيف أخبار العملات الرقمية مباشرة من موجز RSS مجاني ويصفيها حسب الأصل المختار.', 'تفعيل موجز أخبار الأسهم الأمريكية', 'يضيف أخبار الأسهم الأمريكية الخاصة بالرمز من موجز Yahoo Finance RSS المجاني.', 'تفعيل إيداعات SEC EDGAR', 'يضيف إيداعات SEC المهمة والحديثة عندما تكون الأداة المختارة سهمًا أمريكيًا.', 'وكيل مستخدم SEC EDGAR', 'اسم تطبيق وبريد تواصل اختياريان لطلبات SEC. عند تركه فارغًا يُستخدم بريد الدعم المضبوط.', 'تكلفة رادار الأحداث', 'الرصيد المستهلك لكل تحليل مكتمل في رادار الأحداث.'
  ]
}

const messages = {
  'en-US': en,
  'zh-CN': zhCN,
  'zh-TW': zhTW
}

Object.keys(localizedValues).forEach(code => {
  if (localizedValues[code].length !== eventKeys.length) {
    throw new Error(`Event Radar locale ${code} has ${localizedValues[code].length} values; expected ${eventKeys.length}`)
  }
  messages[code] = Object.fromEntries(eventKeys.map((key, index) => [key, localizedValues[code][index]]))
})

export default messages
