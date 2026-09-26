import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('backtest center exposes evolution as an isolated workspace', () => {
  const center = read('src/views/backtest-center/index.vue')
  const workspace = read('src/views/backtest-center/StrategyEvolution.vue')

  assert.match(center, /<a-radio-button value="evolution">\{\{ \$t\('strategyEvolution\.tab'\) \}\}<\/a-radio-button>/)
  assert.match(center, /<strategy-evolution v-if="mode === 'evolution'" @apply="applyEvolutionParams"/)
  assert.match(workspace, /data-testid="strategy-evolution"/)
  assert.match(workspace, /:class="\{ 'theme-dark': isDarkTheme \}"/)
  assert.match(workspace, /--evo-accent: var\(--primary-color, #52c41a\)/)
  assert.match(workspace, /background: var\(--evo-page\)/)
  assert.match(workspace, /chartPalette \(\)/)
  assert.match(workspace, /isDarkTheme \(\) \{ this\.refreshChartsForTheme\(\) \}/)
  assert.match(workspace, /primaryColor \(\) \{ this\.refreshChartsForTheme\(\) \}/)
  assert.match(workspace, /grid-template-columns: 310px minmax\(720px, 1fr\) 270px/)
})

test('evolution workspace uses durable jobs and exposes all robustness diagnostics', () => {
  const workspace = read('src/views/backtest-center/StrategyEvolution.vue')
  const api = read('src/api/strategy.js')

  assert.match(api, /strategyEvolutionJobs: '\/api\/strategy-evolution\/jobs'/)
  assert.match(api, /export function getStrategyEvolutionJobs/)
  assert.match(workspace, /initializeWorkspace \(\)/)
  assert.match(workspace, /this\.history\.find\(job => \['queued', 'running'\]\.includes\(job\.status\)\)/)
  assert.match(workspace, /historyTitle/)
  assert.match(workspace, /@change="selectSource"/)
  assert.match(workspace, /getStrategyEvolutionJobs\(params\)/)
  assert.match(workspace, /params\.sourceId = sourceId/)
  assert.match(workspace, /this\.jobId = ''/)
  assert.match(workspace, /await this\.pollStudy\(\)/)
  assert.match(workspace, /cancelStrategyEvolutionJob\(this\.jobId\)/)
  assert.match(workspace, /result\.validation\.pbo\.probability/)
  assert.match(workspace, /result\.validation\.deflatedSharpe\.probability/)
  assert.match(workspace, /monteCarloChart/)
  assert.match(workspace, /costChart/)
  assert.match(workspace, /heatmapChart/)
})

test('failed evolution jobs expose persisted diagnostics in history and workspace', () => {
  const workspace = read('src/views/backtest-center/StrategyEvolution.vue')
  const copy = read('src/locales/lang/strategy-evolution.js')

  assert.match(workspace, /progress\.failure\.activeTrainingTrials/)
  assert.match(workspace, /class="history-item__failure"/)
  assert.match(workspace, /failure\.messageKey/)
  assert.match(workspace, /counts\[failure\.dominantReason\]/)
  assert.match(copy, /strategyEvolution\.failure\.noValidationActivity/)
  assert.match(copy, /样本外验证区间没有产生交易/)
})

test('evolution workspace keeps controls fixed and estimates the active search plan', () => {
  const workspace = read('src/views/backtest-center/StrategyEvolution.vue')

  assert.match(workspace, /estimateStrategyEvolution\(this\.estimatePayload\(\)\)/)
  assert.match(workspace, /estimatedTrials/)
  assert.match(workspace, /applyDatePreset \(preset\)/)
  assert.match(workspace, /height: calc\(100vh - 148px\)/)
  assert.match(workspace, /\.evolution-runbar \{[^}]*flex: 0 0 auto/)
  assert.match(workspace, /\.evolution-scroll \{[^}]*overflow: auto/)
})

test('evolution workspace compiles the selected strategy and enforces its market-data range', () => {
  const workspace = read('src/views/backtest-center/StrategyEvolution.vue')

  assert.match(workspace, /compileScriptSource\(\{ sourceId \}\)/)
  assert.match(workspace, /this\.backtestRangePolicy = compiled\.data && compiled\.data\.backtestRangePolicy/)
  assert.match(workspace, /applyBacktestRangePolicy \(\)/)
  assert.match(workspace, /!this\.backtestRangeExceeded/)
  assert.match(workspace, /strategyEvolution\.rangeExceeded/)
})

test('evolution workspace loads recommended ranges and keeps them user editable within the strategy contract', () => {
  const workspace = read('src/views/backtest-center/StrategyEvolution.vue')
  const api = read('src/api/strategy.js')

  assert.match(api, /strategyEvolutionParameterSpace: '\/api\/strategy-evolution\/parameter-space'/)
  assert.match(workspace, /getStrategyEvolutionParameterSpace\(sourceId\)/)
  assert.match(workspace, /parameterContract\.parameters/)
  assert.match(workspace, /class="parameter-domain"/)
  assert.match(workspace, /strategyEvolution\.systemSampling/)
  assert.match(workspace, /updateParameterRange \(/)
  assert.match(workspace, /resetParameterRange \(/)
  assert.match(workspace, /:min="item\.min"/)
  assert.match(workspace, /:max="item\.max"/)
})

test('robustness rail displays diagnostic outcomes instead of simulation configuration counts', () => {
  const workspace = read('src/views/backtest-center/StrategyEvolution.vue')

  assert.match(workspace, /monteCarloMedian/)
  assert.match(workspace, /monteCarlo\.lossProbability/)
  assert.match(workspace, /deflatedSharpe\.observedSharpe/)
  assert.match(workspace, /worstCostStress\.return/)
  assert.doesNotMatch(workspace, /monteCarlo\.available \? result\.validation\.monteCarlo\.paths/)
})

test('strategy evolution copy is localized for every supported desktop locale', () => {
  const source = read('src/locales/lang/strategy-evolution.js')
  const localeIndex = read('src/locales/index.js')

  assert.match(source, /'strategyEvolution\.tab': 'Strategy Evolution'/)
  assert.match(source, /'strategyEvolution\.tab': '策略进化'/)
  assert.match(source, /\['ar-SA', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', 'th-TH', 'vi-VN'\]/)
  assert.match(localeIndex, /\.\.\.\(strategyEvolutionMessages\[lang\] \|\| \{\}\)/)
})
