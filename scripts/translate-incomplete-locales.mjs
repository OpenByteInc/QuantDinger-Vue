import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import {
  evaluateObject,
  extractObjectRange,
  isTranslatableText,
  loadCoreLocale,
  localeTargets,
  overrideModulePaths,
  placeholdersMatch,
  renderLocaleObject
} from './i18n-utils.mjs'
import {
  verifiedSameTranslations as existingVerifiedSameTranslations
} from '../src/locales/generated-locale-overrides.js'
import { verifiedSameUiMessages } from '../src/locales/reviewed-ui-overrides.js'
import { verifiedSameSettingsMessages } from '../src/locales/settings-research-overrides.js'
import { verifiedSameHumanMessages } from '../src/locales/human-completion-overrides.js'

const root = resolve(process.cwd())
const langDir = join(root, 'src', 'locales', 'lang')
const outputPath = join(root, 'src', 'locales', 'generated-locale-overrides.js')
const authEndpoint = process.env.QUANTDINGER_TRANSLATE_AUTH_ENDPOINT ||
  'https://edge.microsoft.com/translate/auth'
const endpoint = process.env.QUANTDINGER_TRANSLATE_ENDPOINT ||
  'https://api-edge.cognitive.microsofttranslator.com/translate'
const requestDelayMs = Number(process.env.QUANTDINGER_TRANSLATE_DELAY_MS || 180)
const requestedProvider = process.env.QUANTDINGER_TRANSLATE_PROVIDER || 'auto'
const googleCloudKey = process.env.GOOGLE_TRANSLATE_API_KEY ||
  process.env.GOOGLE_CLOUD_TRANSLATE_KEY ||
  process.env.VITE_GOOGLE_API_KEY || ''
const requestedLocales = new Set(
  String(process.env.QUANTDINGER_TRANSLATE_LOCALES || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
)
const activeLocaleNames = Object.keys(localeTargets).filter(localeName => (
  requestedLocales.size === 0 || requestedLocales.has(localeName)
))
const missingOnly = process.env.QUANTDINGER_TRANSLATE_MISSING_ONLY === '1'
const batchCharacterLimit = 3500
const batchItemLimit = 90
const bingBatchCharacterLimit = 850
const bingParallelTargets = Number(process.env.QUANTDINGER_TRANSLATE_PARALLEL_TARGETS || 1)
const existingGeneratedMessages = existsSync(outputPath)
  ? evaluateObject(
      readFileSync(outputPath, 'utf8'),
      'const messages =',
      'generated-locale-overrides.js'
    )
  : {}

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
let translationToken = ''
let activeProvider = requestedProvider
let bingSession = null
let googlePowerShellOnly = false

function protectText(value) {
  const protectedValues = []
  const text = value.replace(
    /<code\b[^>]*>.*?<\/code>|\{[^{}\n]+\}|%\([^)]+\)[sdif](?![A-Za-z])|%[sdif](?![A-Za-z])|<[^>\n]+>|`[^`\n]+`|https?:\/\/[A-Za-z0-9][A-Za-z0-9./?&=_:%#@+~-]*[A-Za-z0-9/#]/gi,
    match => {
      const token = `__QD${String(protectedValues.length).padStart(6, '0')}__`
      protectedValues.push(match)
      return token
    }
  )
  return { text, protectedValues }
}

function restoreText(value, protectedValues) {
  let restored = value
  protectedValues.forEach((original, index) => {
    const token = `__QD${String(index).padStart(6, '0')}__`
    const tokenDigits = index === 0 ? '0+' : `0*${index}`
    const flexibleToken = new RegExp(
      `(?:__|＿＿)?\\s*QD\\s*${tokenDigits}\\s*(?:__|＿＿)?`,
      'i'
    )
    if (restored.includes(token)) {
      restored = restored.split(token).join(original)
    } else if (flexibleToken.test(restored)) {
      restored = restored.replace(flexibleToken, original)
    } else {
      throw new Error(`Translation response lost protected token ${token}`)
    }
  })
  return restored.trim()
}

async function getTranslationToken(forceRefresh = false) {
  if (translationToken && !forceRefresh) return translationToken
  const response = await fetch(authEndpoint)
  if (!response.ok) {
    const error = new Error(`Translation auth failed with HTTP ${response.status}`)
    error.status = response.status
    throw error
  }
  translationToken = (await response.text()).trim()
  if (!translationToken) throw new Error('Translation auth returned an empty token')
  return translationToken
}

const bingHeaders = {
  'accept-language': 'en-US,en;q=0.9',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36'
}

async function getBingSession(forceRefresh = false) {
  if (bingSession && !forceRefresh && Date.now() - bingSession.createdAt < 45 * 60 * 1000) {
    return bingSession
  }
  const response = await fetch('https://www.bing.com/translator', { headers: bingHeaders })
  if (!response.ok) throw new Error(`Bing translation bootstrap failed with HTTP ${response.status}`)
  const html = await response.text()
  const ig = html.match(/IG:"([^"]+)"/)?.[1]
  const iid = html.match(/data-iid="([^"]+)"/)?.[1]
  const auth = html.match(/params_AbusePreventionHelper\s*=\s*\[(\d+),"([^"]+)"/)
  const cookies = (response.headers.getSetCookie?.() || [])
    .map(value => value.split(';', 1)[0])
    .join('; ')
  if (!ig || !iid || !auth) {
    throw new Error('Bing translation bootstrap parameters were not found')
  }
  bingSession = {
    ig,
    iid,
    key: auth[1],
    token: auth[2],
    cookies,
    createdAt: Date.now()
  }
  return bingSession
}

async function requestBingText(text, targetLanguage, attempt = 1) {
  const session = await getBingSession(attempt > 1 && attempt % 3 === 0)
  const body = new URLSearchParams({
    fromLang: 'en',
    to: targetLanguage,
    text,
    key: session.key,
    token: session.token
  })
  const response = await fetch(
    `https://www.bing.com/ttranslatev3?isVertical=1&IG=${session.ig}&IID=${session.iid}`,
    {
      method: 'POST',
      headers: {
        ...bingHeaders,
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        cookie: session.cookies,
        origin: 'https://www.bing.com',
        referer: 'https://www.bing.com/translator'
      },
      body
    }
  )
  if (!response.ok) {
    if (attempt >= 6) throw new Error(`Bing translation failed with HTTP ${response.status}`)
    if (response.status === 401 || response.status === 403) bingSession = null
    const baseDelay = response.status === 429 ? 5000 : 750
    await sleep(Math.min(baseDelay * (2 ** (attempt - 1)), 30000))
    return requestBingText(text, targetLanguage, attempt + 1)
  }
  const responseText = await response.text()
  let payload
  try {
    payload = JSON.parse(responseText)
  } catch (error) {
    if (attempt >= 6) {
      throw new Error(
        `Bing translation returned an invalid response for ${targetLanguage}: ` +
        `${responseText.slice(0, 160) || '<empty>'}`
      )
    }
    bingSession = null
    await sleep(Math.min(1500 * (2 ** (attempt - 1)), 30000))
    return requestBingText(text, targetLanguage, attempt + 1)
  }
  const translated = payload?.[0]?.translations?.[0]?.text
  if (typeof translated !== 'string') {
    throw new Error('Bing translation response did not contain translated text')
  }
  return translated
}

function makeTranslationBatches(protectedItems, characterLimit = bingBatchCharacterLimit) {
  const batches = []
  let current = []
  let characters = 0
  protectedItems.forEach((item, index) => {
    const marker = `QDINGERITEM${String(index).padStart(6, '0')}TOKEN`
    const size = marker.length + item.text.length + 2
    if (current.length && characters + size > characterLimit) {
      batches.push(current)
      current = []
      characters = 0
    }
    current.push({ ...item, index, marker })
    characters += size
  })
  if (current.length) batches.push(current)
  return batches
}

function extractBingBatch(translatedText, batch) {
  const markerPattern = /QDINGERITEM(\d{6})TOKEN/g
  const matches = [...translatedText.matchAll(markerPattern)]
  if (matches.length !== batch.length) {
    throw new Error('Bing translation response lost an item separator')
  }
  const values = new Map()
  matches.forEach((match, index) => {
    const itemIndex = Number(match[1])
    const start = match.index + match[0].length
    const end = matches[index + 1]?.index ?? translatedText.length
    values.set(itemIndex, translatedText.slice(start, end).trim())
  })
  return values
}

async function requestBingTranslationMatrix(values, targetLanguages) {
  const protectedItems = values.map(protectText)
  const batches = makeTranslationBatches(protectedItems)
  const matrix = values.map(() => ({}))
  let nextTarget = 0

  async function translateTarget() {
    while (nextTarget < targetLanguages.length) {
      const targetLanguage = targetLanguages[nextTarget++]
      for (const batch of batches) {
        const joined = batch.map(item => `${item.marker}\n${item.text}`).join('\n')
        const translated = await requestBingText(joined, targetLanguage)
        let translatedItems
        try {
          translatedItems = extractBingBatch(translated, batch)
        } catch (error) {
          console.warn(
            `${targetLanguage}: ${error.message}; retrying ${batch.length} strings individually`
          )
          translatedItems = new Map()
          for (const item of batch) {
            translatedItems.set(
              item.index,
              await requestBingText(item.text, targetLanguage)
            )
            await sleep(requestDelayMs)
          }
        }
        for (const item of batch) {
          matrix[item.index][targetLanguage] = restoreText(
            translatedItems.get(item.index) || '',
            item.protectedValues
          )
        }
        await sleep(requestDelayMs)
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(bingParallelTargets, targetLanguages.length) },
      () => translateTarget()
    )
  )
  return matrix
}

const googleLanguageAliases = {
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW'
}

async function requestGoogleText(text, targetLanguage, attempt = 1) {
  if (googlePowerShellOnly) {
    return requestGoogleTextViaPowerShell(text, targetLanguage)
  }
  const body = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: googleLanguageAliases[targetLanguage] || targetLanguage,
    dt: 't',
    q: text
  })
  try {
    const response = await fetch('https://translate.googleapis.com/translate_a/single', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'user-agent': bingHeaders['user-agent']
      },
      body
    })
    const responseText = await response.text()
    if (!response.ok) {
      const error = new Error(`Google translation failed with HTTP ${response.status}`)
      error.status = response.status
      throw error
    }
    const payload = JSON.parse(responseText)
    const translated = Array.isArray(payload?.[0])
      ? payload[0].map(segment => segment?.[0] || '').join('')
      : ''
    if (!translated) throw new Error('Google translation response did not contain translated text')
    return translated
  } catch (error) {
    try {
      googlePowerShellOnly = true
      return await requestGoogleTextViaPowerShell(text, targetLanguage)
    } catch (transportError) {
      if (attempt >= 6) throw transportError
    }
    if (attempt >= 6) throw error
    const baseDelay = error.status === 429 ? 5000 : 1000
    await sleep(Math.min(baseDelay * (2 ** (attempt - 1)), 30000))
    return requestGoogleText(text, targetLanguage, attempt + 1)
  }
}

function requestGoogleTextViaPowerShell(text, targetLanguage) {
  const script = `
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$text = [Console]::In.ReadToEnd()
$body = @{
  client = 'gtx'
  sl = 'en'
  tl = $env:QDINGER_TRANSLATE_TARGET
  dt = 't'
  q = $text
}
$response = Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'https://translate.googleapis.com/translate_a/single' -ContentType 'application/x-www-form-urlencoded;charset=UTF-8' -Body $body -TimeoutSec 60
$response.Content
`
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      {
        env: {
          ...process.env,
          QDINGER_TRANSLATE_TARGET: googleLanguageAliases[targetLanguage] || targetLanguage
        },
        windowsHide: true
      }
    )
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error((stderr || stdout || 'PowerShell transport failed').trim()))
        return
      }
      try {
        const payload = JSON.parse(stdout)
        const translated = Array.isArray(payload?.[0])
          ? payload[0].map(segment => segment?.[0] || '').join('')
          : ''
        if (!translated) {
          throw new Error('Google translation response did not contain translated text')
        }
        resolve(translated)
      } catch (error) {
        reject(error)
      }
    })
    child.stdin.end(text, 'utf8')
  })
}

async function requestGoogleTranslationMatrix(values, targetLanguages) {
  const protectedItems = values.map(protectText)
  const batches = makeTranslationBatches(protectedItems, 3500)
  const matrix = values.map(() => ({}))
  await Promise.all(targetLanguages.map(async targetLanguage => {
    for (const batch of batches) {
      const joined = batch
        .map(item => item.text.replace(/\s+/g, ' ').trim())
        .join('\n')
      const translated = await requestGoogleText(joined, targetLanguage)
      let translatedItems
      const translatedLines = translated
        .replace(/\r/g, '')
        .replace(/\n+$/, '')
        .split('\n')
        .map(value => value.trim())
      if (translatedLines.length === batch.length) {
        translatedItems = new Map(
          batch.map((item, index) => [item.index, translatedLines[index]])
        )
      } else {
        console.warn(
          `${targetLanguage}: expected ${batch.length} translated lines, got ` +
          `${translatedLines.length}; retrying individually`
        )
        translatedItems = new Map()
        for (const item of batch) {
          translatedItems.set(
            item.index,
            await requestGoogleText(item.text, targetLanguage)
          )
          await sleep(requestDelayMs)
        }
      }
      for (const item of batch) {
        try {
          matrix[item.index][targetLanguage] = restoreText(
            translatedItems.get(item.index) || '',
            item.protectedValues
          )
        } catch (error) {
          console.warn(
            `${targetLanguage}: protected tokens changed for item ${item.index}; ` +
            'retrying individually'
          )
          const retried = await requestGoogleText(item.text, targetLanguage)
          try {
            matrix[item.index][targetLanguage] = restoreText(
              retried,
              item.protectedValues
            )
          } catch (error) {
            console.error(
              `${targetLanguage}: protected-token retry failed for ` +
              `${JSON.stringify(item.text)} -> ${JSON.stringify(retried)}`
            )
            throw error
          }
        }
      }
      await sleep(requestDelayMs)
    }
  }))
  return matrix
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

async function requestGoogleCloudTranslationMatrix(values, targetLanguages) {
  if (!googleCloudKey) {
    throw new Error('Missing Google Cloud Translate API key')
  }
  const protectedItems = values.map(protectText)
  const matrix = values.map(() => ({}))
  for (const targetLanguage of targetLanguages) {
    const requestPayload = {
      q: protectedItems.map(item => item.text),
      source: 'en',
      target: googleLanguageAliases[targetLanguage] || targetLanguage,
      format: 'text'
    }
    let response = { ok: true, status: 200 }
    let payload
    try {
      response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(googleCloudKey)}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json;charset=UTF-8',
            'user-agent': bingHeaders['user-agent']
          },
          body: JSON.stringify(requestPayload)
        }
      )
      payload = await response.json().catch(() => ({}))
    } catch (error) {
      console.warn(`Google Cloud fetch failed, using PowerShell transport: ${error.message}`)
      payload = requestGoogleCloudViaPowerShell(requestPayload)
    }
    if (!response.ok) {
      throw new Error(
        payload?.error?.message || `Google Cloud translation failed with HTTP ${response.status}`
      )
    }
    const translations = payload?.data?.translations || []
    if (translations.length !== values.length) {
      throw new Error(
        `Google Cloud response item count mismatch: expected ${values.length}, got ${translations.length}`
      )
    }
    translations.forEach((item, index) => {
      matrix[index][targetLanguage] = restoreText(
        decodeHtmlEntities(item.translatedText),
        protectedItems[index].protectedValues
      )
    })
    await sleep(requestDelayMs)
  }
  return matrix
}

function requestGoogleCloudViaPowerShell(requestPayload) {
  const script = `
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$payload = [Console]::In.ReadToEnd()
$uri = 'https://translation.googleapis.com/language/translate/v2?key=' + [System.Uri]::EscapeDataString($env:GOOGLE_TRANSLATE_API_KEY)
$result = Invoke-RestMethod -Method Post -Uri $uri -ContentType 'application/json; charset=utf-8' -Body $payload -TimeoutSec 60
$result | ConvertTo-Json -Depth 20 -Compress
`
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    {
      input: JSON.stringify(requestPayload),
      encoding: 'utf8',
      env: { ...process.env, GOOGLE_TRANSLATE_API_KEY: googleCloudKey },
      maxBuffer: 10 * 1024 * 1024
    }
  )
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'PowerShell transport failed').trim())
  }
  return JSON.parse(result.stdout)
}

async function requestTranslationMatrix(values, targetLanguages, attempt = 1) {
  if (activeProvider === 'google-cloud') {
    return requestGoogleCloudTranslationMatrix(values, targetLanguages)
  }
  if (activeProvider === 'google') {
    return requestGoogleTranslationMatrix(values, targetLanguages)
  }
  if (activeProvider === 'bing') {
    return requestBingTranslationMatrix(values, targetLanguages)
  }
  const protectedItems = values.map(protectText)
  const query = new URLSearchParams({
    'api-version': '3.0',
    from: 'en',
    textType: 'plain'
  })
  targetLanguages.forEach(targetLanguage => query.append('to', targetLanguage))
  try {
    const token = await getTranslationToken()
    const response = await fetch(`${endpoint}?${query}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json;charset=UTF-8'
      },
      body: JSON.stringify(protectedItems.map(item => ({ Text: item.text })))
    })
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`)
      error.status = response.status
      throw error
    }
    const payload = await response.json()
    if (!Array.isArray(payload) || payload.length !== values.length) {
      throw new Error('Translation response item count mismatch')
    }
    return payload.map((item, index) => {
      const translations = {}
      for (const translated of item.translations || []) {
        try {
          translations[translated.to] = restoreText(
            translated.text || '',
            protectedItems[index].protectedValues
          )
        } catch (error) {
          console.warn(
            `Preserving source for ${translated.to} item ${index}: ${error.message}`
          )
          translations[translated.to] = values[index]
        }
      }
      return translations
    })
  } catch (error) {
    if (activeProvider === 'auto' && (
      error.status === 401 || error.status === 403 || error.status === 404
    )) {
      activeProvider = 'bing'
      console.warn(`${error.message}; falling back to Bing Translator`)
      return requestBingTranslationMatrix(values, targetLanguages)
    }
    if (attempt >= 8) throw error
    if (error.status === 401 || error.status === 403) {
      await getTranslationToken(true)
    }
    const baseDelay = error.status === 429 ? 5000 : 1000
    await sleep(Math.min(baseDelay * (2 ** (attempt - 1)), 60000))
    return requestTranslationMatrix(values, targetLanguages, attempt + 1)
  }
}

function makeBatches(entries) {
  const batches = []
  let current = []
  let characters = 0
  for (const entry of entries) {
    const size = entry.source.length + 20
    if (current.length && (
      current.length >= batchItemLimit ||
      characters + size > batchCharacterLimit
    )) {
      batches.push(current)
      current = []
      characters = 0
    }
    current.push(entry)
    characters += size
  }
  if (current.length) batches.push(current)
  return batches
}

async function translateCandidateMatrix(candidateEntries, verifiedSame, phaseName) {
  const sourceByKey = new Map()
  const candidateKeys = {}
  const translatedByLocale = {}

  for (const [localeName, entries] of Object.entries(candidateEntries)) {
    candidateKeys[localeName] = new Set(entries.map(entry => entry.key))
    translatedByLocale[localeName] = {}
    entries.forEach(entry => sourceByKey.set(entry.key, entry.source))
  }

  const unionEntries = [...sourceByKey].map(([key, source]) => ({ key, source }))
  const batches = makeBatches(unionEntries)
  let completed = 0
  for (const batch of batches) {
    const activeLocales = activeLocaleNames.filter(localeName => (
      batch.some(entry => candidateKeys[localeName].has(entry.key))
    ))
    const targetLanguages = activeLocales.map(localeName => localeTargets[localeName])
    const matrix = await requestTranslationMatrix(
      batch.map(entry => entry.source),
      targetLanguages
    )
    batch.forEach((entry, index) => {
      for (const localeName of activeLocales) {
        if (!candidateKeys[localeName].has(entry.key)) continue
        const targetLanguage = localeTargets[localeName]
        const value = matrix[index][targetLanguage]
        if (typeof value !== 'string') {
          throw new Error(`${localeName}:${entry.key} missing from translation response`)
        }
        if (!placeholdersMatch(entry.source, value)) {
          throw new Error(`${localeName}:${entry.key} changed interpolation placeholders`)
        }
        translatedByLocale[localeName][entry.key] = value
        if (value === entry.source) verifiedSame[localeName].add(entry.key)
      }
    })
    completed += batch.length
    console.log(`${phaseName}: translated ${completed}/${unionEntries.length} unique strings`)
    await sleep(requestDelayMs)
  }
  return translatedByLocale
}

function replaceLocaleObject(source, locale, fileName) {
  const range = extractObjectRange(source, 'const locale =', fileName)
  const objectSource = `{\n${renderLocaleObject(locale)}\n}`
  return `${source.slice(0, range.start)}${objectSource}${source.slice(range.end)}`
}

async function loadOverrideModules() {
  return Promise.all(
    overrideModulePaths.map(modulePath => import(new URL(modulePath, import.meta.url)))
  )
}

function composeOverrides(modules, localeName) {
  return Object.assign({}, ...modules.map(module => module.default?.[localeName] || {}))
}

function renderGeneratedOverrides(messages, verifiedSame) {
  const renderedMessages = Object.entries(messages)
    .map(([localeName, locale]) => {
      const body = renderLocaleObject(locale)
        .split('\n')
        .map(line => `    ${line.trimStart()}`)
        .join('\n')
      return `  ${JSON.stringify(localeName)}: {\n${body}\n  }`
    })
    .join(',\n')

  const renderedVerified = Object.entries(verifiedSame)
    .map(([localeName, keys]) => (
      `  ${JSON.stringify(localeName)}: ${JSON.stringify([...keys].sort())}`
    ))
    .join(',\n')

  return `// Generated by scripts/translate-incomplete-locales.mjs.\n` +
    `// Machine-generated strings are reviewed by placeholder and completeness audits.\n` +
    `const messages = {\n${renderedMessages}\n}\n\n` +
    `export const verifiedSameTranslations = {\n${renderedVerified}\n}\n\n` +
    `export default messages\n`
}

if (process.env.QUANTDINGER_TRANSLATE_REBUILD_VERIFIED_ONLY === '1') {
  const generatedSource = readFileSync(outputPath, 'utf8')
  const generatedMessages = evaluateObject(
    generatedSource,
    'const messages =',
    'generated-locale-overrides.js'
  )
  const modules = await loadOverrideModules()
  const english = {
    ...loadCoreLocale(langDir, 'en-US').locale,
    ...composeOverrides(modules, 'en-US')
  }
  const verified = Object.fromEntries(
    activeLocaleNames.map(localeName => {
      const effective = {
        ...loadCoreLocale(langDir, localeName).locale,
        ...composeOverrides(modules, localeName),
        ...(generatedMessages[localeName] || {})
      }
      const keys = Object.entries(english)
        .filter(([key, source]) => (
          typeof source === 'string' &&
          isTranslatableText(source) &&
          effective[key] === source
        ))
        .map(([key]) => key)
      return [localeName, new Set(keys)]
    })
  )
  writeFileSync(outputPath, renderGeneratedOverrides(generatedMessages, verified), 'utf8')
  console.log(`Rebuilt verified same-language entries in ${outputPath}`)
  process.exit(0)
}

const coreLocales = {}
const verifiedSame = Object.fromEntries(
  Object.keys(localeTargets).map(localeName => [
    localeName,
    new Set([
      ...(existingVerifiedSameTranslations[localeName] || []),
      ...verifiedSameUiMessages,
      ...verifiedSameSettingsMessages,
      ...(verifiedSameHumanMessages[localeName] || [])
    ])
  ])
)
const enCore = loadCoreLocale(langDir, 'en-US').locale
coreLocales['en-US'] = enCore
const coreWork = {}
const coreCandidates = {}

for (const localeName of activeLocaleNames) {
  const filePath = join(langDir, `${localeName}.js`)
  const loaded = loadCoreLocale(langDir, localeName)
  const locale = { ...loaded.locale }
  const entries = Object.entries(enCore)
    .filter(([key, source]) => (
      isTranslatableText(source) &&
      (
        typeof locale[key] !== 'string' ||
        (locale[key] === source && !verifiedSame[localeName].has(key)) ||
        !placeholdersMatch(source, locale[key])
      )
    ))
    .map(([key, source]) => ({ key, source }))

  console.log(`${localeName}: ${entries.length} core strings need translation`)
  coreCandidates[localeName] = entries
  coreWork[localeName] = { filePath, loaded, locale }
}

const coreTranslations = await translateCandidateMatrix(
  coreCandidates,
  verifiedSame,
  'core locales'
)

for (const localeName of activeLocaleNames) {
  const { filePath, loaded, locale } = coreWork[localeName]
  Object.assign(locale, coreTranslations[localeName])
  for (const [key, source] of Object.entries(enCore)) {
    if (locale[key] === undefined) locale[key] = source
  }

  const localeOnly = evaluateObject(loaded.source, 'const locale =', `${localeName}.js`)
  const mergedLocaleOnly = { ...localeOnly, ...locale }
  writeFileSync(
    filePath,
    replaceLocaleObject(loaded.source, mergedLocaleOnly, `${localeName}.js`),
    'utf8'
  )
  coreLocales[localeName] = locale
}

const overrideModules = await loadOverrideModules()
translationToken = ''
const enOverrides = composeOverrides(overrideModules, 'en-US')
const finalEnglish = { ...enCore, ...enOverrides }
const generatedMessages = missingOnly ? { ...existingGeneratedMessages } : {}
const generatedSeeds = {}
const overrideCandidates = {}

for (const localeName of activeLocaleNames) {
  const existingOverrides = composeOverrides(overrideModules, localeName)
  const retainedGenerated = missingOnly
    ? (existingGeneratedMessages[localeName] || {})
    : {}
  const current = {
    ...coreLocales[localeName],
    ...existingOverrides,
    ...retainedGenerated
  }
  const generated = { ...retainedGenerated }
  const entries = []

  for (const [key, source] of Object.entries(finalEnglish)) {
    const target = current[key]
    if (typeof source !== 'string') {
      if (target === undefined) generated[key] = source
      continue
    }
    if (typeof target !== 'string') {
      if (isTranslatableText(source)) {
        entries.push({ key, source })
      } else {
        generated[key] = source
      }
    } else if (!placeholdersMatch(source, target)) {
      if (isTranslatableText(source)) {
        entries.push({ key, source })
      } else {
        generated[key] = source
      }
    } else if (
      target === source &&
      isTranslatableText(source) &&
      !verifiedSame[localeName].has(key)
    ) {
      entries.push({ key, source })
    }
  }

  console.log(`${localeName}: ${entries.length} effective override strings need translation`)
  generatedSeeds[localeName] = generated
  overrideCandidates[localeName] = entries
}

const overrideTranslations = await translateCandidateMatrix(
  overrideCandidates,
  verifiedSame,
  'effective overrides'
)

for (const localeName of activeLocaleNames) {
  generatedMessages[localeName] = {
    ...generatedSeeds[localeName],
    ...overrideTranslations[localeName]
  }

  // Rebuild the allow-list from the final effective locale instead of relying
  // only on values translated during this process. This also preserves
  // intentional technical terms when a missing-only run skips existing text.
  const finalLocale = {
    ...coreLocales[localeName],
    ...composeOverrides(overrideModules, localeName),
    ...generatedMessages[localeName]
  }
  for (const [key, source] of Object.entries(finalEnglish)) {
    if (
      typeof source === 'string' &&
      isTranslatableText(source) &&
      finalLocale[key] === source
    ) {
      verifiedSame[localeName].add(key)
    }
  }
}

writeFileSync(outputPath, renderGeneratedOverrides(generatedMessages, verifiedSame), 'utf8')
console.log(`Wrote complete locale overrides to ${outputPath}`)
