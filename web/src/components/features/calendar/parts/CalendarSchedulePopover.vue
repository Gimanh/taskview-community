<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'start' }"
  >
    <button
      type="button"
      class="block w-full text-left"
      :data-testid="`calendar-unscheduled-pick-${task.id}`"
    >
      <CalendarTaskCard :task="task" />
    </button>

    <template #content>
      <div class="flex flex-col gap-2 p-2">
        <UCalendar
          v-model="picked"
          :week-starts-on="weekStart"
          data-testid="calendar-unscheduled-calendar"
        />
        <UButton
          icon="i-lucide-square-arrow-out-up-right"
          :label="t('calendar.unscheduled.openTask')"
          color="neutral"
          variant="ghost"
          size="sm"
          class="self-start"
          @click="openTaskDetails"
        />
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLocalTimeZone, type CalendarDate } from '@internationalized/date'
import CalendarTaskCard from '../CalendarTaskCard.vue'
import type { TaskItem } from '@/types/tasks.types'
import { useWeekStart } from '@/composables/useWeekStart'
import { useCalendarSchedule } from '@/composables/useCalendarUnscheduled'
import { droppedTaskDates } from '@/helpers/taskCalendarDates'
import { useCalendarSlotMinutes } from '@/composables/useCalendarDragStep'

const props = defineProps<{ task: TaskItem }>()
const emit = defineEmits<{ openTask: [taskId: number] }>()

const { t } = useI18n()
const weekStart = useWeekStart()
const { saveDates } = useCalendarSchedule()
const slotMinutes = useCalendarSlotMinutes()
const open = ref(false)

// A day picked here is a deadline, the same as a task dropped on a day
const picked = computed<CalendarDate | undefined>({
  get: () => undefined,
  set: (value) => {
    if (!value) return
    open.value = false
    saveDates(droppedTaskDates({ taskId: props.task.id, date: value.toDate(getLocalTimeZone()), allDay: true, minutes: slotMinutes.value }))
  },
})

function openTaskDetails() {
  open.value = false
  emit('openTask', props.task.id)
}
</script>
