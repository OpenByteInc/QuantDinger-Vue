import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import marketCatalogMessages from '../../src/locales/market-catalog-overrides.js'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('desktop marketplace exposes queryable strategy compatibility filters', () => {
  const source = read('src/views/indicator-community/index.vue')
  for (const parameter of ['market', 'market_type', 'binding_mode', 'strategy_type', 'direction_mode', 'leverage']) {
    assert.match(source, new RegExp(`${parameter}:`))
  }
  assert.doesNotMatch(source, /filters\.timeframe/)
  assert.doesNotMatch(source, /marketplace-spotlight|market-section-heading/)
  assert.match(source, /activeStrategyFilterChips/)
})

test('marketplace defaults to the visual grid before the compact catalog option', () => {
  const marketplace = read('src/views/indicator-community/index.vue')
  const catalog = read('src/views/indicator-community/components/MarketCatalogList.vue')

  assert.match(marketplace, /marketViewMode: 'grid'/)
  assert.match(marketplace, /value="grid"[\s\S]*?value="compact"/)
  assert.match(marketplace, /<market-catalog-list/)
  assert.match(marketplace, /filters:\s*\{[\s\S]*?sortBy: 'recommended'/)
  assert.match(marketplace, /pageSize: 24/)
  assert.match(marketplace, /loadMoreMarketItems/)
  assert.match(marketplace, /community\.catalog\.newArrivals/)
  assert.match(catalog, /community\.annualReturn/)
  assert.match(catalog, /community\.maxDrawdown/)
  assert.match(catalog, /community\.sharpe/)
  assert.match(catalog, /community\.compositeScore/)
  assert.match(catalog, /formatScore\(item\.score\)/)
  assert.match(catalog, /isStrategy \? 'market-catalog--strategy'/)
  assert.doesNotMatch(catalog, /backtest/i)
})

test('compact catalog distributes space across identity and metric columns', () => {
  const catalog = read('src/views/indicator-community/components/MarketCatalogList.vue')
  const marketplace = read('src/views/indicator-community/index.vue')

  assert.match(catalog, /minmax\(300px, 4fr\)/)
  assert.match(catalog, /minmax\(120px, 1\.4fr\)/)
  assert.match(catalog, /minmax\(280px, 3\.8fr\)/)
  assert.match(catalog, /minmax\(110px, 1\.3fr\)/)
  assert.match(marketplace, /\.market-empty \{[\s\S]*?background: #fbfcfe;/)
  assert.match(marketplace, /border-color: #333;[\s\S]*?background: #191919;/)
})

test('strategy catalog metrics use semantic performance colors', () => {
  const catalog = read('src/views/indicator-community/components/MarketCatalogList.vue')

  assert.match(catalog, /metricTone\(item\.annual_return, 'return'\)/)
  assert.match(catalog, /catalog-number--negative[\s\S]*?formatDrawdown\(item\.max_drawdown\)/)
  assert.match(catalog, /metricTone\(item\.sharpe, 'sharpe'\)/)
  assert.match(catalog, /if \(numeric >= 1\) return 'catalog-number--positive'/)
  assert.match(catalog, /catalog-number--caution/)
})

test('catalog metric headers expose server-side ascending and descending sorting', () => {
  const marketplace = read('src/views/indicator-community/index.vue')
  const catalog = read('src/views/indicator-community/components/MarketCatalogList.vue')
  const route = read('../quantdinger_backend/backend_api_python/app/routes/community.py')
  const service = read('../quantdinger_backend/backend_api_python/app/services/community_service.py')

  for (const key of ['rating', 'views', 'installs', 'price', 'score', 'annual_return', 'max_drawdown', 'sharpe', 'users']) {
    assert.match(catalog, new RegExp(`sort-key="${key}"`))
  }
  assert.match(catalog, /catalog-sort__arrow--up/)
  assert.match(catalog, /catalog-sort__arrow--down/)
  assert.match(catalog, /this\.\$emit\('sort-change', \{ key, order \}\)/)
  assert.match(marketplace, /sort_order: this\.requestSortOrder/)
  assert.match(marketplace, /@sort-change="handleCatalogSortChange"/)
  assert.match(route, /sort_order = request\.args\.get\('sort_order'/)
  assert.match(service, /'annual_return': 'annual_return'/)
  assert.match(service, /'max_drawdown': 'max_drawdown'/)
  assert.match(service, /requested_direction = 'ASC'/)
})

test('desktop marketplace derives strategy markets from system market modules', () => {
  const source = read('src/views/indicator-community/index.vue')
  assert.match(source, /loadEnabledMarketOptions/)
  assert.match(source, /strategyMarketOptions/)
  assert.doesNotMatch(source, /strategyMarkets:\s*\[/)
})

test('marketplace typography keeps top-level tabs and controls on one scale', () => {
  const source = read('src/views/indicator-community/index.vue')
  assert.match(source, /--market-font-body: 14px;/)
  assert.match(source, /--market-font-control: 13px;/)
  assert.match(source, /\.admin-tabs[\s\S]*?\.ant-tabs-nav \.ant-tabs-tab \{[\s\S]*?font-size: var\(--market-font-body\);/)
  assert.match(source, /\.ant-tabs-nav \.ant-badge \{[\s\S]*?font: inherit;/)
})

test('marketplace search keeps the input and action border aligned', () => {
  const marketplace = read('src/views/indicator-community/index.vue')

  assert.match(marketplace, /\.market-search \{[\s\S]*?\.ant-input-group \{[\s\S]*?display: flex;[\s\S]*?overflow: hidden;/)
  assert.match(marketplace, /\.ant-input-affix-wrapper \.ant-input \{[\s\S]*?height: 32px;[\s\S]*?border-right: 0;/)
  assert.match(marketplace, /\.ant-input-search-button \{[\s\S]*?height: 32px;[\s\S]*?border-radius: 0 6px 6px 0;/)
})

test('indicator marketplace uses generated chart previews and removes decorative capability cards', () => {
  const card = read('src/views/indicator-community/components/IndicatorCard.vue')
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  const ide = read('src/views/indicator-ide/index.vue')
  const chart = read('src/views/indicator-analysis/components/KlineChart.vue')

  assert.match(card, /:src="previewImage"/)
  assert.doesNotMatch(card, /class="visual-summary"/)
  assert.match(detail, /class="detail-preview"/)
  assert.doesNotMatch(detail, /class="section indicator-profile-section"/)
  assert.match(chart, /const captureMarketPreview = async/)
  assert.match(chart, /querySelectorAll\('canvas'\)/)
  assert.match(chart, /const scale = Math\.max\(width \/ sourceWidth, availableHeight \/ sourceHeight\)/)
  assert.match(chart, /context\.rect\(0, headerHeight, width, availableHeight\)/)
  assert.match(ide, /const chart = this\.getChartRef\(\)/)
  assert.match(ide, /waitForRender: false/)
  assert.match(ide, /runtimeCheck: false/)
  assert.doesNotMatch(ide, /marketplacePreviewChart/)
  assert.match(ide, /url: '\/api\/indicator\/preview-image'/)
})

test('strategy marketplace stays compact and never renders indicator preview images', () => {
  const card = read('src/views/indicator-community/components/IndicatorCard.vue')
  const catalog = read('src/views/indicator-community/components/MarketCatalogList.vue')
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')

  assert.match(card, /v-if="!isStrategyAsset" class="card-cover"/)
  assert.match(catalog, /v-if="!isStrategy" class="catalog-thumb"/)
  assert.match(card, /v-if="isStrategyAsset" class="strategy-card-head"/)
  assert.doesNotMatch(detail, /<template v-if="isStrategyAsset">[\s\S]*?<img/)
  assert.match(detail, /'detail-header--strategy': isStrategyAsset/)
})

test('dark marketplace detail uses neutral comment and body colors', () => {
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  assert.match(detail, /\.qd-indicator-detail-modal-wrap--dark[\s\S]*?color: #e5e5e5;/)
  assert.match(detail, /\.detail-header\.detail-header--indicator,[\s\S]*?\.author-name \{[\s\S]*?color: rgba\(255, 255, 255, 0\.92\) !important;/)
  assert.match(detail, /&\.is-mine \{[\s\S]*?background: #202020 !important;/)
  assert.match(detail, /\.comment-content \{ color: #c7c7c7; \}/)
})

test('VIP-free marketplace assets expose the benefit next to their title', () => {
  const catalog = read('src/views/indicator-community/components/MarketCatalogList.vue')
  const card = read('src/views/indicator-community/components/IndicatorCard.vue')
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')

  assert.match(catalog, /catalog-item__title[\s\S]*?item\.vip_free[\s\S]*?catalog-vip-free/)
  assert.match(card, /strategy-card-title-copy[\s\S]*?indicator\.vip_free[\s\S]*?vip-free-tag/)
  assert.match(card, /indicator-card-title-row[\s\S]*?indicator\.vip_free[\s\S]*?vip-free-tag/)
  assert.match(detail, /indicator-name[\s\S]*?detail\.vip_free[\s\S]*?detail-vip-free-tag/)
  assert.doesNotMatch(detail, /class="price-info">[\s\S]{0,160}detail\.vip_free/)
})

test('dark indicator detail uses a coordinated compatibility divider', () => {
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  assert.match(detail, /qd-indicator-detail-modal-wrap--dark[\s\S]*?nth-child\(odd\):not\(:last-child\)[\s\S]*?border-right-color: #303030 !important;/)
})

test('strategy detail exposes backtest verification and purchase context', () => {
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  const service = read('../quantdinger_backend/backend_api_python/app/services/community_service.py')

  for (const field of ['backtestRange', 'tradeCount', 'lastVerified', 'dataSource', 'executionCosts', 'engineVersion']) {
    assert.match(detail, new RegExp(`community\\.${field}`))
  }
  assert.match(detail, /class="listing-assurance-grid"/)
  assert.match(service, /'verified_at'/)
  assert.match(service, /'data_source'/)
  assert.match(service, /'commission'/)
  assert.match(service, /'engine_version'/)
})

test('market discovery explains ranking and recovers cleanly from empty filters', () => {
  const market = read('src/views/indicator-community/index.vue')

  assert.match(market, /:title="option\.hint"/)
  assert.match(market, /activeMarketFilterCount/)
  assert.match(market, /community\.catalog\.emptyTitle/)
  assert.match(market, /community\.catalog\.clearFilters/)
  assert.match(market, /\.market-sort-select \{[\s\S]*?display: none;/)
})

test('light marketplace detail keeps indicator and strategy header copy readable', () => {
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  assert.match(detail, /&--indicator,\s*&--strategy \{[\s\S]*?\.indicator-name,\s*\.author-name \{\s*color: #1f1f1f;/)
  assert.match(detail, /\.indicator-stats ::v-deep \.ant-statistic \{[\s\S]*?\.ant-statistic-title \{\s*color: #8c8c8c;[\s\S]*?\.ant-statistic-content \{\s*color: #262626;/)
  assert.match(detail, /&--strategy \.header-info \.strategy-title-row \.strategy-api-badge \{[\s\S]*?color: #389e0d;/)
})

test('dark marketplace strategy accents follow the selected theme color', () => {
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  const card = read('src/views/indicator-community/components/IndicatorCard.vue')
  const comments = read('src/views/indicator-community/components/CommentList.vue')

  assert.match(detail, /\.parameter-count \{[\s\S]*?var\(--primary-color, #1890ff\)/)
  assert.match(detail, /\.contract-tags \.ant-tag \{[\s\S]*?rgba\(255, 255, 255, 0\.72\)/)
  assert.match(detail, /\.detail-container\.is-dark[\s\S]*?\.strategy-api-badge \{[\s\S]*?var\(--primary-color-hover, #69c0ff\)/)
  assert.match(card, /\.strategy-card-facts \{[\s\S]*?var\(--primary-color-hover, #69c0ff\)/)
  assert.match(comments, /class="my-comment-hint__icon"/)
  assert.doesNotMatch(comments, /two-tone-color="#52c41a"/)
})

test('strategy marketplace separates author metadata from performance metrics', () => {
  const card = read('src/views/indicator-community/components/IndicatorCard.vue')

  assert.match(card, /\.strategy-card-facts \{[\s\S]*?margin: 2px 0 12px;/)
  assert.doesNotMatch(card, /\.strategy-card-facts \{[^}]*border:/)
})

test('desktop strategy cards separate execution and confirmation cadence', () => {
  const card = read('src/views/indicator-community/components/IndicatorCard.vue')
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  for (const field of ['execution_mode', 'execution_frequency', 'confirmation_frequencies']) {
    assert.match(card + detail, new RegExp(field))
  }
  assert.match(card + detail, /marketplace_contract/)
})

test('desktop strategy cards omit the overfitting risk prompt', () => {
  const card = read('src/views/indicator-community/components/IndicatorCard.vue')
  assert.doesNotMatch(card, /overfit-risk-gauge|OverfitRiskGauge/)
})

test('marketplace labels payoff ratio separately from profit factor', () => {
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  const review = read('src/views/indicator-community/index.vue')

  for (const source of [detail, review]) {
    assert.match(source, /strategyCenter\.backtest\.payoffRatio/)
    assert.match(source, /profit_loss_ratio/)
    assert.match(source, /losing_trades/)
  }
  assert.doesNotMatch(detail, /formatNumber\(performance\.profit_factor/)
  assert.doesNotMatch(review, /formatReviewNumber\(reviewPerformance\.profit_factor/)
})

test('purchased marketplace strategies expose direct live and code workflows', () => {
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  const live = read('src/views/strategy-center/index.vue')
  const ide = read('src/views/strategy-ide/index.vue')

  assert.match(detail, /@click="deployPurchasedStrategy"/)
  assert.match(detail, /v-if="!codeHidden"[\s\S]*@click="viewPurchasedStrategyCode"/)
  assert.match(detail, /path: '\/strategy-center'[\s\S]*mode: 'create'[\s\S]*sourceId:/)
  assert.match(detail, /path: '\/strategy-ide'[\s\S]*sourceId:/)
  assert.doesNotMatch(detail, /compatibilityVisible|checkCompatibility|createAdaptedDraft/)
  assert.match(live, /'\$route\.fullPath'[\s\S]*openEditorFromRoute/)
  assert.match(live, /editorRouteSignature/)
  assert.match(ide, /'\$route\.query\.sourceId'[\s\S]*applyStrategyRouteSource/)
})

test('marketplace indicator use selects the purchased local copy even after cached navigation', () => {
  const detail = read('src/views/indicator-community/components/IndicatorDetail.vue')
  const ide = read('src/views/indicator-ide/index.vue')

  assert.match(detail, /detail\.local_copy_id[\s\S]*detail\.purchased_indicator_id[\s\S]*detail\.indicator_id/)
  assert.doesNotMatch(detail, /detail\.indicator_id \|\|\s*this\.detail\.id/)
  assert.match(ide, /activated \(\)[\s\S]*refreshIndicatorRouteSelection\(\)/)
  assert.match(ide, /refreshIndicatorRouteSelection \(\)[\s\S]*await this\.loadIndicators\(\)/)
  assert.match(ide, /this\.selectedIndicatorId = targetId[\s\S]*this\.chartVisibleIndicatorIds = \[targetId\][\s\S]*this\.onIndicatorChange\(targetId\)/)
})

test('strategy publishing guides users to a successful backtest with localized fallback handling', () => {
  const ide = read('src/views/strategy-ide/index.vue')
  const request = read('src/utils/request.js')
  const api = read('src/api/strategy.js')
  const english = read('src/locales/lang/en-US.js')
  const reviewedLocales = read('src/locales/reviewed-ui-overrides.js')

  assert.match(ide, /publishBacktestStatus !== 'passed'/)
  assert.match(ide, /goToBacktestFromPublish/)
  assert.match(ide, /isBacktestRequiredPublishResponse/)
  assert.match(ide, /publishBacktestRequiredHint/)
  assert.match(request, /normalizePublishBacktestRequiredError/)
  assert.match(request, /details\.requires_backtest/)
  assert.match(api, /script-sources\/publish-readiness/)
  assert.match(api, /params: \{ id: sourceId \}/)
  assert.match(english, /strategyIde\.publishGoBacktest/)
  assert.match(reviewedLocales, /strategyPublishBacktestCopy/)
  assert.doesNotMatch(english, /Please run code validation before publishing\./)
})

test('strategy republishing reports a marketplace update instead of another listing', () => {
  const ide = read('src/views/strategy-ide/index.vue')
  const english = read('src/locales/lang/en-US.js')
  const reviewedLocales = read('src/locales/reviewed-ui-overrides.js')

  assert.match(ide, /publication_action/)
  assert.match(ide, /publishUpdateSuccess/)
  assert.match(english, /strategyIde\.publishUpdateSuccess/)
  assert.match(reviewedLocales, /strategyPublishUpdateSuccessCopy/)
})

test('marketplace tab groups use a polished segmented control treatment', () => {
  const market = read('src/views/indicator-community/index.vue')

  assert.match(market, /\.market-asset-tabs,\s*\.market-discovery-tabs,\s*\.market-view-toggle \{[\s\S]*?gap: 3px;[\s\S]*?padding: 2px;[\s\S]*?border: 1px solid #e2e8f0;[\s\S]*?border-radius: 8px;[\s\S]*?background: #f8fafc;/)
  assert.match(market, /\.ant-radio-button-wrapper \{[\s\S]*?border: 0 !important;[\s\S]*?border-left: 0 !important;[\s\S]*?border-radius: 6px !important;[\s\S]*?&::before \{[\s\S]*?display: none !important;/)
  assert.match(market, /&\.ant-radio-button-wrapper-checked \{[\s\S]*?background: #fff;[\s\S]*?color: var\(--primary-color, #1890ff\);[\s\S]*?box-shadow:/)
})

test('indicator source visibility uses distinct semantic chip colors', () => {
  const catalog = read('src/views/indicator-community/components/MarketCatalogList.vue')

  assert.match(catalog, /tone: item\.code_hidden \? 'source-hidden' : 'source-visible'/)
  assert.match(catalog, /\.catalog-chip--source-visible \{[\s\S]*?color: #6ee7b7;/)
  assert.match(catalog, /\.catalog-chip--source-hidden \{[\s\S]*?color: #fbbf24;/)
  assert.match(catalog, /&--source-visible \{[\s\S]*?color: #047857;/)
  assert.match(catalog, /&--source-hidden \{[\s\S]*?color: #b45309;/)
})

test('marketplace copy is complete across every supported locale', () => {
  const locales = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'de-DE', 'fr-FR', 'ru-RU', 'ar-SA', 'th-TH', 'vi-VN']
  const referenceKeys = Object.keys(marketCatalogMessages['en-US']).sort()

  assert.deepEqual(Object.keys(marketCatalogMessages), locales)
  for (const locale of locales) {
    const messages = marketCatalogMessages[locale]
    assert.deepEqual(Object.keys(messages).sort(), referenceKeys, `${locale} marketplace keys differ`)
    assert.equal(Object.values(messages).every(value => typeof value === 'string' && value.trim().length > 0), true)
  }

  const localizedDetailKeys = [
    'community.purchaseDetails',
    'community.usageScope',
    'community.accountBoundUse',
    'community.updatePolicy',
    'community.manualSyncUpdates',
    'community.compatibility',
    'community.chartIndicatorCompatibility',
    'community.lastUpdated',
    'community.backtestRange',
    'community.tradeCount',
    'community.lastVerified',
    'community.dataSource',
    'community.executionCosts',
    'community.engineVersion'
  ]
  for (const locale of locales.slice(1)) {
    for (const key of localizedDetailKeys) {
      assert.notEqual(marketCatalogMessages[locale][key], marketCatalogMessages['en-US'][key], `${locale} should localize ${key}`)
    }
  }

  assert.equal(marketCatalogMessages['ja-JP']['community.sharpe'], 'シャープレシオ')
  assert.equal(marketCatalogMessages['ja-JP']['community.purchaseDetails'], '購入と互換性')
  assert.equal(marketCatalogMessages['ko-KR']['community.maxDrawdown'], '최대 낙폭')
  assert.equal(marketCatalogMessages['de-DE']['community.freeOnly'], 'Kostenlos')
  assert.equal(marketCatalogMessages['fr-FR']['community.sharpe'], 'Ratio de Sharpe')
  assert.equal(marketCatalogMessages['ru-RU']['community.views'], 'Просмотры')
  assert.equal(marketCatalogMessages['vi-VN']['community.codeVisible'], 'Mã nguồn công khai')
})

test('marketplace refetches localized records after the language changes', () => {
  const market = read('src/views/indicator-community/index.vue')

  assert.match(market, /'\$i18n\.locale' \(\) \{[\s\S]*?this\.pagination\.current = 1[\s\S]*?this\.loadIndicators\(\)/)
  assert.match(market, /if \(this\.showMyPurchases\) \{[\s\S]*?this\.loadMyPurchases\(\)/)
})
