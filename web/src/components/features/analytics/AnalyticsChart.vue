<template>
  <div class="flex flex-col gap-3">
    <div class="flex min-h-10 justify-end">
      <UTabs
        v-if="showSwitcher"
        v-model="currentChartType"
        :items="chartTypeOptions"
        size="xs"
        variant="pill"
        :ui="{ list: 'bg-zinc-100 dark:bg-zinc-800' }"
      />
    </div>
    <div class="relative" :style="{ height: `${height ?? 320}px` }">
      <canvas ref="canvas" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chart, type ChartConfiguration } from 'chart.js'
import type { AnalyticsChartType, AnalyticsSection } from 'taskview-api'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { registerChartJs } from './chart-setup'
import { useAnalyticsChartConfig } from './composables/useAnalyticsChartConfig'

const { t, locale } = useI18n()

const props = defineProps<{
  section: AnalyticsSection
  height?: number
}>()

const emit = defineEmits<{
  (e: 'drill-down', payload: { datasetId: string; bucket: string; index: number; meta?: Record<string, unknown> }): void
}>()

registerChartJs()

const canvas = ref<HTMLCanvasElement | null>(null)
let instance: Chart | null = null

const currentChartType = ref<AnalyticsChartType>(
  props.section.defaultChartType ?? props.section.allowedChartTypes[0] ?? 'bar',
)

const chartTypeOptions = computed(() =>
  props.section.allowedChartTypes.map(t => ({
    value: t,
    label: chartTypeLabel(t),
    icon: chartTypeIcon(t),
  })),
)

const showSwitcher = computed(() => props.section.allowedChartTypes.length > 1)

const { build } = useAnalyticsChartConfig()

function render() {
  if (!canvas.value) return
  if (props.section.payload.kind !== 'series') return

  const config: ChartConfiguration = build(props.section, currentChartType.value)
  config.options = {
    ...(config.options ?? {}),
    onClick: (_evt, elements, chart) => {
      if (!elements.length) return
      const el = elements[0]
      const datasetIndex = el.datasetIndex
      const index = el.index
      const ds = chart.data.datasets[datasetIndex]
      const label = chart.data.labels?.[index]
      const payload = props.section.payload as Extract<AnalyticsSection['payload'], { kind: 'series' }>
      const sectionDs = payload.datasets[datasetIndex]
      emit('drill-down', {
        datasetId: sectionDs?.id ?? String(ds.label ?? datasetIndex),
        bucket: String(label ?? ''),
        index,
        meta: sectionDs?.meta,
      })
    },
  }

  if (instance) {
    instance.destroy()
    instance = null
  }
  instance = new Chart(canvas.value, config)
}

function chartTypeLabel(type: AnalyticsChartType): string {
  return t(`analytics.chartTypes.${type}`)
}

function chartTypeIcon(type: AnalyticsChartType): string {
  const icons: Record<AnalyticsChartType, string> = {
    line: 'i-lucide-line-chart',
    bar: 'i-lucide-bar-chart-3',
    area: 'i-lucide-area-chart',
    stackedBar: 'i-lucide-bar-chart',
    stackedArea: 'i-lucide-area-chart',
    horizontalBar: 'i-lucide-bar-chart-horizontal',
    donut: 'i-lucide-pie-chart',
    histogram: 'i-lucide-bar-chart-4',
    radar: 'i-lucide-hexagon',
  }
  return icons[type]
}

onMounted(() => {
  render()
})

onBeforeUnmount(() => {
  if (instance) {
    instance.destroy()
    instance = null
  }
})

watch(() => props.section, () => {
  if (!props.section.allowedChartTypes.includes(currentChartType.value)) {
    currentChartType.value = props.section.defaultChartType ?? props.section.allowedChartTypes[0] ?? 'bar'
  }
  render()
}, { deep: true })

watch(currentChartType, () => render())
watch(locale, () => render())
</script>


