<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="t('automations.delete.title')"
    :ui="{ content: 'max-w-md' }"
  >
    <template #body>
      <p class="text-sm text-muted">
        {{ t('automations.delete.confirm', { name: rule?.name ?? '' }) }}
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          :label="t('common.delete')"
          icon="i-lucide-trash-2"
          color="error"
          data-testid="automation-delete-confirm"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AutomationRule } from 'taskview-api'
import { useTaskView } from '@/composables/useTaskView'

const rule = defineModel<AutomationRule | null>('rule', { default: null })

const emit = defineEmits<{
  confirm: []
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()

const open = computed({
  get: () => rule.value !== null,
  set: (value: boolean) => {
    if (!value) rule.value = null
  },
})
</script>
