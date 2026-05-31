<template>
  <div class="flex flex-col gap-2">
    <h4 class="text-sm font-semibold text-muted">
      {{ title }}
    </h4>
    <div
      ref="scrollEl"
      class="flex max-h-[60vh] flex-col gap-2 overflow-y-auto"
    >
      <p
        v-if="!loading && !error && !tasks.length"
        class="py-4 text-center text-sm text-dimmed"
      >
        {{ emptyLabel }}
      </p>

      <button
        v-for="task in tasks"
        :key="task.id"
        type="button"
        class="flex items-center justify-between gap-2 rounded-lg border border-default p-2 text-left hover:bg-elevated disabled:opacity-50"
        :disabled="busyId === task.id"
        @click="emit('assign', task)"
      >
        <template v-if="direction === 'forward'">
          <span class="truncate text-sm">{{ task.description }}</span>
          <span class="flex shrink-0 items-center gap-1 text-xs text-dimmed">
            {{ formatPoints(toNumber(task.estimateValue)) }} {{ unitLabel(unit, true) }}
            <UIcon name="i-lucide-arrow-right" />
          </span>
        </template>
        <template v-else>
          <span class="flex shrink-0 items-center gap-1 text-xs text-dimmed">
            <UIcon name="i-lucide-arrow-left" />
            {{ formatPoints(toNumber(task.estimateValue)) }} {{ unitLabel(unit, true) }}
          </span>
          <span class="truncate text-sm">{{ task.description }}</span>
        </template>
      </button>

      <div
        v-if="loading"
        class="flex justify-center py-3"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-5 animate-spin text-dimmed"
        />
      </div>

      <div
        v-if="error && !loading"
        class="flex flex-col items-center gap-2 py-3"
      >
        <p class="text-sm text-error">
          {{ t('sprints.planning.loadError') }}
        </p>
        <UButton
          size="xs"
          variant="soft"
          icon="i-lucide-rotate-cw"
          :label="t('sprints.planning.retry')"
          @click="emit('retry')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInfiniteScroll } from '@vueuse/core'
import { useSprintFormat } from '../composables/useSprintFormat'
import type { EstimateUnit } from '../composables/useSprintFormat'
import type { SprintTask } from '@/types/sprints.types'

const props = defineProps<{
  title: string
  emptyLabel: string
  tasks: SprintTask[]
  unit: EstimateUnit
  direction: 'forward' | 'back'
  loading: boolean
  hasMore: boolean
  error: boolean
  busyId: number | null
}>()

const emit = defineEmits<{
  assign: [task: SprintTask]
  loadMore: []
  retry: []
}>()

const { t } = useI18n()
const { formatPoints, toNumber, unitLabel } = useSprintFormat()

const scrollEl = ref<HTMLElement | null>(null)

watch(scrollEl, async (el) => {
  if (!el) return
  await nextTick()
  useInfiniteScroll(
    el,
    () => emit('loadMore'),
    {
      distance: 200,
      canLoadMore: () => props.hasMore && !props.loading && !props.error,
    },
  )
})
</script>
