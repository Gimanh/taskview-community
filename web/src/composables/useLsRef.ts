import { ref, watch, getCurrentScope, onScopeDispose, type Ref } from 'vue'
import { $ls } from '@/plugins/axios'

export function useLsRef<T>(key: string, defaultValue: T): Ref<T> {
  const state = ref(defaultValue) as Ref<T>
  let loaded = false
  let disposed = false

  $ls.getValue(key).then((raw) => {
    if (disposed || raw === null) {
      loaded = true
      return
    }
    try {
      state.value = JSON.parse(raw) as T
    } catch {
      state.value = raw as unknown as T
    }
    loaded = true
  })

  const stop = watch(
    state,
    (value) => {
      if (!loaded || disposed) return
      $ls.setValue(key, JSON.stringify(value))
    },
    { deep: true },
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true
      stop()
    })
  }

  return state
}
