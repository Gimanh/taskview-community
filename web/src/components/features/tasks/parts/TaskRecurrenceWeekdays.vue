<template>
  <div class="flex justify-between gap-1">
    <UButton
      v-for="day in orderedDays"
      :key="day.index"
      :label="day.label"
      :color="model.includes(day.index) ? 'primary' : 'neutral'"
      :variant="model.includes(day.index) ? 'solid' : 'soft'"
      :ui="{ base: 'rounded-10 size-11 justify-center p-0 text-sm' }"
      @click="toggle(day.index)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { jsDayToRruleWeekday } from '@/helpers/recurrence'
import { useWeekStart } from '@/composables/useWeekStart'

const model = defineModel<number[]>({ required: true })

const { startWeekday } = defineProps<{
  startWeekday: number
}>()

const { t } = useI18n()
const weekStart = useWeekStart()

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const orderedDays = computed(() => {
  const offset = jsDayToRruleWeekday(weekStart.value ?? 1)
  return Array.from({ length: 7 }, (_, i) => {
    const index = (offset + i) % 7
    return { index, label: t(`recurrence.weekdays.${DAY_KEYS[index]}`) }
  })
})

function toggle(index: number) {
  const selected = model.value.includes(index)
  if (selected && model.value.length === 1) return
  model.value = selected
    ? model.value.filter((d) => d !== index)
    : [...model.value, index].sort((a, b) => a - b)
}

watch(
  () => startWeekday,
  (weekday) => {
    if (model.value.length === 0) model.value = [weekday]
  },
  { immediate: true },
)
</script>
