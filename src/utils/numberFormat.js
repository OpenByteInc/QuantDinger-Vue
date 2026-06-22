/**
 * Display-safe number helpers (avoid 3.5000000000000004% in UI inputs).
 */

export function roundTo (value, decimals = 4) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  const p = Math.pow(10, decimals)
  return Math.round(n * p) / p
}

/** Format a percent value already in 0–100 scale for display. */
export function formatPercentDisplay (value, decimals = 2) {
  const n = roundTo(value, decimals + 2)
  if (!Number.isFinite(n)) return '0'
  return String(roundTo(n, decimals))
}

/** Parse user percent input and normalize float noise. */
export function parsePercentInput (raw, decimals = 4) {
  if (raw == null || raw === '') return null
  const cleaned = String(raw).replace(/%/g, '').trim()
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return roundTo(n, decimals)
}

/** a-input-number formatter for percent fields (value is 0–100). */
export function percentInputFormatter (value, decimals = 2) {
  if (value == null || value === '') return ''
  return `${formatPercentDisplay(value, decimals)}%`
}

/** a-input-number parser for percent fields. */
export function percentInputParser (value, decimals = 4) {
  const n = parsePercentInput(value, decimals)
  return n == null ? '' : n
}

/** Convert stored ratio (0.035) or percent (3.5) to UI percent. */
export function ratioOrPercentToUiPercent (raw, defaultPct = 3, decimals = 4) {
  if (raw == null || raw === '') return defaultPct
  const n = Number(raw)
  if (!Number.isFinite(n)) return defaultPct
  const pct = n > 0 && n <= 1 ? n * 100 : n
  return roundTo(pct, decimals)
}
