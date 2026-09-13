<template>
  <section class="fundamental-panel" :class="{ 'fundamental-dark': dark }">
    <header class="fundamental-heading">
      <span class="fundamental-icon"><a-icon type="database" /></span>
      <div><h4>{{ $t('fundamentalSync.title') }}</h4>
        <p>{{ $t('fundamentalSync.description') }}</p></div>
    </header>
    <div class="fundamental-config">
      <a-alert type="info" show-icon :message="$t('fundamentalSync.dateNotice')" />
      <div class="fundamental-controls">
        <label>{{ $t('fundamentalSync.universe') }}
          <a-select :get-popup-container="popupContainer" v-model="universeId" @change="universeChanged">
            <a-select-option v-for="item in supportedUniverses" :key="item.id" :value="item.id">{{ item.code }} ({{ item.member_count }})</a-select-option>
          </a-select>
        </label>
        <label>{{ $t('fundamentalSync.asOf') }}
          <a-date-picker :get-calendar-container="popupContainer" v-model="asOf" :allow-clear="false" @change="selectionChanged" />
        </label>
        <label>{{ $t('fundamentalSync.mode') }}
          <a-select :get-popup-container="popupContainer" v-model="mode" @change="modeChanged">
            <a-select-option value="history">{{ $t('fundamentalSync.history') }}</a-select-option>
            <a-select-option value="current">{{ $t('fundamentalSync.current') }}</a-select-option>
          </a-select>
        </label>
        <label class="field-selector">{{ $t('fundamentalSync.acceptanceFields') }}
          <a-select
            v-model="fields"
            mode="multiple"
            :get-popup-container="popupContainer"
            :max-tag-count="2"
            :max-tag-placeholder="hiddenFieldLabel"
            @change="selectionChanged">
            <a-select-option v-for="field in availableFields" :key="field" :value="field">{{ fieldLabel(field) }}</a-select-option>
          </a-select>
        </label>
      </div>
      <div class="fundamental-collection-note">
        <a-icon type="cloud-download" />
        <span>{{ $t('fundamentalSync.collectionNotice', { count: availableFields.length }) }}</span>
        <button type="button" @click="selectAllFields">{{ $t('fundamentalSync.selectAllFields') }}</button>
      </div>
      <div class="fundamental-options">
        <a-checkbox v-model="forceFull" :disabled="saving || running">{{ $t('fundamentalSync.forceFull') }}</a-checkbox>
        <a-checkbox :checked="scheduled" :disabled="!universeId || saving || !fields.length" @change="scheduleChanged">{{ $t('fundamentalSync.daily') }}</a-checkbox>
      </div>
      <div class="fundamental-actions">
        <a-button type="primary" :disabled="!universeId || running || !fields.length" :loading="saving" @click="start(false)">{{ $t('fundamentalSync.start') }}</a-button>
        <a-button :disabled="!job || running || !failures.length" :loading="saving" @click="start(true)">{{ $t('fundamentalSync.retry') }}</a-button>
        <a-button :disabled="!universeId" :loading="loading" @click="load">{{ $t('fundamentalSync.refresh') }}</a-button>
      </div>
      <details class="fundamental-help">
        <summary><a-icon type="info-circle" /> {{ $t('fundamentalSync.help') }}</summary>
        <p>{{ $t('fundamentalSync.incrementalNotice') }}</p>
        <p>{{ $t('fundamentalSync.workerNotice') }}</p>
      </details>
    </div>
    <a-alert v-if="error" type="error" show-icon :message="error" />
    <div v-if="job" class="fundamental-progress">
      <div class="fundamental-status-heading">
        <strong>{{ $t('fundamentalSync.job') }} #{{ job.id }}</strong>
        <a-tag :color="job.status === 'failed' || job.status === 'partial' ? 'orange' : job.status === 'complete' ? 'green' : 'blue'">{{ $t('fundamentalSync.status.' + job.status) }}</a-tag>
      </div>
      <p>{{ $t('fundamentalSync.policy.' + (job.refresh_policy || 'full')) }} · {{ $t('fundamentalSync.skipped') }} {{ job.skipped_count || 0 }}</p>
      <a-progress :percent="progress" :status="job.status === 'failed' ? 'exception' : running ? 'active' : 'normal'" />
      <span class="fundamental-progress-count">{{ completed }}/{{ job.items.length }} · {{ $t('fundamentalSync.failed') }} {{ failures.length }}</span>
      <a-collapse v-if="failures.length">
        <a-collapse-panel key="failures" :header="$t('fundamentalSync.failures')">
          <div v-for="item in failures" :key="item.market + item.symbol" class="fundamental-failure">
            <strong>{{ item.market }}:{{ item.symbol }}</strong>
            <span>{{ item.error_detail || $t(item.error) }}</span>
            <small>{{ $t('fundamentalSync.attempts', { count: item.attempts }) }}</small>
          </div>
        </a-collapse-panel>
      </a-collapse>
    </div>
    <div v-if="coverage" class="fundamental-coverage">
      <div class="fundamental-coverage-heading">
        <div><h4>{{ $t('fundamentalSync.coverage') }}</h4>
          <div class="fundamental-coverage-count"><strong>{{ coverage.ready }}<small> / {{ coverage.total }}</small></strong><span>{{ coverage.as_of }}</span></div>
          <div class="fundamental-state-summary">
            <span v-for="item in coverageSummary" :key="item.state"><i :class="'state-' + item.state" />{{ $t('fundamentalSync.' + item.state) }} {{ item.count }}</span>
          </div>
        </div>
        <a-checkbox v-model="onlyMissing">{{ $t('fundamentalSync.onlyMissing') }}</a-checkbox>
      </div>
      <p>{{ $t('fundamentalSync.coverageNotice', { days: coverage.stale_after_days || 200 }) }}</p>
      <a-table
        :columns="columns"
        :data-source="coverageRows"
        :row-key="row => row.market + ':' + row.symbol"
        :pagination="{ pageSize: 10 }"
        :scroll="{ x: 1000 }"
        size="small">
        <template slot="state" slot-scope="_, row">
          <a-tag :class="['fundamental-state-tag', 'state-tag-' + rowState(row)]">{{ $t('fundamentalSync.' + rowState(row)) }}</a-tag>
          <small v-if="row.stale" class="stale-detail">{{ $t('fundamentalSync.ageDays', { count: row.age_days }) }}</small>
        </template>
        <template slot="missing" slot-scope="values">
          <span v-if="!values.length">—</span>
          <template v-else><a-tag v-for="field in values" :key="field" class="fundamental-field-tag">{{ fieldLabel(field) }}</a-tag></template>
        </template>
        <template slot="availability" slot-scope="value">{{ value ? $t('fundamentalSync.availability.' + value) : '—' }}</template>
      </a-table>
    </div>
  </section>
</template>

<script>
import moment from 'moment'
import { getUniverseFundamentals, syncUniverseFundamentals, scheduleUniverseFundamentals } from '@/api/factor'

const ALL_FUNDAMENTAL_FIELDS = [
  'revenue', 'net_income', 'net_income_ttm', 'book_value', 'shareholder_equity',
  'total_debt', 'free_cash_flow', 'shares_outstanding', 'market_cap', 'pe_ratio',
  'pb_ratio', 'return_on_equity', 'revenue_growth', 'debt_to_equity'
]

function defaultAsOf (mode) {
  if (mode === 'current') return moment()
  const value = moment().subtract(1, 'day')
  while ([0, 6].includes(value.day())) value.subtract(1, 'day')
  return value
}

export default {
  name: 'FundamentalSyncPanel',
  props: { dark: { type: Boolean, default: false }, universes: { type: Array, default: () => [] } },
  data () {
    return {
      universeId: null,
      asOf: defaultAsOf('history'),
      mode: 'history',
      fields: [...ALL_FUNDAMENTAL_FIELDS],
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
    availableFields () { return (this.coverage && (this.coverage.collected_fields || this.coverage.available_fields)) || ALL_FUNDAMENTAL_FIELDS },
    scheduled () { return Boolean(this.result && this.result.schedule && this.result.schedule.enabled) },
    running () { return this.job && ['queued', 'running'].includes(this.job.status) },
    failures () { return this.job ? this.job.items.filter(item => item.status === 'failed') : [] },
    completed () { return this.job ? this.job.items.filter(item => ['success', 'failed'].includes(item.status)).length : 0 },
    progress () { return this.job && this.job.items.length ? Math.floor(this.completed * 100 / this.job.items.length) : this.job && this.job.status === 'complete' ? 100 : 0 },
    coverageRows () { return this.coverage ? this.coverage.items.filter(item => !this.onlyMissing || !item.ready) : [] },
    coverageSummary () {
      if (!this.coverage) return []
      const counts = this.coverage.items.reduce((result, row) => {
        const state = this.rowState(row)
        result[state] = (result[state] || 0) + 1
        return result
      }, {})
      return ['ready', 'partial', 'stale', 'no_data'].filter(state => counts[state]).map(state => ({ state, count: counts[state] }))
    },
    columns () {
      return [
        { title: this.$t('fundamentalSync.symbol'), dataIndex: 'symbol' },
        { title: this.$t('fundamentalSync.state'), key: 'state', scopedSlots: { customRender: 'state' } },
        { title: this.$t('fundamentalSync.missingFields'), dataIndex: 'missing', scopedSlots: { customRender: 'missing' } },
        { title: this.$t('fundamentalSync.period'), dataIndex: 'period_end' },
        { title: this.$t('fundamentalSync.available'), dataIndex: 'available_at' },
        { title: this.$t('fundamentalSync.availabilityBasis'), dataIndex: 'availability_basis', scopedSlots: { customRender: 'availability' } },
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
    popupContainer (trigger) { return trigger.parentNode },
    fieldLabel (field) { return this.$t('fundamentalField.' + field) },
    hiddenFieldLabel () { return this.$t('fundamentalSync.moreFields', { count: Math.max(0, this.fields.length - 2) }) },
    selectAllFields () {
      if (this.fields.length === this.availableFields.length) return
      this.fields = [...this.availableFields]
      this.selectionChanged()
    },
    rowState (row) {
      if (row.state) return row.state
      return row.ready ? 'ready' : row.stale ? 'stale' : row.period_end ? 'partial' : 'no_data'
    },
    universeChanged () {
      const universe = this.supportedUniverses.find(item => item.id === this.universeId)
      this.mode = universe && universe.market === 'USStock' ? 'history' : 'current'
      this.asOf = defaultAsOf(this.mode)
      this.forceFull = false
      this.selectionChanged()
    },
    modeChanged () {
      this.asOf = defaultAsOf(this.mode)
      this.selectionChanged()
    },
    selectionChanged () { this.result = null; this.loading = false; this.error = ''; this.requestVersion++; this.load() },
    async load () {
      clearTimeout(this.timer)
      if (!this.universeId || !this.fields.length) return
      const version = ++this.requestVersion
      this.loading = true
      try {
        const response = await getUniverseFundamentals(this.universeId, { as_of: this.asOf.format('YYYY-MM-DD'), mode: this.mode, fields: this.fields.join(',') })
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

<style scoped lang="less">
.fundamental-panel {
  --sync-bg: #fff;
  --sync-surface: #f7f9fb;
  --sync-border: #e4e8ed;
  --sync-text: #243041;
  --sync-muted: #627084;
  --sync-disabled: #929cab;
  --sync-hover: #edf2f7;
  margin-top: 28px;
  padding-top: 28px;
  border-top: 1px solid var(--sync-border);
  color: var(--sync-text);
  h4 { margin: 0; font-size: 16px; font-weight: 600; color: var(--sync-text); }
  p { margin: 8px 0 0; line-height: 1.7; color: var(--sync-muted); font-size: 13px; }
}
.fundamental-dark {
  --sync-bg: #181818;
  --sync-surface: #141414;
  --sync-border: #303030;
  --sync-text: #e0e6ed;
  --sync-muted: #a0abb8;
  --sync-disabled: #78818b;
  --sync-hover: #25292d;
}
.fundamental-heading { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 20px; }
.fundamental-icon { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border-radius: 10px; background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent); color: var(--primary-color, #1890ff); font-size: 20px; }
.fundamental-config, .fundamental-progress, .fundamental-coverage { padding: 20px; border: 1px solid var(--sync-border); border-radius: 10px; background: var(--sync-bg); }
.fundamental-controls { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .85fr) minmax(0, 1.1fr) minmax(0, 1.5fr); gap: 20px; margin: 20px 0; }
.fundamental-controls label { display: flex; flex-direction: column; gap: 8px; min-width: 0; position: relative; font-size: 13px; font-weight: 500; }
.fundamental-controls /deep/ .ant-select, .fundamental-controls /deep/ .ant-calendar-picker { width: 100%; min-width: 0; font-weight: 400; }
.fundamental-collection-note { display: flex; align-items: center; gap: 8px; margin: -4px 0 16px; color: var(--sync-muted); font-size: 12px; }
.fundamental-collection-note button { flex-shrink: 0; padding: 0; border: 0; background: transparent; color: var(--primary-color, #1890ff); cursor: pointer; font: inherit; white-space: nowrap; }
.fundamental-collection-note button:focus-visible { outline: 2px solid var(--primary-color, #1890ff); outline-offset: 3px; }
.fundamental-options { display: flex; flex-wrap: wrap; gap: 12px 28px; padding: 14px 16px; background: var(--sync-surface); border-radius: 8px; }
.fundamental-options /deep/ .ant-checkbox-wrapper + .ant-checkbox-wrapper { margin-left: 0; }
.fundamental-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.fundamental-help { margin-top: 18px; color: var(--sync-muted); font-size: 13px; }
.fundamental-help summary { cursor: pointer; width: fit-content; }
.fundamental-help summary:focus-visible { outline: 2px solid var(--primary-color, #1890ff); outline-offset: 4px; }
.fundamental-progress { margin: 16px 0; background: var(--sync-surface); }
.fundamental-status-heading, .fundamental-coverage-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.fundamental-status-heading /deep/ .ant-tag { margin: 0; }
.fundamental-progress /deep/ .ant-progress { margin: 16px 0 6px; }
.fundamental-progress-count { font-size: 13px; color: var(--sync-muted); font-variant-numeric: tabular-nums; }
.fundamental-progress /deep/ .ant-collapse { margin-top: 14px; }
.fundamental-failure { display: grid; grid-template-columns: minmax(140px, .6fr) minmax(220px, 2fr) auto; gap: 12px; align-items: baseline; padding: 8px 0; border-bottom: 1px solid var(--sync-border); }
.fundamental-failure:last-child { border-bottom: 0; }
.fundamental-failure span, .fundamental-failure small { color: var(--sync-muted); overflow-wrap: anywhere; }
.fundamental-coverage { margin-top: 16px; }
.fundamental-coverage-count { display: flex; flex-wrap: wrap; align-items: baseline; gap: 16px; margin-top: 8px; font-variant-numeric: tabular-nums; }
.fundamental-coverage-count strong { font-size: 28px; line-height: 1.3; color: var(--sync-text); }
.fundamental-coverage-count small { font-size: 16px; font-weight: 400; color: var(--sync-muted); }
.fundamental-coverage-count span { color: var(--sync-muted); font-size: 12px; }
.fundamental-state-summary { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 8px; color: var(--sync-muted); font-size: 12px; }
.fundamental-state-summary span { display: inline-flex; align-items: center; gap: 6px; }
.fundamental-state-summary i { width: 7px; height: 7px; border-radius: 50%; background: var(--sync-disabled); }
.fundamental-state-summary .state-ready { background: #52c41a; }
.fundamental-state-summary .state-partial { background: #faad14; }
.fundamental-state-summary .state-stale { background: #ff4d4f; }
.stale-detail { display: block; margin-top: 4px; color: var(--sync-muted); white-space: nowrap; }
.fundamental-state-tag, .fundamental-field-tag { margin: 2px 6px 2px 0; }
.fundamental-state-tag { background: #f4f6f8; border-color: #d7dce2; color: #4e5b6b; }
.fundamental-state-tag.state-tag-ready { background: #f0f8eb; border-color: #b7df9b; color: #39791f; }
.fundamental-state-tag.state-tag-partial { background: #fff7e6; border-color: #ffd591; color: #ad6800; }
.fundamental-state-tag.state-tag-stale { background: #fff1f0; border-color: #ffa39e; color: #a8071a; }
.fundamental-field-tag { background: #f4f6f8; border-color: #d7dce2; color: #4e5b6b; }
.fundamental-coverage /deep/ .ant-table-wrapper { margin-top: 18px; }
.fundamental-panel /deep/ .ant-checkbox-wrapper, .fundamental-panel /deep/ .ant-progress-text { color: var(--sync-text); }
.fundamental-panel /deep/ .ant-progress-inner { background: var(--sync-border); }
.fundamental-panel /deep/ .ant-table { color: var(--sync-text); }
.fundamental-panel /deep/ .ant-table-small { border-color: var(--sync-border); }
.fundamental-panel /deep/ .ant-table-thead > tr > th { background: var(--sync-surface); color: var(--sync-muted); border-color: var(--sync-border); }
.fundamental-panel /deep/ .ant-table-tbody > tr > td { border-color: var(--sync-border); padding: 12px 8px; }
.fundamental-dark {
  /deep/ .ant-select-selection, /deep/ .ant-input, /deep/ .ant-checkbox-inner, /deep/ .ant-btn, /deep/ .ant-pagination-item, /deep/ .ant-pagination-item-link { background: var(--sync-surface); border-color: var(--sync-border); color: var(--sync-text); }
  /deep/ .ant-select-selection__choice { background: var(--sync-hover); border-color: var(--sync-border); color: var(--sync-text); }
  /deep/ .ant-select-selection__choice__remove, /deep/ .ant-select-arrow, /deep/ .ant-calendar-picker-icon, /deep/ .ant-pagination-item a { color: var(--sync-muted); }
  /deep/ .ant-btn-primary, /deep/ .ant-checkbox-checked .ant-checkbox-inner { background: var(--primary-color, #1890ff); border-color: var(--primary-color, #1890ff); color: #fff; }
  /deep/ .ant-btn[disabled], /deep/ .ant-checkbox-disabled + span { color: var(--sync-disabled); }
  /deep/ .ant-btn[disabled] { background: var(--sync-hover); border-color: var(--sync-border); }
  /deep/ .ant-collapse, /deep/ .ant-collapse-content, /deep/ .ant-collapse-item { background: var(--sync-surface); border-color: var(--sync-border); color: var(--sync-text); }
  /deep/ .ant-collapse-header { color: var(--sync-text) !important; }
  /deep/ .ant-table-tbody > tr:hover > td { background: var(--sync-hover) !important; }
  /deep/ .ant-empty-description { color: var(--sync-muted); }
  /deep/ .ant-tag-orange { background: #322719; border-color: #634a24; color: #ffc069; }
  /deep/ .ant-tag-red { background: #351b1f; border-color: #6b2a32; color: #ff9c9c; }
  /deep/ .ant-tag-green { background: #1d3020; border-color: #355d39; color: #95de64; }
  /deep/ .ant-tag-blue { background: #172c3d; border-color: #285171; color: #91caff; }
  .fundamental-state-tag, .fundamental-field-tag { background: #25292d; border-color: #46505b; color: #d2d9e2; }
  .fundamental-state-tag.state-tag-ready { background: #1d3020; border-color: #355d39; color: #95de64; }
  .fundamental-state-tag.state-tag-partial { background: #322719; border-color: #634a24; color: #ffc069; }
  .fundamental-state-tag.state-tag-stale { background: #351b1f; border-color: #6b2a32; color: #ff9c9c; }
  /deep/ .ant-checkbox-inner { border-color: #626c78; }
  /deep/ .ant-select-dropdown, /deep/ .ant-calendar, /deep/ .ant-calendar-input-wrap, /deep/ .ant-calendar-input, /deep/ .ant-calendar-panel, /deep/ .ant-calendar-year-panel, /deep/ .ant-calendar-month-panel, /deep/ .ant-calendar-decade-panel { background: var(--sync-surface); color: var(--sync-text); border-color: var(--sync-border); }
  /deep/ .ant-select-dropdown-menu-item, /deep/ .ant-calendar-date, /deep/ .ant-calendar-header a, /deep/ .ant-calendar-year-panel-year, /deep/ .ant-calendar-month-panel-month, /deep/ .ant-calendar-decade-panel-decade { color: var(--sync-text); }
  /deep/ .ant-select-dropdown-menu-item-active, /deep/ .ant-select-dropdown-menu-item-selected, /deep/ .ant-calendar-date:hover { background: var(--sync-hover); }
  /deep/ .ant-calendar-last-month-cell .ant-calendar-date, /deep/ .ant-calendar-next-month-btn-day .ant-calendar-date { color: var(--sync-disabled); }
  /deep/ .ant-calendar-header, /deep/ .ant-calendar-footer { border-color: var(--sync-border); }
  /deep/ .ant-alert { background: var(--sync-surface); border-color: var(--sync-border); }
  /deep/ .ant-alert-message { color: var(--sync-text); }
}
@media (max-width: 1200px) { .fundamental-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) {
  .fundamental-controls { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .fundamental-config, .fundamental-progress, .fundamental-coverage { padding: 16px; }
  .fundamental-coverage-heading { align-items: flex-start; flex-direction: column; }
  .fundamental-actions /deep/ .ant-btn { flex: 1 1 auto; }
  .fundamental-failure { grid-template-columns: 1fr; gap: 4px; }
}
</style>
