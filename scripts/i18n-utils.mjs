import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

export const localeTargets = {
  'ar-SA': 'ar',
  'de-DE': 'de',
  'fr-FR': 'fr',
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'ru-RU': 'ru',
  'th-TH': 'th',
  'vi-VN': 'vi',
  'zh-CN': 'zh-Hans',
  'zh-TW': 'zh-Hant'
}

export const overrideModulePaths = [
  '../src/locales/copilot-overrides.js',
  '../src/locales/lang/profile-security.js',
  '../src/locales/lang/broker-account-workspace.js',
  '../src/locales/lang/strategy-v2.js',
  '../src/locales/lang/strategy-live-risk.js',
  '../src/locales/lang/robot-builder-overrides.js',
  '../src/locales/billing-payment-overrides.js',
  '../src/locales/lang/strategy-trade-records.js',
  '../src/locales/ux-overrides.js',
  '../src/locales/copilot-callsite-overrides.js',
  '../src/locales/reviewed-ui-overrides.js',
  '../src/locales/lang/current-feature-overrides.js',
  '../src/locales/lang/event-radar.js'
]

export function extractObjectRange(source, marker, fileName = 'locale file') {
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) throw new Error(`${fileName}: missing "${marker}"`)

  const start = source.indexOf('{', markerIndex)
  if (start < 0) throw new Error(`${fileName}: missing object start after "${marker}"`)

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
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = null
      }
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
      if (depth === 0) {
        return {
          start,
          end: index + 1,
          objectSource: source.slice(start, index + 1)
        }
      }
    }
  }

  throw new Error(`${fileName}: missing object end after "${marker}"`)
}

export function evaluateObject(source, marker, fileName = 'locale file') {
  const { objectSource } = extractObjectRange(source, marker, fileName)
  return vm.runInNewContext(`(${objectSource})`, {}, { filename: fileName })
}

export function extractComponentMessages(source, fileName) {
  const { objectSource } = extractObjectRange(source, 'const components =', fileName)
  const messages = {}
  const linePattern = /^\s*("(?:[^"\\]|\\.)*")\s*:\s*("(?:[^"\\]|\\.)*")\s*,?\s*$/gm
  let match
  while ((match = linePattern.exec(objectSource)) !== null) {
    messages[JSON.parse(match[1])] = JSON.parse(match[2])
  }
  return messages
}

export function loadCoreLocale(langDir, localeName) {
  const fileName = `${localeName}.js`
  const source = readFileSync(join(langDir, fileName), 'utf8')
  return {
    source,
    locale: {
      ...extractComponentMessages(source, fileName),
      ...evaluateObject(source, 'const locale =', fileName)
    }
  }
}

export function renderLocaleObject(locale) {
  return Object.entries(locale)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
    .join(',\n')
}

const placeholderPattern = /\{[^{}\n]+\}|%\([^)]+\)[sdif](?![A-Za-z])|%[sdif](?![A-Za-z])|<[^>\n]+>|`[^`\n]+`|https?:\/\/[A-Za-z0-9][A-Za-z0-9./?&=_:%#@+~-]*[A-Za-z0-9/#]/g

export function placeholders(value) {
  if (typeof value !== 'string') return []
  return [...value.matchAll(placeholderPattern)].map(match => match[0]).sort()
}

export function placeholdersMatch(source, translated) {
  return JSON.stringify(placeholders(source)) === JSON.stringify(placeholders(translated))
}

export function isTranslatableText(value) {
  if (typeof value !== 'string') return false
  const text = value.trim()
  if (!text || !/[A-Za-z]/.test(text)) return false
  const codeSpans = text.match(/<code\b[^>]*>.*?<\/code>/gi) || []
  const proseWithoutCode = text
    .replace(/<code\b[^>]*>.*?<\/code>/gi, '')
    .replace(/<br\s*\/?>/gi, '')
    .trim()
  if (codeSpans.length >= 2 && proseWithoutCode.length < 40) return false
  if ((text.match(/<br\s*\/?>/gi) || []).length >= 4 && /df\[|output\s*=|const\s|function\s/i.test(text)) {
    return false
  }
  if (/^https?:\/\//i.test(text) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return false
  if (/^[A-Z0-9][A-Z0-9+./:_&%#@()[\] -]{0,30}$/.test(text)) return false
  if (/^[\d\s.,:+*/%#@()[\]{}_-]+$/.test(text)) return false
  return true
}

export function localeFileName(filePath) {
  return basename(filePath)
}
