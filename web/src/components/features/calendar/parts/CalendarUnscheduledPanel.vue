<template>
  <aside
    class="group/panel relative flex w-72 shrink-0 flex-col overflow-hidden rounded-14 border border-default bg-elevated/40"
    :aria-label="t('calendar.unscheduled.title')"
    data-testid="calendar-unscheduled"
  >
    <div class="flex items-center gap-2 px-3 pt-3">
      <h3 class="text-sm font-semibold text-highlighted">
        {{ t('calendar.unscheduled.title') }}
      </h3>
      <CalendarUnscheduledFilters class="ml-auto" />
      <UButton
        icon="i-lucide-panel-right-close"
        color="neutral"
        variant="ghost"
        size="sm"
        square
        :aria-label="t('calendar.unscheduled.hide')"
        @click="emit('close')"
      />
    </div>

    <p
      v-if="canEditTaskDeadline && tasks.length"
      class="px-3 pt-0.5 text-xs text-muted"
    >
      {{ t('calendar.unscheduled.hint') }}
    </p>

    <UInput
      v-model="calendarStore.unscheduledSearch"
      icon="i-lucide-search"
      :placeholder="t('calendar.unscheduled.search')"
      size="sm"
      class="mx-3 mt-2.5"
      data-testid="calendar-unscheduled-search"
    />

    <ul
      ref="list"
      class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-3"
    >
      <template v-if="calendarStore.unscheduledLoading && !tasks.length">
        <li
          v-for="n in 4"
          :key="n"
        >
          <USkeleton class="h-12 rounded-10" />
        </li>
      </template>
      <li
        v-for="task in tasks"
        :key="task.id"
        :data-task-id="task.id"
        class="list-none"
        :class="canEditTaskDeadline ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'"
        @click="openTask(task.id)"
      >
        <CalendarTaskCard :task="task" />
      </li>
      <li
        v-if="calendarStore.unscheduledLoading && tasks.length"
        class="flex list-none justify-center py-2"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-4 animate-spin text-muted"
        />
      </li>
    </ul>

    <CalendarUnscheduledEmpty
      v-if="!calendarStore.unscheduledLoading && !tasks.length"
      :searching="narrowed"
      class="absolute inset-x-3 top-24"
    />

    <div
      v-if="dropTarget"
      class="absolute inset-1.5 flex flex-col items-center justify-center gap-2 rounded-10 border-2 border-dashed border-primary/50 bg-default/90 p-4 text-center backdrop-blur-sm transition-colors group-hover/panel:border-primary group-hover/panel:bg-primary/10"
      data-testid="calendar-unscheduled-drop"
    >
      <UIcon
        name="i-lucide-calendar-x-2"
        class="size-7 text-primary"
      />
      <p class="text-sm font-medium text-highlighted">
        {{ t('calendar.unscheduled.dropTitle') }}
      </p>
      <p class="text-xs text-muted">
        {{ t('calendar.unscheduled.dropDescription') }}
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Draggable } from '@fullcalendar/vue3/interaction'
import CalendarTaskCard from '../CalendarTaskCard.vue'
import CalendarUnscheduledEmpty from './CalendarUnscheduledEmpty.vue'
import CalendarUnscheduledFilters from './CalendarUnscheduledFilters.vue'
import { useCalendarStore } from '@/stores/calendar.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'
import { useCalendarUnscheduledScroll, useCalendarUnscheduledTasks } from '@/composables/useCalendarUnscheduled'
import { useCalendarSlotMinutes } from '@/composables/useCalendarDragStep'

defineProps<{
  // A task is being dragged on the calendar: the panel takes it to clear its dates
  dropTarget?: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const calendarStore = useCalendarStore()
const { canEditTaskDeadline } = useGoalPermissions()
const { openTask } = useTaskDetailPanel()
const { tasks, narrowed } = useCalendarUnscheduledTasks()
const slotMinutes = useCalendarSlotMinutes()

const list = useTemplateRef<HTMLElement>('list')
let draggable: Draggable | null = null

useCalendarUnscheduledScroll(list)

// The calendar renders the dragged copy with CalendarTaskCard, so the event carries the task like its own events do
function eventData(el: HTMLElement) {
  const task = calendarStore.findTask(Number(el.dataset.taskId))
  return {
    title: task?.description ?? '',
    create: false,
    duration: { minutes: slotMinutes.value },
    extendedProps: { task, shape: 'range' },
  }
}

watch([list, canEditTaskDeadline], ([el, canEdit]) => {
  draggable?.destroy()
  draggable = el && canEdit
    ? new Draggable(el, { itemSelector: '[data-task-id]', eventData, minDistance: 5, longPressDelay: 300 })
    : null
}, { immediate: true })

onBeforeUnmount(() => draggable?.destroy())
</script>
