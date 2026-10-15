const factors = {
  ac: ['Accelerator/Decelerator Oscillator', '加速/减速振荡器', 'Measures whether market momentum is accelerating or decelerating around the Awesome Oscillator.'],
  adr: ['Average Day Range', '平均日波幅', 'A rolling average of the high-low range used to compare current volatility with its recent baseline.'],
  ao: ['Awesome Oscillator', '动量震荡指标 AO', 'Compares fast and slow averages of median price to expose changes in market momentum.'],
  cmf: ['Chaikin Money Flow', '蔡金资金流量指标', 'Combines price location and volume to estimate buying and selling pressure over a rolling window.'],
  cmou: ['Chande Momentum Oscillator (Unsmoothed)', '未平滑钱德动量振荡器', 'Measures the balance of recent gains and losses without smoothing the underlying price changes.'],
  coppock: ['Coppock Curve', '科波克曲线', 'A long-term momentum curve built from two rates of change smoothed by a weighted moving average.'],
  cumsum: ['Cumulative Sum', '累积和', 'Returns the path-dependent cumulative sum of the selected price series.'],
  cvi: ["Chaikin's Volatility", '蔡金波动率', 'Tracks the rate of change in the high-low range to identify volatility expansion and contraction.'],
  donchian: ['Donchian Channels', '唐奇安通道', 'Returns upper, middle and lower channels from rolling highs and lows.'],
  dpo: ['Detrended Price Oscillator', '去趋势价格振荡器', 'Removes the longer trend to highlight shorter price cycles around a shifted moving average.'],
  efi: ["Elder's Force Index", '艾尔德强力指数', 'Combines price change and volume to estimate the force behind buying and selling moves.'],
  er: ['Kaufman Efficiency Ratio', '考夫曼效率比率', 'Compares directional price change with total movement to distinguish trends from noise.'],
  eri: ['Elder Ray Index', '艾尔德射线指标', 'Returns bull power and bear power relative to an exponential moving average.'],
  fosc: ['Forecast Oscillator', '预测振荡器', 'Measures the percentage distance between price and its linear-regression forecast.'],
  fractal: ['Williams Fractal', '威廉分形', 'Marks confirmed swing highs and lows from configurable bars on both sides of a pivot.'],
  ha: ['Heikin-Ashi Candles', '平均K线 Heikin-Ashi', 'Transforms OHLC data into smoothed candles for clearer trend and reversal structure.'],
  hma: ['Hull Moving Average', '赫尔移动平均线', 'Reduces moving-average lag while retaining a smooth response to price changes.'],
  kc: ['Keltner Channels', '肯特纳通道', 'Returns an average-based center line with volatility-adjusted upper and lower bands.'],
  kdj: ['KDJ Stochastic', 'KDJ 随机指标', 'Extends the stochastic oscillator with a J line to show momentum divergence and extremes.'],
  marketfi: ['Market Facilitation Index', '市场促进指数', 'Relates each bar’s range to volume to assess the efficiency of market movement.'],
  massi: ['Mass Index', '质量指数', 'Detects range expansion that can precede trend reversals without predicting direction.'],
  nvi: ['Negative Volume Index', '负成交量指数', 'A cumulative index that follows price changes when volume declines.'],
  percentile: ['Percentile', '百分位数', 'Returns the selected nearest-rank percentile of price over a rolling window.'],
  percentrank: ['Percent Rank', '百分位排名', 'Expresses the current price rank within its rolling history as a normalized percentile.'],
  pvi: ['Positive Volume Index', '正成交量指数', 'A cumulative index that follows price changes when volume increases.'],
  pvo: ['Percentage Volume Oscillator', '成交量百分比振荡器', 'Measures the percentage difference between fast and slow moving averages of volume.'],
  pvt: ['Price Volume Trend', '价量趋势 PVT', 'Accumulates volume weighted by percentage price change to track confirmation or divergence.'],
  qstick: ['Qstick', 'Qstick 指标', 'A moving average of the open-close difference used to measure candle bias.'],
  rma: ["Wilder's Smoothed Moving Average", '威尔德平滑移动平均线', 'Applies Wilder smoothing for a stable moving average used by many momentum indicators.'],
  rvi: ['Relative Volatility Index', '相对波动率指数', 'Compares upward and downward volatility to describe the directional bias of volatility.'],
  rvol: ['Relative Volume', '相对成交量', 'Compares current volume with its rolling average to identify unusual participation.'],
  smi: ['Stochastic Momentum Index', '随机动量指数 SMI', 'Measures the close relative to the midpoint of the recent range and includes a signal line.'],
  supertrend: ['SuperTrend', '超级趋势', 'Returns the active ATR-based trend line and trend direction as separate outputs.'],
  tsi: ['True Strength Index', '真实强弱指数 TSI', 'Double-smooths price momentum to measure trend direction and strength.'],
  vhf: ['Vertical Horizontal Filter', '垂直水平过滤器 VHF', 'Compares net movement with total movement to distinguish trending and ranging markets.'],
  vortex: ['Vortex Indicator', '涡旋指标', 'Returns positive and negative trend-movement lines for detecting trend direction and crossovers.'],
  vwap: ['Volume Weighted Average Price', '成交量加权平均价 VWAP', 'Calculates the path-dependent average price weighted by traded volume.'],
  vwma: ['Volume Weighted Moving Average', '成交量加权移动平均线', 'Weights prices by volume over a rolling window to emphasize heavily traded bars.'],
  wad: ["Williams' Accumulation/Distribution", '威廉累积/派发指标', 'Accumulates price movement relative to the prior close to track buying and selling pressure.'],
  zlema: ['Zero-Lag Exponential Moving Average', '零延迟指数移动平均线', 'Compensates for input lag before EMA smoothing to respond faster to price changes.']
}

const locales = ['en-US', 'ar-SA', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', 'th-TH', 'vi-VN', 'zh-CN', 'zh-TW']

const templates = {
  'ar-SA': name => `${name} هو مؤشر فني متاح للاستراتيجيات وأبحاث العوامل عبر TA-Lib 0.8.1.`,
  'de-DE': name => `${name} ist ein technischer Indikator aus TA-Lib 0.8.1 für Strategien und Faktoranalysen.`,
  'fr-FR': name => `${name} est un indicateur technique TA-Lib 0.8.1 utilisable dans les stratégies et la recherche factorielle.`,
  'ja-JP': name => `${name} は、戦略とファクター分析で利用できる TA-Lib 0.8.1 のテクニカル指標です。`,
  'ko-KR': name => `${name}은 전략 및 팩터 리서치에서 사용할 수 있는 TA-Lib 0.8.1 기술 지표입니다.`,
  'ru-RU': name => `${name} — технический индикатор TA-Lib 0.8.1 для стратегий и факторных исследований.`,
  'th-TH': name => `${name} เป็นอินดิเคเตอร์ทางเทคนิคจาก TA-Lib 0.8.1 สำหรับกลยุทธ์และการวิจัยปัจจัย`,
  'vi-VN': name => `${name} là chỉ báo kỹ thuật TA-Lib 0.8.1 dùng cho chiến lược và nghiên cứu nhân tố.`,
  'zh-CN': name => `${name} 是 TA-Lib 0.8.1 新增的技术指标，可用于策略编写与因子投研。`,
  'zh-TW': name => `${name} 是可用於策略與因子研究的 TA-Lib 0.8.1 技術指標。`
}

const categories = {
  'en-US': { overlap: 'Overlay study', pattern_recognition: 'Pattern recognition', price_transform: 'Price transform', cycle: 'Cycle', statistic: 'Statistics', math: 'Mathematics' },
  'ar-SA': { overlap: 'دراسة تراكبية', pattern_recognition: 'التعرّف على الأنماط', price_transform: 'تحويل السعر', cycle: 'الدورة', statistic: 'الإحصاء', math: 'الرياضيات' },
  'de-DE': { overlap: 'Überlagerungsstudie', pattern_recognition: 'Mustererkennung', price_transform: 'Preistransformation', cycle: 'Zyklus', statistic: 'Statistik', math: 'Mathematik' },
  'fr-FR': { overlap: 'Étude superposée', pattern_recognition: 'Reconnaissance de figures', price_transform: 'Transformation du prix', cycle: 'Cycle', statistic: 'Statistiques', math: 'Mathématiques' },
  'ja-JP': { overlap: 'オーバーレイ', pattern_recognition: 'パターン認識', price_transform: '価格変換', cycle: 'サイクル', statistic: '統計', math: '数学' },
  'ko-KR': { overlap: '오버레이', pattern_recognition: '패턴 인식', price_transform: '가격 변환', cycle: '사이클', statistic: '통계', math: '수학' },
  'ru-RU': { overlap: 'Наложение', pattern_recognition: 'Распознавание моделей', price_transform: 'Преобразование цены', cycle: 'Цикл', statistic: 'Статистика', math: 'Математика' },
  'th-TH': { overlap: 'การศึกษาซ้อนทับ', pattern_recognition: 'การรู้จำรูปแบบ', price_transform: 'การแปลงราคา', cycle: 'วัฏจักร', statistic: 'สถิติ', math: 'คณิตศาสตร์' },
  'vi-VN': { overlap: 'Chỉ báo phủ', pattern_recognition: 'Nhận dạng mẫu', price_transform: 'Biến đổi giá', cycle: 'Chu kỳ', statistic: 'Thống kê', math: 'Toán học' },
  'zh-CN': { overlap: '叠加指标', pattern_recognition: '形态识别', price_transform: '价格变换', cycle: '周期', statistic: '统计', math: '数学运算' },
  'zh-TW': { overlap: '疊加指標', pattern_recognition: '型態識別', price_transform: '價格轉換', cycle: '週期', statistic: '統計', math: '數學運算' }
}

const messages = {}
for (const locale of locales) {
  const values = { ...(categories[locale] || {}) }
  const output = {
    'strategyV2.taLibBadge': 'TA-Lib {version}'
  }
  for (const [key, [englishName, chineseName, englishDescription]] of Object.entries(factors)) {
    const name = locale === 'zh-CN' || locale === 'zh-TW' ? chineseName : englishName
    output[`factor.talib.${key}.name`] = name
    output[`factor.talib.${key}.description`] = locale === 'en-US'
      ? englishDescription
      : templates[locale](name, englishDescription)
  }
  for (const [key, value] of Object.entries(values)) {
    output[`factorLibrary.category.${key}`] = value
  }
  messages[locale] = output
}

export default messages
