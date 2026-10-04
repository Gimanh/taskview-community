import { type Ref } from 'vue'
import { useDropZone } from '@vueuse/core'

export type UseFileDropZoneArgs = {
  target: Ref<HTMLElement | null>
  enabled: Ref<boolean>
  onFiles: (files: File[]) => void
}

export function useFileDropZone(args: UseFileDropZoneArgs) {
  const { isOverDropZone } = useDropZone(args.target, {
    onDrop: (files) => {
      if (args.enabled.value && files && files.length > 0) args.onFiles(files)
    },
    preventDefaultForUnhandled: false,
  })
  return { isDragging: isOverDropZone }
}
