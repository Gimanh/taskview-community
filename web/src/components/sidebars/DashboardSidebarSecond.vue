<template>
  <UDashboardSidebar
    id="default"
    v-model:open="isSidebarOpen"
    :default-size="20"
    class="bg-elevated/25"
    :class="isSidebarCollapsed ? 'overflow-hidden min-w-0 w-0 transition-[width] duration-200 linear' : 'transition-[width] duration-200 linear'"
    :ui="{ footer: 'lg:border-t lg:border-default' }"
  >
    <div class="flex flex-col gap-4 h-full">
      <div class="flex items-center justify-between px-1 gap-2">
        <TvGoalLikeItem
          :to="{ name: 'user' }"
          variant="taskview"
          class="flex-1"
        >
          {{ t('main') }}
        </TvGoalLikeItem>
        <ActiveTimerIndicator />
        <NotificationBell />
      </div>

      <SearchActivator />
      <SidebarInboxLink />

      <USeparator />

      <SidebarProjectSelect />
      <SidebarTools />
      <ProjectAddInput
        :placeholder="t('projects.createNew')"
        @add="handleAddProject"
      />

      <div class="flex-1" />

      <SidebarOrgSelect />
    </div>

    <template #footer="{ collapsed }">
      <UserMenu :collapsed="collapsed" />
    </template>
  </UDashboardSidebar>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { useDashboard } from '@/composables/useDashboard'
import { useGoalsStore } from '@/stores/goals.store'
import { useOrganizationStore } from '@/stores/organization.store'
import SearchActivator from '@/components/features/main/screen-main/parts/SearchActivator.vue'
import ProjectAddInput from '@/components/features/projects/parts/ProjectAddInput.vue'
import UserMenu from '@/components/UserMenu.vue'
import TvGoalLikeItem from '@/components/features/base/TvGoalLikeItem.vue'
import ActiveTimerIndicator from '@/components/ActiveTimerIndicator.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import SidebarInboxLink from '@/components/sidebars/SidebarInboxLink.vue'
import SidebarProjectSelect from './dashboard-second/SidebarProjectSelect.vue'
import SidebarTools from './dashboard-second/SidebarTools.vue'
import SidebarOrgSelect from './dashboard-second/SidebarOrgSelect.vue'

const { t } = useI18n()
const router = useRouter()
const { isSidebarOpen, isSidebarCollapsed } = useDashboard()
const goalsStore = useGoalsStore()
const orgStore = useOrganizationStore()

async function handleAddProject(name: string) {
  const newProject = await goalsStore.addGoal({
    name,
    ...(orgStore.currentOrg && { organizationId: orgStore.currentOrg.id }),
  })
  if (newProject) {
    router.push({ name: 'user', params: { projectId: newProject.id, listId: ALL_TASKS_LIST_ID } })
  }
}
</script>
