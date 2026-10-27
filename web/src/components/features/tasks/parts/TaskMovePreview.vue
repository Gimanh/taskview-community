<template>
  <div
    class="flex flex-col gap-3"
    data-testid="task-move-preview"
  >
    <UAlert
      v-if="!preview.allowed"
      color="error"
      variant="soft"
      icon="i-lucide-ban"
      :title="t(`tasks.move.reasons.${preview.reason}`)"
      data-testid="task-move-blocked"
    />

    <template v-else>
      <UAlert
        v-if="preview.mode === 'copy'"
        color="warning"
        variant="soft"
        icon="i-lucide-copy"
        :title="t('tasks.move.copyNotice')"
        :description="t('tasks.move.copyTime')"
        data-testid="task-move-copy-notice"
      />

      <TaskMovePreviewSection
        :title="preview.mode === 'copy' ? t('tasks.move.copying') : t('tasks.move.moving')"
        icon="i-lucide-arrow-right-left"
        :items="moving"
      />
      <TaskMovePreviewSection
        :title="t('tasks.move.removed')"
        :hint="t('tasks.move.removedHint')"
        icon="i-lucide-unlink"
        :items="removed"
        data-testid="task-move-removed"
      />
      <TaskMovePreviewSection
        :title="t('tasks.move.leftBehind')"
        icon="i-lucide-lock"
        :items="leftBehind"
        data-testid="task-move-left-behind"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaskMoveRemovals, TaskResponseMovePreview } from 'taskview-api'
import TaskMovePreviewSection from './TaskMovePreviewSection.vue'

const props = defineProps<{
  preview: TaskResponseMovePreview
}>()

const { t } = useI18n()

const REMOVAL_KEYS: (keyof TaskMoveRemovals)[] = [
  'tags',
  'assignees',
  'fileLinks',
  'dependencies',
  'sprintOutcomes',
  'integrationLinks',
  'recurrence',
]

const moving = computed(() => {
  const items = [t('tasks.move.movingTask')]
  const subtasks = props.preview.tasks - 1
  if (subtasks > 0) items.push(t('tasks.move.movingSubtasks', { count: subtasks }))
  if (props.preview.timeEntries > 0) items.push(t('tasks.move.movingTime', { count: props.preview.timeEntries }))
  return items
})

const removed = computed(() =>
  REMOVAL_KEYS.filter((key) => (props.preview.removals?.[key] ?? 0) > 0).map((key) =>
    t(`tasks.move.removals.${key}`, { count: props.preview.removals?.[key] ?? 0 }),
  ),
)

const leftBehind = computed(() => {
  const items: string[] = []
  const behind = props.preview.leftBehind
  if (behind && behind.subtasks > 0) items.push(t('tasks.move.leftBehindSubtasks', { count: behind.subtasks }))
  if (behind && behind.timeEntries > 0) items.push(t('tasks.move.leftBehindTime', { count: behind.timeEntries }))
  return items
})
</script>
