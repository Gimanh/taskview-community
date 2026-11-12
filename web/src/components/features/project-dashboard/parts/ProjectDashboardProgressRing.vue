<template>
  <div
    class="@container relative size-28 shrink-0 sm:size-40"
    role="img"
    :aria-label="label"
  >
    <svg
      viewBox="0 0 100 100"
      class="size-full -rotate-90"
      aria-hidden="true"
    >
      <circle
        cx="50"
        cy="50"
        :r="RADIUS"
        fill="none"
        stroke="var(--ui-border-accented)"
        stroke-width="10"
      />
      <circle
        v-if="share > 0"
        cx="50"
        cy="50"
        :r="RADIUS"
        fill="none"
        stroke="var(--ui-primary)"
        stroke-width="10"
        stroke-linecap="round"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="CIRCUMFERENCE * (1 - share)"
        class="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
      />
    </svg>
    <span class="absolute inset-0 flex items-center justify-center text-[20cqw] font-bold leading-none text-highlighted tabular-nums">{{ value }}</span>
    <span
      class="absolute inset-x-0 top-[65%] text-center font-medium leading-none whitespace-nowrap text-muted tabular-nums"
      :style="{ fontSize: `${captionSize}cqw` }"
    >{{ caption }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const RADIUS = 42
// Sizes are shares of the ring's width, so the text scales with the ring
const CAPTION_MAX_SIZE = 9
// The width left for the caption under the percent, and how wide a character is against the font size
const CAPTION_WIDTH = 58
const CAPTION_CHAR_WIDTH = 0.56
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const props = defineProps<{
  // 0..100
  percent: number
  // Short enough to fit inside the ring, like "12 / 40"
  caption: string
  // The same in words, for screen readers
  description: string
}>()

const share = computed(() => Math.min(Math.max(props.percent, 0), 100) / 100)
const value = computed(() => `${Math.round(props.percent)}%`)
// A longer caption gets a smaller font, so it stays inside the ring
const captionSize = computed(() =>
  Math.min(CAPTION_MAX_SIZE, CAPTION_WIDTH / (Math.max(props.caption.length, 1) * CAPTION_CHAR_WIDTH)))
const label = computed(() => `${value.value}, ${props.description}`)
</script>
