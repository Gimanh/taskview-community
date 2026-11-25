import type { OnboardingArea, OnboardingWaitForTargetArgs } from '../types'

const POLL_MS = 120
const OWN_POPOVER = '[data-onboarding-popover]'
const OVERLAY_DEPTH = 3

export function onboardingVisibleArea(el: HTMLElement): OnboardingArea {
  const area = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
  for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(parent)
    if (overflowX === 'visible' && overflowY === 'visible') continue
    const rect = parent.getBoundingClientRect()
    area.left = Math.max(area.left, rect.left)
    area.top = Math.max(area.top, rect.top)
    area.right = Math.min(area.right, rect.right)
    area.bottom = Math.min(area.bottom, rect.bottom)
  }
  return area
}

function isShown(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return false
  const style = getComputedStyle(el)
  return style.visibility !== 'hidden' && style.display !== 'none'
}

// The same control may be rendered twice (the page and the mobile drawer above it):
// the one the user can actually reach is the one on top at its own centre
function isOnTop(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  // Scrolled out of sight, in the page or inside a dialog: nothing can be told at that point, and the step scrolls it in
  const visible = onboardingVisibleArea(el)
  if (x < visible.left || y < visible.top || x > visible.right || y > visible.bottom) return true
  // The tour's own popover may lie over the control it is about to point at
  const top = document.elementsFromPoint(x, y).find((item) => !item.closest(OWN_POPOVER) && !item.querySelector(OWN_POPOVER))
  if (!top || el.contains(top) || top.contains(el)) return true
  // A card that is one big link lays that link over its own content: the control is still the one on top
  let shared = top.parentElement
  for (let level = 0; level < OVERLAY_DEPTH && shared && shared !== document.body; level++) {
    if (shared.contains(el)) return true
    shared = shared.parentElement
  }
  return false
}

function targetSelector(name: string): string {
  return `[data-tour="${name}"], .tv-tour-${name}`
}

/** In the page at all, whether or not it can be seen right now */
export function isOnboardingTargetMounted(name: string): boolean {
  return document.querySelector(targetSelector(name)) !== null
}

export function findOnboardingTarget(name: string): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(targetSelector(name)))
    // A tab only lets its label be marked, while the control is the whole tab
    .map((el) => el.closest<HTMLElement>('[role="tab"]') ?? el)
    .filter(isShown)
  return candidates.find(isOnTop) ?? null
}

export function findFirstOnboardingTarget(names: string[]): HTMLElement | null {
  for (const name of names) {
    const el = findOnboardingTarget(name)
    if (el) return el
  }
  return null
}

export function isInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  const visible = onboardingVisibleArea(el)
  return rect.top >= visible.top && rect.left >= visible.left && rect.bottom <= visible.bottom && rect.right <= visible.right
}

export function isOnboardingTargetPresent(name: string): boolean {
  return findOnboardingTarget(name) !== null
}

export function waitForOnboardingTarget(args: OnboardingWaitForTargetArgs): Promise<HTMLElement | null> {
  const { names, timeoutMs, isStale } = args
  const startedAt = Date.now()
  return new Promise((resolve) => {
    const check = () => {
      if (isStale()) return resolve(null)
      const el = findFirstOnboardingTarget(names)
      if (el) return resolve(el)
      if (Date.now() - startedAt >= timeoutMs) return resolve(null)
      window.setTimeout(check, POLL_MS)
    }
    check()
  })
}
