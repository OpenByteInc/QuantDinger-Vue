<template>
  <div class="notice-icon-wrapper">
    <a-popover
      v-model="visible"
      trigger="click"
      placement="bottomRight"
      overlayClassName="header-notice-wrapper"
      :getPopupContainer="getNoticePopupContainer"
      :autoAdjustOverflow="true"
      :arrowPointAtCenter="true"
      :overlayStyle="{ width: '380px', zIndex: 2500 }"
      @visibleChange="handleVisibleChange"
    >
      <template slot="content">
        <div class="notice-header">
          <span class="notice-title">{{ $t('notice.title') }}</span>
          <a v-if="notifications.length > 0" @click="markAllRead" class="notice-action">
            {{ $t('notice.markAllRead') }}
          </a>
        </div>
        <a-spin :spinning="loading">
          <div class="notice-list" v-if="notifications.length > 0">
            <div
              v-for="item in notifications"
              :key="item.id"
              class="notice-item"
              :class="{ unread: !item.is_read }"
              @click="handleNoticeClick(item)"
            >
              <div class="notice-item-icon">
                <a-icon :type="getNoticeIcon(item.signal_type)" :style="{ color: getNoticeColor(item.signal_type) }" />
              </div>
              <div class="notice-item-content">
                <div class="notice-item-title">{{ displayTitle(item) }}</div>
                <div class="notice-item-desc">{{ displayPreview(item) }}</div>
                <div class="notice-item-time">{{ formatTime(item.created_at) }}</div>
              </div>
            </div>
          </div>
          <div class="notice-empty" v-else>
            <a-empty :description="$t('notice.empty')" />
          </div>
        </a-spin>
        <div class="notice-footer" v-if="notifications.length > 0">
          <a @click="clearNotifications">{{ $t('notice.clear') }}</a>
        </div>
      </template>
      <span @click="fetchNotice" class="header-notice" ref="noticeRef">
        <a-badge :count="unreadCount" :overflowCount="99">
          <a-icon class="header-notice-icon" type="bell" />
        </a-badge>
      </span>
    </a-popover>

    <a-modal
      v-model="detailVisible"
      :title="detailNotice ? displayTitle(detailNotice) : ''"
      :footer="null"
      :width="hasProfessionalReports ? 1180 : (isHtmlReport ? 900 : 660)"
      :wrapClassName="isHtmlReport ? 'notice-detail-modal html-report-modal' : 'notice-detail-modal'"
      centered
    >
      <div v-if="detailNotice" class="notice-detail">
        <div class="notice-detail-meta">
          <div class="notice-detail-type">
            <a-icon :type="getNoticeIcon(detailNotice.signal_type)" :style="{ color: getNoticeColor(detailNotice.signal_type) }" />
            <span class="type-label">{{ displayTypeLabel(detailNotice.signal_type) }}</span>
          </div>
          <div class="notice-detail-time">
            <a-icon type="clock-circle" />
            <span>{{ formatFullTime(detailNotice.created_at) }}</span>
          </div>
        </div>

        <a-divider />

        <div class="notice-detail-content" :class="{ 'html-report': isHtmlReport }">
          <div v-if="hasProfessionalReports" class="professional-report-list">
            <ProfessionalAnalysisReport
              v-for="report in professionalReports"
              :key="report.report_id || `${report.instrument && report.instrument.market}:${report.instrument && report.instrument.symbol}`"
              :result="report"
            />
          </div>
          <div v-else v-html="displayMessageHtml(detailNotice)" class="message-body"></div>
        </div>

        <template v-if="hasExtraDetail">
          <a-divider />
          <div class="notice-detail-extra">
            <div class="extra-title">{{ $t('notice.detailInfo') }}</div>

            <template v-if="detailNotice.signal_type === 'ai_monitor'">
              <div v-if="detailNotice.payload.final_decision" class="extra-item decision">
                <span class="label">{{ $t('notice.aiDecision') }}:</span>
                <a-tag :color="getDecisionColor(detailNotice.payload.final_decision)">
                  {{ detailNotice.payload.final_decision }}
                </a-tag>
                <span v-if="detailNotice.payload.confidence" class="confidence">
                  ({{ $t('notice.confidence') }}: {{ detailNotice.payload.confidence }}%)
                </span>
              </div>
              <div v-if="detailNotice.payload.reasoning" class="extra-item">
                <span class="label">{{ $t('notice.reasoning') }}:</span>
                <span class="value">{{ detailNotice.payload.reasoning }}</span>
              </div>
            </template>

            <template v-if="detailNotice.signal_type === 'price_alert'">
              <div v-if="detailNotice.payload.symbol" class="extra-item">
                <span class="label">{{ $t('notice.symbol') }}:</span>
                <span class="value">{{ detailNotice.payload.symbol }}</span>
              </div>
              <div v-if="detailNotice.payload.price" class="extra-item">
                <span class="label">{{ $t('notice.currentPrice') }}:</span>
                <span class="value">${{ detailNotice.payload.price }}</span>
              </div>
              <div v-if="detailNotice.payload.trigger_price" class="extra-item">
                <span class="label">{{ $t('notice.triggerPrice') }}:</span>
                <span class="value">${{ detailNotice.payload.trigger_price }}</span>
              </div>
            </template>

            <template v-if="detailNotice.signal_type === 'signal' || detailNotice.signal_type === 'trade'">
              <div v-if="detailNotice.payload.symbol" class="extra-item">
                <span class="label">{{ $t('notice.symbol') }}:</span>
                <span class="value">{{ detailNotice.payload.symbol }}</span>
              </div>
              <div v-if="detailNotice.payload.action" class="extra-item">
                <span class="label">{{ $t('notice.action') }}:</span>
                <a-tag :color="detailNotice.payload.action === 'BUY' ? 'green' : 'red'">
                  {{ detailNotice.payload.action }}
                </a-tag>
              </div>
              <div v-if="detailNotice.payload.quantity" class="extra-item">
                <span class="label">{{ $t('notice.quantity') }}:</span>
                <span class="value">{{ detailNotice.payload.quantity }}</span>
              </div>
            </template>
          </div>
        </template>

        <div v-if="!isHtmlReport" class="notice-detail-actions">
          <a-button v-if="detailNotice.payload && detailNotice.payload.monitor_id" type="primary" @click="goToPortfolio">
            <a-icon type="fund" />
            {{ $t('notice.viewPortfolio') }}
          </a-button>
          <a-button @click="detailVisible = false">
            {{ $t('notice.close') }}
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { getStrategyNotifications, getUnreadNotificationCount } from '@/api/strategy'
import request from '@/utils/request'
import {
  noticeTitle,
  noticePreview,
  noticeMessageHtml,
  noticeTypeLabel
} from '@/utils/noticeFormat'
import { createVisibilityPolling } from '@/utils/visibilityPolling'

export default {
  name: 'HeaderNotice',
  components: {
    ProfessionalAnalysisReport: () => import('@/views/ai-analysis/components/ProfessionalAnalysisReport.vue')
  },
  data () {
    return {
      loading: false,
      visible: false,
      detailVisible: false,
      detailNotice: null,
      notifications: [],
      unreadTotal: 0,
      lastFetchId: 0,
      pollingTimer: null,
      noticePoller: null
    }
  },
  computed: {
    unreadCount () {
      return Number(this.unreadTotal || 0)
    },
    isHtmlReport () {
      if (!this.detailNotice) return false
      if (this.hasProfessionalReports) return true
      const html = this.displayMessageHtml(this.detailNotice)
      return html.includes('<div class="qd-report">') || html.includes('<style>')
    },
    professionalReports () {
      const payload = (this.detailNotice && this.detailNotice.payload) || {}
      if (Array.isArray(payload.professional_reports)) {
        return payload.professional_reports.filter(report => report && ['professional_report_v1', '1.0'].includes(report.schema_version))
      }
      const analyses = Array.isArray(payload.position_analyses) ? payload.position_analyses : []
      return analyses
        .map(item => item && item.professional_report)
        .filter(report => report && ['professional_report_v1', '1.0'].includes(report.schema_version))
    },
    hasProfessionalReports () {
      return this.professionalReports.length > 0
    },
    hasExtraDetail () {
      if (!this.detailNotice || this.isHtmlReport) return false
      const payload = this.detailNotice.payload || {}
      if (!Object.keys(payload).length) return false
      if (payload.display || payload.event === 'qd.indicator_signal' || payload.event === 'qd.signal' || payload.event === 'qd.profile_test') {
        return false
      }
      return ['ai_monitor', 'price_alert', 'signal', 'trade'].includes(this.detailNotice.signal_type)
    }
  },
  mounted () {
    this.fetchUnreadCount()
    this.startPolling()
  },
  beforeDestroy () {
    this.stopPolling()
  },
  methods: {
    startPolling () {
      this.stopPolling()
      this.noticePoller = createVisibilityPolling(() => {
        this.fetchUnreadCount(true)
        if (this.visible) {
          this.fetchNotifications(true)
        }
      }, 30000, { immediate: false })
      this.noticePoller.start()
    },
    stopPolling () {
      if (this.noticePoller) {
        this.noticePoller.stop()
        this.noticePoller = null
      }
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    },
    async fetchUnreadCount (silent = false) {
      try {
        const res = await getUnreadNotificationCount()
        if (res && res.code === 1 && res.data && typeof res.data.unread !== 'undefined') {
          this.unreadTotal = Number(res.data.unread || 0)
        }
      } catch (e) {
        if (!silent) {
          // Ignore: badge can be stale, list fetch will still work.
        }
      }
    },
    async fetchNotifications (silent = false) {
      if (!silent) {
        this.loading = true
      }
      try {
        const res = await getStrategyNotifications({ limit: 50 })
        if (res.code === 1 && res.data?.items) {
          this.notifications = res.data.items.map(item => {
            let payload = item.payload_json
            if (typeof payload === 'string') {
              try {
                payload = JSON.parse(payload)
              } catch (e) {
                payload = {}
              }
            }
            return {
              ...item,
              payload,
              is_read: item.is_read === 1 || item.is_read === true
            }
          })
          if (this.notifications.length > 0) {
            this.lastFetchId = Math.max(...this.notifications.map(n => n.id))
          }
        }
      } catch (e) {
        console.error('Failed to fetch notifications:', e)
      } finally {
        this.loading = false
      }
    },
    fetchNotice () {
      if (!this.visible) this.fetchNotifications()
      this.fetchUnreadCount(true)
    },
    handleVisibleChange (visible) {
      this.visible = visible
      if (visible) {
        this.fetchNotifications()
        this.fetchUnreadCount(true)
      }
    },
    getNoticePopupContainer () {
      return document.body
    },
    getNoticeIcon (signalType) {
      const iconMap = {
        ai_monitor: 'robot',
        price_alert: 'bell',
        signal: 'thunderbolt',
        indicator_signal: 'line-chart',
        buy: 'rise',
        sell: 'fall',
        hold: 'pause-circle',
        trade: 'swap',
        security_login: 'safety-certificate',
        profile_test: 'experiment'
      }
      return iconMap[signalType] || 'notification'
    },
    getNoticeColor (signalType) {
      const colorMap = {
        ai_monitor: '#722ed1',
        price_alert: '#faad14',
        signal: 'var(--primary-color, #1890ff)',
        indicator_signal: '#ff4d4f',
        buy: '#52c41a',
        sell: '#f5222d',
        hold: '#faad14',
        trade: '#13c2c2',
        security_login: '#fa541c',
        profile_test: '#2f54eb'
      }
      return colorMap[signalType] || 'var(--primary-color, #1890ff)'
    },
    displayTitle (item) {
      return noticeTitle(item, (key, params) => this.$t(key, params))
    },
    displayPreview (item) {
      return noticePreview(item, (key, params) => this.$t(key, params))
    },
    displayMessageHtml (item) {
      return noticeMessageHtml(item, (key, params) => this.$t(key, params))
    },
    displayTypeLabel (signalType) {
      return noticeTypeLabel(signalType, (key, params) => this.$t(key, params))
    },
    getDecisionColor (decision) {
      const colorMap = {
        BUY: 'green',
        SELL: 'red',
        HOLD: 'orange'
      }
      return colorMap[decision] || 'blue'
    },
    formatTime (timestamp) {
      if (!timestamp) return ''
      let date
      if (typeof timestamp === 'number') {
        date = new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp)
      } else if (typeof timestamp === 'string') {
        if (/^\d+$/.test(timestamp)) {
          const ts = parseInt(timestamp, 10)
          date = new Date(ts < 1e12 ? ts * 1000 : ts)
        } else {
          date = new Date(timestamp)
        }
      } else {
        return ''
      }

      if (isNaN(date.getTime())) {
        return ''
      }

      const now = new Date()
      const diff = now - date
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)

      if (minutes < 1) {
        return this.$t('notice.justNow')
      } else if (minutes < 60) {
        return `${minutes} ${this.$t('notice.minutesAgo')}`
      } else if (hours < 24) {
        return `${hours} ${this.$t('notice.hoursAgo')}`
      } else if (days < 7) {
        return `${days} ${this.$t('notice.daysAgo')}`
      } else {
        return date.toLocaleDateString()
      }
    },
    formatFullTime (timestamp) {
      if (!timestamp) return ''
      let date
      if (typeof timestamp === 'number') {
        date = new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp)
      } else if (typeof timestamp === 'string') {
        if (/^\d+$/.test(timestamp)) {
          const ts = parseInt(timestamp, 10)
          date = new Date(ts < 1e12 ? ts * 1000 : ts)
        } else {
          date = new Date(timestamp)
        }
      } else {
        return ''
      }

      if (isNaN(date.getTime())) {
        return ''
      }
      return date.toLocaleString()
    },
    handleNoticeClick (item) {
      this.markAsRead(item.id)
      this.detailNotice = item
      this.detailVisible = true
      this.visible = false
    },
    goToPortfolio () {
      this.detailVisible = false
      this.$router.push({ path: '/strategy-center' }).catch(() => {})
    },
    async markAsRead (id) {
      const item = this.notifications.find(n => n.id === id)
      if (item) {
        item.is_read = true
      }
      try {
        await request({
          url: '/api/strategies/notifications/read',
          method: 'post',
          data: { id }
        })
        this.fetchUnreadCount(true)
      } catch (e) {
      }
    },
    async markAllRead () {
      this.notifications.forEach(n => { n.is_read = true })
      try {
        await request({
          url: '/api/strategies/notifications/read-all',
          method: 'post'
        })
        this.fetchUnreadCount(true)
      } catch (e) {
      }
    },
    async clearNotifications () {
      this.notifications = []
      try {
        await request({
          url: '/api/strategies/notifications/clear',
          method: 'delete'
        })
        this.fetchUnreadCount(true)
      } catch (e) {
      }
      this.visible = false
    }
  }
}
</script>

<style lang="less" scoped>
@import '@/styles/antd-vars.less';

.notice-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  line-height: 36px;
  vertical-align: middle;
}

.header-notice {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 8px;
  line-height: 36px;
  transition: color 0.16s ease, background 0.16s ease;
  cursor: pointer;
  vertical-align: middle;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  span {
    vertical-align: initial;
  }

  .ant-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .header-notice-icon {
    display: block;
    padding: 0;
    font-size: 16px;
    line-height: 1;
  }
}

@media (max-width: 768px) {
  .header-notice {
    width: 36px;
  }
}

.notice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;

  .notice-title {
    font-weight: 500;
    font-size: 14px;
  }

  .notice-action {
    font-size: 12px;
    color: var(--primary-color, #1890ff);
    cursor: pointer;

    &:hover {
      color: var(--primary-color-hover, #40a9ff);
    }
  }
}

.notice-list {
  max-height: 400px;
  overflow-y: auto;
}

.notice-item {
  display: flex;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.3s;

  &:hover {
    background: #f5f5f5;
  }

  &.unread {
    background: color-mix(in srgb, var(--primary-color, #1890ff) 7%, transparent);
    box-shadow: inset 2px 0 0 color-mix(in srgb, var(--primary-color, #1890ff) 76%, transparent);

    &:hover {
      background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent);
    }
  }

  .notice-item-icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    border-radius: 50%;
    margin-right: 12px;
    font-size: 16px;
  }

  .notice-item-content {
    flex: 1;
    min-width: 0;

    .notice-item-title {
      font-weight: 500;
      font-size: 13px;
      color: rgba(0, 0, 0, 0.85);
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notice-item-desc {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
      line-height: 1.5;
      margin-bottom: 4px;
    }

    .notice-item-time {
      font-size: 11px;
      color: rgba(0, 0, 0, 0.25);
    }
  }
}

.notice-empty {
  padding: 48px 0;
}

.notice-footer {
  text-align: center;
  padding: 12px;
  border-top: 1px solid #f0f0f0;

  a {
    color: var(--primary-color, #1890ff);
    cursor: pointer;

    &:hover {
      color: var(--primary-color-hover, #40a9ff);
    }
  }
}

.notice-detail {
  .notice-detail-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .notice-detail-type {
      display: flex;
      align-items: center;
      gap: 8px;

      .type-label {
        font-size: 14px;
        color: rgba(0, 0, 0, 0.65);
      }
    }

    .notice-detail-time {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .notice-detail-content {
    .message-body {
      font-size: 14px;
      line-height: 1.8;
      color: rgba(0, 0, 0, 0.85);
      max-height: 300px;
      overflow-y: auto;
      padding: 8px 0;

      h2, h3, h4 {
        margin: 12px 0 8px;
        font-weight: 600;
      }

      h2 { font-size: 18px; }
      h3 { font-size: 16px; }
      h4 { font-size: 14px; }

      li {
        margin-left: 20px;
        list-style: disc;
      }

      strong {
        font-weight: 600;
      }
    }

    &.html-report {
      .message-body {
        max-height: calc(82vh - 120px);
        padding: 0;
        margin: 0;
        overflow-y: auto;
        background: var(--qd-report-shell-bg, #ffffff);
      }
    }
  }

  .notice-detail-extra {
    .extra-title {
      font-weight: 500;
      font-size: 14px;
      margin-bottom: 12px;
      color: rgba(0, 0, 0, 0.85);
    }

    .extra-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 8px;
      font-size: 13px;

      .label {
        flex-shrink: 0;
        color: rgba(0, 0, 0, 0.45);
        margin-right: 8px;
      }

      .value {
        color: rgba(0, 0, 0, 0.85);
        word-break: break-word;
      }

      &.decision {
        align-items: center;

        .confidence {
          margin-left: 8px;
          color: rgba(0, 0, 0, 0.45);
          font-size: 12px;
        }
      }
    }
  }

  .notice-detail-actions {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}
</style>

<style lang="less">
.header-notice-wrapper {
  z-index: 2500;

  .ant-popover-inner-content {
    padding: 0;
  }
}

.notice-detail-modal {
  .ant-modal {
    max-width: calc(100vw - 32px);
  }

  .ant-modal-content {
    overflow: hidden;
    border-radius: 8px;
    box-shadow: 0 22px 70px rgba(0, 0, 0, 0.46);
  }

  .ant-modal-header {
    border-bottom: 1px solid #edf0f5;
    padding: 17px 24px 14px;

    .ant-modal-title {
      font-size: 16px;
      font-weight: 700;
    }
  }

  .ant-modal-body {
    padding: 18px 24px 20px;
  }

  &.html-report-modal {
    .ant-modal-body {
      padding: 0;
    }

    .notice-detail-meta {
      margin: 12px 12px 0;
    }

    .ant-divider {
      margin: 12px 0 0;
    }
  }
}

.notice-detail-modal {
  --qd-report-shell-bg: #ffffff;
  --qd-report-bg: #ffffff;
  --qd-report-surface: #f8fafc;
  --qd-report-subtle: #f1f5f9;
  --qd-report-border: #e7ebf3;
  --qd-report-strong-border: #dbe2ec;
  --qd-report-text: #111827;
  --qd-report-muted: #64748b;
  --qd-report-soft-text: #334155;
  --qd-report-header-bg: linear-gradient(135deg, #ffffff 0%, #f6f8fb 100%);
  --qd-report-panel-bg: #ffffff;
  --qd-report-buy-bg: linear-gradient(180deg, rgba(34, 197, 94, 0.13), #ffffff 74%);
  --qd-report-sell-bg: linear-gradient(180deg, rgba(239, 68, 68, 0.13), #ffffff 74%);
  --qd-report-hold-bg: linear-gradient(180deg, rgba(234, 179, 8, 0.16), #ffffff 74%);
  --qd-report-focus-bg: rgba(239, 68, 68, 0.07);
  --qd-report-focus-text: #991b1b;
  --qd-report-error-bg: rgba(239, 68, 68, 0.08);
  --qd-report-error-text: #b91c1c;
}

.notice-detail-modal .notice-detail {
  .notice-detail-meta {
    padding: 8px 10px;
    border: 1px solid #edf0f5;
    border-radius: 8px;
    background: linear-gradient(180deg, #fbfcff 0%, #f6f8fb 100%);
  }

  .notice-detail-actions {
    .ant-btn {
      min-width: 84px;
      height: 34px;
      border-radius: 6px;
      font-weight: 600;
    }
  }
}

.notice-detail-modal .qd-report {
  box-sizing: border-box;
  max-width: 860px;
  margin: 0 auto;
  padding: 16px;
  border: 1px solid var(--qd-report-border);
  border-radius: 8px;
  background: var(--qd-report-bg);
  color: var(--qd-report-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.notice-detail-modal .professional-report-list {
  display: grid;
  gap: 14px;
  padding: 12px;
  background: var(--qd-report-shell-bg);
}

.notice-detail-modal .qd-report * {
  box-sizing: border-box;
}

.notice-detail-modal .qd-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  border: 1px solid var(--qd-report-border);
  border-radius: 8px;
  background: var(--qd-report-header-bg);
}

.notice-detail-modal .qd-header-main {
  min-width: 0;
}

.notice-detail-modal .qd-kicker {
  color: #ef4444;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.notice-detail-modal .qd-header h1 {
  margin: 6px 0 8px;
  color: var(--qd-report-text);
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
}

.notice-detail-modal .qd-header .subtitle {
  color: var(--qd-report-muted);
  font-size: 13px;
  line-height: 1.5;
}

.notice-detail-modal .qd-header-panel {
  flex: 0 0 auto;
  min-width: 172px;
  padding: 12px 14px;
  border: 1px solid var(--qd-report-border);
  border-radius: 8px;
  background: var(--qd-report-panel-bg);
  text-align: right;
}

.notice-detail-modal .qd-header-panel .label,
.notice-detail-modal .qd-stat-card .label,
.notice-detail-modal .qd-rec-card .label,
.notice-detail-modal .qd-pos-symbol .market,
.notice-detail-modal .qd-pos-decision .confidence,
.notice-detail-modal .qd-pos-stats .stat .label {
  color: var(--qd-report-muted);
  font-size: 12px;
}

.notice-detail-modal .qd-header-panel .value {
  display: block;
  margin-top: 4px;
  color: var(--qd-report-text);
  font-size: 18px;
  font-weight: 800;
}

.notice-detail-modal .qd-content {
  display: grid;
  gap: 12px;
  margin-top: 12px;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.notice-detail-modal .qd-section {
  margin: 0;
  padding: 16px;
  border: 1px solid var(--qd-report-border);
  border-radius: 8px;
  background: var(--qd-report-surface);
}

.notice-detail-modal .qd-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--qd-report-border);
  color: var(--qd-report-text);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.3;
}

.notice-detail-modal .qd-section-title:before {
  content: "";
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: #ef4444;
}

.notice-detail-modal .qd-overview-grid,
.notice-detail-modal .qd-pos-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.notice-detail-modal .qd-overview-grid {
  gap: 10px;
}

.notice-detail-modal .qd-stat-card {
  min-height: 78px;
  padding: 12px;
  border: 1px solid var(--qd-report-border);
  border-radius: 8px;
  background: var(--qd-report-panel-bg);
  text-align: left;
}

.notice-detail-modal .qd-stat-card .value {
  color: var(--qd-report-text);
  font-size: 19px;
  font-weight: 800;
  line-height: 1.2;
  word-break: break-word;
}

.notice-detail-modal .qd-stat-card .percent {
  display: block;
  margin: 3px 0 0;
  font-size: 12px;
  font-weight: 700;
}

.notice-detail-modal .qd-rec-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.notice-detail-modal .qd-rec-card {
  position: relative;
  min-height: 100px;
  padding: 14px;
  border: 1px solid var(--qd-report-border);
  border-radius: 8px;
  background: var(--qd-report-panel-bg);
  overflow: hidden;
  text-align: left;
}

.notice-detail-modal .qd-rec-card:before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: #64748b;
}

.notice-detail-modal .qd-rec-card.buy {
  background: var(--qd-report-buy-bg);
}

.notice-detail-modal .qd-rec-card.sell {
  background: var(--qd-report-sell-bg);
}

.notice-detail-modal .qd-rec-card.hold {
  background: var(--qd-report-hold-bg);
}

.notice-detail-modal .qd-rec-card.buy:before {
  background: #22c55e;
}

.notice-detail-modal .qd-rec-card.sell:before {
  background: #ef4444;
}

.notice-detail-modal .qd-rec-card.hold:before {
  background: #eab308;
}

.notice-detail-modal .qd-rec-card .emoji {
  color: var(--qd-report-soft-text);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.notice-detail-modal .qd-rec-card .count {
  margin-top: 10px;
  color: var(--qd-report-text);
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}

.notice-detail-modal .qd-position {
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid var(--qd-report-border);
  border-radius: 8px;
  background: var(--qd-report-panel-bg);
}

.notice-detail-modal .qd-position:last-child {
  margin-bottom: 0;
}

.notice-detail-modal .qd-pos-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: var(--qd-report-surface);
  cursor: default;
}

.notice-detail-modal .qd-pos-symbol {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notice-detail-modal .qd-pos-symbol .icon {
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
}

.notice-detail-modal .qd-pos-symbol .icon.buy {
  background: #16a34a;
}

.notice-detail-modal .qd-pos-symbol .icon.sell {
  background: #dc2626;
}

.notice-detail-modal .qd-pos-symbol .icon.hold {
  background: #d97706;
}

.notice-detail-modal .qd-pos-symbol .name {
  color: var(--qd-report-text);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.3;
}

.notice-detail-modal .qd-pos-decision {
  text-align: right;
}

.notice-detail-modal .qd-pos-decision .decision-tag {
  display: inline-block;
  min-width: 64px;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.notice-detail-modal .qd-pos-decision .decision-tag.buy {
  border: 1px solid rgba(34, 197, 94, 0.28);
  background: rgba(34, 197, 94, 0.14);
  color: #22c55e;
}

.notice-detail-modal .qd-pos-decision .decision-tag.sell {
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.14);
  color: #f87171;
}

.notice-detail-modal .qd-pos-decision .decision-tag.hold {
  border: 1px solid rgba(234, 179, 8, 0.3);
  background: rgba(234, 179, 8, 0.14);
  color: #facc15;
}

.notice-detail-modal .qd-pos-stats {
  gap: 1px;
  background: var(--qd-report-strong-border);
}

.notice-detail-modal .qd-pos-stats .stat {
  min-width: 0;
  padding: 11px 12px;
  background: var(--qd-report-panel-bg);
  text-align: left;
}

.notice-detail-modal .qd-pos-stats .stat .value {
  color: var(--qd-report-text);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
  word-break: break-word;
}

.notice-detail-modal .qd-header-panel .value.positive,
.notice-detail-modal .qd-stat-card .value.positive,
.notice-detail-modal .qd-pos-stats .stat .value.positive,
.notice-detail-modal .qd-rec-card.buy .count {
  color: #22c55e;
}

.notice-detail-modal .qd-header-panel .value.negative,
.notice-detail-modal .qd-stat-card .value.negative,
.notice-detail-modal .qd-pos-stats .stat .value.negative,
.notice-detail-modal .qd-rec-card.sell .count {
  color: #ef4444;
}

.notice-detail-modal .qd-rec-card.hold .count {
  color: #eab308;
}

.notice-detail-modal .qd-pos-reasoning {
  padding: 14px 16px;
  border-top: 1px solid var(--qd-report-border);
  background: var(--qd-report-surface);
}

.notice-detail-modal .qd-pos-reasoning .label {
  margin-bottom: 6px;
  color: var(--qd-report-text);
  font-size: 12px;
  font-weight: 800;
}

.notice-detail-modal .qd-pos-reasoning .text {
  color: var(--qd-report-soft-text);
  font-size: 13px;
  line-height: 1.7;
}

.notice-detail-modal .qd-collapsible {
  border-top: 1px solid var(--qd-report-border);
}

.notice-detail-modal .qd-collapsible input[type="checkbox"] {
  display: none;
}

.notice-detail-modal .qd-collapsible-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 16px;
  background: var(--qd-report-subtle);
  cursor: pointer;
  user-select: none;
}

.notice-detail-modal .qd-collapsible-header:hover {
  background: var(--qd-report-surface);
}

.notice-detail-modal .qd-collapsible-header .title {
  color: var(--qd-report-text);
  font-size: 13px;
  font-weight: 800;
}

.notice-detail-modal .qd-collapsible-header .arrow {
  display: inline-block;
  color: var(--qd-report-muted);
  transition: transform 0.2s;
}

.notice-detail-modal .qd-collapsible-content {
  display: none;
  padding: 14px 16px;
  border-top: 1px solid var(--qd-report-border);
  background: var(--qd-report-panel-bg);
  color: var(--qd-report-soft-text);
  font-size: 13px;
  line-height: 1.7;
}

.notice-detail-modal .qd-collapsible input[type="checkbox"]:checked ~ .qd-collapsible-content {
  display: block;
}

.notice-detail-modal .qd-collapsible input[type="checkbox"]:checked + .qd-collapsible-header .arrow {
  transform: rotate(180deg);
}

.notice-detail-modal .qd-user-focus {
  padding: 14px;
  border: 1px solid rgba(239, 68, 68, 0.24);
  border-radius: 8px;
  background: var(--qd-report-focus-bg);
  color: var(--qd-report-focus-text);
  font-size: 13px;
  line-height: 1.7;
}

.notice-detail-modal .qd-footer {
  margin-top: 12px;
  padding: 14px 4px 2px;
  border-top: 1px solid var(--qd-report-border);
  color: var(--qd-report-muted);
  font-size: 12px;
  text-align: center;
}

.notice-detail-modal .qd-error {
  margin: 14px 16px;
  padding: 12px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  background: var(--qd-report-error-bg);
  color: var(--qd-report-error-text);
  font-size: 13px;
}

.notice-detail-modal .qd-notice-card {
  --qd-card-accent: var(--primary-color, #1890ff);
  overflow: hidden;
  border: 1px solid #e7ebf3;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.08);
}

.notice-detail-modal .qd-notice-card--buy {
  --qd-card-accent: #16a34a;
}

.notice-detail-modal .qd-notice-card--sell {
  --qd-card-accent: #ef4444;
}

.notice-detail-modal .qd-notice-card--watch {
  --qd-card-accent: #f59e0b;
}

.notice-detail-modal .qd-notice-card__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid #edf0f5;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--qd-card-accent) 14%, transparent), transparent 58%),
    linear-gradient(180deg, #fbfcff 0%, #f5f7fb 100%);
}

.notice-detail-modal .qd-notice-card__kicker {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  text-transform: uppercase;
}

.notice-detail-modal .qd-notice-card__title {
  margin-top: 4px;
  color: #111827;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.25;
  word-break: break-word;
}

.notice-detail-modal .qd-notice-card__chip {
  flex: 0 0 auto;
  max-width: 220px;
  padding: 7px 11px;
  border: 1px solid color-mix(in srgb, var(--qd-card-accent) 42%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--qd-card-accent) 12%, #ffffff);
  color: var(--qd-card-accent);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  word-break: break-word;
}

.notice-detail-modal .qd-notice-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: #edf0f5;
}

.notice-detail-modal .qd-notice-card--signal .qd-notice-card__grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.notice-detail-modal .qd-notice-card__metric {
  min-height: 76px;
  padding: 13px 16px;
  background: #ffffff;
}

.notice-detail-modal .qd-notice-card__metric span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.notice-detail-modal .qd-notice-card__metric strong {
  display: block;
  margin-top: 7px;
  color: #111827;
  font-size: 15px;
  font-weight: 750;
  line-height: 1.35;
  word-break: break-word;
}

.notice-detail-modal .qd-notice-card__metric.is-price strong {
  color: var(--qd-card-accent);
  font-size: 18px;
}

.notice-detail-modal .qd-notice-card__note {
  margin: 0;
  padding: 13px 16px;
  border-top: 1px solid #edf0f5;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .notice-detail-modal .qd-report {
    padding: 10px;
    border-radius: 0;
  }

  .notice-detail-modal .qd-header {
    display: block;
    padding: 16px;
  }

  .notice-detail-modal .qd-header-panel {
    margin-top: 12px;
    text-align: left;
  }

  .notice-detail-modal .qd-overview-grid,
  .notice-detail-modal .qd-pos-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .notice-detail-modal .qd-pos-header {
    align-items: flex-start;
  }

  .notice-detail-modal .qd-notice-card__hero {
    flex-direction: column;
  }

  .notice-detail-modal .qd-notice-card__chip {
    max-width: 100%;
  }

  .notice-detail-modal .qd-notice-card__grid,
  .notice-detail-modal .qd-notice-card--signal .qd-notice-card__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

body.dark,
body.realdark,
.ant-layout.dark,
.ant-layout.realdark {
  .header-notice-wrapper {
    .ant-popover-inner {
      background: #1f1f1f;
    }

    .ant-popover-arrow {
      border-color: #1f1f1f;
    }

    .notice-header {
      border-color: #303030;

      .notice-title {
        color: rgba(255, 255, 255, 0.85);
      }
    }

    .notice-item {
      &:hover {
        background: #303030;
      }

      &.unread {
        background: color-mix(in srgb, var(--primary-color, #1890ff) 10%, transparent);
        box-shadow: inset 2px 0 0 color-mix(in srgb, var(--primary-color, #1890ff) 68%, transparent);

        &:hover {
          background: color-mix(in srgb, var(--primary-color, #1890ff) 15%, transparent);
        }
      }

      .notice-item-icon {
        background: #303030;
      }

      .notice-item-content {
        .notice-item-title {
          color: rgba(255, 255, 255, 0.85);
        }

        .notice-item-desc {
          color: rgba(255, 255, 255, 0.45);
        }

        .notice-item-time {
          color: rgba(255, 255, 255, 0.25);
        }
      }
    }

    .notice-footer {
      border-color: #303030;
    }

    .ant-empty-description {
      color: rgba(255, 255, 255, 0.45);
    }
  }

  .notice-detail-modal {
    --qd-report-shell-bg: #171717;
    --qd-report-bg: #171717;
    --qd-report-surface: #202020;
    --qd-report-subtle: #1c1c1c;
    --qd-report-border: #343434;
    --qd-report-strong-border: #404040;
    --qd-report-text: #f5f5f5;
    --qd-report-muted: #a3a3a3;
    --qd-report-soft-text: #d4d4d4;
    --qd-report-header-bg: linear-gradient(135deg, #262626 0%, #1c1c1c 100%);
    --qd-report-panel-bg: #242424;
    --qd-report-buy-bg: linear-gradient(180deg, rgba(34, 197, 94, 0.12), #242424 70%);
    --qd-report-sell-bg: linear-gradient(180deg, rgba(239, 68, 68, 0.13), #242424 70%);
    --qd-report-hold-bg: linear-gradient(180deg, rgba(234, 179, 8, 0.13), #242424 70%);
    --qd-report-focus-bg: rgba(239, 68, 68, 0.08);
    --qd-report-focus-text: #fecaca;
    --qd-report-error-bg: rgba(239, 68, 68, 0.12);
    --qd-report-error-text: #fecaca;

    .ant-modal-content {
      background: #171717;
      border: 1px solid rgba(255, 77, 79, 0.38);
      box-shadow: 0 26px 80px rgba(0, 0, 0, 0.62), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
    }

    .ant-modal-header {
      background: linear-gradient(180deg, #202020 0%, #171717 100%);
      border-color: rgba(255, 255, 255, 0.08);

      .ant-modal-title {
        color: rgba(255, 255, 255, 0.92);
      }
    }

    .ant-modal-close-x {
      color: rgba(255, 255, 255, 0.45);
    }

    .ant-divider {
      border-color: #303030;
    }

    .notice-detail {
      .notice-detail-meta {
        border-color: rgba(255, 255, 255, 0.08);
        background: linear-gradient(180deg, #202020 0%, #181818 100%);

        .notice-detail-type .type-label {
          color: rgba(255, 255, 255, 0.65);
        }

        .notice-detail-time {
          color: rgba(255, 255, 255, 0.45);
        }
      }

      .notice-detail-content .message-body {
        color: rgba(255, 255, 255, 0.85);
      }

      .notice-detail-extra {
        .extra-title {
          color: rgba(255, 255, 255, 0.85);
        }

        .extra-item {
          .label {
            color: rgba(255, 255, 255, 0.45);
          }

          .value {
            color: rgba(255, 255, 255, 0.85);
          }

          .confidence {
            color: rgba(255, 255, 255, 0.45);
          }
        }
      }
    }

    .qd-notice-card {
      border-color: rgba(255, 255, 255, 0.08);
      background: #171717;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.34);
    }

    .qd-notice-card__hero {
      border-color: rgba(255, 255, 255, 0.08);
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--qd-card-accent) 22%, transparent), transparent 58%),
        linear-gradient(180deg, #242424 0%, #181818 100%);
    }

    .qd-notice-card__kicker,
    .qd-notice-card__metric span,
    .qd-notice-card__note {
      color: rgba(255, 255, 255, 0.58);
    }

    .qd-notice-card__title,
    .qd-notice-card__metric strong {
      color: rgba(255, 255, 255, 0.92);
    }

    .qd-notice-card__chip {
      background: color-mix(in srgb, var(--qd-card-accent) 18%, #171717);
      border-color: color-mix(in srgb, var(--qd-card-accent) 52%, transparent);
      color: color-mix(in srgb, var(--qd-card-accent) 82%, #ffffff);
    }

    .qd-notice-card__grid {
      background: rgba(255, 255, 255, 0.07);
    }

    .qd-notice-card__metric {
      background: #1c1c1c;
    }

    .qd-notice-card__note {
      border-color: rgba(255, 255, 255, 0.08);
      background: #151515;
    }
  }
}
</style>
