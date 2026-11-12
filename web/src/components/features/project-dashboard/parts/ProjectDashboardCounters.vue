<template>
  <dl class="flex divide-x divide-default">
    <div
      v-for="counter in counters"
      :key="counter.key"
      class="flex min-w-0 flex-1 flex-col gap-1 px-3 first:pl-0 last:pr-0"
      :data-testid="`project-dashboard-counter-${counter.key}`"
    >
      <dd
        class="text-2xl font-bold leading-none tabular-nums sm:text-3xl"
        :class="counter.value ? counter.tone : 'text-highlighted'"
        :title="String(counter.value)"
      >
        {{ compactNumber(counter.value) }}
      </dd>
      <dt class="truncate text-[11px] font-medium uppercase tracking-wide text-muted">
        {{ counter.label }}
      </dt>
    </div>
  </dl>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCompactNumber } from '@/composables/useCompactNumber'
import type { ProjectDashboardTotals } from '@/types/project-dashboard.types'

const props = defineProps<{
  totals: ProjectDashboardTotals
}>()

const { t } = useI18n()
const { compactNumber } = useCompactNumber()

const counters = computed(() => [
  { key: 'overdue', value: props.totals.overdue, label: t('projectDashboard.counters.overdue'), tone: 'text-error' },
  { key: 'due-today', value: props.totals.dueToday, label: t('projectDashboard.counters.dueToday'), tone: 'text-warning' },
  { key: 'this-week', value: props.totals.dueThisWeek, label: t('projectDashboard.counters.thisWeek'), tone: 'text-highlighted' },
  { key: 'open', value: props.totals.open, label: t('projectDashboard.counters.open'), tone: 'text-highlighted' },
])
</script>
