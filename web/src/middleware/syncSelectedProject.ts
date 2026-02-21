import type { NavigationGuardWithThis } from 'vue-router'
import { useGoalsStore } from '@/stores/goals.store'

const syncSelectedProject: NavigationGuardWithThis<undefined> = (to) => {
  const projectId = to.params.projectId
  if (projectId) {
    const goalsStore = useGoalsStore()
    goalsStore.selectedItemId = +projectId
  }
}

export default syncSelectedProject
