<template>
  <section class="flex flex-col gap-2">
    <h2
      v-if="title"
      class="px-3 text-xs font-semibold uppercase tracking-wider text-muted"
    >
      {{ title }}
    </h2>
    <div class="overflow-hidden rounded-2xl bg-elevated/40 border border-default divide-y divide-default">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>
