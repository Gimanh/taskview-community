<template>
  <div
    v-if="job"
    class="flex flex-col gap-5"
    data-testid="import-progress"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="truncate text-lg font-semibold">
          {{ job.externalProjectName }}
        </h2>
        <p class="text-sm text-muted">
          {{ statusText }}
        </p>
      </div>
      <UBadge
        :color="statusColor"
        variant="subtle"
        :label="t(`import.status.${job.status}`)"
        data-testid="import-status"
      />
    </div>

    <UProgress
      v-if="importStore.isRunning"
      :model-value="percent"
      :max="100"
    />

    <ImportErrorAlert :code="job.error" />

    <ImportResultStats
      v-if="job.stats"
      :stats="job.stats"
    />

    <div class="flex flex-wrap items-center justify-between gap-2">
      <UButton
        v-if="importStore.isRunning"
        color="neutral"
        variant="outline"
        icon="i-lucide-x"
        :label="t('import.progress.cancel')"
        :loading="importStore.loading"
        @click="importStore.cancel()"
      />
      <UButton
        v-else
        color="neutral"
        variant="ghost"
        icon="i-lucide-rotate-ccw"
        :label="t('import.progress.another')"
        @click="emit('restart')"
      />
      <UButton
        v-if="job.goalId && !importStore.isRunning"
        icon="i-lucide-arrow-right"
        trailing
        :label="t('import.progress.openProject')"
        data-testid="import-open-project"
        @click="openProject(job.goalId)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { useImportStore } from '@/stores/import.store'
import { useOrganizationStore } from '@/stores/organization.store'
import ImportErrorAlert from './ImportErrorAlert.vue'
import ImportResultStats from './ImportResultStats.vue'

const POLL_INTERVAL_MS = 4000

const emit = defineEmits<{
  restart: []
}>()

const { t } = useI18n()
const router = useRouter()
const importStore = useImportStore()
const organizationStore = useOrganizationStore()

const job = computed(() => importStore.currentJob)

const percent = computed(() => {
  const progress = job.value?.progress
  if (!progress?.total) return null
  return Math.min(100, Math.round((progress.done / progress.total) * 100))
})

const statusText = computed(() => {
  const progress = job.value?.progress
  if (!importStore.isRunning || !progress) return ''
  const phase = t(`import.progress.phase.${progress.phase}`)
  return progress.total ? `${phase}: ${progress.done} / ${progress.total}` : phase
})

const statusColor = computed(() => {
  if (job.value?.status === 'completed') return 'success'
  if (job.value?.status === 'failed') return 'error'
  if (job.value?.status === 'cancelled') return 'neutral'
  return 'info'
})

let timer: number | null = null

watch(
  () => importStore.isRunning,
  (running) => {
    if (running && timer === null) {
      timer = window.setInterval(() => importStore.refreshJob(), POLL_INTERVAL_MS)
    } else if (!running && timer !== null) {
      window.clearInterval(timer)
      timer = null
      if (job.value) importStore.fetchJobs(job.value.organizationId)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (timer !== null) window.clearInterval(timer)
})

function openProject(goalId: number) {
  router.push({ name: 'user', params: { orgSlug: organizationStore.currentOrgSlug, projectId: String(goalId), listId: ALL_TASKS_LIST_ID } })
}
</script>
