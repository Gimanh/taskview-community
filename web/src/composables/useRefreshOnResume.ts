import { onScopeDispose } from 'vue'
import { useEventListener } from '@vueuse/core'
import { App } from '@capacitor/app'

export function useRefreshOnResume(onResume: () => void) {
  let last = 0
  const trigger = () => {
    const now = Date.now()
    if (now - last < 1000) return
    last = now
    onResume()
  }

  useEventListener(document, 'visibilitychange', () => {
    if (!document.hidden) trigger()
  })

  let remove: (() => void) | undefined
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) trigger()
  }).then((handle) => {
    remove = () => handle.remove()
  })

  onScopeDispose(() => remove?.())
}
