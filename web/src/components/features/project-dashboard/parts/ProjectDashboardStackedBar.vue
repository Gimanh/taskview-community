<template>
  <div class="flex flex-col gap-2.5">
    <div
      class="flex h-3.5 gap-0.5 overflow-hidden rounded-sm"
      aria-hidden="true"
    >
      <span
        v-for="segment in segments"
        :key="segment.key"
        class="h-full min-w-1"
        :class="segment.color"
        :style="{ flexGrow: segment.count, flexBasis: 0 }"
        :title="`${segment.label}: ${segment.count}`"
      />
    </div>
    <ul class="grid grid-cols-2 gap-x-4 gap-y-1.5">
      <li
        v-for="segment in segments"
        :key="segment.key"
        class="flex min-w-0 items-center gap-2 text-sm"
      >
        <span
          class="size-2 shrink-0 rounded-full"
          :class="segment.color"
        />
        <span
          class="min-w-0 flex-1 truncate text-toned"
          :title="segment.label"
        >{{ segment.label }}</span>
        <span class="shrink-0 text-xs font-semibold text-highlighted tabular-nums">{{ segment.count }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { ProjectDashboardStackedBarSegment } from './ProjectDashboardStackedBar.types'

defineProps<{
  segments: ProjectDashboardStackedBarSegment[]
}>()
</script>
