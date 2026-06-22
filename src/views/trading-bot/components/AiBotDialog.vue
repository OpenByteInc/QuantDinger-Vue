<template>
  <a-modal
    :visible="visible"
    :title="null"
    :footer="null"
    :width="560"
    :bodyStyle="{ padding: 0 }"
    :maskClosable="false"
    :wrapClassName="isDark ? 'ai-dialog-dark' : ''"
    centered
    @cancel="$emit('close')"
  >
    <div class="ai-dialog">
      <!-- Header -->
      <div class="ai-dialog-header">
        <div class="ai-header-icon">
          <a-icon type="thunderbolt" />
        </div>
        <div class="ai-header-text">
          <h3>{{ $t('trading-bot.ai.dialogTitle') }}</h3>
          <p>{{ $t('trading-bot.ai.dialogDesc') }}</p>
        </div>
      </div>

      <!-- Chat area -->
      <div class="ai-dialog-body">
        <!-- Quick prompts -->
        <div v-if="!result" class="quick-prompts">
          <div class="prompt-label">{{ $t('trading-bot.ai.quickPrompts') }}</div>
          <div class="prompt-chips">
            <span
              v-for="(item, idx) in quickPrompts"
              :key="idx"
              class="prompt-chip"
              @click="userInput = item"
            >{{ item }}</span>
          </div>
        </div>

        <!-- Input section -->
        <div v-if="!result" class="input-section">
          <a-textarea
            v-model="userInput"
            :placeholder="$t('trading-bot.ai.inputPlaceholder')"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            :disabled="loading"
            @pressEnter="handleCtrlEnter"
          />
          <div class="input-footer">
            <span class="input-hint">{{ $t('trading-bot.ai.inputHint') }}</span>
            <a-button
              type="primary"
              :loading="loading"
              :disabled="!userInput.trim()"
              @click="handleGenerate"
            >
              <a-icon type="robot" />
              {{ $t('trading-bot.ai.generate') }}
            </a-button>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="ai-loading">
          <div class="loading-animation">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
          <p>{{ $t('trading-bot.ai.analyzing') }}</p>
        </div>

        <!-- Result -->
        <div v-if="result && !loading" class="ai-result">
          <div class="result-header">
            <a-icon
              type="check-circle"
              theme="filled"
              style="color: #52c41a; font-size: 20px;"
            />
            <span>{{ $t('trading-bot.ai.recommendReady') }}</span>
          </div>

          <!-- Recommended bot type -->
          <div class="result-card">
            <div class="result-row type-row">
              <span class="result-label">{{ $t('trading-bot.ai.recType') }}</span>
              <span class="type-badge" :style="{ background: botGradient }">
                {{ $t('trading-bot.type.' + result.botType) }}
              </span>
            </div>

            <div v-if="result.reason" class="result-reason">
              <a-icon type="bulb" /> {{ result.reason }}
            </div>

            <!-- Base config summary -->
            <div class="result-section">
              <div class="section-title">{{ $t('trading-bot.ai.baseConfig') }}</div>
              <div class="param-grid">
                <div
                  v-for="(val, key) in baseConfigDisplay"
                  :key="key"
                  class="param-item"
                >
                  <span class="param-key">{{ key }}</span>
                  <span class="param-val">{{ val }}</span>
                </div>
              </div>
            </div>

            <!-- Strategy params summary -->
            <div class="result-section">
              <div class="section-title">{{ $t('trading-bot.ai.strategyParams') }}</div>
              <div class="param-grid">
                <div
                  v-for="item in strategyParamsDisplay"
                  :key="item.key"
                  class="param-item"
                >
                  <span class="param-key">{{ item.label }}</span>
                  <span class="param-val">{{ item.value }}</span>
                </div>
              </div>
            </div>

            <!-- Risk config summary -->
            <div v-if="result.riskConfig" class="result-section">
              <div class="section-title">{{ $t('trading-bot.ai.riskConfig') }}</div>
              <div class="param-grid">
                <div
                  v-for="item in riskConfigDisplay"
                  :key="item.key"
                  class="param-item"
                >
                  <span class="param-key">{{ item.label }}</span>
                  <span class="param-val">{{ item.value }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="result-actions">
            <a-button @click="handleRetry">
              <a-icon type="reload" /> {{ $t('trading-bot.ai.retry') }}
            </a-button>
            <a-button
              type="primary"
              size="large"
              @click="handleApply"
            >
              <a-icon type="check" />
              {{ $t('trading-bot.ai.applyAndCreate') }}
            </a-button>
          </div>
        </div>

        <!-- Error state -->
        <div v-if="errorMsg && !loading" class="ai-error">
          <a-alert
            type="error"
            show-icon
            :message="$t('trading-bot.ai.error')"
            :description="errorMsg"
          />
          <a-button
            style="margin-top: 12px;"
            @click="handleRetry"
          >
            <a-icon type="reload" /> {{ $t('trading-bot.ai.retry') }}
          </a-button>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script>
import { aiGenerateStrategy } from '@/api/strategy'

const GRADIENTS = {
  grid: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  martingale: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  trend: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  dca: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
}

export default {
  name: 'AiBotDialog',
  props: {
    visible: { type: Boolean, default: false },
    isDark: { type: Boolean, default: false }
  },
  data () {
    return {
      userInput: '',
      loading: false,
      result: null,
      errorMsg: ''
    }
  },
  computed: {
    quickPrompts () {
      return [
        this.$t('trading-bot.ai.prompt1'),
        this.$t('trading-bot.ai.prompt2'),
        this.$t('trading-bot.ai.prompt3'),
        this.$t('trading-bot.ai.prompt4')
      ]
    },
    botGradient () {
      return this.result ? (GRADIENTS[this.result.botType] || GRADIENTS.grid) : GRADIENTS.grid
    },
    baseConfigDisplay () {
      if (!this.result || !this.result.baseConfig) return {}
      const bc = this.result.baseConfig
      const map = {}
      if (bc.symbol) map[this.$t('trading-bot.wizard.symbol')] = bc.symbol
      if (bc.timeframe) map[this.$t('trading-bot.wizard.timeframe')] = bc.timeframe
      if (bc.marketType) {
        map[this.$t('trading-bot.wizard.marketType')] = bc.marketType === 'swap'
          ? this.$t('trading-bot.wizard.futures')
          : this.$t('trading-bot.wizard.spot')
      }
      if (bc.leverage && bc.marketType === 'swap') {
        map[this.$t('trading-bot.wizard.leverage')] = bc.leverage + 'x'
      }
      if (bc.initialCapital) {
        map[this.$t('trading-bot.wizard.initialCapital')] = '$' + bc.initialCapital
      }
      return map
    },
    strategyParamsDisplay () {
      return this.buildParamDisplay(this.result && this.result.strategyParams, 'strategy')
    },
    riskConfigDisplay () {
      return this.buildParamDisplay(this.result && this.result.riskConfig, 'risk')
    }
  },
  watch: {
    visible (v) {
      if (v) {
        this.userInput = ''
        this.result = null
        this.errorMsg = ''
        this.loading = false
      }
    }
  },
  methods: {
    handleCtrlEnter (e) {
      if (e.ctrlKey || e.metaKey) {
        this.handleGenerate()
      }
    },
    async handleGenerate () {
      if (!this.userInput.trim() || this.loading) return
      this.loading = true
      this.result = null
      this.errorMsg = ''
      try {
        const res = await aiGenerateStrategy({
          prompt: this.userInput.trim(),
          intent: 'bot_recommend'
        })
        const data = res?.data || res
        if (data.bot_recommend && data.msg === 'success') {
          this.result = data.bot_recommend
        } else {
          this.errorMsg = data.msg || this.$t('trading-bot.ai.unknownError')
        }
      } catch (e) {
        this.errorMsg = e?.message || this.$t('trading-bot.ai.networkError')
      } finally {
        this.loading = false
      }
    },
    handleRetry () {
      this.result = null
      this.errorMsg = ''
    },
    handleApply () {
      if (!this.result) return
      this.$emit('apply', this.result)
    },
    text (zh, en) {
      return String(this.$i18n?.locale || '').toLowerCase().startsWith('zh') ? zh : en
    },
    buildParamDisplay (params, scope) {
      if (!params || typeof params !== 'object') return []
      return Object.keys(params)
        .filter(key => !String(key || '').startsWith('_'))
        .map(key => ({
          key,
          label: this.getParamLabel(key, scope),
          value: this.formatParamValue(key, params[key])
        }))
    },
    getParamLabel (key, scope) {
      const map = {
        upperPrice: this.$t('trading-bot.grid.upperPrice'),
        lowerPrice: this.$t('trading-bot.grid.lowerPrice'),
        gridCount: this.$t('trading-bot.grid.gridCount'),
        amountPerGrid: this.$t('trading-bot.grid.amountPerGrid'),
        gridMode: this.$t('trading-bot.grid.mode'),
        gridDirection: this.$t('trading-bot.grid.direction'),
        initialPositionPct: this.$t('trading-bot.grid.initialPositionPct'),
        boundaryAction: this.$t('trading-bot.grid.boundaryAction'),
        adaptiveBounds: this.$t('trading-bot.grid.adaptiveBounds'),
        adaptiveAtrMult: this.$t('trading-bot.grid.adaptiveAtrMult'),
        waterfallProtection: this.$t('trading-bot.grid.waterfallProtection'),
        waterfallDropPct: this.result && this.result.botType === 'martingale'
          ? this.$t('trading-bot.martingale.waterfallDropPct')
          : this.$t('trading-bot.grid.waterfallDropPct'),
        initialAmount: this.text('首单金额（自动计算）', 'First Order Amount (Auto)'),
        multiplier: this.$t('trading-bot.martingale.multiplier'),
        maxLayers: this.$t('trading-bot.martingale.maxLayers'),
        priceDropPct: this.text('加仓触发跌幅', 'Add-on Trigger Move %'),
        takeProfitPct: scope === 'risk'
          ? this.text('止盈比例', 'Take Profit %')
          : this.text('相对持仓均价止盈%', 'Take Profit vs Avg Entry %'),
        stopLossPct: scope === 'risk'
          ? this.text('止损比例', 'Stop Loss %')
          : this.text('相对持仓均价止损%', 'Stop Loss vs Avg Entry %'),
        direction: this.text('交易方向', 'Direction'),
        maPeriod: this.$t('trading-bot.trend.maPeriod'),
        maType: this.$t('trading-bot.trend.maType'),
        confirmBars: this.$t('trading-bot.trend.confirmBars'),
        positionPct: this.$t('trading-bot.trend.positionPct'),
        trailingTpEnabled: this.text('启用追踪止盈', 'Trailing TP'),
        trailingTpActivationPct: this.text('追踪止盈激活涨幅', 'Trailing TP Activation %'),
        trailingTpCallbackPct: this.text('追踪止盈回撤幅度', 'Trailing TP Callback %'),
        amountEach: this.$t('trading-bot.dca.amountEach'),
        frequency: this.$t('trading-bot.dca.frequency'),
        totalBudget: this.$t('trading-bot.dca.totalBudget'),
        dipBuyEnabled: this.$t('trading-bot.dca.dipBuy'),
        dipThreshold: this.$t('trading-bot.dca.dipThreshold'),
        maxPosition: this.text('最大仓位', 'Max Position')
      }
      return map[key] || key
    },
    formatParamValue (key, value) {
      if (value == null || value === '') return '-'
      if (typeof value === 'boolean') return value ? this.text('开启', 'Enabled') : this.text('关闭', 'Disabled')
      if (key === 'gridMode') {
        const map = {
          arithmetic: this.$t('trading-bot.grid.arithmetic'),
          geometric: this.$t('trading-bot.grid.geometric')
        }
        return map[value] || value
      }
      if (key === 'gridDirection') {
        const map = {
          neutral: this.$t('trading-bot.grid.neutral'),
          long: this.$t('trading-bot.grid.long'),
          short: this.$t('trading-bot.grid.short')
        }
        return map[value] || value
      }
      if (key === 'direction') {
        const map = {
          long: this.text('做多', 'Long'),
          short: this.text('做空', 'Short'),
          both: this.text('双向', 'Both')
        }
        return map[value] || value
      }
      if (key === 'boundaryAction') {
        const map = {
          pause: this.$t('trading-bot.grid.boundaryPause'),
          stop_loss: this.$t('trading-bot.grid.boundaryStopLoss'),
          hold: this.$t('trading-bot.grid.boundaryHold')
        }
        return map[value] || value
      }
      if (key === 'frequency') {
        const map = {
          every_bar: this.text('每根K线', 'Every Bar'),
          hourly: this.$t('trading-bot.dca.hourly'),
          '4h': '4H',
          daily: this.$t('trading-bot.dca.daily'),
          weekly: this.$t('trading-bot.dca.weekly'),
          biweekly: this.$t('trading-bot.dca.biweekly'),
          monthly: this.$t('trading-bot.dca.monthly')
        }
        return map[value] || value
      }
      if (key === 'waterfallDropPct') {
        const n = Number(value)
        if (!Number.isFinite(n)) return value
        return `${(n <= 1 ? n * 100 : n).toFixed(2).replace(/\.00$/, '')}%`
      }
      if (['priceDropPct', 'takeProfitPct', 'stopLossPct', 'dipThreshold', 'positionPct',
        'trailingTpActivationPct', 'trailingTpCallbackPct', 'initialPositionPct'].includes(key)) {
        return `${value}%`
      }
      return value
    }
  }
}
</script>

<style lang="less" scoped>
.ai-dialog {
  overflow: hidden;
}

.ai-dialog-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 24px 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.06), rgba(118, 75, 162, 0.06));
  border-bottom: 1px solid #f0f0f0;
}

.ai-header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #fff;
  flex-shrink: 0;
}

.ai-header-text {
  flex: 1;

  h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #262626;
  }

  p {
    margin: 2px 0 0;
    font-size: 13px;
    color: #8c8c8c;
  }
}

.ai-dialog-body {
  padding: 20px 24px 24px;
  min-height: 200px;
}

.quick-prompts {
  margin-bottom: 16px;

  .prompt-label {
    font-size: 12px;
    color: #8c8c8c;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.prompt-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.prompt-chip {
  padding: 6px 14px;
  border-radius: 20px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  font-size: 13px;
  color: #595959;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(102, 126, 234, 0.08);
    border-color: #667eea;
    color: #667eea;
  }
}

.input-section {
  .ant-input {
    border-radius: 10px;
    border-color: #d9d9d9;
    font-size: 14px;
    padding: 10px 14px;

    &:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15);
    }
  }
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;

  .input-hint {
    font-size: 12px;
    color: #bfbfbf;
  }

  .ant-btn-primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border: none;
    border-radius: 8px;
    height: 36px;
    font-weight: 600;

    &:hover {
      opacity: 0.9;
    }
  }
}

.ai-loading {
  text-align: center;
  padding: 40px 0;

  p {
    margin-top: 16px;
    color: #8c8c8c;
    font-size: 14px;
  }
}

.loading-animation {
  display: flex;
  justify-content: center;
  gap: 6px;

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea, #764ba2);
    animation: ai-bounce 1.4s infinite ease-in-out both;

    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }
}

@keyframes ai-bounce {
  0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.ai-result {
  animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 16px;
}

.result-card {
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 16px;
  background: #fafafa;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 10px;

  .result-label {
    font-size: 13px;
    color: #8c8c8c;
  }
}

.type-row {
  margin-bottom: 12px;
}

.type-badge {
  display: inline-block;
  padding: 3px 14px;
  border-radius: 20px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.result-reason {
  padding: 10px 12px;
  background: rgba(102, 126, 234, 0.06);
  border-radius: 8px;
  font-size: 13px;
  color: #595959;
  margin-bottom: 14px;
  line-height: 1.5;

  .anticon {
    color: #764ba2;
    margin-right: 6px;
  }
}

.result-section {
  margin-top: 12px;

  .section-title {
    font-size: 12px;
    font-weight: 600;
    color: #8c8c8c;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
}

.param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px 16px;
}

.param-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;

  .param-key {
    font-size: 13px;
    color: #8c8c8c;
  }

  .param-val {
    font-size: 13px;
    font-weight: 600;
    color: #262626;
    font-variant-numeric: tabular-nums;
  }
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;

  .ant-btn-primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border: none;
    border-radius: 8px;
    height: 40px;
    font-weight: 600;
    padding: 0 24px;

    &:hover { opacity: 0.9; }
  }
}

.ai-error {
  padding: 20px 0;
}
</style>

<style lang="less">
.ai-dialog-dark {
  .ant-modal-content {
    background: #1f1f1f;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  }

  .ant-modal-close-x {
    color: rgba(255, 255, 255, 0.45);
  }

  .ai-dialog-header {
    background: rgba(102, 126, 234, 0.1);
    border-bottom-color: #303030;

    .ai-header-text h3 {
      color: rgba(255, 255, 255, 0.85);
    }

    .ai-header-text p {
      color: rgba(255, 255, 255, 0.45);
    }
  }

  .ai-dialog-body {
    background: #1f1f1f;
  }

  .prompt-label {
    color: rgba(255, 255, 255, 0.45) !important;
  }

  .prompt-chip {
    background: #2a2a2a;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.65);

    &:hover {
      background: rgba(102, 126, 234, 0.15);
      border-color: #667eea;
      color: #a0b4ff;
    }
  }

  .input-section .ant-input {
    background: #2a2a2a !important;
    border-color: #434343 !important;
    color: rgba(255, 255, 255, 0.85) !important;

    &::placeholder {
      color: rgba(255, 255, 255, 0.3) !important;
    }

    &:focus {
      border-color: #667eea !important;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2) !important;
    }
  }

  .input-hint {
    color: rgba(255, 255, 255, 0.25) !important;
  }

  .ai-loading p {
    color: rgba(255, 255, 255, 0.45);
  }

  .result-header {
    color: rgba(255, 255, 255, 0.85);
  }

  .result-card {
    background: #2a2a2a;
    border-color: #434343;
  }

  .result-label {
    color: rgba(255, 255, 255, 0.45) !important;
  }

  .result-reason {
    background: rgba(102, 126, 234, 0.1);
    color: rgba(255, 255, 255, 0.65);
  }

  .section-title {
    color: rgba(255, 255, 255, 0.45) !important;
  }

  .param-key {
    color: rgba(255, 255, 255, 0.45) !important;
  }

  .param-val {
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .result-actions {
    .ant-btn:not(.ant-btn-primary) {
      background: #2a2a2a;
      border-color: #434343;
      color: rgba(255, 255, 255, 0.65);

      &:hover {
        border-color: #667eea;
        color: #a0b4ff;
      }
    }
  }

  .ai-error {
    .ant-alert-error {
      background: rgba(245, 34, 45, 0.08);
      border-color: rgba(245, 34, 45, 0.2);
    }

    .ant-alert-message {
      color: rgba(255, 255, 255, 0.85);
    }

    .ant-alert-description {
      color: rgba(255, 255, 255, 0.65);
    }
  }
}
</style>
