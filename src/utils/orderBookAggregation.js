const EPSILON = 1e-12

function cleanRows (rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(row => ({ price: Number(row && row.price), size: Number(row && row.size) }))
    .filter(row => Number.isFinite(row.price) && row.price > 0 && Number.isFinite(row.size) && row.size > EPSILON)
}

function precisionFor (value) {
  const number = Math.abs(Number(value || 0))
  if (!(number > 0)) return 8
  return Math.min(12, Math.max(0, Math.ceil(-Math.log10(number)) + 2))
}

function normalizeStep (value) {
  const number = Number(value || 0)
  if (!(number > 0)) return 0
  const power = Math.pow(10, Math.floor(Math.log10(number)))
  const normalized = number / power
  const nice = normalized <= 1 ? 1 : (normalized <= 2 ? 2 : (normalized <= 5 ? 5 : 10))
  return Number((nice * power).toPrecision(12))
}

export function deriveOrderBookAggregationStep (bids, asks, midPrice = 0) {
  const differences = []
  ;[cleanRows(bids), cleanRows(asks)].forEach(rows => {
    rows.slice(0, 25).forEach((row, index) => {
      if (index === 0) return
      const difference = Math.abs(row.price - rows[index - 1].price)
      if (difference > EPSILON) differences.push(difference)
    })
  })
  const fallback = Math.max(Math.abs(Number(midPrice || 0)) * 0.00001, 0.00000001)
  const tick = differences.length ? Math.min(...differences) : fallback
  return normalizeStep(tick * 5)
}

export function aggregateOrderBookRows (rows, side, step) {
  const clean = cleanRows(rows)
  const bucketSize = Number(step || 0)
  if (!(bucketSize > 0)) return clean
  const precision = precisionFor(bucketSize)
  const buckets = new Map()
  clean.forEach(row => {
    const bucketIndex = Math.floor((row.price + EPSILON) / bucketSize)
    const key = String(bucketIndex)
    const existing = buckets.get(key)
    if (existing) {
      existing.size += row.size
      existing.levelCount += 1
      existing.price = side === 'bid' ? Math.max(existing.price, row.price) : Math.min(existing.price, row.price)
      return
    }
    buckets.set(key, { price: row.price, size: row.size, levelCount: 1 })
  })
  const direction = side === 'bid' ? -1 : 1
  return Array.from(buckets.values())
    .map(row => ({ ...row, price: Number(row.price.toFixed(precision)), size: Number(row.size.toPrecision(12)) }))
    .sort((left, right) => direction * (left.price - right.price))
}
