import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useNow } from '@vueuse/core'
import { useTimeTrackingStore } from '@/stores/time-tracking.store'
import { formatDuration } from '@/helpers/formatDuration'

export function useTimer() {
  const { active } = storeToRefs(useTimeTrackingStore())
  const now = useNow({ interval: 1000 })

  const elapsedSeconds = computed(() => {
    if (!active.value) return 0
    const startedMs = new Date(active.value.startedAt).getTime()
    return Math.max(0, Math.floor((now.value.getTime() - startedMs) / 1000))
  })

  const elapsedFormatted = computed(() => formatDuration(elapsedSeconds.value))

  return {
    active,
    elapsedSeconds,
    elapsedFormatted,
  }
}
