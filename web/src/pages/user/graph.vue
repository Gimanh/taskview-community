<template>
  <UDashboardPanel
    id="graph"
  >
    <template #header>
      <UDashboardNavbar :title="t('graph.title')">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <ProjectGraph />
    </template>
  </UDashboardPanel>
  <TvTaskDetailOverlay />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ProjectGraph from '@/components/features/graph/ProjectGraph.vue'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import TvTaskDetailOverlay from '@/components/features/tasks/TvTaskDetailOverlay.vue'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useProjectDataLoader } from '@/composables/useProjectDataLoader'

const { t } = useI18n()
const { projectId } = useAppRouteInfo()

useProjectDataLoader(projectId)
</script>
