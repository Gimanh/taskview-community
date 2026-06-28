<template>
  <UDashboardSidebar
    id="default"
    v-model:open="isSidebarOpen"
    :default-size="20"
    class="bg-elevated/25"
    :class="isSidebarCollapsed ? 'overflow-hidden min-w-0 w-0 transition-[width] duration-200 linear' : 'transition-[width] duration-200 linear'"
    :ui="{ footer: 'lg:border-t lg:border-default' }"
  >
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

    <ProjectsSidebar />

    <template #footer="{ collapsed }">
      <UserMenu :collapsed="collapsed" />
    </template>
  </UDashboardSidebar>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDashboard } from '@/composables/useDashboard'
import TvGoalLikeItem from '@/components/features/base/TvGoalLikeItem.vue'
import ProjectsSidebar from '@/components/features/projects/ProjectsSidebar.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import ActiveTimerIndicator from '@/components/ActiveTimerIndicator.vue'
import UserMenu from '@/components/UserMenu.vue'

const { t } = useI18n()
const { isSidebarOpen, isSidebarCollapsed } = useDashboard()
</script>
