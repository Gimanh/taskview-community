<template>
  <div>
    <UDashboardSearchButton
      :label="t('admin.search')"
      :disabled="!hasActiveGoals"
      class="w-full"
      variant="subtle"
    />

    <UDashboardSearch
      v-model:search-term="searchTerm"
      v-model:open="isOpen"
      :loading="loading"
      :groups="groups"
      :placeholder="t('admin.search')"
      :color-mode="false"
      :fuse="{ resultLimit: 20 }"
      :fullscreen="isMobile"
      :ui="{
        group: 'p-4',
        item: 'p-0',
      }"
    >
      <template #item="{ item: task }">
        <ULink
          :to="{
            name: 'user',
            params: {
              projectId: task.goalId,
              listId: task.listId || ALL_TASKS_LIST_ID,
              taskId: task.id,
            },
          }"
          class="flex w-full text-base px-4 py-2"
        >
          {{ task.description }}
        </ULink>
      </template>

      <template #empty>
        <div
          v-if="searchTerm && !loading"
          class="flex flex-col items-center justify-center p-4 gap-2"
        >
          <p class="text-muted text-sm">
            {{ t('tasks.noTasks') }}
          </p>
          <UButton
            :label="`${t('msg.addTask')} (${searchTerm})`"
            icon="i-lucide-plus"
            variant="soft"
            @click="openAddTaskDialog"
          />
        </div>
        <div
          v-else-if="!searchTerm"
          class="flex items-center justify-center p-4"
        >
          <p class="text-muted text-sm">
            {{ t('admin.search') }}
          </p>
        </div>
      </template>
    </UDashboardSearch>

    <MainScreenAddTaskDialog
      v-model="addTaskDialogModel"
      :title="t('msg.addTaskToUpcoming')"
      :task-name="searchTerm"
      upcoming-task
      @added="taskAdded"
      @close="closeAddTaskDialog"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { refDebounced } from '@vueuse/core'
import MainScreenAddTaskDialog from './MainScreenAddTaskDialog.vue'
import { useBaseScreenStore } from '@/stores/base-screen.store'
import { useGoalsStore } from '@/stores/goals.store'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import type { TaskItem } from '@/types/tasks.types'
import { useTaskView } from '@/composables/useTaskView'

const { t } = useI18n()
const { isMobile } = useTaskView()
const searchTerm = ref('')
const searchTermDebounced = refDebounced(searchTerm, 300)
const loading = ref(false)
const isOpen = ref(false)
const baseScreenStore = useBaseScreenStore()
const tasks = ref<TaskItem[]>([])
const addTaskDialogModel = ref(false)
const goalsStore = useGoalsStore()

const hasActiveGoals = computed(() => goalsStore.goals.length > 0)

watch(searchTermDebounced, async (term) => {
  if (!term) {
    tasks.value = []
    return
  }

  loading.value = true
  try {
    const result = await baseScreenStore.searchTaskRequest(term)
    tasks.value = result
  }
  finally {
    loading.value = false
  }
})

const groups = computed(() => {
  if (!tasks.value.length) return []

  return [{
    id: 'tasks',
    label: t('tasks.allTasks'),
    items: tasks.value,
    ignoreFilter: true,
  }]
})

function openAddTaskDialog() {
  isOpen.value = false
  addTaskDialogModel.value = true
}

function taskAdded() {
  addTaskDialogModel.value = false
  searchTerm.value = ''
}

function closeAddTaskDialog() {
  addTaskDialogModel.value = false
}
</script>
