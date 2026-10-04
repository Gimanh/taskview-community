<template>
  <div
    ref="root"
    class="relative flex flex-col gap-4 @container"
    data-testid="files-project-tab"
  >
    <div
      class="sticky top-0 z-10 flex flex-col @md:flex-row gap-2 @md:items-center bg-default p-2"
    >
      <UInput
        v-model="search"
        :placeholder="t('files.searchPlaceholder')"
        icon="i-lucide-search"
        variant="soft"
        size="xl"
        class="flex-1"
        data-testid="files-search"
      />
      <UTabs
        v-model="type"
        :items="typeItems"
        :content="false"
        :ui="{ list: 'rounded-xl', trigger: 'rounded-lg', indicator: 'rounded-lg' }"
      />
      <FilesUploadButton
        v-if="canUpload"
        :label="t('files.upload')"
        size="xl"
        @click="openDialog"
      />
    </div>

    <div
      v-if="isDragging && canUpload"
      class="absolute inset-2 z-20 rounded-2xl border-2 border-dashed border-primary bg-primary/5 flex items-center justify-center pointer-events-none"
    >
      <p class="text-primary font-medium">
        {{ t('files.dropHint') }}
      </p>
    </div>

    <div class="flex flex-col gap-4 px-2">
      <FilesQuotaUsage
        v-if="storageEnabled"
        :goal-id="goalId"
      />
      <UAlert
        v-if="!storageEnabled"
        color="warning"
        variant="soft"
        icon="i-lucide-hard-drive"
        :title="t('files.storageDisabled')"
        :description="t('files.storageDisabledHint')"
        data-testid="files-storage-disabled"
      />
      <div
        v-if="uploads.length > 0"
        class="grid gap-3 grid-cols-2 @md:grid-cols-4"
      >
        <FileUploadingTile
          v-for="item in uploads"
          :key="item.id"
          :upload="item"
          @retry="retry(item.id)"
          @cancel="cancel(item.id)"
        />
      </div>

      <div
        v-if="!project.loading && project.items.length === 0"
        class="flex flex-col items-center gap-2 py-16 text-center text-muted"
      >
        <UIcon
          name="i-lucide-folder-open"
          class="size-8 text-dimmed"
        />
        <p>{{ search ? t('files.project.nothingFound') : t('files.project.empty') }}</p>
      </div>

      <div
        v-else
        class="flex flex-col gap-2"
      >
        <FileProjectRow
          v-for="file in project.items"
          :key="file.id"
          :file="file"
          :can-manage="canManage"
          @open="actions.open(file)"
          @link-to-task="linkTarget = file"
          @download="actions.download(file)"
          @open-in-new-tab="actions.openInNewTab(file)"
          @rename="actions.renameTarget.value = file"
          @delete="actions.deleteTarget.value = file"
        />
        <div
          v-if="project.nextCursor || project.loading"
          class="flex justify-center py-3"
        >
          <UButton
            :label="t('files.loadMore')"
            color="neutral"
            variant="ghost"
            :loading="project.loading"
            @click="filesStore.loadMoreForGoal()"
          />
        </div>
      </div>
    </div>

    <FilesViewer
      v-model:index="actions.viewerIndex.value"
      :files="project.items"
    />
    <FileRenameDialog
      v-model:file="actions.renameTarget.value"
      @submit="actions.rename"
    />
    <FileDeleteDialog
      v-model:file="actions.deleteTarget.value"
      :current-task-id="null"
      @confirm="actions.deleteForever"
    />
    <FileTaskPickerDialog
      v-model:file="linkTarget"
      :goal-id="goalId"
      @select="linkToTask"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useDebounceFn } from '@vueuse/core'
import type { TvFile, TvFileKindFilter } from 'taskview-api'
import { useFilesStore } from '@/stores/files.store'
import { useFileUpload } from '@/composables/useFileUpload'
import { useFileDropZone } from '@/composables/useFileDropZone'
import { useFileActions } from '@/composables/useFileActions'
import FilesUploadButton from './FilesUploadButton.vue'
import FilesViewer from './FilesViewer.vue'
import FileUploadingTile from './parts/FileUploadingTile.vue'
import FileProjectRow from './parts/FileProjectRow.vue'
import FileRenameDialog from './parts/FileRenameDialog.vue'
import FileDeleteDialog from './parts/FileDeleteDialog.vue'
import FileTaskPickerDialog from './parts/FileTaskPickerDialog.vue'
import FilesQuotaUsage from './parts/FilesQuotaUsage.vue'

const props = defineProps<{
  goalId: number
  canManage: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const filesStore = useFilesStore()
const { project } = storeToRefs(filesStore)

const root = ref<HTMLElement | null>(null)
const search = ref('')
const type = ref<TvFileKindFilter>('all')
const linkTarget = ref<TvFile | null>(null)

const typeItems = computed(() => [
  { value: 'all', label: t('files.filters.all') },
  { value: 'image', label: t('files.filters.images') },
  { value: 'document', label: t('files.filters.documents') },
])

const goalId = toRef(props, 'goalId')
const storageEnabled = computed(() => filesStore.storageEnabled)
const canUpload = computed(() => props.canManage && storageEnabled.value)
const noTask = ref<number | null>(null)
const { uploads, upload, openDialog, retry, cancel } = useFileUpload({ goalId, taskId: noTask, enabled: canUpload })
const { isDragging } = useFileDropZone({ target: root, enabled: canUpload, onFiles: upload })
void filesStore.fetchStorageStatus()

const files = computed(() => project.value.items)
const actions = useFileActions({ files, taskId: noTask })

const reload = () => filesStore.fetchForGoal({ goalId: props.goalId, search: search.value, type: type.value })
const debouncedReload = useDebounceFn(reload, 300)

watch(
  () => props.goalId,
  (id) => {
    void reload()
    void filesStore.fetchQuota(id)
  },
  { immediate: true },
)
watch(search, () => void debouncedReload())
watch(type, () => void reload())

async function linkToTask(args: { file: TvFile, taskId: number }) {
  const ok = await filesStore.link({ taskId: args.taskId, fileIds: [args.file.id] })
  if (!ok) {
    toast.add({ title: t('files.errors.linkFailed'), color: 'error' })
    return
  }
  const current = project.value.items.find((f) => f.id === args.file.id)
  if (current && !current.linkedTaskIds.includes(args.taskId)) current.linkedTaskIds = [...current.linkedTaskIds, args.taskId]
}
</script>
