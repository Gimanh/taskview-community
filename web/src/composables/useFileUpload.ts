import { computed, onBeforeUnmount, onMounted, type Ref } from 'vue'
import { useFileDialog } from '@vueuse/core'
import { useFilesStore } from '@/stores/files.store'

export type UseFileUploadArgs = {
  goalId: Ref<number>
  taskId: Ref<number | null>
  enabled: Ref<boolean>
  pasteTarget?: Ref<HTMLElement | null>
}

export function useFileUpload(args: UseFileUploadArgs) {
  const filesStore = useFilesStore()
  const uploads = computed(() => filesStore.uploadsFor(args.goalId.value, args.taskId.value))

  const upload = (files: File[]) => {
    if (!args.enabled.value || files.length === 0) return
    void filesStore.upload({ goalId: args.goalId.value, taskId: args.taskId.value, files })
  }

  const dialog = useFileDialog({ multiple: true, reset: true })
  dialog.onChange((list) => {
    if (list) upload(Array.from(list))
  })

  const onPaste = (event: ClipboardEvent) => {
    if (!args.enabled.value) return
    const target = event.target as HTMLElement | null
    if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName))) return
    const files = Array.from(event.clipboardData?.files ?? [])
    if (files.length === 0) return
    event.preventDefault()
    upload(files)
  }

  onMounted(() => {
    const element = args.pasteTarget?.value ?? document
    element.addEventListener('paste', onPaste as EventListener)
  })
  onBeforeUnmount(() => {
    const element = args.pasteTarget?.value ?? document
    element.removeEventListener('paste', onPaste as EventListener)
  })

  return {
    uploads,
    upload,
    openDialog: dialog.open,
    retry: (id: string) => filesStore.retryUpload(id),
    cancel: (id: string) => filesStore.cancelUpload(id),
  }
}
