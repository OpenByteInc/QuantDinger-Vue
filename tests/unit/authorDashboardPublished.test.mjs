import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = fs.readFileSync(
  new URL('../../src/views/indicator-community/components/AuthorDashboard.vue', import.meta.url),
  'utf8'
)

function dashboard (request) {
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*$/gm, '')
    .replace('export default', 'result =')
  const scope = { request, console: { error () {} } }
  vm.runInNewContext(script, scope)
  const instance = scope.result.data()
  for (const [name, fn] of Object.entries(scope.result.methods)) instance[name] = fn.bind(instance)
  return instance
}

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

test('published list events return the request promise and preserve pagination', async () => {
  for (const [method, args, page] of [
    ['onPublishedTableChange', [{ current: 3 }], 3],
    ['applyPublishedFilters', [], 1],
    ['onPublishedKeywordChange', [{ target: { value: '' } }], 1],
    ['resetPublishedFilters', [], 1]
  ]) {
    const instance = dashboard(() => {})
    const pending = Promise.resolve()
    let requestedPage
    instance.loadPublished = value => { requestedPage = value; return pending }
    assert.equal(instance[method](...args), pending, method)
    assert.equal(requestedPage, page, method)
    await pending
  }
})

test('published filter requests settle failures and release loading state', async () => {
  const instance = dashboard(async () => { throw new Error('offline') })
  const pending = instance.applyPublishedFilters()
  assert.equal(instance.publishedLoading, true)
  await assert.doesNotReject(pending)
  assert.equal(instance.publishedError, true)
  assert.equal(instance.publishedLoading, false)
})

test('typing a nonempty keyword waits for explicit search', () => {
  const instance = dashboard(() => { throw new Error('must not request while typing') })
  assert.equal(instance.onPublishedKeywordChange({ target: { value: 'trend' } }), undefined)
  assert.equal(instance.publishedLoading, false)
})
