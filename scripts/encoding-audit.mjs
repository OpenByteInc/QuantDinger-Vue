import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join, relative, resolve } from 'node:path'
import { TextDecoder } from 'node:util'
import vm from 'node:vm'

const root = resolve(process.cwd())
const utf8 = new TextDecoder('utf-8', { fatal: true })

const scanRoots = [
  'src',
  'scripts',
  '.editorconfig',
  '.gitattributes',
  'index.html',
  'package.json',
  'vite.config.js'
]

const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.less',
  '.md',
  '.mjs',
  '.ps1',
  '.vue',
  '.yaml',
  '.yml'
])

const ignoredDirs = new Set([
  '.git',
  'dist',
  'node_modules',
  'public',
  'coverage',
  '.vite'
])

const mojibakePatterns = [
  /\uFFFD/u,
  /[\uE000-\uF8FF]/u,
  /(?:\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]|\u00E2[\u0080-\u00BF]{1,2})/u
]

function shouldScan(filePath) {
  const name = basename(filePath)
  return textExtensions.has(extname(filePath)) || name.startsWith('.')
}

function walk(target, files = []) {
  const fullPath = resolve(root, target)
  const stat = statSync(fullPath)

  if (stat.isFile()) {
    if (shouldScan(fullPath)) files.push(fullPath)
    return files
  }

  for (const entry of readdirSync(fullPath, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue
    const child = join(fullPath, entry.name)
    if (entry.isDirectory()) {
      walk(relative(root, child), files)
    } else if (shouldScan(child)) {
      files.push(child)
    }
  }

  return files
}

function readStrictUtf8(filePath) {
  const bytes = readFileSync(filePath)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error('UTF-8 BOM is not allowed')
  }
  return utf8.decode(bytes)
}

function findMojibake(text) {
  for (const pattern of mojibakePatterns) {
    const match = text.match(pattern)
    if (match) return match[0]
  }
  return null
}

function checkLocaleSyntax(filePath) {
  const result = spawnSync(process.execPath, ['--check', filePath], {
    cwd: root,
    encoding: 'utf8'
  })
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim()
    throw new Error(detail || 'JavaScript syntax check failed')
  }
}

function extractLocaleObject(source, fileName) {
  const marker = 'const locale ='
  const markerIndex = source.indexOf(marker)
  if (markerIndex === -1) throw new Error(`${fileName}: missing locale object`)

  const start = source.indexOf('{', markerIndex)
  if (start === -1) throw new Error(`${fileName}: missing locale object start`)

  let depth = 0
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (lineComment) {
      if (char === '\n') lineComment = false
      continue
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }

    if (quote) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === quote) quote = null
      continue
    }

    if (char === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }

    if (char === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }

    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }

  throw new Error(`${fileName}: missing locale object end`)
}

function localeKeys(filePath) {
  const text = readStrictUtf8(filePath)
  const fileName = basename(filePath)
  const objectSource = extractLocaleObject(text, fileName)
  const locale = vm.runInNewContext(`(${objectSource})`, {}, { filename: fileName })
  return new Set(Object.keys(locale))
}

const failures = []
const files = scanRoots.flatMap((entry) => walk(entry)).sort()

for (const filePath of files) {
  const displayPath = relative(root, filePath)
  let text = ''

  try {
    text = readStrictUtf8(filePath)
  } catch (error) {
    failures.push(`${displayPath}: ${error.message}`)
    continue
  }

  const mojibake = displayPath === 'scripts\\encoding-audit.mjs' ? null : findMojibake(text)
  if (mojibake) {
    failures.push(`${displayPath}: possible mojibake marker "${mojibake}"`)
  }
}

const langDir = join(root, 'src', 'locales', 'lang')
const localeFiles = readdirSync(langDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => join(langDir, name))
  .sort()

for (const filePath of localeFiles) {
  try {
    checkLocaleSyntax(filePath)
  } catch (error) {
    failures.push(`${relative(root, filePath)}: ${error.message}`)
  }
}

const enUSPath = join(langDir, 'en-US.js')
const enUSKeys = localeKeys(enUSPath)
const localeCoverage = []

for (const filePath of localeFiles) {
  let text = ''
  try {
    text = readStrictUtf8(filePath)
  } catch {
    continue
  }
  let keys = new Set()
  try {
    keys = localeKeys(filePath)
  } catch (error) {
    failures.push(`${relative(root, filePath)}: ${error.message}`)
    continue
  }
  const hasFallback = /enUSFallback|zhCNFallback/.test(text) || basename(filePath) === 'en-US.js'
  let missing = 0
  for (const key of enUSKeys) {
    if (!keys.has(key)) missing += 1
  }
  localeCoverage.push({
    locale: basename(filePath),
    keys: keys.size,
    missing,
    effectiveMissing: hasFallback ? 0 : missing,
    hasFallback
  })
}

if (failures.length > 0) {
  console.error('Encoding audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Encoding audit passed: ${files.length} text files, ${localeFiles.length} locale files.`)
console.table(localeCoverage)
