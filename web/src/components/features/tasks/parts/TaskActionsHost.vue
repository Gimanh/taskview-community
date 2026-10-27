<template>
  <TvContextMenu ref="contextMenu">
    <div
      v-if="actionTask"
      class="p-1 flex flex-col gap-1"
    >
      <UButton
        v-if="canMove(actionTask)"
        :label="t('tasks.move.button')"
        data-testid="task-menu-move"
        icon="i-lucide-folder-input"
        variant="ghost"
        color="neutral"
        class="w-full justify-start"
        @click="handleMenuMove"
      />
      <USeparator
        v-if="canMove(actionTask) && canDelete(actionTask)"
        class="my-1"
      />
      <UButton
        v-if="canDelete(actionTask)"
        :label="t('common.delete')"
        data-testid="task-menu-delete"
        icon="i-lucide-trash-2"
        variant="ghost"
        color="error"
        class="w-full justify-start"
        @click="handleMenuDelete"
      />
    </div>
  </TvContextMenu>

  <TaskDeleteDialog
    v-if="renderDeleteDialog"
    v-model:open="isDeleteDialogOpen"
    :task="actionTask"
    @confirm="handleDelete"
    @after:leave="renderDeleteDialog = false"
  />

  <TaskMoveDialog
    v-if="renderMoveDialog"
    v-model:open="isMoveDialogOpen"
    :task="actionTask"
    @moved="handleMoved"
    @after:leave="renderMoveDialog = false"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ALL_TASKS_LIST_ID, type TaskResponseMoveToProject } from 'taskview-api'
import TvContextMenu from '@/components/features/base/TvContextMenu.vue'
import TaskDeleteDialog from './TaskDeleteDialog.vue'
import TaskMoveDialog from './TaskMoveDialog.vue'
import { useTasksStore } from '@/stores/tasks.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useTaskActions } from '@/composables/useTaskActions'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'
import { useTaskRemovalBroadcast } from '@/composables/useSelectedTaskSync'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const tasksStore = useTasksStore()
const goalsStore = useGoalsStore()
const organizationStore = useOrganizationStore()
const { activeTaskId, closeTask } = useTaskDetailPanel()
const { broadcastRemoval } = useTaskRemovalBroadcast()
const {
  actionTask,
  menuRequest,
  isMoveDialogOpen,
  isDeleteDialogOpen,
  canDelete,
  canMove,
  requestMove,
  requestDelete,
} = useTaskActions()

const contextMenu = ref<InstanceType<typeof TvContextMenu>>()

// A teleported dialog keeps the body position from its first mount; mounting on open
// puts it above the task dialog, which is mounted later than this host
const renderDeleteDialog = ref(false)
const renderMoveDialog = ref(false)
watch(isDeleteDialogOpen, (open) => {
  if (open) renderDeleteDialog.value = true
})
watch(isMoveDialogOpen, (open) => {
  if (open) renderMoveDialog.value = true
})

watch(menuRequest, (request) => {
  if (request) contextMenu.value?.openAtPoint(request.point)
})

function handleMenuMove() {
  contextMenu.value?.close()
  if (actionTask.value) requestMove(actionTask.value)
}

function handleMenuDelete() {
  contextMenu.value?.close()
  if (actionTask.value) requestDelete(actionTask.value)
}

function closeIfOpened(taskId: number) {
  if (activeTaskId.value === taskId) closeTask()
}

async function handleDelete() {
  if (!actionTask.value) return
  const taskId = actionTask.value.id
  const success = await tasksStore.deleteTask(taskId)
  if (success) {
    broadcastRemoval(taskId)
    closeIfOpened(taskId)
  }
}

function handleMoved(result: TaskResponseMoveToProject) {
  const project = goalsStore.goalMap.get(result.goalId)?.name ?? ''
  const open = async () => {
    await router.push({
      name: 'user',
      params: {
        orgSlug: organizationStore.currentOrgSlug,
        projectId: String(result.goalId),
        listId: String(ALL_TASKS_LIST_ID),
        taskId: String(result.taskId),
      },
    })
  }

  isMoveDialogOpen.value = false
  if (result.mode === 'move') {
    const sourceTaskId = actionTask.value?.id ?? result.taskId
    tasksStore.removeTaskLocally(sourceTaskId)
    broadcastRemoval(sourceTaskId)
    closeIfOpened(sourceTaskId)
  }
  toast.add({
    title: t(result.mode === 'move' ? 'tasks.move.moved' : 'tasks.move.copied', { project }),
    color: 'success',
    actions: [{ label: t('tasks.move.open'), onClick: open }],
  })
}
</script>
