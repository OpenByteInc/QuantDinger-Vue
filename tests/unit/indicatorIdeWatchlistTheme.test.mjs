import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const componentPath = fileURLToPath(
  new URL('../../src/components/Watchlist/AddWatchlistModal.vue', import.meta.url)
)
const source = fs.readFileSync(componentPath, 'utf8')

test('logical-asset search results have complete dark theme coverage', () => {
  assert.match(source, /body\.realdark \.watchlist-asset-modal[\s\S]*?background:\s*#1b1d20/)
  assert.ok(!source.includes('initialExchange'))
  assert.ok(!source.includes('initialMarketType'))
})

test('selected add-symbol result has an explicit dark-theme override', () => {
  assert.match(
    source,
    /body\.realdark \.watchlist-asset-modal[\s\S]*?\.watchlist-result\.selected\s*\{\s*background:/
  )
})
