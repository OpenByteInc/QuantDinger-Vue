<template>
  <a-form-model
    ref="form"
    :model="form"
    :rules="rules"
    :label-col="{ span: 8 }"
    :wrapper-col="{ span: 14 }"
  >
    <a-form-model-item :label="$t('trading-bot.grid.upperPrice')" prop="upperPrice">
      <a-input-number
        v-model="form.upperPrice"
        :min="0"
        :step="0.01"
        style="width: 100%"
        :placeholder="$t('trading-bot.grid.upperPricePh')"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.lowerPrice')" prop="lowerPrice">
      <a-input-number
        v-model="form.lowerPrice"
        :min="0"
        :step="0.01"
        style="width: 100%"
        :placeholder="$t('trading-bot.grid.lowerPricePh')"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.gridCount')" prop="gridCount">
      <a-input-number
        v-model="form.gridCount"
        :min="2"
        :max="500"
        :step="1"
        style="width: 100%"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.amountPerGrid')" prop="amountPerGrid">
      <a-input-number
        v-model="form.amountPerGrid"
        :min="1"
        :step="1"
        style="width: 100%"
        :placeholder="$t('trading-bot.grid.amountPerGridPh')"
        @change="handleAmountManualChange"
      />
      <div v-if="capitalLinked && initialCapital" class="direction-hint">
        <a-icon type="link" /> {{ $t('trading-bot.grid.autoCalcHint') }}
      </div>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.mode')">
      <a-radio-group v-model="form.gridMode" @change="emit">
        <a-radio value="arithmetic">{{ $t('trading-bot.grid.arithmetic') }}</a-radio>
        <a-radio value="geometric">{{ $t('trading-bot.grid.geometric') }}</a-radio>
      </a-radio-group>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.direction')">
      <a-radio-group v-model="form.gridDirection" @change="onGridDirectionChange">
        <a-radio value="neutral" :disabled="isSpotMarket">{{ $t('trading-bot.grid.neutral') }}</a-radio>
        <a-radio value="long">{{ $t('trading-bot.grid.long') }}</a-radio>
        <a-radio value="short" :disabled="isSpotMarket">{{ $t('trading-bot.grid.short') }}</a-radio>
      </a-radio-group>
      <div class="direction-hint">{{ directionHint }}</div>
    </a-form-model-item>
    <a-form-model-item
      v-if="form.gridDirection === 'long' || form.gridDirection === 'short'"
      :label="$t('trading-bot.grid.initialPositionPct')"
      prop="initialPositionPct"
    >
      <a-input-number
        v-model="form.initialPositionPct"
        :min="0"
        :max="100"
        :step="5"
        style="width: 100%"
        :formatter="v => `${v}%`"
        :parser="v => v.replace('%', '')"
        @change="emit"
      />
      <div class="direction-hint">{{ $t('trading-bot.grid.initialPositionPctHint') }}</div>
      <div v-if="initialCapitalHint" class="direction-hint">{{ initialCapitalHint }}</div>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.orderType')">
      <a-radio-group v-model="form.orderMode" @change="emit">
        <a-radio value="maker">{{ $t('trading-bot.grid.limitOrder') }}</a-radio>
        <a-radio value="market">{{ $t('trading-bot.grid.marketOrder') }}</a-radio>
      </a-radio-group>
      <div class="direction-hint">{{ orderModeHint }}</div>
    </a-form-model-item>

    <a-divider>{{ $t('trading-bot.grid.riskGuardsTitle') }}</a-divider>
    <a-form-model-item :label="$t('trading-bot.grid.boundaryAction')">
      <a-select v-model="form.boundaryAction" style="width: 100%" @change="emit">
        <a-select-option value="pause">{{ $t('trading-bot.grid.boundaryPause') }}</a-select-option>
        <a-select-option value="stop_loss">{{ $t('trading-bot.grid.boundaryStopLoss') }}</a-select-option>
        <a-select-option value="hold">{{ $t('trading-bot.grid.boundaryHold') }}</a-select-option>
      </a-select>
      <div class="direction-hint">{{ $t('trading-bot.grid.boundaryActionHint') }}</div>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.adaptiveBounds')">
      <a-switch v-model="form.adaptiveBounds" @change="emit" />
      <div class="direction-hint">{{ $t('trading-bot.grid.adaptiveBoundsHint') }}</div>
    </a-form-model-item>
    <a-form-model-item
      v-if="form.adaptiveBounds"
      :label="$t('trading-bot.grid.adaptiveAtrMult')"
    >
      <a-input-number
        v-model="form.adaptiveAtrMult"
        :min="0.5"
        :max="5"
        :step="0.1"
        style="width: 100%"
        @change="emit"
      />
      <div class="direction-hint">{{ $t('trading-bot.grid.adaptiveAtrMultHint') }}</div>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.waterfallProtection')">
      <a-switch v-model="form.waterfallProtection" @change="emit" />
      <div class="direction-hint">{{ $t('trading-bot.grid.waterfallProtectionHint') }}</div>
    </a-form-model-item>
    <a-form-model-item
      v-if="form.waterfallProtection"
      :label="$t('trading-bot.grid.waterfallDropPct')"
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
      <div class="direction-hint">{{ $t('trading-bot.grid.waterfallDropPctHint') }}</div>
    </a-form-model-item>
    <div
      class="config-summary"
      v-if="form.upperPrice && form.lowerPrice && form.gridCount"
    >
      <div class="summary-item">
        <span class="label">{{ $t('trading-bot.grid.gridSpacing') }}</span>
        <span class="value">{{ gridSpacing }}</span>
      </div>
      <div class="summary-item">
        <span class="label">{{ $t('trading-bot.grid.totalInvest') }}</span>
        <span class="value">${{ totalInvestment }}</span>
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
  name: 'GridConfig',
  props: {
    value: { type: Object, default: () => ({}) },
    initialCapital: { type: Number, default: null },
    marketType: { type: String, default: 'swap' }
  },
  data () {
    return {
      form: {
        upperPrice: this.value.upperPrice || null,
        lowerPrice: this.value.lowerPrice || null,
        gridCount: this.value.gridCount || 10,
        amountPerGrid: this.value.amountPerGrid || null,
        gridMode: this.value.gridMode || 'arithmetic',
        gridDirection: this.value.gridDirection || 'long',
        initialPositionPct: this.value.initialPositionPct != null ? Number(this.value.initialPositionPct) : 0,
        boundaryAction: this.value.boundaryAction || 'pause',
        orderMode: this.value.orderMode || 'maker',
        adaptiveBounds: this.value.adaptiveBounds !== false,
        adaptiveAtrMult: this.value.adaptiveAtrMult != null ? this.value.adaptiveAtrMult : 2,
        waterfallProtection: this.value.waterfallProtection !== false,
        waterfallDropPct: ratioOrPercentToUiPercent(this.value.waterfallDropPct, 3)
      },
      capitalLinked: !this.value.amountPerGrid,
      rules: {
        upperPrice: [
          { required: true, message: this.$t('trading-bot.grid.upperPriceReq'), trigger: 'change' },
          { validator: this.validateUpperPrice, trigger: 'change' }
        ],
        lowerPrice: [
          { required: true, message: this.$t('trading-bot.grid.lowerPriceReq'), trigger: 'change' },
          { validator: this.validateLowerPrice, trigger: 'change' }
        ],
        gridCount: [{ required: true, message: this.$t('trading-bot.grid.gridCountReq'), trigger: 'change' }],
        amountPerGrid: [
          { required: true, message: this.$t('trading-bot.grid.amountReq'), trigger: 'change' },
          { validator: this.validateAmountPerGrid, trigger: 'change' }
        ],
        initialPositionPct: [{ validator: this.validateInitialPositionPct, trigger: 'change' }]
      }
    }
  },
  watch: {
    initialCapital (val) {
      if (val && val > 0 && this.form.gridCount > 0 && this.capitalLinked) {
        this.form.amountPerGrid = Math.floor(val / this.form.gridCount)
        this.emit()
      }
    },
    'form.gridCount' (val) {
      if (this.initialCapital && this.initialCapital > 0 && val > 0 && this.capitalLinked) {
        this.form.amountPerGrid = Math.floor(this.initialCapital / val)
        this.emit()
      }
    },
    marketType: {
      immediate: true,
      handler (val) {
        if (val === 'spot' && this.form.gridDirection !== 'long') {
          this.form.gridDirection = 'long'
          this.emit()
        }
      }
    },
    value: {
      deep: true,
      handler (val) {
        if (!val || typeof val !== 'object') return
        if (val.waterfallDropPct != null && val.waterfallDropPct !== '') {
          this.form.waterfallDropPct = ratioOrPercentToUiPercent(val.waterfallDropPct, 3)
        }
      }
    }
  },
  computed: {
    isSpotMarket () {
      return this.marketType === 'spot'
    },
    gridSpacing () {
      if (!this.form.upperPrice || !this.form.lowerPrice || !this.form.gridCount) return '-'
      const intervals = Math.max(1, Number(this.form.gridCount) - 1)
      if (this.form.gridMode === 'geometric' && this.form.lowerPrice > 0) {
        const ratio = Math.pow(this.form.upperPrice / this.form.lowerPrice, 1 / intervals)
        return `${((ratio - 1) * 100).toFixed(2)}%`
      }
      const spacing = ((this.form.upperPrice - this.form.lowerPrice) / intervals).toFixed(4)
      return `$${spacing}`
    },
    totalInvestment () {
      if (!this.form.amountPerGrid || !this.form.gridCount) return '0'
      const cells = Math.max(1, Number(this.form.gridCount) - 1)
      return (this.form.amountPerGrid * cells).toLocaleString('en-US', { minimumFractionDigits: 2 })
    },
    directionHint () {
      if (this.isSpotMarket) return 'Spot grid only supports long mode.'
      const map = {
        neutral: this.$t('trading-bot.grid.neutralHint'),
        long: this.$t('trading-bot.grid.longHint'),
        short: this.$t('trading-bot.grid.shortHint')
      }
      return map[this.form.gridDirection] || ''
    },
    orderModeHint () {
      return this.form.orderMode === 'maker'
        ? this.$t('trading-bot.grid.limitOrderHintResting')
        : this.$t('trading-bot.grid.marketOrderHint')
    },
    initialCapitalHint () {
      const pct = Number(this.form.initialPositionPct) || 0
      if (!pct || !this.initialCapital) return ''
      const usdt = (this.initialCapital * pct / 100).toFixed(2)
      return this.$t('trading-bot.grid.initialPositionUsdtHint', { usdt, pct })
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
    handleAmountManualChange () {
      this.capitalLinked = false
      this.emit()
    },
    validateUpperPrice (rule, value, callback) {
      if (value == null || value === '') return callback()
      if (this.form.lowerPrice != null && value <= this.form.lowerPrice) {
        return callback(new Error(this.$t('trading-bot.grid.upperMustGtLower')))
      }
      callback()
    },
    validateLowerPrice (rule, value, callback) {
      if (value == null || value === '') return callback()
      if (this.form.gridMode === 'geometric' && value <= 0) {
        return callback(new Error(this.$t('trading-bot.grid.lowerMustGtZero')))
      }
      if (this.form.upperPrice != null && value >= this.form.upperPrice) {
        return callback(new Error(this.$t('trading-bot.grid.upperMustGtLower')))
      }
      callback()
    },
    validateAmountPerGrid (rule, value, callback) {
      if (value == null || value === '') return callback()
      if (this.initialCapital && this.form.gridCount) {
        const total = value * this.form.gridCount
        if (total > this.initialCapital + 1e-6) {
          return callback(new Error(this.$t('trading-bot.grid.amountExceedsBudget')))
        }
      }
      callback()
    },
    validateInitialPositionPct (rule, value, callback) {
      const n = Number(value)
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return callback(new Error(this.$t('trading-bot.grid.initialPositionPctInvalid')))
      }
      if (this.initialCapital && n > 0) {
        const initUsdt = this.initialCapital * n / 100
        if (this.form.amountPerGrid && initUsdt < this.form.amountPerGrid * 0.5) {
          return callback(new Error(this.$t('trading-bot.grid.initialPositionTooSmall')))
        }
      }
      callback()
    },
    onGridDirectionChange () {
      if (this.form.gridDirection === 'neutral') {
        this.form.initialPositionPct = 0
      }
      this.emit()
    },
    emit () {
      const payload = {
        ...this.form,
        waterfallDropPct: this.form.waterfallProtection
          ? roundTo(Number(this.form.waterfallDropPct || 3), 4) / 100
          : undefined
      }
      if (payload.gridDirection === 'neutral') {
        payload.initialPositionPct = 0
      }
      delete payload.gridExecutionMode
      delete payload.grid_execution_mode
      this.$emit('input', payload)
      this.$emit('change', payload)
    },
    validate () {
      return new Promise((resolve, reject) => {
        this.$refs.form.validate(valid => {
          valid ? resolve(this.form) : reject(new Error('validation failed'))
        })
      })
    }
  }
}
</script>

<style lang="less" scoped>
.direction-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #8c8c8c;
}

.config-summary {
  margin-top: 8px;
  padding: 12px 16px;
  background: rgba(24, 144, 255, 0.04);
  border: 1px dashed rgba(24, 144, 255, 0.3);
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
    background: rgba(24, 144, 255, 0.08);
    border-color: rgba(24, 144, 255, 0.35);

    .summary-item {
      .label { color: rgba(255, 255, 255, 0.45); }
      .value { color: rgba(255, 255, 255, 0.85); }
    }
  }
}

body.dark,
body.realdark {
  .direction-hint {
    color: rgba(255, 255, 255, 0.45);
  }
}
</style>
