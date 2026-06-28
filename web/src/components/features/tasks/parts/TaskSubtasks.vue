<template>
  <div class="w-full">
    <div
      v-if="subtasks.length > 0 && canViewTaskSubtasks"
      class="flex items-center justify-between mb-2"
    >
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-list-checks"
          class="size-4.5 text-muted"
        />
        <span class="text-[15px] font-semibold text-highlighted">{{ t('tasks.subtasks') }}</span>
      </div>
      <span class="text-sm font-medium text-muted">{{ completedCount }}/{{ subtasks.length }}</span>
    </div>

    <div
      v-if="subtasks.length > 0 && canViewTaskSubtasks"
      class="h-1.5 rounded-full bg-elevated overflow-hidden mb-3"
    >
      <div
        class="h-full rounded-full bg-primary transition-[width] duration-300"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>

    <!-- Subtasks List -->
    <div
      v-if="subtasks.length > 0 && canViewTaskSubtasks"
      class="space-y-2 mb-2"
      data-testid="subtasks-list"
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
      variant="soft"
      size="xl"
      class="w-full justify-start rounded-14 shadow-sm dark:bg-tv-ui-bg-elevated"
      data-testid="add-subtask-button"
      :loading="isAdding"
      @click="addSubtask"
    >
      {{ t('tasks.addSubtask') }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
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

const completedCount = computed(() => props.subtasks.filter(subtask => subtask.complete).length)
const progressPercent = computed(() =>
  props.subtasks.length === 0 ? 0 : Math.round((completedCount.value / props.subtasks.length) * 100),
)

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
