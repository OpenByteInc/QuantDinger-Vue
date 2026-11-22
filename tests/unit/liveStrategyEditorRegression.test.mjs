import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import less from 'less'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

test('live strategy full-row controls survive Less division parsing', async () => {
  const filename = path.join(root, 'src/views/strategy-center/components/LiveStrategyEditor.vue')
  const source = fs.readFileSync(filename, 'utf8')
  const style = source.match(/<style lang="less">([\s\S]*?)<\/style>/)?.[1]

  assert.ok(style)
  const { css } = await less.render(style, { filename })
  assert.match(css, /\.strategy-runtime-field--exchange\s*\{[^}]*grid-column:\s*1 \/ -1;/)
  assert.match(css, /\.leverage-risk-alert\s*\{[^}]*grid-column:\s*1 \/ -1;/)
})

test('trade record refreshes explicitly handle rejected promises', () => {
  const filename = path.join(root, 'src/views/strategy-center/components/TradingRecords.vue')
  const source = fs.readFileSync(filename, 'utf8')
  const calls = [...source.matchAll(/^.*this\.loadRecords\(\).*$/gm)].map(match => match[0])

  assert.ok(calls.length > 0)
  assert.ok(calls.every(line => line.includes('this.loadRecords().catch(() => null)')))
})
