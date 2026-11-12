<template>
  <UModal
    v-model:open="isOpen"
    :title="title"
    :description="loading && !items.length ? undefined : t('projectDashboard.tasks.total', { count: total })"
    :fullscreen="isMobile"
  >
    <template #body>
      <div
        class="flex flex-col gap-3"
        data-testid="project-dashboard-bucket"
      >
        <ul
          v-if="items.length"
          class="flex flex-col gap-2"
        >
          <li
            v-for="item in items"
            :key="item.taskId"
          >
            <ProjectDashboardTaskRow
              :item="item"
              :due-today="isToday"
              :show-project="showProject"
              :reserve-assignee="hasAssignees"
              :data-testid="`project-dashboard-bucket-task-${item.taskId}`"
              @click="open(item.taskId)"
            />
          </li>
        </ul>
        <div
          v-else-if="loading"
          class="flex flex-col gap-3"
          data-testid="project-dashboard-bucket-loading"
        >
          <USkeleton
            v-for="index in 4"
            :key="index"
            class="h-9 w-full"
          />
        </div>
        <p
          v-else-if="!failed"
          class="py-6 text-center text-sm text-muted"
          data-testid="project-dashboard-bucket-empty"
        >
          {{ t('projectDashboard.tasks.empty') }}
        </p>
        <UAlert
          v-if="failed"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="t('projectDashboard.error.title')"
          :actions="[{ label: t('projectDashboard.error.retry'), color: 'neutral', variant: 'outline', onClick: () => emit('more') }]"
          data-testid="project-dashboard-bucket-error"
        />
        <div
          v-else-if="items.length && items.length < total"
          class="flex items-center justify-between gap-3"
        >
          <span class="text-xs text-muted tabular-nums">{{ t('projectDashboard.attention.shown', { shown: items.length, total }) }}</span>
          <UButton
            :label="t('projectDashboard.tasks.more')"
            color="neutral"
            variant="outline"
            size="sm"
            :loading="loading"
            data-testid="project-dashboard-bucket-more"
            @click="emit('more')"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { addDays, format } from 'date-fns'
import { useI18n } from 'vue-i18n'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'
import { useTaskView } from '@/composables/useTaskView'
import type { ProjectDashboardBucket, ProjectDashboardBucketTask } from '@/types/project-dashboard.types'
import ProjectDashboardTaskRow from './ProjectDashboardTaskRow.vue'

const WEEK_LAST_DAY_OFFSET = 6

const isOpen = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  selection: ProjectDashboardBucket | null
  items: ProjectDashboardBucketTask[]
  // All tasks of the column, not only the ones shown so far
  total: number
  loading?: boolean
  failed?: boolean
  showProject?: boolean
}>()

const emit = defineEmits<{
  // The next page, or the same one again after a failure
  more: []
}>()

const { t, locale } = useI18n()
const { isMobile } = useTaskView()
const { openTask } = useTaskDetailPanel()

const dayFormat = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }))
const rangeFormat = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }))

const firstDay = computed(() => (props.selection?.date ? new Date(`${props.selection.date}T00:00:00`) : null))

const title = computed(() => {
  if (!props.selection || props.selection.kind === 'overdue' || !firstDay.value) return t('projectDashboard.runway.pastDue')
  if (props.selection.kind === 'day') return t('projectDashboard.tasks.dueOn', { date: dayFormat.value.format(firstDay.value) })
  return t('projectDashboard.tasks.completedIn', {
    range: `${rangeFormat.value.format(firstDay.value)} – ${rangeFormat.value.format(addDays(firstDay.value, WEEK_LAST_DAY_OFFSET))}`,
  })
})

const isToday = computed(() => props.selection?.kind === 'day' && props.selection.date === format(new Date(), 'yyyy-MM-dd'))
const hasAssignees = computed(() => props.items.some((item) => item.assigneeEmail))

// The task opens in its own panel, in place of the list
function open(taskId: number) {
  isOpen.value = false
  void openTask(taskId)
}
</script>
