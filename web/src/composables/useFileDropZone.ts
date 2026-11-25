import { type Ref } from 'vue'
import { useDropZone } from '@vueuse/core'
import { NoteImageDrops } from '@/editor/NoteImageDrops'

export type UseFileDropZoneArgs = {
  target: Ref<HTMLElement | null>
  enabled: Ref<boolean>
  onFiles: (files: File[]) => void
}

export function useFileDropZone(args: UseFileDropZoneArgs) {
  const { isOverDropZone } = useDropZone(args.target, {
    onDrop: (files, event) => {
      // The note editor inside the zone has already taken this drop and uploads the files itself
      if (NoteImageDrops.taken(event)) return
      if (args.enabled.value && files && files.length > 0) args.onFiles(files)
    },
    preventDefaultForUnhandled: false,
  })
  return { isDragging: isOverDropZone }
}
