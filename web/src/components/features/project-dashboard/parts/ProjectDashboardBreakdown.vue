<template>
  <ProjectDashboardCard
    :title="t('projectDashboard.breakdown.title', { count: open })"
    data-testid="project-dashboard-breakdown"
  >
    <p
      v-if="!open"
      class="flex flex-1 items-center justify-center py-6 text-sm text-muted"
    >
      {{ t('projectDashboard.workload.empty') }}
    </p>
    <template v-else>
      <section
        v-if="statusSegments"
        class="flex flex-col gap-2"
        data-testid="project-dashboard-statuses"
      >
        <h4 class="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {{ t('projectDashboard.breakdown.byStatus') }}
        </h4>
        <ProjectDashboardStackedBar :segments="statusSegments" />
      </section>
      <section
        v-if="prioritySegments"
        class="flex flex-col gap-2"
        :class="{ 'border-t border-default pt-3': statusSegments }"
        data-testid="project-dashboard-priorities"
      >
        <h4 class="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {{ t('projectDashboard.breakdown.byPriority') }}
        </h4>
        <ProjectDashboardStackedBar :segments="prioritySegments" />
      </section>
    </template>
  </ProjectDashboardCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ProjectDashboardSegment } from '@/types/project-dashboard.types'
import type { ProjectDashboardPriorityView } from './ProjectDashboardBreakdown.types'
import type { ProjectDashboardStackedBarSegment } from './ProjectDashboardStackedBar.types'
import ProjectDashboardCard from './ProjectDashboardCard.vue'
import ProjectDashboardStackedBar from './ProjectDashboardStackedBar.vue'

const NO_STATUS_COLOR = 'bg-inverted/40'
const STATUS_COLORS = ['bg-info', 'bg-warning', 'bg-success', 'bg-secondary', 'bg-primary', 'bg-error']
const PRIORITY_VIEW: Record<number, ProjectDashboardPriorityView> = {
  3: { color: 'bg-error', label: 'priority.high' },
  2: { color: 'bg-warning', label: 'priority.medium' },
  1: { color: 'bg-success', label: 'priority.low' },
  0: { color: 'bg-inverted/40', label: 'projectDashboard.breakdown.noPriority' },
}

const props = defineProps<{
  open: number
  statuses: ProjectDashboardSegment[] | null
  priorities: ProjectDashboardSegment[] | null
}>()

const { t } = useI18n()

const statusSegments = computed<ProjectDashboardStackedBarSegment[] | null>(() => {
  if (!props.statuses?.length) return null
  let column = 0
  return props.statuses.map((status) => ({
    key: status.id,
    label: status.name ?? t('projectDashboard.breakdown.noStatus'),
    count: status.count,
    color: status.name === null ? NO_STATUS_COLOR : STATUS_COLORS[column++ % STATUS_COLORS.length],
  }))
})

const prioritySegments = computed<ProjectDashboardStackedBarSegment[] | null>(() => {
  if (!props.priorities?.length) return null
  return props.priorities.map((priority) => ({
    key: priority.id,
    label: t(PRIORITY_VIEW[priority.id].label),
    count: priority.count,
    color: PRIORITY_VIEW[priority.id].color,
  }))
})
</script>
