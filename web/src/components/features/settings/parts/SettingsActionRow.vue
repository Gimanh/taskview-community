<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors hover:bg-elevated focus-visible:bg-elevated focus:outline-none cursor-pointer"
    :data-testid="`settings-row-${item.key}`"
    @click="item.onSelect"
  >
    <SettingsIconTile
      :icon="item.icon"
      :color="item.color"
    />
    <span class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">
      {{ item.title }}
    </span>
    <span
      v-if="item.kbds?.length"
      class="flex shrink-0 items-center gap-1"
    >
      <UKbd
        v-for="kbd in item.kbds"
        :key="kbd"
        :value="kbd"
      />
    </span>
    <UIcon
      v-else
      name="i-lucide-chevron-right"
      class="size-4 shrink-0 text-dimmed"
    />
  </button>
</template>

<script setup lang="ts">
import type { SettingsActionRowItem } from '../types'
import SettingsIconTile from './SettingsIconTile.vue'

defineProps<{
  item: SettingsActionRowItem
}>()
</script>
