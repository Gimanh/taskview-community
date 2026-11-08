<template>
  <USelectMenu
    v-model="projects"
    :items="projectItems"
    value-key="value"
    multiple
    size="sm"
    :placeholder="t('calendar.main.allProjects')"
    :search-input="{ placeholder: t('calendar.main.findProject') }"
    class="w-48 shrink-0"
    data-testid="main-calendar-filter-projects"
  >
    <template #item-leading="{ item }">
      <span
        class="size-2.5 shrink-0 rounded-full"
        :class="item.color ? '' : 'border border-accented'"
        :style="item.color ? { backgroundColor: item.color } : undefined"
      />
    </template>
  </USelectMenu>
  <UCheckbox
    v-model="hideWeekends"
    size="sm"
    :label="t('filters.hideWeekends')"
    :ui="{ root: 'items-center shrink-0', label: 'whitespace-nowrap' }"
    data-testid="main-calendar-filter-weekends"
  />
  <UButton
    v-if="isFiltered"
    icon="i-lucide-x"
    :label="t('filters.reset')"
    color="neutral"
    variant="ghost"
    size="sm"
    class="shrink-0"
    data-testid="main-calendar-filter-reset"
    @click="reset"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGoalsStore } from '@/stores/goals.store'
import { useInbox } from '@/composables/useInbox'
import { useMainCalendarFilters } from '@/composables/useCalendarRouteState'
import { projectColor } from '@/helpers/color'

const { t } = useI18n()
const goalsStore = useGoalsStore()
const { isOwnInbox } = useInbox()
const { projects, hideWeekends, isFiltered, reset } = useMainCalendarFilters()

const projectItems = computed(() => goalsStore.goals
  .filter((goal) => !goal.archive)
  .map((goal) => ({
    value: goal.id,
    label: isOwnInbox(goal) ? t('projects.inbox') : goal.name,
    color: isOwnInbox(goal) ? null : projectColor(goal),
  })))
</script>
