import { defineStore } from 'pinia'
import type { TvFile, TvFileLinkArgs, TvFileRenameArgs, TvFileUnlinkArgs } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import type {
  FileUploadItem,
  FilesFetchForGoalArgs,
  FilesRemoteChangeArgs,
  FilesStoreState,
  FilesUploadArgs,
} from '@/types/files.types'

const PAGE_SIZE = 50
export const FILE_TOO_LARGE_ERROR_KEY = 'files.errors.tooLarge'
export const FILE_QUOTA_EXCEEDED_ERROR_KEY = 'files.errors.quotaExceeded'

export const useFilesStore = defineStore('files', {
  state: (): FilesStoreState => ({
    byTask: {},
    loadingTasks: {},
    project: { goalId: null, items: [], nextCursor: null, search: '', type: 'all', loading: false },
    uploads: [],
    storage: { enabled: null, maxFileSizeBytes: null },
    quotaByGoal: {},
  }),
  getters: {
    storageEnabled: (state): boolean => state.storage.enabled !== false,

    quotaRemaining: (state) => (goalId: number): number | null => {
      const quota = state.quotaByGoal[goalId]
      if (!quota || quota.mode !== 'enforce' || quota.quotaBytes === null || quota.usedBytes === null) return null
      return Math.max(0, quota.quotaBytes - quota.usedBytes)
    },
    filesForTask: (state) => (taskId: number): TvFile[] => state.byTask[taskId] ?? [],
    uploadsFor: (state) => (goalId: number, taskId: number | null): FileUploadItem[] =>
      state.uploads.filter((u) => u.goalId === goalId && u.taskId === taskId),
  },
  actions: {
    async fetchStorageStatus(): Promise<void> {
      if (this.storage.enabled !== null) return
      const status = await $tvApi.files.status().catch(logError)
      if (status) this.storage = { enabled: status.enabled, maxFileSizeBytes: status.maxFileSizeBytes }
    },

    async fetchQuota(goalId: number): Promise<void> {
      const quota = await $tvApi.files.quota(goalId).catch(logError)
      if (quota) this.quotaByGoal[goalId] = quota
    },

    refreshLoadedQuotas() {
      for (const goalId of Object.keys(this.quotaByGoal)) void this.fetchQuota(Number(goalId))
    },

    async fetchForTask(taskId: number): Promise<void> {
      this.loadingTasks[taskId] = true
      const files = await $tvApi.files
        .listForTask(taskId)
        .catch(logError)
        .finally(() => {
          this.loadingTasks[taskId] = false
        })
      if (files) this.byTask[taskId] = files
    },

    async fetchForGoal(args: FilesFetchForGoalArgs): Promise<void> {
      const changedScope = this.project.goalId !== args.goalId
      if (changedScope || !args.append) {
        this.project.goalId = args.goalId
        this.project.items = []
        this.project.nextCursor = null
      }
      if (args.search !== undefined) this.project.search = args.search
      if (args.type !== undefined) this.project.type = args.type

      this.project.loading = true
      const page = await $tvApi.files
        .listForGoal({
          goalId: args.goalId,
          search: this.project.search || null,
          type: this.project.type,
          cursor: args.append ? this.project.nextCursor : null,
          limit: PAGE_SIZE,
        })
        .catch(logError)
        .finally(() => {
          this.project.loading = false
        })
      if (!page || this.project.goalId !== args.goalId) return
      this.project.items = args.append ? [...this.project.items, ...page.items] : page.items
      this.project.nextCursor = page.nextCursor
    },

    async loadMoreForGoal(): Promise<void> {
      if (!this.project.goalId || !this.project.nextCursor || this.project.loading) return
      await this.fetchForGoal({ goalId: this.project.goalId, append: true })
    },

    upload(args: FilesUploadArgs): Promise<TvFile[]> {
      return Promise.all(args.files.map((file) => this.uploadOne({ goalId: args.goalId, taskId: args.taskId, file })))
        .then((results) => results.filter((r): r is TvFile => r !== null))
    },

    async uploadOne(args: { goalId: number; taskId: number | null; file: File }): Promise<TvFile | null> {
      const item: FileUploadItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        goalId: args.goalId,
        taskId: args.taskId,
        file: args.file,
        name: args.file.name,
        sizeBytes: args.file.size,
        progress: 0,
        status: 'uploading',
        errorKey: null,
        controller: new AbortController(),
      }

      // The server enforces the limit too; checking here spares sending bytes that would be rejected anyway.
      const limit = this.storage.maxFileSizeBytes
      if (limit !== null && args.file.size > limit) {
        this.uploads.push({ ...item, status: 'error', errorKey: FILE_TOO_LARGE_ERROR_KEY })
        return null
      }
      const remaining = this.quotaRemaining(args.goalId)
      if (remaining !== null && args.file.size > remaining) {
        this.uploads.push({ ...item, status: 'error', errorKey: FILE_QUOTA_EXCEEDED_ERROR_KEY })
        return null
      }

      this.uploads.push(item)

      try {
        const uploaded = await $tvApi.files.upload({
          goalId: args.goalId,
          taskId: args.taskId,
          file: args.file,
          fileName: args.file.name,
          signal: item.controller.signal,
          onProgress: (percent) => {
            const current = this.uploads.find((u) => u.id === item.id)
            if (current) current.progress = percent
          },
        })
        this.removeUpload(item.id)
        this.applyUploaded(uploaded)
        if (this.quotaByGoal[args.goalId]) void this.fetchQuota(args.goalId)
        return uploaded
      } catch (err) {
        const current = this.uploads.find((u) => u.id === item.id)
        if (!current) return null
        if (item.controller.signal.aborted) {
          this.removeUpload(item.id)
          return null
        }
        current.status = 'error'
        current.progress = 0
        current.errorKey = this.errorKeyFor(err)
        return null
      }
    },

    retryUpload(uploadId: string): Promise<TvFile | null> {
      const item = this.uploads.find((u) => u.id === uploadId)
      if (!item) return Promise.resolve(null)
      this.removeUpload(uploadId)
      return this.uploadOne({ goalId: item.goalId, taskId: item.taskId, file: item.file })
    },

    cancelUpload(uploadId: string) {
      const item = this.uploads.find((u) => u.id === uploadId)
      if (!item) return
      item.controller.abort()
      this.removeUpload(uploadId)
    },

    removeUpload(uploadId: string) {
      this.uploads = this.uploads.filter((u) => u.id !== uploadId)
    },

    async link(args: TvFileLinkArgs): Promise<boolean> {
      const files = await $tvApi.files.link(args).catch(logError)
      if (!files) return false
      const current = this.byTask[args.taskId] ?? []
      const known = new Set(current.map((f) => f.id))
      this.byTask[args.taskId] = [...files.filter((f) => !known.has(f.id)), ...current]
      files.forEach((f) => this.replaceEverywhere(f))
      return true
    },

    async unlink(args: TvFileUnlinkArgs): Promise<boolean> {
      const result = await $tvApi.files.unlink(args).then(() => true).catch((err) => { logError(err); return false })
      if (!result) return false
      this.byTask[args.taskId] = (this.byTask[args.taskId] ?? []).filter((f) => f.id !== args.fileId)
      const inProject = this.project.items.find((f) => f.id === args.fileId)
      if (inProject) inProject.linkedTaskIds = inProject.linkedTaskIds.filter((id) => id !== args.taskId)
      return true
    },

    async rename(args: TvFileRenameArgs): Promise<TvFile | null> {
      const file = await $tvApi.files.rename(args).catch(logError)
      if (!file) return null
      this.replaceEverywhere(file)
      return file
    },

    async deleteForever(fileId: string): Promise<boolean> {
      const result = await $tvApi.files.deleteForever(fileId).then(() => true).catch((err) => { logError(err); return false })
      if (!result) return false
      for (const taskId of Object.keys(this.byTask)) {
        this.byTask[Number(taskId)] = this.byTask[Number(taskId)].filter((f) => f.id !== fileId)
      }
      this.project.items = this.project.items.filter((f) => f.id !== fileId)
      this.refreshLoadedQuotas()
      return true
    },

    async downloadUrl(args: { fileId: string; inline: boolean }): Promise<string | null> {
      const result = await $tvApi.files.downloadUrl(args).catch(logError)
      return result?.url ?? null
    },

    handleRemoteChange(args: FilesRemoteChangeArgs) {
      args.taskIds.forEach((taskId) => {
        if (this.byTask[taskId]) void this.fetchForTask(taskId)
      })
      if (this.project.goalId === args.goalId) void this.fetchForGoal({ goalId: args.goalId })
    },

    applyUploaded(file: TvFile) {
      file.linkedTaskIds.forEach((taskId) => {
        const list = this.byTask[taskId]
        if (list && !list.some((f) => f.id === file.id)) list.unshift(file)
      })
      if (this.project.goalId === file.goalId && !this.project.items.some((f) => f.id === file.id)) {
        this.project.items.unshift(file)
      }
    },

    replaceEverywhere(file: TvFile) {
      for (const list of Object.values(this.byTask)) {
        const index = list.findIndex((f) => f.id === file.id)
        if (index !== -1) list[index] = file
      }
      const index = this.project.items.findIndex((f) => f.id === file.id)
      if (index !== -1) this.project.items[index] = file
    },

    errorKeyFor(err: unknown): string {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 413) return FILE_TOO_LARGE_ERROR_KEY
      if (status === 507) return FILE_QUOTA_EXCEEDED_ERROR_KEY
      if (status === 403) return 'files.errors.forbidden'
      if (status === 404) return 'files.errors.notFound'
      return 'files.errors.uploadFailed'
    },
  },
})
