const uiKeys = `editorHeading editorSubtitle tabEditor tabExamples tabRules formulaHint optionalDescription validationHint examplesHint exampleParams useExampleShort rulesHint rule.input rule.syntax rule.params rule.output rule.limits rule.validation rule.usage contractTitle useExample example.native example.talib example.qlib create title save cancel securityTitle securityDescription name namePlaceholder nameRequired category categoryOther description descriptionPlaceholder direction expression expressionHelp parameters parametersHelp parametersInvalid validate validationSuccess validationFailed validationPassed saveSuccess saveFailed version`.split(' ')
const ruleKeys = 'contractInput contractSyntax contractParams contractOutput contractLimits contractValidation contractUsage'.split(' ')
const errorKeys = 'customArgumentCount customKeywordUnsupported customComputeFailed customExpressionRequired customExpressionTooLarge customExpressionTooComplex customSyntaxInvalid customNodeUnsupported customUnknownName customDependencyNotFound customNestedDependencyUnsupported customParameterMustBeLiteral customInvalidParameter customNameInvalid customDirectionInvalid customSaveFailed aiPromptRequired aiPromptTooLong aiNotConfigured aiInsufficientCredits aiBillingUnavailable aiUnsupported aiInvalid aiFailed'.split(' ')
const aiKeys = 'tab heading hint placeholder cost loadPrice generate generating billingHint draft review apply applied'.split(' ')
const noticeKeys = 'factorLibrary.family.custom factorLibrary.scope.compatible factorLibrary.runtimeOnlyNotice factorLibrary.extraDataNotice factorLibrary.unitDomainNotice'.split(' ')

function group (keys, text, prefix = '') {
  const values = text.trim().split('\n')
  if (keys.length !== values.length) throw new Error(`Factor locale size mismatch: ${prefix} ${values.length}/${keys.length}`)
  return Object.fromEntries(keys.map((key, index) => [prefix + key, values[index].trim()]))
}

function pack (ui, rules, errors, ai, notices) {
  return {
    ...group(uiKeys, ui, 'factorLibrary.custom.'),
    ...group(ruleKeys, rules, 'factorLibrary.custom.'),
    ...group(errorKeys, errors, 'factor.'),
    ...group(aiKeys, ai, 'factorLibrary.custom.ai.'),
    ...group(noticeKeys, notices),
    'factorLibrary.custom.expressionPlaceholder': 'momentum(period=20) / max(realized_volatility(period=20), 0.0001)'
  }
}

const messages = {
  'zh-TW': pack(`
把研究想法寫成因子
一條公式，輸出一個評分。可直接編寫，也可從範例開始。
編輯因子
參考範例
編寫規則
使用具名參數，如 momentum(period=20)，不支援 Python 或 Pine 腳本。
研究說明（選填）
驗證後顯示檢查結果、必要欄位及最低歷史長度。
選擇範例開始；套用只會替換公式和參數。
預設參數
使用範例
此處使用受限公式語言，並非腳本編輯器。展開查看規則。
輸入欄位與歷史資料
語法與可用函式
參數與命名方式
輸出格式與數值範圍
安全邊界與限制
驗證檢查項目
儲存後如何呼叫
編寫規則與範例
使用公式和參數
範例：波動率調整動量
範例：TA-Lib RSI
範例：Qlib 極值位置
新增因子
新增自訂因子
儲存因子
取消
安全公式執行環境
公式在受限計算器中執行，禁止匯入、檔案、網路及巢狀自訂因子。
因子名稱
動量品質評分
請輸入因子名稱。
因子分類
自訂
研究說明
說明訊號假設、適用市場與預期用途。
預期方向
因子公式
使用已註冊因子及算術、比較、min、max、abs、log、sqrt、clip 組合。
預設參數（JSON）
數值與布林參數可在公式中直接以名稱引用。
參數必須是僅含有限數值或布林值的 JSON 物件。
驗證公式
公式驗證通過。
公式驗證失敗。
結構檢查通過 · 最低預熱 {warmup} 根 K 線 · 必要欄位：
已儲存至「我的因子」。
因子儲存失敗。
私有因子 · 版本 {version}
`, `
輸入為當前時點的單一標的。open、high、low、close、volume 是最新 K 線的純量；amount、market_cap、net_income、shareholder_equity、revenue_growth、total_debt、free_cash_flow、pe_ratio、pb_ratio、return_on_equity、debt_to_equity 需資料源提供，財務資料須符合時點要求。最新值缺失會報錯；歷史資料透過已註冊因子取得，不支援 close[1]。
只寫一條運算式，非 Python/Pine。支援 + - * / % **、比較、and/or/not、a if condition else b。函式：abs(x)、min(a,b,...)、max(a,b,...)、log(x)、log1p(x)、sqrt(x)、clip(x,low,high)。呼叫 momentum(period=20)、factor("talib:RSI", timeperiod=14) 或 factor("qlib:alpha158:MA20")；不傳 symbol。
參數為只含有限數值或布林值的 JSON 物件。名稱須合法，不得與欄位或保留函式重名。直接寫 period=lookback，不用 params.get()；必須具名，不能寫 momentum(20)。Qlib 視窗包含在 ID，不另傳參數。
每個標的與時點輸出一個有限純量；布林轉為 0/1。不可輸出陣列、字典、圖形或訂單。防止除零及 log/sqrt 定義域錯誤；TA-Lib 多輸出使用目錄所列的 output="..."。
上限 2000 字元、120 個語法樹節點。禁止賦值、匯入、迴圈、屬性、索引、檔案、網路及巢狀自訂因子。這是白名單公式計算器，非通用 Python 沙盒。
儲存前驗證語法、依賴及參數，並估計最低預熱長度；不保證行情資料齊全或獲利。修改公式或參數後須重新驗證，交易前先做歷史測試。
儲存後在「我的因子」複製 factor("custom:<id>", symbol, ...) 呼叫，僅擁有者帳戶可讀取。依執行環境標示使用，目前自訂因子列為組合／橫截面策略適用。
`, `
參數數量錯誤；因子參數須具名，factor() 只接受一個位置參數（ID）。
關鍵字參數不支援或重複，不允許參數展開。
無法得到當前有限數值，請檢查資料、歷史長度、除零及輸入範圍。
請輸入因子公式。
公式過長。
公式過於複雜。
公式語法錯誤。
公式包含不支援的運算。
公式包含未知欄位、參數或函式。
引用的因子不存在。
不支援巢狀自訂因子。
因子參數須為常量或已宣告參數。
請檢查參數名稱、有限數值／布林預設值、範圍及輸出選項。
名稱須為 1 至 120 個字元。
請選擇有效方向。
自訂因子儲存失敗。
請先描述因子想法。
描述不得超過 4000 個字元。
尚未設定 AI 服務，請聯絡管理員。
點數不足，儲值後再生成。
扣費檢查失敗，未發起生成請求。
目前契約無法表達此想法，請縮小需求或選擇已有因子。
AI 修正後仍無有效因子，未套用草稿。
生成失敗，請檢查服務後再發起新的付費請求。
`, `
AI 生成
描述你的因子想法
說明訊號邏輯、回看週期與方向，AI 會依現有契約生成公式。
例如：選取近 20 根 K 線動量高、波動低的標的，以動量除以波動率評分。
{cost} 點/次
載入生成費用
生成因子
正在生成…
與策略 AI 一樣，發起時扣費。自動修正包含在本次費用；重新生成另行扣費。結果不會自動儲存。
已檢查的草稿
套用將替換表單內容，請核對邏輯並進行歷史測試。
填入表單
已填入草稿，請檢查後儲存。
`, `
我的因子
執行環境相容
執行環境相容不代表資料就緒，仍需滿足欄位、歷史長度及輸入範圍。
需要額外資料：{fields}。一般 OHLCV 不保證提供，缺失時不以價格估算替代。
ACOS / ASIN 輸入須在 -1 到 1 之間，一般資產價格通常不符合。
`),
  'ja-JP': pack(`
アイデアをファクターに
1つの式から1つのスコア。直接入力するか、例から始めます。
編集
サンプル
作成ルール
momentum(period=20) のように名前付き引数を使用します。Python/Pine は非対応です。
説明（任意）
検証すると必要なフィールドと最低履歴長が表示されます。
サンプルの適用では式とパラメーターのみ置き換えます。
初期パラメーター
この例を使う
制限付きの式言語です。項目を開いてルールを確認してください。
入力と履歴
構文と関数
パラメーターと命名
出力と数値範囲
安全性と制限
検証の対象
保存後の呼び出し
作成ルールとサンプル
式とパラメーターを使用
例：変動率調整モメンタム
例：TA-Lib RSI
例：Qlib 極値位置
新規ファクター
カスタムファクター作成
保存
キャンセル
安全な式実行環境
制限付き評価器で実行します。インポート、ファイル、通信、カスタム因子の入れ子は禁止です。
ファクター名
モメンタム品質スコア
名前を入力してください。
カテゴリ
カスタム
研究の説明
シグナルの仮説、対象市場と用途を説明してください。
想定方向
ファクター式
登録済み因子を算術、比較、min、max、abs、log、sqrt、clip で組み合わせます。
初期パラメーター（JSON）
数値と真偽値を式内で名前により直接参照できます。
有限数値または真偽値のみを含む JSON オブジェクトが必要です。
式を検証
式の検証に成功しました。
式の検証に失敗しました。
構造検証済み · 最低 {warmup} 本 · 必須フィールド：
マイファクターに保存しました。
保存に失敗しました。
非公開ファクター · バージョン {version}
`, `
入力は評価時点の単一銘柄です。open/high/low/close/volume は最新足のスカラーです。amount、market_cap、net_income、shareholder_equity、revenue_growth、total_debt、free_cash_flow、pe_ratio、pb_ratio、return_on_equity、debt_to_equity は追加データが必要で、財務データは時点整合性が必要です。最新値の欠損はエラーです。履歴は登録済み因子で取得し、close[1] は使えません。
単一の式のみ。+ - * / % **、比較、and/or/not、a if condition else b に対応。abs(x)、min(a,b,...)、max(a,b,...)、log(x)、log1p(x)、sqrt(x)、clip(x,low,high) が使用可能です。momentum(period=20)、factor("talib:RSI", timeperiod=14)、factor("qlib:alpha158:MA20") を使い、symbol は渡しません。
JSON オブジェクトの値は有限数値または真偽値のみ。名前は有効な識別子で、フィールドや予約関数と重複不可。period=lookback と記述し、params.get() や momentum(20) は不可。Qlib の期間は ID に含まれ、引数は渡しません。
銘柄・時点ごとに有限スカラー1つ。真偽値は 0/1 に変換。配列、辞書、描画、注文は不可。ゼロ除算と log/sqrt の定義域を保護してください。TA-Lib の複数出力はカタログの output="..." で選択します。
最大2000文字、構文木120ノード。代入、インポート、ループ、属性、添字、ファイル、ネットワーク、カスタム因子の入れ子は禁止。汎用 Python サンドボックスではありません。
保存前に構文、依存関係、パラメーターと最低準備期間を検証します。実データの充足や収益性は保証しません。式・パラメーター変更後は再検証し、取引前に履歴でテストしてください。
保存後、マイファクターから factor("custom:<id>", symbol, ...) をコピーします。所有アカウントのみ参照可能です。実行環境ラベルを確認してください。現在はポートフォリオ／横断面戦略向けです。
`, `
引数の数が不正です。因子引数は名前付き、factor() の位置引数は ID 1つのみです。
未対応または重複する引数です。引数展開は使えません。
現在の有限値を算出できません。データ、履歴、除算、入力範囲を確認してください。
式を入力してください。
式が長すぎます。
式が複雑すぎます。
式の構文が不正です。
未対応の演算です。
不明なフィールド、引数または関数です。
参照先の因子がありません。
カスタム因子の入れ子は非対応です。
引数は定数または宣言済みパラメーターにしてください。
引数名、有限数値／真偽値、範囲と出力指定を確認してください。
名前は1～120文字にしてください。
有効な方向を選択してください。
カスタム因子を保存できませんでした。
因子のアイデアを入力してください。
説明は4000文字以内にしてください。
AI 未設定です。管理者に連絡してください。
クレジット不足です。チャージして再試行してください。
課金確認に失敗しました。生成リクエストは送信されていません。
現在の仕様では表現できません。要件を絞るか、対応する因子を選んでください。
修正後も有効な因子を生成できませんでした。下書きは適用されていません。
生成に失敗しました。次の有料リクエストの前にサービスを確認してください。
`, `
AI 生成
因子のアイデアを説明
シグナル、参照期間、方向を説明すると、既存の仕様に沿った式を生成します。
例：20本のモメンタムが高く変動率の低い銘柄を優先し、モメンタムを変動率で割る。
1回 {cost} クレジット
料金を取得
因子を生成
生成中…
戦略 AI と同様、開始時に課金します。自動修正は含まれますが、再生成は別料金です。自動保存はしません。
検証済み下書き
適用するとフォームを置き換えます。内容を確認し履歴でテストしてください。
フォームに適用
下書きを適用しました。確認して保存してください。
`, `
マイファクター
実行環境に対応
実行環境への対応はデータの充足を意味しません。フィールド、履歴と入力範囲も必要です。
追加データ：{fields}。通常の OHLCV では保証されず、欠損を価格推定値で代用しません。
ACOS / ASIN は -1～1 の入力が必要で、通常の資産価格は適合しません。
`),
  'ko-KR': pack(`
아이디어를 팩터로
하나의 수식으로 하나의 점수를 만듭니다. 직접 작성하거나 예제로 시작하세요.
팩터 편집
예제
작성 규칙
momentum(period=20)처럼 이름 있는 인수를 사용하세요. Python/Pine은 지원하지 않습니다.
설명（선택）
검증하면 필수 필드와 최소 이력 길이를 확인할 수 있습니다.
예제를 적용하면 수식과 매개변수만 바뀝니다.
기본 매개변수
예제 사용
제한된 수식 언어입니다. 항목을 펼쳐 규칙을 확인하세요.
입력과 이력
문법과 함수
매개변수 이름
출력과 수치 범위
안전 및 제한
검증 항목
저장 후 호출
작성 규칙 및 예제
수식과 매개변수 사용
예제: 변동성 조정 모멘텀
예제: TA-Lib RSI
예제: Qlib 극값 위치
새 팩터
사용자 팩터 만들기
팩터 저장
취소
안전한 수식 실행 환경
제한된 평가기를 사용합니다. 가져오기, 파일, 네트워크, 사용자 팩터 중첩은 금지됩니다.
팩터 이름
모멘텀 품질 점수
이름을 입력하세요.
분류
사용자 정의
연구 설명
신호 가설, 대상 시장과 용도를 설명하세요.
예상 방향
팩터 수식
등록된 팩터와 산술, 비교, min, max, abs, log, sqrt, clip을 조합하세요.
기본 매개변수（JSON）
수치와 불리언 매개변수를 수식에서 이름으로 직접 참조합니다.
유한 수치나 불리언만 포함한 JSON 객체가 필요합니다.
수식 검증
수식 검증을 통과했습니다.
수식 검증에 실패했습니다.
구조 확인됨 · 최소 준비 {warmup}개 봉 · 필수 필드:
내 팩터에 저장했습니다.
저장하지 못했습니다.
비공개 팩터 · 버전 {version}
`, `
평가 시점의 단일 종목이 입력입니다. open/high/low/close/volume은 최신 봉의 스칼라입니다. amount, market_cap, net_income, shareholder_equity, revenue_growth, total_debt, free_cash_flow, pe_ratio, pb_ratio, return_on_equity, debt_to_equity는 추가 데이터가 필요하며 재무 데이터는 시점 정합성을 지켜야 합니다. 최신 값 누락은 오류입니다. 이력은 등록 팩터로만 조회하며 close[1]은 불가합니다.
단일 표현식만 작성합니다. + - * / % **, 비교, and/or/not, a if condition else b를 지원합니다. abs(x), min(a,b,...), max(a,b,...), log(x), log1p(x), sqrt(x), clip(x,low,high)를 사용합니다. momentum(period=20), factor("talib:RSI", timeperiod=14), factor("qlib:alpha158:MA20")로 호출하며 symbol은 전달하지 않습니다.
JSON 객체 값은 유한 수치와 불리언만 가능합니다. 이름은 유효한 식별자이며 필드/예약 함수와 겹치면 안 됩니다. period=lookback처럼 직접 참조하며 params.get()과 momentum(20)은 불가합니다. Qlib 기간은 ID에 포함되어 별도 인수가 없습니다.
종목/시점마다 유한 스칼라 하나를 출력하며 불리언은 0/1이 됩니다. 배열, 사전, 그래프, 주문은 불가합니다. 0 나누기와 log/sqrt 정의역을 보호하세요. TA-Lib 다중 출력은 목록의 output="..." 옵션을 사용합니다.
최대 2000자, 구문 트리 120개 노드입니다. 할당, 가져오기, 반복문, 속성, 인덱싱, 파일, 통신, 사용자 팩터 중첩은 금지됩니다. 범용 Python 샌드박스가 아닙니다.
저장 전 문법, 의존성, 매개변수와 최소 준비 길이를 확인합니다. 실제 데이터나 수익성을 보장하지 않습니다. 수식/매개변수를 바꾸면 다시 검증하고 거래 전 이력으로 테스트하세요.
저장 후 내 팩터에서 factor("custom:<id>", symbol, ...)를 복사합니다. 소유 계정만 접근할 수 있습니다. 실행 환경 표시를 따르세요. 현재는 포트폴리오/횡단면 전략용입니다.
`, `
인수 개수가 잘못되었습니다. 팩터 인수는 이름이 필요하며 factor()의 위치 인수는 ID 하나입니다.
지원하지 않거나 중복된 인수입니다. 인수 펼치기는 불가합니다.
현재 유한 값을 계산할 수 없습니다. 데이터, 이력, 나눗셈과 입력 범위를 확인하세요.
수식을 입력하세요.
수식이 너무 깁니다.
수식이 너무 복잡합니다.
수식 문법이 잘못되었습니다.
지원하지 않는 연산입니다.
알 수 없는 필드, 매개변수 또는 함수입니다.
참조 팩터가 없습니다.
사용자 팩터 중첩은 지원하지 않습니다.
인수는 상수나 선언된 매개변수여야 합니다.
인수 이름, 유한 수치/불리언 기본값, 범위와 출력을 확인하세요.
이름은 1~120자여야 합니다.
올바른 방향을 선택하세요.
사용자 팩터 저장에 실패했습니다.
팩터 아이디어를 입력하세요.
설명은 4000자 이내로 작성하세요.
AI가 설정되지 않았습니다. 관리자에게 문의하세요.
크레딧이 부족합니다. 충전 후 다시 시도하세요.
과금 확인 실패로 생성 요청을 보내지 않았습니다.
현재 규칙으로 표현할 수 없습니다. 요청 범위를 줄이거나 지원 팩터를 선택하세요.
자동 수정 후에도 유효한 팩터가 없습니다. 초안을 적용하지 않았습니다.
생성 실패입니다. 새 유료 요청 전에 서비스 상태를 확인하세요.
`, `
AI 생성
팩터 아이디어 설명
신호, 조회 기간과 방향을 설명하면 기존 규칙에 따라 수식을 생성합니다.
예: 최근 20개 봉의 모멘텀이 높고 변동성이 낮은 자산을 선호하며 모멘텀을 변동성으로 나누기.
요청당 {cost} 크레딧
생성 요금 조회
팩터 생성
생성 중…
전략 AI처럼 시작 시 과금합니다. 자동 수정은 포함되며 재생성은 별도 과금됩니다. 자동 저장하지 않습니다.
검사된 초안
적용하면 양식을 교체합니다. 논리를 검토하고 이력으로 테스트하세요.
양식에 적용
초안을 적용했습니다. 확인 후 저장하세요.
`, `
내 팩터
호환 실행 환경
실행 환경 호환은 데이터 준비 완료를 의미하지 않습니다. 필드, 이력과 범위를 확인하세요.
추가 데이터 필요: {fields}. 일반 OHLCV로 보장되지 않으며 누락을 가격 추정치로 대체하지 않습니다.
ACOS / ASIN 입력은 -1~1이어야 하며 일반 자산 가격은 보통 해당하지 않습니다.
`),
  'de-DE': pack(`
Von der Idee zum Faktor
Eine Formel, ein Wert. Selbst schreiben oder ein Beispiel nutzen.
Bearbeiten
Beispiele
Regeln
Benannte Argumente verwenden, z. B. momentum(period=20). Python/Pine wird nicht unterstützt.
Beschreibung (optional)
Die Prüfung zeigt benötigte Felder und die Mindesthistorie.
Ein Beispiel ersetzt nur Formel und Parameter.
Standardparameter
Beispiel nutzen
Eingeschränkte Formelsprache, kein Skripteditor. Themen für Details öffnen.
Eingaben und Historie
Syntax und Funktionen
Parameter und Namen
Ausgabe und Wertebereiche
Sicherheit und Grenzen
Umfang der Prüfung
Gespeicherten Faktor aufrufen
Regeln und Beispiele
Formel und Parameter übernehmen
Beispiel: volatilitätsbereinigtes Momentum
Beispiel: TA-Lib RSI
Beispiel: Qlib-Extremposition
Neuer Faktor
Eigenen Faktor erstellen
Faktor speichern
Abbrechen
Sichere Formelauswertung
Eingeschränkte Auswertung ohne Imports, Dateien, Netzwerk oder verschachtelte eigene Faktoren.
Faktorname
Momentum-Qualitätswert
Bitte einen Namen eingeben.
Kategorie
Benutzerdefiniert
Forschungsbeschreibung
Signalhypothese, Markt und Verwendungszweck beschreiben.
Erwartete Richtung
Faktorformel
Registrierte Faktoren mit Arithmetik, Vergleichen, min, max, abs, log, sqrt und clip kombinieren.
Standardparameter (JSON)
Zahlen und boolesche Werte sind direkt über ihren Namen verfügbar.
Ein JSON-Objekt nur mit endlichen Zahlen oder booleschen Werten ist erforderlich.
Formel prüfen
Formelprüfung bestanden.
Formelprüfung fehlgeschlagen.
Struktur geprüft · mindestens {warmup} Kerzen · benötigte Felder:
Unter Meine Faktoren gespeichert.
Speichern fehlgeschlagen.
Privater Faktor · Version {version}
`, `
Eingabe: ein Instrument zum Auswertungszeitpunkt. open/high/low/close/volume sind Skalare der letzten Kerze. amount, market_cap, net_income, shareholder_equity, revenue_growth, total_debt, free_cash_flow, pe_ratio, pb_ratio, return_on_equity, debt_to_equity benötigen Zusatzdaten; Fundamentaldaten müssen zeitpunktgerecht sein. Fehlende aktuelle Werte führen zu Fehlern. Historie nur über registrierte Faktoren, nicht close[1].
Nur ein Ausdruck, kein Python/Pine. Erlaubt: + - * / % **, Vergleiche, and/or/not, a if condition else b. Funktionen: abs(x), min(a,b,...), max(a,b,...), log(x), log1p(x), sqrt(x), clip(x,low,high). Aufrufe: momentum(period=20), factor("talib:RSI", timeperiod=14), factor("qlib:alpha158:MA20"). Kein symbol übergeben.
JSON-Objekt nur mit endlichen Zahlen oder booleschen Werten. Gültige Bezeichner ohne Kollision mit Feldern oder reservierten Funktionen. Direkt period=lookback verwenden, nicht params.get() oder momentum(20). Qlib-Fenster stehen in der ID; keine weiteren Argumente.
Ein endlicher Skalar je Instrument/Zeitpunkt; boolesche Werte werden 0/1. Keine Arrays, Wörterbücher, Zeichnungen oder Orders. Division durch null und ungültige log/sqrt-Eingaben absichern. TA-Lib-Mehrfachausgaben über die Katalogoption output="..." wählen.
Maximal 2000 Zeichen und 120 Syntaxbaumknoten. Keine Zuweisungen, Imports, Schleifen, Attribute, Indizes, Dateien, Netzwerkzugriffe oder verschachtelten eigenen Faktoren. Keine allgemeine Python-Sandbox.
Vor dem Speichern Syntax, Abhängigkeiten und Parameter prüfen und Mindestvorlauf schätzen. Das bestätigt weder reale Datenverfügbarkeit noch Rentabilität. Nach Änderungen erneut prüfen; vor dem Handel historische Tests durchführen.
Nach dem Speichern unter Meine Faktoren factor("custom:<id>", symbol, ...) kopieren. Nur das Eigentümerkonto hat Zugriff. Laufzeitkennzeichnung beachten; eigene Faktoren sind derzeit für Portfolio-/Querschnittsstrategien vorgesehen.
`, `
Falsche Argumentanzahl. Benannte Faktorargumente verwenden; factor() nimmt nur eine positionale ID an.
Unbekanntes oder doppeltes Schlüsselwort; Entpacken von Argumenten ist nicht erlaubt.
Kein endlicher aktueller Wert. Daten, Historie, Division und Eingabebereiche prüfen.
Bitte eine Formel eingeben.
Die Formel ist zu lang.
Die Formel ist zu komplex.
Ungültige Formelsyntax.
Nicht unterstützte Operation.
Unbekanntes Feld, unbekannter Parameter oder unbekannte Funktion.
Referenzierter Faktor nicht gefunden.
Verschachtelte eigene Faktoren werden nicht unterstützt.
Argumente müssen Konstanten oder deklarierte Parameter sein.
Namen, endliche Zahlen/boolesche Vorgaben, Bereiche und Ausgabeoptionen prüfen.
Der Name muss 1 bis 120 Zeichen lang sein.
Eine gültige Richtung wählen.
Eigener Faktor konnte nicht gespeichert werden.
Zuerst die Faktoridee beschreiben.
Maximal 4000 Zeichen verwenden.
KI nicht eingerichtet. Administrator kontaktieren.
Nicht genug Guthaben. Aufladen und erneut versuchen.
Abrechnungsprüfung fehlgeschlagen. Keine Generierung gestartet.
Diese Idee ist mit dem aktuellen Vertrag nicht darstellbar. Anfrage eingrenzen oder unterstützte Faktoren nutzen.
Auch nach Korrektur kein gültiger Faktor. Kein Entwurf übernommen.
Generierung fehlgeschlagen. Dienst vor einer weiteren kostenpflichtigen Anfrage prüfen.
`, `
KI-Generierung
Faktoridee beschreiben
Signal, Rückblick und Richtung angeben. Die KI nutzt den bestehenden Formelvertrag.
Beispiel: hohes 20-Kerzen-Momentum bei niedriger Volatilität bevorzugen; Momentum durch Volatilität teilen.
{cost} Credits je Anfrage
Preis laden
Faktor generieren
Wird generiert…
Abbuchung bei Start wie bei Strategie-KI. Automatische Korrektur inklusive; erneute Generierung kostet erneut. Kein automatisches Speichern.
Geprüfter Entwurf
Übernahme ersetzt das Formular. Logik prüfen und historisch testen.
Ins Formular übernehmen
Entwurf übernommen. Prüfen und anschließend speichern.
`, `
Meine Faktoren
Kompatible Laufzeit
Laufzeitkompatibilität bestätigt keine Datenverfügbarkeit. Felder, Historie und Eingabebereiche bleiben erforderlich.
Zusatzdaten erforderlich: {fields}. OHLCV garantiert diese nicht; fehlende Werte werden nicht aus Preisen geschätzt.
ACOS / ASIN benötigen Eingaben zwischen -1 und 1; normale Assetpreise erfüllen dies meist nicht.
`),
  'fr-FR': pack(`
Transformez une idée en facteur
Une formule, un score. Écrivez-la ou partez d’un exemple.
Modifier
Exemples
Règles
Utilisez des arguments nommés, ex. momentum(period=20). Python/Pine non pris en charge.
Description (facultatif)
La validation indique les champs requis et l’historique minimal.
Un exemple remplace uniquement la formule et les paramètres.
Paramètres par défaut
Utiliser l’exemple
Langage de formules restreint, pas un éditeur de scripts. Dépliez les rubriques.
Entrées et historique
Syntaxe et fonctions
Paramètres et noms
Sortie et plages numériques
Sécurité et limites
Portée de la validation
Appeler le facteur enregistré
Règles et exemples
Utiliser formule et paramètres
Exemple : momentum ajusté à la volatilité
Exemple : TA-Lib RSI
Exemple : position extrême Qlib
Nouveau facteur
Créer un facteur personnalisé
Enregistrer
Annuler
Évaluation sécurisée
Évaluateur restreint sans imports, fichiers, réseau ni facteurs personnalisés imbriqués.
Nom du facteur
Score de qualité du momentum
Saisissez un nom.
Catégorie
Personnalisé
Description de recherche
Décrivez l’hypothèse, le marché et l’utilisation prévue.
Direction attendue
Formule du facteur
Combinez des facteurs enregistrés avec arithmétique, comparaisons, min, max, abs, log, sqrt et clip.
Paramètres par défaut (JSON)
Les nombres et booléens sont référencés directement par leur nom.
Objet JSON contenant uniquement des nombres finis ou des booléens requis.
Valider la formule
Validation réussie.
Échec de validation.
Structure vérifiée · minimum {warmup} bougies · champs requis :
Enregistré dans Mes facteurs.
Échec de l’enregistrement.
Facteur privé · version {version}
`, `
Entrée : un instrument à l’instant évalué. open/high/low/close/volume sont les scalaires de la dernière bougie. amount, market_cap, net_income, shareholder_equity, revenue_growth, total_debt, free_cash_flow, pe_ratio, pb_ratio, return_on_equity, debt_to_equity nécessitent des données supplémentaires ; les fondamentaux doivent respecter leur date de disponibilité. Une valeur récente manquante provoque une erreur. Historique via les facteurs enregistrés, pas close[1].
Une expression, pas Python/Pine. Opérateurs : + - * / % **, comparaisons, and/or/not, a if condition else b. Fonctions : abs(x), min(a,b,...), max(a,b,...), log(x), log1p(x), sqrt(x), clip(x,low,high). Appels : momentum(period=20), factor("talib:RSI", timeperiod=14), factor("qlib:alpha158:MA20"). Ne pas passer symbol.
Objet JSON de nombres finis ou booléens. Noms valides, sans conflit avec les champs ou fonctions réservées. Utiliser period=lookback, pas params.get() ni momentum(20). Les fenêtres Qlib sont dans l’ID ; aucun paramètre supplémentaire.
Un scalaire fini par instrument/instant ; les booléens deviennent 0/1. Pas de tableaux, dictionnaires, graphiques ou ordres. Protéger les divisions par zéro et les domaines log/sqrt. Choisir les sorties multiples TA-Lib via output="..." selon le catalogue.
Maximum 2000 caractères et 120 nœuds syntaxiques. Affectations, imports, boucles, attributs, indexation, fichiers, réseau et facteurs personnalisés imbriqués interdits. Ce n’est pas un bac à sable Python généraliste.
Avant enregistrement, vérifie syntaxe, dépendances et paramètres, et estime l’historique minimal. Ne garantit ni données réelles suffisantes ni rentabilité. Toute modification nécessite une nouvelle validation ; tester sur l’historique avant de négocier.
Après enregistrement, copier factor("custom:<id>", symbol, ...) depuis Mes facteurs. Seul le compte propriétaire y accède. Respecter l’étiquette d’exécution ; actuellement destiné aux stratégies de portefeuille/transversales.
`, `
Nombre d’arguments incorrect. Arguments nommés requis ; factor() accepte un seul ID positionnel.
Argument nommé inconnu ou dupliqué ; déballage interdit.
Impossible d’obtenir une valeur actuelle finie. Vérifier données, historique, divisions et domaines.
Saisissez une formule.
Formule trop longue.
Formule trop complexe.
Syntaxe incorrecte.
Opération non prise en charge.
Champ, paramètre ou fonction inconnu.
Facteur référencé introuvable.
Facteurs personnalisés imbriqués non pris en charge.
Les arguments doivent être des constantes ou des paramètres déclarés.
Vérifier noms, valeurs finies/booléennes, plages et options de sortie.
Le nom doit contenir de 1 à 120 caractères.
Choisissez une direction valide.
Impossible d’enregistrer le facteur.
Décrivez d’abord votre idée.
Limitez la description à 4000 caractères.
IA non configurée. Contactez l’administrateur.
Crédits insuffisants. Rechargez puis réessayez.
Vérification de facturation échouée. Aucune génération lancée.
Le contrat actuel ne peut exprimer cette idée. Réduisez la demande ou choisissez des facteurs pris en charge.
Aucun facteur valide après correction. Aucun brouillon appliqué.
Échec de génération. Vérifiez le service avant une nouvelle demande payante.
`, `
Génération IA
Décrivez votre idée de facteur
Précisez le signal, la période et la direction. L’IA respecte le contrat existant.
Exemple : favoriser un momentum sur 20 bougies élevé et une faible volatilité ; diviser le momentum par la volatilité.
{cost} crédits / demande
Charger le tarif
Générer le facteur
Génération…
Débit au lancement, comme l’IA de stratégie. Correction automatique incluse ; une nouvelle génération est facturée. Pas d’enregistrement automatique.
Brouillon vérifié
Appliquer remplace le formulaire. Vérifiez la logique et testez sur l’historique.
Appliquer au formulaire
Brouillon appliqué. Vérifiez puis enregistrez.
`, `
Mes facteurs
Exécution compatible
La compatibilité d’exécution ne garantit pas les données. Champs, historique et domaines doivent être satisfaits.
Données supplémentaires : {fields}. OHLCV ne les garantit pas ; aucune estimation par les prix ne remplace les données manquantes.
ACOS / ASIN exigent une entrée entre -1 et 1, ce qui exclut généralement les prix d’actifs ordinaires.
`),
  'ru-RU': pack(`
Превратите идею в фактор
Одна формула — одна оценка. Напишите её или начните с примера.
Редактор
Примеры
Правила
Используйте именованные аргументы: momentum(period=20). Python/Pine не поддерживаются.
Описание (необязательно)
Проверка покажет нужные поля и минимальную историю.
Пример заменяет только формулу и параметры.
Параметры по умолчанию
Использовать пример
Ограниченный язык формул, не редактор скриптов. Раскройте нужный раздел.
Входные данные и история
Синтаксис и функции
Параметры и имена
Результат и диапазоны
Безопасность и ограничения
Что проверяется
Вызов сохранённого фактора
Правила и примеры
Применить формулу и параметры
Пример: моментум с учётом волатильности
Пример: TA-Lib RSI
Пример: положение экстремума Qlib
Новый фактор
Создать свой фактор
Сохранить
Отмена
Безопасное вычисление
Ограниченный вычислитель без импортов, файлов, сети и вложенных пользовательских факторов.
Название фактора
Оценка качества моментума
Введите название.
Категория
Пользовательский
Описание исследования
Опишите гипотезу сигнала, рынок и назначение.
Ожидаемое направление
Формула фактора
Объединяйте зарегистрированные факторы арифметикой, сравнениями, min, max, abs, log, sqrt и clip.
Параметры по умолчанию (JSON)
Числовые и логические параметры доступны в формуле по имени.
Нужен JSON-объект только с конечными числами или логическими значениями.
Проверить формулу
Формула прошла проверку.
Проверка формулы не пройдена.
Структура проверена · минимум {warmup} свечей · нужные поля:
Сохранено в «Мои факторы».
Не удалось сохранить.
Приватный фактор · версия {version}
`, `
Вход: один инструмент на момент оценки. open/high/low/close/volume — скаляры последней свечи. amount, market_cap, net_income, shareholder_equity, revenue_growth, total_debt, free_cash_flow, pe_ratio, pb_ratio, return_on_equity, debt_to_equity требуют дополнительных данных; фундаментальные данные должны учитывать время доступности. Пропуск текущего значения вызывает ошибку. История доступна через зарегистрированные факторы, не через close[1].
Одно выражение, не Python/Pine. Допустимы + - * / % **, сравнения, and/or/not, a if condition else b. Функции: abs(x), min(a,b,...), max(a,b,...), log(x), log1p(x), sqrt(x), clip(x,low,high). Вызовы: momentum(period=20), factor("talib:RSI", timeperiod=14), factor("qlib:alpha158:MA20"). symbol не передаётся.
JSON-объект с конечными числами или логическими значениями. Имена — допустимые идентификаторы без совпадения с полями/зарезервированными функциями. Используйте period=lookback, не params.get() или momentum(20). Окна Qlib включены в ID, другие аргументы не нужны.
Один конечный скаляр на инструмент/момент; логические значения преобразуются в 0/1. Массивы, словари, графики и ордера запрещены. Защитите деление на ноль и области log/sqrt. Выход TA-Lib выбирается через output="..." по каталогу.
До 2000 символов и 120 узлов синтаксического дерева. Запрещены присваивания, импорты, циклы, атрибуты, индексы, файлы, сеть и вложенные пользовательские факторы. Это не универсальная Python-песочница.
Перед сохранением проверяются синтаксис, зависимости, параметры и оценивается минимальный прогрев. Наличие рыночных данных и прибыльность не проверяются. После изменений нужна повторная проверка; перед торговлей тестируйте на истории.
После сохранения скопируйте factor("custom:<id>", symbol, ...) из «Мои факторы». Доступ только у владельца. Учитывайте метку среды выполнения; сейчас пользовательские факторы предназначены для портфельных/поперечных стратегий.
`, `
Неверное число аргументов. Используйте именованные параметры; factor() принимает один позиционный ID.
Неизвестный или повторный аргумент; распаковка запрещена.
Нет конечного текущего значения. Проверьте данные, историю, деление и диапазоны.
Введите формулу.
Формула слишком длинная.
Формула слишком сложная.
Ошибка синтаксиса.
Неподдерживаемая операция.
Неизвестное поле, параметр или функция.
Указанный фактор не найден.
Вложенные пользовательские факторы не поддерживаются.
Аргументы должны быть константами или объявленными параметрами.
Проверьте имена, конечные числа/логические значения, диапазоны и выходы.
Название должно содержать 1–120 символов.
Выберите допустимое направление.
Не удалось сохранить пользовательский фактор.
Сначала опишите идею фактора.
Описание — не более 4000 символов.
ИИ не настроен. Обратитесь к администратору.
Недостаточно кредитов. Пополните баланс.
Ошибка проверки оплаты. Генерация не запущена.
Текущий контракт не позволяет выразить идею. Сузьте запрос или выберите поддерживаемые факторы.
После исправления нет допустимого фактора. Черновик не применён.
Ошибка генерации. Проверьте сервис перед новым платным запросом.
`, `
Генерация ИИ
Опишите идею фактора
Укажите сигнал, период и направление. ИИ создаст формулу по действующему контракту.
Пример: предпочитать высокий моментум за 20 свечей и низкую волатильность; разделить моментум на волатильность.
{cost} кредитов / запрос
Загрузить стоимость
Создать фактор
Генерация…
Списание при запуске, как у ИИ стратегий. Автоисправление включено; новая генерация оплачивается отдельно. Автосохранения нет.
Проверенный черновик
Применение заменит форму. Проверьте логику и протестируйте на истории.
Заполнить форму
Черновик применён. Проверьте и сохраните.
`, `
Мои факторы
Совместимая среда
Совместимость среды не означает готовность данных. Нужны поля, история и допустимые диапазоны.
Нужны дополнительные данные: {fields}. OHLCV их не гарантирует; пропуски не заменяются ценовыми оценками.
ACOS / ASIN требуют входа от -1 до 1; обычные цены активов обычно не подходят.
`),
  'ar-SA': pack(`
حوّل فكرتك إلى عامل
صيغة واحدة ودرجة واحدة. اكتبها أو ابدأ بمثال.
تحرير العامل
أمثلة
قواعد الكتابة
استخدم معاملات مسماة مثل momentum(period=20). لا تدعم نصوص Python أو Pine.
الوصف (اختياري)
يعرض التحقق الحقول المطلوبة والحد الأدنى للسجل.
يستبدل المثال الصيغة والمعاملات فقط.
المعاملات الافتراضية
استخدام المثال
لغة صيغ مقيدة وليست محرر نصوص برمجية. افتح القسم لعرض قواعده.
المدخلات والسجل
الصياغة والدوال
المعاملات والأسماء
المخرجات والنطاقات
الأمان والحدود
نطاق التحقق
استدعاء العامل المحفوظ
القواعد والأمثلة
استخدام الصيغة والمعاملات
مثال: زخم معدل بالتقلب
مثال: TA-Lib RSI
مثال: موضع القيمة القصوى في Qlib
عامل جديد
إنشاء عامل مخصص
حفظ العامل
إلغاء
تقييم آمن للصيغ
تقييم مقيد دون استيراد أو ملفات أو شبكة أو عوامل مخصصة متداخلة.
اسم العامل
درجة جودة الزخم
أدخل اسمًا للعامل.
الفئة
مخصص
وصف البحث
اشرح فرضية الإشارة والسوق والاستخدام المقصود.
الاتجاه المتوقع
صيغة العامل
ادمج العوامل المسجلة بالحساب والمقارنات و min و max و abs و log و sqrt و clip.
المعاملات الافتراضية (JSON)
تستخدم الأعداد والقيم المنطقية مباشرة بأسمائها في الصيغة.
يلزم كائن JSON يحتوي فقط على أعداد منتهية أو قيم منطقية.
التحقق من الصيغة
نجح التحقق من الصيغة.
فشل التحقق من الصيغة.
تم فحص البنية · الحد الأدنى {warmup} شمعة · الحقول المطلوبة:
تم الحفظ في عواملي.
تعذر الحفظ.
عامل خاص · الإصدار {version}
`, `
المدخل أداة واحدة في وقت التقييم. open/high/low/close/volume قيم مفردة لآخر شمعة. تتطلب amount و market_cap و net_income و shareholder_equity و revenue_growth و total_debt و free_cash_flow و pe_ratio و pb_ratio و return_on_equity و debt_to_equity بيانات إضافية؛ ويجب مراعاة وقت توفر البيانات الأساسية. غياب أحدث قيمة يسبب خطأ. السجل متاح عبر العوامل المسجلة وليس close[1].
تعبير واحد فقط، وليس Python/Pine. يدعم + - * / % ** والمقارنات و and/or/not و a if condition else b. الدوال: abs(x), min(a,b,...), max(a,b,...), log(x), log1p(x), sqrt(x), clip(x,low,high). الاستدعاء: momentum(period=20) أو factor("talib:RSI", timeperiod=14) أو factor("qlib:alpha158:MA20") دون symbol.
كائن JSON بأعداد منتهية أو قيم منطقية فقط. أسماء صالحة لا تتعارض مع الحقول أو الدوال المحجوزة. اكتب period=lookback مباشرة، لا params.get() أو momentum(20). نافذة Qlib ضمن المعرف ولا تقبل معاملات أخرى.
قيمة مفردة منتهية لكل أداة ووقت؛ تتحول القيم المنطقية إلى 0/1. لا مصفوفات أو قواميس أو رسوم أو أوامر. احم القسمة على صفر ونطاق log/sqrt. اختر خرج TA-Lib المتعدد باستخدام output="..." من خيارات المكتبة.
الحد 2000 حرف و120 عقدة شجرة صياغة. يمنع الإسناد والاستيراد والحلقات والخصائص والفهرسة والملفات والشبكة والعوامل المخصصة المتداخلة. ليست بيئة Python عامة.
قبل الحفظ يتحقق من الصياغة والاعتماديات والمعاملات ويقدر الحد الأدنى للتهيئة. لا يضمن اكتمال بيانات السوق أو الربحية. أعد التحقق بعد التعديل واختبر تاريخيًا قبل التداول.
بعد الحفظ انسخ factor("custom:<id>", symbol, ...) من عواملي. الوصول لحساب المالك فقط. اتبع تصنيف بيئة التشغيل؛ العوامل المخصصة مخصصة حاليًا لاستراتيجيات المحافظ/المقاطع العرضية.
`, `
عدد معاملات غير صحيح. يجب تسمية المعاملات؛ تقبل factor() معرفًا موضعيًا واحدًا فقط.
معامل غير مدعوم أو مكرر؛ فك المعاملات غير مسموح.
لا يمكن حساب قيمة حالية منتهية. تحقق من البيانات والسجل والقسمة والنطاقات.
أدخل صيغة العامل.
الصيغة طويلة جدًا.
الصيغة معقدة جدًا.
خطأ في صياغة التعبير.
عملية غير مدعومة.
حقل أو معامل أو دالة غير معروفة.
العامل المرجعي غير موجود.
العوامل المخصصة المتداخلة غير مدعومة.
يجب أن تكون المعاملات ثوابت أو أسماء معلنة.
تحقق من الأسماء والقيم المنتهية/المنطقية والنطاقات وخيارات الخرج.
الاسم من حرف إلى 120 حرفًا.
اختر اتجاهًا صالحًا.
تعذر حفظ العامل المخصص.
صف فكرة العامل أولًا.
يجب ألا يتجاوز الوصف 4000 حرف.
خدمة الذكاء الاصطناعي غير مهيأة. تواصل مع المسؤول.
الرصيد غير كافٍ. اشحن ثم أعد المحاولة.
فشل التحقق من الفوترة ولم يبدأ التوليد.
لا يمكن التعبير عن الفكرة ضمن العقد الحالي. ضيق الطلب أو اختر عوامل مدعومة.
لم ينتج عامل صالح بعد التصحيح. لم تطبق أي مسودة.
فشل التوليد. تحقق من الخدمة قبل طلب مدفوع جديد.
`, `
توليد بالذكاء الاصطناعي
صف فكرة العامل
اشرح الإشارة والفترة والاتجاه؛ سيولد الذكاء الاصطناعي صيغة وفق العقد الحالي.
مثال: تفضيل زخم مرتفع خلال 20 شمعة وتقلب منخفض، بقسمة الزخم على التقلب.
{cost} رصيد لكل طلب
تحميل السعر
توليد العامل
جارٍ التوليد…
يخصم الرصيد عند البدء مثل ذكاء الاستراتيجيات. التصحيح التلقائي مشمول؛ إعادة التوليد طلب مدفوع جديد. لا حفظ تلقائي.
مسودة مفحوصة
التطبيق يستبدل النموذج. راجع المنطق واختبر البيانات التاريخية.
تطبيق في النموذج
تم تطبيق المسودة. راجعها ثم احفظها.
`, `
عواملي
بيئة تشغيل متوافقة
توافق التشغيل لا يعني جاهزية البيانات؛ يجب توفر الحقول والسجل ونطاقات المدخلات.
بيانات إضافية مطلوبة: {fields}. بيانات OHLCV لا تضمنها ولا تستبدل القيم المفقودة بتقديرات الأسعار.
تحتاج ACOS / ASIN مدخلات بين -1 و1؛ غالبًا لا تناسب أسعار الأصول العادية.
`),
  'th-TH': pack(`
เปลี่ยนแนวคิดเป็นปัจจัย
หนึ่งสูตร หนึ่งคะแนน เขียนเองหรือเริ่มจากตัวอย่าง
แก้ไขปัจจัย
ตัวอย่าง
กฎการเขียน
ใช้อาร์กิวเมนต์แบบระบุชื่อ เช่น momentum(period=20) ไม่รองรับ Python/Pine
คำอธิบาย (ไม่บังคับ)
ตรวจสอบเพื่อดูฟิลด์ที่ต้องใช้และประวัติขั้นต่ำ
การใช้ตัวอย่างจะแทนที่เฉพาะสูตรและพารามิเตอร์
พารามิเตอร์เริ่มต้น
ใช้ตัวอย่าง
เป็นภาษาสูตรที่จำกัด ไม่ใช่ตัวแก้ไขสคริปต์ เปิดหัวข้อเพื่อดูกฎ
ข้อมูลเข้าและประวัติ
ไวยากรณ์และฟังก์ชัน
พารามิเตอร์และชื่อ
ผลลัพธ์และช่วงตัวเลข
ความปลอดภัยและข้อจำกัด
สิ่งที่ตรวจสอบ
เรียกปัจจัยที่บันทึกแล้ว
กฎและตัวอย่าง
ใช้สูตรและพารามิเตอร์
ตัวอย่าง: โมเมนตัมปรับตามความผันผวน
ตัวอย่าง: TA-Lib RSI
ตัวอย่าง: ตำแหน่งค่าสุดขั้ว Qlib
ปัจจัยใหม่
สร้างปัจจัยกำหนดเอง
บันทึกปัจจัย
ยกเลิก
การประเมินสูตรที่ปลอดภัย
ประเมินแบบจำกัด ห้ามนำเข้า ไฟล์ เครือข่าย และปัจจัยกำหนดเองซ้อนกัน
ชื่อปัจจัย
คะแนนคุณภาพโมเมนตัม
กรุณาระบุชื่อ
หมวดหมู่
กำหนดเอง
คำอธิบายงานวิจัย
อธิบายสมมติฐานสัญญาณ ตลาด และการใช้งาน
ทิศทางที่คาดหวัง
สูตรปัจจัย
รวมปัจจัยที่ลงทะเบียนด้วยคณิตศาสตร์ การเปรียบเทียบ min, max, abs, log, sqrt และ clip
พารามิเตอร์เริ่มต้น (JSON)
อ้างอิงพารามิเตอร์ตัวเลขและบูลีนด้วยชื่อได้โดยตรง
ต้องเป็นออบเจ็กต์ JSON ที่มีเฉพาะตัวเลขจำกัดหรือบูลีน
ตรวจสอบสูตร
ตรวจสอบสูตรผ่านแล้ว
ตรวจสอบสูตรไม่ผ่าน
ตรวจโครงสร้างแล้ว · อุ่นเครื่องอย่างน้อย {warmup} แท่ง · ฟิลด์ที่ต้องใช้:
บันทึกในปัจจัยของฉันแล้ว
บันทึกไม่สำเร็จ
ปัจจัยส่วนตัว · รุ่น {version}
`, `
ข้อมูลเข้าคือสินทรัพย์เดียว ณ เวลาประเมิน open/high/low/close/volume เป็นค่าสเกลาร์ของแท่งล่าสุด ส่วน amount, market_cap, net_income, shareholder_equity, revenue_growth, total_debt, free_cash_flow, pe_ratio, pb_ratio, return_on_equity, debt_to_equity ต้องมีข้อมูลเพิ่มเติมและข้อมูลพื้นฐานต้องตรงตามเวลาที่ทราบ หากค่าล่าสุดขาดจะเกิดข้อผิดพลาด ใช้ปัจจัยที่ลงทะเบียนเพื่ออ่านประวัติ ไม่รองรับ close[1]
เขียนนิพจน์เดียว ไม่ใช่ Python/Pine รองรับ + - * / % ** การเปรียบเทียบ and/or/not และ a if condition else b ฟังก์ชัน: abs(x), min(a,b,...), max(a,b,...), log(x), log1p(x), sqrt(x), clip(x,low,high) เรียก momentum(period=20), factor("talib:RSI", timeperiod=14) หรือ factor("qlib:alpha158:MA20") โดยไม่ส่ง symbol
พารามิเตอร์เป็น JSON ที่มีเฉพาะตัวเลขจำกัดหรือบูลีน ชื่อต้องถูกต้องและไม่ซ้ำฟิลด์หรือฟังก์ชันสงวน ใช้ period=lookback โดยตรง ไม่ใช้ params.get() หรือ momentum(20) ช่วง Qlib อยู่ใน ID และไม่รับอาร์กิวเมนต์อื่น
ผลลัพธ์เป็นสเกลาร์จำกัดหนึ่งค่าต่อสินทรัพย์/เวลา บูลีนแปลงเป็น 0/1 ห้ามอาร์เรย์ พจนานุกรม กราฟ หรือคำสั่งซื้อ ป้องกันหารศูนย์และโดเมน log/sqrt ผลหลายค่าของ TA-Lib เลือกด้วย output="..." ตามรายการ
จำกัด 2000 อักขระและ 120 โหนดไวยากรณ์ ห้ามกำหนดค่า นำเข้า วนซ้ำ แอตทริบิวต์ ดัชนี ไฟล์ เครือข่าย หรือปัจจัยกำหนดเองซ้อนกัน ไม่ใช่แซนด์บ็อกซ์ Python ทั่วไป
ก่อนบันทึกตรวจไวยากรณ์ การอ้างอิง พารามิเตอร์ และประมาณประวัติขั้นต่ำ ไม่รับรองข้อมูลตลาดจริงหรือกำไร ต้องตรวจใหม่เมื่อแก้ไข และทดสอบย้อนหลังก่อนเทรด
หลังบันทึกคัดลอก factor("custom:<id>", symbol, ...) จากปัจจัยของฉัน ใช้ได้เฉพาะบัญชีเจ้าของ ตรวจป้ายสภาพแวดล้อม ปัจจัยกำหนดเองปัจจุบันรองรับกลยุทธ์พอร์ต/ภาคตัดขวาง
`, `
จำนวนอาร์กิวเมนต์ผิด ต้องระบุชื่อ และ factor() รับ ID ตามตำแหน่งเพียงหนึ่งค่า
อาร์กิวเมนต์ไม่รองรับหรือซ้ำ ห้ามแตกอาร์กิวเมนต์
คำนวณค่าปัจจุบันที่จำกัดไม่ได้ ตรวจข้อมูล ประวัติ การหาร และช่วงค่า
กรุณาระบุสูตร
สูตรยาวเกินไป
สูตรซับซ้อนเกินไป
ไวยากรณ์สูตรไม่ถูกต้อง
การดำเนินการไม่รองรับ
ไม่รู้จักฟิลด์ พารามิเตอร์ หรือฟังก์ชัน
ไม่พบปัจจัยอ้างอิง
ไม่รองรับปัจจัยกำหนดเองซ้อนกัน
อาร์กิวเมนต์ต้องเป็นค่าคงที่หรือพารามิเตอร์ที่ประกาศ
ตรวจชื่อ ค่าเริ่มต้นตัวเลขจำกัด/บูลีน ช่วง และผลลัพธ์
ชื่อต้องยาว 1–120 อักขระ
เลือกทิศทางที่ถูกต้อง
บันทึกปัจจัยกำหนดเองไม่สำเร็จ
อธิบายแนวคิดก่อน
คำอธิบายต้องไม่เกิน 4000 อักขระ
ยังไม่ได้ตั้งค่า AI กรุณาติดต่อผู้ดูแล
เครดิตไม่พอ กรุณาเติมแล้วลองใหม่
ตรวจสอบการคิดเงินไม่สำเร็จ ยังไม่ส่งคำขอสร้าง
กฎปัจจุบันแสดงแนวคิดนี้ไม่ได้ ลดขอบเขตหรือเลือกปัจจัยที่รองรับ
แก้ไขแล้วแต่ยังไม่ถูกต้อง ไม่ได้นำร่างไปใช้
สร้างไม่สำเร็จ ตรวจบริการก่อนส่งคำขอที่มีค่าใช้จ่ายใหม่
`, `
สร้างด้วย AI
อธิบายแนวคิดปัจจัย
ระบุสัญญาณ ช่วงย้อนหลัง และทิศทาง AI จะเขียนตามกฎที่มีอยู่
เช่น เลือกสินทรัพย์โมเมนตัมสูงใน 20 แท่งและความผันผวนต่ำ โดยหารโมเมนตัมด้วยความผันผวน
{cost} เครดิต/ครั้ง
โหลดค่าบริการ
สร้างปัจจัย
กำลังสร้าง…
หักเครดิตเมื่อเริ่มเหมือน AI กลยุทธ์ รวมการแก้อัตโนมัติแล้ว การสร้างใหม่คิดเงินใหม่ ไม่บันทึกอัตโนมัติ
ร่างที่ตรวจแล้ว
การนำไปใช้จะแทนที่แบบฟอร์ม ตรวจตรรกะและทดสอบย้อนหลัง
นำไปใส่แบบฟอร์ม
ใส่ร่างแล้ว กรุณาตรวจก่อนบันทึก
`, `
ปัจจัยของฉัน
สภาพแวดล้อมที่เข้ากันได้
ความเข้ากันได้ไม่รับรองความพร้อมของข้อมูล ต้องมีฟิลด์ ประวัติ และช่วงค่าที่เหมาะสม
ต้องมีข้อมูลเพิ่ม: {fields} OHLCV ทั่วไปไม่รับรอง และไม่แทนค่าที่ขาดด้วยราคาประมาณ
ACOS / ASIN ต้องรับค่าระหว่าง -1 ถึง 1 ราคาสินทรัพย์ทั่วไปมักไม่เข้าเงื่อนไข
`),
  'vi-VN': pack(`
Biến ý tưởng thành nhân tố
Một công thức, một điểm số. Tự viết hoặc bắt đầu từ ví dụ.
Chỉnh sửa
Ví dụ
Quy tắc
Dùng đối số có tên, ví dụ momentum(period=20). Không hỗ trợ Python/Pine.
Mô tả (tùy chọn)
Kiểm tra để xem trường bắt buộc và độ dài lịch sử tối thiểu.
Áp dụng ví dụ chỉ thay công thức và tham số.
Tham số mặc định
Dùng ví dụ
Ngôn ngữ công thức giới hạn, không phải trình viết mã. Mở mục để xem quy tắc.
Dữ liệu vào và lịch sử
Cú pháp và hàm
Tham số và tên
Đầu ra và miền giá trị
An toàn và giới hạn
Nội dung kiểm tra
Gọi nhân tố đã lưu
Quy tắc và ví dụ
Dùng công thức và tham số
Ví dụ: động lượng điều chỉnh biến động
Ví dụ: TA-Lib RSI
Ví dụ: vị trí cực trị Qlib
Nhân tố mới
Tạo nhân tố tùy chỉnh
Lưu nhân tố
Hủy
Đánh giá công thức an toàn
Bộ tính giới hạn, không nhập mô-đun, đọc tệp, truy cập mạng hay lồng nhân tố tùy chỉnh.
Tên nhân tố
Điểm chất lượng động lượng
Nhập tên nhân tố.
Danh mục
Tùy chỉnh
Mô tả nghiên cứu
Mô tả giả thuyết tín hiệu, thị trường và mục đích.
Hướng kỳ vọng
Công thức nhân tố
Kết hợp nhân tố đã đăng ký bằng số học, so sánh, min, max, abs, log, sqrt và clip.
Tham số mặc định (JSON)
Tham số số và boolean được tham chiếu trực tiếp bằng tên.
Cần đối tượng JSON chỉ chứa số hữu hạn hoặc boolean.
Kiểm tra công thức
Công thức đã vượt qua kiểm tra.
Kiểm tra công thức thất bại.
Đã kiểm tra cấu trúc · tối thiểu {warmup} nến · trường bắt buộc:
Đã lưu vào Nhân tố của tôi.
Không lưu được.
Nhân tố riêng tư · phiên bản {version}
`, `
Đầu vào là một tài sản tại thời điểm đánh giá. open/high/low/close/volume là giá trị vô hướng của nến mới nhất. amount, market_cap, net_income, shareholder_equity, revenue_growth, total_debt, free_cash_flow, pe_ratio, pb_ratio, return_on_equity, debt_to_equity cần dữ liệu bổ sung; dữ liệu cơ bản phải đúng thời điểm được biết. Thiếu giá trị mới nhất sẽ báo lỗi. Lấy lịch sử qua nhân tố đã đăng ký, không dùng close[1].
Chỉ một biểu thức, không phải Python/Pine. Hỗ trợ + - * / % **, so sánh, and/or/not, a if condition else b. Hàm: abs(x), min(a,b,...), max(a,b,...), log(x), log1p(x), sqrt(x), clip(x,low,high). Gọi momentum(period=20), factor("talib:RSI", timeperiod=14) hoặc factor("qlib:alpha158:MA20"), không truyền symbol.
Đối tượng JSON chỉ chứa số hữu hạn hoặc boolean. Tên hợp lệ, không trùng trường hoặc hàm dành riêng. Dùng period=lookback trực tiếp, không dùng params.get() hay momentum(20). Cửa sổ Qlib nằm trong ID, không truyền tham số khác.
Một giá trị vô hướng hữu hạn cho mỗi tài sản/thời điểm; boolean thành 0/1. Không mảng, từ điển, đồ thị hoặc lệnh. Bảo vệ chia cho không và miền log/sqrt. Chọn đầu ra TA-Lib bằng output="..." theo danh mục.
Tối đa 2000 ký tự và 120 nút cây cú pháp. Cấm gán, nhập mô-đun, vòng lặp, thuộc tính, chỉ mục, tệp, mạng và nhân tố tùy chỉnh lồng nhau. Không phải sandbox Python tổng quát.
Trước khi lưu, kiểm tra cú pháp, phụ thuộc, tham số và ước lượng lịch sử tối thiểu. Không đảm bảo dữ liệu thực tế đầy đủ hay có lợi nhuận. Thay đổi cần kiểm tra lại; thử trên lịch sử trước khi giao dịch.
Sau khi lưu, sao chép factor("custom:<id>", symbol, ...) trong Nhân tố của tôi. Chỉ tài khoản sở hữu truy cập được. Tuân theo nhãn môi trường chạy; hiện dành cho chiến lược danh mục/cắt ngang.
`, `
Sai số đối số. Dùng đối số có tên; factor() chỉ nhận một ID theo vị trí.
Đối số không hỗ trợ hoặc trùng lặp; không được giải nén đối số.
Không tính được giá trị hiện tại hữu hạn. Kiểm tra dữ liệu, lịch sử, phép chia và miền giá trị.
Nhập công thức.
Công thức quá dài.
Công thức quá phức tạp.
Cú pháp không hợp lệ.
Phép toán không được hỗ trợ.
Trường, tham số hoặc hàm không xác định.
Không tìm thấy nhân tố tham chiếu.
Không hỗ trợ nhân tố tùy chỉnh lồng nhau.
Đối số phải là hằng số hoặc tham số đã khai báo.
Kiểm tra tên, giá trị số hữu hạn/boolean, phạm vi và tùy chọn đầu ra.
Tên phải dài từ 1 đến 120 ký tự.
Chọn hướng hợp lệ.
Không lưu được nhân tố tùy chỉnh.
Hãy mô tả ý tưởng trước.
Mô tả tối đa 4000 ký tự.
Chưa cấu hình AI. Liên hệ quản trị viên.
Không đủ tín dụng. Nạp thêm rồi thử lại.
Kiểm tra tính phí thất bại. Chưa gửi yêu cầu tạo.
Quy tắc hiện tại không thể diễn đạt ý tưởng này. Thu hẹp yêu cầu hoặc chọn nhân tố được hỗ trợ.
Sau sửa vẫn không có nhân tố hợp lệ. Chưa áp dụng bản nháp.
Tạo thất bại. Kiểm tra dịch vụ trước khi gửi yêu cầu trả phí mới.
`, `
Tạo bằng AI
Mô tả ý tưởng nhân tố
Nêu tín hiệu, khoảng nhìn lại và hướng. AI sẽ viết theo quy tắc hiện có.
Ví dụ: ưu tiên động lượng 20 nến cao và biến động thấp, lấy động lượng chia biến động.
{cost} tín dụng/lượt
Tải mức phí
Tạo nhân tố
Đang tạo…
Trừ phí khi bắt đầu như AI chiến lược. Đã gồm sửa tự động; tạo lại là yêu cầu trả phí mới. Không tự lưu.
Bản nháp đã kiểm tra
Áp dụng sẽ thay nội dung biểu mẫu. Kiểm tra logic và thử trên lịch sử.
Điền vào biểu mẫu
Đã điền bản nháp. Kiểm tra rồi lưu.
`, `
Nhân tố của tôi
Môi trường tương thích
Tương thích môi trường không có nghĩa là đủ dữ liệu. Vẫn cần trường, lịch sử và miền giá trị phù hợp.
Cần dữ liệu thêm: {fields}. OHLCV thông thường không đảm bảo; không thay dữ liệu thiếu bằng ước tính giá.
ACOS / ASIN yêu cầu đầu vào từ -1 đến 1; giá tài sản thông thường thường không phù hợp.
`)
}

const metadataTranslations = {
  'zh-TW': {
    title: '基本資訊與歸屬',
    contract: '基本資訊：因子名稱必填，最多 120 個字元；研究說明選填。分類與預期方向由表單選擇，只用於檢索與排序含義，不會改變公式結果。儲存後僅擁有者帳戶可見。'
  },
  'ja-JP': {
    title: '基本情報と所有権',
    contract: '基本情報：因子名は必須で最大 120 文字、研究説明は任意です。カテゴリと想定方向はフォームで選択し、検索とランキングの意図を示すだけで計算結果は変えません。保存した因子は所有アカウントだけが利用できます。'
  },
  'ko-KR': {
    title: '기본 정보 및 소유권',
    contract: '기본 정보: 팩터 이름은 필수이며 최대 120자이고 연구 설명은 선택 사항입니다. 분류와 예상 방향은 양식에서 선택하며 검색과 순위 의미만 나타내고 계산 결과를 바꾸지 않습니다. 저장된 팩터는 소유 계정에만 공개됩니다.'
  },
  'de-DE': {
    title: 'Grunddaten und Eigentum',
    contract: 'Metadaten: Der Faktorname ist erforderlich und auf 120 Zeichen begrenzt; die Forschungsbeschreibung ist optional. Kategorie und erwartete Richtung werden im Formular gewählt und dienen nur Suche und Ranginterpretation, nicht der Berechnung. Gespeicherte Faktoren sind nur für das Eigentümerkonto sichtbar.'
  },
  'fr-FR': {
    title: 'Informations et propriété',
    contract: 'Métadonnées : le nom du facteur est obligatoire et limité à 120 caractères ; la description de recherche est facultative. La catégorie et le sens attendu sont choisis dans le formulaire pour la recherche et l’interprétation du classement, sans modifier le calcul. Le facteur enregistré reste privé pour son compte propriétaire.'
  },
  'ru-RU': {
    title: 'Основные сведения и владелец',
    contract: 'Метаданные: название фактора обязательно и не длиннее 120 символов, описание исследования необязательно. Категория и ожидаемое направление выбираются в форме и нужны для поиска и смысла ранжирования, но не меняют расчёт. Сохранённый фактор доступен только аккаунту владельца.'
  },
  'ar-SA': {
    title: 'المعلومات الأساسية والملكية',
    contract: 'البيانات الأساسية: اسم العامل مطلوب وبحد أقصى 120 حرفًا، ووصف البحث اختياري. تُختار الفئة والاتجاه المتوقع من النموذج لأغراض البحث وتفسير الترتيب فقط ولا تغيّران نتيجة الحساب. يبقى العامل المحفوظ خاصًا بحساب المالك.'
  },
  'th-TH': {
    title: 'ข้อมูลพื้นฐานและเจ้าของ',
    contract: 'ข้อมูลพื้นฐาน: ต้องระบุชื่อปัจจัยและยาวไม่เกิน 120 อักขระ ส่วนคำอธิบายงานวิจัยไม่บังคับ หมวดหมู่และทิศทางที่คาดเลือกจากแบบฟอร์มเพื่อการค้นหาและความหมายของการจัดอันดับเท่านั้น ไม่เปลี่ยนผลคำนวณ ปัจจัยที่บันทึกจะเป็นส่วนตัวของบัญชีเจ้าของ'
  },
  'vi-VN': {
    title: 'Thông tin cơ bản và quyền sở hữu',
    contract: 'Thông tin cơ bản: tên nhân tố là bắt buộc và tối đa 120 ký tự; mô tả nghiên cứu là tùy chọn. Danh mục và hướng kỳ vọng được chọn trong biểu mẫu, chỉ phục vụ tìm kiếm và diễn giải xếp hạng, không thay đổi kết quả tính toán. Nhân tố đã lưu chỉ hiển thị với tài khoản sở hữu.'
  }
}

for (const [locale, translation] of Object.entries(metadataTranslations)) {
  messages[locale]['factorLibrary.custom.rule.metadata'] = translation.title
  messages[locale]['factorLibrary.custom.contractMetadata'] = translation.contract
}

export default messages
