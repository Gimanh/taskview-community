import { useI18n } from 'vue-i18n'
import { useFilesStore } from '@/stores/files.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import type { NoteImageUploadArgs, NoteImageUploader } from '@/editor/NoteImage.types'

export function useNoteImageUpload(args: NoteImageUploadArgs): NoteImageUploader {
  const { t } = useI18n()
  const toast = useToast()
  const filesStore = useFilesStore()
  const { canManageFiles, canViewFiles } = useGoalPermissions()

  const refuse = (key: string) => {
    toast.add({ title: t(key), color: 'error' })
    return false
  }

  return {
    async accept() {
      if (!canManageFiles.value || !canViewFiles.value) return refuse('tasks.noteImageNoPermission')
      await filesStore.fetchStorageStatus()
      if (!filesStore.storageEnabled) return refuse('files.storageDisabled')
      return true
    },

    async upload(file) {
      const outcome = await filesStore.uploadQuietly({ goalId: args.goalId, taskId: args.taskId, file })
      if (outcome.file) return { fileId: outcome.file.id, name: outcome.file.name }
      toast.add({ title: t(outcome.errorKey ?? 'files.errors.uploadFailed'), description: file.name, color: 'error' })
      return null
    },

    attach(files) {
      void filesStore.upload({ goalId: args.goalId, taskId: args.taskId, files })
    },
  }
}
