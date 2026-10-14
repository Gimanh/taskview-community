<template>
  <div class="flex min-w-0 items-center gap-2">
    <UButton
      :label="t('calendar.today')"
      color="neutral"
      variant="soft"
      size="lg"
      data-testid="calendar-today"
      @click="emit('today')"
    />
    <UFieldGroup size="lg">
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="ghost"
        square
        :aria-label="t('calendar.previous')"
        data-testid="calendar-prev"
        @click="emit('prev')"
      />
      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="ghost"
        square
        :aria-label="t('calendar.next')"
        data-testid="calendar-next"
        @click="emit('next')"
      />
    </UFieldGroup>

    <h2
      class="min-w-0 truncate text-base font-semibold first-letter:uppercase sm:min-w-40"
      data-testid="calendar-title"
    >
      {{ title }}
    </h2>

    <UFieldGroup
      size="lg"
      class="ml-auto shrink-0"
    >
      <UButton
        v-for="item in viewItems"
        :key="item.value"
        :icon="compact ? item.icon : undefined"
        :label="compact ? undefined : item.label"
        :aria-label="item.label"
        :aria-pressed="view === item.value"
        :color="view === item.value ? 'primary' : 'neutral'"
        :variant="view === item.value ? 'soft' : 'ghost'"
        :square="compact"
        :data-testid="`calendar-view-${item.value}`"
        @click="view = item.value"
      />
    </UFieldGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CalendarView } from '@/composables/useCalendarRouteState'

defineProps<{
  title: string
  // Icon-only view switcher for narrow screens
  compact?: boolean
}>()

const emit = defineEmits<{
  today: []
  prev: []
  next: []
}>()

const view = defineModel<CalendarView>('view', { required: true })

const { t } = useI18n()

const viewItems = computed(() => [
  { value: 'month' as const, label: t('calendar.views.month'), icon: 'i-lucide-calendar' },
  { value: 'week' as const, label: t('calendar.views.week'), icon: 'i-lucide-columns-3' },
  { value: 'list' as const, label: t('calendar.views.list'), icon: 'i-lucide-list' },
])
</script>
