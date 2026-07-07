<template>
  <div class="profile-page" :class="{ 'theme-dark': isDarkTheme }">
    <div class="page-header">
      <h2 class="page-title">
        <a-icon type="user" />
        <span>{{ $t('profile.title') || 'My Profile' }}</span>
      </h2>
      <p class="page-desc">{{ $t('profile.description') || 'Manage your account settings and preferences' }}</p>
    </div>

    <a-row :gutter="24" class="profile-cards-row">
      <!-- Left Column: Profile Card -->
      <a-col :xs="24" :md="8" class="profile-card-col">
        <a-card :bordered="false" class="profile-card">
          <div class="avatar-section">
            <a-avatar :size="100" :src="profile.avatar || '/avatar2.jpg'" />
            <h3 class="username">{{ profile.nickname || profile.username }}</h3>
            <p class="user-role">
              <a-tag :color="getRoleColor(profile.role)">
                {{ getRoleLabel(profile.role) }}
              </a-tag>
              <a-tag v-if="isVip" color="gold">
                <a-icon type="crown" />
                VIP
              </a-tag>
            </p>
          </div>
          <a-divider />
          <div class="profile-info">
            <div class="info-item">
              <a-icon type="user" />
              <span class="label">{{ $t('profile.username') || 'Username' }}:</span>
              <span class="value">{{ profile.username }}</span>
            </div>
            <div class="info-item">
              <a-icon type="mail" />
              <span class="label">{{ $t('profile.email') || 'Email' }}:</span>
              <span class="value">{{ profile.email || '-' }}</span>
            </div>
            <div class="info-item">
              <a-icon type="calendar" />
              <span class="label">{{ $t('profile.lastLogin') || 'Last Login' }}:</span>
              <span class="value">{{ formatTime(profile.last_login_at) || '-' }}</span>
            </div>
          </div>
        </a-card>
      </a-col>

      <!-- Right Column: Credits and Referral Cards -->
      <a-col :xs="24" :md="16" class="right-cards-col">
        <a-row :gutter="16" class="right-cards-row">
          <a-col :xs="24" :md="12">
            <a-card :bordered="false" class="credits-card">
              <div class="credits-header">
                <h3 class="credits-title">
                  <a-icon type="wallet" />
                  {{ $t('profile.credits.title') || '我的积分' }}
                </h3>
              </div>
              <div class="credits-body">
                <div class="credits-amount">
                  <span class="amount-value">{{ formatCredits(billing.credits) }}</span>
                  <span class="amount-label">{{ $t('profile.credits.unit') || '积分' }}</span>
                </div>
                <div class="vip-status" v-if="billing.vip_expires_at">
                  <a-icon type="crown" :style="{ color: isVip ? '#faad14' : '#999' }" />
                  <span v-if="isVip" class="vip-active">
                    {{ $t('profile.credits.vipExpires') || 'VIP有效期至' }}: {{ formatDate(billing.vip_expires_at) }}
                  </span>
                  <span v-else class="vip-expired">
                    {{ $t('profile.credits.vipExpired') || 'VIP已过期' }}
                  </span>
                </div>
                <div class="vip-status" v-else-if="!billing.is_vip">
                  <span class="no-vip">{{ $t('profile.credits.noVip') || '非VIP用户' }}</span>
                </div>
              </div>
              <a-divider />
              <div class="credits-actions">
                <a-button class="credits-recharge-btn" icon="shopping" @click="handleRecharge">
                  {{ $t('profile.credits.recharge') || '开通/充值' }}
                </a-button>
              </div>
              <div class="credits-hint" v-if="billing.billing_enabled">
                <a-icon type="info-circle" />
                <span>{{ $t('profile.credits.hint') || '使用AI分析/回测/监控等功能会消耗积分；VIP仅可免费使用VIP免费指标。' }}</span>
              </div>
            </a-card>
          </a-col>

          <a-col :xs="24" :md="12">
            <a-card :bordered="false" class="referral-card">
              <div class="referral-header">
                <h3 class="referral-title">
                  <a-icon type="team" />
                  {{ $t('profile.referral.title') || '邀请好友' }}
                </h3>
              </div>
              <div class="referral-body">
                <div class="referral-stats">
                  <div class="stat-item">
                    <span class="stat-value">{{ referralData.total || 0 }}</span>
                    <span class="stat-label">{{ $t('profile.referral.totalInvited') || '已邀请' }}</span>
                  </div>
                  <div class="stat-item" v-if="referralData.referral_bonus > 0">
                    <span class="stat-value">+{{ referralData.referral_bonus }}</span>
                    <span class="stat-label">{{ $t('profile.referral.bonusPerInvite') || '每邀请获得' }}</span>
                  </div>
                </div>
                <a-divider style="margin: 12px 0" />
                <div class="referral-link-section">
                  <div class="link-label">{{ $t('profile.referral.yourLink') || '您的邀请链接' }}</div>
                  <div class="link-box">
                    <a-input
                      :value="referralLink"
                      readonly
                      size="small"
                    >
                      <a-tooltip slot="suffix" :title="$t('profile.referral.copyLink') || '复制链接'">
                        <a-icon type="copy" style="cursor: pointer" @click="copyReferralLink" />
                      </a-tooltip>
                    </a-input>
                  </div>
                </div>
                <div class="referral-hint" v-if="referralData.register_bonus > 0">
                  <a-icon type="gift" />
                  <span>{{ $t('profile.referral.newUserBonus') || '新用户注册获得' }} {{ referralData.register_bonus }} {{ $t('profile.credits.unit') || '积分' }}</span>
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </a-col>
    </a-row>

    <!-- Edit Profile Tabs (Below Cards) -->
    <a-row :gutter="24" style="margin-top: 24px">
      <a-col :xs="24">
        <a-card :bordered="false" class="edit-card">
          <a-tabs v-model="activeTab">
            <!-- Basic Info Tab -->
            <a-tab-pane key="basic" :tab="$t('profile.basicInfo') || 'Basic Info'">
              <a-form :form="profileForm" layout="vertical" class="profile-form">
                <a-form-item :label="$t('profile.nickname') || 'Nickname'">
                  <a-input
                    v-decorator="['nickname', { initialValue: profile.nickname }]"
                    :placeholder="$t('profile.nicknamePlaceholder') || 'Enter your nickname'"
                  >
                    <a-icon slot="prefix" type="smile" />
                  </a-input>
                </a-form-item>

                <a-form-item :label="$t('profile.email') || 'Email'">
                  <a-input
                    :value="profile.email || '-'"
                    disabled
                  >
                    <a-icon slot="prefix" type="mail" />
                    <a-tooltip slot="suffix" :title="$t('profile.emailCannotChange') || 'Email cannot be changed after registration'">
                      <a-icon type="info-circle" style="color: rgba(0,0,0,.45)" />
                    </a-tooltip>
                  </a-input>
                </a-form-item>

                <a-form-item :label="$t('profile.timezone') || '时区'">
                  <a-select
                    v-decorator="['timezone', { initialValue: profile.timezone || '' }]"
                    :placeholder="$t('profile.timezonePlaceholder') || '跟随浏览器/系统'"
                    show-search
                    allow-clear
                    option-filter-prop="children"
                  >
                    <a-select-option value="">
                      {{ $t('profile.timezoneBrowser') || '跟随浏览器' }}
                    </a-select-option>
                    <a-select-option v-for="z in timezoneIanaList" :key="z" :value="z">
                      {{ z }}
                    </a-select-option>
                  </a-select>
                </a-form-item>

                <a-form-item>
                  <a-button type="primary" :loading="saving" @click="handleSaveProfile">
                    <a-icon type="save" />
                    {{ $t('common.save') || 'Save' }}
                  </a-button>
                </a-form-item>
              </a-form>
            </a-tab-pane>

            <!-- My Agent Token -->
            <a-tab-pane key="agentTokens" :tab="$t('profile.agentTokens.tab') || '我的 Agent Token'">
              <profile-agent-tokens :is-dark-theme="isDarkTheme" />
            </a-tab-pane>

            <!-- Change Password Tab -->
            <a-tab-pane key="password" :tab="$t('profile.changePassword') || 'Change Password'">
              <a-form :form="passwordForm" layout="vertical" class="password-form">
                <a-alert
                  :message="$t('profile.passwordHintNew') || 'For security, email verification is required to change password. Password must be at least 8 characters with uppercase, lowercase, and number.'"
                  type="info"
                  showIcon
                  style="margin-bottom: 24px"
                />

                <!-- Email Display & Verification Code -->
                <a-form-item :label="$t('profile.verificationCode') || 'Verification Code'">
                  <a-row :gutter="12">
                    <a-col :span="16">
                      <a-input
                        v-decorator="['code', {
                          rules: [{ required: true, message: $t('profile.codeRequired') || 'Please enter verification code' }]
                        }]"
                        :placeholder="$t('profile.codePlaceholder') || 'Enter verification code'"
                      >
                        <a-icon slot="prefix" type="safety-certificate" />
                      </a-input>
                    </a-col>
                    <a-col :span="8">
                      <a-button
                        block
                        :loading="sendingPwdCode"
                        :disabled="sendingPwdCode || pwdCodeCountdown > 0 || !profile.email"
                        @click="handleSendPwdCode"
                      >
                        {{ pwdCodeCountdown > 0 ? `${pwdCodeCountdown}s` : ($t('profile.sendCode') || 'Send Code') }}
                      </a-button>
                    </a-col>
                  </a-row>
                  <div class="email-hint" v-if="profile.email">
                    {{ $t('profile.codeWillSendTo') || 'Code will be sent to' }}: {{ profile.email }}
                  </div>
                  <div class="email-hint email-warning" v-else>
                    {{ $t('profile.noEmailWarning') || 'Please set your email first in Basic Info tab' }}
                  </div>
                </a-form-item>

                <a-form-item :label="$t('profile.newPassword') || 'New Password'">
                  <a-input-password
                    v-decorator="['new_password', {
                      rules: [
                        { required: true, message: $t('profile.newPasswordRequired') || 'Please enter new password' },
                        { validator: validateNewPassword }
                      ]
                    }]"
                    :placeholder="$t('profile.newPasswordPlaceholder') || 'Enter new password'"
                  >
                    <a-icon slot="prefix" type="lock" />
                  </a-input-password>
                </a-form-item>

                <a-form-item :label="$t('profile.confirmPassword') || 'Confirm Password'">
                  <a-input-password
                    v-decorator="['confirm_password', {
                      rules: [
                        { required: true, message: $t('profile.confirmPasswordRequired') || 'Please confirm password' },
                        { validator: validateConfirmPassword }
                      ]
                    }]"
                    :placeholder="$t('profile.confirmPasswordPlaceholder') || 'Confirm new password'"
                  >
                    <a-icon slot="prefix" type="lock" />
                  </a-input-password>
                </a-form-item>

                <a-form-item>
                  <a-button type="primary" :loading="changingPassword" @click="handleChangePassword" :disabled="!profile.email">
                    <a-icon type="key" />
                    {{ $t('profile.changePassword') || 'Change Password' }}
                  </a-button>
                </a-form-item>
              </a-form>
            </a-tab-pane>

            <a-tab-pane key="security" :tab="$t('profile.security.title')">
              <div class="security-section">
                <a-alert
                  v-if="!mfaStatus.system_enabled"
                  type="warning"
                  showIcon
                  :message="$t('profile.mfa.systemDisabled')"
                  style="margin-bottom: 16px"
                />
                <div class="mfa-card">
                  <div class="mfa-card-main">
                    <div class="mfa-icon">
                      <a-icon type="safety-certificate" />
                    </div>
                    <div class="mfa-copy">
                      <div class="mfa-title">
                        <span>{{ $t('profile.mfa.title') }}</span>
                        <a-tag :color="mfaStatus.enabled ? 'green' : 'default'" class="mfa-status-tag">
                          {{ mfaStatus.enabled ? $t('profile.mfa.enabled') : $t('profile.mfa.disabled') }}
                        </a-tag>
                      </div>
                      <div class="mfa-desc">
                        {{ $t('profile.mfa.desc') }}
                      </div>
                      <div v-if="mfaStatus.enabled && mfaStatus.confirmed_at" class="mfa-meta">
                        <a-icon type="clock-circle" />
                        {{ $t('profile.mfa.boundAt') }}: {{ formatTime(mfaStatus.confirmed_at) }}
                      </div>
                      <div class="mfa-feature-list">
                        <span><a-icon type="mobile" />{{ $t('profile.mfa.featureApp') }}</span>
                        <span><a-icon type="environment" />{{ $t('profile.mfa.featureRisk') }}</span>
                        <span><a-icon type="key" />{{ $t('profile.mfa.featureRecovery') }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="mfa-actions">
                    <a-button
                      v-if="!mfaStatus.enabled"
                      type="primary"
                      icon="qrcode"
                      :disabled="!mfaStatus.system_enabled"
                      :loading="mfaLoading"
                      @click="handleStartMfaSetup"
                    >
                      {{ $t('profile.mfa.enable') }}
                    </a-button>
                    <a-button
                      v-else
                      type="danger"
                      ghost
                      icon="stop"
                      :loading="mfaLoading"
                      @click="showDisableMfaModal = true"
                    >
                      {{ $t('profile.mfa.disable') }}
                    </a-button>
                  </div>
                </div>
              </div>
            </a-tab-pane>

            <a-tab-pane key="credits" :tab="$t('profile.creditsLog') || '消费记录'">
              <a-table
                :columns="creditsLogColumns"
                :dataSource="creditsLog"
                :loading="creditsLogLoading"
                :pagination="creditsLogPagination"
                :rowKey="record => record.id"
                size="small"
                @change="handleCreditsLogChange"
              >
                <!-- Action Column -->
                <template slot="action" slot-scope="text">
                  <a-tag :color="getActionColor(text)">
                    {{ getActionLabel(text) }}
                  </a-tag>
                </template>

                <!-- Amount Column -->
                <template slot="amount" slot-scope="text">
                  <span :class="text >= 0 ? 'amount-positive' : 'amount-negative'">
                    {{ text >= 0 ? '+' : '' }}{{ text }}
                  </span>
                </template>

                <!-- Time Column -->
                <template slot="created_at" slot-scope="text">
                  {{ formatCreditsLogTime(text) }}
                </template>
              </a-table>
            </a-tab-pane>

            <a-tab-pane key="notifications" :tab="$t('profile.notifications.title') || '通知设置'">
              <div class="notification-settings-form">
                <a-alert
                  :message="$t('profile.notifications.hint') || '配置您的默认通知方式，在创建资产监控和预警时将自动使用这些设置'"
                  type="info"
                  showIcon
                  style="margin-bottom: 24px"
                />

                <a-form :form="notificationForm" layout="vertical" style="max-width: 600px;">
                  <!-- Default Channels -->
                  <a-form-item :label="$t('profile.notifications.defaultChannels') || '默认通知渠道'">
                    <a-checkbox-group
                      v-decorator="['default_channels', { initialValue: notificationSettings.default_channels || ['browser', 'email'] }]"
                    >
                      <a-row :gutter="16">
                        <a-col :span="8">
                          <a-checkbox value="browser">
                            <a-icon type="bell" /> {{ $t('profile.notifications.browser') || '站内通知' }}
                          </a-checkbox>
                        </a-col>
                        <a-col :span="8">
                          <a-checkbox value="telegram">
                            <a-icon type="send" /> Telegram
                          </a-checkbox>
                        </a-col>
                        <a-col :span="8">
                          <a-checkbox value="email">
                            <a-icon type="mail" /> {{ $t('profile.notifications.email') || '邮件' }}
                          </a-checkbox>
                        </a-col>
                      </a-row>
                      <a-row :gutter="16" style="margin-top: 8px">
                        <a-col :span="8">
                          <a-checkbox value="phone">
                            <a-icon type="phone" /> {{ $t('profile.notifications.phone') || '短信' }}
                          </a-checkbox>
                        </a-col>
                        <a-col :span="8">
                          <a-checkbox value="discord">
                            <a-icon type="message" /> Discord
                          </a-checkbox>
                        </a-col>
                        <a-col :span="8">
                          <a-checkbox value="webhook">
                            <a-icon type="api" /> Webhook
                          </a-checkbox>
                        </a-col>
                      </a-row>
                    </a-checkbox-group>
                  </a-form-item>

                  <!-- Telegram Bot Token -->
                  <a-form-item :label="$t('profile.notifications.telegramBotToken') || 'Telegram Bot Token'">
                    <a-input-password
                      v-decorator="['telegram_bot_token', { initialValue: notificationSettings.telegram_bot_token }]"
                      :placeholder="$t('profile.notifications.telegramBotTokenPlaceholder') || '请输入您的 Telegram Bot Token'"
                    >
                      <a-icon slot="prefix" type="robot" />
                    </a-input-password>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>
                        {{ $t('profile.notifications.telegramBotTokenHint') || '通过 @BotFather 创建机器人获取 Token' }}
                        <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a>
                      </span>
                    </div>
                  </a-form-item>

                  <!-- Telegram Chat ID -->
                  <a-form-item :label="$t('profile.notifications.telegramChatId') || 'Telegram Chat ID'">
                    <a-input
                      v-decorator="['telegram_chat_id', { initialValue: notificationSettings.telegram_chat_id }]"
                      :placeholder="$t('profile.notifications.telegramPlaceholder') || '请输入您的 Telegram Chat ID（如 123456789）'"
                    >
                      <a-icon slot="prefix" type="message" />
                    </a-input>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>{{ $t('profile.notifications.telegramHint') || '发送 /start 给 @userinfobot 可获取您的 Chat ID' }}</span>
                    </div>
                  </a-form-item>

                  <!-- Notification Email -->
                  <a-form-item :label="$t('profile.notifications.notifyEmail') || '通知邮箱'">
                    <a-input
                      v-decorator="['email', { initialValue: notificationSettings.email || profile.email }]"
                      :placeholder="$t('profile.notifications.emailPlaceholder') || '接收通知的邮箱地址'"
                    >
                      <a-icon slot="prefix" type="mail" />
                    </a-input>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>{{ $t('profile.notifications.emailHint') || '默认使用账户邮箱，可设置其他邮箱接收通知' }}</span>
                    </div>
                  </a-form-item>

                  <!-- Phone Number (SMS) -->
                  <a-form-item :label="$t('profile.notifications.phone') || '手机号（短信通知）'">
                    <a-input
                      v-decorator="['phone', { initialValue: notificationSettings.phone }]"
                      :placeholder="$t('profile.notifications.phonePlaceholder') || '请输入手机号（如 +8613800138000）'"
                    >
                      <a-icon slot="prefix" type="phone" />
                    </a-input>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>{{ $t('profile.notifications.phoneHint') || '需要管理员配置 Twilio 服务后才能使用短信通知' }}</span>
                    </div>
                  </a-form-item>

                  <!-- Discord Webhook -->
                  <a-form-item :label="$t('profile.notifications.discordWebhook') || 'Discord Webhook'">
                    <a-input
                      v-decorator="['discord_webhook', { initialValue: notificationSettings.discord_webhook }]"
                      :placeholder="$t('profile.notifications.discordPlaceholder') || 'https://discord.com/api/webhooks/...'"
                    >
                      <a-icon slot="prefix" type="message" />
                    </a-input>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>{{ $t('profile.notifications.discordHint') || '在 Discord 服务器设置中创建 Webhook' }}</span>
                    </div>
                  </a-form-item>

                  <!-- Webhook URL -->
                  <a-form-item :label="$t('profile.notifications.webhookUrl') || 'Webhook URL'">
                    <a-input
                      v-decorator="['webhook_url', { initialValue: notificationSettings.webhook_url }]"
                      :placeholder="$t('profile.notifications.webhookPlaceholder') || 'https://your-server.com/webhook'"
                      @change="handleWebhookUrlChange"
                    >
                      <a-icon slot="prefix" type="api" />
                    </a-input>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>{{ $t('profile.notifications.webhookHint') || '自定义 Webhook 地址，将以 POST JSON 方式推送通知。系统会自动识别飞书 / 钉钉 / 企微 / Slack 链接并转换为对应格式。' }}</span>
                    </div>
                    <!--
                      Show a real-time "detected dialect" badge under the URL
                      input. This is the single most-asked-for hint by users —
                      they want immediate visual confirmation that the system
                      recognised their Feishu/DingTalk/WeCom/Slack link and
                      will speak the right protocol, instead of silently
                      POSTing a generic JSON envelope that the bot rejects.
                    -->
                    <div v-if="webhookDialect && webhookDialect !== 'generic'" class="webhook-dialect">
                      <a-tag :color="webhookDialectColor">
                        <a-icon :type="webhookDialectIcon" />
                        {{ webhookDialectLabel }}
                      </a-tag>
                      <span class="webhook-dialect__hint">
                        {{ $t('profile.notifications.webhookDialectHint') || '已自动识别该平台，无需手动适配 payload 格式' }}
                      </span>
                    </div>
                  </a-form-item>

                  <!-- Webhook Token -->
                  <a-form-item
                    v-if="webhookDialect === 'generic' || !notificationSettings.webhook_url"
                    :label="$t('profile.notifications.webhookToken') || 'Webhook Token（可选）'"
                  >
                    <a-input-password
                      v-decorator="['webhook_token', { initialValue: notificationSettings.webhook_token }]"
                      :placeholder="$t('profile.notifications.webhookTokenPlaceholder') || '用于验证请求的 Bearer Token'"
                    >
                      <a-icon slot="prefix" type="key" />
                    </a-input-password>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>{{ $t('profile.notifications.webhookTokenHint') || '将作为 Authorization: Bearer Token 发送到 Webhook' }}</span>
                    </div>
                  </a-form-item>

                  <!-- Webhook Signing Secret (Feishu / DingTalk / Generic) -->
                  <a-form-item
                    v-if="webhookSupportsSigning"
                    :label="webhookSigningSecretLabel"
                  >
                    <a-input-password
                      v-decorator="['webhook_signing_secret', { initialValue: notificationSettings.webhook_signing_secret }]"
                      :placeholder="$t('profile.notifications.webhookSigningSecretPlaceholder') || '加签密钥（可选）'"
                    >
                      <a-icon slot="prefix" type="safety" />
                    </a-input-password>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>{{ webhookSigningSecretHint }}</span>
                    </div>
                  </a-form-item>

                  <a-form-item>
                    <a-button type="primary" :loading="savingNotifications" @click="handleSaveNotifications">
                      <a-icon type="save" />
                      {{ $t('common.save') || '保存' }}
                    </a-button>
                    <a-button style="margin-left: 12px" @click="handleTestNotification" :loading="testingNotification">
                      <a-icon type="experiment" />
                      {{ $t('profile.notifications.testBtn') || '发送测试通知' }}
                    </a-button>
                  </a-form-item>
                </a-form>
              </div>
            </a-tab-pane>

            <a-tab-pane key="referrals" :tab="$t('profile.referral.listTab') || '邀请列表'">
              <a-table
                :columns="referralColumns"
                :dataSource="referralData.list || []"
                :loading="referralLoading"
                :pagination="referralPagination"
                :rowKey="record => record.id"
                :locale="{ emptyText: $t('profile.referral.noReferrals') || '暂无邀请记录' }"
                size="small"
                @change="handleReferralChange"
              >
                <!-- Avatar & Name Column -->
                <template slot="user" slot-scope="text, record">
                  <div class="referral-user-cell">
                    <a-avatar :size="32" :src="record.avatar || '/avatar2.jpg'" />
                    <div class="user-info">
                      <span class="nickname">{{ record.nickname || record.username }}</span>
                      <span class="username">@{{ record.username }}</span>
                    </div>
                  </div>
                </template>

                <!-- Time Column -->
                <template slot="created_at" slot-scope="text">
                  {{ formatTime(text) }}
                </template>
              </a-table>
            </a-tab-pane>

            <!-- Login Logs Tab (last) -->
            <a-tab-pane key="loginLogs" :tab="$t('profile.loginLogs.title') || '账户登录日志'">
              <a-alert
                :message="$t('profile.loginLogs.hint') || '记录密码、验证码与第三方登录；新设备或新地区登录时会通过邮件与站内通知提醒您。'"
                type="info"
                showIcon
                style="margin-bottom: 16px"
              />
              <a-table
                :columns="loginLogColumns"
                :dataSource="loginLogs"
                :loading="loginLogsLoading"
                :pagination="loginLogsPagination"
                :rowKey="record => record.id"
                size="small"
                @change="handleLoginLogsChange"
              >
                <template slot="flags" slot-scope="text, record">
                  <a-tag v-if="record.is_new_device" color="orange" style="margin-right: 4px;">
                    {{ $t('profile.loginLogs.newDevice') || '新设备' }}
                  </a-tag>
                  <a-tag v-if="record.is_new_region" color="red">
                    {{ $t('profile.loginLogs.newRegion') || '新地区' }}
                  </a-tag>
                  <span v-if="!record.is_new_device && !record.is_new_region">—</span>
                </template>
                <template slot="created_at" slot-scope="text">
                  {{ formatTime(text) }}
                </template>
              </a-table>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-col>
    </a-row>

    <a-modal
      v-model="showMfaSetupModal"
      :title="$t('profile.mfa.setupTitle')"
      :footer="null"
      :width="520"
      :wrapClassName="mfaModalWrapClass"
      :destroyOnClose="true"
      @cancel="resetMfaSetup"
    >
      <div class="mfa-setup-modal">
        <div class="mfa-setup-head">
          <span class="mfa-setup-badge"><a-icon type="safety-certificate" /></span>
          <div>
            <div class="mfa-setup-heading">{{ $t('profile.mfa.setupIntroTitle') }}</div>
            <div class="mfa-setup-subtitle">{{ $t('profile.mfa.scanHint') }}</div>
          </div>
        </div>
        <div v-if="mfaSetup.qr_image" class="mfa-qr-card">
          <img :src="mfaSetup.qr_image" alt="MFA QR code" class="mfa-qr" />
        </div>
        <div class="mfa-field">
          <label>{{ $t('profile.mfa.manualKey') }}</label>
          <a-input
            :value="mfaSetup.secret_display || mfaSetup.secret"
            readonly
            class="mfa-secret-input"
          >
            <a-icon slot="prefix" type="key" />
            <a-tooltip slot="suffix" :title="$t('common.copy')">
              <a-icon type="copy" @click="copyText(mfaSetup.secret)" />
            </a-tooltip>
          </a-input>
        </div>
        <div class="mfa-field">
          <label>{{ $t('profile.mfa.verifyCode') }}</label>
          <a-input
            v-model="mfaSetupCode"
            size="large"
            :maxLength="6"
            autocomplete="one-time-code"
            :placeholder="$t('profile.mfa.codePlaceholder')"
            @pressEnter="handleConfirmMfaSetup"
          >
            <a-icon slot="prefix" type="safety-certificate" />
          </a-input>
        </div>
        <div class="mfa-modal-actions">
          <a-button @click="resetMfaSetup">{{ $t('common.cancel') }}</a-button>
          <a-button type="primary" :loading="mfaConfirming" @click="handleConfirmMfaSetup">
            <a-icon type="check" />
            {{ $t('profile.mfa.confirmEnable') }}
          </a-button>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model="showMfaRecoveryModal"
      :title="$t('profile.mfa.recoveryTitle')"
      :width="460"
      :wrapClassName="mfaModalWrapClass"
      :okText="$t('common.done')"
      :cancelButtonProps="{ style: { display: 'none' } }"
      @ok="showMfaRecoveryModal = false"
    >
      <a-alert
        type="warning"
        showIcon
        :message="$t('profile.mfa.recoveryHint')"
        style="margin-bottom: 16px"
      />
      <div class="mfa-recovery-grid">
        <code v-for="code in mfaRecoveryCodes" :key="code">{{ code }}</code>
      </div>
    </a-modal>

    <a-modal
      v-model="showDisableMfaModal"
      :title="$t('profile.mfa.disableTitle')"
      :confirmLoading="mfaDisabling"
      :wrapClassName="mfaModalWrapClass"
      :okText="$t('profile.mfa.disable')"
      :cancelText="$t('common.cancel')"
      @ok="handleDisableMfa"
    >
      <a-alert
        type="warning"
        showIcon
        :message="$t('profile.mfa.disableHint')"
        style="margin-bottom: 16px"
      />
      <a-input
        v-model="mfaDisableCode"
        size="large"
        :maxLength="16"
        autocomplete="one-time-code"
        :placeholder="$t('profile.mfa.codePlaceholder')"
        @pressEnter="handleDisableMfa"
      >
        <a-icon slot="prefix" type="safety-certificate" />
      </a-input>
    </a-modal>
  </div>
</template>

<script>
import { getProfile, updateProfile, getLoginLogs, getMyCreditsLog, getMyReferrals, getNotificationSettings, updateNotificationSettings, testNotificationSettings, getMfaStatus, startMfaSetup, confirmMfaSetup, disableMfa } from '@/api/user'
import { getSettingsValues } from '@/api/settings'
import { baseMixin } from '@/store/app-mixin'
import ProfileAgentTokens from '@/views/profile/components/ProfileAgentTokens.vue'
import { formatBrowserLocalDateTime } from '@/utils/userTime'

const DEFAULT_NOTIFICATION_CHANNELS = ['browser', 'email']
const normalizeNotificationChannels = channels => (
  Array.isArray(channels) && channels.length ? channels : DEFAULT_NOTIFICATION_CHANNELS
)

export default {
  name: 'Profile',
  components: { ProfileAgentTokens },
  mixins: [baseMixin],
  data () {
    return {
      loading: false,
      saving: false,
      changingPassword: false,
      sendingPwdCode: false,
      pwdCodeCountdown: 0,
      pwdCodeTimer: null,
      activeTab: 'basic',
      profile: {
        id: null,
        username: '',
        nickname: '',
        email: '',
        avatar: '',
        timezone: '',
        role: 'user',
        last_login_at: null
      },
      timezoneIanaList: [
        'UTC',
        'Etc/UTC',
        'Asia/Shanghai',
        'Asia/Hong_Kong',
        'Asia/Taipei',
        'Asia/Tokyo',
        'Asia/Seoul',
        'Asia/Singapore',
        'Asia/Dubai',
        'Asia/Kolkata',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Toronto',
        'America/Sao_Paulo',
        'Australia/Sydney',
        'Pacific/Auckland'
      ],
      // Login logs
      loginLogs: [],
      loginLogsLoading: false,
      loginLogsPagination: {
        current: 1,
        pageSize: 10,
        total: 0
      },
      // Credits log
      creditsLog: [],
      creditsLogLoading: false,
      creditsLogPagination: {
        current: 1,
        pageSize: 10,
        total: 0
      },
      // Referral data
      referralData: {
        list: [],
        total: 0,
        referral_code: '',
        referral_bonus: 0,
        register_bonus: 0
      },
      referralLoading: false,
      referralPagination: {
        current: 1,
        pageSize: 10,
        total: 0
      },
      billing: {
        credits: 0,
        is_vip: false,
        vip_expires_at: null,
        billing_enabled: false,
        feature_costs: {}
      },
      rechargeTelegramUrl: 'https://t.me/your_support_bot',
      // Notification settings
      notificationSettings: {
        default_channels: [...DEFAULT_NOTIFICATION_CHANNELS],
        telegram_bot_token: '',
        telegram_chat_id: '',
        email: '',
        phone: '',
        discord_webhook: '',
        webhook_url: '',
        webhook_token: '',
        webhook_signing_secret: ''
      },
      savingNotifications: false,
      testingNotification: false,
      mfaStatus: {
        system_enabled: false,
        enabled: false,
        confirmed_at: null,
        risk_login_only: true
      },
      mfaLoading: false,
      mfaConfirming: false,
      mfaDisabling: false,
      showMfaSetupModal: false,
      showMfaRecoveryModal: false,
      showDisableMfaModal: false,
      mfaSetup: {},
      mfaSetupCode: '',
      mfaDisableCode: '',
      mfaRecoveryCodes: []
    }
  },
  computed: {
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    mfaModalWrapClass () {
      const base = 'profile-mfa-modal'
      return this.isDarkTheme ? `${base} ${base}--dark` : base
    },
    isVip () {
      if (!this.billing.vip_expires_at) return false
      const expiresAt = new Date(this.billing.vip_expires_at)
      return expiresAt > new Date()
    },
    loginLogColumns () {
      return [
        {
          title: this.$t('profile.loginLogs.time') || '时间',
          dataIndex: 'created_at',
          width: 170,
          scopedSlots: { customRender: 'created_at' }
        },
        {
          title: this.$t('profile.loginLogs.method') || '方式',
          dataIndex: 'method',
          width: 120
        },
        {
          title: this.$t('profile.loginLogs.device') || '设备',
          dataIndex: 'device',
          ellipsis: true
        },
        {
          title: this.$t('profile.loginLogs.location') || '位置',
          dataIndex: 'location',
          width: 160,
          ellipsis: true,
          customRender: (text) => text || '—'
        },
        {
          title: this.$t('profile.loginLogs.ip') || 'IP',
          dataIndex: 'ip_address',
          width: 130
        },
        {
          title: this.$t('profile.loginLogs.flags') || '提醒',
          width: 140,
          scopedSlots: { customRender: 'flags' }
        }
      ]
    },
    creditsLogColumns () {
      return [
        {
          title: this.$t('profile.creditsLog.time') || '时间',
          dataIndex: 'created_at',
          width: 160,
          scopedSlots: { customRender: 'created_at' }
        },
        {
          title: this.$t('profile.creditsLog.action') || '类型',
          dataIndex: 'action',
          width: 100,
          scopedSlots: { customRender: 'action' }
        },
        {
          title: this.$t('profile.creditsLog.amount') || '变动',
          dataIndex: 'amount',
          width: 100,
          scopedSlots: { customRender: 'amount' }
        },
        {
          title: this.$t('profile.creditsLog.balance') || '余额',
          dataIndex: 'balance_after',
          width: 100
        },
        {
          title: this.$t('profile.creditsLog.remark') || '备注',
          dataIndex: 'remark',
          ellipsis: true
        }
      ]
    },
    referralColumns () {
      return [
        {
          title: this.$t('profile.referral.user') || '用户',
          dataIndex: 'username',
          scopedSlots: { customRender: 'user' }
        },
        {
          title: this.$t('profile.referral.registerTime') || '注册时间',
          dataIndex: 'created_at',
          width: 180,
          scopedSlots: { customRender: 'created_at' }
        }
      ]
    },
    referralLink () {
      const baseUrl = window.location.origin + window.location.pathname
      const ref = this.referralData.referral_code || this.profile.id
      return `${baseUrl}#/user/login?ref=${ref}`
    },
    // ---- Webhook dialect detection (mirrors backend logic in
    // signal_notifier.py::_detect_webhook_dialect). Keep the patterns
    // in sync if either side changes.
    webhookDialect () {
      const u = (this.notificationSettings.webhook_url || '').toLowerCase()
      if (!u) return ''
      if (
        u.includes('open.feishu.cn/open-apis/bot/v2/hook/') ||
        u.includes('open.larksuite.com/open-apis/bot/v2/hook/') ||
        u.includes('open.larkoffice.com/open-apis/bot/v2/hook/') ||
        u.includes('www.larksuite.com/open-apis/bot/v2/hook/')
      ) return 'feishu'
      if (u.includes('oapi.dingtalk.com/robot/send')) return 'dingtalk'
      if (u.includes('qyapi.weixin.qq.com/cgi-bin/webhook/send')) return 'wecom'
      if (u.includes('hooks.slack.com/services/')) return 'slack'
      return 'generic'
    },
    webhookDialectLabel () {
      switch (this.webhookDialect) {
        case 'feishu': return this.$t('profile.notifications.dialectFeishu') || '飞书 / Lark 自定义机器人'
        case 'dingtalk': return this.$t('profile.notifications.dialectDingtalk') || '钉钉自定义机器人'
        case 'wecom': return this.$t('profile.notifications.dialectWecom') || '企业微信群机器人'
        case 'slack': return this.$t('profile.notifications.dialectSlack') || 'Slack Incoming Webhook'
        default: return this.$t('profile.notifications.dialectGeneric') || '自定义 / 自托管 Webhook'
      }
    },
    webhookDialectColor () {
      switch (this.webhookDialect) {
        case 'feishu': return 'blue'
        case 'dingtalk': return 'cyan'
        case 'wecom': return 'green'
        case 'slack': return 'purple'
        default: return 'default'
      }
    },
    webhookDialectIcon () {
      switch (this.webhookDialect) {
        case 'feishu':
        case 'wecom':
        case 'dingtalk':
        case 'slack':
          return 'message'
        default: return 'api'
      }
    },
    // Signing-secret box is only shown for dialects that actually
    // support signing. Slack/WeCom embed the secret in the URL so an
    // extra field would only confuse users.
    webhookSupportsSigning () {
      return ['feishu', 'dingtalk', 'generic', ''].includes(this.webhookDialect)
    },
    webhookSigningSecretLabel () {
      const base = this.$t('profile.notifications.webhookSigningSecret') || 'Webhook 加签密钥'
      const tag = this.webhookDialect === 'feishu'
        ? this.$t('profile.notifications.signingFeishuTag') || '（飞书加签）'
        : this.webhookDialect === 'dingtalk'
          ? this.$t('profile.notifications.signingDingtalkTag') || '（钉钉加签）'
          : ''
      return base + tag
    },
    webhookSigningSecretHint () {
      if (this.webhookDialect === 'feishu') {
        return this.$t('profile.notifications.signingFeishuHint') ||
          '飞书机器人「安全设置 → 签名校验」处生成的 secret。系统会按飞书算法把 timestamp + sign 写入消息 body。'
      }
      if (this.webhookDialect === 'dingtalk') {
        return this.$t('profile.notifications.signingDingtalkHint') ||
          '钉钉机器人「安全设置 → 加签」处生成的 secret。系统会按钉钉算法把 timestamp 和 sign 追加到 URL。'
      }
      return this.$t('profile.notifications.signingGenericHint') ||
        '可选。用于 HMAC-SHA256 签名，作为 X-QD-Signature 头部下发，接收端可验签防伪造。'
    }
  },
  watch: {
    activeTab (val) {
      if (val === 'loginLogs' && this.loginLogs.length === 0) {
        this.loadLoginLogs()
      }
      if (val === 'credits' && this.creditsLog.length === 0) {
        this.loadCreditsLog()
      }
      if (val === 'referrals' && (!this.referralData.list || this.referralData.list.length === 0)) {
        this.loadReferrals()
      }
      if (val === 'notifications' && !this.notificationSettings.telegram_chat_id && !this.notificationSettings.discord_webhook) {
        this.loadNotificationSettings()
      }
      if (val === 'security') {
        this.loadMfaStatus()
      }
      // Mirror the active tab into ``?tab=xxx`` so URLs are shareable and
      // browser back/forward preserves state. Compare first to avoid a
      // navigation loop with the $route watcher below.
      if (this.$route.query.tab !== val) {
        this.$router.replace({
          query: { ...this.$route.query, tab: val }
        }).catch(() => {})
      }
    },
    // Respond to deep links from emails or pasted URLs. Allowed tabs are whitelisted so
    // a random ?tab=foo can't break the UI.
    '$route.query.tab' (val) {
      this.applyTabFromQuery(val)
    }
  },
  beforeCreate () {
    this.profileForm = this.$form.createForm(this, { name: 'profile' })
    this.passwordForm = this.$form.createForm(this, { name: 'password' })
    this.notificationForm = this.$form.createForm(this, { name: 'notification' })
  },
  mounted () {
    // Honour deep links — sets activeTab before any data loads so we can
    // jump straight to a specific tab.
    this.applyTabFromQuery(this.$route.query.tab)
    this.loadProfile()
    this.loadReferrals()
  },
  beforeDestroy () {
    if (this.pwdCodeTimer) {
      clearInterval(this.pwdCodeTimer)
    }
  },
  methods: {
    // Whitelist of tabs we accept from ``?tab=xxx``. Anything else is a no-op
    // so a malformed link can't put the page in a weird state.
    applyTabFromQuery (rawTab) {
      const allowed = ['basic', 'agentTokens', 'password', 'security', 'credits', 'notifications', 'referrals', 'loginLogs']
      if (rawTab && allowed.includes(rawTab) && this.activeTab !== rawTab) {
        this.activeTab = rawTab
      }
    },

    async loadProfile () {
      this.loading = true
      try {
        const res = await getProfile()
        if (res.code === 1) {
          this.profile = res.data
          if (res.data.billing) {
            this.billing = res.data.billing
          }
          if (res.data.notification_settings) {
            this.notificationSettings = {
              default_channels: normalizeNotificationChannels(res.data.notification_settings.default_channels),
              telegram_bot_token: res.data.notification_settings.telegram_bot_token || '',
              telegram_chat_id: res.data.notification_settings.telegram_chat_id || '',
              email: res.data.notification_settings.email || res.data.email || '',
              phone: res.data.notification_settings.phone || '',
              discord_webhook: res.data.notification_settings.discord_webhook || '',
              webhook_url: res.data.notification_settings.webhook_url || '',
              webhook_token: res.data.notification_settings.webhook_token || ''
            }
          }
          this.$nextTick(() => {
            this.profileForm.setFieldsValue({
              nickname: this.profile.nickname,
              email: this.profile.email,
              timezone: this.profile.timezone || ''
            })
          })
        } else {
          this.$message.error(res.msg || 'Failed to load profile')
        }
      } catch (error) {
        this.$message.error('Failed to load profile')
      } finally {
        this.loading = false
      }
    },

    async loadRechargeUrl () {
      if (this.profile.role === 'admin') {
        try {
          const res = await getSettingsValues()
          if (res.code === 1 && res.data && res.data.billing) {
            this.rechargeTelegramUrl = res.data.billing.RECHARGE_TELEGRAM_URL || this.rechargeTelegramUrl
          }
        } catch (e) {
        }
      }
    },

    handleRecharge () {
      this.$router.push('/billing')
    },

    formatCredits (credits) {
      if (!credits && credits !== 0) return '0'
      return Number(credits).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    },

    formatDate (dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString()
    },

    handleSaveProfile () {
      this.profileForm.validateFields(async (err, values) => {
        if (err) return

        this.saving = true
        try {
          const res = await updateProfile({
            nickname: values.nickname,
            timezone: values.timezone != null ? values.timezone : ''
          })
          if (res.code === 1) {
            this.$message.success(res.msg || 'Profile updated successfully')
            this.loadProfile()
            this.$store.dispatch('FetchUserInfo').catch(() => {})
          } else {
            this.$message.error(res.msg || 'Update failed')
          }
        } catch (error) {
          this.$message.error('Update failed')
        } finally {
          this.saving = false
        }
      })
    },

    validateConfirmPassword (rule, value, callback) {
      const newPassword = this.passwordForm.getFieldValue('new_password')
      if (value && value !== newPassword) {
        callback(this.$t('profile.passwordMismatch') || 'Passwords do not match')
      } else {
        callback()
      }
    },

    async handleSendPwdCode () {
      if (!this.profile.email) {
        this.$message.error(this.$t('profile.noEmailWarning') || 'Please set your email first')
        return
      }

      this.sendingPwdCode = true
      try {
        const { sendVerificationCode } = await import('@/api/auth')
        const res = await sendVerificationCode({
          email: this.profile.email,
          type: 'change_password'
        })
        if (res.code === 1) {
          this.$message.success(this.$t('profile.codeSent') || 'Verification code sent')
          this.startPwdCodeCountdown()
        } else {
          this.$message.error(res.msg || 'Failed to send code')
        }
      } catch (error) {
        this.$message.error(error.response?.data?.msg || 'Failed to send code')
      } finally {
        this.sendingPwdCode = false
      }
    },

    startPwdCodeCountdown () {
      this.pwdCodeCountdown = 60
      this.pwdCodeTimer = setInterval(() => {
        this.pwdCodeCountdown--
        if (this.pwdCodeCountdown <= 0) {
          clearInterval(this.pwdCodeTimer)
          this.pwdCodeTimer = null
        }
      }, 1000)
    },

    validateNewPassword (rule, value, callback) {
      if (!value) {
        callback()
        return
      }
      if (value.length < 8) {
        callback(new Error(this.$t('user.register.pwdMinLength') || 'At least 8 characters'))
        return
      }
      if (!/[A-Z]/.test(value)) {
        callback(new Error(this.$t('user.register.pwdUppercase') || 'At least one uppercase letter'))
        return
      }
      if (!/[a-z]/.test(value)) {
        callback(new Error(this.$t('user.register.pwdLowercase') || 'At least one lowercase letter'))
        return
      }
      if (!/[0-9]/.test(value)) {
        callback(new Error(this.$t('user.register.pwdNumber') || 'At least one number'))
        return
      }
      callback()
    },

    handleChangePassword () {
      this.passwordForm.validateFields(async (err, values) => {
        if (err) return

        this.changingPassword = true
        try {
          const { changePassword: changePasswordApi } = await import('@/api/auth')
          const res = await changePasswordApi({
            code: values.code,
            new_password: values.new_password
          })
          if (res.code === 1) {
            this.$message.success(res.msg || 'Password changed successfully')
            this.passwordForm.resetFields()
            this.$store.dispatch('FetchUserInfo').catch(() => {})
          } else {
            this.$message.error(res.msg || 'Change password failed')
          }
        } catch (error) {
          this.$message.error(error.response?.data?.msg || 'Change password failed')
        } finally {
          this.changingPassword = false
        }
      })
    },

    async loadMfaStatus () {
      try {
        const res = await getMfaStatus()
        if (res.code === 1 && res.data) {
          this.mfaStatus = { ...this.mfaStatus, ...res.data }
        }
      } catch (error) {
        this.$message.error(error.response?.data?.msg || 'Failed to load MFA status')
      }
    },

    async handleStartMfaSetup () {
      this.mfaLoading = true
      try {
        const res = await startMfaSetup()
        if (res.code === 1 && res.data) {
          this.mfaSetup = res.data
          this.mfaSetupCode = ''
          this.showMfaSetupModal = true
        } else {
          this.$message.error(res.msg || 'Failed to start MFA setup')
        }
      } catch (error) {
        this.$message.error(error.response?.data?.msg || 'Failed to start MFA setup')
      } finally {
        this.mfaLoading = false
      }
    },

    async handleConfirmMfaSetup () {
      const code = (this.mfaSetupCode || '').trim()
      if (!code) {
        this.$message.error(this.$t('profile.mfa.codeRequired') || '请输入验证码')
        return
      }
      this.mfaConfirming = true
      try {
        const res = await confirmMfaSetup({ code })
        if (res.code === 1) {
          this.$message.success(res.msg || 'MFA enabled successfully')
          this.mfaRecoveryCodes = (res.data && res.data.recovery_codes) || []
          this.resetMfaSetup()
          this.showMfaRecoveryModal = this.mfaRecoveryCodes.length > 0
          this.loadMfaStatus()
        } else {
          this.$message.error(res.msg || 'MFA verification failed')
        }
      } catch (error) {
        this.$message.error(error.response?.data?.msg || 'MFA verification failed')
      } finally {
        this.mfaConfirming = false
      }
    },

    async handleDisableMfa () {
      const code = (this.mfaDisableCode || '').trim()
      if (!code) {
        this.$message.error(this.$t('profile.mfa.codeRequired') || '请输入验证码')
        return
      }
      this.mfaDisabling = true
      try {
        const res = await disableMfa({ code })
        if (res.code === 1) {
          this.$message.success(res.msg || 'MFA disabled successfully')
          this.showDisableMfaModal = false
          this.mfaDisableCode = ''
          this.loadMfaStatus()
        } else {
          this.$message.error(res.msg || 'Failed to disable MFA')
        }
      } catch (error) {
        this.$message.error(error.response?.data?.msg || 'Failed to disable MFA')
      } finally {
        this.mfaDisabling = false
      }
    },

    resetMfaSetup () {
      this.showMfaSetupModal = false
      this.mfaSetup = {}
      this.mfaSetupCode = ''
    },

    getRoleColor (role) {
      const colors = {
        admin: 'red',
        manager: 'orange',
        user: 'blue',
        viewer: 'default'
      }
      return colors[role] || 'default'
    },

    getRoleLabel (role) {
      const labels = {
        admin: this.$t('userManage.roleAdmin') || 'Admin',
        manager: this.$t('userManage.roleManager') || 'Manager',
        user: this.$t('userManage.roleUser') || 'User',
        viewer: this.$t('userManage.roleViewer') || 'Viewer'
      }
      return labels[role] || role
    },

    formatTime (timestamp) {
      return formatBrowserLocalDateTime(timestamp, { fallback: '' })
    },

    formatCreditsLogTime (timestamp) {
      return formatBrowserLocalDateTime(timestamp, { fallback: '' })
    },

    async loadLoginLogs () {
      this.loginLogsLoading = true
      try {
        const res = await getLoginLogs({
          page: this.loginLogsPagination.current,
          page_size: this.loginLogsPagination.pageSize
        })
        if (res.code === 1) {
          this.loginLogs = res.data.items || []
          this.loginLogsPagination.total = res.data.total || 0
        }
      } catch (e) {
        this.$message.error(this.$t('profile.loginLogs.loadFailed') || '加载登录日志失败')
      } finally {
        this.loginLogsLoading = false
      }
    },

    handleLoginLogsChange (pagination) {
      this.loginLogsPagination.current = pagination.current
      this.loadLoginLogs()
    },

    // Credits log methods
    async loadCreditsLog () {
      this.creditsLogLoading = true
      try {
        const res = await getMyCreditsLog({
          page: this.creditsLogPagination.current,
          page_size: this.creditsLogPagination.pageSize
        })
        if (res.code === 1) {
          this.creditsLog = res.data.items || []
          this.creditsLogPagination.total = res.data.total || 0
        }
      } catch (e) {
        this.$message.error('Failed to load credits log')
      } finally {
        this.creditsLogLoading = false
      }
    },

    handleCreditsLogChange (pagination) {
      this.creditsLogPagination.current = pagination.current
      this.loadCreditsLog()
    },

    // Referral methods
    async loadReferrals () {
      this.referralLoading = true
      try {
        const res = await getMyReferrals({
          page: this.referralPagination.current,
          page_size: this.referralPagination.pageSize
        })
        if (res.code === 1) {
          this.referralData = {
            list: res.data.list || [],
            total: res.data.total || 0,
            referral_code: res.data.referral_code || '',
            referral_bonus: res.data.referral_bonus || 0,
            register_bonus: res.data.register_bonus || 0
          }
          this.referralPagination.total = res.data.total || 0
        }
      } catch (e) {
        this.$message.error('Failed to load referral data')
      } finally {
        this.referralLoading = false
      }
    },

    handleReferralChange (pagination) {
      this.referralPagination.current = pagination.current
      this.loadReferrals()
    },

    copyReferralLink () {
      const link = this.referralLink
      if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
          this.$message.success(this.$t('profile.referral.linkCopied') || '邀请链接已复制')
        }).catch(() => {
          this.fallbackCopy(link)
        })
      } else {
        this.fallbackCopy(link)
      }
    },

    copyText (text) {
      if (!text) return
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          this.$message.success(this.$t('common.copySuccess') || '复制成功')
        }).catch(() => {
          this.fallbackCopy(text)
        })
      } else {
        this.fallbackCopy(text)
      }
    },

    fallbackCopy (text) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        this.$message.success(this.$t('profile.referral.linkCopied') || '邀请链接已复制')
      } catch (err) {
        this.$message.error('Copy failed')
      }
      document.body.removeChild(textarea)
    },

    getActionColor (action) {
      // Map raw action codes to a preset color name (red / green / blue /
      // gold / cyan / purple / volcano / lime / orange). We avoid 'default'
      // because ant-design-vue treats it as a custom (non-preset) color
      // string, which renders an invalid background-color in light theme
      // and ends up white-on-white. Unknown actions fall back to 'blue'
      // so any new server-side action stays readable until we add a
      // proper mapping here.
      const colors = {
        consume: 'red',
        recharge: 'green',
        admin_adjust: 'blue',
        refund: 'orange',
        vip_grant: 'gold',
        vip_revoke: 'orange',
        register_bonus: 'cyan',
        referral_bonus: 'purple',
        // Membership
        membership_purchase: 'gold',
        membership_bonus: 'cyan',
        membership_monthly: 'lime',
        indicator_purchase: 'volcano',
        indicator_sale: 'lime'
      }
      return colors[action] || 'blue'
    },

    getActionLabel (action) {
      const labels = {
        consume: this.$t('profile.creditsLog.actionConsume') || '消费',
        recharge: this.$t('profile.creditsLog.actionRecharge') || '充值',
        admin_adjust: this.$t('profile.creditsLog.actionAdjust') || '调整',
        refund: this.$t('profile.creditsLog.actionRefund') || '退款',
        vip_grant: this.$t('profile.creditsLog.actionVipGrant') || 'VIP授予',
        vip_revoke: this.$t('profile.creditsLog.actionVipRevoke') || 'VIP取消',
        register_bonus: this.$t('profile.creditsLog.actionRegisterBonus') || '注册奖励',
        referral_bonus: this.$t('profile.creditsLog.actionReferralBonus') || '邀请奖励',
        // Membership (kept for historical rows; new purchases no longer
        // emit a separate `membership_purchase` row — see billing_service.)
        membership_purchase: this.$t('profile.creditsLog.actionMembershipPurchase') || '购买会员',
        membership_bonus: this.$t('profile.creditsLog.actionMembershipBonus') || '会员赠送积分',
        membership_monthly: this.$t('profile.creditsLog.actionMembershipMonthly') || '会员月度积分',
        indicator_purchase: this.$t('profile.creditsLog.actionIndicatorPurchase') || '购买指标',
        indicator_sale: this.$t('profile.creditsLog.actionIndicatorSale') || '出售指标'
      }
      return labels[action] || action
    },

    // Notification settings methods
    async loadNotificationSettings () {
      try {
        const res = await getNotificationSettings()
        if (res.code === 1 && res.data) {
          this.notificationSettings = {
            default_channels: normalizeNotificationChannels(res.data.default_channels),
            telegram_bot_token: res.data.telegram_bot_token || '',
            telegram_chat_id: res.data.telegram_chat_id || '',
            email: res.data.email || this.profile.email || '',
            phone: res.data.phone || '',
            discord_webhook: res.data.discord_webhook || '',
            webhook_url: res.data.webhook_url || '',
            webhook_token: res.data.webhook_token || '',
            webhook_signing_secret: res.data.webhook_signing_secret || ''
          }
          // Update form values
          this.$nextTick(() => {
            this.notificationForm.setFieldsValue({
              default_channels: this.notificationSettings.default_channels,
              telegram_bot_token: this.notificationSettings.telegram_bot_token,
              telegram_chat_id: this.notificationSettings.telegram_chat_id,
              email: this.notificationSettings.email,
              phone: this.notificationSettings.phone,
              discord_webhook: this.notificationSettings.discord_webhook,
              webhook_url: this.notificationSettings.webhook_url,
              webhook_token: this.notificationSettings.webhook_token,
              webhook_signing_secret: this.notificationSettings.webhook_signing_secret
            })
          })
        }
      } catch (e) {
        // Use default values
      }
    },

    _mapNotifyTestError (channel, err) {
      const e = (err || '').trim()
      if (channel === 'email') {
        if (e === 'missing_SMTP_HOST') {
          return this.$t('profile.notifications.errSmtpHost') ||
            'email：服务器未配置发信 SMTP（管理员在「系统设置 → 邮件」或环境变量 SMTP_HOST/SMTP_USER 等）'
        }
        if (e === 'missing_SMTP_FROM') {
          return this.$t('profile.notifications.errSmtpFrom') ||
            'email：未配置发件人 SMTP_FROM（或 SMTP_USER）'
        }
        if (e === 'missing_email_target') {
          return this.$t('profile.notifications.errEmailTarget') ||
            'email：未填写通知邮箱且账号无邮箱'
        }
      }
      return e ? `${channel}: ${e}` : ''
    },

    // Keep our reactive ``notificationSettings.webhook_url`` in sync with
    // what the user is currently typing so the dialect badge updates
    // live (the form decorator owns the actual value, but the computed
    // properties read from notificationSettings).
    handleWebhookUrlChange (e) {
      const v = (e && e.target && typeof e.target.value !== 'undefined') ? e.target.value : ''
      this.notificationSettings.webhook_url = v || ''
    },

    handleSaveNotifications () {
      this.notificationForm.validateFields(async (err, values) => {
        if (err) return

        this.savingNotifications = true
        try {
          const res = await updateNotificationSettings({
            default_channels: normalizeNotificationChannels(values.default_channels),
            telegram_bot_token: values.telegram_bot_token || '',
            telegram_chat_id: values.telegram_chat_id || '',
            email: values.email || '',
            phone: values.phone || '',
            discord_webhook: values.discord_webhook || '',
            webhook_url: values.webhook_url || '',
            webhook_token: values.webhook_token || '',
            webhook_signing_secret: values.webhook_signing_secret || ''
          })
          if (res.code === 1) {
            this.$message.success(this.$t('profile.notifications.saveSuccess') || '通知设置保存成功')
            this.notificationSettings = res.data || this.notificationSettings
          } else {
            this.$message.error(res.msg || '保存失败')
          }
        } catch (e) {
          this.$message.error('保存失败')
        } finally {
          this.savingNotifications = false
        }
      })
    },

    async handleTestNotification () {
      const values = this.notificationForm.getFieldsValue()
      const channels = values.default_channels || []

      if (channels.length === 0) {
        this.$message.warning(this.$t('profile.notifications.selectChannel') || '请至少选择一个通知渠道')
        return
      }

      // Check if required fields are filled
      if (channels.includes('telegram')) {
        if (!values.telegram_bot_token) {
          this.$message.warning(this.$t('profile.notifications.fillTelegramToken') || '请填写 Telegram Bot Token')
          return
        }
        if (!values.telegram_chat_id) {
          this.$message.warning(this.$t('profile.notifications.fillTelegram') || '请填写 Telegram Chat ID')
          return
        }
      }
      if (channels.includes('email') && !values.email) {
        this.$message.warning(this.$t('profile.notifications.fillEmail') || '请填写通知邮箱')
        return
      }
      if (channels.includes('phone') && !values.phone) {
        this.$message.warning(this.$t('profile.notifications.fillPhone') || '请填写手机号')
        return
      }
      if (channels.includes('discord') && !values.discord_webhook) {
        this.$message.warning(this.$t('profile.notifications.fillDiscord') || '请填写 Discord Webhook URL')
        return
      }
      if (channels.includes('webhook') && !values.webhook_url) {
        this.$message.warning(this.$t('profile.notifications.fillWebhook') || '请填写 Webhook URL')
        return
      }

      this.testingNotification = true
      try {
        const saveRes = await updateNotificationSettings({
          default_channels: channels,
          telegram_bot_token: values.telegram_bot_token || '',
          telegram_chat_id: values.telegram_chat_id || '',
          email: values.email || '',
          phone: values.phone || '',
          discord_webhook: values.discord_webhook || '',
          webhook_url: values.webhook_url || '',
          webhook_token: values.webhook_token || ''
        })

        if (saveRes.code !== 1) {
          this.$message.error(saveRes.msg || '保存设置失败')
          return
        }

        const testRes = await testNotificationSettings()
        if (testRes.code !== 1) {
          this.$message.error(testRes.msg || (this.$t('profile.notifications.testFailed') || '测试通知发送失败'))
          return
        }

        const results = (testRes.data && testRes.data.results) || {}
        const failed = Object.keys(results).filter((k) => !results[k].ok)
        if (failed.length === 0) {
          this.$message.success(this.$t('profile.notifications.testSent') || '测试通知已发送，请检查各渠道')
        } else {
          const detail = failed.map((k) => {
            const err = (results[k] && results[k].error) || ''
            const hint = this._mapNotifyTestError(k, err)
            return hint || (err ? `${k}: ${err}` : k)
          }).join('；')
          this.$message.warning(
            (this.$t('profile.notifications.testPartial') || '部分渠道发送失败') + ` — ${detail}`,
            8
          )
        }
      } catch (e) {
        this.$message.error(this.$t('profile.notifications.testFailed') || '发送测试通知失败')
      } finally {
        this.testingNotification = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
@primary-color: var(--primary-color, #1890ff);

.profile-page {
  padding: 24px;
  min-height: calc(100vh - 120px);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);

  .page-header {
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
        color: @primary-color;
      }
    }

    .page-desc {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }
  }

  // Profile cards row - make cards same height
  .profile-cards-row {
    display: flex;
    align-items: stretch;

    .profile-card-col,
    .right-cards-col {
      display: flex;
      flex-direction: column;

      .ant-card {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      ::v-deep .ant-card-body {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
    }

    .right-cards-row {
      height: 100%;
      display: flex;

      .ant-col {
        display: flex;
        flex-direction: column;

        .ant-card {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        ::v-deep .ant-card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
      }
    }
  }

  .profile-card {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    text-align: center;

    .avatar-section {
      padding: 20px 0;

      .ant-avatar {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .username {
        margin: 16px 0 8px;
        font-size: 20px;
        font-weight: 600;
        color: #1e3a5f;
      }

      .user-role {
        margin: 0;
      }
    }

    .profile-info {
      text-align: left;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-around;

      .info-item {
        display: flex;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .anticon {
          font-size: 16px;
          color: @primary-color;
          margin-right: 12px;
        }

        .label {
          color: #64748b;
          margin-right: 8px;
        }

        .value {
          color: #1e3a5f;
          font-weight: 500;
        }
      }
    }
  }

  .edit-card {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

    ::v-deep .ant-tabs-bar {
      margin-bottom: 18px;
      border-bottom-color: #edf2f7;
    }

    ::v-deep .ant-tabs-nav-wrap {
      padding: 0 4px;
    }

    ::v-deep .ant-tabs-tab {
      height: 40px;
      min-width: 104px;
      margin-right: 4px;
      padding: 0 14px;
      border-radius: 8px 8px 0 0;
      color: #64748b;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease, background 0.2s ease;

      &:hover {
        color: var(--primary-color, @primary-color);
        background: color-mix(in srgb, var(--primary-color, @primary-color) 7%, #fff);
      }

      .anticon {
        margin-right: 6px;
      }
    }

    ::v-deep .ant-tabs-tab-active {
      color: var(--primary-color, @primary-color);
      background: color-mix(in srgb, var(--primary-color, @primary-color) 10%, #fff);
      font-weight: 700;
    }

    ::v-deep .ant-tabs-ink-bar {
      height: 3px;
      border-radius: 999px;
      background: var(--primary-color, @primary-color);
    }

    .profile-form,
    .password-form {
      max-width: 500px;

      ::v-deep .ant-input,
      ::v-deep .ant-input-password {
        border-radius: 8px;
      }

      .email-hint {
        margin-top: 8px;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.45);

        &.email-warning {
          color: #faad14;
        }
      }
    }

    .security-section {
      max-width: 920px;
    }

    .mfa-card {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      padding: 22px;
      border: 1px solid #e6edf5;
      border-radius: 8px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
    }

    .mfa-card-main {
      display: flex;
      gap: 16px;
      min-width: 0;
      flex: 1 1 auto;
    }

    .mfa-icon {
      width: 44px;
      height: 44px;
      flex: 0 0 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      color: #2454ff;
      background: rgba(36, 84, 255, 0.1);
      font-size: 22px;
    }

    .mfa-title {
      color: rgba(0, 0, 0, 0.85);
      font-size: 16px;
      font-weight: 600;
      line-height: 28px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .mfa-status-tag {
      margin-left: 0;
    }

    .mfa-desc,
    .mfa-meta {
      color: rgba(0, 0, 0, 0.55);
      line-height: 1.7;
    }

    .mfa-meta {
      margin-top: 6px;
      font-size: 12px;

      .anticon {
        margin-right: 4px;
      }
    }

    .mfa-feature-list {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;

      span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-height: 24px;
        padding: 2px 9px;
        border: 1px solid #dbeafe;
        border-radius: 6px;
        background: #eff6ff;
        color: #2463eb;
        font-size: 12px;
        line-height: 18px;
      }
    }

    .mfa-actions {
      flex: 0 0 auto;
    }

    // Credits log amount colors
    .amount-positive {
      color: #52c41a;
      font-weight: 600;
    }

    .amount-negative {
      color: #ff4d4f;
      font-weight: 600;
    }

    // Notification settings form
    .notification-settings-form {
      .field-hint {
        margin-top: 6px;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        gap: 4px;

        .anticon {
          font-size: 12px;
        }
      }

      // Live "detected dialect" badge under the webhook URL input.
      // Sits on the same row as a hint string so users see at a glance
      // that the system understood their URL and won't fall back to
      // the generic JSON envelope (which Feishu et al would reject).
      .webhook-dialect {
        margin-top: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;

        .ant-tag { margin: 0; }
        &__hint {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.55);
        }
      }

      ::v-deep .ant-checkbox-group {
        width: 100%;
      }

      ::v-deep .ant-checkbox-wrapper {
        margin-bottom: 8px;
      }
    }
  }

  .mfa-recovery-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    code {
      display: block;
      padding: 8px 10px;
      border-radius: 6px;
      background: #f5f7fb;
      color: #1f2a44;
      font-family: Consolas, Monaco, monospace;
      text-align: center;
    }
  }

  .credits-card {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;

    ::v-deep .ant-card-body {
      background: transparent;
      display: flex;
      flex-direction: column;
    }

    ::v-deep .ant-divider {
      border-color: rgba(255, 255, 255, 0.2);
    }

    .credits-header {
      .credits-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;

        .anticon {
          font-size: 18px;
        }
      }
    }

    .credits-body {
      padding: 20px 0;
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;

      .credits-amount {
        .amount-value {
          font-size: 42px;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .amount-label {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.9);
          margin-left: 8px;
        }
      }

      .vip-status {
        margin-top: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 13px;

        .vip-active {
          color: #ffd700;
        }

        .vip-expired {
          color: rgba(255, 255, 255, 0.6);
        }

        .no-vip {
          color: rgba(255, 255, 255, 0.7);
        }
      }
    }

    .credits-actions {
      text-align: center;
      margin-top: auto;

      .ant-btn {
        border-radius: 20px;
        padding: 0 24px;
        height: 36px;
        font-weight: 700;
        background: #fff;
        color: #3f2f8f;
        border: 1px solid rgba(255, 255, 255, 0.92);
        box-shadow: 0 8px 20px rgba(26, 18, 75, 0.22);

        &:hover {
          background: #f8fbff;
          color: #251464;
          border-color: #fff;
          box-shadow: 0 10px 24px rgba(26, 18, 75, 0.28);
        }
      }
    }

    .credits-hint {
      margin-top: 12px;
      text-align: center;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
  }

  .referral-card {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    color: #fff;

    ::v-deep .ant-card-body {
      background: transparent;
      display: flex;
      flex-direction: column;
    }

    ::v-deep .ant-divider {
      border-color: rgba(255, 255, 255, 0.2);
    }

    .referral-header {
      .referral-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;

        .anticon {
          font-size: 18px;
        }
      }
    }

    .referral-body {
      padding: 12px 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      .referral-stats {
        display: flex;
        justify-content: space-around;

        .stat-item {
          text-align: center;

          .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #fff;
            display: block;
          }

          .stat-label {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
          }
        }
      }

      .referral-link-section {
        .link-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 6px;
        }

        .link-box {
          ::v-deep .ant-input {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #fff;

            &::placeholder {
              color: rgba(255, 255, 255, 0.6);
            }
          }

          ::v-deep .anticon-copy {
            color: #fff;

            &:hover {
              color: #ffd700;
            }
          }
        }
      }

      .referral-hint {
        margin-top: auto;
        text-align: center;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;

        .anticon-gift {
          color: #ffd700;
        }
      }
    }
  }

  // Referral user cell in table
  .referral-user-cell {
    display: flex;
    align-items: center;
    gap: 10px;

    .user-info {
      display: flex;
      flex-direction: column;

      .nickname {
        font-weight: 500;
        color: #333;
      }

      .username {
        font-size: 12px;
        color: #999;
      }
    }
  }

  .test-result-msg {
    margin-top: 8px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    &.success {
      color: #52c41a;
    }
    &.error {
      color: #f5222d;
    }
  }

  // Dark theme
  &.theme-dark {
    background: linear-gradient(180deg, #141414 0%, #1c1c1c 100%);

    .page-header {
      .page-title {
        color: #e0e6ed;
      }
      .page-desc {
        color: #8b949e;
      }
    }

    .profile-card,
    .edit-card {
      background: #1c1c1c;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

      ::v-deep .ant-card-body {
        background: #1c1c1c;
      }
    }

    .profile-card {
      .avatar-section {
        .username {
          color: #e0e6ed;
        }
      }

      .profile-info {
        .info-item {
          border-bottom-color: #2a2a2a;

          .label {
            color: #8b949e;
          }

          .value {
            color: #e0e6ed;
          }
        }
      }
    }

    .edit-card {
      ::v-deep .ant-tabs-bar {
        border-bottom-color: #2a2a2a;
      }

      ::v-deep .ant-tabs-tab {
        color: #8b949e;

        &:hover {
          color: var(--primary-color, @primary-color);
          background: color-mix(in srgb, var(--primary-color, @primary-color) 12%, #1c1c1c);
        }
      }

      ::v-deep .ant-tabs-tab-active {
        color: var(--primary-color, @primary-color);
        background: color-mix(in srgb, var(--primary-color, @primary-color) 14%, #1c1c1c);
      }

      ::v-deep .ant-tabs-bar {
        border-bottom-color: #30363d;
      }

      ::v-deep .ant-form-item-label label {
        color: #c9d1d9;
      }

      .mfa-card {
        background: linear-gradient(180deg, #161b22 0%, #111820 100%);
        border-color: #30363d;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      }

      .mfa-icon {
        color: var(--primary-color-hover, var(--primary-color, #1890ff));
        background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent);
      }

      .mfa-title {
        color: #e6edf3;
      }

      .mfa-desc,
      .mfa-meta {
        color: #8b949e;
      }

      .mfa-feature-list {
        span {
          background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent);
          border-color: color-mix(in srgb, var(--primary-color, #1890ff) 24%, transparent);
          color: var(--primary-color-hover, var(--primary-color, #1890ff));
        }
      }

      ::v-deep .ant-input,
      ::v-deep .ant-input-password {
        background: #141414;
        border-color: #2a2a2a;
        color: #c9d1d9;

        &:hover,
        &:focus {
          border-color: @primary-color;
        }
      }
    }

    .credits-card {
      background: linear-gradient(135deg, #1c1c1c 0%, #1a1a1a 50%, #141414 100%);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

      ::v-deep .ant-divider {
        border-color: rgba(255, 255, 255, 0.1);
      }

      .credits-actions {
        .ant-btn {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.2);

          &:hover {
            background: rgba(255, 255, 255, 0.25);
          }
        }
      }
    }

    ::v-deep .ant-table-wrapper {
      .ant-table {
        background: #1c1c1c;
        color: #c9d1d9;
      }

      .ant-table-thead > tr > th {
        background: #2a2a2a;
        color: #c9d1d9;
        border-bottom-color: #2a2a2a;
      }

      .ant-table-tbody > tr > td {
        background: #1c1c1c;
        color: #c9d1d9;
        border-bottom-color: #2a2a2a;
      }

      .ant-table-tbody > tr:hover > td {
        background: #2a2a2a;
      }

      .ant-table-placeholder {
        background: #1c1c1c;
        color: #8b949e;
      }

      .ant-table-tbody > tr > td,
      .ant-table-tbody > tr > td span,
      .ant-table-tbody > tr > td div,
      .ant-table-tbody > tr > td *:not(.ant-tag):not(.ant-btn) {
        color: #c9d1d9;
      }

      .amount-positive {
        color: #52c41a;
      }

      .amount-negative {
        color: #f5222d;
      }

      .ant-tag {
        border-width: 1px;
        font-weight: 600;
      }
      .ant-tag-red { background: rgba(245,34,45,0.25); border-color: #f5222d; color: #ff7875; }
      .ant-tag-green { background: rgba(82,196,26,0.25); border-color: #52c41a; color: #73d13d; }
      .ant-tag-blue {
        background: color-mix(in srgb, var(--primary-color, #1890ff) 24%, transparent);
        border-color: var(--primary-color, #1890ff);
        color: var(--primary-color-hover, var(--primary-color, #1890ff));
      }
      .ant-tag-orange { background: rgba(250,173,20,0.25); border-color: #faad14; color: #ffc53d; }
      .ant-tag-gold { background: rgba(250,173,20,0.25); border-color: #faad14; color: #ffc53d; }
      .ant-tag-cyan { background: rgba(19,194,194,0.25); border-color: #13c2c2; color: #5cdbd3; }
      .ant-tag-purple { background: rgba(114,46,209,0.25); border-color: #722ed1; color: #b37feb; }
      .ant-tag-volcano { background: rgba(250,84,28,0.25); border-color: #fa541c; color: #ff9c6e; }
      .ant-tag-lime { background: rgba(160,212,104,0.25); border-color: #a0d911; color: #bae637; }
      .ant-tag-default { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); color: #c9d1d9; }
    }

    .profile-form,
    .password-form,
    .notification-settings-form {
      ::v-deep .ant-form-item-label > label {
        color: #c9d1d9;
      }

      ::v-deep .ant-form-item-explain,
      ::v-deep .ant-form-item-extra {
        color: #8b949e;
      }

      ::v-deep .ant-input,
      ::v-deep .ant-input-password,
      ::v-deep .ant-select-selector,
      ::v-deep .ant-input-number {
        background: #141414;
        border-color: #2a2a2a;
        color: #c9d1d9;

        &::placeholder {
          color: #6e7681;
        }
      }

      ::v-deep .ant-select-selection-item,
      ::v-deep .ant-select-selection-placeholder {
        color: #c9d1d9;
      }

      ::v-deep .ant-checkbox-wrapper,
      ::v-deep .ant-radio-wrapper {
        color: #c9d1d9;

        span {
          color: #c9d1d9;
        }
      }

      ::v-deep .ant-checkbox-checked .ant-checkbox-inner,
      ::v-deep .ant-radio-checked .ant-radio-inner {
        background-color: @primary-color;
        border-color: @primary-color;
      }

      .email-hint,
      .field-hint {
        color: #8b949e;
      }

      .email-warning {
        color: #f5222d;
      }
    }

    .notification-settings-form {
      ::v-deep .ant-alert {
        background: #1c1c1c;
        border-color: #2a2a2a;
        color: #c9d1d9;

        .ant-alert-message {
          color: #c9d1d9;
        }

        .ant-alert-description {
          color: #8b949e;
        }
      }
    }

    .test-result-msg {
      &.success {
        color: #52c41a;
      }
      &.error {
        color: #f5222d;
      }
    }

    .referral-user-cell {
      .user-info {
        .nickname {
          color: #c9d1d9;
        }

        .username {
          color: #8b949e;
        }
      }
    }

    ::v-deep .ant-tag {
      color: #c9d1d9;
    }

    ::v-deep .ant-tag.ant-tag-has-color {
      color: #ffffff !important;
      border-color: transparent !important;
    }

    ::v-deep .ant-input-prefix .anticon,
    ::v-deep .ant-input-suffix .anticon,
    ::v-deep .field-hint .anticon,
    ::v-deep .email-hint .anticon,
    ::v-deep .credits-hint .anticon,
    ::v-deep .notification-settings-form .anticon {
      color: #c9d1d9 !important;
    }

    ::v-deep .ant-pagination {
      .ant-pagination-item {
        background: #1c1c1c;
        border-color: #2a2a2a;

        a {
          color: #c9d1d9;
        }

        &:hover {
          border-color: @primary-color;
        }
      }

      .ant-pagination-item-active {
        background: @primary-color;
        border-color: @primary-color;

        a {
          color: #fff;
        }
      }

      .ant-pagination-prev,
      .ant-pagination-next {
        .ant-pagination-item-link {
          background: #1c1c1c;
          border-color: #2a2a2a;
          color: #c9d1d9;
        }
      }

      .ant-pagination-options {
        .ant-select-selector {
          background: #141414;
          border-color: #2a2a2a;
          color: #c9d1d9;
        }
      }
    }

    ::v-deep .ant-btn {
      &.ant-btn-default {
        background: #1c1c1c;
        border-color: #2a2a2a;
        color: #c9d1d9;

        &:hover {
          border-color: @primary-color;
          color: @primary-color;
        }
      }
    }
  }
}

// ==================== Mobile Responsive Styles ====================
@media screen and (max-width: 768px) {
  .profile-page {
    padding: 12px;

    .page-header {
      margin-bottom: 16px;

      .page-title {
        font-size: 20px;

        .anticon {
          font-size: 22px;
        }
      }

      .page-desc {
        font-size: 13px;
      }
    }

    // Profile cards row - stack vertically
    .profile-cards-row {
      flex-direction: column;

      .profile-card-col {
        margin-bottom: 12px;
      }

      .right-cards-col {
        .right-cards-row {
          flex-direction: column;

          .ant-col {
            margin-bottom: 12px;
          }
        }
      }
    }

    // Profile card adjustments
    .profile-card {
      border-radius: 10px;

      .avatar-section {
        padding: 16px 0;

        ::v-deep .ant-avatar {
          width: 80px !important;
          height: 80px !important;
          line-height: 80px !important;
        }

        .username {
          font-size: 18px;
          margin: 12px 0 6px;
        }
      }

      .profile-info {
        .info-item {
          padding: 10px 0;
          flex-wrap: wrap;

          .anticon {
            font-size: 14px;
            margin-right: 8px;
          }

          .label {
            font-size: 13px;
          }

          .value {
            font-size: 13px;
            word-break: break-all;
          }
        }
      }
    }

    // Credits card adjustments
    .credits-card {
      border-radius: 10px;

      .credits-header {
        .credits-title {
          font-size: 15px;

          .anticon {
            font-size: 16px;
          }
        }
      }

      .credits-body {
        padding: 16px 0;

        .credits-amount {
          .amount-value {
            font-size: 32px;
          }

          .amount-label {
            font-size: 14px;
          }
        }

        .vip-status {
          font-size: 12px;
          margin-top: 10px;
        }
      }

      .credits-actions {
        .ant-btn {
          height: 34px;
          padding: 0 20px;
          font-size: 14px;
        }
      }

      .credits-hint {
        font-size: 11px;
        margin-top: 10px;
      }
    }

    // Referral card adjustments
    .referral-card {
      border-radius: 10px;

      .referral-header {
        .referral-title {
          font-size: 15px;

          .anticon {
            font-size: 16px;
          }
        }
      }

      .referral-body {
        padding: 10px 0;

        .referral-stats {
          .stat-item {
            .stat-value {
              font-size: 24px;
            }

            .stat-label {
              font-size: 11px;
            }
          }
        }

        .referral-link-section {
          .link-label {
            font-size: 11px;
          }

          .link-box {
            ::v-deep .ant-input {
              font-size: 12px;
            }
          }
        }

        .referral-hint {
          font-size: 11px;
          padding-top: 8px;
        }
      }
    }

    // Edit card adjustments
    .edit-card {
      border-radius: 10px;
      margin-top: 12px !important;

      ::v-deep .ant-card-body {
        padding: 12px;
      }

      ::v-deep .ant-tabs-nav {
        .ant-tabs-tab {
          padding: 10px 12px;
          font-size: 13px;
        }
      }

      // Allow horizontal scroll for tabs on mobile
      ::v-deep .ant-tabs-nav-scroll {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;

        &::-webkit-scrollbar {
          display: none;
        }
      }

      .profile-form,
      .password-form {
        max-width: 100%;

        ::v-deep .ant-form-item-label {
          padding-bottom: 4px;

          label {
            font-size: 13px;
          }
        }

        ::v-deep .ant-input,
        ::v-deep .ant-input-password {
          font-size: 14px;
        }

        .email-hint {
          font-size: 11px;
        }
      }

      // Password form - verification code section
      .password-form {
        ::v-deep .ant-alert {
          font-size: 12px;
          padding: 8px 12px;
        }
      }

      .security-section {
        max-width: 100%;
      }

      .mfa-card {
        flex-direction: column;
        padding: 16px;
      }

      .mfa-card-main {
        gap: 12px;
      }

      .mfa-actions {
        width: 100%;

        .ant-btn {
          width: 100%;
        }
      }

      .mfa-feature-list {
        gap: 6px;

        span {
          max-width: 100%;
        }
      }

      // Notification settings form
      .notification-settings-form {
        ::v-deep .ant-alert {
          font-size: 12px;
          padding: 8px 12px;
          margin-bottom: 16px !important;
        }

        ::v-deep .ant-form {
          max-width: 100%;
        }

        ::v-deep .ant-checkbox-group {
          .ant-row {
            margin-left: 0 !important;
            margin-right: 0 !important;

            .ant-col {
              padding-left: 0 !important;
              padding-right: 8px !important;
            }
          }

          .ant-checkbox-wrapper {
            font-size: 13px;
            margin-bottom: 6px;
          }
        }

        .field-hint {
          font-size: 11px;
          flex-wrap: wrap;
        }

        ::v-deep .ant-form-item {
          margin-bottom: 16px;
        }

        // Action buttons
        ::v-deep .ant-form-item:last-child {
          .ant-btn {
            width: 100%;
            margin-bottom: 8px;

            & + .ant-btn {
              margin-left: 0 !important;
            }
          }
        }
      }

      // Tables in tabs
      ::v-deep .ant-table-wrapper {
        overflow-x: auto;

        .ant-table {
          min-width: 500px;
        }
      }
    }

    // Referral user cell in table
    .referral-user-cell {
      gap: 8px;

      ::v-deep .ant-avatar {
        width: 28px !important;
        height: 28px !important;
        line-height: 28px !important;
      }

      .user-info {
        .nickname {
          font-size: 13px;
        }

        .username {
          font-size: 11px;
        }
      }
    }
  }
}

// Extra small devices (phones in portrait)
@media screen and (max-width: 480px) {
  .profile-page {
    padding: 8px;

    .page-header {
      margin-bottom: 12px;

      .page-title {
        font-size: 18px;
        gap: 8px;

        .anticon {
          font-size: 20px;
        }
      }
    }

    // Credits card
    .credits-card {
      .credits-body {
        .credits-amount {
          .amount-value {
            font-size: 28px;
          }

          .amount-label {
            font-size: 13px;
          }
        }
      }

      .credits-actions {
        .ant-btn {
          width: 100%;
        }
      }
    }

    // Referral card
    .referral-card {
      .referral-body {
        .referral-stats {
          .stat-item {
            .stat-value {
              font-size: 20px;
            }
          }
        }
      }
    }

    // Edit card
    .edit-card {
      ::v-deep .ant-tabs-nav {
        .ant-tabs-tab {
          padding: 8px 10px;
          font-size: 12px;
        }
      }

      // Notification settings - stack checkboxes
      .notification-settings-form {
        ::v-deep .ant-checkbox-group {
          .ant-row {
            .ant-col {
              flex: 0 0 50%;
              max-width: 50%;
            }
          }
        }
      }
    }
  }
}
</style>

<style lang="less">
.profile-mfa-modal {
  .ant-modal {
    max-width: calc(100vw - 24px);
  }

  .ant-modal-content {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 18px 56px rgba(15, 23, 42, 0.22);
  }

  .ant-modal-header {
    padding: 18px 24px 14px;
    border-bottom-color: #edf0f5;
  }

  .ant-modal-title {
    color: #172033;
    font-size: 16px;
    font-weight: 700;
  }

  .ant-modal-body {
    padding: 18px 24px 22px;
  }

  .mfa-setup-modal {
    .mfa-setup-head {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 18px;
    }

    .mfa-setup-badge {
      width: 34px;
      height: 34px;
      flex: 0 0 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      color: var(--primary-color, #1890ff);
      background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, #fff);
      border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 22%, #fff);
    }

    .mfa-setup-heading {
      color: #172033;
      font-size: 15px;
      font-weight: 700;
      line-height: 22px;
    }

    .mfa-setup-subtitle {
      max-width: 390px;
      margin-top: 2px;
      color: #65758b;
      font-size: 13px;
      line-height: 1.55;
    }

    .mfa-qr-card {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 18px;
      padding: 18px;
      border: 1px solid #e7edf5;
      border-radius: 8px;
      background: linear-gradient(180deg, #fbfdff 0%, #f6f9fd 100%);
    }

    .mfa-qr {
      display: block;
      width: 264px;
      max-width: 100%;
      height: auto;
      aspect-ratio: 1;
      object-fit: contain;
      padding: 10px;
      border: 1px solid #dbe4ef;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
    }

    .mfa-field {
      margin-bottom: 14px;

      label {
        display: block;
        margin-bottom: 7px;
        color: #536274;
        font-size: 13px;
        font-weight: 600;
        line-height: 18px;
      }
    }

    .ant-input-affix-wrapper,
    .ant-input {
      border-radius: 6px;
    }

    .mfa-secret-input .ant-input {
      font-family: Consolas, Monaco, monospace;
      font-size: 13px;
      letter-spacing: 0;
    }

    .anticon-copy {
      cursor: pointer;
      color: #7b8794;
      transition: color 0.2s ease;

      &:hover {
        color: var(--primary-color, #1890ff);
      }
    }

    .mfa-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid #edf0f5;

      .ant-btn {
        min-width: 96px;
        height: 36px;
        border-radius: 6px;
      }
    }
  }

  .mfa-recovery-grid {
    code {
      border: 1px solid #e8edf5;
    }
  }
}

.profile-mfa-modal--dark {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body,
  .ant-modal-footer {
    background: #1c1f26 !important;
  }

  .ant-modal-header,
  .ant-modal-footer {
    border-color: #2f3642 !important;
  }

  .ant-modal-title,
  .ant-modal-close-x {
    color: #e6edf3 !important;
  }

  .mfa-setup-modal {
    color: #c9d1d9;

    .mfa-setup-badge {
      color: var(--primary-color, #1890ff);
      background: color-mix(in srgb, var(--primary-color, #1890ff) 16%, #1c1f26);
      border-color: color-mix(in srgb, var(--primary-color, #1890ff) 28%, #303845);
    }

    .mfa-setup-heading {
      color: #e6edf3;
    }

    .mfa-setup-subtitle {
      color: #9aa4b2;
    }

    .mfa-qr-card {
      background: #151a22;
      border-color: #303845;
    }

    .mfa-qr {
      border-color: #3a4352;
      background: #ffffff;
    }

    .mfa-field label {
      color: #9aa4b2;
    }

    .ant-input {
      background: #11161d !important;
      border-color: #303845 !important;
      color: #dbe4ef !important;
    }

    .anticon-copy {
      color: #8995a3;

      &:hover {
        color: var(--primary-color, #1890ff);
      }
    }

    .mfa-modal-actions {
      border-top-color: #303845;
    }
  }

  .mfa-recovery-grid {
    code {
      background: #11161d;
      border-color: #303845;
      color: #dbe4ef;
    }
  }
}

@media screen and (max-width: 560px) {
  .profile-mfa-modal {
    .ant-modal {
      top: 24px;
    }

    .ant-modal-body {
      padding: 16px;
    }

    .mfa-setup-modal {
      .mfa-qr {
        width: 220px;
      }

      .mfa-modal-actions {
        flex-direction: column-reverse;

        .ant-btn {
          width: 100%;
        }
      }
    }

    .mfa-recovery-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
