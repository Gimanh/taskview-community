<template>
  <TvDateRange
    :model-value="range"
    :disabled="!canEditTaskDeadline"
    @update:model-value="onUpdate"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from 'taskview-api'
import { CalendarDate } from '@internationalized/date'
import TvDateRange from '@/components/features/base/TvDateRange.vue'
import { useTasksStore } from '@/stores/tasks.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import type { DateRangeValue } from '@/types/tvDate.types'

const props = defineProps<{
  task: Task
}>()

const tasksStore = useTasksStore()
const { canEditTaskDeadline } = useGoalPermissions()

function parse(dateStr: string | null | undefined): CalendarDate | undefined {
  if (!dateStr) return undefined
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new CalendarDate(year, month, day)
}

const range = computed<DateRangeValue>(() => ({
  start: parse(props.task.startDate),
  end: parse(props.task.endDate),
}))

async function onUpdate(value: DateRangeValue | undefined) {
  const v = value ?? null
  await tasksStore.saveDateForTask({
    id: props.task.id,
    startDate: v?.start ? v.start.toString() : null,
    startTime: v?.start ? props.task.startTime : null,
    endDate: v?.end ? v.end.toString() : null,
    endTime: v?.end ? props.task.endTime : null,
  })
}
</script>
