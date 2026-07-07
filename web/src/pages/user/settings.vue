<template>
  <UDashboardPanel id="settings">
    <template #header>
      <UDashboardNavbar :title="t('settings.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <SettingsScreen />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SettingsScreen from '@/components/features/settings/SettingsScreen.vue'

const { t } = useI18n()
</script>
