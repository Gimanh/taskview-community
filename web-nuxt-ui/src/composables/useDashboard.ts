import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
  const route = useRoute()
  const isSidebarOpen = ref(true)
  const isSidebarCollapsed = ref(false)

  watch(
    () => route.fullPath,
    () => {
      if (window.innerWidth < 1024) {
        isSidebarOpen.value = false
      }
    },
    { immediate: true },
  )

  return {
    isSidebarOpen,
    isSidebarCollapsed,
  }
}

export const useDashboard = createSharedComposable(_useDashboard)
