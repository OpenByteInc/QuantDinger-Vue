<template>
  <div class="quick-trade-panel-root">
    <component
      :is="embedded ? 'div' : 'a-drawer'"
      v-bind="containerProps"
      @close="handleClose"
      class="quick-trade-shell"
      :class="[embedded ? 'quick-trade-embedded' : 'quick-trade-drawer', { 'theme-dark': isDark, 'qt-embedded-ide': embedded && embeddedIde && !floatingConsole, 'qt-embedded-dock': embedded && embeddedDock && !floatingConsole, 'qt-embedded-side-dock': embedded && embeddedDock && sideDock && !floatingConsole, 'qt-console': floatingConsole, 'qt-floating-activity-open': floatingActivityExpanded }]"
    >
      <slot
        v-if="floatingConsole"
        name="console-header"
        :trade-mode="tradeMode"
        :select-trade-mode="selectTradeMode"
        :can-switch-market-type="canSwitchMarketType"
        :connected="Boolean(selectedCredentialId)"
      />
      <div v-show="!floatingConsole || !consoleMinimized" :class="{ 'qt-console-content': floatingConsole }">
      <template v-if="floatingConsole">
        <div class="qtc-account-row">
          <a-select
            v-model="selectedCredentialId"
            :placeholder="accountPlaceholder"
            :loading="credLoading"
            :get-popup-container="qtSelectPopupContainer"
            :dropdown-class-name="qtSelectDropdownClass"
            @change="onCredentialChange"
          >
            <a-select-option v-for="c in credentials" :key="c.id" :value="c.id">{{ formatCredentialOptionLabel(c) }}</a-select-option>
          </a-select>
          <a-button class="qtc-icon-button" :title="$t('quickTrade.addAccountInline')" :aria-label="$t('quickTrade.addAccountInline')" @click="handleAddAccountClick"><a-icon type="plus" /></a-button>
          <div class="qtc-balance"><span>{{ $t('quickTrade.available') }}</span><strong class="qtc-positive">{{ formatPrice(activeBalanceAvailable) }}</strong><span>{{ orderCurrency }}</span></div>
          <div class="qtc-balance"><span>{{ $t('quickTrade.totalAssets') }}</span><strong>{{ formatPrice(activeBalanceTotal) }}</strong><span>{{ orderCurrency }}</span></div>
          <a-button class="qtc-icon-button" :title="$t('common.refresh')" :aria-label="$t('common.refresh')" :loading="dockRefreshing" @click="refreshDockData"><a-icon type="reload" /></a-button>
        </div>
        <crypto-liquidity-arena
          v-if="isCryptoMarket"
          :symbol="currentSymbol"
          :exchange-id="activeCryptoExchangeId"
          :market-type="effectiveMarketType"
          :current-price="currentPrice"
          :order-notional="estimatedNotionalUsdt"
          :order-side="side"
          :active="visible && !consoleMinimized"
          :dark="isDark"
          @price-select="applyLiquidityPrice"
        />
        <div v-if="balanceErrorMessage" class="qtc-error">{{ balanceErrorMessage }}</div>
        <div v-if="strategyConflict" class="qtc-conflict" role="alert">
          <a-icon type="warning" />
          <span>{{ $t('quickTrade.workflow.strategyConflict', { id: strategyConflict.strategy_id || '-' }) }}</span>
        </div>
        <div class="qtc-ticket">
          <div class="qtc-quotes">
            <div class="qtc-quote qtc-quote-buy"><span>{{ buyActionText }}</span><strong>{{ currentPrice > 0 ? formatPrice(currentPrice) : '—' }}</strong></div>
            <a-radio-group v-model="orderType" button-style="solid" class="qtc-order-type">
              <a-radio-button value="market">{{ $t('quickTrade.market') }}</a-radio-button>
              <a-radio-button value="limit">{{ $t('quickTrade.limit') }}</a-radio-button>
            </a-radio-group>
            <div class="qtc-quote qtc-quote-sell"><span>{{ sellActionText }}</span><strong>{{ currentPrice > 0 ? formatPrice(currentPrice) : '—' }}</strong></div>
          </div>
          <div v-if="isSwapMode" class="qtc-fields">
            <div class="qtc-field-column">
              <label v-if="orderType === 'limit'" class="qtc-field"><span>{{ $t('quickTrade.limitPrice') }} ({{ orderCurrency }})</span><a-input-number
                v-model="limitPrice"
                :disabled="orderType === 'market'"
                :min="0"
                :step="priceStep"
                :precision="pricePrecision"
                :placeholder="orderType === 'market' ? $t('quickTrade.market') : $t('quickTrade.enterPrice')"
              /></label>
              <label class="qtc-field"><span>{{ amountLabel }} ({{ orderCurrency }})</span><a-input-number v-model="amount" :min="1" :step="10" :precision="2" :placeholder="$t('quickTrade.enterAmount')" /></label>
              <div class="qtc-percentages"><button v-for="percent in [10, 25, 50, 100]" :key="percent" type="button" :disabled="activeBalanceAvailable <= 0" @click="setQuickAmountByPercent(percent, 'buy')">{{ percent }}%</button></div>
            </div>
            <div class="qtc-field-column">
              <div class="qtc-settings">
                <div class="qtc-field qtc-leverage"><label>{{ $t('quickTrade.leverage') }}</label><a-input-number
                  v-model="leverage"
                  :aria-label="$t('quickTrade.leverage')"
                  :min="1"
                  :max="125"
                  :step="1"
                  :precision="0"
                  :formatter="value => `${value}x`"
                  :parser="value => value.replace(/[^0-9]/g, '')"
                  @blur="normalizeLeverage"
                /><a-slider
                  v-model="leverage"
                  :min="1"
                  :max="125"
                  :step="1"
                  :tip-formatter="value => `${value}x`"
                  :aria-label="$t('quickTrade.leverage')"
                /></div>
                <label class="qtc-field"><span>{{ $t('quickTrade.marginMode') }}</span><a-select v-model="marginMode" :get-popup-container="qtSelectPopupContainer" :dropdown-class-name="qtSelectDropdownClass"><a-select-option value="cross">{{ $t('quickTrade.crossMargin') }}</a-select-option><a-select-option value="isolated">{{ $t('quickTrade.isolatedMargin') }}</a-select-option></a-select></label>
              </div>
              <div class="qtc-field qtc-notional-field"><span>{{ $t('quickTrade.floating.notional') }} ({{ orderCurrency }})</span><strong class="qtc-notional">≈ {{ formatPrice(estimatedNotionalUsdt) }} {{ orderCurrency }}</strong></div>
            </div>
          </div>
          <template v-else>
            <label v-if="orderType === 'limit'" class="qtc-field qtc-spot-price"><span>{{ $t('quickTrade.limitPrice') }} ({{ orderCurrency }})</span><a-input-number v-model="limitPrice" :min="0" :step="priceStep" :precision="pricePrecision" :placeholder="$t('quickTrade.enterPrice')" /></label>
            <div class="qtc-fields qtc-spot-fields">
              <div class="qtc-field-column">
                <div class="qtc-spot-label"><strong class="qtc-positive">{{ buyActionText }}</strong><a-radio-group v-model="spotBuyInputMode" size="small"><a-radio-button value="quantity">{{ $t('quickTrade.byQuantity') }}</a-radio-button><a-radio-button value="amount">{{ $t('quickTrade.byAmount') }}</a-radio-button></a-radio-group></div>
                <label class="qtc-field"><span>{{ $t(spotBuyInputMode === 'quantity' ? 'quickTrade.buyQuantity' : 'quickTrade.buyAmount') }} ({{ spotBuyInputMode === 'quantity' ? baseAsset : orderCurrency }})</span><a-input-number
                  v-if="spotBuyInputMode === 'quantity'"
                  v-model="buyQuantity"
                  :min="0"
                  :step="0.001"
                  :precision="8"
                  :placeholder="$t('quickTrade.enterBuyQuantity')"
                /><a-input-number
                  v-else
                  v-model="amount"
                  :min="0"
                  :step="10"
                  :precision="2"
                  :placeholder="$t('quickTrade.enterAmount')"
                /></label>
                <div class="qtc-percentages"><button v-for="percent in [25, 50, 75, 100]" :key="percent" type="button" :disabled="activeBalanceAvailable <= 0" @click="setQuickAmountByPercent(percent, 'buy')">{{ percent }}%</button></div>
              </div>
              <div class="qtc-field-column">
                <div class="qtc-spot-label"><strong class="qtc-negative">{{ sellActionText }}</strong><a-radio-group v-model="spotSellInputMode" size="small"><a-radio-button value="quantity">{{ $t('quickTrade.byQuantity') }}</a-radio-button><a-radio-button value="amount">{{ $t('quickTrade.byAmount') }}</a-radio-button></a-radio-group></div>
                <label class="qtc-field"><span>{{ $t(spotSellInputMode === 'quantity' ? 'quickTrade.sellQuantity' : 'quickTrade.sellAmount') }} ({{ spotSellInputMode === 'quantity' ? baseAsset : orderCurrency }})</span><a-input-number
                  v-if="spotSellInputMode === 'quantity'"
                  v-model="sellQuantity"
                  :min="0"
                  :max="spotSellAvailable"
                  :step="0.001"
                  :precision="8"
                  :placeholder="$t('quickTrade.enterSellQuantity')"
                /><a-input-number
                  v-else
                  v-model="sellAmount"
                  :min="0"
                  :max="spotSellAvailableValue"
                  :step="10"
                  :precision="2"
                  :placeholder="$t('quickTrade.enterAmount')"
                /></label>
                <div class="qtc-percentages"><button v-for="percent in [25, 50, 75, 100]" :key="percent" type="button" :disabled="spotSellAvailable <= 0" @click="setQuickAmountByPercent(percent, 'sell')">{{ percent }}%</button></div>
              </div>
            </div>
          </template>
          <details v-if="supportsNativeProtection" class="qtc-entry-protection">
            <summary>{{ $t('quickTrade.workflow.entryProtection') }}<a-tooltip :title="$t('quickTrade.workflow.entryProtectionHint')"><a-icon type="info-circle" /></a-tooltip><span v-if="consoleTpEnabled || consoleSlEnabled" class="qtc-positive">{{ $t('quickTrade.workflow.enabled') }}</span></summary>
            <div class="qtc-protection">
            <div><a-checkbox v-model="consoleTpEnabled">{{ $t('quickTrade.floating.tp') }}</a-checkbox><a-input-number
              v-model="tpPrice"
              :disabled="!consoleTpEnabled"
              :min="0"
              :step="priceStep"
              :precision="pricePrecision"
              :placeholder="$t('quickTrade.tpPlaceholder')"
            /></div>
            <div><a-checkbox v-model="consoleSlEnabled">{{ $t('quickTrade.floating.sl') }}</a-checkbox><a-input-number
              v-model="slPrice"
              :disabled="!consoleSlEnabled"
              :min="0"
              :step="priceStep"
              :precision="pricePrecision"
              :placeholder="$t('quickTrade.slPlaceholder')"
            /></div>
            </div>
          </details>
          <div class="qtc-submit">
            <a-button class="qtc-buy" :loading="submittingSide === 'buy'" :disabled="!canSubmitBuy" @click="handleSubmit('buy')"><a-icon type="arrow-up" />{{ buyActionText }}</a-button>
            <a-button class="qtc-sell" :loading="submittingSide === 'sell'" :disabled="!canSubmitSell" @click="handleSubmit('sell')"><a-icon type="arrow-down" />{{ sellActionText }}</a-button>
          </div>
          <div v-if="tradeFeedback && tradeFeedback.text" class="qt-trade-feedback" :class="`qt-trade-feedback--${tradeFeedback.type}`" role="alert">
            <a-icon :type="tradeFeedback.type === 'warning' ? 'warning' : 'close-circle'" />
            <span>{{ tradeFeedback.text }}</span>
          </div>
        </div>
      </template>
      <!-- Header (hidden in embedded mode since parent tab already shows title) -->
      <div v-if="!embedded" class="qt-header">
        <div class="qt-header-left">
          <a-icon type="thunderbolt" theme="filled" class="qt-icon" />
          <span class="qt-header-title">{{ $t('quickTrade.title') }}</span>
        </div>
        <a-icon type="close" class="qt-close" @click="handleClose" />
      </div>

      <!-- Symbol & Price Bar -->
      <div v-if="!embeddedDock" class="qt-symbol-bar">
        <div v-if="symbolLocked" class="qt-symbol-summary">
          <div class="qt-symbol-summary-main">
            <span class="qt-symbol-label">{{ $t('quickTrade.syncedWithChart') }}</span>
            <strong class="qt-symbol-name">{{ currentSymbol || '-' }}</strong>
          </div>
          <a-tag class="qt-market-tag">{{ priceMarketParam }}</a-tag>
        </div>
        <div v-else class="qt-symbol-selector">
          <a-select
            v-model="currentSymbol"
            show-search
            :placeholder="$t('quickTrade.selectSymbol')"
            style="width: 100%"
            :filter-option="false"
            :not-found-content="symbolSearching ? null : undefined"
            :get-popup-container="qtSelectPopupContainer"
            :dropdown-class-name="qtSelectDropdownClass"
            @search="handleSymbolSearch"
            @change="handleSymbolChange"
            @focus="handleSymbolFocus"
            :loading="symbolSearching"
          >
            <a-icon slot="suffixIcon" type="search" style="color: #999" />
            <a-select-option
              v-for="item in symbolSuggestions"
              :key="item.value"
              :value="item.value"
            >
              <div class="qt-symbol-option">
                <span class="qt-symbol-option-name">{{ item.symbol }}</span>
                <span v-if="item.name" class="qt-symbol-option-desc">{{ item.name }}</span>
              </div>
            </a-select-option>
          </a-select>
        </div>
        <div class="qt-price-display" :class="priceChangeClass">
          <span class="qt-price-label">{{ $t('quickTrade.syncedPrice') }}</span>
          <span class="qt-current-price">${{ formatPrice(currentPrice) }}</span>
        </div>
      </div>

      <div v-if="embeddedDock && !floatingConsole" class="qt-dock-header">
        <template v-if="sideDock">
          <div class="qt-side-account-block">
            <div class="qt-side-section-heading">
              <span>{{ accountLabel }}</span>
              <span class="qt-dock-status" :class="{ 'is-connected': selectedCredentialId }">
                <i></i>{{ selectedCredentialId ? $t('quickTrade.connected') : accountPlaceholder }}
              </span>
            </div>
            <div class="qt-side-account-control">
              <a-select
                v-model="selectedCredentialId"
                class="qt-dock-account-select"
                :placeholder="accountPlaceholder"
                :get-popup-container="qtSelectPopupContainer"
                :dropdown-class-name="qtSelectDropdownClass"
                :loading="credLoading"
                :not-found-content="isStockMarket ? $t('quickTrade.noBrokerAccount') : $t('quickTrade.noExchange')"
                @change="onCredentialChange"
              >
                <a-select-option v-for="c in credentials" :key="c.id" :value="c.id">
                  {{ formatCredentialOptionLabel(c) }}
                </a-select-option>
              </a-select>
              <a-button class="qt-dock-icon-btn" :title="$t('quickTrade.addAccountInline')" @click="handleAddAccountClick"><a-icon type="plus" /></a-button>
            </div>
          </div>

          <div v-if="isCryptoMarket" class="qt-side-trade-controls">
            <div v-if="canSwitchMarketType" class="qt-dock-segmented qt-side-market-segmented">
              <button type="button" :class="{ active: tradeMode === 'spot' }" @click="selectTradeMode('spot')">{{ $t('quickTrade.spot') }}</button>
              <button type="button" :class="{ active: tradeMode === 'swap' }" @click="selectTradeMode('swap')">{{ $t('quickTrade.contractBadge') }}</button>
            </div>
            <div v-if="isSwapMode" class="qt-dock-trade-settings">
              <div class="qt-dock-segmented qt-dock-margin-segmented">
                <button type="button" :class="{ active: marginMode === 'cross' }" @click="marginMode = 'cross'">{{ $t('quickTrade.crossMargin') }}</button>
                <button type="button" :class="{ active: marginMode === 'isolated' }" @click="marginMode = 'isolated'">{{ $t('quickTrade.isolatedMargin') }}</button>
              </div>
              <a-popover trigger="click" placement="bottom" overlay-class-name="qt-leverage-popover" :get-popup-container="qtSelectPopupContainer">
                <template slot="content">
                  <div class="qt-leverage-editor">
                    <a-slider v-model="leverage" :min="1" :max="125" :marks="leverageMarks" :tipFormatter="v => v + 'x'" />
                    <div class="qt-leverage-presets">
                      <button v-for="value in leveragePresets" :key="value" type="button" :class="{ active: leverage === value }" @click="leverage = value">{{ value }}x</button>
                    </div>
                    <a-input-number v-model="leverage" :min="1" :max="125" :formatter="v => `${v}x`" :parser="v => String(v).replace('x', '')" />
                  </div>
                </template>
                <button type="button" class="qt-dock-leverage-trigger">
                  <span>{{ $t('quickTrade.leverage') }}</span><strong>{{ leverage }}x</strong><a-icon type="down" />
                </button>
              </a-popover>
            </div>
          </div>

          <div class="qt-side-balance-row">
            <div class="qt-dock-balance">
              <span>{{ isStockMarket ? $t('quickTrade.buyingPower') : (isSwapMode ? $t('quickTrade.swapAvailable') : $t('quickTrade.spotAvailable')) }}</span>
              <strong>{{ balanceLoading ? '...' : `$${formatPrice(activeBalanceAvailable)}` }}</strong>
            </div>
            <div class="qt-dock-balance qt-dock-balance--secondary">
              <span>{{ $t('quickTrade.totalAssets') }}</span>
              <strong>${{ formatPrice(activeBalanceTotal) }}</strong>
            </div>
            <a-button class="qt-dock-icon-btn" :title="$t('common.refresh')" :loading="dockRefreshing" @click="refreshDockData"><a-icon type="reload" /></a-button>
          </div>
        </template>

        <template v-else>
          <div class="qt-dock-account">
            <a-select
              v-model="selectedCredentialId"
              :placeholder="accountPlaceholder"
              :get-popup-container="qtSelectPopupContainer"
              :dropdown-class-name="qtSelectDropdownClass"
              :loading="credLoading"
              :not-found-content="isStockMarket ? $t('quickTrade.noBrokerAccount') : $t('quickTrade.noExchange')"
              @change="onCredentialChange"
            >
              <a-select-option v-for="c in credentials" :key="c.id" :value="c.id">
                {{ formatCredentialOptionLabel(c) }}
              </a-select-option>
            </a-select>
            <a-button class="qt-dock-icon-btn" :title="$t('quickTrade.addAccountInline')" @click="handleAddAccountClick"><a-icon type="plus" /></a-button>
          </div>
          <div v-if="isCryptoMarket && canSwitchMarketType" class="qt-dock-segmented">
            <button type="button" :class="{ active: tradeMode === 'spot' }" @click="selectTradeMode('spot')">{{ $t('quickTrade.spot') }}</button>
            <button type="button" :class="{ active: tradeMode === 'swap' }" @click="selectTradeMode('swap')">{{ $t('quickTrade.contractBadge') }}</button>
          </div>
          <div v-if="isSwapMode" class="qt-dock-trade-settings">
            <div class="qt-dock-segmented qt-dock-margin-segmented">
              <button type="button" :class="{ active: marginMode === 'cross' }" @click="marginMode = 'cross'">{{ $t('quickTrade.crossMargin') }}</button>
              <button type="button" :class="{ active: marginMode === 'isolated' }" @click="marginMode = 'isolated'">{{ $t('quickTrade.isolatedMargin') }}</button>
            </div>
            <a-popover trigger="click" placement="bottom" overlay-class-name="qt-leverage-popover" :get-popup-container="qtSelectPopupContainer">
              <template slot="content">
                <div class="qt-leverage-editor">
                  <a-slider v-model="leverage" :min="1" :max="125" :marks="leverageMarks" :tipFormatter="v => v + 'x'" />
                  <div class="qt-leverage-presets">
                    <button v-for="value in leveragePresets" :key="value" type="button" :class="{ active: leverage === value }" @click="leverage = value">{{ value }}x</button>
                  </div>
                  <a-input-number v-model="leverage" :min="1" :max="125" :formatter="v => `${v}x`" :parser="v => String(v).replace('x', '')" />
                </div>
              </template>
              <button type="button" class="qt-dock-leverage-trigger">
                <span>{{ $t('quickTrade.leverage') }}</span><strong>{{ leverage }}x</strong><a-icon type="down" />
              </button>
            </a-popover>
          </div>
          <div class="qt-dock-balance">
            <span>{{ isStockMarket ? $t('quickTrade.buyingPower') : (isSwapMode ? $t('quickTrade.swapAvailable') : $t('quickTrade.spotAvailable')) }}</span>
            <strong>{{ balanceLoading ? '...' : `$${formatPrice(activeBalanceAvailable)}` }}</strong>
          </div>
          <div class="qt-dock-balance qt-dock-balance--secondary">
            <span>{{ $t('quickTrade.totalAssets') }}</span>
            <strong>${{ formatPrice(activeBalanceTotal) }}</strong>
          </div>
          <span class="qt-dock-status" :class="{ 'is-connected': selectedCredentialId }">
            <i></i>{{ selectedCredentialId ? $t('quickTrade.connected') : accountPlaceholder }}
          </span>
          <a-button class="qt-dock-icon-btn" :title="$t('common.refresh')" :loading="dockRefreshing" @click="refreshDockData"><a-icon type="reload" /></a-button>
        </template>
      </div>

      <div :class="['qt-embedded-split', { 'qt-embedded-split--cols': embedded }]">
        <div v-if="!floatingConsole" class="qt-embedded-col qt-embedded-col-left">

          <!-- Credential Selector -->
          <div v-if="!embeddedDock" class="qt-section qt-account-section">
            <div class="qt-label">{{ accountLabel }} <span class="qt-crypto-hint">{{ accountHint }}</span></div>
            <a-select
              v-model="selectedCredentialId"
              :placeholder="accountPlaceholder"
              style="width: 100%"
              :get-popup-container="qtSelectPopupContainer"
              :dropdown-class-name="qtSelectDropdownClass"
              @change="onCredentialChange"
              :loading="credLoading"
              :notFoundContent="isStockMarket ? $t('quickTrade.noBrokerAccount') : $t('quickTrade.noExchange')"
            >
              <a-select-option v-for="c in credentials" :key="c.id" :value="c.id">
                {{ formatCredentialOptionLabel(c) }}
                <a-tag v-if="c.enable_demo_trading" color="orange" size="small" style="margin-left: 6px;">{{ credentialEnvironmentLabel(c) }}</a-tag>
                <a-tag v-if="c.market_type" size="small" style="margin-left: 6px;">{{ c.market_type }}</a-tag>
              </a-select-option>
            </a-select>
            <div class="qt-account-actions">
              <a-button type="primary" block size="small" class="qt-add-account-btn" @click="handleAddAccountClick">
                <a-icon type="plus" /> {{ $t('quickTrade.addAccountInline') }}
              </a-button>
            </div>
            <div class="qt-balance" v-if="selectedCredentialId">
              <template v-if="balanceLoading">
                <a-spin size="small" />
                <span class="qt-balance-label qt-balance-loading-text">{{ $t('quickTrade.available') }}...</span>
              </template>
              <template v-else>
                <template v-if="isStockMarket">
                  <div class="qt-balance-line qt-balance-line--active">
                    <span class="qt-balance-label">{{ $t('quickTrade.buyingPower') }}</span>
                    <span class="qt-balance-value">${{ formatPrice(activeBalanceAvailable) }}</span>
                  </div>
                </template>
                <template v-else>
                  <div
                    class="qt-balance-line"
                    :class="{ 'qt-balance-line--active': isSwapMode }"
                  >
                    <span class="qt-balance-label">{{ $t('quickTrade.swapAvailable') }}</span>
                    <span class="qt-balance-value">${{ formatPrice(swapBalanceAvailable) }}</span>
                  </div>
                  <div
                    class="qt-balance-line"
                    :class="{ 'qt-balance-line--active': !isSwapMode }"
                  >
                    <span class="qt-balance-label">{{ $t('quickTrade.spotAvailable') }}</span>
                    <span class="qt-balance-value">${{ formatPrice(spotBalanceAvailable) }}</span>
                  </div>
                </template>
                <div
                  v-if="balanceErrorMessage"
                  class="qt-balance-error-hint"
                  :title="balance.error"
                >
                  {{ balanceErrorMessage }}
                </div>
              </template>
            </div>
          </div>

          <div class="qt-order-entry-stack">
            <!-- Order Type -->
            <div v-if="!floatingConsole" class="qt-section qt-order-type-section">
              <a-radio-group v-model="orderType" button-style="solid" size="small" style="width: 100%;">
                <a-radio-button value="market" style="width: 50%; text-align: center;">
                  {{ $t('quickTrade.market') }}
                </a-radio-button>
                <a-radio-button value="limit" style="width: 50%; text-align: center;">
                  {{ $t('quickTrade.limit') }}
                </a-radio-button>
              </a-radio-group>
            </div>

            <!-- Limit Price -->
            <div class="qt-section qt-limit-section" v-if="orderType === 'limit'">
              <div class="qt-label">{{ $t('quickTrade.limitPrice') }}</div>
              <a-input-number
                v-model="limitPrice"
                :min="0"
                :step="priceStep"
                :precision="pricePrecision"
                style="width: 100%"
                :placeholder="$t('quickTrade.enterPrice')"
              />
            </div>

            <!-- Amount / quantity -->
            <div class="qt-section qt-amount-block">
              <template v-if="isSpotCashOrder">
                <div class="qt-spot-order-inputs">
                  <div class="qt-side-amount qt-side-amount--buy">
                    <div class="qt-side-heading">
                      <strong class="qt-side-title qt-side-title--buy">
                        <a-icon type="arrow-up" />
                        {{ buyActionText }}
                      </strong>
                      <a-radio-group
                        v-model="spotBuyInputMode"
                        button-style="solid"
                        size="small"
                        class="qt-buy-unit-toggle"
                      >
                        <a-radio-button value="quantity">{{ $t('quickTrade.byQuantity') }}</a-radio-button>
                        <a-radio-button value="amount">{{ $t('quickTrade.byAmount') }}</a-radio-button>
                      </a-radio-group>
                    </div>
                    <div class="qt-amount-label-row">
                      <div class="qt-label">
                        {{ $t(spotBuyInputMode === 'quantity' ? 'quickTrade.buyQuantity' : 'quickTrade.buyAmount') }}
                        ({{ spotBuyInputMode === 'quantity' ? baseAsset : orderCurrency }})
                      </div>
                      <span class="qt-side-available">{{ $t('quickTrade.available') }} {{ formatPrice(spotBalanceAvailable) }}</span>
                    </div>
                    <a-input-number
                      v-if="spotBuyInputMode === 'quantity'"
                      v-model="buyQuantity"
                      :min="0"
                      :step="0.0001"
                      :precision="8"
                      style="width: 100%"
                      :placeholder="$t('quickTrade.enterBuyQuantity')"
                    />
                    <a-input-number
                      v-else
                      v-model="amount"
                      :min="0"
                      :step="10"
                      :precision="2"
                      style="width: 100%"
                      :placeholder="$t('quickTrade.enterAmount')"
                    />
                    <div class="qt-quick-amounts">
                      <a-button
                        v-for="percent in [25, 50, 75, 100]"
                        :key="`buy-${percent}`"
                        size="small"
                        :disabled="balanceLoading || spotBalanceAvailable <= 0"
                        @click="setQuickAmountByPercent(percent, 'buy')"
                      >{{ percent }}%</a-button>
                    </div>
                  </div>
                  <div class="qt-side-amount qt-side-amount--sell">
                    <div class="qt-side-heading">
                      <strong class="qt-side-title qt-side-title--sell">
                        <a-icon type="arrow-down" />
                        {{ sellActionText }}
                      </strong>
                      <a-radio-group
                        v-model="spotSellInputMode"
                        button-style="solid"
                        size="small"
                        class="qt-sell-unit-toggle"
                      >
                        <a-radio-button value="quantity">{{ $t('quickTrade.byQuantity') }}</a-radio-button>
                        <a-radio-button value="amount">{{ $t('quickTrade.byAmount') }}</a-radio-button>
                      </a-radio-group>
                    </div>
                    <div class="qt-amount-label-row">
                      <div class="qt-label">
                        {{ $t(spotSellInputMode === 'quantity' ? 'quickTrade.sellQuantity' : 'quickTrade.sellAmount') }}
                        ({{ spotSellInputMode === 'quantity' ? baseAsset : orderCurrency }})
                      </div>
                      <span class="qt-side-available">
                        {{ $t('quickTrade.available') }}
                        {{ spotSellInputMode === 'quantity' ? formatQuantity(spotSellAvailable) : formatPrice(spotSellAvailableValue) }}
                      </span>
                    </div>
                    <a-input-number
                      v-if="spotSellInputMode === 'quantity'"
                      v-model="sellQuantity"
                      :min="0"
                      :max="spotSellAvailable"
                      :step="0.0001"
                      :precision="8"
                      style="width: 100%"
                      :placeholder="$t('quickTrade.enterSellQuantity')"
                    />
                    <a-input-number
                      v-else
                      v-model="sellAmount"
                      :min="0"
                      :max="spotSellAvailableValue"
                      :step="10"
                      :precision="2"
                      style="width: 100%"
                      :placeholder="$t('quickTrade.enterSellAmount')"
                    />
                    <div class="qt-quick-amounts">
                      <a-button
                        v-for="percent in [25, 50, 75, 100]"
                        :key="`sell-${percent}`"
                        size="small"
                        :disabled="balanceLoading || spotSellAvailable <= 0"
                        @click="setQuickAmountByPercent(percent, 'sell')"
                      >{{ percent }}%</a-button>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="qt-amount-label-row">
                  <div class="qt-label">{{ amountLabel }} ({{ orderCurrency }})</div>
                  <span
                    v-if="embeddedDock && isSwapMode"
                    class="qt-inline-notional"
                    :title="$t('quickTrade.marginNotionalFormula', {
                      margin: formatPrice(amount),
                      leverage: leverage,
                      notional: formatPrice(estimatedNotionalUsdt),
                      currency: orderCurrency
                    })"
                  >≈ {{ formatPrice(estimatedNotionalUsdt) }} {{ orderCurrency }}</span>
                </div>
                <a-input-number
                  v-model="amount"
                  :min="1"
                  :step="10"
                  :precision="2"
                  style="width: 100%"
                  :placeholder="$t('quickTrade.enterAmount')"
                />
                <div v-if="isSwapMode" class="qt-quick-amounts qt-quick-amounts--swap">
                  <a-button
                    v-for="percent in [10, 25, 50, 100]"
                    :key="`swap-${percent}`"
                    size="small"
                    :disabled="balanceLoading || activeBalanceAvailable <= 0"
                    @click="setQuickAmountByPercent(percent, 'buy')"
                  >{{ percent }}%</a-button>
                </div>
                <div v-if="isSwapMode && !embeddedDock" class="qt-notional-summary">
                  {{ $t('quickTrade.marginNotionalFormula', {
                    margin: formatPrice(amount),
                    leverage: leverage,
                    notional: formatPrice(estimatedNotionalUsdt),
                    currency: orderCurrency
                  }) }}
                </div>
              </template>
            </div>

          </div>

          <!-- Mode & Leverage -->
          <div
            v-if="isCryptoMarket && !embeddedDock"
            class="qt-section qt-card qt-mode-card"
          >
            <div class="qt-section-title-row">
              <span class="qt-section-title">{{ isSwapMode ? $t('quickTrade.leverage') : $t('quickTrade.spotModeTitle') }}</span>
              <div class="qt-mode-toggle">
                <div
                  class="qt-mode-toggle-item"
                  :class="{ active: tradeMode === 'swap' }"
                  @click="tradeMode = 'swap'"
                >{{ $t('quickTrade.contractBadge') }}</div>
                <div
                  class="qt-mode-toggle-item"
                  :class="{ active: tradeMode === 'spot' }"
                  @click="tradeMode = 'spot'"
                >{{ $t('quickTrade.spotModeTitle') }}</div>
              </div>
            </div>
            <template v-if="isSwapMode">
              <div class="qt-leverage-row">
                <div class="qt-leverage-slider-wrap">
                  <a-slider
                    v-model="leverage"
                    :min="1"
                    :max="125"
                    :marks="leverageMarks"
                    :tipFormatter="v => v + 'x'"
                  />
                </div>
                <a-input-number
                  v-model="leverage"
                  :min="1"
                  :max="125"
                  :formatter="v => `${v}x`"
                  :parser="v => String(v).replace('x', '')"
                  class="qt-leverage-input"
                />
              </div>
              <div class="qt-label qt-label-spaced">{{ $t('quickTrade.marginMode') }}</div>
              <a-radio-group v-model="marginMode" size="small" button-style="solid" class="qt-margin-radio">
                <a-radio-button value="cross">{{ $t('quickTrade.crossMargin') }}</a-radio-button>
                <a-radio-button value="isolated">{{ $t('quickTrade.isolatedMargin') }}</a-radio-button>
              </a-radio-group>
              <div class="qt-hint-text">{{ $t('quickTrade.marginModeHint') }}</div>
            </template>
            <template v-else>
              <div class="qt-spot-info">
                <a-icon type="wallet" class="qt-spot-info-icon" />
                <span class="qt-hint-text">{{ $t('quickTrade.spotModeHint') }}</span>
              </div>
            </template>
          </div>
          <div v-else-if="!embeddedDock" class="qt-section qt-card qt-mode-card qt-stock-mode-card">
            <div class="qt-section-title-row">
              <span class="qt-section-title">{{ $t('quickTrade.alpacaAccount') }}</span>
              <span class="qt-optional-tag">1x</span>
            </div>
            <div class="qt-spot-info">
              <a-icon type="bank" class="qt-spot-info-icon" />
              <span class="qt-hint-text">{{ $t('quickTrade.stockSpotModeHint') }}</span>
            </div>
          </div>

          <div
            class="qt-risk-action-stack"
            :class="{ 'is-tpsl-open': embeddedDock && supportsNativeProtection && dockTpslEnabled }"
          >
            <div
              v-if="embeddedDock && supportsNativeProtection"
              class="qt-dock-tpsl-toggle"
            >
              <a-checkbox v-model="dockTpslEnabled">{{ $t('quickTrade.tpsl') }}</a-checkbox>
              <span>{{ $t('quickTrade.optional') }}</span>
            </div>
            <!-- TP / SL (optional, always expanded) -->
            <div v-if="supportsNativeProtection" v-show="!embeddedDock || dockTpslEnabled" class="qt-section qt-card qt-tpsl-card">
              <div v-if="!embeddedDock" class="qt-section-title-row">
                <span class="qt-section-title">{{ $t('quickTrade.tpsl') }}</span>
                <span class="qt-optional-tag">{{ $t('quickTrade.optional') }}</span>
              </div>
              <div class="qt-tpsl-row">
                <div class="qt-tpsl-item">
                  <span class="qt-label qt-tp-label">{{ $t('quickTrade.tp') }}</span>
                  <a-input-number
                    v-model="tpPrice"
                    :min="0"
                    :step="priceStep"
                    :precision="pricePrecision"
                    class="qt-input-full"
                    :placeholder="$t('quickTrade.tpPlaceholder')" />
                </div>
                <div class="qt-tpsl-item">
                  <span class="qt-label qt-sl-label">{{ $t('quickTrade.sl') }}</span>
                  <a-input-number
                    v-model="slPrice"
                    :min="0"
                    :step="priceStep"
                    :precision="pricePrecision"
                    class="qt-input-full"
                    :placeholder="$t('quickTrade.slPlaceholder')" />
                </div>
              </div>
              <div class="qt-hint-text qt-tpsl-record-hint">{{ $t('quickTrade.tpslNativeHint') }}</div>
            </div>

            <!-- Submit Buttons -->
            <div class="qt-submit-section qt-submit-section--embedded-left">
              <a-button
                type="primary"
                size="large"
                :loading="submittingSide === 'buy'"
                :disabled="!canSubmitBuy"
                @click="handleSubmit('buy')"
                class="qt-submit-btn qt-btn-long"
              >
                <a-icon type="arrow-up" />
                {{ buyActionText }}
              </a-button>
              <a-button
                type="danger"
                size="large"
                :loading="submittingSide === 'sell'"
                :disabled="!canSubmitSell"
                @click="handleSubmit('sell')"
                class="qt-submit-btn qt-btn-short"
              >
                <a-icon type="arrow-down" />
                {{ sellActionText }}
              </a-button>
            </div>
            <div v-if="tradeFeedback && tradeFeedback.text" class="qt-trade-feedback qt-trade-feedback--embedded" :class="`qt-trade-feedback--${tradeFeedback.type}`" role="alert">
              <a-icon :type="tradeFeedback.type === 'warning' ? 'warning' : 'close-circle'" />
              <span>{{ tradeFeedback.text }}</span>
            </div>
          </div>

        </div>
        <div class="qt-embedded-col qt-embedded-col-right">

          <div v-if="embeddedDock" class="qt-dock-tabs" :style="floatingConsole ? { gridTemplateColumns: `repeat(${dockTabItems.length}, minmax(0, 1fr)) 24px` } : null">
            <button
              v-for="tab in dockTabItems"
              :key="tab.key"
              type="button"
              :class="{ active: activeDockTab === tab.key }"
              @click="selectDockTab(tab.key, $event)"
            >
              {{ tab.label }}<span v-if="tab.count">{{ tab.count }}</span>
            </button>
            <button
              v-if="floatingConsole"
              type="button"
              class="qt-floating-activity-toggle"
              :class="{ 'is-expanded': floatingActivityExpanded }"
              :aria-label="$t('quickTrade.floating.activity')"
              :aria-expanded="floatingActivityExpanded ? 'true' : 'false'"
              @click="floatingActivityExpanded = !floatingActivityExpanded"
            >
              <a-icon :type="floatingActivityExpanded ? 'up' : 'down'" />
            </button>
          </div>

          <!-- Current Positions -->
          <div v-show="(!floatingConsole || floatingActivityExpanded) && (!embeddedDock || activeDockTab === 'positions')" class="qt-position-section">
            <div v-if="!embeddedDock" class="qt-section-header">
              <a-icon type="wallet" /> {{ $t('quickTrade.currentPosition') }}
              <span v-if="currentPositions.length > 1" class="qt-position-count">({{ currentPositions.length }})</span>
            </div>
            <template v-if="floatingConsole && currentPositions.length > 0">

              <div class="qtc-table-scroll">
                <table class="qtc-positions qtc-current-positions">
                  <thead><tr><th>{{ $t('ai-trading-assistant.table.symbol') }}</th><th>{{ $t('quickTrade.side') }}</th><th>{{ $t('quickTrade.posSize') }}</th><th>{{ $t('quickTrade.entryPrice') }}</th><th>{{ $t('quickTrade.markPrice') }}</th><th>{{ $t('common.actions') }}</th></tr></thead>
                  <tbody><template v-for="(pos, index) in currentPositions">
                  <tr :key="'position-main-' + index + '-' + pos.side" class="qtc-position-main-row">
                    <td class="qtc-position-symbol"><strong>{{ pos.symbol || currentSymbol }}</strong><small v-if="isSwapMode">{{ formatLeverage(pos.effective_leverage) }}</small><small v-else-if="pos.is_locked" class="qt-dust-label" :title="$t('quickTrade.lockedBalanceHint')">{{ $t('quickTrade.lockedBalance') }}</small><small v-else-if="pos.is_dust" class="qt-dust-label" :title="$t('quickTrade.dustBalanceHint')">{{ $t('quickTrade.dustBalance') }}</small></td>
                    <td><a-tag :color="pos.side === 'long' ? 'green' : 'red'">{{ pos.side === 'long' ? (isSwapMode ? $t('quickTrade.long') : $t('quickTrade.spotHold')) : $t('quickTrade.short') }}</a-tag></td>
                    <td>{{ formatQuantity(pos.size) }}</td>
                    <td>{{ pos.entry_price > 0 ? formatPrice(pos.entry_price) : '—' }}</td>
                    <td>{{ pos.mark_price > 0 ? formatPrice(pos.mark_price) : '—' }}</td>
                    <td><div class="qtc-position-actions">
                      <a-button
                        size="small"
                        class="qtc-close"
                        :title="pos.is_locked ? $t('quickTrade.lockedBalanceHint') : (pos.is_dust ? $t('quickTrade.dustBalanceHint') : $t(isSwapMode ? 'quickTrade.workflow.marketExitHint' : 'quickTrade.workflow.marketSellHint'))"
                        :loading="closingPositionSide === pos.side"
                        :disabled="!!closingPositionSide || !!submitting || !!pos.is_dust || !!pos.is_locked"
                        @click="handleClosePosition(pos)"
                      >{{ isSwapMode ? $t('quickTrade.floating.closeAll') : $t('quickTrade.floating.sellAll') }}</a-button>
                      <a-dropdown v-if="isCryptoMarket" :trigger="['click']" :get-popup-container="qtSelectPopupContainer" :overlay-class-name="qtSelectDropdownClass">
                        <a-button size="small" class="qtc-more" :disabled="!!closingPositionSide || !!submitting || !!pos.is_dust || !!pos.is_locked" :aria-label="$t('quickTrade.workflow.moreActions')"><a-icon type="ellipsis" /></a-button>
                        <a-menu slot="overlay">
                          <a-menu-item key="limit" @click="openPositionEditor(pos, 'limit')">{{ $t(isSwapMode ? 'quickTrade.workflow.limitClose' : 'quickTrade.workflow.limitSell') }}</a-menu-item>
                          <a-menu-item v-if="isSwapMode && selectedCredential && ['gate', 'gateio'].includes(selectedCredential.exchange_id)" key="protection" @click="openPositionEditor(pos, 'protection')">{{ $t('quickTrade.workflow.protection') }}</a-menu-item>
                        </a-menu>
                      </a-dropdown>
                    </div></td>
                  </tr>
                  <tr :key="'position-metrics-' + index + '-' + pos.side" class="qtc-position-metrics-row"><td colspan="6"><div class="qtc-position-metrics">
                    <div class="qtc-position-metric"><span>{{ $t('quickTrade.investedAmount') }}</span><strong>{{ formatPrice(pos.invested_amount) }} {{ orderCurrency }}</strong></div>
                    <div class="qtc-position-metric"><span>{{ $t('quickTrade.currentValue') }}</span><strong>{{ formatPrice(pos.current_value) }} {{ orderCurrency }}</strong></div>
                    <div class="qtc-position-metric" :class="pos.unrealized_pnl >= 0 ? 'qtc-positive' : 'qtc-negative'"><span>{{ $t('quickTrade.unrealizedPnl') }}</span><strong>{{ formatSignedPrice(pos.unrealized_pnl) }} {{ orderCurrency }} <small>({{ formatSignedPercent(pos.pnl_percent) }})</small></strong></div>
                  </div></td></tr>
                  </template></tbody>
                </table>
              </div>
              <div v-if="positionEditor" class="qtc-exit-editor">
                <div class="qtc-exit-editor-heading"><strong>{{ $t(positionEditor.mode === 'limit' ? (isSwapMode ? 'quickTrade.workflow.limitClose' : 'quickTrade.workflow.limitSell') : 'quickTrade.workflow.addProtection') }} · {{ $t(isSwapMode ? (positionEditor.side === 'long' ? 'quickTrade.long' : 'quickTrade.short') : 'quickTrade.spotHold') }}</strong><a-button type="link" size="small" @click="positionEditor = null">{{ $t('quickTrade.workflow.cancel') }}</a-button></div>
                <div class="qtc-exit-editor-fields">
                  <a-radio-group v-if="positionEditor.mode === 'protection'" v-model="positionEditor.kind" size="small"><a-radio-button value="tp">{{ $t('quickTrade.tp') }}</a-radio-button><a-radio-button value="sl">{{ $t('quickTrade.sl') }}</a-radio-button></a-radio-group>
                  <a-input-number
                    v-model="positionEditor.price"
                    :min="0"
                    :step="priceStep"
                    :precision="pricePrecision"
                    :placeholder="$t(positionEditor.mode === 'limit' ? 'quickTrade.limitPrice' : 'quickTrade.workflow.triggerPrice')"
                    :aria-label="$t(positionEditor.mode === 'limit' ? 'quickTrade.limitPrice' : 'quickTrade.workflow.triggerPrice')"
                  />
                  <a-button type="primary" size="small" :disabled="!(positionEditor.price > 0)" :loading="savingProtection || !!closingPositionSide" @click="submitPositionEditor">{{ $t(positionEditor.mode === 'limit' ? (isSwapMode ? 'quickTrade.workflow.submitExit' : 'quickTrade.workflow.submitSell') : 'common.save') }}</a-button>
                </div>
                <small v-if="positionEditor.mode === 'protection'">{{ $t('quickTrade.workflow.protectionHint') }}</small>
              </div>
            </template>
            <template v-else-if="currentPositions.length > 0">
              <div v-if="isSwapMode" class="qt-close-scope qt-close-scope-global">
                <div class="qt-close-scope-toolbar">
                  <a-radio-group v-model="closeScope" size="small" class="qt-close-scope-radio">
                    <a-radio-button value="full">{{ $t('quickTrade.closeScopeFull') }}</a-radio-button>
                    <a-radio-button value="system_tracked">{{ $t('quickTrade.closeScopeSystem') }}</a-radio-button>
                  </a-radio-group>
                  <a-tooltip :title="$t('quickTrade.closeScopeSystemHint')">
                    <a-icon type="info-circle" class="qt-close-scope-help" />
                  </a-tooltip>
                </div>
              </div>
              <div
                v-for="(pos, idx) in currentPositions"
                :key="'pos-' + idx + '-' + (pos.side || '') + '-' + String(pos.size || '')"
                class="qt-position-card"
                :class="pos.side"
              >
                <div class="qt-pos-row qt-pos-row--side">
                  <span>{{ $t('quickTrade.side') }}</span>
                  <a-tag :color="pos.side === 'long' ? '#52c41a' : '#f5222d'" size="small">
                    {{ pos.side === 'long'
                      ? (isSwapMode ? $t('quickTrade.long') : $t('quickTrade.spotHold'))
                      : $t('quickTrade.short') }}
                  </a-tag>
                </div>
                <div class="qt-pos-row qt-pos-row--size">
                  <span>{{ $t('quickTrade.posSize') }}</span>
                  <span>{{ pos.size }}</span>
                </div>
                <div v-if="pos.is_dust" class="qt-pos-row qt-pos-row--dust">
                  <span>{{ $t('quickTrade.dustBalance') }}</span>
                  <span :title="$t('quickTrade.dustBalanceHint')">{{ $t('quickTrade.dustBalanceHint') }}</span>
                </div>
                <div v-else-if="pos.is_locked" class="qt-pos-row qt-pos-row--dust">
                  <span>{{ $t('quickTrade.lockedBalance') }}</span>
                  <span :title="$t('quickTrade.lockedBalanceHint')">{{ $t('quickTrade.lockedBalanceHint') }}</span>
                </div>
                <div class="qt-pos-row qt-pos-row--value">
                  <span>{{ $t('quickTrade.investedAmount') }}</span>
                  <span>{{ formatPrice(pos.invested_amount) }} USDT</span>
                </div>
                <div class="qt-pos-row qt-pos-row--current-value">
                  <span>{{ $t('quickTrade.currentValue') }}</span>
                  <span>{{ formatPrice(pos.current_value) }} USDT</span>
                </div>
                <div class="qt-pos-row qt-pos-row--entry">
                  <span>{{ $t('quickTrade.entryPrice') }}</span>
                  <span>${{ formatPrice(pos.entry_price) }}</span>
                </div>
                <div class="qt-pos-row qt-pos-row--mark" v-if="pos.mark_price">
                  <span>{{ $t('quickTrade.markPrice') }}</span>
                  <span>${{ formatPrice(pos.mark_price) }}</span>
                </div>
                <div class="qt-pos-row qt-pos-row--leverage" v-if="pos.leverage && pos.leverage > 1">
                  <span>{{ $t('quickTrade.leverage') }}</span>
                  <span>{{ pos.leverage }}x</span>
                </div>
                <div class="qt-pos-row qt-pos-row--pnl">
                  <span>{{ $t('quickTrade.unrealizedPnl') }}</span>
                  <span :class="pos.unrealized_pnl >= 0 ? 'qt-green' : 'qt-red'">
                    {{ formatSignedPrice(pos.unrealized_pnl) }} USDT ({{ formatSignedPercent(pos.pnl_percent) }})
                  </span>
                </div>
                <a-button
                  type="danger"
                  size="small"
                  block
                  ghost
                  class="qt-position-close-btn"
                  @click="handleClosePosition(pos)"
                  :loading="closingPositionSide === pos.side"
                  :disabled="!!pos.is_dust || !!pos.is_locked"
                  :title="pos.is_locked ? $t('quickTrade.lockedBalanceHint') : (pos.is_dust ? $t('quickTrade.dustBalanceHint') : '')"
                >
                  {{ isSwapMode ? $t('quickTrade.closePosition') : $t('quickTrade.sellSpot') }}
                </a-button>
              </div>
            </template>
            <div v-else class="qt-position-empty">
              <a-icon type="inbox" class="qt-empty-icon" />
              <span class="qt-empty-desc">{{ $t('quickTrade.noPositionHint') }}</span>
            </div>
          </div>

          <!-- Trade Records -->
          <div v-if="embeddedDock && ['openOrders', 'tradeRecords'].includes(activeDockTab)" v-show="!floatingConsole || floatingActivityExpanded" class="qt-history-section qt-dock-history">
            <div v-if="activeDockTab === 'tradeRecords' && historyRecordSource === 'local_fallback'" class="qt-history-source-warning">
              <a-icon type="exclamation-circle" />
              <span>{{ $t('quickTrade.historyLocalFallback') }}</span>
            </div>
            <div v-if="dockTradeRows.length" class="qt-trade-list">
              <div v-if="floatingConsole" class="qtc-record-grid qtc-record-head">
                <span>{{ $t('quickTrade.floating.time') }}</span>
                <span>{{ $t('quickTrade.floating.actionStatus') }}</span>
                <span>{{ $t(activeDockTab === 'openOrders' ? 'quickTrade.requestedPrice' : 'quickTrade.averageFillPrice') }}</span>
                <span>{{ $t(activeDockTab === 'openOrders' && isStockMarket ? 'quickTrade.requestedQuantityOrValue' : activeDockTab === 'openOrders' ? 'quickTrade.requestedAmount' : 'quickTrade.filledAmount') }}</span>
                <span>{{ $t(activeDockTab === 'openOrders' ? 'quickTrade.filledAmount' : 'quickTrade.commission') }}</span>
                <span class="qtc-record-actions-head">{{ $t('common.actions') }}</span>
              </div>
              <div :class="floatingConsole ? 'qtc-record-item' : 'qt-trade-item qt-trade-item--dock'" v-for="t in dockTradeRows" :key="t.id">
                <div v-if="floatingConsole" class="qtc-record-grid qtc-record-row">
                  <time :title="formatFullTime(t.created_at)">{{ formatTime(t.created_at) }}</time>
                  <div class="qtc-record-action"><strong :style="{ color: tradeActionColor(t) }">{{ tradeActionLabel(t) }}</strong><small>{{ tradeStatusLabel(t.status) }}</small></div>
                  <span>{{ activeDockTab === 'openOrders' ? requestedOrderPriceLabel(t) : tradeFillPrice(t) > 0 ? formatPrice(tradeFillPrice(t)) : '—' }}</span>
                  <span>{{ activeDockTab === 'openOrders' ? formatRequestedOrderSize(t) : t.filled_amount > 0 ? formatQuantity(t.filled_amount) : '—' }}</span>
                  <span>{{ activeDockTab === 'openOrders' ? formatQuantity(t.filled_amount) : formatTradeCommission(t) }}</span>
                  <div class="qtc-record-actions">
                    <a-button
                      v-if="activeDockTab === 'openOrders' && canCancelTrade(t)"
                      type="danger"
                      ghost
                      size="small"
                      class="qtc-cancel-order-btn"
                      :loading="cancellingTradeId === t.id"
                      @click="handleCancelTrade(t)"
                    >{{ $t('brokerAccounts.cancelOrder') }}</a-button>
                    <button type="button" class="qt-trade-detail-toggle" :aria-label="$t(isTradeDetailsExpanded(t.id) ? 'quickTrade.hideDetails' : 'quickTrade.details')" :aria-expanded="isTradeDetailsExpanded(t.id)" @click="toggleTradeDetails(t.id)"><a-icon :type="isTradeDetailsExpanded(t.id) ? 'up' : 'down'" /></button>
                  </div>
                </div>
                <div v-if="!floatingConsole" class="qt-trade-card-head">
                  <div class="qt-trade-card-identity">
                    <a-tag :color="tradeActionColor(t)" size="small">
                      {{ tradeActionLabel(t) }}
                    </a-tag>
                    <span class="qt-trade-symbol">{{ t.symbol }}</span>
                    <span class="qt-trade-order-type">{{ tradeOrderTypeLabel(t) }}</span>
                    <span v-if="String(t.market_type || '').toLowerCase() === 'swap' && t.leverage" class="qt-trade-inline-meta">{{ t.leverage }}x</span>
                    <span v-if="t.margin_mode" class="qt-trade-inline-meta">{{ tradeMarginModeLabel(t.margin_mode) }}</span>
                  </div>
                  <div class="qt-trade-card-state">
                    <a-tag :color="tradeStatusColor(t.status)" size="small">{{ tradeStatusLabel(t.status) }}</a-tag>
                    <span class="qt-trade-time" :title="formatFullTime(t.created_at)">{{ formatTime(t.created_at) }}</span>
                    <a-button
                      v-if="activeDockTab === 'openOrders' && canCancelTrade(t)"
                      type="link"
                      size="small"
                      class="qt-cancel-order-btn"
                      :loading="cancellingTradeId === t.id"
                      @click="handleCancelTrade(t)"
                    >{{ $t('brokerAccounts.cancelOrder') }}</a-button>
                    <a-tooltip :title="$t(isTradeDetailsExpanded(t.id) ? 'quickTrade.hideDetails' : 'quickTrade.details')">
                      <button type="button" class="qt-trade-detail-toggle" @click="toggleTradeDetails(t.id)">
                        <a-icon :type="isTradeDetailsExpanded(t.id) ? 'up' : 'down'" />
                      </button>
                    </a-tooltip>
                  </div>
                </div>

                <div v-if="!floatingConsole" class="qt-trade-summary-grid">
                  <div class="qt-trade-metric">
                    <span>{{ $t(t.is_close && tradeEntryPrice(t) > 0 ? 'quickTrade.entryExitPrice' : 'quickTrade.averageFillPrice') }}</span>
                    <strong class="qt-trade-price-flow">
                      <template v-if="t.is_close && tradeEntryPrice(t) > 0 && tradeFillPrice(t) > 0">
                        ${{ formatPrice(tradeEntryPrice(t)) }} → ${{ formatPrice(tradeFillPrice(t)) }}
                      </template>
                      <template v-else>{{ tradeFillPrice(t) > 0 ? `$${formatPrice(tradeFillPrice(t))}` : '--' }}</template>
                    </strong>
                  </div>
                  <div class="qt-trade-metric">
                    <span>{{ $t('quickTrade.filledAmount') }}</span>
                    <strong>{{ t.filled_amount > 0 ? formatQuantity(t.filled_amount) : '--' }}</strong>
                  </div>
                  <div class="qt-trade-metric">
                    <span>{{ $t('quickTrade.commission') }}</span>
                    <strong>{{ formatTradeCommission(t) }}</strong>
                  </div>
                  <div class="qt-trade-metric qt-trade-metric--pnl" :class="tradePnlTone(t)">
                    <span>{{ $t('quickTrade.realizedPnl') }}</span>
                    <strong>{{ formatTradePnl(t) }}</strong>
                  </div>
                </div>

                <div v-if="isTradeDetailsExpanded(t.id)" :class="floatingConsole ? 'qtc-record-details' : 'qt-trade-details'">
                  <div v-if="floatingConsole" class="qt-trade-detail-wide qtc-record-context" :title="tradeSourceLabel(t.source)">
                    <strong>{{ t.symbol }} · {{ tradeOrderTypeLabel(t) }}<template v-if="t.leverage && !t.is_close"> · {{ t.leverage }}x</template><template v-if="t.margin_mode"> · {{ tradeMarginModeLabel(t.margin_mode) }}</template></strong>
                  </div>
                  <div v-if="!floatingConsole || t.display_amount > 0">
                    <span>{{ $t('quickTrade.executedValue') }}</span>
                    <strong>{{ t.display_amount > 0 ? `$${formatPrice(t.display_amount)}` : '--' }}</strong>
                  </div>
                  <div v-if="!floatingConsole">
                    <span>{{ $t('quickTrade.sourceLabel') }}</span>
                    <strong>{{ tradeSourceLabel(t.source) }}</strong>
                  </div>
                  <div v-if="!floatingConsole || !t.is_close">
                    <span>{{ $t('quickTrade.inputAmount') }}</span>
                    <strong>{{ formatPrice(t.amount) }} USDT</strong>
                  </div>
                  <div v-if="t.requested_base_qty">
                    <span>{{ $t('quickTrade.requestedAmount') }}</span>
                    <strong>{{ formatQuantity(t.requested_base_qty) }}</strong>
                  </div>
                  <div v-if="t.price && (!floatingConsole || t.order_type === 'limit')">
                    <span>{{ $t('quickTrade.requestedPrice') }}</span>
                    <strong>${{ formatPrice(t.price) }}</strong>
                  </div>
                  <div v-if="t.tp_price">
                    <span>{{ $t('quickTrade.tp') }}</span>
                    <strong>${{ formatPrice(t.tp_price) }}</strong>
                  </div>
                  <div v-if="t.sl_price">
                    <span>{{ $t('quickTrade.sl') }}</span>
                    <strong>${{ formatPrice(t.sl_price) }}</strong>
                  </div>
                  <div v-if="t.exchange_order_id" class="qt-trade-detail-wide">
                    <span>{{ $t('quickTrade.exchangeOrderId') }}</span>
                    <strong :title="t.client_order_id || t.exchange_order_id">{{ t.exchange_order_id }}</strong>
                  </div>
                  <div v-if="t.client_order_id && (!floatingConsole || !t.exchange_order_id)" class="qt-trade-detail-wide">
                    <span>{{ $t('quickTrade.clientOrderId') }}</span>
                    <strong :title="t.client_order_id">{{ t.client_order_id }}</strong>
                  </div>
                  <div v-if="t.error_msg" class="qt-trade-detail-wide qt-trade-detail-error">
                    <span>{{ $t('quickTrade.failureReason') }}</span>
                    <strong>{{ t.error_msg }}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="!showNativeOrderActivity" class="qt-position-empty">
              <a-icon type="inbox" class="qt-empty-icon" />
              <span class="qt-empty-desc">{{ dockEmptyText }}</span>
            </div>
          </div>

          <PositionActivity
            v-if="floatingConsole && floatingActivityExpanded && selectedCredentialId && (activeDockTab === 'positionHistory' || showNativeOrderActivity)"
            ref="positionActivity"
            :credential-id="selectedCredentialId"
            :symbol="currentSymbol"
            :market-type="effectiveMarketType"
            :history="activeDockTab === 'positionHistory'"
            :show-empty="!dockTradeRows.length"
          />

          <div class="qt-history-section" v-if="!embeddedDock && recentTrades.length > 0">
            <a-collapse :bordered="false" :activeKey="historyCollapsed ? [] : ['history']" @change="handleHistoryCollapse">
              <a-collapse-panel key="history" :showArrow="false" :style="collapseStyle">
                <template slot="header">
                  <div class="qt-section-header" style="margin: 0; padding: 0;">
                    <a-icon type="history" /> {{ $t('quickTrade.recentTrades') }}
                    <span class="qt-history-count">({{ recentTrades.length }})</span>
                  </div>
                </template>
                <div v-if="historyRecordSource === 'local_fallback'" class="qt-history-source-warning">
                  <a-icon type="exclamation-circle" />
                  <span>{{ $t('quickTrade.historyLocalFallback') }}</span>
                </div>
                <div class="qt-trade-list">
                  <div class="qt-trade-item" v-for="t in recentTrades" :key="t.id">
                    <div class="qt-trade-main">
                      <a-tag :color="t.side === 'buy' ? '#52c41a' : '#f5222d'" size="small">
                        {{ t.side === 'buy' ? $t('quickTrade.long') : $t('quickTrade.short') }}
                      </a-tag>
                      <span class="qt-trade-symbol">{{ t.symbol }}</span>
                      <span class="qt-trade-amount">${{ formatPrice(t.amount) }}</span>
                    </div>
                    <div class="qt-trade-meta">
                      <a-tag :color="t.status === 'filled' ? '#52c41a' : ['failed', 'ai_rejected'].includes(t.status) ? '#f5222d' : '#faad14'" size="small">
                        {{ t.status }}
                      </a-tag>
                      <span class="qt-trade-time">{{ formatTime(t.created_at) }}</span>
                    </div>
                  </div>
                </div>
              </a-collapse-panel>
            </a-collapse>
          </div>

        </div>
      </div>

      </div>
    </component>
    <exchange-account-modal
      :visible.sync="showAddExchangeModal"
      :overlay-mount="() => qtOverlayMount()"
      @success="onExchangeAccountSaved"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { listExchangeCredentials } from '@/api/credentials'
import { formatExchangeCredentialLabel, isQuickTradeExchangeCredential, US_STOCK_EXCHANGE_IDS, HK_STOCK_EXCHANGE_IDS } from '@/utils/exchangeCredential'
import ExchangeAccountModal from '@/components/ExchangeAccountModal/ExchangeAccountModal.vue'
import PositionActivity from './PositionActivity.vue'
import CryptoLiquidityArena from './CryptoLiquidityArena.vue'
import { updateQuickPositionProtection, placeQuickOrder, getQuickTradeBalance, getQuickTradePosition, getQuickTradeHistory, closeQuickTradePosition, cancelQuickTradeOrder } from '@/api/quick-trade'
import { searchSymbols, getWatchlist } from '@/api/market'
import { getUserInfo } from '@/api/login'
import request from '@/utils/request'
import { createVisibilityPolling } from '@/utils/visibilityPolling'
import { parseUtcAwareInstant } from '@/utils/utcInstant'
import { broker } from '@/api/broker'
import { calculatePositionMetrics } from './positionMetrics'

const STRICT_PRODUCT_IDENTITY_TYPES = new Set(['tokenized_equity', 'stock_perpetual', 'direct_equity'])

function translateApiMessage (vm, value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^[A-Za-z][A-Za-z0-9_.-]+$/.test(text)) {
    const translated = String(vm.$t(text) || '').trim()
    if (translated && translated !== text) return translated
  }
  return text
}

function appendStrictProductIdentity (payload, vm) {
  if (Number(vm.assetId || 0) > 0) payload.asset_id = Number(vm.assetId)
  const productType = String(vm.productType || '').trim().toLowerCase()
  if (!STRICT_PRODUCT_IDENTITY_TYPES.has(productType)) return payload
  if (vm.instrumentId) payload.instrument_id = vm.instrumentId
  if (vm.productType) payload.product_type = vm.productType
  if (vm.apiFamily) payload.api_family = vm.apiFamily
  return payload
}

export default {
  name: 'QuickTradePanel',
  components: { ExchangeAccountModal, PositionActivity, CryptoLiquidityArena },
  props: {
    visible: { type: Boolean, default: false },
    symbol: { type: String, default: '' },
    presetSide: { type: String, default: '' }, // 'buy' or 'sell', optionally prefilled from an AI signal
    presetPrice: { type: Number, default: 0 },
    source: { type: String, default: 'manual' }, // ai_radar / ai_analysis / indicator / manual
    marketType: { type: String, default: 'swap' }, // swap / spot
    availableMarketTypes: { type: Array, default: () => ['spot', 'swap'] },
    assetId: { type: Number, default: 0 },
    instrumentId: { type: String, default: '' },
    productType: { type: String, default: '' },
    apiFamily: { type: String, default: '' },
    market: { type: String, default: 'Crypto' },
    exchangeId: { type: String, default: '' },
    symbolLocked: { type: Boolean, default: false },
    embedded: { type: Boolean, default: false },
    embeddedIde: { type: Boolean, default: false },
    embeddedDock: { type: Boolean, default: false },
    sideDock: { type: Boolean, default: false },
    floatingConsole: { type: Boolean, default: false },
    consoleMinimized: { type: Boolean, default: false },
    overlayGetContainer: { type: Function, default: null }
  },
  data () {
    return {
      // exchange
      credentials: [],
      selectedCredentialId: undefined,
      credLoading: false,
      balanceLoading: false,
      balanceRequestId: 0,
      quickTradeWarmupTimer: null,
      balance: {
        available: 0,
        total: 0,
        swap: { available: 0, total: 0 },
        spot: { available: 0, total: 0 }
      },
      // order
      side: 'buy',
      orderType: 'market',
      limitPrice: 0,
      amount: 100,
      buyQuantity: null,
      sellQuantity: null,
      sellAmount: null,
      spotBuyInputMode: 'amount',
      spotSellInputMode: 'quantity',
      leverage: 5,
      tradeMode: 'swap',
      marginMode: 'cross',
      tpPrice: null,
      slPrice: null,
      // state
      submitting: false,
      submittingSide: '',
      closingPositionSide: null, // 'long' | 'short' | null
      tradeFeedback: null,
      currentPrice: 0,
      currentPriceUpdatedAt: 0,
      currentPositions: [],
      strategyConflict: null,
      recentTrades: [],
      recentOpenOrders: [],
      historyRecordSource: '',
      marketOrderConfirmations: {},
      historyCollapsed: true,
      activeDockTab: 'positions',
      positionEditor: null,
      savingProtection: false,
      dockRefreshing: false,
      cancellingTradeId: null,
      expandedTradeIds: {},
      floatingActivityExpanded: true,
      dockTpslEnabled: false,
      consoleTpEnabled: false,
      consoleSlEnabled: false,
      closeScope: 'full', // full | system_tracked
      // symbol search
      currentSymbol: '',
      symbolSuggestions: [],
      symbolSearching: false,
      symbolSearchTimer: null,
      userId: null,
      leveragePresets: [1, 3, 5, 10, 20, 50, 100],
      // polling
      pollTimer: null,
      pricePoller: null,
      accountPoller: null,
      postTradeRefresh: null,
      postTradeRefreshTimer: null,
      postTradeRefreshGeneration: 0,
      accountRefreshUntil: 0,
      lastBalancePoll: 0,
      showAddExchangeModal: false
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDark () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    qtSelectDropdownClass () {
      return this.embeddedIde ? 'ide-qt-select-dropdown' : ''
    },
    normalizedMarket () {
      return String(this.market || '').trim() || 'Crypto'
    },
    isStockMarket () {
      return ['USStock', 'HKStock', 'Stock', 'Stocks'].includes(this.normalizedMarket)
    },
    isCryptoMarket () {
      return this.normalizedMarket === 'Crypto'
    },
    activeCryptoExchangeId () {
      if (!this.isCryptoMarket) return ''
      const credential = this.credentials.find(item => item.id === this.selectedCredentialId)
      return String((credential && credential.exchange_id) || this.exchangeId || '').trim().toLowerCase()
    },
    tradableMarketSupported () {
      return this.isCryptoMarket || this.isStockMarket
    },
    priceMarketParam () {
      if (this.normalizedMarket === 'HKStock') return 'HKStock'
      return this.isStockMarket ? 'USStock' : 'Crypto'
    },
    orderCurrency () {
      if (this.normalizedMarket === 'HKStock') return 'HKD'
      return this.isStockMarket ? 'USD' : 'USDT'
    },
    amountLabel () {
      return this.$t(this.isSwapMode ? 'quickTrade.marginAmount' : 'quickTrade.amount')
    },
    baseAsset () {
      const symbol = String(this.currentSymbol || '').replace(/^[^:]+:/, '')
      return (symbol.split(/[/_-]/)[0] || '').toUpperCase() || '-'
    },
    estimatedNotionalUsdt () {
      const amount = Math.max(0, Number(this.amount) || 0)
      return this.isSwapMode ? amount * Math.max(1, Number(this.leverage) || 1) : amount
    },
    supportsNativeProtection () {
      return this.isSwapMode || this.isStockMarket
    },
    accountLabel () {
      return this.isStockMarket ? this.$t('quickTrade.brokerAccount') : this.$t('quickTrade.exchange')
    },
    accountPlaceholder () {
      return this.isStockMarket ? this.$t('quickTrade.selectBrokerAccount') : this.$t('quickTrade.selectExchange')
    },
    accountHint () {
      return this.isStockMarket ? this.$t('quickTrade.usStockSpotOnly') : this.$t('quickTrade.cryptoAccountHint')
    },
    isSwapMode () {
      return this.isCryptoMarket && this.tradeMode === 'swap'
    },
    normalizedAvailableMarketTypes () {
      const values = [...new Set((this.availableMarketTypes || []).map(value => String(value || '').toLowerCase()))]
        .filter(value => ['spot', 'swap'].includes(value))
      return values.length ? values : [String(this.marketType || 'swap').toLowerCase() === 'spot' ? 'spot' : 'swap']
    },
    canSwitchMarketType () {
      return this.isCryptoMarket && this.normalizedAvailableMarketTypes.includes('spot') && this.normalizedAvailableMarketTypes.includes('swap')
    },
    isSpotCashOrder () {
      return this.tradableMarketSupported && !this.isSwapMode
    },
    leverageMarks () {
      const keys = this.embeddedIde ? [1, 50, 125] : [1, 25, 50, 100, 125]
      return keys.reduce((acc, v) => {
        acc[v] = `${v}x`
        return acc
      }, {})
    },
    effectiveMarketType () {
      return this.isStockMarket ? 'spot' : this.tradeMode
    },
    swapBalanceAvailable () {
      const leg = this.balance && this.balance.swap
      if (leg && leg.available != null) return parseFloat(leg.available) || 0
      if (!this.isSwapMode) return 0
      return parseFloat(this.balance.available) || 0
    },
    spotBalanceAvailable () {
      const leg = this.balance && this.balance.spot
      if (leg && leg.available != null) return parseFloat(leg.available) || 0
      if (this.isSwapMode) return 0
      return parseFloat(this.balance.available) || 0
    },
    spotSellAvailable () {
      if (!this.isSpotCashOrder) return 0
      return this.currentPositions.reduce((total, position) => {
        const side = String(position.side || '').toLowerCase()
        if (side === 'short' || position.is_dust || position.is_locked) return total
        const quantity = Number(position.tradable_size ?? position.available ?? position.free ?? position.size ?? position.quantity ?? position.qty ?? position.amount ?? 0)
        return total + (Number.isFinite(quantity) ? Math.max(0, quantity) : 0)
      }, 0)
    },
    spotSellReferencePrice () {
      return Number(this.orderType === 'limit' ? this.limitPrice : this.currentPrice) || 0
    },
    spotSellAvailableValue () {
      return this.spotSellAvailable * this.spotSellReferencePrice
    },
    spotBuyReferencePrice () {
      return Number(this.orderType === 'limit' ? this.limitPrice : this.currentPrice) || 0
    },
    spotBuyRequestedValue () {
      if (!this.isSpotCashOrder) return 0
      if (this.spotBuyInputMode === 'quantity') {
        return Math.max(0, Number(this.buyQuantity) || 0) * this.spotBuyReferencePrice
      }
      return Math.max(0, Number(this.amount) || 0)
    },
    buyFundsInsufficient () {
      if (!this.isSpotCashOrder || this.balanceLoading || !this.selectedCredentialId) return false
      const requested = Number(this.spotBuyRequestedValue) || 0
      const available = Math.max(0, Number(this.activeBalanceAvailable) || 0)
      return requested > 0 && requested > available + 1e-8
    },
    buyFundsWarning () {
      if (!this.buyFundsInsufficient) return ''
      return this.$t(this.isStockMarket ? 'quickTrade.insufficientBuyingPower' : 'quickTrade.insufficientSpotBalance', {
        required: this.formatPrice(this.spotBuyRequestedValue),
        available: this.formatPrice(this.activeBalanceAvailable),
        currency: this.orderCurrency
      })
    },
    activeBalanceAvailable () {
      return this.isSwapMode ? this.swapBalanceAvailable : this.spotBalanceAvailable
    },
    activeBalanceTotal () {
      if (this.isStockMarket) return parseFloat(this.balance.total) || this.activeBalanceAvailable
      const leg = this.isSwapMode ? this.balance.swap : this.balance.spot
      return parseFloat((leg && leg.total) || this.balance.total) || 0
    },
    scopedTradeRows () {
      const symbol = String(this.currentSymbol || '').toUpperCase()
      const marketType = String(this.effectiveMarketType || '').toLowerCase()
      return this.recentTrades
        .filter(item => !symbol || String(item.symbol || '').toUpperCase() === symbol)
        .filter(item => !item.market_type || String(item.market_type).toLowerCase() === marketType)
        .map(item => {
          const requestedPrice = parseFloat(item.price || 0) || 0
          const averageFillPrice = parseFloat(item.avg_fill_price || item.filled_avg_price || 0) || 0
          const filledAmount = parseFloat(item.filled_amount || item.filled_qty || item.filled || 0) || 0
          const executedNotional = averageFillPrice > 0 && filledAmount > 0 ? averageFillPrice * filledAmount : 0
          const realizedPnl = item.realized_pnl === null || item.realized_pnl === undefined || item.realized_pnl === ''
            ? null
            : Number(item.realized_pnl)
          return {
            ...item,
            price: requestedPrice,
            avg_fill_price: averageFillPrice,
            filled_amount: filledAmount,
            display_amount: executedNotional,
            realized_pnl: Number.isFinite(realizedPnl) ? realizedPnl : null
          }
        })
    },
    openOrderRows () {
      const activeStatuses = new Set(['new', 'open', 'pending', 'submitted', 'partially_filled', 'partially-filled', 'accepted', 'cancel_pending'])
      const rows = this.isStockMarket
        ? (this.recentOpenOrders || [])
          .filter(item => !this.currentSymbol || String(item.symbol || '').toUpperCase() === String(this.currentSymbol).toUpperCase())
          .map(item => ({
            ...item,
            price: parseFloat(item.price || 0) || 0,
            avg_fill_price: parseFloat(item.avg_fill_price || item.filled_avg_price || 0) || 0,
            filled_amount: parseFloat(item.filled_amount || item.filled_qty || item.filled || 0) || 0
          }))
        : this.scopedTradeRows
      return rows
        .filter(item => activeStatuses.has(String(item.status || '').toLowerCase()))
        .filter(item => !this.isMarketOrderPositionConfirmed(item))
    },
    dockTradeRows () {
      if (this.activeDockTab === 'openOrders') return this.openOrderRows
      return this.scopedTradeRows
    },
    dockEmptyText () {
      return this.$t(this.activeDockTab === 'openOrders' ? 'quickTrade.noOrders' : 'quickTrade.noTradeRecords')
    },
    showNativeOrderActivity () {
      return this.floatingConsole && this.activeDockTab === 'openOrders' && this.isSwapMode && this.selectedCredential && ['gate', 'gateio'].includes(this.selectedCredential.exchange_id)
    },
    dockTabItems () {
      return [
        { key: 'openOrders', label: this.$t('quickTrade.openOrders'), count: this.openOrderRows.length },
        { key: 'positions', label: this.$t('quickTrade.currentPosition'), count: this.currentPositions.length },
        { key: 'tradeRecords', label: this.$t('quickTrade.floating.records'), count: this.scopedTradeRows.length },
        ...(this.floatingConsole && this.isSwapMode ? [{ key: 'positionHistory', label: this.$t('quickTrade.workflow.history'), count: 0 }] : [])
      ]
    },
    balanceErrorMessage () {
      const err = (this.balance && this.balance.error) || ''
      if (!err) return ''
      if (/40018|Invalid IP|invalid ip/i.test(err)) {
        const ip = (this.balance && this.balance.request_ip) || ''
        return this.$t('quickTrade.errorBitgetIpWhitelist', { ip: ip || '-' })
      }
      if (this.balance && this.balance.error_hint_key) {
        const key = this.balance.error_hint_key
        if (this.$te && this.$te(key)) return this.$t(key)
      }
      return err.length > 120 ? `${err.slice(0, 120)}...` : err
    },
    priceStep () {
      if (this.currentPrice > 10000) return 1
      if (this.currentPrice > 100) return 0.1
      if (this.currentPrice > 1) return 0.01
      return 0.0001
    },
    pricePrecision () {
      if (this.floatingConsole) {
        const decimals = [this.currentPrice, this.limitPrice, this.tpPrice, this.slPrice].map(value => {
          const [mantissa, exponent = '0'] = String(Number(value) || 0).toLowerCase().split('e')
          return Math.max(0, (mantissa.split('.')[1] || '').length - Number(exponent))
        })
        return Math.min(8, Math.max(2, ...decimals))
      }
      if (this.currentPrice > 10000) return 0
      if (this.currentPrice > 100) return 1
      if (this.currentPrice > 1) return 2
      return 4
    },
    submitContextReady () {
      if (this.floatingConsole && this.supportsNativeProtection && ((this.consoleTpEnabled && !(Number(this.tpPrice) > 0)) || (this.consoleSlEnabled && !(Number(this.slPrice) > 0)))) return false
      if (this.isSwapMode && this.strategyConflict) return false
      if (this.balanceLoading || this.balanceErrorMessage) return false
      return Boolean(this.tradableMarketSupported && this.selectedCredentialId && this.selectedCredential && this.currentSymbol && !this.submitting && !this.closingPositionSide)
    },
    canSubmitBuy () {
      if (!this.submitContextReady || (this.orderType === 'limit' && !(Number(this.limitPrice) > 0))) return false
      if (this.buyFundsInsufficient) return false
      if ((this.isStockMarket || this.isCryptoMarket) && !this.isSwapMode && this.spotBuyInputMode === 'quantity') {
        return Number(this.buyQuantity) > 0
      }
      return Number(this.amount) > 0
    },
    canSubmitSell () {
      if (!this.submitContextReady || (this.orderType === 'limit' && !(Number(this.limitPrice) > 0))) return false
      if ((this.isStockMarket || this.isCryptoMarket) && !this.isSwapMode) {
        if (this.spotSellInputMode === 'amount') {
          const requested = Number(this.sellAmount)
          return this.spotSellReferencePrice > 0 && requested > 0 && requested <= this.spotSellAvailableValue
        }
        const requested = Number(this.sellQuantity)
        return requested > 0 && requested <= this.spotSellAvailable
      }
      if (!this.isSwapMode && this.currentPositions.length === 0) return false
      return Number(this.amount) > 0
    },
    canSubmit () {
      return this.canSubmitBuy
    },
    selectedCredential () {
      return this.credentials.find(c => c.id === this.selectedCredentialId)
    },
    selectedStockBrokerId () {
      return String((this.selectedCredential && this.selectedCredential.exchange_id) || 'alpaca').trim().toLowerCase()
    },
    selectedStockBrokerClient () {
      return broker[this.selectedStockBrokerId] || broker.alpaca
    },
    priceChangeClass () {
      return ''
    },
    buyActionText () {
      return this.isSwapMode ? this.$t('quickTrade.buyLong') : this.$t('quickTrade.buySpot')
    },
    sellActionText () {
      return this.isSwapMode ? this.$t('quickTrade.sellShort') : this.$t('quickTrade.sellSpot')
    },
    collapseStyle () {
      return { background: 'transparent', borderRadius: '4px', border: 0, overflow: 'hidden' }
    },
    containerProps () {
      if (this.embedded) return {}
      return {
        title: null,
        width: 400,
        visible: this.visible,
        closable: false,
        bodyStyle: { padding: 0 },
        maskStyle: { background: 'rgba(0,0,0,0.45)' }
      }
    }
  },
  watch: {
    visible (val) {
      if (this.embedded) {
        if (val) {
          this.init()
        } else {
          this.stopPolling()
        }
        return
      }
      if (val) {
        this.init()
      } else {
        this.stopPolling()
      }
    },
    symbol (val) {
      // Update currentSymbol when prop changes
      if (val) {
        this.currentSymbol = val
      }
    },
    currentSymbol (val) {
      this.tradeFeedback = null
      this.positionEditor = null
      this.historyRecordSource = ''
      this.limitPrice = 0
      this.tpPrice = null
      this.slPrice = null
      this.consoleTpEnabled = false
      this.consoleSlEnabled = false
      this.buyQuantity = null
      this.sellQuantity = null
      this.sellAmount = null
      // Reload price and position when symbol changes
      if (val) {
        this.loadPrice()
        if (this.selectedCredentialId) {
          this.loadPosition()
          this.loadBalance()
        }
        // Emit symbol change to parent
        if (!this.symbolLocked) this.$emit('update:symbol', val)
      }
    },
    market () {
      this.tradeFeedback = null
      this.syncTradeModeFromProps()
      this.selectedCredentialId = undefined
      this.resetBalance()
      this.currentPositions = []
      this.recentTrades = []
      this.recentOpenOrders = []
      this.marketOrderConfirmations = {}
      this.positionEditor = null
      this.loadCredentials()
      this.loadWatchlistSymbols()
      if (this.currentSymbol) this.loadPrice()
    },
    marketType () {
      this.syncTradeModeFromProps()
    },
    availableMarketTypes () {
      this.syncTradeModeFromProps()
    },
    exchangeId (val) {
      if (val && this.isCryptoMarket && this.credentials.length) {
        this.syncCredentialToExchange(val)
      }
    },
    selectedCredentialId (val) {
      this.tradeFeedback = null
      this.limitPrice = 0
      this.tpPrice = null
      this.slPrice = null
      this.consoleTpEnabled = false
      this.consoleSlEnabled = false
      this.buyQuantity = null
      this.sellQuantity = null
      this.sellAmount = null
      this.resetBalance()
      this.currentPositions = []
      this.recentTrades = []
      this.recentOpenOrders = []
      this.marketOrderConfirmations = {}
      this.positionEditor = null
      if (val && this.isCryptoMarket) {
        const credential = this.credentials.find(c => c.id === val)
        const credentialExchangeId = String((credential && credential.exchange_id) || '').trim().toLowerCase()
        if (credentialExchangeId) {
          this.$emit('exchange-change', {
            credentialId: val,
            exchangeId: credentialExchangeId,
            marketType: this.effectiveMarketType
          })
        }
      }
      // Reload position when credential changes
      if (val && this.currentSymbol) {
        this.loadPosition()
        this.loadHistory()
      }
    },
    presetSide (val) {
      if (val) this.side = val
    },
    orderType (value) {
      if (value === 'limit' && this.currentPrice > 0) this.limitPrice = this.currentPrice
    },
    leverage () {
      this.scheduleQuickTradeWarmup()
    },
    marginMode () {
      this.scheduleQuickTradeWarmup()
    },
    presetPrice (val) {
      if (val > 0) {
        this.currentPrice = val
        this.currentPriceUpdatedAt = Date.now()
        if (this.orderType !== 'limit' || !(this.limitPrice > 0)) this.limitPrice = val
      }
    },
    tradeMode (val) {
      this.tradeFeedback = null
      if (val === 'spot' && this.activeDockTab === 'positionHistory') this.activeDockTab = 'positions'
      this.limitPrice = 0
      this.tpPrice = null
      this.slPrice = null
      this.consoleTpEnabled = false
      this.consoleSlEnabled = false
      this.buyQuantity = null
      this.sellQuantity = null
      this.sellAmount = null
      if (this.isStockMarket && val !== 'spot') {
        this.tradeMode = 'spot'
        return
      }
      this.currentPositions = []
      this.recentTrades = []
      this.recentOpenOrders = []
      this.marketOrderConfirmations = {}
      this.positionEditor = null
      this.$nextTick(() => {
        if (this.selectedCredentialId) {
          this.loadBalance()
          this.loadPosition()
          this.loadHistory()
        }
      })
    },
    currentPositions: {
      deep: true,
      handler () {
        this.emitPositionOverlayChange()
      }
    },
    recentTrades: {
      deep: true,
      handler () {
        this.emitPositionOverlayChange()
      }
    }
  },
  mounted () {
    if (this.embedded) {
      if (this.visible) this.init()
    } else if (this.visible) {
      this.init()
    }
  },
  methods: {
    scheduleQuickTradeWarmup () {
      if (this.quickTradeWarmupTimer) clearTimeout(this.quickTradeWarmupTimer)
      if (!this.selectedCredentialId || !this.currentSymbol || !this.isSwapMode) return
      this.quickTradeWarmupTimer = setTimeout(() => {
        this.quickTradeWarmupTimer = null
        this.loadBalance()
      }, 250)
    },
    normalizeLeverage () {
      this.leverage = Math.max(1, Math.min(125, Math.round(Number(this.leverage) || 1)))
    },
    positionCostHint (position) {
      if (this.isSwapMode) return ''
      return this.$t(position.entry_price > 0 ? 'quickTrade.floating.costEstimate' : 'quickTrade.floating.costUnavailable')
    },
    positionSizeForSide (side) {
      const target = String(side || '').toLowerCase()
      return this.currentPositions.reduce((total, position) => {
        if (String(position.side || '').toLowerCase() !== target) return total
        const size = Number(position.size ?? position.qty ?? position.quantity ?? 0)
        return total + (Number.isFinite(size) ? Math.max(0, size) : 0)
      }, 0)
    },
    rememberMarketOrderConfirmation (tradeId, positionSide, baselineSize, direction) {
      const key = String(tradeId || '')
      if (!key) return
      this.marketOrderConfirmations = {
        ...this.marketOrderConfirmations,
        [key]: {
          positionSide: String(positionSide || '').toLowerCase(),
          baselineSize: Math.max(0, Number(baselineSize) || 0),
          direction: direction === 'decrease' ? 'decrease' : 'increase',
          expiresAt: Date.now() + 20000
        }
      }
    },
    isMarketOrderPositionConfirmed (trade) {
      if (!trade || String(trade.order_type || '').toLowerCase() !== 'market') return false
      const marker = this.marketOrderConfirmations[String(trade.id || '')]
      if (!marker || Date.now() > Number(marker.expiresAt || 0)) return false
      const currentSize = this.positionSizeForSide(marker.positionSide)
      const baselineSize = Math.max(0, Number(marker.baselineSize) || 0)
      const tolerance = Math.max(1e-12, baselineSize * 1e-9)
      return marker.direction === 'decrease'
        ? currentSize < baselineSize - tolerance
        : currentSize > baselineSize + tolerance
    },
    pruneMarketOrderConfirmations () {
      const terminal = new Set(['filled', 'cancelled', 'canceled', 'failed', 'rejected', 'expired'])
      const statusById = new Map(this.scopedTradeRows.map(row => [String(row.id || ''), String(row.status || '').toLowerCase()]))
      const now = Date.now()
      this.marketOrderConfirmations = Object.entries(this.marketOrderConfirmations).reduce((next, [key, marker]) => {
        if (now <= Number(marker.expiresAt || 0) && !terminal.has(statusById.get(key))) next[key] = marker
        return next
      }, {})
    },
    selectDockTab (key, event) {
      this.activeDockTab = key
      if (this.floatingConsole) this.floatingActivityExpanded = true
      const target = event && event.currentTarget
      this.$nextTick(() => {
        if (key === 'positionHistory' && this.$refs.positionActivity) {
          this.$refs.positionActivity.load()
        }
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
        }
      })
    },
    syncTradeModeFromProps () {
      const requestedMode = String(this.marketType || '').toLowerCase() === 'spot' ? 'spot' : 'swap'
      let nextMode = 'spot'
      if (!this.isStockMarket) {
        nextMode = this.normalizedAvailableMarketTypes.includes(requestedMode)
          ? requestedMode
          : this.normalizedAvailableMarketTypes[0]
      }
      if (this.tradeMode !== nextMode) this.tradeMode = nextMode
    },
    syncCredentialToExchange (exchangeId) {
      if (!this.isCryptoMarket) return false
      const normalizedExchangeId = String(exchangeId || '').trim().toLowerCase()
      if (!normalizedExchangeId) return false
      const selected = this.credentials.find(c => c.id === this.selectedCredentialId)
      if (selected && String(selected.exchange_id || '').trim().toLowerCase() === normalizedExchangeId) return true
      const matchingCredential = this.credentials.find(c => String(c.exchange_id || '').trim().toLowerCase() === normalizedExchangeId)
      if (!matchingCredential) {
        this.selectedCredentialId = undefined
        this.resetBalance()
        this.currentPositions = []
        this.recentTrades = []
        this.recentOpenOrders = []
        return false
      }
      this.onCredentialChange(matchingCredential.id)
      return true
    },
    selectTradeMode (mode) {
      const nextMode = mode === 'spot' ? 'spot' : 'swap'
      if (!this.normalizedAvailableMarketTypes.includes(nextMode)) return
      if (this.tradeMode !== nextMode) this.tradeMode = nextMode
      this.$emit('market-type-change', nextMode)
    },
    credentialEnvironmentLabel (credential) {
      const environment = String((credential && credential.environment) || '').toLowerCase()
      return this.$t(environment === 'testnet'
        ? 'profile.exchange.environmentTestnet'
        : 'profile.exchange.environmentDemo')
    },
    formatCredentialOptionLabel (cred) {
      if (cred && cred.type === 'broker') {
        return cred.name || this.$t('quickTrade.alpacaAccount')
      }
      return formatExchangeCredentialLabel(cred, {
        unnamed: this.$t('brokerAccounts.cryptoSection.unnamed')
      })
    },
    qtSelectPopupContainer (triggerNode) {
      if (typeof this.overlayGetContainer === 'function') {
        return this.overlayGetContainer(triggerNode)
      }
      const fs = document.fullscreenElement || document.webkitFullscreenElement
      const el = this.$el
      if (el && fs && typeof fs.contains === 'function' && fs.contains(el)) return fs
      return document.body
    },
    qtOverlayMount () {
      if (typeof this.overlayGetContainer === 'function') {
        const n = this.overlayGetContainer()
        return n || document.body
      }
      const fs = document.fullscreenElement || document.webkitFullscreenElement
      const el = this.$el
      if (el && fs && typeof fs.contains === 'function' && fs.contains(el)) return fs
      return document.body
    },
    async init () {
      this.tradeFeedback = null
      // Initialize current symbol from prop
      this.currentSymbol = this.symbol || ''
      if (this.presetSide) this.side = this.presetSide
      this.syncTradeModeFromProps()
      if (this.presetPrice > 0) {
        this.currentPrice = this.presetPrice
        this.currentPriceUpdatedAt = Date.now()
        this.limitPrice = this.presetPrice
      }
      await this.loadCredentials()
      // Load user info to get userId
      await this.loadUserInfo()
      // Load watchlist crypto symbols for initial suggestions
      await this.loadWatchlistSymbols()
      // Load price for current symbol
      if (this.currentSymbol) {
        await this.loadPrice()
      }
      // Load position if credential and symbol are already available
      if (this.selectedCredentialId && this.currentSymbol) {
        await this.loadPosition()
      }
      this.loadHistory()
      this.startPolling()
    },
    async loadUserInfo () {
      try {
        // Try to get user info from store first
        const store = this.$store
        const storeUserInfo = store?.getters?.userInfo || {}
        if (storeUserInfo && storeUserInfo.id) {
          this.userId = storeUserInfo.id
          return
        }
        // If not in store, fetch from API
        const res = await getUserInfo()
        if (res && res.code === 1 && res.data) {
          this.userId = res.data.id
          // Update store
          if (store) {
            store.commit('SET_INFO', res.data)
          }
        }
      } catch (e) {
        console.warn('loadUserInfo error:', e)
      }
    },
    apiPayload (res) {
      if (!res) return {}
      if (res.data && typeof res.data === 'object') return res.data.data || res.data
      return res
    },
    apiSuccess (res) {
      return !!(res && (res.success === true || res.code === 1 || (res.data && res.data.success === true)))
    },
    normalizeBrokerSymbol (symbol) {
      return String(symbol || '').replace(/^(?:USStock|HKStock):/i, '').trim()
    },
    resetBalance () {
      this.balance = {
        available: 0,
        total: 0,
        swap: { available: 0, total: 0 },
        spot: { available: 0, total: 0 }
      }
    },
    toFiniteNumber (value, fallback = 0) {
      const n = parseFloat(value)
      return Number.isFinite(n) ? n : fallback
    },
    pickNumber (source, keys, fallback = 0) {
      const obj = source || {}
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
          return this.toFiniteNumber(obj[key], fallback)
        }
      }
      return fallback
    },
    pickOptionalNumber (source, keys) {
      const obj = source || {}
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
          return this.toFiniteNumber(obj[key], 0)
        }
      }
      return null
    },
    inferPositionSide (position, rawQty) {
      const rawSide = String(
        position.side ||
        position.position_side ||
        position.positionSide ||
        position.pos_side ||
        position.holdSide ||
        ''
      ).toLowerCase()
      if (rawSide.includes('short') || rawSide.includes('sell')) return 'short'
      if (rawSide.includes('long') || rawSide.includes('buy')) return 'long'
      return rawQty < 0 ? 'short' : 'long'
    },
    calculatePositionPnl (side, size, entryPrice, markPrice) {
      if (!(size > 0 && entryPrice > 0 && markPrice > 0)) return null
      return side === 'short'
        ? (entryPrice - markPrice) * size
        : (markPrice - entryPrice) * size
    },
    formatLeverage (value) {
      const leverage = Math.max(this.toFiniteNumber(value, 1), 1)
      return `${Number.isInteger(leverage) ? leverage : leverage.toFixed(2)}x`
    },
    formatSignedPrice (value) {
      const amount = this.toFiniteNumber(value, 0)
      return `${amount > 0 ? '+' : ''}${this.formatPrice(amount)}`
    },
    formatSignedPercent (value) {
      if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
      const percent = Number(value)
      return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`
    },
    normalizePositionTimestamp (value) {
      const instant = parseUtcAwareInstant(value)
      return instant ? instant.getTime() : 0
    },
    positionEntryTimestamp (position) {
      const source = position || {}
      const explicitKeys = [
        'entry_time', 'entryTime', 'open_time', 'openTime', 'opened_at', 'openedAt',
        'created_at', 'createdAt', 'timestamp'
      ]
      for (const key of explicitKeys) {
        const timestamp = this.normalizePositionTimestamp(source[key])
        if (timestamp > 0) return timestamp
      }

      const expectedSide = source.side === 'short' ? 'sell' : 'buy'
      const normalizedSymbol = String(this.currentSymbol || '').replace(/[^a-z0-9]/gi, '').toUpperCase()
      let latestTimestamp = 0
      for (const trade of this.recentTrades || []) {
        if (!trade || trade.is_close === true || String(trade.is_close).toLowerCase() === 'true') continue
        const tradeSide = String(trade.side || '').toLowerCase()
        if (tradeSide !== expectedSide) continue
        const tradeSymbol = String(trade.symbol || this.currentSymbol || '').replace(/[^a-z0-9]/gi, '').toUpperCase()
        if (normalizedSymbol && tradeSymbol && tradeSymbol !== normalizedSymbol) continue
        const timestamp = this.normalizePositionTimestamp(
          trade.filled_at || trade.filledAt || trade.updated_at || trade.updatedAt || trade.created_at || trade.createdAt || trade.timestamp
        )
        if (timestamp > latestTimestamp) latestTimestamp = timestamp
      }
      return latestTimestamp
    },
    emitPositionOverlayChange () {
      const positions = (this.currentPositions || [])
        .filter(position => Number(position && position.size) > 1e-12 && Number(position && position.entry_price) > 0)
        .map(position => ({
          side: position.side === 'short' ? 'short' : 'long',
          size: Number(position.size),
          entryPrice: Number(position.entry_price),
          entryTimestamp: this.positionEntryTimestamp(position),
          costLabel: this.$t('quickTrade.entryPrice'),
          entryLabel: this.$t(position.side === 'short' ? 'quickTrade.short' : 'quickTrade.long')
        }))
      this.$emit('position-overlay-change', {
        symbol: this.currentSymbol,
        marketType: this.effectiveMarketType,
        positions
      })
    },
    normalizePosition (position, options = {}) {
      const rawQty = this.pickNumber(position, ['size', 'qty', 'quantity', 'position', 'positionAmt', 'contracts'], 0)
      const size = Math.abs(rawQty)
      const side = this.inferPositionSide(position, rawQty)
      const entryPrice = this.pickNumber(position, ['entry_price', 'avg_entry_price', 'avgEntryPrice', 'entryPrice', 'average_price', 'avgPrice'], 0)
      const markPrice = this.pickNumber(position, ['mark_price', 'markPrice', 'current_price', 'currentPrice', 'last_price', 'lastPrice'], this.currentPrice || 0)
      const providedNotional = this.pickOptionalNumber(position, ['notional_usdt', 'notionalUsd', 'notional_usd', 'notional', 'positionValue', 'position_value', 'market_value', 'marketValue', 'value'])
      const notionalUsdt = providedNotional !== null && Math.abs(providedNotional) > 0
        ? Math.abs(providedNotional)
        : (size > 0 && markPrice > 0 ? size * markPrice : 0)
      const providedPnl = this.pickOptionalNumber(position, ['unrealized_pnl', 'unrealizedPnl', 'unrealized_pl', 'unrealizedPL', 'profit', 'pnl'])
      const computedPnl = this.calculatePositionPnl(side, size, entryPrice, markPrice)
      const shouldPreferComputed = options.preferComputedPnl || this.isStockMarket || this.effectiveMarketType === 'spot'
      const unrealizedPnl = shouldPreferComputed
        ? (computedPnl !== null ? computedPnl : (providedPnl !== null ? providedPnl : 0))
        : (providedPnl !== null ? providedPnl : (computedPnl !== null ? computedPnl : 0))
      const normalized = {
        ...position,
        side,
        size,
        entry_price: entryPrice,
        mark_price: markPrice,
        notional_usdt: notionalUsdt,
        unrealized_pnl: unrealizedPnl,
        leverage: this.pickNumber(position, ['leverage'], position.leverage || 1),
        initial_margin: this.pickNumber(position, ['initial_margin', 'initialMargin', 'positionInitialMargin', 'position_margin', 'margin'], 0)
      }
      return {
        ...normalized,
        ...calculatePositionMetrics(normalized, this.isSwapMode)
      }
    },
    applyNewPrice (price) {
      const parsed = parseFloat(price || 0)
      if (parsed > 0) {
        this.currentPrice = parsed
        this.currentPriceUpdatedAt = Date.now()
        if (this.orderType !== 'limit' || !(this.limitPrice > 0)) {
          this.limitPrice = parsed
        }
      }
    },
    applyLiquidityPrice (price) {
      const parsed = Number(price || 0)
      if (!(parsed > 0)) return
      this.orderType = 'limit'
      this.limitPrice = parsed
    },
    handleAddAccountClick () {
      if (this.isStockMarket) {
        this.$router.push('/broker-accounts')
        return
      }
      this.showAddExchangeModal = true
    },
    async loadWatchlistSymbols () {
      if (!this.userId) {
        // If no userId, try to load it first
        await this.loadUserInfo()
        if (!this.userId) {
          console.warn('Cannot load watchlist: userId not available')
          return
        }
      }
      try {
        const targetMarket = this.priceMarketParam.toLowerCase()
        const res = await getWatchlist({ userid: this.userId })
        if (res && res.code === 1 && res.data) {
          const symbols = (res.data || []).filter(item =>
            (item.market || '').toLowerCase() === targetMarket
          ).map(item => ({
            value: item.symbol || '',
            symbol: item.symbol || '',
            name: item.name || ''
          })).filter(item => item.value)

          this.symbolSuggestions = symbols
        }
      } catch (e) {
        console.warn('loadWatchlistSymbols error:', e)
      }
    },
    handleSymbolSearch (value) {
      // Clear previous timer
      if (this.symbolSearchTimer) {
        clearTimeout(this.symbolSearchTimer)
      }

      if (!value || value.trim() === '') {
        // If empty, load watchlist symbols
        this.loadWatchlistSymbols()
        return
      }

      // Debounce search
      this.symbolSearchTimer = setTimeout(async () => {
        this.symbolSearching = true
        try {
          const res = await searchSymbols({ market: this.priceMarketParam, keyword: value.trim(), limit: 20 })
          if (res && res.code === 1 && res.data) {
            this.symbolSuggestions = (res.data.items || res.data || []).map(item => ({
              value: item.symbol || '',
              symbol: item.symbol || '',
              name: item.name || ''
            })).filter(item => item.value)
          } else {
            this.symbolSuggestions = []
          }
        } catch (e) {
          console.warn('handleSymbolSearch error:', e)
          this.symbolSuggestions = []
        } finally {
          this.symbolSearching = false
        }
      }, 300)
    },
    handleSymbolChange (value) {
      this.tradeFeedback = null
      if (value && value !== this.currentSymbol) {
        this.currentSymbol = value
        // Load price for new symbol
        this.loadPrice()
        // Reload position for new symbol
        if (this.selectedCredentialId) {
          this.loadPosition()
        }
        // Emit to parent
        if (!this.symbolLocked) this.$emit('update:symbol', value)
      }
    },
    async loadPrice () {
      if (!this.currentSymbol) {
        this.currentPrice = 0
        return
      }
      const symbol = this.currentSymbol
      const exchangeId = this.isCryptoMarket ? String((this.selectedCredential && this.selectedCredential.exchange_id) || this.exchangeId || '') : ''
      const marketType = this.effectiveMarketType
      try {
        const params = {
          market: this.priceMarketParam,
          symbol
        }
        if (this.isCryptoMarket) {
          Object.assign(params, {
            exchange_id: exchangeId,
            market_type: marketType
          })
          appendStrictProductIdentity(params, this)
        }
        const res = await request({
          url: '/api/market/price',
          method: 'get',
          params
        })
        if (symbol !== this.currentSymbol || marketType !== this.effectiveMarketType || (this.isCryptoMarket && exchangeId !== String((this.selectedCredential && this.selectedCredential.exchange_id) || this.exchangeId || ''))) return
        if (res && res.code === 1 && res.data) {
          this.applyNewPrice(res.data.price || res.data.latest || res.data.last)
          return
        }
        if (this.isStockMarket && this.selectedStockBrokerId === 'alpaca') {
          const quote = await broker.alpaca.quote(this.normalizeBrokerSymbol(this.currentSymbol), { marketType: 'USStock', credential_id: this.selectedCredentialId })
          const data = this.apiPayload(quote)
          this.applyNewPrice(data.price || data.latest || data.last || data.ask || data.bid)
        }
      } catch (e) {
        console.warn('loadPrice error:', e)
        if (this.isStockMarket && this.selectedStockBrokerId === 'alpaca') {
          try {
            const quote = await broker.alpaca.quote(this.normalizeBrokerSymbol(this.currentSymbol), { marketType: 'USStock', credential_id: this.selectedCredentialId })
            const data = this.apiPayload(quote)
            this.applyNewPrice(data.price || data.latest || data.last || data.ask || data.bid)
          } catch (stockErr) {
            console.warn('load stock price error:', stockErr)
          }
        }
        // Don't reset price on error, keep current value
      }
    },
    handleSymbolFocus () {
      // Load watchlist symbols when focusing if no suggestions
      if (this.symbolSuggestions.length === 0) {
        this.loadWatchlistSymbols()
      }
    },
    async loadCredentials () {
      this.credLoading = true
      try {
        if (this.isStockMarket) {
          const response = await listExchangeCredentials()
          const payload = this.apiPayload(response)
          const items = Array.isArray(payload) ? payload : (payload.items || [])
          const supportedBrokers = this.normalizedMarket === 'HKStock' ? HK_STOCK_EXCHANGE_IDS : US_STOCK_EXCHANGE_IDS
          this.credentials = items
            .filter(account => supportedBrokers.has(String(account.exchange_id || '').trim().toLowerCase()))
            .map(account => ({
              ...account,
              id: Number(account.id),
              type: 'broker',
              broker_id: String(account.exchange_id || '').trim().toLowerCase(),
              exchange_id: String(account.exchange_id || '').trim().toLowerCase(),
              name: formatExchangeCredentialLabel(account, { unnamed: this.$t('brokerAccounts.cryptoSection.unnamed') }),
              market_type: this.priceMarketParam
            }))
          if (this.selectedCredentialId && !this.credentials.some(c => c.id === this.selectedCredentialId)) {
            this.selectedCredentialId = undefined
            this.resetBalance()
            this.currentPositions = []
          }
          if (!this.selectedCredentialId && this.credentials.length > 0) {
            this.selectedCredentialId = this.credentials[0].id
            this.onCredentialChange(this.selectedCredentialId)
          }
          return
        }
        const res = await listExchangeCredentials()
        if (res.code === 1 && res.data) {
          const all = res.data.items || res.data || []
          this.credentials = all.filter(isQuickTradeExchangeCredential)
          if (this.selectedCredentialId && !this.credentials.some(c => c.id === this.selectedCredentialId)) {
            this.selectedCredentialId = undefined
            this.resetBalance()
            this.currentPositions = []
          }
          if (this.exchangeId) {
            this.syncCredentialToExchange(this.exchangeId)
          } else if (!this.selectedCredentialId && this.credentials.length > 0) {
            this.selectedCredentialId = this.credentials[0].id
            this.onCredentialChange(this.selectedCredentialId)
          }
        }
      } catch (e) {
        console.error('loadCredentials error:', e)
      } finally {
        this.credLoading = false
      }
    },
    async onExchangeAccountSaved (data) {
      const prevId = this.selectedCredentialId
      await this.loadCredentials()
      const newId = data && (data.id || data.credential_id)
      if (newId && this.credentials.some(c => c.id === newId)) {
        this.selectedCredentialId = newId
        await this.onCredentialChange(newId)
      } else if (newId) {
        this.$message.warning(this.$t('quickTrade.noExchange'))
      } else if (!prevId && this.credentials.length === 1) {
        this.selectedCredentialId = this.credentials[0].id
        await this.onCredentialChange(this.selectedCredentialId)
      }
    },
    async onCredentialChange (credId) {
      if (!this.credentials.some(c => c.id === credId)) {
        this.selectedCredentialId = undefined
        this.$message.warning(this.isStockMarket ? this.$t('quickTrade.noBrokerAccount') : this.$t('quickTrade.noExchange'))
        return
      }
      this.selectedCredentialId = credId
      await this.loadBalance()
      await this.loadPosition()
    },
    async loadBalance (fresh = false) {
      if (!this.selectedCredentialId) return
      const credentialId = this.selectedCredentialId
      const marketType = this.effectiveMarketType
      const requestId = (this.balanceRequestId || 0) + 1
      this.balanceRequestId = requestId
      const isCurrent = () => this.selectedCredentialId === credentialId && this.effectiveMarketType === marketType && this.balanceRequestId === requestId
      this.balanceLoading = true
      try {
        if (this.isStockMarket) {
          const res = await (this.selectedStockBrokerClient || broker.alpaca).account({ credential_id: credentialId, include_counts: false })
          if (!isCurrent()) return
          const d = this.apiPayload(res)
          const available = parseFloat(d.buying_power || d.buyingPower || d.cash || 0) || 0
          const total = parseFloat(d.equity || d.portfolio_value || d.portfolioValue || d.cash || available) || available
          this.balance = {
            available,
            total,
            currency: 'USD',
            swap: { available: 0, total: 0 },
            spot: { available, total }
          }
          return
        }
        const params = {
          credential_id: credentialId,
          market_type: marketType,
          symbol: this.currentSymbol,
          leverage: this.leverage,
          margin_mode: this.marginMode,
          resolve_product: this.isCryptoMarket ? '1' : undefined,
          refresh: fresh === true ? '1' : undefined
        }
        appendStrictProductIdentity(params, this)
        const res = await getQuickTradeBalance(params)
        if (!isCurrent()) return
        if (res.code === 1 && res.data) {
          const d = res.data || {}
          const swap = d.swap && typeof d.swap === 'object' ? d.swap : {}
          const spot = d.spot && typeof d.spot === 'object' ? d.spot : {}
          const activeLeg = marketType === 'swap' ? swap : spot
          if (d.error || activeLeg.error) {
            this.balance = { ...this.balance, error: d.error || activeLeg.error, error_hint_key: d.error_hint_key || '', request_ip: d.request_ip || '' }
            return
          }
          const activeAvail = parseFloat(activeLeg.available ?? d.available) || 0
          this.balance = {
            available: activeAvail,
            total: parseFloat(d.total) || 0,
            currency: d.currency || 'USDT',
            swap: {
              available: parseFloat(swap.available) || 0,
              total: parseFloat(swap.total) || 0
            },
            spot: {
              available: parseFloat(spot.available) || 0,
              total: parseFloat(spot.total) || 0
            },
            error: d.error || swap.error || spot.error || '',
            error_hint_key: d.error_hint_key || '',
            request_ip: d.request_ip || ''
          }
          if (d.error && this.$message) {
            this.$message.warning(this.balanceErrorMessage || d.error, 6)
          }
        } else {
          this.balance = { ...this.balance, error: res.msg || res.message || this.$t('quickTrade.refreshFailed') }
        }
      } catch (e) {
        console.warn('loadBalance error:', e)
        if (!isCurrent()) return
        this.balance = {
          ...this.balance,
          error: String(e.message || e)
        }
      } finally {
        if (this.balanceRequestId === requestId) this.balanceLoading = false
      }
    },
    async loadPosition (fresh = false) {
      const credentialId = this.selectedCredentialId
      const symbol = this.currentSymbol
      const marketType = this.effectiveMarketType
      const requestId = (this.positionRequestId || 0) + 1
      this.positionRequestId = requestId
      const isCurrent = () => this.selectedCredentialId === credentialId && this.currentSymbol === symbol && this.effectiveMarketType === marketType && this.positionRequestId === requestId
      if (!credentialId || !symbol) return
      try {
        if (this.isStockMarket) {
          const res = await (this.selectedStockBrokerClient || broker.alpaca).positions({ credential_id: credentialId })
          if (!isCurrent()) return
          const payload = this.apiPayload(res)
          const items = Array.isArray(payload) ? payload : (payload.positions || payload.items || payload.data || [])
          const target = this.normalizeBrokerSymbol(symbol).toUpperCase()
          const matched = items.filter(p => this.normalizeBrokerSymbol(p.symbol || p.asset_symbol || '').toUpperCase() === target)
          this.currentPositions = matched.map(p => this.normalizePosition({ ...p, side: 'long', leverage: 1 }, { preferComputedPnl: true }))
          return this.currentPositions.length > 0
        }
        const params = {
          credential_id: credentialId,
          symbol,
          market_type: marketType,
          resolve_product: 'true',
          refresh: fresh === true ? '1' : undefined
        }
        appendStrictProductIdentity(params, this)
        const res = await getQuickTradePosition(params)
        if (!isCurrent()) return
        if (res.code === 1 && res.data && Array.isArray(res.data.positions)) {
          this.currentPositions = res.data.positions.map(p => this.normalizePosition(p))
          this.strategyConflict = res.data.strategy_conflict && res.data.strategy_conflict.active
            ? res.data.strategy_conflict
            : null
          return this.currentPositions.length > 0
        }
      } catch (e) { console.warn('loadPosition error:', e) }
      return false
    },
    async loadPositionWithRetry (maxRetries = 3, delayMs = 2000) {
      // Try to load position immediately
      let found = await this.loadPosition()
      if (found) return

      // If not found, retry with delay (exchange may need time to update)
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
        found = await this.loadPosition()
        if (found) {
          console.log(`Position found after ${i + 1} retry(ies)`)
          return
        }
      }
      console.log('Position not found after all retries')
    },
    async loadHistory () {
      const credentialId = this.selectedCredentialId
      try {
        if (this.isStockMarket) {
          if (!credentialId) return
          const symbol = this.normalizeBrokerSymbol(this.currentSymbol)
          const [ordersResult, fillsResult] = await Promise.allSettled([
            (this.selectedStockBrokerClient || broker.alpaca).orders({ limit: 100, status: 'open', credential_id: credentialId }),
            (this.selectedStockBrokerClient || broker.alpaca).tradeHistory({ limit: 100, symbol, credential_id: credentialId })
          ])
          if (
            this.selectedCredentialId !== credentialId ||
            this.normalizeBrokerSymbol(this.currentSymbol) !== symbol
          ) return
          if (ordersResult.status === 'fulfilled') {
            const payload = this.apiPayload(ordersResult.value)
            const items = Array.isArray(payload) ? payload : (payload.orders || payload.items || payload.data || [])
            this.recentOpenOrders = (items || []).map(o => {
              const requestedPrice = parseFloat(o.limit_price || 0) || 0
              const fillPrice = parseFloat(o.filled_avg_price || 0) || 0
              const filledAmount = parseFloat(o.filled_qty || 0) || 0
              const requestedQty = parseFloat(o.qty || 0) || 0
              const requestedNotional = parseFloat(o.notional || 0) || 0
              const notional = requestedNotional || ((filledAmount || requestedQty) * (fillPrice || requestedPrice))
              return {
                id: o.id || o.order_id || `${o.symbol}-${o.created_at || Date.now()}`,
                symbol: o.symbol || this.currentSymbol,
                side: o.side || 'buy',
                amount: notional,
                requested_notional: requestedNotional,
                requested_base_qty: requestedQty,
                filled_amount: filledAmount,
                price: requestedPrice,
                avg_fill_price: fillPrice,
                market_type: 'spot',
                order_type: o.order_type || o.type || 'market',
                exchange_order_id: o.id || o.order_id || '',
                status: o.status || '',
                created_at: o.submitted_at || o.created_at || o.updated_at
              }
            })
          }
          if (fillsResult.status !== 'fulfilled') {
            this.historyRecordSource = ''
            console.warn('load Alpaca fills error:', fillsResult.reason)
            return
          }
          const fillPayload = this.apiPayload(fillsResult.value)
          const fills = Array.isArray(fillPayload) ? fillPayload : (fillPayload.fills || fillPayload.items || fillPayload.data || [])
          this.recentTrades = (fills || []).map(o => {
            const fillPrice = parseFloat(o.avg_fill_price || o.filled_avg_price || o.price || 0) || 0
            const filledAmount = parseFloat(o.filled_amount || o.filled_qty || o.qty || 0) || 0
            return {
              ...o,
              id: o.id || o.exchange_fill_id || `${o.symbol}-${o.filled_at || Date.now()}`,
              symbol: o.symbol || this.currentSymbol,
              side: o.side || 'buy',
              amount: parseFloat(o.amount || 0) || (filledAmount * fillPrice),
              filled_amount: filledAmount,
              avg_fill_price: fillPrice,
              market_type: 'spot',
              order_type: 'fill',
              exchange_order_id: o.exchange_order_id || o.order_id || '',
              status: 'filled',
              commission: parseFloat(o.commission || 0) || 0,
              commission_ccy: o.commission_ccy || 'USD',
              commission_quote: o.commission_quote === null || o.commission_quote === undefined
                ? null
                : (parseFloat(o.commission_quote) || 0),
              fees_by_ccy: o.fees_by_ccy || {},
              fee_status: o.fee_status || 'pending',
              source: o.source || 'exchange',
              created_at: o.filled_at || o.transaction_time || o.created_at
            }
          })
          this.historyRecordSource = 'exchange'
          return
        }
        if (!credentialId || !this.currentSymbol) {
          this.historyRecordSource = ''
          return
        }
        const symbol = this.currentSymbol
        const marketType = this.effectiveMarketType
        const res = await getQuickTradeHistory({
          limit: 50,
          credential_id: credentialId,
          symbol,
          market_type: marketType
        })
        if (
          this.selectedCredentialId !== credentialId ||
          this.currentSymbol !== symbol ||
          this.effectiveMarketType !== marketType
        ) return
        if (res.code === 1 && res.data) {
          this.recentTrades = res.data.trades || []
          this.historyRecordSource = res.data.source || ''
          this.pruneMarketOrderConfirmations()
        }
      } catch (e) {
        this.historyRecordSource = ''
        console.warn('loadHistory error:', e)
      }
    },
    canCancelTrade (trade) {
      if (!trade) return false
      if (String(trade.order_type || '').toLowerCase() !== 'limit') return false
      const status = String(trade.status || '').toLowerCase().replace('-', '_')
      const active = ['new', 'open', 'pending', 'pending_new', 'pending_replace', 'held', 'submitted', 'partially_filled', 'accepted'].includes(status)
      return active && !!(this.isStockMarket ? trade.id : trade.exchange_order_id)
    },
    async handleCancelTrade (trade) {
      if (!this.canCancelTrade(trade) || this.cancellingTradeId) return
      this.cancellingTradeId = trade.id
      try {
        const res = this.isStockMarket
          ? await (this.selectedStockBrokerClient || broker.alpaca).cancelOrder(trade.id, { credential_id: this.selectedCredentialId })
          : await cancelQuickTradeOrder({ trade_id: trade.id })
        const succeeded = this.isStockMarket
          ? !!(res && (res.success || (res.data && res.data.success)))
          : !!(res && res.code === 1)
        if (succeeded) {
          this.$message.success(this.$t('brokerAccounts.cancelRequested'))
          this.refreshAfterTrade()
        } else {
          const hint = res && res.error_hint && this.$te(res.error_hint) ? this.$t(res.error_hint) : ''
          this.$notification.error({
            message: this.$t('brokerAccounts.cancelFailed'),
            description: hint
          })
        }
      } catch (e) {
        const rd = (e && e.response && e.response.data) || {}
        const hint = rd.error_hint && this.$te(rd.error_hint) ? this.$t(rd.error_hint) : ''
        this.$notification.error({
          message: this.$t('brokerAccounts.cancelFailed'),
          description: hint
        })
      } finally {
        this.cancellingTradeId = null
      }
    },
    async refreshDockData () {
      if (this.dockRefreshing) return
      this.dockRefreshing = true
      try {
        await Promise.all([
          this.loadPrice(),
          this.loadBalance(),
          this.loadPosition(),
          this.loadHistory(),
          this.$refs.positionActivity ? this.$refs.positionActivity.load() : Promise.resolve()
        ])
      } finally {
        this.dockRefreshing = false
      }
    },
    setQuickAmountByPercent (percent, side = 'buy') {
      const ratio = Math.max(0, Math.min(100, Number(percent) || 0)) / 100
      const isSpotCashOrder = (this.isStockMarket || this.isCryptoMarket) && !this.isSwapMode
      if (isSpotCashOrder && side === 'sell') {
        if (this.spotSellInputMode === 'amount') {
          this.sellAmount = Math.floor(this.spotSellAvailableValue * ratio * 100) / 100
          return
        }
        this.sellQuantity = Math.floor(this.spotSellAvailable * ratio * 1e8) / 1e8
        return
      }
      if (isSpotCashOrder && this.spotBuyInputMode === 'quantity') {
        const referencePrice = Number(this.spotSellReferencePrice) || 0
        this.buyQuantity = referencePrice > 0
          ? Math.floor((this.activeBalanceAvailable * ratio / referencePrice) * 1e8) / 1e8
          : null
        return
      }
      this.amount = Math.floor(this.activeBalanceAvailable * ratio * 100) / 100
    },
    async handleSubmit (side = 'buy') {
      this.tradeFeedback = null
      const canSubmitSide = side === 'sell' ? this.canSubmitSell : this.canSubmitBuy
      if (!canSubmitSide) {
        if (side === 'buy' && this.buyFundsInsufficient) {
          this.tradeFeedback = { type: 'warning', text: this.buyFundsWarning }
          return
        }
        const exceedsSpotBalance = this.spotSellInputMode === 'amount'
          ? Number(this.sellAmount) > this.spotSellAvailableValue
          : Number(this.sellQuantity) > this.spotSellAvailable
        if (side === 'sell' && (this.isStockMarket || this.isCryptoMarket) && !this.isSwapMode && exceedsSpotBalance) {
          this.tradeFeedback = { type: 'error', text: this.$t('quickTrade.insufficientSpotQuantity') }
        }
        return
      }
      this.side = side
      this.submitting = true
      this.submittingSide = side
      try {
        if (this.isStockMarket) {
          await this.submitStockOrder(side)
          return
        }
        const useProtectionPrices = this.floatingConsole ? this.supportsNativeProtection : (!this.embeddedDock || this.dockTpslEnabled)
        const useTp = useProtectionPrices && (!this.floatingConsole || this.consoleTpEnabled)
        const useSl = useProtectionPrices && (!this.floatingConsole || this.consoleSlEnabled)
        const isSpotOrder = this.isCryptoMarket && !this.isSwapMode
        const isSpotBuy = isSpotOrder && side === 'buy'
        const isSpotSell = isSpotOrder && side === 'sell'
        const buyByQuantity = isSpotBuy && this.spotBuyInputMode === 'quantity'
        const sellByQuantity = isSpotSell && this.spotSellInputMode === 'quantity'
        const payload = {
          credential_id: this.selectedCredentialId,
          symbol: this.currentSymbol,
          side,
          order_type: this.orderType,
          amount: isSpotSell
            ? (sellByQuantity ? 0 : Number(this.sellAmount))
            : (buyByQuantity ? 0 : Number(this.amount)),
          price: this.orderType === 'limit' ? this.limitPrice : 0,
          reference_price: this.orderType === 'market' ? Number(this.currentPrice || 0) : 0,
          reference_price_at_ms: this.orderType === 'market' ? Number(this.currentPriceUpdatedAt || 0) : 0,
          leverage: this.isSwapMode ? this.leverage : 1,
          market_type: this.effectiveMarketType,
          margin_mode: this.isSwapMode ? this.marginMode : undefined,
          tp_price: useTp ? (this.tpPrice || 0) : 0,
          sl_price: useSl ? (this.slPrice || 0) : 0,
          source: this.source
        }
        appendStrictProductIdentity(payload, this)
        if (this.isCryptoMarket) payload.resolve_product = true
        if (buyByQuantity) payload.quantity = Number(this.buyQuantity)
        if (sellByQuantity) payload.quantity = Number(this.sellQuantity)
        const res = await placeQuickOrder(payload)
        if (res.code === 1) {
          // Emit event for parent component (parent will show success message)
          this.$emit('order-success', res.data)

          if (this.orderType === 'market' && res.data && res.data.trade_id) {
            const positionSide = side === 'buy' ? 'long' : 'short'
            this.rememberMarketOrderConfirmation(
              res.data.trade_id,
              positionSide,
              this.positionSizeForSide(positionSide),
              'increase'
            )
          }

          if (this.selectedCredentialId === payload.credential_id && this.currentSymbol === payload.symbol && this.effectiveMarketType === payload.market_type) {
            this.refreshAfterTrade()
          }
        } else {
          const hint = translateApiMessage(this, res.error_hint)
          const responseMessage = translateApiMessage(this, res.msg)
          const agreementError = typeof this.binanceTradFiAgreementError === 'function'
            ? this.binanceTradFiAgreementError(res, responseMessage || '')
            : ''
          this.tradeFeedback = { type: 'error', text: agreementError || hint || responseMessage || this.$t('quickTrade.orderFailed') }
        }
      } catch (e) {
        const rd = (e && e.response && e.response.data) || {}
        const hint = translateApiMessage(this, rd.error_hint)
        const agreementError = typeof this.binanceTradFiAgreementError === 'function'
          ? this.binanceTradFiAgreementError(rd, e.message || '')
          : ''
        const description = typeof this.friendlyOrderErrorMessage === 'function'
          ? this.friendlyOrderErrorMessage(rd, e.message || '')
          : (rd.msg || e.message || '')
        this.tradeFeedback = { type: 'error', text: agreementError || hint || description || this.$t('quickTrade.orderFailed') }
      } finally {
        this.submitting = false
        this.submittingSide = ''
      }
    },
    async submitStockOrder (side) {
      const price = this.orderType === 'limit' ? parseFloat(this.limitPrice || 0) : parseFloat(this.currentPrice || 0)
      if (!(price > 0)) {
        this.tradeFeedback = { type: 'error', text: this.$t('quickTrade.enterPrice') }
        return
      }
      const inputMode = side === 'buy' ? this.spotBuyInputMode : this.spotSellInputMode
      const quantity = inputMode === 'quantity'
        ? Number(side === 'buy' ? this.buyQuantity : this.sellQuantity)
        : 0
      const notional = inputMode === 'amount'
        ? Number(side === 'buy' ? this.amount : this.sellAmount)
        : 0
      if (!(quantity > 0) && !(notional > 0)) {
        this.tradeFeedback = { type: 'error', text: this.$t('quickTrade.errorHints.invalidSize') }
        return
      }
      const useProtectionPrices = this.floatingConsole ? this.supportsNativeProtection : (!this.embeddedDock || this.dockTpslEnabled)
      const useTp = useProtectionPrices && (!this.floatingConsole || this.consoleTpEnabled)
      const useSl = useProtectionPrices && (!this.floatingConsole || this.consoleSlEnabled)
      const supportsNotional = this.selectedStockBrokerId === 'alpaca'
      const brokerQuantity = quantity > 0
        ? quantity
        : (!supportsNotional && notional > 0 ? Number((notional / price).toFixed(6)) : 0)
      const payload = {
        credential_id: this.selectedCredentialId,
        symbol: this.normalizeBrokerSymbol(this.currentSymbol),
        side,
        quantity: brokerQuantity > 0 ? brokerQuantity : undefined,
        notional: supportsNotional && notional > 0 ? notional : undefined,
        marketType: this.priceMarketParam,
        orderType: this.orderType,
        price: this.orderType === 'limit' ? price : undefined,
        reference_price: price,
        take_profit_price: useTp ? Number(this.tpPrice || 0) : 0,
        stop_loss_price: useSl ? Number(this.slPrice || 0) : 0,
        source: this.source
      }
      const res = await (this.selectedStockBrokerClient || broker.alpaca).placeOrder(payload)
      if (this.apiSuccess(res)) {
        this.$emit('order-success', this.apiPayload(res))
        await this.loadBalance()
        await this.loadHistory()
        await this.loadPositionWithRetry()
      } else {
        const data = this.apiPayload(res)
        this.tradeFeedback = { type: 'error', text: this.friendlyOrderErrorMessage(data, data.msg || data.message || '') }
      }
    },
    friendlyOrderErrorMessage (payload, fallback = '') {
      for (const value of [payload && payload.error_hint, fallback, payload && payload.msg, payload && payload.message, payload && payload.detail]) {
        const localized = translateApiMessage(this, value)
        if (localized && localized !== String(value || '').trim()) return localized
      }
      const raw = [fallback, payload && payload.msg, payload && payload.message, payload && payload.detail, JSON.stringify(payload || {})].filter(Boolean).join(' ')
      if (/quickTrade\.alpacaFractionalNotSupported|not fractionable/i.test(raw)) return this.$t('quickTrade.alpacaFractionalNotSupported')
      if (/quickTrade\.alpacaAssetNotTradable|asset.+not tradable/i.test(raw)) return this.$t('quickTrade.alpacaAssetNotTradable')
      if (this.isStockMarket && /40310000|insufficient buying power/i.test(raw)) {
        const readValue = key => {
          const match = raw.match(new RegExp(`["']?${key}["']?\\s*[:=]\\s*["']?([0-9.]+)`, 'i'))
          return match ? Number(match[1]) : null
        }
        const required = readValue('cost_basis') ?? readValue('required')
        const available = readValue('non_marginable_buying_power') ?? readValue('daytrading_buying_power') ?? readValue('regt_buying_power') ?? readValue('buying_power')
        if (required !== null && available !== null && required > available) {
          return this.$t('quickTrade.insufficientBuyingPower', {
            required: this.formatPrice(required),
            available: this.formatPrice(available),
            currency: this.orderCurrency
          })
        }
        return this.$t('quickTrade.alpacaBuyingPowerRejected')
      }
      return fallback || (payload && (payload.msg || payload.message || payload.detail)) || this.$t('quickTrade.orderFailed')
    },
    binanceTradFiAgreementError (payload, fallback = '') {
      const raw = [fallback, payload && payload.msg, payload && payload.message, payload && payload.detail, JSON.stringify(payload || {})].filter(Boolean).join(' ')
      return /(?:^|\D)-4411(?:\D|$)|Please\s+sign\s+TradFi[- ]Perps?\s+agreement/i.test(raw)
        ? this.$t('quickTrade.errorHints.binanceTradFiAgreement')
        : ''
    },
    openPositionEditor (pos, mode) {
      this.positionEditor = { side: pos.side, mode, price: mode === 'limit' ? Number(this.currentPrice.toFixed(this.pricePrecision)) : null, kind: 'tp' }
    },
    async submitPositionEditor () {
      const editor = this.positionEditor
      if (!editor || this.savingProtection || this.closingPositionSide) return
      const pos = this.currentPositions.find(p => p.side === editor.side)
      if (!pos) { this.$message.warning(this.$t('quickTrade.workflow.positionChanged')); return }
      if (editor.mode === 'limit') return this.handleClosePosition(pos, 'limit', Number(editor.price))
      this.savingProtection = true
      try {
        const res = await updateQuickPositionProtection({ credential_id: this.selectedCredentialId, symbol: this.currentSymbol, position_side: editor.side, kind: editor.kind, price: Number(editor.price) })
        if (res.code !== 1) throw new Error(res.msg)
        this.$message.success(this.$t('quickTrade.workflow.protectionAccepted'))
        this.positionEditor = null
        this.activeDockTab = 'openOrders'
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.msg) || e.message
        this.$message.error(this.$te(msg) ? this.$t(msg) : this.$t('quickTrade.workflow.protectionFailed'))
      } finally { this.savingProtection = false }
    },
    async handleClosePosition (pos, exitType = 'market', exitPrice = 0) {
      if (!pos || !this.selectedCredentialId || !this.currentSymbol || this.closingPositionSide) return
      this.tradeFeedback = null
      if (!this.isSwapMode && pos.is_locked) {
        this.tradeFeedback = { type: 'warning', text: this.$t('quickTrade.lockedBalanceHint') }
        return
      }
      if (!this.isSwapMode && pos.is_dust) {
        this.tradeFeedback = { type: 'warning', text: this.$t('quickTrade.dustBalanceHint') }
        return
      }
      const leg = (pos.side || '').toLowerCase()
      this.closingPositionSide = leg || null
      this.positionRequestId = (this.positionRequestId || 0) + 1
      try {
        if (this.isStockMarket) {
          const qty = parseFloat(pos.size || pos.qty || 0) || 0
          if (!(qty > 0)) return
          const res = await (this.selectedStockBrokerClient || broker.alpaca).placeOrder({
            credential_id: this.selectedCredentialId,
            symbol: this.normalizeBrokerSymbol(this.currentSymbol),
            side: 'sell',
            quantity: Number(qty.toFixed(6)),
            marketType: this.priceMarketParam,
            orderType: 'market',
            source: 'manual'
          })
          if (this.apiSuccess(res)) {
            this.$message.success(this.$t('quickTrade.positionClosed'))
            await this.loadBalance()
            await this.loadHistory()
            await this.loadPositionWithRetry()
          } else {
            const data = this.apiPayload(res)
            this.tradeFeedback = { type: 'error', text: this.friendlyOrderErrorMessage(data, data.msg || data.message || '') }
          }
          return
        }
        const payload = {
          credential_id: this.selectedCredentialId,
          symbol: this.currentSymbol,
          market_type: this.effectiveMarketType,
          size: this.isSwapMode ? Math.max(0, Number(pos.size || pos.qty || 0)) : 0,
          close_scope: this.floatingConsole ? 'full' : (this.isSwapMode ? this.closeScope : 'full'),
          order_type: exitType,
          price: exitPrice,
          position_side: leg,
          source: 'manual'
        }
        appendStrictProductIdentity(payload, this)
        if (this.isCryptoMarket) payload.resolve_product = true
        const res = await closeQuickTradePosition(payload)
        if (res.code === 1) {
          let closeData = res.data || {}
          let totalFilled = Math.max(0, Number(closeData.filled) || 0)
          let retrySize = Math.max(0, Number(closeData.retry_close_size) || 0)
          if (exitType === 'market' && payload.close_scope === 'full') {
            for (let attempt = 0; attempt < 2 && closeData.close_complete === false && retrySize > 0; attempt += 1) {
              try {
                const retryResponse = await closeQuickTradePosition({ ...payload, size: retrySize })
                if (retryResponse.code === 1) {
                  const retryData = retryResponse.data || {}
                  totalFilled += Math.max(0, Number(retryData.filled) || 0)
                  closeData = { ...retryData, filled: totalFilled }
                  retrySize = Math.max(0, Number(closeData.retry_close_size) || 0)
                } else {
                  break
                }
              } catch (_) {
                closeData = { ...closeData, remaining_size: closeData.remaining_size || retrySize }
                break
              }
            }
          }
          const verifiedIncomplete = closeData.close_complete === false
          if (verifiedIncomplete) {
            this.tradeFeedback = { type: 'warning', text: this.$t('quickTrade.workflow.exitIncomplete', { size: Number(closeData.remaining_size || retrySize).toFixed(8).replace(/\.?0+$/, '') }) }
          } else {
            this.$message.success(this.$t(closeData.status === 'filled' ? 'quickTrade.workflow.exitFilled' : 'quickTrade.workflow.orderAccepted'))
          }
          if (this.selectedCredentialId === payload.credential_id && this.currentSymbol === payload.symbol && this.effectiveMarketType === payload.market_type) {
            if (exitType === 'market' && closeData.trade_id) {
              this.rememberMarketOrderConfirmation(
                closeData.trade_id,
                leg,
                Number(pos.size || pos.qty || 0),
                'decrease'
              )
            }
            this.applyConfirmedClose(closeData, leg)
            this.positionEditor = null
            if (exitType === 'limit') this.activeDockTab = 'openOrders'
            this.refreshAfterTrade()
          }
        } else {
          const hint = translateApiMessage(this, res.error_hint)
          this.tradeFeedback = { type: 'error', text: hint || translateApiMessage(this, res.msg) || this.$t('quickTrade.orderFailed') }
        }
      } catch (e) {
        const rd = (e && e.response && e.response.data) || {}
        const hint = translateApiMessage(this, rd.error_hint)
        this.tradeFeedback = { type: 'error', text: hint || translateApiMessage(this, rd.msg) || translateApiMessage(this, e.message) || this.$t('quickTrade.orderFailed') }
      } finally {
        this.closingPositionSide = null
      }
    },
    applyConfirmedClose (data, side) {
      if (!data || data.status !== 'filled' || !(Number(data.filled) > 0)) return
      this.positionRequestId = (this.positionRequestId || 0) + 1
      this.currentPositions = this.currentPositions.map(pos => pos.side === side
        ? { ...pos, size: Math.max(0, Number(pos.size) - Number(data.filled)) }
        : pos).filter(pos => pos.size > 1e-12)
    },
    refreshAfterTrade () {
      const generation = (this.postTradeRefreshGeneration || 0) + 1
      this.postTradeRefreshGeneration = generation
      const refreshContext = `${this.selectedCredentialId || ''}|${this.currentSymbol || ''}|${this.effectiveMarketType || ''}`
      this.accountRefreshUntil = Date.now() + 4000
      if (this.postTradeRefreshTimer) {
        clearTimeout(this.postTradeRefreshTimer)
        this.postTradeRefreshTimer = null
      }
      this.positionRequestId = (this.positionRequestId || 0) + 1
      this.balanceRequestId = (this.balanceRequestId || 0) + 1
      const refresh = Promise.allSettled([this.loadPosition(true), this.loadBalance(true), this.loadHistory()])
      this.postTradeRefresh = refresh
      refresh.finally(() => {
        if (this.postTradeRefreshGeneration !== generation || this.postTradeRefresh !== refresh) return
        this.postTradeRefresh = null
        this.postTradeRefreshTimer = setTimeout(() => {
          this.postTradeRefreshTimer = null
          const currentContext = `${this.selectedCredentialId || ''}|${this.currentSymbol || ''}|${this.effectiveMarketType || ''}`
          if (this.postTradeRefreshGeneration !== generation || currentContext !== refreshContext) {
            this.accountRefreshUntil = 0
            return
          }
          this.positionRequestId = (this.positionRequestId || 0) + 1
          this.balanceRequestId = (this.balanceRequestId || 0) + 1
          const confirmation = Promise.allSettled([this.loadPosition(true), this.loadBalance(true), this.loadHistory()])
          this.postTradeRefresh = confirmation
          confirmation.finally(() => {
            if (this.postTradeRefreshGeneration === generation && this.postTradeRefresh === confirmation) this.postTradeRefresh = null
            this.accountRefreshUntil = 0
          })
        }, 1200)
      })
      return refresh
    },
    startPolling () {
      this.stopPolling()
      this.pricePoller = createVisibilityPolling(() => {
        if (this.currentSymbol) {
          this.loadPrice()
        }
      }, 10000, { immediate: false })
      this.accountPoller = createVisibilityPolling(async () => {
        if (!this.selectedCredentialId || !this.currentSymbol || this.submitting || this.closingPositionSide) return
        if (this.postTradeRefresh) return this.postTradeRefresh
        if (Date.now() < (this.accountRefreshUntil || 0)) return
        await Promise.allSettled([this.loadPosition(false), this.loadHistory()])
        if (Date.now() - (this.lastBalancePoll || 0) > 8000) {
          this.lastBalancePoll = Date.now()
          await this.loadBalance(false)
        }
      }, this.floatingConsole ? 2000 : 15000, { immediate: false })
      this.pricePoller.start()
      this.accountPoller.start()
    },
    stopPolling () {
      if (this.pricePoller) {
        this.pricePoller.stop()
        this.pricePoller = null
      }
      if (this.accountPoller) {
        this.accountPoller.stop()
        this.accountPoller = null
      }
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
      if (this.postTradeRefreshTimer) {
        clearTimeout(this.postTradeRefreshTimer)
        this.postTradeRefreshTimer = null
      }
      this.postTradeRefreshGeneration = (this.postTradeRefreshGeneration || 0) + 1
      this.postTradeRefresh = null
      this.accountRefreshUntil = 0
    },
    handleClose () {
      this.$emit('close')
      this.$emit('update:visible', false)
    },
    handleHistoryCollapse (activeKeys) {
      this.historyCollapsed = !activeKeys.includes('history')
    },
    toggleTradeDetails (tradeId) {
      const key = String(tradeId)
      const expanded = !this.expandedTradeIds[key]
      if (this.floatingConsole) this.expandedTradeIds = {}
      this.$set(this.expandedTradeIds, key, expanded)
    },
    isTradeDetailsExpanded (tradeId) {
      return Boolean(this.expandedTradeIds[String(tradeId)])
    },
    tradeFillPrice (trade) {
      return parseFloat((trade && (trade.avg_fill_price || trade.filled_avg_price)) || 0) || 0
    },
    requestedOrderPriceLabel (trade) {
      if (String((trade && trade.order_type) || '').toLowerCase() !== 'limit') return this.$t('quickTrade.market')
      const price = parseFloat((trade && trade.price) || 0) || 0
      return price > 0 ? this.formatPrice(price) : '—'
    },
    formatRequestedOrderSize (trade) {
      const quantity = parseFloat((trade && trade.requested_base_qty) || 0) || 0
      if (quantity > 0) return this.formatQuantity(quantity)
      const notional = parseFloat((trade && trade.requested_notional) || 0) || 0
      if (notional > 0) return `${this.formatPrice(notional)} ${this.orderCurrency}`
      return '—'
    },
    tradeActionLabel (trade) {
      const isBuy = String((trade && trade.side) || '').toLowerCase() === 'buy'
      const isSpot = String((trade && trade.market_type) || '').toLowerCase() === 'spot'
      if (isSpot) return this.$t(isBuy ? 'quickTrade.buySpot' : 'quickTrade.sellSpot')
      if (trade && trade.is_close) {
        const closeSide = String(trade.close_side || (isBuy ? 'short' : 'long')).toLowerCase()
        return this.$t(closeSide === 'short' ? 'quickTrade.action.closeShort' : 'quickTrade.action.closeLong')
      }
      return this.$t(isBuy ? 'quickTrade.action.openLong' : 'quickTrade.action.openShort')
    },
    tradeActionColor (trade) {
      if (trade && trade.is_close && String(trade.market_type || '').toLowerCase() !== 'spot') return '#1677ff'
      return String((trade && trade.side) || '').toLowerCase() === 'buy' ? '#52c41a' : '#f5222d'
    },
    tradeOrderTypeLabel (trade) {
      const orderType = String((trade && trade.order_type) || '').toLowerCase()
      if (orderType === 'fill') return this.$t('quickTrade.fillRecord')
      return this.$t(orderType === 'limit' ? 'quickTrade.limit' : 'quickTrade.market')
    },
    tradeMarketLabel (trade) {
      return this.$t(String((trade && trade.market_type) || '').toLowerCase() === 'spot' ? 'quickTrade.spot' : 'quickTrade.contractBadge')
    },
    tradeMarginModeLabel (mode) {
      return this.$t(String(mode || '').toLowerCase() === 'isolated' ? 'quickTrade.isolatedMargin' : 'quickTrade.crossMargin')
    },
    tradeSourceLabel (source) {
      const normalized = String(source || 'manual').toLowerCase()
      const supported = ['manual', 'indicator', 'ai_radar', 'ai_analysis', 'exchange']
      const key = `quickTrade.source.${supported.includes(normalized) ? normalized : 'manual'}`
      return this.$t(key)
    },
    tradeStatusLabel (status) {
      const normalized = String(status || 'submitted').toLowerCase().replace(/-/g, '_')
      const supported = ['filled', 'submitted', 'new', 'open', 'pending', 'accepted', 'partially_filled', 'cancel_pending', 'cancelled', 'failed', 'ai_rejected']
      if (!supported.includes(normalized)) return status || this.$t('quickTrade.status.submitted')
      return this.$t(`quickTrade.status.${normalized}`)
    },
    tradeStatusColor (status) {
      const normalized = String(status || '').toLowerCase().replace(/-/g, '_')
      if (normalized === 'filled') return '#52c41a'
      if (['failed', 'ai_rejected'].includes(normalized)) return '#f5222d'
      if (normalized === 'cancelled') return '#8c8c8c'
      return '#faad14'
    },
    formatQuantity (val) {
      const value = parseFloat(val || 0)
      if (!Number.isFinite(value)) return '--'
      return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })
    },
    formatTradeCommission (trade) {
      if (!trade) return '--'
      const quote = parseFloat(trade.commission_quote || 0) || 0
      if (quote > 0) return `${this.formatPrice(quote)} USDT`
      const commission = parseFloat(trade.commission || 0) || 0
      const currency = String(trade.commission_ccy || '').trim()
      if (commission > 0) return `${this.formatQuantity(commission)}${currency ? ` ${currency}` : ''}`
      if (String(trade.fee_status || '').toLowerCase() === 'actual_zero') {
        return currency ? `0.00 ${currency}` : '0.00'
      }
      return '--'
    },
    tradeEntryPrice (trade) {
      return parseFloat((trade && trade.entry_price) || 0) || 0
    },
    tradeRealizedPnl (trade) {
      if (!trade || trade.realized_pnl === null || trade.realized_pnl === undefined || trade.realized_pnl === '') return null
      const value = Number(trade.realized_pnl)
      return Number.isFinite(value) ? value : null
    },
    tradePnlTone (trade) {
      const pnl = this.tradeRealizedPnl(trade)
      if (pnl === null || pnl === 0) return ''
      return pnl > 0 ? 'is-profit' : 'is-loss'
    },
    formatTradePnl (trade) {
      const pnl = this.tradeRealizedPnl(trade)
      if (pnl === null) return trade && trade.is_close ? this.$t('quickTrade.pnlPending') : '--'
      const sign = pnl > 0 ? '+' : ''
      return `${sign}${this.formatPrice(pnl)} USDT`
    },
    formatPrice (val) {
      const v = parseFloat(val || 0)
      if (Math.abs(v) >= 10000) return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      if (Math.abs(v) >= 100) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      if (Math.abs(v) >= 1) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
      return v.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
    },
    formatTime (ts) {
      if (!ts) return ''
      const d = parseUtcAwareInstant(ts)
      if (!d) return ''
      const pad = n => String(n).padStart(2, '0')
      return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    formatFullTime (ts) {
      const d = parseUtcAwareInstant(ts)
      if (!d) return ''
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    }
  },
  beforeDestroy () {
    if (this.quickTradeWarmupTimer) clearTimeout(this.quickTradeWarmupTimer)
    this.stopPolling()
    this.$emit('position-overlay-change', { symbol: this.currentSymbol, marketType: this.effectiveMarketType, positions: [] })
  }
}
</script>

<style lang="less" scoped>
.quick-trade-drawer {
  ::v-deep .ant-drawer-body {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
  }
}

/* Drawer / default: wrapper is transparent; columns flatten into normal flow */
.qt-embedded-split:not(.qt-embedded-split--cols) {
  display: contents;
}
.qt-embedded-split:not(.qt-embedded-split--cols) .qt-embedded-col-left,
.qt-embedded-split:not(.qt-embedded-split--cols) .qt-embedded-col-right {
  display: contents;
}
/* IDE tab: left / right columns */
.qt-embedded-split--cols {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  padding: 2px 0 6px;
}
.qt-embedded-split--cols .qt-embedded-col-left,
.qt-embedded-split--cols .qt-embedded-col-right {
  flex: 1;
  min-width: 0;
}
.qt-embedded-split--cols .qt-embedded-col-right {
  border-left: 1px solid #f0f0f0;
  padding-left: 14px;
  padding-right: 4px;
  margin-left: 2px;
}
.qt-embedded-split--cols .qt-section {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.quick-trade-embedded {
  display: flex;
  flex-direction: column;
  border: none;
  border-radius: 0;
  overflow: visible;
  background: transparent;
  .qt-embedded-split--cols {
    padding: 8px 18px 12px;
  }
  .qt-symbol-bar {
    padding: 8px 18px;
    background: transparent;
    flex-direction: row;
    align-items: center;
    .qt-symbol-selector { flex: 1; }
    .qt-price-display { margin-left: 12px; }
  }
  .qt-section { padding: 6px 0; }
  .qt-card { margin-left: 0; margin-right: 0; padding: 10px 12px; border-radius: 8px; }
  .qt-mode-card,
  .qt-tpsl-card {
    margin-left: 0;
    margin-right: 0;
  }
  .qt-mode-card { margin-top: 8px; }
  .qt-tpsl-card { margin-top: 8px; }

  .qt-mode-card .qt-section-title-row {
    margin-bottom: 14px;
  }
  .qt-mode-card .qt-leverage-row {
    margin-top: 8px;
    margin-bottom: 8px;
  }
  .qt-mode-card .qt-label-spaced {
    margin-top: 18px;
    margin-bottom: 10px;
  }
  .qt-mode-card .qt-margin-radio {
    margin-top: 6px;
  }
  .qt-mode-card .qt-hint-text {
    margin-top: 14px;
  }

  .qt-tpsl-card .qt-section-title-row {
    margin-bottom: 14px;
  }
  .qt-tpsl-card .qt-tpsl-row {
    gap: 16px;
  }
  .qt-tpsl-card .qt-tpsl-item .qt-label {
    display: block;
    margin-bottom: 10px;
  }
  .qt-tpsl-card .qt-tpsl-record-hint {
    margin-top: 16px;
  }

  .qt-submit-section--embedded-left {
    padding: 12px 0 4px;
    .qt-submit-btn { height: 40px; font-size: 14px; border-radius: 8px; }
  }

  .qt-position-section { padding: 0 0 10px; }
  .qt-history-section { padding: 0 0 10px; }

  .qt-direction-toggle .qt-dir-btn { padding: 8px; font-size: 13px; border-radius: 6px; }
  .qt-quick-amounts { margin-top: 6px; margin-bottom: 2px; }
  .qt-amount-block { padding-bottom: 6px; }
  .qt-account-actions .qt-add-account-btn { height: 30px; }
}

.quick-trade-embedded.qt-embedded-ide {
  .qt-embedded-split--cols {
    // Child cards already use the same 14px outer margin as the symbol bar.
    // Extra horizontal padding here made every section below it 24px narrower.
    padding: 0 0 12px;
    gap: 14px;
  }
  .qt-embedded-split--cols .qt-embedded-col-left,
  .qt-embedded-split--cols .qt-embedded-col-right {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    padding-left: 0 !important;
    padding-right: 0 !important;
    margin-left: 0 !important;
  }
  .qt-embedded-split--cols .qt-section {
    padding-left: 14px !important;
    padding-right: 14px !important;
  }
  .qt-symbol-bar {
    margin: 0 14px 12px;
    padding: 12px 14px;
    border-radius: 12px;
    background: linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%);
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    ::v-deep .ant-select-selection {
      border-radius: 8px;
      border-color: #e2e8f0;
    }
    .qt-current-price {
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
  }
  .qt-section:not(.qt-card) {
    padding: 10px 14px;
    margin: 0 14px 8px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  }
  .qt-card {
    margin-left: 14px;
    margin-right: 14px;
    margin-bottom: 8px;
    padding: 12px 14px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }
  .qt-mode-card,
  .qt-tpsl-card {
    margin-left: 14px;
    margin-right: 14px;
  }
  .qt-submit-section--embedded-left {
    padding: 8px 14px 4px;
    margin: 0 14px;
  }
  .qt-position-section {
    margin: 0 14px;
    padding: 12px 14px 10px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-sizing: border-box;
  }
  .qt-history-section {
    margin: 0 14px 8px;
    padding: 8px 14px 12px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-sizing: border-box;
  }
  .qt-position-empty {
    border-radius: 10px;
  }
  .qt-position-card {
    border-radius: 10px;
  }
}

.qt-risk-action-stack {
  display: contents;
}

/* Indicator chart dock: keep the complete order path visible below the K-line. */
.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock {
  min-width: 0;

  .qt-embedded-split--cols {
    display: grid;
    grid-template-columns: minmax(260px, 0.9fr) minmax(300px, 1.05fr) minmax(340px, 1.25fr);
    align-items: stretch;
    gap: 10px;
    padding: 8px 12px 12px;
  }
  .qt-embedded-split--cols .qt-embedded-col-left,
  .qt-embedded-split--cols .qt-embedded-col-right {
    display: contents;
  }
  .qt-embedded-split--cols .qt-embedded-col-right {
    border: 0;
  }

  .qt-account-section,
  .qt-mode-card,
  .qt-risk-action-stack,
  .qt-position-section,
  .qt-history-section {
    width: auto;
    min-width: 0;
    height: 100%;
    margin: 0 !important;
    box-sizing: border-box;
  }

  .qt-account-section {
    grid-column-start: 1;
    grid-column-end: -1;
    display: grid;
    grid-template-columns: auto minmax(240px, 420px) auto minmax(260px, 1fr);
    align-items: center;
    gap: 10px;
    height: auto;
    padding: 8px 10px !important;
  }
  .qt-account-section > .qt-label {
    margin: 0;
    white-space: nowrap;
  }
  .qt-account-section .qt-account-actions {
    margin: 0;
  }
  .qt-account-section .qt-add-account-btn {
    width: auto;
    min-width: 104px;
    padding: 0 14px;
  }
  .qt-account-section .qt-balance {
    min-width: 0;
    margin: 0;
    padding: 5px 10px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
  }
  .qt-account-section .qt-balance-line {
    flex: 0 1 190px;
    min-width: 0;
  }
  .qt-account-section .qt-balance-error-hint {
    margin: 0;
  }

  .qt-order-entry-stack {
    min-width: 0;
    height: 100%;
    padding: 8px 10px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
    box-sizing: border-box;
  }
  .qt-order-entry-stack .qt-section:not(.qt-card) {
    margin: 0 !important;
    padding: 4px !important;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .qt-order-entry-stack .qt-order-type-section {
    padding-top: 0 !important;
  }
  .qt-order-entry-stack .qt-amount-block {
    padding-bottom: 0 !important;
  }

  .qt-mode-card {
    padding: 10px 12px;
  }
  .qt-mode-card .qt-section-title-row,
  .qt-tpsl-card .qt-section-title-row {
    margin-bottom: 8px;
  }
  .qt-mode-card .qt-label-spaced,
  .qt-mode-card .qt-hint-text,
  .qt-tpsl-card .qt-tpsl-record-hint {
    margin-top: 8px;
  }
  .qt-mode-card .qt-leverage-row {
    margin: 2px 0 4px;
  }
  .qt-tpsl-card .qt-tpsl-row {
    gap: 8px;
  }
  .qt-tpsl-card .qt-tpsl-item .qt-label {
    margin-bottom: 4px;
  }

  .qt-risk-action-stack {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  }
  .qt-risk-action-stack .qt-tpsl-card {
    width: 100%;
    height: auto;
    margin: 0 !important;
    padding: 0 !important;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .qt-risk-action-stack .qt-submit-section--embedded-left {
    width: 100%;
    min-height: 0;
    margin: auto 0 0 !important;
    padding: 10px 0 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .qt-risk-action-stack .qt-submit-btn {
    min-width: 0;
    height: 42px;
    padding: 0 8px;
    font-size: 13px;
  }

  .qt-position-section,
  .qt-history-section {
    grid-column-start: 1;
    grid-column-end: -1;
  }
  .qt-position-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 8px;
    height: auto;
    padding: 10px 12px;
  }
  .qt-position-section .qt-section-header,
  .qt-position-section .qt-close-scope,
  .qt-position-section .qt-position-empty {
    grid-column-start: 1;
    grid-column-end: -1;
  }
  .qt-position-section .qt-section-header {
    margin-bottom: 0;
  }
  .qt-position-section .qt-position-empty {
    min-height: 50px;
    flex-direction: row;
    gap: 10px;
  }
  .qt-position-section .qt-position-empty .qt-empty-icon {
    margin: 0;
    font-size: 22px;
  }
  .qt-position-card + .qt-position-card {
    margin-top: 0;
  }
  .qt-position-card {
    grid-column-start: 1;
    grid-column-end: -1;
    display: grid;
    grid-template-columns: repeat(8, minmax(96px, 1fr)) minmax(112px, auto);
    align-items: center;
    gap: 10px 18px;
    min-height: 64px;
    padding: 10px 12px;
  }
  .qt-position-card .qt-pos-row {
    min-width: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 3px;
  }
  .qt-position-card .qt-pos-row > span,
  .qt-position-card .qt-pos-row > .ant-tag {
    max-width: 100%;
  }
  .qt-position-card .qt-pos-row > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .qt-position-card .qt-position-close-btn {
    align-self: center;
    justify-self: center;
    width: 148px;
    max-width: 100%;
    min-width: 112px;
    margin: 0;
  }
}

@media (max-width: 1280px) {
  .quick-trade-embedded.qt-embedded-ide.qt-embedded-dock {
    .qt-embedded-split--cols {
      grid-template-columns: repeat(2, minmax(280px, 1fr));
    }
    .qt-account-section {
      grid-template-columns: auto minmax(220px, 1fr) auto;
    }
    .qt-account-section .qt-balance {
      grid-column-start: 1;
      grid-column-end: -1;
      justify-content: flex-start;
    }
    .qt-risk-action-stack {
      grid-column-start: 1;
      grid-column-end: -1;
    }
    .qt-position-card {
      grid-template-columns: repeat(4, minmax(100px, 1fr));
    }
    .qt-position-card .qt-position-close-btn {
      min-height: 34px;
    }
  }
}

@media (max-width: 760px) {
  .quick-trade-embedded.qt-embedded-ide.qt-embedded-dock {
    .qt-embedded-split--cols,
    .qt-account-section {
      grid-template-columns: 1fr;
    }
    .qt-account-section > .qt-label,
    .qt-account-section .qt-account-actions,
    .qt-account-section .qt-balance {
      grid-column: 1;
    }
    .qt-account-section .qt-add-account-btn {
      width: 100%;
    }
    .qt-account-section .qt-balance {
      flex-wrap: wrap;
    }
  }
}

.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock {
  height: 100%;
  overflow: hidden;

  .qt-dock-header {
    flex: 0 0 auto;
  }
  .qt-embedded-split--cols {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(340px, 32%) minmax(0, 1fr);
    gap: 10px;
    padding: 10px 12px 12px;
    overflow: hidden;
  }
  .qt-embedded-split--cols .qt-embedded-col-left,
  .qt-embedded-split--cols .qt-embedded-col-right {
    display: flex;
    min-width: 0;
    min-height: 0;
    width: auto;
    max-width: none;
    margin: 0 !important;
    box-sizing: border-box;
  }
  .qt-embedded-split--cols .qt-embedded-col-left {
    flex-direction: column;
    gap: 0;
    overflow-y: auto;
    padding: 6px 8px !important;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 10px;
    background: #fff;
  }
  .qt-embedded-split--cols .qt-embedded-col-right {
    flex-direction: column;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 10px;
    overflow: hidden;
    background: #fff;
    padding: 0 !important;
  }
  .qt-order-entry-stack,
  .qt-mode-card {
    width: 100%;
    height: auto;
    flex: 0 0 auto;
    margin: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }
  .qt-risk-action-stack {
    width: 100%;
    height: auto;
    flex: 0 0 auto;
    border-right: 0 !important;
    border-bottom: 0 !important;
    border-left: 0 !important;
    border-radius: 0 !important;
    background: #fff !important;
    box-shadow: none !important;
  }
  .qt-mode-card {
    padding: 4px 8px !important;
    border-top: 1px solid rgba(15, 23, 42, 0.08) !important;
  }
  .qt-order-entry-stack {
    padding: 6px 8px;
  }
  .qt-order-entry-stack .qt-section:not(.qt-card) {
    padding: 2px !important;
  }
  .qt-order-entry-stack .qt-quick-amounts {
    gap: 5px;
    margin: 5px 0 2px;
  }
  .qt-order-entry-stack .qt-quick-amounts button {
    height: 24px;
    padding: 0 4px;
    font-size: 10px;
  }
  .qt-order-entry-stack .qt-notional-summary {
    margin-top: 5px;
    padding: 4px 7px;
    font-size: 10px;
    line-height: 1.3;
  }
  .qt-amount-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .qt-inline-notional {
    color: #16a34a;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }
  .qt-risk-action-stack {
    position: sticky;
    bottom: 0;
    z-index: 2;
    margin-top: 0 !important;
    padding: 4px 8px 6px;
    border-top: 1px solid rgba(15, 23, 42, 0.08) !important;
  }
  .qt-risk-action-stack.is-tpsl-open {
    position: relative;
    bottom: auto;
    z-index: 1;
  }
  .qt-risk-action-stack .qt-submit-section--embedded-left {
    margin-top: 0 !important;
    padding-top: 4px;
  }
  .qt-risk-action-stack .qt-submit-btn {
    height: 36px;
  }
  .qt-risk-action-stack .qt-tpsl-record-hint {
    display: none;
  }
  .qt-risk-action-stack .qt-tpsl-card {
    margin-top: 4px !important;
    padding: 4px !important;
  }
  .qt-risk-action-stack.is-tpsl-open .qt-tpsl-card {
    margin: 4px 0 2px !important;
    padding: 8px !important;
    border: 1px solid rgba(15, 23, 42, 0.08) !important;
    border-radius: 8px !important;
    background: #f8fafc !important;
  }
  .qt-risk-action-stack .qt-tpsl-row {
    gap: 6px;
  }
  .qt-risk-action-stack .qt-tpsl-item .qt-label {
    margin-bottom: 2px;
    font-size: 9px;
  }
  .qt-position-section,
  .qt-history-section {
    display: block;
    width: auto;
    height: auto;
    flex: 1;
    min-height: 0;
    margin: 0 !important;
    padding: 10px 12px !important;
    border: 0;
    border-radius: 0;
    overflow: auto;
    background: transparent;
  }
  .qt-position-card {
    grid-column: auto;
    grid-template-columns: repeat(4, minmax(92px, 1fr));
    gap: 10px 18px;
    margin-top: 8px;
  }
  .qt-position-card .qt-position-close-btn {
    width: 100%;
  }
}

.qt-dock-trade-settings {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.qt-dock-segmented {
  height: 32px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  button {
    min-width: 46px;
    flex: 1;
    height: 24px;
    padding: 0 9px;
    color: #64748b;
    font-size: 11px;
    font-weight: 600;
    line-height: 24px;
    white-space: nowrap;
    border: 0;
    border-radius: 5px;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.16s ease, color 0.16s ease;
  }
  button:hover { color: #334155; }
  button.active {
    color: #fff;
    background: var(--primary-color, #52c41a);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
  }
}
.qt-dock-margin-segmented button { min-width: 54px; }
.qt-dock-leverage-trigger {
  height: 32px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  color: #64748b;
  font-size: 11px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  white-space: nowrap;
  cursor: pointer;
  strong { color: #0f172a; font-size: 12px; }
  .anticon { color: #94a3b8; font-size: 9px; }
  &:hover { border-color: var(--primary-color, #52c41a); }
}
.qt-dock-tpsl-toggle {
  height: 28px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
  color: #64748b;
  font-size: 11px;
  > span {
    color: #94a3b8;
    font-size: 9px;
  }
}

.qt-dock-header {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
}
.qt-dock-title-block {
  min-width: 146px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.qt-dock-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
  .anticon { color: #faad14; }
}
.qt-dock-symbol {
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
}
.qt-dock-account {
  width: clamp(220px, 24vw, 360px);
  min-width: 220px;
  max-width: 360px;
  flex: 0 1 360px;
  display: flex;
  gap: 6px;
  ::v-deep .ant-select { flex: 1; min-width: 0; }
}
.qt-dock-icon-btn {
  flex: 0 0 auto;
  padding: 0 9px;
  border-radius: 7px;
}
.qt-dock-balance {
  min-width: 106px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.25;
  span { color: #94a3b8; font-size: 10px; }
  strong { color: #16a34a; font-size: 13px; }
}
.qt-dock-balance--secondary strong { color: #334155; }
.qt-dock-trade-settings + .qt-dock-balance,
.qt-dock-segmented + .qt-dock-balance {
  margin-left: auto;
}
.qt-dock-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 120px;
  color: #94a3b8;
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  i {
    width: 7px;
    height: 7px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: #cbd5e1;
  }
  &.is-connected { color: #16a34a; }
  &.is-connected i { background: #22c55e; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12); }
}
.qt-dock-tabs {
  flex: 0 0 46px;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 0 10px 3px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: thin;
  scrollbar-color: var(--qd-scrollbar-thumb, rgba(15, 23, 42, 0.22)) transparent;
  overscroll-behavior-x: contain;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    min-width: 34px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: var(--qd-scrollbar-thumb, rgba(15, 23, 42, 0.22));
    background-clip: padding-box;
  }
  button {
    position: relative;
    height: 38px;
    padding: 0 12px;
    color: #64748b;
    font-size: 12px;
    font-weight: 600;
    border: 0;
    background: transparent;
    cursor: pointer;
  }
  button::after {
    position: absolute;
    right: 10px;
    bottom: -1px;
    left: 10px;
    height: 2px;
    content: '';
    background: transparent;
  }
  button.active { color: var(--primary-color, #52c41a); }
  button.active::after { background: var(--primary-color, #52c41a); }
  button span {
    min-width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 5px;
    padding: 0 4px;
    border-radius: 999px;
    color: #64748b;
    font-size: 10px;
    background: #e2e8f0;
  }
}
.qt-trade-item--dock {
  margin: 0;
  padding: 8px 4px !important;
  border: 0 !important;
  border-bottom: 1px solid #e2e8f0 !important;
  border-radius: 0;
  background: transparent;
  &:last-child { border-bottom: 0 !important; }
  .qt-trade-symbol { color: #0f172a; font-size: 13px; font-weight: 700; }
  .qt-trade-time { color: #94a3b8; font-size: 10px; white-space: nowrap; }
  .qt-cancel-order-btn {
    height: 24px;
    padding: 0 4px;
    color: #f5222d;
    font-size: 11px;
  }
}
.qt-trade-card-head,
.qt-trade-card-identity,
.qt-trade-card-state,
.qt-trade-card-footer,
.qt-trade-context,
.qt-trade-actions {
  display: flex;
  align-items: center;
}
.qt-trade-card-head,
.qt-trade-card-footer {
  justify-content: space-between;
  gap: 8px;
}
.qt-trade-card-identity,
.qt-trade-card-state,
.qt-trade-context,
.qt-trade-actions { gap: 6px; }
.qt-trade-card-identity { min-width: 0; }
.qt-trade-card-state { flex: 0 0 auto; }
.qt-trade-order-type {
  padding-left: 6px;
  color: #64748b;
  font-size: 10px;
  border-left: 1px solid #e2e8f0;
}
.qt-trade-inline-meta {
  color: #94a3b8;
  font-size: 9px;
  white-space: nowrap;
}
.qt-trade-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(80px, 1fr));
  gap: 0;
  margin-top: 6px;
  border-top: 1px solid #f1f5f9;
}
.qt-trade-metric,
.qt-trade-details > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.qt-trade-metric {
  min-height: 38px;
  padding: 5px 7px;
  border-left: 1px solid #f1f5f9;
  border-radius: 0;
  background: transparent;
  &:first-child { border-left: 0; }
  span { color: #94a3b8; font-size: 9px; }
  strong {
    overflow: hidden;
    color: #334155;
    font-size: 11px;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &--pnl.is-profit strong { color: #52c41a; }
  &--pnl.is-loss strong { color: #f5222d; }
}
.qt-trade-price-flow { font-size: 10px !important; }
.qt-trade-card-footer {
  margin-top: 8px;
}
.qt-trade-context {
  min-width: 0;
  flex-wrap: wrap;
  span {
    padding: 2px 5px;
    color: #64748b;
    font-size: 9px;
    border-radius: 4px;
    background: #f1f5f9;
  }
}
.qt-trade-detail-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  color: #64748b;
  font-size: 10px;
  border: 0;
  background: transparent;
  cursor: pointer;
  &:hover { color: var(--primary-color, #52c41a); }
}
.qt-trade-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  margin-top: 9px;
  padding-top: 9px;
  border-top: 1px dashed #e2e8f0;
  span { color: #94a3b8; font-size: 9px; }
  strong {
    overflow: hidden;
    color: #475569;
    font-size: 10px;
    font-weight: 600;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .qt-trade-detail-wide { grid-column: 1 / -1; }
  .qt-trade-detail-error strong {
    color: #f5222d;
    white-space: normal;
  }
}

.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock.qt-embedded-side-dock {
  .qt-dock-header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 9px 10px;
    overflow: visible;
  }
  .qt-side-account-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .qt-side-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #64748b;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.2;
  }
  .qt-side-section-heading .qt-dock-status {
    flex: 0 1 auto;
    justify-content: flex-end;
  }
  .qt-side-account-control {
    width: 100%;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 32px;
    align-items: center;
    gap: 6px;
  }
  .qt-dock-account-select {
    width: 100%;
    min-width: 0;
  }
  .qt-side-account-control > .qt-dock-icon-btn {
    width: 32px;
    height: 32px;
    padding: 0;
  }
  .qt-side-account-control ::v-deep .ant-select,
  .qt-side-account-control ::v-deep .ant-select-selection,
  .qt-side-account-control ::v-deep .ant-select-selection--single {
    width: 100%;
    height: 32px;
  }
  .qt-side-account-control ::v-deep .ant-select-selection__rendered {
    min-width: 0;
    margin-right: 30px;
    line-height: 30px;
  }
  .qt-side-account-control ::v-deep .ant-select-selection-selected-value,
  .qt-side-account-control ::v-deep .ant-select-selection__placeholder {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .qt-side-trade-controls {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .qt-side-trade-controls .qt-dock-segmented {
    width: 100%;
  }
  .qt-side-trade-controls .qt-dock-segmented button {
    flex: 1 1 0;
  }
  .qt-dock-trade-settings {
    width: 100%;
  }
  .qt-dock-trade-settings .qt-dock-margin-segmented { flex: 1; }
  .qt-side-balance-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 32px;
    align-items: stretch;
    gap: 6px;
    padding-top: 7px;
    border-top: 1px solid #e2e8f0;
  }
  .qt-dock-balance {
    min-width: 0;
    align-items: flex-start;
    justify-content: center;
    padding: 2px;
    border: 0;
    border-radius: 0;
    background: transparent;
    margin-left: 0 !important;
  }
  .qt-dock-balance--secondary { align-items: flex-start; }
  .qt-dock-status {
    max-width: none;
    min-width: 0;
  }
  .qt-side-balance-row > .qt-dock-icon-btn {
    width: 32px;
    height: 32px;
    min-height: 32px;
    align-self: center;
    padding: 0;
  }
  .qt-embedded-split--cols {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
    overflow-x: hidden;
    overflow-y: hidden;
  }
  .qt-embedded-split--cols .qt-embedded-col-left,
  .qt-embedded-split--cols .qt-embedded-col-right {
    width: 100%;
    min-height: auto;
    flex: 0 0 auto;
    overflow: visible;
  }
  .qt-embedded-split--cols .qt-embedded-col-left {
    padding: 6px 10px !important;
    border: 0 !important;
    border-radius: 0;
    background: transparent;
  }
  .qt-embedded-split--cols .qt-embedded-col-right {
    min-height: 0;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 0 !important;
    border-top: 1px solid #e2e8f0 !important;
    border-radius: 0;
    background: transparent;
  }
  .qt-risk-action-stack {
    position: static;
  }
  .qt-dock-tabs {
    overflow-x: auto;
    overflow-y: hidden;
    align-items: flex-end;
    button {
      flex: 0 0 auto;
      padding: 0 9px;
    }
  }
  .qt-position-section,
  .qt-history-section {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
  }
  .qt-position-section {
    display: flex;
    flex-direction: column;
  }
  .qt-position-empty {
    flex: 1 1 auto;
    min-height: 180px;
    justify-content: center;
    border: 0;
    background: transparent;
  }
  .qt-position-card {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 14px;
  }
  .qt-position-card .qt-position-close-btn {
    grid-column: 1 / -1;
    width: 100%;
  }
  .qt-trade-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .qt-trade-item--dock {
    margin: 0;
    padding: 10px 2px !important;
    border: 0 !important;
    border-bottom: 1px solid #e2e8f0 !important;
    border-radius: 0;
    background: transparent;
  }
}

@media (max-width: 1180px) {
  .qt-dock-balance--secondary,
  .qt-dock-status { display: none; }
  .quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-embedded-split--cols {
    grid-template-columns: minmax(320px, 36%) minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .qt-dock-header { flex-wrap: wrap; }
  .qt-dock-title-block { min-width: 120px; }
  .qt-dock-account { min-width: 180px; }
  .quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-embedded-split--cols {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
}

.qt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
  .qt-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    .qt-icon {
      font-size: 20px;
      color: #595959;
    }
    .qt-header-title {
      font-size: 16px;
      font-weight: 600;
    }
  }
  .qt-close {
    font-size: 16px;
    cursor: pointer;
    color: #999;
    &:hover { color: #333; }
  }
}

.qt-symbol-bar {
  padding: 12px 20px;
  background: linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  .qt-symbol-selector {
    width: 100%;
    ::v-deep .ant-select {
      width: 100%;
    }
    ::v-deep .ant-select-selection {
      border-radius: 6px;
      border: 1px solid #d9d9d9;
    }
  }
  .qt-symbol-summary {
    width: 100%;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(15, 23, 42, 0.08);
  }
  .qt-symbol-summary-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .qt-symbol-label {
    font-size: 10px;
    color: #8c8c8c;
  }
  .qt-symbol-name {
    color: #262626;
    font-size: 14px;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .qt-market-tag {
    flex-shrink: 0;
    margin-right: 0;
    border-radius: 999px;
    font-size: 11px;
  }
  .qt-price-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: flex-end;
    gap: 2px;
    white-space: nowrap;
    .qt-price-label {
      font-size: 10px;
      color: #8c8c8c;
    }
    .qt-current-price {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
  }
}

.qt-symbol-option {
  display: flex;
  align-items: center;
  gap: 8px;
  .qt-symbol-option-name {
    font-weight: 600;
    font-size: 14px;
  }
  .qt-symbol-option-desc {
    color: #999;
    font-size: 12px;
  }
}

.qt-section {
  padding: 8px 20px;
  .qt-label {
    font-size: 12px;
    color: #999;
    margin-bottom: 4px;
    font-weight: 500;
  }
  .qt-crypto-hint {
    font-size: 10px;
    color: #faad14;
    background: rgba(250, 173, 20, 0.1);
    padding: 1px 6px;
    border-radius: 4px;
    margin-left: 4px;
  }
}

.qt-balance {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  font-size: 12px;

  .qt-balance-label {
    color: #8c8c8c;
    flex-shrink: 0;
  }
  .qt-balance-loading-text { margin-left: 4px; }
  .qt-balance-value {
    color: #52c41a;
    font-weight: 600;
    margin-left: auto;
  }
  .qt-balance-error { color: #faad14; cursor: help; }
}

.qt-balance-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 0;
  opacity: 0.72;

  &--active {
    opacity: 1;
    .qt-balance-label {
      color: #595959;
      font-weight: 600;
    }
    .qt-balance-value {
      color: #389e0d;
    }
  }
}

.qt-balance-error-hint {
  font-size: 11px;
  line-height: 1.45;
  color: #cf1322;
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(255, 77, 79, 0.08);
  border: 1px solid rgba(255, 77, 79, 0.25);
}

.qt-account-actions {
  margin-top: 8px;
}

.qt-add-account-btn {
  height: 32px;
  border-radius: 6px;
  font-weight: 600;
}

.qt-direction-toggle {
  display: flex;
  gap: 8px;
  .qt-dir-btn {
    flex: 1;
    padding: 10px;
    text-align: center;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    user-select: none;
  }
  .qt-dir-long {
    color: #52c41a;
    background: rgba(82, 196, 26, 0.06);
    border-color: rgba(82, 196, 26, 0.2);
    &.active {
      background: #52c41a;
      color: #fff;
      border-color: #52c41a;
      box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
    }
    &:hover:not(.active) {
      border-color: #52c41a;
    }
  }
  .qt-dir-short {
    color: #f5222d;
    background: rgba(245, 34, 45, 0.06);
    border-color: rgba(245, 34, 45, 0.2);
    &.active {
      background: #f5222d;
      color: #fff;
      border-color: #f5222d;
      box-shadow: 0 4px 12px rgba(245, 34, 45, 0.3);
    }
    &:hover:not(.active) {
      border-color: #f5222d;
    }
  }
}

.qt-amount-block {
  padding-bottom: 14px;
}

.qt-spot-order-inputs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: 10px;
}

.qt-side-amount {
  min-width: 0;
  min-height: 142px;
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.qt-side-amount--buy {
  border-color: rgba(82, 196, 26, 0.28);
  background: linear-gradient(180deg, rgba(82, 196, 26, 0.07), rgba(82, 196, 26, 0.015) 52%, #fff);
  box-shadow: inset 0 2px 0 #52c41a, 0 1px 2px rgba(15, 23, 42, 0.04);
}

.qt-side-amount--sell {
  border-color: rgba(245, 34, 45, 0.26);
  background: linear-gradient(180deg, rgba(245, 34, 45, 0.065), rgba(245, 34, 45, 0.012) 52%, #fff);
  box-shadow: inset 0 2px 0 #f5222d, 0 1px 2px rgba(15, 23, 42, 0.04);
}

.qt-side-heading {
  min-height: 54px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 6px;
  margin-bottom: 8px;
}

.qt-side-title {
  min-width: 0;
  height: 20px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.qt-side-title--buy { color: #389e0d; }
.qt-side-title--sell { color: #cf1322; }

.qt-side-mode-label {
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0 8px;
  box-sizing: border-box;
  color: #389e0d;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid rgba(82, 196, 26, 0.22);
  border-radius: 6px;
  background: rgba(82, 196, 26, 0.08);
}

.qt-buy-unit-toggle,
.qt-sell-unit-toggle {
  width: 100%;
  display: flex;
  min-width: 0;
  margin: 0;

  ::v-deep .ant-radio-button-wrapper {
    flex: 1;
    height: 24px;
    padding: 0 7px;
    font-size: 10px;
    text-align: center;
    line-height: 22px;
    white-space: nowrap;
  }

}

.qt-buy-unit-toggle ::v-deep .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
  color: #fff;
  border-color: #52c41a;
  background: #52c41a;
  box-shadow: -1px 0 0 0 #52c41a;
}

.qt-sell-unit-toggle {
  ::v-deep .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
    color: #fff;
    border-color: #f5222d;
    background: #f5222d;
    box-shadow: -1px 0 0 0 #f5222d;
  }
}

.qt-side-available {
  display: block;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  color: #8c8c8c;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qt-side-amount .qt-amount-label-row {
  min-height: 34px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 2px;
  margin-bottom: 5px;
}

.qt-side-amount .qt-quick-amounts {
  margin: auto 0 0;
  padding-top: 8px;
}

.qt-side-amount .qt-quick-amounts button {
  min-width: 0;
  height: 24px;
  padding: 0 3px;
  font-size: 10px;
  border-radius: 5px;
}

.qt-quick-amounts {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  margin-bottom: 4px;
  button { flex: 1; font-size: 12px; }
}

.qt-notional-summary {
  margin-top: 8px;
  padding: 7px 9px;
  border-radius: 6px;
  color: #389e0d;
  background: rgba(82, 196, 26, 0.08);
  font-size: 12px;
  line-height: 1.45;
}

.qt-leverage-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.qt-leverage-slider-wrap {
  flex: 1;
  min-width: 0;
  padding: 4px 6px 26px;

  ::v-deep .ant-slider {
    margin: 8px 6px 0;
  }

  ::v-deep .ant-slider-rail,
  ::v-deep .ant-slider-track,
  ::v-deep .ant-slider-step {
    height: 4px;
  }

  ::v-deep .ant-slider-handle {
    width: 14px;
    height: 14px;
    margin-top: -5px;
  }

  ::v-deep .ant-slider-mark {
    top: 14px;
  }

  ::v-deep .ant-slider-mark-text {
    font-size: 11px;
    color: #8c8c8c;
    white-space: nowrap;
    transform: translateX(-50%);
  }

  ::v-deep .ant-slider-mark-text-active {
    color: var(--primary-color, #1890ff);
    font-weight: 600;
  }

  ::v-deep .ant-slider-mark:first-child .ant-slider-mark-text {
    transform: translateX(0);
  }

  ::v-deep .ant-slider-mark:last-child .ant-slider-mark-text {
    transform: translateX(-100%);
  }
}

.qt-leverage-input {
  width: 72px;
  flex-shrink: 0;
  margin-top: 2px;
}

.qt-card {
  margin-left: 16px;
  margin-right: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
}

.qt-mode-card {
  margin-top: 16px;
}

.qt-tpsl-card {
  margin-top: 16px;
}

.qt-section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.qt-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.qt-badge-contract {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #ebebeb;
  color: #595959;
  border: 1px solid #d9d9d9;
}

.qt-optional-tag {
  font-size: 10px;
  color: #8c8c8c;
  background: #f0f0f0;
  padding: 1px 8px;
  border-radius: 4px;
}

.qt-label-spaced {
  margin-top: 10px;
}

.qt-margin-radio {
  width: 100%;
  display: flex;
  ::v-deep .ant-radio-button-wrapper {
    flex: 1;
    text-align: center;
    padding: 0 4px;
  }
}

.qt-hint-text {
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.45;
  margin-top: 8px;
}

.qt-hint-inline {
  margin-top: 6px;
}

.qt-mode-toggle {
  display: flex;
  background: #f0f0f0;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}
.qt-mode-toggle-item {
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 500;
  color: #8c8c8c;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;
  &:hover { color: #595959; }
  &.active {
    background: #fff;
    color: var(--primary-color, #1890ff);
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
}
.qt-spot-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0 2px;
}
.qt-spot-info-icon {
  font-size: 18px;
  color: #52c41a;
  flex-shrink: 0;
}
.qt-spot-info .qt-hint-text {
  margin-top: 0;
}

.qt-tpsl-row {
  display: flex;
  gap: 12px;
  .qt-tpsl-item { flex: 1; }
}

.qt-tpsl-record-hint {
  margin-top: 10px;
  margin-bottom: 0;
}

.qt-close-scope {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #e8e8e8;
}

.qt-close-scope-toolbar {
  display: flex;
  align-items: center;
  gap: 7px;
}

.qt-close-scope-toolbar .qt-close-scope-radio {
  flex: 1 1 auto;
  min-width: 0;
}

.qt-close-scope-help {
  flex: 0 0 auto;
  color: #8c8c8c;
  font-size: 14px;
  cursor: help;
}

.qt-label-close-scope {
  margin-bottom: 6px;
}

.qt-close-scope-radio {
  width: 100%;
  display: flex;
  ::v-deep .ant-radio-button-wrapper {
    flex: 1;
    text-align: center;
    padding: 0 4px;
    font-size: 12px;
  }
}

.qt-tp-label {
  color: #389e0d !important;
}

.qt-sl-label {
  color: #cf1322 !important;
}

.qt-input-full {
  width: 100%;
}

.qt-dir-btn.qt-dir-disabled {
  opacity: 0.42;
  cursor: not-allowed;
  pointer-events: none;
}

.qt-direction-toggle--spot .qt-dir-btn--solo {
  flex: 1 1 100%;
  max-width: 100%;
}

.qt-empty-icon {
  font-size: 28px;
  color: #d9d9d9;
  margin-bottom: 8px;
}

.qt-empty-desc {
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.5;
}

.qt-submit-section {
  padding: 12px 20px;
  display: flex;
  gap: 10px;
  .qt-submit-btn {
    flex: 1;
    height: 48px;
    font-size: 16px;
    font-weight: 700;
    border-radius: 8px;
    letter-spacing: 0.5px;
  }
  .qt-btn-long {
    background: #52c41a !important;
    border-color: #52c41a !important;
    &:hover { background: #73d13d !important; }
    &:active { background: #389e0d !important; }
  }
  .qt-btn-short {
    background: #f5222d !important;
    border-color: #f5222d !important;
    &:hover { background: #ff4d4f !important; }
    &:active { background: #cf1322 !important; }
  }
}

.qt-trade-feedback {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 8px 12px 0;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
  &--error { color: #cf1322; }
  &--warning { color: #d46b08; }
  &--embedded { margin: 4px 14px 0; }
  .anticon { margin-top: 3px; flex: 0 0 auto; }
}

.qt-ai-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 20px;
  padding: 10px 12px;
  border: 1px solid rgba(24, 144, 255, .22);
  border-radius: 8px;
  background: rgba(24, 144, 255, .06);
  transition: border-color .18s ease, background .18s ease, box-shadow .18s ease;
  &:hover,
  &:focus-within {
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 52%, transparent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #1890ff) 10%, transparent);
  }
  strong, span { display: block; }
  strong { font-size: 13px; }
  span { margin-top: 2px; color: #8c8c8c; font-size: 11px; }
}

.qt-stock-mode-card {
  border-color: rgba(45, 140, 255, 0.18);
  background: linear-gradient(135deg, rgba(45, 140, 255, 0.08), rgba(82, 196, 26, 0.06));
}

.qt-position-section {
  padding: 8px 20px 12px;
  .qt-section-header {
    font-size: 13px;
    font-weight: 600;
    color: #666;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .qt-position-count {
    font-size: 12px;
    color: #999;
    font-weight: 400;
  }
  .qt-close-scope-global {
    margin-bottom: 10px;
  }
}

.qt-history-section {
  padding: 8px 20px 12px;
  ::v-deep .ant-collapse {
    background: transparent;
    border: none;
  }
  ::v-deep .ant-collapse-item {
    border: none;
  }
  ::v-deep .ant-collapse-header {
    padding: 0 !important;
    cursor: pointer;
    &:hover {
      opacity: 0.8;
    }
  }
  ::v-deep .ant-collapse-content {
    border: none;
    background: transparent;
  }
  ::v-deep .ant-collapse-content-box {
    padding: 8px 0 0 0 !important;
  }
  .qt-section-header {
    font-size: 13px;
    font-weight: 600;
    color: #666;
    display: flex;
    align-items: center;
    gap: 6px;
    user-select: none;
  }
  .qt-history-count {
    font-size: 12px;
    color: #999;
    font-weight: 400;
  }
}

.qt-history-source-warning {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0 0 8px;
  padding: 7px 9px;
  border: 1px solid rgba(250, 173, 20, 0.32);
  border-radius: 6px;
  color: #ad6800;
  background: rgba(250, 173, 20, 0.08);
  font-size: 12px;
  line-height: 1.45;
}

.theme-dark .qt-history-source-warning {
  color: #d8a841;
  background: rgba(250, 173, 20, 0.09);
  border-color: rgba(250, 173, 20, 0.22);
}

.qt-position-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 10px 12px;
  border-left: 3px solid #d9d9d9;
  & + .qt-position-card {
    margin-top: 10px;
  }
  &.long { border-left-color: #52c41a; }
  &.short { border-left-color: #f5222d; }
  .qt-pos-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 2px 0;
    span:first-child { color: #999; }
  }
}

.qt-position-empty {
  background: #fafafa;
  border-radius: 8px;
  padding: 20px 12px;
  text-align: center;
  border: 1px dashed #d9d9d9;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qt-green { color: #52c41a !important; }
.qt-red   { color: #f5222d !important; }

.qt-trade-list {
  .qt-trade-item {
    padding: 6px 0;
    border-bottom: 1px solid #f5f5f5;
    &:last-child { border-bottom: none; }
    .qt-trade-main {
      display: flex;
      align-items: center;
      gap: 6px;
      .qt-trade-symbol { font-weight: 600; font-size: 13px; }
      .qt-trade-amount { margin-left: auto; font-size: 13px; }
    }
    .qt-trade-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2px;
      .qt-trade-time { font-size: 11px; color: #bbb; }
    }
  }
}

/* ======== Dark Theme ======== */
  .theme-dark {
  .qt-embedded-split--cols .qt-embedded-col-right {
    border-left-color: #303030;
  }
  &.quick-trade-embedded {
    background: transparent;
    border-color: transparent;
    .qt-symbol-bar {
      background: transparent;
    }
  }
  &.quick-trade-embedded.qt-embedded-ide {
    .qt-symbol-bar {
      background: linear-gradient(135deg, #262626 0%, #1c1c1c 100%);
      border-color: #363636;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      ::v-deep .ant-select-selection {
        border-color: #434343;
      }
    }
    .qt-section:not(.qt-card) {
      background: #1f1f1f;
      border-color: #363636;
      box-shadow: none;
    }
    .qt-card {
      background: #1f1f1f;
      border-color: #404040;
      box-shadow: none;
    }
    .qt-position-section,
    .qt-history-section {
      background: #1f1f1f;
      border-color: #363636;
    }
    &.qt-embedded-dock {
      .qt-order-entry-stack,
      .qt-risk-action-stack {
        background: #1f1f1f;
        border-color: #363636;
        box-shadow: none;
      }
      .qt-order-entry-stack .qt-section:not(.qt-card) {
        background: transparent;
        border-color: transparent;
      }
      .qt-risk-action-stack .qt-tpsl-card,
      .qt-risk-action-stack .qt-submit-section--embedded-left {
        background: transparent;
        border-color: transparent;
      }
    }
  }
  .qt-header {
    border-bottom-color: #303030;
    .qt-icon { color: #a3a3a3; }
    .qt-header-title { color: #e0e0e0; }
    .qt-close { color: #666; &:hover { color: #bbb; } }
  }
  .qt-symbol-bar {
    background: linear-gradient(180deg, #262626 0%, #1f1f1f 100%);
    .qt-symbol-summary {
      background: rgba(20, 20, 20, 0.64);
      border-color: #363636;
    }
    .qt-symbol-label,
    .qt-price-label {
      color: #8c8c8c;
    }
    .qt-symbol-name {
      color: #f0f0f0;
    }
    .qt-market-tag {
      background: #2a2a2a;
      color: #d9d9d9;
      border-color: #434343;
    }
    .qt-current-price { color: #e0e0e0; }
    ::v-deep .ant-select-selection {
      background: #262626;
      border-color: #303030;
      color: #e0e0e0;
    }
    ::v-deep .ant-select-selection__placeholder {
      color: #666;
    }
  }
  .qt-ai-filter-row {
    border-color: #29465d;
    background: #111820;
    strong { color: rgba(255, 255, 255, .88); }
    span { color: rgba(255, 255, 255, .56); }
    &:hover,
    &:focus-within {
      border-color: color-mix(in srgb, var(--primary-color, #52c41a) 48%, #29465d);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #52c41a) 12%, transparent);
    }
  }
  .qt-symbol-option {
    .qt-symbol-option-name { color: #e0e0e0; }
    .qt-symbol-option-desc { color: #999; }
  }
  .qt-section {
    .qt-label { color: #777; }
  }
  .qt-side-amount {
    border-color: #303030;
    background: #141414;
    box-shadow: none;
  }
  .qt-side-amount--buy {
    border-color: rgba(82, 196, 26, 0.28);
    background: linear-gradient(180deg, rgba(82, 196, 26, 0.09), rgba(20, 20, 20, 0.96) 48%);
    box-shadow: inset 0 2px 0 #52c41a;
  }
  .qt-side-amount--sell {
    border-color: rgba(245, 34, 45, 0.28);
    background: linear-gradient(180deg, rgba(245, 34, 45, 0.09), rgba(20, 20, 20, 0.96) 48%);
    box-shadow: inset 0 2px 0 #f5222d;
  }
  .qt-side-mode-label {
    color: #95de64;
    border-color: rgba(82, 196, 26, 0.26);
    background: rgba(82, 196, 26, 0.1);
  }
  .qt-side-amount .qt-quick-amounts .ant-btn {
    color: #bfbfbf;
    border-color: #3a3a3a;
    background: #242424;
    &:hover {
      color: #fff;
      border-color: #595959;
      background: #303030;
    }
  }
  .qt-side-available { color: #777; }
  .qt-position-section {
    .qt-section-header { color: #ccc; }
    .qt-position-count { color: #888; }
  }
  .qt-position-card {
    background: #262626;
    .qt-pos-row span:first-child { color: #777; }
    .qt-pos-row span:last-child { color: #ccc; }
  }
  .qt-history-section {
    .qt-section-header {
      color: #ccc;
    }
    .qt-history-count {
      color: #888;
    }
    ::v-deep .ant-collapse {
      background: transparent !important;
      color: #ccc;
      .ant-collapse-header {
        color: #ccc !important;
        &:hover {
          opacity: 0.8;
        }
      }
      .ant-collapse-content {
        background: transparent;
        color: #ccc;
      }
    }
  }
  .qt-trade-item {
    border-bottom-color: #2a2a2a !important;
    .qt-trade-symbol { color: #e0e0e0; }
    .qt-trade-amount { color: #ccc; }
  }
  ::v-deep .ant-collapse {
    background: transparent !important;
    color: #ccc;
    .ant-collapse-header { color: #ccc !important; }
    .ant-collapse-content { background: transparent; color: #ccc; }
  }
  ::v-deep .ant-drawer-content {
    background: #141414;
  }
  ::v-deep .ant-select-selection,
  ::v-deep .ant-input-number {
    background: #262626;
    border-color: #303030;
    color: #e0e0e0;
  }
  ::v-deep .ant-radio-group .ant-radio-button-wrapper {
    background: #262626;
    border-color: #303030;
    color: #ccc;
    &.ant-radio-button-wrapper-checked {
      background: #434343;
      border-color: #595959;
      color: #fff;
    }
  }
  ::v-deep .ant-slider-rail { background: #303030; }
  ::v-deep .ant-slider-track { background: #737373; }
  .qt-leverage-slider-wrap ::v-deep .ant-slider-mark-text {
    color: #8c8c8c;
  }
  .qt-leverage-slider-wrap ::v-deep .ant-slider-mark-text-active {
    color: #58a6ff;
  }
  .qt-balance {
    background: #262626;
    border-color: #363636;
    .qt-balance-label { color: #8c8c8c; }
    .qt-balance-line--active .qt-balance-label { color: #d9d9d9; }
    .qt-balance-value { color: #73d13d; }
    .qt-balance-line--active .qt-balance-value { color: #95de64; }
  }
  .qt-add-account-btn {
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.22);
  }
  .qt-card {
    background: #262626;
    border-color: #3a3a3a;
  }
  .qt-section-title {
    color: #e8e8e8;
  }
  .qt-badge-contract {
    background: #333;
    color: #bfbfbf;
    border-color: #434343;
  }
  .qt-optional-tag {
    background: #2a2a2a;
    color: #888;
  }
  .qt-hint-text {
    color: #777;
  }
  .qt-mode-toggle {
    background: #2a2a2a;
  }
  .qt-mode-toggle-item {
    color: #777;
    &:hover { color: #bbb; }
    &.active {
      background: #3a3a3a;
      color: #58a6ff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }
  }
  .qt-spot-info-icon {
    color: #73d13d;
  }
  .qt-tp-label {
    color: #95de64 !important;
  }
  .qt-sl-label {
    color: #ff7875 !important;
  }
  .qt-close-scope {
    border-top-color: #3a3a3a;
  }
  .qt-dock-header {
    background: #1a1a1a;
    border-bottom-color: #303030;
  }
  .qt-side-section-heading { color: rgba(255, 255, 255, 0.52); }
  &.qt-embedded-side-dock .qt-dock-balance {
    background: #202020;
    border-color: #343434;
  }
  .qt-dock-title { color: rgba(255, 255, 255, 0.92); }
  .qt-dock-symbol,
  .qt-dock-balance span,
  .qt-dock-leverage-trigger,
  .qt-dock-tpsl-toggle { color: rgba(255, 255, 255, 0.42); }
  .qt-dock-balance--secondary strong { color: rgba(255, 255, 255, 0.78); }
  .qt-dock-segmented { background: #222; border-color: #3a3a3a; }
  .qt-dock-segmented button { color: rgba(255, 255, 255, 0.56); }
  .qt-dock-segmented button:hover { color: rgba(255, 255, 255, 0.86); }
  .qt-dock-segmented button.active { color: #fff; background: var(--primary-color, #52c41a); }
  .qt-dock-leverage-trigger {
    color: rgba(255, 255, 255, 0.5);
    background: #242424;
    border-color: #3a3a3a;
    strong { color: rgba(255, 255, 255, 0.9); }
  }
  .qt-dock-icon-btn { background: #242424; border-color: #3a3a3a; color: #bfbfbf; }
  .qt-dock-tabs {
    background: #191919;
    border-bottom-color: #303030;
    scrollbar-color: var(--qd-scrollbar-thumb, rgba(255, 255, 255, 0.22)) transparent;
    button { color: rgba(255, 255, 255, 0.48); }
    button.active { color: var(--primary-color, #52c41a); }
    button.active::after { background: var(--primary-color, #52c41a); }
    button span { color: #bfbfbf; background: #333; }
  }
  &.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-embedded-split--cols .qt-embedded-col-right {
    background: #1f1f1f;
    border-color: #363636;
  }
  &.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-embedded-split--cols .qt-embedded-col-left {
    background: #1f1f1f;
    border-color: #363636;
  }
  &.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-mode-card,
  &.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-risk-action-stack {
    border-top-color: #363636 !important;
  }
  &.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-risk-action-stack {
    background: #1f1f1f !important;
  }
  &.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-risk-action-stack.is-tpsl-open .qt-tpsl-card {
    border-color: #3a3a3a !important;
    background: #242424 !important;
  }
  .qt-trade-item--dock {
    border-color: #363636 !important;
    background: transparent;
    .qt-trade-symbol { color: rgba(255, 255, 255, .9); }
    .qt-trade-time,
    .qt-trade-order-type { color: rgba(255, 255, 255, 0.42); }
    .qt-trade-order-type { border-left-color: #434343; }
  }
  .qt-trade-metric {
    border-left-color: #303030;
    background: transparent;
    span { color: rgba(255, 255, 255, .38); }
    strong { color: rgba(255, 255, 255, .78); }
  }
  .qt-trade-context span {
    color: rgba(255, 255, 255, .5);
    background: #303030;
  }
  .qt-trade-detail-toggle { color: rgba(255, 255, 255, .5); }
  .qt-trade-details {
    border-top-color: #3a3a3a;
    span { color: rgba(255, 255, 255, .38); }
    strong { color: rgba(255, 255, 255, .68); }
  }

  .qt-position-empty {
    background: #262626;
    border-color: #303030;
  }
  .qt-empty-icon {
    color: #434343;
  }
  .qt-empty-desc {
    color: #888;
  }
  .qt-floating-activity-toggle {
    color: rgba(255, 255, 255, .62);
    border-color: transparent;
    background: transparent;
    &.active {
      color: var(--primary-color, #ff5a1f);
      border-color: transparent;
      background: transparent;
    }
  }

}
@import "./floating-console.less";
</style>

<style lang="less" scoped>
/* Keep the embedded trading panel on the same type scale as the IDE. */
.quick-trade-panel-root,
.quick-trade-embedded,
.quick-trade-drawer {
  --qt-font-ui: "SF Pro Text", "Segoe UI Variable Text", Inter, "HarmonyOS Sans SC", MiSans, "PingFang SC", "Noto Sans SC", "Microsoft YaHei UI", sans-serif;
  --qt-type-title: 13px;
  --qt-type-body: 12px;
  --qt-type-caption: 11px;
  --qt-weight-regular: 400;
  --qt-weight-medium: 500;
  --qt-weight-semibold: 600;
  --qt-text-primary: #1f2937;
  --qt-text-secondary: #5f6b7a;
  --qt-text-muted: #8a94a3;
  font-family: var(--qt-font-ui);
  font-size: var(--qt-type-body);
  font-weight: var(--qt-weight-regular);
  letter-spacing: 0;
  -webkit-font-smoothing: antialiased;

  button,
  input,
  textarea,
  select {
    font-family: inherit;
    letter-spacing: 0;
  }

  .qt-dock-title,
  .qt-section-title,
  .qt-trade-symbol,
  .qt-position-symbol {
    color: var(--qt-text-primary);
    font-size: var(--qt-type-title);
    font-weight: var(--qt-weight-semibold);
    line-height: 1.35;
    letter-spacing: 0;
    text-transform: none;
  }

  .qt-side-section-heading,
  .qt-dock-symbol,
  .qt-dock-balance span,
  .qt-label,
  .qt-hint-text,
  .qt-trade-time,
  .qt-trade-order-type,
  .qt-trade-metric span,
  .qt-trade-details span,
  .qt-empty-desc {
    color: var(--qt-text-muted);
    font-size: var(--qt-type-caption);
    font-weight: var(--qt-weight-medium);
    line-height: 1.35;
    letter-spacing: 0;
    text-transform: none;
  }

  .qt-dock-segmented button,
  .qt-dock-leverage-trigger,
  .qt-dock-tabs button,
  .qt-submit-btn,
  .qt-position-close-btn,
  .qt-trade-detail-toggle {
    font-size: var(--qt-type-body);
    font-weight: var(--qt-weight-semibold);
    letter-spacing: 0;
    text-transform: none;
  }

  .qt-dock-balance strong,
  .qt-trade-metric strong,
  .qt-trade-details strong,
  .qt-pos-row > span:last-child {
    font-size: var(--qt-type-body);
    font-weight: var(--qt-weight-semibold);
    line-height: 1.35;
  }

  ::v-deep .ant-select-selection,
  ::v-deep .ant-select-selection-selected-value,
  ::v-deep .ant-select-selection__placeholder,
  ::v-deep .ant-input,
  ::v-deep .ant-input-number-input {
    font-family: var(--qt-font-ui);
    font-size: var(--qt-type-body);
    font-weight: var(--qt-weight-medium);
    letter-spacing: 0;
  }

  .qt-dust-label {
    display: inline-block;
    margin-left: 6px;
    color: #d48806;
    font-size: var(--qt-type-caption);
    font-weight: var(--qt-weight-semibold);
  }

  .qt-pos-row--dust > span:last-child {
    max-width: 70%;
    color: #d48806;
    font-size: var(--qt-type-caption);
    text-align: right;
  }
}

.quick-trade-panel-root .theme-dark,
.quick-trade-embedded.theme-dark,
.quick-trade-drawer.theme-dark {
  --qt-text-primary: rgba(255, 255, 255, 0.9);
  --qt-text-secondary: rgba(255, 255, 255, 0.66);
  --qt-text-muted: rgba(255, 255, 255, 0.48);

  .qt-dock-title,
  .qt-section-title,
  .qt-trade-symbol,
  .qt-position-symbol {
    color: var(--qt-text-primary);
  }

  .qt-side-section-heading,
  .qt-dock-symbol,
  .qt-dock-balance span,
  .qt-label,
  .qt-hint-text,
  .qt-trade-time,
  .qt-trade-order-type,
  .qt-trade-metric span,
  .qt-trade-details span,
  .qt-empty-desc {
    color: var(--qt-text-muted);
  }

  .qt-dock-segmented button:not(.active),
  .qt-dock-leverage-trigger,
  .qt-dock-tabs button:not(.active),
  ::v-deep .ant-select-selection-selected-value,
  ::v-deep .ant-input,
  ::v-deep .ant-input-number-input {
    color: var(--qt-text-secondary);
  }

  ::v-deep .ant-select-selection__placeholder {
    color: var(--qt-text-muted);
  }
}

.quick-trade-embedded.theme-dark.qt-embedded-ide.qt-embedded-dock.qt-embedded-side-dock {
  .qt-dock-balance {
    border-color: transparent;
    background: transparent;
  }

  .qt-side-balance-row,
  .qt-embedded-split--cols .qt-embedded-col-right {
    border-color: #303030 !important;
  }

  .qt-trade-item--dock {
    border-bottom-color: #303030 !important;
    background: transparent;
  }

  .qt-dock-balance strong {
    color: #73d13d;
  }

  .qt-dock-balance--secondary strong {
    color: rgba(255, 255, 255, 0.86);
  }
}

</style>

<style lang="less">
.qt-leverage-popover {
  .ant-popover-inner { border-radius: 10px; }
  .ant-popover-inner-content { width: 286px; padding: 14px 16px; }
  .qt-leverage-editor {
    .ant-slider { margin: 8px 6px 25px; }
    .ant-input-number { width: 100%; }
  }
  .qt-leverage-presets {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 10px;
    button {
      height: 26px;
      padding: 0;
      color: #64748b;
      font-size: 10px;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      background: #f8fafc;
      cursor: pointer;
    }
    button:hover,
    button.active {
      color: #fff;
      border-color: var(--primary-color, #52c41a);
      background: var(--primary-color, #52c41a);
    }
  }
}
body.dark .qt-leverage-popover,
body.realdark .qt-leverage-popover,
.realdark-theme .qt-leverage-popover,
.dark-theme .qt-leverage-popover {
  .ant-popover-inner {
    background: #1f1f1f;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }
  .ant-popover-arrow { border-top-color: #1f1f1f; border-left-color: #1f1f1f; }
  .ant-input-number {
    color: rgba(255, 255, 255, 0.88);
    background: #141414;
    border-color: #434343;
  }
  .ant-input-number-input { color: rgba(255, 255, 255, 0.88); }
  .ant-slider-mark-text { color: rgba(255, 255, 255, 0.45); }
  .qt-leverage-presets button {
    color: rgba(255, 255, 255, 0.62);
    border-color: #3a3a3a;
    background: #262626;
  }
  .qt-leverage-presets button:hover,
  .qt-leverage-presets button.active {
    color: #fff;
    border-color: var(--primary-color, #52c41a);
    background: var(--primary-color, #52c41a);
  }
}
</style>
