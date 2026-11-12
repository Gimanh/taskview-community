<template>
  <UIcon
    :name="inbox ? 'i-lucide-inbox' : 'i-lucide-folder'"
    class="size-4 shrink-0 self-center"
    :class="{ 'text-muted': !color }"
    :style="color ? { color } : undefined"
  />
</template>

<script setup lang="ts">
defineProps<{
  color?: string | null
  inbox?: boolean
}>()
</script>
