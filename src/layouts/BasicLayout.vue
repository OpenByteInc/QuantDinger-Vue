<template>
  <div :class="['basic-layout-wrapper', settings.theme, { 'basic-layout-wrapper--multi-tab': multiTab }]">
    <pro-layout
      :menus="menus"
      :collapsed="collapsed"
      :mediaQuery="query"
      :isMobile="isMobile"
      :handleMediaQuery="handleMediaQuery"
      :handleCollapse="handleCollapse"
      :i18nRender="i18nRender"
      v-bind="settings"
    >

      <template #menuHeaderRender>
        <div class="sidebar-logo-wrapper" :class="{ 'sidebar-logo-wrapper--collapsed': collapsed }">
          <img v-if="collapsed" :src="collapsedLogo" class="sidebar-logo sidebar-logo--collapsed" :alt="brandConfig.app_name" />
          <img v-else :src="currentLogo" class="sidebar-logo" :alt="brandConfig.app_name" />
        </div>
      </template>
      <template #headerContentRender>
        <div>
          <a-tooltip :title="$t('menu.header.refreshPage')">
            <a-icon type="reload" style="font-size: 18px;cursor: pointer;" @click="handleRefresh" />
          </a-tooltip>
        </div>
      </template>

      <a-modal :visible="showLegalModal" :footer="null" :title="$t('menu.footer.userAgreement')" @cancel="showLegalModal = false" :width="800">
        <div style="max-height: 60vh; overflow: auto; white-space: pre-wrap; line-height: 1.8; padding: 16px;">
          {{ menuFooterConfig.legal.user_agreement_text || $t('user.login.legal.content') }}
        </div>
        <div style="margin-top: 12px; text-align: right;">
          <a-button type="primary" @click="showLegalModal = false">OK</a-button>
        </div>
      </a-modal>

      <a-modal :visible="showPrivacyModal" :footer="null" :title="$t('menu.footer.privacyPolicy')" @cancel="showPrivacyModal = false" :width="800">
        <div style="max-height: 60vh; overflow: auto; white-space: pre-wrap; line-height: 1.8; padding: 16px;">
          {{ menuFooterConfig.legal.privacy_policy_text || $t('user.login.privacy.content') }}
        </div>
        <div style="margin-top: 12px; text-align: right;">
          <a-button type="primary" @click="showPrivacyModal = false">OK</a-button>
        </div>
      </a-modal>

      <setting-drawer ref="settingDrawer" :settings="settings" @change="handleSettingChange">
        <div class="setting-drawer-support">
          <div class="support-block">
            <div class="support-title">{{ $t('menu.footer.contactUs') }}</div>
            <div class="support-links">
              <a :href="menuFooterConfig.contact.support_url" target="_blank" rel="noopener noreferrer">{{ $t('menu.footer.support') }}</a>
              <span class="separator">|</span>
              <a :href="menuFooterConfig.contact.feature_request_url" target="_blank" rel="noopener noreferrer">{{ $t('menu.footer.featureRequest') }}</a>
            </div>
          </div>
          <div class="support-block">
            <div class="support-title">{{ $t('menu.footer.getSupport') }}</div>
            <div class="support-links">
              <a :href="'mailto:' + menuFooterConfig.contact.email">{{ $t('menu.footer.email') }}</a>
              <span class="separator">|</span>
              <a :href="menuFooterConfig.contact.live_chat_url" target="_blank" rel="noopener noreferrer">{{ $t('menu.footer.liveChat') }}</a>
            </div>
          </div>
          <div class="support-block" v-if="menuFooterConfig.social_accounts && menuFooterConfig.social_accounts.length > 0">
            <div class="support-title">{{ $t('menu.footer.socialAccounts') }}</div>
            <div class="support-socials">
              <a
                v-for="(account, index) in menuFooterConfig.social_accounts"
                :key="index"
                :href="account.url"
                target="_blank"
                rel="noopener noreferrer"
                :title="account.name"
                class="support-social"
              >
                <Icon :icon="`simple-icons:${account.icon}`" />
              </a>
            </div>
          </div>
          <div class="support-legal">
            <a
              v-if="menuFooterConfig.legal.user_agreement_url"
              :href="menuFooterConfig.legal.user_agreement_url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t('menu.footer.userAgreement') }}</a>
            <a v-else @click="showLegalModal = true">{{ $t('menu.footer.userAgreement') }}</a>
            <span class="separator">&</span>
            <a
              v-if="menuFooterConfig.legal.privacy_policy_url"
              :href="menuFooterConfig.legal.privacy_policy_url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t('menu.footer.privacyPolicy') }}</a>
            <a v-else @click="showPrivacyModal = true">{{ $t('menu.footer.privacyPolicy') }}</a>
          </div>
          <div class="support-copy">{{ menuFooterConfig.copyright }}</div>
          <div class="support-version">V{{ appVersion }}</div>
        </div>
      </setting-drawer>
      <template #rightContentRender>
        <right-content :top-menu="settings.layout === 'topmenu'" :is-mobile="isMobile" :theme="settings.theme" />
      </template>
      <!-- custom footer removed -->
      <template #footerRender>
        <div style="display: none;"></div>
      </template>
      <multi-tab v-if="multiTab" />
      <div class="basic-route-view-shell">
        <route-view :key="refreshKey" :keep-alive="multiTab" />
      </div>
    </pro-layout>

    <div v-if="false" class="custom-menu-footer" :class="{ 'collapsed': collapsed, 'drawer-open': isMobile && isDrawerOpen, 'drawer-animating': isMobile && isDrawerAnimating }">
      <div v-if="!collapsed" class="menu-footer-content">
        <div class="footer-section">
          <div class="section-title">{{ $t('menu.footer.contactUs') }}</div>
          <div class="section-links">
            <a :href="menuFooterConfig.contact.support_url" target="_blank">{{ $t('menu.footer.support') }}</a>
            <span class="separator">|</span>
            <a :href="menuFooterConfig.contact.feature_request_url" target="_blank">{{ $t('menu.footer.featureRequest') }}</a>
          </div>
        </div>

        <div class="footer-section">
          <div class="section-title">{{ $t('menu.footer.getSupport') }}</div>
          <div class="section-links">
            <a :href="'mailto:' + menuFooterConfig.contact.email">{{ $t('menu.footer.email') }}</a>
            <span class="separator">|</span>
            <a :href="menuFooterConfig.contact.live_chat_url" target="_blank">{{ $t('menu.footer.liveChat') }}</a>
          </div>
        </div>

        <div class="footer-section" v-if="menuFooterConfig.social_accounts && menuFooterConfig.social_accounts.length > 0">
          <div class="section-title">{{ $t('menu.footer.socialAccounts') }}</div>
          <div class="social-icons">
            <a
              v-for="(account, index) in menuFooterConfig.social_accounts"
              :key="index"
              :href="account.url"
              target="_blank"
              rel="noopener noreferrer"
              :title="account.name"
              class="social-icon"
            >
              <Icon :icon="`simple-icons:${account.icon}`" class="social-icon-svg" />
            </a>
          </div>
        </div>

        <div class="footer-section">
          <div class="section-links">
            <a
              v-if="menuFooterConfig.legal.user_agreement_url"
              :href="menuFooterConfig.legal.user_agreement_url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t('menu.footer.userAgreement') }}</a>
            <a v-else @click="showLegalModal = true">{{ $t('menu.footer.userAgreement') }}</a>
            <span class="separator">&</span>
            <a
              v-if="menuFooterConfig.legal.privacy_policy_url"
              :href="menuFooterConfig.legal.privacy_policy_url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t('menu.footer.privacyPolicy') }}</a>
            <a v-else @click="showPrivacyModal = true">{{ $t('menu.footer.privacyPolicy') }}</a>
          </div>
        </div>

        <div class="footer-section copyright">
          {{ menuFooterConfig.copyright }}
        </div>
        <div class="footer-section version">
          V{{ appVersion }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { updateTheme } from '@/components/SettingDrawer/settingConfig'
import { i18nRender } from '@/locales'
import { mapState } from 'vuex'
import {
  CONTENT_WIDTH_TYPE,
  SIDEBAR_TYPE,
  TOGGLE_MOBILE_TYPE,
  TOGGLE_NAV_THEME,
  TOGGLE_LAYOUT,
  TOGGLE_FIXED_HEADER,
  TOGGLE_FIXED_SIDEBAR,
  TOGGLE_CONTENT_WIDTH,
  TOGGLE_HIDE_HEADER,
  TOGGLE_COLOR,
  TOGGLE_WEAK,
  TOGGLE_MULTI_TAB
} from '@/store/mutation-types'

import defaultSettings from '@/config/defaultSettings'
import RightContent from '@/components/GlobalHeader/RightContent'
import SettingDrawer from '@/components/SettingDrawer/SettingDrawer'
import MultiTab from '@/components/MultiTab'
import RouteView from './RouteView'
import { Icon } from '@iconify/vue2'
import logoLight from '@/assets/logo.png'
import logoDark from '@/assets/logo_w.png'
import slogoImg from '@/assets/slogo.png'

export default {
  name: 'BasicLayout',
  components: {
    SettingDrawer,
    RightContent,
    MultiTab,
    RouteView,
    Icon
    // GlobalFooter,
    // Ads
  },
  data () {
    return {
      // preview.pro.antdv.com only use.
      isProPreviewSite: process.env.VUE_APP_PREVIEW === 'true' && process.env.NODE_ENV !== 'development',
      // end
      isDev: process.env.NODE_ENV === 'development' || process.env.VUE_APP_PREVIEW === 'true',

      // base - menus moved to computed property
      collapsed: false,
      title: defaultSettings.title,
      settings: {
        layout: defaultSettings.layout, // 'sidemenu', 'topmenu'
        // CONTENT_WIDTH_TYPE
        contentWidth: defaultSettings.layout === 'sidemenu' ? CONTENT_WIDTH_TYPE.Fluid : defaultSettings.contentWidth,
        theme: defaultSettings.navTheme,
        primaryColor: defaultSettings.primaryColor,
        fixedHeader: defaultSettings.fixedHeader,
        fixSiderbar: defaultSettings.fixSiderbar,
        colorWeak: defaultSettings.colorWeak,

        hideHintAlert: false,
        hideCopyButton: false
      },
      query: {},

      isMobile: false,
      showLegalModal: false,
      showPrivacyModal: false,
      refreshKey: 0,
      isDrawerOpen: false,
      isDrawerAnimating: false,
      isInitialThemeColorLoad: true
    }
  },
  computed: {
    ...mapState({
      mainMenu: state => state.permission.addRouters,
      brandConfig: state => state.brand.config,
      multiTab: state => state.app.multiTab
    }),
    menus () {
      const routes = this.mainMenu.find(item => item.path === '/')
      const children = (routes && routes.children) || []
      if (this.settings.layout !== 'topmenu') {
        return children
      }
      return this.buildTopMenuGroups(children)
    },
    showAdminMenuDivider () {
      const routes = this.mainMenu.find(item => item.path === '/')
      const children = (routes && routes.children) || []
      return children.some(route => {
        if (route.hidden) return false
        const perms = (route.meta && route.meta.permission) || []
        return perms.includes('admin')
      })
    },
    menuFooterConfig () {
      return this.brandConfig
    },
    appVersion () {
      const buildVersion = typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0.0.0-dev'
      return (this.brandConfig && this.brandConfig.app_version) || defaultSettings.appVersion || buildVersion
    },
    currentLogo () {
      const theme = this.settings.theme
      const isDark = theme === 'dark' || theme === 'realdark'
      const remote = isDark
        ? (this.brandConfig.logos && this.brandConfig.logos.dark)
        : (this.brandConfig.logos && this.brandConfig.logos.light)
      return remote || (isDark ? logoDark : logoLight)
    },
    collapsedLogo () {
      return (this.brandConfig.logos && this.brandConfig.logos.collapsed) || slogoImg
    }
  },
  created () {
    // menus is now a computed property - no need to set here
    this.settings.theme = this.$store.state.app.theme
    this.settings.primaryColor = this.$store.state.app.color || defaultSettings.primaryColor
    this.$watch('collapsed', () => {
      this.$store.commit(SIDEBAR_TYPE, this.collapsed)
    })
    this.$watch('isMobile', () => {
      this.$store.commit(TOGGLE_MOBILE_TYPE, this.isMobile)
    })
    this.$watch('$store.state.app.theme', (val) => {
      this.settings.theme = val
      if (val === 'dark' || val === 'realdark') {
        document.body.classList.add('dark')
        document.body.classList.remove('light')
      } else {
        document.body.classList.remove('dark')
        document.body.classList.add('light')
      }
    }, { immediate: true })
    this.$watch('$store.state.app.color', (val) => {
      if (val) {
        this.settings.primaryColor = val
        document.documentElement.style.setProperty('--primary-color', val)
        if (process.env.NODE_ENV !== 'production' || process.env.VUE_APP_PREVIEW === 'true') {
          updateTheme(val, this.isInitialThemeColorLoad)
          if (this.isInitialThemeColorLoad) {
            this.isInitialThemeColorLoad = false
          }
        }
      }
    }, { immediate: true })
    this.$watch('settings.theme', (val) => {
      if (val === 'dark' || val === 'realdark') {
        document.body.classList.add('dark')
        document.body.classList.remove('light')
      } else {
        document.body.classList.remove('dark')
        document.body.classList.add('light')
      }
    }, { immediate: true })
  },
  watch: {
    mainMenu: {
      handler () {
        this.scheduleAdminMenuDivider()
      },
      deep: true
    },
    collapsed () {
      this.scheduleAdminMenuDivider()
    },
    showAdminMenuDivider () {
      this.scheduleAdminMenuDivider()
    }
  },
  mounted () {
    const userAgent = navigator.userAgent
    if (userAgent.indexOf('Edge') > -1) {
      this.$nextTick(() => {
        this.collapsed = !this.collapsed
        setTimeout(() => {
          this.collapsed = !this.collapsed
        }, 16)
      })
    }

    // first update color
    // TIPS: THEME COLOR HANDLER!! PLEASE CHECK THAT!!

    this.$root.$on('show-setting-drawer', () => {
      if (this.$refs.settingDrawer) {
        this.$refs.settingDrawer.showDrawer()
      }
    })

    // Footer config is static for local OSS build

    this.$nextTick(() => {
      setTimeout(() => {
        this.updateMenuFooterPosition()
        this.updateAdminMenuDivider()
        this.setupAdminMenuDividerObserver()
      }, 200)
    })

    window.addEventListener('resize', this.updateMenuFooterPosition)

    if (!this.isMobile) {
      this._desktopFooterInterval = setInterval(() => {
        this.updateMenuFooterPosition()
        this.updateAdminMenuDivider()
      }, 1000)
    }

    const observer = new MutationObserver(() => {
      if (this.isMobile) {
        const drawer = document.querySelector('.ant-drawer.ant-drawer-open')
        const wasOpen = this.isDrawerOpen
        const isOpen = !!drawer

        this.isDrawerOpen = isOpen

        if (wasOpen !== this.isDrawerOpen) {
          if (this.isDrawerOpen) {
            this.isDrawerAnimating = true
            setTimeout(() => {
              this.isDrawerAnimating = false
              this.updateMenuFooterPosition()
              this.scheduleAdminMenuDivider()
            }, 300)
          } else {
            this.isDrawerAnimating = false
            this.updateMenuFooterPosition()
          }
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })

    this._menuFooterObserver = observer

    this._menuFooterInterval = setInterval(() => {
      if (this.isMobile) {
        const drawer = document.querySelector('.ant-drawer.ant-drawer-open')
        const currentState = !!drawer
        if (this.isDrawerOpen !== currentState) {
          this.isDrawerOpen = currentState
          if (currentState) {
            this.isDrawerAnimating = true
            setTimeout(() => {
              this.isDrawerAnimating = false
              this.updateMenuFooterPosition()
            }, 300)
          } else {
            this.isDrawerAnimating = false
            this.updateMenuFooterPosition()
          }
        } else if (currentState && !this.isDrawerAnimating) {
          this.updateMenuFooterPosition()
        }
      }
    }, 200)
  },
  beforeDestroy () {
    this.$root.$off('show-setting-drawer')
    window.removeEventListener('resize', this.updateMenuFooterPosition)

    if (this._menuFooterObserver) {
      this._menuFooterObserver.disconnect()
    }

    if (this._menuFooterInterval) {
      clearInterval(this._menuFooterInterval)
    }

    if (this._adminDividerObserver) {
      this._adminDividerObserver.disconnect()
      this._adminDividerObserver = null
    }

    if (this._adminDividerTimer) {
      clearTimeout(this._adminDividerTimer)
      this._adminDividerTimer = null
    }

    if (this._desktopFooterInterval) {
      clearInterval(this._desktopFooterInterval)
    }
  },
  methods: {
    i18nRender,
    buildTopMenuGroups (routes) {
      const accountMenuPaths = ['/billing', '/profile']
      const strategyDetailPaths = ['/strategy-live', '/strategy-script']
      const visibleRoutes = routes.filter(route => {
        return !route.hidden &&
          !accountMenuPaths.includes(route.path) &&
          !strategyDetailPaths.includes(route.path)
      })
      const groups = [
        {
          name: 'MenuGroupAI',
          path: '/menu-group/ai-workspace',
          title: this.$t('menu.group.aiWorkspace') || 'AI Workspace',
          icon: 'thunderbolt',
          paths: ['/ai-asset-analysis'],
          singleAsItem: true
        },
        {
          name: 'MenuGroupMarket',
          path: '/menu-group/market-data',
          title: this.$t('menu.group.marketData') || 'Market & Data',
          icon: 'database',
          paths: []
        },
        {
          name: 'MenuGroupStrategy',
          path: '/menu-group/strategy-lab',
          title: this.$t('menu.group.strategyLab') || 'Strategy Lab',
          icon: 'experiment',
          paths: ['/strategy-ide', '/trading-bot', '/indicator-community']
        },
        {
          name: 'MenuGroupLiveMonitor',
          path: '/menu-group/live-monitor',
          title: this.$t('menu.dashboard.strategyCenter') || 'Live Monitor',
          icon: 'fund',
          paths: ['/strategy-center'],
          singleAsItem: true
        },
        {
          name: 'MenuGroupTrading',
          path: '/menu-group/auto-trading',
          title: this.$t('menu.dashboard.brokerAccounts') || 'Broker Accounts',
          icon: 'bank',
          paths: ['/broker-accounts'],
          singleAsItem: true
        },
        {
          name: 'MenuGroupAdmin',
          path: '/menu-group/admin',
          title: this.$t('menu.group.admin') || 'Admin',
          icon: 'setting',
          paths: ['/user-manage', '/agent-tokens', '/ai-skills', '/settings']
        }
      ]
      const routeMap = visibleRoutes.reduce((map, route) => {
        map[route.path] = route
        return map
      }, {})
      const used = new Set()
      const groupedRoutes = groups
        .map(group => {
          const children = group.paths
            .map(path => routeMap[path])
            .filter(Boolean)
            .map(route => {
              used.add(route.path)
              return { ...route }
            })
          if (!children.length) return null
          if (group.singleAsItem && children.length === 1) {
            return children[0]
          }
          return {
            path: group.path,
            name: group.name,
            redirect: children[0].path,
            meta: {
              title: group.title,
              icon: group.icon,
              permission: children.reduce((list, route) => {
                const perms = (route.meta && route.meta.permission) || []
                perms.forEach(permission => {
                  if (!list.includes(permission)) list.push(permission)
                })
                return list
              }, [])
            },
            children
          }
        })
        .filter(Boolean)
      const leftovers = visibleRoutes.filter(route => !used.has(route.path))
      return groupedRoutes.concat(leftovers)
    },
    updateAdminMenuDivider () {
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          const menuRoots = Array.from(
            document.querySelectorAll('.ant-pro-sider .ant-menu, .ant-drawer .ant-menu')
          )
          menuRoots.forEach(root => {
            root.querySelectorAll('.sidebar-admin-divider').forEach(el => el.remove())
            if (!this.showAdminMenuDivider) return

            const profileItem = this.findProfileMenuItem(root)
            if (!profileItem) return
            if (profileItem.nextElementSibling && profileItem.nextElementSibling.classList.contains('sidebar-admin-divider')) {
              return
            }

            const divider = document.createElement('li')
            divider.className = 'ant-menu-item sidebar-admin-divider'
            divider.setAttribute('role', 'separator')
            divider.innerHTML = '<span class="sidebar-admin-divider-line" aria-hidden="true"></span>'
            profileItem.insertAdjacentElement('afterend', divider)
          })
        })
      })
    },
    findProfileMenuItem (root) {
      const routes = this.mainMenu.find(item => item.path === '/')
      const children = (routes && routes.children) || []
      const visibleRoutes = children.filter(route => !route.hidden)
      const profileIndex = visibleRoutes.findIndex(route => route.path === '/profile')
      const items = root.querySelectorAll('li.ant-menu-item:not(.sidebar-admin-divider)')
      if (profileIndex >= 0 && items[profileIndex]) {
        return items[profileIndex]
      }
      for (const li of items) {
        const link = li.querySelector('a')
        if (!link) continue
        const href = String(link.getAttribute('href') || '').toLowerCase()
        if (href.includes('/profile') || href.endsWith('profile')) {
          return li
        }
      }
      return null
    },
    scheduleAdminMenuDivider () {
      if (this._adminDividerTimer) {
        clearTimeout(this._adminDividerTimer)
      }
      this._adminDividerTimer = setTimeout(() => {
        this._adminDividerTimer = null
        this.updateAdminMenuDivider()
      }, 60)
    },
    setupAdminMenuDividerObserver () {
      if (this._adminDividerObserver) {
        this._adminDividerObserver.disconnect()
        this._adminDividerObserver = null
      }
      const menuEl = document.querySelector('.ant-pro-sider .ant-menu')
      if (!menuEl) return
      this._adminDividerObserver = new MutationObserver(() => {
        this.scheduleAdminMenuDivider()
      })
      this._adminDividerObserver.observe(menuEl, { childList: true })
    },
    updateMenuFooterPosition () {
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          const menuFooter = this.$el?.querySelector('.custom-menu-footer')
          if (!menuFooter) return

          if (this.isMobile) {
            const drawer = document.querySelector('.ant-drawer.ant-drawer-open')
            this.isDrawerOpen = !!drawer

            if (drawer && !this.isDrawerAnimating) {
              // const drawerRect = drawer.getBoundingClientRect()
              menuFooter.style.position = 'fixed'
              // menuFooter.style.left = `${drawerRect.left}px`
              menuFooter.style.bottom = '0px'
              menuFooter.style.zIndex = '1001'
              menuFooter.style.display = 'block'
              menuFooter.style.opacity = '1'

              const footerHeight = menuFooter.offsetHeight || 280
              const drawerBody = drawer.querySelector('.ant-drawer-body')
              if (drawerBody) {
                drawer.style.setProperty('--footer-height', `${footerHeight}px`)
                drawerBody.style.paddingBottom = `${footerHeight + 10}px`
                drawerBody.style.overflowY = 'auto'
                drawerBody.style.overflowX = 'hidden'
                drawerBody.style.webkitOverflowScrolling = 'touch'
              }

              return
            } else if (drawer && this.isDrawerAnimating) {
              menuFooter.style.opacity = '0'
              menuFooter.style.display = 'block'
              return
            } else {
              menuFooter.style.display = 'none'
              menuFooter.style.opacity = '0'
              const drawer = document.querySelector('.ant-drawer')
              if (drawer) {
                const drawerBody = drawer.querySelector('.ant-drawer-body')
                if (drawerBody) {
                  drawerBody.style.paddingBottom = ''
                  drawerBody.style.overflowY = ''
                  drawerBody.style.overflowX = ''
                }
              }
              return
            }
          }

          const sider = this.$el?.querySelector('.ant-pro-sider') || document.querySelector('.ant-pro-sider')
          if (sider) {
            const siderRect = sider.getBoundingClientRect()
          const footerHeight = menuFooter.offsetHeight || 220
            menuFooter.style.position = 'fixed'
            menuFooter.style.left = `${siderRect.left}px`
            menuFooter.style.bottom = '0px'
            menuFooter.style.zIndex = '100'
            menuFooter.style.display = 'block'
          sider.style.setProperty('--menu-footer-height', `${footerHeight}px`)
          const siderChildren = sider.querySelector('.ant-layout-sider-children')
          if (siderChildren) {
            siderChildren.style.paddingBottom = `${footerHeight + 12}px`
            siderChildren.style.overflowY = 'auto'
            siderChildren.style.overflowX = 'hidden'
            siderChildren.style.webkitOverflowScrolling = 'touch'
          }
          const menuScroll = sider.querySelector('.ant-pro-sider-menu') ||
            sider.querySelector('.ant-menu-root') ||
            sider.querySelector('.ant-menu')
          if (menuScroll) {
            const availableHeight = Math.max(siderRect.height - footerHeight - 12, 120)
            menuScroll.style.maxHeight = `${availableHeight}px`
            menuScroll.style.overflowY = 'auto'
            menuScroll.style.overflowX = 'hidden'
            menuScroll.style.webkitOverflowScrolling = 'touch'
          }
          } else {
            menuFooter.style.position = 'fixed'
            menuFooter.style.left = '0px'
            menuFooter.style.bottom = '0px'
            menuFooter.style.zIndex = '100'
            menuFooter.style.display = 'block'
          }
        })
      })
    },
    handleRefresh () {
      this.refreshKey += 1
    },
    handleMediaQuery (val) {
      this.query = val
      if (this.isMobile && !val['screen-xs']) {
        this.isMobile = false
        this.$nextTick(() => {
          this.updateMenuFooterPosition()
        })
        return
      }
      if (!this.isMobile && val['screen-xs']) {
        this.isMobile = true
        this.collapsed = false
        this.settings.contentWidth = CONTENT_WIDTH_TYPE.Fluid
        // this.settings.fixSiderbar = false
        this.$nextTick(() => {
          this.updateMenuFooterPosition()
        })
      }
    },
    handleCollapse (val) {
      this.collapsed = val
      this.$nextTick(() => {
        this.updateMenuFooterPosition()
      })
    },
    handleMobileMenuToggle () {
      this.$nextTick(() => {
        setTimeout(() => {
          this.updateMenuFooterPosition()
        }, 300) // 等待 drawer 动画完成
      })
    },
    handleSettingChange ({ type, value }) {
      type && (this.settings[type] = value)
      switch (type) {
        case 'theme':
          this.$store.commit(TOGGLE_NAV_THEME, value)
          break
        case 'primaryColor':
          this.$store.commit(TOGGLE_COLOR, value)
          break
        case 'layout':
          this.$store.commit(TOGGLE_LAYOUT, value)
          if (value === 'sidemenu') {
            this.settings.contentWidth = CONTENT_WIDTH_TYPE.Fluid
          } else {
            this.settings.fixSiderbar = false
            this.settings.contentWidth = CONTENT_WIDTH_TYPE.Fixed
          }
          break
        case 'contentWidth':
          this.settings[type] = value
          this.$store.commit(TOGGLE_CONTENT_WIDTH, value)
          break
        case 'fixedHeader':
          this.$store.commit(TOGGLE_FIXED_HEADER, value)
          break
        case 'autoHideHeader':
          this.$store.commit(TOGGLE_HIDE_HEADER, value)
          break
        case 'fixSiderbar':
          this.$store.commit(TOGGLE_FIXED_SIDEBAR, value)
          break
        case 'colorWeak':
          this.$store.commit(TOGGLE_WEAK, value)
          break
        case 'multiTab':
          this.$store.commit(TOGGLE_MULTI_TAB, value)
          break
      }
    }
  }
}
</script>

<style lang="less">
@import "./BasicLayout.less";

.sidebar-logo-wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 100%;
  padding: 0 16px;
  box-sizing: border-box;

  .sidebar-logo {
    display: block;
    max-width: 100%;
    max-height: 40px;
    width: auto;
    height: auto;
    object-fit: contain;
  }

  .sidebar-logo--collapsed {
    max-height: 32px;
    max-width: 100%;
  }

  &--collapsed {
    justify-content: center;
    padding: 0 8px;
  }
}

::v-deep .ant-pro-sider-menu-logo {
  display: flex;
  align-items: center;
  padding-left: 0 !important;
  padding-right: 0;

  > div {
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
  }

  img {
    width: auto !important;
    height: auto !important;
    max-height: 40px;
    max-width: 85%;
  }

  h1 {
    display: none !important;
  }
}

.ant-pro-sider-menu-sider.ant-layout-sider-collapsed ::v-deep .ant-pro-sider-menu-logo {
  padding: 0 !important;
  justify-content: center;

  img {
    max-width: 80% !important;
    max-height: 32px !important;
    width: auto !important;
    height: auto !important;
  }
}

.ant-pro-sider-menu-sider.light .ant-menu-light {
  height: 60vh!important;
}
.basic-layout-wrapper {
  .ant-layout-footer {
    display: none !important;
    height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
  }
}

.basic-layout-wrapper {
  position: relative;

  .custom-menu-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 100;
    width: 256px; /* 统一固定宽度 256px */
    background: #111111;
    border-top: 1px solid #1c1c1c;
    transition: left 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86),
                width 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86),
                max-width 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86),
                opacity 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86);
    max-width: 256px;
    display: block; /* 默认显示 */
    opacity: 1;

    &.collapsed {
      width: 80px; /* 折叠时菜单宽度 */
      max-width: 80px;
    }

    @media (max-width: 768px) {
      z-index: 1001; /* drawer 的 z-index 通常是 1000 */

      &:not(.drawer-open) {
        display: none !important;
        opacity: 0;
      }

      &.drawer-animating {
        opacity: 0;
        transition: opacity 0.1s ease-out;
      }

      &.drawer-open:not(.drawer-animating) {
        opacity: 1;
        transition: left 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86),
                    width 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86),
                    max-width 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86),
                    opacity 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86) 0.1s; /* 延迟 0.1s 显示，确保 drawer 先出现 */
      }
    }


    .menu-footer-content {
      padding: 12px 16px;
      font-size: 11px;
      color: inherit;
      max-height: none;
      overflow: visible;

      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
      &::-webkit-scrollbar {
        width: 4px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
      }

      .footer-section {
        margin-bottom: 12px;
        text-align: center;

        &:last-child {
          margin-bottom: 0;
        }

        .section-title {
          font-size: 11px;
          font-weight: 500;
          margin-bottom: 6px;
          opacity: 0.8;
          color: inherit;
        }

        .section-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex-wrap: wrap;
          font-size: 10px;
          opacity: 0.7;

          a {
            cursor: pointer;
            color: inherit;
            text-decoration: underline;
            transition: opacity 0.2s;

            &:hover {
              opacity: 1;
            }
          }

          .separator {
            opacity: 0.5;
            margin: 0 2px;
          }
        }

        .social-icons {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-top: 6px;

          .social-icon {
            width: 15px;
            height: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            cursor: pointer;
            opacity: 0.7;
            transition: all 0.2s;
            background: rgba(255, 255, 255, 0.05);
            text-decoration: none;
            overflow: hidden;

            &:hover {
              opacity: 1;
              background: rgba(255, 255, 255, 0.1);
              transform: translateY(-2px);
            }

            .social-icon-svg {
              width: 15x;
              height: 15px;
              color: currentColor;
            }

            .anticon {
              font-size: 16px;
            }

            .social-logo {
              width: 15px;
              height: 15px;
              object-fit: contain;
            }

            .social-icon-text {
              font-size: 10px;
              font-weight: bold;
            }
          }
        }

        &.copyright {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #2a2a2a;
          opacity: 0.6;
          font-size: 10px;
        }

        &.version {
          margin-top: 4px;
          font-size: 9px;
          opacity: 0.4;
          text-align: center;
          letter-spacing: 1px;
        }
      }
    }

    .menu-footer-content-collapsed {
      text-align: center;
      padding: 16px;
      font-size: 12px;
      opacity: 0.6;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      .anticon {
        font-size: 16px;
      }

      &:hover {
        opacity: 1;
      }
    }
  }

  ::v-deep .ant-pro-layout {
    &.ant-pro-sider-collapsed ~ .custom-menu-footer,
    .ant-pro-sider-collapsed ~ .custom-menu-footer {
      width: 80px;
    }
  }
}

.basic-layout-wrapper {
  ::v-deep li.ant-menu-item.sidebar-admin-divider {
    height: auto !important;
    line-height: 1 !important;
    margin: 10px 16px 12px !important;
    padding: 0 !important;
    pointer-events: none;
    cursor: default;
    list-style: none;
    overflow: hidden;

    &::after {
      display: none;
    }

    .anticon,
    .ant-menu-item-icon {
      display: none !important;
    }

    .sidebar-admin-divider-line {
      display: block;
      width: 100%;
      height: 1px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 1px;
    }
  }

  .ant-pro-sider.ant-pro-sider-collapsed {
    ::v-deep li.ant-menu-item.sidebar-admin-divider {
      margin: 8px 12px !important;
    }
  }

  .ant-layout-sider-children {
    padding-bottom: calc(var(--menu-footer-height, 220px) + 12px);
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.15) transparent;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 3px;
    }

    body.dark &,
    body.realdark &,
    .ant-pro-layout.dark &,
    .ant-pro-layout.realdark & {
      scrollbar-color: rgba(255, 255, 255, 0.25) transparent;

      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.25);
      }
    }
  }

  .ant-pro-sider {
    height: 100vh;
    display: flex;
    flex-direction: column;

    .ant-layout-sider-children {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .ant-pro-sider-menu,
    .ant-menu-root,
    .ant-menu {
      flex: 1 1 auto;
      min-height: 0;
      max-height: calc(100vh - var(--menu-footer-height, 220px) - 24px);
      overflow-y: auto !important;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
    }
  }
}

.basic-layout-wrapper.dark,
.basic-layout-wrapper.realdark {
  ::v-deep li.ant-menu-item.sidebar-admin-divider .sidebar-admin-divider-line {
    background: rgba(255, 255, 255, 0.12);
  }

  .ant-layout-header {
    background: #111111 !important;
    border-bottom: 1px solid #1c1c1c !important;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
  }
  .ant-pro-global-header {
    background: #111111 !important;
    border-bottom: none !important;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
    color: rgba(255, 255, 255, 0.85) !important;

    .ant-pro-global-header-trigger {
      color: rgba(255, 255, 255, 0.85) !important;
      &:hover {
        background: rgba(255, 255, 255, 0.06) !important;
      }
    }

    .action {
      color: rgba(255, 255, 255, 0.85) !important;
      &:hover {
        background: rgba(255, 255, 255, 0.06) !important;
      }
    }
  }

  .ant-pro-basicLayout-content {
    background-color: #141414 !important;
  }

  .ant-layout {
    background-color: #141414 !important;
  }
}

@media (max-width: 768px) {
  .ant-drawer.ant-drawer-open {
    .ant-drawer-content-wrapper {
      overflow: visible;
    }

    .ant-drawer-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: visible;
    }

    .ant-drawer-wrapper-body {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: visible;
    }

    .ant-drawer-body {
      overflow-y: auto !important;
      overflow-x: hidden !important;
      padding-bottom: var(--footer-height, 280px) !important;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
      &::-webkit-scrollbar {
        width: 4px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        &:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }
      min-height: 0;
      flex: 1;
    }
  }
}

.setting-drawer-support {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  color: rgba(15, 23, 42, 0.72);

  .support-block {
    margin-bottom: 14px;
  }

  .support-title {
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: rgba(15, 23, 42, 0.86);
  }

  .support-links,
  .support-legal {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    line-height: 1.6;

    a {
      color: var(--primary-color, #1890ff);
    }

    .separator {
      color: rgba(100, 116, 139, 0.58);
    }
  }

  .support-socials {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .support-social {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 6px;
    color: rgba(15, 23, 42, 0.72);
    background: rgba(248, 250, 252, 0.85);
    transition: color 0.16s ease, border-color 0.16s ease, background 0.16s ease;

    &:hover {
      color: var(--primary-color, #1890ff);
      border-color: color-mix(in srgb, var(--primary-color, #1890ff) 34%, transparent);
      background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, #fff);
    }
  }

  .support-copy {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid rgba(15, 23, 42, 0.08);
    font-size: 11px;
    color: rgba(100, 116, 139, 0.78);
  }

  .support-version {
    margin-top: 4px;
    font-size: 10px;
    letter-spacing: 0.06em;
    color: rgba(100, 116, 139, 0.58);
  }
}

body.dark .setting-drawer-support,
body.realdark .setting-drawer-support,
.basic-layout-wrapper.dark .setting-drawer-support,
.basic-layout-wrapper.realdark .setting-drawer-support {
  border-top-color: rgba(255, 255, 255, 0.1);
  color: rgba(226, 232, 240, 0.72);

  .support-title {
    color: rgba(248, 250, 252, 0.9);
  }

  .support-links,
  .support-legal {
    .separator {
      color: rgba(148, 163, 184, 0.58);
    }
  }

  .support-social {
    color: rgba(226, 232, 240, 0.74);
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);

    &:hover {
      color: var(--primary-color, #1890ff);
      border-color: color-mix(in srgb, var(--primary-color, #1890ff) 36%, transparent);
      background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent);
    }
  }

  .support-copy {
    border-top-color: rgba(255, 255, 255, 0.1);
    color: rgba(148, 163, 184, 0.75);
  }

  .support-version {
    color: rgba(148, 163, 184, 0.58);
  }
}

</style>
