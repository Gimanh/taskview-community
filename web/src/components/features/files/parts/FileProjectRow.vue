<template>
  <div
    class="flex items-center gap-3 rounded-2xl p-3 bg-accented/20 hover:bg-elevated transition-colors cursor-pointer"
    :data-testid="`file-row-${file.id}`"
    @click="emit('open')"
  >
    <div class="size-12 shrink-0 rounded-xl overflow-hidden">
      <FilePreview :file="file" />
    </div>
    <div class="flex-1 min-w-0 flex flex-col gap-1">
      <p class="text-sm truncate">
        {{ file.name }}
      </p>
      <div class="flex flex-wrap gap-1">
        <ULink
          v-for="taskId in file.linkedTaskIds"
          :key="taskId"
          :to="{ name: 'user', params: { projectId: file.goalId, listId: ALL_TASKS_LIST_ID, taskId } }"
          raw
          :data-testid="`file-task-link-${taskId}`"
          @click.stop
        >
          <UBadge
            :label="`#${taskId}`"
            icon="i-lucide-list-checks"
            color="neutral"
            variant="subtle"
            size="sm"
            class="hover:bg-accented transition-colors"
          />
        </ULink>
        <UBadge
          v-if="file.linkedTaskIds.length === 0"
          :label="t('files.project.unlinked')"
          color="neutral"
          variant="soft"
          size="sm"
        />
      </div>
      <p class="text-xs text-muted truncate">
        {{ formatBytes(file.sizeBytes) }} · {{ file.uploaderEmail }} · {{ formattedDate }}
      </p>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <UButton
        v-if="canManage"
        icon="i-lucide-link"
        color="neutral"
        variant="soft"
        size="lg"
        :ui="{ base: 'rounded-xl' }"
        :aria-label="t('files.linkToTask.title')"
        data-testid="file-link-task"
        @click.stop="emit('linkToTask')"
      />
      <UButton
        icon="i-lucide-download"
        color="neutral"
        variant="soft"
        size="lg"
        :ui="{ base: 'rounded-xl' }"
        :aria-label="t('files.menu.download')"
        @click.stop="emit('download')"
      />
      <FileTileMenu
        :file="file"
        :can-manage="canManage"
        :in-task="false"
        variant="soft"
        size="lg"
        @download="emit('download')"
        @open-in-new-tab="emit('openInNewTab')"
        @rename="emit('rename')"
        @delete="emit('delete')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@vueuse/core'
import { ALL_TASKS_LIST_ID, type TvFile } from 'taskview-api'
import { useFileKind } from '@/composables/useFileKind'
import FilePreview from './FilePreview.vue'
import FileTileMenu from './FileTileMenu.vue'

const props = defineProps<{
  file: TvFile
  canManage: boolean
}>()

const emit = defineEmits<{
  open: []
  linkToTask: []
  download: []
  openInNewTab: []
  rename: []
  delete: []
}>()

const { t } = useI18n()
const { formatBytes } = useFileKind()
const formattedDate = useDateFormat(() => props.file.createdAt, 'DD.MM.YYYY')
</script>
