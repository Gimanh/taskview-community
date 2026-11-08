<template>
  <section
    class="flex flex-col gap-2 border-t border-default px-1 pt-3 pb-28"
    data-testid="calendar-day-agenda"
  >
    <h3 class="px-1 text-sm font-semibold text-highlighted first-letter:uppercase">
      {{ dayTitle }}
    </h3>

    <button
      v-for="event in events"
      :key="event.id"
      type="button"
      class="w-full rounded-10 text-left focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
      @click="emit('open', event.extendedProps.task.id)"
    >
      <CalendarTaskCard
        :task="event.extendedProps.task"
        :time-text="timeText(event)"
        v-bind="cardProps?.(event.extendedProps.task)"
      />
    </button>

    <div
      v-if="!events.length"
      class="flex flex-col items-center gap-2 py-8 text-center"
      data-testid="calendar-day-agenda-empty"
    >
      <p class="text-sm text-muted">
        {{ t('calendar.agenda.empty') }}
      </p>
      <UButton
        v-if="canCreate"
        :label="t('calendar.add.submit')"
        icon="i-lucide-plus"
        color="neutral"
        variant="soft"
        size="md"
        @click="emit('add')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CalendarTaskCard from '../CalendarTaskCard.vue'
import type { TaskCalendarEvent } from '@/helpers/taskCalendarDates'
import type { TaskItem } from '@/types/tasks.types'

const props = defineProps<{
  day: Date
  events: TaskCalendarEvent[]
  canCreate: boolean
  // Extra card props, e.g. the project's name and color when tasks of several projects mix
  cardProps?: (task: TaskItem) => Record<string, unknown>
}>()

const emit = defineEmits<{
  open: [taskId: number]
  add: []
}>()

const { t, locale } = useI18n()

const dayTitle = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }).format(props.day))

function timeText(event: TaskCalendarEvent): string | undefined {
  if (event.allDay) return undefined
  const time = new Intl.DateTimeFormat(locale.value, { hour: 'numeric', minute: '2-digit' })
  const start = time.format(new Date(event.start))
  return event.end ? `${start} – ${time.format(new Date(event.end))}` : start
}
</script>
