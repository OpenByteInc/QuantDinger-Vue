import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('displayed application version is stamped by the frontend release build', () => {
  const vite = read('vite.config.js')
  const workflow = read('.github/workflows/release-frontend.yml')
  const layout = read('src/layouts/BasicLayout.vue')
  const settings = read('src/config/defaultSettings.js')
  const brandStore = read('src/store/modules/brand.js')

  assert.match(vite, /git describe --tags --exact-match HEAD/)
  assert.match(vite, /normalizeVersion\(process\.env\.GITHUB_REF_NAME\)/)
  assert.match(vite, /APP_VERSION: JSON\.stringify\(appVersion\)/)
  assert.match(workflow, /APP_VERSION=\$\{\{ startsWith\(github\.ref, 'refs\/tags\/v'\) && github\.ref_name \|\| '' \}\}/)
  assert.match(settings, /appVersion: BUILD_APP_VERSION/)
  assert.match(layout, /appVersion \(\) \{\s*return defaultSettings\.appVersion\s*\}/)
  assert.doesNotMatch(layout, /brandConfig\.app_version/)
  assert.match(brandStore, /delete normalized\.app_version/)
})
