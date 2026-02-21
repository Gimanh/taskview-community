<template>
  <div class="w-full h-fit dark:bg-tv-ui-bg-elevated shadow-sm rounded-lg p-2">
    <!-- Badge mode (< 10 lists) -->
    <div
      v-if="lists.length < 10"
      class="flex flex-wrap gap-2 w-full"
    >
      <UBadge
        v-for="list in lists"
        :key="list.id"
        :label="list.name"
        size="xl"
        :variant="isListSelected(list.id) ? (isDark ? 'subtle' : 'solid') : (isDark ? 'subtle' : 'outline')"
        :color="isListSelected(list.id) ? 'primary' : 'neutral'"
        class="cursor-pointer select-none"
        @click="selectList(list.id)"
      >
        <template #leading>
          <UIcon
            name="i-lucide-list"
            class="size-3"
          />
        </template>
      </UBadge>
      <UBadge
        :label="t('tasks.noList')"
        :variant="currentListId === null ? 'subtle' : 'subtle'"
        :color="currentListId === null ? 'primary' : 'neutral'"
        class="cursor-pointer select-none"
        size="xl"
        @click="selectList(null)"
      >
        <template #leading>
          <UIcon
            name="i-lucide-inbox"
            class="size-3"
          />
        </template>
      </UBadge>
    </div>

    <!-- Dropdown mode (>= 10 lists) -->
    <USelectMenu
      v-else
      :model-value="currentListId || ALL_TASKS_LIST_ID"
      :items="listItems"
      :placeholder="t('tasks.selectList')"
      :searchable="true"
      :search-placeholder="t('tasks.searchLists')"
      value-key="value"
      class="w-full"
      size="xl"
      variant="subtle"
      @update:model-value="selectList"
    >
      <template #leading>
        <UIcon
          name="i-lucide-list"
          class="size-4"
        />
      </template>
    </USelectMenu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGoalListsStore } from '@/stores/goal-lists.store'
import { useTasksStore } from '@/stores/tasks.store'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { useColor } from '@/composables/useColotMode'

const props = defineProps<{
  taskId: number
  currentListId: number | null
}>()

const { t } = useI18n()
const goalListsStore = useGoalListsStore()
const tasksStore = useTasksStore()
const { isDark } = useColor()
const lists = computed(() => goalListsStore.lists)

const listItems = computed(() => [
  { label: t('tasks.noList'), value: ALL_TASKS_LIST_ID },
  ...lists.value.map(list => ({
    label: list.name,
    value: list.id,
  })),
])

function isListSelected(listId: number): boolean {
  return props.currentListId === listId
}

async function selectList(listId: number | null) {
  if (listId === props.currentListId) return

  await tasksStore.moveTaskToAnotherList({
    id: props.taskId,
    goalListId: listId,
  })
}
</script>
