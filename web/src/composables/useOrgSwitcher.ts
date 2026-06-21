import { useRouter } from 'vue-router'
import type { Organization } from 'taskview-api'
import { useOrganizationStore } from '@/stores/organization.store'

export function useOrgSwitcher() {
  const router = useRouter()
  const orgStore = useOrganizationStore()

  function switchOrg(org: Organization) {
    if (org.id === orgStore.currentOrg?.id) return
    orgStore.setCurrentOrg(org)
    router.push({ name: 'user', params: { orgSlug: org.slug } })
  }

  function isCurrentOrg(orgId: Organization['id']): boolean {
    return orgStore.currentOrg?.id === orgId
  }

  return { switchOrg, isCurrentOrg }
}
