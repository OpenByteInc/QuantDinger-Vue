<template>
  <a-config-provider :locale="locale" :direction="direction">
    <div id="app">
      <router-view/>
    </div>
  </a-config-provider>
</template>

<script>
import { domTitle, setDocumentTitle } from '@/utils/domUtil'
import { i18nRender } from '@/locales'

export default {
  data () {
    return {
    }
  },
  computed: {
    locale () {
      const { title } = this.$route.meta
      title && (setDocumentTitle(`${i18nRender(title)} - ${domTitle}`))

      return this.$i18n.getLocaleMessage(this.$store.getters.lang).antLocale
    },
    direction () {
      const lang = this.$store.getters.lang
      return lang && /^ar/i.test(lang) ? 'rtl' : 'ltr'
    },
    theme () {
      return this.$store.state.app.theme
    }
  },
  watch: {
    theme: {
      handler (val) {
        if (val === 'dark' || val === 'realdark') {
          document.body.classList.add('dark')
          document.body.classList.toggle('realdark', val === 'realdark')
          document.body.classList.remove('light')
        } else {
          document.body.classList.remove('dark')
          document.body.classList.remove('realdark')
          document.body.classList.add('light')
        }
      },
      immediate: true
    }
  }
}
</script>
