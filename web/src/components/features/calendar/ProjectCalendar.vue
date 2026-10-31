<template>
  <div
    class="tv-calendar flex h-full min-h-0 flex-col gap-3"
    :class="showAddHint && ['tv-calendar-addable', `tv-calendar-add-${view}`]"
    :style="showAddHint ? { '--tv-calendar-add-label': addHintLabel } : undefined"
  >
    <CalendarToolbar
      v-model:view="view"
      :title="title"
      :compact="isMobile"
      @today="api()?.today()"
      @prev="api()?.prev()"
      @next="api()?.next()"
    />

    <div
      class="relative min-h-0 flex-1"
      :class="{ 'overflow-x-auto': scrollWeek }"
    >
      <!-- FullCalendar owns its root element's classes; a class bound there is wiped on every re-render -->
      <div
        class="h-full"
        :class="{ 'min-w-240': scrollWeek }"
      >
        <FullCalendar
          ref="calendarRef"
          :options="calendarOptions"
        >
          <template #dayHeaderContent="arg">
            <div
              v-if="arg.view.type === FC_VIEWS.week || arg.view.type === FC_VIEWS.hours"
              class="flex flex-col items-start gap-0.5 px-1 py-1.5"
            >
              <span class="text-xs font-normal text-muted">{{ arg.weekdayText }}</span>
              <span
                class="rounded-10 px-1.5 text-2xl leading-9 font-semibold tabular-nums"
                :class="arg.isToday ? 'bg-primary text-inverted' : 'text-highlighted'"
              >{{ arg.dayNumberText }}</span>
            </div>
            <span
              v-else
              class="text-xs font-normal text-muted"
            >{{ arg.text }}</span>
          </template>

          <template #dayCellTopContent="arg">
            <span
              class="inline-flex min-w-6 justify-center rounded-md px-1 text-xs tabular-nums"
              :class="arg.isToday ? 'bg-primary font-semibold text-inverted' : 'text-muted'"
            >{{ arg.dayNumberText }}</span>
          </template>

          <template #eventContent="arg">
            <CalendarTaskCard
              :task="arg.event.extendedProps.task"
              :time-text="arg.event.allDay ? undefined : arg.timeText"
              :compact="arg.view.type !== FC_VIEWS.week"
              :dot="isMobile && arg.view.type === FC_VIEWS.month"
              :resizable="arg.isEndResizable"
              :lifted="arg.isMirror"
              :fill="arg.view.type === FC_VIEWS.hours"
            />
          </template>
        </FullCalendar>
      </div>

      <div
        v-if="showEmptyState"
        class="pointer-events-none absolute inset-0 flex items-center justify-center p-6"
        data-testid="calendar-empty"
      >
        <div class="max-w-xs rounded-14 border border-default bg-elevated/90 p-4 text-center backdrop-blur-sm">
          <UIcon
            name="i-lucide-calendar-days"
            class="mb-2 size-6 text-muted"
          />
          <p class="text-sm font-medium text-highlighted">
            {{ t('calendar.empty.title') }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ t(canCreate ? 'calendar.empty.descriptionCanAdd' : 'calendar.empty.description') }}
          </p>
        </div>
      </div>
    </div>

    <CalendarAddTaskDialog
      v-model:open="addOpen"
      :span="addSpan"
      :goal-id="goalId"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { addDays, addMinutes, differenceInMinutes, eachDayOfInterval, format, getDay, isWeekend } from 'date-fns'
import { useI18n } from 'vue-i18n'
import FullCalendar from '@fullcalendar/vue3'
import type { CalendarOptions, DateSelectInfo, DatesSetInfo, EventChangeInfo, EventClickInfo, EventDropInfo, EventResizeDoneInfo } from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/vue3/daygrid'
import interactionPlugin from '@fullcalendar/vue3/interaction'
import timeGridPlugin from '@fullcalendar/vue3/timegrid'
import listPlugin from '@fullcalendar/vue3/list'
import classicThemePlugin from '@fullcalendar/vue3/themes/classic'
import deLocale from '@fullcalendar/vue3/locales/de'
import esLocale from '@fullcalendar/vue3/locales/es'
import ptBrLocale from '@fullcalendar/vue3/locales/pt-br'
import ruLocale from '@fullcalendar/vue3/locales/ru'
import '@fullcalendar/vue3/skeleton.css'
import '@fullcalendar/vue3/themes/classic/theme.css'
import '@/assets/css/calendar.css'
import CalendarToolbar from './CalendarToolbar.vue'
import CalendarTaskCard from './CalendarTaskCard.vue'
import CalendarAddTaskDialog from './CalendarAddTaskDialog.vue'
import { useCalendarStore } from '@/stores/calendar.store'
import type { TaskItem } from '@/types/tasks.types'
import type { TaskArgUpdate } from 'taskview-api'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'
import { useTaskView } from '@/composables/useTaskView'
import { useWeekStart } from '@/composables/useWeekStart'
import { NO_STATUS, useCalendarFilters, useCalendarRouteState, type CalendarView } from '@/composables/useCalendarRouteState'
import { eventToTaskDates, type CalendarSpan, isScheduled, occupiesDay, shiftTaskDates, taskToEvent, type TaskCalendarEvent } from '@/helpers/taskCalendarDates'
import { useCalendarDragStep } from '@/composables/useCalendarDragStep'

const props = defineProps<{ goalId: number }>()

const DAY_FORMAT = 'yyyy-MM-dd'

const FC_VIEWS: Record<CalendarView, string> = {
  month: 'dayGridMonth',
  week: 'dayGridWeek',
  hours: 'timeGridWeek',
  list: 'listWeek',
}

const { t, locale } = useI18n()
const calendarStore = useCalendarStore()
const { openTask } = useTaskDetailPanel()
const { isMobile } = useTaskView()
const { canEditTaskDeadline, canAddTask } = useGoalPermissions()
// A task created on a day gets that date, so it takes both permissions
const canCreate = computed(() => canAddTask.value && canEditTaskDeadline.value)
const toast = useToast()
const weekStart = useWeekStart()
const dragStep = useCalendarDragStep()
const slotMinutes = computed(() => Math.max(30, dragStep.value))
const { view, date } = useCalendarRouteState(isMobile.value ? 'list' : 'week')
const filters = useCalendarFilters()

const calendarRef = useTemplateRef<InstanceType<typeof FullCalendar>>('calendarRef')
const api = () => calendarRef.value?.getApi()

const title = ref('')
// Read once: FullCalendar owns navigation after mount and reports it back through datesSet
const initialView = FC_VIEWS[view.value]
const initialDate = date.value

// Filters apply on the client: only the visible period is loaded, so this stays small and instant.
// Within each filter any selected value matches; different filters must all match.
function matchesFilters(task: TaskItem): boolean {
  const { assignees, tags, statuses } = filters
  return (!assignees.value.length || task.assignedUsers.some((id) => assignees.value.includes(id)))
    && (!tags.value.length || task.tags.some((id) => tags.value.includes(id)))
    && (!statuses.value.length || statuses.value.includes(task.statusId ?? NO_STATUS))
}

const events = computed(() => calendarStore.tasks
  .filter(matchesFilters)
  .map(taskToEvent)
  .filter((event): event is TaskCalendarEvent => event !== null))

const visibleRange = ref<{ start: Date; end: Date }>()

// Load the visible period only, one day wider on each side: a task with a time is stored in UTC
// and can fall on a neighbouring local day. activeEnd is exclusive, so it already adds a day.
watch([() => props.goalId, visibleRange], ([goalId, range]) => {
  if (!range) return
  calendarStore.fetchTasks(goalId, { from: format(addDays(range.start, -1), DAY_FORMAT), to: format(range.end, DAY_FORMAT) })
})

// Like Asana, an empty Saturday or Sunday shrinks to a narrow column in the week view.
// Only empty days collapse, so no multi-day bar ever spans a column narrower than the rest.
// Only when tasks can't be moved: FullCalendar finds the day under the pointer assuming equal-width
// columns, so a narrow column would make drops and resizes land on the wrong day.
const collapsedWeekdays = computed(() => {
  if (!visibleRange.value || canEditTaskDeadline.value || filters.hideWeekends.value) return new Set<number>()
  const { start, end } = visibleRange.value
  const emptyWeekendDays = eachDayOfInterval({ start, end: addDays(end, -1) })
    .filter((day) => isWeekend(day) && !events.value.some((event) => occupiesDay(event, day)))
  return new Set(emptyWeekendDays.map((day) => getDay(day)))
})
const weekendClass = (arg: { dow: number }) => (collapsedWeekdays.value.has(arg.dow) ? 'tv-calendar-collapsed' : '')

// Seven readable columns don't fit a phone: let the week scroll sideways instead of squeezing cards
const scrollWeek = computed(() => isMobile.value && (view.value === 'week' || view.value === 'hours'))

// Day views show "+ Add task" on the hovered day, so it's clear a click adds one (see calendar.css)
const showAddHint = computed(() => canCreate.value && (view.value === 'month' || view.value === 'week'))
const addHintLabel = computed(() => JSON.stringify(`+ ${t('calendar.add.submit')}`))

const showEmptyState = computed(() => !calendarStore.loading && !calendarStore.tasks.some(isScheduled))

watch(view, (value) => api()?.changeView(FC_VIEWS[value]))

function onDatesSet(info: DatesSetInfo) {
  title.value = info.view.title
  date.value = info.view.currentStart
  const { activeStart: start, activeEnd: end } = info.view
  // datesSet also fires on re-renders of the same period: only a real change should reload
  if (visibleRange.value?.start.getTime() !== start.getTime() || visibleRange.value?.end.getTime() !== end.getTime()) {
    visibleRange.value = { start, end }
  }
}

// Tapping a day number opens that week as a list, the readable view on any screen size
function onNavLinkDayClick(day: Date) {
  view.value = 'list'
  api()?.gotoDate(day)
}

function onEventClick(info: EventClickInfo) {
  info.jsEvent.preventDefault()
  openTask((info.event.extendedProps.task as TaskCalendarEvent['extendedProps']['task']).id)
}

// FullCalendar has already moved the event: save the new dates and put the event back if that fails
async function saveDates(info: EventChangeInfo, patch: TaskArgUpdate) {
  if (await calendarStore.updateTaskDates(patch)) return
  info.revert()
  toast.add({ title: t('calendar.moveError'), color: 'error' })
}

// Day grids move events by whole days, so their deltas carry days only and keep each time as it is.
// In the hours view, an event that lands on (or leaves) a time slot is read from where it landed.
function movedByDays(info: EventChangeInfo) {
  return view.value !== 'hours' || (info.event.allDay && info.oldEvent.allDay)
}

function landed(info: EventChangeInfo) {
  return { start: info.event.start!, end: info.event.end, allDay: info.event.allDay }
}

// Clicking a day (or dragging across days or time slots) opens the quick add for that span
const addOpen = ref(false)
const addSpan = ref<CalendarSpan | null>(null)

function onSelect(info: DateSelectInfo) {
  // A click on a time slot selects a single snap step: make it as long as the slot instead
  const end = !info.allDay && differenceInMinutes(info.end, info.start) <= dragStep.value
    ? addMinutes(info.start, slotMinutes.value)
    : info.end
  addSpan.value = { start: info.start, end, allDay: info.allDay }
  addOpen.value = true
}

watch(addOpen, (isOpen) => {
  if (!isOpen) api()?.unselect()
})

function onEventDrop(info: EventDropInfo) {
  const { task, shape } = info.event.extendedProps as TaskCalendarEvent['extendedProps']
  saveDates(info, movedByDays(info)
    ? shiftTaskDates(task, info.delta.days, info.delta.days)
    : eventToTaskDates(task, shape, landed(info), false))
}

function onEventResize(info: EventResizeDoneInfo) {
  const { task, shape } = info.event.extendedProps as TaskCalendarEvent['extendedProps']
  saveDates(info, movedByDays(info)
    ? shiftTaskDates(task, info.startDelta.days, info.endDelta.days)
    : eventToTaskDates(task, shape, landed(info), true))
}

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [classicThemePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
  initialView,
  initialDate,
  headerToolbar: false,
  height: '100%',
  locales: [deLocale, esLocale, ptBrLocale, ruLocale],
  locale: locale.value.toLowerCase(),
  // Unset means "follow the locale"
  ...(weekStart.value !== undefined ? { firstDay: weekStart.value } : {}),
  events: events.value,
  eventDisplay: 'block',
  eventClass: 'cursor-pointer',
  // The list view's color dot: CalendarTaskCard is the whole event, and the dot is invisible with a transparent eventColor
  listItemEventBeforeClass: 'hidden',
  eventColor: 'transparent',
  eventContrastColor: 'var(--ui-text)',
  dayMaxEvents: true,
  weekends: !filters.hideWeekends.value,
  navLinks: true,
  navLinkDayClick: onNavLinkDayClick,
  views: {
    dayGridWeek: { dayMaxEvents: false, dayHeaderClass: weekendClass, dayCellClass: weekendClass },
    timeGridWeek: {
      // FullCalendar ignores a snap step that doesn't divide the slot, so a 60-minute step needs 60-minute slots
      slotDuration: { minutes: slotMinutes.value },
      snapDuration: { minutes: dragStep.value },
      scrollTime: '08:00:00',
      nowIndicator: true,
    },
  },
  datesSet: onDatesSet,
  eventClick: onEventClick,
  editable: canEditTaskDeadline.value,
  eventDrop: onEventDrop,
  eventResize: onEventResize,
  selectable: canCreate.value,
  select: onSelect,
}))
</script>
