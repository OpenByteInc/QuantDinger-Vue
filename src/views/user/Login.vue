<template>
  <div class="main">
    <div class="auth-intro">
      <div class="desc">AI driven quantitative insights for global markets</div>
    </div>

    <div class="auth-card">
      <!-- OAuth Token Handler (invisible) -->
      <div v-if="oauthProcessing" class="oauth-processing">
        <a-spin size="large" />
        <p>{{ $t('user.oauth.processing') || 'Processing login...' }}</p>
      </div>

      <!-- Main Content -->
      <div v-show="!oauthProcessing">
        <!-- Tabs: Login / Register -->
        <a-tabs v-model="activeTab" :animated="false">
          <!-- Login Tab -->
          <a-tab-pane key="login" :tab="$t('user.login.tab') || 'Login'">
            <!-- Login Method Switch -->
            <div class="login-method-switch">
              <a
                :class="{ active: loginMethod === 'password' }"
                @click="loginMethod = 'password'"
              >{{ $t('user.login.methodPassword') || 'Password' }}</a>
              <a-divider type="vertical" />
              <a
                :class="{ active: loginMethod === 'code' }"
                @click="loginMethod = 'code'"
              >{{ $t('user.login.methodCode') || 'Email Code' }}</a>
            </div>

            <!-- Password Login Form -->
            <a-form
              v-show="loginMethod === 'password'"
              id="formLogin"
              class="auth-form"
              ref="formLogin"
              :form="loginForm"
              @submit="handleLogin"
            >
              <a-alert v-if="loginError" type="error" showIcon style="margin-bottom: 24px;" :message="loginError" />
              <a-alert v-if="oauthError" type="error" showIcon style="margin-bottom: 24px;" :message="oauthError" />

              <a-form-item>
                <a-input
                  size="large"
                  type="text"
                  :placeholder="$t('user.login.username') || 'Username'"
                  v-decorator="[
                    'username',
                    {rules: [{ required: true, message: $t('user.login.usernameRequired') || 'Please enter username' }], validateTrigger: 'blur'}
                  ]"
                >
                  <a-icon slot="prefix" type="user" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                </a-input>
              </a-form-item>

              <a-form-item>
                <a-input-password
                  size="large"
                  :placeholder="$t('user.login.password') || 'Password'"
                  v-decorator="[
                    'password',
                    {rules: [{ required: true, message: $t('user.login.passwordRequired') || 'Please enter password' }], validateTrigger: 'blur'}
                  ]"
                >
                  <a-icon slot="prefix" type="lock" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                </a-input-password>
              </a-form-item>

              <!-- Turnstile for Login -->
              <Turnstile
                ref="loginTurnstile"
                :siteKey="securityConfig.turnstile_site_key"
                :enabled="securityConfig.turnstile_enabled"
                @success="(t) => loginTurnstileToken = t"
                @error="() => loginTurnstileToken = null"
              />

              <a-form-item style="margin-top:24px">
                <a-button
                  size="large"
                  type="primary"
                  htmlType="submit"
                  class="submit-button"
                  :loading="loginLoading"
                  :disabled="loginLoading || (securityConfig.turnstile_enabled && !loginTurnstileToken)"
                  block
                >{{ $t('user.login.submit') || 'Login' }}</a-button>
              </a-form-item>

              <!-- Forgot Password Link -->
              <div class="auth-links">
                <a @click="showResetModal = true">{{ $t('user.login.forgotPassword') || 'Forgot Password?' }}</a>
              </div>
            </a-form>

            <!-- Email Code Login Form -->
            <a-form
              v-show="loginMethod === 'code'"
              id="formCodeLogin"
              class="auth-form"
              ref="formCodeLogin"
              :form="codeLoginForm"
              @submit="handleCodeLogin"
            >
              <a-alert v-if="codeLoginError" type="error" showIcon style="margin-bottom: 24px;" :message="codeLoginError" />
              <a-alert v-if="oauthError" type="error" showIcon style="margin-bottom: 24px;" :message="oauthError" />

              <a-form-item>
                <a-input
                  size="large"
                  type="email"
                  :placeholder="$t('user.login.email') || 'Email'"
                  v-decorator="[
                    'email',
                    {
                      rules: [
                        { required: true, message: $t('user.login.emailRequired') || 'Please enter email' },
                        { type: 'email', message: $t('user.login.emailInvalid') || 'Invalid email format' }
                      ],
                      validateTrigger: 'blur'
                    }
                  ]"
                >
                  <a-icon slot="prefix" type="mail" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                </a-input>
              </a-form-item>

              <a-form-item>
                <a-row :gutter="12">
                  <a-col :span="16">
                    <a-input
                      size="large"
                      :placeholder="$t('user.login.verificationCode') || 'Verification Code'"
                      v-decorator="[
                        'code',
                        {
                          rules: [{ required: true, message: $t('user.login.codeRequired') || 'Please enter verification code' }],
                          validateTrigger: 'blur'
                        }
                      ]"
                    >
                      <a-icon slot="prefix" type="safety-certificate" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                    </a-input>
                  </a-col>
                  <a-col :span="8">
                    <a-button
                      size="large"
                      block
                      :loading="codeLoginSendingCode"
                      :disabled="codeLoginSendingCode || codeLoginCountdown > 0"
                      @click="handleCodeLoginSendCode"
                    >
                      {{ codeLoginCountdown > 0 ? `${codeLoginCountdown}s` : ($t('user.login.sendCode') || 'Send') }}
                    </a-button>
                  </a-col>
                </a-row>
              </a-form-item>

              <Turnstile
                ref="codeLoginTurnstile"
                :siteKey="securityConfig.turnstile_site_key"
                :enabled="securityConfig.turnstile_enabled"
                @success="(t) => codeLoginTurnstileToken = t"
                @error="() => codeLoginTurnstileToken = null"
              />

              <a-form-item style="margin-top:24px">
                <a-button
                  size="large"
                  type="primary"
                  htmlType="submit"
                  class="submit-button"
                  :loading="codeLoginLoading"
                  :disabled="codeLoginLoading || (securityConfig.turnstile_enabled && !codeLoginTurnstileToken)"
                  block
                >{{ $t('user.login.submit') || 'Login' }}</a-button>
              </a-form-item>

              <div class="code-login-hint">
                <a-icon type="info-circle" />
                <span>{{ $t('user.login.codeLoginHint') || 'New users will be automatically registered' }}</span>
              </div>
            </a-form>

            <!-- OAuth Login -->
            <div v-if="hasOAuth" class="oauth-section">
              <a-divider>{{ $t('user.login.orLoginWith') || 'Or login with' }}</a-divider>
              <div class="oauth-buttons">
                <a-button
                  v-if="securityConfig.oauth_google_enabled"
                  class="oauth-btn google-btn"
                  @click="handleGoogleLogin"
                >
                  <svg class="oauth-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </a-button>
                <a-button
                  v-if="securityConfig.oauth_github_enabled"
                  class="oauth-btn github-btn"
                  @click="handleGitHubLogin"
                >
                  <a-icon type="github" />
                  GitHub
                </a-button>
              </div>
            </div>
          </a-tab-pane>

          <!-- Register Tab -->
          <a-tab-pane v-if="securityConfig.registration_enabled" key="register" :tab="$t('user.register.tab') || 'Register'">
            <a-form
              id="formRegister"
              class="auth-form"
              ref="formRegister"
              :form="registerForm"
              @submit="handleRegister"
            >
              <a-alert v-if="registerError" type="error" showIcon style="margin-bottom: 24px;" :message="registerError" />

              <!-- Email -->
              <a-form-item>
                <a-input
                  size="large"
                  type="email"
                  :placeholder="$t('user.register.email') || 'Email'"
                  v-decorator="[
                    'email',
                    {
                      rules: [
                        { required: true, message: $t('user.register.emailRequired') || 'Please enter email' },
                        { type: 'email', message: $t('user.register.emailInvalid') || 'Invalid email format' }
                      ],
                      validateTrigger: 'blur'
                    }
                  ]"
                >
                  <a-icon slot="prefix" type="mail" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                </a-input>
              </a-form-item>

              <!-- Verification Code -->
              <a-form-item>
                <a-row :gutter="12">
                  <a-col :span="16">
                    <a-input
                      size="large"
                      :placeholder="$t('user.register.verificationCode') || 'Verification Code'"
                      v-decorator="[
                        'code',
                        {
                          rules: [{ required: true, message: $t('user.register.codeRequired') || 'Please enter verification code' }],
                          validateTrigger: 'blur'
                        }
                      ]"
                    >
                      <a-icon slot="prefix" type="safety-certificate" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                    </a-input>
                  </a-col>
                  <a-col :span="8">
                    <a-button
                      size="large"
                      block
                      :loading="registerSendingCode"
                      :disabled="registerSendingCode || registerCountdown > 0"
                      @click="handleRegisterSendCode"
                    >
                      {{ registerCountdown > 0 ? `${registerCountdown}s` : ($t('user.register.sendCode') || 'Send') }}
                    </a-button>
                  </a-col>
                </a-row>
              </a-form-item>

              <!-- Username -->
              <a-form-item>
                <a-input
                  size="large"
                  :placeholder="$t('user.register.username') || 'Username'"
                  v-decorator="[
                    'username',
                    {
                      rules: [
                        { required: true, message: $t('user.register.usernameRequired') || 'Please enter username' },
                        { min: 3, max: 30, message: $t('user.register.usernameLength') || 'Username must be 3-30 characters' },
                        { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: $t('user.register.usernamePattern') || 'Start with letter, letters/numbers/underscore only' }
                      ],
                      validateTrigger: 'blur'
                    }
                  ]"
                >
                  <a-icon slot="prefix" type="user" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                </a-input>
              </a-form-item>

              <!-- Password with requirements popover -->
              <a-form-item>
                <a-popover
                  placement="rightTop"
                  :trigger="['focus']"
                  :visible="regPwdFocused && !regPwdValid"
                >
                  <template slot="content">
                    <div class="password-requirements">
                      <div :class="{ valid: regHasMinLength }">
                        <a-icon :type="regHasMinLength ? 'check-circle' : 'close-circle'" />
                        {{ $t('user.register.pwdMinLength') || 'At least 8 characters' }}
                      </div>
                      <div :class="{ valid: regHasUppercase }">
                        <a-icon :type="regHasUppercase ? 'check-circle' : 'close-circle'" />
                        {{ $t('user.register.pwdUppercase') || 'At least one uppercase letter' }}
                      </div>
                      <div :class="{ valid: regHasLowercase }">
                        <a-icon :type="regHasLowercase ? 'check-circle' : 'close-circle'" />
                        {{ $t('user.register.pwdLowercase') || 'At least one lowercase letter' }}
                      </div>
                      <div :class="{ valid: regHasNumber }">
                        <a-icon :type="regHasNumber ? 'check-circle' : 'close-circle'" />
                        {{ $t('user.register.pwdNumber') || 'At least one number' }}
                      </div>
                    </div>
                  </template>
                  <a-input-password
                    size="large"
                    :placeholder="$t('user.register.password') || 'Password'"
                    @focus="regPwdFocused = true"
                    @blur="regPwdFocused = false"
                    @change="checkRegPassword"
                    v-decorator="[
                      'password',
                      {
                        rules: [
                          { required: true, message: $t('user.register.passwordRequired') || 'Please enter password' },
                          { validator: validateRegPassword }
                        ],
                        validateTrigger: 'blur'
                      }
                    ]"
                  >
                    <a-icon slot="prefix" type="lock" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                  </a-input-password>
                </a-popover>
              </a-form-item>

              <!-- Confirm Password -->
              <a-form-item>
                <a-input-password
                  size="large"
                  :placeholder="$t('user.register.confirmPassword') || 'Confirm Password'"
                  v-decorator="[
                    'confirmPassword',
                    {
                      rules: [
                        { required: true, message: $t('user.register.confirmPasswordRequired') || 'Please confirm password' },
                        { validator: validateRegConfirmPassword }
                      ],
                      validateTrigger: 'blur'
                    }
                  ]"
                >
                  <a-icon slot="prefix" type="lock" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                </a-input-password>
              </a-form-item>

              <!-- Turnstile for Register -->
              <Turnstile
                ref="registerTurnstile"
                :siteKey="securityConfig.turnstile_site_key"
                :enabled="securityConfig.turnstile_enabled"
                @success="(t) => registerTurnstileToken = t"
                @error="() => registerTurnstileToken = null"
              />

              <a-form-item style="margin-top:24px">
                <a-button
                  size="large"
                  type="primary"
                  htmlType="submit"
                  class="submit-button"
                  :loading="registerLoading"
                  :disabled="registerLoading || (securityConfig.turnstile_enabled && !registerTurnstileToken)"
                  block
                >{{ $t('user.register.submit') || 'Create Account' }}</a-button>
              </a-form-item>
            </a-form>
          </a-tab-pane>
        </a-tabs>

        <!-- Legal Agreement -->
        <div class="legal-wrap">
          <div class="legal-header">
            <div class="legal-title">{{ $t('user.login.legal.title') }}</div>
            <a class="legal-toggle" @click="showLegal = !showLegal">
              {{ showLegal ? $t('user.login.legal.collapse') : $t('user.login.legal.view') }}
            </a>
          </div>
          <div v-show="showLegal" class="legal-content">
            {{ $t('user.login.legal.content') }}
          </div>
          <div class="legal-agree">
            <a-checkbox v-model="legalAgreed">
              {{ $t('user.login.legal.agree') }}
            </a-checkbox>
            <div v-if="legalError" class="legal-error">{{ $t('user.login.legal.required') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- MFA Login Modal -->
    <a-modal
      v-model="mfaLoginVisible"
      :title="$t('user.login.mfa.title') || 'Two-step verification'"
      :confirmLoading="mfaLoginLoading"
      :okText="$t('user.login.mfa.verify') || 'Verify'"
      :cancelText="$t('common.cancel') || 'Cancel'"
      :destroyOnClose="true"
      @ok="handleMfaLoginVerify"
      @cancel="resetMfaLogin"
    >
      <div class="mfa-login-panel">
        <a-alert
          type="info"
          showIcon
          :message="$t('user.login.mfa.hint') || 'Open your authenticator app and enter the 6-digit code for this account.'"
          style="margin-bottom: 16px"
        />
        <a-input
          v-model="mfaLoginCode"
          size="large"
          :maxLength="16"
          autocomplete="one-time-code"
          :placeholder="$t('user.login.mfa.placeholder') || '6-digit code'"
          @pressEnter="handleMfaLoginVerify"
        >
          <a-icon slot="prefix" type="safety-certificate" />
        </a-input>
        <div v-if="mfaLoginError" class="mfa-login-error">{{ mfaLoginError }}</div>
      </div>
    </a-modal>

    <!-- Reset Password Modal -->
    <a-modal
      v-model="showResetModal"
      :title="$t('user.resetPassword.title') || 'Reset Password'"
      :footer="null"
      :width="420"
      :destroyOnClose="true"
      @cancel="resetResetModal"
    >
      <!-- Step 1: Email & Code -->
      <a-form
        v-if="resetStep === 1"
        class="auth-form"
        :form="resetForm"
        @submit="handleResetVerify"
      >
        <a-alert v-if="resetError" type="error" showIcon style="margin-bottom: 24px;" :message="resetError" />

        <a-form-item>
          <a-input
            size="large"
            type="email"
            :placeholder="$t('user.resetPassword.email') || 'Email'"
            v-decorator="[
              'email',
              {
                rules: [
                  { required: true, message: $t('user.resetPassword.emailRequired') || 'Please enter email' },
                  { type: 'email', message: $t('user.resetPassword.emailInvalid') || 'Invalid email format' }
                ],
                validateTrigger: 'blur'
              }
            ]"
          >
            <a-icon slot="prefix" type="mail" :style="{ color: 'rgba(0,0,0,.25)' }"/>
          </a-input>
        </a-form-item>

        <a-form-item>
          <a-row :gutter="12">
            <a-col :span="16">
              <a-input
                size="large"
                :placeholder="$t('user.resetPassword.verificationCode') || 'Verification Code'"
                v-decorator="[
                  'code',
                  {
                    rules: [{ required: true, message: $t('user.resetPassword.codeRequired') || 'Please enter verification code' }],
                    validateTrigger: 'blur'
                  }
                ]"
              >
                <a-icon slot="prefix" type="safety-certificate" :style="{ color: 'rgba(0,0,0,.25)' }"/>
              </a-input>
            </a-col>
            <a-col :span="8">
              <a-button
                size="large"
                block
                :loading="resetSendingCode"
                :disabled="resetSendingCode || resetCountdown > 0"
                @click="handleResetSendCode"
              >
                {{ resetCountdown > 0 ? `${resetCountdown}s` : ($t('user.resetPassword.sendCode') || 'Send') }}
              </a-button>
            </a-col>
          </a-row>
        </a-form-item>

        <Turnstile
          ref="resetTurnstile"
          :siteKey="securityConfig.turnstile_site_key"
          :enabled="securityConfig.turnstile_enabled"
          @success="(t) => resetTurnstileToken = t"
          @error="() => resetTurnstileToken = null"
        />

        <a-form-item style="margin-top:24px">
          <a-button
            size="large"
            type="primary"
            htmlType="submit"
            class="submit-button"
            :disabled="securityConfig.turnstile_enabled && !resetTurnstileToken"
            block
          >{{ $t('user.resetPassword.next') || 'Next' }}</a-button>
        </a-form-item>
      </a-form>

      <!-- Step 2: New Password -->
      <a-form
        v-if="resetStep === 2"
        class="auth-form"
        :form="resetPwdForm"
        @submit="handleResetPassword"
      >
        <a-alert v-if="resetError" type="error" showIcon style="margin-bottom: 24px;" :message="resetError" />

        <div class="email-display">
          <span>{{ $t('user.resetPassword.resettingFor') || 'Resetting for' }}:</span>
          <strong>{{ resetEmail }}</strong>
        </div>

        <a-form-item>
          <a-popover
            placement="rightTop"
            :trigger="['focus']"
            :visible="resetPwdFocused && !resetPwdValid"
          >
            <template slot="content">
              <div class="password-requirements">
                <div :class="{ valid: resetHasMinLength }">
                  <a-icon :type="resetHasMinLength ? 'check-circle' : 'close-circle'" />
                  {{ $t('user.register.pwdMinLength') || 'At least 8 characters' }}
                </div>
                <div :class="{ valid: resetHasUppercase }">
                  <a-icon :type="resetHasUppercase ? 'check-circle' : 'close-circle'" />
                  {{ $t('user.register.pwdUppercase') || 'At least one uppercase letter' }}
                </div>
                <div :class="{ valid: resetHasLowercase }">
                  <a-icon :type="resetHasLowercase ? 'check-circle' : 'close-circle'" />
                  {{ $t('user.register.pwdLowercase') || 'At least one lowercase letter' }}
                </div>
                <div :class="{ valid: resetHasNumber }">
                  <a-icon :type="resetHasNumber ? 'check-circle' : 'close-circle'" />
                  {{ $t('user.register.pwdNumber') || 'At least one number' }}
                </div>
              </div>
            </template>
            <a-input-password
              size="large"
              :placeholder="$t('user.resetPassword.newPassword') || 'New Password'"
              @focus="resetPwdFocused = true"
              @blur="resetPwdFocused = false"
              @change="checkResetPassword"
              v-decorator="[
                'new_password',
                {
                  rules: [
                    { required: true, message: $t('user.resetPassword.passwordRequired') || 'Please enter new password' },
                    { validator: validateResetPassword }
                  ],
                  validateTrigger: 'blur'
                }
              ]"
            >
              <a-icon slot="prefix" type="lock" :style="{ color: 'rgba(0,0,0,.25)' }"/>
            </a-input-password>
          </a-popover>
        </a-form-item>

        <a-form-item>
          <a-input-password
            size="large"
            :placeholder="$t('user.resetPassword.confirmPassword') || 'Confirm Password'"
            v-decorator="[
              'confirm_password',
              {
                rules: [
                  { required: true, message: $t('user.resetPassword.confirmPasswordRequired') || 'Please confirm password' },
                  { validator: validateResetConfirmPassword }
                ],
                validateTrigger: 'blur'
              }
            ]"
          >
            <a-icon slot="prefix" type="lock" :style="{ color: 'rgba(0,0,0,.25)' }"/>
          </a-input-password>
        </a-form-item>

        <a-form-item style="margin-top:24px">
          <a-button
            size="large"
            type="primary"
            htmlType="submit"
            class="submit-button"
            :loading="resetLoading"
            block
          >{{ $t('user.resetPassword.submit') || 'Reset Password' }}</a-button>
        </a-form-item>

        <div class="auth-links">
          <a @click="resetStep = 1">
            <a-icon type="arrow-left" />
            {{ $t('user.resetPassword.back') || 'Back' }}
          </a>
        </div>
      </a-form>

      <!-- Step 3: Success -->
      <div v-if="resetStep === 3" class="success-panel">
        <a-result
          status="success"
          :title="$t('user.resetPassword.successTitle') || 'Password Reset Successful'"
          :sub-title="$t('user.resetPassword.successSubtitle') || 'You can now login with your new password'"
        >
          <template #extra>
            <a-button type="primary" @click="showResetModal = false; activeTab = 'login'">
              {{ $t('user.resetPassword.goToLogin') || 'Go to Login' }}
            </a-button>
          </template>
        </a-result>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import { timeFix } from '@/utils/util'
import { getSecurityConfig, sendVerificationCode, register, resetPassword, loginWithCode, getGoogleOAuthUrl, getGitHubOAuthUrl, verifyLoginMfa } from '@/api/auth'
import Turnstile from '@/components/Turnstile/index.vue'
import storage from 'store'
import { ACCESS_TOKEN, USER_INFO, USER_ROLES } from '@/store/mutation-types'
import { promptChangeInitialPassword } from '@/utils/initialPasswordReminder'

export default {
  name: 'Login',
  components: {
    Turnstile
  },
  data () {
    return {
      activeTab: 'login',
      showLegal: false,
      legalAgreed: true,
      legalError: false,

      // Security config
      securityConfig: {
        turnstile_enabled: false,
        turnstile_site_key: '',
        registration_enabled: true,
        oauth_google_enabled: false,
        oauth_github_enabled: false
      },

      // OAuth
      oauthProcessing: false,
      oauthError: null,

      // Referral code from URL
      referralCode: '',

      // Login Method
      loginMethod: 'password', // 'password' or 'code'

      // Password Login
      loginForm: this.$form.createForm(this, { name: 'loginForm' }),
      loginError: '',
      loginLoading: false,
      loginTurnstileToken: null,
      mfaLoginVisible: false,
      mfaLoginLoading: false,
      mfaLoginCode: '',
      mfaLoginError: '',
      mfaChallengeId: '',

      // Email Code Login
      codeLoginForm: this.$form.createForm(this, { name: 'codeLoginForm' }),
      codeLoginError: '',
      codeLoginLoading: false,
      codeLoginTurnstileToken: null,
      codeLoginSendingCode: false,
      codeLoginCountdown: 0,
      codeLoginCountdownTimer: null,

      // Register
      registerForm: this.$form.createForm(this, { name: 'registerForm' }),
      registerError: '',
      registerLoading: false,
      registerTurnstileToken: null,
      registerSendingCode: false,
      registerCountdown: 0,
      registerCountdownTimer: null,
      regPwdFocused: false,
      regHasMinLength: false,
      regHasUppercase: false,
      regHasLowercase: false,
      regHasNumber: false,

      // Reset Password Modal
      showResetModal: false,
      resetStep: 1,
      resetForm: this.$form.createForm(this, { name: 'resetForm' }),
      resetPwdForm: this.$form.createForm(this, { name: 'resetPwdForm' }),
      resetError: '',
      resetLoading: false,
      resetTurnstileToken: null,
      resetSendingCode: false,
      resetCountdown: 0,
      resetCountdownTimer: null,
      resetEmail: '',
      resetCode: '',
      resetPwdFocused: false,
      resetHasMinLength: false,
      resetHasUppercase: false,
      resetHasLowercase: false,
      resetHasNumber: false
    }
  },
  computed: {
    hasOAuth () {
      return this.securityConfig.oauth_google_enabled || this.securityConfig.oauth_github_enabled
    },
    regPwdValid () {
      return this.regHasMinLength && this.regHasUppercase && this.regHasLowercase && this.regHasNumber
    },
    resetPwdValid () {
      return this.resetHasMinLength && this.resetHasUppercase && this.resetHasLowercase && this.resetHasNumber
    }
  },
  created () {
    this.loadSecurityConfig()
    this.handleOAuthCallback()
    // Extract referral code after route is ready
    this.$nextTick(() => {
      this.extractReferralCode()
    })
  },
  watch: {
    '$route.query' () {
      // Re-extract referral code when route query changes
      this.extractReferralCode()
    }
  },
  beforeDestroy () {
    if (this.codeLoginCountdownTimer) clearInterval(this.codeLoginCountdownTimer)
    if (this.registerCountdownTimer) clearInterval(this.registerCountdownTimer)
    if (this.resetCountdownTimer) clearInterval(this.resetCountdownTimer)
  },
  methods: {
    ...mapActions(['Login', 'Logout']),

    async loadSecurityConfig () {
      try {
        const res = await getSecurityConfig()
        if (res.code === 1 && res.data) {
          this.securityConfig = { ...this.securityConfig, ...res.data }
        }
      } catch (e) {
        console.error('Failed to load security config:', e)
      }
    },

    extractReferralCode () {
      // Extract referral code from URL: ?ref=123 or &ref=123
      // Support both regular query params and hash-based routing
      const urlParams = new URLSearchParams(window.location.search)

      // For hash-based routing (e.g., /#/user/login?ref=1)
      let hashParams = new URLSearchParams()
      if (window.location.hash) {
        const hashParts = window.location.hash.split('?')
        if (hashParts.length > 1) {
          hashParams = new URLSearchParams(hashParts[1])
        }
      }

      // Also check router query params (Vue Router)
      const routerRef = this.$route.query.ref || this.$route.query.referral_code

      this.referralCode = routerRef || urlParams.get('ref') || urlParams.get('referral_code') || hashParams.get('ref') || hashParams.get('referral_code') || ''

      if (this.referralCode) {
        console.log('Referral code detected:', this.referralCode)
        // Auto switch to register tab if referral code is present
        if (this.securityConfig.registration_enabled) {
          this.activeTab = 'register'
        }
      }
    },

    handleOAuthCallback () {
      const urlParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '')
      const oauthToken = urlParams.get('oauth_token') || hashParams.get('oauth_token')
      const oauthError = urlParams.get('oauth_error') || hashParams.get('oauth_error')

      if (oauthError) {
        this.oauthError = this.$t(`user.oauth.error.${oauthError}`) || `OAuth error: ${oauthError}`
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0])
        return
      }

      if (oauthToken) {
        this.oauthProcessing = true
        // NOTE: storage expire plugin expects an absolute timestamp (ms since epoch),
        // not a duration. Use "now + 7 days" to avoid immediate expiration.
        storage.set(ACCESS_TOKEN, oauthToken, new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0])
        this.$store.dispatch('GetInfo').then(() => {
          this.$router.push({ path: '/' })
          this.$notification.success({
            message: 'Welcome',
            description: `${timeFix()}, welcome back.`
          })
        }).catch(err => {
          this.oauthProcessing = false
          this.oauthError = 'Failed to get user info'
          console.error('OAuth login error:', err)
          storage.remove(ACCESS_TOKEN)
        })
      }
    },

    // ==================== Password Login ====================
    handleLogin (e) {
      e.preventDefault()
      this.legalError = false
      if (!this.legalAgreed) {
        this.legalError = true
        return
      }

      this.loginForm.validateFields(['username', 'password'], (err, values) => {
        if (err) return

        this.loginLoading = true
        this.loginError = ''

        this.Login({ ...values, turnstile_token: this.loginTurnstileToken })
          .then((res) => {
            if (res && res.data && res.data.mfa_required) {
              this.mfaChallengeId = res.data.challenge_id
              this.mfaLoginCode = ''
              this.mfaLoginError = ''
              this.mfaLoginVisible = true
              return
            }
            this.afterLoginSuccess()
          })
          .catch(err => {
            const response = err.response || {}
            const data = response.data || {}
            this.loginError = data.msg || err.message || 'Login failed'
            if (this.$refs.loginTurnstile) this.$refs.loginTurnstile.reset()
            this.loginTurnstileToken = null
          })
          .finally(() => {
            this.loginLoading = false
          })
      })
    },

    async handleMfaLoginVerify () {
      const code = (this.mfaLoginCode || '').trim()
      if (!code) {
        this.mfaLoginError = this.$t('user.login.mfa.required') || 'Please enter the verification code'
        return
      }
      this.mfaLoginLoading = true
      this.mfaLoginError = ''
      try {
        const res = await verifyLoginMfa({
          challenge_id: this.mfaChallengeId,
          code
        })
        if (res.code === 1 && res.data && res.data.token) {
          this.applyLoginResult(res.data)
          this.resetMfaLogin()
          this.afterLoginSuccess()
        } else {
          this.mfaLoginError = res.msg || this.$t('user.login.mfa.failed') || 'Verification failed'
        }
      } catch (err) {
        this.mfaLoginError = err.response?.data?.msg || err.message || this.$t('user.login.mfa.failed') || 'Verification failed'
      } finally {
        this.mfaLoginLoading = false
      }
    },

    resetMfaLogin () {
      this.mfaLoginVisible = false
      this.mfaLoginCode = ''
      this.mfaLoginError = ''
      this.mfaChallengeId = ''
    },

    afterLoginSuccess () {
      this.$router.push({ path: '/' })
      this.$notification.success({
        message: 'Welcome',
        description: `${timeFix()}, welcome back.`
      })
      this.$nextTick(() => promptChangeInitialPassword())
    },

    applyLoginResult (data) {
      const expiresAt = new Date().getTime() + 7 * 24 * 60 * 60 * 1000
      storage.set(ACCESS_TOKEN, data.token, expiresAt)
      this.$store.commit('SET_TOKEN', data.token)

      if (data.userinfo) {
        const userInfoData = { ...data.userinfo }
        if (typeof userInfoData.is_demo === 'undefined') {
          userInfoData.is_demo = false
        }

        storage.set(USER_INFO, userInfoData, expiresAt)
        this.$store.commit('SET_INFO', userInfoData)

        const name = userInfoData.nickname || userInfoData.username || 'User'
        this.$store.commit('SET_NAME', { name, welcome: timeFix() })
        this.$store.commit('SET_AVATAR', userInfoData.avatar || '/avatar2.jpg')

        let roles = [{ id: 'default', permissionList: [] }]
        if (userInfoData.role) {
          if (Array.isArray(userInfoData.role)) {
            roles = userInfoData.role
          } else if (typeof userInfoData.role === 'object') {
            roles = [userInfoData.role]
          } else {
            roles = [{ id: userInfoData.role, permissionList: [] }]
          }
        }
        storage.set(USER_ROLES, roles, expiresAt)
        this.$store.commit('SET_ROLES', roles)
      }
    },

    // ==================== Email Code Login ====================
    async handleCodeLoginSendCode () {
      this.codeLoginForm.validateFields(['email'], async (err, values) => {
        if (err) return

        this.codeLoginSendingCode = true
        this.codeLoginError = ''

        try {
          const res = await sendVerificationCode({
            email: values.email,
            type: 'login',
            turnstile_token: this.codeLoginTurnstileToken
          })

          if (res.code === 1) {
            this.$message.success(this.$t('user.login.codeSent') || 'Verification code sent')
            this.startCodeLoginCountdown()
          } else {
            this.codeLoginError = res.msg || 'Failed to send code'
          }
        } catch (e) {
          this.codeLoginError = e.response?.data?.msg || 'Failed to send code'
        } finally {
          this.codeLoginSendingCode = false
        }
      })
    },

    startCodeLoginCountdown () {
      this.codeLoginCountdown = 60
      this.codeLoginCountdownTimer = setInterval(() => {
        this.codeLoginCountdown--
        if (this.codeLoginCountdown <= 0) {
          clearInterval(this.codeLoginCountdownTimer)
          this.codeLoginCountdownTimer = null
        }
      }, 1000)
    },

    handleCodeLogin (e) {
      e.preventDefault()
      this.legalError = false
      if (!this.legalAgreed) {
        this.legalError = true
        return
      }

      this.codeLoginForm.validateFields(async (err, values) => {
        if (err) return

        this.codeLoginLoading = true
        this.codeLoginError = ''

        try {
          const res = await loginWithCode({
            email: values.email,
            code: values.code,
            turnstile_token: this.codeLoginTurnstileToken,
            referral_code: this.referralCode
          })

          if (res.code === 1 && res.data?.token) {
            const expiresAt = new Date().getTime() + 7 * 24 * 60 * 60 * 1000
            storage.set(ACCESS_TOKEN, res.data.token, expiresAt)
            this.$store.commit('SET_TOKEN', res.data.token)

            if (res.data.userinfo) {
              const userInfoData = { ...res.data.userinfo }
              if (typeof userInfoData.is_demo === 'undefined') {
                userInfoData.is_demo = false
              }

              storage.set(USER_INFO, userInfoData, expiresAt)
              this.$store.commit('SET_INFO', userInfoData)

              if (userInfoData.nickname) {
                this.$store.commit('SET_NAME', { name: userInfoData.nickname, welcome: timeFix() })
              } else if (userInfoData.username) {
                this.$store.commit('SET_NAME', { name: userInfoData.username, welcome: timeFix() })
              }

              if (userInfoData.avatar) {
                this.$store.commit('SET_AVATAR', userInfoData.avatar)
              }

              let roles = []
              if (userInfoData.role) {
                if (Array.isArray(userInfoData.role)) {
                  roles = userInfoData.role
                } else if (typeof userInfoData.role === 'object') {
                  roles = [userInfoData.role]
                } else {
                  roles = [{ id: userInfoData.role, permissionList: [] }]
                }
              } else {
                roles = [{ id: 'default', permissionList: [] }]
              }
              this.$store.commit('SET_ROLES', roles)
              storage.set(USER_ROLES, roles, expiresAt)
            }

            await this.$nextTick()

            const currentToken = storage.get(ACCESS_TOKEN)
            const currentRoles = this.$store.getters.roles
            console.log('Token after save:', currentToken ? (typeof currentToken === 'string' ? 'string' : typeof currentToken) : 'missing')
            console.log('Roles after save:', currentRoles.length > 0 ? `has ${currentRoles.length} roles` : 'empty')

            if (currentRoles.length === 0) {
              const defaultRoles = [{ id: 'default', permissionList: [] }]
              this.$store.commit('SET_ROLES', defaultRoles)
              storage.set(USER_ROLES, defaultRoles, expiresAt)
            }

            await new Promise(resolve => setTimeout(resolve, 200))

            this.$store.dispatch('ResetRoutes')

            const isNew = res.data.is_new_user
            this.$router.push({ path: '/' }).then(() => {
              this.$notification.success({
                message: isNew ? (this.$t('user.login.welcomeNew') || 'Welcome!') : 'Welcome',
                description: isNew
                  ? (this.$t('user.login.accountCreated') || 'Your account has been created.')
                  : `${timeFix()}, welcome back.`
              })
            }).catch(err => {
              console.error('Router push error:', err)
              this.$notification.success({
                message: isNew ? (this.$t('user.login.welcomeNew') || 'Welcome!') : 'Welcome',
                description: isNew
                  ? (this.$t('user.login.accountCreated') || 'Your account has been created.')
                  : `${timeFix()}, welcome back.`
              })
            })
          } else {
            this.codeLoginError = res.msg || 'Login failed'
            if (this.$refs.codeLoginTurnstile) this.$refs.codeLoginTurnstile.reset()
            this.codeLoginTurnstileToken = null
          }
        } catch (e) {
          this.codeLoginError = e.response?.data?.msg || 'Login failed'
          if (this.$refs.codeLoginTurnstile) this.$refs.codeLoginTurnstile.reset()
          this.codeLoginTurnstileToken = null
        } finally {
          this.codeLoginLoading = false
        }
      })
    },

    // ==================== Register ====================
    checkRegPassword (e) {
      const password = e.target.value || ''
      this.regHasMinLength = password.length >= 8
      this.regHasUppercase = /[A-Z]/.test(password)
      this.regHasLowercase = /[a-z]/.test(password)
      this.regHasNumber = /[0-9]/.test(password)
    },

    validateRegPassword (rule, value, callback) {
      if (!value) { callback(); return }
      if (value.length < 8) { callback(new Error(this.$t('user.register.pwdMinLength') || 'At least 8 characters')); return }
      if (!/[A-Z]/.test(value)) { callback(new Error(this.$t('user.register.pwdUppercase') || 'At least one uppercase letter')); return }
      if (!/[a-z]/.test(value)) { callback(new Error(this.$t('user.register.pwdLowercase') || 'At least one lowercase letter')); return }
      if (!/[0-9]/.test(value)) { callback(new Error(this.$t('user.register.pwdNumber') || 'At least one number')); return }
      callback()
    },

    validateRegConfirmPassword (rule, value, callback) {
      const password = this.registerForm.getFieldValue('password')
      if (value && value !== password) {
        callback(new Error(this.$t('user.register.passwordMismatch') || 'Passwords do not match'))
      } else {
        callback()
      }
    },

    async handleRegisterSendCode () {
      this.registerForm.validateFields(['email'], async (err, values) => {
        if (err) return

        this.registerSendingCode = true
        this.registerError = ''

        try {
          const res = await sendVerificationCode({
            email: values.email,
            type: 'register',
            turnstile_token: this.registerTurnstileToken
          })

          if (res.code === 1) {
            this.$message.success(this.$t('user.register.codeSent') || 'Verification code sent')
            this.startRegisterCountdown()
          } else {
            this.registerError = res.msg || 'Failed to send code'
          }
        } catch (e) {
          this.registerError = e.response?.data?.msg || 'Failed to send code'
        } finally {
          this.registerSendingCode = false
        }
      })
    },

    startRegisterCountdown () {
      this.registerCountdown = 60
      this.registerCountdownTimer = setInterval(() => {
        this.registerCountdown--
        if (this.registerCountdown <= 0) {
          clearInterval(this.registerCountdownTimer)
          this.registerCountdownTimer = null
        }
      }, 1000)
    },

    handleRegister (e) {
      e.preventDefault()
      this.legalError = false
      if (!this.legalAgreed) {
        this.legalError = true
        return
      }

      this.registerForm.validateFields(async (err, values) => {
        if (err) return

        this.registerLoading = true
        this.registerError = ''

        try {
          const res = await register({
            email: values.email,
            code: values.code,
            username: values.username,
            password: values.password,
            turnstile_token: this.registerTurnstileToken,
            referral_code: this.referralCode
          })

          if (res.code === 1) {
            this.$message.success(this.$t('user.register.success') || 'Registration successful')

            if (res.data?.token) {
              const expiresAt = new Date().getTime() + 7 * 24 * 60 * 60 * 1000
              storage.set(ACCESS_TOKEN, res.data.token, expiresAt)
              this.$store.commit('SET_TOKEN', res.data.token)

              if (res.data.userinfo) {
                const userInfoData = { ...res.data.userinfo }
                if (typeof userInfoData.is_demo === 'undefined') {
                  userInfoData.is_demo = false
                }

                storage.set(USER_INFO, userInfoData, expiresAt)
                this.$store.commit('SET_INFO', userInfoData)

                if (userInfoData.nickname) {
                  this.$store.commit('SET_NAME', { name: userInfoData.nickname, welcome: timeFix() })
                } else if (userInfoData.username) {
                  this.$store.commit('SET_NAME', { name: userInfoData.username, welcome: timeFix() })
                }

                if (userInfoData.avatar) {
                  this.$store.commit('SET_AVATAR', userInfoData.avatar)
                }

                let roles = []
                if (userInfoData.role) {
                  if (Array.isArray(userInfoData.role)) {
                    roles = userInfoData.role
                  } else if (typeof userInfoData.role === 'object') {
                    roles = [userInfoData.role]
                  } else {
                    roles = [{ id: userInfoData.role, permissionList: [] }]
                  }
                } else {
                  roles = [{ id: 'default', permissionList: [] }]
                }
              this.$store.commit('SET_ROLES', roles)
              storage.set(USER_ROLES, roles, expiresAt)
              }

              await this.$nextTick()

              const currentToken = storage.get(ACCESS_TOKEN)
              const currentRoles = this.$store.getters.roles
              console.log('Register - Token after save:', currentToken ? (typeof currentToken === 'string' ? 'string' : typeof currentToken) : 'missing')
              console.log('Register - Roles after save:', currentRoles.length > 0 ? `has ${currentRoles.length} roles` : 'empty')

              if (currentRoles.length === 0) {
                const defaultRoles = [{ id: 'default', permissionList: [] }]
                this.$store.commit('SET_ROLES', defaultRoles)
                storage.set(USER_ROLES, defaultRoles, expiresAt)
              }

              await new Promise(resolve => setTimeout(resolve, 200))

              this.$store.dispatch('ResetRoutes')

              this.$router.push({ path: '/' }).then(() => {
                this.$notification.success({
                  message: 'Welcome',
                  description: `${timeFix()}, welcome to QuantDinger!`
                })
              }).catch(err => {
                console.error('Router push error:', err)
                this.$notification.success({
                  message: 'Welcome',
                  description: `${timeFix()}, welcome to QuantDinger!`
                })
              })
            } else {
              this.activeTab = 'login'
              this.$message.info(this.$t('user.register.pleaseLogin') || 'Please login with your new account')
            }
          } else {
            this.registerError = res.msg || 'Registration failed'
            if (this.$refs.registerTurnstile) this.$refs.registerTurnstile.reset()
            this.registerTurnstileToken = null
          }
        } catch (e) {
          this.registerError = e.response?.data?.msg || 'Registration failed'
          if (this.$refs.registerTurnstile) this.$refs.registerTurnstile.reset()
          this.registerTurnstileToken = null
        } finally {
          this.registerLoading = false
        }
      })
    },

    // ==================== Reset Password ====================
    resetResetModal () {
      this.resetStep = 1
      this.resetError = ''
      this.resetEmail = ''
      this.resetCode = ''
      this.resetCountdown = 0
      if (this.resetCountdownTimer) {
        clearInterval(this.resetCountdownTimer)
        this.resetCountdownTimer = null
      }
    },

    async handleResetSendCode () {
      this.resetForm.validateFields(['email'], async (err, values) => {
        if (err) return

        this.resetSendingCode = true
        this.resetError = ''

        try {
          const res = await sendVerificationCode({
            email: values.email,
            type: 'reset_password',
            turnstile_token: this.resetTurnstileToken
          })

          if (res.code === 1) {
            this.$message.success(this.$t('user.resetPassword.codeSent') || 'Verification code sent')
            this.startResetCountdown()
          } else {
            this.resetError = res.msg || 'Failed to send code'
          }
        } catch (e) {
          this.resetError = e.response?.data?.msg || 'Failed to send code'
        } finally {
          this.resetSendingCode = false
        }
      })
    },

    startResetCountdown () {
      this.resetCountdown = 60
      this.resetCountdownTimer = setInterval(() => {
        this.resetCountdown--
        if (this.resetCountdown <= 0) {
          clearInterval(this.resetCountdownTimer)
          this.resetCountdownTimer = null
        }
      }, 1000)
    },

    handleResetVerify (e) {
      e.preventDefault()
      this.resetError = ''

      this.resetForm.validateFields((err, values) => {
        if (err) return

        this.resetEmail = values.email
        this.resetCode = values.code
        this.resetStep = 2
      })
    },

    checkResetPassword (e) {
      const password = e.target.value || ''
      this.resetHasMinLength = password.length >= 8
      this.resetHasUppercase = /[A-Z]/.test(password)
      this.resetHasLowercase = /[a-z]/.test(password)
      this.resetHasNumber = /[0-9]/.test(password)
    },

    validateResetPassword (rule, value, callback) {
      if (!value) { callback(); return }
      if (value.length < 8) { callback(new Error(this.$t('user.register.pwdMinLength') || 'At least 8 characters')); return }
      if (!/[A-Z]/.test(value)) { callback(new Error(this.$t('user.register.pwdUppercase') || 'At least one uppercase letter')); return }
      if (!/[a-z]/.test(value)) { callback(new Error(this.$t('user.register.pwdLowercase') || 'At least one lowercase letter')); return }
      if (!/[0-9]/.test(value)) { callback(new Error(this.$t('user.register.pwdNumber') || 'At least one number')); return }
      callback()
    },

    validateResetConfirmPassword (rule, value, callback) {
      const password = this.resetPwdForm.getFieldValue('new_password')
      if (value && value !== password) {
        callback(new Error(this.$t('user.register.passwordMismatch') || 'Passwords do not match'))
      } else {
        callback()
      }
    },

    async handleResetPassword (e) {
      e.preventDefault()
      this.resetError = ''

      this.resetPwdForm.validateFields(async (err, values) => {
        if (err) return

        this.resetLoading = true

        try {
          const res = await resetPassword({
            email: this.resetEmail,
            code: this.resetCode,
            new_password: values.new_password,
            turnstile_token: this.resetTurnstileToken
          })

          if (res.code === 1) {
            this.resetStep = 3
          } else {
            this.resetError = res.msg || 'Failed to reset password'
            if (res.msg?.includes('code') || res.msg?.includes('expired')) {
              this.resetStep = 1
            }
          }
        } catch (e) {
          this.resetError = e.response?.data?.msg || 'Failed to reset password'
        } finally {
          this.resetLoading = false
        }
      })
    },

    // ==================== OAuth ====================
    handleGoogleLogin () {
      window.location.href = getGoogleOAuthUrl()
    },

    handleGitHubLogin () {
      window.location.href = getGitHubOAuthUrl()
    }
  }
}
</script>

<style lang="less" scoped>
.main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 40px 0;

  .auth-intro {
    text-align: center;
    margin-bottom: 40px;

    .desc {
      margin-top: 12px;
      color: rgba(0, 0, 0, 0.45);
      font-size: 14px;
    }
  }

  .auth-card {
    min-width: 360px;
    width: 420px;
    background: #fff;
    padding: 32px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  .oauth-processing {
    text-align: center;
    padding: 40px 0;

    p {
      margin-top: 16px;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .auth-form {
    .submit-button {
      padding: 0 15px;
      font-size: 16px;
      height: 40px;
    }
  }

  .login-method-switch {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 24px;

    a {
      color: rgba(0, 0, 0, 0.45);
      font-size: 14px;
      cursor: pointer;
      padding: 4px 0;
      border-bottom: 2px solid transparent;
      transition: all 0.3s;

      &:hover {
        color: #1890ff;
      }

      &.active {
        color: #1890ff;
        border-bottom-color: #1890ff;
        font-weight: 500;
      }
    }

    .ant-divider {
      margin: 0 16px;
    }
  }

  .code-login-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 16px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.45);

    .anticon {
      color: #1890ff;
    }
  }

  .auth-links {
    text-align: center;
    margin-top: 16px;
    font-size: 14px;

    a {
      color: #1890ff;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .oauth-section {
    margin-top: 24px;

    .ant-divider {
      color: rgba(0, 0, 0, 0.45);
      font-size: 13px;
    }

    .oauth-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;

      .oauth-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 40px;
        font-size: 14px;

        .oauth-icon {
          width: 18px;
          height: 18px;
        }

        .anticon {
          font-size: 18px;
        }
      }

      .google-btn {
        border-color: #d9d9d9;
        color: rgba(0, 0, 0, 0.65);

        &:hover {
          border-color: #4285F4;
          color: #4285F4;
        }
      }

      .github-btn {
        border-color: #d9d9d9;
        color: rgba(0, 0, 0, 0.65);

        &:hover {
          border-color: #24292e;
          color: #24292e;
        }
      }
    }
  }

  .legal-wrap {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px dashed #f0f0f0;

    .legal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      line-height: 20px;
    }
    .legal-title {
      font-size: 13px;
      font-weight: 600;
      color: rgba(0, 0, 0, 0.75);
    }
    .legal-toggle {
      font-size: 12px;
      color: #1890ff;
      cursor: pointer;
    }
    .legal-content {
      margin-top: 8px;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
      line-height: 1.7;
      white-space: pre-wrap;
    }

    .legal-agree {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .legal-error {
      color: #ff4d4f;
      font-size: 12px;
      line-height: 1.4;
    }
  }

  .mfa-login-panel {
    .mfa-login-error {
      margin-top: 8px;
      color: #ff4d4f;
      font-size: 13px;
      line-height: 1.5;
    }
  }
}

.email-display {
  background: #f5f5f5;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 24px;
  font-size: 14px;

  span {
    color: rgba(0, 0, 0, 0.45);
  }

  strong {
    color: rgba(0, 0, 0, 0.85);
    margin-left: 8px;
  }
}

.success-panel {
  padding: 20px 0;
}

.password-requirements {
  font-size: 13px;

  > div {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    color: #ff4d4f;

    &.valid {
      color: #52c41a;
    }

    .anticon {
      font-size: 14px;
    }
  }
}
</style>
