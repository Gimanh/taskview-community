import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGoalsStore } from '@/stores/goals.store'
import type { Project } from '@/components/features/projects/types'

export const useInbox = () => {
  const goalsStore = useGoalsStore()
  const { goals } = storeToRefs(goalsStore)

  const inbox = computed<Project | null>(() => goals.value.find(g => g.isInbox) ?? null)

  return { inbox }
}
