import { useGoalsStore } from '@/stores/goals.store'

export function handleGoalsChanged() {
  const goalsStore = useGoalsStore()
  goalsStore.fetchGoals()
}
