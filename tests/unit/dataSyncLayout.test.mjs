import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = name => fs.readFileSync(new URL(`../../src/views/settings/${name}`, import.meta.url), 'utf8')
const fundamentals = read('FundamentalSyncPanel.vue')
const settings = read('index.vue')
const styles = read('data-sync.less')

test('missing fields stay compact without losing access to any field', () => {
  assert.match(fundamentals, /fieldLabel\(values\[0\]\)/)
  assert.match(fundamentals, /values\.length - 1/)
  assert.match(fundamentals, /:trigger="\['hover', 'focus', 'click'\]"/)
  assert.match(fundamentals, /<button type="button" class="fundamental-missing-summary"/)
  assert.match(fundamentals, /v-for="field in values"/)
  assert.match(fundamentals, /:aria-label="values\.map\(fieldLabel\)\.join/)
  assert.match(fundamentals, /text-overflow: ellipsis/)
})

test('universe rows share a table header and preserve management actions', () => {
  assert.match(settings, /<table class="catalog-table universe-table">/)
  for (const action of ['openSystemUniverseEdit(item)', 'toggleSystemUniverseVisibility(item)', 'removeSystemUniverse(item)']) {
    assert.ok(settings.includes(action))
  }
  assert.match(settings, /v-model="selectedUniverseCodes"/)
  assert.match(settings, /:disabled="item.status === 'hidden'"/)
  assert.match(styles, /\.universe-sync-list[^\n]*overflow-x: auto/)
  assert.match(settings, /:title="item.source_version \|\| universeSnapshotDate\(item\)"/)
})

test('all tabs share isolated theme-aware spacing and compact tables', () => {
  assert.match(settings, /'data-sync-panel': activeGroupKey === 'market_catalog'/)
  assert.match(settings, /@import '\.\/data-sync.less'/)
  assert.match(styles, /\.settings-page\.theme-dark \.data-sync-panel/)
  assert.match(styles, /@container data-sync/)
  assert.match(read('InstrumentCatalog.vue'), /size="small"/)
  assert.match(read('InstrumentCatalog.vue'), /ellipsis: true/)
})

test('failure details retain the full original error on demand', () => {
  assert.match(settings, /<details class="catalog-error-detail">/)
  assert.match(settings, /<p>\{\{ item.error \}\}<\/p>/)
})

test('fundamental setup groups controls and retains explanations on demand', () => {
  for (const group of ['fundamental-controls', 'fundamental-preferences', 'fundamental-footer']) {
    assert.ok(fundamentals.includes(`class="${group}"`))
  }
  for (const key of ['dateNotice', 'collectionNotice', 'incrementalNotice', 'workerNotice']) {
    assert.ok(fundamentals.includes(`fundamentalSync.${key}`))
  }
  assert.ok(!fundamentals.includes('class="fundamental-collection-note"'))
  assert.match(fundamentals, /@click="selectAllFields"/)
  assert.match(fundamentals, /v-model="forceFull"/)
  assert.match(fundamentals, /@change="scheduleChanged"/)
})

test('instrument market selector has one theme-aware frame without inner seams', () => {
  assert.match(read('InstrumentCatalog.vue'), /class="instrument-market-switch"/)
  assert.match(styles, /\.instrument-market-switch[\s\S]*background: var\(--sync-surface\)/)
  assert.match(styles, /&::before \{ display: none !important; \}/)
  assert.match(styles, /&:focus-within/)
})
