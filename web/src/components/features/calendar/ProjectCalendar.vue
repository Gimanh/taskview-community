<template>
  <div
    class="tv-calendar flex h-full min-h-0 flex-col gap-3"
    :class="showAddHint && ['tv-calendar-addable', `tv-calendar-add-${view}`]"
    :style="showAddHint ? { '--tv-calendar-add-label': addHintLabel } : undefined"
  >
    <component
      :is="isMobile ? CalendarMobileToolbar : CalendarToolbar"
      v-model:view="view"
      :title="title"
      @today="goToday"
      @prev="api()?.prev()"
      @next="api()?.next()"
    >
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
    </component>

    <div class="flex min-h-0 flex-1 gap-3">
      <div
        ref="swipeArea"
        class="relative min-h-0 min-w-0 flex-1"
        data-testid="calendar-swipe-area"
        :class="{ 'flex flex-col overflow-y-auto': agendaMode }"
      >
        <!-- FullCalendar owns its root element's classes; a class bound there is wiped on every re-render -->
        <div :class="agendaMode ? 'tv-calendar-agenda-month shrink-0' : 'h-full'">
          <FullCalendar
            ref="calendarRef"
            :options="calendarOptions"
          >
            <template #dayHeaderContent="arg">
              <div
                v-if="arg.view.type === FC_VIEWS.week || isTimeGrid(arg.view.type)"
                class="flex flex-col items-center gap-0.5 px-1 py-1.5"
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
              <CalendarMonthDayCell
                v-if="agendaMode"
                :date="arg.date"
                :day-number-text="arg.dayNumberText"
                :is-today="arg.isToday"
                :is-other="arg.isOther"
                :selected="agenda.isSelected(arg.date)"
                :dots="agenda.dotsOf(arg.date)"
              />
              <span
                v-else
                class="inline-flex min-w-6 justify-center rounded-md px-1 text-xs tabular-nums"
                :class="arg.isToday ? 'bg-primary font-semibold text-inverted' : 'text-muted'"
              >{{ arg.dayNumberText }}</span>
            </template>

            <template #eventContent="arg">
              <CalendarTaskCard
                v-if="arg.event.extendedProps.task"
                :task="arg.event.extendedProps.task"
                :time-text="arg.event.allDay ? undefined : arg.timeText"
                :compact="arg.view.type !== FC_VIEWS.week"
                :resizable="arg.isEndResizable"
                :lifted="arg.isMirror"
                :fill="isTimeGrid(arg.view.type)"
                :short="isTimeGrid(arg.view.type) && isShortEvent(arg.event)"
              />
            </template>
          </FullCalendar>
        </div>

        <CalendarDayAgenda
          v-if="agendaMode"
          :day="agenda.selectedDay.value"
          :events="agenda.selectedDayEvents.value"
          :can-create="canCreate"
          @open="openTask"
          @add="addOnDay(agenda.selectedDay.value)"
        />

        <div
          v-if="showEmptyState && !agendaMode"
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

      <CalendarUnscheduledPanel
        v-if="panelShown"
        ref="panel"
        :drop-target="draggingFromCalendar"
        @close="panelOpen = false"
      />
    </div>

    <CalendarAddTaskDialog
      v-model:open="addOpen"
      :span="addSpan"
      :goal-id="goalId"
    />
    <CalendarUnscheduledDrawer
      v-if="isMobile"
      v-model:open="drawerOpen"
    />
    <UButton
      v-if="isMobile && canCreate"
      icon="i-lucide-plus"
      size="xl"
      class="fixed right-4 bottom-[calc(var(--tv-safe-area-inset-bottom)+5.5rem)] z-40 rounded-full p-4 shadow-lg"
      :ui="{ leadingIcon: 'size-6' }"
      :aria-label="t('calendar.add.title')"
      data-testid="calendar-add-fab"
      @click="addOnDay(fabDay)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { addDays, addMinutes, differenceInMinutes, eachDayOfInterval, format, getDay, isWeekend, startOfDay } from 'date-fns'
import { useI18n } from 'vue-i18n'
import FullCalendar from '@fullcalendar/vue3'
import type { CalendarOptions, DateClickInfo, DateSelectInfo, DatesSetInfo, EventChangeInfo, EventClickInfo, EventDropInfo, EventResizeDoneInfo } from '@fullcalendar/vue3'
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
import CalendarMobileToolbar from './CalendarMobileToolbar.vue'
import CalendarDayAgenda from './parts/CalendarDayAgenda.vue'
import CalendarMonthDayCell from './parts/CalendarMonthDayCell.vue'
import CalendarTaskCard from './CalendarTaskCard.vue'
import CalendarAddTaskDialog from './CalendarAddTaskDialog.vue'
import CalendarUnscheduledPanel from './parts/CalendarUnscheduledPanel.vue'
import CalendarUnscheduledDrawer from './parts/CalendarUnscheduledDrawer.vue'
import { useCalendarStore } from '@/stores/calendar.store'
import type { TaskArgUpdate } from 'taskview-api'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'
import { useTaskView } from '@/composables/useTaskView'
import { useWeekStart } from '@/composables/useWeekStart'
import { fitCalendarView, useCalendarFilters, useCalendarRouteState, useCalendarUnscheduledPanel, type CalendarView } from '@/composables/useCalendarRouteState'
import { useCalendarMonthAgenda } from '@/composables/useCalendarMonthAgenda'
import { useCalendarSwipe } from '@/composables/useCalendarSwipe'
import { eventToTaskDates, type CalendarSpan, isScheduled, occupiesDay, shiftTaskDates, taskToEvent, type TaskCalendarEvent } from '@/helpers/taskCalendarDates'
import { useCalendarDragStep, useCalendarSlotMinutes } from '@/composables/useCalendarDragStep'
import { useCalendarUnscheduledDrop, useCalendarUnscheduledLoader } from '@/composables/useCalendarUnscheduled'

const props = defineProps<{ goalId: number }>()

const DAY_FORMAT = 'yyyy-MM-dd'
const ONE_LINE_EVENT_MINUTES = 60

const FC_VIEWS: Record<CalendarView, string> = {
  month: 'dayGridMonth',
  week: 'dayGridWeek',
  hours: 'timeGridWeek',
  list: 'listWeek',
  days3: 'timeGrid3Day',
  day: 'timeGridDay',
}

// The views laid out by the hour: the week on a desktop, three days and a single day on a phone
const TIME_GRID_VIEWS = new Set([FC_VIEWS.hours, FC_VIEWS.days3, FC_VIEWS.day])

function isTimeGrid(viewType: string): boolean {
  return TIME_GRID_VIEWS.has(viewType)
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
const slotMinutes = useCalendarSlotMinutes()
const { view, date } = useCalendarRouteState(isMobile.value ? 'month' : 'week')
const filters = useCalendarFilters()

const calendarRef = useTemplateRef<InstanceType<typeof FullCalendar>>('calendarRef')
const api = () => calendarRef.value?.getApi()

const title = ref('')
// A link opened on another device asks for a view this screen doesn't offer: show the closest one
watch([view, isMobile], ([value, mobile]) => {
  const fitted = fitCalendarView({ view: value, mobile })
  if (fitted !== value) view.value = fitted
}, { immediate: true })

// Read once: FullCalendar owns navigation after mount and reports it back through datesSet
const initialView = FC_VIEWS[fitCalendarView({ view: view.value, mobile: isMobile.value })]
const initialDate = date.value

const events = computed(() => calendarStore.tasks
  .filter(filters.matches)
  .map(taskToEvent)
  .filter((event): event is TaskCalendarEvent => event !== null))

const visibleRange = ref<{ start: Date; end: Date }>()

// On a phone the month is a compact grid with a dot per task and the tasks of the picked day below it
const agendaMode = computed(() => isMobile.value && view.value === 'month')
const agenda = useCalendarMonthAgenda({ events, visibleRange })

// Tasks without dates wait in a panel beside the calendar (a drawer on phones) to be dragged onto a day
const panelOpen = useCalendarUnscheduledPanel()
const drawerOpen = ref(false)
const panelShown = computed(() => !isMobile.value && panelOpen.value)
const panelRef = useTemplateRef<InstanceType<typeof CalendarUnscheduledPanel>>('panel')
const { draggingFromCalendar, onDrop, onEventDragStart, onEventDragStop } = useCalendarUnscheduledDrop(() => panelRef.value?.$el)

function toggleUnscheduled() {
  if (isMobile.value) drawerOpen.value = true
  else panelOpen.value = !panelOpen.value
}

useCalendarUnscheduledLoader(() => props.goalId)

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

// Day views show "+ Add task" on the hovered day, so it's clear a click adds one (see calendar.css)
const showAddHint = computed(() => canCreate.value && (view.value === 'month' || view.value === 'week'))
const addHintLabel = computed(() => JSON.stringify(`+ ${t('calendar.add.submit')}`))

const showEmptyState = computed(() => !calendarStore.loading && !calendarStore.tasks.some(isScheduled))

watch(view, (value) => api()?.changeView(FC_VIEWS[value]))

function onDatesSet(info: DatesSetInfo) {
  title.value = info.view.title
  date.value = info.view.currentStart
  if (info.view.type === FC_VIEWS.month) agenda.keepInMonth(info.view.currentStart)
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

// Under an hour: too low for the regular two-line card
function isShortEvent(event: { start: Date | null; end: Date | null; allDay: boolean }) {
  // Without an end, FullCalendar draws a timed event an hour long
  if (event.allDay || !event.start || !event.end) return false
  return differenceInMinutes(event.end, event.start) < ONE_LINE_EVENT_MINUTES
}

function onDateClick(info: DateClickInfo) {
  if (agendaMode.value) agenda.selectDay(info.date)
}

function goToday() {
  api()?.today()
  agenda.selectDay(new Date())
}

// Where the "+" button adds a task: the picked day in the month, otherwise today when it is on
// screen, or the first day shown
const fabDay = computed(() => {
  if (agendaMode.value) return agenda.selectedDay.value
  const range = visibleRange.value
  const today = startOfDay(new Date())
  if (!range || (today >= range.start && today < range.end)) return today
  return range.start
})

function addOnDay(day: Date) {
  addSpan.value = { start: startOfDay(day), end: addDays(startOfDay(day), 1), allDay: true }
  addOpen.value = true
}

const draggingEvent = ref(false)
useCalendarSwipe({
  target: useTemplateRef<HTMLElement>('swipeArea'),
  enabled: () => isMobile.value && !draggingEvent.value,
  onNext: () => api()?.next(),
  onPrev: () => api()?.prev(),
})

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
  return !isTimeGrid(FC_VIEWS[view.value]) || (info.event.allDay && info.oldEvent.allDay)
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
  height: agendaMode.value ? 'auto' : '100%',
  locales: [deLocale, esLocale, ptBrLocale, ruLocale],
  locale: locale.value.toLowerCase(),
  // Unset means "follow the locale"
  ...(weekStart.value !== undefined ? { firstDay: weekStart.value } : {}),
  // The phone month shows tasks as dots in the day cells and as a list below the grid
  events: agendaMode.value ? [] : events.value,
  eventDisplay: 'block',
  eventClass: 'cursor-pointer',
  // The list view's color dot: CalendarTaskCard is the whole event, and the dot is invisible with a transparent eventColor
  listItemEventBeforeClass: 'hidden',
  eventColor: 'transparent',
  eventContrastColor: 'var(--ui-text)',
  dayMaxEvents: true,
  weekends: !filters.hideWeekends.value,
  // On a phone a tap on a day picks it (month) or adds a task; jumping to another view surprises there
  navLinks: !isMobile.value,
  navLinkDayClick: onNavLinkDayClick,
  views: {
    dayGridWeek: { dayMaxEvents: false, dayHeaderClass: weekendClass, dayCellClass: weekendClass },
    timeGrid3Day: { type: 'timeGrid', duration: { days: 3 } },
    timeGrid: {
      // FullCalendar ignores a snap step that doesn't divide the slot, so a 60-minute step needs 60-minute slots
      slotDuration: { minutes: slotMinutes.value },
      snapDuration: { minutes: dragStep.value },
      scrollTime: '08:00:00',
      nowIndicator: true,
      // Tall enough for one line of the card, however short the event
      eventMinHeight: 20,
    },
  },
  datesSet: onDatesSet,
  eventClick: onEventClick,
  editable: canEditTaskDeadline.value,
  eventDrop: onEventDrop,
  eventResize: onEventResize,
  selectable: canCreate.value && !agendaMode.value,
  dateClick: onDateClick,
  select: onSelect,
  droppable: canEditTaskDeadline.value,
  drop: onDrop,
  eventDragStart: () => {
    draggingEvent.value = true
    onEventDragStart()
  },
  eventDragStop: (info) => {
    draggingEvent.value = false
    onEventDragStop(info)
  },
}))
</script>
