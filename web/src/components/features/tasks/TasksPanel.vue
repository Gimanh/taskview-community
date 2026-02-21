<template>
  <div class="relative h-full flex flex-col">
    <template v-if="!route.params.listId">
      <div class="flex flex-col items-center justify-center h-64 text-muted">
        <UIcon
          name="i-lucide-list-todo"
          class="size-12 mb-4"
        />
        <p>{{ t('lists.selectListToViewTasks') }}</p>
      </div>
    </template>

    <template v-else-if="loading && tasks.length === 0">
      <div class="flex flex-col items-center justify-center h-64 text-muted">
        <UIcon
          name="i-lucide-loader-2"
          class="size-12 mb-4 animate-spin"
        />
        <p>{{ t('common.loading') }}</p>
      </div>
    </template>

    <template v-else>
      <!-- Toolbar -->
      <TasksToolbar
        v-if="canViewTasks"
        class="shrink-0 mb-2"
      />

      <!-- Empty state -->
      <div
        v-if="tasks.length === 0"
        class="flex flex-col items-center justify-center h-64 text-muted"
      >
        <UIcon
          name="i-lucide-clipboard-list"
          class="size-12 mb-4"
        />
        <p>{{ t('tasks.noTasks') }}</p>
      </div>

      <!-- Tasks list -->
      <UScrollArea
        v-else
        ref="scrollAreaRef"
        class="flex-1 min-h-0 lg:pb-0"
      >
        <div
          v-if="canViewTasks"
          class="space-y-2 p-1"
        >
          <!-- <TasksToolbar class="shrink-0 sticky top-0 z-10" /> -->
          <TaskItem
            v-for="task in tasks"
            :key="task.id"
            :task="task"
            @toggle="toggleTask"
          />
        </div>
      </UScrollArea>

      <UProgress
        v-if="loading"
        indeterminate
        size="xs"
        class="absolute bottom-0 inset-x-0 z-10"
        :ui="{ base: 'bg-default' }"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, useTemplateRef, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useInfiniteScroll } from '@vueuse/core'
import { useTasksStore } from '@/stores/tasks.store'
import { ALL_TASKS_LIST_ID, type Task } from 'taskview-api'
import TaskItem from '@/components/features/tasks/parts/TaskItem.vue'
import TasksToolbar from '@/components/features/tasks/parts/TasksToolbar.vue'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

const { t } = useI18n()
const route = useRoute()
const { canViewTasks } = useGoalPermissions()
const tasksStore = useTasksStore()
const { tasks, loading, fetchRules } = storeToRefs(tasksStore)

const scrollAreaRef = useTemplateRef('scrollAreaRef')

const prevProjectId = ref<number | null>(null)
const prevListId = ref<number | null>(null)

watch(
  () => [route.params.projectId, route.params.listId] as const,
  async ([projectId, listId]) => {
    if (!projectId || !listId) return

    const numProjectId = Number(projectId)
    const numListId = Number(listId)

    if (numProjectId === prevProjectId.value && numListId === prevListId.value) return

    prevProjectId.value = numProjectId
    prevListId.value = numListId

    tasksStore.resetTasks()
    tasksStore.updateFetchRules({
      goalId: numProjectId,
      currentListId: numListId,
      currentPage: 0,
      endOfTasks: false,
    })
    await tasksStore.fetchTasks()
  },
  { immediate: true },
)

watch(
  scrollAreaRef,
  async (scrollArea) => {
    if (scrollArea) {
      await nextTick()
      useInfiniteScroll(
        scrollArea.$el,
        loadMoreTasks,
        {
          distance: 200,
          canLoadMore: () => !loading.value && !fetchRules.value.endOfTasks,
        },
      )
    }
  },
)

async function loadMoreTasks() {
  if (!loading.value && !fetchRules.value.endOfTasks) {
    await tasksStore.fetchTasks()
  }
}

async function toggleTask(task: Task) {
  await tasksStore.updateTaskCompleteStatus({
    id: task.id,
    complete: !task.complete,
  })
}

async function addTask(description: string) {
  const listId = route.params.listId
  const projectId = route.params.projectId

  if (!projectId) return

  await tasksStore.addTask({
    description,
    goalId: Number(projectId),
    goalListId: listId ? Number(listId) : ALL_TASKS_LIST_ID,
  })
}

defineExpose({
  addTask,
})
</script>
