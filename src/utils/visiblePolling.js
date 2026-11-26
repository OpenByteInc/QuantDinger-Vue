export function startVisiblePolling (refresh, { interval = 15000, enabled = () => true, page = document, schedule = setTimeout, cancel = clearTimeout } = {}) {
  let stopped = false
  let running = false
  let timer
  async function tick () {
    timer = undefined
    if (stopped || running) return
    running = true
    try { if (!page.hidden && enabled()) await refresh() } catch (_) {
      // The owning view reports read failures and retains its last snapshot.
    } finally {
      running = false
      if (!stopped) timer = schedule(tick, interval)
    }
  }
  function resume () {
    if (page.hidden || stopped || running) return
    cancel(timer)
    return tick()
  }
  page.addEventListener('visibilitychange', resume)
  timer = schedule(tick, interval)
  return () => { stopped = true; cancel(timer); page.removeEventListener('visibilitychange', resume) }
}
