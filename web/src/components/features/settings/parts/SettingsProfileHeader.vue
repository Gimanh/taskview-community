<template>
  <div class="flex items-center gap-4 rounded-2xl bg-elevated/40 border border-default p-4">
    <UAvatar
      :alt="name"
      icon="i-lucide-user"
      size="xl"
      class="ring-2 ring-primary/40"
    />
    <div class="flex min-w-0 flex-col">
      <span class="truncate text-base font-semibold text-highlighted">
        {{ name }}
      </span>
      <span
        v-if="email && email !== name"
        class="truncate text-sm text-muted"
      >
        {{ email }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  email: string
}>()
</script>
