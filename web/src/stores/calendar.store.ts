import { defineStore } from 'pinia'
import { ALL_TASKS_LIST_ID, type GoalItem, type TaskArgAdd, type TaskArgUpdate } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { useTasksStore } from '@/stores/tasks.store'
import type { TaskItem } from '@/types/tasks.types'

type CalendarStore = {
  goalId: GoalItem['id'] | null
  tasks: TaskItem[]
  loading: boolean
}

let latestRequest = 0
// Tasks added while a fetch is in flight: its response may predate them, so they're kept on top of it
const addedDuringFetch = new Map<number, TaskItem>()
// Per task, the latest date update: an older response must not undo a newer move
const latestDateUpdate = new Map<number, number>()

export const useCalendarStore = defineStore('use-calendar-store', {
  state: (): CalendarStore => ({
    goalId: null,
    tasks: [],
    loading: false,
  }),

  actions: {
    // Own request instead of tasksStore.fetchAllTasks, so the List view's search and filters don't leak in.
    // Only the tasks overlapping the given period ('YYYY-MM-DD', inclusive) are loaded.
    async fetchTasks(goalId: GoalItem['id'], period: { from: string; to: string }) {
      // Don't show the previous project's tasks while the new ones load
      if (this.goalId !== goalId) this.tasks = []
      this.goalId = goalId
      this.loading = true
      const request = ++latestRequest
      addedDuringFetch.clear()

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
          dateFrom: period.from,
          dateTo: period.to,
        })
        .catch(logError)

      // Only the latest request may update state: a slower, older response must not overwrite it
      if (request !== latestRequest) return
      this.loading = false
      if (tasks) this.tasks = [...tasks, ...[...addedDuringFetch.values()].filter((added) => !tasks.some((t) => t.id === added.id))]
      addedDuringFetch.clear()
    },

    // Applied right away, as FullCalendar already shows the move: a second drag before the response
    // must start from these dates. Returns null when the update fails, so the caller can put the event back.
    async updateTaskDates(patch: TaskArgUpdate) {
      const local = this.tasks.find((t) => t.id === patch.id)
      const fields = Object.keys(patch) as (keyof TaskArgUpdate)[]
      const previous = local && Object.fromEntries(fields.map((field) => [field, local[field as keyof TaskItem]]))
      if (local) Object.assign(local, patch)

      const request = (latestDateUpdate.get(patch.id) ?? 0) + 1
      latestDateUpdate.set(patch.id, request)
      const task = await $tvApi.tasks.updateTask(patch).catch(logError)
      const isLatest = latestDateUpdate.get(patch.id) === request

      if (!task) {
        if (isLatest && local && previous) Object.assign(local, previous)
        return null
      }
      if (isLatest) {
        this.syncTask(task)
        useTasksStore().updateSelectedTask(task)
      }
      return task
    },

    // A task created from the calendar goes in no list, like one added from the main screen
    async addTask(task: Omit<TaskArgAdd, 'goalListId'>) {
      const created = await $tvApi.tasks.createTask({ ...task, goalListId: null }).catch(logError)
      if (!created) return null
      if (created.goalId !== this.goalId) return created
      this.tasks.push(created)
      if (this.loading) addedDuringFetch.set(created.id, created)
      return created
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
