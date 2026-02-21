<template>
  <UModal
    v-model:open="isOpen"
    :title="t('lists.deleteConfirm')"
    :ui="{ footer: 'justify-end!' }"
  >
    <template #body>
      <p class="text-muted">
        {{ t('lists.deleteMessage', { name: list?.name }) }}
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
          :label="t('contextMenu.delete')"
          color="error"
          @click="confirmDelete"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { List } from '@/components/features/lists/types'

defineProps<{
  list: List | null
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
