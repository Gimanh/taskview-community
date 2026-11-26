import { ref, watch } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import type { OnboardingObstructionArgs } from '../types'

const POLL_MS = 150
const OWN_POPOVER = '[data-onboarding-popover]'
const FLOATING = '[data-reka-popper-content-wrapper]'

function overlap(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

export function useOnboardingObstruction(args: OnboardingObstructionArgs) {
  const obstructed = ref(false)

  const poll = useIntervalFn(() => {
    const own = document.querySelector<HTMLElement>(OWN_POPOVER)
    if (!own) {
      obstructed.value = false
      return
    }
    const ownRect = own.getBoundingClientRect()
    const target = args.target()
    obstructed.value = Array.from(document.querySelectorAll<HTMLElement>(FLOATING)).some((floating) => {
      if (floating.contains(own) || (target && floating.contains(target))) return false
      const content = floating.firstElementChild
      return !!content && overlap(ownRect, content.getBoundingClientRect())
    })
  }, POLL_MS, { immediate: false })

  watch(args.active, (isActive) => {
    if (isActive) {
      poll.resume()
    } else {
      poll.pause()
      obstructed.value = false
    }
  }, { immediate: true })

  return obstructed
}
