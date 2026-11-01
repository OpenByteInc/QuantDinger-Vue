import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../src/components/QuickTradePanel/CryptoLiquidityArena.vue', import.meta.url), 'utf8')
const locales = readFileSync(new URL('../../src/locales/lang/quick-trade-liquidity-arena.js', import.meta.url), 'utf8')

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
