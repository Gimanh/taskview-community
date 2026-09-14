import type { Ref } from 'vue'
import type { MaybeComputedElementRef } from '@vueuse/core'

export type UseNoteEditorCollapseArgs = {
  contentElement: MaybeComputedElementRef
  isFullscreen: Ref<boolean>
}
