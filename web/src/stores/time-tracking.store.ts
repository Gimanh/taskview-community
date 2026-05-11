import { defineStore } from 'pinia'
import axios from 'axios'
import type {
  TimeEntryCreateManualArg,
  TimeEntryFetchFilters,
  TimeEntryHistoryItem,
  TimeEntryItem,
  TimeEntryStartResult,
  TimeEntrySummaryByGoal,
  TimeEntrySummaryByTask,
  TimeEntryUpdateArg,
} from 'taskview-api'
import { $tvApi } from '@/plugins/axios'

interface TimeTrackingState {
  active: TimeEntryItem | null
  entriesByTask: Record<number, TimeEntryItem[]>
  summaryByTask: Record<number, TimeEntrySummaryByTask>
  taskRecency: number[]
  loadingActive: boolean
  loadingByTaskId: number | null
  lastError: { key: string; ts: number } | null
}

const TASK_CACHE_LIMIT = 10

function resolveErrorKey(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    if (status === 403) return 'timeTracking.errors.forbidden'
    if (status === 404) return 'timeTracking.errors.notFound'
    if (status === 400) return 'timeTracking.errors.validation'
    if (status === undefined) return 'timeTracking.errors.network'
  }
  return 'timeTracking.errors.generic'
}

export const useTimeTrackingStore = defineStore('timeTracking', {
  state: (): TimeTrackingState => ({
    active: null,
    entriesByTask: {},
    summaryByTask: {},
    taskRecency: [],
    loadingActive: false,
    loadingByTaskId: null,
    lastError: null,
  }),
  actions: {
    setError(err: unknown): void {
      this.lastError = { key: resolveErrorKey(err), ts: Date.now() }
    },

    touchTaskCache(taskId: number): void {
      this.taskRecency = this.taskRecency.filter((id) => id !== taskId)
      this.taskRecency.push(taskId)
      while (this.taskRecency.length > TASK_CACHE_LIMIT) {
        const evicted = this.taskRecency.shift()
        if (evicted !== undefined) {
          delete this.entriesByTask[evicted]
          delete this.summaryByTask[evicted]
        }
      }
    },

    async fetchActive(): Promise<void> {
      this.loadingActive = true
      try {
        const result = await $tvApi.timeTracking.getActive()
        this.active = result ?? null
      } catch (err) {
        this.setError(err)
      } finally {
        this.loadingActive = false
      }
    },

    async start(taskId: number, description?: string): Promise<TimeEntryStartResult | null> {
      try {
        const result = await $tvApi.timeTracking.start({ taskId, description })
        if (!result) return null
        if (result.autoStoppedEntry) this.replaceInTask(result.autoStoppedEntry)
        this.active = result.entry
        this.appendToTask(result.entry)
        return result
      } catch (err) {
        this.setError(err)
        return null
      }
    },

    async stop(entryId?: number): Promise<TimeEntryItem | null> {
      try {
        const entry = await $tvApi.timeTracking.stop(entryId ? { entryId } : {})
        if (!entry) return null
        if (this.active?.id === entry.id) this.active = null
        this.replaceInTask(entry)
        return entry
      } catch (err) {
        this.setError(err)
        return null
      }
    },

    async createManual(data: TimeEntryCreateManualArg): Promise<TimeEntryItem | null> {
      try {
        const entry = await $tvApi.timeTracking.createManual(data)
        if (!entry) return null
        this.appendToTask(entry)
        return entry
      } catch (err) {
        this.setError(err)
        return null
      }
    },

    async update(data: TimeEntryUpdateArg): Promise<TimeEntryItem | null> {
      try {
        const entry = await $tvApi.timeTracking.update(data)
        if (!entry) return null
        this.replaceInTask(entry)
        if (this.active?.id === entry.id) {
          this.active = entry.endedAt ? null : entry
        }
        return entry
      } catch (err) {
        this.setError(err)
        return null
      }
    },

    async deleteEntry(id: number, taskId: number): Promise<boolean> {
      try {
        const result = await $tvApi.timeTracking.delete(id)
        if (!result?.deleted) return false
        const list = this.entriesByTask[taskId]
        if (list) this.entriesByTask[taskId] = list.filter((e) => e.id !== id)
        if (this.active?.id === id) this.active = null
        return true
      } catch (err) {
        this.setError(err)
        return false
      }
    },

    async fetchEntriesForTask(taskId: number): Promise<void> {
      this.loadingByTaskId = taskId
      try {
        const result = await $tvApi.timeTracking.fetchEntries({ taskId })
        this.entriesByTask[taskId] = result ?? []
        this.touchTaskCache(taskId)
      } catch (err) {
        this.setError(err)
      } finally {
        this.loadingByTaskId = null
      }
    },

    async fetchEntries(filters: TimeEntryFetchFilters): Promise<TimeEntryItem[]> {
      try {
        const result = await $tvApi.timeTracking.fetchEntries(filters)
        return result ?? []
      } catch (err) {
        this.setError(err)
        return []
      }
    },

    async fetchSummaryByTask(taskId: number): Promise<TimeEntrySummaryByTask | null> {
      try {
        const result = await $tvApi.timeTracking.summaryByTask(taskId)
        if (result) {
          this.summaryByTask[taskId] = result
          this.touchTaskCache(taskId)
        }
        return result ?? null
      } catch (err) {
        this.setError(err)
        return null
      }
    },

    async fetchSummaryByGoal(goalId: number): Promise<TimeEntrySummaryByGoal | null> {
      try {
        return await $tvApi.timeTracking.summaryByGoal(goalId) ?? null
      } catch (err) {
        this.setError(err)
        return null
      }
    },

    async fetchHistory(entryId: number): Promise<TimeEntryHistoryItem[]> {
      try {
        const result = await $tvApi.timeTracking.fetchHistory(entryId)
        return result ?? []
      } catch (err) {
        this.setError(err)
        return []
      }
    },

    handleRealtimeStarted(entry: TimeEntryItem): void {
      this.active = entry
      this.appendToTask(entry)
    },

    handleRealtimeStopped(entry: TimeEntryItem): void {
      if (this.active?.id === entry.id) this.active = null
      this.replaceInTask(entry)
    },

    handleRealtimeCreated(entry: TimeEntryItem): void {
      this.appendToTask(entry)
    },

    handleRealtimeDeleted(payload: { entryId: number; taskId: number }): void {
      const list = this.entriesByTask[payload.taskId]
      if (list) this.entriesByTask[payload.taskId] = list.filter((e) => e.id !== payload.entryId)
      if (this.active?.id === payload.entryId) this.active = null
    },

    appendToTask(entry: TimeEntryItem): void {
      const list = this.entriesByTask[entry.taskId] ?? []
      const idx = list.findIndex((e) => e.id === entry.id)
      if (idx === -1) {
        this.entriesByTask[entry.taskId] = [entry, ...list]
      } else {
        list[idx] = entry
      }
      this.touchTaskCache(entry.taskId)
    },

    replaceInTask(entry: TimeEntryItem): void {
      const list = this.entriesByTask[entry.taskId]
      if (!list) return
      const idx = list.findIndex((e) => e.id === entry.id)
      if (idx !== -1) list[idx] = entry
    },
  },
})
