export function strategyStopFeedback (response, translate, closePositions = false) {
  const data = (response && response.data) || {}
  const accepted = Boolean(response && response.code === 1)
  const closing = typeof data.close_requested === 'boolean' ? data.close_requested : closePositions
  let key = 'strategyV2.stopFailed'
  let level = 'error'
  if (accepted && data.status === 'stopping') {
    key = closing ? 'strategyV2.stopAndCloseQueued' : 'strategyV2.stopQueued'
    level = 'info'
  } else if (accepted) {
    key = closing ? 'strategyV2.stoppedAndCloseQueued' : 'strategyV2.paused'
    level = 'success'
  } else if (data.status === 'stopped' && closing) {
    key = 'strategyV2.stopClosePartialFailure'
    level = 'warning'
  }
  let message = translate(key)
  if (!accepted) {
    const details = Array.isArray(data.close_errors) ? data.close_errors : []
    const localized = details.map(reason => {
      const value = typeof reason === 'string' ? translate(reason) : ''
      return value && value !== reason ? value : ''
    }).filter(Boolean)
    if (localized.length) message += ` ${[...new Set(localized)].join(' ')}`
  }
  return { level, message }
}
