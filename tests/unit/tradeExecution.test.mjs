import assert from 'node:assert/strict'
import test from 'node:test'
import { formatExecutionNumber, formatExecutionPrice, formatPriceDeviation, formatTradeMoney } from '../../src/utils/tradeExecution.js'
import messages from '../../src/locales/lang/strategy-trade-records.js'

test('execution values preserve small fills and distinguish unknown from zero', () => {
  assert.equal(formatExecutionNumber(0.00016199), '0.00016199')
  assert.equal(formatExecutionNumber(0.00000000123), '0.00000000123')
  assert.equal(formatExecutionNumber(75724.6), '75,724.6')
  assert.equal(formatExecutionNumber(0), '0')
  for (const value of [null, undefined, '', NaN, Infinity]) {
    assert.equal(formatExecutionNumber(value), '--')
    assert.equal(formatPriceDeviation(value), '--')
  }
})

test('price deviation preserves direction and missing references', () => {
  assert.equal(formatPriceDeviation(1), '+1.0000%')
  assert.equal(formatPriceDeviation(-1), '-1.0000%')
  assert.equal(formatPriceDeviation(0), '0.0000%')
})

test('execution labels are available in every supported locale', () => {
  for (const locale of Object.values(messages)) {
    for (const key of ['price', 'reference', 'deviation', 'fillSummary', 'qualitySummary', 'note', 'deviationHint', 'orderId', 'pnlHint', 'gridPnlHint', 'pairPending', 'feesPending', 'entryOrders', 'exitOrder', 'gridPendingSummary', 'exchangePnl', 'systemPnl', 'gridNetPnl', 'exchangePnlHint', 'excluding_fees', 'venue_defined', 'reportPending', 'reportPendingWithSystem', 'reportUnavailable', 'reportUnsupported', 'spotPnlNotApplicable', 'orderTotalElsewhere', 'reportSource', 'reportedQuantity', 'systemSummary']) {
      assert.ok(locale[`trading-assistant.execution.${key}`])
    }
    for (const key of ['positionCost', 'marketValue', 'averageEntryPrice']) {
      assert.ok(locale[`trading-assistant.table.${key}`])
    }
  }
})


test('records table stays visible alongside its execution note', async () => {
  const { readFileSync } = await import('node:fs')
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  const Vue = require('vue')
  const compiler = require('vue-template-compiler')
  const source = readFileSync(new URL('../../src/views/strategy-center/components/TradingRecords.vue', import.meta.url), 'utf8')
  assert.match(source, /formatSignedMoney\(record\.profit_gross\)/)
  const compiled = compiler.compile(compiler.parseComponent(source).template.content)
  assert.deepEqual(compiled.errors, [])
  for (const [records, loading, expected] of [[[{ id: 1 }], false, true], [[], false, false], [[], true, true]]) {
    const instance = new Vue({
      data: () => ({ records, isRecordsLoading: loading, isDark: false, portfolio: false, hasCostSummary: false, costSummary: null, costSummaryItems: [], columns: [] }),
      methods: { $t: key => key },
      render: new Function(compiled.render),
      staticRenderFns: compiled.staticRenderFns.map(code => new Function(code))
    })
    const root = instance._render()
    assert.equal(root.children.some(node => node.tag === 'a-table'), expected)
    instance.$destroy()
  }
})


test('price formatting keeps the table compact without hiding tiny asset prices', () => {
  assert.equal(formatExecutionPrice(75577.2410833483), '75,577.24')
  assert.equal(formatExecutionPrice(75724.6), '75,724.60')
  assert.equal(formatExecutionPrice(0.000000012345678), '0.0000000123457')
  assert.equal(formatExecutionPrice(null), '--')
  assert.equal(formatPriceDeviation(-0.194977898821613), '-0.1950%')
  assert.equal(formatPriceDeviation(-0.0000003), '-<0.0001%')
})

test('money uses cents for normal amounts and preserves small nonzero PnL', () => {
  assert.equal(formatTradeMoney(2478.206801, true), '+$2,478.21')
  assert.equal(formatTradeMoney(-0.00321, true), '-$0.00321')
  assert.equal(formatTradeMoney(-0.0000002, true), '-<$0.000001')
  assert.equal(formatTradeMoney(0, true), '$0.00')
  assert.equal(formatTradeMoney(null), '--')
})


test('unconfirmed grid pairs never fall back to stale stored profit', async () => {
  const { readFileSync } = await import('node:fs')
  const source = readFileSync(new URL('../../src/views/strategy-center/components/TradingRecords.vue', import.meta.url), 'utf8')
  const script = source.split('<script>')[1].split('</script>')[0]
    .replace(/^import .*$/gm, '').replace('export default', 'return')
  const options = new Function('formatExecutionNumber', 'formatExecutionPrice', 'formatPriceDeviation', 'formatTradeMoney', script)(
    formatExecutionNumber, formatExecutionPrice, formatPriceDeviation, formatTradeMoney)
  const methods = options.methods
  const showExchangePnlColumn = options.computed.showExchangePnlColumn
  const reportedContext = { $t: key => messages['zh-CN'][key] }
  assert.equal(methods.formatReportedPnl.call(reportedContext, { status: 'reported', amount: -5, currency: 'USDT', fee_basis: 'venue_defined' }), '-5.00 USDT')
  assert.equal(methods.formatReportedPnl.call(reportedContext, { status: 'reported', amount: 0, currency: 'USDT' }), '0.00 USDT')
  assert.equal(methods.formatReportedPnl.call(reportedContext, { status: 'pending', amount: 999 }), '待交易所核对')
  assert.equal(methods.formatReportedPnl.call(reportedContext, { status: 'pending' }, { type: 'close_long', profit: -0.98 }), '交易所订单盈亏暂未获取 · 已显示系统核算')
  assert.equal(methods.formatReportedPnl.call(reportedContext, { status: 'pending' }, { type: 'open_long', profit: 0 }), '待交易所核对')
  assert.equal(methods.formatReportedPnl.call(reportedContext, { status: 'pending' }, { pnl_source: 'grid_exchange_order_pairs', pnl_status: 'unmatched', profit: 1 }), '待交易所核对')
  assert.equal(methods.formatReportedPnl.call(reportedContext, { status: 'not_applicable_spot' }), '现货订单不提供此项')
  assert.equal(methods.formatReportedPnl.call(reportedContext, { status: 'unsupported' }), '当前交易通道不提供订单级盈亏')
  assert.equal(methods.formatReportedPnl.call(reportedContext, { status: 'order_total_elsewhere' }), '见本订单最新成交行')
  assert.equal(methods.formatExpense(null), '--')
  assert.equal(methods.formatExpense(0.01), '-$0.01')
  assert.equal(methods.formatExpense(-0.01), '+$0.01')
  assert.equal(showExchangePnlColumn.call({ records: [{ exchange_pnl: { status: 'unsupported' } }] }), false)
  assert.equal(showExchangePnlColumn.call({ records: [{ exchange_pnl: { status: 'not_applicable' } }, { exchange_pnl: { status: 'not_applicable_spot' } }] }), false)
  assert.equal(showExchangePnlColumn.call({ records: [{ exchange_pnl: { status: 'unsupported' } }, { exchange_pnl: { status: 'pending' } }] }), true)
  for (const status of ['unmatched', 'fees_pending']) {
    assert.equal(methods.netTradePnl.call({}, { pnl_source: 'grid_exchange_order_pairs', pnl_status: status, profit: 123 }), null)
    assert.ok(methods.formatProfit.call({ $t: key => messages['zh-CN'][key] }, { pnl_status: status }))
  }
})
