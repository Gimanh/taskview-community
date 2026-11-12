<template>
  <ProjectDashboardCard
    :title="t('projectDashboard.weekly.title')"
    :meta="t('projectDashboard.weekly.meta', { count: weeks.length })"
    data-testid="project-dashboard-weekly"
  >
    <p class="flex items-end gap-2">
      <span
        class="text-4xl font-bold leading-none text-highlighted tabular-nums"
        data-testid="project-dashboard-weekly-last7"
      >{{ last7Days }}</span>
      <span class="pb-0.5 text-sm text-muted">{{ t('projectDashboard.weekly.last7') }}</span>
    </p>
    <div class="flex min-h-24 flex-1 items-end gap-1.5">
      <component
        :is="week.count ? 'button' : 'div'"
        v-for="week in bars"
        :key="week.start"
        :type="week.count ? 'button' : undefined"
        class="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-sm"
        :class="{ 'cursor-pointer focus-visible:outline-2 focus-visible:outline-primary': week.count }"
        :title="t('projectDashboard.weekly.barTitle', { date: week.label, count: week.count })"
        :data-testid="`project-dashboard-weekly-bar-${week.start}`"
        @click="selectWeek(week)"
      >
        <span
          v-if="week.count"
          class="text-[10px] leading-none text-toned tabular-nums"
        >{{ week.count }}</span>
        <span
          class="w-full rounded-t-sm transition-colors"
          :class="week.count ? (week.isCurrent ? 'bg-primary' : 'bg-primary/60 group-hover:bg-primary/80') : 'bg-accented'"
          :style="{ height: week.count ? `${week.share}%` : '2px' }"
        />
      </component>
    </div>
    <footer class="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted">
      <span>{{ bars[0]?.label }}</span>
      <span class="text-toned">{{ t('projectDashboard.weekly.thisWeek') }}</span>
    </footer>
  </ProjectDashboardCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ProjectDashboardBucket, ProjectDashboardWeek } from '@/types/project-dashboard.types'
import ProjectDashboardCard from './ProjectDashboardCard.vue'

// The tallest bar leaves room for its value above it
const MAX_BAR_SHARE = 82

const props = defineProps<{
  weeks: ProjectDashboardWeek[]
  last7Days: number
}>()

const emit = defineEmits<{
  // A week with completed tasks was clicked: list them
  select: [bucket: ProjectDashboardBucket]
}>()

const { t, locale } = useI18n()

const dayFormat = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }))

const bars = computed(() => {
  const max = Math.max(...props.weeks.map((week) => week.count), 1)
  return props.weeks.map((week) => ({
    ...week,
    label: dayFormat.value.format(new Date(`${week.start}T00:00:00`)),
    share: Math.max((week.count / max) * MAX_BAR_SHARE, 4),
  }))
})

function selectWeek(week: ProjectDashboardWeek) {
  if (week.count) emit('select', { kind: 'week', date: week.start })
}
</script>
