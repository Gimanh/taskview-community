<template>
  <div class="flex flex-col gap-4">
    <div class="flex gap-2">
      <USelect
        v-model="form.frequency"
        :items="frequencyItems"
        class="flex-1"
        size="lg"
      />
      <UInputNumber
        v-model="form.interval"
        :min="1"
        :max="99"
        class="w-28"
        size="lg"
      />
    </div>

    <div
      v-if="form.frequency === 'weekly'"
      class="flex flex-wrap gap-1.5"
    >
      <UButton
        v-for="(day, index) in weekdayLabels"
        :key="day"
        :label="day"
        :color="form.weekdays.includes(index) ? 'primary' : 'neutral'"
        :variant="form.weekdays.includes(index) ? 'solid' : 'outline'"
        size="sm"
        @click="toggleWeekday(index)"
      />
    </div>

    <USelect
      v-if="form.frequency === 'monthly'"
      v-model="form.monthlyMode"
      :items="monthlyModeItems"
      size="lg"
    />

    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium">{{ t('recurrence.ends.title') }}</span>
      <URadioGroup
        v-model="form.ends"
        :items="endsItems"
      />
      <UInputNumber
        v-if="form.ends === 'after'"
        v-model="form.count"
        :min="1"
        :max="10000"
        class="w-40"
        size="md"
      />
      <UPopover v-if="form.ends === 'onDate'">
        <UButton
          icon="i-lucide-calendar"
          :label="form.untilDate ?? t('recurrence.ends.pickDate')"
          color="neutral"
          variant="outline"
          class="self-start"
          size="md"
        />
        <template #content>
          <UCalendar
            v-model="untilDateModel"
            class="p-2"
            :week-starts-on="weekStart"
          />
        </template>
      </UPopover>
    </div>

    <div class="flex flex-col gap-2">
      <UCheckbox
        v-model="showTime"
        :label="t('recurrence.selectTime')"
        :ui="{ root: 'items-center' }"
      />
      <UInputTime
        v-if="showTime"
        v-model="timeModel"
        :hour-cycle="24"
        class="self-start"
      />
    </div>

    <UCheckbox
      v-model="form.notifyOnOccurrence"
      :label="t('recurrence.notifyOnOccurrence')"
      :ui="{ root: 'items-center' }"
    />

    <div
      v-if="preview.length"
      class="flex flex-col gap-1 rounded-lg p-3 bg-elevated"
    >
      <span class="text-sm font-medium">{{ t('recurrence.preview') }}</span>
      <span
        v-for="date in preview"
        :key="date"
        class="text-sm text-muted"
      >
        {{ formatPreviewDate(date) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@vueuse/core'
import { CalendarDate, Time } from '@internationalized/date'
import { buildRruleString, previewOccurrences } from '@/helpers/recurrence'
import { useWeekStart } from '@/composables/useWeekStart'
import type { RecurrenceFormValue } from '@/types/recurrence.types'

const PREVIEW_LIMIT = 5

const form = defineModel<RecurrenceFormValue>({ required: true })

const props = defineProps<{
  dtstart: Date
}>()

const { t } = useI18n()
const weekStart = useWeekStart()

const frequencyItems = computed(() => [
  { label: t('recurrence.frequency.daily'), value: 'daily' },
  { label: t('recurrence.frequency.weekly'), value: 'weekly' },
  { label: t('recurrence.frequency.monthly'), value: 'monthly' },
  { label: t('recurrence.frequency.yearly'), value: 'yearly' },
])

const monthlyModeItems = computed(() => [
  { label: t('recurrence.monthly.dayOfMonth', { day: props.dtstart.getUTCDate() }), value: 'dayOfMonth' },
  { label: t('recurrence.monthly.lastDay'), value: 'lastDay' },
])

const endsItems = computed(() => [
  { label: t('recurrence.ends.never'), value: 'never' },
  { label: t('recurrence.ends.after'), value: 'after' },
  { label: t('recurrence.ends.onDate'), value: 'onDate' },
])

const weekdayLabels = computed(() => [
  t('recurrence.weekdays.mon'),
  t('recurrence.weekdays.tue'),
  t('recurrence.weekdays.wed'),
  t('recurrence.weekdays.thu'),
  t('recurrence.weekdays.fri'),
  t('recurrence.weekdays.sat'),
  t('recurrence.weekdays.sun'),
])

function toggleWeekday(index: number) {
  const selected = form.value.weekdays.includes(index)
  if (selected && form.value.weekdays.length === 1) return
  form.value.weekdays = selected
    ? form.value.weekdays.filter((d) => d !== index)
    : [...form.value.weekdays, index].sort((a, b) => a - b)
}

const untilDateModel = shallowRef<CalendarDate | undefined>(
  form.value.untilDate ? parseCalendarDate(form.value.untilDate) : undefined,
)

watch(untilDateModel, (value) => {
  form.value.untilDate = value ? value.toString() : null
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
  const rrule = buildRruleString({ form: form.value, dtstart: props.dtstart })
  return previewOccurrences({ rrule, dtstart: props.dtstart, limit: PREVIEW_LIMIT })
})

function formatPreviewDate(date: string): string {
  return useDateFormat(new Date(`${date}T00:00:00`), 'ddd, DD MMM YYYY').value
}
</script>
