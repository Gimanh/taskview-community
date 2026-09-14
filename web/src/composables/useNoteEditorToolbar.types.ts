import type { Ref } from 'vue'

export type UseNoteEditorToolbarArgs = {
  isFullscreen: Ref<boolean>
  onToggleFullscreen: () => void
}
