<template>
  <div class="indicator-ide" :class="{ 'theme-dark': isDarkTheme }">
    <!-- Main split panels -->
    <div class="ide-main">
      <div
        class="ide-code-rail"
        :class="{ 'is-open': codeDrawerVisible }"
        role="button"
        tabindex="0"
        :title="codeDrawerVisible ? $t('indicatorIde.hideCode') : $t('indicatorIde.showCode')"
        @click="toggleCodeDrawer"
        @keyup.enter="toggleCodeDrawer"
      >
        <a-icon type="code" class="ide-code-rail__icon" />
        <a-icon :type="codeDrawerVisible ? 'double-left' : 'double-right'" class="ide-code-rail__arrow" />
        <span class="ide-code-rail__label">{{ $t('indicatorIde.codeRailLabel') }}</span>
      </div>
      <!-- Left panel (collapsible drawer) -->
      <div v-show="codeDrawerVisible" ref="editorFullscreenEl" class="ide-left" :class="{ 'ide-panel--fullscreen': editorFullscreen }">
        <!-- Code Editor -->
        <div class="code-panel">
          <div class="panel-title">
            <div class="panel-title__leading">
              <a-icon type="code" />
              <a-tag v-if="codeDirty && !selectedIndicatorCodeHidden" color="orange" size="small">{{ $t('indicatorIde.modified') }}</a-tag>
            </div>
            <div class="panel-title__trailing">
              <div class="panel-title-actions" @click.stop>
                <div class="panel-title-icon-actions">
                  <a-tooltip :title="$t('dashboard.indicator.create')">
                    <a-button size="small" :loading="creatingIndicator" @click="handleCreateIndicator"><a-icon type="plus" /></a-button>
                  </a-tooltip>
                  <a-tooltip :title="$t('dashboard.indicator.action.delete')">
                    <a-button
                      size="small"
                      :disabled="!selectedIndicatorId"
                      :loading="deletingIndicator"
                      @click="handleDeleteIndicator"
                    ><a-icon type="delete" /></a-button>
                  </a-tooltip>
                  <a-tooltip :title="selectedIndicatorIsPurchased ? $t('indicatorIde.publishBlockedPurchased') : $t('dashboard.indicator.action.publish')">
                    <a-button size="small" :disabled="!selectedIndicatorId || selectedIndicatorIsPurchased" @click="handlePublishIndicator"><a-icon type="cloud-upload" /></a-button>
                  </a-tooltip>
                  <a-tooltip :title="$t('indicatorIde.saveAsNew')">
                    <a-button size="small" :disabled="!userId || selectedIndicatorCodeHidden || !currentCode" @click="openSaveAsIndicatorModal"><a-icon type="copy" /></a-button>
                  </a-tooltip>
                  <a-tooltip :title="editorFullscreen ? $t('indicatorIde.exitFullscreen') : $t('indicatorIde.fullscreenEditor')">
                    <a-button size="small" @click="toggleEditorFullscreen"><a-icon :type="editorFullscreen ? 'fullscreen-exit' : 'fullscreen'" /></a-button>
                  </a-tooltip>
                  <a-tooltip :title="chartIndicatorRunning ? $t('indicatorIde.stopIndicatorOnChart') : $t('indicatorIde.runIndicatorOnChart')">
                    <a-button
                      size="small"
                      :disabled="chartIndicatorToggleDisabled"
                      @click="toggleChartIndicatorRun"
                    >
                      <a-icon :type="chartIndicatorRunning ? 'pause-circle' : 'play-circle'" />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip :title="$t('indicatorIde.codeVersionHistory')">
                    <a-button size="small" :disabled="!selectedIndicatorId" @click="openCodeVersionDrawer"><a-icon type="history" /></a-button>
                  </a-tooltip>
                </div>
                <a-tooltip :title="selectedIndicatorCodeHidden ? $t('indicatorIde.saveBlockedHiddenCode') : $t('indicatorIde.saveShortcutHint')">
                  <a-button
                    class="ide-save-button"
                    type="primary"
                    size="small"
                    :loading="savingIndicator"
                    :disabled="!selectedIndicatorId || !codeDirty || selectedIndicatorCodeHidden"
                    @click="saveIndicator"
                  >
                    {{ $t('indicatorIde.save') }}
                  </a-button>
                </a-tooltip>
              </div>
            </div>
          </div>
          <div ref="codePanelBody" class="code-panel-body" :class="{ 'is-resizing': codeAiResizing }">
            <div class="code-editor-section" :style="{ flexBasis: `${codeAiSplitRatio}%` }">
              <div class="ide-guide-bar">
                <div class="ide-guide-copy">
                  <a-icon type="book" />
                  <span>{{ $t('indicatorIde.devGuideTooltip') }}</span>
                </div>
                <div class="ide-guide-actions">
                  <a-popover v-if="codeQualityChecked && sortedCodeQualityHints.length" placement="bottomRight" trigger="hover">
                    <template slot="content">
                      <ul class="code-quality-popover-list">
                        <li
                          v-for="(h, idx) in sortedCodeQualityHints"
                          :key="idx"
                          :class="qualityHintClass(h)"
                        >{{ formatQualityHint(h) }}</li>
                      </ul>
                    </template>
                    <span class="code-quality-top-status" :class="codeQualityTopStatusClass">
                      <a-icon :type="codeQualityTopStatusIcon" />
                      <span>{{ codeQualityTopStatusText }}</span>
                    </span>
                  </a-popover>
                  <span v-else-if="codeQualityChecked" class="code-quality-top-status code-quality-top-status--success">
                    <a-icon type="check-circle" />
                    <span>{{ $t('indicatorIde.codeQualityAllGood') }}</span>
                  </span>
                  <a-button
                    size="small"
                    class="code-quality-top-button"
                    :loading="codeQualityLoading"
                    @click="runCodeQualityCheck"
                  ><a-icon v-if="!codeQualityLoading" type="safety-certificate" /> {{ $t('indicatorIde.codeQualityRecheck') }}</a-button>
                  <a href="https://www.quantdinger.com/docs-zh.html#strategy-overview" target="_blank" rel="noopener noreferrer" class="ide-guide-link" @click.stop>
                    {{ $t('indicatorIde.devGuide') }} <a-icon type="arrow-right" />
                  </a>
                </div>
              </div>
              <div class="code-editor-wrapper">
                <div ref="codeEditor" class="code-editor-area"></div>
                <div v-if="selectedIndicatorCodeHidden" class="code-hidden-mask">
                  <a-icon type="lock" />
                  <strong>{{ $t('indicatorIde.hiddenCodeTitle') }}</strong>
                  <span>{{ $t('indicatorIde.hiddenCodeDesc') }}</span>
                </div>
                <transition name="fade">
                  <div
                    v-if="aiGenerating"
                    class="code-ai-overlay"
                  >
                    <div class="code-ai-overlay-inner">
                      <a-icon type="loading" spin style="font-size: 22px; color: var(--primary-color, #1890ff);" />
                      <span>{{ $t('indicatorIde.generating') }}</span>
                      <div class="code-ai-overlay-dots">
                        <span class="dot dot1"></span><span class="dot dot2"></span><span class="dot dot3"></span>
                      </div>
                    </div>
                    <div class="code-ai-overlay-tip">{{ ideAiCurrentTip }}</div>
                  </div>
                </transition>
              </div>
            </div>

            <div
              class="code-ai-resizer"
              role="separator"
              aria-orientation="horizontal"
              tabindex="0"
              :aria-valuenow="Math.round(codeAiSplitRatio)"
              :title="$t('indicatorIde.aiCollaborate')"
              @mousedown="startCodeAiResize"
              @dblclick="resetCodeAiSplit"
              @keydown.up.prevent="adjustCodeAiSplit(-3)"
              @keydown.down.prevent="adjustCodeAiSplit(3)"
            ><span class="code-ai-resizer__grip"></span></div>

            <div class="ai-workspace-section">

              <div
                v-if="aiDebugSummary"
                class="ai-debug-card"
                :class="`ai-debug-card--${aiDebugState()}`"
              >
                <div class="ai-debug-card__header">
                  <div class="ai-debug-card__badge">
                    <a-icon :type="aiDebugStateIcon()" />
                  </div>
                  <div class="ai-debug-card__headline">
                    <span class="ai-debug-card__tag">{{ $t('indicatorIde.aiQaTag') || 'AI QA' }}</span>
                    <span class="ai-debug-card__title">{{ aiDebugSummary.title }}</span>
                  </div>
                  <a-icon type="close" class="ai-debug-card__dismiss" @click="aiDebugSummary = null" />
                </div>
                <div class="ai-debug-card__chips">
                  <span :class="['ai-debug-chip', `ai-debug-chip--${aiDebugState()}`]">{{ aiDebugStateLabel() }}</span>
                  <span v-if="aiDebugSummary.fixed_messages.length" class="ai-debug-chip ai-debug-chip--success">
                    <a-icon type="check" style="font-size: 10px;" /> {{ aiDebugSummary.fixed_messages.length }} {{ $t('indicatorIde.fixed') || 'fixed' }}
                  </span>
                  <span v-if="aiDebugSummary.remaining_messages.length" class="ai-debug-chip ai-debug-chip--warning">
                    <a-icon type="eye" style="font-size: 10px;" /> {{ aiDebugSummary.remaining_messages.length }} {{ $t('indicatorIde.toWatch') || 'to review' }}
                  </span>
                </div>
                <div v-if="aiDebugSummary.returned_text" class="ai-debug-card__body">
                  {{ aiDebugSummary.returned_text }}
                </div>
                <div v-if="aiDebugSummary.fixed_messages.length" class="ai-debug-card__group ai-debug-card__group--fixed">
                  <div class="ai-debug-card__group-label"><a-icon type="check-circle" /> {{ $t('indicatorIde.autoFixed') || 'Auto fixed' }}</div>
                  <div v-for="(msg, idx) in aiDebugSummary.fixed_messages" :key="`fixed-${idx}`" class="ai-debug-card__item">
                    <span class="ai-debug-card__bullet ai-debug-card__bullet--green"></span>{{ msg }}
                  </div>
                </div>
                <div v-if="aiDebugSummary.remaining_messages.length" class="ai-debug-card__group ai-debug-card__group--remaining">
                  <div class="ai-debug-card__group-label"><a-icon type="warning" /> {{ $t('indicatorIde.needAttention') || 'Needs attention' }}</div>
                  <div v-for="(msg, idx) in aiDebugSummary.remaining_messages" :key="`remaining-${idx}`" class="ai-debug-card__item">
                    <span class="ai-debug-card__bullet ai-debug-card__bullet--orange"></span>{{ msg }}
                  </div>
                </div>
              </div>

              <!-- Indicator-bound AI collaboration workspace -->
              <div ref="aiGeneratorPanel" class="ai-gen-panel">
                <div class="ai-gen-header" @click="aiPanelExpanded = !aiPanelExpanded">
                  <a-icon type="robot" />
                  <span>{{ $t('indicatorIde.aiCollaborate') }}</span>
                  <span v-if="selectedIndicatorId && !selectedIndicatorCodeHidden" class="ai-memory-badge">
                    <a-icon type="link" /> {{ $t('indicatorIde.aiMemoryActive') }}
                  </span>
                  <a-button
                    v-if="aiMessages.length || aiCandidate"
                    type="link"
                    size="small"
                    class="ai-clear-button"
                    :disabled="aiGenerating"
                    @click.stop="clearAiWorkspace"
                  >{{ $t('indicatorIde.aiClearConversation') }}</a-button>
                  <a-icon :type="aiPanelExpanded ? 'up' : 'down'" style="margin-left: auto;" />
                </div>
                <div v-show="aiPanelExpanded" class="ai-gen-body">
                  <div v-if="!selectedIndicatorId || selectedIndicatorCodeHidden" class="ai-workspace-blocked">
                    <a-icon :type="selectedIndicatorCodeHidden ? 'lock' : 'save'" />
                    <span>{{ selectedIndicatorCodeHidden ? $t('indicatorIde.aiHiddenSourceUnavailable') : $t('indicatorIde.aiNoSavedIndicator') }}</span>
                  </div>
                  <template v-else>
                    <div ref="aiConversation" class="ai-conversation">
                      <div v-if="aiWorkspaceLoading" class="ai-workspace-loading"><a-icon type="loading" spin /></div>
                      <div v-else-if="!aiMessages.length" class="ai-conversation-empty">
                        <a-icon type="message" />
                        <strong>{{ $t('indicatorIde.aiConversationEmptyTitle') }}</strong>
                        <span>{{ $t('indicatorIde.aiConversationEmptyDesc') }}</span>
                        <div class="ai-quick-prompts">
                          <button v-for="item in aiQuickPrompts" :key="item.label" type="button" @click="useAiQuickPrompt(item)">{{ item.label }}</button>
                        </div>
                      </div>
                      <div
                        v-for="messageItem in aiMessages"
                        :key="messageItem.localId || messageItem.id"
                        :class="[
                          'ai-message',
                          `ai-message--${messageItem.role || 'assistant'}`,
                          { 'ai-message--has-candidate': isActiveAiCandidateMessage(messageItem) }
                        ]"
                      >
                        <div class="ai-message__role">
                          {{ messageItem.role === 'user' ? $t('indicatorIde.aiYou') : 'AI' }}
                          <span v-if="messageItem.role !== 'user' && messageItem.message_type === 'discussion'" class="ai-message__badge">{{ $t('indicatorIde.aiDiscussionBadge') }}</span>
                          <span v-else-if="messageItem.role !== 'user' && messageItem.message_type === 'candidate'" class="ai-message__badge ai-message__badge--candidate">{{ $t('indicatorIde.aiCandidateBadge') }}</span>
                        </div>
                        <div class="ai-message__content" v-html="renderAiMessage(messageItem.content)" />
                        <div
                          v-if="isActiveAiCandidateMessage(messageItem)"
                          class="ai-message-candidate"
                          :class="{ 'ai-message-candidate--warning': !aiCandidateValidationPassed }"
                        >
                          <div class="ai-message-candidate__status">
                            <a-icon :type="aiCandidateValidationPassed ? 'check-circle' : 'exclamation-circle'" />
                            <span>{{ aiCandidateValidationPassed ? $t('indicatorIde.aiCandidateValid') : $t('indicatorIde.aiCandidateNeedsReview') }}</span>
                          </div>
                          <div class="ai-candidate-actions">
                            <a-button size="small" @click="previewAiCandidate"><a-icon type="eye" /> {{ $t('indicatorIde.aiPreview') }}</a-button>
                            <a-button size="small" type="primary" @click="applyAiCandidate"><a-icon type="check" /> {{ $t('indicatorIde.aiApply') }}</a-button>
                            <a-button size="small" type="link" @click="discardAiCandidate">{{ $t('indicatorIde.aiDiscard') }}</a-button>
                          </div>
                        </div>
                      </div>
                      <div v-if="aiGenerating" class="ai-message ai-message--assistant ai-message--thinking">
                        <div class="ai-message__role">AI</div>
                        <div class="ai-message__content"><a-icon type="loading" spin /> {{ $t('indicatorIde.aiThinking') }}</div>
                      </div>
                    </div>

                    <div class="ai-composer">
                      <a-textarea
                        v-model="aiPrompt"
                        class="ai-prompt-input"
                        :placeholder="$t('indicatorIde.aiPromptPlaceholder')"
                        :rows="3"
                        :disabled="aiGenerating"
                        @input="aiInteractionMode = 'auto'"
                        @pressEnter="handleAIGenerateEnterKey"
                      />
                      <div class="ai-composer-toolbar">
                        <span class="ai-composer-shortcut">{{ $t('indicatorIde.aiSendShortcut') }}</span>
                        <a-button
                          type="primary"
                          class="ai-composer-send"
                          :title="$t('indicatorIde.aiSend')"
                          :loading="aiGenerating"
                          :disabled="!aiPrompt.trim()"
                          @click="handleAIGenerate"
                        >
                          <span v-if="!aiGenerating">{{ $t('indicatorIde.aiSend') }}</span>
                        </a-button>
                      </div>
                    </div>
                    <div class="ai-helper-tip">{{ $t('indicatorIde.aiSmartRoutingHint') }}</div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ide-right ide-right--workspace">
        <div class="ide-workspace-pane ide-workspace-pane--chart">
          <div
            ref="chartFullscreenEl"
            class="ide-chart-fs-root"
            :class="{ 'ide-panel--fullscreen': chartFullscreen }"
          >
            <div class="ide-chart-fs-row">
              <div class="chart-panel">
                <div class="chart-panel-toolbar">
                  <div class="chart-panel-toolbar-top">
                    <span class="chart-panel-toolbar-title">{{ $t('indicatorIde.chartWindow') }}</span>
                    <div class="chart-panel-toolbar-top-actions">
                      <a-button
                        size="small"
                        class="chart-panel-action-btn chart-panel-signal-alert-btn"
                        :disabled="!selectedIndicatorId"
                        @click="openSignalAlertModal"
                      >
                        <a-icon type="bell" />
                        <span>通知</span>
                        <em>{{ runningSignalAlertCount }}</em>
                      </a-button>
                      <a-tooltip
                        placement="bottom"
                        :title="selectedIndicatorCodeHidden ? $t('indicatorIde.aiConvertHiddenBlocked') : $t('indicatorIde.aiConvertToStrategy')"
                      >
                        <span class="chart-panel-action-wrap">
                          <a-button
                            size="small"
                            type="primary"
                            class="chart-panel-action-btn chart-panel-convert-strategy-btn"
                            :disabled="!selectedIndicatorId || selectedIndicatorCodeHidden"
                            @click="handleCreateStrategyFromIndicator"
                          >
                            <a-icon type="deployment-unit" />
                            <span>{{ $t('indicatorIde.aiConvertToStrategy') }}</span>
                          </a-button>
                        </span>
                      </a-tooltip>
                      <a-tooltip :title="chartFullscreen ? $t('indicatorIde.exitFullscreen') : $t('indicatorIde.fullscreenChart')">
                        <a-button size="small" class="chart-panel-fs-btn" @click="toggleChartFullscreen"><a-icon :type="chartFullscreen ? 'fullscreen-exit' : 'fullscreen'" /></a-button>
                      </a-tooltip>
                    </div>
                  </div>
                  <div class="chart-panel-toolbar-controls">
                    <div class="ide-toolbar-group ide-toolbar-group--params">
                      <span class="ide-toolbar-label">{{ $t('indicatorIde.paramPanel.shortTitle') }}</span>
                      <a-button
                        size="small"
                        class="ide-param-trigger"
                        :type="currentIndicatorParamSpecs.length ? 'primary' : 'default'"
                        :disabled="!selectedIndicatorId"
                        @click="openIndicatorParamsDrawer"
                      >
                        <a-icon type="sliders" />
                        <span>{{ $t('indicatorIde.paramPanel.button') }}</span>
                        <em>{{ currentIndicatorParamSpecs.length }}</em>
                      </a-button>
                    </div>
                    <div class="ide-toolbar-group ide-toolbar-group--watchlist">
                      <span class="ide-toolbar-label">{{ $t('indicatorIde.toolbar.watchlist') }}</span>
                      <a-select
                        v-model="selectedWatchlistKey"
                        class="ide-toolbar-select ide-toolbar-select--watchlist chart-panel-watchlist-select"
                        :placeholder="$t('backtest-center.config.watchlistPlaceholder')"
                        size="small"
                        show-search
                        allow-clear
                        :loading="loadingWatchlist"
                        :filter-option="filterWatchlistOption"
                        :dropdown-class-name="isDarkTheme ? 'ide-watchlist-dropdown ide-watchlist-dropdown--dark' : 'ide-watchlist-dropdown'"
                        :get-popup-container="chartToolbarGetPopupContainer"
                        @change="handleWatchlistChange"
                        @dropdownVisibleChange="onWatchlistDropdownVisibleChange"
                      >
                        <a-select-option
                          v-for="w in watchlist"
                          :key="watchlistContextKey(w)"
                          :value="watchlistContextKey(w)"
                        >
                          <span class="wl-opt-tag" :class="'wl-mkt-' + (w.market || '').toLowerCase()">{{ marketLabel(w.market) }}</span>
                          <strong class="wl-opt-symbol">{{ w.symbol }}</strong>
                          <span v-if="w.name" class="wl-opt-name">{{ w.name }}</span>
                        </a-select-option>
                        <a-select-option key="__add__" value="__add__" class="add-option">
                          <div class="ide-watchlist-add-row">
                            <a-icon type="plus" /> {{ $t('backtest-center.config.addSymbol') }}
                          </div>
                        </a-select-option>
                      </a-select>
                    </div>
                    <div v-if="market === 'Crypto'" class="ide-toolbar-group ide-toolbar-group--venue">
                      <span class="ide-toolbar-label">{{ $t('marketContext.source') }}</span>
                      <div class="ide-market-context-controls">
                        <a-select
                          v-model="cryptoExchangeId"
                          size="small"
                          class="ide-toolbar-select ide-toolbar-select--exchange"
                          :get-popup-container="chartToolbarGetPopupContainer"
                          @change="handleCryptoExchangeChange"
                        >
                          <a-select-option v-for="exchangeId in cryptoExchangeIds" :key="exchangeId" :value="exchangeId">
                            {{ exchangeId.toUpperCase() }}
                          </a-select-option>
                        </a-select>
                        <a-select
                          v-model="cryptoMarketType"
                          size="small"
                          class="ide-toolbar-select ide-toolbar-select--market-type"
                          :get-popup-container="chartToolbarGetPopupContainer"
                          @change="handleCryptoMarketTypeChange"
                        >
                          <a-select-option value="spot">{{ $t('marketContext.spot') }}</a-select-option>
                          <a-select-option value="swap">{{ $t('marketContext.swap') }}</a-select-option>
                        </a-select>
                      </div>
                    </div>
                    <div class="ide-toolbar-group ide-toolbar-group--tf">
                      <span class="ide-toolbar-label">{{ $t('indicatorIde.toolbar.timeframe') }}</span>
                      <a-radio-group
                        v-model="timeframe"
                        button-style="solid"
                        size="small"
                        class="tf-group ide-tf-seg ide-tf-seg--chart"
                      >
                        <a-radio-button value="1m">1m</a-radio-button>
                        <a-radio-button value="5m">5m</a-radio-button>
                        <a-radio-button value="15m">15m</a-radio-button>
                        <a-radio-button value="30m">30m</a-radio-button>
                        <a-radio-button value="1H">1H</a-radio-button>
                        <a-radio-button value="4H">4H</a-radio-button>
                        <a-radio-button value="1D">1D</a-radio-button>
                        <a-radio-button value="1W">1W</a-radio-button>
                      </a-radio-group>
                    </div>
                    <div class="ide-toolbar-group ide-toolbar-group--indicator">
                      <span class="ide-toolbar-label">{{ $t('indicatorIde.toolbar.indicator') }}</span>
                      <a-dropdown
                        :trigger="['click']"
                        placement="bottomLeft"
                        :visible="indicatorDropdownVisible"
                        :get-popup-container="chartToolbarGetPopupContainer"
                        @visibleChange="onIndicatorDropdownVisibleChange"
                        :overlay-class-name="isDarkTheme ? 'ide-indicator-multiselect-dropdown ide-indicator-multiselect-dropdown--dark' : 'ide-indicator-multiselect-dropdown'"
                      >
                        <a-button
                          size="small"
                          class="ide-toolbar-select ide-toolbar-select--indicator ide-indicator-multiselect-trigger"
                          :loading="loadingIndicators"
                        >
                          <span class="ide-indicator-trigger-text">{{ indicatorToolbarSummary }}</span>
                          <a-icon type="down" />
                        </a-button>
                        <div slot="overlay" class="ide-indicator-overlay" @mousedown.stop @click.stop>
                          <div class="ide-indicator-overlay-hint">{{ $t('indicatorIde.chartPickHint') }}</div>
                          <a-spin v-if="loadingIndicators" size="small" style="padding: 12px;" />
                          <div v-else-if="!indicators.length" class="ide-indicator-overlay-empty">{{ $t('indicatorIde.noIndicatorsYet') }}</div>
                          <div v-else class="ide-indicator-overlay-list">
                            <div
                              v-for="ind in indicators"
                              :key="'ind-row-' + ind.id"
                              class="ide-indicator-row"
                            >
                              <a-checkbox
                                :checked="(chartVisibleIndicatorIds || []).some(x => Number(x) === Number(ind.id))"
                                @change="e => onChartIndicatorCheckChange(ind.id, e.target.checked)"
                              />
                              <span
                                class="ide-indicator-name"
                                :class="{ active: Number(selectedIndicatorId) === Number(ind.id) }"
                                @click="selectEditorIndicator(ind.id)"
                              >{{ indicatorDisplayName(ind) }}</span>
                              <a-tag
                                v-if="Number(ind.is_buy) === 1"
                                color="purple"
                                class="ide-indicator-purchased-tag"
                              >{{ $t('indicatorIde.purchasedBadge') }}</a-tag>
                            </div>
                          </div>
                        </div>
                      </a-dropdown>
                    </div>
                  </div>
                </div>
                <div class="chart-panel-inner">
                  <kline-chart
                    ref="klineChart"
                    :symbol="symbol"
                    :market="market"
                    :exchange-id="cryptoExchangeId"
                    :market-type="cryptoMarketType"
                    :instrument-id="currentInstrumentId"
                    :timeframe="timeframe"
                    :theme="chartTheme"
                    :activeIndicators="activeIndicators"
                    :userId="userId"
                    :realtime-enabled="klineRealtimeEnabled"
                    @indicator-toggle="handleIndicatorToggle"
                  />
                </div>
              </div>
              <div
                class="ide-quick-bottom ide-quick-bottom--chart-fs"
                :class="{ 'ide-quick-bottom--collapsed': !quickTradeDrawerVisible }"
              >
                <button
                  type="button"
                  class="ide-quick-panel-head"
                  :aria-expanded="quickTradeDrawerVisible ? 'true' : 'false'"
                  @click="toggleQuickTradeDrawer"
                >
                  <div class="ide-quick-panel-head-copy">
                    <span class="ide-quick-panel-head-title">
                      <a-icon type="thunderbolt" theme="filled" class="ide-quick-panel-head-icon" />
                      {{ $t('quickTrade.title') }}
                    </span>
                    <span class="ide-quick-panel-head-meta">{{ qtSymbol }} · {{ market === 'Crypto' ? cryptoMarketType.toUpperCase() : 'SPOT' }}</span>
                  </div>
                  <span class="ide-quick-panel-toggle" :title="quickTradeDrawerVisible ? $t('indicatorIde.hideQuickTrade') : $t('indicatorIde.showQuickTrade')">
                    <a-icon :type="quickTradeDrawerVisible ? 'down' : 'up'" />
                  </span>
                </button>
                <div v-if="quickTradeDrawerVisible" class="ide-quick-panel-body">
                  <quick-trade-panel
                    key="ide-embedded-qt"
                    embedded
                    embedded-ide
                    embedded-dock
                    :visible="true"
                    :symbol="qtSymbol"
                    :preset-side="qtSide"
                    :preset-price="qtPrice"
                    source="indicator"
                    :market="market"
                    symbol-locked
                    :market-type="market === 'Crypto' ? cryptoMarketType : 'spot'"
                    :overlay-get-container="ideQtOverlayGetContainer"
                    @order-success="onQuickTradeSuccess"
                    @update:symbol="handleQuickTradeSymbolChange"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Add symbol modal -->
    <a-modal
      :title="$t('dashboard.analysis.modal.addStock.title')"
      :visible="showAddModal"
      @ok="handleAddStock"
      @cancel="showAddModal = false"
      :confirmLoading="addingStock"
      width="560px"
      :get-container="ideModalGetContainer"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark' : 'ide-modal-wrap'"
    >
      <a-tabs v-model="addMarketTab" size="small" class="ide-add-market-tabs" @change="onAddMarketTabChange">
        <a-tab-pane
          v-for="m in ideAddMarketKeys"
          :key="m"
          :tab="$t('dashboard.indicator.market.' + m)"
        ></a-tab-pane>
      </a-tabs>
      <div v-if="addMarketTab === 'Crypto'" class="ide-add-source-row">
        <a-select
          v-model="cryptoExchangeId"
          style="width: 50%;"
          :dropdown-class-name="isDarkTheme ? 'ide-add-source-dropdown ide-add-source-dropdown--dark' : 'ide-add-source-dropdown'"
          @change="onAddSourceChange"
        >
          <a-select-option v-for="exchangeId in cryptoExchangeIds" :key="exchangeId" :value="exchangeId">
            {{ exchangeId.toUpperCase() }}
          </a-select-option>
        </a-select>
        <a-select
          v-model="cryptoMarketType"
          style="width: 50%;"
          :dropdown-class-name="isDarkTheme ? 'ide-add-source-dropdown ide-add-source-dropdown--dark' : 'ide-add-source-dropdown'"
          @change="onAddSourceChange"
        >
          <a-select-option value="spot">{{ $t('marketContext.spot') }}</a-select-option>
          <a-select-option value="swap">{{ $t('marketContext.swap') }}</a-select-option>
        </a-select>
      </div>
      <a-input-search
        v-model="addSearchKeyword"
        :placeholder="$t('backtest-center.config.symbolPlaceholder')"
        @search="doAddSearch"
        @change="onAddSearchInput"
        :loading="addSearching"
        size="large"
        allow-clear
        style="margin: 12px 0;"
      />
      <a-list
        v-if="addSearchResults.length > 0"
        size="small"
        :data-source="addSearchResults"
        style="max-height: 240px; overflow-y: auto;"
      >
        <a-list-item
          slot="renderItem"
          slot-scope="item"
          style="cursor: pointer;"
          :class="{ 'add-item-active': addSelectedItem && addSelectedItem.symbol === item.symbol }"
          @click="addSelectedItem = item"
        >
          <strong>{{ item.symbol }}</strong>
          <span v-if="item.name" style="color: #999; margin-left: 8px;">{{ item.name }}</span>
          <a-icon v-if="addSelectedItem && addSelectedItem.symbol === item.symbol" type="check-circle" theme="filled" style="color: #52c41a; margin-left: auto;" />
        </a-list-item>
      </a-list>
      <div v-if="addSearchResults.length === 0 && addSearchKeyword && addSearched" style="padding: 16px 0; text-align: center; color: #999;">
        {{ $t('backtest-center.config.noSearchResult') }}
      </div>
    </a-modal>

    <a-modal
      :title="$t('indicatorIde.paramPanel.title')"
      :visible="paramDrawerVisible"
      :width="760"
      :footer="null"
      centered
      :get-container="ideModalGetContainer"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark ide-param-modal-wrap' : 'ide-modal-wrap ide-param-modal-wrap'"
      @cancel="paramDrawerVisible = false"
    >
      <div class="ide-param-drawer">
        <div class="ide-param-drawer__hero">
          <div>
            <span>{{ $t('indicatorIde.paramPanel.currentIndicator') }}</span>
            <strong>{{ selectedIndicatorDisplayName }}</strong>
          </div>
          <a-tag :color="selectedIndicatorCodeHidden ? 'gold' : 'green'">
            {{ selectedIndicatorCodeHidden ? $t('indicatorIde.paramPanel.hiddenSource') : $t('indicatorIde.paramPanel.visibleSource') }}
          </a-tag>
        </div>

        <a-empty
          v-if="!currentIndicatorParamSpecs.length"
          class="ide-param-empty"
          :description="$t('indicatorIde.paramPanel.noParams')"
        />

        <div v-else class="ide-param-list">
          <div
            v-for="spec in currentIndicatorParamSpecs"
            :key="spec.name"
            class="ide-param-item"
          >
            <div class="ide-param-item__head">
              <div>
                <strong>{{ spec.label || spec.name }}</strong>
                <code>{{ spec.name }}</code>
              </div>
              <a-tag size="small">{{ spec.type }}</a-tag>
            </div>
            <p v-if="spec.description" class="ide-param-item__desc">{{ spec.description }}</p>

            <a-switch
              v-if="spec.type === 'bool'"
              :checked="!!indicatorParamDraft[spec.name]"
              @change="val => onIndicatorParamDraftChange(spec, val)"
            />
            <a-select
              v-else-if="spec.values && spec.values.length"
              :value="indicatorParamDraft[spec.name]"
              size="small"
              class="ide-param-item__control"
              @change="val => onIndicatorParamDraftChange(spec, val)"
            >
              <a-select-option
                v-for="opt in spec.values"
                :key="String(opt)"
                :value="opt"
              >{{ opt }}</a-select-option>
            </a-select>
            <a-input-number
              v-else-if="spec.type === 'int' || spec.type === 'float'"
              :value="indicatorParamDraft[spec.name]"
              :min="spec.min"
              :max="spec.max"
              :step="spec.step || (spec.type === 'int' ? 1 : 0.1)"
              :precision="spec.type === 'int' ? 0 : undefined"
              class="ide-param-item__control"
              size="small"
              @change="val => onIndicatorParamDraftChange(spec, val)"
            />
            <a-input
              v-else
              :value="indicatorParamDraft[spec.name]"
              class="ide-param-item__control"
              size="small"
              @change="e => onIndicatorParamDraftChange(spec, e.target.value)"
            />

            <div class="ide-param-item__meta">
              <span>{{ $t('indicatorIde.paramPanel.defaultValue') }}: <b>{{ formatIndicatorParamValue(spec.defaultValue) }}</b></span>
              <span v-if="spec.rangeText">{{ spec.rangeText }}</span>
            </div>
          </div>
        </div>

        <div class="ide-param-drawer__footer">
          <a-button size="small" @click="resetIndicatorParamsToDeclared">
            <a-icon type="reload" />
            {{ $t('indicatorIde.paramPanel.reset') }}
          </a-button>
          <a-button
            size="small"
            :disabled="!currentIndicatorParamSpecs.length"
            @click="saveIndicatorParamDefaults"
          >
            <a-icon type="save" />
            {{ $t('indicatorIde.paramPanel.saveDefault') }}
          </a-button>
          <a-tooltip :title="selectedIndicatorCodeHidden ? $t('indicatorIde.paramPanel.writeBlockedHidden') : $t('indicatorIde.paramPanel.writeBackHint')">
            <a-button
              size="small"
              :disabled="!currentIndicatorParamSpecs.length || selectedIndicatorCodeHidden"
              @click="writeIndicatorParamsToCode"
            >
              <a-icon type="edit" />
              {{ $t('indicatorIde.paramPanel.writeBack') }}
            </a-button>
          </a-tooltip>
          <a-button
            type="primary"
            size="small"
            :disabled="!currentIndicatorParamSpecs.length"
            @click="applyIndicatorParams"
          >
            <a-icon type="play-circle" />
            {{ $t('indicatorIde.paramPanel.apply') }}
          </a-button>
        </div>
      </div>
    </a-modal>

    <a-modal
      :title="$t('indicatorIde.signalAlert.title')"
      :visible="signalAlertModalVisible"
      :width="880"
      :footer="null"
      centered
      :get-container="ideModalGetContainer"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark ide-signal-alert-modal-wrap' : 'ide-modal-wrap ide-signal-alert-modal-wrap'"
      @cancel="closeSignalAlertModal"
    >
      <div class="ide-signal-alert-modal">
        <a-tabs v-model="signalAlertActiveTab" class="ide-signal-alert-tabs">
          <a-tab-pane key="create" :tab="signalAlertEditingId ? $t('indicatorIde.signalAlert.editCondition') : $t('indicatorIde.signalAlert.setupCondition')">
            <div class="signal-alert-current-card">
              <div>
                <span>{{ $t('indicatorIde.signalAlert.currentIndicator') }}</span>
                <strong>{{ selectedIndicatorDisplayName }}</strong>
              </div>
              <a-tag
                class="signal-alert-source-tag"
                :class="selectedIndicatorCodeHidden ? 'signal-alert-source-tag--hidden' : 'signal-alert-source-tag--visible'"
              >
                {{ selectedIndicatorCodeHidden ? $t('indicatorIde.signalAlert.sourceHidden') : $t('indicatorIde.signalAlert.sourceVisible') }}
              </a-tag>
            </div>

            <div class="signal-alert-form-grid">
              <div class="signal-alert-field signal-alert-field--wide">
                <label>{{ $t('indicatorIde.signalAlert.selectSymbol') }}</label>
                <a-select
                  v-model="signalAlertForm.watchlistKey"
                  size="small"
                  show-search
                  :filter-option="filterWatchlistOption"
                  :get-popup-container="ideModalGetContainer"
                  @change="onSignalAlertWatchlistChange"
                >
                  <a-select-option
                    v-for="w in signalAlertWatchlistOptions"
                    :key="`${w.market}:${w.symbol}`"
                    :value="`${w.market}:${w.symbol}`"
                  >
                    <span class="wl-opt-tag" :class="'wl-mkt-' + (w.market || '').toLowerCase()">{{ marketLabel(w.market) }}</span>
                    <strong class="wl-opt-symbol">{{ w.symbol }}</strong>
                    <span v-if="w.name" class="wl-opt-name">{{ w.name }}</span>
                  </a-select-option>
                </a-select>
              </div>
              <div class="signal-alert-field">
                <label>{{ $t('indicatorIde.signalAlert.timeframe') }}</label>
                <a-select v-model="signalAlertForm.timeframe" size="small" :get-popup-container="ideModalGetContainer">
                  <a-select-option v-for="tf in signalAlertTimeframes" :key="tf" :value="tf">{{ tf }}</a-select-option>
                </a-select>
              </div>
            </div>

            <div class="signal-alert-block">
              <div class="signal-alert-block__head">
                <strong>{{ $t('indicatorIde.signalAlert.triggerSignals') }}</strong>
                <span>{{ $t('indicatorIde.signalAlert.triggerHint') }}</span>
              </div>
              <a-checkbox-group v-model="signalAlertForm.signalKeys" class="signal-alert-check-grid">
                <a-checkbox
                  v-for="opt in signalAlertSignalOptions"
                  :key="opt.key"
                  :value="opt.key"
                >{{ opt.label }}</a-checkbox>
              </a-checkbox-group>
            </div>

            <div class="signal-alert-block">
              <div class="signal-alert-block__head">
                <strong>{{ $t('indicatorIde.signalAlert.channels') }}</strong>
                <span>{{ $t('indicatorIde.signalAlert.channelsHint') }}</span>
              </div>
              <a-checkbox-group v-model="signalAlertForm.channels" class="signal-alert-channel-row">
                <a-checkbox value="browser">{{ $t('indicatorIde.signalAlert.browser') }}</a-checkbox>
                <a-checkbox value="email">{{ $t('indicatorIde.signalAlert.email') }}</a-checkbox>
                <a-checkbox value="telegram">{{ $t('indicatorIde.signalAlert.telegram') }}</a-checkbox>
                <a-checkbox value="webhook">{{ $t('indicatorIde.signalAlert.webhook') }}</a-checkbox>
              </a-checkbox-group>
              <div v-if="signalAlertForm.channels.includes('email')" class="signal-alert-target-row">
                <a-input v-model="signalAlertForm.email" :placeholder="$t('indicatorIde.signalAlert.emailPlaceholder')" />
              </div>
              <div v-if="signalAlertForm.channels.includes('telegram')" class="signal-alert-target-row signal-alert-target-row--split">
                <a-input v-model="signalAlertForm.telegramChatId" :placeholder="$t('indicatorIde.signalAlert.telegramChatIdPlaceholder')" />
                <a-input v-model="signalAlertForm.telegramBotToken" :placeholder="$t('indicatorIde.signalAlert.telegramBotTokenPlaceholder')" />
              </div>
              <div v-if="signalAlertForm.channels.includes('webhook')" class="signal-alert-target-row">
                <a-input v-model="signalAlertForm.webhookUrl" :placeholder="$t('indicatorIde.signalAlert.webhookUrlPlaceholder')" />
              </div>
            </div>

            <div class="signal-alert-actions">
              <a-button size="small" @click="resetSignalAlertForm">{{ $t('indicatorIde.signalAlert.reset') }}</a-button>
              <a-button size="small" type="primary" :loading="signalAlertSaving" @click="submitSignalAlertTask">
                <a-icon type="check" />
                {{ signalAlertEditingId ? $t('indicatorIde.signalAlert.saveChanges') : $t('indicatorIde.signalAlert.createTask') }}
              </a-button>
            </div>
          </a-tab-pane>
          <a-tab-pane key="tasks" :tab="$t('indicatorIde.signalAlert.activeTasks')">
            <a-spin :spinning="signalAlertLoading">
              <a-empty v-if="!signalAlertTasks.length" :description="$t('indicatorIde.signalAlert.emptyTasks')" />
              <div v-else class="signal-alert-task-list">
                <div
                  v-for="task in signalAlertTasks"
                  :key="task.id"
                  class="signal-alert-task-card"
                  :class="{ paused: task.status === 'paused' }"
                >
                  <div class="signal-alert-task-card__main">
                    <div class="signal-alert-task-card__title">
                      <strong>{{ task.indicator_name || selectedIndicatorDisplayName }}</strong>
                      <a-tag :color="task.status === 'running' ? 'green' : 'orange'">{{ task.status === 'running' ? $t('indicatorIde.signalAlert.running') : $t('indicatorIde.signalAlert.paused') }}</a-tag>
                    </div>
                    <div class="signal-alert-task-card__meta">
                      <span>{{ task.market }} · {{ task.symbol }} · {{ task.timeframe }}</span>
                      <span>{{ $t('indicatorIde.signalAlert.triggerCount', { count: task.trigger_count || 0 }) }}</span>
                      <span v-if="task.last_error" class="danger">{{ $t('indicatorIde.signalAlert.error', { error: task.last_error }) }}</span>
                    </div>
                    <div class="signal-alert-task-card__chips">
                      <a-tag v-for="key in (task.signal_keys || [])" :key="key">{{ signalAlertKeyLabel(key) }}</a-tag>
                      <a-tag v-for="ch in (task.channels || [])" :key="ch" color="blue">{{ signalAlertChannelLabel(ch) }}</a-tag>
                    </div>
                  </div>
                  <div class="signal-alert-task-card__actions">
                    <a-button size="small" @click="editSignalAlertTask(task)">{{ $t('indicatorIde.signalAlert.edit') }}</a-button>
                    <a-button size="small" @click="toggleSignalAlertTask(task)">
                      {{ task.status === 'running' ? $t('indicatorIde.signalAlert.pause') : $t('indicatorIde.signalAlert.resume') }}
                    </a-button>
                    <a-button size="small" @click="testSignalAlertTask(task)">{{ $t('indicatorIde.signalAlert.test') }}</a-button>
                    <a-button size="small" type="danger" ghost @click="deleteSignalAlertTask(task)">{{ $t('indicatorIde.signalAlert.delete') }}</a-button>
                  </div>
                </div>
              </div>
            </a-spin>
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-modal>

    <a-drawer
      :title="$t('indicatorIde.codeVersionHistory')"
      :visible="showCodeVersionDrawer"
      :width="560"
      :get-container="ideModalGetContainer"
      :wrap-class-name="isDarkTheme ? 'ide-drawer-wrap ide-drawer-wrap--dark' : 'ide-drawer-wrap'"
      @close="showCodeVersionDrawer = false"
    >
      <div class="code-version-toolbar">
        <span>{{ selectedIndicatorDisplayName }}</span>
        <a-button size="small" icon="reload" :loading="codeVersionLoading" @click="loadCodeVersions">
          {{ $t('dashboard.indicator.backtest.historyRefresh') }}
        </a-button>
      </div>
      <a-spin :spinning="codeVersionLoading">
        <a-empty v-if="!codeVersions.length" :description="$t('indicatorIde.codeVersionEmpty')" />
        <div v-else class="code-version-list">
          <div v-for="item in codeVersions" :key="item.id" class="code-version-item">
            <div class="code-version-item__main">
              <strong>{{ $t('indicatorIde.codeVersionNo', { version: item.version_no }) }}</strong>
              <span>{{ formatCodeVersionTime(item.created_at) }}</span>
              <small>{{ item.name || selectedIndicatorObj && selectedIndicatorObj.name || '' }}</small>
            </div>
            <div class="code-version-item__actions">
              <a-button size="small" @click="previewCodeVersion(item)">{{ $t('indicatorIde.codeVersionPreview') }}</a-button>
              <a-button size="small" type="primary" :loading="restoringCodeVersionId === item.id" @click="confirmRestoreCodeVersion(item)">
                {{ $t('indicatorIde.codeVersionRestore') }}
              </a-button>
            </div>
          </div>
        </div>
      </a-spin>
      <div v-if="codeVersionPreview" class="code-version-preview">
        <div class="code-version-preview__head">
          <strong>{{ $t('indicatorIde.codeVersionPreviewTitle', { version: codeVersionPreview.version_no }) }}</strong>
          <a-button size="small" icon="close" @click="codeVersionPreview = null">{{ $t('indicatorIde.close') }}</a-button>
        </div>
        <pre>{{ codeVersionPreview.code }}</pre>
      </div>
    </a-drawer>
    <a-modal
      :title="publishIndicator && publishIndicator.publish_to_community ? $t('dashboard.indicator.publish.editTitle') : $t('dashboard.indicator.publish.title')"
      :visible="showPublishModal"
      :width="620"
      :confirmLoading="publishing"
      :okText="publishIndicator && publishIndicator.publish_to_community ? $t('dashboard.indicator.publish.update') : $t('dashboard.indicator.publish.confirm')"
      :cancelText="$t('dashboard.indicator.editor.cancel')"
      :get-container="ideModalGetContainer"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark ide-publish-modal-wrap' : 'ide-modal-wrap ide-publish-modal-wrap'"
      @ok="handleConfirmPublish"
      @cancel="showPublishModal = false; publishIndicator = null"
    >
      <div class="publish-form publish-market-form">
        <div class="publish-summary-card">
          <div class="publish-summary-icon">
            <a-icon type="shop" />
          </div>
          <div class="publish-summary-main">
            <div class="publish-summary-label">{{ $t('dashboard.indicator.publish.title') }}</div>
            <div class="publish-summary-name">{{ publishIndicator && publishIndicator.name }}</div>
          </div>
          <a-tag class="publish-summary-tag" color="red">{{ $t('community.title') }}</a-tag>
        </div>

        <div class="publish-note">
          <a-icon type="info-circle" />
          <span>{{ $t('dashboard.indicator.publish.hint') }}</span>
        </div>

        <div class="publish-section">
          <div class="publish-section-title">{{ $t('dashboard.indicator.publish.pricingType') }}</div>
          <a-radio-group v-model="publishPricingType" class="publish-pricing-group">
            <a-radio-button value="free">
              <a-icon type="gift" />
              {{ $t('dashboard.indicator.publish.free') }}
            </a-radio-button>
            <a-radio-button value="paid">
              <a-icon type="pay-circle" />
              {{ $t('dashboard.indicator.publish.paid') }}
            </a-radio-button>
          </a-radio-group>
          <div v-if="publishPricingType === 'paid'" class="publish-price-box">
            <div class="field-label">{{ $t('dashboard.indicator.publish.price') }}</div>
            <a-input-number v-model="publishPrice" :min="0" :precision="2" class="publish-price-input" />
          </div>
        </div>

        <div class="publish-option-grid">
          <div class="publish-option-card" :class="{ active: publishVipFree }">
            <div class="publish-option-head">
              <span>{{ $t('dashboard.indicator.publish.vipFree') }}</span>
              <a-switch v-model="publishVipFree" />
            </div>
            <div class="publish-hint">{{ $t('dashboard.indicator.publish.vipFreeHint') }}</div>
          </div>
          <div class="publish-option-card" :class="{ active: publishCodeHidden }">
            <div class="publish-option-head">
              <span>{{ $t('dashboard.indicator.publish.hideCode') }}</span>
              <a-switch v-model="publishCodeHidden" />
            </div>
            <div class="publish-hint">{{ $t('dashboard.indicator.publish.hideCodeHint') }}</div>
          </div>
        </div>

        <div class="publish-section">
          <div class="publish-section-title">{{ $t('dashboard.indicator.publish.description') }}</div>
          <a-textarea
            v-model="publishDescription"
            :rows="4"
            class="publish-description-input"
            :placeholder="$t('dashboard.indicator.publish.descriptionPlaceholder')"
          />
        </div>

        <div v-if="publishIndicator && publishIndicator.publish_to_community" class="publish-unpublish-row">
          <a-button type="danger" ghost @click="handleUnpublish" :loading="unpublishing">
            {{ $t('dashboard.indicator.publish.unpublish') }}
          </a-button>
        </div>
      </div>
    </a-modal>
    <a-modal
      :title="$t('indicatorIde.saveAsModalTitle')"
      :visible="showSaveAsModal"
      :confirmLoading="savingAs"
      :okText="$t('indicatorIde.saveAsConfirm')"
      :cancelText="$t('dashboard.indicator.editor.cancel')"
      :get-container="ideModalGetContainer"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark' : 'ide-modal-wrap'"
      @ok="confirmSaveAsIndicator"
      @cancel="showSaveAsModal = false"
    >
      <div class="field-label" style="margin-bottom: 8px;">{{ $t('indicatorIde.saveAsNameLabel') }}</div>
      <a-input
        v-model="saveAsName"
        :placeholder="$t('indicatorIde.saveAsNamePlaceholder')"
        @pressEnter="confirmSaveAsIndicator"
      />
    </a-modal>
    <a-modal
      :title="$t('indicatorIde.aiCandidatePreviewTitle')"
      :visible="aiPreviewVisible"
      :footer="null"
      width="760px"
      :get-container="ideModalGetContainer"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark ai-candidate-preview-modal' : 'ide-modal-wrap ai-candidate-preview-modal'"
      @cancel="aiPreviewVisible = false"
    >
      <div class="ai-preview-toolbar">
        <span>{{ $t('indicatorIde.aiPreviewHint') }}</span>
        <a-button size="small" type="primary" @click="applyAiCandidate">{{ $t('indicatorIde.aiApply') }}</a-button>
      </div>
      <pre class="ai-candidate-code-preview">{{ (aiCandidate && aiCandidate.code) || '' }}</pre>
    </a-modal>
  </div>
</template>

<script>
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/python/python'
import 'codemirror/theme/monokai.css'
import 'codemirror/theme/eclipse.css'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/selection/active-line'
import moment from 'moment'
import storage from 'store'
import multiTabEvents from '@/components/MultiTab/events'
import { routeCacheKey } from '@/components/MultiTab/cacheControl.mjs'
import { ACCESS_TOKEN } from '@/store/mutation-types'
import { baseMixin } from '@/store/app-mixin'
import request from '@/utils/request'
import { loadEnabledMarketOptions, firstMarketValue } from '@/utils/marketModules'
import { CRYPTO_EXCHANGE_IDS, marketContextKey, normalizeExchangeId, normalizeMarketType } from '@/utils/marketContext'
import { getUserInfo } from '@/api/login'
import { getNotificationSettings } from '@/api/user'
import { getWatchlist, addWatchlist, searchSymbols } from '@/api/market'
import { getPublicSettingsConfig } from '@/api/settings'
import { extractIndicatorSignalLabels } from '@/utils/indicatorSignalOptions'
import { renderSafeMarkdown } from '@/utils/safeMarkdown'
import KlineChart from '@/views/indicator-analysis/components/KlineChart.vue'
import QuickTradePanel from '@/components/QuickTradePanel/QuickTradePanel'
import { Modal } from 'ant-design-vue'
import message from 'ant-design-vue/es/message'

const TF_MAX_DAYS = {
  '1m': 30,
  '5m': 180,
  '15m': 365,
  '30m': 365,
  '1H': 730,
  '4H': 1460,
  '1D': 3650,
  '1W': 7300
}

function ideUiCacheStorageKey (userId) {
  const u = userId != null && userId !== '' ? String(userId) : '0'
  return `qd_indicator_ide_ui_v2_${u}`
}

function cryptoMarketSourceStorageKey (userId) {
  const u = userId != null && userId !== '' ? String(userId) : '0'
  return `qd_indicator_crypto_market_source_v2_${u}`
}

function ideSelectionStorageKey (userId) {
  const u = userId != null && userId !== '' ? String(userId) : '0'
  return `qd_indicator_ide_selection_v2_${u}`
}

function indicatorParamDefaultsStorageKey (userId) {
  const u = userId != null && userId !== '' ? String(userId) : '0'
  return `qd_indicator_param_defaults_v2_${u}`
}

export default {
  name: 'IndicatorIDE',
  mixins: [baseMixin],
  components: { KlineChart, QuickTradePanel },
  data () {
    return {
      userId: null,
      indicators: [],
      loadingIndicators: false,
      selectedIndicatorId: undefined,
      chartVisibleIndicatorIds: [],
      indicatorDropdownVisible: false,
      editorFullscreen: false,
      chartFullscreen: false,
      currentCode: '',
      codeDirty: false,
      cmInstance: null,

      codeDrawerVisible: true,
      codePanelExpanded: true,
      paramsPanelExpanded: true,

      market: 'Crypto',
      symbol: 'BTC/USDT',
      timeframe: '1D',
      cryptoExchangeId: 'binance',
      cryptoMarketType: 'spot',
      currentInstrumentId: '',
      cryptoExchangeIds: CRYPTO_EXCHANGE_IDS,
      watchlist: [],
      loadingWatchlist: false,
      selectedWatchlistKey: 'Crypto:BTC/USDT',

      activeIndicators: [],
      chartIndicatorRunning: true,
      quickTradeDrawerVisible: true,
      paramDrawerVisible: false,
      indicatorParamOverrides: {},
      indicatorParamDraft: {},
      signalAlertModalVisible: false,
      signalAlertActiveTab: 'create',
      signalAlertLoading: false,
      signalAlertSaving: false,
      signalAlertDefaultsLoading: false,
      signalAlertDefaultsLoaded: false,
      signalAlertTasks: [],
      signalAlertEditingId: null,
      signalAlertNotificationDefaults: {
        channels: ['browser'],
        email: '',
        telegramChatId: '',
        telegramBotToken: '',
        webhookUrl: '',
        webhookToken: '',
        webhookSigningSecret: ''
      },
      signalAlertTimeframes: ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'],
      signalAlertForm: {
        watchlistKey: 'Crypto:BTC/USDT',
        market: 'Crypto',
        symbol: 'BTC/USDT',
        symbolName: 'Bitcoin',
        timeframe: '1D',
        signalKeys: ['any'],
        channels: ['browser'],
        email: '',
        telegramChatId: '',
        telegramBotToken: '',
        webhookUrl: '',
        webhookToken: '',
        webhookSigningSecret: ''
      },

      // AI generation
      aiPanelExpanded: true,
      aiPrompt: '',
      aiInteractionMode: 'auto',
      aiGenerating: false,
      aiWorkspaceLoading: false,
      aiMessages: [],
      aiThread: null,
      aiCandidate: null,
      aiPreviewVisible: false,
      aiRequestBaseCode: '',
      aiWorkspaceLoadToken: 0,
      aiDebugSummary: null,
      ideAiTipIndex: 0,
      ideAiTipTimer: null,
      ideAiTips: [
        'Understanding your intent and mapping it to chart-only indicator logic...',
        'Periods, thresholds, switches, and visual preferences should be exposed with @param.',
        'Signals are generated as one-bar events by default so alerts do not repeat.',
        'Persistent regimes belong in plots, lamp rows, or sparse layers rather than repeated markers.',
        'Indicator code stays visual-only; backtest and live execution belong to Strategy API V2.',
        'The generated output is checked for length alignment, sandbox safety, and stable pandas usage.'
      ],
      codeQualityHints: [],
      codeQualityLoading: false,
      codeQualityChecked: false,
      codeAiSplitRatio: 58,
      codeAiResizing: false,

      // Quick Trade drawer reuse
      qtSymbol: 'BTC/USDT',
      qtSide: '',
      qtPrice: 0,

      creatingIndicator: false,
      savingIndicator: false,
      deletingIndicator: false,
      showPublishModal: false,
      showSaveAsModal: false,
      saveAsName: '',
      savingAs: false,
      publishIndicator: null,
      publishing: false,
      unpublishing: false,
      publishPricingType: 'free',
      publishPrice: 10,
      publishDescription: '',
      publishVipFree: false,
      publishCodeHidden: false,

      showAddModal: false,
      addingStock: false,
      addMarketTab: 'Crypto',
      addSearchKeyword: '',
      addSearchResults: [],
      addSelectedItem: null,
      addSearching: false,
      addSearched: false,
      addSearchTimer: null,

      showHistoryDrawer: false,
      historyIndicatorId: null,
      showCodeVersionDrawer: false,
      codeVersionLoading: false,
      codeVersions: [],
      codeVersionPreview: null,
      restoringCodeVersionId: null,

      ideAddMarketKeys: []

    }
  },
  computed: {
    sortedCodeQualityHints () {
      const order = { error: 0, warn: 1, info: 2 }
      return [...(this.codeQualityHints || [])].sort(
        (a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9)
      )
    },
    codeQualityTopStatusClass () {
      const severity = String((this.sortedCodeQualityHints[0] && this.sortedCodeQualityHints[0].severity) || 'info').toLowerCase()
      return {
        'code-quality-top-status--error': severity === 'error' || severity === 'fatal',
        'code-quality-top-status--warn': severity === 'warn' || severity === 'warning',
        'code-quality-top-status--info': !['error', 'fatal', 'warn', 'warning'].includes(severity)
      }
    },
    codeQualityTopStatusIcon () {
      const severity = String((this.sortedCodeQualityHints[0] && this.sortedCodeQualityHints[0].severity) || 'info').toLowerCase()
      if (severity === 'error' || severity === 'fatal') return 'close-circle'
      if (severity === 'warn' || severity === 'warning') return 'exclamation-circle'
      return 'info-circle'
    },
    codeQualityTopStatusText () {
      const first = this.sortedCodeQualityHints[0]
      if (!first) return this.$t('indicatorIde.codeQualityAllGood')
      const suffix = this.sortedCodeQualityHints.length > 1 ? ` (+${this.sortedCodeQualityHints.length - 1})` : ''
      return `${this.formatQualityHint(first)}${suffix}`
    },
    ideAiCurrentTip () {
      return this.ideAiTips[this.ideAiTipIndex] || ''
    },
    aiQuickPrompts () {
      return [
        { label: this.$t('indicatorIde.aiQuickExplain'), mode: 'discussion' },
        { label: this.$t('indicatorIde.aiQuickParameters'), mode: 'modify' },
        { label: this.$t('indicatorIde.aiQuickSignals'), mode: 'modify' },
        { label: this.$t('indicatorIde.aiQuickVisuals'), mode: 'modify' }
      ]
    },
    aiCandidateValidationPassed () {
      return !!(this.aiCandidate && this.aiCandidate.validation && this.aiCandidate.validation.success)
    },
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    chartTheme () {
      return this.isDarkTheme ? 'dark' : 'light'
    },
    ideQtOverlayGetContainer () {
      return (trigger) => this.chartToolbarGetPopupContainer(trigger)
    },
    klineRealtimeEnabled () {
      return !!(this.symbol && String(this.symbol).trim())
    },
    selectedIndicatorObj () {
      return this.selectedIndicatorId
        ? this.indicators.find(i => Number(i.id) === Number(this.selectedIndicatorId))
        : null
    },
    selectedIndicatorIsPurchased () {
      const o = this.selectedIndicatorObj
      if (!o) return false
      return Number(o.is_buy) === 1
    },
    selectedIndicatorCodeHidden () {
      const o = this.selectedIndicatorObj
      if (!o) return false
      return this.isIndicatorCodeHidden(o)
    },
    selectedIndicatorParamCode () {
      const ind = this.selectedIndicatorObj
      if (!ind) return ''
      return this.getIndicatorExecutableCode(ind, undefined)
    },
    currentIndicatorParamSpecs () {
      return this.parseIndicatorParamSpecs(this.selectedIndicatorParamCode || '')
    },
    currentIndicatorParamValues () {
      const ind = this.selectedIndicatorObj
      if (!ind) return {}
      return this.resolveIndicatorRuntimeParams(ind, this.selectedIndicatorParamCode)
    },
    selectedIndicatorDisplayName () {
      return this.indicatorDisplayName(this.selectedIndicatorObj)
    },
    runningSignalAlertCount () {
      return (this.signalAlertTasks || []).filter(item => item && item.status === 'running').length
    },
    signalAlertWatchlistOptions () {
      const list = Array.isArray(this.watchlist) ? [...this.watchlist] : []
      const currentKey = `${this.market}:${this.symbol}`
      const exists = list.some(w => `${w.market}:${w.symbol}` === currentKey)
      if (!exists && this.symbol) {
        list.unshift({ market: this.market, symbol: this.symbol, name: this.qtSymbol === this.symbol ? '' : this.qtSymbol })
      }
      return list
    },
    signalAlertSignalOptions () {
      return this.extractSignalAlertOptions(this.selectedIndicatorParamCode || this.currentCode)
    },
    chartIndicatorToggleDisabled () {
      if (this.chartIndicatorRunning) return false
      if (!this.chartVisibleIndicatorIds.length) return true
      return !this.chartVisibleIndicatorIds.some((rawId) => {
        const id = Number(rawId)
        const ind = this.indicators.find(i => Number(i.id) === id)
        const code = this.getIndicatorExecutableCode(ind)
        return code && String(code).trim()
      })
    },
    indicatorToolbarSummary () {
      const ed = this.selectedIndicatorObj
      const edLabel = this.indicatorDisplayName(ed)
      const n = (this.chartVisibleIndicatorIds && this.chartVisibleIndicatorIds.length) || 0
      if (!this.indicators.length) return this.$t('indicatorIde.noIndicatorsYet')
      if (!n) return `${edLabel} · ${this.$t('indicatorIde.indicatorPickPlaceholder')}`
      return `${edLabel} · ${this.$t('indicatorIde.indicatorCountOnChart', { n })}`
    }
  },
  created: async function () {
    multiTabEvents.$on('cache-evict', this.handleTabCacheEviction)
    await this.loadMarketModules()
    await this.loadUserId()
    await this.initializeCryptoMarketSource()
    this.loadIndicatorParamDefaults()
    await this.loadIndicators()
    await this.loadWatchlist()
    this.restoreIdeUiState()
    this.restoreIdeSelectionPreference()
    this.applyIndicatorRouteSelection()
    this.autoSelectFirstIndicator()
    this.loadSignalAlertNotificationDefaults()
    this.loadSignalAlertTasks()
    this.applyCopilotDraft()
  },
  mounted () {
    this._fullscreenListener = () => this.onGlobalFullscreenChange()
    this._saveShortcutListener = (event) => this.handleGlobalSaveShortcut(event)
    document.addEventListener('fullscreenchange', this._fullscreenListener)
    document.addEventListener('webkitfullscreenchange', this._fullscreenListener)
    window.addEventListener('keydown', this._saveShortcutListener)
    this.$nextTick(() => {
      this.initCodeMirror()
      this.ensureChartReady()
      this.applyIdeOverlayContainers()
    })
  },
  activated () {
    if (this._saveShortcutListener) {
      window.addEventListener('keydown', this._saveShortcutListener)
    }
    this.refreshIndicatorRouteSelection()
    this.$nextTick(() => {
      this.ensureChartReady()
      this.applyIdeOverlayContainers()
    })
  },
  deactivated () {
    if (this._saveShortcutListener) {
      window.removeEventListener('keydown', this._saveShortcutListener)
    }
  },
  beforeDestroy () {
    this.stopCodeAiResize()
    if (this._persistIdeUiTimer) {
      clearTimeout(this._persistIdeUiTimer)
      this._persistIdeUiTimer = null
    }
    if (!this._skipPersistOnDestroy) this.persistIdeUiState()
    multiTabEvents.$off('cache-evict', this.handleTabCacheEviction)
    if (this.cmInstance) {
      this.cmInstance.toTextArea()
      this.cmInstance = null
    }
    clearTimeout(this.addSearchTimer)
    if (this.ideAiTipTimer) clearInterval(this.ideAiTipTimer)
    if (this._fullscreenListener) {
      document.removeEventListener('fullscreenchange', this._fullscreenListener)
      document.removeEventListener('webkitfullscreenchange', this._fullscreenListener)
      this._fullscreenListener = null
    }
    if (this._saveShortcutListener) {
      window.removeEventListener('keydown', this._saveShortcutListener)
      this._saveShortcutListener = null
    }
    try {
      message.destroy()
      message.config({ getContainer: () => document.body })
    } catch (_) {}
  },
  methods: {
    handleTabCacheEviction (route) {
      const key = routeCacheKey(route)
      const path = route && typeof route === 'object' ? route.path : ''
      if (key !== 'IndicatorIDE' && path !== '/indicator-ide') return

      this._skipPersistOnDestroy = true
      if (this._persistIdeUiTimer) {
        clearTimeout(this._persistIdeUiTimer)
        this._persistIdeUiTimer = null
      }
      if (!this.userId) return
      storage.remove(ideUiCacheStorageKey(this.userId))
      storage.remove(ideSelectionStorageKey(this.userId))
    },
    adjustCodeAiSplit (delta) {
      const next = Number(this.codeAiSplitRatio || 58) + Number(delta || 0)
      this.codeAiSplitRatio = Math.max(28, Math.min(76, next))
      this.refreshEditorAfterSplit()
    },
    resetCodeAiSplit () {
      this.codeAiSplitRatio = 58
      this.refreshEditorAfterSplit()
    },
    refreshEditorAfterSplit () {
      this.$nextTick(() => {
        if (this.cmInstance) this.cmInstance.refresh()
      })
    },
    startCodeAiResize (event) {
      if (event && event.button !== 0) return
      const container = this.$refs.codePanelBody
      if (!container) return
      const rect = container.getBoundingClientRect()
      if (!rect.height) return
      if (event) event.preventDefault()
      this.codeAiResizing = true
      this._codeAiResizeMove = (moveEvent) => {
        const raw = ((moveEvent.clientY - rect.top) / rect.height) * 100
        this.codeAiSplitRatio = Math.max(28, Math.min(76, raw))
        this.refreshEditorAfterSplit()
      }
      this._codeAiResizeEnd = () => this.stopCodeAiResize()
      document.body.classList.add('qd-code-ai-resizing')
      window.addEventListener('mousemove', this._codeAiResizeMove)
      window.addEventListener('mouseup', this._codeAiResizeEnd, { once: true })
    },
    stopCodeAiResize () {
      if (this._codeAiResizeMove) window.removeEventListener('mousemove', this._codeAiResizeMove)
      if (this._codeAiResizeEnd) window.removeEventListener('mouseup', this._codeAiResizeEnd)
      this._codeAiResizeMove = null
      this._codeAiResizeEnd = null
      this.codeAiResizing = false
      if (typeof document !== 'undefined') document.body.classList.remove('qd-code-ai-resizing')
    },
    toggleCodeDrawer () {
      this.codeDrawerVisible = !this.codeDrawerVisible
    },
    async loadMarketModules () {
      const options = await loadEnabledMarketOptions({ includeFeatures: ['research'] })
      this.ideAddMarketKeys = options.map(item => item.value)
      if (!this.ideAddMarketKeys.includes(this.addMarketTab)) {
        this.addMarketTab = firstMarketValue(options)
      }
      if (!this.ideAddMarketKeys.includes(this.market)) {
        this.market = this.addMarketTab || firstMarketValue(options)
      }
    },
    applyCopilotDraft () {
      const q = this.$route && this.$route.query ? this.$route.query : {}
      let prompt = ''
      let code = ''
      try {
        prompt = q.aiPrompt ? decodeURIComponent(String(q.aiPrompt)) : ''
      } catch (_) {
        prompt = String(q.aiPrompt || '')
      }
      if (!prompt) {
        try {
          prompt = sessionStorage.getItem('qd_copilot_indicator_prompt') || ''
          if (prompt) sessionStorage.removeItem('qd_copilot_indicator_prompt')
        } catch (_) {}
      }
      try {
        code = sessionStorage.getItem('qd_copilot_indicator_code') || ''
        if (code) sessionStorage.removeItem('qd_copilot_indicator_code')
      } catch (_) {}
      if (code) {
        prompt = ''
        try { sessionStorage.removeItem('qd_copilot_indicator_prompt') } catch (_) {}
      }
      if (prompt) {
        this.aiPrompt = prompt
        this.aiPanelExpanded = true
        this.codeDrawerVisible = true
        this.codePanelExpanded = true
      }
      if (code) {
        this.currentCode = code
        this.codeDirty = true
        this.codeDrawerVisible = true
        this.codePanelExpanded = true
        this.$nextTick(() => {
          if (this.cmInstance) {
            this.cmInstance.setValue(code)
            this.cmInstance.refresh()
          }
        })
      }
    },
    // ===== Data loading =====
    async loadUserId () {
      try {
        const res = await getUserInfo()
        if (res && res.data) this.userId = res.data.id || res.data.user_id || 1
      } catch (_) {
        this.userId = 1
      }
    },

    restoreIdeUiState () {
      if (!this.userId) return
      try {
        const raw = storage.get(ideUiCacheStorageKey(this.userId))
        if (raw == null || raw === '') return
        const s = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!s || typeof s !== 'object') return
        let hadChartVisibleKey = false
        if (Array.isArray(s.activeIndicators)) {
          this.activeIndicators = this.normalizePersistedChartIndicators(s.activeIndicators)
        }
        if (Array.isArray(s.chartVisibleIndicatorIds)) {
          hadChartVisibleKey = true
          const valid = s.chartVisibleIndicatorIds
            .map(Number)
            .filter(id => !isNaN(id) && this.indicators.some(i => Number(i.id) === id))
          this.chartVisibleIndicatorIds = valid
        }
        if (s.timeframe && Object.prototype.hasOwnProperty.call(TF_MAX_DAYS, s.timeframe)) {
          this.timeframe = s.timeframe
        }
        if (s.market && s.symbol) {
          this.market = String(s.market)
          this.symbol = String(s.symbol)
          this.currentInstrumentId = this.market === 'Crypto'
            ? ''
            : String(s.instrument_id || s.instrumentId || '')
          this.qtSymbol = this.symbol
          this.selectedWatchlistKey = marketContextKey({
            market: this.market,
            symbol: this.symbol,
            exchange_id: this.cryptoExchangeId,
            market_type: this.cryptoMarketType,
            instrument_id: this.currentInstrumentId
          })
        } else if (s.selectedWatchlistKey && typeof s.selectedWatchlistKey === 'string') {
          const [m, sym] = s.selectedWatchlistKey.split(':')
          if (m && sym) {
            this.market = m
            this.symbol = sym
            this.qtSymbol = sym
            this.selectedWatchlistKey = s.selectedWatchlistKey
          }
        }
        if (s.selectedIndicatorId != null && s.selectedIndicatorId !== '') {
          const id = Number(s.selectedIndicatorId)
          if (!isNaN(id) && this.indicators.some(i => Number(i.id) === id)) {
            this.selectedIndicatorId = id
            this.onIndicatorChange(id)
          }
        }
        if (!hadChartVisibleKey && !this.chartVisibleIndicatorIds.length && this.selectedIndicatorId != null) {
          this.chartVisibleIndicatorIds = [Number(this.selectedIndicatorId)]
          this.syncSelectedIndicatorToChart()
        }
        this.reconcileIdeMarketFromWatchlist()
      } catch (_) { /* ignore corrupt cache */ }
    },

    schedulePersistIdeUiState () {
      if (this._persistIdeUiTimer) clearTimeout(this._persistIdeUiTimer)
      this._persistIdeUiTimer = setTimeout(() => {
        this._persistIdeUiTimer = null
        this.persistIdeUiState()
      }, 250)
    },

    persistIdeUiState () {
      if (!this.userId) return
      try {
        const payload = {
          timeframe: this.timeframe,
          activeIndicators: this.serializeChartIndicators()
        }
        storage.set(ideUiCacheStorageKey(this.userId), JSON.stringify(payload))
      } catch (_) { /* ignore quota */ }
    },
    restoreIdeSelectionPreference () {
      if (!this.userId) return
      try {
        const raw = storage.get(ideSelectionStorageKey(this.userId))
        if (raw == null || raw === '') return
        const saved = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!saved || typeof saved !== 'object') return

        const market = String(saved.market || '')
        const symbol = String(saved.symbol || '')
        const watchlistKey = marketContextKey({ market, symbol })
        const hasWatchlistItem = this.watchlist.some(item => this.watchlistContextKey(item) === watchlistKey)
        if (market && symbol && hasWatchlistItem) {
          this.market = market
          this.symbol = symbol
          this.qtSymbol = symbol
          this.selectedWatchlistKey = watchlistKey
          this.currentInstrumentId = market === 'Crypto' ? '' : String(saved.instrumentId || '')
        }

        const indicatorId = Number(saved.indicatorId)
        if (indicatorId && this.indicators.some(item => Number(item.id) === indicatorId)) {
          this.selectedIndicatorId = indicatorId
          const visibleIds = Array.isArray(saved.visibleIndicatorIds)
            ? saved.visibleIndicatorIds
              .map(Number)
              .filter(id => this.indicators.some(item => Number(item.id) === id))
            : []
          this.chartVisibleIndicatorIds = visibleIds.length ? visibleIds : [indicatorId]
          this.onIndicatorChange(indicatorId)
        }
      } catch (_) { /* ignore corrupt preference */ }
    },
    persistIdeSelectionPreference () {
      if (!this.userId) return
      try {
        storage.set(ideSelectionStorageKey(this.userId), JSON.stringify({
          market: this.market,
          symbol: this.symbol,
          instrumentId: this.currentInstrumentId,
          indicatorId: this.selectedIndicatorId,
          visibleIndicatorIds: this.chartVisibleIndicatorIds
        }))
      } catch (_) { /* ignore quota */ }
    },
    normalizePersistedChartIndicators (items) {
      if (!Array.isArray(items)) return []
      return items
        .filter(item => item && item.id && item.id !== 'selected-python-indicator' && item.type !== 'python' && !String(item.id).startsWith('ide-py-'))
        .map(item => ({
          id: item.id,
          instanceId: item.instanceId || `${item.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: item.name,
          shortName: item.shortName,
          type: item.type,
          visible: item.visible !== false,
          params: item.params && typeof item.params === 'object' ? { ...item.params } : {},
          style: item.style && typeof item.style === 'object'
            ? { color: item.style.color || '', lineWidth: Number(item.style.lineWidth || 2) }
            : { color: '', lineWidth: 2 }
        }))
    },
    serializeChartIndicators () {
      return this.normalizePersistedChartIndicators(this.activeIndicators)
    },

    async loadIndicators () {
      if (!this.userId) return
      this.loadingIndicators = true
      try {
        const res = await request({ url: '/api/indicator/getIndicators', method: 'get', params: { userid: this.userId } })
        if (res && res.data && Array.isArray(res.data)) {
          this.indicators = res.data.map(item => ({ ...item, type: 'python' }))
        }
      } catch (e) {
        console.warn('Load indicators failed:', e)
      } finally {
        this.loadingIndicators = false
        this.pruneChartVisibleIndicatorIds()
        this.applyIndicatorRouteSelection()
      }
    },
    applyIndicatorRouteSelection () {
      const query = this.$route && this.$route.query ? this.$route.query : {}
      const raw = query.indicator_id || query.indicatorId
      if (!raw) return
      const targetId = Number(raw)
      if (!targetId || !this.indicators.some(item => Number(item.id) === targetId)) return
      this.selectedIndicatorId = targetId
      this.chartVisibleIndicatorIds = [targetId]
      this.onIndicatorChange(targetId)
    },
    async refreshIndicatorRouteSelection () {
      const query = this.$route && this.$route.query ? this.$route.query : {}
      const raw = query.indicator_id || query.indicatorId
      if (!raw) return
      if (this.loadingIndicators) return
      await this.loadIndicators()
    },
    pruneChartVisibleIndicatorIds () {
      const set = new Set(this.indicators.map(i => Number(i.id)))
      this.chartVisibleIndicatorIds = (this.chartVisibleIndicatorIds || []).filter(id => set.has(Number(id)))
    },
    async loadWatchlist () {
      if (!this.userId) return
      this.loadingWatchlist = true
      try {
        const res = await getWatchlist({ userid: this.userId })
        if (res && res.code === 1 && res.data) this.watchlist = res.data
        this.reconcileIdeMarketFromWatchlist()
      } catch (_) { /* silent */ } finally {
        this.loadingWatchlist = false
      }
    },

    reconcileIdeMarketFromWatchlist () {
      if (this.market && this.symbol) {
        this.selectedWatchlistKey = marketContextKey({ market: this.market, symbol: this.symbol })
      }
      const key = this.selectedWatchlistKey
      if (!key || key === '__add__') return
      const row = (this.watchlist || []).find(
        w => w && w.market && w.symbol && this.watchlistContextKey(w) === key
      )
      if (row) {
        this.market = String(row.market)
        this.symbol = String(row.symbol)
        this.qtSymbol = this.symbol
      }
    },

    autoSelectFirstIndicator () {
      if (this.indicators.length > 0 && !this.selectedIndicatorId) {
        this.selectedIndicatorId = this.indicators[0].id
        if (!this.chartVisibleIndicatorIds.length) {
          this.chartVisibleIndicatorIds = [Number(this.indicators[0].id)]
        }
        this.onIndicatorChange(this.indicators[0].id)
      }
    },
    ensureChartReady () {
      this.$nextTick(() => {
        setTimeout(() => {
          const chart = this.$refs.klineChart
          if (!chart || !this.symbol) return
          if (!chart.chartRef && typeof chart.initChart === 'function') {
            chart.initChart()
          }
          if (this.selectedIndicatorId) {
            this.syncSelectedIndicatorToChart()
          }
        }, 300)
      })
    },

    // ===== CodeMirror =====
    initCodeMirror () {
      const el = this.$refs.codeEditor
      if (!el) return
      if (this.cmInstance) {
        this.cmInstance.toTextArea()
        this.cmInstance = null
      }
      const textarea = document.createElement('textarea')
      el.innerHTML = ''
      el.appendChild(textarea)
      this.cmInstance = CodeMirror.fromTextArea(textarea, {
        mode: 'python',
        theme: this.isDarkTheme ? 'monokai' : 'eclipse',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        styleActiveLine: true,
        tabSize: 4,
        indentUnit: 4,
        indentWithTabs: false,
        extraKeys: {
          'Ctrl-S': () => this.saveIndicatorFromShortcut(),
          'Cmd-S': () => this.saveIndicatorFromShortcut()
        }
      })
      this.cmInstance.setValue(this.currentCode)
      this.cmInstance.on('change', (cm) => {
        const val = cm.getValue()
        if (val !== this.currentCode) {
          this.currentCode = val
          this.codeDirty = true
          this.codeQualityChecked = false
          this.codeQualityHints = []
        }
      })
      this.cmInstance.refresh()
      this.applyCodeMirrorReadOnly()
    },
    applyCodeMirrorReadOnly () {
      if (!this.cmInstance) return
      const ro = this.selectedIndicatorCodeHidden
      this.cmInstance.setOption('readOnly', ro)
      this.cmInstance.refresh()
    },
    castIndicatorParamValue (value, type) {
      const t = String(type || '').toLowerCase()
      if (t === 'bool') {
        return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase())
      }
      if (t === 'int') {
        const n = Number(value)
        return Number.isFinite(n) ? Math.round(n) : 0
      }
      if (t === 'float') {
        const n = Number(value)
        return Number.isFinite(n) ? n : 0
      }
      return value == null ? '' : String(value)
    },
    parseIndicatorParamSpecs (code) {
      if (!code || typeof code !== 'string') return []
      const paramRe = /^\s*#\s*@param\s+(\w+)\s+(int|float|bool|str|string)\s+(\S+)\s*(.*)$/i
      const rangeRe = /(?:^|\s)range\s*=\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)/i
      const valuesRe = /(?:^|\s)values\s*=\s*([^\s]+)/i
      const out = []
      for (const rawLine of code.split('\n')) {
        const m = rawLine.match(paramRe)
        if (!m) continue
        const name = m[1]
        const type = String(m[2] || '').toLowerCase().replace('string', 'str')
        const rawDefault = m[3]
        const rest = String(m[4] || '').trim()
        const rangeMatch = rest.match(rangeRe)
        const valuesMatch = rest.match(valuesRe)
        const values = valuesMatch
          ? valuesMatch[1].split(',').map(v => v.trim()).filter(Boolean).map(v => this.castIndicatorParamValue(v, type))
          : null
        let min
        let max
        let step
        if (rangeMatch) {
          min = Number(rangeMatch[1])
          max = Number(rangeMatch[2])
          step = Number(rangeMatch[3])
        }
        const description = rest
          .replace(rangeRe, '')
          .replace(valuesRe, '')
          .trim()
        out.push({
          name,
          type,
          defaultValue: this.castIndicatorParamValue(rawDefault, type),
          rawDefault,
          description,
          label: description ? description.replace(/[，,。.;；:：].*$/, '').trim() : name,
          values,
          min: Number.isFinite(min) ? min : undefined,
          max: Number.isFinite(max) ? max : undefined,
          step: Number.isFinite(step) && step > 0 ? step : undefined,
          rangeText: Number.isFinite(min) && Number.isFinite(max)
            ? `${this.$t('indicatorIde.paramPanel.range')}: ${min} - ${max}${Number.isFinite(step) ? ` / ${step}` : ''}`
            : ''
        })
      }
      return out
    },
    parseIndicatorParamRaw (code) {
      const params = {}
      for (const spec of this.parseIndicatorParamSpecs(code || '')) {
        params[spec.name] = spec.defaultValue
      }
      return params
    },
    normalizeIndicatorParamMap (params, specs = this.currentIndicatorParamSpecs) {
      const out = {}
      for (const spec of specs || []) {
        const hasValue = params && Object.prototype.hasOwnProperty.call(params, spec.name)
        out[spec.name] = this.castIndicatorParamValue(hasValue ? params[spec.name] : spec.defaultValue, spec.type)
      }
      return out
    },
    loadIndicatorParamDefaults () {
      if (!this.userId) return
      try {
        const raw = storage.get(indicatorParamDefaultsStorageKey(this.userId))
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        this.indicatorParamOverrides = parsed && typeof parsed === 'object' ? parsed : {}
      } catch (_) {
        this.indicatorParamOverrides = {}
      }
    },
    persistIndicatorParamDefaults () {
      if (!this.userId) return
      try {
        storage.set(indicatorParamDefaultsStorageKey(this.userId), JSON.stringify(this.indicatorParamOverrides || {}))
      } catch (_) { /* ignore quota */ }
    },
    resolveIndicatorRuntimeParams (indicator, code) {
      if (!indicator) return {}
      const specs = this.parseIndicatorParamSpecs(code || this.getIndicatorExecutableCode(indicator, undefined) || '')
      const defaults = {}
      specs.forEach(spec => { defaults[spec.name] = spec.defaultValue })
      const id = indicator.id != null ? String(indicator.id) : ''
      const saved = id && this.indicatorParamOverrides && this.indicatorParamOverrides[id]
        ? this.indicatorParamOverrides[id]
        : {}
      return this.normalizeIndicatorParamMap({ ...defaults, ...saved }, specs)
    },
    resetIndicatorParamDraft (preferCurrent = true) {
      const source = preferCurrent ? this.currentIndicatorParamValues : {}
      this.indicatorParamDraft = this.normalizeIndicatorParamMap(source)
    },
    openIndicatorParamsDrawer () {
      this.resetIndicatorParamDraft(true)
      this.paramDrawerVisible = true
    },
    onIndicatorParamDraftChange (spec, value) {
      const next = {
        ...this.indicatorParamDraft,
        [spec.name]: this.castIndicatorParamValue(value, spec.type)
      }
      this.indicatorParamDraft = this.normalizeIndicatorParamMap(next)
    },
    applyIndicatorParams () {
      if (!this.selectedIndicatorObj || !this.currentIndicatorParamSpecs.length) return
      const id = String(this.selectedIndicatorObj.id)
      const next = this.normalizeIndicatorParamMap(this.indicatorParamDraft)
      this.$set(this.indicatorParamOverrides, id, next)
      this.syncSelectedIndicatorToChart()
      this.$message.success(this.$t('indicatorIde.paramPanel.applySuccess'))
    },
    saveIndicatorParamDefaults () {
      if (!this.selectedIndicatorObj || !this.currentIndicatorParamSpecs.length) return
      const id = String(this.selectedIndicatorObj.id)
      const next = this.normalizeIndicatorParamMap(this.indicatorParamDraft)
      this.$set(this.indicatorParamOverrides, id, next)
      this.persistIndicatorParamDefaults()
      this.syncSelectedIndicatorToChart()
      this.$message.success(this.$t('indicatorIde.paramPanel.saveSuccess'))
    },
    resetIndicatorParamsToDeclared () {
      if (!this.selectedIndicatorObj) return
      const id = String(this.selectedIndicatorObj.id)
      const defaults = this.normalizeIndicatorParamMap({})
      this.indicatorParamDraft = defaults
      this.$delete(this.indicatorParamOverrides, id)
      this.persistIndicatorParamDefaults()
      this.syncSelectedIndicatorToChart()
    },
    writeIndicatorParamsToCode () {
      if (this.selectedIndicatorCodeHidden || !this.currentIndicatorParamSpecs.length) return
      const nextCode = this.applyIndicatorParamsToCode(this.currentCode || '', this.normalizeIndicatorParamMap(this.indicatorParamDraft))
      if (nextCode === this.currentCode) {
        this.$message.info(this.$t('indicatorIde.applyCandidateNoChanges'))
        return
      }
      this.currentCode = nextCode
      this.codeDirty = true
      if (this.cmInstance) this.cmInstance.setValue(nextCode)
      this.syncSelectedIndicatorToChart(nextCode)
      this.$message.success(this.$t('indicatorIde.paramPanel.writeSuccess'))
    },
    formatIndicatorParamValue (value) {
      if (typeof value === 'boolean') return value ? 'true' : 'false'
      if (value == null || value === '') return '--'
      return String(value)
    },
    extractSignalAlertOptions (code) {
      return [
        { key: 'any', label: this.$t('indicatorIde.signalAlert.allSignals') },
        ...extractIndicatorSignalLabels(code).map(label => ({
          key: `text:${label.toLowerCase()}`,
          label
        }))
      ]
    },
    signalAlertKeyLabel (key) {
      const found = this.signalAlertSignalOptions.find(item => item.key === key)
      if (found) return found.label
      const raw = String(key || '')
      if (raw === 'any') return this.$t('indicatorIde.signalAlert.allSignals')
      return raw.replace(/^text:/, '')
    },
    signalAlertChannelLabel (channel) {
      const map = {
        browser: this.$t('indicatorIde.signalAlert.browser'),
        email: this.$t('indicatorIde.signalAlert.email'),
        telegram: this.$t('indicatorIde.signalAlert.telegram'),
        webhook: this.$t('indicatorIde.signalAlert.webhook')
      }
      return map[channel] || channel
    },
    async loadSignalAlertNotificationDefaults () {
      if (this._signalAlertDefaultsPromise) return this._signalAlertDefaultsPromise
      this.signalAlertDefaultsLoading = true
      this._signalAlertDefaultsPromise = (async () => {
        try {
          const res = await getNotificationSettings()
          if (res && res.code === 1 && res.data) {
            const supported = new Set(['browser', 'email', 'telegram', 'webhook'])
            const configuredChannels = Array.isArray(res.data.default_channels)
              ? res.data.default_channels.map(channel => String(channel || '').toLowerCase()).filter(channel => supported.has(channel))
              : []
            this.signalAlertNotificationDefaults = {
              channels: configuredChannels.length ? Array.from(new Set(configuredChannels)) : ['browser'],
              email: res.data.email || '',
              telegramChatId: res.data.telegram_chat_id || '',
              telegramBotToken: res.data.telegram_bot_token || '',
              webhookUrl: res.data.webhook_url || '',
              webhookToken: res.data.webhook_token || '',
              webhookSigningSecret: res.data.webhook_signing_secret || ''
            }
          }
        } catch (error) {
          // Profile defaults are optional; task creation remains available.
        } finally {
          this.signalAlertDefaultsLoaded = true
          this.signalAlertDefaultsLoading = false
        }
      })()
      try {
        return await this._signalAlertDefaultsPromise
      } finally {
        this._signalAlertDefaultsPromise = null
      }
    },
    resetSignalAlertForm () {
      const ind = this.selectedIndicatorObj || {}
      const current = this.signalAlertWatchlistOptions.find(w => `${w.market}:${w.symbol}` === `${this.market}:${this.symbol}`) || {}
      const defaults = this.signalAlertNotificationDefaults || {}
      this.signalAlertEditingId = null
      this.signalAlertForm = {
        watchlistKey: `${this.market}:${this.symbol}`,
        market: this.market,
        symbol: this.symbol,
        symbolName: current.name || '',
        timeframe: this.timeframe,
        signalKeys: ['any'],
        channels: Array.isArray(defaults.channels) && defaults.channels.length ? [...defaults.channels] : ['browser'],
        email: defaults.email || '',
        telegramChatId: defaults.telegramChatId || '',
        telegramBotToken: defaults.telegramBotToken || '',
        webhookUrl: defaults.webhookUrl || '',
        webhookToken: defaults.webhookToken || '',
        webhookSigningSecret: defaults.webhookSigningSecret || ''
      }
      if (!ind.id) return
      const opts = this.signalAlertSignalOptions
      if (opts && opts.length === 2 && opts[1].key !== 'any') {
        this.signalAlertForm.signalKeys = [opts[1].key]
      }
    },
    async openSignalAlertModal () {
      if (!this.selectedIndicatorId) {
        this.$message.warning(this.$t('indicatorIde.signalAlert.selectIndicatorWarning'))
        return
      }
      if (!this.signalAlertDefaultsLoaded) await this.loadSignalAlertNotificationDefaults()
      this.resetSignalAlertForm()
      this.signalAlertActiveTab = 'create'
      this.signalAlertModalVisible = true
      this.loadSignalAlertTasks()
    },
    closeSignalAlertModal () {
      this.signalAlertModalVisible = false
      this.signalAlertEditingId = null
    },
    onSignalAlertWatchlistChange (value) {
      const [market, ...symbolParts] = String(value || '').split(':')
      const symbol = symbolParts.join(':')
      const item = this.signalAlertWatchlistOptions.find(w => `${w.market}:${w.symbol}` === value) || {}
      this.signalAlertForm.market = market || this.market
      this.signalAlertForm.symbol = symbol || this.symbol
      this.signalAlertForm.symbolName = item.name || ''
    },
    buildSignalAlertPayload () {
      const form = this.signalAlertForm || {}
      const params = this.currentIndicatorParamValues || {}
      return {
        indicator_id: this.selectedIndicatorId,
        indicator_name: this.selectedIndicatorDisplayName,
        market: form.market || this.market,
        symbol: form.symbol || this.symbol,
        symbol_name: form.symbolName || '',
        timeframe: form.timeframe || this.timeframe,
        signal_keys: Array.isArray(form.signalKeys) && form.signalKeys.length ? form.signalKeys : ['any'],
        channels: Array.isArray(form.channels) && form.channels.length ? form.channels : ['browser'],
        targets: {
          email: form.email || '',
          telegram_chat_id: form.telegramChatId || '',
          telegram_bot_token: form.telegramBotToken || '',
          webhook_url: form.webhookUrl || '',
          webhook_token: form.webhookToken || '',
          webhook_signing_secret: form.webhookSigningSecret || ''
        },
        params
      }
    },
    async loadSignalAlertTasks () {
      this.signalAlertLoading = true
      try {
        const res = await request({
          url: '/api/indicator/signal-alerts',
          method: 'get'
        })
        if (res && res.code === 1) {
          this.signalAlertTasks = Array.isArray(res.data) ? res.data : []
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.signalAlert.loadFailed'))
        }
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('indicatorIde.signalAlert.loadFailed'))
      } finally {
        this.signalAlertLoading = false
      }
    },
    async submitSignalAlertTask () {
      if (!this.selectedIndicatorId) return
      const payload = this.buildSignalAlertPayload()
      if (!payload.symbol) {
        this.$message.warning(this.$t('indicatorIde.signalAlert.selectSymbolWarning'))
        return
      }
      if (payload.channels.includes('email') && !payload.targets.email) {
        this.$message.warning(this.$t('indicatorIde.signalAlert.fillEmail'))
        return
      }
      if (payload.channels.includes('telegram') && !payload.targets.telegram_chat_id) {
        this.$message.warning(this.$t('indicatorIde.signalAlert.fillTelegram'))
        return
      }
      if (payload.channels.includes('webhook') && !payload.targets.webhook_url) {
        this.$message.warning(this.$t('indicatorIde.signalAlert.fillWebhook'))
        return
      }
      this.signalAlertSaving = true
      try {
        const res = await request({
          url: this.signalAlertEditingId
            ? `/api/indicator/signal-alerts/${this.signalAlertEditingId}`
            : '/api/indicator/signal-alerts',
          method: this.signalAlertEditingId ? 'put' : 'post',
          data: payload
        })
        if (res && res.code === 1) {
          this.$message.success(this.signalAlertEditingId ? this.$t('indicatorIde.signalAlert.updated') : this.$t('indicatorIde.signalAlert.created'))
          this.signalAlertEditingId = null
          this.signalAlertActiveTab = 'tasks'
          await this.loadSignalAlertTasks()
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.signalAlert.saveFailed'))
        }
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('indicatorIde.signalAlert.saveFailed'))
      } finally {
        this.signalAlertSaving = false
      }
    },
    editSignalAlertTask (task) {
      if (!task) return
      this.signalAlertEditingId = task.id
      const key = `${task.market}:${task.symbol}`
      const defaults = this.signalAlertNotificationDefaults || {}
      const targets = task.targets || {}
      this.signalAlertForm = {
        watchlistKey: key,
        market: task.market || this.market,
        symbol: task.symbol || this.symbol,
        symbolName: task.symbol_name || '',
        timeframe: task.timeframe || this.timeframe,
        signalKeys: Array.isArray(task.signal_keys) && task.signal_keys.length ? [...task.signal_keys] : ['any'],
        channels: Array.isArray(task.channels) && task.channels.length ? [...task.channels] : ['browser'],
        email: targets.email || defaults.email || '',
        telegramChatId: targets.telegram_chat_id || defaults.telegramChatId || '',
        telegramBotToken: targets.telegram_bot_token || defaults.telegramBotToken || '',
        webhookUrl: targets.webhook_url || defaults.webhookUrl || '',
        webhookToken: targets.webhook_token || defaults.webhookToken || '',
        webhookSigningSecret: targets.webhook_signing_secret || defaults.webhookSigningSecret || ''
      }
      this.signalAlertActiveTab = 'create'
    },
    async toggleSignalAlertTask (task) {
      if (!task || !task.id) return
      const action = task.status === 'running' ? 'pause' : 'resume'
      try {
        const res = await request({
          url: `/api/indicator/signal-alerts/${task.id}/${action}`,
          method: 'post'
        })
        if (res && res.code === 1) {
          this.$message.success(action === 'pause' ? this.$t('indicatorIde.signalAlert.pausedMessage') : this.$t('indicatorIde.signalAlert.resumedMessage'))
          await this.loadSignalAlertTasks()
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.signalAlert.actionFailed'))
        }
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('indicatorIde.signalAlert.actionFailed'))
      }
    },
    async testSignalAlertTask (task) {
      if (!task || !task.id) return
      try {
        const res = await request({
          url: `/api/indicator/signal-alerts/${task.id}/test`,
          method: 'post'
        })
        if (res && res.code === 1) {
          const triggered = res.data && res.data.triggered
          this.$message.info(triggered ? this.$t('indicatorIde.signalAlert.testTriggered') : this.$t('indicatorIde.signalAlert.testNoSignal'))
          await this.loadSignalAlertTasks()
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.signalAlert.testFailed'))
        }
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('indicatorIde.signalAlert.testFailed'))
      }
    },
    deleteSignalAlertTask (task) {
      if (!task || !task.id) return
      Modal.confirm({
        title: this.$t('indicatorIde.signalAlert.deleteConfirmTitle'),
        content: this.$t('indicatorIde.signalAlert.deleteConfirmContent', { symbol: task.symbol || '', timeframe: task.timeframe || '' }),
        okText: this.$t('indicatorIde.signalAlert.delete'),
        cancelText: this.$t('dashboard.indicator.editor.cancel'),
        okType: 'danger',
        getContainer: () => this.resolveIdeFullscreenMountNode() || document.body,
        onOk: async () => {
          const res = await request({
            url: `/api/indicator/signal-alerts/${task.id}`,
            method: 'delete'
          })
          if (res && res.code === 1) {
            this.$message.success(this.$t('indicatorIde.signalAlert.deleted'))
            await this.loadSignalAlertTasks()
          } else {
            this.$message.error((res && res.msg) || this.$t('indicatorIde.signalAlert.deleteFailed'))
          }
        }
      })
    },
    onIndicatorChange (id) {
      const ind = this.indicators.find(i => Number(i.id) === Number(id))
      if (ind) {
        this.currentCode = ind.code || ''
        this.codeDirty = false
        if (this.cmInstance) {
          this.cmInstance.setValue(this.currentCode)
        }
        this.syncSelectedIndicatorToChart()
        this.resetIndicatorParamDraft(true)
        this.loadAiWorkspace(id)
      } else {
        this.currentCode = ''
        this.codeDirty = false
        this.chartVisibleIndicatorIds = []
        if (this.cmInstance) {
          this.cmInstance.setValue('')
        }
        this.syncSelectedIndicatorToChart()
        this.indicatorParamDraft = {}
        this.resetAiWorkspaceState()
      }
      this.$nextTick(() => this.applyCodeMirrorReadOnly())
    },
    isIndicatorCodeHidden (indicator) {
      const o = indicator || {}
      return Number(o.code_hidden || 0) === 1 || (Number(o.is_buy || 0) === 1 && Number(o.is_encrypted || 0) === 1)
    },
    getIndicatorExecutableCode (indicator, codeOverride) {
      const ind = indicator || {}
      if (this.isIndicatorCodeHidden(ind)) {
        return String(ind.runtime_code || ind.runtimeCode || ind.run_code || '')
      }
      if (typeof codeOverride === 'string') return codeOverride
      if (Number(this.selectedIndicatorId) === Number(ind.id)) {
        return this.currentCode || ind.code || ''
      }
      return ind.code || ''
    },
    extractIndicatorNameFromCode (code) {
      const raw = String(code || '')
      if (!raw.trim()) return ''
      const assignment = raw.match(/^\s*my_indicator_name\s*=\s*(['"])(.*?)\1\s*$/m)
      if (assignment && assignment[2] && assignment[2].trim()) {
        return assignment[2].trim()
      }
      const outputName = raw.match(/['"]name['"]\s*:\s*(['"])(.*?)\1/)
      if (outputName && outputName[2] && outputName[2].trim()) {
        return outputName[2].trim()
      }
      return ''
    },
    indicatorDisplayName (indicator) {
      const ind = indicator || {}
      if (!ind.id && !ind.name) return '--'
      const code = this.getIndicatorExecutableCode(ind, undefined)
      const codeName = this.extractIndicatorNameFromCode(code)
      return codeName || ind.name || (`Indicator #${ind.id}`)
    },
    resolveIndicatorNameForSave (indicator, code) {
      const ind = indicator || {}
      const codeName = this.extractIndicatorNameFromCode(code)
      return codeName || ind.name || (ind.id ? `Indicator #${ind.id}` : 'New Indicator')
    },
    isIdePythonActiveItem (item) {
      if (!item) return false
      if (item.type === 'python') return true
      if (item.id === 'selected-python-indicator') return true
      if (String(item.id || '').startsWith('ide-py-')) return true
      return false
    },
    buildIdePythonIndicatorForChart (ind, codeForChart) {
      if (!ind) return null
      const chart = this.$refs.klineChart
      const code = codeForChart != null ? codeForChart : (ind.code || '')
      if (!code || !String(code).trim() || !chart || typeof chart.executePythonStrategy !== 'function') return null
      const chartId = `ide-py-${ind.id}`
      const runtimeParams = this.resolveIndicatorRuntimeParams(ind, code)
      return {
        ...ind,
        id: chartId,
        instanceId: chartId,
        originalId: ind.id,
        type: 'python',
        code,
        params: runtimeParams,
        calculate: async (klineData, params = {}) => {
          return chart.executePythonStrategy(code, klineData, { ...runtimeParams, ...(params || {}) }, {
            ...ind,
            originalId: ind.id,
            id: ind.id,
            userId: this.userId
          })
        }
      }
    },
    syncSelectedIndicatorToChart (codeOverride) {
      const nonPython = this.activeIndicators.filter(item => !this.isIdePythonActiveItem(item))
      const pythonBlocks = []
      if (this.chartIndicatorRunning) {
        const seen = new Set()
        for (const rawId of this.chartVisibleIndicatorIds || []) {
          const id = Number(rawId)
          if (isNaN(id) || seen.has(id)) continue
          seen.add(id)
          const ind = this.indicators.find(i => Number(i.id) === id)
          if (!ind) continue
          const code = this.getIndicatorExecutableCode(ind, Number(this.selectedIndicatorId) === id ? codeOverride : undefined)
          const built = this.buildIdePythonIndicatorForChart(ind, code)
          if (built) pythonBlocks.push(built)
        }
      }
      this.activeIndicators = [...nonPython, ...pythonBlocks]
      this.$nextTick(() => {
        const chart = this.$refs.klineChart
        if (chart && typeof chart.updateIndicators === 'function') {
          chart.updateIndicators()
        }
      })
    },
    toggleChartIndicatorRun () {
      if (!this.chartIndicatorRunning && this.chartIndicatorToggleDisabled) return
      if (!this.chartIndicatorRunning && !this.chartVisibleIndicatorIds.length && this.selectedIndicatorId != null) {
        this.chartVisibleIndicatorIds = [Number(this.selectedIndicatorId)]
      }
      this.chartIndicatorRunning = !this.chartIndicatorRunning
      this.syncSelectedIndicatorToChart()
    },
    onWatchlistDropdownVisibleChange (visible) {
      if (visible && !this.loadingWatchlist) this.loadWatchlist()
    },
    onIndicatorDropdownVisibleChange (visible) {
      this.indicatorDropdownVisible = visible
      if (visible && !this.loadingIndicators) this.loadIndicators()
    },
    onChartIndicatorCheckChange (rawId, checked) {
      const id = Number(rawId)
      if (isNaN(id)) return
      if (checked) {
        if (!this.chartVisibleIndicatorIds.includes(id)) {
          this.chartVisibleIndicatorIds = [...this.chartVisibleIndicatorIds, id]
        }
      } else {
        this.chartVisibleIndicatorIds = this.chartVisibleIndicatorIds.filter(x => Number(x) !== id)
      }
      this.syncSelectedIndicatorToChart()
      this.persistIdeSelectionPreference()
    },
    selectEditorIndicator (rawId) {
      this.indicatorDropdownVisible = false
      this.selectedIndicatorId = rawId
      const id = Number(rawId)
      if (!isNaN(id)) {
        this.chartVisibleIndicatorIds = [id]
      }
      this.onIndicatorChange(rawId)
      this.persistIdeSelectionPreference()
    },
    resolveIdeFullscreenMountNode () {
      const fs = document.fullscreenElement || document.webkitFullscreenElement
      const ch = this.$refs.chartFullscreenEl
      const ed = this.$refs.editorFullscreenEl
      if (ch && fs === ch) return ch
      if (ed && fs === ed) return ed
      return null
    },
    ideModalGetContainer () {
      return this.resolveIdeFullscreenMountNode() || document.body
    },
    applyIdeOverlayContainers () {
      const mount = this.resolveIdeFullscreenMountNode()
      const target = mount || document.body
      try {
        message.destroy()
        message.config({ getContainer: () => target })
      } catch (_) {}
    },
    chartToolbarGetPopupContainer () {
      const fs = document.fullscreenElement || document.webkitFullscreenElement
      const ch = this.$refs.chartFullscreenEl
      if (ch && fs === ch) return ch
      if (this.chartFullscreen && ch) return ch
      return document.body
    },
    async toggleEditorFullscreen () {
      const el = this.$refs.editorFullscreenEl
      if (!el) return
      try {
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement
        if (fsEl === el) {
          if (document.exitFullscreen) await document.exitFullscreen()
          else if (document.webkitExitFullscreen) await document.webkitExitFullscreen()
        } else if (el.requestFullscreen) await el.requestFullscreen()
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      } catch (e) {
        console.warn('fullscreen', e)
      }
      this.$nextTick(() => this.onGlobalFullscreenChange())
    },
    async toggleChartFullscreen () {
      const el = this.$refs.chartFullscreenEl
      if (!el) return
      try {
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement
        if (fsEl === el) {
          if (document.exitFullscreen) await document.exitFullscreen()
          else if (document.webkitExitFullscreen) await document.webkitExitFullscreen()
        } else if (el.requestFullscreen) await el.requestFullscreen()
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      } catch (e) {
        console.warn('fullscreen', e)
      }
      this.$nextTick(() => this.onGlobalFullscreenChange())
    },
    onGlobalFullscreenChange () {
      const fs = document.fullscreenElement || document.webkitFullscreenElement
      const ed = this.$refs.editorFullscreenEl
      const ch = this.$refs.chartFullscreenEl
      this.editorFullscreen = !!(ed && fs === ed)
      this.chartFullscreen = !!(ch && fs === ch)
      this.applyIdeOverlayContainers()
      this.$nextTick(() => {
        if (this.cmInstance) this.cmInstance.refresh()
        const chart = this.$refs.klineChart
        const inst = chart && chart.chartRef
        if (inst && typeof inst.resize === 'function') {
          try { inst.resize() } catch (_) {}
        }
      })
    },
    handleIndicatorToggle ({ action, indicator }) {
      if (!indicator || (!indicator.id && !indicator.instanceId)) return
      const targetInstanceId = indicator.instanceId || indicator.id
      const parseIdeDbId = (s) => {
        const m = String(s || '').match(/^ide-py-(\d+)$/)
        return m ? Number(m[1]) : null
      }
      if (action === 'remove') {
        const dbId = parseIdeDbId(indicator.id) || parseIdeDbId(targetInstanceId)
        if (dbId != null && !isNaN(dbId)) {
          this.chartVisibleIndicatorIds = this.chartVisibleIndicatorIds.filter(x => Number(x) !== dbId)
        } else if (String(indicator.id) === 'selected-python-indicator' || String(targetInstanceId) === 'selected-python-indicator') {
          if (this.selectedIndicatorId != null) {
            this.chartVisibleIndicatorIds = this.chartVisibleIndicatorIds.filter(x => Number(x) !== Number(this.selectedIndicatorId))
          }
        }
      }
      if (action === 'add') {
        this.activeIndicators = [...this.activeIndicators, { ...indicator, instanceId: targetInstanceId, calculate: null }]
      } else if (action === 'update') {
        this.activeIndicators = this.activeIndicators.map(item => {
          if ((item.instanceId || item.id) !== targetInstanceId) return item
          return {
            ...item,
            ...indicator,
            instanceId: targetInstanceId,
            params: indicator.params && typeof indicator.params === 'object' ? { ...indicator.params } : (item.params || {}),
            style: indicator.style && typeof indicator.style === 'object'
              ? { color: indicator.style.color || '', lineWidth: Number(indicator.style.lineWidth || 2) }
              : (item.style || { color: '', lineWidth: 2 }),
            calculate: null
          }
        })
      } else if (action === 'remove') {
        this.activeIndicators = this.activeIndicators.filter(item => (item.instanceId || item.id) !== targetInstanceId)
      }
      this.syncSelectedIndicatorToChart()
    },

    // ===== Save =====
    openSaveAsIndicatorModal () {
      const base =
        (this.selectedIndicatorObj && this.selectedIndicatorObj.name) ||
        this.$t('indicatorIde.saveAsDefaultName')
      this.saveAsName = `${base}${this.$t('indicatorIde.nameCopySuffix')}`
      this.showSaveAsModal = true
    },
    async confirmSaveAsIndicator () {
      if (!this.userId) return
      const name = (this.saveAsName || '').trim()
      if (!name) {
        this.$message.warning(this.$t('indicatorIde.saveAsNameRequired'))
        return
      }
      const code = this.cmInstance ? this.cmInstance.getValue() : this.currentCode
      if (!code || !String(code).trim()) {
        this.$message.warning(this.$t('indicatorIde.saveAsNeedCode'))
        return
      }
      this.savingAs = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: { userid: this.userId, id: 0, code, name }
        })
        if (res && res.code === 1) {
          await this.loadIndicators()
          const newId = (res.data && res.data.id) || null
          let targetId = newId
          if (!targetId && this.indicators.length) {
            targetId = this.indicators.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0)
          }
          if (targetId) {
            const tid = Number(targetId)
            if (!this.chartVisibleIndicatorIds.includes(tid)) {
              this.chartVisibleIndicatorIds = [...this.chartVisibleIndicatorIds, tid]
            }
            this.selectedIndicatorId = targetId
            this.onIndicatorChange(targetId)
            this.codeDirty = false
            this.showSaveAsModal = false
            this.$message.success(this.$t('indicatorIde.saveAsSuccess'))
          } else {
            this.$message.error(this.$t('indicatorIde.saveAsFailed'))
          }
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.saveAsFailed'))
        }
      } catch (e) {
        this.$message.error(this.$t('indicatorIde.saveAsFailed') + ': ' + (e.message || ''))
      } finally {
        this.savingAs = false
      }
    },
    handleGlobalSaveShortcut (event) {
      if (!event || (!event.ctrlKey && !event.metaKey) || String(event.key || '').toLowerCase() !== 's') return
      if (this.$route && this.$route.path === '/strategy-ide' && this.$route.query && this.$route.query.tab === 'script') return
      event.preventDefault()
      this.saveIndicatorFromShortcut()
    },
    saveIndicatorFromShortcut () {
      if (!this.selectedIndicatorId || !this.userId) return
      if (this.selectedIndicatorCodeHidden) {
        this.$message.warning(this.$t('indicatorIde.saveBlockedHiddenCode'))
        return
      }
      if (!this.codeDirty) {
        this.$message.info(this.$t('indicatorIde.noChangesToSave'))
        return
      }
      this.saveIndicator()
    },

    async saveIndicator () {
      if (!this.selectedIndicatorId || !this.userId) return
      if (this.savingIndicator) return
      if (this.selectedIndicatorCodeHidden) {
        this.$message.warning(this.$t('indicatorIde.saveBlockedHiddenCode'))
        return
      }
      const indicator = this.selectedIndicatorObj || {}
      const code = this.cmInstance ? this.cmInstance.getValue() : this.currentCode
      const nextName = this.resolveIndicatorNameForSave(indicator, code)
      this.savingIndicator = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            id: this.selectedIndicatorId,
            code,
            name: nextName,
            description: indicator.description || '',
            allowEmptyDraft: true,
            userid: this.userId
          }
        })
        if (res && res.code === 1) {
          this.currentCode = code
          this.codeDirty = false
          this.$message.success(this.$t('indicatorIde.saved'))
          const ind = this.indicators.find(i => i.id === this.selectedIndicatorId)
          if (ind) {
            ind.code = code
            ind.name = nextName
          }
          this.syncSelectedIndicatorToChart(code)
          if (this.showCodeVersionDrawer) this.loadCodeVersions()
        } else {
          const m = (res && res.msg) || ''
          if (m === 'purchased_asset_cannot_publish') {
            this.$message.warning(this.$t('indicatorIde.publishBlockedPurchased'))
          } else {
            this.$message.error(m || this.$t('indicatorIde.saveFailed'))
          }
        }
      } catch (e) {
        const data = e && e.response && e.response.data
        const m = (data && data.msg) || ''
        if (m === 'purchased_asset_cannot_publish') {
          this.$message.warning(this.$t('indicatorIde.publishBlockedPurchased'))
        } else {
          this.$message.error((e && e.message) || this.$t('indicatorIde.saveFailed'))
        }
      } finally {
        this.savingIndicator = false
      }
    },
    openCodeVersionDrawer () {
      if (!this.selectedIndicatorId) return
      this.showCodeVersionDrawer = true
      this.codeVersionPreview = null
      this.loadCodeVersions()
    },
    async loadCodeVersions () {
      if (!this.selectedIndicatorId) return
      this.codeVersionLoading = true
      try {
        const res = await request({
          url: '/api/indicator/versions',
          method: 'get',
          params: { indicatorId: this.selectedIndicatorId }
        })
        if (res && res.code === 1) {
          this.codeVersions = Array.isArray(res.data) ? res.data : []
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.codeVersionLoadFailed'))
        }
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('indicatorIde.codeVersionLoadFailed'))
      } finally {
        this.codeVersionLoading = false
      }
    },
    async previewCodeVersion (item) {
      if (!item || !item.id) return
      try {
        const res = await request({
          url: `/api/indicator/versions/${item.id}`,
          method: 'get'
        })
        if (res && res.code === 1) {
          this.codeVersionPreview = res.data || null
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.codeVersionLoadFailed'))
        }
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('indicatorIde.codeVersionLoadFailed'))
      }
    },
    confirmRestoreCodeVersion (item) {
      if (!item || !item.id) return
      Modal.confirm({
        title: this.$t('indicatorIde.codeVersionRestoreTitle'),
        content: this.$t('indicatorIde.codeVersionRestoreContent', { version: item.version_no }),
        okText: this.$t('indicatorIde.codeVersionRestore'),
        cancelText: this.$t('dashboard.indicator.editor.cancel'),
        getContainer: () => this.resolveIdeFullscreenMountNode() || document.body,
        onOk: () => this.restoreCodeVersion(item)
      })
    },
    async restoreCodeVersion (item) {
      if (!item || !item.id) return
      this.restoringCodeVersionId = item.id
      try {
        const res = await request({
          url: '/api/indicator/versions/restore',
          method: 'post',
          data: { versionId: item.id }
        })
        if (res && res.code === 1 && res.data) {
          const nextCode = res.data.code || ''
          this.currentCode = nextCode
          this.codeDirty = false
          if (this.cmInstance) {
            this.cmInstance.setValue(nextCode)
            this.cmInstance.refresh()
          }
          const ind = this.indicators.find(i => Number(i.id) === Number(this.selectedIndicatorId))
          if (ind) {
            ind.code = nextCode
            ind.name = res.data.name || ind.name
            ind.description = res.data.description || ind.description
          }
          this.syncSelectedIndicatorToChart(nextCode)
          this.$message.success(this.$t('indicatorIde.codeVersionRestored'))
          await this.loadCodeVersions()
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.codeVersionRestoreFailed'))
        }
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('indicatorIde.codeVersionRestoreFailed'))
      } finally {
        this.restoringCodeVersionId = null
      }
    },
    formatCodeVersionTime (value) {
      if (!value) return '--'
      const m = moment(value)
      return m.isValid() ? m.format('YYYY-MM-DD HH:mm:ss') : String(value)
    },

    handleDeleteIndicator () {
      if (!this.selectedIndicatorId || !this.userId) return
      const ind = this.selectedIndicatorObj
      const name = (ind && ind.name) || ('#' + this.selectedIndicatorId)
      const h = this.$createElement
      const children = [
        h('p', { style: { margin: '0 0 8px' } }, [
          this.$t('dashboard.indicator.delete.confirmContent', { name })
        ])
      ]
      if (this.codeDirty) {
        children.push(
          h('p', { style: { margin: 0, color: '#fa8c16', fontSize: '13px' } }, [
            this.$t('indicatorIde.deleteUnsavedHint')
          ])
        )
      }
      Modal.confirm({
        title: this.$t('dashboard.indicator.delete.confirmTitle'),
        content: h('div', children),
        okText: this.$t('dashboard.indicator.delete.confirmOk'),
        cancelText: this.$t('dashboard.indicator.delete.confirmCancel'),
        okType: 'danger',
        getContainer: () => this.resolveIdeFullscreenMountNode() || document.body,
        onOk: () => this.confirmDeleteIndicator()
      })
    },

    async confirmDeleteIndicator () {
      if (!this.selectedIndicatorId || !this.userId) return
      const id = this.selectedIndicatorId
      this.deletingIndicator = true
      try {
        const res = await request({
          url: '/api/indicator/deleteIndicator',
          method: 'post',
          data: { id }
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.indicator.delete.success'))
          this.chartVisibleIndicatorIds = this.chartVisibleIndicatorIds.filter(x => Number(x) !== Number(id))
          await this.loadIndicators()
          if (this.indicators.length > 0) {
            const first = this.indicators[0]
            this.selectedIndicatorId = first.id
            if (!this.chartVisibleIndicatorIds.length) {
              this.chartVisibleIndicatorIds = [Number(first.id)]
            }
            this.onIndicatorChange(first.id)
          } else {
            this.selectedIndicatorId = undefined
            this.chartVisibleIndicatorIds = []
            this.onIndicatorChange(undefined)
          }
        } else {
          this.$message.error((res && res.msg) || this.$t('dashboard.indicator.delete.failed'))
        }
      } catch (e) {
        const data = e && e.response && e.response.data
        this.$message.error((data && data.msg) || (e && e.message) || this.$t('dashboard.indicator.delete.failed'))
      } finally {
        this.deletingIndicator = false
      }
    },

    handleAIGenerateEnterKey (e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const target = e.target
        if (!target || typeof target.selectionStart !== 'number') {
          this.aiPrompt = `${this.aiPrompt || ''}\n`
          return
        }
        const start = target.selectionStart
        const end = target.selectionEnd
        const prompt = this.aiPrompt || ''
        this.aiPrompt = `${prompt.slice(0, start)}\n${prompt.slice(end)}`
        this.$nextTick(() => {
          target.selectionStart = start + 1
          target.selectionEnd = start + 1
        })
        return
      }
      e.preventDefault()
      if (!this.aiGenerating && this.aiPrompt && this.aiPrompt.trim()) this.handleAIGenerate()
    },
    resetAiWorkspaceState () {
      this.aiWorkspaceLoadToken += 1
      this.aiWorkspaceLoading = false
      this.aiMessages = []
      this.aiThread = null
      this.aiCandidate = null
      this.aiPreviewVisible = false
      this.aiRequestBaseCode = ''
      this.aiDebugSummary = null
    },
    async loadAiWorkspace (indicatorId) {
      const id = Number(indicatorId)
      const indicator = this.indicators.find(item => Number(item.id) === id)
      if (!id || !indicator || this.isIndicatorCodeHidden(indicator)) {
        this.resetAiWorkspaceState()
        return
      }
      const token = ++this.aiWorkspaceLoadToken
      this.aiWorkspaceLoading = true
      this.aiMessages = []
      this.aiThread = null
      this.aiCandidate = null
      try {
        const res = await request({ url: `/api/indicator/aiWorkspace/${id}`, method: 'get' })
        if (token !== this.aiWorkspaceLoadToken || Number(this.selectedIndicatorId) !== id) return
        if (res && res.code === 1 && res.data) {
          this.aiThread = res.data.thread || null
          this.aiMessages = Array.isArray(res.data.messages) ? res.data.messages : []
          const candidate = res.data.candidate
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
          this.$nextTick(this.scrollAiConversationToBottom)
        }
      } catch (e) {
        if (token === this.aiWorkspaceLoadToken) {
          this.$message.error((e && e.message) || this.$t('indicatorIde.aiWorkspaceLoadFailed'))
        }
      } finally {
        if (token === this.aiWorkspaceLoadToken) this.aiWorkspaceLoading = false
      }
    },
    scrollAiConversationToBottom () {
      const el = this.$refs.aiConversation
      if (el) el.scrollTop = el.scrollHeight
    },
    isActiveAiCandidateMessage (messageItem) {
      if (!this.aiCandidate || !messageItem || messageItem.role === 'user' || messageItem.message_type !== 'candidate') return false
      const candidateMessages = this.aiMessages.filter(item => item && item.role !== 'user' && item.message_type === 'candidate')
      const latestCandidateMessage = candidateMessages[candidateMessages.length - 1]
      const messageChangeId = Number(messageItem.change_id || 0)
      const candidateId = Number(this.aiCandidate.id || 0)
      if (messageChangeId && candidateId && messageChangeId === candidateId) return true
      return latestCandidateMessage === messageItem
    },
    useAiQuickPrompt (item) {
      const prompt = item && typeof item === 'object' ? item.label : item
      this.aiPrompt = String(prompt || '')
      this.aiInteractionMode = (item && item.mode) || 'auto'
      this.$nextTick(() => {
        const input = this.$el && this.$el.querySelector('.ai-prompt-input textarea')
        if (input) input.focus()
      })
    },
    clearAiWorkspace () {
      if (!this.selectedIndicatorId) return
      Modal.confirm({
        title: this.$t('indicatorIde.aiClearConversation'),
        content: this.$t('indicatorIde.aiClearConversationConfirm'),
        okText: this.$t('indicatorIde.aiClearConversation'),
        cancelText: this.$t('dashboard.indicator.editor.cancel'),
        getContainer: () => this.resolveIdeFullscreenMountNode() || document.body,
        onOk: async () => {
          const res = await request({ url: `/api/indicator/aiWorkspace/${this.selectedIndicatorId}`, method: 'delete' })
          if (res && res.code === 1) {
            this.aiMessages = []
            this.aiCandidate = null
            this.aiThread = null
            this.aiDebugSummary = null
          }
        }
      })
    },
    previewAiCandidate () {
      if (!this.aiCandidate || !this.aiCandidate.code) return
      this.aiPreviewVisible = true
      this.syncSelectedIndicatorToChart(this.aiCandidate.code)
      this.$message.info(this.$t('indicatorIde.aiPreviewing'))
    },
    applyAiCandidate () {
      if (!this.aiCandidate || !this.aiCandidate.code) return
      const currentEditorCode = this.cmInstance ? this.cmInstance.getValue() : this.currentCode
      const changedSinceRequest = this.aiCandidate.baseCodeMatchesCurrent === false ||
        (!!this.codeDirty && (!this.aiCandidate.baseCode || currentEditorCode !== this.aiCandidate.baseCode))
      if (changedSinceRequest) {
        Modal.confirm({
          title: this.$t('indicatorIde.aiEditorChangedTitle'),
          content: this.$t('indicatorIde.aiEditorChangedDesc'),
          okText: this.$t('indicatorIde.aiApply'),
          cancelText: this.$t('dashboard.indicator.editor.cancel'),
          getContainer: () => this.resolveIdeFullscreenMountNode() || document.body,
          onOk: () => this.applyAiCandidateCode()
        })
        return
      }
      this.applyAiCandidateCode()
    },
    async applyAiCandidateCode () {
      const candidate = this.aiCandidate
      if (!candidate || !candidate.code) return
      if (this.cmInstance) {
        this.cmInstance.setValue(candidate.code)
        this.cmInstance.refresh()
      }
      this.currentCode = candidate.code
      this.codeDirty = true
      this.aiPreviewVisible = false
      this.syncSelectedIndicatorToChart(candidate.code)
      await this.fetchCodeQualityHints(candidate.code)
      if (candidate.id) {
        request({
          url: `/api/indicator/aiWorkspace/changes/${candidate.id}/status`,
          method: 'post',
          data: { status: 'applied' }
        }).catch(() => {})
      }
      this.aiCandidate = null
      this.$message.success(this.$t('indicatorIde.aiApplied'))
    },
    async discardAiCandidate () {
      const candidate = this.aiCandidate
      if (!candidate) return
      if (candidate.id) {
        try {
          await request({
            url: `/api/indicator/aiWorkspace/changes/${candidate.id}/status`,
            method: 'post',
            data: { status: 'discarded' }
          })
        } catch (e) {}
      }
      this.aiCandidate = null
      this.aiPreviewVisible = false
      this.syncSelectedIndicatorToChart(this.currentCode)
    },
    async handleAIGenerate () {
      if (this.selectedIndicatorCodeHidden) {
        this.$message.warning(this.$t('indicatorIde.saveBlockedHiddenCode'))
        return
      }
      if (!this.selectedIndicatorId) {
        this.$message.warning(this.$t('indicatorIde.aiNoSavedIndicator'))
        return
      }
      if (!this.aiPrompt || !this.aiPrompt.trim()) {
        this.$message.warning(this.$t('indicatorIde.aiPromptRequired'))
        return
      }
      const userPrompt = this.aiPrompt.trim()
      const requestMode = this.aiInteractionMode || 'auto'
      this.aiGenerating = true
      this.aiDebugSummary = null
      let existingCode = ''
      if (this.cmInstance) existingCode = this.cmInstance.getValue() || ''
      this.aiRequestBaseCode = existingCode
      this.aiMessages.push({ role: 'user', content: userPrompt, message_type: requestMode === 'modify' ? 'change_request' : 'question', localId: `user-${Date.now()}` })
      this.aiPrompt = ''
      this.aiInteractionMode = 'auto'
      this.$nextTick(this.scrollAiConversationToBottom)
      let generatedCode = ''
      let workspaceMeta = null
      try {
        const url = '/api/indicator/aiGenerate'
        const token = storage.get(ACCESS_TOKEN)
        const lang = (this.$i18n && this.$i18n.locale) || 'en-US'
        const paramDefaults = this.parseIndicatorParamRaw(existingCode || this.currentCode || '')
        const requestBody = {
          prompt: userPrompt,
          source: 'indicator_ide',
          interactionMode: requestMode,
          context: {
            source: 'indicator_ide',
            market: this.market || '',
            symbol: this.symbol || '',
            timeframe: this.timeframe || '',
            indicatorId: this.selectedIndicatorId || '',
            indicatorName: this.selectedIndicatorDisplayName || '',
            indicatorDescription: (this.selectedIndicatorObj && this.selectedIndicatorObj.description) || '',
            paramDefaults
          }
        }
        if (existingCode.trim()) requestBody.existingCode = existingCode.trim()

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
            'Access-Token': token || '',
            Token: token || '',
            'X-App-Lang': lang,
            'Accept-Language': lang
          },
          body: JSON.stringify(requestBody),
          credentials: 'include'
        })
        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(text || `HTTP error! status: ${response.status}`)
        }
        if (!response.body || typeof response.body.getReader !== 'function') {
          throw new Error('AI service did not return a readable stream')
        }
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue
            const data = line.substring(6)
            if (data === '[DONE]') break
            try {
              const json = JSON.parse(data)
              if (json.error) {
                throw new Error(json.error)
              }
              if (json.debug && json.debug.human_summary) {
                this.aiDebugSummary = this.normalizeAiDebugSummary(json.debug.human_summary)
              }
              if (json.workspace) workspaceMeta = json.workspace
              if (json.content) {
                generatedCode += json.content
              }
            } catch (err) {
              if (err instanceof Error && err.message) {
                throw err
              }
            }
          }
        }
        const replyType = (workspaceMeta && workspaceMeta.reply_type) || 'candidate'
        if (replyType === 'discussion') {
          const assistantMessage = workspaceMeta && workspaceMeta.assistant_message
          const answer = (assistantMessage && assistantMessage.content) || generatedCode.trim()
          if (answer) {
            this.aiMessages.push(assistantMessage || {
              role: 'assistant',
              content: answer,
              message_type: 'discussion',
              localId: `assistant-${Date.now()}`
            })
            this.aiPanelExpanded = true
            this.$nextTick(this.scrollAiConversationToBottom)
          } else {
            this.$message.warning(this.$t('indicatorIde.aiNoAnswer'))
          }
        } else if (generatedCode) {
          const cleanedCode = this.cleanMarkdownCodeBlocks(generatedCode)
          const assistantMessage = workspaceMeta && workspaceMeta.assistant_message
          this.aiMessages.push(assistantMessage || {
            role: 'assistant',
            content: this.$t('indicatorIde.aiCandidateAssistantText'),
            message_type: 'candidate',
            localId: `assistant-${Date.now()}`
          })
          this.aiCandidate = {
            id: workspaceMeta && workspaceMeta.change_id,
            code: cleanedCode,
            baseCode: existingCode,
            baseCodeHash: (workspaceMeta && workspaceMeta.base_code_hash) || '',
            validation: (workspaceMeta && workspaceMeta.validation) || {},
            summary: (workspaceMeta && workspaceMeta.summary) || {}
          }
          this.aiPanelExpanded = true
          this.$message.success(this.$t('indicatorIde.aiCandidateReady'))
          this.$nextTick(this.scrollAiConversationToBottom)
        } else if (!generatedCode) {
          this.$message.warning(this.$t('indicatorIde.aiNoCode'))
        }
      } catch (error) {
        const errMsg = (error && error.message) || this.$t('indicatorIde.aiGenerateFailed')
        if (/insufficient|credit/i.test(errMsg)) {
          this.$message.warning(errMsg)
        } else {
          this.$message.error(errMsg)
        }
        this.aiMessages.push({ role: 'assistant', content: errMsg, localId: `error-${Date.now()}` })
        this.$nextTick(this.scrollAiConversationToBottom)
      } finally {
        this.aiGenerating = false
      }
    },
    renderAiMessage (value) {
      return renderSafeMarkdown(value)
    },
    normalizeAiDebugSummary (summary) {
      if (!summary || typeof summary !== 'object') return null
      const fixedMessages = Array.isArray(summary.fixed_messages) ? summary.fixed_messages.filter(Boolean) : []
      const remainingMessages = Array.isArray(summary.remaining_messages) ? summary.remaining_messages.filter(Boolean) : []
      const normalized = {
        title: summary.title ? String(summary.title) : '',
        returned_text: summary.returned_text ? String(summary.returned_text) : '',
        fixed_messages: fixedMessages,
        remaining_messages: remainingMessages
      }
      if (!normalized.title && !normalized.returned_text && !fixedMessages.length && !remainingMessages.length) {
        return null
      }
      return normalized
    },
    aiDebugAlertType (summary = this.aiDebugSummary) {
      if (!summary) return 'info'
      if ((summary.remaining_messages || []).length) return 'warning'
      if ((summary.fixed_messages || []).length) return 'success'
      return 'info'
    },
    aiDebugState (summary = this.aiDebugSummary) {
      return this.aiDebugAlertType(summary)
    },
    aiDebugStateIcon (summary = this.aiDebugSummary) {
      const state = this.aiDebugState(summary)
      if (state === 'warning') return 'exclamation-circle'
      if (state === 'success') return 'check-circle'
      return 'info-circle'
    },
    aiDebugStateLabel (summary = this.aiDebugSummary) {
      const state = this.aiDebugState(summary)
      if (state === 'warning') return this.$t('indicatorIde.aiQaStateWarning') || 'Needs review'
      if (state === 'success') return this.$t('indicatorIde.aiQaStateSuccess') || 'Auto fixed'
      return this.$t('indicatorIde.aiQaStatePassed') || 'QA passed'
    },
    aiDebugStateTagColor (summary = this.aiDebugSummary) {
      const state = this.aiDebugState(summary)
      if (state === 'warning') return 'orange'
      if (state === 'success') return 'green'
      return 'blue'
    },
    qualityHintClass (h) {
      const s = (h && h.severity) || 'info'
      return {
        'quality-hint--error': s === 'error',
        'quality-hint--warn': s === 'warn',
        'quality-hint--info': s === 'info'
      }
    },
    formatQualityHint (h) {
      if (!h || !h.code) return ''
      if (h.code === 'PARAM_DEFAULT_MISMATCH') {
        const items = Array.isArray(h.params && h.params.items) ? h.params.items : []
        const details = items
          .map(item => {
            const name = item && item.name ? item.name : '-'
            const declared = item && item.declared !== undefined ? item.declared : '-'
            const fallback = item && item.fallback !== undefined ? item.fallback : '-'
            return `${name}: @param=${declared}, params.get=${fallback}`
          })
          .join('; ')
        const key = 'indicatorIde.quality.PARAM_DEFAULT_MISMATCH'
        const msg = this.$t(key, { details })
        return msg === key ? `Parameter default mismatch${details ? `: ${details}` : ''}` : msg
      }
      const key = `indicatorIde.quality.${h.code}`
      const msg = this.$t(key, h.params || {})
      return msg === key ? String(h.code) : msg
    },
    async requestCodeQualityHints (code) {
      const c = (code != null ? String(code) : '').trim()
      if (!c) {
        return []
      }
      const res = await request({
        url: '/api/indicator/codeQualityHints',
        method: 'post',
        data: { code: c }
      })
      if (res && res.code === 1 && res.data && Array.isArray(res.data.hints)) {
        return res.data.hints
      }
      throw new Error((res && res.msg) || 'Code quality check failed')
    },
    async fetchCodeQualityHints (code) {
      const c = (code != null ? String(code) : '').trim()
      if (!c) {
        this.codeQualityHints = []
        this.codeQualityChecked = false
        return
      }
      this.codeQualityLoading = true
      try {
        this.codeQualityHints = await this.requestCodeQualityHints(c)
        this.codeQualityChecked = true
      } catch (e) {
        this.codeQualityHints = []
        this.codeQualityChecked = false
      } finally {
        this.codeQualityLoading = false
      }
    },
    async ensureCodeQualityBeforePublish (code, options = {}) {
      const c = (code != null ? String(code) : '').trim()
      if (!c) {
        this.codeQualityHints = [{ severity: 'error', code: 'EMPTY_CODE', params: {} }]
        this.codeQualityChecked = true
        this.codeDrawerVisible = true
        this.codePanelExpanded = true
        this.$message.error(this.$t('indicatorIde.publishQualityBlockedWithReason', { reason: this.formatQualityHint(this.codeQualityHints[0]) }))
        return false
      }
      this.codeQualityLoading = true
      try {
        this.codeQualityHints = await this.requestCodeQualityHints(c)
        this.codeQualityChecked = true
      } catch (e) {
        this.codeQualityChecked = false
        this.$message.error(this.$t('indicatorIde.publishQualityCheckFailed') + (e && e.message ? `: ${e.message}` : ''))
        return false
      } finally {
        this.codeQualityLoading = false
      }
      const blockers = (this.codeQualityHints || []).filter(h => {
        const severity = String((h && h.severity) || '').toLowerCase()
        return severity === 'error' || severity === 'fatal'
      })
      if (blockers.length) {
        this.codeDrawerVisible = true
        this.codePanelExpanded = true
        const reason = this.formatQualityHint(blockers[0])
        this.$message.error(reason
          ? this.$t('indicatorIde.publishQualityBlockedWithReason', { reason })
          : this.$t('indicatorIde.publishQualityBlocked'))
        return false
      }
      if (!options.silentSuccess) {
        this.$message.success(this.$t('indicatorIde.publishQualityPassed'))
      }
      return true
    },
    async runCodeQualityCheck () {
      const code = this.cmInstance ? (this.cmInstance.getValue() || '') : (this.currentCode || '')
      await this.fetchCodeQualityHints(code)
      if (!this.codeQualityHints.length) {
        this.$message.success(this.$t('indicatorIde.codeQualityAllGood'))
      }
    },
    cleanMarkdownCodeBlocks (code) {
      if (!code || typeof code !== 'string') return code
      let c = code.trim()
      if (!/```/.test(c)) return c
      c = c.replace(/^```[\w]*\s*\n?/i, '')
      if (c.startsWith('```')) c = c.replace(/^```\s*\n?/g, '')
      if (c.endsWith('```')) c = c.replace(/\n?```\s*$/g, '')
      c = c.replace(/^\s*```[\w]*\s*$/gm, '')
      c = c.replace(/^\s*```\s*$/gm, '')
      c = c.replace(/\n{3,}/g, '\n\n')
      return c.trim()
    },

    // ===== Quick Trade =====
    isQuickTradeMarketSupported () {
      return ['Crypto', 'USStock'].includes(this.market)
    },
    toggleQuickTradeDrawer () {
      if (!this.quickTradeDrawerVisible && !this.isQuickTradeMarketSupported()) {
        this.$message.warning(this.$t('quickTrade.unsupportedMarket'))
        return
      }
      if (!this.quickTradeDrawerVisible) {
        this.qtSymbol = this.symbol || ''
        this.qtSide = ''
        this.qtPrice = 0
      }
      this.quickTradeDrawerVisible = !this.quickTradeDrawerVisible
    },
    onQuickTradeSuccess () {
      this.$message.success(this.$t('quickTrade.orderSuccess'))
    },
    handleQuickTradeSymbolChange (newSymbol) {
      if (newSymbol) {
        this.qtSymbol = newSymbol
      }
    },
    async handleCreateIndicator () {
      if (!this.userId) {
        this.$message.error(this.$t('dashboard.indicator.error.pleaseLogin'))
        return
      }
      const proceed = () => this._createIndicatorInIde()
      if (this.codeDirty) {
        Modal.confirm({
          title: this.$t('indicatorIde.newIndicatorUnsavedTitle'),
          content: this.$t('indicatorIde.newIndicatorUnsavedContent'),
          okText: this.$t('indicatorIde.newIndicatorConfirmOk'),
          cancelText: this.$t('indicatorIde.newIndicatorConfirmCancel'),
          getContainer: () => this.resolveIdeFullscreenMountNode() || document.body,
          onOk: proceed
        })
      } else {
        await proceed()
      }
    },
    async _createIndicatorInIde () {
      const code = ''
      this.creatingIndicator = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            userid: this.userId,
            id: 0,
            code,
            allowEmptyDraft: true
          }
        })
        if (res && res.code === 1) {
          await this.loadIndicators()
          const newId = (res.data && res.data.id) || null
          let targetId = newId
          if (!targetId && this.indicators.length) {
            targetId = this.indicators.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0)
          }
          if (targetId) {
            const tid = Number(targetId)
            if (!this.chartVisibleIndicatorIds.includes(tid)) {
              this.chartVisibleIndicatorIds = [...this.chartVisibleIndicatorIds, tid]
            }
            this.selectedIndicatorId = targetId
            const ind = this.indicators.find(i => i.id === targetId)
            if (ind) ind.code = code
            // A newly-created indicator owns a fresh AI workspace. Select and
            // load it immediately so the previous indicator's conversation can
            // never remain visible until a manual save/reselect cycle.
            this.onIndicatorChange(targetId)
            this.aiPanelExpanded = true
            this.$message.success(this.$t('indicatorIde.newIndicatorCreated'))
          } else {
            this.$message.error(this.$t('indicatorIde.newIndicatorFailed'))
          }
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.newIndicatorFailed'))
        }
      } catch (e) {
        this.$message.error(this.$t('indicatorIde.newIndicatorFailed') + ': ' + (e.message || ''))
      } finally {
        this.creatingIndicator = false
      }
    },
    async handlePublishIndicator () {
      if (!this.selectedIndicatorObj) return
      if (this.selectedIndicatorIsPurchased) {
        this.$message.warning(this.$t('indicatorIde.publishBlockedPurchased'))
        return
      }
      if (this.selectedIndicatorCodeHidden) {
        this.$message.warning(this.$t('indicatorIde.saveBlockedHiddenCode'))
        return
      }
      const indicator = this.selectedIndicatorObj || {}
      const code = this.cmInstance ? this.cmInstance.getValue() : (this.currentCode || indicator.code || '')
      if (!indicator.publish_to_community) {
        const qualityOk = await this.ensureCodeQualityBeforePublish(code)
        if (!qualityOk) return
      }
      if (this.codeDirty) {
        await this.saveIndicator()
      }
      const name = this.resolveIndicatorNameForSave(indicator, code)
      this.publishIndicator = { ...indicator, name, code }
      this.publishPricingType = indicator.pricing_type || 'free'
      this.publishPrice = indicator.price || 10
      this.publishDescription = indicator.description || ''
      this.publishVipFree = !!indicator.vip_free
      this.publishCodeHidden = !!indicator.is_encrypted
      this.showPublishModal = true
    },
    buildIndicatorToStrategyContext () {
      const indicator = this.selectedIndicatorObj || {}
      const code = String(this.cmInstance ? this.cmInstance.getValue() : (this.currentCode || indicator.code || '')).trim()
      const params = this.parseIndicatorParamRaw(code || '')
      return {
        indicatorId: indicator.id || this.selectedIndicatorId || '',
        name: this.resolveIndicatorNameForSave(indicator, code),
        description: String(indicator.description || '').trim(),
        code,
        params,
        market: this.market || '',
        symbol: this.symbol || '',
        exchange_id: this.market === 'Crypto' ? this.cryptoExchangeId : '',
        market_type: this.market === 'Crypto' ? this.cryptoMarketType : 'spot',
        instrument_id: this.currentInstrumentId || '',
        timeframe: this.timeframe || '',
        codeHidden: !!this.selectedIndicatorCodeHidden
      }
    },
    handleCreateStrategyFromIndicator () {
      const indicator = this.selectedIndicatorObj
      if (!indicator) {
        this.$message.warning(this.$t('indicatorIde.selectIndicatorFirst') || 'Please select an indicator first.')
        return
      }
      if (this.selectedIndicatorCodeHidden) {
        this.$message.warning(this.$t('indicatorIde.aiConvertHiddenBlocked'))
        return
      }
      const context = this.buildIndicatorToStrategyContext()
      if (!context.code) {
        this.$message.warning(this.$t('indicatorIde.codeRequired') || 'Please write indicator code first.')
        return
      }
      const storageKey = `qd_indicator_to_strategy_${Date.now()}`
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(context))
      } catch (_) {}
      this.$router.push({
        path: '/strategy-ide',
        query: {
          tab: 'script',
          convert: 'indicator',
          convert_key: storageKey,
          market: this.market || '',
          symbol: this.symbol || '',
          exchange_id: this.market === 'Crypto' ? this.cryptoExchangeId : '',
          market_type: this.market === 'Crypto' ? this.cryptoMarketType : 'spot',
          timeframe: this.timeframe || '',
          source_indicator_id: String(indicator.id || '')
        }
      })
    },
    async handleConfirmPublish () {
      if (!this.userId || !this.publishIndicator) return
      const code = this.cmInstance ? this.cmInstance.getValue() : (this.currentCode || this.publishIndicator.code || '')
      const name = this.resolveIndicatorNameForSave(this.publishIndicator, code)
      this.publishing = true
      try {
        const qualityOk = await this.ensureCodeQualityBeforePublish(code, { silentSuccess: true })
        if (!qualityOk) return
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            userid: this.userId,
            id: this.publishIndicator.id,
            code,
            name,
            description: this.publishDescription,
            publishToCommunity: true,
            pricingType: this.publishPricingType,
            price: this.publishPricingType === 'paid' ? this.publishPrice : 0,
            vipFree: this.publishPricingType === 'paid' ? this.publishVipFree : false,
            codeHidden: this.publishCodeHidden
          }
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.indicator.publish.success'))
          const ind = this.indicators.find(i => Number(i.id) === Number(this.publishIndicator.id))
          if (ind) {
            ind.name = name
            ind.code = code
            ind.description = this.publishDescription
            ind.pricing_type = this.publishPricingType
            ind.price = this.publishPricingType === 'paid' ? this.publishPrice : 0
            ind.vip_free = this.publishPricingType === 'paid' ? this.publishVipFree : false
            ind.is_encrypted = this.publishCodeHidden ? 1 : 0
          }
          this.showPublishModal = false
          this.publishIndicator = null
          await this.loadIndicators()
        } else {
          this.$message.error((res && res.msg) || this.$t('dashboard.indicator.publish.failed'))
        }
      } catch (error) {
        this.$message.error(this.$t('dashboard.indicator.publish.failed') + ': ' + (error.message || ''))
      } finally {
        this.publishing = false
      }
    },
    async handleUnpublish () {
      if (!this.userId || !this.publishIndicator) return
      this.unpublishing = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            userid: this.userId,
            id: this.publishIndicator.id,
            code: this.currentCode || this.publishIndicator.code,
            name: this.publishIndicator.name,
            description: this.publishIndicator.description,
            publishToCommunity: false,
            pricingType: 'free',
            price: 0,
            vipFree: false
          }
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.indicator.publish.unpublishSuccess'))
          this.showPublishModal = false
          this.publishIndicator = null
          await this.loadIndicators()
        } else {
          this.$message.error((res && res.msg) || this.$t('dashboard.indicator.publish.unpublishFailed'))
        }
      } catch (error) {
        this.$message.error(this.$t('dashboard.indicator.publish.unpublishFailed'))
      } finally {
        this.unpublishing = false
      }
    },

    // ===== Equity chart =====
    watchlistContextKey (item) {
      return marketContextKey(item)
    },
    filterWatchlistOption (input, option) {
      const val = (option.componentOptions.propsData.value || '').toLowerCase()
      if (val === '__add__') return true
      return val.includes(input.toLowerCase())
    },
    handleWatchlistChange (val) {
      if (val === '__add__') {
        this.showAddModal = true
        this.$nextTick(() => { this.selectedWatchlistKey = undefined })
        return
      }
      if (val) {
        const row = (this.watchlist || []).find(
          w => w && w.market && w.symbol && this.watchlistContextKey(w) === val
        )
        if (row) {
          this.market = String(row.market)
          this.symbol = String(row.symbol)
        } else {
          const i = val.indexOf(':')
          if (i > 0) {
            this.market = val.slice(0, i)
            this.symbol = val.slice(i + 1)
          }
        }
        this.qtSymbol = this.symbol
      } else {
        this.market = ''
        this.symbol = ''
      }
      this.persistIdeSelectionPreference()
    },
    getMarketColor (m) {
      const colors = { Crypto: 'orange', USStock: 'blue', CNStock: 'magenta', HKStock: 'red', Forex: 'green', Futures: 'purple' }
      return colors[m] || 'default'
    },
    marketLabel (m) {
      if (!m) return ''
      const key = 'dashboard.indicator.market.' + m
      const t = this.$t(key)
      return t !== key ? t : m
    },
    handleCryptoExchangeChange (value) {
      this.cryptoExchangeId = this.normalizeCryptoExchange(value)
      this.currentInstrumentId = ''
      this.persistCryptoMarketSource()
    },
    handleCryptoMarketTypeChange (value) {
      this.cryptoMarketType = normalizeMarketType(value, 'Crypto')
      this.currentInstrumentId = ''
      this.persistCryptoMarketSource()
    },

    normalizeCryptoExchange (value) {
      const normalized = normalizeExchangeId(value)
      return CRYPTO_EXCHANGE_IDS.includes(normalized) ? normalized : 'binance'
    },
    async initializeCryptoMarketSource () {
      try {
        const raw = storage.get(cryptoMarketSourceStorageKey(this.userId))
        const cached = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (cached && typeof cached === 'object') {
          const exchangeId = normalizeExchangeId(cached.exchangeId || cached.exchange_id)
          const marketType = normalizeMarketType(cached.marketType || cached.market_type, 'Crypto')
          if (CRYPTO_EXCHANGE_IDS.includes(exchangeId) && ['spot', 'swap'].includes(marketType)) {
            this.cryptoExchangeId = exchangeId
            this.cryptoMarketType = marketType
            return
          }
        }
      } catch (_) { /* ignore corrupt preference */ }

      let defaultExchange = 'binance'
      try {
        const res = await getPublicSettingsConfig()
        const value = res && res.code === 1 && res.data && res.data.ccxt_default_exchange
        defaultExchange = this.normalizeCryptoExchange(value)
      } catch (_) { /* keep fallback */ }
      this.cryptoExchangeId = defaultExchange
      this.cryptoMarketType = 'spot'
    },
    persistCryptoMarketSource () {
      if (!this.userId) return
      const exchangeId = this.normalizeCryptoExchange(this.cryptoExchangeId)
      const marketType = normalizeMarketType(this.cryptoMarketType, 'Crypto')
      this.cryptoExchangeId = exchangeId
      this.cryptoMarketType = marketType
      try {
        storage.set(cryptoMarketSourceStorageKey(this.userId), JSON.stringify({
          exchangeId,
          marketType
        }))
      } catch (_) { /* ignore quota */ }
    },

    // ===== Add symbol modal =====
    onAddMarketTabChange () {
      this.addSearchKeyword = ''
      this.addSearchResults = []
      this.addSelectedItem = null
      this.addSearched = false
    },
    onAddSourceChange () {
      this.persistCryptoMarketSource()
      this.addSearchResults = []
      this.addSelectedItem = null
      this.addSearched = false
      if (this.addSearchKeyword) this.doAddSearch()
    },
    onAddSearchInput () {
      clearTimeout(this.addSearchTimer)
      if (!this.addSearchKeyword) { this.addSearchResults = []; return }
      this.addSearchTimer = setTimeout(() => this.doAddSearch(), 400)
    },
    async doAddSearch () {
      if (!this.addSearchKeyword) return
      this.addSearching = true
      try {
        const res = await searchSymbols({
          market: this.addMarketTab,
          keyword: this.addSearchKeyword,
          limit: 20,
          exchange_id: this.addMarketTab === 'Crypto' ? this.cryptoExchangeId : undefined,
          market_type: this.addMarketTab === 'Crypto' ? this.cryptoMarketType : undefined
        })
        if (res && res.data && Array.isArray(res.data)) {
          this.addSearchResults = res.data
        } else {
          this.addSearchResults = []
        }
        this.addSearched = true
        if (this.addSearchResults.length === 0) {
          this.addSelectedItem = { market: this.addMarketTab, symbol: this.addSearchKeyword.trim().toUpperCase(), name: '' }
        }
      } catch (_) {
        this.addSelectedItem = { market: this.addMarketTab, symbol: this.addSearchKeyword.trim().toUpperCase(), name: '' }
      } finally {
        this.addSearching = false
      }
    },
    async handleAddStock () {
      const item = this.addSelectedItem
      if (!item || !item.symbol) {
        this.$message.warning(this.$t('backtest-center.config.symbolRequired'))
        return
      }
      this.addingStock = true
      try {
        const mkt = item.market || this.addMarketTab
        await addWatchlist({
          userid: this.userId,
          market: mkt,
          symbol: item.symbol,
          name: item.name || '',
          exchange_id: item.exchange_id || (mkt === 'Crypto' ? this.cryptoExchangeId : ''),
          market_type: item.market_type || (mkt === 'Crypto' ? this.cryptoMarketType : 'spot'),
          instrument_id: item.instrument_id || '',
          settle_currency: item.settle_currency || ''
        })
        this.$message.success(this.$t('backtest-center.config.addSuccess'))
        await this.loadWatchlist()
        this.selectedWatchlistKey = marketContextKey({
          market: mkt,
          symbol: item.symbol
        })
        this.market = mkt
        this.symbol = item.symbol
        this.showAddModal = false
      } catch (e) {
        this.$message.error(e.message || 'Failed')
      } finally {
        this.addingStock = false
      }
    }

  },
  watch: {
    activeIndicators: {
      deep: true,
      handler () {
        this.schedulePersistIdeUiState()
      }
    },
    market () {
      this.schedulePersistIdeUiState()
    },
    cryptoExchangeId () {
      this.ensureChartReady()
      this.schedulePersistIdeUiState()
    },
    cryptoMarketType () {
      this.ensureChartReady()
      this.schedulePersistIdeUiState()
    },
    selectedIndicatorId () {
      this.schedulePersistIdeUiState()
    },
    '$route.query.indicator_id' () {
      this.refreshIndicatorRouteSelection()
    },
    '$route.query.indicatorId' () {
      this.refreshIndicatorRouteSelection()
    },
    chartVisibleIndicatorIds: {
      deep: true,
      handler () {
        this.schedulePersistIdeUiState()
      }
    },
    selectedWatchlistKey () {
      this.schedulePersistIdeUiState()
    },
    selectedIndicatorIsPurchased () {
      this.$nextTick(() => this.applyCodeMirrorReadOnly())
    },
    selectedIndicatorCodeHidden (hidden) {
      if (hidden) this.resetAiWorkspaceState()
      this.$nextTick(() => this.applyCodeMirrorReadOnly())
    },
    isDarkTheme () {
      if (this.cmInstance) this.cmInstance.setOption('theme', this.isDarkTheme ? 'monokai' : 'eclipse')
    },
    '$i18n.locale' () {
      this.$nextTick(() => {
        this.ensureChartReady()
      })
    },
    codeDrawerVisible () {
      this.$nextTick(() => {
        if (this.cmInstance) this.cmInstance.refresh()
        this.ensureChartReady()
      })
    },
    quickTradeDrawerVisible () {
      this.$nextTick(() => this.ensureChartReady())
    },
    paramsPanelExpanded () {
      this.$nextTick(() => this.ensureChartReady())
    },
    symbol () {
      this.qtSymbol = this.symbol
      this.ensureChartReady()
      this.schedulePersistIdeUiState()
    },
    timeframe () {
      this.ensureChartReady()
      this.schedulePersistIdeUiState()
    },
    aiGenerating (val) {
      if (val) {
        this.ideAiTipIndex = 0
        this.ideAiTipTimer = setInterval(() => {
          this.ideAiTipIndex = (this.ideAiTipIndex + 1) % this.ideAiTips.length
        }, 3000)
      } else {
        if (this.ideAiTipTimer) {
          clearInterval(this.ideAiTipTimer)
          this.ideAiTipTimer = null
        }
      }
    }
  }
}
</script>

<style lang="less" scoped>
@primary-color: #1890ff;

.indicator-ide {
  display: flex;
  flex-direction: column;
  height: var(--ide-shell-height, calc(100vh - 64px));
  min-height: 0;
  max-height: var(--ide-shell-height, calc(100vh - 64px));
  width: 100%;
  padding: 0;
  overflow: hidden;
  background: #fff;
  box-sizing: border-box;
}

.chart-panel-toolbar-top-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.chart-panel-action-btn {
  height: 28px !important;
  padding: 0 12px !important;
  border-radius: 8px !important;
  display: inline-flex !important;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}
.chart-panel-convert-strategy-btn {
  min-width: 92px;
}
.chart-panel-signal-alert-btn {
  min-width: 78px;
  border-color: color-mix(in srgb, var(--primary-color, #1890ff) 36%, #d9d9d9) !important;
  color: var(--primary-color, @primary-color) !important;
  background: color-mix(in srgb, var(--primary-color, #1890ff) 9%, transparent) !important;
  em {
    min-width: 16px;
    height: 16px;
    line-height: 16px;
    border-radius: 999px;
    font-style: normal;
    font-size: 10px;
    text-align: center;
    color: #fff;
    background: var(--primary-color, @primary-color);
  }
  &:hover,
  &:focus {
    border-color: var(--primary-color, @primary-color) !important;
    color: var(--primary-color, @primary-color) !important;
  }
}
@media (max-width: 1180px) {
  .chart-panel-action-btn {
    width: 28px;
    min-width: 28px !important;
    padding: 0 !important;
    justify-content: center;

    span {
      display: none;
    }
  }
  .chart-panel-convert-strategy-btn {
    min-width: 28px;
  }
  .chart-panel-signal-alert-btn {
    min-width: 28px;
    em {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 14px;
      height: 14px;
      line-height: 14px;
      font-size: 9px;
    }
  }
}
.ide-toolbar-group {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  min-width: 0;
  padding: 6px 10px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.ide-toolbar-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  line-height: 1;
  white-space: nowrap;
}
.ide-toolbar-select {
  min-width: 0;
  ::v-deep .ant-select-selection {
    height: 30px;
    border-radius: 8px;
    border-color: #e2e8f0;
    box-shadow: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  ::v-deep .ant-select-selection__rendered {
    line-height: 28px;
  }
  ::v-deep .ant-select-selection:hover,
  ::v-deep .ant-select-focused .ant-select-selection {
    border-color: @primary-color;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.12);
  }
}
.ide-toolbar-select--watchlist {
  width: 220px;
  max-width: 36vw;
}
.ide-market-context-controls {
  display: flex;
  gap: 6px;
}
.ide-toolbar-select--exchange {
  width: 112px;
}
.ide-toolbar-select--market-type {
  width: 104px;
}
.ide-toolbar-select--indicator {
  width: 220px;
  max-width: 42vw;
}
.ide-indicator-multiselect-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  .ide-indicator-trigger-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 6px;
    font-size: 12px;
    text-align: left;
  }
}
.ide-toolbar-group--indicator {
  flex-wrap: wrap;
  align-items: center;
  row-gap: 6px;
}
.ide-toolbar-group--params {
  min-width: 96px;
}
.ide-param-trigger {
  height: 30px !important;
  border-radius: 8px !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  em {
    min-width: 18px;
    height: 18px;
    line-height: 18px;
    border-radius: 999px;
    font-style: normal;
    font-size: 11px;
    text-align: center;
    color: inherit;
    background: rgba(255, 255, 255, 0.22);
  }
  &.ant-btn-default em {
    color: var(--primary-color, @primary-color);
    background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent);
  }
}
.ide-signal-alert-modal {
  .ant-tabs-bar {
    margin-bottom: 14px;
    border-bottom-color: #edf0f5;
  }
  .ant-tabs-tab {
    font-weight: 700;
  }
  .ant-tabs-tab-active {
    color: var(--primary-color, @primary-color);
  }
  .ant-tabs-ink-bar {
    background: var(--primary-color, @primary-color);
  }
}
.signal-alert-current-card,
.signal-alert-block,
.signal-alert-field,
.signal-alert-task-card {
  border: 1px solid #e8edf3;
  border-radius: 10px;
  background: #fff;
}
.signal-alert-current-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 14px 16px;
  background:
    radial-gradient(circle at 10% 0%, color-mix(in srgb, var(--primary-color, #1890ff) 18%, transparent), transparent 38%),
    linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 8%, #fff), #fff);
  span {
    display: block;
    margin-bottom: 4px;
    color: #7a8596;
    font-size: 12px;
  }
  strong {
    display: block;
    max-width: 560px;
    overflow: hidden;
    color: #111827;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ant-tag {
    display: inline-flex;
    align-items: center;
    height: 28px;
    margin: 0;
    border-radius: 7px;
    font-weight: 700;
  }
  .signal-alert-source-tag--hidden {
    color: #7a4b00;
    background: #fff3bf;
    border-color: #d99a00;
  }
  .signal-alert-source-tag--visible {
    color: #135f31;
    background: #d9f7e5;
    border-color: #43a66b;
  }
}
.signal-alert-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px;
  gap: 10px;
  margin-bottom: 12px;
}
.signal-alert-field {
  min-width: 0;
  padding: 10px 12px;
  label {
    display: block;
    margin-bottom: 7px;
    color: #475569;
    font-size: 12px;
    font-weight: 700;
  }
  .ant-select {
    width: 100%;
  }
}
.signal-alert-block {
  margin-bottom: 12px;
  padding: 13px 14px;
}
.signal-alert-block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
  strong {
    color: #111827;
    font-size: 14px;
  }
  span {
    color: #7a8596;
    font-size: 12px;
    line-height: 1.5;
    text-align: right;
  }
}
.signal-alert-check-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
  width: 100%;
  .ant-checkbox-wrapper {
    margin: 0;
    overflow: hidden;
    color: #334155;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.signal-alert-channel-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  .ant-checkbox-wrapper {
    margin: 0;
    color: #334155;
    font-weight: 700;
  }
}
.signal-alert-target-row {
  margin-top: 10px;
  .ant-input {
    height: 34px;
    padding-top: 5px;
    padding-bottom: 5px;
  }
}
.signal-alert-target-row--split {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 8px;
}
.signal-alert-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 2px;
}
.signal-alert-task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 440px;
  overflow: auto;
  padding-right: 4px;
}
.signal-alert-task-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 13px 14px;
  transition: border-color 0.18s ease, background 0.18s ease;
  &.paused {
    opacity: 0.78;
  }
}
.signal-alert-task-card__main {
  min-width: 0;
}
.signal-alert-task-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  strong {
    max-width: 420px;
    overflow: hidden;
    color: #111827;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.signal-alert-task-card__meta,
.signal-alert-task-card__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  color: #7a8596;
  font-size: 12px;
}
.signal-alert-task-card__meta {
  margin-bottom: 6px;
  .danger {
    color: #ef4444;
  }
}
.signal-alert-task-card__actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

@media (max-width: 860px) {
  .signal-alert-form-grid,
  .signal-alert-target-row--split {
    grid-template-columns: 1fr;
  }
  .signal-alert-check-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .signal-alert-task-card {
    align-items: stretch;
    flex-direction: column;
  }
}

.ide-signal-alert-modal-wrap.ide-modal-wrap--dark,
body.dark .ide-signal-alert-modal-wrap {
  .ant-modal-content {
    background: #141414;
    box-shadow: 0 18px 56px rgba(0, 0, 0, 0.62);
  }
  .ant-modal-header {
    background: #1f1f1f;
    border-bottom-color: #303030;
  }
  .ant-modal-title,
  .ant-modal-close {
    color: rgba(255, 255, 255, 0.88);
  }
  .ant-modal-body {
    background: #141414;
    color: rgba(255, 255, 255, 0.82);
  }
  .ide-signal-alert-modal {
    .ant-tabs-bar {
      border-bottom-color: #303030;
    }
    .ant-tabs-tab {
      color: rgba(255, 255, 255, 0.58);
    }
    .ant-tabs-tab-active {
      color: var(--primary-color, #ff4d4f);
    }
  }
  .signal-alert-current-card {
    background:
      radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--primary-color, #ff4d4f) 24%, transparent), transparent 40%),
      linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #ff4d4f) 12%, #202020), #171717);
    border-color: color-mix(in srgb, var(--primary-color, #ff4d4f) 30%, #303030);
    span {
      color: rgba(255, 255, 255, 0.5);
    }
    strong {
      color: rgba(255, 255, 255, 0.92);
    }
    .signal-alert-source-tag--hidden {
      color: #ffd666;
      background: rgba(217, 154, 0, 0.2);
      border-color: rgba(255, 214, 102, 0.62);
    }
    .signal-alert-source-tag--visible {
      color: #73d89a;
      background: rgba(67, 166, 107, 0.18);
      border-color: rgba(115, 216, 154, 0.56);
    }
  }
  .signal-alert-block,
  .signal-alert-field,
  .signal-alert-task-card {
    background: #1f1f1f;
    border-color: #303030;
  }
  .signal-alert-field label,
  .signal-alert-block__head strong,
  .signal-alert-task-card__title strong {
    color: rgba(255, 255, 255, 0.88);
  }
  .signal-alert-block__head span,
  .signal-alert-task-card__meta,
  .signal-alert-task-card__chips {
    color: rgba(255, 255, 255, 0.5);
  }
  .signal-alert-check-grid .ant-checkbox-wrapper,
  .signal-alert-channel-row .ant-checkbox-wrapper {
    color: rgba(255, 255, 255, 0.76);
  }
  .ant-input,
  .ant-select-selection {
    background: #151515;
    border-color: #383838;
    color: rgba(255, 255, 255, 0.86);
  }
  .ant-select-arrow,
  .ant-select-selection__placeholder,
  .ant-input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  .ant-btn:not(.ant-btn-primary):not(.ant-btn-dangerous) {
    background: #1f1f1f;
    border-color: #3a3a3a;
    color: rgba(255, 255, 255, 0.72);
    &:hover,
    &:focus {
      border-color: var(--primary-color, #ff4d4f);
      color: var(--primary-color, #ff4d4f);
    }
  }
  .ant-empty-description {
    color: rgba(255, 255, 255, 0.45);
  }
}
.ide-purchased-hint {
  margin: 0 0 10px 0;
  border-radius: 8px;
}
.ide-watchlist-add-row {
  text-align: center;
  color: @primary-color;
  font-weight: 500;
}
.tf-group {
  flex-shrink: 0;
  ::v-deep .ant-radio-button-wrapper {
    padding: 0 9px;
    font-size: 12px;
    height: 30px;
    line-height: 28px;
    border-color: #e2e8f0;
    color: #475569;
  }
  ::v-deep .ant-radio-button-wrapper:first-child {
    border-radius: 8px 0 0 8px;
  }
  ::v-deep .ant-radio-button-wrapper:last-child {
    border-radius: 0 8px 8px 0;
  }
}
.ide-tf-seg {
  ::v-deep .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
    background: linear-gradient(135deg, var(--primary-color, #1890ff) 0%, var(--primary-color-active, #096dd9) 100%);
    border-color: var(--primary-color-active, #096dd9) !important;
    color: #fff !important;
    box-shadow: 0 1px 4px rgba(24, 144, 255, 0.35);
    z-index: 1;
  }
}

// ===== Main =====
.ide-main { display: flex; flex: 1 1 auto; overflow: hidden; min-height: 0; align-items: stretch; }

.ide-code-rail {
  flex: 0 0 34px;
  width: 34px;
  min-width: 34px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 12px 0;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  border-right: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  color: #475569;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
  box-shadow: 2px 0 8px rgba(15, 23, 42, 0.04);
  &:hover {
    background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color, #1890ff) 10%, #fff) 0%, color-mix(in srgb, var(--primary-color, #1890ff) 16%, #fff) 100%);
    color: var(--primary-color, @primary-color);
    box-shadow: 2px 0 12px color-mix(in srgb, var(--primary-color, #1890ff) 14%, transparent);
  }
  &:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--primary-color-ring, color-mix(in srgb, var(--primary-color, #1890ff) 35%, transparent));
  }
  &.is-open {
    background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color, #1890ff) 12%, #fff) 0%, color-mix(in srgb, var(--primary-color, #1890ff) 20%, #fff) 100%);
    color: var(--primary-color, @primary-color);
    box-shadow: inset -2px 0 0 var(--primary-color, @primary-color);
  }
}
.ide-code-rail__icon {
  font-size: 16px;
  color: var(--primary-color, @primary-color);
}
.ide-code-rail__arrow {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 12px;
  color: #64748b;
  background: rgba(15, 23, 42, 0.05);
  transition: color 0.2s, background 0.2s, transform 0.2s;
}
.ide-code-rail:hover .ide-code-rail__arrow,
.ide-code-rail.is-open .ide-code-rail__arrow {
  color: var(--primary-color, @primary-color);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 14%, transparent);
}
.ide-code-rail__label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.2;
  max-height: 120px;
  overflow: hidden;
}

.ide-left {
  width: 38%;
  min-width: 420px;
  max-width: 600px;
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid #eee;
  overflow: hidden;
  flex-shrink: 0;
  background: #fcfcfd;
  position: sticky;
  top: 0;
  align-self: flex-start;
  &.ide-panel--fullscreen {
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
    height: 100vh !important;
    max-height: 100vh !important;
    position: relative;
    top: auto;
    align-self: stretch;
    border-right: none;
  }
}

// ===== Code Panel =====
.code-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  &.collapsed { flex: 0 0 auto; }
}
.code-panel-body {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  &.is-resizing { user-select: none; }
}
.code-editor-section {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 180px;
  max-height: calc(100% - 250px);
  overflow: hidden;
}
.code-editor-wrapper { flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.code-hidden-mask {
  position: absolute;
  inset: 0;
  z-index: 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px;
  text-align: center;
  color: rgba(15, 23, 42, 0.76);
  background:
    radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--primary-color, #52c41a) 14%, transparent), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92)),
    repeating-linear-gradient(45deg, rgba(15, 23, 42, 0.035) 0 8px, rgba(15, 23, 42, 0.01) 8px 16px);
  backdrop-filter: blur(4px);
  .anticon {
    width: 42px;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--primary-color, #52c41a);
    background: color-mix(in srgb, var(--primary-color, #52c41a) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--primary-color, #52c41a) 36%, transparent);
    box-shadow: 0 0 0 8px color-mix(in srgb, var(--primary-color, #52c41a) 6%, transparent);
    font-size: 20px;
  }
  strong {
    font-size: 15px;
    color: rgba(15, 23, 42, 0.88);
  }
  span {
    max-width: 280px;
    font-size: 12px;
    line-height: 1.7;
    color: rgba(71, 85, 105, 0.78);
  }
}

// ===== AI Loading Overlay on code editor =====
.code-ai-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(3px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.code-ai-overlay-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-color, #1890ff);
}
.code-ai-overlay-dots {
  display: flex; gap: 4px;
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary-color, #1890ff); animation: ide-dot-bounce 1.4s ease-in-out infinite; }
  .dot1 { animation-delay: 0s; }
  .dot2 { animation-delay: 0.2s; }
  .dot3 { animation-delay: 0.4s; }
}
.code-ai-overlay-tip {
  font-size: 11px;
  color: #8c8c8c;
  max-width: 220px;
  text-align: center;
  animation: tip-fade 3s ease-in-out infinite;
}
@keyframes ide-dot-bounce {
  0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}
@keyframes tip-fade {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter, .fade-leave-to { opacity: 0; }

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  user-select: none;
  transition: background 0.15s;
  &:hover { background: #f5f7fa; }
}
.panel-title__leading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 0 0 auto;
  overflow: hidden;
}
.panel-title__trailing {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  justify-content: flex-end;
}
.panel-title-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}
.panel-title-icon-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex-wrap: wrap;
  ::v-deep .ant-btn-sm {
    width: 26px;
    min-width: 26px;
    height: 26px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 13px;
    border-color: #e0e0e0;
    &:hover { border-color: @primary-color; color: @primary-color; }
    &[disabled] { opacity: 0.35; }
  }
}
.panel-title-actions ::v-deep .ide-save-button {
  flex: 0 0 auto;
  min-width: 54px;
  height: 26px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}
.code-version-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #64748b;
  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.code-version-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.code-version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}
.code-version-item__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  strong { color: #0f172a; }
  span, small {
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.code-version-item__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.code-version-preview {
  margin-top: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  background: #0f172a;
}
.code-version-preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  strong { color: #0f172a; }
}
.code-version-preview pre {
  max-height: 360px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.55;
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  white-space: pre;
}
.ide-param-drawer {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
}
.ide-param-drawer__hero {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background:
    radial-gradient(circle at 14% 10%, color-mix(in srgb, var(--primary-color, #1890ff) 16%, transparent), transparent 34%),
    linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 8%, #fff), #fff);
  border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 18%, #e5e7eb);
  span {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    color: #64748b;
  }
  strong {
    display: block;
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #111827;
  }
}
.ide-param-boundary {
  border-radius: 8px;
}
.ide-param-empty {
  margin: 32px 0;
}
.ide-param-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 68px;
}
.ide-param-item {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.ide-param-item__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  strong {
    display: block;
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #111827;
    font-size: 13px;
  }
  code {
    display: inline-block;
    margin-top: 3px;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 11px;
    color: var(--primary-color, @primary-color);
    background: color-mix(in srgb, var(--primary-color, #1890ff) 10%, transparent);
  }
}
.ide-param-item__desc {
  margin: 0 0 10px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}
.ide-param-item__control {
  width: 100%;
}
.ide-param-item__meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  color: #94a3b8;
  font-size: 11px;
  b {
    color: #475569;
    font-weight: 700;
  }
}
.ide-param-drawer__footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin: auto -24px -24px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.94);
  border-top: 1px solid #e5e7eb;
  backdrop-filter: blur(10px);
}
.ide-guide-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 5px 12px;
  font-size: 11px;
  color: #8c8c8c;
  background: #f8f9fb;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.ide-guide-copy,
.ide-guide-actions {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
}
.ide-guide-copy {
  overflow: hidden;
  > .anticon { flex: 0 0 auto; color: #bfbfbf; font-size: 12px; }
  > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
.ide-guide-actions { flex: 0 0 auto; }
.code-quality-top-button {
  display: inline-flex !important;
  align-items: center;
  gap: 4px;
  height: 24px !important;
  padding: 0 8px !important;
  border-radius: 8px !important;
  color: #475569 !important;
  font-size: 10px !important;
}
.code-quality-top-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 190px;
  height: 22px;
  padding: 0 7px;
  overflow: hidden;
  border: 1px solid #d9d9d9;
  border-radius: 999px;
  font-size: 10px;
  white-space: nowrap;
  cursor: help;
  > span { overflow: hidden; text-overflow: ellipsis; }
}
.code-quality-top-status--success { color: #389e0d; border-color: #b7eb8f; background: #f6ffed; }
.code-quality-top-status--error { color: #cf1322; border-color: #ffa39e; background: #fff1f0; }
.code-quality-top-status--warn { color: #d46b08; border-color: #ffd591; background: #fff7e6; }
.code-quality-top-status--info { color: #096dd9; border-color: #91d5ff; background: #e6f7ff; }
.code-quality-popover-list {
  max-width: 420px;
  margin: 0;
  padding-left: 18px;
  font-size: 11px;
  line-height: 1.6;
  li + li { margin-top: 4px; }
}
.ide-guide-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--primary-color, #1890ff);
  background: rgba(24, 144, 255, 0.06);
  border: 1px solid rgba(24, 144, 255, 0.2);
  border-radius: 10px;
  text-decoration: none;
  transition: all 0.2s;
  white-space: nowrap;
  &:hover {
    color: #fff;
    background: var(--primary-color, #1890ff);
    border-color: var(--primary-color, #1890ff);
  }
}

.code-ai-resizer {
  position: relative;
  z-index: 4;
  flex: 0 0 10px;
  width: 100%;
  padding: 0;
  border: 0;
  border-top: 1px solid #edf0f4;
  border-bottom: 1px solid #edf0f4;
  outline: none;
  background: #f8fafc;
  cursor: row-resize;
  transition: border-color 0.15s, background 0.15s;
  &:hover,
  &:focus,
  .is-resizing & {
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 42%, #dbe3ec);
    background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, #fff);
  }
}
.code-ai-resizer__grip {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 38px;
  height: 3px;
  border-radius: 999px;
  background: #cbd5e1;
  transform: translate(-50%, -50%);
  box-shadow: 0 -3px 0 rgba(203, 213, 225, 0.55), 0 3px 0 rgba(203, 213, 225, 0.55);
}
.ai-workspace-section {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 240px;
  overflow: hidden;
  background: #fafbfc;
}

// ===== Code Editor Scrollbar =====
.code-editor-area {
  flex: 1;
  overflow: auto;
  &::-webkit-scrollbar { width: 5px; height: 5px; }
  &::-webkit-scrollbar-thumb { background: #d0d0d0; border-radius: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
  ::v-deep .CodeMirror {
    height: 100%;
    font-size: 12px;
    font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
    line-height: 1.55;
  }
  ::v-deep .CodeMirror-vscrollbar,
  ::v-deep .CodeMirror-hscrollbar {
    &::-webkit-scrollbar { width: 5px; height: 5px; }
    &::-webkit-scrollbar-thumb { background: #c8c8c8; border-radius: 3px; }
    &::-webkit-scrollbar-track { background: transparent; }
  }
}

// ===== AI Panel =====
.ai-gen-panel {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.ai-gen-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
  &:hover { background: #f5f7fa; }
}
.ai-gen-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 8px 10px 10px;
  overflow: hidden;
  background: #fafbfc;
}
.ai-memory-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 999px;
  color: #389e0d;
  background: #f6ffed;
  border: 1px solid #d9f7be;
  font-size: 10px;
  font-weight: 500;
}
.ai-clear-button { height: 20px !important; padding: 0 3px !important; font-size: 10px !important; }
.ai-conversation {
  flex: 1 1 auto;
  height: auto;
  min-height: 120px;
  max-height: none;
  padding: 10px;
  overflow-y: auto;
  resize: none;
  border: 1px solid #e5e9f0;
  border-radius: 10px;
  background: #fff;
  scrollbar-width: thin;
}
.ai-workspace-loading,
.ai-conversation-empty,
.ai-workspace-blocked {
  min-height: 112px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #8491a5;
  text-align: center;
  font-size: 11px;
}
.ai-conversation-empty > .anticon,
.ai-workspace-blocked > .anticon { font-size: 22px; color: var(--primary-color, #52c41a); }
.ai-conversation-empty strong { color: #25324a; font-size: 12px; }
.ai-quick-prompts { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; margin-top: 4px; }
.ai-quick-prompts button {
  padding: 3px 7px;
  border: 1px solid #dce3ec;
  border-radius: 999px;
  color: #526079;
  background: #fff;
  font-size: 10px;
  cursor: pointer;
  &:hover { color: var(--primary-color, #52c41a); border-color: var(--primary-color, #52c41a); }
}
.ai-message { max-width: 92%; margin-bottom: 10px; }
.ai-message--user { margin-left: auto; }
.ai-message__role { margin: 0 4px 3px; color: #96a0b2; font-size: 9px; }
.ai-message--user .ai-message__role { text-align: right; }
.ai-message__content {
  padding: 8px 10px;
  border-radius: 10px 10px 10px 3px;
  color: #354056;
  background: #f1f4f8;
  font-size: 11px;
  line-height: 1.55;
  white-space: normal;
  word-break: break-word;
}
.ai-message__content ::v-deep p { margin: 0 0 7px; }
.ai-message__content ::v-deep p:last-child { margin-bottom: 0; }
.ai-message__content ::v-deep h3,
.ai-message__content ::v-deep h4,
.ai-message__content ::v-deep h5 { margin: 9px 0 4px; color: inherit; font-size: 12px; line-height: 1.45; }
.ai-message__content ::v-deep ul,
.ai-message__content ::v-deep ol { margin: 5px 0 7px; padding-left: 19px; }
.ai-message__content ::v-deep li { margin: 2px 0; }
.ai-message__content ::v-deep blockquote { margin: 7px 0; padding: 5px 8px; border-left: 3px solid var(--primary-color, #52c41a); color: #68758a; background: rgba(82, 196, 26, 0.06); }
.ai-message__content ::v-deep hr { margin: 7px 0; border: 0; border-top: 1px solid rgba(127, 140, 160, 0.2); }
.ai-message__content ::v-deep code {
  padding: 1px 4px;
  border-radius: 4px;
  color: #d46b08;
  background: rgba(250, 140, 22, 0.1);
  font-family: 'Fira Code', Consolas, monospace;
  font-size: 10px;
}
.ai-message__content ::v-deep .qd-markdown-code {
  margin: 6px 0;
  padding: 8px;
  overflow-x: auto;
  border-radius: 6px;
  color: #d9e2f1;
  background: #1f2430;
  font: 10px/1.5 'Fira Code', Consolas, monospace;
  white-space: pre;
}
.ai-message__content ::v-deep .qd-markdown-code code { padding: 0; color: inherit; background: transparent; }
.ai-message__content ::v-deep a { color: #1677ff; text-decoration: underline; }
.ai-message__content ::v-deep .qd-markdown-table-wrap { max-width: 100%; margin: 7px 0; overflow-x: auto; }
.ai-message__content ::v-deep .qd-markdown-table { width: 100%; border-collapse: collapse; font-size: 10px; }
.ai-message__content ::v-deep .qd-markdown-table th,
.ai-message__content ::v-deep .qd-markdown-table td { padding: 5px 6px; border: 1px solid rgba(127, 140, 160, 0.22); text-align: left; }
.ai-message--user .ai-message__content {
  border-radius: 10px 10px 3px 10px;
  color: #24570f;
  background: #f0f9eb;
  border: 1px solid #d9f7be;
}
.ai-message--has-candidate .ai-message__content {
  border-radius: 10px 10px 0 0;
}
.ai-message--thinking { opacity: 0.75; }
.ai-message__badge {
  display: inline-flex;
  align-items: center;
  margin-left: 5px;
  padding: 1px 5px;
  border-radius: 999px;
  color: #1677ff;
  background: #e6f4ff;
  font-size: 8px;
  font-weight: 500;
}
.ai-message__badge--candidate { color: #389e0d; background: #f6ffed; }
.ai-message-candidate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid #d9f7be;
  border-radius: 0 0 10px 3px;
  background: #f6ffed;
}
.ai-message-candidate--warning { border-color: #ffd591; background: #fff7e6; }
.ai-message-candidate__status { display: flex; align-items: center; gap: 6px; color: #389e0d; font-size: 9px; }
.ai-message-candidate--warning .ai-message-candidate__status { color: #d46b08; }
.ai-candidate-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.ai-candidate-actions .ant-btn { font-size: 10px; padding: 0 7px; }
.ai-composer { margin-top: 8px; }
.ai-composer ::v-deep .ai-prompt-input textarea {
  min-height: 76px;
  max-height: 150px;
  padding: 8px 10px;
  resize: vertical;
  line-height: 1.45;
}
.ai-composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
}
.ai-composer-shortcut {
  min-width: 0;
  color: #9aa4b3;
  font-size: 9px;
  line-height: 1.4;
}
.ai-composer-send {
  width: auto;
  min-width: 116px;
  height: 40px;
  padding: 0 24px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 2px 7px rgba(82, 196, 26, 0.22);
}
.ai-helper-tip {
  margin-top: 5px;
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.5;
}
.ai-preview-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; color: #718096; font-size: 12px; }
.ai-candidate-code-preview {
  max-height: 62vh;
  margin: 0;
  padding: 14px;
  overflow: auto;
  border-radius: 8px;
  color: #d4d4d4;
  background: #1e1e1e;
  font: 12px/1.55 'Fira Code', 'Consolas', monospace;
  white-space: pre;
}
.ai-helper-links {
  margin-top: 6px;
  font-size: 11px;
}

.quality-hint--error { color: #cf1322; }
.quality-hint--warn { color: #d46b08; }
.quality-hint--info { color: var(--primary-color-active, #096dd9); }

.ai-debug-card {
  flex: 0 1 auto;
  max-height: 38%;
  margin: 10px 10px 0;
  padding: 0;
  border: 1px solid #e6f4ff;
  border-radius: 10px;
  background: #fff;
  overflow: auto;
  font-size: 12px;
}
.ai-debug-card--success { border-color: #b7eb8f; }
.ai-debug-card--warning { border-color: #ffd591; }

.ai-debug-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.06) 0%, transparent 100%);
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.ai-debug-card--success .ai-debug-card__header {
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.06) 0%, transparent 100%);
}
.ai-debug-card--warning .ai-debug-card__header {
  background: linear-gradient(135deg, rgba(250, 140, 22, 0.06) 0%, transparent 100%);
}

.ai-debug-card__badge {
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 7px; flex-shrink: 0; font-size: 13px;
  background: rgba(24, 144, 255, 0.1); color: var(--primary-color, #1890ff);
}
.ai-debug-card--success .ai-debug-card__badge { background: rgba(82, 196, 26, 0.1); color: #389e0d; }
.ai-debug-card--warning .ai-debug-card__badge { background: rgba(250, 140, 22, 0.1); color: #d46b08; }

.ai-debug-card__headline {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px;
}
.ai-debug-card__tag {
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
  color: var(--primary-color, #1890ff); white-space: nowrap;
}
.ai-debug-card--success .ai-debug-card__tag { color: #389e0d; }
.ai-debug-card--warning .ai-debug-card__tag { color: #d46b08; }

.ai-debug-card__title {
  font-size: 12px; font-weight: 600; color: #262626;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ai-debug-card__dismiss {
  flex-shrink: 0; cursor: pointer; font-size: 12px; color: #bfbfbf;
  padding: 2px; border-radius: 4px; transition: all 0.15s;
  &:hover { color: #595959; background: rgba(0,0,0,0.04); }
}

.ai-debug-card__chips {
  display: flex; flex-wrap: wrap; gap: 5px; padding: 8px 10px 0;
}
.ai-debug-chip {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;
  background: rgba(24, 144, 255, 0.08); color: var(--primary-color, #1890ff);
}
.ai-debug-chip--success { background: rgba(82, 196, 26, 0.08); color: #389e0d; }
.ai-debug-chip--warning { background: rgba(250, 140, 22, 0.08); color: #d46b08; }
.ai-debug-chip--info { background: rgba(24, 144, 255, 0.08); color: var(--primary-color, #1890ff); }

.ai-debug-card__body {
  padding: 8px 10px 0; line-height: 1.6; color: #595959;
}

.ai-debug-card__group {
  padding: 6px 10px;
  &:last-child { padding-bottom: 10px; }
}
.ai-debug-card__group-label {
  font-size: 11px; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;
  color: #389e0d;
}
.ai-debug-card__group--remaining .ai-debug-card__group-label { color: #d46b08; }

.ai-debug-card__item {
  display: flex; align-items: baseline; gap: 6px;
  padding: 2px 0; font-size: 11px; line-height: 1.5; color: #595959;
}
.ai-debug-card__bullet {
  width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; margin-top: 5px;
}
.ai-debug-card__bullet--green { background: #52c41a; }
.ai-debug-card__bullet--orange { background: #fa8c16; }

// ===== Params =====
.params-scroll {
  flex: none;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: visible;
  padding: 10px 12px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #d9d9d9; border-radius: 2px; }
}
.params-scroll--right { padding: 12px 16px 10px; min-width: 0; }

.param-section {
  margin-bottom: 0;
  padding: 12px 12px 12px;
  border-bottom: none;
  border-radius: 10px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  min-width: 0;
  min-height: 0;
  height: auto;
  max-height: none;
  overflow: hidden;
  ::v-deep .ant-row {
    align-items: flex-start;
  }
}

.params-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.params-row-three {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
  min-width: 0;
  align-items: stretch;
}
.params-row-three > .param-section--top {
  align-self: stretch;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.params-row-full {
  width: 100%;
  min-width: 0;
  flex: 0 0 auto;
  box-sizing: border-box;
}
.strict-mode-card {
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 10px;
  border: 1px solid rgba(250, 140, 22, 0.22);
  background: linear-gradient(165deg, #fffaf5 0%, #fff 100%);
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  &--on {
    border-color: rgba(24, 144, 255, 0.28);
    background: linear-gradient(165deg, #f4f9ff 0%, #fff 100%);
    box-shadow: inset 0 0 0 1px rgba(24, 144, 255, 0.06);
  }
}
.strict-mode-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}
.strict-mode-card__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
  ::v-deep .ant-tag {
    margin: 0;
    line-height: 18px;
    font-size: 10px;
    border-radius: 4px;
  }
}
.strict-mode-card__hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
  color: #64748b;
}
.strict-mode-direction {
  .param-label {
    margin-bottom: 6px;
  }
}

.direction-radio-group {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  min-width: 0;
  ::v-deep .ant-radio-button-wrapper {
    flex: none !important;
    min-width: 0 !important;
    text-align: center;
    height: auto;
    min-height: 34px;
    line-height: 1.25;
    padding: 6px 4px !important;
    font-size: 11px;
    font-weight: 500;
    border-radius: 8px !important;
    border: 1px solid #e8e8e8 !important;
    background: #fafafa;
    color: #8c8c8c;
    transition: all 0.2s ease;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-left: 0 !important;
    &::before { display: none !important; }
    &:hover {
      color: #595959;
      border-color: #d0d0d0 !important;
    }
    .anticon { margin-right: 3px; }
  }
  ::v-deep .ant-radio-button-wrapper-checked {
    color: #fff !important;
    border-color: transparent !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
    &[value="long"],
    &:nth-child(1) {
      background: linear-gradient(135deg, #52c41a, #73d13d) !important;
    }
    &[value="short"],
    &:nth-child(2) {
      background: linear-gradient(135deg, #f5222d, #ff4d4f) !important;
    }
    &[value="both"],
    &:nth-child(3) {
      background: linear-gradient(135deg, var(--primary-color, #1890ff), var(--primary-color-hover, #40a9ff)) !important;
    }
  }
}
.param-strategy-hint {
  margin-top: 10px;
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.5;
}
.strategy-directive-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  padding: 3px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: rgba(24, 144, 255, 0.06); }
  &.is-set { color: #1f2937; }
}
.strategy-directive-label {
  color: #6b7280;
  margin-right: 8px;
  white-space: nowrap;
}
.strategy-directive-value {
  font-weight: 600;
  color: #1f2937;
  font-variant-numeric: tabular-nums;
  &.is-empty { color: #bfbfbf; font-weight: 400; font-style: italic; }
}
.param-label {
  font-size: 11px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 8px;
  letter-spacing: 0.02em;
}
.field-label { font-size: 11px; color: #64748b; margin-bottom: 4px; font-weight: 600; }
.date-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  ::v-deep .ant-btn-sm {
    border-radius: 999px;
    padding: 0 12px;
    height: 28px;
    font-size: 12px;
    font-weight: 600;
    border-color: #e2e8f0;
    color: #475569;
  }
  ::v-deep .ant-btn-primary.ant-btn-sm {
    border-color: transparent;
    background: linear-gradient(135deg, var(--primary-color, #1890ff) 0%, var(--primary-color-active, #096dd9) 100%);
    box-shadow: 0 2px 6px rgba(24, 144, 255, 0.28);
  }
}

@media (max-width: 360px) {
  .direction-radio-group {
    grid-template-columns: 1fr;
  }
}

// ===== Right Panel =====
.ide-right {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.ide-right--workspace {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  align-self: stretch;
  flex: 1 1 0;
  height: 100%;
  max-height: 100%;
}
.ide-workspace-pane--chart {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.ide-quick-bottom {
  width: 100%;
  flex: 0 0 clamp(320px, 34vh, 430px);
  display: flex;
  flex-direction: column;
  border-top: 1px solid #e8e8e8;
  background: #f8fafc;
  overflow: hidden;
  min-height: 0;
  box-shadow: 0 -10px 28px rgba(15, 23, 42, 0.08);
  transition: flex-basis 180ms ease;
}
.ide-quick-bottom--collapsed {
  flex-basis: 40px;
}
.ide-quick-panel-head {
  width: 100%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  border-left: 0;
  border-right: 0;
  border-top: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 160ms ease;
  &:hover {
    background: linear-gradient(180deg, #f8fff3 0%, #edf8e8 100%);
  }
  &:focus-visible {
    outline: 2px solid fade(@primary-color, 55%);
    outline-offset: -2px;
  }
}
.ide-quick-panel-head-copy {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}
.ide-quick-panel-head-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0.02em;
}
.ide-quick-panel-head-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}
.ide-quick-panel-head-icon {
  font-size: 16px;
  color: @primary-color;
}
.ide-quick-panel-toggle {
  width: 28px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 6px;
  color: #64748b;
  background: rgba(15, 23, 42, 0.05);
}
.ide-quick-panel-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 0 8px;
  ::v-deep .quick-trade-panel-root {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  ::v-deep .quick-trade-embedded {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }
  ::v-deep .qt-embedded-split--cols {
    padding-left: 12px;
    padding-right: 12px;
  }
}

.ide-chart-fs-root {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  align-self: stretch;
  position: relative;
  z-index: 3;
  &.ide-panel--fullscreen {
    height: 100vh !important;
    max-height: 100vh !important;
    overflow: visible !important;
    z-index: 5;
    .ide-chart-fs-row {
      flex: 1;
      min-height: 0;
      overflow: visible;
    }
    .chart-panel {
      overflow: visible;
    }
    .chart-panel-inner {
      overflow: hidden;
      flex: 1;
      min-height: 0;
    }
  }
}
.ide-chart-fs-row {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  align-items: stretch;
}
.ide-quick-bottom--chart-fs {
  width: 100%;
  max-width: none;
  align-self: stretch;
  overflow: hidden;
  position: relative;
  z-index: 2;
}
.chart-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
  .chart-panel-toolbar {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 10px 10px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
  }
  .chart-panel-toolbar-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 28px;
  }
  .chart-panel-toolbar-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 10px;
    min-width: 0;
    .ide-toolbar-group {
      flex: 0 1 auto;
      min-width: 0;
      min-height: 62px;
      box-sizing: border-box;
    }
    // Same fix as on the backtest tab: don't let the TF segmented control
    // grow past its 8-button natural width.
    .ide-toolbar-group--tf {
      flex: 0 0 auto;
      min-width: 0;
      max-width: 100%;
    }
    .ide-toolbar-group--indicator {
      flex: 1 1 240px;
      min-width: 200px;
      align-items: flex-start;
      .ide-toolbar-label {
        width: 100%;
        text-align: left;
        align-self: flex-start;
      }
      .ide-indicator-multiselect-trigger {
        width: 100%;
        max-width: none;
      }
    }
  }
  .chart-panel-watchlist-select {
    width: 100%;
    min-width: 260px;
    max-width: 380px;
  }
  .ide-tf-seg--chart {
    display: inline-flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    width: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 2px;
    ::v-deep .ant-radio-button-wrapper {
      flex-shrink: 0;
    }
  }
  .chart-panel-toolbar-title {
    font-size: 12px;
    font-weight: 600;
    color: #595959;
  }
  .chart-panel-fs-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .chart-panel-inner {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  ::v-deep .chart-left,
  ::v-deep .chart-wrapper,
  ::v-deep .chart-content-area,
  ::v-deep .kline-chart-container {
    height: 100% !important;
    min-height: 0 !important;
  }
  ::v-deep .chart-left {
    width: 100% !important;
    flex: 1 1 100% !important;
    border-right: none !important;
  }
}

.result-panel {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: visible;
  padding: 0 18px 0;
  position: relative;
  z-index: 1;
}
.params-card {
  flex-shrink: 0;
  flex-grow: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin: 12px 0 14px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
  overflow: hidden;
  min-height: 0;
}
.params-card-header,
.workbench-panel-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  background: linear-gradient(135deg, var(--primary-color-soft, rgba(24, 144, 255, 0.08)) 0%, color-mix(in srgb, var(--primary-color, @primary-color) 4%, #fff) 100%);
  border-bottom: 1px solid var(--primary-color-ring, rgba(15, 23, 42, 0.08));
  transition: background 0.15s;
  &:hover {
    background: linear-gradient(135deg, var(--primary-color-soft-strong, rgba(24, 144, 255, 0.12)) 0%, color-mix(in srgb, var(--primary-color, @primary-color) 6%, #fff) 100%);
  }
}
.workbench-panel-header {
  cursor: default;
}
.params-card-title,
.workbench-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  .anticon,
  ::v-deep .anticon {
    color: var(--primary-color, @primary-color);
    font-size: 15px;
  }
}
.workbench-panel-meta {
  min-width: 0;
  max-width: 58%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: #64748b;
}
.params-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  ::v-deep .ant-btn-sm {
    border-radius: 8px;
    font-weight: 600;
  }
  ::v-deep .ant-btn-primary.ant-btn-sm {
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.28);
  }
  > .anticon {
    font-size: 14px;
    color: rgba(0, 0, 0, 0.4);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: color 0.15s, background 0.15s;
    &:hover { color: var(--primary-color, #1890ff); background: var(--primary-color-soft, rgba(24, 144, 255, 0.08)); }
  }
}
.result-running {
  display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px; gap: 10px;
  .running-time { font-size: 24px; font-weight: 300; color: var(--primary-color, #1890ff); font-variant-numeric: tabular-nums; }
  .running-tip { font-size: 12px; color: #8c8c8c; }
}
.result-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px; gap: 10px;
  p { font-size: 12px; color: #8c8c8c; margin: 0; }
}
.result-data {
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(108px, 1fr));
    gap: 10px;
    margin-bottom: 16px;
  }
  .metric-card {
    background: linear-gradient(165deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 10px;
    padding: 12px 8px;
    text-align: center;
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px var(--primary-color-soft, rgba(24, 144, 255, 0.1));
      border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.22));
    }
    .metric-label { font-size: 10px; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.35px; font-weight: 600; }
    .metric-value { font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; color: #0f172a; line-height: 1.2; }
    &.positive .metric-value { color: #52c41a; }
    &.negative .metric-value { color: #f5222d; }
  }
}
.publish-form {
  .publish-hint {
    margin-top: 6px;
    font-size: 12px;
    color: #8c8c8c;
  }
}

.add-item-active { background: #e6f7ff !important; }

.date-presets ::v-deep .ant-btn-primary,
.date-presets ::v-deep .ant-btn-primary:hover,
.date-presets ::v-deep .ant-btn-primary:focus,
.date-presets ::v-deep .ant-btn-primary:active {
  color: #fff;
}

// ===== Watchlist option (selected value in toolbar) =====
::v-deep .wl-opt-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  padding: 0 4px;
  border-radius: 3px;
  color: #fff;
  margin-right: 4px;
  vertical-align: middle;
}
::v-deep .wl-mkt-crypto { background: #fa8c16; }
::v-deep .wl-mkt-usstock { background: var(--primary-color, #1890ff); }
::v-deep .wl-mkt-cnstock { background: #eb2f96; }
::v-deep .wl-mkt-hkstock { background: #f5222d; }
::v-deep .wl-mkt-forex { background: #52c41a; }
::v-deep .wl-mkt-futures { background: #722ed1; }
::v-deep .wl-opt-symbol { font-weight: 600; font-size: 12px; }
::v-deep .wl-opt-name { color: #8c8c8c; font-size: 10px; margin-left: 3px; }

// ===== Dark Theme =====
&.theme-dark {
  background: #141414;
  .ide-code-rail {
    border-right-color: #303030;
    background: linear-gradient(180deg, #1f1f1f 0%, #181818 100%);
    color: rgba(255, 255, 255, 0.5);
    box-shadow: 2px 0 14px rgba(0, 0, 0, 0.5);
    &:hover {
      background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color, #1890ff) 18%, #1f1f1f) 0%, color-mix(in srgb, var(--primary-color, #1890ff) 8%, #181818) 100%);
      color: var(--primary-color, #1890ff);
    }
    &:focus {
      box-shadow: inset 0 0 0 2px var(--primary-color-ring, color-mix(in srgb, var(--primary-color, #1890ff) 38%, transparent));
    }
  }
  .ide-code-rail__icon {
    color: var(--primary-color, #1890ff);
  }
  .ide-code-rail__arrow {
    color: rgba(255, 255, 255, 0.56);
    background: rgba(255, 255, 255, 0.06);
  }
  .ide-code-rail:hover .ide-code-rail__arrow,
  .ide-code-rail.is-open .ide-code-rail__arrow {
    color: var(--primary-color, #1890ff);
    background: color-mix(in srgb, var(--primary-color, #1890ff) 16%, transparent);
  }
  .code-hidden-mask {
    color: rgba(255, 255, 255, 0.9);
    background:
      radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--primary-color, #52c41a) 22%, transparent), transparent 34%),
      linear-gradient(135deg, rgba(5, 7, 10, 0.98), rgba(18, 20, 24, 0.97)),
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.035) 0 8px, rgba(255, 255, 255, 0.01) 8px 16px);
    .anticon {
      color: color-mix(in srgb, var(--primary-color, #52c41a) 72%, #fff);
      background: color-mix(in srgb, var(--primary-color, #52c41a) 22%, transparent);
      border-color: color-mix(in srgb, var(--primary-color, #52c41a) 48%, transparent);
    }
    strong {
      color: rgba(255, 255, 255, 0.96);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.72);
    }
    span {
      color: rgba(255, 255, 255, 0.76);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.62);
    }
  }
  .code-version-toolbar {
    color: rgba(255, 255, 255, 0.58);
  }
  .code-version-item {
    background: #1f1f1f;
    border-color: #303030;
  }
  .code-version-item__main {
    strong { color: rgba(255, 255, 255, 0.88); }
    span, small { color: rgba(255, 255, 255, 0.52); }
  }
  .code-version-preview {
    border-color: #303030;
  }
  .code-version-preview__head {
    background: #1f1f1f;
    border-color: #303030;
    strong { color: rgba(255, 255, 255, 0.88); }
  }
  .ide-param-drawer__hero {
    background:
      radial-gradient(circle at 14% 10%, color-mix(in srgb, var(--primary-color, #1890ff) 22%, transparent), transparent 34%),
      linear-gradient(135deg, #1f1f1f, #171717);
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 24%, #303030);
    span { color: rgba(255, 255, 255, 0.48); }
    strong { color: rgba(255, 255, 255, 0.9); }
  }
  .ide-param-item {
    background: #1f1f1f;
    border-color: #303030;
    box-shadow: none;
  }
  .ide-param-item__head strong {
    color: rgba(255, 255, 255, 0.88);
  }
  .ide-param-item__desc {
    color: rgba(255, 255, 255, 0.56);
  }
  .ide-param-item__meta {
    color: rgba(255, 255, 255, 0.42);
    b { color: rgba(255, 255, 255, 0.78); }
  }
  .ide-param-drawer__footer {
    background: rgba(20, 20, 20, 0.94);
    border-color: #303030;
  }
  .ide-param-trigger.ant-btn-default {
    background: #262626;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.82);
  }
  .ide-toolbar-group {
    background: rgba(255, 255, 255, 0.04);
    border-color: #363636;
    box-shadow: none;
  }
  .ide-toolbar-label { color: rgba(255, 255, 255, 0.45); }
  .tf-group ::v-deep .ant-radio-button-wrapper {
    background: #262626;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.65);
  }
  .ide-left { background: #181818; border-right-color: #303030; }
  .ai-gen-panel { border-top-color: #303030; }
  .ai-gen-header { color: rgba(255,255,255,0.82); &:hover { background: #202020; } }
  .ai-gen-body { background: #171717; }
  .ai-memory-badge { color: #95de64; background: rgba(82,196,26,0.12); border-color: rgba(82,196,26,0.28); }
  .ai-conversation { background: #1f1f1f; border-color: #363636; }
  .ai-conversation-empty strong { color: rgba(255,255,255,0.86); }
  .ai-quick-prompts button { color: rgba(255,255,255,0.65); background: #262626; border-color: #434343; }
  .ai-message__content { color: rgba(255,255,255,0.78); background: #2a2a2a; }
  .ai-message--user .ai-message__content { color: #b7eb8f; background: rgba(82,196,26,0.11); border-color: rgba(82,196,26,0.28); }
  .ai-message-candidate { background: rgba(82,196,26,0.09); border-color: rgba(82,196,26,0.34); }
  .ai-message-candidate--warning { background: rgba(250,140,22,0.09); border-color: rgba(250,140,22,0.34); }
  .ai-composer ::v-deep textarea { color: rgba(255,255,255,0.82); background: #222; border-color: #434343; }
  .ide-chart-fs-root {
    background: #141414;
    border-bottom-color: #303030;
  }
  .ide-quick-bottom--chart-fs {
    border-top-color: #303030;
  }
  .chart-panel {
    background: #141414;
    border-bottom-color: #303030;
    .chart-panel-toolbar {
      background: #1a1a1a;
      border-bottom-color: #303030;
    }
    .chart-panel-toolbar-title { color: rgba(255, 255, 255, 0.65); }
    .chart-panel-toolbar-controls .ide-toolbar-group {
      background: rgba(255, 255, 255, 0.04);
      border-color: #363636;
    }
    .chart-panel-toolbar-controls .ide-toolbar-label {
      color: rgba(255, 255, 255, 0.45);
    }
  }
  .ide-quick-bottom {
    background: #141414;
    border-top-color: #303030;
    box-shadow: 0 -10px 28px rgba(0, 0, 0, 0.32);
  }
  .ide-quick-panel-head {
    background: linear-gradient(180deg, #1f1f1f 0%, #1a1a1a 100%);
    border-bottom-color: #303030;
    &:hover {
      background: linear-gradient(180deg, #252b22 0%, #1d221b 100%);
    }
  }
  .ide-quick-panel-head-title {
    color: rgba(255, 255, 255, 0.92);
  }
  .ide-quick-panel-head-meta {
    color: rgba(255, 255, 255, 0.45);
  }
  .ide-quick-panel-head-icon {
    color: var(--primary-color, #1890ff);
  }
  .ide-quick-panel-toggle {
    color: rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.06);
  }
  .ide-quick-panel-body {
    ::v-deep .qt-embedded-split--cols .qt-embedded-col-right {
      border-top-color: #303030;
    }
  }
  .panel-title { color: rgba(255,255,255,0.85); border-bottom-color: #303030; &:hover { background: rgba(255,255,255,0.04); } }
  .ai-gen-panel { border-top-color: #303030; }
  .ai-gen-header { color: rgba(255,255,255,0.85); &:hover { background: rgba(255,255,255,0.04); } }
  .code-ai-overlay { background: rgba(20,20,20,0.82); }
  .code-ai-overlay-inner { color: var(--primary-color, #1890ff); }
  .code-ai-overlay-dots .dot { background: var(--primary-color, #1890ff); }
  .code-ai-overlay-tip { color: rgba(255,255,255,0.45); }
  .params-scroll { &::-webkit-scrollbar-thumb { background: #434343; } }
  .param-section { border-bottom-color: #303030; }
  .param-label { color: rgba(255,255,255,0.78); }
  .field-label { color: rgba(255,255,255,0.58); }
  .params-card {
    background: #1f1f1f;
    border-color: #303030;
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35);
  }
  .params-card-header,
  .workbench-panel-header {
    background: linear-gradient(135deg, var(--primary-color-soft, rgba(24, 144, 255, 0.12)) 0%, color-mix(in srgb, var(--primary-color, #1890ff) 4%, transparent) 100%);
    border-bottom-color: #303030;
    &:hover {
      background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 16%, transparent) 0%, color-mix(in srgb, var(--primary-color, #1890ff) 6%, transparent) 100%);
    }
  }
  .workbench-panel-header:hover {
    background: linear-gradient(135deg, var(--primary-color-soft, rgba(24, 144, 255, 0.12)) 0%, color-mix(in srgb, var(--primary-color, #1890ff) 4%, transparent) 100%);
  }
  .params-card-title,
  .workbench-panel-title {
    color: rgba(255,255,255,0.88);
    .anticon,
    ::v-deep .anticon {
      color: var(--primary-color, #1890ff);
    }
  }
  .workbench-panel-meta { color: rgba(255, 255, 255, 0.45); }
  .workbench-panel-body { background: #1a1a1a; }
  .param-section {
    background: #1a1a1a;
    border-color: #333;
    box-shadow: none;
  }
  .param-label { color: rgba(255, 255, 255, 0.78); }
  .date-presets ::v-deep .ant-btn-sm {
    border-color: #434343;
    color: rgba(255, 255, 255, 0.65);
    background: #262626;
  }
  .date-presets ::v-deep .ant-btn-primary,
  .date-presets ::v-deep .ant-btn-primary:hover,
  .date-presets ::v-deep .ant-btn-primary:focus,
  .date-presets ::v-deep .ant-btn-primary:active {
    color: #fff;
  }
  .params-card-actions > .anticon {
    color: rgba(255, 255, 255, 0.55);
    &:hover { color: rgba(255, 255, 255, 0.88); }
  }
  .param-strategy-hint { color: rgba(255, 255, 255, 0.45); }
      .strategy-directive-row {
    &:hover { background: var(--primary-color-soft, rgba(24, 144, 255, 0.12)); }
    &.is-set { color: rgba(255, 255, 255, 0.88); }
  }
  .strategy-directive-label { color: rgba(255, 255, 255, 0.55); }
  .strategy-directive-value {
    color: rgba(255, 255, 255, 0.92);
    &.is-empty { color: rgba(255, 255, 255, 0.35); }
  }
      .strict-mode-card {
    border-color: rgba(250, 140, 22, 0.28);
    background: linear-gradient(165deg, rgba(250, 140, 22, 0.08) 0%, #1f1f1f 100%);
    &--on {
      border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.35));
      background: linear-gradient(165deg, var(--primary-color-soft, rgba(24, 144, 255, 0.12)) 0%, #1f1f1f 100%);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color, #1890ff) 8%, transparent);
    }
  }
  .strict-mode-card__title { color: rgba(255, 255, 255, 0.88); }
  .strict-mode-card__hint { color: rgba(255, 255, 255, 0.55); }
  .direction-radio-group ::v-deep .ant-radio-button-wrapper {
    background: #262626;
    border-color: #434343 !important;
    color: rgba(255, 255, 255, 0.55);
    &:hover {
      color: rgba(255, 255, 255, 0.85);
      border-color: #555 !important;
    }
  }
  .ide-guide-bar {
    background: #1a1a1a;
    border-bottom-color: #303030;
    color: rgba(255, 255, 255, 0.45);
  }
  .ide-guide-copy > .anticon { color: rgba(255, 255, 255, 0.3); }
  .code-quality-top-button {
    border-color: #434343 !important;
    color: rgba(255,255,255,0.72) !important;
    background: #262626 !important;
  }
  .code-quality-top-status--success { color: #95de64; border-color: rgba(82,196,26,0.4); background: rgba(82,196,26,0.1); }
  .code-quality-top-status--error { color: #ff7875; border-color: rgba(255,77,79,0.4); background: rgba(255,77,79,0.1); }
  .code-quality-top-status--warn { color: #ffc069; border-color: rgba(250,140,22,0.4); background: rgba(250,140,22,0.1); }
  .code-quality-top-status--info { color: #69c0ff; border-color: rgba(24,144,255,0.4); background: rgba(24,144,255,0.1); }
  .ide-guide-link {
    color: var(--primary-color, #1890ff);
    background: var(--primary-color-soft, rgba(24, 144, 255, 0.1));
    border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.25));
    &:hover {
      color: #fff;
      background: var(--primary-color-active, #177ddc);
      border-color: var(--primary-color-active, #177ddc);
    }
  }
  .ai-helper-tip, .publish-form .publish-hint { color: rgba(255,255,255,0.45); }
  .code-ai-resizer { border-color: #303030; background: #1d1d1d; }
  .code-ai-resizer__grip { background: #595959; box-shadow: 0 -3px 0 rgba(89,89,89,0.55), 0 3px 0 rgba(89,89,89,0.55); }
  .ai-workspace-section { background: #171717; }
  .ai-debug-card {
    border-color: #303030; background: #1f1f1f;
  }
  .ai-debug-card--success { border-color: rgba(82, 196, 26, 0.25); }
  .ai-debug-card--warning { border-color: rgba(250, 140, 22, 0.3); }
  .ai-debug-card__header { background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 8%, transparent) 0%, transparent 100%); border-bottom-color: #303030; }
  .ai-debug-card--success .ai-debug-card__header { background: linear-gradient(135deg, rgba(82, 196, 26, 0.08) 0%, transparent 100%); }
  .ai-debug-card--warning .ai-debug-card__header { background: linear-gradient(135deg, rgba(250, 140, 22, 0.08) 0%, transparent 100%); }
  .ai-debug-card__badge { background: color-mix(in srgb, var(--primary-color, #1890ff) 15%, transparent); }
  .ai-debug-card--success .ai-debug-card__badge { background: rgba(82, 196, 26, 0.15); }
  .ai-debug-card--warning .ai-debug-card__badge { background: rgba(250, 140, 22, 0.15); }
  .ai-debug-card__title { color: rgba(255,255,255,0.9); }
  .ai-debug-card__dismiss { color: rgba(255,255,255,0.3); &:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.06); } }
  .ai-debug-chip { background: var(--primary-color-soft, rgba(24, 144, 255, 0.12)); }
  .ai-debug-chip--success { background: rgba(82, 196, 26, 0.12); }
  .ai-debug-chip--warning { background: rgba(250, 140, 22, 0.12); }
  .ai-debug-card__body, .ai-debug-card__item { color: rgba(255,255,255,0.65); }
  .ai-debug-card__group-label { color: #73d13d; }
  .ai-debug-card__group--remaining .ai-debug-card__group-label { color: #ffa940; }
  .quality-hint--error { color: #ff7875; }
  .quality-hint--warn { color: #ffc069; }
  .quality-hint--info { color: #69c0ff; }
  .result-running { .running-time { color: var(--primary-color-active, #177ddc); } .running-tip { color: rgba(255,255,255,0.45); } }
  .result-empty { p { color: rgba(255,255,255,0.45); } }
  .result-data {
    .metric-card {
      background: linear-gradient(165deg, #262626 0%, #1a1a1a 100%);
      border-color: #363636;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
      &:hover {
        box-shadow: 0 6px 18px var(--primary-color-ring, rgba(24, 144, 255, 0.18));
        border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.35));
      }
      .metric-label { color: rgba(255, 255, 255, 0.5); }
      .metric-value { color: rgba(255, 255, 255, 0.9); }
      &.positive .metric-value { color: #49aa19; }
      &.negative .metric-value { color: #d32029; }
    }
  }
  .eq-title, .trades-title { color: rgba(255,255,255,0.85); .trades-count { color: rgba(255,255,255,0.45); } }
  .trades-table ::v-deep .ant-table-wrapper,
  .trades-table ::v-deep .ant-table,
  .trades-table ::v-deep .ant-table-content,
  .trades-table ::v-deep .ant-table-scroll,
  .trades-table ::v-deep .ant-table-body,
  .trades-table ::v-deep .ant-table table {
    background: #1f1f1f !important;
    border-color: #303030 !important;
  }
  .trades-table ::v-deep .ant-table-content,
  .trades-table ::v-deep .ant-table-scroll {
    border: 1px solid #303030 !important;
  }
  .trades-table ::v-deep .ant-table-thead > tr > th,
  .trades-table ::v-deep .ant-table-tbody > tr > td {
    border-color: #303030 !important;
    border-right-color: #303030 !important;
    border-bottom-color: #303030 !important;
  }
  .trades-table ::v-deep .ant-table-thead > tr > th:first-child,
  .trades-table ::v-deep .ant-table-tbody > tr > td:first-child {
    border-left-color: #303030 !important;
  }
  .trades-table ::v-deep .ant-table-thead > tr:first-child > th {
    border-top-color: #303030 !important;
  }
  .panel-title-actions ::v-deep .ant-btn:not(.ant-btn-primary) {
    background: #1f1f1f;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.65);
    &:hover:not([disabled]) {
      border-color: var(--primary-color-active, #177ddc);
      color: var(--primary-color-active, #177ddc);
    }
  }
  .code-editor-area {
    &::-webkit-scrollbar-thumb { background: #434343; }
    ::v-deep .CodeMirror-vscrollbar,
    ::v-deep .CodeMirror-hscrollbar {
      &::-webkit-scrollbar-thumb { background: #434343; }
    }
  }
  .result-panel {
    &::-webkit-scrollbar-thumb { background: #434343; }
  }

  ::v-deep .ant-tabs-bar { border-bottom-color: #303030; }
  ::v-deep .ant-tabs-tab { color: rgba(255,255,255,0.55); &:hover { color: rgba(255,255,255,0.85); } }
  ::v-deep .ant-tabs-tab-active { color: var(--primary-color-active, #177ddc) !important; }
  ::v-deep .ant-tabs-ink-bar { background: var(--primary-color-active, #177ddc); }
  ::v-deep .ant-select .ant-select-selection {
    background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85);
    .ant-select-arrow { color: rgba(255,255,255,0.45); }
    &:hover { border-color: var(--primary-color-active, #177ddc); }
  }
  ::v-deep .ant-select-selection__placeholder { color: rgba(255,255,255,0.35); }
  ::v-deep .ant-input, ::v-deep .ant-input-number { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85); &:focus, &:hover { border-color: var(--primary-color-active, #177ddc); } }
  ::v-deep .ant-input-number-handler-wrap { background: #1f1f1f; border-left-color: #434343; }
  ::v-deep .ant-input-number-handler { color: rgba(255,255,255,0.45); &:hover { color: var(--primary-color-active, #177ddc); } }
  ::v-deep .ant-calendar-picker-input { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85); }
  ::v-deep .ant-calendar-picker-icon { color: rgba(255,255,255,0.45); }
  ::v-deep .ant-radio-button-wrapper {
    background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.65);
    &:hover { color: var(--primary-color-active, #177ddc); }
    &.ant-radio-button-wrapper-checked { background: var(--primary-color-active, #177ddc); border-color: var(--primary-color-active, #177ddc); color: #fff; }
  }
  ::v-deep .ant-checkbox-wrapper { color: rgba(255,255,255,0.85); }
  ::v-deep .ant-checkbox-inner { background: #1f1f1f; border-color: #434343; }
  ::v-deep .ant-btn-default { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.65); &:hover { border-color: var(--primary-color-active, #177ddc); color: var(--primary-color-active, #177ddc); } }
  ::v-deep .ant-table {
    background: transparent; color: rgba(255,255,255,0.85);
    .ant-table-thead > tr > th { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.65); border-bottom-color: #303030; }
    .ant-table-tbody > tr > td { border-bottom-color: #303030; }
    .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,0.04); }
    .ant-table-placeholder { background: transparent; color: rgba(255,255,255,0.35); }
  }
  ::v-deep .ant-table-bordered {
    .ant-table-content,
    .ant-table-body,
    .ant-table-fixed-left table,
    .ant-table-fixed-right table {
      border-color: #303030;
    }
    .ant-table-thead > tr > th,
    .ant-table-tbody > tr > td {
      border-right-color: #303030;
    }
    .ant-table-tbody > tr > td {
      border-bottom-color: #303030;
    }
  }
  ::v-deep .ant-pagination {
    .ant-pagination-item { background: #1f1f1f; border-color: #434343; a { color: rgba(255,255,255,0.65); } &.ant-pagination-item-active { border-color: var(--primary-color-active, #177ddc); a { color: var(--primary-color-active, #177ddc); } } }
    .ant-pagination-prev, .ant-pagination-next { .ant-pagination-item-link { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.45); } }
  }
  ::v-deep .ant-empty-description { color: rgba(255,255,255,0.35); }
}
</style>

<style lang="less">
body.dark .ide-drawer-wrap .ant-drawer-content,
body.dark .ide-drawer-wrap--dark .ant-drawer-content {
  background: #141414;
}
body.dark .ide-drawer-wrap .ant-drawer-header,
body.dark .ide-drawer-wrap--dark .ant-drawer-header {
  background: #1f1f1f;
  border-bottom-color: #303030;
}
body.dark .ide-drawer-wrap .ant-drawer-title,
body.dark .ide-drawer-wrap--dark .ant-drawer-title,
body.dark .ide-drawer-wrap .ant-drawer-close,
body.dark .ide-drawer-wrap--dark .ant-drawer-close {
  color: rgba(255, 255, 255, 0.88);
}
body.dark .ide-drawer-wrap .ant-drawer-body,
body.dark .ide-drawer-wrap--dark .ant-drawer-body {
  color: rgba(255, 255, 255, 0.82);
}
body.dark .ide-drawer-wrap .code-version-toolbar,
body.dark .ide-drawer-wrap--dark .code-version-toolbar {
  color: rgba(255, 255, 255, 0.58);
}
body.dark .ide-drawer-wrap .code-version-item,
body.dark .ide-drawer-wrap--dark .code-version-item {
  background: #1f1f1f;
  border-color: #303030;
}
body.dark .ide-drawer-wrap .code-version-item__main strong,
body.dark .ide-drawer-wrap--dark .code-version-item__main strong {
  color: rgba(255, 255, 255, 0.88);
}
body.dark .ide-drawer-wrap .code-version-item__main span,
body.dark .ide-drawer-wrap--dark .code-version-item__main span,
body.dark .ide-drawer-wrap .code-version-item__main small,
body.dark .ide-drawer-wrap--dark .code-version-item__main small {
  color: rgba(255, 255, 255, 0.52);
}
body.dark .ide-drawer-wrap .code-version-preview,
body.dark .ide-drawer-wrap--dark .code-version-preview {
  border-color: #303030;
}
body.dark .ide-drawer-wrap .code-version-preview__head,
body.dark .ide-drawer-wrap--dark .code-version-preview__head {
  background: #1f1f1f;
  border-color: #303030;
}
body.dark .ide-drawer-wrap .code-version-preview__head strong,
body.dark .ide-drawer-wrap--dark .code-version-preview__head strong {
  color: rgba(255, 255, 255, 0.88);
}
body.dark .ide-drawer-wrap .code-version-item .ant-btn:not(.ant-btn-primary),
body.dark .ide-drawer-wrap--dark .code-version-item .ant-btn:not(.ant-btn-primary),
body.dark .ide-drawer-wrap .code-version-preview__head .ant-btn:not(.ant-btn-primary),
body.dark .ide-drawer-wrap--dark .code-version-preview__head .ant-btn:not(.ant-btn-primary),
body.dark .ide-drawer-wrap .code-version-toolbar .ant-btn:not(.ant-btn-primary),
body.dark .ide-drawer-wrap--dark .code-version-toolbar .ant-btn:not(.ant-btn-primary) {
  background: #1f1f1f;
  border-color: #434343;
  color: rgba(255, 255, 255, 0.68);
}
body.dark .ide-drawer-wrap .code-version-item .ant-btn:not(.ant-btn-primary):hover,
body.dark .ide-drawer-wrap--dark .code-version-item .ant-btn:not(.ant-btn-primary):hover,
body.dark .ide-drawer-wrap .code-version-preview__head .ant-btn:not(.ant-btn-primary):hover,
body.dark .ide-drawer-wrap--dark .code-version-preview__head .ant-btn:not(.ant-btn-primary):hover,
body.dark .ide-drawer-wrap .code-version-toolbar .ant-btn:not(.ant-btn-primary):hover,
body.dark .ide-drawer-wrap--dark .code-version-toolbar .ant-btn:not(.ant-btn-primary):hover {
  border-color: var(--primary-color-active, #177ddc);
  color: var(--primary-color-active, #177ddc);
}

.ide-publish-modal-wrap {
  .ant-modal-content {
    overflow: hidden;
    border-radius: 10px;
    background: #fff;
  }
  .ant-modal-header {
    padding: 18px 24px;
    border-bottom: 1px solid #edf0f5;
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  }
  .ant-modal-title {
    font-size: 17px;
    font-weight: 800;
    color: #1f2937;
  }
  .ant-modal-close-x {
    width: 58px;
    height: 58px;
    line-height: 58px;
  }
  .ant-modal-body {
    padding: 18px 24px 20px;
    background: #f6f7f9;
  }
  .ant-modal-footer {
    padding: 14px 24px;
    border-top: 1px solid #edf0f5;
    background: #fff;
    .ant-btn {
      min-width: 88px;
      height: 34px;
      border-radius: 6px;
      font-weight: 700;
    }
    .ant-btn-primary {
      background: var(--primary-color, #1890ff);
      border-color: var(--primary-color, #1890ff);
    }
  }
  .publish-market-form {
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
    border: 1px solid var(--primary-color-ring, rgba(24, 144, 255, 0.18));
    border-radius: 10px;
    background: linear-gradient(135deg, var(--primary-color-soft, rgba(24, 144, 255, 0.08)) 0%, #fff 72%);
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
    background: var(--primary-color, #1890ff);
    box-shadow: 0 10px 24px var(--primary-color-ring, rgba(24, 144, 255, 0.25));
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
    .anticon {
      margin-top: 3px;
      color: var(--primary-color, #1890ff);
    }
  }
  .publish-section {
    padding: 14px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fff;
  }
  .publish-section-title {
    margin-bottom: 10px;
    color: #1f2937;
    font-size: 13px;
    font-weight: 800;
  }
  .publish-pricing-group {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
    .ant-radio-button-wrapper {
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
      &::before {
        display: none;
      }
      .anticon {
        margin-right: 6px;
      }
      &:hover {
        color: var(--primary-color, #1890ff);
        border-color: var(--primary-color, #1890ff);
      }
      &.ant-radio-button-wrapper-checked {
        color: #fff;
        border-color: var(--primary-color, #1890ff);
        background: var(--primary-color, #1890ff);
        box-shadow: 0 8px 18px var(--primary-color-ring, rgba(24, 144, 255, 0.25));
      }
    }
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
  .publish-option-card {
    min-height: 112px;
    padding: 13px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fff;
    transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
    &.active {
      border-color: var(--primary-color, #1890ff);
      background: linear-gradient(135deg, var(--primary-color-soft, rgba(24, 144, 255, 0.08)) 0%, #fff 76%);
      box-shadow: inset 0 0 0 1px var(--primary-color-ring, rgba(24, 144, 255, 0.12));
    }
  }
  .publish-option-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
    color: #1f2937;
    font-size: 13px;
    font-weight: 800;
  }
  .publish-hint {
    margin-top: 0;
    color: #6b7280;
    font-size: 12px;
    line-height: 1.55;
  }
  .publish-description-input {
    min-height: 104px;
    resize: vertical;
  }
  .publish-unpublish-row {
    display: flex;
    justify-content: flex-start;
  }
}

body.dark .ide-publish-modal-wrap,
.ide-publish-modal-wrap.ide-modal-wrap--dark {
  .ant-modal-content {
    background: #181818;
    box-shadow: 0 18px 54px rgba(0, 0, 0, 0.55);
  }
  .ant-modal-header {
    border-bottom-color: #2a2a2a;
    background: linear-gradient(180deg, #202020 0%, #181818 100%);
  }
  .ant-modal-title {
    color: rgba(255, 255, 255, 0.9);
  }
  .ant-modal-body {
    background: #141414;
  }
  .ant-modal-footer {
    border-top-color: #2a2a2a;
    background: #181818;
  }
  .publish-summary-card {
    border-color: var(--primary-color-ring, rgba(255, 77, 79, 0.32));
    background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #ff4d4f) 18%, #221719) 0%, #1c1c1c 72%);
  }
  .publish-summary-label {
    color: rgba(255, 255, 255, 0.52);
  }
  .publish-summary-name,
  .publish-section-title,
  .publish-option-head {
    color: rgba(255, 255, 255, 0.9);
  }
  .publish-note,
  .publish-section,
  .publish-option-card {
    border-color: #303030;
    background: #1f1f1f;
  }
  .publish-note {
    color: rgba(255, 255, 255, 0.66);
  }
  .publish-option-card.active {
    border-color: var(--primary-color, #ff4d4f);
    background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #ff4d4f) 16%, #201a1a) 0%, #1f1f1f 78%);
    box-shadow: inset 0 0 0 1px var(--primary-color-ring, rgba(255, 77, 79, 0.22));
  }
  .publish-hint {
    color: rgba(255, 255, 255, 0.48);
  }
  .publish-pricing-group {
    .ant-radio-button-wrapper {
      border-color: #383838;
      color: rgba(255, 255, 255, 0.68);
      background: #181818;
      &:hover {
        color: var(--primary-color, #ff4d4f);
        border-color: var(--primary-color, #ff4d4f);
      }
      &.ant-radio-button-wrapper-checked {
        color: #fff;
        border-color: var(--primary-color, #ff4d4f);
        background: var(--primary-color, #ff4d4f);
      }
    }
  }
  .ant-input,
  .ant-input-number {
    background: #181818;
    border-color: #383838;
    color: rgba(255, 255, 255, 0.86);
  }
  .ant-input-number-input {
    color: rgba(255, 255, 255, 0.86);
  }
}

.ide-param-modal-wrap {
  .ant-modal-content {
    overflow: hidden;
    border-radius: 12px;
  }
  .ant-modal-body {
    padding: 18px;
  }
  .ide-param-drawer {
    gap: 14px;
  }
  .ide-param-drawer__hero {
    border-radius: 10px;
    align-items: center;
    .ant-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      height: 28px;
      line-height: 26px;
      margin: 0;
      padding: 0 10px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 700;
    }
  }
  .ide-param-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    max-height: ~"min(54vh, 520px)";
    overflow: auto;
    padding: 0 2px 2px;
  }
  .ide-param-item {
    min-width: 0;
  }
  .ide-param-item__head strong {
    max-width: 220px;
  }
  .ide-param-item__head .ant-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    align-self: flex-start;
    flex-shrink: 0;
    min-width: 34px;
    height: 24px;
    line-height: 22px;
    margin: 0;
    padding: 0 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
  }
  .ide-param-drawer__footer {
    position: static;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin: 2px 0 0;
    padding: 0;
    background: transparent;
    border-top: 0;
    backdrop-filter: none;
    .ant-btn {
      width: 100%;
      height: 32px;
      padding: 0 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

@media (max-width: 860px) {
  .ide-param-modal-wrap {
    .ant-modal {
      max-width: calc(100vw - 24px);
    }
    .ide-param-list {
      grid-template-columns: 1fr;
      max-height: 56vh;
    }
    .ide-param-drawer__footer {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}

.ide-param-drawer-wrap.ide-drawer-wrap--dark,
.ide-param-modal-wrap.ide-modal-wrap--dark,
body.dark .ide-param-drawer-wrap,
body.dark .ide-param-modal-wrap {
  .ant-drawer-content {
    background: #141414;
  }
  .ant-modal-content {
    background: #141414;
    box-shadow: 0 18px 56px rgba(0, 0, 0, 0.62);
  }
  .ant-drawer-wrapper-body,
  .ant-drawer-body,
  .ant-modal-body {
    background: #141414;
    color: rgba(255, 255, 255, 0.82);
  }
  .ant-drawer-header,
  .ant-modal-header {
    background: #1f1f1f;
    border-bottom-color: #303030;
  }
  .ant-drawer-title,
  .ant-modal-title,
  .ant-drawer-close,
  .ant-modal-close {
    color: rgba(255, 255, 255, 0.88);
  }
  .ant-modal-close:hover {
    color: rgba(255, 255, 255, 0.92);
  }
  .ide-param-drawer__hero {
    background:
      radial-gradient(circle at 14% 8%, color-mix(in srgb, var(--primary-color, #1890ff) 22%, transparent), transparent 36%),
      linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 8%, #202020), #151515);
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 26%, #303030);
    span { color: rgba(255, 255, 255, 0.48); }
    strong { color: rgba(255, 255, 255, 0.92); }
  }
  .ide-param-boundary.ant-alert-info {
    background: color-mix(in srgb, var(--primary-color, #1890ff) 11%, #181818);
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 28%, #303030);
    .ant-alert-message {
      color: rgba(255, 255, 255, 0.78);
    }
    .ant-alert-icon {
      color: var(--primary-color, #1890ff);
    }
  }
  .ide-param-empty .ant-empty-description {
    color: rgba(255, 255, 255, 0.45);
  }
  .ide-param-item {
    background: #1f1f1f;
    border-color: #303030;
    box-shadow: none;
  }
  .ide-param-item__head {
    strong { color: rgba(255, 255, 255, 0.9); }
    code {
      color: var(--primary-color, #1890ff);
      background: color-mix(in srgb, var(--primary-color, #1890ff) 16%, transparent);
    }
  }
  .ide-param-item__desc {
    color: rgba(255, 255, 255, 0.58);
  }
  .ide-param-item__meta {
    color: rgba(255, 255, 255, 0.42);
    b { color: rgba(255, 255, 255, 0.78); }
  }
  .ant-tag {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.72);
  }
  .ant-input,
  .ant-input-number,
  .ant-select-selection {
    background: #141414;
    border-color: #3a3a3a;
    color: rgba(255, 255, 255, 0.86);
    &:hover,
    &:focus {
      border-color: var(--primary-color, #1890ff);
    }
  }
  .ant-input-number-input {
    color: rgba(255, 255, 255, 0.86);
  }
  .ant-input-number-handler-wrap {
    background: #1f1f1f;
    border-left-color: #3a3a3a;
  }
  .ant-input-number-handler {
    border-color: #3a3a3a;
    color: rgba(255, 255, 255, 0.45);
    &:hover {
      color: var(--primary-color, #1890ff);
    }
  }
  .ant-select-arrow,
  .ant-select-selection__placeholder {
    color: rgba(255, 255, 255, 0.45);
  }
  .ant-switch {
    background-color: rgba(255, 255, 255, 0.22);
  }
  .ant-switch-checked {
    background-color: var(--primary-color, #1890ff);
  }
  .ide-param-drawer__footer {
    background: transparent;
    border-top-color: transparent;
  }
  .ant-btn:not(.ant-btn-primary) {
    background: #1f1f1f;
    border-color: #3a3a3a;
    color: rgba(255, 255, 255, 0.72);
    &:hover,
    &:focus {
      border-color: var(--primary-color, #1890ff);
      color: var(--primary-color, #1890ff);
    }
  }
  .ant-btn-primary {
    background: var(--primary-color, #1890ff);
    border-color: var(--primary-color, #1890ff);
    color: #fff;
  }
  .ant-btn[disabled],
  .ant-btn[disabled]:hover,
  .ant-btn[disabled]:focus {
    background: #181818;
    border-color: #303030;
    color: rgba(255, 255, 255, 0.28);
  }
}

/* ===== Watchlist dropdown ===== */
.ide-watchlist-dropdown {
  .ant-select-dropdown-menu-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 13px;
  }
  .wl-opt-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    line-height: 18px;
    padding: 0 6px;
    border-radius: 3px;
    flex-shrink: 0;
    color: #fff;
    letter-spacing: 0.3px;
  }
  .wl-mkt-crypto { background: #fa8c16; }
  .wl-mkt-usstock { background: var(--primary-color, #1890ff); }
  .wl-mkt-cnstock { background: #eb2f96; }
  .wl-mkt-hkstock { background: #f5222d; }
  .wl-mkt-forex { background: #52c41a; }
  .wl-mkt-futures { background: #722ed1; }
  .wl-opt-symbol {
    font-weight: 600;
    font-size: 13px;
    color: #333;
  }
  .wl-opt-name {
    color: #8c8c8c;
    font-size: 11px;
    flex-shrink: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ant-select-dropdown-menu-item-selected {
    background: #e6f7ff;
    .wl-opt-symbol { color: var(--primary-color, #1890ff); }
  }
  .ant-select-dropdown-menu-item-active:not(.ant-select-dropdown-menu-item-selected) {
    background: #f5f5f5;
  }
}
.ide-indicator-multiselect-dropdown {
  z-index: 10050 !important;
  .ant-dropdown-menu {
    padding: 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
}
.ide-indicator-overlay {
  min-width: 260px;
  max-width: 420px;
  max-height: 320px;
  overflow: auto;
  padding: 8px 0;
  background: #fff;
}
.ide-indicator-overlay-hint {
  padding: 0 12px 8px;
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.4;
}
.ide-indicator-overlay-empty {
  padding: 12px;
  font-size: 12px;
  color: #8c8c8c;
}
.ide-indicator-overlay-list {
  padding: 0 4px;
}
.ide-indicator-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  &:hover {
    background: #f5f5f5;
  }
}
.ide-indicator-name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  cursor: pointer;
  color: #262626;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &.active {
    color: var(--primary-color, #1890ff);
    font-weight: 600;
  }
}
.ide-indicator-purchased-tag {
  margin-left: 0;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
  flex-shrink: 0;
}
.ide-indicator-multiselect-dropdown--dark {
  .ant-dropdown-menu {
    background: #1f1f1f;
    border: 1px solid #363636;
  }
  .ide-indicator-overlay {
    background: #1f1f1f;
  }
  .ide-indicator-overlay-hint,
  .ide-indicator-overlay-empty {
    color: rgba(255, 255, 255, 0.45);
  }
  .ide-indicator-row:hover {
    background: rgba(255, 255, 255, 0.06);
  }
  .ide-indicator-name {
    color: rgba(255, 255, 255, 0.85);
    &.active {
      color: var(--primary-color, #1890ff);
    }
  }
}

.ide-watchlist-dropdown--dark {
  background: #1f1f1f;
  .ant-select-dropdown-menu-item {
    color: rgba(255,255,255,0.85);
  }
  .wl-opt-symbol { color: rgba(255,255,255,0.88); }
  .wl-opt-name { color: rgba(255,255,255,0.45); }
  .ant-select-dropdown-menu-item-selected {
    background: var(--primary-color-soft, rgba(24, 144, 255, 0.2));
    .wl-opt-symbol { color: var(--primary-color-active, #177ddc); }
  }
  .ant-select-dropdown-menu-item-active:not(.ant-select-dropdown-menu-item-selected) {
    background: rgba(255,255,255,0.06);
  }
}

.ide-add-source-dropdown--dark {
  background: #1f1f1f;
  border: 1px solid #363636;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  .ant-select-dropdown-menu-item {
    color: rgba(255, 255, 255, 0.85);
  }
  .ant-select-dropdown-menu-item-selected {
    color: rgba(255, 255, 255, 0.92);
    background: var(--primary-color-soft, rgba(24, 144, 255, 0.2));
  }
  .ant-select-dropdown-menu-item-active:not(.ant-select-dropdown-menu-item-selected) {
    background: rgba(255, 255, 255, 0.06);
  }
}

.ide-modal-wrap--dark {
  .ant-modal-content { background: #1f1f1f; box-shadow: 0 8px 32px rgba(0,0,0,0.55); }
  .ant-modal-header { background: #1f1f1f; border-bottom-color: #303030; }
  .ant-modal-title { color: rgba(255,255,255,0.88); }
  .ant-modal-close { color: rgba(255,255,255,0.55); &:hover { color: rgba(255,255,255,0.88); } }
  .ant-modal-body { background: #1f1f1f; color: rgba(255,255,255,0.85); }
  .ant-modal-footer { background: #1f1f1f; border-top-color: #303030; }
  .ant-tabs-bar { border-bottom-color: #303030; }
  .ant-tabs-tab { color: rgba(255,255,255,0.55); &:hover { color: rgba(255,255,255,0.85); } }
  .ant-tabs-tab-active { color: var(--primary-color-active, #177ddc) !important; }
  .ant-input-search .ant-input { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.88); &:hover, &:focus { border-color: var(--primary-color-active, #177ddc); } }
  .ant-input-search-icon { color: rgba(255,255,255,0.45); }
  .ant-list-item { color: rgba(255,255,255,0.85); border-bottom-color: #303030; }
  .ant-list-item:hover { background: rgba(255,255,255,0.04); }
  .ant-list-item.add-item-active,
  .ant-list-item.add-item-active:hover {
    color: rgba(255,255,255,0.92);
    background: var(--primary-color-soft, rgba(24, 144, 255, 0.2)) !important;
  }
  .ant-input, .ant-input-number { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85); &:focus, &:hover { border-color: var(--primary-color-active, #177ddc); } }
  .ant-input-number-handler-wrap { background: #1f1f1f; border-left-color: #434343; }
  .ant-input-number-handler { color: rgba(255,255,255,0.45); &:hover { color: var(--primary-color-active, #177ddc); } }
  .ant-radio-wrapper { color: rgba(255,255,255,0.85); }
  .ant-radio-inner { background: #1f1f1f; border-color: #434343; }
  .ant-radio-checked .ant-radio-inner { border-color: var(--primary-color-active, #177ddc); &::after { background-color: var(--primary-color-active, #177ddc); } }
  .ant-select-selection { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85); }
  .ant-switch { background-color: rgba(255,255,255,0.2); }
  .ant-switch-checked { background-color: var(--primary-color-active, #177ddc); }
  .ant-alert-info { background: var(--primary-color-soft, rgba(24, 144, 255, 0.1)); border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.3)); }
  .ant-alert-message { color: rgba(255,255,255,0.85); }
  .ant-alert-info .ant-alert-icon { color: var(--primary-color-active, #177ddc); }
  .ant-btn-default { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.65); &:hover { border-color: var(--primary-color-active, #177ddc); color: var(--primary-color-active, #177ddc); } }
  .ant-btn-primary { background: var(--primary-color-active, #177ddc); border-color: var(--primary-color-active, #177ddc); }
  .ant-btn-danger.ant-btn-background-ghost { border-color: #d32029; color: #d32029; &:hover { border-color: #ff4d4f; color: #ff4d4f; } }
  .field-label { color: rgba(255,255,255,0.58); }
  .publish-hint { color: rgba(255,255,255,0.45); }
  .editor-content { color: rgba(255,255,255,0.85); }
  .ant-row { color: rgba(255,255,255,0.85); }
}
</style>

<style lang="less">
.ide-add-source-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.ant-select-dropdown.ide-qt-select-dropdown {
  z-index: 10060 !important;
}
.ant-modal-wrap.profile-exchange-modal {
  z-index: 10070 !important;
}
.ant-select-dropdown.profile-exchange-select-dropdown,
.ant-select-dropdown.profile-exchange-select-dropdown-dark {
  z-index: 10080 !important;
}

@supports selector(:has(*)) {
  .ant-layout-content:has(.indicator-ide),
  .ant-pro-basicLayout-content:has(.indicator-ide) {
    margin: 0 !important;
    padding: 0 !important;
  }
}
</style>
