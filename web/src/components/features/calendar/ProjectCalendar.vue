<template>
  <div class="tv-calendar flex h-full min-h-0 flex-col gap-3">
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
      <FullCalendar
        ref="calendarRef"
        :options="calendarOptions"
        :class="{ 'min-w-240': scrollWeek }"
      >
        <template #dayHeaderContent="arg">
          <div
            v-if="arg.view.type === FC_VIEWS.week"
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
          />
        </template>
      </FullCalendar>

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
            {{ t('calendar.empty.description') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { addDays, eachDayOfInterval, getDay, isWeekend } from 'date-fns'
import { useI18n } from 'vue-i18n'
import FullCalendar from '@fullcalendar/vue3'
import type { CalendarOptions, DatesSetInfo, EventClickInfo } from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/vue3/daygrid'
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
import { useCalendarStore } from '@/stores/calendar.store'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'
import { useTaskView } from '@/composables/useTaskView'
import { useWeekStart } from '@/composables/useWeekStart'
import { useCalendarRouteState, type CalendarView } from '@/composables/useCalendarRouteState'
import { isScheduled, occupiesDay, taskToEvent, type TaskCalendarEvent } from '@/helpers/taskCalendarDates'

const props = defineProps<{ goalId: number }>()

const FC_VIEWS: Record<CalendarView, string> = {
  month: 'dayGridMonth',
  week: 'dayGridWeek',
  list: 'listWeek',
}

const { t, locale } = useI18n()
const calendarStore = useCalendarStore()
const { openTask } = useTaskDetailPanel()
const { isMobile } = useTaskView()
const weekStart = useWeekStart()
const { view, date } = useCalendarRouteState(isMobile.value ? 'list' : 'week')

const calendarRef = useTemplateRef<InstanceType<typeof FullCalendar>>('calendarRef')
const api = () => calendarRef.value?.getApi()

const title = ref('')
// Read once: FullCalendar owns navigation after mount and reports it back through datesSet
const initialView = FC_VIEWS[view.value]
const initialDate = date.value

watch(() => props.goalId, (goalId) => calendarStore.fetchTasks(goalId), { immediate: true })

const events = computed(() => calendarStore.tasks
  .map(taskToEvent)
  .filter((event): event is TaskCalendarEvent => event !== null))

// Like Asana, an empty Saturday or Sunday shrinks to a narrow column in the week view.
// Only empty days collapse, so no multi-day bar ever spans a column narrower than the rest.
const visibleRange = ref<{ start: Date; end: Date }>()
const collapsedWeekdays = computed(() => {
  if (!visibleRange.value) return new Set<number>()
  const { start, end } = visibleRange.value
  const emptyWeekendDays = eachDayOfInterval({ start, end: addDays(end, -1) })
    .filter((day) => isWeekend(day) && !events.value.some((event) => occupiesDay(event, day)))
  return new Set(emptyWeekendDays.map((day) => getDay(day)))
})
const weekendClass = (arg: { dow: number }) => (collapsedWeekdays.value.has(arg.dow) ? 'tv-calendar-collapsed' : '')

// Seven readable columns don't fit a phone: let the week scroll sideways instead of squeezing cards
const scrollWeek = computed(() => isMobile.value && view.value === 'week')

const showEmptyState = computed(() => !calendarStore.loading && !calendarStore.tasks.some(isScheduled))

watch(view, (value) => api()?.changeView(FC_VIEWS[value]))

function onDatesSet(info: DatesSetInfo) {
  title.value = info.view.title
  date.value = info.view.currentStart
  visibleRange.value = { start: info.view.activeStart, end: info.view.activeEnd }
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

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [classicThemePlugin, dayGridPlugin, listPlugin],
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
  eventColor: 'transparent',
  eventContrastColor: 'var(--ui-text)',
  dayMaxEvents: true,
  navLinks: true,
  navLinkDayClick: onNavLinkDayClick,
  views: {
    dayGridWeek: { dayMaxEvents: false, dayHeaderClass: weekendClass, dayCellClass: weekendClass },
  },
  datesSet: onDatesSet,
  eventClick: onEventClick,
}))
</script>
