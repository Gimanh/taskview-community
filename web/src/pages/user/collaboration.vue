<template>
  <UDashboardPanel id="collaboration">
    <template #header>
      <UDashboardNavbar :title="t('collaboration.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <CollaborationPanel />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CollaborationPanel from '@/components/features/collaboration/CollaborationPanel.vue'

const { t } = useI18n()
</script>
