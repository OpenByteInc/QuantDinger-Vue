function asArray (value) {
  return Array.isArray(value) ? value : []
}

function pointColor (value) {
  if (value && typeof value === 'object') {
    return value.color || value.fillColor || value.backgroundColor || null
  }
  return value == null ? null : String(value)
}

function plotPointValue (point) {
  if (point && typeof point === 'object') {
    const value = point.value ?? point.y ?? point.data
    return value == null ? null : value
  }
  return point
}

function parseRgbColor (value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return null

  const namedColors = {
    black: [0, 0, 0],
    white: [255, 255, 255]
  }
  if (namedColors[raw]) return namedColors[raw]

  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const digits = hex[1].length === 3
      ? hex[1].split('').map(char => char + char).join('')
      : hex[1]
    return [
      Number.parseInt(digits.slice(0, 2), 16),
      Number.parseInt(digits.slice(2, 4), 16),
      Number.parseInt(digits.slice(4, 6), 16)
    ]
  }

  const rgb = raw.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i)
  if (!rgb) return null
  return rgb.slice(1, 4).map(channel => Math.max(0, Math.min(255, Number(channel))))
}

export function normalizeIndicatorLabelAnchor (side) {
  const normalized = String(side || '').trim().toLowerCase()
  if (['above', 'sell', 'down', 'top'].includes(normalized)) return 'above'
  if (['center', 'middle'].includes(normalized)) return 'center'
  if (['right', 'right-center'].includes(normalized)) return 'right'
  return 'below'
}

export function normalizeIndicatorLabelFontSize (value, fallback = 11) {
  const numeric = Number(value)
  const size = Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
  return Math.max(11, Math.min(16, Math.round(size)))
}

export function resolveIndicatorLabelTextColor (value, isDark) {
  const fallback = isDark ? '#f1f5f9' : '#0f172a'
  const raw = String(value || '').trim()
  const rgb = parseRgbColor(raw)
  if (!rgb) return raw || fallback

  const luminance = rgb.reduce((sum, channel, index) => {
    const normalized = channel / 255
    const linear = normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4)
    return sum + linear * [0.2126, 0.7152, 0.0722][index]
  }, 0)

  if ((isDark && luminance < 0.32) || (!isDark && luminance > 0.78)) return fallback
  return raw
}

export function isIndicatorLampPlot (plot) {
  if (!plot || typeof plot !== 'object') return false
  const rawType = String(plot.type || '').trim().toLowerCase()
  if (rawType === 'lamp' || plot.lamp === true) return true
  if (plot.laneLabel != null || plot.rowLabel != null || plot.laneName != null) return true

  const name = String(plot.name || plot.title || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
  const lampNamePattern = /\b(lamp|light|red|green|on|off|bullish|bearish|bull|bear|signal|state|trend)\b/
  if (!lampNamePattern.test(name)) return false

  const sample = asArray(plot.data)
    .map(plotPointValue)
    .filter(value => value != null)
    .slice(0, 80)
  if (!sample.length) return false
  const numericSample = sample.map(Number).filter(Number.isFinite)
  if (numericSample.length !== sample.length) return false
  const uniqueValues = new Set(numericSample.map(value => Number(value.toFixed(6))))
  const integerish = numericSample.every(value => Math.abs(value - Math.round(value)) < 1e-6)
  const categoricalRange = numericSample.every(value => Math.abs(value) <= 16)
  return integerish && categoricalRange && uniqueValues.size <= 8
}

function normalizeTableCell (value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      text: String(value.text ?? value.value ?? ''),
      color: value.color || value.textColor || '',
      backgroundColor: value.backgroundColor || value.fillColor || '',
      align: value.align || ''
    }
  }
  return { text: value == null ? '' : String(value), color: '', backgroundColor: '', align: '' }
}

function normalizeTable (table, index) {
  const source = table && typeof table === 'object' ? table : {}
  const rawPosition = String(source.position || 'top-right').toLowerCase().replace(/_/g, '-')
  const position = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(rawPosition)
    ? rawPosition
    : 'top-right'
  const rows = asArray(source.rows || source.data).map(row => {
    const cells = Array.isArray(row) ? row : (row && Array.isArray(row.cells) ? row.cells : [])
    return cells.map(normalizeTableCell)
  })
  return {
    id: String(source.id || `table-${index + 1}`),
    title: source.title == null ? '' : String(source.title),
    position,
    columns: asArray(source.columns || source.headers).map(normalizeTableCell),
    rows,
    compact: source.compact !== false
  }
}

export function normalizeIndicatorCloudPointValue (point, edge) {
  if (!point || typeof point !== 'object') return null
  const value = edge === 'upper'
    ? (point.upper ?? point.top ?? point.high ?? point.value ?? point.y ?? point.data)
    : (point.lower ?? point.bottom ?? point.low)
  if (value == null || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function resolveIndicatorPlotTitle (plot, fallbackName = '', forceHidden = false) {
  if (forceHidden || plot?.title === false) return undefined
  const explicitTitle = typeof plot?.title === 'string' ? plot.title.trim() : ''
  return String(explicitTitle || plot?.name || fallbackName || '')
}

export function assignIndicatorSignalLanes (signalPoints, minGap = 10, maxLanes = 4) {
  const points = asArray(signalPoints).map(point => ({ ...point, lane: 0 }))
  const ordered = points
    .map((point, order) => ({ point, order }))
    .sort((left, right) => {
      const leftIndex = Number(left.point.dataIndex)
      const rightIndex = Number(right.point.dataIndex)
      if (Number.isFinite(leftIndex) && Number.isFinite(rightIndex) && leftIndex !== rightIndex) {
        return leftIndex - rightIndex
      }
      const leftTime = Number(left.point.timestamp)
      const rightTime = Number(right.point.timestamp)
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
        return leftTime - rightTime
      }
      return left.order - right.order
    })
  const recentBySide = new Map()
  const gap = Math.max(0, Number(minGap) || 0)
  const laneCount = Math.max(1, Math.min(8, Number(maxLanes) || 4))

  ordered.forEach(({ point }) => {
    const side = String(point.side || point.type || 'buy').toLowerCase()
    const position = Number(point.dataIndex)
    if (!Number.isFinite(position)) return
    const recent = asArray(recentBySide.get(side)).filter(item => position - item.position <= gap)
    const used = new Set(recent.map(item => item.lane))
    let lane = 0
    while (lane < laneCount - 1 && used.has(lane)) lane += 1
    point.lane = lane
    recent.push({ position, lane })
    recentBySide.set(side, recent)
  })

  return points
}

export function normalizeIndicatorOutput (rawResult, internalData = []) {
  const result = rawResult && typeof rawResult === 'object' ? rawResult : {}
  const plots = [...asArray(result.plots)]
  const bars = asArray(internalData)
  const barColors = asArray(result.bar_colors || result.barColors || result.candle_colors || result.candleColors)
  const backgroundColors = asArray(result.background_colors || result.backgroundColors || result.backgrounds)

  if (barColors.length) {
    plots.push({
      name: '__host_candle_colors__',
      title: false,
      type: 'candlestick',
      overlay: true,
      skipNullColor: true,
      data: bars.map((bar, index) => {
        const style = barColors[index] && typeof barColors[index] === 'object' ? barColors[index] : {}
        const color = pointColor(barColors[index])
        return {
          open: Number(bar?.open),
          high: Number(bar?.high),
          low: Number(bar?.low),
          close: Number(bar?.close),
          color,
          fillColor: style.fillColor || color,
          borderColor: style.borderColor || color,
          wickColor: style.wickColor || color
        }
      })
    })
  }

  if (backgroundColors.length) {
    plots.unshift({
      name: '__chart_background__',
      title: false,
      type: 'background',
      overlay: true,
      opacity: 0.12,
      data: bars.map((bar, index) => ({
        value: Number(bar?.close),
        color: pointColor(backgroundColors[index])
      }))
    })
  }

  return {
    version: Number(result.version || result.schema_version || result.schemaVersion || 1),
    name: result.name ? String(result.name) : '',
    description: result.description ? String(result.description) : '',
    plots,
    signals: asArray(result.signals),
    layers: asArray(result.layers || result.drawings),
    tables: asArray(result.tables || result.panels).map((table, index) => normalizeTable(table, index)),
    calculatedVars: result.calculatedVars && typeof result.calculatedVars === 'object'
      ? result.calculatedVars
      : {}
  }
}
