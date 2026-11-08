import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useGoalsStore } from '@/stores/goals.store'
import { useInbox } from '@/composables/useInbox'
import { projectColor } from '@/helpers/color'

export function useCurrentProjectColor() {
  const route = useRoute()
  const goalsStore = useGoalsStore()
  const { isOwnInbox } = useInbox()

  const color = computed(() => {
    const project = goalsStore.goalMap.get(Number(route.params.projectId))
    return project && !isOwnInbox(project) ? projectColor(project) : null
  })

  const navbarToggle = computed(() => (color.value ? { class: 'text-(--project-color)' } : true))

  const navbarAttrs = computed(() => (color.value
    ? { style: { '--project-color': color.value }, 'data-project-color': color.value }
    : {}))

  return { color, navbarToggle, navbarAttrs }
}
