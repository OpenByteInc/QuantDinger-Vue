<template>
  <a-modal
    :visible="visible"
    :title="$t('factorLibrary.title')"
    :width="1180"
    :footer="null"
    :destroy-on-close="false"
    :wrap-class-name="isDark ? 'factor-library-modal factor-library-modal--dark' : 'factor-library-modal'"
    @cancel="$emit('close')"
  >
    <div class="factor-library-tools">
      <div class="factor-library-tools__main">
        <a-input
          v-model="search"
          allow-clear
          class="factor-library-search"
          :placeholder="$t('factorLibrary.searchPlaceholder')"
        >
          <a-icon slot="prefix" type="search" />
        </a-input>
        <a-radio-group v-model="typeFilter" button-style="solid" class="factor-library-type-filter">
          <a-radio-button value="all">{{ $t('factorLibrary.all') }}</a-radio-button>
          <a-radio-button value="technical">{{ $t('factorLibrary.technical') }}</a-radio-button>
          <a-radio-button value="fundamental">{{ $t('factorLibrary.fundamental') }}</a-radio-button>
        </a-radio-group>
        <a-button class="factor-library-refresh" icon="reload" :loading="loading" @click="loadFactors">
          {{ $t('factorLibrary.refresh') }}
        </a-button>
        <a-button type="primary" icon="plus" @click="openCustomFactorModal">
          {{ $t('factorLibrary.custom.create') }}
        </a-button>
      </div>

      <div class="factor-library-filterbar">
        <div class="factor-library-filterbar__group">
          <span class="factor-library-filterbar__label">{{ $t('factorLibrary.family') }}</span>
          <div class="factor-library-filterbar__options" role="group" :aria-label="$t('factorLibrary.family')">
            <button
              v-for="option in familyOptions"
              :key="option.value"
              type="button"
              class="factor-library-filter-chip"
              :class="{ 'factor-library-filter-chip--active': familyFilter === option.value }"
              :aria-pressed="familyFilter === option.value"
              @click="familyFilter = option.value"
            >
              {{ option.label }}
              <span>{{ familyCounts[option.value] || 0 }}</span>
            </button>
          </div>
        </div>
        <div class="factor-library-filterbar__group">
          <span class="factor-library-filterbar__label">{{ $t('factorLibrary.scopeLabel') }}</span>
          <div class="factor-library-filterbar__options" role="group" :aria-label="$t('factorLibrary.scopeLabel')">
            <button
              v-for="option in scopeOptions"
              :key="option.value"
              type="button"
              class="factor-library-filter-chip"
              :class="{ 'factor-library-filter-chip--active': scopeFilter === option.value }"
              :aria-pressed="scopeFilter === option.value"
              @click="scopeFilter = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
      <p class="factor-detail__muted">{{ $t('factorLibrary.runtimeOnlyNotice') }}</p>
      <div
        v-if="typeFilter === 'fundamental' || (selectedFactor && selectedFactor.factor_type === 'fundamental')"
        class="factor-library-notice"
        role="note"
      >
        <span class="factor-library-notice__icon"><a-icon type="database" /></span>
        <span>{{ $t('fundamentalSync.factorNotice') }}</span>
      </div>
    </div>

    <a-spin :spinning="loading">
      <div class="factor-library-workspace">
        <div
          ref="factorList"
          class="factor-library-list"
          @scroll.passive="handleListScroll"
        >
          <div class="factor-library-list__spacer" :style="{ height: `${virtualTopSpacer}px` }"></div>
          <button
            v-for="factor in virtualFactors"
            :key="factor.factor_id"
            type="button"
            class="factor-card"
            :class="{ 'factor-card--active': selectedId === factor.factor_id }"
            @click="selectFactor(factor)"
          >
            <span class="factor-card__top">
              <span class="factor-card__name">{{ factorName(factor) }}</span>
              <span class="factor-card__family">{{ familyLabel(factor) }}</span>
            </span>
            <span v-if="factorName(factor) !== factor.factor_id" class="factor-card__id">{{ factor.factor_id }}</span>
            <span
              v-if="factorDescription(factor) && factorDescription(factor) !== factor.factor_id && factorDescription(factor) !== factorName(factor)"
              class="factor-card__desc"
            >{{ factorDescription(factor) }}</span>
            <span class="factor-card__meta">
              <span>{{ categoryLabel(factor.category) }}</span>
              <span :class="{ 'factor-card__unsupported': !supportsCurrent(factor) }">
                {{ supportsCurrent(factor) ? directionLabel(factor.direction_hint) : $t('factorLibrary.notAvailableHere') }}
              </span>
            </span>
          </button>
          <div class="factor-library-list__spacer" :style="{ height: `${virtualBottomSpacer}px` }"></div>
          <div v-if="!filteredFactors.length" class="factor-library-empty">{{ emptyDescription }}</div>
        </div>

        <div v-if="selectedFactor" class="factor-detail">
          <div class="factor-detail__heading">
            <div>
              <span class="factor-detail__eyebrow">{{ selectedFactor.factor_id }} · v{{ selectedFactor.version }}</span>
              <h3>{{ factorName(selectedFactor) }}</h3>
              <p v-if="factorDescription(selectedFactor) && factorDescription(selectedFactor) !== selectedFactor.factor_id && factorDescription(selectedFactor) !== factorName(selectedFactor)">
                {{ factorDescription(selectedFactor) }}
              </p>
            </div>
            <a-button icon="copy" :disabled="!supportsCurrent(selectedFactor)" @click="copyText(factorCall(selectedFactor))">
              {{ $t('factorLibrary.copyCall') }}
            </a-button>
          </div>

          <div class="factor-detail__facts">
            <div>
              <span>{{ $t('factorLibrary.provider') }}</span>
              <strong>{{ familyLabel(selectedFactor) }}</strong>
            </div>
            <div>
              <span>{{ $t('factorLibrary.category') }}</span>
              <strong>{{ categoryLabel(selectedFactor.category) }}</strong>
            </div>
            <div>
              <span>{{ $t('factorLibrary.usageMode') }}</span>
              <strong>{{ usageModeLabel(selectedFactor) }}</strong>
            </div>
            <div>
              <span>{{ $t('factorLibrary.runtime') }}</span>
              <strong>{{ runtimeLabel(selectedFactor) }}</strong>
            </div>
          </div>

          <details class="factor-detail__insights" :key="selectedId">
            <summary>{{ $t('factorLibrary.howToUse') }}<a-icon type="down" /></summary>
            <article v-if="factorMeaning(selectedFactor) !== factorDescription(selectedFactor)">
              <strong>{{ $t('factorLibrary.whatItMeasures') }}</strong>
              <p>{{ factorMeaning(selectedFactor) }}</p>
            </article>
            <article>
              <strong>{{ $t('factorLibrary.howToUse') }}</strong>
              <p>{{ factorInterpretation(selectedFactor) }}</p>
            </article>
            <article>
              <strong>{{ $t('factorLibrary.watchOut') }}</strong>
              <p>{{ factorCaution(selectedFactor) }}</p>
            </article>
          </details>

          <section v-if="selectedFactor.expression" class="factor-detail__section factor-detail__formula">
            <div class="factor-detail__section-head">
              <h4>{{ $t('factorLibrary.formula') }}</h4>
              <a v-if="selectedFactor.source_url" :href="selectedFactor.source_url" target="_blank" rel="noopener noreferrer">
                {{ $t('factorLibrary.sourceReference') }}
                <a-icon type="export" />
              </a>
              <span v-else-if="selectedFactor.is_custom" class="factor-detail__muted">{{ $t('factorLibrary.custom.version', { version: selectedFactor.version }) }}</span>
            </div>
            <code>{{ selectedFactor.expression }}</code>
          </section>

          <a-alert
            v-if="!supportsCurrent(selectedFactor)"
            class="factor-detail__unsupported"
            type="warning"
            show-icon
            :message="$t('factorLibrary.unsupportedCurrent')"
          />

          <section class="factor-detail__section">
            <h4>{{ $t('factorLibrary.requiredFields') }}</h4>
            <div class="factor-token-row">
              <a-tag v-for="field in selectedFactor.required_fields" :key="field">{{ field }}</a-tag>
            </div>
            <p v-if="extraDataFields.length" class="factor-detail__warning">
              {{ $t('factorLibrary.extraDataNotice', { fields: extraDataFields.join(', ') }) }}
            </p>
            <p v-if="['talib:ACOS', 'talib:ASIN'].includes(selectedFactor.factor_id)" class="factor-detail__warning">
              {{ $t('factorLibrary.unitDomainNotice') }}
            </p>
            <p v-if="selectedFactor.factor_type === 'fundamental'" class="factor-detail__warning">
              <a-icon type="warning" />
              {{ $t('factorLibrary.pointInTimeWarning') }}
            </p>
          </section>

          <section class="factor-detail__section">
            <div class="factor-detail__section-head">
              <h4>{{ $t('factorLibrary.parameters') }}</h4>
              <a-button v-if="parameterEntries(selectedFactor).length" size="small" icon="undo" @click="resetParameters(selectedFactor)">
                {{ $t('factorLibrary.resetParams') }}
              </a-button>
            </div>
            <div v-if="parameterEntries(selectedFactor).length" class="factor-param-grid">
              <div v-for="entry in parameterEntries(selectedFactor)" :key="entry[0]">
                <code>{{ entry[0] }}</code>
                <a-select
                  v-if="parameterSchema(selectedFactor, entry[0]).type === 'enum'"
                  :value="parameterValue(entry[0])"
                  size="small"
                  :dropdown-class-name="isDark ? 'factor-library-dropdown factor-library-dropdown--dark' : 'factor-library-dropdown'"
                  @change="setParameter(entry[0], $event)"
                >
                  <a-select-option
                    v-for="option in parameterSchema(selectedFactor, entry[0]).options"
                    :key="option"
                    :value="option"
                  >
                    {{ option }}
                  </a-select-option>
                </a-select>
                <a-switch
                  v-else-if="parameterSchema(selectedFactor, entry[0]).type === 'boolean'"
                  :checked="parameterValue(entry[0])"
                  size="small"
                  @change="setParameter(entry[0], $event)"
                />
                <a-input-number
                  v-else-if="['integer', 'number'].includes(parameterSchema(selectedFactor, entry[0]).type)"
                  :value="parameterValue(entry[0])"
                  :min="parameterSchema(selectedFactor, entry[0]).minimum"
                  :max="parameterSchema(selectedFactor, entry[0]).maximum"
                  :step="parameterSchema(selectedFactor, entry[0]).step"
                  :precision="parameterSchema(selectedFactor, entry[0]).type === 'integer' ? 0 : undefined"
                  size="small"
                  @change="setParameter(entry[0], $event)"
                />
                <a-input
                  v-else
                  :value="parameterValue(entry[0])"
                  size="small"
                  @change="setParameter(entry[0], $event.target.value)"
                />
              </div>
            </div>
            <span v-else class="factor-detail__muted">{{ $t('factorLibrary.noParams') }}</span>
          </section>

          <section class="factor-detail__section factor-detail__code-section">
            <div class="factor-detail__section-head">
              <h4>{{ $t('factorLibrary.strategyUsage') }}</h4>
              <a-button size="small" icon="copy" :disabled="!supportsCurrent(selectedFactor)" @click="copyText(strategySnippet(selectedFactor))">
                {{ $t('factorLibrary.copyExample') }}
              </a-button>
            </div>
            <div class="factor-detail__code-block">
              <span>{{ $t('factorLibrary.callExample') }}</span>
              <pre>{{ factorCall(selectedFactor) }}</pre>
            </div>
            <div class="factor-detail__code-block">
              <span>{{ $t('factorLibrary.fullExample') }}</span>
              <pre>{{ strategySnippet(selectedFactor) }}</pre>
            </div>
            <p v-if="selectedFactor.direction_hint === 'neutral'" class="factor-detail__muted">
              {{ $t('factorLibrary.neutralHint') }}
            </p>
          </section>
        </div>

        <div v-else class="factor-detail-empty">{{ $t('factorLibrary.selectHint') }}</div>
      </div>
    </a-spin>

    <a-modal
      :visible="customModalVisible"
      :title="$t('factorLibrary.custom.title')"
      :width="860"
      :centered="true"
      :confirm-loading="customSaving"
      :closable="!customAiGenerating"
      :mask-closable="!customAiGenerating"
      :keyboard="!customAiGenerating"
      :ok-text="$t('factorLibrary.custom.save')"
      :cancel-text="$t('factorLibrary.custom.cancel')"
      :wrap-class-name="isDark ? 'custom-factor-modal custom-factor-modal--dark' : 'custom-factor-modal'"
      @ok="saveCustomFactor"
      @cancel="customModalVisible = false"
    >
      <a-tabs v-model="customTab" class="custom-factor-tabs" :animated="false">
        <a-tab-pane key="editor" :tab="$t('factorLibrary.custom.tabEditor')">
          <div class="custom-factor-pane custom-factor-workspace">
            <a-form layout="vertical" class="custom-factor-form">
              <div class="custom-factor-form__grid custom-factor-form__identity">
                <a-form-item :label="$t('factorLibrary.custom.name')">
                  <a-input v-model="customForm.name" :max-length="120" :aria-label="$t('factorLibrary.custom.name')" :placeholder="$t('factorLibrary.custom.namePlaceholder')" />
                </a-form-item>
                <a-form-item :label="$t('factorLibrary.custom.category')">
                  <a-select v-model="customForm.category">
                    <a-select-option value="momentum">{{ $t('factorLibrary.category.momentum') }}</a-select-option>
                    <a-select-option value="trend">{{ $t('factorLibrary.category.trend') }}</a-select-option>
                    <a-select-option value="volatility">{{ $t('factorLibrary.category.volatility') }}</a-select-option>
                    <a-select-option value="risk">{{ $t('factorLibrary.category.risk') }}</a-select-option>
                    <a-select-option value="liquidity">{{ $t('factorLibrary.category.liquidity') }}</a-select-option>
                    <a-select-option value="custom">{{ $t('factorLibrary.custom.categoryOther') }}</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item class="custom-factor-form__direction" :label="$t('factorLibrary.custom.direction')">
                  <a-radio-group v-model="customForm.directionHint" button-style="solid">
                    <a-radio-button value="higher_is_bullish">{{ $t('factorLibrary.direction.higher_is_bullish') }}</a-radio-button>
                    <a-radio-button value="lower_is_bullish">{{ $t('factorLibrary.direction.lower_is_bullish') }}</a-radio-button>
                    <a-radio-button value="neutral">{{ $t('factorLibrary.direction.neutral') }}</a-radio-button>
                  </a-radio-group>
                </a-form-item>
              </div>
              <a-form-item class="custom-factor-editor" :label="$t('factorLibrary.custom.expression')">
                <a-textarea
                  v-model="customForm.expression"
                  :aria-label="$t('factorLibrary.custom.expression')"
                  :rows="3"
                  class="custom-factor-form__expression"
                  :placeholder="$t('factorLibrary.custom.expressionPlaceholder')"
                />
              </a-form-item>
              <div class="custom-factor-form__grid">
                <a-form-item :label="$t('factorLibrary.custom.parameters')">
                  <a-textarea v-model="customForm.paramsJson" :aria-label="$t('factorLibrary.custom.parameters')" :rows="5" class="custom-factor-form__expression" />
                </a-form-item>
                <a-form-item :label="$t('factorLibrary.custom.optionalDescription')">
                  <a-textarea v-model="customForm.description" :aria-label="$t('factorLibrary.custom.optionalDescription')" :rows="5" :placeholder="$t('factorLibrary.custom.descriptionPlaceholder')" />
                </a-form-item>
              </div>
              <div v-if="customValidation" class="custom-factor-form__validation">
                <div v-if="customValidation" class="custom-factor-form__validation-result">
                  <a-icon type="check-circle" />
                  <span>{{ $t('factorLibrary.custom.validationPassed', { warmup: customValidation.warmupBars }) }}</span>
                  <code v-for="field in customValidation.requiredFields || []" :key="field">{{ field }}</code>
                </div>
              </div>
            </a-form>
            <aside class="custom-factor-ai" :aria-label="$t('factorLibrary.custom.ai.tab')">
              <div class="custom-factor-ai__heading"><a-icon type="thunderbolt" /><strong>{{ $t('factorLibrary.custom.ai.tab') }}</strong></div>
              <a-textarea
                v-model="customAiPrompt"
                :rows="2"
                :max-length="4000"
                :disabled="customAiGenerating"
                :aria-label="$t('factorLibrary.custom.ai.heading')"
                :placeholder="$t('factorLibrary.custom.ai.placeholder')" />
              <div class="custom-factor-ai__actions">
                <a-tooltip :title="$t('factorLibrary.custom.ai.billingHint')">
                  <span v-if="customAiCost !== null" tabindex="0">{{ $t('factorLibrary.custom.ai.cost', { cost: customAiCost }) }}</span>
                </a-tooltip>
                <a-button v-if="customAiCost === null" type="link" size="small" :loading="customAiPricingLoading" @click="loadCustomAiPricing">{{ $t('factorLibrary.custom.ai.loadPrice') }}</a-button>
                <a-button type="primary" :loading="customAiGenerating" :disabled="!customAiPrompt.trim() || customAiCost === null || customSaving" @click="generateCustomAiFactor">{{ $t(customAiGenerating ? 'factorLibrary.custom.ai.generating' : 'factorLibrary.custom.ai.generate') }}</a-button>
              </div>
              <a-alert v-if="customAiError" type="error" show-icon :message="customAiError" />
              <article v-if="customAiCandidate" class="custom-factor-example custom-factor-ai__candidate">
                <div class="custom-factor-example__heading"><strong>{{ customAiCandidate.name }}</strong></div>
                <pre>{{ customAiCandidate.expression }}</pre>
                <div class="custom-factor-example__footer"><div><span>{{ $t('factorLibrary.custom.exampleParams') }}</span><code>{{ JSON.stringify(customAiCandidate.defaultParams) }}</code></div></div>
                <div class="custom-factor-example__footer">
                  <a-button :disabled="customAiGenerating || customSaving" @click="applyCustomAiCandidate">{{ $t('factorLibrary.custom.ai.apply') }}</a-button>
                </div>
              </article>
            </aside>
          </div>
        </a-tab-pane>
        <a-tab-pane key="examples" :tab="$t('factorLibrary.custom.tabExamples')">
          <div class="custom-factor-pane custom-factor-examples">
            <article v-for="example in customExamples" :key="example.id" class="custom-factor-example">
              <div class="custom-factor-example__heading">
                <strong>{{ $t(`factorLibrary.custom.example.${example.id}`) }}</strong>
                <a-button type="link" size="small" icon="copy" @click="copyText(example.expression)">{{ $t('factorLibrary.copyCall') }}</a-button>
              </div>
              <pre>{{ example.expression }}</pre>
              <div class="custom-factor-example__footer">
                <div><span>{{ $t('factorLibrary.custom.exampleParams') }}</span><code>{{ example.paramsJson }}</code></div>
                <a-button size="small" type="primary" @click="useCustomExample(example)">{{ $t('factorLibrary.custom.useExampleShort') }} <a-icon type="arrow-right" /></a-button>
              </div>
            </article>
          </div>
        </a-tab-pane>
        <a-tab-pane key="rules" :tab="$t('factorLibrary.custom.tabRules')">
          <div class="custom-factor-pane custom-factor-rules">
            <p class="custom-factor-pane__lead">{{ $t('factorLibrary.custom.rulesHint') }}</p>
            <details v-for="rule in customRules" :key="rule.id" class="custom-factor-rule">
              <summary><a-icon :type="rule.icon" /><span>{{ $t(`factorLibrary.custom.rule.${rule.id}`) }}</span><a-icon type="down" /></summary>
              <p>{{ $t(rule.description) }}</p>
            </details>
          </div>
        </a-tab-pane>
      </a-tabs>
      <div slot="footer" class="custom-factor-footer">
        <a-button icon="safety" :loading="customValidating" :disabled="customSaving || customAiGenerating" @click="validateCustomFactorForm">{{ $t('factorLibrary.custom.validate') }}</a-button>
        <div>
          <a-button :disabled="customAiGenerating" @click="customModalVisible = false">{{ $t('factorLibrary.custom.cancel') }}</a-button>
          <a-button type="primary" :loading="customSaving" :disabled="customAiGenerating" @click="saveCustomFactor">{{ $t('factorLibrary.custom.save') }}</a-button>
        </div>
      </div>
    </a-modal>
  </a-modal>
</template>

<script>
import { createCustomFactor, generateCustomFactor, getFactorCatalog, validateCustomFactor } from '@/api/factor'
import { getMembershipPlans } from '@/api/billing'

export default {
  name: 'FactorLibraryModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    isDark: {
      type: Boolean,
      default: false
    },
    assetType: {
      type: String,
      default: 'script'
    }
  },
  data () {
    return {
      loading: false,
      loaded: false,
      rawFactors: [],
      factors: [],
      selectedId: '',
      selectedFactor: null,
      search: '',
      typeFilter: 'all',
      familyFilter: 'all',
      scopeFilter: 'current',
      parameterValues: {},
      listScrollTop: 0,
      factorRowHeight: 84,
      factorWindowSize: 14,
      scrollFrameHandle: null,
      pendingScrollTop: 0,
      preloadHandle: null,
      preloadHandleType: '',
      customModalVisible: false,
      customTab: 'editor',
      customSaving: false,
      customValidating: false,
      customValidation: null,
      customAiPrompt: '',
      customAiGenerating: false,
      customAiCandidate: null,
      customAiError: '',
      customAiCost: null,
      customAiPricingLoading: false,
      customForm: {
        name: '',
        description: '',
        category: 'momentum',
        directionHint: 'higher_is_bullish',
        expression: 'momentum(period=lookback) / max(realized_volatility(period=vol_window), floor)',
        paramsJson: '{\n  "lookback": 20,\n  "vol_window": 20,\n  "floor": 0.0001\n}'
      }
    }
  },
  computed: {
    customRules () {
      return [
        { id: 'metadata', icon: 'profile', description: 'factorLibrary.custom.contractMetadata' },
        { id: 'input', icon: 'database', description: 'factorLibrary.custom.contractInput' },
        { id: 'syntax', icon: 'code', description: 'factorLibrary.custom.contractSyntax' },
        { id: 'params', icon: 'sliders', description: 'factorLibrary.custom.contractParams' },
        { id: 'output', icon: 'export', description: 'factorLibrary.custom.contractOutput' },
        { id: 'limits', icon: 'safety', description: 'factorLibrary.custom.contractLimits' },
        { id: 'validation', icon: 'check-circle', description: 'factorLibrary.custom.contractValidation' },
        { id: 'usage', icon: 'link', description: 'factorLibrary.custom.contractUsage' }
      ]
    },
    extraDataFields () {
      return ((this.selectedFactor && this.selectedFactor.required_fields) || []).filter(field => !['open', 'high', 'low', 'close', 'volume'].includes(field))
    },
    customExamples () {
      return [
        { id: 'native', expression: 'momentum(period=lookback) / max(realized_volatility(period=vol_window), floor)', paramsJson: '{"lookback":20,"vol_window":20,"floor":0.0001}' },
        { id: 'talib', expression: 'factor("talib:RSI", timeperiod=period)', paramsJson: '{"period":14}' },
        { id: 'qlib', expression: 'factor("qlib:alpha158:IMAX20")', paramsJson: '{}' }
      ]
    },
    familyOptions () {
      return [
        { value: 'all', label: this.$t('factorLibrary.family.allShort') },
        { value: 'native', label: this.$t('factorLibrary.family.native') },
        { value: 'custom', label: this.$t('factorLibrary.family.custom') },
        { value: 'talib', label: this.$t('factorLibrary.family.talib') },
        { value: 'alpha158', label: this.$t('factorLibrary.family.alpha158') },
        { value: 'alpha360', label: this.$t('factorLibrary.family.alpha360') }
      ]
    },
    scopeOptions () {
      return [
        { value: 'current', label: this.$t('factorLibrary.scope.compatible') },
        { value: 'all', label: this.$t('factorLibrary.scope.all') },
        { value: 'cta', label: this.$t('factorLibrary.scope.cta') },
        { value: 'portfolio', label: this.$t('factorLibrary.scope.portfolio') }
      ]
    },
    familyCounts () {
      return this.factors.reduce((counts, factor) => {
        counts.all += 1
        counts[factor._family] = (counts[factor._family] || 0) + 1
        return counts
      }, { all: 0, native: 0, custom: 0, talib: 0, alpha158: 0, alpha360: 0 })
    },
    emptyDescription () {
      if (['alpha158', 'alpha360'].includes(this.familyFilter) && !this.familyCounts[this.familyFilter]) {
        return this.$t('factorLibrary.qlibUnavailable')
      }
      return this.$t('factorLibrary.empty')
    },
    filteredFactors () {
      const query = String(this.search || '').trim().toLowerCase()
      return this.factors.filter(factor => {
        if (this.typeFilter !== 'all' && factor.factor_type !== this.typeFilter) return false
        if (this.familyFilter !== 'all' && factor._family !== this.familyFilter) return false
        const contexts = factor.supported_contexts || []
        const requestedScope = this.scopeFilter === 'current' ? this.currentContext : this.scopeFilter
        if (requestedScope !== 'all' && !contexts.includes(requestedScope)) return false
        if (!query) return true
        return factor._searchText.includes(query)
      })
    },
    virtualStartIndex () {
      const rawStart = Math.floor(this.listScrollTop / this.factorRowHeight) - 4
      return Math.max(0, Math.min(this.filteredFactors.length, rawStart))
    },
    virtualEndIndex () {
      return Math.min(this.filteredFactors.length, this.virtualStartIndex + this.factorWindowSize)
    },
    virtualFactors () {
      return this.filteredFactors.slice(this.virtualStartIndex, this.virtualEndIndex)
    },
    virtualTopSpacer () {
      return this.virtualStartIndex * this.factorRowHeight
    },
    virtualBottomSpacer () {
      return Math.max(0, (this.filteredFactors.length - this.virtualEndIndex) * this.factorRowHeight)
    },
    currentContext () {
      return this.assetType === 'portfolio_strategy' ? 'portfolio' : 'cta'
    }
  },
  watch: {
    customForm: {
      deep: true,
      handler () { this.customValidation = null }
    },
    visible (value) {
      if (value && !this.loaded && !this.loading) this.loadFactors()
    },
    assetType () {
      this.scopeFilter = 'current'
      this.handleFactorFilterChange()
    },
    scopeFilter () {
      this.handleFactorFilterChange()
    },
    typeFilter () {
      this.handleFactorFilterChange()
    },
    familyFilter () {
      this.handleFactorFilterChange()
    },
    search () {
      this.handleFactorFilterChange()
    },
    '$i18n.locale' () {
      this.relocalizeFactors()
    }
  },
  mounted () {
    this.schedulePreload()
  },
  beforeDestroy () {
    this.cancelPreload()
    if (this.scrollFrameHandle !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.scrollFrameHandle)
      this.scrollFrameHandle = null
    }
  },
  methods: {
    async loadCustomAiPricing () {
      if (this.customAiPricingLoading) return
      this.customAiPricingLoading = true
      try {
        const response = await getMembershipPlans()
        const data = (response && response.data) || {}
        const billing = data.billing || data.billing_config || {}
        const price = billing.feature_costs && billing.feature_costs.ai_code_gen
        this.customAiCost = billing.billing_enabled === false ? 0 : (price != null && Number.isFinite(Number(price)) ? Number(price) : null)
      } catch (_) {
        this.customAiCost = null
      } finally {
        this.customAiPricingLoading = false
      }
    },
    updateCustomAiCredits (data) {
      const value = data && data.billing && data.billing.remaining_credits
      if (value != null && Number.isFinite(Number(value))) this.$root.$emit('credits-updated', Number(value))
    },
    async generateCustomAiFactor () {
      const prompt = this.customAiPrompt.trim()
      if (!prompt || this.customAiGenerating || this.customSaving || this.customAiCost === null) return
      this.customAiGenerating = true
      this.customAiError = ''
      this.customAiCandidate = null
      try {
        const response = await generateCustomFactor({ prompt, locale: this.$i18n.locale })
        this.updateCustomAiCredits(response && response.data)
        if (!response || response.code !== 1 || !response.data || !response.data.candidate) throw new Error((response && response.msg) || 'factor.aiInvalid')
        this.customAiCandidate = response.data.candidate
      } catch (error) {
        this.updateCustomAiCredits(error.response && error.response.data && error.response.data.data)
        this.customAiError = this.customFactorErrorMessage(error, 'factor.aiFailed')
      } finally {
        this.customAiGenerating = false
      }
    },
    applyCustomAiCandidate () {
      const candidate = this.customAiCandidate
      if (!candidate || this.customAiGenerating || this.customSaving) return
      this.customForm = {
        name: candidate.name,
        description: candidate.description,
        category: candidate.category,
        directionHint: candidate.directionHint,
        expression: candidate.expression,
        paramsJson: JSON.stringify(candidate.defaultParams, null, 2)
      }
      this.customValidation = null
      this.customTab = 'editor'
      this.$message.success(this.$t('factorLibrary.custom.ai.applied'))
    },
    customFactorErrorMessage (error, fallback) {
      const message = String(error.backendMessage || error.message || '')
      if (this.$te(message)) return this.$t(message)
      return !message || message.startsWith('factor.') ? this.$t(fallback) : message
    },
    useCustomExample (example) {
      this.customForm.expression = example.expression
      this.customForm.paramsJson = example.paramsJson
      this.customValidation = null
      this.customTab = 'editor'
    },
    schedulePreload () {
      if (this.loaded || this.loading || this.preloadHandle !== null) return
      const preload = () => {
        this.preloadHandle = null
        this.preloadHandleType = ''
        if (!this.loaded && !this.loading) this.loadFactors({ silent: true })
      }
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        this.preloadHandleType = 'idle'
        this.preloadHandle = window.requestIdleCallback(preload, { timeout: 1200 })
      } else {
        this.preloadHandleType = 'timeout'
        this.preloadHandle = setTimeout(preload, 400)
      }
    },
    cancelPreload () {
      if (this.preloadHandle === null) return
      if (this.preloadHandleType === 'idle' && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(this.preloadHandle)
      } else {
        clearTimeout(this.preloadHandle)
      }
      this.preloadHandle = null
      this.preloadHandleType = ''
    },
    async loadFactors (options = {}) {
      if (this.loading) return
      this.cancelPreload()
      this.loading = true
      try {
        const res = await getFactorCatalog()
        if (!(res && res.code === 1)) throw new Error((res && res.msg) || this.$t('factorLibrary.loadFailed'))
        this.rawFactors = Array.isArray(res.data) ? res.data : []
        this.factors = this.rawFactors.map(this.prepareFactor)
        this.loaded = true
        this.resetVirtualList()
        const preferred = this.filteredFactors.find(item => item.factor_id === this.selectedId) || this.filteredFactors[0]
        if (preferred) this.selectFactor(preferred)
      } catch (error) {
        this.rawFactors = []
        this.factors = []
        if (!options.silent || this.visible) {
          this.$message.error(error.backendMessage || error.message || this.$t('factorLibrary.loadFailed'))
        }
      } finally {
        this.loading = false
      }
    },
    selectFactor (factor) {
      if (!factor) return
      this.selectedId = factor.factor_id
      this.selectedFactor = factor
      this.resetParameters(factor)
    },
    relocalizeFactors () {
      if (!this.rawFactors.length) return
      const selectedId = this.selectedId
      this.factors = this.rawFactors.map(this.prepareFactor)
      this.selectedFactor = this.factors.find(item => item.factor_id === selectedId) || null
      this.ensureVisibleSelection()
    },
    handleListScroll (event) {
      this.pendingScrollTop = Math.max(0, Number(event && event.target && event.target.scrollTop) || 0)
      if (this.scrollFrameHandle !== null || typeof window === 'undefined') return
      this.scrollFrameHandle = window.requestAnimationFrame(() => {
        this.listScrollTop = this.pendingScrollTop
        this.scrollFrameHandle = null
      })
    },
    resetVirtualList () {
      this.listScrollTop = 0
      this.$nextTick(() => {
        if (this.$refs.factorList) this.$refs.factorList.scrollTop = 0
      })
    },
    handleFactorFilterChange () {
      this.resetVirtualList()
      this.ensureVisibleSelection()
    },
    ensureVisibleSelection () {
      this.$nextTick(() => {
        if (!this.filteredFactors.length) {
          this.selectedId = ''
          this.selectedFactor = null
          return
        }
        if (!this.filteredFactors.some(item => item.factor_id === this.selectedId)) {
          this.selectFactor(this.filteredFactors[0])
        }
      })
    },
    translation (key, fallback) {
      if (!key) return fallback
      const value = this.$t(key)
      if (value && value !== key) return value
      const english = this.$i18n && this.$i18n.getLocaleMessage
        ? this.$i18n.getLocaleMessage('en-US')[key]
        : ''
      return english || fallback
    },
    factorFamily (factor) {
      if (factor && factor.provider === 'user') return 'custom'
      if (factor && factor.provider === 'microsoft-qlib') return String(factor.family || '').toLowerCase()
      if (factor && factor.provider === 'ta-lib') return 'talib'
      return 'native'
    },
    prepareFactor (factor) {
      const prepared = { ...factor }
      prepared._family = this.factorFamily(prepared)
      if (prepared.provider === 'microsoft-qlib') {
        const spec = prepared.feature_spec || {}
        const operation = this.translation(
          `factorLibrary.operation.${spec.operation}`,
          this.$t('factorLibrary.operation.default')
        )
        prepared._displayName = this.$t('factorLibrary.qlibFeatureName', {
          family: this.$t(`factorLibrary.family.${prepared._family}`),
          feature: prepared.library_id
        })
        prepared._displayDescription = this.$t('factorLibrary.qlibFeatureDescription', {
          family: this.$t(`factorLibrary.family.${prepared._family}`),
          feature: prepared.library_id,
          field: this.factorFieldLabel(spec.field || (prepared.required_fields || []).join(', ')),
          window: spec.window || prepared.default_warmup_bars || 1,
          operation
        })
      } else {
        prepared._displayName = this.translation(prepared.name_i18n_key, prepared.display_name || prepared.factor_id)
        prepared._displayDescription = this.translation(prepared.description_i18n_key, prepared.description || '')
        if (!prepared._displayDescription && prepared.provider === 'ta-lib') {
          prepared._displayDescription = this.$t('factorLibrary.talibFeatureDescription', {
            name: prepared._displayName,
            category: this.categoryLabel(prepared.category)
          })
        }
        if (!prepared._displayDescription) {
          prepared._displayDescription = this.factorCategoryExplanation(prepared)
        }
      }
      prepared._searchText = [
        prepared.factor_id,
        prepared.library_id,
        prepared.category,
        prepared._displayName,
        prepared._displayDescription,
        prepared.provider,
        prepared.family,
        ...(prepared.required_fields || [])
      ].map(value => String(value || '').toLowerCase()).join(' ')
      return prepared
    },
    openCustomFactorModal () {
      this.customValidation = null
      this.customTab = 'editor'
      this.customModalVisible = true
      this.loadCustomAiPricing()
    },
    customFactorPayload () {
      let defaultParams = {}
      try {
        defaultParams = JSON.parse(String(this.customForm.paramsJson || '{}'))
      } catch (_) {
        throw new Error(this.$t('factorLibrary.custom.parametersInvalid'))
      }
      if (!defaultParams || Array.isArray(defaultParams) || typeof defaultParams !== 'object') {
        throw new Error(this.$t('factorLibrary.custom.parametersInvalid'))
      }
      return {
        name: String(this.customForm.name || '').trim(),
        description: String(this.customForm.description || '').trim(),
        category: this.customForm.category,
        directionHint: this.customForm.directionHint,
        expression: String(this.customForm.expression || '').trim(),
        defaultParams
      }
    },
    async validateCustomFactorForm () {
      this.customValidating = true
      try {
        const payload = this.customFactorPayload()
        const response = await validateCustomFactor(payload)
        if (!(response && response.code === 1)) throw new Error((response && response.msg) || this.$t('factorLibrary.custom.validationFailed'))
        if (JSON.stringify(payload) !== JSON.stringify(this.customFactorPayload())) return false
        this.customValidation = response.data
        this.$message.success(this.$t('factorLibrary.custom.validationSuccess'))
        return true
      } catch (error) {
        this.customValidation = null
        this.$message.error(this.customFactorErrorMessage(error, 'factorLibrary.custom.validationFailed'))
        return false
      } finally {
        this.customValidating = false
      }
    },
    async saveCustomFactor () {
      if (!String(this.customForm.name || '').trim()) {
        this.$message.warning(this.$t('factorLibrary.custom.nameRequired'))
        return
      }
      this.customSaving = true
      try {
        const payload = this.customFactorPayload()
        const response = await createCustomFactor(payload)
        if (!(response && response.code === 1)) throw new Error((response && response.msg) || this.$t('factorLibrary.custom.saveFailed'))
        const createdId = response.data && response.data.factor_id
        this.customModalVisible = false
        this.familyFilter = 'custom'
        this.scopeFilter = 'all'
        this.selectedId = createdId || ''
        await this.loadFactors()
        const created = this.factors.find(item => item.factor_id === createdId)
        if (created) this.selectFactor(created)
        this.$message.success(this.$t('factorLibrary.custom.saveSuccess'))
      } catch (error) {
        this.$message.error(this.customFactorErrorMessage(error, 'factorLibrary.custom.saveFailed'))
      } finally {
        this.customSaving = false
      }
    },
    factorName (factor) {
      return factor && (factor._displayName || factor.display_name || factor.factor_id)
    },
    factorDescription (factor) {
      return factor && factor._displayDescription
    },
    factorFieldLabel (value) {
      return String(value || '').replace(/\bohlcv\b/gi, 'OHLCV')
    },
    sentenceStart (value) {
      const text = String(value || '')
      return text ? text.charAt(0).toLocaleUpperCase(this.$i18n.locale) + text.slice(1) : text
    },
    factorCategoryExplanation (factor) {
      const categoryKey = `factorLibrary.explain.category.${factor && factor.category}`
      const categoryExplanation = this.translation(categoryKey, '')
      if (categoryExplanation) return categoryExplanation
      return factor && factor.factor_type === 'fundamental'
        ? this.$t('factorLibrary.explain.fundamental')
        : this.$t('factorLibrary.explain.technical')
    },
    familyLabel (factor) {
      return this.$t(`factorLibrary.family.${this.factorFamily(factor)}`)
    },
    usageModeLabel (factor) {
      return factor && factor.usage_mode === 'model_feature'
        ? this.$t('factorLibrary.usageMode.feature')
        : this.$t('factorLibrary.usageMode.signal')
    },
    factorMeaning (factor) {
      if (this.factorDescription(factor)) return this.factorDescription(factor)
      if (factor && factor.usage_mode === 'model_feature') return this.$t('factorLibrary.explain.modelFeature')
      return this.factorCategoryExplanation(factor)
    },
    factorInterpretation (factor) {
      const direction = factor && factor.direction_hint
      const directionText = direction === 'higher_is_bullish'
        ? this.$t('factorLibrary.interpret.higher')
        : direction === 'lower_is_bullish'
          ? this.$t('factorLibrary.interpret.lower')
          : this.$t('factorLibrary.interpret.neutral')
      const operation = factor && factor.feature_spec && factor.feature_spec.operation
      if (!operation) return directionText
      const key = `factorLibrary.operation.${operation}`
      const label = this.translation(key, this.$t('factorLibrary.operation.default'))
      return `${this.sentenceStart(label)}. ${directionText}`
    },
    factorCaution (factor) {
      if (factor && factor.usage_mode === 'model_feature') return this.$t('factorLibrary.caution.modelFeature')
      return factor && factor.factor_type === 'fundamental'
        ? this.$t('factorLibrary.caution.fundamental')
        : this.$t('factorLibrary.caution.technical')
    },
    typeLabel (value) {
      return this.$t(`factorLibrary.type.${value}`)
    },
    categoryLabel (value) {
      const key = `factorLibrary.category.${value}`
      return this.translation(key, value)
    },
    directionLabel (value) {
      return this.$t(`factorLibrary.direction.${value}`)
    },
    supportsCurrent (factor) {
      return !!(factor && (factor.supported_contexts || []).includes(this.currentContext))
    },
    runtimeLabel (factor) {
      const contexts = (factor && factor.supported_contexts) || []
      if (contexts.includes('cta') && contexts.includes('portfolio')) return this.$t('factorLibrary.runtimeBoth')
      if (contexts.includes('cta')) return this.$t('factorLibrary.runtimeCta')
      return this.$t('factorLibrary.runtimePortfolio')
    },
    parameterEntries (factor) {
      return Object.entries((factor && factor.default_params) || {})
    },
    parameterSchema (factor, key) {
      const schema = (factor && factor.parameter_schema && factor.parameter_schema[key]) || {}
      if (schema.type) return schema
      const value = factor && factor.default_params && factor.default_params[key]
      if (typeof value === 'boolean') return { type: 'boolean' }
      if (Number.isInteger(value)) return { type: 'integer', minimum: 1, maximum: 5000, step: 1 }
      if (typeof value === 'number') return { type: 'number', step: 0.1 }
      return { type: 'string' }
    },
    parameterValue (key) {
      return this.parameterValues[key]
    },
    setParameter (key, value) {
      if (value === null || value === undefined) return
      this.$set(this.parameterValues, key, value)
    },
    resetParameters (factor) {
      this.parameterValues = { ...((factor && factor.default_params) || {}) }
    },
    pythonValue (value) {
      if (value === true) return 'True'
      if (value === false) return 'False'
      if (value === null) return 'None'
      return typeof value === 'string' ? JSON.stringify(value) : String(value)
    },
    factorCall (factor) {
      const params = this.parameterEntries(factor)
        .map(([key]) => `${key}=${this.pythonValue(this.parameterValue(key))}`)
        .join(', ')
      if (this.currentContext === 'cta') {
        return `factor("${factor.factor_id}", "USStock:SPY"${params ? `, ${params}` : ''})`
      }
      return `get_factors(g.symbols, ["${factor.factor_id}"]${params ? `, ${params}` : ''})`
    },
    estimatedWarmup (factor) {
      const value = (key, fallback = 1) => Math.max(1, Number(this.parameterValues[key] || fallback))
      const period = value('period', factor.default_warmup_bars || 1)
      const factorId = factor.factor_id
      if (['momentum', 'roc', 'rsi', 'downside_volatility'].includes(factorId)) return period + 1
      if (factorId === 'ema_slope') return period + value('slope_period')
      if (factorId === 'macd') return value('slow_period', 26) + value('signal_period', 9)
      if (factorId === 'stochastic') return period + value('smooth_k') + value('smooth_d') - 2
      if (factorId === 'trix') return period * 3 + 1
      if (factorId === 'dema') return period * 2
      if (factorId === 'tema') return period * 3
      if (factorId === 'hma') return period + Math.floor(Math.sqrt(period))
      if (['cmo', 'efficiency_ratio', 'kama', 'ulcer_index', 'choppiness', 'vortex'].includes(factorId)) return period + 1
      if (['ppo', 'awesome_oscillator'].includes(factorId)) return value('slow_period', period)
      if (factorId === 'ultimate_oscillator') return value('slow_period', 28) + 1
      if (factorId === 'tsi') return value('slow_period', 25) + value('fast_period', 13) + 1
      if (factorId === 'adx') return period * 2
      if (factorId === 'chaikin_oscillator') return value('slow_period', 10)
      if (['obv', 'ad_line'].includes(factorId)) return period + 1
      return period
    },
    strategySnippet (factor) {
      const call = this.factorCall(factor)
      if (this.currentContext === 'cta') {
        const warmup = this.estimatedWarmup(factor)
        const commentKey = factor.usage_mode === 'model_feature'
          ? 'factorLibrary.snippet.modelFeatureComment'
          : 'factorLibrary.snippet.ruleComment'
        return [
          'def initialize(context):',
          '    context.set_universe(["USStock:SPY"])',
          '    context.subscribe(frequency="1d")',
          `    context.set_warmup(${warmup})`,
          '',
          'def handle_data(context, data):',
          `    value = ${call}`,
          '    if value != value:',
          '        return',
          `    # ${this.$t(commentKey)}`
        ].join('\n')
      }
      const lines = [
        'def rebalance(context, data):',
        `    values = ${call}["${factor.factor_id}"].dropna()`
      ]
      if (factor.direction_hint === 'lower_is_bullish') {
        lines.push('    selected = list(values.sort_values().head(10).index)')
      } else if (factor.direction_hint === 'higher_is_bullish') {
        lines.push('    selected = list(values.sort_values(ascending=False).head(10).index)')
      } else {
        lines.push(`    # ${this.$t('factorLibrary.snippet.rankingComment')}`)
        lines.push('    selected = []')
      }
      lines.push('    weight = 1.0 / len(selected) if selected else 0.0')
      lines.push('    for symbol in selected:')
      lines.push('        order_target_percent(symbol, weight, reason="factor_top_n")')
      return lines.join('\n')
    },
    async copyText (value) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = value
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          const copied = document.execCommand('copy')
          document.body.removeChild(textarea)
          if (!copied) throw new Error('copy_failed')
        }
        this.$message.success(this.$t('factorLibrary.copySuccess'))
      } catch (_) {
        this.$message.error(this.$t('factorLibrary.copyFailed'))
      }
    }
  }
}
</script>

<style lang="less">
.factor-library-modal,
.custom-factor-modal {
  --factor-ui-font: "Segoe UI Variable Text", Inter, "HarmonyOS Sans SC", MiSans, "Microsoft YaHei UI", "PingFang SC", "Noto Sans SC", sans-serif;
  font-family: var(--factor-ui-font);
  font-size: 12px;
  line-height: 1.6;

  .ant-modal { max-width: calc(100vw - 32px); }
  .ant-modal-content { border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 14px; overflow: hidden; font-family: var(--factor-ui-font); box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22); }
  .ant-modal-header { padding: 15px 20px; border-bottom: 1px solid #e8ebef; }
  .ant-modal-title { font-family: inherit; font-size: 16px; font-weight: 650; line-height: 24px; letter-spacing: -0.2px; }
  .ant-modal-close-x { width: 54px; height: 54px; line-height: 54px; }
  .ant-btn, .ant-input, .ant-select, .ant-radio-wrapper, .ant-radio-button-wrapper, .ant-input-number { font-family: inherit; font-size: 12px; }
  .ant-btn, .ant-input, .ant-select-selection { border-radius: 7px; }
  .ant-btn { box-shadow: none; }
  .ant-btn:focus-visible, summary:focus-visible, .factor-card:focus-visible { outline: 2px solid var(--primary-color, #1890ff); outline-offset: 2px; }
}

.factor-library-modal {
  --factor-library-accent: var(--primary-color, #1890ff);

  font-family: var(--factor-ui-font);

  .ant-modal {
    top: 24px;
    padding-bottom: 24px;
  }

  .ant-modal-body {
    padding: 0 18px 18px;
    overflow: hidden;
    background: #f5f7f9;
  }

  button,
  input,
  .ant-select,
  .ant-input-number {
    font-family: inherit;
  }
}

.factor-detail__heading,
.factor-detail__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.factor-library-tools {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin: 0 -18px 14px;
  padding: 14px 18px 12px;
  border-bottom: 1px solid #e7eaee;
  background: #fff;
}

.factor-library-tools__main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
  > .ant-btn:last-child { margin-left: auto; }
}

.factor-library-type-filter {
  display: inline-flex;
  flex: 0 0 auto;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.factor-library-type-filter .ant-radio-button-wrapper {
  height: 32px;
  padding: 0 14px;
  border-color: #e0e4e9;
  color: #5d6776;
  line-height: 30px;
  background: #fff;
}

.factor-library-type-filter .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
  z-index: 1;
  border-color: #9edfdc;
  color: #078f8a;
  background: #eaf8f7;
  box-shadow: none;
}

.factor-library-type-filter ::v-deep .ant-radio-button-wrapper {
  float: none;
  flex: 0 0 auto;
}

.factor-library-search {
  width: 280px;
  flex: 0 0 280px;
  .ant-input { height: 32px; border-color: #e0e4e9; background: #f8f9fb; }
}

.factor-library-refresh {
  flex: 0 0 auto;
}

.factor-library-filterbar {
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 6px 18px;
  flex-wrap: wrap;
  padding: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.factor-library-filterbar::-webkit-scrollbar {
  display: none;
}

.factor-library-filterbar__label {
  flex: 0 0 auto;
  color: #7b8494;
  font-size: 10px;
  font-weight: 600;
}

.factor-library-filterbar__group {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.factor-library-filterbar__options {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}

.factor-library-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 7px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #596274;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  line-height: 24px;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.factor-library-filter-chip > span {
  color: #98a1b2;
  font-size: 10px;
}

.factor-library-filter-chip:hover {
  color: var(--factor-library-accent);
  background: color-mix(in srgb, var(--factor-library-accent) 4%, transparent);
}

.factor-library-filter-chip--active {
  border-color: color-mix(in srgb, var(--factor-library-accent) 25%, transparent);
  color: var(--factor-library-accent);
  background: color-mix(in srgb, var(--factor-library-accent) 7%, #fff);
  box-shadow: none;
}

.factor-library-tools > .factor-detail__muted {
  margin: 0;
  font-size: 10px;
  line-height: 16px;
}

.factor-library-filter-chip--active > span {
  color: inherit;
}

.factor-library-notice {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  min-height: 38px;
  padding: 8px 12px 8px 9px;
  align-items: flex-start;
  gap: 9px;
  border: 1px solid color-mix(in srgb, var(--factor-library-accent) 18%, #e6e9ef);
  border-radius: 8px;
  color: #596274;
  background: color-mix(in srgb, var(--factor-library-accent) 4%, #f8fafc);
  font-size: 12px;
  line-height: 20px;
}

.factor-library-notice__icon {
  display: inline-flex;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--factor-library-accent);
  background: color-mix(in srgb, var(--factor-library-accent) 10%, transparent);
}

.factor-library-workspace {
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  height: min(660px, calc(100vh - 242px));
  min-height: 180px;
  overflow: hidden;
  border: 1px solid #e1e5ea;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.factor-library-list {
  min-height: 0;
  padding: 8px 7px;
  overflow-y: auto;
  overscroll-behavior: contain;
  contain: strict;
  border-right: 1px solid #e6e9ef;
  background: #f3f5f7;
  scrollbar-color: #c8ced8 transparent;
  scrollbar-width: thin;
}

.factor-library-list::-webkit-scrollbar,
.factor-detail::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.factor-library-list::-webkit-scrollbar-track,
.factor-detail::-webkit-scrollbar-track {
  background: transparent;
}

.factor-library-list::-webkit-scrollbar-thumb,
.factor-detail::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #c8ced8;
}

.factor-library-list__spacer {
  width: 1px;
  pointer-events: none;
}

.factor-library-empty,
.factor-detail-empty {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #8a94a6;
  font-size: 13px;
  text-align: center;
}

.factor-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 80px;
  margin: 0 0 4px;
  padding: 9px 11px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 8px;
  color: inherit;
  text-align: left;
  background: transparent;
  cursor: pointer;
  contain: layout paint style;
  transform: translateZ(0);
  transition: border-color 0.15s;
}

.factor-card:hover,
.factor-card--active {
  border-color: #dce3e8;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.factor-card--active {
  border-color: #99dbd8;
  box-shadow: inset 3px 0 0 #16b8b2, 0 2px 8px rgba(15, 23, 42, 0.06);
}

.factor-card__top,
.factor-card__meta {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.factor-card__family {
  flex: 0 0 auto;
  color: var(--primary-color, #fa541c);
  font-size: 9px;
  font-weight: 600;
}

.factor-card__unsupported {
  color: #d46b08;
}

.factor-card__name {
  min-width: 0;
  overflow: hidden;
  color: #172033;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.factor-card__id,
.factor-detail__eyebrow {
  color: #8a94a6;
  font-family: Consolas, Monaco, monospace;
  font-size: 10px;
}

.factor-card__id {
  line-height: 17px;
}

.factor-card__desc {
  display: none;
  flex: 0 0 auto;
  margin: 4px 0;
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.factor-card__meta {
  margin-top: auto;
  color: #7b8494;
  font-size: 10px;
  line-height: 16px;
}

.factor-detail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 12px;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #f7f8fa;
  scrollbar-color: #c8ced8 transparent;
  scrollbar-width: thin;
}

.factor-detail__heading {
  grid-column: ~"1 / -1";
  align-items: flex-start;
  padding: 18px 20px;
  border: 1px solid #e5e8ec;
  border-radius: 10px;
  background: #fff;
}

.factor-detail__heading h3 {
  margin: 4px 0 6px;
  color: #172033;
  font-size: 18px;
  line-height: 1.5;
  font-weight: 600;
}

.factor-detail__heading p {
  max-width: 560px;
  margin: 0;
  color: #667085;
  line-height: 1.6;
  font-size: 12px;
}

.factor-detail__facts {
  grid-column: ~"1 / -1";
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 12px 16px;
  border: 1px solid #e5e8ec;
  border-radius: 10px;
  background: #fff;
}

.factor-detail__insights {
  grid-column: ~"1 / -1";
  margin: 0;
  padding: 12px 15px;
  border: 1px solid #e5e8ec;
  border-radius: 10px;
  background: #fff;
  summary { display: flex; align-items: center; gap: 8px; cursor: pointer; list-style: none; font-weight: 600; font-size: 12px; }
  summary::-webkit-details-marker { display: none; }
  &[open] summary .anticon { transform: rotate(180deg); }
}

.factor-detail__insights article {
  padding: 12px 0 0;
}

.factor-detail__insights .anticon {
  color: #8a94a6;
  font-size: 10px;
}

.factor-detail__insights strong {
  color: #273044;
  font-size: 12px;
}

.factor-detail__insights p {
  margin: 4px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.6;
}

.factor-detail__formula code {
  display: block;
  padding: 11px 12px;
  overflow-x: auto;
  border: 1px solid #e7eaf0;
  border-radius: 7px;
  color: #344054;
  background: #f5f7f9;
  font-family: Consolas, Monaco, monospace;
  white-space: nowrap;
}

.factor-detail__facts > div {
  padding: 0 8px 0 0;
}

.factor-detail__facts span,
.factor-detail__facts strong {
  display: block;
}

.factor-detail__facts span {
  margin-bottom: 4px;
  color: #8a94a6;
  font-size: 11px;
}

.factor-detail__facts strong {
  color: #273044;
  font-size: 12px;
}

.factor-detail__section {
  min-width: 0;
  margin: 0;
  padding: 14px 15px;
  border: 1px solid #e5e8ec;
  border-radius: 10px;
  background: #fff;
}

.factor-detail__formula,
.factor-detail__unsupported,
.factor-detail__code-section {
  grid-column: ~"1 / -1";
}

.factor-detail__unsupported {
  margin-top: 16px;
}

.factor-detail__section h4 {
  margin: 0 0 9px;
  color: #273044;
  font-size: 12px;
}

.factor-token-row .ant-tag {
  margin-bottom: 6px;
  font-family: Consolas, Monaco, monospace;
}

.factor-param-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.factor-param-grid > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 126px;
  align-items: center;
  gap: 12px;
  padding: 9px 11px;
  border: 1px solid #e7eaf0;
  border-radius: 6px;
  background: #fafbfc;
}

.factor-param-grid code {
  min-width: 0;
  overflow: hidden;
  color: #667085;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.factor-param-grid .ant-input-number,
.factor-param-grid .ant-input,
.factor-param-grid .ant-select {
  width: 126px;
  flex: 0 0 126px;
}

.factor-detail__warning {
  margin: 6px 0 0;
  color: #ad6800;
  font-size: 12px;
}

.factor-detail__warning .anticon {
  margin-right: 5px;
}

.factor-detail__code-block + .factor-detail__code-block {
  margin-top: 10px;
}

.factor-detail__code-block > span {
  display: block;
  margin-bottom: 6px;
  color: #8a94a6;
  font-size: 11px;
}

.factor-detail__code-section pre {
  margin: 0;
  padding: 15px;
  overflow: auto;
  border-radius: 8px;
  color: #344054;
  background: #f5f7f9;
  border: 1px solid #e7eaf0;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  line-height: 1.65;
}

.factor-detail__muted {
  color: #8a94a6;
  font-size: 12px;
}

.custom-factor-modal {
  --cf-surface: #f5f7f9;
  --cf-border: #e3e8ee;
  --cf-text: #1e2938;
  --cf-muted: #778398;

  .ant-modal-header { border-color: var(--cf-border); }
  .ant-modal-body { padding: 0; background: #f4f6f8; }
  .ant-modal-footer { padding: 11px 18px; border-color: var(--cf-border); background: #fff; }
  .ant-form-item { margin-bottom: 13px; }
  .ant-form-item-control { line-height: 1.5; }
  .ant-radio-group { line-height: 26px; }
  .ant-form-item-label { padding-bottom: 5px; line-height: 18px; }
  .ant-form-item-label > label { color: #344054; font-size: 12px; font-weight: 600; }
  .ant-input, .ant-select-selection { border-color: #dfe5eb; border-radius: 7px; box-shadow: none; }
  input.ant-input, .ant-select-selection--single { height: 34px; }
  .ant-select-selection__rendered { line-height: 32px; }
  textarea.ant-input { padding: 9px 11px; line-height: 1.6; }
  .ant-input::placeholder { color: #9aa2ad; font-size: 12px; }
  .ant-radio-wrapper { color: var(--cf-text); font-size: 12px; }
  .ant-btn { border-radius: 7px; }
}

.custom-factor-tabs {
  .ant-tabs-bar { margin: 0; padding: 10px 18px; border: 0; background: #fff; }
  .ant-tabs-nav { padding: 3px; border-radius: 8px; background: #f1f3f6; }
  .ant-tabs-nav .ant-tabs-tab { min-width: 88px; margin: 0; padding: 6px 12px; border-radius: 6px; color: #667085; font-size: 12px; text-align: center; }
  .ant-tabs-nav .ant-tabs-tab-active { color: #0c948e; background: #fff; box-shadow: 0 1px 3px rgba(16, 24, 40, 0.08); }
  .ant-tabs-ink-bar { display: none !important; }
}

.custom-factor-pane {
  height: min(520px, calc(100dvh - 230px));
  min-height: 180px;
  overflow-y: auto;
  padding: 14px 18px 18px;
  scrollbar-width: thin;
  scrollbar-color: #c9d1dd transparent;
}

.custom-factor-workspace {
  display: block;
  .custom-factor-form {
    min-width: 0;
    padding: 16px 18px 3px;
    border: 1px solid var(--cf-border);
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.025);
  }
}

.custom-factor-pane__lead {
  margin: 1px 2px 11px;
  color: var(--cf-muted);
  font-size: 11px;
  line-height: 1.6;
}

.custom-factor-example {
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid var(--cf-border);
  border-radius: 6px;
  color: var(--cf-text);

  pre { margin: 0; padding: 14px 16px; color: var(--cf-text); background: var(--cf-surface); white-space: pre-wrap; overflow-wrap: anywhere; font: 12px/1.8 Consolas, Monaco, monospace; }
}

.custom-factor-ai {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px 10px;
  padding: 9px 11px;
  margin-top: 10px;
  border: 1px solid var(--cf-border);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.025);
  min-width: 0;
  &__heading { display: flex; align-items: center; gap: 6px; color: var(--cf-text); font-size: 12px; white-space: nowrap; }
  &__heading strong { font-weight: 600; }
  &__heading .anticon { color: var(--primary-color, #1890ff); }
  &__actions { display: flex; flex-direction: column-reverse; justify-content: center; align-items: center; gap: 3px; min-width: 86px; margin: 0; color: var(--cf-muted); font-size: 10px; }
  &__actions .ant-btn-primary { height: 30px; padding: 0 12px; }
  > .ant-input { min-height: 38px; max-height: 72px; padding: 8px 10px; resize: vertical; border-color: #e4e9ef; background: #f7f9fb; }
  > .ant-input:focus { border-color: var(--primary-color); background: #fff; }
  > .ant-alert, &__candidate { grid-column: ~"1 / -1"; }
  &__candidate { margin: 5px 0 0; }
  &__candidate > p { margin: 0; padding: 0 16px; color: var(--cf-muted); font-size: 12px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
}

.custom-factor-example__heading,
.custom-factor-example__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  font-size: 12px;
}

.custom-factor-example__footer {
  > div > span { display: block; margin-bottom: 4px; color: var(--cf-muted); font-size: 11px; }
  code { font-size: 11px; overflow-wrap: anywhere; }
  .ant-btn { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; }
}

.custom-factor-rule {
  margin-bottom: 7px;
  border: 1px solid var(--cf-border);
  border-radius: 9px;
  color: var(--cf-text);
  background: #fff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.02);

  summary { display: flex; align-items: center; gap: 9px; padding: 10px 13px; cursor: pointer; list-style: none; color: #344054; font-size: 12px; font-weight: 600; line-height: 18px; }
  summary::-webkit-details-marker { display: none; }
  summary > .anticon:first-child { color: var(--primary-color, #52c41a); font-size: 12px; }
  summary > .anticon:last-child { margin-left: auto; color: var(--cf-muted); font-size: 10px; }
  &[open] summary > .anticon:last-child { transform: rotate(180deg); }
  p { margin: 0; padding: 0 13px 12px 34px; color: #667085; font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
}

.custom-factor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.custom-factor-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.custom-factor-form__identity {
  grid-template-columns: minmax(0, 1fr) 124px auto;
  gap: 0 12px;
}

.custom-factor-form__direction {
  .ant-radio-button-wrapper { height: 30px; line-height: 28px; padding: 0 11px; font-size: 11px; }
  .ant-radio-button-wrapper:first-child { border-radius: 5px 0 0 5px; }
  .ant-radio-button-wrapper:last-child { border-radius: 0 5px 5px 0; }
}

.custom-factor-modal .ant-input.custom-factor-form__expression {
  font-family: "Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.65;
  padding: 11px 13px;
  background: var(--cf-surface);
}

.custom-factor-form__help {
  display: block;
  margin-top: 6px;
  color: var(--cf-muted);
  font-size: 12px;
  line-height: 1.6;
}

.custom-factor-form__validation {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 34px;
}

.custom-factor-form__validation-result {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  color: #389e0d;
}

.custom-factor-form__validation-result code {
  padding: 2px 7px;
  border-radius: 4px;
  color: #52606d;
  background: #f1f4f8;
}

.custom-factor-modal--dark {
  --cf-surface: #202020;
  --cf-border: #333333;
  --cf-text: #e5e5e5;
  --cf-muted: #a3a3a3;
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body,
  .ant-modal-footer {
    border-color: rgba(255, 255, 255, 0.09);
    background: #151515;
  }

  .ant-modal-title,
  .ant-modal-close,
  .ant-form-item-label > label,
  .ant-radio-wrapper {
    color: rgba(255, 255, 255, 0.82);
  }

  .ant-input,
  .ant-select-selection {
    border-color: rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.84);
    background: #202020;
  }

  .custom-factor-tabs .ant-tabs-bar,
  .custom-factor-pane {
    border-color: var(--cf-border);
    background: #151515;
  }

  .custom-factor-tabs .ant-tabs-nav {
    background: #202020;
  }

  .custom-factor-tabs .ant-tabs-nav .ant-tabs-tab {
    color: var(--cf-muted);
  }

  .custom-factor-tabs .ant-tabs-nav .ant-tabs-tab-active {
    color: color-mix(in srgb, var(--primary-color, #52c41a) 78%, #fff);
    background: #2a2a2a;
    box-shadow: none;
  }

  .custom-factor-form,
  .custom-factor-ai,
  .custom-factor-example,
  .custom-factor-rule {
    border-color: var(--cf-border);
    color: var(--cf-text);
    background: #1b1b1b;
    box-shadow: none;
  }

  .custom-factor-example pre,
  .ant-input.custom-factor-form__expression {
    border-color: var(--cf-border);
    color: var(--cf-text);
    background: var(--cf-surface);
  }

  .custom-factor-example__heading,
  .custom-factor-example__footer,
  .custom-factor-rule summary {
    color: var(--cf-text);
  }

  .custom-factor-rule p,
  .custom-factor-pane__lead,
  .custom-factor-form__help {
    color: var(--cf-muted);
  }

  .custom-factor-form__direction .ant-radio-button-wrapper {
    border-color: rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.7);
    background: #202020;
  }

  .custom-factor-form__direction .ant-radio-button-wrapper:not(:first-child)::before {
    background-color: rgba(255, 255, 255, 0.14);
  }

  .custom-factor-form__direction .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
    border-color: var(--primary-color, #52c41a);
    color: #fff;
    background: var(--primary-color, #52c41a);
  }

  .ant-alert-error {
    border-color: rgba(255, 77, 79, 0.28);
    background: rgba(255, 77, 79, 0.1);
  }

  .ant-alert-message {
    color: rgba(255, 255, 255, 0.78);
  }

  .custom-factor-form__validation-result code {
    color: rgba(255, 255, 255, 0.72);
    background: #272727;
  }
}

@media (max-width: 900px) {
  .custom-factor-ai { gap: 8px 12px; }
}

@media (max-width: 600px) {
  .custom-factor-tabs .ant-tabs-bar { padding: 0 16px; }
  .custom-factor-pane { padding: 16px; }
  .custom-factor-form__grid { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .custom-factor-ai { grid-template-columns: minmax(0, 1fr); }
  .custom-factor-ai__actions { flex-direction: row; justify-content: space-between; }
  .custom-factor-example__footer { align-items: flex-start; flex-direction: column; }
  .custom-factor-modal .ant-modal-footer { padding: 12px 16px; }
}

.factor-library-modal--dark {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body {
    border-color: rgba(255, 255, 255, 0.08);
    background: #111111;
  }

  .ant-modal-title,
  .ant-modal-close,
  .factor-card__name,
  .factor-detail__heading h3,
  .factor-detail__section h4,
  .factor-detail__facts strong {
    color: rgba(255, 255, 255, 0.9);
  }

  .factor-detail__insights strong {
    color: rgba(255, 255, 255, 0.88);
  }

  .factor-detail__insights summary { color: rgba(255, 255, 255, 0.88); }
  .factor-detail__code-section pre { color: #e0e0e0; background: #202020; border-color: #303030; }

  .factor-library-tools,
  .factor-library-workspace,
  .factor-detail__heading,
  .factor-detail__facts,
  .factor-detail__insights,
  .factor-detail__section {
    border-color: rgba(255, 255, 255, 0.09);
    background: #1b1b1b;
  }

  .factor-library-tools {
    border-bottom-color: rgba(255, 255, 255, 0.09);
    background: #171717;
  }

  .factor-library-workspace,
  .factor-detail {
    background: #111111;
  }

  .factor-library-workspace,
  .factor-library-list,
  .factor-card,
  .factor-detail,
  .factor-param-grid > div,
  .factor-detail__insights article,
  .factor-detail__formula code {
    border-color: rgba(255, 255, 255, 0.09);
  }

  .factor-library-list,
  .factor-param-grid > div {
    background: #171717;
  }

  .factor-detail__facts > div {
    background: transparent;
  }

  .factor-library-filter-chip--active {
    border-color: color-mix(in srgb, var(--factor-library-accent) 42%, #303030);
  }

  .factor-library-filterbar__label,
  .factor-library-filter-chip {
    color: rgba(255, 255, 255, 0.55);
  }

  .factor-library-filter-chip--active {
    color: color-mix(in srgb, var(--factor-library-accent) 74%, #fff);
    background: color-mix(in srgb, var(--factor-library-accent) 11%, #181818);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--factor-library-accent) 9%, transparent);
  }

  .factor-library-filter-chip:hover {
    color: color-mix(in srgb, var(--factor-library-accent) 74%, #fff);
    background: color-mix(in srgb, var(--factor-library-accent) 7%, #181818);
  }

  .factor-library-notice {
    border-color: color-mix(in srgb, var(--factor-library-accent) 26%, #303030);
    color: rgba(255, 255, 255, 0.64);
    background: color-mix(in srgb, var(--factor-library-accent) 7%, #161616);
  }

  .factor-library-notice__icon {
    color: color-mix(in srgb, var(--factor-library-accent) 74%, #fff);
    background: color-mix(in srgb, var(--factor-library-accent) 15%, #1b1b1b);
  }

  .factor-library-list,
  .factor-detail {
    scrollbar-color: #444 transparent;
  }

  .factor-library-list::-webkit-scrollbar-thumb,
  .factor-detail::-webkit-scrollbar-thumb {
    background: #444;
  }

  .factor-detail__insights article,
  .factor-detail__formula code {
    background: #151515;
  }

  .factor-card,
  .factor-detail {
    background: #111111;
  }

  .factor-card:hover,
  .factor-card--active {
    border-color: var(--primary-color, #ff5b21);
    background: #1b1b1b;
    box-shadow: inset 3px 0 0 var(--primary-color, #ff5b21);
  }

  .factor-library-list {
    border-right-color: rgba(255, 255, 255, 0.09);
  }

  .factor-card__desc,
  .factor-card__meta,
  .factor-detail__heading p,
  .factor-detail__muted {
    color: rgba(255, 255, 255, 0.52);
  }

  .factor-detail__insights p,
  .factor-detail__formula code {
    color: rgba(255, 255, 255, 0.62);
  }

  .factor-param-grid code,
  .ant-input-prefix,
  .ant-select-arrow,
  .ant-input-number-handler-wrap {
    color: rgba(255, 255, 255, 0.58);
  }

  .ant-input,
  .ant-input-number,
  .ant-input-number-input,
  .ant-select-selection,
  .ant-btn:not(.ant-btn-primary) {
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.82);
    background: #1b1b1b;
  }

  .ant-input::placeholder {
    color: rgba(255, 255, 255, 0.32);
  }

  .ant-radio-button-wrapper {
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.65);
    background: #1b1b1b;
  }

  .ant-radio-button-wrapper:not(:first-child)::before {
    background-color: rgba(255, 255, 255, 0.12);
  }

  .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
    border-color: var(--primary-color, #faad14);
    color: #fff;
    background: var(--primary-color, #faad14);
  }

  .ant-alert-info {
    border-color: rgba(24, 144, 255, 0.28);
    background: rgba(24, 144, 255, 0.1);
  }

  .ant-alert-warning {
    border-color: rgba(250, 173, 20, 0.3);
    background: rgba(250, 173, 20, 0.1);
  }

  .ant-alert-message,
  .ant-empty-description {
    color: rgba(255, 255, 255, 0.72);
  }

  .factor-token-row .ant-tag {
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.72);
    background: #242424;
  }

  .factor-detail__warning {
    color: #ffc53d;
  }
}

.factor-library-dropdown {
  font-family: "Microsoft YaHei UI", "PingFang SC", "Noto Sans CJK SC", "Noto Sans SC", "Segoe UI", sans-serif;
}

.factor-library-dropdown--dark {
  color: rgba(255, 255, 255, 0.82);
  background: #202020;

  .ant-select-dropdown-menu-item {
    color: rgba(255, 255, 255, 0.78);
  }

  .ant-select-dropdown-menu-item:hover,
  .ant-select-dropdown-menu-item-active,
  .ant-select-dropdown-menu-item-selected {
    color: #fff;
    background: #303030;
  }
}

@media (max-width: 900px) {
  .factor-library-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(100px, 35%) minmax(0, 1fr);
    height: min(680px, calc(100vh - 250px));
    min-height: 240px;
  }

  .factor-library-list {
    max-height: 300px;
    border-right: 0;
    border-bottom: 1px solid #e6e9ef;
  }

  .factor-detail__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
