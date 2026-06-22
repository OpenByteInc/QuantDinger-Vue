
import { ref, onBeforeUnmount } from 'vue'
import pyodideService from './pyodideService'

export function usePyodide ({ autoPrewarm = false } = {}) {
  const ready = ref(false)
  const loading = ref(false)
  const failed = ref(false)
  const error = ref(null)

  const unsubscribe = pyodideService.onStateChange((s) => {
    ready.value = s.ready
    loading.value = s.loading
    failed.value = s.failed
    error.value = s.error
  })

  onBeforeUnmount(() => {
    unsubscribe()
  })

  if (autoPrewarm) {
    pyodideService.prewarm()
  }

  return {
    ready,
    loading,
    failed,
    error,
    prewarm: pyodideService.prewarm,
    ensureReady: pyodideService.ensureReady,
    runStrategy: pyodideService.runStrategy,
    runPython: pyodideService.runPython,
    loadPackages: pyodideService.loadPackages
  }
}
