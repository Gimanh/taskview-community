import { computed } from 'vue'
import type { Organization } from 'taskview-api'

export function useOrgPermissions(orgRef: () => Organization | null | undefined) {
  const currentUserRole = computed(() => orgRef()?.currentUserRole ?? 'member')

  const isOwner = computed(() => currentUserRole.value === 'owner')
  const isAdmin = computed(() => currentUserRole.value === 'owner' || currentUserRole.value === 'admin')
  const isMember = computed(() => currentUserRole.value === 'member')

  return {
    currentUserRole,
    isOwner,
    isAdmin,
    isMember,
  }
}
