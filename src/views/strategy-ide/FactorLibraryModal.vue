<template>
  <a-modal
    :visible="visible"
    :title="$t('factorLibrary.title')"
    :width="1080"
    :footer="null"
    :destroy-on-close="false"
    :wrap-class-name="isDark ? 'factor-library-modal factor-library-modal--dark' : 'factor-library-modal'"
    @cancel="$emit('close')"
  >
    <div class="factor-library-intro">
      <div>
        <strong>{{ $t('factorLibrary.subtitle') }}</strong>
        <span>{{ $t('factorLibrary.description') }}</span>
      </div>
      <a-tag color="green">{{ currentScopeSummary }}</a-tag>
    </div>

    <a-alert
      class="factor-library-scope-alert"
      type="info"
      show-icon
      :message="scopeNotice"
    />

    <a-alert v-if="typeFilter === 'fundamental' || (selectedFactor && selectedFactor.factor_type === 'fundamental')" type="warning" show-icon :message="$t('fundamentalSync.factorNotice')" />
    <div class="factor-library-tools">
      <a-input
        v-model="search"
        allow-clear
        class="factor-library-search"
        :placeholder="$t('factorLibrary.searchPlaceholder')"
      >
        <a-icon slot="prefix" type="search" />
      </a-input>
      <a-radio-group v-model="typeFilter" button-style="solid">
        <a-radio-button value="all">{{ $t('factorLibrary.all') }}</a-radio-button>
        <a-radio-button value="technical">{{ $t('factorLibrary.technical') }}</a-radio-button>
        <a-radio-button value="fundamental">{{ $t('factorLibrary.fundamental') }}</a-radio-button>
      </a-radio-group>
      <a-select
        v-model="scopeFilter"
        class="factor-library-scope-select"
        :dropdown-class-name="isDark ? 'factor-library-dropdown factor-library-dropdown--dark' : 'factor-library-dropdown'"
      >
        <a-select-option value="current">{{ $t('factorLibrary.scope.current') }}</a-select-option>
        <a-select-option value="all">{{ $t('factorLibrary.scope.all') }}</a-select-option>
        <a-select-option value="cta">{{ $t('factorLibrary.scope.cta') }}</a-select-option>
        <a-select-option value="portfolio">{{ $t('factorLibrary.scope.portfolio') }}</a-select-option>
      </a-select>
      <a-button icon="reload" :loading="loading" @click="loadFactors">
        {{ $t('factorLibrary.refresh') }}
      </a-button>
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
              <a-tag :color="factor.factor_type === 'fundamental' ? 'purple' : 'blue'">
                {{ typeLabel(factor.factor_type) }}
              </a-tag>
            </span>
            <span class="factor-card__id">{{ factor.factor_id }}</span>
            <span class="factor-card__desc">{{ factorDescription(factor) }}</span>
            <span class="factor-card__meta">
              <span>{{ categoryLabel(factor.category) }}</span>
              <span :class="{ 'factor-card__unsupported': !supportsCurrent(factor) }">
                {{ supportsCurrent(factor) ? directionLabel(factor.direction_hint) : $t('factorLibrary.notAvailableHere') }}
              </span>
            </span>
          </button>
          <div class="factor-library-list__spacer" :style="{ height: `${virtualBottomSpacer}px` }"></div>
          <a-empty v-if="!filteredFactors.length" :description="$t('factorLibrary.empty')" />
        </div>

        <div v-if="selectedFactor" class="factor-detail">
          <div class="factor-detail__heading">
            <div>
              <span class="factor-detail__eyebrow">{{ selectedFactor.factor_id }} · v{{ selectedFactor.version }}</span>
              <h3>{{ factorName(selectedFactor) }}</h3>
              <p>{{ factorDescription(selectedFactor) }}</p>
            </div>
            <a-button icon="copy" :disabled="!supportsCurrent(selectedFactor)" @click="copyText(factorCall(selectedFactor))">
              {{ $t('factorLibrary.copyCall') }}
            </a-button>
          </div>

          <div class="factor-detail__facts">
            <div>
              <span>{{ $t('factorLibrary.type') }}</span>
              <strong>{{ typeLabel(selectedFactor.factor_type) }}</strong>
            </div>
            <div>
              <span>{{ $t('factorLibrary.category') }}</span>
              <strong>{{ categoryLabel(selectedFactor.category) }}</strong>
            </div>
            <div>
              <span>{{ $t('factorLibrary.direction') }}</span>
              <strong>{{ directionLabel(selectedFactor.direction_hint) }}</strong>
            </div>
            <div>
              <span>{{ $t('factorLibrary.runtime') }}</span>
              <strong>{{ runtimeLabel(selectedFactor) }}</strong>
            </div>
          </div>

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
            <pre>{{ strategySnippet(selectedFactor) }}</pre>
            <p v-if="selectedFactor.direction_hint === 'neutral'" class="factor-detail__muted">
              {{ $t('factorLibrary.neutralHint') }}
            </p>
          </section>
        </div>

        <a-empty v-else class="factor-detail-empty" :description="$t('factorLibrary.selectHint')" />
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import { getFactorCatalog } from '@/api/factor'

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
      factors: [],
      selectedId: '',
      selectedFactor: null,
      search: '',
      typeFilter: 'all',
      scopeFilter: 'current',
      parameterValues: {},
      listScrollTop: 0,
      factorRowHeight: 133,
      factorWindowSize: 18,
      preloadHandle: null,
      preloadHandleType: ''
    }
  },
  computed: {
    filteredFactors () {
      const query = String(this.search || '').trim().toLowerCase()
      return this.factors.filter(factor => {
        if (this.typeFilter !== 'all' && factor.factor_type !== this.typeFilter) return false
        const contexts = factor.supported_contexts || []
        const requestedScope = this.scopeFilter === 'current' ? this.currentContext : this.scopeFilter
        if (requestedScope !== 'all' && !contexts.includes(requestedScope)) return false
        if (!query) return true
        return [
          factor.factor_id,
          factor.category,
          this.factorName(factor),
          this.factorDescription(factor),
          ...(factor.required_fields || [])
        ].some(value => String(value || '').toLowerCase().includes(query))
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
    },
    compatibleCount () {
      return this.factors.filter(factor => this.supportsCurrent(factor)).length
    },
    currentScopeSummary () {
      const label = this.currentContext === 'cta'
        ? this.$t('factorLibrary.scope.cta')
        : this.$t('factorLibrary.scope.portfolio')
      return this.$t('factorLibrary.availableCount', { scope: label, count: this.compatibleCount })
    },
    scopeNotice () {
      return this.currentContext === 'cta'
        ? this.$t('factorLibrary.ctaNotice')
        : this.$t('factorLibrary.portfolioNotice')
    }
  },
  watch: {
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
    search () {
      this.handleFactorFilterChange()
    }
  },
  mounted () {
    this.schedulePreload()
  },
  beforeDestroy () {
    this.cancelPreload()
  },
  methods: {
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
        this.factors = Array.isArray(res.data) ? res.data : []
        this.loaded = true
        this.resetVirtualList()
        const preferred = this.filteredFactors.find(item => item.factor_id === this.selectedId) || this.filteredFactors[0]
        if (preferred) this.selectFactor(preferred)
      } catch (error) {
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
    handleListScroll (event) {
      this.listScrollTop = Math.max(0, Number(event && event.target && event.target.scrollTop) || 0)
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
    factorName (factor) {
      return this.translation(factor.name_i18n_key, factor.factor_id)
    },
    factorDescription (factor) {
      return this.translation(factor.description_i18n_key, factor.factor_id)
    },
    typeLabel (value) {
      return this.$t(`factorLibrary.type.${value}`)
    },
    categoryLabel (value) {
      return this.$t(`factorLibrary.category.${value}`)
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
          '    # Combine the factor value with explicit entry, exit, sizing and risk rules.'
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
        lines.push('    # Define the ranking direction for this strategy before selecting Top-N.')
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
.factor-library-modal {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;

  .ant-modal {
    top: 32px;
    padding-bottom: 32px;
  }

  .ant-modal-body {
    padding: 20px 24px 24px;
    overflow: hidden;
  }

  button,
  input,
  .ant-select,
  .ant-input-number {
    font-family: inherit;
  }
}

.factor-library-intro,
.factor-library-tools,
.factor-detail__heading,
.factor-detail__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.factor-library-intro {
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid #e6e9ef;
  border-radius: 10px;
  background: #fafbfc;
}

.factor-library-intro strong,
.factor-library-intro span {
  display: block;
}

.factor-library-intro strong {
  margin-bottom: 4px;
  color: #172033;
  font-size: 15px;
}

.factor-library-intro span {
  color: #6b7280;
  font-size: 13px;
}

.factor-library-scope-alert {
  margin-bottom: 14px;
}

.factor-library-tools {
  margin-bottom: 14px;
  justify-content: flex-start;
}

.factor-library-search {
  width: 320px;
}

.factor-library-scope-select {
  width: 170px;
}

.factor-library-workspace {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  height: min(620px, calc(100vh - 292px));
  min-height: 390px;
  overflow: hidden;
  border: 1px solid #e6e9ef;
  border-radius: 10px;
}

.factor-library-list {
  min-height: 0;
  padding: 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-right: 1px solid #e6e9ef;
  background: #f7f8fa;
}

.factor-library-list__spacer {
  width: 1px;
  pointer-events: none;
}

.factor-card {
  box-sizing: border-box;
  display: block;
  width: 100%;
  height: 124px;
  margin: 0 0 9px;
  padding: 12px;
  overflow: hidden;
  border: 1px solid #e2e6ec;
  border-radius: 8px;
  color: inherit;
  text-align: left;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.factor-card:hover,
.factor-card--active {
  border-color: var(--primary-color, #faad14);
  box-shadow: 0 0 0 2px rgba(250, 173, 20, 0.1);
}

.factor-card__top,
.factor-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.factor-card__unsupported {
  color: #d46b08;
}

.factor-card__name {
  color: #172033;
  font-size: 14px;
  font-weight: 700;
}

.factor-card__id,
.factor-detail__eyebrow {
  color: #8a94a6;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
}

.factor-card__desc {
  display: -webkit-box;
  margin: 8px 0 10px;
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.factor-card__meta {
  color: #7b8494;
  font-size: 11px;
}

.factor-detail {
  min-height: 0;
  padding: 22px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #fff;
}

.factor-detail__heading {
  align-items: flex-start;
}

.factor-detail__heading h3 {
  margin: 4px 0 6px;
  color: #172033;
  font-size: 21px;
}

.factor-detail__heading p {
  max-width: 560px;
  margin: 0;
  color: #667085;
  line-height: 1.6;
}

.factor-detail__facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 20px 0;
}

.factor-detail__facts > div {
  padding: 11px 12px;
  border: 1px solid #e7eaf0;
  border-radius: 8px;
  background: #fafbfc;
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
  margin-top: 18px;
}

.factor-detail__unsupported {
  margin-top: 16px;
}

.factor-detail__section h4 {
  margin: 0 0 9px;
  color: #273044;
  font-size: 13px;
}

.factor-token-row .ant-tag {
  margin-bottom: 6px;
  font-family: Consolas, Monaco, monospace;
}

.factor-param-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.factor-param-grid > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 11px;
  border: 1px solid #e7eaf0;
  border-radius: 6px;
  background: #fafbfc;
}

.factor-param-grid code {
  overflow: hidden;
  color: #667085;
  text-overflow: ellipsis;
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

.factor-detail__code-section pre {
  margin: 0;
  padding: 15px;
  overflow: auto;
  border-radius: 8px;
  color: #d8dee9;
  background: #141414;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.65;
}

.factor-detail__muted {
  color: #8a94a6;
  font-size: 12px;
}

.factor-detail-empty {
  margin-top: 180px;
}

.factor-library-modal--dark {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body {
    border-color: rgba(255, 255, 255, 0.08);
    background: #141414;
  }

  .ant-modal-title,
  .ant-modal-close,
  .factor-library-intro strong,
  .factor-card__name,
  .factor-detail__heading h3,
  .factor-detail__section h4,
  .factor-detail__facts strong {
    color: rgba(255, 255, 255, 0.9);
  }

  .factor-library-intro,
  .factor-library-workspace,
  .factor-library-list,
  .factor-card,
  .factor-detail,
  .factor-detail__facts > div,
  .factor-param-grid > div {
    border-color: rgba(255, 255, 255, 0.09);
  }

  .factor-library-intro,
  .factor-library-list,
  .factor-detail__facts > div,
  .factor-param-grid > div {
    background: #181818;
  }

  .factor-card,
  .factor-detail {
    background: #1d1d1d;
  }

  .factor-library-list {
    border-right-color: rgba(255, 255, 255, 0.09);
  }

  .factor-library-intro span,
  .factor-card__desc,
  .factor-card__meta,
  .factor-detail__heading p,
  .factor-detail__muted {
    color: rgba(255, 255, 255, 0.52);
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
    background: #202020;
  }

  .ant-input::placeholder {
    color: rgba(255, 255, 255, 0.32);
  }

  .ant-radio-button-wrapper {
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.65);
    background: #202020;
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

  .ant-alert-message,
  .ant-empty-description {
    color: rgba(255, 255, 255, 0.72);
  }

  .factor-token-row .ant-tag {
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.72);
    background: #242424;
  }

  .factor-library-intro > .ant-tag {
    border-color: rgba(82, 196, 26, 0.32);
    color: #b7eb8f;
    background: rgba(82, 196, 26, 0.14);
  }

  .factor-detail__warning {
    color: #ffc53d;
  }
}

.factor-library-dropdown {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
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
    height: min(680px, calc(100vh - 250px));
    min-height: 390px;
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
