import { computed } from 'vue'
import { MAX_PROJECT_THEMES, type ProjectTheme } from 'taskview-api'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'
import type { SetProjectThemeArgs } from '@/composables/useThemeColors.types'

export function useProjectTheme() {
  const store = useUiPreferencesStore()

  const projectThemes = computed(() => store.settings.projectThemes ?? {})

  function projectThemeOf(projectId: number): ProjectTheme | null {
    return projectThemes.value[String(projectId)] ?? null
  }

  /** At the limit the oldest projects (lowest ids) lose their theme first. */
  function setProjectTheme(args: SetProjectThemeArgs) {
    const { projectId, theme } = args
    const key = String(projectId)
    const others = Object.entries(projectThemes.value)
      .filter(([id]) => id !== key)
      .sort(([a], [b]) => Number(a) - Number(b))
    const kept = theme
      ? [...others.slice(-(MAX_PROJECT_THEMES - 1)), [key, theme] as const]
      : others
    store.patchSettings({ projectThemes: kept.length > 0 ? Object.fromEntries(kept) : undefined })
  }

  return { projectThemeOf, setProjectTheme }
}
