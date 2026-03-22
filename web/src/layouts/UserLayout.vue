<template>
  <UDashboardGroup
    unit="rem"
    storage="local"
    class="UDashboardGroup-test"
  >
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
          to="/user"
          variant="taskview"
          class="flex-1"
        >
          {{ t('main') }}
        </TvGoalLikeItem>
        <NotificationBell />
      </div>

      <ProjectsSidebar />

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <RouterView />
  </UDashboardGroup>

  <TvMobileBottomNav />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { App } from '@capacitor/app'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import { useDashboard } from '@/composables/useDashboard'
import { useUpdater } from '@/composables/useUpdater'
import { useAppStore } from '@/stores/app.store'
import { useI18n } from 'vue-i18n'
import ProjectsSidebar from '@/components/features/projects/ProjectsSidebar.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import { useCentrifugo } from '@/composables/useCentrifugo'
import { usePushNotifications } from '@/composables/usePushNotifications'

const { isSidebarOpen, isSidebarCollapsed } = useDashboard()
const { connect: connectCentrifugo } = useCentrifugo()
const { init: initPush } = usePushNotifications()
const { t } = useI18n()
const appStore = useAppStore()

let updateInProgress = false

App.addListener('appStateChange', async ({ isActive }) => {
  console.log('appStateChange user layout', isActive)

  if (!isActive) {
    await useUpdater(true)
  }

  if (isActive && !updateInProgress) {
    try {
      updateInProgress = true
      await useUpdater()
    } catch (error) {
      console.error('[Update] Error in appStateChange update:', error)
    } finally {
      updateInProgress = false
    }
  }
})

onMounted(async () => {
  console.log('-------------------------------- onMounted push notifications --------------------------------')
  appStore.initTaskDetailDisplayMode()
  connectCentrifugo()
  initPush()

  await CapacitorUpdater.notifyAppReady()
  console.log('notifyAppReady', APP_VERSION)

  try {
    console.log('[Update] Starting initial update check')
    await useUpdater()
  } catch (error) {
    console.error('[Update] Error in initial update check:', error)
  }
})
</script>
