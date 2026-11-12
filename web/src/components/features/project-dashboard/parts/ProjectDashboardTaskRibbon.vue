<template>
  <div
    class="flex flex-col gap-2"
    data-testid="project-dashboard-ribbon"
  >
    <div
      class="grid gap-0.5"
      :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
      aria-hidden="true"
    >
      <span
        v-for="(cell, index) in cells"
        :key="index"
        class="h-3 rounded-xs"
        :class="CELL_CLASS[cell]"
      />
    </div>
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] font-medium uppercase tracking-wide text-muted tabular-nums">
      <span v-if="exact">{{ t('projectDashboard.ribbon.oneCell') }}</span>
      <span>{{ t('projectDashboard.ribbon.counts', { done: totals.done, overdue: totals.overdue, onTrack: totals.onTrack }) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ProjectDashboardBuilder } from '@/helpers/ProjectDashboardBuilder'
import { useTaskView } from '@/composables/useTaskView'
import type { ProjectDashboardRibbonCell, ProjectDashboardTotals } from '@/types/project-dashboard.types'

const MAX_CELLS = 64
const MOBILE_COLUMNS = 32

const CELL_CLASS: Record<ProjectDashboardRibbonCell, string> = {
  done: 'bg-primary',
  overdue: 'bg-error',
  open: 'bg-accented',
}

const props = defineProps<{
  totals: ProjectDashboardTotals
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()

const cells = computed(() => ProjectDashboardBuilder.ribbon({ totals: props.totals, maxCells: MAX_CELLS }))
// Every task has its own cell until the project outgrows the ribbon; then the cells show shares
const exact = computed(() => props.totals.total <= MAX_CELLS)
const columns = computed(() => {
  const perRow = isMobile.value ? MOBILE_COLUMNS : MAX_CELLS
  return Math.min(cells.value.length, perRow) || 1
})
</script>
