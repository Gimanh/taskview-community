import { computed, ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { UseNoteEditorCollapseArgs } from '@/composables/useNoteEditorCollapse.types'

export const NOTE_COLLAPSED_MAX_HEIGHT = 320

export function useNoteEditorCollapse({ contentElement, isFullscreen }: UseNoteEditorCollapseArgs) {
  const { height } = useElementSize(contentElement)
  const isExpanded = ref(false)

  const isOverflowing = computed(() => !isFullscreen.value && height.value > NOTE_COLLAPSED_MAX_HEIGHT)
  const isCollapsed = computed(() => isOverflowing.value && !isExpanded.value)

  function toggleExpanded() {
    isExpanded.value = !isExpanded.value
  }

  return { isOverflowing, isCollapsed, isExpanded, toggleExpanded }
}
