import type { CSSProperties, Ref } from 'vue'

export type CalendarSwipeDirection = 'next' | 'prev'

export type UseCalendarSwipeArgs = {
  target: Ref<HTMLElement | null>
  // Off on desktops and while a task is being dragged
  enabled: () => boolean
  onNext: () => void
  onPrev: () => void
}

export type CalendarSwipe = {
  // Bound to what moves with the finger: the grid follows it and slides between periods
  style: Readonly<Ref<CSSProperties>>
  // Turns the period with the same slide as a swipe, for the toolbar's arrows
  slide: (direction: CalendarSwipeDirection) => void
}
