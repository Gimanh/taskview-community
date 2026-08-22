import { computed } from 'vue'
import { useGoalsStore } from '@/stores/goals.store'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'


export const useTaskView = () => {
  const goalsStore = useGoalsStore()
  const bp = useBreakpoints({ ...breakpointsTailwind, fullscreenModalMax: 1366 })
  const isMobile = bp.smaller('lg')

  const isDesktop = bp.greaterOrEqual('lg')
  //iPad fixes
  const isFullscreenModal = bp.smallerOrEqual('fullscreenModalMax')

  return {
    // Any non-archived project counts, including the Inbox — tasks can be added there too
    hasActiveGoals: computed(() => goalsStore.goals.some(g => !g.archive)),
    isMobile,
    isDesktop,
    isFullscreenModal,
  }
}
