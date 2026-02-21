import { watch, type Ref } from 'vue'
import { useCollaborationStore } from '@/stores/collaboration.store'
import { useKanbanStore } from '@/stores/kanban.store'
import { useTagsStore } from '@/stores/tag.store'

export function useProjectDataLoader(projectId: Ref<number>) {
  const collaborationStore = useCollaborationStore()
  const kanbanStore = useKanbanStore()
  const tagsStore = useTagsStore()

  tagsStore.fetchAllTags()

  watch(projectId, (id) => {
    if (id > 0) {
      Promise.all([
        kanbanStore.fetchStatuses(id),
        collaborationStore.fetchCollaborationUsersForGoal(id),
      ])
    }
  }, { immediate: true })
}
