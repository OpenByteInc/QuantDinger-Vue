/**
 * Default cross-sectional indicator template (momentum + RSI composite score).
 * Used when the user clicks "Insert cross-sectional template" in the strategy form.
 */
export const CROSS_SECTIONAL_INDICATOR_TEMPLATE = `# Cross-sectional: score each symbol in the universe
# Input: data = {symbol: ohlcv_df, ...}
# Output: scores = {symbol: number, ...}

scores = {}

for symbol, df in data.items():
    if len(df) < 20:
        scores[symbol] = 0
        continue

    momentum = (df['close'].iloc[-1] / df['close'].iloc[-20] - 1) * 100

    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    rsi_value = 100 - (100 / (1 + rs.iloc[-1]))

    composite_score = momentum * 0.7 + (100 - rsi_value) * 0.3
    scores[symbol] = composite_score
`
