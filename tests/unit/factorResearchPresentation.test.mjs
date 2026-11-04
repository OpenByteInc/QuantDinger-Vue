import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const componentPath = fileURLToPath(
  new URL('../../src/views/backtest-center/FactorResearchResult.vue', import.meta.url)
)
const source = fs.readFileSync(componentPath, 'utf8')

test('factor correlation matrix uses light surfaces by default and dark surfaces only in dark mode', () => {
  assert.match(source, /\.correlation-grid \{[^}]*border: 1px solid #e2e8f0;[^}]*background: #e2e8f0;/)
  assert.match(source, /\.correlation-head, \.correlation-corner \{ background: #f8fafc; \}/)
  assert.match(source, /\.factor-result\.theme-dark \.correlation-grid \{[^}]*background: #303030;/)
  assert.match(source, /\.factor-result\.theme-dark \.correlation-head, \.factor-result\.theme-dark \.correlation-corner \{[^}]*background: #111;/)
})

test('factor correlation cells adjust fill intensity and text contrast for the active theme', () => {
  assert.match(source, /const alpha = this\.isDark/)
  assert.match(source, /Math\.min\(0\.42, intensity \* 0\.34 \+ 0\.06\)/)
  assert.match(source, /color: this\.isDark \? '#fff' : '#1f2937'/)
})

test('factor research result presents a structured summary and themed analysis surfaces', () => {
  assert.match(source, /class="factor-summary-panel"/)
  assert.match(source, /'metric-card--featured': item\.featured/)
  assert.match(source, /class="sample-alert sample-quality-banner"/)
  assert.match(source, /class="factor-tabs factor-detail-tabs"/)
  assert.match(source, /\.factor-result\.theme-dark \{ --factor-border:/)
})

test('factor research chart gives primary series clearer visual hierarchy', () => {
  assert.match(source, /barMaxWidth: 12/)
  assert.match(source, /borderRadius: \[3, 3, 0, 0\]/)
  assert.match(source, /areaStyle: \{ opacity: this\.isDark/)
})

test('factor research presents undefined statistics without inventing zeros', () => {
  assert.match(source, /Number\(this\.result\.effectiveGroups\) < 3 \? this\.\$t\('strategyV2\.factorResearch\.notApplicable'\)/)
  assert.match(source, /value === null \|\| value === undefined \|\| value === ''\) return '—'/)
  assert.match(source, /correlationObservation\(rowIndex, columnIndex\)/)
  assert.match(source, /strategyV2\.factorResearch\.longShortConvention/)
})

test('factor research does not color exploratory IC metrics as validated evidence', () => {
  assert.match(source, /isExploratory \(\) \{ return this\.sampleDiagnostics\.quality === 'insufficient' \}/)
  assert.match(source, /tone: this\.isExploratory \? '' : this\.tone\(this\.result\.rankIc\)/)
})
