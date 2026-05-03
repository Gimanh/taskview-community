<template>
  <UCard
    :class="isClickable ? 'cursor-pointer transition hover:border-emerald-400 dark:hover:border-emerald-500' : ''"
    role="button"
    :tabindex="isClickable ? 0 : -1"
    @click="onClick"
    @keydown.enter="onClick"
  >
    <div class="flex flex-col gap-2">
      <div class="flex items-start justify-between gap-2">
        <div class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ pick(section.title) }}
        </div>
        <AnalyticsHelpButton
          v-if="section.help"
          :help="section.help"
          :section-title="section.title"
          @click.stop
        />
      </div>
      <div class="text-3xl font-semibold">
        {{ formattedValue }}
      </div>
      <div v-if="payload.delta" class="flex items-center gap-1 text-sm" :class="deltaClass">
        <UIcon :name="deltaIcon" class="size-4" />
        <span>{{ payload.delta.value }}%</span>
      </div>
      <div v-if="section.description" class="text-xs text-zinc-500 dark:text-zinc-400">
        {{ pick(section.description) }}
      </div>
    </div>
  </UCard>
</template>
<script setup lang="ts">
import type { AnalyticsKpiPayload, AnalyticsSection } from 'taskview-api'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AnalyticsHelpButton from './AnalyticsHelpButton.vue'
import { useAnalyticsLocale } from './composables/useAnalyticsLocale'

const props = defineProps<{
  section: AnalyticsSection
}>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'drill-down', payload: { sectionId: string; datasetId: string; bucket: string; index: number; meta?: Record<string, unknown> }): void
}>()

const { pick } = useAnalyticsLocale()

const payload = computed(() => props.section.payload as AnalyticsKpiPayload)
const isClickable = computed(() => !!props.section.drillDown)

function onClick() {
  if (!isClickable.value) return
  emit('drill-down', {
    sectionId: props.section.id,
    datasetId: 'kpi',
    bucket: pick(props.section.title),
    index: 0,
  })
}

const formattedValue = computed(() => {
  const v = payload.value.value
  switch (payload.value.unit) {
    case 'percent':
      return `${v}%`
    case 'days':
      return `${v} ${t('analytics.units.days')}`
    case 'hours':
      return `${v} ${t('analytics.units.hours')}`
    case 'currency':
      return v.toLocaleString()
    default:
      return v.toLocaleString()
  }
})

const deltaClass = computed(() => {
  if (!payload.value.delta) return ''
  if (payload.value.delta.direction === 'flat') return 'text-zinc-500'
  return payload.value.delta.isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
})

const deltaIcon = computed(() => {
  if (!payload.value.delta) return ''
  switch (payload.value.delta.direction) {
    case 'up':
      return 'i-lucide-trending-up'
    case 'down':
      return 'i-lucide-trending-down'
    default:
      return 'i-lucide-minus'
  }
})
</script>


