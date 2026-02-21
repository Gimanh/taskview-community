<template>
  <UDashboardPanel
    id="main-screen"
  >
    <template #header>
      <UDashboardNavbar :title="t('main')">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <DesktopScreen />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import DesktopScreen from './screen-main/DesktopScreen.vue'

const { t } = useI18n()
</script>
