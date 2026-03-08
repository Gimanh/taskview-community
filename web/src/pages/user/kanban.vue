<template>
  <UDashboardPanel
    id="kanban"
    :ui="{ body: 'sm:p-4 sm:pb-0' }"
  >
    <template #header>
      <UDashboardNavbar :title="`${projectName} - ${t('kanban.title')}`">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <KanbanBoard />
    </template>
  </UDashboardPanel>
  <TvTaskDetailOverlay />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import KanbanBoard from '@/components/features/kanban/KanbanBoard.vue'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import TvTaskDetailOverlay from '@/components/features/tasks/TvTaskDetailOverlay.vue'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useProjectDataLoader } from '@/composables/useProjectDataLoader'
import { useGoalsStore } from '@/stores/goals.store'

const { t } = useI18n()
const { projectId } = useAppRouteInfo()
const goalsStore = useGoalsStore()
const projectName = computed(() => goalsStore.goalMap.get(projectId.value)?.name ?? '')

useProjectDataLoader(projectId)
</script>
