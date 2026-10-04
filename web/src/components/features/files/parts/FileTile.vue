<template>
  <div
    class="group relative flex flex-col rounded-xl bg-elevated/40 hover:bg-elevated transition-colors cursor-pointer overflow-hidden"
    :data-testid="`file-tile-${file.id}`"
    @click="emit('open')"
  >
    <div class="aspect-[4/3] w-full min-h-0 overflow-hidden">
      <FilePreview :file="file" />
    </div>
    <div class="flex flex-col gap-0.5 p-2 min-w-0">
      <UTooltip :text="file.name">
        <p class="text-sm truncate">
          {{ file.name }}
        </p>
      </UTooltip>
      <p class="text-xs text-muted truncate">
        {{ formatBytes(file.sizeBytes) }} · {{ uploaderLabel }} · {{ formattedDate }}
      </p>
    </div>
    <div
      class="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
    >
      <UButton
        icon="i-lucide-download"
        color="neutral"
        variant="solid"
        size="xs"
        :aria-label="t('files.menu.download')"
        data-testid="file-download"
        @click.stop="emit('download')"
      />
      <FileTileMenu
        :file="file"
        :can-manage="canManage"
        :in-task="inTask"
        @download="emit('download')"
        @open-in-new-tab="emit('openInNewTab')"
        @rename="emit('rename')"
        @unlink="emit('unlink')"
        @delete="emit('delete')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@vueuse/core'
import type { TvFile } from 'taskview-api'
import { useFileKind } from '@/composables/useFileKind'
import { useCollaborationStore } from '@/stores/collaboration.store'
import FilePreview from './FilePreview.vue'
import FileTileMenu from './FileTileMenu.vue'

const props = defineProps<{
  file: TvFile
  canManage: boolean
  inTask: boolean
}>()

const emit = defineEmits<{
  open: []
  download: []
  openInNewTab: []
  rename: []
  unlink: []
  delete: []
}>()

const { t } = useI18n()
const { formatBytes } = useFileKind()
const collaborationStore = useCollaborationStore()

const formattedDate = useDateFormat(() => props.file.createdAt, 'DD.MM.YYYY')
const uploaderLabel = computed(() => {
  const known = props.file.uploaderId !== null ? collaborationStore.userMap.get(props.file.uploaderId) : null
  return known?.email ?? props.file.uploaderEmail
})
</script>
