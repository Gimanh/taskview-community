import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { isAxiosError } from 'axios'
import type {
  ImportArgCreateJob,
  ImportArgStart,
  ImportFinishedEvent,
  ImportJob,
  ImportProgressEvent,
  ImportProjectMeta,
  ImportProviderInfo,
  ImportRemoteProject,
  ImportRequestErrorCode,
} from 'taskview-api'
import { $tvApi } from '@/plugins/axios'

export const useImportStore = defineStore('import', () => {
  const providers = ref<ImportProviderInfo[]>([])
  const jobs = ref<ImportJob[]>([])
  const currentJob = ref<ImportJob | null>(null)
  const remoteProjects = ref<ImportRemoteProject[]>([])
  const projectMeta = ref<ImportProjectMeta | null>(null)
  const loading = ref(false)
  const providersLoading = ref(false)
  const errorCode = ref<ImportRequestErrorCode | null>(null)

  const isRunning = computed(() => currentJob.value?.status === 'pending' || currentJob.value?.status === 'running')

  async function call<T>(action: () => Promise<T>): Promise<T | null> {
    loading.value = true
    errorCode.value = null
    try {
      return await action()
    } catch (err) {
      const code = isAxiosError(err) ? err.response?.data?.response?.code : null
      errorCode.value = (code as ImportRequestErrorCode | undefined) ?? 'internal'
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchProviders() {
    providersLoading.value = true
    providers.value = (await call(() => $tvApi.import.fetchProviders())) ?? []
    providersLoading.value = false
  }

  async function fetchJobs(organizationId: number) {
    try {
      jobs.value = (await $tvApi.import.fetchJobs(organizationId)) ?? []
    } catch {
      jobs.value = []
    }
  }

  async function connect(data: ImportArgCreateJob): Promise<boolean> {
    const job = await call(() => $tvApi.import.createJob(data))
    if (!job) return false
    currentJob.value = job
    remoteProjects.value = (await call(() => $tvApi.import.fetchRemoteProjects(job.id))) ?? []
    return errorCode.value === null
  }

  async function selectProject(externalId: string): Promise<boolean> {
    if (!currentJob.value) return false
    const jobId = currentJob.value.id
    projectMeta.value = await call(() => $tvApi.import.fetchProjectMeta({ id: jobId, externalId }))
    return projectMeta.value !== null
  }

  async function start(data: Omit<ImportArgStart, 'id'>): Promise<boolean> {
    if (!currentJob.value) return false
    const jobId = currentJob.value.id
    const job = await call(() => $tvApi.import.start({ id: jobId, ...data }))
    if (!job) return false
    currentJob.value = job
    return true
  }

  async function cancel() {
    if (!currentJob.value) return
    const jobId = currentJob.value.id
    const job = await call(() => $tvApi.import.cancel(jobId))
    if (job) currentJob.value = job
  }

  async function refreshJob() {
    if (!currentJob.value) return
    try {
      const job = await $tvApi.import.fetchJob(currentJob.value.id)
      if (job && currentJob.value?.id === job.id) currentJob.value = job
    } catch {
      // the next poll or realtime event retries
    }
  }

  function handleProgress(event: ImportProgressEvent) {
    if (currentJob.value?.id !== event.jobId) return
    currentJob.value = { ...currentJob.value, status: 'running', progress: event.progress }
  }

  async function handleFinished(event: ImportFinishedEvent) {
    if (currentJob.value?.id !== event.jobId) return
    await refreshJob()
    if (currentJob.value) await fetchJobs(currentJob.value.organizationId)
  }

  function reset() {
    currentJob.value = null
    remoteProjects.value = []
    projectMeta.value = null
    errorCode.value = null
  }

  return {
    providers,
    jobs,
    currentJob,
    remoteProjects,
    projectMeta,
    loading,
    providersLoading,
    errorCode,
    isRunning,
    fetchProviders,
    fetchJobs,
    connect,
    selectProject,
    start,
    cancel,
    refreshJob,
    handleProgress,
    handleFinished,
    reset,
  }
})
