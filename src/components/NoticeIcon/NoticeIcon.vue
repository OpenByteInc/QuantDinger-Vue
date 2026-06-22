<template>
  <div class="notice-icon-wrapper">
    <a-popover
      v-model="visible"
      trigger="click"
      placement="bottomRight"
      overlayClassName="header-notice-wrapper"
      :getPopupContainer="() => $refs.noticeRef.parentElement"
      :autoAdjustOverflow="true"
      :arrowPointAtCenter="true"
      :overlayStyle="{ width: '380px', top: '50px' }"
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
          <a-icon style="font-size: 16px; padding: 4px" type="bell" />
        </a-badge>
      </span>
    </a-popover>

    <a-modal
      v-model="detailVisible"
      :title="detailNotice ? displayTitle(detailNotice) : ''"
      :footer="null"
      :width="isHtmlReport ? 900 : 600"
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
          <div v-html="displayMessageHtml(detailNotice)" class="message-body"></div>
        </div>

        <template v-if="!isHtmlReport && detailNotice.payload && Object.keys(detailNotice.payload).length > 0">
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

        <div class="notice-detail-actions">
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

export default {
  name: 'HeaderNotice',
  data () {
    return {
      loading: false,
      visible: false,
      detailVisible: false,
      detailNotice: null,
      notifications: [],
      unreadTotal: 0,
      lastFetchId: 0,
      pollingTimer: null
    }
  },
  computed: {
    unreadCount () {
      return Number(this.unreadTotal || 0)
    },
    isHtmlReport () {
      if (!this.detailNotice) return false
      const html = this.displayMessageHtml(this.detailNotice)
      return html.includes('<div class="qd-report">') || html.includes('<style>')
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
      this.pollingTimer = setInterval(() => {
        this.fetchUnreadCount(true)
        // If popover is open, keep the list fresh too.
        if (this.visible) {
          this.fetchNotifications(true)
        }
      }, 30000)
    },
    stopPolling () {
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
      if (!this.visible) {
        this.fetchNotifications()
        this.fetchUnreadCount(true)
      }
      this.visible = !this.visible
    },
    getNoticeIcon (signalType) {
      const iconMap = {
        'ai_monitor': 'robot',
        'price_alert': 'bell',
        'signal': 'thunderbolt',
        'buy': 'rise',
        'sell': 'fall',
        'hold': 'pause-circle',
        'trade': 'swap',
        'security_login': 'safety-certificate',
        'profile_test': 'experiment'
      }
      return iconMap[signalType] || 'notification'
    },
    getNoticeColor (signalType) {
      const colorMap = {
        'ai_monitor': '#722ed1',
        'price_alert': '#faad14',
        'signal': '#1890ff',
        'buy': '#52c41a',
        'sell': '#f5222d',
        'hold': '#faad14',
        'trade': '#13c2c2',
        'security_login': '#fa541c',
        'profile_test': '#2f54eb'
      }
      return colorMap[signalType] || '#1890ff'
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
        'BUY': 'green',
        'SELL': 'red',
        'HOLD': 'orange'
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
      this.$router.push({ path: '/portfolio' }).catch(() => {})
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
  display: inline-block;
  vertical-align: top;
}

.header-notice {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: @layout-header-height;
  line-height: @layout-header-height;
  transition: all 0.3s;
  cursor: pointer;
  padding: 0 12px;
  vertical-align: top;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  span {
    vertical-align: initial;
  }
}

@media (max-width: 768px) {
  .header-notice {
    padding: 0 8px;
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
    color: #1890ff;
    cursor: pointer;

    &:hover {
      color: #40a9ff;
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
    background: #e6f7ff;

    &:hover {
      background: #bae7ff;
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
    color: #1890ff;
    cursor: pointer;

    &:hover {
      color: #40a9ff;
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
        max-height: 70vh;
        padding: 0;
        margin: -16px -24px;
        overflow-y: auto;
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
  top: 50px !important;

  .ant-popover-inner-content {
    padding: 0;
  }
}

.notice-detail-modal {
  .ant-modal-header {
    border-bottom: 1px solid #f0f0f0;
  }

  .ant-modal-body {
    padding: 16px 24px;
  }

  &.html-report-modal {
    .ant-modal-body {
      padding: 0;
    }
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
        background: rgba(24, 144, 255, 0.15);

        &:hover {
          background: rgba(24, 144, 255, 0.25);
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
    .ant-modal-content {
      background: #1f1f1f;
    }

    .ant-modal-header {
      background: #1f1f1f;
      border-color: #303030;

      .ant-modal-title {
        color: rgba(255, 255, 255, 0.85);
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
  }
}
</style>

