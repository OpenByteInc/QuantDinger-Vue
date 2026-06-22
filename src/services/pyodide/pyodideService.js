//
//   import pyodideService from '@/services/pyodide/pyodideService'
//   const json = await pyodideService.runStrategy({ userCode, rawData, params })

import { wrap } from 'comlink'

let workerInstance = null
let api = null
let readyPromise = null
let state = {
  ready: false,
  loading: false,
  failed: false,
  error: null
}
const listeners = new Set()

function notify () {
  for (const cb of listeners) {
    try { cb({ ...state }) } catch (_) {}
  }
}

function _setState (patch) {
  state = { ...state, ...patch }
  notify()
}

function _readEnv () {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}
  const preferCdnRaw = env.VITE_PYODIDE_PREFER_CDN
  const preferCdn = preferCdnRaw === undefined || preferCdnRaw === ''
    ? import.meta.env.PROD
    : (preferCdnRaw === 'true' || preferCdnRaw === '1' || preferCdnRaw === 'yes')
  return {
    cdnBase: env.VITE_PYODIDE_CDN_BASE || '',
    localBase: env.VITE_PYODIDE_LOCAL_BASE || '',
    preferCdn,
    version: env.VITE_PYODIDE_VERSION || '0.25.0'
  }
}

function _createWorker () {
  if (workerInstance) return
  workerInstance = new Worker(new URL('./pyodide.worker.js', import.meta.url), {
    type: 'module',
    name: 'pyodide'
  })
  api = wrap(workerInstance)
}

async function ensureReady () {
  if (state.ready) return
  if (readyPromise) return readyPromise

  _createWorker()
  _setState({ loading: true, failed: false, error: null })

  readyPromise = (async () => {
    try {
      await api.init(_readEnv())
      _setState({ ready: true, loading: false, failed: false, error: null })
    } catch (err) {
      _setState({ ready: false, loading: false, failed: true, error: err && err.message ? err.message : String(err) })
      throw err
    }
  })()

  return readyPromise
}

function prewarm () {
  ensureReady().catch(() => {})
}

async function runStrategy (payload) {
  await ensureReady()
  return api.runStrategy(payload)
}

async function runPython (code, globalsObj) {
  await ensureReady()
  return api.runPython(code, globalsObj)
}

async function loadPackages (pkgs) {
  await ensureReady()
  return api.loadPackages(pkgs)
}

function onStateChange (cb) {
  listeners.add(cb)
  try { cb({ ...state }) } catch (_) {}
  return () => listeners.delete(cb)
}

function getState () {
  return { ...state }
}

export default {
  prewarm,
  ensureReady,
  runStrategy,
  runPython,
  loadPackages,
  onStateChange,
  getState
}
