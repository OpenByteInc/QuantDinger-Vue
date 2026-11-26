<template>
  <img
    v-if="src"
    :class="['provider-logo', `provider-logo--${normalizedProvider}`]"
    :src="src"
    alt=""
    aria-hidden="true"
    :style="logoStyle"
    decoding="async"
    draggable="false"
  >
  <span v-else class="provider-logo-fallback" :style="logoStyle" aria-hidden="true">{{ initials }}</span>
</template>

<script>
import { getProviderLogo } from '@/constants/providerLogos'

export default {
  name: 'ProviderLogo',
  props: {
    provider: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      default: 22
    }
  },
  computed: {
    src () {
      return getProviderLogo(this.provider)
    },
    normalizedProvider () {
      return String(this.provider || '').trim().toLowerCase()
    },
    initials () {
      const value = String(this.provider || '').trim().toUpperCase()
      return value.slice(0, 2)
    },
    logoStyle () {
      const size = `${this.size}px`
      return { width: size, height: size }
    }
  }
}
</script>

<style scoped>
.provider-logo {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center;
  user-select: none;
}
.provider-logo--tiger,
.provider-logo--forthright {
  object-fit: cover;
}
.provider-logo--forthright {
  border-radius: 22%;
}
.provider-logo-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: color-mix(in srgb, var(--brand-color, var(--primary-color, #1677ff)) 16%, transparent);
  color: var(--brand-color, var(--primary-color, #1677ff));
  font-size: 9px;
  font-weight: 800;
  line-height: 1;
}
</style>
