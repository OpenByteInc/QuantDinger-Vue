<template>
  <section
    v-if="slides.length"
    class="brand-banner"
    :aria-label="slides[current] && slides[current].name"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="focused = true"
    @focusout="onFocusOut">
    <div class="brand-banner__media">
      <a
        v-for="(ad, i) in slides"
        v-show="i === current"
        :key="ad.id + ad.image_url"
        :href="ad.target_url"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="ad.name + ' · ' + $t('advertisements.newWindow')">
        <img :src="ad.image_url" :alt="ad.name" referrerpolicy="no-referrer" decoding="async" @error="reject(ad)">
      </a>
    </div>
  </section>
</template>

<script>
import { activeAdvertisements } from '@/utils/advertisements.mjs'

export default {
  name: 'AdvertisementSlot',
  props: {
    position: { type: String, required: true },
    items: { type: Array, default: null }
  },
  data: () => ({ current: 0, failed: [], retryAttempts: 0, retryAt: 0, hovered: false, focused: false, paused: false, timer: null, motion: null }),
  computed: {
    configured () { return this.items || (this.$store.state.brand.config.advertisements || []) },
    slides () { return activeAdvertisements(this.configured, this.position).filter(ad => !this.failed.includes(ad.image_url)) }
  },
  watch: {
    configured () { this.failed = []; this.retryAttempts = 0; this.retryAt = 0; this.current = 0 },
    slides () { if (this.current >= this.slides.length) this.current = 0 }
  },
  mounted () {
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.paused = this.motion.matches
    this.motion.addEventListener?.('change', this.onMotion)
    this.startTimer()
  },
  activated () { this.startTimer() },
  deactivated () { clearInterval(this.timer); this.timer = null },
  beforeDestroy () {
    clearInterval(this.timer)
    this.motion?.removeEventListener?.('change', this.onMotion)
  },
  methods: {
    onMotion (event) { this.paused = event.matches },
    startTimer () {
      clearInterval(this.timer)
      this.timer = null
      this.timer = setInterval(() => {
        if (!document.hidden && this.retryAt && Date.now() >= this.retryAt) {
          this.retryAttempts += 1
          this.retryAt = 0
          this.failed = []
        }
        if (!document.hidden && !this.hovered && !this.focused && !this.paused && this.slides.length > 1) this.move(1)
      }, 6000)
    },
    reject (ad) {
      if (!this.failed.includes(ad.image_url)) this.failed = [...this.failed, ad.image_url]
      // Retry transient image failures twice without continuously requesting broken URLs.
      if (!this.retryAt && this.retryAttempts < 2) this.retryAt = Date.now() + 15000 * (this.retryAttempts + 1)
    },
    move (direction) { if (this.slides.length) this.current = (this.current + direction + this.slides.length) % this.slides.length },
    onFocusOut (event) { this.focused = !!(event.relatedTarget && this.$el.contains(event.relatedTarget)) }
  }
}
</script>

<style lang="less">
.theme-dark .brand-banner, .dark .brand-banner, .realdark .brand-banner {
  --component-background: #181818;
  --border-color: #343434;
  --text-color-secondary: #a0abb8;
}
.brand-banner {
  overflow: hidden;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: var(--component-background, #fff);
  color: var(--text-color-secondary, #718096);
  .brand-banner__media { position: relative; aspect-ratio: 3 / 1; background: rgba(127, 127, 127, 0.04); }
  a { display: block; width: 100%; height: 100%; }
  img { display: block; width: 100%; height: 100%; object-fit: contain; }
  a:focus-visible { outline: 2px solid var(--primary-color, #1890ff); outline-offset: -2px; }
}
</style>
