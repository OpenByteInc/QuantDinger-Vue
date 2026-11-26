import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../../src/components/ExchangeSignupModal/ExchangeSignupModal.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'result =')
const cards = [{ id: 'binance', signupUrl: 'https://example.test/signup' }]
const opened = []
const context = { CRYPTO_SIGNUP_CARDS: cards, ProviderLogo: {}, window: { open: (...args) => opened.push(args) } }
vm.runInNewContext(script, context)
const component = context.result

test('signup choices retain existing destinations and use real provider logos', () => {
  assert.equal(component.data().cryptoCards, cards)
  assert.match(source, /<provider-logo :provider="item.id"/)
  assert.match(source, /:disabled="!item.signupUrl"/)
  assert.match(source, /type="button"/)
  assert.ok(!source.includes('linear-gradient'))
})

test('signup opens only requested destinations in an isolated new tab', () => {
  component.methods.openSignupLink('')
  assert.equal(opened.length, 0)
  component.methods.openSignupLink(cards[0].signupUrl)
  assert.deepEqual(opened[0], [cards[0].signupUrl, '_blank', 'noopener,noreferrer'])
})

test('dialog close, theme isolation, keyboard focus and narrow layouts remain available', () => {
  let event
  component.methods.handleCancel.call({ $emit: (...args) => { event = args } })
  assert.deepEqual(event, ['update:visible', false])
  assert.equal(component.computed.modalWrapClass.call({ isDarkTheme: true }), 'exchange-signup-wrap exchange-signup-wrap--dark')
  assert.match(source, /:focus-visible/)
  assert.match(source, /@media \(max-width: 600px\)/)
  assert.match(source, /max-height: calc\(100dvh - 128px\)/)
})
