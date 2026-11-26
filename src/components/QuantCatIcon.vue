<template>
  <span class="quant-cat-icon" aria-hidden="true">
    <span class="quant-cat-icon__face">
      <img class="quant-cat-icon__art quant-cat-icon__ears" src="@/assets/quant-cat-mark.png" alt="" draggable="false">
      <span class="quant-cat-icon__eyes">
        <img class="quant-cat-icon__art quant-cat-icon__eye-left" src="@/assets/quant-cat-mark.png" alt="" draggable="false">
        <img class="quant-cat-icon__art quant-cat-icon__eye-right" src="@/assets/quant-cat-mark.png" alt="" draggable="false">
      </span>
    </span>
  </span>
</template>

<script>
export default { name: 'QuantCatIcon' }
</script>

<style>
.quant-cat-icon {
  position: relative;
  display: inline-block;
  width: 26px;
  height: 22px;
  flex: none;
  pointer-events: none;
}
.quant-cat-icon__face {
  position: absolute;
  inset: 2px 0 auto;
  width: 100%;
  aspect-ratio: 841 / 565;
  transition: transform 180ms ease;
}
.quant-cat-icon__art {
  position: absolute;
  width: 149.11%;
  max-width: none;
  height: auto;
  left: -23.42%;
  top: -64.96%;
  filter: brightness(0) invert(1);
}
.quant-cat-icon__ears {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 74% 100%, 74% 57%, 26% 57%, 26% 100%, 0 100%);
}
.quant-cat-icon__eyes {
  position: absolute;
  inset: 0;
  transform-origin: 50% 81%;
  animation: launcher-cat-blink 6.4s ease-in-out infinite;
}
.quant-cat-icon__eye-left { clip-path: inset(57% 55% 25% 26%); }
.quant-cat-icon__eye-right { clip-path: inset(57% 26.8% 25% 54%); }
button:hover .quant-cat-icon__face,
button:focus-visible .quant-cat-icon__face { transform: translateY(-1px) rotate(-7deg); }
@keyframes launcher-cat-blink {
  0%, 43%, 47%, 100% { transform: scaleY(1); }
  45% { transform: scaleY(.08); }
}
@media (prefers-reduced-motion: reduce) {
  .quant-cat-icon__eyes { animation: none; }
  .quant-cat-icon__face { transition: none; }
  button:hover .quant-cat-icon__face,
  button:focus-visible .quant-cat-icon__face { transform: none; }
}
</style>
