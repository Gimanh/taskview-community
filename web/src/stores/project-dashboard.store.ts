import { defineStore } from 'pinia'
import { ALL_TASKS_LIST_ID, type GoalItem } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import type { ProjectDashboardFetchArgs, ProjectDashboardStoreState } from '@/types/project-dashboard.types'

const REMOTE_REFRESH_DELAY_MS = 800

let latestRequest = 0
let lastArgs: ProjectDashboardFetchArgs | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null

export const useProjectDashboardStore = defineStore('project-dashboard', {
  state: (): ProjectDashboardStoreState => ({
    goalId: null,
    tasks: [],
    sprint: null,
    hoursByUser: [],
    loading: false,
    loaded: false,
    failed: false,
  }),

  actions: {
    async fetch(args: ProjectDashboardFetchArgs) {
      if (this.goalId !== args.goalId) this.reset()
      this.goalId = args.goalId
      lastArgs = args
      this.loading = true
      const request = ++latestRequest

      const [tasks, sprints, hours] = await Promise.all([
        $tvApi.tasks
          .fetch({
            goalId: args.goalId,
            componentId: ALL_TASKS_LIST_ID,
            page: 0,
            showCompleted: 0,
            ignoreCompleted: true,
            firstNew: 0,
            unlimited: true,
          })
          .catch(logError),
        args.withSprint
          ? $tvApi.sprints.listForGoal({ goalId: args.goalId, status: 'active,review' }).catch(logError)
          : null,
        args.withHours && args.organizationId
          ? $tvApi.timeTracking
            .reportByUser({
              organizationId: args.organizationId,
              goalIds: [args.goalId],
              from: args.hoursFrom,
              to: args.hoursTo,
              timezone: args.timezone,
            })
            .catch(logError)
          : null,
      ])

      // Only the latest request may update state: a slower, older response must not overwrite it
      if (request !== latestRequest) return
      this.loading = false
      if (!tasks) {
        this.failed = !this.loaded
        return
      }
      this.tasks = tasks
      this.sprint = sprints?.[0] ?? null
      this.hoursByUser = hours ?? []
      this.loaded = true
      this.failed = false
    },

    // A task or logged time of the open project changed elsewhere: recount, once for a burst of changes.
    // Null stands for a change whose project is not known
    handleRemoteChange(goalId: GoalItem['id'] | null) {
      if (!lastArgs || this.goalId !== lastArgs.goalId) return
      if (goalId !== null && lastArgs.goalId !== goalId) return
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        refreshTimer = null
        if (lastArgs) void this.fetch(lastArgs)
      }, REMOTE_REFRESH_DELAY_MS)
    },

    reset() {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = null
      lastArgs = null
      latestRequest++
      this.$reset()
    },
  },
})
