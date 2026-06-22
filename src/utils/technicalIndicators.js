
export function calculateSMA (data, length) {
  const result = []
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      result.push(null)
    } else {
      let sum = 0
      for (let j = i - length + 1; j <= i; j++) {
        sum += data[j].close
      }
      result.push(sum / length)
    }
  }
  return result
}

/** EMA with SMA seed (first valid at index length-1). */
export function calculateEMA (data, length) {
  const result = []
  const k = 2 / (length + 1)
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      result.push(null)
    } else if (i === length - 1) {
      let sum = 0
      for (let j = 0; j < length; j++) {
        sum += data[j].close
      }
      result.push(sum / length)
    } else {
      const prev = result[i - 1]
      result.push((data[i].close - prev) * k + prev)
    }
  }
  return result
}

export function calculateBollingerBands (data, length, mult) {
  const sma = []
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      sma.push(null)
    } else {
      let sum = 0
      for (let j = i - length + 1; j <= i; j++) {
        sum += data[j].close
      }
      sma.push(sum / length)
    }
  }

  const result = []
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      result.push({ upper: null, middle: null, lower: null })
      continue
    }
    let sumSq = 0
    for (let j = i - length + 1; j <= i; j++) {
      sumSq += Math.pow(data[j].close - sma[i], 2)
    }
    const std = Math.sqrt(sumSq / length)
    result.push({
      upper: sma[i] + mult * std,
      middle: sma[i],
      lower: sma[i] - mult * std
    })
  }
  return result
}

/** Wilder RSI — first value at bar index `length`. */
export function calculateRSI (data, length) {
  const result = []
  let avgGain = 0
  let avgLoss = 0

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(null)
      continue
    }

    const change = data[i].close - data[i - 1].close
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    if (i < length) {
      result.push(null)
    } else if (i === length) {
      let sumGain = 0
      let sumLoss = 0
      for (let j = 1; j <= length; j++) {
        const chg = data[j].close - data[j - 1].close
        if (chg > 0) sumGain += chg
        else sumLoss += Math.abs(chg)
      }
      avgGain = sumGain / length
      avgLoss = sumLoss / length
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      result.push(100 - (100 / (1 + rs)))
    } else {
      avgGain = (avgGain * (length - 1) + gain) / length
      avgLoss = (avgLoss * (length - 1) + loss) / length
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      result.push(100 - (100 / (1 + rs)))
    }
  }
  return result
}

export function calculateMACD (data, fast, slow, signal) {
  const fastEMA = calculateEMA(data, fast)
  const slowEMA = calculateEMA(data, slow)
  const macdLine = []

  for (let i = 0; i < data.length; i++) {
    if (fastEMA[i] == null || slowEMA[i] == null) {
      macdLine.push(null)
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i])
    }
  }

  const signalLine = []
  const histogram = []
  const k = 2 / (signal + 1)

  let signalStartIdx = -1
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null && signalStartIdx === -1) {
      signalStartIdx = i
      break
    }
  }

  if (signalStartIdx < 0) {
    for (let i = 0; i < macdLine.length; i++) {
      signalLine.push(null)
      histogram.push(null)
    }
    return { macd: macdLine, signal: signalLine, histogram }
  }

  let signalEma = null
  for (let i = 0; i < macdLine.length; i++) {
    if (i < signalStartIdx + signal - 1 || macdLine[i] == null) {
      signalLine.push(null)
      histogram.push(null)
    } else if (i === signalStartIdx + signal - 1) {
      let sum = 0
      let count = 0
      for (let j = signalStartIdx; j <= i; j++) {
        if (macdLine[j] != null) {
          sum += macdLine[j]
          count++
        }
      }
      signalEma = sum / count
      signalLine.push(signalEma)
      histogram.push(macdLine[i] - signalEma)
    } else {
      signalEma = (macdLine[i] - signalEma) * k + signalEma
      signalLine.push(signalEma)
      histogram.push(macdLine[i] - signalEma)
    }
  }

  return { macd: macdLine, signal: signalLine, histogram }
}

/** Wilder ATR(period). */
export function calculateATR (data, period) {
  const tr = []
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low)
    } else {
      const hl = data[i].high - data[i].low
      const hc = Math.abs(data[i].high - data[i - 1].close)
      const lc = Math.abs(data[i].low - data[i - 1].close)
      tr.push(Math.max(hl, hc, lc))
    }
  }

  const atr = []
  if (data.length < period) {
    return data.map(() => null)
  }

  let atrVal = 0
  for (let j = 0; j < period; j++) {
    atrVal += tr[j]
  }
  atrVal /= period

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      atr.push(null)
    } else if (i === period - 1) {
      atr.push(atrVal)
    } else {
      atrVal = (atrVal * (period - 1) + tr[i]) / period
      atr.push(atrVal)
    }
  }
  return atr
}

export function calculateCCI (data, length) {
  const cci = []
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      cci.push(null)
    } else {
      const tp = []
      for (let j = i - length + 1; j <= i; j++) {
        tp.push((data[j].high + data[j].low + data[j].close) / 3)
      }
      const sma = tp.reduce((sum, val) => sum + val, 0) / length
      const meanDev = tp.reduce((sum, val) => sum + Math.abs(val - sma), 0) / length
      const currentTP = (data[i].high + data[i].low + data[i].close) / 3
      cci.push(meanDev === 0 ? 0 : (currentTP - sma) / (0.015 * meanDev))
    }
  }
  return cci
}

export function calculateWilliamsR (data, length) {
  const williamsR = []
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      williamsR.push(null)
    } else {
      let highest = -Infinity
      let lowest = Infinity
      for (let j = i - length + 1; j <= i; j++) {
        highest = Math.max(highest, data[j].high)
        lowest = Math.min(lowest, data[j].low)
      }
      const wr = (highest - lowest) === 0
        ? -50
        : ((highest - data[i].close) / (highest - lowest)) * -100
      williamsR.push(wr)
    }
  }
  return williamsR
}

export function calculateMFI (data, length) {
  const mfi = []
  for (let i = 0; i < data.length; i++) {
    if (i < length) {
      mfi.push(null)
    } else {
      let positiveFlow = 0
      let negativeFlow = 0
      for (let j = i - length + 1; j <= i; j++) {
        const typicalPrice = (data[j].high + data[j].low + data[j].close) / 3
        const rawMoneyFlow = typicalPrice * (data[j].volume || 0)
        if (j > i - length + 1) {
          const prevTypicalPrice = (data[j - 1].high + data[j - 1].low + data[j - 1].close) / 3
          if (typicalPrice > prevTypicalPrice) {
            positiveFlow += rawMoneyFlow
          } else if (typicalPrice < prevTypicalPrice) {
            negativeFlow += rawMoneyFlow
          }
        }
      }
      const moneyFlowRatio = negativeFlow === 0 ? 100 : positiveFlow / negativeFlow
      mfi.push(100 - (100 / (1 + moneyFlowRatio)))
    }
  }
  return mfi
}

export function calculateADX (data, length) {
  const plusDI = []
  const minusDI = []
  const adx = []
  const tr = []
  const plusDM = []
  const minusDM = []

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low)
      plusDM.push(0)
      minusDM.push(0)
    } else {
      const hl = data[i].high - data[i].low
      const hc = Math.abs(data[i].high - data[i - 1].close)
      const lc = Math.abs(data[i].low - data[i - 1].close)
      tr.push(Math.max(hl, hc, lc))
      const upMove = data[i].high - data[i - 1].high
      const downMove = data[i - 1].low - data[i].low
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0)
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0)
    }
  }

  const smoothTR = []
  const smoothPlusDM = []
  const smoothMinusDM = []

  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      smoothTR.push(null)
      smoothPlusDM.push(null)
      smoothMinusDM.push(null)
      plusDI.push(null)
      minusDI.push(null)
      adx.push(null)
    } else if (i === length - 1) {
      let sumTR = 0
      let sumPlusDM = 0
      let sumMinusDM = 0
      for (let j = 0; j <= i; j++) {
        sumTR += tr[j]
        sumPlusDM += plusDM[j]
        sumMinusDM += minusDM[j]
      }
      smoothTR.push(sumTR)
      smoothPlusDM.push(sumPlusDM)
      smoothMinusDM.push(sumMinusDM)
    } else {
      smoothTR.push(smoothTR[i - 1] - (smoothTR[i - 1] / length) + tr[i])
      smoothPlusDM.push(smoothPlusDM[i - 1] - (smoothPlusDM[i - 1] / length) + plusDM[i])
      smoothMinusDM.push(smoothMinusDM[i - 1] - (smoothMinusDM[i - 1] / length) + minusDM[i])
    }

    if (i >= length - 1) {
      const trVal = smoothTR[i]
      const plusDMVal = smoothPlusDM[i]
      const minusDMVal = smoothMinusDM[i]
      if (trVal === 0) {
        plusDI.push(0)
        minusDI.push(0)
      } else {
        plusDI.push((plusDMVal / trVal) * 100)
        minusDI.push((minusDMVal / trVal) * 100)
      }
      const diSum = plusDI[i] + minusDI[i]
      const dx = diSum === 0 ? 0 : (Math.abs(plusDI[i] - minusDI[i]) / diSum) * 100
      if (i === length - 1) {
        adx.push(dx)
      } else if (i === length) {
        const prevDX = Math.abs(plusDI[i - 1] - minusDI[i - 1]) /
          (plusDI[i - 1] + minusDI[i - 1]) * 100
        adx.push((prevDX + dx) / 2)
      } else {
        adx.push((adx[i - 1] * (length - 1) + dx) / length)
      }
    }
  }

  return { adx, plusDI, minusDI }
}

export function calculateOBV (data) {
  const obv = []
  let obvValue = 0
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      obvValue = data[i].volume || 0
    } else {
      if (data[i].close > data[i - 1].close) {
        obvValue += data[i].volume || 0
      } else if (data[i].close < data[i - 1].close) {
        obvValue -= data[i].volume || 0
      }
    }
    obv.push(obvValue)
  }
  return obv
}

export function calculateAD (data) {
  const ad = []
  let adValue = 0
  for (let i = 0; i < data.length; i++) {
    const { high, low, close, volume } = data[i]
    if (high !== low) {
      const clv = ((close - low) - (high - close)) / (high - low)
      adValue += clv * (volume || 0)
    }
    ad.push(adValue)
  }
  return ad
}

export function calculateADOSC (data, fast, slow) {
  const ad = calculateAD(data)
  const adAsBars = ad.map(v => ({ close: v }))
  const fastEMA = calculateEMA(adAsBars, fast)
  const slowEMA = calculateEMA(adAsBars, slow)
  const adosc = []
  for (let i = 0; i < ad.length; i++) {
    if (fastEMA[i] == null || slowEMA[i] == null) {
      adosc.push(null)
    } else {
      adosc.push(fastEMA[i] - slowEMA[i])
    }
  }
  return adosc
}

/** KDJ(9,3,3) — K/D seed 50 (CN terminal style). */
export function calculateKDJ (data, period, kPeriod, dPeriod) {
  const kValues = []
  const dValues = []
  const jValues = []
  let kPrev = 50
  let dPrev = 50

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      kValues.push(null)
      dValues.push(null)
      jValues.push(null)
      continue
    }

    let highest = -Infinity
    let lowest = Infinity
    for (let j = i - period + 1; j <= i; j++) {
      highest = Math.max(highest, data[j].high)
      lowest = Math.min(lowest, data[j].low)
    }

    const rsv = (highest - lowest) === 0
      ? 50
      : ((data[i].close - lowest) / (highest - lowest)) * 100

    kPrev = ((kPeriod - 1) * kPrev + rsv) / kPeriod
    dPrev = ((dPeriod - 1) * dPrev + kPrev) / dPeriod
    kValues.push(kPrev)
    dValues.push(dPrev)
    jValues.push(3 * kPrev - 2 * dPrev)
  }

  return { k: kValues, d: dValues, j: jValues }
}
