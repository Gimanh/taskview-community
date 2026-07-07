<template>
  <ULink
    :to="item.to"
    :href="item.href"
    :target="isExternal ? '_blank' : undefined"
    :rel="isExternal ? 'noopener noreferrer' : undefined"
    class="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-elevated focus-visible:bg-elevated focus:outline-none"
  >
    <SettingsIconTile
      :icon="item.icon"
      :color="item.color"
    />
    <span class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">
      {{ item.title }}
    </span>
    <UIcon
      :name="isExternal ? 'i-lucide-arrow-up-right' : 'i-lucide-chevron-right'"
      class="size-4 shrink-0 text-dimmed"
    />
  </ULink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SettingsNavRowItem } from '../types'
import SettingsIconTile from './SettingsIconTile.vue'

const props = defineProps<{
  item: SettingsNavRowItem
}>()

const isExternal = computed(() => !!props.item.href)
</script>
