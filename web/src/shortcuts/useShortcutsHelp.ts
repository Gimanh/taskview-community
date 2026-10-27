import { ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'

export const useShortcutsHelp = createSharedComposable(() => {
  const isOpen = ref(false)

  return {
    isOpen,
    open: () => {
      isOpen.value = true
    },
  }
})
