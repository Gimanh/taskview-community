import { ref, computed, watch } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { useTasksStore } from '@/stores/tasks.store'
import { useBaseScreenStore } from '@/stores/base-screen.store'

const _useTaskDetailPanel = () => {
  const tasksStore = useTasksStore()
  const baseScreenStore = useBaseScreenStore()
  const route = useRoute()
  const router = useRouter()
  const activeTaskId = ref<number | null>(null)
  const initialEndDate = ref<string | null>(null)

  const isOpen = computed({
    get: () => activeTaskId.value !== null,
    set: (value: boolean) => {
      if (!value) {
        closeTask()
      }
    },
  })

  // When browser back removes taskId from URL — close panel without navigating
  watch(
    () => route.params.taskId,
    (taskId) => {
      if (!taskId && activeTaskId.value !== null && route.name === 'user') {
        syncBaseScreen()
        activeTaskId.value = null
        tasksStore.selectedTask = null
      }
    },
  )

  async function openTask(id: number) {
    activeTaskId.value = id
    await tasksStore.fetchTaskById(id)
    initialEndDate.value = tasksStore.selectedTask?.endDate ?? null

    // Update URL with taskId only when a project is already selected
    const task = tasksStore.selectedTask
    if (route.name === 'user' && route.params.projectId && task) {
      const projectId = String(route.params.projectId)
      const listId = String(route.params.listId)
      const taskId = String(task.id)

      if (route.params.taskId !== taskId) {
        router.push({
          name: 'user',
          params: { projectId, listId, taskId },
        })
      }
    }
  }

  function syncBaseScreen() {
    if (!baseScreenStore.wasCalled) return

    const task = tasksStore.selectedTask
    if (!task) return

    const dateChanged = (task.endDate ?? null) !== initialEndDate.value

    if (dateChanged) {
      baseScreenStore.fetchAllState()
    } else {
      baseScreenStore.syncTask(task)
    }
  }

  function closeTask() {
    // On user route with taskId — go back (browser history), watcher will clear state
    if (route.name === 'user' && route.params.taskId) {
      syncBaseScreen()
      router.back()
      return
    }

    // On kanban/graph or no taskId in URL — just clear state
    syncBaseScreen()
    activeTaskId.value = null
    tasksStore.selectedTask = null
  }

  return {
    activeTaskId,
    isOpen,
    openTask,
    closeTask,
  }
}

export const useTaskDetailPanel = createSharedComposable(_useTaskDetailPanel)
