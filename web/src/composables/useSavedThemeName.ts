import { useI18n } from 'vue-i18n'
import type { SavedTheme } from 'taskview-api'

export function useSavedThemeName() {
  const { t } = useI18n()

  function savedThemeName(theme: SavedTheme): string {
    return theme.name?.trim() || t('uiCustomization.theme.custom.untitled')
  }

  return { savedThemeName }
}
