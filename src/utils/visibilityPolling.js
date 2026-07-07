export function createVisibilityPolling (task, intervalMs, options = {}) {
  const delay = Math.max(1000, Number(intervalMs || 1000))
  const immediate = options.immediate !== false
  const runWhenHidden = options.runWhenHidden === true
  const immediateOnVisible = options.immediateOnVisible !== false

  let timer = null
  let stopped = true
  let running = false
  let listening = false

  const isHidden = () => {
    return typeof document !== 'undefined' && document.hidden
  }

  const clear = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  const tick = () => {
    if (stopped || running) return
    if (!runWhenHidden && isHidden()) return
    running = true
    Promise.resolve()
      .then(task)
      .catch(() => {})
      .finally(() => {
        running = false
      })
  }

  const schedule = () => {
    clear()
    if (!runWhenHidden && isHidden()) return
    timer = setInterval(tick, delay)
  }

  const handleVisibility = () => {
    if (stopped) return
    if (!runWhenHidden && isHidden()) {
      clear()
      return
    }
    schedule()
    if (immediateOnVisible) tick()
  }

  return {
    start () {
      if (!stopped) return
      stopped = false
      if (typeof document !== 'undefined' && !listening) {
        document.addEventListener('visibilitychange', handleVisibility)
        listening = true
      }
      schedule()
      if (immediate) tick()
    },
    stop () {
      stopped = true
      clear()
      if (typeof document !== 'undefined' && listening) {
        document.removeEventListener('visibilitychange', handleVisibility)
        listening = false
      }
    },
    tick
  }
}
