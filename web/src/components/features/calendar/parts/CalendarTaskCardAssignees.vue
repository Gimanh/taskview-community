<template>
  <UAvatarGroup
    size="3xs"
    :max="2"
    class="shrink-0"
    data-testid="calendar-task-assignees"
  >
    <UAvatar
      v-for="email in emails"
      :key="email"
      :alt="email"
      :title="email"
      :text="email.slice(0, 2).toUpperCase()"
    />
  </UAvatarGroup>
</template>

<script setup lang="ts">
defineProps<{
  emails: string[]
}>()
</script>
