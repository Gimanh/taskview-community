<template>
  <div
    v-if="items.length > 0"
    class="flex flex-col gap-1.5 rounded-xl bg-elevated/50 p-3"
  >
    <div class="flex items-center gap-2 text-sm font-medium">
      <UIcon
        :name="icon"
        class="size-4 text-muted"
      />
      {{ title }}
    </div>
    <ul class="flex flex-col gap-1 pl-6 text-sm text-muted list-disc">
      <li
        v-for="item in items"
        :key="item"
      >
        {{ item }}
      </li>
    </ul>
    <p
      v-if="hint"
      class="pl-6 text-xs text-dimmed"
    >
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  icon: string
  items: string[]
  hint?: string
}>()
</script>
