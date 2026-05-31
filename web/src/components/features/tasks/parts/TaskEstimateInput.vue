<template>
  <div class="w-full h-fit dark:bg-tv-ui-bg-elevated shadow-sm rounded-lg p-2">
    <label class="text-sm text-muted mb-2 flex items-center gap-1">
      <UIcon
        name="i-lucide-gauge"
        class="size-4"
      />
      {{ t('tasks.fields.estimate') }}
      <span>({{ unitLabel(unit, true) }})</span>
    </label>

    <UInputNumber
      :model-value="localValue"
      :disabled="!canEdit"
      :min="0"
      :step="1"
      :placeholder="t('tasks.estimatePlaceholder')"
      size="xl"
      class="w-full"
      :variant="isDark ? 'subtle' : 'soft'"
      @update:model-value="onInput"
      @blur="save"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTasksStore } from '@/stores/tasks.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useColor } from '@/composables/useColotMode'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useSprintFormat } from '@/components/features/sprints/composables/useSprintFormat'

const props = defineProps<{
  taskId: number
  goalId: number
  estimateValue: string | number | null
}>()

const { t } = useI18n()
const tasksStore = useTasksStore()
const goalsStore = useGoalsStore()
const { isDark } = useColor()
const { canEditTaskPriority } = useGoalPermissions()
const { unitLabel } = useSprintFormat()

const unit = computed(() => goalsStore.goalMap.get(props.goalId)?.estimateUnit ?? 'points')

const canEdit = canEditTaskPriority

function toNumber(value: string | number | null): number | null {
  if (value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const localValue = ref<number | null>(toNumber(props.estimateValue))

watch(() => props.estimateValue, (value) => {
  localValue.value = toNumber(value)
})

function onInput(value: number | null) {
  localValue.value = value
}

async function save() {
  const next = localValue.value
  if (next === toNumber(props.estimateValue)) return

  await tasksStore.updateTaskEstimate({
    id: props.taskId,
    estimateValue: next,
  })
}
</script>
