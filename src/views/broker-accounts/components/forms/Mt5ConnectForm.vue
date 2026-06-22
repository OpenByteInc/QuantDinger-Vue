<template>
  <a-form layout="vertical" class="broker-form">
    <a-row :gutter="12">
      <a-col :xs="12" :md="8">
        <a-form-item :label="$t('brokerAccounts.mt5.login')">
          <a-input v-model="form.login" placeholder="12345678" :disabled="disabled" />
        </a-form-item>
      </a-col>
      <a-col :xs="12" :md="8">
        <a-form-item :label="$t('brokerAccounts.mt5.password')">
          <a-input-password v-model="form.password" :disabled="disabled" autocomplete="new-password" />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :md="8">
        <a-form-item :label="$t('brokerAccounts.mt5.server')">
          <a-input v-model="form.server" placeholder="ICMarkets-Demo" :disabled="disabled" />
        </a-form-item>
      </a-col>
    </a-row>
    <a-row :gutter="12">
      <a-col :span="24">
        <a-form-item :label="$t('brokerAccounts.mt5.terminalPathOptional')">
          <a-input
            v-model="form.terminal_path"
            placeholder="C:\\Program Files\\MetaTrader 5\\terminal64.exe"
            :disabled="disabled"
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
  name: 'Mt5ConnectForm',
  props: {
    broker: { type: Object, required: true },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false }
  },
  data () {
    return {
      form: {
        login: '',
        password: '',
        server: '',
        terminal_path: ''
      }
    }
  },
  computed: {
    canSubmit () {
      return !!(this.form.login && String(this.form.login).trim() && this.form.password && this.form.server && this.form.server.trim())
    }
  },
  methods: {
    submit () {
      if (!this.canSubmit) return
      this.$emit('submit', {
        login: Number(this.form.login),
        password: String(this.form.password),
        server: String(this.form.server).trim(),
        terminal_path: (this.form.terminal_path || '').trim()
      })
    }
  }
}
</script>

<style lang="less" scoped>
.broker-form {
  ::v-deep .ant-form-item-label > label { font-size: 12px; color: #595959; }
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
