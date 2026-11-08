<template>
  <div class="flex flex-col gap-2">
    <div class="flex min-w-0 items-center gap-1">
      <h2
        class="min-w-0 flex-1 truncate text-lg font-semibold first-letter:uppercase"
        data-testid="calendar-title"
      >
        {{ title }}
      </h2>
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="ghost"
        size="md"
        square
        :aria-label="t('calendar.previous')"
        data-testid="calendar-prev"
        @click="emit('prev')"
      />
      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="ghost"
        size="md"
        square
        :aria-label="t('calendar.next')"
        data-testid="calendar-next"
        @click="emit('next')"
      />
      <UButton
        icon="i-lucide-calendar-check"
        color="neutral"
        variant="ghost"
        size="md"
        square
        :aria-label="t('calendar.today')"
        :title="t('calendar.today')"
        data-testid="calendar-today"
        @click="emit('today')"
      />
      <slot />
    </div>

    <UFieldGroup
      size="md"
      class="w-full"
    >
      <UButton
        v-for="item in viewItems"
        :key="item.value"
        :label="item.label"
        :aria-pressed="view === item.value"
        :color="view === item.value ? 'primary' : 'neutral'"
        :variant="view === item.value ? 'soft' : 'outline'"
        class="flex-1 justify-center"
        :data-testid="`calendar-view-${item.value}`"
        @click="view = item.value"
      />
    </UFieldGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MOBILE_CALENDAR_VIEWS, type CalendarView } from '@/composables/useCalendarRouteState'

defineProps<{
  title: string
}>()

const emit = defineEmits<{
  today: []
  prev: []
  next: []
}>()

const view = defineModel<CalendarView>('view', { required: true })

const { t } = useI18n()

const viewItems = computed(() => MOBILE_CALENDAR_VIEWS.map((value) => ({ value, label: t(`calendar.views.${value}`) })))
</script>
