import { computed, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventListener, useIntervalFn } from '@vueuse/core'
import { useTour } from '@nuxt/ui/composables'
import { useTaskView } from '@/composables/useTaskView'
import type { OnboardingEnterStepArgs, OnboardingStep, OnboardingTopic, OnboardingTourOptions, OnboardingTourResult } from '../types'
import { findFirstOnboardingTarget, isInViewport, waitForOnboardingTarget } from './useOnboardingTarget'

const TARGET_TIMEOUT_MS = 2500
const WATCH_MS = 300
const DONE_PAUSE_MS = 900
const LOST_TARGET_MS = 1500
const DOCK_MARGIN_DESKTOP = 24
const DOCK_MARGIN_MOBILE = 88

export function useOnboardingTour(options: OnboardingTourOptions) {
  const route = useRoute()
  const router = useRouter()
  const { isMobile } = useTaskView()

  const topic = shallowRef<OnboardingTopic | null>(null)
  const steps = shallowRef<OnboardingStep[]>([])
  const targetEl = shallowRef<HTMLElement | null>(null)
  // Where the control was when the step got done: the control itself may leave the screen right after
  const frozenRect = shallowRef<DOMRect | null>(null)
  const ready = ref(false)
  const stepDone = ref(false)
  const exitPending = ref(false)

  let run = 0
  let doneCheck: (() => boolean) | null = null
  let doneTimer: number | undefined
  // Measured when the step opens and on scroll or resize only: the action the step asks for may itself
  // move the control (a new project unfolds its tools above the field), and "Done!" belongs where the user acted
  let restRect: DOMRect | null = null
  let enteredAt = ''
  let lostSince = 0

  function measureRest() {
    if (targetEl.value?.isConnected && !stepDone.value) restRect = targetEl.value.getBoundingClientRect()
  }

  useEventListener(window, 'scroll', measureRest, { capture: true, passive: true })
  useEventListener(window, 'resize', measureRest, { passive: true })

  const dockAnchor = {
    getBoundingClientRect() {
      const x = window.innerWidth / 2
      const y = window.innerHeight - (isMobile.value ? DOCK_MARGIN_MOBILE : DOCK_MARGIN_DESKTOP)
      return { x, y, top: y, left: x, right: x, bottom: y, width: 0, height: 0, toJSON: () => ({}) }
    },
  }

  const frozenAnchor = {
    getBoundingClientRect: () => frozenRect.value as DOMRect,
  }

  const tour = useTour(
    () => steps.value.map((step) => ({
      ...step,
      target: () => {
        if (step.dockPopover) return dockAnchor
        if (frozenRect.value) return frozenAnchor
        return targetEl.value ?? (isDocked(step) ? dockAnchor : null)
      },
    })),
    { scrollIntoView: false },
  )

  const current = computed<OnboardingStep | null>(() => (tour.open.value ? steps.value[tour.index.value] ?? null : null))
  const anchored = computed(() => !current.value?.dockPopover && (!!targetEl.value || !!frozenRect.value))
  const progress = computed(() => (steps.value.length ? (tour.index.value + 1) / steps.value.length : 0))
  const isLast = computed(() => nextAvailable(tour.index.value + 1) === -1)
  const hasPrev = computed(() => prevAvailable(tour.index.value - 1) !== -1)
  // "Open a screen" steps are done by Next as well, so they do not wait for the user
  const waitsForAction = computed(() => !!current.value?.watchDone && !current.value.navigateTo)
  const closesOnSkip = computed(() => !!current.value?.essential && !stepDone.value)

  function isDocked(step: OnboardingStep): boolean {
    return !!step.target || !!step.docked
  }

  function targetNames(step: OnboardingStep): string[] {
    const target = step.target
    if (!target) return []
    if (typeof target === 'string') return [target]
    if (Array.isArray(target)) return target
    const names = isMobile.value ? target.mobile : target.desktop
    return names ? [names].flat() : []
  }

  function isAvailable(step: OnboardingStep): boolean {
    return step.available ? step.available() : true
  }

  function nextAvailable(from: number): number {
    for (let i = from; i < steps.value.length; i++) {
      if (isAvailable(steps.value[i])) return i
    }
    return -1
  }

  function prevAvailable(from: number): number {
    for (let i = from; i >= 0; i--) {
      if (isAvailable(steps.value[i])) return i
    }
    return -1
  }

  const watcher = useIntervalFn(watchStep, WATCH_MS, { immediate: false })

  function watchStep() {
    const step = current.value
    // While the user is deciding whether to close the tour it must not move them anywhere
    if (!step || !ready.value || exitPending.value) return
    if (!stepDone.value) {
      followTarget(step)
      if (doneCheck?.()) markDone()
    }
  }

  function followTarget(step: OnboardingStep) {
    const names = targetNames(step)
    let onScreen = route.name === enteredAt
    if (names.length) {
      const found = findFirstOnboardingTarget(names)
      if (found !== targetEl.value) {
        targetEl.value = found
        if (found) restRect = found.getBoundingClientRect()
      }
      onScreen ||= !!found
    }
    if (onScreen) {
      lostSince = 0
      return
    }
    // The user went to another screen in the middle of a step: bring the step's own screen back.
    // The screen is compared with the one the step opened on, so a step that cannot restore it does not loop
    lostSince ||= Date.now()
    if (Date.now() - lostSince >= LOST_TARGET_MS) {
      enterStep({ index: tour.index.value, direction: 'forward' })
    }
  }

  function markDone() {
    stepDone.value = true
    frozenRect.value = restRect
    const startedRun = run
    doneTimer = window.setTimeout(() => {
      if (startedRun === run) goNext()
    }, DONE_PAUSE_MS)
  }

  function leaveStep() {
    // The control of the finished step would keep its focus outline next to the highlight of the new one
    const focused = document.activeElement
    if (focused instanceof HTMLElement && targetEl.value?.contains(focused)) focused.blur()
    run++
    window.clearTimeout(doneTimer)
    watcher.pause()
    doneCheck = null
    restRect = null
    lostSince = 0
    ready.value = false
    stepDone.value = false
    frozenRect.value = null
    targetEl.value = null
  }

  async function enterStep(args: OnboardingEnterStepArgs): Promise<void> {
    leaveStep()
    const startedRun = run
    const step = steps.value[args.index]
    tour.goTo(args.index)
    await step.prepare?.()
    if (startedRun !== run) return
    doneCheck = step.watchDone?.() ?? null
    const names = targetNames(step)
    if (names.length) {
      const el = await waitForOnboardingTarget({ names, timeoutMs: TARGET_TIMEOUT_MS, isStale: () => startedRun !== run })
      if (startedRun !== run) return
      if (!el && step.requiresTarget) return passOver(args)
      targetEl.value = el
      if (el && (!isInViewport(el) || el.closest('[role="dialog"]'))) {
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
      }
      restRect = el?.getBoundingClientRect() ?? null
    }
    enteredAt = String(route.name ?? '')
    ready.value = true
    watcher.resume()
  }

  // A step that turned out to have nothing to point at is passed over in the direction the user was going
  async function passOver(args: OnboardingEnterStepArgs): Promise<void> {
    if (args.direction === 'back') {
      const index = prevAvailable(args.index - 1)
      if (index !== -1) return enterStep({ index, direction: 'back' })
    }
    const index = nextAvailable(args.index + 1)
    if (index === -1) return end('completed')
    return enterStep({ index, direction: 'forward' })
  }

  function end(result: OnboardingTourResult) {
    const ended = topic.value
    exitPending.value = false
    leaveStep()
    tour.finish()
    topic.value = null
    steps.value = []
    if (ended) options.onEnd({ topicId: ended.id, result })
  }

  function start(next: OnboardingTopic) {
    topic.value = next
    steps.value = typeof next.steps === 'function' ? next.steps() : next.steps
    const first = nextAvailable(0)
    if (first === -1) return end('completed')
    enterStep({ index: first, direction: 'forward' })
  }

  function goNext() {
    const index = nextAvailable(tour.index.value + 1)
    if (index === -1) return end('completed')
    enterStep({ index, direction: 'forward' })
  }

  async function next() {
    const step = current.value
    if (step?.essential && !stepDone.value) return requestExit()
    const startedRun = run
    const to = step && !stepDone.value ? step.navigateTo?.() : null
    // The steps that follow decide whether they are available by the screen the app is on
    if (to) await router.push(to)
    if (startedRun === run) goNext()
  }

  function prev() {
    const index = prevAvailable(tour.index.value - 1)
    if (index !== -1) enterStep({ index, direction: 'back' })
  }

  function exit() {
    end('exited')
  }

  // Asked inside the tour's own popover: it is the one layer that stays on top of any dialog or drawer of the app
  function requestExit() {
    if (topic.value && options.confirmExit(topic.value.id)) exitPending.value = true
    else exit()
  }

  function cancelExit() {
    exitPending.value = false
  }

  return {
    open: tour.open,
    reference: tour.reference,
    topic,
    current,
    targetEl,
    ready,
    stepDone,
    anchored,
    progress,
    isLast,
    hasPrev,
    waitsForAction,
    closesOnSkip,
    exitPending,
    requestExit,
    cancelExit,
    start,
    next,
    prev,
    exit,
  }
}
