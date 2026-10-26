<template>
  <div
    v-if="dot"
    class="h-1.5 w-full rounded-full"
    :class="{ 'opacity-40': task.complete }"
    :style="{ backgroundColor: tint.solidColor }"
    :title="task.description"
    :data-testid="`calendar-task-${task.id}`"
  />
  <div
    v-else
    class="tv-calendar-card group relative flex w-full min-w-0 items-start gap-1.5 rounded-10 border px-1.5 py-1 text-sm text-default"
    :class="{ 'opacity-60': task.complete && !lifted, 'pr-3': resizable, 'shadow-lg': lifted }"
    :style="{ backgroundColor: tint.backgroundColor, borderColor: tint.borderColor }"
    :data-testid="`calendar-task-${task.id}`"
  >
    <UAvatarGroup
      v-if="assignees.length"
      size="3xs"
      :max="2"
      class="mt-px shrink-0"
    >
      <UAvatar
        v-for="email in assignees"
        :key="email"
        :alt="email"
        :title="email"
        :text="email.slice(0, 2).toUpperCase()"
      />
    </UAvatarGroup>

    <span
      v-if="timeText"
      class="mt-px shrink-0 text-xs text-muted tabular-nums"
    >{{ timeText }}</span>

    <span
      class="min-w-0 flex-1 leading-snug"
      :class="[compact ? 'truncate' : 'line-clamp-2 break-words', { 'line-through text-muted': task.complete }]"
      :title="task.description"
    >{{ task.description }}</span>

    <span
      v-if="canViewTaskSubtasks && task.subtasks.length"
      class="mt-px flex shrink-0 items-center gap-0.5 text-xs text-muted tabular-nums"
      :title="t('calendar.subtasks', { count: task.subtasks.length })"
    >
      <UIcon
        name="i-lucide-list-tree"
        class="size-3.5"
      />
      {{ task.subtasks.length }}
    </span>

    <!-- Only a hint: FullCalendar's own resize handle sits on top of it and takes the pointer -->
    <span
      v-if="resizable"
      class="pointer-events-none absolute inset-y-1.5 right-1 w-1 rounded-full bg-current opacity-0 transition-opacity group-hover:opacity-40"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaskItem } from '@/types/tasks.types'
import { useCollaborationStore } from '@/stores/collaboration.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

const props = defineProps<{
  task: TaskItem
  timeText?: string
  // Month cells fit a single line; the week columns have room for two
  compact?: boolean
  // Phone-width month: cells are too narrow for text, show a priority-colored bar
  dot?: boolean
  // Its end can be dragged to change the duration: show a grip on hover
  resizable?: boolean
  // The copy that follows the pointer while dragging
  lifted?: boolean
}>()

const { t } = useI18n()
const collaborationStore = useCollaborationStore()
const { canViewTaskPriority, canViewAssignedUsersToTask, canViewTaskSubtasks } = useGoalPermissions()

// Same mapping as the priority dot in TaskItem: 3 high, 2 medium, 1 low
const PRIORITY_COLORS: Record<number, string> = {
  3: 'var(--ui-error)',
  2: 'var(--ui-warning)',
  1: 'var(--ui-success)',
}

const tint = computed(() => {
  const color = canViewTaskPriority.value ? PRIORITY_COLORS[props.task.priorityId] : undefined
  const base = color ?? 'var(--ui-text-muted)'
  return {
    backgroundColor: `color-mix(in oklab, ${base} 16%, var(--ui-bg))`,
    borderColor: `color-mix(in oklab, ${base} 30%, transparent)`,
    solidColor: base,
  }
})

const assignees = computed(() => {
  if (!canViewAssignedUsersToTask.value) return []
  return props.task.assignedUsers
    .map((id) => collaborationStore.userMap.get(id)?.email)
    .filter((email): email is string => !!email)
})
</script>
