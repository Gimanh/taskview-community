<template>
  <UModal
    v-model:open="isOpen"
    :title="t('collaboration.roles.deleteConfirm')"
  >
    <template #body>
      <p class="text-muted">
        {{ t('collaboration.roles.deleteMessage', { name: role?.name }) }}
      </p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="outline"
          @click="isOpen = false"
        />
        <UButton
          :label="t('contextMenu.delete')"
          color="error"
          variant="outline"
          @click="handleDelete"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CollaborationRole } from '@/types/collaboration-roles.types'

const props = defineProps<{
  role: CollaborationRole | null
}>()

const emit = defineEmits<{
  confirm: []
}>()

const isOpen = defineModel<boolean>('open', { required: true })

const { t } = useI18n()

function handleDelete() {
  if (props.role) {
    emit('confirm')
    isOpen.value = false
  }
}
</script>
