<template>
  <UDashboardPanel
    id="kanban"
    :ui="{ body: 'sm:p-4 sm:pb-0' }"
  >
    <template #header>
      <UDashboardNavbar :title="`${projectName} - ${t('kanban.title')}`">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <div class="flex items-center gap-2 overflow-x-auto">
            <div v-if="showFilters" class="hidden lg:contents">
              <TvKanbanFilters
                v-model:list-ids="selectedListIds"
                v-model:assignee-ids="selectedAssigneeIds"
                show-reset-label
              />
            </div>
            <UButton
              icon="i-lucide-filter"
              :color="showFilters ? 'primary' : 'neutral'"
              variant="soft"
              size="lg"
              class="shrink-0"
              :ui="{ leadingIcon: 'size-4' }"
              @click="showFilters = !showFilters"
            />
          </div>
        </template>
      </UDashboardNavbar>
      <div
        v-if="showFilters"
        class="lg:hidden overflow-x-auto border-b border-default px-3 py-2"
      >
        <div class="flex items-center gap-2 w-fit ml-auto">
          <TvKanbanFilters
            v-model:list-ids="selectedListIds"
            v-model:assignee-ids="selectedAssigneeIds"
          />
        </div>
      </div>
    </template>

    <template #body>
      <KanbanBoard />
    </template>
  </UDashboardPanel>
  <TvTaskDetailOverlay />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import KanbanBoard from '@/components/features/kanban/KanbanBoard.vue'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import TvTaskDetailOverlay from '@/components/features/tasks/TvTaskDetailOverlay.vue'
import TvKanbanFilters from '@/components/features/base/TvKanbanFilters.vue'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useProjectDataLoader } from '@/composables/useProjectDataLoader'
import { useGoalsStore } from '@/stores/goals.store'
import { useKanbanStore } from '@/stores/kanban.store'

const { t } = useI18n()
const { projectId } = useAppRouteInfo()
const goalsStore = useGoalsStore()
const kanbanStore = useKanbanStore()
const projectName = computed(() => goalsStore.goalMap.get(projectId.value)?.name ?? '')

const showFilters = ref(false)
const selectedListIds = ref<number[]>([])
const selectedAssigneeIds = ref<number[]>([])

watch([selectedListIds, selectedAssigneeIds], ([listIds, assigneeIds]) => {
  kanbanStore.setFilters({ listIds, assigneeIds })
})

useProjectDataLoader(projectId)
</script>
