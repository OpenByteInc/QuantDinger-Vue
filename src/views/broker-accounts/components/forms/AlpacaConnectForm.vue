<template>
  <a-form layout="vertical" class="broker-form">
    <a-row :gutter="12">
      <a-col :xs="24" :md="12">
        <a-form-item :label="$t('brokerAccounts.alpaca.apiKey')">
          <a-input
            v-model="form.apiKey"
            :placeholder="$t('brokerAccounts.alpaca.apiKeyPh')"
            :disabled="disabled"
            autocomplete="off"
          />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :md="12">
        <a-form-item :label="$t('brokerAccounts.alpaca.secretKey')">
          <a-input-password
            v-model="form.secretKey"
            :placeholder="$t('brokerAccounts.alpaca.secretKeyPh')"
            :disabled="disabled"
            autocomplete="new-password"
          />
        </a-form-item>
      </a-col>
    </a-row>
    <div class="form-actions">
      <a-button type="primary" :loading="loading" :disabled="!canSubmit || disabled" @click="submit">
        <a-icon type="link" /> {{ $t('brokerAccounts.connect') }}
      </a-button>
    </div>
  </a-form>
</template>

<script>
export default {
  name: 'AlpacaConnectForm',
  props: {
    broker: { type: Object, required: true },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false }
  },
  data () {
    return {
      form: {
        apiKey: '',
        secretKey: ''
      }
    }
  },
  computed: {
    canSubmit () {
      return !!(this.form.apiKey && this.form.apiKey.trim() && this.form.secretKey && this.form.secretKey.trim())
    }
  },
  methods: {
    submit () {
      if (!this.canSubmit) return
      const apiKey = this.form.apiKey.trim()
      this.$emit('submit', {
        apiKey,
        secretKey: this.form.secretKey.trim(),
        paper: apiKey.toUpperCase().startsWith('PK'),
        baseUrl: null
      })
    }
  }
}
</script>

<style lang="less" scoped>
.broker-form {
  ::v-deep .ant-form-item-label > label { font-size: 12px; color: #595959; }
}
.form-hint {
  margin-left: 12px;
  font-size: 12px;
  color: #8c8c8c;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
