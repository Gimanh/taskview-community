<template>
  <MainScreen v-if="!hasProject" />
  <template v-else>
    <ListsContainer />
    <TasksContainer />
  </template>
  <TvTaskDetailOverlay />
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import MainScreen from '@/components/features/main/MainScreen.vue'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useProjectDataLoader } from '@/composables/useProjectDataLoader'
import TvTaskDetailOverlay from '@/components/features/tasks/TvTaskDetailOverlay.vue'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'

const { hasProject, projectId } = useAppRouteInfo()
const route = useRoute()
const { activeTaskId, openTask } = useTaskDetailPanel()

useProjectDataLoader(projectId)

// Deep-link support: open task detail when taskId is in the URL
watch(
  () => route.params.taskId,
  (taskId) => {
    if (taskId && Number(taskId) !== activeTaskId.value) {
      openTask(Number(taskId))
    }
  },
  { immediate: true },
)
</script>
