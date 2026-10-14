<template>
  <div class="flex justify-between gap-2 w-full">
    <div class="flex gap-2">
      <UButton
        :label="t('common.delete')"
        color="error"
        variant="soft"
        data-testid="task-detail-delete-button"
        @click="emit('delete')"
      />
      <UButton
        v-if="canMove"
        :label="t('tasks.move.button')"
        icon="i-lucide-folder-input"
        color="neutral"
        variant="soft"
        data-testid="task-detail-move-button"
        @click="emit('move')"
      />
    </div>
    <UButton
      :label="t('common.close')"
      color="neutral"
      variant="soft"
      data-testid="task-detail-close-button"
      @click="emit('close')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  canMove: boolean
}>()

const emit = defineEmits<{
  delete: []
  move: []
  close: []
}>()

const { t } = useI18n()
</script>
