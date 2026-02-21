<template>
  <URadioGroup
    v-if="canViewTaskPriority"
    :disabled="!canEditTaskPriority"
    :model-value="modelValue"
    :items="priorityOptions"
    :ui="{
      root: 'h-fit py-1',
      item: 'items-center', 
      fieldset: 'justify-between px-4',
      base:'size-5'
    }"
    size="xl"
    class="dark:bg-tv-ui-bg-elevated shadow-sm rounded-lg p-2 py-4"
    orientation="horizontal"
    @update:model-value="handleChange"
  >
    <template #label="{ item }">
      <UIcon
        :name="getPriorityIcon(item.value as PriorityId)"
        :class="getPriorityColor(item.value as PriorityId)"
        
        class="size-6"
      />
    </template>
  </URadioGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaskBase } from 'taskview-api'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

type PriorityId = TaskBase['priorityId']

defineProps<{
  modelValue: PriorityId | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PriorityId]
}>()

const { t } = useI18n()
const { 
  canEditTaskPriority,
  canViewTaskPriority,
} = useGoalPermissions()
const priorityOptions = computed(() => [
  { label: t('tasks.priorityLow'), value: 1 as PriorityId },
  { label: t('tasks.priorityMedium'), value: 2 as PriorityId },
  { label: t('tasks.priorityHigh'), value: 3 as PriorityId },
])

function getPriorityIcon(priority: PriorityId): string {
  switch (priority) {
  case 1:
    return 'mdi:signal-cellular-1'
  case 2:
    return 'mdi:signal-cellular-2'
  case 3:
    return 'mdi:signal-cellular-3'
  default:
    return 'mdi:signal-off'
  }
}

function getPriorityColor(priority: PriorityId): string {
  switch (priority) {
  case 1:
    return 'text-blue-500'
  case 2:
    return 'text-yellow-500'
  case 3:
    return 'text-red-500'
  default:
    return 'text-muted'
  }
}

function handleChange(value: PriorityId) {
  emit('update:modelValue', value)
}
</script>
