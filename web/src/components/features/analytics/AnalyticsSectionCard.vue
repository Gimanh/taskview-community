<template>
  <UCard>
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
          <h3 class="text-base font-semibold">
            {{ pick(section.title) }}
          </h3>
          <p v-if="section.description" class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ pick(section.description) }}
          </p>
        </div>
        <AnalyticsHelpButton
          v-if="section.help"
          :help="section.help"
          :section-title="section.title"
        />
      </div>
    </template>

    <div v-if="section.payload.kind === 'series' && section.payload.datasets.length === 0" class="py-12 text-center text-sm text-zinc-500">
      {{ t('analytics.sectionCard.noData') }}
    </div>
    <AnalyticsChart
      v-else
      :section="section"
      @drill-down="onDrillDown(section, $event)"
    />
  </UCard>
</template>
<script setup lang="ts">
import type { AnalyticsSection } from 'taskview-api'
import { useI18n } from 'vue-i18n'
import AnalyticsChart from './AnalyticsChart.vue'
import AnalyticsHelpButton from './AnalyticsHelpButton.vue'
import { useAnalyticsLocale } from './composables/useAnalyticsLocale'

defineProps<{
  section: AnalyticsSection
}>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'drill-down', payload: { sectionId: string; datasetId: string; bucket: string; index: number; meta?: Record<string, unknown> }): void
}>()

const { pick } = useAnalyticsLocale()

function onDrillDown(section: AnalyticsSection, payload: { datasetId: string; bucket: string; index: number; meta?: Record<string, unknown> }) {
  emit('drill-down', { sectionId: section.id, ...payload })
}
</script>


