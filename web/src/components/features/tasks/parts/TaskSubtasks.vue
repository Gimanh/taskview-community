<template>
  <div class="w-full">
    <!-- <label class="text-sm text-muted mb-2 block">{{ t('tasks.subtasks') }}</label> -->

    <!-- Subtasks List -->
    <div
      v-if="subtasks.length > 0 && canViewTaskSubtasks"
      class="space-y-2 mb-2"
    >
      <TaskSubtaskItem
        v-for="subtask in subtasks"
        :key="subtask.id"
        :ref="(el: any) => setItemRef(subtask.id, el)"
        :subtask="subtask"
        @update:description="(value) => saveDescription(subtask, value)"
        @update:complete="toggleSubtaskComplete(subtask)"
        @delete="deleteSubtask(subtask)"
      />
    </div>

    <!-- Add Subtask Button -->
    <UButton
      v-if="canAddTaskSubtasks"
      icon="i-lucide-plus"
      color="neutral"
      variant="ghost"
      class="w-full justify-start rounded-lg shadow-sm dark:bg-tv-ui-bg-elevated"
      :loading="isAdding"
      @click="addSubtask"
    >
      {{ t('tasks.addSubtask') }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTasksStore } from '@/stores/tasks.store'
import type { Task } from 'taskview-api'
import TaskSubtaskItem from '@/components/features/tasks/parts/TaskSubtaskItem.vue'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

const { 
  canAddTaskSubtasks, 
  canViewTaskSubtasks,
} = useGoalPermissions()
const props = defineProps<{
  parentTaskId: number
  goalId: number
  subtasks: Task[]
}>()

const { t } = useI18n()
const tasksStore = useTasksStore()

const isAdding = ref(false)
const itemRefs = new Map<number, InstanceType<typeof TaskSubtaskItem>>()

function setItemRef(id: number, el: InstanceType<typeof TaskSubtaskItem> | null) {
  if (el) {
    itemRefs.set(id, el)
  } else {
    itemRefs.delete(id)
  }
}

async function addSubtask() {
  isAdding.value = true

  const newSubtask = await tasksStore.addTask({
    goalId: props.goalId,
    description: 'Task',
    parentId: props.parentTaskId,
  })

  isAdding.value = false

  if (newSubtask) {
    await nextTick()
    const item = itemRefs.get(newSubtask.id)
    if (item) {
      item.focus()
    }
  }
}

async function toggleSubtaskComplete(subtask: Task) {
  await tasksStore.updateTaskCompleteStatus({
    id: subtask.id,
    complete: !subtask.complete,
  }, false)
}

async function saveDescription(subtask: Task, value: string) {
  if (value !== subtask.description) {
    await tasksStore.updateTaskDescription({
      id: subtask.id,
      description: value,
    })
  }
}

async function deleteSubtask(subtask: Task) {
  await tasksStore.deleteTask(subtask.id)
}
</script>
