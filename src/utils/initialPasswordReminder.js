import { Modal } from 'ant-design-vue'
import store from '@/store'
import router from '@/router'
import { i18nRender } from '@/locales'

/**
 * Show a one-shot modal when the account still uses the bootstrap default password.
 * Re-shown on each login / app load until the backend clears must_change_initial_password.
 */
export function promptChangeInitialPassword () {
  const info = store.getters.userInfo || {}
  if (!info.must_change_initial_password) {
    return
  }

  Modal.warning({
    title: i18nRender('user.initialPassword.title'),
    content: i18nRender('user.initialPassword.content'),
    okText: i18nRender('user.initialPassword.goChange'),
    centered: true,
    maskClosable: false,
    onOk: () => {
      router.push({ path: '/profile', query: { tab: 'password' } }).catch(() => {})
    }
  })
}
