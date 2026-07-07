<template>
  <div class="setting-drawer" :class="{ 'setting-drawer--dark': isDarkDrawer }">
    <a-drawer
      width="300"
      placement="right"
      @close="onClose"
      :closable="true"
      :visible="visible"
      :get-container="false"
    >
      <div class="setting-drawer-index-content">

        <div :style="{ marginBottom: '24px' }">
          <h3 class="setting-drawer-index-title">{{ $t('app.setting.pagestyle') }}</h3>

          <div class="setting-drawer-index-blockChecbox">
            <a-tooltip>
              <template slot="title">
                {{ $t('app.setting.pagestyle.dark') }}
              </template>
              <div class="setting-drawer-index-item" @click="handleMenuTheme('dark')">
                <img src="https://gw.alipayobjects.com/zos/rmsportal/LCkqqYNmvBEbokSDscrm.svg" alt="dark" />
                <div class="setting-drawer-index-selectIcon" v-if="currentNavTheme === 'dark'">
                  <a-icon type="check"/>
                </div>
              </div>
            </a-tooltip>

            <a-tooltip>
              <template slot="title">
                {{ $t('app.setting.pagestyle.light') }}
              </template>
              <div class="setting-drawer-index-item" @click="handleMenuTheme('light')">
                <img src="https://gw.alipayobjects.com/zos/rmsportal/jpRkZQMyYRryryPNtyIC.svg" alt="light" />
                <div class="setting-drawer-index-selectIcon" v-if="currentNavTheme !== 'dark'">
                  <a-icon type="check"/>
                </div>
              </div>
            </a-tooltip>
          </div>
        </div>

        <!-- Theme color selector controls app-level accent styles. -->
        <div :style="{ marginBottom: '24px' }">
          <h3 class="setting-drawer-index-title">{{ $t('app.setting.themecolor') }}</h3>

          <div class="setting-drawer-theme-color-list">
            <a-tooltip class="setting-drawer-theme-color-colorBlock" v-for="(item, index) in colorList" :key="index">
              <template slot="title">
                {{ item.key }}
              </template>
              <button
                type="button"
                class="setting-drawer-theme-color-swatch"
                :style="{ backgroundColor: item.color }"
                @click="changeColor(item.color)"
              >
                <a-icon type="check" v-if="item.color === currentPrimaryColor"></a-icon>
              </button>
            </a-tooltip>

          </div>
        </div>
        <a-divider />

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
        <a-divider />

        <div :style="{ marginBottom: '24px' }">
          <h3 class="setting-drawer-index-title">{{ $t('app.setting.othersettings') }}</h3>
          <div>
            <a-list :split="false">
              <a-list-item>
                <a-switch slot="actions" size="small" :defaultChecked="currentColorWeak" @change="onColorWeak" />
                <a-list-item-meta>
                  <div slot="title">{{ $t('app.setting.weakmode') }}</div>
                </a-list-item-meta>
              </a-list-item>
              <a-list-item>
                <a-switch slot="actions" size="small" :defaultChecked="currentMultiTab" @change="onMultiTab" />
                <a-list-item-meta>
                  <div slot="title">{{ $t('app.setting.multitab') }}</div>
                </a-list-item-meta>
              </a-list-item>
            </a-list>
          </div>
        </div>
        <a-divider />
        <slot />
      </div>
    </a-drawer>
  </div>
</template>

<script>
import SettingItem from './SettingItem'
import config from '@/config/defaultSettings'
import { updateTheme, updateColorWeak, getColorList } from './settingConfig'
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
      return this.settings.theme || this.navTheme || 'light'
    },
    currentPrimaryColor () {
      return this.settings.primaryColor || this.primaryColor || 'var(--primary-color, #1890ff)'
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
      return this.currentNavTheme === 'dark' || this.currentNavTheme === 'realdark'
    }
  },
  watch: {

  },
  mounted () {
    // Apply the saved theme color without showing the loading message.
    document.documentElement.style.setProperty('--primary-color', this.currentPrimaryColor)
    updateTheme(this.currentPrimaryColor, true)
    updateTheme(this.currentPrimaryColor, true)
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
        document.documentElement.style.setProperty('--primary-color', color)
        updateTheme(color)
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

<style lang="less" scoped>
  :deep(.ant-drawer-handle),
  :deep(.setting-drawer-index-handle) {
    display: none !important;
  }

  :deep(.ant-drawer-content),
  :deep(.ant-drawer-wrapper-body),
  :deep(.ant-drawer-body) {
    background: #fff;
    color: rgba(15, 23, 42, 0.86);
  }

  :deep(.ant-drawer-close) {
    color: rgba(15, 23, 42, 0.58);
  }

  :deep(.ant-divider) {
    background: rgba(15, 23, 42, 0.08);
  }

  .setting-drawer-index-content {
    .setting-drawer-index-title {
      color: rgba(15, 23, 42, 0.9);
      font-weight: 700;
    }

    .setting-drawer-index-blockChecbox {
      display: flex;

      .setting-drawer-index-item {
        margin-right: 16px;
        position: relative;
        border-radius: 4px;
        cursor: pointer;

        img {
          width: 48px;
        }

        .setting-drawer-index-selectIcon {
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          padding-top: 15px;
          padding-left: 24px;
          height: 100%;
          color: var(--primary-color, #1890ff);
          font-size: 14px;
          font-weight: 700;
        }
      }
    }
    .setting-drawer-theme-color-list {
      display: grid;
      grid-template-columns: repeat(8, 24px);
      gap: 10px;
      min-height: 28px;
      align-items: center;
    }

    .setting-drawer-theme-color-colorBlock {
      display: inline-flex;
    }

    .setting-drawer-theme-color-swatch {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      cursor: pointer;
      padding: 0;
      text-align: center;
      color: #fff;
      font-weight: 700;
      line-height: 22px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
      transition: transform 0.16s ease, box-shadow 0.16s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(15, 23, 42, 0.16);
      }

      i {
        font-size: 14px;
      }
    }
  }

  body.dark &,
  body.realdark &,
  .basic-layout-wrapper.dark &,
  .basic-layout-wrapper.realdark & {
    :deep(.ant-drawer-content),
    :deep(.ant-drawer-wrapper-body),
    :deep(.ant-drawer-body) {
      background: #171717 !important;
      color: rgba(226, 232, 240, 0.86) !important;
    }

    :deep(.ant-drawer-close) {
      color: rgba(226, 232, 240, 0.66) !important;

      &:hover {
        color: var(--primary-color, #1890ff) !important;
      }
    }

    :deep(.ant-divider) {
      background: rgba(255, 255, 255, 0.1) !important;
    }

    :deep(.ant-list-item-meta-title),
    :deep(.ant-list-item-meta-title > div) {
      color: rgba(226, 232, 240, 0.86) !important;
    }

    :deep(.ant-list-item) {
      color: rgba(226, 232, 240, 0.78) !important;
    }

    :deep(.ant-select-selection) {
      background: #222 !important;
      border-color: rgba(255, 255, 255, 0.14) !important;
      color: rgba(226, 232, 240, 0.86) !important;
    }

    :deep(.ant-select-arrow),
    :deep(.ant-select-selection-selected-value) {
      color: rgba(226, 232, 240, 0.78) !important;
    }

    .setting-drawer-index-content {
      .setting-drawer-index-title {
        color: rgba(248, 250, 252, 0.92);
      }

      .setting-drawer-index-item {
        background: rgba(255, 255, 255, 0.04);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);

        img {
          opacity: 0.9;
        }
      }

      .setting-drawer-theme-color-swatch {
        border-color: rgba(255, 255, 255, 0.14);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.32);
      }
    }
  }

</style>

<style lang="less">
body.dark .setting-drawer,
body.realdark .setting-drawer,
.setting-drawer.setting-drawer--dark {
  --setting-drawer-bg: #11161c;
  --setting-drawer-panel: #171c22;
  --setting-drawer-panel-soft: #202833;
  --setting-drawer-border: #2b3542;
  --setting-drawer-text: #e6edf5;
  --setting-drawer-muted: #a4b2c2;
  --setting-drawer-subtle: #738295;
}

body.dark .setting-drawer .ant-drawer-content,
body.dark .setting-drawer .ant-drawer-wrapper-body,
body.dark .setting-drawer .ant-drawer-body,
body.realdark .setting-drawer .ant-drawer-content,
body.realdark .setting-drawer .ant-drawer-wrapper-body,
body.realdark .setting-drawer .ant-drawer-body,
.setting-drawer.setting-drawer--dark .ant-drawer-content,
.setting-drawer.setting-drawer--dark .ant-drawer-wrapper-body,
.setting-drawer.setting-drawer--dark .ant-drawer-body {
  background: var(--setting-drawer-bg) !important;
  color: var(--setting-drawer-text) !important;
}

body.dark .setting-drawer .ant-drawer-body,
body.realdark .setting-drawer .ant-drawer-body,
.setting-drawer.setting-drawer--dark .ant-drawer-body {
  border-left: 1px solid var(--setting-drawer-border);
}

body.dark .setting-drawer .ant-drawer-close,
body.realdark .setting-drawer .ant-drawer-close,
.setting-drawer.setting-drawer--dark .ant-drawer-close {
  color: var(--setting-drawer-muted) !important;
}

body.dark .setting-drawer .ant-drawer-close:hover,
body.realdark .setting-drawer .ant-drawer-close:hover,
.setting-drawer.setting-drawer--dark .ant-drawer-close:hover {
  color: var(--primary-color, #1890ff) !important;
}

body.dark .setting-drawer .setting-drawer-index-title,
body.realdark .setting-drawer .setting-drawer-index-title,
.setting-drawer.setting-drawer--dark .setting-drawer-index-title {
  color: var(--setting-drawer-text) !important;
}

body.dark .setting-drawer .ant-divider,
body.realdark .setting-drawer .ant-divider,
.setting-drawer.setting-drawer--dark .ant-divider {
  background: var(--setting-drawer-border) !important;
}

body.dark .setting-drawer .ant-list-item,
body.dark .setting-drawer .ant-list-item-meta-title,
body.dark .setting-drawer .ant-list-item-meta-title > div,
body.realdark .setting-drawer .ant-list-item,
body.realdark .setting-drawer .ant-list-item-meta-title,
body.realdark .setting-drawer .ant-list-item-meta-title > div,
.setting-drawer.setting-drawer--dark .ant-list-item,
.setting-drawer.setting-drawer--dark .ant-list-item-meta-title,
.setting-drawer.setting-drawer--dark .ant-list-item-meta-title > div {
  color: var(--setting-drawer-muted) !important;
}

body.dark .setting-drawer .setting-drawer-index-item,
body.realdark .setting-drawer .setting-drawer-index-item,
.setting-drawer.setting-drawer--dark .setting-drawer-index-item {
  background: var(--setting-drawer-panel-soft);
  box-shadow: inset 0 0 0 1px var(--setting-drawer-border);
}

body.dark .setting-drawer .setting-drawer-index-selectIcon,
body.realdark .setting-drawer .setting-drawer-index-selectIcon,
.setting-drawer.setting-drawer--dark .setting-drawer-index-selectIcon {
  color: var(--primary-color, #1890ff) !important;
}

body.dark .setting-drawer .setting-drawer-theme-color-swatch,
body.realdark .setting-drawer .setting-drawer-theme-color-swatch,
.setting-drawer.setting-drawer--dark .setting-drawer-theme-color-swatch {
  border-color: rgba(255, 255, 255, 0.16) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}

body.dark .setting-drawer .setting-drawer-support,
body.realdark .setting-drawer .setting-drawer-support,
.setting-drawer.setting-drawer--dark .setting-drawer-support {
  border-top-color: var(--setting-drawer-border) !important;
  color: var(--setting-drawer-muted) !important;
}

body.dark .setting-drawer .setting-drawer-support .support-title,
body.realdark .setting-drawer .setting-drawer-support .support-title,
.setting-drawer.setting-drawer--dark .setting-drawer-support .support-title {
  color: var(--setting-drawer-text) !important;
}

body.dark .setting-drawer .setting-drawer-support a,
body.realdark .setting-drawer .setting-drawer-support a,
.setting-drawer.setting-drawer--dark .setting-drawer-support a {
  color: var(--primary-color, #1890ff) !important;
}

body.dark .setting-drawer .setting-drawer-support .separator,
body.dark .setting-drawer .setting-drawer-support .support-copy,
body.dark .setting-drawer .setting-drawer-support .support-version,
body.realdark .setting-drawer .setting-drawer-support .separator,
body.realdark .setting-drawer .setting-drawer-support .support-copy,
body.realdark .setting-drawer .setting-drawer-support .support-version,
.setting-drawer.setting-drawer--dark .setting-drawer-support .separator,
.setting-drawer.setting-drawer--dark .setting-drawer-support .support-copy,
.setting-drawer.setting-drawer--dark .setting-drawer-support .support-version {
  color: var(--setting-drawer-subtle) !important;
}

body.dark .setting-drawer .setting-drawer-support .support-social,
body.realdark .setting-drawer .setting-drawer-support .support-social,
.setting-drawer.setting-drawer--dark .setting-drawer-support .support-social {
  background: var(--setting-drawer-panel);
  border-color: var(--setting-drawer-border);
  color: var(--setting-drawer-muted);
}
</style>
