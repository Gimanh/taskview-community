<template>
  <UApp>
    <RouterView />
  </UApp>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useThemeColorsSync } from '@/composables/useThemeColors'

useThemeColorsSync()
</script>
