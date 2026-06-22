<template>
  <a-form-model
    ref="form"
    :model="form"
    :rules="rules"
    :label-col="{ span: 8 }"
    :wrapper-col="{ span: 14 }"
  >
    <a-form-model-item :label="$t('trading-bot.dca.amountEach')" prop="amountEach">
      <a-input-number
        v-model="form.amountEach"
        :min="1"
        :step="10"
        style="width: 100%"
        :placeholder="$t('trading-bot.dca.amountEachPh')"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.dca.frequency')" prop="frequency">
      <a-select v-model="form.frequency" @change="emit">
        <a-select-option value="every_bar">Every bar</a-select-option>
        <a-select-option value="hourly">{{ $t('trading-bot.dca.hourly') }}</a-select-option>
        <a-select-option value="4h">4H</a-select-option>
        <a-select-option value="daily">{{ $t('trading-bot.dca.daily') }}</a-select-option>
        <a-select-option value="weekly">{{ $t('trading-bot.dca.weekly') }}</a-select-option>
        <a-select-option value="biweekly">{{ $t('trading-bot.dca.biweekly') }}</a-select-option>
        <a-select-option value="monthly">{{ $t('trading-bot.dca.monthly') }}</a-select-option>
      </a-select>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.dca.totalBudget')" prop="totalBudget">
      <a-input-number
        v-model="form.totalBudget"
        :min="0"
        :step="100"
        style="width: 100%"
        :placeholder="$t('trading-bot.dca.totalBudgetPh')"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.dca.dipBuy')">
      <a-switch v-model="form.dipBuyEnabled" @change="emit" />
      <span class="dip-buy-hint">
        {{ $t('trading-bot.dca.dipBuyHint') }}
      </span>
    </a-form-model-item>
    <a-form-model-item
      v-if="form.dipBuyEnabled"
      :label="$t('trading-bot.dca.dipThreshold')"
    >
      <a-input-number
        v-model="form.dipThreshold"
        :min="1"
        :max="50"
        :step="1"
        style="width: 100%"
        :formatter="v => `${v}%`"
        :parser="v => v.replace('%', '')"
        @change="emit"
      />
    </a-form-model-item>
    <div
      class="config-summary"
      v-if="form.amountEach && form.frequency"
    >
      <div class="summary-item">
        <span class="label">{{ $t('trading-bot.dca.estimatedRuns') }}</span>
        <span class="value">{{ estimatedRuns }}</span>
      </div>
    </div>
  </a-form-model>
</template>

<script>
export default {
  name: 'DCAConfig',
  props: {
    value: { type: Object, default: () => ({}) },
    initialCapital: { type: Number, default: null },
    marketType: { type: String, default: 'swap' }
  },
  data () {
    return {
      form: {
        amountEach: this.value.amountEach || null,
        frequency: this.value.frequency || 'daily',
        totalBudget: this.value.totalBudget || null,
        dipBuyEnabled: this.value.dipBuyEnabled || false,
        dipThreshold: this.value.dipThreshold || 5
      },
      capitalLinked: !this.value.totalBudget,
      rules: {
        amountEach: [
          { required: true, message: this.$t('trading-bot.dca.amountEachReq'), trigger: 'change' },
          { validator: this.validateAmountEach, trigger: 'change' }
        ],
        frequency: [{ required: true, message: this.$t('trading-bot.dca.frequencyReq'), trigger: 'change' }]
      }
    }
  },
  watch: {
    initialCapital (val) {
      if (val && val > 0 && this.capitalLinked) {
        this.form.totalBudget = val
        if (!this.form.amountEach || this.form.amountEach <= 0) {
          this.form.amountEach = Math.max(1, Math.round(val / 30))
        }
        this.emit()
      }
    }
  },
  computed: {
    estimatedRuns () {
      if (!this.form.totalBudget || this.form.totalBudget <= 0) return this.$t('trading-bot.dca.unlimited')
      return Math.floor(this.form.totalBudget / this.form.amountEach) + ` ${this.$t('trading-bot.dca.times')}`
    }
  },
  methods: {
    validateAmountEach (rule, value, callback) {
      if (value == null || value === '') return callback()
      if (this.form.totalBudget && this.form.totalBudget > 0 && value > this.form.totalBudget + 1e-6) {
        return callback(new Error(this.$t('trading-bot.dca.amountExceedsBudget')))
      }
      callback()
    },
    emit () {
      this.$emit('input', { ...this.form })
      this.$emit('change', { ...this.form })
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
.dip-buy-hint {
  margin-left: 8px;
  color: #8c8c8c;
  font-size: 12px;
}

.config-summary {
  margin-top: 8px;
  padding: 12px 16px;
  background: rgba(82, 196, 26, 0.04);
  border: 1px dashed rgba(82, 196, 26, 0.3);
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
    background: rgba(82, 196, 26, 0.08);
    border-color: rgba(82, 196, 26, 0.35);

    .summary-item {
      .label { color: rgba(255, 255, 255, 0.45); }
      .value { color: rgba(255, 255, 255, 0.85); }
    }
  }
}
</style>
