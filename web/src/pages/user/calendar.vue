<template>
  <UDashboardPanel id="calendar">
    <template #header>
      <UDashboardNavbar
        :title="`${projectName} - ${t('calendar.title')}`"
        :ui="{title: 'shrink-0'}"
      >
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <ProjectCalendar
        v-if="projectId && canViewTasks"
        :goal-id="projectId"
        class="h-full"
      />
    </template>
  </UDashboardPanel>
  <TvTaskDetailOverlay />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProjectCalendar from '@/components/features/calendar/ProjectCalendar.vue'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import TvTaskDetailOverlay from '@/components/features/tasks/TvTaskDetailOverlay.vue'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useGoalsStore } from '@/stores/goals.store'
import { useProjectDataLoader } from '@/composables/useProjectDataLoader'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

const { t } = useI18n()
const { projectId } = useAppRouteInfo()
const goalsStore = useGoalsStore()
const projectName = computed(() => goalsStore.goalMap.get(projectId.value)?.name ?? '')
const { canViewTasks } = useGoalPermissions()

useProjectDataLoader(projectId)
</script>
