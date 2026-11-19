const TIMEFRAME_ALIASES = new Map([
  ['1h', '1H'],
  ['2h', '2H'],
  ['4h', '4H'],
  ['6h', '6H'],
  ['8h', '8H'],
  ['12h', '12H'],
  ['1d', '1D'],
  ['1w', '1W']
])

export const SUPPORTED_INDICATOR_TIMEFRAMES = new Set([
  '1m', '3m', '5m', '15m', '30m', '1H', '2H', '4H', '6H', '8H', '12H', '1D', '1W'
])

export function normalizeIndicatorTimeframe (value) {
  const raw = String(value || '').trim()
  const normalized = TIMEFRAME_ALIASES.get(raw) || raw
  return SUPPORTED_INDICATOR_TIMEFRAMES.has(normalized) ? normalized : ''
}

function addRequest (requests, timeframe, mode) {
  const normalized = normalizeIndicatorTimeframe(timeframe)
  if (!normalized) return
  if (requests.some(item => item.timeframe === normalized && item.mode === mode)) return
  requests.push({ timeframe: normalized, mode })
}

function parseLiteralTimeframeList (code, variableName) {
  const pattern = new RegExp(`\\b${variableName}\\s*=\\s*(?:\\[([^\\]]*)\\]|\\(([^)]*)\\))`, 'm')
  const match = String(code || '').match(pattern)
  if (!match) return []
  const body = match[1] || match[2] || ''
  return [...body.matchAll(/['"]([^'"]+)['"]/g)].map(item => item[1])
}

function parseLiteralStringAssignment (code, variableName) {
  const pattern = new RegExp(`\\b${variableName}\\s*=\\s*['"]([^'"]+)['"]`, 'm')
  return String(code || '').match(pattern)?.[1] || ''
}

export function extractIndicatorDataRequests (code, indicatorParams = {}) {
  const source = String(code || '')
  const requests = []
  const seriesParam = parseLiteralStringAssignment(source, 'indicator_timeframe_param')
  const lowerParam = parseLiteralStringAssignment(source, 'indicator_lower_timeframe_param')
  const selectedSeries = normalizeIndicatorTimeframe(indicatorParams?.[seriesParam])
  const selectedLower = normalizeIndicatorTimeframe(indicatorParams?.[lowerParam])

  for (const match of source.matchAll(/^[ \t]*#[ \t]*@(lower[_-]?timeframe|timeframe)[ \t]+([^\s#]+)/gim)) {
    addRequest(requests, match[2], String(match[1]).toLowerCase().startsWith('lower') ? 'lower_tf' : 'series')
  }

  const declaredSeries = parseLiteralTimeframeList(source, 'indicator_timeframes')
  for (const timeframe of selectedSeries && declaredSeries.includes(selectedSeries) ? [selectedSeries] : declaredSeries) {
    addRequest(requests, timeframe, 'series')
  }
  const declaredLower = parseLiteralTimeframeList(source, 'indicator_lower_timeframes')
  for (const timeframe of selectedLower && declaredLower.includes(selectedLower) ? [selectedLower] : declaredLower) {
    addRequest(requests, timeframe, 'lower_tf')
  }

  for (const match of source.matchAll(/(?:\bctx\s*\.\s*)?\b(request_series|request_lower_tf)\s*\(\s*['"]([^'"]+)['"]/g)) {
    addRequest(requests, match[2], match[1] === 'request_lower_tf' ? 'lower_tf' : 'series')
  }

  return requests.slice(0, 8)
}

export function buildIndicatorContextRequest ({
  code,
  market,
  symbol,
  timeframe,
  exchangeId,
  marketType,
  instrumentId,
  baseCount,
  indicatorParams
}) {
  return {
    market,
    symbol,
    timeframe: normalizeIndicatorTimeframe(timeframe) || timeframe,
    exchange_id: exchangeId || undefined,
    market_type: marketType || undefined,
    instrument_id: instrumentId || undefined,
    base_count: Math.max(1, Math.min(Number(baseCount) || 1, 1000)),
    requests: extractIndicatorDataRequests(code, indicatorParams)
  }
}
