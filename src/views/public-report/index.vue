<template>
  <main class="public-report-page" :class="{ 'public-report-page--dark': isDarkTheme }">
    <header class="public-report-shell__header">
      <a class="brand" href="/#/ai-asset-analysis" aria-label="QuantDinger">
        <span class="brand-mark">QD</span>
        <span><strong>QuantDinger</strong><small>{{ $t('fastAnalysis.sharedReportBrandLine') }}</small></span>
      </a>
      <span class="readonly-badge"><a-icon type="eye" /> {{ $t('fastAnalysis.sharedReportReadonly') }}</span>
    </header>

    <section class="public-report-shell">
      <div v-if="loading" class="public-state">
        <a-spin size="large" />
        <p>{{ $t('fastAnalysis.sharedReportLoading') }}</p>
      </div>
      <a-result
        v-else-if="error"
        status="warning"
        :title="$t('fastAnalysis.sharedReportUnavailable')"
        :sub-title="error"
      />
      <template v-else>
        <div class="share-meta">
          <div>
            <span>{{ $t('fastAnalysis.sharedReportLabel') }}</span>
            <strong>{{ instrumentLabel }}</strong>
          </div>
          <div v-if="sharedAt">
            <span>{{ $t('fastAnalysis.sharedAt') }}</span>
            <strong>{{ formatSharedAt(sharedAt) }}</strong>
          </div>
        </div>
        <ProfessionalAnalysisReport :result="sharedResult" />
      </template>
    </section>

    <footer class="public-report-shell__footer">
      <p>{{ $t('fastAnalysis.sharedReportDisclaimer') }}</p>
      <a href="/#/ai-asset-analysis">{{ $t('fastAnalysis.openQuantDinger') }} <a-icon type="arrow-right" /></a>
    </footer>
  </main>
</template>

<script>
import { mapState } from 'vuex'
import { getSharedChatReport } from '@/api/market'
import { loadLanguageAsync } from '@/locales'
import ProfessionalAnalysisReport from '@/views/ai-analysis/components/ProfessionalAnalysisReport.vue'

export default {
  name: 'PublicProfessionalReport',
  components: { ProfessionalAnalysisReport },
  data () {
    return { loading: true, error: '', share: null }
  },
  computed: {
    ...mapState({ navTheme: state => state.app.theme }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    sharedResult () {
      return this.share && this.share.report ? this.share.report : null
    },
    sharedAt () {
      return this.share && this.share.shared_at
    },
    instrumentLabel () {
      const payload = this.sharedResult || {}
      const report = payload.report || payload.professional_report || payload
      const instrument = report.instrument || {}
      const target = (this.share && this.share.target) || {}
      const market = instrument.market || target.market || ''
      const symbol = instrument.canonical_symbol || instrument.symbol || target.symbol || '--'
      return [market, symbol].filter(Boolean).join(':')
    }
  },
  async created () {
    try {
      const res = await getSharedChatReport(this.$route.params.token)
      if (!res || res.code === 0 || !res.data || !res.data.report) throw new Error((res && res.msg) || '')
      this.share = res.data
      if (res.data.language) await loadLanguageAsync(res.data.language)
    } catch (e) {
      this.error = (e && (e.backendMessage || e.message)) || this.$t('fastAnalysis.sharedReportUnavailableDescription')
    } finally {
      this.loading = false
    }
  },
  methods: {
    formatSharedAt (value) {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '--' : date.toLocaleString()
    }
  }
}
</script>

<style lang="less" scoped>
.public-report-page {
  min-height: 100vh;
  padding: 0 20px 30px;
  color: #172033;
  background: radial-gradient(circle at 75% 0%, rgba(82, 196, 26, 0.12), transparent 28%), #f3f6f8;
}
.public-report-shell__header, .public-report-shell, .public-report-shell__footer { width: 100%; max-width: 1080px; margin: 0 auto; }
.public-report-shell__header { display: flex; align-items: center; justify-content: space-between; min-height: 72px; }
.brand { display: flex; align-items: center; gap: 10px; color: inherit; }
.brand-mark { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 12px; color: #fff; background: linear-gradient(135deg, #52c41a, #238636); font-weight: 900; }
.brand > span:last-child { display: grid; }
.brand strong { font-size: 17px; }
.brand small { color: #718096; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
.readonly-badge { padding: 7px 12px; border: 1px solid #bdd9ad; border-radius: 999px; color: #2f7d19; background: #f0faeb; font-size: 12px; font-weight: 700; }
.public-report-shell { overflow: hidden; border: 1px solid #dce4ea; border-radius: 16px; background: #fff; box-shadow: 0 18px 55px rgba(28, 45, 65, 0.09); }
.public-state { display: grid; min-height: 520px; place-items: center; align-content: center; gap: 18px; color: #718096; }
.share-meta { display: flex; justify-content: space-between; gap: 18px; padding: 16px 20px; border-bottom: 1px solid #e8edf1; background: #fbfcfd; }
.share-meta > div { display: grid; gap: 2px; }
.share-meta span { color: #7b8794; font-size: 11px; text-transform: uppercase; }
.share-meta strong { font-size: 14px; }
.public-report-shell__footer { display: flex; justify-content: space-between; gap: 24px; padding: 20px 4px; color: #718096; font-size: 12px; }
.public-report-shell__footer p { margin: 0; }
.public-report-shell__footer a { white-space: nowrap; color: #389e0d; font-weight: 700; }
.public-report-page--dark { color: #edf2f7; background: radial-gradient(circle at 75% 0%, rgba(82, 196, 26, 0.13), transparent 28%), #090b0e; }
.public-report-page--dark .public-report-shell { border-color: #30343d; background: #16181d; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); }
.public-report-page--dark .share-meta { border-color: #30343d; background: #111318; }
.public-report-page--dark .brand small, .public-report-page--dark .share-meta span, .public-report-page--dark .public-report-shell__footer { color: #9ca3af; }
.public-report-page--dark .readonly-badge { border-color: #315523; color: #86ef6e; background: #14230f; }
@media (max-width: 600px) {
  .public-report-page { padding: 0 8px 20px; }
  .public-report-shell__header { min-height: 62px; }
  .brand small { display: none; }
  .readonly-badge { padding: 6px 9px; }
  .share-meta, .public-report-shell__footer { display: grid; }
  .public-report-shell { border-radius: 12px; }
}
</style>
