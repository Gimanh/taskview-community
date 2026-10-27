<template>
  <div
    v-if="canViewFiles"
    ref="root"
    class="relative w-full h-fit rounded-2xl bg-accented/20 p-3.5 @container"
    data-testid="task-files"
  >
    <div class="flex items-center gap-2 mb-2">
      <label class="text-sm text-muted flex-1">
        {{ t('files.title') }}
        <span
          v-if="files.length > 0"
          class="text-dimmed"
        >· {{ files.length }}</span>
      </label>
      <template v-if="canManageFiles">
        <UButton
          icon="i-lucide-folder-search"
          :label="t('files.chooseFromProject')"
          color="neutral"
          variant="ghost"
          size="xs"
          data-testid="files-choose-from-project"
          @click="pickerOpen = true"
        />
        <FilesUploadButton
          v-if="storageEnabled"
          size="xs"
          @click="openDialog"
        />
      </template>
    </div>

    <div
      v-if="isDragging && canUpload"
      class="absolute inset-0 z-10 rounded-2xl border-2 border-dashed border-primary bg-primary/5 flex items-center justify-center pointer-events-none"
    >
      <p class="text-primary font-medium">
        {{ t('files.dropHint') }}
      </p>
    </div>

    <p
      v-if="files.length === 0 && uploads.length === 0"
      class="text-sm text-dimmed"
    >
      {{ emptyText }}
    </p>

    <FilesGrid
      v-else
      :files="files"
      :uploads="uploads"
      :can-manage="canManageFiles"
      :in-task="true"
      @open="actions.open"
      @download="actions.download"
      @open-in-new-tab="actions.openInNewTab"
      @rename="(file) => (actions.renameTarget.value = file)"
      @unlink="actions.unlink"
      @delete="(file) => (actions.deleteTarget.value = file)"
      @retry="retry"
      @cancel="cancel"
    />

    <FilesViewer
      v-model:index="actions.viewerIndex.value"
      :files="files"
    />
    <FileRenameDialog
      v-model:file="actions.renameTarget.value"
      @submit="actions.rename"
    />
    <FileDeleteDialog
      v-model:file="actions.deleteTarget.value"
      :current-task-id="taskId"
      @confirm="actions.deleteForever"
    />
    <FilePickerDialog
      v-model:open="pickerOpen"
      :goal-id="goalId"
      :excluded-ids="files.map((f) => f.id)"
      @select="linkExisting"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFilesStore } from '@/stores/files.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useFileUpload } from '@/composables/useFileUpload'
import { useFileDropZone } from '@/composables/useFileDropZone'
import { useFileActions } from '@/composables/useFileActions'
import FilesGrid from '@/components/features/files/FilesGrid.vue'
import FilesViewer from '@/components/features/files/FilesViewer.vue'
import FilesUploadButton from '@/components/features/files/FilesUploadButton.vue'
import FileRenameDialog from '@/components/features/files/parts/FileRenameDialog.vue'
import FileDeleteDialog from '@/components/features/files/parts/FileDeleteDialog.vue'
import FilePickerDialog from '@/components/features/files/parts/FilePickerDialog.vue'

const props = defineProps<{
  taskId: number
  goalId: number
  dropTarget?: HTMLElement | null
}>()

const { t } = useI18n()
const toast = useToast()
const filesStore = useFilesStore()
const { canViewFiles, canManageFiles } = useGoalPermissions()

const root = ref<HTMLElement | null>(null)
const pickerOpen = ref(false)

const taskId = toRef(props, 'taskId')
const goalId = toRef(props, 'goalId')
const files = computed(() => filesStore.filesForTask(props.taskId))
const dropTarget = computed(() => props.dropTarget ?? root.value)

const storageEnabled = computed(() => filesStore.storageEnabled)
const canUpload = computed(() => canManageFiles.value && storageEnabled.value)
const emptyText = computed(() => {
  if (!storageEnabled.value) return t('files.storageDisabled')
  return canManageFiles.value ? t('files.emptyHint') : t('files.empty')
})

const { uploads, upload, openDialog, retry, cancel } = useFileUpload({ goalId, taskId, enabled: canUpload })
const { isDragging } = useFileDropZone({ target: dropTarget, enabled: canUpload, onFiles: upload })
const actions = useFileActions({ files, taskId })
void filesStore.fetchStorageStatus()
watch(
  () => [props.goalId, canManageFiles.value] as const,
  ([id, allowed]) => {
    if (allowed) void filesStore.fetchQuota(id)
  },
  { immediate: true },
)

watch(
  () => [props.taskId, canViewFiles.value] as const,
  ([id, allowed]) => {
    if (allowed) void filesStore.fetchForTask(id)
  },
  { immediate: true },
)

async function linkExisting(fileIds: string[]) {
  const ok = await filesStore.link({ taskId: props.taskId, fileIds })
  if (!ok) toast.add({ title: t('files.errors.linkFailed'), color: 'error' })
}
</script>
