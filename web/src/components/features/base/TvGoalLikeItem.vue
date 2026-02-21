<template>
  <UPageCard
    v-bind="{ ...props }"
    class="shadow-sm"
    :class="{ 'bg-primary/10 border border-primary/30': active }"
  >
    <div class="flex items-center justify-between">
      <slot />
    </div>
  </UPageCard>
</template>
<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const props = defineProps<{
  to?: RouteLocationRaw
  active?: boolean
}>()
</script>