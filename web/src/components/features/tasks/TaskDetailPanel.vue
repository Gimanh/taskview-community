<template>
  <div class="h-full relative flex flex-col gap-4 @container">
    <template v-if="task">
      <!-- Title & Checkbox -->
      <div class="flex items-start gap-3 shadow-sm rounded-lg dark:bg-tv-ui-bg-elevated">
        <div class="flex-1">
          <UTextarea
            :value="task.description"
            type="text"
            variant="ghost"
            :autoresize="true"
            class="w-full"
            :class="{ 'text-muted': task.complete }"
            @blur="updateTaskTitle($event)"
          >
            <template #leading>
              <div class="h-full">
                <UCheckbox
                  :disabled="!canEditTaskStatus"
                  :model-value="!!task.complete"
                  class="mt-0.5"
                  @update:model-value="toggleComplete"
                />
              </div>
            </template>
          </UTextarea>
        </div>
      </div>

      <!-- Subtasks -->
      <TaskSubtasks
        :parent-task-id="task.id"
        :goal-id="task.goalId"
        :subtasks="task.subtasks"
        class="pl-10"
      />

      <!-- Note -->
      <NoteEditor
        :key="task.id"
        :content="task.note || ''"
        :placeholder="t('tasks.addNote')"
        @save="updateNote"
      />
    
      <div class="flex flex-col-reverse @lg:flex-row gap-4">
        <!-- Status -->
        <TaskKanbanStatusSelect
          :task-id="task.id"
          :current-status-id="task.statusId"
          class="flex-1 w-full @lg:max-w-1/2"
        />

        <!-- Priority -->
        <TaskPrioritySelect
          :model-value="task.priorityId"
          class="flex-1 w-full @lg:max-w-1/2"
          @update:model-value="updatePriority"
        />
      </div>

      <!-- Assignees -->
      <div class="flex flex-col @lg:flex-row gap-4">
        <TaskAssigneeSelect
          :task-id="task.id"
          :assigned-user-ids="task.assignedUsers"
          class="flex-1 w-full @lg:max-w-1/2"
        />

        <!-- List -->
        <TaskListSelect
          :task-id="task.id"
          :current-list-id="task.goalListId"
          class="flex-1 w-full @lg:max-w-1/2"
        />
      </div>

      <div class="flex flex-col @lg:flex-row gap-4">
        <!-- Tags -->
        <TaskTagsManager
          :task-id="task.id"
          :task-tag-ids="task.tags"
          :goal-id="projectId"
          class="flex-1 w-full @lg:max-w-1/2"
        />
        <!-- Deadline -->
        <TaskDeadline
          :task="task"
          class="flex-1 w-full @lg:max-w-1/2 h-fit"
        />
      </div>
      
      <!-- Amount -->
      <TaskAmountEditor
        :task-id="task.id"
        :amount="task.amount"
        :transaction-type="task.transactionType"
        class="flex-1"
      />

      <!-- History -->
      <TaskHistory
        :task-id="task.id"
        class="flex-1"
      />
      <br />
    </template>

    <template v-else>
      <div class="flex flex-col items-center justify-center h-full text-muted">
        <UIcon
          name="i-lucide-file-question"
          class="size-12 mb-4"
        />
        <p>{{ t('tasks.notFound') }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTasksStore } from '@/stores/tasks.store'
import NoteEditor from '@/components/features/tasks/parts/NoteEditor.vue'
import TaskPrioritySelect from '@/components/features/tasks/parts/TaskPrioritySelect.vue'
import TaskTagsManager from '@/components/features/tasks/parts/tags/TaskTagsManager.vue'
import TaskAssigneeSelect from '@/components/features/tasks/parts/TaskAssigneeSelect.vue'
import TaskListSelect from '@/components/features/tasks/parts/TaskListSelect.vue'
import TaskKanbanStatusSelect from '@/components/features/tasks/parts/TaskKanbanStatusSelect.vue'
import TaskAmountEditor from '@/components/features/tasks/parts/TaskAmountEditor.vue'
import TaskHistory from '@/components/features/tasks/parts/TaskHistory.vue'
import TaskDeadline from '@/components/features/tasks/parts/TaskDeadline.vue'
import TaskSubtasks from '@/components/features/tasks/parts/TaskSubtasks.vue'
import type { TaskBase } from 'taskview-api'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

const { t } = useI18n()
const tasksStore = useTasksStore()
const {
  canEditTaskStatus,
} = useGoalPermissions()
const task = computed(() => tasksStore.selectedTask ?? null)
const projectId = computed(() => task.value?.goalId ?? 0)

async function toggleComplete() {
  if (!task.value) return
  await tasksStore.updateTaskCompleteStatus({
    id: task.value.id,
    complete: !task.value.complete,
  })
}

async function updateTaskTitle(event: Event) {
  if (!task.value) return
  const input = event.target as HTMLInputElement
  if (input.value !== task.value.description) {
    await tasksStore.updateTaskDescription({
      id: task.value.id,
      description: input.value,
    })
  }
}

async function updateNote(note: string) {
  if (!task.value) return
  if (note !== task.value.note) {
    await tasksStore.updateTaskNote({
      id: task.value.id,
      note,
    })
  }
}

async function updatePriority(priorityId: TaskBase['priorityId']) {
  if (!task.value) return
  await tasksStore.udpatePriority({
    id: task.value.id,
    priorityId,
  })
}


</script>
