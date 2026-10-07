<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="t('files.linkToTask.title')"
    :ui="{ content: 'max-w-md' }"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <p class="text-sm text-muted truncate">
          {{ file?.name }}
        </p>
        <TaskDependencyPicker
          :goal-id="goalId"
          :excluded-ids="file?.linkedTaskIds ?? []"
          @select="pick"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TvFile } from 'taskview-api'
import { useTaskView } from '@/composables/useTaskView'
import TaskDependencyPicker from '@/components/features/tasks/parts/TaskDependencyPicker.vue'
import type { DependencyTask } from '@/components/features/tasks/parts/TaskDependencies.types'

defineProps<{
  goalId: number
}>()

const file = defineModel<TvFile | null>('file', { default: null })

const emit = defineEmits<{
  select: [args: { file: TvFile, taskId: number }]
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()

const open = computed({
  get: () => file.value !== null,
  set: (value: boolean) => {
    if (!value) file.value = null
  },
})

function pick(task: DependencyTask) {
  if (!file.value) return
  emit('select', { file: file.value, taskId: task.id })
  file.value = null
}
</script>
