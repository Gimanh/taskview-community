<template>
  <section
    class="flex flex-col gap-5 rounded-3xl bg-linear-to-br from-primary/15 to-elevated/40 p-4 ring ring-primary/25 sm:p-6"
    data-testid="project-dashboard-hero"
  >
    <div class="flex items-center gap-4 sm:gap-7">
      <ProjectDashboardProgressRing
        :percent="model.totals.progress ?? 0"
        :caption="compactRatio({ part: model.totals.done, whole: model.totals.total })"
        :description="t('projectDashboard.hero.doneOf', { done: model.totals.done, total: model.totals.total })"
      />
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <span class="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          {{ variant === 'pace' ? t('projectDashboard.hero.paceLabel') : t('projectDashboard.hero.forecast') }}
          <ProjectDashboardForecastHelp
            :model="model"
            :variant="variant"
          />
        </span>
        <h2
          class="text-lg font-semibold leading-tight text-balance text-highlighted sm:text-2xl"
          data-testid="project-dashboard-forecast"
        >
          {{ headline }}
        </h2>
        <p class="text-sm text-toned">
          {{ note }}
        </p>
        <ProjectDashboardCounters
          v-if="isDesktop"
          :totals="model.totals"
          class="mt-3"
        />
      </div>
    </div>
    <ProjectDashboardCounters
      v-if="!isDesktop"
      :totals="model.totals"
    />
    <ProjectDashboardTaskRibbon
      :totals="model.totals"
      class="mt-auto"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCompactNumber } from '@/composables/useCompactNumber'
import { useTaskView } from '@/composables/useTaskView'
import type { ProjectDashboardHeroVariant, ProjectDashboardModel } from '@/types/project-dashboard.types'
import ProjectDashboardCounters from './ProjectDashboardCounters.vue'
import ProjectDashboardForecastHelp from './ProjectDashboardForecastHelp.vue'
import ProjectDashboardProgressRing from './ProjectDashboardProgressRing.vue'
import ProjectDashboardTaskRibbon from './ProjectDashboardTaskRibbon.vue'

const props = withDefaults(defineProps<{
  model: ProjectDashboardModel
  // A finish date suits one project; across all projects the pace and its trend say more
  variant?: ProjectDashboardHeroVariant
}>(), {
  variant: 'forecast',
})

const { t, locale } = useI18n()
const { compactRatio } = useCompactNumber()
const { isDesktop } = useTaskView()

// A forecast that lands in another year would read as a date in the past without the year
const dateFormat = computed(() => {
  const sameYear = props.model.forecast?.date.getFullYear() === new Date().getFullYear()
  return new Intl.DateTimeFormat(locale.value, sameYear
    ? { weekday: 'short', day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' })
})
const rateFormat = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }))

const weeklyRate = (closed: number) => rateFormat.value.format(closed / props.model.paceWindow.weeks)

const paceHeadline = computed(() => {
  const { weeks, closed } = props.model.paceWindow
  return closed
    ? t('projectDashboard.hero.paceRate', { rate: weeklyRate(closed) })
    : t('projectDashboard.hero.paceNone', { weeks })
})

const paceNote = computed(() => {
  const { weeks, closed } = props.model.paceWindow
  const previous = props.model.previousPaceClosed ?? closed
  if (previous === closed) return t('projectDashboard.hero.paceSame', { weeks })
  return t(previous < closed ? 'projectDashboard.hero.paceUp' : 'projectDashboard.hero.paceDown', {
    rate: weeklyRate(previous),
    weeks,
  })
})

const headline = computed(() => {
  if (props.variant === 'pace') return paceHeadline.value
  const forecast = props.model.forecast
  if (forecast) return t('projectDashboard.hero.onPace', { date: dateFormat.value.format(forecast.date) })
  return props.model.totals.open ? t('projectDashboard.hero.noForecast') : t('projectDashboard.hero.allDone')
})

const note = computed(() => {
  if (props.variant === 'pace') return paceNote.value
  const forecast = props.model.forecast
  if (forecast) {
    return t('projectDashboard.hero.pace', {
      rate: rateFormat.value.format(forecast.weeklyRate),
      weeks: Math.max(Math.round(forecast.weeksLeft), 1),
    })
  }
  return props.model.totals.open ? t('projectDashboard.hero.noForecastHint') : t('projectDashboard.hero.allDoneHint')
})
</script>
