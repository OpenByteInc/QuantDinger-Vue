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

async function runStrategy ({ userCode, rawData, params }) {
  if (!pyodide) throw new Error('Pyodide 未初始化')
  pyodide.globals.set('user_code', userCode)
  pyodide.globals.set('raw_data', rawData || [])
  pyodide.globals.set('params', params || {})
  try {
    return await pyodide.runPythonAsync(STRATEGY_WRAPPER)
  } finally {
    pyodide.globals.set('user_code', '')
    pyodide.globals.set('raw_data', null)
    pyodide.globals.set('params', null)
  }
}

function status () {
  return { ready: !!pyodide, error: lastError ? String(lastError.message || lastError) : null }
}

expose({ init, runPython, runStrategy, loadPackages, status })
