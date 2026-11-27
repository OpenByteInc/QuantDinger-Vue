const DETAIL_KEYS = Object.freeze({
  binance_one_way_mode: 'strategyV2.positionModeDetail.binanceOneWay',
  binance_hedge_mode: 'strategyV2.positionModeDetail.hedgeMode',
  bitget_hedge_mode: 'strategyV2.positionModeDetail.hedgeMode',
  okx_long_short_mode: 'strategyV2.positionModeDetail.hedgeMode',
  gate_dual_mode: 'strategyV2.positionModeDetail.hedgeMode',
  bybit_hedge_mode: 'strategyV2.positionModeDetail.hedgeMode'
})

export function translateStrategyRuntimeError (message, translate) {
  const raw = String(message || '').trim()
  const match = raw.match(/^((?:strategyV2|strategyRuntime|brokerAccounts)\.[\w.]+)(?::(.*))?$/s)
  if (!match) return raw

  const [, key, rawDetail = ''] = match
  const localized = String(translate(key) || '')
  if (!localized || localized === key) return raw

  const detail = rawDetail.trim()
  if (!detail) return localized

  const detailKey = DETAIL_KEYS[detail]
  const localizedDetail = detailKey ? String(translate(detailKey) || '') : ''
  return localizedDetail && localizedDetail !== detailKey
    ? `${localized} ${localizedDetail}`
    : `${localized} (${detail})`
}
