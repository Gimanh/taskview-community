<template>
  <UButton
    :icon="isSidebarCollapsed ? 'i-lucide-panel-right' : 'i-lucide-panel-left'"
    color="neutral"
    variant="soft"
    class="lg:flex hidden cursor-pointer"
    :style="color ? { color } : undefined"
    :data-project-color="color ?? undefined"
    data-testid="sidebar-collapse-toggle"
    @click="toggleSidebar"
  />
</template>

<script setup lang="ts">
import { useDashboard } from '@/composables/useDashboard'
import { useCurrentProjectColor } from '@/composables/useCurrentProjectColor'

const { isSidebarCollapsed } = useDashboard()
const { color } = useCurrentProjectColor()

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}
</script>
