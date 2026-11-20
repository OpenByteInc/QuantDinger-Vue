function escapeRegExp (value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function skipWhitespaceAndComments (source, start) {
  let index = start
  while (index < source.length) {
    if (/\s/.test(source[index])) {
      index += 1
      continue
    }
    if (source[index] === '#') {
      const newline = source.indexOf('\n', index)
      return newline === -1 ? source.length : skipWhitespaceAndComments(source, newline + 1)
    }
    break
  }
  return index
}

function skipInlineWhitespace (source, start) {
  let index = start
  while (index < source.length && /[\t\v\f ]/.test(source[index])) index += 1
  return index
}

function decodePythonStringBody (body, raw) {
  if (raw || !body.includes('\\')) return body

  let value = ''
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index]
    if (character !== '\\' || index + 1 >= body.length) {
      value += character
      continue
    }

    const escaped = body[index + 1]
    const commonEscapes = {
      a: '\u0007',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
      v: '\u000b',
      '\\': '\\',
      "'": "'",
      '"': '"'
    }
    if (Object.prototype.hasOwnProperty.call(commonEscapes, escaped)) {
      value += commonEscapes[escaped]
      index += 1
      continue
    }
    if (escaped === '\n') {
      index += 1
      continue
    }

    const unicodeWidths = { x: 2, u: 4, U: 8 }
    const width = unicodeWidths[escaped]
    if (width) {
      const digits = body.slice(index + 2, index + 2 + width)
      if (digits.length === width && /^[0-9a-fA-F]+$/.test(digits)) {
        const codePoint = Number.parseInt(digits, 16)
        if (codePoint <= 0x10ffff) {
          value += String.fromCodePoint(codePoint)
          index += width + 1
          continue
        }
      }
    }

    value += `\\${escaped}`
    index += 1
  }
  return value
}

function readPythonStringLiteral (source, start) {
  let index = start
  let prefix = ''
  while (index < source.length && /[rRuU]/.test(source[index]) && prefix.length < 2) {
    prefix += source[index]
    index += 1
  }

  const quote = source[index]
  if (quote !== "'" && quote !== '"') return null
  const delimiter = source.startsWith(quote.repeat(3), index) ? quote.repeat(3) : quote
  const bodyStart = index + delimiter.length
  index = bodyStart

  while (index < source.length) {
    if (source.startsWith(delimiter, index)) {
      return {
        value: decodePythonStringBody(source.slice(bodyStart, index), /r/i.test(prefix)),
        end: index + delimiter.length
      }
    }
    if (source[index] === '\\') {
      index += Math.min(2, source.length - index)
    } else {
      index += 1
    }
  }
  return null
}

export function extractIndicatorMetadataString (code, variableName) {
  const source = String(code || '')
  const identifier = String(variableName || '').trim()
  if (!source.trim() || !identifier) return ''

  const assignment = new RegExp(`^[\\t ]*${escapeRegExp(identifier)}[\\t ]*=[\\t ]*(?!=)`, 'm').exec(source)
  if (!assignment) return ''

  let index = skipWhitespaceAndComments(source, assignment.index + assignment[0].length)
  const parenthesized = source[index] === '('
  if (parenthesized) index = skipWhitespaceAndComments(source, index + 1)

  let value = ''
  let literalCount = 0
  while (index < source.length) {
    const literal = readPythonStringLiteral(source, index)
    if (!literal) break
    value += literal.value
    literalCount += 1
    index = parenthesized
      ? skipWhitespaceAndComments(source, literal.end)
      : skipInlineWhitespace(source, literal.end)
  }

  if (!literalCount) return ''
  if (parenthesized && source[index] !== ')') return ''
  if (!parenthesized) {
    const lineEnd = source.indexOf('\n', index)
    const remainder = source.slice(index, lineEnd === -1 ? source.length : lineEnd).trim()
    if (remainder && !remainder.startsWith('#')) return ''
  }
  return value.trim()
}
