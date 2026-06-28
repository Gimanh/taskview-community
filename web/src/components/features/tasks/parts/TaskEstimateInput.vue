<template>
  <UInputNumber
    :model-value="localValue"
    :disabled="!canEdit"
    :min="0"
    :step="1"
    icon="i-lucide-gauge"
    :placeholder="t('tasks.estimatePlaceholder')"
    size="xl"
    variant="soft"
    class="w-full"
    :ui="activatorUi('text-muted')"
    @update:model-value="onInput"
    @blur="save"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTasksStore } from '@/stores/tasks.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useNuxtUiTaskItemStyles } from '@/composables/useNuxtUiTaskItemStyles'

const props = defineProps<{
  taskId: number
  goalId: number
  estimateValue: string | number | null
}>()

const { t } = useI18n()
const tasksStore = useTasksStore()
const { canEditTaskPriority } = useGoalPermissions()
const { activatorUi } = useNuxtUiTaskItemStyles()

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
