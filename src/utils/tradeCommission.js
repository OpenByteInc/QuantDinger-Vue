function numeric (value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const DOLLAR_EQUIVALENT_CURRENCIES = new Set(['USD', 'USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD'])

export function formatTradeCommission (row, t) {
  const status = String(row.fee_status || '')
  const quote = numeric(row.commission_quote)
  const native = numeric(row.commission != null ? row.commission : row.fee)
  const currency = String(row.commission_ccy || '').toUpperCase()
  const format = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })
  if (currency === 'HKD') {
    if (native !== null && (native !== 0 || ['actual', 'actual_zero', 'complete'].includes(status))) return `${format(native)} HKD`
    return t('trading-assistant.fees.pending')
  }
  if (quote !== null && quote !== 0) return `$${format(quote)}`
  if (native !== null && native !== 0 && DOLLAR_EQUIVALENT_CURRENCIES.has(currency)) return `$${format(native)}`
  if (native !== null && native !== 0) return t('trading-assistant.fees.pending')
  if (status === 'actual_zero' || status === 'complete' || (status === 'actual' && (quote === 0 || native === 0))) return '$0.00'
  return t('trading-assistant.fees.pending')
}
