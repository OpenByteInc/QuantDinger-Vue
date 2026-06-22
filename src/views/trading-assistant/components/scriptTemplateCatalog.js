// Script-strategy template catalog.
//
// Templates `trendFollowing`, `martingale`, `grid` and `dca` were intentionally
// removed because the "Trading Bot" page already offers wizard-based versions
// of the same four strategies (see `views/trading-bot/components/botScriptTemplates.js`).
//
// Signal-style templates (`meanReversion`, `breakout`, `rsiMeanReversion`, `macdCross`, etc.)
// were also removed — those belong in Indicator IDE + Indicator Signal Strategy.
// i18n labels under `trading-assistant.template.*` are kept for legacy display.
//
// What stays here are the "stateful" templates that genuinely cannot be
// expressed as a single-indicator signal strategy: trailing stops, scale-in
// ladders, take-profit ladders, etc.
const TEMPLATE_DEFINITIONS = [
  {
    key: 'trailingStop',
    icon: '🪤',
    accent: 'violet',
    code: `"""
Trailing Stop Strategy
Enter on EMA crossover, manage exits with a hard stop and a trailing stop
that arms only after a minimum profit threshold is reached.
"""

def on_init(ctx):
    ctx.fast_period = ctx.param('fast_period', 10)
    ctx.slow_period = ctx.param('slow_period', 30)
    ctx.position_pct = ctx.param('position_pct', 0.8)
    ctx.hard_stop_pct = ctx.param('hard_stop_pct', 0.025)
    ctx.trailing_stop_pct = ctx.param('trailing_stop_pct', 0.015)
    ctx.trailing_arm_pct = ctx.param('trailing_arm_pct', 0.02)
    ctx.peak_price = 0.0
    ctx.trailing_armed = False

def _ema(values, period):
    k = 2.0 / (period + 1)
    e = float(values[0])
    for v in values[1:]:
        e = float(v) * k + e * (1 - k)
    return e

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.slow_period + 5)
    if len(bars) < ctx.slow_period:
        return
    closes = [b['close'] for b in bars]
    prev_fast = _ema(closes[:-1], ctx.fast_period)
    prev_slow = _ema(closes[:-1], ctx.slow_period)
    fast = _ema(closes, ctx.fast_period)
    slow = _ema(closes, ctx.slow_period)
    cross_up = prev_fast <= prev_slow and fast > slow
    price = bar['close']

    if not ctx.position and cross_up:
        qty = (ctx.equity * ctx.position_pct) / price
        ctx.open_long(amount=qty, price=price)
        ctx.peak_price = price
        ctx.trailing_armed = False
        ctx.log(f"BUY at {price:.2f}")
        return

    if ctx.position and ctx.position['side'] == 'long':
        entry = ctx.position['entry_price']
        ctx.peak_price = max(ctx.peak_price, price)
        pnl_pct = (price - entry) / entry

        if pnl_pct <= -ctx.hard_stop_pct:
            ctx.close_position()
            ctx.log(f"HARD STOP at {price:.2f} ({pnl_pct*100:.2f}%)")
            return

        if not ctx.trailing_armed and pnl_pct >= ctx.trailing_arm_pct:
            ctx.trailing_armed = True
            ctx.log(f"Trailing armed at {price:.2f}")

        if ctx.trailing_armed:
            trail_stop = ctx.peak_price * (1 - ctx.trailing_stop_pct)
            if price <= trail_stop:
                ctx.close_position()
                ctx.log(f"TRAILING STOP at {price:.2f} (peak {ctx.peak_price:.2f})")
`,
    params: [
      { name: 'fast_period', type: 'integer', default: 10, min: 2, max: 120, step: 1 },
      { name: 'slow_period', type: 'integer', default: 30, min: 5, max: 240, step: 1 },
      { name: 'position_pct', type: 'percent', default: 80, min: 5, max: 100, step: 1 },
      { name: 'hard_stop_pct', type: 'percent', default: 2.5, min: 0.1, max: 50, step: 0.1 },
      { name: 'trailing_stop_pct', type: 'percent', default: 1.5, min: 0.1, max: 50, step: 0.1 },
      { name: 'trailing_arm_pct', type: 'percent', default: 2, min: 0.1, max: 50, step: 0.1 }
    ]
  },
  {
    key: 'scaleInOnDip',
    icon: '🪜',
    accent: 'teal',
    code: `"""
Scale-in on dip Strategy
Build a position in tranches as price keeps falling below the entry,
then exit with a take-profit measured against the average cost.
"""

def on_init(ctx):
    ctx.entry_pct = ctx.param('entry_pct', 0.25)
    ctx.dip_step_pct = ctx.param('dip_step_pct', 0.02)
    ctx.max_layers = ctx.param('max_layers', 4)
    ctx.take_profit_pct = ctx.param('take_profit_pct', 0.04)
    ctx.hard_stop_pct = ctx.param('hard_stop_pct', 0.10)
    ctx.entry_anchor = 0.0
    ctx.layers = 0
    ctx.avg_cost = 0.0

def _trigger_open(ctx, bar):
    bars = ctx.bars(20)
    if len(bars) < 5:
        return False
    return bar['close'] < bars[-2]['close']

def on_bar(ctx, bar):
    price = bar['close']

    if not ctx.position:
        if _trigger_open(ctx, bar):
            qty = (ctx.equity * ctx.entry_pct) / price
            ctx.open_long(amount=qty, price=price)
            ctx.entry_anchor = price
            ctx.layers = 1
            ctx.avg_cost = price
            ctx.log(f"OPEN layer 1 at {price:.2f}")
        return

    if ctx.position['side'] != 'long':
        return

    entry = ctx.position['entry_price']
    pnl_pct = (price - entry) / entry

    if pnl_pct <= -ctx.hard_stop_pct:
        ctx.close_position()
        ctx.layers = 0
        ctx.log(f"HARD STOP at {price:.2f}")
        return

    next_trigger = ctx.entry_anchor * (1 - ctx.dip_step_pct * ctx.layers)
    if ctx.layers < ctx.max_layers and price <= next_trigger:
        qty = (ctx.equity * ctx.entry_pct) / price
        ctx.add_long(amount=qty, price=price)
        ctx.layers += 1
        ctx.avg_cost = (ctx.avg_cost * (ctx.layers - 1) + price) / ctx.layers
        ctx.log(f"SCALE IN layer {ctx.layers} at {price:.2f}, avg {ctx.avg_cost:.2f}")
        return

    if ctx.avg_cost > 0 and price >= ctx.avg_cost * (1 + ctx.take_profit_pct):
        ctx.close_position()
        ctx.log(f"TAKE PROFIT at {price:.2f} (avg {ctx.avg_cost:.2f})")
        ctx.layers = 0
`,
    params: [
      { name: 'entry_pct', type: 'percent', default: 25, min: 1, max: 100, step: 1 },
      { name: 'dip_step_pct', type: 'percent', default: 2, min: 0.1, max: 50, step: 0.1 },
      { name: 'max_layers', type: 'integer', default: 4, min: 1, max: 10, step: 1 },
      { name: 'take_profit_pct', type: 'percent', default: 4, min: 0.1, max: 100, step: 0.1 },
      { name: 'hard_stop_pct', type: 'percent', default: 10, min: 0.5, max: 90, step: 0.5 }
    ]
  },
  {
    key: 'takeProfitLadder',
    icon: '🎯',
    accent: 'amber',
    code: `"""
Take-Profit Ladder Strategy
Enter on EMA crossover, then partially close the position at three
ascending take-profit levels. A hard stop protects the runner.
"""

def on_init(ctx):
    ctx.fast_period = ctx.param('fast_period', 10)
    ctx.slow_period = ctx.param('slow_period', 30)
    ctx.position_pct = ctx.param('position_pct', 0.9)
    ctx.tp1_pct = ctx.param('tp1_pct', 0.02)
    ctx.tp2_pct = ctx.param('tp2_pct', 0.05)
    ctx.tp3_pct = ctx.param('tp3_pct', 0.10)
    ctx.tp1_close = ctx.param('tp1_close', 0.4)
    ctx.tp2_close = ctx.param('tp2_close', 0.4)
    ctx.hard_stop_pct = ctx.param('hard_stop_pct', 0.03)
    ctx.tp_hits = 0
    ctx.original_qty = 0.0

def _ema(values, period):
    k = 2.0 / (period + 1)
    e = float(values[0])
    for v in values[1:]:
        e = float(v) * k + e * (1 - k)
    return e

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.slow_period + 5)
    if len(bars) < ctx.slow_period:
        return
    closes = [b['close'] for b in bars]
    prev_fast = _ema(closes[:-1], ctx.fast_period)
    prev_slow = _ema(closes[:-1], ctx.slow_period)
    fast = _ema(closes, ctx.fast_period)
    slow = _ema(closes, ctx.slow_period)
    cross_up = prev_fast <= prev_slow and fast > slow
    price = bar['close']

    if not ctx.position and cross_up:
        qty = (ctx.equity * ctx.position_pct) / price
        ctx.open_long(amount=qty, price=price)
        ctx.original_qty = qty
        ctx.tp_hits = 0
        ctx.log(f"BUY at {price:.2f}, qty {qty:.4f}")
        return

    if not (ctx.position and ctx.position['side'] == 'long'):
        return

    entry = ctx.position['entry_price']
    pnl_pct = (price - entry) / entry

    if pnl_pct <= -ctx.hard_stop_pct:
        ctx.close_position()
        ctx.tp_hits = 0
        ctx.log(f"HARD STOP at {price:.2f}")
        return

    if ctx.tp_hits == 0 and pnl_pct >= ctx.tp1_pct:
        sell_qty = ctx.original_qty * ctx.tp1_close
        ctx.close_long(amount=sell_qty, price=price)
        ctx.tp_hits = 1
        ctx.log(f"TP1 at {price:.2f}, closed {ctx.tp1_close*100:.0f}%")
    elif ctx.tp_hits == 1 and pnl_pct >= ctx.tp2_pct:
        sell_qty = ctx.original_qty * ctx.tp2_close
        ctx.close_long(amount=sell_qty, price=price)
        ctx.tp_hits = 2
        ctx.log(f"TP2 at {price:.2f}, closed {ctx.tp2_close*100:.0f}%")
    elif ctx.tp_hits == 2 and pnl_pct >= ctx.tp3_pct:
        ctx.close_position()
        ctx.tp_hits = 3
        ctx.log(f"TP3 at {price:.2f}, runner closed")
`,
    params: [
      { name: 'fast_period', type: 'integer', default: 10, min: 2, max: 120, step: 1 },
      { name: 'slow_period', type: 'integer', default: 30, min: 5, max: 240, step: 1 },
      { name: 'position_pct', type: 'percent', default: 90, min: 5, max: 100, step: 1 },
      { name: 'tp1_pct', type: 'percent', default: 2, min: 0.1, max: 100, step: 0.1 },
      { name: 'tp2_pct', type: 'percent', default: 5, min: 0.1, max: 100, step: 0.1 },
      { name: 'tp3_pct', type: 'percent', default: 10, min: 0.1, max: 200, step: 0.1 },
      { name: 'tp1_close', type: 'percent', default: 40, min: 5, max: 100, step: 1 },
      { name: 'tp2_close', type: 'percent', default: 40, min: 5, max: 100, step: 1 },
      { name: 'hard_stop_pct', type: 'percent', default: 3, min: 0.1, max: 50, step: 0.1 }
    ]
  },
  {
    key: 'maCrossover',
    icon: '📈',
    accent: 'blue',
    code: `"""
Dual Moving Average Crossover Strategy
Fast SMA crosses above slow SMA to buy, and crosses below to exit.
"""

def on_init(ctx):
    ctx.fast_period = ctx.param('fast_period', 10)
    ctx.slow_period = ctx.param('slow_period', 30)
    ctx.position_pct = ctx.param('position_pct', 0.8)

def _sma(values, period):
    return sum(values[-period:]) / period

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.slow_period + 2)
    if len(bars) < ctx.slow_period + 2:
        return
    closes = [b['close'] for b in bars]
    
    fast_curr = _sma(closes, ctx.fast_period)
    fast_prev = _sma(closes[:-1], ctx.fast_period)
    slow_curr = _sma(closes, ctx.slow_period)
    slow_prev = _sma(closes[:-1], ctx.slow_period)
    
    price = bar['close']
    
    if not ctx.position:
        if fast_prev <= slow_prev and fast_curr > slow_curr:
            qty = (ctx.equity * ctx.position_pct) / price
            ctx.buy(price, qty)
            ctx.log(f"Golden Cross BUY at {price:.2f}")
    else:
        if fast_prev >= slow_prev and fast_curr < slow_curr:
            ctx.close_position()
            ctx.log(f"Death Cross Exit SELL at {price:.2f}")
`,
    params: [
      { name: 'fast_period', type: 'integer', default: 10, min: 2, max: 100, step: 1 },
      { name: 'slow_period', type: 'integer', default: 30, min: 5, max: 300, step: 1 },
      { name: 'position_pct', type: 'percent', default: 0.8, min: 0.05, max: 1.0, step: 0.01 }
    ]
  },
  {
    key: 'rsiOversold',
    icon: '🌊',
    accent: 'cyan',
    code: `"""
RSI Oversold Bounce Strategy
Enter long when RSI rises above the oversold boundary, and exit
when RSI rises above the overbought boundary.
"""

def on_init(ctx):
    ctx.rsi_period = ctx.param('rsi_period', 14)
    ctx.oversold = ctx.param('oversold', 30)
    ctx.overbought = ctx.param('overbought', 70)
    ctx.position_pct = ctx.param('position_pct', 0.8)

def _rsi(closes, period):
    if len(closes) < period + 1:
        return 50.0
    deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
    gains = [d if d > 0 else 0 for d in deltas]
    losses = [-d if d < 0 else 0 for d in deltas]
    
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    
    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.rsi_period * 3)
    if len(bars) < ctx.rsi_period + 2:
        return
    closes = [b['close'] for b in bars]
    
    rsi_curr = _rsi(closes, ctx.rsi_period)
    rsi_prev = _rsi(closes[:-1], ctx.rsi_period)
    price = bar['close']
    
    if not ctx.position:
        if rsi_prev <= ctx.oversold and rsi_curr > ctx.oversold:
            qty = (ctx.equity * ctx.position_pct) / price
            ctx.buy(price, qty)
            ctx.log(f"RSI Bounce BUY at {price:.2f} (RSI: {rsi_curr:.2f})")
    else:
        if rsi_curr >= ctx.overbought:
            ctx.close_position()
            ctx.log(f"RSI Overbought Exit SELL at {price:.2f} (RSI: {rsi_curr:.2f})")
`,
    params: [
      { name: 'rsi_period', type: 'integer', default: 14, min: 2, max: 50, step: 1 },
      { name: 'oversold', type: 'integer', default: 30, min: 5, max: 50, step: 1 },
      { name: 'overbought', type: 'integer', default: 70, min: 50, max: 95, step: 1 },
      { name: 'position_pct', type: 'percent', default: 0.8, min: 0.05, max: 1.0, step: 0.01 }
    ]
  },
  {
    key: 'bollingerSqueeze',
    icon: '💥',
    accent: 'orange',
    code: `"""
Bollinger Band Squeeze Breakout Strategy
Identify low volatility periods where Bollinger Bands squeeze together,
then trade the breakout above the upper band. Exit when price reverts.
"""

def on_init(ctx):
    ctx.bb_period = ctx.param('bb_period', 20)
    ctx.bb_std = ctx.param('bb_std', 2.0)
    ctx.squeeze_threshold = ctx.param('squeeze_threshold', 0.05)
    ctx.position_pct = ctx.param('position_pct', 0.8)
    ctx.is_squeezed = False

def _bb(closes, period, std_mult):
    if len(closes) < period:
        return 0.0, 0.0, 0.0
    sub = closes[-period:]
    sma = sum(sub) / period
    variance = sum((x - sma) ** 2 for x in sub) / period
    std = variance ** 0.5
    return sma, sma + std_mult * std, sma - std_mult * std

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.bb_period + 5)
    if len(bars) < ctx.bb_period:
        return
    closes = [b['close'] for b in bars]
    sma, upper, lower = _bb(closes, ctx.bb_period, ctx.bb_std)
    
    bandwidth = (upper - lower) / sma if sma > 0 else 0
    price = bar['close']
    
    if bandwidth < ctx.squeeze_threshold:
        ctx.is_squeezed = True
        
    if not ctx.position:
        if ctx.is_squeezed and price > upper:
            qty = (ctx.equity * ctx.position_pct) / price
            ctx.buy(price, qty)
            ctx.is_squeezed = False
            ctx.log(f"BB Squeeze Breakout BUY at {price:.2f}")
    else:
        if price < sma:
            ctx.close_position()
            ctx.log(f"BB Reversion Exit SELL at {price:.2f}")
`,
    params: [
      { name: 'bb_period', type: 'integer', default: 20, min: 5, max: 100, step: 1 },
      { name: 'bb_std', type: 'number', default: 2.0, min: 0.5, max: 5.0, step: 0.1 },
      { name: 'squeeze_threshold', type: 'percent', default: 0.05, min: 0.01, max: 0.3, step: 0.005 },
      { name: 'position_pct', type: 'percent', default: 0.8, min: 0.05, max: 1.0, step: 0.01 }
    ]
  },
  {
    key: 'macdDivergence',
    icon: '⚖️',
    accent: 'purple',
    code: `"""
MACD Divergence Strategy
Enter long when a bullish divergence is detected (price makes a lower low
but MACD remains higher). Exit when MACD crosses below its signal line.
"""

def on_init(ctx):
    ctx.fast_period = ctx.param('fast_period', 12)
    ctx.slow_period = ctx.param('slow_period', 26)
    ctx.signal_period = ctx.param('signal_period', 9)
    ctx.position_pct = ctx.param('position_pct', 0.8)

def _macd(closes, fast_p, slow_p, signal_p):
    fast_ema = closes[0]
    slow_ema = closes[0]
    k_fast = 2.0 / (fast_p + 1)
    k_slow = 2.0 / (slow_p + 1)
    
    macd_lines = []
    for c in closes:
        fast_ema = c * k_fast + fast_ema * (1 - k_fast)
        slow_ema = c * k_slow + slow_ema * (1 - k_slow)
        macd_lines.append(fast_ema - slow_ema)
        
    sig_ema = macd_lines[0]
    k_sig = 2.0 / (signal_p + 1)
    sig_emas = []
    for m in macd_lines:
        sig_ema = m * k_sig + sig_ema * (1 - k_sig)
        sig_emas.append(sig_ema)
        
    hist = [m - s for m, s in zip(macd_lines, sig_emas)]
    return macd_lines, sig_emas, hist

def on_bar(ctx, bar):
    lookback = 60
    bars = ctx.bars(lookback)
    if len(bars) < 40:
        return
    closes = [b['close'] for b in bars]
    macd, sig, hist = _macd(closes, ctx.fast_period, ctx.slow_period, ctx.signal_period)
    price = bar['close']
    
    min_p_recent = min(closes[-10:])
    min_p_prior = min(closes[-20:-10])
    min_m_recent = min(macd[-10:])
    min_m_prior = min(macd[-20:-10])
    
    if not ctx.position:
        if min_p_recent < min_p_prior and min_m_recent > min_m_prior and hist[-2] < 0 and hist[-1] > 0:
            qty = (ctx.equity * ctx.position_pct) / price
            ctx.buy(price, qty)
            ctx.log(f"MACD Bullish Divergence BUY at {price:.2f}")
    else:
        if macd[-1] < sig[-1] and macd[-2] >= sig[-2]:
            ctx.close_position()
            ctx.log(f"MACD Signal Line Death Cross SELL at {price:.2f}")
`,
    params: [
      { name: 'fast_period', type: 'integer', default: 12, min: 2, max: 50, step: 1 },
      { name: 'slow_period', type: 'integer', default: 26, min: 5, max: 100, step: 1 },
      { name: 'signal_period', type: 'integer', default: 9, min: 2, max: 50, step: 1 },
      { name: 'position_pct', type: 'percent', default: 0.8, min: 0.05, max: 1.0, step: 0.01 }
    ]
  },
  {
    key: 'breakoutVolume',
    icon: '🚀',
    accent: 'green',
    code: `"""
Volume Breakout Strategy
Enter long when price breaks above a recent high with significantly
increased trading volume. Manage exits using a trailing ATR stop loss.
"""

def on_init(ctx):
    ctx.lookback = ctx.param('lookback', 20)
    ctx.volume_multiplier = ctx.param('volume_multiplier', 1.5)
    ctx.atr_multiplier = ctx.param('atr_multiplier', 2.0)
    ctx.position_pct = ctx.param('position_pct', 0.8)
    ctx.stop_loss_price = 0.0

def _atr(bars, period):
    if len(bars) < period + 1:
        return 0.0
    tr_list = []
    for i in range(1, len(bars)):
        h = bars[i]['high']
        l = bars[i]['low']
        pc = bars[i-1]['close']
        tr = max(h - l, abs(h - pc), abs(l - pc))
        tr_list.append(tr)
    return sum(tr_list[-period:]) / period

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.lookback + 5)
    if len(bars) < ctx.lookback + 2:
        return
    closes = [b['close'] for b in bars[:-1]]
    volumes = [b['volume'] for b in bars[:-1]]
    
    price = bar['close']
    vol = bar['volume']
    
    high_channel = max(closes)
    avg_vol = sum(volumes) / len(volumes)
    
    if not ctx.position:
        if price > high_channel and vol > avg_vol * ctx.volume_multiplier:
            atr_val = _atr(bars, ctx.lookback)
            ctx.stop_loss_price = price - atr_val * ctx.atr_multiplier
            qty = (ctx.equity * ctx.position_pct) / price
            ctx.buy(price, qty)
            ctx.log(f"Volume Breakout BUY at {price:.2f}, SL: {ctx.stop_loss_price:.2f}")
    else:
        if price <= ctx.stop_loss_price:
            ctx.close_position()
            ctx.log(f"ATR Stop Loss SELL at {price:.2f}")
        elif price > high_channel:
            atr_val = _atr(bars, ctx.lookback)
            new_sl = price - atr_val * ctx.atr_multiplier
            if new_sl > ctx.stop_loss_price:
                ctx.stop_loss_price = new_sl
`,
    params: [
      { name: 'lookback', type: 'integer', default: 20, min: 5, max: 100, step: 1 },
      { name: 'volume_multiplier', type: 'number', default: 1.5, min: 1.0, max: 5.0, step: 0.1 },
      { name: 'atr_multiplier', type: 'number', default: 2.0, min: 0.5, max: 5.0, step: 0.1 },
      { name: 'position_pct', type: 'percent', default: 0.8, min: 0.05, max: 1.0, step: 0.01 }
    ]
  },
  {
    key: 'meanReversionBB',
    icon: '🔄',
    accent: 'teal',
    code: `"""
Bollinger Band Mean Reversion Strategy
Buy when price touches or falls below the lower Bollinger Band.
Exit and take profit when price reaches the upper band. Best for ranging markets.
"""

def on_init(ctx):
    ctx.bb_period = ctx.param('bb_period', 20)
    ctx.bb_std = ctx.param('bb_std', 2.0)
    ctx.position_pct = ctx.param('position_pct', 0.8)

def _bb(closes, period, std_mult):
    if len(closes) < period:
        return 0.0, 0.0, 0.0
    sub = closes[-period:]
    sma = sum(sub) / period
    variance = sum((x - sma) ** 2 for x in sub) / period
    std = variance ** 0.5
    return sma, sma + std_mult * std, sma - std_mult * std

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.bb_period + 5)
    if len(bars) < ctx.bb_period:
        return
    closes = [b['close'] for b in bars]
    sma, upper, lower = _bb(closes, ctx.bb_period, ctx.bb_std)
    price = bar['close']
    
    if not ctx.position:
        if price <= lower:
            qty = (ctx.equity * ctx.position_pct) / price
            ctx.buy(price, qty)
            ctx.log(f"BB Reversion BUY at lower band {price:.2f}")
    else:
        if price >= upper:
            ctx.close_position()
            ctx.log(f"BB Reversion Exit SELL at upper band {price:.2f}")
`,
    params: [
      { name: 'bb_period', type: 'integer', default: 20, min: 5, max: 100, step: 1 },
      { name: 'bb_std', type: 'number', default: 2.0, min: 0.5, max: 5.0, step: 0.1 },
      { name: 'position_pct', type: 'percent', default: 0.8, min: 0.05, max: 1.0, step: 0.01 }
    ]
  },
  {
    key: 'turtleTrading',
    icon: '🐢',
    accent: 'red',
    code: `"""
Turtle Trading Strategy
Classic trend following system. Enter long on breakout of 20-bar high,
exit on breakdown of 10-bar low. ATR-based risk/position sizing and stop loss.
"""

def on_init(ctx):
    ctx.entry_period = ctx.param('entry_period', 20)
    ctx.exit_period = ctx.param('exit_period', 10)
    ctx.atr_period = ctx.param('atr_period', 20)
    ctx.risk_per_trade = ctx.param('risk_per_trade', 0.02)
    ctx.stop_price = 0.0

def _atr(bars, period):
    if len(bars) < period + 1:
        return 0.0
    tr_list = []
    for i in range(1, len(bars)):
        h = bars[i]['high']
        l = bars[i]['low']
        pc = bars[i-1]['close']
        tr = max(h - l, abs(h - pc), abs(l - pc))
        tr_list.append(tr)
    return sum(tr_list[-period:]) / period

def on_bar(ctx, bar):
    lookback = max(ctx.entry_period, ctx.exit_period, ctx.atr_period) + 5
    bars = ctx.bars(lookback)
    if len(bars) < max(ctx.entry_period, ctx.exit_period) + 2:
        return
        
    highs = [b['high'] for b in bars[:-1]]
    lows = [b['low'] for b in bars[:-1]]
    price = bar['close']
    
    entry_high = max(highs[-ctx.entry_period:])
    exit_low = min(lows[-ctx.exit_period:])
    
    if not ctx.position:
        if bar['high'] > entry_high:
            atr_val = _atr(bars, ctx.atr_period)
            if atr_val <= 0:
                atr_val = price * 0.01
            qty = (ctx.equity * ctx.risk_per_trade) / atr_val
            qty = min(qty, (ctx.equity * 0.95) / price)
            
            ctx.buy(price, qty)
            ctx.stop_price = price - 2 * atr_val
            ctx.log(f"Turtle Entry BUY at {price:.2f}, SL: {ctx.stop_price:.2f}")
    else:
        if price <= ctx.stop_price:
            ctx.close_position()
            ctx.log(f"Turtle Stop Loss SELL at {price:.2f}")
        elif bar['low'] < exit_low:
            ctx.close_position()
            ctx.log(f"Turtle Channel Exit SELL at {price:.2f}")
`,
    params: [
      { name: 'entry_period', type: 'integer', default: 20, min: 5, max: 100, step: 1 },
      { name: 'exit_period', type: 'integer', default: 10, min: 2, max: 50, step: 1 },
      { name: 'atr_period', type: 'integer', default: 20, min: 5, max: 100, step: 1 },
      { name: 'risk_per_trade', type: 'percent', default: 0.02, min: 0.005, max: 0.1, step: 0.005 }
    ]
  },
  {
    key: 'pairsTrading',
    icon: '⚖️',
    accent: 'blue',
    code: `"""
Pairs Trading Strategy (Single Asset Spread Simulation)
Simulates pairs trading by modeling the spread between price and its SMA.
Buy when price deviates below its mean. Exit when price returns to the mean.
"""

def on_init(ctx):
    ctx.symbol_a = ctx.param('symbol_a', 'BTC/USDT')
    ctx.symbol_b = ctx.param('symbol_b', 'ETH/USDT')
    ctx.lookback = ctx.param('lookback', 60)
    ctx.entry_zscore = ctx.param('entry_zscore', 2.0)
    ctx.exit_zscore = ctx.param('exit_zscore', 0.5)
    ctx.position_pct = ctx.param('position_pct', 0.8)

def _zscore(series, lookback):
    if len(series) < lookback:
        return 0.0
    sub = series[-lookback:]
    mean = sum(sub) / lookback
    variance = sum((x - mean) ** 2 for x in sub) / lookback
    std = variance ** 0.5
    if std == 0:
        return 0.0
    return (series[-1] - mean) / std

def on_bar(ctx, bar):
    bars = ctx.bars(ctx.lookback + 5)
    if len(bars) < ctx.lookback:
        return
    closes = [b['close'] for b in bars]
    
    z = _zscore(closes, ctx.lookback)
    price = bar['close']
    
    if not ctx.position:
        if z <= -ctx.entry_zscore:
            qty = (ctx.equity * ctx.position_pct) / price
            ctx.buy(price, qty)
            ctx.log(f"Pairs Buy Spread at {price:.2f} (z: {z:.2f})")
    else:
        if abs(z) <= ctx.exit_zscore:
            ctx.close_position()
            ctx.log(f"Pairs Reverted Exit at {price:.2f} (z: {z:.2f})")
`,
    params: [
      { name: 'symbol_a', type: 'string', default: 'BTC/USDT' },
      { name: 'symbol_b', type: 'string', default: 'ETH/USDT' },
      { name: 'lookback', type: 'integer', default: 60, min: 10, max: 200, step: 1 },
      { name: 'entry_zscore', type: 'number', default: 2.0, min: 0.5, max: 4.0, step: 0.1 },
      { name: 'exit_zscore', type: 'number', default: 0.5, min: 0.0, max: 2.0, step: 0.1 },
      { name: 'position_pct', type: 'percent', default: 0.8, min: 0.05, max: 1.0, step: 0.01 }
    ]
  },
  {
    key: 'momentumRotation',
    icon: '🌀',
    accent: 'orange',
    code: `"""
Momentum Rotation Strategy
Rotate into the asset when its absolute Rate-of-Change (ROC) momentum is positive.
Reevaluate periodically and rebalance/exit if momentum turns negative.
"""

def on_init(ctx):
    ctx.universe_size = ctx.param('universe_size', 20)
    ctx.hold_count = ctx.param('hold_count', 5)
    ctx.momentum_period = ctx.param('momentum_period', 14)
    ctx.rebalance_interval = ctx.param('rebalance_interval', 7)
    ctx.position_pct = ctx.param('position_pct', 0.8)
    ctx.days_since_rebalance = 0

def _roc(closes, period):
    if len(closes) < period + 1:
        return 0.0
    past = closes[-period-1]
    curr = closes[-1]
    if past == 0:
        return 0.0
    return (curr - past) / past

def on_bar(ctx, bar):
    ctx.days_since_rebalance += 1
    if ctx.days_since_rebalance < ctx.rebalance_interval:
        return
        
    ctx.days_since_rebalance = 0
    
    bars = ctx.bars(ctx.momentum_period + 5)
    if len(bars) < ctx.momentum_period + 2:
        return
    closes = [b['close'] for b in bars]
    
    momentum = _roc(closes, ctx.momentum_period)
    price = bar['close']
    
    if not ctx.position:
        if momentum > 0:
            qty = (ctx.equity * ctx.position_pct) / price
            ctx.buy(price, qty)
            ctx.log(f"Momentum Rotation BUY at {price:.2f} (ROC: {momentum*100:.2f}%)")
    else:
        if momentum <= 0:
            ctx.close_position()
            ctx.log(f"Momentum Rotation Exit SELL at {price:.2f} (ROC: {momentum*100:.2f}%)")
`,
    params: [
      { name: 'universe_size', type: 'integer', default: 20, min: 2, max: 100, step: 1 },
      { name: 'hold_count', type: 'integer', default: 5, min: 1, max: 20, step: 1 },
      { name: 'momentum_period', type: 'integer', default: 14, min: 2, max: 100, step: 1 },
      { name: 'rebalance_interval', type: 'integer', default: 7, min: 1, max: 90, step: 1 },
      { name: 'position_pct', type: 'percent', default: 0.8, min: 0.05, max: 1.0, step: 0.01 }
    ]
  }
]

function escapeForRegExp (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** UI stores percent params as 0–100 (e.g. 80 = 80%). Code uses 0–1 ratios. */
export function normalizePercentParamValue (raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  if (n > 0 && n <= 1) return n * 100
  return n
}

export function percentParamToRatio (value) {
  const n = normalizePercentParamValue(value)
  if (n == null) return 0
  return n / 100
}

function parsePythonLiteral (raw) {
  const text = String(raw == null ? '' : raw).trim()
  if (!text) return ''
  if (text === 'True') return true
  if (text === 'False') return false
  if (text === 'None') return null
  const quote = text[0]
  if ((quote === '"' || quote === "'") && text[text.length - 1] === quote) {
    return text.slice(1, -1)
  }
  const n = Number(text)
  return Number.isFinite(n) ? n : text
}

function isPercentParamName (name, value) {
  const key = String(name || '').toLowerCase()
  if (/(pct|percent|ratio|allocation|weight|position|take_profit|stop|arm|entry)/.test(key)) {
    return typeof value === 'number'
  }
  return false
}

function inferParamType (name, value) {
  if (typeof value === 'boolean') return 'boolean'
  if (isPercentParamName(name, value)) return 'percent'
  if (Number.isInteger(value)) return 'integer'
  if (typeof value === 'number') return 'number'
  return 'text'
}

function inferParamDefaults (name, value, type) {
  if (type === 'percent') {
    return {
      default: normalizePercentParamValue(value) ?? 0,
      min: 0,
      max: 100,
      step: 0.1
    }
  }
  if (type === 'integer') {
    const lowerName = String(name || '').toLowerCase()
    return {
      default: Number.isFinite(value) ? value : 1,
      min: lowerName.includes('period') || lowerName.includes('window') ? 1 : undefined,
      max: lowerName.includes('period') || lowerName.includes('window') ? 500 : undefined,
      step: 1
    }
  }
  if (type === 'number') {
    return {
      default: Number.isFinite(value) ? value : 0,
      step: 0.1
    }
  }
  return { default: value == null ? '' : value }
}

export function extractScriptParamsFromCode (code) {
  const source = String(code || '')
  const pattern = /ctx\.param\(\s*['"]([^'"]+)['"]\s*,\s*([^)\n]+)\)/g
  const seen = new Set()
  const params = []
  let match
  while ((match = pattern.exec(source)) !== null) {
    const name = String(match[1] || '').trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    const parsed = parsePythonLiteral(match[2])
    const type = inferParamType(name, parsed)
    params.push({
      name,
      type,
      ...inferParamDefaults(name, parsed, type)
    })
  }
  if (!params.length) return null
  return {
    key: '__code_params__',
    inferred: true,
    params
  }
}

function toPythonLiteral (value) {
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False'
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '0'
  }
  if (value === null || value === undefined) {
    return 'None'
  }
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export const SCRIPT_TEMPLATE_CATALOG = TEMPLATE_DEFINITIONS

export function getScriptTemplateByKey (key) {
  return TEMPLATE_DEFINITIONS.find(item => item.key === key) || null
}

export function buildTemplateParamValues (templateOrKey, overrides = {}) {
  const template = typeof templateOrKey === 'string' ? getScriptTemplateByKey(templateOrKey) : templateOrKey
  if (!template) return {}
  return template.params.reduce((acc, param) => {
    const raw = Object.prototype.hasOwnProperty.call(overrides, param.name)
      ? overrides[param.name]
      : param.default
    if (param.type === 'percent') {
      acc[param.name] = normalizePercentParamValue(raw) ?? param.default
    } else {
      acc[param.name] = raw
    }
    return acc
  }, {})
}

export function buildTemplateCode (templateOrKey, overrides = {}) {
  const template = typeof templateOrKey === 'string' ? getScriptTemplateByKey(templateOrKey) : templateOrKey
  if (!template) return ''
  const values = buildTemplateParamValues(template, overrides)
  return template.params.reduce((code, param) => {
    const stored = values[param.name]
    const codeValue = param.type === 'percent' ? percentParamToRatio(stored) : stored
    const literal = toPythonLiteral(codeValue)
    const pattern = new RegExp(`(ctx\\.param\\(['"]${escapeForRegExp(param.name)}['"],\\s*)([^\\)]+)(\\))`)
    return code.replace(pattern, `$1${literal}$3`)
  }, template.code)
}

export function buildScriptCodeWithParamValues (code, params = [], overrides = {}) {
  return (params || []).reduce((source, param) => {
    if (!param || !param.name) return source
    const stored = Object.prototype.hasOwnProperty.call(overrides, param.name)
      ? overrides[param.name]
      : param.default
    const codeValue = param.type === 'percent' ? percentParamToRatio(stored) : stored
    const literal = toPythonLiteral(codeValue)
    const pattern = new RegExp(`(ctx\\.param\\(\\s*['"]${escapeForRegExp(param.name)}['"]\\s*,\\s*)([^\\)\\n]+)(\\))`)
    return source.replace(pattern, `$1${literal}$3`)
  }, String(code || ''))
}
