// Comparison only: keep broker request symbols and returned records unchanged.
export function stockSymbolsMatch (left, right, market, brokerId = '') {
  const marketKey = String(market || '').toUpperCase()
  const normalize = value => {
    let symbol = String(value || '').trim().toUpperCase()
    const prefix = symbol.match(/^(HKSTOCK|USSTOCK):/)
    if (prefix) {
      if (['HKSTOCK', 'USSTOCK'].includes(marketKey) && prefix[1] !== marketKey) return ''
      symbol = symbol.slice(prefix[0].length)
    }
    if (marketKey === 'HKSTOCK' && /^(?:HK\.?)?\d{1,5}(?:\.HK)?$/.test(symbol)) {
      return symbol.replace(/^HK\.?/, '').replace(/\.HK$/, '').padStart(5, '0') + '.HK'
    }
    if (marketKey === 'USSTOCK' && brokerId === 'alpaca') {
      return symbol.replace(/\//g, '.')
    }
    return symbol
  }
  const normalized = normalize(left)
  return Boolean(normalized) && normalized === normalize(right)
}
