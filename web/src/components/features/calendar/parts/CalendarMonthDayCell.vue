<template>
  <div
    class="flex w-full flex-col items-center gap-1 py-1"
    :data-testid="`calendar-day-${format(date, 'yyyy-MM-dd')}`"
  >
    <span
      class="inline-flex size-7 items-center justify-center rounded-full text-sm tabular-nums"
      :class="numberClass"
    >{{ dayNumberText }}</span>
    <span class="flex h-1.5 gap-0.5">
      <span
        v-for="(color, index) in dots"
        :key="index"
        class="size-1.5 rounded-full"
        :style="{ backgroundColor: color }"
        data-testid="calendar-day-dot"
      />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'

const props = defineProps<{
  date: Date
  dayNumberText: string
  isToday: boolean
  // A day of the previous or next month, shown to fill the grid
  isOther: boolean
  selected: boolean
  // One color per task, a few at most
  dots: string[]
}>()

const numberClass = computed(() => {
  if (props.selected) return props.isToday ? 'bg-primary font-semibold text-inverted' : 'bg-inverted font-semibold text-inverted'
  if (props.isToday) return 'font-semibold text-primary'
  return props.isOther ? 'text-dimmed' : 'text-default'
})
</script>
