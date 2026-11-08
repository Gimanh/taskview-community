import { useSwipe } from '@vueuse/core'
import type { UseCalendarSwipeArgs } from './useCalendarSwipe.types'

const SWIPE_MIN_DISTANCE = 60

/** Swiping sideways turns the calendar's period, like in phone calendar apps. */
export function useCalendarSwipe(args: UseCalendarSwipeArgs) {
  useSwipe(args.target, {
    threshold: SWIPE_MIN_DISTANCE,
    onSwipeEnd(_event, direction) {
      if (!args.enabled()) return
      if (direction === 'left') args.onNext()
      else if (direction === 'right') args.onPrev()
    },
  })
}
