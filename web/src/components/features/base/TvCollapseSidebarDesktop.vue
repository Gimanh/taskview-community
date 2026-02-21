<template>
  <UButton
    :icon="isSidebarCollapsed ? 'i-lucide-panel-right' : 'i-lucide-panel-left'"
    color="neutral"
    variant="soft"
    class="lg:flex hidden cursor-pointer"
    @click="toggleSidebar"
  />
</template>

<script setup lang="ts">
import { useDashboard } from '@/composables/useDashboard'

const { isSidebarCollapsed } = useDashboard()

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}
</script>