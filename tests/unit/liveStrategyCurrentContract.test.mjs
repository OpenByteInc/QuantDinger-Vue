import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const editorPath = fileURLToPath(
  new URL('../../src/views/strategy-center/components/LiveStrategyEditor.vue', import.meta.url)
)
const source = fs.readFileSync(editorPath, 'utf8')

test('live strategy creation validates with the current compiler', () => {
  assert.match(source, /compileScriptSource/)
  assert.match(source, /compiledManifest/)
  assert.match(source, /hasCurrentContract/)
  assert.doesNotMatch(source, /strategyManifest\.apiVersion/)
  assert.doesNotMatch(source, /Number\(config\.api_version/)
})

test('live strategy direction is contract-driven with a legacy fallback', () => {
  assert.match(source, /manifestDirectionMode/)
  assert.match(source, /directionModeDetectedHint/)
  assert.match(source, /requiresDirectionFallback/)
  assert.match(source, /directionMode: this\.requiresDirectionMode \? this\.effectiveDirectionMode/)
  assert.doesNotMatch(source, /v-model="model\.positionSide"/)
})

test('live editor uses shared eligibility helpers for crypto portfolios (#225)', () => {
  assert.match(source, /liveTradingEligibility/)
  assert.match(source, /supportsLiveExecutionMode/)
  assert.match(source, /credentialMatchesLiveStrategy/)
  assert.doesNotMatch(source, /isPortfolioStrategy\) return this\.marketCategory === 'USStock'/)
  assert.doesNotMatch(source, /isPortfolioStrategy\) return exchange === 'alpaca'/)
})
