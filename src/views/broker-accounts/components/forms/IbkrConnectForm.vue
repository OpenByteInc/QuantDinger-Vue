<template>
  <a-form layout="vertical" class="broker-form">
    <a-row :gutter="12">
      <a-col :xs="24" :md="12">
        <a-form-item :label="$t('brokerAccounts.ibkr.host')">
          <a-input v-model="form.host" placeholder="127.0.0.1" :disabled="disabled" />
        </a-form-item>
      </a-col>
      <a-col :xs="12" :md="6">
        <a-form-item :label="$t('brokerAccounts.ibkr.port')">
          <a-input-number
            v-model="form.port"
            :min="1"
            :max="65535"
            :disabled="disabled"
            style="width: 100%"
          />
        </a-form-item>
      </a-col>
      <a-col :xs="12" :md="6">
        <a-form-item :label="$t('brokerAccounts.ibkr.clientId')">
          <a-input-number
            v-model="form.clientId"
            :min="0"
            :max="999"
            :disabled="disabled"
            style="width: 100%"
          />
        </a-form-item>
      </a-col>
    </a-row>
    <a-row :gutter="12" align="middle">
      <a-col :xs="24" :md="14">
        <a-form-item :label="$t('brokerAccounts.ibkr.accountOptional')">
          <a-input v-model="form.account" placeholder="DU1234567" :disabled="disabled" />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :md="10">
        <a-form-item :label="$t('brokerAccounts.ibkr.readonly')">
          <a-switch v-model="form.readonly" :disabled="disabled" />
          <span class="form-hint">{{ $t('brokerAccounts.ibkr.readonlyHint') }}</span>
        </a-form-item>
      </a-col>
    </a-row>
    <div class="form-preset-row">
      <span class="form-preset-label">{{ $t('brokerAccounts.ibkr.presets') }}:</span>
      <a-button size="small" @click="applyPreset('twsLive')">TWS Live (7496)</a-button>
      <a-button size="small" @click="applyPreset('twsPaper')">TWS Paper (7497)</a-button>
      <a-button size="small" @click="applyPreset('gatewayLive')">Gateway Live (4001)</a-button>
      <a-button size="small" @click="applyPreset('gatewayPaper')">Gateway Paper (4002)</a-button>
    </div>
    <div class="form-actions">
      <a-button type="primary" :loading="loading" :disabled="!canSubmit || disabled" @click="submit">
        <a-icon type="link" /> {{ $t('brokerAccounts.connect') }}
      </a-button>
    </div>
  </a-form>
</template>

<script>
const PRESETS = {
  twsLive: { host: '127.0.0.1', port: 7496 },
  twsPaper: { host: '127.0.0.1', port: 7497 },
  gatewayLive: { host: '127.0.0.1', port: 4001 },
  gatewayPaper: { host: '127.0.0.1', port: 4002 }
}

export default {
  name: 'IbkrConnectForm',
  props: {
    broker: { type: Object, required: true },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false }
  },
  data () {
    return {
      form: {
        host: '127.0.0.1',
        port: 7497,
        clientId: 1,
        account: '',
        readonly: false
      }
    }
  },
  computed: {
    canSubmit () {
      return !!(this.form.host && this.form.host.trim() && this.form.port > 0)
    }
  },
  methods: {
    applyPreset (key) {
      const p = PRESETS[key]
      if (!p) return
      this.form.host = p.host
      this.form.port = p.port
    },
    submit () {
      if (!this.canSubmit) return
      this.$emit('submit', {
        host: this.form.host.trim(),
        port: Number(this.form.port),
        clientId: Number(this.form.clientId || 1),
        account: (this.form.account || '').trim(),
        readonly: !!this.form.readonly
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
.form-preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  margin-top: -4px;
}
.form-preset-label { color: #8c8c8c; margin-right: 4px; }
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
