<template>
  <UDashboardPanel id="organizations">
    <template #header>
      <UDashboardNavbar :title="t('organizations.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <OrganizationsPanel />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import OrganizationsPanel from '@/components/features/organizations/OrganizationsPanel.vue'

const { t } = useI18n()
</script>
