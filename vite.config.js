import { defineConfig, loadEnv } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import vue2Jsx from '@vitejs/plugin-vue2-jsx'
import svgLoader from 'vite-svg-loader'
import { viteMockServe } from 'vite-plugin-mock'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

const normalizeVersion = (value) => {
  let text = String(value || '').trim()
  if (!text) return ''
  if (text.startsWith('refs/tags/')) {
    text = text.slice('refs/tags/'.length)
  }
  if (text.startsWith('v') && text.length > 1 && /\d/.test(text[1])) {
    text = text.slice(1)
  }
  if (['latest', 'main', 'master'].includes(text)) {
    return ''
  }
  return text
}

const resolveAppVersion = (env) => {
  const gitVersion = (() => {
    try {
      return execSync('git describe --tags --exact-match HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch (e) {
      return ''
    }
  })()
  return normalizeVersion(env.VITE_APP_VERSION) ||
    normalizeVersion(env.APP_VERSION) ||
    normalizeVersion(process.env.APP_VERSION) ||
    normalizeVersion(env.GIT_TAG) ||
    normalizeVersion(process.env.GIT_TAG) ||
    normalizeVersion(process.env.GITHUB_REF_NAME) ||
    normalizeVersion(process.env.GITHUB_REF) ||
    normalizeVersion(gitVersion) ||
    normalizeVersion(pkg.version) ||
    '0.0.0-dev'
}

const gitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch (e) {
    return 'unknown'
  }
})()

const buildDate = new Date().toLocaleString()

const resolveManualChunk = (id) => {
  if (!id.includes('node_modules')) return undefined
  if (id.includes('@ant-design-vue/pro-layout')) return 'ant-pro-layout'
  if (id.includes('ant-design-vue')) return 'ant-design-vue'
  if (id.includes('@ant-design') || id.includes('@antv')) return 'ant-ecosystem'
  if (id.includes('echarts') || id.includes('klinecharts') || id.includes('viser-vue')) return 'charts'
  if (id.includes('codemirror') || id.includes('vue-quill-editor') || id.includes('wangeditor')) return 'editors'
  if (id.includes('pyodide') || id.includes('comlink')) return 'py-runtime'
  if (id.includes('vue')) return 'vue-core'
  if (
    id.includes('axios') ||
    id.includes('moment') ||
    id.includes('lodash-es') ||
    id.includes('crypto-js') ||
    id.includes('store') ||
    id.includes('nprogress') ||
    id.includes('md5')
  ) {
    return 'vendor-utils'
  }
  return 'vendor'
}

const fixProLayoutLess = () => ({
  name: 'fix-pro-layout-less-selector',
  enforce: 'pre',
  transform(code, id) {
    if (!id.includes('@ant-design-vue/pro-layout') || !id.endsWith('BasicLayout.less')) {
      return null
    }
    return code.replace(/:not\('\.ant-pro-basicLayout-mobile'\)/g, ':not(.ant-pro-basicLayout-mobile)')
  }
})

const fixAntDesignVueLess = () => ({
  name: 'fix-ant-design-vue-less-inline-js',
  enforce: 'pre',
  transform(code, id) {
    if (!id.includes('ant-design-vue') || !id.includes('bezierEasing.less')) {
      return null
    }
    return code.replace(/\.bezierEasingMixin\(\);/g, '')
  }
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const enableMock = env.VITE_ENABLE_MOCK === 'true'
  const appVersion = resolveAppVersion(env)

  return {
    base: './',
    resolve: {
      alias: [
        { find: /^~(.+)/, replacement: '$1' },
        {
          find: 'webpack-theme-color-replacer/client',
          replacement: fileURLToPath(new URL('./src/shims/webpack-theme-color-replacer-client.js', import.meta.url))
        },
        { find: /^moment$/, replacement: fileURLToPath(new URL('./src/shims/moment.js', import.meta.url)) },
        { find: /^store$/, replacement: 'store/dist/store.modern.js' },
        { find: /^@\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
        { find: /^@$/, replacement: fileURLToPath(new URL('./src', import.meta.url)) }
      ],
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.vue']
    },
    define: {
      APP_VERSION: JSON.stringify(appVersion),
      GIT_HASH: JSON.stringify(gitHash),
      BUILD_DATE: JSON.stringify(buildDate),
      'process.env.APP_VERSION': JSON.stringify(appVersion),
      'process.env.VUE_APP_VERSION': JSON.stringify(appVersion),
      'process.env.VUE_APP_PREVIEW': JSON.stringify(env.VITE_PREVIEW || ''),
      'process.env.VUE_APP_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || ''),
      'process.env.VUE_APP_PYTHON_API_BASE_URL': JSON.stringify(env.VITE_PYTHON_API_BASE_URL || ''),
      'process.env.VUE_APP_PYODIDE_CDN_BASE': JSON.stringify(env.VITE_PYODIDE_CDN_BASE || ''),
      'process.env.VUE_APP_PYODIDE_LOCAL_BASE': JSON.stringify(env.VITE_PYODIDE_LOCAL_BASE || ''),
      'process.env.VUE_APP_PYODIDE_PREFER_CDN': JSON.stringify(env.VITE_PYODIDE_PREFER_CDN || '')
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          additionalData: "@import '@/styles/antd-vars.less';\n",
          modifyVars: {
            'border-radius-base': '2px'
          }
        }
      }
    },
    plugins: [
      fixAntDesignVueLess(),
      fixProLayoutLess(),
      vue2(),
      vue2Jsx(),
      svgLoader({ defaultImport: 'url' }),
      viteMockServe({
        mockPath: 'src/mock/services',
        enable: enableMock,
        watchFiles: true,
        logger: true
      })
    ],
    server: {
      port: 8000,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:5000',
          ws: true,
          changeOrigin: true,
          timeout: 600000,
          proxyTimeout: 600000
        }
      }
    },
    worker: {
      format: 'es'
    },
    optimizeDeps: {
      exclude: ['pyodide']
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      commonjsOptions: {
        transformMixedEsModules: true
      },
      rollupOptions: {
        output: {
          manualChunks: resolveManualChunk
        }
      }
    }
  }
})
