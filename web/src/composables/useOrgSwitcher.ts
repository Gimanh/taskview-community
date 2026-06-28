import { useRouter } from 'vue-router'
import type { Organization } from 'taskview-api'
import { useOrganizationStore } from '@/stores/organization.store'
import { useGoalsStore } from '@/stores/goals.store'

export function useOrgSwitcher() {
  const router = useRouter()
  const orgStore = useOrganizationStore()
  const goalsStore = useGoalsStore()

  function switchOrg(org: Organization) {
    if (org.id === orgStore.currentOrg?.id) return
    orgStore.setCurrentOrg(org)
    // Projects are org-scoped — drop the previous org's list and refetch for the
    // new one. `initialized = false` keeps the route guard from acting on stale goals.
    goalsStore.initialized = false
    goalsStore.fetchGoals()
    router.push({ name: 'user', params: { orgSlug: org.slug } })
  }

  function isCurrentOrg(orgId: Organization['id']): boolean {
    return orgStore.currentOrg?.id === orgId
  }

  return { switchOrg, isCurrentOrg }
}
