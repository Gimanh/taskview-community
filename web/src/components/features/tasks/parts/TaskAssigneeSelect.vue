<template>
  <div 
    v-if="canViewAssignedUsersToTask"
    class="h-fit dark:bg-tv-ui-bg-elevated shadow-sm rounded-lg p-2"
  >
    <!-- Badge mode (< 10 users) -->
    <div
      v-if="users.length < 10"
      class="flex flex-wrap gap-2"
    >
      <UBadge
        v-for="user in users"
        :key="user.id"
        :label="getUserDisplayName(user)"
        :variant="isUserAssigned(user.id) ? (isDark ? 'subtle' : 'solid') : (isDark ? 'subtle' : 'outline')"
        :color="isUserAssigned(user.id) ? 'primary' : 'neutral'"
        :ui="{ leadingIcon: 'size-4' }"
        icon="lucide:at-sign"
        class="cursor-pointer select-none truncate"
        size="xl"
        @click="toggleAssignee(user.id)"
      />
      <span
        v-if="users.length === 0"
        class="text-sm text-muted"
      >
        {{ t('tasks.noUsersAvailable') }}
      </span>
    </div>

    <!-- Dropdown mode (>= 10 users) -->
    <USelectMenu
      v-else
      v-model="selectedUserIds"
      :disabled="!canAssignUsersToTask"
      :items="userItems"
      :placeholder="t('tasks.selectAssignees')"
      :searchable="true"
      :search-placeholder="t('tasks.searchUsers')"
      :ui="{
        base:'w-full'
      }"
      multiple
      value-key="value"
      variant="soft"
      @update:model-value="handleSelectionChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CollaborationResponseFetchAllUsers } from 'taskview-api'
import { useCollaborationStore } from '@/stores/collaboration.store'
import { useTasksStore } from '@/stores/tasks.store'
import { useColor } from '@/composables/useColotMode'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useProjectContext } from '@/composables/useProjectContext'

const props = defineProps<{
  taskId: number
  assignedUserIds: number[]
}>()

const { t } = useI18n()
const collaborationStore = useCollaborationStore()
const tasksStore = useTasksStore()
const { isDark } = useColor()
const selectedUserIds = ref<number[]>([...props.assignedUserIds])
const { canViewAssignedUsersToTask, canAssignUsersToTask } = useGoalPermissions()

const projectContext = useProjectContext()
const users = computed(() =>
  projectContext ? projectContext.users.value : collaborationStore.users,
)

const userItems = computed(() =>
  users.value.map(user => ({
    label: getUserDisplayName(user),
    value: user.id,
  })),
)

watch(() => props.assignedUserIds, (newIds) => {
  selectedUserIds.value = [...newIds]
}, { deep: true })

function getUserDisplayName(user: CollaborationResponseFetchAllUsers): string {
  return user.email
}

function isUserAssigned(userId: number): boolean {
  return props.assignedUserIds.includes(userId)
}

async function toggleAssignee(userId: number) {
  if (!canAssignUsersToTask.value) return
  const currentAssignees = [...props.assignedUserIds]
  const isCurrentlyAssigned = currentAssignees.includes(userId)

  const newAssignees = isCurrentlyAssigned
    ? currentAssignees.filter(id => id !== userId)
    : [...currentAssignees, userId]

  await tasksStore.updateTaskAssignee({
    taskId: props.taskId,
    userIds: newAssignees,
  })
}

async function handleSelectionChange(newSelection: number[]) {
  await tasksStore.updateTaskAssignee({
    taskId: props.taskId,
    userIds: newSelection,
  })
}
</script>
