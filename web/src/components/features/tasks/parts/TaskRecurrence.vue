<template>
  <div class="flex items-center gap-2">
    <UButton
      :disabled="!canEditTaskDeadline"
      icon="i-lucide-repeat"
      :label="summary"
      color="neutral"
      :variant="isDark ? 'subtle' : 'outline'"
      class="flex-1 justify-start"
      size="xl"
      @click="dialogOpen = true"
    />
    <UBadge
      v-if="details?.rule.state === 'paused'"
      :label="t('recurrence.paused')"
      color="warning"
      variant="subtle"
      size="md"
    />
    <UBadge
      v-else-if="details?.rule.state === 'ended'"
      :label="t('recurrence.ended')"
      color="neutral"
      variant="subtle"
      size="md"
    />

    <TaskRecurrenceDialog
      v-model:open="dialogOpen"
      :task="task"
      :rule="details?.rule ?? null"
      @changed="reload"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RecurrenceRuleDetails, Task } from 'taskview-api'
import TaskRecurrenceDialog from './TaskRecurrenceDialog.vue'
import { parseRruleToForm } from '@/helpers/recurrence'
import { useColor } from '@/composables/useColotMode'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useTasksStore } from '@/stores/tasks.store'

const props = defineProps<{
  task: Task
}>()

const { t } = useI18n()
const { isDark } = useColor()
const { canEditTaskDeadline } = useGoalPermissions()
const tasksStore = useTasksStore()

const dialogOpen = ref(false)
const details = ref<RecurrenceRuleDetails | null>(null)

watch(
  () => props.task.recurrenceRuleId,
  () => reload(),
  { immediate: true },
)

async function reload() {
  details.value = props.task.recurrenceRuleId
    ? await tasksStore.fetchRecurrenceForTask(props.task.id)
    : null
}

const summary = computed(() => {
  if (!details.value) return t('recurrence.noRepeat')

  const rule = details.value.rule
  const form = parseRruleToForm({
    rrule: rule.rrule,
    dtstart: new Date(`${rule.dtstart.replace(' ', 'T')}Z`),
    notifyOnOccurrence: rule.notifyOnOccurrence,
    hasTime: rule.hasTime,
  })

  const unit = t(`recurrence.units.${form.frequency}`)
  const base = form.interval > 1
    ? t('recurrence.summary.everyN', { n: form.interval, unit })
    : t(`recurrence.summary.${form.frequency}`)

  if (form.frequency === 'weekly' && form.weekdays.length > 0) {
    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    const days = form.weekdays.map((d) => t(`recurrence.weekdays.${dayKeys[d]}`)).join(', ')
    return `${base} · ${days}`
  }
  return base
})
</script>
