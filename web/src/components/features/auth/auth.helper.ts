import type { RouteLocationRaw, Router } from 'vue-router'
import { $tvApi } from '@/plugins/axios'
import { useUserStore } from '@/stores/user.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'
import { useProjectRoute } from '@/composables/useProjectRoute'

/** Only internal absolute paths — never an absolute URL, which would be an open redirect. */
const safeReturnPath = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

export const redirectToUser = async (router: Router) => {
  const userStore = useUserStore()
  if (!userStore.accessToken) return

  const returnPath = safeReturnPath(router.currentRoute.value.query.redirect)
  if (returnPath) {
    await router.replace(returnPath)
    return
  }

  const orgStore = useOrganizationStore()
  if (!orgStore.organizations.length) {
    await orgStore.fetchOrganizations()
    orgStore.restoreCurrentOrg()
  }

  const defaultRoute = await resolveDefaultRoute()
  await router.push(defaultRoute ?? { name: 'user', params: { orgSlug: orgStore.currentOrgSlug } })
}

export const resolveDefaultRoute = async (): Promise<RouteLocationRaw | null> => {
  const uiPrefs = useUiPreferencesStore()
  if (!uiPrefs.loaded) await uiPrefs.fetch()

  const projectId = uiPrefs.settings.defaultProjectId
  if (!projectId) return null

  // The default project may live in any of the user's organizations; try the current one first
  const orgStore = useOrganizationStore()
  const orgs = [...orgStore.organizations].sort((a) => (a.slug === orgStore.currentOrgSlug ? -1 : 1))
  const { projectRoute } = useProjectRoute()

  for (const org of orgs) {
    const goals = await $tvApi.goals.fetchGoals(org.id)
    const goal = goals?.find((g) => g.id === projectId)
    if (goal) return projectRoute(goal, org.slug)
  }

  return null
}
