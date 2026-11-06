// Script-code template catalog.
//
// Template data is loaded from the backend so template content can be managed in
// the database. This module only keeps code-param parsing and template rendering
// helpers used by the editor.
import {
  formatStrategyInstrumentIdentity,
  parseStrategyInstrumentIdentity
} from '../../../utils/strategyInstrument.js'

export const SCRIPT_TEMPLATE_CATALOG = []

export function normalizeScriptTemplate (raw) {
  if (!raw || typeof raw !== 'object') return null
  const key = String(raw.key || raw.template_key || raw.templateKey || '').trim()
  const code = String(raw.code || raw.source || '')
  if (!key || !code.trim()) return null
  const paramSchema = raw.param_schema || raw.paramSchema || {}
  const params = Array.isArray(raw.params)
    ? raw.params
    : (Array.isArray(paramSchema.params) ? paramSchema.params : [])
  const normalizedParams = params
    .filter(item => item && item.name)
    .map(item => ({
      ...item,
      source: item.source || 'template_schema'
    }))
  return {
    key,
    assetType: raw.asset_type === 'portfolio_strategy' ? 'portfolio_strategy' : 'script',
    title: String(raw.title || raw.name || key).trim(),
    desc: String(raw.desc || raw.description || '').trim(),
    code,
    params: normalizedParams,
    icon: raw.icon || (raw.metadata && raw.metadata.icon) || 'appstore',
    accent: raw.accent || (raw.metadata && raw.metadata.accent) || 'blue',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    titleI18nKey: raw.name_i18n_key || raw.title_i18n_key || '',
    descriptionI18nKey: raw.description_i18n_key || '',
    metadata: raw.metadata || {}
  }
}

export function setScriptTemplateCatalog (items = []) {
  const next = (Array.isArray(items) ? items : [])
    .map(normalizeScriptTemplate)
    .filter(Boolean)
  SCRIPT_TEMPLATE_CATALOG.splice(0, SCRIPT_TEMPLATE_CATALOG.length, ...next)
  return SCRIPT_TEMPLATE_CATALOG
}

function escapeForRegExp (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizePercentParamValue (raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return n
}

export function formatStrategyInstrument (config = {}, options = {}) {
  const parsed = parseStrategyInstrumentIdentity(config.symbol || config.instrument || '', config)
  return formatStrategyInstrumentIdentity({
    ...config,
    symbol: parsed.symbol,
    exchange_id: options.includeExchange ? config.exchange_id : ''
  }, { includeConfigExchange: Boolean(options.includeExchange) })
}

function replacePrimaryTimeframeReferences (source, previousTimeframe, nextTimeframe) {
  const previous = String(previousTimeframe || '').trim().toLowerCase()
  const next = String(nextTimeframe || '').trim()
  if (!next) return source

  const subscribed = new Set(
    Array.from(source.matchAll(/context\.subscribe\([^)]*?frequency\s*=\s*["']([^"']+)["']/g))
      .map(match => String(match[1] || '').trim().toLowerCase())
      .filter(Boolean)
  )
  const shouldReplace = value => {
    const normalized = String(value || '').trim().toLowerCase()
    if (!normalized) return false
    if (previous && normalized === previous) return true
    return subscribed.size === 1 && !subscribed.has(normalized)
  }
  const replaceLiteral = (match, prefix, quote, value) => (
    shouldReplace(value) ? `${prefix}${JSON.stringify(next)}` : match
  )

  let updated = source.replace(
    /(\bget_history\s*\(\s*[^,]+,\s*)(["'])([^"']+)\2/g,
    replaceLiteral
  )
  updated = updated.replace(
    /(\b(?:get_history|data\.history)\s*\([^)]*?\bfrequency\s*=\s*)(["'])([^"']+)\2/g,
    replaceLiteral
  )
  return updated
}

export function applyStrategyRuntimeConfigToCode (code, config = {}) {
  const source = String(code || '')
  const instrument = formatStrategyInstrument(config, {
    includeExchange: strategyCodeUsesExplicitExchange(source)
  })
  const timeframe = String(config.timeframe || '').trim()
  const exchangeId = String(config.exchange_id || '').trim()
  const tradeDirection = String(config.trade_direction || '').trim().toLowerCase()
  if (!source) return source

  let next = source
  if (instrument) {
    const quotedInstrument = `"${instrument}"`
    next = next.replace(/(^\s*INSTRUMENT\s*=\s*)["'][^"']+["']/m, `$1${quotedInstrument}`)
    next = next.replace(/(^\s*g\.symbol\s*=\s*)["'][^"']+["']/m, `$1${quotedInstrument}`)
    next = next.replace(
      /(context\.set_universe\(\s*(?:instruments\s*=\s*)?\[\s*)["'][^"']+["'](\s*\]\s*\))/m,
      `$1${quotedInstrument}$2`
    )
    next = next.replace(
      /(context\.set_benchmark\(\s*)["'][^"']+["'](\s*\))/m,
      `$1${JSON.stringify(config.market_category === 'Crypto'
        ? formatStrategyInstrumentIdentity({
          ...config,
          symbol: parseStrategyInstrumentIdentity(config.symbol, config).symbol,
          market_type: 'spot'
        })
        : instrument)}$2`
    )
  }
  if (String(config.market_category || '') === 'Crypto' && config.market_type) {
    if (String(config.market_type).toLowerCase() === 'spot') {
      next = next.replace(
        /^(\s*)context\.allow_leverage\(([^)]*)\)\s*$/m,
        '$1# runtime_product_leverage: context.allow_leverage($2)'
      )
    } else {
      next = next.replace(
        /^(\s*)#\s*runtime_product_leverage:\s*context\.allow_leverage\(([^)]*)\)\s*$/m,
        '$1context.allow_leverage($2)'
      )
    }
  }
  if (timeframe) {
    const previousTimeframe = extractStrategyRuntimeConfigFromCode(source).timeframe
    next = replacePrimaryTimeframeReferences(next, previousTimeframe, timeframe)
    next = next.replace(/(^\s*TIMEFRAME\s*=\s*)["'][^"']+["']/m, `$1${JSON.stringify(timeframe)}`)
    next = next.replace(
      /(context\.subscribe\([^)]*?frequency\s*=\s*)["'][^"']+["']/m,
      `$1${JSON.stringify(timeframe)}`
    )
    next = next.replace(/(^\s*#\s*timeframe\s*:\s*)[^\s#]+/im, `$1${timeframe}`)
  }
  if (exchangeId) {
    next = next.replace(/(^\s*(?:g\.)?(?:exchange_id|exchangeId|exchange)\s*=\s*)["'][^"']+["']/m, `$1${JSON.stringify(exchangeId)}`)
    next = next.replace(/(context\.set_exchange\(\s*)["'][^"']+["'](\s*\))/m, `$1${JSON.stringify(exchangeId)}$2`)
  }
  if (['long', 'short', 'both'].includes(tradeDirection)) {
    next = next.replace(/(^\s*g\.trade_direction\s*=\s*)["'][^"']+["']/m, `$1${JSON.stringify(tradeDirection)}`)
    next = next.replace(/(^\s*#\s*trade_direction\s*:\s*)[^\s#]+/im, `$1${tradeDirection}`)
  }
  return next
}

export function extractStrategyRuntimeConfigFromCode (code) {
  const source = String(code || '')
  const instrumentMatch = source.match(/^\s*INSTRUMENT\s*=\s*["']([^"']+)["']/m) ||
    source.match(/^\s*g\.symbol\s*=\s*["']([^"']+)["']/m) ||
    source.match(/context\.set_universe\(\s*(?:instruments\s*=\s*)?\[\s*["']([^"']+)["']/m)
  const timeframeMatch = source.match(/^\s*TIMEFRAME\s*=\s*["']([^"']+)["']/m) ||
    source.match(/context\.subscribe\([^)]*?frequency\s*=\s*["']([^"']+)["']/m) ||
    source.match(/^\s*#\s*timeframe\s*:\s*([^\s#]+)/im)
  const exchangeMatch = source.match(/^\s*(?:g\.)?(?:exchange_id|exchangeId|exchange)\s*=\s*["']([^"']+)["']/m) ||
    source.match(/context\.set_exchange\(\s*["']([^"']+)["']/m)
  const directionMatch = source.match(/^\s*g\.trade_direction\s*=\s*["'](long|short|both)["']/im) ||
    source.match(/^\s*#\s*trade_direction\s*:\s*(long|short|both)\b/im)
  const equityTakeProfitMatch = source.match(/^\s*EQUITY_TAKE_PROFIT\s*=\s*([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)\s*$/im)
  const equityStopLossMatch = source.match(/^\s*EQUITY_STOP_LOSS\s*=\s*([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)\s*$/im)
  const instrument = String((instrumentMatch && instrumentMatch[1]) || '').trim()
  const result = {}
  if (instrument) {
    const parsed = parseStrategyInstrumentIdentity(instrument)
    result.market_category = parsed.market
    result.symbol = parsed.symbol
    result.market_type = parsed.marketType
    if (parsed.exchangeId) result.exchange_id = parsed.exchangeId
  }
  if (timeframeMatch && timeframeMatch[1]) result.timeframe = String(timeframeMatch[1]).trim()
  if (exchangeMatch && exchangeMatch[1]) result.exchange_id = String(exchangeMatch[1]).trim().toLowerCase()
  if (directionMatch && directionMatch[1]) result.trade_direction = String(directionMatch[1]).trim().toLowerCase()
  if (equityTakeProfitMatch) result.equity_take_profit_pct = Math.max(0, Number(equityTakeProfitMatch[1]) || 0)
  if (equityStopLossMatch) result.equity_stop_loss_pct = Math.max(0, Number(equityStopLossMatch[1]) || 0)
  return result
}

export function strategyCodeUsesExplicitExchange (code) {
  return /\b(?:exchange_id|exchangeId|exchange)\b\s*=|\bset_exchange\s*\(/i.test(String(code || ''))
}

const SOURCE_OWNED_EXECUTION_KEYS = [
  'strategy_family',
  'executor_type',
  'executor_config',
  'executor_preview',
  'bot_type',
  'bot_params'
]

export function strategyCodeOwnsExecutionConfig (code) {
  const match = String(code || '').match(/^\s*GRID_TEMPLATE_VERSION\s*=\s*(\d+)\s*$/m)
  return Boolean(match && Number(match[1]) >= 7)
}

export function strategyCodeDeclaredFamily (code) {
  const match = String(code || '').match(/\bstrategy_family\s*=\s*["']([^"']+)["']/i)
  return String((match && match[1]) || '').trim().toLowerCase().replace(/-/g, '_')
}

export function sanitizeRuntimeConfigForSource (config = {}, code = '') {
  const next = { ...(config && typeof config === 'object' ? config : {}) }
  const declaredFamily = strategyCodeDeclaredFamily(code)
  const declaredNonRobot = declaredFamily && !['robot', 'grid', 'dca', 'martingale', 'layered_martingale'].includes(declaredFamily)
  if (!strategyCodeOwnsExecutionConfig(code) && !declaredNonRobot) return next
  SOURCE_OWNED_EXECUTION_KEYS.forEach(key => delete next[key])
  if (declaredNonRobot) next.strategy_family = declaredFamily
  return next
}

export function extractStrategyRuntimeContractFromCode (code) {
  const source = String(code || '')
  const config = extractStrategyRuntimeConfigFromCode(source)
  const instrumentMatch = source.match(/^\s*INSTRUMENT\s*=\s*["']([^"']+)["']/m) ||
    source.match(/^\s*g\.symbol\s*=\s*["']([^"']+)["']/m) ||
    source.match(/context\.set_universe\(\s*(?:instruments\s*=\s*)?\[\s*["']([^"']+)["']/m)
  const instrument = String((instrumentMatch && instrumentMatch[1]) || '')
  const hasInstrument = Boolean(instrumentMatch && config.symbol)
  const hasProduct = hasInstrument && config.market_category === 'Crypto' && /@(?:[^@:\s]+:)?(spot|swap)$/i.test(instrument)
  const hasTimeframe = Boolean(config.timeframe)
  const hasExchange = Boolean(config.exchange_id && strategyCodeUsesExplicitExchange(source))
  const hasDirection = Boolean(config.trade_direction)
  return {
    config,
    hasInstrument,
    hasProduct,
    hasTimeframe,
    hasExchange,
    hasDirection,
    hasControls: hasInstrument || hasTimeframe || hasExchange || hasDirection
  }
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

function paramNameParts (name) {
  return String(name || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
}

function isPeriodLikeParamName (name) {
  const key = String(name || '').toLowerCase()
  const parts = paramNameParts(key)
  const periodTokens = ['period', 'lookback', 'window', 'length', 'len', 'bars', 'ema', 'sma', 'rsi', 'adx', 'ma']
  const nonPeriodTokens = ['pct', 'percent', 'ratio', 'rate', 'mult', 'multiplier', 'threshold', 'distance', 'width', 'bandwidth', 'risk', 'target', 'stop', 'pullback', 'activation']
  if (parts.some(token => nonPeriodTokens.includes(token))) return false
  return periodTokens.includes(key) || periodTokens.some(token => key.endsWith(`_${token}`)) || key.endsWith('_atr_period')
}

function isPercentParamName (name, value) {
  const key = String(name || '').toLowerCase()
  if (isPeriodLikeParamName(key)) return false
  if (/(pct|percent|ratio|allocation|weight|position|take_profit|stop|arm)/.test(key)) {
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
      max: 1,
      step: 0.001
    }
  }
  if (type === 'integer') {
    const lowerName = String(name || '').toLowerCase()
    const positiveWindow = isPeriodLikeParamName(lowerName)
    const zeroAllowed = /(cooldown|delay|wait|pause)/.test(lowerName)
    return {
      default: Number.isFinite(value) ? value : 1,
      min: positiveWindow && !zeroAllowed ? 1 : (zeroAllowed ? 0 : undefined),
      max: positiveWindow && !zeroAllowed ? 500 : undefined,
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

const STRATEGY_ANNOTATION_SCHEMA = {
  entryPct: {
    type: 'percent',
    label: 'Entry size',
    description: 'Fraction of the run-panel investment amount used per entry.',
    min: 0.01,
    max: 1,
    step: 0.01
  },
  stopLossPct: {
    type: 'percent',
    label: 'Stop loss',
    description: 'Engine-managed stop-loss ratio.',
    min: 0,
    max: 1,
    step: 0.001
  },
  takeProfitPct: {
    type: 'percent',
    label: 'Take profit',
    description: 'Engine-managed take-profit ratio.',
    min: 0,
    max: 5,
    step: 0.001
  },
  trailingEnabled: {
    type: 'boolean',
    label: 'Trailing stop enabled',
    description: 'Enables engine-managed trailing stop logic.'
  },
  trailingStopPct: {
    type: 'percent',
    label: 'Trailing distance',
    description: 'Trailing stop distance ratio.',
    min: 0,
    max: 1,
    step: 0.001
  },
  trailingActivationPct: {
    type: 'percent',
    label: 'Trailing activation',
    description: 'Profit ratio required before trailing stop activates.',
    min: 0,
    max: 1,
    step: 0.001
  },
  maxHoldingBars: {
    type: 'integer',
    label: 'Max holding bars',
    description: 'Maximum holding bars before engine-managed exit. 0 disables it.',
    min: 0,
    max: 100000,
    step: 1
  }
}

function parseStrategyAnnotationValue (name, raw) {
  const schema = STRATEGY_ANNOTATION_SCHEMA[name]
  const text = String(raw == null ? '' : raw).trim()
  if (!schema) return text
  if (schema.type === 'boolean') return /^(true|1|yes|on)$/i.test(text)
  const n = Number(text)
  return Number.isFinite(n) ? n : 0
}

export function extractScriptParamsFromCode (code) {
  const source = String(code || '')
  const seen = new Set()
  const params = []
  let match
  const paramPattern = /ctx\.param\(\s*['"]([^'"]+)['"]\s*,\s*((?:[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?|True|False|None|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'))(?:\s*,\s*([^)\n]*))?\)/g
  source.split(/\r?\n/).forEach((line) => {
    paramPattern.lastIndex = 0
    while ((match = paramPattern.exec(line)) !== null) {
      const prefix = line.slice(0, match.index).trim()
      if (prefix.startsWith('#')) continue
      const name = String(match[1] || '').trim()
      if (!name || seen.has(name)) continue
      if (isRuntimeReservedParam(name)) continue
      seen.add(name)
      const parsed = parsePythonLiteral(match[2])
      const type = inferParamType(name, parsed)
      params.push({
        name,
        source: 'code_param',
        type,
        ...inferParamDefaults(name, parsed, type),
        ...parseParamKeywordOptions(match[3], type)
      })
    }
  })
  const strategyPattern = /^\s*#\s*@strategy\s+([A-Za-z_][\w-]*)\s*:?\s+([^\s#]+).*$/gim
  while ((match = strategyPattern.exec(source)) !== null) {
    const name = String(match[1] || '').trim()
    const schema = STRATEGY_ANNOTATION_SCHEMA[name]
    if (!name || !schema || seen.has(name)) continue
    seen.add(name)
    const parsed = parseStrategyAnnotationValue(name, match[2])
    const defaults = schema.type === 'percent'
      ? { default: normalizePercentParamValue(parsed) ?? 0 }
      : inferParamDefaults(name, parsed, schema.type)
    params.push({
      name,
      source: 'strategy_annotation',
      type: schema.type,
      label: schema.label,
      description: schema.description,
      min: schema.min,
      max: schema.max,
      step: schema.step,
      ...defaults
    })
  }
  if (!params.length) {
    const indicatorParamPattern = /^\s*#\s*@param\s+(\w+)\s+(int|float|bool|str|string)\s+(\S+)\s*(.*)$/gim
    while ((match = indicatorParamPattern.exec(source)) !== null) {
      const name = String(match[1] || '').trim()
      if (!name || seen.has(name)) continue
      seen.add(name)
      const declaredType = String(match[2] || '').toLowerCase()
      const parsed = parsePythonLiteral(match[3])
      const desc = String(match[4] || '')
      const type = declaredType === 'bool'
        ? 'boolean'
        : declaredType === 'int'
          ? 'integer'
          : declaredType === 'float'
            ? (isPercentParamName(name, parsed) ? 'percent' : 'number')
            : 'text'
      const range = parseDeclaredRange(desc, type)
      params.push({
        name,
        type,
        source: 'indicator_param',
        ...inferParamDefaults(name, parsed, type),
        ...range
      })
    }
  }
  if (!params.length) return null
  return {
    key: '__code_params__',
    inferred: true,
    params
  }
}

function parseParamKeywordOptions (raw, type) {
  if (!['integer', 'number', 'percent'].includes(type)) return {}
  const text = String(raw || '')
  const out = {}
  ;['min', 'max', 'step'].forEach(key => {
    const match = text.match(new RegExp(`(?:^|,)\\s*${key}\\s*=\\s*(-?\\d+(?:\\.\\d+)?(?:[eE][-+]?\\d+)?)`, 'i'))
    if (!match) return
    const value = Number(match[1])
    if (Number.isFinite(value)) out[key] = value
  })
  return out
}

function parseDeclaredRange (desc, type) {
  const text = String(desc || '')
  const rangeMatch = text.match(/range\s*=\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)/i)
  if (rangeMatch && ['integer', 'number', 'percent'].includes(type)) {
    const min = Number(rangeMatch[1])
    const max = Number(rangeMatch[2])
    const step = Number(rangeMatch[3])
    if (Number.isFinite(min) && Number.isFinite(max) && Number.isFinite(step) && step > 0) {
      return { min, max, step }
    }
  }
  const valuesMatch = text.match(/values\s*=\s*([^\s]+)/i)
  if (valuesMatch) {
    const values = valuesMatch[1].split(',').map(item => item.trim()).filter(Boolean).map(item => {
      const n = Number(item)
      return Number.isFinite(n) ? n : item
    })
    if (values.length) return { values }
  }
  return {}
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

export function getScriptTemplateByKey (key) {
  return SCRIPT_TEMPLATE_CATALOG.find(item => item.key === key) || null
}

export function buildTemplateParamValues (templateOrKey, overrides = {}) {
  const template = typeof templateOrKey === 'string' ? getScriptTemplateByKey(templateOrKey) : templateOrKey
  if (!template) return {}
  return template.params.filter(param => !isRuntimeReservedParam(param.name)).reduce((acc, param) => {
    const raw = Object.prototype.hasOwnProperty.call(overrides, param.name)
      ? overrides[param.name]
      : param.default
    if (param.type === 'percent') {
      acc[param.name] = Number.isFinite(Number(raw)) ? Number(raw) : Number(param.default || 0)
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
  return buildScriptCodeWithParamValues(template.code, template.params, values)
}

export function buildScriptCodeWithParamValues (code, params = [], overrides = {}) {
  return (params || []).reduce((source, param) => {
    if (!param || !param.name) return source
    const stored = Object.prototype.hasOwnProperty.call(overrides, param.name)
      ? overrides[param.name]
      : param.default
    const codeValue = stored
    const literal = toPythonLiteral(codeValue)
    const pattern = new RegExp(`(ctx\\.param\\(\\s*['"]${escapeForRegExp(param.name)}['"]\\s*,\\s*)([^\\)\\n]+)(\\))`)
    let next = source.replace(pattern, `$1${literal}$3`)
    const indicatorLiteral = param.type === 'boolean'
      ? (stored ? 'true' : 'false')
      : String(codeValue)
    const indicatorPattern = new RegExp(`(^\\s*#\\s*@param\\s+${escapeForRegExp(param.name)}\\s+(?:int|float|bool|str|string)\\s+)(\\S+)(.*$)`, 'im')
    next = next.replace(indicatorPattern, `$1${indicatorLiteral}$3`)
    const strategyLiteral = param.type === 'boolean'
      ? (stored ? 'true' : 'false')
      : String(codeValue)
    const strategyPattern = new RegExp(`(^\\s*#\\s*@strategy\\s+${escapeForRegExp(param.name)}\\s*:?\\s+)(\\S+)(.*$)`, 'im')
    next = next.replace(strategyPattern, `$1${strategyLiteral}$3`)
    const getPattern = new RegExp(`(params\\.get\\(\\s*['"]${escapeForRegExp(param.name)}['"]\\s*,\\s*)([^\\)\\n]+)(\\))`, 'g')
    next = next.replace(getPattern, `$1${literal}$3`)
    const contextGetPattern = new RegExp(`(context\\.params\\.get\\(\\s*['"]${escapeForRegExp(param.name)}['"]\\s*,\\s*)([^\\)\\n]+)(\\))`, 'g')
    return next.replace(contextGetPattern, `$1${literal}$3`)
  }, String(code || ''))
}
