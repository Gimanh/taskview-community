<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold">
        {{ t('sprints.burndown.title') }}
      </h3>
    </template>

    <p
      v-if="!hasData"
      class="py-6 text-center text-sm text-dimmed"
    >
      {{ t('sprints.burndown.empty') }}
    </p>
    <div
      v-else
      class="relative"
      :style="{ height: `${isMobile ? 200 : 320}px` }"
    >
      <canvas ref="canvas" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Chart, type ChartConfiguration } from 'chart.js'
import type { SprintBurndown } from 'taskview-api'
import { registerChartJs } from '@/components/features/analytics/chart-setup'
import { useTaskView } from '@/composables/useTaskView'
import { useSprintFormat, type EstimateUnit } from '../composables/useSprintFormat'

const props = withDefaults(
  defineProps<{
    burndown: SprintBurndown | null
    unit?: EstimateUnit
  }>(),
  {
    unit: 'points',
  },
)

const { t } = useI18n()
const { isMobile } = useTaskView()
const { unitLabel } = useSprintFormat()

registerChartJs()

const canvas = ref<HTMLCanvasElement | null>(null)
let instance: Chart | null = null

const hasData = computed(() => !!props.burndown && props.burndown.points.length > 0)

function render() {
  if (!canvas.value || !props.burndown) return

  const labels = props.burndown.points.map((p) => p.date.slice(5))
  const config: ChartConfiguration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: t('sprints.burndown.ideal'),
          data: props.burndown.points.map((p) => p.idealHours),
          borderColor: '#a1a1aa',
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0,
        },
        {
          label: t('sprints.burndown.actual'),
          data: props.burndown.points.map((p) => p.remainingHours),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.1)',
          fill: true,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'bottom' },
        tooltip: { enabled: !isMobile.value },
      },
      scales: {
        y: { beginAtZero: true, title: { display: !isMobile.value, text: unitLabel(props.unit) } },
      },
    },
  }

  if (instance) {
    instance.destroy()
    instance = null
  }
  instance = new Chart(canvas.value, config)
}

onMounted(() => {
  if (hasData.value) render()
})

onBeforeUnmount(() => {
  instance?.destroy()
  instance = null
})

watch(() => props.burndown, () => {
  if (hasData.value) render()
}, { deep: true })
</script>
