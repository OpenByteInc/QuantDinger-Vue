<template>
  <a-modal
    :visible="visible"
    :title="$t('community.share.title')"
    :footer="null"
    :width="1080"
    :wrap-class-name="wrapClassName"
    destroy-on-close
    @cancel="$emit('close')"
  >
    <div
      class="market-share"
      :class="{ 'market-share--dark': isDarkTheme, 'market-share--rtl': isRtlLocale }"
      :style="shareStyleVars"
      :dir="textDirection"
    >
      <section class="market-share__visual">
        <div class="market-share__section-head">
          <div>
            <strong>{{ $t('community.share.visualTitle') }}</strong>
            <span>{{ $t('community.share.visualHint') }}</span>
          </div>
          <a-tag class="market-share__trust-tag"><a-icon type="safety-certificate" /> {{ $t('community.share.realDataOnly') }}</a-tag>
        </div>
        <div class="market-share__canvas-shell">
          <canvas ref="shareCanvas" width="1200" height="675" :aria-label="$t('community.share.visualTitle')" />
        </div>
        <div class="market-share__visual-actions">
          <a-button size="small" @click="downloadImage">
            <a-icon type="download" />
            {{ $t('community.share.downloadImage') }}
          </a-button>
          <a-button size="small" :disabled="!canCopyImage" @click="copyImage">
            <a-icon type="copy" />
            {{ $t('community.share.copyImage') }}
          </a-button>
        </div>
      </section>

      <section class="market-share__copy">
        <a-radio-group v-model="shareMode" button-style="solid" class="market-share__modes">
          <a-radio-button value="post">
            <a-icon type="highlight" />
            {{ $t('community.share.modePost') }}
          </a-radio-button>
          <a-radio-button value="link">
            <a-icon type="link" />
            {{ $t('community.share.modeLink') }}
          </a-radio-button>
        </a-radio-group>

        <template v-if="shareMode === 'post'">
          <div class="market-share__section-head market-share__section-head--copy">
            <div>
              <strong>{{ $t('community.share.copyTitle') }}</strong>
              <span>{{ $t('community.share.copyHint') }}</span>
            </div>
          </div>
          <a-radio-group v-model="copyFormat" button-style="solid" class="market-share__formats" @change="resetDraft">
            <a-radio-button value="short">{{ $t('community.share.formatShort') }}</a-radio-button>
            <a-radio-button value="professional">{{ $t('community.share.formatProfessional') }}</a-radio-button>
            <a-radio-button value="article">{{ $t('community.share.formatArticle') }}</a-radio-button>
          </a-radio-group>
          <div class="market-share__ai-panel">
            <div>
              <strong><a-icon type="thunderbolt" /> {{ $t('community.share.aiTitle') }}</strong>
              <span>{{ $t('community.share.aiHint') }}</span>
            </div>
            <a-button type="primary" size="small" :loading="aiGenerating" @click="generateAiDraft">
              {{ aiGenerating ? $t('community.share.aiGenerating') : $t('community.share.aiGenerate') }}
            </a-button>
          </div>
          <div v-if="aiGenerated" class="market-share__ai-status">
            <a-tag class="market-share__trust-tag"><a-icon type="check" /> {{ $t('community.share.aiGenerated') }}</a-tag>
            <div class="market-share__ai-status-meta">
              <span v-if="aiModel">{{ $t('community.share.aiModelUsed', { model: aiModel }) }}</span>
              <span v-if="aiBilling && aiBilling.charged">
                {{ $t('community.share.aiCreditsUsed', { count: aiBilling.charged }) }}
              </span>
            </div>
          </div>
          <a-textarea v-model="draft" class="market-share__textarea" :rows="9" :dir="textDirection" />
          <div class="market-share__copy-meta">
            <span>{{ $t('community.share.characterCount', { count: draft.length }) }}</span>
            <a-button type="link" size="small" @click="resetDraft">{{ $t('community.share.resetCopy') }}</a-button>
          </div>
          <a-button type="primary" block @click="copyDraft">
            <a-icon type="copy" />
            {{ $t('community.share.copyDraft') }}
          </a-button>

          <div class="market-share__platform-title">{{ $t('community.share.openPlatform') }}</div>
          <div class="market-share__platforms">
            <a-button v-for="platform in platforms" :key="platform.id" @click="openPlatform(platform.id)">
              <a-icon :type="platform.icon" />
              {{ platform.label }}
            </a-button>
          </div>
          <p class="market-share__platform-hint">{{ $t('community.share.platformHint') }}</p>
        </template>

        <template v-else>
          <div class="market-share__section-head market-share__section-head--copy">
            <div>
              <strong>{{ $t('community.share.linkTitle') }}</strong>
              <span>{{ $t('community.share.linkHint') }}</span>
            </div>
          </div>
          <div class="market-share__link-card">
            <div class="market-share__link-icon"><a-icon type="link" /></div>
            <div class="market-share__link-summary">
              <strong>{{ detail && detail.name }}</strong>
              <span>{{ assetTypeLabel }} · QuantDinger</span>
            </div>
          </div>
          <a-input :value="shareUrl" read-only class="market-share__link-input">
            <a-icon slot="prefix" type="global" />
          </a-input>
          <div class="market-share__link-actions">
            <a-button type="primary" @click="copyLink">
              <a-icon type="copy" />
              {{ $t('community.share.copyLink') }}
            </a-button>
            <a-button v-if="canNativeShare" @click="shareNative">
              <a-icon type="share-alt" />
              {{ $t('community.share.nativeShare') }}
            </a-button>
          </div>
          <div class="market-share__platform-title">{{ $t('community.share.shareLinkTo') }}</div>
          <div class="market-share__platforms">
            <a-button v-for="platform in linkPlatforms" :key="platform.id" @click="openLinkPlatform(platform.id)">
              <a-icon :type="platform.icon" />
              {{ platform.label }}
            </a-button>
          </div>
          <p class="market-share__platform-hint">{{ $t('community.share.linkPrivacyHint') }}</p>
        </template>
      </section>
    </div>
  </a-modal>
</template>

<script>
import { mapState } from 'vuex'
import request, { AI_GENERATE_TIMEOUT } from '@/utils/request'
import {
  buildListingShareUrl,
  buildPlatformShareUrl,
  safeShareFilename
} from '@/utils/marketShare.mjs'

const CARD_WIDTH = 1200
const CARD_HEIGHT = 675

export default {
  name: 'MarketShareModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    detail: {
      type: Object,
      default: null
    },
    performance: {
      type: Object,
      default: null
    },
    previewImage: {
      type: String,
      default: ''
    },
    isDarkTheme: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      shareMode: 'post',
      copyFormat: 'short',
      draft: '',
      aiGenerating: false,
      aiGenerated: false,
      aiBilling: null,
      aiModel: '',
      aiRequestId: 0,
      platforms: [
        { id: 'x', label: 'X', icon: 'twitter' },
        { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
        { id: 'reddit', label: 'Reddit', icon: 'reddit' },
        { id: 'medium', label: 'Medium', icon: 'read' },
        { id: 'substack', label: 'Substack', icon: 'form' }
      ],
      linkPlatforms: [
        { id: 'x', label: 'X', icon: 'twitter' },
        { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
        { id: 'reddit', label: 'Reddit', icon: 'reddit' }
      ]
    }
  },
  computed: {
    ...mapState({
      primaryColor: state => state.app.color || '#52C41A'
    }),
    shareStyleVars () {
      return { '--share-accent': this.shareAccentColor }
    },
    shareAccentColor () {
      const color = String(this.primaryColor || '').trim()
      return /^#[0-9a-f]{6}$/i.test(color) ? color : '#52C41A'
    },
    isRtlLocale () {
      return String(this.$i18n.locale || '').toLowerCase().startsWith('ar')
    },
    textDirection () {
      return this.isRtlLocale ? 'rtl' : 'ltr'
    },
    isStrategy () {
      const type = String((this.detail && this.detail.asset_type) || '').toLowerCase()
      return ['script_template', 'script', 'strategy'].includes(type)
    },
    assetTypeLabel () {
      return this.$t(this.isStrategy ? 'community.share.strategy' : 'community.share.indicator')
    },
    authorName () {
      const author = (this.detail && this.detail.author) || {}
      return author.nickname || author.username || this.$t('community.share.unknownAuthor')
    },
    shareUrl () {
      if (!this.detail || typeof window === 'undefined') return ''
      return buildListingShareUrl({
        locationHref: window.location.href,
        listingId: this.detail.id,
        assetType: this.detail.asset_type || 'indicator'
      })
    },
    metricItems () {
      if (!this.detail) return []
      if (this.isStrategy && this.performance && Number(this.performance.sample_size || 0) > 0) {
        return [
          {
            label: this.$t('community.totalReturn'),
            value: this.formatPercent(this.performance.total_return),
            tone: this.metricTone('return', this.performance.total_return)
          },
          {
            label: this.$t('community.sharpe'),
            value: this.formatNumber(this.performance.sharpe, 2),
            tone: this.metricTone('sharpe', this.performance.sharpe)
          },
          {
            label: this.$t('community.maxDrawdown'),
            value: this.formatPercent(this.performance.max_drawdown),
            tone: this.metricTone('drawdown', this.performance.max_drawdown)
          },
          {
            label: this.$t('community.winRate'),
            value: `${this.formatNumber(this.performance.win_rate, 2)}%`,
            tone: this.metricTone('winRate', this.performance.win_rate)
          }
        ]
      }
      return [
        { label: this.$t('community.rating'), value: this.formatNumber(this.detail.avg_rating, 1) },
        { label: this.$t('community.views'), value: this.formatInteger(this.detail.view_count) },
        { label: this.$t('community.downloads'), value: this.formatInteger(this.detail.purchase_count) }
      ]
    },
    factsLine () {
      return this.metricItems.map(item => `${item.label}: ${item.value}`).join(' · ')
    },
    disclaimer () {
      return this.isStrategy && this.performance && Number(this.performance.sample_size || 0) > 0
        ? this.$t('community.share.historicalDisclaimer')
        : this.$t('community.share.generalDisclaimer')
    },
    generatedCopy () {
      if (!this.detail) return ''
      const title = this.detail.name || this.assetTypeLabel
      const description = this.detail.description || this.$t('community.noDescription')
      const facts = this.factsLine ? `\n${this.$t('community.share.keyFacts')}: ${this.factsLine}` : ''
      const common = { type: this.assetTypeLabel, title, author: this.authorName }

      if (this.copyFormat === 'article') {
        return [
          this.$t('community.share.articleTitle', common),
          '',
          this.$t('community.share.articleOpening', common),
          '',
          description,
          facts,
          '',
          this.$t('community.share.articleClosing'),
          '',
          this.disclaimer,
          '',
          this.shareUrl
        ].filter((line, index, rows) => line !== '' || rows[index - 1] !== '').join('\n')
      }

      if (this.copyFormat === 'professional') {
        return [
          this.$t('community.share.professionalOpening', common),
          '',
          description,
          facts,
          '',
          this.$t('community.share.professionalClosing'),
          this.disclaimer,
          this.shareUrl,
          '',
          this.$t('community.share.hashtags')
        ].filter(Boolean).join('\n')
      }

      return [
        this.$t('community.share.shortOpening', common),
        description,
        facts,
        this.disclaimer,
        this.shareUrl,
        this.$t('community.share.hashtags')
      ].filter(Boolean).join('\n\n')
    },
    canCopyImage () {
      return typeof window !== 'undefined' && !!(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write)
    },
    canNativeShare () {
      return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    },
    wrapClassName () {
      return this.isDarkTheme ? 'qd-market-share-modal qd-market-share-modal--dark' : 'qd-market-share-modal'
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler (value) {
        if (!value) {
          this.aiRequestId += 1
          this.aiGenerating = false
          return
        }
        this.shareMode = 'post'
        this.copyFormat = 'short'
        this.$nextTick(() => {
          this.resetDraft()
          this.renderShareCard()
        })
      }
    },
    performance: {
      deep: true,
      handler () {
        if (!this.visible) return
        this.$nextTick(() => {
          this.resetDraft()
          this.renderShareCard()
        })
      }
    },
    '$i18n.locale' () {
      if (!this.visible) return
      this.resetDraft()
      this.$nextTick(() => this.renderShareCard())
    },
    primaryColor () {
      if (!this.visible) return
      this.$nextTick(() => this.renderShareCard())
    }
  },
  methods: {
    formatNumber (value, precision = 2) {
      const number = Number(value || 0)
      return Number.isFinite(number) ? number.toFixed(precision) : '—'
    },
    formatInteger (value) {
      const number = Number(value || 0)
      return Number.isFinite(number) ? new Intl.NumberFormat(this.$i18n.locale).format(number) : '0'
    },
    formatPercent (value) {
      const number = Number(value || 0)
      if (!Number.isFinite(number)) return '—'
      const normalized = Math.abs(number) <= 1 ? number * 100 : number
      return `${normalized >= 0 ? '+' : ''}${normalized.toFixed(2)}%`
    },
    resetDraft () {
      this.aiRequestId += 1
      this.aiGenerating = false
      this.draft = this.generatedCopy
      this.aiGenerated = false
      this.aiBilling = null
      this.aiModel = ''
    },
    composeAiDraft (payload) {
      const body = String(payload.body || '').trim()
      const title = String(payload.title || '').trim()
      const hashtags = Array.isArray(payload.hashtags)
        ? payload.hashtags.filter(Boolean).map(tag => `#${String(tag).replace(/^#+/, '')}`).join(' ')
        : ''
      const includeTitle = this.copyFormat !== 'short' && title
      return [
        includeTitle ? title : '',
        body,
        hashtags,
        this.disclaimer,
        this.shareUrl
      ].filter(Boolean).join('\n\n')
    },
    async generateAiDraft () {
      if (!this.detail || this.aiGenerating) return
      const requestedLocale = this.$i18n.locale
      const requestId = ++this.aiRequestId
      this.aiGenerating = true
      try {
        const response = await request({
          url: `/api/community/indicators/${this.detail.id}/share-draft`,
          method: 'post',
          timeout: AI_GENERATE_TIMEOUT,
          data: {
            format: this.copyFormat,
            locale: requestedLocale
          }
        })
        const result = response && response.data
        if (!result || !result.draft) throw new Error('ai_share_generation_failed')
        if (requestId !== this.aiRequestId || requestedLocale !== this.$i18n.locale) return
        if (result.draft.locale && result.draft.locale !== requestedLocale) {
          throw new Error('ai_share_locale_mismatch')
        }
        this.draft = this.composeAiDraft(result.draft)
        this.aiBilling = result.billing || null
        this.aiModel = String(result.draft.model || '').trim()
        this.aiGenerated = true
        if (this.aiBilling && this.aiBilling.remaining != null) {
          this.$root.$emit('credits-updated', this.aiBilling.remaining)
        }
        this.$message.success(this.$t('community.share.aiGeneratedSuccess'))
      } catch (error) {
        if (requestId !== this.aiRequestId || requestedLocale !== this.$i18n.locale) return
        const details = error && error.response && error.response.data && error.response.data.data
        const key = details && details.error_type === 'INSUFFICIENT_CREDITS'
          ? 'community.share.aiInsufficientCredits'
          : 'community.share.aiGenerateFailed'
        this.$message.error(this.$t(key))
      } finally {
        if (requestId === this.aiRequestId) this.aiGenerating = false
      }
    },
    async copyText (text) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        return
      }
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    },
    async copyDraft () {
      try {
        await this.copyText(this.draft)
        this.$message.success(this.$t('community.share.copySuccess'))
      } catch (error) {
        this.$message.error(this.$t('community.share.copyFailed'))
      }
    },
    async copyLink () {
      try {
        await this.copyText(this.shareUrl)
        this.$message.success(this.$t('community.share.linkCopied'))
      } catch (error) {
        this.$message.error(this.$t('community.share.linkCopyFailed'))
      }
    },
    async shareNative () {
      if (!this.canNativeShare) return
      try {
        await navigator.share({
          title: this.detail && this.detail.name,
          url: this.shareUrl
        })
      } catch (error) {
        if (error && error.name !== 'AbortError') {
          this.$message.error(this.$t('community.share.openFailed'))
        }
      }
    },
    async openPlatform (platform) {
      try {
        await this.copyText(this.draft)
        const url = buildPlatformShareUrl(platform, {
          title: this.detail && this.detail.name,
          text: this.draft,
          url: this.shareUrl
        })
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
        this.$message.success(this.$t('community.share.copiedAndOpened'))
      } catch (error) {
        this.$message.error(this.$t('community.share.openFailed'))
      }
    },
    openLinkPlatform (platform) {
      const url = buildPlatformShareUrl(platform, {
        title: this.detail && this.detail.name,
        text: '',
        url: this.shareUrl
      })
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    },
    downloadImage () {
      const canvas = this.$refs.shareCanvas
      if (!canvas) return
      const link = document.createElement('a')
      link.download = safeShareFilename(this.detail && this.detail.name, this.isStrategy ? 'strategy' : 'indicator')
      link.href = canvas.toDataURL('image/png')
      link.click()
    },
    async copyImage () {
      const canvas = this.$refs.shareCanvas
      if (!canvas || !this.canCopyImage) return
      try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
        this.$message.success(this.$t('community.share.imageCopySuccess'))
      } catch (error) {
        this.$message.error(this.$t('community.share.imageCopyFailed'))
      }
    },
    wrapCanvasText (ctx, text, maxWidth, maxLines) {
      const words = String(text || '').split(/\s+/)
      const lines = []
      let line = ''
      words.forEach(word => {
        const candidate = line ? `${line} ${word}` : word
        if (ctx.measureText(candidate).width <= maxWidth) {
          line = candidate
        } else {
          if (line) lines.push(line)
          line = word
        }
      })
      if (line) lines.push(line)
      const visible = lines.slice(0, maxLines)
      if (lines.length > maxLines && visible.length) {
        visible[visible.length - 1] = `${visible[visible.length - 1].replace(/[.…]+$/, '')}…`
      }
      return visible
    },
    roundedRect (ctx, x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2)
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + width, y, x + width, y + height, r)
      ctx.arcTo(x + width, y + height, x, y + height, r)
      ctx.arcTo(x, y + height, x, y, r)
      ctx.arcTo(x, y, x + width, y, r)
      ctx.closePath()
    },
    metricTone (kind, rawValue) {
      const value = Number(rawValue)
      if (!Number.isFinite(value)) return 'neutral'
      if (kind === 'drawdown') return Math.abs(value) > 0 ? 'down' : 'neutral'
      if (kind === 'winRate') {
        if (value <= 0) return 'neutral'
        return value >= 50 ? 'up' : 'down'
      }
      if (value > 0) return 'up'
      if (value < 0) return 'down'
      return 'neutral'
    },
    drawMetricCards (ctx, palette, y) {
      const items = this.metricItems.slice(0, 4)
      const gap = 14
      const width = (1100 - gap * (items.length - 1)) / items.length
      items.forEach((item, index) => {
        const x = 50 + index * (width + gap)
        this.roundedRect(ctx, x, y, width, 104, 16)
        ctx.fillStyle = palette.panel
        ctx.fill()
        ctx.fillStyle = palette.muted
        ctx.font = '500 19px Arial, sans-serif'
        ctx.fillText(item.label, x + 20, y + 32)
        ctx.fillStyle = item.tone === 'up'
          ? palette.gain
          : (item.tone === 'down' ? palette.loss : palette.text)
        ctx.font = '700 31px Arial, sans-serif'
        ctx.fillText(item.value, x + 20, y + 75)
      })
    },
    drawEquityCurve (ctx, palette, x, y, width, height) {
      const points = (this.performance && this.performance.equity_curve) || []
      const values = points.map(point => {
        if (typeof point === 'object' && point !== null) {
          return Number(point.equity != null ? point.equity : point.value)
        }
        return Number(point)
      }).filter(Number.isFinite)
      if (values.length < 2) return false
      const min = Math.min(...values)
      const max = Math.max(...values)
      const range = max - min || 1
      ctx.save()
      this.roundedRect(ctx, x, y, width, height, 18)
      ctx.fillStyle = palette.panel
      ctx.fill()
      ctx.clip()
      const gradient = ctx.createLinearGradient(0, y, 0, y + height)
      gradient.addColorStop(0, this.hexToRgba(palette.accent, 0.30))
      gradient.addColorStop(1, this.hexToRgba(palette.accent, 0.02))
      ctx.beginPath()
      values.forEach((value, index) => {
        const px = x + 22 + (index / (values.length - 1)) * (width - 44)
        const py = y + 30 + (1 - (value - min) / range) * (height - 60)
        if (index === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.lineTo(x + width - 22, y + height - 18)
      ctx.lineTo(x + 22, y + height - 18)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.beginPath()
      values.forEach((value, index) => {
        const px = x + 22 + (index / (values.length - 1)) * (width - 44)
        const py = y + 30 + (1 - (value - min) / range) * (height - 60)
        if (index === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.strokeStyle = palette.accent
      ctx.lineWidth = 5
      ctx.stroke()
      ctx.restore()
      return true
    },
    drawEquityPlaceholder (ctx, palette, x, y, width, height) {
      ctx.save()
      this.roundedRect(ctx, x, y, width, height, 18)
      ctx.fillStyle = palette.panel
      ctx.fill()
      ctx.clip()

      ctx.strokeStyle = palette.border
      ctx.lineWidth = 1
      for (let index = 1; index < 5; index += 1) {
        const lineY = y + (height / 5) * index
        ctx.beginPath()
        ctx.moveTo(x + 28, lineY)
        ctx.lineTo(x + width - 28, lineY)
        ctx.stroke()
      }
      for (let index = 1; index < 6; index += 1) {
        const lineX = x + (width / 6) * index
        ctx.beginPath()
        ctx.moveTo(lineX, y + 24)
        ctx.lineTo(lineX, y + height - 24)
        ctx.stroke()
      }

      const centerX = x + width / 2
      const iconY = y + 106
      ctx.strokeStyle = palette.muted
      ctx.lineWidth = 4
      ctx.setLineDash([9, 8])
      ctx.beginPath()
      ctx.moveTo(centerX - 72, iconY + 20)
      ctx.lineTo(centerX - 30, iconY - 12)
      ctx.lineTo(centerX + 8, iconY + 4)
      ctx.lineTo(centerX + 68, iconY - 40)
      ctx.stroke()
      ctx.setLineDash([])
      ;[[centerX - 72, iconY + 20], [centerX - 30, iconY - 12], [centerX + 8, iconY + 4], [centerX + 68, iconY - 40]].forEach(([pointX, pointY]) => {
        ctx.beginPath()
        ctx.arc(pointX, pointY, 5, 0, Math.PI * 2)
        ctx.fillStyle = palette.panel
        ctx.fill()
        ctx.strokeStyle = palette.muted
        ctx.lineWidth = 3
        ctx.stroke()
      })

      ctx.fillStyle = palette.muted
      ctx.font = '600 22px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(this.$t('community.share.noChartData'), centerX, y + 238)
      ctx.font = '700 16px Arial, sans-serif'
      ctx.fillStyle = this.hexToRgba(palette.accent, this.isDarkTheme ? 0.72 : 0.82)
      ctx.fillText('QuantDinger', centerX, y + 274)
      ctx.textAlign = 'left'
      ctx.restore()
    },
    hexToRgba (color, alpha) {
      const hex = String(color || '').replace('#', '')
      if (!/^[0-9a-f]{6}$/i.test(hex)) return `rgba(82, 196, 26, ${alpha})`
      const value = Number.parseInt(hex, 16)
      return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
    },
    loadPreviewImage () {
      if (!this.previewImage) return Promise.resolve(null)
      return new Promise(resolve => {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.onload = () => resolve(image)
        image.onerror = () => resolve(null)
        image.src = this.previewImage
      })
    },
    drawCoverImage (ctx, image, x, y, width, height) {
      if (!image) return
      const scale = Math.max(width / image.width, height / image.height)
      const sourceWidth = width / scale
      const sourceHeight = height / scale
      const sourceX = (image.width - sourceWidth) / 2
      const sourceY = (image.height - sourceHeight) / 2
      ctx.save()
      this.roundedRect(ctx, x, y, width, height, 18)
      ctx.clip()
      ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
      ctx.restore()
    },
    async renderShareCard () {
      const canvas = this.$refs.shareCanvas
      if (!canvas || !this.detail) return
      const ctx = canvas.getContext('2d')
      const palette = this.isDarkTheme
        ? { background: '#111111', panel: '#1d1d1d', text: '#f5f5f5', muted: '#a6a6a6', border: '#333333', accent: this.shareAccentColor, gain: '#4ade80', loss: '#fb7185' }
        : { background: '#f6f8fb', panel: '#ffffff', text: '#172033', muted: '#697386', border: '#e4e9f0', accent: this.shareAccentColor, gain: '#16a34a', loss: '#dc2626' }
      const image = this.isStrategy ? null : await this.loadPreviewImage()
      ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
      ctx.fillStyle = palette.background
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

      ctx.fillStyle = palette.accent
      ctx.fillRect(0, 0, 14, CARD_HEIGHT)
      ctx.fillStyle = palette.text
      ctx.font = '800 28px Arial, sans-serif'
      ctx.fillText('QuantDinger', 50, 58)
      ctx.fillStyle = palette.muted
      ctx.font = '600 19px Arial, sans-serif'
      ctx.fillText(this.$t('community.share.marketLabel'), 1000, 56)

      ctx.fillStyle = palette.accent
      ctx.font = '700 21px Arial, sans-serif'
      ctx.fillText(this.assetTypeLabel.toUpperCase(), 50, 118)
      ctx.fillStyle = palette.text
      ctx.font = '800 43px Arial, sans-serif'
      const titleLines = this.wrapCanvasText(ctx, this.detail.name, 670, 2)
      titleLines.forEach((line, index) => ctx.fillText(line, 50, 172 + index * 51))

      ctx.fillStyle = palette.muted
      ctx.font = '500 21px Arial, sans-serif'
      const descriptionLines = this.wrapCanvasText(ctx, this.detail.description || this.$t('community.noDescription'), 670, 3)
      descriptionLines.forEach((line, index) => ctx.fillText(line, 50, 292 + index * 31))
      ctx.fillText(this.$t('community.share.byAuthor', { author: this.authorName }), 50, 398)

      if (this.isStrategy) {
        const drawn = this.drawEquityCurve(ctx, palette, 770, 105, 380, 310)
        if (!drawn) {
          this.drawEquityPlaceholder(ctx, palette, 770, 105, 380, 310)
        }
      } else if (image) {
        this.drawCoverImage(ctx, image, 770, 105, 380, 310)
      } else {
        this.roundedRect(ctx, 770, 105, 380, 310, 18)
        ctx.fillStyle = palette.panel
        ctx.fill()
        ctx.fillStyle = palette.accent
        ctx.font = '800 84px Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('ƒ(x)', 960, 282)
        ctx.textAlign = 'left'
      }

      this.drawMetricCards(ctx, palette, 452)
      ctx.strokeStyle = palette.border
      ctx.beginPath()
      ctx.moveTo(50, 590)
      ctx.lineTo(1150, 590)
      ctx.stroke()
      ctx.fillStyle = palette.muted
      ctx.font = '500 17px Arial, sans-serif'
      const disclaimer = this.wrapCanvasText(ctx, this.disclaimer, 920, 2)
      disclaimer.forEach((line, index) => ctx.fillText(line, 50, 620 + index * 22))
      ctx.textAlign = 'right'
      ctx.fillText('quantdinger.com', 1150, 640)
      ctx.textAlign = 'left'
    }
  }
}
</script>

<style lang="less" scoped>
.market-share {
  --share-accent: var(--primary-color, #52c41a);
  --share-accent-soft: color-mix(in srgb, var(--share-accent) 9%, #fff);
  --share-accent-border: color-mix(in srgb, var(--share-accent) 34%, #fff);
  --share-text: rgba(0, 0, 0, 0.88);
  --share-muted: rgba(0, 0, 0, 0.52);
  --share-subtle: rgba(0, 0, 0, 0.38);
  --share-border: #e8ebef;
  --share-surface: #fff;
  --share-surface-soft: #f7f8fa;
  display: grid;
  grid-template-columns: minmax(0, 1.16fr) minmax(370px, 0.84fr);
  gap: 22px;
  color: var(--share-text);
  font-size: 14px;

  &__visual,
  &__copy {
    min-width: 0;
  }

  &__copy {
    padding: 16px;
    border: 1px solid var(--share-border);
    border-radius: 14px;
    background: var(--share-surface-soft);
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 44px;
    margin-bottom: 10px;

    strong,
    span {
      display: block;
    }

    strong {
      color: var(--share-text);
      font-size: 16px;
      line-height: 1.35;
    }

    span {
      margin-top: 2px;
      color: var(--share-muted);
      font-size: 12px;
      line-height: 1.5;
    }
  }

  &__trust-tag {
    flex: 0 0 auto;
    margin: 0;
    border-color: var(--share-accent-border);
    background: var(--share-accent-soft);
    color: var(--share-accent);
    white-space: nowrap;
  }

  &__canvas-shell {
    overflow: hidden;
    border: 1px solid var(--share-border);
    border-radius: 14px;
    background: var(--share-surface-soft);
    box-shadow: 0 12px 32px rgba(23, 32, 51, 0.08);

    canvas {
      display: block;
      width: 100%;
      height: auto;
    }
  }

  &__visual-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;

    .ant-btn {
      min-height: 34px;
      padding: 0 13px;
      border-radius: 7px;
      font-size: 13px;
    }
  }

  &__modes {
    display: flex;
    width: 100%;
    margin-bottom: 14px;
    padding: 3px;
    border: 1px solid var(--share-border);
    border-radius: 10px;
    background: var(--share-surface);

    ::v-deep .ant-radio-button-wrapper {
      flex: 1;
      height: auto;
      min-height: 36px;
      padding: 7px 12px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      box-shadow: none;
      color: var(--share-muted);
      line-height: 22px;
      text-align: center;

      &::before {
        display: none;
      }

      &.ant-radio-button-wrapper-checked {
        background: var(--share-accent);
        color: #fff;
        box-shadow: 0 4px 12px color-mix(in srgb, var(--share-accent) 24%, transparent);
      }
    }
  }

  &__section-head--copy {
    min-height: 40px;
    margin-bottom: 7px;
  }

  &__formats {
    display: flex;
    width: 100%;
    margin-bottom: 10px;

    ::v-deep .ant-radio-button-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      height: auto;
      min-height: 34px;
      padding: 6px 8px;
      border-color: var(--share-border);
      background: var(--share-surface);
      color: var(--share-muted);
      line-height: 1.3;
      text-align: center;
      white-space: normal;

      &.ant-radio-button-wrapper-checked {
        z-index: 1;
        border-color: var(--share-accent);
        background: var(--share-accent);
        color: #fff;
        box-shadow: none;
      }
    }
  }

  &__textarea {
    min-height: 232px;
    padding: 12px 13px;
    border-color: var(--share-border);
    border-radius: 9px;
    background: var(--share-surface);
    color: var(--share-text);
    font-family: inherit;
    font-size: 13px;
    line-height: 1.65;
    resize: vertical;
  }

  &__ai-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 9px;
    padding: 10px 11px;
    border: 1px solid var(--share-accent-border);
    border-radius: 10px;
    background: linear-gradient(135deg, var(--share-accent-soft), var(--share-surface));

    strong,
    span {
      display: block;
    }

    strong {
      color: var(--share-accent);
      font-size: 13px;
      line-height: 1.35;
    }

    span {
      margin-top: 2px;
      color: var(--share-muted);
      font-size: 11px;
      line-height: 1.45;
    }

    .ant-btn {
      flex: 0 0 auto;
      min-height: 32px;
      border-radius: 7px;
    }
  }

  &__ai-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    color: var(--share-muted);
    font-size: 11px;
  }

  &__ai-status-meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    min-width: 0;
    text-align: end;

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__copy-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 28px;
    color: var(--share-subtle);
    font-size: 12px;
  }

  &__platform-title {
    margin: 16px 0 8px;
    color: var(--share-text);
    font-size: 13px;
    font-weight: 600;
  }

  &__platforms {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    .ant-btn {
      min-height: 36px;
      height: auto;
      padding: 7px 10px;
      overflow: visible;
      border-color: var(--share-border);
      border-radius: 8px;
      background: var(--share-surface);
      color: var(--share-muted);
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: normal;

      &:hover,
      &:focus {
        border-color: var(--share-accent);
        color: var(--share-accent);
      }
    }
  }

  &__platform-hint {
    margin: 10px 0 0;
    color: var(--share-subtle);
    font-size: 12px;
    line-height: 1.6;
  }

  &__link-card {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 8px 0 14px;
    padding: 16px;
    border: 1px solid var(--share-border);
    border-radius: 12px;
    background: var(--share-surface);
  }

  &__link-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: var(--share-accent-soft);
    color: var(--share-accent);
    font-size: 20px;
  }

  &__link-summary {
    min-width: 0;

    strong,
    span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      color: var(--share-text);
    }

    span {
      margin-top: 3px;
      color: var(--share-muted);
      font-size: 12px;
    }
  }

  &__link-input {
    margin-bottom: 10px;
  }

  &__link-actions {
    display: flex;
    gap: 8px;

    .ant-btn {
      flex: 1;
      min-height: 36px;
      height: auto;
      border-radius: 8px;
      white-space: normal;
    }
  }

  &--dark {
    --share-accent-soft: color-mix(in srgb, var(--share-accent) 13%, #171717);
    --share-accent-border: color-mix(in srgb, var(--share-accent) 42%, #262626);
    --share-text: rgba(255, 255, 255, 0.9);
    --share-muted: rgba(255, 255, 255, 0.58);
    --share-subtle: rgba(255, 255, 255, 0.4);
    --share-border: #343434;
    --share-surface: #1c1c1c;
    --share-surface-soft: #171717;

    .market-share__ai-panel {
      background: linear-gradient(135deg, var(--share-accent-soft), #1c1c1c);
    }

    .market-share__canvas-shell {
      background: #111;
      box-shadow: none;
    }
  }

  &--rtl {
    .market-share__section-head,
    .market-share__ai-panel,
    .market-share__copy-meta,
    .market-share__link-card {
      text-align: right;
    }

    .market-share__visual-actions,
    .market-share__link-actions {
      justify-content: flex-start;
    }
  }
}

@media (max-width: 980px) {
  .market-share {
    grid-template-columns: 1fr;

    &__copy {
      padding: 14px;
    }
  }
}

@media (max-width: 560px) {
  .market-share {
    gap: 16px;

    &__section-head,
    &__ai-panel {
      align-items: stretch;
      flex-direction: column;
    }

    &__trust-tag {
      align-self: flex-start;
    }

    &__formats {
      ::v-deep .ant-radio-button-wrapper {
        padding: 6px 4px;
        font-size: 12px;
      }
    }

    &__platforms {
      grid-template-columns: 1fr;
    }

    &__visual-actions,
    &__link-actions {
      flex-wrap: wrap;

      .ant-btn {
        flex: 1 1 auto;
      }
    }
  }
}
</style>

<style lang="less">
.qd-market-share-modal {
  .ant-modal {
    max-width: calc(100vw - 32px);
    padding-bottom: 20px;
  }

  .ant-modal-content {
    overflow: hidden;
    border-radius: 16px;
  }

  .ant-modal-header {
    padding: 18px 22px;
  }

  .ant-modal-title {
    font-size: 18px;
    font-weight: 700;
  }

  .ant-modal-body {
    max-height: calc(100vh - 120px);
    padding: 20px 22px 22px;
    overflow-y: auto;
  }

  .ant-btn-primary {
    border-color: var(--primary-color, #52c41a);
    background: var(--primary-color, #52c41a);
  }
}

.qd-market-share-modal--dark {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body {
    background: #161616;
  }

  .ant-modal-header {
    border-bottom-color: #303030;
  }

  .ant-modal-title,
  .ant-modal-close {
    color: rgba(255, 255, 255, 0.85);
  }

  textarea.ant-input {
    border-color: #434343;
    background: #1c1c1c;
    color: rgba(255, 255, 255, 0.85);
  }

  .ant-input,
  .ant-btn:not(.ant-btn-primary) {
    border-color: #343434;
    background: #1c1c1c;
    color: rgba(255, 255, 255, 0.68);
  }

  .ant-btn:not(.ant-btn-primary):hover,
  .ant-btn:not(.ant-btn-primary):focus {
    border-color: var(--primary-color, #52c41a);
    color: var(--primary-color, #52c41a);
  }
}
</style>
