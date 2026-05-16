<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :ui="{ content: 'max-w-md' }"
  >
    <template #content>
      <UCard>
        <template #header>
          <h3 class="font-semibold">
            {{ t('timeTracking.deleteConfirmTitle') }}
          </h3>
        </template>
        <p class="text-sm text-muted">
          {{ t('timeTracking.deleteConfirm') }}
        </p>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              :label="t('timeTracking.cancel')"
              color="neutral"
              variant="ghost"
              @click="open = false"
            />
            <UButton
              :label="t('timeTracking.delete')"
              icon="i-lucide-trash-2"
              color="error"
              @click="onConfirm"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTaskView } from '@/composables/useTaskView'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  confirm: []
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()

const onConfirm = () => {
  open.value = false
  emit('confirm')
}
</script>
