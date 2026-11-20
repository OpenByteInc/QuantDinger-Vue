import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { extractIndicatorMetadataString } from '../../src/utils/indicatorMetadata.js'

test('extracts single-line indicator metadata', () => {
  const code = [
    'my_indicator_name = "QuantDinger Adaptive SuperTrend"',
    'my_indicator_description = "Adaptive ATR trend overlay."'
  ].join('\n')

  assert.equal(extractIndicatorMetadataString(code, 'my_indicator_name'), 'QuantDinger Adaptive SuperTrend')
  assert.equal(extractIndicatorMetadataString(code, 'my_indicator_description'), 'Adaptive ATR trend overlay.')
})

test('joins parenthesized Python string literals', () => {
  const code = `my_indicator_description = (
    "QuantDinger implementation of an adaptive ATR trend overlay with "
    "selectable Wilder/SMA volatility modes, recursive trailing bands, "
    "trend-flip markers, and directional highlight clouds."
)`

  assert.equal(
    extractIndicatorMetadataString(code, 'my_indicator_description'),
    'QuantDinger implementation of an adaptive ATR trend overlay with selectable Wilder/SMA volatility modes, recursive trailing bands, trend-flip markers, and directional highlight clouds.'
  )
})

test('supports comments, triple quotes, and escaped content without executing code', () => {
  const code = `
# my_indicator_description = "Ignore this comment"
my_indicator_description = (
    "First line\\n"  # Python implicitly concatenates these strings.
    '''Second line'''
)
danger = run_arbitrary_code()
`

  assert.equal(extractIndicatorMetadataString(code, 'my_indicator_description'), 'First line\nSecond line')
  assert.equal(extractIndicatorMetadataString('my_indicator_description = build_description()', 'my_indicator_description'), '')
})

test('indicator IDE uses code metadata as the description fallback', () => {
  const source = readFileSync(new URL('../../src/views/indicator-ide/index.vue', import.meta.url), 'utf8')

  assert.match(source, /resolveIndicatorDescriptionForSave \(indicator, code\)/)
  assert.match(source, /this\.publishDescription = description/)
  assert.match(source, /description: nextDescription/)
})
