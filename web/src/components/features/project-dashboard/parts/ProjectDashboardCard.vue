<template>
  <UCard :ui="{ root: 'flex flex-col', body: 'flex flex-1 flex-col gap-3 p-4 sm:p-5' }">
    <header class="flex items-center justify-between gap-3">
      <h3 class="truncate text-base font-semibold text-highlighted">
        {{ title }}
      </h3>
      <span
        v-if="meta || $slots.meta"
        class="shrink-0 text-xs font-medium uppercase tracking-wide text-muted tabular-nums"
      >
        <slot name="meta">{{ meta }}</slot>
      </span>
    </header>
    <slot />
  </UCard>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  meta?: string
}>()
</script>
