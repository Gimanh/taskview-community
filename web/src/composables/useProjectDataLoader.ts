import { watch, type Ref } from 'vue'
import { useCollaborationStore } from '@/stores/collaboration.store'
import { useGoalListsStore } from '@/stores/goal-lists.store'
import { useKanbanStore } from '@/stores/kanban.store'
import { useTagsStore } from '@/stores/tag.store'

export function useProjectDataLoader(projectId: Ref<number>) {
  const collaborationStore = useCollaborationStore()
  const goalListsStore = useGoalListsStore()
  const kanbanStore = useKanbanStore()
  const tagsStore = useTagsStore()

  tagsStore.fetchAllTags()
  collaborationStore.fetchAllCollaborationUsers()

  watch(projectId, (id) => {
    if (id > 0) {
      Promise.all([
        kanbanStore.fetchStatuses(id),
        collaborationStore.fetchCollaborationUsersForGoal(id),
        goalListsStore.fetchLists(id),
      ])
    }
  }, { immediate: true })
}
