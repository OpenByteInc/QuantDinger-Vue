import { RUNTIME_SCRIPT_TEMPLATES } from './runtimeScriptTemplates.js'

// Script-code template catalog.
//
// The catalog intentionally contains only stateful script-code templates that
// need on_init/on_bar, ctx.state, runtime baskets, or position-aware execution.
// Simple indicator signals belong in Indicator IDE, and symbol/market/direction/
// investment/leverage belong in the run panel rather than ctx.param(...).
const TEMPLATE_DEFINITIONS = []

function escapeForRegExp (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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
  if (/(pct|percent|ratio|allocation|weight|position|take_profit|stop|arm|entry|budget)/.test(key)) {
    return typeof value === 'number'
  }
  return false
}

function inferParamType (name, value) {
  const key = String(name || '').toLowerCase()
  if (typeof value === 'boolean') return 'boolean'
  if (isPercentParamName(name, value)) return 'percent'
  if (Number.isInteger(value)) return 'integer'
  if (typeof value === 'number') return 'number'
  if (key.endsWith('_mode') || key.endsWith('_type')) return 'text'
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
      min: lowerName.includes('period') || lowerName.includes('window') || lowerName.includes('lookback') ? 1 : undefined,
      max: lowerName.includes('period') || lowerName.includes('window') || lowerName.includes('lookback') ? 500 : undefined,
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
    if (isRuntimeReservedParam(name)) continue
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

function isRuntimeReservedParam (name) {
  const key = String(name || '').trim().toLowerCase()
  return key === 'direction' ||
    key === 'trade_direction' ||
    key === 'market_type' ||
    key === 'markettype' ||
    key === 'symbol' ||
    key === 'timeframe' ||
    key === 'tick_interval_sec' ||
    key === 'leverage' ||
    key === 'investment_amount' ||
    key === 'initial_capital' ||
    key === 'base_notional'
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

const ALL_TEMPLATE_DEFINITIONS = [
  ...TEMPLATE_DEFINITIONS,
  ...RUNTIME_SCRIPT_TEMPLATES
]

export const SCRIPT_TEMPLATE_CATALOG = ALL_TEMPLATE_DEFINITIONS

export function getScriptTemplateByKey (key) {
  return ALL_TEMPLATE_DEFINITIONS.find(item => item.key === key) || null
}

export function buildTemplateParamValues (templateOrKey, overrides = {}) {
  const template = typeof templateOrKey === 'string' ? getScriptTemplateByKey(templateOrKey) : templateOrKey
  if (!template) return {}
  return template.params.filter(param => !isRuntimeReservedParam(param.name)).reduce((acc, param) => {
    const raw = Object.prototype.hasOwnProperty.call(overrides, param.name)
      ? overrides[param.name]
      : param.default
    acc[param.name] = param.type === 'percent'
      ? (normalizePercentParamValue(raw) ?? param.default)
      : raw
    return acc
  }, {})
}

export function buildTemplateCode (templateOrKey, overrides = {}) {
  const template = typeof templateOrKey === 'string' ? getScriptTemplateByKey(templateOrKey) : templateOrKey
  if (!template) return ''
  const values = buildTemplateParamValues(template, overrides)
  return template.params.filter(param => !isRuntimeReservedParam(param.name)).reduce((code, param) => {
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
