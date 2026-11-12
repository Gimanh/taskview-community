<template>
  <ProjectDashboardCard
    :title="data.sprint.name"
    :meta="range"
    data-testid="project-dashboard-sprint"
  >
    <p class="flex items-end gap-2">
      <span class="text-4xl font-bold leading-none text-highlighted tabular-nums">{{ data.done }}</span>
      <span class="pb-0.5 text-sm text-muted">{{ t('projectDashboard.sprint.doneOf', { total: data.total }) }}</span>
    </p>
    <div
      v-for="bar in bars"
      :key="bar.key"
      class="flex flex-col gap-1.5"
    >
      <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span>{{ bar.label }}</span>
        <span class="text-toned tabular-nums">{{ bar.percent }}%</span>
      </div>
      <UProgress
        :model-value="bar.percent"
        :color="bar.color"
        size="sm"
      />
    </div>
    <footer class="mt-auto flex items-center justify-between gap-2 pt-1">
      <span class="flex min-w-0 items-center gap-1.5 text-sm text-toned">
        <UIcon
          :name="pace.icon"
          class="size-4 shrink-0"
          :class="pace.tone"
        />
        <span class="truncate">{{ pace.label }} · {{ t('projectDashboard.sprint.day', { day: data.day, days: data.days }) }}</span>
      </span>
      <UButton
        :to="{ name: 'sprints', params: { projectId: data.sprint.goalId } }"
        :aria-label="t('projectDashboard.sprint.open')"
        :title="t('projectDashboard.sprint.open')"
        icon="i-lucide-arrow-right"
        color="neutral"
        variant="ghost"
        size="sm"
      />
    </footer>
  </ProjectDashboardCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ProjectDashboardSprint } from '@/types/project-dashboard.types'
import ProjectDashboardCard from './ProjectDashboardCard.vue'

// How far work may run ahead of or behind the calendar before the sprint is called off pace
const PACE_TOLERANCE = 0.05

const props = defineProps<{
  data: ProjectDashboardSprint
}>()

const { t, locale } = useI18n()

const dayFormat = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }))
const range = computed(() => {
  const start = new Date(`${props.data.sprint.startDate.slice(0, 10)}T00:00:00`)
  const end = new Date(`${props.data.sprint.endDate.slice(0, 10)}T00:00:00`)
  return `${dayFormat.value.format(start)} – ${dayFormat.value.format(end)}`
})

const bars = computed(() => [
  { key: 'work', label: t('projectDashboard.sprint.workDone'), percent: Math.round(props.data.workShare * 100), color: 'primary' as const },
  { key: 'time', label: t('projectDashboard.sprint.timeElapsed'), percent: Math.round(props.data.timeShare * 100), color: 'neutral' as const },
])

const pace = computed(() => {
  const lead = props.data.workShare - props.data.timeShare
  if (lead > PACE_TOLERANCE) return { label: t('projectDashboard.sprint.ahead'), icon: 'i-lucide-trending-up', tone: 'text-success' }
  if (lead < -PACE_TOLERANCE) return { label: t('projectDashboard.sprint.behind'), icon: 'i-lucide-trending-down', tone: 'text-error' }
  return { label: t('projectDashboard.sprint.onPace'), icon: 'i-lucide-minus', tone: 'text-muted' }
})
</script>
