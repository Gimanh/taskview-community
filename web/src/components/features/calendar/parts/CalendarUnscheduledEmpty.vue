<template>
  <div
    class="pointer-events-none flex flex-col items-center gap-1.5 text-center"
    data-testid="calendar-unscheduled-empty"
  >
    <UIcon
      :name="searching ? 'i-lucide-search-x' : 'i-lucide-calendar-check-2'"
      class="size-6 text-muted"
    />
    <p class="text-sm font-medium text-highlighted">
      {{ t(searching ? 'calendar.unscheduled.notFound' : 'calendar.unscheduled.emptyTitle') }}
    </p>
    <p
      v-if="!searching"
      class="text-xs text-muted"
    >
      {{ t('calendar.unscheduled.emptyDescription') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  // There are tasks, but the search or the filters hide them all
  searching?: boolean
}>()

const { t } = useI18n()
</script>
