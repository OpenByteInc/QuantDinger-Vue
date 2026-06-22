
export const PYTHON_API_BASE_URL = process.env.VUE_APP_PYTHON_API_BASE_URL || 'http://localhost:5000'
const BUILD_APP_VERSION = typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0.0.0-dev'

export default {
  /** Web UI release label (footer, docs cross-reference). */
  appVersion: BUILD_APP_VERSION,
  navTheme: 'light', // theme for nav menu
  primaryColor: '#13C2C2', // '#F5222D', // primary color of ant design
  layout: 'topmenu', // nav menu position: `sidemenu` or `topmenu`
  contentWidth: 'Fluid', // layout of content: `Fluid` or `Fixed`, only works when layout is topmenu
  fixedHeader: true, // sticky header - 固定顶部导航栏
  fixSiderbar: false, // sticky sidebar
  colorWeak: false,
  menu: {
    locale: true
  },
  title: 'QuantDinger',
  pwa: false,
  iconfontUrl: '',
  production: process.env.NODE_ENV === 'production' && process.env.VUE_APP_PREVIEW !== 'true'

}
