<template>
  <ProjectDashboardCard
    :title="t('projectDashboard.runway.title')"
    :meta="t('projectDashboard.runway.meta', { count: runway.length })"
    data-testid="project-dashboard-runway"
  >
    <div class="flex min-h-44 flex-1 items-stretch gap-1">
      <button
        v-if="overdue"
        type="button"
        class="mr-1 flex w-14 shrink-0 cursor-pointer flex-col items-center justify-end gap-1 rounded-md bg-error/10 px-1.5 py-2 transition-colors hover:bg-error/20 focus-visible:outline-2 focus-visible:outline-error"
        :title="`${t('projectDashboard.runway.pastDue')}: ${overdue}`"
        data-testid="project-dashboard-runway-overdue"
        @click="emit('select', { kind: 'overdue', date: null })"
      >
        <span class="text-xs font-semibold text-error tabular-nums">{{ overdue }}</span>
        <span
          v-for="index in Math.min(overdue, MAX_STACK)"
          :key="index"
          class="h-4 w-full rounded-sm bg-error"
        />
        <span class="pt-1 text-center text-[10px] font-semibold uppercase leading-tight text-error">
          {{ t('projectDashboard.runway.pastDueShort') }}
        </span>
      </button>
      <component
        :is="day.count ? 'button' : 'div'"
        v-for="day in days"
        :key="day.date"
        :type="day.count ? 'button' : undefined"
        class="flex min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-md px-0.5 py-2"
        :class="columnClass(day)"
        :title="`${day.title}: ${day.count}`"
        :data-testid="`project-dashboard-runway-day-${day.date}`"
        @click="selectDay(day)"
      >
        <UIcon
          v-if="day.isSprintEnd"
          name="i-lucide-flag"
          class="size-3 text-warning"
        />
        <span
          v-if="day.count"
          class="text-xs text-toned tabular-nums"
        >{{ day.count }}</span>
        <span
          v-for="index in Math.min(day.count, MAX_STACK)"
          :key="index"
          class="h-4 w-full rounded-sm"
          :class="day.isToday ? 'bg-primary' : 'bg-primary/60'"
        />
        <span
          v-if="!day.count"
          class="h-0.5 w-full rounded-full bg-accented"
        />
        <span
          class="pt-1 text-[11px] leading-none tabular-nums"
          :class="labelClass(day)"
        >{{ day.number }}</span>
        <span
          class="text-[10px] uppercase leading-none"
          :class="labelClass(day)"
        >{{ day.weekday }}</span>
      </component>
    </div>
    <footer class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-default pt-3 text-xs text-muted">
      <span>{{ t('projectDashboard.runway.undated', { count: undated }) }}</span>
      <span
        v-if="sprintEndName"
        class="flex items-center gap-1.5"
      >
        <UIcon
          name="i-lucide-flag"
          class="size-3 text-warning"
        />
        {{ t('projectDashboard.runway.sprintEnd', { name: sprintEndName }) }}
      </span>
    </footer>
  </ProjectDashboardCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ProjectDashboardBucket, ProjectDashboardRunwayDay } from '@/types/project-dashboard.types'
import type { ProjectDashboardRunwayDayView } from './ProjectDashboardRunway.types'
import ProjectDashboardCard from './ProjectDashboardCard.vue'

const MAX_STACK = 6

const props = defineProps<{
  runway: ProjectDashboardRunwayDay[]
  overdue: number
  undated: number
  sprintName?: string
}>()

const emit = defineEmits<{
  // A column with tasks was clicked: list them
  select: [bucket: ProjectDashboardBucket]
}>()

const { t, locale } = useI18n()

const weekdayFormat = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'narrow' }))
const titleFormat = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }))

const days = computed<ProjectDashboardRunwayDayView[]>(() => props.runway.map((day) => {
  const date = new Date(`${day.date}T00:00:00`)
  return {
    ...day,
    number: date.getDate(),
    weekday: weekdayFormat.value.format(date),
    title: titleFormat.value.format(date),
  }
}))

const sprintEndName = computed(() => (props.runway.some((day) => day.isSprintEnd) ? props.sprintName : undefined))

function columnClass(day: ProjectDashboardRunwayDayView) {
  const today = day.isToday ? 'bg-primary/10 ring ring-primary' : ''
  if (!day.count) return today
  const hover = day.isToday ? 'hover:bg-primary/20' : 'hover:bg-elevated'
  return `${today} cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-primary ${hover}`
}

function selectDay(day: ProjectDashboardRunwayDayView) {
  if (day.count) emit('select', { kind: 'day', date: day.date })
}

function labelClass(day: ProjectDashboardRunwayDayView) {
  if (day.isToday) return 'font-semibold text-highlighted'
  return day.isWeekend ? 'text-dimmed' : 'text-muted'
}
</script>
