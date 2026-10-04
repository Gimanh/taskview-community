<template>
  <div
    class="relative flex flex-col rounded-xl overflow-hidden border border-dashed"
    :class="upload.status === 'error' ? 'border-error/60 bg-error/5' : 'border-accented bg-elevated/40'"
    data-testid="file-uploading-tile"
  >
    <div class="aspect-[4/3] w-full flex flex-col items-center justify-center gap-2 px-3">
      <template v-if="upload.status === 'uploading'">
        <UIcon
          name="i-lucide-upload"
          class="size-6 text-muted"
        />
        <UProgress
          :model-value="upload.progress"
          size="sm"
          class="w-full"
        />
      </template>
      <template v-else>
        <UIcon
          name="i-lucide-alert-circle"
          class="size-6 text-error"
        />
        <p class="text-xs text-error text-center">
          {{ t(upload.errorKey ?? 'files.errors.uploadFailed') }}
        </p>
        <div class="flex gap-1">
          <UButton
            :label="t('files.retry')"
            size="xs"
            color="neutral"
            variant="soft"
            @click="emit('retry')"
          />
          <UButton
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            :aria-label="t('files.cancel')"
            @click="emit('cancel')"
          />
        </div>
      </template>
    </div>
    <div class="flex flex-col gap-0.5 p-2 min-w-0">
      <p class="text-sm truncate">
        {{ upload.name }}
      </p>
      <p class="text-xs text-muted">
        {{ formatBytes(upload.sizeBytes) }}
      </p>
    </div>
    <UButton
      v-if="upload.status === 'uploading'"
      icon="i-lucide-x"
      color="neutral"
      variant="ghost"
      size="xs"
      class="absolute top-1.5 right-1.5"
      :aria-label="t('files.cancel')"
      @click="emit('cancel')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { FileUploadItem } from '@/types/files.types'
import { useFileKind } from '@/composables/useFileKind'

defineProps<{
  upload: FileUploadItem
}>()

const emit = defineEmits<{
  retry: []
  cancel: []
}>()

const { t } = useI18n()
const { formatBytes } = useFileKind()
</script>
