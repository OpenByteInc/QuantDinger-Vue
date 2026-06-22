import './index.less'

import { Icon, Menu, Dropdown } from 'ant-design-vue'
import { i18nRender } from '@/locales'
import i18nMixin from '@/store/i18n-mixin'

const locales = [
  'en-US',
  'ru-RU',
  'ja-JP',
  'ko-KR',
  'vi-VN',
  'th-TH',
  'ar-SA',
  'fr-FR',
  'de-DE',
  'zh-TW',
  'zh-CN'
]

const languageLabels = {
  'zh-CN': '\u7b80\u4f53\u4e2d\u6587',
  'zh-TW': '\u7e41\u9ad4\u4e2d\u6587',
  'en-US': 'English',
  'ru-RU': '\u0420\u0443\u0441\u0441\u043a\u0438\u0439',
  'ja-JP': '\u65e5\u672c\u8a9e',
  'ko-KR': '\ud55c\uad6d\uc5b4',
  'vi-VN': 'Ti\u1ebfng Vi\u1ec7t',
  'th-TH': '\u0e44\u0e17\u0e22',
  'ar-SA': '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
  'fr-FR': 'Fran\u00e7ais',
  'de-DE': 'Deutsch'
}

const languageIcons = {
  'zh-CN': 'CN',
  'zh-TW': 'TW',
  'en-US': 'EN',
  'ru-RU': 'RU',
  'ja-JP': 'JA',
  'ko-KR': 'KO',
  'vi-VN': 'VI',
  'th-TH': 'TH',
  'ar-SA': 'AR',
  'fr-FR': 'FR',
  'de-DE': 'DE'
}

const languageShortLabels = {
  'zh-CN': '\u4e2d\u6587',
  'zh-TW': '\u7e41\u4e2d',
  'en-US': 'EN',
  'ru-RU': 'RU',
  'ja-JP': 'JA',
  'ko-KR': 'KO',
  'vi-VN': 'VI',
  'th-TH': 'TH',
  'ar-SA': 'AR',
  'fr-FR': 'FR',
  'de-DE': 'DE'
}

const SelectLang = {
  props: {
    prefixCls: {
      type: String,
      default: 'ant-pro-drop-down'
    }
  },
  name: 'SelectLang',
  mixins: [i18nMixin],
  render () {
    const { prefixCls } = this
    const changeLang = ({ key }) => {
      this.setLang(key)
    }
    const langMenu = (
      <Menu class={['menu', 'ant-pro-header-menu']} selectedKeys={[this.currentLang]} onClick={changeLang}>
        {locales.map(locale => (
          <Menu.Item key={locale}>
            <span class="language-code" aria-label={languageLabels[locale]}>
              {languageIcons[locale]}
            </span>
            {languageLabels[locale]}
          </Menu.Item>
        ))}
      </Menu>
    )
    const currentLabel = languageShortLabels[this.currentLang] || 'Lang'
    const title = `${i18nRender('navBar.lang')} · ${languageLabels[this.currentLang] || currentLabel}`
    return (
      <Dropdown overlay={langMenu} placement="bottomRight">
        <span class={[prefixCls, 'language-action']} title={title} aria-label={title}>
          <Icon type="global" class="language-action-icon" />
          <span class="language-action-label">{currentLabel}</span>
        </span>
      </Dropdown>
    )
  }
}

export default SelectLang
