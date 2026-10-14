<template>
  <div
    class="grid gap-3 grid-cols-2 @md:grid-cols-3 @xl:grid-cols-4"
    data-testid="files-grid"
  >
    <FileUploadingTile
      v-for="upload in uploads"
      :key="upload.id"
      :upload="upload"
      @retry="emit('retry', upload.id)"
      @cancel="emit('cancel', upload.id)"
    />
    <FileTile
      v-for="file in files"
      :key="file.id"
      :file="file"
      :can-manage="canManage"
      :in-task="inTask"
      @open="emit('open', file)"
      @download="emit('download', file)"
      @open-in-new-tab="emit('openInNewTab', file)"
      @rename="emit('rename', file)"
      @unlink="emit('unlink', file)"
      @delete="emit('delete', file)"
    />
  </div>
</template>

<script setup lang="ts">
import type { TvFile } from 'taskview-api'
import type { FileUploadItem } from '@/types/files.types'
import FileTile from './parts/FileTile.vue'
import FileUploadingTile from './parts/FileUploadingTile.vue'

defineProps<{
  files: TvFile[]
  uploads: FileUploadItem[]
  canManage: boolean
  inTask: boolean
}>()

const emit = defineEmits<{
  open: [file: TvFile]
  download: [file: TvFile]
  openInNewTab: [file: TvFile]
  rename: [file: TvFile]
  unlink: [file: TvFile]
  delete: [file: TvFile]
  retry: [uploadId: string]
  cancel: [uploadId: string]
}>()
</script>
