<template>
  <!-- Tasks Panel: visible on desktop always, on mobile only when list selected -->
  <UDashboardPanel
    id="tasks"
    :class="[
      'lg:flex',
      hasListSelected ? 'flex' : 'hidden lg:flex'
    ]"
  >
    <template #header>
      <UDashboardNavbar

        :ui="{ right: 'flex-1', root: 'px-2!' }"
      >
        <template #leading>
          <!-- Back button on mobile -->
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            class="lg:hidden"
            @click="goBackToLists"
          />
        </template>
        <template #right>
          <TaskSearchAdd
            v-if="hasListSelected && canAddTask"
            @add="handleAddTask"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <TasksPanel />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TasksPanel from './TasksPanel.vue'
import TaskSearchAdd from '@/components/features/tasks/parts/TaskSearchAdd.vue'
import { useTasksStore } from '@/stores/tasks.store'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

const route = useRoute()
const router = useRouter()
const tasksStore = useTasksStore()
const {
  canAddTask,
} = useGoalPermissions()

const hasListSelected = computed(() => !!route.params.listId)

async function goBackToLists() {
  if (route.params.projectId) {
    await router.push({ name:'user', params: { projectId: route.params.projectId } })
  } else {
    await router.push({ name:'user' })
  }
}

async function handleAddTask(description: string) {
  const listId = route.params.listId
  const projectId = route.params.projectId

  if (!projectId) return

  await tasksStore.addTask({
    description,
    goalId: Number(projectId),
    goalListId: listId ? Number(listId) : ALL_TASKS_LIST_ID,
  })
}
</script>
