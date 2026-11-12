<template>
  <!-- FullCalendar opens the task on click and starts a drag on press: the checkbox keeps both to itself -->
  <span
    class="flex shrink-0 items-center"
    data-testid="calendar-task-complete"
    @click.stop
    @pointerdown.stop
    @mousedown.stop
    @touchstart.stop
    @keydown.stop
  >
    <UCheckbox
      :model-value="complete"
      size="sm"
      :aria-label="t(complete ? 'calendar.complete.reopen' : 'calendar.complete.done')"
      :title="t(complete ? 'calendar.complete.reopen' : 'calendar.complete.done')"
      @update:model-value="emit('toggle', $event === true)"
    />
  </span>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  complete: boolean
}>()

const emit = defineEmits<{
  toggle: [complete: boolean]
}>()

const { t } = useI18n()
</script>
