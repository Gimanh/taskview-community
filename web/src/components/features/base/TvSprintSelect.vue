<template>
  <TvDropdown
    v-if="canView"
    :model-value="currentSprintId"
    :items="options"
    :disabled="!canAssign"
    :placeholder="t('tasks.fields.sprint')"
    placeholder-icon="i-lucide-rocket"
    activator-icon="i-lucide-rocket"
    @update:model-value="selectSprint"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Sprint } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { useTasksStore } from '@/stores/tasks.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useGoalPermissionsFor } from '@/composables/useGoalPermissions'
import { logError } from '@/helpers/Helper'
import TvDropdown from '@/components/features/base/TvDropdown.vue'
import type { TvDropdownOption } from '@/types/tvDropdown.types'

const props = defineProps<{
  taskId: number
  goalId: number
  currentSprintId: number | null
}>()

const { t } = useI18n()
const toast = useToast()
const tasksStore = useTasksStore()
const goalsStore = useGoalsStore()

const goal = computed(() => goalsStore.goalMap.get(props.goalId) ?? null)
const { canViewSprints: canView, canAssignSprintTasks: canAssign } = useGoalPermissionsFor(goal)

const sprints = ref<Sprint[]>([])
const loadedGoalId = ref<number | null>(null)

const options = computed<TvDropdownOption<number | null>[]>(() => [
  { value: null, label: t('tasks.sprintNone'), icon: 'i-lucide-rocket', iconClass: 'text-dimmed' },
  ...sprints.value
    .filter(s => s.status !== 'completed')
    .map(s => ({
      value: s.id,
      label: s.name,
      description: s.status ? t(`sprints.status.${s.status}`) : undefined,
      icon: 'i-lucide-rocket',
      iconClass: 'text-dimmed',
    })),
])

async function loadSprints() {
  if (loadedGoalId.value === props.goalId) return
  const result = await $tvApi.sprints.listForGoal({ goalId: props.goalId }).catch(logError)
  if (!result) return
  sprints.value = result
  loadedGoalId.value = props.goalId
}

async function selectSprint(value: number | null | undefined) {
  const sprintId = value ?? null
  if (sprintId === props.currentSprintId) return

  const result = await $tvApi.sprints
    .setTaskSprint({ taskId: props.taskId, sprintId })
    .catch(logError)

  if (!result) {
    toast.add({ title: t('tasks.sprintUpdateFailed'), color: 'error' })
    return
  }

  const selected = tasksStore.selectedTask
  if (selected && selected.id === props.taskId) {
    selected.sprintId = sprintId
  }
}

watch(() => props.goalId, loadSprints, { immediate: true })
</script>
