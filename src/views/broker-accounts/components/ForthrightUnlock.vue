<template>
  <section class="forthright-unlock" :class="{ 'is-dark': isDark, 'is-unlocked': phase === 'unlocked' }">
    <div class="unlock-summary">
      <a-icon :type="phase === 'unlocked' ? 'check-circle' : 'safety-certificate'" class="unlock-icon" />
      <div class="unlock-copy">
        <strong>{{ $t(phase === 'unlocked' ? 'brokerAccounts.forthright.unlocked' : 'brokerAccounts.forthright.unlockTitle') }}</strong>
        <p v-if="phase === 'unlocked'">{{ $t('brokerAccounts.forthright.authorizationRecorded') }}</p>
        <p v-else>{{ $t(phase === 'verify' ? 'brokerAccounts.forthright.secondAuthRequired' : 'brokerAccounts.forthright.unlockHelp') }}</p>
      </div>
      <a-button v-if="phase !== 'unlocked'" :loading="busy" @click="unlock('')">{{ $t('brokerAccounts.forthright.unlock') }}</a-button>
    </div>
    <form v-if="phase === 'verify'" class="unlock-controls" @submit.prevent="unlock(code)">
      <label :for="`forthright-sms-${credentialId}`">{{ $t('brokerAccounts.forthright.smsCode') }}</label>
      <div class="unlock-entry">
        <a-input
          :id="`forthright-sms-${credentialId}`"
          ref="smsInput"
          v-model="code"
          :disabled="busy"
          :max-length="12"
          inputmode="numeric"
          autocomplete="one-time-code"
          :placeholder="$t('brokerAccounts.forthright.smsCode')"
        />
        <a-button type="primary" html-type="submit" :loading="busy" :disabled="!code.trim()">{{ $t('brokerAccounts.forthright.verify') }}</a-button>
      </div>
    </form>
    <p v-if="message" class="unlock-error" role="alert">{{ message }}</p>
  </section>
</template>
<script>
import { broker } from '@/api/broker'
export default {
  name: 'ForthrightUnlock',
  props: { credentialId: { type: Number, required: true }, isDark: Boolean },
  data () { return { code: '', busy: false, message: '', phase: 'idle' } },
  watch: { credentialId () { this.code = ''; this.message = ''; this.phase = 'idle'; if (this.restore) this.restore() } },
  mounted () { this.restore() },
  methods: {
    async restore () {
      const selectedId = this.credentialId
      this.busy = true
      try {
        const res = await broker.forthright.authorization({ credential_id: selectedId })
        if (this.credentialId !== selectedId) return
        this.phase = res.data?.state === 'verified' ? 'unlocked' : res.data?.state === 'needs_sms' ? 'verify' : 'idle'
      } catch (error) {
        if (this.credentialId === selectedId) this.message = this.$t('brokerAccounts.accountLoadFailed')
      } finally { if (this.credentialId === selectedId) this.busy = false }
    },
    async unlock (smsCode) {
      if (this.busy) return
      const selectedId = this.credentialId
      this.busy = true
      this.message = ''
      try {
        const res = await broker.forthright.unlock({ credential_id: selectedId, smsCode: smsCode.trim() })
        if (!res.success) throw new Error(res.error || 'brokerAccounts.orderFailed')
        if (this.credentialId !== selectedId) return
        this.code = ''
        this.phase = 'unlocked'
      } catch (error) {
        if (this.credentialId !== selectedId) return
        const key = error.response?.data?.error || error.message || 'brokerAccounts.orderFailed'
        if (key === 'brokerAccounts.forthright.secondAuthRequired') {
          this.phase = 'verify'
          this.$nextTick(() => this.$refs.smsInput?.focus())
        } else this.message = this.$t(key)
      } finally { this.busy = false }
    }
  }
}
</script>
<style scoped>
.forthright-unlock { --unlock-border: #e8e8e8; --unlock-muted: #707070; --unlock-text: #262626; color: var(--unlock-text); margin: 20px 0; padding: 18px 20px; border: 1px solid var(--unlock-border); border-radius: 10px; background: transparent; }
.forthright-unlock.is-dark { --unlock-border: #303030; --unlock-muted: #999; --unlock-text: rgba(255, 255, 255, .9); }
.unlock-summary { display: flex; align-items: center; gap: 12px; }
.unlock-icon { font-size: 22px; color: var(--primary-color, #3157ff); }
.is-unlocked .unlock-icon { color: #52a66c; }
.unlock-copy { flex: 1; min-width: 0; }
.unlock-copy strong { color: var(--unlock-text); font-size: 14px; font-weight: 600; }
.unlock-copy p { margin: 5px 0 0; color: var(--unlock-muted); font-size: 12px; line-height: 1.6; }
.unlock-controls { margin: 18px 0 0 34px; max-width: 420px; }
.unlock-controls label { display: block; margin-bottom: 8px; font-size: 12px; color: var(--unlock-muted); }
.unlock-entry { display: flex; gap: 10px; }
.unlock-entry input { flex: 1; min-width: 0; height: 38px; border-radius: 6px; letter-spacing: 2px; }
.unlock-entry button { height: 38px; border-radius: 6px; }
.unlock-error { margin: 12px 0 0 34px; color: #d95d5d; font-size: 12px; line-height: 1.6; }
@media (max-width: 600px) {
  .forthright-unlock { padding: 14px; }
  .unlock-summary { flex-wrap: wrap; }
  .unlock-summary > button { margin-left: 34px; }
  .unlock-controls { margin-left: 0; }
}
</style>
