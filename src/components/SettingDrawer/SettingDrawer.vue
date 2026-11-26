<template>
  <div class="setting-drawer" :class="{ 'setting-drawer--dark': isDarkDrawer }">
    <a-drawer
      v-if="visible"
      :width="drawerWidth"
      :title="$t('app.setting.tooltip')"
      placement="right"
      @close="onClose"
      :closable="true"
      :visible="visible"
      :get-container="false"
      :destroy-on-close="true"
    >
      <div class="setting-drawer-index-content">

        <section class="setting-section">
          <div class="setting-section__heading">
            <h3 class="setting-drawer-index-title">{{ $t('app.setting.pagestyle') }}</h3>
          </div>

          <div class="setting-drawer-index-blockChecbox">
            <a-tooltip>
              <template slot="title">
                {{ $t('app.setting.pagestyle.dark') }}
              </template>
              <button
                type="button"
                class="setting-drawer-index-item"
                :class="{ 'setting-drawer-index-item--active': isDarkNavTheme }"
                :aria-label="$t('app.setting.pagestyle.dark')"
                :aria-pressed="isDarkNavTheme"
                @click="handleMenuTheme('realdark')"
              >
                <span class="appearance-preview appearance-preview--dark" aria-hidden="true">
                  <span class="appearance-preview__sidebar"></span>
                  <span class="appearance-preview__toolbar"></span>
                  <span class="appearance-preview__chart"></span>
                </span>
                <span>{{ $t('app.setting.pagestyle.dark') }}</span>
                <div class="setting-drawer-index-selectIcon" v-if="isDarkNavTheme">
                  <a-icon type="check"/>
                </div>
              </button>
            </a-tooltip>

            <a-tooltip>
              <template slot="title">
                {{ $t('app.setting.pagestyle.light') }}
              </template>
              <button
                type="button"
                class="setting-drawer-index-item"
                :class="{ 'setting-drawer-index-item--active': currentNavTheme === 'light' }"
                :aria-label="$t('app.setting.pagestyle.light')"
                :aria-pressed="currentNavTheme === 'light'"
                @click="handleMenuTheme('light')"
              >
                <span class="appearance-preview appearance-preview--light" aria-hidden="true">
                  <span class="appearance-preview__sidebar"></span>
                  <span class="appearance-preview__toolbar"></span>
                  <span class="appearance-preview__chart"></span>
                </span>
                <span>{{ $t('app.setting.pagestyle.light') }}</span>
                <div class="setting-drawer-index-selectIcon" v-if="currentNavTheme === 'light'">
                  <a-icon type="check"/>
                </div>
              </button>
            </a-tooltip>
          </div>
        </section>

        <!-- Theme color selector controls app-level accent styles. -->
        <section class="setting-section">
          <div class="setting-section__heading">
            <h3 class="setting-drawer-index-title">{{ $t('app.setting.themecolor') }}</h3>
          </div>

          <div class="setting-drawer-theme-color-list">
            <a-tooltip class="setting-drawer-theme-color-colorBlock" v-for="(item, index) in colorList" :key="index">
              <template slot="title">
                {{ item.key }}
              </template>
              <button
                type="button"
                class="setting-drawer-theme-color-swatch"
                :class="{ 'setting-drawer-theme-color-swatch--active': item.color === currentPrimaryColor }"
                :style="{ '--swatch-color': item.color }"
                :aria-label="item.key"
                :aria-pressed="item.color === currentPrimaryColor"
                @click="changeColor(item.color)"
              >
                <a-icon type="check" v-if="item.color === currentPrimaryColor"></a-icon>
              </button>
            </a-tooltip>

          </div>
        </section>

        <!-- Navigation Mode and Content Width are hidden -->
        <div :style="{ marginBottom: '24px', display: 'none' }">
          <h3 class="setting-drawer-index-title">{{ $t('app.setting.navigationmode') }}</h3>

          <div class="setting-drawer-index-blockChecbox">
            <a-tooltip>
              <template slot="title">
                {{ $t('app.setting.sidemenu.nav') }}
              </template>
              <div class="setting-drawer-index-item" @click="handleLayout('sidemenu')">
                <img src="https://gw.alipayobjects.com/zos/rmsportal/JopDzEhOqwOjeNTXkoje.svg" alt="sidemenu" />
                <div class="setting-drawer-index-selectIcon" v-if="layoutMode === 'sidemenu'">
                  <a-icon type="check"/>
                </div>
              </div>
            </a-tooltip>

            <a-tooltip>
              <template slot="title">
                {{ $t('app.setting.topmenu.nav') }}
              </template>
              <div class="setting-drawer-index-item" @click="handleLayout('topmenu')">
                <img src="https://gw.alipayobjects.com/zos/rmsportal/KDNDBbriJhLwuqMoxcAr.svg" alt="topmenu" />
                <div class="setting-drawer-index-selectIcon" v-if="layoutMode !== 'sidemenu'">
                  <a-icon type="check"/>
                </div>
              </div>
            </a-tooltip>
          </div>
          <div :style="{ marginTop: '24px' }">
            <a-list :split="false">
              <a-list-item>
                <a-tooltip slot="actions">
                  <template slot="title">
                    {{ $t('app.setting.content-width.tooltip') }}
                  </template>
                  <a-select size="small" style="width: 80px;" :defaultValue="currentContentWidth" @change="handleContentWidthChange">
                    <a-select-option value="Fixed">{{ $t('app.setting.content-width.fixed') }}</a-select-option>
                    <a-select-option value="Fluid" v-if="layoutMode !== 'sidemenu'">{{ $t('app.setting.content-width.fluid') }}</a-select-option>
                  </a-select>
                </a-tooltip>
                <a-list-item-meta>
                  <div slot="title">{{ $t('app.setting.content-width') }}</div>
                </a-list-item-meta>
              </a-list-item>
              <a-list-item>
                <a-switch slot="actions" size="small" :defaultChecked="currentFixedHeader" @change="handleFixedHeader" />
                <a-list-item-meta>
                  <div slot="title">{{ $t('app.setting.fixedheader') }}</div>
                </a-list-item-meta>
              </a-list-item>
              <a-list-item>
                <a-switch slot="actions" size="small" :disabled="!currentFixedHeader" :defaultChecked="currentAutoHideHeader" @change="handleFixedHeaderHidden" />
                <a-list-item-meta>
                  <a-tooltip slot="title" placement="left">
                    <template slot="title">{{ $t('app.setting.fixedheader.tooltip') }}</template>
                    <div :style="{ opacity: !currentFixedHeader ? '0.5' : '1' }">{{ $t('app.setting.autoHideHeader') }}</div>
                  </a-tooltip>
                </a-list-item-meta>
              </a-list-item>
              <a-list-item >
                <a-switch slot="actions" size="small" :disabled="(layoutMode === 'topmenu')" :defaultChecked="fixSiderbar" @change="handleFixSiderbar" />
                <a-list-item-meta>
                  <div slot="title" :style="{ textDecoration: layoutMode === 'topmenu' ? 'line-through' : 'unset' }">{{ $t('app.setting.fixedsidebar') }}</div>
                </a-list-item-meta>
              </a-list-item>
            </a-list>
          </div>
        </div>
        <section class="setting-section setting-section--compact">
          <div class="setting-section__heading">
            <h3 class="setting-drawer-index-title">{{ $t('app.setting.othersettings') }}</h3>
          </div>
          <div>
            <a-list :split="false">
              <a-list-item>
                <a-switch slot="actions" size="small" :aria-label="$t('app.setting.weakmode')" :checked="currentColorWeak" @change="onColorWeak" />
                <a-list-item-meta>
                  <div slot="title">{{ $t('app.setting.weakmode') }}</div>
                </a-list-item-meta>
              </a-list-item>
              <a-list-item>
                <a-switch slot="actions" size="small" :aria-label="$t('app.setting.multitab')" :checked="currentMultiTab" @change="onMultiTab" />
                <a-list-item-meta>
                  <div slot="title">{{ $t('app.setting.multitab') }}</div>
                </a-list-item-meta>
              </a-list-item>
            </a-list>
          </div>
        </section>
        <slot />
      </div>
    </a-drawer>
  </div>
</template>

<script>
import SettingItem from './SettingItem'
import config from '@/config/defaultSettings'
import { updateColorWeak, getColorList } from './settingConfig'
import { baseMixin } from '@/store/app-mixin'

export default {
  components: {
    SettingItem
  },
  props: {
    settings: {
      type: Object,
      default: () => ({})
    }
  },
  mixins: [baseMixin],
  data () {
    return {
      visible: false
    }
  },
  computed: {
    colorList () {
      return getColorList()
    },
    layoutMode () {
      return this.settings.layout || this.layout || 'sidemenu'
    },
    fixSiderbar () {
      return this.settings.fixSiderbar !== undefined ? this.settings.fixSiderbar : (this.fixedSidebar || false)
    },
    currentNavTheme () {
      return this.settings.theme || this.navTheme || config.navTheme || 'realdark'
    },
    currentPrimaryColor () {
      return this.settings.primaryColor || this.primaryColor || config.primaryColor || '#1890ff'
    },
    currentFixedHeader () {
      return this.settings.fixedHeader !== undefined ? this.settings.fixedHeader : (this.fixedHeader || false)
    },
    currentContentWidth () {
      return this.settings.contentWidth || this.contentWidth || 'Fluid'
    },
    currentAutoHideHeader () {
      return this.settings.autoHideHeader !== undefined ? this.settings.autoHideHeader : (this.autoHideHeader || false)
    },
    currentColorWeak () {
      return this.settings.colorWeak !== undefined ? this.settings.colorWeak : (this.colorWeak || false)
    },
    currentMultiTab () {
      return this.settings.multiTab !== undefined ? this.settings.multiTab : (this.multiTab || false)
    },
    isDarkDrawer () {
      return this.isDarkNavTheme
    },
    drawerWidth () {
      return this.isMobile ? '100%' : 380
    },
    isDarkNavTheme () {
      return this.currentNavTheme === 'dark' || this.currentNavTheme === 'realdark'
    }
  },
  watch: {

  },
  mounted () {
    if (this.currentColorWeak !== config.colorWeak) {
      updateColorWeak(this.currentColorWeak)
    }
  },
  methods: {
    showDrawer () {
      this.visible = true
    },
    onClose () {
      this.visible = false
    },
    toggle () {
      this.visible = !this.visible
    },
    onColorWeak (checked) {
      this.$emit('change', { type: 'colorWeak', value: checked })
      updateColorWeak(checked)
    },
    onMultiTab (checked) {
      this.$emit('change', { type: 'multiTab', value: checked })
    },
    handleMenuTheme (theme) {
      this.$emit('change', { type: 'theme', value: theme })
    },
    doCopy () {
      // get current settings from mixin or this.$store.state.app, pay attention to the property name
      const text = `export default {
  primaryColor: '${this.currentPrimaryColor}', // primary color of ant design
  navTheme: '${this.currentNavTheme}', // theme for nav menu
  layout: '${this.layoutMode}', // nav menu position: sidemenu or topmenu
  contentWidth: '${this.currentContentWidth}', // layout of content: Fluid or Fixed, only works when layout is topmenu
  fixedHeader: ${this.currentFixedHeader}, // sticky header
  fixSiderbar: ${this.fixSiderbar}, // sticky siderbar
  autoHideHeader: ${this.currentAutoHideHeader}, //  auto hide header
  colorWeak: ${this.currentColorWeak},
  multiTab: ${this.currentMultiTab},
  production: process.env.NODE_ENV === 'production' && process.env.VUE_APP_PREVIEW !== 'true'
}`
      // Native clipboard with execCommand fallback (vue-clipboard2 was
      // removed from the bundle — see package.json change history).
      const okMsg = this.$t('app.setting.copy.success')
      const failMsg = this.$t('app.setting.copy.fail')
      const fallback = () => {
        try {
          const ta = document.createElement('textarea')
          ta.value = text
          ta.setAttribute('readonly', '')
          ta.style.position = 'fixed'
          ta.style.left = '-1000px'
          ta.style.top = '-1000px'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.focus()
          ta.select()
          const ok = document.execCommand && document.execCommand('copy')
          document.body.removeChild(ta)
          if (ok) this.$message.success(okMsg)
          else this.$message.error(failMsg)
        } catch (_) {
          this.$message.error(failMsg)
        }
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
          .then(() => this.$message.success(okMsg))
          .catch(fallback)
      } else {
        fallback()
      }
    },
    handleLayout (mode) {
      this.$emit('change', { type: 'layout', value: mode })
      if (mode === 'topmenu') {
        this.$emit('change', { type: 'fixSiderbar', value: false })
      }
    },
    handleContentWidthChange (type) {
      this.$emit('change', { type: 'contentWidth', value: type })
    },
    changeColor (color) {
      if (this.currentPrimaryColor !== color) {
        this.$emit('change', { type: 'primaryColor', value: color })
      }
    },
    handleFixedHeader (fixed) {
      this.$emit('change', { type: 'fixedHeader', value: fixed })
    },
    handleFixedHeaderHidden (autoHidden) {
      this.$emit('change', { type: 'autoHideHeader', value: autoHidden })
    },
    handleFixSiderbar (fixed) {
      if (this.layoutMode === 'topmenu') {
        this.$emit('change', { type: 'fixSiderbar', value: false })
        return
      }
      this.$emit('change', { type: 'fixSiderbar', value: fixed })
    }
  }
}
</script>

<style lang="less">
.setting-drawer {
  --setting-drawer-bg: #ffffff;
  --setting-drawer-panel: #f5f5f5;
  --setting-drawer-border: #e8e8e8;
  --setting-drawer-text: #262626;
  --setting-drawer-muted: #737373;

  &.setting-drawer--dark {
    --setting-drawer-bg: #080808;
    --setting-drawer-panel: #111111;
    --setting-drawer-border: #292929;
    --setting-drawer-text: #e6e6e6;
    --setting-drawer-muted: #a3a3a3;
  }

  .ant-drawer-content,
  .ant-drawer-header,
  .ant-drawer-body {
    background: var(--setting-drawer-bg) !important;
    color: var(--setting-drawer-text);
  }

  .ant-drawer-header {
    padding: 20px 56px 20px 24px;
    border-bottom: 1px solid var(--setting-drawer-border);
    border-radius: 0;
  }

  .ant-drawer-title {
    color: var(--setting-drawer-text) !important;
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
  }

  .ant-drawer-close {
    top: 12px;
    right: 12px;
    width: 40px;
    height: 40px;
    color: var(--setting-drawer-muted);
    line-height: 40px;
    border-radius: 4px;

    &:hover { background: var(--setting-drawer-panel); }
  }

  .ant-drawer-body { padding: 0 24px 24px !important; }
  .ant-drawer-handle,
  .setting-drawer-index-handle { display: none !important; }

  .setting-section {
    padding: 24px 0;
    border-bottom: 1px solid var(--setting-drawer-border);
  }

  .setting-drawer-index-title {
    margin: 0 0 16px;
    color: var(--setting-drawer-text) !important;
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }

  .setting-drawer-index-blockChecbox {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .setting-drawer-index-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    min-width: 0;
    padding: 8px;
    color: var(--setting-drawer-muted);
    background: transparent;
    border: 1px solid var(--setting-drawer-border);
    border-radius: 6px;
    cursor: pointer;
    transition: border-color 0.16s ease;

    > span:not(.appearance-preview) {
      font-size: 13px;
      font-weight: 600;
      line-height: 20px;
      white-space: nowrap;
      text-align: left;
    }

    &:hover,
    &--active { border-color: var(--primary-color); }
    &--active { color: var(--setting-drawer-text); }
  }

  .appearance-preview {
    position: relative;
    display: block;
    height: 68px;
    overflow: hidden;
    background: #f4f4f4;
    border: 1px solid #e0e0e0;
    border-radius: 3px;

    &__sidebar {
      position: absolute;
      inset: 0 auto 0 0;
      width: 22%;
      background: #e7e7e7;
      border-right: 1px solid #d9d9d9;
    }
    &__toolbar {
      position: absolute;
      inset: 0 0 auto 22%;
      height: 12px;
      background: #fff;
      border-bottom: 1px solid #e0e0e0;
    }
    &__chart {
      position: absolute;
      inset: 24px 10px 10px 32%;
      background: var(--primary-color);
      opacity: 0.7;
      clip-path: polygon(0 78%, 19% 56%, 36% 65%, 57% 28%, 75% 39%, 100% 0, 100% 8%, 75% 47%, 57% 36%, 36% 73%, 19% 64%, 0 86%);
    }
    &--dark {
      background: #171717;
      border-color: #353535;
      .appearance-preview__sidebar { background: #222; border-color: #353535; }
      .appearance-preview__toolbar { background: #292929; border-color: #353535; }
    }
  }

  .setting-drawer-index-selectIcon {
    position: absolute;
    right: 10px;
    bottom: 10px;
    color: var(--primary-color);
    font-size: 14px;
    line-height: 20px;
  }

  .setting-drawer-theme-color-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .setting-drawer-theme-color-swatch {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    color: #fff;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 50%;
    cursor: pointer;

    &::before {
      position: absolute;
      inset: 3px;
      background: var(--swatch-color);
      border-radius: 50%;
      content: '';
    }
    .anticon { position: relative; font-size: 12px; }
    &:hover { border-color: var(--setting-drawer-muted); }
    &--active { border-color: var(--swatch-color); }
  }

  button:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 3px;
  }

  .setting-section--compact {
    .setting-drawer-index-title { margin-bottom: 8px; }
    .ant-list-item { min-height: 44px; padding: 10px 0; }
    .ant-list-item-meta-title {
      margin: 0;
      color: var(--setting-drawer-text) !important;
      font-size: 14px;
      font-weight: 400;
      line-height: 24px;
    }
    .ant-switch:not(.ant-switch-checked) {
      background: var(--setting-drawer-muted) !important;
    }
    .ant-list-item-action { margin-left: 16px; }
    .ant-list-item-action > li { padding: 0; }
  }
}
@media (max-width: 767px) {
  .setting-drawer .ant-drawer-content-wrapper { max-width: 100vw !important; }
  .setting-drawer .setting-drawer-theme-color-list { gap: 4px; }
  .basic-layout-wrapper:has(.setting-drawer .ant-drawer-open) > .mobile-menu-close {
    display: none !important;
  }
}
</style>
