<template>
  <div class="flex gap-1 p-1 rounded-2xl bg-elevated">
    <UButton
      v-for="opt in items"
      :key="opt.value"
      :label="opt.label"
      color="neutral"
      variant="ghost"
      size="md"
      block
      class="flex-1"
      :ui="{ base: model === opt.value
        ? 'rounded-xl justify-center bg-default text-highlighted font-semibold shadow-sm hover:bg-default'
        : 'rounded-xl justify-center text-muted' }"
      @click="model = opt.value"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends string">
const model = defineModel<T>({ required: true })

defineProps<{
  items: { label: string; value: T }[]
}>()
</script>
