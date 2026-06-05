import { computed, type ComputedRef } from 'vue'
import type { FirstDayOfWeek } from 'taskview-api'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'

export function useWeekStart(): ComputedRef<FirstDayOfWeek | undefined> {
  const store = useUiPreferencesStore()
  return computed(() => store.settings.firstDayOfWeek)
}
