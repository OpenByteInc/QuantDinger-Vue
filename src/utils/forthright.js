export function stockQuantityPrecision (market, broker) {
  if (market === 'HKStock') return 0
  if (market === 'USStock' && broker === 'tiger') return 0
  if (market === 'USStock' && broker === 'webull') return 6
  return market === 'USStock' && broker === 'forthright' ? 4 : 8
}

export function compactQuantity (value) {
  return String(value == null ? '' : value).replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1')
}

export function forthrightErrorMessage (error, t) {
  const data = error?.response?.data || error || {}
  const message = t(data.error || error?.localizedMessage || error?.message || 'brokerAccounts.orderFailed')
  const details = data.broker_details
  if (!details) return message
  const reason = t('brokerAccounts.forthright.brokerError', { code: details.code, message: details.message })
  const encoding = details.replacement_on_wire ? t('brokerAccounts.forthright.encodingLost') : ''
  return [message, reason, encoding].filter(Boolean).join(' ')
}

export function forthrightBuyingPower (account, currency) {
  const value = account?.buying_power
  if (value == null || value === '' || String(account?.currency || '').toUpperCase() !== currency) return null
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.max(0, amount) : null
}

export function validFuturesOrder (contract, quantity, orderType, price) {
  if (!contract || !Number.isSafeInteger(Number(quantity)) || Number(quantity) <= 0) return false
  if (orderType === 'market') return true
  const value = Number(price); const tick = Number(contract.price_tick)
  return orderType === 'limit' && Number.isFinite(value) && value > 0 && (!tick || Math.abs(value / tick - Math.round(value / tick)) < 1e-7)
}
