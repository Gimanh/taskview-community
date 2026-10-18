<template>
  <UModal
    v-model:open="isOpen"
    :title="t('tasks.move.title')"
    :fullscreen="isFullscreenModal"
    :ui="{ footer: 'justify-end!' }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField :label="t('tasks.move.project')">
          <USelectMenu
            v-model="targetGoalId"
            :items="targets"
            value-key="value"
            :placeholder="t('tasks.move.selectProject')"
            :disabled="targets.length === 0"
            :search-input="false"
            size="xl"
            class="w-full"
            data-testid="task-move-target"
          />
        </UFormField>

        <p
          v-if="targets.length === 0"
          class="text-sm text-muted"
        >
          {{ t('tasks.move.noProjects') }}
        </p>

        <div
          v-if="previewLoading"
          class="flex justify-center py-4"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-muted"
          />
        </div>
        <TaskMovePreview
          v-else-if="preview"
          :preview="preview"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="soft"
          @click="isOpen = false"
        />
        <UButton
          :label="preview?.mode === 'copy' ? t('tasks.move.submitCopy') : t('tasks.move.submitMove')"
          variant="soft"
          :disabled="!preview?.allowed"
          :loading="moving"
          data-testid="task-move-submit"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Task, TaskResponseMovePreview, TaskResponseMoveToProject } from 'taskview-api'
import { useGoalsStore } from '@/stores/goals.store'
import { useTasksStore } from '@/stores/tasks.store'
import { useTaskView } from '@/composables/useTaskView'
import { AllGoalPermissions } from '@/types/goals.types'
import TaskMovePreview from './TaskMovePreview.vue'

const props = defineProps<{
  task: Task | null
}>()

const emit = defineEmits<{
  moved: [result: TaskResponseMoveToProject]
}>()

const isOpen = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const goalsStore = useGoalsStore()
const tasksStore = useTasksStore()
const { isFullscreenModal } = useTaskView()

const targetGoalId = ref<number | undefined>(undefined)
const preview = ref<TaskResponseMovePreview | null>(null)
const previewLoading = ref(false)
const moving = ref(false)

const targets = computed(() => {
  const sourceGoal = props.task ? goalsStore.goalMap.get(props.task.goalId) : undefined
  return goalsStore.goals
    .filter((g) => g.id !== props.task?.goalId && !g.archive && g.organizationId === sourceGoal?.organizationId)
    .filter((g) => !!g.permissions[AllGoalPermissions.COMPONENT_CAN_ADD_TASKS])
    .map((g) => ({ label: g.isInbox ? t('projects.inbox') : g.name, value: g.id }))
})

watch(isOpen, (open) => {
  if (open) return
  targetGoalId.value = undefined
  preview.value = null
})

watch(targetGoalId, async (goalId) => {
  preview.value = null
  if (!goalId || !props.task) return
  previewLoading.value = true
  preview.value = await tasksStore.previewMoveToProject({ taskId: props.task.id, targetGoalId: goalId })
  previewLoading.value = false
})

async function submit() {
  if (!props.task || !targetGoalId.value || !preview.value?.allowed) return
  moving.value = true
  const result = await tasksStore.moveToProject({ taskId: props.task.id, targetGoalId: targetGoalId.value })
  moving.value = false
  if (!result) return
  isOpen.value = false
  emit('moved', result)
}
</script>
