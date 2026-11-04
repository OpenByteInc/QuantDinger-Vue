import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const settingsPath = fileURLToPath(
  new URL('../../src/views/settings/index.vue', import.meta.url)
)
const source = fs.readFileSync(settingsPath, 'utf8')

test('market catalog separates venue products by executable contract', () => {
  for (const key of ['ordinarySpot', 'tokenizedEquity', 'directEquity', 'stockPerpetual']) {
    assert.match(source, new RegExp(`settings\\.marketCatalog\\.${key}`))
    assert.match(source, new RegExp(`venue\\.${key}`))
  }
  assert.match(source, /row\.ordinary_spot/)
  assert.match(source, /row\.ordinary_swap/)
  assert.match(source, /venue\.ordinarySwap/)
  assert.match(source, /row\.tokenized_equity/)
  assert.match(source, /row\.direct_equity/)
  assert.match(source, /row\.stock_perpetual/)
})
