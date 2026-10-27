<template>
  <UBadge
    :label="`${done}/${total}`"
    color="neutral"
    class="bg-elevated tabular-nums"
    :class="allDone ? 'text-primary' : 'text-muted'"
    :ui="{ base: 'rounded-md' }"
    :title="t('tasks.subtasksProgress', { done, total })"
    :aria-label="t('tasks.subtasksProgress', { done, total })"
    variant="subtle"
    size="md"
    data-testid="task-subtasks-badge"
  >
    <template #leading>
      <svg
        viewBox="0 0 16 16"
        class="size-3 shrink-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="8"
          cy="8"
          :r="RADIUS"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          class="opacity-25"
        />
        <circle
          v-if="done > 0"
          cx="8"
          cy="8"
          :r="RADIUS"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="dashOffset"
          class="text-primary transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
        />
      </svg>
    </template>
  </UBadge>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Task } from 'taskview-api'

const RADIUS = 6
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const props = defineProps<{
  subtasks: Task[]
}>()

const { t } = useI18n()

const total = computed(() => props.subtasks.length)
const done = computed(() => props.subtasks.filter(subtask => subtask.complete).length)
const allDone = computed(() => total.value > 0 && done.value === total.value)
const dashOffset = computed(() => CIRCUMFERENCE * (1 - done.value / total.value))
</script>
