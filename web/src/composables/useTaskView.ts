import { computed } from 'vue'
import { useGoalsStore } from '@/stores/goals.store'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'


export const useTaskView = () => {
  const goalsStore = useGoalsStore()
  const bp = useBreakpoints(breakpointsTailwind)
  const isMobile = bp.smaller('lg')
  const isDesktop = bp.greaterOrEqual('lg')
  
  return {
    hasActiveGoals: computed(() => goalsStore.goals.length > 0),
    isMobile,
    isDesktop,
  }
}
