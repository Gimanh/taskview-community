import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useIntervalFn } from '@vueuse/core'

const POLL_MS = 200
const OTHER_DIALOGS = '[role="dialog"][data-state="open"]:not([data-onboarding-popover])'

export function useOnboardingLayerEpoch(active: MaybeRefOrGetter<boolean>) {
  const epoch = ref(0)

  const poll = useIntervalFn(() => {
    epoch.value = document.querySelectorAll(OTHER_DIALOGS).length
  }, POLL_MS, { immediate: false })

  watch(() => toValue(active), (isActive) => {
    if (isActive) poll.resume()
    else poll.pause()
  }, { immediate: true })

  return epoch
}
