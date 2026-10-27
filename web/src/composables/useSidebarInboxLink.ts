import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { RouteLocationRaw } from 'vue-router'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { useGoalsStore } from '@/stores/goals.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useInbox } from '@/composables/useInbox'

/**
 * The Inbox lives in the personal organization only. While another organization is open
 * the sidebar still offers it and the link leads into the personal organization.
 */
export function useSidebarInboxLink() {
  const goalsStore = useGoalsStore()
  const orgStore = useOrganizationStore()
  const { inbox: currentOrgInbox } = useInbox()

  const { personalOrg } = storeToRefs(orgStore)

  watch(
    () => [goalsStore.initialized, currentOrgInbox.value, personalOrg.value] as const,
    ([initialized, inbox, personal]) => {
      if (initialized && !inbox && personal) goalsStore.fetchPersonalInbox()
    },
    { immediate: true },
  )

  const inboxId = computed(() => currentOrgInbox.value?.id ?? goalsStore.personalInbox?.id ?? null)

  const link = computed<RouteLocationRaw | null>(() => {
    if (currentOrgInbox.value) {
      return { name: 'user', params: { projectId: currentOrgInbox.value.id, listId: ALL_TASKS_LIST_ID } }
    }
    if (goalsStore.personalInbox && personalOrg.value) {
      return {
        name: 'user',
        params: { orgSlug: personalOrg.value.slug, projectId: goalsStore.personalInbox.id, listId: ALL_TASKS_LIST_ID },
      }
    }
    return null
  })

  return { link, inboxId }
}
