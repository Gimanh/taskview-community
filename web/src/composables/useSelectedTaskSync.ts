import { watch } from 'vue'
import { useTasksStore } from '@/stores/tasks.store'
import { useKanbanStore } from '@/stores/kanban.store'
import { useGraphStore } from '@/stores/graph.store'
import { useBaseScreenStore } from '@/stores/base-screen.store'

// If you use it in more than one component, you need to use a shared composable
// using import { createSharedComposable } from '@vueuse/core'
export function useSelectedTaskSync() {
  const tasksStore = useTasksStore()
  const kanbanStore = useKanbanStore()
  const graphStore = useGraphStore()
  const baseScreenStore = useBaseScreenStore()

  watch(
    () => tasksStore.selectedTask,
    (task) => {
      if (!task) return
      kanbanStore.syncTask(task)
      graphStore.syncTask(task)
      baseScreenStore.syncTask(task)
    },
    { deep: true },
  )

  function broadcastRemoval(taskId: number) {
    kanbanStore.removeTask(taskId)
    graphStore.removeTask(taskId)
    baseScreenStore.removeTask(taskId)
  }

  return { broadcastRemoval }
}
