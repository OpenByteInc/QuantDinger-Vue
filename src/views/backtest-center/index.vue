<template>
  <div class="backtest-page qd-workspace-page" :class="{ 'theme-dark': isDarkTheme }" data-testid="backtest-center">
    <section class="workspace-toolbar">
      <div class="workspace-toolbar__primary">
        <a-radio-group v-model="mode" class="workspace-mode-tabs" button-style="solid" data-testid="research-mode-switch">
          <a-radio-button value="portfolio">{{ $t('strategyV2.backtest.mode.portfolio') }}</a-radio-button>
          <a-radio-button value="factor">{{ $t('strategyV2.backtest.mode.factor') }}</a-radio-button>
          <a-radio-button value="evolution">{{ $t('strategyEvolution.tab') }}</a-radio-button>
        </a-radio-group>
        <span v-if="mode !== 'factor'" class="workspace-toolbar__context">{{ $t('backtest-center.title') }} · {{ modeContextLabel }}</span>
        <div v-else class="workspace-factor-mode" data-testid="factor-research-mode-chooser">
          <span class="workspace-factor-mode__label">{{ $t('strategyV2.factorResearch.currentWorkflow') }}</span>
          <div class="factor-mode-compact">
            <a-tooltip :title="$t('strategyV2.factorResearch.singleModeDesc')" placement="bottom">
              <button
                type="button"
                class="factor-mode-compact__button"
                :class="{ active: factorResearchMode === 'single' }"
                :aria-pressed="factorResearchMode === 'single'"
                data-testid="factor-mode-single"
                @click="selectFactorResearchMode('single')"
              >
                <a-icon type="line-chart" />
                <span>{{ $t('strategyV2.factorResearch.singleMode') }}</span>
                <b>{{ factorHistory.length }}</b>
              </button>
            </a-tooltip>
            <a-tooltip :title="$t('strategyV2.factorResearch.benchmarkModeDesc')" placement="bottom">
              <button
                type="button"
                class="factor-mode-compact__button"
                :class="{ active: factorResearchMode === 'benchmark' }"
                :aria-pressed="factorResearchMode === 'benchmark'"
                data-testid="factor-mode-benchmark"
                @click="selectFactorResearchMode('benchmark')"
              >
                <a-icon type="experiment" />
                <span>{{ $t('strategyV2.factorResearch.benchmarkMode') }}</span>
                <b>{{ factorBenchmarkHistory.length }}</b>
              </button>
            </a-tooltip>
          </div>
        </div>
      </div>
      <div v-if="mode !== 'evolution'" class="hero-actions">
        <span class="hero-stat"><strong>{{ mode === 'factor' ? researchableUniverses.length : availableSources.length }}</strong>{{ mode === 'factor' ? $t('strategyV2.factorResearch.eligibleUniverses') : $t('strategyV2.backtest.sources') }}</span>
        <span class="hero-stat"><strong>{{ mode === 'factor' ? totalFactorHistoryCount : history.length }}</strong>{{ mode === 'factor' ? $t('strategyV2.factorResearch.runs') : $t('strategyV2.backtest.runs') }}</span>
        <a-tooltip :title="settingsVisible ? $t('backtestWorkbench.hideSettings') : $t('backtestWorkbench.advancedSettings')">
          <a-button
            icon="control"
            :type="settingsVisible ? 'primary' : 'default'"
            :aria-label="settingsVisible ? $t('backtestWorkbench.hideSettings') : $t('backtestWorkbench.advancedSettings')"
            @click="settingsVisible = !settingsVisible"
          />
        </a-tooltip>
        <a-button icon="reload" :loading="historyLoading" @click="refreshPage">
          {{ $t('backtest-center.refreshHistory') }}
        </a-button>
        <a-button icon="history" @click="openHistoryDrawer">
          {{ historyButtonLabel }}
        </a-button>
      </div>
    </section>

    <strategy-evolution v-if="mode === 'evolution'" @apply="applyEvolutionParams" />
    <template v-else>
      <div class="workspace-grid" :class="{ 'settings-open': settingsVisible }">
        <section v-show="settingsVisible" class="panel config-panel">
          <div class="config-scroll">
            <section class="config-section config-section--source">
              <div class="panel-heading config-section__heading">
                <div>
                  <span class="step-badge">1</span>
                  <h2>{{ mode === 'factor' ? $t('strategyV2.factorResearch.universeTitle') : $t('strategyV2.sourceTitle') }}</h2>
                </div>
                <a-tag v-if="mode === 'factor' ? selectedUniverse : manifest" class="theme-ready-tag">{{ $t('strategyV2.backtest.ready') }}</a-tag>
              </div>
              <a-radio-group
                v-if="mode === 'portfolio'"
                v-model="sourceCategory"
                class="source-category-switch"
                button-style="solid"
                size="small"
                data-testid="backtest-source-category"
                @change="handleSourceCategoryChange"
              >
                <a-radio-button value="all">
                  {{ $t('strategyV2.backtest.sourceCategoryAll') }} {{ sources.length }}
                </a-radio-button>
                <a-radio-button value="script">
                  {{ $t('strategyV2.cta') }} {{ ctaSources.length }}
                </a-radio-button>
                <a-radio-button value="portfolio_strategy" :title="$t('strategyV2.portfolio')">
                  {{ $t('strategyV2.portfolio') }} {{ portfolioSources.length }}
                </a-radio-button>
              </a-radio-group>
              <a-select
                v-if="mode === 'factor'"
                v-model="factorForm.universeId"
                class="full-width"
                show-search
                option-filter-prop="children"
                data-testid="factor-universe-select"
                :loading="universesLoading"
                :placeholder="$t('strategyV2.factorResearch.universePlaceholder')"
                @change="handleFactorResearchContextChange"
              >
                <a-select-option v-for="item in researchableUniverses" :key="item.id" :value="item.id">
                  {{ universeName(item) }} · {{ item.market }} · {{ $t('strategyV2.symbolCount', { count: item.member_count }) }}
                </a-select-option>
              </a-select>
              <a-select
                v-else
                v-model="form.sourceId"
                class="full-width"
                show-search
                option-filter-prop="children"
                data-testid="backtest-source-select"
                :loading="sourcesLoading"
                :placeholder="$t('backtest-center.strategyPlaceholder')"
                @change="selectSource"
                @dropdownVisibleChange="onSourceDropdownVisibleChange"
              >
                <a-select-option v-for="item in availableSources" :key="item.id" :value="item.id">
                  {{ item.name }} · {{ sourceTypeLabel(item) }}
                </a-select-option>
              </a-select>
              <a-alert
                v-if="mode === 'portfolio' && sourceCategory === 'portfolio_strategy' && !portfolioSources.length"
                class="source-empty-alert"
                type="info"
                show-icon
                :message="$t('strategyV2.backtest.noPortfolioSourceTitle')"
                :description="$t('strategyV2.backtest.noPortfolioSourceHint')"
              />

              <div v-if="mode === 'factor' && selectedUniverse" class="manifest-card">
                <div class="manifest-title">
                  <a-icon type="global" />
                  {{ $t('strategyV2.factorResearch.universeMode') }}
                </div>
                <div class="manifest-grid">
                  <div><span>{{ $t('strategyV2.factorResearch.universe') }}</span><strong>{{ factorUniverseLabel }}</strong></div>
                  <div><span>{{ $t('strategyV2.markets') }}</span><strong>{{ selectedUniverse.market || '-' }}</strong></div>
                  <div><span>{{ $t('strategyV2.factorResearch.members') }}</span><strong>{{ selectedUniverse.member_count }}</strong></div>
                  <div><span>{{ $t('strategyV2.frequency') }}</span><strong>{{ manifestFrequency }}</strong></div>
                </div>
              </div>
              <div v-else-if="mode === 'portfolio' && manifest" class="manifest-card">
                <div class="manifest-title">
                  <a-icon type="safety-certificate" />
                  {{ $t('strategyV2.manifestTitle') }}
                </div>
                <div class="manifest-grid">
                  <div><span>{{ $t('strategyV2.strategyType') }}</span><strong>{{ strategyTypeLabel }}</strong></div>
                  <div><span>{{ $t('strategyV2.frequency') }}</span><strong>{{ manifestFrequency }}</strong></div>
                  <div><span>{{ $t('strategyV2.markets') }}</span><strong>{{ (manifest.markets || []).join(', ') || '-' }}</strong></div>
                  <div><span>{{ $t('strategyV2.universe') }}</span><strong>{{ universeLabel }}</strong></div>
                </div>
              </div>
            </section>
            <a-form layout="vertical">
              <section class="config-section config-section--runtime">
                <div class="panel-heading config-section__heading">
                  <div>
                    <span class="step-badge">2</span>
                    <h2>{{ mode === 'factor' ? $t('strategyV2.factorResearch.runtimeTitle') : $t('strategyV2.runtimeTitle') }}</h2>
                  </div>
                </div>
                <p class="section-hint config-section__hint">{{ mode === 'factor' ? $t('strategyV2.factorResearch.runtimeHint') : $t('strategyV2.runtimeHint') }}</p>
                <div class="date-range-card">
                  <div class="range-presets" data-testid="backtest-range-presets">
                    <span class="range-presets__label">{{ $t('backtest-center.quickRange.label') }}</span>
                    <div class="range-presets__buttons">
                      <a-tooltip v-for="preset in rangePresetOptions" :key="preset.key" :title="preset.tooltip">
                        <span class="range-preset-wrap">
                          <a-button
                            size="small"
                            :type="preset.active ? 'primary' : 'default'"
                            :disabled="preset.disabled"
                            :aria-pressed="preset.active ? 'true' : 'false'"
                            :data-testid="`backtest-range-${preset.key}`"
                            @click="applyRangePreset(preset)"
                          >
                            {{ preset.label }}
                          </a-button>
                        </span>
                      </a-tooltip>
                    </div>
                  </div>
                  <div class="date-range-fields">
                    <a-form-item :label="$t('backtest-center.startDate')">
                      <a-date-picker v-model="form.startDate" :disabled-date="disabledStartDate" class="full-width" />
                    </a-form-item>
                    <span class="date-range-arrow"><a-icon type="arrow-right" /></span>
                    <a-form-item :label="$t('backtest-center.endDate')">
                      <a-date-picker v-model="form.endDate" :disabled-date="disabledEndDate" class="full-width" />
                    </a-form-item>
                  </div>
                  <div
                    v-if="backtestRangeLimitDays !== null"
                    class="range-policy-note"
                    :class="{ 'is-error': backtestRangeExceeded }"
                  >
                    <a-icon :type="backtestRangeExceeded ? 'warning' : 'info-circle'" />
                    <div>
                      <strong>{{ backtestRangeAlertTitle }}</strong>
                      <span>{{ backtestRangeAlertDescription }}</span>
                    </div>
                  </div>
                </div>

                <div class="form-grid">
                  <a-form-item v-if="mode === 'portfolio'" :label="$t('backtest-center.initialCapital')">
                    <a-input-number v-model="form.initialCapital" :min="10" class="full-width" />
                  </a-form-item>
                  <a-form-item :label="$t('backtest-center.commission')">
                    <a-input-number v-model="form.commission" :min="0" :max="1" :step="0.0001" class="full-width" />
                  </a-form-item>
                  <a-form-item :label="$t('backtest-center.slippage')">
                    <a-input-number v-model="form.slippage" :min="0" :max="1" :step="0.0001" class="full-width" />
                  </a-form-item>
                  <a-form-item v-if="mode === 'portfolio'" :label="$t('strategyV2.leverageEnabled')">
                    <div class="switch-row">
                      <a-switch v-model="form.leverageEnabled" :disabled="!leverageAllowed" />
                      <span>{{ leverageAllowed ? $t('strategyV2.backtest.optional') : $t('strategyV2.codeOwned') }}</span>
                    </div>
                  </a-form-item>
                  <a-form-item v-if="mode === 'portfolio' && form.leverageEnabled" :label="$t('strategyV2.leverageMultiplier')">
                    <a-input-number v-model="form.leverage" :min="1" :max="maxLeverage" :step="0.5" class="full-width" />
                  </a-form-item>
                </div>
              </section>

              <section v-if="mode === 'portfolio' && paramDefinitions.length" class="config-section params-section">
                <div class="subheading config-section__heading">
                  <div>
                    <span class="step-badge">3</span>
                    <h3>{{ $t('backtest-center.codeParams') }}</h3>
                  </div>
                  <span>{{ $t('strategyV2.backtest.paramCount', { count: paramDefinitions.length }) }}</span>
                </div>
                <div class="form-grid">
                  <a-form-item v-for="item in paramDefinitions" :key="item.name" :label="parameterLabel(item)">
                    <a-switch
                      v-if="item.type === 'boolean'"
                      :checked="Boolean(params[item.name])"
                      @change="value => setParam(item.name, value)"
                    />
                    <a-input-number
                      v-else-if="['integer', 'number', 'percent'].includes(item.type)"
                      :value="params[item.name]"
                      :min="item.min"
                      :max="item.max"
                      :step="item.step || 1"
                      :formatter="item.type === 'percent' ? formatRatioPercent : undefined"
                      :parser="item.type === 'percent' ? parseRatioPercent : undefined"
                      class="full-width"
                      @change="value => setParam(item.name, value)"
                    />
                    <a-select
                      v-else-if="parameterOptions(item).length"
                      :value="params[item.name]"
                      class="full-width"
                      @change="value => setParam(item.name, value)"
                    >
                      <a-select-option v-for="option in parameterOptions(item)" :key="String(option.value)" :value="option.value">
                        {{ parameterOptionLabel(item, option) }}
                      </a-select-option>
                    </a-select>
                    <a-input v-else :value="params[item.name]" @input="event => setParam(item.name, event.target.value)" />
                    <div v-if="parameterDescription(item)" class="param-description">{{ parameterDescription(item) }}</div>
                  </a-form-item>
                </div>
                <p class="section-hint">{{ $t('strategyBuilder.sourceContractHint') }}</p>
              </section>

              <section v-if="mode === 'factor'" class="config-section params-section factor-settings">
                <div class="subheading config-section__heading">
                  <div>
                    <span class="step-badge">3</span>
                    <h3>{{ $t('strategyV2.factorResearch.settings') }}</h3>
                  </div>
                  <span>{{ $t('strategyV2.factorResearch.universeMode') }}</span>
                </div>
                <div class="factor-contract-note">
                  <a-icon type="info-circle" />
                  <div>
                    <strong>{{ $t('strategyV2.factorResearch.universeMode') }}</strong>
                    <span>{{ $t('strategyV2.factorResearch.universeModeDesc') }}</span>
                  </div>
                </div>
                <div v-if="factorResearchMode === 'benchmark'" class="benchmark-selection-summary">
                  <span><a-icon type="experiment" /></span>
                  <div>
                    <strong>{{ $t('strategyV2.factorResearch.validationControls') }}</strong>
                    <small>{{ $t('strategyV2.factorResearch.selectedFactorsCount', { count: benchmarkFactorIds.length }) }}</small>
                  </div>
                  <em>{{ benchmarkFactorIds.length }}</em>
                </div>
                <div class="form-grid">
                  <a-form-item :label="$t('strategyV2.factorResearch.frequency')">
                    <a-select v-model="factorForm.frequency" class="full-width" @change="handleFactorResearchContextChange">
                      <a-select-option v-for="frequency in factorFrequencyOptions" :key="frequency" :value="frequency">
                        {{ frequency }}
                      </a-select-option>
                    </a-select>
                  </a-form-item>
                  <a-form-item v-if="factorResearchMode === 'single'" :label="$t('strategyV2.factorResearch.factor')">
                    <a-select
                      v-model="factorForm.factorId"
                      class="full-width"
                      show-search
                      option-filter-prop="children"
                      :loading="factorCatalogLoading"
                      @change="handleResearchFactorChange"
                    >
                      <a-select-option v-for="factor in researchFactorOptions" :key="factor.factor_id" :value="factor.factor_id">
                        {{ researchFactorName(factor) }} · {{ factor.factor_id }}
                      </a-select-option>
                    </a-select>
                  </a-form-item>
                  <a-form-item v-else :label="$t('strategyV2.factorResearch.benchmarkFactors')">
                    <a-select
                      v-model="benchmarkFactorIds"
                      mode="multiple"
                      class="full-width"
                      show-search
                      option-filter-prop="children"
                      :loading="factorCatalogLoading"
                      :placeholder="$t('strategyV2.factorResearch.benchmarkFactorsPlaceholder')"
                      @change="handleFactorResearchContextChange"
                    >
                      <a-select-option v-for="factor in researchFactorOptions" :key="factor.factor_id" :value="factor.factor_id">
                        {{ researchFactorName(factor) }} · {{ factor.factor_id }}
                      </a-select-option>
                    </a-select>
                  </a-form-item>
                  <a-form-item
                    v-if="factorResearchMode === 'single'"
                    v-for="entry in researchFactorParameterEntries"
                    :key="entry[0]"
                    :label="entry[0]"
                  >
                    <a-select
                      v-if="researchFactorParameterSchema(entry[0]).type === 'enum'"
                      :value="factorParams[entry[0]]"
                      class="full-width"
                      @change="setResearchFactorParam(entry[0], $event)"
                    >
                      <a-select-option
                        v-for="option in researchFactorParameterSchema(entry[0]).options"
                        :key="option"
                        :value="option"
                      >{{ option }}</a-select-option>
                    </a-select>
                    <a-switch
                      v-else-if="researchFactorParameterSchema(entry[0]).type === 'boolean'"
                      :checked="factorParams[entry[0]]"
                      @change="setResearchFactorParam(entry[0], $event)"
                    />
                    <a-input-number
                      v-else-if="['integer', 'number'].includes(researchFactorParameterSchema(entry[0]).type)"
                      :value="factorParams[entry[0]]"
                      :min="researchFactorParameterSchema(entry[0]).minimum"
                      :max="researchFactorParameterSchema(entry[0]).maximum"
                      :step="researchFactorParameterSchema(entry[0]).step"
                      :precision="researchFactorParameterSchema(entry[0]).type === 'integer' ? 0 : undefined"
                      class="full-width"
                      @change="setResearchFactorParam(entry[0], $event)"
                    />
                    <a-input
                      v-else
                      :value="factorParams[entry[0]]"
                      @change="setResearchFactorParam(entry[0], $event.target.value)"
                    />
                  </a-form-item>
                  <a-form-item v-if="factorResearchMode === 'benchmark'" :label="$t('strategyV2.factorResearch.trainFraction')">
                    <a-input-number v-model="benchmarkValidation.trainFraction" :min="0.5" :max="0.8" :step="0.05" class="full-width" />
                  </a-form-item>
                  <a-form-item v-if="factorResearchMode === 'benchmark'" :label="$t('strategyV2.factorResearch.falseDiscoveryRate')">
                    <a-input-number v-model="benchmarkValidation.falseDiscoveryRate" :min="0.01" :max="0.5" :step="0.01" class="full-width" />
                  </a-form-item>
                  <a-form-item v-if="factorResearchMode === 'benchmark'" :label="$t('strategyV2.factorResearch.minimumOosIc')">
                    <a-input-number v-model="benchmarkValidation.minimumAbsOosIc" :min="0" :max="1" :step="0.01" class="full-width" />
                  </a-form-item>
                  <a-form-item :label="$t('strategyV2.factorResearch.groups')">
                    <a-input-number v-model="factorForm.groups" :min="2" :max="10" class="full-width" />
                  </a-form-item>
                  <a-form-item :label="$t('strategyV2.factorResearch.holdingPeriod')">
                    <a-input-number v-model="factorForm.holdingPeriod" :min="1" :max="60" class="full-width" />
                  </a-form-item>
                  <a-form-item :label="$t('strategyV2.factorResearch.industryNeutralization')">
                    <div class="switch-row"><a-switch v-model="factorForm.neutralizeIndustry" /><span>{{ $t('strategyV2.factorResearch.neutralizationHint') }}</span></div>
                  </a-form-item>
                </div>
              </section>

              <div v-if="fundamentalDependencies.length" class="dependency-summary">
                <a-icon type="warning" />
                <div>
                  <strong>{{ $t('strategyV2.backtest.fundamentalDependencyTitle') }}</strong>
                  <span>{{ fundamentalDependencies.join(', ') }}</span>
                </div>
                <a-tooltip :title="$t('strategyV2.backtest.fundamentalDependencyHint', { fields: fundamentalDependencies.join(', ') })">
                  <a-icon type="question-circle" />
                </a-tooltip>
              </div>

            </a-form>
          </div>
          <div class="run-action-bar">
            <a-button
              type="primary"
              block
              size="large"
              icon="thunderbolt"
              data-testid="run-backtest"
              :disabled="runDisabled"
              :loading="running"
              @click="runActive"
            >
              {{ mode === 'portfolio' ? $t('backtest-center.runBacktest') : factorRunLabel }}
            </a-button>
          </div>
        </section>

        <section class="panel result-panel">
          <div class="panel-heading result-heading">
            <div>
              <h2>{{ mode === 'factor' ? $t('strategyV2.factorResearch.workspace') : $t('backtest-center.resultOverview') }}</h2>
              <span v-if="mode === 'factor' ? selectedUniverse : source" class="result-source-name">{{ mode === 'factor' ? factorUniverseLabel : source.name }}</span>
            </div>
            <span v-if="selectedRun" class="run-id">{{ selectedRunLabel }}</span>
          </div>

          <div v-if="running && !activeResult" class="result-running" data-testid="backtest-running" aria-live="polite">
            <div class="running-icon"><a-icon type="loading" /></div>
            <h3>{{ currentProgressLabel }}</h3>
            <p>{{ mode === 'factor' ? $t('strategyV2.factorResearch.runningDesc') : $t('strategyV2.backtest.runningDesc') }}</p>
            <a-progress class="run-progress" :percent="runProgressPercent" :show-info="true" status="active" />
            <strong>{{ $t('strategyV2.backtest.elapsed', { seconds: runElapsedSeconds }) }}</strong>
            <div class="running-contract">
              <span><a-icon type="check-circle" />{{ mode === 'factor' ? $t('strategyV2.factorResearch.universeCheck') : $t('strategyV2.backtest.sourceCheck') }}</span>
              <span><a-icon type="database" />{{ mode === 'factor' ? $t('strategyV2.factorResearch.pointInTimeExecution') : $t('strategyV2.backtest.serverExecution') }}</span>
              <span><a-icon type="safety-certificate" />{{ mode === 'factor' ? $t('strategyV2.factorResearch.metricsBeforeReturn') : $t('strategyV2.backtest.auditBeforeReturn') }}</span>
            </div>
          </div>

          <div v-else-if="!activeResult" class="result-empty" data-testid="backtest-empty">
            <div class="empty-hero-card">
              <div class="empty-orbit"><a-icon type="line-chart" /></div>
              <h3>{{ emptyResultTitle }}</h3>
              <p>{{ emptyResultDescription }}</p>
              <div class="empty-checks">
                <span :class="{ done: mode === 'factor' ? selectedUniverse : manifest }"><a-icon :type="(mode === 'factor' ? selectedUniverse : manifest) ? 'check-circle' : 'clock-circle'" />{{ mode === 'factor' ? $t('strategyV2.factorResearch.universeCheck') : $t('strategyV2.backtest.sourceCheck') }}</span>
                <span><a-icon type="safety-certificate" />{{ mode === 'factor' ? $t('strategyV2.factorResearch.crossSectionCheck') : $t('strategyV2.backtest.safeFill') }}</span>
                <span><a-icon type="database" />{{ $t('strategyV2.backtest.persisted') }}</span>
              </div>
            </div>
            <div v-if="mode === 'factor' ? selectedUniverse : manifest" class="empty-preview-grid">
              <div class="empty-preview-card">
                <a-icon :type="mode === 'factor' ? 'global' : 'code'" />
                <span>{{ mode === 'factor' ? $t('strategyV2.factorResearch.universe') : $t('strategyV2.sourceTitle') }}</span>
                <strong>{{ mode === 'factor' ? factorUniverseLabel : (source && source.name) }}</strong>
              </div>
              <div class="empty-preview-card">
                <a-icon type="global" />
                <span>{{ mode === 'factor' ? $t('strategyV2.markets') : $t('strategyV2.universe') }}</span>
                <strong>{{ mode === 'factor' ? (selectedUniverse && selectedUniverse.market) : universeLabel }}</strong>
              </div>
              <div class="empty-preview-card">
                <a-icon type="clock-circle" />
                <span>{{ $t('strategyV2.frequency') }}</span>
                <strong>{{ manifestFrequency }}</strong>
              </div>
            </div>
          </div>

          <template v-else>
            <div v-if="running" class="result-progress-strip" aria-live="polite">
              <div>
                <a-icon type="loading" />
                <strong>{{ currentProgressLabel }}</strong>
                <span>{{ $t('strategyV2.backtest.elapsed', { seconds: runElapsedSeconds }) }}</span>
              </div>
              <a-progress :percent="runProgressPercent" :show-info="false" status="active" />
            </div>
            <portfolio-result v-if="mode === 'portfolio'" :result="result" :is-dark="isDarkTheme" />
            <factor-benchmark-result v-else-if="factorResult && factorResult.researchMode === 'benchmark'" :result="factorResult" :is-dark="isDarkTheme" />
            <factor-research-result v-else :result="factorResult" :is-dark="isDarkTheme" />
          </template>
        </section>
      </div>
    </template>

    <a-drawer
      v-if="mode !== 'evolution'"
      :visible="historyVisible"
      :title="historyDrawerTitle"
      placement="right"
      width="430"
      :wrap-class-name="isDarkTheme ? 'backtest-history-drawer theme-dark' : 'backtest-history-drawer'"
      :destroy-on-close="false"
      @close="historyVisible = false"
    >
      <a-radio-group
        v-if="mode === 'factor'"
        v-model="factorHistoryView"
        class="factor-history-switch"
        button-style="solid"
        data-testid="factor-history-filter"
      >
        <a-radio-button value="all">{{ $t('strategyV2.factorResearch.historyAll') }} <b>{{ totalFactorHistoryCount }}</b></a-radio-button>
        <a-radio-button value="single">{{ $t('strategyV2.factorResearch.historySingle') }} <b>{{ factorHistory.length }}</b></a-radio-button>
        <a-radio-button value="benchmark">{{ $t('strategyV2.factorResearch.historyBenchmark') }} <b>{{ factorBenchmarkHistory.length }}</b></a-radio-button>
      </a-radio-group>
      <div class="drawer-history-header" data-testid="backtest-history">
        <p>{{ historyDrawerDescription }}</p>
        <a-button icon="reload" size="small" :loading="historyLoading" @click="refreshCurrentHistory">
          {{ $t('backtest-center.refreshHistory') }}
        </a-button>
      </div>
      <div v-if="historyDetailLoading" class="drawer-detail-loading" role="status" aria-live="polite">
        <a-icon type="loading" />
        <span>{{ historyDetailLoadingText }}</span>
      </div>
      <a-empty v-if="!historyLoading && !history.length" :description="mode === 'factor' ? $t('strategyV2.factorResearch.noHistory') : $t('strategyV2.backtest.noHistory')" />
      <div v-else class="drawer-run-list">
        <button
          v-for="item in history"
          :key="historyItemKey(item)"
          type="button"
          class="run-card"
          :class="{
            active: isHistoryItemActive(item),
            loading: historyDetailLoading && historyDetailRunId === historyItemKey(item),
            'run-card--benchmark': item.history_type === 'benchmark'
          }"
          :disabled="historyDetailLoading"
          @click="openRun(item)"
        >
          <span class="run-card__top">
            <strong><a-icon v-if="historyDetailLoading && historyDetailRunId === historyItemKey(item)" type="loading" />{{ mode === 'factor' ? (item.universe_name || item.source_name || item.factor_id) : (item.strategy_name || item.symbol) }}</strong>
            <em>{{ historyRunLabel(item) }}</em>
          </span>
          <span class="run-card__meta">{{ item.market }} · {{ item.timeframe }} · {{ formatDate(item.created_at) }}</span>
          <template v-if="mode === 'factor'">
            <span class="history-kind-pill" :class="`history-kind-pill--${item.history_type || 'single'}`">
              <a-icon :type="item.history_type === 'benchmark' ? 'experiment' : 'line-chart'" />
              {{ $t(item.history_type === 'benchmark' ? 'strategyV2.factorResearch.historyTypeBenchmark' : 'strategyV2.factorResearch.historyTypeSingle') }}
            </span>
            <template v-if="item.history_type === 'benchmark'">
              <span class="run-card__status status-complete">{{ $t('strategyV2.factorResearch.factorsCompleted', { completed: item.completed_count, total: item.factor_count }) }} · {{ $t('strategyV2.factorResearch.validatedFactors', { count: item.validated_count }) }}</span>
              <span class="run-card__metrics factor-history-metrics">
                <b>{{ $t('strategyV2.factorResearch.historyBestFactor', { factor: item.best_factor_id || '-' }) }}</b>
                <small>{{ $t('strategyV2.factorResearch.score') }} {{ formatNumber(item.best_score, 1) }} · {{ $t('strategyV2.factorResearch.failedFactorsCount', { count: item.failed_count || 0 }) }}</small>
              </span>
            </template>
            <template v-else>
              <span class="run-card__status status-complete">{{ factorLabel(item.factor_id) }} · {{ item.groups_count }}Q · {{ item.holding_period }}{{ $t('strategyV2.factorResearch.bars') }}</span>
              <span class="run-card__metrics factor-history-metrics">
                <b :class="factorTone(item.rank_ic)">IC {{ formatSignedNumber(item.rank_ic, 4) }}</b>
                <small>{{ $t('strategyV2.factorResearch.icir') }} {{ formatNumber(item.icir, 3) }} · {{ $t('strategyV2.factorResearch.netLongShort') }} {{ formatRate(item.net_long_short_return) }}</small>
              </span>
            </template>
          </template>
          <template v-else>
            <span class="run-card__status" :class="`status-${item.result_status || 'unknown'}`">{{ historyStatusLabel(item) }}</span>
            <span class="run-card__metrics">
              <b :class="historyReturnTone(item)">{{ formatPercent(item.total_return) }}</b>
              <small>{{ $t('strategyV2.backtest.executions') }} {{ item.total_executions || 0 }} · {{ $t('strategyV2.backtest.closedTrades') }} {{ item.total_trades || 0 }}</small>
            </span>
          </template>
        </button>
      </div>
    </a-drawer>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import moment from 'moment'
import { mapState } from 'vuex'
import { calculateTradeValueUsd } from '@/utils/tradeReview'
import { timestampMillisecondsUtc } from '@/utils/utcInstant'
import { formatBacktestTime } from '@/utils/userTime'
import {
  compileScriptSource,
  getScriptSourceDetail,
  getScriptSourceList,
  getStrategyFactorBenchmarkHistory,
  getStrategyFactorBenchmarkRun,
  getStrategyFactorResearchHistory,
  getStrategyFactorResearchRun,
  getStrategyBacktestHistory,
  getStrategyBacktestJob,
  getStrategyBacktestRun,
  runStrategyFactorResearch,
  runStrategyFactorBenchmark,
  startStrategyBacktestJob
} from '@/api/strategy'
import PortfolioResult from './PortfolioResult.vue'
import FactorResearchResult from './FactorResearchResult.vue'
import FactorBenchmarkResult from './FactorBenchmarkResult.vue'
import StrategyEvolution from './StrategyEvolution.vue'
import {
  strategyParameterDescription,
  strategyParameterLabel,
  strategyParameterOptionLabel,
  strategyParameterOptions
} from '@/utils/strategyParameterPresentation'
import { ratioPercentInputFormatter, ratioPercentInputParser } from '@/utils/numberFormat'
import { getFactorCatalog } from '@/api/factor'
import { getUniverses } from '@/api/universe'

const WORKSPACE_MODE_STORAGE_KEY = 'quantdinger:backtest-center:mode'
const FACTOR_ID_STORAGE_KEY = 'quantdinger:backtest-center:factor-id'
const FACTOR_RESEARCH_MODE_STORAGE_KEY = 'quantdinger:backtest-center:factor-research-mode'

function storedWorkspaceMode () {
  const value = window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)
  return ['portfolio', 'factor', 'evolution'].includes(value) ? value : 'portfolio'
}

function storedFactorId () {
  return window.localStorage.getItem(FACTOR_ID_STORAGE_KEY) || 'momentum_20'
}

function storedFactorResearchMode () {
  const value = window.localStorage.getItem(FACTOR_RESEARCH_MODE_STORAGE_KEY)
  return ['single', 'benchmark'].includes(value) ? value : 'single'
}

export default {
  name: 'BacktestCenter',
  components: { PortfolioResult, FactorResearchResult, FactorBenchmarkResult, StrategyEvolution },
  data () {
    const latestCompleteDate = moment().subtract(1, 'day').startOf('day')
    return {
      mode: storedWorkspaceMode(),
      sources: [],
      sourcesLoading: false,
      universes: [],
      universesLoading: false,
      portfolioHistory: [],
      factorHistory: [],
      factorBenchmarkHistory: [],
      source: null,
      sourceCategory: 'all',
      manifest: null,
      backtestRangePolicy: null,
      params: {},
      result: null,
      factorResult: null,
      selectedRun: null,
      running: false,
      settingsVisible: true,
      activeJobId: null,
      jobPollTimer: null,
      runProgress: { phase: 'preparing', percent: 0 },
      runElapsedSeconds: 0,
      runTimer: null,
      historyLoading: false,
      historyVisible: false,
      factorHistoryView: 'all',
      historyLoadedByMode: { portfolio: false, factor: false },
      historyRequestSequence: 0,
      historyDetailLoading: false,
      historyDetailRunId: null,
      pageReady: false,
      sourceLoadSequence: 0,
      sourceContractLoading: false,
      appliedParamDefinitions: [],
      equityChart: null,
      chartResizeObserver: null,
      form: {
        sourceId: null,
        startDate: latestCompleteDate.clone().subtract(1, 'year'),
        endDate: latestCompleteDate,
        initialCapital: 10000,
        commission: 0.0005,
        slippage: 0.0005,
        leverageEnabled: false,
        leverage: 1
      },
      factorForm: {
        universeId: null,
        frequency: '1d',
        factorId: storedFactorId(),
        groups: 5,
        holdingPeriod: 5,
        neutralizeIndustry: false
      },
      factorParams: {},
      factorResearchMode: storedFactorResearchMode(),
      benchmarkFactorIds: ['momentum_20', 'volatility_20', 'reversal_5'],
      benchmarkValidation: {
        trainFraction: 0.6,
        falseDiscoveryRate: 0.1,
        minimumAbsOosIc: 0.02
      },
      researchFactors: [],
      factorCatalogLoading: false
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme,
      primaryColor: state => state.app.color || '#52C41A'
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    activeResult () {
      return this.mode === 'portfolio' ? this.result : this.factorResult
    },
    runProgressPercent () {
      if (this.mode === 'factor' && this.running) return this.factorEstimatedProgress
      const percent = Number(this.runProgress && this.runProgress.percent)
      return Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0
    },
    factorEstimatedProgress () {
      const factorCount = this.factorResearchMode === 'benchmark' ? Math.max(2, this.benchmarkFactorIds.length) : 1
      const memberCount = Number((this.selectedUniverse && this.selectedUniverse.member_count) || 0)
      const expectedSeconds = Math.max(24, 15 + factorCount * 3.2 + Math.min(memberCount, 300) * 0.12)
      const completion = 1 - Math.exp(-Number(this.runElapsedSeconds || 0) / (expectedSeconds * 0.45))
      return Math.max(4, Math.min(94, Math.round(4 + completion * 90)))
    },
    factorProgressPhase () {
      if (this.factorEstimatedProgress < 20) return 'loading_universe'
      if (this.factorEstimatedProgress < 72) return 'computing_factors'
      if (this.factorEstimatedProgress < 90) return 'validating'
      return 'saving'
    },
    currentProgressLabel () {
      if (this.mode === 'factor') return this.$t(`strategyV2.factorResearch.stage.${this.factorProgressPhase}`)
      const phase = String((this.runProgress && this.runProgress.phase) || 'preparing')
      const key = `backtestWorkbench.stage.${phase}`
      return this.$te(key) ? this.$t(key) : this.$t('strategyV2.backtest.runningTitle')
    },
    modeContextLabel () {
      if (this.mode === 'factor') {
        return this.$t(this.factorResearchMode === 'benchmark'
          ? 'strategyV2.factorResearch.benchmarkMode'
          : 'strategyV2.factorResearch.singleMode')
      }
      if (this.mode === 'evolution') return this.$t('strategyEvolution.workspace')
      return this.$t('backtest-center.resultOverview')
    },
    availableSources () {
      if (this.sourceCategory === 'all') return this.sources
      return this.sources.filter(item => item.asset_type === this.sourceCategory)
    },
    ctaSources () {
      return this.sources.filter(item => item.asset_type !== 'portfolio_strategy')
    },
    portfolioSources () {
      return this.sources.filter(item => item.asset_type === 'portfolio_strategy')
    },
    researchableUniverses () {
      return this.universes.filter(item => Number(item.member_count || 0) >= 3)
    },
    selectedUniverse () {
      return this.universes.find(item => Number(item.id) === Number(this.factorForm.universeId)) || null
    },
    factorFrequencyOptions () {
      return ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']
    },
    history () {
      if (this.mode !== 'factor') return this.portfolioHistory
      if (this.factorHistoryView === 'single') return this.factorHistory
      if (this.factorHistoryView === 'benchmark') return this.factorBenchmarkHistory
      return [...this.factorHistory, ...this.factorBenchmarkHistory]
        .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    },
    totalFactorHistoryCount () {
      return this.factorHistory.length + this.factorBenchmarkHistory.length
    },
    historyButtonLabel () {
      if (this.mode !== 'factor') return this.$t('strategyV2.backtest.historyTitle')
      return this.$t(this.factorResearchMode === 'benchmark'
        ? 'strategyV2.factorResearch.benchmarkHistoryTitle'
        : 'strategyV2.factorResearch.singleHistoryTitle')
    },
    historyDrawerTitle () {
      if (this.mode !== 'factor') return this.$t('strategyV2.backtest.historyTitle')
      if (this.factorHistoryView === 'single') return this.$t('strategyV2.factorResearch.singleHistoryTitle')
      if (this.factorHistoryView === 'benchmark') return this.$t('strategyV2.factorResearch.benchmarkHistoryTitle')
      return this.$t('strategyV2.factorResearch.historyTitle')
    },
    historyDrawerDescription () {
      if (this.mode !== 'factor') return this.$t('strategyV2.backtest.historyDesc')
      if (this.factorHistoryView === 'single') return this.$t('strategyV2.factorResearch.singleHistoryDesc')
      if (this.factorHistoryView === 'benchmark') return this.$t('strategyV2.factorResearch.benchmarkHistoryDesc')
      return this.$t('strategyV2.factorResearch.historyDesc')
    },
    historyDetailDisplayId () {
      const id = String(this.historyDetailRunId || '').split(':').slice(1).join(':') || '-'
      return String(this.historyDetailRunId || '').startsWith('benchmark:') ? id.slice(0, 8) : id
    },
    historyDetailLoadingText () {
      if (this.mode !== 'factor') return this.$t('strategyV2.backtest.historyLoading', { id: this.historyDetailDisplayId })
      if (String(this.historyDetailRunId || '').startsWith('benchmark:')) {
        return this.$t('strategyV2.factorResearch.benchmarkHistoryLoading', { id: this.historyDetailDisplayId })
      }
      return this.$t('strategyV2.factorResearch.historyLoading', { id: this.historyDetailDisplayId })
    },
    selectedRunLabel () {
      if (!this.selectedRun) return ''
      const id = this.selectedRun.benchmark_id || this.selectedRun.id || this.selectedRun.runId
      if (this.mode !== 'factor') return `#${id}`
      if (this.factorResearchMode === 'benchmark') return `MF-${String(id || '').slice(0, 8)}`
      return `FR-${id}`
    },
    factorCompatible () {
      return Boolean(this.selectedUniverse && Number(this.selectedUniverse.member_count || 0) >= 3)
    },
    researchFactorOptions () {
      const legacy = [
        ['momentum_20', 'momentum20'],
        ['volatility_20', 'volatility20'],
        ['reversal_5', 'reversal5'],
        ['value', 'value'],
        ['quality', 'quality'],
        ['size', 'size']
      ].map(([factorId, label]) => ({
        factor_id: factorId,
        display_name: this.$t(`strategyV2.factorResearch.factors.${label}`),
        default_params: {},
        parameter_schema: {}
      }))
      return [...legacy, ...this.researchFactors]
    },
    selectedResearchFactor () {
      const selected = String(this.factorForm.factorId || '').toLowerCase()
      return this.researchFactorOptions.find(item => String(item.factor_id || '').toLowerCase() === selected) || null
    },
    researchFactorParameterEntries () {
      return Object.entries((this.selectedResearchFactor && this.selectedResearchFactor.default_params) || {})
    },
    emptyResultTitle () {
      if (this.mode === 'factor') {
        if (!this.selectedUniverse) return this.$t('strategyV2.factorResearch.selectUniverseTitle')
        if (!this.factorCompatible) return this.$t('strategyV2.factorResearch.incompatibleTitle')
        return this.$t('strategyV2.factorResearch.readyTitle')
      }
      return this.manifest ? this.$t('strategyV2.backtest.readyTitle') : this.$t('strategyV2.backtest.selectTitle')
    },
    emptyResultDescription () {
      if (this.mode === 'factor') {
        if (!this.selectedUniverse) return this.$t('strategyV2.factorResearch.selectUniverseDesc')
        if (!this.factorCompatible) return this.$t('strategyV2.factorResearch.incompatibleDesc')
        return this.$t('strategyV2.factorResearch.readyDesc')
      }
      return this.manifest ? this.$t('strategyV2.backtest.readyDesc') : this.$t('backtest-center.emptyResult')
    },
    leverageAllowed () {
      return Boolean(this.manifest && this.manifest.leverageAllowed)
    },
    maxLeverage () {
      return Number((this.manifest && this.manifest.maxLeverage) || 1)
    },
    manifestFrequency () {
      if (this.mode === 'factor') return this.factorForm.frequency || '1d'
      const subscriptions = (this.manifest && this.manifest.subscriptions) || []
      return (this.manifest && this.manifest.primaryFrequency) || (subscriptions[0] && subscriptions[0].frequency) || '-'
    },
    fundamentalDependencies () {
      if (this.mode === 'factor') return []
      const dependencies = this.manifest && this.manifest.fundamentalDependencies
      return Array.isArray(dependencies) ? dependencies : []
    },
    backtestRangeLimitDays () {
      if (this.mode === 'factor') return null
      if (!this.backtestRangePolicy) return null
      const value = Number(this.backtestRangePolicy.maxSelectedDays)
      return Number.isFinite(value) ? Math.max(0, value) : null
    },
    selectedRangeDays () {
      if (!this.form.startDate || !this.form.endDate) return null
      return this.form.endDate.clone().startOf('day').diff(this.form.startDate.clone().startOf('day'), 'days')
    },
    rangePresetOptions () {
      const endDate = this.rangePresetEndDate()
      const presets = [
        { key: '1m', amount: 1, unit: 'month' },
        { key: '6m', amount: 6, unit: 'month' },
        { key: '1y', amount: 1, unit: 'year' },
        { key: '2y', amount: 2, unit: 'year' }
      ]
      const options = presets.map(preset => this.decorateRangePreset(preset, endDate))
      if (this.backtestRangeLimitDays !== null && !options.some(item => item.rangeDays === this.backtestRangeLimitDays)) {
        options.push(this.decorateRangePreset({
          key: 'max',
          amount: this.backtestRangeLimitDays,
          unit: 'day',
          dynamic: true
        }, endDate))
      }
      return options
    },
    estimatedBacktestBars () {
      if (!this.backtestRangePolicy || this.selectedRangeDays === null || this.selectedRangeDays < 0) return 0
      const seconds = Number(this.backtestRangePolicy.timeframeSeconds || 86400)
      const warmupBars = Number(this.backtestRangePolicy.warmupBars) || 0
      return Math.ceil((this.selectedRangeDays * 86400) / Math.max(1, seconds)) + warmupBars
    },
    backtestRangeExceeded () {
      if (this.selectedRangeDays === null || this.selectedRangeDays < 0) return true
      return this.backtestRangeLimitDays !== null && this.selectedRangeDays > this.backtestRangeLimitDays
    },
    backtestRangeAlertTitle () {
      return this.$t('strategyV2.backtest.rangeLimitTitle', {
        timeframe: this.manifestFrequency,
        maxDays: this.backtestRangeLimitDays
      })
    },
    backtestRangeAlertDescription () {
      const key = this.backtestRangeExceeded
        ? 'strategyV2.backtest.rangeLimitExceeded'
        : 'strategyV2.backtest.rangeLimitEstimate'
      return this.$t(key, {
        timeframe: this.manifestFrequency,
        maxDays: this.backtestRangeLimitDays,
        bars: this.estimatedBacktestBars.toLocaleString(),
        maxBars: Number(this.backtestRangePolicy && this.backtestRangePolicy.maxBars || 0).toLocaleString()
      })
    },
    runDisabled () {
      if (this.mode === 'factor') {
        const factorSelectionInvalid = this.factorResearchMode === 'benchmark' && this.benchmarkFactorIds.length < 2
        return this.universesLoading || this.backtestRangeExceeded || !this.factorCompatible || factorSelectionInvalid
      }
      return this.sourceContractLoading || !this.manifest || this.backtestRangeExceeded
    },
    factorRunLabel () {
      return this.$t(this.factorResearchMode === 'benchmark'
        ? 'strategyV2.factorResearch.runBenchmark'
        : 'strategyV2.factorResearch.run')
    },
    strategyTypeLabel () {
      const type = String((this.manifest && this.manifest.strategyType) || 'cta')
      return this.$t(type === 'portfolio' ? 'strategyV2.portfolio' : 'strategyV2.cta')
    },
    universeLabel () {
      if (this.mode === 'factor') return this.factorUniverseLabel
      const universe = (this.manifest && this.manifest.universe) || {}
      if (universe.reference) return universe.reference
      const instruments = Array.isArray(universe.instruments) ? universe.instruments : []
      if (this.manifest && this.manifest.strategyType === 'cta' && instruments.length) {
        return instruments.map(this.formatInstrument).join(', ')
      }
      return this.$t('strategyV2.symbolCount', { count: instruments.length })
    },
    factorUniverseLabel () {
      return this.selectedUniverse ? this.universeName(this.selectedUniverse) : '-'
    },
    paramDefinitions () {
      const schema = this.parseObject(this.source && this.source.param_schema)
      const declared = Array.isArray(schema.params) ? schema.params : []
      return declared.length ? declared : this.appliedParamDefinitions
    },
    hasBenchmarkMetrics () {
      if (!this.result || !['available', 'partial'].includes(this.result.benchmarkStatus)) return false
      return Number.isFinite(Number(this.result.benchmarkTotalReturn)) &&
        Number.isFinite(Number(this.result.excessReturn)) &&
        Array.isArray(this.result.benchmarkCurve) && this.result.benchmarkCurve.length > 0
    },
    metrics () {
      if (!this.result) return []
      return [
        { key: 'return', label: this.$t('backtest-center.metrics.totalReturn'), value: this.formatPercent(this.result.totalReturn), tone: Number(this.result.totalReturn) >= 0 ? 'positive' : 'negative' },
        { key: 'benchmark', label: this.$t('strategyV2.backtest.benchmarkReturn'), value: this.hasBenchmarkMetrics ? this.formatPercent(this.result.benchmarkTotalReturn) : '-', tone: this.hasBenchmarkMetrics ? (Number(this.result.benchmarkTotalReturn) >= 0 ? 'positive' : 'negative') : '' },
        { key: 'excess', label: this.$t('strategyV2.backtest.excessReturn'), value: this.hasBenchmarkMetrics ? this.formatPercent(this.result.excessReturn) : '-', tone: this.hasBenchmarkMetrics ? (Number(this.result.excessReturn) >= 0 ? 'positive' : 'negative') : '' },
        { key: 'drawdown', label: this.$t('backtest-center.metrics.maxDrawdown'), value: this.formatPercent(this.result.maxDrawdown), tone: 'negative' },
        { key: 'executions', label: this.$t('strategyV2.backtest.executions'), value: Number(this.result.totalExecutions || 0), tone: '' },
        { key: 'trades', label: this.$t('strategyV2.backtest.closedTrades'), value: Number(this.result.totalTrades || 0), tone: '' },
        { key: 'win', label: this.$t('backtest-center.metrics.winRate'), value: this.formatPercent(this.result.winRate, false), tone: '' },
        { key: 'sharpe', label: this.$t('backtest-center.metrics.sharpe'), value: this.formatNumber(this.result.sharpeRatio), tone: '' }
      ]
    },
    equityPoints () {
      return (this.result && this.result.equityCurve) || []
    },
    executionRows () {
      return (this.result && (this.result.executions || this.result.rawTrades)) || []
    },
    tradeRows () {
      return (this.result && (this.result.closedTrades || this.result.trades)) || []
    },
    tradeColumns () {
      return [
        { title: this.$t('backtest-center.symbol'), dataIndex: 'symbol', key: 'symbol', width: 150 },
        { title: this.$t('backtest-center.tradeColumns.side'), dataIndex: 'side', key: 'side', width: 80 },
        { title: this.$t('backtest-center.tradeColumns.entryTime'), dataIndex: 'entry_time', key: 'entry_time', width: 170, customRender: value => this.formatDate(value) },
        { title: this.$t('backtest-center.tradeColumns.exitTime'), dataIndex: 'exit_time', key: 'exit_time', width: 170, customRender: value => this.formatDate(value) },
        { title: this.$t('backtest-center.tradeColumns.quantity'), dataIndex: 'quantity', key: 'quantity', width: 110, customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('backtest-center.tradeColumns.valueUsd'), key: 'value_usd', width: 130, customRender: (value, row) => { const total = calculateTradeValueUsd(row); return total === null ? '-' : this.formatNumber(total) } },
        { title: this.$t('backtest-center.tradeColumns.entryPrice'), dataIndex: 'entry_price', key: 'entry_price', width: 120, customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('backtest-center.tradeColumns.exitPrice'), dataIndex: 'exit_price', key: 'exit_price', width: 120, customRender: value => this.formatNumber(value, 4) },
        {
          title: this.$t('backtest-center.tradeColumns.profit'),
          dataIndex: 'profit',
          key: 'profit',
          width: 110,
          customRender: value => this.$createElement('span', { class: ['trade-profit', this.profitTone(value)] }, this.formatSignedNumber(value))
        },
        { title: this.$t('backtest-center.tradeColumns.balance'), dataIndex: 'balance', key: 'balance', width: 130, customRender: value => this.formatNumber(value) },
        { title: this.$t('backtest-center.tradeColumns.closeReason'), dataIndex: 'close_reason', key: 'close_reason', width: 160 }
      ]
    },
    executionColumns () {
      return [
        { title: this.$t('strategyV2.backtest.signalTime'), dataIndex: 'signal_time', key: 'signal_time', width: 160, customRender: value => this.formatDate(value) },
        { title: this.$t('strategyV2.backtest.fillTime'), dataIndex: 'time', key: 'time', width: 160, customRender: value => this.formatDate(value) },
        { title: this.$t('backtest-center.symbol'), dataIndex: 'symbol', key: 'symbol', width: 160 },
        { title: this.$t('strategyV2.backtest.side'), dataIndex: 'side', key: 'side', width: 70 },
        { title: this.$t('backtest-center.quantity'), dataIndex: 'quantity', key: 'quantity', customRender: value => this.formatNumber(value, 6) },
        { title: this.$t('backtest-center.price'), dataIndex: 'price', key: 'price', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('backtest-center.commission'), dataIndex: 'commission', key: 'commission', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('strategyV2.backtest.reason'), dataIndex: 'reason', key: 'reason', width: 150 }
      ]
    },
    resultTrustTone () {
      if (!this.result || (this.result.audit && !this.result.audit.passed)) return 'is-error'
      if (this.result.resultStatus === 'no_signals' || this.result.resultStatus === 'open_position_only') return 'is-warning'
      return 'is-success'
    },
    resultTrustIcon () {
      return this.resultTrustTone === 'is-success' ? 'check-circle' : this.resultTrustTone === 'is-warning' ? 'exclamation-circle' : 'close-circle'
    },
    resultStatusLabel () {
      return this.$t(`strategyV2.backtest.status.${(this.result && this.result.resultStatus) || 'unknown'}`)
    },
    resultStatusHint () {
      return this.$t(`strategyV2.backtest.status.${(this.result && this.result.resultStatus) || 'unknown'}Hint`)
    },
    auditLabel () {
      return this.$t(this.result && this.result.audit && this.result.audit.passed ? 'strategyV2.backtest.auditPassed' : 'strategyV2.backtest.auditFailed')
    },
    provenanceLabel () {
      const provenance = (this.result && this.result.dataProvenance) || {}
      return this.$t(provenance.kind === 'market' ? 'strategyV2.backtest.marketData' : 'strategyV2.backtest.fixtureData')
    },
    benchmarkCaption () {
      if (!this.result || this.result.benchmarkStatus !== 'available') return this.$t('strategyV2.backtest.benchmarkUnavailable')
      const benchmark = this.result.benchmark || {}
      return this.$t('strategyV2.backtest.comparedWith', { symbol: benchmark.symbol || '-' })
    },
    curveRange () {
      const curve = (this.result && this.result.equityCurve) || []
      if (!curve.length) return ''
      return `${this.formatNumber(curve[0].value)} → ${this.formatNumber(curve[curve.length - 1].value)}`
    }
  },
  watch: {
    result () {
      this.$nextTick(this.renderEquityChart)
    },
    isDarkTheme () {
      this.$nextTick(this.renderEquityChart)
    },
    primaryColor () {
      this.$nextTick(this.renderEquityChart)
    },
    mode (value) {
      window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, value)
      this.handleModeChange(value)
    },
    factorResearchMode (value) {
      window.localStorage.setItem(FACTOR_RESEARCH_MODE_STORAGE_KEY, value)
    },
    '$route.query.sourceId' () {
      if (this.pageReady && this.mode === 'portfolio') this.syncRouteSource({ fallback: true })
    }
  },
  async mounted () {
    await this.loadSources()
    await this.loadUniverses()
    this.loadResearchFactors().catch(() => {})
    this.pageReady = true
    await this.syncRouteSource({ fallback: true })
    this.loadHistory({ mode: this.mode }).catch(() => {})
    window.addEventListener('resize', this.resizeEquityChart)
  },
  activated () {
    if (this.pageReady && this.mode === 'portfolio') {
      this.syncRouteSource({ fallback: true, forceReload: true, preserveParams: true }).catch(error => {
        this.$message.error((error && error.backendMessage) || this.$t('strategyV2.backtest.runFailed'))
      })
    }
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.resizeEquityChart)
    this.stopRunTimer()
    this.stopJobPolling()
    if (this.chartResizeObserver) this.chartResizeObserver.disconnect()
    if (this.equityChart) this.equityChart.dispose()
  },
  methods: {
    themeColorWithAlpha (alpha) {
      const hex = String(this.primaryColor || '#52C41A').trim().replace('#', '')
      const normalized = hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex
      if (!/^[0-9a-f]{6}$/i.test(normalized)) return `rgba(82, 196, 26, ${alpha})`
      const value = Number.parseInt(normalized, 16)
      return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
    },
    renderEquityChart () {
      if (!this.$refs.equityChart || !this.equityPoints.length) {
        if (this.equityChart) this.equityChart.clear()
        return
      }
      if (!this.equityChart) {
        this.equityChart = echarts.init(this.$refs.equityChart)
        if (typeof ResizeObserver !== 'undefined') {
          this.chartResizeObserver = new ResizeObserver(this.resizeEquityChart)
          this.chartResizeObserver.observe(this.$refs.equityChart)
        }
      }
      const strategyData = this.equityPoints.map(item => [timestampMillisecondsUtc(item.time), Number(item.value)])
      const benchmarkData = ((this.result && this.result.benchmarkCurve) || []).map(item => [timestampMillisecondsUtc(item.time), Number(item.value)])
      const textColor = this.isDarkTheme ? '#a3a3a3' : '#64748b'
      const gridColor = this.isDarkTheme ? '#292929' : '#e9eef4'
      const strategyName = this.$t('strategyV2.backtest.strategyEquity')
      const benchmarkName = this.$t('strategyV2.backtest.spotBenchmark')
      const valueLabel = this.$t('strategyV2.backtest.equityValue')
      const series = [{
        name: strategyName,
        type: 'line',
        data: strategyData,
        showSymbol: false,
        smooth: false,
        sampling: 'lttb',
        lineStyle: { width: 2.2 },
        areaStyle: { opacity: 0.08 },
        emphasis: { focus: 'series' }
      }]
      if (benchmarkData.length) {
        series.push({
          name: benchmarkName,
          type: 'line',
          data: benchmarkData,
          showSymbol: false,
          smooth: false,
          sampling: 'lttb',
          lineStyle: { width: 1.7, type: 'dashed' },
          emphasis: { focus: 'series' }
        })
      }
      this.equityChart.setOption({
        animationDuration: 350,
        color: [this.primaryColor, '#94a3b8'],
        grid: { left: 12, right: 18, top: 46, bottom: 58, containLabel: true },
        legend: { top: 4, left: 4, textStyle: { color: textColor }, data: benchmarkData.length ? [strategyName, benchmarkName] : [strategyName] },
        tooltip: {
          trigger: 'axis',
          confine: true,
          backgroundColor: this.isDarkTheme ? 'rgba(15,15,15,.97)' : 'rgba(255,255,255,.98)',
          borderColor: this.isDarkTheme ? '#383838' : '#d9e0e8',
          textStyle: { color: this.isDarkTheme ? '#f8fafc' : '#17233d' },
          axisPointer: { type: 'cross', snap: true, label: { backgroundColor: '#334155' } },
          formatter: params => {
            if (!params || !params.length) return ''
            const timestamp = params[0].value[0]
            const rows = params.map(item => `${item.marker}${item.seriesName}<b>${this.formatNumber(item.value[1])}</b>`).join('<br>')
            return `<div class="backtest-tooltip"><strong>${formatBacktestTime(timestamp, { locale: this.$i18n.locale })}</strong><span>${valueLabel}</span><br>${rows}</div>`
          }
        },
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        xAxis: {
          type: 'time',
          boundaryGap: false,
          axisLine: { lineStyle: { color: gridColor } },
          axisLabel: { color: textColor, formatter: value => moment(value).format('YYYY-MM-DD') },
          splitLine: { show: false },
          axisPointer: { show: true }
        },
        yAxis: {
          type: 'value',
          scale: true,
          axisLabel: { color: textColor, formatter: value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
          splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
          axisPointer: { show: true, label: { formatter: params => this.formatNumber(params.value) } }
        },
        dataZoom: [
          { type: 'inside', xAxisIndex: 0, filterMode: 'none', zoomOnMouseWheel: true, moveOnMouseMove: true },
          { type: 'slider', xAxisIndex: 0, height: 22, bottom: 7, borderColor: 'transparent', backgroundColor: this.isDarkTheme ? '#0d0d0d' : '#f1f5f9', fillerColor: this.themeColorWithAlpha(this.isDarkTheme ? 0.18 : 0.12), textStyle: { color: textColor }, showDetail: false }
        ],
        series
      }, true)
    },
    resizeEquityChart () {
      if (this.equityChart) this.equityChart.resize()
    },
    parseObject (value) {
      if (value && typeof value === 'object' && !Array.isArray(value)) return value
      if (typeof value !== 'string' || !value.trim()) return {}
      try { return JSON.parse(value) } catch (error) { return {} }
    },
    async refreshPage () {
      await Promise.all([
        this.loadSources(),
        this.loadUniverses(),
        this.loadResearchFactors(),
        this.loadHistory({ mode: this.mode, force: true })
      ])
      if (this.mode === 'portfolio') await this.syncRouteSource({ fallback: true })
      else this.ensureUniverseSelection()
    },
    async loadSources () {
      this.sourcesLoading = true
      try {
        const response = await getScriptSourceList()
        this.sources = (response.data && response.data.items) || []
      } finally {
        this.sourcesLoading = false
      }
    },
    async loadUniverses () {
      this.universesLoading = true
      try {
        const response = await getUniverses()
        this.universes = Array.isArray(response.data) ? response.data : []
        this.ensureUniverseSelection()
      } finally {
        this.universesLoading = false
      }
    },
    ensureUniverseSelection () {
      const currentId = Number(this.factorForm.universeId)
      if (this.researchableUniverses.some(item => Number(item.id) === currentId)) return
      const nextUniverse = this.researchableUniverses[0]
      this.factorForm.universeId = nextUniverse ? Number(nextUniverse.id) : null
    },
    universeName (universe) {
      const key = universe && universe.name_i18n_key
      if (key) {
        const translated = this.$t(key)
        if (translated && translated !== key) return translated
      }
      return (universe && (universe.name || universe.code)) || ''
    },
    async loadResearchFactors () {
      this.factorCatalogLoading = true
      try {
        const response = await getFactorCatalog({ type: 'technical' })
        this.researchFactors = Array.isArray(response.data) ? response.data : []
        if (this.selectedResearchFactor && !Object.keys(this.factorParams).length) {
          this.factorParams = { ...(this.selectedResearchFactor.default_params || {}) }
        }
      } finally {
        this.factorCatalogLoading = false
      }
    },
    researchFactorName (factor) {
      const key = factor && factor.name_i18n_key
      if (key) {
        const translated = this.$t(key)
        if (translated && translated !== key) return translated
      }
      return (factor && (factor.display_name || factor.factor_id)) || ''
    },
    researchFactorParameterSchema (key) {
      return (this.selectedResearchFactor && this.selectedResearchFactor.parameter_schema && this.selectedResearchFactor.parameter_schema[key]) || { type: 'string' }
    },
    setResearchFactorParam (key, value) {
      if (value === null || value === undefined) return
      this.$set(this.factorParams, key, value)
    },
    handleResearchFactorChange () {
      window.localStorage.setItem(FACTOR_ID_STORAGE_KEY, this.factorForm.factorId || '')
      this.factorParams = { ...((this.selectedResearchFactor && this.selectedResearchFactor.default_params) || {}) }
      this.handleFactorResearchContextChange()
    },
    handleFactorResearchContextChange () {
      this.factorResult = null
      this.selectedRun = null
    },
    selectFactorResearchMode (value) {
      if (!['single', 'benchmark'].includes(value) || value === this.factorResearchMode) return
      this.factorResearchMode = value
      this.factorHistoryView = value
      this.handleFactorResearchContextChange()
    },
    onSourceDropdownVisibleChange (visible) {
      if (!visible || this.sourcesLoading) return
      this.loadSources().catch(error => {
        console.warn('Refresh backtest sources failed:', error)
      })
    },
    async loadHistory ({ mode = this.mode, force = false } = {}) {
      const requestedMode = mode === 'factor' ? 'factor' : 'portfolio'
      if (!force && this.historyLoadedByMode[requestedMode]) return
      const requestSequence = ++this.historyRequestSequence
      if (requestedMode === this.mode) this.historyLoading = true
      try {
        if (requestedMode === 'factor') {
          const [singleResponse, benchmarkResponse] = await Promise.all([
            getStrategyFactorResearchHistory({ researchType: 'single', limit: 48 }),
            getStrategyFactorBenchmarkHistory({ limit: 24 })
          ])
          this.factorHistory = (Array.isArray(singleResponse.data) ? singleResponse.data : [])
            .map(item => ({ ...item, history_type: 'single' }))
          this.factorBenchmarkHistory = (Array.isArray(benchmarkResponse.data) ? benchmarkResponse.data : [])
            .map(item => ({ ...item, history_type: 'benchmark' }))
        } else {
          const response = await getStrategyBacktestHistory({ limit: 24 })
          this.portfolioHistory = Array.isArray(response.data) ? response.data : []
        }
        this.historyLoadedByMode = { ...this.historyLoadedByMode, [requestedMode]: true }
      } finally {
        if (requestSequence === this.historyRequestSequence || requestedMode === this.mode) {
          this.historyLoading = false
        }
      }
    },
    async refreshCurrentHistory () {
      return this.loadHistory({ mode: this.mode, force: true })
    },
    openHistoryDrawer () {
      if (this.mode === 'factor') this.factorHistoryView = this.factorResearchMode
      this.historyVisible = true
      this.loadHistory({ mode: this.mode }).catch(error => {
        this.$message.error((error && error.backendMessage) || this.$t('strategyV2.backtest.historyLoadFailed'))
      })
    },
    historyItemKey (item) {
      if (this.mode === 'factor') return `${item.history_type || 'single'}:${item.id}`
      return `portfolio:${item.id}`
    },
    isHistoryItemActive (item) {
      if (!this.selectedRun) return false
      if (this.mode === 'factor' && item.history_type === 'benchmark') {
        const selectedId = this.selectedRun.benchmark_id || this.selectedRun.id || (this.factorResult && this.factorResult.benchmarkId)
        return String(selectedId || '') === String(item.id || '')
      }
      return Number(this.selectedRun.id || this.selectedRun.runId) === Number(item.id)
    },
    historyRunLabel (item) {
      if (this.mode !== 'factor') return `#${item.id}`
      if (item.history_type === 'benchmark') return `MF-${String(item.id || '').slice(0, 8)}`
      return `FR-${item.id}`
    },
    async syncRouteSource ({ fallback = false, forceReload = false, preserveParams = false } = {}) {
      const routeSourceId = Number(this.$route.query.sourceId)
      const routeSource = Number.isFinite(routeSourceId) && routeSourceId > 0
        ? this.sources.find(item => Number(item.id) === routeSourceId)
        : null
      if (routeSource && this.mode === 'portfolio') {
        this.sourceCategory = routeSource.asset_type === 'portfolio_strategy' ? 'portfolio_strategy' : 'script'
      }
      const target = routeSource || (fallback ? this.availableSources[0] : null)
      if (!target) return
      const sourceId = Number(target.id)
      if (!forceReload && Number(this.form.sourceId) === sourceId && Number(this.source && this.source.id) === sourceId && this.manifest) return
      this.form.sourceId = sourceId
      await this.selectSource(sourceId, { preserveParams })
    },
    async handleModeChange () {
      this.selectedRun = null
      this.historyVisible = false
      if (this.mode === 'evolution') return
      if (this.mode === 'factor') {
        this.ensureUniverseSelection()
        this.loadHistory({ mode: this.mode }).catch(() => {})
        this.$nextTick(() => this.resizeEquityChart())
        return
      }
      const currentId = Number(this.form.sourceId)
      const currentAvailable = this.availableSources.some(item => Number(item.id) === currentId)
      if (!currentAvailable) {
        const nextSource = this.availableSources[0]
        this.form.sourceId = nextSource ? Number(nextSource.id) : null
        if (nextSource) await this.selectSource(nextSource.id)
        else {
          this.source = null
          this.manifest = null
          this.backtestRangePolicy = null
        }
      }
      this.loadHistory({ mode: this.mode }).catch(() => {})
      this.applyBacktestRangePolicy()
      this.$nextTick(() => this.resizeEquityChart())
    },
    async applyEvolutionParams (selection) {
      const sourceId = Number(selection && selection.sourceId)
      this.mode = 'portfolio'
      await this.$nextTick()
      const target = this.sources.find(item => Number(item.id) === sourceId)
      if (target) {
        this.sourceCategory = target.asset_type === 'portfolio_strategy' ? 'portfolio_strategy' : 'script'
        this.form.sourceId = sourceId
        await this.selectSource(sourceId)
      }
      this.appliedParamDefinitions = Array.isArray(selection && selection.parameterDefinitions)
        ? selection.parameterDefinitions
        : []
      const selectedParams = { ...((selection && selection.params) || {}) }
      this.params = this.paramDefinitions.reduce((output, item) => {
        output[item.name] = Object.prototype.hasOwnProperty.call(selectedParams, item.name)
          ? selectedParams[item.name]
          : item.default
        return output
      }, { ...selectedParams })
      this.settingsVisible = true
      const messageKey = selection && selection.recommended
        ? 'strategyEvolution.paramsApplied'
        : 'strategyEvolution.paramsAppliedForReview'
      this.$message[selection && selection.recommended ? 'success' : 'warning'](this.$t(messageKey))
    },
    async handleSourceCategoryChange () {
      const currentId = Number(this.form.sourceId)
      if (this.availableSources.some(item => Number(item.id) === currentId)) return
      const nextSource = this.availableSources[0]
      this.form.sourceId = nextSource ? Number(nextSource.id) : null
      if (nextSource) {
        await this.selectSource(nextSource.id)
      } else {
        this.source = null
        this.manifest = null
        this.backtestRangePolicy = null
        this.result = null
      }
    },
    async selectSource (sourceId, { preserveParams = false } = {}) {
      const requestSequence = ++this.sourceLoadSequence
      const previousSourceId = Number(this.source && this.source.id)
      const previousCodeHash = String((this.manifest && this.manifest.codeHash) || '')
      const previousParams = { ...this.params }
      const previousResult = this.result
      const previousFactorResult = this.factorResult
      const previousSelectedRun = this.selectedRun
      const previousLeverageEnabled = this.form.leverageEnabled
      const previousLeverage = this.form.leverage
      this.source = this.sources.find(item => Number(item.id) === Number(sourceId)) || null
      this.manifest = null
      this.backtestRangePolicy = null
      this.sourceContractLoading = true
      this.result = null
      this.factorResult = null
      this.selectedRun = null
      this.form.leverageEnabled = false
      this.form.leverage = 1
      this.appliedParamDefinitions = []
      try {
        const [response, compiled] = await Promise.all([
          getScriptSourceDetail(sourceId),
          compileScriptSource({ sourceId })
        ])
        if (requestSequence !== this.sourceLoadSequence) return
        this.source = response.data
        this.manifest = compiled.data && compiled.data.manifest
        this.backtestRangePolicy = compiled.data && compiled.data.backtestRangePolicy
        this.applyBacktestRangePolicy()
        const nextCodeHash = String((this.manifest && this.manifest.codeHash) || '')
        const sameSourceVersion = Number(sourceId) === previousSourceId &&
          previousCodeHash && nextCodeHash && previousCodeHash === nextCodeHash
        if (preserveParams && sameSourceVersion) {
          this.result = previousResult
          this.factorResult = previousFactorResult
          this.selectedRun = previousSelectedRun
          this.form.leverageEnabled = previousLeverageEnabled
          this.form.leverage = previousLeverage
        }
        this.params = this.paramDefinitions.reduce((output, item) => {
          output[item.name] = preserveParams && sameSourceVersion && Object.prototype.hasOwnProperty.call(previousParams, item.name)
            ? previousParams[item.name]
            : item.default
          return output
        }, {})
      } finally {
        if (requestSequence === this.sourceLoadSequence) this.sourceContractLoading = false
      }
    },
    sourceTypeLabel (item) {
      if (String(item.template_key || '').startsWith('robot_v2_')) return this.$t('strategyV2.robot')
      return this.$t(item.asset_type === 'portfolio_strategy' ? 'strategyV2.portfolio' : 'strategyV2.cta')
    },
    formatInstrument (item) {
      const marketType = String(item.market_type || item.marketType || '').toLowerCase()
      const marketTypeKey = marketType ? `marketContext.${marketType}` : ''
      const marketTypeLabel = marketTypeKey && this.$te(marketTypeKey) ? this.$t(marketTypeKey) : marketType
      return [item.symbol, marketTypeLabel].filter(Boolean).join(' · ')
    },
    parameterLabel (item) {
      return strategyParameterLabel(item, key => this.$t(key))
    },
    parameterDescription (item) {
      return strategyParameterDescription(item, key => this.$t(key), this.$i18n && this.$i18n.locale)
    },
    parameterOptions (item) {
      return strategyParameterOptions(item)
    },
    parameterOptionLabel (item, option) {
      return strategyParameterOptionLabel(item, option, key => this.$t(key))
    },
    formatRatioPercent (value) {
      return ratioPercentInputFormatter(value)
    },
    parseRatioPercent (value) {
      return ratioPercentInputParser(value)
    },
    setParam (name, value) {
      this.params = { ...this.params, [name]: value }
    },
    disabledStartDate (current) {
      if (!current || !this.form.endDate) return false
      const endDate = this.form.endDate.clone().startOf('day')
      if (current.isAfter(endDate, 'day')) return true
      if (this.backtestRangeLimitDays === null) return false
      return current.isBefore(endDate.clone().subtract(this.backtestRangeLimitDays, 'days'), 'day')
    },
    disabledEndDate (current) {
      if (!current) return false
      if (current.isAfter(moment().subtract(1, 'day'), 'day')) return true
      if (!this.form.startDate) return false
      const startDate = this.form.startDate.clone().startOf('day')
      if (current.isBefore(startDate, 'day')) return true
      if (this.backtestRangeLimitDays === null) return false
      return current.isAfter(startDate.clone().add(this.backtestRangeLimitDays, 'days'), 'day')
    },
    rangePresetEndDate () {
      const latestCompleteDate = moment().subtract(1, 'day').startOf('day')
      if (!this.form.endDate) return latestCompleteDate
      const selectedEndDate = this.form.endDate.clone().startOf('day')
      return selectedEndDate.isAfter(latestCompleteDate, 'day') ? latestCompleteDate : selectedEndDate
    },
    decorateRangePreset (preset, endDate) {
      const startDate = endDate.clone().subtract(preset.amount, preset.unit).startOf('day')
      const rangeDays = endDate.diff(startDate, 'days')
      const disabled = this.backtestRangeLimitDays !== null && rangeDays > this.backtestRangeLimitDays
      const active = Boolean(
        this.form.startDate && this.form.endDate &&
        this.form.startDate.clone().startOf('day').isSame(startDate, 'day') &&
        this.form.endDate.clone().startOf('day').isSame(endDate, 'day')
      )
      const label = preset.dynamic
        ? this.$t('backtest-center.quickRange.max', { days: preset.amount })
        : this.$t(`backtest-center.quickRange.${preset.key}`)
      return {
        ...preset,
        startDate,
        endDate: endDate.clone(),
        rangeDays,
        disabled,
        active,
        label,
        tooltip: disabled
          ? this.$t('backtest-center.quickRange.unavailable', {
            range: label,
            timeframe: this.manifestFrequency,
            maxDays: this.backtestRangeLimitDays
          })
          : ''
      }
    },
    applyRangePreset (preset) {
      if (!preset || preset.disabled) return
      this.form.startDate = preset.startDate.clone()
      this.form.endDate = preset.endDate.clone()
    },
    applyBacktestRangePolicy () {
      if (this.backtestRangeLimitDays === null || !this.form.startDate || !this.form.endDate) return
      if (this.selectedRangeDays <= this.backtestRangeLimitDays && this.selectedRangeDays >= 0) return
      this.form.startDate = this.form.endDate.clone().startOf('day').subtract(this.backtestRangeLimitDays, 'days')
    },
    ensureBacktestRangeAllowed () {
      if (!this.backtestRangeExceeded) return true
      this.$message.error(this.backtestRangeAlertDescription)
      return false
    },
    startRunTimer () {
      this.stopRunTimer()
      this.runElapsedSeconds = 0
      const startedAt = Date.now()
      this.runTimer = window.setInterval(() => {
        this.runElapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      }, 1000)
    },
    stopRunTimer () {
      if (this.runTimer) window.clearInterval(this.runTimer)
      this.runTimer = null
    },
    stopJobPolling () {
      if (this.jobPollTimer) window.clearTimeout(this.jobPollTimer)
      this.jobPollTimer = null
    },
    scheduleJobPoll () {
      this.stopJobPolling()
      this.jobPollTimer = window.setTimeout(() => this.pollBacktestJob(), 900)
    },
    async pollBacktestJob () {
      if (!this.activeJobId || !this.running) return
      try {
        const response = await getStrategyBacktestJob(this.activeJobId)
        const job = response.data || {}
        this.runProgress = { ...(job.progress || {}) }
        if (job.status === 'succeeded') {
          const result = job.result || {}
          this.result = result
          this.selectedRun = { id: result.runId }
          const billing = result.billing
          if (billing && typeof billing.remaining !== 'undefined') {
            this.$root.$emit('credits-updated', billing.remaining)
          }
          this.running = false
          this.activeJobId = null
          this.stopRunTimer()
          this.stopJobPolling()
          await this.loadHistory({ mode: 'portfolio', force: true })
          return
        }
        if (job.status === 'failed' || job.status === 'cancelled') {
          throw new Error(job.error || this.$t('strategyV2.backtest.runFailed'))
        }
        this.scheduleJobPoll()
      } catch (error) {
        this.running = false
        this.activeJobId = null
        this.stopRunTimer()
        this.stopJobPolling()
        this.$message.error((error && error.backendMessage) || (error && error.message) || this.$t('strategyV2.backtest.runFailed'))
      }
    },
    async run () {
      if (!this.form.sourceId) {
        this.$message.warning(this.$t('strategyV2.sourceContractRequired'))
        return
      }
      if (this.form.endDate.isAfter(moment().subtract(1, 'day'), 'day')) {
        this.form.endDate = moment().subtract(1, 'day').startOf('day')
        this.applyBacktestRangePolicy()
        this.$message.info(this.$t('strategyV2.backtest.endDateAdjusted'))
      }
      if (!this.ensureBacktestRangeAllowed()) return
      this.running = true
      this.selectedRun = null
      this.runProgress = { phase: 'preparing', percent: 2 }
      this.startRunTimer()
      try {
        const response = await startStrategyBacktestJob({
          sourceId: this.form.sourceId,
          startDate: this.form.startDate.format('YYYY-MM-DD'),
          endDate: this.form.endDate.format('YYYY-MM-DD'),
          initialCapital: this.form.initialCapital,
          commission: this.form.commission,
          slippage: this.form.slippage,
          leverageEnabled: this.form.leverageEnabled,
          leverage: this.form.leverageEnabled ? this.form.leverage : 1,
          params: this.params
        })
        this.activeJobId = response.data && response.data.jobId
        this.runProgress = { ...((response.data && response.data.progress) || this.runProgress) }
        const billing = response.data && response.data.billing
        if (billing && typeof billing.remaining !== 'undefined') {
          this.$root.$emit('credits-updated', billing.remaining)
        }
        if (!this.activeJobId) throw new Error(this.$t('strategyV2.backtest.runFailed'))
        this.scheduleJobPoll()
      } catch (error) {
        this.running = false
        this.activeJobId = null
        this.stopRunTimer()
        this.stopJobPolling()
        this.$message.error((error && error.backendMessage) || this.$t('strategyV2.backtest.runFailed'))
      }
    },
    async runFactorResearch () {
      if (!this.factorForm.universeId) {
        this.$message.warning(this.$t('strategyV2.factorResearch.universeRequired'))
        return
      }
      if (this.form.endDate.isAfter(moment().subtract(1, 'day'), 'day')) {
        this.form.endDate = moment().subtract(1, 'day').startOf('day')
        this.applyBacktestRangePolicy()
        this.$message.info(this.$t('strategyV2.backtest.endDateAdjusted'))
      }
      if (!this.ensureBacktestRangeAllowed()) return
      this.running = true
      this.runProgress = { phase: 'loading_universe', percent: 4 }
      this.startRunTimer()
      try {
        const sharedPayload = {
          universeId: this.factorForm.universeId,
          frequency: this.factorForm.frequency,
          startDate: this.form.startDate.format('YYYY-MM-DD'),
          endDate: this.form.endDate.format('YYYY-MM-DD'),
          commission: this.form.commission,
          slippage: this.form.slippage,
          groups: this.factorForm.groups,
          holdingPeriod: this.factorForm.holdingPeriod,
          neutralizeIndustry: this.factorForm.neutralizeIndustry
        }
        const response = this.factorResearchMode === 'benchmark'
          ? await runStrategyFactorBenchmark({
            ...sharedPayload,
            factors: this.benchmarkFactorIds.map(factorId => ({ factorId, factorParams: {} })),
            ...this.benchmarkValidation
          })
          : await runStrategyFactorResearch({
            ...sharedPayload,
            factorId: this.factorForm.factorId,
            factorParams: { ...this.factorParams }
          })
        this.runProgress = { phase: 'completed', percent: 100 }
        this.factorResult = response.data
        this.selectedRun = this.factorResearchMode === 'benchmark'
          ? { id: response.data && response.data.benchmarkId }
          : { id: response.data && response.data.runId }
        await this.loadHistory({ mode: 'factor', force: true })
      } catch (error) {
        this.$message.error((error && error.backendMessage) || this.$t('strategyV2.factorResearch.runFailed'))
      } finally {
        this.stopRunTimer()
        this.running = false
      }
    },
    runActive () {
      return this.mode === 'portfolio' ? this.run() : this.runFactorResearch()
    },
    async openRun (item) {
      if (this.historyDetailLoading) return
      if (this.mode === 'factor') {
        return item.history_type === 'benchmark'
          ? this.openFactorBenchmarkRun(item)
          : this.openFactorRun(item)
      }
      this.historyDetailLoading = true
      this.historyDetailRunId = this.historyItemKey(item)
      try {
        const response = await getStrategyBacktestRun(item.id)
        const run = response.data || {}
        this.selectedRun = run
        this.result = run.result || null
        const assumptions = (run.result && run.result.executionAssumptions) || {}
        const initialCapital = run.initial_capital !== undefined && run.initial_capital !== null
          ? run.initial_capital
          : assumptions.initialCapital
        const leverage = run.leverage !== undefined && run.leverage !== null
          ? run.leverage
          : assumptions.leverage
        if (initialCapital !== undefined && initialCapital !== null) this.form.initialCapital = Number(initialCapital)
        if (run.commission !== undefined && run.commission !== null) this.form.commission = Number(run.commission)
        else if (assumptions.commission !== undefined) this.form.commission = Number(assumptions.commission)
        if (run.slippage !== undefined && run.slippage !== null) this.form.slippage = Number(run.slippage)
        else if (assumptions.slippage !== undefined) this.form.slippage = Number(assumptions.slippage)
        this.form.leverage = Math.max(1, Number(leverage || 1))
        this.form.leverageEnabled = assumptions.leverageEnabled !== undefined
          ? Boolean(assumptions.leverageEnabled)
          : this.form.leverage > 1
        if (run.start_date || assumptions.startDate) this.form.startDate = moment(run.start_date || assumptions.startDate)
        if (run.end_date || assumptions.endDate) this.form.endDate = moment(run.end_date || assumptions.endDate)
        this.params = run.params || {}
        if (run.source_id && Number(this.form.sourceId) !== Number(run.source_id)) {
          this.form.sourceId = Number(run.source_id)
          const detail = await getScriptSourceDetail(run.source_id)
          this.source = detail.data
          this.sourceCategory = this.source && this.source.asset_type === 'portfolio_strategy'
            ? 'portfolio_strategy'
            : 'script'
          const compiled = await compileScriptSource({ sourceId: run.source_id })
          this.manifest = compiled.data && compiled.data.manifest
          this.backtestRangePolicy = compiled.data && compiled.data.backtestRangePolicy
        } else if (this.source) {
          this.sourceCategory = this.source.asset_type === 'portfolio_strategy'
            ? 'portfolio_strategy'
            : 'script'
        }
        this.historyVisible = false
      } catch (error) {
        this.$message.error((error && error.backendMessage) || this.$t('strategyV2.backtest.historyLoadFailed'))
      } finally {
        this.historyDetailLoading = false
        this.historyDetailRunId = null
      }
    },
    async openFactorRun (item) {
      if (this.historyDetailLoading) return
      this.historyDetailLoading = true
      this.historyDetailRunId = this.historyItemKey(item)
      try {
        const response = await getStrategyFactorResearchRun(item.id)
        const run = response.data || {}
        this.factorResearchMode = 'single'
        this.selectedRun = run
        this.factorResult = run.result || null
        this.factorForm = {
          universeId: Number(run.universe_id || (run.result && run.result.universeId)) || null,
          frequency: run.timeframe || (run.result && run.result.frequency) || '1d',
          factorId: run.factor_id || 'momentum_20',
          groups: Number(run.groups_count || 5),
          holdingPeriod: Number(run.holding_period || 5),
          neutralizeIndustry: Boolean(run.neutralize_industry)
        }
        this.factorParams = { ...((run.result && run.result.factorParams) || {}) }
        this.form.commission = Number(run.commission || 0)
        this.form.slippage = Number(run.slippage || 0)
        if (run.start_date) this.form.startDate = moment(run.start_date)
        if (run.end_date) this.form.endDate = moment(run.end_date)
        if (!run.universe_id && run.source_id && Number(this.form.sourceId) !== Number(run.source_id)) {
          this.form.sourceId = Number(run.source_id)
          const detail = await getScriptSourceDetail(run.source_id)
          this.source = detail.data
          const compiled = await compileScriptSource({ sourceId: run.source_id })
          this.manifest = compiled.data && compiled.data.manifest
          this.backtestRangePolicy = compiled.data && compiled.data.backtestRangePolicy
        }
        this.historyVisible = false
      } catch (error) {
        this.$message.error((error && error.backendMessage) || this.$t('strategyV2.factorResearch.historyLoadFailed'))
      } finally {
        this.historyDetailLoading = false
        this.historyDetailRunId = null
      }
    },
    async openFactorBenchmarkRun (item) {
      if (this.historyDetailLoading) return
      this.historyDetailLoading = true
      this.historyDetailRunId = this.historyItemKey(item)
      try {
        const response = await getStrategyFactorBenchmarkRun(item.id)
        const run = response.data || {}
        const result = run.result || {}
        this.factorResearchMode = 'benchmark'
        this.selectedRun = run
        this.factorResult = result
        this.factorForm = {
          universeId: Number(run.universe_id || (result.universe && result.universe.id)) || null,
          frequency: run.timeframe || result.frequency || '1d',
          factorId: this.factorForm.factorId,
          groups: Number(run.groups_count || 5),
          holdingPeriod: Number(run.holding_period || 5),
          neutralizeIndustry: Boolean(run.neutralize_industry)
        }
        this.benchmarkFactorIds = (result.rankings || []).map(row => row.factorId).filter(Boolean)
        if (result.validation) {
          this.benchmarkValidation = {
            trainFraction: Number(result.validation.trainFraction || 0.6),
            falseDiscoveryRate: Number(result.validation.falseDiscoveryRate || 0.1),
            minimumAbsOosIc: Number(result.validation.minimumAbsOosIc || 0.02)
          }
        }
        this.form.commission = Number(run.commission || 0)
        this.form.slippage = Number(run.slippage || 0)
        if (run.start_date) this.form.startDate = moment(run.start_date)
        if (run.end_date) this.form.endDate = moment(run.end_date)
        this.historyVisible = false
      } catch (error) {
        this.$message.error((error && error.backendMessage) || this.$t('strategyV2.factorResearch.historyLoadFailed'))
      } finally {
        this.historyDetailLoading = false
        this.historyDetailRunId = null
      }
    },
    factorLabel (factorId) {
      const selected = this.researchFactorOptions.find(item => String(item.factor_id || '').toLowerCase() === String(factorId || '').toLowerCase())
      if (selected) return this.researchFactorName(selected)
      return this.$t(`strategyV2.factorResearch.factors.${{
        momentum_20: 'momentum20',
        volatility_20: 'volatility20',
        reversal_5: 'reversal5',
        value: 'value',
        quality: 'quality',
        size: 'size'
      }[factorId] || 'momentum20'}`)
    },
    factorTone (value) {
      const number = Number(value || 0)
      return number > 0 ? 'positive' : number < 0 ? 'negative' : ''
    },
    formatPercent (value, signed = true) {
      const number = Number(value || 0)
      return `${signed && number > 0 ? '+' : ''}${number.toFixed(2)}%`
    },
    formatRate (value) {
      return `${(Number(value || 0) * 100).toFixed(3)}%`
    },
    formatNumber (value, digits = 2) {
      const number = Number(value || 0)
      if (!Number.isFinite(number)) return '∞'
      return number.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
    },
    formatSignedNumber (value, digits = 2) {
      const number = Number(value || 0)
      if (!Number.isFinite(number)) return '-'
      return `${number > 0 ? '+' : ''}${this.formatNumber(number, digits)}`
    },
    profitTone (value) {
      const number = Number(value || 0)
      if (number > 0) return 'positive'
      if (number < 0) return 'negative'
      return 'neutral'
    },
    formatDate (value) {
      return formatBacktestTime(value, { locale: this.$i18n.locale, fallback: '-' })
    },
    historyStatusLabel (item) {
      const status = item.result_status === 'complete' ? 'completed_trades' : (item.result_status || 'unknown')
      return this.$t(`strategyV2.backtest.status.${status}`)
    },
    historyReturnTone (item) {
      if (item.result_status === 'no_signals') return 'neutral'
      return Number(item.total_return) >= 0 ? 'positive' : 'negative'
    }
  }
}
</script>

<style lang="less" scoped>
.backtest-page {
  --workspace-heading: #17233d;
  --workspace-text: #445269;
  --workspace-muted: #718096;
  --workspace-faint: #8b96a7;
  --workspace-border: #e2e6eb;
  --workspace-surface: #fafbfc;
  min-height: 100%;
  padding: 0 14px 22px;
  background: #f1f3f5;
  color: var(--workspace-text);
  font-size: 12px;
}
.workspace-toolbar, .panel { border: 1px solid #e2e6eb; border-radius: 10px; background: #fff; box-shadow: 0 6px 20px rgba(15, 35, 60, 0.045); }
.workspace-toolbar { position: sticky; z-index: 20; top: 0; display: flex; width: calc(100% + 28px); align-items: center; justify-content: space-between; gap: 16px; min-height: 48px; margin-right: -14px; margin-bottom: 10px; margin-left: -14px; padding: 7px 24px; border-radius: 0; }
.workspace-toolbar__primary { display: flex; min-width: 0; align-items: center; gap: 12px; }
.workspace-mode-tabs { display: inline-flex; overflow: hidden; border-radius: 6px; }
.workspace-mode-tabs /deep/ .ant-radio-button-wrapper { border-radius: 0; }
.workspace-mode-tabs /deep/ .ant-radio-button-wrapper:first-child { border-radius: 6px 0 0 6px; }
.workspace-mode-tabs /deep/ .ant-radio-button-wrapper:last-child { border-radius: 0 6px 6px 0; }
.workspace-toolbar__context { overflow: hidden; color: var(--workspace-muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.workspace-factor-mode { display: inline-flex; min-width: 0; align-items: center; gap: 7px; }
.workspace-factor-mode__label { color: var(--workspace-muted); font-size: 10px; white-space: nowrap; }
.factor-mode-compact { display: inline-flex; overflow: hidden; flex: none; padding: 2px; border: 1px solid var(--workspace-border); border-radius: 7px; background: var(--workspace-surface); }
.factor-mode-compact__button { display: inline-flex; height: 26px; align-items: center; gap: 6px; padding: 0 9px; border: 0; border-radius: 5px; color: var(--workspace-muted); background: transparent; font-size: 11px; font-weight: 600; line-height: 26px; white-space: nowrap; cursor: pointer; transition: color .16s ease, background .16s ease, box-shadow .16s ease; }
.factor-mode-compact__button:hover { color: var(--primary-color, #52c41a); }
.factor-mode-compact__button.active { color: var(--primary-color, #52c41a); background: #fff; box-shadow: 0 1px 4px rgba(15, 35, 60, .13); }
.factor-mode-compact__button b { min-width: 17px; height: 17px; padding: 0 5px; border-radius: 999px; color: var(--workspace-faint); background: color-mix(in srgb, var(--workspace-border) 58%, transparent); font-size: 9px; font-weight: 700; line-height: 17px; text-align: center; }
.factor-mode-compact__button.active b { color: #fff; background: var(--primary-color, #52c41a); }
.section-hint, .history-title-row p { margin: 0; color: var(--workspace-muted); font-size: 12px; line-height: 1.55; }
.hero-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.hero-stat { display: inline-flex; align-items: baseline; gap: 5px; padding: 7px 10px; border-radius: 8px; color: #718096; background: #f7f9fb; font-size: 12px; }
.source-category-switch { display: flex; width: 100%; overflow: hidden; margin-bottom: 9px; border-radius: 6px; }
.source-category-switch /deep/ .ant-radio-button-wrapper { flex: 1 1 0; min-width: 0; overflow: hidden; padding: 0 8px; border-radius: 0; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.source-category-switch /deep/ .ant-radio-button-wrapper:first-child { border-radius: 6px 0 0 6px; }
.source-category-switch /deep/ .ant-radio-button-wrapper:last-child { border-radius: 0 6px 6px 0; }
.source-empty-alert { margin-top: 10px; }
.hero-stat strong { color: #25364f; font-size: 16px; }
.workspace-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; align-items: start; }
.workspace-grid.settings-open { grid-template-columns: 332px minmax(620px, 1fr); }
.panel { padding: 14px; }
.config-panel { position: sticky; top: 60px; display: flex; overflow: hidden; height: calc(100vh - 164px); height: calc(100dvh - 164px); min-height: 0; flex-direction: column; padding: 0; }
.config-scroll { min-height: 0; overflow-y: auto; flex: 1 1 auto; padding: 10px 10px 4px; scrollbar-gutter: stable; }
.run-action-bar { position: relative; z-index: 2; flex: none; padding: 10px 14px 14px; border-top: 1px solid #e8edf2; background: #fff; box-shadow: 0 -8px 20px rgba(15, 35, 60, 0.05); }
.result-panel { height: calc(100vh - 164px); height: calc(100dvh - 164px); min-height: 0; overflow-x: hidden; overflow-y: auto; }
.result-progress-strip { display: grid; grid-template-columns: minmax(260px, .8fr) minmax(220px, 1.2fr); align-items: center; gap: 16px; margin-bottom: 12px; padding: 10px 13px; border: 1px solid color-mix(in srgb, var(--primary-color, #52c41a) 28%, #e2e6eb); border-radius: 9px; color: #516075; background: color-mix(in srgb, var(--primary-color, #52c41a) 5%, #fff); }
.result-progress-strip > div { display: flex; min-width: 0; align-items: center; gap: 8px; }
.result-progress-strip .anticon, .result-progress-strip strong { color: var(--primary-color, #52c41a); }
.result-progress-strip span { color: #7c8ca1; font-size: 11px; }
.run-progress { width: 80%; max-width: 520px; margin: 4px 0 0; }
.panel-heading, .panel-heading > div, .subheading, .history-title-row, .history-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.panel-heading > div { justify-content: flex-start; }
.panel-heading h2, .history-title-row h2 { margin: 0; color: var(--workspace-heading); font-size: 15px; font-weight: 700; line-height: 1.4; }
.step-badge { display: inline-flex; width: 22px; height: 22px; align-items: center; justify-content: center; border-radius: 7px; color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 10%, transparent); font-size: 11px; font-weight: 800; }
.theme-ready-tag { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 36%, transparent); color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 8%, transparent); }
.config-section { margin: 0 0 10px; padding: 12px; border: 1px solid #e5eaf0; border-radius: 10px; background: #fafbfc; }
.config-section__heading { min-height: 24px; margin-bottom: 10px; }
.config-section__heading > div { display: flex; align-items: center; gap: 10px; min-width: 0; }
.config-section__heading h2,
.config-section__heading h3 { overflow: hidden; margin: 0; color: #26364c; font-size: 14px; font-weight: 700; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.config-section__heading > span:last-child { flex: 0 0 auto; color: var(--workspace-muted); font-size: 11px; }
.config-section__hint { margin: -2px 0 10px; }
.config-section /deep/ .ant-form-item-label > label { color: #445269; font-size: 12px; font-weight: 600; }
.full-width { width: 100%; }
.manifest-card { margin-top: 10px; padding: 11px; border: 1px solid #e5e9ee; border-left: 3px solid var(--primary-color, #52c41a); border-radius: 8px; background: #fff; }
.manifest-title { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; color: var(--primary-color, #52c41a); font-weight: 700; }
.manifest-grid, .metrics-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.manifest-grid div, .metric-card { display: flex; flex-direction: column; gap: 3px; }
.manifest-grid span, .metric-card span, .assumption-strip span { color: var(--workspace-muted); font-size: 11px; }
.manifest-grid strong { color: #23344d; overflow-wrap: anywhere; }
.section-hint { margin: 7px 0 10px; font-size: 12px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 10px; }
.form-grid /deep/ .ant-form-item { margin-bottom: 12px; }
.date-range-card { margin-bottom: 12px; padding: 11px; border: 1px solid #e4e8ed; border-radius: 9px; background: #fff; }
.range-presets { display: block; margin: 0 0 11px; }
.range-presets__label { display: block; margin-bottom: 7px; color: var(--workspace-muted); font-size: 11px; font-weight: 600; }
.range-presets__buttons { display: grid; min-width: 0; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; }
.range-preset-wrap { display: block; min-width: 0; }
.range-preset-wrap /deep/ .ant-btn-sm { width: 100%; min-width: 0; height: 28px; padding: 0 3px; border-radius: 7px; font-size: 10px; }
.range-preset-wrap /deep/ .ant-btn-primary { border-color: var(--primary-color, #52c41a); background: var(--primary-color, #52c41a); box-shadow: 0 3px 10px color-mix(in srgb, var(--primary-color, #52c41a) 24%, transparent); }
.range-preset-wrap /deep/ .ant-btn[disabled],
.range-preset-wrap /deep/ .ant-btn[disabled]:hover,
.range-preset-wrap /deep/ .ant-btn[disabled]:focus { border-color: #e1e5ea !important; background: #f0f2f4 !important; color: #a0a9b7 !important; box-shadow: none !important; }
.date-range-fields { display: grid; grid-template-columns: minmax(0, 1fr) 18px minmax(0, 1fr); align-items: end; gap: 5px; }
.date-range-fields /deep/ .ant-form-item { margin-bottom: 0; }
.date-range-fields /deep/ .ant-form-item-label { padding-bottom: 4px; line-height: 1; }
.date-range-fields /deep/ .ant-form-item-label > label { color: var(--workspace-text); font-size: 11px; }
.date-range-fields /deep/ .ant-calendar-picker-input { height: 34px; border-color: #dfe4ea; border-radius: 7px; background: #fff; font-size: 12px; font-variant-numeric: tabular-nums; }
.date-range-arrow { display: flex; height: 34px; align-items: center; justify-content: center; color: #9aa5b5; font-size: 10px; }
.range-policy-note { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 7px; margin-top: 10px; padding-top: 9px; border-top: 1px solid #e1e6eb; color: #64748b; }
.range-policy-note > .anticon { margin-top: 2px; color: var(--primary-color, #52c41a); }
.range-policy-note div { min-width: 0; }
.range-policy-note strong, .range-policy-note span { display: block; }
.range-policy-note strong { color: var(--workspace-text); font-size: 11px; line-height: 1.45; }
.range-policy-note span { margin-top: 2px; color: var(--workspace-muted); font-size: 10px; line-height: 1.45; }
.range-policy-note.is-error > .anticon, .range-policy-note.is-error strong { color: #dc2626; }
.switch-row { display: flex; align-items: center; gap: 8px; min-height: 32px; color: #7c8ca1; font-size: 11px; }
.params-section { margin: 0 0 10px; padding: 12px; border: 1px solid #e5eaf0; }
.dependency-summary { display: grid; grid-template-columns: 18px minmax(0, 1fr) 18px; align-items: start; gap: 8px; margin: 0 0 10px; padding: 10px; border: 1px solid var(--workspace-border); border-left: 3px solid #c58b14; border-radius: 8px; background: var(--workspace-surface); color: #9a6b10; }
.dependency-summary > div { min-width: 0; }
.dependency-summary strong, .dependency-summary span { display: block; }
.dependency-summary strong { color: var(--workspace-text); font-size: 11px; }
.dependency-summary span { overflow: hidden; margin-top: 2px; color: var(--workspace-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.dependency-summary > .anticon:last-child { cursor: help; color: #9aa5b5; }
.result-heading { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #edf0f4; }
.result-heading > div { min-width: 0; }
.result-source-name { overflow: hidden; max-width: 420px; color: #7c8ca1; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.factor-settings { position: relative; overflow: hidden; padding: 0; background: #fff; }
.factor-settings::before { position: absolute; top: 0; left: 0; width: 3px; height: 54px; background: var(--primary-color, #52c41a); content: ''; }
.factor-settings > .config-section__heading { margin: 0; padding: 13px 13px 10px; border-bottom: 1px solid var(--workspace-border); background: linear-gradient(110deg, color-mix(in srgb, var(--primary-color, #52c41a) 7%, #fff), #fff 62%); }
.factor-settings > .factor-contract-note,
.factor-settings > .factor-research-mode,
.factor-settings > .benchmark-selection-summary,
.factor-settings > .form-grid { margin-right: 12px; margin-left: 12px; }
.factor-contract-note { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 9px; margin-top: 11px; margin-bottom: 10px; padding: 9px; border: 1px solid var(--workspace-border); border-radius: 8px; color: var(--workspace-muted); background: var(--workspace-surface); }
.factor-contract-note > .anticon { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 10%, transparent); }
.factor-contract-note strong, .factor-contract-note span { display: block; }
.factor-contract-note strong { color: var(--workspace-text); font-size: 11px; line-height: 1.45; }
.factor-contract-note span { margin-top: 2px; color: var(--workspace-muted); font-size: 10px; line-height: 1.5; }
.factor-research-mode { display: flex; width: calc(100% - 24px); overflow: hidden; margin-bottom: 10px; border-radius: 7px; }
.factor-research-mode /deep/ .ant-radio-button-wrapper { flex: 1 1 0; height: 34px; padding: 0 8px; border-color: var(--workspace-border); color: var(--workspace-muted); background: var(--workspace-surface); font-size: 11px; line-height: 32px; text-align: center; }
.factor-research-mode /deep/ .ant-radio-button-wrapper:first-child { border-radius: 7px 0 0 7px; }
.factor-research-mode /deep/ .ant-radio-button-wrapper:last-child { border-radius: 0 7px 7px 0; }
.factor-research-mode /deep/ .ant-radio-button-wrapper-checked { border-color: var(--primary-color, #52c41a); color: #fff; background: var(--primary-color, #52c41a); box-shadow: -1px 0 0 0 var(--primary-color, #52c41a); }
.benchmark-selection-summary { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 9px; align-items: center; margin-bottom: 10px; padding: 10px; border: 1px solid color-mix(in srgb, var(--primary-color, #52c41a) 28%, var(--workspace-border)); border-radius: 8px; background: color-mix(in srgb, var(--primary-color, #52c41a) 5%, #fff); }
.benchmark-selection-summary > span { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 10%, transparent); }
.benchmark-selection-summary strong, .benchmark-selection-summary small { display: block; }
.benchmark-selection-summary strong { color: var(--workspace-heading); font-size: 11px; }
.benchmark-selection-summary small { margin-top: 2px; color: var(--workspace-muted); font-size: 9px; }
.benchmark-selection-summary em { display: grid; place-items: center; min-width: 28px; height: 28px; border: 1px solid color-mix(in srgb, var(--primary-color, #52c41a) 38%, var(--workspace-border)); border-radius: 8px; color: var(--primary-color, #52c41a); background: #fff; font-size: 12px; font-style: normal; font-weight: 800; }
.factor-settings > .form-grid { padding-bottom: 4px; }
.factor-settings /deep/ .ant-form-item { margin-bottom: 10px; }
.factor-settings /deep/ .ant-form-item-label { padding-bottom: 4px; line-height: 1; }
.factor-settings /deep/ .ant-select-selection,
.factor-settings /deep/ .ant-input-number { border-color: var(--workspace-border); border-radius: 7px; background: #fff; }
.factor-settings /deep/ .ant-select-selection--multiple { min-height: 70px; padding: 3px; }
.factor-settings /deep/ .ant-select-selection--multiple .ant-select-selection__choice { max-width: 100%; border-color: var(--workspace-border); border-radius: 5px; background: var(--workspace-surface); }
.subheading h3 { margin: 0; color: #26364c; font-size: 14px; }
.subheading span { color: #7c8ca1; font-size: 11px; }
.metrics-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.metric-card { padding: 13px; border: 1px solid #edf0f4; border-radius: 9px; background: #f7f9fc; }
.metric-card strong { font-size: 20px; color: #20324a; }
.positive { color: #16a34a !important; }
.negative { color: #dc2626 !important; }
.trade-profit { font-weight: 700; font-variant-numeric: tabular-nums; }
.neutral { color: #94a3b8 !important; }
.run-id { color: #8a97aa; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.result-empty { min-height: calc(100vh - 265px); display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start; padding: 18px 0; text-align: left; }
.result-empty::before, .result-empty::after { display: none; }
.empty-hero-card { display: grid; width: 100%; grid-template-columns: 40px minmax(0, 1fr); column-gap: 12px; padding: 18px; border: 1px solid var(--workspace-border); border-radius: 10px; background: var(--workspace-surface); box-shadow: none; }
.empty-hero-card::before { display: none; }
.result-running { min-height: 390px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 30px; text-align: center; color: #718096; }
.result-running h3 { margin: 4px 0 0; color: #17233d; font-size: 18px; }
.result-running p { max-width: 620px; margin: 0; line-height: 1.6; }
.result-running > strong { color: var(--primary-color, #52c41a); font-variant-numeric: tabular-nums; }
.running-icon { display: inline-flex; width: 64px; height: 64px; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--primary-color, #52c41a) 28%, transparent); border-radius: 22px; color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 9%, transparent); font-size: 27px; }
.running-contract { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 7px; }
.running-contract span { display: inline-flex; align-items: center; gap: 6px; padding: 6px 9px; border: 1px solid #e4e9ef; border-radius: 999px; color: #64748b; font-size: 11px; }
.empty-orbit { display: inline-flex; width: 40px; height: 40px; grid-column: 1; grid-row: 1 / 4; align-items: center; justify-content: center; border: 1px solid var(--workspace-border); border-radius: 8px; color: var(--primary-color, #52c41a); background: #fff; box-shadow: none; font-size: 17px; }
.empty-orbit > .anticon { transform: none; }
.result-empty h3 { grid-column: 2; margin: 0 0 4px; color: var(--workspace-heading); font-size: 15px; line-height: 1.45; }
.result-empty p { grid-column: 2; max-width: none; margin: 0; color: var(--workspace-muted); font-size: 12px; line-height: 1.6; }
.empty-checks { grid-column: 2; display: flex; justify-content: flex-start; gap: 8px 18px; flex-wrap: wrap; margin-top: 12px; }
.empty-checks span { display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; border-radius: 0; color: var(--workspace-muted); background: transparent; font-size: 11px; }
.empty-checks span .anticon { color: var(--workspace-faint); }
.empty-checks span.done { color: var(--workspace-text); border: 0; background: transparent; }
.empty-checks span.done .anticon { color: var(--primary-color, #52c41a); }
.empty-preview-grid { display: grid; width: 100%; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
.empty-preview-card { display: grid; min-width: 0; grid-template-columns: 32px 1fr; grid-template-rows: auto auto; column-gap: 10px; padding: 13px 14px; border: 1px solid var(--workspace-border); border-radius: 9px; background: #fff; box-shadow: none; text-align: left; }
.empty-preview-card:hover { border-color: var(--workspace-border); box-shadow: none; transform: none; }
.empty-preview-card > .anticon { display: inline-flex; width: 34px; height: 34px; grid-row-start: 1; grid-row-end: 3; align-items: center; justify-content: center; align-self: center; border-radius: 10px; color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 9%, transparent); font-size: 17px; }
.empty-preview-card span { grid-column: 2; overflow: hidden; color: var(--workspace-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.empty-preview-card strong { display: -webkit-box; min-width: 0; min-height: 30px; grid-column: 2; overflow: hidden; color: var(--workspace-heading); font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; word-break: normal; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.result-trustbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding: 10px 12px; border: 1px solid; border-radius: 9px; }
.result-trustbar > div:first-child { display: flex; min-width: 0; align-items: center; gap: 8px; }
.result-trustbar strong { white-space: nowrap; }
.result-trustbar span { overflow: hidden; color: #64748b; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.result-trustbar.is-success { border-color: #b7eb8f; background: #f6ffed; color: #3f8600; }
.result-trustbar.is-warning { border-color: #ffe58f; background: #fffbe6; color: #ad6800; }
.result-trustbar.is-error { border-color: #ffccc7; background: #fff2f0; color: #cf1322; }
.trust-badges { display: flex; flex: none; }
.chart-card { margin-top: 14px; padding: 14px; border: 1px solid #edf0f4; border-radius: 9px; }
.subheading > div { min-width: 0; }
.benchmark-caption { display: block; margin-top: 3px; }
.equity-chart { display: block; width: 100%; height: 360px; margin-top: 8px; }
.assumption-strip { display: grid; grid-template-columns: 1fr 1.8fr 0.8fr 0.8fr; gap: 8px; margin-top: 12px; }
.assumption-strip div { min-width: 0; padding: 9px 10px; border-radius: 8px; background: #f8fafc; }
.assumption-strip strong { display: block; overflow: hidden; margin-top: 2px; color: #334155; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.result-tabs { margin-top: 14px; }
.history-header { margin: 16px 0 9px; }
.history-header h3 { margin: 0; color: #26364c; }
.history-title-row { align-items: flex-start; }
.history-title-row p { margin-top: 4px; font-size: 12px; }
.drawer-history-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.factor-history-switch { display: flex; width: 100%; margin-bottom: 14px; }
.factor-history-switch /deep/ .ant-radio-button-wrapper { display: inline-flex; flex: 1 1 0; align-items: center; justify-content: center; gap: 6px; color: #64748b; text-align: center; }
.factor-history-switch /deep/ .ant-radio-button-wrapper b { display: inline-flex; min-width: 18px; height: 18px; align-items: center; justify-content: center; padding: 0 5px; border-radius: 999px; color: inherit; background: rgba(100, 116, 139, .1); font-size: 9px; }
.factor-history-switch /deep/ .ant-radio-button-wrapper-checked b { background: rgba(255, 255, 255, .2); }
.drawer-history-header p { margin: 0; color: #718096; font-size: 12px; line-height: 1.55; }
.drawer-run-list { display: flex; flex-direction: column; gap: 9px; }
.run-card { display: flex; min-width: 0; flex-direction: column; gap: 6px; padding: 11px; border: 1px solid #e6eaf0; border-radius: 9px; background: #fafbfc; color: inherit; text-align: left; cursor: pointer; transition: 0.16s ease; }
.run-card:hover, .run-card.active { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 48%, transparent); background: color-mix(in srgb, var(--primary-color, #52c41a) 5%, #fff); transform: translateY(-1px); }
.run-card__top, .run-card__metrics { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.run-card__top strong { min-width: 0; overflow: hidden; color: #2a3b52; text-overflow: ellipsis; white-space: nowrap; }
.run-card__top em { color: #9aa5b5; font-style: normal; font-size: 11px; }
.run-card__meta { overflow: hidden; color: #8491a4; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.run-card__status { width: fit-content; padding: 2px 6px; border-radius: 999px; color: #4d7c0f; background: #ecfccb; font-size: 9px; }
.run-card__status.status-no_signals, .run-card__status.status-open_position_only { color: #a16207; background: #fef3c7; }
.run-card__status.status-unknown { color: #64748b; background: #e2e8f0; }
.history-kind-pill { display: inline-flex; width: fit-content; align-items: center; gap: 5px; padding: 3px 7px; border: 1px solid #dce4ed; border-radius: 5px; color: #64748b; background: #fff; font-size: 9px; font-weight: 650; }
.history-kind-pill--benchmark { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 34%, #dce4ed); color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 6%, #fff); }
.run-card--benchmark { border-left: 3px solid color-mix(in srgb, var(--primary-color, #52c41a) 70%, transparent); }
.run-card__metrics b { font-size: 15px; }
.factor-history-metrics b { font-variant-numeric: tabular-nums; }
.run-card__metrics small { color: #8491a4; }
.theme-dark.backtest-page {
  --workspace-heading: #f3f4f6;
  --workspace-text: rgba(255, 255, 255, .76);
  --workspace-muted: rgba(255, 255, 255, .5);
  --workspace-faint: rgba(255, 255, 255, .34);
  --workspace-border: #2d2d2d;
  --workspace-surface: #151515;
  background: #080808;
  color: var(--workspace-text);
}
.theme-dark .workspace-toolbar, .theme-dark .panel { border-color: #2d2d2d; background: #111111; box-shadow: 0 8px 26px rgba(0, 0, 0, 0.24); }
.theme-dark .factor-mode-compact { border-color: #303030; background: #0d0d0d; }
.theme-dark .factor-mode-compact__button { color: rgba(255, 255, 255, .5); }
.theme-dark .factor-mode-compact__button:hover { color: var(--primary-color, #52c41a); }
.theme-dark .factor-mode-compact__button.active { color: var(--primary-color, #52c41a); background: #1b1b1b; box-shadow: 0 1px 5px rgba(0, 0, 0, .35); }
.theme-dark .factor-mode-compact__button b { color: rgba(255, 255, 255, .42); background: #292929; }
.theme-dark .factor-mode-compact__button.active b { color: #fff; background: var(--primary-color, #52c41a); }
.theme-dark .result-progress-strip { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 34%, #2d2d2d); background: color-mix(in srgb, var(--primary-color, #52c41a) 7%, #111111); }
.theme-dark .workspace-toolbar__context { color: rgba(255, 255, 255, 0.42); }
.theme-dark .run-action-bar { border-color: #2d2d2d; background: #111111; box-shadow: 0 -10px 24px rgba(0, 0, 0, 0.28); }
.theme-dark .panel-heading h2, .theme-dark .history-title-row h2, .theme-dark .subheading h3, .theme-dark .history-header h3, .theme-dark .result-empty h3, .theme-dark .result-running h3 { color: #f3f4f6; }
.theme-dark .config-section { border-color: #2d2d2d; background: #151515; }
.theme-dark .config-section__heading h2, .theme-dark .config-section__heading h3 { color: #f3f4f6; }
.theme-dark .config-section /deep/ .ant-form-item-label > label { color: rgba(255, 255, 255, 0.68); }
.theme-dark .hero-stat, .theme-dark .metric-card, .theme-dark .assumption-strip div, .theme-dark .run-card { border-color: rgba(255, 255, 255, 0.1); background: #0d0d0d; }
.theme-dark .hero-stat strong, .theme-dark .manifest-grid strong, .theme-dark .metric-card strong, .theme-dark .assumption-strip strong, .theme-dark .run-card__top strong { color: #e5e7eb; }
.theme-dark .manifest-card { border-color: #303030; border-left-color: var(--primary-color, #52c41a); background: #181818; }
.theme-dark .manifest-title { color: var(--primary-color, #52c41a); }
.theme-dark .range-presets__label { color: rgba(255, 255, 255, 0.48); }
.theme-dark .range-preset-wrap /deep/ .ant-btn:not(.ant-btn-primary) { border-color: rgba(255, 255, 255, 0.14); background: #1a1a1a; color: rgba(255, 255, 255, 0.72); }
.theme-dark .range-preset-wrap /deep/ .ant-btn:not(.ant-btn-primary):hover { border-color: var(--primary-color, #52c41a); color: var(--primary-color, #52c41a); }
.theme-dark .range-preset-wrap /deep/ .ant-btn[disabled],
.theme-dark .range-preset-wrap /deep/ .ant-btn[disabled]:hover,
.theme-dark .range-preset-wrap /deep/ .ant-btn[disabled]:focus { border-color: #303030 !important; background: #141414 !important; color: rgba(255, 255, 255, 0.24) !important; box-shadow: none !important; }
.theme-dark .chart-card { border-color: rgba(255, 255, 255, 0.1); }
.theme-dark .result-trustbar.is-success { border-color: #315d22; background: #13200f; color: #73d13d; }
.theme-dark .result-trustbar.is-warning { border-color: #664d03; background: #211b08; color: #ffc53d; }
.theme-dark .result-trustbar.is-error { border-color: #6b2525; background: #251111; color: #ff7875; }
.theme-dark .result-trustbar span { color: rgba(255, 255, 255, 0.52); }
.theme-dark .run-card:hover, .theme-dark .run-card.active { border-color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 10%, #111); }
.theme-dark .history-kind-pill { border-color: #303030; color: rgba(255, 255, 255, .58); background: #151515; }
.theme-dark .history-kind-pill--benchmark { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 40%, #303030); color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 9%, #111); }
.theme-dark .empty-hero-card { border-color: var(--workspace-border); background: var(--workspace-surface); box-shadow: none; }
.theme-dark .empty-preview-card { border-color: var(--workspace-border); background: #111111; }
.theme-dark .empty-preview-card strong { color: #e5e7eb; }
.theme-dark .result-running > strong { color: var(--primary-color, #52c41a); }
.theme-dark .running-icon { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 38%, transparent); background: color-mix(in srgb, var(--primary-color, #52c41a) 9%, #0d0d0d); }
.theme-dark .empty-orbit { border-color: var(--workspace-border); background: #111111; }
.theme-dark .empty-checks span.done { background: transparent; }
.theme-dark .empty-preview-card > .anticon { background: color-mix(in srgb, var(--primary-color, #52c41a) 10%, #111111); }
.theme-dark .running-contract span { border-color: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.58); background: #0d0d0d; }
.theme-dark .runtime-heading, .theme-dark .params-section, .theme-dark .result-heading { border-color: #2d2d2d; }
.theme-dark .date-range-card { border-color: #303030; background: #181818; }
.theme-dark .date-range-fields /deep/ .ant-form-item-label > label { color: rgba(255,255,255,.58); }
.theme-dark .date-range-fields /deep/ .ant-calendar-picker-input { border-color: #333333; background: #181818; color: rgba(255,255,255,.82); }
.theme-dark .date-range-fields /deep/ .ant-calendar-picker-icon { color: rgba(255,255,255,.38); }
.theme-dark .range-policy-note { border-color: #303030; }
.theme-dark .range-policy-note strong { color: rgba(255,255,255,.68); }
.theme-dark .range-policy-note span { color: rgba(255,255,255,.42); }
.theme-dark .dependency-summary { border-color: var(--workspace-border); border-left-color: #c58b14; background: var(--workspace-surface); }
.theme-dark .dependency-summary span { color: rgba(255,255,255,.48); }
.theme-dark .dependency-summary strong { color: var(--workspace-text); }
.theme-dark .factor-contract-note { border-color: var(--workspace-border); }
.theme-dark .factor-contract-note strong { color: var(--workspace-text); }
.theme-dark .factor-settings { background: #151515; }
.theme-dark .factor-settings > .config-section__heading { border-color: var(--workspace-border); background: linear-gradient(110deg, color-mix(in srgb, var(--primary-color, #52c41a) 8%, #151515), #151515 62%); }
.theme-dark .factor-contract-note { background: #0d0d0d; }
.theme-dark .factor-research-mode /deep/ .ant-radio-button-wrapper { border-color: #303030; color: rgba(255,255,255,.58); background: #0d0d0d; }
.theme-dark .factor-research-mode /deep/ .ant-radio-button-wrapper-checked { border-color: var(--primary-color, #52c41a); color: #fff; background: var(--primary-color, #52c41a); }
.theme-dark .benchmark-selection-summary { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 34%, #2d2d2d); background: color-mix(in srgb, var(--primary-color, #52c41a) 7%, #111); }
.theme-dark .benchmark-selection-summary strong { color: #f3f4f6; }
.theme-dark .benchmark-selection-summary em { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 42%, #2d2d2d); background: #0d0d0d; }
.theme-dark .factor-settings /deep/ .ant-select-selection,
.theme-dark .factor-settings /deep/ .ant-input-number { border-color: #333; color: rgba(255,255,255,.78); background: #181818; }
.theme-dark .factor-settings /deep/ .ant-select-selection--multiple .ant-select-selection__choice { border-color: #353535; color: rgba(255,255,255,.72); background: #0d0d0d; }
.theme-dark /deep/ .ant-form-item-label > label, .theme-dark /deep/ .ant-table { color: rgba(255, 255, 255, 0.72); }
.theme-dark /deep/ .ant-table-thead > tr > th { border-color: rgba(255, 255, 255, 0.1); background: #0d0d0d; color: rgba(255, 255, 255, 0.68); }
.theme-dark /deep/ .ant-table-tbody > tr > td { border-color: rgba(255, 255, 255, 0.08); background: #111; color: rgba(255, 255, 255, 0.72); }
@media (max-width: 1280px) { .workspace-factor-mode__label { display: none; } }
@media (max-width: 1100px) { .workspace-toolbar { flex-wrap: wrap; }.workspace-grid, .workspace-grid.settings-open { grid-template-columns: 1fr; } .config-panel { position: static; overflow: visible; height: auto; min-height: 0; max-height: none; } .config-scroll { overflow: visible; } .result-panel { min-height: 560px; } .result-empty { min-height: 480px; } }
@media (max-width: 720px) { .backtest-page { padding: 0 10px 10px; } .workspace-toolbar { top: 0; width: calc(100% + 20px); align-items: flex-start; flex-direction: column; margin-right: -10px; margin-left: -10px; padding-right: 20px; padding-left: 20px; } .workspace-toolbar__primary { width: 100%; align-items: flex-start; flex-direction: column; }.hero-actions { justify-content: flex-start; } .result-progress-strip { grid-template-columns: 1fr; }.result-empty { padding: 12px 0; }.empty-hero-card { grid-template-columns: 34px minmax(0, 1fr); padding: 14px; }.empty-orbit { width: 34px; height: 34px; }.empty-checks { grid-column: 1 / 3; }.form-grid, .manifest-grid, .metrics-grid, .assumption-strip, .empty-preview-grid { grid-template-columns: 1fr; }.range-presets__buttons { width: 100%; }.range-preset-wrap /deep/ .ant-btn { width: 100%; } }
</style>

<style lang="less">
.backtest-history-drawer .ant-drawer-header { border-bottom: 1px solid #e8edf2; }
.backtest-history-drawer .ant-drawer-body { padding: 16px; }
.drawer-detail-loading { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; padding: 10px 12px; border: 1px solid color-mix(in srgb, var(--primary-color, #52c41a) 32%, transparent); border-radius: 8px; color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 8%, transparent); font-size: 12px; }
.run-card:disabled { cursor: wait; opacity: .68; }
.run-card.loading { border-color: var(--primary-color, #52c41a); opacity: 1; }
.run-card__top strong .anticon { margin-right: 6px; color: var(--primary-color, #52c41a); }
.backtest-history-drawer.theme-dark .ant-drawer-content,
.backtest-history-drawer.theme-dark .ant-drawer-header { background: #111; }
.backtest-history-drawer.theme-dark .ant-drawer-header { border-color: rgba(255, 255, 255, 0.1); }
.backtest-history-drawer.theme-dark .ant-drawer-title,
.backtest-history-drawer.theme-dark .ant-drawer-close { color: rgba(255, 255, 255, 0.88); }
.backtest-history-drawer.theme-dark .drawer-history-header p { color: rgba(255, 255, 255, 0.5); }
.backtest-history-drawer.theme-dark .factor-history-switch .ant-radio-button-wrapper { border-color: #303030; color: rgba(255, 255, 255, .58); background: #111; }
.backtest-history-drawer.theme-dark .factor-history-switch .ant-radio-button-wrapper-checked { border-color: var(--primary-color, #52c41a); color: #fff; background: var(--primary-color, #52c41a); box-shadow: -1px 0 0 0 var(--primary-color, #52c41a); }
.backtest-history-drawer.theme-dark .run-card { border-color: rgba(255, 255, 255, 0.1); background: #0d0d0d; color: rgba(255, 255, 255, 0.72); }
.backtest-history-drawer.theme-dark .run-card:hover,
.backtest-history-drawer.theme-dark .run-card.active { border-color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 10%, #111); }
.backtest-history-drawer.theme-dark .drawer-detail-loading { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 38%, transparent); color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 9%, #0d0d0d); }
.backtest-history-drawer.theme-dark .run-card__top strong { color: #e5e7eb; }
.backtest-history-drawer.theme-dark .history-kind-pill { border-color: #303030; color: rgba(255, 255, 255, .58); background: #151515; }
.backtest-history-drawer.theme-dark .history-kind-pill--benchmark { border-color: color-mix(in srgb, var(--primary-color, #52c41a) 40%, #303030); color: var(--primary-color, #52c41a); background: color-mix(in srgb, var(--primary-color, #52c41a) 9%, #111); }
.param-description { margin-top: 5px; color: #8c8c8c; font-size: 11px; line-height: 1.45; }
</style>
