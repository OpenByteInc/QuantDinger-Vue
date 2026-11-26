<template>
  <a-form layout="vertical" class="broker-form forthright-form">
    <a-form-item :label="$t('brokerAccounts.accountName')"><a-input v-model="form.name" :disabled="disabled" :max-length="100" /></a-form-item>
    <a-form-item :label="$t('brokerAccounts.forthright.environment')">
      <a-radio-group v-model="form.environment" button-style="solid" :disabled="disabled">
        <a-radio-button value="sandbox">{{ $t('brokerAccounts.forthright.sandbox') }}</a-radio-button>
        <a-radio-button value="live">{{ $t('brokerAccounts.forthright.live') }}</a-radio-button>
      </a-radio-group>
    </a-form-item>
    <p class="connection-hint">{{ $t('brokerAccounts.forthright.autoDiscover') }}</p>
    <a-form-item :label="$t('brokerAccounts.forthright.appId')"><a-input v-model="form.appId" :disabled="disabled" autocomplete="off" /></a-form-item>
    <a-form-item :label="$t('brokerAccounts.forthright.privateKey')"><a-textarea v-model="form.privateKey" :disabled="disabled" :auto-size="{ minRows: 3, maxRows: 8 }" autocomplete="new-password" /></a-form-item>
    <a-form-item :label="$t('brokerAccounts.forthright.tradePassword')"><a-input-password v-model="form.tradePassword" :disabled="disabled" autocomplete="new-password" /></a-form-item>
    <a-form-item :label="$t('brokerAccounts.forthright.currency')">
      <a-select v-model="form.currency" :disabled="disabled"><a-select-option v-for="currency in ['USD', 'HKD']" :key="currency" :value="currency">{{ currency }}</a-select-option></a-select>
    </a-form-item>
    <p class="connection-hint">{{ $t('brokerAccounts.forthright.currencyHint') }}</p>
    <a-button type="primary" :loading="loading" :disabled="disabled || !valid" @click="$emit('submit', { ...form })">{{ $t('brokerAccounts.connect') }}</a-button>
  </a-form>
</template>
<script>
export default {
  name: 'ForthrightConnectForm',
  props: { broker: { type: Object, required: true }, disabled: Boolean, loading: Boolean },
  data () {
    return { form: { name: '', appId: '', privateKey: '', tradePassword: '', currency: 'USD', environment: 'sandbox' } }
  },
  computed: { valid () { return Boolean(this.form.appId.trim() && this.form.privateKey.trim() && this.form.tradePassword) } }
}
</script>
<style scoped>
.connection-hint { color: var(--text-secondary, #8c8c8c); line-height: 1.6; margin: 0 0 20px; }
.forthright-form ::v-deep .ant-radio-group {
  display: inline-flex;
  border-radius: 6px;
  isolation: isolate;
}
.forthright-form ::v-deep .ant-radio-button-wrapper {
  border-radius: 0;
}
.forthright-form ::v-deep .ant-radio-button-wrapper:first-child {
  border-radius: 6px 0 0 6px;
}
.forthright-form ::v-deep .ant-radio-button-wrapper:last-child {
  border-radius: 0 6px 6px 0;
}
</style>
