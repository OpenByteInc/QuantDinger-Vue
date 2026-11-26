// Integer arithmetic keeps an exact budget boundary from losing one quantity step.
function decimalRatio (value) {
  const text = String(value ?? '').trim().replace(/^\+/, '').replace(/^\./, '0.')
  if (text.length > 100) return null
  const match = /^(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text)
  if (!match) return null
  const exponent = Number(match[3] || 0) - (match[2] || '').length
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 100) return null
  const digits = BigInt(match[1] + (match[2] || ''))
  if (digits <= BigInt(0)) return null
  const power = BigInt(10) ** BigInt(Math.abs(exponent))
  return exponent >= 0 ? [digits * power, BigInt(1)] : [digits, power]
}

export function quantityFromAmount (amount, price, precision, lotSize = 0) {
  if (!Number.isInteger(precision) || precision < 0 || precision > 9) return 0
  const budget = decimalRatio(amount)
  const quote = decimalRatio(price)
  if (!budget || !quote) return 0
  const scale = BigInt(10) ** BigInt(precision)
  let units = budget[0] * quote[1] * scale / (budget[1] * quote[0])
  if (lotSize) {
    if (!Number.isSafeInteger(lotSize) || lotSize <= 0) return 0
    const lot = BigInt(lotSize) * scale
    units = units / lot * lot
  }
  if (units > BigInt(Number.MAX_SAFE_INTEGER)) return 0
  return Number(units) / (10 ** precision)
}
