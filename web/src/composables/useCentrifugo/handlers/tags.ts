import { useGoalsStore } from '@/stores/goals.store'
import { useTagsStore } from '@/stores/tag.store'
import type { RealtimeEventMap } from '../types'

const REFETCH_DELAY_MS = 300

let refetchTimer: ReturnType<typeof setTimeout> | null = null

export function handleTagsChanged(data: RealtimeEventMap['tags.changed']) {
  if (!useGoalsStore().goalMap.has(data.goalId)) return
  if (refetchTimer) clearTimeout(refetchTimer)
  refetchTimer = setTimeout(() => {
    refetchTimer = null
    void useTagsStore().fetchAllTags()
  }, REFETCH_DELAY_MS)
}
