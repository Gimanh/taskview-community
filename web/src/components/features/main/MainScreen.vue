<template>
  <UDashboardPanel
    id="main-screen"
  >
    <template #header>
      <UDashboardNavbar :title="t('main')">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <UButtonGroup size="md">
            <UButton
              icon="i-lucide-list"
              :color="view === 'list' ? 'primary' : 'neutral'"
              :variant="view === 'list' ? 'soft' : 'ghost'"
              square
              @click="view = 'list'"
            />
            <UButton
              icon="i-lucide-layout-grid"
              :color="view === 'widgets' ? 'primary' : 'neutral'"
              :variant="view === 'widgets' ? 'soft' : 'ghost'"
              square
              @click="view = 'widgets'"
            />
          </UButtonGroup>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <DesktopScreen v-if="view === 'widgets'" />
      <DashboardList v-else />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import { useLsRef } from '@/composables/useLsRef'
import { useRefreshOnResume } from '@/composables/useRefreshOnResume'
import { useBaseScreenStore } from '@/stores/base-screen.store'
import { useCollaborationStore } from '@/stores/collaboration.store'
import DesktopScreen from './screen-main/DesktopScreen.vue'
import DashboardList from './screen-main/DashboardList.vue'

const { t } = useI18n()

const view = useLsRef<'list' | 'widgets'>('main-screen-view', 'list')

const baseScreenStore = useBaseScreenStore()
const collaborationStore = useCollaborationStore()

useRefreshOnResume(() => {
  baseScreenStore.fetchAllState()
  baseScreenStore.fetchAllAvailableLists()
  collaborationStore.fetchAllCollaborationUsers()
})
</script>
