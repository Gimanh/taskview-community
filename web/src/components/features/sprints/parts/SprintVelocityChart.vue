<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold">
        {{ t('sprints.velocity.title') }}
      </h3>
    </template>

    <p
      v-if="!points.length"
      class="py-6 text-center text-sm text-dimmed"
    >
      {{ t('sprints.velocity.empty') }}
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
import type { SprintVelocityPoint } from 'taskview-api'
import { registerChartJs } from '@/components/features/analytics/chart-setup'
import { useTaskView } from '@/composables/useTaskView'
import { useSprintFormat, type EstimateUnit } from '../composables/useSprintFormat'

const props = withDefaults(
  defineProps<{
    points: SprintVelocityPoint[]
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

const points = computed(() => props.points)

function render() {
  if (!canvas.value || !points.value.length) return

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: points.value.map((p) => p.name),
      datasets: [
        {
          label: t('sprints.velocity.planned'),
          data: points.value.map((p) => p.plannedHours),
          backgroundColor: 'rgba(161,161,170,0.6)',
        },
        {
          label: t('sprints.velocity.accepted'),
          data: points.value.map((p) => p.acceptedHours),
          backgroundColor: 'rgba(34,197,94,0.7)',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
  if (points.value.length) render()
})

onBeforeUnmount(() => {
  instance?.destroy()
  instance = null
})

watch(points, () => {
  if (points.value.length) render()
}, { deep: true })
</script>
