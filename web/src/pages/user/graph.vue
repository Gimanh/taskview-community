<template>
  <UDashboardPanel
    id="graph"
  >
    <template #header>
      <UDashboardNavbar
      :title="`${projectName} - ${t('graph.title')}`"
      :ui="{title: 'shrink-0'}"
      >
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <div class="w-full">
            <UButton
            icon="i-lucide-filter"
            :color="showFilters ? 'primary' : 'neutral'"
            variant="soft"
            size="lg"
            :ui="{leadingIcon: 'size-4'}"
            @click="showFilters = !showFilters"
          />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="relative h-full">
        <div
          v-if="showFilters"
          class="rounded absolute top-0 left-0 right-0 z-10 overflow-x-auto border-b border-default bg-elevated/90 backdrop-blur-sm px-3 py-2"
        >
          <div class="flex items-center justify-end gap-2 w-fit ml-auto">
            <TvKanbanFilters
              v-model:list-ids="selectedListIds"
              v-model:assignee-ids="selectedAssigneeIds"
              show-reset-label
            />
          </div>
        </div>
        <ProjectGraph v-model:list-ids="selectedListIds" v-model:assignee-ids="selectedAssigneeIds" class="h-full w-full" />
      </div>
    </template>
  </UDashboardPanel>
  <TvTaskDetailOverlay />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ProjectGraph from '@/components/features/graph/ProjectGraph.vue'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import TvTaskDetailOverlay from '@/components/features/tasks/TvTaskDetailOverlay.vue'
import TvKanbanFilters from '@/components/features/base/TvKanbanFilters.vue'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useGoalsStore } from '@/stores/goals.store'
import { useProjectDataLoader } from '@/composables/useProjectDataLoader'

const { t } = useI18n()
const { projectId } = useAppRouteInfo()
const goalsStore = useGoalsStore()
const projectName = computed(() => goalsStore.goalMap.get(projectId.value)?.name ?? '')

const showFilters = ref(false)
const selectedListIds = ref<number[]>([])
const selectedAssigneeIds = ref<number[]>([])

useProjectDataLoader(projectId)
</script>
