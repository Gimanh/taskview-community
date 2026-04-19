import { ref, computed, watch } from 'vue'
import { useOnline } from '@vueuse/core'

const wasDisconnected = ref(false)

export function useConnectionStatus() {
  const online = useOnline()

  const showReconnected = computed(() => online.value && wasDisconnected.value)

  watch(online, (isOnline) => {
    if (!isOnline) {
      wasDisconnected.value = true
    }
  })

  function reload() {
    wasDisconnected.value = false
    window.location.reload()
  }

  return {
    online,
    isConnected: online,
    showReconnected,
    reload,
  }
}
