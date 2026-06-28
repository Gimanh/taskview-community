<template>
  <TvDropdown
    v-if="canViewAssignedUsersToTask"
    :model-value="selectedUserIds"
    :items="options"
    :disabled="!canAssignUsersToTask"
    :placeholder="t('tasks.selectAssignees')"
    placeholder-icon="i-lucide-at-sign"
    activator-icon="i-lucide-at-sign"
    multiple
    @update:model-value="updateAssignees"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTasksStore } from '@/stores/tasks.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useUserOptions, type UserValue } from '@/composables/useUserOptions'
import TvDropdown from '@/components/features/base/TvDropdown.vue'

const props = defineProps<{
  taskId: number
  assignedUserIds: number[]
}>()

const { t } = useI18n()
const tasksStore = useTasksStore()
const { canViewAssignedUsersToTask, canAssignUsersToTask } = useGoalPermissions()
const { options } = useUserOptions()

const selectedUserIds = computed(() => props.assignedUserIds)

async function updateAssignees(value: UserValue | UserValue[] | undefined) {
  const userIds = Array.isArray(value) ? value : []
  await tasksStore.updateTaskAssignee({
    taskId: props.taskId,
    userIds,
  })
}
</script>
