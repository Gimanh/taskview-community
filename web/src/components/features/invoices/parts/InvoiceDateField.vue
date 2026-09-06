<template>
  <UFormField
    :label="label"
    :required="required"
    class="flex-1"
  >
    <UPopover v-model:open="open">
      <UButton
        icon="i-lucide-calendar"
        :label="formatted"
        color="neutral"
        :variant="dateButtonVariant"
        size="xl"
        :disabled="disabled"
        class="w-full"
        :ui="dateButtonUi"
      />
      <template #content>
        <UCalendar
          v-model="dateModel"
          :min-value="toCalendarDate(minDate ?? null)"
          :week-starts-on="weekStart"
          class="p-2"
        />
      </template>
    </UPopover>
  </UFormField>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useDateFormat } from '@vueuse/core'
import { CalendarDate } from '@internationalized/date'
import { useWeekStart } from '@/composables/useWeekStart'
import { useInvoiceFieldStyle } from '@/composables/useInvoiceFieldStyle'

const model = defineModel<string | null>({ required: true })

const props = defineProps<{
  label: string
  minDate?: string | null
  disabled?: boolean
  required?: boolean
}>()

const weekStart = useWeekStart()
const { dateButtonVariant, dateButtonUi } = useInvoiceFieldStyle()
const open = ref(false)

function toCalendarDate(value: string | null): CalendarDate | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new CalendarDate(year, month, day)
}

const dateModel = shallowRef<CalendarDate | undefined>(toCalendarDate(model.value))

watch(dateModel, (value) => {
  model.value = value ? value.toString() : null
  if (value) open.value = false
})

watch(model, (value) => {
  const next = toCalendarDate(value)
  if (next?.toString() !== dateModel.value?.toString()) dateModel.value = next
})

const formatted = computed(() =>
  dateModel.value
    ? useDateFormat(new Date(dateModel.value.toString()), 'DD MMM YYYY').value
    : props.label,
)
</script>
