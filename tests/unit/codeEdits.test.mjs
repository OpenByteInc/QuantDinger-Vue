import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CodeEditConflictError,
  applyCodeEditsToCodeMirror,
  applyExactCodeEdits,
  candidateCodeEditOperations,
  resolveExactCodeEdits,
  setCodeMirrorValueWithHighlight
} from '../../src/utils/codeEdits.js'

test('applies multiple exact code edits without replacing unrelated source', () => {
  const source = 'fast = 20\nslow = 60\nvalue = fast + slow\n'
  const result = applyExactCodeEdits(source, [
    { oldText: 'fast = 20', newText: 'fast = 10' },
    { oldText: 'value = fast + slow', newText: 'value = (fast + slow) / 2' }
  ])

  assert.equal(result.code, 'fast = 10\nslow = 60\nvalue = (fast + slow) / 2\n')
  assert.equal(result.replacements.length, 2)
})

test('reads edit operations from candidate validation plans', () => {
  const operations = candidateCodeEditOperations({
    validation: {
      edit_plan: {
        operations: [{ old_text: 'before', new_text: 'after' }]
      }
    }
  })

  assert.deepEqual(operations, [{ oldText: 'before', newText: 'after' }])
})

test('highlights every changed CodeMirror line and scrolls to the first edit', () => {
  let value = 'one\ntwo\n'
  const highlighted = []
  let scrolledTo = null
  const indexFromPos = position => {
    const lines = value.split('\n')
    let index = 0
    for (let line = 0; line < position.line; line += 1) index += lines[line].length + 1
    return index + position.ch
  }
  const editor = {
    getValue: () => value,
    posFromIndex: index => {
      const before = value.slice(0, index).split('\n')
      return { line: before.length - 1, ch: before[before.length - 1].length }
    },
    replaceRange: (text, from, to) => {
      value = value.slice(0, indexFromPos(from)) + text + value.slice(indexFromPos(to))
    },
    operation: callback => callback(),
    addLineClass: (line, where, className) => highlighted.push({ line, where, className }),
    removeLineClass: () => {},
    scrollIntoView: position => { scrolledTo = position }
  }

  const result = applyCodeEditsToCodeMirror(editor, [
    { oldText: 'two', newText: 'second\nthird' }
  ], { highlightDuration: 0 })

  assert.equal(result, 'one\nsecond\nthird\n')
  assert.deepEqual(
    highlighted.filter(item => item.className === 'ai-code-edit-line').map(item => item.line),
    [1, 2]
  )
  assert.deepEqual(scrolledTo, { line: 1, ch: 0 })
})

test('highlights line differences when a legacy full candidate is applied', () => {
  let value = 'alpha\nbeta\ngamma\ndelta'
  const highlighted = []
  let scrolledTo = null
  const editor = {
    getValue: () => value,
    setValue: code => { value = code },
    addLineClass: (line, where, className) => highlighted.push({ line, where, className }),
    removeLineClass: () => {},
    scrollIntoView: position => { scrolledTo = position }
  }

  const result = setCodeMirrorValueWithHighlight(
    editor,
    'alpha\nchanged\ngamma\nupdated',
    { highlightDuration: 0 }
  )

  assert.equal(result, 'alpha\nchanged\ngamma\nupdated')
  assert.deepEqual(
    highlighted.filter(item => item.className === 'ai-code-edit-line').map(item => item.line),
    [1, 3]
  )
  assert.deepEqual(scrolledTo, { line: 1, ch: 0 })
})

test('rejects stale, ambiguous, and overlapping edit anchors', () => {
  assert.throws(
    () => resolveExactCodeEdits('alpha', [{ oldText: 'missing', newText: 'beta' }]),
    CodeEditConflictError
  )
  assert.throws(
    () => resolveExactCodeEdits('same same', [{ oldText: 'same', newText: 'next' }]),
    CodeEditConflictError
  )
  assert.throws(
    () => resolveExactCodeEdits('abcdef', [
      { oldText: 'abcd', newText: 'x' },
      { oldText: 'cdef', newText: 'y' }
    ]),
    CodeEditConflictError
  )
})

test('strategy and indicator AI candidates use local editor edits', () => {
  const strategyEditor = readFileSync('src/views/strategy-ide/components/StrategyEditor.vue', 'utf8')
  const strategyPage = readFileSync('src/views/strategy-ide/index.vue', 'utf8')
  const indicatorPage = readFileSync('src/views/indicator-ide/index.vue', 'utf8')

  assert.match(strategyEditor, /applyCodeEditsToCodeMirror\(this\.editor, operations\)/)
  assert.match(strategyEditor, /setCodeMirrorValueWithHighlight\(this\.editor, code\)/)
  assert.match(strategyPage, /editor\.applyCodeEdits\(operations\)/)
  assert.match(strategyPage, /await this\.autoApplyStrategyAiCandidate\(\)/)
  assert.match(strategyPage, /markLatestStrategyAiCandidateApplied\(\)/)
  assert.match(indicatorPage, /applyCodeEditsToCodeMirror\(this\.cmInstance, operations\)/)
  assert.match(indicatorPage, /await this\.autoApplyAiCandidate\(\)/)
  assert.match(indicatorPage, /markLatestAiCandidateApplied\(\)/)
  assert.match(indicatorPage, /requestBody\.existingCode = existingCode/)
})
