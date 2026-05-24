<template>
  <div class="h-full relative flex flex-col gap-4 @container">
    <template v-if="task">
      <!-- Title & Checkbox -->
      <div class="flex items-start gap-3 shadow-sm rounded-lg dark:bg-tv-ui-bg-elevated">
        <div class="flex-1">
          <UTextarea
            v-model="titleValue"
            type="text"
            variant="ghost"
            :autoresize="true"
            class="w-full"
            :class="{ 'text-muted': task.complete }"
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
      <!-- Source link (GitHub/GitLab issue) -->
      <a
        v-if="task.sourceUrl"
        :href="task.sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 mb-2 text-sm text-muted hover:text-default transition-colors"
      >
        <UIcon
          :name="task.sourceUrl.includes('github') ? 'i-lucide-github' : task.sourceUrl.includes('gitlab') ? 'i-lucide-gitlab' : 'i-lucide-external-link'"
          class="size-4 shrink-0"
        />
        <span class="truncate underline underline-offset-2">{{ task.sourceUrl }}</span>
      </a>

      <div class="grid grid-cols-1 @lg:grid-cols-2 gap-4">
        <template
          v-for="fieldId in orderedFieldIds"
          :key="fieldId"
        >
          <TaskSubtasks
            v-if="fieldId === 'subtasks'"
            :parent-task-id="task.id"
            :goal-id="task.goalId"
            :subtasks="task.subtasks"
            :class="[colClass(fieldId), 'pl-10']"
          />
          <NoteEditor
            v-else-if="fieldId === 'note'"
            :key="task.id"
            :content="task.note || ''"
            :content-type="task.sourceUrl ? 'markdown' : 'html'"
            :placeholder="t('tasks.addNote')"
            :class="colClass(fieldId)"
            @save="updateNote"
          />
          <TaskKanbanStatusSelect
            v-else-if="fieldId === 'status'"
            :task-id="task.id"
            :current-status-id="task.statusId"
            :class="colClass(fieldId)"
          />
          <TaskPrioritySelect
            v-else-if="fieldId === 'priority'"
            :model-value="task.priorityId"
            :class="colClass(fieldId)"
            @update:model-value="updatePriority"
          />
          <TaskAssigneeSelect
            v-else-if="fieldId === 'assignees'"
            :task-id="task.id"
            :assigned-user-ids="task.assignedUsers"
            :class="colClass(fieldId)"
          />
          <TaskListSelect
            v-else-if="fieldId === 'list'"
            :task-id="task.id"
            :current-list-id="task.goalListId"
            :class="colClass(fieldId)"
          />
          <TaskTagsManager
            v-else-if="fieldId === 'tags'"
            :task-id="task.id"
            :task-tag-ids="task.tags"
            :goal-id="projectId"
            :class="colClass(fieldId)"
          />
          <TaskDeadline
            v-else-if="fieldId === 'deadline'"
            :task="task"
            :class="[colClass(fieldId), 'h-fit']"
          />
          <TaskAmountEditor
            v-else-if="fieldId === 'amount'"
            :task-id="task.id"
            :amount="task.amount"
            :transaction-type="task.transactionType"
            :class="colClass(fieldId)"
          />
          <TaskTimeTracking
            v-else-if="fieldId === 'timeTracking'"
            :task-id="task.id"
            :class="colClass(fieldId)"
          />
          <TaskHistory
            v-else-if="fieldId === 'history'"
            :task-id="task.id"
            :class="colClass(fieldId)"
          />
        </template>
      </div>
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
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useTasksStore } from '@/stores/tasks.store'
import NoteEditor from '@/components/features/tasks/parts/NoteEditor.vue'
import TaskPrioritySelect from '@/components/features/tasks/parts/TaskPrioritySelect.vue'
import TaskTagsManager from '@/components/features/tasks/parts/tags/TaskTagsManager.vue'
import TaskAssigneeSelect from '@/components/features/tasks/parts/TaskAssigneeSelect.vue'
import TaskListSelect from '@/components/features/tasks/parts/TaskListSelect.vue'
import TaskKanbanStatusSelect from '@/components/features/tasks/parts/TaskKanbanStatusSelect.vue'
import TaskAmountEditor from '@/components/features/tasks/parts/TaskAmountEditor.vue'
import TaskTimeTracking from '@/components/features/tasks/parts/TaskTimeTracking.vue'
import TaskHistory from '@/components/features/tasks/parts/TaskHistory.vue'
import TaskDeadline from '@/components/features/tasks/parts/TaskDeadline.vue'
import TaskSubtasks from '@/components/features/tasks/parts/TaskSubtasks.vue'
import type { TaskBase } from 'taskview-api'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useUiPreferences } from '@/composables/useUiPreferences'
import { tasksSection } from '@/uiCustomization/sections/tasks'

const { t } = useI18n()
const toast = useToast()
const tasksStore = useTasksStore()
const {
  canEditTaskStatus,
} = useGoalPermissions()

const { catalogue: taskFieldsCatalogue } = tasksSection.useSection()

const { resolved: resolvedTaskFields } = useUiPreferences(
  tasksSection.id,
  () => taskFieldsCatalogue.value,
)
const visibleFields = computed(() =>
  resolvedTaskFields.value.filter(f => !f.hidden),
)
const orderedFieldIds = computed(() => visibleFields.value.map(f => f.id))
const fieldWidthById = computed(() => {
  const map = new Map<string, 'narrow' | 'wide'>()
  for (const f of visibleFields.value) {
    if (f.width) map.set(f.id, f.width)
  }
  return map
})

function colClass(id: string): string {
  return fieldWidthById.value.get(id) === 'wide' ? '@lg:col-span-2' : 'w-full'
}
const task = computed(() => tasksStore.selectedTask ?? null)
const projectId = computed(() => task.value?.goalId ?? 0)
const titleValue = ref(task.value?.description ?? '')
let lastTaskId: number | null = task.value?.id ?? null
let savedDescription: string = task.value?.description ?? ''

watch(task, (newTask) => {
  titleValue.value = newTask?.description ?? ''
  lastTaskId = newTask?.id ?? null
  savedDescription = newTask?.description ?? ''
})

function saveDescription() {
  if (!lastTaskId || titleValue.value === savedDescription) return
  savedDescription = titleValue.value
  tasksStore.updateTaskDescription({
    id: lastTaskId,
    description: titleValue.value,
  })
}

const debouncedSave = useDebounceFn(saveDescription, 500)

watch(titleValue, () => {
  debouncedSave()
})

onBeforeUnmount(() => {
  saveDescription()
})

async function toggleComplete() {
  if (!task.value) return
  const result = await tasksStore.updateTaskCompleteStatus({
    id: task.value.id,
    complete: !task.value.complete,
  })
  if (result?.syncFailed) {
    toast.add({
      title: t('integrations.syncFailed'),
      description: t('integrations.syncFailedDescription'),
      color: 'warning',
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
