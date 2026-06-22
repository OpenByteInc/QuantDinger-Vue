<template>
  <a-form-model
    ref="form"
    :model="form"
    :rules="rules"
    :label-col="{ span: 8 }"
    :wrapper-col="{ span: 14 }"
  >
    <a-form-model-item :label="budgetLabel">
      <a-input-number
        :value="initialCapital"
        disabled
        style="width: 100%"
        placeholder="USDT"
      />
      <div class="capital-hint">{{ budgetHint }}</div>
    </a-form-model-item>
    <a-form-model-item :label="firstOrderLabel">
      <a-input-number
        :value="firstOrderAmount"
        disabled
        style="width: 100%"
        placeholder="USDT"
      />
      <div class="capital-hint">{{ firstOrderHint }}</div>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.martingale.multiplier')" prop="multiplier">
      <a-input-number
        v-model="form.multiplier"
        :min="1.1"
        :max="10"
        :step="0.1"
        style="width: 100%"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.martingale.maxLayers')" prop="maxLayers">
      <a-input-number
        v-model="form.maxLayers"
        :min="1"
        :max="20"
        :step="1"
        style="width: 100%"
        @change="emit"
      />
      <div class="field-hint">{{ maxLayersHint }}</div>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.martingale.priceDropPct')" prop="priceDropPct">
      <a-input-number
        v-model="form.priceDropPct"
        :min="0.1"
        :max="50"
        :step="0.5"
        style="width: 100%"
        :formatter="v => `${v}%`"
        :parser="v => v.replace('%', '')"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="takeProfitLabel" prop="takeProfitPct">
      <a-input-number
        v-model="form.takeProfitPct"
        :min="0.1"
        :max="100"
        :step="0.5"
        style="width: 100%"
        :formatter="v => `${v}%`"
        :parser="v => v.replace('%', '')"
        @change="emit"
      />
      <div class="field-hint">{{ takeProfitHint }}</div>
    </a-form-model-item>
    <a-form-model-item :label="trailingTpSwitchLabel">
      <a-switch v-model="form.trailingTpEnabled" @change="emit" />
      <div class="field-hint">{{ trailingTpSwitchHint }}</div>
    </a-form-model-item>
    <a-form-model-item
      v-if="form.trailingTpEnabled"
      :label="trailingTpCallbackLabel"
      prop="trailingTpCallbackPct"
    >
      <a-input-number
        v-model="form.trailingTpCallbackPct"
        :min="0.05"
        :max="50"
        :step="0.1"
        style="width: 100%"
        :formatter="v => `${v}%`"
        :parser="v => v.replace('%', '')"
        @change="emit"
      />
      <div class="field-hint">{{ trailingTpCallbackHint }}</div>
    </a-form-model-item>
    <a-form-model-item :label="stopLossLabel" prop="stopLossPct">
      <a-input-number
        v-model="form.stopLossPct"
        :min="0.1"
        :max="100"
        :step="0.5"
        style="width: 100%"
        :formatter="v => `${v}%`"
        :parser="v => v.replace('%', '')"
        @change="emit"
      />
      <div class="field-hint">{{ stopLossHint }}</div>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.martingale.direction')">
      <a-radio-group v-model="form.direction" @change="emit">
        <a-radio value="long">{{ $t('trading-bot.martingale.long') }}</a-radio>
        <a-radio value="short" :disabled="isSpotMarket">{{ $t('trading-bot.martingale.short') }}</a-radio>
      </a-radio-group>
      <div class="direction-hint">{{ directionHint }}</div>
    </a-form-model-item>

    <a-divider>{{ $t('trading-bot.martingale.riskGuardsTitle') }}</a-divider>
    <a-form-model-item :label="$t('trading-bot.martingale.waterfallProtection')">
      <a-switch v-model="form.waterfallProtection" @change="emit" />
      <div class="field-hint">{{ $t('trading-bot.martingale.waterfallProtectionHint') }}</div>
    </a-form-model-item>
    <a-form-model-item
      v-if="form.waterfallProtection"
      :label="$t('trading-bot.martingale.waterfallDropPct')"
    >
      <a-input-number
        v-model="form.waterfallDropPct"
        :min="0.5"
        :max="30"
        :step="0.5"
        :precision="2"
        style="width: 100%"
        :formatter="formatWaterfallPct"
        :parser="parseWaterfallPct"
        @change="onWaterfallPctChange"
      />
      <div class="field-hint">{{ $t('trading-bot.martingale.waterfallDropPctHint') }}</div>
    </a-form-model-item>
    <div
      class="config-summary"
      v-if="firstOrderRaw > 0 && form.multiplier && form.maxLayers"
    >
      <div class="summary-item">
        <span class="label">{{ budgetLabel }}</span>
        <span class="value">${{ maxInvestment }}</span>
      </div>
      <div class="summary-item">
        <span class="label">{{ firstOrderLabel }}</span>
        <span class="value">${{ firstOrderAmount }}</span>
      </div>
      <div class="summary-item">
        <span class="label">{{ $t('trading-bot.martingale.lastLayerAmt') }}</span>
        <span class="value">${{ lastLayerAmount }}</span>
      </div>
    </div>
  </a-form-model>
</template>

<script>
import {
  formatPercentDisplay,
  parsePercentInput,
  ratioOrPercentToUiPercent,
  roundTo
} from '@/utils/numberFormat'

export default {
  name: 'MartingaleConfig',
  props: {
    value: { type: Object, default: () => ({}) },
    initialCapital: { type: Number, default: null },
    marketType: { type: String, default: 'swap' }
  },
  data () {
    return {
      form: {
        multiplier: this.value.multiplier || 2,
        maxLayers: this.value.maxLayers || 5,
        priceDropPct: this.value.priceDropPct || 3,
        takeProfitPct: this.value.takeProfitPct || 2,
        stopLossPct: this.value.stopLossPct || 12,
        direction: this.value.direction || 'long',
        // Trailing take-profit. When enabled, the `takeProfitPct` field above
        // re-interprets as the *activation* threshold: once unrealised PnL
        // breaks past that %, the bot starts tracking the best price reached
        // and closes the cycle once the price retraces by `trailingTpCallbackPct`
        // from that peak. When disabled, takeProfitPct keeps its original
        // "close immediately on hit" semantics.
        trailingTpEnabled: this.value.trailingTpEnabled === true,
        trailingTpCallbackPct: this.value.trailingTpCallbackPct != null
          ? this.value.trailingTpCallbackPct
          : 0.8,
        waterfallProtection: this.value.waterfallProtection !== false,
        waterfallDropPct: ratioOrPercentToUiPercent(this.value.waterfallDropPct, 4)
      },
      rules: {
        multiplier: [{ required: true, message: this.$t('trading-bot.martingale.multiplierReq'), trigger: 'change' }],
        maxLayers: [{ required: true, message: this.$t('trading-bot.martingale.maxLayersReq'), trigger: 'change' }],
        priceDropPct: [{ required: true, message: this.$t('trading-bot.martingale.priceDropReq'), trigger: 'change' }],
        takeProfitPct: [{ required: true, message: this.$t('trading-bot.martingale.takeProfitReq'), trigger: 'change' }],
        stopLossPct: [{ required: true, message: this.isZhLocale ? '请输入止损比例' : 'Please enter stop loss %', trigger: 'change' }],
        trailingTpCallbackPct: [{
          validator: (rule, value, callback) => {
            if (!this.form.trailingTpEnabled) return callback()
            const v = Number(value)
            if (!Number.isFinite(v) || v <= 0) {
              return callback(new Error(this.isZhLocale ? '请输入有效的回撤比例' : 'Please enter a valid callback %'))
            }
            // Sanity guard: callback that is wider than the activation profit
            // means the bot will immediately exit at the activation moment.
            if (v >= Number(this.form.takeProfitPct || 0)) {
              return callback(new Error(this.isZhLocale
                ? '回撤比例应小于激活涨幅'
                : 'Callback % must be smaller than the activation profit %'))
            }
            callback()
          },
          trigger: 'change'
        }]
      }
    }
  },
  mounted () {
    this.emit()
  },
  watch: {
    'form.multiplier' () {
      this.emit()
    },
    'form.maxLayers' () {
      this.emit()
    },
    'form.trailingTpEnabled' () {
      this.emit()
    },
    'form.trailingTpCallbackPct' () {
      this.emit()
    },
    'form.takeProfitPct' () {
      // Re-run the callback validator: it cross-checks against takeProfitPct
      // so changes here must invalidate a previously valid callback value.
      if (this.form.trailingTpEnabled && this.$refs.form) {
        this.$nextTick(() => this.$refs.form.validateField('trailingTpCallbackPct'))
      }
    },
    initialCapital () {
      this.emit()
    },
    marketType: {
      immediate: true,
      handler (val) {
        if (val === 'spot' && this.form.direction !== 'long') {
          this.form.direction = 'long'
          this.emit()
        }
      }
    },
    value: {
      deep: true,
      handler (val) {
        if (!val || typeof val !== 'object') return
        if (val.waterfallDropPct != null && val.waterfallDropPct !== '') {
          this.form.waterfallDropPct = ratioOrPercentToUiPercent(val.waterfallDropPct, 4)
        }
      }
    }
  },
  computed: {
    isZhLocale () {
      return String(this.$i18n?.locale || '').toLowerCase().startsWith('zh')
    },
    isSpotMarket () {
      return this.marketType === 'spot'
    },
    budgetLabel () {
      return this.isZhLocale ? '总投入金额' : 'Total Budget'
    },
    firstOrderLabel () {
      return this.isZhLocale ? '首单金额（自动计算）' : 'First Order Amount (Auto)'
    },
    takeProfitLabel () {
      // When trailing is on, the same input becomes the *activation* threshold
      // (peak tracking only kicks in once profit breaches this number).
      if (this.form.trailingTpEnabled) {
        return this.isZhLocale ? '追踪止盈激活涨幅%' : 'Trailing TP Activation %'
      }
      return this.isZhLocale ? '相对持仓均价止盈%' : 'Take Profit vs Avg Entry %'
    },
    stopLossLabel () {
      return this.isZhLocale ? '相对持仓均价止损%' : 'Stop Loss vs Avg Entry %'
    },
    trailingTpSwitchLabel () {
      return this.isZhLocale ? '启用追踪止盈' : 'Trailing Take Profit'
    },
    trailingTpSwitchHint () {
      return this.isZhLocale
        ? '开启后，达到上面的涨幅时不再立即平仓，而是开始追踪盈利峰值；价格从峰值回撤指定比例后再平仓。'
        : 'When ON, the bot does NOT exit at the profit % above. Instead it starts tracking the peak price; the cycle closes only after the price retraces by the callback % set below.'
    },
    trailingTpCallbackLabel () {
      return this.isZhLocale ? '回撤幅度%' : 'Callback %'
    },
    trailingTpCallbackHint () {
      return this.isZhLocale
        ? '激活后，价格从峰值回撤这么多比例时立即平仓重置马丁状态。建议小于激活涨幅。'
        : 'Once activated, the cycle closes the moment the price retraces this % from the peak. Keep it smaller than the activation %.'
    },
    budgetHint () {
      return this.isZhLocale
        ? '这里表示这一轮马丁允许投入的总预算，不是首单金额。'
        : 'This is the total budget for one martingale cycle, not the first order size.'
    },
    firstOrderRaw () {
      const capital = Number(this.initialCapital || 0)
      if (capital <= 0) return 0
      let geoSum = 0
      for (let i = 0; i < this.form.maxLayers; i++) {
        geoSum += Math.pow(this.form.multiplier, i)
      }
      if (geoSum <= 0) return 0
      return Math.max(0, Math.floor((capital / geoSum) * 100) / 100)
    },
    firstOrderAmount () {
      return this.firstOrderRaw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    maxLayersHint () {
      return this.isZhLocale
        ? '控制最多允许补仓的层数；系统会按总投入金额自动反推首单金额。'
        : 'Controls how many add-on entries are allowed; first order size is derived from total budget.'
    },
    maxInvestment () {
      let total = 0
      let amt = this.firstOrderRaw
      for (let i = 0; i < this.form.maxLayers; i++) {
        total += amt
        amt *= this.form.multiplier
      }
      return total.toLocaleString('en-US', { minimumFractionDigits: 2 })
    },
    lastLayerAmount () {
      const amt = this.firstOrderRaw * Math.pow(this.form.multiplier, this.form.maxLayers - 1)
      return amt.toLocaleString('en-US', { minimumFractionDigits: 2 })
    },
    firstOrderHint () {
      return this.isZhLocale
        ? '根据总投入金额、加仓倍数和最大层数自动推导，避免重复设置。'
        : 'Derived automatically from total budget, multiplier, and max layers.'
    },
    takeProfitHint () {
      if (this.form.trailingTpEnabled) {
        return this.isZhLocale
          ? '价格相对持仓均价的盈利突破这个比例后，开始追踪盈利峰值（不再立即平仓）。'
          : 'When unrealised PnL vs avg entry breaks above this %, the bot starts tracking the peak (does NOT exit yet).'
      }
      return this.isZhLocale
        ? '当价格相对持仓均价达到这个盈利比例时，脚本自动平仓并重置马丁状态。'
        : 'When average entry profit reaches this %, the script closes the position and resets martingale state.'
    },
    stopLossHint () {
      return this.isZhLocale
        ? '当价格相对持仓均价反向达到这个比例时，整轮马丁强制止损。'
        : 'Force close the whole martingale cycle when price moves this % against average entry.'
    },
    directionHint () {
      if (this.isSpotMarket) return 'Spot only supports long martingale bots.'
      return this.form.direction === 'long'
        ? this.$t('trading-bot.martingale.longHint')
        : this.$t('trading-bot.martingale.shortHint')
    }
  },
  methods: {
    formatWaterfallPct (v) {
      return `${formatPercentDisplay(v, 2)}%`
    },
    parseWaterfallPct (v) {
      const n = parsePercentInput(v, 4)
      return n == null ? '' : n
    },
    onWaterfallPctChange (val) {
      if (val != null && val !== '') {
        this.form.waterfallDropPct = roundTo(Number(val), 4)
      }
      this.emit()
    },
    emit () {
      const payload = {
        ...this.form,
        initialAmount: this.firstOrderRaw,
        waterfallDropPct: this.form.waterfallProtection
          ? roundTo(Number(this.form.waterfallDropPct || 4), 4) / 100
          : undefined
      }
      this.$emit('input', payload)
      this.$emit('change', payload)
    },
    validate () {
      return new Promise((resolve, reject) => {
        this.$refs.form.validate(valid => {
          valid ? resolve({ ...this.form, initialAmount: this.firstOrderRaw }) : reject(new Error('validation failed'))
        })
      })
    }
  }
}
</script>

<style lang="less" scoped>
.capital-hint,
.direction-hint,
.field-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #8c8c8c;
}

.config-summary {
  margin-top: 8px;
  padding: 12px 16px;
  background: rgba(245, 34, 45, 0.04);
  border: 1px dashed rgba(245, 34, 45, 0.3);
  border-radius: 8px;

  .summary-item {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 13px;

    .label { color: #8c8c8c; }
    .value { font-weight: 600; color: rgba(0, 0, 0, 0.85); }
  }

  body.dark &,
  body.realdark & {
    background: rgba(245, 34, 45, 0.08);
    border-color: rgba(245, 34, 45, 0.35);

    .summary-item {
      .label { color: rgba(255, 255, 255, 0.45); }
      .value { color: rgba(255, 255, 255, 0.85); }
    }
  }
}
</style>
