import { defineStore } from 'pinia'
import { ALL_TASKS_LIST_ID, type GoalItem } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import type { TaskItem } from '@/types/tasks.types'

type CalendarStore = {
  goalId: GoalItem['id'] | null
  tasks: TaskItem[]
  loading: boolean
}

let latestRequest = 0

export const useCalendarStore = defineStore('use-calendar-store', {
  state: (): CalendarStore => ({
    goalId: null,
    tasks: [],
    loading: false,
  }),

  actions: {
    // Own request instead of tasksStore.fetchAllTasks, so the List view's search and filters don't leak in
    async fetchTasks(goalId: GoalItem['id']) {
      // Don't show the previous project's tasks while the new ones load
      if (this.goalId !== goalId) this.tasks = []
      this.goalId = goalId
      this.loading = true
      const request = ++latestRequest

      const tasks = await $tvApi.tasks
        .fetch({
          goalId,
          componentId: ALL_TASKS_LIST_ID,
          page: 0,
          // showCompleted picks one side (open or done); ignoreCompleted returns both
          showCompleted: 0,
          ignoreCompleted: true,
          firstNew: 0,
          unlimited: true,
        })
        .catch(logError)

      // Only the latest request may update state: a slower, older response must not overwrite it
      if (request !== latestRequest) return
      this.loading = false
      if (tasks) this.tasks = tasks
    },

    syncTask(task: TaskItem) {
      const local = this.tasks.find((t) => t.id === task.id)
      if (local) Object.assign(local, task)
    },

    removeTask(taskId: number) {
      this.tasks = this.tasks.filter((t) => t.id !== taskId)
    },
  },
})
