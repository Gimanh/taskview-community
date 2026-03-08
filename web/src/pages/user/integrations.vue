<template>
  <UDashboardPanel id="integrations">
    <template #header>
      <UDashboardNavbar :title="t('integrations.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <IntegrationsPanel />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IntegrationsPanel from '@/components/features/integrations/IntegrationsPanel.vue'

const { t } = useI18n()
</script>
