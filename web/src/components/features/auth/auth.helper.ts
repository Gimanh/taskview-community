import { ALL_TASKS_LIST_ID, type DefaultView } from 'taskview-api'
import type { RouteLocationRaw, Router } from 'vue-router'
import { $tvApi } from '@/plugins/axios'
import { useUserStore } from '@/stores/user.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'

const VIEW_ROUTES: Record<DefaultView, string> = {
  tasks: 'user',
  kanban: 'kanban',
  graph: 'graph',
  sprints: 'sprints',
}

export const redirectToUser = async (router: Router) => {
  const userStore = useUserStore()
  if (!userStore.accessToken) return

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

  for (const org of orgs) {
    const goals = await $tvApi.goals.fetchGoals(org.id)
    if (!goals?.some((goal) => goal.id === projectId)) continue

    const view = uiPrefs.settings.defaultView ?? 'tasks'
    const params: Record<string, string | number> = { orgSlug: org.slug, projectId }
    if (view === 'tasks') params.listId = ALL_TASKS_LIST_ID
    return { name: VIEW_ROUTES[view], params }
  }

  return null
}
