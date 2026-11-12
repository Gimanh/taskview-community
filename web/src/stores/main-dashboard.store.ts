import { defineStore } from 'pinia'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import type { MainDashboardFetchArgs, MainDashboardStoreState } from '@/types/main-dashboard.types'
import type { ProjectDashboardBucket } from '@/types/project-dashboard.types'

const REMOTE_REFRESH_DELAY_MS = 1500
const BUCKET_PAGE_SIZE = 50

let latestRequest = 0
let latestBucketRequest = 0
let lastArgs: MainDashboardFetchArgs | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null

export const useMainDashboardStore = defineStore('main-dashboard', {
  state: (): MainDashboardStoreState => ({
    data: null,
    hoursByUser: null,
    loading: false,
    failed: false,
    bucket: null,
  }),

  actions: {
    async fetch(args: MainDashboardFetchArgs) {
      lastArgs = args
      this.loading = true
      const request = ++latestRequest

      const data = await $tvApi.start
        .fetchDashboard({
          tz: args.timezone,
          weekStart: args.weekStart,
          organizationId: args.organizationId ?? undefined,
        })
        .catch(logError)
      // Hours are asked for the projects the workload is counted in, so both describe the same projects
      // An older server does not name these projects: then no hours are shown rather than hours of other projects
      const workloadGoalIds = data?.workloadGoalIds ?? []
      const hours = workloadGoalIds.length && args.organizationId
        ? await $tvApi.timeTracking
          .reportByUser({
            organizationId: args.organizationId,
            goalIds: workloadGoalIds,
            from: args.hoursFrom,
            to: args.hoursTo,
            timezone: args.timezone,
          })
          .catch(() => null)
        : null

      // Only the latest request may update state: a slower, older response must not overwrite it
      if (request !== latestRequest) return
      this.loading = false
      if (!data) {
        this.failed = !this.data
        return
      }
      this.data = data
      this.hoursByUser = hours ?? null
      this.failed = false
    },

    async openBucket(selection: ProjectDashboardBucket) {
      latestBucketRequest++
      this.bucket = { selection, tasks: [], total: 0, loading: false, failed: false }
      await this.loadBucketPage()
    },

    // The next page of the open column; a failed page is asked for again
    async loadBucketPage() {
      if (!this.bucket || this.bucket.loading || !lastArgs) return
      const { selection, tasks } = this.bucket
      this.bucket.loading = true
      const request = ++latestBucketRequest

      const page = await $tvApi.start
        .fetchDashboardTasks({
          tz: lastArgs.timezone,
          bucket: selection.kind,
          date: selection.date ?? undefined,
          offset: tasks.length,
          limit: BUCKET_PAGE_SIZE,
          organizationId: lastArgs.organizationId ?? undefined,
        })
        .catch(logError)

      // The column was closed or another one opened meanwhile
      if (request !== latestBucketRequest || !this.bucket) return
      this.bucket.loading = false
      this.bucket.failed = !page
      if (!page) return
      const known = new Set(this.bucket.tasks.map((task) => task.id))
      this.bucket.tasks.push(...page.tasks.filter((task) => !known.has(task.id)))
      this.bucket.total = page.total
    },

    closeBucket() {
      latestBucketRequest++
      this.bucket = null
    },

    // A task changed somewhere: recount, once for a burst of changes, while the dashboard is on screen
    handleRemoteChange() {
      if (!lastArgs) return
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
      latestBucketRequest++
      this.$reset()
    },
  },
})
