import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGoalsStore } from '@/stores/goals.store'
import { useOrganizationStore } from '@/stores/organization.store'
import type { Project } from '@/components/features/projects/types'

export const useInbox = () => {
  const goalsStore = useGoalsStore()
  const orgStore = useOrganizationStore()
  const { goals } = storeToRefs(goalsStore)

  const isOwnInbox = (goal: Project) => goal.isInbox && goal.organizationId === orgStore.personalOrg?.id

  const inbox = computed<Project | null>(() => goals.value.find(isOwnInbox) ?? null)

  return { inbox, isOwnInbox }
}
