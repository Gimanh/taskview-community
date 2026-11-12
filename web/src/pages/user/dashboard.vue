<template>
  <UDashboardPanel
    id="project-dashboard"
    :ui="{ body: 'sm:p-4' }"
  >
    <template #header>
      <UDashboardNavbar
        :toggle="navbarToggle"
        v-bind="navbarAttrs"
        :title="`${projectName} - ${t('projectDashboard.title')}`"
      >
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <UButton
            :to="{ name: 'user', params: { projectId, listId: ALL_TASKS_LIST_ID } }"
            :label="t('projectDashboard.openTasks')"
            icon="i-lucide-list-checks"
            color="neutral"
            variant="soft"
            size="lg"
            :ui="{ leadingIcon: 'size-4' }"
            data-testid="project-dashboard-open-tasks"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <ProjectDashboard :project-id="projectId" />
    </template>
  </UDashboardPanel>
  <TvTaskDetailOverlay />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import ProjectDashboard from '@/components/features/project-dashboard/ProjectDashboard.vue'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import TvTaskDetailOverlay from '@/components/features/tasks/TvTaskDetailOverlay.vue'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useCurrentProjectColor } from '@/composables/useCurrentProjectColor'
import { useProjectDataLoader } from '@/composables/useProjectDataLoader'
import { useGoalsStore } from '@/stores/goals.store'

const { navbarToggle, navbarAttrs } = useCurrentProjectColor()

const { t } = useI18n()
const { projectId } = useAppRouteInfo()
const goalsStore = useGoalsStore()
const projectName = computed(() => goalsStore.goalMap.get(projectId.value)?.name ?? '')

useProjectDataLoader(projectId)
</script>
