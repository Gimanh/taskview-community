<template>
  <UDashboardPanel id="automations">
    <template #header>
      <UDashboardNavbar :title="`${projectName} - ${t('automations.title')}`">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div
        v-if="!canViewAutomations"
        class="flex flex-col items-center gap-2 px-4 py-16 text-center"
      >
        <UIcon
          name="i-lucide-lock"
          class="size-8 text-dimmed"
        />
        <p class="text-muted">
          {{ t('automations.noPermission') }}
        </p>
      </div>
      <AutomationsProjectTab
        v-else
        :goal-id="projectId"
        :can-manage="canManageAutomations"
      />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import AutomationsProjectTab from '@/components/features/automations/AutomationsProjectTab.vue'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useProjectDataLoader } from '@/composables/useProjectDataLoader'
import { useGoalsStore } from '@/stores/goals.store'
import { useGoalPermissionsFor } from '@/composables/useGoalPermissions'

const { t } = useI18n()
const { projectId } = useAppRouteInfo()
const goalsStore = useGoalsStore()

useProjectDataLoader(projectId)

const projectName = computed(() => goalsStore.goalMap.get(projectId.value)?.name ?? '')
const goal = computed(() => goalsStore.goalMap.get(projectId.value) ?? null)
const { canViewAutomations, canManageAutomations } = useGoalPermissionsFor(goal)
</script>
