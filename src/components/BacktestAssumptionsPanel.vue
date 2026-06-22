<template>

  <div class="backtest-assumptions" :class="{ 'backtest-assumptions--compact': compact }">

    <div class="backtest-assumptions__head">

      <a-icon type="info-circle" theme="filled" />

      <span class="backtest-assumptions__title">{{ $t('dashboard.indicator.backtest.executionAssumptions.title') }}</span>

      <a-tag v-if="isScriptBacktest" size="small" color="purple">

        {{ $t('dashboard.indicator.backtest.executionAssumptions.scriptStandardShort') }}

      </a-tag>

      <a-tag v-else size="small" :color="isStrictMode ? 'blue' : 'orange'">

        {{ isStrictMode ? $t('indicatorIde.strictModeOnShort') : $t('indicatorIde.strictModeOffShort') }}

      </a-tag>

    </div>



    <a-alert

      v-if="showSubBarFallback"

      type="warning"

      show-icon

      banner

      class="backtest-assumptions__alert"

      :message="subBarFallbackMessage"

    />



    <div class="backtest-assumptions__grid">

      <div class="backtest-assumptions__cell">

        <span class="backtest-assumptions__label">{{ $t('dashboard.indicator.backtest.executionAssumptions.colMode') }}</span>

        <strong>{{ simulationModeLabel }}</strong>

      </div>

      <div class="backtest-assumptions__cell">

        <span class="backtest-assumptions__label">{{ $t('dashboard.indicator.backtest.executionAssumptions.colTiming') }}</span>

        <strong>{{ signalTimingLabel }}</strong>

      </div>

      <div class="backtest-assumptions__cell">

        <span class="backtest-assumptions__label">{{ $t('dashboard.indicator.backtest.executionAssumptions.colCommission') }}</span>

        <strong>{{ commissionLabel }}</strong>

      </div>

      <div class="backtest-assumptions__cell">

        <span class="backtest-assumptions__label">{{ $t('dashboard.indicator.backtest.executionAssumptions.colSlippage') }}</span>

        <strong>{{ slippageLabel }}</strong>

      </div>

    </div>



    <p class="backtest-assumptions__body">{{ bodyText }}</p>

    <p v-if="tradeCountNote" class="backtest-assumptions__note backtest-assumptions__note--muted">{{ tradeCountNote }}</p>

  </div>

</template>



<script>

import { ratioToPercent } from '@/utils/backtestPresets'



export default {

  name: 'BacktestAssumptionsPanel',

  props: {

    executionAssumptions: { type: Object, default: null },

    precisionInfo: { type: Object, default: null },

    commission: { type: [Number, String], default: null },

    slippage: { type: [Number, String], default: null },

    compact: { type: Boolean, default: false },

    scriptBacktest: { type: Boolean, default: false }

  },

  computed: {

    ea () {

      return this.executionAssumptions || {}

    },

    isScriptBacktest () {

      if (this.scriptBacktest) return true

      if (this.ea.scriptBacktest === true) return true

      return String(this.ea.simulationMode || '').toLowerCase() === 'script_standard'

    },

    pi () {

      return this.precisionInfo || {}

    },

    isStrictMode () {

      if (this.strictMode !== null && this.strictMode !== undefined) {

        return !!this.strictMode

      }

      if (this.ea.strictMode != null) return !!this.ea.strictMode

      const timing = this.ea.signalTiming || ''

      return timing === 'next_bar_open' || timing === ''

    },

    showSubBarFallback () {

      return !this.isStrictMode && this.ea.mtfRequested && !this.ea.mtfActive && !!this.ea.mtfFallbackReason

    },

    subBarFallbackMessage () {

      return this.pi.message || this.$t('dashboard.indicator.backtest.executionAssumptions.aggressiveFallback')

    },

    simulationModeLabel () {

      if (this.isScriptBacktest) {

        return this.$t('dashboard.indicator.backtest.executionAssumptions.modeScriptStandard')

      }

      if (!this.isStrictMode && (this.ea.mtfActive || this.pi.enabled)) {

        const exec = this.ea.executionTimeframe || this.pi.timeframe || '1m'

        return this.$t('dashboard.indicator.backtest.executionAssumptions.modeAggressive1m', { exec })

      }

      if (!this.isStrictMode) {

        return this.$t('dashboard.indicator.backtest.executionAssumptions.modeAggressiveBar')

      }

      return this.$t('dashboard.indicator.backtest.executionAssumptions.modeStrict')

    },

    signalTimingLabel () {

      if (this.isScriptBacktest) {

        return this.$t('dashboard.indicator.backtest.executionAssumptions.timingScriptNextBar')

      }

      if (this.isStrictMode) {

        return this.$t('dashboard.indicator.backtest.executionAssumptions.timingNextBar')

      }

      return this.$t('dashboard.indicator.backtest.executionAssumptions.timingSameBar')

    },

    commissionLabel () {

      const raw = this.ea.commission != null ? this.ea.commission : this.commission

      return ratioToPercent(raw)

    },

    slippageLabel () {

      const raw = this.ea.slippage != null ? this.ea.slippage : this.slippage

      return ratioToPercent(raw)

    },

    bodyText () {

      if (this.isScriptBacktest) {

        return this.$t('dashboard.indicator.backtest.executionAssumptions.bodyScriptStandard')

      }

      if (this.isStrictMode) {

        return this.$t('dashboard.indicator.backtest.executionAssumptions.bodyStrict')

      }

      if (this.ea.mtfActive || this.pi.enabled) {

        const sig = this.ea.strategyTimeframe || '--'

        const exec = this.ea.executionTimeframe || this.pi.timeframe || '1m'

        return this.$t('dashboard.indicator.backtest.executionAssumptions.bodyAggressive1m', { sig, exec })

      }

      return this.$t('dashboard.indicator.backtest.executionAssumptions.bodyAggressiveBar')

    },

    tradeCountNote () {

      if (this.isScriptBacktest) {

        return this.$t('dashboard.indicator.backtest.executionAssumptions.tradeCountScriptNote')

      }

      if (!this.isStrictMode && (this.ea.mtfActive || this.pi.enabled)) {

        return this.$t('dashboard.indicator.backtest.executionAssumptions.tradeCountMtfNote')

      }

      return this.$t('dashboard.indicator.backtest.executionAssumptions.tradeCountStandardNote')

    }

  }

}

</script>



<style scoped lang="less">

.backtest-assumptions {

  margin-bottom: 12px;

  padding: 10px 12px;

  border: 1px solid #e6f4ff;

  border-radius: 8px;

  background: linear-gradient(180deg, #f8fbff 0%, #f4f9ff 100%);

}

.backtest-assumptions--compact {

  padding: 8px 10px;

}

.backtest-assumptions__head {

  display: flex;

  align-items: center;

  gap: 8px;

  margin-bottom: 8px;

  color: #1677ff;

  font-weight: 600;

  font-size: 12px;

}

.backtest-assumptions__title {

  flex: 1;

}

.backtest-assumptions__alert {

  margin-bottom: 8px;

}

.backtest-assumptions__grid {

  display: grid;

  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 8px 12px;

  margin-bottom: 8px;

}

.backtest-assumptions__cell {

  display: flex;

  flex-direction: column;

  gap: 2px;

  font-size: 12px;

}

.backtest-assumptions__label {

  color: #8c8c8c;

  font-size: 11px;

}

.backtest-assumptions__body,

.backtest-assumptions__note {

  margin: 0;

  font-size: 11px;

  line-height: 1.55;

  color: #595959;

}

.backtest-assumptions__note--muted {

  margin-top: 6px;

  color: #8c8c8c;

}

</style>


