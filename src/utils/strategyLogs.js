import { translateStrategyRuntimeError } from './strategyRuntimeError.js'

export const STRATEGY_LOG_FILTERS = Object.freeze([
  { value: 'all', icon: 'bars' },
  { value: 'trade', icon: 'transaction' },
  { value: 'signal', icon: 'notification' },
  { value: 'warning', icon: 'exclamation-circle' },
  { value: 'error', icon: 'warning' }
])

export const normalizeStrategyLogLevel = level => {
  const normalized = String(level || 'info').trim().toLowerCase()
  return normalized === 'warn' ? 'warning' : normalized
}

export const strategyLogLevelKey = level => {
  const normalized = normalizeStrategyLogLevel(level)
  return `trading-assistant.logs.level.${normalized}`
}

const EXCHANGE_ERROR_RULES = Object.freeze([
  ['credentials', /(?:http\s+401|(?:code|retcode|scode|error(?:\s+code)?)['" :=-]*(?:-1002|-1022|-2014|-2015|10003|10004|10005|10007|10010|33004|50103|50104|50105|50106|40018)\b|invalid api-?key|api key (?:is invalid|has expired)|permission denied|invalid signature|unmatched ip|ip (?:is )?not whitelisted|unauthorized)/i],
  ['clock_skew', /(?:(?:code|retcode|scode|error(?:\s+code)?)['" :=-]*(?:-1021|10002|50102)\b|invalid timestamp|outside of the recvwindow|timestamp request expired)/i],
  ['rate_limit', /(?:http\s+429|(?:code|retcode|scode|error(?:\s+code)?)['" :=-]*(?:-1003|-1008|-1015|10006|10429|20003|50011)\b|rate.?limit|too many requests?|too many visits|request_frequency|operation too frequent)/i],
  ['invalid_symbol', /(?:(?:code|retcode|scode|error(?:\s+code)?)['" :=-]*(?:-1121|10029|25100|200)\b|invalid symbol|bad_symbol|contract_not_found|trading pair .*does not exist|no security definition)/i],
  ['price_band', /(?:(?:code|retcode|scode|error(?:\s+code)?)['" :=-]*(?:-4016|-4024|51137|51138|110003|110120|110121|25205|25206|30208|30209)\b|price_too_deviated|price .*deviat|price .*allowable range|outside (?:the )?price band|percent_price)/i],
  ['insufficient_funds', /(?:(?:code|retcode|scode|error(?:\s+code)?)['" :=-]*(?:-2018|-2019|110004|110006|110007|110012|110044|110045|51008|25202|25203|40310000)\b|insufficient_available|insufficient (?:balance|margin|buying power)|not enough balance|margin .*while available|balance_not_enough)/i],
  ['order_size', /(?:(?:code|retcode|scode|error(?:\s+code)?)['" :=-]*(?:-1111|-4003|-4004|-4005|110017|110094|25207|25208)\b|bad precision|step size|min_?notional|minqty|minsize|invalid (?:qty|quantity|size|amount)|too many decimals)/i],
  ['account_configuration', /(?:(?:code|retcode|scode|error(?:\s+code)?)['" :=-]*(?:51010|10008|110015|110024|110026|110028|110029|110036|110038|110073|25009|25010)\b|position mode|margin mode|account mode|hedge mode|one-way mode|leverage too (?:high|low))/i],
  ['position_conflict', /(?:(?:code|retcode|scode|error(?:\s+code)?)['" :=-]*(?:-2022|-2024|110005|110008|110010|110034)\b|reduce.?only .*reject|position (?:not sufficient|not found|does not exist)|position_empty|position side does not match)/i],
  ['risk_limit', /(?:(?:code|retcode|scode|error(?:\s+code)?)['" :=-]*(?:-2023|-2027|-2028|110011|110013|110039|110040|110046|110089|110090)\b|risk_limit_exceeded|liquidate_immediately|in liquidation|forced liquidation|maximum risk limit)/i],
  ['market_unavailable', /(?:(?:code|retcode|scode|error(?:\s+code)?)['" :=-]*(?:-1016|10016|10019|110063|110066|25101|25102|25104)\b|service is restarting|settlement in progress|closed for maintenance|contract delisted|market is closed)/i],
  ['transport', /(?:http\s+5\d\d|bad gateway|gateway timeout|connection reset|connection timed out|timeout waiting for response|temporarily unavailable)/i]
])

const legacyExchangeError = text => {
  const lower = text.toLowerCase()
  const isWrapped = /^(?:exchange order failed|unexpected order error|auto-stopped|leverage or margin-mode setup failed|exchange client creation failed|ibkr order|alpaca order)/i.test(text)
  if (!isWrapped) return null
  const rule = EXCHANGE_ERROR_RULES.find(([, pattern]) => pattern.test(text))
  const exchange = ['binance', 'okx', 'gate', 'bybit', 'bitget', 'htx', 'alpaca', 'ibkr'].find(value => lower.includes(value)) || 'exchange'
  const context = text.match(/^[^(]+\(([^)]+)\)/)?.[1] || text.match(/^Leverage or margin-mode setup failed for\s+([^:]+)/i)?.[1] || ''
  return {
    category: rule?.[0] || 'exchange_rejected',
    exchange,
    context,
    auto_stopped: /^auto-stopped/i.test(text)
  }
}

export const translateStrategyRuntimeMessage = (message, translate, exchangeError = null) => {
  const text = String(message || '').trim()
  const localize = (key, params = {}) => {
    const value = String(translate(key, params) || '')
    return value && value !== key ? value : ''
  }

  const exchangeFailure = exchangeError?.category ? exchangeError : legacyExchangeError(text)
  if (exchangeFailure) {
    const suffix = exchangeFailure.auto_stopped && exchangeFailure.category === 'credentials'
      ? 'credentialsStopped'
      : exchangeFailure.category
    const localized = localize(`trading-assistant.logs.exchangeError.${suffix}`, {
      exchange: exchangeFailure.exchange || 'exchange',
      context: exchangeFailure.context || exchangeFailure.exchange || 'exchange'
    })
    if (localized) return localized
  }

  const coded = translateStrategyRuntimeError(text, key => localize(key))
  if (coded !== text) return coded

  let match = text.match(/^Leverage or margin-mode setup failed for (\S+):[\s\S]*(?:-1121|Invalid symbol)/i)
  if (match) return localize('trading-assistant.logs.message.invalidSymbol', { symbol: match[1] }) || text

  match = text.match(/^Leverage or margin-mode setup failed for (\S+):/i)
  if (match) return localize('trading-assistant.logs.message.accountSetupFailed', { symbol: match[1] }) || text

  match = text.match(/^Exchange client creation failed \(([^)]+)\):/i)
  if (match) return localize('trading-assistant.logs.message.exchangeClientFailed', { exchange: match[1] }) || text

  match = text.match(/^Order rejected because the exchange position snapshot failed:\s*(\S+)/i)
  if (match) return localize('trading-assistant.logs.message.positionSnapshotFailed', { symbol: match[1] }) || text

  match = text.match(/^Order rejected: spot market does not support short signals \(([^)]+)\)/i)
  if (match) return localize('trading-assistant.logs.message.spotShortRejected', { context: match[1] }) || text

  match = text.match(/^Exchange order failed \(([^)]+)\):/i)
  if (match) return localize('trading-assistant.logs.message.exchangeOrderFailed', { context: match[1] }) || text

  match = text.match(/^Runtime cycle failed:\s*([\s\S]*)/i)
  if (match) {
    const summary = localize('trading-assistant.logs.message.runtimeCycleFailed')
    return summary ? `${summary} ${match[1]}`.trim() : text
  }

  match = text.match(/^Order queued:\s*(\w+)\s+(\S+)\s+quantity=([^\s]+)[\s\S]*?pending_id=([^\s]+)/i)
  if (match) {
    const actionKey = `trading-assistant.logs.action.${match[1].toLowerCase()}`
    const action = localize(actionKey) || match[1]
    return localize('trading-assistant.logs.message.orderQueued', {
      action,
      symbol: match[2],
      quantity: match[3],
      pendingId: match[4]
    }) || text
  }

  match = text.match(/^Strategy runtime ready:\s*instruments=(\d+),\s*timeframe=([^,]+),\s*mode=([^,]+),\s*trigger=(\S+)/i)
  if (match) {
    return localize('trading-assistant.logs.message.runtimeReady', {
      instruments: match[1],
      timeframe: match[2],
      mode: match[3],
      trigger: match[4]
    }) || text
  }

  if (/^Strategy runtime scheduled$/i.test(text)) {
    return localize('trading-assistant.logs.message.runtimeScheduled') || text
  }

  return text
}
