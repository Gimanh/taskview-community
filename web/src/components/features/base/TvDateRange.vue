<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'start' }"
    :ui="{ content: 'rounded-2xl' }"
  >
    <UButton
      :disabled="disabled"
      color="neutral"
      variant="soft"
      block
      size="xl"
      icon="i-lucide-calendar"
      :trailing-icon="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
      :ui="activatorUi('text-muted')"
      data-testid="date-range-trigger"
    >
      <span class="flex-1 flex items-center gap-2 text-left font-medium">
        <template v-if="isRange">
          <span :class="model?.start ? '' : 'text-muted'">{{ startLabel }}</span>
          <UIcon
            name="i-lucide-arrow-right"
            class="size-3.5 shrink-0 text-dimmed"
          />
          <span :class="model?.end ? '' : 'text-muted'">{{ endLabel }}</span>
        </template>
        <span
          v-else
          :class="model?.end ? '' : 'text-muted'"
        >{{ endLabel }}</span>
      </span>
    </UButton>

    <template #content>
      <!-- With times on it can outgrow the space below the trigger: scroll instead of getting cut off -->
      <div class="flex max-h-[var(--reka-popover-content-available-height)] flex-col gap-3 overflow-y-auto p-3">
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="q in quickRanges"
            :key="q.key"
            color="neutral"
            variant="soft"
            size="xs"
            :label="q.label"
            @click="applyQuick(q.key)"
          />
        </div>

        <UCalendar
          v-if="isRange"
          v-model="rangeModel"
          range
          :week-starts-on="weekStart"
        />
        <UCalendar
          v-else
          v-model="singleModel"
          :week-starts-on="weekStart"
        />

        <div
          v-if="showTime"
          class="flex items-center gap-2"
        >
          <template v-if="isRange">
            <UInputTime
              v-model="startTimeModel"
              :hour-cycle="24"
              :disabled="!model?.start"
              :aria-label="t('deadline.startTime')"
              data-testid="date-range-start-time"
            />
            <UIcon
              name="i-lucide-arrow-right"
              class="size-3.5 shrink-0 text-dimmed"
            />
          </template>
          <UInputTime
            v-model="endTimeModel"
            :hour-cycle="24"
            :disabled="!model?.end"
            :aria-label="t('deadline.endTime')"
            data-testid="date-range-end-time"
          />
        </div>

        <div class="flex items-center justify-between gap-2 pt-1">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <UCheckbox
              v-model="isRange"
              size="md"
              :ui="{ root: 'items-center' }"
              :label="t('deadline.selectRange')"
            />
            <UCheckbox
              v-model="showTime"
              size="md"
              :ui="{ root: 'items-center' }"
              :label="t('deadline.selectTime')"
              data-testid="date-range-time-toggle"
            />
          </div>
          <UButton
            v-if="model?.start || model?.end"
            icon="i-lucide-x"
            :label="t('common.delete')"
            color="error"
            variant="ghost"
            size="sm"
            @click="clear"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@vueuse/core'
import {
  type CalendarDate,
  Time,
  today,
  getLocalTimeZone,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from '@internationalized/date'
import { useWeekStart } from '@/composables/useWeekStart'
import { useNuxtUiTaskItemStyles } from '@/composables/useNuxtUiTaskItemStyles'
import type { DateRangeValue } from '@/types/tvDate.types'

const model = defineModel<DateRangeValue>()

const { disabled = false } = defineProps<{
  disabled?: boolean
}>()

const { t } = useI18n()
const weekStart = useWeekStart()
const { activatorUi } = useNuxtUiTaskItemStyles()

const open = ref(false)
// A task that already has a start date opens in range mode; in single-date mode,
// picking a day would silently drop that start date
const isRange = ref(Boolean(model.value?.start))
watch(() => model.value?.start, (start) => {
  isRange.value = Boolean(start)
})

// drop the start date when switching back to single-date mode
watch(isRange, (on) => {
  if (!on && model.value?.start) {
    model.value = { start: undefined, end: model.value.end, endTime: model.value.endTime }
  }
})

// Times stay hidden until asked for, and show by themselves when the task already has one
const hasTime = (value: DateRangeValue | undefined) => Boolean(value?.startTime || value?.endTime)
const showTime = ref(hasTime(model.value))
watch(() => hasTime(model.value), (has) => {
  showTime.value = has
})

// With times on, a date without a time starts at 09:00 (a range ends at 10:00)
function withDefaultTimes(value: NonNullable<DateRangeValue>): NonNullable<DateRangeValue> {
  if (!showTime.value) return value
  return {
    ...value,
    startTime: value.start ? value.startTime ?? new Time(9, 0) : undefined,
    endTime: value.end ? value.endTime ?? new Time(value.start ? 10 : 9, 0) : undefined,
  }
}

// Turning times off clears them. Turning them on adds the default times, or waits for a date to be picked
watch(showTime, (on) => {
  const value = model.value
  if ((!value?.start && !value?.end) || on === hasTime(value)) return
  model.value = on ? withDefaultTimes(value) : { ...value, startTime: undefined, endTime: undefined }
})

// UInputTime may hand back a richer date-time value; only the hour and minute are kept
const toTime = (value: { hour: number, minute: number } | null | undefined) =>
  value ? new Time(value.hour, value.minute) : undefined

const startTimeModel = computed({
  get: () => model.value?.startTime,
  set: (value) => {
    if (model.value) model.value = { ...model.value, startTime: toTime(value) }
  },
})

const endTimeModel = computed({
  get: () => model.value?.endTime,
  set: (value) => {
    if (model.value) model.value = { ...model.value, endTime: toTime(value) }
  },
})

// single-date mode fills the END date (the deadline)
const singleModel = computed<CalendarDate | undefined>({
  get: () => model.value?.end,
  set: (date) => {
    model.value = date
      ? withDefaultTimes({ start: undefined, end: date, endTime: model.value?.endTime })
      : { start: undefined, end: undefined }
    // With times on, keep the popover open so the time can be set too
    if (date && !showTime.value) open.value = false
  },
})

// The first click of a new range only sets its start. Hold it here until the end is picked, so a
// half-chosen range isn't saved, which would drop the end date and its time.
const pendingRange = shallowRef<DateRangeValue>(null)
watch(open, (isOpen) => {
  if (!isOpen) pendingRange.value = null
})

const rangeModel = computed<DateRangeValue>({
  get: () => pendingRange.value ?? { start: model.value?.start, end: model.value?.end },
  set: (value) => {
    if (value?.start && !value.end) {
      pendingRange.value = value
      return
    }
    pendingRange.value = null
    model.value = value ? withDefaultTimes({ ...value, startTime: model.value?.startTime, endTime: model.value?.endTime }) : null
    if (value?.start && value?.end && !showTime.value) open.value = false
  },
})

const format = (date?: CalendarDate): string =>
  // new Date('YYYY-MM-DD') would read the day as UTC midnight, a day early west of UTC
  date ? useDateFormat(date.toDate(getLocalTimeZone()), 'DD MMM').value : ''

const formatTime = (time?: Time): string => time ? time.toString().slice(0, 5) : ''
const withTime = (date: string, time?: Time): string => time ? `${date}, ${formatTime(time)}` : date

const startLabel = computed(() => model.value?.start
  ? withTime(format(model.value.start), model.value.startTime)
  : t('deadline.startDate'))
const endLabel = computed(() => {
  const value = model.value
  if (!value?.end) return isRange.value ? t('deadline.endDate') : t('tasks.deadline')
  // A same-day time range reads "20 Oct, 11:00 → 12:00"
  if (isRange.value && value.start?.compare(value.end) === 0 && value.endTime) return formatTime(value.endTime)
  return withTime(format(value.end), value.endTime)
})

type QuickKey = 'today' | 'tomorrow' | 'week' | 'month'

const quickRanges = computed<{ key: QuickKey, label: string }[]>(() => [
  { key: 'today', label: t('deadline.today') },
  { key: 'tomorrow', label: t('deadline.tomorrow') },
  { key: 'week', label: t('deadline.thisWeek') },
  { key: 'month', label: t('deadline.thisMonth') },
])

function applyQuick(key: QuickKey) {
  const t0 = today(getLocalTimeZone())
  if (key === 'today') commit(t0, t0)
  else if (key === 'tomorrow') {
    const d = t0.add({ days: 1 })
    commit(d, d)
  }
  else if (key === 'week') commit(startOfWeek(t0, 'ru-RU'), endOfWeek(t0, 'ru-RU'))
  else commit(startOfMonth(t0), endOfMonth(t0))
}

// in single mode keep only the end date; in range mode keep both
function commit(start: CalendarDate, end: CalendarDate) {
  const { startTime, endTime } = model.value ?? {}
  model.value = withDefaultTimes(isRange.value ? { start, end, startTime, endTime } : { start: undefined, end, endTime })
  if (!showTime.value) open.value = false
}

function clear() {
  model.value = null
}
</script>
