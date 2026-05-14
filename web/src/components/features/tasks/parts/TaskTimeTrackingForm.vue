<template>
  <div class="flex flex-col gap-2 pt-2">
    <div class="flex gap-2">
      <UPopover v-model:open="startOpen">
        <UButton
          :label="formattedStart"
          icon="i-lucide-calendar"
          color="neutral"
          variant="outline"
          size="sm"
          class="flex-1 justify-start"
        />
        <template #content>
          <div class="p-2 flex flex-col gap-2">
            <UCalendar
              v-model="startDate"
              :max-value="endDate"
            />
            <UInputTime
              v-model="startTime"
              :hour-cycle="24"
            />
          </div>
        </template>
      </UPopover>

      <UPopover v-model:open="endOpen">
        <UButton
          :label="formattedEnd"
          icon="i-lucide-calendar-check"
          color="neutral"
          variant="outline"
          size="sm"
          class="flex-1 justify-start"
        />
        <template #content>
          <div class="p-2 flex flex-col gap-2">
            <UCalendar
              v-model="endDate"
              :min-value="startDate"
            />
            <UInputTime
              v-model="endTime"
              :hour-cycle="24"
            />
          </div>
        </template>
      </UPopover>
    </div>

    <UFormField :label="t('timeTracking.description')">
      <UInput
        v-model="description"
        size="sm"
        class="w-full"
      />
    </UFormField>

    <UCheckbox
      v-model="billable"
      :label="t('timeTracking.billable')"
    />

    <div class="flex justify-end gap-2">
      <UButton
        :label="t('timeTracking.cancel')"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="emit('cancel')"
      />
      <UButton
        :label="submitLabel ?? t('timeTracking.save')"
        color="primary"
        size="sm"
        :disabled="!isValid"
        @click="onSubmit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@vueuse/core'
import { CalendarDate, Time } from '@internationalized/date'

export type TimeEntryFormPayload = {
  startedAt: string
  endedAt: string
  description: string
  billable: boolean
}

const props = defineProps<{
  initialStartedAt?: string
  initialEndedAt?: string
  initialDescription?: string
  initialBillable?: boolean
  submitLabel?: string
}>()

const emit = defineEmits<{
  submit: [TimeEntryFormPayload]
  cancel: []
}>()

const { t } = useI18n()

const fromIso = (iso: string | undefined): { date?: CalendarDate; time?: Time } => {
  if (!iso) return {}
  const d = new Date(iso)
  return {
    date: new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate()),
    time: new Time(d.getHours(), d.getMinutes()),
  }
}

const initialStart = fromIso(props.initialStartedAt)
const initialEnd = fromIso(props.initialEndedAt)

const startDate = shallowRef<CalendarDate | undefined>(initialStart.date)
const endDate = shallowRef<CalendarDate | undefined>(initialEnd.date)
const startTime = shallowRef<Time | undefined>(initialStart.time)
const endTime = shallowRef<Time | undefined>(initialEnd.time)
const description = ref(props.initialDescription ?? '')
const billable = ref(props.initialBillable ?? true)

const startOpen = ref(false)
const endOpen = ref(false)

const toJsDate = (date: CalendarDate | undefined, time: Time | undefined): Date | null => {
  if (!date) return null
  return new Date(date.year, date.month - 1, date.day, time?.hour ?? 0, time?.minute ?? 0)
}

const startJs = computed(() => toJsDate(startDate.value, startTime.value))
const endJs = computed(() => toJsDate(endDate.value, endTime.value))

const isValid = computed(() => {
  if (!startJs.value || !endJs.value) return false
  return endJs.value.getTime() > startJs.value.getTime()
})

const formatPair = (date: CalendarDate | undefined, time: Time | undefined, placeholder: string) => {
  if (!date) return placeholder
  const js = new Date(date.year, date.month - 1, date.day)
  const datePart = useDateFormat(js, 'DD MMM').value
  if (!time) return datePart
  const h = String(time.hour).padStart(2, '0')
  const m = String(time.minute).padStart(2, '0')
  return `${datePart} ${h}:${m}`
}

const formattedStart = computed(() => formatPair(startDate.value, startTime.value, t('timeTracking.startedAt')))
const formattedEnd = computed(() => formatPair(endDate.value, endTime.value, t('timeTracking.endedAt')))

const onSubmit = () => {
  if (!isValid.value || !startJs.value || !endJs.value) return
  emit('submit', {
    startedAt: startJs.value.toISOString(),
    endedAt: endJs.value.toISOString(),
    description: description.value,
    billable: billable.value,
  })
}
</script>
