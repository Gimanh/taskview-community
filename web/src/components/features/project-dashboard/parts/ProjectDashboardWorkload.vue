<template>
  <ProjectDashboardCard
    :title="t('projectDashboard.workload.title')"
    :meta="hoursTotal === null ? undefined : t('projectDashboard.workload.hoursThisWeek', { hours: formatHours(hoursTotal) })"
    data-testid="project-dashboard-workload"
  >
    <ul
      v-if="rows.length"
      class="flex flex-1 flex-col justify-around gap-2"
    >
      <li
        v-for="row in rows"
        :key="row.key"
        class="flex min-h-7 items-center gap-2.5"
        :data-testid="`project-dashboard-workload-${row.key}`"
      >
        <UAvatar
          v-if="row.email"
          :alt="row.email"
          :text="row.email.slice(0, 2).toUpperCase()"
          size="2xs"
        />
        <UAvatar
          v-else
          icon="i-lucide-user"
          size="2xs"
        />
        <span
          class="w-28 shrink-0 truncate text-sm sm:w-36"
          :class="row.unassigned ? 'text-muted' : 'text-highlighted'"
          :title="row.email ?? undefined"
        >{{ row.email ?? (row.unassigned ? t('projectDashboard.workload.unassigned') : `#${row.key}`) }}</span>
        <span class="flex h-2 min-w-0 flex-1 gap-0.5 overflow-hidden rounded-full bg-accented">
          <span
            v-if="row.overdue"
            class="h-full rounded-full bg-error"
            :style="{ width: share(row.overdue) }"
          />
          <span
            v-if="row.open > row.overdue"
            class="h-full rounded-full"
            :class="row.unassigned ? 'bg-inverted/40' : 'bg-primary'"
            :style="{ width: share(row.open - row.overdue) }"
          />
        </span>
        <span class="w-8 shrink-0 text-right text-xs font-semibold text-highlighted tabular-nums">{{ row.open }}</span>
        <span class="w-16 shrink-0 text-right text-xs whitespace-nowrap text-error tabular-nums">{{ row.overdue ? t('projectDashboard.workload.late', { count: row.overdue }) : '' }}</span>
        <span
          v-if="hoursTotal !== null"
          class="w-12 shrink-0 text-right text-xs whitespace-nowrap text-toned tabular-nums"
        >{{ row.seconds === null ? '—' : t('projectDashboard.workload.hours', { hours: formatHours(row.seconds) }) }}</span>
      </li>
    </ul>
    <p
      v-else
      class="flex flex-1 items-center justify-center py-6 text-sm text-muted"
    >
      {{ t('projectDashboard.workload.empty') }}
    </p>
  </ProjectDashboardCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ProjectDashboardWorkloadRow } from '@/types/project-dashboard.types'
import ProjectDashboardCard from './ProjectDashboardCard.vue'

const SECONDS_IN_HOUR = 3600

const props = defineProps<{
  rows: ProjectDashboardWorkloadRow[]
  // Seconds logged by everyone this week; null when time tracking is not visible
  hoursTotal: number | null
}>()

const { t, locale } = useI18n()

const hoursFormat = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }))
const max = computed(() => Math.max(...props.rows.map((row) => row.open), 1))

function formatHours(seconds: number) {
  return hoursFormat.value.format(seconds / SECONDS_IN_HOUR)
}

function share(count: number) {
  return `${(count / max.value) * 100}%`
}
</script>
