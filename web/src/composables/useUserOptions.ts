import { computed } from 'vue'
import type { CollaborationResponseFetchAllUsers } from 'taskview-api'
import { useCollaborationStore } from '@/stores/collaboration.store'
import { useProjectContext } from '@/composables/useProjectContext'
import type { TvDropdownOption } from '@/types/tvDropdown.types'

export type UserValue = number

function getUserDisplayName(user: CollaborationResponseFetchAllUsers): string {
  return user.email
}

export function useUserOptions() {
  const collaborationStore = useCollaborationStore()
  const projectContext = useProjectContext()

  const users = computed(() =>
    projectContext ? projectContext.users.value : collaborationStore.users,
  )

  const options = computed<TvDropdownOption<UserValue>[]>(() =>
    users.value.map(user => ({
      value: user.id,
      label: getUserDisplayName(user),
      icon: 'i-lucide-at-sign',
      iconClass: 'text-dimmed',
    })),
  )

  return { options, users }
}
