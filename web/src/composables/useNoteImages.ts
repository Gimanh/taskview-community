import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFileDialog } from '@vueuse/core'
import type { Editor } from '@tiptap/core'
import { useFilesStore } from '@/stores/files.store'
import { useFileDownload } from '@/composables/useFileDownload'
import { createFileUrlCache, type FileUrlCache } from '@/helpers/fileUrlCache'
import { pickImageFiles } from '@/helpers/noteImageFiles'

export type UseNoteImagesArgs = {
  goalId: Ref<number | undefined>
  taskId: Ref<number | undefined>
  enabled: Ref<boolean>
  getEditor: () => Editor | null | undefined
}

// Shared by every note editor: a download token stays valid for a few minutes whichever note shows the image.
let urlCache: FileUrlCache | null = null

function useNoteImageUrls(): FileUrlCache {
  const filesStore = useFilesStore()
  const { toAbsolute } = useFileDownload()
  urlCache ??= createFileUrlCache({
    fetchLink: async (fileId) => {
      const link = await filesStore.downloadLink({ fileId, inline: true })
      return link ? { url: toAbsolute(link.url), expiresAt: link.expiresAt } : null
    },
  })
  return urlCache
}

export function useNoteImages(args: UseNoteImagesArgs) {
  const { t } = useI18n()
  const toast = useToast()
  const filesStore = useFilesStore()
  const urls = useNoteImageUrls()

  const insertImages = (fileIds: { id: string; name: string }[], position: number) => {
    const editor = args.getEditor()
    if (!editor || editor.isDestroyed || !editor.isEditable || fileIds.length === 0) return
    const nodes = fileIds.map((file) => ({ type: 'image', attrs: { fileId: file.id, alt: file.name } }))
    editor.chain().insertContentAt(Math.min(position, editor.state.doc.content.size), nodes).run()
  }

  // Every file goes to the task's Files section; only images are embedded in the note.
  const uploadFiles = async (files: File[], position: number) => {
    const goalId = args.goalId.value
    const taskId = args.taskId.value
    if (!args.enabled.value || goalId === undefined || taskId === undefined || files.length === 0) return

    const results = await Promise.all(files.map((file) => filesStore.uploadOne({ goalId, taskId, file })))
    if (results.some((result) => result === null)) {
      toast.add({ title: t('files.errors.uploadFailed'), color: 'error' })
    }
    const images = results.flatMap((result, index) =>
      result && files[index].type.startsWith('image/') ? [{ id: result.id, name: result.name }] : [],
    )
    insertImages(images, position)
  }

  const dialog = useFileDialog({ accept: 'image/*', multiple: true, reset: true })
  dialog.onChange((list) => {
    const images = pickImageFiles(list)
    if (images.length === 0) return
    void uploadFiles(images, args.getEditor()?.state.selection.from ?? 0)
  })

  return {
    resolveUrl: urls.get,
    invalidateUrl: urls.invalidate,
    uploadFiles,
    openImageDialog: dialog.open,
  }
}
