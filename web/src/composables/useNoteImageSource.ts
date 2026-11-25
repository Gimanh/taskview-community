import { computed, onMounted, ref, watch } from 'vue'
import type { TvFile } from 'taskview-api'
import { useFilesStore } from '@/stores/files.store'
import { useFileDownload } from '@/composables/useFileDownload'
import { NoteImageFiles } from '@/editor/NoteImageFiles'
import type { NoteImageSourceArgs, NoteImageState } from '@/editor/NoteImage.types'

const LINK_TRUSTED_MS = 4 * 60 * 1000

export function useNoteImageSource(args: NoteImageSourceArgs) {
  const filesStore = useFilesStore()
  const { urlForId, download } = useFileDownload()

  const state = ref<NoteImageState>('loading')
  const url = ref<string | null>(null)
  let issuedAt = 0
  let retried = false

  const request = async (): Promise<string | null | undefined> => {
    const fileId = args.fileId()
    if (!NoteImageFiles.validId(fileId)) return null
    const fresh = await urlForId({ fileId, inline: true })
    return fileId === args.fileId() ? fresh : undefined
  }

  const resolve = async () => {
    const fresh = await request()
    if (fresh === undefined) return
    url.value = fresh
    issuedAt = Date.now()
    state.value = fresh ? 'ready' : 'unavailable'
  }

  // A link that failed while still valid means the browser cannot show the file; an old one may simply have expired
  const onError = async () => {
    const expired = !retried && Date.now() - issuedAt > LINK_TRUSTED_MS
    retried = true
    const fresh = await request()
    if (fresh === undefined) return
    if (!fresh) {
      state.value = 'unavailable'
      return
    }
    if (!expired) {
      state.value = 'undisplayable'
      return
    }
    url.value = fresh
    issuedAt = Date.now()
  }

  const attached = computed(() => {
    if (args.taskId === null) return false
    return filesStore.filesForTask(args.taskId).some((file) => file.id === args.fileId())
  })

  // Detached from the task is also what a deleted file looks like from here: ask the server which one it is
  watch(attached, (now, before) => {
    if (before && !now) void resolve()
  })

  watch(args.fileId, () => {
    retried = false
    state.value = 'loading'
    void resolve()
  })

  onMounted(resolve)

  const viewed = ref<TvFile[]>([])
  const viewedIndex = ref<number | null>(null)

  const view = async () => {
    const fileId = args.fileId()
    if (!NoteImageFiles.validId(fileId)) return
    const known = args.taskId === null ? undefined : filesStore.filesForTask(args.taskId).find((file) => file.id === fileId)
    const file = known ?? await filesStore.fetchOne(fileId)
    if (!file) return
    viewed.value = [file]
    viewedIndex.value = 0
  }

  const save = () => {
    const fileId = args.fileId()
    if (NoteImageFiles.validId(fileId)) void download({ id: fileId, name: args.name() })
  }

  return { state, url, onError, save, view, viewed, viewedIndex }
}
