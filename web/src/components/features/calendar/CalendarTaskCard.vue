<template>
  <div
    ref="card"
    class="tv-calendar-card group @container relative flex w-full min-w-0 gap-1.5 rounded-10 border px-1.5 text-default"
    :class="[
      short ? 'items-center py-0 text-xs' : 'items-start py-1 text-sm',
      // Everywhere the same order: the checkbox, the title, the time, the assignees.
      // A tall event and a week card wrap the title and put the time and the assignees on a line under it
      { 'flex-wrap content-start gap-y-0.5': showProject || metaBelow },
      { 'opacity-60': task.complete && !lifted, 'pr-3': resizable, 'shadow-lg': lifted, 'h-full overflow-hidden': fill },
    ]"
    :style="{ backgroundColor: tint.backgroundColor, borderColor: tint.borderColor }"
    :data-testid="`calendar-task-${task.id}`"
  >
    <CalendarTaskCompleteCheckbox
      v-if="hasCheckbox"
      :complete="!!task.complete"
      :class="{ 'h-lh': !short }"
      @toggle="emit('toggleComplete', $event)"
    />

    <CalendarTaskCardAssignees
      v-if="assignees.length"
      :emails="assignees"
      class="order-3"
      :class="{ 'h-lh items-center': !short }"
    />

    <!-- One line: the title truncates, the time range follows it where the card is wide enough for both -->
    <span
      v-if="short"
      class="flex min-w-0 flex-1 items-center gap-x-1.5 leading-snug"
      :title="cardTitle"
    >
      <span
        class="min-w-0 flex-1 truncate"
        :class="{ 'line-through text-muted': task.complete }"
      >{{ task.description }}</span>
      <CalendarTaskCardTime
        v-if="timeRange"
        :time-range="timeRange"
        inline
      />
    </span>

    <template v-else>
      <span
        ref="title"
        class="min-w-0 flex-1 leading-snug"
        :class="[
          titleClass,
          { 'line-through text-muted': task.complete },
        ]"
        :style="titleLines ? { WebkitLineClamp: titleLines } : undefined"
        :lang="locale"
        :title="cardTitle"
      >{{ task.description }}</span>
      <!-- Ends the title's line, so what follows starts a new one -->
      <span
        v-if="metaBelow"
        class="order-1 basis-full"
        aria-hidden="true"
      />
      <!-- A month cell is for the title: the time is in the tooltip and in the other views -->
      <CalendarTaskCardTime
        v-if="timeRange && (metaBelow || !compact)"
        :time-range="timeRange"
        :inline="!metaBelow"
        class="order-2 mt-px text-xs"
      />
    </template>

    <span
      v-if="canViewTaskSubtasks && task.subtasks.length"
      class="order-4 flex shrink-0 items-center gap-0.5 text-xs text-muted tabular-nums"
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
      v-show="showAmount"
      :amount="amount"
      :transaction-type="task.transactionType"
      class="order-4"
      :class="{ 'mt-px': !short }"
    />

    <span
      v-if="showProject"
      class="order-5 flex min-w-0 basis-full items-center gap-1 text-xs text-muted"
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
import { useCalendarTimeText } from '@/composables/useCalendarTimeText'
import CalendarTaskCompleteCheckbox from './parts/CalendarTaskCompleteCheckbox.vue'
import CalendarTaskCardTime from './parts/CalendarTaskCardTime.vue'
import CalendarTaskCardAmount from './parts/CalendarTaskCardAmount.vue'
import CalendarTaskCardAssignees from './parts/CalendarTaskCardAssignees.vue'
import type { CalendarTimeRange } from '@/types/calendar.types'

const props = defineProps<{
  task: TaskItem
  // Month cells fit a single line; the week columns have room for two
  compact?: boolean
  // A narrow week column: the title wraps next to the checkbox, the time and the assignees go on a line under it
  stacked?: boolean
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
  // When a timed event starts and ends
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
const { timeText } = useCalendarTimeText()

const tint = computed(() => {
  const base = props.color ?? taskColor(props.task)
  return {
    backgroundColor: `color-mix(in oklab, ${base} 16%, var(--ui-bg))`,
    borderColor: `color-mix(in oklab, ${base} 30%, transparent)`,
  }
})

// The line under a tall card's title: 16px and the gap above it
const META_LINE_HEIGHT = 18

const tall = computed(() => Boolean(props.fill && !props.short))
const hasCheckbox = computed(() => Boolean(props.canComplete && !props.lifted))
// A week card and a tall event wrap the title, so the time and the assignees take a line under it
const metaBelow = computed(() => Boolean((props.stacked || tall.value) && !props.short))
const titleClass = computed(() => {
  if (tall.value) return 'line-clamp-1 break-words hyphens-auto'
  if (metaBelow.value) return 'line-clamp-3 break-words hyphens-auto'
  return props.compact ? 'truncate' : 'line-clamp-2 break-words'
})
// Only where the card has room for a second line
const showProject = computed(() => Boolean(props.projectName && !props.short && !tall.value && !props.compact))
const titleLines = useCalendarCardTitleLines({
  card: useTemplateRef<HTMLElement>('card'),
  title: useTemplateRef<HTMLElement>('title'),
  enabled: tall,
  reserve: computed(() => (props.timeRange || assignees.value.length ? META_LINE_HEIGHT : 0)),
})

const amount = computed(() => Number(props.task.amount) || 0)
const showAmount = false

const cardTitle = computed(() => (props.timeRange ? `${timeText(props.timeRange).range} ${props.task.description}` : props.task.description))

const assignees = computed(() => {
  if (!canViewAssignedUsersToTask.value) return []
  return props.task.assignedUsers
    .map((id) => collaborationStore.userMap.get(id)?.email)
    .filter((email): email is string => !!email)
})
</script>
