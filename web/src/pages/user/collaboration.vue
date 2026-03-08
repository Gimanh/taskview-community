<template>
  <UDashboardPanel id="collaboration">
    <template #header>
      <UDashboardNavbar :title="`${projectName} - ${t('collaboration.title')}`">
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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CollaborationPanel from '@/components/features/collaboration/CollaborationPanel.vue'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useGoalsStore } from '@/stores/goals.store'

const { t } = useI18n()
const { projectId } = useAppRouteInfo()
const goalsStore = useGoalsStore()
const projectName = computed(() => goalsStore.goalMap.get(projectId.value)?.name ?? '')
</script>
