import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(
  new URL('../../src/views/indicator-community/components/AuthorDashboard.vue', import.meta.url),
  'utf8'
)

test('author published list exposes search, filters, sorting, and timestamps', () => {
  assert.match(source, /authorDashboard\.searchPlaceholder/)
  assert.match(source, /v-model="publishedFilters\.assetType"/)
  assert.match(source, /v-model="publishedFilters\.reviewStatus"/)
  assert.match(source, /v-model="publishedFilters\.sort"/)
  assert.match(source, /customRender: 'publishedAt'/)
  assert.match(source, /customRender: 'updatedAt'/)
})

test('author published requests default to recently updated server ordering', () => {
  assert.match(source, /sort: 'updated_desc'/)
  assert.match(source, /updated_desc: \['updated_at', 'desc'\]/)
  assert.match(source, /keyword: this\.publishedFilters\.keyword\.trim\(\) \|\| undefined/)
  assert.match(source, /asset_type: this\.publishedFilters\.assetType \|\| undefined/)
  assert.match(source, /review_status: this\.publishedFilters\.reviewStatus \|\| undefined/)
  assert.match(source, /sort_by: selectedSort\[0\]/)
  assert.match(source, /sort_order: selectedSort\[1\]/)
})
