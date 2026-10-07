import { ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TvFile } from 'taskview-api'
import { useFilesStore } from '@/stores/files.store'
import { useFileDownload } from '@/composables/useFileDownload'

export type UseFileActionsArgs = {
  files: Ref<TvFile[]>
  taskId: Ref<number | null>
}

export function useFileActions(args: UseFileActionsArgs) {
  const { t } = useI18n()
  const toast = useToast()
  const filesStore = useFilesStore()
  const { download, openInNewTab } = useFileDownload()

  const viewerIndex = ref<number | null>(null)
  const renameTarget = ref<TvFile | null>(null)
  const deleteTarget = ref<TvFile | null>(null)

  const open = (file: TvFile) => {
    const index = args.files.value.findIndex((f) => f.id === file.id)
    viewerIndex.value = index === -1 ? null : index
  }

  const rename = async (name: string) => {
    if (!renameTarget.value) return
    const result = await filesStore.rename({ fileId: renameTarget.value.id, name })
    renameTarget.value = null
    if (!result) toast.add({ title: t('files.errors.renameFailed'), color: 'error' })
  }

  const unlink = async (file: TvFile) => {
    if (args.taskId.value === null) return
    const ok = await filesStore.unlink({ taskId: args.taskId.value, fileId: file.id })
    if (!ok) toast.add({ title: t('files.errors.unlinkFailed'), color: 'error' })
  }

  const deleteForever = async () => {
    if (!deleteTarget.value) return
    const ok = await filesStore.deleteForever(deleteTarget.value.id)
    deleteTarget.value = null
    if (!ok) toast.add({ title: t('files.errors.deleteFailed'), color: 'error' })
  }

  return {
    viewerIndex,
    renameTarget,
    deleteTarget,
    open,
    download,
    openInNewTab,
    rename,
    unlink,
    deleteForever,
  }
}
