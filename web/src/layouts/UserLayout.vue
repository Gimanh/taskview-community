<template>
  <template v-if="orgStore.initialized">
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
            :to="{ name: 'user' }"
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
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import { useGoalsStore } from '@/stores/goals.store'
import { useUserStore } from '@/stores/user.store'
import { useOrganizationStore } from '@/stores/organization.store'

const { isSidebarOpen, isSidebarCollapsed } = useDashboard()
const { connect: connectCentrifugo } = useCentrifugo()
const { init: initPush } = usePushNotifications()
const { t } = useI18n()
const appStore = useAppStore()
const goalsStore = useGoalsStore()
const userStore = useUserStore()
const orgStore = useOrganizationStore()
const route = useRoute()
const router = useRouter()

watch(
  () => [goalsStore.initialized, goalsStore.goals, route.params.projectId] as const,
  ([initialized, goals, projectId]) => {
    if (!initialized || !projectId) return
    const exists = goals.some((g) => g.id === Number(projectId))
    if (!exists) {
      router.replace({ name: 'user' })
    }
  },
)

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

  if (!orgStore.organizations.length) {
    await orgStore.fetchOrganizations()
  }

  const slugFromUrl = route.params.orgSlug as string
  const matchedOrg = orgStore.findOrgBySlug(slugFromUrl)
  if (matchedOrg) {
    orgStore.setCurrentOrg(matchedOrg)
    orgStore.initialized = true
  } else {
    orgStore.restoreCurrentOrg()
    if (orgStore.currentOrg) {
      router.replace({ name: 'user', params: { orgSlug: orgStore.currentOrgSlug } })
      return
    }
  }

  await goalsStore.fetchGoals()

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
