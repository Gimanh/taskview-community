import { computed, type ComputedRef } from 'vue'
import type { CalendarDragStep } from 'taskview-api'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'

export const DEFAULT_CALENDAR_DRAG_STEP: CalendarDragStep = 5

// Minutes a task snaps to when dragged or resized in the calendar's hours view
export function useCalendarDragStep(): ComputedRef<CalendarDragStep> {
  const store = useUiPreferencesStore()
  return computed(() => store.settings.calendarDragStep ?? DEFAULT_CALENDAR_DRAG_STEP)
}
