<template>
  <USlideover
    v-model:open="open"
    :title="analyticsStore.drillDown.sectionTitle ?? t('analytics.drillDown.defaultTitle')"
    :description="analyticsStore.drillDown.bucket ?? ''"
    :fullscreen="isMobile"
  >
    <template #body>
      <UAlert
        v-if="drillDownErrorMessage"
        color="error"
        variant="soft"
        :title="drillDownErrorMessage"
        icon="i-lucide-alert-triangle"
        class="mb-4"
      />
      <div v-if="analyticsStore.drillDown.loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-zinc-400" />
      </div>
      <div
        v-else-if="!analyticsStore.drillDown.error && analyticsStore.drillDown.tasks.length === 0"
        class="flex flex-col items-center gap-2 py-12 text-center text-sm text-zinc-500"
      >
        <UIcon name="i-lucide-check-circle-2" class="size-8 text-zinc-400" />
        <p>{{ t('analytics.drillDown.empty') }}</p>
      </div>
      <ul v-else-if="analyticsStore.drillDown.tasks.length > 0" class="flex flex-col gap-2">
        <li
          v-for="task in analyticsStore.drillDown.tasks"
          :key="task.id"
          class="cursor-pointer rounded-lg border border-zinc-200 p-3 transition hover:border-emerald-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-emerald-500 dark:hover:bg-zinc-900"
          role="button"
          tabindex="0"
          @click="openTask(task)"
          @keydown.enter="openTask(task)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span
                  v-if="task.priorityId"
                  class="text-xs font-medium"
                  :class="priorityColor[task.priorityId]"
                >
                  {{ priorityLabel[task.priorityId] }}
                </span>
                <span class="truncate text-sm font-medium">
                  {{ task.description || t('analytics.drillDown.noTaskTitle') }}
                </span>
              </div>
              <div class="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                <span>{{ task.goalName }}</span>
                <span v-if="task.endDate">{{ t('analytics.drillDown.due') }} {{ fmtDate(task.endDate) }}</span>
                <span>{{ t('analytics.drillDown.created') }} {{ fmtDate(task.date_creation) }}</span>
                <span v-if="task.complete" class="text-emerald-600 dark:text-emerald-400">
                  {{ t('analytics.drillDown.closed') }} {{ fmtDate(task.date_complete) }}
                </span>
              </div>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-zinc-400" />
          </div>
        </li>
      </ul>
    </template>
  </USlideover>
</template>
<script setup lang="ts">
import { ALL_TASKS_LIST_ID, type AnalyticsDrillDownTask } from 'taskview-api'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useTaskView } from '@/composables/useTaskView'
import { useAnalyticsStore } from '@/stores/analytics.store'

const analyticsStore = useAnalyticsStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { isMobile } = useTaskView()

const open = computed({
  get: () => analyticsStore.drillDown.open,
  set: (v) => {
    if (!v) analyticsStore.closeDrillDown()
    else analyticsStore.drillDown.open = true
  },
})

const drillDownErrorMessage = computed(() => {
  const e = analyticsStore.drillDown.error
  if (!e) return null
  return t(`analytics.errors.${e.kind}`)
})

const priorityLabel: Record<number, string> = {
  1: t('analytics.priorities.low'),
  2: t('analytics.priorities.medium'),
  3: t('analytics.priorities.high'),
}

const priorityColor: Record<number, string> = {
  1: 'text-blue-500',
  2: 'text-amber-500',
  3: 'text-red-500',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}

function openTask(task: AnalyticsDrillDownTask) {
  analyticsStore.closeDrillDown()
  router.push({
    name: 'user',
    params: {
      orgSlug: route.params.orgSlug,
      projectId: task.goalId,
      listId: ALL_TASKS_LIST_ID,
      taskId: task.id,
    },
  })
}
</script>


