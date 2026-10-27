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
import TvDateRange from '@/components/features/base/TvDateRange.vue'
import { useTasksStore } from '@/stores/tasks.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import type { DateRangeValue } from '@/types/tvDate.types'
import { fromServerDateTime, toServerDateTime } from '@/helpers/taskDateTime'

const props = defineProps<{
  task: Task
}>()

const tasksStore = useTasksStore()
const { canEditTaskDeadline } = useGoalPermissions()

const range = computed<DateRangeValue>(() => {
  const start = fromServerDateTime(props.task.startDate, props.task.startTime)
  const end = fromServerDateTime(props.task.endDate, props.task.endTime)
  return { start: start?.date, startTime: start?.time, end: end?.date, endTime: end?.time }
})

async function onUpdate(value: DateRangeValue | undefined) {
  const start = toServerDateTime(value?.start && { date: value.start, time: value.startTime })
  const end = toServerDateTime(value?.end && { date: value.end, time: value.endTime })
  await tasksStore.saveDateForTask({
    id: props.task.id,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
  })
}
</script>
