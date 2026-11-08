<template>
  <UDashboardPanel
    id="main-screen"
  >
    <template #header>
      <UDashboardNavbar :title="t('main')">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <div
            v-if="view === 'calendar' && showCalendarFilters"
            class="hidden items-center gap-2 lg:flex"
          >
            <MainCalendarFilters />
          </div>
          <UButton
            v-if="view === 'calendar'"
            icon="i-lucide-filter"
            :color="showCalendarFilters || calendarFilters.isFiltered.value ? 'primary' : 'neutral'"
            variant="soft"
            size="md"
            class="shrink-0"
            :aria-label="t('filters.title')"
            :aria-pressed="showCalendarFilters"
            data-testid="main-calendar-filters-toggle"
            @click="showCalendarFilters = !showCalendarFilters"
          />
          <UButtonGroup size="md">
            <UButton
              icon="i-lucide-list"
              :color="view === 'list' ? 'primary' : 'neutral'"
              :variant="view === 'list' ? 'soft' : 'ghost'"
              square
              @click="view = 'list'"
            />
            <UButton
              icon="i-lucide-layout-grid"
              :color="view === 'widgets' ? 'primary' : 'neutral'"
              :variant="view === 'widgets' ? 'soft' : 'ghost'"
              square
              @click="view = 'widgets'"
            />
            <UButton
              icon="i-lucide-calendar-days"
              :color="view === 'calendar' ? 'primary' : 'neutral'"
              :variant="view === 'calendar' ? 'soft' : 'ghost'"
              square
              :aria-label="t('calendar.title')"
              data-testid="main-view-calendar"
              @click="view = 'calendar'"
            />
          </UButtonGroup>
        </template>
      </UDashboardNavbar>
      <div
        v-if="view === 'calendar' && showCalendarFilters"
        class="overflow-x-auto border-b border-default px-3 py-2 lg:hidden"
      >
        <div class="flex w-fit items-center gap-2">
          <MainCalendarFilters />
        </div>
      </div>
    </template>

    <template #body>
      <DesktopScreen v-if="view === 'widgets'" />
      <MainCalendar v-else-if="view === 'calendar'" />
      <DashboardList v-else />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'
import { useLsRef } from '@/composables/useLsRef'
import { useRefreshOnResume } from '@/composables/useRefreshOnResume'
import { useBaseScreenStore } from '@/stores/base-screen.store'
import { useCollaborationStore } from '@/stores/collaboration.store'
import DesktopScreen from './screen-main/DesktopScreen.vue'
import DashboardList from './screen-main/DashboardList.vue'
import MainCalendar from './screen-main/calendar/MainCalendar.vue'
import MainCalendarFilters from './screen-main/calendar/MainCalendarFilters.vue'
import { useMainCalendarFilters } from '@/composables/useCalendarRouteState'

const { t } = useI18n()

const view = useLsRef<'list' | 'widgets' | 'calendar'>('main-screen-view', 'list')
const showCalendarFilters = ref(false)
const calendarFilters = useMainCalendarFilters()

const baseScreenStore = useBaseScreenStore()
const collaborationStore = useCollaborationStore()

useRefreshOnResume(() => {
  baseScreenStore.fetchAllState()
  baseScreenStore.fetchAllAvailableLists()
  collaborationStore.fetchAllCollaborationUsers()
})
</script>
