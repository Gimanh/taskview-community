<template>
  <div class="flex items-center justify-end gap-1 border-t border-default p-2">
    <UButton
      :label="expanded ? t('tasks.noteCollapse') : t('tasks.noteExpand')"
      :icon="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
      color="neutral"
      variant="soft"
      size="sm"
      data-testid="task-note-toggle-expand"
      @click="emit('toggleExpand')"
    />
    <UButton
      :label="t('tasks.noteFullscreen')"
      icon="i-lucide-maximize-2"
      color="neutral"
      variant="soft"
      size="sm"
      data-testid="task-note-open-fullscreen"
      @click="emit('fullscreen')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  expanded: boolean
}>()

const emit = defineEmits<{
  toggleExpand: []
  fullscreen: []
}>()
</script>
