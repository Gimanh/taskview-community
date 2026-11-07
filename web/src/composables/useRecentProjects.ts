import { computed } from 'vue'
import type { GoalItem } from 'taskview-api'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'

export function useRecentProjects() {
  const uiPrefs = useUiPreferencesStore()
  const rank = computed(() => new Map((uiPrefs.settings.recentProjectIds ?? []).map((id, index) => [id, index])))

  function markProjectUsed(projectId: number) {
    if (!uiPrefs.loaded) return
    uiPrefs.markProjectUsed(projectId).catch(() => undefined)
  }

  function sortByRecent<T extends Pick<GoalItem, 'id'>>(projects: T[]): T[] {
    const order = (project: T) => rank.value.get(project.id) ?? Number.POSITIVE_INFINITY
    return projects
      .map((project, index) => ({ project, index }))
      .sort((a, b) => order(a.project) - order(b.project) || a.index - b.index)
      .map(({ project }) => project)
  }

  return { markProjectUsed, sortByRecent }
}
