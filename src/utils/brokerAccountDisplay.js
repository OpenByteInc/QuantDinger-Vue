export function firstValue (...values) {
  return values.find(value => value !== null && value !== undefined && value !== '')
}

export function brokerMoney (value, currency = 'USD', maximumFractionDigits = 2) {
  if (value === null || value === undefined || value === '') return '--'
  const number = Number(value)
  if (!Number.isFinite(number) || !currency) return '--'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, currencyDisplay: arguments.length > 1 ? 'code' : 'symbol', minimumFractionDigits: 2, maximumFractionDigits
  }).format(number)
}

export function brokerPrice (value, currency = 'USD') {
  return brokerMoney(value, currency, 6)
}

export function brokerRowCurrency (row, brokerId) {
  const currency = String(row.currency || row.ccy || '').replace(/^HK-/, '').toUpperCase()
  if (/^[A-Z]{3}$/.test(currency)) return currency
  if (row.market === 'HKStock' || /\.HK$/i.test(row.symbol || '')) return 'HKD'
  if (row.market === 'USStock' || ['alpaca', 'webull'].includes(brokerId)) return 'USD'
  return null
}

export function brokerQuantity (value) {
  if (value === null || value === undefined || value === '') return '--'
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString('en-US', { maximumFractionDigits: 9 }) : '--'
}

export function brokerTime (value, locale = 'en-US') {
  if (!value) return '--'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '--'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short'
  }).format(date)
}
