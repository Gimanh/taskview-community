<template>
  <div class="flex flex-col gap-5">
    <div class="flex gap-1 p-1 rounded-2xl bg-elevated">
      <UButton
        v-for="opt in frequencyItems"
        :key="opt.value"
        :label="opt.label"
        color="neutral"
        variant="ghost"
        size="md"
        block
        class="flex-1"
        :ui="{ base: form.frequency === opt.value
          ? 'rounded-xl justify-center bg-default text-highlighted font-semibold shadow-sm hover:bg-default'
          : 'rounded-xl justify-center text-muted' }"
        @click="form.frequency = opt.value"
      />
    </div>

    <div class="flex items-center justify-between gap-3">
      <span class="text-base font-medium text-highlighted">{{ t('recurrence.startDate') }}</span>
      <UPopover>
        <UButton
          icon="i-lucide-calendar"
          :label="startDateLabel"
          color="neutral"
          variant="soft"
          size="md"
          class="rounded-xl"
        />
        <template #content>
          <UCalendar
            :model-value="startDateModel"
            class="p-2"
            :week-starts-on="weekStart"
            @update:model-value="onStartDateSelect"
          />
        </template>
      </UPopover>
    </div>

    <div class="flex items-center justify-between gap-3">
      <span class="text-base font-medium text-highlighted">{{ t('recurrence.repeatEvery') }}</span>
      <UInputNumber
        v-model="form.interval"
        :min="1"
        :max="99"
        orientation="horizontal"
        size="md"
        class="w-27"
        variant="soft"
        :ui="{ base: 'text-base' }"
      />
    </div>

    <TaskRecurrenceWeekdays
      v-if="form.frequency === 'weekly'"
      v-model="form.weekdays"
      :start-weekday="startWeekday"
    />

    <USelect
      v-if="form.frequency === 'monthly'"
      v-model="form.monthlyMode"
      :items="monthlyModeItems"
      size="lg"
    />

    <div class="flex flex-col gap-1.5">
      <span class="text-sm font-medium text-muted px-1">{{ t('recurrence.ends.title') }}</span>
      <template
        v-for="opt in endsItems"
        :key="opt.value"
      >
        <button
          type="button"
          class="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left transition-colors"
          :class="form.ends === opt.value ? 'bg-primary/10' : 'hover:bg-elevated'"
          @click="form.ends = opt.value"
        >
          <span
            class="flex items-center justify-center size-5 rounded-full border-2 shrink-0"
            :class="form.ends === opt.value ? 'border-primary' : 'border-default'"
          >
            <span
              v-if="form.ends === opt.value"
              class="size-2.5 rounded-full bg-primary"
            />
          </span>
          <span :class="form.ends === opt.value ? 'font-semibold text-highlighted' : 'text-default'">
            {{ opt.label }}
          </span>
        </button>

        <UInputNumber
          v-if="opt.value === 'after' && form.ends === 'after'"
          v-model="form.count"
          :min="1"
          :max="10000"
          size="md"
          class="w-32 self-end sm:self-start"
        />

        <UPopover v-else-if="opt.value === 'onDate' && form.ends === 'onDate'">
          <UButton
            icon="i-lucide-calendar"
            :label="form.untilDate ?? t('recurrence.ends.pickDate')"
            color="neutral"
            variant="outline"
            size="md"
            class="self-end sm:self-start rounded-xl"
          />
          <template #content>
            <UCalendar
              v-model="untilDateModel"
              class="p-2"
              :week-starts-on="weekStart"
            />
          </template>
        </UPopover>
      </template>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-base font-medium text-highlighted">{{ t('recurrence.specifyTime') }}</span>
      <USwitch v-model="showTime" />
    </div>

    <div
      v-if="showTime"
      class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-primary/10"
    >
      <div class="flex items-center gap-2.5">
        <UIcon
          name="i-lucide-clock"
          class="size-5 text-primary"
        />
        <span class="text-base font-medium text-highlighted">{{ t('recurrence.occurrenceTime') }}</span>
      </div>
      <UInputTime
        v-model="timeModel"
        :hour-cycle="24"
        size="md"
        variant="soft"
        :ui="{ base: 'bg-default text-highlighted font-semibold rounded-xl' }"
      />
    </div>

    <div class="flex items-center justify-between gap-3">
      <span class="text-base font-medium text-highlighted">{{ t('recurrence.notifyOnOccurrence') }}</span>
      <USwitch v-model="form.notifyOnOccurrence" />
    </div>

    <div
      v-if="preview.length"
      class="flex flex-col gap-3 p-3.5 rounded-2xl bg-elevated"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <UIcon
            name="i-lucide-calendar-check"
            class="size-5 text-primary"
          />
          <span class="text-base font-semibold text-highlighted">{{ t('recurrence.preview') }}</span>
        </div>
        <span class="text-sm text-muted">{{ t('recurrence.datesCount', { n: preview.length }) }}</span>
      </div>
      <div class="flex gap-2">
        <div
          v-for="card in previewCards"
          :key="card.key"
          class="flex-1 flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl bg-default shadow-sm"
        >
          <span class="text-xs font-semibold text-primary">{{ card.weekday }}</span>
          <span class="text-lg font-bold text-highlighted leading-none">{{ card.day }}</span>
          <span class="text-[8px] text-muted leading-none whitespace-nowrap">{{ card.monthYear }}</span>
        </div>
      </div>
      <span
        v-if="previewFooter"
        class="text-xs text-muted"
      >{{ previewFooter }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate, Time } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import { buildRruleString, jsDayToRruleWeekday, previewOccurrences } from '@/helpers/recurrence'
import { useWeekStart } from '@/composables/useWeekStart'
import TaskRecurrenceWeekdays from './TaskRecurrenceWeekdays.vue'
import type { RecurrenceEndsMode, RecurrenceFormValue, RecurrenceFrequency } from '@/types/recurrence.types'

const PREVIEW_LIMIT = 5

const form = defineModel<RecurrenceFormValue>({ required: true })

const { t, locale } = useI18n()
const weekStart = useWeekStart()

// The series start date is part of the form now; its UTC components are the
// wall-clock date (matches how the rest of the form reads dtstart).
const startDateObj = computed(() => new Date(`${form.value.startDate}T00:00:00Z`))

const frequencyItems = computed<{ label: string; value: RecurrenceFrequency }[]>(() => [
  { label: t('recurrence.freqShort.daily'), value: 'daily' },
  { label: t('recurrence.freqShort.weekly'), value: 'weekly' },
  { label: t('recurrence.freqShort.monthly'), value: 'monthly' },
  { label: t('recurrence.freqShort.yearly'), value: 'yearly' },
])

const monthlyModeItems = computed(() => [
  { label: t('recurrence.monthly.dayOfMonth', { day: startDateObj.value.getUTCDate() }), value: 'dayOfMonth' },
  { label: t('recurrence.monthly.lastDay'), value: 'lastDay' },
])

const endsItems = computed<{ label: string; value: RecurrenceEndsMode }[]>(() => [
  { label: t('recurrence.ends.never'), value: 'never' },
  { label: t('recurrence.ends.onDate'), value: 'onDate' },
  { label: t('recurrence.ends.after'), value: 'after' },
])

const startWeekday = computed(() => jsDayToRruleWeekday(startDateObj.value.getUTCDay()))

const startDateLabel = computed(() =>
  capitalize(new Intl.DateTimeFormat(locale.value, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(startDateObj.value)),
)

const startDateModel = shallowRef<CalendarDate>(parseCalendarDate(form.value.startDate))

// External resets (dialog re-inits the form on open) → keep the calendar in sync,
// but DON'T touch the weekday selection (that would clobber a saved rule).
watch(() => form.value.startDate, (value) => {
  if (value !== startDateModel.value?.toString()) startDateModel.value = parseCalendarDate(value)
})

// User picked a date: re-anchor the series. A weekly rule whose selected day no
// longer covers the new start day would silently jump to the next matching day,
// so move the anchor to the picked weekday in that case.
type CalendarSelection = DateValue | DateValue[] | { start?: DateValue; end?: DateValue } | null | undefined

function onStartDateSelect(value: CalendarSelection): void {
  if (!value || Array.isArray(value) || !('day' in value)) return
  const picked = new CalendarDate(value.year, value.month, value.day)
  startDateModel.value = picked
  form.value.startDate = picked.toString()
  const weekday = jsDayToRruleWeekday(new Date(`${picked.toString()}T00:00:00Z`).getUTCDay())
  if (!form.value.weekdays.includes(weekday)) form.value.weekdays = [weekday]
}

const untilDateModel = shallowRef<CalendarDate | undefined>(
  form.value.untilDate ? parseCalendarDate(form.value.untilDate) : undefined,
)

watch(untilDateModel, (value) => {
  form.value.untilDate = value ? value.toString() : null
})

watch(() => form.value.untilDate, (value) => {
  const next = value ? parseCalendarDate(value) : undefined
  if (next?.toString() !== untilDateModel.value?.toString()) untilDateModel.value = next
})

function parseCalendarDate(date: string): CalendarDate {
  const [year, month, day] = date.split('-').map(Number)
  return new CalendarDate(year, month, day)
}

const pad = (n: number) => String(n).padStart(2, '0')
const timeToString = (time: Time | undefined): string | null => (time ? `${pad(time.hour)}:${pad(time.minute)}` : null)
const timeFromString = (value: string | null): Time | undefined => {
  if (!value) return undefined
  const [hour, minute] = value.split(':').map(Number)
  return new Time(hour, minute)
}

const showTime = ref(form.value.time !== null)
const timeModel = shallowRef<Time | undefined>(timeFromString(form.value.time))

// External resets (dialog re-inits the form on open) → local state.
watch(() => form.value.time, (value) => {
  if (timeToString(timeModel.value) === value && showTime.value === (value !== null)) return
  showTime.value = value !== null
  timeModel.value = timeFromString(value)
})

watch(showTime, (on) => {
  if (!on) {
    timeModel.value = undefined
    if (form.value.time !== null) form.value.time = null
    return
  }
  if (!timeModel.value) timeModel.value = new Time(9, 0)
  const next = timeToString(timeModel.value)
  if (form.value.time !== next) form.value.time = next
})

watch(timeModel, (time) => {
  if (!showTime.value) return
  const next = timeToString(time)
  if (form.value.time !== next) form.value.time = next
})

const preview = computed(() => {
  const rrule = buildRruleString({ form: form.value, dtstart: startDateObj.value })
  return previewOccurrences({ rrule, dtstart: startDateObj.value, limit: PREVIEW_LIMIT })
})

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const previewCards = computed(() =>
  preview.value.map((date) => {
    const parsed = new Date(`${date}T00:00:00`)
    return {
      key: date,
      weekday: capitalize(new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(parsed)),
      day: parsed.getDate(),
      monthYear: capitalize(new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }).format(parsed)),
    }
  }),
)

const previewFooter = computed(() => {
  if (!preview.value.length) return ''
  const first = new Date(`${preview.value[0]}T00:00:00`)
  const period = capitalize(new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric' }).format(first))
  return form.value.time
    ? t('recurrence.previewFooterTime', { period, time: form.value.time })
    : period
})
</script>
