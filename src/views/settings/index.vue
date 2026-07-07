<template>
  <div class="settings-page" :class="{ 'theme-dark': isDarkTheme }">
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

    <div class="settings-header">
      <h2 class="page-title">
        <a-icon type="setting" />
        <span>{{ $t('settings.title') }}</span>
      </h2>
      <p class="page-desc">{{ $t('settings.description') }}</p>
    </div>

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
            <a-menu-item
              v-for="(group, groupKey) in sortedSchema"
              :key="groupKey"
            >
              <a-icon :type="group.icon || getGroupIcon(groupKey)" />
              <span>{{ getGroupTitle(groupKey, group.title) }}</span>
            </a-menu-item>
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
                          :placeholder="$t('settings.inputApiKey')"
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
                    <div class="field-default" v-if="entry.item.default && entry.item.type !== 'boolean' && entry.item.type !== 'password'">
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

            <a-form :form="form" layout="vertical" class="settings-form" autocomplete="off">
              <div v-if="activeGroupKey === 'ai'" class="ai-settings-panel">
                <a-alert
                  class="ai-provider-alert"
                  type="info"
                  show-icon
                  :message="aiProviderAlertTitle"
                  :description="aiProviderAlertDesc"
                />

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
                    <a-tag v-if="section.badge" :color="section.badgeColor || 'blue'">
                      {{ section.badge }}
                    </a-tag>
                  </div>

                  <a-row :gutter="24">
                    <a-col
                      v-for="entry in section.entries"
                      :key="entry.key"
                      :xs="24"
                      :sm="24"
                      :md="entry.type === 'heading' ? 24 : (entry.item.key === 'LLM_PROVIDER' ? 24 : 12)"
                      :lg="entry.type === 'heading' ? 24 : (entry.item.key === 'LLM_PROVIDER' ? 24 : 12)"
                    >
                      <div v-if="entry.type === 'heading'" class="settings-subsection-heading">
                        <span>{{ entry.title }}</span>
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
                              :placeholder="$t('settings.inputApiKey')"
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
                        <div class="field-default" v-if="entry.item.default && entry.item.type !== 'boolean' && entry.item.type !== 'password'">
                          {{ $t('settings.default') }}: {{ entry.item.default }}
                        </div>
                      </a-form-item>
                    </a-col>
                  </a-row>
                </section>
              </div>

              <a-row v-else :gutter="24">
                <a-col
                  v-for="entry in currentDisplayEntries"
                  :key="entry.key"
                  :xs="24"
                  :sm="24"
                  :md="entry.type === 'heading' ? 24 : 12"
                  :lg="entry.type === 'heading' ? 24 : 12"
                >
                  <div v-if="entry.type === 'heading'" class="settings-subsection-heading">
                    <span>{{ entry.title }}</span>
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
                          :placeholder="$t('settings.inputApiKey')"
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
                    <div class="field-default" v-if="entry.item.default && entry.item.type !== 'boolean' && entry.item.type !== 'password'">
                      {{ $t('settings.default') }}: {{ entry.item.default }}
                    </div>
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>

            <!-- Brand group footer: commercial license notice. Shown only
                 under "Brand & Identity" so it's visible right where an
                 operator sets up their fork. -->
            <div v-if="activeGroupKey === 'brand'" class="commercial-license-notice">
              <a-alert
                type="warning"
                show-icon
                :message="$t('settings.commercialLicense.title')"
              >
                <div slot="description" class="license-body">
                  <p>{{ $t('settings.commercialLicense.body') }}</p>
                  <p class="license-contact">
                    <span class="contact-label">{{ $t('settings.commercialLicense.contactLabel') }}:</span>
                    <a
                      href="https://www.quantdinger.com/#license"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="contact-link"
                    >
                      <a-icon type="link" /> {{ $t('settings.commercialLicense.applyLink') }}
                    </a>
                  </p>
                </div>
              </a-alert>
            </div>
          </div>
        </section>
      </div>
    </a-spin>

    <div class="settings-footer">
      <a-button @click="handleReset" :disabled="saving">
        <a-icon type="undo" />
        {{ $t('settings.reset') }}
      </a-button>
      <a-button type="primary" @click="handleSave" :loading="saving">
        <a-icon type="save" />
        {{ $t('settings.save') }}
      </a-button>
    </div>
  </div>
</template>

<script>
import { getSettingsSchema, getSettingsValues, saveSettings, getOpenRouterBalance } from '@/api/settings'
import { getMarketModules } from '@/api/marketModules'
import { baseMixin } from '@/store/app-mixin'

export default {
  name: 'Settings',
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
      showRestartTip: false,
      balanceLoading: false,
      openrouterBalance: null,
      selectedLlmProvider: '',
      settingsInputNonce: Math.random().toString(36).slice(2, 10)
    }
  },
  computed: {
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    sortedSchema () {
      const entries = Object.entries(this.schema)
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
    // Currently selected group object (right-side detail content).
    currentGroup () {
      return this.sortedSchema[this.activeGroupKey] || null
    },
    currentDisplayEntries () {
      const items = this.currentGroup && Array.isArray(this.currentGroup.items)
        ? this.currentGroup.items
        : []
      return this.buildSettingEntries(items)
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
    aiProviderAlertTitle () {
      return this.tOr('settings.llm.currentProviderTitle', 'Current provider: {provider}')
        .replace('{provider}', this.currentLlmProviderLabel)
    },
    aiProviderAlertDesc () {
      return this.tOr(
        'settings.llm.currentProviderDesc',
        'Switching providers keeps the other provider settings saved; switch back anytime to edit them.'
      )
    },
    aiSections () {
      const providerSelection = this.aiItems.filter(item => item.key === 'LLM_PROVIDER')
      const providerItems = this.aiItems.filter(item => item.group === this.currentLlmProvider)
      const commonItems = this.aiItems.filter(item => {
        if (item.key === 'LLM_PROVIDER' || item.group || this.isSearchSetting(item)) return false
        return true
      })
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
          key: 'common',
          title: this.tOr('settings.llm.commonSection', 'Common AI parameters'),
          description: this.tOr('settings.llm.commonSectionDesc', 'Shared behavior used across providers.'),
          items: commonItems
        }
      ]
        .filter(section => section.items.length > 0)
        .map(section => ({
          ...section,
          entries: this.buildSettingEntries(section.items)
        }))
    }
  },
  beforeCreate () {
    this.form = this.$form.createForm(this)
  },
  mounted () {
    this.loadSettings()
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
    buildSettingEntries (items) {
      const basicItems = (items || []).filter(item => !item.is_advanced)
      const advancedItems = (items || []).filter(item => item.is_advanced)
      const entries = basicItems.map(item => ({
        type: 'field',
        key: `field-${item.key}`,
        item
      }))

      if (advancedItems.length > 0) {
        entries.push({
          type: 'heading',
          key: 'advanced-heading',
          title: this.tOr('settings.advanced.title', 'More settings'),
          description: this.tOr(
            'settings.advanced.description',
            'Optional integrations, endpoints, and tuning controls remain available here.'
          )
        })
        entries.push(...advancedItems.map(item => ({
          type: 'field',
          key: `advanced-${item.key}`,
          item
        })))
      }

      return entries
    },
    onSelectFieldChange (item, value) {
      if (item && item.key === 'LLM_PROVIDER') {
        this.selectedLlmProvider = value || 'openrouter'
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
        const [schemaRes, valuesRes, marketModulesRes] = await Promise.all([
          getSettingsSchema(),
          getSettingsValues(),
          getMarketModules().catch(() => null)
        ])

        if (schemaRes.code === 1) {
          this.schema = schemaRes.data
        }

        if (valuesRes.code === 1) {
          this.values = valuesRes.data
          this.selectedLlmProvider = (this.values.ai && this.values.ai.LLM_PROVIDER) || 'openrouter'
        }

        if (marketModulesRes && marketModulesRes.code === 1 && marketModulesRes.data) {
          this.marketModules = marketModulesRes.data.markets || []
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
        brand: 'crown',
        contact: 'customer-service',
        social: 'team',
        legal: 'safety-certificate',
        auth: 'lock',
        email: 'mail',
        sms: 'phone',
        network: 'global',
        app: 'appstore',
        ai: 'robot',
        trading: 'stock',
        market_modules: 'appstore',
        data_source: 'database',
        search: 'search',
        agent: 'experiment',
        security: 'safety',
        billing: 'dollar'
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
      return translated !== key ? translated : item.label
    },

    getItemDescription (groupKey, item) {
      const key = `settings.desc.${item.key}`
      const translated = this.$t(key)
      if (translated !== key) {
        return translated
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
      const cmd = 'cd backend_api_python && py run.py'
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
              if (item.key in formValues) {
                let value = formValues[item.key]
                if (item.type === 'boolean') {
                  value = value ? 'True' : 'False'
                } else if (item.type === 'market_multiselect') {
                  value = Array.isArray(value) ? value.join(',') : String(value || '')
                }
                data[groupKey][item.key] = value
              }
            }
          }

          const res = await saveSettings(data)
          if (res.code === 1) {
            this.$message.success(res.msg || this.$t('settings.saveSuccess'))
            if (res.data && res.data.requires_restart) {
              this.showRestartTip = true
            }
            this.loadSettings()
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
  padding: 16px !important;
  padding-bottom: 104px;
  min-height: calc(100vh - 120px);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);

  .restart-alert {
    margin-bottom: 16px;
    border-radius: 8px;
  }

  .settings-header {
    margin-bottom: 24px;

    .page-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #1e3a5f;
      display: flex;
      align-items: center;
      gap: 12px;

      .anticon {
        font-size: 28px;
        color: var(--primary-color, #1890ff);
      }
    }

    .page-desc {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }
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
    top: 88px;
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
      padding-top: 18px;
      border-top: 1px solid #f1f5f9;

      span {
        display: block;
        color: #1e3a5f;
        font-size: 14px;
        font-weight: 700;
      }

      small {
        display: block;
        margin-top: 4px;
        color: #64748b;
        font-size: 12px;
        line-height: 1.6;
      }
    }
  }

  .commercial-license-notice {
    margin-top: 24px;

    .license-body {
      margin-top: 4px;
      line-height: 1.7;
      color: #5c4a16;

      p {
        margin: 0 0 8px 0;
      }

      p:last-child {
        margin-bottom: 0;
      }
    }

    .license-contact {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .contact-label {
      font-weight: 600;
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
    .ai-provider-alert {
      margin-bottom: 20px;
      border-radius: 8px;
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
        text-security: disc;
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
      gap: 12px;
    }

    .market-module-row {
      min-height: 132px;
      padding: 14px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #f8fafc;
      transition: border-color 0.2s, background 0.2s;

      &:hover {
        border-color: rgba(24, 144, 255, 0.45);
        background: #ffffff;
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
      color: #1e3a5f;
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
      color: #475569;
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
      .license-body {
        color: #f0d97a;
      }
      .contact-link {
        color: #69c0ff;
        &:hover { color: #91d5ff; }
      }
    }

    .settings-header {
      .page-title {
        color: #e0e6ed;
      }

      .page-desc {
        color: #8b949e;
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

        span {
          color: #e0e6ed;
        }

        small {
          color: #8b949e;
        }
      }
    }

    .ai-settings-panel {
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
        background: #161b22;
        border-color: rgba(255, 255, 255, 0.08);

        &:hover {
          border-color: color-mix(in srgb, var(--primary-color, #1890ff) 45%, transparent);
          background: #1f2630;
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

    .settings-detail {
      padding: 16px;
    }

    .settings-footer {
      left: 0;
      padding: 12px 16px;
    }
  }
}
</style>
