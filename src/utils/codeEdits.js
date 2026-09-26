export class CodeEditConflictError extends Error {
  constructor (message) {
    super(message)
    this.name = 'CodeEditConflictError'
  }
}

const codeMirrorHighlightStates = new WeakMap()

function clearCodeMirrorEditHighlights (editor) {
  const state = codeMirrorHighlightStates.get(editor)
  if (!state) return
  if (state.timer) clearTimeout(state.timer)
  state.lines.forEach(line => {
    editor.removeLineClass(line, 'background', 'ai-code-edit-line')
    editor.removeLineClass(line, 'wrap', 'ai-code-edit-wrap')
  })
  codeMirrorHighlightStates.delete(editor)
}

function highlightCodeMirrorLines (editor, lineNumbers, durationMs) {
  if (typeof editor.addLineClass !== 'function' || typeof editor.removeLineClass !== 'function') return
  clearCodeMirrorEditHighlights(editor)
  const orderedLines = [...new Set(lineNumbers)].sort((left, right) => left - right)
  orderedLines.forEach(line => {
    editor.addLineClass(line, 'background', 'ai-code-edit-line')
    editor.addLineClass(line, 'wrap', 'ai-code-edit-wrap')
  })
  if (orderedLines.length && typeof editor.scrollIntoView === 'function') {
    editor.scrollIntoView({ line: orderedLines[0], ch: 0 }, 120)
  }
  const state = { lines: orderedLines, timer: null }
  codeMirrorHighlightStates.set(editor, state)
  if (durationMs <= 0) {
    clearCodeMirrorEditHighlights(editor)
    return
  }
  state.timer = setTimeout(() => clearCodeMirrorEditHighlights(editor), durationMs)
}

function highlightCodeMirrorEdits (editor, replacements, durationMs) {
  const lines = new Set()
  let offset = 0
  replacements.forEach(replacement => {
    const start = replacement.start + offset
    const end = start + replacement.newText.length
    const from = editor.posFromIndex(start)
    const to = editor.posFromIndex(end > start ? end - 1 : start)
    for (let line = from.line; line <= to.line; line += 1) lines.add(line)
    offset += replacement.newText.length - (replacement.end - replacement.start)
  })
  highlightCodeMirrorLines(editor, [...lines], durationMs)
}

function changedLineNumbers (before, after) {
  const previousLines = String(before || '').split('\n')
  const nextLines = String(after || '').split('\n')
  if (previousLines.length === nextLines.length) {
    return nextLines.reduce((lines, line, index) => {
      if (line !== previousLines[index]) lines.push(index)
      return lines
    }, [])
  }
  let prefix = 0
  while (prefix < previousLines.length && prefix < nextLines.length && previousLines[prefix] === nextLines[prefix]) {
    prefix += 1
  }
  let suffix = 0
  while (
    suffix < previousLines.length - prefix &&
    suffix < nextLines.length - prefix &&
    previousLines[previousLines.length - 1 - suffix] === nextLines[nextLines.length - 1 - suffix]
  ) {
    suffix += 1
  }
  const lastChangedLine = Math.max(prefix, nextLines.length - suffix - 1)
  const lines = []
  for (let line = prefix; line <= lastChangedLine; line += 1) lines.push(line)
  return lines
}

function normalizeOperation (operation) {
  if (!operation || typeof operation !== 'object') return null
  const oldText = operation.oldText != null ? operation.oldText : operation.old_text
  const newText = operation.newText != null ? operation.newText : operation.new_text
  if (typeof oldText !== 'string' || !oldText || typeof newText !== 'string') return null
  return { oldText, newText }
}

export function candidateCodeEditOperations (candidate) {
  const validation = candidate && candidate.validation
  const plan = validation && (validation.edit_plan || validation.editPlan)
  if (!plan || !Array.isArray(plan.operations)) return []
  return plan.operations.map(normalizeOperation).filter(Boolean)
}

export function resolveExactCodeEdits (source, operations) {
  const currentSource = String(source || '')
  const normalized = Array.isArray(operations)
    ? operations.map(normalizeOperation).filter(Boolean)
    : []
  if (!normalized.length) throw new CodeEditConflictError('No valid code edits were provided')

  const replacements = normalized.map(({ oldText, newText }) => {
    const start = currentSource.indexOf(oldText)
    if (start < 0) throw new CodeEditConflictError('A code edit no longer matches the current source')
    if (currentSource.indexOf(oldText, start + oldText.length) >= 0) {
      throw new CodeEditConflictError('A code edit matches more than one source location')
    }
    return { oldText, newText, start, end: start + oldText.length }
  }).sort((left, right) => left.start - right.start)

  for (let index = 1; index < replacements.length; index += 1) {
    if (replacements[index].start < replacements[index - 1].end) {
      throw new CodeEditConflictError('Code edits overlap')
    }
  }
  return replacements
}

export function applyExactCodeEdits (source, operations) {
  const currentSource = String(source || '')
  const replacements = resolveExactCodeEdits(currentSource, operations)
  const code = [...replacements].reverse().reduce((result, replacement) => (
    result.slice(0, replacement.start) + replacement.newText + result.slice(replacement.end)
  ), currentSource)
  return { code, replacements }
}

export function applyCodeEditsToCodeMirror (editor, operations, { highlightDuration = 8000 } = {}) {
  if (!editor || typeof editor.getValue !== 'function' || typeof editor.replaceRange !== 'function') {
    throw new CodeEditConflictError('The code editor is unavailable')
  }
  const currentSource = editor.getValue()
  const { code, replacements } = applyExactCodeEdits(currentSource, operations)
  const apply = () => {
    const ordered = [...replacements].reverse()
    ordered.forEach(replacement => {
      editor.replaceRange(
        replacement.newText,
        editor.posFromIndex(replacement.start),
        editor.posFromIndex(replacement.end),
        '+ai'
      )
    })
  }
  if (typeof editor.operation === 'function') editor.operation(apply)
  else apply()
  highlightCodeMirrorEdits(editor, replacements, highlightDuration)
  return code
}

export function setCodeMirrorValueWithHighlight (editor, code, { highlightDuration = 8000 } = {}) {
  if (!editor || typeof editor.getValue !== 'function' || typeof editor.setValue !== 'function') {
    throw new CodeEditConflictError('The code editor is unavailable')
  }
  const previousCode = editor.getValue()
  const nextCode = String(code || '')
  if (previousCode === nextCode) return nextCode
  const lines = changedLineNumbers(previousCode, nextCode)
  editor.setValue(nextCode)
  highlightCodeMirrorLines(editor, lines, highlightDuration)
  return nextCode
}
