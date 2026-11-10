import { computed, onBeforeUnmount, ref, type CSSProperties } from 'vue'
import { useEventListener, usePreferredReducedMotion } from '@vueuse/core'
import type { CalendarSwipe, CalendarSwipeDirection, UseCalendarSwipeArgs } from './useCalendarSwipe.types'

// The finger must travel this far before the gesture picks an axis, so a scroll isn't read as a swipe
const AXIS_LOCK_DISTANCE = 10
// Released past this distance, or flicked faster than this, the period turns; otherwise the grid springs back
const COMMIT_DISTANCE = 60
const COMMIT_VELOCITY = 0.4
const LEAVE_MS = 160
const ENTER_MS = 220
const SPRING_BACK_MS = 200
// The new period comes in from a little way off, not from the far edge
const ENTER_FROM = 0.3
// The grid follows the finger with growing resistance and never moves further than this share of the width:
// there is nothing drawn beyond it, the next period appears only once the swipe turns it
const DRAG_LIMIT = 0.3
// A grid dragged to that limit is this much faded
const DRAG_FADE = 0.5

type Phase = 'idle' | 'dragging' | 'leaving' | 'entering' | 'springing'

/** Swiping sideways turns the calendar's period, like in phone calendar apps: the grid follows the finger and slides. */
export function useCalendarSwipe(args: UseCalendarSwipeArgs): CalendarSwipe {
  const reducedMotion = usePreferredReducedMotion()
  const offset = ref(0)
  const opacity = ref(1)
  const phase = ref<Phase>('idle')
  const duration = ref(0)
  const easing = ref('ease-out')

  let start: { x: number; y: number; time: number } | null = null
  let axis: 'x' | 'y' | null = null
  // How far the finger itself has moved: the grid lags behind it, the decision to turn follows the finger
  let fingerDx = 0
  // The period a running slide still has to turn to, once the grid has left
  let pendingTurn: CalendarSwipeDirection | null = null
  const timers = new Set<ReturnType<typeof setTimeout>>()

  function after(ms: number, run: () => void) {
    const timer = setTimeout(() => {
      timers.delete(timer)
      run()
    }, ms)
    timers.add(timer)
  }

  function animate(to: { offset: number; opacity: number; ms: number; easing: string }) {
    duration.value = to.ms
    easing.value = to.easing
    offset.value = to.offset
    opacity.value = to.opacity
  }

  function jump(to: { offset: number; opacity: number }) {
    duration.value = 0
    offset.value = to.offset
    opacity.value = to.opacity
  }

  function width(): number {
    return args.target.value?.clientWidth || window.innerWidth
  }

  function turn(direction: CalendarSwipeDirection) {
    if (direction === 'next') args.onNext()
    else args.onPrev()
  }

  function settle() {
    phase.value = 'idle'
    jump({ offset: 0, opacity: 1 })
  }

  // A new touch or arrow tap doesn't wait for a running slide: it finishes it at once
  function finishNow() {
    timers.forEach(clearTimeout)
    timers.clear()
    if (pendingTurn) turn(pendingTurn)
    pendingTurn = null
    settle()
  }

  function slide(direction: CalendarSwipeDirection) {
    // A released swipe leaves from where the finger let go; anything else still running is finished first
    if (phase.value !== 'dragging') finishNow()
    if (reducedMotion.value === 'reduce') {
      turn(direction)
      settle()
      return
    }
    // "Next" moves the grid to the left, as the finger does
    const sign = direction === 'next' ? -1 : 1
    phase.value = 'leaving'
    pendingTurn = direction
    animate({ offset: sign * width(), opacity: 0, ms: LEAVE_MS, easing: 'ease-in' })
    after(LEAVE_MS, () => {
      pendingTurn = null
      turn(direction)
      phase.value = 'entering'
      jump({ offset: -sign * width() * ENTER_FROM, opacity: 0 })
      // Let the browser paint the start position before transitioning from it
      after(0, () => requestAnimationFrame(() => {
        if (phase.value !== 'entering') return
        // Reading layout makes the browser apply the start position, so the transition runs from it
        void args.target.value?.offsetWidth
        animate({ offset: 0, opacity: 1, ms: ENTER_MS, easing: 'ease-out' })
        after(ENTER_MS, settle)
      }))
    })
  }

  function springBack() {
    phase.value = 'springing'
    animate({ offset: 0, opacity: 1, ms: SPRING_BACK_MS, easing: 'ease-out' })
    after(SPRING_BACK_MS, settle)
  }

  useEventListener(args.target, 'touchstart', (event: TouchEvent) => {
    start = null
    axis = null
    if (event.touches.length !== 1 || !args.enabled()) return
    if (phase.value !== 'idle') finishNow()
    const touch = event.touches[0]
    start = { x: touch.clientX, y: touch.clientY, time: event.timeStamp }
    fingerDx = 0
  }, { passive: true })

  // Not passive: once the gesture is sideways, the page must not scroll or navigate back under it
  useEventListener(args.target, 'touchmove', (event: TouchEvent) => {
    if (!start || event.touches.length !== 1) return
    if (!args.enabled()) {
      start = null
      if (phase.value === 'dragging') springBack()
      return
    }
    const touch = event.touches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (!axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_DISTANCE) return
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (axis !== 'x') return
    if (event.cancelable) event.preventDefault()
    phase.value = 'dragging'
    fingerDx = dx
    const limit = width() * DRAG_LIMIT
    const moved = limit * (1 - Math.exp(-Math.abs(dx) / limit))
    jump({ offset: Math.sign(dx) * moved, opacity: 1 - (moved / limit) * DRAG_FADE })
  }, { passive: false })

  useEventListener(args.target, ['touchend', 'touchcancel'], (event: TouchEvent) => {
    const began = start
    start = null
    if (!began || axis !== 'x' || phase.value !== 'dragging') return
    const dx = fingerDx
    const velocity = Math.abs(dx) / Math.max(1, event.timeStamp - began.time)
    const commit = event.type === 'touchend' && args.enabled() && (Math.abs(dx) >= COMMIT_DISTANCE || (velocity >= COMMIT_VELOCITY && Math.abs(dx) >= AXIS_LOCK_DISTANCE))
    if (commit) slide(dx < 0 ? 'next' : 'prev')
    else springBack()
  }, { passive: true })

  onBeforeUnmount(() => {
    timers.forEach(clearTimeout)
    timers.clear()
  })

  const style = computed<CSSProperties>(() => {
    if (phase.value === 'idle') return {}
    return {
      transform: `translate3d(${offset.value}px, 0, 0)`,
      opacity: opacity.value,
      transition: duration.value ? `transform ${duration.value}ms ${easing.value}, opacity ${duration.value}ms ${easing.value}` : 'none',
      willChange: 'transform, opacity',
    }
  })

  return { style, slide }
}
