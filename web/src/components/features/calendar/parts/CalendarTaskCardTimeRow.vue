<template>
  <span class="order-first flex min-w-0 basis-full items-center gap-1.5">
    <CalendarTaskCompleteCheckbox
      v-if="canComplete"
      :complete="complete"
      @toggle="emit('toggle', $event)"
    />
    <!-- One line high: when the whole range doesn't fit, its end wraps out of sight and the start stays -->
    <span
      v-if="startText"
      class="flex h-4 min-w-0 flex-wrap overflow-hidden text-xs leading-4 text-muted tabular-nums"
      :title="endText ? `${startText}–${endText}` : startText"
    >
      <span class="whitespace-nowrap">{{ startText }}</span>
      <span
        v-if="endText"
        class="whitespace-nowrap"
      >–{{ endText }}</span>
    </span>
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CalendarTimeRange } from '@/types/calendar.types'
import CalendarTaskCompleteCheckbox from './CalendarTaskCompleteCheckbox.vue'

const props = defineProps<{
  complete: boolean
  canComplete: boolean
  timeRange?: CalendarTimeRange
}>()

const emit = defineEmits<{
  toggle: [complete: boolean]
}>()

const { locale } = useI18n()

const timeFormat = computed(() => new Intl.DateTimeFormat(locale.value, { hour: 'numeric', minute: '2-digit' }))
const startText = computed(() => (props.timeRange ? timeFormat.value.format(props.timeRange.start) : ''))
const endText = computed(() => (props.timeRange?.end ? timeFormat.value.format(props.timeRange.end) : ''))
</script>
