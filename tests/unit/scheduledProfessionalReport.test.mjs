import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const noticeSource = fs.readFileSync(path.join(root, 'src/components/NoticeIcon/NoticeIcon.vue'), 'utf8')
const reportSource = fs.readFileSync(path.join(root, 'src/views/ai-analysis/components/ProfessionalAnalysisReport.vue'), 'utf8')

test('scheduled monitor notifications reuse the professional report component', () => {
  assert.match(noticeSource, /import\('@\/views\/ai-analysis\/components\/ProfessionalAnalysisReport\.vue'\)/)
  assert.match(noticeSource, /payload\.professional_reports/)
  assert.match(noticeSource, /item && item\.professional_report/)
  assert.match(noticeSource, /<ProfessionalAnalysisReport/)
})

test('dark scheduled reports use neutral surfaces instead of navy panels', () => {
  assert.match(noticeSource, /--qd-report-bg: #171717/)
  assert.match(noticeSource, /--qd-report-panel-bg: #242424/)
  assert.doesNotMatch(noticeSource, /--qd-report-bg: #0f1218/)
  assert.match(reportSource, /--report-bg: #121312/)
})
