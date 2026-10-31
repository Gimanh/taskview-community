<template>
  <UDashboardPanel
    id="import"
    :ui="{ body: 'pt-0! px-0!' }"
  >
    <template #header>
      <UDashboardNavbar :title="t('import.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <ImportWizard v-if="isAdmin" />
      <div
        v-else
        class="flex flex-col items-center justify-center h-64 text-muted"
      >
        <UIcon
          name="i-lucide-lock"
          class="size-12 mb-4"
        />
        <p>{{ t('import.noAccess') }}</p>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useOrganizationStore } from '@/stores/organization.store'
import { useOrgPermissions } from '@/composables/useOrgPermissions'
import ImportWizard from '@/components/features/import/ImportWizard.vue'

const { t } = useI18n()
const { currentOrg } = storeToRefs(useOrganizationStore())
const { isAdmin } = useOrgPermissions(() => currentOrg.value)
</script>
