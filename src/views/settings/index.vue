<template>
  <div class="settings-page qd-workspace-page qd-page-frame" :class="{ 'theme-dark': isDarkTheme }">
    <a-alert
      v-if="showRestartTip"
      class="restart-alert"
      type="warning"
      showIcon
      closable
      @close="showRestartTip = false"
    >
      <template slot="message">
        <span>{{ $t('settings.restartRequired') }}</span>
        <a-button size="small" type="link" @click="copyRestartCommand">
          {{ $t('settings.copyRestartCmd') }}
        </a-button>
      </template>
    </a-alert>

    <a-spin :spinning="loading">
      <div class="settings-layout">
        <aside class="settings-nav">
          <div class="settings-search">
            <a-input
              v-model="searchKeyword"
              :placeholder="searchPlaceholder"
              allowClear
            >
              <a-icon slot="prefix" type="search" />
            </a-input>
          </div>
          <a-menu
            mode="inline"
            :selected-keys="[activeGroupKey]"
            class="settings-menu"
            @click="onMenuClick"
          >
            <a-menu-item-group v-for="section in navSections" :key="section.key">
              <template slot="title">
                <span class="settings-nav-section-title">{{ section.title }}</span>
              </template>
              <a-menu-item
                v-for="entry in section.groups"
                :key="entry.key"
              >
                <a-icon :type="entry.group.icon || getGroupIcon(entry.key)" />
                <span>{{ getGroupTitle(entry.key, entry.group.title) }}</span>
              </a-menu-item>
            </a-menu-item-group>
          </a-menu>
        </aside>

        <section class="settings-detail">
          <div v-if="searchKeyword.trim()" class="settings-detail-inner">
            <div class="detail-header">
              <a-icon type="search" class="detail-icon" />
              <h3 class="detail-title">
                {{ searchResultsTitle }}
              </h3>
            </div>

            <a-empty
              v-if="searchResults.length === 0"
              :description="emptySearchLabel"
              style="margin-top: 48px;"
            />
            <a-form v-else :form="form" layout="vertical" class="settings-form" autocomplete="off">
              <a-row :gutter="24">
                <a-col
                  v-for="entry in searchResults"
                  :key="entry.item.key"
                  :xs="24"
                  :sm="24"
                  :md="12"
                  :lg="12"
                >
                  <div class="search-result-group-tag">
                    <a-icon :type="getGroupIcon(entry.groupKey)" />
                    {{ getGroupTitle(entry.groupKey, entry.groupTitle) }}
                  </div>
                  <a-form-item>
                    <template slot="label">
                      <span class="form-label-with-tooltip">
                        <span class="label-text">{{ getItemLabel(entry.groupKey, entry.item) }}</span>
                        <a-tooltip v-if="entry.item.description" placement="top">
                          <template slot="title">
                            {{ getItemDescription(entry.groupKey, entry.item) }}
                          </template>
                          <a-icon type="question-circle" class="help-icon" />
                        </a-tooltip>
                        <a
                          v-if="entry.item.link"
                          :href="entry.item.link"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="api-link"
                          @click.stop
                        >
                          <a-icon type="link" />
                          {{ getLinkText(entry.item.link_text) }}
                        </a>
                      </span>
                    </template>
                    <template v-if="entry.item.type === 'text'">
                      <a-input
                        v-decorator="[entry.item.key, { initialValue: getFieldValue(entry.groupKey, entry.item.key) }]"
                        :placeholder="entry.item.default ? `${$t('settings.default')}: ${entry.item.default}` : ''"
                        :name="getSafeInputName(entry.item)"
                        :autocomplete="getAutocomplete(entry.item)"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        data-form-type="other"
                        allowClear
                      />
                    </template>
                    <template v-else-if="entry.item.type === 'password'">
                      <div class="password-field">
                        <a-input
                          v-decorator="[entry.item.key, { initialValue: getFieldValue(entry.groupKey, entry.item.key) }]"
                          type="text"
                          :class="{ 'secret-masked-input': !passwordVisible[entry.item.key] }"
                          :placeholder="getSecretPlaceholder(entry.groupKey, entry.item)"
                          :name="getSafeInputName(entry.item)"
                          :autocomplete="getAutocomplete(entry.item)"
                          spellcheck="false"
                          autocapitalize="off"
                          data-lpignore="true"
                          data-1p-ignore="true"
                          data-bwignore="true"
                          data-form-type="other"
                          allowClear
                        >
                          <a-icon
                            slot="suffix"
                            :type="passwordVisible[entry.item.key] ? 'eye' : 'eye-invisible'"
                            @click="togglePasswordVisible(entry.item.key)"
                            style="cursor: pointer"
                          />
                        </a-input>
                      </div>
                    </template>
                    <template v-else-if="entry.item.type === 'number'">
                      <a-input-number
                        v-decorator="[entry.item.key, { initialValue: getNumberValue(entry.groupKey, entry.item.key, entry.item.default) }]"
                        :placeholder="entry.item.default ? `${$t('settings.default')}: ${entry.item.default}` : ''"
                        style="width: 100%"
                      />
                    </template>
                    <template v-else-if="entry.item.type === 'boolean'">
                      <a-switch
                        v-decorator="[entry.item.key, { valuePropName: 'checked', initialValue: getBoolValue(entry.groupKey, entry.item.key, entry.item.default) }]"
                      />
                    </template>
                    <template v-else-if="entry.item.type === 'select'">
                      <a-select
                        v-decorator="[entry.item.key, { initialValue: getFieldValue(entry.groupKey, entry.item.key) || entry.item.default }]"
                        :placeholder="entry.item.default ? `${$t('settings.default')}: ${entry.item.default}` : $t('settings.pleaseSelect')"
                      >
                        <a-select-option
                          v-for="opt in getSelectOptions(entry.item)"
                          :key="opt.value"
                          :value="opt.value"
                        >
                          {{ opt.label }}
                        </a-select-option>
                      </a-select>
                    </template>
                    <template v-else-if="entry.item.type === 'market_multiselect'">
                      <a-checkbox-group
                        v-decorator="[entry.item.key, { initialValue: getCsvListValue(entry.groupKey, entry.item.key, entry.item.default) }]"
                        class="market-module-grid"
                      >
                        <div
                          v-for="market in getMarketModuleRows(entry.item)"
                          :key="market.key"
                          class="market-module-row"
                        >
                          <div class="market-module-main">
                            <a-checkbox :value="market.key">
                              <span class="market-module-label">{{ marketModuleLabel(market) }}</span>
                            </a-checkbox>
                            <a-tag :color="marketStatusColor(market.status)">
                              {{ marketStatusText(market.status) }}
                            </a-tag>
                          </div>
                          <div class="market-module-desc">{{ marketModuleDescription(market) }}</div>
                          <div class="market-module-meta">
                            <span>{{ market.symbol_hint }}</span>
                            <span v-if="market.live_brokers && market.live_brokers.length">
                              {{ marketLiveText(market) }}
                            </span>
                            <span v-else>{{ marketResearchOnlyText() }}</span>
                          </div>
                          <div v-if="market.data_sources && market.data_sources.length" class="market-data-source-list">
                            <span
                              v-for="source in market.data_sources"
                              :key="source.key"
                              class="market-data-source"
                              :class="{ configured: source.configured, missing: !source.configured && (source.required || source.recommended) }"
                            >
                              {{ marketSourceLabel(source) }}
                              <small>{{ sourceStatusText(source) }}</small>
                            </span>
                          </div>
                        </div>
                      </a-checkbox-group>
                    </template>
                    <template v-else-if="entry.item.type === 'venue_multiselect'">
                      <div class="trading-venue-notice" role="note">
                        <span class="trading-venue-notice-icon"><a-icon type="safety-certificate" /></span>
                        <span class="trading-venue-notice-copy">
                          <strong>{{ $t('settings.venues.title') }}</strong>
                          <small>{{ $t('settings.venues.description') }}</small>
                        </span>
                      </div>
                      <a-checkbox-group
                        v-decorator="[entry.item.key, { initialValue: getCsvListValue(entry.groupKey, entry.item.key, entry.item.default) }]"
                        class="trading-venue-selector"
                      >
                        <section v-for="group in tradingVenueGroups(entry.item)" :key="group.key" class="trading-venue-group">
                          <div class="trading-venue-group-header">
                            <h4>{{ group.title }}</h4>
                            <span class="trading-venue-group-line" />
                          </div>
                          <div class="trading-venue-grid">
                            <label v-for="venue in group.items" :key="venue.id" class="trading-venue-card">
                              <a-checkbox :value="venue.id" />
                              <provider-logo :provider="venue.id" :size="30" />
                              <span class="trading-venue-copy">
                                <strong>{{ venue.name }}</strong>
                                <small>{{ venue.description }}</small>
                              </span>
                            </label>
                          </div>
                        </section>
                      </a-checkbox-group>
                    </template>
                    <div class="field-default" v-if="entry.item.default && entry.item.type !== 'boolean' && entry.item.type !== 'password' && entry.item.type !== 'venue_multiselect'">
                      {{ $t('settings.default') }}: {{ entry.item.default }}
                    </div>
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </div>

          <div v-else-if="currentGroup" class="settings-detail-inner">
            <div class="detail-header">
              <a-icon :type="currentGroup.icon || getGroupIcon(activeGroupKey)" class="detail-icon" />
              <h3 class="detail-title">
                {{ getGroupTitle(activeGroupKey, currentGroup.title) }}
              </h3>
            </div>

            <a-card
              v-if="activeGroupKey === 'billing'"
              class="billing-plan-manager"
              :title="$t('settings.billingPlans.title')"
              :bordered="false"
            >
              <template #extra>
                <a-button size="small" @click="addBillingPlan"><a-icon type="plus" /> {{ $t('settings.billingPlans.add') }}</a-button>
              </template>
              <p class="billing-card-description">{{ $t('settings.billingPlans.hint') }}</p>
              <div class="billing-plan-grid">
                <article v-for="(plan, index) in billingPlans" :key="plan._key" class="billing-plan-card">
                  <header class="billing-plan-card-head">
                    <a-input
                      :ref="`billingPlanCode-${plan._key}`"
                      v-model="plan.code"
                      class="billing-plan-code"
                      size="small"
                      :disabled="!!plan.persisted"
                      placeholder="plan_code"
                    />
                    <div class="billing-plan-card-badges">
                      <a-tag v-if="plan.is_active" color="green">{{ $t('settings.billingPlans.active') }}</a-tag>
                      <a-tag v-if="plan.is_popular" color="orange">{{ $t('settings.billingPlans.popular') }}</a-tag>
                    </div>
                    <a-tooltip :title="$t('settings.billingPlans.delete')">
                      <a-button
                        type="link"
                        class="plan-remove"
                        :loading="billingPlanDeletingCode === plan.code"
                        @click="removeBillingPlan(index)"
                      ><a-icon type="delete" /></a-button>
                    </a-tooltip>
                  </header>
                  <div class="billing-plan-copy">
                    <a-input v-model="plan.name" size="small" :placeholder="$t('settings.billingPlans.name')" />
                    <a-textarea v-model="plan.description" :auto-size="{ minRows: 2, maxRows: 4 }" :placeholder="$t('settings.billingPlans.description')" />
                  </div>
                  <div class="billing-plan-metrics">
                    <label><span>{{ $t('settings.billingPlans.price') }}</span><a-input-number v-model="plan.price_usd" size="small" :min="0" :precision="2" /></label>
                    <label><span>{{ $t('settings.billingPlans.days') }}</span><a-input-number v-model="plan.duration_days" size="small" :min="0" :disabled="plan.is_lifetime" /></label>
                    <label><span>{{ $t('settings.billingPlans.onceCredits') }}</span><a-input-number v-model="plan.credits_once" size="small" :min="0" /></label>
                    <label><span>{{ $t('settings.billingPlans.monthlyCredits') }}</span><a-input-number v-model="plan.credits_monthly" size="small" :min="0" /></label>
                    <label><span>{{ $t('settings.billingPlans.strategyLimit') }}</span><a-input-number v-model="plan.strategy_limit" size="small" :min="1" /></label>
                    <label><span>{{ $t('settings.billingPlans.stripePrice') }}</span><a-input v-model="plan.stripe_price_id" size="small" placeholder="price_..." /></label>
                  </div>
                  <div class="billing-plan-flags">
                    <a-checkbox v-model="plan.is_active">{{ $t('settings.billingPlans.active') }}</a-checkbox>
                    <a-checkbox v-model="plan.is_lifetime">{{ $t('settings.billingPlans.lifetime') }}</a-checkbox>
                    <a-checkbox v-model="plan.is_popular">{{ $t('settings.billingPlans.popular') }}</a-checkbox>
                    <a-checkbox v-model="plan.referral_eligible">{{ $t('settings.billingPlans.referralEligible') }}</a-checkbox>
                  </div>
                </article>
              </div>
              <div class="billing-plan-actions">
                <a-button type="primary" :loading="billingPlansSaving" @click="saveBillingPlanCatalog">
                  <a-icon type="save" /> {{ $t('settings.billingPlans.save') }}
                </a-button>
              </div>
            </a-card>

            <a-card
              v-if="activeGroupKey === 'billing'"
              class="billing-plan-manager"
              :title="$t('settings.referralActivity.title')"
              :bordered="false"
            >
              <p class="billing-card-description">{{ $t('settings.referralActivity.hint') }}</p>
              <a-form :form="form" layout="vertical" class="referral-settings-form">
                <a-row :gutter="24">
                  <a-col :xs="24" :md="12">
                    <a-form-item :label="$t('settings.field.REFERRAL_PROGRAM_ENABLED')">
                      <a-switch
                        v-decorator="['REFERRAL_PROGRAM_ENABLED', { valuePropName: 'checked', initialValue: getBoolValue('billing', 'REFERRAL_PROGRAM_ENABLED', false) }]"
                        @change="referralProgramEnabled = $event"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
                <div v-if="referralProgramEnabled" class="referral-dependent-settings">
                  <a-row :gutter="24">
                    <a-col :xs="24" :md="12">
                      <a-form-item>
                        <template #label>
                          <span>{{ $t('settings.field.REFERRAL_REWARD_RATES') }}</span>
                          <a-tag class="referral-level-cap">{{ $t('settings.referralActivity.maxThreeLevels') }}</a-tag>
                        </template>
                        <a-input
                          v-decorator="['REFERRAL_REWARD_RATES', {
                            initialValue: getFieldValue('billing', 'REFERRAL_REWARD_RATES') || '10,5,3',
                            rules: [{ validator: validateReferralRewardRates }]
                          }]"
                          :placeholder="$t('settings.referralActivity.ratesPlaceholder')"
                          :maxLength="24"
                          @input="limitReferralRewardRates"
                        />
                        <div class="field-default referral-rate-help">
                          <a-icon type="info-circle" />
                          {{ $t('settings.referralActivity.ratesHelpCompact') }}
                        </div>
                      </a-form-item>
                    </a-col>
                    <a-col :xs="24" :md="12">
                      <a-form-item :label="$t('settings.field.REFERRAL_REWARD_HOLD_DAYS')">
                        <a-input-number v-decorator="['REFERRAL_REWARD_HOLD_DAYS', { initialValue: getNumberValue('billing', 'REFERRAL_REWARD_HOLD_DAYS', 7) }]" :min="0" :max="365" style="width: 100%" />
                      </a-form-item>
                    </a-col>
                    <a-col :xs="24" :md="12">
                      <a-form-item :label="$t('settings.field.REFERRAL_MIN_WITHDRAWAL_USD')">
                        <a-input-number v-decorator="['REFERRAL_MIN_WITHDRAWAL_USD', { initialValue: getNumberValue('billing', 'REFERRAL_MIN_WITHDRAWAL_USD', 10) }]" :min="0.01" :precision="2" style="width: 100%" />
                      </a-form-item>
                    </a-col>
                  </a-row>
                </div>
                <div v-else class="referral-disabled-note"><a-icon type="info-circle" /> {{ $t('settings.referralActivity.disabledHint') }}</div>
              </a-form>
            </a-card>

            <div v-if="activeGroupKey === 'market_catalog'" class="market-catalog-panel">
              <div class="catalog-action-row catalog-page-header">
                <div class="catalog-heading-copy">
                  <h4>{{ $t('settings.marketCatalog.overviewTitle') }}</h4>
                  <p>{{ $t('settings.marketCatalog.description') }}</p>
                </div>
                <div class="catalog-header-actions">
                  <div class="catalog-last-sync">
                    <span>{{ $t('settings.marketCatalog.lastCompleted') }}</span>
                    <strong>{{ formatCatalogTime(catalogLatest && catalogLatest.finished_at) }}</strong>
                  </div>
                  <a-button type="primary" :loading="catalogSyncing" @click="handleCatalogSync">
                    <a-icon type="sync" />
                    {{ catalogRunning ? $t('settings.marketCatalog.syncing') : $t('settings.marketCatalog.syncNow') }}
                  </a-button>
                </div>
              </div>
              <a-spin :spinning="catalogLoading">
                <section class="catalog-health-card" :class="`is-${catalogStatusType}`">
                  <div class="catalog-health-summary">
                    <span class="catalog-health-icon"><a-icon :type="catalogStatusIcon" :spin="catalogRunning" /></span>
                    <div>
                      <strong>{{ catalogStatusLabel }}</strong>
                      <p>{{ catalogStatusDescription || $t('settings.marketCatalog.neverDescription') }}</p>
                    </div>
                  </div>
                  <div class="catalog-health-metrics">
                    <div><span>{{ $t('settings.marketCatalog.sourcesHealthy') }}</span><strong>{{ catalogSyncSummary.success }} / {{ catalogSyncSummary.total }}</strong></div>
                    <div :class="{ 'has-failures': catalogSyncSummary.failed > 0 }"><span>{{ $t('settings.marketCatalog.sourcesFailed') }}</span><strong>{{ catalogSyncSummary.failed }}</strong></div>
                    <div><span>{{ $t('settings.marketCatalog.recordsWritten') }}</span><strong>{{ catalogSyncSummary.rows.toLocaleString() }}</strong></div>
                  </div>
                </section>

                <section class="catalog-content-section">
                  <div class="catalog-section-heading">
                    <div><h5>{{ $t('settings.marketCatalog.catalogCoverageTitle') }}</h5><p>{{ $t('settings.marketCatalog.catalogCoverageDesc') }}</p></div>
                  </div>
                  <div class="catalog-summary-grid">
                    <div class="catalog-summary-item"><span>{{ $t('settings.marketCatalog.activeRecords') }}</span><strong>{{ catalogMetric('active').toLocaleString() }}</strong></div>
                    <div class="catalog-summary-item"><span>{{ $t('settings.marketCatalog.uniqueSymbols') }}</span><strong>{{ catalogMetric('symbols').toLocaleString() }}</strong></div>
                    <div class="catalog-summary-item"><span>{{ $t('settings.marketCatalog.ordinarySpot') }}</span><strong>{{ catalogMetric('ordinary_spot').toLocaleString() }}</strong></div>
                    <div class="catalog-summary-item"><span>{{ $t('settings.marketCatalog.swap') }}</span><strong>{{ catalogMetric('ordinary_swap').toLocaleString() }}</strong></div>
                    <div class="catalog-summary-item"><span>{{ $t('settings.marketCatalog.tokenizedEquity') }}</span><strong>{{ catalogMetric('tokenized_equity').toLocaleString() }}</strong></div>
                    <div class="catalog-summary-item"><span>{{ $t('settings.marketCatalog.directEquity') }}</span><strong>{{ catalogMetric('direct_equity').toLocaleString() }}</strong></div>
                    <div class="catalog-summary-item"><span>{{ $t('settings.marketCatalog.stockPerpetual') }}</span><strong>{{ catalogMetric('stock_perpetual').toLocaleString() }}</strong></div>
                  </div>
                </section>

                <section class="catalog-content-section">
                  <div class="catalog-section-heading">
                    <div><h5>{{ $t('settings.marketCatalog.venueCoverage') }}</h5><p>{{ $t('settings.marketCatalog.venueCoverageDesc') }}</p></div>
                  </div>
                  <div class="catalog-table-wrap">
                    <table class="catalog-table">
                      <thead><tr><th>{{ $t('settings.marketCatalog.exchange') }}</th><th>{{ $t('settings.marketCatalog.ordinarySpot') }}</th><th>{{ $t('settings.marketCatalog.swap') }}</th><th>{{ $t('settings.marketCatalog.tokenizedEquity') }}</th><th>{{ $t('settings.marketCatalog.directEquity') }}</th><th>{{ $t('settings.marketCatalog.stockPerpetual') }}</th><th>{{ $t('settings.marketCatalog.syncResult') }}</th></tr></thead>
                      <tbody>
                        <tr v-for="venue in catalogVenueRows" :key="venue.exchange">
                          <td><strong>{{ venue.label }}</strong></td><td>{{ venue.ordinarySpot }}</td><td>{{ venue.ordinarySwap }}</td><td>{{ venue.tokenizedEquity }}</td><td>{{ venue.directEquity }}</td><td>{{ venue.stockPerpetual }}</td>
                          <td><a-tag :color="venue.statusColor">{{ venue.statusLabel }}</a-tag></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section v-if="catalogFailures.length" class="catalog-failure-panel">
                  <div class="catalog-section-heading">
                    <div><h5><a-icon type="warning" /> {{ $t('settings.marketCatalog.failureTitle') }}</h5><p>{{ $t('settings.marketCatalog.failureDescription') }}</p></div>
                    <a-tag color="orange">{{ catalogFailures.length }}</a-tag>
                  </div>
                  <div class="catalog-failure-grid">
                    <div v-for="item in catalogFailures" :key="`${item.exchange}-${item.market_type}`" class="catalog-failure-item">
                      <strong>{{ item.exchange }} · {{ item.market_type === 'spot' ? $t('settings.marketCatalog.spot') : $t('settings.marketCatalog.swap') }}</strong>
                      <span>{{ cleanCatalogError(item.error) }}</span>
                    </div>
                  </div>
                </section>

                <section class="catalog-content-section">
                  <div class="catalog-section-heading">
                    <div><h5>{{ $t('settings.marketCatalog.marketOverview') }}</h5><p>{{ $t('settings.marketCatalog.marketOverviewDesc') }}</p></div>
                  </div>
                  <div class="catalog-market-grid">
                    <div v-for="market in catalogMarkets" :key="market.market" class="catalog-market-item">
                      <span>{{ catalogMarketLabel(market.market) }}</span><strong>{{ Number(market.active || 0).toLocaleString() }}</strong>
                    </div>
                  </div>
                </section>

                <div class="catalog-section-divider" />
                <div class="catalog-action-row universe-sync-header">
                  <div>
                    <h4>{{ $t('settings.universeSync.title') }}</h4>
                    <p>{{ $t('settings.universeSync.description') }}</p>
                    <p class="universe-sync-capacity">{{ $t('settings.universeSync.capacity', universeExecutionLimits) }}</p>
                  </div>
                  <div class="universe-sync-actions">
                    <a-button icon="plus" @click="openSystemUniverseCreate">
                      {{ $t('settings.universeSync.add') }}
                    </a-button>
                    <label>
                      <span>{{ $t('settings.universeSync.historyStart') }}</span>
                      <a-date-picker
                        v-model="universeHistoryFrom"
                        :allow-clear="false"
                        :disabled-date="disabledUniverseHistoryDate"
                      />
                    </label>
                    <a-button type="primary" :loading="universeSyncing" @click="handleUniverseSync">
                      <a-icon type="sync" />
                      {{ universeSyncing ? $t('settings.universeSync.syncing') : $t('settings.universeSync.sync') }}
                    </a-button>
                  </div>
                </div>
                <a-spin :spinning="universeLoading">
                  <a-checkbox-group v-model="selectedUniverseCodes" class="universe-sync-list">
                    <div v-for="item in systemUniverseRows" :key="item.id" class="universe-sync-row" :class="{ 'is-hidden': item.status === 'hidden' }">
                      <a-checkbox
                        v-if="syncableUniverseCodes.includes(item.code)"
                        :value="item.code"
                        :disabled="item.status === 'hidden'"
                      />
                      <span v-else class="universe-checkbox-spacer" />
                      <div class="universe-sync-name"><strong>{{ universeAdminLabel(item) }}</strong><span>{{ item.market }}</span></div>
                      <div><span>{{ $t('settings.universeSync.members') }}</span><strong>{{ Number(item.member_count || 0).toLocaleString() }}</strong></div>
                      <div><span>{{ $t('settings.universeSync.version') }}</span><strong>{{ item.source_version || universeSnapshotDate(item) }}</strong></div>
                      <div><span>{{ $t('settings.universeSync.historyFrom') }}</span><strong>{{ universeHistoryLabel(item) }}</strong></div>
                      <div class="universe-row-state">
                        <a-tag v-if="item.status === 'hidden'" color="default">{{ $t('settings.universeSync.hidden') }}</a-tag>
                        <a-tag :color="universeCapacityColor(item)">{{ universeCapacityLabel(item) }}</a-tag>
                      </div>
                      <div class="universe-row-actions">
                        <a-tooltip :title="$t('settings.universeSync.edit')">
                          <a-button type="link" icon="edit" @click="openSystemUniverseEdit(item)" />
                        </a-tooltip>
                        <a-tooltip :title="item.status === 'hidden' ? $t('settings.universeSync.show') : $t('settings.universeSync.hide')">
                          <a-button
                            type="link"
                            :icon="item.status === 'hidden' ? 'eye' : 'eye-invisible'"
                            :loading="universeVisibilityId === item.id"
                            @click="toggleSystemUniverseVisibility(item)"
                          />
                        </a-tooltip>
                        <a-popconfirm
                          :title="$t('settings.universeSync.deleteConfirm', { name: universeAdminLabel(item) })"
                          :ok-text="$t('settings.universeSync.delete')"
                          :cancel-text="$t('settings.universeSync.cancel')"
                          ok-type="danger"
                          @confirm="removeSystemUniverse(item)"
                        >
                          <a-tooltip :title="$t('settings.universeSync.delete')">
                            <a-button type="link" class="universe-delete-button" icon="delete" :loading="universeDeletingId === item.id" />
                          </a-tooltip>
                        </a-popconfirm>
                      </div>
                    </div>
                  </a-checkbox-group>
                </a-spin>
              </a-spin>
              <FundamentalSyncPanel :universes="systemUniverseRows" :dark="isDarkTheme" />
            </div>

            <div v-if="activeGroupKey === 'ai' && currentLlmProvider === 'openrouter'" class="openrouter-balance-card">
              <a-card size="small" :bordered="false">
                <div class="balance-header">
                  <span class="balance-title">
                    <a-icon type="wallet" style="margin-right: 6px;" />
                    {{ $t('settings.openrouterBalance') || 'OpenRouter 账户余额' }}
                  </span>
                  <a-button size="small" type="primary" ghost :loading="balanceLoading" @click="queryOpenRouterBalance">
                    <a-icon type="sync" />
                    {{ $t('settings.queryBalance') || '查询余额' }}
                  </a-button>
                </div>
                <div v-if="openrouterBalance" class="balance-info">
                  <a-row :gutter="16">
                    <a-col :span="8">
                      <a-statistic
                        :title="$t('settings.balanceUsage') || '已使用'"
                        :value="openrouterBalance.usage"
                        prefix="$"
                        :precision="4"
                        :value-style="{ color: '#cf1322' }"
                      />
                    </a-col>
                    <a-col :span="8">
                      <a-statistic
                        :title="$t('settings.balanceRemaining') || '剩余额度'"
                        :value="openrouterBalance.limit_remaining !== null ? openrouterBalance.limit_remaining : '∞'"
                        :prefix="openrouterBalance.limit_remaining !== null ? '$' : ''"
                        :precision="openrouterBalance.limit_remaining !== null ? 4 : 0"
                        :value-style="{ color: openrouterBalance.limit_remaining !== null && openrouterBalance.limit_remaining < 1 ? '#cf1322' : '#3f8600' }"
                      />
                    </a-col>
                    <a-col :span="8">
                      <a-statistic
                        :title="$t('settings.balanceLimit') || '总限额'"
                        :value="openrouterBalance.limit !== null ? openrouterBalance.limit : '∞'"
                        :prefix="openrouterBalance.limit !== null ? '$' : ''"
                        :precision="openrouterBalance.limit !== null ? 2 : 0"
                      />
                    </a-col>
                  </a-row>
                  <div v-if="openrouterBalance.is_free_tier" class="free-tier-badge">
                    <a-tag color="blue">{{ $t('settings.freeTier') }}</a-tag>
                  </div>
                </div>
                <div v-else class="balance-empty">
                  <a-icon type="info-circle" style="margin-right: 6px;" />
                  {{ $t('settings.balanceNotQueried') || '点击"查询余额"获取账户信息' }}
                </div>
              </a-card>
            </div>

            <a-form v-if="activeGroupKey !== 'market_catalog'" :form="form" layout="vertical" class="settings-form" autocomplete="off">
              <div v-if="activeGroupKey === 'ai'" class="ai-settings-panel">
                <div class="ai-provider-status" role="status">
                  <span class="ai-provider-status-icon"><a-icon type="check" /></span>
                  <strong>{{ $t('settings.llm.currentProviderLabel') }}</strong>
                  <a-tag color="blue">{{ currentLlmProviderLabel }}</a-tag>
                  <span class="ai-provider-status-copy">{{ aiProviderAlertDesc }}</span>
                </div>

                <section
                  v-for="section in aiSections"
                  :key="section.key"
                  class="ai-settings-section"
                >
                  <div class="ai-section-header">
                    <div>
                      <h4>{{ section.title }}</h4>
                      <p v-if="section.description">{{ section.description }}</p>
                    </div>
                    <div class="ai-section-actions">
                      <template v-if="section.switchItem">
                        <span>{{ getItemLabel(activeGroupKey, section.switchItem) }}</span>
                        <a-switch
                          v-decorator="[section.switchItem.key, { valuePropName: 'checked', initialValue: getBoolValue(activeGroupKey, section.switchItem.key, section.switchItem.default) }]"
                          @change="onAiSectionSwitchChange(section.switchItem.key, $event)"
                        />
                      </template>
                      <a-tag v-if="section.badge" :color="section.badgeColor || 'blue'">
                        {{ section.badge }}
                      </a-tag>
                    </div>
                  </div>

                  <a-row :gutter="24">
                    <a-col
                      v-for="entry in section.entries"
                      :key="entry.key"
                      :xs="24"
                      :sm="24"
                      :md="entry.type !== 'field' ? 24 : (entry.item.key === 'LLM_PROVIDER' ? 24 : 12)"
                      :lg="entry.type !== 'field' ? 24 : (entry.item.key === 'LLM_PROVIDER' ? 24 : 12)"
                    >
                      <div v-if="entry.type === 'heading'" class="settings-subsection-heading">
                        <div class="settings-subsection-title-row">
                          <span>{{ entry.title }}</span>
                          <a-tag v-if="entry.badge" :color="entry.badgeColor || 'blue'">{{ entry.badge }}</a-tag>
                        </div>
                        <small>{{ entry.description }}</small>
                      </div>
                      <div v-else-if="entry.type === 'advanced-toggle'" class="advanced-settings-toggle">
                        <a-button type="link" @click="toggleAdvanced(entry.scope)">
                          <a-icon :type="entry.expanded ? 'up' : 'down'" />
                          {{ entry.label }}
                        </a-button>
                        <small>{{ entry.description }}</small>
                      </div>
                      <a-form-item v-else>
                        <template slot="label">
                          <span class="form-label-with-tooltip">
                            <span class="label-text">{{ getItemLabel(activeGroupKey, entry.item) }}</span>
                            <a-tooltip v-if="entry.item.description" placement="top">
                              <template slot="title">
                                {{ getItemDescription(activeGroupKey, entry.item) }}
                              </template>
                              <a-icon type="question-circle" class="help-icon" />
                            </a-tooltip>
                            <a
                              v-if="entry.item.link"
                              :href="entry.item.link"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="api-link"
                              @click.stop
                            >
                              <a-icon type="link" />
                              {{ getLinkText(entry.item.link_text) }}
                            </a>
                          </span>
                        </template>
                        <template v-if="entry.item.type === 'text'">
                          <a-input
                            v-decorator="[entry.item.key, { initialValue: getFieldValue(activeGroupKey, entry.item.key) }]"
                            :placeholder="entry.item.default ? `${$t('settings.default')}: ${entry.item.default}` : ''"
                            :name="getSafeInputName(entry.item)"
                            :autocomplete="getAutocomplete(entry.item)"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            data-bwignore="true"
                            data-form-type="other"
                            allowClear
                          />
                        </template>
                        <template v-else-if="entry.item.type === 'password'">
                          <div class="password-field">
                            <a-input
                              v-decorator="[entry.item.key, { initialValue: getFieldValue(activeGroupKey, entry.item.key) }]"
                              type="text"
                              :class="{ 'secret-masked-input': !passwordVisible[entry.item.key] }"
                              :placeholder="getSecretPlaceholder(activeGroupKey, entry.item)"
                              :name="getSafeInputName(entry.item)"
                              :autocomplete="getAutocomplete(entry.item)"
                              spellcheck="false"
                              autocapitalize="off"
                              data-lpignore="true"
                              data-1p-ignore="true"
                              data-bwignore="true"
                              data-form-type="other"
                              allowClear
                            >
                              <a-icon
                                slot="suffix"
                                :type="passwordVisible[entry.item.key] ? 'eye' : 'eye-invisible'"
                                @click="togglePasswordVisible(entry.item.key)"
                                style="cursor: pointer"
                              />
                            </a-input>
                          </div>
                        </template>
                        <template v-else-if="entry.item.type === 'number'">
                          <a-input-number
                            v-decorator="[entry.item.key, { initialValue: getNumberValue(activeGroupKey, entry.item.key, entry.item.default) }]"
                            :placeholder="entry.item.default ? `${$t('settings.default')}: ${entry.item.default}` : ''"
                            style="width: 100%"
                          />
                        </template>
                        <template v-else-if="entry.item.type === 'boolean'">
                          <a-switch
                            v-decorator="[entry.item.key, { valuePropName: 'checked', initialValue: getBoolValue(activeGroupKey, entry.item.key, entry.item.default) }]"
                          />
                        </template>
                        <template v-else-if="entry.item.type === 'select'">
                          <a-select
                            v-decorator="[entry.item.key, { initialValue: getFieldValue(activeGroupKey, entry.item.key) || entry.item.default }]"
                            :placeholder="entry.item.default ? `${$t('settings.default')}: ${entry.item.default}` : $t('settings.pleaseSelect')"
                            @change="onSelectFieldChange(entry.item, $event)"
                          >
                            <a-select-option
                              v-for="opt in getSelectOptions(entry.item)"
                              :key="opt.value"
                              :value="opt.value"
                            >
                              {{ opt.label }}
                            </a-select-option>
                          </a-select>
                        </template>
                        <template v-else-if="entry.item.type === 'market_multiselect'">
                          <a-checkbox-group
                            v-decorator="[entry.item.key, { initialValue: getCsvListValue(activeGroupKey, entry.item.key, entry.item.default) }]"
                            class="market-module-grid"
                          >
                            <div
                              v-for="market in getMarketModuleRows(entry.item)"
                              :key="market.key"
                              class="market-module-row"
                            >
                              <div class="market-module-main">
                                <a-checkbox :value="market.key">
                                  <span class="market-module-label">{{ marketModuleLabel(market) }}</span>
                                </a-checkbox>
                                <a-tag :color="marketStatusColor(market.status)">
                                  {{ marketStatusText(market.status) }}
                                </a-tag>
                              </div>
                              <div class="market-module-desc">{{ marketModuleDescription(market) }}</div>
                              <div class="market-module-meta">
                                <span>{{ market.symbol_hint }}</span>
                                <span v-if="market.live_brokers && market.live_brokers.length">
                                  {{ marketLiveText(market) }}
                                </span>
                                <span v-else>{{ marketResearchOnlyText() }}</span>
                              </div>
                              <div v-if="market.data_sources && market.data_sources.length" class="market-data-source-list">
                                <span
                                  v-for="source in market.data_sources"
                                  :key="source.key"
                                  class="market-data-source"
                                  :class="{ configured: source.configured, missing: !source.configured && (source.required || source.recommended) }"
                                >
                                  {{ marketSourceLabel(source) }}
                                  <small>{{ sourceStatusText(source) }}</small>
                                </span>
                              </div>
                            </div>
                          </a-checkbox-group>
                        </template>
                        <template v-else-if="entry.item.type === 'venue_multiselect'">
                          <div class="trading-venue-notice" role="note">
                            <span class="trading-venue-notice-icon"><a-icon type="safety-certificate" /></span>
                            <span class="trading-venue-notice-copy">
                              <strong>{{ $t('settings.venues.title') }}</strong>
                              <small>{{ $t('settings.venues.description') }}</small>
                            </span>
                          </div>
                          <a-checkbox-group
                            v-decorator="[entry.item.key, { initialValue: getCsvListValue(activeGroupKey, entry.item.key, entry.item.default) }]"
                            class="trading-venue-selector"
                          >
                            <section v-for="group in tradingVenueGroups(entry.item)" :key="group.key" class="trading-venue-group">
                              <div class="trading-venue-group-header">
                                <h4>{{ group.title }}</h4>
                                <span class="trading-venue-group-line" />
                              </div>
                              <div class="trading-venue-grid">
                                <label v-for="venue in group.items" :key="venue.id" class="trading-venue-card">
                                  <a-checkbox :value="venue.id" />
                                  <provider-logo :provider="venue.id" :size="30" />
                                  <span class="trading-venue-copy">
                                    <strong>{{ venue.name }}</strong>
                                    <small>{{ venue.description }}</small>
                                  </span>
                                </label>
                              </div>
                            </section>
                          </a-checkbox-group>
                        </template>
                        <div class="field-default" v-if="entry.item.default && entry.item.type !== 'boolean' && entry.item.type !== 'password' && entry.item.type !== 'venue_multiselect'">
                          {{ $t('settings.default') }}: {{ entry.item.default }}
                        </div>
                      </a-form-item>
                    </a-col>
                  </a-row>
                </section>
              </div>

              <div v-else>
                <section
                  v-if="activeGroupKey === 'data_source' && reportDataSourcesLoaded"
                  class="report-source-status"
                >
                  <div class="report-source-status-head">
                    <div>
                      <strong>{{ $t('settings.research.status.title') }}</strong>
                      <p>{{ $t('settings.research.status.description') }}</p>
                    </div>
                    <a-tag color="green">{{ $t('settings.research.status.autoTier') }}</a-tag>
                  </div>
                  <div class="report-source-metrics">
                    <div class="report-source-metric">
                      <span>
                        {{ $t('settings.research.status.community') }}
                        <small>{{ $t('settings.research.status.communityHint') }}</small>
                      </span>
                      <strong>{{ reportDataSourceSummary.community.ready }} / {{ reportDataSourceSummary.community.total }}</strong>
                    </div>
                    <div class="report-source-metric">
                      <span>
                        {{ $t('settings.research.status.professional') }}
                        <small>{{ $t('settings.research.status.professionalHint') }}</small>
                      </span>
                      <strong>{{ reportDataSourceSummary.professional.ready }} / {{ reportDataSourceSummary.professional.total }}</strong>
                    </div>
                  </div>
                  <div v-if="reportDataSourceSummary.readyProviders.length" class="report-source-provider-list">
                    <a-tag
                      v-for="provider in reportDataSourceSummary.readyProviders"
                      :key="provider.key"
                      :color="provider.tier === 'professional' ? 'purple' : 'green'"
                    >
                      {{ provider.name }}
                    </a-tag>
                  </div>
                </section>
                <a-row :gutter="24" :class="{ 'market-settings-layout': activeGroupKey === 'market_modules' }">
                  <a-col
                    v-for="entry in currentDisplayEntries"
                    :key="entry.key"
                    :xs="24"
                    :sm="24"
                    :md="entry.type !== 'field' ? 24 : 12"
                    :lg="entry.type !== 'field' ? 24 : (activeGroupKey === 'market_modules' ? 24 : 12)"
                    :xl="entry.type !== 'field' ? 24 : (activeGroupKey === 'market_modules' ? (entry.item.type === 'market_multiselect' ? 13 : 11) : 12)"
                    :class="{
                      'market-modules-column': activeGroupKey === 'market_modules' && entry.type === 'field' && entry.item.type === 'market_multiselect',
                      'trading-venues-column': activeGroupKey === 'market_modules' && entry.type === 'field' && entry.item.type === 'venue_multiselect'
                    }"
                  >
                    <div v-if="entry.type === 'heading'" class="settings-subsection-heading" :class="`subsection-${entry.tone || 'default'}`">
                      <div class="settings-subsection-title-row">
                        <span><a-icon v-if="entry.icon" :type="entry.icon" /> {{ entry.title }}</span>
                        <a-tag v-if="entry.badge" :color="entry.badgeColor || 'blue'">{{ entry.badge }}</a-tag>
                      </div>
                      <small>{{ entry.description }}</small>
                    </div>
                    <div v-else-if="entry.type === 'advanced-toggle'" class="advanced-settings-toggle">
                      <a-button type="link" @click="toggleAdvanced(entry.scope)">
                        <a-icon :type="entry.expanded ? 'up' : 'down'" />
                        {{ entry.label }}
                      </a-button>
                      <small>{{ entry.description }}</small>
                    </div>
                    <a-form-item v-else>
                      <template slot="label">
                        <span class="form-label-with-tooltip">
                          <span class="label-text">{{ getItemLabel(activeGroupKey, entry.item) }}</span>
                          <a-tooltip v-if="entry.item.description" placement="top">
                            <template slot="title">
                              {{ getItemDescription(activeGroupKey, entry.item) }}
                            </template>
                            <a-icon type="question-circle" class="help-icon" />
                          </a-tooltip>
                          <a
                            v-if="entry.item.link"
                            :href="entry.item.link"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="api-link"
                            @click.stop
                          >
                            <a-icon type="link" />
                            {{ getLinkText(entry.item.link_text) }}
                          </a>
                          <a-tag v-if="entry.item.readonly" class="deployment-only-tag" color="default">
                            <a-icon type="lock" /> {{ $t('settings.billing.fixed.readonly') }}
                          </a-tag>
                        </span>
                      </template>
                      <template v-if="entry.item.type === 'text'">
                        <a-input
                          v-decorator="[entry.item.key, { initialValue: getFieldValue(activeGroupKey, entry.item.key) }]"
                          :placeholder="entry.item.default ? `${$t('settings.default')}: ${entry.item.default}` : ''"
                          :name="getSafeInputName(entry.item)"
                          :autocomplete="getAutocomplete(entry.item)"
                          data-lpignore="true"
                          data-1p-ignore="true"
                          data-bwignore="true"
                          data-form-type="other"
                          :disabled="entry.item.readonly"
                          allowClear
                        />
                      </template>
                      <template v-else-if="entry.item.type === 'password'">
                        <div class="password-field">
                          <a-input
                            v-decorator="[entry.item.key, { initialValue: getFieldValue(activeGroupKey, entry.item.key) }]"
                            type="text"
                            :class="{ 'secret-masked-input': !passwordVisible[entry.item.key] }"
                            :placeholder="getSecretPlaceholder(activeGroupKey, entry.item)"
                            :name="getSafeInputName(entry.item)"
                            :autocomplete="getAutocomplete(entry.item)"
                            spellcheck="false"
                            autocapitalize="off"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            data-bwignore="true"
                            data-form-type="other"
                            :disabled="entry.item.readonly"
                            allowClear
                          >
                            <a-icon
                              slot="suffix"
                              :type="passwordVisible[entry.item.key] ? 'eye' : 'eye-invisible'"
                              @click="togglePasswordVisible(entry.item.key)"
                              style="cursor: pointer"
                            />
                          </a-input>
                        </div>
                      </template>
                      <template v-else-if="entry.item.type === 'number'">
                        <a-input-number
                          v-decorator="[entry.item.key, { initialValue: getNumberValue(activeGroupKey, entry.item.key, entry.item.default) }]"
                          :placeholder="entry.item.default ? `${$t('settings.default')}: ${entry.item.default}` : ''"
                          :disabled="entry.item.readonly"
                          style="width: 100%"
                        />
                      </template>
                      <template v-else-if="entry.item.type === 'boolean'">
                        <a-switch
                          v-decorator="[entry.item.key, { valuePropName: 'checked', initialValue: getBoolValue(activeGroupKey, entry.item.key, entry.item.default) }]"
                          :disabled="entry.item.readonly"
                        />
                      </template>
                      <template v-else-if="entry.item.type === 'select'">
                        <a-select
                          v-decorator="[entry.item.key, { initialValue: getFieldValue(activeGroupKey, entry.item.key) || entry.item.default }]"
                          :placeholder="entry.item.default ? `${$t('settings.default')}: ${entry.item.default}` : $t('settings.pleaseSelect')"
                          :disabled="entry.item.readonly"
                          @change="onSelectFieldChange(entry.item, $event)"
                        >
                          <a-select-option
                            v-for="opt in getSelectOptions(entry.item)"
                            :key="opt.value"
                            :value="opt.value"
                          >
                            {{ opt.label }}
                          </a-select-option>
                        </a-select>
                      </template>
                      <template v-else-if="entry.item.type === 'market_multiselect'">
                        <a-checkbox-group
                          v-decorator="[entry.item.key, { initialValue: getCsvListValue(activeGroupKey, entry.item.key, entry.item.default) }]"
                          class="market-module-grid"
                        >
                          <div
                            v-for="market in getMarketModuleRows(entry.item)"
                            :key="market.key"
                            class="market-module-row"
                          >
                            <div class="market-module-main">
                              <a-checkbox :value="market.key">
                                <span class="market-module-label">{{ marketModuleLabel(market) }}</span>
                              </a-checkbox>
                              <a-tag :color="marketStatusColor(market.status)">
                                {{ marketStatusText(market.status) }}
                              </a-tag>
                            </div>
                            <div class="market-module-desc">{{ marketModuleDescription(market) }}</div>
                            <div class="market-module-meta">
                              <span>{{ market.symbol_hint }}</span>
                              <span v-if="market.live_brokers && market.live_brokers.length">
                                {{ marketLiveText(market) }}
                              </span>
                              <span v-else>{{ marketResearchOnlyText() }}</span>
                            </div>
                            <div v-if="market.data_sources && market.data_sources.length" class="market-data-source-list">
                              <span
                                v-for="source in market.data_sources"
                                :key="source.key"
                                class="market-data-source"
                                :class="{ configured: source.configured, missing: !source.configured && (source.required || source.recommended) }"
                              >
                                {{ marketSourceLabel(source) }}
                                <small>{{ sourceStatusText(source) }}</small>
                              </span>
                            </div>
                          </div>
                        </a-checkbox-group>
                      </template>
                      <template v-else-if="entry.item.type === 'venue_multiselect'">
                        <div class="trading-venue-notice" role="note">
                          <span class="trading-venue-notice-icon"><a-icon type="safety-certificate" /></span>
                          <span class="trading-venue-notice-copy">
                            <strong>{{ $t('settings.venues.title') }}</strong>
                            <small>{{ $t('settings.venues.description') }}</small>
                          </span>
                        </div>
                        <a-checkbox-group
                          v-decorator="[entry.item.key, { initialValue: getCsvListValue(activeGroupKey, entry.item.key, entry.item.default) }]"
                          class="trading-venue-selector"
                        >
                          <section v-for="group in tradingVenueGroups(entry.item)" :key="group.key" class="trading-venue-group">
                            <div class="trading-venue-group-header">
                              <h4>{{ group.title }}</h4>
                              <span class="trading-venue-group-line" />
                            </div>
                            <div class="trading-venue-grid">
                              <label v-for="venue in group.items" :key="venue.id" class="trading-venue-card">
                                <a-checkbox :value="venue.id" />
                                <provider-logo :provider="venue.id" :size="30" />
                                <span class="trading-venue-copy">
                                  <strong>{{ venue.name }}</strong>
                                  <small>{{ venue.description }}</small>
                                </span>
                              </label>
                            </div>
                          </section>
                        </a-checkbox-group>
                      </template>
                      <div class="field-default" v-if="entry.item.default && entry.item.type !== 'boolean' && entry.item.type !== 'password' && entry.item.type !== 'venue_multiselect'">
                        {{ $t('settings.default') }}: {{ entry.item.default }}
                      </div>
                    </a-form-item>
                  </a-col>
                </a-row>
              </div>
            </a-form>

            <section v-if="activeGroupKey === 'brand'" class="commercial-license-notice">
              <a-icon type="safety-certificate" class="license-icon" />
              <div class="license-body">
                <strong>{{ $t('settings.commercialLicense.title') }}</strong>
                <p>{{ $t('settings.commercialLicense.body') }}</p>
                <a
                  href="https://www.quantdinger.com/#license"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="contact-link"
                >
                  <a-icon type="link" /> {{ $t('settings.commercialLicense.applyLink') }}
                </a>
              </div>
            </section>
          </div>
        </section>
      </div>
    </a-spin>

    <div v-if="activeGroupKey !== 'market_catalog'" class="settings-footer">
      <a-button @click="handleReset" :disabled="saving">
        <a-icon type="undo" />
        {{ $t('settings.reset') }}
      </a-button>
      <a-button type="primary" @click="handleSave" :loading="saving">
        <a-icon type="save" />
        {{ $t('settings.save') }}
      </a-button>
    </div>

    <a-modal
      v-model="systemUniverseEditorVisible"
      :title="editingSystemUniverseId ? $t('settings.universeSync.editTitle') : $t('settings.universeSync.addTitle')"
      :confirm-loading="systemUniverseSaving"
      :ok-text="$t('settings.universeSync.save')"
      :cancel-text="$t('settings.universeSync.cancel')"
      width="680px"
      @ok="saveSystemUniverse"
      @cancel="resetSystemUniverseEditor"
    >
      <div class="system-universe-form">
        <div class="system-universe-form-grid">
          <label>
            <span>{{ $t('settings.universeSync.name') }}</span>
            <a-input v-model="systemUniverseForm.name" :max-length="160" />
          </label>
          <label>
            <span>{{ $t('settings.universeSync.code') }}</span>
            <a-input v-model="systemUniverseForm.code" :disabled="Boolean(editingSystemUniverseId)" :max-length="80" />
          </label>
          <label>
            <span>{{ $t('settings.universeSync.market') }}</span>
            <a-select v-model="systemUniverseForm.market">
              <a-select-option v-for="market in systemUniverseMarkets" :key="market" :value="market">
                {{ $t(`universeManager.market.${market}`) }}
              </a-select-option>
            </a-select>
          </label>
          <label>
            <span>{{ $t('settings.universeSync.type') }}</span>
            <a-select v-model="systemUniverseForm.universeType">
              <a-select-option v-for="type in systemUniverseTypes" :key="type" :value="type">
                {{ $t(`settings.universeSync.type.${type}`) }}
              </a-select-option>
            </a-select>
          </label>
          <label>
            <span>{{ $t('settings.universeSync.memberEffectiveFrom') }}</span>
            <a-date-picker
              v-model="systemUniverseForm.historyFrom"
              :allow-clear="false"
              :disabled-date="disabledUniverseHistoryDate"
            />
          </label>
        </div>
        <label class="system-universe-members-field">
          <span>
            {{ $t('settings.universeSync.memberSymbols') }}
            <small>{{ systemUniverseMemberCount.toLocaleString() }} / {{ systemUniverseMemberLimit.toLocaleString() }}</small>
          </span>
          <a-textarea
            v-model="systemUniverseForm.memberText"
            :rows="12"
            :placeholder="$t('settings.universeSync.memberPlaceholder')"
          />
        </label>
        <p class="system-universe-form-hint">{{ $t('settings.universeSync.memberHint') }}</p>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { getSettingsSchema, getSettingsValues, saveSettings, getOpenRouterBalance, getMarketCatalogOverview, syncMarketCatalog } from '@/api/settings'
import { getMarketModules } from '@/api/marketModules'
import { getProfessionalReportDataSources } from '@/api/fast-analysis'
import {
  createSystemUniverse,
  deleteSystemUniverse,
  getSystemUniverseOverview,
  getUniverseMembers,
  setSystemUniverseVisibility,
  syncSystemUniverses,
  updateSystemUniverse
} from '@/api/universe'
import { deleteAdminMembershipPlan, getAdminMembershipPlans, saveAdminMembershipPlans } from '@/api/billing'
import { baseMixin } from '@/store/app-mixin'
import FundamentalSyncPanel from './FundamentalSyncPanel.vue'
import ProviderLogo from '@/components/ProviderLogo/ProviderLogo.vue'
import moment from 'moment'

export default {
  name: 'Settings',
  components: { FundamentalSyncPanel, ProviderLogo },
  mixins: [baseMixin],
  data () {
    return {
      loading: false,
      saving: false,
      schema: {},
      values: {},
      // The vertically-listed group currently selected in the left nav.
      // Defaults to the first group in ``sortedSchema`` once data arrives.
      activeGroupKey: '',
      // Free-text search across every group / item. Non-empty value switches
      // the right-side detail pane into "search results" mode.
      searchKeyword: '',
      passwordVisible: {},
      marketModules: [],
      reportDataSources: [],
      reportDataSourcesLoaded: false,
      showRestartTip: false,
      balanceLoading: false,
      openrouterBalance: null,
      catalogLoading: false,
      catalogSyncing: false,
      catalogOverview: null,
      catalogPollTimer: null,
      universeLoading: false,
      universeSyncing: false,
      universeOverview: null,
      selectedUniverseCodes: [],
      universeHistoryFrom: moment().subtract(3, 'years').startOf('year'),
      systemUniverseEditorVisible: false,
      systemUniverseSaving: false,
      editingSystemUniverseId: 0,
      universeVisibilityId: 0,
      universeDeletingId: 0,
      systemUniverseMarkets: ['USStock', 'HKStock', 'CNStock', 'Crypto'],
      systemUniverseTypes: ['index', 'etf', 'market_cap', 'market', 'industry', 'manual'],
      systemUniverseForm: {
        name: '',
        code: '',
        market: 'USStock',
        universeType: 'index',
        historyFrom: moment().subtract(3, 'years').startOf('year'),
        memberText: ''
      },
      selectedLlmProvider: '',
      selectedSearchProvider: 'tavily',
      jevEnabled: true,
      ensembleEnabled: false,
      referralProgramEnabled: false,
      billingPlans: [],
      billingPlansSaving: false,
      billingPlanDeletingCode: '',
      advancedExpanded: {},
      settingsInputNonce: Math.random().toString(36).slice(2, 10)
    }
  },
  computed: {
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    sortedSchema () {
      const entries = Object.entries({
        ...this.schema,
        market_catalog: {
          title: this.$t('settings.group.market_catalog'),
          icon: 'database',
          order: 4,
          items: []
        }
      })
      entries.sort((a, b) => {
        const orderA = a[1].order || 999
        const orderB = b[1].order || 999
        return orderA - orderB
      })
      const sorted = {}
      for (const [key, value] of entries) {
        sorted[key] = value
      }
      return sorted
    },
    navSections () {
      const definitions = [
        {
          key: 'core',
          title: this.tOr('settings.nav.core', 'Core setup'),
          keys: ['features', 'auth', 'ai', 'trading', 'market_modules', 'market_catalog']
        },
        {
          key: 'research',
          title: this.tOr('settings.nav.research', 'AI research'),
          keys: ['data_source', 'macro_tools', 'market_intelligence', 'search', 'agent']
        },
        {
          key: 'operations',
          title: this.tOr('settings.nav.operations', 'Operations'),
          keys: ['email', 'sms', 'network', 'security', 'strategy_runtime']
        },
        {
          key: 'organization',
          title: this.tOr('settings.nav.organization', 'Organization'),
          keys: ['billing', 'brand', 'contact', 'social', 'legal']
        }
      ]
      const claimed = new Set()
      const sections = definitions.map(section => {
        const groups = section.keys
          .filter(key => this.sortedSchema[key])
          .map(key => {
            claimed.add(key)
            return { key, group: this.sortedSchema[key] }
          })
        return { ...section, groups }
      }).filter(section => section.groups.length)
      const remaining = Object.keys(this.sortedSchema)
        .filter(key => !claimed.has(key))
        .map(key => ({ key, group: this.sortedSchema[key] }))
      if (remaining.length) {
        sections.push({
          key: 'other',
          title: this.tOr('settings.nav.operations', 'Operations'),
          groups: remaining
        })
      }
      return sections
    },
    // Currently selected group object (right-side detail content).
    currentGroup () {
      return this.sortedSchema[this.activeGroupKey] || null
    },
    currentDisplayEntries () {
      let items = this.currentGroup && Array.isArray(this.currentGroup.items)
        ? this.currentGroup.items
        : []
      if (this.activeGroupKey === 'billing') {
        const referralKeys = new Set([
          'REFERRAL_PROGRAM_ENABLED',
          'REFERRAL_REWARD_RATES',
          'REFERRAL_REWARD_HOLD_DAYS',
          'REFERRAL_MIN_WITHDRAWAL_USD'
        ])
        const fixedTokenIdentifierKeys = new Set([
          'USDT_TRC20_CONTRACT',
          'USDT_BEP20_CONTRACT',
          'USDT_ERC20_CONTRACT',
          'USDT_SOL_MINT',
          'USDC_ERC20_CONTRACT',
          'USDC_SOL_MINT'
        ])
        items = items.filter(item => !referralKeys.has(item.key) && !fixedTokenIdentifierKeys.has(item.key))
        return this.buildCategorizedEntries(items, this.billingSectionDefinitions(), 'billing')
      }
      if (this.activeGroupKey === 'brand') {
        return items.map(item => ({
          type: 'field',
          key: `brand-${item.key}`,
          item
        }))
      }
      if (this.activeGroupKey === 'data_source') {
        return this.buildCategorizedEntries(items, this.dataSourceSectionDefinitions(), 'data_source')
      }
      if (this.activeGroupKey === 'macro_tools') {
        return this.buildCategorizedEntries(items, this.macroToolSectionDefinitions(), 'macro_tools')
      }
      if (this.activeGroupKey === 'market_intelligence') {
        return items.map(item => ({
          type: 'field',
          key: `market-intelligence-${item.key}`,
          item
        }))
      }
      if (this.activeGroupKey === 'search') {
        return this.buildCategorizedEntries(items, this.searchSectionDefinitions(), 'search')
      }
      if (this.activeGroupKey === 'agent') {
        return this.buildCategorizedEntries(items, this.agentSectionDefinitions(), 'agent')
      }
      if (this.activeGroupKey === 'trading') {
        return this.buildCategorizedEntries(items, this.tradingSectionDefinitions(), 'trading')
      }
      if (this.activeGroupKey === 'security') {
        return this.buildCategorizedEntries(items, this.securitySectionDefinitions(), 'security')
      }
      return this.buildSettingEntries(items, this.activeGroupKey)
    },
    reportDataSourceSummary () {
      const active = this.reportDataSources.filter(source => source.integration_status === 'active')
      const summarize = tier => {
        const sources = active.filter(source => source.tier === tier)
        return {
          total: sources.length,
          ready: sources.filter(source => source.configured).length
        }
      }
      return {
        community: summarize('community'),
        professional: summarize('professional'),
        readyProviders: active.filter(source => source.configured)
      }
    },
    // Flattened, filtered search hits. Match is case-insensitive against the
    // localized label, the localized description and the raw ENV key, so
    // operators can search by either UI text or .env name.
    searchResults () {
      const kw = this.searchKeyword.trim().toLowerCase()
      if (!kw) return []
      const out = []
      for (const [groupKey, group] of Object.entries(this.sortedSchema)) {
        for (const item of (group.items || [])) {
          const label = (this.getItemLabel(groupKey, item) || '').toLowerCase()
          const desc = (this.getItemDescription(groupKey, item) || '').toLowerCase()
          const key = (item.key || '').toLowerCase()
          if (label.includes(kw) || desc.includes(kw) || key.includes(kw)) {
            out.push({ groupKey, groupTitle: group.title, item })
          }
        }
      }
      return out
    },
    // Localized strings — $t returns the key itself when missing, so we
    // detect that explicitly to fall back to English.
    searchPlaceholder () {
      const k = 'settings.search.placeholder'
      const t = this.$t(k)
      return (t && t !== k) ? t : 'Search settings…'
    },
    searchResultsTitle () {
      const k = 'settings.search.results'
      const t = this.$t(k)
      const tpl = (t && t !== k) ? t : 'Search results ({count})'
      return tpl.replace('{count}', String(this.searchResults.length))
    },
    emptySearchLabel () {
      const k = 'settings.search.empty'
      const t = this.$t(k)
      return (t && t !== k) ? t : 'No matching settings'
    },
    aiItems () {
      return (this.currentGroup && Array.isArray(this.currentGroup.items)) ? this.currentGroup.items : []
    },
    currentLlmProvider () {
      return this.selectedLlmProvider || this.getFieldValue('ai', 'LLM_PROVIDER') || 'openrouter'
    },
    currentLlmProviderLabel () {
      const providerItem = this.aiItems.find(item => item.key === 'LLM_PROVIDER')
      const option = this.getSelectOptions(providerItem).find(opt => opt.value === this.currentLlmProvider)
      return option ? option.label : this.currentLlmProvider
    },
    catalogLatest () {
      return this.catalogOverview && this.catalogOverview.latest_sync
    },
    catalogRunning () {
      return Boolean(this.catalogLatest && this.catalogLatest.status === 'running')
    },
    catalogMarkets () {
      return (this.catalogOverview && this.catalogOverview.markets) || []
    },
    systemUniverseRows () {
      return (this.universeOverview && this.universeOverview.universes) || []
    },
    syncableUniverseCodes () {
      return (this.universeOverview && this.universeOverview.syncable_codes) || []
    },
    universeExecutionLimits () {
      const limits = (this.universeOverview && this.universeOverview.execution_limits) || {}
      return {
        standard: Number(limits.standard || 600).toLocaleString(),
        daily: Number(limits.daily || 1200).toLocaleString()
      }
    },
    systemUniverseMemberCount () {
      return this.parseSystemUniverseMemberText(this.systemUniverseForm.memberText).length
    },
    systemUniverseMemberLimit () {
      return Number(this.universeExecutionLimits.daily || 1200)
    },
    catalogStatusType () {
      const status = this.catalogLatest && this.catalogLatest.status
      if (status === 'success') return 'success'
      if (status === 'running') return 'info'
      if (status === 'partial') return 'warning'
      if (status === 'failed') return 'error'
      return 'neutral'
    },
    catalogStatusIcon () {
      const icons = {
        success: 'check-circle',
        running: 'sync',
        partial: 'warning',
        failed: 'close-circle'
      }
      return icons[(this.catalogLatest && this.catalogLatest.status) || 'never'] || 'clock-circle'
    },
    catalogSyncSummary () {
      const result = (this.catalogLatest && this.catalogLatest.result) || {}
      const total = Number(result.contexts_total || 0)
      const success = Number(result.contexts_succeeded || 0)
      return {
        success,
        total,
        failed: Math.max(total - success, 0),
        rows: Number(result.upserted || 0)
      }
    },
    catalogStatusLabel () {
      const status = (this.catalogLatest && this.catalogLatest.status) || 'never'
      return this.$t(`settings.marketCatalog.status.${status}`)
    },
    catalogStatusDescription () {
      if (!this.catalogLatest) return ''
      const result = this.catalogLatest.result || {}
      if (this.catalogLatest.status === 'running') return this.$t('settings.marketCatalog.runningDescription')
      return this.formatMessage('settings.marketCatalog.resultDescription', '', {
        success: String(result.contexts_succeeded || 0),
        total: String(result.contexts_total || 0),
        rows: Number(result.upserted || 0).toLocaleString(),
        time: this.formatCatalogTime(this.catalogLatest.finished_at)
      })
    },
    catalogVenueRows () {
      const labels = { binance: 'Binance', bitget: 'Bitget', bybit: 'Bybit', okx: 'OKX', gate: 'Gate.io', htx: 'HTX' }
      const coverage = {}
      for (const row of ((this.catalogOverview && this.catalogOverview.venues) || [])) {
        const key = String(row.exchange || '').toLowerCase()
        if (!coverage[key]) {
          coverage[key] = { ordinarySpot: 0, ordinarySwap: 0, tokenizedEquity: 0, directEquity: 0, stockPerpetual: 0 }
        }
        coverage[key].ordinarySpot += Number(row.ordinary_spot || 0)
        coverage[key].ordinarySwap += Number(row.ordinary_swap || 0)
        coverage[key].tokenizedEquity += Number(row.tokenized_equity || 0)
        coverage[key].directEquity += Number(row.direct_equity || 0)
        coverage[key].stockPerpetual += Number(row.stock_perpetual || 0)
      }
      const contexts = ((this.catalogLatest && this.catalogLatest.result && this.catalogLatest.result.contexts) || [])
      return Object.keys(labels).map(exchange => {
        const attempts = contexts.filter(item => item.exchange === exchange)
        const successCount = attempts.filter(item => item.ok).length
        let status = 'never'
        if (this.catalogRunning) status = 'running'
        else if (attempts.length && successCount === attempts.length) status = 'success'
        else if (successCount > 0) status = 'partial'
        else if (attempts.length) status = 'failed'
        const colors = { success: 'green', partial: 'orange', failed: 'red', running: 'blue', never: 'default' }
        return {
          exchange,
          label: labels[exchange],
          ordinarySpot: Number((coverage[exchange] && coverage[exchange].ordinarySpot) || 0).toLocaleString(),
          ordinarySwap: Number((coverage[exchange] && coverage[exchange].ordinarySwap) || 0).toLocaleString(),
          tokenizedEquity: Number((coverage[exchange] && coverage[exchange].tokenizedEquity) || 0).toLocaleString(),
          directEquity: Number((coverage[exchange] && coverage[exchange].directEquity) || 0).toLocaleString(),
          stockPerpetual: Number((coverage[exchange] && coverage[exchange].stockPerpetual) || 0).toLocaleString(),
          statusColor: colors[status],
          statusLabel: this.$t(`settings.marketCatalog.status.${status}`)
        }
      })
    },
    catalogFailures () {
      const contexts = ((this.catalogLatest && this.catalogLatest.result && this.catalogLatest.result.contexts) || [])
      return contexts.filter(item => !item.ok)
    },
    aiProviderAlertDesc () {
      return this.$t('settings.llm.currentProviderDesc')
    },
    aiSections () {
      const providerSelection = this.aiItems.filter(item => item.key === 'LLM_PROVIDER')
      const providerItems = this.aiItems.filter(item => item.group === this.currentLlmProvider)
      const jevSwitch = this.aiItems.find(item => item.key === 'JEV_ENABLED')
      const ensembleSwitch = this.aiItems.find(item => item.key === 'ENABLE_AI_ENSEMBLE')
      const decisionItems = this.aiItems.filter(item => (
        (String(item.key || '').startsWith('JEV_') && item.key !== 'JEV_ENABLED') ||
        item.key === 'AI_DECISION_TIMEOUT_SECONDS'
      ))
      const codeItems = this.aiItems.filter(item => ['AI_CODE_GEN_MODEL', 'OPENROUTER_TEMPERATURE'].includes(item.key))
      const analysisItems = this.aiItems.filter(item => item.key === 'AI_ANALYSIS_CONSENSUS_TIMEFRAMES')
      const ensembleItems = this.ensembleEnabled
        ? this.aiItems.filter(item => item.key === 'AI_ENSEMBLE_MODELS')
        : []
      const runtimeItems = this.aiItems.filter(item => item.key === 'LLM_MAX_TOKENS')
      return [
        {
          key: 'provider',
          title: this.tOr('settings.llm.providerSection', 'Model provider'),
          description: this.tOr('settings.llm.providerSectionDesc', 'Choose the LLM provider used by analysis, code generation, and strategy review.'),
          items: providerSelection
        },
        {
          key: 'activeProvider',
          title: this.tOr('settings.llm.activeProviderSection', 'Provider credentials'),
          description: this.tOr('settings.llm.activeProviderSectionDesc', 'Fill only the key, model, and endpoint for the selected provider.'),
          badge: this.currentLlmProviderLabel,
          badgeColor: 'geekblue',
          items: providerItems
        },
        {
          key: 'jev',
          title: this.$t('aiDecisionFilter.title'),
          description: this.$t('settings.desc.JEV_ENABLED'),
          badge: this.jevEnabled
            ? this.$t('settings.llm.jevEnabledBadge')
            : this.$t('settings.llm.jevDisabledBadge'),
          badgeColor: this.jevEnabled ? 'cyan' : 'blue',
          switchItem: jevSwitch,
          items: decisionItems
        },
        {
          key: 'codeGeneration',
          title: this.$t('settings.llm.codeSection'),
          description: this.$t('settings.llm.codeSectionDesc'),
          items: codeItems
        },
        {
          key: 'analysis',
          title: this.$t('settings.llm.analysisSection'),
          description: this.$t('settings.llm.analysisSectionDesc'),
          items: analysisItems
        },
        {
          key: 'ensemble',
          title: this.$t('settings.agent.section.quality'),
          description: this.$t('settings.agent.section.qualityDesc'),
          badge: this.$t('settings.research.badge.optional'),
          badgeColor: 'purple',
          switchItem: ensembleSwitch,
          items: ensembleItems
        },
        {
          key: 'runtime',
          title: this.$t('settings.llm.runtimeSection'),
          description: this.$t('settings.llm.runtimeSectionDesc'),
          items: runtimeItems
        }
      ]
        .filter(section => section.items.length > 0 || section.switchItem)
        .map(section => ({
          ...section,
          entries: this.buildSettingEntries(section.items, `ai:${section.key}`)
        }))
    }
  },
  beforeCreate () {
    this.form = this.$form.createForm(this)
  },
  mounted () {
    this.loadSettings()
    this.loadBillingPlanCatalog()
    this.refreshCatalogOverview()
    this.refreshUniverseOverview()
  },
  beforeDestroy () {
    this.stopCatalogPolling()
  },
  watch: {
    '$route.query.section' () {
      this.applyRouteSection()
    },
    '$route.query.group' () {
      this.applyRouteSection()
    }
  },
  methods: {
    normalizeBillingPlan (plan = {}) {
      return {
        _key: `${plan.code || 'new'}-${Date.now()}-${Math.random()}`,
        persisted: !!plan.code,
        code: plan.code || '',
        name: plan.name || '',
        description: plan.description || '',
        price_usd: Number(plan.price_usd || 0),
        duration_days: Number(plan.duration_days || 0),
        credits_once: Number(plan.credits_once || 0),
        credits_monthly: Number(plan.credits_monthly || 0),
        strategy_limit: Math.max(1, Number(plan.strategy_limit || 10)),
        referral_eligible: !!plan.referral_eligible,
        is_lifetime: !!plan.is_lifetime,
        is_active: plan.is_active !== false,
        is_popular: !!plan.is_popular,
        sort_order: Number(plan.sort_order || 0),
        stripe_price_id: plan.stripe_price_id || ''
      }
    },
    async loadBillingPlanCatalog () {
      try {
        const res = await getAdminMembershipPlans()
        if (res && res.code === 1) {
          this.billingPlans = Object.values(res.data || {})
            .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
            .map(plan => this.normalizeBillingPlan(plan))
        }
      } catch (error) {
        // Settings remain usable even when an older backend has no plan API.
      }
    },
    addBillingPlan () {
      const usedCodes = new Set(this.billingPlans.map(plan => String(plan.code || '').trim().toLowerCase()))
      let suffix = this.billingPlans.length + 1
      while (usedCodes.has(`plan_${suffix}`)) suffix += 1
      const draft = this.normalizeBillingPlan({
        code: `plan_${suffix}`,
        duration_days: 30,
        sort_order: 0,
        is_active: true
      })
      draft.persisted = false
      // Put the new row where the user can see it immediately. Previously it
      // was appended below a wide table and looked as if the button did nothing.
      this.billingPlans.unshift(draft)
      this.$nextTick(() => {
        const input = this.$refs[`billingPlanCode-${draft._key}`]
        const target = Array.isArray(input) ? input[0] : input
        if (target && typeof target.focus === 'function') target.focus()
      })
    },
    removeBillingPlan (index) {
      const plan = this.billingPlans[index]
      if (!plan) return
      if (!plan.persisted) {
        this.billingPlans.splice(index, 1)
        return
      }
      this.$confirm({
        title: this.$t('settings.billingPlans.deleteConfirmTitle'),
        content: this.$t('settings.billingPlans.deleteConfirmContent', { name: plan.name || plan.code }),
        okText: this.$t('settings.billingPlans.delete'),
        cancelText: this.$t('common.cancel'),
        okType: 'danger',
        onOk: async () => {
          this.billingPlanDeletingCode = plan.code
          try {
            const res = await deleteAdminMembershipPlan(plan.code)
            if (res && res.code === 1) {
              this.billingPlans.splice(index, 1)
              this.$message.success(this.$t('settings.billingPlans.deleted'))
            } else {
              this.$message.error(this.getPlanDeleteErrorMessage(res && res.msg))
            }
          } catch (error) {
            const message = error && error.response && error.response.data && error.response.data.msg
            this.$message.error(this.getPlanDeleteErrorMessage(message))
          } finally {
            this.billingPlanDeletingCode = ''
          }
        }
      })
    },
    getPlanDeleteErrorMessage (code) {
      if (code === 'cannot_delete_last_active_plan') {
        return this.$t('settings.billingPlans.cannotDeleteLastActive')
      }
      if (code === 'plan_not_found') {
        return this.$t('settings.billingPlans.planNotFound')
      }
      return this.$t('settings.billingPlans.deleteFailed')
    },
    limitReferralRewardRates (event) {
      const value = event && event.target ? event.target.value : event
      const tokens = String(value || '').split(/[,，;；\s]+/)
      if (tokens.filter(Boolean).length <= 3) return
      this.$nextTick(() => {
        this.form.setFieldsValue({
          REFERRAL_REWARD_RATES: tokens.filter(Boolean).slice(0, 3).join(',')
        })
      })
    },
    validateReferralRewardRates (rule, value, callback) {
      const tokens = String(value || '')
        .split(/[,，;；\s]+/)
        .map(item => item.trim())
        .filter(Boolean)
      if (!tokens.length) {
        callback(new Error(this.$t('settings.referralActivity.ratesRequired')))
        return
      }
      if (tokens.length > 3) {
        callback(new Error(this.$t('settings.referralActivity.ratesTooMany')))
        return
      }
      const values = tokens.map(item => Number(item.replace('%', '')))
      if (values.some(item => !Number.isFinite(item) || item < 0 || item > 100)) {
        callback(new Error(this.$t('settings.referralActivity.ratesOutOfRange')))
        return
      }
      if (values.reduce((total, item) => total + item, 0) > 100) {
        callback(new Error(this.$t('settings.referralActivity.ratesTotalExceeded')))
        return
      }
      callback()
    },
    async saveBillingPlanCatalog () {
      this.billingPlansSaving = true
      try {
        const payload = this.billingPlans.map((plan, index) => ({
          ...plan,
          code: String(plan.code || '').trim().toLowerCase(),
          name: String(plan.name || '').trim(),
          sort_order: index * 10
        }))
        const res = await saveAdminMembershipPlans(payload)
        if (res && res.code === 1) {
          this.$message.success(this.tOr('settings.billingPlans.saved', 'Membership plans saved'))
          await this.loadBillingPlanCatalog()
        } else {
          this.$message.error((res && res.msg) || this.tOr('settings.saveFailed', 'Save failed'))
        }
      } catch (error) {
        const message = error && error.response && error.response.data && error.response.data.msg
        this.$message.error(message || this.tOr('settings.saveFailed', 'Save failed'))
      } finally {
        this.billingPlansSaving = false
      }
    },
    universeAdminLabel (item) {
      const key = item && item.name_i18n_key
      const translated = key ? this.$t(key) : ''
      return translated && translated !== key ? translated : (item.name || item.code)
    },
    universeSnapshotDate (item) {
      return (item.metadata && item.metadata.snapshot_as_of) || (item.updated_at ? String(item.updated_at).slice(0, 10) : '-')
    },
    universeHistoryLabel (item) {
      const historyMode = item && item.metadata && item.metadata.history_mode
      if (historyMode === 'fixed_current_constituents' && item.history_from) {
        return this.$t('settings.universeSync.fixedCurrentHistory', { date: item.history_from })
      }
      if (!item || !item.history_sync_supported) return this.$t('settings.universeSync.currentSnapshotOnly')
      return item.history_from || '-'
    },
    universeCapacityColor (item) {
      const limits = (this.universeOverview && this.universeOverview.execution_limits) || {}
      const memberCount = Number(item.member_count || 0)
      if (memberCount === 0) return 'orange'
      const dailyEligible = typeof item.daily_frequency_eligible === 'boolean'
        ? item.daily_frequency_eligible
        : memberCount <= Number(limits.daily || 1200)
      const standardEligible = typeof item.standard_frequency_eligible === 'boolean'
        ? item.standard_frequency_eligible
        : memberCount <= Number(limits.standard || 600)
      if (!dailyEligible) return 'red'
      if (!standardEligible) return 'orange'
      return item.status === 'active' ? 'green' : 'orange'
    },
    universeCapacityLabel (item) {
      const limits = (this.universeOverview && this.universeOverview.execution_limits) || {}
      const memberCount = Number(item.member_count || 0)
      if (memberCount === 0) return this.$t('settings.universeSync.pendingSync')
      const dailyEligible = typeof item.daily_frequency_eligible === 'boolean'
        ? item.daily_frequency_eligible
        : memberCount <= Number(limits.daily || 1200)
      const standardEligible = typeof item.standard_frequency_eligible === 'boolean'
        ? item.standard_frequency_eligible
        : memberCount <= Number(limits.standard || 600)
      if (!dailyEligible) return this.$t('settings.universeSync.overCapacity')
      if (!standardEligible) return this.$t('settings.universeSync.dailyOnly')
      return this.$t('settings.universeSync.ready')
    },
    disabledUniverseHistoryDate (current) {
      return current && current.endOf('day').isAfter(moment().endOf('day'))
    },
    parseSystemUniverseMemberText (value) {
      const seen = new Set()
      return String(value || '')
        .split(/[\n,;]+/)
        .map(symbol => symbol.trim())
        .filter(symbol => {
          const key = symbol.toUpperCase()
          if (!symbol || seen.has(key)) return false
          seen.add(key)
          return true
        })
    },
    resetSystemUniverseEditor () {
      this.editingSystemUniverseId = 0
      this.systemUniverseForm = {
        name: '',
        code: '',
        market: 'USStock',
        universeType: 'index',
        historyFrom: this.universeHistoryFrom ? this.universeHistoryFrom.clone() : moment().subtract(3, 'years').startOf('year'),
        memberText: ''
      }
    },
    openSystemUniverseCreate () {
      this.resetSystemUniverseEditor()
      this.systemUniverseEditorVisible = true
    },
    async openSystemUniverseEdit (item) {
      this.universeLoading = true
      try {
        const res = await getUniverseMembers(item.id)
        const payload = (res && res.data) || {}
        this.editingSystemUniverseId = item.id
        this.systemUniverseForm = {
          name: item.name || item.code,
          code: item.code,
          market: item.market,
          universeType: item.universe_type || 'manual',
          historyFrom: moment(item.history_from || moment().format('YYYY-MM-DD')),
          memberText: (payload.members || []).map(member => member.symbol).join('\n')
        }
        this.systemUniverseEditorVisible = true
      } catch (error) {
        this.$message.error((error && error.backendMessage) || this.$t('settings.universeSync.memberLoadFailed'))
      } finally {
        this.universeLoading = false
      }
    },
    async saveSystemUniverse () {
      const name = this.systemUniverseForm.name.trim()
      const code = this.systemUniverseForm.code.trim()
      const symbols = this.parseSystemUniverseMemberText(this.systemUniverseForm.memberText)
      if (!name || (!this.editingSystemUniverseId && !code) || !symbols.length) {
        this.$message.warning(this.$t('settings.universeSync.requiredFields'))
        return
      }
      if (symbols.length > this.systemUniverseMemberLimit) {
        this.$message.warning(this.$t('settings.universeSync.memberLimit', { limit: this.systemUniverseMemberLimit.toLocaleString() }))
        return
      }
      const data = {
        name,
        code,
        market: this.systemUniverseForm.market,
        universeType: this.systemUniverseForm.universeType,
        historyFrom: this.systemUniverseForm.historyFrom.format('YYYY-MM-DD'),
        members: symbols.map(symbol => ({ market: this.systemUniverseForm.market, symbol }))
      }
      this.systemUniverseSaving = true
      try {
        if (this.editingSystemUniverseId) await updateSystemUniverse(this.editingSystemUniverseId, data)
        else await createSystemUniverse(data)
        this.$message.success(this.$t('settings.universeSync.saved'))
        this.systemUniverseEditorVisible = false
        this.resetSystemUniverseEditor()
        await this.refreshUniverseOverview()
      } catch (error) {
        this.$message.error((error && error.backendMessage) || this.$t('settings.universeSync.saveFailed'))
      } finally {
        this.systemUniverseSaving = false
      }
    },
    async toggleSystemUniverseVisibility (item) {
      this.universeVisibilityId = item.id
      try {
        const visible = item.status === 'hidden'
        await setSystemUniverseVisibility(item.id, visible)
        this.selectedUniverseCodes = this.selectedUniverseCodes.filter(code => code !== item.code)
        this.$message.success(this.$t(visible ? 'settings.universeSync.shown' : 'settings.universeSync.hiddenSuccess'))
        await this.refreshUniverseOverview()
      } catch (error) {
        this.$message.error((error && error.backendMessage) || this.$t('settings.universeSync.visibilityFailed'))
      } finally {
        this.universeVisibilityId = 0
      }
    },
    async removeSystemUniverse (item) {
      this.universeDeletingId = item.id
      try {
        await deleteSystemUniverse(item.id)
        this.selectedUniverseCodes = this.selectedUniverseCodes.filter(code => code !== item.code)
        this.$message.success(this.$t('settings.universeSync.deleted'))
        await this.refreshUniverseOverview()
      } catch (error) {
        this.$message.error((error && error.backendMessage) || this.$t('settings.universeSync.deleteFailed'))
      } finally {
        this.universeDeletingId = 0
      }
    },
    async refreshUniverseOverview () {
      this.universeLoading = !this.universeOverview
      try {
        const res = await getSystemUniverseOverview()
        if (res.code === 1) {
          this.universeOverview = res.data
          if (!this.selectedUniverseCodes.length) {
            const visibleCodes = new Set((res.data.universes || []).filter(item => item.status === 'active').map(item => item.code))
            this.selectedUniverseCodes = (res.data.syncable_codes || []).filter(code => visibleCodes.has(code))
          }
        }
      } finally {
        this.universeLoading = false
      }
    },
    async handleUniverseSync () {
      if (!this.selectedUniverseCodes.length) {
        this.$message.warning(this.$t('settings.universeSync.selectionRequired'))
        return
      }
      this.universeSyncing = true
      try {
        const historyFrom = this.universeHistoryFrom && this.universeHistoryFrom.format('YYYY-MM-DD')
        const res = await syncSystemUniverses({
          codes: this.selectedUniverseCodes,
          history_from: historyFrom
        })
        if (res.code === 1) {
          const warnings = res.data && Array.isArray(res.data.warnings) ? res.data.warnings : []
          if (warnings.length) {
            const codes = warnings.map(item => {
              const row = this.systemUniverseRows.find(universe => universe.code === item.code)
              return row ? this.universeAdminLabel(row) : item.code
            }).join(', ')
            const fixedHistoryApplied = warnings.every(item => item.warning === 'universe.currentMembershipBackfilled')
            const messageKey = fixedHistoryApplied
              ? 'settings.universeSync.fixedHistoryWithCodes'
              : 'settings.universeSync.historyUnavailableWithCodes'
            this.$message.warning(this.$t(messageKey, { codes }))
          } else {
            this.$message.success(this.$t('settings.universeSync.started'))
          }
          await this.refreshUniverseOverview()
        }
      } catch (error) {
        const envelope = error && error.response && error.response.data
        const details = envelope && envelope.data
        const failures = details && Array.isArray(details.errors) ? details.errors : []
        if (failures.length) {
          const codes = failures.map(item => {
            const row = this.systemUniverseRows.find(universe => universe.code === item.code)
            return row ? this.universeAdminLabel(row) : item.code
          }).join(', ')
          const partial = Array.isArray(details.results) && details.results.length > 0
          const key = partial
            ? 'settings.universeSync.partialWithCodes'
            : 'settings.universeSync.failedWithCodes'
          this.$message[partial ? 'warning' : 'error'](this.$t(key, { codes }))
          if (partial) await this.refreshUniverseOverview()
        } else {
          this.$message.error((error && error.backendMessage) || this.$t('settings.universeSync.failed'))
        }
      } finally {
        this.universeSyncing = false
      }
    },
    catalogMetric (key) {
      const crypto = (this.catalogOverview && this.catalogOverview.crypto) || {}
      return Number(crypto[key] || 0)
    },
    formatCatalogTime (value) {
      if (!value) return '-'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
    },
    cleanCatalogError (value) {
      const text = String(value || '').replace(/\s+/g, ' ').trim()
      return text.length > 180 ? `${text.slice(0, 180)}…` : text
    },
    catalogMarketLabel (value) {
      return this.tOr(`settings.marketCatalog.market.${value}`, value)
    },
    async refreshCatalogOverview () {
      this.catalogLoading = !this.catalogOverview
      try {
        const res = await getMarketCatalogOverview()
        if (res.code === 1) {
          this.catalogOverview = res.data
          if (this.catalogRunning) this.startCatalogPolling()
          else this.stopCatalogPolling()
        }
      } finally {
        this.catalogLoading = false
      }
    },
    async handleCatalogSync () {
      if (this.catalogRunning || this.catalogSyncing) return
      this.catalogSyncing = true
      try {
        const res = await syncMarketCatalog()
        if (res.code === 1) {
          this.$message.success(this.$t('settings.marketCatalog.started'))
          await this.refreshCatalogOverview()
          this.startCatalogPolling()
        } else {
          this.$message.warning(this.$t('settings.marketCatalog.alreadyRunning'))
        }
      } catch (error) {
        const status = error && error.response && error.response.status
        if (status === 409) {
          this.$message.warning(this.$t('settings.marketCatalog.alreadyRunning'))
          this.startCatalogPolling()
        } else {
          this.$message.error(this.$t('settings.marketCatalog.startFailed'))
        }
      } finally {
        this.catalogSyncing = false
      }
    },
    startCatalogPolling () {
      if (this.catalogPollTimer) return
      this.catalogPollTimer = window.setInterval(() => this.refreshCatalogOverview(), 2500)
    },
    stopCatalogPolling () {
      if (!this.catalogPollTimer) return
      window.clearInterval(this.catalogPollTimer)
      this.catalogPollTimer = null
    },
    // Left-nav click: switch the currently displayed group.  Clearing the
    // search keyword on group change matches user intent ("I navigated, I'm
    // not in search-mode anymore").
    onMenuClick ({ key }) {
      this.activeGroupKey = key
      this.searchKeyword = ''
    },
    tOr (key, fallback) {
      const text = this.$t(key)
      return text && text !== key ? text : fallback
    },
    isSearchSetting (item) {
      const key = item && item.key ? item.key : ''
      return key.startsWith('SEARCH_') ||
        key === 'TAVILY_API_KEYS' ||
        key === 'SERPAPI_KEYS'
    },
    isAutofillSensitiveSetting (item) {
      const key = String(item && item.key ? item.key : '').toUpperCase()
      return item && (item.type === 'password' || /(^|_)(KEY|SECRET|TOKEN|PASSWORD|CLIENT_ID|SITE_KEY)(_|$)/.test(key))
    },
    hashSettingKey (key) {
      let hash = 0
      const text = String(key || '')
      for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
      }
      return Math.abs(hash).toString(36)
    },
    getSafeInputName (item) {
      return `qd-config-${this.settingsInputNonce}-${this.hashSettingKey(item && item.key)}`
    },
    getAutocomplete (item) {
      return this.isAutofillSensitiveSetting(item) ? 'new-password' : 'off'
    },
    isSuspiciousAutofillValue (item, value) {
      if (!this.isAutofillSensitiveSetting(item)) return false
      const normalized = String(value || '').trim().toLowerCase()
      if (!normalized) return false
      return [
        'admin',
        'administrator',
        'quantdinger',
        'root',
        'user',
        'test',
        'demo',
        'password',
        '123456',
        'changeme',
        'change-me',
        'placeholder',
        'dummy'
      ].includes(normalized)
    },
    formatMessage (key, fallback, params = {}) {
      let text = this.tOr(key, fallback)
      Object.keys(params).forEach((name) => {
        text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), params[name])
      })
      return text
    },
    findSuspiciousAutofillFields (formValues) {
      const hits = []
      for (const [groupKey, group] of Object.entries(this.schema)) {
        for (const item of (group.items || [])) {
          if (!(item.key in formValues)) continue
          if (this.isSuspiciousAutofillValue(item, formValues[item.key])) {
            hits.push(this.getItemLabel(groupKey, item) || item.key)
          }
        }
      }
      return hits
    },
    billingSectionDefinitions () {
      return [
        {
          key: 'usdt',
          title: this.$t('settings.billing.section.usdt'),
          description: this.$t('settings.billing.section.usdtDesc'),
          badge: 'USDT',
          badgeColor: 'green',
          icon: 'wallet',
          tone: 'shared',
          keys: [
            'USDT_PAY_ENABLED',
            'USDT_PAY_ENABLED_CHAINS',
            'USDT_TRC20_ADDRESS',
            'USDT_BEP20_ADDRESS',
            'USDT_ERC20_ADDRESS',
            'USDT_SOL_ADDRESS'
          ]
        },
        {
          key: 'usdc',
          title: this.$t('settings.billing.section.usdc'),
          description: this.$t('settings.billing.section.usdcDesc'),
          badge: 'USDC',
          badgeColor: 'blue',
          icon: 'wallet',
          tone: 'macro',
          keys: [
            'USDC_PAY_ENABLED',
            'USDC_PAY_ENABLED_CHAINS',
            'USDC_ERC20_ADDRESS',
            'USDC_SOL_ADDRESS'
          ]
        },
        {
          key: 'stripe',
          title: this.$t('settings.billing.section.stripe'),
          description: this.$t('settings.billing.section.stripeDesc'),
          badge: 'Stripe',
          badgeColor: 'purple',
          icon: 'credit-card',
          tone: 'us',
          keys: [
            'STRIPE_PAY_ENABLED',
            'STRIPE_SECRET_KEY',
            'STRIPE_WEBHOOK_SECRET',
            'STRIPE_PRODUCT_TAX_CODE',
            'STRIPE_SUCCESS_URL',
            'STRIPE_CANCEL_URL'
          ]
        },
        {
          key: 'chainAccess',
          title: this.$t('settings.billing.section.chainAccess'),
          description: this.$t('settings.billing.section.chainAccessDesc'),
          badge: this.$t('settings.research.badge.optional'),
          badgeColor: 'cyan',
          icon: 'api',
          tone: 'crypto',
          keys: [
            'TRONGRID_API_KEY',
            'TRONGRID_BASE_URL',
            'ETHERSCAN_API_KEY',
            'ETHERSCAN_V2_BASE_URL',
            'BSC_RPC_URLS',
            'ETH_RPC_URLS',
            'SOLANA_RPC_URL',
            'BEP20_PREFER_EXPLORER',
            'ERC20_PREFER_EXPLORER'
          ]
        },
        {
          key: 'runtime',
          title: this.$t('settings.billing.section.runtime'),
          description: this.$t('settings.billing.section.runtimeDesc'),
          icon: 'clock-circle',
          tone: 'futures',
          keys: [
            'USDT_AMOUNT_SUFFIX_DECIMALS',
            'USDT_PAY_CONFIRM_SECONDS',
            'USDT_PAY_EXPIRE_MINUTES',
            'USDT_WORKER_POLL_INTERVAL'
          ]
        },
        {
          key: 'credits',
          title: this.$t('settings.billing.section.credits'),
          description: this.$t('settings.billing.section.creditsDesc'),
          icon: 'thunderbolt',
          tone: 'hk',
          keys: [
            'BILLING_COST_BACKTEST',
            'BILLING_COST_AI_REVIEW',
            'BILLING_COST_AI_ANALYSIS',
            'BILLING_COST_AI_CODE_GEN',
            'BILLING_COST_AI_COPILOT_CHAT',
            'BILLING_COST_AI_COPILOT_IMAGE',
            'BILLING_COST_AI_DECISION_FILTER',
            'MARKETPLACE_PLATFORM_FEE_RATE',
            'CREDITS_REGISTER_BONUS',
            'CREDITS_REFERRAL_BONUS',
            'FREE_USER_STRATEGY_LIMIT'
          ]
        }
      ]
    },
    dataSourceSectionDefinitions () {
      return [
        {
          key: 'shared',
          title: this.tOr('settings.research.market.shared', 'Shared settings'),
          description: this.tOr('settings.research.market.sharedDesc', 'Used by every professional report. Local deployments can keep the recommended defaults.'),
          badge: this.tOr('settings.research.badge.recommended', 'Recommended defaults'),
          badgeColor: 'green',
          icon: 'share-alt',
          tone: 'shared',
          keys: [
            'PROFESSIONAL_REPORT_RISK_BUDGET_PCT',
            'FAST_ANALYSIS_INCLUDE_GLOBAL_NEWS'
          ],
          advancedKeys: []
        },
        {
          key: 'macro',
          title: this.$t('settings.research.market.macro'),
          description: this.$t('settings.research.market.macroDesc'),
          badge: this.tOr('settings.research.badge.optional', 'Optional'),
          badgeColor: 'blue',
          icon: 'global',
          tone: 'macro',
          keys: ['FRED_API_KEY'],
          advancedKeys: [
            'FRED_BASE_URL',
            'FRED_TIMEOUT'
          ]
        },
        {
          key: 'us',
          title: this.tOr('settings.research.market.us', 'US stock data'),
          description: this.tOr('settings.research.market.usDesc', 'Finnhub enhances quotes, profiles and company news. Sentiment integration is optional.'),
          badge: this.tOr('settings.research.badge.keyOptional', 'API key optional'),
          badgeColor: 'geekblue',
          icon: 'stock',
          tone: 'us',
          keys: [
            'FINNHUB_API_KEY',
            'FINNHUB_FREE_ONLY',
            'ALPHA_VANTAGE_API_KEY'
          ],
          advancedKeys: [
            'FINNHUB_TIMEOUT',
            'SEC_USER_AGENT',
            'ALPHA_VANTAGE_BASE_URL',
            'ALPHA_VANTAGE_TIMEOUT',
            'ALPHA_VANTAGE_NEWS_LIMIT'
          ]
        },
        {
          key: 'cross_market',
          title: this.$t('settings.research.market.cross'),
          description: this.$t('settings.research.market.crossDesc'),
          badge: this.tOr('settings.research.badge.keyOptional', 'API key optional'),
          badgeColor: 'cyan',
          icon: 'swap',
          tone: 'hk',
          keys: ['TWELVE_DATA_API_KEY', 'TIINGO_API_KEY'],
          advancedKeys: ['TIINGO_TIMEOUT', 'AKSHARE_TIMEOUT']
        },
        {
          key: 'crypto',
          title: this.tOr('settings.research.market.crypto', 'Crypto data'),
          description: this.tOr('settings.research.market.cryptoDesc', 'Public exchange data works without a key. CoinGlass and CryptoQuant add derivatives and on-chain depth.'),
          badge: this.tOr('settings.research.badge.publicReady', 'Public data ready'),
          badgeColor: 'purple',
          icon: 'block',
          tone: 'crypto',
          keys: [
            'CRYPTO_PUBLIC_DEFAULT_EXCHANGE',
            'COINGLASS_API_KEY',
            'CRYPTOQUANT_API_KEY'
          ],
          advancedKeys: ['CRYPTO_PUBLIC_TIMEOUT']
        },
        {
          key: 'futures',
          title: this.tOr('settings.research.market.futures', 'Futures data'),
          description: this.tOr('settings.research.market.futuresDesc', 'CFTC positioning and public contract data are built in. Add shared macro providers above only when needed.'),
          badge: this.tOr('settings.research.badge.noSetup', 'No setup required'),
          badgeColor: 'orange',
          icon: 'line-chart',
          tone: 'futures',
          keys: [],
          advancedKeys: [],
          alwaysVisible: true
        },
        {
          key: 'forex',
          title: this.tOr('settings.research.market.forex', 'FX data'),
          description: this.tOr('settings.research.market.forexDesc', 'Tiingo is an optional quote source. Shared FRED and event data above add policy and macro context.'),
          badge: this.tOr('settings.research.badge.keyOptional', 'API key optional'),
          badgeColor: 'green',
          icon: 'swap',
          tone: 'forex',
          keys: [],
          advancedKeys: [],
          alwaysVisible: true
        }
      ]
    },
    searchSectionDefinitions () {
      const selected = this.selectedSearchProvider || 'tavily'
      const providerSections = [
        {
          key: 'tavily',
          title: 'Tavily',
          description: this.$t('settings.search.provider.tavilyDesc'),
          icon: 'search',
          tone: 'shared',
          keys: ['TAVILY_API_KEYS'],
          advancedKeys: []
        },
        {
          key: 'searxng',
          title: 'SearXNG',
          description: this.$t('settings.search.provider.searxngDesc'),
          icon: 'global',
          tone: 'shared',
          keys: ['SEARCH_SEARXNG_BASE_URL'],
          advancedKeys: [
            'SEARCH_SEARXNG_ENGINES',
            'SEARCH_SEARXNG_CATEGORIES',
            'SEARCH_SEARXNG_LANGUAGE',
            'SEARCH_SEARXNG_TIMEOUT'
          ]
        },
        {
          key: 'gdelt',
          title: 'GDELT',
          description: this.$t('settings.search.provider.gdeltDesc'),
          icon: 'read',
          tone: 'macro',
          keys: ['GDELT_BASE_URL'],
          advancedKeys: ['GDELT_TIMEOUT', 'GDELT_MAX_RESULTS']
        },
        {
          key: 'serpapi',
          title: 'SerpAPI',
          description: this.$t('settings.search.provider.serpapiDesc'),
          icon: 'search',
          tone: 'shared',
          keys: ['SERPAPI_KEYS'],
          advancedKeys: []
        },
        {
          key: 'alpha_vantage',
          title: 'Alpha Vantage',
          description: this.$t('settings.search.provider.alphaVantageDesc'),
          icon: 'link',
          tone: 'macro',
          keys: [],
          advancedKeys: [],
          alwaysVisible: true,
          linked: true
        },
        {
          key: 'google',
          title: 'Google',
          description: this.$t('settings.search.provider.googleDesc'),
          icon: 'search',
          tone: 'shared',
          keys: ['SEARCH_GOOGLE_API_KEY', 'SEARCH_GOOGLE_CX'],
          advancedKeys: [],
          legacy: true
        },
        {
          key: 'duckduckgo',
          title: 'DuckDuckGo',
          description: this.$t('settings.search.provider.duckduckgoDesc'),
          icon: 'global',
          tone: 'shared',
          keys: [],
          advancedKeys: [],
          alwaysVisible: true,
          keyless: true
        }
      ]
      const orderedProviders = providerSections
        .filter(section => section.key !== selected)
      const selectedSection = providerSections.find(section => section.key === selected)
      if (selectedSection) orderedProviders.unshift(selectedSection)

      const disabled = selected === 'none'
      orderedProviders.forEach(section => {
        if (disabled) {
          section.badge = this.$t('settings.search.badge.inactive')
          section.badgeColor = 'default'
        } else if (section.key === selected) {
          section.badge = this.$t('settings.search.badge.primary')
          section.badgeColor = 'green'
        } else if (section.legacy) {
          section.badge = this.$t('settings.search.badge.legacy')
          section.badgeColor = 'orange'
        } else if (section.linked) {
          section.badge = this.$t('settings.search.badge.linked')
          section.badgeColor = 'blue'
        } else if (section.keyless) {
          section.badge = this.$t('settings.search.badge.keyless')
          section.badgeColor = 'green'
        } else {
          section.badge = this.$t('settings.search.badge.fallback')
          section.badgeColor = 'blue'
        }
      })

      return [
        {
          key: 'routing',
          title: this.$t('settings.search.section.routing'),
          description: this.$t('settings.search.section.routingDesc'),
          badge: disabled
            ? this.$t('settings.search.badge.disabled')
            : this.$t('settings.search.badge.fallbackChain'),
          badgeColor: disabled ? 'default' : 'green',
          icon: 'branches',
          tone: 'shared',
          keys: ['SEARCH_PROVIDER', 'SEARCH_MAX_RESULTS'],
          advancedKeys: []
        },
        ...orderedProviders
      ]
    },
    macroToolSectionDefinitions () {
      return [
        {
          key: 'tradingEconomics',
          title: this.$t('settings.macroTools.tradingEconomicsTitle'),
          description: this.$t('settings.macroTools.tradingEconomicsDesc'),
          badge: this.tOr('settings.research.badge.optional', 'Optional'),
          badgeColor: 'blue',
          icon: 'global',
          tone: 'shared',
          keys: ['TRADING_ECONOMICS_CLIENT', 'TRADING_ECONOMICS_KEY'],
          advancedKeys: ['TRADING_ECONOMICS_BASE_URL', 'TRADING_ECONOMICS_TIMEOUT']
        },
        {
          key: 'bls',
          title: this.$t('settings.macroTools.blsTitle'),
          description: this.$t('settings.macroTools.blsDesc'),
          badge: this.tOr('settings.research.badge.optional', 'Optional'),
          badgeColor: 'cyan',
          icon: 'bank',
          tone: 'macro',
          keys: ['BLS_API_KEY'],
          advancedKeys: ['BLS_BASE_URL', 'BLS_TIMEOUT']
        }
      ]
    },
    agentSectionDefinitions () {
      return [
        {
          key: 'validation',
          title: this.tOr('settings.agent.section.validation', 'Historical result validation'),
          description: this.tOr('settings.agent.section.validationDesc', 'Periodically compares matured analysis decisions with actual returns and stores the outcome.'),
          badge: this.tOr('settings.agent.badge.needsSamples', 'Requires samples'),
          badgeColor: 'orange',
          icon: 'experiment',
          tone: 'futures',
          keys: ['ENABLE_REFLECTION_WORKER'],
          advancedKeys: [
            'REFLECTION_WORKER_INTERVAL_SEC',
            'REFLECTION_MIN_AGE_DAYS',
            'REFLECTION_VALIDATE_LIMIT'
          ]
        },
        {
          key: 'calibration',
          title: this.tOr('settings.agent.section.calibration', 'Confidence calibration'),
          description: this.tOr('settings.agent.section.calibrationDesc', 'Uses validated historical samples to adjust confidence. Until enough samples exist, raw confidence is retained.'),
          badge: this.tOr('settings.agent.badge.needsSamples', 'Requires samples'),
          badgeColor: 'purple',
          icon: 'dashboard',
          tone: 'crypto',
          keys: ['ENABLE_CONFIDENCE_CALIBRATION', 'AI_CALIBRATION_MARKETS'],
          advancedKeys: [
            'AI_CALIBRATION_LOOKBACK_DAYS',
            'AI_CALIBRATION_MIN_SAMPLES'
          ]
        }
      ]
    },
    tradingSectionDefinitions () {
      return [
        {
          key: 'agentPermission',
          title: this.$t('settings.trading.agentPermissionSection'),
          description: this.$t('settings.trading.agentPermissionSectionDesc'),
          badge: this.$t('settings.trading.agentPermissionBadge'),
          badgeColor: 'orange',
          icon: 'safety-certificate',
          tone: 'futures',
          keys: ['AGENT_LIVE_TRADING_ENABLED'],
          advancedKeys: []
        },
        {
          key: 'makerDefaults',
          title: this.$t('settings.trading.executionSection'),
          description: this.$t('settings.trading.executionSectionDesc'),
          badge: this.$t('settings.trading.executionBadge'),
          badgeColor: 'blue',
          icon: 'swap',
          tone: 'shared',
          keys: ['MAKER_WAIT_SEC', 'MAKER_OFFSET_BPS'],
          advancedKeys: []
        }
      ]
    },
    securitySectionDefinitions () {
      return [
        {
          key: 'mfa',
          title: this.$t('settings.security.section.mfa'),
          description: this.$t('settings.security.section.mfaDesc'),
          badge: this.$t('settings.security.badge.userOptIn'),
          badgeColor: 'green',
          icon: 'safety-certificate',
          tone: 'shared',
          keys: ['MFA_ENABLED', 'MFA_RISK_LOGIN_ONLY'],
          advancedKeys: ['MFA_CHALLENGE_EXPIRE_MINUTES', 'MFA_MAX_ATTEMPTS']
        },
        {
          key: 'turnstile',
          title: this.$t('settings.security.section.turnstile'),
          description: this.$t('settings.security.section.turnstileDesc'),
          badge: this.$t('settings.research.badge.optional'),
          badgeColor: 'cyan',
          icon: 'robot',
          tone: 'macro',
          keys: ['TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'],
          advancedKeys: []
        },
        {
          key: 'redirects',
          title: this.$t('settings.security.section.redirects'),
          description: this.$t('settings.security.section.redirectsDesc'),
          icon: 'link',
          tone: 'shared',
          keys: ['FRONTEND_URL'],
          advancedKeys: ['OAUTH_ALLOWED_REDIRECTS', 'OAUTH_STATE_TTL_MINUTES']
        },
        {
          key: 'google',
          title: this.$t('settings.security.section.google'),
          description: this.$t('settings.security.section.googleDesc'),
          badge: this.$t('settings.research.badge.optional'),
          badgeColor: 'blue',
          icon: 'google',
          tone: 'us',
          keys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
          advancedKeys: ['GOOGLE_REDIRECT_URI']
        },
        {
          key: 'github',
          title: this.$t('settings.security.section.github'),
          description: this.$t('settings.security.section.githubDesc'),
          badge: this.$t('settings.research.badge.optional'),
          badgeColor: 'default',
          icon: 'github',
          tone: 'default',
          keys: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
          advancedKeys: ['GITHUB_REDIRECT_URI']
        },
        {
          key: 'loginProtection',
          title: this.$t('settings.security.section.loginProtection'),
          description: this.$t('settings.security.section.loginProtectionDesc'),
          badge: this.$t('settings.research.badge.recommended'),
          badgeColor: 'green',
          icon: 'lock',
          tone: 'futures',
          keys: ['SECURITY_IP_MAX_ATTEMPTS', 'SECURITY_ACCOUNT_MAX_ATTEMPTS'],
          advancedKeys: [
            'SECURITY_IP_WINDOW_MINUTES',
            'SECURITY_IP_BLOCK_MINUTES',
            'SECURITY_ACCOUNT_WINDOW_MINUTES',
            'SECURITY_ACCOUNT_BLOCK_MINUTES'
          ]
        },
        {
          key: 'verificationCodes',
          title: this.$t('settings.security.section.verificationCodes'),
          description: this.$t('settings.security.section.verificationCodesDesc'),
          badge: this.$t('settings.research.badge.recommended'),
          badgeColor: 'green',
          icon: 'mail',
          tone: 'crypto',
          keys: ['VERIFICATION_CODE_EXPIRE_MINUTES', 'VERIFICATION_CODE_RATE_LIMIT'],
          advancedKeys: [
            'VERIFICATION_CODE_IP_HOURLY_LIMIT',
            'VERIFICATION_CODE_MAX_ATTEMPTS',
            'VERIFICATION_CODE_LOCK_MINUTES'
          ]
        }
      ]
    },
    buildCategorizedEntries (items, definitions, scope) {
      const byKey = new Map((items || []).map(item => [item.key, item]))
      const claimed = new Set()
      const entries = []
      definitions.forEach(section => {
        const sectionItems = section.keys.map(key => byKey.get(key)).filter(Boolean)
        const sectionAdvancedItems = (section.advancedKeys || []).map(key => byKey.get(key)).filter(Boolean)
        if (!sectionItems.length && !sectionAdvancedItems.length && !section.alwaysVisible) return
        const claimedSectionItems = [...sectionItems, ...sectionAdvancedItems]
        claimedSectionItems.forEach(item => claimed.add(item.key))
        entries.push({
          type: 'heading',
          key: `${scope}-${section.key}-heading`,
          title: section.title,
          description: section.description,
          badge: section.badge,
          badgeColor: section.badgeColor,
          icon: section.icon,
          tone: section.tone
        })
        entries.push(...sectionItems.map(item => ({
          type: 'field',
          key: `${scope}-${section.key}-${item.key}`,
          item
        })))
        if (sectionAdvancedItems.length) {
          const advancedScope = `${scope}:${section.key}:advanced`
          const expanded = this.isAdvancedExpanded(advancedScope)
          entries.push({
            type: 'advanced-toggle',
            key: `${scope}-${section.key}-advanced-toggle`,
            scope: advancedScope,
            expanded,
            label: expanded
              ? this.tOr('settings.advanced.hide', 'Hide advanced settings')
              : this.formatMessage('settings.advanced.show', 'Show advanced settings ({count})', { count: String(sectionAdvancedItems.length) }),
            description: this.tOr('settings.advanced.description', 'Endpoints, timeouts, and tuning controls normally do not need to be changed.')
          })
          if (expanded) {
            entries.push(...sectionAdvancedItems.map(item => ({
              type: 'field',
              key: `${scope}-${section.key}-advanced-${item.key}`,
              item
            })))
          }
        }
      })

      const advancedItems = (items || []).filter(item => !claimed.has(item.key))
      if (advancedItems.length) {
        const advancedScope = `${scope}:advanced`
        const expanded = this.isAdvancedExpanded(advancedScope)
        entries.push({
          type: 'advanced-toggle',
          key: `${scope}-advanced-toggle`,
          scope: advancedScope,
          expanded,
          label: expanded
            ? this.tOr('settings.advanced.hide', 'Hide advanced settings')
            : this.formatMessage('settings.advanced.show', 'Show advanced settings ({count})', { count: String(advancedItems.length) }),
          description: this.tOr('settings.advanced.description', 'Endpoints, timeouts, and tuning controls normally do not need to be changed.')
        })
        if (expanded) {
          entries.push(...advancedItems.map(item => ({
            type: 'field',
            key: `${scope}-advanced-${item.key}`,
            item
          })))
        }
      }
      return entries
    },
    buildSettingEntries (items, scope = 'default') {
      const basicItems = (items || []).filter(item => !item.is_advanced)
      const advancedItems = (items || []).filter(item => item.is_advanced)
      const entries = basicItems.map(item => ({
        type: 'field',
        key: `field-${item.key}`,
        item
      }))

      if (advancedItems.length > 0) {
        const advancedScope = `${scope}:advanced`
        const expanded = this.isAdvancedExpanded(advancedScope)
        entries.push({
          type: 'advanced-toggle',
          key: `${scope}-advanced-toggle`,
          scope: advancedScope,
          expanded,
          label: expanded
            ? this.tOr('settings.advanced.hide', 'Hide advanced settings')
            : this.formatMessage('settings.advanced.show', 'Show advanced settings ({count})', { count: String(advancedItems.length) }),
          description: this.tOr(
            'settings.advanced.description',
            'Optional integrations, endpoints, and tuning controls remain available here.'
          )
        })
        if (expanded) {
          entries.push(...advancedItems.map(item => ({
            type: 'field',
            key: `advanced-${item.key}`,
            item
          })))
        }
      }

      return entries
    },
    isAdvancedExpanded (scope) {
      return !!this.advancedExpanded[scope]
    },
    toggleAdvanced (scope) {
      this.$set(this.advancedExpanded, scope, !this.advancedExpanded[scope])
    },
    onSelectFieldChange (item, value) {
      if (item && item.key === 'LLM_PROVIDER') {
        this.selectedLlmProvider = value || 'openrouter'
      }
      if (item && item.key === 'SEARCH_PROVIDER') {
        this.selectedSearchProvider = value || 'tavily'
      }
    },
    onAiSectionSwitchChange (key, value) {
      if (key === 'JEV_ENABLED') {
        this.jevEnabled = value
      }
      if (key === 'ENABLE_AI_ENSEMBLE') {
        this.ensembleEnabled = value
      }
    },
    normalizeRouteSection (value) {
      const key = String(value || '').toLowerCase()
      const map = {
        llm: 'ai',
        ai_llm: 'ai',
        ai: 'ai',
        data: 'data_source',
        datasource: 'data_source',
        data_source: 'data_source',
        broker: 'trading',
        broker_accounts: 'trading'
      }
      return map[key] || key
    },
    applyRouteSection () {
      const keys = Object.keys(this.sortedSchema || {})
      const target = this.normalizeRouteSection(this.$route.query.section || this.$route.query.group)
      if (target && keys.includes(target)) {
        this.activeGroupKey = target
        this.searchKeyword = ''
      }
    },
    // - string[]: ['openrouter','openai', ...]
    // - {value,label}[]: [{value:'openrouter',label:'OpenRouter'}, ...]
    getSelectOptions (item) {
      const options = item && Array.isArray(item.options) ? item.options : []
      const arr = options
      return arr.map(opt => {
        const optObj = (opt && typeof opt === 'object')
          ? { value: opt.value != null ? String(opt.value) : '', label: opt.label != null ? String(opt.label) : String(opt.value || '') }
          : { value: String(opt), label: String(opt) }
        // Try i18n first: settings.option.<ITEM_KEY>.<value>
        const i18nKey = item && item.key ? `settings.option.${item.key}.${optObj.value}` : ''
        if (i18nKey) {
          const translated = this.$t(i18nKey)
          if (translated && translated !== i18nKey) {
            optObj.label = translated
          }
        }
        if (opt && typeof opt === 'object') {
          return optObj
        }
        return optObj
      }).filter(o => o.value !== '')
    },
    async loadSettings () {
      this.loading = true
      try {
        const [schemaRes, valuesRes, marketModulesRes, reportSourcesRes] = await Promise.all([
          getSettingsSchema(),
          getSettingsValues(),
          getMarketModules().catch(() => null),
          getProfessionalReportDataSources().catch(() => null)
        ])

        if (schemaRes.code === 1) {
          this.schema = schemaRes.data
        }

        if (valuesRes.code === 1) {
          this.values = valuesRes.data
          this.selectedLlmProvider = (this.values.ai && this.values.ai.LLM_PROVIDER) || 'openrouter'
          this.selectedSearchProvider = (this.values.search && this.values.search.SEARCH_PROVIDER) || 'tavily'
          this.jevEnabled = this.getBoolValue('ai', 'JEV_ENABLED', true)
          this.ensembleEnabled = this.getBoolValue('ai', 'ENABLE_AI_ENSEMBLE', false)
          this.referralProgramEnabled = this.getBoolValue('billing', 'REFERRAL_PROGRAM_ENABLED', false)
        }

        if (marketModulesRes && marketModulesRes.code === 1 && marketModulesRes.data) {
          this.marketModules = marketModulesRes.data.markets || []
        }

        if (reportSourcesRes && reportSourcesRes.code === 1 && reportSourcesRes.data) {
          this.reportDataSources = reportSourcesRes.data.items || []
          this.reportDataSourcesLoaded = true
        }

        // After a fresh load: if no group has been picked yet (first mount)
        // or the previously active key disappeared, fall back to the first
        // group in display order.  This avoids a blank right pane.
        const keys = Object.keys(this.sortedSchema)
        const routeGroup = this.normalizeRouteSection(this.$route.query.section || this.$route.query.group)
        if (routeGroup && keys.includes(routeGroup)) {
          this.activeGroupKey = routeGroup
        } else if (keys.length && (!this.activeGroupKey || !keys.includes(this.activeGroupKey))) {
          this.activeGroupKey = keys[0]
        }
      } catch (error) {
        this.$message.error(this.$t('settings.loadFailed'))
      } finally {
        this.loading = false
      }
    },

    async queryOpenRouterBalance () {
      this.balanceLoading = true
      try {
        const res = await getOpenRouterBalance()
        if (res.code === 1 && res.data) {
          this.openrouterBalance = res.data
          this.$message.success(this.$t('settings.balanceQuerySuccess') || '余额查询成功')
        } else {
          this.$message.error(res.msg || this.$t('settings.balanceQueryFailed') || '余额查询失败')
        }
      } catch (error) {
        this.$message.error(this.$t('settings.balanceQueryFailed') || '余额查询失败')
      } finally {
        this.balanceLoading = false
      }
    },

    getGroupIcon (groupKey) {
      const icons = {
        features: 'control',
        brand: 'crown',
        contact: 'customer-service',
        social: 'team',
        legal: 'safety-certificate',
        auth: 'user',
        email: 'mail',
        sms: 'phone',
        network: 'global',
        app: 'appstore',
        ai: 'robot',
        trading: 'stock',
        strategy_runtime: 'cluster',
        market_modules: 'appstore',
        data_source: 'database',
        macro_tools: 'global',
        market_intelligence: 'radar-chart',
        search: 'search',
        agent: 'experiment',
        security: 'safety',
        billing: 'dollar',
        market_catalog: 'database'
      }
      return icons[groupKey] || 'setting'
    },

    getGroupTitle (groupKey, defaultTitle) {
      const key = `settings.group.${groupKey}`
      const translated = this.$t(key)
      return translated !== key ? translated : defaultTitle
    },

    getItemLabel (groupKey, item) {
      const key = `settings.field.${item.key}`
      const translated = this.$t(key)
      if (translated !== key) return translated
      if (item.label && !item.label.startsWith('settings.')) return item.label
      return item.key
    },

    getItemDescription (groupKey, item) {
      const key = `settings.desc.${item.key}`
      const translated = this.$t(key)
      if (translated !== key) {
        return translated
      }
      if (item.description && item.description.startsWith('settings.')) {
        const generic = this.$t(item.description)
        return generic !== item.description ? generic : ''
      }
      return item.description || ''
    },

    getLinkText (linkText) {
      if (!linkText) return this.$t('settings.getApi')
      if (linkText.startsWith('settings.link.')) {
        const translated = this.$t(linkText)
        return translated !== linkText ? translated : linkText
      }
      return linkText
    },

    getFieldValue (groupKey, key) {
      const groupValues = this.values[groupKey] || {}
      return groupValues[key] || ''
    },

    isSecretConfigured (groupKey, key) {
      const groupValues = this.values[groupKey] || {}
      return !!groupValues[`${key}_configured`]
    },

    getSecretPlaceholder (groupKey, item) {
      if (item && this.isSecretConfigured(groupKey, item.key)) {
        return this.$t('settings.secretConfiguredPlaceholder')
      }
      return this.$t('settings.inputApiKey')
    },

    getCsvListValue (groupKey, key, defaultVal) {
      const raw = this.getFieldValue(groupKey, key) || defaultVal || ''
      if (Array.isArray(raw)) return raw
      return String(raw)
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
    },

    getMarketModuleRows (item) {
      const byKey = {}
      for (const market of this.marketModules || []) {
        if (market && market.key) byKey[market.key] = market
      }
      const options = this.getSelectOptions(item)
      return options.map(opt => {
        const module = byKey[opt.value]
        if (module) {
          return {
            ...module,
            label: module.label || opt.label
          }
        }
        return {
          key: opt.value,
          label: opt.label,
          description: '',
          symbol_hint: opt.value,
          status: 'partial',
          data_sources: [],
          live_brokers: [],
          features: []
        }
      })
    },

    tradingVenueGroups (item) {
      const brokerIds = new Set(['alpaca', 'ibkr', 'tiger', 'webull'])
      const options = this.getSelectOptions(item)
      const rows = options.map(option => {
        const id = String(option.value || '').trim().toLowerCase()
        return {
          id,
          name: this.$t(`settings.venues.name.${id}`),
          description: this.$t(`settings.venues.desc.${id}`)
        }
      })
      return [
        {
          key: 'brokers',
          title: this.$t('settings.venues.brokers'),
          items: rows.filter(row => brokerIds.has(row.id))
        },
        {
          key: 'crypto',
          title: this.$t('settings.venues.crypto'),
          items: rows.filter(row => !brokerIds.has(row.id))
        }
      ].filter(group => group.items.length)
    },

    marketStatusColor (status) {
      const map = {
        ready: 'green',
        partial: 'orange',
        blocked: 'red',
        disabled: 'default'
      }
      return map[status] || 'blue'
    },

    marketStatusText (status) {
      const map = {
        ready: this.tOr('settings.market.status.ready', 'Ready'),
        partial: this.tOr('settings.market.status.partial', 'Needs setup'),
        blocked: this.tOr('settings.market.status.blocked', 'Blocked'),
        disabled: this.tOr('settings.market.status.disabled', 'Disabled')
      }
      return map[status] || status || 'Unknown'
    },

    marketModuleLabel (market) {
      if (!market) return ''
      const key = market.key || market.value
      const i18nKey = `dashboard.analysis.market.${key}`
      const translated = this.$t(i18nKey)
      return translated !== i18nKey ? translated : (market.label || key || '')
    },

    marketModuleDescription (market) {
      if (!market) return ''
      const key = market.key || market.value
      return this.tOr(`settings.market.desc.${key}`, market.description || '')
    },

    marketLiveText (market) {
      const brokers = Array.isArray(market && market.live_brokers) ? market.live_brokers.join(', ') : ''
      return `${this.tOr('settings.market.livePrefix', 'Live')}: ${brokers}`
    },

    marketResearchOnlyText () {
      return this.tOr('settings.market.researchOnly', 'Research / paper only')
    },

    marketSourceLabel (source) {
      if (!source) return ''
      const key = source.key || source.value
      return this.tOr(`settings.market.sourceLabel.${key}`, source.label || key || '')
    },

    sourceStatusText (source) {
      if (source.built_in) return this.tOr('settings.market.source.builtin', 'built-in')
      if (source.configured) return this.tOr('settings.market.source.configured', 'configured')
      if (source.required) return this.tOr('settings.market.source.required', 'required')
      if (source.recommended) return this.tOr('settings.market.source.recommended', 'recommended')
      return this.tOr('settings.market.source.optional', 'optional')
    },

    togglePasswordVisible (key) {
      this.$set(this.passwordVisible, key, !this.passwordVisible[key])
    },

    getNumberValue (groupKey, key, defaultVal) {
      const val = this.getFieldValue(groupKey, key)
      if (val === '' || val === null || val === undefined) {
        return defaultVal ? parseFloat(defaultVal) : null
      }
      return parseFloat(val)
    },

    getBoolValue (groupKey, key, defaultVal) {
      const val = this.getFieldValue(groupKey, key)
      if (val === '' || val === null || val === undefined) {
        return defaultVal === 'True' || defaultVal === 'true' || defaultVal === true
      }
      return val === 'True' || val === 'true' || val === true
    },

    handleReset () {
      this.form.resetFields()
      this.loadSettings()
    },

    copyRestartCommand () {
      const cmd = 'docker compose restart backend trading-worker kafka-audit-worker strategy-dispatcher-worker strategy-evaluator-worker'
      navigator.clipboard.writeText(cmd).then(() => {
        this.$message.success(this.$t('settings.copySuccess'))
      }).catch(() => {
        this.$message.error(this.$t('settings.copyFailed'))
      })
    },

    async handleSave () {
      this.form.validateFields(async (err, formValues) => {
        if (err) {
          return
        }

        const suspiciousFields = this.findSuspiciousAutofillFields(formValues)
        if (suspiciousFields.length) {
          this.$message.warning(this.formatMessage(
            'settings.sensitiveAutofillBlocked',
            'Some sensitive settings look like browser autofill values: {fields}. Clear them or enter the real keys before saving.',
            { fields: suspiciousFields.join(', ') }
          ))
          return
        }

        this.saving = true
        try {
          const data = {}
          for (const groupKey of Object.keys(this.schema)) {
            data[groupKey] = {}
            const group = this.schema[groupKey]
            for (const item of group.items) {
              if (item.readonly) continue
              if (item.key in formValues) {
                let value = formValues[item.key]
                if (item.type === 'password' && !value && this.isSecretConfigured(groupKey, item.key)) {
                  continue
                }
                if (item.type === 'boolean') {
                  value = value ? 'True' : 'False'
                } else if (item.type === 'market_multiselect' || item.type === 'venue_multiselect') {
                  value = Array.isArray(value) ? value.join(',') : String(value || '')
                }
                data[groupKey][item.key] = value
              }
            }
          }

          const res = await saveSettings(data)
          if (res.code === 1) {
            const responseMessage = res.msg && res.msg.startsWith('settings.')
              ? this.$t(res.msg)
              : res.msg
            this.$message.success(responseMessage || this.$t('settings.saveSuccess'))
            if (res.data && res.data.requires_restart) {
              this.showRestartTip = true
            }
            this.loadSettings()
            const featureKeys = [
              'BILLING_ENABLED',
              'MARKETPLACE_ENABLED',
              'ENABLE_REGISTRATION',
              'BROKER_ACCOUNTS_ENABLED',
              'LIVE_TRADING_ENABLED',
              'AGENT_GATEWAY_ENABLED'
            ]
            const updatedKeys = (res.data && res.data.updated_keys) || []
            if (updatedKeys.some(key => featureKeys.includes(key))) {
              await this.$store.dispatch('LoadFeatureConfig', { force: true }).catch(() => {})
              window.setTimeout(() => window.location.reload(), 250)
            }
            // Brand / contact / social / legal live under the same .env. Refresh
            // the global brand store so logo / footer / version label reflect
            // the change without a hard reload.
            this.$store.dispatch('LoadBrandConfig', { force: true }).catch(() => {})
          } else {
            this.$message.error(res.msg || this.$t('settings.saveFailed'))
          }
        } catch (error) {
          this.$message.error(this.$t('settings.saveFailed') + ': ' + error.message)
        } finally {
          this.saving = false
        }
      })
    }
  }
}
</script>

<style lang="less" scoped>
@primary-color: #1890ff;
@success-color: #52c41a;
@border-radius: 12px;
@card-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

.settings-page {
  padding: var(--qd-page-gutter, 16px) !important;
  min-height: calc(100vh - 120px);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);

  .restart-alert {
    margin-bottom: 16px;
    border-radius: 8px;
  }

  .settings-layout {
    display: flex;
    gap: 20px;
    margin-bottom: 24px;
    align-items: flex-start;
  }

  .settings-nav {
    // Wide enough for the longest group label in any supported locale
    // (some Chinese / German / Russian group names ran over the previous
    // 240px and forced a horizontal scrollbar in the side rail).
    flex: 0 0 280px;
    position: sticky;
    top: 16px;
    background: #fff;
    border-radius: @border-radius;
    box-shadow: @card-shadow;
    padding: 16px 0;
    max-height: calc(100vh - 280px);
    // Allow vertical scroll for long lists, but never let the side rail
    // grow a horizontal scrollbar — overflow is handled by ellipsis on
    // the menu-item label instead.
    overflow-x: hidden;
    overflow-y: auto;

    .settings-search {
      padding: 0 16px 12px;

      ::v-deep .ant-input-affix-wrapper {
        border-radius: 8px;
      }
    }

    .settings-menu {
      border: none;
      background: transparent;

      ::v-deep .ant-menu-item-group-title {
        padding: 14px 20px 4px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        line-height: 1.4;
        text-transform: uppercase;
      }

      ::v-deep .ant-menu-item {
        margin: 4px 8px;
        border-radius: 8px;
        height: 40px;
        line-height: 40px;
        padding-left: 16px !important;
        padding-right: 12px !important;
        color: #475569;
        font-weight: 500;
        // Ant Design's default for menu-item is to clip long labels,
        // which the browser turns into a horizontal scrollbar on the
        // parent. Force an ellipsis on the label span so overly long
        // group titles degrade gracefully without shifting layout.
        display: flex;
        align-items: center;

        .anticon {
          color: #94a3b8;
          flex: 0 0 auto;
        }

        > span:not(.anticon) {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        &:hover {
          background: color-mix(in srgb, var(--primary-color, #1890ff) 6%, transparent);
          color: var(--primary-color, #1890ff);
          .anticon { color: var(--primary-color, #1890ff); }
        }

        &.ant-menu-item-selected {
          background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 10%, transparent), rgba(19, 194, 194, 0.08));
          color: var(--primary-color, #1890ff);
          font-weight: 600;
          .anticon { color: var(--primary-color, #1890ff); }

          &::after { display: none; }
        }
      }
    }
  }

  .settings-detail {
    flex: 1 1 auto;
    min-width: 0;
    background: #fff;
    border-radius: @border-radius;
    box-shadow: @card-shadow;
    padding: 24px;

    .settings-detail-inner {
      width: 100%;
    }

    .detail-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f0f0f0;

      .detail-icon {
        font-size: 20px;
        color: var(--primary-color, #1890ff);
      }

      .detail-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1e3a5f;
      }
    }

    .search-result-group-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 4px;
      padding: 2px 8px;
      background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, transparent);
      color: var(--primary-color, #1890ff);
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;

      .anticon {
        font-size: 11px;
      }
    }

    .settings-subsection-heading {
      margin: 6px 0 16px;
      padding: 18px 14px 14px;
      border-top: 1px solid #f1f5f9;
      border-left: 4px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;

      .settings-subsection-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      span {
        display: block;
        color: #1e3a5f;
        font-size: 14px;
        font-weight: 700;

        .anticon {
          margin-right: 6px;
        }
      }

      small {
        display: block;
        margin-top: 4px;
        color: #64748b;
        font-size: 12px;
        line-height: 1.6;
      }

      &.subsection-shared { border-left-color: #1890ff; }
      &.subsection-macro { border-left-color: #13c2c2; }
      &.subsection-us { border-left-color: #2f54eb; }
      &.subsection-hk { border-left-color: #08979c; }
      &.subsection-crypto { border-left-color: #722ed1; }
      &.subsection-futures { border-left-color: #fa8c16; }
      &.subsection-forex { border-left-color: #52c41a; }
    }

    .report-source-status {
      margin-bottom: 20px;
      padding: 16px;
      border: 1px solid #d9f7be;
      border-radius: 10px;
      background: linear-gradient(135deg, #f6ffed 0%, #fff 62%);
    }

    .report-source-status-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;

      strong {
        color: #1f2937;
        font-size: 14px;
      }

      p {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 12px;
        line-height: 1.6;
      }
    }

    .report-source-metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 14px;
    }

    .report-source-metric {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.78);

      span {
        display: flex;
        min-width: 0;
        flex-direction: column;
        color: #64748b;
        font-size: 12px;

        small {
          margin-top: 2px;
          color: #94a3b8;
          font-size: 10px;
          line-height: 1.4;
        }
      }

      strong {
        color: #0f766e;
        font-size: 15px;
      }
    }

    .report-source-provider-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;

      .ant-tag {
        margin: 0;
      }
    }

    .advanced-settings-toggle {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 10px 0 18px;
      padding: 10px 12px;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;

      .ant-btn-link {
        height: auto;
        padding: 0;
        font-weight: 600;
      }

      small {
        color: #64748b;
        line-height: 1.5;
      }
    }
  }

  .commercial-license-notice {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-top: 24px;
    padding: 16px 18px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fafafa;

    .license-icon {
      margin-top: 3px;
      color: #6b7280;
      font-size: 18px;
    }

    .license-body {
      min-width: 0;
      color: #6b7280;
      line-height: 1.65;

      strong {
        display: block;
        margin-bottom: 4px;
        color: #252525;
        font-size: 14px;
      }

      p {
        margin: 0 0 6px;
      }
    }

    .contact-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--primary-color, #1890ff);
      text-decoration: none;

      &:hover {
        color: var(--primary-color-active, #096dd9);
        text-decoration: underline;
      }
    }
  }

  .openrouter-balance-card {
    margin-bottom: 20px;

    .ant-card {
      background: linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%);
      border: 1px solid #91d5ff;
      border-radius: 8px;
    }

    .balance-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .balance-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--primary-color, #1890ff);
      }
    }

    .balance-info {
      padding: 8px 0;

      ::v-deep .ant-statistic-title {
        font-size: 12px;
        color: #666;
      }

      ::v-deep .ant-statistic-content {
        font-size: 18px;
      }

      .free-tier-badge {
        margin-top: 12px;
        text-align: right;
      }
    }

    .balance-empty {
      color: #8c8c8c;
      font-size: 13px;
      padding: 8px 0;
    }
  }

  .ai-settings-panel {
    .ai-provider-status {
      display: flex;
      align-items: center;
      gap: 9px;
      min-height: 42px;
      margin-bottom: 20px;
      padding: 9px 12px;
      border: 1px solid #dbeafe;
      border-radius: 9px;
      background: #f8fbff;
      color: #334155;
      font-size: 13px;

      .ai-provider-status-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 22px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #e6f7ff;
        color: #08979c;
      }

      strong {
        color: #1e3a5f;
        white-space: nowrap;
      }

      .ant-tag {
        margin: 0;
      }

      .ai-provider-status-copy {
        min-width: 0;
        color: #64748b;
      }
    }

    .ai-settings-section {
      margin-bottom: 22px;
      padding: 18px 18px 4px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #ffffff;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .ai-section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;

      h4 {
        margin: 0 0 4px;
        color: #1e3a5f;
        font-size: 15px;
        font-weight: 700;
      }

      p {
        margin: 0;
        color: #64748b;
        font-size: 12px;
        line-height: 1.6;
      }
    }
  }

  .settings-form {
    ::v-deep .ant-form-item-label {
      padding-bottom: 4px;

      label {
        color: #475569;
        font-weight: 500;
      }

      .form-label-with-tooltip {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;

        .label-text {
          color: #475569;
          font-weight: 500;
        }

        .help-icon {
          font-size: 14px;
          color: #94a3b8;
          cursor: help;
          transition: color 0.2s;

          &:hover {
            color: var(--primary-color, #1890ff);
          }
        }

        .api-link {
          font-size: 12px;
          font-weight: 400;
          color: var(--primary-color, #1890ff);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, transparent);
          border-radius: 4px;
          transition: all 0.2s;
          margin-left: 4px;

          &:hover {
            background: color-mix(in srgb, var(--primary-color, #1890ff) 15%, transparent);
            color: var(--primary-color-active, #096dd9);
          }

          .anticon {
            font-size: 11px;
          }
        }
      }
    }

    ::v-deep .ant-input,
    ::v-deep .ant-input-number,
    ::v-deep .ant-select-selection {
      border-radius: 8px;
    }

    ::v-deep .ant-input-number {
      width: 100%;
    }

    .password-field {
      ::v-deep .secret-masked-input {
        -webkit-text-security: disc;
        font-family: text-security-disc, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .field-hint {
        margin-top: 4px;
        font-size: 12px;
        color: @success-color;
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }

    .field-default {
      margin-top: 4px;
      font-size: 12px;
      color: #94a3b8;
    }

    .market-module-grid {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .market-module-row {
      min-height: 136px;
      padding: 14px 15px;
      border: 1px solid #e7e7e7;
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
      transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.2s;

      &:hover {
        border-color: rgba(19, 194, 194, 0.46);
        background: #fdfefe;
        box-shadow: 0 7px 18px rgba(15, 23, 42, 0.055);
        transform: translateY(-1px);
      }
    }

    .market-module-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .market-module-label {
      color: #1f2937;
      font-weight: 700;
    }

    .market-module-desc {
      min-height: 34px;
      color: #64748b;
      font-size: 12px;
      line-height: 1.45;
    }

    .market-module-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
      color: #6b7280;
      font-size: 12px;
    }

    .market-data-source-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }

    .market-data-source {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 7px;
      border: 1px solid #dbeafe;
      border-radius: 4px;
      color: #2563eb;
      background: #eff6ff;
      font-size: 11px;

      small {
        color: #64748b;
      }

      &.configured {
        border-color: #bbf7d0;
        color: #15803d;
        background: #f0fdf4;
      }

      &.missing {
        border-color: #fed7aa;
        color: #c2410c;
        background: #fff7ed;
      }
    }

    .market-settings-layout {
      align-items: flex-start;
    }

    .market-modules-column,
    .trading-venues-column {
      ::v-deep .ant-form-item-label {
        padding-bottom: 9px;
      }

      ::v-deep .ant-form-item-label > label {
        color: #374151;
        font-size: 13px;
        font-weight: 700;
      }
    }

    .trading-venue-notice {
      display: flex;
      align-items: flex-start;
      gap: 11px;
      margin-bottom: 18px;
      padding: 12px 14px;
      border: 1px solid #e7e7e7;
      border-left: 3px solid #13c2c2;
      border-radius: 8px;
      background: #fafafa;
    }

    .trading-venue-notice-icon {
      display: inline-flex;
      width: 28px;
      height: 28px;
      flex: 0 0 28px;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: #08979c;
      background: rgba(19, 194, 194, 0.1);
      font-size: 14px;
    }

    .trading-venue-notice-copy {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 3px;

      strong {
        color: #27313d;
        font-size: 13px;
        line-height: 1.45;
      }

      small {
        color: #687386;
        font-size: 11px;
        line-height: 1.55;
      }
    }

    .trading-venue-selector {
      width: 100%;
    }

    .trading-venue-group + .trading-venue-group {
      margin-top: 20px;
    }

    .trading-venue-group-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .trading-venue-group h4 {
      margin: 0;
      color: #334155;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
    }

    .trading-venue-group-line {
      height: 1px;
      flex: 1;
      background: #ececec;
    }

    .trading-venue-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .trading-venue-card {
      display: flex;
      min-width: 0;
      min-height: 78px;
      align-items: center;
      gap: 11px;
      padding: 12px 13px;
      border: 1px solid #e7e7e7;
      border-radius: 10px;
      background: #fff;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
      transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.2s;

      &:hover {
        border-color: rgba(19, 194, 194, 0.46);
        background: #fdfefe;
        box-shadow: 0 7px 18px rgba(15, 23, 42, 0.055);
        transform: translateY(-1px);
      }
    }

    .trading-venue-copy {
      display: flex;
      min-width: 0;
      flex: 1;
      flex-direction: column;
      gap: 3px;

      strong {
        overflow: hidden;
        color: #1e293b;
        font-size: 13px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      small {
        color: #64748b;
        font-size: 11px;
        line-height: 1.4;
      }
    }

    .ai-section-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 9px;
      flex: 0 0 auto;
      color: #64748b;
      font-size: 12px;

      .ant-tag {
        margin: 0;
      }
    }
  }

  .settings-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px 24px;
    background: #fff;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    z-index: 100;

    .ant-btn {
      min-width: 100px;
      height: 40px;
      border-radius: 8px;
      font-weight: 500;
    }
  }

  &.theme-dark {
    background: #0f0f10;

    .restart-alert {
      background: #1c1c1c;
      border-color: #b08800;
    }

    .commercial-license-notice {
      border-color: rgba(255, 255, 255, 0.1);
      background: #1b1b1b;

      .license-icon { color: #8c8c8c; }
      .license-body {
        color: #a3a3a3;

        strong { color: #e5e5e5; }
      }
      .contact-link {
        color: var(--primary-color, #13c2c2);
        &:hover { color: var(--primary-color-active, #36cfc9); }
      }
    }

    .settings-nav {
      background: #181818;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

      ::v-deep .ant-menu-item {
        color: #c9d1d9;
        .anticon { color: #8b949e; }

        &:hover {
          background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent);
          color: var(--primary-color, #1890ff);
          .anticon { color: var(--primary-color, #1890ff); }
        }

        &.ant-menu-item-selected {
          background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 18%, transparent), rgba(19, 194, 194, 0.10));
          color: var(--primary-color, #1890ff);
          .anticon { color: var(--primary-color, #1890ff); }
        }
      }

      ::v-deep .ant-menu-item-group-title {
        color: #6e7681;
      }
    }

    .settings-detail {
      background: #181818;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

      .detail-header {
        border-bottom-color: rgba(255, 255, 255, 0.08);

        .detail-icon { color: var(--primary-color, #1890ff); }
        .detail-title { color: #e0e6ed; }
      }

      .search-result-group-tag {
        background: color-mix(in srgb, var(--primary-color, #1890ff) 18%, transparent);
        color: var(--primary-color, #1890ff);
      }

      .settings-subsection-heading {
        border-top-color: rgba(255, 255, 255, 0.08);
        background: #202020;

        span {
          color: #e0e6ed;
        }

        small {
          color: #8b949e;
        }

        ::v-deep .ant-tag {
          border-color: rgba(255, 255, 255, 0.16) !important;
          color: #c9d1d9 !important;
          background: #202020 !important;
        }

        ::v-deep .ant-tag-green {
          border-color: rgba(82, 196, 26, 0.34) !important;
          color: #7ee787 !important;
          background: rgba(82, 196, 26, 0.12) !important;
        }

        ::v-deep .ant-tag-blue {
          border-color: rgba(64, 169, 255, 0.34) !important;
          color: #79c0ff !important;
          background: rgba(64, 169, 255, 0.12) !important;
        }

        ::v-deep .ant-tag-purple {
          border-color: rgba(179, 127, 235, 0.34) !important;
          color: #d2a8ff !important;
          background: rgba(179, 127, 235, 0.12) !important;
        }
      }

      .report-source-status {
        border-color: rgba(82, 196, 26, 0.24);
        background: linear-gradient(135deg, rgba(82, 196, 26, 0.1) 0%, #202020 62%);
      }

      .report-source-status-head {
        strong {
          color: #e6edf3;
        }

        p {
          color: #8b949e;
        }
      }

      .report-source-metric {
        border-color: rgba(255, 255, 255, 0.1);
        background: rgba(20, 20, 20, 0.72);

        span {
          color: #8b949e;

          small {
            color: #6e7681;
          }
        }

        strong {
          color: #7ee787;
        }
      }

      .advanced-settings-toggle {
        border-color: rgba(255, 255, 255, 0.14);
        background: #141414;

        small {
          color: #8b949e;
        }
      }
    }

    .ai-settings-panel {
      .ai-provider-status {
        border-color: rgba(24, 144, 255, 0.28);
        background: rgba(24, 144, 255, 0.08);
        color: #c9d1d9;

        .ai-provider-status-icon {
          background: rgba(19, 194, 194, 0.16);
          color: #5cdbd3;
        }

        strong {
          color: #e0e6ed;
        }

        .ai-provider-status-copy {
          color: #8b949e;
        }
      }

      .ai-settings-section {
        background: #141414;
        border-color: #2a2a2a;
      }

      .ai-section-header {
        border-bottom-color: rgba(255, 255, 255, 0.08);

        h4 {
          color: #e0e6ed;
        }

        p {
          color: #8b949e;
        }
      }

      .ai-section-actions {
        color: #8b949e;
      }
    }

    ::v-deep .ant-alert-info {
      background: #141414 !important;
      border-color: #2a2a2a !important;
      color: rgba(255, 255, 255, 0.82) !important;
    }

    ::v-deep .ant-alert-info .ant-alert-message,
    ::v-deep .ant-alert-info .ant-alert-description {
      color: rgba(255, 255, 255, 0.82) !important;
    }

    .settings-form {
      ::v-deep .ant-form-item-label {
        label {
          color: #c9d1d9;
        }

        .form-label-with-tooltip {
          .label-text {
            color: #c9d1d9;
          }

          .help-icon {
            color: #6e7681;

            &:hover {
              color: var(--primary-color, #1890ff);
            }
          }

          .api-link {
            background: color-mix(in srgb, var(--primary-color, #1890ff) 15%, transparent);
            color: var(--primary-color, #1890ff);

            &:hover {
              background: color-mix(in srgb, var(--primary-color, #1890ff) 25%, transparent);
            }
          }
        }
      }

      ::v-deep .ant-input,
      ::v-deep .ant-input-password,
      ::v-deep .ant-input-number,
      ::v-deep .ant-select-selection {
        background: #141414;
        border-color: #2a2a2a;
        color: #c9d1d9;

        &:hover,
        &:focus {
          border-color: var(--primary-color, #1890ff);
        }
      }

      ::v-deep .ant-input-number-input {
        background: transparent;
        color: #c9d1d9;
      }

      ::v-deep .ant-select-arrow {
        color: #8b949e;
      }

      // Input trailing icons in dark mode (eye/clear/spinner) should stay readable
      ::v-deep .ant-input-suffix .anticon,
      ::v-deep .ant-input-clear-icon,
      ::v-deep .ant-input-clear-icon .anticon,
      ::v-deep .ant-input-number-handler-wrap {
        color: #8b949e;
      }

      ::v-deep .ant-input-suffix .anticon:hover,
      ::v-deep .ant-input-clear-icon:hover,
      ::v-deep .ant-input-number-handler:hover .ant-input-number-handler-up-inner,
      ::v-deep .ant-input-number-handler:hover .ant-input-number-handler-down-inner {
        color: var(--primary-color, #1890ff);
      }

      .field-default {
        color: #6e7681;
      }

      .market-module-row {
        border-color: rgba(255, 255, 255, 0.09);
        background: #141414;
        box-shadow: none;

        &:hover {
          border-color: rgba(19, 194, 194, 0.48);
          background: #171919;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
        }
      }

      .market-module-label {
        color: #e0e6ed;
      }

      .market-module-desc,
      .market-module-meta {
        color: #8b949e;
      }

      .market-data-source {
        border-color: color-mix(in srgb, var(--primary-color, #1890ff) 25%, transparent);
        color: var(--primary-color-hover, #79c0ff);
        background: color-mix(in srgb, var(--primary-color, #1890ff) 10%, transparent);

        small {
          color: #8b949e;
        }

        &.configured {
          border-color: rgba(63, 185, 80, 0.35);
          color: #7ee787;
          background: rgba(46, 160, 67, 0.12);
        }

        &.missing {
          border-color: rgba(210, 153, 34, 0.35);
          color: #f2cc60;
          background: rgba(187, 128, 9, 0.12);
        }
      }

      .market-modules-column,
      .trading-venues-column {
        ::v-deep .ant-form-item-label > label {
          color: #d6d9de;
        }
      }

      .trading-venue-notice {
        border-color: rgba(255, 255, 255, 0.09);
        border-left-color: #13c2c2;
        background: #141414;
      }

      .trading-venue-notice-icon {
        color: #36cfc9;
        background: rgba(19, 194, 194, 0.12);
      }

      .trading-venue-notice-copy {
        strong { color: #e4e7eb; }
        small { color: #8f98a5; }
      }

      .trading-venue-group h4 {
        color: #cfd4da;
      }

      .trading-venue-group-line {
        background: rgba(255, 255, 255, 0.08);
      }

      .trading-venue-card {
        border-color: rgba(255, 255, 255, 0.09);
        background: #141414;
        box-shadow: none;

        &:hover {
          border-color: rgba(19, 194, 194, 0.48);
          background: #171919;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
        }
      }

      .trading-venue-copy {
        strong { color: #e0e6ed; }
        small { color: #8b949e; }
      }
    }

    .settings-footer {
      background: #1c1c1c;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.25);
    }
  }
}

@media (max-width: 768px) {
  .settings-page {
    padding: 12px !important;
    padding-bottom: 104px !important;

    .settings-layout {
      flex-direction: column;
      gap: 12px;
    }

    .settings-nav {
      flex: 0 0 auto;
      position: static;
      width: 100%;
      max-height: 280px;
    }

    .trading-venue-grid {
      grid-template-columns: 1fr;
    }

    .market-module-grid {
      grid-template-columns: 1fr;
    }

    .settings-detail {
      padding: 16px;
    }

    .settings-footer {
      left: 0;
      padding: 12px 16px;
    }
  }
}

.market-catalog-panel {
  color: #1f2937;

  .catalog-action-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 16px;

    h4 { margin: 0 0 6px; font-size: 16px; color: #1f2937; }
    p { margin: 0; color: #8c8c8c; }
  }
  .catalog-page-header { align-items: center; margin-bottom: 20px; }
  .catalog-heading-copy { max-width: 720px; }
  .catalog-header-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 16px; }
  .catalog-last-sync {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    span { color: #8c8c8c; font-size: 11px; }
    strong { color: #4b5563; font-size: 12px; font-weight: 600; }
  }
  .catalog-health-card {
    display: grid;
    grid-template-columns: minmax(260px, 1.4fr) minmax(360px, 1fr);
    gap: 24px;
    padding: 18px 20px;
    border: 1px solid #dbe3ed;
    border-left: 4px solid #94a3b8;
    border-radius: 10px;
    background: #f8fafc;
  }
  .catalog-health-card.is-success { border-left-color: #22a06b; background: #f5fbf7; }
  .catalog-health-card.is-info { border-left-color: #1677ff; background: #f5f9ff; }
  .catalog-health-card.is-warning { border-left-color: #d97706; background: #fffaf0; }
  .catalog-health-card.is-error { border-left-color: #dc2626; background: #fff7f7; }
  .catalog-health-summary { display: flex; min-width: 0; align-items: flex-start; gap: 13px; }
  .catalog-health-summary > div { min-width: 0; }
  .catalog-health-summary strong { display: block; margin: 1px 0 4px; color: #1f2937; font-size: 15px; }
  .catalog-health-summary p { margin: 0; color: #667085; font-size: 12px; line-height: 1.6; }
  .catalog-health-icon {
    display: inline-flex;
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #e2e8f0;
    color: #64748b;
    font-size: 17px;
  }
  .is-success .catalog-health-icon { background: #dcfce7; color: #15803d; }
  .is-info .catalog-health-icon { background: #dbeafe; color: #1677ff; }
  .is-warning .catalog-health-icon { background: #fef3c7; color: #b45309; }
  .is-error .catalog-health-icon { background: #fee2e2; color: #dc2626; }
  .catalog-health-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: center;
    gap: 10px;
  }
  .catalog-health-metrics > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
    padding-left: 14px;
    border-left: 1px solid #dbe3ed;
  }
  .catalog-health-metrics span { overflow: hidden; color: #7b8794; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
  .catalog-health-metrics strong { color: #1f2937; font-size: 19px; line-height: 1.2; }
  .catalog-health-metrics .has-failures strong { color: #d97706; }
  .catalog-content-section {
    margin-top: 18px;
    padding: 18px;
    border: 1px solid #e5eaf0;
    border-radius: 10px;
    background: #fff;
  }
  .catalog-section-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
    h5 { margin: 0 0 4px; color: #1f2937; font-size: 14px; }
    p { margin: 0; color: #8c8c8c; font-size: 12px; }
  }
  .catalog-summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
    gap: 10px;
  }
  .catalog-summary-item {
    display: flex;
    min-width: 0;
    min-height: 82px;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    padding: 13px 14px;
    border: 1px solid #edf0f4;
    border-radius: 8px;
    background: #fafbfc;
    span { color: #7b8794; font-size: 11px; }
    strong { color: #243247; font-size: 20px; line-height: 1; }
  }
  .catalog-table-wrap { overflow-x: auto; }
  .catalog-table {
    width: 100%;
    border-collapse: collapse;
    th, td { padding: 11px 12px; text-align: left; border-bottom: 1px solid #edf0f4; }
    th { color: #7b8794; font-size: 11px; font-weight: 600; background: #f8fafc; white-space: nowrap; }
    td { color: #4b5563; font-size: 12px; }
    tbody tr:last-child td { border-bottom: 0; }
  }
  .catalog-market-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
  }
  .catalog-market-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 14px;
    border: 1px solid #e5eaf0;
    border-radius: 8px;
    background: #fafbfc;
    span { color: #667085; }
    strong { color: #1f2937; }
  }
  .catalog-failure-panel {
    margin-top: 18px;
    padding: 17px 18px;
    border: 1px solid #f3d09a;
    border-radius: 10px;
    background: #fffbf3;
    .catalog-section-heading h5 { color: #92400e; }
  }
  .catalog-failure-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .catalog-failure-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid #f5dfbb;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.7);
    strong { color: #78350f; font-size: 12px; text-transform: capitalize; }
    span { color: #8c8c8c; word-break: break-word; }
  }
  .catalog-section-divider { height: 1px; margin: 26px 0 20px; background: #edf0f4; }
  .universe-sync-list { display: flex; width: 100%; flex-direction: column; gap: 8px; }
  .universe-sync-capacity { margin-top: 4px; color: #8c8c8c; font-size: 12px; }
  .universe-sync-actions {
    display: flex;
    flex: 0 0 auto;
    align-items: flex-end;
    gap: 10px;
    label { display: flex; flex-direction: column; gap: 5px; }
    label > span { color: #8c8c8c; font-size: 11px; }
  }
  .universe-sync-row {
    display: grid;
    grid-template-columns: 24px minmax(170px, 1fr) 100px minmax(150px, 200px) 130px minmax(100px, auto) 112px;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid #f0f0f0;
    border-radius: 7px;
    background: #fff;
  }
  .universe-checkbox-spacer { width: 16px; }
  .universe-sync-row.is-hidden { opacity: 0.66; }
  .universe-sync-name,
  .universe-sync-row > div { display: flex; min-width: 0; flex-direction: column; }
  .universe-sync-row span { color: #8c8c8c; font-size: 11px; }
  .universe-sync-row strong { overflow: hidden; color: #1f2937; text-overflow: ellipsis; white-space: nowrap; }
  .universe-row-state { align-items: flex-start; gap: 3px; }
  .universe-row-state .ant-tag { margin: 0; }
  .universe-row-actions { flex-direction: row !important; justify-content: flex-end; }
  .universe-row-actions .ant-btn { padding: 0 7px; }
  .universe-delete-button { color: #ff4d4f; }
}

.system-universe-form {
  .system-universe-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  label { display: flex; min-width: 0; flex-direction: column; gap: 6px; }
  label > span { color: #596579; font-size: 12px; font-weight: 600; }
  .ant-select,
  .ant-calendar-picker { width: 100%; }
  .system-universe-members-field { margin-top: 16px; }
  .system-universe-members-field > span { display: flex; justify-content: space-between; }
  .system-universe-members-field small { color: #8c8c8c; font-weight: 400; }
  .system-universe-form-hint { margin: 7px 0 0; color: #8c8c8c; font-size: 12px; }
}

.theme-dark .market-catalog-panel {
  color: #e6edf3;

  .catalog-action-row h4,
  .catalog-section-heading h5,
  .catalog-table td,
  .catalog-market-item,
  .catalog-market-item strong,
  .catalog-health-summary strong,
  .catalog-health-metrics strong,
  .catalog-summary-item strong {
    color: #e6edf3;
  }
  .catalog-last-sync strong { color: #c4ccd6; }
  .catalog-health-card,
  .catalog-health-card.is-success,
  .catalog-health-card.is-info,
  .catalog-health-card.is-warning,
  .catalog-health-card.is-error {
    border-color: rgba(255, 255, 255, 0.11);
    border-left-color: #65758b;
    background: #17191c;
  }
  .catalog-health-card.is-success { border-left-color: #3fb950; }
  .catalog-health-card.is-info { border-left-color: #58a6ff; }
  .catalog-health-card.is-warning { border-left-color: #d29922; }
  .catalog-health-card.is-error { border-left-color: #f85149; }
  .catalog-health-summary p,
  .catalog-health-metrics span,
  .catalog-summary-item span,
  .catalog-section-heading p { color: #8b949e; }
  .catalog-health-metrics > div { border-left-color: rgba(255, 255, 255, 0.1); }
  .catalog-content-section { border-color: rgba(255, 255, 255, 0.1); background: #121416; }
  .catalog-summary-item { border-color: rgba(255, 255, 255, 0.08); background: #181b1f; }
  .catalog-table th {
    color: #9da7b3;
    background: #181818;
  }
  .catalog-table td { background: #141414; }
  .catalog-table th,
  .catalog-table td,
  .catalog-market-item { border-color: rgba(255, 255, 255, 0.1); }
  .catalog-market-item { background: #141414; }
  .catalog-action-row p { color: #8b949e; }
  .catalog-failure-panel { border-color: rgba(210, 153, 34, 0.35); background: #211c12; }
  .catalog-failure-panel .catalog-section-heading h5,
  .catalog-failure-item strong { color: #e3b341; }
  .catalog-failure-item { border-color: rgba(210, 153, 34, 0.24); background: #181713; }
  .catalog-failure-item span { color: #b7aa8a; }
  .catalog-section-divider { background: rgba(255, 255, 255, 0.1); }
  .universe-sync-row { border-color: rgba(255, 255, 255, 0.1); background: #141414; }
  .universe-sync-row strong { color: #e6edf3; }
  .universe-sync-row span { color: #8b949e; }
  .universe-sync-capacity,
  .universe-sync-actions label > span { color: #8b949e; }

  ::v-deep .system-universe-form label > span { color: #b8c0cc; }
}

@media (max-width: 768px) {
  .market-catalog-panel {
    .catalog-action-row { flex-direction: column; }
    .catalog-action-row .ant-btn { width: 100%; }
    .catalog-header-actions { width: 100%; flex-direction: column; align-items: stretch; }
    .catalog-last-sync { align-items: flex-start; }
    .catalog-health-card { grid-template-columns: 1fr; }
    .catalog-health-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .catalog-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .catalog-failure-grid { grid-template-columns: 1fr; }
    .universe-sync-actions { width: 100%; align-items: stretch; flex-direction: column; }
    .universe-sync-row { grid-template-columns: 24px minmax(0, 1fr) auto; }
    .universe-sync-row > div:not(.universe-sync-name):not(.universe-row-actions) { display: none; }
    .system-universe-form .system-universe-form-grid { grid-template-columns: 1fr; }
  }
}

.billing-plan-manager {
  margin-bottom: 20px;
  background: #fff;

  .billing-card-description {
    margin: 0 0 16px;
    color: var(--qd-text-muted, #6b7280);
    line-height: 1.6;
  }
  .billing-plan-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-top: 14px;
  }
  .billing-plan-card {
    min-width: 0;
    padding: 16px;
    border: 1px solid #e7ebf0;
    border-radius: 10px;
    background: #fafafa;
  }
  .billing-plan-card-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .billing-plan-code { width: 150px; }
  .billing-plan-card-badges {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
  }
  .billing-plan-copy {
    display: grid;
    gap: 8px;
    margin-bottom: 14px;
  }
  .billing-plan-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;

    label { min-width: 0; }
    label > span {
      display: block;
      min-height: 34px;
      margin-bottom: 5px;
      color: #697386;
      font-size: 12px;
      line-height: 1.4;
    }
    .ant-input,
    .ant-input-number { width: 100%; }
  }
  .billing-plan-flags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid #edf0f4;

    .ant-checkbox-wrapper { margin-left: 0; }
  }
  .plan-remove { color: #ff4d4f; }
  .billing-plan-actions { display: flex; justify-content: flex-end; margin-top: 14px; }
}

.referral-settings-form { margin-top: 16px; }
.referral-dependent-settings {
  padding-top: 14px;
  border-top: 1px solid var(--qd-border-color, #edf0f4);
}
.referral-disabled-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--primary-color, #1890ff) 5%, transparent);
  color: var(--qd-text-muted, #6b7280);
}
.deployment-only-tag { margin-left: 8px; }
.referral-level-cap {
  margin-left: 8px;
  border-color: color-mix(in srgb, var(--primary-color, #1890ff) 30%, transparent);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 9%, transparent);
  color: var(--primary-color, #1890ff);
  font-size: 11px;
  font-weight: 500;
}
.referral-rate-help {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 6px;
  color: var(--qd-text-muted, #6b7280) !important;
  font-size: 12px;
  line-height: 1.5;

  .anticon { margin-top: 3px; }
}

.theme-dark .billing-plan-manager {
  background: #181818;
  color: #e6edf3;

  ::v-deep .ant-card-head {
    color: #e6edf3;
    border-color: rgba(255, 255, 255, 0.1);
  }
  ::v-deep .ant-card-head-title,
  ::v-deep .ant-checkbox-wrapper,
  ::v-deep .ant-checkbox-wrapper span:last-child {
    color: #e6edf3;
  }
  ::v-deep .ant-input,
  ::v-deep .ant-input-number {
    color: #e6edf3;
    background: #151515;
    border-color: rgba(255, 255, 255, 0.16);
  }
  ::v-deep .ant-input-number-input {
    color: #e6edf3;
    background: transparent;
  }
  ::v-deep .ant-input::placeholder,
  ::v-deep .ant-input-number-input::placeholder {
    color: #6f7a86;
  }
  ::v-deep .ant-input[disabled],
  ::v-deep .ant-input-number-disabled {
    color: #8b949e;
    background: #242424;
  }
  ::v-deep .ant-alert-info {
    background: color-mix(in srgb, var(--primary-color, #1890ff) 9%, #11151a);
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 32%, transparent);
  }
  ::v-deep .ant-alert-info .ant-alert-message {
    color: #c9d1d9;
  }
  .referral-rate-help {
    color: #9da7b3 !important;
  }
  .billing-card-description,
  .billing-plan-metrics label > span,
  .referral-disabled-note { color: #9da7b3; }
  .billing-plan-card {
    border-color: rgba(255, 255, 255, 0.1);
    background: #121212;
  }
  .billing-plan-flags,
  .referral-dependent-settings {
    border-color: rgba(255, 255, 255, 0.1);
  }
  .referral-disabled-note {
    background: rgba(255, 255, 255, 0.04);
  }
}

@media (max-width: 1180px) {
  .billing-plan-manager {
    .billing-plan-grid { grid-template-columns: 1fr; }
  }
}

@media (max-width: 640px) {
  .billing-plan-manager {
    .billing-plan-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .billing-plan-code { width: 120px; }
  }
}

</style>
