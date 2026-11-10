<template>
  <TaskCalendar
    ref="calendar"
    :tasks="tasks"
    :loading="calendarStore.loading"
    :can-create="canCreate"
    :can-edit-task="() => canEditTaskDeadline"
    :hide-weekends="filters.hideWeekends.value"
    :collapse-empty-weekends="!canEditTaskDeadline"
    :droppable="canEditTaskDeadline"
    :save-dates="saveDates"
    :can-complete-task="() => canEditTaskStatus"
    :save-complete="saveComplete"
    :side-open="panelShown"
    @range="loadRange"
    @add="openAdd"
    @drop="onDrop"
    @drag-start="onEventDragStart"
    @drag-stop="onEventDragStop"
  >
    <template #actions>
      <UButton
        icon="i-lucide-inbox"
        :color="panelShown ? 'primary' : 'neutral'"
        :variant="panelShown ? 'soft' : 'ghost'"
        :size="isMobile ? 'md' : 'lg'"
        class="shrink-0"
        square
        :aria-label="t('calendar.unscheduled.toggle')"
        :title="t('calendar.unscheduled.toggle')"
        :aria-pressed="panelShown"
        data-testid="calendar-unscheduled-toggle"
        @click="toggleUnscheduled"
      />
    </template>

    <template #side>
      <CalendarUnscheduledPanel
        ref="panel"
        :drop-target="draggingFromCalendar"
        @close="panelOpen = false"
      />
    </template>
  </TaskCalendar>

  <CalendarAddTaskDialog
    v-model:open="addOpen"
    :span="addSpan"
    :goal-id="goalId"
  />
  <CalendarUnscheduledDrawer
    v-if="isMobile"
    v-model:open="drawerOpen"
  />
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { addDays, format } from 'date-fns'
import { useI18n } from 'vue-i18n'
import type { TaskArgUpdate } from 'taskview-api'
import TaskCalendar from './TaskCalendar.vue'
import CalendarAddTaskDialog from './CalendarAddTaskDialog.vue'
import CalendarUnscheduledPanel from './parts/CalendarUnscheduledPanel.vue'
import CalendarUnscheduledDrawer from './parts/CalendarUnscheduledDrawer.vue'
import type { TaskCalendarRange, TaskCompleteArgs } from './TaskCalendar.types'
import { useCalendarStore } from '@/stores/calendar.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useTaskView } from '@/composables/useTaskView'
import { useCalendarFilters, useCalendarUnscheduledPanel } from '@/composables/useCalendarRouteState'
import type { CalendarSpan } from '@/helpers/taskCalendarDates'
import { useCalendarUnscheduledDrop, useCalendarUnscheduledLoader } from '@/composables/useCalendarUnscheduled'

const props = defineProps<{ goalId: number }>()

const DAY_FORMAT = 'yyyy-MM-dd'

const { t } = useI18n()
const calendarStore = useCalendarStore()
const { isMobile } = useTaskView()
const { canEditTaskDeadline, canAddTask, canEditTaskStatus } = useGoalPermissions()
// A task created on a day gets that date, so it takes both permissions
const canCreate = computed(() => canAddTask.value && canEditTaskDeadline.value)
const filters = useCalendarFilters()

const tasks = computed(() => calendarStore.tasks.filter(filters.matches))

// Tasks without dates wait in a panel beside the calendar (a drawer on phones) to be dragged onto a day
const panelOpen = useCalendarUnscheduledPanel()
const drawerOpen = ref(false)
const panelShown = computed(() => !isMobile.value && panelOpen.value)
const panelRef = useTemplateRef<InstanceType<typeof CalendarUnscheduledPanel>>('panel')
const { draggingFromCalendar, onDrop, onEventDragStart, onEventDragStop } = useCalendarUnscheduledDrop({ panel: () => panelRef.value?.$el })

function toggleUnscheduled() {
  if (isMobile.value) drawerOpen.value = true
  else panelOpen.value = !panelOpen.value
}

useCalendarUnscheduledLoader(() => props.goalId)

// Load the visible period only, one day wider on each side: a task with a time is stored in UTC
// and can fall on a neighbouring local day. The range end is exclusive, so it already adds a day.
const range = ref<TaskCalendarRange>()

function loadRange(value: TaskCalendarRange) {
  range.value = value
}

function loadTasks() {
  if (!range.value) return
  calendarStore.fetchTasks(props.goalId, { from: format(addDays(range.value.start, -1), DAY_FORMAT), to: format(range.value.end, DAY_FORMAT) })
}

watch([() => props.goalId, range], loadTasks)

async function saveDates(patch: TaskArgUpdate): Promise<boolean> {
  return Boolean(await calendarStore.updateTask(patch))
}

// Completing a repeating task makes its next occurrence on the server: load it into the calendar
async function saveComplete({ task, complete }: TaskCompleteArgs): Promise<boolean> {
  const saved = await calendarStore.updateTask({ id: task.id, complete })
  if (saved && complete && task.recurrenceRuleId) loadTasks()
  return Boolean(saved)
}

const calendarRef = useTemplateRef<InstanceType<typeof TaskCalendar>>('calendar')
const addOpen = ref(false)
const addSpan = ref<CalendarSpan | null>(null)

function openAdd(span: CalendarSpan) {
  addSpan.value = span
  addOpen.value = true
}

watch(addOpen, (isOpen) => {
  if (!isOpen) calendarRef.value?.unselect()
})
</script>
