import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const componentPath = fileURLToPath(
  new URL('../../src/views/backtest-center/FactorBenchmarkResult.vue', import.meta.url)
)
const source = fs.readFileSync(componentPath, 'utf8')

test('benchmark only presents a validated or candidate factor as the leader', () => {
  assert.match(source, /\['alive', 'reversed', 'candidate'\]\.includes\(item\.classification\)/)
  assert.match(source, /strategyV2\.factorResearch\.noValidatedLeader/)
  assert.match(source, /hasLeader && row\.factorId === topFactor\.factorId/)
})

test('benchmark preserves unavailable OOS retention instead of displaying zero', () => {
  assert.match(source, /row\.oosRetention == null \? 0/)
  assert.match(source, /value === null \|\| value === undefined \|\| value === ''\) return '—'/)
})
