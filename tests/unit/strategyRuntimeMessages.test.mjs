import assert from 'node:assert/strict'
import test from 'node:test'

import messages from '../../src/locales/lang/strategy-live-risk.js'
import { translateStrategyRuntimeMessage } from '../../src/utils/strategyLogs.js'

test('runtime failures retain the actual cause and replay notices are localized', () => {
  const key = 'strategyV2.rebalanceReplaySkipped'
  for (const locale of Object.keys(messages)) {
    const translate = value => messages[locale][value] || value
    const raw = 'Runtime cycle failed: strategyV2.rebalanceBatchClosed'
    assert.match(translateStrategyRuntimeMessage(raw, translate), /strategyV2.rebalanceBatchClosed/)
    const multiline = 'Runtime cycle failed: example error\ncontext detail'
    assert.match(translateStrategyRuntimeMessage(multiline, translate), /example error\ncontext detail/)
    assert.equal(translateStrategyRuntimeMessage(raw, value => value), raw)
    assert.ok(messages[locale][key])
    const replay = translateStrategyRuntimeMessage(`${key}:2026-11-25T14:35:49Z`, translate)
    assert.ok(replay.includes(messages[locale][key]))
    assert.ok(replay.includes('2026-11-25T14:35:49Z'))
  }
})

test('Gate stock account environment errors are readable in logs', () => {
  const key = 'strategyV2.gateStockTestnetUnsupported'
  for (const locale of ['en-US', 'zh-CN']) {
    assert.equal(translateStrategyRuntimeMessage(key, key => messages[locale][key]), messages[locale][key])
    assert.ok(messages[locale][key].length > 30)
  }
})

test('technical runtime lines remain intact', () => {
  const message = 'unrecognized technical runtime detail'
  assert.equal(translateStrategyRuntimeMessage(message, () => assert.fail('Unexpected translation')), message)
  assert.equal(translateStrategyRuntimeMessage('strategyRuntime.leaseLost', key => `translated:${key}`), 'translated:strategyRuntime.leaseLost')
})

test('common live order logs are localized with actionable summaries', () => {
  const translate = (key, params = {}) => `${key}:${JSON.stringify(params)}`
  const invalidSymbol = 'Leverage or margin-mode setup failed for XAUT/USDT: Binance margin mode setup failed: Binance HTTP 400: {"code":-1121,"msg":"Invalid symbol."}'
  const queued = 'Order queued: open_long XAUT/USDT quantity=0.2294 pending_id=154712 client_order_id=test'

  assert.match(translateStrategyRuntimeMessage(invalidSymbol, translate), /invalid_symbol.*XAUT\/USDT/)
  assert.match(translateStrategyRuntimeMessage(queued, translate), /orderQueued.*open_long.*154712/)
  assert.match(
    translateStrategyRuntimeMessage('strategyV2.dualDirectionHedgeModeRequired:binance_one_way_mode', translate),
    /dualDirectionHedgeModeRequired.*positionModeDetail\.binanceOneWay/
  )
})

test('common exchange API failures use stable actionable categories', () => {
  const translate = (key, params = {}) => `${key}:${JSON.stringify(params)}`
  const examples = [
    [
      'Auto-stopped (position_sync_binance): Binance HTTP 401: {"code":-2015,"msg":"Invalid API-key, IP, or permissions for action"}',
      'credentialsStopped'
    ],
    [
      'Exchange order failed (gate BTC/USDT close_short): Gate HTTP 400: {"label":"MARKET_PRICE_TOO_DEVIATED","message":"price deviates too much"}',
      'price_band'
    ],
    [
      'Exchange order failed (gate BTC/USDT open_short): Insufficient free balance or margin. Details: Gate HTTP 400: {"label":"INSUFFICIENT_AVAILABLE","message":"margin 950 while available 800"}',
      'insufficient_funds'
    ],
    [
      'Exchange order failed (bybit BTC/USDT open_long): Bybit {"retCode":10006,"retMsg":"Too many visits"}',
      'rate_limit'
    ]
  ]

  for (const [raw, category] of examples) {
    assert.match(translateStrategyRuntimeMessage(raw, translate), new RegExp(`exchangeError\\.${category}`))
  }

  const structured = {
    category: 'order_size',
    exchange: 'okx',
    context: 'okx BTC/USDT open_long'
  }
  assert.match(
    translateStrategyRuntimeMessage('future backend wording', translate, structured),
    /exchangeError\.order_size/
  )
})

test('spot sell failures are localized in runtime logs', () => {
  for (const suffix of ['spotBalanceUnavailable', 'spotBalanceInsufficient', 'spotCloseQuantityInvalid']) {
    const key = `strategyRuntime.${suffix}`
    for (const locale of Object.keys(messages)) {
      assert.ok(messages[locale][key])
      assert.equal(translateStrategyRuntimeMessage(key, value => messages[locale][value]), messages[locale][key])
    }
    assert.notEqual(messages['zh-CN'][key], messages['en-US'][key])
    assert.notEqual(messages['zh-TW'][key], messages['zh-CN'][key])
  }
})
