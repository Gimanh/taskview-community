<template>
  <span
    class="flex items-center justify-center shrink-0 size-9 rounded-xl"
    :class="tint"
  >
    <UIcon
      :name="icon"
      class="size-5"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SettingsTint } from '../types'

const props = defineProps<{
  icon: string
  color: SettingsTint
}>()

const TILE_TINTS: Record<SettingsTint, string> = {
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
  teal: 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
  zinc: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
}

const tint = computed(() => TILE_TINTS[props.color])
</script>
