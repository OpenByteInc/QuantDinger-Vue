<template>
  <div
    class="professional-analysis-page"
    :class="{ 'theme-dark': isDarkTheme, embedded }"
    :style="{ '--primary-color': primaryColor }"
  >
    <CopilotWorkbench />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import CopilotWorkbench from './components/CopilotWorkbench.vue'

export default {
  name: 'ProfessionalAnalysisPage',
  components: { CopilotWorkbench },
  props: {
    embedded: { type: Boolean, default: false }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme,
      primaryColor: state => state.app.color || 'var(--primary-color, #1890ff)'
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    }
  }
}
</script>

<style scoped>
.professional-analysis-page {
  width: 100%;
  height: calc(100vh - 88px);
  min-height: 560px;
  overflow: hidden;
  background: #eef3f8;
}

.professional-analysis-page.embedded {
  height: calc(100vh - 92px);
  background: transparent;
}

.professional-analysis-page.theme-dark {
  background: #0a0a0a;
}

@media (max-width: 768px) {
  .professional-analysis-page,
  .professional-analysis-page.embedded {
    min-height: 0;
  }
}
</style>
