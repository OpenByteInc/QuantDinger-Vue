import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(
  new URL('../../src/views/indicator-ide/index.vue', import.meta.url),
  'utf8'
)

test('chart toolbar overlays remount inside the browser fullscreen element', () => {
  assert.match(
    source,
    /:key="chartFullscreen \? 'chart-toolbar-fullscreen' : 'chart-toolbar-windowed'"[\s\S]*class="chart-panel-toolbar"/
  )
  assert.match(
    source,
    /class="ide-toolbar-group ide-toolbar-group--indicator"[\s\S]*:get-popup-container="chartToolbarGetPopupContainer"/
  )
  assert.match(
    source,
    /chartToolbarGetPopupContainer \(\)[\s\S]*fs === ch[\s\S]*return ch[\s\S]*return document\.body/
  )
})
