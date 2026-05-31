<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">
          {{ t('sprints.taskList.title') }}
        </h3>
        <div class="flex items-center gap-2">
          <UBadge
            color="neutral"
            variant="subtle"
          >
            {{ tasks.length }}
          </UBadge>
          <slot name="actions" />
        </div>
      </div>
    </template>

    <p
      v-if="!tasks.length"
      class="py-6 text-center text-sm text-dimmed"
    >
      {{ t('sprints.taskList.empty') }}
    </p>

    <div
      v-else
      class="flex flex-col divide-y divide-default"
    >
      <div
        v-for="task in tasks"
        :key="task.id"
        class="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="flex min-w-0 items-center gap-2">
          <UIcon
            :name="task.complete ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
            :class="task.complete ? 'text-success' : 'text-dimmed'"
          />
          <span
            class="truncate"
            :class="{ 'line-through text-dimmed': task.complete }"
          >
            {{ task.description }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-3 text-sm">
          <UBadge
            v-if="assigneeLabel(task)"
            color="neutral"
            variant="soft"
            icon="i-lucide-user"
          >
            {{ assigneeLabel(task) }}
          </UBadge>

          <span class="text-muted">
            {{ t('sprints.taskList.estimate') }}:
            <span class="font-medium text-default">{{ formatPoints(toNumber(task.estimateValue)) }} {{ unitLabel(unit, true) }}</span>
          </span>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSprintFormat, type EstimateUnit } from '../composables/useSprintFormat'
import type { SprintTask } from '@/types/sprints.types'

const props = withDefaults(
  defineProps<{
    tasks: SprintTask[]
    userMap: Map<number, { id: number; email: string }>
    unit?: EstimateUnit
  }>(),
  {
    unit: 'points',
  },
)

const { t } = useI18n()
const { formatPoints, toNumber, unitLabel } = useSprintFormat()

const unit = computed(() => props.unit)

function assigneeLabel(task: SprintTask): string {
  const first = task.assignedUsers?.[0]
  if (first === undefined) return ''
  const user = props.userMap.get(first)
  const name = user?.email ?? `#${first}`
  const extra = task.assignedUsers.length - 1
  return extra > 0 ? `${name} +${extra}` : name
}
</script>
