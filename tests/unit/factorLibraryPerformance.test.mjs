import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const factorLibraryPath = fileURLToPath(
  new URL('../../src/views/strategy-ide/FactorLibraryModal.vue', import.meta.url)
)
const factorLibrarySource = fs.readFileSync(factorLibraryPath, 'utf8')

test('factor library renders a virtual window instead of the full catalog', () => {
  assert.match(factorLibrarySource, /v-for="factor in virtualFactors"/)
  assert.match(factorLibrarySource, /virtualFactors \(\) \{[\s\S]*?this\.filteredFactors\.slice/)
  assert.doesNotMatch(factorLibrarySource, /v-for="factor in filteredFactors"/)
})

test('factor cards reserve enough height for metadata and keep virtual rows aligned', () => {
  assert.match(factorLibrarySource, /factorRowHeight: 84/)
  assert.match(factorLibrarySource, /\.factor-card \{[\s\S]*?display: flex;[\s\S]*?height: 80px;/)
  assert.match(factorLibrarySource, /\.factor-card__meta \{[\s\S]*?margin-top: auto;/)
})

test('factor catalog metadata is reused without a duplicate detail request', () => {
  assert.doesNotMatch(factorLibrarySource, /getFactorDetail/)
  assert.match(
    factorLibrarySource,
    /selectFactor \(factor\) \{[\s\S]*?this\.selectedFactor = factor[\s\S]*?this\.resetParameters\(factor\)/
  )
})

test('factor catalog preloads during an idle browser period', () => {
  assert.match(factorLibrarySource, /mounted \(\) \{[\s\S]*?this\.schedulePreload\(\)/)
  assert.match(factorLibrarySource, /window\.requestIdleCallback\(preload, \{ timeout: 1200 \}\)/)
})

test('factor library throttles scroll rendering and caches searchable labels', () => {
  assert.match(factorLibrarySource, /window\.requestAnimationFrame\(\(\) => \{/)
  assert.match(factorLibrarySource, /this\.rawFactors\.map\(this\.prepareFactor\)/)
  assert.match(factorLibrarySource, /return factor\._searchText\.includes\(query\)/)
})

test('factor metadata is relocalized when the application language changes', () => {
  assert.match(factorLibrarySource, /rawFactors: \[\]/)
  assert.match(factorLibrarySource, /'\$i18n\.locale' \(\) \{[\s\S]*?this\.relocalizeFactors\(\)/)
  assert.match(factorLibrarySource, /relocalizeFactors \(\) \{[\s\S]*?this\.rawFactors\.map\(this\.prepareFactor\)/)
  assert.match(factorLibrarySource, /factorLibrary\.qlibFeatureDescription/)
  assert.match(factorLibrarySource, /factorLibrary\.talibFeatureDescription/)
  assert.match(factorLibrarySource, /factorFieldLabel/)
  assert.match(factorLibrarySource, /sentenceStart/)
})

test('factor detail separates model features from strategy signals', () => {
  assert.match(factorLibrarySource, /value: 'alpha158'/)
  assert.match(factorLibrarySource, /value: 'alpha360'/)
  assert.match(factorLibrarySource, /factorLibrary\.whatItMeasures/)
  assert.match(factorLibrarySource, /factorLibrary\.howToUse/)
  assert.match(factorLibrarySource, /factorLibrary\.watchOut/)
  assert.match(factorLibrarySource, /selectedFactor\.expression/)
})

test('factor filters use visible chips and compact themed scrollbars', () => {
  assert.match(factorLibrarySource, /factor-library-filter-chip--active/)
  assert.match(factorLibrarySource, /familyCounts\[option\.value\]/)
  assert.match(factorLibrarySource, /--factor-library-accent: var\(--primary-color, #1890ff\)/)
  assert.match(factorLibrarySource, /factor-library-filter-chip--active \{[\s\S]*?border-color: color-mix\(in srgb, var\(--factor-library-accent\)/)
  assert.match(factorLibrarySource, /factor-library-modal--dark \{[\s\S]*?factor-library-notice \{[\s\S]*?background: color-mix\(in srgb, var\(--factor-library-accent\)/)
  assert.doesNotMatch(factorLibrarySource, /rgba\(250, 84, 28, 0\.24\)/)
  assert.match(factorLibrarySource, /scrollbar-width: thin/)
  assert.doesNotMatch(factorLibrarySource, /class="factor-library-family-select"/)
  assert.doesNotMatch(factorLibrarySource, /class="factor-library-scope-select"/)
})

test('dark factor details use dark surfaces and parameter names stay horizontal', () => {
  assert.match(
    factorLibrarySource,
    /factor-library-modal--dark \{[\s\S]*?\.factor-library-tools,[\s\S]*?\.factor-detail__heading,[\s\S]*?\.factor-detail__section \{[\s\S]*?background: #1b1b1b;/
  )
  assert.match(factorLibrarySource, /\.factor-param-grid \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/)
  assert.match(
    factorLibrarySource,
    /\.factor-param-grid > div \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 126px;/
  )
  assert.match(factorLibrarySource, /\.factor-param-grid code \{[\s\S]*?white-space: nowrap;/)
})

test('custom factor editor keeps every nested surface readable in dark mode', () => {
  assert.match(
    factorLibrarySource,
    /custom-factor-modal--dark \{[\s\S]*?\.custom-factor-form,[\s\S]*?\.custom-factor-ai,[\s\S]*?\.custom-factor-example,[\s\S]*?\.custom-factor-rule \{[\s\S]*?background: #1b1b1b;/
  )
  assert.match(
    factorLibrarySource,
    /custom-factor-modal--dark \{[\s\S]*?\.custom-factor-tabs \.ant-tabs-nav \.ant-tabs-tab-active \{[\s\S]*?background: #2a2a2a;/
  )
  assert.match(
    factorLibrarySource,
    /custom-factor-form__direction \.ant-radio-button-wrapper-checked:not\(\.ant-radio-button-wrapper-disabled\)[\s\S]*?background: var\(--primary-color/
  )
  assert.match(
    factorLibrarySource,
    /custom-factor-rule[\s\S]*?summary > \.anticon:first-child \{ color: var\(--primary-color, #52c41a\);/
  )
})
