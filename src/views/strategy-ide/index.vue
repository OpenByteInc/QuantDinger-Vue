<template>
  <div class="strategy-ide-shell qd-workspace-page" :class="{ 'theme-dark': isDarkTheme }">
    <div class="strategy-ide-layout">
      <a-alert
        v-if="adaptedBacktestRequired"
        class="adapted-backtest-alert"
        type="warning"
        show-icon
        :message="$t('community.backtestBeforeDeployment')"
      >
        <a-button slot="action" size="small" type="primary" ghost @click="openBacktestCenter">{{ text.backtestTitle }}</a-button>
      </a-alert>
      <section class="script-panel script-panel--editor">
        <strategy-editor
          ref="scriptEditor"
          :key="editorKey"
          v-model="scriptCode"
          :is-dark="isDarkTheme"
          :visible="true"
          :user-id="userId"
          :strategy-id="currentSourceId"
          :script-source-id="currentSourceId"
          :asset-type="currentAssetType"
          :initial-template-key="scriptTemplateKey || editorInitialTemplateKey"
          :initial-param-schema="currentSourceParamSchema"
          :initial-param-values="scriptTemplateParams"
          :hidden-source="scriptCodeHidden"
          :readonly="false"
          :consume-copilot-draft="false"
          :runtime-config="runConfig"
          :runtime-exchange-options="strategyExchangeOptions"
          :runtime-symbol-options="strategySymbolOptions"
          :runtime-symbol-loading="strategySymbolLoading"
          :runtime-watchlist-count="strategyWatchlistOptions.length"
          :runtime-capabilities="strategyRuntimeContract"
          side-mode="split"
          @verified="handleStrategyVerified"
          @template-change="handleTemplateChange"
          @runtime-change="handleRuntimeConfigChange"
          @runtime-symbol-search="searchStrategySymbols"
          @runtime-symbol-change="handleRuntimeSymbolChange"
          @runtime-symbol-open="loadStrategyWatchlistOptions"
        >
          <template #toolbar>
            <div class="ide-toolbar">
              <div class="toolbar-left">
                <div class="strategy-workspace-switcher">
                  <div class="strategy-workspace-copy">
                    <strong>{{ currentWorkspaceTitle }}</strong>
                    <span>{{ currentWorkspaceDescription }}</span>
                  </div>
                  <a-radio-group
                    :value="currentAssetType"
                    button-style="solid"
                  >
                    <a-radio-button value="script" @click="handleAssetTypeChange('script')">{{ text.ctaStrategy }}</a-radio-button>
                    <a-radio-button value="portfolio_strategy" @click="handleAssetTypeChange('portfolio_strategy')">{{ text.portfolioStrategy }}</a-radio-button>
                  </a-radio-group>
                </div>
                <a-dropdown
                  :trigger="['click']"
                  placement="bottomLeft"
                  :visible="strategySourceDropdownVisible"
                  :overlay-class-name="isDarkTheme ? 'strategy-source-dropdown strategy-source-dropdown--dark' : 'strategy-source-dropdown'"
                  @visibleChange="onScriptDropdownVisibleChange"
                >
                  <a-button class="script-select strategy-source-dropdown-trigger" :loading="loadingScripts">
                    <span class="strategy-source-trigger-text">{{ selectedScriptLabel }}</span>
                    <a-icon type="down" />
                  </a-button>
                  <div slot="overlay" class="strategy-source-overlay" @mousedown.stop @click.stop>
                    <div class="strategy-source-overlay-hint">{{ $t('strategyIde.marketPicker.selectorHint') }}</div>
                    <button type="button" class="strategy-source-market-entry" @click="openStrategyMarketPicker">
                      <span><a-icon type="shop" /> {{ text.marketPickerOpen }}</span>
                      <a-icon type="right" />
                    </button>
                    <a-spin v-if="loadingScripts" size="small" class="strategy-source-overlay-loading" />
                    <div v-else-if="!scriptOptions.length" class="strategy-source-overlay-empty">
                      {{ $t('strategyIde.marketPicker.noLocalStrategies') }}
                    </div>
                    <div v-else class="strategy-source-overlay-list">
                      <button
                        v-for="item in scriptOptions"
                        :key="item.id"
                        type="button"
                        class="strategy-source-row"
                        :class="{ active: String(selectedScriptId || '') === String(item.id) }"
                        @click="selectStrategySource(item.id)"
                      >
                        <a-icon type="check" />
                        <span>{{ item.optionLabel }}</span>
                      </button>
                    </div>
                  </div>
                </a-dropdown>

                <a-tooltip :title="currentNewScriptLabel">
                  <a-button class="ide-icon-btn" @click="createNewDraft({ openTemplate: true })">
                    <a-icon type="plus" />
                  </a-button>
                </a-tooltip>
                <a-tooltip :title="text.refreshScripts">
                  <a-button class="ide-icon-btn" :loading="loadingScripts" @click="refreshSources">
                    <a-icon type="reload" />
                  </a-button>
                </a-tooltip>
                <a-tooltip :title="text.versionHistory">
                  <a-button
                    class="ide-icon-btn"
                    :disabled="!currentSourceId || scriptCodeHidden"
                    :loading="scriptVersionLoading"
                    @click="openVersionDrawer"
                  >
                    <a-icon type="history" />
                  </a-button>
                </a-tooltip>
                <a-tooltip v-if="currentSourceId" :title="text.saveAsNew">
                  <a-button
                    class="ide-icon-btn"
                    :loading="savingScriptMode === 'copy'"
                    :disabled="scriptCodeHidden || savingScript || deletingScript"
                    @click="saveScript(true)"
                  >
                    <a-icon type="copy" />
                  </a-button>
                </a-tooltip>
                <a-tooltip v-if="currentSourceId" :title="text.publishScript">
                  <a-button
                    class="ide-icon-btn"
                    :loading="savingScriptMode === 'publish' || publishingScript"
                    :disabled="scriptCodeHidden || savingScript || deletingScript"
                    @click="openPublishModal"
                  >
                    <a-icon type="shop" />
                  </a-button>
                </a-tooltip>
                <a-tooltip v-if="currentSourceId" :title="text.deleteScript">
                  <a-button
                    class="ide-icon-btn ide-icon-btn--danger"
                    :loading="deletingScript"
                    :disabled="savingScript"
                    @click="deleteCurrentSource"
                  >
                    <a-icon type="delete" />
                  </a-button>
                </a-tooltip>
                <a-button
                  class="script-save-button"
                  type="primary"
                  :loading="savingScriptMode === 'save'"
                  :disabled="scriptCodeHidden || savingScript || deletingScript || !hasUnsavedScriptChanges"
                  @click="saveScript(false)"
                >
                  {{ text.saveScript }}
                </a-button>
              </div>

              <div class="toolbar-right">
                <a-button
                  v-if="currentAssetType === 'portfolio_strategy'"
                  class="universe-library-button"
                  :class="{ 'universe-library-button--selected': currentAssetType === 'portfolio_strategy' && !!selectedUniverseId }"
                  @click="showUniverseLibrary = true"
                >
                  <a-icon type="cluster" />
                  {{ currentUniverseSummary || text.universeLibrary }}
                </a-button>
                <a-button
                  v-if="currentAssetType === 'script'"
                  class="robot-template-button"
                  @click="showRobotBuilder = true"
                >
                  <a-icon type="control" />
                  {{ text.robotTemplates }}
                </a-button>
                <a-button class="factor-library-button" @click="showFactorLibrary = true">
                  <a-icon type="database" />
                  {{ text.factorLibrary }}
                </a-button>
                <a-button
                  v-if="currentAssetType === 'script'"
                  class="indicator-convert-button"
                  :loading="indicatorConvertIndicatorLoading"
                  @click="openIndicatorConvertPicker"
                >
                  <a-icon type="branches" />
                  {{ text.indicatorConvertEntry }}
                </a-button>
                <a-button class="script-backtest-button" @click="openBacktestCenter">
                  <a-icon type="bar-chart" />
                  {{ text.backtestTitle }}
                </a-button>
                <a-button
                  class="script-live-button"
                  type="primary"
                  :loading="savingScriptMode === 'live'"
                  :disabled="(!currentSourceId && scriptCodeHidden) || (savingScript && savingScriptMode !== 'live') || deletingScript"
                  @click="createLiveFromScript"
                >
                  <a-icon type="thunderbolt" />
                  {{ text.createLive }}
                </a-button>
              </div>
            </div>
          </template>

          <template #ai-workspace>
            <div
              class="strategy-ai-workspace"
              :class="{ 'strategy-ai-workspace--collapsed': !aiPanelExpanded }"
            >
              <div class="strategy-ai-header" @click="toggleStrategyAiPanel">
                <div class="strategy-ai-header__title">
                  <a-icon type="robot" />
                  <strong>{{ aiWorkspaceText.title }}</strong>
                  <span class="strategy-ai-contract-badge">
                    {{ currentAssetType === 'portfolio_strategy' ? aiWorkspaceText.portfolioContract : aiWorkspaceText.ctaContract }}
                  </span>
                  <span class="strategy-ai-memory-badge">
                    <a-icon :type="scriptCodeHidden ? 'lock' : (currentSourceId ? 'link' : 'clock-circle')" />
                    {{ scriptCodeHidden ? aiWorkspaceText.hiddenSourceBadge : (currentSourceId ? aiWorkspaceText.memoryActive : aiWorkspaceText.temporaryMemory) }}
                  </span>
                </div>
                <div class="strategy-ai-header__actions">
                  <a-button
                    v-if="!scriptCodeHidden && currentSourceId && (aiMessages.length || aiCandidate)"
                    type="link"
                    size="small"
                    :disabled="aiStrategyGenerating"
                    @click.stop="clearStrategyAiConversation"
                  >{{ aiWorkspaceText.clear }}</a-button>
                  <a-icon :type="aiPanelExpanded ? 'up' : 'down'" />
                </div>
              </div>

              <div v-show="aiPanelExpanded" class="strategy-ai-body">
                <div v-if="scriptCodeHidden" class="strategy-ai-locked">
                  <a-icon type="lock" />
                  <strong>{{ aiWorkspaceText.hiddenSourceTitle }}</strong>
                  <span>{{ aiWorkspaceText.hiddenSourceUnavailable }}</span>
                </div>
                <template v-else>
                  <div ref="strategyAiConversation" class="strategy-ai-conversation">
                    <div v-if="aiWorkspaceLoading" class="strategy-ai-empty">
                      <a-icon type="loading" spin />
                      <span>{{ aiWorkspaceText.loading }}</span>
                    </div>
                    <div v-else-if="!aiMessages.length" class="strategy-ai-empty">
                      <a-icon type="message" />
                      <strong>{{ aiWorkspaceText.emptyTitle }}</strong>
                      <span>{{ currentAssetType === 'portfolio_strategy' ? aiWorkspaceText.portfolioEmptyDesc : aiWorkspaceText.ctaEmptyDesc }}</span>
                      <div class="strategy-ai-quick-prompts">
                        <button
                          v-for="item in aiStrategyQuickPrompts"
                          :key="item.label"
                          type="button"
                          @click="useStrategyAiQuickPrompt(item)"
                        >{{ item.label }}</button>
                      </div>
                    </div>

                    <div
                      v-for="messageItem in aiMessages"
                      :key="messageItem.localId || messageItem.id"
                      :class="[
                        'strategy-ai-message',
                        `strategy-ai-message--${messageItem.role || 'assistant'}`,
                        { 'strategy-ai-message--error': messageItem.message_type === 'error' }
                      ]"
                    >
                      <div class="strategy-ai-message__role">
                        {{ messageItem.role === 'user' ? aiWorkspaceText.you : 'AI' }}
                        <span
                          v-if="messageItem.role !== 'user'"
                          class="strategy-ai-message__badge"
                          :class="{ 'strategy-ai-message__badge--error': messageItem.message_type === 'error' }"
                        >
                          {{ messageItem.message_type === 'candidate' ? aiWorkspaceText.candidateBadge : (messageItem.message_type === 'error' ? aiWorkspaceText.errorBadge : aiWorkspaceText.discussionBadge) }}
                        </span>
                      </div>
                      <div class="strategy-ai-message__content" v-html="renderStrategyAiMessage(messageItem)" />
                      <div
                        v-if="isActiveStrategyCandidateMessage(messageItem)"
                        class="strategy-ai-candidate"
                        :class="{ 'strategy-ai-candidate--warning': !aiCandidateValidationPassed }"
                      >
                        <div>
                          <a-icon :type="aiCandidateValidationPassed ? 'check-circle' : 'exclamation-circle'" />
                          <span>{{ aiCandidateValidationPassed ? aiWorkspaceText.candidateValid : aiWorkspaceText.candidateNeedsReview }}</span>
                        </div>
                        <div class="strategy-ai-candidate__actions">
                          <a-button size="small" @click="previewStrategyAiCandidate"><a-icon type="eye" /> {{ aiWorkspaceText.preview }}</a-button>
                          <a-button size="small" type="primary" :disabled="!aiCandidateValidationPassed" @click="applyStrategyAiCandidate"><a-icon type="check" /> {{ aiWorkspaceText.apply }}</a-button>
                          <a-button size="small" type="link" @click="discardStrategyAiCandidate">{{ aiWorkspaceText.discard }}</a-button>
                        </div>
                      </div>
                    </div>

                    <div v-if="aiStrategyGenerating" class="strategy-ai-message strategy-ai-message--assistant strategy-ai-message--thinking">
                      <div class="strategy-ai-message__role">AI</div>
                      <div class="strategy-ai-message__content"><a-icon type="loading" spin /> {{ aiWorkspaceText.thinking }}</div>
                    </div>
                  </div>

                  <div class="strategy-ai-composer">
                    <a-textarea
                      ref="strategyAiPrompt"
                      v-model="aiStrategyPrompt"
                      :rows="2"
                      :placeholder="aiWorkspaceText.placeholder"
                      :disabled="aiStrategyGenerating || scriptCodeHidden"
                      @input="aiInteractionMode = 'auto'"
                      @pressEnter="handleStrategyAiEnter"
                    />
                    <div class="strategy-ai-composer__footer">
                      <span>{{ aiWorkspaceText.shortcut }}</span>
                      <a-button
                        type="primary"
                        class="strategy-ai-send"
                        :loading="aiStrategyGenerating"
                        :disabled="!String(aiStrategyPrompt || '').trim() || scriptCodeHidden"
                        @click="sendStrategyAiTurn"
                      >{{ aiWorkspaceText.send }}</a-button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>

        </strategy-editor>
      </section>
    </div>

    <a-modal
      v-model="aiPreviewVisible"
      :title="aiWorkspaceText.previewTitle"
      :footer="null"
      :wrap-class-name="isDarkTheme ? 'strategy-ai-preview-modal strategy-ai-preview-modal--dark' : 'strategy-ai-preview-modal'"
      width="920px"
    >
      <div class="strategy-ai-preview-toolbar">
        <span>{{ aiWorkspaceText.previewHint }}</span>
        <div>
          <a-button size="small" @click="aiPreviewVisible = false">{{ text.cancel }}</a-button>
          <a-button size="small" type="primary" :disabled="!aiCandidateValidationPassed" @click="applyStrategyAiCandidate">{{ aiWorkspaceText.apply }}</a-button>
        </div>
      </div>
      <pre class="strategy-ai-code-preview">{{ (aiCandidate && aiCandidate.code) || '' }}</pre>
    </a-modal>

    <a-modal
      :visible="showPublishModal"
      :title="text.publishModalTitle"
      :width="620"
      :confirmLoading="publishingScript"
      :ok-text="text.publishConfirm"
      :cancel-text="text.cancel"
      :ok-button-props="{ props: { disabled: publishBacktestStatus !== 'passed' } }"
      :wrap-class-name="isDarkTheme ? 'script-publish-modal script-publish-modal--dark' : 'script-publish-modal'"
      @ok="confirmPublish"
      @cancel="closePublishModal"
    >
      <div class="publish-form">
        <div class="publish-summary-card">
          <div class="publish-summary-icon">
            <a-icon type="shop" />
          </div>
          <div class="publish-summary-main">
            <div class="publish-summary-label">{{ text.publishModalTitle }}</div>
            <div class="publish-summary-name">{{ publishForm.name || deriveScriptName() }}</div>
          </div>
          <a-tag class="publish-summary-tag" color="red">{{ text.marketTag }}</a-tag>
        </div>

        <div class="publish-note">
          <a-icon type="info-circle" />
          <span>{{ text.publishHint }}</span>
        </div>

        <div class="publish-backtest-gate" :class="`is-${publishBacktestStatus}`">
          <div class="publish-backtest-gate__icon">
            <a-icon
              :type="publishBacktestStatus === 'checking' ? 'loading' : (publishBacktestStatus === 'passed' ? 'check-circle' : 'experiment')"
              :spin="publishBacktestStatus === 'checking'"
            />
          </div>
          <div class="publish-backtest-gate__copy">
            <strong>
              {{ publishBacktestStatus === 'checking'
                ? text.publishBacktestChecking
                : (publishBacktestStatus === 'passed' ? text.publishBacktestPassed : text.publishBacktestRequired) }}
            </strong>
            <span v-if="publishBacktestStatus === 'required'">{{ text.publishBacktestRequiredHint }}</span>
          </div>
          <a-button
            v-if="publishBacktestStatus === 'required'"
            class="publish-backtest-gate__button"
            type="primary"
            @click="goToBacktestFromPublish"
          >
            <a-icon type="bar-chart" />
            {{ text.publishGoBacktest }}
          </a-button>
        </div>

        <div v-if="publishContractPreview" class="publish-contract-preview">
          <div class="publish-contract-preview__head">
            <strong>{{ $t('community.publishApplicability') }}</strong>
            <a-tag :color="publishContractPreview.binding_mode === 'parameterized' ? 'green' : 'orange'">
              {{ $t(`community.binding.${publishContractPreview.binding_mode || 'unknown'}`) }}
            </a-tag>
          </div>
          <div class="publish-contract-preview__grid">
            <span><small>{{ $t('community.filterMarket') }}</small><b>{{ (publishContractPreview.markets || []).join(' · ') || '—' }}</b></span>
            <span><small>{{ $t('community.boundTo') }}</small><b>{{ (publishContractPreview.bound_instruments || []).join(' · ') || publishContractPreview.universe_reference || '—' }}</b></span>
            <span><small>{{ $t('community.filterTimeframe') }}</small><b>{{ (publishContractPreview.frequencies || []).join(' · ') || '—' }}</b></span>
          </div>
          <p>{{ $t('community.publishApplicabilityHint') }}</p>
        </div>

        <div class="publish-section">
          <div class="publish-section-title">{{ text.publishName }}</div>
          <a-input v-model="publishForm.name" :placeholder="text.publishNamePlaceholder" />
        </div>

        <div class="publish-section">
          <div class="publish-section-title">{{ text.publishPricingType }}</div>
          <a-radio-group v-model="publishForm.pricingType" class="publish-pricing-group">
            <a-radio-button value="free">
              <a-icon type="gift" />
              {{ text.publishFree }}
            </a-radio-button>
            <a-radio-button value="paid">
              <a-icon type="pay-circle" />
              {{ text.publishPaid }}
            </a-radio-button>
          </a-radio-group>
          <div v-if="publishForm.pricingType === 'paid'" class="publish-price-box">
            <div class="field-label">{{ text.publishPrice }}</div>
            <a-input-number v-model="publishForm.price" :min="0" :precision="2" class="publish-price-input" />
          </div>
        </div>

        <div class="publish-option-grid">
          <div class="publish-option-card" :class="{ active: publishForm.pricingType === 'paid' && publishForm.vipFree }">
            <div class="publish-option-head">
              <span>{{ text.publishVipFree }}</span>
              <a-switch v-model="publishForm.vipFree" :disabled="publishForm.pricingType !== 'paid'" />
            </div>
            <div class="publish-hint">{{ text.publishVipFreeHint }}</div>
          </div>
          <div class="publish-option-card" :class="{ active: publishForm.codeHidden }">
            <div class="publish-option-head">
              <span>{{ text.publishHideCode }}</span>
              <a-switch v-model="publishForm.codeHidden" />
            </div>
            <div class="publish-hint">{{ text.publishHideCodeHint }}</div>
          </div>
        </div>

        <div class="publish-section">
          <div class="publish-section-title">{{ text.publishDescription }}</div>
          <a-textarea
            v-model="publishForm.description"
            class="publish-description-input"
            :placeholder="text.publishDescriptionPlaceholder"
            :auto-size="{ minRows: 4, maxRows: 7 }"
          />
        </div>
      </div>
    </a-modal>

    <a-modal
      :visible="showIndicatorConvertModal"
      :title="text.indicatorConvertTitle"
      :confirmLoading="indicatorConvertLoading"
      :ok-text="text.indicatorConvertConfirm"
      :cancel-text="text.cancel"
      :wrap-class-name="isDarkTheme ? 'indicator-convert-modal indicator-convert-modal--dark' : 'indicator-convert-modal'"
      @ok="confirmIndicatorToStrategy"
      @cancel="closeIndicatorConvertModal"
    >
      <div class="indicator-convert-box">
        <div class="indicator-convert-selector">
          <label class="field-label">{{ text.indicatorConvertSelect }}</label>
          <a-select
            v-model="selectedIndicatorConvertId"
            show-search
            option-filter-prop="children"
            style="width: 100%"
            :loading="indicatorConvertIndicatorLoading"
            :placeholder="text.indicatorConvertSelectPlaceholder"
            @change="handleIndicatorConvertSelect"
          >
            <a-select-option
              v-for="item in indicatorConvertIndicators"
              :key="String(item.indicatorId)"
              :value="String(item.indicatorId)"
              :disabled="item.codeHidden || !item.code"
            >
              {{ item.name || text.defaultIndicatorName }}
              <template v-if="item.symbol"> - {{ item.symbol }}</template>
              <template v-if="item.codeHidden || !item.code"> - {{ text.indicatorConvertNoCodeShort }}</template>
            </a-select-option>
          </a-select>
        </div>

        <div v-if="indicatorConvertContext" class="indicator-convert-current">
          <div>
            <span>{{ text.indicatorConvertSource }}</span>
            <strong>{{ indicatorConvertContext.name || text.defaultIndicatorName }}</strong>
          </div>
          <small>
            {{ marketLabel(indicatorConvertContext.market) }}
            <template v-if="indicatorConvertContext.symbol"> / {{ indicatorConvertContext.symbol }}</template>
            <template v-if="indicatorConvertContext.timeframe"> / {{ indicatorConvertContext.timeframe }}</template>
          </small>
        </div>

        <a-alert
          v-else
          type="info"
          show-icon
          :message="text.indicatorConvertSelectFirst"
        />

        <label class="field-label field-label--spaced">{{ text.indicatorConvertInstruction }}</label>
        <a-textarea
          v-model="indicatorConvertInstruction"
          :auto-size="{ minRows: 5, maxRows: 8 }"
          :placeholder="text.indicatorConvertPlaceholder"
        />
        <div class="indicator-convert-note">
          <a-icon type="info-circle" />
          <span>{{ text.indicatorConvertBoundary }}</span>
        </div>
        <a-alert
          v-if="indicatorConvertError"
          type="error"
          show-icon
          :message="indicatorConvertError"
        />
      </div>
    </a-modal>

    <factor-library-modal
      :visible="showFactorLibrary"
      :is-dark="isDarkTheme"
      :asset-type="currentAssetType"
      @close="showFactorLibrary = false"
    />

    <universe-library-modal
      :visible="showUniverseLibrary"
      :is-dark="isDarkTheme"
      :asset-type="currentAssetType"
      :selected-universe-id="selectedUniverseId"
      @use="handleUniverseUse"
      @deleted="handleUniverseDeleted"
      @close="showUniverseLibrary = false"
    />

    <indicator-market-picker
      :visible="strategyMarketVisible"
      :dark="isDarkTheme"
      :get-container="strategyModalGetContainer"
      asset-mode="strategy"
      :initial-strategy-type="currentAssetType === 'portfolio_strategy' ? 'portfolio' : 'cta'"
      @close="strategyMarketVisible = false"
      @acquired="handleMarketStrategyAcquired"
    />

    <a-drawer
      :visible="showRobotBuilder"
      :title="text.robotTemplates"
      width="min(1540px, 96vw)"
      :destroy-on-close="true"
      :wrap-class-name="isDarkTheme ? 'robot-builder-drawer robot-builder-drawer--dark' : 'robot-builder-drawer'"
      @close="showRobotBuilder = false"
    >
      <div class="robot-builder-intro">{{ text.robotTemplatesDesc }}</div>
      <executor-strategies embedded @generated="applyGeneratedRobot" />
    </a-drawer>

    <a-drawer
      :visible="showVersionDrawer"
      :title="text.versionHistory"
      :width="640"
      :wrap-class-name="isDarkTheme ? 'script-version-drawer script-version-drawer--dark' : 'script-version-drawer'"
      @close="showVersionDrawer = false"
    >
      <a-spin :spinning="scriptVersionLoading">
        <div class="code-version-toolbar">
          <span>{{ currentSourceName || text.defaultName }}</span>
          <a-button size="small" icon="reload" @click="loadScriptVersions">{{ text.refreshScripts }}</a-button>
        </div>
        <a-empty v-if="!scriptVersions.length" :description="text.versionEmpty" />
        <div v-else class="code-version-list">
          <div v-for="item in scriptVersions" :key="item.id" class="code-version-item">
            <div class="code-version-item__main">
              <strong>{{ text.versionNo.replace('{version}', item.version_no) }}</strong>
              <span>{{ item.name || currentSourceName }}</span>
              <small>{{ formatTime(item.created_at) }}</small>
            </div>
            <div class="code-version-item__actions">
              <a-button
                size="small"
                :disabled="scriptCodeHidden || item.code_hidden || item.hidden_source"
                @click="previewScriptVersion(item)"
              >
                {{ text.versionPreview }}
              </a-button>
              <a-button
                size="small"
                type="primary"
                :loading="restoringScriptVersionId === item.id"
                :disabled="scriptCodeHidden || item.code_hidden || item.hidden_source || item.restore_disabled"
                @click="confirmRestoreScriptVersion(item)"
              >
                {{ text.versionRestore }}
              </a-button>
            </div>
          </div>
        </div>
      </a-spin>

      <div v-if="scriptVersionPreview" class="code-version-preview">
        <div class="code-version-preview__head">
          <strong>{{ text.versionPreviewTitle.replace('{version}', scriptVersionPreview.version_no) }}</strong>
          <a-button size="small" icon="close" @click="scriptVersionPreview = null" />
        </div>
        <div v-if="scriptVersionPreview.code_hidden || scriptVersionPreview.hidden_source" class="code-version-hidden">
          <a-icon type="lock" />
          <strong>{{ text.hiddenScriptTitle }}</strong>
          <span>{{ text.versionHiddenBlocked }}</span>
        </div>
        <pre v-else>{{ scriptVersionPreview.code }}</pre>
      </div>
    </a-drawer>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import StrategyEditor from './components/StrategyEditor.vue'
import FactorLibraryModal from './FactorLibraryModal.vue'
import UniverseLibraryModal from './UniverseLibraryModal.vue'
import ExecutorStrategies from '@/views/executor-strategies'
import IndicatorMarketPicker from '@/views/indicator-ide/components/IndicatorMarketPicker.vue'
import { resolveIndicatorStrategyContext } from '@/utils/indicatorStrategyContext'
import { renderSafeMarkdown } from '@/utils/safeMarkdown'
import { applyExactCodeEdits, candidateCodeEditOperations } from '@/utils/codeEdits'
import { getWatchlist, searchSymbols } from '@/api/market'
import { CRYPTO_EXCHANGE_IDS, normalizeExchangeId, normalizeMarketType } from '@/utils/marketContext'
import {
  applyStrategyRuntimeConfigToCode,
  extractStrategyRuntimeContractFromCode,
  sanitizeRuntimeConfigForSource
} from './components/scriptTemplateCatalog'
import {
  aiGenerateStrategy,
  clearStrategyAiWorkspace,
  createScriptSource,
  deleteScriptSource,
  getIndicatorListForStrategy,
  getStrategyAiWorkspace,
  getScriptSourcePublishReadiness,
  getScriptSourceDetail,
  getScriptSourceList,
  getScriptSourceVersion,
  getScriptSourceVersions,
  publishScriptSource,
  restoreScriptSourceVersion,
  runStrategyAiTurn,
  setStrategyAiCandidateStatus,
  updateScriptSource,
  verifyStrategyCode
} from '@/api/strategy'

const EMPTY_DRAFT_CODE = ''
const createDefaultRunConfig = () => ({
  market_category: 'Crypto',
  exchange_id: 'binance',
  symbol: 'BTC/USDT',
  timeframe: '1m',
  market_type: 'swap',
  trade_direction: 'long',
  initial_capital: 10000,
  leverage: 5
})

export default {
  name: 'StrategyIde',
  components: {
    StrategyEditor,
    FactorLibraryModal,
    UniverseLibraryModal,
    ExecutorStrategies,
    IndicatorMarketPicker
  },
  data () {
    return {
      scriptSources: [],
      loadingScripts: false,
      selectedScriptId: undefined,
      strategySourceDropdownVisible: false,
      currentSourceId: null,
      currentSource: null,
      currentAssetType: 'script',
      scriptCode: EMPTY_DRAFT_CODE,
      scriptCodeHidden: false,
      scriptTemplateKey: '',
      scriptTemplateParams: {},
      scriptParamSchema: {},
      editorInitialTemplateKey: '',
      editorKeySeed: 0,
      scriptVerified: false,
      savingScript: false,
      savingScriptMode: '',
      deletingScript: false,
      publishingScript: false,
      showPublishModal: false,
      publishBacktestStatus: 'idle',
      publishForm: {
        name: '',
        description: '',
        pricingType: 'free',
        price: 0,
        vipFree: false,
        codeHidden: false
      },
      publishContractPreview: null,
      showVersionDrawer: false,
      scriptVersionLoading: false,
      scriptVersions: [],
      scriptVersionPreview: null,
      restoringScriptVersionId: null,
      showFactorLibrary: false,
      showUniverseLibrary: false,
      showRobotBuilder: false,
      strategyMarketVisible: false,
      aiPanelExpanded: true,
      aiWorkspaceLoading: false,
      aiWorkspaceLoadToken: 0,
      aiThread: null,
      aiMessages: [],
      aiCandidate: null,
      aiPreviewVisible: false,
      aiStrategyPrompt: '',
      aiStrategyGenerating: false,
      aiInteractionMode: 'auto',
      aiRequestBaseCode: '',
      strategyValidation: null,
      showIndicatorConvertModal: false,
      indicatorConvertLoading: false,
      indicatorConvertIndicatorLoading: false,
      indicatorConvertIndicators: [],
      selectedIndicatorConvertId: undefined,
      indicatorConvertContext: null,
      indicatorConvertInstruction: '',
      indicatorConvertError: '',
      runConfig: createDefaultRunConfig(),
      strategySymbolOptions: [],
      strategyWatchlistOptions: [],
      strategySymbolLoading: false,
      strategyWatchlistLoading: false,
      strategySymbolSearchTimer: null,
      lastSavedSnapshot: ''
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      const body = typeof document !== 'undefined' ? document.body : null
      return this.navTheme === 'dark' ||
        this.navTheme === 'realdark' ||
        !!(body && (body.classList.contains('dark') || body.classList.contains('realdark')))
    },
    userId () {
      const userInfo = this.$store && this.$store.getters && this.$store.getters.userInfo
      return (userInfo && userInfo.id) || 1
    },
    adaptedBacktestRequired () {
      const metadata = this.parseObject(this.currentSource && this.currentSource.metadata)
      const adaptation = this.parseObject(metadata.marketplace_adaptation)
      return String((this.$route.query || {}).requiresBacktest || '') === '1' || !!adaptation.requires_backtest
    },
    editorKey () {
      return `script-editor-${this.currentSourceId || 'draft'}-${this.editorKeySeed}`
    },
    currentSourceName () {
      return (this.currentSource && (this.currentSource.name || this.currentSource.strategy_name)) ||
        this.extractScriptMetadataFromCode(this.scriptCode).name ||
        ''
    },
    currentSourceParamSchema () {
      if (this.scriptParamSchema && Array.isArray(this.scriptParamSchema.params) && this.scriptParamSchema.params.length) {
        return this.scriptParamSchema
      }
      const source = this.currentSource || {}
      const direct = this.parseObject(source.param_schema)
      if (Array.isArray(direct.params) && direct.params.length) return direct
      if (Array.isArray(source.params) && source.params.length) return { params: source.params }
      const metadata = this.parseObject(source.metadata)
      const metaSchema = this.parseObject(metadata.param_schema)
      if (Array.isArray(metaSchema.params) && metaSchema.params.length) return metaSchema
      return direct
    },
    allScriptOptions () {
      return (this.scriptSources || []).map(item => {
        const id = this.getScriptSourceId(item)
        return {
          ...item,
          id,
          optionLabel: item.name || item.strategy_name || `Script #${id}`
        }
      }).filter(item => item.id)
    },
    scriptOptions () {
      return this.allScriptOptions.filter(item => item.asset_type === this.currentAssetType)
    },
    selectedScriptLabel () {
      const selected = this.scriptOptions.find(item => String(item.id) === String(this.selectedScriptId || ''))
      return selected ? selected.optionLabel : this.text.selectScriptPlaceholder
    },
    selectedUniverseId () {
      return Number(this.runConfig && (this.runConfig.universe_id || this.runConfig.universeId)) || undefined
    },
    currentUniverseSummary () {
      if (this.currentAssetType !== 'portfolio_strategy' || !this.selectedUniverseId) return ''
      const label = String((this.runConfig && (this.runConfig.universe_name || this.runConfig.universeName || this.runConfig.universe_code || this.runConfig.universeCode)) || this.selectedUniverseId)
      return this.text.universeSelected.replace('{name}', label)
    },
    currentWorkspaceTitle () {
      return this.currentAssetType === 'portfolio_strategy' ? this.text.portfolioWorkspaceTitle : this.text.ctaWorkspaceTitle
    },
    currentWorkspaceDescription () {
      return this.currentAssetType === 'portfolio_strategy' ? this.text.portfolioWorkspaceDescription : this.text.ctaWorkspaceDescription
    },
    strategyExchangeOptions () {
      return CRYPTO_EXCHANGE_IDS.map(value => ({ value, label: value.toUpperCase() }))
    },
    strategyRuntimeContract () {
      if (this.currentAssetType !== 'script' || this.scriptCodeHidden) {
        return { config: {}, hasControls: false }
      }
      return extractStrategyRuntimeContractFromCode(this.scriptCode)
    },
    currentNewScriptLabel () {
      return this.currentAssetType === 'portfolio_strategy' ? this.text.newPortfolioStrategy : this.text.newCtaStrategy
    },
    aiCandidateValidationPassed () {
      return !!(this.aiCandidate && this.aiCandidate.validation && this.aiCandidate.validation.success)
    },
    aiStrategyQuickPrompts () {
      const prefix = 'strategyIde.aiWorkspace.quick.'
      const keys = this.currentAssetType === 'portfolio_strategy'
        ? ['portfolioCreate', 'portfolioExplain', 'portfolioRisk', 'portfolioFix', 'portfolioBacktest']
        : ['ctaCreate', 'ctaExplain', 'ctaRisk', 'ctaFix', 'ctaBacktest']
      return keys.map((key, index) => ({
        label: this.$t(`${prefix}${key}`),
        mode: index === 1 ? 'discussion' : 'modify'
      }))
    },
    aiWorkspaceText () {
      const keys = [
        'title', 'resize', 'ctaContract', 'portfolioContract', 'memoryActive', 'temporaryMemory', 'clear',
        'loading', 'emptyTitle', 'ctaEmptyDesc', 'portfolioEmptyDesc', 'you', 'candidateBadge',
        'discussionBadge', 'errorBadge', 'candidateValid', 'candidateNeedsReview', 'preview', 'apply', 'discard',
        'thinking', 'placeholder', 'shortcut', 'send', 'checksTab',
        'checkPassed', 'checkPassedDesc', 'checkPending', 'checkPendingDesc', 'frequencies', 'instruments',
        'runCheck', 'previewTitle', 'previewHint', 'clearConfirm', 'candidateReady', 'candidateApplied',
        'candidateDiscarded', 'editorChangedTitle', 'editorChangedDesc', 'sendFailed', 'temporaryHint',
        'hiddenSourceBadge', 'hiddenSourceTitle', 'hiddenSourceUnavailable'
      ]
      return keys.reduce((acc, key) => {
        acc[key] = this.$t(`strategyIde.aiWorkspace.${key}`)
        return acc
      }, {})
    },
    aiStrategyText () {
      const t = key => this.$t(`strategyIde.aiGenerate.${key}`)
      return {
        title: t('title'),
        generate: t('generate'),
        hint: t('hint'),
        placeholder: t('placeholder'),
        success: t('success'),
        failed: t('failed')
      }
    },
    hasUnsavedScriptChanges () {
      if (this.scriptCodeHidden) return false
      if (!this.currentSourceId) return !!String(this.scriptCode || '').trim()
      return this.lastSavedSnapshot !== this.scriptSnapshot()
    },
    text () {
      return [
        'selectScriptLabel',
        'selectScriptPlaceholder',
        'ctaStrategy',
        'portfolioStrategy',
        'newScript',
        'marketPickerOpen',
        'refreshScripts',
        'saveScript',
        'saveAsNew',
        'publishScript',
        'deleteScript',
        'createLive',
        'backtestTitle',
        'cancel',
        'defaultName',
        'autoNameSuffix',
        'codeRequired',
        'hiddenScriptTitle',
        'hiddenScriptDesc',
        'loadScriptsFailed',
        'loadScriptFailed',
        'saveSuccess',
        'saveFailed',
        'deleteSuccess',
        'deleteFailed',
        'deleteConfirmTitle',
        'deleteConfirmDesc',
        'runningEditBlocked',
        'verifyPassed',
        'verifyBlocked',
        'verifyFailed',
        'publishSuccess',
        'publishUpdateSuccess',
        'publishFailed',
        'publishBacktestRequired',
        'publishBacktestChecking',
        'publishBacktestPassed',
        'publishBacktestRequiredHint',
        'publishGoBacktest',
        'publishModalTitle',
        'publishConfirm',
        'marketTag',
        'publishHint',
        'publishName',
        'publishNamePlaceholder',
        'publishPricingType',
        'publishFree',
        'publishPaid',
        'publishPrice',
        'publishDescription',
        'publishDescriptionPlaceholder',
        'priceRequired',
        'publishVipFree',
        'publishVipFreeHint',
        'publishHideCode',
        'publishHideCodeHint',
        'versionHistory',
        'versionEmpty',
        'versionNo',
        'versionPreview',
        'versionRestore',
        'versionRestoreTitle',
        'versionRestoreContent',
        'versionPreviewTitle',
        'versionRestored',
        'versionHiddenBlocked',
        'versionLoadFailed',
        'versionRestoreFailed',
        'indicatorConvertEntry',
        'indicatorConvertTitle',
        'indicatorConvertConfirm',
        'indicatorConvertSelect',
        'indicatorConvertSelectPlaceholder',
        'indicatorConvertSelectFirst',
        'indicatorConvertSource',
        'indicatorConvertInstruction',
        'indicatorConvertPlaceholder',
        'indicatorConvertBoundary',
        'indicatorConvertNoCodeShort',
        'indicatorConvertNoCode',
        'indicatorConvertHiddenBlocked',
        'indicatorConvertFailed',
        'indicatorConvertSuccess',
        'defaultIndicatorName',
        'noChangesToSave',
        'factorLibrary',
        'universeLibrary',
        'universeSelected',
        'workspaceLabel',
        'ctaWorkspaceTitle',
        'ctaWorkspaceDescription',
        'portfolioWorkspaceTitle',
        'portfolioWorkspaceDescription',
        'newCtaStrategy',
        'newPortfolioStrategy',
        'switchWorkspaceTitle',
        'switchWorkspaceContent',
        'universeApplied',
        'universeDeleted',
        'robotTemplates',
        'robotTemplatesDesc',
        'robotGenerated'
      ].reduce((acc, key) => {
        acc[key] = this.$t(`strategyIde.${key}`)
        return acc
      }, {})
    }
  },
  watch: {
    scriptCode (value) {
      this.scriptVerified = false
      this.strategyValidation = null
      this.syncRunConfigFromCode(value)
    },
    currentSourceId (value) {
      this.loadStrategyAiWorkspace(value)
    },
    scriptCodeHidden (hidden) {
      if (hidden) this.resetStrategyAiWorkspace()
    },
    currentAssetType () {
      // CTA and portfolio workspaces have different contracts and prompt intent.
      // Never carry a half-written request across the boundary.
      this.aiStrategyPrompt = ''
      this.aiInteractionMode = 'auto'
      if (this.currentSourceId) this.loadStrategyAiWorkspace(this.currentSourceId)
    },
    '$route.query.sourceId' () {
      this.applyStrategyRouteSource()
    }
  },
  mounted () {
    this._saveShortcut = (event) => this.handleSaveShortcut(event)
    window.addEventListener('keydown', this._saveShortcut, true)
    this._initialPagePromise = this.initPage()
    this.initializeStrategyBuilderOptions()
  },
  activated () {
    if (this._saveShortcut) {
      window.addEventListener('keydown', this._saveShortcut, true)
    }
    this.applyStrategyRouteSource()
    this.initializeStrategyBuilderOptions()
  },
  deactivated () {
    if (this._saveShortcut) {
      window.removeEventListener('keydown', this._saveShortcut, true)
    }
  },
  beforeDestroy () {
    if (this.strategySymbolSearchTimer) clearTimeout(this.strategySymbolSearchTimer)
    if (this._saveShortcut) {
      window.removeEventListener('keydown', this._saveShortcut, true)
      this._saveShortcut = null
    }
  },
  methods: {
    strategyModalGetContainer () {
      return document.body
    },
    openStrategyMarketPicker () {
      this.strategySourceDropdownVisible = false
      this.strategyMarketVisible = true
    },
    async handleMarketStrategyAcquired ({ item, result }) {
      const payload = result || {}
      const sourceId = payload.script_source_id || payload.source_script_source_id ||
        (item && item.source_script_source_id)
      await this.loadSources()
      const local = sourceId
        ? this.allScriptOptions.find(source => String(source.id) === String(sourceId))
        : this.allScriptOptions.find(source => Number(source.source_marketplace_indicator_id) === Number(item && item.id))
      if (!local) {
        this.$message.warning(this.text.loadScriptFailed)
        return
      }
      this.strategyMarketVisible = false
      await this.openSource(local.id, { updateRoute: true })
    },
    syncRunConfigFromCode (code = this.scriptCode) {
      if (this.currentAssetType !== 'script' || this.scriptCodeHidden) return
      const inferred = extractStrategyRuntimeContractFromCode(code).config
      this.runConfig = {
        ...sanitizeRuntimeConfigForSource(this.runConfig, code),
        ...inferred
      }
    },
    async initializeStrategyBuilderOptions () {
      await this.loadStrategyWatchlistOptions()
      this.ensureCurrentSymbolOption()
    },
    async loadStrategyWatchlistOptions () {
      if (this.strategyWatchlistLoading) return
      this.strategyWatchlistLoading = true
      this.strategySymbolLoading = true
      try {
        const res = await getWatchlist()
        const data = res && res.data
        const list = Array.isArray(data) ? data : ((data && data.watchlist) || [])
        this.strategyWatchlistOptions = list
          .map(item => this.normalizeStrategySymbolOption(item, true))
          .filter(Boolean)
        this.strategySymbolOptions = [...this.strategyWatchlistOptions]
        this.ensureCurrentSymbolOption()
      } catch (_) {
        if (!this.strategyWatchlistOptions.length) this.strategySymbolOptions = []
        this.ensureCurrentSymbolOption()
      } finally {
        this.strategyWatchlistLoading = false
        this.strategySymbolLoading = false
      }
    },
    ensureCurrentSymbolOption () {
      const symbol = String(this.runConfig.symbol || '').trim().toUpperCase()
      if (!symbol) return
      const exists = this.strategySymbolOptions.some(item => (
        item.symbol === symbol &&
        item.market === this.runConfig.market_category &&
        (item.market !== 'Crypto' || item.market_type === this.runConfig.market_type) &&
        (!this.strategyRuntimeContract.hasExchange || !item.exchange_id || item.exchange_id === this.runConfig.exchange_id)
      ))
      if (!exists) {
        const current = this.normalizeStrategySymbolOption({
          market: this.runConfig.market_category,
          symbol,
          exchange_id: this.runConfig.exchange_id,
          market_type: this.runConfig.market_type,
          instrument_id: this.runConfig.instrument_id
        })
        if (current) this.strategySymbolOptions = [current, ...this.strategySymbolOptions]
      }
    },
    normalizeStrategySymbolOption (item, isWatchlist = false) {
      const symbol = String((item && (item.symbol || item.code || item.value)) || '').trim().toUpperCase()
      if (!symbol) return null
      const market = String((item && (item.market || item.category)) || 'Crypto')
      const exchangeId = String((item && (item.exchange_id || item.exchangeId)) || '')
      const marketType = market === 'Crypto'
        ? normalizeMarketType(item && (item.market_type || item.marketType), market)
        : 'spot'
      const instrumentId = String((item && (item.instrument_id || item.instrumentId)) || '')
      const name = String((item && (item.name || item.display_name)) || '').trim()
      return {
        value: [market, exchangeId, marketType, instrumentId, symbol].join('|'),
        label: [symbol, name, market].filter(Boolean).join(' · '),
        market,
        symbol,
        exchange_id: exchangeId,
        market_type: marketType,
        instrument_id: instrumentId,
        is_watchlist: isWatchlist
      }
    },
    searchStrategySymbols (keyword) {
      if (this.strategySymbolSearchTimer) clearTimeout(this.strategySymbolSearchTimer)
      this.strategySymbolSearchTimer = setTimeout(() => this.loadStrategySymbols(keyword), 280)
    },
    async loadStrategySymbols (keyword) {
      const term = String(keyword || '').trim()
      if (!term) {
        this.strategySymbolOptions = [...this.strategyWatchlistOptions]
        this.ensureCurrentSymbolOption()
        return
      }
      this.strategySymbolLoading = true
      try {
        const res = await searchSymbols({
          keyword: term,
          limit: 20
        })
        const data = res && res.data
        const list = Array.isArray(data) ? data : ((data && (data.results || data.symbols || data.items)) || [])
        this.strategySymbolOptions = list.map(this.normalizeStrategySymbolOption).filter(Boolean)
        this.ensureCurrentSymbolOption()
      } catch (_) {
        this.strategySymbolOptions = []
        this.ensureCurrentSymbolOption()
      } finally {
        this.strategySymbolLoading = false
      }
    },
    handleRuntimeSymbolChange (value) {
      if (!this.strategyRuntimeContract.hasInstrument) return
      const selected = this.strategySymbolOptions.find(option => option.value === value)
      if (!selected) return
      const patch = {
        market_category: selected.market,
        symbol: selected.symbol,
        instrument_id: selected.instrument_id || ''
      }
      if (selected.market === 'Crypto') {
        patch.market_type = selected.market_type || this.runConfig.market_type || 'spot'
        patch.exchange_id = selected.exchange_id || this.runConfig.exchange_id || 'binance'
      } else {
        patch.market_type = 'spot'
        patch.exchange_id = ''
        patch.trade_direction = 'long'
        patch.leverage = 1
      }
      this.applyRuntimeConfigPatch(patch)
    },
    handleRuntimeConfigChange ({ field, value } = {}) {
      const capabilityByField = {
        exchange_id: 'hasExchange',
        market_type: 'hasProduct',
        timeframe: 'hasTimeframe',
        trade_direction: 'hasDirection'
      }
      if (!field || (capabilityByField[field] && !this.strategyRuntimeContract[capabilityByField[field]])) return
      this.applyRuntimeConfigPatch({ [field]: value }, field)
    },
    applyRuntimeConfigPatch (patch = {}, field = '') {
      const next = { ...this.runConfig, ...patch }
      if (field === 'market_category') {
        next.market_category = String(patch[field] || 'Crypto')
        next.market_type = next.market_category === 'Crypto' ? normalizeMarketType(next.market_type, 'Crypto') : 'spot'
        next.exchange_id = next.market_category === 'Crypto' ? normalizeExchangeId(next.exchange_id || 'binance') : ''
      }
      if (field === 'exchange_id') next.exchange_id = normalizeExchangeId(patch[field])
      if (field === 'market_type') next.market_type = normalizeMarketType(patch[field], next.market_category)
      if (next.market_category !== 'Crypto' || next.market_type === 'spot') {
        next.trade_direction = 'long'
        next.leverage = 1
      }
      this.runConfig = next
      this.ensureCurrentSymbolOption()
      if (['market_category', 'exchange_id', 'market_type'].includes(field)) this.searchStrategySymbols('')
      if (!this.scriptCodeHidden && this.currentAssetType === 'script') {
        const updated = applyStrategyRuntimeConfigToCode(this.scriptCode, next)
        if (updated !== this.scriptCode) this.scriptCode = updated
      }
      this.scriptVerified = false
    },
    renderStrategyAiMessage (messageItem) {
      const legacyCandidateText = 'Candidate generated and validated against the current Strategy API V2 workspace contract.'
      const item = messageItem && typeof messageItem === 'object'
        ? messageItem
        : { content: messageItem }
      const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {}
      const messageKey = item.message_key || metadata.message_key || ''
      const rawContent = String(item.content || '').trim()
      const localizedContent = item.change_status === 'applied'
        ? this.aiWorkspaceText.candidateApplied
        : (messageKey === 'candidate_generated_validated' || rawContent === legacyCandidateText
            ? this.aiWorkspaceText.candidateReady
            : rawContent)
      return renderSafeMarkdown(localizedContent)
    },
    localizeStrategyAiError (error) {
      const envelope = error && error.response && error.response.data
      const details = envelope && envelope.data && typeof envelope.data === 'object'
        ? envelope.data
        : {}
      const raw = String(
        details.error ||
        (error && (error.backendMessage || error.message)) ||
        this.aiWorkspaceText.sendFailed
      ).trim()
      const separator = raw.indexOf(':')
      const key = raw.startsWith('strategyV2.')
        ? (separator === -1 ? raw : raw.slice(0, separator))
        : ''
      if (key) {
        const localized = String(this.$t(key) || '')
        if (localized && localized !== key) {
          const detail = separator === -1 ? '' : raw.slice(separator + 1).trim()
          return detail ? `${localized} (${detail})` : localized
        }
      }
      return raw || this.aiWorkspaceText.sendFailed
    },
    toggleStrategyAiPanel () {
      this.aiPanelExpanded = !this.aiPanelExpanded
      if (this.aiPanelExpanded) {
        this.$nextTick(() => {
          this.scrollStrategyAiConversation()
          const input = this.$refs.strategyAiPrompt && this.$refs.strategyAiPrompt.$el
          const textarea = input && input.querySelector('textarea')
          if (textarea) textarea.focus()
        })
      }
    },
    resetStrategyAiWorkspace () {
      this.aiWorkspaceLoadToken += 1
      this.aiWorkspaceLoading = false
      this.aiThread = null
      this.aiMessages = []
      this.aiCandidate = null
      this.aiPreviewVisible = false
      this.aiRequestBaseCode = ''
      this.aiStrategyPrompt = ''
      this.aiInteractionMode = 'auto'
    },
    async loadStrategyAiWorkspace (sourceId) {
      const id = Number(sourceId || 0)
      if (!id || this.scriptCodeHidden) {
        this.resetStrategyAiWorkspace()
        return
      }
      const token = ++this.aiWorkspaceLoadToken
      this.aiWorkspaceLoading = true
      this.aiThread = null
      this.aiMessages = []
      this.aiCandidate = null
      try {
        const res = await getStrategyAiWorkspace(id, { assetType: this.currentAssetType })
        if (token !== this.aiWorkspaceLoadToken || Number(this.currentSourceId || 0) !== id) return
        const data = (res && res.data) || {}
        this.aiThread = data.thread || null
        this.aiMessages = Array.isArray(data.messages) ? data.messages : []
        const candidate = data.candidate
        if (candidate && candidate.candidate_code) {
          this.aiCandidate = {
            id: candidate.id,
            code: candidate.candidate_code,
            baseCodeHash: candidate.base_code_hash || '',
            baseCodeMatchesCurrent: candidate.base_code_matches_current !== false,
            validation: candidate.validation || {},
            summary: candidate.summary || {}
          }
        }
        this.$nextTick(this.scrollStrategyAiConversation)
      } catch (e) {
        if (token !== this.aiWorkspaceLoadToken) return
        const status = e && e.response && Number(e.response.status)
        if (status === 404) {
          // An older backend may not expose the workspace history route yet.
          // Keep the editor usable and treat it as an empty conversation instead
          // of surfacing a raw HTTP error during page entry.
          this.aiThread = null
          this.aiMessages = []
          this.aiCandidate = null
          return
        }
        this.$message.error(e.backendMessage || e.message || this.aiWorkspaceText.sendFailed)
      } finally {
        if (token === this.aiWorkspaceLoadToken) this.aiWorkspaceLoading = false
      }
    },
    scrollStrategyAiConversation () {
      const el = this.$refs.strategyAiConversation
      if (el) el.scrollTop = el.scrollHeight
    },
    useStrategyAiQuickPrompt (item) {
      this.aiStrategyPrompt = String((item && item.label) || '')
      this.aiInteractionMode = (item && item.mode) || 'auto'
      this.$nextTick(() => {
        const root = this.$refs.strategyAiPrompt && this.$refs.strategyAiPrompt.$el
        const textarea = root && root.querySelector('textarea')
        if (textarea) textarea.focus()
      })
    },
    handleStrategyAiEnter (event) {
      if (!event) return
      if (event.ctrlKey || event.metaKey) {
        const target = event.target
        if (!target) return
        event.preventDefault()
        const start = target.selectionStart
        const end = target.selectionEnd
        const value = String(this.aiStrategyPrompt || '')
        this.aiStrategyPrompt = `${value.slice(0, start)}\n${value.slice(end)}`
        this.$nextTick(() => {
          target.selectionStart = start + 1
          target.selectionEnd = start + 1
        })
        return
      }
      event.preventDefault()
      if (!this.aiStrategyGenerating && String(this.aiStrategyPrompt || '').trim()) this.sendStrategyAiTurn()
    },
    async sendStrategyAiTurn () {
      const prompt = String(this.aiStrategyPrompt || '').trim()
      if (!prompt || this.aiStrategyGenerating || this.scriptCodeHidden) return
      const existingCode = this.getCurrentScriptCode()
      this.aiStrategyGenerating = true
      this.aiRequestBaseCode = existingCode
      this.aiMessages.push({
        role: 'user',
        content: prompt,
        message_type: this.aiInteractionMode === 'discussion' ? 'question' : 'change_request',
        localId: `strategy-user-${Date.now()}`
      })
      const interactionMode = this.aiInteractionMode || 'auto'
      this.aiStrategyPrompt = ''
      this.aiInteractionMode = 'auto'
      this.$nextTick(this.scrollStrategyAiConversation)
      try {
        const res = await runStrategyAiTurn({
          sourceId: Number(this.currentSourceId || 0),
          assetType: this.currentAssetType,
          prompt,
          existingCode,
          interactionMode,
          generationMode: 'authoring',
          context: { source: 'strategy_ide' }
        })
        const data = (res && res.data) || {}
        const billing = (data.billing && typeof data.billing === 'object') ? data.billing : data
        const remainingCredits = Number(billing.remaining_credits)
        if (Number.isFinite(remainingCredits)) this.$root.$emit('credits-updated', remainingCredits)
        const assistantMessage = Object.assign({}, data.assistant_message || {
          role: 'assistant',
          content: data.reply_type === 'candidate' ? this.aiWorkspaceText.candidateReady : '',
          localId: `strategy-assistant-${Date.now()}`
        }, {
          // Older or source-less backend responses may omit message_type even
          // though reply_type and code clearly identify a generated candidate.
          message_type: data.reply_type === 'candidate'
            ? 'candidate'
            : ((data.assistant_message && data.assistant_message.message_type) || data.reply_type || 'discussion')
        })
        if (assistantMessage.content) this.aiMessages.push(assistantMessage)
        if (data.reply_type === 'candidate' && data.code) {
          this.aiCandidate = {
            id: data.change_id || 0,
            code: data.code,
            baseCode: existingCode,
            baseCodeHash: data.base_code_hash || '',
            baseCodeMatchesCurrent: true,
            validation: data.validation || { success: false },
            summary: data.summary || {}
          }
          const autoApplied = await this.autoApplyStrategyAiCandidate()
          if (!autoApplied) this.$message.success(this.aiWorkspaceText.candidateReady)
        }
        this.aiPanelExpanded = true
        this.$nextTick(this.scrollStrategyAiConversation)
      } catch (e) {
        const message = this.localizeStrategyAiError(e)
        this.aiMessages.push({ role: 'assistant', content: message, message_type: 'error', localId: `strategy-error-${Date.now()}` })
        this.$message.error(message)
        this.$nextTick(this.scrollStrategyAiConversation)
      } finally {
        this.aiStrategyGenerating = false
      }
    },
    isActiveStrategyCandidateMessage (messageItem) {
      if (!this.aiCandidate || !messageItem || messageItem.role === 'user' || messageItem.message_type !== 'candidate') return false
      const candidateMessages = this.aiMessages.filter(item => item && item.role !== 'user' && item.message_type === 'candidate')
      const latest = candidateMessages[candidateMessages.length - 1]
      const messageChangeId = Number(messageItem.change_id || 0)
      const candidateId = Number(this.aiCandidate.id || 0)
      if (messageChangeId && candidateId) return messageChangeId === candidateId
      return latest === messageItem
    },
    previewStrategyAiCandidate () {
      if (this.aiCandidate && this.aiCandidate.code) this.aiPreviewVisible = true
    },
    applyStrategyAiCandidate () {
      if (!this.aiCandidate || !this.aiCandidate.code || !this.aiCandidateValidationPassed) return
      if (this.strategyAiCandidateHasSourceConflict()) {
        this.$confirm({
          title: this.aiWorkspaceText.editorChangedTitle,
          content: this.aiWorkspaceText.editorChangedDesc,
          okText: this.aiWorkspaceText.apply,
          cancelText: this.text.cancel,
          onOk: () => this.applyStrategyAiCandidateCode(true)
        })
        return
      }
      this.applyStrategyAiCandidateCode()
    },
    strategyAiCandidateHasSourceConflict (candidate = this.aiCandidate) {
      if (!candidate) return false
      const current = this.getCurrentScriptCode()
      return candidate.baseCodeMatchesCurrent === false ||
        (!!candidate.baseCode && current !== candidate.baseCode) ||
        (!!this.aiRequestBaseCode && current !== this.aiRequestBaseCode)
    },
    async autoApplyStrategyAiCandidate () {
      if (!this.aiCandidate || !this.aiCandidate.code || !this.aiCandidateValidationPassed) return false
      if (this.strategyAiCandidateHasSourceConflict()) return false
      await this.applyStrategyAiCandidateCode()
      return true
    },
    markLatestStrategyAiCandidateApplied () {
      for (let index = this.aiMessages.length - 1; index >= 0; index -= 1) {
        const item = this.aiMessages[index]
        if (!item || item.role === 'user' || item.message_type !== 'candidate') continue
        this.$set(item, 'change_status', 'applied')
        this.$set(item, 'content', this.aiWorkspaceText.candidateApplied)
        break
      }
    },
    async applyStrategyAiCandidateCode (forceFullReplacement = false) {
      const candidate = this.aiCandidate
      if (!candidate || !candidate.code) return
      const editor = this.$refs.scriptEditor
      const operations = candidateCodeEditOperations(candidate)
      let nextCode = candidate.code
      let useCodeEdits = !forceFullReplacement && operations.length > 0 && editor && typeof editor.applyCodeEdits === 'function'
      if (useCodeEdits) {
        try {
          const preview = applyExactCodeEdits(this.getCurrentScriptCode(), operations)
          useCodeEdits = preview.code === candidate.code
        } catch (_) {
          useCodeEdits = false
        }
      }
      if (useCodeEdits) {
        nextCode = editor.applyCodeEdits(operations)
      } else {
        if (editor && typeof editor.setCodeWithHighlight === 'function') {
          nextCode = editor.setCodeWithHighlight(candidate.code)
        } else {
          this.scriptCode = candidate.code
          await this.$nextTick()
          if (editor && typeof editor.setCode === 'function') editor.setCode(candidate.code)
        }
      }
      this.scriptCode = nextCode
      this.scriptVerified = true
      this.strategyValidation = { valid: true, manifest: (candidate.validation && candidate.validation.manifest) || {} }
      this.aiPreviewVisible = false
      if (candidate.id) await setStrategyAiCandidateStatus(candidate.id, 'applied').catch(() => {})
      this.markLatestStrategyAiCandidateApplied()
      this.aiCandidate = null
      this.$message.success(this.aiWorkspaceText.candidateApplied)
    },
    async discardStrategyAiCandidate () {
      const candidate = this.aiCandidate
      if (!candidate) return
      if (candidate.id) {
        try { await setStrategyAiCandidateStatus(candidate.id, 'discarded') } catch (_) {}
      }
      this.aiCandidate = null
      this.aiPreviewVisible = false
      this.$message.success(this.aiWorkspaceText.candidateDiscarded)
    },
    clearStrategyAiConversation () {
      if (!this.currentSourceId) return
      this.$confirm({
        title: this.aiWorkspaceText.clear,
        content: this.aiWorkspaceText.clearConfirm,
        okText: this.aiWorkspaceText.clear,
        cancelText: this.text.cancel,
        onOk: async () => {
          await clearStrategyAiWorkspace(this.currentSourceId, { assetType: this.currentAssetType })
          this.resetStrategyAiWorkspace()
        }
      })
    },
    handleStrategyVerified (validation) {
      this.scriptVerified = true
      this.strategyValidation = validation || { valid: true }
    },
    async initPage () {
      await this.loadSources()
      if (this.isIndicatorConvertRoute()) {
        this.createNewDraft({
          openTemplate: false,
          updateRoute: false,
          assetType: 'script'
        })
        await this.applyIndicatorConvertRouteOnce()
        return
      }
      if (this.isDraftRoute() || this.hasCopilotScriptDraft()) {
        this.createNewDraft({
          openTemplate: this.shouldOpenTemplateFromRoute(),
          updateRoute: false,
          assetType: this.getRouteAssetType()
        })
        this.applyCopilotScriptDraft()
        if (this.isLegacyAiDraftRoute() || this.hasRouteSourceId()) {
          this.writeDraftRoute({ openTemplate: this.shouldOpenTemplateFromRoute() })
        }
        this.applyIndicatorConvertRouteOnce()
        return
      }
      const routeId = this.getInitialRouteSourceId()
      const hasRouteSource = routeId && this.allScriptOptions.some(item => String(item.id) === String(routeId))
      const firstId = this.scriptOptions.length ? this.scriptOptions[0].id : ''
      if (hasRouteSource) {
        await this.openSource(routeId, { updateRoute: false })
      } else if (firstId) {
        await this.openSource(firstId, { updateRoute: true })
      } else {
        this.createNewDraft({ openTemplate: false })
      }
      this.applyIndicatorConvertRouteOnce()
    },
    async loadSources () {
      this.loadingScripts = true
      try {
        const res = await getScriptSourceList()
        this.scriptSources = this.extractSources(res)
      } catch (e) {
        this.$message.warning(this.text.loadScriptsFailed)
      } finally {
        this.loadingScripts = false
      }
    },
    async refreshSources () {
      await this.loadSources()
      if (this.currentSourceId) {
        await this.openSource(this.currentSourceId, { updateRoute: false })
      }
    },
    onScriptDropdownVisibleChange (visible) {
      this.strategySourceDropdownVisible = visible
      if (visible && !this.loadingScripts) this.loadSources()
    },
    extractSources (res) {
      const data = res && res.data
      if (Array.isArray(data)) return data
      if (data && Array.isArray(data.items)) return data.items
      return []
    },
    getInitialRouteSourceId () {
      const query = this.$route.query || {}
      const value = query.sourceId
      return value ? String(value).trim() : ''
    },
    async applyStrategyRouteSource () {
      if (this._initialPagePromise) await this._initialPagePromise
      const sourceId = this.getInitialRouteSourceId()
      if (!sourceId || String(this.currentSourceId || '') === sourceId) return
      await this.openSource(sourceId, { updateRoute: false })
    },
    getRouteAssetType () {
      const query = this.$route.query || {}
      return String(query.assetType || '').trim() === 'portfolio_strategy' ? 'portfolio_strategy' : 'script'
    },
    isDraftRoute () {
      const query = this.$route.query || {}
      return String(query.draft || '') === '1' || this.isLegacyAiDraftRoute()
    },
    isLegacyAiDraftRoute () {
      const query = this.$route.query || {}
      return String(query.aiDraft || '') === '1'
    },
    isIndicatorConvertRoute () {
      const query = this.$route.query || {}
      return String(query.convert || '').toLowerCase() === 'indicator' ||
        !!query.convert_key ||
        !!query.source_indicator_id ||
        !!query.indicator_id
    },
    hasRouteSourceId () {
      return !!this.getInitialRouteSourceId()
    },
    hasCopilotScriptDraft () {
      if (typeof sessionStorage === 'undefined') return false
      try {
        return !!String(sessionStorage.getItem('qd_strategy_source') || '').trim()
      } catch (_) {
        return false
      }
    },
    applyCopilotScriptDraft () {
      if (typeof sessionStorage === 'undefined') return
      let code = ''
      let meta = {}
      try {
        code = String(sessionStorage.getItem('qd_strategy_source') || '').trim()
        const rawMeta = sessionStorage.getItem('qd_copilot_script_strategy_meta') || ''
        meta = rawMeta ? JSON.parse(rawMeta) : {}
        if (code) {
          sessionStorage.removeItem('qd_strategy_source')
          sessionStorage.removeItem('qd_copilot_script_strategy_meta')
        }
      } catch (_) {
        meta = {}
      }
      if (!code) return
      this.currentSource = null
      this.currentSourceId = null
      this.selectedScriptId = undefined
      this.scriptCodeHidden = false
      this.scriptCode = code
      this.scriptTemplateKey = ''
      this.scriptTemplateParams = {}
      this.scriptParamSchema = {}
      this.editorInitialTemplateKey = ''
      this.scriptVerified = false
      this.lastSavedSnapshot = ''
      this.runConfig = {
        ...this.runConfig,
        market_category: meta.market || this.runConfig.market_category,
        symbol: meta.symbol || this.runConfig.symbol
      }
    },
    shouldOpenTemplateFromRoute () {
      const query = this.$route.query || {}
      return String(query.template_picker || '') === '1'
    },
    getScriptSourceId (item) {
      if (!item) return ''
      return String(item.id || '').trim()
    },
    async handleScriptSelect (id) {
      if (!id) {
        this.createNewDraft({ openTemplate: false })
        return
      }
      await this.openSource(id, { updateRoute: true })
    },
    selectStrategySource (id) {
      this.strategySourceDropdownVisible = false
      this.handleScriptSelect(id)
    },
    async openSource (id, options = {}) {
      const sourceId = String(id || '').trim()
      if (!sourceId) return
      try {
        const res = await getScriptSourceDetail(sourceId)
        const source = (res && res.data) || res
        if (!source || !this.getScriptSourceId(source)) {
          throw new Error(this.text.loadScriptFailed)
        }
        this.applySource(source)
        if (options.updateRoute !== false) {
          this.writeRouteSource(this.currentSourceId)
        }
      } catch (e) {
        this.$message.error(e.backendMessage || e.message || this.text.loadScriptFailed)
      }
    },
    applySource (source) {
      const metadata = this.parseObject(source.metadata)
      const runConfig = this.parseObject(metadata.last_run_config)
      const inferredRunConfig = extractStrategyRuntimeContractFromCode(source.code || '').config
      this.currentSource = source
      this.currentAssetType = source.asset_type === 'portfolio_strategy' ? 'portfolio_strategy' : 'script'
      this.currentSourceId = this.getScriptSourceId(source)
      this.selectedScriptId = this.currentSourceId ? String(this.currentSourceId) : undefined
      this.scriptCodeHidden = !!(source.code_hidden || metadata.code_hidden)
      this.scriptCode = this.scriptCodeHidden
        ? ''
        : String(source.code || '')
      this.scriptTemplateKey = source.template_key || runConfig.script_template_key || ''
      this.scriptTemplateParams = {
        ...this.parseObject(metadata.script_template_params),
        ...this.parseObject(runConfig.script_template_params)
      }
      this.scriptParamSchema = this.parseObject(source.param_schema)
      this.runConfig = {
        ...createDefaultRunConfig(),
        ...sanitizeRuntimeConfigForSource(runConfig, source.code || ''),
        ...inferredRunConfig
      }
      this.$nextTick(() => {
        this.ensureCurrentSymbolOption()
        this.searchStrategySymbols(this.runConfig.symbol)
      })
      const universeReference = this.extractUniverseReferenceFromCode(this.scriptCode)
      if (universeReference.id && !this.runConfig.universe_id) {
        this.runConfig = {
          ...this.runConfig,
          universe_id: universeReference.id,
          universe_code: universeReference.code
        }
      }
      this.editorInitialTemplateKey = ''
      this.editorKeySeed += 1
      this.scriptVerified = !!(metadata.lifecycle_verified || metadata.script_verified)
      this.lastSavedSnapshot = this.scriptSnapshot()
    },
    createNewDraft ({ openTemplate = false, updateRoute = true, assetType = this.currentAssetType } = {}) {
      this.currentSource = null
      this.currentSourceId = null
      this.selectedScriptId = undefined
      this.currentAssetType = assetType === 'portfolio_strategy' ? 'portfolio_strategy' : 'script'
      this.scriptCode = EMPTY_DRAFT_CODE
      this.scriptCodeHidden = false
      this.scriptTemplateKey = ''
      this.scriptTemplateParams = {}
      this.scriptParamSchema = {}
      this.editorInitialTemplateKey = ''
      this.scriptVerified = false
      this.runConfig = {
        ...createDefaultRunConfig(),
        universe_id: undefined,
        universe_code: '',
        universe_name: ''
      }
      this.lastSavedSnapshot = ''
      this.editorKeySeed += 1
      if (updateRoute) this.writeDraftRoute({ openTemplate })
      if (openTemplate) {
        this.$nextTick(() => {
          const editor = this.$refs.scriptEditor
          if (editor && typeof editor.openTemplatePicker === 'function') {
            editor.openTemplatePicker()
          }
        })
      }
    },
    handleAssetTypeChange (assetType) {
      const target = assetType === 'portfolio_strategy' ? 'portfolio_strategy' : 'script'
      if (target === this.currentAssetType) return
      const switchWorkspace = async () => {
        this.currentAssetType = target
        const first = this.allScriptOptions.find(item => item.asset_type === target)
        if (first) await this.openSource(first.id, { updateRoute: true })
        else this.createNewDraft({ openTemplate: false, updateRoute: true, assetType: target })
      }
      const shouldConfirm = this.currentSourceId
        ? this.hasUnsavedScriptChanges
        : String(this.scriptCode || '').trim() !== EMPTY_DRAFT_CODE
      if (shouldConfirm) {
        this.$confirm({
          title: this.text.switchWorkspaceTitle,
          content: this.text.switchWorkspaceContent,
          okText: this.text.switchWorkspaceTitle,
          cancelText: this.text.cancel,
          onOk: switchWorkspace
        })
        return
      }
      switchWorkspace()
    },
    extractUniverseReferenceFromCode (code) {
      const source = String(code || '')
      const poolMatch = source.match(/context\.set_universe\(pool=["']([^"']+)["']\)/i)
      if (poolMatch) return { id: undefined, code: String(poolMatch[1] || '').trim() }
      const indexMatch = source.match(/context\.set_universe\(index=["']INDEX:([^"']+)["']\)/i)
      return indexMatch ? { id: undefined, code: String(indexMatch[1] || '').trim() } : { id: undefined, code: '' }
    },
    applyUniverseReferenceToCode (item) {
      if (this.scriptCodeHidden) return
      const pool = String(item.code || '').trim().toLowerCase()
      const line = `context.set_universe(pool="${pool}")`
      const pattern = /context\.set_universe\((?:pool=["'][^"']+["']|index=["']INDEX:[^"']+["'])\)/i
      const code = String(this.scriptCode || '')
      if (pattern.test(code)) {
        this.scriptCode = code.replace(pattern, line)
        return
      }
      const initPattern = /^(def\s+initialize\s*\([^)]*\):\s*)$/m
      this.scriptCode = initPattern.test(code) ? code.replace(initPattern, `$1\n    ${line}`) : `${line}\n${code}`
    },
    handleUniverseUse (item) {
      if (!item || this.currentAssetType !== 'portfolio_strategy') return
      this.runConfig = {
        ...this.runConfig,
        universe_id: Number(item.id),
        universe_code: item.code || '',
        universe_name: item.name || item.code || ''
      }
      this.applyUniverseReferenceToCode(item)
      this.showUniverseLibrary = false
      this.$message.success(this.text.universeApplied.replace('{name}', item.name || item.code || ''))
    },
    handleUniverseDeleted (item) {
      if (!item || Number(item.id) !== Number(this.selectedUniverseId)) return
      this.runConfig = {
        ...this.runConfig,
        universe_id: null,
        universe_code: '',
        universe_name: ''
      }
      if (!this.scriptCodeHidden) {
        this.scriptCode = String(this.scriptCode || '').replace(/^\s*context\.set_universe\((?:pool=["'][^"']+["']|index=["']INDEX:[^"']+["'])\)\s*\r?\n?/mi, '')
      }
      this.$message.info(this.text.universeDeleted.replace('{name}', item.name || item.code || ''))
    },
    async applyGeneratedRobot (generated) {
      if (!generated || !generated.code) return
      const generatedCode = String(generated.code)
      const generatedTradingConfig = { ...(generated.trading_config || {}) }
      delete generatedTradingConfig.initial_capital
      delete generatedTradingConfig.leverage
      this.currentSource = null
      this.currentSourceId = null
      this.selectedScriptId = undefined
      this.currentAssetType = 'script'
      this.scriptCodeHidden = false
      this.scriptTemplateKey = generated.template_key || ''
      this.scriptTemplateParams = {
        ...((generated.trading_config && generated.trading_config.executor_config) || {})
      }
      this.scriptParamSchema = {}
      this.editorInitialTemplateKey = ''
      this.scriptVerified = false
      this.runConfig = {
        ...this.runConfig,
        ...generatedTradingConfig,
        script_template_key: generated.template_key || '',
        script_template_params: {
          ...((generated.trading_config && generated.trading_config.executor_config) || {})
        },
        robot_compatibility: generated.compatibility || {},
        universe_id: undefined,
        universe_code: '',
        universe_name: '',
        market_category: generated.market_category || 'Crypto',
        symbol: generated.symbol || this.runConfig.symbol,
        timeframe: generated.timeframe || this.runConfig.timeframe,
        market_type: generated.market_type || this.runConfig.market_type,
        trade_direction: generated.trade_direction || this.runConfig.trade_direction
      }
      this.scriptCode = generatedCode
      await this.$nextTick()
      const editor = this.$refs.scriptEditor
      if (editor && typeof editor.setCode === 'function') {
        editor.setCode(generatedCode)
      }
      this.lastSavedSnapshot = ''
      this.showRobotBuilder = false
      this.$message.success(this.text.robotGenerated.replace('{name}', generated.strategy_name || ''))
    },
    writeRouteSource (sourceId) {
      if (!sourceId) return
      const query = { tab: 'script', sourceId: String(sourceId), assetType: this.currentAssetType }
      this.replaceRouteQuery(query)
    },
    writeDraftRoute ({ openTemplate = false } = {}) {
      const query = { tab: 'script', draft: '1', assetType: this.currentAssetType }
      if (openTemplate) query.template_picker = '1'
      else delete query.template_picker
      this.replaceRouteQuery(query)
    },
    replaceRouteQuery (query) {
      const clean = {}
      Object.keys(query || {}).forEach(key => {
        const value = query[key]
        if (value !== undefined && value !== null && String(value) !== '') {
          clean[key] = value
        }
      })
      const current = JSON.stringify(this.$route.query || {})
      const next = JSON.stringify(clean)
      if (current !== next) {
        this.$router.replace({ path: '/strategy-ide', query: clean }).catch(() => {})
      }
    },
    parseObject (value) {
      if (!value) return {}
      if (typeof value === 'object' && !Array.isArray(value)) return { ...value }
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
        } catch (_) {
          return {}
        }
      }
      return {}
    },
    handleTemplateChange (payload) {
      this.scriptTemplateKey = (payload && payload.key) || ''
      this.scriptTemplateParams = payload && payload.params && typeof payload.params === 'object'
        ? { ...payload.params }
        : {}
      this.scriptParamSchema = payload && payload.param_schema && typeof payload.param_schema === 'object'
        ? { ...payload.param_schema }
        : {}
      if (this.scriptCodeHidden) {
        this.runConfig = {
          ...this.runConfig,
          script_template_key: this.scriptTemplateKey,
          script_template_params: { ...this.scriptTemplateParams }
        }
      }
      this.scriptVerified = false
    },
    handleSaveShortcut (event) {
      if (!event || !(event.ctrlKey || event.metaKey) || String(event.key || '').toLowerCase() !== 's') return
      event.preventDefault()
      this.saveScript(false)
    },
    extractScriptMetadataFromCode (code) {
      const source = String(code || '')
      const doc = source.match(/^\s*(?:[rubfRUBF]*)("""|''')([\s\S]*?)\1/)
      if (doc) {
        const lines = String(doc[2] || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
        if (lines.length) {
          return {
            name: lines[0],
            description: lines.slice(1).join('\n')
          }
        }
      }
      const nameMatch = source.match(/^\s*(?:my_strategy_name|strategy_name)\s*=\s*(['"])(.*?)\1\s*$/m)
      const descMatch = source.match(/^\s*(?:my_strategy_description|strategy_description)\s*=\s*(['"])(.*?)\1\s*$/m)
      return {
        name: nameMatch ? nameMatch[2] : '',
        description: descMatch ? descMatch[2] : ''
      }
    },
    deriveScriptName () {
      const meta = this.extractScriptMetadataFromCode(this.scriptCode)
      if (meta.name) return meta.name
      if (this.currentSource && this.currentSource.name) return this.currentSource.name
      return this.text.defaultName
    },
    getCurrentScriptCode () {
      const editor = this.$refs.scriptEditor
      if (editor && typeof editor.getCode === 'function') {
        return String(editor.getCode() || '')
      }
      return String(this.scriptCode || '')
    },
    extractScriptTimeframeFromCode (code) {
      const source = String(code || '')
      const match = source.match(/(?:^|\n)\s*#\s*timeframe\s*:\s*([A-Za-z0-9_-]+)/i)
      if (!match) return ''
      const raw = String(match[1] || '').trim()
      const aliases = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '30m': '30m',
        '1h': '1H',
        '4h': '4H',
        '1d': '1D',
        '1w': '1W'
      }
      return aliases[raw.toLowerCase()] || ''
    },
    buildTradingConfig () {
      const cfg = sanitizeRuntimeConfigForSource(this.runConfig, this.getCurrentScriptCode())
      const marketCategory = cfg.market_category || cfg.marketCategory || 'Crypto'
      const marketType = marketCategory === 'Crypto' && cfg.market_type === 'swap' ? 'swap' : 'spot'
      const tradeDirection = marketType === 'spot' ? 'long' : (cfg.trade_direction || 'long')
      const investmentAmount = Number(cfg.initial_capital || cfg.investment_amount || 10000)
      const codeTimeframe = this.extractScriptTimeframeFromCode(this.getCurrentScriptCode())
      const out = {
        market_category: marketCategory,
        exchange_id: marketCategory === 'Crypto' ? String(cfg.exchange_id || 'binance').toLowerCase() : '',
        symbol: String(cfg.symbol || 'BTC/USDT').trim(),
        timeframe: codeTimeframe || cfg.timeframe || '1m',
        tick_interval_sec: 10,
        market_type: marketType,
        trade_direction: tradeDirection,
        initial_capital: investmentAmount,
        investment_amount: investmentAmount,
        leverage: marketType === 'spot' ? 1 : Number(cfg.leverage || 5)
      }
      ;['strategy_family', 'executor_type', 'executor_config', 'executor_preview', 'bot_type', 'bot_params'].forEach(key => {
        if (cfg[key] !== undefined && cfg[key] !== null) out[key] = cfg[key]
      })
      if (cfg.tick_interval_sec) out.tick_interval_sec = Number(cfg.tick_interval_sec)
      if (this.scriptTemplateKey) out.script_template_key = this.scriptTemplateKey
      if (this.scriptTemplateParams && Object.keys(this.scriptTemplateParams).length) {
        out.script_template_params = { ...this.scriptTemplateParams }
      }
      if (this.currentAssetType === 'portfolio_strategy') {
        const universeReference = this.extractUniverseReferenceFromCode(this.getCurrentScriptCode())
        const universeId = Number(universeReference.id || cfg.universe_id || cfg.universeId) || undefined
        if (universeId) {
          out.universe_id = universeId
          out.universe_code = universeReference.code || cfg.universe_code || cfg.universeCode || ''
          out.universe_name = cfg.universe_name || cfg.universeName || ''
        }
      }
      return out
    },
    buildPayload () {
      const currentCode = this.getCurrentScriptCode()
      const meta = this.extractScriptMetadataFromCode(currentCode)
      const description = meta.description || (this.currentSource && this.currentSource.description) || ''
      return {
        name: meta.name || this.deriveScriptName(),
        description,
        code: currentCode,
        asset_type: this.currentAssetType,
        template_key: this.scriptTemplateKey,
        param_schema: this.currentSourceParamSchema,
        template_params: { ...this.scriptTemplateParams },
        metadata: {
          description,
          last_run_config: this.buildTradingConfig(),
          script_template_params: { ...this.scriptTemplateParams },
          lifecycle_verified: this.scriptVerified,
          script_verified: this.scriptVerified
        }
      }
    },
    buildHiddenParamPayload () {
      const existingMeta = this.parseObject(this.currentSource && this.currentSource.metadata)
      const description = (this.currentSource && this.currentSource.description) || ''
      const lastRunConfig = this.buildTradingConfig()
      return {
        name: this.currentSourceName || this.text.defaultName,
        description,
        asset_type: this.currentAssetType,
        template_key: this.scriptTemplateKey || (this.currentSource && this.currentSource.template_key) || '',
        param_schema: this.currentSourceParamSchema,
        metadata: {
          ...existingMeta,
          description,
          code_hidden: true,
          last_run_config: lastRunConfig,
          script_template_params: { ...this.scriptTemplateParams }
        }
      }
    },
    scriptSnapshot () {
      if (this.scriptCodeHidden) {
        return JSON.stringify({
          id: this.currentSourceId,
          code_hidden: true,
          template_key: this.scriptTemplateKey || '',
          template_params: { ...(this.scriptTemplateParams || {}) },
          universe_id: this.selectedUniverseId || null
        })
      }
      return JSON.stringify({
        code: String(this.scriptCode || ''),
        asset_type: this.currentAssetType,
        template_key: this.scriptTemplateKey || '',
        template_params: { ...(this.scriptTemplateParams || {}) },
        universe_id: this.selectedUniverseId || null
      })
    },
    validateScriptCode () {
      if (this.scriptCodeHidden) return true
      if (!String(this.scriptCode || '').trim()) {
        this.$message.warning(this.text.codeRequired)
        return false
      }
      return true
    },
    async verifyScriptCode (options = {}) {
      const code = String(this.scriptCode || '').trim()
      if (!code) {
        this.$message.error(this.text.verifyBlocked.replace('{reason}', this.text.codeRequired))
        return false
      }
      try {
        const res = await verifyStrategyCode({ code })
        const verification = (res && res.data) || {}
        if (!(res && res.code === 1 && verification.valid)) {
          const reason = verification.error || (res && res.msg) || this.text.verifyFailed
          this.$message.error(this.text.verifyBlocked.replace('{reason}', reason))
          return false
        }
        this.scriptVerified = true
        this.publishContractPreview = verification.marketplace_contract || null
        if (!options.silentSuccess) this.$message.success(this.text.verifyPassed)
        return true
      } catch (e) {
        this.$message.error(`${this.text.verifyFailed}: ${e.backendMessage || e.message || ''}`)
        return false
      }
    },
    formatVerifyHint (hint) {
      if (!hint || !hint.code) return ''
      const params = hint.params || {}
      const calls = Array.isArray(params.calls) ? params.calls : []
      const names = calls.map(item => item && item.name).filter(Boolean).join(', ')
      const key = `strategyIde.verifyHints.${hint.code}`
      const translated = this.$t(key, {
        count: params.count || 0,
        names
      })
      return translated && translated !== key ? translated : hint.code
    },
    async saveScript (forceCreate = false, options = {}) {
      if (this.scriptCodeHidden) {
        if (!options.silent) this.$message.info(this.text.hiddenScriptDesc)
        return null
      }
      if (!this.validateScriptCode()) return null
      if (!forceCreate && this.currentSource && this.currentSource.status === 'running') {
        this.$message.warning(this.text.runningEditBlocked)
        return null
      }
      if (!forceCreate && this.currentSourceId && !this.hasUnsavedScriptChanges) {
        if (!options.silent && !options.skipUnchanged) {
          this.$message.info(this.text.noChangesToSave)
        }
        return this.currentSourceId
      }
      if (this.savingScript) return null
      this.savingScript = true
      this.savingScriptMode = options.loadingMode || (forceCreate ? 'copy' : 'save')
      try {
        const payload = this.buildPayload()
        const res = (!forceCreate && this.currentSourceId)
          ? await updateScriptSource(this.currentSourceId, payload)
          : await createScriptSource(payload)
        if (res && res.code === 1) {
          const saved = (res && res.data) || {}
          const savedId = this.getScriptSourceId(saved) || this.currentSourceId
          await this.loadSources()
          await this.openSource(savedId, { updateRoute: options.updateRoute !== false })
          if (!options.silent) this.$message.success(this.text.saveSuccess)
          return this.currentSourceId
        }
        this.$message.error((res && res.msg) || this.text.saveFailed)
        return null
      } catch (e) {
        this.$message.error(e.backendMessage || e.message || this.text.saveFailed)
        return null
      } finally {
        this.savingScript = false
        this.savingScriptMode = ''
      }
    },
    async saveHiddenScriptParams (options = {}) {
      if (!this.scriptCodeHidden || !this.currentSourceId) return this.currentSourceId
      if (this.savingScript) return null
      this.savingScript = true
      this.savingScriptMode = options.loadingMode || 'params'
      try {
        const res = await updateScriptSource(this.currentSourceId, this.buildHiddenParamPayload())
        if (res && res.code === 1) {
          const saved = (res && res.data) || {}
          const metadata = this.parseObject(saved.metadata || (this.currentSource && this.currentSource.metadata))
          this.currentSource = {
            ...(this.currentSource || {}),
            ...saved,
            code: '',
            code_hidden: 1,
            metadata: {
              ...metadata,
              code_hidden: true
            }
          }
          this.lastSavedSnapshot = this.scriptSnapshot()
          if (!options.silent) this.$message.success(this.text.saveSuccess)
          return this.currentSourceId
        }
        if (!options.silent) this.$message.error((res && res.msg) || this.text.saveFailed)
        return null
      } catch (e) {
        if (!options.silent) this.$message.error(e.backendMessage || e.message || this.text.saveFailed)
        return null
      } finally {
        this.savingScript = false
        this.savingScriptMode = ''
      }
    },
    async openPublishModal () {
      if (this.scriptCodeHidden) {
        this.$message.warning(this.text.hiddenScriptDesc)
        return
      }
      if (!await this.verifyScriptCode()) return
      const sourceId = await this.saveScript(false, { silent: true, loadingMode: 'publish' })
      if (!sourceId) return
      const meta = this.extractScriptMetadataFromCode(this.scriptCode)
      this.publishForm = {
        name: meta.name || this.deriveScriptName(),
        description: meta.description || (this.currentSource && this.currentSource.description) || '',
        pricingType: 'free',
        price: 0,
        vipFree: false,
        codeHidden: false
      }
      this.publishBacktestStatus = 'checking'
      this.showPublishModal = true
      const passed = await this.hasSuccessfulBacktest(sourceId)
      if (this.showPublishModal) {
        this.publishBacktestStatus = passed ? 'passed' : 'required'
      }
    },
    async hasSuccessfulBacktest (sourceId) {
      const id = Number(sourceId || 0)
      if (!id) return false
      try {
        const res = await getScriptSourcePublishReadiness(id)
        return !!(res && res.code === 1 && res.data && res.data.ready)
      } catch (_) {
        return false
      }
    },
    closePublishModal () {
      if (!this.publishingScript) {
        this.showPublishModal = false
        this.publishBacktestStatus = 'idle'
      }
    },
    isBacktestRequiredPublishResponse (payload) {
      const envelope = payload && payload.response ? payload.response.data : payload
      const details = envelope && envelope.data
      return !!(details && (details.requires_backtest || details.error_type === 'BACKTEST_REQUIRED'))
    },
    goToBacktestFromPublish () {
      if (this.publishingScript) return
      this.showPublishModal = false
      this.publishBacktestStatus = 'idle'
      this.openBacktestCenter()
    },
    async confirmPublish () {
      if (this.publishBacktestStatus !== 'passed') {
        this.publishBacktestStatus = 'required'
        this.$message.warning(this.text.publishBacktestRequired)
        return
      }
      const sourceId = this.currentSourceId || await this.saveScript(false, { silent: true, loadingMode: 'publish' })
      if (!sourceId) return
      const pricingType = this.publishForm.pricingType === 'paid' ? 'paid' : 'free'
      const price = Number(this.publishForm.price || 0)
      if (pricingType === 'paid' && price <= 0) {
        this.$message.warning(this.text.priceRequired)
        return
      }
      this.publishingScript = true
      try {
        if (!await this.verifyScriptCode({ silentSuccess: true })) return
        const res = await publishScriptSource({
          sourceId,
          name: String(this.publishForm.name || '').trim() || this.deriveScriptName(),
          description: String(this.publishForm.description || '').trim(),
          pricingType,
          price: pricingType === 'paid' ? price : 0,
          vipFree: pricingType === 'paid' ? !!this.publishForm.vipFree : false,
          codeHidden: !!this.publishForm.codeHidden
        })
        if (res && res.code === 1) {
          const action = res.data && res.data.publication_action
          this.$message.success(action === 'updated' ? this.text.publishUpdateSuccess : this.text.publishSuccess)
          this.showPublishModal = false
          this.publishBacktestStatus = 'idle'
        } else if (this.isBacktestRequiredPublishResponse(res)) {
          this.publishBacktestStatus = 'required'
          this.$message.warning(this.text.publishBacktestRequired)
        } else {
          this.$message.error((res && res.msg) || this.text.publishFailed)
        }
      } catch (e) {
        if (this.isBacktestRequiredPublishResponse(e)) {
          this.publishBacktestStatus = 'required'
          this.$message.warning(this.text.publishBacktestRequired)
        } else {
          this.$message.error(e.backendMessage || e.message || this.text.publishFailed)
        }
      } finally {
        this.publishingScript = false
      }
    },
    deleteCurrentSource () {
      if (!this.currentSourceId) return
      this.$confirm({
        title: this.text.deleteConfirmTitle,
        content: this.text.deleteConfirmDesc,
        okType: 'danger',
        onOk: async () => {
          this.deletingScript = true
          try {
            const res = await deleteScriptSource(this.currentSourceId)
            if (res && res.code === 1) {
              this.$message.success(this.text.deleteSuccess)
              await this.loadSources()
              const firstId = this.scriptOptions.length ? this.scriptOptions[0].id : ''
              if (firstId) {
                await this.openSource(firstId, { updateRoute: true })
              } else {
                this.createNewDraft({ openTemplate: false })
              }
            } else {
              this.$message.error((res && res.msg) || this.text.deleteFailed)
            }
          } catch (e) {
            this.$message.error(e.backendMessage || e.message || this.text.deleteFailed)
          } finally {
            this.deletingScript = false
          }
        }
      })
    },
    openBacktestCenter () {
      const go = async () => {
        const sourceId = this.scriptCodeHidden && this.currentSourceId
          ? await this.saveHiddenScriptParams({ silent: true, loadingMode: 'backtest' })
          : await this.saveScript(false, {
            skipUnchanged: true,
            silent: true,
            loadingMode: 'backtest',
            updateRoute: false
          })
        if (!sourceId) return
        this.$router.push({
          path: '/backtest-center',
          query: {
            assetType: this.currentAssetType,
            sourceId: String(sourceId)
          }
        }).catch(() => {})
      }
      go()
    },
    async createLiveFromScript () {
      const sourceId = this.scriptCodeHidden && this.currentSourceId
        ? await this.saveHiddenScriptParams({ silent: true, loadingMode: 'live' })
        : await this.saveScript(false, {
          skipUnchanged: true,
          silent: true,
          loadingMode: 'live',
          updateRoute: false
        })
      if (!sourceId) return
      if (this.adaptedBacktestRequired && !await this.hasSuccessfulBacktest(sourceId)) {
        this.$message.warning(this.$t('community.backtestBeforeDeployment'))
        this.openBacktestCenter()
        return
      }
      if (this.currentAssetType === 'portfolio_strategy') {
        this.$router.push({
          path: '/strategy-center',
          query: {
            mode: 'create',
            assetType: 'portfolio_strategy',
            sourceId: String(sourceId)
          }
        }).catch(() => {})
        return
      }
      this.$router.push({
        path: '/strategy-center',
        query: {
          mode: 'create',
          sourceId: String(sourceId)
        }
      }).catch(() => {})
    },
    openVersionDrawer () {
      if (!this.currentSourceId) return
      if (this.scriptCodeHidden) {
        this.$message.info(this.text.versionHiddenBlocked)
        return
      }
      this.showVersionDrawer = true
      this.scriptVersionPreview = null
      this.loadScriptVersions()
    },
    async loadScriptVersions () {
      if (!this.currentSourceId) return
      this.scriptVersionLoading = true
      try {
        const res = await getScriptSourceVersions(this.currentSourceId)
        if (res && res.code === 1) {
          this.scriptVersions = Array.isArray(res.data) ? res.data : []
        } else {
          this.$message.error((res && res.msg) || this.text.versionLoadFailed)
        }
      } catch (e) {
        this.$message.error(e.backendMessage || e.message || this.text.versionLoadFailed)
      } finally {
        this.scriptVersionLoading = false
      }
    },
    async previewScriptVersion (item) {
      if (!item || !item.id) return
      if (this.scriptCodeHidden || item.code_hidden || item.hidden_source) {
        this.$message.info(this.text.versionHiddenBlocked)
        return
      }
      try {
        const res = await getScriptSourceVersion(item.id)
        if (res && res.code === 1) {
          this.scriptVersionPreview = res.data || null
        } else {
          this.$message.error((res && res.msg) || this.text.versionLoadFailed)
        }
      } catch (e) {
        this.$message.error(e.backendMessage || e.message || this.text.versionLoadFailed)
      }
    },
    confirmRestoreScriptVersion (item) {
      if (!item || !item.id) return
      if (this.scriptCodeHidden || item.code_hidden || item.hidden_source || item.restore_disabled) {
        this.$message.info(this.text.versionHiddenBlocked)
        return
      }
      this.$confirm({
        title: this.text.versionRestoreTitle,
        content: this.text.versionRestoreContent.replace('{version}', item.version_no),
        okText: this.text.versionRestore,
        cancelText: this.text.cancel,
        onOk: () => this.restoreScriptVersion(item)
      })
    },
    async restoreScriptVersion (item) {
      if (!item || !item.id) return
      if (this.scriptCodeHidden || item.code_hidden || item.hidden_source || item.restore_disabled) {
        this.$message.info(this.text.versionHiddenBlocked)
        return
      }
      this.restoringScriptVersionId = item.id
      try {
        const res = await restoreScriptSourceVersion(item.id)
        if (res && res.code === 1 && res.data) {
          this.applySource(res.data)
          await this.loadSources()
          await this.loadScriptVersions()
          this.scriptVersionPreview = null
          this.$message.success(this.text.versionRestored)
        } else {
          this.$message.error((res && res.msg) || this.text.versionRestoreFailed)
        }
      } catch (e) {
        this.$message.error(e.backendMessage || e.message || this.text.versionRestoreFailed)
      } finally {
        this.restoringScriptVersionId = null
      }
    },
    async openIndicatorConvertPicker () {
      this.indicatorConvertContext = null
      this.selectedIndicatorConvertId = undefined
      this.indicatorConvertInstruction = ''
      this.indicatorConvertError = ''
      this.showIndicatorConvertModal = true
      await this.loadIndicatorOptions()
    },
    async loadIndicatorOptions () {
      this.indicatorConvertIndicatorLoading = true
      try {
        const res = await getIndicatorListForStrategy()
        const list = this.extractIndicatorList(res)
          .map(item => this.normalizeIndicator(item))
          .filter(Boolean)
        this.indicatorConvertIndicators = list
      } catch (e) {
        this.indicatorConvertIndicators = []
        this.indicatorConvertError = e.backendMessage || e.message || this.text.indicatorConvertFailed
      } finally {
        this.indicatorConvertIndicatorLoading = false
      }
    },
    extractIndicatorList (res) {
      const data = res && res.data
      if (Array.isArray(data)) return data
      return []
    },
    normalizeIndicator (raw) {
      if (!raw || typeof raw !== 'object') return null
      const codeHidden = this.toBool(raw.code_hidden ?? raw.codeHidden)
      return {
        indicatorId: String(raw.indicatorId || raw.id || '').trim(),
        name: String(raw.name || this.defaultIndicatorNameFromCode(raw.code || '') || '').trim(),
        description: String(raw.description || '').trim(),
        code: codeHidden ? '' : String(raw.code || '').trim(),
        params: raw.params || {},
        market: String(raw.market || '').trim(),
        symbol: String(raw.symbol || '').trim(),
        exchange_id: String(raw.exchange_id || '').trim(),
        market_type: String(raw.market_type || '').trim(),
        instrument_id: String(raw.instrument_id || '').trim(),
        timeframe: String(raw.timeframe || '').trim(),
        codeHidden
      }
    },
    toBool (value) {
      if (value === true || value === 1) return true
      return ['1', 'true', 'yes', 'y'].includes(String(value || '').trim().toLowerCase())
    },
    defaultIndicatorNameFromCode (code) {
      const match = String(code || '').match(/^\s*my_indicator_name\s*=\s*(['"])(.*?)\1\s*$/m)
      return match ? match[2] : ''
    },
    handleIndicatorConvertSelect (id) {
      const target = (this.indicatorConvertIndicators || []).find(item => String(item.indicatorId) === String(id))
      this.indicatorConvertContext = target || null
      this.indicatorConvertError = ''
    },
    resolveIndicatorConversionContext (ctx = {}) {
      const query = (this.$route && this.$route.query) || {}
      return resolveIndicatorStrategyContext(ctx, query, this.runConfig || {})
    },
    buildIndicatorConversionPrompt () {
      const ctx = this.indicatorConvertContext || {}
      const source = this.resolveIndicatorConversionContext(ctx)
      const params = ctx.params && Object.keys(ctx.params).length ? JSON.stringify(ctx.params, null, 2) : '{}'
      const instruction = String(this.indicatorConvertInstruction || '').trim() ||
        'Convert the visible indicator signals into a conservative, event-based strategy. Confirm signals on closed bars and execute on the next bar to avoid look-ahead bias.'
      return [
        'Convert this QuantDinger chart-only indicator into executable QuantDinger Strategy API V2 Python code.',
        '',
        'Hard boundaries:',
        '- Return Strategy API V2 code only, using the current manifest and handler contract.',
        '- Start with a metadata docstring, then define initialize(context) and handle_data(context, data). This conversion must remain a single-instrument CTA; do not use on_rebalance or a portfolio manifest.',
        '- The strategy source owns its universe, markets, subscriptions, frequency, factors, schedules, direction, sizing, entries, exits, and risk rules.',
        '- Preserve the source instrument and timeframe below in context.set_universe(...) and context.subscribe(...). Never replace them with USStock:SPY or another fallback instrument.',
        '- In initialize(context), call context.set_universe(...) and context.subscribe(frequency=...). Use context.set_warmup(...) when indicators need history.',
        '- Backtest and deployment panels only provide initial capital, date range, and optional leverage for a Crypto @swap strategy that explicitly calls context.allow_leverage(max_leverage=N).',
        '- Preserve the indicator signal logic first. Map visual buy/entry markers to long entries, sell/exit markers to long exits, and warning markers to wait/risk states.',
        '- Default to long-only. Shorts require an explicit user request and a preserved Crypto @swap instrument; express short-entry conditions independently from long exits.',
        '- First classify every marker as long entry, long exit, short entry, short exit, warning/wait, or visual-only. Marker color and type="sell" alone do not prove short-entry intent.',
        '- Preserve composite event algebra exactly. For edge(A | B), compare the complete previous composite A_prev | B_prev; do not emit a duplicate event on the next bar.',
        '- If the user explicitly requests symmetric shorts from a long-only indicator, derive and label them as new behavior; otherwise do not invent short entries.',
        '- Confirm indicator conditions on completed bars. In backtests, market orders from handle_data become eligible at the next available bar open; live orders are asynchronous and fills must be confirmed.',
        '- Follow the server-provided Strategy API V2 system contract and active capability definitions for exact API signatures, factor semantics, bar clocks, and native protection rules.',
        '- Use get_history, indicator, factor, get_factors, and get_fundamentals without future data. TA-Lib functions are available through indicator/factor.',
        '- Use data.current(symbol, field) for current scalar values. There is no get_current_data API. get_position(symbol) returns a Position with amount, avg_cost, and last_price; it has no quantity or cost_basis.',
        '- Fundamental factors are point-in-time and portfolio-oriented; never invent fundamental values or backfill future observations.',
        '- Use order, order_value, order_target, order_target_value, and order_target_percent. Prevent duplicate intents on the same bar.',
        '- Declare tunable strategy knobs with # @param and read matching context.params defaults only inside handlers or callbacks, never inside initialize(context).',
        '- For risk-managed entries, attach native protection using stop_loss_pct, take_profit_pct, trailing_stop_pct, trailing_activation_pct, or time_limit_seconds. Spot strategies may also call set_default_protection inside an executable handler before entry; Crypto swaps require direct protection on every entry leg. Ratios use decimals: 0.03 means 3%. Signal exits alone do not implement native protection.',
        '- Remove display-only parameters such as colors, visibility toggles, marker offsets, line extension, and plot layout.',
        '- Do not generate grid, DCA, or martingale logic unless the user explicitly requests a Strategy API V2 robot.',
        '',
        `Indicator name: ${ctx.name || this.text.defaultIndicatorName}`,
        ctx.description ? `Indicator description: ${ctx.description}` : '',
        source.instrument ? `Source instrument: ${source.instrument}` : '',
        source.timeframe ? `Source timeframe: ${source.timeframe}` : '',
        `Indicator params JSON:\n${params}`,
        '',
        `User conversion request:\n${instruction}`,
        '',
        `Indicator source code:\n\`\`\`python\n${ctx.code || ''}\n\`\`\``
      ].filter(Boolean).join('\n')
    },
    async confirmIndicatorToStrategy () {
      const ctx = this.indicatorConvertContext || {}
      if (!ctx.indicatorId) {
        this.indicatorConvertError = this.text.indicatorConvertSelectFirst
        return
      }
      if (ctx.codeHidden || !ctx.code) {
        this.indicatorConvertError = ctx.codeHidden ? this.text.indicatorConvertHiddenBlocked : this.text.indicatorConvertNoCode
        return
      }
      this.indicatorConvertLoading = true
      this.indicatorConvertError = ''
      try {
        const source = this.resolveIndicatorConversionContext(ctx)
        const res = await aiGenerateStrategy({
          prompt: this.buildIndicatorConversionPrompt(),
          assetType: 'script',
          generationMode: 'indicator_conversion',
          existingCode: '',
          context: {
            source: 'indicator_ide_conversion',
            conversionRequest: String(this.indicatorConvertInstruction || '').trim(),
            instrument: source.instrument,
            timeframe: source.timeframe
          }
        })
        const code = this.extractAiGeneratedCode(res)
        if (!code) throw new Error((res && res.msg) || this.text.indicatorConvertFailed)
        const created = await createScriptSource({
          name: this.extractScriptMetadataFromCode(code).name || `${ctx.name || this.text.defaultIndicatorName} Strategy`,
          description: this.extractScriptMetadataFromCode(code).description || `AI converted from indicator: ${ctx.name || this.text.defaultIndicatorName}`,
          code,
          metadata: this.buildGeneratedMetadata(ctx)
        })
        if (!(created && created.code === 1)) throw new Error((created && created.msg) || this.text.indicatorConvertFailed)
        await this.loadSources()
        const sourceId = this.getScriptSourceId(created.data)
        await this.openSource(sourceId, { updateRoute: false })
        this.finishIndicatorConversion(sourceId)
        this.$message.success(this.text.indicatorConvertSuccess)
      } catch (e) {
        this.indicatorConvertError = this.localizeStrategyAiError(e)
      } finally {
        this.indicatorConvertLoading = false
      }
    },
    extractAiGeneratedCode (res) {
      if (!res || typeof res !== 'object') return ''
      const data = res.data || {}
      const candidates = [res.code, data.code]
      const code = candidates.find(item => typeof item === 'string' && item.trim())
      return code ? String(code).trim() : ''
    },
    buildGeneratedMetadata (ctx = {}) {
      const source = this.resolveIndicatorConversionContext(ctx)
      const lastRunConfig = {
        ...this.buildTradingConfig(),
        market_category: source.market || this.runConfig.market_category,
        symbol: source.symbol || this.runConfig.symbol,
        timeframe: source.timeframe || this.runConfig.timeframe,
        exchange_id: source.market.toLowerCase() === 'crypto' ? source.exchangeId : '',
        market_type: source.marketType
      }
      return {
        generated_by: 'ai_indicator_to_strategy',
        source_indicator_id: ctx.indicatorId || '',
        source_indicator_name: ctx.name || '',
        source_indicator_market: source.market,
        source_indicator_symbol: source.symbol,
        source_indicator_instrument: source.instrument,
        source_indicator_timeframe: source.timeframe,
        lifecycle_verified: false,
        script_verified: false,
        last_run_config: lastRunConfig,
        script_template_params: {}
      }
    },
    closeIndicatorConvertModal () {
      if (this.indicatorConvertLoading) return
      this.showIndicatorConvertModal = false
      this.indicatorConvertError = ''
      this.clearIndicatorConvertSession()
      this.clearIndicatorConvertRoute()
    },
    finishIndicatorConversion (sourceId) {
      this.showIndicatorConvertModal = false
      this.indicatorConvertError = ''
      this.clearIndicatorConvertSession()
      this.writeRouteSource(sourceId)
    },
    clearIndicatorConvertSession () {
      const key = String((this.$route.query || {}).convert_key || '').trim()
      if (!key || typeof sessionStorage === 'undefined') return
      try {
        sessionStorage.removeItem(key)
      } catch (_) {}
    },
    async applyIndicatorConvertRouteOnce () {
      const query = this.$route.query || {}
      if (!this.isIndicatorConvertRoute()) return
      let context = null
      const key = String(query.convert_key || '').trim()
      if (key && typeof sessionStorage !== 'undefined') {
        try {
          context = JSON.parse(sessionStorage.getItem(key) || 'null')
        } catch (_) {
          context = null
        }
      }
      if (!(this.indicatorConvertIndicators || []).length) {
        await this.loadIndicatorOptions()
      }
      if (context) {
        const storedContext = this.normalizeIndicator(context)
        if (storedContext) {
          const sourceIndex = (this.indicatorConvertIndicators || []).findIndex(item => String(item.indicatorId) === storedContext.indicatorId)
          if (sourceIndex >= 0) {
            const mergedContext = {
              ...this.indicatorConvertIndicators[sourceIndex],
              ...storedContext
            }
            this.indicatorConvertIndicators.splice(sourceIndex, 1, mergedContext)
            context = mergedContext
          } else {
            this.indicatorConvertIndicators.unshift(storedContext)
            context = storedContext
          }
        }
      } else if (query.source_indicator_id || query.indicator_id) {
        context = (this.indicatorConvertIndicators || []).find(item => String(item.indicatorId) === String(query.source_indicator_id || query.indicator_id))
      }
      if (!context) return
      this.indicatorConvertContext = context
      this.selectedIndicatorConvertId = context.indicatorId ? String(context.indicatorId) : undefined
      this.showIndicatorConvertModal = true
    },
    clearIndicatorConvertRoute () {
      const query = { ...(this.$route.query || {}) }
      delete query.convert
      delete query.convert_key
      delete query.source_indicator_id
      delete query.indicator_id
      delete query.indicatorId
      delete query.market
      delete query.symbol
      delete query.timeframe
      this.replaceRouteQuery(query)
    },
    marketLabel (market) {
      const text = String(market || '').trim()
      if (!text) return '-'
      const key = `dashboard.indicator.market.${text}`
      const translated = this.$t(key)
      return translated && translated !== key ? translated : text
    },
    formatTime (value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
      return date.toLocaleString()
    }
  }
}
</script>

<style lang="less" scoped>
.strategy-ide-shell {
  box-sizing: border-box;
  height: calc(100vh - 64px);
  padding: 10px;
  color: #252a34;
  background: #f4f5f7;
  overflow: hidden;
}

.adapted-backtest-alert {
  flex: 0 0 auto;
  margin-bottom: 10px;
}

.strategy-ide-layout {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.script-panel {
  height: auto;
  flex: 1;
  min-height: 0;
  border: 1px solid #e1e4e8;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.script-panel ::v-deep .strategy-editor {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.script-panel ::v-deep .editor-top-toolbar {
  flex: 0 0 auto;
}

.script-panel ::v-deep .editor-layout {
  flex: 1 1 auto;
  height: calc(100% - 57px);
  min-height: 0;
}

.script-panel ::v-deep .editor-layout--split {
  grid-template-columns: minmax(280px, 18%) minmax(520px, 1fr) minmax(340px, 29%);
  grid-template-rows: minmax(0, 1fr);
}

.script-panel ::v-deep .editor-layout--split.editor-layout--split-no-params {
  grid-template-columns: minmax(520px, 1fr) minmax(340px, 29%);
}

.script-panel ::v-deep .editor-layout--split-no-params .code-col {
  grid-column: 1;
}

.script-panel ::v-deep .editor-layout--split-no-params .strategy-ai-workspace-host--primary {
  grid-column: 2;
}

.script-panel ::v-deep .code-col,
.script-panel ::v-deep .side-col {
  height: 100%;
  min-height: 0;
}

.script-panel ::v-deep .editor-layout--split .side-col {
  height: 100%;
}

.script-panel ::v-deep .side-tabs {
  height: 100%;
  min-height: 0;
}

.script-panel ::v-deep .code-section {
  height: auto;
  min-height: 180px;
  flex: 1 1 auto;
}

.script-panel ::v-deep .code-editor-container {
  min-height: 0;
}

.script-panel ::v-deep .CodeMirror {
  height: 100% !important;
}

.ide-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid #e1e4e8;
  background: #f9fafb;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.toolbar-left {
  flex: 1 1 auto;
}

.toolbar-right {
  flex: 0 0 auto;
}

.strategy-workspace-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 10px;
  border-right: 1px solid #e5e7eb;
}

.strategy-workspace-switcher /deep/ .ant-radio-group {
  display: inline-flex;
  overflow: hidden;
  border-radius: 6px;
}

.strategy-workspace-copy {
  display: flex;
  width: 150px;
  min-width: 0;
  flex-direction: column;
  line-height: 1.25;
}

.strategy-workspace-copy strong {
  color: #202735;
  font-size: 13px;
}

.strategy-workspace-copy span {
  margin-top: 3px;
  overflow: hidden;
  color: #7b8494;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strategy-workspace-switcher /deep/ .ant-radio-button-wrapper {
  height: 36px;
  padding: 0 13px;
  line-height: 34px;
  font-weight: 700;
  border-radius: 0;
}

.strategy-workspace-switcher /deep/ .ant-radio-button-wrapper:first-child {
  border-radius: 6px 0 0 6px;
}

.strategy-workspace-switcher /deep/ .ant-radio-button-wrapper:last-child {
  border-radius: 0 6px 6px 0;
}

.script-select-label {
  flex: 0 0 auto;
  color: #6b7280;
  font-size: 13px;
  font-weight: 600;
}

.script-select {
  width: 280px;
}

.ide-icon-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ide-icon-btn--danger {
  color: #ff4d4f;
  border-color: rgba(255, 77, 79, 0.45);
}

.script-save-button,
.script-live-button,
.script-backtest-button,
.indicator-convert-button,
.robot-template-button,
.factor-library-button,
.universe-library-button {
  height: 36px;
  font-weight: 700;
}

.strategy-ai-workspace {
  position: relative;
  height: 100%;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e1e4e8;
  border-radius: 9px;
  background: #fff;
}

.strategy-ai-workspace--collapsed {
  min-height: 42px;
  height: 42px;
}

.strategy-ai-header {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 12px;
  border-bottom: 1px solid #e7e9ed;
  background: #f7f8fa;
  cursor: pointer;
}

.strategy-ai-header__title,
.strategy-ai-header__actions {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.strategy-ai-header__title {
  flex-wrap: wrap;
}

.strategy-ai-header__title > .anticon { color: var(--primary-color, #52c41a); }
.strategy-ai-header__title strong { color: #25324a; font-size: 13px; }

.strategy-ai-contract-badge,
.strategy-ai-memory-badge,
.strategy-ai-message__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1.4;
}

.strategy-ai-contract-badge { color: #1677ff; background: #e6f4ff; }
.strategy-ai-memory-badge { color: #389e0d; background: #f0f9eb; }

.strategy-ai-body {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 10px;
  flex: 1 1 auto;
  padding: 10px;
}

.strategy-ai-conversation {
  min-height: 0;
  padding: 10px;
  overflow-y: auto;
  border: 1px solid #e4e7eb;
  border-radius: 8px;
  background: #f7f8fa;
}

.strategy-ai-empty {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #8491a5;
  text-align: center;
  font-size: 11px;
}

.strategy-ai-empty > .anticon { color: var(--primary-color, #52c41a); font-size: 22px; }
.strategy-ai-empty strong { color: #25324a; font-size: 13px; }
.strategy-ai-empty span { max-width: 560px; }

.strategy-ai-locked {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  color: #8491a5;
  text-align: center;
  background: #fafafa;
}

.strategy-ai-locked > .anticon { color: #d89614; font-size: 24px; }
.strategy-ai-locked strong { color: #25324a; font-size: 13px; }

.theme-dark .strategy-ai-locked {
  border-color: #3a414c;
  color: #8c98aa;
  background: #17191d;
}

.theme-dark .strategy-ai-locked strong { color: #e5e9f0; }

.strategy-ai-quick-prompts {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 4px;
}

.strategy-ai-quick-prompts button {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #dce3ec;
  border-radius: 999px;
  color: #526079;
  background: #fff;
  font-size: 10px;
  cursor: pointer;
}

.strategy-ai-quick-prompts button:hover {
  border-color: var(--primary-color, #52c41a);
  color: var(--primary-color, #52c41a);
}

.strategy-ai-message { max-width: 92%; margin-bottom: 10px; }
.strategy-ai-message--user { margin-left: auto; }
.strategy-ai-message__role { margin: 0 4px 3px; color: #96a0b2; font-size: 9px; }
.strategy-ai-message--user .strategy-ai-message__role { text-align: right; }
.strategy-ai-message__badge { margin-left: 5px; color: #1677ff; background: #e6f4ff; }
.strategy-ai-message__badge--error { color: #cf1322; background: #fff1f0; }
.strategy-ai-message__content {
  padding: 8px 10px;
  border-radius: 9px 9px 9px 3px;
  color: #354056;
  background: #f1f4f8;
  font-size: 11px;
  line-height: 1.55;
  white-space: normal;
  word-break: break-word;
}
.strategy-ai-message--error .strategy-ai-message__content {
  border: 1px solid #ffccc7;
  color: #a8071a;
  background: #fff2f0;
}
.strategy-ai-message__content ::v-deep p { margin: 0 0 7px; }
.strategy-ai-message__content ::v-deep p:last-child { margin-bottom: 0; }
.strategy-ai-message__content ::v-deep h3,
.strategy-ai-message__content ::v-deep h4,
.strategy-ai-message__content ::v-deep h5 { margin: 10px 0 5px; color: inherit; font-size: 12px; line-height: 1.45; }
.strategy-ai-message__content ::v-deep ul,
.strategy-ai-message__content ::v-deep ol { margin: 5px 0 7px; padding-left: 19px; }
.strategy-ai-message__content ::v-deep li { margin: 2px 0; }
.strategy-ai-message__content ::v-deep blockquote { margin: 7px 0; padding: 5px 8px; border-left: 3px solid var(--primary-color, #52c41a); color: #68758a; background: rgba(82, 196, 26, 0.06); }
.strategy-ai-message__content ::v-deep code { padding: 1px 4px; border-radius: 4px; color: #d46b08; background: rgba(250, 140, 22, 0.1); font: 10px/1.45 'Fira Code', Consolas, monospace; }
.strategy-ai-message__content ::v-deep .qd-markdown-code { margin: 7px 0; padding: 9px; overflow-x: auto; border-radius: 6px; color: #d9e2f1; background: #1f2430; white-space: pre; }
.strategy-ai-message__content ::v-deep .qd-markdown-code code { padding: 0; color: inherit; background: transparent; }
.strategy-ai-message__content ::v-deep hr { margin: 8px 0; border: 0; border-top: 1px solid rgba(127, 140, 160, 0.24); }
.strategy-ai-message__content ::v-deep a { color: #1677ff; text-decoration: underline; }
.strategy-ai-message__content ::v-deep .qd-markdown-table-wrap { max-width: 100%; margin: 7px 0; overflow-x: auto; }
.strategy-ai-message__content ::v-deep .qd-markdown-table { width: 100%; border-collapse: collapse; font-size: 10px; }
.strategy-ai-message__content ::v-deep .qd-markdown-table th,
.strategy-ai-message__content ::v-deep .qd-markdown-table td { padding: 5px 6px; border: 1px solid rgba(127, 140, 160, 0.22); text-align: left; }
.strategy-ai-message--user .strategy-ai-message__content {
  border: 1px solid #d9f7be;
  border-radius: 9px 9px 3px 9px;
  color: #24570f;
  background: #f0f9eb;
}
.strategy-ai-message--thinking { opacity: 0.74; }

.strategy-ai-candidate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: -1px;
  padding: 8px 10px;
  border: 1px solid #b7eb8f;
  border-radius: 0 0 9px 3px;
  color: #389e0d;
  background: #f6ffed;
  font-size: 10px;
}

.strategy-ai-candidate--warning { border-color: #ffd591; color: #d46b08; background: #fff7e6; }
.strategy-ai-candidate__actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

.strategy-ai-composer {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  background: #fff;
}
.strategy-ai-composer ::v-deep textarea.ant-input {
  min-height: 78px;
  max-height: 130px;
  flex: 1 1 auto;
  resize: vertical;
  line-height: 1.55;
}
.strategy-ai-composer__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 7px;
  color: #9aa4b3;
  font-size: 9px;
}
.strategy-ai-send { min-width: 96px; height: 36px; border-radius: 8px; font-weight: 700; }

.strategy-ai-preview-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; color: #718096; font-size: 12px; }
.strategy-ai-preview-toolbar > div { display: flex; gap: 8px; }
.strategy-ai-code-preview {
  max-height: 64vh;
  margin: 0;
  padding: 14px;
  overflow: auto;
  border-radius: 8px;
  color: #d4d4d4;
  background: #1e1e1e;
  font: 12px/1.55 'Fira Code', Consolas, monospace;
  white-space: pre;
}

.script-save-button,
.script-live-button {
  min-width: 76px;
}

.script-backtest-button,
.indicator-convert-button {
  min-width: 120px;
}

.universe-library-button--selected {
  border-color: var(--primary-color, #52c41a);
  color: var(--primary-color, #52c41a);
  background: rgba(82, 196, 26, 0.08);
}

.theme-dark {
  color: rgba(255, 255, 255, 0.82);
  background: #101010;

  .script-panel {
    border-color: #2c2c2c;
    background: #171717;
  }

  .ide-toolbar {
    border-bottom-color: #2c2c2c;
    background: #1b1b1b;
  }

  .script-select-label {
    color: rgba(255, 255, 255, 0.62);
  }

  .strategy-workspace-copy strong {
    color: rgba(255, 255, 255, 0.9);
  }

  .strategy-workspace-copy span {
    color: rgba(255, 255, 255, 0.46);
  }

  .strategy-workspace-switcher {
    border-right-color: rgba(255, 255, 255, 0.1);
  }

  .strategy-workspace-switcher /deep/ .ant-radio-button-wrapper {
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.68);
    background: #202020;
  }

  .strategy-workspace-switcher /deep/ .ant-radio-button-wrapper-checked {
    border-color: var(--primary-color, #52c41a);
    color: #fff;
    background: var(--primary-color, #52c41a);
  }

  ::v-deep .ant-select-selection,
  ::v-deep .ant-input,
  ::v-deep textarea.ant-input,
  ::v-deep .ant-input-number,
  ::v-deep .ant-input-number-input {
    background: #111 !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
    color: rgba(255, 255, 255, 0.86) !important;
  }

  .strategy-ai-workspace,
  .strategy-ai-composer {
    border-color: #303030;
    background: #191919;
  }

  .strategy-ai-header {
    border-bottom-color: #303030;
    background: #202020;
  }

  .strategy-ai-header__title strong,
  .strategy-ai-empty strong {
    color: rgba(255, 255, 255, 0.88);
  }

  .strategy-ai-conversation {
    border-color: #2b2b2b;
    background: #131313;
  }

  .strategy-ai-message__content {
    color: rgba(255, 255, 255, 0.76);
    background: #242424;
  }

  .strategy-ai-message--user .strategy-ai-message__content {
    border-color: rgba(82, 196, 26, 0.28);
    color: #d9f7be;
    background: rgba(82, 196, 26, 0.12);
  }

  .strategy-ai-message__badge--error {
    color: #ff7875;
    background: rgba(255, 77, 79, 0.14);
  }

  .strategy-ai-message--error .strategy-ai-message__content {
    border-color: rgba(255, 77, 79, 0.42);
    color: #ffb3b0;
    background: rgba(255, 77, 79, 0.1);
  }

  .strategy-ai-quick-prompts button {
    border-color: rgba(255, 255, 255, 0.13);
    color: rgba(255, 255, 255, 0.62);
    background: #1f1f1f;
  }

}

@media (max-width: 1180px) {
  .ide-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    flex-wrap: wrap;
  }

  .script-select {
    flex: 1 1 260px;
    width: auto;
  }

  .script-panel ::v-deep .editor-layout--split {
    grid-template-columns: minmax(250px, 27%) minmax(480px, 1fr);
    grid-template-rows: minmax(420px, 1fr) minmax(320px, auto);
  }

  .script-panel ::v-deep .editor-layout--split.editor-layout--split-no-params {
    grid-template-columns: minmax(480px, 1fr) minmax(320px, 36%);
    grid-template-rows: minmax(420px, 1fr);
  }

  .script-panel ::v-deep .editor-layout--split .side-col {
    grid-column: 1;
    grid-row: 1;
  }

  .script-panel ::v-deep .editor-layout--split .code-col {
    grid-column: 2;
    grid-row: 1;
  }

  .script-panel ::v-deep .editor-layout--split .strategy-ai-workspace-host--primary {
    grid-column: 1 / 3;
    grid-row: 2;
  }

  .script-panel ::v-deep .editor-layout--split-no-params .code-col {
    grid-column: 1;
    grid-row: 1;
  }

  .script-panel ::v-deep .editor-layout--split-no-params .strategy-ai-workspace-host--primary {
    grid-column: 2;
    grid-row: 1;
  }

  .strategy-ai-quick-prompts {
    grid-template-columns: minmax(0, 1fr);
  }

}

@media (max-width: 768px) {
  .strategy-ide-shell {
    height: auto;
    min-height: calc(100vh - 64px);
    overflow: auto;
  }

  .script-panel ::v-deep .editor-layout--split {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }

  .script-panel ::v-deep .editor-layout--split.editor-layout--split-no-params {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }

  .script-panel ::v-deep .editor-layout--split .side-col,
  .script-panel ::v-deep .editor-layout--split .code-col,
  .script-panel ::v-deep .editor-layout--split .strategy-ai-workspace-host--primary {
    grid-column: 1;
    min-height: 360px;
  }

  .script-panel ::v-deep .editor-layout--split .side-col { grid-row: 1; }
  .script-panel ::v-deep .editor-layout--split .code-col { grid-row: 2; }
  .script-panel ::v-deep .editor-layout--split .strategy-ai-workspace-host--primary { grid-row: 3; }
  .script-panel ::v-deep .editor-layout--split-no-params .code-col { grid-row: 1; }
  .script-panel ::v-deep .editor-layout--split-no-params .strategy-ai-workspace-host--primary { grid-row: 2; }
}
</style>

<style lang="less">
.strategy-source-dropdown {
  z-index: 10050 !important;

  .ant-dropdown-menu {
    overflow: hidden;
    padding: 0;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
}

.strategy-source-dropdown-trigger {
  display: inline-flex;
  height: 36px;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  border-radius: 6px;

  .strategy-source-trigger-text {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    margin-right: 6px;
    font-size: 12px;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.strategy-source-overlay {
  width: 280px;
  max-width: calc(100vw - 24px);
  max-height: 320px;
  overflow: auto;
  padding: 8px 0;
  background: #fff;
}

.strategy-source-overlay-hint,
.strategy-source-overlay-empty {
  padding: 0 12px 8px;
  color: #8c8c8c;
  font-size: 11px;
  line-height: 1.4;
}

.strategy-source-overlay-empty {
  padding-top: 8px;
}

.strategy-source-market-entry {
  display: flex;
  width: calc(100% - 16px);
  height: 34px;
  align-items: center;
  justify-content: space-between;
  margin: 0 8px 8px;
  padding: 0 10px;
  border: 1px solid rgba(82, 196, 26, 0.26);
  border-radius: 6px;
  outline: none;
  background: rgba(82, 196, 26, 0.08);
  color: #389e0d;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  &:hover,
  &:focus-visible {
    border-color: rgba(82, 196, 26, 0.48);
    background: rgba(82, 196, 26, 0.14);
  }
}

.strategy-source-overlay-loading {
  display: block;
  padding: 12px;
}

.strategy-source-overlay-list {
  padding: 0 4px;
}

.strategy-source-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 0;
  border-radius: 6px;
  outline: none;
  background: transparent;
  color: #262626;
  font-size: 12px;
  text-align: left;
  cursor: pointer;

  .anticon {
    flex: 0 0 12px;
    color: transparent;
  }

  span {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    background: #f5f5f5;
  }

  &.active {
    color: #389e0d;
    font-weight: 600;

    .anticon {
      color: #52c41a;
    }
  }
}

.strategy-source-dropdown--dark {
  .ant-dropdown-menu,
  .strategy-source-overlay {
    border-color: #363636;
    background: #1f1f1f;
  }

  .strategy-source-overlay-hint,
  .strategy-source-overlay-empty {
    color: rgba(255, 255, 255, 0.45);
  }

  .strategy-source-market-entry {
    border-color: rgba(82, 196, 26, 0.28);
    background: rgba(82, 196, 26, 0.1);
    color: #73d13d;

    &:hover,
    &:focus-visible {
      border-color: rgba(82, 196, 26, 0.52);
      background: rgba(82, 196, 26, 0.17);
    }
  }

  .strategy-source-row {
    color: rgba(255, 255, 255, 0.85);

    &:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    &.active {
      color: #73d13d;
    }
  }
}

.strategy-ai-preview-modal--dark {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body {
    border-color: #303030;
    background: #181818;
  }

  .ant-modal-title,
  .ant-modal-close,
  .strategy-ai-preview-toolbar {
    color: rgba(255, 255, 255, 0.82);
  }
}

.robot-builder-drawer {
  .ant-drawer-content-wrapper {
    max-width: 96vw;
  }

  .ant-drawer-body {
    height: calc(100vh - 55px);
    display: flex;
    overflow: hidden;
    padding: 14px 18px 18px;
    background: #f4f6f8;
    flex-direction: column;
  }

  .robot-builder-intro {
    flex: 0 0 auto;
    margin-bottom: 12px;
    padding: 10px 12px;
    border: 1px solid #d9e2ec;
    border-radius: 8px;
    background: #fff;
    color: #52606d;
  }

  .executor-page {
    min-height: 0;
    flex: 1;
  }
}

.ai-strategy-generator {
  display: grid;
  gap: 14px;
}

.ai-strategy-generator-modal--dark {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body,
  .ant-modal-footer {
    border-color: #303030;
    background: #1f1f1f;
  }

  .ant-modal-title,
  .ant-modal-close,
  .ant-modal-body {
    color: rgba(255, 255, 255, 0.88);
  }

  .ant-input {
    border-color: #434343;
    background: #141414;
    color: rgba(255, 255, 255, 0.88);
  }

  .ant-alert-info {
    border-color: rgba(82, 196, 26, 0.28);
    background: rgba(82, 196, 26, 0.08);
  }

  .ant-alert-message {
    color: rgba(255, 255, 255, 0.76);
  }
}

.robot-builder-drawer--dark {
  .ant-drawer-header,
  .ant-drawer-content,
  .ant-drawer-body {
    border-color: #2b2b2b;
    background: #0b0b0b;
    color: rgba(255, 255, 255, 0.86);
  }

  .ant-drawer-title,
  .ant-drawer-close {
    color: rgba(255, 255, 255, 0.86);
  }

  .robot-builder-intro {
    border-color: #2b2b2b;
    background: #151515;
    color: rgba(255, 255, 255, 0.58);
  }
}

.script-publish-modal {
  .ant-modal-content {
    overflow: hidden;
    border-radius: 12px;
  }

  .ant-modal-header {
    padding: 18px 24px;
    border-bottom: 1px solid #edf0f5;
  }

  .ant-modal-body {
    padding: 18px 24px 20px;
    background: #f6f7f9;
  }

  .ant-modal-footer {
    padding: 14px 24px;
    border-top: 1px solid #edf0f5;
    background: #fff;
  }

  .publish-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .publish-summary-card {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 74px;
    padding: 14px;
    border: 1px solid rgba(255, 77, 79, 0.22);
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(255, 77, 79, 0.1) 0%, #fff 72%);
  }

  .publish-summary-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #fff;
    background: var(--primary-color, #ff4d4f);
    box-shadow: 0 10px 24px rgba(255, 77, 79, 0.24);
    font-size: 18px;
  }

  .publish-summary-main {
    flex: 1;
    min-width: 0;
  }

  .publish-summary-label {
    margin-bottom: 3px;
    font-size: 12px;
    font-weight: 700;
    color: #6b7280;
  }

  .publish-summary-name {
    overflow: hidden;
    color: #111827;
    font-size: 16px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .publish-summary-tag {
    margin: 0;
    height: 24px;
    line-height: 22px;
    border-radius: 999px;
    font-weight: 700;
  }

  .publish-note {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
    color: #4b5563;
    font-size: 13px;
    line-height: 1.55;
  }

  .publish-note .anticon {
    margin-top: 3px;
    color: var(--primary-color, #ff4d4f);
  }

  .publish-backtest-gate {
    display: flex;
    align-items: center;
    gap: 11px;
    min-height: 64px;
    padding: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fff;

    &.is-checking {
      color: #1677ff;
      border-color: rgba(22, 119, 255, 0.24);
      background: rgba(22, 119, 255, 0.04);
    }

    &.is-passed {
      color: #389e0d;
      border-color: rgba(82, 196, 26, 0.34);
      background: rgba(82, 196, 26, 0.07);
    }

    &.is-required {
      color: #d48806;
      border-color: rgba(250, 173, 20, 0.38);
      background: rgba(250, 173, 20, 0.08);
    }

    &__icon {
      display: flex;
      width: 34px;
      height: 34px;
      flex: 0 0 34px;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: currentColor;

      .anticon {
        color: #fff;
        font-size: 16px;
      }
    }

    &__copy {
      display: flex;
      min-width: 0;
      flex: 1;
      flex-direction: column;
      gap: 3px;

      strong {
        color: #1f2937;
        font-size: 13px;
      }

      span {
        color: #6b7280;
        font-size: 12px;
        line-height: 1.5;
      }
    }

    .ant-btn {
      flex-shrink: 0;
    }

    &__button,
    &__button:hover,
    &__button:focus {
      border-color: var(--primary-color, #52c41a);
      background: var(--primary-color, #52c41a);
      color: #fff;

      .anticon {
        color: #fff;
      }
    }

    &__button:hover,
    &__button:focus {
      opacity: 0.9;
    }
  }

  .publish-contract-preview {
    padding: 12px;
    border: 1px solid rgba(82, 196, 26, 0.28);
    border-radius: 10px;
    background: rgba(82, 196, 26, 0.06);

    &__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;

      span {
        display: flex;
        min-width: 0;
        flex-direction: column;
        padding: 8px;
        border-radius: 7px;
        background: rgba(255, 255, 255, 0.8);
      }

      small { color: #6b7280; }
      b {
        overflow: hidden;
        color: #1f2937;
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    p {
      margin: 8px 0 0;
      color: #6b7280;
      font-size: 12px;
    }
  }

  .publish-section,
  .publish-option-card {
    padding: 14px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fff;
  }

  .publish-section-title,
  .field-label,
  .publish-option-head {
    color: #1f2937;
    font-size: 13px;
    font-weight: 800;
  }

  .publish-section-title {
    margin-bottom: 10px;
  }

  .publish-pricing-group {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
  }

  .publish-pricing-group .ant-radio-button-wrapper {
    height: 40px;
    line-height: 38px;
    padding: 0 14px;
    border: 1px solid #dfe3ea;
    border-radius: 8px !important;
    color: #4b5563;
    text-align: center;
    font-weight: 700;
    background: #fafafa;
    box-shadow: none;
  }

  .publish-pricing-group .ant-radio-button-wrapper::before {
    display: none;
  }

  .publish-pricing-group .ant-radio-button-wrapper-checked {
    color: #fff;
    border-color: var(--primary-color, #ff4d4f);
    background: var(--primary-color, #ff4d4f);
    box-shadow: 0 8px 18px rgba(255, 77, 79, 0.24);
  }

  .publish-price-box {
    margin-top: 12px;
  }

  .publish-price-input {
    width: 100%;
  }

  .publish-option-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .publish-option-card.active {
    border-color: var(--primary-color, #ff4d4f);
    background: linear-gradient(135deg, rgba(255, 77, 79, 0.08) 0%, #fff 76%);
    box-shadow: inset 0 0 0 1px rgba(255, 77, 79, 0.14);
  }

  .publish-option-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
  }

  .publish-hint {
    color: #6b7280;
    font-size: 12px;
    line-height: 1.55;
  }
}

.indicator-convert-modal {
  .indicator-convert-box {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .indicator-convert-selector {
    padding: 12px;
    border: 1px solid rgba(239, 68, 68, 0.18);
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.06);
  }

  .field-label {
    display: block;
    color: #334155;
    font-size: 13px;
    font-weight: 700;
  }

  .field-label--spaced {
    margin-top: 4px;
  }

  .indicator-convert-current {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px;
    border: 1px solid rgba(239, 68, 68, 0.18);
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(255, 255, 255, 0.96));
  }

  .indicator-convert-current span {
    display: block;
    margin-bottom: 4px;
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
  }

  .indicator-convert-current strong {
    color: #111827;
    font-size: 16px;
    font-weight: 800;
  }

  .indicator-convert-current small {
    color: #64748b;
    font-size: 12px;
    white-space: nowrap;
  }

  .indicator-convert-note {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 10px 12px;
    border: 1px solid rgba(59, 130, 246, 0.16);
    border-radius: 6px;
    background: rgba(59, 130, 246, 0.06);
    color: #475569;
    font-size: 13px;
    line-height: 1.55;
  }

  .indicator-convert-note .anticon {
    margin-top: 3px;
    color: #2563eb;
  }
}

.code-version-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.code-version-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.code-version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.code-version-item__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.code-version-item__main strong {
  color: #111827;
}

.code-version-item__main span,
.code-version-item__main small {
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code-version-item__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.code-version-preview {
  margin-top: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.code-version-preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.code-version-preview pre {
  max-height: 360px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.6;
}

.code-version-hidden {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 20px;
  text-align: center;
  color: #64748b;
  background: #0f172a;
}

.code-version-hidden .anticon {
  color: #52c41a;
  font-size: 24px;
}

.code-version-hidden strong {
  color: #e2e8f0;
}

.script-publish-modal--dark,
.indicator-convert-modal--dark,
.script-version-drawer--dark {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-footer,
  .ant-drawer-content,
  .ant-drawer-header {
    background: #181818;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .ant-modal-body {
    background: #141414;
  }

  .ant-modal-title,
  .ant-modal-close,
  .ant-drawer-title,
  .ant-drawer-close,
  .publish-section-title,
  .publish-option-head,
  .field-label,
  .code-version-item__main strong {
    color: rgba(255, 255, 255, 0.88);
  }

  .publish-summary-card,
  .indicator-convert-current {
    border-color: rgba(255, 77, 79, 0.32);
    background: linear-gradient(135deg, rgba(255, 77, 79, 0.18) 0%, #1c1c1c 72%);
  }

  .publish-summary-name,
  .indicator-convert-current strong {
    color: rgba(255, 255, 255, 0.9);
  }

  .publish-summary-label,
  .publish-hint,
  .indicator-convert-current span,
  .indicator-convert-current small,
  .code-version-toolbar,
  .code-version-item__main span,
  .code-version-item__main small {
    color: rgba(255, 255, 255, 0.52);
  }

  .publish-note,
  .publish-backtest-gate,
  .publish-section,
  .publish-option-card,
  .indicator-convert-selector,
  .indicator-convert-note,
  .code-version-item,
  .code-version-preview {
    border-color: rgba(255, 255, 255, 0.1);
    background: #1f1f1f;
  }

  .publish-backtest-gate {
    &.is-checking { background: rgba(22, 119, 255, 0.12); }
    &.is-passed { background: rgba(82, 196, 26, 0.12); }
    &.is-required { background: rgba(250, 173, 20, 0.12); }

    &__copy strong { color: rgba(255, 255, 255, 0.88); }
    &__copy span { color: rgba(255, 255, 255, 0.58); }
  }

  .publish-option-card.active {
    border-color: var(--primary-color, #ff4d4f);
    background: linear-gradient(135deg, rgba(255, 77, 79, 0.16) 0%, #1f1f1f 78%);
  }

  .code-version-preview__head {
    border-color: rgba(255, 255, 255, 0.08);
    background: #141414;
  }
}
</style>
