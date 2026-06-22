/** Backtest preset helpers shared by indicator IDE and strategy backtest UIs. */

export const PRESET_LIVE_ALIGNED = 'live_aligned'
export const PRESET_EXPLORATION = 'exploration'

/** UI stores commission/slippage as percent (0.05 = 0.05%). Backend expects ratio. */
export const PRESET_UI_VALUES = {
  [PRESET_LIVE_ALIGNED]: {
    commission: 0.05,
    slippage: 0.05
  },
  [PRESET_EXPLORATION]: {
    commission: 0.1,
    slippage: 0
  }
}

export function applyPresetToForm (preset, ctx = {}) {
  const values = PRESET_UI_VALUES[preset]
  if (!values) return {}
  return {
    commission: values.commission,
    slippage: values.slippage
  }
}

export function ratioToPercent (ratio) {
  const n = Number(ratio)
  if (!Number.isFinite(n)) return '--'
  return `${(n * 100).toFixed(4).replace(/\.?0+$/, '')}%`
}

export function mtfFallbackLabelKey (reason) {
  const map = {
    range_exceeds_high_precision: 'dashboard.indicator.backtest.executionAssumptions.fallbackRange',
    scale_rules_not_supported_in_mtf: 'dashboard.indicator.backtest.executionAssumptions.fallbackScale',
    signal_timing_not_supported_in_mtf: 'dashboard.indicator.backtest.executionAssumptions.fallbackTiming',
    no_precision_gain: 'dashboard.indicator.backtest.executionAssumptions.fallbackNoGain',
    mtf_unavailable: 'dashboard.indicator.backtest.executionAssumptions.fallbackUnavailable',
    data_unavailable: 'dashboard.indicator.backtest.executionAssumptions.fallbackData'
  }
  return map[String(reason || '').trim()] || 'dashboard.indicator.backtest.executionAssumptions.mtfFallback'
}
