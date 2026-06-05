<template>
  <UCard>
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-semibold">
              {{ sprint.name }}
            </h2>
            <UBadge
              :color="statusColor(sprint.status)"
              variant="subtle"
              size="sm"
            >
              {{ t(`sprints.status.${sprint.status}`) }}
            </UBadge>
            <UBadge
              v-if="sprint.pausedAt"
              color="warning"
              variant="outline"
              size="sm"
              icon="i-lucide-pause"
            >
              {{ t('sprints.paused') }}
            </UBadge>
          </div>
          <p class="text-sm text-dimmed">
            {{ dateRange }}
          </p>
          <p
            v-if="sprint.goalText"
            class="text-sm text-muted"
          >
            {{ sprint.goalText }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <slot name="actions" />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted">{{ t('sprints.metrics.capacityUtilization') }}</span>
          <span :class="overCapacity ? 'text-error font-medium' : 'text-default'">
            {{ formatPoints(usedPoints) }} / {{ capacityLabel }} {{ unitLabel(unit) }}
          </span>
        </div>
        <UProgress
          v-if="utilization !== null"
          :model-value="Math.min(utilization * 100, 100)"
          :color="overCapacity ? 'error' : 'primary'"
        />
        <p
          v-else
          class="text-xs text-dimmed"
        >
          {{ t('sprints.metrics.noCapacity') }}
        </p>
      </div>

      <div class="flex flex-wrap gap-4 text-sm">
        <div class="flex flex-col">
          <span class="text-dimmed">{{ t('sprints.metrics.planned') }}</span>
          <span class="font-medium">{{ formatPoints(plannedPoints) }} {{ unitLabel(unit) }}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-dimmed">{{ t('sprints.metrics.accepted') }}</span>
          <span class="font-medium">{{ formatPoints(acceptedPoints) }} {{ unitLabel(unit) }}</span>
        </div>
        <div
          v-if="sprint.goalAchieved !== null"
          class="flex flex-col"
        >
          <span class="text-dimmed">{{ t('sprints.metrics.goal') }}</span>
          <UBadge
            :color="sprint.goalAchieved ? 'success' : 'error'"
            variant="subtle"
            size="sm"
          >
            {{ sprint.goalAchieved ? t('sprints.metrics.goalAchieved') : t('sprints.metrics.goalMissed') }}
          </UBadge>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@vueuse/core'
import type { Sprint } from 'taskview-api'
import { useSprintFormat } from '../composables/useSprintFormat'
import { useGoalsStore } from '@/stores/goals.store'
import type { SprintTask } from '@/types/sprints.types'

const props = defineProps<{
  sprint: Sprint
  tasks: SprintTask[]
  acceptedPoints?: number
}>()

const { t } = useI18n()
const { statusColor, formatPoints, sumEstimatePoints, capacityUtilization, toNumber, unitLabel } = useSprintFormat()
const goalsStore = useGoalsStore()

const unit = computed(() => goalsStore.goalMap.get(props.sprint.goalId)?.estimateUnit ?? 'points')

const dateRange = computed(() => {
  const start = useDateFormat(new Date(props.sprint.startDate), 'DD MMM').value
  const end = useDateFormat(new Date(props.sprint.endDate), 'DD MMM YYYY').value
  return `${start} – ${end}`
})

const usedPoints = computed(() => sumEstimatePoints(props.tasks))
const plannedPoints = computed(() => usedPoints.value)
const acceptedPoints = computed(() => props.acceptedPoints ?? 0)

const utilization = computed(() => capacityUtilization(usedPoints.value, props.sprint.capacity))
const overCapacity = computed(() => utilization.value !== null && utilization.value > 1)

const capacityLabel = computed(() => {
  const cap = toNumber(props.sprint.capacity)
  return cap > 0 ? formatPoints(cap) : '—'
})
</script>
