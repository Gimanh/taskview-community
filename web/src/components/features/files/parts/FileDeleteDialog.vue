<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="t('files.delete.title')"
    :ui="{ content: 'max-w-md' }"
  >
    <template #body>
      <p class="text-sm text-muted">
        {{ t('files.delete.confirm', { name: file?.name ?? '' }) }}
      </p>
      <p
        v-if="otherTasksCount > 0"
        class="text-sm text-warning mt-2"
      >
        {{ t('files.delete.linkedElsewhere', { count: otherTasksCount }, otherTasksCount) }}
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          :label="t('files.cancel')"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          :label="t('files.delete.submit')"
          icon="i-lucide-trash-2"
          color="error"
          data-testid="file-delete-confirm"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TvFile } from 'taskview-api'
import { useTaskView } from '@/composables/useTaskView'

const props = defineProps<{
  currentTaskId: number | null
}>()

const file = defineModel<TvFile | null>('file', { default: null })

const emit = defineEmits<{
  confirm: []
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()

const open = computed({
  get: () => file.value !== null,
  set: (value: boolean) => {
    if (!value) file.value = null
  },
})

const otherTasksCount = computed(() =>
  (file.value?.linkedTaskIds ?? []).filter((id) => id !== props.currentTaskId).length,
)
</script>
