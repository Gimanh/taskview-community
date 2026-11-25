<template>
  <Teleport to="body">
    <div
      v-if="box"
      aria-hidden="true"
      class="tv-onboarding-ring fixed top-0 left-0 z-[65] pointer-events-none"
      :style="{
        width: `${box.width}px`,
        height: `${box.height}px`,
        borderRadius: `${box.radius}px`,
        transform: `translate(${box.x}px, ${box.y}px)`,
      }"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useElementBounding, useIntervalFn } from '@vueuse/core'
import { onboardingVisibleArea } from '../composables/useOnboardingTarget'

const PADDING = 6
const EDGE = 2
const REFRESH_MS = 200

const props = defineProps<{
  target: HTMLElement | null
}>()

const target = computed(() => props.target)
const { top, left, width, height, update } = useElementBounding(target)

// Layout shifts that are neither a scroll nor a resize of the target (a list loading above it) move it too
useIntervalFn(update, REFRESH_MS)

const radius = computed(() => (props.target ? Number.parseFloat(getComputedStyle(props.target).borderTopLeftRadius) || 0 : 0))

const box = computed(() => {
  if (!props.target?.isConnected || width.value === 0 || height.value === 0) return null
  // A control that runs out of the screen or of the scrolled area it lives in is framed as far as it is visible
  const visible = onboardingVisibleArea(props.target)
  const x = Math.max(left.value - PADDING, visible.left + EDGE)
  const y = Math.max(top.value - PADDING, visible.top + EDGE)
  const w = Math.min(left.value + width.value + PADDING, visible.right - EDGE) - x
  const h = Math.min(top.value + height.value + PADDING, visible.bottom - EDGE) - y
  if (w <= 0 || h <= 0) return null
  return {
    x,
    y,
    width: w,
    height: h,
    radius: Math.min(radius.value + PADDING, w / 2, h / 2),
  }
})
</script>

<style scoped>
.tv-onboarding-ring {
  outline: 2px solid var(--ui-primary);
  animation: tv-onboarding-pulse 1.6s ease-out infinite;
}

@keyframes tv-onboarding-pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--ui-primary) 45%, transparent);
  }
  100% {
    box-shadow: 0 0 0 12px color-mix(in oklab, var(--ui-primary) 0%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tv-onboarding-ring {
    animation: none;
  }
}
</style>
