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
              :hour-cycle="24"
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
              :hour-cycle="24"
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

// Parse UTC date + optional time from server into local CalendarDate + Time
function parseFromServer(dateStr: string | null | undefined, timeStr: string | null | undefined): { date: CalendarDate | undefined; time: Time | undefined } {
  if (!dateStr) return { date: undefined, time: undefined }

  if (timeStr) {
    const match = timeStr.match(/^(\d{2}):(\d{2})/)
    if (match) {
      const utc = new Date(`${dateStr}T${match[1]}:${match[2]}:00Z`)
      return {
        date: new CalendarDate(utc.getFullYear(), utc.getMonth() + 1, utc.getDate()),
        time: new Time(utc.getHours(), utc.getMinutes()),
      }
    }
  }

  const [year, month, day] = dateStr.split('-').map(Number)
  return { date: new CalendarDate(year, month, day), time: undefined }
}

// Use shallowRef to avoid Vue stripping private fields from class instances
const initStart = parseFromServer(props.task.startDate, props.task.startTime)
const initEnd = parseFromServer(props.task.endDate, props.task.endTime)
const startDateModel = shallowRef<CalendarDate | undefined>(initStart.date)
const endDateModel = shallowRef<CalendarDate | undefined>(initEnd.date)
const startTimeModel = shallowRef<Time | undefined>(initStart.time)
const endTimeModel = shallowRef<Time | undefined>(initEnd.time)
const showStartTime = ref(!!props.task.startTime)
const showEndTime = ref(!!props.task.endTime)
const startPopoverOpen = ref(false)
const endPopoverOpen = ref(false)

// we set this flag when models are changed programmatically (quick buttons, external sync etc)
// so the watchers below don't fire extra save requests
let syncing = false

// user toggled "select time" checkbox
watch(showStartTime, (val) => {
  if (!val) {
    startTimeModel.value = undefined
  } else if (!startDateModel.value) {
    syncing = true
    const now = getTodayCalendarDate()
    startDateModel.value = endDateModel.value && endDateModel.value.compare(now) < 0
      ? endDateModel.value
      : now
    nextTick(() => { syncing = false })
  }
})
watch(showEndTime, (val) => {
  if (!val) {
    endTimeModel.value = undefined
  } else if (!endDateModel.value) {
    syncing = true
    const now = getTodayCalendarDate()
    endDateModel.value = startDateModel.value && startDateModel.value.compare(now) > 0
      ? startDateModel.value
      : now
    nextTick(() => { syncing = false })
  }
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
    const start = parseFromServer(task.startDate, task.startTime)
    const end = parseFromServer(task.endDate, task.endTime)
    startDateModel.value = start.date
    endDateModel.value = end.date
    startTimeModel.value = start.time
    endTimeModel.value = end.time
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

// Convert local date+time to UTC for API, returns { date, time } strings
// When time is null, date is sent as-is (calendar date, no timezone shift)
function toApiDateTime(date: CalendarDate, time?: Time): { date: string; time: string | null } {
  if (!time) return { date: date.toString(), time: null }
  const local = new Date(date.year, date.month - 1, date.day, time.hour, time.minute, 0)
  const y = local.getUTCFullYear()
  const m = String(local.getUTCMonth() + 1).padStart(2, '0')
  const d = String(local.getUTCDate()).padStart(2, '0')
  const h = String(local.getUTCHours()).padStart(2, '0')
  const min = String(local.getUTCMinutes()).padStart(2, '0')
  return { date: `${y}-${m}-${d}`, time: `${h}:${min}:00` }
}

// Save functions
async function saveStartDateTime() {
  if (!startDateModel.value) return
  loadingStart.value = true
  const { date, time } = toApiDateTime(startDateModel.value, startTimeModel.value)
  await tasksStore.saveDateForTask({ id: props.task.id, startDate: date, startTime: time })
  loadingStart.value = false
}

async function saveEndDateTime() {
  if (!endDateModel.value) return
  loadingEnd.value = true
  const { date, time } = toApiDateTime(endDateModel.value, endTimeModel.value)
  await tasksStore.saveDateForTask({ id: props.task.id, endDate: date, endTime: time })
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
  startDateModel.value = parseFromServer(date, null).date
  endDateModel.value = parseFromServer(date, null).date
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
  startDateModel.value = parseFromServer(start, null).date
  endDateModel.value = parseFromServer(end, null).date
  nextTick(() => { syncing = false })

  activeQuickAction.value = null
}
</script>
