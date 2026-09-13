<template>
  <section class="fundamental-panel">
    <a-divider />
    <h4>{{ $t('fundamentalSync.title') }}</h4>
    <p>{{ $t('fundamentalSync.description') }}</p>
    <a-alert type="info" show-icon :message="$t('fundamentalSync.dateNotice')" />
    <div class="fundamental-controls">
      <label>{{ $t('fundamentalSync.universe') }}
        <a-select v-model="universeId" style="width: 230px" @change="universeChanged">
          <a-select-option v-for="item in supportedUniverses" :key="item.id" :value="item.id">{{ item.code }} ({{ item.member_count }})</a-select-option>
        </a-select>
      </label>
      <label>{{ $t('fundamentalSync.asOf') }}
        <a-date-picker v-model="asOf" :allow-clear="false" @change="selectionChanged" />
      </label>
      <label>{{ $t('fundamentalSync.mode') }}
        <a-select v-model="mode" style="width: 210px">
          <a-select-option value="history">{{ $t('fundamentalSync.history') }}</a-select-option>
          <a-select-option value="current">{{ $t('fundamentalSync.current') }}</a-select-option>
        </a-select>
      </label>
      <label class="field-selector">{{ $t('fundamentalSync.fields') }}
        <a-select v-model="fields" mode="multiple" style="min-width: 280px" @change="selectionChanged">
          <a-select-option v-for="field in availableFields" :key="field" :value="field">{{ field }}</a-select-option>
        </a-select>
      </label>
    </div>
    <div class="fundamental-actions">
      <a-button type="primary" :disabled="!universeId || running || !fields.length" :loading="saving" @click="start(false)">{{ $t('fundamentalSync.start') }}</a-button>
      <a-button :disabled="!job || running || !failures.length" :loading="saving" @click="start(true)">{{ $t('fundamentalSync.retry') }}</a-button>
      <a-button :disabled="!universeId" :loading="loading" @click="load">{{ $t('fundamentalSync.refresh') }}</a-button>
      <a-checkbox v-model="forceFull" :disabled="saving || running">{{ $t('fundamentalSync.forceFull') }}</a-checkbox>
      <a-checkbox :checked="scheduled" :disabled="!universeId || saving || !fields.length" @change="scheduleChanged">{{ $t('fundamentalSync.daily') }}</a-checkbox>
    </div>
    <p>{{ $t('fundamentalSync.workerNotice') }}</p>
    <p>{{ $t('fundamentalSync.incrementalNotice') }}</p>
    <a-alert v-if="error" type="error" show-icon :message="error" />
    <div v-if="job" class="fundamental-progress">
      <strong>{{ $t('fundamentalSync.job') }} #{{ job.id }} · {{ $t('fundamentalSync.status.' + job.status) }}</strong>
      <p>{{ $t('fundamentalSync.policy.' + (job.refresh_policy || 'full')) }} · {{ $t('fundamentalSync.skipped') }} {{ job.skipped_count || 0 }}</p>
      <a-progress :percent="progress" :status="job.status === 'failed' ? 'exception' : running ? 'active' : 'normal'" />
      <span>{{ completed }}/{{ job.items.length }} · {{ $t('fundamentalSync.failed') }} {{ failures.length }}</span>
      <a-collapse v-if="failures.length">
        <a-collapse-panel key="failures" :header="$t('fundamentalSync.failures')">
          <div v-for="item in failures" :key="item.market + item.symbol">{{ item.market }}:{{ item.symbol }} · {{ $t(item.error) }} ({{ item.attempts }})</div>
        </a-collapse-panel>
      </a-collapse>
    </div>
    <div v-if="coverage">
      <h4>{{ $t('fundamentalSync.coverage') }} {{ coverage.ready }}/{{ coverage.total }} · {{ coverage.as_of }}</h4>
      <p>{{ $t('fundamentalSync.coverageNotice') }}</p>
      <a-checkbox v-model="onlyMissing">{{ $t('fundamentalSync.onlyMissing') }}</a-checkbox>
      <a-table
        :columns="columns"
        :data-source="coverageRows"
        :row-key="row => row.market + ':' + row.symbol"
        :pagination="{ pageSize: 10 }"
        :scroll="{ x: 800 }"
        size="small">
        <template slot="state" slot-scope="_, row"><a-tag :color="row.ready ? 'green' : 'orange'">{{ $t(row.ready ? 'fundamentalSync.ready' : row.stale ? 'fundamentalSync.stale' : 'fundamentalSync.missing') }}</a-tag></template>
        <template slot="missing" slot-scope="values">{{ values.join(', ') || '—' }}</template>
      </a-table>
    </div>
  </section>
</template>

<script>
import moment from 'moment'
import { getUniverseFundamentals, syncUniverseFundamentals, scheduleUniverseFundamentals } from '@/api/factor'

export default {
  name: 'FundamentalSyncPanel',
  props: { universes: { type: Array, default: () => [] } },
  data () {
    const asOf = moment().subtract(1, 'day')
    while ([0, 6].includes(asOf.day())) asOf.subtract(1, 'day')
    return {
      universeId: null,
      asOf,
      mode: 'history',
      fields: ['market_cap', 'net_income'],
      forceFull: false,
      result: null,
      loading: false,
      saving: false,
      error: '',
      onlyMissing: true,
      timer: null,
      requestVersion: 0
    }
  },
  computed: {
    supportedUniverses () { return this.universes.filter(item => ['USStock', 'CNStock', 'HKStock'].includes(item.market)) },
    job () { return this.result && this.result.job },
    coverage () { return this.result && this.result.coverage },
    availableFields () { return (this.coverage && this.coverage.available_fields) || ['market_cap', 'net_income', 'net_income_ttm', 'shareholder_equity', 'revenue_growth'] },
    scheduled () { return Boolean(this.result && this.result.schedule && this.result.schedule.enabled) },
    running () { return this.job && ['queued', 'running'].includes(this.job.status) },
    failures () { return this.job ? this.job.items.filter(item => item.status === 'failed') : [] },
    completed () { return this.job ? this.job.items.filter(item => ['success', 'failed'].includes(item.status)).length : 0 },
    progress () { return this.job && this.job.items.length ? Math.floor(this.completed * 100 / this.job.items.length) : this.job && this.job.status === 'complete' ? 100 : 0 },
    coverageRows () { return this.coverage ? this.coverage.items.filter(item => !this.onlyMissing || !item.ready) : [] },
    columns () {
      return [
        { title: this.$t('fundamentalSync.symbol'), dataIndex: 'symbol' },
        { title: this.$t('fundamentalSync.state'), key: 'state', scopedSlots: { customRender: 'state' } },
        { title: this.$t('fundamentalSync.missingFields'), dataIndex: 'missing', scopedSlots: { customRender: 'missing' } },
        { title: this.$t('fundamentalSync.period'), dataIndex: 'period_end' },
        { title: this.$t('fundamentalSync.available'), dataIndex: 'available_at' },
        { title: this.$t('fundamentalSync.source'), dataIndex: 'source' }
      ]
    }
  },
  watch: {
    supportedUniverses: {
      immediate: true,
      handler (rows) {
        if (!this.universeId && rows.length) {
          this.universeId = (rows.find(item => item.code === 'sp500') || rows[0]).id
          this.universeChanged()
        }
      }
    }
  },
  beforeDestroy () { clearTimeout(this.timer); this.requestVersion++ },
  methods: {
    universeChanged () {
      const universe = this.supportedUniverses.find(item => item.id === this.universeId)
      this.mode = universe && universe.market === 'USStock' ? 'history' : 'current'
      this.forceFull = false
      this.selectionChanged()
    },
    selectionChanged () { this.result = null; this.loading = false; this.error = ''; this.requestVersion++; this.load() },
    async load () {
      clearTimeout(this.timer)
      if (!this.universeId || !this.fields.length) return
      const version = ++this.requestVersion
      this.loading = true
      try {
        const response = await getUniverseFundamentals(this.universeId, { as_of: this.asOf.format('YYYY-MM-DD'), fields: this.fields.join(',') })
        if (version !== this.requestVersion) return
        if (response.code !== 1) throw new Error(response.msg)
        this.result = response.data
        this.error = ''
      } catch (err) {
        if (version === this.requestVersion) this.error = this.$t((err.response && err.response.data && err.response.data.msg) || err.message || 'fundamentalSync.loadFailed')
      } finally {
        if (version === this.requestVersion) {
          this.loading = false
          if (this.running) this.timer = setTimeout(() => this.load(), 5000)
        }
      }
    },
    async start (retry) {
      this.saving = true
      try {
        const response = await syncUniverseFundamentals(this.universeId, { mode: this.mode, fields: this.fields, retry_job: retry ? this.job.id : undefined, incremental: !this.forceFull })
        if (response.code !== 1) throw new Error(response.msg)
        await this.load()
      } catch (err) { this.error = this.$t((err.response && err.response.data && err.response.data.msg) || err.message || 'fundamentalSync.loadFailed') } finally { this.saving = false }
    },
    async scheduleChanged (event) {
      this.saving = true
      try {
        const response = await scheduleUniverseFundamentals(this.universeId, { enabled: event.target.checked, mode: this.mode, fields: this.fields })
        if (response.code !== 1) throw new Error(response.msg)
        await this.load()
      } catch (err) { this.error = this.$t((err.response && err.response.data && err.response.data.msg) || err.message || 'fundamentalSync.loadFailed') } finally { this.saving = false }
    }
  }
}
</script>

<style scoped>
.fundamental-panel { margin-top: 24px; }
.fundamental-controls, .fundamental-actions { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin: 16px 0; }
.fundamental-controls label { display: flex; flex-direction: column; gap: 6px; }
.field-selector { flex: 1; }
.fundamental-progress { margin: 18px 0; }
</style>
