<template>
  <div class="space-y-3 shadow-sm rounded-lg p-2 dark:bg-tv-ui-bg-elevated">
    <!-- First row: Start and End date buttons -->
    <div class="flex gap-2">
      <!-- Start Date -->
      <UPopover v-model:open="startPopoverOpen">
        <UButton
          :disabled="!canEditTaskDeadline"
          icon="i-lucide-calendar"
          :label="formattedStartDate"
          color="neutral"
          :variant="isDark ? 'subtle' : 'outline'"
          class="flex-1 justify-start"
          :loading="deferredLoadingStart"
          size="xl"
          :ui="activatorStyle"
        />

        <template #content>
          <div class="p-2 space-y-2 flex flex-col gap-2">
            <UCalendar
              v-model="startDateModel"
              :placeholder="startCalendarDefaultValue"
              :max-value="endDateModel"
            />
            <UCheckbox
              v-model="showStartTime"
              size="md"
              :ui="{root:'items-center'}"
              :label="t('deadline.selectTime')"
            />
            <UInputTime
              v-if="showStartTime"
              v-model="startTimeModel"
              hour-format="24"
            />
            <UButton
              v-if="hasStartDate"
              icon="i-lucide-x"
              :label="t('common.delete')"
              class="self-end"
              color="error"
              variant="outline"
              size="sm"
              :loading="deferredLoadingStart"
              @click="clearStartDate"
            />
          </div>
        </template>
      </UPopover>

      <!-- End Date -->
      <UPopover v-model:open="endPopoverOpen">
        <UButton
          :disabled="!canEditTaskDeadline"
          icon="i-lucide-calendar-check"
          :label="formattedEndDate"
          color="neutral"
          :variant="isDark ? 'subtle' : 'outline'"
          class="flex-1 justify-start"
          :loading="deferredLoadingEnd"
          size="xl"
          :ui="activatorStyle"
        />

        <template #content>
          <div class="p-2 space-y-2 flex flex-col gap-2">
            <UCalendar
              v-model="endDateModel"
              :placeholder="endCalendarDefaultValue"
              :min-value="startDateModel"
            />
            <UCheckbox
              v-model="showEndTime"
              size="md"
              :ui="{root:'items-center'}"
              :label="t('deadline.selectTime')"
            />
            <UInputTime
              v-if="showEndTime"
              v-model="endTimeModel"
              hour-format="24"
            />
            <UButton
              v-if="hasEndDate"
              class="self-end"
              icon="i-lucide-x"
              :label="t('common.delete')"
              color="error"
              variant="outline"
              size="sm"
              :loading="deferredLoadingEnd"
              @click="clearEndDate"
            />
          </div>
        </template>
      </UPopover>
    </div>

    <!-- Second row: Quick date buttons + reset -->
    <div class="flex flex-wrap gap-2">
      <UButton
        :disabled="!canEditTaskDeadline"
        :label="t('deadline.today')"
        color="neutral"
        :variant="isDark ? 'subtle' : 'soft'"
        size="md"
        :loading="deferredQuickAction === 'today'"
        @click="setQuickDate('today')"
      />
      <UButton
        :disabled="!canEditTaskDeadline"
        :label="t('deadline.tomorrow')"
        color="neutral"
        :variant="isDark ? 'subtle' : 'soft'"
        size="md"
        :loading="deferredQuickAction === 'tomorrow'"
        @click="setQuickDate('tomorrow')"
      />
      <UButton
        :disabled="!canEditTaskDeadline"
        :label="t('deadline.yesterday')"
        color="neutral"
        :variant="isDark ? 'subtle' : 'soft'"
        size="md"
        :loading="deferredQuickAction === 'yesterday'"
        @click="setQuickDate('yesterday')"
      />
      <UButton
        :disabled="!canEditTaskDeadline"
        :label="t('deadline.thisWeek')"
        color="neutral"
        :variant="isDark ? 'subtle' : 'soft'"
        size="md"
        :loading="deferredQuickAction === 'week'"
        @click="setQuickRange('week')"
      />
      <UButton
        :disabled="!canEditTaskDeadline"
        :label="t('deadline.thisMonth')"
        color="neutral"
        :variant="isDark ? 'subtle' : 'soft'"
        size="md"
        :loading="deferredQuickAction === 'month'"
        @click="setQuickRange('month')"
      />
      <UButton
        v-if="hasStartDate || hasEndDate"
        :disabled="!canEditTaskDeadline"
        icon="i-lucide-x"
        color="error"
        variant="ghost"
        size="md"
        class="ml-auto"
        :loading="deferredQuickAction === 'clear'"
        @click="clearAllDates"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, nextTick } from 'vue'
import { useDateFormat } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import type { Task } from 'taskview-api'
import { CalendarDate, Time } from '@internationalized/date'
import { useTasksStore } from '@/stores/tasks.store'
import { useColor } from '@/composables/useColotMode'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

type QuickAction = 'today' | 'tomorrow' | 'yesterday' | 'week' | 'month' | 'clear' | null

const props = defineProps<{
  task: Task
}>()

const { t } = useI18n()
const tasksStore = useTasksStore()
const { isDark } = useColor()
const LOADING_DELAY = 500
const loadingStart = ref(false)
const loadingEnd = ref(false)
const deferredLoadingStart = ref(false)
const deferredLoadingEnd = ref(false)
const activeQuickAction = ref<QuickAction>(null)
const deferredQuickAction = ref<QuickAction>(null)

let quickTimer: ReturnType<typeof setTimeout> | null = null

watch(activeQuickAction, (val) => {
  if (val) {
    quickTimer = setTimeout(() => { deferredQuickAction.value = val }, LOADING_DELAY)
  } else {
    if (quickTimer) clearTimeout(quickTimer)
    quickTimer = null
    deferredQuickAction.value = null
  }
})

useDeferredLoading(loadingStart, deferredLoadingStart)
useDeferredLoading(loadingEnd, deferredLoadingEnd)

const { canEditTaskDeadline } = useGoalPermissions()
const activatorStyle = {
  leadingIcon: 'size-4.5',
}

function useDeferredLoading(source: typeof loadingStart, deferred: typeof deferredLoadingStart) {
  let timer: ReturnType<typeof setTimeout> | null = null
  watch(source, (val) => {
    if (val) {
      timer = setTimeout(() => { deferred.value = true }, LOADING_DELAY)
    } else {
      if (timer) clearTimeout(timer)
      timer = null
      deferred.value = false
    }
  })
}

// Parse date string (YYYY-MM-DD) to CalendarDate
function parseDateString(dateStr: string | null | undefined): CalendarDate | undefined {
  if (!dateStr) return undefined
  const [year, month, day] = dateStr.split('-').map(Number)
  return new CalendarDate(year, month, day)
}

// Parse time string (HH:mm:ss+TZ) to Time
function parseTimeString(timeStr: string | null | undefined): Time | undefined {
  if (!timeStr) return undefined
  const match = timeStr.match(/^(\d{2}):(\d{2})/)
  if (match) {
    return new Time(parseInt(match[1], 10), parseInt(match[2], 10))
  }
  return undefined
}

// Use shallowRef to avoid Vue stripping private fields from class instances
const startDateModel = shallowRef<CalendarDate | undefined>(parseDateString(props.task.startDate))
const endDateModel = shallowRef<CalendarDate | undefined>(parseDateString(props.task.endDate))
const startTimeModel = shallowRef<Time | undefined>(parseTimeString(props.task.startTime))
const endTimeModel = shallowRef<Time | undefined>(parseTimeString(props.task.endTime))
const showStartTime = ref(!!props.task.startTime)
const showEndTime = ref(!!props.task.endTime)
const startPopoverOpen = ref(false)
const endPopoverOpen = ref(false)

// we set this flag when models are changed programmatically (quick buttons, external sync etc)
// so the watchers below don't fire extra save requests
let syncing = false

// user unchecked "select time" — reset the time value
watch(showStartTime, (val) => {
  if (!val) startTimeModel.value = undefined
})
watch(showEndTime, (val) => {
  if (!val) endTimeModel.value = undefined
})

// these two watchers exist because UCalendar updates the model via v-model
// when user picks a date in the popover — without them the selection won't be saved to server
watch([startDateModel, startTimeModel], (_, [oldDate]) => {
  if (syncing || !startDateModel.value) return
  saveStartDateTime()
  // close popover only when date changes — time input needs multiple clicks
  // so we let the user close it manually
  const dateChanged = startDateModel.value !== oldDate
  if (dateChanged && (!showStartTime.value || startTimeModel.value)) {
    startPopoverOpen.value = false
  }
})

watch([endDateModel, endTimeModel], (_, [oldDate]) => {
  if (syncing || !endDateModel.value) return
  saveEndDateTime()
  const dateChanged = endDateModel.value !== oldDate
  if (dateChanged && (!showEndTime.value || endTimeModel.value)) {
    endPopoverOpen.value = false
  }
})

// Computed flags for reactivity in template
const hasStartDate = computed(() => !!startDateModel.value)
const hasEndDate = computed(() => !!endDateModel.value)

// Default values for calendars - show correct month when opening
const startCalendarDefaultValue = computed(() => {
  return startDateModel.value || getTodayCalendarDate()
})

const endCalendarDefaultValue = computed(() => {
  // If start date is set, show that month so user sees available dates
  if (startDateModel.value) return startDateModel.value
  return endDateModel.value || getTodayCalendarDate()
})

function getTodayCalendarDate(): CalendarDate {
  const now = new Date()
  return new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

// Watch for external task updates
watch(
  () => props.task,
  (task) => {
    syncing = true
    startDateModel.value = parseDateString(task.startDate)
    endDateModel.value = parseDateString(task.endDate)
    startTimeModel.value = parseTimeString(task.startTime)
    endTimeModel.value = parseTimeString(task.endTime)
    showStartTime.value = !!task.startTime
    showEndTime.value = !!task.endTime
    nextTick(() => { syncing = false })
  },
  { deep: true },
)

// Format dates for display
const formattedStartDate = computed(() => {
  if (startDateModel.value) {
    const date = new Date(startDateModel.value.toString())
    const dateStr = useDateFormat(date, 'DD MMM').value
    if (startTimeModel.value) {
      return `${dateStr} ${formatTimeForDisplay(startTimeModel.value)}`
    }
    return dateStr
  }
  return t('deadline.startDate')
})

const formattedEndDate = computed(() => {
  if (endDateModel.value) {
    const date = new Date(endDateModel.value.toString())
    const dateStr = useDateFormat(date, 'DD MMM').value
    if (endTimeModel.value) {
      return `${dateStr} ${formatTimeForDisplay(endTimeModel.value)}`
    }
    return dateStr
  }
  return t('deadline.endDate')
})

// Helper functions
function formatTimeForDisplay(time: Time): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`
}

function getTimeZone(): string {
  const date = new Date()
  const timezoneOffsetInMinutes = date.getTimezoneOffset()
  const offsetHours = Math.floor(Math.abs(timezoneOffsetInMinutes) / 60)
  const offsetMinutes = Math.abs(timezoneOffsetInMinutes) % 60
  const offsetSign = timezoneOffsetInMinutes <= 0 ? '+' : '-'
  return `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`
}

function formatDateForApi(calendarDate: CalendarDate): string {
  return calendarDate.toString() // Returns YYYY-MM-DD
}

function formatTimeForApi(time: Time): string {
  const timeZone = getTimeZone()
  const timeStr = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}:00`
  return `${timeStr}${timeZone}`
}

// Save functions
async function saveStartDateTime() {
  if (!startDateModel.value) return

  loadingStart.value = true
  await tasksStore.saveDateForTask({
    id: props.task.id,
    startDate: formatDateForApi(startDateModel.value as CalendarDate),
    startTime: startTimeModel.value ? formatTimeForApi(startTimeModel.value as Time) : null,
  })
  loadingStart.value = false
}

async function saveEndDateTime() {
  if (!endDateModel.value) return

  loadingEnd.value = true
  await tasksStore.saveDateForTask({
    id: props.task.id,
    endDate: formatDateForApi(endDateModel.value as CalendarDate),
    endTime: endTimeModel.value ? formatTimeForApi(endTimeModel.value as Time) : null,
  })
  loadingEnd.value = false
}

async function clearStartDate() {
  loadingStart.value = true
  startDateModel.value = undefined
  startTimeModel.value = undefined
  await tasksStore.saveDateForTask({
    id: props.task.id,
    startDate: null,
    startTime: null,
  })
  loadingStart.value = false
}

async function clearEndDate() {
  loadingEnd.value = true
  endDateModel.value = undefined
  endTimeModel.value = undefined
  await tasksStore.saveDateForTask({
    id: props.task.id,
    endDate: null,
    endTime: null,
  })
  loadingEnd.value = false
}

// Clear all dates and times
// FIXME need to be replaced with a single 
// HTTP request when the API is updated
async function clearAllDates() {
  activeQuickAction.value = 'clear'
  syncing = true
  startDateModel.value = undefined
  endDateModel.value = undefined
  startTimeModel.value = undefined
  endTimeModel.value = undefined
  nextTick(() => { syncing = false })
  await tasksStore.saveDateForTask({
    id: props.task.id,
    startDate: null,
    startTime: null,
    endDate: null,
    endTime: null,
  })
  activeQuickAction.value = null
}

// Quick date functions
function getQuickDate(type: 'today' | 'tomorrow' | 'yesterday'): string {
  const now = new Date()
  switch (type) {
  case 'today':
    return useDateFormat(now, 'YYYY-MM-DD').value
  case 'tomorrow':
    now.setDate(now.getDate() + 1)
    return useDateFormat(now, 'YYYY-MM-DD').value
  case 'yesterday':
    now.setDate(now.getDate() - 1)
    return useDateFormat(now, 'YYYY-MM-DD').value
  }
}

async function setQuickDate(type: 'today' | 'tomorrow' | 'yesterday') {
  const date = getQuickDate(type)

  activeQuickAction.value = type

  await tasksStore.saveDateForTask({
    id: props.task.id,
    startDate: date,
    endDate: date,
  })

  syncing = true
  startDateModel.value = parseDateString(date)
  endDateModel.value = parseDateString(date)
  nextTick(() => { syncing = false })

  activeQuickAction.value = null
}

async function setQuickRange(type: 'week' | 'month') {
  const now = new Date()
  let start: string
  let end: string

  if (type === 'week') {
    const day = now.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    start = useDateFormat(monday, 'YYYY-MM-DD').value
    end = useDateFormat(sunday, 'YYYY-MM-DD').value
  } else {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    start = useDateFormat(firstDay, 'YYYY-MM-DD').value
    end = useDateFormat(lastDay, 'YYYY-MM-DD').value
  }

  activeQuickAction.value = type

  await tasksStore.saveDateForTask({
    id: props.task.id,
    startDate: start,
    endDate: end,
  })

  syncing = true
  startDateModel.value = parseDateString(start)
  endDateModel.value = parseDateString(end)
  nextTick(() => { syncing = false })

  activeQuickAction.value = null
}
</script>
