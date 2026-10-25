import { computed } from 'vue'
import { useTaskView } from '@/composables/useTaskView'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'

export function useShortcutsEnabled() {
  const { isDesktop } = useTaskView()
  const uiPreferencesStore = useUiPreferencesStore()

  return computed(() => isDesktop.value && uiPreferencesStore.settings.keyboardShortcuts !== 0)
}
