<template>
  <UDashboardPanel id="account">
    <template #header>
      <UDashboardNavbar :title="t('account.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <AccountSettings />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AccountSettings from '@/components/features/account/AccountSettings.vue'

const { t } = useI18n()
</script>
