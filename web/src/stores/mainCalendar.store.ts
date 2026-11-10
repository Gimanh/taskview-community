import { defineStore } from 'pinia'
import type { TaskArgUpdate } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { useOrganizationStore } from '@/stores/organization.store'
import { useTasksStore } from '@/stores/tasks.store'
import type { TaskItem } from '@/types/tasks.types'
import type { MainCalendarPeriod, MainCalendarState } from './mainCalendar.store.types'

let latestRequest = 0

// The calendar on the main screen: dated tasks of every project of the current organization
export const useMainCalendarStore = defineStore('main-calendar-store', {
  state: (): MainCalendarState => ({
    tasks: [],
    loading: false,
    period: null,
  }),

  actions: {
    async fetchTasks(period: MainCalendarPeriod) {
      this.period = period
      this.loading = true
      const request = ++latestRequest
      const organizationId = useOrganizationStore().currentOrg?.id
      const tasks = await $tvApi.start
        .fetchCalendarTasks({ ...period, ...(organizationId ? { organizationId } : {}) })
        .catch(logError)

      // A slower, older response must not overwrite a newer one
      if (request !== latestRequest) return
      this.loading = false
      if (tasks) this.tasks = tasks
    },

    async refresh() {
      if (this.period) await this.fetchTasks(this.period)
    },

    // The calendar already shows the change: keep the local copy in step, or undo it if saving fails
    async updateTask(patch: TaskArgUpdate): Promise<boolean> {
      const local = this.tasks.find((task) => task.id === patch.id)
      const previous = local && { ...local }
      if (local) Object.assign(local, patch)

      const task = await $tvApi.tasks.updateTask(patch).catch(logError)
      if (!task) {
        if (local && previous) Object.assign(local, previous)
        return false
      }
      this.replaceTask(task)
      useTasksStore().updateSelectedTask(task)
      return true
    },

    replaceTask(task: TaskItem) {
      const index = this.tasks.findIndex((item) => item.id === task.id)
      if (index !== -1) this.tasks[index] = { ...this.tasks[index], ...task }
    },
  },
})
