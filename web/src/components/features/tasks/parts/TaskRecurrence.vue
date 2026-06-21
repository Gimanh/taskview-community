<template>
  <div class="flex items-center gap-2">
    <UButton
      :disabled="!canEditTaskDeadline"
      icon="i-lucide-repeat"
      color="neutral"
      variant="soft"
      size="xl"
      class="flex-1"
      trailing-icon="i-lucide-chevron-down"
      :ui="activatorUi('text-muted')"
      @click="dialogOpen = true"
    >
      <span
        class="flex-1 text-left"
        :class="details ? '' : 'text-muted'"
      >{{ summary }}</span>
    </UButton>
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
import { parseRruleToForm, parseRuleDtstart } from '@/helpers/recurrence'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useTasksStore } from '@/stores/tasks.store'
import { useNuxtUiTaskItemStyles } from '@/composables/useNuxtUiTaskItemStyles'

const props = defineProps<{
  task: Task
}>()

const { t } = useI18n()
const { canEditTaskDeadline } = useGoalPermissions()
const { activatorUi } = useNuxtUiTaskItemStyles()
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
    dtstart: parseRuleDtstart(rule.dtstart),
    notifyOnOccurrence: rule.notifyOnOccurrence,
    hasTime: rule.hasTime,
  })

  const unit = t(`recurrence.units.${form.frequency}`)
  const base = form.interval > 1
    ? t('recurrence.summary.everyN', { n: form.interval, unit })
    : t(`recurrence.summary.${form.frequency}`)

  const parts = [base]
  if (form.frequency === 'weekly' && form.weekdays.length > 0) {
    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    parts.push(form.weekdays.map((d) => t(`recurrence.weekdays.${dayKeys[d]}`)).join(', '))
  }
  if (form.time) parts.push(form.time)
  return parts.join(' · ')
})
</script>
