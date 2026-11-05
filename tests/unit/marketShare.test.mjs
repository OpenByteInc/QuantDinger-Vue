import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import marketShareMessages from '../../src/locales/market-share-overrides.js'
import {
  buildListingShareUrl,
  buildPlatformShareUrl,
  safeShareFilename
} from '../../src/utils/marketShare.mjs'

const detailSource = readFileSync(
  new URL('../../src/views/indicator-community/components/IndicatorDetail.vue', import.meta.url),
  'utf8'
)
const shareModalSource = readFileSync(
  new URL('../../src/views/indicator-community/components/MarketShareModal.vue', import.meta.url),
  'utf8'
)

test('indicator and strategy detail share one localized share workflow', () => {
  assert.match(detailSource, /<market-share-modal/)
  assert.match(detailSource, /community\.share\.action/)
  assert.match(shareModalSource, /previewImage/)
  assert.match(shareModalSource, /performance\.equity_curve/)
  assert.match(shareModalSource, /drawEquityPlaceholder/)
  assert.match(shareModalSource, /metricTone/)
  assert.match(shareModalSource, /palette\.gain/)
  assert.match(shareModalSource, /palette\.loss/)
  assert.match(shareModalSource, /share-draft/)
  assert.match(shareModalSource, /requestedLocale = this\.\$i18n\.locale/)
  assert.match(shareModalSource, /result\.draft\.locale/)
  assert.match(shareModalSource, /shareAccentColor/)
  assert.match(shareModalSource, /shareMode === 'post'/)
  assert.match(shareModalSource, /openLinkPlatform/)
  assert.doesNotMatch(shareModalSource, /image generation|generateImage/i)
})

test('share workflow copy is complete in every supported locale', () => {
  const englishKeys = Object.keys(marketShareMessages['en-US']).sort()
  assert.equal(Object.keys(marketShareMessages).length, 11)
  Object.entries(marketShareMessages).forEach(([locale, messages]) => {
    assert.deepEqual(Object.keys(messages).sort(), englishKeys, `${locale} should match English share keys`)
  })
})

test('listing links preserve the current route and add a deep link', () => {
  const result = buildListingShareUrl({
    locationHref: 'https://example.com/#/market?tab=featured',
    listingId: 42,
    assetType: 'script_template'
  })
  const url = new URL(result)
  const route = new URL(url.hash.slice(1), url.origin)
  assert.equal(route.searchParams.get('listing'), '42')
  assert.equal(route.searchParams.get('asset_type'), 'script_template')
  assert.equal(route.searchParams.get('tab'), 'featured')
})

test('X share target includes both prepared copy and the listing URL', () => {
  const result = buildPlatformShareUrl('x', {
    text: 'A concise market note',
    url: 'https://example.com/listing/42'
  })
  const url = new URL(result)
  assert.match(url.hostname, /twitter\.com$/)
  assert.equal(url.searchParams.get('text'), 'A concise market note\n\nhttps://example.com/listing/42')
})

test('X share target does not duplicate a URL already present in the draft', () => {
  const listingUrl = 'https://example.com/listing/42'
  const result = buildPlatformShareUrl('x', {
    text: `A concise market note\n${listingUrl}`,
    url: listingUrl
  })
  const text = new URL(result).searchParams.get('text')
  assert.equal(text.match(/https:\/\/example\.com\/listing\/42/g).length, 1)
})

test('link-only X sharing contains no generated post copy', () => {
  const listingUrl = 'https://example.com/listing/42'
  const result = buildPlatformShareUrl('x', { text: '', url: listingUrl })
  assert.equal(new URL(result).searchParams.get('text'), listingUrl)
})

test('Reddit share target carries title and URL', () => {
  const result = buildPlatformShareUrl('reddit', {
    title: 'Momentum indicator',
    url: 'https://example.com/listing/7'
  })
  const url = new URL(result)
  assert.equal(url.searchParams.get('title'), 'Momentum indicator')
  assert.equal(url.searchParams.get('url'), 'https://example.com/listing/7')
})

test('share image filenames remain portable', () => {
  assert.equal(safeShareFilename(' Momentum / RSI: 20 ', 'market'), 'Momentum-RSI-20-market.png')
})
