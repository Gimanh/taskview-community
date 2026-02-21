<template>
  <div class="w-full h-fit dark:bg-tv-ui-bg-elevated shadow-sm rounded-lg p-2 ">
    <!-- <label class="text-sm text-muted mb-2 block">{{ t('tasks.status') }}</label> -->
    <USelectMenu
      v-if="canViewKanban"
      :search-input="false"
      :disabled="!canManageKanban || true"
      :model-value="selectedItem"
      :items="statusItems"
      :placeholder="t('tasks.selectStatus')"
      class="w-full dark:bg-tv-ui-bg-elevated"
      size="xl"
      @update:model-value="handleSelect"
    >
      <template #leading>
        <UIcon
          name="i-lucide-columns-3"
          class="size-4"
        />
      </template>
    </USelectMenu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKanbanStore } from '@/stores/kanban.store'
import { useTasksStore } from '@/stores/tasks.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

type StatusItem = {
  label: string
  id: number | null
}

const props = defineProps<{
  taskId: number
  currentStatusId: number | null
}>()

import { useProjectContext } from '@/composables/useProjectContext'

const { t } = useI18n()
const kanbanStore = useKanbanStore()
const tasksStore = useTasksStore()
const { canManageKanban, canViewKanban } = useGoalPermissions()

const projectContext = useProjectContext()
const statuses = computed(() =>
  projectContext ? projectContext.statuses.value : kanbanStore.statuses,
)

function getStatusLabel(name: string): string {
  // If the name is a translation key (starts with "msg."), translate it
  if (name.startsWith('msg.')) {
    return t(name)
  }
  return name
}

const statusItems = computed<StatusItem[]>(() => statuses.value.map(status => ({
  label: getStatusLabel(status.name),
  id: status.id,
})))

const selectedItem = computed(() =>
  statusItems.value.find(item => item.id === props.currentStatusId) ?? statusItems.value[0],
)

async function handleSelect(item: StatusItem) {
  if (item.id === props.currentStatusId) return

  await tasksStore.updateTaskStatusId({
    id: props.taskId,
    statusId: item.id === -1 ? null : item.id,
  })
}
</script>
