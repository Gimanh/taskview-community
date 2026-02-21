<template>
  <UModal
    v-model:open="isOpen"
    :title="t('tasks.deleteConfirm')"
    :ui="{ footer: 'justify-end!' }"
  >
    <template #body>
      <p class="text-muted">
        {{ t('tasks.deleteMessage', { name: task?.description }) }}
      </p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="outline"
          @click="isOpen = false"
        />
        <UButton
          :label="t('common.delete')"
          color="error"
          @click="confirmDelete"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Task } from 'taskview-api'

defineProps<{
  task: Task | null
}>()

const emit = defineEmits<{
  confirm: []
}>()

const { t } = useI18n()

const isOpen = defineModel<boolean>('open', { required: true })

function confirmDelete() {
  emit('confirm')
  isOpen.value = false
}
</script>
