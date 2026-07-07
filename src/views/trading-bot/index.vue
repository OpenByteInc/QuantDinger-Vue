<template>
  <div class="trading-bot" :class="{ 'theme-dark': isDarkTheme }">
    <template v-if="viewMode === 'detail' && selectedBot">
      <div class="detail-back">
        <a-button type="link" @click="viewMode = 'list'; selectedBot = null">
          <a-icon type="arrow-left" /> {{ $t('trading-bot.backToList') }}
        </a-button>
      </div>
      <bot-detail
        :bot="selectedBot"
        :isDark="isDarkTheme"
        :actionLoading="actionLoading"
        @start="handleStartBot"
        @stop="handleStopBot"
        @edit="handleEditBot"
        @delete="handleDeleteBot"
        @clone-as-script="handleCloneAsScript"
        @publish="openPublishPresetModal"
        @close="viewMode = 'list'; selectedBot = null"
      />
    </template>

    <template v-else>
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title"><a-icon type="robot" class="title-icon" /> {{ $t('trading-bot.pageTitle') }}</h2>
          <p class="page-subtitle">{{ $t('trading-bot.pageSubtitle') }}</p>
        </div>
        <div class="page-header-right">
          <a-button @click="goToMarketplace">
            <a-icon type="shop" />
            {{ $t('trading-bot.action.openMarketplace') }}
          </a-button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-row">
        <div v-for="kpi in kpiCards" :key="kpi.label" class="kpi-card">
          <div class="kpi-icon" :style="{ color: kpi.color, background: kpi.color + '15' }">
            <a-icon :type="kpi.icon" />
          </div>
          <div class="kpi-body">
            <div class="kpi-label">{{ kpi.label }}</div>
            <div class="kpi-value">{{ kpi.value }}</div>
          </div>
        </div>
      </div>

      <!-- Bot type selection cards -->
      <bot-type-cards
        @select="handleSelectBotType"
        @ai-create="showAiDialog = true"
      />

      <ai-bot-dialog
        :visible="showAiDialog"
        :isDark="isDarkTheme"
        @close="showAiDialog = false"
        @apply="handleAiApply"
      />

      <!-- Bot list -->
      <div style="margin-top: 24px;">
        <bot-list
          :bots="bots"
          :loading="loading"
          :selectedId="selectedBot ? selectedBot.id : null"
          :actionLoadingId="actionLoadingId"
          @select="handleViewDetail"
          @start="handleStartBot"
          @stop="handleStopBot"
          @edit="handleEditBot"
          @delete="handleDeleteBot"
        />
      </div>

      <!--
        Subtle "escape hatch" link to the hidden /strategy-script page.
        We intentionally do NOT make this a button or card — the wizard above
        is the recommended path for 95% of users. This single line of small
        muted text is enough for devs who specifically want raw Python.
      -->
      <div class="advanced-script-entry">
        <a-icon type="code" class="advanced-script-entry__icon" />
        <span class="advanced-script-entry__text">
          {{ $t('trading-bot.advanced.scriptEntry.prefix') }}
        </span>
        <a class="advanced-script-entry__link" @click="goToScriptStrategies">
          {{ $t('trading-bot.advanced.scriptEntry.linkText') }}
          <a-icon type="arrow-right" />
        </a>
      </div>
    </template>

    <a-modal
      :visible="wizardVisible"
      :title="null"
      :footer="null"
      :width="680"
      :bodyStyle="{ padding: 0 }"
      :maskClosable="false"
      :wrapClassName="isDarkTheme ? 'wizard-modal-dark' : 'wizard-modal'"
      :destroyOnClose="true"
      centered
      @cancel="handleWizardCancel"
    >
      <bot-create-wizard
        v-if="wizardVisible"
        :key="editingBot ? ('edit-' + editingBot.id) : ('create-' + selectedBotType)"
        :botType="editingBot ? (editingBot.bot_type || 'grid') : selectedBotType"
        :aiPreset="aiPreset"
        :editBot="editingBot"
        :isModal="true"
        @cancel="handleWizardCancel"
        @created="handleBotCreated"
        @updated="handleBotUpdated"
      />
    </a-modal>

    <a-modal
      :visible="showPublishPresetModal"
      :title="$t('trading-bot.publish.title')"
      :confirm-loading="publishingPreset"
      @ok="submitPublishPreset"
      @cancel="showPublishPresetModal = false"
    >
      <a-form layout="vertical">
        <a-form-item :label="$t('trading-bot.publish.name')">
          <a-input v-model="publishForm.name" />
        </a-form-item>
        <a-form-item :label="$t('trading-bot.publish.description')">
          <a-textarea v-model="publishForm.description" :rows="3" />
        </a-form-item>
        <a-form-item :label="$t('trading-bot.publish.pricingType')">
          <a-radio-group v-model="publishForm.pricingType">
            <a-radio value="free">{{ $t('community.free') }}</a-radio>
            <a-radio value="paid">{{ $t('community.paidOnly') }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="publishForm.pricingType === 'paid'" :label="$t('trading-bot.publish.price')">
          <a-input-number v-model="publishForm.price" :min="0" :step="1" style="width: 100%" />
        </a-form-item>
        <a-alert type="info" show-icon :message="$t('trading-bot.publish.hint')" />
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { baseMixin } from '@/store/app-mixin'
import { getStrategyList, startStrategy, stopStrategy, deleteStrategy, createStrategy, publishBotPreset } from '@/api/strategy'
import { getUserInfo } from '@/api/login'
import BotTypeCards from './components/BotTypeCards.vue'
import BotCreateWizard from './components/BotCreateWizard.vue'
import BotList from './components/BotList.vue'
import BotDetail from './components/BotDetail.vue'
import AiBotDialog from './components/AiBotDialog.vue'

export default {
  name: 'TradingBot',
  mixins: [baseMixin],
  components: { BotTypeCards, BotCreateWizard, BotList, BotDetail, AiBotDialog },
  data () {
    return {
      userId: null,
      loading: false,
      bots: [],
      viewMode: 'list',
      selectedBotType: null,
      selectedBot: null,
      actionLoading: false,
      actionLoadingId: null,
      showAiDialog: false,
      aiPreset: null,
      editingBot: null,
      showPublishPresetModal: false,
      publishingPreset: false,
      publishTargetBot: null,
      publishForm: {
        name: '',
        description: '',
        pricingType: 'free',
        price: 0
      }
    }
  },
  computed: {
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    wizardVisible () {
      return this.viewMode === 'create' || this.viewMode === 'edit'
    },
    kpiCards () {
      const list = this.bots || []
      const running = list.filter(s => s.status === 'running').length
      const total = list.length
      let totalEquity = 0
      let totalPnl = 0
      list.forEach(s => {
        totalEquity += (s.trading_config?.initial_capital) || 0
        totalPnl += s.unrealized_pnl || 0
      })
      return [
        {
          label: this.$t('trading-bot.kpi.totalEquity'),
          value: '$' + totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          icon: 'wallet',
          color: 'var(--primary-color, #1890ff)'
        },
        {
          label: this.$t('trading-bot.kpi.totalPnl'),
          value: (totalPnl >= 0 ? '+' : '') + '$' + totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          icon: 'rise',
          color: totalPnl >= 0 ? '#52c41a' : '#f5222d'
        },
        {
          label: this.$t('trading-bot.kpi.running'),
          value: `${running} / ${total}`,
          icon: 'robot',
          color: '#722ed1'
        },
        {
          label: this.$t('trading-bot.kpi.stopped'),
          value: String(total - running),
          icon: 'pause-circle',
          color: '#faad14'
        }
      ]
    }
  },
  async created () {
    try {
      const res = await getUserInfo()
      this.userId = res?.data?.id || res?.data?.user_id || 1
    } catch {
      this.userId = 1
    }
    this.loadBots()
    this.handleRouteQuery()
  },
  watch: {
    '$route.query' () {
      this.handleRouteQuery()
    }
  },
  methods: {
    handleRouteQuery () {
      const q = this.$route.query
      if (q && q.aiPreset === '1') {
        try {
          const raw = sessionStorage.getItem('qd_copilot_bot_recommend')
          const preset = raw ? JSON.parse(raw) : null
          if (preset && preset.botType) {
            this.handleAiApply(preset)
            sessionStorage.removeItem('qd_copilot_bot_recommend')
            return
          }
        } catch (_) {}
      }
      if (!q || !q.strategy_id) return
      const sid = Number(q.strategy_id)
      if (!sid) return
      const found = this.bots.find(b => b.id === sid)
      if (!found) return
      if (q.action === 'edit') {
        this.handleEditBot(found)
        return
      }
      this.selectedBot = found
      this.viewMode = 'detail'
    },
    async loadBots () {
      this.loading = true
      try {
        const res = await getStrategyList()
        const all = Array.isArray(res?.data?.strategies) ? res.data.strategies : []
        this.bots = all
          .filter(s => s.strategy_mode === 'bot' || s.bot_type || (s.trading_config && s.trading_config.bot_type))
          .map(s => ({
            ...s,
            bot_type: s.bot_type || (s.trading_config && s.trading_config.bot_type) || ''
          }))
        if (this.selectedBot) {
          const updated = this.bots.find(b => b.id === this.selectedBot.id)
          if (updated) this.selectedBot = updated
        }
        this.$nextTick(() => this.handleRouteQuery())
      } catch {
        this.bots = []
      } finally {
        this.loading = false
      }
    },
    handleSelectBotType (type) {
      this.selectedBotType = type
      this.aiPreset = null
      this.editingBot = null
      this.viewMode = 'create'
    },
    handleAiApply (recommendation) {
      this.showAiDialog = false
      this.selectedBotType = recommendation.botType || 'grid'
      this.aiPreset = recommendation
      this.editingBot = null
      this.viewMode = 'create'
    },
    handleBotCreated () {
      this.viewMode = 'list'
      this.selectedBotType = null
      this.editingBot = null
      this.loadBots()
    },
    handleBotUpdated () {
      this.viewMode = 'list'
      this.editingBot = null
      this.selectedBotType = null
      this.loadBots()
    },
    handleEditBot (item) {
      if (item.status === 'running') {
        this.$message.warning(this.$t('trading-bot.msg.stopFirst'))
        return
      }
      this.editingBot = item
      this.aiPreset = null
      this.viewMode = 'edit'
    },
    handleWizardCancel () {
      this.viewMode = 'list'
      this.editingBot = null
      this.selectedBotType = null
      this.aiPreset = null
    },
    handleViewDetail (item) {
      this.selectedBot = item
      this.viewMode = 'detail'
    },
    async handleStartBot (item) {
      this.actionLoading = true
      this.actionLoadingId = item.id
      try {
        await startStrategy(item.id)
        this.$message.success(this.$t('trading-bot.msg.started'))
        this.loadBots()
      } catch (e) {
        this.$message.error(e.message || this.$t('trading-bot.msg.startFail'))
      } finally {
        this.actionLoading = false
        this.actionLoadingId = null
      }
    },
    async handleStopBot (item) {
      this.$confirm({
        title: this.$t('trading-bot.msg.stopTitle'),
        content: this.$t('trading-bot.msg.stopContent', { name: item.strategy_name }),
        okType: 'danger',
        onOk: async () => {
          this.actionLoading = true
          this.actionLoadingId = item.id
          try {
            const res = await stopStrategy(item.id)
            if (res && res.code === 1) {
              this.$message.success(this.$t('trading-bot.msg.stopped'))
              this.loadBots()
            } else {
              this.$message.error((res && res.msg) || this.$t('trading-bot.msg.stopFail'))
            }
          } catch (e) {
            this.$message.error(e.backendMessage || e.message || this.$t('trading-bot.msg.stopFail'))
          } finally {
            this.actionLoading = false
            this.actionLoadingId = null
          }
        }
      })
    },
    handleDeleteBot (item) {
      if (item.status === 'running') {
        this.$message.warning(this.$t('trading-bot.msg.stopFirst'))
        return
      }
      this.$confirm({
        title: this.$t('trading-bot.msg.deleteTitle'),
        content: this.$t('trading-bot.msg.deleteContent', { name: item.strategy_name }),
        okType: 'danger',
        onOk: async () => {
          await deleteStrategy(item.id)
          this.$message.success(this.$t('trading-bot.msg.deleted'))
          if (this.selectedBot?.id === item.id) {
            this.selectedBot = null
            this.viewMode = 'list'
          }
          this.loadBots()
        }
      })
    },
    /**
     * Jump to the (hidden) script-strategy page. This is the only first-class
     * entry into `/strategy-script` from the sidebar-visible UI now that the
     * route is `hidden: true`.
     */
    goToScriptStrategies () {
      this.$router.push({ path: '/strategy-script' })
    },
    goToMarketplace () {
      this.$router.push({ path: '/indicator-community', query: { asset_type: 'bot_preset' } })
    },
    openPublishPresetModal (bot) {
      if (!bot || !bot.id) return
      this.publishTargetBot = bot
      const tc = bot.trading_config || {}
      const botType = bot.bot_type || tc.bot_type || ''
      const typeLabel = botType ? this.$t(`trading-bot.type.${botType}`) : ''
      this.publishForm = {
        name: bot.strategy_name || '',
        description: typeLabel
          ? this.$t('trading-bot.publish.defaultDescription', { type: typeLabel })
          : '',
        pricingType: 'free',
        price: 0
      }
      this.showPublishPresetModal = true
    },
    async submitPublishPreset () {
      if (!this.publishTargetBot || !this.publishTargetBot.id) return
      this.publishingPreset = true
      try {
        const res = await publishBotPreset({
          strategyId: this.publishTargetBot.id,
          name: this.publishForm.name,
          description: this.publishForm.description,
          pricingType: this.publishForm.pricingType,
          price: this.publishForm.pricingType === 'paid' ? this.publishForm.price : 0
        })
        if (res.code === 1) {
          this.$message.success(this.$t('trading-bot.publish.success'))
          this.showPublishPresetModal = false
        } else {
          this.$message.error(res.msg || this.$t('trading-bot.publish.failed'))
        }
      } catch (e) {
        this.$message.error(this.$t('trading-bot.publish.failed'))
      } finally {
        this.publishingPreset = false
      }
    },
    /**
     * Clone the current bot as an editable Python "script" strategy.
     *
     * Why this exists:
     *   The trading-bot UI is a guided wizard with locked parameters. Power
     *   users who want to add custom logic on top of e.g. a grid bot used to
     *   have to rewrite everything from scratch. This handler takes the
     *   already-generated `strategy_code` out of the bot row and saves it as
     *   a brand new ScriptStrategy that the user can edit freely on the
     *   `/strategy-script` page.
     *
     * Safety choices:
     *   - execution_mode is forced to 'signal' (paper / notification only)
     *     even if the source bot was live. Users must explicitly flip it to
     *     'live' after reviewing the cloned code. This avoids accidentally
     *     spinning up a second live bot trading the same symbol.
     *   - We don't copy exchange credentials or signal channels — those are
     *     forms the user has to confirm. They survive as defaults in the
     *     clone's trading_config but are otherwise re-prompted.
     *   - We never mutate the source bot.
     */
    handleCloneAsScript (bot) {
      if (!bot) return
      const code = bot.strategy_code
      if (!code || typeof code !== 'string' || !code.trim()) {
        this.$message.warning(this.$t('trading-bot.cloneAsScript.noCode'))
        return
      }
      this.$confirm({
        title: this.$t('trading-bot.cloneAsScript.confirmTitle'),
        content: this.$t('trading-bot.cloneAsScript.confirmContent', { name: bot.strategy_name }),
        okText: this.$t('trading-bot.cloneAsScript.confirmOk'),
        cancelText: this.$t('trading-bot.cloneAsScript.confirmCancel'),
        onOk: async () => {
          const tc = bot.trading_config || {}
          // Deep-copy so the new row never shares object identity with the
          // source bot — otherwise an edit on one would silently mutate the
          // other (both are Vue-reactive references).
          const tradingConfig = JSON.parse(JSON.stringify(tc))
          // Bot-only knobs are dead weight inside a script strategy.
          delete tradingConfig.bot_type
          delete tradingConfig.bot_params
          // Pre-fill capital/timeframe/symbol from the source bot.
          const payload = {
            user_id: this.userId,
            strategy_name: `${bot.strategy_name} ${this.$t('trading-bot.cloneAsScript.suffix')}`,
            strategy_type: 'ScriptStrategy',
            strategy_mode: 'script',
            strategy_code: code,
            market_category: bot.market_category || tc.market_category || 'crypto',
            // Always start the clone in signal mode for safety; user can flip to live after review.
            execution_mode: 'signal',
            notification_config: bot.notification_config || { channels: [], targets: {} },
            trading_config: tradingConfig
          }
          try {
            const res = await createStrategy(payload)
            if (res && res.code === 1) {
              const newId = res.data && res.data.id
              const tc = bot.trading_config || {}
              if (String(tc.bot_type || '').toLowerCase() === 'grid') {
                this.$message.info(this.$t('trading-bot.cloneAsScript.gridPlaceholderHint'))
              }
              const h = this.$createElement
              const link = newId ? h('a', {
                attrs: { href: `/strategy-script?strategy_id=${newId}&mode=edit` },
                on: {
                  click: (e) => {
                    e.preventDefault()
                    this.$router.push({ path: '/strategy-script', query: { strategy_id: String(newId), mode: 'edit' } })
                  }
                }
              }, this.$t('trading-bot.cloneAsScript.openLink')) : null
              this.$notification.success({
                message: this.$t('trading-bot.cloneAsScript.successTitle'),
                description: link
                  ? h('span', [this.$t('trading-bot.cloneAsScript.successDesc'), ' ', link])
                  : this.$t('trading-bot.cloneAsScript.successDesc'),
                duration: 6
              })
            } else {
              this.$message.error((res && res.msg) || this.$t('trading-bot.cloneAsScript.failed'))
            }
          } catch (e) {
            this.$message.error(e.message || this.$t('trading-bot.cloneAsScript.failed'))
          }
        }
      })
    }
  }
}
</script>

<style lang="less" scoped>
.trading-bot {
  padding: 20px;
  min-height: calc(100vh - 120px);
}

/*
 * Small muted "Need full Python control?" line beneath the bot list.
 * Sized down on purpose — see template comment near `.advanced-script-entry`.
 */
.advanced-script-entry {
  margin-top: 24px;
  padding: 10px 14px;
  text-align: center;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.35);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  &__icon {
    color: rgba(0, 0, 0, 0.25);
    font-size: 12px;
  }

  &__text {
    color: rgba(0, 0, 0, 0.45);
  }

  &__link {
    color: var(--primary-color, #1890ff);
    cursor: pointer;
    transition: color 0.2s;

    .anticon {
      margin-left: 2px;
      font-size: 10px;
    }

    &:hover {
      color: var(--primary-color-hover, #40a9ff);
    }
  }
}

.page-header {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  .page-header-right {
    flex-shrink: 0;
  }

  .page-title {
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 2px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: flex;
    align-items: center;
    gap: 10px;

    .title-icon {
      font-size: 24px;
      -webkit-text-fill-color: var(--primary-color, #1890ff);
    }
  }

  .page-subtitle {
    margin: 0;
    font-size: 13px;
    color: #8c8c8c;
  }
}

.detail-back {
  margin-bottom: 12px;

  .ant-btn-link {
    padding: 0;
    font-size: 14px;
    color: #8c8c8c;

    &:hover { color: var(--primary-color, #1890ff); }
  }
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.kpi-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.kpi-value {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #262626;
}

@media (max-width: 768px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 480px) {
  .kpi-row { grid-template-columns: 1fr; }
}

// Dark theme
.trading-bot.theme-dark {
  background: #141414;

  .advanced-script-entry {
    color: rgba(255, 255, 255, 0.35);

    &__icon { color: rgba(255, 255, 255, 0.25); }
    &__text { color: rgba(255, 255, 255, 0.45); }
    &__link {
      color: var(--primary-color-active, #177ddc);
      &:hover { color: #3c9ae8; }
    }
  }

  .page-header {
    .page-title {
      background: linear-gradient(135deg, #e0e6ed 0%, #c5ccd6 100%);
      -webkit-background-clip: text;
    }

    .page-subtitle { color: rgba(255, 255, 255, 0.45); }

    .title-icon {
      color: var(--primary-color-hover, #40a9ff) !important;
      -webkit-text-fill-color: var(--primary-color-hover, #40a9ff);
    }
  }

  .kpi-card {
    background: #1f1f1f;
    border-color: #303030;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .kpi-value { color: rgba(255, 255, 255, 0.85); }
  .kpi-label { color: rgba(255, 255, 255, 0.45); }

  .detail-back .ant-btn-link { color: rgba(255, 255, 255, 0.45); }

  // BotTypeCards
  ::v-deep .section-header h3 { color: rgba(255, 255, 255, 0.85); }
  ::v-deep .section-header .section-desc { color: rgba(255, 255, 255, 0.45); }

  ::v-deep .type-card:not(.ai-card) {
    background: #1f1f1f;
    border-color: #303030;

    &:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      border-color: #434343;
    }

    .card-name { color: rgba(255, 255, 255, 0.85); }
    .card-desc { color: rgba(255, 255, 255, 0.45); }
    .card-arrow { color: rgba(255, 255, 255, 0.25); }
  }

  // BotList
  ::v-deep .list-header h3 {
    color: rgba(255, 255, 255, 0.85);

    .count { color: rgba(255, 255, 255, 0.45); }
  }

  ::v-deep .bot-row {
    background: #1f1f1f;
    border-color: #303030;

    &:hover {
      border-color: #434343;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    &.active {
      background: rgba(23, 125, 220, 0.12);
      border-color: rgba(23, 125, 220, 0.3);
    }

    .bot-name { color: rgba(255, 255, 255, 0.85); }
    .meta-text { color: rgba(255, 255, 255, 0.45); }
  }

  ::v-deep .bot-status-badge .text { color: rgba(255, 255, 255, 0.45); }
  ::v-deep .empty-state { color: rgba(255, 255, 255, 0.45); }

  ::v-deep .bot-actions .bot-action-btn {
    background: #181818 !important;
    border-color: #3a3a3a !important;
    color: rgba(255, 255, 255, 0.72) !important;

    .anticon {
      color: inherit !important;
    }

    &:hover,
    &:focus {
      background: #222 !important;
      border-color: var(--primary-color-active, #177ddc) !important;
      color: var(--primary-color-active, #177ddc) !important;
    }
  }

  ::v-deep .bot-actions .bot-action-btn--start {
    background: rgba(24, 144, 255, 0.1) !important;
    border-color: rgba(24, 144, 255, 0.45) !important;
    color: var(--primary-color-hover, #40a9ff) !important;

    &:hover,
    &:focus {
      background: rgba(24, 144, 255, 0.18) !important;
      border-color: var(--primary-color-hover, #40a9ff) !important;
      color: #69c0ff !important;
    }
  }

  ::v-deep .bot-actions .bot-action-btn--pause,
  ::v-deep .bot-actions .bot-action-btn--delete {
    background: rgba(255, 77, 79, 0.08) !important;
    border-color: rgba(255, 77, 79, 0.42) !important;
    color: #ff7875 !important;

    &:hover,
    &:focus {
      background: rgba(255, 77, 79, 0.16) !important;
      border-color: #ff7875 !important;
      color: #ffa39e !important;
    }
  }

  // BotDetail
  ::v-deep .detail-header-card,
  ::v-deep .detail-tabs-card {
    background: #1f1f1f;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);

    .ant-card-body { background: #1f1f1f; }
  }

  ::v-deep .detail-header .header-info h3 { color: rgba(255, 255, 255, 0.85); }

  // Ant Tabs
  ::v-deep .ant-tabs-bar { border-bottom-color: #303030; }
  ::v-deep .ant-tabs-tab { color: rgba(255, 255, 255, 0.65); }
  ::v-deep .ant-tabs-tab-active { color: var(--primary-color-active, #177ddc) !important; }
  ::v-deep .ant-tabs-ink-bar { background: var(--primary-color-active, #177ddc); }
  ::v-deep .ant-card-head { border-bottom-color: #303030; background: transparent; }
  ::v-deep .ant-card-head-title { color: rgba(255, 255, 255, 0.85); }

  // AI Banner (stays inside page so ::v-deep works)
  ::v-deep .ai-create-banner {
    border: 1px solid rgba(102, 126, 234, 0.3);

    &:hover {
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
    }
  }

  ::v-deep .ai-reason-bar {
    background: rgba(102, 126, 234, 0.1);
    border-color: rgba(102, 126, 234, 0.2);
    color: rgba(255, 255, 255, 0.65);
  }

  // BotCreateWizard
  ::v-deep .wizard-title { color: rgba(255, 255, 255, 0.85) !important; }
  ::v-deep .back-btn { color: rgba(255, 255, 255, 0.45) !important; }

  ::v-deep .step-hint {
    background: rgba(23, 125, 220, 0.1);
    color: rgba(255, 255, 255, 0.65);
  }

  ::v-deep .form-hint {
    color: rgba(255, 255, 255, 0.45);
    a { color: var(--primary-color-active, #177ddc); }
  }

  ::v-deep .confirm-section h4 { color: rgba(255, 255, 255, 0.85); }
  ::v-deep .wizard-footer { border-top-color: #303030; }

  ::v-deep .config-summary {
    .label { color: rgba(255, 255, 255, 0.45); }
    .value { color: rgba(255, 255, 255, 0.85); }
  }

  ::v-deep .dip-buy-hint { color: rgba(255, 255, 255, 0.45); }

  // Ant Steps
  ::v-deep .ant-steps-item-title { color: rgba(255, 255, 255, 0.65) !important; }
  ::v-deep .ant-steps-item-finish .ant-steps-item-title { color: rgba(255, 255, 255, 0.85) !important; }
  ::v-deep .ant-steps-item-process .ant-steps-item-title { color: rgba(255, 255, 255, 0.85) !important; }
  ::v-deep .ant-steps-item-tail::after { background: #303030 !important; }
  ::v-deep .ant-steps-item-finish .ant-steps-item-tail::after { background: var(--primary-color-active, #177ddc) !important; }

  // Ant Form
  ::v-deep .ant-form-item-label > label { color: rgba(255, 255, 255, 0.85); }
  ::v-deep .ant-form-item-label label { color: rgba(255, 255, 255, 0.85); }

  // Ant Input / Select / InputNumber
  ::v-deep .ant-input,
  ::v-deep .ant-input-number,
  ::v-deep .ant-select-selection,
  ::v-deep .ant-input-number-input {
    background: #1f1f1f !important;
    border-color: #434343 !important;
    color: rgba(255, 255, 255, 0.85) !important;
  }

  ::v-deep .ant-input::placeholder,
  ::v-deep .ant-input-number-input::placeholder {
    color: rgba(255, 255, 255, 0.3) !important;
  }

  ::v-deep .ant-select-selection__placeholder,
  ::v-deep .ant-select-search__field__placeholder {
    color: rgba(255, 255, 255, 0.3) !important;
  }

  ::v-deep .ant-select-arrow { color: rgba(255, 255, 255, 0.45); }
  ::v-deep .ant-select-selection-selected-value { color: rgba(255, 255, 255, 0.85) !important; }
  ::v-deep .ant-input-number-handler-wrap { background: #1f1f1f; border-color: #434343; }
  ::v-deep .ant-input-number-handler { color: rgba(255, 255, 255, 0.45); border-color: #434343; }

  // Ant Radio
  ::v-deep .ant-radio-wrapper { color: rgba(255, 255, 255, 0.85); }
  ::v-deep .ant-radio-inner { background: #1f1f1f; border-color: #434343; }

  // Ant Slider
  ::v-deep .ant-slider-rail { background: #434343; }
  ::v-deep .ant-slider-track { background: var(--primary-color-active, #177ddc); }

  // Ant Switch
  ::v-deep .ant-switch { background: #434343; }

  // Ant Descriptions
  ::v-deep .ant-descriptions-bordered .ant-descriptions-item-label {
    background: #1a1a1a;
    color: rgba(255, 255, 255, 0.65);
    border-color: #303030;
  }

  ::v-deep .ant-descriptions-bordered .ant-descriptions-item-content {
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.85);
    border-color: #303030;
  }

  ::v-deep .ant-descriptions-bordered .ant-descriptions-view {
    border-color: #303030;
  }

  // Ant Empty
  ::v-deep .ant-empty-description { color: rgba(255, 255, 255, 0.45); }
  ::v-deep .ant-empty-image svg { fill: rgba(255, 255, 255, 0.15); }

  // Ant Alert
  ::v-deep .ant-alert-warning {
    background: rgba(250, 173, 20, 0.08);
    border-color: rgba(250, 173, 20, 0.2);
  }

  ::v-deep .ant-alert-message { color: rgba(255, 255, 255, 0.85); }
  ::v-deep .ant-alert-description { color: rgba(255, 255, 255, 0.65); }

  // Ant Input search
  ::v-deep .ant-input-search .ant-input-suffix { color: rgba(255, 255, 255, 0.45); }

  // Ant autocomplete dropdown handled by global theme
}
</style>

<style lang="less">
.wizard-modal,
.wizard-modal-dark {
  .ant-modal-content {
    border-radius: 16px;
    overflow: hidden;
  }

  .ant-modal-body {
    padding: 0;
  }

  .ant-modal-close-x {
    width: 48px;
    height: 48px;
    line-height: 48px;
    font-size: 16px;
  }
}

.wizard-modal-dark {
  .ant-modal-content {
    background: #1f1f1f;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  }

  .ant-modal-close-x {
    color: rgba(255, 255, 255, 0.45);
  }

  .wizard-title { color: rgba(255, 255, 255, 0.85) !important; }

  .step-hint {
    background: rgba(23, 125, 220, 0.1);
    color: rgba(255, 255, 255, 0.65);
  }

  .form-hint {
    color: rgba(255, 255, 255, 0.45);
    a { color: var(--primary-color-active, #177ddc); }
  }

  .confirm-section h4 { color: rgba(255, 255, 255, 0.85); }
  .wizard-footer { border-top-color: #303030; }

  .config-summary {
    .label { color: rgba(255, 255, 255, 0.45); }
    .value { color: rgba(255, 255, 255, 0.85); }
  }

  .direction-hint,
  .capital-hint,
  .dip-buy-hint { color: rgba(255, 255, 255, 0.45) !important; }

  .ai-reason-bar {
    background: rgba(102, 126, 234, 0.1);
    border-color: rgba(102, 126, 234, 0.2);
    color: rgba(255, 255, 255, 0.65);
  }

  .ant-steps-item-title { color: rgba(255, 255, 255, 0.65) !important; }
  .ant-steps-item-finish .ant-steps-item-title { color: rgba(255, 255, 255, 0.85) !important; }
  .ant-steps-item-process .ant-steps-item-title { color: rgba(255, 255, 255, 0.85) !important; }
  .ant-steps-item-tail::after { background: #303030 !important; }
  .ant-steps-item-finish .ant-steps-item-tail::after { background: var(--primary-color-active, #177ddc) !important; }

  .ant-form-item-label > label,
  .ant-form-item-label label { color: rgba(255, 255, 255, 0.85); }

  .ant-input,
  .ant-input-number,
  .ant-select-selection,
  .ant-input-number-input {
    background: #1f1f1f !important;
    border-color: #434343 !important;
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .ant-input::placeholder,
  .ant-input-number-input::placeholder { color: rgba(255, 255, 255, 0.3) !important; }

  .ant-select-selection__placeholder,
  .ant-select-search__field__placeholder { color: rgba(255, 255, 255, 0.3) !important; }

  .ant-select-arrow { color: rgba(255, 255, 255, 0.45); }
  .ant-select-selection-selected-value { color: rgba(255, 255, 255, 0.85) !important; }
  .ant-input-number-handler-wrap { background: #1f1f1f; border-color: #434343; }
  .ant-input-number-handler { color: rgba(255, 255, 255, 0.45); border-color: #434343; }

  .ant-radio-wrapper { color: rgba(255, 255, 255, 0.85); }
  .ant-radio-inner { background: #1f1f1f; border-color: #434343; }

  .ant-slider-rail { background: #434343; }
  .ant-slider-track { background: var(--primary-color-active, #177ddc); }

  .ant-switch { background: #434343; }

  .ant-descriptions-bordered .ant-descriptions-item-label {
    background: #1a1a1a;
    color: rgba(255, 255, 255, 0.65);
    border-color: #303030;
  }

  .ant-descriptions-bordered .ant-descriptions-item-content {
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.85);
    border-color: #303030;
  }

  .ant-descriptions-bordered .ant-descriptions-view { border-color: #303030; }

  .ant-alert-warning {
    background: rgba(250, 173, 20, 0.08);
    border-color: rgba(250, 173, 20, 0.2);
  }

  .ant-alert-info {
    background: rgba(24, 144, 255, 0.12);
    border-color: rgba(24, 144, 255, 0.3);

    .ant-alert-icon {
      color: var(--primary-color-active, #177ddc);
    }
  }

  .ant-alert-message { color: rgba(255, 255, 255, 0.85); }
  .ant-alert-description { color: rgba(255, 255, 255, 0.65); }

  .bot-create-wizard.is-modal .wizard-content,
  .wizard-content {
    scrollbar-color: #434343 #1f1f1f;
    scrollbar-width: thin;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: #1f1f1f;
    }

    &::-webkit-scrollbar-thumb {
      background: #434343;
      border-radius: 4px;

      &:hover {
        background: #595959;
      }
    }
  }
}
</style>
