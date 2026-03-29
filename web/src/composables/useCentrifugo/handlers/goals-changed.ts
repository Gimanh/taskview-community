import { useGoalsStore } from '@/stores/goals.store'
import type { RealtimeEventMap } from '../types'

export function handleGoalsChanged(_data: RealtimeEventMap['goals.changed']) {
  const goalsStore = useGoalsStore()
  goalsStore.fetchGoals()
}
