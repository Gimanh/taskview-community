<template>
  <UDashboardPanel id="calendar">
    <template #header>
      <UDashboardNavbar
        :title="`${projectName} - ${t('calendar.title')}`"
        :ui="{title: 'shrink-0'}"
      >
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <div class="flex items-center gap-2 overflow-x-auto">
            <div
              v-if="showFilters"
              class="hidden lg:contents"
            >
              <CalendarFilters />
            </div>
            <UButton
              icon="i-lucide-filter"
              :color="showFilters || isFiltered ? 'primary' : 'neutral'"
              variant="soft"
              size="lg"
              class="shrink-0"
              :aria-label="t('filters.title')"
              :aria-pressed="showFilters"
              :ui="{ leadingIcon: 'size-4' }"
              data-testid="calendar-filters-toggle"
              @click="showFilters = !showFilters"
            />
          </div>
        </template>
      </UDashboardNavbar>
      <div
        v-if="showFilters"
        class="lg:hidden overflow-x-auto border-b border-default px-3 py-2"
      >
        <div class="ml-auto flex w-fit items-center gap-2">
          <CalendarFilters />
        </div>
      </div>
    </template>

    <template #body>
      <ProjectCalendar
        v-if="projectId && canViewTasks"
        :goal-id="projectId"
        class="h-full"
      />
    </template>
  </UDashboardPanel>
  <TvTaskDetailOverlay />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ProjectCalendar from '@/components/features/calendar/ProjectCalendar.vue'
import CalendarFilters from '@/components/features/calendar/CalendarFilters.vue'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import TvTaskDetailOverlay from '@/components/features/tasks/TvTaskDetailOverlay.vue'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import { useGoalsStore } from '@/stores/goals.store'
import { useProjectDataLoader } from '@/composables/useProjectDataLoader'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useCalendarFilters } from '@/composables/useCalendarRouteState'

const { t } = useI18n()
const { projectId } = useAppRouteInfo()
const goalsStore = useGoalsStore()
const projectName = computed(() => goalsStore.goalMap.get(projectId.value)?.name ?? '')
const { canViewTasks } = useGoalPermissions()
const { isFiltered } = useCalendarFilters()
// Open when a shared link already carries filters
const showFilters = ref(isFiltered.value)

useProjectDataLoader(projectId)
</script>
