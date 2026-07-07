const emaAtrTrendRiskCode = `"""
EMA ATR Trend Risk
Classic trend-following model: EMA cross entry, ATR hard stop, ATR trailing
stop, and quote-notional sizing derived from the run panel investment amount.
"""

def on_init(ctx):
    ctx.fast_period = ctx.param('fast_period', 12)
    ctx.slow_period = ctx.param('slow_period', 36)
    ctx.atr_period = ctx.param('atr_period', 14)
    ctx.risk_budget_pct = ctx.param('risk_budget_pct', 0.35)
    ctx.atr_stop_mult = ctx.param('atr_stop_mult', 2.2)
    ctx.atr_trail_mult = ctx.param('atr_trail_mult', 2.8)
    ctx.cooldown_bars = ctx.param('cooldown_bars', 5)

def _side(ctx):
    try:
        direction = str(ctx.direction)
    except Exception:
        direction = 'long'
    return 'short' if direction.lower() == 'short' else 'long'

def _run_budget(ctx):
    try:
        budget = float(ctx.investment_amount or 0.0)
    except Exception:
        budget = 0.0
    if budget > 0:
        return budget
    try:
        return float(ctx.equity or 0.0)
    except Exception:
        return 0.0

def _notional(ctx):
    budget = _run_budget(ctx)
    out = budget * float(ctx.risk_budget_pct)
    return out if out > 0 else 50.0

def _bar_no(ctx):
    try:
        return int(ctx.current_index)
    except Exception:
        return 0

def _key(ctx, name):
    return 'ema_atr_' + _side(ctx) + '_' + name

def _ema(values, period):
    k = 2.0 / (float(period) + 1.0)
    value = float(values[0])
    for item in values[1:]:
        value = float(item) * k + value * (1.0 - k)
    return value

def _atr(bars, period):
    if len(bars) < period + 1:
        return 0.0
    ranges = []
    start = len(bars) - period
    for i in range(start, len(bars)):
        high = float(bars[i]['high'])
        low = float(bars[i]['low'])
        prev_close = float(bars[i - 1]['close'])
        tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
        ranges.append(tr)
    return sum(ranges) / len(ranges) if ranges else 0.0

def _has_leg(ctx):
    side = _side(ctx)
    if not ctx.position:
        return False
    if side == 'long':
        return float(ctx.position.get('long_size', ctx.position.get('size', 0.0)) or 0.0) > 0
    return float(ctx.position.get('short_size', 0.0) or 0.0) > 0

def _leg_qty(ctx):
    if not ctx.position:
        return 0.0
    key = 'long_size' if _side(ctx) == 'long' else 'short_size'
    return float(ctx.position.get(key, 0.0) or 0.0)

def _leg_entry(ctx, fallback):
    if not ctx.position:
        return fallback
    if _side(ctx) == 'long':
        return float(ctx.position.get('long_entry', ctx.position.get('entry_price', fallback)) or fallback or 0.0)
    return float(ctx.position.get('short_entry', fallback) or fallback or 0.0)

def _stop_hit(ctx, price, stop_price):
    if stop_price <= 0:
        return False
    return price <= stop_price if _side(ctx) == 'long' else price >= stop_price

def _trend_cross(ctx, closes):
    prev_fast = _ema(closes[:-1], ctx.fast_period)
    prev_slow = _ema(closes[:-1], ctx.slow_period)
    fast = _ema(closes, ctx.fast_period)
    slow = _ema(closes, ctx.slow_period)
    if _side(ctx) == 'long':
        return prev_fast <= prev_slow and fast > slow
    return prev_fast >= prev_slow and fast < slow

def _initial_stop(ctx, entry, atr):
    if _side(ctx) == 'long':
        return entry - atr * float(ctx.atr_stop_mult)
    return entry + atr * float(ctx.atr_stop_mult)

def _trail_stop(ctx, best, atr):
    if _side(ctx) == 'long':
        return best - atr * float(ctx.atr_trail_mult)
    return best + atr * float(ctx.atr_trail_mult)

def _reset(ctx, next_bar):
    ctx.state.set(_key(ctx, 'best'), 0.0)
    ctx.state.set(_key(ctx, 'stop'), 0.0)
    ctx.state.set(_key(ctx, 'cooldown_until'), int(next_bar))

def on_bar(ctx, bar):
    need = max(int(ctx.slow_period), int(ctx.atr_period)) + 3
    bars = ctx.bars(need)
    if len(bars) < need:
        return

    side = _side(ctx)
    price = float(bar['close'])
    atr = _atr(bars, int(ctx.atr_period))
    if atr <= 0:
        return

    bar_no = _bar_no(ctx)
    basket = ctx.basket(side)
    cooldown_until = int(ctx.state.get(_key(ctx, 'cooldown_until'), -1) or -1)
    has_leg = _has_leg(ctx)

    if not has_leg:
        if bar_no < cooldown_until:
            return
        closes = [float(b['close']) for b in bars]
        if not _trend_cross(ctx, closes):
            return
        notional = _notional(ctx)
        basket.open_child_order(
            layer=1,
            order=1,
            notional=notional,
            price=price,
            action='open',
            payload={'reason': 'ema_atr_' + side + '_entry'},
        )
        stop_price = _initial_stop(ctx, price, atr)
        basket.checkpoint(
            status='opening',
            current_layer=1,
            current_order_in_layer=1,
            total_notional=notional,
            avg_entry_price=price,
            next_entry_trigger=0.0,
            take_profit_price=stop_price,
            max_layer=1,
            max_orders_per_layer=1,
            risk_state={'stop_price': stop_price, 'atr': atr},
        )
        ctx.state.set(_key(ctx, 'best'), price)
        ctx.state.set(_key(ctx, 'stop'), stop_price)
        ctx.log("EMA ATR %s entry quote %.2f @ %.4f stop %.4f" % (side, notional, price, stop_price))
        return

    entry = _leg_entry(ctx, price)
    qty = _leg_qty(ctx)
    best = float(ctx.state.get(_key(ctx, 'best'), entry) or entry)
    stop_price = float(ctx.state.get(_key(ctx, 'stop'), 0.0) or 0.0)

    if side == 'long':
        best = max(best, price)
        stop_price = max(stop_price, _trail_stop(ctx, best, atr))
    else:
        best = min(best, price) if best > 0 else price
        stop_price = min(stop_price, _trail_stop(ctx, best, atr)) if stop_price > 0 else _trail_stop(ctx, best, atr)

    ctx.state.set(_key(ctx, 'best'), best)
    ctx.state.set(_key(ctx, 'stop'), stop_price)
    basket.checkpoint(total_qty=qty, avg_entry_price=entry, take_profit_price=stop_price, risk_state={'stop_price': stop_price, 'best': best, 'atr': atr})

    if _stop_hit(ctx, price, stop_price):
        basket.close_all(reason='ema_atr_' + side + '_stop')
        _reset(ctx, bar_no + int(ctx.cooldown_bars))
        ctx.log("EMA ATR %s exit @ %.4f stop %.4f" % (side, price, stop_price))
`

const donchianPyramidCode = `"""
Donchian Breakout Pyramid
Classic Turtle-style breakout: enter on channel break, add only when price moves
in favor, and exit with a trailing channel stop.
"""

def on_init(ctx):
    ctx.entry_lookback = ctx.param('entry_lookback', 55)
    ctx.exit_lookback = ctx.param('exit_lookback', 20)
    ctx.max_layers = ctx.param('max_layers', 4)
    ctx.pyramid_step_pct = ctx.param('pyramid_step_pct', 0.012)
    ctx.hard_stop_pct = ctx.param('hard_stop_pct', 0.06)
    ctx.cooldown_bars = ctx.param('cooldown_bars', 8)
    ctx.base_notional = _planned_base_notional(ctx)

def _side(ctx):
    try:
        direction = str(ctx.direction)
    except Exception:
        direction = 'long'
    return 'short' if direction.lower() == 'short' else 'long'

def _run_budget(ctx):
    try:
        budget = float(ctx.investment_amount or 0.0)
    except Exception:
        budget = 0.0
    if budget > 0:
        return budget
    try:
        return float(ctx.equity or 0.0)
    except Exception:
        return 0.0

def _planned_base_notional(ctx):
    layers = max(1, int(ctx.max_layers))
    budget = _run_budget(ctx)
    return budget / layers if budget > 0 else 50.0

def _planned_qty(ctx, notional, price):
    if price <= 0:
        return 0.0
    try:
        market_type = str(ctx.market_type)
    except Exception:
        market_type = 'swap'
    try:
        leverage = float(ctx.leverage or 1.0)
    except Exception:
        leverage = 1.0
    sizing_leverage = 1.0 if market_type.lower() == 'spot' else max(1.0, leverage)
    return float(notional) * sizing_leverage / float(price)

def _bar_no(ctx):
    try:
        return int(ctx.current_index)
    except Exception:
        return 0

def _key(ctx, name):
    return 'donchian_' + _side(ctx) + '_' + name

def _has_leg(ctx):
    side = _side(ctx)
    if not ctx.position:
        return False
    if side == 'long':
        return float(ctx.position.get('long_size', ctx.position.get('size', 0.0)) or 0.0) > 0
    return float(ctx.position.get('short_size', 0.0) or 0.0) > 0

def _leg_qty(ctx, fallback):
    if not ctx.position:
        return fallback
    key = 'long_size' if _side(ctx) == 'long' else 'short_size'
    return float(ctx.position.get(key, fallback) or fallback or 0.0)

def _leg_entry(ctx, fallback):
    if not ctx.position:
        return fallback
    if _side(ctx) == 'long':
        return float(ctx.position.get('long_entry', ctx.position.get('entry_price', fallback)) or fallback or 0.0)
    return float(ctx.position.get('short_entry', fallback) or fallback or 0.0)

def _profit_pct(ctx, entry, price):
    if entry <= 0:
        return 0.0
    return (price - entry) / entry if _side(ctx) == 'long' else (entry - price) / entry

def _next_add(ctx, price):
    if _side(ctx) == 'long':
        return price * (1.0 + float(ctx.pyramid_step_pct))
    return price * (1.0 - float(ctx.pyramid_step_pct))

def _reset(ctx, next_bar):
    ctx.state.set(_key(ctx, 'layer'), 0)
    ctx.state.set(_key(ctx, 'qty'), 0.0)
    ctx.state.set(_key(ctx, 'avg'), 0.0)
    ctx.state.set(_key(ctx, 'next_add'), 0.0)
    ctx.state.set(_key(ctx, 'cooldown_until'), int(next_bar))

def on_bar(ctx, bar):
    need = max(int(ctx.entry_lookback), int(ctx.exit_lookback)) + 2
    bars = ctx.bars(need)
    if len(bars) < need:
        return

    side = _side(ctx)
    price = float(bar['close'])
    bar_no = _bar_no(ctx)
    basket = ctx.basket(side)
    entry_window = bars[-int(ctx.entry_lookback)-1:-1]
    exit_window = bars[-int(ctx.exit_lookback)-1:-1]
    entry_high = max([float(b['high']) for b in entry_window])
    entry_low = min([float(b['low']) for b in entry_window])
    exit_low = min([float(b['low']) for b in exit_window])
    exit_high = max([float(b['high']) for b in exit_window])

    layer = int(ctx.state.get(_key(ctx, 'layer'), 0) or 0)
    total_qty = float(ctx.state.get(_key(ctx, 'qty'), 0.0) or 0.0)
    avg_cost = float(ctx.state.get(_key(ctx, 'avg'), 0.0) or 0.0)
    next_add = float(ctx.state.get(_key(ctx, 'next_add'), 0.0) or 0.0)
    cooldown_until = int(ctx.state.get(_key(ctx, 'cooldown_until'), -1) or -1)
    last_order_bar = int(ctx.state.get(_key(ctx, 'last_order_bar'), -999999) or -999999)
    has_leg = _has_leg(ctx)

    if not has_leg and layer > 0:
        _reset(ctx, bar_no + int(ctx.cooldown_bars))
        layer = 0

    breakout = price > entry_high if side == 'long' else price < entry_low
    if not has_leg:
        if bar_no < cooldown_until or not breakout:
            return
        notional = float(ctx.base_notional)
        basket.open_child_order(
            layer=1,
            order=1,
            notional=notional,
            price=price,
            action='open',
            payload={'reason': 'donchian_' + side + '_breakout'},
        )
        basket.checkpoint(status='opening', current_layer=1, current_order_in_layer=1, total_notional=notional, avg_entry_price=price, next_entry_trigger=_next_add(ctx, price), take_profit_price=0.0, max_layer=ctx.max_layers, max_orders_per_layer=1)
        ctx.state.set(_key(ctx, 'layer'), 1)
        ctx.state.set(_key(ctx, 'qty'), _planned_qty(ctx, notional, price))
        ctx.state.set(_key(ctx, 'avg'), price)
        ctx.state.set(_key(ctx, 'next_add'), _next_add(ctx, price))
        ctx.state.set(_key(ctx, 'last_order_bar'), bar_no)
        ctx.log("Donchian %s breakout quote %.2f @ %.4f" % (side, notional, price))
        return

    live_qty = _leg_qty(ctx, total_qty)
    live_entry = _leg_entry(ctx, avg_cost or price)
    exit_stop = exit_low if side == 'long' else exit_high
    channel_exit = price <= exit_stop if side == 'long' else price >= exit_stop
    hard_stop = _profit_pct(ctx, live_entry, price) <= -float(ctx.hard_stop_pct)
    if channel_exit or hard_stop:
        basket.checkpoint(total_qty=live_qty, avg_entry_price=live_entry, take_profit_price=exit_stop)
        basket.close_all(reason='donchian_' + side + '_exit')
        _reset(ctx, bar_no + int(ctx.cooldown_bars))
        ctx.log("Donchian %s exit @ %.4f" % (side, price))
        return

    next_layer = layer + 1
    add_hit = price >= next_add if side == 'long' else price <= next_add
    if next_layer <= int(ctx.max_layers) and next_add > 0 and add_hit and last_order_bar != bar_no:
        notional = float(ctx.base_notional)
        basket.open_child_order(
            layer=next_layer,
            order=1,
            notional=notional,
            price=price,
            action='add',
            payload={'reason': 'donchian_' + side + '_pyramid'},
        )
        new_qty = live_qty + _planned_qty(ctx, notional, price)
        new_avg = ((live_entry * live_qty) + notional) / new_qty if new_qty > 0 else price
        basket.checkpoint(status='opening', current_layer=next_layer, current_order_in_layer=1, total_qty=new_qty, total_notional=new_qty * new_avg, avg_entry_price=new_avg, next_entry_trigger=_next_add(ctx, price), take_profit_price=exit_stop, max_layer=ctx.max_layers, max_orders_per_layer=1)
        ctx.state.set(_key(ctx, 'layer'), next_layer)
        ctx.state.set(_key(ctx, 'qty'), new_qty)
        ctx.state.set(_key(ctx, 'avg'), new_avg)
        ctx.state.set(_key(ctx, 'next_add'), _next_add(ctx, price))
        ctx.state.set(_key(ctx, 'last_order_bar'), bar_no)
        ctx.log("Donchian %s pyramid L%d quote %.2f @ %.4f" % (side, next_layer, notional, price))
`

const bollingerReversionBasketCode = `"""
Bollinger Mean Reversion Basket
Classic volatility-band mean reversion: enter at the outer band, add controlled
layers on adverse movement, and close the whole basket near average-cost profit.
"""

def on_init(ctx):
    ctx.period = ctx.param('period', 20)
    ctx.std_mult = ctx.param('std_mult', 2.0)
    ctx.rsi_period = ctx.param('rsi_period', 14)
    ctx.rsi_long_max = ctx.param('rsi_long_max', 35)
    ctx.rsi_short_min = ctx.param('rsi_short_min', 65)
    ctx.max_layers = ctx.param('max_layers', 4)
    ctx.layer_step_pct = ctx.param('layer_step_pct', 0.012)
    ctx.layer_multiplier = ctx.param('layer_multiplier', 1.25)
    ctx.take_profit_pct = ctx.param('take_profit_pct', 0.008)
    ctx.hard_stop_pct = ctx.param('hard_stop_pct', 0.08)
    ctx.cooldown_bars = ctx.param('cooldown_bars', 6)
    ctx.base_notional = _planned_base_notional(ctx)

def _side(ctx):
    try:
        direction = str(ctx.direction)
    except Exception:
        direction = 'long'
    return 'short' if direction.lower() == 'short' else 'long'

def _run_budget(ctx):
    try:
        budget = float(ctx.investment_amount or 0.0)
    except Exception:
        budget = 0.0
    if budget > 0:
        return budget
    try:
        return float(ctx.equity or 0.0)
    except Exception:
        return 0.0

def _planned_base_notional(ctx):
    layers = max(1, int(ctx.max_layers))
    multiplier = float(ctx.layer_multiplier)
    weights = [multiplier ** i for i in range(layers)]
    total = sum(weights) if weights else 1.0
    budget = _run_budget(ctx)
    return budget / total if budget > 0 and total > 0 else 50.0

def _planned_qty(ctx, notional, price):
    if price <= 0:
        return 0.0
    try:
        market_type = str(ctx.market_type)
    except Exception:
        market_type = 'swap'
    try:
        leverage = float(ctx.leverage or 1.0)
    except Exception:
        leverage = 1.0
    sizing_leverage = 1.0 if market_type.lower() == 'spot' else max(1.0, leverage)
    return float(notional) * sizing_leverage / float(price)

def _bar_no(ctx):
    try:
        return int(ctx.current_index)
    except Exception:
        return 0

def _key(ctx, name):
    return 'boll_' + _side(ctx) + '_' + name

def _mean(values):
    return sum(values) / len(values) if values else 0.0

def _std(values):
    if not values:
        return 0.0
    avg = _mean(values)
    var = sum([(float(x) - avg) * (float(x) - avg) for x in values]) / len(values)
    return var ** 0.5

def _rsi(values, period):
    if len(values) < period + 1:
        return 50.0
    gains = []
    losses = []
    start = len(values) - period
    for i in range(start, len(values)):
        change = float(values[i]) - float(values[i - 1])
        gains.append(max(change, 0.0))
        losses.append(max(-change, 0.0))
    avg_gain = sum(gains) / len(gains) if gains else 0.0
    avg_loss = sum(losses) / len(losses) if losses else 0.0
    if avg_loss <= 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))

def _has_leg(ctx):
    side = _side(ctx)
    if not ctx.position:
        return False
    if side == 'long':
        return float(ctx.position.get('long_size', ctx.position.get('size', 0.0)) or 0.0) > 0
    return float(ctx.position.get('short_size', 0.0) or 0.0) > 0

def _leg_qty(ctx, fallback):
    if not ctx.position:
        return fallback
    key = 'long_size' if _side(ctx) == 'long' else 'short_size'
    return float(ctx.position.get(key, fallback) or fallback or 0.0)

def _leg_entry(ctx, fallback):
    if not ctx.position:
        return fallback
    if _side(ctx) == 'long':
        return float(ctx.position.get('long_entry', ctx.position.get('entry_price', fallback)) or fallback or 0.0)
    return float(ctx.position.get('short_entry', fallback) or fallback or 0.0)

def _profit_pct(ctx, entry, price):
    if entry <= 0:
        return 0.0
    return (price - entry) / entry if _side(ctx) == 'long' else (entry - price) / entry

def _next_trigger(ctx, anchor, layer):
    distance = float(ctx.layer_step_pct) * max(1, int(layer or 1))
    if _side(ctx) == 'long':
        return anchor * (1.0 - distance)
    return anchor * (1.0 + distance)

def _tp_price(ctx, avg_cost):
    if _side(ctx) == 'long':
        return avg_cost * (1.0 + float(ctx.take_profit_pct))
    return avg_cost * (1.0 - float(ctx.take_profit_pct))

def _reset(ctx, next_bar):
    ctx.state.set(_key(ctx, 'layer'), 0)
    ctx.state.set(_key(ctx, 'anchor'), 0.0)
    ctx.state.set(_key(ctx, 'qty'), 0.0)
    ctx.state.set(_key(ctx, 'avg'), 0.0)
    ctx.state.set(_key(ctx, 'cooldown_until'), int(next_bar))

def on_bar(ctx, bar):
    need = max(int(ctx.period), int(ctx.rsi_period)) + 2
    bars = ctx.bars(need)
    if len(bars) < need:
        return

    side = _side(ctx)
    price = float(bar['close'])
    bar_no = _bar_no(ctx)
    closes = [float(b['close']) for b in bars]
    window = closes[-int(ctx.period)-1:-1]
    mid = _mean(window)
    dev = _std(window)
    upper = mid + dev * float(ctx.std_mult)
    lower = mid - dev * float(ctx.std_mult)
    rsi = _rsi(closes, int(ctx.rsi_period))

    basket = ctx.basket(side)
    layer = int(ctx.state.get(_key(ctx, 'layer'), 0) or 0)
    anchor = float(ctx.state.get(_key(ctx, 'anchor'), 0.0) or 0.0)
    total_qty = float(ctx.state.get(_key(ctx, 'qty'), 0.0) or 0.0)
    avg_cost = float(ctx.state.get(_key(ctx, 'avg'), 0.0) or 0.0)
    cooldown_until = int(ctx.state.get(_key(ctx, 'cooldown_until'), -1) or -1)
    last_order_bar = int(ctx.state.get(_key(ctx, 'last_order_bar'), -999999) or -999999)
    has_leg = _has_leg(ctx)

    if not has_leg and layer > 0:
        _reset(ctx, bar_no + int(ctx.cooldown_bars))
        layer = 0

    entry_signal = (price <= lower and rsi <= float(ctx.rsi_long_max)) if side == 'long' else (price >= upper and rsi >= float(ctx.rsi_short_min))
    if not has_leg:
        if bar_no < cooldown_until or not entry_signal:
            return
        notional = float(ctx.base_notional)
        qty = _planned_qty(ctx, notional, price)
        basket.open_child_order(layer=1, order=1, notional=notional, price=price, action='open', payload={'reason': 'bollinger_' + side + '_entry'})
        basket.checkpoint(status='opening', current_layer=1, current_order_in_layer=1, total_qty=qty, total_notional=notional, avg_entry_price=price, next_entry_trigger=_next_trigger(ctx, price, 1), take_profit_price=_tp_price(ctx, price), max_layer=ctx.max_layers, max_orders_per_layer=1, risk_state={'rsi': rsi, 'mid': mid, 'upper': upper, 'lower': lower})
        ctx.state.set(_key(ctx, 'layer'), 1)
        ctx.state.set(_key(ctx, 'anchor'), price)
        ctx.state.set(_key(ctx, 'qty'), qty)
        ctx.state.set(_key(ctx, 'avg'), price)
        ctx.state.set(_key(ctx, 'last_order_bar'), bar_no)
        ctx.log("Bollinger %s entry quote %.2f @ %.4f rsi %.2f" % (side, notional, price, rsi))
        return

    live_qty = _leg_qty(ctx, total_qty)
    live_entry = _leg_entry(ctx, avg_cost or price)
    pnl = _profit_pct(ctx, live_entry, price)

    if pnl >= float(ctx.take_profit_pct) or (side == 'long' and price >= mid and pnl > 0) or (side == 'short' and price <= mid and pnl > 0):
        basket.checkpoint(total_qty=live_qty, avg_entry_price=live_entry, take_profit_price=_tp_price(ctx, live_entry))
        basket.close_all(reason='bollinger_' + side + '_take_profit')
        _reset(ctx, bar_no + int(ctx.cooldown_bars))
        ctx.log("Bollinger %s take profit @ %.4f" % (side, price))
        return

    if pnl <= -float(ctx.hard_stop_pct):
        basket.checkpoint(total_qty=live_qty, avg_entry_price=live_entry)
        basket.close_all(reason='bollinger_' + side + '_hard_stop')
        _reset(ctx, bar_no + int(ctx.cooldown_bars))
        ctx.log("Bollinger %s hard stop @ %.4f" % (side, price))
        return

    next_layer = layer + 1
    trigger = _next_trigger(ctx, anchor, layer)
    add_hit = price <= trigger if side == 'long' else price >= trigger
    if next_layer <= int(ctx.max_layers) and add_hit and last_order_bar != bar_no:
        notional = float(ctx.base_notional) * (float(ctx.layer_multiplier) ** (next_layer - 1))
        qty = _planned_qty(ctx, notional, price)
        new_qty = live_qty + qty
        new_avg = ((live_entry * live_qty) + notional) / new_qty if new_qty > 0 else price
        basket.open_child_order(layer=next_layer, order=1, notional=notional, price=price, action='add', payload={'reason': 'bollinger_' + side + '_add'})
        basket.checkpoint(status='opening', current_layer=next_layer, current_order_in_layer=1, total_qty=new_qty, total_notional=new_qty * new_avg, avg_entry_price=new_avg, next_entry_trigger=_next_trigger(ctx, anchor, next_layer), take_profit_price=_tp_price(ctx, new_avg), max_layer=ctx.max_layers, max_orders_per_layer=1, risk_state={'rsi': rsi, 'mid': mid})
        ctx.state.set(_key(ctx, 'layer'), next_layer)
        ctx.state.set(_key(ctx, 'qty'), new_qty)
        ctx.state.set(_key(ctx, 'avg'), new_avg)
        ctx.state.set(_key(ctx, 'last_order_bar'), bar_no)
        ctx.log("Bollinger %s add L%d quote %.2f @ %.4f avg %.4f" % (side, next_layer, notional, price, new_avg))
`

const sequentialMartingaleCode = `"""
Sequential Basket Martingale
Five layers by default. Each layer contains three child orders, child order
notional grows by martingale multiplier, and the next layer starts only after
the current basket fails to recover to average-cost take profit.
"""

def on_init(ctx):
    ctx.max_layers = ctx.param('max_layers', 5)
    ctx.orders_per_layer = ctx.param('orders_per_layer', 3)
    ctx.martingale_multiplier = ctx.param('martingale_multiplier', 1.8)
    ctx.intra_spacing_1_pct = ctx.param('intra_spacing_1_pct', 0.005)
    ctx.intra_spacing_2_pct = ctx.param('intra_spacing_2_pct', 0.008)
    ctx.inter_spacing_pct = ctx.param('inter_spacing_pct', 0.012)
    ctx.inter_spacing_growth_pct = ctx.param('inter_spacing_growth_pct', 0.003)
    ctx.take_profit_pct = ctx.param('take_profit_pct', 0.006)
    ctx.hard_stop_pct = ctx.param('hard_stop_pct', 0.20)
    ctx.cooldown_bars = ctx.param('cooldown_bars', 6)
    ctx.base_notional = _planned_base_notional(ctx)

def _run_budget(ctx):
    try:
        budget = float(ctx.investment_amount or 0.0)
    except Exception:
        budget = 0.0
    if budget > 0:
        return budget
    try:
        return float(ctx.equity or 0.0)
    except Exception:
        return 0.0

def _planned_base_notional(ctx):
    layers = max(1, int(ctx.max_layers))
    orders = max(1, int(ctx.orders_per_layer))
    multiplier = float(ctx.martingale_multiplier)
    one_layer_weight = sum([multiplier ** i for i in range(orders)])
    total_weight = one_layer_weight * layers
    budget = _run_budget(ctx)
    return budget / total_weight if budget > 0 and total_weight > 0 else 50.0

def _planned_qty(ctx, notional, price):
    if price <= 0:
        return 0.0
    try:
        market_type = str(ctx.market_type)
    except Exception:
        market_type = 'swap'
    try:
        leverage = float(ctx.leverage or 1.0)
    except Exception:
        leverage = 1.0
    sizing_leverage = 1.0 if market_type.lower() == 'spot' else max(1.0, leverage)
    return float(notional) * sizing_leverage / float(price)

def _side(ctx):
    try:
        direction = str(ctx.direction)
    except Exception:
        direction = 'long'
    return 'short' if direction.lower() == 'short' else 'long'

def _key(ctx, name):
    return 'seq_' + _side(ctx) + '_' + name

def _bar_no(ctx):
    try:
        return int(ctx.current_index)
    except Exception:
        return 0

def _has_leg(ctx):
    side = _side(ctx)
    if not ctx.position:
        return False
    if side == 'long':
        return float(ctx.position.get('long_size', ctx.position.get('size', 0)) or 0) > 0
    return float(ctx.position.get('short_size', 0) or 0) > 0

def _leg_qty(ctx, fallback):
    if not ctx.position:
        return fallback
    key = 'long_size' if _side(ctx) == 'long' else 'short_size'
    return float(ctx.position.get(key, fallback) or fallback or 0.0)

def _leg_entry(ctx, fallback):
    if not ctx.position:
        return fallback
    if _side(ctx) == 'long':
        return float(ctx.position.get('long_entry', ctx.position.get('entry_price', fallback)) or fallback or 0.0)
    return float(ctx.position.get('short_entry', fallback) or fallback or 0.0)

def _adverse_price(ctx, base_price, spacing):
    if base_price <= 0:
        return 0.0
    return base_price * (1 - spacing) if _side(ctx) == 'long' else base_price * (1 + spacing)

def _adverse_hit(ctx, price, trigger):
    if trigger <= 0:
        return False
    return price <= trigger if _side(ctx) == 'long' else price >= trigger

def _profit_pct(ctx, avg_cost, price):
    if avg_cost <= 0:
        return 0.0
    if _side(ctx) == 'long':
        return (price - avg_cost) / avg_cost
    return (avg_cost - price) / avg_cost

def _tp_price(ctx, avg_cost):
    if avg_cost <= 0:
        return 0.0
    return avg_cost * (1 + ctx.take_profit_pct) if _side(ctx) == 'long' else avg_cost * (1 - ctx.take_profit_pct)

def _order_spacing(ctx, order_index):
    return ctx.intra_spacing_1_pct if int(order_index or 0) <= 1 else ctx.intra_spacing_2_pct

def _layer_spacing(ctx, layer_index):
    return ctx.inter_spacing_pct + ctx.inter_spacing_growth_pct * max(0, int(layer_index or 1) - 1)

def _next_trigger(ctx, layer_index, order_index, last_price):
    layer = int(layer_index or 0)
    order = int(order_index or 0)
    if layer <= 0 or order <= 0:
        return 0.0
    if order < int(ctx.orders_per_layer):
        return _adverse_price(ctx, last_price, _order_spacing(ctx, order))
    if layer < int(ctx.max_layers):
        return _adverse_price(ctx, last_price, _layer_spacing(ctx, layer))
    return 0.0

def _planned_notional(ctx, order_index):
    order_power = max(0, int(order_index or 1) - 1)
    return float(ctx.base_notional) * (float(ctx.martingale_multiplier) ** order_power)

def _reset_cycle(ctx, next_bar):
    ctx.state.set(_key(ctx, 'layer'), 0)
    ctx.state.set(_key(ctx, 'order'), 0)
    ctx.state.set(_key(ctx, 'avg_cost'), 0.0)
    ctx.state.set(_key(ctx, 'qty'), 0.0)
    ctx.state.set(_key(ctx, 'last_price'), 0.0)
    ctx.state.set(_key(ctx, 'next_trigger'), 0.0)
    ctx.state.set(_key(ctx, 'cooldown_until'), int(next_bar))

def _checkpoint(ctx, basket, layer, order, qty, avg_cost, last_price):
    basket.checkpoint(
        status='opening',
        current_layer=int(layer),
        current_order_in_layer=int(order),
        total_qty=float(qty),
        total_notional=float(qty) * float(avg_cost),
        avg_entry_price=float(avg_cost),
        next_entry_trigger=_next_trigger(ctx, layer, order, last_price),
        take_profit_price=_tp_price(ctx, avg_cost),
        max_layer=ctx.max_layers,
        max_orders_per_layer=ctx.orders_per_layer,
    )

def _place_child(ctx, basket, layer, order, price, action):
    notional = _planned_notional(ctx, order)
    if notional <= 0 or price <= 0:
        return False
    qty = _planned_qty(ctx, notional, price)
    basket.open_child_order(
        layer=int(layer),
        order=int(order),
        notional=notional,
        price=price,
        action=action,
        payload={
            'reason': 'sequential_martingale_' + _side(ctx) + '_' + action,
            'planned_layer': int(layer),
            'planned_order': int(order),
        },
    )

    old_qty = float(ctx.state.get(_key(ctx, 'qty'), 0.0) or 0.0)
    old_avg = float(ctx.state.get(_key(ctx, 'avg_cost'), 0.0) or 0.0)
    new_qty = old_qty + qty
    new_avg = ((old_avg * old_qty) + (price * qty)) / new_qty if new_qty > 0 else price
    _checkpoint(ctx, basket, layer, order, new_qty, new_avg, price)

    ctx.state.set(_key(ctx, 'layer'), int(layer))
    ctx.state.set(_key(ctx, 'order'), int(order))
    ctx.state.set(_key(ctx, 'avg_cost'), new_avg)
    ctx.state.set(_key(ctx, 'qty'), new_qty)
    ctx.state.set(_key(ctx, 'last_price'), price)
    ctx.state.set(_key(ctx, 'next_trigger'), _next_trigger(ctx, layer, order, price))
    ctx.state.set(_key(ctx, 'last_order_bar'), _bar_no(ctx))
    ctx.log("Sequential martingale %s L%d-O%d quote %.2f @ %.4f avg %.4f" % (_side(ctx), layer, order, notional, price, new_avg))
    return True

def on_bar(ctx, bar):
    side = _side(ctx)
    price = float(bar['close'])
    bar_no = _bar_no(ctx)
    basket = ctx.basket(side)

    layer = int(ctx.state.get(_key(ctx, 'layer'), 0) or 0)
    order = int(ctx.state.get(_key(ctx, 'order'), 0) or 0)
    avg_cost = float(ctx.state.get(_key(ctx, 'avg_cost'), 0.0) or 0.0)
    total_qty = float(ctx.state.get(_key(ctx, 'qty'), 0.0) or 0.0)
    next_trigger = float(ctx.state.get(_key(ctx, 'next_trigger'), 0.0) or 0.0)
    cooldown_until = int(ctx.state.get(_key(ctx, 'cooldown_until'), -1) or -1)
    last_order_bar = int(ctx.state.get(_key(ctx, 'last_order_bar'), -999999) or -999999)
    has_leg = _has_leg(ctx)

    if layer > 0 and not has_leg:
        _reset_cycle(ctx, bar_no + ctx.cooldown_bars)
        layer = 0
        order = 0
        total_qty = 0.0
        avg_cost = 0.0

    if layer <= 0:
        if bar_no < cooldown_until:
            return
        _place_child(ctx, basket, 1, 1, price, 'open')
        return

    live_qty = _leg_qty(ctx, total_qty)
    live_entry = _leg_entry(ctx, avg_cost)
    if live_qty > 0:
        total_qty = live_qty
    if live_entry > 0:
        avg_cost = live_entry

    pnl = _profit_pct(ctx, avg_cost, price)
    if total_qty > 0 and pnl >= ctx.take_profit_pct:
        basket.checkpoint(total_qty=total_qty, avg_entry_price=avg_cost)
        basket.close_all(reason='sequential_martingale_take_profit')
        _reset_cycle(ctx, bar_no + ctx.cooldown_bars)
        ctx.log("Sequential martingale take profit @ %.4f avg %.4f" % (price, avg_cost))
        return

    if total_qty > 0 and ctx.hard_stop_pct > 0 and pnl <= -ctx.hard_stop_pct:
        basket.checkpoint(total_qty=total_qty, avg_entry_price=avg_cost)
        basket.close_all(reason='sequential_martingale_hard_stop')
        _reset_cycle(ctx, bar_no + ctx.cooldown_bars)
        ctx.log("Sequential martingale hard stop @ %.4f avg %.4f" % (price, avg_cost))
        return

    if last_order_bar == bar_no or not _adverse_hit(ctx, price, next_trigger):
        return

    if order < int(ctx.orders_per_layer):
        _place_child(ctx, basket, layer, order + 1, price, 'add')
        return

    if layer < int(ctx.max_layers):
        _place_child(ctx, basket, layer + 1, 1, price, 'add')
`

export const RUNTIME_SCRIPT_TEMPLATES = [
  {
    key: 'emaAtrTrendRisk',
    accent: 'green',
    code: emaAtrTrendRiskCode,
    params: [
      { name: 'fast_period', type: 'integer', default: 12, min: 2, max: 120, step: 1 },
      { name: 'slow_period', type: 'integer', default: 36, min: 5, max: 240, step: 1 },
      { name: 'atr_period', type: 'integer', default: 14, min: 3, max: 120, step: 1 },
      { name: 'risk_budget_pct', type: 'percent', default: 35, min: 1, max: 100, step: 1 },
      { name: 'atr_stop_mult', type: 'number', default: 2.2, min: 0.5, max: 10, step: 0.1 },
      { name: 'atr_trail_mult', type: 'number', default: 2.8, min: 0.5, max: 12, step: 0.1 },
      { name: 'cooldown_bars', type: 'integer', default: 5, min: 0, max: 200, step: 1 }
    ]
  },
  {
    key: 'donchianBreakoutPyramid',
    accent: 'cyan',
    code: donchianPyramidCode,
    params: [
      { name: 'entry_lookback', type: 'integer', default: 55, min: 10, max: 300, step: 1 },
      { name: 'exit_lookback', type: 'integer', default: 20, min: 5, max: 200, step: 1 },
      { name: 'max_layers', type: 'integer', default: 4, min: 1, max: 8, step: 1 },
      { name: 'pyramid_step_pct', type: 'percent', default: 1.2, min: 0.1, max: 50, step: 0.1 },
      { name: 'hard_stop_pct', type: 'percent', default: 6, min: 0.5, max: 90, step: 0.5 },
      { name: 'cooldown_bars', type: 'integer', default: 8, min: 0, max: 200, step: 1 }
    ]
  },
  {
    key: 'bollingerReversionBasket',
    accent: 'teal',
    code: bollingerReversionBasketCode,
    params: [
      { name: 'period', type: 'integer', default: 20, min: 5, max: 240, step: 1 },
      { name: 'std_mult', type: 'number', default: 2.0, min: 0.5, max: 5, step: 0.1 },
      { name: 'rsi_period', type: 'integer', default: 14, min: 3, max: 100, step: 1 },
      { name: 'rsi_long_max', type: 'number', default: 35, min: 1, max: 60, step: 1 },
      { name: 'rsi_short_min', type: 'number', default: 65, min: 40, max: 99, step: 1 },
      { name: 'max_layers', type: 'integer', default: 4, min: 1, max: 10, step: 1 },
      { name: 'layer_step_pct', type: 'percent', default: 1.2, min: 0.1, max: 50, step: 0.1 },
      { name: 'layer_multiplier', type: 'number', default: 1.25, min: 1, max: 5, step: 0.05 },
      { name: 'take_profit_pct', type: 'percent', default: 0.8, min: 0.05, max: 50, step: 0.05 },
      { name: 'hard_stop_pct', type: 'percent', default: 8, min: 0.5, max: 90, step: 0.5 },
      { name: 'cooldown_bars', type: 'integer', default: 6, min: 0, max: 200, step: 1 }
    ]
  },
  {
    key: 'runtimeSequentialMartingaleBasket',
    accent: 'indigo',
    code: sequentialMartingaleCode,
    params: [
      { name: 'max_layers', type: 'integer', default: 5, min: 1, max: 12, step: 1 },
      { name: 'orders_per_layer', type: 'integer', default: 3, min: 1, max: 8, step: 1 },
      { name: 'martingale_multiplier', type: 'number', default: 1.8, min: 1, max: 5, step: 0.05 },
      { name: 'intra_spacing_1_pct', type: 'percent', default: 0.5, min: 0.05, max: 50, step: 0.05 },
      { name: 'intra_spacing_2_pct', type: 'percent', default: 0.8, min: 0.05, max: 50, step: 0.05 },
      { name: 'inter_spacing_pct', type: 'percent', default: 1.2, min: 0.05, max: 50, step: 0.05 },
      { name: 'inter_spacing_growth_pct', type: 'percent', default: 0.3, min: 0, max: 20, step: 0.05 },
      { name: 'take_profit_pct', type: 'percent', default: 0.6, min: 0.05, max: 100, step: 0.05 },
      { name: 'hard_stop_pct', type: 'percent', default: 20, min: 0, max: 90, step: 0.5 },
      { name: 'cooldown_bars', type: 'integer', default: 6, min: 0, max: 200, step: 1 }
    ]
  }
]
