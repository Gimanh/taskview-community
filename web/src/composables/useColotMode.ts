import { computed } from 'vue'
import { useColorMode } from '@vueuse/core'

export const useColor = () => {
  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')
  return {
    colorMode,
    isDark,
  }
}