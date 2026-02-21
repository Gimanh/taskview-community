<template>
  <div class="space-y-3 shadow-sm rounded-lg p-2 dark:bg-tv-ui-bg-elevated">
    <!-- First row: Start and End date buttons -->
    <div class="flex gap-2">
      <!-- Start Date -->
      <UPopover>
        <UButton
          :disabled="!canEditTaskDeadline"
          icon="i-lucide-calendar"
          :label="formattedStartDate"
          color="neutral"
          :variant="isDark ? 'subtle' : 'outline'"
          class="flex-1 justify-start"
          :loading="loadingStart"
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
              :loading="loadingStart"
              @click="clearStartDate"
            />
          </div>
        </template>
      </UPopover>

      <!-- End Date -->
      <UPopover>
        <UButton
          :disabled="!canEditTaskDeadline"
          icon="i-lucide-calendar-check"
          :label="formattedEndDate"
          color="neutral"
          :variant="isDark ? 'subtle' : 'outline'"
          class="flex-1 justify-start"
          :loading="loadingEnd"
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
              :loading="loadingEnd"
              @click="clearEndDate"
            />
          </div>
        </template>
      </UPopover>
    </div>

    <!-- Second row: Quick date buttons + reset -->
    <div class="flex gap-2">
      <UButton
        :disabled="!canEditTaskDeadline"
        :label="t('deadline.today')"
        color="neutral"
        :variant="isDark ? 'subtle' : 'soft'"
        size="md"
        :loading="loadingQuick"
        @click="setQuickDate('today')"
      />
      <UButton
        :disabled="!canEditTaskDeadline"
        :label="t('deadline.tomorrow')"
        color="neutral"
        :variant="isDark ? 'subtle' : 'soft'"
        size="md"
        :loading="loadingQuick"
        @click="setQuickDate('tomorrow')"
      />
      <UButton
        :disabled="!canEditTaskDeadline"
        :label="t('deadline.yesterday')"
        color="neutral"
        :variant="isDark ? 'subtle' : 'soft'"
        size="md"
        :loading="loadingQuick"
        @click="setQuickDate('yesterday')"
      />
      <UButton
        v-if="hasStartDate || hasEndDate"
        :disabled="!canEditTaskDeadline"
        icon="i-lucide-x"
        color="error"
        variant="ghost"
        size="md"
        class="ml-auto"
        :loading="loadingQuick"
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

const props = defineProps<{
  task: Task
}>()

const { t } = useI18n()
const tasksStore = useTasksStore()
const { isDark } = useColor()
const loadingStart = ref(false)
const loadingEnd = ref(false)
const loadingQuick = ref(false)
const { canEditTaskDeadline } = useGoalPermissions()
const activatorStyle = {
  leadingIcon: 'size-4.5',
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

// Flag to skip auto-save during external sync
let syncing = false

// Clear time when checkbox is unchecked
watch(showStartTime, (val) => {
  if (!val) startTimeModel.value = undefined
})
watch(showEndTime, (val) => {
  if (!val) endTimeModel.value = undefined
})

// Auto-save start date/time on change
watch([startDateModel, startTimeModel], () => {
  if (syncing || !startDateModel.value) return
  saveStartDateTime()
})

// Auto-save end date/time on change
watch([endDateModel, endTimeModel], () => {
  if (syncing || !endDateModel.value) return
  saveEndDateTime()
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
  loadingQuick.value = true
  startDateModel.value = undefined
  endDateModel.value = undefined
  startTimeModel.value = undefined
  endTimeModel.value = undefined
  await Promise.all([
    tasksStore.saveDateForTask({
      id: props.task.id,
      startDate: null,
      startTime: null,
    }),
    tasksStore.saveDateForTask({
      id: props.task.id,
      endDate: null,
      endTime: null,
    }),
  ])
  loadingQuick.value = false
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

  loadingQuick.value = true

  await Promise.all([
    tasksStore.saveDateForTask({
      id: props.task.id,
      startDate: date,
    }),
    tasksStore.saveDateForTask({
      id: props.task.id,
      endDate: date,
    }),
  ])

  startDateModel.value = parseDateString(date)
  endDateModel.value = parseDateString(date)

  loadingQuick.value = false
}
</script>
