<template>
  <div
    class="flex flex-col gap-3 p-3 rounded-lg border border-default hover:bg-elevated transition-colors cursor-pointer"
    @click="handleOpenTask"
  >
    <div class="flex items-center gap-3">
      <div class="self-start mt-0.5 flex flex-col items-center gap-2">
        <UCheckbox
          :disabled="!canEditTaskStatus"
          :model-value="localComplete"
          @click.stop.prevent
          @update:model-value="handleToggle"
        />

        <UIcon
          name="carbon:circle-filled"
          class=" size-4.5"
          :class="priorityColor"
        />
      </div>

      <div class="flex-1 min-w-0 self-start flex flex-col gap-1">
        <p
          class="text-base"
          :class="{ 'line-through text-muted': localComplete }"
        >
          {{ task.description }}
        </p>
        <div
          v-if="hasAdditionalInfo"
          :class="ui?.additionalInfo"
          class="flex flex-wrap items-center gap-2"
        >
          <!-- Date -->
          <UBadge
            v-if="task.endDate"
            :label="formattedDate"
            icon="i-lucide-calendar"
            :color="isOverdue ? 'error' : 'neutral'"
            :class="isOverdue ? '' : 'bg-elevated text-muted'"
            :ui="{ leadingIcon: 'size-3' }"
            class="max-w-full"
            variant="subtle"
            size="md"
          />
          
          <!-- Project -->
          <UBadge
            v-if="projectName"
            :label="projectName"
            icon="i-lucide-folder"
            color="neutral"
            class="bg-elevated text-muted max-w-full"
            :ui="{ leadingIcon: 'size-3' }"
            variant="subtle"
            size="md"
          />

          <!-- List -->
          <UBadge
            v-if="listName"
            :label="listName"
            icon="i-lucide-list"
            color="neutral"
            class="bg-elevated text-muted max-w-full"
            :ui="{ leadingIcon: 'size-3' }"
            variant="subtle"
            size="md"
          />

          <!-- Amount -->
          <UBadge
            v-if="task.amount"
            :label="formattedAmount"
            :icon="transactionIcon"
            :color="transactionColor"
            :ui="{ leadingIcon: 'size-3' }"
            variant="subtle"
            size="md"
            class="max-w-full"
          />

          <!-- Assignees -->
          <UBadge
            v-for="assignee in assigneeEmails"
            :key="assignee"
            :label="`${assignee}`"
            icon="i-lucide-user"
            color="info"
            class="bg-elevated text-muted max-w-full"
            :ui="{ leadingIcon: 'size-3',}"
            variant="subtle"
            size="md"
          />

          <!-- Tags -->

          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="tag in taskTags"
              :key="tag.id"
              :label="tag.name"
              :style="{ backgroundColor: tag.color + '20', color: tag.color }"
              variant="subtle"
              :ui="{ leadingIcon: 'size-3' }"
              icon="i-lucide-tag"
              size="md"
              class="max-w-full"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { type Task } from 'taskview-api'
import { useGoalsStore } from '@/stores/goals.store'
import { useGoalListsStore } from '@/stores/goal-lists.store'
import { useCollaborationStore } from '@/stores/collaboration.store'
import { useTagsStore } from '@/stores/tag.store'
import { formatDate } from '@vueuse/core'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'

const TOGGLE_DELAY = 200
const props = defineProps<{
  task: Task
  ui?: {
    additionalInfo?: string
  }
}>()

const emit = defineEmits<{
  click: [taskId: number]
  toggle: [task: Task]
}>()
const { canEditTaskStatus } = useGoalPermissions()
const { openTask } = useTaskDetailPanel()
const localComplete = ref(!!props.task.complete)

watch(() => props.task.complete, (newVal) => {
  localComplete.value = !!newVal
})

function handleToggle() {
  localComplete.value = !localComplete.value
  setTimeout(() => {
    emit('toggle', props.task)
  }, TOGGLE_DELAY)
}

function handleOpenTask() {
  openTask(props.task.id)
}

const goalsStore = useGoalsStore()
const goalListsStore = useGoalListsStore()
const collaborationStore = useCollaborationStore()
const tagsStore = useTagsStore()

const priorityColor = computed(() => {
  switch (props.task.priorityId) {
  case 3:
    return 'text-error'
  case 2:
    return 'text-warning'
  case 1:
    return 'text-success'
  default:
    return 'text-neutral'
  }
})

const projectName = computed(() => {
  return goalsStore.goalMap.get(props.task.goalId)?.name || ''
})

const listName = computed(() => {
  return props.task.goalListId
    ? goalListsStore.listMap.get(props.task.goalListId)?.name || ''
    : ''
})

const formattedDate = computed(() => {
  if (!props.task.endDate) return ''
  return formatDate(new Date(props.task.endDate), 'DD.MMM.YYYY')
})

const isOverdue = computed(() => {
  if (!props.task.endDate || localComplete.value) return false
  const end = new Date(props.task.endDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return end < now
})

const assigneeEmails = computed(() => {
  return props.task.assignedUsers
    .map(userId => collaborationStore.userMap.get(userId)?.email)
    .filter((email): email is string => !!email)
})

const taskTags = computed(() => {
  return props.task.tags
    .map(tagId => tagsStore.tagsMap.get(tagId))
    .filter((tag): tag is NonNullable<typeof tag> => !!tag)
})

const formattedAmount = computed(() => {
  if (!props.task.amount) return ''
  return Number(props.task.amount).toLocaleString()
})

const transactionIcon = computed(() => {
  if (props.task.transactionType === 1) return 'i-lucide-trending-up'
  if (props.task.transactionType === 0) return 'i-lucide-trending-down'
  return 'i-lucide-coins'
})

const transactionColor = computed(() => {
  if (props.task.transactionType === 1) return 'success' as const
  if (props.task.transactionType === 0) return 'error' as const
  return 'neutral' as const
})

const hasAdditionalInfo = computed(() => {
  return projectName.value ||
    listName.value ||
    props.task.endDate ||
    props.task.amount ||
    assigneeEmails.value.length > 0 ||
    taskTags.value.length > 0
})
</script>
