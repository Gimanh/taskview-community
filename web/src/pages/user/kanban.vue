<template>
  <UDashboardPanel
    id="kanban"
    :ui="{ body: 'sm:p-4 sm:pb-0' }"
  >
    <template #header>
      <UDashboardNavbar :title="t('kanban.title')">
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
import { useI18n } from 'vue-i18n'
import KanbanBoard from '@/components/features/kanban/KanbanBoard.vue'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import TvTaskDetailOverlay from '@/components/features/tasks/TvTaskDetailOverlay.vue'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useProjectDataLoader } from '@/composables/useProjectDataLoader'

const { t } = useI18n()
const { projectId } = useAppRouteInfo()

useProjectDataLoader(projectId)
</script>
