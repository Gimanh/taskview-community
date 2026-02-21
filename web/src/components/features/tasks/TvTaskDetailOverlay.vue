<template>
  <template v-if="canViewTaskDetails">
    <!-- Task Detail Slideover -->
    <USlideover
      v-if="displayMode === 'slideover'"
      v-model:open="isOpen"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="closeTask"
          />
          <h3 class="font-semibold">
            {{ t('tasks.details') }}
          </h3>
        </div>
      </template>

      <template #body>
        <TaskDetailPanel />
      </template>
    </USlideover>

    <!-- Task Detail Modal -->
    <UModal
      v-else
      v-model:open="isOpen"
      :fullscreen="isMobile"
      :ui="{
        overlay: 'sm:items-center sm:justify-center ',
        content: 'sm:max-w-[1100px] sm:max-h-[80vh] sm:rounded-lg sm:m-auto w-full',
        body: 'p-4!',
        footer: 'p-4!',
      }"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="font-semibold">
            {{ t('tasks.details') }}
          </h3>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="closeTask"
          />
        </div>
      </template>

      <template #body>
        <TaskDetailPanel />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            :label="t('common.delete')"
            color="error"
            variant="outline"
            @click="openDeleteDialog"
          />
          <UButton
            :label="t('common.close')"
            color="neutral"
            variant="outline"
            @click="closeTask"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Dialog -->
    <TaskDeleteDialog
      v-model:open="isDeleteDialogOpen"
      :task="task"
      @confirm="handleDelete"
    />
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import TaskDetailPanel from './TaskDetailPanel.vue'
import TaskDeleteDialog from '@/components/features/tasks/parts/TaskDeleteDialog.vue'
import { useTasksStore } from '@/stores/tasks.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useAppStore } from '@/stores/app.store'
import { provideGoalPermissions } from '@/composables/useGoalPermissions'
import { provideProjectContext } from '@/composables/useProjectContext'
import { AllGoalPermissions } from '@/types/goals.types'
import { useTaskView } from '@/composables/useTaskView'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'
import { useSelectedTaskSync } from '@/composables/useSelectedTaskSync'

const { t } = useI18n()
const tasksStore = useTasksStore()
const goalsStore = useGoalsStore()
const appStore = useAppStore()
const { isMobile } = useTaskView()
const { isOpen, closeTask } = useTaskDetailPanel()
const { broadcastRemoval } = useSelectedTaskSync()

const task = computed(() => tasksStore.selectedTask ?? null)

// Provide goal context based on the task's project so all child components
// get permissions from the task's goal, not the sidebar selection
const taskGoal = computed(() => {
  const goalId = task.value?.goalId
  return goalId ? goalsStore.goalMap.get(goalId) ?? null : null
})
provideGoalPermissions(taskGoal)

// Provide project-scoped data (tags, collaborators, statuses) for child components
// without overwriting global stores
const taskGoalId = computed(() => task.value?.goalId ?? -1)
provideProjectContext(taskGoalId)

// Compute canViewTaskDetails from the task's goal directly,
// since provide doesn't affect inject in the same component
const canViewTaskDetails = computed(() =>
  !!taskGoal.value?.permissions[AllGoalPermissions.TASK_CAN_WATCH_DETAILS],
)

const isDeleteDialogOpen = ref(false)
const { taskDetailDisplayMode: displayMode } = storeToRefs(appStore)

function openDeleteDialog() {
  isDeleteDialogOpen.value = true
}

async function handleDelete() {
  if (!task.value) return
  const taskId = task.value.id
  const success = await tasksStore.deleteTask(taskId)
  if (success) {
    broadcastRemoval(taskId)
    closeTask()
  }
}
</script>
