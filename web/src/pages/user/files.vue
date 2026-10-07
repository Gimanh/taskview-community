<template>
  <UDashboardPanel
    id="files"
    :ui="{ body: 'pt-0! px-0!' }"
  >
    <template #header>
      <UDashboardNavbar :title="`${projectName} - ${t('files.title')}`">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div
        v-if="!canViewFiles"
        class="flex flex-col items-center gap-2 px-4 py-16 text-center"
      >
        <UIcon
          name="i-lucide-lock"
          class="size-8 text-dimmed"
        />
        <p class="text-muted">
          {{ t('files.noPermission') }}
        </p>
      </div>
      <FilesProjectTab
        v-else
        :goal-id="projectId"
        :can-manage="canManageFiles"
      />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import FilesProjectTab from '@/components/features/files/FilesProjectTab.vue'
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
const { canViewFiles, canManageFiles } = useGoalPermissionsFor(goal)
</script>
