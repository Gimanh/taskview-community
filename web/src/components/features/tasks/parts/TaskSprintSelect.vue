<template>
  <div
    v-if="canView"
    class="w-full h-fit dark:bg-tv-ui-bg-elevated shadow-sm rounded-lg p-2"
  >
    <label class="text-sm text-muted mb-2 block">{{ t('tasks.fields.sprint') }}</label>

    <USelectMenu
      v-if="canAssign"
      :model-value="currentSprintId ?? NO_SPRINT_VALUE"
      :items="sprintItems"
      :placeholder="t('tasks.fields.sprint')"
      :loading="loading"
      value-key="value"
      class="w-full"
      size="xl"
      variant="subtle"
      @update:model-value="selectSprint"
      @update:open="onOpen"
    >
      <template #leading>
        <UIcon
          name="i-lucide-rocket"
          class="size-4 text-muted"
        />
      </template>
      <template #item-label="{ item }">
        <span class="flex items-center gap-2">
          {{ item.label }}
          <UBadge
            v-if="item.status"
            :label="t(`sprints.status.${item.status}`)"
            :color="statusColor(item.status)"
            variant="subtle"
            size="sm"
          />
        </span>
      </template>
    </USelectMenu>

    <div
      v-else
      class="flex items-center gap-2 text-default px-1 py-2"
    >
      <UIcon
        name="i-lucide-rocket"
        class="size-4 text-muted"
      />
      <span>{{ currentSprintName ?? t('tasks.sprintNone') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Sprint, SprintStatus } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { useTasksStore } from '@/stores/tasks.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useGoalPermissionsFor } from '@/composables/useGoalPermissions'
import { useSprintFormat } from '@/components/features/sprints/composables/useSprintFormat'
import { logError } from '@/helpers/Helper'

const props = defineProps<{
  taskId: number
  goalId: number
  currentSprintId: number | null
}>()

const NO_SPRINT_VALUE = -1

const { t } = useI18n()
const toast = useToast()
const tasksStore = useTasksStore()
const goalsStore = useGoalsStore()
const { statusColor } = useSprintFormat()

const sprints = ref<Sprint[]>([])
const loadedGoalId = ref<number | null>(null)
const loading = ref(false)

const goal = computed(() => goalsStore.goalMap.get(props.goalId) ?? null)
const { canViewSprints: canView, canAssignSprintTasks: canAssign } = useGoalPermissionsFor(goal)

const currentSprintName = computed(() => {
  if (props.currentSprintId === null) return null
  return sprints.value.find(s => s.id === props.currentSprintId)?.name ?? null
})

const sprintItems = computed(() => [
  { label: t('tasks.sprintNone'), value: NO_SPRINT_VALUE, status: undefined as SprintStatus | undefined },
  ...sprints.value
    .filter(s => s.status !== 'completed')
    .map(s => ({ label: s.name, value: s.id, status: s.status as SprintStatus | undefined })),
])

async function loadSprints() {
  if (loadedGoalId.value === props.goalId) return
  loading.value = true
  const result = await $tvApi.sprints.listForGoal({ goalId: props.goalId }).catch(logError)
  loading.value = false
  if (!result) return
  sprints.value = result
  loadedGoalId.value = props.goalId
}

function onOpen(open: boolean) {
  if (open) loadSprints()
}

async function selectSprint(value: number) {
  const sprintId = value === NO_SPRINT_VALUE ? null : value
  if (sprintId === props.currentSprintId) return

  const result = await $tvApi.sprints
    .setTaskSprint({ taskId: props.taskId, sprintId })
    .catch(logError)

  if (!result) {
    toast.add({
      title: t('tasks.sprintUpdateFailed'),
      color: 'error',
    })
    return
  }

  const selected = tasksStore.selectedTask
  if (selected && selected.id === props.taskId) {
    selected.sprintId = sprintId
  }
}

loadSprints()
</script>
