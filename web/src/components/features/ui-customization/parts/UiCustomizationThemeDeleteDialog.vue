<template>
  <UModal
    v-model:open="isOpen"
    :title="t('uiCustomization.theme.custom.deleteTitle', { name })"
    :description="t('uiCustomization.theme.custom.deleteHint')"
    :fullscreen="isFullscreenModal"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="soft"
          @click="isOpen = false"
        />
        <UButton
          :label="t('uiCustomization.theme.custom.delete')"
          color="error"
          variant="soft"
          data-testid="theme-custom-delete-confirm"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTaskView } from '@/composables/useTaskView'

defineProps<{
  name: string
}>()

const isOpen = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{ confirm: [] }>()

const { t } = useI18n()
const { isFullscreenModal } = useTaskView()

function confirm() {
  emit('confirm')
  isOpen.value = false
}
</script>
