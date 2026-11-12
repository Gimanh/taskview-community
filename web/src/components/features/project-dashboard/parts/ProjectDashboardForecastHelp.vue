<template>
  <span class="inline-flex">
    <UButton
      icon="i-lucide-circle-help"
      color="neutral"
      variant="ghost"
      size="xs"
      square
      :aria-label="texts.title"
      :title="texts.title"
      data-testid="project-dashboard-forecast-help"
      @click="isOpen = true"
    />

    <UModal
      v-model:open="isOpen"
      :title="texts.title"
      :fullscreen="isMobile"
    >
      <template #body>
        <div
          class="flex flex-col gap-4 text-sm leading-relaxed text-toned"
          data-testid="project-dashboard-forecast-help-body"
        >
          <p>{{ texts.intro }}</p>
          <ol
            v-if="steps.length"
            class="flex flex-col gap-2"
          >
            <li
              v-for="(step, index) in steps"
              :key="index"
              class="flex gap-3"
            >
              <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-elevated text-xs font-semibold text-highlighted tabular-nums">{{ index + 1 }}</span>
              <span class="text-highlighted">{{ step }}</span>
            </li>
          </ol>
          <p
            v-else
            class="text-highlighted"
          >
            {{ reason }}
          </p>
          <p class="text-muted">
            {{ texts.caveat }}
          </p>
        </div>
      </template>
    </UModal>
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskView } from '@/composables/useTaskView'
import type { ProjectDashboardHeroVariant, ProjectDashboardModel } from '@/types/project-dashboard.types'

const props = defineProps<{
  model: ProjectDashboardModel
  variant: ProjectDashboardHeroVariant
}>()

const { t, locale } = useI18n()
const { isMobile } = useTaskView()
const isOpen = ref(false)

const rateFormat = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }))
const weeksFormat = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }))
const dateFormat = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric' }))

const texts = computed(() => (props.variant === 'pace'
  ? {
    title: t('projectDashboard.paceHelp.title'),
    intro: t('projectDashboard.paceHelp.intro'),
    caveat: t('projectDashboard.paceHelp.caveat'),
  }
  : {
    title: t('projectDashboard.forecastHelp.title'),
    intro: t('projectDashboard.forecastHelp.intro'),
    caveat: t('projectDashboard.forecastHelp.caveat'),
  }))

const paceSteps = computed(() => {
  const { weeks, closed } = props.model.paceWindow
  const previous = props.model.previousPaceClosed ?? 0
  return [
    t('projectDashboard.forecastHelp.pace', { weeks, closed, rate: rateFormat.value.format(closed / weeks) }),
    t('projectDashboard.paceHelp.previous', { weeks, closed: previous, rate: rateFormat.value.format(previous / weeks) }),
  ]
})

const steps = computed(() => {
  if (props.variant === 'pace') return paceSteps.value
  const forecast = props.model.forecast
  if (!forecast) return []
  const { weeks, closed } = props.model.paceWindow
  const open = props.model.totals.open
  const rate = rateFormat.value.format(forecast.weeklyRate)
  return [
    t('projectDashboard.forecastHelp.pace', { weeks, closed, rate }),
    t('projectDashboard.forecastHelp.remaining', { open }),
    t('projectDashboard.forecastHelp.result', {
      open,
      rate,
      weeksLeft: weeksFormat.value.format(forecast.weeksLeft),
      date: dateFormat.value.format(forecast.date),
    }),
  ]
})

const reason = computed(() => (props.model.totals.open
  ? t('projectDashboard.forecastHelp.noPace', { weeks: props.model.paceWindow.weeks })
  : t('projectDashboard.forecastHelp.allDone')))
</script>
