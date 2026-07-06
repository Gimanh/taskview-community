<template>
  <div class="flex items-center gap-3 px-3 py-2.5">
    <SettingsIconTile
      :icon="item.icon"
      :color="item.color"
    />
    <span class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">
      {{ item.title }}
    </span>
    <USelect
      :model-value="item.get()"
      :items="item.options"
      variant="soft"
      color="neutral"
      class="w-40 max-w-[45%]"
      :ui="{ base: 'rounded-lg' }"
      @update:model-value="item.set($event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { SettingsSelectRowItem } from '../types'
import SettingsIconTile from './SettingsIconTile.vue'

defineProps<{
  item: SettingsSelectRowItem
}>()
</script>
