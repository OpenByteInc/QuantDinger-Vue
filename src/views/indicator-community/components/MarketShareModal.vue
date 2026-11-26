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
        </div>
        <div class="market-share__canvas-shell">
          <canvas ref="shareCanvas" width="1200" height="675" :aria-label="$t('community.share.visualTitle')" />
        </div>
        <div class="market-share__visual-note">
          <span><a-icon type="safety-certificate" /> {{ $t('community.share.realDataOnly') }}</span>
          <span>PNG · 1200 × 675</span>
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
            <a-button size="small" :loading="aiGenerating" @click="generateAiDraft">
              <a-icon v-if="!aiGenerating" type="edit" />
              {{ aiGenerating ? $t('community.share.aiGenerating') : $t('community.share.aiGenerate') }}
            </a-button>
            <div class="market-share__ai-help">
              <span>{{ $t('community.share.aiCostNote') }}</span>
              <a-tooltip :title="$t('community.share.aiHint')" :trigger="['hover', 'focus']">
                <button type="button" class="market-share__help-button" :aria-label="$t('community.share.aiHint')">
                  <a-icon type="info-circle" />
                </button>
              </a-tooltip>
            </div>
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
          <a-textarea v-model="draft" class="market-share__textarea" :aria-label="$t('community.share.copyTitle')" :rows="8" :dir="textDirection" />
          <div class="market-share__copy-meta">
            <span>{{ $t('community.share.characterCount', { count: draft.length }) }}</span>
            <div class="market-share__draft-actions">
              <a-button type="link" size="small" @click="resetDraft">{{ $t('community.share.resetCopy') }}</a-button>
              <a-button type="primary" @click="copyDraft">
                <a-icon type="copy" />
                {{ $t('community.share.copyDraft') }}
              </a-button>
            </div>
          </div>

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
          <a-input :value="shareUrl" :aria-label="$t('community.share.linkTitle')" read-only class="market-share__link-input">
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
        ctx.font = '600 31px Arial, sans-serif'
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
      ctx.font = '600 28px Arial, sans-serif'
      ctx.fillText('QuantDinger', 50, 58)
      ctx.fillStyle = palette.muted
      ctx.font = '600 19px Arial, sans-serif'
      ctx.fillText(this.$t('community.share.marketLabel'), 1000, 56)

      ctx.fillStyle = palette.accent
      ctx.font = '700 21px Arial, sans-serif'
      ctx.fillText(this.assetTypeLabel.toUpperCase(), 50, 118)
      ctx.fillStyle = palette.text
      ctx.font = '600 43px Arial, sans-serif'
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

<style lang="less">
.qd-market-share-modal {
  --share-accent: var(--primary-color, #52c41a);
  --share-text: #262626;
  --share-muted: #737373;
  --share-border: #e8e8e8;
  --share-surface: #fff;
  --share-surface-soft: #f7f7f7;

  &--dark {
    --share-text: #e6e6e6;
    --share-muted: #a3a3a3;
    --share-border: #303030;
    --share-surface: #141414;
    --share-surface-soft: #1c1c1c;
  }

  .ant-modal {
    top: 32px;
    max-width: calc(100vw - 32px);
    padding-bottom: 32px;
  }
  .ant-modal-content { overflow: hidden; border-radius: 8px; }
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body { background: var(--share-surface) !important; }
  .ant-modal-header { padding: 20px 24px; border-bottom: 1px solid var(--share-border); }
  .ant-modal-title { color: var(--share-text); font-size: 16px; font-weight: 600; line-height: 24px; }
  .ant-modal-close { color: var(--share-muted); }
  .ant-modal-body { max-height: calc(100dvh - 128px); padding: 0; overflow-y: auto; }

  .market-share {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    color: var(--share-text);
    font-size: 14px;
    line-height: 1.5;

    &__visual,
    &__copy { min-width: 0; padding: 24px; }
    &__visual { display: flex; flex-direction: column; justify-content: center; background: var(--share-surface-soft); border-inline-end: 1px solid var(--share-border); }

    &__section-head {
      margin-bottom: 16px;
      strong { display: block; color: var(--share-text); font-size: 14px; font-weight: 600; line-height: 24px; }
      span { display: block; margin-top: 4px; color: var(--share-muted); font-size: 12px; line-height: 20px; }
    }

    &__canvas-shell {
      overflow: hidden;
      border: 1px solid var(--share-border);
      border-radius: 6px;
      background: var(--share-surface);
      canvas { display: block; width: 100%; height: auto; }
    }

    &__visual-note {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 4px 12px;
      margin-top: 12px;
      color: var(--share-muted);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    &__visual-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }

    &__modes {
      display: flex;
      width: 100%;
      gap: 24px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--share-border);
      .ant-radio-button-wrapper {
        display: inline-flex;
        align-items: center;
        min-height: 40px;
        height: auto;
        padding: 0 0 12px;
        color: var(--share-muted) !important;
        background: transparent !important;
        border: 0 !important;
        border-bottom: 2px solid transparent !important;
        border-radius: 0;
        box-shadow: none !important;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
        white-space: normal;
        &::before { display: none; }
        &-checked { color: var(--share-accent) !important; border-bottom-color: var(--share-accent) !important; }
        &:hover { color: var(--share-accent) !important; }
      }
    }

    &__formats {
      display: flex;
      width: 100%;
      gap: 4px;
      padding: 4px;
      background: var(--share-surface-soft);
      border-radius: 6px;
      .ant-radio-button-wrapper {
        display: flex;
        flex: 1;
        align-items: center;
        justify-content: center;
        min-height: 32px;
        height: auto;
        padding: 4px 8px;
        color: var(--share-muted) !important;
        background: transparent !important;
        border: 1px solid transparent !important;
        border-radius: 4px;
        box-shadow: none !important;
        font-size: 13px;
        line-height: 20px;
        white-space: normal;
        text-align: center;
        &::before { display: none; }
        &-checked {
          color: var(--share-text) !important;
          background: var(--share-surface) !important;
          border-color: var(--share-border) !important;
          font-weight: 600;
        }
        &:hover { color: var(--share-text) !important; }
      }
    }

    &__ai-panel { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin: 12px 0; }
    &__ai-help { display: flex; align-items: center; gap: 4px; color: var(--share-muted); font-size: 12px; }
    &__help-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 24px;
      width: 24px;
      height: 24px;
      padding: 0;
      color: var(--share-muted);
      background: transparent;
      border: 0;
      border-radius: 4px;
      cursor: help;
    }
    &__textarea.ant-input {
      min-height: 224px;
      max-height: 420px;
      padding: 12px;
      color: var(--share-text) !important;
      background: var(--share-surface) !important;
      border: 1px solid var(--share-border) !important;
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.65;
      resize: vertical;
      &:focus { border-color: var(--share-accent) !important; box-shadow: none; }
    }
    &__copy-meta { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; color: var(--share-muted); font-size: 12px; }
    &__draft-actions { display: flex; align-items: center; gap: 12px; }

    &__ai-status { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-bottom: 8px; color: var(--share-muted); font-size: 12px; }
    &__trust-tag { margin: 0; padding: 0; color: var(--share-muted); background: transparent; border: 0; }
    &__ai-status-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; }

    &__platform-title { margin: 24px 0 12px; padding-top: 20px; border-top: 1px solid var(--share-border); font-size: 13px; font-weight: 600; }
    &__platforms {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      .ant-btn { padding-inline: 10px; font-size: 12px; }
    }
    &__platform-hint { margin: 12px 0 0; color: var(--share-muted); font-size: 12px; line-height: 20px; }

    &__link-card { display: flex; align-items: center; gap: 12px; padding: 16px 0; }
    &__link-icon { color: var(--share-muted); font-size: 20px; }
    &__link-summary {
      min-width: 0;
      strong { display: block; overflow-wrap: anywhere; font-weight: 600; }
      span { display: block; margin-top: 4px; color: var(--share-muted); font-size: 12px; }
    }
    &__link-input { margin: 8px 0 16px; }
    &__link-input .ant-input { color: var(--share-text) !important; background: var(--share-surface-soft) !important; border-color: var(--share-border) !important; font-size: 13px; }
    &__link-input .ant-input-prefix { color: var(--share-muted); }
    &__link-actions { display: flex; flex-wrap: wrap; gap: 8px; }

    .ant-btn {
      min-height: 32px;
      height: auto;
      padding: 4px 12px;
      border-radius: 4px;
      box-shadow: none;
      font-size: 13px;
      line-height: 22px;
      white-space: normal;
    }
    .ant-btn:not(.ant-btn-primary):not(.ant-btn-link) {
      color: var(--share-text) !important;
      background: var(--share-surface) !important;
      border-color: var(--share-border) !important;
      &:hover:not(:disabled) { color: var(--share-accent) !important; border-color: var(--share-accent) !important; }
      &:disabled { color: var(--share-muted) !important; opacity: 0.5; }
    }
    .ant-btn-link { color: var(--share-muted) !important; background: transparent !important; border: 0 !important; }
    .ant-btn-link:hover { color: var(--share-accent) !important; }
    .ant-radio-button-wrapper:focus-within { box-shadow: none !important; }
    button:focus-visible,
    .ant-radio-button-wrapper:has(input:focus-visible) { outline: 2px solid var(--share-accent); outline-offset: 3px; }
  }
}

@media (max-width: 900px) {
  .qd-market-share-modal {
    .market-share { grid-template-columns: 1fr; }
    .market-share__visual { border-inline-end: 0; border-bottom: 1px solid var(--share-border); }
    .market-share__canvas-shell { max-width: 560px; margin-inline: auto; }
  }
}

@media (max-width: 560px) {
  body:has(.qd-market-share-modal:not([style*="display: none"])) .mobile-menu-close { display: none !important; }
  .qd-market-share-modal {
    .ant-modal { top: 12px; max-width: calc(100vw - 24px); margin-inline: auto; padding-bottom: 12px; }
    .ant-modal-header { padding: 16px 48px 16px 16px; }
    .ant-modal-body { max-height: calc(100dvh - 88px); }
    .market-share__visual,
    .market-share__copy { padding: 16px; }
    .market-share__modes { gap: 20px; }
    .market-share__formats .ant-radio-button-wrapper { padding-inline: 4px; font-size: 12px; }
    .market-share__textarea.ant-input { min-height: 200px; }
  }
}
</style>
