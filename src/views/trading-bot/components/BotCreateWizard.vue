<template>
  <div class="bot-create-wizard" :class="{ 'is-modal': isModal }">
    <div class="wizard-header">
      <h3 class="wizard-title">
        <span class="type-badge" :style="{ background: typeInfo.gradient }">
          <a-icon :type="typeInfo.icon" />
        </span>
        {{ isEditMode ? $t('trading-bot.wizard.editTitle', { type: typeInfo.name }) : $t('trading-bot.wizard.createTitle', { type: typeInfo.name }) }}
        <span v-if="aiPreset" class="ai-badge">
          <a-icon type="thunderbolt" /> AI
        </span>
      </h3>
      <div v-if="aiPreset && aiPreset.reason" class="ai-reason-bar">
        <a-icon type="bulb" />
        {{ aiPreset.reason }}
      </div>
    </div>

    <a-steps :current="currentStep" class="wizard-steps" size="small">
      <a-step :title="$t('trading-bot.wizard.step1')" />
      <a-step :title="$t('trading-bot.wizard.step2')" />
      <a-step :title="$t('trading-bot.wizard.step3')" />
      <a-step :title="$t('trading-bot.wizard.step4')" />
    </a-steps>

    <div ref="wizardContent" class="wizard-content">
      <div v-show="currentStep === 0" class="step-panel">
        <a-form-model
          ref="baseForm"
          :model="baseForm"
          :rules="baseRules"
          :label-col="{ span: 6 }"
          :wrapper-col="{ span: 16 }"
        >
          <a-form-model-item ref="fieldBotName" :label="$t('trading-bot.wizard.botName')" prop="botName">
            <a-input
              v-model="baseForm.botName"
              :placeholder="$t('trading-bot.wizard.botNamePh')"
            />
          </a-form-model-item>

          <a-form-model-item ref="fieldMarketCategory" :label="$t('trading-bot.wizard.marketCategory')" prop="marketCategory">
            <a-radio-group v-model="baseForm.marketCategory" @change="handleMarketCategoryChange">
              <a-tooltip
                v-for="opt in marketCategoryOptions"
                :key="opt.value"
                :title="opt.supported ? '' : opt.disabledReason"
                placement="top"
              >
                <a-radio-button
                  :value="opt.value"
                  :disabled="!opt.supported"
                >
                  {{ opt.label }}
                </a-radio-button>
              </a-tooltip>
            </a-radio-group>
            <div class="form-hint" style="margin-top: 6px;">
              <a-icon type="info-circle" /> {{ $t('trading-bot.wizard.marketCategoryHint') }}
            </div>
            <div
              v-if="!isBotTypeSupportedOnCurrentMarket"
              class="form-hint"
              style="margin-top: 6px; color: #ff9800;">
              {{ $t('trading-bot.wizard.botTypeNotSupportedOnMarket', { market: currentMarketLabel }) }}
            </div>
          </a-form-model-item>

          <a-form-model-item :label="$t('trading-bot.wizard.marketType')">
            <template v-if="shouldShowMarketTypeSelector">
              <a-radio-group v-model="baseForm.marketType" :disabled="!swapAvailableForCurrentSelection && !spotAvailableForCurrentSelection">
              <a-radio value="swap" :disabled="!swapAvailableForCurrentSelection">{{ $t('trading-bot.wizard.futures') }}</a-radio>
              <a-radio value="spot" :disabled="!spotAvailableForCurrentSelection">{{ $t('trading-bot.wizard.spot') }}</a-radio>
              </a-radio-group>
            </template>
            <template v-else>
              <a-tag color="cyan">{{ $t('trading-bot.wizard.spot') }}</a-tag>
            </template>
            <div v-if="marketTypeHint" class="form-hint" style="margin-top: 6px; color: #8c8c8c;">
              {{ marketTypeHint }}
            </div>
          </a-form-model-item>

          <a-form-model-item
            v-if="baseForm.marketType === 'swap'"
            :label="$t('trading-bot.wizard.leverage')"
          >
            <a-input-number
              v-model="baseForm.leverage"
              :min="1"
              :max="125"
              :step="1"
              style="width: 100%"
            />
          </a-form-model-item>

          <a-form-model-item ref="fieldInitialCapital" class="capital-form-item" :label="capitalLabel" prop="initialCapital">
            <a-input-number
              v-model="baseForm.initialCapital"
              :min="10"
              :max="1000000"
              :step="100"
              style="width: 100%"
              placeholder="USDT"
            />
            <div v-if="botType === 'martingale'" class="form-hint">{{ martingaleBudgetHint }}</div>
          </a-form-model-item>

          <a-form-model-item ref="fieldCredentialId" :label="$t('trading-bot.wizard.savedCredential')" prop="credentialId">
            <a-select
              v-model="baseForm.credentialId"
              :placeholder="$t('trading-bot.wizard.selectCredential')"
              :loading="loadingCredentials"
              allow-clear
              show-search
              option-filter-prop="children"
              @change="handleCredentialChange"
            >
              <a-select-option
                v-for="cred in credentials"
                :key="cred.id"
                :value="cred.id"
              >
                {{ formatCredentialOptionLabel(cred) }}
              </a-select-option>
            </a-select>
            <div class="form-hint" style="margin-top: 6px;">
              <router-link to="/broker-accounts">
                <a-icon type="setting" /> {{ $t('trading-bot.wizard.manageCredentials') }}
              </router-link>
            </div>
          </a-form-model-item>

          <a-form-model-item ref="fieldSymbol" :label="$t('trading-bot.wizard.symbol')" prop="symbol">
            <a-select
              v-model="selectedSymbolKey"
              :placeholder="watchlistPlaceholder"
              :loading="loadingWatchlist"
              show-search
              allow-clear
              option-label-prop="label"
              :filter-option="filterSymbolOption"
              :not-found-content="loadingWatchlist ? undefined : watchlistEmptyText"
              :dropdown-class-name="isDarkTheme ? 'bot-symbol-dropdown bot-symbol-dropdown--dark' : 'bot-symbol-dropdown'"
              :get-popup-container="symbolSelectGetPopupContainer"
              @change="handleSymbolChange"
            >
              <a-select-option
                v-for="w in marketWatchlist"
                :key="w.symbol"
                :value="w.symbol"
                :label="w.symbol"
              >
                <strong class="bot-symbol-opt-code">{{ w.symbol }}</strong>
                <span v-if="w.name && w.name !== w.symbol" class="bot-symbol-opt-name">{{ w.name }}</span>
              </a-select-option>
              <a-select-option
                v-if="legacySymbolOption"
                :key="'__current__:' + legacySymbolOption.symbol"
                :value="legacySymbolOption.symbol"
                :label="legacySymbolOption.symbol"
                class="bot-symbol-opt-legacy"
              >
                <strong class="bot-symbol-opt-code">{{ legacySymbolOption.symbol }}</strong>
                <a-tag color="orange" class="bot-symbol-opt-tag">{{ $t('trading-bot.wizard.symbolNotInWatchlist') }}</a-tag>
              </a-select-option>
              <a-select-option
                key="__add__"
                value="__add__"
                :label="$t('trading-bot.wizard.addSymbol')"
                class="bot-symbol-opt-add"
              >
                <a-icon type="plus" /> {{ $t('trading-bot.wizard.addSymbol') }}
              </a-select-option>
            </a-select>
            <div class="form-hint" style="margin-top: 6px;">
              <a-icon type="info-circle" /> {{ watchlistHint }}
              <a v-if="watchlist.length > 0" class="bot-symbol-refresh" @click="loadWatchlist">
                <a-icon type="reload" :spin="loadingWatchlist" /> {{ $t('trading-bot.wizard.refreshWatchlist') }}
              </a>
            </div>
          </a-form-model-item>

          <a-form-model-item v-if="needsTimeframe" :label="$t('trading-bot.wizard.timeframe')">
            <a-select v-model="baseForm.timeframe">
              <a-select-option value="1m">1 {{ $t('trading-bot.timeframe.min') }}</a-select-option>
              <a-select-option value="5m">5 {{ $t('trading-bot.timeframe.min') }}</a-select-option>
              <a-select-option value="15m">15 {{ $t('trading-bot.timeframe.min') }}</a-select-option>
              <a-select-option value="1h">1 {{ $t('trading-bot.timeframe.hour') }}</a-select-option>
              <a-select-option value="4h">4 {{ $t('trading-bot.timeframe.hour') }}</a-select-option>
              <a-select-option value="1d">1 {{ $t('trading-bot.timeframe.day') }}</a-select-option>
            </a-select>
          </a-form-model-item>

        </a-form-model>
      </div>

      <div v-show="currentStep === 1" class="step-panel">
        <div class="step-hint">
          <a-icon type="info-circle" /> {{ typeInfo.configHint }}
        </div>
        <component
          :is="configComponent"
          ref="strategyConfig"
          v-model="strategyParams"
          :initialCapital="baseForm.initialCapital"
          :marketType="baseForm.marketType"
        />
      </div>

      <div v-show="currentStep === 2" class="step-panel">
        <a-form-model
          ref="riskForm"
          :model="riskForm"
          :label-col="{ span: 8 }"
          :wrapper-col="{ span: 14 }"
        >
          <template v-if="botType !== 'martingale'">
            <a-alert
              v-if="isGridLikeBot"
              type="info"
              show-icon
              style="margin-bottom: 16px;"
              :message="gridRiskTitle"
              :description="gridRiskDesc"
            />
            <a-form-model-item :label="gridLikeStopLossLabel">
              <a-input-number
                v-model="riskForm.stopLossPct"
                :min="0"
                :max="100"
                :step="0.01"
                :precision="4"
                style="width: 100%"
                :formatter="v => `${v}%`"
                :parser="v => v.replace('%', '')"
              />
              <div class="form-hint">{{ stopLossHint }}</div>
            </a-form-model-item>
            <a-form-model-item :label="gridLikeTakeProfitLabel">
              <a-input-number
                v-model="riskForm.takeProfitPct"
                :min="0"
                :max="1000"
                :step="0.01"
                :precision="4"
                style="width: 100%"
                :formatter="v => `${v}%`"
                :parser="v => v.replace('%', '')"
              />
              <div class="form-hint">{{ takeProfitHint }}</div>
            </a-form-model-item>
            <a-form-model-item
              v-if="isGridLikeBot"
              :label="$t('trading-bot.risk.gridOobBufferPct')"
            >
              <a-input-number
                v-model="riskForm.gridOobBufferPct"
                :min="0"
                :max="50"
                :step="0.5"
                :precision="2"
                style="width: 100%"
                :formatter="v => `${v}%`"
                :parser="v => v.replace('%', '')"
              />
              <div class="form-hint">{{ gridOobBufferHint }}</div>
            </a-form-model-item>
            <a-form-model-item :label="$t('trading-bot.risk.maxPosition')">
              <a-input-number
                v-model="riskForm.maxPosition"
                :min="0"
                :step="100"
                style="width: 100%"
                placeholder="USDT"
              />
              <div class="form-hint">{{ maxPositionHint }}</div>
            </a-form-model-item>
          </template>
          <template v-else>
            <a-alert
              type="info"
              show-icon
              style="margin-bottom: 16px;"
              :message="martingaleRiskTitle"
              :description="martingaleRiskDesc"
            />
          </template>
          <a-form-model-item :label="dailyLossLabel">
            <a-input-number
              v-model="riskForm.maxDailyLoss"
              :min="0"
              :step="10"
              style="width: 100%"
              placeholder="USDT"
            />
            <div class="form-hint">{{ dailyLossHint }}</div>
          </a-form-model-item>
        </a-form-model>
      </div>

      <div v-show="currentStep === 3" class="step-panel">
        <div class="confirm-section">
          <h4>{{ $t('trading-bot.wizard.confirmTitle') }}</h4>
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item :label="$t('trading-bot.wizard.botName')">
              {{ baseForm.botName }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('trading-bot.wizard.botType')">
              {{ typeInfo.name }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('trading-bot.wizard.savedCredential')">
              {{ selectedCredentialLabel }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('trading-bot.wizard.symbol')">
              {{ baseForm.symbol }}
            </a-descriptions-item>
            <a-descriptions-item v-if="needsTimeframe" :label="$t('trading-bot.wizard.timeframe')">
              {{ baseForm.timeframe }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('trading-bot.wizard.marketType')">
              {{ baseForm.marketType === 'swap' ? $t('trading-bot.wizard.futures') : $t('trading-bot.wizard.spot') }}
            </a-descriptions-item>
            <a-descriptions-item
              v-if="baseForm.marketType === 'swap'"
              :label="$t('trading-bot.wizard.leverage')"
            >
              {{ baseForm.leverage }}x
            </a-descriptions-item>
            <a-descriptions-item :label="capitalLabel">
              ${{ baseForm.initialCapital }}
            </a-descriptions-item>
          </a-descriptions>

          <h4 style="margin-top: 20px;">{{ $t('trading-bot.wizard.strategyParams') }}</h4>
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item
              v-for="item in strategyParamDisplayItems"
              :key="item.key"
              :label="item.label"
            >
              {{ item.value }}
            </a-descriptions-item>
          </a-descriptions>

          <h4 style="margin-top: 20px;">{{ $t('trading-bot.wizard.riskParams') }}</h4>
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item v-if="botType !== 'martingale'" :label="gridLikeStopLossLabel">
              {{ riskForm.stopLossPct }}%
            </a-descriptions-item>
            <a-descriptions-item v-if="botType !== 'martingale'" :label="gridLikeTakeProfitLabel">
              {{ riskForm.takeProfitPct }}%
            </a-descriptions-item>
            <a-descriptions-item v-if="isGridLikeBot" :label="$t('trading-bot.risk.gridOobBufferPct')">
              {{ riskForm.gridOobBufferPct }}%
            </a-descriptions-item>
            <a-descriptions-item v-if="botType !== 'martingale'" :label="$t('trading-bot.risk.maxPosition')">
              ${{ riskForm.maxPosition }}
            </a-descriptions-item>
            <a-descriptions-item :label="dailyLossLabel">
              ${{ riskForm.maxDailyLoss }}
            </a-descriptions-item>
          </a-descriptions>

          <a-alert
            type="warning"
            show-icon
            style="margin-top: 16px;"
            :message="$t('trading-bot.wizard.liveWarning')"
            :description="$t('trading-bot.wizard.liveWarningDesc')"
          />
        </div>
      </div>
    </div>

    <div class="wizard-footer">
      <a-button v-if="currentStep > 0" @click="prevStep">
        <a-icon type="left" /> {{ $t('trading-bot.wizard.prev') }}
      </a-button>
      <div class="spacer"></div>
      <a-button
        v-if="currentStep < 3"
        type="primary"
        :loading="validatingNext"
        @click="nextStep"
      >
        {{ $t('trading-bot.wizard.next') }} <a-icon type="right" />
      </a-button>
      <a-button
        v-else
        type="primary"
        :loading="creating"
        @click="handleSubmit"
      >
        <a-icon :type="isEditMode ? 'save' : 'rocket'" />
        {{ isEditMode ? $t('trading-bot.wizard.save') : $t('trading-bot.wizard.create') }}
      </a-button>
    </div>

    <!-- Add-to-watchlist modal. Operates on the current marketCategory so
         the same dialog can add a US stock (TSLA) or a forex pair (EURUSD)
         when the wizard is configured for those markets. -->
    <a-modal
      :title="$t('trading-bot.wizard.addSymbolTitle')"
      :visible="showAddSymbolModal"
      :confirmLoading="addingSymbol"
      width="520px"
      :ok-button-props="{ props: { disabled: !addSelectedItem } }"
      :get-container="addSymbolModalGetContainer"
      @ok="handleAddSymbol"
      @cancel="closeAddSymbolModal"
    >
      <div class="bot-add-symbol-hint">
        <a-icon type="info-circle" /> {{ $t('trading-bot.wizard.addSymbolHint') }}
      </div>
      <a-input-search
        v-model="addSearchKeyword"
        :placeholder="$t('trading-bot.wizard.symbolSearchPh')"
        :loading="addSearching"
        size="large"
        allow-clear
        style="margin: 12px 0;"
        @search="doAddSymbolSearch"
        @change="onAddSymbolSearchInput"
      />
      <a-list
        v-if="addSearchResults.length > 0"
        size="small"
        :data-source="addSearchResults"
        style="max-height: 260px; overflow-y: auto;"
      >
        <a-list-item
          slot="renderItem"
          slot-scope="item"
          style="cursor: pointer;"
          :class="{ 'bot-add-item-active': addSelectedItem && addSelectedItem.symbol === item.symbol }"
          @click="addSelectedItem = item"
        >
          <strong>{{ item.symbol }}</strong>
          <span v-if="item.name" style="color: #999; margin-left: 8px;">{{ item.name }}</span>
          <a-icon
            v-if="addSelectedItem && addSelectedItem.symbol === item.symbol"
            type="check-circle"
            theme="filled"
            style="color: #52c41a; margin-left: auto;"
          />
        </a-list-item>
      </a-list>
      <div
        v-else-if="addSearched && addSearchKeyword"
        class="bot-add-symbol-empty"
      >
        {{ $t('trading-bot.wizard.symbolNoResult') }}
      </div>
    </a-modal>
  </div>
</template>

<script>
import request from '@/utils/request'
import { mapGetters } from 'vuex'
import { createStrategy, updateStrategy } from '@/api/strategy'
import { listExchangeCredentials } from '@/api/credentials'
import { formatExchangeCredentialLabel } from '@/utils/exchangeCredential'
import { getWatchlist, addWatchlist, searchSymbols } from '@/api/market'
import { generateBotScript } from './botScriptTemplates'
import GridConfig from './configs/GridConfig.vue'
import MartingaleConfig from './configs/MartingaleConfig.vue'
import TrendConfig from './configs/TrendConfig.vue'
import DCAConfig from './configs/DCAConfig.vue'
import { formatPercentDisplay, ratioOrPercentToUiPercent } from '@/utils/numberFormat'

const BOT_TYPE_MAP = {
  grid: {
    icon: 'bar-chart',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    component: 'GridConfig'
  },
  martingale: {
    icon: 'fall',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    component: 'MartingaleConfig'
  },
  trend: {
    icon: 'stock',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    component: 'TrendConfig'
  },
  dca: {
    icon: 'fund',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    component: 'DCAConfig'
  }
}

// All knowledge about which broker can serve which market lives in the
// backend `app/services/broker_market_policy.py` and is fetched at boot
// into the `policy` Vuex store. We read it via the `brokerMarketPolicy`
// getter below; nothing about broker -> market compatibility is hard-coded
// in this component anymore.

export default {
  name: 'BotCreateWizard',
  components: { GridConfig, MartingaleConfig, TrendConfig, DCAConfig },
  props: {
    botType: { type: String, required: true },
    aiPreset: { type: Object, default: null },
    editBot: { type: Object, default: null },
    isModal: { type: Boolean, default: false }
  },
  data () {
    return {
      currentStep: 0,
      creating: false,
      validatingNext: false,
      loadingCredentials: false,
      // Raw list returned from the API (every credential the user has).
      // We keep this around so switching market_category can re-filter
      // without re-fetching from the backend.
      credentialsRaw: [],
      // Filtered list shown in the dropdown (matches the current market).
      credentials: [],
      currentExchangeId: '',
      baseForm: {
        botName: '',
        credentialId: undefined,
        marketCategory: 'Crypto',
        symbol: '',
        timeframe: '1h',
        marketType: 'swap',
        leverage: 5,
        initialCapital: null
      },
      baseRules: {
        botName: [{ required: true, message: this.$t('trading-bot.wizard.botNameReq'), trigger: 'blur' }],
        marketCategory: [{ required: true, message: this.$t('trading-bot.wizard.marketCategory'), trigger: 'change' }],
        credentialId: [{ required: true, message: this.$t('trading-bot.wizard.credentialReq'), trigger: 'change' }],
        symbol: [{ required: true, message: this.$t('trading-bot.wizard.symbolReq'), trigger: 'change' }],
        initialCapital: [{ required: true, type: 'number', min: 10, max: 1000000, message: this.$t('trading-bot.wizard.capitalReq'), trigger: 'change' }]
      },
      strategyParams: {},
      riskForm: {
        stopLossPct: 10,
        takeProfitPct: 20,
        maxPosition: 5000,
        maxDailyLoss: 500,
        // grid-bot-only (P0-2 / P1-2):
        gridOobBufferPct: 5
      },
      watchlist: [],
      loadingWatchlist: false,
      selectedSymbolKey: undefined,
      showAddSymbolModal: false,
      addSearchKeyword: '',
      addSearchResults: [],
      addSelectedItem: null,
      addSearching: false,
      addSearched: false,
      addingSymbol: false,
      addSearchTimer: null
    }
  },
  computed: {
    ...mapGetters(['userInfo', 'theme', 'brokerMarketPolicy']),
    userId () {
      const info = this.userInfo || {}
      return info.id || info.user_id || null
    },
    isDarkTheme () {
      return String(this.theme || '').toLowerCase() === 'dark'
    },
    // ----- market category plumbing (Crypto / USStock / Forex) -----
    // Bots-on-market matrix from backend (broker_market_policy.BOT_TYPE_MARKETS).
    botTypeMarkets () {
      return (this.brokerMarketPolicy && this.brokerMarketPolicy.bot_type_markets) || {}
    },
    // Markets the *current* bot type can actually run on. Used to grey out
    // unsupported market radios so the user sees the constraint visually.
    supportedMarketsForBot () {
      const list = this.botTypeMarkets[this.botType] || ['Crypto']
      return new Set(list)
    },
    isBotTypeSupportedOnCurrentMarket () {
      return this.supportedMarketsForBot.has(this.baseForm.marketCategory)
    },
    marketCategoryOptions () {
      const live = (this.brokerMarketPolicy && this.brokerMarketPolicy.live_market_categories) || ['Crypto', 'USStock', 'Forex']
      const labelMap = {
        Crypto: this.$t('trading-bot.wizard.marketCrypto'),
        USStock: this.$t('trading-bot.wizard.marketUSStock'),
        Forex: this.$t('trading-bot.wizard.marketForex')
      }
      // Bot types that *do* support each market — used to suggest a fix in
      // the disabled-tooltip ("change to DCA / Trend if you want US stocks").
      const matrix = this.botTypeMarkets || {}
      const altBotsByMarket = {}
      Object.keys(matrix).forEach(bt => {
        ;(matrix[bt] || []).forEach(m => {
          if (!altBotsByMarket[m]) altBotsByMarket[m] = []
          if (bt !== this.botType) altBotsByMarket[m].push(bt)
        })
      })
      const labelBot = (bt) => {
        const k = `trading-bot.wizard.botType.${bt}`
        const tx = this.$t(k)
        return tx === k ? bt : tx
      }
      return live.map(value => {
        const supported = this.supportedMarketsForBot.has(value)
        let disabledReason = ''
        if (!supported) {
          const alts = (altBotsByMarket[value] || []).map(labelBot).join(' / ')
          disabledReason = alts
            ? this.$t('trading-bot.wizard.marketDisabledForBot', {
                market: labelMap[value] || value,
                alts
              })
            : this.$t('trading-bot.wizard.botTypeNotSupportedOnMarket', {
                market: labelMap[value] || value
              })
        }
        return {
          value,
          label: labelMap[value] || value,
          supported,
          disabledReason
        }
      })
    },
    currentMarketLabel () {
      const opt = this.marketCategoryOptions.find(o => o.value === this.baseForm.marketCategory)
      return opt ? opt.label : this.baseForm.marketCategory
    },
    // ----- credential filtering -----
    // Brokers that can serve the currently selected market_category.
    eligibleExchangeIdsForMarket () {
      const matrix = (this.brokerMarketPolicy && this.brokerMarketPolicy.broker_markets) || {}
      const cat = this.baseForm.marketCategory
      const out = new Set()
      Object.keys(matrix).forEach(broker => {
        if (matrix[broker] && Object.prototype.hasOwnProperty.call(matrix[broker], cat)) {
          out.add(String(broker).toLowerCase())
        }
      })
      return out
    },
    // ----- market_type plumbing -----
    // For the (broker, market) the user has currently selected, which
    // market_types are valid?  We use it to disable spot / swap radios.
    allowedMarketTypesForCurrentSelection () {
      const matrix = (this.brokerMarketPolicy && this.brokerMarketPolicy.broker_markets) || {}
      const cat = this.baseForm.marketCategory
      const ex = (this.currentExchangeId || '').toLowerCase()
      // No broker yet: fall back to "what does the market itself support".
      if (!ex) {
        const aggregate = new Set()
        Object.keys(matrix).forEach(b => {
          const list = (matrix[b] || {})[cat] || []
          list.forEach(t => aggregate.add(t))
        })
        return aggregate
      }
      const list = (matrix[ex] || {})[cat] || []
      return new Set(list)
    },
    spotAvailableForCurrentSelection () {
      return this.allowedMarketTypesForCurrentSelection.has('spot')
    },
    swapAvailableForCurrentSelection () {
      return this.allowedMarketTypesForCurrentSelection.has('swap')
    },
    isStockMarketCategory () {
      return ['usstock', 'cnstock', 'hkstock'].includes(String(this.baseForm.marketCategory || '').toLowerCase())
    },
    shouldShowMarketTypeSelector () {
      return !this.isStockMarketCategory
    },
    marketTypeHint () {
      if (this.isStockMarketCategory) {
        return this.isZhLocale
          ? '股票类标的默认按现货/现金账户处理，不显示合约类型。'
          : 'Stock instruments are treated as spot/cash products. Contract type is hidden.'
      }
      if (!this.swapAvailableForCurrentSelection && this.spotAvailableForCurrentSelection) {
        return this.isZhLocale
          ? '当前市场/券商组合仅支持现货。'
          : 'This market / broker combination is spot-only.'
      }
      return ''
    },
    // ----- watchlist filtering -----
    // Filter the user watchlist down to entries that match the currently
    // selected market category. The watchlist API stores 'Crypto', 'USStock',
    // 'Forex' (and other analysis-only markets) all in one bucket.
    marketWatchlist () {
      const target = String(this.baseForm.marketCategory || '').toLowerCase()
      return (this.watchlist || []).filter(
        w => w && w.symbol && String(w.market || '').toLowerCase() === target
      )
    },
    // When baseForm.symbol isn't in the user's watchlist (e.g. editing an
    // existing bot or applying an AI preset), show it as a "Not in watchlist"
    // pseudo-option instead of letting the select render empty.
    legacySymbolOption () {
      const sym = (this.baseForm.symbol || '').trim()
      if (!sym) return null
      const exists = this.marketWatchlist.some(w => w.symbol === sym)
      if (exists) return null
      return { symbol: sym }
    },
    watchlistPlaceholder () {
      if (this.marketWatchlist.length === 0) {
        return this.isZhLocale
          ? '请先添加自选标的'
          : 'Please add a symbol to your watchlist'
      }
      return this.$t('trading-bot.wizard.symbolPh')
    },
    watchlistEmptyText () {
      return this.isZhLocale
        ? '自选为空，点击下拉中的"+"添加'
        : 'Watchlist is empty. Click "+" in the dropdown to add a symbol.'
    },
    watchlistHint () {
      return this.isZhLocale
        ? '从自选标的中选择；如未收藏，点击下拉里的"添加自选"按钮即可补充。'
        : 'Pick from your watchlist. Use "Add Symbol" inside the dropdown to add a new symbol.'
    },
    isEditMode () {
      return !!this.editBot
    },
    typeInfo () {
      const meta = BOT_TYPE_MAP[this.botType] || BOT_TYPE_MAP.grid
      return {
        ...meta,
        name: this.$t(`trading-bot.type.${this.botType}`),
        configHint: this.$t(`trading-bot.type.${this.botType}Hint`)
      }
    },
    configComponent () {
      const meta = BOT_TYPE_MAP[this.botType]
      return meta ? meta.component : 'GridConfig'
    },
    needsTimeframe () {
      return this.botType === 'trend'
    },
    // grid + dca share the equity-drawdown SL/TP semantics (P0-2), so the
    // risk form uses the same hints / extra fields for both.
    isGridLikeBot () {
      return this.botType === 'grid' || this.botType === 'dca'
    },
    isZhLocale () {
      return String(this.$i18n?.locale || '').toLowerCase().startsWith('zh')
    },
    capitalLabel () {
      return this.botType === 'martingale'
        ? (this.isZhLocale ? '总投入金额' : 'Total Budget')
        : this.$t('trading-bot.wizard.initialCapital')
    },
    martingaleBudgetHint () {
      return this.isZhLocale
        ? '这里表示这一轮马丁允许投入的总预算，首单金额会自动反推。'
        : 'This is the total budget for one martingale cycle. First order size is derived automatically.'
    },
    // Label override — for grid/DCA bots the SL/TP fields are interpreted as
    // *account equity* drawdown / take-profit, not "price vs entry" %, so we
    // relabel them to avoid confusion.
    gridLikeStopLossLabel () {
      if (!this.isGridLikeBot) return this.$t('trading-bot.risk.stopLossPct')
      return this.$t('trading-bot.risk.equityStopLossPct')
    },
    gridLikeTakeProfitLabel () {
      if (!this.isGridLikeBot) return this.$t('trading-bot.risk.takeProfitPct')
      return this.$t('trading-bot.risk.equityTakeProfitPct')
    },
    stopLossHint () {
      if (this.isGridLikeBot) {
        return this.isZhLocale
          ? '按账户净值相对初始资金的回撤比例触发；服务端命中后平掉所有多空腿。0 为不启用。与杠杆无关。'
          : 'Triggers on account equity drawdown vs initial capital. When hit the server closes both long and short legs. 0 disables. Leverage-independent.'
      }
      const tail = this.isZhLocale
        ? '按标的实际涨跌幅触发，与杠杆无关（杠杆只影响 PnL 与强平价）。0 为不启用。'
        : 'Triggers on the underlying price move — independent of leverage. 0 disables.'
      const hints = {
        trend: { zh: '当均线信号来得太慢时，此止损作为安全网强制平仓。', en: 'Safety net: force close when loss exceeds this %, even if MA has not crossed back.' }
      }
      const h = hints[this.botType] || { zh: '当持仓亏损达到此比例时强制平仓。', en: 'Force close when loss reaches this %.' }
      const body = this.isZhLocale ? h.zh : h.en
      return `${body} ${tail}`
    },
    takeProfitHint () {
      if (this.isGridLikeBot) {
        return this.isZhLocale
          ? '按账户净值相对初始资金的浮盈比例触发；命中后清空所有腿、终止网格。0 为不启用。与杠杆无关。'
          : 'Triggers on account equity gain vs initial capital. When hit the server closes both legs and the grid stops. 0 disables. Leverage-independent.'
      }
      const tail = this.isZhLocale
        ? '按标的实际涨跌幅触发，与杠杆无关。0 为不启用。'
        : 'Triggers on the underlying price move — independent of leverage. 0 disables.'
      const hints = {
        trend: { zh: '当持仓浮盈达到此比例时强制止盈，即使均线仍在同侧。', en: 'Force close when profit reaches this %, even if MA trend continues.' }
      }
      const h = hints[this.botType] || { zh: '当持仓浮盈达到此比例时自动平仓。', en: 'Auto close when profit reaches this %.' }
      const body = this.isZhLocale ? h.zh : h.en
      return `${body} ${tail}`
    },
    gridRiskTitle () {
      return this.isZhLocale ? '网格风控说明' : 'Grid Risk Model'
    },
    gridRiskDesc () {
      return this.isZhLocale
        ? '网格机器人的止盈 / 止损按“账户净值 vs 初始资金”的回撤百分比触发，而不是按单笔入场价。另外网格区间外预留缓冲（grid_oob_buffer_pct），价格突破后会立即平掉所有腿，避免单边趋势继续吃亏。'
        : 'Grid bots use *account equity drawdown* (vs initial capital) for stop-loss / take-profit, not per-trade entry price. The "out-of-grid buffer" closes both legs when price spikes beyond the configured grid range, preventing runaway losses on a strong trend.'
    },
    gridOobBufferHint () {
      return this.isZhLocale
        ? '价格突破 upperPrice × (1 + 缓冲)  或跌破 lowerPrice × (1 - 缓冲) 时，服务端平掉所有腿。默认 5%。设 0 关闭。'
        : 'When price exceeds upperPrice × (1 + buffer) or falls below lowerPrice × (1 - buffer), the server closes both legs. Defaults to 5%. Set 0 to disable.'
    },
    martingaleRiskTitle () {
      return this.isZhLocale ? '高级风控' : 'Advanced Risk Control'
    },
    martingaleRiskDesc () {
      return this.isZhLocale
        ? '马丁的止盈、止损和最大总投入都在“策略参数”里定义。这里仅保留“单日最大亏损”作为整天维度的保险丝。'
        : 'Martingale take profit, stop loss, and total budget are all defined in Strategy Params. Only daily max loss remains here as a circuit breaker.'
    },
    dailyLossLabel () {
      return this.botType === 'martingale'
        ? (this.isZhLocale ? '单日最大亏损（高级）' : 'Daily Max Loss (Advanced)')
        : this.$t('trading-bot.risk.maxDailyLoss')
    },
    dailyLossHint () {
      return this.isZhLocale
        ? '限制机器人当天累计已实现亏损，不等同于单轮仓位止损。设 0 为不启用。'
        : 'Caps the bot daily realized loss. This is not the same as per-cycle stop loss. Set 0 to disable.'
    },
    martingaleTpNote () {
      return this.isZhLocale
        ? '马丁策略的止盈由"策略参数 → 止盈比例"控制，脚本会自动平仓并重置状态。'
        : 'Martingale TP is managed by "Strategy Params → Take Profit %", the script auto-closes and resets.'
    },
    maxPositionHint () {
      return this.isZhLocale
        ? '这是整套策略允许持有的最大仓位金额上限，不是马丁补仓层数。'
        : 'Caps the total position size for the strategy, not the number of martingale layers.'
    },
    selectedCredentialLabel () {
      if (!this.baseForm.credentialId) return '-'
      const cred = this.credentials.find(c => c.id === this.baseForm.credentialId)
      if (!cred) return '-'
      return `${cred.name || cred.exchange_id} (${cred.exchange_id})`
    },
    strategyParamDisplayItems () {
      return Object.keys(this.strategyParams || {})
        .filter(key => this.shouldShowStrategyParam(key))
        .map(key => ({
          key,
          label: this.getStrategyParamLabel(key),
          value: this.formatStrategyParamValue(key, this.strategyParams[key])
        }))
    }
  },
  watch: {
    'baseForm.initialCapital' (val) {
      if (!val || val <= 0) return
      if (this.botType !== 'martingale') {
        this.riskForm.maxPosition = val
      }
      this.riskForm.maxDailyLoss = Math.round(val * 0.1)
    },
    'baseForm.symbol': {
      immediate: true,
      handler (val) {
        this.selectedSymbolKey = val || undefined
      }
    },
    // When market_type lock changes (e.g. user picked a spot-only broker),
    // make sure the selected market_type is still valid; if not, force it
    // to one that is.  This mirrors the backend Rule 4 in
    // broker_market_policy.validate_strategy_config.
    swapAvailableForCurrentSelection: {
      immediate: false,
      handler (canSwap) {
        if (!canSwap && this.baseForm.marketType === 'swap') {
          this.baseForm.marketType = 'spot'
          this.baseForm.leverage = 1
        }
      }
    },
    spotAvailableForCurrentSelection: {
      immediate: false,
      handler (canSpot) {
        if (!canSpot && this.baseForm.marketType === 'spot' && this.swapAvailableForCurrentSelection) {
          this.baseForm.marketType = 'swap'
        }
      }
    }
  },
  created () {
    this.loadCredentials()
    if (this.editBot) {
      this.applyEditBot()
    } else {
      this.applyAiPreset()
    }
    this.loadWatchlist()
  },
  beforeDestroy () {
    if (this.addSearchTimer) {
      clearTimeout(this.addSearchTimer)
      this.addSearchTimer = null
    }
  },
  methods: {
    formatCredentialOptionLabel (cred) {
      return formatExchangeCredentialLabel(cred, {
        unnamed: this.$t('brokerAccounts.cryptoSection.unnamed')
      })
    },
    shouldShowStrategyParam (key) {
      if (key === 'gridExecutionMode' || key === 'grid_execution_mode' || key === 'referencePrice') {
        return false
      }
      if (key === 'initialPositionPct') {
        const dir = this.strategyParams && this.strategyParams.gridDirection
        const pct = Number(this.strategyParams && this.strategyParams.initialPositionPct)
        return (dir === 'long' || dir === 'short') && Number.isFinite(pct) && pct > 0
      }
      // Hide the trailing TP activation / callback details on the confirm
      // screen when trailing TP is OFF — otherwise users would see stray
      // "0.8%" rows for a feature they didn't enable, which is confusing.
      if (key === 'trailingTpActivationPct' || key === 'trailingTpCallbackPct') {
        return this.strategyParams && this.strategyParams.trailingTpEnabled === true
      }
      return !String(key || '').startsWith('_')
    },
    fallbackLabel (zh, en) {
      return this.isZhLocale ? zh : en
    },
    getStrategyParamLabel (key) {
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
        waterfallDropPct: this.$t('trading-bot.grid.waterfallDropPct'),
        orderMode: this.$t('trading-bot.grid.orderType'),
        referencePrice: this.fallbackLabel('锚定参考价', 'Anchor Reference Price'),
        initialAmount: this.fallbackLabel('首单金额（自动计算）', 'First Order Amount (Auto)'),
        multiplier: this.$t('trading-bot.martingale.multiplier'),
        maxLayers: this.$t('trading-bot.martingale.maxLayers'),
        priceDropPct: this.fallbackLabel('加仓触发跌幅', 'Add-on Trigger Move %'),
        takeProfitPct: this.fallbackLabel('相对持仓均价止盈%', 'Take Profit vs Avg Entry %'),
        stopLossPct: this.fallbackLabel('相对持仓均价止损%', 'Stop Loss vs Avg Entry %'),
        direction: this.$t(`trading-bot.${this.botType}.direction`),
        maPeriod: this.$t('trading-bot.trend.maPeriod'),
        maType: this.$t('trading-bot.trend.maType'),
        confirmBars: this.$t('trading-bot.trend.confirmBars'),
        positionPct: this.$t('trading-bot.trend.positionPct'),
        amountEach: this.$t('trading-bot.dca.amountEach'),
        frequency: this.$t('trading-bot.dca.frequency'),
        totalBudget: this.$t('trading-bot.dca.totalBudget'),
        dipBuyEnabled: this.$t('trading-bot.dca.dipBuy'),
        dipThreshold: this.$t('trading-bot.dca.dipThreshold'),
        // Trailing TP fields (shared between martingale and trend bots).
        trailingTpEnabled: this.fallbackLabel('启用追踪止盈', 'Trailing TP'),
        trailingTpActivationPct: this.fallbackLabel('追踪止盈激活涨幅', 'Trailing TP Activation %'),
        trailingTpCallbackPct: this.fallbackLabel('追踪止盈回撤幅度', 'Trailing TP Callback %')
      }
      return map[key] || key
    },
    formatStrategyParamValue (key, value) {
      if (value == null || value === '') return '-'
      if (key === 'direction') {
        const maps = {
          martingale: {
            long: this.$t('trading-bot.martingale.long'),
            short: this.$t('trading-bot.martingale.short')
          },
          trend: {
            long: this.$t('trading-bot.trend.longOnly'),
            short: this.$t('trading-bot.trend.shortOnly'),
            both: this.$t('trading-bot.trend.bothSides')
          }
        }
        return (maps[this.botType] || {})[value] || value
      }
      if (key === 'gridDirection') {
        const map = {
          neutral: this.$t('trading-bot.grid.neutral'),
          long: this.$t('trading-bot.grid.long'),
          short: this.$t('trading-bot.grid.short')
        }
        return map[value] || value
      }
      if (key === 'gridMode') {
        const map = {
          arithmetic: this.$t('trading-bot.grid.arithmetic'),
          geometric: this.$t('trading-bot.grid.geometric')
        }
        return map[value] || value
      }
      if (key === 'orderMode') {
        const map = {
          maker: this.$t('trading-bot.grid.limitOrder'),
          market: this.$t('trading-bot.grid.marketOrder')
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
          every_bar: this.fallbackLabel('每根K线', 'Every Bar'),
          hourly: this.$t('trading-bot.dca.hourly'),
          '4h': '4H',
          daily: this.$t('trading-bot.dca.daily'),
          weekly: this.$t('trading-bot.dca.weekly'),
          biweekly: this.$t('trading-bot.dca.biweekly'),
          monthly: this.$t('trading-bot.dca.monthly')
        }
        return map[value] || value
      }
      if (key === 'dipBuyEnabled' || key === 'trailingTpEnabled' || key === 'adaptiveBounds' || key === 'waterfallProtection') {
        return value ? this.fallbackLabel('开启', 'Enabled') : this.fallbackLabel('关闭', 'Disabled')
      }
      if (key === 'waterfallDropPct') {
        const display = ratioOrPercentToUiPercent(value, 3)
        return `${formatPercentDisplay(display, 2)}%`
      }
      if (['priceDropPct', 'takeProfitPct', 'stopLossPct', 'dipThreshold', 'positionPct',
           'trailingTpActivationPct', 'trailingTpCallbackPct', 'initialPositionPct'].includes(key)) {
        return `${value}%`
      }
      if ([
        'amountPerGrid',
        'referencePrice',
        'initialAmount',
        'amountEach',
        'totalBudget'
      ].includes(key)) {
        return `$${value}`
      }
      return value
    },
    // Returns true if the currently-selected broker only supports
    // long-side execution (IBKR / Alpaca).  Reads the policy snapshot so it
    // stays in sync with the backend rule.
    isCurrentBrokerLongOnly () {
      const longOnly = (this.brokerMarketPolicy && this.brokerMarketPolicy.long_only_brokers) || []
      return longOnly.map(s => String(s).toLowerCase()).includes((this.currentExchangeId || '').toLowerCase())
    },
    normalizeStrategyParams (params) {
      const next = { ...(params || {}) }
      if (this.botType === 'trend') {
        delete next.timeframe
      }
      if (this.botType === 'grid') {
        delete next.gridExecutionMode
        delete next.grid_execution_mode
        delete next.referencePrice
      }
      // Spot markets cannot short, and long-only brokers also can't short
      // even on swap. Coerce direction params accordingly so the script
      // template doesn't emit short signals that the worker will reject.
      const forceLong = this.baseForm.marketType === 'spot' || this.isCurrentBrokerLongOnly()
      if (forceLong) {
        if (this.botType === 'grid') next.gridDirection = 'long'
        if (this.botType === 'martingale' || this.botType === 'trend') next.direction = 'long'
      }
      if (next.waterfallDropPct != null && next.waterfallDropPct !== '') {
        next.waterfallDropPct = ratioOrPercentToUiPercent(next.waterfallDropPct, 4)
      }
      return next
    },
    resolveTradeDirection (params) {
      if (this.baseForm.marketType === 'spot') return 'long'
      if (this.isCurrentBrokerLongOnly()) return 'long'
      if (this.botType === 'grid') {
        const dir = params.gridDirection || 'neutral'
        return { neutral: 'both', long: 'long', short: 'short' }[dir] || 'both'
      }
      if (this.botType === 'martingale' || this.botType === 'trend') {
        return params.direction || 'long'
      }
      return 'long'
    },
    applyEditBot () {
      const bot = this.editBot
      if (!bot) return
      this.baseForm.botName = bot.strategy_name || ''
      this.baseForm.marketCategory = bot.market_category || 'Crypto'
      const tc = bot.trading_config || {}
      this.baseForm.symbol = tc.symbol || ''
      this.baseForm.timeframe = tc.timeframe || '1h'
      this.baseForm.marketType = tc.market_type || 'swap'
      this.baseForm.leverage = tc.leverage || 5
      this.baseForm.initialCapital = tc.initial_capital || 1000
      this.baseForm.credentialId = bot.exchange_config?.credential_id || undefined
      this.currentExchangeId = (bot.exchange_config?.exchange_id || '').toLowerCase()
      if (tc.bot_params && typeof tc.bot_params === 'object') {
        this.strategyParams = this.normalizeStrategyParams({ ...tc.bot_params })
      }
      this.riskForm.stopLossPct = this.botType === 'martingale'
        ? (tc.bot_params?.stopLossPct ?? 12)
        : (tc.stop_loss_pct ?? 10)
      this.riskForm.takeProfitPct = this.botType === 'martingale'
        ? (tc.bot_params?.takeProfitPct ?? 2)
        : (tc.take_profit_pct ?? 20)
      this.riskForm.maxPosition = this.botType === 'martingale' ? 0 : (tc.max_position ?? 5000)
      this.riskForm.maxDailyLoss = tc.max_daily_loss ?? 500
      // P0-2 / P1-2 grid-only fields
      if (tc.grid_oob_buffer_pct != null) {
        this.riskForm.gridOobBufferPct = tc.grid_oob_buffer_pct
      }
    },
    applyAiPreset () {
      if (!this.aiPreset) return
      const p = this.aiPreset
      if (p.botName) this.baseForm.botName = p.botName
      const base = p.baseConfig || {}
      if (base.marketCategory) this.baseForm.marketCategory = base.marketCategory
      if (base.symbol) this.baseForm.symbol = base.symbol
      if (base.timeframe) this.baseForm.timeframe = base.timeframe
      if (base.marketType) this.baseForm.marketType = base.marketType
      if (base.leverage) this.baseForm.leverage = base.leverage
      this.baseForm.initialCapital = null
      if (p.strategyParams && typeof p.strategyParams === 'object') {
        const params = { ...p.strategyParams }
        delete params.amountPerGrid
        delete params.initialAmount
        delete params.totalBudget
        if (this.botType === 'martingale') {
          if (params.takeProfitPct == null && (p.riskConfig || {}).takeProfitPct != null) {
            params.takeProfitPct = (p.riskConfig || {}).takeProfitPct
          }
          if (params.stopLossPct == null && (p.riskConfig || {}).stopLossPct != null) {
            params.stopLossPct = (p.riskConfig || {}).stopLossPct
          }
        }
        this.strategyParams = this.normalizeStrategyParams(params)
      }
      this.riskForm.stopLossPct = this.botType === 'martingale' ? 0 : ((p.riskConfig || {}).stopLossPct ?? 10)
      this.riskForm.takeProfitPct = this.botType === 'martingale' ? 0 : ((p.riskConfig || {}).takeProfitPct ?? 20)
      this.riskForm.maxPosition = this.botType === 'martingale' ? 0 : null
      this.riskForm.maxDailyLoss = null
    },
    async loadWatchlist () {
      this.loadingWatchlist = true
      try {
        const res = await getWatchlist({ userid: this.userId })
        if (res && res.code === 1 && Array.isArray(res.data)) {
          this.watchlist = res.data
        }
      } catch (e) {
      } finally {
        this.loadingWatchlist = false
      }
    },
    filterSymbolOption (input, option) {
      const val = String(option.componentOptions?.propsData?.value || '').toLowerCase()
      if (val === '__add__') return true
      const q = String(input || '').trim().toLowerCase()
      if (!q) return true
      const row = this.marketWatchlist.find(w => w.symbol === option.componentOptions.propsData.value)
      const haystack = (val + ' ' + ((row && row.name) || '')).toLowerCase()
      return haystack.includes(q)
    },
    handleSymbolChange (val) {
      if (val === '__add__') {
        this.$nextTick(() => {
          this.selectedSymbolKey = this.baseForm.symbol || undefined
        })
        this.openAddSymbolModal()
        return
      }
      this.baseForm.symbol = val || ''
      this.selectedSymbolKey = val || undefined
    },
    symbolSelectGetPopupContainer (trigger) {
      if (this.isModal) {
        return trigger.parentNode || document.body
      }
      return document.body
    },
    addSymbolModalGetContainer () {
      return document.body
    },
    openAddSymbolModal () {
      this.addSearchKeyword = ''
      this.addSearchResults = []
      this.addSelectedItem = null
      this.addSearched = false
      this.showAddSymbolModal = true
    },
    closeAddSymbolModal () {
      if (this.addSearchTimer) {
        clearTimeout(this.addSearchTimer)
        this.addSearchTimer = null
      }
      this.showAddSymbolModal = false
    },
    onAddSymbolSearchInput () {
      if (this.addSearchTimer) {
        clearTimeout(this.addSearchTimer)
        this.addSearchTimer = null
      }
      const kw = String(this.addSearchKeyword || '').trim()
      if (!kw) {
        this.addSearchResults = []
        this.addSelectedItem = null
        this.addSearched = false
        return
      }
      this.addSearchTimer = setTimeout(() => this.doAddSymbolSearch(), 400)
    },
    async doAddSymbolSearch () {
      const kw = String(this.addSearchKeyword || '').trim()
      if (!kw) return
      const market = this.baseForm.marketCategory || 'Crypto'
      this.addSearching = true
      try {
        const res = await searchSymbols({ market, keyword: kw, limit: 20 })
        const list = (res && Array.isArray(res.data)) ? res.data : []
        this.addSearchResults = list
        this.addSearched = true
        if (list.length === 0) {
          this.addSelectedItem = { market, symbol: kw.toUpperCase(), name: '' }
        } else if (!this.addSelectedItem || !list.some(x => x.symbol === this.addSelectedItem.symbol)) {
          this.addSelectedItem = list[0]
        }
      } catch (e) {
        this.addSearchResults = []
        this.addSelectedItem = { market, symbol: kw.toUpperCase(), name: '' }
        this.addSearched = true
      } finally {
        this.addSearching = false
      }
    },
    async handleAddSymbol () {
      const item = this.addSelectedItem
      if (!item || !item.symbol) {
        this.$message.warning(this.$t('trading-bot.wizard.symbolReq'))
        return
      }
      this.addingSymbol = true
      try {
        const symbol = String(item.symbol).toUpperCase()
        await addWatchlist({
          userid: this.userId,
          market: this.baseForm.marketCategory || 'Crypto',
          symbol,
          name: item.name || ''
        })
        await this.loadWatchlist()
        this.baseForm.symbol = symbol
        this.selectedSymbolKey = symbol
        this.$message.success(this.$t('trading-bot.wizard.addSymbolSuccess'))
        this.closeAddSymbolModal()
        this.$nextTick(() => {
          if (this.$refs.baseForm) {
            try { this.$refs.baseForm.clearValidate(['symbol']) } catch (_) {}
          }
        })
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('trading-bot.wizard.addSymbolFail'))
      } finally {
        this.addingSymbol = false
      }
    },
    async loadCredentials () {
      this.loadingCredentials = true
      try {
        const res = await listExchangeCredentials()
        this.credentialsRaw = (res?.data?.items) || []
      } catch {
        this.credentialsRaw = []
      } finally {
        this.loadingCredentials = false
      }
      this.refilterCredentials()
    },
    // Filter the raw credential list down to the brokers that can serve the
    // currently-selected market_category. Driven by the policy snapshot from
    // the backend, so e.g. picking "USStock" automatically narrows to ibkr +
    // alpaca and excludes binance/okx/etc.
    refilterCredentials () {
      const allowed = this.eligibleExchangeIdsForMarket
      this.credentials = (this.credentialsRaw || []).filter(
        c => allowed.has(String(c.exchange_id || '').toLowerCase())
      )
      // If the previously selected credential no longer matches, clear it.
      if (this.baseForm.credentialId) {
        const stillThere = this.credentials.some(c => c.id === this.baseForm.credentialId)
        if (!stillThere) {
          this.baseForm.credentialId = undefined
          this.currentExchangeId = ''
        }
      }
    },
    handleCredentialChange (credId) {
      if (!credId) {
        this.currentExchangeId = ''
        return
      }
      const cred = this.credentials.find(c => c.id === credId)
      if (cred) {
        this.currentExchangeId = (cred.exchange_id || '').toLowerCase()
      }
    },
    // Switching market_category resets every dependent field: credentials,
    // symbol, market_type, leverage. This keeps the wizard's state coherent
    // (no stale "BTC/USDT" sticking around when the user flips to USStock).
    handleMarketCategoryChange () {
      // Refilter credentials and clear symbol because the watchlist filter
      // changes shape too.
      this.refilterCredentials()
      this.baseForm.symbol = ''
      this.selectedSymbolKey = undefined
      if (this.isStockMarketCategory) {
        this.baseForm.marketType = 'spot'
        this.baseForm.leverage = 1
        return
      }
      // Force the strongest legal market_type for the new market.
      if (!this.swapAvailableForCurrentSelection) {
        this.baseForm.marketType = 'spot'
        this.baseForm.leverage = 1
      } else if (!this.spotAvailableForCurrentSelection) {
        this.baseForm.marketType = 'swap'
      }
    },
    syncBaseStepFieldsBeforeValidate () {
      if (!this.baseForm.symbol && this.selectedSymbolKey && this.selectedSymbolKey !== '__add__') {
        this.baseForm.symbol = this.selectedSymbolKey
      }
    },
    extractValidationIssue (fields) {
      if (!fields || typeof fields !== 'object') return null
      for (const key of Object.keys(fields)) {
        const item = fields[key]
        const errors = Array.isArray(item) ? item : (item && item.errors)
        if (Array.isArray(errors) && errors.length > 0) {
          const first = errors[0]
          if (typeof first === 'string') return { field: key, message: first }
          if (first && first.message) return { field: key, message: first.message }
        }
      }
      return null
    },
    extractValidationMessage (fields) {
      const issue = this.extractValidationIssue(fields)
      return issue ? issue.message : ''
    },
    getBaseStepValidationIssue () {
      if (!String(this.baseForm.botName || '').trim()) {
        return { field: 'botName', message: this.$t('trading-bot.wizard.botNameReq') }
      }
      if (!this.isBotTypeSupportedOnCurrentMarket) {
        return {
          field: 'marketCategory',
          message: this.$t('trading-bot.wizard.botTypeNotSupportedOnMarket', { market: this.currentMarketLabel })
        }
      }
      if (!this.baseForm.credentialId) {
        return { field: 'credentialId', message: this.$t('trading-bot.wizard.credentialReq') }
      }
      if (!String(this.baseForm.symbol || '').trim()) {
        return { field: 'symbol', message: this.$t('trading-bot.wizard.symbolReq') }
      }
      if (!this.isStockMarketCategory && this.baseForm.marketType === 'swap' && !this.swapAvailableForCurrentSelection) {
        return {
          field: 'marketType',
          message: this.marketTypeHint || this.$t('trading-bot.wizard.futuresUnsupported')
        }
      }
      const capital = Number(this.baseForm.initialCapital)
      if (!Number.isFinite(capital) || capital < 10 || capital > 1000000) {
        return { field: 'initialCapital', message: this.$t('trading-bot.wizard.capitalReq') }
      }
      return null
    },
    getBaseStepValidationMessage () {
      const issue = this.getBaseStepValidationIssue()
      return issue && issue.message ? issue.message : issue
    },
    validateFormModel (formRef) {
      return new Promise(resolve => {
        if (!formRef || typeof formRef.validate !== 'function') {
          resolve({ valid: true, fields: null })
          return
        }
        formRef.validate((valid, fields) => {
          resolve({ valid: !!valid, fields })
        })
      })
    },
    async validateBaseStepWithMessage () {
      this.syncBaseStepFieldsBeforeValidate()
      const manualMessage = this.getBaseStepValidationMessage()
      const result = await this.validateFormModel(this.$refs.baseForm)
      if (!result.valid || manualMessage) {
        return {
          valid: false,
          message: this.extractValidationMessage(result.fields) || manualMessage || this.$t('trading-bot.wizard.basicConfigIncomplete')
        }
      }
      return { valid: true, message: '' }
    },
    scrollBaseFieldIntoView (field) {
      const refMap = {
        botName: 'fieldBotName',
        marketCategory: 'fieldMarketCategory',
        credentialId: 'fieldCredentialId',
        symbol: 'fieldSymbol',
        initialCapital: 'fieldInitialCapital'
      }
      const refName = refMap[field]
      if (!refName) return
      this.$nextTick(() => {
        const target = this.$refs[refName]
        const el = target && (target.$el || target)
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    },
    async nextStep () {
      if (this.validatingNext) return
      this.validatingNext = true
      try {
        if (this.currentStep === 0) {
          const result = await this.validateBaseStepWithMessage()
          if (!result.valid) {
            this.$message.warning(result.message)
            const issue = this.getBaseStepValidationIssue()
            this.scrollBaseFieldIntoView(issue && issue.field)
            return
          }
        }
        if (this.currentStep === 1 && this.$refs.strategyConfig) {
          try {
            await this.$refs.strategyConfig.validate()
          } catch (e) {
            this.$message.warning((e && e.message && e.message !== 'validation failed')
              ? e.message
              : this.$t('trading-bot.wizard.strategyParamsIncomplete'))
            return
          }
        }
        this.currentStep++
      } finally {
        this.validatingNext = false
      }
    },
    prevStep () {
      if (this.currentStep > 0) this.currentStep--
    },
    handleSubmit () {
      if (this.isEditMode) {
        this.handleUpdate()
      } else {
        this.handleCreate()
      }
    },
    async fetchGridReferencePrice () {
      if (this.botType !== 'grid') return null
      const symbol = this.baseForm.symbol
      if (!symbol) return null
      try {
        const res = await request({
          url: '/api/market/price',
          method: 'get',
          params: { market: this.baseForm.marketCategory || 'Crypto', symbol }
        })
        const price = parseFloat(res?.data?.price)
        return price > 0 ? price : null
      } catch {
        return null
      }
    },
    async buildPayload () {
      const initialCapital = Number(this.baseForm.initialCapital)
      if (!Number.isFinite(initialCapital) || initialCapital < 10 || initialCapital > 1000000) {
        throw new Error(this.$t('trading-bot.wizard.capitalReq'))
      }
      const strategyParams = this.normalizeStrategyParams(this.strategyParams)
      const scriptParams = { ...strategyParams }
      if (initialCapital > 0) {
        scriptParams._initialCapital = initialCapital
      }
      const effectiveTimeframe = this.needsTimeframe
        ? this.baseForm.timeframe
        : (this.botType === 'dca' ? '1h' : '1m')
      const strategyCode = generateBotScript(this.botType, scriptParams, {
        timeframe: effectiveTimeframe
      })
      const market = this.baseForm.marketCategory || 'Crypto'
      const isStockMarket = ['usstock', 'cnstock', 'hkstock'].includes(String(market || '').toLowerCase())
      const marketType = isStockMarket ? 'spot' : this.baseForm.marketType
      const leverage = marketType === 'spot' ? 1 : (this.baseForm.leverage || 5)
      const tradeDirection = isStockMarket ? 'long' : this.resolveTradeDirection(strategyParams)

      // Validate broker x market compatibility against the policy snapshot.
      // The backend will re-validate via broker_market_policy.validate_strategy_config
      // at create time, but failing fast here prevents a half-saved strategy
      // from existing and gives a more readable error.
      const exId = (this.currentExchangeId || '').toLowerCase()
      if (!this.eligibleExchangeIdsForMarket.has(exId)) {
        throw new Error(
          this.$t('trading-bot.wizard.cryptoCredentialRequired', { market: this.currentMarketLabel })
        )
      }
      if (!this.supportedMarketsForBot.has(market)) {
        throw new Error(
          this.$t('trading-bot.wizard.botTypeNotSupportedOnMarket', { market: this.currentMarketLabel })
        )
      }

      return {
        strategy_name: this.baseForm.botName,
        strategy_type: 'ScriptStrategy',
        strategy_mode: 'bot',
        strategy_code: strategyCode,
        market_category: market,
        execution_mode: 'live',
        exchange_config: {
          credential_id: this.baseForm.credentialId,
          exchange_id: this.currentExchangeId
        },
        trading_config: {
          symbol: this.baseForm.symbol,
          timeframe: effectiveTimeframe,
          market_type: marketType,
          leverage: leverage,
          trade_direction: tradeDirection,
          initial_capital: initialCapital,
          stop_loss_pct: this.botType === 'martingale' ? 0 : this.riskForm.stopLossPct,
          take_profit_pct: this.botType === 'martingale' ? 0 : this.riskForm.takeProfitPct,
          max_position: this.botType === 'martingale' ? 0 : this.riskForm.maxPosition,
          max_daily_loss: this.riskForm.maxDailyLoss,
          bot_type: this.botType,
          bot_params: strategyParams,
          // Grid-only knobs — backend ignores them for trend/martingale, and
          // sending them as undefined would override the server-side default
          // of 1s for grid bots, so only attach them on grid/dca.
          ...((this.botType === 'grid' || this.botType === 'dca')
            ? {
                grid_oob_buffer_pct: this.riskForm.gridOobBufferPct
              }
            : {}),
          order_mode: (this.botType === 'martingale' || this.botType === 'trend')
            ? 'market'
            : (strategyParams.orderMode || 'maker'),
          entry_trigger_mode: 'immediate'
        },
        notification_config: {
          channels: ['browser'],
          targets: {}
        },
        bot_type: this.botType
      }
    },
    async handleCreate () {
      this.creating = true
      try {
        const payload = await this.buildPayload()
        await createStrategy(payload)
        this.$message.success(this.$t('trading-bot.wizard.createSuccess'))
        this.$emit('created')
      } catch (e) {
        this.$message.error(e.message || this.$t('trading-bot.wizard.createFail'))
      } finally {
        this.creating = false
      }
    },
    async handleUpdate () {
      this.creating = true
      try {
        const payload = await this.buildPayload()
        await updateStrategy(this.editBot.id, payload)
        this.$message.success(this.$t('trading-bot.wizard.saveSuccess'))
        this.$emit('updated')
      } catch (e) {
        this.$message.error(e.message || this.$t('trading-bot.wizard.saveFail'))
      } finally {
        this.creating = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.bot-create-wizard {
  display: flex;
  flex-direction: column;
  height: 100%;

  &.is-modal {
    padding: 24px;
    max-height: 75vh;

    .wizard-content {
      overflow-y: auto;
      max-height: calc(75vh - 200px);
    }
  }
}

.wizard-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;

  .wizard-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #262626;
  }

  .type-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    color: #fff;
    font-size: 16px;
  }
}

.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  vertical-align: middle;
  letter-spacing: 0.5px;
}

.ai-reason-bar {
  margin-top: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  font-size: 13px;
  color: #595959;
  line-height: 1.5;

  .anticon {
    color: #764ba2;
    margin-right: 6px;
  }
}

.wizard-steps {
  margin-bottom: 28px;
}

.wizard-content {
  flex: 1;
  overflow-y: auto;
  min-height: 300px;
  scroll-padding: 24px 0;
}

.step-panel {
  max-width: 600px;
  margin: 0 auto;
}

.step-hint {
  padding: 10px 14px;
  background: rgba(24, 144, 255, 0.06);
  border-radius: 8px;
  font-size: 13px;
  color: #595959;
  margin-bottom: 20px;

  .anticon { color: var(--primary-color, #1890ff); margin-right: 6px; }
}

.form-hint {
  font-size: 12px;
  color: #8c8c8c;

  a { color: var(--primary-color, #1890ff); font-size: 12px; }
}

.capital-form-item {
  margin: 4px 0 18px;
  padding: 10px 12px 8px;
  border: 1px solid rgba(19, 194, 194, 0.24);
  border-radius: 8px;
  background: rgba(19, 194, 194, 0.06);
}

.confirm-section {
  h4 {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 12px;
    color: #262626;
  }
}

.wizard-footer {
  display: flex;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  margin-top: 20px;

  .spacer { flex: 1; }
}

/* ===== Symbol picker (watchlist mode) ===== */
.bot-symbol-opt-code {
  font-weight: 600;
  letter-spacing: 0.2px;
}

.bot-symbol-opt-name {
  margin-left: 8px;
  color: #999;
  font-size: 12px;
}

.bot-symbol-opt-tag {
  margin-left: 8px;
  font-size: 11px;
  line-height: 16px;
}

.bot-symbol-opt-add .anticon {
  color: var(--primary-color, #1890ff);
  margin-right: 6px;
}

.bot-symbol-refresh {
  margin-left: 8px;
  cursor: pointer;
  font-size: 12px;
  color: var(--primary-color, #1890ff);

  .anticon { margin-right: 4px; }
}

.bot-add-symbol-hint {
  font-size: 13px;
  color: #595959;
  background: rgba(24, 144, 255, 0.08);
  border-radius: 6px;
  padding: 8px 12px;

  .anticon { color: var(--primary-color, #1890ff); margin-right: 6px; }
}

.bot-add-symbol-empty {
  padding: 16px 0;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.bot-add-item-active {
  background: rgba(82, 196, 26, 0.08);
}
</style>
