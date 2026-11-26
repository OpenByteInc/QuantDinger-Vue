<template>
  <section class="advertisement-settings">
    <header class="ad-settings-heading">
      <div><h3>{{ $t('advertisements.title') }}</h3><p>{{ $t('advertisements.help') }}</p></div>
      <a-button :disabled="loading || failed || saving || items.length >= 40" @click="add"><a-icon type="plus" /> {{ $t('advertisements.add') }}</a-button>
    </header>
    <a-alert v-if="failed" type="error" show-icon :message="$t('advertisements.failed')" />
    <a-spin :spinning="loading">
      <div v-if="!items.length && !loading" class="ad-settings-empty"><a-icon type="picture" /><span>{{ $t('advertisements.empty') }}</span></div>
      <div v-else class="ad-settings-scroll" role="region" tabindex="0" :aria-label="$t('advertisements.title')">
        <table class="ad-settings-table">
          <thead><tr><th>{{ $t('advertisements.preview') }}</th><th>{{ $t('advertisements.content') }}</th><th>{{ $t('advertisements.position') }}</th><th>{{ $t('advertisements.sort') }}</th><th>{{ $t('advertisements.enabled') }}</th><th>{{ $t('advertisements.actions') }}</th></tr></thead>
          <tbody>
            <tr v-for="ad in items" :key="ad.id" :class="{ 'is-disabled': !ad.enabled }">
              <td><div class="ad-settings-thumbnail"><img
                v-if="safeUrl(ad.image_url) && !broken.includes(ad.image_url)"
                :key="ad.image_url"
                :src="ad.image_url"
                :alt="ad.name"
                referrerpolicy="no-referrer"
                @error="broken.push(ad.image_url)"><a-icon v-else type="picture" /></div></td>
              <td class="ad-settings-content">
                <a-input v-model="ad.name" :max-length="80" :placeholder="$t('advertisements.name')" :aria-label="$t('advertisements.name')" :disabled="saving" />
                <a-input v-model.trim="ad.image_url" :max-length="2048" :placeholder="$t('advertisements.imageUrl')" :aria-label="$t('advertisements.imageUrl')" :disabled="saving"><a-icon slot="prefix" type="picture" /></a-input>
                <a-input v-model.trim="ad.target_url" :max-length="2048" :placeholder="$t('advertisements.targetUrl')" :aria-label="$t('advertisements.targetUrl')" :disabled="saving"><a-icon slot="prefix" type="link" /></a-input>
              </td>
              <td><a-select v-model="ad.position" :aria-label="$t('advertisements.position')" :disabled="saving"><a-select-option v-for="position in positions" :key="position" :value="position">{{ $t('advertisements.' + position) }}</a-select-option></a-select></td>
              <td><a-input-number
                v-model="ad.sort_order"
                :min="0"
                :max="9999"
                :precision="0"
                :aria-label="$t('advertisements.sort')"
                :disabled="saving" /></td>
              <td><a-switch v-model="ad.enabled" :aria-label="$t('advertisements.enabled')" :disabled="saving" /></td>
              <td><a-popconfirm :title="$t('advertisements.confirmDelete')" :ok-text="$t('common.confirm')" :cancel-text="$t('common.cancel')" @confirm="remove(ad)"><a-button type="link" :disabled="saving" :aria-label="$t('advertisements.delete')"><a-icon type="delete" /></a-button></a-popconfirm></td>
            </tr>
          </tbody>
        </table>
      </div>
    </a-spin>
    <footer class="ad-settings-footer">
      <span>{{ $t(dirty ? 'advertisements.unsaved' : 'advertisements.hint') }}</span>
      <div><a-button :disabled="loading || saving" @click="reload">{{ $t('advertisements.reload') }}</a-button><a-button type="primary" :loading="saving" :disabled="!dirty || loading || failed" @click="save">{{ $t('advertisements.save') }}</a-button></div>
    </footer>
  </section>
</template>

<script>
import { getAdvertisements, saveAdvertisements } from '@/api/advertisements'
import { AD_POSITIONS, isAdvertisementUrl, validAdvertisement } from '@/utils/advertisements.mjs'

export default {
  name: 'AdvertisementSettings',
  data: () => ({ items: [], revision: 0, baseline: '[]', loading: false, saving: false, failed: false, broken: [], positions: AD_POSITIONS }),
  computed: { dirty () { return JSON.stringify(this.items) !== this.baseline } },
  mounted () { this.load() },
  methods: {
    safeUrl: isAdvertisementUrl,
    async load () {
      this.loading = true
      this.failed = false
      try {
        const result = await getAdvertisements()
        if (result.code !== 1) throw new Error('advertisements.failed')
        this.accept(result.data)
      } catch (_) { this.failed = true } finally { this.loading = false }
    },
    accept (data) { this.items = data.items; this.revision = data.revision; this.baseline = JSON.stringify(this.items); this.broken = [] },
    reload () {
      if (!this.dirty) return this.load()
      this.$confirm({ title: this.$t('advertisements.discard'), onOk: () => this.load() })
    },
    add () {
      const id = window.crypto?.randomUUID?.() || `ad-${Date.now()}-${Math.random().toString(36).slice(2)}`
      this.items.push({ id, name: '', image_url: '', target_url: '', position: 'sidebar', sort_order: Math.min(9999, this.items.length * 10), enabled: false })
    },
    remove (ad) { this.items = this.items.filter(item => item.id !== ad.id) },
    async save () {
      if (!this.items.every(validAdvertisement)) return this.$message.error(this.$t('advertisements.invalid'))
      this.saving = true
      try {
        const result = await saveAdvertisements({ items: this.items, revision: this.revision })
        if (result.code !== 1) throw new Error(result.msg)
        this.accept(result.data)
        await this.$store.dispatch('LoadBrandConfig', { force: true })
        this.$message.success(this.$t('advertisements.saved'))
      } catch (error) {
        const message = error.response?.data?.msg || error.message
        this.$message.error(this.$t(message === 'advertisements.conflict' ? message : 'advertisements.failed'))
      } finally { this.saving = false }
    }
  }
}
</script>

<style lang="less">
.theme-dark .advertisement-settings, .dark .advertisement-settings, .realdark .advertisement-settings {
  --border-color: #343434;
  --text-color: #e0e6ed;
  --text-color-secondary: #a0abb8;
}
.advertisement-settings {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  color: var(--text-color, #263445);
  .ad-settings-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
  h3 { margin: 0 0 6px; color: inherit; font-size: 16px; font-weight: 600; }
  p { margin: 0; color: var(--text-color-secondary, #718096); font-size: 12px; line-height: 1.7; }
  .ad-settings-empty { display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 120px; border: 1px dashed var(--border-color, #e5e7eb); border-radius: 8px; color: var(--text-color-secondary, #718096); }
  .ad-settings-scroll { overflow-x: auto; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; }
  .ad-settings-table { width: 100%; min-width: 820px; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
  th { padding: 10px; text-align: left; font-weight: 500; background: rgba(127, 127, 127, .06); color: var(--text-color-secondary, #718096); }
  th:first-child { width: 120px; } th:nth-child(2) { width: auto; } th:nth-child(3) { width: 160px; } th:nth-child(4) { width: 88px; } th:nth-child(5), th:nth-child(6) { width: 64px; }
  td { padding: 12px 10px; border-top: 1px solid var(--border-color, #e5e7eb); vertical-align: middle; }
  .ad-settings-thumbnail { width: 100px; aspect-ratio: 3 / 1; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color, #e5e7eb); border-radius: 4px; overflow: hidden; color: var(--text-color-secondary, #718096); }
  img { width: 100%; height: 100%; object-fit: contain; }
  .ad-settings-content > * { display: block; margin-bottom: 5px; } .ad-settings-content > :last-child { margin-bottom: 0; }
  .ant-select, .ant-input-number { width: 100%; }
  .is-disabled .ad-settings-thumbnail { opacity: .5; }
  .ad-settings-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 14px; font-size: 12px; color: var(--text-color-secondary, #718096); }
  .ad-settings-footer > div { display: flex; gap: 8px; flex-shrink: 0; }
  @media (max-width: 700px) { .ad-settings-heading, .ad-settings-footer { flex-wrap: wrap; } }
}
</style>
