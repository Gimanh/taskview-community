import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
  const route = useRoute()
  // Mobile slideover state — must start closed. `UDashboardSidebar` renders the
  // mobile drawer as a Reka Dialog; when `open` is true it locks the body
  // (pointer-events:none + scroll lock + aria-hidden) even though it's visually
  // `lg:hidden` on desktop, freezing the whole page until the user clicks to
  // dismiss it. The desktop sidebar shows via `lg:flex` regardless of this flag.
  const isSidebarOpen = ref(false)
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
