<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <h3 class="font-semibold">
        {{ t('projects.deleteConfirm') }}
      </h3>
    </template>

    <template #body>
      <p class="text-muted">
        {{ t('projects.deleteMessage', { name: project?.name }) }}
      </p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          :label="t('common.no')"
          color="neutral"
          variant="outline"
          @click="close"
        />
        <UButton
          :label="t('common.yes')"
          color="error"
          class="min-w-12"
          :ui="{base: 'justify-center'}"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Project } from '@/components/features/projects/types'

defineProps<{
  project: Project | null
}>()

const isOpen = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  confirm: []
}>()

const { t } = useI18n()

function close() {
  isOpen.value = false
}

function confirm() {
  emit('confirm')
  close()
}
</script>
