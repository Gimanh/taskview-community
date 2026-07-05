<template>
  <UDashboardPanel id="messaging">
    <template #header>
      <UDashboardNavbar :title="t('messaging.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <MessagingPanel />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import MessagingPanel from '@/components/features/messaging/MessagingPanel.vue'

const { t } = useI18n()
</script>
