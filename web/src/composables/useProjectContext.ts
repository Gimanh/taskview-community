import { ref, computed, watch, provide, inject, type InjectionKey, type Ref, type ComputedRef } from 'vue'
import type { CollaborationResponseFetchAllUsers, GoalListItem, KanbanColumnItem } from 'taskview-api'
import type { TagItem } from '@/types/tags.types'
import { DEFAULT_ID } from '@/types/app.types'
import { $tvApi } from '@/plugins/axios'
import { useTagsStore } from '@/stores/tag.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useGoalListsStore } from '@/stores/goal-lists.store'
import { useCollaborationStore } from '@/stores/collaboration.store'
import { useKanbanStore } from '@/stores/kanban.store'

export type ProjectContext = {
  tags: ComputedRef<TagItem[]>
  users: ComputedRef<CollaborationResponseFetchAllUsers[]>
  statuses: Ref<KanbanColumnItem[]>
  lists: Ref<GoalListItem[]>
}

const PROJECT_CONTEXT_KEY: InjectionKey<ProjectContext> = Symbol('projectContext')

export function provideProjectContext(goalId: Ref<number>) {
  const tagsStore = useTagsStore()
  const goalsStore = useGoalsStore()
  const collaborationStore = useCollaborationStore()

  const tags = computed(() => {
    const id = goalId.value
    if (id <= 0) return []
    return tagsStore.tags.filter(
      (tag) => tag.goalId === id,
    )
  })

  const isCurrentProject = ref(false)
  const fetchedUsers = ref<CollaborationResponseFetchAllUsers[]>([])
  const users = computed(() =>
    isCurrentProject.value ? collaborationStore.users : fetchedUsers.value,
  )
  const statuses = ref<KanbanColumnItem[]>([])
  const lists = ref<GoalListItem[]>([])
  let requestId = 0

  watch(goalId, async (id) => {
    if (id <= 0) {
      fetchedUsers.value = []
      isCurrentProject.value = false
      statuses.value = []
      lists.value = []
      return
    }

    if (tagsStore.tags.length === 0) {
      await tagsStore.fetchAllTags()
    }

    // If we're inside this project already, reuse data from global stores
    if (goalsStore.selectedItemId === id) {
      const kanbanStore = useKanbanStore()
      const goalListsStore = useGoalListsStore()
      isCurrentProject.value = true
      statuses.value = kanbanStore.statuses
      lists.value = goalListsStore.lists
      return
    }
    isCurrentProject.value = false

    // Otherwise fetch project data without touching global stores
    const currentRequestId = ++requestId

    const [usersResult, columnsResult, listsResult] = await Promise.all([
      $tvApi.collaboration.fetchUsersForGoal(id).catch(() => null),
      $tvApi.kanban.fetchAllColumns(id).catch(() => null),
      $tvApi.goalLists.fetchLists({ goalId: id }).catch(() => null),
    ])

    if (currentRequestId !== requestId) return

    if (usersResult) fetchedUsers.value = usersResult
    if (columnsResult) {
      statuses.value = [
        { id: DEFAULT_ID, name: 'msg.allTasks', goalId: id, viewOrder: 0 },
        ...columnsResult,
      ]
    }
    if (listsResult) lists.value = listsResult
  }, { immediate: true })

  const context: ProjectContext = { tags, users, statuses, lists }
  provide(PROJECT_CONTEXT_KEY, context)

  return context
}

export function useProjectContext(): ProjectContext | null {
  return inject(PROJECT_CONTEXT_KEY, null)
}
