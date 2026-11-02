import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync(new URL('../../src/components/QuickTradePanel/CryptoLiquidityArena.vue', import.meta.url), 'utf8')
const locales = readFileSync(new URL('../../src/locales/lang/quick-trade-liquidity-arena.js', import.meta.url), 'utf8')

test('order-flow header uses compact live copy and keeps transport details in its tooltip', () => {
  assert.match(locales, /'quickTrade\.liquidityArena\.title': '订单流'/)
  assert.match(locales, /'quickTrade\.liquidityArena\.liveFeedCompact': '实时 · \{latency\} ms'/)
  assert.match(source, /:title="feedStatusText"[^\n]*><i \/><span class="qla-feed-text">\{\{ feedStatusLabel \}\}/)
  const start = source.indexOf('    feedStatusLabel () {')
  const end = source.indexOf('    pressureDelta ()', start)
  const computed = vm.runInNewContext(`({${source.slice(start, end)}})`)
  const ctx = {
    streamStatus: 'live', usingRestFallback: false, streamLatencyMs: 19,
    feedStatusText: 'detailed status',
    $t: (key, params) => `${key}:${params.latency}`
  }
  assert.equal(computed.feedStatusLabel.call(ctx), 'quickTrade.liquidityArena.liveFeedCompact:19')
  for (const status of ['connecting', 'reconnecting', 'error']) {
    assert.equal(computed.feedStatusLabel.call({ ...ctx, streamStatus: status }), 'detailed status')
  }
  assert.equal(computed.feedStatusLabel.call({ ...ctx, usingRestFallback: true }), 'detailed status')
})

test('feed status reserves fixed space and truncates long labels without shifting depth count', () => {
  assert.match(source, /\.qla-feed \{[^}]*flex: 0 0 90px;[^}]*width: 90px;[^}]*box-sizing: border-box;[^}]*white-space: nowrap;/)
  assert.match(source, /\.qla-feed-text \{[^}]*min-width: 0;[^}]*overflow: hidden;[^}]*text-overflow: ellipsis;/)
  assert.match(source, /\.qla-feed i \{[^}]*flex-shrink: 0;/)
  assert.match(source, /\.qla-feed \{[^}]*justify-content: flex-start;/)
  assert.match(source, /\.qla-feed-text \{[^}]*text-align: left;/)
})

test('order-book depth modes retain the full selected range in a resizable viewport', () => {
  assert.match(source, /displayLevelCount \(\) \{\s*return this\.requestLimit/)
  assert.match(source, /ladderViewportRows: 10/)
  assert.match(source, /Math\.max\(5, Math\.min\(this\.maxVisibleLadderRows, this\.ladderViewportRows\)\)/)
  assert.match(source, /:style="ladderViewportStyle"/)
  assert.match(source, /startLadderResize/)
  assert.match(source, /stopLadderResize/)
  assert.match(source, /qla-ladder-resizer/)
  assert.match(source, /levelsPerSideLoaded/)
})

test('switching depth mode returns the scrollable ladder to its nearest levels', () => {
  assert.match(source, /ref="ladder"/)
  assert.match(source, /this\.\$refs\.ladder\.scrollTop = 0/)
})

test('loaded-depth indicator is localized', () => {
  assert.match(locales, /'quickTrade\.liquidityArena\.levelsPerSideLoaded': '\{count\} levels per side'/)
  assert.match(locales, /'quickTrade\.liquidityArena\.levelsPerSideLoaded': '买卖各 \{count\} 档'/)
})
