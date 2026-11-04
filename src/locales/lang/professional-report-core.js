const reportKeys = [
  'fastAnalysis.professionalReportTitle',
  'fastAnalysis.professionalTier',
  'fastAnalysis.communityTier',
  'fastAnalysis.dataQuality',
  'fastAnalysis.researchIntelligence',
  'fastAnalysis.researchWorkflow',
  'fastAnalysis.researchReadiness',
  'fastAnalysis.dataCoverage',
  'fastAnalysis.dataFreshness',
  'fastAnalysis.dataConflict',
  'fastAnalysis.conclusionStrength',
  'fastAnalysis.dataAsOf',
  'fastAnalysis.modelStrength',
  'fastAnalysis.marketBias',
  'fastAnalysis.tradeAction',
  'fastAnalysis.executiveSummary',
  'fastAnalysis.researchBrief',
  'fastAnalysis.coreThesis',
  'fastAnalysis.variantView',
  'fastAnalysis.monitoringChecklist',
  'fastAnalysis.monitoredCatalyst',
  'fastAnalysis.monitoredInvalidation',
  'fastAnalysis.instrumentTimezone',
  'fastAnalysis.analysisDimensions',
  'fastAnalysis.insufficientData',
  'fastAnalysis.noNarrative',
  'fastAnalysis.scenarioAnalysis',
  'fastAnalysis.invalidation',
  'fastAnalysis.riskPlan',
  'fastAnalysis.candidateSetup',
  'fastAnalysis.candidateSetupDescription',
  'fastAnalysis.missingData',
  'fastAnalysis.grossRiskReward',
  'fastAnalysis.netRiskReward',
  'fastAnalysis.riskBudget',
  'fastAnalysis.recommendedPosition',
  'fastAnalysis.estimatedCost',
  'fastAnalysis.evidenceClaims',
  'fastAnalysis.evidenceReferences',
  'fastAnalysis.viewEvidence',
  'fastAnalysis.reportContract',
  'fastAnalysis.reportId',
  'fastAnalysis.analysisTime',
  'fastAnalysis.entryPrice',
  'fastAnalysis.stopLoss',
  'fastAnalysis.takeProfit'
]

const mapReport = values => Object.fromEntries(reportKeys.map((key, index) => [key, values[index]]))

const cryptoSummary = (volume, bias, crowding) => ({
  'fastAnalysis.cryptoSummary.volume.expanding': volume[0],
  'fastAnalysis.cryptoSummary.volume.shrinking': volume[1],
  'fastAnalysis.cryptoSummary.volume.stable': volume[2],
  'fastAnalysis.cryptoSummary.volume.unknown': volume[3],
  'fastAnalysis.cryptoSummary.bias.bullish': bias[0],
  'fastAnalysis.cryptoSummary.bias.bearish': bias[1],
  'fastAnalysis.cryptoSummary.bias.neutral': bias[2],
  'fastAnalysis.cryptoSummary.crowding.high': crowding[0],
  'fastAnalysis.cryptoSummary.crowding.medium': crowding[1],
  'fastAnalysis.cryptoSummary.crowding.low': crowding[2],
  'fastAnalysis.cryptoSummary.crowding.unknown': crowding[3]
})

const dimensionKeys = (technical, fundamental, news, macro, crypto, marketSpecific) => ({
  'fastAnalysis.dimension.technical': technical,
  'fastAnalysis.dimension.fundamental': fundamental,
  'fastAnalysis.dimension.news_sentiment': news,
  'fastAnalysis.dimension.macro': macro,
  'fastAnalysis.dimension.crypto_market_structure': crypto,
  'fastAnalysis.dimension.market_specific': marketSpecific
})

const scenarioKeys = (bull, base, bear, thesis, counterargument, risk, catalyst) => ({
  'fastAnalysis.scenario.bull': bull,
  'fastAnalysis.scenario.base': base,
  'fastAnalysis.scenario.bear': bear,
  'fastAnalysis.claimKind.thesis': thesis,
  'fastAnalysis.claimKind.counter_argument': counterargument,
  'fastAnalysis.claimKind.risk': risk,
  'fastAnalysis.claimKind.catalyst': catalyst
})

const macroSummary = (available, unavailable, metrics, contexts) => ({
  'fastAnalysis.macroSummary.available': available,
  'fastAnalysis.macroSummary.unavailable': unavailable,
  'fastAnalysis.macroSummary.metric.vix': metrics[0],
  'fastAnalysis.macroSummary.metric.dxy': metrics[1],
  'fastAnalysis.macroSummary.metric.us10y': metrics[2],
  'fastAnalysis.macroSummary.metric.risk_sentiment': metrics[3],
  'fastAnalysis.macroSummary.metric.hibor_1m': metrics[4],
  'fastAnalysis.macroSummary.context.hk_funding': contexts[0],
  'fastAnalysis.macroSummary.context.us_risk_assets': contexts[1],
  'fastAnalysis.macroSummary.context.crypto_liquidity': contexts[2],
  'fastAnalysis.macroSummary.context.global_risk_assets': contexts[3]
})

const researchExtras = values => Object.fromEntries([
  'fastAnalysis.capability.equity_deep_dive_v1',
  'fastAnalysis.capability.hk_equity_deep_dive_v1',
  'fastAnalysis.capability.sample_bars',
  'fastAnalysis.capability.period_return_pct',
  'fastAnalysis.capability.realized_volatility_per_bar_pct',
  'fastAnalysis.capability.max_drawdown_pct',
  'fastAnalysis.capability.analyst_expectations',
  'fastAnalysis.capability.filings',
  'fastAnalysis.capability.financials',
  'fastAnalysis.capability.options',
  'fastAnalysis.capability.options_surface',
  'fastAnalysis.capability.ownership',
  'fastAnalysis.capability.price_history',
  'fastAnalysis.capability.short_interest',
  'fastAnalysis.warning.no_directional_position',
  'aiAssetAnalysis.copilot.collapseReport'
].map((key, index) => [key, values[index]]))

const shareExtras = (share, copied, failed, saveFailed) => ({
  'aiAssetAnalysis.copilot.shareReport': share,
  'aiAssetAnalysis.copilot.shareCopied': copied,
  'aiAssetAnalysis.copilot.shareFailed': failed,
  'aiAssetAnalysis.copilot.shareSaveFailed': saveFailed
})

const locale = (...parts) => Object.assign({}, ...parts)

const japaneseExtras = {
  'fastAnalysis.marketBiasBullish': '強気',
  'fastAnalysis.marketBiasBearish': '弱気',
  'fastAnalysis.marketBiasNeutral': '中立',
  'fastAnalysis.tradeActionBuy': '買い',
  'fastAnalysis.tradeActionSell': '売り',
  'fastAnalysis.tradeActionHold': '待機',
  'fastAnalysis.readiness.decision_ready': '判断可能な証拠',
  'fastAnalysis.readiness.conditional': '条件付き — 不足を確認',
  'fastAnalysis.readiness.insufficient': '証拠不足',
  'fastAnalysis.conclusionStrength.none': '不十分',
  'fastAnalysis.conclusionStrength.low': '低い',
  'fastAnalysis.conclusionStrength.medium': '中程度',
  'fastAnalysis.conclusionStrength.high': '高い',
  'fastAnalysis.scenarioTrigger.bull': '価格と証拠が上昇シナリオを裏付けています。',
  'fastAnalysis.scenarioTrigger.base': '証拠は混在しており、基本シナリオに沿っています。',
  'fastAnalysis.scenarioTrigger.bear': '下落要因またはテクニカルな下抜けが確認されています。',
  'fastAnalysis.capability.financials': '財務諸表',
  'fastAnalysis.capability.price_history': '価格履歴',
  'fastAnalysis.capability.spot_market': '現物市場構造',
  'fastAnalysis.capability.crypto_market_structure_v1': '暗号資産の市場構造',
  'fastAnalysis.capability.sample_bars': '観測バー数',
  'fastAnalysis.capability.period_return_pct': '期間リターン',
  'fastAnalysis.capability.realized_volatility_per_bar_pct': 'バー当たり実現ボラティリティ',
  'fastAnalysis.capability.max_drawdown_pct': '最大ドローダウン',
  'fastAnalysis.capability.funding_rate': '資金調達率',
  'fastAnalysis.capability.open_interest': '未決済建玉',
  'fastAnalysis.warning.no_directional_position': '結論が「待機」の間は方向性ポジションを取りません',
  'fastAnalysis.warning.candidate_net_risk_reward_below_one': '推定コスト控除後の純リスク・リワードが1未満です',
  'fastAnalysis.warning.funding_cost_not_guaranteed': '約定前に資金調達コストが変動する場合があります',
  'fastAnalysis.warning.liquidation_and_venue_risk': '無期限契約には清算リスクと取引所リスクがあります',
  'aiAssetAnalysis.copilot.shareReport': 'レポートを共有',
  'aiAssetAnalysis.copilot.shareCopied': '公開共有リンクをコピーしました',
  'aiAssetAnalysis.copilot.shareFailed': '共有リンクを作成できませんでした',
  'aiAssetAnalysis.copilot.shareSaveFailed': '共有する前にレポートを保存してください'
}

export default {
  'en-US': locale(
    cryptoSummary(['Trading activity is expanding', 'Trading activity is easing', 'Trading activity is stable', 'Trading-activity data is limited'], ['the overall structure is bullish', 'the overall structure is bearish', 'the overall structure is neutral'], ['crowding risk is high', 'crowding risk is elevated', 'crowding risk is low', 'crowding risk is unknown']),
    macroSummary('Available macro evidence shows: {facts}. These observations describe {context} and are not a standalone trade signal without an asset-specific transmission mechanism.', 'Macro observations were unavailable within the collection window, so this dimension is excluded from the directional view.', ['VIX', 'DXY', 'US 10-year yield', 'Risk-sentiment index', '1-month HIBOR'], ['global and Hong Kong funding conditions', 'global and US risk-asset conditions', 'global liquidity and crypto risk-sentiment conditions', 'global risk-asset conditions'])
  ),
  'zh-CN': locale(
    cryptoSummary(['成交活跃度放大', '成交活跃度回落', '成交活跃度稳定', '成交活跃度数据有限'], ['整体偏多', '整体偏空', '整体中性'], ['拥挤风险高', '拥挤度抬升', '拥挤风险低', '拥挤风险未知']),
    macroSummary('可用宏观证据显示：{facts}。这些指标仅代表{context}背景；若缺少明确的标的传导机制，不应单独作为买卖依据。', '本次宏观数据未在采集时限内返回，因此该维度不参与方向判断。', ['VIX', '美元指数', '美国10年期收益率', '风险情绪指数', '1个月HIBOR'], ['全球及香港资金环境', '全球及美国风险资产环境', '全球流动性及加密风险偏好环境', '全球风险资产环境'])
  ),
  'zh-TW': locale(
    cryptoSummary(['成交活躍度放大', '成交活躍度回落', '成交活躍度穩定', '成交活躍度資料有限'], ['整體偏多', '整體偏空', '整體中性'], ['擁擠風險高', '擁擠度升高', '擁擠風險低', '擁擠風險未知']),
    macroSummary('可用的宏觀證據顯示：{facts}。這些指標僅代表{context}；若缺少明確的標的傳導機制，不應單獨作為交易依據。', '宏觀資料未在採集時限內返回，因此此維度不參與方向判斷。', ['VIX', '美元指數', '美國10年期殖利率', '風險情緒指數', '1個月HIBOR'], ['全球及香港資金環境', '全球及美國風險資產環境', '全球流動性及加密風險偏好環境', '全球風險資產環境']),
    researchExtras(['美股深度研究', '港股深度研究', '觀測K線數', '區間報酬率', '每根K線已實現波動率', '最大回撤', '分析師預期', '監管申報', '財務報表', '期權資料', '期權波動率曲面', '已申報持股', '價格歷史', '空頭持倉', '結論為觀望時不建立方向性倉位', '收起報告']),
    shareExtras('分享報告', '公開分享連結已複製', '無法建立分享連結', '請先儲存報告再分享')
  ),
  'ja-JP': locale(
    mapReport(['証拠・データ品質監査', 'プロフェッショナルデータ', 'コミュニティデータ', 'データ品質', 'リサーチ工程と監査指標', '実行中の工程', 'リサーチ準備状況', '主要指標の網羅率', '鮮度', '不整合率', '結論の強さ', 'データ基準時点', '取引判断の信頼度（上昇確率や勝率ではありません）', '市場バイアス', '取引判断', 'エグゼクティブサマリー', '判断要旨', '中核仮説', '反対見解と最大の論点', '次に監視する項目', 'カタリスト', '無効化条件', '銘柄タイムゾーン', '分析軸', 'データ不足', '根拠に基づく説明はありません。', 'シナリオ分析', '無効化条件', 'リスク・執行計画', '監視専用の候補設定', '参照水準は現在の判断を説明するもので、実際のエントリー推奨ではありません。推奨ポジションはゼロのままです。', 'データと機能の不足', '総リスク・リワード', '純リスク・リワード', '口座リスク予算', 'ポジション上限', '推定往復コスト', '証拠に紐づく主張', '証拠参照', '証拠スナップショットと出所を表示', '契約', 'レポートID', '分析時間', 'エントリー価格', 'ストップロス', '利益確定']),
    dimensionKeys('テクニカル構造', 'ファンダメンタルズ', 'ニュースとセンチメント', 'マクロ環境', '暗号資産の市場構造', '市場固有の要因'),
    scenarioKeys('強気シナリオ', '基本シナリオ', '弱気シナリオ', '中核仮説', '反対意見', 'リスク', 'カタリスト'),
    cryptoSummary(['取引活動は拡大', '取引活動は減速', '取引活動は安定', '取引活動データは限定的'], ['市場構造は強気', '市場構造は弱気', '市場構造は中立'], ['ポジション集中リスクは高い', 'ポジション集中リスクは上昇', 'ポジション集中リスクは低い', 'ポジション集中リスクは不明']),
    macroSummary('利用可能なマクロ証拠：{facts}。これは{context}を示すもので、銘柄固有の伝達経路がなければ単独の売買シグナルにはなりません。', '収集時間内にマクロデータを取得できなかったため、この分析軸は方向判断から除外されます。', ['VIX', 'ドル指数', '米10年債利回り', 'リスクセンチメント指数', '1か月HIBOR'], ['世界および香港の資金環境', '世界および米国のリスク資産環境', '世界の流動性と暗号資産のリスクセンチメント環境', '世界のリスク資産環境']),
    japaneseExtras,
    researchExtras(['米国株式の詳細分析', '香港株式の詳細分析', '観測バー数', '期間リターン', 'バー当たり実現ボラティリティ', '最大ドローダウン', 'アナリスト予想', '規制当局への提出書類', '財務諸表', 'オプションデータ', 'オプション・サーフェス', '開示済み保有状況', '価格履歴', '空売り残高', '結論が「待機」の間は方向性ポジションを取りません', 'レポートを折りたたむ']),
    shareExtras('レポートを共有', '公開共有リンクをコピーしました', '共有リンクを作成できませんでした', '共有する前にレポートを保存してください')
  ),
  'ko-KR': locale(
    mapReport(['근거 및 데이터 품질 감사', '전문 데이터', '커뮤니티 데이터', '데이터 품질', '리서치 절차 및 감사 지표', '실행 중인 절차', '리서치 준비 상태', '핵심 지표 범위', '최신성', '충돌 비율', '결론 강도', '데이터 기준 시각', '거래 판단 신뢰도(상승 확률이나 승률 아님)', '시장 편향', '거래 판단', '요약', '판단 요약', '핵심 가설', '대안 관점과 주요 반론', '다음 모니터링 항목', '촉매', '무효화 조건', '상품 시간대', '분석 차원', '데이터 부족', '근거 기반 설명이 없습니다.', '시나리오 분석', '무효화', '위험 및 실행 계획', '관찰 전용 후보 설정', '참조 수준은 현재 판단을 설명할 뿐 실제 진입 권고가 아니며 권장 포지션은 0입니다.', '데이터 및 기능 공백', '총 위험보상비', '순 위험보상비', '계정 위험 예산', '포지션 한도', '예상 왕복 비용', '근거 연결 주장', '근거 참조', '근거 스냅샷과 출처 보기', '계약', '보고서 ID', '분석 시간', '진입 가격', '손절가', '목표가']),
    dimensionKeys('기술적 구조', '펀더멘털', '뉴스 및 심리', '거시 환경', '암호화폐 시장 구조', '시장별 요인'),
    scenarioKeys('강세 시나리오', '기본 시나리오', '약세 시나리오', '핵심 가설', '반론', '위험', '촉매'),
    cryptoSummary(['거래 활동 확대', '거래 활동 둔화', '거래 활동 안정', '거래 활동 데이터 제한'], ['전반적 구조 강세', '전반적 구조 약세', '전반적 구조 중립'], ['쏠림 위험 높음', '쏠림 위험 상승', '쏠림 위험 낮음', '쏠림 위험 불명']),
    macroSummary('사용 가능한 거시 근거: {facts}. 이는 {context}을 나타내며, 자산별 전달 경로가 없으면 단독 거래 신호가 아닙니다.', '수집 시간 내 거시 데이터를 받지 못해 방향 판단에서 제외됩니다.', ['VIX', '달러 지수', '미국 10년물 금리', '위험 심리 지수', '1개월 HIBOR'], ['글로벌 및 홍콩 자금 환경', '글로벌 및 미국 위험자산 환경', '글로벌 유동성 및 암호화폐 위험심리 환경', '글로벌 위험자산 환경']),
    researchExtras(['미국 주식 심층 분석', '홍콩 주식 심층 분석', '관측 봉 수', '기간 수익률', '봉당 실현 변동성', '최대 낙폭', '애널리스트 전망', '규제 공시', '재무제표', '옵션 데이터', '옵션 변동성 표면', '공시된 보유 지분', '가격 이력', '공매도 잔고', '결론이 관망인 동안 방향성 포지션을 보유하지 않습니다', '보고서 접기']),
    shareExtras('보고서 공유', '공개 공유 링크를 복사했습니다', '공유 링크를 만들지 못했습니다', '공유하기 전에 보고서를 저장해 주세요')
  ),
  'de-DE': locale(
    mapReport(['Evidenz- und Datenqualitätsprüfung', 'Professionelle Daten', 'Community-Daten', 'Datenqualität', 'Research-Ablauf und Prüfkennzahlen', 'Aktiver Ablauf', 'Research-Bereitschaft', 'Abdeckung der Kernkennzahlen', 'Aktualität', 'Konfliktrate', 'Stärke der Schlussfolgerung', 'Datenstand', 'Vertrauen in die Handelsentscheidung (keine Gewinnwahrscheinlichkeit)', 'Markttendenz', 'Handelsentscheidung', 'Zusammenfassung', 'Entscheidungsübersicht', 'Kernthese', 'Gegenposition und stärkster Einwand', 'Als Nächstes beobachten', 'Katalysator', 'Widerlegung', 'Zeitzone des Instruments', 'Analysedimensionen', 'Unzureichende Daten', 'Keine evidenzgestützte Erläuterung verfügbar.', 'Szenarioanalyse', 'Ungültig ab', 'Risiko- und Ausführungsplan', 'Nur zu beobachtendes Kandidatensetup', 'Referenzniveaus erklären die aktuelle Entscheidung, sind aber keine aktive Einstiegsempfehlung; die empfohlene Position bleibt null.', 'Daten- und Funktionslücken', 'Brutto-Chance/Risiko', 'Netto-Chance/Risiko', 'Risikobudget des Kontos', 'Positionsobergrenze', 'Geschätzte Roundtrip-Kosten', 'Evidenzverknüpfte Aussagen', 'Evidenzreferenzen', 'Evidenz-Snapshot und Herkunft anzeigen', 'Vertrag', 'Berichts-ID', 'Analysezeit', 'Einstiegspreis', 'Stop-Loss', 'Take-Profit']),
    dimensionKeys('Technische Struktur', 'Fundamentaldaten', 'Nachrichten und Stimmung', 'Makroumfeld', 'Krypto-Marktstruktur', 'Marktspezifische Faktoren'),
    scenarioKeys('Bullisches Szenario', 'Basisszenario', 'Bärisches Szenario', 'Kernthese', 'Gegenargument', 'Risiko', 'Katalysator'),
    cryptoSummary(['Handelsaktivität nimmt zu', 'Handelsaktivität lässt nach', 'Handelsaktivität ist stabil', 'Aktivitätsdaten sind begrenzt'], ['Gesamtstruktur ist bullisch', 'Gesamtstruktur ist bärisch', 'Gesamtstruktur ist neutral'], ['Konzentrationsrisiko ist hoch', 'Konzentrationsrisiko ist erhöht', 'Konzentrationsrisiko ist niedrig', 'Konzentrationsrisiko ist unbekannt']),
    macroSummary('Verfügbare Makrodaten: {facts}. Sie beschreiben {context} und sind ohne instrumentspezifischen Übertragungsmechanismus kein eigenständiges Handelssignal.', 'Makrodaten waren im Erfassungsfenster nicht verfügbar und werden daher nicht für die Richtungsbewertung verwendet.', ['VIX', 'Dollarindex', 'US-Rendite 10 Jahre', 'Risiko-Stimmungsindex', '1M-HIBOR'], ['globale und Hongkonger Finanzierungsbedingungen', 'globale und US-Risikoanlagen', 'globale Liquidität und Krypto-Risikostimmung', 'globale Risikoanlagen']),
    researchExtras(['US-Aktien-Tiefenanalyse', 'Hongkong-Aktien-Tiefenanalyse', 'Beobachtete Kerzen', 'Periodenrendite', 'Realisierte Volatilität je Kerze', 'Maximaler Drawdown', 'Analystenerwartungen', 'Regulatorische Meldungen', 'Finanzberichte', 'Optionsdaten', 'Optionsoberfläche', 'Gemeldete Beteiligungen', 'Preishistorie', 'Leerverkaufsquote', 'Keine Richtungsposition, solange die Schlussfolgerung auf Abwarten lautet', 'Bericht einklappen']),
    shareExtras('Bericht teilen', 'Öffentlicher Freigabelink wurde kopiert', 'Freigabelink konnte nicht erstellt werden', 'Bitte speichern Sie den Bericht vor dem Teilen')
  ),
  'fr-FR': locale(
    mapReport(['Audit des preuves et de la qualité des données', 'Données professionnelles', 'Données communautaires', 'Qualité des données', 'Processus de recherche et mesures d’audit', 'Processus actif', 'État de préparation', 'Couverture des indicateurs clés', 'Fraîcheur', 'Taux de conflit', 'Solidité de la conclusion', 'Données au', 'Confiance dans l’action (ni probabilité de hausse ni taux de réussite)', 'Biais de marché', 'Action de trading', 'Résumé exécutif', 'Synthèse de décision', 'Thèse centrale', 'Vue alternative et objection principale', 'Points à surveiller', 'Catalyseur', 'Condition d’invalidation', 'Fuseau de l’instrument', 'Dimensions d’analyse', 'Données insuffisantes', 'Aucun commentaire étayé par des preuves.', 'Analyse de scénarios', 'Invalidation', 'Plan de risque et d’exécution', 'Configuration à surveiller uniquement', 'Les niveaux de référence expliquent la décision actuelle sans constituer une recommandation d’entrée; la position recommandée reste nulle.', 'Lacunes de données et de capacités', 'Risque/rendement brut', 'Risque/rendement net', 'Budget de risque du compte', 'Plafond de position', 'Coût aller-retour estimé', 'Affirmations liées aux preuves', 'Références des preuves', 'Voir l’instantané et la provenance', 'Contrat', 'ID du rapport', 'Temps d’analyse', 'Prix d’entrée', 'Stop loss', 'Objectif']),
    dimensionKeys('Structure technique', 'Fondamentaux', 'Actualités et sentiment', 'Environnement macro', 'Structure du marché crypto', 'Facteurs propres au marché'),
    scenarioKeys('Scénario haussier', 'Scénario central', 'Scénario baissier', 'Thèse centrale', 'Contre-argument', 'Risque', 'Catalyseur'),
    cryptoSummary(['Activité en hausse', 'Activité en baisse', 'Activité stable', 'Données d’activité limitées'], ['Structure globale haussière', 'Structure globale baissière', 'Structure globale neutre'], ['Risque de concentration élevé', 'Risque de concentration en hausse', 'Risque de concentration faible', 'Risque de concentration inconnu']),
    macroSummary('Données macro disponibles : {facts}. Elles décrivent {context} et ne constituent pas un signal autonome sans mécanisme de transmission propre à l’actif.', 'Les données macro n’ont pas été reçues dans la fenêtre de collecte et sont exclues de l’évaluation directionnelle.', ['VIX', 'Indice du dollar', 'Taux US à 10 ans', 'Indice de sentiment du risque', 'HIBOR 1 mois'], ['les conditions de financement mondiales et hongkongaises', 'les actifs risqués mondiaux et américains', 'la liquidité mondiale et le sentiment de risque crypto', 'les actifs risqués mondiaux']),
    researchExtras(['Analyse approfondie des actions américaines', 'Analyse approfondie des actions de Hong Kong', 'Bougies observées', 'Rendement de la période', 'Volatilité réalisée par bougie', 'Perte maximale', 'Prévisions des analystes', 'Dépôts réglementaires', 'États financiers', 'Données sur les options', 'Surface de volatilité des options', 'Participations déclarées', 'Historique des prix', 'Intérêt vendeur', 'Aucune position directionnelle tant que la conclusion reste en attente', 'Réduire le rapport']),
    shareExtras('Partager le rapport', 'Le lien public a été copié', 'Impossible de créer le lien de partage', 'Enregistrez le rapport avant de le partager')
  ),
  'ru-RU': locale(
    mapReport(['Аудит доказательств и качества данных', 'Профессиональные данные', 'Данные сообщества', 'Качество данных', 'Процесс исследования и метрики аудита', 'Активный процесс', 'Готовность исследования', 'Покрытие ключевых метрик', 'Актуальность', 'Доля конфликтов', 'Сила вывода', 'Данные на', 'Уверенность в действии (не вероятность роста или выигрыша)', 'Рыночный уклон', 'Торговое действие', 'Резюме', 'Краткое решение', 'Основной тезис', 'Альтернативный взгляд и главное возражение', 'Что отслеживать далее', 'Катализатор', 'Условие отмены', 'Часовой пояс инструмента', 'Измерения анализа', 'Недостаточно данных', 'Нет объяснения, подтверждённого данными.', 'Сценарный анализ', 'Отмена сценария', 'План риска и исполнения', 'Кандидат только для наблюдения', 'Контрольные уровни объясняют текущее решение, но не являются рекомендацией входа; рекомендуемая позиция остаётся нулевой.', 'Пробелы в данных и возможностях', 'Валовой риск/доходность', 'Чистый риск/доходность', 'Риск-бюджет счёта', 'Лимит позиции', 'Оценка двусторонних издержек', 'Утверждения со ссылками на данные', 'Ссылки на доказательства', 'Показать снимок данных и происхождение', 'Контракт', 'ID отчёта', 'Время анализа', 'Цена входа', 'Стоп-лосс', 'Тейк-профит']),
    dimensionKeys('Техническая структура', 'Фундаментальные факторы', 'Новости и настроения', 'Макросреда', 'Структура крипторынка', 'Факторы конкретного рынка'),
    scenarioKeys('Бычий сценарий', 'Базовый сценарий', 'Медвежий сценарий', 'Основной тезис', 'Контраргумент', 'Риск', 'Катализатор'),
    cryptoSummary(['Торговая активность растёт', 'Торговая активность снижается', 'Торговая активность стабильна', 'Данные об активности ограничены'], ['Общая структура бычья', 'Общая структура медвежья', 'Общая структура нейтральная'], ['Риск перегруженности высокий', 'Риск перегруженности повышен', 'Риск перегруженности низкий', 'Риск перегруженности неизвестен']),
    macroSummary('Доступные макроданные: {facts}. Они описывают {context} и без связи с конкретным активом не являются самостоятельным торговым сигналом.', 'Макроданные не поступили в окно сбора и исключены из направленной оценки.', ['VIX', 'Индекс доллара', 'Доходность 10-летних UST', 'Индекс риск-настроений', 'HIBOR 1 месяц'], ['глобальные и гонконгские условия фондирования', 'глобальные и американские рисковые активы', 'глобальную ликвидность и риск-настроения крипторынка', 'глобальные рисковые активы']),
    researchExtras(['Углублённый анализ акций США', 'Углублённый анализ акций Гонконга', 'Количество наблюдаемых свечей', 'Доходность за период', 'Реализованная волатильность на свечу', 'Максимальная просадка', 'Ожидания аналитиков', 'Регуляторная отчётность', 'Финансовая отчётность', 'Данные опционов', 'Поверхность волатильности опционов', 'Раскрытая структура владения', 'История цен', 'Короткий интерес', 'Не открывать направленную позицию, пока вывод — ожидание', 'Свернуть отчёт']),
    shareExtras('Поделиться отчётом', 'Публичная ссылка скопирована', 'Не удалось создать ссылку для общего доступа', 'Сохраните отчёт перед публикацией')
  ),
  'th-TH': locale(
    mapReport(['การตรวจสอบหลักฐานและคุณภาพข้อมูล', 'ข้อมูลระดับมืออาชีพ', 'ข้อมูลชุมชน', 'คุณภาพข้อมูล', 'ขั้นตอนวิจัยและตัวชี้วัดการตรวจสอบ', 'ขั้นตอนที่ใช้งาน', 'ความพร้อมของการวิจัย', 'ความครอบคลุมตัวชี้วัดหลัก', 'ความสดใหม่', 'อัตราความขัดแย้ง', 'ความแข็งแรงของข้อสรุป', 'ข้อมูล ณ', 'ความเชื่อมั่นต่อการตัดสินใจ (ไม่ใช่โอกาสขึ้นหรืออัตราชนะ)', 'มุมมองตลาด', 'การตัดสินใจซื้อขาย', 'บทสรุปผู้บริหาร', 'สรุปการตัดสินใจ', 'สมมติฐานหลัก', 'มุมมองทางเลือกและข้อโต้แย้งหลัก', 'สิ่งที่ต้องติดตามต่อ', 'ปัจจัยกระตุ้น', 'เงื่อนไขยกเลิก', 'เขตเวลาของตราสาร', 'มิติการวิเคราะห์', 'ข้อมูลไม่เพียงพอ', 'ไม่มีคำอธิบายที่รองรับด้วยหลักฐาน', 'การวิเคราะห์สถานการณ์', 'เงื่อนไขยกเลิก', 'แผนความเสี่ยงและการดำเนินการ', 'สถานการณ์สำหรับเฝ้าดูเท่านั้น', 'ระดับอ้างอิงอธิบายการตัดสินใจปัจจุบัน ไม่ใช่คำแนะนำให้เข้า และขนาดสถานะที่แนะนำยังเป็นศูนย์', 'ช่องว่างของข้อมูลและความสามารถ', 'ความเสี่ยง/ผลตอบแทนขั้นต้น', 'ความเสี่ยง/ผลตอบแทนสุทธิ', 'งบความเสี่ยงบัญชี', 'เพดานสถานะ', 'ต้นทุนไปกลับโดยประมาณ', 'ข้ออ้างที่เชื่อมกับหลักฐาน', 'การอ้างอิงหลักฐาน', 'ดูภาพรวมหลักฐานและแหล่งที่มา', 'สัญญา', 'รหัสรายงาน', 'เวลาวิเคราะห์', 'ราคาเข้า', 'จุดตัดขาดทุน', 'จุดทำกำไร']),
    dimensionKeys('โครงสร้างทางเทคนิค', 'ปัจจัยพื้นฐาน', 'ข่าวและอารมณ์ตลาด', 'สภาพแวดล้อมมหภาค', 'โครงสร้างตลาดคริปโต', 'ปัจจัยเฉพาะตลาด'),
    scenarioKeys('กรณีขาขึ้น', 'กรณีฐาน', 'กรณีขาลง', 'สมมติฐานหลัก', 'ข้อโต้แย้ง', 'ความเสี่ยง', 'ปัจจัยกระตุ้น'),
    cryptoSummary(['กิจกรรมซื้อขายเพิ่มขึ้น', 'กิจกรรมซื้อขายลดลง', 'กิจกรรมซื้อขายทรงตัว', 'ข้อมูลกิจกรรมมีจำกัด'], ['โครงสร้างโดยรวมเป็นขาขึ้น', 'โครงสร้างโดยรวมเป็นขาลง', 'โครงสร้างโดยรวมเป็นกลาง'], ['ความเสี่ยงกระจุกตัวสูง', 'ความเสี่ยงกระจุกตัวเพิ่มขึ้น', 'ความเสี่ยงกระจุกตัวต่ำ', 'ไม่ทราบความเสี่ยงกระจุกตัว']),
    macroSummary('หลักฐานมหภาคที่มี: {facts} ข้อมูลนี้อธิบาย{context}และไม่ใช่สัญญาณซื้อขายเดี่ยวหากไม่มีช่องทางส่งผ่านเฉพาะสินทรัพย์', 'ไม่ได้รับข้อมูลมหภาคภายในช่วงรวบรวม จึงไม่นำมาพิจารณาทิศทาง', ['VIX', 'ดัชนีดอลลาร์', 'ผลตอบแทนพันธบัตรสหรัฐ 10 ปี', 'ดัชนีอารมณ์ความเสี่ยง', 'HIBOR 1 เดือน'], ['สภาวะเงินทุนทั่วโลกและฮ่องกง', 'สินทรัพย์เสี่ยงทั่วโลกและสหรัฐ', 'สภาพคล่องทั่วโลกและอารมณ์ความเสี่ยงคริปโต', 'สินทรัพย์เสี่ยงทั่วโลก']),
    researchExtras(['วิเคราะห์หุ้นสหรัฐเชิงลึก', 'วิเคราะห์หุ้นฮ่องกงเชิงลึก', 'จำนวนแท่งที่สังเกต', 'ผลตอบแทนช่วงเวลา', 'ความผันผวนจริงต่อแท่ง', 'การขาดทุนสูงสุด', 'คาดการณ์ของนักวิเคราะห์', 'เอกสารกำกับดูแล', 'งบการเงิน', 'ข้อมูลออปชัน', 'พื้นผิวความผันผวนออปชัน', 'การถือครองที่เปิดเผย', 'ประวัติราคา', 'สถานะขายชอร์ต', 'ไม่มีสถานะตามทิศทางขณะที่ข้อสรุปคือรอดู', 'ย่อรายงาน']),
    shareExtras('แชร์รายงาน', 'คัดลอกลิงก์สาธารณะแล้ว', 'สร้างลิงก์แชร์ไม่สำเร็จ', 'โปรดบันทึกรายงานก่อนแชร์')
  ),
  'vi-VN': locale(
    mapReport(['Kiểm toán bằng chứng và chất lượng dữ liệu', 'Dữ liệu chuyên nghiệp', 'Dữ liệu cộng đồng', 'Chất lượng dữ liệu', 'Quy trình nghiên cứu và chỉ số kiểm toán', 'Quy trình đang chạy', 'Mức sẵn sàng nghiên cứu', 'Độ phủ chỉ số cốt lõi', 'Độ mới', 'Tỷ lệ xung đột', 'Độ mạnh kết luận', 'Dữ liệu tính đến', 'Độ tin cậy vào hành động (không phải xác suất tăng hay tỷ lệ thắng)', 'Thiên hướng thị trường', 'Hành động giao dịch', 'Tóm tắt điều hành', 'Tóm lược quyết định', 'Luận điểm cốt lõi', 'Góc nhìn đối lập và phản biện chính', 'Nội dung cần theo dõi', 'Chất xúc tác', 'Điều kiện vô hiệu', 'Múi giờ công cụ', 'Các chiều phân tích', 'Dữ liệu không đủ', 'Không có diễn giải được chứng minh.', 'Phân tích kịch bản', 'Vô hiệu', 'Kế hoạch rủi ro và thực thi', 'Thiết lập chỉ để theo dõi', 'Các mức tham chiếu giải thích quyết định hiện tại, không phải khuyến nghị vào lệnh; vị thế đề xuất vẫn bằng 0.', 'Khoảng trống dữ liệu và năng lực', 'Rủi ro/lợi nhuận gộp', 'Rủi ro/lợi nhuận ròng', 'Ngân sách rủi ro tài khoản', 'Giới hạn vị thế', 'Chi phí khứ hồi ước tính', 'Nhận định gắn với bằng chứng', 'Tham chiếu bằng chứng', 'Xem ảnh chụp bằng chứng và nguồn gốc', 'Hợp đồng', 'ID báo cáo', 'Thời gian phân tích', 'Giá vào', 'Dừng lỗ', 'Chốt lời']),
    dimensionKeys('Cấu trúc kỹ thuật', 'Cơ bản', 'Tin tức và tâm lý', 'Môi trường vĩ mô', 'Cấu trúc thị trường crypto', 'Yếu tố đặc thù thị trường'),
    scenarioKeys('Kịch bản tăng', 'Kịch bản cơ sở', 'Kịch bản giảm', 'Luận điểm cốt lõi', 'Phản biện', 'Rủi ro', 'Chất xúc tác'),
    cryptoSummary(['Hoạt động giao dịch tăng', 'Hoạt động giao dịch giảm', 'Hoạt động giao dịch ổn định', 'Dữ liệu hoạt động hạn chế'], ['Cấu trúc tổng thể thiên tăng', 'Cấu trúc tổng thể thiên giảm', 'Cấu trúc tổng thể trung tính'], ['Rủi ro tập trung cao', 'Rủi ro tập trung tăng', 'Rủi ro tập trung thấp', 'Chưa rõ rủi ro tập trung']),
    macroSummary('Bằng chứng vĩ mô hiện có: {facts}. Các dữ liệu này mô tả {context} và không phải tín hiệu giao dịch độc lập nếu thiếu cơ chế truyền dẫn riêng của tài sản.', 'Dữ liệu vĩ mô không về trong cửa sổ thu thập nên bị loại khỏi đánh giá định hướng.', ['VIX', 'Chỉ số đô la', 'Lợi suất Mỹ 10 năm', 'Chỉ số tâm lý rủi ro', 'HIBOR 1 tháng'], ['điều kiện vốn toàn cầu và Hồng Kông', 'tài sản rủi ro toàn cầu và Mỹ', 'thanh khoản toàn cầu và tâm lý rủi ro crypto', 'tài sản rủi ro toàn cầu']),
    researchExtras(['Phân tích chuyên sâu cổ phiếu Mỹ', 'Phân tích chuyên sâu cổ phiếu Hồng Kông', 'Số nến quan sát', 'Lợi nhuận giai đoạn', 'Biến động thực tế mỗi nến', 'Mức sụt giảm tối đa', 'Kỳ vọng của nhà phân tích', 'Hồ sơ pháp lý', 'Báo cáo tài chính', 'Dữ liệu quyền chọn', 'Bề mặt biến động quyền chọn', 'Quyền sở hữu đã công bố', 'Lịch sử giá', 'Tỷ lệ bán khống', 'Không giữ vị thế định hướng khi kết luận là chờ', 'Thu gọn báo cáo']),
    shareExtras('Chia sẻ báo cáo', 'Đã sao chép liên kết công khai', 'Không thể tạo liên kết chia sẻ', 'Hãy lưu báo cáo trước khi chia sẻ')
  ),
  'ar-SA': locale(
    mapReport(['تدقيق الأدلة وجودة البيانات', 'بيانات احترافية', 'بيانات المجتمع', 'جودة البيانات', 'مسار البحث ومقاييس التدقيق', 'المسار النشط', 'جاهزية البحث', 'تغطية المقاييس الأساسية', 'حداثة البيانات', 'معدل التعارض', 'قوة الاستنتاج', 'البيانات حتى', 'الثقة في الإجراء (وليست احتمال الصعود أو الفوز)', 'انحياز السوق', 'إجراء التداول', 'الملخص التنفيذي', 'موجز القرار', 'الأطروحة الأساسية', 'الرأي البديل وأقوى اعتراض', 'ما يجب مراقبته لاحقاً', 'محفز', 'شرط الإبطال', 'المنطقة الزمنية للأداة', 'أبعاد التحليل', 'بيانات غير كافية', 'لا يتوفر سرد مدعوم بالأدلة.', 'تحليل السيناريوهات', 'الإبطال', 'خطة المخاطر والتنفيذ', 'إعداد للمراقبة فقط', 'تشرح المستويات المرجعية القرار الحالي ولا تمثل توصية دخول؛ ويظل المركز المقترح صفراً.', 'فجوات البيانات والقدرات', 'العائد/المخاطرة الإجمالي', 'العائد/المخاطرة الصافي', 'ميزانية مخاطر الحساب', 'حد المركز', 'تكلفة الذهاب والعودة المقدّرة', 'ادعاءات مرتبطة بالأدلة', 'مراجع الأدلة', 'عرض لقطة الأدلة ومصدرها', 'العقد', 'معرّف التقرير', 'وقت التحليل', 'سعر الدخول', 'وقف الخسارة', 'جني الأرباح']),
    dimensionKeys('البنية الفنية', 'العوامل الأساسية', 'الأخبار والمعنويات', 'البيئة الكلية', 'بنية سوق العملات المشفرة', 'عوامل خاصة بالسوق'),
    scenarioKeys('السيناريو الصاعد', 'السيناريو الأساسي', 'السيناريو الهابط', 'الأطروحة الأساسية', 'الحجة المضادة', 'مخاطر', 'محفز'),
    cryptoSummary(['نشاط التداول يتوسع', 'نشاط التداول يتراجع', 'نشاط التداول مستقر', 'بيانات النشاط محدودة'], ['الهيكل العام صاعد', 'الهيكل العام هابط', 'الهيكل العام محايد'], ['مخاطر التكدس مرتفعة', 'مخاطر التكدس متزايدة', 'مخاطر التكدس منخفضة', 'مخاطر التكدس غير معروفة']),
    macroSummary('تُظهر الأدلة الكلية المتاحة: {facts}. وهي تصف {context} ولا تمثل إشارة تداول مستقلة دون آلية انتقال خاصة بالأصل.', 'لم تصل بيانات الاقتصاد الكلي ضمن نافذة الجمع، لذا استُبعد هذا البعد من التقييم الاتجاهي.', ['VIX', 'مؤشر الدولار', 'عائد سندات الخزانة الأمريكية 10 سنوات', 'مؤشر شهية المخاطر', 'HIBOR لشهر'], ['ظروف التمويل العالمية وهونغ كونغ', 'أصول المخاطر العالمية والأمريكية', 'السيولة العالمية ومعنويات مخاطر العملات المشفرة', 'أصول المخاطر العالمية']),
    researchExtras(['تحليل معمّق للأسهم الأمريكية', 'تحليل معمّق لأسهم هونغ كونغ', 'عدد الشموع المرصودة', 'عائد الفترة', 'التقلب المحقق لكل شمعة', 'أقصى تراجع', 'توقعات المحللين', 'الإفصاحات التنظيمية', 'القوائم المالية', 'بيانات الخيارات', 'سطح تقلب الخيارات', 'الملكية المعلنة', 'سجل الأسعار', 'مراكز البيع على المكشوف', 'لا يوجد مركز اتجاهي ما دامت الخلاصة هي الانتظار', 'طي التقرير']),
    shareExtras('مشاركة التقرير', 'تم نسخ رابط المشاركة العام', 'تعذر إنشاء رابط المشاركة', 'يرجى حفظ التقرير قبل مشاركته')
  )
}
