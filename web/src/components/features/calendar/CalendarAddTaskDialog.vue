<template>
  <UModal
    v-model:open="open"
    :title="t('calendar.add.title')"
    :description="when"
    :fullscreen="isMobile"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UInput
        v-model="description"
        :placeholder="t('tasks.addPlaceholder')"
        autofocus
        size="xl"
        class="w-full"
        data-testid="calendar-add-input"
        @keyup.enter="submit"
      />
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="ghost"
        @click="open = false"
      />
      <UButton
        :label="t('calendar.add.submit')"
        :loading="saving"
        :disabled="!description.trim()"
        data-testid="calendar-add-submit"
        @click="submit"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { addDays, format, isSameDay } from 'date-fns'
import type { TaskArgAdd } from 'taskview-api'
import { useCalendarStore } from '@/stores/calendar.store'
import { useTaskView } from '@/composables/useTaskView'
import type { CalendarSpan } from '@/helpers/taskCalendarDates'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ goalId: number; span: CalendarSpan | null }>()

const { t, locale } = useI18n()
const toast = useToast()
const calendarStore = useCalendarStore()
const { isMobile } = useTaskView()

const description = ref('')
const saving = ref(false)

watch(open, (isOpen) => {
  if (isOpen) description.value = ''
})

const lastDay = computed(() => (props.span?.allDay ? addDays(props.span.end, -1) : props.span?.end))

// "Thu, Oct 29", "Oct 29 – Oct 31" or "Thu, Oct 29, 10:00 – 10:30", in the user's language
const when = computed(() => {
  const span = props.span
  if (!span || !lastDay.value) return ''
  const day = new Intl.DateTimeFormat(locale.value, { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Intl.DateTimeFormat(locale.value, { hour: 'numeric', minute: '2-digit' })
  if (span.allDay) {
    return isSameDay(span.start, lastDay.value) ? day.format(span.start) : `${day.format(span.start)} – ${day.format(lastDay.value)}`
  }
  return isSameDay(span.start, span.end)
    ? `${day.format(span.start)}, ${time.format(span.start)} – ${time.format(span.end)}`
    : `${day.format(span.start)}, ${time.format(span.start)} – ${day.format(span.end)}, ${time.format(span.end)}`
})

// Same storage as the date picker: one day is a deadline; times are saved in UTC
function datesFor(span: CalendarSpan, last: Date): Partial<TaskArgAdd> {
  if (span.allDay) {
    const start = format(span.start, 'yyyy-MM-dd')
    const end = format(last, 'yyyy-MM-dd')
    return start === end ? { endDate: end } : { startDate: start, endDate: end }
  }
  const start = span.start.toISOString()
  const end = span.end.toISOString()
  return {
    startDate: start.slice(0, 10),
    startTime: `${start.slice(11, 16)}:00`,
    endDate: end.slice(0, 10),
    endTime: `${end.slice(11, 16)}:00`,
  }
}

async function submit() {
  const name = description.value.trim()
  if (!name || !props.span || !lastDay.value || saving.value) return
  saving.value = true
  const created = await calendarStore.addTask({ goalId: props.goalId, description: name, ...datesFor(props.span, lastDay.value) })
  saving.value = false
  if (!created) {
    toast.add({ title: t('calendar.add.error'), color: 'error' })
    return
  }
  open.value = false
}
</script>
