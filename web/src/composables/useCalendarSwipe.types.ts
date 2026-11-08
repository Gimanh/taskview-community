import type { Ref } from 'vue'

export type UseCalendarSwipeArgs = {
  target: Ref<HTMLElement | null>
  // Off on desktops and while a task is being dragged
  enabled: () => boolean
  onNext: () => void
  onPrev: () => void
}
