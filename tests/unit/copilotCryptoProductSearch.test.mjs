import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(
  new URL('../../src/views/ai-analysis/components/CopilotWorkbench.vue', import.meta.url),
  'utf8'
)

test('crypto watchlist search distinguishes spot and perpetual products', () => {
  assert.match(source, /cryptoProductLabel\(item\)/)
  assert.match(source, /item\.product_type \|\| item\.productType/)
  assert.match(source, /marketContext\.product\.\$\{productType\}/)
  assert.match(source, /marketContext\.\$\{marketType === 'swap' \? 'swap' : 'spot'\}/)
})
