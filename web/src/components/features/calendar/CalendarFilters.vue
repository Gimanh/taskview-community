<template>
  <TvUserFilter
    v-model="assignees"
    data-testid="calendar-filter-assignees"
  />
  <TvTagFilter
    v-model="tags"
    data-testid="calendar-filter-tags"
  />
  <TvStatusFilter
    v-model="statuses"
    data-testid="calendar-filter-statuses"
  />
  <UCheckbox
    v-model="hideWeekends"
    size="sm"
    :label="t('filters.hideWeekends')"
    :ui="{ root: 'items-center shrink-0', label: 'whitespace-nowrap' }"
    data-testid="calendar-filter-weekends"
  />
  <UButton
    v-if="isFiltered"
    icon="i-lucide-x"
    :label="t('filters.reset')"
    color="neutral"
    variant="ghost"
    size="sm"
    class="shrink-0"
    data-testid="calendar-filter-reset"
    @click="reset"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TvUserFilter from '@/components/features/base/TvUserFilter.vue'
import TvTagFilter from '@/components/features/base/TvTagFilter.vue'
import TvStatusFilter from '@/components/features/base/TvStatusFilter.vue'
import { useCalendarFilters } from '@/composables/useCalendarRouteState'

const { t } = useI18n()
const { assignees, tags, statuses, hideWeekends, isFiltered, reset } = useCalendarFilters()
</script>
