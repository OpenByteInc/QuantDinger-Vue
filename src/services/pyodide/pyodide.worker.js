// Pyodide Web Worker（ES module）
//

import { expose } from 'comlink'

let pyodide = null
let initPromise = null
let lastError = null

const _ensureTrailingSlash = (s) => (s && !s.endsWith('/') ? s + '/' : s) || s

async function _loadFromBase (baseUrl) {
  const mod = await import(/* @vite-ignore */ `${baseUrl}pyodide.mjs`)
  const py = await mod.loadPyodide({ indexURL: baseUrl })
  await py.loadPackage(['pandas', 'numpy'])
  return py
}

async function init (opts = {}) {
  if (pyodide) return { ok: true }
  if (initPromise) return initPromise

  const PYODIDE_VERSION = opts.version || '0.25.0'
  const defaultCdn = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`
  const defaultLocal = `/assets/pyodide/v${PYODIDE_VERSION}/full/`

  const cdnBase = _ensureTrailingSlash(opts.cdnBase || defaultCdn)
  const localBase = _ensureTrailingSlash(opts.localBase || defaultLocal)
  const preferCdn = opts.preferCdn !== undefined ? !!opts.preferCdn : true

  const order = preferCdn ? [cdnBase, localBase] : [localBase, cdnBase]

  initPromise = (async () => {
    let lastErr = null
    for (const base of order) {
      try {
        pyodide = await _loadFromBase(base)
        return { ok: true, baseUrl: base }
      } catch (err) {
        lastErr = err
      }
    }
    lastError = lastErr
    initPromise = null
    throw lastErr || new Error('Pyodide 初始化失败：所有候选源均不可用')
  })()

  return initPromise
}

async function loadPackages (pkgs = []) {
  if (!pyodide) throw new Error('Pyodide 未初始化')
  if (!pkgs.length) return
  await pyodide.loadPackage(pkgs)
}

async function runPython (code, globalsObj = {}) {
  if (!pyodide) throw new Error('Pyodide 未初始化')
  for (const [k, v] of Object.entries(globalsObj)) {
    pyodide.globals.set(k, v)
  }
  const result = await pyodide.runPythonAsync(code)
  if (result && typeof result === 'object' && typeof result.toJs === 'function') {
    try {
      return result.toJs()
    } finally {
      try { result.destroy() } catch (_) {}
    }
  }
  return result
}

const STRATEGY_WRAPPER = `
import json
import pandas as pd
import numpy as np

def _clean_nan(obj):
    if isinstance(obj, dict):
        return {k: _clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean_nan(item) for item in obj]
    if isinstance(obj, (pd.Series, np.ndarray)):
        return [None if (isinstance(x, float) and (np.isnan(x) or np.isinf(x))) else x for x in obj]
    if isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    try:
        if pd.isna(obj):
            return None
    except (TypeError, ValueError):
        pass
    return obj


_raw = raw_data.to_py() if hasattr(raw_data, 'to_py') else raw_data
_params = params.to_py() if hasattr(params, 'to_py') else params
_context = context_data.to_py() if hasattr(context_data, 'to_py') else context_data

_TIMEFRAME_SECONDS = {
    '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800,
    '1h': 3600, '2h': 7200, '4h': 14400, '6h': 21600,
    '8h': 28800, '12h': 43200, '1d': 86400, '1w': 604800,
}

def _timeframe_seconds(value):
    key = str(value or '').strip().lower()
    if key not in _TIMEFRAME_SECONDS:
        raise ValueError(f'Unsupported indicator timeframe: {value}')
    return _TIMEFRAME_SECONDS[key]

class _IndicatorContext:
    def __init__(self, base_df, payload):
        self._base = base_df.copy()
        self._payload = payload if isinstance(payload, dict) else {}
        self.market = str(self._payload.get('market') or '')
        self.symbol = str(self._payload.get('symbol') or '')
        self.timeframe = str(self._payload.get('timeframe') or '')
        self.exchange_id = str(self._payload.get('exchange_id') or '')
        self.market_type = str(self._payload.get('market_type') or '')
        self.instrument_id = str(self._payload.get('instrument_id') or '')
        self._series = {}
        for timeframe, rows in (self._payload.get('series') or {}).items():
            self._series[str(timeframe).lower()] = self._normalize_frame(pd.DataFrame(rows or []))

    def _normalize_frame(self, frame):
        result = frame.copy() if isinstance(frame, pd.DataFrame) else pd.DataFrame()
        if 'time' not in result.columns:
            result['time'] = pd.Series(dtype=float)
        numeric_time = pd.to_numeric(result['time'], errors='coerce')
        result['time'] = numeric_time.where(numeric_time <= 10_000_000_000, numeric_time / 1000.0)
        for column in ('open', 'high', 'low', 'close', 'volume'):
            if column in result.columns:
                result[column] = pd.to_numeric(result[column], errors='coerce')
        return result.dropna(subset=['time']).sort_values('time').drop_duplicates('time').reset_index(drop=True)

    def raw_series(self, timeframe):
        key = str(timeframe or '').strip().lower()
        if key == str(self.timeframe or '').strip().lower():
            return self._base.copy()
        return self._series.get(key, pd.DataFrame()).copy()

    def request_series(self, timeframe, field=None, *, gaps='off', lookahead='off'):
        source = self._normalize_frame(self.raw_series(timeframe))
        base = self._normalize_frame(self._base)
        result = pd.DataFrame(index=self._base.index)
        source_columns = [column for column in source.columns if column != 'time']
        if base.empty or source.empty:
            for column in source_columns or ['open', 'high', 'low', 'close', 'volume']:
                result[column] = np.nan
            return result.get(field, pd.Series(np.nan, index=result.index)) if field else result

        base_seconds = _timeframe_seconds(self.timeframe)
        source_seconds = _timeframe_seconds(timeframe)
        use_lookahead = str(lookahead or 'off').strip().lower() in {'on', 'true', '1'}
        target_key = base['time'] + (0 if use_lookahead else base_seconds)
        source_key = source['time'] + (0 if use_lookahead else source_seconds)
        target = pd.DataFrame({'_key': target_key, '_row': range(len(base))}).sort_values('_key')
        source_data = source[source_columns].copy()
        source_data['_key'] = source_key
        merged = pd.merge_asof(target, source_data.sort_values('_key'), on='_key', direction='backward')

        if str(gaps or 'off').strip().lower() in {'on', 'true', '1'}:
            exact = merged['_key'].isin(set(source_data['_key'].tolist()))
            for column in source_columns:
                merged.loc[~exact, column] = np.nan

        merged = merged.sort_values('_row')
        for column in source_columns:
            result[column] = merged[column].tolist()
        result['time'] = self._base['time'].tolist() if 'time' in self._base.columns else [None] * len(result)
        return result.get(str(field), pd.Series(np.nan, index=result.index)) if field is not None else result

    def request_lower_tf(self, timeframe, fields=None):
        source = self._normalize_frame(self.raw_series(timeframe))
        base = self._normalize_frame(self._base)
        base_seconds = _timeframe_seconds(self.timeframe)
        source_seconds = _timeframe_seconds(timeframe)
        if source_seconds >= base_seconds:
            raise ValueError('request_lower_tf requires a timeframe below the chart timeframe')
        if fields is None:
            selected_fields = ['open', 'high', 'low', 'close', 'volume']
            return_records = True
        elif isinstance(fields, str):
            selected_fields = [fields]
            return_records = False
        else:
            selected_fields = [str(item) for item in fields]
            return_records = False
        available_fields = [field for field in selected_fields if field in source.columns]
        source_times = source['time'].to_numpy(dtype=float) if not source.empty else np.asarray([])
        values = {field: [] for field in selected_fields}
        records = []
        for start in base.get('time', pd.Series(dtype=float)).tolist():
            left = int(np.searchsorted(source_times, float(start), side='left'))
            right = int(np.searchsorted(source_times, float(start) + base_seconds, side='left'))
            window = source.iloc[left:right]
            if return_records:
                records.append(window[['time', *available_fields]].to_dict(orient='records'))
            for field in selected_fields:
                values[field].append(window[field].tolist() if field in window.columns else [])
        if return_records:
            return records
        if isinstance(fields, str):
            return values[selected_fields[0]]
        return values


def _get_param(key, default=None):
    if key in _params:
        return _params.get(key, default)
    camel = ''.join([key.split('_')[0]] + [p.capitalize() for p in key.split('_')[1:]])
    return _params.get(camel, default)


try:
    leverage = float(_get_param('leverage', 1) or 1)
except Exception:
    leverage = 1

trade_direction = _get_param('trade_direction', _get_param('tradeDirection', 'both')) or 'both'

def _safe_int(name, default=0):
    try:
        return int(_get_param(name, default) or default)
    except Exception:
        return default

def _safe_float(name, default=0.0):
    try:
        return float(_get_param(name, default) or default)
    except Exception:
        return default

initial_position = _safe_int('initial_position', 0)
initial_avg_entry_price = _safe_float('initial_avg_entry_price', 0.0)
initial_position_count = _safe_int('initial_position_count', 0)
initial_last_add_price = _safe_float('initial_last_add_price', 0.0)
initial_highest_price = _safe_float('initial_highest_price', 0.0)

df = pd.DataFrame(_raw)
for col in ('open', 'high', 'low', 'close', 'volume'):
    if col in df.columns:
        df[col] = df[col].astype(float)

ctx = _IndicatorContext(df, _context)
request_series = ctx.request_series
request_lower_tf = ctx.request_lower_tf

_local_ns = {
    'df': df,
    'pd': pd,
    'np': np,
    'json': json,
    'leverage': leverage,
    'trade_direction': trade_direction,
    'initial_position': initial_position,
    'initial_avg_entry_price': initial_avg_entry_price,
    'initial_position_count': initial_position_count,
    'initial_last_add_price': initial_last_add_price,
    'initial_highest_price': initial_highest_price,
    'params': _params,
    'ctx': ctx,
    'request_series': request_series,
    'request_lower_tf': request_lower_tf,
}

exec(user_code, _local_ns, _local_ns)

if 'output' not in _local_ns:
    if 'result_json' in _local_ns:
        output = json.loads(_local_ns['result_json'])
    else:
        output = {"plots": []}
else:
    output = _local_ns['output']
    if isinstance(output, str):
        output = json.loads(output)

output = _clean_nan(output)
json.dumps(output)
`

async function runStrategy ({ userCode, rawData, params, contextData }) {
  if (!pyodide) throw new Error('Pyodide 未初始化')
  pyodide.globals.set('user_code', userCode)
  pyodide.globals.set('raw_data', rawData || [])
  pyodide.globals.set('params', params || {})
  pyodide.globals.set('context_data', contextData || {})
  try {
    return await pyodide.runPythonAsync(STRATEGY_WRAPPER)
  } finally {
    pyodide.globals.set('user_code', '')
    pyodide.globals.set('raw_data', null)
    pyodide.globals.set('params', null)
    pyodide.globals.set('context_data', null)
  }
}

function status () {
  return { ready: !!pyodide, error: lastError ? String(lastError.message || lastError) : null }
}

expose({ init, runPython, runStrategy, loadPackages, status })
