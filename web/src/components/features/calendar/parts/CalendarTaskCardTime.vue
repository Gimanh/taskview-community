<template>
  <span
    class="shrink-0 whitespace-nowrap text-muted tabular-nums"
    :class="{ 'hidden @[11rem]:inline': inline }"
    :title="text.range"
    data-testid="calendar-task-time"
  >
    <!-- The start alone where the whole range has no room -->
    <span :class="inline ? '@[20rem]:hidden' : '@[9rem]:hidden'">{{ text.start }}</span>
    <span :class="inline ? 'hidden @[20rem]:inline' : 'hidden @[9rem]:inline'">{{ text.range }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCalendarTimeText } from '@/composables/useCalendarTimeText'
import type { CalendarTimeRange } from '@/types/calendar.types'

const props = defineProps<{
  timeRange: CalendarTimeRange
  // On the title's line, where the time gives way to the title; otherwise it has a line of its own
  inline?: boolean
}>()

const { timeText } = useCalendarTimeText()
const text = computed(() => timeText(props.timeRange))
</script>
