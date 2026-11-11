<template>
  <div
    ref="card"
    class="tv-calendar-card group relative flex w-full min-w-0 gap-1.5 rounded-10 border px-1.5 text-default"
    :class="[
      short ? 'items-center py-0 text-xs' : 'items-start py-1 text-sm',
      // A tall event: the checkbox and the time on top, the title wrapping below for as many lines as the height allows
      { 'flex-wrap content-start gap-y-0.5': tall || showProject },
      { 'opacity-60': task.complete && !lifted, 'pr-3': resizable, 'shadow-lg': lifted, 'h-full overflow-hidden': fill },
    ]"
    :style="{ backgroundColor: tint.backgroundColor, borderColor: tint.borderColor }"
    :data-testid="`calendar-task-${task.id}`"
  >
    <CalendarTaskCompleteCheckbox
      v-if="canComplete && !lifted && !tall"
      :complete="!!task.complete"
      :class="{ 'h-lh': !short }"
      @toggle="emit('toggleComplete', $event)"
    />

    <UAvatarGroup
      v-if="assignees.length"
      size="3xs"
      :max="2"
      class="shrink-0"
      :class="{ 'mt-px': tall, 'h-lh items-center': !short && !tall }"
    >
      <UAvatar
        v-for="email in assignees"
        :key="email"
        :alt="email"
        :title="email"
        :text="email.slice(0, 2).toUpperCase()"
      />
    </UAvatarGroup>

    <!-- One line: the whole time range always shows, the title takes what is left and truncates -->
    <span
      v-if="short"
      class="flex min-w-0 flex-1 items-center gap-x-1.5 leading-snug"
      :title="cardTitle"
    >
      <span
        v-if="timeText"
        class="shrink-0 text-muted tabular-nums"
      >{{ timeText }}</span>
      <span
        class="min-w-0 truncate"
        :class="{ 'line-through text-muted': task.complete }"
      >{{ task.description }}</span>
    </span>

    <template v-else>
      <span
        v-if="timeText && !tall"
        class="mt-px shrink-0 text-xs text-muted tabular-nums"
      >{{ timeText }}</span>
      <span
        ref="title"
        class="min-w-0 leading-snug"
        :class="[
          tall ? 'line-clamp-1 basis-full break-words hyphens-auto' : ['flex-1', compact ? 'truncate' : 'line-clamp-2 break-words'],
          { 'line-through text-muted': task.complete },
        ]"
        :style="titleLines ? { WebkitLineClamp: titleLines } : undefined"
        :lang="locale"
        :title="cardTitle"
      >{{ task.description }}</span>
    </template>

    <span
      v-if="canViewTaskSubtasks && task.subtasks.length"
      class="flex shrink-0 items-center gap-0.5 text-xs text-muted tabular-nums"
      :class="{ 'mt-px': !short }"
      :title="t('calendar.subtasks', { count: task.subtasks.length })"
    >
      <UIcon
        name="i-lucide-list-tree"
        class="size-3.5"
      />
      {{ task.subtasks.length }}
    </span>

    <CalendarTaskCardAmount
      v-if="amount"
      :amount="amount"
      :transaction-type="task.transactionType"
      :class="{ 'mt-px': !short }"
    />

    <CalendarTaskCardTimeRow
      v-if="tall && (timeRange || (canComplete && !lifted))"
      :complete="!!task.complete"
      :can-complete="Boolean(canComplete && !lifted)"
      :time-range="timeRange"
      @toggle="emit('toggleComplete', $event)"
    />

    <span
      v-if="showProject"
      class="flex min-w-0 basis-full items-center gap-1 text-xs text-muted"
      data-testid="calendar-task-project"
    >
      <UIcon
        name="i-lucide-folder"
        class="size-3 shrink-0"
        :style="color ? { color } : undefined"
      />
      <span class="truncate">{{ projectName }}</span>
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
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaskItem } from '@/types/tasks.types'
import { useCollaborationStore } from '@/stores/collaboration.store'
import { useGoalPermissionsFor } from '@/composables/useGoalPermissions'
import { useGoalsStore } from '@/stores/goals.store'
import { useCalendarCardTitleLines } from '@/composables/useCalendarCardTitleLines'
import { useCalendarTaskColor } from '@/composables/useCalendarTaskColor'
import CalendarTaskCompleteCheckbox from './parts/CalendarTaskCompleteCheckbox.vue'
import CalendarTaskCardTimeRow from './parts/CalendarTaskCardTimeRow.vue'
import CalendarTaskCardAmount from './parts/CalendarTaskCardAmount.vue'
import type { CalendarTimeRange } from '@/types/calendar.types'

const props = defineProps<{
  task: TaskItem
  timeText?: string
  // Month cells fit a single line; the week columns have room for two
  compact?: boolean
  // Its end can be dragged to change the duration: show a grip on hover
  resizable?: boolean
  // The copy that follows the pointer while dragging
  lifted?: boolean
  // In the hours view the card fills the event, so its height shows the duration
  fill?: boolean
  // An event too low for two lines: one line, centered, in a smaller font
  short?: boolean
  // Tint instead of the priority color, e.g. the project's color when tasks of several projects mix
  color?: string
  // The task's project, shown under the title when tasks of several projects mix
  projectName?: string
  // A checkbox marks the task done or reopens it without opening the task
  canComplete?: boolean
  // When a timed event starts and ends: a tall card shows it above the title
  timeRange?: CalendarTimeRange
}>()

const emit = defineEmits<{
  toggleComplete: [complete: boolean]
}>()

const { t, locale } = useI18n()
const collaborationStore = useCollaborationStore()
// The task's own project decides what is shown: the main screen calendar mixes projects
const goalsStore = useGoalsStore()
const goal = computed(() => goalsStore.goalMap.get(props.task.goalId) ?? null)
const { canViewAssignedUsersToTask, canViewTaskSubtasks } = useGoalPermissionsFor(goal)
const { taskColor } = useCalendarTaskColor()

const tint = computed(() => {
  const base = props.color ?? taskColor(props.task)
  return {
    backgroundColor: `color-mix(in oklab, ${base} 16%, var(--ui-bg))`,
    borderColor: `color-mix(in oklab, ${base} 30%, transparent)`,
  }
})

const tall = computed(() => Boolean(props.fill && !props.short))
// Only where the card has room for a second line
const showProject = computed(() => Boolean(props.projectName && !props.short && !tall.value && !props.compact))
const titleLines = useCalendarCardTitleLines({
  card: useTemplateRef<HTMLElement>('card'),
  title: useTemplateRef<HTMLElement>('title'),
  enabled: tall,
})

const amount = computed(() => Number(props.task.amount) || 0)

const cardTitle = computed(() => (props.timeText ? `${props.timeText} ${props.task.description}` : props.task.description))

const assignees = computed(() => {
  if (!canViewAssignedUsersToTask.value) return []
  return props.task.assignedUsers
    .map((id) => collaborationStore.userMap.get(id)?.email)
    .filter((email): email is string => !!email)
})
</script>
