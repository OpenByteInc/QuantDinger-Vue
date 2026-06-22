<script lang="jsx">
import events from './events'
import { i18nRender } from '@/locales'

export default {
  name: 'MultiTab',
  data () {
    return {
      fullPathList: [],
      pages: [],
      activeKey: '',
      newTabIndex: 0
    }
  },
  created () {
    // bind event
    events.$on('open', val => {
      if (!val) {
        throw new Error(`multi-tab: open tab ${val} err`)
      }
      this.activeKey = val
    }).$on('close', val => {
      if (!val) {
        this.closeThat(this.activeKey)
        return
      }
      this.closeThat(val)
    }).$on('rename', ({ key, name }) => {
      try {
        const item = this.pages.find(item => item.path === key)
        item.meta.customTitle = name
        this.$forceUpdate()
      } catch (e) {
      }
    })

    this.pages.push(this.$route)
    this.fullPathList.push(this.$route.fullPath)
    this.selectedLastPath()
  },
  methods: {
    onEdit (targetKey, action) {
      this[action](targetKey)
    },
    remove (targetKey) {
      this.pages = this.pages.filter(page => page.fullPath !== targetKey)
      this.fullPathList = this.fullPathList.filter(path => path !== targetKey)
      // If the active tab was closed, switch to the latest remaining tab.
      if (!this.fullPathList.includes(this.activeKey)) {
        this.selectedLastPath()
      }
    },
    selectedLastPath () {
      this.activeKey = this.fullPathList[this.fullPathList.length - 1]
    },

    tabText (key) {
      const isZh = String((this.$i18n && this.$i18n.locale) || '').toLowerCase().startsWith('zh')
      const text = {
        closeThat: isZh ? '关闭当前' : 'Close current',
        closeRight: isZh ? '关闭右侧' : 'Close right',
        closeLeft: isZh ? '关闭左侧' : 'Close left',
        closeAll: isZh ? '清除其他' : 'Clear others',
        clear: isZh ? '清理' : 'Clear',
        lastTab: isZh ? '这是最后一个标签了，无法关闭' : 'This is the last tab and cannot be closed',
        noLeft: isZh ? '左侧没有标签' : 'No tabs on the left',
        noRight: isZh ? '右侧没有标签' : 'No tabs on the right'
      }
      return text[key]
    },
    closeCurrentActive () {
      this.closeThat(this.activeKey)
    },
    closeRightActive () {
      this.closeRight(this.activeKey)
    },
    closeLeftActive () {
      this.closeLeft(this.activeKey)
    },
    closeOtherActive () {
      this.closeAll(this.activeKey)
    },
    closeThat (e) {
      // Keep at least one tab available.
      if (this.fullPathList.length > 1) {
        this.remove(e)
      } else {
        this.$message.info(this.tabText('lastTab'))
      }
    },
    closeLeft (e) {
      const currentIndex = this.fullPathList.indexOf(e)
      if (currentIndex > 0) {
        this.fullPathList.forEach((item, index) => {
          if (index < currentIndex) {
            this.remove(item)
          }
        })
      } else {
        this.$message.info(this.tabText('noLeft'))
      }
    },
    closeRight (e) {
      const currentIndex = this.fullPathList.indexOf(e)
      if (currentIndex < (this.fullPathList.length - 1)) {
        this.fullPathList.forEach((item, index) => {
          if (index > currentIndex) {
            this.remove(item)
          }
        })
      } else {
        this.$message.info(this.tabText('noRight'))
      }
    },
    closeAll (e) {
      const currentIndex = this.fullPathList.indexOf(e)
      this.fullPathList.forEach((item, index) => {
        if (index !== currentIndex) {
          this.remove(item)
        }
      })
    },
    closeMenuClick (key, route) {
      this[key](route)
    },
    renderTabPaneMenu (e) {
      return (
        <a-menu {...{ on: { click: ({ key, item, domEvent }) => { this.closeMenuClick(key, e) } } }}>
          <a-menu-item key="closeThat">{this.tabText('closeThat')}</a-menu-item>
          <a-menu-item key="closeRight">{this.tabText('closeRight')}</a-menu-item>
          <a-menu-item key="closeLeft">{this.tabText('closeLeft')}</a-menu-item>
          <a-menu-item key="closeAll">{this.tabText('closeAll')}</a-menu-item>
        </a-menu>
      )
    },
    renderTabPane (title, keyPath) {
      const menu = this.renderTabPaneMenu(keyPath)

      return (
        <a-dropdown overlay={menu} trigger={['contextmenu']}>
          <span style={{ userSelect: 'none' }}>{ title }</span>
        </a-dropdown>
      )
    },
    renderClearMenu () {
      return (
        <a-menu class="ant-pro-multi-tab-action-menu" {...{ on: { click: ({ key }) => { this[key]() } } }}>
          <a-menu-item key="closeOtherActive">{this.tabText('closeAll')}</a-menu-item>
          <a-menu-item key="closeRightActive">{this.tabText('closeRight')}</a-menu-item>
          <a-menu-item key="closeLeftActive">{this.tabText('closeLeft')}</a-menu-item>
          <a-menu-divider />
          <a-menu-item key="closeCurrentActive">{this.tabText('closeThat')}</a-menu-item>
        </a-menu>
      )
    }
  },
  watch: {
    '$route': function (newVal) {
      this.activeKey = newVal.fullPath
      if (this.fullPathList.indexOf(newVal.fullPath) < 0) {
        this.fullPathList.push(newVal.fullPath)
        this.pages.push(newVal)
      }
    },
    activeKey: function (newPathKey) {
      if (newPathKey && newPathKey !== this.$route.fullPath) {
        this.$router.push(newPathKey).catch(() => {})
      }
    }
  },
  render () {
    const { onEdit, $data: { pages } } = this
    const panes = pages.map(page => {
      const title = page.meta.customTitle || i18nRender(page.meta.title) || page.name || page.path
      return (
        <a-tab-pane
          style={{ height: 0 }}
          tab={this.renderTabPane(title, page.fullPath)}
          key={page.fullPath} closable={pages.length > 1}
        >
        </a-tab-pane>)
    })

    return (
      <div class="ant-pro-multi-tab">
        <div class="ant-pro-multi-tab-wrapper">
          <a-tabs
            hideAdd
            type={'editable-card'}
            v-model={this.activeKey}
            tabBarStyle={{ margin: 0, paddingLeft: '16px', paddingTop: '1px' }}
            {...{ on: { edit: onEdit } }}>
            {panes}
          </a-tabs>
          <a-dropdown overlay={this.renderClearMenu()} trigger={['click']} placement="bottomRight">
            <button type="button" class="ant-pro-multi-tab-clear">
              <a-icon type="delete" />
              <span>{this.tabText('clear')}</span>
              <a-icon type="down" class="ant-pro-multi-tab-clear__arrow" />
            </button>
          </a-dropdown>
        </div>
      </div>
    )
  }
}
</script>
