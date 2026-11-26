<template>
  <button
    type="button"
    class="quant-cat"
    :class="[`mood-${mood}`, { 'reduced-motion': reducedMotion, 'is-greeting': greeting, 'is-paused': paused }]"
    :aria-label="$t('aiAssetAnalysis.copilot.greetCat')"
    :title="$t('aiAssetAnalysis.copilot.greetCat')"
    @click="greet"
    @mouseenter="react('curious')"
    @focus="react('curious')"
  >
    <span class="cat-figure" aria-hidden="true">
      <img class="cat-art cat-ears" src="@/assets/quant-cat-mark.png" alt="" draggable="false">
      <span class="cat-gaze" :style="{ transform: `translate(${gazeX}px, ${gazeY}px)` }">
        <span class="cat-blink">
          <img class="cat-art cat-eye cat-eye-left" src="@/assets/quant-cat-mark.png" alt="" draggable="false">
          <img class="cat-art cat-eye cat-eye-right" src="@/assets/quant-cat-mark.png" alt="" draggable="false">
        </span>
      </span>
    </span>
  </button>
</template>

<script>
export default {
  name: 'ResearchCat',
  props: { typing: { type: Boolean, default: false } },
  data () {
    return { mood: 'calm', reducedMotion: false, greeting: false, gazeX: 0, gazeY: 0, paused: false }
  },
  watch: {
    typing () { this.settle() }
  },
  mounted () {
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.updateMotionPreference()
    this.motionQuery.addEventListener('change', this.updateMotionPreference)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    window.addEventListener('pointermove', this.followPointer, { passive: true })
    window.addEventListener('blur', this.resetGaze)
  },
  activated () { this.inactive = false; this.onVisibilityChange() },
  deactivated () { this.inactive = true; this.onVisibilityChange() },
  beforeDestroy () {
    this.clearMotion()
    this.motionQuery.removeEventListener('change', this.updateMotionPreference)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    window.removeEventListener('pointermove', this.followPointer)
    window.removeEventListener('blur', this.resetGaze)
  },
  methods: {
    clearMotion () {
      window.clearTimeout(this.resetTimer)
      window.cancelAnimationFrame(this.gazeFrame)
      this.gazeFrame = null
    },
    resetGaze () { this.gazeX = 0; this.gazeY = 0 },
    settle () {
      this.clearMotion()
      this.resetGaze()
      this.greeting = false
      this.mood = this.typing ? 'closed' : 'calm'
    },
    updateMotionPreference () {
      this.reducedMotion = this.motionQuery.matches
      this.settle()
    },
    onVisibilityChange () {
      this.paused = document.hidden || Boolean(this.inactive)
      this.settle()
    },
    followPointer (event) {
      if (event.pointerType !== 'mouse' || this.typing || this.reducedMotion || this.paused || this.gazeFrame) return
      const { clientX, clientY } = event
      this.gazeFrame = window.requestAnimationFrame(() => {
        const bounds = this.$el.getBoundingClientRect()
        this.gazeX = Math.max(-4, Math.min(4, (clientX - bounds.x - bounds.width / 2) / 90))
        this.gazeY = Math.max(-3, Math.min(3, (clientY - bounds.y - bounds.height / 2) / 120))
        this.gazeFrame = null
      })
    },
    react (mood = 'curious') {
      if (this.typing || this.paused) return
      this.clearMotion()
      this.mood = mood
      this.resetTimer = window.setTimeout(this.settle, 1600)
    },
    greet () {
      this.react(this.mood === 'wink' ? 'smile' : 'wink')
      this.greeting = !this.reducedMotion
    }
  }
}
</script>

<style scoped>

.quant-cat {
  position: relative;
  display: block;
  width: 112px;
  aspect-ratio: 841 / 565;
  justify-self: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  user-select: none;
  flex: none;
  color: var(--qd-text);
  border-radius: 12px;
  -webkit-tap-highlight-color: transparent;
}

.cat-art {
  position: absolute;
  display: block;
  width: 149.11%;
  max-width: none;
  height: auto;
  left: -23.42%;
  top: -64.96%;
  pointer-events: none;
  transition: filter 180ms ease;
}

.cat-ears {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 74% 100%, 74% 57%, 26% 57%, 26% 100%, 0 100%);
}

.cat-gaze,
.cat-blink {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.cat-gaze {
  transform: translate(0, 0);
  transition: transform 180ms ease-out;
}

.cat-blink {
  transform-origin: 50% 81%;
  animation: cat-blink 6.4s ease-in-out infinite;
}

.cat-blink::before,
.cat-blink::after {
  position: absolute;
  top: 78%;
  width: 23%;
  height: 4px;
  border-radius: 2px;
  background: var(--qd-text);
  opacity: 0;
  content: '';
  transform: translateY(-2px) scaleX(.68);
  transform-origin: center;
  transition:
    opacity 140ms ease-out,
    transform 200ms cubic-bezier(.2, .8, .2, 1);
}

.cat-blink::before {
  left: 18.2%;
}

.cat-blink::after {
  right: 17.1%;
}

.cat-eye {
  transition:
    transform 240ms cubic-bezier(.2, .8, .2, 1),
    opacity 120ms ease-out;
}

.cat-eye-left {
  clip-path: inset(57% 55% 25% 26%);
  transform-origin: 35.6% 65.75%;
}

.cat-eye-right {
  clip-path: inset(57% 26.8% 25% 54%);
  transform-origin: 63.6% 65.75%;
}

.mood-closed .cat-eye { opacity: 0; }
.mood-closed .cat-blink::before,
.mood-closed .cat-blink::after {
  opacity: 1;
  transform: translateY(0) scaleX(1);
}
.mood-wink .cat-eye-left { transform: scaleY(.1) rotate(-8deg); }
.mood-wink .cat-eye-right { transform: scale(1.06); }
.mood-smile .cat-eye-left { transform: rotate(-8deg) scaleY(.25); }
.mood-smile .cat-eye-right { transform: rotate(8deg) scaleY(.25); }
.mood-surprised .cat-eye { transform: scale(1.16); }
.mood-curious .cat-eye-left { transform: translateY(-1px) rotate(-6deg) scaleY(1.08); }
.mood-curious .cat-eye-right { transform: translateY(1px) rotate(6deg) scaleY(.65); }
.mood-sleepy .cat-eye { transform: translateY(1px) scaleY(.35); }
.mood-look-left .cat-gaze { transform: translate(-3px, -1px); }
.mood-look-right .cat-gaze { transform: translate(3px, 0); }
.quant-cat:not(.mood-calm) .cat-blink { animation: none; }

@keyframes cat-blink {
  0%, 43%, 47%, 100% { transform: scaleY(1); }
  45% { transform: scaleY(.08); }
}

@media (max-width: 480px) {
  .quant-cat { width: 84px; }
}

.reduced-motion .cat-blink, .is-paused .cat-blink { animation: none; }
.reduced-motion .cat-blink::before,
.reduced-motion .cat-blink::after,
.reduced-motion .cat-eye,
.reduced-motion .cat-gaze { transition: none; }

@media (prefers-reduced-motion: reduce) {
  .cat-blink { animation: none; }
  .cat-blink::before,
  .cat-blink::after,
  .cat-eye,
  .cat-gaze { transition: none; }
}

.quant-cat:focus-visible { outline: 2px solid var(--qd-accent); outline-offset: 8px; }
.cat-figure { position: absolute; inset: 0; }
.is-greeting .cat-figure { animation: cat-greeting 650ms ease-in-out; }
@keyframes cat-greeting {
  0%, 100% { transform: translateY(0) rotate(0); }
  35% { transform: translateY(-5px) rotate(-7deg); }
  70% { transform: translateY(-2px) rotate(5deg); }
}
.reduced-motion .cat-figure { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .is-greeting .cat-figure { animation: none; }
}
</style>

<style>
body.dark .research-layout .quant-cat .cat-art,
body.realdark .research-layout .quant-cat .cat-art,
.theme-dark .research-layout .quant-cat .cat-art { filter: grayscale(1) invert(.94); }
</style>
