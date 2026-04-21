import { useUserStore } from '@/stores/user.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { Router } from 'vue-router'

export const redirectToUser = async (router: Router) => {
  const userStore = useUserStore()
  if (userStore.accessToken) {
    const orgStore = useOrganizationStore()
    if (!orgStore.organizations.length) {
      await orgStore.fetchOrganizations()
      orgStore.restoreCurrentOrg()
    }
    await router.push({ name: 'user', params: { orgSlug: orgStore.currentOrgSlug } })
  }
}