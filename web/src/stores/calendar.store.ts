import { defineStore } from 'pinia'
import { ALL_TASKS_LIST_ID, type GoalItem, type TaskArgAdd, type TaskArgUpdate, type TaskFilters } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { useTasksStore } from '@/stores/tasks.store'
import type { TaskItem } from '@/types/tasks.types'
import { isScheduled } from '@/helpers/taskCalendarDates'
import type { CalendarUnscheduledCursor, CalendarUnscheduledQuery } from '@/types/calendar.types'

type CalendarStore = {
  goalId: GoalItem['id'] | null
  tasks: TaskItem[]
  loading: boolean
  // Open tasks of the project with no dates, shown in the panel they are dragged onto the calendar from
  unscheduled: TaskItem[]
  unscheduledLoading: boolean
  // More pages of the panel are left on the server
  unscheduledHasMore: boolean
  unscheduledCursor: CalendarUnscheduledCursor | null
  unscheduledSearch: string
}

let latestRequest = 0
// Tasks added while a fetch is in flight: its response may predate them, so they're kept on top of it
const addedDuringFetch = new Map<number, TaskItem>()
// Per task, the latest date update: an older response must not undo a newer move
const latestDateUpdate = new Map<number, number>()
let latestUnscheduledRequest = 0
let unscheduledQuery: CalendarUnscheduledQuery | null = null
// Tasks scheduled or unscheduled while the panel's fetch is in flight: its response may predate the move
const movedDuringUnscheduledFetch = new Set<number>()

// The page size of the tasks fetch: a shorter page is the last one
const UNSCHEDULED_PAGE_SIZE = 30

function belongsToPanel(task: TaskItem): boolean {
  return !isScheduled(task) && !task.complete
}

export const useCalendarStore = defineStore('use-calendar-store', {
  state: (): CalendarStore => ({
    goalId: null,
    tasks: [],
    loading: false,
    unscheduled: [],
    unscheduledLoading: false,
    unscheduledHasMore: false,
    unscheduledCursor: null,
    unscheduledSearch: '',
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

    // The panel's first page for a new project, filter or search
    async fetchUnscheduled(query: CalendarUnscheduledQuery) {
      if (unscheduledQuery?.goalId !== query.goalId) this.unscheduled = []
      unscheduledQuery = query
      this.unscheduledCursor = null
      await this.loadUnscheduledPage(false)
    },

    async fetchMoreUnscheduled() {
      if (this.unscheduledLoading || !this.unscheduledHasMore) return
      await this.loadUnscheduledPage(true)
    },

    async loadUnscheduledPage(append: boolean) {
      const query = unscheduledQuery
      if (!query) return
      this.unscheduledLoading = true
      const request = ++latestUnscheduledRequest
      movedDuringUnscheduledFetch.clear()

      const filters: TaskFilters = {
        ...(query.assignees.length ? { assignees: query.assignees } : {}),
        ...(query.priorities.length ? { priorities: query.priorities } : {}),
      }
      const cursor = this.unscheduledCursor
      const tasks = await $tvApi.tasks
        .fetch({
          goalId: query.goalId,
          componentId: ALL_TASKS_LIST_ID,
          page: 0,
          showCompleted: 0,
          firstNew: 1,
          sortBy: query.byPriority ? 'priority' : 'date',
          undated: true,
          ...(query.search ? { searchText: query.search } : {}),
          ...(Object.keys(filters).length ? { filters } : {}),
          ...(cursor ? { afterId: cursor.id, afterPriority: cursor.priorityId } : {}),
        })
        .catch(logError)

      // A newer request (another page, or a new filter) supersedes this one
      if (request !== latestUnscheduledRequest) return
      this.unscheduledLoading = false
      if (!tasks) return

      const moved = [...movedDuringUnscheduledFetch]
      const fresh = tasks.filter((task) => !moved.includes(task.id))
      if (append) {
        const known = new Set(this.unscheduled.map((task) => task.id))
        this.unscheduled.push(...fresh.filter((task) => !known.has(task.id)))
      } else {
        this.unscheduled = [...fresh, ...this.unscheduled.filter((task) => moved.includes(task.id))]
      }
      const last = tasks.at(-1)
      this.unscheduledCursor = last ? { id: last.id, priorityId: last.priorityId } : cursor
      this.unscheduledHasMore = tasks.length === UNSCHEDULED_PAGE_SIZE
      movedDuringUnscheduledFetch.clear()
    },

    findTask(taskId: number) {
      return this.tasks.find((t) => t.id === taskId) ?? this.unscheduled.find((t) => t.id === taskId)
    },

    // Moves a task between the calendar and the panel when its dates (or completion) say it belongs in the other
    placeTask(task: TaskItem) {
      const inPanel = this.unscheduled.includes(task)
      if (inPanel === belongsToPanel(task)) return
      if (this.unscheduledLoading) movedDuringUnscheduledFetch.add(task.id)
      if (inPanel) {
        this.unscheduled = this.unscheduled.filter((t) => t !== task)
        if (isScheduled(task)) this.tasks.push(task)
      } else {
        this.tasks = this.tasks.filter((t) => t !== task)
        this.unscheduled.unshift(task)
      }
    },

    // Applied right away, as FullCalendar already shows the move: a second drag before the response
    // must start from these dates. Returns null when the update fails, so the caller can put the event back.
    // Works for tasks in the panel too: giving one dates moves it onto the calendar, clearing them moves it back.
    async updateTaskDates(patch: TaskArgUpdate) {
      const local = this.findTask(patch.id)
      const fields = Object.keys(patch) as (keyof TaskArgUpdate)[]
      const previous = local && Object.fromEntries(fields.map((field) => [field, local[field as keyof TaskItem]]))
      if (local) {
        Object.assign(local, patch)
        this.placeTask(local)
      }

      const request = (latestDateUpdate.get(patch.id) ?? 0) + 1
      latestDateUpdate.set(patch.id, request)
      const task = await $tvApi.tasks.updateTask(patch).catch(logError)
      const isLatest = latestDateUpdate.get(patch.id) === request

      if (!task) {
        if (isLatest && local && previous) {
          Object.assign(local, previous)
          this.placeTask(local)
        }
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
      const local = this.findTask(task.id)
      if (!local) return
      Object.assign(local, task)
      this.placeTask(local)
    },

    removeTask(taskId: number) {
      this.tasks = this.tasks.filter((t) => t.id !== taskId)
      this.unscheduled = this.unscheduled.filter((t) => t.id !== taskId)
    },
  },
})
