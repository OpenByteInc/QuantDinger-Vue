import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { formatMarketPrice } from '../../src/utils/marketPricePrecision.mjs'

const require = createRequire(import.meta.url)
const compiler = require('vue/compiler-sfc')
const source = fs.readFileSync(new URL('../../src/views/ai-analysis/components/CopilotWorkbench.vue', import.meta.url), 'utf8')
const descriptor = compiler.parse({ source })
const ast = compiler.compileScript(descriptor, { id: 'copilot-price-precision' }).scriptAst
const declaration = ast.find(node => node.type === 'ExportDefaultDeclaration').declaration
const methods = declaration.properties.find(node => node.key.name === 'methods').value.properties
const code = methods.filter(node => ['formatPriceValue', 'reportCurrentPrice'].includes(node.key.name))
  .map(node => descriptor.script.content.slice(node.start, node.end)).join(',')
const vm = new Function('formatMarketPrice', `return ({${code}})`)(formatMarketPrice)

test('the watchlist supplies contract identity to the price formatter', () => {
  assert.match(descriptor.template.content, /formatPriceValue\(priceFor\(item\) && priceFor\(item\)\.price, item\.market, item\.symbol\)/)
  assert.equal(vm.formatPriceValue(0.66549999, 'Futures', '6AZ26'), '0.66550')
})

test('research report price cards use the same futures precision as the watchlist', () => {
  const report = { instrument: { market: 'Futures', symbol: '6JZ26' } }
  const context = {
    ...vm,
    professionalArtifact: value => value,
    reportObservation: () => ({ value: Math.fround(0.0066555) })
  }
  assert.equal(context.reportCurrentPrice({ report }), '0.0066555')
  context.reportObservation = () => null
  assert.equal(context.reportCurrentPrice({ report }), '--')
})
