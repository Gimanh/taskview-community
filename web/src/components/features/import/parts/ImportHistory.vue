<template>
  <div
    v-if="importStore.jobs.length > 0"
    class="flex flex-col gap-2"
  >
    <h3 class="font-medium">
      {{ t('import.history.title') }}
    </h3>
    <div
      v-for="job in importStore.jobs"
      :key="job.id"
      class="flex items-center justify-between gap-3 rounded-lg border border-default px-3 py-2"
      data-testid="import-history-item"
    >
      <div class="flex min-w-0 items-center gap-2">
        <UIcon
          :name="IMPORT_PROVIDERS[job.provider]?.icon ?? 'i-lucide-download'"
          class="size-4 shrink-0"
        />
        <div class="min-w-0">
          <p class="truncate text-sm font-medium">
            {{ job.externalProjectName ?? '—' }}
          </p>
          <p class="text-xs text-muted">
            {{ formatDate(job.createdAt) }}
            <template v-if="job.stats">
              · {{ t('import.history.tasks', { count: job.stats.tasksCreated }) }}
            </template>
          </p>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <UBadge
          variant="subtle"
          :color="statusColor(job.status)"
          :label="t(`import.status.${job.status}`)"
        />
        <UButton
          v-if="job.goalId"
          variant="ghost"
          color="neutral"
          size="xs"
          icon="i-lucide-external-link"
          :aria-label="t('import.progress.openProject')"
          :to="{ name: 'user', params: { orgSlug: organizationStore.currentOrgSlug, projectId: String(job.goalId), listId: ALL_TASKS_LIST_ID } }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ALL_TASKS_LIST_ID, type ImportJobStatus } from 'taskview-api'
import { useImportStore } from '@/stores/import.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { IMPORT_PROVIDERS } from '../importProviders'

const { t, locale } = useI18n()
const importStore = useImportStore()
const organizationStore = useOrganizationStore()

function formatDate(value: string): string {
  return new Date(value).toLocaleString(locale.value, { dateStyle: 'medium', timeStyle: 'short' })
}

function statusColor(status: ImportJobStatus) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'cancelled') return 'neutral'
  return 'info'
}
</script>
