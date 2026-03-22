<template>
  <UDashboardPanel id="webhooks">
    <template #header>
      <UDashboardNavbar :title="t('webhooks.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <WebhooksPanel />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import WebhooksPanel from '@/components/features/webhooks/WebhooksPanel.vue'

const { t } = useI18n()
</script>
