import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../../src/views/indicator-analysis/components/KlineChart.vue', import.meta.url), 'utf8')

test('indicator overlay groups can be removed independently from other chart overlays', () => {
  const start = source.indexOf('    const removeIndicatorOverlayGroup =')
  const end = source.indexOf('    const clearQuickTradePositionOverlays =', start)
  const removed = []
  const context = vm.createContext({
    chartRef: { value: { removeOverlay: filter => removed.push(filter) } }
  })
  vm.runInContext(`${source.slice(start, end)}\nthis.removeGroup = removeIndicatorOverlayGroup`, context)

  context.removeGroup('qd-indicator-runtime-7')
  assert.equal(removed.length, 1)
  assert.equal(removed[0].groupId, 'qd-indicator-runtime-7')
})

test('indicator changes clear the active runtime group before rendering the replacement', () => {
  const watcherStart = source.indexOf('    watch(getIndicatorConfigSignature')
  const watcherEnd = source.indexOf('    watch(() => props.quickTradePositions', watcherStart)
  const watcher = source.slice(watcherStart, watcherEnd)

  assert.match(watcher, /removeIndicatorOverlayGroup\(activeIndicatorOverlayGroupId\)/)
  assert.match(watcher, /activeIndicatorOverlayGroupId = ''/)
  assert.match(watcher, /updateIndicators\(\{ force: true \}\)/)
})

test('indicator signals and layers share a cycle-scoped runtime group', () => {
  assert.match(source, /const nextIndicatorOverlayGroupId = `qd-indicator-runtime-\$\{renderCycleId\}`/)
  assert.match(source, /groupId: renderingIndicatorOverlayGroupId \|\| overlayConfig\.groupId/)
  assert.match(source, /name: 'signalTag',[\s\S]*?groupId: renderingIndicatorOverlayGroupId \|\| undefined/)
  assert.match(source, /removeIndicatorOverlayGroup\(previousIndicatorOverlayGroupId\)/)
  assert.match(source, /activeIndicatorOverlayGroupId = nextIndicatorOverlayGroupId/)
})
