<template>
  <div class="min-h-screen flex items-center justify-center bg-muted/30 p-4">
    <UCard class="w-full max-w-md">
      <ResetPassword />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import ResetPassword from '@/components/features/auth/ResetPassword.vue'
</script>
