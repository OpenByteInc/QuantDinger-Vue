import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { activeAdvertisements, createAdvertisementId, isAdvertisementUrl, validAdvertisement, showSidebarAdvertisement } from '../../src/utils/advertisements.mjs'

test('advertisement IDs use Web Crypto even when randomUUID is unavailable on HTTP', () => {
  assert.equal(createAdvertisementId({ randomUUID: () => 'uuid' }), 'uuid')
  assert.equal(createAdvertisementId({ getRandomValues: bytes => {
    assert.equal(bytes.length, 16)
    bytes.set(Array.from({ length: 16 }, (_, i) => i))
    return bytes
  } }), 'ad-000102030405060708090a0b0c0d0e0f')
})

const ad = { id: 'a', name: 'Partner', image_url: 'https://example.com/a.png', target_url: 'https://example.com/signup', position: 'sidebar', enabled: true, sort_order: 10 }
test('only explicit HTTP(S) URLs without credentials or whitespace are accepted', () => {
  for (const url of ['javascript:alert(1)', 'data:image/png;base64,abc', '//example.com/a', 'https://user:pass@example.com', 'https://example.com/\nx', 'file:///tmp/a', 'https:\\evil.com']) assert.equal(isAdvertisementUrl(url), false, url)
  assert.equal(isAdvertisementUrl(ad.image_url), true)
})
test('placements are isolated, disabled entries filtered, stable ascending order', () => {
  const items = [ad, { ...ad, id: 'b', sort_order: 0 }, { ...ad, id: 'c', enabled: false }, { ...ad, id: 'd', position: 'accounts' }]
  assert.deepEqual(activeAdvertisements(items, 'sidebar').map(x => x.id), ['b', 'a'])
  assert.equal(showSidebarAdvertisement(items, '/broker-accounts'), true)
  assert.equal(showSidebarAdvertisement(items, '/strategy-ide'), true)
  assert.equal(showSidebarAdvertisement([ad], '/broker-accounts'), true)
  assert.equal(showSidebarAdvertisement([], '/strategy-ide'), false)
  assert.equal(showSidebarAdvertisement([{ ...ad, position: 'accounts' }], '/broker-accounts'), false)
})

test('navigation advertisement stays at the viewport bottom with independently scrollable navigation', () => {
  const source = readFileSync(new URL('../../src/layouts/BasicLayout.vue', import.meta.url), 'utf8')
  assert.match(source, /height: 100dvh/)
  assert.match(source, /\.sponsored-menu__navigation \{ flex: 1; min-height: 0; overflow: auto; \}/)
  assert.match(source, /\.sponsored-menu__advertisement \{[^}]*margin-top: auto;[^}]*env\(safe-area-inset-bottom\)/)
})
test('editor validates names, positions, order and both URLs even when disabled', () => {
  assert.equal(validAdvertisement(ad), true)
  for (const change of [{ name: '' }, { sort_order: -1 }, { sort_order: 1.5 }, { sort_order: 10000 }, { position: 'unknown' }, { image_url: 'bad' }, { target_url: 'javascript:alert(1)' }]) assert.equal(validAdvertisement({ ...ad, ...change }), false)
})
test('carousel keeps safe links, pause and failure behavior', () => {
  const source = readFileSync(new URL('../../src/components/AdvertisementSlot.vue', import.meta.url), 'utf8')
  for (const pattern of ['noopener noreferrer sponsored', 'referrerpolicy="no-referrer"', 'prefers-reduced-motion', 'document.hidden', '!this.hovered', '!this.focused', '!this.paused', 'clearInterval(this.timer)', '@error="reject(ad)"', 'object-fit: contain']) assert.ok(source.includes(pattern), pattern)
  assert.ok(source.includes('v-if="slides.length"'))
  for (const removed of ['ad-slot__footer', 'ad-slot__controls', 'ad-slot__external', 'ad-slot__close', 'dismissed', 'sessionStorage', '<button']) assert.ok(!source.includes(removed), removed)
})

function carouselFixture (storage) {
  const source = readFileSync(new URL('../../src/components/AdvertisementSlot.vue', import.meta.url), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/m, '').replace('export default', 'component =')
  const timers = new Map()
  const context = { window: { sessionStorage: storage }, document: { hidden: false }, activeAdvertisements, setInterval: fn => { timers.set(1, fn); return 1 }, clearInterval: id => timers.delete(id) }
  runInNewContext(script, context)
  const component = context.component
  const instance = { ...component.data(), ...component.methods, slides: [ad, { ...ad, id: 'b' }], position: 'sidebar' }
  return { component, instance, timers }
}

test('automatic rotation pauses on interaction and stops on deactivation', () => {
  const { component, instance, timers } = carouselFixture()
  instance.startTimer()
  timers.get(1)()
  assert.equal(instance.current, 1)
  instance.hovered = true
  timers.get(1)()
  assert.equal(instance.current, 1)
  instance.hovered = false
  instance.focused = true
  timers.get(1)()
  assert.equal(instance.current, 1)
  component.deactivated.call(instance)
  assert.equal(timers.size, 0)
  component.activated.call(instance)
  assert.equal(timers.size, 1)
  component.beforeDestroy.call(instance)
  assert.equal(timers.size, 0)
})

test('previous session dismissals no longer hide ads or prevent rotation', () => {
  const { component, instance, timers } = carouselFixture({ getItem: () => '1' })
  assert.equal(component.beforeMount, undefined)
  assert.equal(instance.dismiss, undefined)
  instance.startTimer()
  timers.get(1)()
  assert.equal(instance.current, 1)
})
