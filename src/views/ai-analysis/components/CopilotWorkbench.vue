<template>
  <div class="copilot-workbench">
    <div v-if="mobileSessionsOpen" class="mobile-rail-backdrop" @click="mobileSessionsOpen = false"></div>
    <aside class="left-rail" :class="{ 'mobile-open': mobileSessionsOpen }">
      <button type="button" class="mobile-rail-close" :aria-label="text.sessions" @click="mobileSessionsOpen = false">
        <a-icon type="close" />
      </button>
      <section class="rail-panel sessions-panel">
        <div class="panel-head">
          <span><a-icon type="history" /> {{ text.sessions }}</span>
          <a-button size="small" type="link" @click="newSession">{{ text.newChat }}</a-button>
        </div>
        <div v-if="sessions.length === 0" class="empty-mini">{{ text.noSessions }}</div>
        <div v-else class="session-list">
          <div
            v-for="session in sessions.slice(0, 30)"
            :key="session.id"
            class="session-row"
            :class="{ active: session.id === sessionId }"
          >
            <button type="button" class="session-card" @click="loadHistory(session.id)">
              <strong>{{ session.title || text.untitled }}</strong>
              <span>{{ session.context_symbol || session.context_market || text.chatSession }}</span>
            </button>
            <a-popconfirm
              :title="text.deleteSessionConfirm"
              :ok-text="text.remove"
              :cancel-text="text.cancel"
              @confirm="removeSession(session)"
            >
              <a-tooltip :title="text.remove">
                <button type="button" class="session-delete" @click.stop><a-icon type="delete" /></button>
              </a-tooltip>
            </a-popconfirm>
          </div>
        </div>
      </section>

      <section class="rail-panel saved-prompt-library">
        <div class="saved-prompt-library__head">
          <strong><a-icon type="book" /> {{ text.savedPrompts }}</strong>
          <span>{{ text.savedPromptsHint }}</span>
        </div>
        <div v-if="!savedPrompts.length" class="empty-mini">{{ text.noSavedPrompts }}</div>
        <div v-else class="saved-prompt-library__list">
          <div v-for="item in savedPrompts" :key="item.id" class="saved-prompt-library__item">
            <button type="button" class="saved-prompt-card" @click="useSavedPrompt(item)">
              <strong>{{ item.title }}</strong>
              <span>{{ item.context_symbol || item.category || text.savedPrompts }}</span>
            </button>
            <a-popconfirm
              :title="text.deleteSavedPromptConfirm"
              :ok-text="text.remove"
              :cancel-text="text.cancel"
              @confirm="removeSavedPrompt(item)"
            >
              <button type="button" class="saved-prompt-delete" @click.stop><a-icon type="delete" /></button>
            </a-popconfirm>
          </div>
        </div>
      </section>

    </aside>

    <main class="chat-panel">
      <header class="chat-hero">
        <button type="button" class="mobile-sessions-trigger" @click="mobileSessionsOpen = true">
          <a-icon type="history" />
          <span>{{ text.sessions }}</span>
        </button>
        <div class="hero-main">
          <div class="hero-copy">
            <span class="eyebrow">{{ text.title }}</span>
            <p>{{ text.subtitle }}</p>
          </div>
        </div>
      </header>

      <div ref="messages" class="messages">
        <div v-if="messages.length === 0" class="welcome">
          <a-icon type="search" />
          <h3>{{ text.researchWelcomeTitle }}</h3>
          <p>{{ text.researchWelcomeDesc }}</p>
          <div class="welcome-prompts">
            <button
              v-for="item in starterPrompts"
              :key="'welcome-' + item.key"
              type="button"
              class="research-prompt-pill"
              @click="useStarterPrompt(item)"
            >
              <a-icon :type="item.icon" />
              <span>{{ item.label }}</span>
            </button>
          </div>
          <div v-if="savedPrompts.length" class="saved-prompt-preview">
            <span class="saved-prompt-preview__label"><a-icon type="book" /> {{ text.savedPrompts }}</span>
            <button
              v-for="item in savedPrompts.slice(0, 4)"
              :key="'saved-welcome-' + item.id"
              type="button"
              @click="useSavedPrompt(item)"
            >
              {{ item.title }}
            </button>
          </div>
        </div>

        <article
          v-for="msg in messages"
          :key="msg.localId || msg.id"
          class="message"
          :class="[
            msg.role,
            {
              'report-message': msg.report || msg.reportLoading || msg.reportError,
              'printing-report-message': printReportId && reportId(msg) === printReportId,
              'thinking-message': msg.isThinking
            }
          ]"
        >
          <div class="avatar">
            <a-icon :type="msg.role === 'assistant' ? 'thunderbolt' : 'smile'" />
          </div>
          <div class="bubble">
            <div v-if="msg.attachments && msg.attachments.length" class="attachment-row">
              <div v-for="att in msg.attachments" :key="att.name" class="thumb">
                <img v-if="att.data_url || att.preview" :src="att.data_url || att.preview" :alt="att.name">
                <span v-else class="thumb-missing">{{ att.name || text.imageAttachment }}</span>
              </div>
            </div>
            <div class="message-content" v-html="renderMarkdown(msg.content)" @click="handleMessageContentClick" />
            <div
              v-if="msg.report || msg.reportLoading || msg.reportError"
              :data-report-id="reportId(msg)"
              class="copilot-report-card"
            >
              <div v-if="msg.report && !isReportExpanded(msg)" class="report-artifact-summary">
                <div class="report-artifact-summary__top">
                  <span class="report-artifact-summary__icon"><a-icon type="thunderbolt" /></span>
                  <div>
                    <span>{{ text.professionalReport }}</span>
                    <strong>{{ reportTargetLabel(msg) }}</strong>
                  </div>
                  <em :class="reportDecisionClass(msg)">{{ reportDecision(msg) }}</em>
                </div>
                <p>{{ reportSummary(msg) }}</p>
                <div class="report-artifact-summary__metrics">
                  <span><small>{{ text.confidence }}</small><strong>{{ reportConfidence(msg) }}%</strong></span>
                  <span><small>{{ text.currentPrice }}</small><strong>{{ reportCurrentPrice(msg) }}</strong></span>
                  <span :class="{ warning: reportHasRrWarning(msg) }"><small>R/R</small><strong>{{ reportRiskReward(msg) }}</strong></span>
                </div>
                <div v-if="reportHasRrWarning(msg)" class="report-artifact-summary__warning">
                  <a-icon type="warning" /> {{ reportRiskRewardWarning(msg) }}
                </div>
                <button type="button" class="report-expand-button" @click="toggleReportExpanded(msg)">
                  <a-icon type="down" /> {{ text.viewFullReport }}
                </button>
              </div>
              <ProfessionalAnalysisReport
                v-else
                :result="msg.report || null"
                :loading="!!msg.reportLoading"
                :error="msg.reportError || null"
                :error-tone="msg.reportErrorTone || 'error'"
                @retry="retryProfessionalAnalysis(msg)"
              />
              <button v-if="msg.report && isReportExpanded(msg)" type="button" class="report-collapse-button" @click="toggleReportExpanded(msg)">
                <a-icon type="up" /> {{ text.collapseReport }}
              </button>
            </div>
            <div v-if="msg.streamWarning" class="stream-warning">
              <a-icon type="warning" />
              <span>{{ msg.streamWarning }}</span>
            </div>
            <div v-if="msg.meta" class="message-meta">{{ msg.meta }}</div>
            <details v-if="agentUsageItems(msg).length" class="agent-usage">
              <summary>
                <a-icon type="database" />
                {{ text.dataSourcesUsed }} · {{ agentUsageItems(msg).length }}
              </summary>
              <div class="agent-usage-items">
                <span
                  v-for="item in agentUsageItems(msg)"
                  :key="item.kind + '-' + item.id"
                  :class="['agent-usage-chip', `agent-usage-chip--${item.kind}`]"
                >
                  <a-icon :type="item.kind === 'tool' ? 'api' : 'experiment'" />
                  {{ item.label }}
                </span>
              </div>
            </details>
            <div v-if="msg.role === 'assistant' && !msg.isThinking" class="message-actions">
              <button type="button" @click="copyMessageContent(msg)">
                <a-icon type="copy" /> {{ text.copyAnswer }}
              </button>
              <button v-if="promptForMessage(msg)" type="button" @click="savePromptForMessage(msg)">
                <a-icon type="book" /> {{ text.savePrompt }}
              </button>
              <button v-for="action in visibleMessageActions(msg)" :key="action.key || action.label" type="button" @click="runMessageAction(action, msg)">
                <a-icon :type="action.icon || 'arrow-right'" /> {{ messageActionLabel(action) }}
              </button>
              <button v-if="strategyCodeForMessage(msg)" type="button" @click="copyStrategyCode(msg)">
                <a-icon type="copy" /> {{ text.copyCode }}
              </button>
            </div>
            <div v-if="formatMessageTime(msg)" class="message-time">{{ formatMessageTime(msg) }}</div>
          </div>
        </article>
      </div>

      <div v-if="messages.length && contextualFollowups.length" class="followup-suggestions">
        <button
          v-for="item in contextualFollowups"
          :key="item.key"
          type="button"
          @click="useFollowupPrompt(item)"
        >
          <a-icon :type="item.icon" />
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div v-if="attachments.length" class="pending-attachments">
        <div v-for="(att, idx) in attachments" :key="att.name + idx" class="pending-thumb">
          <img :src="att.data_url" :alt="att.name">
          <button type="button" @click="removeAttachment(idx)"><a-icon type="close" /></button>
        </div>
      </div>

      <footer class="composer">
        <div class="context-bar composer-context-bar">
          <div class="context-status">
            <a-icon type="search" />
            <span>{{ text.focusSymbol }}</span>
            <strong>{{ currentContextLabel }}</strong>
          </div>
          <div class="symbol-picker hero-symbol-picker">
            <a-select
              ref="contextSymbolSelect"
              v-model="selectedSymbolValue"
              show-search
              allow-clear
              size="large"
              dropdown-class-name="copilot-symbol-dropdown"
              :placeholder="text.symbolPlaceholder"
              :filter-option="false"
              :not-found-content="symbolSearching ? undefined : text.noSymbol"
              @focus="seedSymbolOptions"
              @search="handleSymbolSearch"
              @change="handleSymbolChange"
            >
              <a-spin v-if="symbolSearching" slot="notFoundContent" size="small" />
              <a-select-option
                v-for="item in selectableSymbols"
                :key="symbolOptionValue(item)"
                :value="symbolOptionValue(item)"
              >
                <div class="symbol-option">
                  <strong>{{ item.symbol }}</strong>
                  <span>{{ item.name || item.market }}</span>
                  <em :class="['symbol-market-pill', marketPillClass(item.market)]">{{ marketLabel(item.market) }}</em>
                </div>
              </a-select-option>
            </a-select>
          </div>
          <a-button class="professional-report-button" :disabled="!context.symbol || sending" @click="confirmProfessionalAnalysis">
            <a-icon type="file-text" /> {{ text.professionalReport }}
          </a-button>
          <button type="button" class="session-memory-status" @click="openMemoryManager">
            <a-icon type="bulb" />
            <span>{{ sessionMemoryLabel }}</span>
          </button>
        </div>
        <div v-if="draftReferencedReportId" class="referenced-report-chip">
          <a-icon type="link" />
          <span>{{ text.followingReport }}</span>
          <button type="button" @click="draftReferencedReportId = null"><a-icon type="close" /></button>
        </div>
        <div class="research-mode-bar" role="tablist" :aria-label="text.researchMode">
          <button
            v-for="mode in researchModeOptions"
            :key="mode.key"
            type="button"
            role="tab"
            :aria-selected="activeResearchMode === mode.key ? 'true' : 'false'"
            :class="{ active: activeResearchMode === mode.key }"
            @click="selectResearchMode(mode.key)"
          >
            <a-icon :type="mode.icon" />
            {{ mode.label }}
          </button>
        </div>
        <div v-if="strategyComposerGuide" class="composer-coach">
          <span class="composer-coach-icon"><a-icon :type="strategyComposerGuide.icon" /></span>
          <div class="composer-coach-copy">
            <div class="composer-coach-head">
              <strong>{{ strategyComposerGuide.title }}</strong>
              <span>{{ strategyComposerGuide.ready }}</span>
            </div>
            <p>{{ strategyComposerGuide.desc }}</p>
            <div class="composer-coach-suggestions">
              <button
                v-for="suggestion in strategyComposerGuide.suggestions"
                :key="suggestion.key"
                type="button"
                :aria-label="suggestion.label"
                @click="appendStrategySuggestion(suggestion)"
              >
                <a-icon type="plus" /> {{ suggestion.label }}
              </button>
            </div>
          </div>
        </div>
        <textarea
          ref="composerInput"
          v-model="draft"
          :placeholder="text.placeholder"
          :style="{ height: composerHeight + 'px' }"
          @input="resizeComposer"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.ctrl.enter.prevent="sendMessage"
          @keydown.meta.enter.prevent="sendMessage"
          @paste="handlePaste"
        />
        <div class="composer-foot">
          <p class="risk-disclaimer">
            <a-icon type="safety-certificate" />
            <span>{{ text.riskDisclaimer }}</span>
          </p>
          <div class="composer-actions">
            <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" multiple @change="handleFiles">
            <a-button @click="$refs.fileInput.click()">
              <a-icon type="picture" /> {{ uploadImageLabel }}
            </a-button>
            <a-button type="primary" :loading="sending" :disabled="!canSend" @click="sendMessage">
              <a-icon type="thunderbolt" /> {{ text.send }}
            </a-button>
          </div>
        </div>
      </footer>
    </main>

    <aside class="right-rail">
      <section class="rail-panel watch-panel">
        <div class="panel-head">
          <span><a-icon type="star" theme="filled" /> {{ text.watchlist }}</span>
          <a-button size="small" type="link" @click="loadWatchlist"><a-icon type="reload" /></a-button>
        </div>
        <div class="add-watch">
          <a-button type="primary" block icon="plus" @click="openAddWatchModal">{{ text.addWatch }}</a-button>
        </div>
        <div v-if="watchlist.length === 0" class="empty-mini">{{ text.noWatchlist }}</div>
        <div v-else class="watch-list">
          <div
            v-for="item in watchlist.slice(0, 12)"
            :key="watchKey(item)"
            class="watch-card"
            :class="{ active: watchKey(item) === selectedSymbolValue }"
          >
            <button type="button" class="watch-main" @click="selectWatch(item)">
              <span class="watch-identity">
                <strong>{{ item.symbol }}</strong>
                <em>{{ item.name || marketLabel(item.market) }}</em>
              </span>
              <span class="watch-market-data">
                <strong class="watch-price">{{ formatPriceValue(priceFor(item) && priceFor(item).price, item.market) }}</strong>
                <em :class="watchChangeClass(item)" class="watch-change">
                  {{ formatChangePercent(priceFor(item)) }}
                </em>
              </span>
            </button>
            <div class="watch-actions">
              <a-tooltip :title="text.ask">
                <button type="button" @click="askWatch(item)"><a-icon type="message" /></button>
              </a-tooltip>
              <a-tooltip :title="text.schedule">
                <button type="button" @click="openTaskModal(item)"><a-icon type="clock-circle" /></button>
              </a-tooltip>
              <a-popconfirm
                :title="text.removeWatchConfirm"
                :ok-text="text.remove"
                :cancel-text="text.cancel"
                @confirm="removeWatch(item)"
              >
                <a-tooltip :title="text.remove">
                  <button type="button" class="danger" @click.stop><a-icon type="delete" /></button>
                </a-tooltip>
              </a-popconfirm>
            </div>
          </div>
        </div>
      </section>

      <section class="rail-panel monitor-panel">
        <div class="panel-head">
          <span><a-icon type="clock-circle" /> {{ text.monitors }}</span>
          <a-button size="small" type="link" :loading="loadingMonitors" @click="loadMonitors"><a-icon type="reload" /></a-button>
        </div>
        <div v-if="monitors.length === 0" class="empty-mini">{{ text.noMonitors }}</div>
        <div v-else class="monitor-list">
          <div v-for="m in monitors.slice(0, 8)" :key="m.id" class="monitor-card">
            <div>
              <strong>{{ monitorSymbol(m) }}</strong>
              <span>{{ intervalText(m) }} | {{ notificationText(m) }} | {{ m.is_active ? text.running : text.paused }}</span>
            </div>
            <div class="monitor-actions">
              <button type="button" @click="toggleMonitor(m)"><a-icon :type="m.is_active ? 'pause' : 'caret-right'" /></button>
              <button type="button" @click="removeMonitor(m)"><a-icon type="delete" /></button>
            </div>
          </div>
        </div>
      </section>
    </aside>

    <a-modal
      v-model="eventModalVisible"
      :title="text.eventDetail"
      :footer="null"
      wrap-class-name="copilot-modal"
      width="680px"
    >
      <div v-if="selectedEvent" class="event-detail">
        <div class="event-title-row">
          <div>
            <strong>{{ eventTitle(selectedEvent) }}</strong>
            <span>{{ formatEventTime(selectedEvent) }} {{ text.eventMetaSeparator }} {{ selectedEvent.country || selectedEvent.region || '--' }}</span>
          </div>
          <em :class="['impact-pill', impactClass(selectedEvent)]">{{ impactLabel(selectedEvent) }}</em>
        </div>
        <div class="event-fields">
          <div><label>{{ text.actual }}</label><strong>{{ selectedEvent.actual || selectedEvent.value || '--' }}</strong></div>
          <div><label>{{ text.forecast }}</label><strong>{{ selectedEvent.forecast || selectedEvent.consensus || '--' }}</strong></div>
          <div><label>{{ text.previous }}</label><strong>{{ selectedEvent.previous || '--' }}</strong></div>
        </div>
        <section class="event-ai-preview">
          <h4><a-icon type="thunderbolt" /> {{ text.aiPreview }}</h4>
          <p>{{ eventPreview(selectedEvent) }}</p>
        </section>
        <div class="modal-actions">
          <a-button @click="eventModalVisible = false">{{ text.close }}</a-button>
          <a-button type="primary" @click="askAboutEvent(selectedEvent, true)">
            <a-icon type="message" /> {{ text.askAiEvent }}
          </a-button>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model="taskModalVisible"
      :title="text.createMonitor"
      :ok-text="text.save"
      :cancel-text="text.cancel"
      :confirm-loading="savingMonitor"
      wrap-class-name="copilot-modal"
      @ok="saveMonitor"
    >
      <a-form layout="vertical">
        <a-form-item :label="text.symbol">
          <a-input :value="taskSymbolLabel" disabled />
        </a-form-item>
        <a-form-item :label="text.interval">
          <a-select v-model="taskForm.interval_min">
            <a-select-option :value="60">1h</a-select-option>
            <a-select-option :value="240">4h</a-select-option>
            <a-select-option :value="720">12h</a-select-option>
            <a-select-option :value="1440">1d</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="text.notify">
          <a-checkbox-group v-model="taskForm.notify_channels">
            <a-checkbox value="browser">{{ text.notifyBrowser }}</a-checkbox>
            <a-checkbox value="email">{{ text.notifyEmail }}</a-checkbox>
            <a-checkbox value="telegram">{{ text.notifyTelegram }}</a-checkbox>
            <a-checkbox value="webhook"><a-icon type="api" /> {{ text.notifyWebhook }}</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
        <a-alert :message="text.monitorTip" type="info" show-icon />
      </a-form>
    </a-modal>

    <a-modal
      v-model="addWatchModalVisible"
      :title="text.addWatchTitle"
      :ok-text="text.add"
      :cancel-text="text.cancel"
      :confirm-loading="addingWatch"
      :ok-button-props="{ props: { disabled: !addWatchSelected } }"
      wrap-class-name="copilot-modal add-watch-copilot-modal"
      width="620px"
      @ok="confirmAddWatchSymbol"
      @cancel="closeAddWatchModal"
    >
      <div class="add-watch-modal">
        <a-tabs v-model="addWatchMarket" @change="handleAddWatchMarketChange">
          <a-tab-pane v-for="market in markets" :key="market.value" :tab="marketLabel(market.value)" />
        </a-tabs>
        <a-input-search
          v-model="addWatchKeyword"
          size="large"
          allow-clear
          :loading="addWatchSearching"
          :placeholder="text.addWatchSearchPlaceholder"
          @search="handleAddWatchSearch"
          @change="handleAddWatchKeywordChange"
        >
          <a-button slot="enterButton" type="primary" icon="search">{{ text.search }}</a-button>
        </a-input-search>

        <div class="add-watch-results">
          <div v-if="addWatchSearching" class="empty-mini">{{ text.loading }}</div>
          <div v-else-if="addWatchResults.length === 0" class="empty-mini">{{ text.addWatchEmptyHint }}</div>
          <template v-else>
            <button
              v-for="item in addWatchResults"
              :key="'modal-' + symbolOptionValue(item)"
              type="button"
              class="symbol-result-card"
              :class="{ active: addWatchSelected && symbolOptionValue(addWatchSelected) === symbolOptionValue(item) }"
              @click="selectAddWatchSymbol(item)"
            >
              <span>
                <strong>{{ item.symbol }}</strong>
                <em>{{ item.name || marketLabel(item.market) }}</em>
              </span>
              <em :class="['symbol-market-pill', marketPillClass(item.market)]">{{ marketLabel(item.market) }}</em>
            </button>
          </template>
        </div>

        <a-alert
          v-if="addWatchSelected"
          class="selected-watch-alert"
          type="info"
          show-icon
          :message="`${text.selected}: ${addWatchSelected.symbol}`"
          :description="addWatchSelected.name || marketLabel(addWatchSelected.market)"
        />
      </div>
    </a-modal>

    <a-modal
      v-model="memoryManagerVisible"
      :title="text.manageMemory"
      :footer="null"
      wrap-class-name="copilot-modal memory-manager-modal"
      width="720px"
    >
      <a-spin :spinning="loadingSessionMemory">
        <section class="session-memory-panel">
          <div class="memory-section-head">
            <div>
              <strong>{{ text.sessionMemory }}</strong>
              <span>{{ text.sessionMemoryHint }}</span>
            </div>
            <a-popconfirm :title="text.clearSessionMemoryConfirm" :ok-text="text.clear" :cancel-text="text.cancel" @confirm="clearCurrentSessionMemory">
              <a-button size="small" :disabled="!sessionId || !hasSessionSummary">{{ text.clear }}</a-button>
            </a-popconfirm>
          </div>
          <div v-if="hasSessionSummary" class="session-memory-summary">
            <span v-if="sessionMemory.summary.selected_target"><small>{{ text.target }}</small><strong>{{ memoryTargetLabel }}</strong></span>
            <span v-if="sessionMemory.summary.timeframe"><small>{{ text.timeframe }}</small><strong>{{ sessionMemory.summary.timeframe }}</strong></span>
            <span v-if="sessionMemory.summary.active_workflow"><small>{{ text.workflow }}</small><strong>{{ sessionMemory.summary.active_workflow }}</strong></span>
            <div v-if="sessionMemory.summary.stable_constraints && sessionMemory.summary.stable_constraints.length" class="memory-constraints">
              <small>{{ text.constraints }}</small>
              <em v-for="item in sessionMemory.summary.stable_constraints" :key="item">{{ item }}</em>
            </div>
          </div>
          <div v-else class="utility-empty">{{ sessionId ? text.noSessionMemory : text.startChatForMemory }}</div>
          <div v-if="sessionMemory.recent_requests && sessionMemory.recent_requests.length" class="context-telemetry">
            <span><small>{{ text.lastInputTokens }}</small><strong>{{ latestContextUsage.estimated_input_tokens || 0 }}</strong></span>
            <span><small>{{ text.historyTurns }}</small><strong>{{ latestContextUsage.history_message_count || 0 }}</strong></span>
            <span><small>{{ text.memoryItems }}</small><strong>{{ latestContextUsage.memory_count || 0 }}</strong></span>
            <span><small>{{ text.contextStatus }}</small><strong>{{ latestContextUsage.context_truncated ? text.compacted : text.normal }}</strong></span>
          </div>
        </section>

        <section class="long-term-memory-panel">
          <div class="memory-section-head">
            <div>
              <strong>{{ text.longTermMemory }}</strong>
              <span>{{ text.longTermMemoryHint }}</span>
            </div>
          </div>
          <div v-if="!userMemories.length" class="utility-empty">{{ text.noLongTermMemory }}</div>
          <div v-else class="memory-editor-list">
            <div v-for="item in userMemories" :key="item.id" class="memory-editor-row">
              <a-input v-model="item.title" :placeholder="text.memoryTitle" />
              <a-textarea v-model="item.content" :auto-size="{ minRows: 2, maxRows: 4 }" :placeholder="text.memoryContent" />
              <div>
                <a-button size="small" type="primary" @click="saveMemoryEdit(item)">{{ text.save }}</a-button>
                <a-popconfirm :title="text.deleteMemoryConfirm" :ok-text="text.remove" :cancel-text="text.cancel" @confirm="removeLongTermMemory(item)">
                  <a-button size="small" type="danger">{{ text.remove }}</a-button>
                </a-popconfirm>
              </div>
            </div>
          </div>
        </section>
      </a-spin>
    </a-modal>

    <a-modal
      v-model="strategyFlowVisible"
      :title="text.strategyFlowTitle"
      :footer="null"
      wrap-class-name="copilot-modal"
      width="700px"
    >
      <div class="strategy-flow">
        <div class="strategy-flow-guide">
          <span><a-icon type="edit" /> {{ text.strategyFlowDescribe }}</span>
          <span><a-icon type="code" /> {{ text.strategyFlowDraft }}</span>
          <span><a-icon type="experiment" /> {{ text.strategyFlowBacktest }}</span>
          <span><a-icon type="rocket" /> {{ text.strategyFlowManualLaunch }}</span>
        </div>
        <div class="strategy-type-grid">
          <button
            v-for="item in strategyTargets"
            :key="item.key"
            type="button"
            :class="['strategy-flow-card', { active: selectedStrategyTarget === item.key }]"
            @click="selectStrategyTarget(item.key)"
          >
            <a-icon :type="item.icon" />
            <span>
              <strong>{{ item.title }}</strong>
              <em>{{ item.desc }}</em>
            </span>
          </button>
        </div>
        <div v-if="selectedStrategyTargetDetails" class="strategy-selected-bar">
          <span class="strategy-selected-label">
            <a-icon :type="selectedStrategyTargetDetails.icon" />
            <strong>{{ selectedStrategyTargetDetails.routeTitle }}</strong>
          </span>
          <em>{{ selectedStrategyTargetDetails.routeDesc }}</em>
        </div>
        <div class="strategy-examples">
          <div class="strategy-examples-head">
            <strong>{{ text.strategyExamplesTitle }}</strong>
            <span>{{ text.strategyExamplesDesc }}</span>
          </div>
          <button
            v-for="item in strategyPromptExamples"
            :key="item.key"
            type="button"
            class="strategy-example-row"
            @click="startStrategyFlow(item.targetType, item.prompt)"
          >
            <span>
              <strong>{{ item.title }}</strong>
              <em>{{ item.prompt }}</em>
            </span>
            <a-icon type="arrow-right" />
          </button>
        </div>
        <div v-if="selectedStrategyTargetDetails" class="strategy-flow-footer">
          <a-button type="primary" class="strategy-route-action" @click="startStrategyFlow(selectedStrategyTarget)">
            <a-icon type="edit" /> {{ selectedStrategyTargetDetails.startLabel }}
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import {
  chatMessage,
  getChatHistory,
  getChatSessions,
  deleteChatSession,
  getWatchlist,
  getWatchlistPrices,
  addWatchlist,
  removeWatchlist,
  searchSymbols,
  getHotSymbols,
  getAgentPreflight,
  classifyAgentIntent,
  getAiSkills,
  getAiSkillPrompt,
  getUserMemory,
  saveUserMemory,
  updateUserMemory,
  deleteUserMemory,
  getChatSessionMemory,
  clearChatSessionMemory,
  saveCopilotMessage,
  getSavedPrompts,
  savePrompt,
  deleteSavedPrompt,
  trackCopilotEvent,
  getCopilotEventSummary,
  exportChatReportPdf,
  createChatReportShare
} from '@/api/market'
import { aiGenerateStrategy } from '@/api/strategy'
import { getEconomicCalendar } from '@/api/global-market'
import { getMembershipPlans } from '@/api/billing'
import { getMonitors, addMonitor, updateMonitor, deleteMonitor } from '@/api/portfolio'
import { fastAnalyze } from '@/api/fast-analysis'
import storage from 'store'
import { ACCESS_TOKEN } from '@/store/mutation-types'
import { loadEnabledMarketOptions, firstMarketValue } from '@/utils/marketModules'
import { resolveMarketBiasLabelKey, resolveTradeActionLabelKey } from '@/utils/fastAnalysisPresentation'
import ProfessionalAnalysisReport from './ProfessionalAnalysisReport.vue'
import {
  mergeWatchlistSuggestions,
  sortCopilotMarkets
} from './copilotWatchlistPresets.mjs'
import {
  buildContextualFollowups,
  buildResearchStarterPrompts,
  rankPromptsByUsage,
  researchModes,
  researchResponseContract
} from './copilotResearchPrompts.mjs'

let localId = 1

export default {
  name: 'CopilotWorkbench',
  components: {
    ProfessionalAnalysisReport
  },
  data () {
    return {
      markets: [],
      context: { market: '', symbol: '' },
      selectedSymbolValue: '',
      watchAddValue: undefined,
      symbolOptions: [],
      symbolSearching: false,
      symbolSearchTimer: null,
      draft: '',
      attachments: [],
      messages: [],
      sessions: [],
      sessionId: null,
      mobileSessionsOpen: false,
      sending: false,
      lastSendSignature: '',
      lastSendAt: 0,
      billing: { feature_costs: {} },
      calendarEvents: [],
      calendarFilter: 'high',
      calendarError: '',
      loadingCalendar: false,
      selectedEvent: null,
      eventModalVisible: false,
      watchlist: [],
      watchlistPrices: {},
      addWatchModalVisible: false,
      addingWatch: false,
      addWatchMarket: 'USStock',
      addWatchKeyword: '',
      addWatchResults: [],
      addWatchSelected: null,
      addWatchSearching: false,
      addWatchSearchTimer: null,
      addWatchSearchSeq: 0,
      monitors: [],
      loadingMonitors: false,
      analyzingSymbol: false,
      strategyFlowVisible: false,
      selectedStrategyTarget: 'indicator',
      generatingStrategy: false,
      pendingAgentTask: null,
      monitorSetupDraft: null,
      agentPreflight: null,
      skillRegistry: [],
      loadingSkills: false,
      userMemories: [],
      taskModalVisible: false,
      savingMonitor: false,
      taskTarget: null,
      taskForm: { interval_min: 240, notify_channels: [] },
      composerHeight: 98,
      composerMinHeight: 98,
      composerMaxHeight: 236,
      draftContextLock: null,
      localizedDraft: null,
      printReportId: '',
      memoryManagerVisible: false,
      loadingSessionMemory: false,
      sessionMemory: { summary: {}, recent_requests: [], version: 0 },
      expandedReports: {},
      draftReferencedReportId: null,
      activeResearchMode: 'research',
      promptUsage: {},
      savedPrompts: [],
      loadingSavedPrompts: false
    }
  },
  watch: {
    '$i18n.locale' () {
      this.refreshLocalizedDraft()
    }
  },
  computed: {
    isZh () {
      const locale = this.$i18n ? String(this.$i18n.locale || '') : 'zh-CN'
      return locale.toLowerCase().startsWith('zh')
    },
    text () {
      const t = (key, fallback, values) => this.i18nText(`aiAssetAnalysis.copilot.${key}`, fallback, values)
      return {
        title: t('title', 'AI Copilot'),
        subtitle: t('subtitle', this.isZh ? '在一个工作区研究标的、检查事件、比较市场并形成可验证的交易观点。' : 'Research symbols, inspect events, compare markets, and form testable trading views in one workspace.'),
        sessions: t('sessions', 'Chat History'),
        newChat: t('newChat', 'New'),
        noSessions: t('noSessions', 'No conversations yet'),
        chatSession: t('chatSession', 'AI chat'),
        untitled: t('untitled', 'New conversation'),
        calendar: t('calendar', 'Market Calendar'),
        highImpact: t('highImpact', 'High impact'),
        today: t('today', 'Today'),
        all: t('all', 'All'),
        loading: t('loading', 'Loading...'),
        noEvents: t('noEvents', 'No upcoming events'),
        focusSymbol: t('focusSymbol', 'Symbol to analyze'),
        symbol: t('symbol', 'Symbol'),
        symbolPlaceholder: t('symbolPlaceholder', 'Not fixed; AI will infer from your message'),
        noSymbol: t('noSymbol', 'No symbol selected'),
        estimatedCost: t('estimatedCost', 'Estimated cost'),
        scheduleCurrent: t('scheduleCurrent', 'Schedule analysis'),
        welcomeTitle: t('welcomeTitle', 'Control QuantDinger with plain language'),
        welcomeDesc: t('welcomeDesc', 'Ask about markets, explain logs, draft strategies, or attach a chart screenshot.'),
        researchWelcomeTitle: t('researchWelcomeTitle', this.isZh ? '今天想研究什么？' : 'What are you researching?'),
        researchWelcomeDesc: t('researchWelcomeDesc', this.isZh ? '分析标的、比较走势、研究事件，或制定交易计划。' : 'Analyze a symbol, compare markets, research events, or build a trading plan.'),
        researchMode: t('researchMode', this.isZh ? '研究模式' : 'Research mode'),
        savedPrompts: t('savedPrompts', this.isZh ? '我的常用问题' : 'Saved prompts'),
        savedPromptsHint: t('savedPromptsHint', this.isZh ? '点击即可带入输入框' : 'Click to reuse in the composer'),
        savePrompt: t('savePrompt', this.isZh ? '保存问题' : 'Save prompt'),
        copyAnswer: t('copyAnswer', this.isZh ? '复制回答' : 'Copy answer'),
        dataSourcesUsed: t('dataSourcesUsed', this.isZh ? '本次数据与工具' : 'Data and tools used'),
        promptSaved: t('promptSaved', this.isZh ? '问题已保存' : 'Prompt saved'),
        promptSaveFailed: t('promptSaveFailed', this.isZh ? '问题保存失败' : 'Failed to save prompt'),
        promptDeleted: t('promptDeleted', this.isZh ? '已删除常用问题' : 'Saved prompt deleted'),
        deleteSavedPromptConfirm: t('deleteSavedPromptConfirm', this.isZh ? '删除这个常用问题？' : 'Delete this saved prompt?'),
        answerCopied: t('answerCopied', this.isZh ? '回答已复制' : 'Answer copied'),
        placeholder: t('placeholder', 'Example: diagnose BTC/USDT 1H trend, or upload a chart screenshot and ask whether entry risk is acceptable...'),
        uploadChart: t('uploadChart', 'Upload image'),
        send: t('send', 'Send'),
        riskDisclaimer: t('riskDisclaimer', 'AI output is for research only and does not constitute investment advice. Verify data, risk, and position sizing before making decisions.'),
        watchlist: t('watchlist', 'Watchlist'),
        addWatchPlaceholder: t('addWatchPlaceholder', 'Add symbol, e.g. BTC/USDT or AAPL'),
        addWatch: t('addWatch', 'Add to watchlist'),
        addWatchTitle: t('addWatchTitle', 'Add to watchlist'),
        addWatchSearchPlaceholder: t('addWatchSearchPlaceholder', 'Search or enter a symbol'),
        addWatchEmptyHint: t('addWatchEmptyHint', 'Enter a symbol to add it.'),
        search: t('search', 'Search'),
        selected: t('selected', 'Selected'),
        add: t('add', 'Add'),
        noWatchlist: t('noWatchlist', 'No symbols yet'),
        ask: t('ask', 'Ask'),
        schedule: t('schedule', 'Schedule'),
        remove: t('remove', 'Remove'),
        removeWatchConfirm: t('removeWatchConfirm', 'Remove this symbol from watchlist?'),
        monitors: t('monitors', 'AI Scheduled Analysis'),
        noMonitors: t('noMonitors', 'No scheduled tasks'),
        running: t('running', 'Running'),
        paused: t('paused', 'Paused'),
        eventDetail: t('eventDetail', 'Event detail'),
        eventMetaSeparator: t('eventMetaSeparator', '·'),
        impactHigh: t('impactHigh', 'High'),
        impactMedium: t('impactMedium', 'Medium'),
        impactLow: t('impactLow', 'Low'),
        actual: t('actual', 'Actual'),
        forecast: t('forecast', 'Forecast'),
        previous: t('previous', 'Previous'),
        aiPreview: t('aiPreview', 'AI Preview'),
        askAiEvent: t('askAiEvent', 'Ask AI about this event'),
        close: t('close', 'Close'),
        createMonitor: t('createMonitor', 'Create scheduled analysis'),
        interval: t('interval', 'Interval'),
        notify: t('notify', 'Notify'),
        notifyBrowser: t('notifyBrowser', 'Browser'),
        notifyEmail: t('notifyEmail', 'Email'),
        notifyTelegram: t('notifyTelegram', 'Telegram'),
        notifyWebhook: t('notifyWebhook', 'Webhook'),
        monitorTip: t('monitorTip', 'AI will re-check this symbol on schedule and keep a record.'),
        save: t('save', 'Save'),
        cancel: t('cancel', 'Cancel'),
        addWatchSuccess: t('addWatchSuccess', 'Added to watchlist'),
        addWatchFailed: t('addWatchFailed', 'Failed to add symbol'),
        removeWatchSuccess: t('removeWatchSuccess', 'Removed from watchlist'),
        removeWatchFailed: t('removeWatchFailed', 'Failed to remove symbol'),
        deleteSessionConfirm: t('deleteSessionConfirm', 'Delete this conversation?'),
        sessionDeleted: t('sessionDeleted', 'Conversation deleted'),
        sessionDeleteFailed: t('sessionDeleteFailed', 'Failed to delete conversation'),
        monitorCreated: t('monitorCreated', 'Scheduled analysis created'),
        monitorUpdated: t('monitorUpdated', 'Scheduled analysis updated'),
        monitorDeleted: t('monitorDeleted', 'Scheduled analysis deleted'),
        strategyFlowTitle: t('strategyFlowTitle', 'Choose the strategy type to create'),
        indicatorStrategy: t('indicatorStrategy', 'Strategy API V2'),
        indicatorStrategyDesc: t('indicatorStrategyDesc', 'Generate chart-only indicator research with plots, markers, and parameters. Convert to Strategy API V2 before backtesting or live execution.'),
        scriptStrategy: t('scriptStrategy', 'Trading Script'),
        scriptStrategyDesc: t('scriptStrategyDesc', 'Generate Python Strategy API V2 code for the Trading Script editor.'),
        tradingBot: t('tradingBot', 'Strategy Template'),
        tradingBotDesc: t('tradingBotDesc', 'Recommend grid, trend, DCA, or martingale template parameters from market context.'),
        strategyRouteIndicatorTitle: t('strategyRouteIndicatorTitle', 'Output: Chart indicator code'),
        strategyRouteIndicatorDesc: t('strategyRouteIndicatorDesc', 'Indicators are chart-only. Generate visual indicator code first, then convert the visible logic to a Python Strategy API V2 when backtesting or live execution is needed.'),
        strategyRouteScriptTitle: t('strategyRouteScriptTitle', 'Output: Trading Script code'),
        strategyRouteScriptDesc: t('strategyRouteScriptDesc', 'Runs in the Trading Script editor. Use this for stateful logic, position management, API calls, logging, and automated execution.'),
        strategyRouteTemplateTitle: t('strategyRouteTemplateTitle', 'Output: Strategy Template parameters'),
        strategyRouteTemplateDesc: t('strategyRouteTemplateDesc', 'Runs as a Strategy Template. It recommends grid/trend/DCA and other preset parameters for manual review before launch.'),
        strategyStartIndicator: t('strategyStartIndicator', 'Create chart indicator prompt'),
        strategyStartScript: t('strategyStartScript', 'Create trading script prompt'),
        strategyStartTemplate: t('strategyStartTemplate', 'Create strategy template prompt'),
        analysisRunning: t('analysisRunning', 'Analysis is running...'),
        analysisComplete: t('analysisComplete', 'Analysis complete'),
        indicatorGenerated: t('indicatorGenerated', 'Indicator draft generated'),
        strategyGenerated: t('strategyGenerated', 'Strategy draft generated'),
        openTargetPage: t('openTargetPage', 'Open target page'),
        chatUnavailable: t('chatUnavailable', 'Chat API is not connected. Showing local fallback response first.'),
        streamInterrupted: t('streamInterrupted', this.isZh ? '连接中断，已保留当前内容，请重试。' : 'The connection was interrupted. The current response was kept; please retry.'),
        streamIncomplete: t('streamIncomplete', this.isZh ? '响应未正常结束，请重试。' : 'The response did not finish correctly. Please retry.'),
        outputLimit: t('outputLimit', this.isZh ? '回答已达到输出上限，当前内容可能不完整。' : 'The response reached the output limit and may be incomplete.'),
        thinking: t('thinking', 'Thinking...'),
        selectSymbolFirst: t('selectSymbolFirst', 'Choose a symbol to analyze before running this tool.'),
        uploadImage: t('uploadImage', 'Upload image'),
        quickTools: t('quickTools', 'Quick tools'),
        professionalReport: t('professionalReport', this.isZh ? '专业分析报告' : 'Professional report'),
        professionalReportHint: t('professionalReportHint', this.isZh ? '生成含结论、交易计划和风险收益比的结构化报告' : 'Generate a structured report with verdict, plan, and risk/reward.'),
        scheduleHint: t('scheduleHint', this.isZh ? '按指定频率复查当前标的并发送通知' : 'Re-check this symbol on a schedule and notify you.'),
        manageMemory: t('manageMemory', this.isZh ? '对话记忆' : 'Conversation memory'),
        manageMemoryHint: t('manageMemoryHint', this.isZh ? '查看本对话记住了什么，并管理长期偏好' : 'Review this chat memory and manage long-term preferences.'),
        noSavedPrompts: t('noSavedPrompts', this.isZh ? '还没有保存常用问题，可在任一回答下点击“保存问题”。' : 'No saved prompts yet. Save one from any answer.'),
        sessionMemory: t('sessionMemory', this.isZh ? '本对话记忆' : 'Session memory'),
        sessionMemoryHint: t('sessionMemoryHint', this.isZh ? '自动压缩的任务状态，不会重复发送完整聊天记录。' : 'A compact task state; the full transcript is not resent.'),
        longTermMemory: t('longTermMemory', this.isZh ? '长期偏好' : 'Long-term preferences'),
        longTermMemoryHint: t('longTermMemoryHint', this.isZh ? '仅使用你确认保存的偏好和限制，可编辑或删除。' : 'Only user-approved preferences and constraints; edit or remove anytime.'),
        clearSessionMemoryConfirm: t('clearSessionMemoryConfirm', this.isZh ? '清除本对话的摘要记忆？聊天记录会保留。' : 'Clear this session summary? The transcript will be kept.'),
        clear: t('clear', this.isZh ? '清除' : 'Clear'),
        target: t('target', this.isZh ? '当前标的' : 'Target'),
        timeframe: t('timeframe', this.isZh ? '周期' : 'Timeframe'),
        workflow: t('workflow', this.isZh ? '当前任务' : 'Workflow'),
        constraints: t('constraints', this.isZh ? '已记住的限制' : 'Remembered constraints'),
        noSessionMemory: t('noSessionMemory', this.isZh ? '本对话暂时没有可复用的任务状态。' : 'No reusable task state in this session yet.'),
        startChatForMemory: t('startChatForMemory', this.isZh ? '发送第一条消息后会开始形成本对话记忆。' : 'Session memory starts after the first message.'),
        noLongTermMemory: t('noLongTermMemory', this.isZh ? '尚未保存长期偏好。AI 发现偏好时会先征求你的确认。' : 'No long-term preferences saved. AI asks before saving one.'),
        memoryTitle: t('memoryTitle', this.isZh ? '记忆标题' : 'Memory title'),
        memoryContent: t('memoryContent', this.isZh ? '偏好或限制' : 'Preference or constraint'),
        deleteMemoryConfirm: t('deleteMemoryConfirm', this.isZh ? '删除这条长期记忆？' : 'Delete this long-term memory?'),
        memoryUpdated: t('memoryUpdated', this.isZh ? '记忆已更新' : 'Memory updated'),
        memoryDeleted: t('memoryDeleted', this.isZh ? '记忆已删除' : 'Memory deleted'),
        memorySaveFailed: t('memorySaveFailed', this.isZh ? '记忆保存失败' : 'Failed to save memory'),
        lastInputTokens: t('lastInputTokens', this.isZh ? '最近输入 Token（估算）' : 'Latest input tokens (est.)'),
        historyTurns: t('historyTurns', this.isZh ? '带入历史消息' : 'History messages'),
        memoryItems: t('memoryItems', this.isZh ? '长期记忆条数' : 'Memory items'),
        contextStatus: t('contextStatus', this.isZh ? '上下文状态' : 'Context status'),
        compacted: t('compacted', this.isZh ? '已压缩' : 'Compacted'),
        normal: t('normal', this.isZh ? '正常' : 'Normal'),
        followingReport: t('followingReport', this.isZh ? '下一条问题将引用当前专业报告' : 'The next question will reference this professional report'),
        viewFullReport: t('viewFullReport', this.isZh ? '查看完整报告' : 'View full report'),
        collapseReport: t('collapseReport', this.isZh ? '收起完整报告' : 'Collapse report'),
        confidence: t('confidence', this.isZh ? '置信度' : 'Confidence'),
        currentPrice: t('currentPrice', this.isZh ? '当前价格' : 'Current price'),
        riskRewardWarning: t('riskRewardWarning', this.isZh ? '风险收益比低于 1，请重点检查止盈止损计划。' : 'Risk/reward is below 1. Review the stop and target plan.'),
        riskRewardUnavailable: t('riskRewardUnavailable', 'The report has no calculable risk/reward ratio. Review the stop and target plan.'),
        noSessionMemoryYet: t('noSessionMemoryYet', 'No session memory yet'),
        viewConversationMemory: t('viewConversationMemory', 'View conversation memory'),
        rememberedState: t('rememberedState', 'Remembered: {state}'),
        taskState: t('taskState', 'task state'),
        marketFallback: t('marketFallback', 'market'),
        professionalReportMessage: t('professionalReportMessage', 'Professional analysis report: {label}'),
        sessionMemoryCleared: t('sessionMemoryCleared', 'Session memory cleared; transcript kept'),
        reportGenerateTitle: t('reportGenerateTitle', 'Generate a professional report for {symbol}?'),
        reportGenerateContent: t('reportGenerateContent', 'Target: {target} · Timeframe: 1D · About 30–90 seconds · Estimated cost: {cost} credits'),
        generate: t('generate', 'Generate'),
        reportReady: t('reportReady', 'Report ready. Expand for evidence, trading plan, and risks.'),
        hideQuickTools: t('hideQuickTools', 'Hide quick tools'),
        usedThisTurn: t('usedThisTurn', 'Used this turn'),
        imageAttachment: t('imageAttachment', 'Image attachment'),
        copyCode: t('copyCode', 'Copy code'),
        currentSymbol: t('currentSymbol', 'this symbol'),
        free: t('free', 'Free'),
        contextAutoInfer: t('contextAutoInfer', 'Not fixed; AI will infer from your message'),
        strategyFlowDescribe: t('strategyFlowDescribe', 'Describe'),
        strategyFlowDraft: t('strategyFlowDraft', 'Draft'),
        strategyFlowBacktest: t('strategyFlowBacktest', 'Backtest'),
        strategyFlowManualLaunch: t('strategyFlowManualLaunch', 'Manual launch'),
        strategyExamplesTitle: t('strategyExamplesTitle', 'Prompt examples'),
        strategyExamplesDesc: t('strategyExamplesDesc', 'Pick one, then edit the details before sending.'),
        strategyExampleMomentum: t('strategyExampleMomentum', 'Momentum breakout'),
        strategyExampleReversal: t('strategyExampleReversal', 'Mean reversion'),
        strategyExampleCode: t('strategyExampleCode', 'Trading script from idea'),
        strategyExampleStateful: t('strategyExampleStateful', 'Stateful risk script'),
        strategyExampleGrid: t('strategyExampleGrid', 'Grid strategy template'),
        strategyExampleTrendTemplate: t('strategyExampleTrendTemplate', 'Trend strategy template'),
        calendarUnavailable: t('calendarUnavailable', 'Calendar unavailable')
      }
    },
    uploadImageLabel () {
      return this.text.uploadChart
    },
    thinkingText () {
      return this.text.thinking
    },
    strategyComposerGuide () {
      const task = this.pendingAgentTask
      if (!task || task.type !== 'strategy_design') return null
      const targetType = task.targetType === 'indicator' ? 'indicator' : 'script'
      const guideText = (key, values = {}) => this.i18nText(`aiAssetAnalysis.copilot.composerGuide.${key}`, '', values)
      const suggestion = key => ({
        key,
        label: guideText(`${targetType}.suggestions.${key}.label`),
        prompt: guideText(`${targetType}.suggestions.${key}.prompt`)
      })
      return {
        icon: targetType === 'indicator' ? 'line-chart' : 'experiment',
        title: guideText(`${targetType}.title`),
        desc: guideText(`${targetType}.desc`),
        ready: guideText('ready'),
        suggestions: targetType === 'indicator'
          ? ['trend', 'signals', 'levels'].map(suggestion)
          : ['entry', 'risk', 'position'].map(suggestion)
      }
    },
    quickPrompts () {
      const symbol = this.context.symbol || this.text.currentSymbol
      const prompt = (key, fallback) => this.localizedQuickPrompt(key, fallback, { symbol })
      return [
        { key: 'diagnose', action: 'analysis', icon: 'line-chart', label: this.i18nText('aiAssetAnalysis.copilot.quickTasks.market_diagnosis.label', 'Diagnose symbol'), prompt: prompt('diagnose', 'Diagnose {symbol}: trend, momentum, support/resistance, liquidity, and risk.') },
        { key: 'indicator_research', action: 'strategy', icon: 'line-chart', label: this.i18nText('aiAssetAnalysis.copilot.quickTasks.indicator_research.label', 'Indicator R&D'), prompt: prompt('indicatorResearch', 'Generate chart-only QuantDinger indicator code for {symbol}, including plots, visual markers, and parameters.') },
        { key: 'strategy_research', action: 'strategy', icon: 'experiment', label: this.i18nText('aiAssetAnalysis.copilot.quickTasks.strategy_research.label', 'Strategy R&D'), prompt: prompt('strategy', 'Generate executable QuantDinger Strategy API V2 code for {symbol}, including entry/exit logic, risk controls, and runtime-safe parameters.') },
        { key: 'radar', action: 'chat', icon: 'aim', label: this.i18nText('aiAssetAnalysis.copilot.quickTasks.opportunity_radar.label', 'Opportunity radar'), prompt: prompt('radar', 'Scan {symbol} for likely opportunities in the next 24 hours, with triggers and invalidation.') }
      ]
    },
    systemQuickTasks () {
      const symbol = this.context.symbol || this.text.currentSymbol
      const task = (key, action, icon, tone, labelKey, descKey, promptKey, promptFallback) => ({
        key,
        action,
        icon,
        tone,
        label: this.i18nText(`aiAssetAnalysis.copilot.quickTasks.${labelKey}.label`, labelKey),
        desc: this.i18nText(`aiAssetAnalysis.copilot.quickTasks.${descKey}.desc`, ''),
        prompt: this.localizedQuickPrompt(promptKey, promptFallback, { symbol })
      })
      return [
        task('diagnose', 'analysis', 'line-chart', 'blue', 'market_diagnosis', 'market_diagnosis', 'diagnose', 'Diagnose {symbol}: trend, momentum, support/resistance, liquidity, and risk.'),
        task('chart', 'chart', 'picture', 'purple', 'chart_review', 'chart_review', 'chart', 'I will paste or upload a chart image. Judge whether the setup is tradable and give stop loss, take profit, and invalidation.'),
        task('indicator_research', 'strategy', 'line-chart', 'green', 'indicator_research', 'indicator_research', 'indicatorResearch', 'Generate chart-only QuantDinger indicator code for {symbol}, including plots, visual markers, and parameters.'),
        task('strategy_research', 'strategy', 'experiment', 'green', 'strategy_research', 'strategy_research', 'strategy', 'Generate executable QuantDinger Strategy API V2 code for {symbol}, including entry/exit logic, risk controls, and runtime-safe parameters.'),
        task('trade_plan', 'chat', 'profile', 'orange', 'trade_plan', 'trade_plan', 'tradePlan', 'Create a practical trading plan for {symbol}: bias, key levels, trigger, stop loss, take profit, position sizing, and when to stay out.'),
        task('news', 'chat', 'global', 'cyan', 'news_research', 'news_research', 'news', 'Search recent news and events for {symbol}; separate facts, interpretation, and uncertainty.'),
        task('macro', 'chat', 'global', 'indigo', 'macro_economic_data', 'macro_economic_data', 'macro', 'Review macro data such as CPI, FOMC, rates, GDP, and PCE, and explain the market impact.'),
        task('radar', 'chat', 'radar-chart', 'gold', 'opportunity_radar', 'opportunity_radar', 'radar', 'Scan for possible opportunities in the next 24 hours and list triggers, risks, and invalidation.')
      ]
    },
    quickTaskDisplayText () {
      const make = (id, labelFallback, descFallback) => ({
        label: this.i18nText(`aiAssetAnalysis.copilot.quickTasks.${id}.label`, labelFallback),
        desc: this.i18nText(`aiAssetAnalysis.copilot.quickTasks.${id}.desc`, descFallback)
      })
      return {
        market_diagnosis: make('market_diagnosis', 'Diagnose symbol', 'Trend, momentum, support/resistance, liquidity, and risk.'),
        chart_review: make('chart_review', 'Chart review', 'Judge entries, stops, take profit, and invalidation from a chart image.'),
        indicator_research: make('indicator_research', 'Indicator R&D', 'Generate chart-only indicators with plots, markers, and parameters.'),
        strategy_research: make('strategy_research', 'Strategy R&D', 'Generate executable Strategy API V2 drafts for backtest and live review.'),
        script_strategy: make('strategy_research', 'Strategy R&D', 'Generate executable Strategy API V2 drafts for backtest and live review.'),
        trade_plan: make('trade_plan', 'Trading plan', 'Turn the current market context into a concrete execution checklist.'),
        news_research: make('news_research', 'News / event research', 'Search company, asset, macro, and industry news to build usable research context.'),
        macro_economic_data: make('macro_economic_data', 'Macro data', 'Query CPI, FOMC, rates, GDP, PCE, and other macro events.'),
        opportunity_radar: make('opportunity_radar', 'Opportunity radar', 'Scan likely opportunities over the next 24 hours.')
      }
    },
    registeredQuickTasks () {
      const symbol = this.context.symbol || this.text.currentSymbol
      const registry = Array.isArray(this.skillRegistry) ? this.skillRegistry : []
      if (!registry.length) return this.systemQuickTasks

      const order = [
        'market_diagnosis',
        'chart_review',
        'indicator_research',
        'strategy_research',
        'trade_plan',
        'news_research',
        'macro_economic_data',
        'opportunity_radar'
      ]
      const byId = new Map(this.systemQuickTasks.map(item => [item.key, item]))
      registry
        .filter(item => item && item.id !== 'scheduled_analysis')
        .forEach(item => {
          if (item.id === 'script_strategy') {
            byId.set('strategy_research', item)
          } else {
            byId.set(item.id, item)
          }
        })
      return order
        .map(id => byId.get(id))
        .filter(Boolean)
        .map(skill => {
          const actionType = skill.action_type || ''
          const rawSkillId = skill.id || skill.key
          const skillId = rawSkillId === 'script_strategy' ? 'strategy_research' : rawSkillId
          const displayText = this.quickTaskDisplayText[skillId] || this.quickTaskDisplayText[rawSkillId] || {}
          const promptKey = this.quickTaskPromptKey(skillId)
          return {
            key: skillId,
            skillId: rawSkillId,
            action: actionType === 'strategy'
              ? 'strategy'
              : actionType === 'addWatch'
                ? 'addWatch'
                : skillId === 'market_diagnosis'
                  ? 'analysis'
                  : skill.action || 'prompt',
            icon: skill.icon || 'appstore',
            tone: (skill.ui && skill.ui.tone) || skill.category || '',
            label: displayText.label || skill.label,
            desc: displayText.desc || skill.description,
            prompt: this.localizedQuickPrompt(promptKey, skill.prompt || '', { symbol })
          }
        })
    },
    researchQuickTasks () {
      return this.registeredQuickTasks.filter(item => !['indicator_research', 'strategy_research', 'script_strategy'].includes(this.quickTaskKey(item)))
    },
    researchModeOptions () {
      return researchModes(false).map(item => ({
        ...item,
        label: this.i18nText(`aiAssetAnalysis.copilot.researchModes.${item.key}`, item.label)
      }))
    },
    starterPrompts () {
      const target = this.normalizeSymbolOption(this.context)
      const symbol = (target && target.symbol) || this.text.currentSymbol
      const related = (this.watchlist || [])
        .map(item => String((item && item.symbol) || '').trim())
        .filter(item => item && item.toUpperCase() !== String(symbol).toUpperCase())
        .slice(0, 2)
      const comparisonItems = [symbol, ...related].filter(Boolean)
      const comparison = typeof Intl !== 'undefined' && Intl.ListFormat
        ? new Intl.ListFormat(String(this.$i18n?.locale || 'en-US'), { style: 'short', type: 'conjunction' }).format(comparisonItems)
        : comparisonItems.join(', ')
      const prompts = buildResearchStarterPrompts({
        isZh: false,
        target,
        watchlist: this.watchlist,
        activeMode: this.activeResearchMode
      }).map(item => ({
        ...item,
        label: this.i18nText(`aiAssetAnalysis.copilot.starterPrompts.${item.key}.label`, item.label, { symbol, comparison }),
        prompt: this.i18nText(`aiAssetAnalysis.copilot.starterPrompts.${item.key}.prompt`, item.prompt, { symbol, comparison })
      }))
      return rankPromptsByUsage(prompts, this.promptUsage).slice(0, 6)
    },
    lastAssistantMessage () {
      return [...(this.messages || [])].reverse().find(item => item && item.role === 'assistant') || null
    },
    contextualFollowups () {
      const message = this.lastAssistantMessage || {}
      if (this.sending || !message || message.isThinking) return []
      const target = this.normalizeSymbolOption(this.context)
      const symbol = (target && target.symbol) || this.i18nText('aiAssetAnalysis.copilot.currentSymbol', 'the current symbol')
      return buildContextualFollowups({
        isZh: false,
        target,
        intent: message.meta || message.intent || '',
        hasReport: !!message.report
      }).map(item => ({
        ...item,
        label: this.i18nText(`aiAssetAnalysis.copilot.followups.${item.key}.label`, item.label, { symbol }),
        prompt: this.i18nText(`aiAssetAnalysis.copilot.followups.${item.key}.prompt`, item.prompt, { symbol })
      }))
    },
    strategyTargets () {
      return [
        {
          key: 'indicator',
          icon: 'line-chart',
          title: this.text.indicatorStrategy,
          desc: this.text.indicatorStrategyDesc,
          routeTitle: this.text.strategyRouteIndicatorTitle,
          routeDesc: this.text.strategyRouteIndicatorDesc,
          startLabel: this.text.strategyStartIndicator
        },
        {
          key: 'script',
          icon: 'code',
          title: this.text.scriptStrategy,
          desc: this.text.scriptStrategyDesc,
          routeTitle: this.text.strategyRouteScriptTitle,
          routeDesc: this.text.strategyRouteScriptDesc,
          startLabel: this.text.strategyStartScript
        }
      ]
    },
    selectedStrategyTargetDetails () {
      return this.strategyTargets.find(item => item.key === this.selectedStrategyTarget) || this.strategyTargets[0]
    },
    strategyPromptExamples () {
      const target = this.normalizeSymbolOption(this.context)
      const symbol = target && target.symbol ? target.symbol : this.text.currentSymbol
      const examples = {
        indicator: [{
          key: 'momentum-breakout',
          targetType: 'indicator',
          title: this.text.strategyExampleMomentum,
          prompt: this.i18nText(
            'aiAssetAnalysis.copilot.strategyExamples.momentum',
            '{symbol} 15m momentum breakout: go long when ROC > 0 and volume breaks above average, hold above EMA10, stop loss 2%, take profit 5%, backtest 6 months.',
            { symbol }
          )
        },
        {
          key: 'mean-reversion',
          targetType: 'indicator',
          title: this.text.strategyExampleReversal,
          prompt: this.i18nText(
            'aiAssetAnalysis.copilot.strategyExamples.reversal',
            '{symbol} 1h mean reversion: short when price touches upper Bollinger Band and RSI > 70, long when lower band and RSI < 30, exit at middle band, stop loss 2%, take profit 3%.',
            { symbol }
          )
        }],
        script: [{
          key: 'script-from-idea',
          targetType: 'script',
          title: this.text.strategyExampleCode,
          prompt: this.i18nText(
            'aiAssetAnalysis.copilot.strategyExamples.code',
            'Turn my idea into a QuantDinger Python Strategy API V2: trend filter, entry/exit rules, position sizing, stop/take-profit, logging, and validation steps.',
            { symbol }
          )
        },
        {
          key: 'stateful-risk-script',
          targetType: 'script',
          title: this.text.strategyExampleStateful,
          prompt: this.i18nText(
            'aiAssetAnalysis.copilot.strategyExamples.statefulScript',
            'Create a QuantDinger Python Strategy API V2 for {symbol}: keep position state, avoid duplicate entries, scale out at 2R, move stop to breakeven after 1R, and write clear logs.',
            { symbol }
          )
        }]
      }
      return examples[this.selectedStrategyTarget] || examples.indicator
    },
    estimatedCost () {
      if (this.billing && this.billing.billing_enabled === false) {
        return this.text.free
      }
      const costs = this.billing.feature_costs || {}
      const chat = Number(costs.ai_copilot_chat || 0)
      const img = this.attachments.length > 0 ? Number(costs.ai_copilot_image || 0) : 0
      return `${chat + img} credits`
    },
    canSend () {
      return !this.sending && (this.draft.trim().length > 0 || this.attachments.length > 0)
    },
    currentContextLabel () {
      const target = this.normalizeSymbolOption(this.context)
      if (!target || !target.symbol) return this.text.contextAutoInfer
      return `${target.market}:${target.symbol}`
    },
    hasSessionSummary () {
      return !!(this.sessionMemory && this.sessionMemory.summary && Object.keys(this.sessionMemory.summary).length)
    },
    memoryTargetLabel () {
      const target = (this.sessionMemory && this.sessionMemory.summary && this.sessionMemory.summary.selected_target) || {}
      return [target.market, target.symbol].filter(Boolean).join(':') || '--'
    },
    latestContextUsage () {
      return (this.sessionMemory && this.sessionMemory.recent_requests && this.sessionMemory.recent_requests[0]) || {}
    },
    sessionMemoryLabel () {
      if (!this.sessionId) return this.text.noSessionMemoryYet
      if (!this.hasSessionSummary) return this.text.viewConversationMemory
      const summary = this.sessionMemory.summary || {}
      const target = summary.selected_target || {}
      const pieces = [target.symbol, summary.timeframe, summary.active_workflow].filter(Boolean).slice(0, 2)
      return this.i18nText('aiAssetAnalysis.copilot.rememberedState', 'Remembered: {state}', {
        state: pieces.join(' · ') || this.text.taskState
      })
    },
    selectableSymbols () {
      const map = new Map()
      ;(this.watchlist || []).forEach(item => {
        const normalized = this.normalizeSymbolOption(item)
        if (normalized) map.set(this.symbolOptionValue(normalized), normalized)
      })
      ;(this.symbolOptions || []).forEach(item => {
        const normalized = this.normalizeSymbolOption(item)
        if (normalized) map.set(this.symbolOptionValue(normalized), normalized)
      })
      const current = this.normalizeSymbolOption(this.context)
      if (current) map.set(this.symbolOptionValue(current), current)
      return Array.from(map.values())
    },
    displayCalendarEvents () {
      const list = Array.isArray(this.calendarEvents) ? this.calendarEvents : []
      const today = new Date().toISOString().slice(0, 10)
      if (this.calendarFilter === 'today') {
        return list.filter(e => String(e.date || e.datetime || '').slice(0, 10) === today).slice(0, 12)
      }
      if (this.calendarFilter === 'high') {
        return list.filter(e => this.impactClass(e) === 'high').slice(0, 12)
      }
      return list.slice(0, 16)
    },
    taskSymbolLabel () {
      const target = this.taskTarget || this.normalizeSymbolOption(this.context)
      if (!target) return '--'
      return `${this.marketLabel(target.market)} · ${target.symbol}`
    }
  },
  mounted () {
    this.loadMarketModules()
    this.seedSymbolOptions()
    this.loadBilling()
    this.loadWatchlist()
    this.loadSessions()
    this.loadMonitors()
    this.loadAgentPreflight()
    this.loadAiSkills()
    this.loadUserMemories()
    this.loadSavedPrompts()
    this.loadPromptUsage()
    this.applyIncomingCopilotPrompt()
    this.$nextTick(this.resizeComposer)
  },
  beforeDestroy () {
    if (this.symbolSearchTimer) clearTimeout(this.symbolSearchTimer)
    if (this.addWatchSearchTimer) clearTimeout(this.addWatchSearchTimer)
  },
  methods: {
    applyIncomingCopilotPrompt () {
      const query = (this.$route && this.$route.query) || {}
      let prompt = ''
      const key = String(query.copilotPromptKey || '')
      if (key && key.startsWith('qd_copilot_') && typeof sessionStorage !== 'undefined') {
        try {
          prompt = String(sessionStorage.getItem(key) || '')
          sessionStorage.removeItem(key)
        } catch (_) {
          prompt = ''
        }
      }
      if (!prompt && query.copilotPrompt) {
        try {
          prompt = decodeURIComponent(String(query.copilotPrompt))
        } catch (_) {
          prompt = String(query.copilotPrompt || '')
        }
      }
      if (!prompt.trim()) return
      const target = this.normalizeSymbolOption({
        market: query.market || '',
        symbol: query.symbol || ''
      })
      if (target) {
        this.context.market = target.market
        this.context.symbol = target.symbol
        this.selectedSymbolValue = this.symbolOptionValue(target)
        this.symbolOptions = [target].concat(this.symbolOptions || [])
      }
      this.usePrompt(prompt, target ? { contextLock: target } : {})
      const nextQuery = { ...query }
      delete nextQuery.copilotPrompt
      delete nextQuery.copilotPromptKey
      if (this.$router) this.$router.replace({ path: this.$route.path, query: nextQuery }).catch(() => {})
    },
    quickTaskPromptKey (id) {
      const key = String(id || '').toLowerCase()
      const aliases = {
        market_diagnosis: 'diagnose',
        chart_review: 'chart',
        indicator_research: 'indicatorResearch',
        strategy_research: 'strategy',
        script_strategy: 'strategy',
        trade_plan: 'tradePlan',
        scheduled_analysis: 'monitor',
        monitor_setup: 'monitor',
        macro_economic_data: 'macro',
        macro_check: 'macro',
        opportunity_radar: 'radar'
      }
      return aliases[key] || key
    },
    localizedQuickPrompt (id, fallback, values = {}) {
      const key = this.quickTaskPromptKey(id)
      return this.i18nText(`aiAssetAnalysis.copilot.quickPrompts.${key}`, fallback || '', values)
    },
    i18nText (key, fallback, values = {}) {
      values = values || {}
      let value = this.$t ? this.$t(key, values) : ''
      if (/\?{4,}/.test(String(value || ''))) value = ''
      if (value && value !== key) return value
      value = fallback == null ? '' : String(fallback)
      return value.replace(/\{(\w+)\}/g, (_, name) => values[name] == null ? '' : values[name])
    },
    resizeComposer () {
      const el = this.$refs && this.$refs.composerInput
      if (!el) return
      el.style.height = 'auto'
      const next = Math.max(this.composerMinHeight, Math.min(this.composerMaxHeight, el.scrollHeight || this.composerMinHeight))
      this.composerHeight = next
      el.style.height = `${next}px`
      el.style.overflowY = (el.scrollHeight || 0) > this.composerMaxHeight ? 'auto' : 'hidden'
    },
    selectedContextTarget () {
      return this.normalizeSymbolOption(this.context)
    },
    quickTaskKey (item) {
      return String((item && (item.key || item.skillId || item.id)) || '').toLowerCase()
    },
    quickTaskRequiresSelectedSymbol (item) {
      const key = this.quickTaskKey(item)
      return key === 'scheduled_analysis' || key === 'monitor'
    },
    quickTaskUsesSelectedSymbol (item) {
      const key = this.quickTaskKey(item)
      const symbolAwareKeys = new Set([
        'diagnose',
        'market_diagnosis',
        'strategy',
        'indicator_research',
        'strategy_research',
        'script_strategy',
        'trade_plan',
        'opportunity_radar',
        'radar'
      ])
      return !!item && (item.action === 'analysis' || symbolAwareKeys.has(key))
    },
    promptSelectSymbolFirst () {
      this.$message.warning(this.text.selectSymbolFirst)
      this.seedSymbolOptions()
      this.$nextTick(() => {
        const picker = this.$refs && this.$refs.contextSymbolSelect
        if (picker && typeof picker.focus === 'function') picker.focus()
      })
    },
    selectedTargetLabel (target) {
      const item = this.normalizeSymbolOption(target)
      if (!item) return ''
      return `${item.market}:${item.symbol}${item.name ? ` (${item.name})` : ''}`
    },
    buildLockedQuickPrompt (item, target) {
      const key = String((item && (item.key || item.skillId || item.id)) || '').toLowerCase()
      const label = this.selectedTargetLabel(target)
      if (key === 'indicator_research') {
        return this.i18nText('aiAssetAnalysis.copilot.lockedPrompts.indicatorResearch', [
          'Run QuantDinger indicator research for the selected data context {label}.',
          '',
          'Requirements:',
          '1. Keep the task locked to the selected symbol; do not switch context because another symbol appears in examples.',
          '2. Generate a chart-only QuantDinger Python indicator draft for the Indicator editor.',
          '3. Indicators are visual analysis tools only: use output.signals for markers, keep output.layers empty by default, and do not emit executable open/close/add/reduce strategy columns.',
          '4. Explain parameters, visual signals, invalidation annotations, and suitable market regimes.',
          '5. Keep code comments in English.'
        ].join('\n'), { label })
      }
      if (key === 'strategy_research' || key === 'script_strategy' || key === 'strategy') {
        return this.i18nText('aiAssetAnalysis.copilot.lockedPrompts.indicatorStrategy', [
          'Run QuantDinger strategy research for the selected data context {label}.',
          '',
          'Requirements:',
          '1. Keep the task locked to the selected symbol; do not switch context because another symbol appears in examples.',
          '2. Generate a Python Strategy API V2 draft that can land in Strategy R&D.',
          '3. Do not use indicator code as an executable strategy. Indicators are chart-only; strategy execution belongs in Strategy API V2.',
          '4. Explain parameters, entry/exit signals, stop/take-profit logic, invalidation, and suitable market regimes.',
          '5. Keep code comments in English.'
        ].join('\n'), { label })
      }
      if (key === 'opportunity_radar' || key === 'radar') {
        return this.i18nText('aiAssetAnalysis.copilot.lockedPrompts.radar', [
          'Run an opportunity radar scan for the selected data context {label}.',
          '',
          'Requirements:',
          '1. Keep the task locked to the selected symbol; do not switch context because another symbol appears in examples.',
          '2. Use system market data, news/events, macro context, key levels, volume, and risk/reward.',
          '3. Judge whether the next 24 hours offer long, short, or wait scenarios.',
          '4. Provide triggers, invalidation, stop logic, watch metrics, and priority.',
          '5. If data is missing, state the gap and what the user should provide.'
        ].join('\n'), { label })
      }
      return this.localizedQuickPrompt(key, item && item.prompt ? item.prompt : '', {
        symbol: target && target.symbol,
        label
      })
    },
    beginMonitorSetup (target) {
      const normalized = this.normalizeSymbolOption(target)
      if (!normalized || !normalized.symbol) {
        this.promptSelectSymbolFirst()
        return
      }
      this.pendingAgentTask = {
        type: 'monitor_setup',
        target: normalized,
        required: ['interval_min', 'notify_channels']
      }
      this.monitorSetupDraft = this.createMonitorSetupDraft(normalized)
      this.messages.push({
        localId: `local-${localId++}`,
        role: 'assistant',
        content: this.buildMonitorQuestion(normalized),
        meta: this.i18nText('aiAssetAnalysis.copilot.monitorWaitingMeta', 'waiting for task parameters'),
        created_at: new Date().toISOString()
      })
      this.scrollToBottom()
    },
    clearThinkingMessage (assistantMsg) {
      if (!assistantMsg || !assistantMsg.isThinking) return
      assistantMsg.content = ''
      assistantMsg.isThinking = false
    },
    replacePendingAssistant (assistantMsg, nextMsg) {
      const idx = this.messages.indexOf(assistantMsg)
      if (idx >= 0) this.messages.splice(idx, 1, nextMsg)
      else this.messages.push(nextMsg)
      return nextMsg
    },
    async loadMarketModules () {
      const options = await loadEnabledMarketOptions({ includeFeatures: ['research'] })
      this.markets = sortCopilotMarkets(options).map(item => ({
        value: item.value,
        label: item.label || item.value,
        i18nKey: item.i18nKey,
        module: item.module
      }))
      const values = this.markets.map(item => item.value)
      if (!values.includes(this.addWatchMarket)) {
        this.addWatchMarket = firstMarketValue(this.markets)
      }
      if (this.context.market && !values.includes(this.context.market)) {
        this.context = { market: '', symbol: '' }
      }
    },
    async loadAiSkills () {
      this.loadingSkills = true
      try {
        const res = await getAiSkills({ language: (this.$i18n && this.$i18n.locale) || 'en-US' })
        const data = res.data || {}
        this.skillRegistry = Array.isArray(data.skills) ? data.skills : []
      } catch (_) {
        this.skillRegistry = []
      } finally {
        this.loadingSkills = false
      }
    },
    async loadBilling () {
      try {
        const res = await getMembershipPlans()
        const data = res.data || {}
        this.billing = data.billing || data.billing_config || {}
        const credits = Number(this.billing.credits)
        if (Number.isFinite(credits)) this.$root.$emit('credits-updated', credits)
      } catch (_) {}
    },
    async loadCalendar (force = false) {
      this.loadingCalendar = true
      this.calendarError = ''
      try {
        const res = await getEconomicCalendar({ force: force ? 1 : 0, days: 14, lang: (this.$i18n && this.$i18n.locale) || 'en-US' })
        const data = res.data || {}
        this.calendarEvents = Array.isArray(data) ? data : (data.events || data.calendar || [])
      } catch (e) {
        this.calendarError = (e && e.response && e.response.data && e.response.data.msg) || (e && e.message) || this.text.calendarUnavailable
      } finally {
        this.loadingCalendar = false
      }
    },
    async loadWatchlist () {
      try {
        const res = await getWatchlist()
        const list = Array.isArray(res.data) ? res.data : ((res.data && res.data.watchlist) || [])
        this.watchlist = list.map(x => this.normalizeSymbolOption(x)).filter(Boolean)
        this.seedSymbolOptions()
        this.applyDefaultWatchSymbol()
        if (this.watchlist.length) {
          const prices = await getWatchlistPrices({ watchlist: this.watchlist.slice(0, 24).map(x => ({ market: x.market, symbol: x.symbol })) })
          this.watchlistPrices = this.normalizePriceMap(prices.data || {})
        }
      } catch (_) {
        this.watchlist = []
      }
    },
    async loadMonitors () {
      this.loadingMonitors = true
      try {
        const res = await getMonitors()
        this.monitors = res && res.code === 1 ? (res.data || []) : []
      } catch (_) {
        this.monitors = []
      } finally {
        this.loadingMonitors = false
      }
    },
    async loadSessions () {
      try {
        const res = await getChatSessions()
        this.sessions = Array.isArray(res.data) ? res.data : ((res.data && res.data.sessions) || [])
      } catch (_) {}
    },
    async loadHistory (sessionId) {
      this.resetComposerDraft()
      this.sessionId = sessionId
      this.mobileSessionsOpen = false
      try {
        const res = await getChatHistory({ session_id: sessionId })
        const rawMessages = Array.isArray(res.data) ? res.data : ((res.data && res.data.messages) || [])
        this.messages = this.normalizeMessages(rawMessages)
        await this.loadSessionMemory()
        this.scrollToBottom()
      } catch (_) {}
    },
    messagePersistContent (message) {
      if (!message) return ''
      const content = String(message.content || '').trim()
      if (content) return content
      if (message.report) {
        const report = this.professionalArtifact(message.report) || {}
        const instrument = report.instrument || {}
        const target = message.reportTarget || {}
        const market = instrument.market || target.market || ''
        const symbol = instrument.canonical_symbol || instrument.symbol || target.symbol || ''
        const label = [market, symbol].filter(Boolean).join(':') || this.text.marketFallback
        return this.i18nText('aiAssetAnalysis.copilot.professionalReportMessage', 'Professional analysis report: {label}', { label })
      }
      if (message.reportError) return `Analysis failed: ${message.reportError}`
      return String(message.meta || '').trim()
    },
    async persistCopilotMessage (message, intent = '') {
      if (!message) return null
      const content = this.messagePersistContent(message)
      if (!content && !message.report && !message.reportError) return null
      try {
        const context = this.buildChatContext ? this.buildChatContext(message.content) : {}
        const res = await saveCopilotMessage({
          session_id: this.sessionId,
          message_id: message.id || null,
          role: message.role || 'assistant',
          content,
          attachments: message.attachments || [],
          actions: message.actions || [],
          report: message.report || null,
          reportTarget: message.reportTarget || null,
          reportError: message.reportError || '',
          reportErrorTone: message.reportErrorTone || '',
          intent: intent || message.meta || 'local_agent',
          context
        })
        const data = res && res.data ? res.data : {}
        if (data.session_id) this.sessionId = data.session_id
        if (data.message_id) this.$set ? this.$set(message, 'id', data.message_id) : (message.id = data.message_id)
        await this.loadSessions()
        return data
      } catch (_) {
        return null
      }
    },
    async removeSession (session) {
      if (!session || !session.id) return
      try {
        const res = await deleteChatSession(session.id)
        if (!res || res.code === 0) throw new Error((res && res.msg) || this.text.sessionDeleteFailed)
        this.$message.success(this.text.sessionDeleted)
        if (this.sessionId === session.id) {
          this.sessionId = null
          this.messages = []
        }
        await this.loadSessions()
      } catch (e) {
        this.$message.error((e && e.response && e.response.data && e.response.data.msg) || (e && e.message) || this.text.sessionDeleteFailed)
      }
    },
    newSession () {
      this.resetComposerDraft()
      this.sessionId = null
      this.messages = []
      this.mobileSessionsOpen = false
      this.sessionMemory = { summary: {}, recent_requests: [], version: 0 }
      this.draftReferencedReportId = null
    },
    resetComposerDraft () {
      this.draft = ''
      this.attachments = []
      this.draftContextLock = null
      this.localizedDraft = null
      this.pendingAgentTask = null
      this.monitorSetupDraft = null
      this.memoryManagerVisible = false
      this.draftReferencedReportId = null
      this.composerHeight = this.composerMinHeight
      this.$nextTick(this.resizeComposer)
    },
    seedSymbolOptions () {
      this.symbolOptions = (this.watchlist || []).filter(item => !this.context.market || item.market === this.context.market)
      if (!this.symbolOptions.length && this.context.symbol) {
        this.symbolOptions = [{ market: this.context.market, symbol: this.context.symbol }]
      }
    },
    applyDefaultWatchSymbol () {
      if (this.selectedSymbolValue || this.context.symbol || this.draftContextLock) return
      const first = (this.watchlist || [])[0]
      if (!first) return
      this.context.market = first.market || this.context.market || firstMarketValue(this.markets)
      this.context.symbol = first.symbol || ''
      this.selectedSymbolValue = this.symbolOptionValue(first)
      this.seedSymbolOptions()
    },
    handleSymbolSearch (keyword) {
      if (this.symbolSearchTimer) clearTimeout(this.symbolSearchTimer)
      this.symbolSearchTimer = setTimeout(() => this.doSymbolSearch(keyword), 260)
    },
    async doSymbolSearch (keyword) {
      const kw = String(keyword || '').trim()
      if (!kw) {
        this.seedSymbolOptions()
        return
      }
      this.symbolSearching = true
      try {
        const params = { keyword: kw, limit: 14 }
        const res = await searchSymbols(params)
        const data = res.data || {}
        const list = Array.isArray(data) ? data : (data.results || data.symbols || data.items || [])
        this.symbolOptions = list.map(x => this.normalizeSymbolOption(x)).filter(Boolean)
        if (!this.symbolOptions.length) {
          const inferred = this.inferSymbolFromText(kw)
          this.symbolOptions = [{
            market: (inferred && inferred.market) || this.context.market || firstMarketValue(this.markets),
            symbol: (inferred && inferred.symbol) || kw.toUpperCase()
          }]
        }
      } catch (_) {
        const inferred = this.inferSymbolFromText(kw)
        this.symbolOptions = [{ market: (inferred && inferred.market) || this.context.market || firstMarketValue(this.markets), symbol: kw.toUpperCase() }]
      } finally {
        this.symbolSearching = false
      }
    },
    handleSymbolChange (value) {
      if (!value) {
        this.context.market = ''
        this.context.symbol = ''
        return
      }
      const item = this.selectableSymbols.find(x => this.symbolOptionValue(x) === value) || this.parseSymbolValue(value)
      this.context.market = item.market || this.context.market
      this.context.symbol = item.symbol || ''
      this.selectedSymbolValue = this.symbolOptionValue(item)
      this.seedSymbolOptions()
    },
    addWatchSymbol () {
      this.openAddWatchModal()
    },
    async openAddWatchModal () {
      this.addWatchModalVisible = true
      const marketValues = this.markets.map(item => item.value)
      this.addWatchMarket = marketValues.includes(this.context.market)
        ? this.context.market
        : (marketValues.includes(this.addWatchMarket) ? this.addWatchMarket : firstMarketValue(this.markets, 'USStock'))
      this.addWatchKeyword = ''
      this.addWatchSelected = null
      await this.loadAddWatchHotSymbols()
    },
    closeAddWatchModal () {
      this.addWatchModalVisible = false
      this.addWatchKeyword = ''
      this.addWatchResults = []
      this.addWatchSelected = null
      this.addWatchSearching = false
      this.addWatchSearchSeq += 1
      if (this.addWatchSearchTimer) {
        clearTimeout(this.addWatchSearchTimer)
        this.addWatchSearchTimer = null
      }
    },
    handleAddWatchMarketChange (market) {
      this.addWatchMarket = market
      this.addWatchKeyword = ''
      this.addWatchSelected = null
      this.addWatchSearchSeq += 1
      this.loadAddWatchHotSymbols()
    },
    handleAddWatchKeywordChange (event) {
      const value = event && event.target ? event.target.value : this.addWatchKeyword
      this.addWatchKeyword = value || ''
      if (this.addWatchSearchTimer) clearTimeout(this.addWatchSearchTimer)
      this.addWatchSearchTimer = setTimeout(() => {
        this.addWatchSearchTimer = null
        this.searchAddWatchSymbols(this.addWatchKeyword)
      }, 260)
    },
    handleAddWatchSearch (keyword) {
      if (this.addWatchSearchTimer) {
        clearTimeout(this.addWatchSearchTimer)
        this.addWatchSearchTimer = null
      }
      const kw = String(keyword != null ? keyword : this.addWatchKeyword).trim()
      this.addWatchKeyword = kw
      this.searchAddWatchSymbols(kw)
    },
    async loadAddWatchHotSymbols () {
      const seq = ++this.addWatchSearchSeq
      const market = this.addWatchMarket
      this.addWatchSearching = true
      try {
        const res = await getHotSymbols({ market, limit: 10 })
        if (seq !== this.addWatchSearchSeq || market !== this.addWatchMarket) return
        const data = res.data || {}
        const list = Array.isArray(data) ? data : (data.results || data.symbols || data.items || [])
        const normalized = list.map(x => this.normalizeSymbolOption({ ...x, market: x.market || market })).filter(Boolean)
        this.addWatchResults = mergeWatchlistSuggestions(market, normalized)
      } catch (_) {
        if (seq !== this.addWatchSearchSeq || market !== this.addWatchMarket) return
        this.addWatchResults = mergeWatchlistSuggestions(market)
      } finally {
        if (seq === this.addWatchSearchSeq && market === this.addWatchMarket) {
          this.addWatchSearching = false
        }
      }
    },
    async searchAddWatchSymbols (keyword) {
      const kw = String(keyword || '').trim()
      if (!kw) {
        await this.loadAddWatchHotSymbols()
        return
      }
      const seq = ++this.addWatchSearchSeq
      const market = this.addWatchMarket
      this.addWatchSearching = true
      this.addWatchSelected = null
      try {
        const res = await searchSymbols({ market, keyword: kw, limit: 16 })
        if (seq !== this.addWatchSearchSeq || market !== this.addWatchMarket || kw !== this.addWatchKeyword.trim()) return
        const data = res.data || {}
        const list = Array.isArray(data) ? data : (data.results || data.symbols || data.items || [])
        const normalized = list.map(x => this.normalizeSymbolOption({ ...x, market: x.market || market })).filter(Boolean)
        this.addWatchResults = normalized.length ? normalized : this.manualAddWatchFallback(market, kw)
      } catch (_) {
        if (seq !== this.addWatchSearchSeq || market !== this.addWatchMarket || kw !== this.addWatchKeyword.trim()) return
        this.addWatchResults = this.manualAddWatchFallback(market, kw)
      } finally {
        if (seq === this.addWatchSearchSeq && market === this.addWatchMarket) {
          this.addWatchSearching = false
        }
      }
    },
    manualAddWatchFallback (market, keyword) {
      const manualMarkets = ['Crypto', 'Forex', 'Futures', 'MOEX']
      if (!manualMarkets.includes(market)) return []
      return [{ market, symbol: String(keyword || '').trim().toUpperCase(), name: '' }]
    },
    selectAddWatchSymbol (item) {
      this.addWatchSelected = this.normalizeSymbolOption(item)
    },
    async confirmAddWatchSymbol () {
      const item = this.normalizeSymbolOption(this.addWatchSelected)
      if (!item || !item.symbol) {
        this.$message.warning(this.text.addWatchEmptyHint)
        return
      }
      this.addingWatch = true
      try {
        const res = await addWatchlist({
          market: item.market,
          symbol: item.symbol,
          name: item.name || item.symbol,
          exchange_id: item.exchange_id || '',
          market_type: item.market_type || '',
          instrument_id: item.instrument_id || '',
          settle_currency: item.settle_currency || ''
        })
        if (!res || res.code === 0) throw new Error((res && res.msg) || this.text.addWatchFailed)
        this.$message.success(this.text.addWatchSuccess)
        this.closeAddWatchModal()
        await this.loadWatchlist()
      } catch (e) {
        this.$message.error((e && e.response && e.response.data && e.response.data.msg) || (e && e.message) || this.text.addWatchFailed)
      } finally {
        this.addingWatch = false
      }
    },
    async removeWatch (item) {
      const normalized = this.normalizeSymbolOption(item)
      if (!normalized || !normalized.symbol) return
      try {
        const res = await removeWatchlist({
          market: normalized.market,
          symbol: normalized.symbol,
          exchange_id: normalized.exchange_id || '',
          market_type: normalized.market_type || '',
          instrument_id: normalized.instrument_id || ''
        })
        if (!res || res.code === 0) throw new Error((res && res.msg) || this.text.removeWatchFailed)
        this.$message.success(this.text.removeWatchSuccess)
        if (this.selectedSymbolValue === this.symbolOptionValue(normalized)) {
          this.selectedSymbolValue = ''
        }
        await this.loadWatchlist()
      } catch (e) {
        this.$message.error((e && e.response && e.response.data && e.response.data.msg) || (e && e.message) || this.text.removeWatchFailed)
      }
    },
    selectWatch (item) {
      const normalized = this.normalizeSymbolOption(item)
      this.context.market = normalized.market
      this.context.symbol = normalized.symbol
      this.selectedSymbolValue = this.symbolOptionValue(normalized)
      this.seedSymbolOptions()
    },
    askWatch (item) {
      this.selectWatch(item)
      this.usePrompt(this.i18nText(
        'aiAssetAnalysis.copilot.prompts.analyzeWatch',
        'Analyze {symbol}: trend, volume, support/resistance, risk, and whether entry is reasonable.',
        { symbol: item.symbol }
      ))
    },
    openEventDetail (event) {
      this.selectedEvent = event
      this.eventModalVisible = true
    },
    askAboutEvent (event, sendNow = false) {
      const title = this.eventTitle(event)
      const symbol = this.context.symbol || this.i18nText('aiAssetAnalysis.copilot.eventPreview.symbolFallback', 'the selected symbol')
      this.draft = this.i18nText(
        'aiAssetAnalysis.copilot.prompts.askAboutEvent',
        'Analyze how the economic event "{title}" may affect {symbol}, including directional bias, volatility window, risk points, and trading actions to avoid.',
        { title, symbol }
      )
      this.eventModalVisible = false
      if (sendNow) this.$nextTick(() => this.sendMessage())
    },
    eventPreview (event) {
      const impact = this.impactClass(event)
      const symbol = this.context.symbol || this.i18nText('aiAssetAnalysis.copilot.eventPreview.symbolFallback', 'the selected symbol')
      if (impact === 'high') return this.i18nText('aiAssetAnalysis.copilot.eventPreview.high', 'This is a high-impact event. Slippage and volatility may expand around {symbol}. Watch the window from 30 minutes before to 60 minutes after release.', { symbol })
      if (impact === 'low') return this.i18nText('aiAssetAnalysis.copilot.eventPreview.low', 'This event is usually low impact, but it may still support short-term moves if it matches the current market narrative.', { symbol })
      return this.i18nText('aiAssetAnalysis.copilot.eventPreview.medium', 'This event may create moderate volatility. Compare actual, forecast, and prevailing trend before forming a directional view.', { symbol })
    },
    usePrompt (prompt, options = {}) {
      this.draft = prompt
      const lockTarget = options && options.contextLock ? this.normalizeSymbolOption(options.contextLock) : null
      this.draftContextLock = lockTarget ? { ...lockTarget, locked: true } : null
      const localizedDraft = options && options.localizedDraft
      this.localizedDraft = localizedDraft
        ? { ...localizedDraft, lastValue: String(prompt || '') }
        : null
      this.$nextTick(() => {
        this.resizeComposer()
        if (this.$refs.composerInput) this.$refs.composerInput.focus()
      })
    },
    selectResearchMode (mode) {
      this.activeResearchMode = mode || 'research'
      this.recordCopilotEvent('mode_selected', this.activeResearchMode, {
        source: 'composer',
        mode: this.activeResearchMode
      })
    },
    useStarterPrompt (item) {
      if (!item || !item.prompt) return
      this.promptUsage = {
        ...this.promptUsage,
        [item.key]: Number(this.promptUsage[item.key] || 0) + 1
      }
      this.activeResearchMode = item.mode || this.activeResearchMode
      this.recordCopilotEvent('prompt_used', item.key, {
        source: 'welcome',
        mode: this.activeResearchMode,
        position: this.starterPrompts.findIndex(candidate => candidate.key === item.key)
      })
      this.usePrompt(item.prompt, {
        ...(this.normalizeSymbolOption(this.context) ? { contextLock: this.context } : {})
      })
    },
    useFollowupPrompt (item) {
      if (!item || !item.prompt) return
      this.activeResearchMode = item.mode || this.activeResearchMode
      this.recordCopilotEvent('followup_used', item.key, {
        source: 'followup',
        mode: this.activeResearchMode,
        has_report: !!(this.lastAssistantMessage && this.lastAssistantMessage.report)
      })
      this.usePrompt(item.prompt, {
        ...(this.normalizeSymbolOption(this.context) ? { contextLock: this.context } : {})
      })
    },
    async loadSavedPrompts () {
      this.loadingSavedPrompts = true
      try {
        const res = await getSavedPrompts({ limit: 50 })
        const data = res && res.data !== undefined ? res.data : res
        this.savedPrompts = Array.isArray(data) ? data : []
      } catch (_) {
        this.savedPrompts = []
      } finally {
        this.loadingSavedPrompts = false
      }
    },
    async loadPromptUsage () {
      try {
        const res = await getCopilotEventSummary()
        const data = res && res.data !== undefined ? res.data : res
        this.promptUsage = data && data.task_usage && typeof data.task_usage === 'object' ? data.task_usage : {}
      } catch (_) {}
    },
    recordCopilotEvent (eventType, taskKey = '', metadata = {}) {
      const target = this.normalizeSymbolOption(this.context) || {}
      trackCopilotEvent({
        event_type: eventType,
        task_key: taskKey,
        context: { market: target.market || '', symbol: target.symbol || '' },
        metadata: {
          ...metadata,
          locale: this.$i18n ? this.$i18n.locale : 'zh-CN',
          has_symbol: !!target.symbol
        }
      }).catch(() => {})
    },
    useSavedPrompt (item) {
      if (!item || !item.prompt) return
      const contextLock = item.context_symbol
        ? { market: item.context_market || this.context.market, symbol: item.context_symbol }
        : null
      this.usePrompt(item.prompt, contextLock ? { contextLock } : {})
      this.recordCopilotEvent('prompt_used', `saved_${item.id}`, {
        source: 'saved_prompt',
        mode: item.category || this.activeResearchMode
      })
    },
    promptForMessage (msg) {
      const index = (this.messages || []).indexOf(msg)
      if (index < 0) return ''
      for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
        const candidate = this.messages[cursor]
        if (candidate && candidate.role === 'user' && String(candidate.content || '').trim()) {
          return String(candidate.content).trim()
        }
      }
      return ''
    },
    async savePromptForMessage (msg) {
      const prompt = this.promptForMessage(msg)
      if (!prompt) return
      const target = this.normalizeSymbolOption(this.context) || {}
      try {
        const res = await savePrompt({
          title: prompt.replace(/\s+/g, ' ').slice(0, 80),
          prompt,
          category: this.activeResearchMode,
          context: { market: target.market || '', symbol: target.symbol || '' }
        })
        const item = res && res.data !== undefined ? res.data : res
        if (item && item.id) this.savedPrompts = [item, ...this.savedPrompts.filter(saved => saved.id !== item.id)]
        this.recordCopilotEvent('prompt_saved', `saved_${item && item.id ? item.id : 'new'}`, {
          source: 'message_action',
          mode: this.activeResearchMode
        })
        this.$message.success(this.text.promptSaved)
      } catch (_) {
        this.$message.error(this.text.promptSaveFailed)
      }
    },
    async removeSavedPrompt (item) {
      if (!item || !item.id) return
      try {
        await deleteSavedPrompt(item.id)
        this.savedPrompts = this.savedPrompts.filter(saved => saved.id !== item.id)
        this.$message.success(this.text.promptDeleted)
      } catch (_) {
        this.$message.error(this.text.promptSaveFailed)
      }
    },
    async copyMessageContent (msg) {
      const content = String((msg && msg.content) || '').trim()
      if (!content) return
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(content)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = content
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        this.$message.success(this.text.answerCopied)
      } catch (_) {
        this.$message.error(this.i18nText('aiAssetAnalysis.copilot.copyFailed', 'Copy failed'))
      }
    },
    refreshLocalizedDraft () {
      const descriptor = this.localizedDraft
      if (!descriptor || String(this.draft || '') !== String(descriptor.lastValue || '')) {
        this.localizedDraft = null
        return
      }
      let next = ''
      if (descriptor.type === 'analysis') {
        next = this.buildAnalysisPrompt(descriptor.target || null)
      }
      if (!next) return
      this.draft = next
      this.localizedDraft = { ...descriptor, lastValue: next }
      this.$nextTick(this.resizeComposer)
    },
    async loadAgentPreflight () {
      try {
        const res = await getAgentPreflight()
        this.agentPreflight = res.data || res
      } catch (_) {
        this.agentPreflight = null
      }
    },
    async loadUserMemories () {
      try {
        const res = await getUserMemory()
        const data = res.data || res
        this.userMemories = (data && data.items) || []
      } catch (_) {
        this.userMemories = []
      }
    },
    async loadSessionMemory () {
      if (!this.sessionId) {
        this.sessionMemory = { summary: {}, recent_requests: [], version: 0 }
        return
      }
      this.loadingSessionMemory = true
      try {
        const res = await getChatSessionMemory(this.sessionId)
        this.sessionMemory = (res && res.data) || { summary: {}, recent_requests: [], version: 0 }
      } catch (_) {
        this.sessionMemory = { summary: {}, recent_requests: [], version: 0 }
      } finally {
        this.loadingSessionMemory = false
      }
    },
    async openMemoryManager () {
      this.memoryManagerVisible = true
      await Promise.all([this.loadUserMemories(), this.loadSessionMemory()])
    },
    async clearCurrentSessionMemory () {
      if (!this.sessionId) return
      try {
        await clearChatSessionMemory(this.sessionId)
        this.sessionMemory = { summary: {}, recent_requests: [], version: Number(this.sessionMemory.version || 0) + 1 }
        this.$message.success(this.text.sessionMemoryCleared)
      } catch (e) {
        this.$message.error((e && e.message) || this.text.chatUnavailable)
      }
    },
    async saveMemoryEdit (item) {
      if (!item || !item.id || !String(item.title || '').trim() || !String(item.content || '').trim()) return
      try {
        await updateUserMemory(item.id, {
          title: String(item.title).trim(),
          content: String(item.content).trim(),
          category: item.category || 'preference'
        })
        this.$message.success(this.text.memoryUpdated)
      } catch (e) {
        this.$message.error((e && e.message) || this.text.memorySaveFailed)
      }
    },
    async removeLongTermMemory (item) {
      if (!item || !item.id) return
      try {
        await deleteUserMemory(item.id)
        this.userMemories = this.userMemories.filter(memory => memory.id !== item.id)
        this.$message.success(this.text.memoryDeleted)
      } catch (e) {
        this.$message.error((e && e.message) || this.text.memorySaveFailed)
      }
    },
    buildPreflightGuide (task = null) {
      const status = this.agentPreflight || {}
      const blockers = Array.isArray(status.blockers) ? status.blockers : []
      const warnings = Array.isArray(status.warnings) ? status.warnings : []
      if (!blockers.length && !warnings.length) return null
      const lines = []
      const actions = []
      lines.push(`## ${this.i18nText('aiCopilot.preflight.title', 'Setup Check')}`, '')
      if (blockers.length) {
        lines.push(this.i18nText('aiCopilot.preflight.blockersIntro', 'These items need attention before the AI workflow can run:'))
      }
      blockers.forEach(item => {
        const isCredits = this.isCreditPreflightItem(item)
        const title = isCredits
          ? this.i18nText('aiCopilot.preflight.creditsTitle', 'Insufficient credits')
          : (item.title || item.key)
        const message = isCredits
          ? this.i18nText('aiCopilot.preflight.creditsMessage', 'You do not have enough credits to run AI analysis or strategy generation. Top up credits to continue.')
          : (item.message || '')
        lines.push(`- **${title}**: ${message}`)
        if (isCredits) {
          this.pushPreflightAction(actions, this.setupAction('billing'))
          this.pushPreflightAction(actions, this.setupAction('credits'))
        } else if (item.action && item.action.path) {
          this.pushPreflightAction(actions, {
            key: `fix-${item.key}`,
            icon: item.action.icon || 'setting',
            label: this.i18nText('aiCopilot.preflight.configureAction', 'Configure'),
            path: item.action.path,
            query: item.action.query || {}
          })
        }
      })
      if (warnings.length) {
        lines.push('', this.i18nText('aiCopilot.preflight.recommendedNext', 'Recommended next:'))
        warnings.slice(0, 4).forEach(item => {
          const isCredits = this.isCreditPreflightItem(item)
          lines.push(`- ${isCredits ? this.i18nText('aiCopilot.preflight.creditsMessage', 'You do not have enough credits to run AI analysis or strategy generation. Top up credits to continue.') : (item.message || item.key)}`)
          if (isCredits) {
            this.pushPreflightAction(actions, this.setupAction('billing'))
            this.pushPreflightAction(actions, this.setupAction('credits'))
          } else if (item.action && item.action.path) {
            this.pushPreflightAction(actions, {
              key: `open-${item.key}`,
              icon: item.action.icon || 'arrow-right',
              label: this.i18nText('aiCopilot.preflight.openAction', 'Open'),
              path: item.action.path,
              query: item.action.query || {}
            })
          }
        })
      }
      if (task) {
        lines.push('', this.i18nText('aiCopilot.preflight.taskContinue', 'You can still discuss strategy ideas, but complete the items above before code generation, analysis, or task creation.'))
      }
      return {
        content: lines.join('\n'),
        actions,
        meta: this.i18nText('aiCopilot.preflight.meta', 'setup preflight')
      }
    },
    isCreditPreflightItem (item) {
      const actionPath = item && item.action && item.action.path ? item.action.path : ''
      const text = [
        item && item.key,
        item && item.title,
        item && item.message,
        actionPath
      ].filter(Boolean).join(' ').toLowerCase()
      return /credit|credits|billing|quota|payment|top\s*up|vip|积分|余额不足|额度|充值|会员|扣费/.test(text)
    },
    pushPreflightAction (actions, action) {
      if (!action) return
      const exists = actions.some(item => item.key === action.key || (item.path === action.path && JSON.stringify(item.query || {}) === JSON.stringify(action.query || {})))
      if (!exists) actions.push(action)
    },
    appendMemoryActions (assistantMsg, candidates) {
      const list = Array.isArray(candidates) ? candidates : []
      if (!list.length) return
      assistantMsg.actions = assistantMsg.actions || []
      list.slice(0, 2).forEach((candidate, index) => {
        assistantMsg.actions.push({
          key: `save-memory-${Date.now()}-${index}`,
          type: 'save_memory',
          icon: 'pushpin',
          label: this.i18nText('aiAssetAnalysis.copilot.rememberPreference', 'Remember this'),
          payload: candidate
        })
      })
    },
    appendAgentNextActions (assistantMsg) {
      const task = this.pendingAgentTask
      if (!task || task.type !== 'strategy_design') return
      const labels = {
        indicator: this.i18nText('aiAssetAnalysis.copilot.actions.generateChartIndicator', 'Generate chart indicator code'),
        script: this.i18nText('aiAssetAnalysis.copilot.actions.generateStrategyV2', 'Generate trading script')
      }
      const targetType = task.targetType || 'indicator'
      assistantMsg.actions = assistantMsg.actions || []
      assistantMsg.actions.push({
        key: `generate-strategy-${Date.now()}`,
        type: 'generate_code',
        icon: 'code',
        label: labels[targetType] || labels.indicator,
        payload: {
          task: { ...task, targetType },
          prompt: task.originalPrompt || this.draft
        }
      })
    },
    isAllowedMessageActionPath (path) {
      const allowed = [
        '/settings',
        '/broker-accounts',
        '/billing',
        '/profile',
        '/indicator-ide',
        '/strategy-ide',
        '/strategy-center',
        '/user/login'
      ]
      return allowed.includes(String(path || ''))
    },
    isAllowedMessageStorageKey (key) {
      const allowedPrefixes = [
        'qd_copilot_'
      ]
      return allowedPrefixes.some(prefix => String(key || '').startsWith(prefix))
    },
    normalizeStrategyWorkflowAction (action) {
      const next = {
        ...action,
        query: { ...((action && action.query) || {}) }
      }
      const path = String((action && action.path) || '')
      const storageKey = String((action && action.storageKey) || '')
      const tab = String(next.query.tab || '').toLowerCase()

      if (path === '/indicator-ide') {
        delete next.query.tab
      } else if (path === '/strategy-ide') {
        if (['template', 'preset'].includes(tab) || String(next.query.aiPreset || '') === '1') {
          next.query.tab = 'script'
        } else if (['script', 'scripts', 'strategy-script'].includes(tab) || storageKey === 'qd_strategy_source') {
          next.query.tab = 'script'
          next.query.draft = '1'
          delete next.query.aiDraft
          delete next.query.source_id
          delete next.query.sourceId
          delete next.query.strategy_id
          delete next.query.strategyId
        } else if (['indicator', 'indicator-ide'].includes(tab) || storageKey === 'qd_copilot_indicator_code') {
          next.path = '/indicator-ide'
          delete next.query.tab
        }
      }
      if (next.query.tab === 'script') {
        delete next.query.aiPreset
        delete next.query.indicator_id
        delete next.query.strategy_id
      } else if (next.query.tab === 'indicator') {
        delete next.query.aiPreset
        delete next.query.source_id
        delete next.query.strategy_id
        delete next.query.template
      }
      return next
    },
    runMessageAction (action, msg = null) {
      if (action && action.type === 'save_memory') {
        this.saveMemoryAction(action.payload || {})
        return
      }
      if (action && action.type === 'generate_code') {
        this.generateStrategyFromAction(action.payload || {})
        return
      }
      if (action && action.type === 'create_monitor_task') {
        this.createMonitorFromAction(action.payload || {})
        return
      }
      if (action && action.type === 'export_report_pdf') {
        this.exportReportPdf(action.payload && action.payload.reportId)
        return
      }
      if (action && action.type === 'share_report') {
        this.shareReport(action.payload && action.payload.reportId)
        return
      }
      if (action && action.type === 'ask_about_report') {
        this.askAboutReport(action.payload && action.payload.reportId)
        return
      }
      if (!action || !action.path) return
      const normalizedAction = this.normalizeStrategyWorkflowAction(this.hydrateMessageAction(action, msg))
      if (!this.isAllowedMessageActionPath(normalizedAction.path)) {
        this.$message.warning(this.i18nText('aiAssetAnalysis.copilot.actionNotAllowed', 'This action is not allowed'))
        return
      }
      try {
        if (normalizedAction.storageKey && this.isAllowedMessageStorageKey(normalizedAction.storageKey)) {
          const value = typeof normalizedAction.storageValue === 'string' ? normalizedAction.storageValue : JSON.stringify(normalizedAction.storageValue || {})
          sessionStorage.setItem(normalizedAction.storageKey, value)
        }
        Object.keys(normalizedAction.extraStorage || {}).forEach(key => {
          if (this.isAllowedMessageStorageKey(key)) {
            if (key === 'qd_copilot_indicator_prompt') return
            sessionStorage.setItem(key, normalizedAction.extraStorage[key])
          }
        })
      } catch (_) {}
      this.$router.push({ path: normalizedAction.path, query: normalizedAction.query || {} })
    },
    hydrateMessageAction (action, msg = null) {
      const next = {
        ...action,
        query: { ...((action && action.query) || {}) },
        extraStorage: { ...((action && action.extraStorage) || {}) }
      }
      const path = String(next.path || '')
      const code = this.strategyCodeForMessage(msg)
      const hasStoredCode = typeof next.storageValue === 'string'
        ? !!next.storageValue.trim()
        : !!next.storageValue
      if (!hasStoredCode && code) {
        next.storageValue = code
      }
      if (!next.storageKey && code) {
        if (path === '/strategy-ide') {
          next.storageKey = 'qd_strategy_source'
          next.extraStorage.qd_copilot_script_strategy_meta = JSON.stringify(this.inferScriptDraftMetaFromMessage(msg))
          next.query = { ...next.query, tab: 'script', draft: '1' }
        } else if (path === '/indicator-ide') {
          next.storageKey = 'qd_copilot_indicator_code'
        }
      }
      return next
    },
    inferScriptDraftMetaFromMessage (msg = null) {
      const content = String((msg && msg.content) || '')
      const inferred = this.inferSymbolFromText(content) || this.normalizeSymbolOption(this.context) || {}
      return {
        symbol: inferred.symbol || this.context.symbol || '',
        market: inferred.market || this.context.market || '',
        name: inferred.symbol ? `${inferred.symbol} ${this.text.scriptStrategy}` : this.text.scriptStrategy
      }
    },
    workflowActionForMessage (msg) {
      const actions = Array.isArray(msg && msg.actions) ? msg.actions : []
      return actions.find(action => {
        const path = String(action && action.path ? action.path : '')
        return action && (
          action.group === 'strategy_workflow' ||
          path === '/indicator-ide' ||
          path === '/strategy-ide'
        )
      }) || null
    },
    agentUsageAction (msg) {
      const actions = Array.isArray(msg && msg.actions) ? msg.actions : []
      return actions.find(action => action && action.type === 'agent_usage') || null
    },
    agentUsageItems (msg) {
      const action = this.agentUsageAction(msg)
      const payload = action && action.payload ? action.payload : {}
      const normalize = (items, kind) => (Array.isArray(items) ? items : [])
        .map(item => ({
          kind,
          id: String((item && item.id) || '').trim(),
          label: String((item && (item.label || item.id)) || '').trim()
        }))
        .filter(item => item.id && item.label)
      return [
        ...normalize(payload.skills, 'skill'),
        ...normalize(payload.tools, 'tool')
      ].slice(0, 8)
    },
    visibleMessageActions (msg) {
      const actions = Array.isArray(msg && msg.actions) ? msg.actions : []
      return actions.filter(action => action && !['generate_code', 'agent_usage'].includes(action.type))
    },
    messageActionLabel (action) {
      const type = String((action && action.type) || '')
      if (type === 'export_report_pdf') {
        return this.i18nText('aiAssetAnalysis.copilot.exportPdf', 'Export PDF')
      }
      if (type === 'share_report') {
        return this.$t('aiAssetAnalysis.copilot.shareReport')
      }
      if (type === 'ask_about_report') {
        return this.i18nText('aiAssetAnalysis.copilot.askFollowup', 'Ask follow-up')
      }
      if (type === 'save_memory') {
        return this.i18nText('aiAssetAnalysis.copilot.rememberPreference', 'Remember this')
      }
      if (type === 'create_monitor_task') {
        return this.i18nText('aiAssetAnalysis.copilot.monitorCreateAction', 'Create task')
      }
      return String((action && action.label) || '')
    },
    strategyCodeForMessage (msg) {
      const action = this.workflowActionForMessage(msg)
      if (action && typeof action.storageValue === 'string' && action.storageValue.trim()) return action.storageValue
      if (action && action.storageValue && typeof action.storageValue === 'object') return JSON.stringify(action.storageValue, null, 2)
      return this.extractFirstCodeBlock(msg && msg.content)
    },
    extractFirstCodeBlock (content) {
      const match = String(content || '').match(/```(?:\w+)?\s*([\s\S]*?)```/)
      return match ? match[1].trim() : ''
    },
    async copyStrategyCode (msg) {
      const code = this.strategyCodeForMessage(msg)
      if (!code) return
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(code)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = code
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        this.$message.success(this.i18nText('aiAssetAnalysis.copilot.codeCopied', 'Code copied'))
      } catch (_) {
        this.$message.error(this.i18nText('aiAssetAnalysis.copilot.copyFailed', 'Copy failed'))
      }
    },
    async saveMemoryAction (payload) {
      if (!payload || !payload.content) return
      try {
        await saveUserMemory({
          category: payload.category || 'preference',
          title: payload.title || this.i18nText('aiAssetAnalysis.copilot.tradingPreference', 'Trading preference'),
          content: payload.content,
          confidence: payload.confidence || 70
        })
        this.$message.success(this.i18nText('aiAssetAnalysis.copilot.memorySaved', 'Saved to memory'))
        this.loadUserMemories()
      } catch (e) {
        this.$message.error(this.i18nText('aiAssetAnalysis.copilot.memorySaveFailed', 'Failed to save memory'))
      }
    },
    async generateStrategyFromAction (payload) {
      const task = payload.task || this.pendingAgentTask
      const target = this.normalizeSymbolOption((task && task.target) || this.context)
      const prompt = payload.prompt || this.draft || (task && task.originalPrompt) || ''
      if (!task || !target || !target.symbol) {
        this.$message.warning(this.text.symbolPlaceholder)
        return
      }
      if (task.targetType === 'indicator') {
        await this.generateChartIndicatorDraft(prompt, target)
      } else {
        await this.generateStrategyV2Draft(prompt, target)
      }
      this.clearPendingAgentTask()
    },
    clearPendingAgentTask () {
      this.pendingAgentTask = null
      this.monitorSetupDraft = null
    },
    isMonitorIntent (text) {
      const value = String(text || '').toLowerCase()
      return /(\u5b9a\u65f6|\u5b9a\u671f|\u5468\u671f|\u63d0\u9192|\u901a\u77e5|\u76d1\u63a7|\u8ddf\u8e2a|\u8ffd\u8e2a|scheduled|schedule|monitor|alert)/i.test(value) &&
        /(ai|\u5206\u6790|analysis|scan|\u4efb\u52a1|task)/i.test(value)
    },
    normalizeMonitorChannels (channels) {
      const alias = {
        in_app: 'browser',
        app: 'browser',
        site: 'browser',
        mail: 'email',
        tg: 'telegram',
        lark: 'webhook',
        feishu: 'webhook',
        dingtalk: 'webhook',
        wecom: 'webhook'
      }
      const allowed = new Set(['browser', 'email', 'telegram', 'webhook'])
      const raw = Array.isArray(channels) ? channels : (channels ? [channels] : [])
      return Array.from(new Set(raw
        .map(channel => alias[String(channel || '').trim().toLowerCase()] || String(channel || '').trim().toLowerCase())
        .filter(channel => allowed.has(channel))))
    },
    monitorChannelLabel (channel) {
      const labels = {
        browser: this.text.notifyBrowser,
        email: this.text.notifyEmail,
        telegram: this.text.notifyTelegram,
        webhook: this.text.notifyWebhook
      }
      return labels[channel] || channel
    },
    createMonitorSetupDraft (target) {
      return {
        target: this.normalizeSymbolOption(target || this.context),
        interval_min: null,
        notify_channels: []
      }
    },
    mergeMonitorSetupDraft (current, next, rawText) {
      const merged = {
        ...(current || this.createMonitorSetupDraft()),
        target: this.normalizeSymbolOption((current && current.target) || (next && next.target) || this.context)
      }
      if (next && next.interval_min) merged.interval_min = next.interval_min
      if (next && Array.isArray(next.notify_channels) && next.notify_channels.length) {
        merged.notify_channels = this.normalizeMonitorChannels([...(merged.notify_channels || []), ...next.notify_channels])
      } else if (/(\u53ea\u8bb0\u5f55|\u50c5\u8a18\u9304|\u4e0d\u901a\u77e5|record only|no notification)/i.test(rawText || '')) {
        merged.notify_channels = []
        merged.record_only = true
      }
      return merged
    },
    parseMonitorInterval (text) {
      const value = String(text || '')
      const compact = value.trim().toLowerCase()
      const shortMatch = compact.match(/^(?:interval\s*[:\uFF1A]?\s*)?(\d+)\s*(m|min|minute|minutes|h|hour|hours|d|day|days)$/i)
      if (shortMatch) {
        const n = Number(shortMatch[1])
        const unit = shortMatch[2]
        if (/^h|hour/.test(unit)) return n * 60
        if (/^d|day/.test(unit)) return n * 1440
        return n
      }
      const intervalMatch = value.match(/(\d+)\s*(\u5206\u949f|\u5206|\u5c0f\u65f6|\u5c0f\u6642|\u6642|h|hour|hours|min|minute|minutes)/i)
      if (intervalMatch) {
        const n = Number(intervalMatch[1])
        const unit = String(intervalMatch[2] || '').toLowerCase()
        return /(\u5c0f\u65f6|\u5c0f\u6642|\u6642|h|hour)/i.test(unit) ? n * 60 : n
      }
      if (/(\u6bcf\u5929|\u6bcf\u65e5|\u6bcf\u65e5\u4e00\u6b21|daily|day)/i.test(value)) return 1440
      return null
    },
    parseMonitorChannels (text) {
      const value = String(text || '')
      const channels = []
      if (/(\u7ad9\u5185|\u7ad9\u5167|\u6d4f\u89c8\u5668|\u700f\u89bd\u5668|browser|site)/i.test(value)) channels.push('browser')
      if (/(\u90ae\u4ef6|\u90f5\u4ef6|\u90ae\u7bb1|\u4fe1\u7bb1|email)/i.test(value)) channels.push('email')
      if (/(telegram|tg)/i.test(value)) channels.push('telegram')
      if (/(webhook|\u56de\u8c03|\u98de\u4e66|\u98db\u66f8|\u9489\u9489|\u91d8\u91d8|\u4f01\u5fae|wecom|lark|feishu|dingtalk)/i.test(value)) channels.push('webhook')
      return this.normalizeMonitorChannels(channels)
    },
    parseMonitorSetup (text) {
      const value = String(text || '')
      const interval = this.parseMonitorInterval(value)
      const channels = this.parseMonitorChannels(value)
      return {
        interval_min: interval,
        notify_channels: this.normalizeMonitorChannels(channels)
      }
    },
    buildMonitorQuestion (target) {
      const label = target && target.symbol ? (target.market + ':' + target.symbol) : this.i18nText('aiAssetAnalysis.copilot.eventPreview.symbolFallback', 'current symbol')
      return this.i18nText('aiAssetAnalysis.copilot.monitorQuestion', [
        'Sure. I will prepare an AI scheduled analysis task for **{label}**.',
        '',
        'Please provide:',
        '1. Interval: 15m / 30m / 1h / 4h / daily',
        '2. Notification: browser / email / telegram / webhook / record only',
        '',
        'Example:',
        'Interval: 1h',
        'Notification: browser'
      ].join('\n'), { label })
    },
    buildMonitorDraftMessage (payload) {
      const target = this.normalizeSymbolOption(payload.target || payload)
      const channels = this.normalizeMonitorChannels(payload.notify_channels || payload.channels || [])
      return this.i18nText('aiAssetAnalysis.copilot.monitorDraft', [
        '## AI Scheduled Analysis Draft',
        '',
        '- Symbol: {symbol}',
        '- Interval: {interval}',
        '- Notification: {notification}',
        '',
        'This task will periodically run the standard AI symbol diagnosis.'
      ].join('\n'), {
        symbol: target.market + ':' + target.symbol,
        interval: this.formatIntervalText(payload.interval_min),
        notification: channels.length ? channels.map(channel => this.monitorChannelLabel(channel)).join(', ') : this.i18nText('aiAssetAnalysis.copilot.monitorNoNotify', 'record only')
      })
    },
    monitorDraftSummary (draft) {
      const parts = []
      if (draft && draft.interval_min) {
        parts.push(this.i18nText('aiAssetAnalysis.copilot.monitorReceivedInterval', 'interval {interval}', {
          interval: this.formatIntervalText(draft.interval_min)
        }))
      }
      if (draft && (draft.record_only || (draft.notify_channels && draft.notify_channels.length))) {
        parts.push(this.i18nText('aiAssetAnalysis.copilot.monitorReceivedNotification', 'notification {notification}', {
          notification: draft.record_only ? this.i18nText('aiAssetAnalysis.copilot.monitorNoNotify', 'record only') : this.normalizeMonitorChannels(draft.notify_channels).map(channel => this.monitorChannelLabel(channel)).join(', ')
        }))
      }
      return parts.length ? parts.join(' / ') : this.i18nText('aiAssetAnalysis.copilot.monitorReceivedNone', 'nothing yet')
    },
    async handleMonitorAgentMessage (content) {
      const isExistingTask = this.pendingAgentTask && this.pendingAgentTask.type === 'monitor_setup'
      if (!isExistingTask && !this.isMonitorIntent(content)) return false
      const target = this.normalizeSymbolOption((this.pendingAgentTask && this.pendingAgentTask.target) || this.context)
      if (!target || !target.symbol) {
        this.messages.push({
          localId: 'local-' + localId++,
          role: 'assistant',
          content: this.i18nText(
            'aiAssetAnalysis.copilot.monitorMissingSymbol',
            'I can create an AI scheduled analysis task, but no symbol is selected. Choose a data context or mention a symbol like Crypto:BTC/USDT.'
          ),
          meta: this.i18nText('aiAssetAnalysis.copilot.missingSymbolMeta', 'missing symbol'),
          created_at: new Date().toISOString()
        })
        return true
      }
      if (!isExistingTask) {
        this.pendingAgentTask = {
          type: 'monitor_setup',
          target,
          required: ['interval_min', 'notify_channels']
        }
        this.monitorSetupDraft = this.createMonitorSetupDraft(target)
        this.messages.push({
          localId: 'local-' + localId++,
          role: 'assistant',
          content: this.buildMonitorQuestion(target),
          meta: this.i18nText('aiAssetAnalysis.copilot.monitorWaitingMeta', 'waiting for task parameters'),
          created_at: new Date().toISOString()
        })
        return true
      }
      const parsed = this.parseMonitorSetup(content)
      const draft = this.mergeMonitorSetupDraft(this.monitorSetupDraft, parsed, content)
      this.monitorSetupDraft = draft
      const missing = []
      if (!draft.interval_min) missing.push(this.i18nText('aiAssetAnalysis.copilot.monitorMissingInterval', 'interval'))
      if (!draft.record_only && !draft.notify_channels.length) missing.push(this.i18nText('aiAssetAnalysis.copilot.monitorMissingNotification', 'notification'))
      if (missing.length) {
        this.messages.push({
          localId: 'local-' + localId++,
          role: 'assistant',
          content: this.i18nText(
            'aiAssetAnalysis.copilot.monitorStillMissing',
            'Received: {received}\n\nStill missing: {items}.\n\nSend the missing items and I will prepare the final task draft.',
            {
              received: this.monitorDraftSummary(draft),
              items: missing.join(', ')
            }
          ),
          meta: this.i18nText('aiAssetAnalysis.copilot.monitorIncompleteMeta', 'incomplete parameters'),
          created_at: new Date().toISOString()
        })
        return true
      }
      const payload = {
        target,
        interval_min: draft.interval_min,
        notify_channels: draft.record_only ? [] : this.normalizeMonitorChannels(draft.notify_channels),
        name: 'AI-' + target.symbol + '-' + draft.interval_min + 'm'
      }
      this.messages.push({
        localId: 'local-' + localId++,
        role: 'assistant',
        content: this.buildMonitorDraftMessage(payload),
        actions: [{
          key: 'create-monitor-' + Date.now(),
          type: 'create_monitor_task',
          icon: 'clock-circle',
          label: this.i18nText('aiAssetAnalysis.copilot.monitorCreateAction', 'Create task'),
          payload
        }],
        meta: this.i18nText('aiAssetAnalysis.copilot.monitorReadyMeta', 'ready to create'),
        created_at: new Date().toISOString()
      })
      return true
    },
    async createMonitorFromAction (payload) {
      const rawTarget = payload.target || {
        market: payload.market || payload.selected_market || payload.resolved_market || (this.context && this.context.market),
        symbol: payload.symbol || payload.ticker || payload.code || payload.resolved_symbol || (this.context && this.context.symbol)
      }
      const target = this.normalizeSymbolOption(rawTarget)
      if (!target || !target.symbol) {
        this.$message.warning(this.text.symbolPlaceholder)
        return
      }
      try {
        const interval = Number(payload.interval_min || payload.interval || payload.run_interval_minutes || 240)
        const channels = this.normalizeMonitorChannels(Array.isArray(payload.notify_channels)
          ? payload.notify_channels
          : (Array.isArray(payload.channels) ? payload.channels : []))
        const res = await addMonitor({
          name: payload.name || ('AI-' + target.symbol + '-' + interval + 'm'),
          position_ids: [],
          monitor_type: 'ai',
          config: {
            run_interval_minutes: interval,
            symbol: target.symbol,
            market: target.market,
            focus_conditions: '',
            language: this.$store && this.$store.getters ? (this.$store.getters.lang || 'zh-CN') : (this.$i18n ? this.$i18n.locale : 'zh-CN')
          },
          notification_config: { channels },
          is_active: true
        })
        if (!res || res.code === 0) throw new Error((res && res.msg) || this.text.monitorCreated)
        this.$message.success(this.text.monitorCreated)
        this.clearPendingAgentTask()
        await this.loadMonitors()
        const message = {
          localId: 'local-' + localId++,
          role: 'assistant',
          content: this.i18nText(
            'aiAssetAnalysis.copilot.monitorCreatedMessage',
            'AI scheduled analysis task created:\n\n- Symbol: {symbol}\n- Interval: {interval}\n- Notifications: {notification}\n\nYou can pause, delete, or inspect it in the AI Scheduled Analysis panel.',
            {
              symbol: target.market + ':' + target.symbol,
              interval: this.formatIntervalText(interval),
              notification: channels.length ? channels.map(channel => this.monitorChannelLabel(channel)).join(', ') : this.i18nText('aiAssetAnalysis.copilot.monitorNoNotify', 'record only')
            }
          ),
          meta: this.i18nText('aiAssetAnalysis.copilot.monitorCreatedMeta', 'task created'),
          created_at: new Date().toISOString()
        }
        this.messages.push(message)
        await this.persistCopilotMessage(message, 'monitor_created')
      } catch (e) {
        this.$message.error((e && e.response && e.response.data && e.response.data.msg) || (e && e.message) || 'Create monitor failed')
      }
    },
    cleanMarkdownCodeBlocks (code) {
      if (!code || typeof code !== 'string') return code || ''
      let c = code.trim()
      if (c.startsWith('```python')) c = c.slice(9)
      else if (c.startsWith('```')) c = c.slice(3)
      if (c.endsWith('```')) c = c.slice(0, -3)
      return c.trim()
    },
    inferSymbolFromText (text) {
      const value = String(text || '').toUpperCase()
      const pair = value.match(/\b[A-Z0-9]{2,12}\/[A-Z0-9]{2,12}\b/)
      if (pair) return { market: 'Crypto', symbol: pair[0] }
      const usdAsset = value.match(/\b([A-Z]{2,10})-USD\b/)
      if (usdAsset) {
        const base = usdAsset[1]
        if (['BTC', 'ETH', 'SOL', 'TON', 'HYPE', 'DOGE', 'XRP', 'BNB', 'ADA', 'AVAX'].includes(base)) {
          return { market: 'Crypto', symbol: `${base}/USDT` }
        }
        return { market: 'USStock', symbol: base }
      }
      const marketPair = value.match(/\b(CRYPTO|USSTOCK|HKSTOCK|CNSTOCK|FOREX|FUTURES):([A-Z0-9./_-]{2,24})\b/)
      if (marketPair) return { market: marketPair[1], symbol: marketPair[2] }
      const cnCode = value.match(/(?:^|[^\d])([036]\d{5})(?:[^\d]|$)/)
      if (cnCode) return { market: 'CNStock', symbol: cnCode[1] }
      const hkCode = value.match(/(?:^|[^\d])(\d{5})(?:[^\d]|$)/)
      if (hkCode) return { market: 'HKStock', symbol: hkCode[1] }
      const plainTicker = value.trim().match(/^[A-Z][A-Z0-9.-]{0,9}$/)
      if (plainTicker) {
        const symbol = plainTicker[0]
        const cryptoBases = ['BTC', 'ETH', 'SOL', 'TON', 'HYPE', 'DOGE', 'XRP', 'BNB', 'ADA', 'AVAX']
        return cryptoBases.includes(symbol)
          ? { market: 'Crypto', symbol: `${symbol}/USDT` }
          : { market: 'USStock', symbol }
      }
      return null
    },
    commonSymbolAliases () {
      return [
        { keys: ['英伟达', '輝達', 'nvidia', 'nvda'], market: 'USStock', symbol: 'NVDA', name: 'NVIDIA' },
        { keys: ['特斯拉', 'tesla', 'tsla'], market: 'USStock', symbol: 'TSLA', name: 'Tesla' },
        { keys: ['苹果', '蘋果', 'apple', 'aapl'], market: 'USStock', symbol: 'AAPL', name: 'Apple' },
        { keys: ['微软', '微軟', 'microsoft', 'msft'], market: 'USStock', symbol: 'MSFT', name: 'Microsoft' },
        { keys: ['谷歌', 'google', 'alphabet', 'googl'], market: 'USStock', symbol: 'GOOGL', name: 'Alphabet' },
        { keys: ['亚马逊', '亞馬遜', 'amazon', 'amzn'], market: 'USStock', symbol: 'AMZN', name: 'Amazon' },
        { keys: ['meta', 'facebook', '脸书', '臉書'], market: 'USStock', symbol: 'META', name: 'Meta' },
        { keys: ['宁德时代', '寧德時代', 'catl'], market: 'CNStock', symbol: '300750', name: '宁德时代' },
        { keys: ['茅台', '贵州茅台', '貴州茅台'], market: 'CNStock', symbol: '600519', name: '贵州茅台' },
        { keys: ['比特币', '比特幣', 'bitcoin', 'btc'], market: 'Crypto', symbol: 'BTC/USDT', name: 'Bitcoin' },
        { keys: ['以太坊', 'ethereum', 'eth'], market: 'Crypto', symbol: 'ETH/USDT', name: 'Ethereum' },
        { keys: ['黄金', '黃金', 'gold', 'xau'], market: 'Forex', symbol: 'XAUUSD', name: 'Gold/USD' }
      ]
    },
    normalizeSearchText (text) {
      return String(text || '')
        .replace(/[，。！？、；：,.!?;:"'`~()[\]{}<>]/g, ' ')
        .replace(/\b(analyze|analysis|stock|price|trend|today|current|please|for|of|the)\b/gi, ' ')
        .replace(/请|幫|帮|我|看|分析|一下|当前|今天|现在|目前|股票|股价|价格|多少钱|多少|走势|趋势|这个|那个|的|是|如何|怎么样|怎麼樣|能不能|可以|查|查询|行情/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    },
    symbolSearchCandidates (message) {
      const raw = String(message || '').trim()
      const cleaned = this.normalizeSearchText(raw)
      const candidates = []
      ;[cleaned, raw].forEach(value => {
        if (value && value.length >= 2 && value.length <= 32) candidates.push(value)
      })
      const codeTokens = raw.match(/[A-Za-z][A-Za-z0-9._-]{1,12}/g) || []
      codeTokens.forEach(x => candidates.push(x))
      const zhTokens = raw.match(/[\u4e00-\u9fa5]{2,12}/g) || []
      zhTokens.forEach(x => {
        const y = this.normalizeSearchText(x)
        if (y) candidates.push(y)
      })
      return Array.from(new Set(candidates.map(x => String(x).trim()).filter(x => x.length >= 2))).slice(0, 5)
    },
    findLocalSymbolMatch (message) {
      const raw = String(message || '')
      const lower = raw.toLowerCase()
      const alias = this.commonSymbolAliases().find(item => item.keys.some(key => lower.includes(String(key).toLowerCase())))
      if (alias) return this.normalizeSymbolOption(alias)
      const watch = (this.watchlist || []).find(item => {
        const normalized = this.normalizeSymbolOption(item)
        if (!normalized) return false
        const symbol = String(normalized.symbol || '').toLowerCase()
        const name = String(normalized.name || '').toLowerCase()
        return (symbol && lower.includes(symbol)) || (name && lower.includes(name))
      })
      return watch ? this.normalizeSymbolOption(watch) : null
    },
    async resolveMessageSymbol (message = '') {
      const explicit = this.inferSymbolFromText(message)
      if (explicit) return explicit
      const local = this.findLocalSymbolMatch(message)
      if (local) return local
      const candidates = this.symbolSearchCandidates(message)
      for (const keyword of candidates) {
        try {
          const res = await searchSymbols({ keyword, limit: 6 })
          const data = res.data || {}
          const list = Array.isArray(data) ? data : (data.results || data.symbols || data.items || [])
          const normalized = list.map(x => this.normalizeSymbolOption(x)).filter(Boolean)
          if (normalized.length) return normalized[0]
        } catch (_) {}
      }
      return null
    },
    symbolContextMode (locked, mentioned, resolved, selected) {
      if (locked) return 'locked_selected_context'
      if (mentioned) return 'mentioned_in_message'
      if (resolved) return 'resolved_from_message'
      if (selected) return 'optional_selected_context'
      return 'auto_infer'
    },
    pendingAgentTaskContext () {
      if (!this.pendingAgentTask) return null
      return {
        type: this.pendingAgentTask.type,
        targetType: this.pendingAgentTask.targetType,
        target: this.pendingAgentTask.target,
        workflow: this.pendingAgentTask.workflow
      }
    },
    buildChatContext (message = '', resolvedSymbol = null) {
      const locked = resolvedSymbol && resolvedSymbol.locked ? this.normalizeSymbolOption(resolvedSymbol) : null
      const selected = this.normalizeSymbolOption(this.context)
      const mentioned = this.inferSymbolFromText(message)
      const resolved = locked || this.normalizeSymbolOption(resolvedSymbol)
      const active = locked || mentioned || resolved || selected
      const activePrice = active ? this.priceFor(active) : null
      const macroContext = this.macroContextForMessage(message)
      return {
        client_time: new Date().toISOString(),
        market: active ? active.market : '',
        symbol: active ? active.symbol : '',
        name: active ? (active.name || '') : '',
        exchange_id: active ? (active.exchange_id || '') : '',
        market_type: active ? (active.market_type || '') : '',
        instrument_id: active ? (active.instrument_id || '') : '',
        selected_market: selected ? selected.market : '',
        selected_symbol: selected ? selected.symbol : '',
        mentioned_market: !locked && (mentioned || resolved) ? (mentioned || resolved).market : '',
        mentioned_symbol: !locked && (mentioned || resolved) ? (mentioned || resolved).symbol : '',
        ignored_mentioned_market: locked && mentioned ? mentioned.market : '',
        ignored_mentioned_symbol: locked && mentioned ? mentioned.symbol : '',
        resolved_market: resolved ? resolved.market : '',
        resolved_symbol: resolved ? resolved.symbol : '',
        locked_market: locked ? locked.market : '',
        locked_symbol: locked ? locked.symbol : '',
        symbol_context_mode: this.symbolContextMode(locked, mentioned, resolved, selected),
        allow_symbol_switch: !locked,
        locked_symbol_policy: locked
          ? this.i18nText(
              'aiAssetAnalysis.copilot.lockedSymbolPolicy',
              'This task is locked to {target}. Even if the text contains another example symbol, use locked_market/locked_symbol as the target unless the user explicitly asks to switch.',
              { target: `${locked.market}:${locked.symbol}` }
            )
          : '',
        use_system_data_source: true,
        active_price: activePrice || null,
        agent_task: this.pendingAgentTaskContext(),
        economic_calendar_context: macroContext.events,
        macro_data_policy: macroContext.enabled
          ? this.i18nText(
              'aiAssetAnalysis.copilot.macroDataPolicy',
              'For macro/economic-data questions, inspect economic_calendar_context and system data before answering. If exact actual/forecast/previous values are missing, say which field is missing and guide the user to the required data source instead of claiming the system cannot help.'
            )
          : '',
        data_source_policy: this.i18nText(
          'aiAssetAnalysis.copilot.dataSourcePolicy',
          'Users may not manually choose a data source. Infer the market and symbol from natural language first, then use system data/watchlist/market context. If live data is missing, state the gap and still provide actionable next steps instead of stopping.'
        ),
        research_mode: this.activeResearchMode,
        response_contract: this.i18nText(
          `aiAssetAnalysis.copilot.responseContracts.${this.activeResearchMode}`,
          researchResponseContract(this.activeResearchMode, false)
        )
      }
    },
    async handleQuickPrompt (item) {
      if (!item) return
      const activeItem = { ...item, prompt: await this.resolveSkillPrompt(item) }
      const target = this.selectedContextTarget()
      const key = this.quickTaskKey(activeItem)
      if (this.quickTaskRequiresSelectedSymbol(activeItem)) {
        if (!target) {
          this.promptSelectSymbolFirst()
          return
        }
        if (key === 'scheduled_analysis' || key === 'monitor') {
          this.beginMonitorSetup(target)
          return
        }
      }
      if (this.quickTaskUsesSelectedSymbol(activeItem) && target) {
        if (key === 'indicator_research') {
          this.startStrategyFlow('indicator', '')
          return
        }
        if (key === 'strategy_research' || key === 'script_strategy') {
          this.startStrategyFlow('script', '')
          return
        }
        if (key === 'trade_plan') {
          this.pendingAgentTask = {
            type: 'trade_plan',
            target,
            workflow: 'QuantDinger Research Context'
          }
          this.usePrompt(this.buildLockedQuickPrompt(activeItem, target), { contextLock: target })
          return
        }
        if (key === 'opportunity_radar' || key === 'radar') {
          this.usePrompt(this.buildLockedQuickPrompt(activeItem, target), { contextLock: target })
          return
        }
      }
      if (activeItem.action === 'analysis') {
        this.pendingAgentTask = target
          ? {
              type: 'market_diagnosis',
              target,
              workflow: 'QuantDinger Professional Analysis'
            }
          : null
        const analysisTarget = target ? { ...target } : null
        this.usePrompt(this.buildAnalysisPrompt(analysisTarget), {
          ...(target ? { contextLock: target } : {}),
          localizedDraft: { type: 'analysis', target: analysisTarget }
        })
        return
      }
      if (activeItem.action === 'strategy') {
        this.startStrategyFlow('script', '')
        return
      }
      if (activeItem.action === 'addWatch') {
        this.openAddWatchModal()
        return
      }
      if (activeItem.action === 'monitor') {
        this.clearPendingAgentTask()
        this.usePrompt(activeItem.prompt)
        return
      }
      if (activeItem.action === 'route') {
        this.runMessageAction(activeItem)
        return
      }
      this.usePrompt(activeItem.prompt)
    },
    async resolveSkillPrompt (item) {
      if (!item || !item.skillId) return item ? item.prompt : ''
      try {
        const res = await getAiSkillPrompt(item.skillId, {
          language: (this.$i18n && this.$i18n.locale) || 'en-US',
          context: this.buildMessageContext()
        })
        const data = res.data || {}
        return data.prompt || item.prompt || ''
      } catch (_) {
        return item.prompt || ''
      }
    },
    async runProfessionalAnalysis () {
      const target = this.normalizeSymbolOption(this.context)
      if (!target || !target.symbol) {
        this.usePrompt(this.buildAnalysisPrompt(null))
        this.$message.info(this.i18nText('aiAssetAnalysis.copilot.analysisPromptInserted', 'Analysis prompt inserted. Add a symbol, then send it.'))
        return
      }
      const userMsg = {
        localId: `local-${localId++}`,
        role: 'user',
        content: this.i18nText('aiAssetAnalysis.copilot.diagnoseCommand', 'Diagnose {market}:{symbol}', { market: target.market, symbol: target.symbol }),
        created_at: new Date().toISOString()
      }
      this.messages.push(userMsg)
      await this.executeProfessionalAnalysis(userMsg, target)
    },
    confirmProfessionalAnalysis () {
      const target = this.normalizeSymbolOption(this.context)
      if (!target || !target.symbol) {
        this.promptSelectSymbolFirst()
        return
      }
      const costs = (this.agentPreflight && this.agentPreflight.costs) || (this.billing && this.billing.feature_costs) || {}
      const cost = Number(costs.analysis || costs.ai_analysis || costs.fast_analysis || 10)
      const targetLabel = `${target.market}:${target.symbol}`
      this.$confirm({
        title: this.i18nText('aiAssetAnalysis.copilot.reportGenerateTitle', 'Generate a professional report for {symbol}?', { symbol: target.symbol }),
        content: this.i18nText('aiAssetAnalysis.copilot.reportGenerateContent', 'Target: {target} · Timeframe: 1D · About 30–90 seconds · Estimated cost: {cost} credits', { target: targetLabel, cost }),
        okText: this.text.generate,
        cancelText: this.text.cancel,
        // Do not return the long-running analysis promise. Ant Design keeps a
        // confirm modal open while onOk's returned promise is pending; the
        // report's inline progress card is the correct place to show progress.
        onOk: () => {
          this.runProfessionalAnalysis()
        }
      })
    },
    async executeProfessionalAnalysis (userMsg, target) {
      const assistantMsg = {
        localId: `local-${localId++}`,
        role: 'assistant',
        content: '',
        meta: this.text.analysisRunning,
        reportLoading: true,
        reportTarget: target,
        created_at: new Date().toISOString()
      }
      this.messages.push(assistantMsg)
      this.scrollToBottom()
      this.sending = true
      try {
        const result = await this.fetchProfessionalAnalysis(target)
        assistantMsg.report = result
        assistantMsg.reportLoading = false
        assistantMsg.reportError = ''
        assistantMsg.meta = this.text.analysisComplete
        await this.persistCopilotMessage(userMsg, 'fast_analysis_user')
        await this.persistCopilotMessage(assistantMsg, 'fast_analysis_report')
        assistantMsg.actions = this.reportActions(assistantMsg)
        await this.persistCopilotMessage(assistantMsg, 'fast_analysis_report')
        this.loadSessions()
        this.loadSessionMemory()
      } catch (e) {
        const fallback = this.i18nText('aiAssetAnalysis.copilot.analysisFailed', 'Analysis failed')
        assistantMsg.reportLoading = false
        assistantMsg.reportError = this.professionalAnalysisError(e, fallback)
        assistantMsg.reportErrorTone = this.isInProgressError(e) ? 'warning' : 'error'
        assistantMsg.meta = fallback
      } finally {
        if (this.pendingAgentTask && this.pendingAgentTask.type === 'market_diagnosis') {
          this.clearPendingAgentTask()
        }
        await this.loadBilling()
        this.sending = false
        this.scrollToBottom()
      }
    },
    async fetchProfessionalAnalysis (target) {
      const res = await fastAnalyze({
        market: target.market,
        symbol: target.symbol,
        language: this.$i18n ? this.$i18n.locale : 'en-US',
        timeframe: '1D',
        response_contract: 'professional_report_v1'
      })
      if (!res || res.code === 0) {
        const err = new Error((res && res.msg) || this.i18nText('aiAssetAnalysis.copilot.analysisFailed', 'Analysis failed'))
        err.response = { data: res || {} }
        throw err
      }
      const data = res.data || {}
      const report = this.professionalArtifact(data)
      if (!report) {
        throw new Error(this.$t('fastAnalysis.professionalResponseInvalid'))
      }
      return {
        schema_version: 'professional_analysis_envelope_v1',
        report,
        runtime: data.runtime || {
          memory_id: data.memory_id,
          analysis_time_ms: data.analysis_time_ms,
          llm_time_ms: data.llm_time_ms,
          data_collection_time_ms: data.data_collection_time_ms
        }
      }
    },
    isInProgressError (e) {
      const data = e && e.response && e.response.data
      const msg = String((data && data.msg) || (e && e.message) || '')
      return msg.toLowerCase().includes('in progress') || msg.includes('进行中') || msg.includes('处理中')
    },
    professionalAnalysisError (e, fallback) {
      const data = e && e.response && e.response.data
      const raw = String((data && (data.error || data.msg)) || (e && e.message) || '').trim()
      const normalized = raw.toLowerCase()
      if (normalized.includes('professional_report_v1') && normalized.includes('generation failed')) {
        return this.$t('fastAnalysis.professionalGenerationFailed')
      }
      if (normalized.includes('professional_report_v1') && (normalized.includes('invalid') || normalized.includes('missing'))) {
        return this.$t('fastAnalysis.professionalResponseInvalid')
      }
      return raw || fallback
    },
    reportId (msg) {
      return String((msg && (msg.id || msg.localId)) || '')
    },
    isReportExpanded (msg) {
      return !!this.expandedReports[this.reportId(msg)]
    },
    toggleReportExpanded (msg) {
      const id = this.reportId(msg)
      this.$set(this.expandedReports, id, !this.expandedReports[id])
    },
    professionalArtifact (value) {
      if (!value || typeof value !== 'object') return null
      const candidate = value.report || value.professional_report || value
      return candidate && ['professional_report_v1', '1.0'].includes(candidate.schema_version)
        ? candidate
        : null
    },
    reportObservation (msg, metric) {
      const report = this.professionalArtifact(msg && msg.report)
      const rows = report && report.evidence_snapshot && report.evidence_snapshot.observations
      if (!Array.isArray(rows)) return null
      const metrics = (Array.isArray(metric) ? metric : [metric]).map(value => String(value || '').toLowerCase())
      return rows.find(item => metrics.includes(String(item && item.metric || '').toLowerCase())) || null
    },
    reportTargetLabel (msg) {
      const report = this.professionalArtifact(msg && msg.report) || {}
      const instrument = report.instrument || {}
      const target = (msg && msg.reportTarget) || {}
      return [instrument.market || target.market, instrument.canonical_symbol || instrument.symbol || target.symbol].filter(Boolean).join(':') || '--'
    },
    reportDecision (msg) {
      const report = this.professionalArtifact(msg && msg.report) || {}
      const profile = report.decision_profile || {}
      const dimensions = Array.isArray(report.dimensions) ? report.dimensions : []
      const technicalScore = Number((dimensions.find(item => item.key === 'technical') || {}).score)
      const bias = this.$t(resolveMarketBiasLabelKey({
        marketBias: profile.market_bias,
        biasScore: profile.market_bias_score,
        technicalScore
      }))
      const action = this.$t(resolveTradeActionLabelKey(profile.decision))
      return `${bias} · ${action}`
    },
    reportDecisionClass (msg) {
      const report = this.professionalArtifact(msg && msg.report) || {}
      const profile = report.decision_profile || {}
      const dimensions = Array.isArray(report.dimensions) ? report.dimensions : []
      const technicalScore = Number((dimensions.find(item => item.key === 'technical') || {}).score)
      const key = resolveMarketBiasLabelKey({
        marketBias: profile.market_bias,
        biasScore: profile.market_bias_score,
        technicalScore
      })
      if (key.endsWith('Bullish')) return 'decision-buy'
      if (key.endsWith('Bearish')) return 'decision-sell'
      return 'decision-hold'
    },
    reportSummary (msg) {
      const report = this.professionalArtifact(msg && msg.report) || {}
      return String(report.executive_summary || (report.decision_profile && report.decision_profile.rationale) || this.text.reportReady)
        .replace(/\s*\[(?:ev_[a-f0-9]+(?:\s*,\s*)?)+\]/gi, '')
        .trim()
    },
    reportConfidence (msg) {
      const report = this.professionalArtifact(msg && msg.report) || {}
      return Math.round(Number((report.decision_profile && report.decision_profile.confidence) || 0))
    },
    reportCurrentPrice (msg) {
      const report = this.professionalArtifact(msg && msg.report) || {}
      const observation = this.reportObservation(msg, ['quote.price', 'current_price'])
      const value = observation && observation.value
      const market = report.instrument && report.instrument.market
      return value === null || value === undefined || value === '' ? '--' : this.formatPriceValue(value, market)
    },
    reportRiskReward (msg) {
      const report = this.professionalArtifact(msg && msg.report) || {}
      if (String((report.decision_profile && report.decision_profile.decision) || '').toUpperCase() === 'HOLD') return '--'
      const plan = report.risk_plan || {}
      const value = plan.net_risk_reward ?? plan.gross_risk_reward
      return value === null || value === undefined || value === '' ? '--' : Number(value).toFixed(2)
    },
    reportHasRrWarning (msg) {
      const report = this.professionalArtifact(msg && msg.report) || {}
      if (String((report.decision_profile && report.decision_profile.decision) || '').toUpperCase() === 'HOLD') return false
      const plan = report.risk_plan || {}
      const value = plan.net_risk_reward ?? plan.gross_risk_reward
      const hasRatio = value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
      const warnings = Array.isArray(plan.warnings) ? plan.warnings : []
      return warnings.includes('net_risk_reward_below_one') || (hasRatio && Number(value) < 1)
    },
    reportRiskRewardWarning (msg) {
      const report = this.professionalArtifact(msg && msg.report) || {}
      const plan = report.risk_plan || {}
      const value = plan.net_risk_reward ?? plan.gross_risk_reward
      const hasRatio = value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
      if (!hasRatio) {
        return this.text.riskRewardUnavailable
      }
      return this.text.riskRewardWarning
    },
    reportActions (msg) {
      const id = this.reportId(msg)
      return [
        {
          key: `share-report-${id}`,
          type: 'share_report',
          icon: 'share-alt',
          label: this.$t('aiAssetAnalysis.copilot.shareReport'),
          payload: { reportId: id }
        },
        {
          key: `export-report-${id}`,
          type: 'export_report_pdf',
          icon: 'download',
          label: this.i18nText('aiAssetAnalysis.copilot.exportPdf', 'Export PDF'),
          payload: { reportId: id }
        },
        {
          key: `ask-report-${id}`,
          type: 'ask_about_report',
          icon: 'message',
          label: this.i18nText('aiAssetAnalysis.copilot.askFollowup', 'Ask follow-up'),
          payload: { reportId: id }
        }
      ]
    },
    reportMessageByReportId (reportId) {
      const id = String(reportId || '')
      return (this.messages || []).find(item => this.reportId(item) === id) ||
        (this.messages || []).find(item => item && item.report && Array.isArray(item.actions) &&
          item.actions.some(action => String(action && action.payload && action.payload.reportId) === id))
    },
    async copyTextToClipboard (value) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value)
        return
      }
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    },
    async shareReport (reportId) {
      const msg = this.reportMessageByReportId(reportId)
      if (!msg || !msg.report) {
        this.$message.warning(this.i18nText('aiAssetAnalysis.copilot.noReportData', 'No report data to share'))
        return
      }
      try {
        if (!msg.id) await this.persistCopilotMessage(msg, 'fast_analysis_report')
        if (!msg.id) throw new Error(this.$t('aiAssetAnalysis.copilot.shareSaveFailed'))
        const res = await createChatReportShare({
          message_id: msg.id,
          language: (this.$i18n && this.$i18n.locale) || 'en-US'
        })
        const path = res && res.data && res.data.path
        if (!path) throw new Error((res && res.msg) || this.$t('aiAssetAnalysis.copilot.shareFailed'))
        const url = `${window.location.origin}${window.location.pathname}#${path}`
        await this.copyTextToClipboard(url)
        this.$message.success(this.$t('aiAssetAnalysis.copilot.shareCopied'))
      } catch (e) {
        this.$message.error((e && (e.backendMessage || e.message)) || this.$t('aiAssetAnalysis.copilot.shareFailed'))
      }
    },
    async retryProfessionalAnalysis (msg) {
      const target = msg && msg.reportTarget
      if (!target || !target.symbol) return
      msg.reportLoading = true
      msg.reportError = ''
      msg.meta = this.text.analysisRunning
      this.sending = true
      try {
        msg.report = await this.fetchProfessionalAnalysis(target)
        msg.reportLoading = false
        msg.actions = this.reportActions(msg)
        msg.meta = this.text.analysisComplete
      } catch (e) {
        msg.reportLoading = false
        msg.reportError = (e && e.response && e.response.data && e.response.data.msg) || (e && e.message) || this.i18nText('aiAssetAnalysis.copilot.analysisFailed', 'Analysis failed')
        msg.reportErrorTone = this.isInProgressError(e) ? 'warning' : 'error'
      } finally {
        await this.loadBilling()
        this.sending = false
      }
    },
    async exportReportPdf (reportId) {
      if (!reportId) return
      const id = String(reportId)
      const msg = this.reportMessageByReportId(id)
      if (!msg || !msg.report) {
        this.$message.warning(this.i18nText('aiAssetAnalysis.copilot.noReportData', 'No report data to export'))
        return
      }
      try {
        const blob = await exportChatReportPdf({
          report: this.professionalArtifact(msg.report),
          target: msg.reportTarget || this.context || {},
          language: (this.$i18n && this.$i18n.locale) || 'en-US'
        })
        const fileBlob = blob instanceof Blob ? blob : new Blob([blob], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(fileBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = this.reportPdfFilename(msg)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
      } catch (e) {
        this.$message.error((e && (e.backendMessage || e.message)) || this.i18nText('aiAssetAnalysis.copilot.pdfExportFailed', 'PDF export failed'))
      }
    },
    reportPdfFilename (msg) {
      const report = this.professionalArtifact(msg && msg.report) || {}
      const instrument = report.instrument || {}
      const target = (msg && msg.reportTarget) || this.context || {}
      const symbol = String(instrument.canonical_symbol || instrument.symbol || target.symbol || 'report').replace(/[\\/:*?"<>|]+/g, '_')
      const date = new Date().toISOString().slice(0, 10)
      return `QuantDinger_${symbol}_${date}.pdf`
    },
    async askAboutReport (reportId) {
      const msg = (this.messages || []).find(item => this.reportId(item) === String(reportId))
      if (msg && !msg.id) await this.persistCopilotMessage(msg, 'fast_analysis_report')
      this.draftReferencedReportId = msg && msg.id ? Number(msg.id) : null
      const target = (msg && msg.reportTarget) || this.context
      const label = target && target.symbol ? `${target.market}:${target.symbol}` : this.i18nText('aiAssetAnalysis.copilot.thisReport', 'this report')
      this.usePrompt(this.i18nText('aiAssetAnalysis.copilot.askReportFollowup', 'Based on the diagnosis report for {label}, explain further:', { label }))
    },
    buildAnalysisPrompt (target) {
      const symbol = target && target.symbol
        ? `${target.market}:${target.symbol}`
        : this.i18nText(
          'aiAssetAnalysis.copilot.analysisPromptTargetPlaceholder',
          'the symbol to analyze, for example Crypto:BTC/USDT'
        )
      const fallback = [
        'Use the system market data to produce an actionable trading analysis for {symbol}.',
        '',
        'Requirements:',
        '1. State current price, timeframe, and data timestamp. If data is unavailable, say so instead of inventing it.',
        '2. Analyze trend, volume, key support/resistance, capital flow, and risk.',
        '3. Give bullish, range-bound, and bearish trigger conditions.',
        '4. Provide concrete actions: observation levels, entry confirmation, invalidation stop, and take-profit/reduction logic.',
        '5. Prioritize the conclusion; do not return only a generic framework.'
      ].join('\n')
      return this.i18nText('aiAssetAnalysis.copilot.analysisPromptTemplate', fallback, { symbol })
    },
    buildStrategyPrompt (targetKey, target, seedPrompt = '') {
      const normalizedTargetKey = targetKey === 'indicator' ? 'indicator' : 'script'
      const targetText = target && target.symbol
        ? `${target.market}:${target.symbol}`
        : this.i18nText('aiAssetAnalysis.copilot.strategySymbolPlaceholder', '[enter symbol here, e.g. Crypto:BTC/USDT or USStock:AAPL]')
      const promptText = (key, fallback, values = {}) => this.i18nText(`aiAssetAnalysis.copilot.strategyPrompt.${key}`, fallback, values)
      const promptKey = normalizedTargetKey === 'indicator'
        ? (seedPrompt ? 'indicatorStarterWithIdea' : 'indicatorStarter')
        : (seedPrompt ? 'scriptStarterWithIdea' : 'scriptStarter')
      return promptText(promptKey, '', { target: targetText, idea: seedPrompt })
    },
    appendStrategySuggestion (suggestion) {
      if (!suggestion || !suggestion.prompt) return
      const current = String(this.draft || '').trim()
      if (current.includes(suggestion.prompt)) return
      this.draft = [current, suggestion.prompt].filter(Boolean).join('\n')
      this.$nextTick(() => {
        this.resizeComposer()
        if (this.$refs.composerInput) this.$refs.composerInput.focus()
      })
    },
    agentTargetFromPlan (plan, fallbackTarget) {
      const entities = plan && plan.entities ? plan.entities : {}
      const target = this.normalizeSymbolOption({
        market: entities.market || (fallbackTarget && fallbackTarget.market),
        symbol: entities.symbol || (fallbackTarget && fallbackTarget.symbol),
        name: entities.name || (fallbackTarget && fallbackTarget.name),
        exchange_id: entities.exchange_id || (fallbackTarget && fallbackTarget.exchange_id),
        market_type: entities.market_type || (fallbackTarget && fallbackTarget.market_type),
        instrument_id: entities.instrument_id || (fallbackTarget && fallbackTarget.instrument_id)
      })
      return target || this.normalizeSymbolOption(fallbackTarget)
    },
    strategyTargetTypeFromPlan (plan) {
      const targetType = String(plan && plan.target_type ? plan.target_type : '').toLowerCase()
      const workflow = String(plan && plan.workflow ? plan.workflow : '').toLowerCase()
      if (targetType === 'indicator' || workflow === 'indicator_ide') return 'indicator'
      if (targetType === 'script' || workflow === 'script_strategy') return 'script'
      return 'script'
    },
    strategyPromptTarget (target = {}, entities = {}) {
      const market = String(entities.market || target.market || '').trim()
      const rawSymbol = String(entities.symbol || target.symbol || '').trim()
      if (!rawSymbol) return market
      if (market.toLowerCase() !== 'crypto') {
        return /^(?:CNStock|Forex|Future|Futures|USStock):/i.test(rawSymbol)
          ? rawSymbol
          : `${market}:${rawSymbol}`
      }
      const symbol = rawSymbol.replace(/^Crypto:/i, '')
      if (symbol.includes('@')) return `Crypto:${symbol}`
      const marketType = String(entities.market_type || target.market_type || 'spot').trim().toLowerCase() === 'swap'
        ? 'swap'
        : 'spot'
      const exchangeId = String(entities.exchange_id || target.exchange_id || '').trim().toLowerCase()
      return `Crypto:${symbol}@${exchangeId ? `${exchangeId}:` : ''}${marketType}`
    },
    buildExecutableStrategyPrompt (plan, message, target) {
      const entities = plan && plan.entities ? plan.entities : {}
      const timeframes = [...new Set(
        (Array.isArray(entities.timeframes) ? entities.timeframes : [entities.timeframe])
          .map(item => String(item || '').trim().toLowerCase())
          .filter(Boolean)
      )]
      const timeframe = timeframes[0] || String(entities.timeframe || '').trim()
      const template = entities.strategy_template || ''
      const workflow = plan && plan.workflow ? plan.workflow : 'script_strategy'
      const isIndicatorWorkflow = String(workflow || '').toLowerCase() === 'indicator_ide'
      const targetLabel = this.strategyPromptTarget(target, entities)
      const promptText = (key, fallback, values = {}) => this.i18nText(`aiAssetAnalysis.copilot.executableStrategyPrompt.${key}`, fallback, values)
      const artifactRules = isIndicatorWorkflow
        ? [
            promptText('ruleIndicatorCode', '- Generate QuantDinger chart-indicator Python code for visualization only, not Strategy API V2 execution code.'),
            promptText('ruleIndicatorSignals', '- Indicator output.signals are visual markers only. Do not emit ctx orders or open/close/add/reduce execution fields.'),
            promptText('ruleChartAnnotations', '- Do not add output.layers by default. Use layers only for explicitly requested zones, channels, support/resistance, or invalidation areas.'),
            promptText('ruleSparseAnnotations', '- Keep chart annotations sparse, transparent, and clear of dense candles.')
          ]
        : [
            promptText('ruleScriptDraft', '- Generate one executable Python Strategy API V2 draft using explicit position intents and runtime-safe sizing.'),
            promptText('ruleScriptOwnership', '- The strategy source owns its canonical instrument, market type, subscription frequency, direction, sizing, entries, exits, risk rules, and schedules. The run panel owns only initial capital, date range, and permitted Crypto @swap leverage.'),
            promptText('ruleScriptApis', '- Use only Strategy API V2 runtime APIs. Read current prices with data.current(...), positions through amount/avg_cost, and global order/schedule helpers; never use get_current_data, quantity/cost_basis, or context.run_daily.')
          ]
      const memoryLines = (this.userMemories || [])
        .slice(0, 8)
        .map(item => `- ${item.title || item.category}: ${item.content}`)
        .join('\n')
      return [
        promptText('taskType', 'This is an execution task, not a consulting answer.'),
        isIndicatorWorkflow
          ? promptText('generateIndicatorArtifact', 'Generate the runnable QuantDinger chart indicator artifact now.')
          : promptText('generateArtifact', 'Generate the runnable QuantDinger strategy artifact now.'),
        promptText('workflow', 'Workflow: {workflow}', { workflow }),
        promptText('target', 'Target: {target}', { target: targetLabel }),
        isIndicatorWorkflow
          ? (timeframe
              ? promptText('indicatorTimeframe', 'Chart context timeframe: {timeframe}. Use it only to interpret the request; indicator code must not hardcode a timeframe.', { timeframe })
              : promptText('indicatorTimeframeDefault', 'No chart timeframe was supplied. Indicator code must remain timeframe-agnostic.'))
          : (timeframes.length > 1
              ? promptText(
                'strategyTimeframes',
                'The user explicitly requested these source timeframes: {timeframes}. Preserve every one with a separate context.subscribe(frequency=...) call; the fastest timeframe drives execution and higher-timeframe reads use completed bars only. Do not add any other timeframe.',
                { timeframes: timeframes.join(', ') }
              )
              : timeframe
                ? promptText('strategyTimeframe', 'Source timeframe: {timeframe}. Preserve it as the strategy\'s only timeframe unless the original request explicitly names additional confirmation timeframes.', { timeframe })
              : promptText('strategyTimeframeDefault', 'No timeframe was supplied. Choose one conservative source-owned default and encode exactly one context.subscribe(frequency=...) call. Do not invent multi-timeframe confirmation.')),
        template ? promptText('referenceTemplate', 'Reference strategy/template: {template}', { template }) : '',
        '',
        promptText('executionRules', 'Execution rules:'),
        promptText('ruleNoConfirmation', '- Do not ask for confirmation when the target, timeframe, and strategy idea can be inferred.'),
        promptText('ruleConservativeDefaults', '- Encode conservative missing strategy/indicator knobs as code parameters or metadata, not prose outside the generated code.'),
        promptText('ruleEnglishComments', '- Code comments must be English.'),
        promptText('ruleNativeWorkflow', '- Stay inside QuantDinger native workflows.'),
        ...artifactRules,
        memoryLines ? `\n${promptText('userMemory', 'User memory:')}\n${memoryLines}` : '',
        '',
        promptText('originalRequest', 'Original user request:'),
        message || ''
      ].filter(Boolean).join('\n')
    },
    async classifyAgentPlan (content, attachments, contextLock = null) {
      const resolvedSymbol = contextLock || await this.resolveMessageSymbol(content)
      const context = this.buildChatContext(content, resolvedSymbol)
      const res = await classifyAgentIntent({
        message: content,
        attachments,
        context,
        language: this.$i18n ? this.$i18n.locale : 'zh-CN'
      }).catch(() => null)
      const plan = res && res.data ? res.data : null
      return { plan, resolvedSymbol }
    },
    async handleBackendAgentIntent (content, attachments, contextLock = null) {
      let plan = null
      let resolvedSymbol = null
      try {
        const classified = await this.classifyAgentPlan(content, attachments, contextLock)
        plan = classified.plan
        resolvedSymbol = classified.resolvedSymbol
      } catch (_) {
        return { handled: false, plan, resolvedSymbol }
      }
      if (!plan || !plan.should_execute || plan.intent !== 'strategy_build') return { handled: false, plan, resolvedSymbol }
      const target = this.agentTargetFromPlan(plan, contextLock || resolvedSymbol || this.context)
      if (!target || !target.symbol) {
        this.messages.push({
          localId: `local-${localId++}`,
          role: 'assistant',
          content: this.i18nText(
            'aiAssetAnalysis.copilot.strategyMissingSymbol',
            'I classified this as a strategy creation task, but the target symbol is missing. Please provide a symbol such as `Crypto:BTC/USDT`, `USStock:SPCX`, or `CNStock:300750`.'
          ),
          meta: 'agent_intent:missing_symbol',
          created_at: new Date().toISOString()
        })
        return { handled: true, plan, resolvedSymbol }
      }
      this.context.market = target.market
      this.context.symbol = target.symbol
      this.selectedSymbolValue = this.symbolOptionValue(target)
      this.symbolOptions = [target].concat(this.symbolOptions || [])
      const targetType = this.strategyTargetTypeFromPlan(plan)
      const prompt = this.buildExecutableStrategyPrompt(plan, content, target)
      this.pendingAgentTask = {
        type: 'strategy_design',
        targetType,
        target,
        workflow: plan.workflow,
        originalPrompt: content,
        agentIntent: plan
      }
      if (targetType === 'script') {
        await this.generateStrategyV2Draft(prompt, target)
      } else {
        await this.generateChartIndicatorDraft(prompt, target)
      }
      this.clearPendingAgentTask()
      return { handled: true, plan, resolvedSymbol }
    },
    async handlePendingStrategyAgentMessage (content, userMsg, contextLock = null) {
      const task = this.pendingAgentTask
      if (!task || task.type !== 'strategy_design') return false
      const target = this.normalizeSymbolOption(contextLock || task.target || this.context)
      if (!target || !target.symbol) {
        this.messages.push({
          localId: `local-${localId++}`,
          role: 'assistant',
          content: this.i18nText(
            'aiAssetAnalysis.copilot.strategyMissingSymbol',
            'I need a symbol before generating. Please select one or mention it in the message.'
          ),
          meta: 'agent:missing_symbol',
          created_at: new Date().toISOString()
        })
        return true
      }
      const targetType = task.targetType === 'indicator' ? 'indicator' : 'script'
      const workflow = targetType === 'indicator' ? 'indicator_ide' : 'script_strategy'
      const plan = {
        workflow,
        entities: {
          market: target.market,
          symbol: target.symbol,
          timeframe: '',
          timeframes: []
        }
      }
      const prompt = this.buildExecutableStrategyPrompt(plan, content, target)
      await this.persistCopilotMessage(userMsg, targetType === 'indicator' ? 'indicator_research_user' : 'strategy_research_user')
      if (targetType === 'indicator') {
        await this.generateChartIndicatorDraft(prompt, target)
      } else {
        await this.generateStrategyV2Draft(prompt, target)
      }
      this.clearPendingAgentTask()
      return true
    },
    async startStrategyFlow (targetKey, seedPrompt = '') {
      const target = this.normalizeSymbolOption(this.context)
      this.strategyFlowVisible = false
      const normalizedTargetKey = targetKey || this.selectedStrategyTarget || 'indicator'
      this.selectedStrategyTarget = normalizedTargetKey
      this.pendingAgentTask = {
        type: 'strategy_design',
        targetType: normalizedTargetKey,
        target,
        workflow: normalizedTargetKey === 'indicator'
          ? 'QuantDinger Chart Indicator'
          : 'QuantDinger Trading Script',
        originalPrompt: seedPrompt || ''
      }
      this.usePrompt(this.buildStrategyPrompt(normalizedTargetKey, target, seedPrompt))
      const noticeKey = normalizedTargetKey === 'indicator'
        ? 'aiAssetAnalysis.copilot.indicatorAgentArmed'
        : 'aiAssetAnalysis.copilot.strategyAgentArmed'
      this.$message.info(this.i18nText(noticeKey, ''))
    },
    selectStrategyTarget (targetKey) {
      this.selectedStrategyTarget = targetKey || 'indicator'
    },
    buildNativeStrategyGenerationPrompt (targetType, prompt, target) {
      const promptText = (key, fallback, values = {}) => this.i18nText(`aiAssetAnalysis.copilot.nativeStrategyPrompt.${key}`, fallback, values)
      const memoryLines = (this.userMemories || [])
        .slice(0, 8)
        .map(item => `- ${item.title || item.category}: ${item.content}`)
        .join('\n')
      const workflow = targetType === 'indicator'
        ? promptText('workflowIndicator', 'QuantDinger Chart Indicator')
        : promptText('workflowScript', 'QuantDinger Trading Script')
      const isIndicatorWorkflow = targetType === 'indicator'
      const targetLabel = this.strategyPromptTarget(target)
      const hardRules = [
        promptText('workflow', 'Workflow: {workflow}', { workflow }),
        promptText('target', 'Target: {target}', { target: targetLabel }),
        '',
        promptText('hardRules', 'Hard rules:'),
        promptText('ruleExecutionTask', '- This is an execution task, not a consulting answer. Produce the runnable artifact now.'),
        promptText('ruleNoTemplateRequest', '- Do not ask the user to paste templates or confirm obvious defaults.'),
        promptText('ruleWorkflowOnly', '- Generate only for the QuantDinger workflow above.'),
        promptText('ruleNoOtherPlatforms', '- Do not output Pine Script, TradingView-only code, MQL, or code for another platform.'),
        promptText('ruleEnglishComments', '- Code comments must be English.'),
        isIndicatorWorkflow
          ? promptText('ruleIndicatorVerification', '- Encode visual parameters and marker meanings as # @param declarations, plot/signal names, labels, and concise code comments.')
          : promptText('ruleRiskVerification', '- Declare tunable risk knobs with # @param and read matching context.params defaults only inside executable handlers or callbacks. Encode explicit exits and state guards in code.'),
        promptText('ruleConservativeDefaults', '- If a required assumption is missing, choose conservative defaults and encode them in code params or comments, not prose outside the code.'),
        '',
        memoryLines ? `[${promptText('userMemory', 'User memory')}]\n${memoryLines}\n` : '',
        `[${promptText('userRequirement', 'User requirement')}]`,
        prompt || ''
      ]
      if (targetType === 'indicator') {
        hardRules.splice(
          6,
          0,
          promptText('ruleIndicatorRunnable', '- Indicator output must be runnable in the QuantDinger Indicator editor and suitable for chart display only.'),
          promptText('ruleIndicatorSignals', '- Do not emit strategy execution columns such as open_long, close_long, open_short, close_short, add_long, or reduce_long.'),
          promptText('ruleIndicatorNoStrategyMeta', '- Do not include strategy/backtest metadata such as # @strategy, # signal_form, # exit_owner, # flip_mode, four_way, or Strategy API V2.'),
          promptText('ruleOutputSignalsChartOnly', '- output.signals is chart-only and never places backtest/live orders.'),
          promptText('ruleOutputSignalsVisualOnly', '- If markers are needed, write them only as visual marker rows for output.signals with type, text, color, and data arrays. They must not imply executable orders.'),
          promptText('ruleOutputLayers', '- Do not add output.layers by default. Use layers only when the user explicitly asks for zones, channels, support/resistance, invalidation ranges, or premium/discount areas. Prefer plots and output.signals for normal indicators.'),
          promptText('ruleLightChartLayers', '- When layers are truly needed, they must look like lightweight analysis annotations, not blocking panels: short text, transparent fills, dashed borders when useful, and labels near the right edge or outside dense candles.')
        )
      } else if (targetType === 'script') {
        hardRules.splice(
          6,
          0,
          promptText('ruleScriptDraft', '- Trading Script output must be a Python Strategy API V2 draft for the QuantDinger Trading Script editor.'),
          promptText('ruleScriptOwnership', '- Source code owns the canonical instrument, market type, subscription frequency, direction, sizing, entries, exits, risk, and schedules. The run panel owns only initial capital, date range, and permitted Crypto @swap leverage.'),
          promptText('ruleScriptApis', '- Use data.current(...) for current prices, position.amount/avg_cost for positions, and global order/schedule helpers. Never use get_current_data, position.quantity/cost_basis, or context.run_daily.'),
          promptText('ruleInitializeParams', '- Never read context.params in initialize(context); read declared # @param values only inside executable handlers or callbacks.')
        )
      } else {
        hardRules.splice(6, 0, promptText('ruleScriptDraft', '- Trading Script output must be a Python Strategy API V2 draft for the QuantDinger Trading Script editor.'))
      }
      return hardRules.join('\n')
    },
    async generateChartIndicatorDraft (prompt, target) {
      this.generatingStrategy = true
      const assistantMsg = {
        localId: 'local-' + (localId++),
        role: 'assistant',
        content: this.i18nText('aiAssetAnalysis.copilot.generatingChartIndicator', 'Generating chart indicator draft...'),
        meta: 'indicator_research'
      }
      this.messages.push(assistantMsg)
      this.scrollToBottom()
      try {
        const agentPrompt = this.buildNativeStrategyGenerationPrompt('indicator', prompt, target)
        const token = this.getAccessToken()
        const language = this.$i18n ? this.$i18n.locale : 'en-US'
        const response = await fetch('/api/indicator/aiGenerate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
            'Access-Token': token || '',
            Token: token || '',
            'X-App-Lang': language,
            'Accept-Language': language
          },
          credentials: 'include',
          body: JSON.stringify({
            prompt: agentPrompt,
            source: 'copilot_quick_tool',
            context: {
              source: 'copilot_quick_tool',
              market: target.market || '',
              symbol: target.symbol || ''
            }
          })
        })
        if (!response.ok || !response.body) throw new Error(`Indicator AI ${response.status}`)
        const reader = response.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let generatedCode = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''
          for (const part of parts) {
            if (!part.trim() || !part.startsWith('data: ')) continue
            const data = part.substring(6)
            if (data === '[DONE]') continue
            const json = JSON.parse(data)
            if (json.error) throw new Error(json.error)
            if (json.content) {
              generatedCode += json.content
              const code = this.cleanMarkdownCodeBlocks(generatedCode)
              assistantMsg.content = [
                `## ${target.symbol} ${this.text.indicatorStrategy}`,
                '',
                this.i18nText('aiAssetAnalysis.copilot.indicatorStrategyReady', 'A chart indicator draft is ready. Indicators are visual only; generate a script strategy before backtesting or live trading.'),
                '',
                '```python',
                code,
                '```'
              ].join('\n')
              this.scrollToBottom()
            }
          }
        }
        const code = this.cleanMarkdownCodeBlocks(generatedCode)
        if (!code) throw new Error('Indicator AI returned empty code')
        assistantMsg.meta = this.text.indicatorGenerated
        assistantMsg.actions = [{
          key: 'open-indicator-ide',
          group: 'strategy_workflow',
          icon: 'line-chart',
          label: this.i18nText('aiAssetAnalysis.copilot.openIndicatorIde', 'Open Indicator editor'),
          path: '/indicator-ide',
          storageKey: 'qd_copilot_indicator_code',
          storageValue: code,
          query: { aiDraft: '1', symbol: target.symbol, market: target.market }
        }]
        await this.persistCopilotMessage(assistantMsg, 'indicator_research')
      } catch (e) {
        console.warn('Indicator generation failed', e)
        assistantMsg.content = this.i18nText(
          'aiAssetAnalysis.copilot.indicatorGenerationUnavailable',
          'Indicator generation service is temporarily unavailable. Please check the backend AI configuration and try again.'
        )
      } finally {
        await this.loadBilling()
        this.generatingStrategy = false
        this.scrollToBottom()
      }
    },
    async generateStrategyV2Draft (prompt, target) {
      this.generatingStrategy = true
      const assistantMsg = {
        localId: 'local-' + (localId++),
        role: 'assistant',
        content: this.i18nText('aiAssetAnalysis.copilot.generatingStrategyV2', 'Generating trading script draft...'),
        meta: 'strategy_build'
      }
      this.messages.push(assistantMsg)
      this.scrollToBottom()
      try {
        const agentPrompt = this.buildNativeStrategyGenerationPrompt('script', prompt, target)
        const res = await aiGenerateStrategy({
          prompt: agentPrompt,
          intent: 'generate_code',
          source: 'copilot_quick_tool'
        })
        const code = this.extractStrategyCode(res)
        if (!code) throw new Error((res && res.msg) || 'AI generation failed')
        const scriptDraftMeta = {
          symbol: target.symbol,
          market: target.market,
          name: `${target.symbol} ${this.text.scriptStrategy}`
        }
        sessionStorage.setItem('qd_strategy_source', code)
        sessionStorage.setItem('qd_copilot_script_strategy_meta', JSON.stringify(scriptDraftMeta))
        assistantMsg.content = [
          `## ${target.symbol} ${this.text.scriptStrategy}`,
          '',
          this.i18nText('aiAssetAnalysis.copilot.scriptStrategyReady'),
          '',
          '```python',
          code,
          '```'
        ].join('\n')
        assistantMsg.meta = this.text.strategyGenerated
        assistantMsg.actions = [{
          key: 'open-script-strategy',
          group: 'strategy_workflow',
          icon: 'code',
          label: this.i18nText('aiAssetAnalysis.copilot.openStrategyV2Ide'),
          path: '/strategy-ide',
          storageKey: 'qd_strategy_source',
          storageValue: code,
          extraStorage: {
            qd_copilot_script_strategy_meta: JSON.stringify(scriptDraftMeta)
          },
          query: { tab: 'script', draft: '1' }
        }]
        await this.persistCopilotMessage(assistantMsg, 'strategy_build')
      } catch (e) {
        console.warn('Script strategy generation failed', e)
        assistantMsg.content = this.i18nText(
          'aiAssetAnalysis.copilot.scriptGenerationUnavailable',
          'Strategy generation service is temporarily unavailable. Please check the backend AI configuration and try again.'
        )
      } finally {
        await this.loadBilling()
        this.generatingStrategy = false
        this.scrollToBottom()
      }
    },
    extractStrategyCode (res) {
      if (!res || typeof res !== 'object') return ''
      const data = res.data && typeof res.data === 'object' ? res.data : {}
      const candidate = [data.code, data.source, data.strategy_code, res.code]
        .find(value => typeof value === 'string' && value.trim())
      return candidate ? candidate.trim() : ''
    },
    openTaskModal (item) {
      this.taskTarget = item ? this.normalizeSymbolOption(item) : this.normalizeSymbolOption(this.context)
      this.taskForm = { interval_min: 240, notify_channels: [] }
      this.taskModalVisible = true
    },
    async saveMonitor () {
      const target = this.taskTarget || this.normalizeSymbolOption(this.context)
      if (!target || !target.symbol) return
      this.savingMonitor = true
      try {
        const interval = Number(this.taskForm.interval_min || 240)
        const channels = this.normalizeMonitorChannels(this.taskForm.notify_channels || [])
        const res = await addMonitor({
          name: `AI-${target.symbol}-${interval}m`,
          position_ids: [],
          monitor_type: 'ai',
          config: {
            run_interval_minutes: interval,
            symbol: target.symbol,
            market: target.market,
            language: this.$store && this.$store.getters ? (this.$store.getters.lang || 'zh-CN') : (this.$i18n ? this.$i18n.locale : 'zh-CN')
          },
          notification_config: { channels },
          is_active: true
        })
        if (!res || res.code === 0) throw new Error((res && res.msg) || this.text.monitorCreated)
        this.$message.success(this.text.monitorCreated)
        this.taskModalVisible = false
        await this.loadMonitors()
      } catch (e) {
        this.$message.error((e && e.response && e.response.data && e.response.data.msg) || (e && e.message) || 'Create monitor failed')
      } finally {
        this.savingMonitor = false
      }
    },
    async toggleMonitor (m) {
      try {
        await updateMonitor(m.id, { is_active: !m.is_active })
        this.$message.success(this.text.monitorUpdated)
        await this.loadMonitors()
      } catch (e) {
        this.$message.error((e && e.response && e.response.data && e.response.data.msg) || (e && e.message) || 'Update monitor failed')
      }
    },
    async removeMonitor (m) {
      try {
        await deleteMonitor(m.id)
        this.$message.success(this.text.monitorDeleted)
        await this.loadMonitors()
      } catch (e) {
        this.$message.error((e && e.response && e.response.data && e.response.data.msg) || (e && e.message) || 'Delete monitor failed')
      }
    },
    handleFiles (e) {
      const files = Array.from(e.target.files || [])
      this.appendImageFiles(files)
      e.target.value = ''
    },
    appendImageFiles (files) {
      files.forEach(file => {
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return
        const reader = new FileReader()
        reader.onload = () => {
          this.attachments.push({ name: file.name, mime_type: file.type, data_url: reader.result })
        }
        reader.readAsDataURL(file)
      })
    },
    handlePaste (event) {
      const items = Array.from((event.clipboardData && event.clipboardData.items) || [])
      const files = items
        .filter(item => item.kind === 'file' && /^image\/(png|jpeg|webp)$/.test(item.type))
        .map(item => item.getAsFile())
        .filter(Boolean)
      if (!files.length) return
      event.preventDefault()
      this.appendImageFiles(files)
      this.$message.success(this.i18nText('aiAssetAnalysis.copilot.imageAdded', 'Image added to this message'))
    },
    removeAttachment (idx) {
      this.attachments.splice(idx, 1)
    },
    async sendMessage () {
      if (!this.canSend) return
      const content = this.draft.trim()
      this.recordCopilotEvent('message_sent', this.activeResearchMode, {
        source: 'composer',
        mode: this.activeResearchMode
      })
      const attachments = this.attachments.slice()
      const referencedReportId = this.draftReferencedReportId
      const contextLock = this.draftContextLock ? { ...this.draftContextLock, locked: true } : null
      const signature = `${content}|${attachments.map(item => item.name || item.data_url || '').join(',')}`
      const now = Date.now()
      if (this.lastSendSignature === signature && now - this.lastSendAt < 1500) return
      this.lastSendSignature = signature
      this.lastSendAt = now
      this.sending = true
      const beforeSendCount = this.messages.length
      const createdAt = new Date().toISOString()
      const userMsg = {
        localId: `local-${localId++}`,
        role: 'user',
        content: content || this.i18nText('aiAssetAnalysis.copilot.imageUploadedFallback', '[image uploaded]'),
        attachments,
        created_at: createdAt
      }
      this.messages.push(userMsg)
      this.draft = ''
      this.attachments = []
      this.draftContextLock = null
      this.draftReferencedReportId = null
      this.$nextTick(this.resizeComposer)
      this.scrollToBottom()
      if (this.pendingAgentTask && this.pendingAgentTask.type === 'monitor_setup' && await this.handleMonitorAgentMessage(content)) {
        const newMessages = this.messages.slice(beforeSendCount)
        for (const message of newMessages) {
          if (!message.id) await this.persistCopilotMessage(message, message.role === 'user' ? 'monitor_user' : 'monitor_agent')
        }
        this.sending = false
        this.scrollToBottom()
        return
      }
      if (this.pendingAgentTask) {
        this.pendingAgentTask.originalPrompt = content
      }
      if (this.pendingAgentTask && this.pendingAgentTask.type === 'market_diagnosis') {
        const target = this.normalizeSymbolOption(contextLock || this.pendingAgentTask.target || this.context)
        if (target && target.symbol) {
          await this.executeProfessionalAnalysis(userMsg, target)
          return
        }
      }
      if (await this.handlePendingStrategyAgentMessage(content, userMsg, contextLock)) {
        this.sending = false
        this.scrollToBottom()
        return
      }
      const assistantMsg = {
        localId: `local-${localId++}`,
        role: 'assistant',
        content: this.thinkingText,
        isThinking: true,
        meta: '',
        created_at: new Date().toISOString()
      }
      this.messages.push(assistantMsg)
      this.scrollToBottom()
      const preflight = this.loadAgentPreflight()
      let routing
      try {
        routing = await this.handleBackendAgentIntent(content, attachments, contextLock)
      } catch (error) {
        this.replacePendingAssistant(assistantMsg, { role: 'assistant', content: error.message || this.text.chatUnavailable, isThinking: false })
        this.sending = false
        return
      }
      if (routing.handled) {
        this.messages = this.messages.filter(item => item.localId !== assistantMsg.localId)
        this.sending = false
        this.scrollToBottom()
        return
      }
      await preflight
      const blockers = this.agentPreflight && Array.isArray(this.agentPreflight.blockers) ? this.agentPreflight.blockers : []
      if (blockers.length) {
        const guide = this.buildPreflightGuide(this.pendingAgentTask)
        const guideMessage = this.replacePendingAssistant(assistantMsg, {
          localId: `local-${localId++}`,
          role: 'assistant',
          content: guide.content,
          actions: guide.actions,
          meta: guide.meta,
          isThinking: false
        })
        await this.persistCopilotMessage(guideMessage, 'preflight_guide')
        this.sending = false
        this.scrollToBottom()
        return
      }
      const resolvedSymbol = contextLock || routing.resolvedSymbol
      if (resolvedSymbol) {
        const normalized = this.normalizeSymbolOption(resolvedSymbol)
        if (normalized) {
          this.context.market = normalized.market
          this.context.symbol = normalized.symbol
          this.selectedSymbolValue = this.symbolOptionValue(normalized)
          this.symbolOptions = [normalized].concat(this.symbolOptions || [])
        }
      }
      const chatContext = this.buildChatContext(content, resolvedSymbol)
      if (routing.plan) chatContext.agent_intent = routing.plan
      const preferJsonResponse = this.isMonitorIntent(content)
      if (!preferJsonResponse) {
        try {
          await this.sendMessageStream(content, attachments, assistantMsg, chatContext, referencedReportId)
          this.sending = false
          this.scrollToBottom()
          return
        } catch (streamError) {
          if (streamError && (streamError.streamAccepted || streamError.streamHasContent)) {
            const hasContent = Boolean(String(assistantMsg.content || '').trim()) && !assistantMsg.isThinking
            assistantMsg.isThinking = false
            if (hasContent) {
              assistantMsg.streamWarning = this.text.streamInterrupted
              this.$message.warning(this.text.streamInterrupted)
            } else {
              assistantMsg.content = streamError.message || this.text.chatUnavailable
            }
            this.sending = false
            this.scrollToBottom()
            return
          }
          assistantMsg.content = this.thinkingText
          assistantMsg.isThinking = true
        }
      }
      try {
        const res = await chatMessage({
          session_id: this.sessionId,
          message: content,
          attachments,
          context: chatContext,
          referenced_report_id: referencedReportId,
          language: this.$i18n ? this.$i18n.locale : 'zh-CN'
        })
        if (res && res.code === 0) throw new Error(res.msg || this.text.chatUnavailable)
        const data = res.data || {}
        this.sessionId = data.session_id || this.sessionId
        const fallbackAssistant = this.replacePendingAssistant(assistantMsg, {
          localId: `local-${localId++}`,
          id: data.message_id || undefined,
          role: 'assistant',
          content: data.reply || this.text.chatUnavailable,
          isThinking: false,
          actions: data.actions || [],
          contextUsage: data.context_usage || null,
          meta: data.intent ? `${data.intent} · ${data.confidence || 50}%` : ''
        })
        fallbackAssistant.created_at = fallbackAssistant.created_at || new Date().toISOString()
        this.appendMemoryActions(fallbackAssistant, data.memory_candidates)
        this.appendAgentNextActions(fallbackAssistant)
        this.loadSessions()
        this.loadSessionMemory()
      } catch (e) {
        const guide = this.buildSetupGuide(e, chatContext)
        const setupMsg = this.replacePendingAssistant(assistantMsg, {
          localId: `local-${localId++}`,
          role: 'assistant',
          content: guide.content,
          isThinking: false,
          actions: guide.actions,
          meta: guide.meta
        })
        await this.persistCopilotMessage(setupMsg, 'setup_guide')
      } finally {
        this.sending = false
        this.loadBilling()
        this.scrollToBottom()
      }
    },
    normalizeSymbolOption (item) {
      if (!item) return null
      const market = item.market || item.category || this.context.market || 'Crypto'
      const symbol = String(item.symbol || item.code || item.ticker || '').trim()
      if (!symbol) return null
      return {
        market,
        symbol: symbol.toUpperCase(),
        name: item.name || item.display_name || item.label || '',
        exchange_id: item.exchange_id || item.exchangeId || '',
        market_type: item.market_type || item.marketType || (market === 'Crypto' ? 'spot' : ''),
        instrument_id: item.instrument_id || item.instrumentId || '',
        settle_currency: item.settle_currency || item.settleCurrency || ''
      }
    },
    parseSymbolValue (value) {
      if (String(value || '').includes('|')) {
        const [market, exchangeId, marketType, instrumentId, symbol] = String(value || '').split('|')
        return {
          market,
          exchange_id: exchangeId,
          market_type: marketType,
          instrument_id: instrumentId,
          symbol
        }
      }
      const [market, ...rest] = String(value || '').split(':')
      return { market: market || this.context.market, symbol: rest.join(':') || '' }
    },
    symbolOptionValue (item) {
      return [
        item.market || '',
        item.exchange_id || '',
        item.market_type || '',
        item.instrument_id || '',
        item.symbol || ''
      ].join('|')
    },
    normalizePriceMap (raw) {
      if (!raw || typeof raw !== 'object') return {}
      const out = {}
      const list = Array.isArray(raw) ? raw : Object.keys(raw).map(key => raw[key])
      list.forEach(item => {
        if (item && item.market && item.symbol) {
          out[this.watchKey(item)] = item
          out[this.watchAssetKey(item)] = item
        }
      })
      return out
    },
    eventTitle (event) {
      if (!event) return '--'
      if (this.isZh) return event.title_zh || event.name_zh || event.title || event.event || event.name || event.name_en || '--'
      return event.title_en || event.name_en || event.title || event.event || event.name || '--'
    },
    impactClass (event) {
      const raw = String((event && (event.impact || event.importance || event.importance_label)) || '').toLowerCase()
      if (raw.includes('high') || raw.includes('重要') || raw.includes('高')) return 'high'
      if (raw.includes('low') || raw.includes('低')) return 'low'
      return 'medium'
    },
    impactLabel (event) {
      const cls = this.impactClass(event)
      if (cls === 'high') return this.text.impactHigh
      if (cls === 'low') return this.text.impactLow
      return this.text.impactMedium
    },
    formatEventTime (event) {
      const date = String((event && (event.date || event.datetime)) || '').slice(5, 10)
      const time = (event && event.time) || ''
      return `${date || '--'} ${time}`.trim()
    },
    eventKey (event) {
      return `${(event && (event.date || event.datetime)) || ''}-${(event && event.time) || ''}-${this.eventTitle(event)}`
    },
    formatMessageTime (msg) {
      const raw = msg && (msg.created_at || msg.createdAt || msg.timestamp || msg.time)
      if (!raw) return ''
      const date = new Date(raw)
      if (Number.isNaN(date.getTime())) return ''
      const pad = value => String(value).padStart(2, '0')
      const now = new Date()
      const sameDay = date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
      return sameDay ? time : `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${time.slice(0, 5)}`
    },
    normalizeMessages (list = []) {
      const seenIds = new Set()
      const out = []
      ;(Array.isArray(list) ? list : []).forEach(raw => {
        if (!raw) return
        const msg = { ...raw }
        if (msg.id) {
          const idKey = String(msg.id)
          if (seenIds.has(idKey)) return
          seenIds.add(idKey)
        }
        const prev = out[out.length - 1]
        if (prev && prev.role === msg.role && String(prev.content || '') === String(msg.content || '')) {
          const prevTs = Date.parse(prev.created_at || prev.createdAt || '')
          const ts = Date.parse(msg.created_at || msg.createdAt || '')
          if (!prevTs || !ts || Math.abs(ts - prevTs) < 10000) return
        }
        if (msg.report) {
          msg.actions = this.reportActions(msg)
        }
        out.push(msg)
      })
      return out
    },
    macroContextForMessage (message = '') {
      const lower = String(message || '').toLowerCase()
      const keywords = ['非农', 'nfp', 'cpi', 'fomc', 'fed', '利率', '就业', '失业', 'pce', 'gdp', '通胀', 'inflation', 'payroll']
      const enabled = keywords.some(key => lower.includes(String(key).toLowerCase()))
      if (!enabled) return { enabled: false, events: [] }
      const events = (this.calendarEvents || []).slice(0, 30).map(event => ({
        title: this.eventTitle(event),
        date: event.date || event.datetime || '',
        time: event.time || '',
        impact: event.impact || event.importance || event.importance_label || '',
        country: event.country || event.region || event.currency || '',
        actual: event.actual,
        forecast: event.forecast,
        previous: event.previous
      }))
      return { enabled, events }
    },
    async sendMessageStream (content, attachments, assistantMsg, chatContext = null, referencedReportId = null) {
      if (!window.fetch || !window.ReadableStream) throw new Error('Streaming is not supported')
      const language = this.$i18n ? this.$i18n.locale : 'zh-CN'
      const headers = {
        'Content-Type': 'application/json',
        'Accept-Language': language,
        'X-App-Lang': language,
        'Cache-Control': 'no-cache'
      }
      const token = this.getAccessToken()
      if (token) {
        headers.Authorization = `Bearer ${token}`
        headers[ACCESS_TOKEN] = token
        headers.token = token
      }
      const response = await fetch('/api/ai/chat/message/stream', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          session_id: this.sessionId,
          message: content,
          attachments,
          context: chatContext || this.buildChatContext(content),
          referenced_report_id: referencedReportId,
          language
        })
      })
      if (!response.ok || !response.body) throw new Error(`Stream API ${response.status}`)
      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let streamComplete = false
      let streamAccepted = false
      try {
        while (!streamComplete) {
          const { value, done } = await reader.read()
          if (done) {
            buffer += decoder.decode()
            break
          }
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split(/\r?\n\r?\n/)
          buffer = parts.pop() || ''
          for (const part of parts) {
            const eventName = this.handleStreamEvent(part, assistantMsg)
            if (eventName === 'accepted' || eventName === 'meta') streamAccepted = true
            if (eventName === 'done') {
              streamComplete = true
              break
            }
          }
          this.scrollToBottom()
          if (streamComplete) {
            try {
              await reader.cancel()
            } catch (_) {}
          }
        }
        if (!streamComplete && buffer.trim()) {
          const eventName = this.handleStreamEvent(buffer, assistantMsg)
          if (eventName === 'accepted' || eventName === 'meta') streamAccepted = true
          streamComplete = eventName === 'done'
        }
        if (!streamComplete) throw new Error(this.text.streamIncomplete)
        if (assistantMsg.isThinking) {
          assistantMsg.content = ''
          assistantMsg.isThinking = false
        }
        if (!assistantMsg.content) throw new Error('Empty stream response')
        this.loadSessions()
      } catch (error) {
        try {
          await reader.cancel()
        } catch (_) {}
        if (error && typeof error === 'object') {
          error.streamAccepted = streamAccepted
          error.streamHasContent = Boolean(String(assistantMsg.content || '').trim()) && !assistantMsg.isThinking
        }
        throw error
      } finally {
        this.loadBilling()
      }
    },
    handleStreamEvent (rawEvent, assistantMsg) {
      const lines = String(rawEvent || '').split(/\r?\n/)
      const eventName = (lines.find(line => line.startsWith('event:')) || '').replace(/^event:\s*/, '').trim()
      const data = lines
        .filter(line => line.startsWith('data:'))
        .map(line => line.replace(/^data:\s*/, ''))
        .join('\n')
      if (!data) return eventName
      const payload = JSON.parse(data)
      if (eventName === 'accepted') {
        this.sessionId = payload.session_id || this.sessionId
      } else if (eventName === 'meta') {
        this.sessionId = payload.session_id || this.sessionId
        assistantMsg.meta = payload.intent || ''
        this.setAgentUsageActions(assistantMsg, payload.actions, payload.agent_usage)
        assistantMsg.contextUsage = payload.context_usage || null
      } else if (eventName === 'delta') {
        if (payload.text) this.clearThinkingMessage(assistantMsg)
        assistantMsg.content += payload.text || ''
      } else if (eventName === 'replace') {
        if (payload.text) this.clearThinkingMessage(assistantMsg)
        assistantMsg.content = payload.text || assistantMsg.content
        assistantMsg.streamWarning = ''
      } else if (eventName === 'warning') {
        assistantMsg.streamWarning = payload.code === 'output_limit'
          ? this.text.outputLimit
          : (payload.msg || this.text.streamIncomplete)
      } else if (eventName === 'done') {
        this.sessionId = payload.session_id || this.sessionId
        if (payload.message_id) this.$set ? this.$set(assistantMsg, 'id', payload.message_id) : (assistantMsg.id = payload.message_id)
        assistantMsg.created_at = assistantMsg.created_at || new Date().toISOString()
        assistantMsg.meta = payload.intent ? `${payload.intent} - ${payload.confidence || 50}%` : assistantMsg.meta
        this.setAgentUsageActions(assistantMsg, payload.actions, payload.agent_usage)
        this.appendMemoryActions(assistantMsg, payload.memory_candidates)
        this.appendAgentNextActions(assistantMsg)
        assistantMsg.contextUsage = payload.context_usage || assistantMsg.contextUsage || null
        this.loadSessionMemory()
      } else if (eventName === 'error') {
        throw new Error(payload.msg || this.text.chatUnavailable)
      }
      return eventName
    },
    setAgentUsageActions (message, actions = [], usage = null) {
      if (!message) return
      const current = (Array.isArray(message.actions) ? message.actions : []).filter(action => action && action.type !== 'agent_usage')
      let usageAction = (Array.isArray(actions) ? actions : []).find(action => action && action.type === 'agent_usage')
      if (!usageAction && usage) {
        usageAction = {
          key: 'agent-usage',
          type: 'agent_usage',
          icon: 'apartment',
          label: this.text.usedThisTurn,
          payload: usage
        }
      }
      message.actions = usageAction ? [usageAction, ...current] : current
    },
    getAccessToken () {
      return storage.get(ACCESS_TOKEN) || storage.get('Authorization') || storage.get('token') || ''
    },
    escapeHtml (value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    },
    renderInlineMarkdown (value) {
      return this.escapeHtml(value)
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    },
    renderMarkdown (text) {
      const source = String(text || '').replace(/\r\n/g, '\n')
      const blocks = []
      const withTokens = source.replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const idx = blocks.length
        const label = lang || 'text'
        blocks.push(
          `<div class="qd-code-block">` +
          `<div class="qd-code-head"><span>${this.escapeHtml(label)}</span><button type="button" class="qd-copy-code" data-code="${encodeURIComponent(code)}">Copy</button></div>` +
          `<pre><code class="language-${this.escapeHtml(label)}">${this.escapeHtml(code)}</code></pre>` +
          `</div>`
        )
        return `\n@@CODE_BLOCK_${idx}@@\n`
      })
      const lines = withTokens.split('\n')
      const out = []
      let listType = ''
      let paragraph = []
      const closeList = () => {
        if (listType) {
          out.push(`</${listType}>`)
          listType = ''
        }
      }
      const closeParagraph = () => {
        if (paragraph.length) {
          out.push(`<p>${paragraph.map(item => this.renderInlineMarkdown(item)).join('<br>')}</p>`)
          paragraph = []
        }
      }
      const closeBlocks = () => {
        closeParagraph()
        closeList()
      }
      const renderTable = (rows) => {
        const cells = rows
          .map(row => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim()))
          .filter(row => row.length > 1)
        if (cells.length < 2) return ''
        const header = cells[0]
        const body = cells.slice(2)
        return [
          '<div class="qd-md-table-wrap"><table class="qd-md-table">',
          '<thead><tr>',
          header.map(cell => `<th>${this.renderInlineMarkdown(cell)}</th>`).join(''),
          '</tr></thead>',
          '<tbody>',
          body.map(row => `<tr>${row.map(cell => `<td>${this.renderInlineMarkdown(cell)}</td>`).join('')}</tr>`).join(''),
          '</tbody></table></div>'
        ].join('')
      }
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index]
        const trimmed = line.trim()
        const token = line.match(/^@@CODE_BLOCK_(\d+)@@$/)
        if (token) {
          closeBlocks()
          out.push(blocks[Number(token[1])] || '')
          continue
        }
        if (!trimmed) {
          closeBlocks()
          continue
        }
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
          closeBlocks()
          out.push('<hr>')
          continue
        }
        const nextLine = lines[index + 1] || ''
        if (trimmed.includes('|') && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(nextLine)) {
          closeBlocks()
          const tableRows = [line, nextLine]
          index += 2
          while (index < lines.length && lines[index].trim().includes('|')) {
            tableRows.push(lines[index])
            index++
          }
          index--
          out.push(renderTable(tableRows))
          continue
        }
        const heading = trimmed.match(/^(#{1,4})\s+(.+)$/)
        if (heading) {
          closeBlocks()
          const level = Math.min(heading[1].length + 2, 5)
          out.push(`<h${level}>${this.renderInlineMarkdown(heading[2])}</h${level}>`)
          continue
        }
        const plainHeading = trimmed.match(/^(\d+)[).、）]\s*(.{2,80})$/)
        if (plainHeading) {
          closeBlocks()
          out.push(`<h4>${this.renderInlineMarkdown(`${plainHeading[1]}. ${plainHeading[2]}`)}</h4>`)
          continue
        }
        const quote = trimmed.match(/^>\s+(.+)$/)
        if (quote) {
          closeBlocks()
          out.push(`<blockquote>${this.renderInlineMarkdown(quote[1])}</blockquote>`)
          continue
        }
        const ordered = trimmed.match(/^\d+[.)、）]\s+(.+)$/)
        const unordered = trimmed.match(/^[-*+]\s+(.+)$/)
        if (ordered || unordered) {
          closeParagraph()
          const target = ordered ? 'ol' : 'ul'
          if (listType !== target) {
            closeList()
            out.push(`<${target}>`)
            listType = target
          }
          out.push(`<li>${this.renderInlineMarkdown((ordered || unordered)[1])}</li>`)
          continue
        }
        closeList()
        paragraph.push(line)
      }
      closeParagraph()
      closeList()
      return out.join('')
    },
    async handleMessageContentClick (event) {
      const btn = event.target && event.target.closest ? event.target.closest('.qd-copy-code') : null
      if (!btn) return
      const code = decodeURIComponent(btn.getAttribute('data-code') || '')
      try {
        await navigator.clipboard.writeText(code)
      } catch (_) {
        const textarea = document.createElement('textarea')
        textarea.value = code
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      this.$message.success(this.i18nText('aiAssetAnalysis.copilot.codeCopied', 'Code copied'))
    },
    setupAction (key) {
      const map = {
        ai: {
          key: 'settings-ai',
          icon: 'setting',
          label: this.i18nText('aiCopilot.setup.action.ai', 'Configure AI/LLM'),
          path: '/settings',
          query: { section: 'ai' }
        },
        data: {
          key: 'settings-data',
          icon: 'database',
          label: this.i18nText('aiCopilot.setup.action.data', 'Configure data sources'),
          path: '/settings',
          query: { section: 'data_source' }
        },
        broker: {
          key: 'broker-accounts',
          icon: 'bank',
          label: this.i18nText('aiCopilot.setup.action.broker', 'Configure broker accounts'),
          path: '/broker-accounts'
        },
        billing: {
          key: 'billing',
          icon: 'wallet',
          label: this.i18nText('aiCopilot.setup.action.billing', 'Top up'),
          path: '/billing'
        },
        credits: {
          key: 'profile-credits',
          icon: 'profile',
          label: this.i18nText('aiCopilot.setup.action.credits', 'View credit records'),
          path: '/profile',
          query: { tab: 'credits' }
        },
        login: {
          key: 'login',
          icon: 'login',
          label: this.i18nText('aiCopilot.setup.action.login', 'Sign in again'),
          path: '/user/login'
        }
      }
      return map[key]
    },
    classifySetupIssue (raw) {
      const text = String(raw || '')
      const lower = text.toLowerCase()
      const includesAny = patterns => patterns.some(pattern => pattern.test ? pattern.test(text) : lower.includes(pattern))
      if (includesAny([
        /local-only|not implemented/i,
        /llm|large language model|provider|model provider|api key|apikey|base url|openrouter|openai|anthropic|deepseek|atlascloud/i,
        '大模型',
        '模型供应商',
        '模型提供商',
        '接口密钥',
        '密钥',
        '未接入'
      ])) return 'llm'
      if (includesAny([
        /insufficient|credit|credits|billing|quota|payment|vip|top up/i,
        '积分',
        '余额不足',
        '充值',
        '计费',
        '额度',
        '支付'
      ])) return 'billing'
      if (includesAny([
        /broker|broker account|exchange account|credential|api secret|trade account/i,
        '券商',
        '交易所账户',
        '交易账户',
        '凭据',
        'api secret'
      ])) return 'broker'
      if (includesAny([
        /data source|market data|quote|quotes|price feed|symbol not found|no data|provider unavailable|akshare|tushare|yfinance|ccxt/i,
        '数据源',
        '行情',
        '报价',
        '没有数据',
        '标的不存在',
        '数据不可用'
      ])) return 'data'
      if (includesAny([
        /401|403|unauthorized|forbidden|permission|token|login/i,
        '未授权',
        '无权限',
        '登录',
        '令牌',
        '权限'
      ])) return 'auth'
      if (includesAny([
        /network|timeout|failed to fetch|502|503|504|gateway|connection|econn/i,
        '网络',
        '超时',
        '连接失败',
        '网关',
        '请求失败'
      ])) return 'network'
      return 'unknown'
    },
    buildSetupGuide (error, context = {}) {
      const raw = (error && error.response && error.response.data && error.response.data.msg) || (error && error.message) || ''
      const type = this.classifySetupIssue(raw)
      const symbol = context && context.symbol ? `${context.market || ''}:${context.symbol}`.replace(/^:/, '') : ''
      const rawLine = raw ? `\n\n> ${raw}` : ''
      const guide = (typeKey, metaFallback, titleFallback, bodyFallback, actionKeys, values = {}) => ({
        meta: this.i18nText(`aiCopilot.setup.${typeKey}.meta`, metaFallback, values),
        content: [
          `### ${this.i18nText(`aiCopilot.setup.${typeKey}.title`, titleFallback, values)}`,
          '',
          this.i18nText(`aiCopilot.setup.${typeKey}.body`, bodyFallback, values)
        ].join('\n') + rawLine,
        actions: actionKeys.map(key => this.setupAction(key)).filter(Boolean)
      })
      if (type === 'llm') {
        return guide(
          'llm',
          'Setup check: AI/LLM',
          'Configure an LLM first',
          'No usable LLM provider is available yet. Open AI/LLM settings, fill the provider API key, model, and Base URL, then save and retry.',
          ['ai']
        )
      }
      if (type === 'data') {
        return guide(
          'data',
          'Setup check: data source',
          'Market data source may not be configured',
          symbol
            ? 'I recognized {symbol}, but the system could not fetch usable quotes or market data. Check data source settings and provider connectivity.'
            : 'The system could not fetch usable quotes or market data. Check data source settings and provider connectivity.',
          ['data'],
          { symbol }
        )
      }
      if (type === 'broker') {
        return guide(
          'broker',
          'Setup check: broker account',
          'Broker account is not configured',
          'This action needs a connected broker or exchange account. Add a broker account, test read-only or paper trading first, then enable live automation.',
          ['broker']
        )
      }
      if (type === 'billing') {
        return guide(
          'billing',
          'Setup check: credits',
          'Not enough credits',
          'AI chat, image analysis, backtests, or monitors may consume credits. Top up credits or review credit records before retrying.',
          ['billing', 'credits']
        )
      }
      if (type === 'auth') {
        return guide(
          'auth',
          'Setup check: auth',
          'Sign-in or permission issue',
          'This request did not pass authentication or permission checks. Sign in again or confirm your account has access to this feature.',
          ['login']
        )
      }
      if (type === 'network') {
        return guide(
          'network',
          'Setup check: service connection',
          'Backend service or external provider is unavailable',
          'This looks like a service connectivity issue. Confirm the backend service is running and check LLM/data-provider network access.',
          ['ai', 'data']
        )
      }
      return guide(
        'unknown',
        'Setup check',
        'Configuration check needed',
        'Check AI/LLM settings, data source settings, and broker account connections, then retry.',
        ['ai', 'data', 'broker']
      )
    },
    scrollToBottom () {
      this.$nextTick(() => {
        const el = this.$refs.messages
        if (el) el.scrollTop = el.scrollHeight
      })
    },
    watchKey (item) {
      return [
        item.market || '',
        item.exchange_id || '',
        item.market_type || '',
        item.symbol || ''
      ].join(':')
    },
    watchAssetKey (item) {
      return [item.market || '', item.symbol || ''].join(':')
    },
    priceFor (item) {
      return this.watchlistPrices[this.watchKey(item)] || this.watchlistPrices[this.watchAssetKey(item)] || null
    },
    priceChangePercent (price) {
      if (!price) return null
      const candidates = [price.changePercent, price.change_percent, price.changePct, price.change_pct, price.percent]
      for (const value of candidates) {
        const n = Number(value)
        if (Number.isFinite(n)) return n
      }
      return null
    },
    watchChangeClass (item) {
      const pct = this.priceChangePercent(this.priceFor(item))
      if (pct === null) return ''
      return pct >= 0 ? 'up' : 'down'
    },
    formatPriceValue (value, market = '') {
      const n = Number(value)
      if (!Number.isFinite(n) || n <= 0) return '--'
      if (['USStock', 'HKStock'].includes(String(market))) {
        return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }
      if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
      if (n >= 1) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
      return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })
    },
    formatChangePercent (price) {
      const currentPrice = Number(price && price.price)
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) return '--'
      const pct = this.priceChangePercent(price)
      if (pct === null) return '--'
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
    },
    marketLabel (market) {
      const key = `dashboard.analysis.market.${market}`
      const translated = this.$t ? this.$t(key) : key
      if (translated && translated !== key) return translated
      const found = this.markets.find(m => m.value === market)
      return found ? found.label : (market || '--')
    },
    marketPillClass (market) {
      return `market-${String(market || 'default').toLowerCase()}`
    },
    monitorSymbol (m) {
      const cfg = m.config || {}
      return cfg.symbol || m.symbol || m.name || '--'
    },
    intervalText (m) {
      const minutes = Number((m.config && m.config.run_interval_minutes) || m.interval_min || 0)
      if (!minutes) return '--'
      if (minutes >= 1440) return `${Math.round(minutes / 1440)}d`
      if (minutes >= 60) return `${Math.round(minutes / 60)}h`
      return `${minutes}m`
    },
    notificationText (m) {
      const config = (m && m.notification_config) || {}
      const channels = this.normalizeMonitorChannels(config.channels || [])
      return channels.length ? channels.map(channel => this.monitorChannelLabel(channel)).join(', ') : this.i18nText('aiAssetAnalysis.copilot.monitorNoNotify', 'record only')
    },
    formatIntervalText (value) {
      const minutes = Number(value || 0)
      if (!minutes) return this.i18nText('aiAssetAnalysis.copilot.intervalNotSet', 'Not set')
      if (minutes >= 1440 && minutes % 1440 === 0) {
        const days = Math.round(minutes / 1440)
        return this.i18nText('aiAssetAnalysis.copilot.intervalDays', '{days}d', { days })
      }
      if (minutes >= 60 && minutes % 60 === 0) {
        const hours = Math.round(minutes / 60)
        return this.i18nText('aiAssetAnalysis.copilot.intervalHours', '{hours}h', { hours })
      }
      return this.i18nText('aiAssetAnalysis.copilot.intervalMinutes', '{minutes}m', { minutes })
    },
    formatNum (num) {
      const n = Number(num)
      if (!Number.isFinite(n)) return '--'
      return n.toFixed(2)
    }
  }
}
</script>

<style scoped lang="less">
.copilot-workbench {
  --qd-bg: #eef3f8;
  --qd-panel: #ffffff;
  --qd-panel-soft: #f7fafd;
  --qd-panel-strong: #f1f6fb;
  --qd-border: #dce6f1;
  --qd-border-soft: #e8eff7;
  --qd-text: #12243d;
  --qd-text-muted: #6b7f99;
  --qd-text-subtle: #92a2b6;
  --qd-accent: var(--primary-color, #1677ff);
  --qd-accent-soft: color-mix(in srgb, var(--qd-accent) 10%, #ffffff);
  --qd-accent-weak: color-mix(in srgb, var(--qd-accent) 8%, transparent);
  --qd-accent-border: color-mix(in srgb, var(--qd-accent) 42%, transparent);
  --qd-accent-ring: color-mix(in srgb, var(--qd-accent) 12%, transparent);
  --qd-green: #0aa375;
  --qd-red: #e54b4b;
  --qd-shadow: 0 12px 34px rgba(20, 43, 72, 0.08);

  display: grid;
  grid-template-columns: minmax(240px, 280px) minmax(560px, 1fr) minmax(270px, 320px);
  gap: 10px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(238, 243, 248, 0.88)),
    var(--qd-bg);
  color: var(--qd-text);
}

.left-rail,
.right-rail,
.chat-panel {
  min-width: 0;
  min-height: 0;
}

.left-rail,
.right-rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.rail-panel,
.chat-panel {
  background: color-mix(in srgb, var(--qd-panel) 82%, transparent);
  border: 1px solid var(--qd-border-soft);
  border-radius: 8px;
  box-shadow: var(--qd-shadow);
  backdrop-filter: blur(18px);
}

.rail-panel {
  padding: 12px;
  overflow: hidden;
}

.sessions-panel {
  flex: 1 1 330px;
  min-height: 280px;
  display: flex;
  flex-direction: column;
}

.calendar-panel {
  flex: 0 1 42%;
  min-height: 220px;
}

.watch-panel {
  flex: 0 0 58%;
  min-height: 0;
}

.monitor-panel {
  flex: 1 1 270px;
  min-height: 240px;
}

.panel-head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
  margin-bottom: 10px;
  color: var(--qd-text);
  font-size: 13px;
  font-weight: 700;
}

.panel-head .anticon {
  color: var(--qd-accent);
}

.panel-head ::v-deep .ant-btn-link {
  height: 28px;
  padding: 0 4px;
  color: var(--qd-accent);
  font-weight: 600;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 3px;
  margin-bottom: 10px;
  border: 1px solid var(--qd-border-soft);
  border-radius: 8px;
  background: var(--qd-panel-soft);
}

.segmented button {
  min-width: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--qd-text-muted);
  font-size: 12px;
  line-height: 26px;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s;
}

.segmented button.active {
  background: var(--qd-panel);
  color: var(--qd-accent);
  font-weight: 700;
  box-shadow: 0 1px 5px rgba(20, 43, 72, 0.08);
}

.session-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 3px;
  scrollbar-width: thin;
}

.session-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
  border: 1px solid var(--qd-border-soft);
  border-radius: 8px;
  background: var(--qd-panel-soft);
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s, transform 0.18s;
}

.session-row:hover {
  border-color: var(--qd-accent-border);
  background: var(--qd-panel);
  box-shadow: 0 6px 18px var(--qd-accent-weak);
  transform: translateY(-1px);
}

.session-row.active {
  border-color: color-mix(in srgb, var(--qd-accent) 58%, transparent);
  background: var(--qd-accent-soft);
}

.session-delete {
  width: 24px;
  height: 28px;
  margin-right: 4px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #7590ae;
  cursor: pointer;
}

.session-delete:hover {
  color: var(--qd-red);
  background: rgba(229, 75, 75, 0.1);
}

.session-card,
.calendar-card {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s, transform 0.18s;
}

.calendar-card:hover {
  border-color: var(--qd-accent-border);
  background: var(--qd-panel);
  box-shadow: 0 6px 18px var(--qd-accent-weak);
  transform: translateY(-1px);
}

.session-card {
  display: block;
  padding: 9px 10px;
}

.session-card strong,
.watch-main strong,
.monitor-card strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: var(--qd-text);
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-card span,
.watch-main em,
.monitor-card span {
  display: block;
  min-width: 0;
  margin-top: 2px;
  overflow: hidden;
  color: var(--qd-text-subtle);
  font-size: 12px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-list,
.watch-list,
.monitor-list {
  display: grid;
  gap: 7px;
  overflow-y: auto;
  max-height: calc(100% - 72px);
  padding-right: 3px;
  scrollbar-width: thin;
}

.session-list + .empty-mini,
.sessions-panel > .empty-mini {
  flex: 1;
}

.calendar-card {
  border: 1px solid var(--qd-border-soft);
  background: var(--qd-panel-soft);
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 8px 9px;
}

.calendar-card strong {
  min-width: 0;
  overflow: hidden;
  color: var(--qd-text);
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-time {
  color: var(--qd-text-subtle);
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 11px;
}

.impact-pill {
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
  background: #fff4d6;
  color: #9a6200;
  white-space: nowrap;
}

.impact-pill.high {
  background: #ffe7e5;
  color: #b42318;
}

.impact-pill.low {
  background: #e9fbdc;
  color: #237804;
}

.empty-mini,
.error-note {
  min-height: 56px;
  display: grid;
  place-items: center;
  padding: 12px;
  border: 1px dashed var(--qd-border);
  border-radius: 8px;
  color: var(--qd-text-subtle);
  background: var(--qd-panel-soft);
  text-align: center;
}

.error-note {
  color: #d46b08;
  background: #fff8e8;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-hero {
  padding: 9px 16px;
  border-bottom: 1px solid var(--qd-border-soft);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--qd-accent) 7%, transparent), rgba(255, 255, 255, 0.08)),
    color-mix(in srgb, var(--qd-panel) 76%, transparent);
}

.hero-main {
  display: block;
}

.hero-copy {
  min-width: 0;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 17px;
  margin-bottom: 3px;
  padding: 1px 7px;
  border: 1px solid color-mix(in srgb, var(--qd-accent) 28%, transparent);
  border-radius: 999px;
  background: var(--qd-accent-soft);
  color: var(--qd-accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
}

.chat-hero h2 {
  margin: 0 0 2px;
  color: var(--qd-text);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
}

.chat-hero p {
  max-width: 680px;
  margin: 0;
  color: var(--qd-text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.context-bar {
  display: grid;
  grid-template-columns: max-content minmax(220px, 420px) max-content minmax(140px, 1fr);
  gap: 10px;
  align-items: center;
  justify-content: start;
  min-width: 0;
  margin-top: 0;
}

.composer-context-bar {
  width: 100%;
  max-width: none;
  margin: 0 0 8px;
}

.professional-report-button {
  height: 32px;
  border-color: color-mix(in srgb, var(--qd-accent) 42%, var(--qd-border));
  background: var(--qd-accent-soft);
  color: var(--qd-accent);
  font-weight: 800;
}

.session-memory-status {
  display: inline-flex;
  align-items: center;
  justify-self: end;
  gap: 6px;
  min-width: 0;
  padding: 5px 8px;
  border: 0;
  background: transparent;
  color: var(--qd-text-muted);
  cursor: pointer;
  font-size: 11px;
}

.session-memory-status:hover {
  color: var(--qd-accent);
}

.session-memory-status span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.referenced-report-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  margin: -2px 0 8px;
  padding: 5px 8px;
  border: 1px solid rgba(245, 158, 11, 0.34);
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  font-size: 11px;
  font-weight: 700;
}

.referenced-report-chip button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.context-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  min-height: 32px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--qd-text-muted);
  font-size: 11px;
}

.context-status .anticon {
  color: var(--qd-accent);
}

.context-status span {
  flex: 0 0 auto;
  font-weight: 700;
}

.context-status strong {
  min-width: 0;
  max-width: 240px;
  overflow: hidden;
  color: var(--qd-text-muted);
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-symbol-picker {
  min-width: 0;
}

.composer-actions ::v-deep .ant-btn,
.add-watch ::v-deep .ant-btn {
  border-radius: 6px;
  font-weight: 700;
}

.symbol-picker label {
  display: block;
  margin-bottom: 5px;
  color: var(--qd-text-muted);
  font-size: 12px;
  font-weight: 800;
}

.symbol-picker ::v-deep .ant-select {
  width: 100%;
}

.hero-symbol-picker ::v-deep .ant-select-selection {
  height: 32px;
}

.hero-symbol-picker ::v-deep .ant-select-selection__rendered {
  line-height: 30px;
}

.symbol-option {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.symbol-option span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--qd-text-subtle);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.symbol-market-pill {
  flex: 0 0 auto;
  min-width: 56px;
  padding: 2px 7px;
  border: 1px solid var(--qd-border-soft);
  border-radius: 5px;
  background: var(--qd-panel-strong);
  color: var(--qd-text-muted);
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
  line-height: 1.25;
  text-align: center;
}

.market-crypto {
  border-color: rgba(20, 184, 166, 0.34);
  background: rgba(20, 184, 166, 0.13);
  color: #14b8a6;
}

.market-usstock {
  border-color: rgba(59, 130, 246, 0.34);
  background: rgba(59, 130, 246, 0.13);
  color: #3b82f6;
}

.market-hkstock {
  border-color: rgba(139, 92, 246, 0.34);
  background: rgba(139, 92, 246, 0.13);
  color: #8b5cf6;
}

.market-cnstock {
  border-color: rgba(239, 68, 68, 0.34);
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.market-forex {
  border-color: rgba(34, 197, 94, 0.34);
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
}

.market-futures {
  border-color: rgba(245, 158, 11, 0.36);
  background: rgba(245, 158, 11, 0.13);
  color: #d97706;
}

.messages {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 18px 20px;
  background:
    radial-gradient(circle at 50% 8%, color-mix(in srgb, var(--qd-accent) 8%, transparent), transparent 34%),
    linear-gradient(180deg, rgba(247, 250, 253, 0.86) 0%, rgba(255, 255, 255, 0.94) 54%, rgba(247, 250, 253, 0.9) 100%);
}

.welcome {
  max-width: 880px;
  margin: 38px auto 0;
  text-align: center;
  color: var(--qd-text-muted);
}

.welcome > .anticon {
  display: inline-grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid color-mix(in srgb, var(--qd-accent) 24%, transparent);
  border-radius: 8px;
  background: var(--qd-accent-soft);
  color: var(--qd-accent);
  font-size: 22px;
}

.welcome h3 {
  margin: 12px 0 4px;
  color: var(--qd-text);
  font-size: 21px;
  font-weight: 800;
}

.welcome-prompts {
  display: grid;
  grid-template-columns: repeat(4, minmax(138px, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.quick-task-shelf {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 10px;
  width: min(940px, calc(100% - 20px));
  margin: 0 auto 18px;
  padding: 10px;
  border: 1px solid var(--qd-border-soft);
  border-radius: 8px;
  background: color-mix(in srgb, var(--qd-panel) 82%, transparent);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.quick-task-modal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 12px;
}

.quick-tools-modal .ant-modal-body {
  padding: 18px;
}

.quick-task-modal-grid .welcome-task,
.quick-task-shelf .welcome-task,
.welcome-prompts button {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 76px;
  padding: 11px 12px;
  border: 1px solid var(--qd-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--qd-panel) 88%, transparent);
  color: var(--qd-text);
  cursor: pointer;
  text-align: left;
  backdrop-filter: blur(14px);
  transition: border-color 0.18s, color 0.18s, background 0.18s, transform 0.18s, box-shadow 0.18s;
}

.quick-task-modal-grid .welcome-task:hover,
.quick-task-shelf .welcome-task:hover,
.welcome-prompts button:hover {
  border-color: var(--qd-accent-border);
  background: var(--qd-accent-soft);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.quick-task-modal-grid .welcome-task:hover .task-icon,
.quick-task-shelf .welcome-task:hover .task-icon,
.welcome-prompts button:hover .task-icon {
  border-color: var(--qd-accent-border);
  color: #fff;
  background: var(--qd-accent);
}

.task-icon {
  display: inline-grid;
  flex: 0 0 30px;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid color-mix(in srgb, var(--qd-accent) 22%, transparent);
  border-radius: 7px;
  background: var(--qd-accent-soft);
  color: var(--qd-accent);
  font-size: 15px;
  transition: border-color 0.18s, color 0.18s, background 0.18s;
}

.task-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.task-copy strong {
  color: var(--qd-text);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.task-copy em {
  color: var(--qd-text-muted);
  font-size: 11px;
  font-style: normal;
  line-height: 1.45;
}

.message {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.message.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(251, 191, 36, 0.28);
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(251, 191, 36, 0.2), rgba(255, 255, 255, 0.06));
  color: #fbbf24;
  flex: 0 0 32px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  font-size: 14px;
}

.message.user .avatar {
  border-color: rgba(56, 189, 248, 0.26);
  background: linear-gradient(145deg, rgba(56, 189, 248, 0.14), rgba(255, 255, 255, 0.05));
  color: #7dd3fc;
}

.bubble {
  max-width: 820px;
  width: fit-content;
  padding: 12px 14px;
  border: 1px solid var(--qd-border-soft);
  border-radius: 8px;
  background: var(--qd-panel);
  color: var(--qd-text);
  line-height: 1.72;
  box-shadow: 0 4px 16px rgba(20, 43, 72, 0.045);
}

.message.report-message.assistant .bubble {
  width: 100%;
  max-width: 920px;
  padding: 0;
  overflow: hidden;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.copilot-report-card {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--qd-border-soft);
  border-radius: 8px;
  background: var(--qd-panel);
}

.report-artifact-summary {
  padding: 16px;
}

.report-artifact-summary__top {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) max-content;
  align-items: center;
  gap: 10px;
}

.report-artifact-summary__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.report-artifact-summary__top > div {
  display: grid;
  gap: 2px;
}

.report-artifact-summary__top span,
.report-artifact-summary__metrics small {
  color: var(--qd-text-muted);
  font-size: 10px;
}

.report-artifact-summary__top strong {
  color: var(--qd-text);
  font-size: 14px;
}

.report-artifact-summary__top em {
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-style: normal;
  font-weight: 900;
}

.decision-buy { background: rgba(16, 185, 129, 0.13); color: #10b981; }
.decision-sell { background: rgba(239, 68, 68, 0.13); color: #ef4444; }
.decision-hold, .decision-neutral { background: rgba(245, 158, 11, 0.13); color: #f59e0b; }

.report-artifact-summary > p {
  margin: 12px 0;
  color: var(--qd-text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.report-artifact-summary__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.report-artifact-summary__metrics > span {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--qd-border-soft);
  border-radius: 7px;
  background: var(--qd-panel-soft);
}

.report-artifact-summary__metrics strong { color: var(--qd-text); }
.report-artifact-summary__metrics .warning strong { color: #f59e0b; }

.report-artifact-summary__warning {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  font-size: 11px;
}

.report-expand-button,
.report-collapse-button {
  width: 100%;
  margin-top: 10px;
  padding: 7px;
  border: 0;
  border-top: 1px solid var(--qd-border-soft);
  background: transparent;
  color: var(--qd-accent);
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
}

.report-collapse-button { margin: 0; }

.message.user .bubble {
  background: var(--qd-accent-soft);
}

.message.thinking-message .bubble {
  border-style: dashed;
  color: var(--qd-text-muted);
}

.message.thinking-message .message-content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
}

.message.thinking-message .message-content::before {
  content: '';
  width: 14px;
  height: 14px;
  border: 2px solid color-mix(in srgb, var(--qd-accent) 18%, transparent);
  border-top-color: var(--qd-accent);
  border-radius: 50%;
  animation: qd-copilot-spin 0.8s linear infinite;
}

@keyframes qd-copilot-spin {
  to {
    transform: rotate(360deg);
  }
}

.message-content ::v-deep h3,
.message-content ::v-deep h4 {
  margin: 14px 0 8px;
  color: var(--qd-text);
  line-height: 1.45;
}

.message-content ::v-deep h5 {
  margin: 10px 0 6px;
  color: var(--qd-text);
  font-size: 14px;
  line-height: 1.45;
}

.message-content ::v-deep p {
  margin: 0 0 10px;
  line-height: 1.78;
}

.message-content ::v-deep p:last-child {
  margin-bottom: 0;
}

.message-content ::v-deep ul,
.message-content ::v-deep ol {
  margin: 8px 0 12px;
  padding-left: 22px;
}

.message-content ::v-deep ul {
  list-style: disc;
}

.message-content ::v-deep ol {
  list-style: decimal;
}

.message-content ::v-deep li {
  margin: 5px 0;
  padding-left: 2px;
  line-height: 1.68;
}

.message-content ::v-deep hr {
  height: 1px;
  margin: 14px 0;
  border: 0;
  background: var(--qd-border-soft);
}

.message-content ::v-deep blockquote {
  margin: 10px 0;
  padding: 9px 11px;
  border-left: 3px solid var(--qd-accent-border);
  border-radius: 0 6px 6px 0;
  background: var(--qd-panel-soft);
  color: var(--qd-text-muted);
}

.message-content ::v-deep .qd-md-table-wrap {
  max-width: 100%;
  margin: 10px 0 14px;
  overflow-x: auto;
  border: 1px solid var(--qd-border-soft);
  border-radius: 8px;
}

.message-content ::v-deep .qd-md-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.message-content ::v-deep .qd-md-table th,
.message-content ::v-deep .qd-md-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--qd-border-soft);
  color: var(--qd-text);
  text-align: left;
  vertical-align: top;
}

.message-content ::v-deep .qd-md-table th {
  background: var(--qd-panel-strong);
  color: var(--qd-text-muted);
  font-weight: 800;
}

.message-content ::v-deep .qd-md-table tr:last-child td {
  border-bottom: 0;
}

.message-content ::v-deep a {
  color: var(--qd-accent);
  text-decoration: none;
}

.message-content ::v-deep a:hover {
  text-decoration: underline;
}

.message-content ::v-deep code {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--qd-panel-strong);
  color: var(--qd-text);
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 12px;
}

.message-content ::v-deep .qd-code-block {
  margin: 10px 0;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  background: #0f172a;
}

.message-content ::v-deep .qd-code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 9px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  background: #111c31;
  color: #cbd5e1;
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 12px;
}

.message-content ::v-deep .qd-copy-code {
  border: 1px solid rgba(203, 213, 225, 0.24);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 4px 8px;
  transition: border-color 0.18s, background 0.18s;
}

.message-content ::v-deep .qd-copy-code:hover {
  border-color: color-mix(in srgb, var(--qd-accent) 58%, transparent);
  background: var(--qd-accent-ring);
}

.message-content ::v-deep pre {
  max-width: ~"min(760px, 70vw)";
  margin: 0;
  overflow: auto;
  padding: 12px;
}

.message-content ::v-deep pre code {
  display: block;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: #e2e8f0;
  line-height: 1.58;
  white-space: pre;
}

.message-meta {
  margin-top: 8px;
  color: var(--qd-text-subtle);
  font-size: 12px;
}

.stream-warning {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(251, 191, 36, 0.28);
  border-radius: 7px;
  color: #d99a00;
  background: rgba(251, 191, 36, 0.08);
  font-size: 12px;
  line-height: 1.5;
}

.agent-usage {
  margin-top: 9px;
  padding-top: 9px;
  border-top: 1px solid var(--qd-border-soft);
}

.agent-usage summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--qd-text-subtle);
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  list-style: none;
  user-select: none;
}

.agent-usage summary::-webkit-details-marker {
  display: none;
}

.agent-usage summary::after {
  content: '›';
  font-size: 14px;
  transform: rotate(90deg);
  transition: transform 0.18s;
}

.agent-usage[open] summary::after {
  transform: rotate(-90deg);
}

.agent-usage-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.agent-usage-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

.agent-usage-chip {
  max-width: 190px;
  padding: 0 8px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--qd-accent) 24%, transparent);
  background: color-mix(in srgb, var(--qd-accent) 10%, transparent);
  color: var(--qd-text-main);
  text-overflow: ellipsis;
}

.agent-usage-chip--tool {
  border-color: rgba(56, 189, 248, 0.28);
  background: rgba(56, 189, 248, 0.08);
}

.message-time {
  margin-top: 8px;
  color: var(--qd-text-subtle);
  font-size: 11px;
  line-height: 1;
  text-align: right;
}

.message.assistant .message-time {
  text-align: left;
}

.message-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--qd-border-soft);
}

.message-actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--qd-accent) 28%, transparent);
  border-radius: 6px;
  background: var(--qd-accent-soft);
  color: var(--qd-accent);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  transition: border-color 0.18s, background 0.18s, transform 0.18s;
}

.message-actions button:hover {
  border-color: color-mix(in srgb, var(--qd-accent) 54%, transparent);
  background: var(--qd-accent-ring);
  transform: translateY(-1px);
}

.attachment-row,
.pending-attachments {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.thumb,
.pending-thumb {
  position: relative;
  width: 96px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--qd-border);
  background: var(--qd-panel-soft);
}

.thumb img,
.pending-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-missing {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 6px;
  color: var(--qd-text-muted);
  font-size: 11px;
  line-height: 1.35;
  text-align: center;
  overflow-wrap: anywhere;
}

.pending-attachments {
  flex: 0 0 auto;
  max-height: 92px;
  overflow-y: auto;
  padding: 10px 16px 2px;
}

.pending-thumb button {
  position: absolute;
  right: 2px;
  top: 2px;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.62);
  color: #fff;
}

.composer {
  flex: 0 0 auto;
  border-top: 1px solid var(--qd-border-soft);
  padding: 12px 14px;
  background: var(--qd-panel);
}

.composer-coach {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 10px;
  padding: 10px 12px;
  border: 1px solid var(--qd-accent-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--qd-accent) 7%, var(--qd-panel));
}

.composer-coach-icon {
  display: inline-grid;
  flex: 0 0 30px;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: var(--qd-accent);
  color: #fff;
}

.composer-coach-copy {
  min-width: 0;
}

.composer-coach-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.composer-coach-head strong {
  color: var(--qd-text);
  font-size: 13px;
}

.composer-coach-head span {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--qd-accent-soft);
  color: var(--qd-accent);
  font-size: 10px;
  font-weight: 800;
}

.composer-coach-copy p {
  margin: 2px 0 7px;
  color: var(--qd-text-muted);
  font-size: 11px;
  line-height: 1.45;
}

.composer-coach-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.composer-coach-suggestions button {
  padding: 3px 8px;
  border: 1px solid var(--qd-border);
  border-radius: 999px;
  background: var(--qd-panel);
  color: var(--qd-text-muted);
  cursor: pointer;
  font-size: 11px;
  line-height: 1.4;
}

.composer-coach-suggestions button:hover {
  border-color: var(--qd-accent-border);
  color: var(--qd-accent);
}

.composer textarea {
  width: 100%;
  min-height: 98px;
  max-height: 236px;
  overflow-y: hidden;
  resize: none;
  padding: 12px 13px;
  border: 1px solid var(--qd-border);
  border-radius: 8px;
  outline: none;
  background: var(--qd-panel-soft);
  color: var(--qd-text);
  line-height: 1.55;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
}

.composer textarea:focus {
  border-color: color-mix(in srgb, var(--qd-accent) 58%, transparent);
  background: var(--qd-panel);
  box-shadow: 0 0 0 3px var(--qd-accent-ring);
}

.composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.risk-disclaimer {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  gap: 5px;
  min-width: 0;
  margin: 0;
  color: var(--qd-text-subtle);
  font-size: 12px;
  line-height: 1.45;
}

.risk-disclaimer span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.risk-disclaimer .anticon {
  flex: 0 0 auto;
  margin-right: 0;
  color: var(--qd-accent);
}

.composer-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.composer-actions input[type='file'] {
  display: none;
}

.add-watch {
  display: block;
  margin-bottom: 10px;
}

.watch-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 82px;
  align-items: center;
  border: 1px solid var(--qd-border-soft);
  border-radius: 8px;
  background: var(--qd-panel-soft);
  overflow: hidden;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s, transform 0.18s;
}

.watch-card:hover {
  border-color: var(--qd-accent-border);
  background: var(--qd-panel);
  box-shadow: 0 7px 20px var(--qd-accent-weak);
  transform: translateY(-1px);
}

.watch-card.active {
  border-color: color-mix(in srgb, var(--qd-accent) 58%, transparent);
  background: var(--qd-accent-soft);
}

.watch-main {
  width: 100%;
  border: 0;
  background: transparent;
  display: grid;
  grid-template-columns: minmax(92px, 1fr) minmax(86px, auto);
  align-items: center;
  gap: 8px;
  padding: 8px 6px 8px 10px;
  cursor: pointer;
  text-align: left;
}

.watch-identity {
  min-width: 0;
}

.watch-market-data {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.watch-price,
.watch-change {
  display: block;
  max-width: 86px;
  overflow: hidden;
  font-family: 'SF Mono', Consolas, monospace;
  font-weight: 700;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.watch-price {
  color: var(--qd-text);
  font-size: 12px;
  line-height: 1.25;
}

.watch-change {
  width: fit-content;
  max-width: 92px;
  padding: 1px 5px;
  border-radius: 5px;
  background: rgba(107, 127, 153, 0.1);
  font-size: 11px;
  line-height: 1.2;
}

.watch-change.up {
  color: var(--qd-green);
  background: rgba(10, 163, 117, 0.12);
}

.watch-change.down {
  color: var(--qd-red);
  background: rgba(229, 75, 75, 0.12);
}

.watch-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  border-left: 1px solid var(--qd-border-soft);
  padding: 0 6px;
}

.watch-actions button {
  width: 22px;
  height: 24px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #4c75a3;
  font-size: 12px;
  line-height: 24px;
  cursor: pointer;
  transition: color 0.18s, background 0.18s;
}

.watch-actions button:hover {
  color: var(--qd-accent);
  background: var(--qd-accent-weak);
}

.watch-actions button.danger:hover {
  color: var(--qd-red);
  background: rgba(229, 75, 75, 0.1);
}

.monitor-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--qd-border-soft);
  border-radius: 8px;
  background: var(--qd-panel-soft);
}

.monitor-actions {
  display: flex;
  gap: 4px;
}

.monitor-actions button {
  width: 28px;
  height: 28px;
  border: 1px solid var(--qd-border);
  border-radius: 6px;
  background: var(--qd-panel);
  color: #66809f;
  cursor: pointer;
}

.up {
  color: var(--qd-green);
}

.down {
  color: var(--qd-red);
}

.event-title-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--qd-border-soft);
}

.event-title-row strong {
  display: block;
  color: var(--qd-text);
  font-size: 18px;
}

.event-title-row span {
  color: var(--qd-text-subtle);
}

.event-fields {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 14px 0;
}

.event-fields div {
  padding: 10px;
  border: 1px solid var(--qd-border-soft);
  border-radius: 8px;
  background: var(--qd-panel-soft);
}

.event-fields label {
  display: block;
  color: var(--qd-text-subtle);
  margin-bottom: 4px;
}

.event-ai-preview {
  padding: 12px;
  border-radius: 8px;
  background: var(--qd-accent-soft);
  color: #2f4664;
}

.event-ai-preview h4 {
  margin: 0 0 8px;
  color: var(--qd-text);
}

.add-watch-modal {
  .ant-tabs-bar {
    margin-bottom: 14px;
  }
}

.add-watch-results {
  display: grid;
  gap: 8px;
  max-height: 300px;
  margin-top: 14px;
  overflow-y: auto;
}

.symbol-result-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--qd-border-soft, #e8eff7);
  border-radius: 8px;
  background: var(--qd-panel-soft, #f7fafd);
  color: var(--qd-text, #12243d);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
}

.symbol-result-card:hover,
.symbol-result-card.active {
  border-color: color-mix(in srgb, var(--qd-accent) 54%, transparent);
  background: var(--qd-accent-soft);
  box-shadow: 0 6px 18px var(--qd-accent-weak);
}

.symbol-result-card strong,
.symbol-result-card em {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.symbol-result-card em {
  margin-top: 2px;
  color: var(--qd-text-subtle, #92a2b6);
  font-size: 12px;
  font-style: normal;
}

.selected-watch-alert {
  margin-top: 14px;
}

.strategy-flow {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 4px 0;
}

.strategy-type-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.strategy-flow-guide {
  display: none;
}

.strategy-flow-guide span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  height: 28px;
  border-radius: 6px;
  color: var(--qd-text-muted, #6b7f99);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.strategy-flow-guide .anticon {
  color: var(--qd-accent, #1677ff);
}

.strategy-flow-card {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  min-height: 104px;
  padding: 16px;
  border: 1px solid var(--qd-border, #dbe7f3);
  border-radius: 8px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--qd-panel, #fff) 94%, transparent), color-mix(in srgb, var(--qd-panel-soft, #f7fafd) 96%, transparent));
  color: var(--qd-text, #12243d);
  text-align: left;
  cursor: pointer;
  backdrop-filter: blur(14px);
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s, transform 0.18s;
}

.strategy-flow-card:hover {
  border-color: color-mix(in srgb, var(--qd-accent) 50%, var(--qd-border, #dbe7f3));
  background: color-mix(in srgb, var(--qd-accent) 7%, var(--qd-panel, #fff));
  box-shadow: 0 12px 28px color-mix(in srgb, var(--qd-accent) 10%, transparent);
  transform: translateY(-1px);
}

.strategy-flow-card.active {
  border-color: color-mix(in srgb, var(--qd-accent) 70%, var(--qd-border, #dbe7f3));
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--qd-accent) 14%, var(--qd-panel, #fff)), color-mix(in srgb, var(--qd-accent) 5%, var(--qd-panel-soft, #f7fafd)));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--qd-accent) 20%, transparent), 0 14px 30px color-mix(in srgb, var(--qd-accent) 12%, transparent);
}

.strategy-flow-card > .anticon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid color-mix(in srgb, var(--qd-accent) 28%, transparent);
  border-radius: 8px;
  background: var(--qd-accent-soft);
  color: var(--qd-accent, #1677ff);
  font-size: 17px;
}

.strategy-flow-card strong,
.strategy-flow-card em {
  display: block;
}

.strategy-flow-card strong {
  margin-bottom: 6px;
  color: var(--qd-text, #12243d);
  font-size: 15px;
  font-weight: 900;
  line-height: 1.25;
}

.strategy-flow-card em {
  color: var(--qd-text-muted, #6b7f99);
  font-size: 12px;
  font-style: normal;
  line-height: 1.55;
  white-space: normal;
  word-break: normal;
  overflow-wrap: anywhere;
}

.strategy-selected-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 42px;
  padding: 9px 12px;
  border: 1px solid color-mix(in srgb, var(--qd-accent) 20%, var(--qd-border-soft, #e8eff7));
  border-radius: 8px;
  background: color-mix(in srgb, var(--qd-accent) 6%, var(--qd-panel-soft, #f7fafd));
}

.strategy-selected-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--qd-accent, #1677ff);
  font-size: 13px;
}

.strategy-selected-label strong {
  color: var(--qd-text, #12243d);
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
}

.strategy-selected-bar em {
  min-width: 0;
  color: var(--qd-text-muted, #6b7f99);
  font-size: 12px;
  font-style: normal;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strategy-route-action {
  flex: 0 0 auto;
  min-width: 168px;
  height: 34px;
  border-radius: 7px;
  font-weight: 800;
}

.strategy-examples {
  width: 100%;
  margin-top: 0;
  padding: 11px 12px 6px;
  border: 1px solid var(--qd-border-soft, #e8eff7);
  border-radius: 8px;
  background: color-mix(in srgb, var(--qd-panel-soft, #f7fafd) 86%, transparent);
}

.strategy-examples-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--qd-border-soft, #e8eff7);
}

.strategy-examples-head strong {
  color: var(--qd-text, #12243d);
  font-size: 13px;
  font-weight: 900;
}

.strategy-examples-head span {
  color: var(--qd-text-muted, #6b7f99);
  font-size: 12px;
}

.strategy-example-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18px;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 54px;
  padding: 9px 8px;
  border: 0;
  background: transparent;
  color: var(--qd-text, #12243d);
  text-align: left;
  cursor: pointer;
}

.strategy-example-row:hover {
  border-radius: 8px;
  background: color-mix(in srgb, var(--qd-accent) 8%, transparent);
}

.strategy-example-row strong,
.strategy-example-row em {
  display: block;
}

.strategy-example-row strong {
  margin-bottom: 3px;
  font-size: 13px;
  font-weight: 900;
}

.strategy-example-row em {
  color: var(--qd-text-muted, #6b7f99);
  font-size: 12px;
  font-style: normal;
  line-height: 1.42;
  white-space: normal;
  overflow-wrap: anywhere;
}

.strategy-example-row .anticon {
  color: var(--qd-accent, #1677ff);
}

.strategy-flow-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
}

.copilot-workbench ::v-deep .ant-select-selection {
  border-color: var(--qd-border);
  border-radius: 7px;
  background: var(--qd-panel);
}

.copilot-workbench ::v-deep .ant-select-selection__placeholder,
.composer textarea::placeholder {
  color: var(--qd-text-subtle);
}

.copilot-workbench ::v-deep .ant-select-focused .ant-select-selection,
.copilot-workbench ::v-deep .ant-select-selection:focus,
.copilot-workbench ::v-deep .ant-select-selection:active {
  border-color: color-mix(in srgb, var(--qd-accent) 58%, transparent);
  box-shadow: 0 0 0 3px var(--qd-accent-ring);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

@media (max-width: 1360px) {
  .copilot-workbench {
    grid-template-columns: minmax(250px, 300px) minmax(520px, 1fr);
    overflow: auto;
    height: auto;
  }
  .right-rail {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .watch-panel,
  .monitor-panel {
    min-height: 260px;
  }
  .strategy-type-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .strategy-flow-guide,
  .workflow-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .welcome-prompts {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 960px) {
  .copilot-workbench {
    grid-template-columns: 1fr;
    min-height: auto;
  }
  .right-rail {
    display: flex;
  }
  .chat-hero {
    padding: 14px 16px;
  }
  .hero-main {
    display: block;
  }
  .context-bar {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .composer-context-bar {
    width: 100%;
    grid-template-columns: 1fr;
    margin-right: 0;
  }
  .strategy-type-grid {
    grid-template-columns: 1fr;
  }
  .strategy-selected-bar {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
  .strategy-selected-bar em {
    white-space: normal;
  }
  .strategy-route-action {
    width: 100%;
  }
  .strategy-flow-guide,
  .workflow-steps {
    grid-template-columns: 1fr;
  }
  .workflow-head {
    display: grid;
  }
  .sessions-panel,
  .calendar-panel,
  .watch-panel,
  .monitor-panel {
    flex: 0 0 auto;
    min-height: 220px;
  }
  .chat-panel {
    min-height: 680px;
  }
  .welcome {
    margin-top: 34px;
  }
  .welcome-prompts {
    grid-template-columns: 1fr;
  }
}

/* Premium research cockpit pass */
.copilot-workbench {
  --qd-bg: #eef4fb;
  --qd-panel: rgba(255, 255, 255, 0.94);
  --qd-panel-soft: rgba(247, 250, 253, 0.9);
  --qd-panel-strong: #eef5fc;
  --qd-border: rgba(146, 162, 182, 0.28);
  --qd-border-soft: rgba(146, 162, 182, 0.18);
  --qd-shadow: 0 18px 42px rgba(21, 45, 78, 0.1);

  position: relative;
  grid-template-columns: minmax(250px, 292px) minmax(640px, 1fr) minmax(286px, 330px);
  gap: 12px;
  padding: 12px;
  isolation: isolate;
  background:
    radial-gradient(circle at 49% 26%, color-mix(in srgb, var(--qd-accent) 18%, transparent), transparent 29%),
    radial-gradient(circle at 76% 12%, rgba(20, 184, 166, 0.16), transparent 27%),
    linear-gradient(180deg, #f7fbff 0%, #edf3fa 42%, #f8fafc 100%);
}

.copilot-workbench::before {
  content: "";
  position: absolute;
  inset: 12px 324px 12px 304px;
  z-index: -1;
  border: 1px solid rgba(255, 255, 255, 0.56);
  border-radius: 12px;
  background:
    linear-gradient(rgba(22, 119, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(22, 119, 255, 0.035) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.9), transparent 72%);
  pointer-events: none;
}

.rail-panel,
.chat-panel {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.075);
  backdrop-filter: blur(14px);
}

.rail-panel {
  padding: 13px;
}

.left-rail,
.right-rail {
  gap: 12px;
}

.panel-head {
  min-height: 28px;
  margin-bottom: 11px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.sessions-panel {
  flex-basis: 54%;
  min-height: 330px;
}

.calendar-panel {
  flex-basis: 35%;
  min-height: 230px;
}

.watch-panel {
  flex-basis: 60%;
}

.monitor-panel {
  flex-basis: 36%;
  min-height: 250px;
}

.session-row,
.calendar-card,
.watch-card,
.monitor-card {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(248, 251, 255, 0.78);
}

.session-row:hover,
.calendar-card:hover,
.watch-card:hover {
  border-color: color-mix(in srgb, var(--qd-accent) 36%, rgba(148, 163, 184, 0.26));
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 24px rgba(21, 45, 78, 0.1);
}

.chat-panel {
  position: relative;
  border-color: rgba(148, 163, 184, 0.22);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.7);
}

.chat-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(circle at 52% 18%, color-mix(in srgb, var(--qd-accent) 11%, transparent), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0));
  pointer-events: none;
}

.chat-hero,
.messages,
.pending-attachments,
.composer {
  position: relative;
  z-index: 1;
}

.chat-hero {
  min-height: 104px;
  padding: 18px 20px 16px;
  border-bottom-color: rgba(148, 163, 184, 0.18);
  background:
    radial-gradient(circle at 71% 0%, rgba(20, 184, 166, 0.14), transparent 34%),
    radial-gradient(circle at 36% 0%, color-mix(in srgb, var(--qd-accent) 16%, transparent), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(238, 246, 255, 0.7));
}

.chat-hero::after {
  content: "";
  position: absolute;
  right: 380px;
  top: 18px;
  width: 92px;
  height: 92px;
  border: 1px solid color-mix(in srgb, var(--qd-accent) 24%, transparent);
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.9), transparent 16%),
    radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--qd-accent) 28%, transparent), transparent 47%),
    linear-gradient(135deg, rgba(20, 184, 166, 0.26), color-mix(in srgb, var(--qd-accent) 24%, transparent));
  box-shadow: 0 18px 38px color-mix(in srgb, var(--qd-accent) 16%, transparent);
  opacity: 0.72;
  pointer-events: none;
}

.hero-main {
  grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
}

.eyebrow {
  min-height: 20px;
  margin-bottom: 7px;
  background: color-mix(in srgb, var(--qd-accent) 12%, #ffffff);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.46);
}

.chat-hero h2 {
  font-size: 24px;
  line-height: 1.18;
}

.chat-hero p {
  max-width: 700px;
  font-size: 13px;
}

.context-status {
  height: 22px;
  color: var(--qd-text-muted);
}

.hero-symbol-picker ::v-deep .ant-select-selection {
  height: 38px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
}

.hero-symbol-picker ::v-deep .ant-select-selection__rendered {
  line-height: 36px;
}

.messages {
  padding: 28px 28px 22px;
  background:
    linear-gradient(rgba(22, 119, 255, 0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(22, 119, 255, 0.028) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(247, 250, 253, 0.92));
  background-size: 38px 38px, 38px 38px, auto;
}

.welcome {
  max-width: 860px;
  margin-top: 46px;
}

.welcome > .anticon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  box-shadow: 0 14px 32px color-mix(in srgb, var(--qd-accent) 18%, transparent);
}

.welcome h3 {
  margin-top: 16px;
  font-size: 25px;
}

.welcome p {
  max-width: 620px;
  margin: 0 auto;
  font-size: 13px;
  line-height: 1.7;
}

.quick-task-shelf,
.welcome-prompts {
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 12px;
  margin-top: 24px;
}

.quick-task-shelf .welcome-task,
.welcome-prompts button {
  min-height: 84px;
  padding: 14px;
  border-color: rgba(148, 163, 184, 0.24);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.82), color-mix(in srgb, var(--qd-accent) 7%, #f8fbff));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
}

.quick-task-shelf .welcome-task:hover,
.welcome-prompts button:hover {
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.1);
  transform: translateY(-2px);
}

.task-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
}

.task-copy strong {
  font-size: 13px;
}

.task-copy em {
  color: var(--qd-text-subtle);
}

.bubble {
  max-width: ~"min(900px, 76%)";
  border-color: rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.075);
}

.message.user .bubble {
  background: color-mix(in srgb, var(--qd-accent) 12%, #ffffff);
}

.composer {
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
}

.composer textarea {
  min-height: 98px;
  border-radius: 8px;
  background: rgba(247, 250, 253, 0.92);
}

.composer-actions ::v-deep .ant-btn,
.add-watch ::v-deep .ant-btn {
  height: 34px;
  border-radius: 8px;
}

.add-watch {
  margin-bottom: 12px;
}

.watch-main {
  padding: 9px 8px 9px 11px;
}

.watch-actions {
  opacity: 0.72;
  transition: opacity 0.18s;
}

.watch-card:hover .watch-actions {
  opacity: 1;
}

@media (max-width: 1360px) {
  .copilot-workbench {
    grid-template-columns: minmax(210px, 240px) minmax(460px, 1fr) minmax(230px, 260px);
    gap: 8px;
    padding: 8px;
  }

  .copilot-workbench::before {
    inset: 12px;
  }

  .chat-hero::after {
    right: 30px;
    opacity: 0.34;
  }

  .welcome-prompts,
  .quick-task-shelf {
    grid-template-columns: repeat(2, minmax(150px, 1fr));
  }
}

@media (max-width: 960px) {
  .copilot-workbench {
    padding: 10px;
  }

  .chat-hero {
    min-height: 0;
  }

  .chat-hero::after {
    display: none;
  }
}

/* Final AI workbench tune-up for the conversation-first redesign. */
.copilot-workbench {
  padding: 8px;
  background:
    radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--qd-accent) 12%, transparent), transparent 28%),
    linear-gradient(180deg, #f5f9fd 0%, #eef4fa 100%);
}

.copilot-workbench .chat-panel,
.copilot-workbench .rail-panel {
  border-color: rgba(129, 151, 178, 0.22);
  background: rgba(255, 255, 255, 0.68);
  box-shadow: 0 16px 38px rgba(31, 62, 103, 0.1);
  -webkit-backdrop-filter: blur(18px) saturate(1.16);
  backdrop-filter: blur(18px) saturate(1.16);
}

.copilot-workbench .chat-hero {
  min-height: 56px !important;
  padding: 8px 16px !important;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(247, 251, 255, 0.62)),
    rgba(255, 255, 255, 0.56) !important;
}

.copilot-workbench .hero-main {
  grid-template-columns: minmax(0, 1fr) minmax(300px, 390px);
  gap: 14px;
}

.copilot-workbench .eyebrow {
  min-height: 16px;
  margin-bottom: 2px;
  padding: 0 7px;
  font-size: 10px;
}

.copilot-workbench .chat-hero h2 {
  margin: 0 0 1px;
  font-size: 18px;
  line-height: 1.12;
}

.copilot-workbench .chat-hero p {
  font-size: 12px;
  line-height: 1.28;
}

.copilot-workbench .context-status {
  height: 16px;
  font-size: 11px;
}

.copilot-workbench .hero-symbol-picker ::v-deep .ant-select-selection {
  height: 31px !important;
}

.copilot-workbench .hero-symbol-picker ::v-deep .ant-select-selection__rendered {
  line-height: 29px !important;
}

.copilot-workbench .messages {
  padding-top: 18px;
}

.copilot-workbench .welcome {
  max-width: 920px;
  margin-top: clamp(72px, 10vh, 118px);
}

.copilot-workbench .welcome > .anticon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  font-size: 20px;
}

.copilot-workbench .welcome h3 {
  margin: 10px 0 4px;
  font-size: 20px;
}

.copilot-workbench .welcome-prompts {
  grid-template-columns: repeat(4, minmax(170px, 1fr));
  max-width: 900px;
  gap: 12px;
}

.copilot-workbench .welcome-prompts button {
  min-height: 76px !important;
  padding: 12px;
  border-radius: 10px;
}

.copilot-workbench .message-actions {
  border-top: 1px solid var(--qd-border-soft);
}

.strategy-flow {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  padding: 4px 4px 0 !important;
}

.strategy-type-grid {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 12px !important;
}

.strategy-flow-guide {
  display: none !important;
}

.strategy-flow-card {
  display: grid !important;
  grid-template-columns: 38px minmax(0, 1fr) !important;
  align-items: flex-start !important;
  min-height: 104px !important;
  padding: 16px !important;
  border-radius: 8px !important;
  white-space: normal !important;
}

.strategy-flow-card strong,
.strategy-flow-card em {
  white-space: normal !important;
  word-break: normal !important;
  overflow-wrap: anywhere !important;
}

body.dark .copilot-workbench,
body.realdark .copilot-workbench,
.theme-dark .copilot-workbench {
  --qd-bg: #050505;
  --qd-panel: #0b0b0b;
  --qd-panel-soft: #111111;
  --qd-panel-strong: #161616;
  --qd-text: #f4f7fb;
  --qd-text-muted: #9ba7b7;
  --qd-text-subtle: #718096;
  --qd-border: rgba(255, 255, 255, 0.12);
  --qd-border-soft: rgba(255, 255, 255, 0.08);
  background: #050505 !important;
}

body.dark .copilot-workbench .chat-panel,
body.realdark .copilot-workbench .chat-panel,
.theme-dark .copilot-workbench .chat-panel,
body.dark .copilot-workbench .rail-panel,
body.realdark .copilot-workbench .rail-panel,
.theme-dark .copilot-workbench .rail-panel {
  background: #0b0b0b !important;
  box-shadow: none !important;
}

body.dark .copilot-workbench .chat-hero,
body.realdark .copilot-workbench .chat-hero,
.theme-dark .copilot-workbench .chat-hero {
  background: #0d0d0d !important;
}

body.dark .copilot-workbench .chat-panel::before,
body.dark .copilot-workbench::before,
body.dark .copilot-workbench .chat-hero::after,
body.realdark .copilot-workbench .chat-panel::before,
body.realdark .copilot-workbench::before,
body.realdark .copilot-workbench .chat-hero::after,
.theme-dark .copilot-workbench .chat-panel::before,
.theme-dark .copilot-workbench::before,
.theme-dark .copilot-workbench .chat-hero::after {
  display: none !important;
}

body.dark .copilot-workbench .messages,
body.realdark .copilot-workbench .messages,
.theme-dark .copilot-workbench .messages {
  background: #080808 !important;
}

body.dark .copilot-workbench .session-row,
body.dark .copilot-workbench .calendar-card,
body.dark .copilot-workbench .watch-card,
body.dark .copilot-workbench .monitor-card,
body.dark .copilot-workbench .quick-task-shelf,
body.dark .copilot-workbench .quick-task-shelf .welcome-task,
body.dark .copilot-workbench .welcome-prompts button,
body.dark .quick-tools-modal .quick-task-modal-grid .welcome-task,
body.dark .copilot-workbench .strategy-flow-card,
body.dark .copilot-workbench .strategy-selected-bar,
body.dark .copilot-workbench .strategy-examples,
body.realdark .copilot-workbench .session-row,
body.realdark .copilot-workbench .calendar-card,
body.realdark .copilot-workbench .watch-card,
body.realdark .copilot-workbench .monitor-card,
body.realdark .copilot-workbench .quick-task-shelf,
body.realdark .copilot-workbench .quick-task-shelf .welcome-task,
body.realdark .copilot-workbench .welcome-prompts button,
body.realdark .quick-tools-modal .quick-task-modal-grid .welcome-task,
body.realdark .copilot-workbench .strategy-flow-card,
body.realdark .copilot-workbench .strategy-selected-bar,
body.realdark .copilot-workbench .strategy-examples,
.theme-dark .copilot-workbench .session-row,
.theme-dark .copilot-workbench .calendar-card,
.theme-dark .copilot-workbench .watch-card,
.theme-dark .copilot-workbench .monitor-card,
.theme-dark .copilot-workbench .quick-task-shelf,
.theme-dark .copilot-workbench .quick-task-shelf .welcome-task,
.theme-dark .copilot-workbench .welcome-prompts button,
.theme-dark .quick-tools-modal .quick-task-modal-grid .welcome-task,
.theme-dark .copilot-workbench .strategy-flow-card,
.theme-dark .copilot-workbench .strategy-selected-bar,
.theme-dark .copilot-workbench .strategy-examples {
  border-color: rgba(255, 255, 255, 0.11) !important;
  background: #141414 !important;
  box-shadow: none !important;
}

body.dark .copilot-workbench .strategy-flow-card.active,
body.realdark .copilot-workbench .strategy-flow-card.active,
.theme-dark .copilot-workbench .strategy-flow-card.active {
  border-color: color-mix(in srgb, var(--qd-accent) 72%, rgba(255, 255, 255, 0.14)) !important;
  background: linear-gradient(135deg, color-mix(in srgb, var(--qd-accent) 18%, #141414), #141414) !important;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--qd-accent) 20%, transparent) !important;
}

body.dark .copilot-workbench .session-row:hover,
body.dark .copilot-workbench .calendar-card:hover,
body.dark .copilot-workbench .watch-card:hover,
body.dark .copilot-workbench .quick-task-shelf .welcome-task:hover,
body.dark .copilot-workbench .welcome-prompts button:hover,
body.dark .quick-tools-modal .quick-task-modal-grid .welcome-task:hover,
body.dark .copilot-workbench .strategy-example-row:hover,
body.realdark .copilot-workbench .session-row:hover,
body.realdark .copilot-workbench .calendar-card:hover,
body.realdark .copilot-workbench .watch-card:hover,
body.realdark .copilot-workbench .quick-task-shelf .welcome-task:hover,
body.realdark .copilot-workbench .welcome-prompts button:hover,
body.realdark .quick-tools-modal .quick-task-modal-grid .welcome-task:hover,
body.realdark .copilot-workbench .strategy-example-row:hover,
.theme-dark .copilot-workbench .session-row:hover,
.theme-dark .copilot-workbench .calendar-card:hover,
.theme-dark .copilot-workbench .watch-card:hover,
.theme-dark .copilot-workbench .quick-task-shelf .welcome-task:hover,
.theme-dark .copilot-workbench .welcome-prompts button:hover,
.theme-dark .quick-tools-modal .quick-task-modal-grid .welcome-task:hover,
.theme-dark .copilot-workbench .strategy-example-row:hover {
  border-color: color-mix(in srgb, var(--qd-accent) 42%, rgba(255, 255, 255, 0.14)) !important;
  background: #191919 !important;
}

body.dark .copilot-workbench .strategy-example-row,
body.realdark .copilot-workbench .strategy-example-row,
.theme-dark .copilot-workbench .strategy-example-row {
  border-top-color: rgba(255, 255, 255, 0.11) !important;
}

body.dark .copilot-workbench .session-row.active,
body.dark .copilot-workbench .watch-card.active,
body.realdark .copilot-workbench .session-row.active,
body.realdark .copilot-workbench .watch-card.active,
.theme-dark .copilot-workbench .session-row.active,
.theme-dark .copilot-workbench .watch-card.active {
  border-color: color-mix(in srgb, var(--qd-accent) 70%, rgba(255, 255, 255, 0.14)) !important;
  background: color-mix(in srgb, var(--qd-accent) 16%, #141414) !important;
}

body.dark .copilot-workbench .bubble,
body.realdark .copilot-workbench .bubble,
.theme-dark .copilot-workbench .bubble {
  border-color: rgba(255, 255, 255, 0.12) !important;
  background: #121212 !important;
  color: var(--qd-text) !important;
  box-shadow: none !important;
}

body.dark .copilot-workbench .message.user .bubble,
body.realdark .copilot-workbench .message.user .bubble,
.theme-dark .copilot-workbench .message.user .bubble {
  background: color-mix(in srgb, var(--qd-accent) 20%, #111111) !important;
}

body.dark .copilot-workbench .composer,
body.realdark .copilot-workbench .composer,
.theme-dark .copilot-workbench .composer {
  border-top-color: rgba(255, 255, 255, 0.1) !important;
  background: #0b0b0b !important;
}

body.dark .copilot-workbench .composer textarea,
body.realdark .copilot-workbench .composer textarea,
.theme-dark .copilot-workbench .composer textarea {
  border-color: rgba(255, 255, 255, 0.14) !important;
  background: #101010 !important;
  color: var(--qd-text) !important;
}

body.dark .copilot-workbench .empty-mini,
body.realdark .copilot-workbench .empty-mini,
.theme-dark .copilot-workbench .empty-mini {
  border-color: rgba(255, 255, 255, 0.1) !important;
  background: #141414 !important;
  color: var(--qd-text-muted) !important;
}

@media (max-width: 1360px) {
  .strategy-type-grid {
    grid-template-columns: 1fr !important;
  }

  .copilot-workbench .welcome-prompts,
  .copilot-workbench .quick-task-shelf {
    grid-template-columns: repeat(2, minmax(150px, 1fr));
  }
}

@media (max-width: 960px) {
  .copilot-workbench .hero-main,
  .copilot-workbench .quick-task-shelf,
  .copilot-workbench .welcome-prompts {
    grid-template-columns: 1fr;
  }

  .composer-foot {
    align-items: stretch;
    flex-direction: column;
  }

  .composer-actions {
    justify-content: flex-end;
  }
}

@media print {
  .copilot-workbench {
    display: block !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    padding: 0 !important;
    background: #fff !important;
  }

  .copilot-workbench > .left-rail,
  .copilot-workbench > .right-rail,
  .copilot-workbench .chat-hero,
  .copilot-workbench .composer,
  .copilot-workbench .welcome,
  .copilot-workbench .message:not(.printing-report-message),
  .copilot-workbench .printing-report-message .avatar,
  .copilot-workbench .printing-report-message .message-content,
  .copilot-workbench .printing-report-message .message-meta,
  .copilot-workbench .printing-report-message .message-actions,
  .copilot-workbench .printing-report-message .message-time {
    display: none !important;
  }

  .copilot-workbench .chat-panel,
  .copilot-workbench .messages,
  .copilot-workbench .printing-report-message,
  .copilot-workbench .printing-report-message .bubble,
  .copilot-workbench .copilot-report-card {
    display: block !important;
    width: 100% !important;
    max-width: none !important;
    height: auto !important;
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
    background: #fff !important;
  }
}
</style>

<style lang="less">
.utility-tool-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;

  > button {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 2px 9px;
    align-items: center;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fafcff;
    color: #243247;
    cursor: pointer;
    text-align: left;

    > span {
      display: grid;
      grid-row: span 2;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 7px;
      background: rgba(82, 196, 26, 0.12);
      color: #52c41a;
    }

    strong { font-size: 13px; }
    em { color: #8492a6; font-size: 11px; font-style: normal; line-height: 1.35; }
    &:hover { border-color: #52c41a; }
    &:disabled { cursor: not-allowed; opacity: 0.48; }
  }
}

.utility-empty {
  padding: 18px;
  border: 1px dashed #dbe3ec;
  border-radius: 8px;
  color: #8492a6;
  font-size: 12px;
  text-align: center;
}

.session-memory-panel,
.long-term-memory-panel {
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #fafcff;
}

.long-term-memory-panel { margin-top: 12px; }

.memory-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  > div { display: grid; gap: 3px; }
  strong { color: #243247; }
  span { color: #8492a6; font-size: 11px; }
}

.session-memory-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  > span {
    display: grid;
    gap: 2px;
    min-width: 120px;
    padding: 8px 10px;
    border-radius: 7px;
    background: #fff;
  }

  small { color: #8492a6; }
  strong { color: #243247; }
}

.memory-constraints {
  display: flex;
  flex: 1 0 100%;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;

  em {
    padding: 4px 7px;
    border-radius: 999px;
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
    font-size: 11px;
    font-style: normal;
  }
}

.context-telemetry {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
  margin-top: 10px;

  span { display: grid; gap: 2px; padding: 7px; border-radius: 6px; background: #fff; }
  small { color: #8492a6; font-size: 10px; }
  strong { color: #243247; font-size: 12px; }
}

.memory-editor-list { display: grid; gap: 10px; }
.memory-editor-row {
  display: grid;
  grid-template-columns: minmax(120px, 0.45fr) minmax(220px, 1fr) max-content;
  gap: 8px;
  align-items: start;

  > div:last-child { display: flex; gap: 6px; }
}

body.dark,
body.realdark,
.theme-dark {
  .utility-tool-grid > button,
  .session-memory-panel,
  .long-term-memory-panel,
  .session-memory-summary > span,
  .context-telemetry span {
    border-color: rgba(255, 255, 255, 0.12);
    background: #171717;
    color: rgba(255, 255, 255, 0.88);
  }

  .memory-section-head strong,
  .session-memory-summary strong,
  .context-telemetry strong { color: rgba(255, 255, 255, 0.88); }
  .utility-empty { border-color: rgba(255, 255, 255, 0.14); }
}

.saved-prompt-library {
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid #edf1f5;
}

.saved-prompt-library__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: #243247;
}

.saved-prompt-library__head span {
  color: #8492a6;
  font-size: 12px;
}

.saved-prompt-library__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  max-height: 208px;
  overflow-y: auto;
}

.saved-prompt-library__item {
  display: flex;
  align-items: center;
  min-width: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fafcff;
}

.saved-prompt-library__item > button {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  flex-direction: column;
  color: #243247;
  cursor: pointer;
  text-align: left;
}

.saved-prompt-library__item > button strong,
.saved-prompt-library__item > button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.left-rail .saved-prompt-library {
  margin-bottom: 0;
  padding-bottom: 12px;
  border-bottom: 0;
}

.left-rail .saved-prompt-library__head {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 3px;
}

.left-rail .saved-prompt-library__list {
  grid-template-columns: 1fr;
  grid-auto-rows: min-content;
  align-content: start;
  max-height: 196px;
}

.left-rail .saved-prompt-library__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
  border-color: var(--qd-border-soft);
  background: var(--qd-panel-soft);
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s, transform 0.18s;
}

.left-rail .saved-prompt-library__item:hover {
  border-color: var(--qd-accent-border);
  background: var(--qd-panel);
  box-shadow: 0 6px 18px var(--qd-accent-weak);
  transform: translateY(-1px);
}

.left-rail .saved-prompt-card {
  padding: 9px 10px;
}

.saved-prompt-delete {
  width: 28px;
  height: 28px;
  align-self: center;
  flex: 0 0 28px;
  border: 0;
  border-radius: 5px;
  color: #94a3b8;
  background: transparent;
  cursor: pointer;
}

.saved-prompt-delete:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.saved-prompt-library__item > button span {
  margin-top: 3px;
  color: #8492a6;
  font-size: 11px;
}

body.dark .saved-prompt-library,
body.realdark .saved-prompt-library,
.theme-dark .saved-prompt-library {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

body.dark .saved-prompt-library__head,
body.realdark .saved-prompt-library__head,
.theme-dark .saved-prompt-library__head,
body.dark .saved-prompt-library__item > button,
body.realdark .saved-prompt-library__item > button,
.theme-dark .saved-prompt-library__item > button {
  color: rgba(255, 255, 255, 0.86);
}

body.dark .saved-prompt-library__item,
body.realdark .saved-prompt-library__item,
.theme-dark .saved-prompt-library__item {
  border-color: rgba(255, 255, 255, 0.12);
  background: #171717;
}

body.dark .saved-prompt-delete,
body.realdark .saved-prompt-delete,
.theme-dark .saved-prompt-delete {
  color: rgba(255, 255, 255, 0.52);
}

@media (max-width: 640px) {
  .saved-prompt-library__list {
    grid-template-columns: 1fr;
  }
}

.copilot-modal {
  --qd-panel: #ffffff;
  --qd-panel-soft: #f7fafd;
  --qd-text: #12243d;
  --qd-text-muted: #6b7f99;
  --qd-border: #dbe7f3;
  --qd-border-soft: #e8eff7;
  --qd-accent: var(--primary-color, #1677ff);
  --qd-accent-soft: color-mix(in srgb, var(--qd-accent) 12%, #ffffff);

  .strategy-flow {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    padding: 4px 4px 0 !important;
  }

  .strategy-type-grid {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 12px !important;
  }

  .strategy-flow-guide {
    display: none !important;
  }

  .strategy-flow-card {
    display: grid !important;
    grid-template-columns: 38px minmax(0, 1fr) !important;
    align-items: flex-start !important;
    gap: 12px !important;
    width: 100% !important;
    min-height: 104px !important;
    padding: 16px !important;
    border: 1px solid var(--qd-border, #dbe7f3) !important;
    border-radius: 8px !important;
    background: var(--qd-panel, #ffffff) !important;
    color: var(--qd-text, #12243d) !important;
    text-align: left !important;
    white-space: normal !important;
  }

  .strategy-flow-card.active {
    border-color: color-mix(in srgb, var(--qd-accent) 68%, var(--qd-border, #dbe7f3)) !important;
    background: color-mix(in srgb, var(--qd-accent) 11%, var(--qd-panel, #ffffff)) !important;
  }

  .strategy-flow-card > .anticon {
    display: grid !important;
    place-items: center !important;
    width: 36px !important;
    height: 36px !important;
    border: 1px solid color-mix(in srgb, var(--qd-accent) 28%, transparent) !important;
    border-radius: 8px !important;
    background: var(--qd-accent-soft) !important;
    color: var(--qd-accent, #1677ff) !important;
    font-size: 17px !important;
  }

  .strategy-flow-card strong,
  .strategy-flow-card em {
    display: block !important;
    white-space: normal !important;
    word-break: normal !important;
    overflow-wrap: anywhere !important;
  }

  .strategy-flow-card strong {
    margin-bottom: 6px !important;
    color: var(--qd-text, #12243d) !important;
    font-size: 15px !important;
    font-weight: 900 !important;
    line-height: 1.25 !important;
  }

  .strategy-flow-card em {
    color: var(--qd-text-muted, #6b7f99) !important;
    font-size: 12px !important;
    font-style: normal !important;
    line-height: 1.55 !important;
  }

  .strategy-selected-bar {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 14px !important;
    min-height: 42px !important;
    padding: 9px 12px !important;
    border: 1px solid color-mix(in srgb, var(--qd-accent) 20%, var(--qd-border-soft, #e8eff7)) !important;
    border-radius: 8px !important;
    background: color-mix(in srgb, var(--qd-accent) 6%, var(--qd-panel-soft, #f7fafd)) !important;
  }

  .strategy-selected-label {
    display: inline-flex !important;
    align-items: center !important;
    gap: 8px !important;
    min-width: 0 !important;
    color: var(--qd-accent, #1677ff) !important;
    font-size: 13px !important;
  }

  .strategy-selected-label strong {
    color: var(--qd-text, #12243d) !important;
    font-size: 13px !important;
    font-weight: 900 !important;
    white-space: nowrap !important;
  }

  .strategy-selected-bar em {
    min-width: 0 !important;
    color: var(--qd-text-muted, #6b7f99) !important;
    font-size: 12px !important;
    font-style: normal !important;
    line-height: 1.4 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .strategy-examples {
    width: 100% !important;
    padding: 11px 12px 6px !important;
    border: 1px solid var(--qd-border-soft, #e8eff7) !important;
    border-radius: 8px !important;
    background: color-mix(in srgb, var(--qd-panel-soft, #f7fafd) 86%, transparent) !important;
  }

  .strategy-flow-footer {
    display: flex !important;
    justify-content: flex-end !important;
    padding-top: 2px !important;
  }

  .strategy-route-action {
    min-width: 168px !important;
    height: 34px !important;
    border-radius: 7px !important;
    font-weight: 800 !important;
  }
}

@media (max-width: 960px) {
  .copilot-modal {
    .strategy-type-grid {
      grid-template-columns: 1fr !important;
    }

    .strategy-selected-bar {
      align-items: flex-start !important;
      flex-direction: column !important;
      gap: 6px !important;
    }

    .strategy-selected-bar em {
      white-space: normal !important;
    }

    .strategy-route-action {
      width: 100% !important;
    }
  }
}

.add-watch-copilot-modal {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-footer {
    background: var(--qd-panel, #fff);
    border-color: var(--qd-border-soft, #e8eff7);
  }

  .ant-modal-title,
  .ant-modal-close,
  .ant-modal-close-x,
  .ant-tabs-tab,
  .ant-input,
  .ant-input-search-button {
    color: var(--qd-text, #12243d);
  }

  .ant-input {
    background: var(--qd-panel-soft, #f7fafd);
    border-color: var(--qd-border-soft, #e8eff7);
  }

  .ant-tabs-bar {
    border-bottom-color: var(--qd-border-soft, #e8eff7);
  }

  .ant-tabs-tab:hover,
  .ant-tabs-tab-active {
    color: var(--qd-accent, #1677ff);
  }

  .ant-tabs-ink-bar {
    background: var(--qd-accent, #1677ff);
  }

  .symbol-result-card {
    border-color: var(--qd-border-soft, #e8eff7);
    background: var(--qd-panel-soft, #f7fafd);
    color: var(--qd-text, #12243d);
  }

  .symbol-result-card em {
    color: var(--qd-text-subtle, #92a2b6);
  }

  .add-watch-results {
    scrollbar-color: var(--qd-text-subtle, #92a2b6) transparent;
  }
}

body.dark .add-watch-copilot-modal,
body.realdark .add-watch-copilot-modal,
.theme-dark .add-watch-copilot-modal {
  --qd-panel: #161616;
  --qd-panel-soft: #101010;
  --qd-border-soft: rgba(255, 255, 255, 0.12);
  --qd-text: #e7edf6;
  --qd-text-muted: #9ba6b8;
  --qd-text-subtle: #7d8798;
  --qd-accent: var(--primary-color, #3b6bff);
  --qd-accent-soft: color-mix(in srgb, var(--qd-accent) 16%, #111111);

  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-footer {
    background: #161616 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }

  .ant-modal-title,
  .ant-modal-close,
  .ant-modal-close-x,
  .ant-tabs-tab {
    color: #dbe4f0 !important;
  }

  .ant-input {
    background: #101010 !important;
    border-color: rgba(255, 255, 255, 0.14) !important;
    color: #e7edf6 !important;
  }

  .ant-input::placeholder {
    color: #687386 !important;
  }

  .ant-tabs-bar {
    border-bottom-color: rgba(255, 255, 255, 0.1) !important;
  }

  .symbol-result-card {
    border-color: rgba(255, 255, 255, 0.11) !important;
    background: #101010 !important;
    color: #e7edf6 !important;
  }

  .symbol-result-card:hover,
  .symbol-result-card.active {
    border-color: color-mix(in srgb, var(--qd-accent) 62%, rgba(255, 255, 255, 0.12)) !important;
    background: color-mix(in srgb, var(--qd-accent) 15%, #101010) !important;
  }

  .selected-watch-alert .ant-alert-icon {
    color: var(--qd-accent) !important;
  }

  .symbol-result-card em {
    color: #8a96a8 !important;
  }
}

body.dark .copilot-modal,
body.realdark .copilot-modal,
.theme-dark .copilot-modal {
  --qd-panel: #161616;
  --qd-panel-soft: #101010;
  --qd-panel-strong: #1c1c1c;
  --qd-border-soft: rgba(255, 255, 255, 0.12);
  --qd-text: #e7edf6;
  --qd-text-muted: #9ba6b8;
  --qd-text-subtle: #7d8798;
  --qd-accent: var(--primary-color, #1890ff);
  --qd-accent-soft: color-mix(in srgb, var(--qd-accent) 16%, #101010);
  --qd-accent-ring: color-mix(in srgb, var(--qd-accent) 18%, transparent);

  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-footer {
    background: #161616 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }

  .ant-modal-title,
  .ant-modal-close,
  .ant-modal-close-x {
    color: #dbe4f0 !important;
  }

  .ant-modal-body,
  .ant-form,
  .ant-form-item-label > label,
  .ant-checkbox-wrapper,
  .ant-checkbox-group,
  .ant-select-selection-selected-value {
    color: #e7edf6 !important;
  }

  .ant-form-item-label > label {
    font-weight: 700;
  }

  .ant-input,
  .ant-select-selection {
    background: #101010 !important;
    border-color: rgba(255, 255, 255, 0.14) !important;
    color: #e7edf6 !important;
  }

  .ant-input[disabled],
  .ant-input-disabled {
    background: #1b1b1b !important;
    color: rgba(231, 237, 246, 0.74) !important;
    -webkit-text-fill-color: rgba(231, 237, 246, 0.74) !important;
  }

  .ant-select-arrow,
  .ant-checkbox-wrapper span {
    color: rgba(231, 237, 246, 0.78) !important;
  }

  .ant-checkbox-inner {
    background: #101010 !important;
    border-color: rgba(255, 255, 255, 0.28) !important;
  }

  .ant-checkbox-checked .ant-checkbox-inner {
    background: var(--qd-accent) !important;
    border-color: var(--qd-accent) !important;
  }

  .ant-alert-info {
    background: color-mix(in srgb, var(--qd-accent) 9%, #101010) !important;
    border-color: color-mix(in srgb, var(--qd-accent) 26%, rgba(255, 255, 255, 0.12)) !important;
  }

  .ant-alert-message,
  .ant-alert-description {
    color: rgba(231, 237, 246, 0.82) !important;
  }

  .strategy-flow-card,
  .strategy-selected-bar,
  .strategy-examples {
    border-color: rgba(255, 255, 255, 0.11) !important;
    background: #141414 !important;
    box-shadow: none !important;
  }

  .strategy-flow-card:hover,
  .strategy-example-row:hover {
    border-color: color-mix(in srgb, var(--qd-accent) 42%, rgba(255, 255, 255, 0.14)) !important;
    background: #191919 !important;
  }

  .strategy-flow-card.active {
    border-color: color-mix(in srgb, var(--qd-accent) 72%, rgba(255, 255, 255, 0.14)) !important;
    background: color-mix(in srgb, var(--qd-accent) 15%, #141414) !important;
  }

  .strategy-flow-card > .anticon {
    border-color: color-mix(in srgb, var(--qd-accent) 28%, rgba(255, 255, 255, 0.12)) !important;
    background: color-mix(in srgb, var(--qd-accent) 18%, #101010) !important;
    color: var(--qd-accent) !important;
  }

  .strategy-flow-card strong,
  .strategy-selected-label strong,
  .strategy-examples-head strong,
  .strategy-example-row strong {
    color: #e7edf6 !important;
  }

  .strategy-flow-card em,
  .strategy-selected-bar em,
  .strategy-examples-head span,
  .strategy-example-row em {
    color: #9ba6b8 !important;
  }

  .strategy-example-row {
    border-top-color: rgba(255, 255, 255, 0.11) !important;
    background: transparent !important;
    color: #e7edf6 !important;
  }

  .strategy-example-row .anticon {
    color: var(--qd-accent) !important;
  }
}

/* Research-first prompt experience (Kavout-inspired, QuantDinger-native). */
.copilot-workbench .welcome {
  max-width: 980px;
}

.copilot-workbench .welcome-prompts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  max-width: 900px;
  margin: 24px auto 0;
}

.copilot-workbench .welcome-prompts button.research-prompt-pill {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px;
  width: auto !important;
  height: auto !important;
  min-height: 38px !important;
  padding: 8px 14px !important;
  border: 1px solid var(--qd-border) !important;
  border-radius: 999px !important;
  background: color-mix(in srgb, var(--qd-panel) 92%, transparent) !important;
  box-shadow: none !important;
  color: var(--qd-text) !important;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  transition: border-color 0.18s, background 0.18s, color 0.18s, transform 0.18s;
}

.copilot-workbench .welcome-prompts button.research-prompt-pill .anticon {
  color: var(--qd-accent);
  font-size: 14px;
}

.copilot-workbench .welcome-prompts button.research-prompt-pill:hover {
  border-color: var(--qd-accent-border);
  background: var(--qd-accent-soft);
  box-shadow: none;
  color: var(--qd-accent);
  transform: translateY(-1px);
}

.saved-prompt-preview {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 860px;
  margin: 16px auto 0;
}

.saved-prompt-preview__label,
.saved-prompt-preview button {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--qd-text-muted);
  font-size: 12px;
}

.saved-prompt-preview button {
  border: 1px dashed var(--qd-border);
  cursor: pointer;
}

.saved-prompt-preview button:hover {
  border-color: var(--qd-accent-border);
  color: var(--qd-accent);
  background: var(--qd-accent-soft);
}

.followup-suggestions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  padding: 9px 16px 0;
  overflow-x: auto;
  background: var(--qd-panel);
  scrollbar-width: thin;
}

.followup-suggestions button,
.research-mode-bar button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 11px;
  border: 1px solid var(--qd-border-soft);
  border-radius: 999px;
  background: transparent;
  color: var(--qd-text-muted);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  transition: border-color 0.18s, background 0.18s, color 0.18s;
}

.followup-suggestions button:hover,
.research-mode-bar button:hover,
.research-mode-bar button.active {
  border-color: var(--qd-accent-border);
  background: var(--qd-accent-soft);
  color: var(--qd-accent);
}

.research-mode-bar {
  display: flex;
  gap: 7px;
  margin: 8px 0 10px;
  overflow-x: auto;
  scrollbar-width: none;
}

.research-mode-bar::-webkit-scrollbar {
  display: none;
}

body.dark .copilot-workbench .welcome-prompts button.research-prompt-pill,
body.realdark .copilot-workbench .welcome-prompts button.research-prompt-pill,
.theme-dark .copilot-workbench .welcome-prompts button.research-prompt-pill {
  border-color: rgba(255, 255, 255, 0.14) !important;
  background: rgba(255, 255, 255, 0.035) !important;
  color: #dce4ef !important;
}

body.dark .copilot-workbench .message-actions button,
body.realdark .copilot-workbench .message-actions button,
.theme-dark .copilot-workbench .message-actions button {
  border-color: rgba(82, 196, 26, 0.26) !important;
  background: rgba(82, 196, 26, 0.075) !important;
  color: #a8dc85 !important;
}

body.dark .copilot-workbench .message-actions button:hover,
body.realdark .copilot-workbench .message-actions button:hover,
.theme-dark .copilot-workbench .message-actions button:hover {
  border-color: rgba(82, 196, 26, 0.5) !important;
  background: rgba(82, 196, 26, 0.13) !important;
  color: #c2ef9f !important;
}

body.dark .followup-suggestions,
body.realdark .followup-suggestions,
.theme-dark .followup-suggestions {
  background: #101010;
}

/* The two rails share the same row tracks so their lower utility panels align. */
@media (min-width: 1281px) {
  .copilot-workbench > .left-rail,
  .copilot-workbench > .right-rail {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(250px, 36%);
    gap: 12px;
  }

  .copilot-workbench .sessions-panel,
  .copilot-workbench .watch-panel,
  .copilot-workbench .monitor-panel,
  .copilot-workbench .saved-prompt-library {
    min-height: 0;
    height: auto;
    margin: 0;
    flex: none;
  }

  .copilot-workbench .saved-prompt-library {
    display: flex;
    padding-bottom: 13px;
    flex-direction: column;
  }

  .copilot-workbench .saved-prompt-library__list,
  .copilot-workbench .monitor-list {
    min-height: 0;
    max-height: none;
    overflow-y: auto;
  }

  .copilot-workbench .saved-prompt-library__list {
    flex: 1;
  }
}

@media (max-width: 720px) {
  .copilot-workbench .welcome-prompts {
    align-items: stretch;
    flex-direction: column;
  }

  .copilot-workbench .welcome-prompts button.research-prompt-pill {
    justify-content: flex-start;
    width: 100%;
    border-radius: 10px;
    text-align: left;
  }
}

/* Keep the research canvas usable on smaller desktop and tablet viewports. */
@media (max-width: 1280px) {
  .copilot-workbench {
    grid-template-columns: minmax(220px, 250px) minmax(0, 1fr) !important;
  }

  .copilot-workbench > .right-rail {
    display: none !important;
  }
}

@media (max-width: 960px) {
  .copilot-workbench {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .copilot-workbench > .left-rail,
  .copilot-workbench > .right-rail {
    display: none !important;
  }
}

@media (max-width: 640px) {
  .utility-tool-grid,
  .context-telemetry {
    grid-template-columns: 1fr;
  }

  .memory-editor-row {
    grid-template-columns: 1fr;
  }
}

.mobile-sessions-trigger,
.mobile-rail-close,
.mobile-rail-backdrop {
  display: none;
}

@media (max-width: 960px) {
  .mobile-sessions-trigger {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 6px;
    min-height: 32px;
    margin: 0 0 10px;
    padding: 5px 10px;
    border: 1px solid var(--qd-accent-border);
    border-radius: 8px;
    background: var(--qd-accent-soft);
    color: var(--qd-text);
    cursor: pointer;
  }

  .mobile-rail-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1003;
    display: block;
    background: rgba(0, 0, 0, 0.56);
  }

  .copilot-workbench > .left-rail.mobile-open {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 1004;
    display: flex !important;
    width: 88vw;
    max-width: 340px;
    padding: 46px 10px 10px;
    overflow-y: auto;
    background: var(--qd-bg);
    box-shadow: 18px 0 44px rgba(0, 0, 0, 0.24);
  }

  .mobile-rail-close {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1;
    display: inline-grid;
    width: 32px;
    height: 32px;
    padding: 0;
    place-items: center;
    border: 1px solid var(--qd-border);
    border-radius: 8px;
    background: var(--qd-panel);
    color: var(--qd-text);
    cursor: pointer;
  }

  .copilot-workbench > .left-rail.mobile-open .sessions-panel {
    min-height: 300px;
  }
}

@media (max-width: 640px) {
  .copilot-workbench .messages {
    padding: 12px 8px 18px;
  }

  .copilot-workbench .message.report-message .avatar {
    display: none;
  }

  .copilot-workbench .message.report-message.assistant .bubble,
  .copilot-workbench .message.report-message .copilot-report-card {
    width: 100%;
    min-width: 0;
    max-width: none;
  }
}
</style>
