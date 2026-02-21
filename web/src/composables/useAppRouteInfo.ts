import { computed } from 'vue'
import { useRoute } from 'vue-router'

export const useAppRouteInfo = () => {
  const route = useRoute()
  const isUserRoute = computed(() => route.name === 'user')
  const isAccountRoute = computed(() => route.name === 'account')
  const projectId = computed(() => Number(route.params.projectId) || -1)
  const hasProject = computed(() => projectId.value > 0)
  const listId = computed(() => Number(route.params.listId) || -1)
  const hasList = computed(() => !!route.params.listId)
  const taskId = computed(() => Number(route.params.taskId) || -1)

  return {
    isUserRoute,
    isAccountRoute,
    hasProject,
    projectId,
    listId,
    hasList,
    taskId,
  }
}